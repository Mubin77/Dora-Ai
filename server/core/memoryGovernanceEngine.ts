/**
 * Dora Memory Governance & Response Integration Engine
 * Phase 2 — Step 4
 * 
 * Deterministically decides which retrieved memories are safe, appropriate,
 * relevant, and sufficiently trustworthy to influence the final response, and
 * how they may be exposed to downstream response generation.
 * 
 * Pipeline Stage:
 * ContextEngine -> IntentEngine -> ReasoningEngine -> PlanningEngine -> 
 * VerificationEngine -> MemoryDecisionEngine -> MemoryRetrievalEngine -> 
 * MemoryConsolidationEngine -> MemoryGovernanceEngine -> BrainEngine Directives
 */

import {
  MemoryRecord,
  MemoryType,
  MemorySource,
  MemoryStatus,
} from "./memoryTypes";
import {
  MemoryCandidate,
  MemoryRetrievalAnalysis,
} from "./memoryRetrievalTypes";
import {
  MemoryUsageDecision,
  MemoryUsageReason,
  MemoryGovernanceCandidate,
  MemoryConflictGovernance,
  MemoryPrivacyBlock,
  MemoryGovernanceInput,
  MemoryGovernanceAnalysis,
} from "./memoryGovernanceTypes";

export class MemoryGovernanceEngine {
  private static instance: MemoryGovernanceEngine;

  private constructor() {}

  public static getInstance(): MemoryGovernanceEngine {
    if (!MemoryGovernanceEngine.instance) {
      MemoryGovernanceEngine.instance = new MemoryGovernanceEngine();
    }
    return MemoryGovernanceEngine.instance;
  }

  // Sensitive patterns regex: passwords, API keys, bearer tokens, credit cards, CVVs, pins
  private sensitivePatterns = [
    /\b(?:password|passwd|pin|cvv|secret_key|api_key|token|auth_token|bearer)\s*[:=]\s*\S+/i,
    /\b(?:sk-[a-zA-Z0-9_\-]{16,}|ghp_[a-zA-Z0-9]{20,}|eyJ[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,})\b/i,
    /\b(?:\d{4}[ -]?){3}\d{4}\b/, // Credit card numbers
    /\b\d{3,4}\b.*?(?:cvv|cvc|security code)/i,
    /\b(?:cvv|cvc)\s*[:=]?\s*\d{3,4}\b/i,
    /\b(?:bank account|routing number|iban)\s*[:=]?\s*[A-Z0-9]+/i,
  ];

  // Explicit memory recall phrasing regex (English, Banglish, Bangla)
  private explicitRecallRegex =
    /\b(?:do you remember|remember when|what did i (?:say|tell you)|recall (?:my|that)|what is my (?:favorite|preferred|budget|goal|name|hobby|editor|fruit|laptop|phone)|what do you know about my|what was my|tell me (?:about )?my|(?:what|which)\s+(?:\w+\s+)?(?:do|did) i (?:use|like|prefer|have|own|want|say))\b|\b(?:amar|amr)\s+(?:budget|preference|pochondo|kotha|laptop|phone|brand|goal|name|shob|sob|editor|fruit).*?(?:mone\s*ache|mone\s*ase|mone\s*rakhso|jan(?:o)?)\b|\b(?:ami\s+age\s+ki\s+bolechilam|mone\s+ache\s+ki|ager\s+kotha\s+mone\s+ache)\b|[আা]গে\s+আমি\s+কী\s+বলেছিলাম|মনে\s*আছে|আমার\s+পছন্দ|আমার\s+বাজেট/i;

