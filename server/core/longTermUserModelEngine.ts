/**
 * Dora Long-Term User Model Synthesis & Identity-Aware Context Engine
 * Phase 2 — Step 8
 * 
 * Synthesizes evidence-backed user characteristics, communication preferences,
 * coding style, domain interests, and workflow patterns without hallucinating
 * personal identity, ownership, or unverified expertise.
 * 
 * Pure, bounded, deterministic, and free of runtime clock or external dependencies.
 */

import {
  UserModelDimension,
  UserModelAttributeStatus,
  UserModelEvidenceAuthority,
  UserModelDecisionType,
  UserModelEvidence,
  UserModelAttribute,
  UserModelDecision,
  UserModelProfile,
  UserModelHealth,
  UserModelAnalysis,
  LongTermUserModelInput,
} from "./longTermUserModelTypes";
import { MemoryGovernanceCandidate } from "./memoryGovernanceTypes";
import { LearningPattern } from "./adaptiveLearningTypes";

export class LongTermUserModelEngine {
  private static instance: LongTermUserModelEngine | null = null;

  // Sensitive patterns for privacy suppression
  private readonly SENSITIVE_REGEX =
    /\b(?:password|passwd|pin|secret|api[_-]?key|auth[_-]?token|bearer\s+[a-zA-Z0-9_\-\.]+|cvv|cvc|ssn|nid|credit\s*card|debit\s*card|bank\s*account|routing\s*number|access[_-]?token|private[_-]?key)\b|\b(?:\d{4}[ -]?){3}\d{4}\b|\bsk-[a-zA-Z0-9_-]{16,}\b|\bAIza[0-9A-Za-z-_]{35}\b|\bghp_[0-9a-zA-Z]{36}\b/i;

  // Explicit forbidden identity inferences (unless explicitly asserted by user)
  private readonly FORBIDDEN_INFERRED_IDENTITY_KEYS = [
    "age",
    "gender",
    "sex",
    "location",
    "city",
    "country",
    "address",
    "occupation",
    "job_title",
    "income",
    "salary",
    "net_worth",
    "education",
    "degree",
    "university",
    "personality",
    "relationship",
    "marital_status",
    "health",
    "medical",
    "disease",
    "religion",
    "political_belief",
    "ethnicity",
    "race",
    "product_ownership",
    "owns_device",
    "hardware_ownership",
    "professional_expertise_claim",
  ];

  // Temporary temporal phrases
  private readonly TEMPORARY_PHRASES = [
    "today",
    "this week",
    "right now",
    "currently",
    "just for now",
    "for this turn",
    "for now",
    "ajke",
    "আজকে",
    "এখন",
    "এই মুহূর্তে",
    "এইবারের জন্য",
    "temporary",
    "temporarily",
  ];

  // Durable preference markers
  private readonly DURABLE_PHRASES = [
    "from now on",
    "always",
    "forever",
    "every time",
    "my default",
    "i prefer",
    "i always want",
    "সবসময়",
    "আমার পছন্দ",
    "আমার রুল",
    "স্থায়ীভাবে",
    "মনে রেখো",
  ];

  public static getInstance(): LongTermUserModelEngine {
    if (!LongTermUserModelEngine.instance) {
      LongTermUserModelEngine.instance = new LongTermUserModelEngine();
    }
    return LongTermUserModelEngine.instance;
  }

  // ==========================================
  // Primary Evaluation Entry Point
  // ==========================================

