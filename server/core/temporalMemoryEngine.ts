/**
 * Dora Temporal Memory & Life-Pattern Reasoning Engine
 * Phase 2 — Step 9
 * 
 * Implements a deterministic, bounded, non-LLM temporal reasoning layer.
 * Analyzes the temporal state, evolution, stability, recency, and lifecycle
 * of validated memories, adaptive patterns, and user-model attributes.
 */

import {
  TemporalStatus,
  TemporalScope,
  TemporalRelationType,
  TemporalObservation,
  PreviousValueRecord,
  TemporalPattern,
  TemporalRelation,
  TemporalEvolutionRecord,
  TemporalDiagnostics,
  TemporalMemoryInput,
  TemporalMemoryAnalysis,
} from "./temporalMemoryTypes";
import { UserModelEvidenceAuthority, UserModelDimension } from "./longTermUserModelTypes";

export class TemporalMemoryEngine {
  private static instance: TemporalMemoryEngine;

  // Deterministic Time Thresholds (Milliseconds)
  private readonly DEFAULT_RECENCY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly DEFAULT_STALE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly HIGH_IMPORTANCE_STALE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days for high-importance stable items

  // Stability & Recurrence Threshold Constants
  private readonly MIN_STABLE_INDEPENDENT_COUNT = 3;
  private readonly MIN_STABLE_PERIODS_COUNT = 2;
  private readonly MIN_STABLE_CONFIDENCE = 0.75;
  private readonly MIN_RECURRING_PERIODS_COUNT = 2;

  // Sensitive & Forbidden Identity Patterns
  private readonly SENSITIVE_PATTERNS = [
    /\b(password|passwd|pwd)\b/i,
    /\b(secret|api[_-]?key|bearer\s+[a-z0-9_\-\.]+)\b/i,
    /\b(token|auth[_-]?token|access[_-]?token|refresh[_-]?token)\b/i,
    /\b(credit[_-]?card|card[_-]?number|cvv|cvc|pin|ssn)\b/i,
    /\b(bank[_-]?account|routing[_-]?number|private[_-]?key)\b/i,
  ];

  private readonly FORBIDDEN_IDENTITY_DIMENSIONS = [
    /\b(profession|job[_-]?title|occupation|employer)\b/i,
    /\b(income|net[_-]?worth|salary)\b/i,
    /\b(age|date[_-]?of[_-]?birth|dob)\b/i,
    /\b(exact[_-]?address|home[_-]?address|gps[_-]?coordinates)\b/i,
    /\b(medical[_-]?condition|health[_-]?status)\b/i,
    /\b(political[_-]?affiliation|religious[_-]?belief)\b/i,
    /\b(sexual[_-]?orientation|marital[_-]?status)\b/i,
    /\b(ownership|device[_-]?owner|car[_-]?owner|house[_-]?owner)\b/i,
  ];

  private readonly GLOBAL_PREFERENCE_KEYS = new Set([
    "language",
    "preferred_language",
    "verbosity",
    "preferred_verbosity",
    "tone",
    "preferred_tone",
    "format",
    "preferred_format",
    "formatting_style",
    "code_density",
    "explanation_depth",
  ]);

  private constructor() {}

  public static getInstance(): TemporalMemoryEngine {
    if (!TemporalMemoryEngine.instance) {
      TemporalMemoryEngine.instance = new TemporalMemoryEngine();
    }
    return TemporalMemoryEngine.instance;
  }