  /**
   * Main evaluation entry point for Memory Governance & Response Integration
   */
  public evaluate(input: MemoryGovernanceInput): MemoryGovernanceAnalysis {
    const startTime = 0; // Deterministic execution time tracking
    const {
      context,
      intent,
      reasoning,
      planning,
      verification,
      retrieval,
      consolidation,
      message = "",
      options,
    } = input;

    const trimmedMsg = message.trim();
    const currentTime = options?.currentTime ?? 0;

    // 1. Detect explicit memory recall reference
    const explicitReferenceDetected =
      Boolean(retrieval?.isExplicitRequest) ||
      intent?.primaryIntent === "MEMORY_RECALL" ||
      this.explicitRecallRegex.test(trimmedMsg);

    const candidates = Array.isArray(retrieval?.retrievedMemories)
      ? retrieval.retrievedMemories
      : [];

    // 2. Fast Path Check: Casual conversation without explicit recall & without planning/reasoning
    const isCasual =
      intent?.primaryIntent === "CASUAL_CONVERSATION" &&
      !explicitReferenceDetected &&
      !reasoning?.reasoningRequired &&
      !planning?.requiresPlanning &&
      !verification?.verificationRequired;

    if (candidates.length === 0 && !explicitReferenceDetected) {
      return {
        governanceRequired: false,
        memoryInfluenceAllowed: false,
        allowedMemories: [],
        cautiousMemories: [],
        internalOnlyMemories: [],
        suppressedMemories: [],
        governedCandidates: [],
        conflicts: [],
        privacyBlocks: [],
        topicIsolationApplied: false,
        explicitReferenceDetected: false,
        directives: [],
        sanitizedMemoryContext: "",
        governanceConfidence: 1.0,
        executionTimeMs: 0,
      };
    }

    if (isCasual && candidates.length > 0) {
      // Casual talk should not unnecessarily inject memories
      const governedCandidates: MemoryGovernanceCandidate[] = candidates.map((cand) =>
        this.createGovernedCandidate(
          cand,
          "INTERNAL_ONLY",
          ["INTENT_MISMATCH"],
          0.3,
          false,
          false,
          false,
          "Casual conversation intent does not require active memory injection"
        )
      );

      return {
        governanceRequired: true,
        memoryInfluenceAllowed: false,
        allowedMemories: [],
        cautiousMemories: [],
        internalOnlyMemories: governedCandidates,
        suppressedMemories: [],
        governedCandidates,
        conflicts: [],
        privacyBlocks: [],
        topicIsolationApplied: false,
        explicitReferenceDetected: false,
        directives: [],
        sanitizedMemoryContext: "",
        governanceConfidence: 0.95,
        executionTimeMs: 0,
      };
    }

    // 3. Multi-Gate Governance Pipeline
    const allowedMemories: MemoryGovernanceCandidate[] = [];
    const cautiousMemories: MemoryGovernanceCandidate[] = [];
    const internalOnlyMemories: MemoryGovernanceCandidate[] = [];
    const suppressedMemories: MemoryGovernanceCandidate[] = [];
    const governedCandidates: MemoryGovernanceCandidate[] = [];
    const privacyBlocks: MemoryPrivacyBlock[] = [];
    const conflicts: MemoryConflictGovernance[] = [];
    const directives: string[] = [];
    let topicIsolationApplied = false;

    // Build active context constraints and current turn corrections map
    const activeConstraints = context?.constraints?.filter((c) => !c.isOverridden) || [];
    const currentTopic = (context?.activeTopic || "").toLowerCase();
    const isTopicSwitched = Boolean(context?.isTopicSwitched);

    // Track evaluated keys for conflict governance
    const keyCandidatesMap = new Map<string, MemoryCandidate[]>();
    for (const cand of candidates) {
      const key = cand.memory?.key || cand.category || "general";
      if (!keyCandidatesMap.has(key)) {
        keyCandidatesMap.set(key, []);
      }
      keyCandidatesMap.get(key)!.push(cand);
    }

    // Evaluate each candidate deterministically through all sequential gates
    for (const cand of candidates) {
      const mem = cand.memory;
      const key = mem?.key || cand.category || "unknown_key";
      const value = mem?.value || cand.content || "";
      const reasons: MemoryUsageReason[] = [];
      let decision: MemoryUsageDecision = "ALLOW";
      let usageScore = cand.relevanceScore || 0.8;
      let canPersonalize = true;
      let canSupportFactualClaim = false; // FIX #2: Default-deny factual claim authority
      let requiresExplicitAttribution = false;
      let isCandidateInferred = mem?.type === "CANDIDATE" || cand.isLowConfidenceInferred === true;
      let notes = "";

      // -------------------------------------------------------------------
      // GATE 1: PRIVACY GATE (Absolute Priority — Never Bypassed)
      // -------------------------------------------------------------------
      const isSensitive =
        mem?.isQuarantined ||
        this.isSensitiveData(key, value) ||
        Boolean(cand.memory?.tags?.includes("sensitive"));

      if (isSensitive) {
        decision = "SUPPRESS";
        reasons.push("SENSITIVE_DATA");
        if (mem?.isQuarantined) reasons.push("QUARANTINED_MEMORY");
        canPersonalize = false;
        canSupportFactualClaim = false;
        usageScore = 0.0;
        notes = "Sensitive authentication or private credential data blocked by Privacy Gate.";

        privacyBlocks.push({
          memoryId: cand.memoryId || mem?.id || "unknown",
          key,
          reason: "Sensitive credentials, tokens, or financial data detected",
          redactedPattern: "[REDACTED_SENSITIVE_DATA]",
        });

        const sensitiveDirective = "MEMORY SAFETY: Sensitive memory was blocked and must not be exposed.";
        if (!directives.includes(sensitiveDirective)) {
          directives.push(sensitiveDirective);
        }

        const governed = this.createGovernedCandidate(
          cand,
          decision,
          reasons,
          usageScore,
          canPersonalize,
          canSupportFactualClaim,
          requiresExplicitAttribution,
          notes,
          "[REDACTED_SENSITIVE_DATA]"
        );
        suppressedMemories.push(governed);
        governedCandidates.push(governed);
        continue; // Privacy violation halts further evaluation for this candidate
      }

      // -------------------------------------------------------------------
      // GATE 2: LIFECYCLE GATE
      // -------------------------------------------------------------------
      const status = mem?.status || cand.status || "ACTIVE";

      if (status === "DELETED") {
        decision = "SUPPRESS";
        reasons.push("DELETED_MEMORY");
        canPersonalize = false;
        canSupportFactualClaim = false;
        notes = "Memory is marked DELETED";
      } else if (status === "EXPIRED" || (mem?.expiresAt && mem.expiresAt <= currentTime)) {
        decision = "SUPPRESS";
        reasons.push("EXPIRED_MEMORY");
        canPersonalize = false;
        canSupportFactualClaim = false;
        notes = "Temporary memory has expired";
      } else if (status === "SUPERSEDED") {
        decision = "SUPPRESS";
        reasons.push("SUPERSEDED_MEMORY");
        canPersonalize = false;
        canSupportFactualClaim = false;
        notes = "Memory was superseded by a newer record";
      } else if (status === "ARCHIVED") {
        decision = "SUPPRESS";
        reasons.push("ARCHIVED_MEMORY");
        canPersonalize = false;
        canSupportFactualClaim = false;
        notes = "Archived memory suppressed by default";
      } else if (status === "OUTDATED") {
        if (explicitReferenceDetected) {
          decision = "ALLOW_WITH_CAUTION";
          reasons.push("STALE_MEMORY", "EXPLICIT_REFERENCE");
          requiresExplicitAttribution = true;
          canSupportFactualClaim = false;
          notes = "Historical memory allowed with caution due to explicit user recall query";
        } else {
          decision = "SUPPRESS";
          reasons.push("STALE_MEMORY");
          canPersonalize = false;
          canSupportFactualClaim = false;
          notes = "Outdated memory suppressed in active turn";
        }
      } else if (status === "CANDIDATE" || mem?.type === "CANDIDATE") {
        // CANDIDATE memories must NEVER be presented as confirmed facts
        isCandidateInferred = true;
        canSupportFactualClaim = false;
        requiresExplicitAttribution = true;
        reasons.push("CANDIDATE_UNCERTAIN");

        if (cand.confidence < 0.65) {
          decision = "INTERNAL_ONLY";
          notes = "Low-confidence candidate kept internal";
        } else {
          decision = "ALLOW_WITH_CAUTION";
          notes = "Candidate memory allowed with caution as inferred interest";
        }

        const candidateDirective = `MEMORY USAGE: Inferred candidate interest exists for "${key}" (${value}) but is not confirmed. Do not present it as an established fact.`;
        if (!directives.includes(candidateDirective)) {
          directives.push(candidateDirective);
        }
      }

      if (decision === "SUPPRESS") {
        const governed = this.createGovernedCandidate(
          cand,
          decision,
          reasons,
          0.0,
          canPersonalize,
          canSupportFactualClaim,
          requiresExplicitAttribution,
          notes
        );
        suppressedMemories.push(governed);
        governedCandidates.push(governed);
        continue;
      }

      // -------------------------------------------------------------------
      // GATE 3: CURRENT TURN CORRECTION & VERIFICATION PRECEDENCE GATE
      // -------------------------------------------------------------------
      // Check if current context constraints or active corrections override memory
      const matchingConstraint = activeConstraints.find((c) => {
        const cKey = (c.key || "").toLowerCase();
        const mKey = key.toLowerCase();
        return cKey.includes(mKey) || mKey.includes(cKey);
      });

      if (matchingConstraint && matchingConstraint.value !== value) {
        // Current user stated constraint or correction takes precedence over old memory
        decision = "SUPPRESS";
        reasons.push("HARD_CONSTRAINT_OVERRIDDEN");
        canPersonalize = false;
        canSupportFactualClaim = false;
        notes = `Current turn active constraint "${matchingConstraint.value}" overrides historical memory "${value}"`;

        const governed = this.createGovernedCandidate(
          cand,
          decision,
          reasons,
          0.0,
          canPersonalize,
          canSupportFactualClaim,
          requiresExplicitAttribution,
          notes
        );
        suppressedMemories.push(governed);
        governedCandidates.push(governed);
        continue;
      }

      // Check verification evidence / real-time tools precedence
      if (
        intent?.primaryIntent === "REAL_TIME_INFORMATION" ||
        intent?.primaryIntent === "TOOL_ACTION"
      ) {
        if (mem?.type === "FACT" || mem?.type === "TEMPORARY") {
          // Live tools are authoritative for real-time queries; old remembered facts must not substitute live info
          canSupportFactualClaim = false;
          decision = "INTERNAL_ONLY";
          reasons.push("VERIFIED_EVIDENCE_OVERRIDDEN", "INTENT_MISMATCH");
          notes = "Real-time queries rely on verified live tool data, not historical memory records.";
        }
      }

      // -------------------------------------------------------------------
      // GATE 4: TOPIC & TASK ISOLATION GATE
      // -------------------------------------------------------------------
      const isGlobalStablePreference =
        key === "language" ||
        key === "preferred_language" ||
        key.startsWith("preference_ui") ||
        key.startsWith("preference_language") ||
        key.startsWith("user_name") ||
        cand.category === "COMMUNICATION_STYLE" ||
        mem?.tags?.includes("COMMUNICATION_STYLE") ||
        mem?.type === "PERSONALIZATION" ||
        mem?.tags?.includes("global_profile");

      if (isTopicSwitched && !explicitReferenceDetected && !isGlobalStablePreference) {
        const memTopic = (cand.category || mem?.tags?.[0] || "").toLowerCase();
        const msgText = trimmedMsg.toLowerCase();

        // Check if memory topic is completely irrelevant to the new turn
        const hasTopicRelevance =
          (currentTopic && memTopic && (currentTopic.includes(memTopic) || memTopic.includes(currentTopic))) ||
          (mem?.key && msgText.includes(mem.key.replace(/_/g, " "))) ||
          (value && msgText.includes(value.toLowerCase()));

        if (!hasTopicRelevance) {
          decision = "SUPPRESS";
          reasons.push("TOPIC_MISMATCH");
          topicIsolationApplied = true;
          canPersonalize = false;
          canSupportFactualClaim = false;
          notes = `Topic switch detected from previous domain; isolated domain memory "${key}" suppressed.`;

          const governed = this.createGovernedCandidate(
            cand,
            decision,
            reasons,
            0.0,
            canPersonalize,
            canSupportFactualClaim,
            requiresExplicitAttribution,
            notes
          );
          suppressedMemories.push(governed);
          governedCandidates.push(governed);
          continue;
        }
      }

      // -------------------------------------------------------------------
      // GATE 5: CONFLICT GOVERNANCE GATE
      // -------------------------------------------------------------------
      const siblingCandidates = keyCandidatesMap.get(key) || [];
      if (siblingCandidates.length > 1) {
        const activeSiblings = siblingCandidates.filter(
          (s) => (s.memory?.status || s.status) === "ACTIVE" && (s.memory?.value || s.content) !== value
        );

        if (activeSiblings.length > 0) {
          // Conflict detected among multiple active memories for same key
          const highestTimestamp = Math.max(
            cand.createdAt || 0,
            ...activeSiblings.map((s) => s.createdAt || 0)
          );
          const isLatest = (cand.createdAt || 0) >= highestTimestamp;
          const isExplicitSource = mem?.source === "EXPLICIT_USER";

          if (!isLatest && !isExplicitSource) {
            decision = "SUPPRESS";
            reasons.push("CONFLICTING_MEMORY", "SUPERSEDED_MEMORY");
            canPersonalize = false;
            canSupportFactualClaim = false;
            notes = "Superseded by newer conflicting active memory during conflict governance.";

            const governed = this.createGovernedCandidate(
              cand,
              decision,
              reasons,
              0.0,
              canPersonalize,
              canSupportFactualClaim,
              requiresExplicitAttribution,
              notes
            );
            suppressedMemories.push(governed);
            governedCandidates.push(governed);
            continue;
          } else if (cand.confidence < 0.9 && activeSiblings.some((s) => s.confidence >= 0.9)) {
            decision = "SUPPRESS";
            reasons.push("CONFLICTING_MEMORY");
            notes = "Lower confidence conflicting memory suppressed.";

            const governed = this.createGovernedCandidate(
              cand,
              decision,
              reasons,
              0.0,
              canPersonalize,
              canSupportFactualClaim,
              requiresExplicitAttribution,
              notes
            );
            suppressedMemories.push(governed);
            governedCandidates.push(governed);
            continue;
          } else {
            // Winning or unresolved conflict
            conflicts.push({
              key,
              winningCandidateId: cand.memoryId || mem?.id,
              conflictingCandidateIds: activeSiblings.map((s) => s.memoryId || s.memory?.id || "unknown"),
              resolutionStatus: "RESOLVED",
              governanceDirective: `Conflicting values existed for ${key}; selected latest explicit record "${value}".`,
            });
            reasons.push("CONFLICTING_MEMORY");
          }
        }
      }

      // -------------------------------------------------------------------
      // GATE 6: INTENT-AWARE & PERSONALIZATION VS FACTUAL CLAIMS GATE
      // -------------------------------------------------------------------
      const primaryIntent = intent?.primaryIntent;

      if (primaryIntent === "RECOMMENDATION") {
        // Preferences may guide personalization, but must NOT become hard constraints
        canPersonalize = true;
        canSupportFactualClaim = false;
        reasons.push("ACTIVE_USER_PREFERENCE");
        requiresExplicitAttribution = true;

        const prefDirective = `MEMORY USAGE: Use the user's confirmed preference for ${value} as a personalization factor. Do not treat it as a mandatory constraint unless explicitly stated in the current turn.`;
        if (!directives.includes(prefDirective)) {
          directives.push(prefDirective);
        }
      } else if (primaryIntent === "COMPARISON") {
        // Comparison rationale can reflect preference, but hardware/factual comparison must stay evidence-grounded
        canPersonalize = true;
        canSupportFactualClaim = false;
        reasons.push("ACTIVE_USER_PREFERENCE");

        const compDirective = `MEMORY USAGE: User's preference for ${value} may personalize recommendation rationale, but must not distort factual or evidence-based comparison.`;
        if (!directives.includes(compDirective)) {
          directives.push(compDirective);
        }
      } else if (primaryIntent === "CALCULATION") {
        // Unrelated preferences or profile data should not influence calculation
        if (mem?.type === "PREFERENCE" || mem?.type === "HABIT") {
          decision = "INTERNAL_ONLY";
          reasons.push("INTENT_MISMATCH");
          canPersonalize = false;
          canSupportFactualClaim = false;
          notes = "Calculation intent isolates unrelated user preferences.";
        }
      }

      // -------------------------------------------------------------------
      // GATE 7: CONFIDENCE & RELEVANCE GATE
      // -------------------------------------------------------------------
      const confidence = cand.confidence ?? mem?.confidence ?? 0.8;
      const relevance = cand.relevanceScore ?? 0.7;

      if (explicitReferenceDetected) {
        reasons.push("EXPLICIT_REFERENCE");
        if (confidence >= 0.85 && decision === "ALLOW") {
          reasons.push("HIGH_CONFIDENCE", "HIGH_RELEVANCE");
          usageScore = 1.0;
        } else if (confidence >= 0.65) {
          if (decision === "ALLOW") decision = "ALLOW_WITH_CAUTION";
          usageScore = 0.8;
        }
      } else {
        if (confidence >= 0.85 && relevance >= 0.65) {
          if (decision === "ALLOW") {
            reasons.push("HIGH_CONFIDENCE", "HIGH_RELEVANCE");
            usageScore = Math.min(1.0, relevance * 1.1);
          }
        } else if (confidence >= 0.65 || relevance >= 0.50) {
          if (decision === "ALLOW") {
            decision = "ALLOW_WITH_CAUTION";
            usageScore = relevance * 0.9;
          }
        } else {
          decision = "INTERNAL_ONLY";
          reasons.push("LOW_RELEVANCE");
          usageScore = 0.4;
          notes = "Low confidence or relevance; kept internal.";
        }
      }

      // -------------------------------------------------------------------
      // GATE 8: STRICT FACTUAL-AUTHORITY POLICY GATE (Default-Deny)
      // -------------------------------------------------------------------
      // Stored memories are NOT automatically authoritative factual evidence.
      // A memory receives canSupportFactualClaim = true ONLY when it strictly satisfies
      // all factual-authority criteria (verified factual type, authorized provenance, active lifecycle,
      // high confidence, approved ALLOW decision, unquarantined, and no disqualifying reasons).
      const memoryType = mem?.type || cand.memoryType || "PREFERENCE";
      const source = mem?.source || cand.source || "INFERRED";

      const isFactualType =
        memoryType === "FACT" ||
        memoryType === "PROJECT_CONTEXT" ||
        memoryType === "EXPLICIT_MEMORY";

      const isAuthorizedProvenance =
        source === "EXPLICIT_USER" ||
        source === "SYSTEM" ||
        source === "MANUAL";

      const isActiveLifecycle = status === "ACTIVE";
      const isHighConfidence = confidence >= 0.85;
      const isAllowedDecision = decision === "ALLOW";
      const isNotQuarantined = !mem?.isQuarantined;
      const hasNoDisqualifyingReasons =
        !reasons.includes("HARD_CONSTRAINT_OVERRIDDEN") &&
        !reasons.includes("CONFLICTING_MEMORY") &&
        !reasons.includes("VERIFIED_EVIDENCE_OVERRIDDEN") &&
        !reasons.includes("SENSITIVE_DATA") &&
        !reasons.includes("CANDIDATE_UNCERTAIN") &&
        !reasons.includes("TOPIC_MISMATCH") &&
        !reasons.includes("INTENT_MISMATCH") &&
        !reasons.includes("SUPERSEDED_MEMORY") &&
        !reasons.includes("EXPIRED_MEMORY") &&
        !reasons.includes("DELETED_MEMORY");

      if (
        isFactualType &&
        isAuthorizedProvenance &&
        isActiveLifecycle &&
        isHighConfidence &&
        isAllowedDecision &&
        isNotQuarantined &&
        hasNoDisqualifyingReasons
      ) {
        canSupportFactualClaim = true;
      } else {
        canSupportFactualClaim = false;
      }

      // Final classification into buckets
      const governed = this.createGovernedCandidate(
        cand,
        decision,
        reasons,
        usageScore,
        canPersonalize,
        canSupportFactualClaim,
        requiresExplicitAttribution,
        notes
      );

      governedCandidates.push(governed);

      if (decision === "ALLOW") {
        allowedMemories.push(governed);
        if (mem?.type === "PREFERENCE" || cand.memoryType === "PREFERENCE") {
          const prefDirective = `MEMORY USAGE: Incorporate user's confirmed preference for ${value} naturally.`;
          if (!directives.includes(prefDirective)) {
            directives.push(prefDirective);
          }
        } else if (canSupportFactualClaim) {
          const factDirective = `MEMORY USAGE: Confirmed factual detail: ${value}.`;
          if (!directives.includes(factDirective)) {
            directives.push(factDirective);
          }
        }
      } else if (decision === "ALLOW_WITH_CAUTION") {
        cautiousMemories.push(governed);
        if (mem?.type === "PREFERENCE" || cand.memoryType === "PREFERENCE") {
          const prefDirective = `MEMORY USAGE: Consider user's preference for ${value} with caution.`;
          if (!directives.includes(prefDirective)) {
            directives.push(prefDirective);
          }
        }
      } else if (decision === "INTERNAL_ONLY") {
        internalOnlyMemories.push(governed);
      } else {
        suppressedMemories.push(governed);
      }
    }

    // 4. Handle Explicit Recall when No Approved Memories Exist
    if (explicitReferenceDetected && allowedMemories.length === 0 && cautiousMemories.length === 0) {
      const missingMemoryDirective =
        "MEMORY USAGE: User asked to recall remembered information, but no confirmed memory exists on this topic. State honestly and naturally that no previous memory was found without hallucinating.";
      if (!directives.includes(missingMemoryDirective)) {
        directives.push(missingMemoryDirective);
      }
    }

    // 5. Generate Safe, Sanitized Memory Context (Zero raw IDs, zero credentials, zero scoring formulas)
    const sanitizedMemoryContext = this.buildSanitizedContext(
      allowedMemories,
      cautiousMemories,
      explicitReferenceDetected
    );

    // 6. Compute Calibrated Governance Confidence
    const totalEffective = allowedMemories.length + cautiousMemories.length + internalOnlyMemories.length + suppressedMemories.length;
    let governanceConfidence = 1.0;
    if (totalEffective > 0) {
      const positiveWeight = allowedMemories.length * 1.0 + cautiousMemories.length * 0.8;
      const penaltyWeight = suppressedMemories.length * 0.1;
      governanceConfidence = Math.max(0.6, Math.min(1.0, (positiveWeight - penaltyWeight) / totalEffective));
    }

    const memoryInfluenceAllowed = allowedMemories.length > 0 || cautiousMemories.length > 0;

    return {
      governanceRequired: true,
      memoryInfluenceAllowed,
      allowedMemories,
      cautiousMemories,
      internalOnlyMemories,
      suppressedMemories,
      governedCandidates,
      conflicts,
      privacyBlocks,
      topicIsolationApplied,
      explicitReferenceDetected,
      directives,
      sanitizedMemoryContext,
      governanceConfidence: Number(governanceConfidence.toFixed(2)),
      executionTimeMs: 0,
    };
  }