  public synthesize(input: LongTermUserModelInput): UserModelAnalysis {
    const userId = input.userId || input.options?.userId || "default_user";
    const currentTime = input.options?.currentTime ?? 0;
    const isTopicIsolated = Boolean(
      input.options?.isTopicIsolated || input.governanceAnalysis?.topicIsolationApplied
    );

    let sensitiveBlockedCount = 0;
    let unsupportedBlockedCount = 0;
    let conflictsResolvedCount = 0;
    let signalsProcessed = 0;
    let memoriesIngested = 0;
    let patternsIngested = 0;

    const attributesMap = new Map<string, UserModelAttribute>();
    const decisions: UserModelDecision[] = [];
    const currentTurnOverrides: UserModelAttribute[] = [];

    // -----------------------------------------------------------------
    // Step 1: Ingest Governance-Approved Memories (Authorities 2 & 5)
    // -----------------------------------------------------------------
    if (input.governanceAnalysis?.governedCandidates) {
      for (const mem of input.governanceAnalysis.governedCandidates) {
        signalsProcessed++;
        memoriesIngested++;

        // Reject non-ACTIVE, suppressed, or unallowable memories
        if (mem.usageDecision !== "ALLOW" || mem.status !== "ACTIVE") {
          continue;
        }

        // Sensitive check
        if (this.isSensitive(mem.key) || this.isSensitive(mem.value)) {
          sensitiveBlockedCount++;
          decisions.push({
            key: mem.key,
            dimension: this.mapCategoryToDimension(mem.type, mem.key),
            decision: "SUPPRESSED_SENSITIVE",
            authority: "EXPLICIT_USER_MEMORY",
            reason: "Sensitive credentials or secrets suppressed from user model",
          });
          continue;
        }

        // Inferred identity check
        if (mem.isCandidateInferred && this.isForbiddenInferredIdentity(mem.key)) {
          unsupportedBlockedCount++;
          decisions.push({
            key: mem.key,
            dimension: this.mapCategoryToDimension(mem.type, mem.key),
            decision: "EXCLUDED_UNSUPPORTED",
            authority: "REPEATED_VALIDATED_SIGNAL",
            reason: "Unsupported inferred identity dimension strictly excluded",
          });
          continue;
        }

        // Determine authority & dimension
        const dimension = this.mapCategoryToDimension(mem.type, mem.key);
        const isExplicit = mem.source === "EXPLICIT_USER" && !mem.isCandidateInferred;
        const authority: UserModelEvidenceAuthority = isExplicit
          ? "EXPLICIT_USER_MEMORY"
          : mem.type === "PREFERENCE"
          ? "CONFIRMED_PREFERENCE"
          : "REPEATED_VALIDATED_SIGNAL";

        // Candidate vs Confirmed status
        const attrStatus: UserModelAttributeStatus = mem.isCandidateInferred
          ? "CANDIDATE"
          : "CONFIRMED";

        const evidence: UserModelEvidence = {
          evidenceId: `evi_mem_${this.deterministicHash(mem.memoryId + mem.value)}`,
          source: mem.source || "GOVERNED_MEMORY",
          authority,
          dimension,
          value: mem.value,
          timestamp: currentTime,
          isExplicit,
          contextSummary: mem.reasons?.join("; "),
        };

        const attrKey = this.normalizeAttributeKey(dimension, mem.key);
        const normalizedVal = this.normalizeValue(dimension, mem.value);

        this.upsertAttribute({
          map: attributesMap,
          decisions,
          key: attrKey,
          dimension,
          normalizedValue: normalizedVal,
          confidence: Math.min(1.0, Math.max(0.0, mem.confidence || 0.8)),
          evidence,
          status: attrStatus,
          authority,
          currentTime,
          isExplicit,
          onConflictResolved: () => conflictsResolvedCount++,
        });
      }
    }

    // -----------------------------------------------------------------
    // Step 2: Ingest Confirmed Adaptive Learning Patterns (Authority 4)
    // -----------------------------------------------------------------
    if (input.adaptiveLearning?.patterns) {
      for (const pat of input.adaptiveLearning.patterns) {
        signalsProcessed++;
        patternsIngested++;

        // Reject suppressed or outdated patterns
        if (pat.status === "SUPPRESSED" || pat.status === "OUTDATED") {
          continue;
        }

        // Sensitive check
        if (this.isSensitive(pat.key) || this.isSensitive(pat.value)) {
          sensitiveBlockedCount++;
          decisions.push({
            key: pat.key,
            dimension: this.mapCategoryToDimension(pat.patternType, pat.key),
            decision: "SUPPRESSED_SENSITIVE",
            authority: "CONFIRMED_ADAPTIVE_PATTERN",
            reason: "Sensitive pattern suppressed from user model",
          });
          continue;
        }

        // Inferred identity check
        if (this.isForbiddenInferredIdentity(pat.key)) {
          unsupportedBlockedCount++;
          decisions.push({
            key: pat.key,
            dimension: this.mapCategoryToDimension(pat.patternType, pat.key),
            decision: "EXCLUDED_UNSUPPORTED",
            authority: "CONFIRMED_ADAPTIVE_PATTERN",
            reason: "Unsupported inferred identity dimension strictly excluded",
          });
          continue;
        }

        const dimension = this.mapCategoryToDimension(pat.patternType, pat.key);
        const isConfirmed = pat.status === "CONFIRMED";
        const authority: UserModelEvidenceAuthority = isConfirmed
          ? "CONFIRMED_ADAPTIVE_PATTERN"
          : "REPEATED_VALIDATED_SIGNAL";

        const attrStatus: UserModelAttributeStatus = isConfirmed
          ? "CONFIRMED"
          : "CANDIDATE";

        const evidence: UserModelEvidence = {
          evidenceId: `evi_pat_${this.deterministicHash(pat.id + pat.value)}`,
          source: pat.source || "ADAPTIVE_LEARNING",
          authority,
          dimension,
          value: pat.value,
          timestamp: pat.lastObservedAt || currentTime,
          isExplicit: false,
          contextSummary: `Reinforced ${pat.reinforcementCount}x, independent ${pat.independentEvidenceCount}x`,
        };

        const attrKey = this.normalizeAttributeKey(dimension, pat.key);
        const normalizedVal = this.normalizeValue(dimension, pat.value);

        this.upsertAttribute({
          map: attributesMap,
          decisions,
          key: attrKey,
          dimension,
          normalizedValue: normalizedVal,
          confidence: Math.min(1.0, Math.max(0.0, pat.confidence || 0.7)),
          evidence,
          status: attrStatus,
          authority,
          currentTime,
          isExplicit: false,
          independentCount: pat.independentEvidenceCount,
          onConflictResolved: () => conflictsResolvedCount++,
        });
      }
    }

    // -----------------------------------------------------------------
    // Step 3: Current-Turn Analysis (Authority 1 / Overrides vs Durable)
    // -----------------------------------------------------------------
    if (input.message) {
      signalsProcessed++;
      const currentTurnDirectives = this.extractCurrentTurnExplicitDirectives(input.message, currentTime);

      for (const ct of currentTurnDirectives) {
        if (ct.isDurable) {
          // Durable explicit statement ("From now on, speak in Bangla") -> Updates or creates persistent confirmed attribute
          this.upsertAttribute({
            map: attributesMap,
            decisions,
            key: ct.attribute.key,
            dimension: ct.attribute.dimension,
            normalizedValue: ct.attribute.normalizedValue,
            confidence: 1.0,
            evidence: ct.attribute.evidence[0],
            status: "CONFIRMED",
            authority: "CURRENT_TURN_EXPLICIT",
            currentTime,
            isExplicit: true,
            isDurable: true,
            onConflictResolved: () => conflictsResolvedCount++,
          });
        } else {
          // Temporary current-turn instruction ("Explain this in Bangla", "আজকে concise করে বলো")
          // Placed in currentTurnOverrides; does NOT permanently mutate persistent profile.
          currentTurnOverrides.push(ct.attribute);
          decisions.push({
            key: ct.attribute.key,
            dimension: ct.attribute.dimension,
            decision: "TEMPORARY_OVERRIDE",
            authority: "CURRENT_TURN_EXPLICIT",
            reason: "Current-turn instruction overrides model for active turn without mutating long-term profile",
          });
        }
      }
    }

    // -----------------------------------------------------------------
    // Step 4: Build Profile Collections
    // -----------------------------------------------------------------
    const allAttributes = Array.from(attributesMap.values());
    const confirmedAttributes: UserModelAttribute[] = [];
    const candidateAttributes: UserModelAttribute[] = [];
    const temporaryAttributes: UserModelAttribute[] = [];
    const supersededAttributes: UserModelAttribute[] = [];
    const domainInterests: UserModelAttribute[] = [];
    const projectContexts: UserModelAttribute[] = [];
    const goals: UserModelAttribute[] = [];

    for (const attr of allAttributes) {
      if (attr.status === "CONFIRMED" || attr.status === "STABLE") {
        confirmedAttributes.push(attr);
      } else if (attr.status === "CANDIDATE") {
        candidateAttributes.push(attr);
      } else if (attr.status === "TEMPORARY") {
        temporaryAttributes.push(attr);
      } else if (attr.status === "SUPERSEDED") {
        supersededAttributes.push(attr);
      }

      if (attr.dimension === "DOMAIN_INTEREST") {
        domainInterests.push(attr);
      } else if (attr.dimension === "PROJECT_CONTEXT") {
        projectContexts.push(attr);
      } else if (attr.dimension === "USER_GOAL") {
        goals.push(attr);
      }
    }

    // Sort attributes deterministically by key
    confirmedAttributes.sort((a, b) => a.key.localeCompare(b.key));
    candidateAttributes.sort((a, b) => a.key.localeCompare(b.key));
    temporaryAttributes.sort((a, b) => a.key.localeCompare(b.key));
    supersededAttributes.sort((a, b) => a.key.localeCompare(b.key));
    domainInterests.sort((a, b) => a.key.localeCompare(b.key));
    projectContexts.sort((a, b) => a.key.localeCompare(b.key));
    goals.sort((a, b) => a.key.localeCompare(b.key));

    const profile: UserModelProfile = {
      userId,
      attributes: Object.fromEntries(attributesMap.entries()),
      confirmedAttributes,
      candidateAttributes,
      temporaryAttributes,
      supersededAttributes,
      domainInterests,
      projectContexts,
      goals,
      lastSynthesizedAt: currentTime,
    };

    // -----------------------------------------------------------------
    // Step 5: Model Health Synthesis
    // -----------------------------------------------------------------
    const totalAttrs = confirmedAttributes.length + candidateAttributes.length;
    const evidenceCoverage =
      totalAttrs > 0
        ? Number((confirmedAttributes.length / totalAttrs).toFixed(2))
        : 0.0;

    let overallHealth: UserModelHealth["overallHealth"] = "INSUFFICIENT_EVIDENCE";
    if (conflictsResolvedCount > 3) {
      overallHealth = "DEGRADED";
    } else if (confirmedAttributes.length >= 2 && candidateAttributes.length <= confirmedAttributes.length * 2) {
      overallHealth = "EXCELLENT";
    } else if (confirmedAttributes.length >= 1) {
      overallHealth = "GOOD";
    }

    const health: UserModelHealth = {
      evidenceCoverage,
      conflictCount: conflictsResolvedCount,
      staleAttributeCount: supersededAttributes.length,
      confirmedAttributeCount: confirmedAttributes.length,
      candidateAttributeCount: candidateAttributes.length,
      suppressedAttributeCount: sensitiveBlockedCount + unsupportedBlockedCount,
      overallHealth,
    };

    // -----------------------------------------------------------------
    // Step 6: Generate Sanitized User Model Directives
    // -----------------------------------------------------------------
    const activeDirectives = this.generateSanitizedDirectives({
      confirmedAttributes,
      currentTurnOverrides,
      isTopicIsolated,
    });

    const safetyStatus =
      sensitiveBlockedCount > 0
        ? "SENSITIVE_SUPPRESSED"
        : unsupportedBlockedCount > 0
        ? "UNSUPPORTED_IDENTITY_BLOCKED"
        : "SAFE";

    return {
      userId,
      profile,
      activeDirectives,
      currentTurnOverrides,
      decisions,
      health,
      safetyStatus,
      diagnostics: {
        signalsProcessed,
        memoriesIngested,
        patternsIngested,
        conflictsResolved: conflictsResolvedCount,
        sensitiveBlocked: sensitiveBlockedCount,
        unsupportedIdentityBlocked: unsupportedBlockedCount,
        isDeterministic: true,
      },
    };
  }

