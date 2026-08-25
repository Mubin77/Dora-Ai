/**
 * Dora Long-Term Memory Consolidation, Maintenance & Lifecycle Engine
 * Phase 2 — Step 3
 * 
 * Deterministic, bounded engine responsible for:
 * - Duplicate consolidation & canonical merging with lineage
 * - Conflict resolution (explicit user precedence, recency, confidence)
 * - Memory reinforcement (bounded confidence & importance calibration)
 * - Candidate memory promotion & demotion
 * - Recency decay assessment & safe expiration
 * - Explicit forget/delete lifecycle with duplicate cleanup
 * - Privacy & sensitive data quarantine
 * - Memory health diagnostics
 * - Idempotent maintenance sweeps
 * 
 * NOTE: This engine is strictly deterministic and DOES NOT use an LLM.
 */

import {
  MemoryRecord,
  MemoryType,
  MemorySource,
  MemoryStatus,
  MemoryForgetDirective,
} from "./memoryTypes";
import {
  MemoryLifecycleState,
  MemoryConsolidationAction,
  MemoryHealth,
  MemoryConflict,
  MemoryMergeCandidate,
  MemoryReinforcement,
  MemoryDecayAssessment,
  MemoryRetentionAssessment,
  MemoryMaintenanceAction,
  MemoryConsolidationResult,
  MemoryConsolidationAnalysis,
  MemoryConsolidationOptions,
} from "./memoryConsolidationTypes";

export class MemoryConsolidationEngine {
  private static instance: MemoryConsolidationEngine;

  private constructor() {}

  public static getInstance(): MemoryConsolidationEngine {
    if (!MemoryConsolidationEngine.instance) {
      MemoryConsolidationEngine.instance = new MemoryConsolidationEngine();
    }
    return MemoryConsolidationEngine.instance;
  }