  /**
   * Helper to create a structured MemoryGovernanceCandidate
   */
  private createGovernedCandidate(
    cand: MemoryCandidate,
    decision: MemoryUsageDecision,
    reasons: MemoryUsageReason[],
    usageScore: number,
    canPersonalize: boolean,
    canSupportFactualClaim: boolean,
    requiresExplicitAttribution: boolean,
    notes?: string,
    overrideValue?: string
  ): MemoryGovernanceCandidate {
    const mem = cand.memory;
    return {
      memoryId: cand.memoryId || mem?.id || "unknown",
      key: mem?.key || cand.category || "unknown_key",
      value: overrideValue !== undefined ? overrideValue : (mem?.value || cand.content || ""),
      type: mem?.type || cand.memoryType || "FACT",
      source: mem?.source || cand.source || "INFERRED",
      status: mem?.status || cand.status || "ACTIVE",
      usageDecision: decision,
      usageScore: Number(usageScore.toFixed(2)),
      confidence: cand.confidence ?? mem?.confidence ?? 0.8,
      relevance: cand.relevanceScore ?? 0.7,
      reasons: Array.from(new Set(reasons)),
      canAffectResponseContent: decision === "ALLOW" || decision === "ALLOW_WITH_CAUTION",
      canPersonalize,
      canSupportFactualClaim,
      requiresExplicitAttribution,
      isCandidateInferred: mem?.type === "CANDIDATE" || cand.isLowConfidenceInferred === true,
      governanceNotes: notes,
    };
  }