  // ==========================================
  // Upsert & Conflict Resolution Logic
  // ==========================================

  private upsertAttribute(params: {
    map: Map<string, UserModelAttribute>;
    decisions: UserModelDecision[];
    key: string;
    dimension: UserModelDimension;
    normalizedValue: string;
    confidence: number;
    evidence: UserModelEvidence;
    status: UserModelAttributeStatus;
    authority: UserModelEvidenceAuthority;
    currentTime: number;
    isExplicit: boolean;
    isDurable?: boolean;
    independentCount?: number;
    onConflictResolved: () => void;
  }): void {
    const {
      map,
      decisions,
      key,
      dimension,
      normalizedValue,
      confidence,
      evidence,
      status,
      authority,
      currentTime,
      isExplicit,
      isDurable = true,
      independentCount,
      onConflictResolved,
    } = params;

    const existing = map.get(key);

    if (!existing) {
      const newAttr: UserModelAttribute = {
        key,
        dimension,
        normalizedValue,
        confidence,
        evidenceCount: 1,
        independentEvidenceCount: independentCount ?? (isExplicit ? 1 : 1),
        status,
        sourceClassification: authority,
        firstObservedAt: currentTime,
        lastObservedAt: currentTime,
        isDurable,
        isTemporary: !isDurable,
        evidence: [evidence],
      };
      map.set(key, newAttr);
      decisions.push({
        key,
        dimension,
        decision: status === "CANDIDATE" ? "HELD_AS_CANDIDATE" : "SYNTHESIZED",
        authority,
        reason: `Attribute synthesized under authority ${authority}`,
      });
      return;
    }

    // Existing attribute found: evaluate precedence & conflicts
    const existingRank = this.getAuthorityRank(existing.sourceClassification);
    const newRank = this.getAuthorityRank(authority);

    // Identical value -> reinforcement without inflation
    if (existing.normalizedValue.toLowerCase() === normalizedValue.toLowerCase()) {
      // Bounded evidence increment: only if distinct turn / evidence
      const isDuplicateEvidence = existing.evidence.some(
        (e) => e.evidenceId === evidence.evidenceId
      );
      if (!isDuplicateEvidence) {
        existing.evidence.push(evidence);
        existing.evidenceCount = Math.min(50, existing.evidenceCount + 1);
        if (independentCount !== undefined) {
          existing.independentEvidenceCount = Math.min(50, Math.max(existing.independentEvidenceCount, independentCount));
        } else {
          existing.independentEvidenceCount = Math.min(50, existing.independentEvidenceCount + 1);
        }
      }

      existing.lastObservedAt = Math.max(existing.lastObservedAt, currentTime);
      existing.confidence = Math.min(1.0, Math.max(existing.confidence, confidence));

      // Check promotion for candidate: requires independentEvidenceCount >= 3 or explicit statement
      if (existing.status === "CANDIDATE" && (isExplicit || existing.independentEvidenceCount >= 3)) {
        existing.status = "CONFIRMED";
        decisions.push({
          key,
          dimension,
          decision: "UPDATED",
          authority,
          reason: `Candidate promoted to confirmed with ${existing.independentEvidenceCount} independent observations`,
        });
      }
      return;
    }

    // Conflicting value: deterministic supersession
    if (newRank > existingRank) {
      // Newer, higher authority supersedes old
      onConflictResolved();
      existing.status = "SUPERSEDED";
      existing.supersededBy = `${key}:${normalizedValue}`;

      const updatedAttr: UserModelAttribute = {
        key,
        dimension,
        normalizedValue,
        confidence,
        evidenceCount: 1,
        independentEvidenceCount: independentCount ?? (isExplicit ? 1 : 1),
        status,
        sourceClassification: authority,
        firstObservedAt: existing.firstObservedAt,
        lastObservedAt: currentTime,
        isDurable,
        isTemporary: !isDurable,
        previousValue: existing.normalizedValue,
        lineage: [...(existing.lineage || []), `${existing.normalizedValue} (superseded)`],
        evidence: [evidence],
      };

      map.set(key, updatedAttr);
      decisions.push({
        key,
        dimension,
        decision: "SUPERSEDED",
        authority,
        reason: `Higher authority (${authority} > ${existing.sourceClassification}) superseded value '${existing.normalizedValue}' -> '${normalizedValue}'`,
      });
    } else if (newRank === existingRank && isExplicit) {
      // Same explicit level: newer turn wins
      onConflictResolved();
      existing.status = "SUPERSEDED";
      existing.supersededBy = `${key}:${normalizedValue}`;

      const updatedAttr: UserModelAttribute = {
        key,
        dimension,
        normalizedValue,
        confidence,
        evidenceCount: 1,
        independentEvidenceCount: 1,
        status,
        sourceClassification: authority,
        firstObservedAt: existing.firstObservedAt,
        lastObservedAt: currentTime,
        isDurable,
        isTemporary: !isDurable,
        previousValue: existing.normalizedValue,
        lineage: [...(existing.lineage || []), `${existing.normalizedValue} (superseded)`],
        evidence: [evidence],
      };

      map.set(key, updatedAttr);
      decisions.push({
        key,
        dimension,
        decision: "SUPERSEDED",
        authority,
        reason: `Newer explicit correction superseded previous value '${existing.normalizedValue}' -> '${normalizedValue}'`,
      });
    } else {
      // Lower authority candidate rejected from overriding established attribute
      decisions.push({
        key,
        dimension,
        decision: "HELD_AS_CANDIDATE",
        authority,
        reason: `Lower authority (${authority} <= ${existing.sourceClassification}) candidate rejected from overriding active value`,
      });
    }
  }