  // =========================================================================
  // 1. SENSITIVE CREDENTIAL PATTERNS (PRIVACY GUARANTEE)
  // =========================================================================
  private sensitivePatterns = [
    // Passwords & pins
    /(?:password|passwd|pin|secret|passphrase)\s*(?:is|:|=|as|\s)\s*[\w!@#$%^&*()_+~`|}{[\]:;?><,./-=]{4,}/i,
    // API keys & tokens
    /\b(?:sk-[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z-_]{35}|ghp_[a-zA-Z0-9]{36}|xox[baprs]-[0-9a-zA-Z]{10,}|bearer\s+[a-zA-Z0-9_.-]{20,})\b/i,
    // Credit card numbers (13-19 digits with spaces or dashes)
    /\b(?:\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{1,4})\b/,
    // CVV / CVC
    /\b(?:cvv|cvc|security\s*code)\s*(?:is|:|=|as|\s)\s*\d{3,4}\b/i,
    // Bank account numbers
    /\b(?:bank\s*account|routing\s*number|iban)\s*(?:is|:|=|#|\s)\s*[\w\d-]{6,34}\b/i,
  ];

  /**
   * Scans a memory record for sensitive data and flags it for quarantine.
   */
  public quarantineSensitive(
    memory: MemoryRecord,
    currentTime: number = 1724300000000
  ): { isSensitive: boolean; updatedMemory?: MemoryRecord; action?: MemoryMaintenanceAction } {
    if (memory.status === "DELETED" && memory.isQuarantined) {
      return { isSensitive: true, updatedMemory: memory };
    }

    const textToScan = `${memory.key} ${memory.value} ${memory.tags.join(" ")} ${memory.evidence.join(" ")}`;
    const isSensitive = this.sensitivePatterns.some((p) => p.test(textToScan));

    if (isSensitive) {
      const updated: MemoryRecord = {
        ...memory,
        status: "DELETED",
        isQuarantined: true,
        quarantineReason: "Sensitive credential or financial data detected during maintenance",
        confidence: 0,
        importance: 0,
        value: "[REDACTED_SENSITIVE_DATA]",
        normalizedValue: "[redacted]",
        updatedAt: currentTime,
        version: memory.version + 1,
      };

      const action: MemoryMaintenanceAction = {
        action: "QUARANTINE_SENSITIVE",
        targetMemoryId: memory.id,
        reason: "Quarantined and deleted sensitive credential/privacy risk",
        updatedFields: {
          status: "DELETED",
          isQuarantined: true,
          value: "[REDACTED_SENSITIVE_DATA]",
        },
      };

      return { isSensitive: true, updatedMemory: updated, action };
    }

    return { isSensitive: false };
  }

  // =========================================================================
  // 2. EXPIRATION & TEMPORAL LIFECYCLE
  // =========================================================================

  /**
   * Checks if a memory has exceeded its expiration timestamp.
   */
  public checkExpiration(
    memory: MemoryRecord,
    currentTime = 1724300000000
  ): { isExpired: boolean; updatedMemory?: MemoryRecord; action?: MemoryMaintenanceAction } {
    if (memory.status === "EXPIRED" || memory.status === "DELETED") {
      return { isExpired: memory.status === "EXPIRED" };
    }

    if (memory.expiresAt && currentTime >= memory.expiresAt) {
      const updated: MemoryRecord = {
        ...memory,
        status: "EXPIRED",
        updatedAt: currentTime,
        version: memory.version + 1,
      };

      const action: MemoryMaintenanceAction = {
        action: "EXPIRE",
        targetMemoryId: memory.id,
        reason: `Memory expired at ${new Date(memory.expiresAt).toISOString()}`,
        updatedFields: { status: "EXPIRED" },
        lineageUpdate: { previousState: memory.status as MemoryLifecycleState },
      };

      return { isExpired: true, updatedMemory: updated, action };
    }

    return { isExpired: false };
  }

  // =========================================================================
  // 3. DUPLICATE CONSOLIDATION & CANONICAL MERGING
  // =========================================================================

  /**
   * Normalizes keys and values for deterministic semantic comparison
   */
  public normalizeKey(key: string): string {
    return (key || "")
      .toLowerCase()
      .trim()
      .replace(/[\s_-]+/g, "_");
  }

  public normalizeValue(val: string): string {
    return (val || "")
      .toLowerCase()
      .trim()
      .replace(/[\s_-]+/g, " ")
      .replace(/[.,!?;:'"()]/g, "");
  }

  /**
   * Determines if two memories represent the exact same durable fact
   */
  public areDuplicates(a: MemoryRecord, b: MemoryRecord): boolean {
    if (a.id === b.id) return false;
    if (a.status === "DELETED" || b.status === "DELETED") return false;
    if (a.status === "EXPIRED" || b.status === "EXPIRED") return false;
    if (a.status === "SUPERSEDED" || b.status === "SUPERSEDED") return false;

    // Both must belong to same user
    if ((a.userId || "default") !== (b.userId || "default")) return false;

    const normKeyA = this.normalizeKey(a.key);
    const normKeyB = this.normalizeKey(b.key);
    if (normKeyA !== normKeyB) return false;

    const normValA = this.normalizeValue(a.value);
    const normValB = this.normalizeValue(b.value);
    return normValA === normValB;
  }

  /**
   * Consolidates duplicate memories into canonical records while preserving full provenance and lineage
   */
  public consolidateDuplicates(
    memories: MemoryRecord[],
    currentTime = 1724300000000
  ): {
    updatedMemories: MemoryRecord[];
    merges: MemoryMergeCandidate[];
    actions: MemoryMaintenanceAction[];
  } {
    const activePool = memories.map((m) => ({ ...m }));
    const merges: MemoryMergeCandidate[] = [];
    const actions: MemoryMaintenanceAction[] = [];
    const processedIds = new Set<string>();

    for (let i = 0; i < activePool.length; i++) {
      const primary = activePool[i];
      if (
        processedIds.has(primary.id) ||
        primary.status === "DELETED" ||
        primary.status === "SUPERSEDED" ||
        primary.status === "EXPIRED"
      ) {
        continue;
      }

      // Find all duplicates for this record
      const duplicates: MemoryRecord[] = [];
      for (let j = i + 1; j < activePool.length; j++) {
        const candidate = activePool[j];
        if (
          !processedIds.has(candidate.id) &&
          this.areDuplicates(primary, candidate)
        ) {
          duplicates.push(candidate);
        }
      }

      if (duplicates.length === 0) continue;

      // Select canonical memory from the cluster:
      // Priority: ACTIVE > EXPLICIT > highest confidence > highest importance > highest reinforcement > newest
      const cluster = [primary, ...duplicates];
      cluster.sort((a, b) => {
        if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
        if (b.status === "ACTIVE" && a.status !== "ACTIVE") return 1;

        if (a.source === "EXPLICIT_USER" && b.source !== "EXPLICIT_USER") return -1;
        if (b.source === "EXPLICIT_USER" && a.source !== "EXPLICIT_USER") return 1;

        if (Math.abs(b.confidence - a.confidence) > 0.01) return b.confidence - a.confidence;
        if (b.importance !== a.importance) return b.importance - a.importance;

        const countA = (a.reinforcementCount || 1) + (a.accessCount || 0);
        const countB = (b.reinforcementCount || 1) + (b.accessCount || 0);
        if (countA !== countB) return countB - countA;

        if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
        return a.id.localeCompare(b.id);
      });

      const canonical = cluster[0];
      const nonCanonical = cluster.slice(1);

      const duplicateIds = nonCanonical.map((d) => d.id);
      duplicateIds.forEach((id) => processedIds.add(id));
      processedIds.add(canonical.id);

      // Merge evidence and tags
      const combinedEvidence = Array.from(
        new Set(cluster.flatMap((m) => m.evidence || []))
      );
      const combinedTags = Array.from(
        new Set(cluster.flatMap((m) => m.tags || []))
      );
      const totalReinforcements = cluster.reduce(
        (sum, m) => sum + (m.reinforcementCount || 1),
        0
      );

      // Bounded confidence and importance update
      const calibratedConfidence = Math.min(
        1.0,
        Math.max(...cluster.map((m) => m.confidence)) + 0.05
      );
      const calibratedImportance = Math.min(
        100,
        Math.max(...cluster.map((m) => m.importance))
      );

      const existingMergedFrom = canonical.mergedFrom || [];
      const updatedMergedFrom = Array.from(new Set([...existingMergedFrom, ...duplicateIds]));

      // Update canonical record (CRITICAL: preserve canonical status without accidental candidate promotion)
      const updatedCanonical: MemoryRecord = {
        ...canonical,
        status: canonical.status,
        confidence: canonical.source === "EXPLICIT_USER" ? 1.0 : calibratedConfidence,
        importance: calibratedImportance,
        reinforcementCount: totalReinforcements,
        lastReinforcedAt: currentTime,
        evidence: combinedEvidence,
        tags: combinedTags,
        mergedFrom: updatedMergedFrom,
        updatedAt: currentTime,
        version: canonical.version + 1,
      };

      // Replace canonical in pool
      const canonicalIdx = activePool.findIndex((m) => m.id === canonical.id);
      if (canonicalIdx !== -1) {
        activePool[canonicalIdx] = updatedCanonical;
      }

      // Mark non-canonical duplicates as SUPERSEDED with lineage link
      nonCanonical.forEach((dup) => {
        const dupIdx = activePool.findIndex((m) => m.id === dup.id);
        if (dupIdx !== -1) {
          activePool[dupIdx] = {
            ...dup,
            status: "SUPERSEDED",
            mergedInto: canonical.id,
            supersededBy: canonical.id,
            updatedAt: currentTime,
            version: dup.version + 1,
          };

          actions.push({
            action: "MERGE",
            targetMemoryId: dup.id,
            secondaryMemoryIds: [canonical.id],
            reason: `Merged redundant duplicate into canonical memory ${canonical.id}`,
            updatedFields: { status: "SUPERSEDED", mergedInto: canonical.id, supersededBy: canonical.id },
            lineageUpdate: { mergedInto: canonical.id, previousState: dup.status as MemoryLifecycleState },
          });
        }
      });

      actions.push({
        action: "REINFORCE",
        targetMemoryId: canonical.id,
        secondaryMemoryIds: duplicateIds,
        reason: `Consolidated ${duplicateIds.length} duplicate memories into canonical record`,
        updatedFields: {
          confidence: updatedCanonical.confidence,
          reinforcementCount: totalReinforcements,
          mergedFrom: updatedMergedFrom,
        },
      });

      merges.push({
        canonicalId: canonical.id,
        duplicateIds,
        key: canonical.key,
        canonicalValue: canonical.value,
        mergedEvidence: combinedEvidence,
        mergedTags: combinedTags,
        combinedReinforcementCount: totalReinforcements,
        calibratedConfidence: updatedCanonical.confidence,
        calibratedImportance: calibratedImportance,
        reason: `Consolidated identical fact for key '${canonical.key}'`,
      });
    }

    return { updatedMemories: activePool, merges, actions };
  }

  // =========================================================================
  // 4. CONFLICT RESOLUTION
  // =========================================================================

  /**
   * Identifies and resolves conflicting memories (same key, different values)
   */
  public resolveConflicts(
    memories: MemoryRecord[],
    currentTime = 1724300000000
  ): {
    updatedMemories: MemoryRecord[];
    conflicts: MemoryConflict[];
    actions: MemoryMaintenanceAction[];
  } {
    const pool = memories.map((m) => ({ ...m }));
    const actions: MemoryMaintenanceAction[] = [];
    const resolvedConflicts: MemoryConflict[] = [];

    // Group active records by normalized key
    const activeRecords = pool.filter(
      (m) => m.status === "ACTIVE" || m.status === "CANDIDATE"
    );

    const groups = new Map<string, MemoryRecord[]>();
    for (const record of activeRecords) {
      const normKey = this.normalizeKey(record.key);
      const existing = groups.get(normKey) || [];
      existing.push(record);
      groups.set(normKey, existing);
    }

    for (const [key, cluster] of groups.entries()) {
      if (cluster.length <= 1) continue;

      // Distinct normalized values
      const valueMap = new Map<string, MemoryRecord[]>();
      for (const rec of cluster) {
        const normVal = this.normalizeValue(rec.value);
        const list = valueMap.get(normVal) || [];
        list.push(rec);
        valueMap.set(normVal, list);
      }

      if (valueMap.size <= 1) continue; // All have same value, duplicate consolidation handles it

      // Multiple conflicting values for the same key!
      // Sort candidates by explicit precedence > recency > confidence > reinforcement count
      const candidates = Array.from(valueMap.values()).map((list) => list[0]);

      candidates.sort((a, b) => {
        // 1. Explicit user corrections/statements take top priority
        if (a.source === "EXPLICIT_USER" && b.source !== "EXPLICIT_USER") return -1;
        if (b.source === "EXPLICIT_USER" && a.source !== "EXPLICIT_USER") return 1;

        // 2. If both are explicit, newer updatedAt takes precedence (user updated their preference)
        if (a.source === "EXPLICIT_USER" && b.source === "EXPLICIT_USER") {
          return b.updatedAt - a.updatedAt;
        }

        // 3. Composite score for inferred / candidate memories
        const scoreA =
          a.confidence * 0.4 +
          (a.importance / 100) * 0.3 +
          (Math.min(5, a.reinforcementCount || 1) / 5) * 0.15 +
          (a.updatedAt / currentTime) * 0.15;
        const scoreB =
          b.confidence * 0.4 +
          (b.importance / 100) * 0.3 +
          (Math.min(5, b.reinforcementCount || 1) / 5) * 0.15 +
          (b.updatedAt / currentTime) * 0.15;

        return scoreB - scoreA;
      });

      const winner = candidates[0];
      const losers = candidates.slice(1);

      for (const loser of losers) {
        // Check if already superseded
        if (loser.status === "SUPERSEDED" && loser.supersededBy === winner.id) {
          continue;
        }

        const loserIdx = pool.findIndex((m) => m.id === loser.id);
        const winnerIdx = pool.findIndex((m) => m.id === winner.id);

        if (loserIdx !== -1 && winnerIdx !== -1) {
          // Supersede loser
          pool[loserIdx] = {
            ...pool[loserIdx],
            status: "SUPERSEDED",
            supersededBy: winner.id,
            updatedAt: currentTime,
            version: pool[loserIdx].version + 1,
          };

          // Link supersession on winner
          pool[winnerIdx] = {
            ...pool[winnerIdx],
            supersedes: loser.id,
            updatedAt: currentTime,
            version: pool[winnerIdx].version + 1,
          };

          const conflictRecord: MemoryConflict = {
            existingMemoryId: loser.id,
            conflictingMemoryId: winner.id,
            key: winner.key,
            existingValue: loser.value,
            conflictingValue: winner.value,
            existingSource: loser.source,
            conflictingSource: winner.source,
            resolution: "SUPERSEDE_WITH_NEW",
            winnerId: winner.id,
            loserId: loser.id,
            reason:
              winner.source === "EXPLICIT_USER" && loser.source === "EXPLICIT_USER"
                ? `Newer explicit user statement superseded older '${loser.value}'`
                : winner.source === "EXPLICIT_USER"
                ? `Explicit user statement takes precedence over inferred '${loser.value}'`
                : `Higher confidence/recency statement superseded '${loser.value}'`,
            confidenceDiff: Math.abs(winner.confidence - loser.confidence),
            recencyDiffMs: Math.abs(winner.updatedAt - loser.updatedAt),
          };

          resolvedConflicts.push(conflictRecord);

          actions.push({
            action: "SUPERSEDE",
            targetMemoryId: loser.id,
            secondaryMemoryIds: [winner.id],
            reason: conflictRecord.reason,
            updatedFields: { status: "SUPERSEDED", supersededBy: winner.id },
            lineageUpdate: {
              supersededBy: winner.id,
              previousState: loser.status as MemoryLifecycleState,
            },
          });
        }
      }
    }

    return { updatedMemories: pool, conflicts: resolvedConflicts, actions };
  }

  // =========================================================================
  // 5. MEMORY REINFORCEMENT
  // =========================================================================

  /**
   * Deterministically reinforces a memory upon repeated confirmation
   */
  public reinforceMemory(
    memory: MemoryRecord,
    evidence: string,
    currentTime = 1724300000000,
    isExplicit = true
  ): { updatedMemory: MemoryRecord; reinforcement: MemoryReinforcement } {
    const prevCount = memory.reinforcementCount || 1;
    const newCount = prevCount + 1;

    const prevConfidence = memory.confidence;
    let newConfidence = prevConfidence;
    if (isExplicit || memory.source === "EXPLICIT_USER") {
      newConfidence = 1.0;
    } else {
      // Bounded increment for inferred/candidate memories
      newConfidence = Math.min(0.95, Math.max(0.0, prevConfidence + 0.1));
    }

    const prevImportance = memory.importance;
    let newImportance = prevImportance;
    // Repeated confirmation (>= 3 times) provides bounded boost to importance
    if (newCount >= 3) {
      newImportance = Math.min(100, prevImportance + 5);
    }

    const evidenceList = memory.evidence || [];
    const updatedEvidence = evidence && !evidenceList.includes(evidence)
      ? [...evidenceList, evidence]
      : evidenceList;

    const updatedMemory: MemoryRecord = {
      ...memory,
      confidence: newConfidence,
      importance: newImportance,
      reinforcementCount: newCount,
      lastReinforcedAt: currentTime,
      updatedAt: currentTime,
      evidence: updatedEvidence,
      version: memory.version + 1,
    };

    const reinforcement: MemoryReinforcement = {
      memoryId: memory.id,
      key: memory.key,
      previousReinforcementCount: prevCount,
      newReinforcementCount: newCount,
      previousConfidence: prevConfidence,
      newConfidence,
      previousImportance: prevImportance,
      newImportance,
      lastReinforcedAt: currentTime,
      evidenceAdded: evidence,
      reason: `Reinforced '${memory.key}' via repeated statement`,
    };

    return { updatedMemory, reinforcement };
  }

  // =========================================================================
  // 6. CANDIDATE PROMOTION & DEMOTION
  // =========================================================================

  /**
   * Evaluates a CANDIDATE memory for promotion to ACTIVE or demotion to ARCHIVED/OUTDATED
   */
  public evaluateCandidate(
    memory: MemoryRecord,
    allMemories: MemoryRecord[],
    options?: MemoryConsolidationOptions
  ): { updatedMemory: MemoryRecord; action: MemoryMaintenanceAction | null } {
    if (memory.status !== "CANDIDATE") {
      return { updatedMemory: memory, action: null };
    }

    const currentTime = options?.currentTime ?? Date.now();
    const promotionThreshold = options?.candidatePromotionThreshold ?? 2;
    const confidenceThreshold = options?.candidateConfidenceThreshold ?? 0.75;
    const maxStaleDays = options?.candidateMaxStaleDays ?? 30;

    const count = memory.reinforcementCount || 1;
    const lastActive = memory.lastReinforcedAt ?? memory.updatedAt ?? memory.createdAt;
    const inactiveDays = (currentTime - lastActive) / (1000 * 60 * 60 * 24);

    // 0. Demote if sensitive/quarantined or expired
    if (memory.isQuarantined || memory.source === ("SENSITIVE_QUARANTINE" as any)) {
      return { updatedMemory: memory, action: null };
    }

    if (memory.expiresAt && currentTime >= memory.expiresAt) {
      const expired: MemoryRecord = {
        ...memory,
        status: "EXPIRED",
        updatedAt: currentTime,
        version: memory.version + 1,
      };
      const action: MemoryMaintenanceAction = {
        action: "EXPIRE",
        targetMemoryId: memory.id,
        reason: "Candidate memory reached expiration timestamp",
        updatedFields: { status: "EXPIRED" },
        lineageUpdate: { previousState: "CANDIDATE" },
      };
      return { updatedMemory: expired, action };
    }

    // Check age gating if candidateMinAgeDays is configured
    if (options?.candidateMinAgeDays && options.candidateMinAgeDays > 0) {
      const ageDays = (currentTime - memory.createdAt) / (1000 * 60 * 60 * 24);
      if (ageDays < options.candidateMinAgeDays) {
        return { updatedMemory: memory, action: null };
      }
    }

    // Check for contradictory active memory
    const normKey = this.normalizeKey(memory.key);
    const normVal = this.normalizeValue(memory.value);
    const hasContradiction = allMemories.some(
      (m) =>
        m.id !== memory.id &&
        m.status === "ACTIVE" &&
        this.normalizeKey(m.key) === normKey &&
        this.normalizeValue(m.value) !== normVal
    );

    // 1. Demote if contradicted by active statement
    if (hasContradiction) {
      const demoted: MemoryRecord = {
        ...memory,
        status: "ARCHIVED",
        confidence: Math.max(0.1, memory.confidence - 0.25),
        updatedAt: currentTime,
        version: memory.version + 1,
      };

      const action: MemoryMaintenanceAction = {
        action: "DEMOTE_CANDIDATE",
        targetMemoryId: memory.id,
        reason: "Demoted candidate due to active contradiction",
        updatedFields: { status: "ARCHIVED" },
        lineageUpdate: { previousState: "CANDIDATE" },
      };

      return { updatedMemory: demoted, action };
    }

    // 2. Demote if stale and unreinforced
    if (inactiveDays > maxStaleDays && count < promotionThreshold) {
      const demoted: MemoryRecord = {
        ...memory,
        status: "OUTDATED",
        updatedAt: currentTime,
        version: memory.version + 1,
      };

      const action: MemoryMaintenanceAction = {
        action: "DEMOTE_CANDIDATE",
        targetMemoryId: memory.id,
        reason: `Demoted candidate: inactive for ${Math.round(inactiveDays)} days without sufficient reinforcement`,
        updatedFields: { status: "OUTDATED" },
        lineageUpdate: { previousState: "CANDIDATE" },
      };

      return { updatedMemory: demoted, action };
    }

    // 3. Promote if evidence threshold met
    if (count >= promotionThreshold && memory.confidence >= confidenceThreshold) {
      const promoted: MemoryRecord = {
        ...memory,
        status: "ACTIVE",
        updatedAt: currentTime,
        version: memory.version + 1,
      };

      const action: MemoryMaintenanceAction = {
        action: "PROMOTE_CANDIDATE",
        targetMemoryId: memory.id,
        reason: `Promoted candidate to ACTIVE: reinforcementCount=${count}, confidence=${memory.confidence}`,
        updatedFields: { status: "ACTIVE" },
        lineageUpdate: { previousState: "CANDIDATE" },
      };

      return { updatedMemory: promoted, action };
    }

    return { updatedMemory: memory, action: null };
  }

  // =========================================================================
  // 7. RECENCY & DECAY ASSESSMENT
  // =========================================================================

  /**
   * Deterministically assesses decay score for a memory
   */
  public assessDecay(
    memory: MemoryRecord,
    currentTime = 1724300000000
  ): MemoryDecayAssessment {
    const ageMs = Math.max(0, currentTime - memory.createdAt);
    const lastActiveTime =
      memory.lastReinforcedAt ?? memory.updatedAt ?? memory.createdAt;
    const inactiveDurationMs = Math.max(0, currentTime - lastActiveTime);

    // Importance dampens decay (important memories decay much slower)
    // Importance 100 -> dampener 0.1 (decays 10x slower)
    // Importance 0   -> dampener 1.0
    const importanceDampener = Math.max(0.1, 1 - (memory.importance / 100) * 0.85);

    // Half life in days
    let baseHalfLifeDays = 180;
    if (memory.source === "EXPLICIT_USER" && memory.importance >= 80) {
      baseHalfLifeDays = 365;
    } else if (memory.type === "CANDIDATE" || memory.status === "CANDIDATE") {
      baseHalfLifeDays = 30;
    } else if (memory.type === "TEMPORARY") {
      baseHalfLifeDays = 3;
    }

    const halfLifeMs = baseHalfLifeDays * 24 * 60 * 60 * 1000;
    const rawDecay = 1 - Math.exp(-inactiveDurationMs / halfLifeMs);
    const decayFactor = Math.min(1.0, Math.max(0.0, rawDecay * importanceDampener));

    const isStale =
      (memory.status === "CANDIDATE" && inactiveDurationMs > 30 * 86400000) ||
      (memory.importance < 40 && inactiveDurationMs > 90 * 86400000);

    let suggestedState: MemoryLifecycleState = memory.status as MemoryLifecycleState;
    let reason = "Memory is fresh and within standard retention curve";

    if (memory.status === "EXPIRED" || (memory.expiresAt && currentTime >= memory.expiresAt)) {
      suggestedState = "EXPIRED";
      reason = "Memory has reached its explicit expiration timestamp";
    } else if (isStale) {
      suggestedState = "OUTDATED";
      reason = `Memory is stale (decayFactor=${decayFactor.toFixed(2)})`;
    }

    return {
      memoryId: memory.id,
      key: memory.key,
      ageMs,
      inactiveDurationMs,
      decayFactor,
      isStale,
      suggestedState,
      reason,
    };
  }

  // =========================================================================
  // 8. MEMORY HEALTH EVALUATION
  // =========================================================================

  /**
   * Deterministically evaluates the comprehensive health of a memory record
   */
  public evaluateHealth(
    memory: MemoryRecord,
    allMemories: MemoryRecord[] = [],
    currentTime = 1724300000000
  ): MemoryHealth {
    const issues: string[] = [];

    // 1. Privacy Health
    const isSensitive = this.sensitivePatterns.some((p) =>
      p.test(`${memory.key} ${memory.value} ${(memory.tags || []).join(" ")}`)
    );
    const privacyHealth = isSensitive ? 0.0 : 1.0;
    if (isSensitive) {
      issues.push("Contains sensitive credential or secret");
    }

    // 2. Confidence Health (bounded [0.0, 1.0])
    const confidenceHealth = Math.min(1.0, Math.max(0.0, memory.confidence));
    if (confidenceHealth < 0.5 && memory.status === "ACTIVE") {
      issues.push("Low confidence for an active memory");
    }

    // 3. Freshness & Decay
    const decay = this.assessDecay(memory, currentTime);
    const freshnessHealth = Math.max(0.0, 1.0 - decay.decayFactor);
    if (decay.isStale) {
      issues.push("Memory is stale");
    }

    // 4. Consistency & Contradiction Risk
    const normKey = this.normalizeKey(memory.key);
    const normVal = this.normalizeValue(memory.value);

    let contradictionRisk: "NONE" | "LOW" | "MEDIUM" | "HIGH" = "NONE";
    const activeContradictions = allMemories.filter(
      (m) =>
        m.id !== memory.id &&
        (m.status === "ACTIVE" || m.status === "CANDIDATE") &&
        this.normalizeKey(m.key) === normKey &&
        this.normalizeValue(m.value) !== normVal
    );

    if (activeContradictions.length > 0) {
      contradictionRisk = memory.status === "ACTIVE" ? "HIGH" : "MEDIUM";
      issues.push(`Conflicts with ${activeContradictions.length} other active record(s) for key '${memory.key}'`);
    }

    // 5. Duplication Risk
    let duplicationRisk: "NONE" | "LOW" | "MEDIUM" | "HIGH" = "NONE";
    const duplicates = allMemories.filter(
      (m) => m.id !== memory.id && this.areDuplicates(memory, m)
    );
    if (duplicates.length > 0) {
      duplicationRisk = "HIGH";
      issues.push(`Identical duplicate found for '${memory.key}'`);
    }

    const consistencyHealth =
      contradictionRisk === "HIGH"
        ? 0.2
        : contradictionRisk === "MEDIUM"
        ? 0.6
        : duplicationRisk === "HIGH"
        ? 0.7
        : 1.0;

    // Overall composite health score
    const healthScore =
      privacyHealth === 0.0
        ? 0.0
        : confidenceHealth * 0.35 +
          freshnessHealth * 0.25 +
          consistencyHealth * 0.4;

    let overallStatus: "HEALTHY" | "DEGRADED" | "NEEDS_MAINTENANCE" | "CRITICAL" = "HEALTHY";
    if (privacyHealth === 0.0) {
      overallStatus = "CRITICAL";
    } else if (duplicationRisk === "HIGH" || contradictionRisk === "HIGH" || decay.isStale) {
      overallStatus = "NEEDS_MAINTENANCE";
    } else if (healthScore < 0.6) {
      overallStatus = "DEGRADED";
    }

    return {
      overallStatus,
      healthScore,
      confidenceHealth,
      freshnessHealth,
      consistencyHealth,
      privacyHealth,
      duplicationRisk,
      contradictionRisk,
      decayScore: decay.decayFactor,
      isSensitiveRisk: isSensitive,
      issues,
    };
  }

  // =========================================================================
  // 9. EXPLICIT FORGET / DELETE LIFECYCLE
  // =========================================================================

  /**
   * Deterministically deletes/forgets memories based on explicit user directive
   */
  public executeForget(
    memories: MemoryRecord[],
    directive: MemoryForgetDirective,
    currentTime = 1724300000000
  ): {
    updatedMemories: MemoryRecord[];
    forgottenCount: number;
    actions: MemoryMaintenanceAction[];
  } {
    const target = (directive.keyOrTopic || "").toLowerCase().trim();
    const scope = directive.scope;
    const actions: MemoryMaintenanceAction[] = [];
    let forgottenCount = 0;

    const updated = memories.map((memory) => {
      if (memory.status === "DELETED") return memory;

      let shouldForget = false;
      if (scope === "all") {
        shouldForget = true;
      } else if (scope === "exact") {
        const normKey = this.normalizeKey(memory.key);
        const normTarget = this.normalizeKey(target);
        shouldForget = normKey === normTarget || memory.id === target;
      } else {
        // topic / broad match
        const normKey = this.normalizeKey(memory.key);
        const normVal = this.normalizeValue(memory.value);
        const normTarget = target.replace(/_/g, " ");
        shouldForget =
          normKey.includes(target) ||
          normVal.includes(normTarget) ||
          (memory.tags || []).some((t) => t.toLowerCase().includes(target));
      }

      if (shouldForget) {
        forgottenCount++;
        actions.push({
          action: "DELETE",
          targetMemoryId: memory.id,
          reason: directive.reason || `Explicit user forget directive for '${directive.keyOrTopic}'`,
          updatedFields: { status: "DELETED" },
          lineageUpdate: { previousState: memory.status as MemoryLifecycleState },
        });

        return {
          ...memory,
          status: "DELETED" as MemoryStatus,
          updatedAt: currentTime,
          version: memory.version + 1,
        };
      }

      return memory;
    });

    return { updatedMemories: updated, forgottenCount, actions };
  }

  // =========================================================================
  // 10. IDEMPOTENT MAINTENANCE SWEEP
  // =========================================================================

  /**
   * Runs a complete, deterministic, idempotent maintenance sweep over stored memories
   */
  public maintain(
    memories: MemoryRecord[],
    options?: MemoryConsolidationOptions
  ): MemoryConsolidationResult {
    const startTime = performance.now();
    const currentTime = options?.currentTime ?? Date.now();

    let currentMemories = memories.map((m) => ({ ...m }));
    const allActions: MemoryMaintenanceAction[] = [];

    let mergesCount = 0;
    let reinforcementsCount = 0;
    let promotionsCount = 0;
    let demotionsCount = 0;
    let supersededCount = 0;
    let expiredCount = 0;
    let deletedCount = 0;
    let quarantinedCount = 0;
    let conflictsResolved: MemoryConflict[] = [];

    // Step 1: Quarantine Sensitive Credentials
    if (options?.autoQuarantineSensitive !== false) {
      currentMemories = currentMemories.map((m) => {
        const q = this.quarantineSensitive(m);
        if (q.isSensitive && q.action) {
          quarantinedCount++;
          deletedCount++;
          allActions.push(q.action);
          return q.updatedMemory!;
        }
        return m;
      });
    }

    // Step 2: Temporal Expiration
    if (options?.autoExpireTemporal !== false) {
      currentMemories = currentMemories.map((m) => {
        const exp = this.checkExpiration(m, currentTime);
        if (exp.isExpired && exp.action) {
          expiredCount++;
          allActions.push(exp.action);
          return exp.updatedMemory!;
        }
        return m;
      });
    }

    // Step 3: Duplicate Consolidation & Merging
    if (options?.autoMergeDuplicates !== false) {
      const dupResult = this.consolidateDuplicates(currentMemories, currentTime);
      currentMemories = dupResult.updatedMemories;
      mergesCount += dupResult.merges.length;
      allActions.push(...dupResult.actions);
    }

    // Step 4: Conflict Resolution
    if (options?.autoResolveConflicts !== false) {
      const conflictResult = this.resolveConflicts(currentMemories, currentTime);
      currentMemories = conflictResult.updatedMemories;
      conflictsResolved = conflictResult.conflicts;
      supersededCount += conflictResult.conflicts.length;
      allActions.push(...conflictResult.actions);
    }

    // Step 5: Candidate Promotion / Demotion
    if (options?.autoPromoteCandidates !== false || options?.autoDemoteStaleCandidates !== false) {
      currentMemories = currentMemories.map((m) => {
        if (m.status === "CANDIDATE") {
          const evalResult = this.evaluateCandidate(m, currentMemories, options);
          if (evalResult.action) {
            if (evalResult.action.action === "PROMOTE_CANDIDATE") promotionsCount++;
            if (evalResult.action.action === "DEMOTE_CANDIDATE") demotionsCount++;
            allActions.push(evalResult.action);
            return evalResult.updatedMemory;
          }
        }
        return m;
      });
    }

    // Step 6: Compute Overall Health Summary
    const healthList = currentMemories.map((m) =>
      this.evaluateHealth(m, currentMemories, currentTime)
    );
    const avgHealthScore =
      healthList.length > 0
        ? healthList.reduce((sum, h) => sum + h.healthScore, 0) / healthList.length
        : 1.0;

    const activeCount = currentMemories.filter((m) => m.status === "ACTIVE").length;
    const candidateCount = currentMemories.filter((m) => m.status === "CANDIDATE").length;
    const archivedCount = currentMemories.filter((m) => m.status === "ARCHIVED" || m.status === "OUTDATED").length;
    const finalSupersededCount = currentMemories.filter((m) => m.status === "SUPERSEDED").length;
    const finalExpiredCount = currentMemories.filter((m) => m.status === "EXPIRED").length;
    const finalDeletedCount = currentMemories.filter((m) => m.status === "DELETED").length;

    const processingTimeMs = performance.now() - startTime;

    return {
      updatedMemories: currentMemories,
      actionsTaken: allActions,
      mergesCount,
      reinforcementsCount,
      promotionsCount,
      demotionsCount,
      supersededCount,
      expiredCount,
      deletedCount,
      quarantinedCount,
      conflictsResolved,
      overallHealth: {
        totalMemories: currentMemories.length,
        activeCount,
        candidateCount,
        archivedCount,
        supersededCount: finalSupersededCount,
        expiredCount: finalExpiredCount,
        deletedCount: finalDeletedCount,
        averageHealthScore: avgHealthScore,
      },
      processingTimeMs,
    };
  }

  // =========================================================================
  // 11. ANALYSIS ONLY (READ-ONLY)
  // =========================================================================

  /**
   * Analyzes memories and provides maintenance recommendations without applying mutations
   */
  public analyze(
    memories: MemoryRecord[],
    options?: MemoryConsolidationOptions
  ): MemoryConsolidationAnalysis {
    const currentTime = options?.currentTime ?? Date.now();
    const healthAssessments: Record<string, MemoryHealth> = {};
    const recommendedActions: MemoryMaintenanceAction[] = [];
    const directives: string[] = [];

    // Duplicate detection check
    const mergeCandidates: MemoryMergeCandidate[] = [];
    const processedIds = new Set<string>();

    for (let i = 0; i < memories.length; i++) {
      const a = memories[i];
      if (processedIds.has(a.id) || a.status === "DELETED" || a.status === "SUPERSEDED") continue;

      const duplicates: MemoryRecord[] = [];
      for (let j = i + 1; j < memories.length; j++) {
        const b = memories[j];
        if (!processedIds.has(b.id) && this.areDuplicates(a, b)) {
          duplicates.push(b);
        }
      }

      if (duplicates.length > 0) {
        mergeCandidates.push({
          canonicalId: a.id,
          duplicateIds: duplicates.map((d) => d.id),
          key: a.key,
          canonicalValue: a.value,
          mergedEvidence: Array.from(new Set([a, ...duplicates].flatMap((m) => m.evidence || []))),
          mergedTags: Array.from(new Set([a, ...duplicates].flatMap((m) => m.tags || []))),
          combinedReinforcementCount: [a, ...duplicates].reduce((s, m) => s + (m.reinforcementCount || 1), 0),
          calibratedConfidence: Math.min(1.0, a.confidence + 0.05),
          calibratedImportance: a.importance,
          reason: `Found ${duplicates.length} duplicate(s) for '${a.key}'`,
        });

        recommendedActions.push({
          action: "MERGE",
          targetMemoryId: a.id,
          secondaryMemoryIds: duplicates.map((d) => d.id),
          reason: `Recommend merging ${duplicates.length} duplicate memories`,
        });
      }
    }

    // Health evaluation for all records
    for (const m of memories) {
      const health = this.evaluateHealth(m, memories, currentTime);
      healthAssessments[m.id] = health;

      if (health.isSensitiveRisk) {
        recommendedActions.push({
          action: "QUARANTINE_SENSITIVE",
          targetMemoryId: m.id,
          reason: "Sensitive data detected",
        });
        directives.push(`[MAINTENANCE] Quarantine sensitive memory ${m.id}`);
      }
    }

    // Conflict detection check
    const conflictResult = this.resolveConflicts(memories, currentTime);
    const conflicts = conflictResult.conflicts;
    if (conflicts.length > 0) {
      directives.push(`[MAINTENANCE] Resolve ${conflicts.length} conflicting memory records`);
    }

    const isMaintenanceNeeded =
      recommendedActions.length > 0 ||
      mergeCandidates.length > 0 ||
      conflicts.length > 0;

    return {
      isMaintenanceNeeded,
      recommendedActions,
      conflicts,
      mergeCandidates,
      healthAssessments,
      directives,
    };
  }
}

export const memoryConsolidationEngine = MemoryConsolidationEngine.getInstance();