  /**
   * Checks whether a memory key or value contains sensitive private authentication data
   */
  private isSensitiveData(key: string, value: string): boolean {
    const rawCombined = `${key} ${value}`.toLowerCase();
    const combined = rawCombined.replace(/[_\-]/g, " ");
    
    // Check sensitive keyword tokens
    if (
      combined.includes("password") ||
      combined.includes("passwd") ||
      combined.includes("pin number") ||
      combined.includes("pin code") ||
      /\bpin\b/i.test(combined) ||
      combined.includes("api key") ||
      combined.includes("apikey") ||
      combined.includes("secret key") ||
      combined.includes("bearer token") ||
      combined.includes("auth token") ||
      combined.includes("access token") ||
      combined.includes("refresh token") ||
      combined.includes("credit card") ||
      combined.includes("cvv") ||
      combined.includes("cvc") ||
      combined.includes("ssn") ||
      combined.includes("social security")
    ) {
      return true;
    }

    // Check sensitive regex patterns
    for (const pattern of this.sensitivePatterns) {
      if (pattern.test(key) || pattern.test(value)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Formats a clean, executive, sanitized context block for LLM prompt injection.
   * Strips all internal IDs, scores, and technical internals.
   */
  private buildSanitizedContext(
    allowed: MemoryGovernanceCandidate[],
    cautious: MemoryGovernanceCandidate[],
    isExplicit: boolean
  ): string {
    const lines: string[] = [];

    if (allowed.length === 0 && cautious.length === 0) {
      return "";
    }

    lines.push("[VERIFIED USER PREFERENCES & DURABLE MEMORY]");

    for (const item of allowed) {
      if (item.type === "PREFERENCE") {
        lines.push(`• Confirmed Preference: ${item.key} = ${item.value}`);
      } else if (item.type === "GOAL") {
        lines.push(`• Active Goal: ${item.key} = ${item.value}`);
      } else if (item.type === "PROJECT_CONTEXT") {
        lines.push(`• Project Context: ${item.key} = ${item.value}`);
      } else {
        lines.push(`• Remembered Fact: ${item.key} = ${item.value}`);
      }
    }

    for (const item of cautious) {
      if (item.isCandidateInferred) {
        lines.push(`• [INFERRED USER INTEREST — NOT CONFIRMED]: ${item.key} = ${item.value}`);
      } else if (item.reasons.includes("STALE_MEMORY")) {
        lines.push(`• [HISTORICAL / PREVIOUS PREFERENCE]: ${item.key} = ${item.value}`);
      } else {
        lines.push(`• [USER PREFERENCE — REQUIRES ATTRIBUTION]: ${item.key} = ${item.value}`);
      }
    }

    if (isExplicit) {
      lines.push("Note: The user explicitly asked about their remembered information. Acknowledge these memories naturally.");
    }

    return lines.join("\n");
  }
}

export const memoryGovernanceEngine = MemoryGovernanceEngine.getInstance();