  // ==========================================
  // Current-Turn Explicit Directives Extraction
  // ==========================================

  private extractCurrentTurnExplicitDirectives(
    message: string,
    currentTime: number
  ): Array<{ attribute: UserModelAttribute; isDurable: boolean }> {
    const text = message.trim();
    const lower = text.toLowerCase();
    const results: Array<{ attribute: UserModelAttribute; isDurable: boolean }> = [];

    const isDurable = this.DURABLE_PHRASES.some((dp) => lower.includes(dp));
    const isTemporary = this.TEMPORARY_PHRASES.some((tp) => lower.includes(tp));

    // 1. Language Directives
    if (
      lower.includes("banglish") ||
      lower.includes("banglish e") ||
      lower.includes("banglish e bolo") ||
      lower.includes("speak in banglish")
    ) {
      results.push({
        attribute: this.createCurrentTurnAttr(
          "language",
          "LANGUAGE",
          "Banglish",
          isDurable,
          currentTime
        ),
        isDurable: isDurable && !isTemporary,
      });
    } else if (
      lower.includes("bangla") ||
      lower.includes("banglay") ||
      lower.includes("বাংলায়") ||
      lower.includes("বাংলা") ||
      lower.includes("speak in bangla")
    ) {
      results.push({
        attribute: this.createCurrentTurnAttr(
          "language",
          "LANGUAGE",
          "Bangla",
          isDurable,
          currentTime
        ),
        isDurable: isDurable && !isTemporary,
      });
    } else if (
      lower.includes("english") ||
      lower.includes("in english") ||
      lower.includes("speak english")
    ) {
      results.push({
        attribute: this.createCurrentTurnAttr(
          "language",
          "LANGUAGE",
          "English",
          isDurable,
          currentTime
        ),
        isDurable: isDurable && !isTemporary,
      });
    }

    // 2. Verbosity Directives
    if (
      lower.includes("concise") ||
      lower.includes("brief") ||
      lower.includes("short") ||
      lower.includes("সংক্ষেপে") ||
      lower.includes("choto kore")
    ) {
      results.push({
        attribute: this.createCurrentTurnAttr(
          "verbosity",
          "VERBOSITY",
          "Concise",
          isDurable,
          currentTime
        ),
        isDurable: isDurable && !isTemporary,
      });
    } else if (
      lower.includes("detailed") ||
      lower.includes("in detail") ||
      lower.includes("elaborate") ||
      lower.includes("বিস্তারিত")
    ) {
      results.push({
        attribute: this.createCurrentTurnAttr(
          "verbosity",
          "VERBOSITY",
          "Detailed",
          isDurable,
          currentTime
        ),
        isDurable: isDurable && !isTemporary,
      });
    }

    // 3. Tone Directives
    if (lower.includes("casual") || lower.includes("chill") || lower.includes("friendly")) {
      results.push({
        attribute: this.createCurrentTurnAttr(
          "tone",
          "TONE",
          "Casual",
          isDurable,
          currentTime
        ),
        isDurable: isDurable && !isTemporary,
      });
    } else if (lower.includes("professional") || lower.includes("formal")) {
      results.push({
        attribute: this.createCurrentTurnAttr(
          "tone",
          "TONE",
          "Professional",
          isDurable,
          currentTime
        ),
        isDurable: isDurable && !isTemporary,
      });
    }

    // 4. Format Directives
    if (lower.includes("bullet point") || lower.includes("bullet points") || lower.includes("bullets")) {
      results.push({
        attribute: this.createCurrentTurnAttr(
          "format",
          "FORMAT",
          "Bullet Points",
          isDurable,
          currentTime
        ),
        isDurable: isDurable && !isTemporary,
      });
    } else if (lower.includes("table") || lower.includes("tabular")) {
      results.push({
        attribute: this.createCurrentTurnAttr(
          "format",
          "FORMAT",
          "Table",
          isDurable,
          currentTime
        ),
        isDurable: isDurable && !isTemporary,
      });
    } else if (lower.includes("step by step") || lower.includes("steps")) {
      results.push({
        attribute: this.createCurrentTurnAttr(
          "format",
          "FORMAT",
          "Step-by-Step",
          isDurable,
          currentTime
        ),
        isDurable: isDurable && !isTemporary,
      });
    }

    // 5. Code Style / Language Directives ("mostly TypeScript use kori")
    if (
      (lower.includes("mostly") || lower.includes("usually") || lower.includes("always")) &&
      (lower.includes("typescript") || lower.includes("python") || lower.includes("rust") || lower.includes("go"))
    ) {
      const codeLang = lower.includes("typescript")
        ? "TypeScript"
        : lower.includes("python")
        ? "Python"
        : lower.includes("rust")
        ? "Rust"
        : "Go";

      results.push({
        attribute: this.createCurrentTurnAttr(
          "code_language",
          "CODE_STYLE",
          codeLang,
          true,
          currentTime
        ),
        isDurable: true,
      });
    }

    return results;
  }