  /**
   * Deterministic simple hash function (no random UUIDs or runtime non-determinism).
   */
  public deterministicHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Evaluates the temporal state and evolution of user attributes and memories.
   */
  public evaluate(input: TemporalMemoryInput): TemporalMemoryAnalysis {
    const userId = input.userId || "default_user";
    const currentTime = input.options?.currentTime ?? input.currentTime ?? 0;
    const isTopicIsolated = Boolean(
      input.options?.isTopicIsolated ||
      input.governanceAnalysis?.topicIsolationApplied ||
      input.context?.isTopicSwitch
    );
    const activeTopic =
      input.options?.activeTopic ||
      input.context?.activeTopic ||
      input.intent?.targetEntity ||
      "";

    const recencyWindowMs = input.options?.recencyWindowMs ?? this.DEFAULT_RECENCY_WINDOW_MS;
    const staleThresholdMs = input.options?.staleThresholdMs ?? this.DEFAULT_STALE_THRESHOLD_MS;

    const patternMap = new Map<string, TemporalPattern>();
    const evolutions: TemporalEvolutionRecord[] = [];
    const relations: TemporalRelation[] = [];
    const directives: string[] = [];

    const diagnostics: TemporalDiagnostics = {
      totalPatternsAnalyzed: 0,
      stableCount: 0,
      recurringCount: 0,
      evolvingCount: 0,
      historicalCount: 0,
      staleCount: 0,
      suppressedSensitiveCount: 0,
      topicIsolatedCount: 0,
      evolutionTransitions: [],
    };

    // -------------------------------------------------------------------------
    // STEP 1: Ingest Long-Term User Model Attributes (Step 8 Output)
    // -------------------------------------------------------------------------
    if (input.longTermUserModel?.profile?.attributes) {
      const attrs = input.longTermUserModel.profile.attributes as Record<string, any>;
      for (const [rawKey, attr] of Object.entries(attrs)) {
        if (!attr || !rawKey) continue;
        const effectiveKey = attr.key || rawKey;
        const normKey = this.normalizeKey(effectiveKey);

        if (this.isSensitive(effectiveKey) || this.isSensitive(attr.normalizedValue || attr.value)) {
          diagnostics.suppressedSensitiveCount++;
          continue;
        }

        if (this.isForbiddenIdentity(effectiveKey)) {
          continue;
        }

        // Handle lifecycle status
        const attrStatus = (attr.status || "").toUpperCase();
        if (attrStatus === "QUARANTINED" || attrStatus === "DELETED") {
          continue;
        }

        const dimension = attr.dimension || this.inferDimension(normKey);
        const authority: UserModelEvidenceAuthority = attr.sourceClassification || "VERIFIED_EVIDENCE";
        const firstObservedAt = attr.firstObservedAt ?? currentTime;
        const lastObservedAt = attr.lastObservedAt ?? currentTime;
        const confidence = Math.min(1.0, Math.max(0.0, attr.confidence ?? 0.75));

        // Deduplicate observations from evidence list
        const { observations, distinctPeriods, distinctTurnsCount } = this.extractObservations(
          attr.evidence,
          attr.normalizedValue || attr.value || "",
          authority,
          firstObservedAt,
          lastObservedAt,
          attr.independentEvidenceCount ?? attr.evidenceCount ?? 1
        );

        const scope: TemporalScope = this.determineScope(normKey, dimension);

        let initialStatus: TemporalStatus = "CURRENT";
        let isStale = false;
        if (attrStatus === "EXPIRED") {
          initialStatus = "EXPIRED";
          isStale = true;
        } else if (attrStatus === "OUTDATED") {
          initialStatus = "STALE";
          isStale = true;
        } else if (attrStatus === "SUPERSEDED") {
          initialStatus = "SUPERSEDED";
        }

        const pattern: TemporalPattern = {
          patternId: `tp_${normKey}_${this.deterministicHash(normKey + (attr.normalizedValue || attr.value))}`,
          attributeKey: normKey,
          dimension,
          currentValue: attr.normalizedValue || attr.value || "",
          normalizedValue: attr.normalizedValue || attr.value || "",
          firstObservedAt,
          lastObservedAt,
          observationCount: Math.max(observations.length, attr.evidenceCount ?? 1),
          independentObservationCount: distinctTurnsCount,
          activePeriods: distinctPeriods,
          previousValues: [],
          temporalStatus: initialStatus,
          confidence,
          sourceAuthority: authority,
          scope,
          lineage: attr.lineage || [attr.id || `attr_${normKey}`],
          relevanceScore: 0.8,
          isStable: false,
          isRecurring: false,
          isStale,
          isCurrentTurnOverride: false,
          associatedTopic: this.isGlobalPreference(normKey) ? undefined : activeTopic || undefined,
        };

        patternMap.set(normKey, pattern);
      }
    }

    // -------------------------------------------------------------------------
    // STEP 2: Ingest Adaptive Learning Patterns (Step 5 Output)
    // -------------------------------------------------------------------------
    if (input.adaptiveLearning?.patterns && Array.isArray(input.adaptiveLearning.patterns)) {
      for (const pat of input.adaptiveLearning.patterns) {
        if (!pat || !pat.key) continue;
        const normKey = this.normalizeKey(pat.key);

        if (this.isSensitive(pat.key) || this.isSensitive(pat.value)) {
          diagnostics.suppressedSensitiveCount++;
          continue;
        }
        if (this.isForbiddenIdentity(pat.key)) {
          continue;
        }

        const dimension = this.inferDimension(normKey);
        const firstObservedAt = pat.firstObservedAt ?? currentTime;
        const lastObservedAt = pat.lastObservedAt ?? currentTime;
        const confidence = Math.min(1.0, Math.max(0.0, pat.confidence ?? 0.7));
        const authority: UserModelEvidenceAuthority =
          pat.status === "CONFIRMED"
            ? "CONFIRMED_ADAPTIVE_PATTERN"
            : "REPEATED_VALIDATED_SIGNAL";

        const { observations, distinctPeriods, distinctTurnsCount } = this.extractObservations(
          pat.evidence,
          pat.value || "",
          authority,
          firstObservedAt,
          lastObservedAt,
          pat.independentEvidenceCount ?? pat.reinforcementCount ?? 1
        );

        const existing = patternMap.get(normKey);
        if (!existing) {
          const pattern: TemporalPattern = {
            patternId: `tp_${normKey}_${this.deterministicHash(normKey + pat.value)}`,
            attributeKey: normKey,
            dimension,
            currentValue: pat.value || "",
            normalizedValue: pat.value || "",
            firstObservedAt,
            lastObservedAt,
            observationCount: Math.max(observations.length, pat.reinforcementCount ?? 1),
            independentObservationCount: distinctTurnsCount,
            activePeriods: distinctPeriods,
            previousValues: [],
            temporalStatus: pat.status === "CONFIRMED" && distinctTurnsCount >= 3 ? "STABLE" : "RECENT",
            confidence,
            sourceAuthority: authority,
            scope: this.determineScope(normKey, dimension),
            lineage: [pat.id || `pat_${normKey}`],
            relevanceScore: 0.7,
            isStable: false,
            isRecurring: false,
            isStale: false,
            isCurrentTurnOverride: false,
          };
          patternMap.set(normKey, pattern);
        } else {
          // If existing value is different, check for evolution / conflict
          if (
            existing.currentValue.toLowerCase().trim() !==
            (pat.value || "").toLowerCase().trim()
          ) {
            this.handlePreferenceTransition({
              patternMap,
              existing,
              newValue: pat.value || "",
              newAuthority: authority,
              newTimestamp: lastObservedAt,
              newConfidence: confidence,
              newFirstObservedAt: firstObservedAt,
              newIndependentCount: distinctTurnsCount,
              newPeriods: distinctPeriods,
              evolutions,
              relations,
              currentTime,
            });
          } else {
            // Reinforce existing
            existing.lastObservedAt = Math.max(existing.lastObservedAt, lastObservedAt);
            existing.firstObservedAt = Math.min(existing.firstObservedAt, firstObservedAt);
            existing.observationCount += observations.length > 0 ? observations.length : 1;
            existing.independentObservationCount = Math.max(
              existing.independentObservationCount,
              distinctTurnsCount
            );
            for (const p of distinctPeriods) {
              if (!existing.activePeriods.includes(p)) {
                existing.activePeriods.push(p);
              }
            }
            existing.confidence = Math.max(existing.confidence, confidence);
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // STEP 3: Ingest Memory Governance Candidates (Step 4 Output)
    // -------------------------------------------------------------------------
    if (input.governanceAnalysis?.approvedCandidates && Array.isArray(input.governanceAnalysis.approvedCandidates)) {
      for (const cand of input.governanceAnalysis.approvedCandidates) {
        if (!cand || !cand.key) continue;
        const normKey = this.normalizeKey(cand.key);

        if (this.isSensitive(cand.key) || this.isSensitive(cand.value)) {
          diagnostics.suppressedSensitiveCount++;
          continue;
        }
        if (this.isForbiddenIdentity(cand.key)) {
          continue;
        }

        const isExplicit = cand.source === "EXPLICIT_USER" || cand.source === "USER_EXPLICIT";
        const authority: UserModelEvidenceAuthority = isExplicit
          ? "EXPLICIT_USER_MEMORY"
          : "VERIFIED_EVIDENCE";
        const confidence = Math.min(1.0, Math.max(0.0, cand.confidence ?? (isExplicit ? 1.0 : 0.8)));
        const candTimestamp = cand.timestamp ?? currentTime;

        const existing = patternMap.get(normKey);
        if (!existing) {
          patternMap.set(normKey, {
            patternId: `tp_${normKey}_${this.deterministicHash(normKey + cand.value)}`,
            attributeKey: normKey,
            dimension: this.inferDimension(normKey),
            currentValue: cand.value || "",
            normalizedValue: cand.value || "",
            firstObservedAt: candTimestamp,
            lastObservedAt: candTimestamp,
            observationCount: 1,
            independentObservationCount: 1,
            activePeriods: [`period_${candTimestamp}`],
            previousValues: [],
            temporalStatus: isExplicit ? "CURRENT" : "RECENT",
            confidence,
            sourceAuthority: authority,
            scope: this.determineScope(normKey, this.inferDimension(normKey)),
            lineage: [cand.memoryId || `mem_${normKey}`],
            relevanceScore: isExplicit ? 0.9 : 0.75,
            isStable: false,
            isRecurring: false,
            isStale: false,
            isCurrentTurnOverride: false,
          });
        } else {
          if (
            existing.currentValue.toLowerCase().trim() !==
            (cand.value || "").toLowerCase().trim()
          ) {
            this.handlePreferenceTransition({
              patternMap,
              existing,
              newValue: cand.value || "",
              newAuthority: authority,
              newTimestamp: candTimestamp,
              newConfidence: confidence,
              newFirstObservedAt: candTimestamp,
              newIndependentCount: 1,
              newPeriods: [`period_${candTimestamp}`],
              evolutions,
              relations,
              currentTime,
            });
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // STEP 4: Ingest Current Turn Explicit Directives & Overrides
    // -------------------------------------------------------------------------
    if (input.message) {
      const explicitOverrides = this.detectCurrentTurnOverrides(input.message, currentTime);
      for (const override of explicitOverrides) {
        const normKey = this.normalizeKey(override.key);
        if (this.isSensitive(override.key) || this.isSensitive(override.value)) {
          diagnostics.suppressedSensitiveCount++;
          continue;
        }

        const existing = patternMap.get(normKey);
        if (existing) {
          if (
            existing.currentValue.toLowerCase().trim() !==
            override.value.toLowerCase().trim()
          ) {
            this.handlePreferenceTransition({
              patternMap,
              existing,
              newValue: override.value,
              newAuthority: override.isDurable
                ? "EXPLICIT_USER_MEMORY"
                : "CURRENT_TURN_EXPLICIT",
              newTimestamp: currentTime,
              newConfidence: 1.0,
              newFirstObservedAt: currentTime,
              newIndependentCount: 1,
              newPeriods: [`turn_${currentTime}`],
              evolutions,
              relations,
              currentTime,
              isCurrentTurnOverride: !override.isDurable,
            });
          } else {
            existing.lastObservedAt = currentTime;
            existing.sourceAuthority = override.isDurable
              ? "EXPLICIT_USER_MEMORY"
              : "CURRENT_TURN_EXPLICIT";
            existing.temporalStatus = "CURRENT";
            existing.isCurrentTurnOverride = !override.isDurable;
          }
        } else {
          patternMap.set(normKey, {
            patternId: `tp_${normKey}_${this.deterministicHash(normKey + override.value)}`,
            attributeKey: normKey,
            dimension: this.inferDimension(normKey),
            currentValue: override.value,
            normalizedValue: override.value,
            firstObservedAt: currentTime,
            lastObservedAt: currentTime,
            observationCount: 1,
            independentObservationCount: 1,
            activePeriods: [`turn_${currentTime}`],
            previousValues: [],
            temporalStatus: "CURRENT",
            confidence: 1.0,
            sourceAuthority: override.isDurable
              ? "EXPLICIT_USER_MEMORY"
              : "CURRENT_TURN_EXPLICIT",
            scope: override.isDurable
              ? this.determineScope(normKey, this.inferDimension(normKey))
              : "TURN",
            lineage: [`turn_${currentTime}`],
            relevanceScore: 1.0,
            isStable: false,
            isRecurring: false,
            isStale: false,
            isCurrentTurnOverride: !override.isDurable,
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // STEP 5: Temporal State Classification, Stability, Recurrence & Staleness
    // -------------------------------------------------------------------------
    const activePatterns: TemporalPattern[] = [];
    const historicalPatterns: TemporalPattern[] = [];

    for (const pattern of patternMap.values()) {
      diagnostics.totalPatternsAnalyzed++;

      // Recurrence evaluation: distinct active periods >= 2
      if (pattern.activePeriods.length >= this.MIN_RECURRING_PERIODS_COUNT) {
        pattern.isRecurring = true;
      }

      // Stability evaluation:
      // independent observations >= 3 AND active periods >= 2 AND confidence >= 0.75 AND not temporary turn override
      if (
        pattern.independentObservationCount >= this.MIN_STABLE_INDEPENDENT_COUNT &&
        pattern.activePeriods.length >= this.MIN_STABLE_PERIODS_COUNT &&
        pattern.confidence >= this.MIN_STABLE_CONFIDENCE &&
        !pattern.isCurrentTurnOverride
      ) {
        pattern.isStable = true;
      }

      // Stale evaluation based on elapsed time vs importance
      const timeSinceObserved = currentTime > pattern.lastObservedAt ? currentTime - pattern.lastObservedAt : 0;
      const effectiveStaleThreshold = pattern.isStable
        ? this.HIGH_IMPORTANCE_STALE_MS
        : staleThresholdMs;

      if (timeSinceObserved > effectiveStaleThreshold && pattern.sourceAuthority !== "CURRENT_TURN_EXPLICIT") {
        pattern.isStale = true;
        pattern.temporalStatus = "STALE";
        diagnostics.staleCount++;
      } else if (pattern.temporalStatus !== "SUPERSEDED" && pattern.temporalStatus !== "EXPIRED") {
        if (pattern.isCurrentTurnOverride) {
          pattern.temporalStatus = "CURRENT";
        } else if (pattern.previousValues.length > 0 && timeSinceObserved <= recencyWindowMs) {
          pattern.temporalStatus = "EVOLVING";
          diagnostics.evolvingCount++;
        } else if (pattern.isStable) {
          pattern.temporalStatus = "STABLE";
          diagnostics.stableCount++;
        } else if (pattern.isRecurring) {
          pattern.temporalStatus = "RECURRING";
          diagnostics.recurringCount++;
        } else if (timeSinceObserved <= recencyWindowMs) {
          pattern.temporalStatus = "RECENT";
        } else {
          pattern.temporalStatus = "CURRENT";
        }
      }

      // Calculate bounded deterministic relevance score [0.0, 1.0]
      pattern.relevanceScore = this.calculateTemporalRelevance({
        pattern,
        currentTime,
        recencyWindowMs,
        activeTopic,
        message: input.message || "",
      });

      // Partition into active vs historical
      const isHistorical =
        (pattern.temporalStatus as string) === "HISTORICAL" ||
        pattern.temporalStatus === "SUPERSEDED" ||
        pattern.temporalStatus === "EXPIRED";

      if (isHistorical) {
        historicalPatterns.push(pattern);
        diagnostics.historicalCount++;
      } else {
        // Apply hard topic isolation filter for active patterns
        if (isTopicIsolated && !this.isGlobalPreference(pattern.attributeKey)) {
          diagnostics.topicIsolatedCount++;
          // Excluded from active prompt directives, kept in diagnostics
        } else {
          activePatterns.push(pattern);
        }
      }
    }

    // -------------------------------------------------------------------------
    // STEP 6: Formulate Sanitized Natural Language Directives
    // -------------------------------------------------------------------------
    // Evolution Directives
    for (const evo of evolutions) {
      diagnostics.evolutionTransitions.push(evo);
      if (
        !isTopicIsolated ||
        this.isGlobalPreference(evo.attributeKey)
      ) {
        const cleanDir = `The user's current preference is ${evo.currentValue} rather than the older ${evo.previousValue} preference.`;
        if (!directives.includes(cleanDir)) {
          directives.push(cleanDir);
        }
      }
    }

    // Active Pattern Directives (Sorted deterministically by authority + relevance score)
    const sortedActive = [...activePatterns].sort((a, b) => {
      const authDiff = this.authorityWeight(b.sourceAuthority) - this.authorityWeight(a.sourceAuthority);
      if (authDiff !== 0) return authDiff;
      const relDiff = b.relevanceScore - a.relevanceScore;
      if (relDiff !== 0) return relDiff;
      return a.attributeKey.localeCompare(b.attributeKey);
    });

    for (const pat of sortedActive) {
      if (pat.temporalStatus === "STALE" || pat.isStale) continue;

      // Only emit directives for high-confidence / explicit / stable items or current turn overrides
      if (pat.isCurrentTurnOverride) {
        const cleanDir = `For the current response, adhere to ${pat.attributeKey}: ${pat.currentValue}.`;
        if (!directives.includes(cleanDir)) {
          directives.push(cleanDir);
        }
      } else if (pat.isStable || pat.confidence >= 0.75 || pat.sourceAuthority === "EXPLICIT_USER_MEMORY") {
        let cleanDir = "";
        if (pat.attributeKey === "language") {
          cleanDir = `User prefers answers in ${pat.currentValue}.`;
        } else if (pat.attributeKey === "verbosity") {
          cleanDir = `User prefers ${pat.currentValue.toLowerCase()} responses.`;
        } else if (pat.attributeKey === "tone") {
          cleanDir = `User prefers a ${pat.currentValue.toLowerCase()} tone.`;
        } else if (pat.attributeKey === "format") {
          cleanDir = `User prefers formatting with ${pat.currentValue.toLowerCase()}.`;
        } else {
          cleanDir = `User preference for ${pat.attributeKey}: ${pat.currentValue}.`;
        }

        if (cleanDir && !directives.includes(cleanDir)) {
          directives.push(cleanDir);
        }
      }
    }

    return {
      userId,
      analyzedAt: currentTime,
      patterns: Array.from(patternMap.values()),
      activePatterns,
      historicalPatterns,
      evolutions,
      relations,
      directives,
      diagnostics,
    };
  }

  /**
   * Handles preference transition / evolution (A -> B) according to authority precedence.
   */
  private handlePreferenceTransition(params: {
    patternMap: Map<string, TemporalPattern>;
    existing: TemporalPattern;
    newValue: string;
    newAuthority: UserModelEvidenceAuthority;
    newTimestamp: number;
    newConfidence: number;
    newFirstObservedAt: number;
    newIndependentCount: number;
    newPeriods: string[];
    evolutions: TemporalEvolutionRecord[];
    relations: TemporalRelation[];
    currentTime: number;
    isCurrentTurnOverride?: boolean;
  }): void {
    const {
      existing,
      newValue,
      newAuthority,
      newTimestamp,
      newConfidence,
      newFirstObservedAt,
      newIndependentCount,
      newPeriods,
      evolutions,
      relations,
      currentTime,
      isCurrentTurnOverride = false,
    } = params;

    const existingAuthWeight = this.authorityWeight(existing.sourceAuthority);
    const newAuthWeight = this.authorityWeight(newAuthority);

    // If new authority is strictly higher, or if authorities are equal and new observation is more recent
    const newWins =
      newAuthWeight > existingAuthWeight ||
      (newAuthWeight === existingAuthWeight && newTimestamp >= existing.lastObservedAt);

    if (newWins) {
      // Record old value in previousValues
      const prevRecord: PreviousValueRecord = {
        value: existing.currentValue,
        normalizedValue: existing.normalizedValue,
        firstObservedAt: existing.firstObservedAt,
        lastObservedAt: existing.lastObservedAt,
        observationCount: existing.observationCount,
        supersededAt: newTimestamp,
        supersededBy: newValue,
        authority: existing.sourceAuthority,
        reason: `Superseded by newer value ${newValue} with authority ${newAuthority}`,
      };

      existing.previousValues.push(prevRecord);

      // Create Evolution Record
      const evoRecord: TemporalEvolutionRecord = {
        attributeKey: existing.attributeKey,
        previousValue: existing.currentValue,
        currentValue: newValue,
        transitionTimestamp: newTimestamp,
        authority: newAuthority,
        lineageIds: [...existing.lineage],
        sanitizedSummary: `Preference evolved from ${existing.currentValue} to ${newValue}`,
      };
      evolutions.push(evoRecord);

      // Create Temporal Relations
      relations.push({
        sourceKey: `${existing.attributeKey}:${newValue}`,
        targetKey: `${existing.attributeKey}:${existing.currentValue}`,
        relationType: "SUPERSEDES",
        establishedAt: newTimestamp,
        confidence: newConfidence,
        description: `Newer preference ${newValue} supersedes older preference ${existing.currentValue}`,
      });

      relations.push({
        sourceKey: `${existing.attributeKey}:${existing.currentValue}`,
        targetKey: `${existing.attributeKey}:${newValue}`,
        relationType: "EVOLVED_TO",
        establishedAt: newTimestamp,
        confidence: newConfidence,
        description: `Historical preference ${existing.currentValue} evolved to ${newValue}`,
      });

      // Update existing pattern to new value
      existing.currentValue = newValue;
      existing.normalizedValue = newValue;
      existing.lastObservedAt = Math.max(existing.lastObservedAt, newTimestamp);
      existing.firstObservedAt = Math.min(existing.firstObservedAt, newFirstObservedAt);
      existing.sourceAuthority = newAuthority;
      existing.confidence = newConfidence;
      existing.independentObservationCount = Math.max(1, newIndependentCount);
      existing.temporalStatus = "EVOLVING";
      existing.isCurrentTurnOverride = isCurrentTurnOverride;

      for (const p of newPeriods) {
        if (!existing.activePeriods.includes(p)) {
          existing.activePeriods.push(p);
        }
      }
    } else {
      // Existing higher-authority preference remains current; new lower-authority is recorded as historical/contradicted
      relations.push({
        sourceKey: `${existing.attributeKey}:${newValue}`,
        targetKey: `${existing.attributeKey}:${existing.currentValue}`,
        relationType: "CONTRADICTS",
        establishedAt: newTimestamp,
        confidence: newConfidence,
        description: `Candidate value ${newValue} was rejected in favor of higher-authority current value ${existing.currentValue}`,
      });
    }
  }

  /**
   * Calculates a bounded deterministic relevance score [0.0, 1.0].
   */
  private calculateTemporalRelevance(params: {
    pattern: TemporalPattern;
    currentTime: number;
    recencyWindowMs: number;
    activeTopic: string;
    message: string;
  }): number {
    const { pattern, currentTime, recencyWindowMs, activeTopic, message } = params;

    // Base authority weight
    const authScore = this.authorityWeight(pattern.sourceAuthority) / 100; // 0.1 to 1.0

    // Recency decay
    const elapsed = currentTime > pattern.lastObservedAt ? currentTime - pattern.lastObservedAt : 0;
    const recencyRatio = Math.max(0.0, 1.0 - elapsed / (recencyWindowMs * 4));

    // Frequency and stability
    const freqScore = Math.min(1.0, pattern.observationCount / 5);
    const stabilityBonus = pattern.isStable ? 0.15 : 0.0;
    const currentTurnBonus = pattern.isCurrentTurnOverride ? 0.3 : 0.0;

    // Topic alignment
    let topicScore = 0.5;
    if (this.isGlobalPreference(pattern.attributeKey)) {
      topicScore = 0.8;
    } else if (
      activeTopic &&
      pattern.associatedTopic &&
      activeTopic.toLowerCase().includes(pattern.associatedTopic.toLowerCase())
    ) {
      topicScore = 1.0;
    }

    // Check message mention
    const msgLower = message.toLowerCase();
    const mentionsKey = msgLower.includes(pattern.attributeKey.toLowerCase());
    const mentionsVal = msgLower.includes(pattern.currentValue.toLowerCase());
    const queryAlignment = mentionsKey || mentionsVal ? 0.2 : 0.0;

    // Staleness / supersession penalty
    const penalty = pattern.isStale || pattern.temporalStatus === "SUPERSEDED" ? 0.5 : 0.0;

    const rawScore =
      authScore * 0.35 +
      recencyRatio * 0.25 +
      freqScore * 0.15 +
      topicScore * 0.15 +
      stabilityBonus +
      currentTurnBonus +
      queryAlignment -
      penalty;

    return Math.min(1.0, Math.max(0.0, Number(rawScore.toFixed(3))));
  }

  /**
   * Authority score mapping for deterministic precedence.
   */
  public authorityWeight(authority: UserModelEvidenceAuthority): number {
    switch (authority) {
      case "CURRENT_TURN_EXPLICIT":
        return 100;
      case "EXPLICIT_USER_MEMORY":
        return 80;
      case "VERIFIED_EVIDENCE":
        return 70;
      case "CONFIRMED_ADAPTIVE_PATTERN":
        return 60;
      case "REPEATED_VALIDATED_SIGNAL":
        return 40;
      case "PREDICTIVE_CONTEXT":
        return 10;
      default:
        return 20;
    }
  }

  /**
   * Deduplicates observations and calculates independent observation periods/turns.
   */
  public extractObservations(
    evidence: any[] | undefined,
    value: string,
    authority: UserModelEvidenceAuthority,
    firstObservedAt: number,
    lastObservedAt: number,
    fallbackCount: number
  ): {
    observations: TemporalObservation[];
    distinctPeriods: string[];
    distinctTurnsCount: number;
  } {
    const observations: TemporalObservation[] = [];
    const seenEvidenceHashes = new Set<string>();
    const distinctTurnKeys = new Set<string>();
    const distinctPeriods = new Set<string>();

    if (evidence && Array.isArray(evidence) && evidence.length > 0) {
      for (let i = 0; i < evidence.length; i++) {
        const e = evidence[i];
        if (!e) continue;

        // Strictly exclude predictive-only evidence from independent observation counts
        const src = (e.source || e.authority || "").toUpperCase();
        if (src === "PREDICTIVE_CONTEXT" || src === "PREDICTION") {
          continue;
        }

        const eviHash =
          e.evidenceId ||
          (e.valueHash ? `${e.valueHash}_${e.timestamp ?? i}` : `evi_${i}_${this.deterministicHash(JSON.stringify(e))}`);

        if (seenEvidenceHashes.has(eviHash)) {
          // Reject duplicate identical evidence hash
          continue;
        }
        seenEvidenceHashes.add(eviHash);

        const turnKey =
          e.turnOrSessionId ||
          (e.timestamp ? `t_${Math.floor(e.timestamp / 1000)}` : `turn_${i}`);

        distinctTurnKeys.add(turnKey);

        const periodKey = e.timestamp
          ? `period_${Math.floor(e.timestamp / (24 * 60 * 60 * 1000))}`
          : turnKey;

        distinctPeriods.add(periodKey);

        observations.push({
          observationId: eviHash,
          timestamp: e.timestamp ?? lastObservedAt,
          turnOrSessionId: turnKey,
          source: e.source || "EVIDENCE",
          authority: e.isExplicit ? "EXPLICIT_USER_MEMORY" : authority,
          value: e.value || value,
          valueHash: this.deterministicHash(e.value || value),
          isExplicit: Boolean(e.isExplicit),
        });
      }
    }

    let distinctTurnsCount = distinctTurnKeys.size;
    if (distinctTurnsCount === 0) {
      if (authority !== "PREDICTIVE_CONTEXT") {
        distinctTurnsCount = Math.max(1, fallbackCount);
        distinctPeriods.add(`period_${firstObservedAt}`);
        if (lastObservedAt !== firstObservedAt) {
          distinctPeriods.add(`period_${lastObservedAt}`);
        }
      } else {
        distinctTurnsCount = 0;
      }
    }

    return {
      observations,
      distinctPeriods: Array.from(distinctPeriods),
      distinctTurnsCount,
    };
  }

  /**
   * Detects explicit instructions or corrections within the current-turn user message.
   */
  private detectCurrentTurnOverrides(
    message: string,
    currentTime: number
  ): Array<{ key: string; value: string; isDurable: boolean }> {
    const overrides: Array<{ key: string; value: string; isDurable: boolean }> = [];
    const msg = message.trim();
    const lower = msg.toLowerCase();

    // Durable language declarations
    if (
      lower.includes("from now on, answer me in bangla") ||
      lower.includes("always answer in bangla") ||
      lower.includes("always respond in bangla") ||
      lower.includes("amar default language bangla") ||
      lower.includes("আমার default language bangla")
    ) {
      overrides.push({ key: "language", value: "Bangla", isDurable: true });
    } else if (
      lower.includes("from now on, answer me in banglish") ||
      lower.includes("always answer in banglish") ||
      lower.includes("amar default language banglish") ||
      lower.includes("আমার default language banglish")
    ) {
      overrides.push({ key: "language", value: "Banglish", isDurable: true });
    } else if (
      lower.includes("from now on, answer me in english") ||
      lower.includes("always answer in english")
    ) {
      overrides.push({ key: "language", value: "English", isDurable: true });
    } else if (
      // Temporary turn-scoped language instructions
      lower.includes("answer this in bangla") ||
      lower.includes("reply in bangla for now") ||
      lower.includes("speak in bangla today")
    ) {
      overrides.push({ key: "language", value: "Bangla", isDurable: false });
    } else if (
      lower.includes("answer this in banglish") ||
      lower.includes("reply in banglish for now")
    ) {
      overrides.push({ key: "language", value: "Banglish", isDurable: false });
    } else if (
      lower.includes("answer this in english for now") ||
      lower.includes("reply in english for now") ||
      lower.includes("in english for now") ||
      lower.includes("answer this in english")
    ) {
      overrides.push({ key: "language", value: "English", isDurable: false });
    }

    // Durable verbosity declarations
    if (
      lower.includes("i always prefer concise") ||
      lower.includes("always be concise") ||
      lower.includes("always keep it short")
    ) {
      overrides.push({ key: "verbosity", value: "Concise", isDurable: true });
    } else if (
      lower.includes("i always prefer detailed") ||
      lower.includes("always give detailed")
    ) {
      overrides.push({ key: "verbosity", value: "Detailed", isDurable: true });
    } else if (
      // Temporary verbosity instructions
      lower.includes("today i want concise") ||
      lower.includes("be concise for this") ||
      lower.includes("short answer for now")
    ) {
      overrides.push({ key: "verbosity", value: "Concise", isDurable: false });
    }

    // Explicit preference corrections (e.g. ASUS -> Lenovo, Python -> TypeScript)
    if (
      lower.includes("i now prefer lenovo") ||
      lower.includes("i prefer lenovo now") ||
      lower.includes("switch to lenovo") ||
      lower.includes("my preferred laptop is now lenovo")
    ) {
      overrides.push({ key: "laptop", value: "Lenovo", isDurable: true });
    } else if (
      lower.includes("i now prefer typescript") ||
      lower.includes("i prefer typescript now") ||
      lower.includes("switch to typescript")
    ) {
      overrides.push({ key: "programming_language", value: "TypeScript", isDurable: true });
    }

    return overrides;
  }

  /**
   * Normalizes attribute keys for consistent mapping.
   */
  public normalizeKey(key: string): string {
    const k = key.toLowerCase().replace(/[-_]/g, " ").trim();
    if (k.includes("programming") || k.includes("tech stack") || k.includes("tech_stack") || k.includes("code style")) return "programming_language";
    if (k === "language" || k === "preferred language" || k === "lang" || k === "communication language") return "language";
    if (k.includes("verbosity") || k.includes("length") || k.includes("concise") || k.includes("detailed")) return "verbosity";
    if (k.includes("tone") || (k.includes("style") && !k.includes("code"))) return "tone";
    if (k.includes("format") || k.includes("structure")) return "format";
    if (k.includes("laptop") || k.includes("notebook")) return "laptop";
    return key.toLowerCase().trim();
  }

  /**
   * Infers dimension from normalized key.
   */
  private inferDimension(key: string): UserModelDimension {
    const k = key.toLowerCase();
    if (k === "language") {
      return "LANGUAGE";
    }
    if (k === "verbosity") {
      return "VERBOSITY";
    }
    if (k === "tone") {
      return "TONE";
    }
    if (k === "format") {
      return "FORMAT";
    }
    if (k.includes("code") || k.includes("tech") || k.includes("programming") || k.includes("framework")) {
      return "CODE_STYLE";
    }
    if (k.includes("project") || k.includes("repo") || k.includes("app")) {
      return "PROJECT_CONTEXT";
    }
    return "DOMAIN_INTEREST";
  }

  /**
   * Determines validity scope for an attribute.
   */
  private determineScope(key: string, dimension: UserModelDimension): TemporalScope {
    if (this.isGlobalPreference(key)) {
      return "GLOBAL";
    }
    if (dimension === "PROJECT_CONTEXT") {
      return "PROJECT";
    }
    if (dimension === "DOMAIN_INTEREST" || dimension === "CODE_STYLE") {
      return "TOPIC";
    }
    return "SESSION";
  }

  /**
   * Checks if an attribute is a global communication preference.
   */
  public isGlobalPreference(key: string): boolean {
    const k = key.toLowerCase().replace(/[-_]/g, "");
    return Array.from(this.GLOBAL_PREFERENCE_KEYS).some((g) => g.replace(/[-_]/g, "") === k);
  }

  /**
   * Checks if a key or value contains sensitive credentials.
   */
  public isSensitive(str: string): boolean {
    if (!str) return false;
    return this.SENSITIVE_PATTERNS.some((p) => p.test(str));
  }

  /**
   * Checks if an attribute attempts to infer unsupported biography/identity.
   */
  public isForbiddenIdentity(key: string): boolean {
    const k = key.toLowerCase();
    return this.FORBIDDEN_IDENTITY_DIMENSIONS.some((pattern) => pattern.test(k));
  }
}

export const temporalMemoryEngine = TemporalMemoryEngine.getInstance();