  private createCurrentTurnAttr(
    key: string,
    dimension: UserModelDimension,
    value: string,
    isDurable: boolean,
    currentTime: number
  ): UserModelAttribute {
    return {
      key,
      dimension,
      normalizedValue: value,
      confidence: 1.0,
      evidenceCount: 1,
      independentEvidenceCount: 1,
      status: isDurable ? "CONFIRMED" : "TEMPORARY",
      sourceClassification: "CURRENT_TURN_EXPLICIT",
      firstObservedAt: currentTime,
      lastObservedAt: currentTime,
      isDurable,
      isTemporary: !isDurable,
      evidence: [
        {
          evidenceId: `evi_ct_${this.deterministicHash(key + value)}`,
          source: "CURRENT_TURN_EXPLICIT",
          authority: "CURRENT_TURN_EXPLICIT",
          dimension,
          value,
          timestamp: currentTime,
          isExplicit: true,
        },
      ],
    };
  }

  // ==========================================
  // Directive Sanitization & Generation
  // ==========================================

  private generateSanitizedDirectives(params: {
    confirmedAttributes: UserModelAttribute[];
    currentTurnOverrides: UserModelAttribute[];
    isTopicIsolated: boolean;
  }): string[] {
    const { confirmedAttributes, currentTurnOverrides, isTopicIsolated } = params;
    const directives: string[] = [];

    // Map to deduplicate by key, letting currentTurnOverrides take immediate precedence
    const activeMap = new Map<string, UserModelAttribute>();

    for (const attr of confirmedAttributes) {
      if (isTopicIsolated && attr.dimension === "DOMAIN_INTEREST") {
        continue; // Exclude domain interests during topic isolation
      }
      activeMap.set(attr.key, attr);
    }

    for (const override of currentTurnOverrides) {
      activeMap.set(override.key, override);
    }

    for (const attr of Array.from(activeMap.values())) {
      const cleanKey = this.sanitizeText(attr.key);
      const cleanVal = this.sanitizeText(attr.normalizedValue);

      if (!cleanKey || !cleanVal || this.isSensitive(cleanKey) || this.isSensitive(cleanVal)) {
        continue;
      }

      // Generate human-readable, sanitized high-level prompt directive
      switch (attr.dimension) {
        case "LANGUAGE":
          directives.push(`[USER_MODEL: User commonly communicates in ${cleanVal}]`);
          break;
        case "VERBOSITY":
          directives.push(`[USER_MODEL: User generally prefers ${cleanVal.toLowerCase()} explanations]`);
          break;
        case "TONE":
          directives.push(`[USER_MODEL: User prefers a ${cleanVal.toLowerCase()} communication tone]`);
          break;
        case "FORMAT":
          directives.push(`[USER_MODEL: User prefers ${cleanVal.toLowerCase()} presentation format]`);
          break;
        case "CODE_STYLE":
          directives.push(`[USER_MODEL: User prefers ${cleanVal} for code implementations]`);
          break;
        case "TASK_WORKFLOW":
          directives.push(`[USER_MODEL: User commonly follows ${cleanVal} workflow]`);
          break;
        case "DOMAIN_INTEREST":
          if (!isTopicIsolated) {
            directives.push(`[USER_MODEL: User has an active interest in ${cleanVal}]`);
          }
          break;
        case "PROJECT_CONTEXT":
          directives.push(`[USER_MODEL: Active project context: ${cleanVal}]`);
          break;
        case "USER_GOAL":
          directives.push(`[USER_MODEL: Stated user goal: ${cleanVal}]`);
          break;
        default:
          directives.push(`[USER_MODEL: User preference: ${cleanKey} is ${cleanVal}]`);
          break;
      }
    }

    return directives;
  }

  // ==========================================
  // Helper & Mapping Functions
  // ==========================================

  private getAuthorityRank(authority: UserModelEvidenceAuthority): number {
    switch (authority) {
      case "CURRENT_TURN_EXPLICIT":
        return 100;
      case "EXPLICIT_USER_MEMORY":
        return 80;
      case "VERIFIED_EVIDENCE":
        return 70;
      case "CONFIRMED_ADAPTIVE_PATTERN":
        return 60;
      case "CONFIRMED_PREFERENCE":
        return 50;
      case "REPEATED_VALIDATED_SIGNAL":
        return 40;
      case "PREDICTIVE_CONTEXT":
        return 10;
      default:
        return 0;
    }
  }

  private mapCategoryToDimension(category?: string, key?: string): UserModelDimension {
    const cat = (category || "").toUpperCase();
    const k = (key || "").toLowerCase();

    if (k.includes("language") || k.includes("bhasha") || cat === "LANGUAGE") return "LANGUAGE";
    if (k.includes("verbosity") || k.includes("length") || cat === "VERBOSITY") return "VERBOSITY";
    if (k.includes("tone") || cat === "TONE") return "TONE";
    if (k.includes("format") || k.includes("style_format") || cat === "FORMAT") return "FORMAT";
    if (k.includes("code") || k.includes("typescript") || k.includes("python") || cat === "CODE_STYLE") return "CODE_STYLE";
    if (k.includes("workflow") || cat === "TASK_WORKFLOW") return "TASK_WORKFLOW";
    if (k.includes("domain") || k.includes("interest") || cat === "DOMAIN_INTEREST") return "DOMAIN_INTEREST";
    if (k.includes("project") || cat === "PROJECT_CONTEXT") return "PROJECT_CONTEXT";
    if (k.includes("goal") || cat === "USER_GOAL") return "USER_GOAL";
    return "COMMUNICATION";
  }

  private normalizeAttributeKey(dimension: UserModelDimension, rawKey: string): string {
    const k = rawKey.toLowerCase().replace(/[^a-z0-9_]/g, "_").trim();
    if (k.includes("code") || k.includes("coding")) return "code_language";
    if (k.includes("language") || k.includes("bhasha")) return "language";
    if (k.includes("verbosity") || k.includes("length") || k.includes("concise") || k.includes("detailed")) return "verbosity";
    if (k.includes("tone")) return "tone";
    if (k.includes("format")) return "format";
    if (k.includes("workflow")) return "workflow";
    if (k.startsWith("preferred_")) {
      return k.replace("preferred_", "");
    }
    return k || dimension.toLowerCase();
  }

  private normalizeValue(dimension: UserModelDimension, rawValue: string): string {
    const v = rawValue.trim();
    if (dimension === "LANGUAGE") {
      const low = v.toLowerCase();
      if (low.includes("banglish")) return "Banglish";
      if (low.includes("bangla")) return "Bangla";
      if (low.includes("english")) return "English";
    }
    if (dimension === "VERBOSITY") {
      const low = v.toLowerCase();
      if (low.includes("concise") || low.includes("brief")) return "Concise";
      if (low.includes("detail") || low.includes("elaborate")) return "Detailed";
    }
    return v;
  }

  private isSensitive(text: string): boolean {
    if (!text) return false;
    const lower = text.toLowerCase();
    const sensitiveKeywords = [
      "password",
      "passwd",
      "pin",
      "secret",
      "api_key",
      "apikey",
      "api-key",
      "auth_token",
      "authtoken",
      "auth-token",
      "bearer",
      "cvv",
      "cvc",
      "ssn",
      "nid",
      "credit_card",
      "credit card",
      "creditcard",
      "debit_card",
      "debit card",
      "debitcard",
      "bank_account",
      "bank account",
      "routing_number",
      "access_token",
      "private_key",
    ];
    if (sensitiveKeywords.some((kw) => lower.includes(kw))) {
      return true;
    }
    return this.SENSITIVE_REGEX.test(text);
  }

  private isForbiddenInferredIdentity(key: string): boolean {
    const k = key.toLowerCase();
    return this.FORBIDDEN_INFERRED_IDENTITY_KEYS.some((f) => k.includes(f));
  }

  private sanitizeText(text: string): string {
    if (!text) return "";
    return text
      .replace(/\b(?:mem|pat|cand|evi|rule|db)_[a-zA-Z0-9_-]+\b/gi, "")
      .replace(/\b0x[a-fA-F0-9]{8,}\b/g, "")
      .replace(/\bsha256:[a-f0-9]+\b/gi, "")
      .replace(/\b\d{10,13}\b/g, "")
      .replace(/\b(?:confidence|score)\s*[:=]?\s*0\.\d+\b/gi, "")
      .replace(/\b0\.\d{3,}\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private deterministicHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}

export const longTermUserModelEngine = LongTermUserModelEngine.getInstance();
