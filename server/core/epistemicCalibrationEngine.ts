/**
 * Dora Uncertainty, Confidence & Epistemic Calibration Engine
 * Phase 3 — Step 5
 * 
 * Implements deterministic, bounded, non-LLM epistemic state classification,
 * multi-dimensional uncertainty quantification, confidence calibration across reasoning chains,
 * hop-depth penalties, contradiction destabilization, causal ambiguity propagation,
 * and sanitized decision-ready prompt directives.
 */

import {
  EpistemicAuthority,
  EPISTEMIC_AUTHORITY_WEIGHTS,
  EpistemicState,
  EPISTEMIC_STATE_RANKS,
  EpistemicScope,
  ConfidenceLabel,
  EpistemicProvenance,
  EpistemicUncertainty,
  CompetingClaim,
  EpistemicClaim,
  EpistemicCalibrationRecord,
  EpistemicCalibrationBudgetConfig,
  DEFAULT_EPISTEMIC_CALIBRATION_BUDGET,
  EpistemicCalibrationDiagnostics,
  EpistemicCalibrationAnalysis,
  EpistemicCalibrationInput,
} from "./epistemicCalibrationTypes";

export class EpistemicCalibrationEngine {
  private static instance: EpistemicCalibrationEngine;

  private constructor() {}

  public static getInstance(): EpistemicCalibrationEngine {
    if (!EpistemicCalibrationEngine.instance) {
      EpistemicCalibrationEngine.instance = new EpistemicCalibrationEngine();
    }
    return EpistemicCalibrationEngine.instance;
  }

  /**
   * Main evaluation entry point for Epistemic Calibration Engine.
   * Pure, deterministic, bounded, and side-effect free.
   */
  public evaluate(input: EpistemicCalibrationInput): EpistemicCalibrationAnalysis {
    const options = input.options || {};
    const currentTime = options.currentTime ?? 1700000000000;
    const activeTopic = options.activeTopic || input.context?.activeTopic || "general";
    const strictTopicIsolation = options.strictTopicIsolation ?? false;

    const budget: EpistemicCalibrationBudgetConfig = {
      maxClaims: Math.min(40, options.budget?.maxClaims ?? DEFAULT_EPISTEMIC_CALIBRATION_BUDGET.maxClaims),
      maxEvidenceRefsPerClaim: options.budget?.maxEvidenceRefsPerClaim ?? DEFAULT_EPISTEMIC_CALIBRATION_BUDGET.maxEvidenceRefsPerClaim,
      maxCalibrationRecords: options.budget?.maxCalibrationRecords ?? DEFAULT_EPISTEMIC_CALIBRATION_BUDGET.maxCalibrationRecords,
      maxUncertainties: options.budget?.maxUncertainties ?? DEFAULT_EPISTEMIC_CALIBRATION_BUDGET.maxUncertainties,
      maxDirectives: options.budget?.maxDirectives ?? DEFAULT_EPISTEMIC_CALIBRATION_BUDGET.maxDirectives,
      maxTotalItems: options.budget?.maxTotalItems ?? DEFAULT_EPISTEMIC_CALIBRATION_BUDGET.maxTotalItems,
    };

    const diagnostics: EpistemicCalibrationDiagnostics = {
      claimsEvaluated: 0,
      verifiedClaims: 0,
      knownClaims: 0,
      supportedClaims: 0,
      inferredClaims: 0,
      uncertainClaims: 0,
      contestedClaims: 0,
      unknownClaims: 0,
      advisoryClaims: 0,
      rejectedClaims: 0,
      confidenceDowngrades: 0,
      uncertaintyIncreases: 0,
      contradictionAdjustments: 0,
      causalAmbiguityAdjustments: 0,
      multiHopAdjustments: 0,
      predictiveSuppressionCount: 0,
      unsupportedEvidenceCount: 0,
      missingProvenanceCount: 0,
      duplicateEvidenceSuppressed: 0,
      budgetTruncations: 0,
      directivesSanitized: 0,
      evaluationTimeMs: 0,
    };

    const rawMessage = (input.message || "").trim();
    const isQuestion = this.isQuestionIntent(rawMessage, input.intent?.primaryIntent);
    const isHypothetical = this.isHypotheticalOrConditional(rawMessage);
    const isSpeculation = this.isSpeculation(rawMessage);
    const isAssistantAttribution = this.isAssistantAttribution(rawMessage);

    // 1. Extract raw claims from all authorized upstream layers
    const rawClaims = this.extractUpstreamClaims(
      input,
      activeTopic,
      strictTopicIsolation,
      diagnostics
    );

    // 2. Extract current-turn claims with hardened intent gating
    if (rawMessage.length > 0 && !this.containsSensitiveData(rawMessage)) {
      this.extractCurrentTurnClaims(
        rawMessage,
        isQuestion,
        isHypothetical,
        isSpeculation,
        isAssistantAttribution,
        activeTopic,
        rawClaims,
        diagnostics
      );
    }

    // 3. Deduplicate and merge claims by normalized key
    const mergedClaims = this.deduplicateAndMergeClaims(
      rawClaims,
      diagnostics
    );

    diagnostics.claimsEvaluated = mergedClaims.length;

    // 4. Calibrate each claim (epistemic state, uncertainty dimensions, confidence ceilings)
    const calibrationRecords: EpistemicCalibrationRecord[] = [];
    const calibratedClaims: EpistemicClaim[] = [];

    for (const claim of mergedClaims) {
      const { calibratedClaim, record } = this.calibrateClaim(
        claim,
        input,
        activeTopic,
        strictTopicIsolation,
        diagnostics
      );

      calibratedClaims.push(calibratedClaim);
      if (record && calibrationRecords.length < budget.maxCalibrationRecords) {
        calibrationRecords.push(record);
      }
    }

    // 5. Deterministic sorting: Authority -> State Rank -> Support -> Confidence -> Uncertainty -> Key -> ID
    calibratedClaims.sort((a, b) => {
      // 1. Authority Weight (Descending)
      if (Math.abs(b.authorityWeight - a.authorityWeight) > 0.0001) {
        return b.authorityWeight - a.authorityWeight;
      }
      // 2. Epistemic State Rank (Descending)
      const rankA = EPISTEMIC_STATE_RANKS[a.epistemicState] || 0;
      const rankB = EPISTEMIC_STATE_RANKS[b.epistemicState] || 0;
      if (rankB !== rankA) {
        return rankB - rankA;
      }
      // 3. Independent Support Count (Descending)
      if (b.independentSupportCount !== a.independentSupportCount) {
        return b.independentSupportCount - a.independentSupportCount;
      }
      // 4. Confidence (Descending)
      if (Math.abs(b.confidence - a.confidence) > 0.0001) {
        return b.confidence - a.confidence;
      }
      // 5. Uncertainty (Ascending - lower is better)
      if (Math.abs(a.uncertainty.overallUncertainty - b.uncertainty.overallUncertainty) > 0.0001) {
        return a.uncertainty.overallUncertainty - b.uncertainty.overallUncertainty;
      }
      // 6. Normalized Key (Alphabetical)
      if (a.normalizedKey !== b.normalizedKey) {
        return a.normalizedKey.localeCompare(b.normalizedKey);
      }
      // 7. Stable ID tiebreaker
      return a.id.localeCompare(b.id);
    });

    // 6. Enforce budget ceilings
    let finalClaims = calibratedClaims;
    if (finalClaims.length > budget.maxClaims) {
      diagnostics.budgetTruncations += finalClaims.length - budget.maxClaims;
      finalClaims = finalClaims.slice(0, budget.maxClaims);
    }

    // 7. Populate state-specific breakdown lists and diagnostics counts
    const contestedClaims: EpistemicClaim[] = [];
    const unknownClaims: EpistemicClaim[] = [];
    const uncertainties: Array<{ claimId: string; uncertainty: EpistemicUncertainty }> = [];

    for (const c of finalClaims) {
      switch (c.epistemicState) {
        case "VERIFIED":
          diagnostics.verifiedClaims++;
          break;
        case "KNOWN":
          diagnostics.knownClaims++;
          break;
        case "SUPPORTED":
          diagnostics.supportedClaims++;
          break;
        case "INFERRED":
          diagnostics.inferredClaims++;
          break;
        case "UNCERTAIN":
          diagnostics.uncertainClaims++;
          break;
        case "CONTESTED":
          diagnostics.contestedClaims++;
          contestedClaims.push(c);
          break;
        case "UNKNOWN":
          diagnostics.unknownClaims++;
          unknownClaims.push(c);
          break;
        case "ADVISORY":
          diagnostics.advisoryClaims++;
          break;
        case "REJECTED":
          diagnostics.rejectedClaims++;
          break;
      }

      if (uncertainties.length < budget.maxUncertainties) {
        uncertainties.push({ claimId: c.id, uncertainty: c.uncertainty });
      }
    }

    // 8. Synthesize sanitized natural-language prompt directives
    const directives = this.synthesizeDirectives(
      finalClaims,
      budget.maxDirectives,
      diagnostics
    );

    return {
      claims: finalClaims,
      calibrationRecords,
      uncertainties,
      contestedClaims,
      unknownClaims,
      directives,
      diagnostics,
    };
  }

  /**
   * Extracts claims from all authorized upstream engines.
   */
  private extractUpstreamClaims(
    input: EpistemicCalibrationInput,
    activeTopic: string,
    strictTopicIsolation: boolean,
    diagnostics: EpistemicCalibrationDiagnostics
  ): EpistemicClaim[] {
    const claims: EpistemicClaim[] = [];

    // A. Executive Context Facts
    const facts = (input.executiveContext as any)?.authoritativeFacts || (input.executiveContext as any)?.facts;
    if (Array.isArray(facts)) {
      for (const fact of facts) {
        if (!fact || !fact.key || !fact.value) continue;
        if (fact.eligibility === "UNAUTHORIZED" || fact.eligibility === "EXPIRED" || fact.eligibility === "DELETED") {
          continue;
        }

        const topic = fact.topic || "general";
        const isGlobal = fact.isGlobal || fact.scope === "GLOBAL";
        if (strictTopicIsolation && topic !== activeTopic && topic !== "global" && !isGlobal) {
          continue;
        }

        const stmt = `${fact.key.replace(/_/g, " ")}: ${String(fact.value)}`;
        if (this.containsSensitiveData(stmt) || this.isUnsupportedIdentityClaim(fact.key)) {
          diagnostics.unsupportedEvidenceCount++;
          continue;
        }

        const authority = (fact.authority as EpistemicAuthority) || "GOVERNANCE_APPROVED_MEMORY";
        const authorityWeight = EPISTEMIC_AUTHORITY_WEIGHTS[authority] ?? 0.80;
        const normKey = this.normalizeKey(fact.key);

        const epistemicState: EpistemicState =
          authority === "CURRENT_TURN_EXPLICIT" || authority === "VERIFIED_EVIDENCE"
            ? "VERIFIED"
            : authority === "PREDICTIVE_CONTEXT"
            ? "ADVISORY"
            : "KNOWN";

        claims.push({
          id: `ep_fact_${this.deterministicHash(normKey + "_" + (fact.id || normKey))}`,
          normalizedKey: normKey,
          statement: stmt,
          epistemicState,
          authority,
          authorityWeight,
          confidence: Math.min(1.0, Math.max(0.0, fact.confidence ?? 0.85)),
          confidenceLabel: this.getConfidenceLabel(fact.confidence ?? 0.85),
          uncertainty: this.createDefaultUncertainty(0.1),
          scope: isGlobal ? "GLOBAL" : ((fact.scope as EpistemicScope) || "TOPIC"),
          topic,
          evidenceRefs: [fact.id || normKey],
          provenance: [
            {
              sourceId: fact.id || normKey,
              sourceType: "EXECUTIVE_FACT",
              authority,
              confidence: fact.confidence ?? 0.85,
              statement: stmt,
              scope: isGlobal ? "GLOBAL" : ((fact.scope as EpistemicScope) || "TOPIC"),
              topic,
            },
          ],
          independentSupportCount: 1,
          contradictionCount: 0,
          hopDepth: 0,
          sourceType: "EXECUTIVE_FACT",
          calibrationReason: "Extracted from authorized Executive Context fact",
        });
      }
    }

    // B. Executive Context Active Projects & Goals
    if (input.executiveContext?.activeProjects) {
      for (const proj of input.executiveContext.activeProjects) {
        if (!proj || !proj.name) continue;
        const stmt = `Active project: ${proj.name} (Status: ${proj.status || "active"})`;
        const normKey = this.normalizeKey(`project_${proj.name}`);
        const authority: EpistemicAuthority = "ACTIVE_GOAL_PROJECT_COMMITMENT";

        claims.push({
          id: `ep_proj_${this.deterministicHash(normKey)}`,
          normalizedKey: normKey,
          statement: stmt,
          epistemicState: "KNOWN",
          authority,
          authorityWeight: EPISTEMIC_AUTHORITY_WEIGHTS[authority],
          confidence: 0.85,
          confidenceLabel: "HIGH",
          uncertainty: this.createDefaultUncertainty(0.15),
          scope: "PROJECT",
          topic: activeTopic,
          evidenceRefs: [proj.id || normKey],
          provenance: [
            {
              sourceId: proj.id || normKey,
              sourceType: "GOAL_PROJECT",
              authority,
              confidence: 0.85,
              statement: stmt,
              scope: "PROJECT",
              topic: activeTopic,
            },
          ],
          independentSupportCount: 1,
          contradictionCount: 0,
          hopDepth: 0,
          sourceType: "GOAL_PROJECT",
          calibrationReason: "Extracted from Active Projects context",
        });
      }
    }

    // C. Deep Reasoning Analysis Hypotheses & Evidence
    if (input.deepReasoning?.evidence) {
      for (const ev of input.deepReasoning.evidence) {
        if (!ev || !ev.statement) continue;
        const evAny = ev as any;
        if (evAny.eligibility === "UNAUTHORIZED" || evAny.eligibility === "EXPIRED") continue;

        const topic = ev.topic || "general";
        if (strictTopicIsolation && topic !== activeTopic && topic !== "global" && ev.scope !== "GLOBAL") {
          continue;
        }

        if (this.containsSensitiveData(ev.statement) || this.isUnsupportedIdentityClaim(ev.statement)) {
          diagnostics.unsupportedEvidenceCount++;
          continue;
        }

        const normKey = this.normalizeKey(ev.statement);
        const authority = (ev.authority as EpistemicAuthority) || "GOVERNANCE_APPROVED_MEMORY";
        const authorityWeight = EPISTEMIC_AUTHORITY_WEIGHTS[authority] ?? 0.70;
        const evConfidence = typeof evAny.confidence === "number" ? evAny.confidence : (ev.reliability ?? 0.80);

        claims.push({
          id: `ep_deep_${this.deterministicHash(normKey + "_" + ev.id)}`,
          normalizedKey: normKey,
          statement: ev.statement,
          epistemicState: authority === "PREDICTIVE_CONTEXT" ? "ADVISORY" : "SUPPORTED",
          authority,
          authorityWeight,
          confidence: Math.min(1.0, Math.max(0.0, evConfidence)),
          confidenceLabel: this.getConfidenceLabel(evConfidence),
          uncertainty: this.createDefaultUncertainty(0.2),
          scope: (ev.scope as EpistemicScope) || "TOPIC",
          topic,
          evidenceRefs: [ev.id || normKey],
          provenance: [
            {
              sourceId: ev.id || normKey,
              sourceType: "DEEP_REASONING",
              authority,
              confidence: evConfidence,
              statement: ev.statement,
              scope: (ev.scope as EpistemicScope) || "TOPIC",
              topic,
            },
          ],
          independentSupportCount: 1,
          contradictionCount: 0,
          hopDepth: 0,
          sourceType: "DEEP_REASONING",
          calibrationReason: "Extracted from Deep Reasoning evidence",
        });
      }
    }

    // D. Contradiction Resolution Analysis
    const contradictions = input.contradictionResolution?.contradictions || (input.contradictionResolution as any)?.unresolvedContradictions || (input.contradictionResolution as any)?.records;
    if (Array.isArray(contradictions)) {
      for (const unres of contradictions) {
        if (!unres) continue;
        const unresTopic = unres.topic || (unres as any).description || "unresolved_conflict";
        const normKey = this.normalizeKey(unresTopic);
        const stmt = `Contested evidence on ${unres.topic || "topic"}: ${(unres as any).description || "competing statements"}`;

        claims.push({
          id: `ep_conflict_${this.deterministicHash(normKey + "_" + unres.id)}`,
          normalizedKey: normKey,
          statement: stmt,
          epistemicState: "CONTESTED",
          authority: "GOVERNANCE_APPROVED_MEMORY",
          authorityWeight: EPISTEMIC_AUTHORITY_WEIGHTS.GOVERNANCE_APPROVED_MEMORY,
          confidence: 0.35,
          confidenceLabel: "LOW",
          uncertainty: {
            overallUncertainty: 0.85,
            evidenceInsufficiency: 0.3,
            sourceConflict: 0.9,
            inferenceDepth: 0.1,
            provenanceWeakness: 0.1,
            temporalStaleness: 0.0,
            scopeAmbiguity: 0.2,
            topicAmbiguity: 0.1,
            predictiveDependence: 0.0,
            missingEvidence: 0.4,
            causalAmbiguity: 0.0,
          },
          scope: "TOPIC",
          topic: unres.topic || activeTopic,
          evidenceRefs: (unres as any).competingEvidenceIds || [unres.id],
          provenance: [],
          independentSupportCount: 1,
          contradictionCount: 2,
          hopDepth: 0,
          sourceType: "CONTRADICTION_RESOLUTION",
          calibrationReason: "Unresolved equal-authority contradiction from Contradiction Resolution Engine",
          isContested: true,
        });
      }
    }

    // E. Causal Reasoning Analysis Relations
    if (input.causalReasoning?.relations) {
      for (const rel of input.causalReasoning.relations) {
        if (!rel || !rel.causeStatement || !rel.effectStatement) continue;
        const normKey = this.normalizeKey(`causal_${rel.causeStatement}_to_${rel.effectStatement}`);
        const stmt = `${rel.causeStatement} ${rel.relationType.replace(/_/g, " ").toLowerCase()} ${rel.effectStatement}`;

        const isCorrelation = rel.relationType === "CORRELATION_ONLY" || rel.relationType === "COINCIDENCE" || rel.relationType === "SPURIOUS";
        const isUnresolvedCausal = rel.relationType === "UNRESOLVED" || rel.relationType === "CONFOUNDED";

        const epistemicState: EpistemicState = isCorrelation || isUnresolvedCausal ? "UNCERTAIN" : "INFERRED";
        const relAuthority = (rel as any).authority || rel.evidenceAuthority || "GOVERNANCE_APPROVED_MEMORY";
        const authority: EpistemicAuthority = (relAuthority as EpistemicAuthority) || "GOVERNANCE_APPROVED_MEMORY";

        claims.push({
          id: `ep_causal_${this.deterministicHash(normKey + "_" + rel.id)}`,
          normalizedKey: normKey,
          statement: stmt,
          epistemicState,
          authority,
          authorityWeight: EPISTEMIC_AUTHORITY_WEIGHTS[authority] ?? 0.70,
          confidence: Math.min(isCorrelation ? 0.45 : 0.80, rel.confidence || 0.75),
          confidenceLabel: this.getConfidenceLabel(isCorrelation ? 0.45 : rel.confidence || 0.75),
          uncertainty: {
            overallUncertainty: isCorrelation ? 0.70 : 0.25,
            evidenceInsufficiency: 0.2,
            sourceConflict: 0.0,
            inferenceDepth: 0.1,
            provenanceWeakness: 0.1,
            temporalStaleness: 0.0,
            scopeAmbiguity: 0.1,
            topicAmbiguity: 0.0,
            predictiveDependence: 0.0,
            missingEvidence: isCorrelation ? 0.5 : 0.1,
            causalAmbiguity: isCorrelation ? 0.85 : isUnresolvedCausal ? 0.75 : 0.1,
          },
          scope: "TOPIC",
          topic: activeTopic,
          evidenceRefs: (rel as any).evidenceRefs || [rel.causeId || rel.id, rel.effectId || rel.id],
          provenance: [
            {
              sourceId: rel.id,
              sourceType: "CAUSAL_RELATION",
              authority,
              confidence: rel.confidence || 0.75,
              statement: stmt,
              scope: "TOPIC",
              topic: activeTopic,
            },
          ],
          independentSupportCount: 1,
          contradictionCount: 0,
          hopDepth: 1,
          sourceType: "CAUSAL_RELATION",
          calibrationReason: `Extracted from Causal Reasoning Engine (${rel.relationType})`,
        });
      }
    }

    // F. Multi-Hop Reasoning Grounded Conclusions
    if (input.multiHopReasoning?.groundedConclusions) {
      for (const conc of input.multiHopReasoning.groundedConclusions) {
        if (!conc || !conc.statement) continue;
        const concAny = conc as any;
        const normKey = this.normalizeKey(conc.statement);
        const concAuthority = concAny.primaryAuthority || conc.authority || "GOVERNANCE_APPROVED_MEMORY";
        const authority: EpistemicAuthority = (concAuthority as EpistemicAuthority) || "GOVERNANCE_APPROVED_MEMORY";
        const authorityWeight = EPISTEMIC_AUTHORITY_WEIGHTS[authority] ?? 0.70;

        const epistemicState: EpistemicState =
          conc.isAdvisory || concAny.status === "ADVISORY" || authority === "PREDICTIVE_CONTEXT"
            ? "ADVISORY"
            : concAny.status === "UNRESOLVED"
            ? "UNCERTAIN"
            : "INFERRED";

        const depth = conc.traceableProvenance?.chainDepth ?? concAny.chainDepth ?? 1;

        claims.push({
          id: `ep_hop_${this.deterministicHash(normKey + "_" + conc.id)}`,
          normalizedKey: normKey,
          statement: conc.statement,
          epistemicState,
          authority,
          authorityWeight,
          confidence: Math.min(1.0, Math.max(0.0, conc.confidence)),
          confidenceLabel: this.getConfidenceLabel(conc.confidence),
          uncertainty: this.createDefaultUncertainty(0.25 + depth * 0.08),
          scope: (conc.scope as EpistemicScope) || "TOPIC",
          topic: activeTopic,
          evidenceRefs: concAny.rootEvidenceNodeIds || conc.traceableProvenance?.rootEvidenceKeys || [conc.id],
          provenance: [
            {
              sourceId: conc.id,
              sourceType: "MULTI_HOP_CHAIN",
              authority,
              confidence: conc.confidence,
              statement: conc.statement,
              scope: (conc.scope as EpistemicScope) || "TOPIC",
              topic: activeTopic,
            },
          ],
          independentSupportCount: concAny.independentEvidenceCount || conc.supportingEvidenceCount || 1,
          contradictionCount: 0,
          hopDepth: depth,
          sourceType: "MULTI_HOP_CHAIN",
          calibrationReason: "Extracted from Multi-Hop Reasoning grounded conclusion",
          isAdvisory: epistemicState === "ADVISORY",
        });
      }
    }

    // G. Predictive Context Candidates (Advisory only)
    const predictiveCandidates = input.predictiveContext?.acceptedCandidates || (input.predictiveContext as any)?.proactiveSuggestions;
    if (Array.isArray(predictiveCandidates)) {
      for (const sugg of predictiveCandidates) {
        if (!sugg || !sugg.suggestion) continue;
        diagnostics.predictiveSuppressionCount++;
        const normKey = this.normalizeKey(sugg.suggestion);
        const authority: EpistemicAuthority = "PREDICTIVE_CONTEXT";
        const suggConfidence = typeof (sugg as any).confidence === "number" ? (sugg as any).confidence : ((sugg as any).relevanceScore || 0.30);

        claims.push({
          id: `ep_pred_${this.deterministicHash(normKey)}`,
          normalizedKey: normKey,
          statement: sugg.suggestion,
          epistemicState: "ADVISORY",
          authority,
          authorityWeight: EPISTEMIC_AUTHORITY_WEIGHTS[authority],
          confidence: Math.min(0.40, suggConfidence),
          confidenceLabel: "LOW",
          uncertainty: {
            overallUncertainty: 0.75,
            evidenceInsufficiency: 0.6,
            sourceConflict: 0.0,
            inferenceDepth: 0.1,
            provenanceWeakness: 0.1,
            temporalStaleness: 0.0,
            scopeAmbiguity: 0.1,
            topicAmbiguity: 0.0,
            predictiveDependence: 0.9,
            missingEvidence: 0.4,
            causalAmbiguity: 0.0,
          },
          scope: "TOPIC",
          topic: sugg.topic || activeTopic,
          evidenceRefs: [sugg.id || normKey],
          provenance: [],
          independentSupportCount: 1,
          contradictionCount: 0,
          hopDepth: 0,
          sourceType: "PREDICTIVE_CONTEXT",
          calibrationReason: "Extracted from Predictive Context suggestions (restricted to ADVISORY)",
          isAdvisory: true,
        });
      }
    }

    return claims;
  }

  /**
   * Extracts current-turn explicit inputs with hardened conversational intent boundaries.
   */
  private extractCurrentTurnClaims(
    message: string,
    isQuestion: boolean,
    isHypothetical: boolean,
    isSpeculation: boolean,
    isAssistantAttribution: boolean,
    activeTopic: string,
    claims: EpistemicClaim[],
    diagnostics: EpistemicCalibrationDiagnostics
  ): void {
    const normKey = this.normalizeKey(message);

    // Hypotheticals / Conditionals do NOT become verified facts
    if (isHypothetical) {
      diagnostics.unsupportedEvidenceCount++;
      claims.push({
        id: `ep_hyp_${this.deterministicHash(normKey)}`,
        normalizedKey: normKey,
        statement: `Hypothetical inquiry: "${message}"`,
        epistemicState: "UNCERTAIN",
        authority: "CURRENT_TURN_EXPLICIT",
        authorityWeight: EPISTEMIC_AUTHORITY_WEIGHTS.CURRENT_TURN_EXPLICIT,
        confidence: 0.30,
        confidenceLabel: "LOW",
        uncertainty: this.createDefaultUncertainty(0.80),
        scope: "CURRENT_TURN",
        topic: activeTopic,
        evidenceRefs: ["turn_hypothetical"],
        provenance: [],
        independentSupportCount: 0,
        contradictionCount: 0,
        hopDepth: 0,
        sourceType: "DIRECT_USER_INPUT",
        calibrationReason: "Hypothetical / conditional input restricted to UNCERTAIN state",
      });
      return;
    }

    // Questions do NOT become facts -> marked UNKNOWN or omitted as declarative fact
    if (isQuestion) {
      diagnostics.unsupportedEvidenceCount++;
      claims.push({
        id: `ep_q_${this.deterministicHash(normKey)}`,
        normalizedKey: normKey,
        statement: `User inquiry: "${message}"`,
        epistemicState: "UNKNOWN",
        authority: "CURRENT_TURN_EXPLICIT",
        authorityWeight: EPISTEMIC_AUTHORITY_WEIGHTS.CURRENT_TURN_EXPLICIT,
        confidence: 0.0,
        confidenceLabel: "VERY_LOW",
        uncertainty: this.createDefaultUncertainty(1.0),
        scope: "CURRENT_TURN",
        topic: activeTopic,
        evidenceRefs: ["turn_question"],
        provenance: [],
        independentSupportCount: 0,
        contradictionCount: 0,
        hopDepth: 0,
        sourceType: "DIRECT_USER_INPUT",
        calibrationReason: "Question inquiry classified as UNKNOWN pending factual evidence",
      });
      return;
    }

    // Speculations do NOT become verified facts
    if (isSpeculation) {
      diagnostics.unsupportedEvidenceCount++;
      claims.push({
        id: `ep_spec_${this.deterministicHash(normKey)}`,
        normalizedKey: normKey,
        statement: `Speculative input: "${message}"`,
        epistemicState: "ADVISORY",
        authority: "CURRENT_TURN_EXPLICIT",
        authorityWeight: EPISTEMIC_AUTHORITY_WEIGHTS.CURRENT_TURN_EXPLICIT,
        confidence: 0.35,
        confidenceLabel: "LOW",
        uncertainty: this.createDefaultUncertainty(0.75),
        scope: "CURRENT_TURN",
        topic: activeTopic,
        evidenceRefs: ["turn_speculation"],
        provenance: [],
        independentSupportCount: 0,
        contradictionCount: 0,
        hopDepth: 0,
        sourceType: "DIRECT_USER_INPUT",
        calibrationReason: "Speculative assertion restricted to ADVISORY state",
        isAdvisory: true,
      });
      return;
    }

    // Assistant attributions are NOT user-origin evidence
    if (isAssistantAttribution) {
      diagnostics.unsupportedEvidenceCount++;
      return;
    }

    // Declarative explicit user assertion in current turn
    if (message.length > 5 && !message.endsWith("?")) {
      claims.push({
        id: `ep_turn_${this.deterministicHash(normKey)}`,
        normalizedKey: normKey,
        statement: message,
        epistemicState: "VERIFIED",
        authority: "CURRENT_TURN_EXPLICIT",
        authorityWeight: EPISTEMIC_AUTHORITY_WEIGHTS.CURRENT_TURN_EXPLICIT,
        confidence: 0.95,
        confidenceLabel: "VERY_HIGH",
        uncertainty: this.createDefaultUncertainty(0.05),
        scope: "CURRENT_TURN",
        topic: activeTopic,
        evidenceRefs: ["current_turn"],
        provenance: [
          {
            sourceId: "current_turn",
            sourceType: "DIRECT_USER_INPUT",
            authority: "CURRENT_TURN_EXPLICIT",
            confidence: 0.95,
            statement: message,
            scope: "CURRENT_TURN",
            topic: activeTopic,
          },
        ],
        independentSupportCount: 1,
        contradictionCount: 0,
        hopDepth: 0,
        sourceType: "DIRECT_USER_INPUT",
        calibrationReason: "Explicit current-turn user statement directly verified",
      });
    }
  }

  /**
   * Deduplicates and merges claims by normalized key preserving highest authority.
   */
  private deduplicateAndMergeClaims(
    rawClaims: EpistemicClaim[],
    diagnostics: EpistemicCalibrationDiagnostics
  ): EpistemicClaim[] {
    const claimMap = new Map<string, EpistemicClaim>();

    for (const c of rawClaims) {
      const existing = claimMap.get(c.normalizedKey);
      if (!existing) {
        claimMap.set(c.normalizedKey, { ...c });
        continue;
      }

      diagnostics.duplicateEvidenceSuppressed++;

      // Higher authority wins
      if (c.authorityWeight > existing.authorityWeight) {
        existing.authority = c.authority;
        existing.authorityWeight = c.authorityWeight;
        existing.statement = c.statement;
        existing.calibrationReason = c.calibrationReason;
      }

      // Merge provenance without duplicate source IDs
      for (const prov of c.provenance) {
        if (!existing.provenance.some((p) => p.sourceId === prov.sourceId)) {
          existing.provenance.push(prov);
        }
      }

      // Merge evidence refs
      for (const ref of c.evidenceRefs) {
        if (!existing.evidenceRefs.includes(ref)) {
          existing.evidenceRefs.push(ref);
        }
      }

      // Calculate genuine independent support
      existing.independentSupportCount = Math.max(
        existing.independentSupportCount,
        existing.provenance.length
      );

      // Average / boost confidence deterministically bounded by ceiling
      existing.confidence = Math.min(
        1.0,
        Math.max(existing.confidence, c.confidence) + (existing.provenance.length > 1 ? 0.03 : 0.0)
      );
      existing.confidenceLabel = this.getConfidenceLabel(existing.confidence);

      // Reduce insufficiency uncertainty if supported by multiple sources
      existing.uncertainty.evidenceInsufficiency = Math.max(
        0.0,
        1.0 - Math.min(1.0, existing.independentSupportCount * 0.45)
      );
      existing.uncertainty.overallUncertainty = this.computeOverallUncertainty(existing.uncertainty);
    }

    return Array.from(claimMap.values());
  }

  /**
   * Performs full calibration on a single epistemic claim:
   * evaluates uncertainty dimensions, applies hop penalties, resolves contradictions,
   * enforces confidence ceilings, and assigns final EpistemicState.
   */
  private calibrateClaim(
    claim: EpistemicClaim,
    input: EpistemicCalibrationInput,
    activeTopic: string,
    strictTopicIsolation: boolean,
    diagnostics: EpistemicCalibrationDiagnostics
  ): { calibratedClaim: EpistemicClaim; record?: EpistemicCalibrationRecord } {
    const originalState = claim.epistemicState;
    const originalConfidence = claim.confidence;
    const appliedCeilings: string[] = [];
    const uncertaintyFactors: string[] = [];

    // 1. Calculate multi-dimensional uncertainty
    const uncertainty: EpistemicUncertainty = { ...claim.uncertainty };

    // Topic isolation penalty
    if (strictTopicIsolation && claim.topic !== activeTopic && claim.topic !== "global" && claim.scope !== "GLOBAL") {
      uncertainty.topicAmbiguity = 0.85;
      uncertaintyFactors.push("Foreign topic boundary isolation");
    }

    // Inference depth penalty
    if (claim.hopDepth > 0) {
      const depthPenalty = Math.min(0.60, claim.hopDepth * 0.15);
      uncertainty.inferenceDepth = depthPenalty;
      diagnostics.multiHopAdjustments++;
      uncertaintyFactors.push(`Multi-hop depth penalty (${claim.hopDepth} hops)`);
    }

    // Missing provenance
    if (claim.provenance.length === 0 && claim.epistemicState !== "UNKNOWN") {
      uncertainty.provenanceWeakness = 0.80;
      diagnostics.missingProvenanceCount++;
      uncertaintyFactors.push("Missing originating evidence provenance");
    }

    // Predictive dependence
    if (claim.authority === "PREDICTIVE_CONTEXT") {
      uncertainty.predictiveDependence = 0.90;
      uncertaintyFactors.push("High predictive dependence");
    }

    // Check upstream contradiction for this claim
    let isContradicted = false;
    const unresolved = input.contradictionResolution?.contradictions || (input.contradictionResolution as any)?.unresolvedContradictions || (input.contradictionResolution as any)?.records;
    if (Array.isArray(unresolved)) {
      for (const unres of unresolved) {
        if (
          unres.topic === claim.topic ||
          (unres.description && claim.statement.toLowerCase().includes(unres.description.toLowerCase()))
        ) {
          isContradicted = true;
          uncertainty.sourceConflict = 0.85;
          diagnostics.contradictionAdjustments++;
          uncertaintyFactors.push("Unresolved contradiction detected");
          break;
        }
      }
    }

    // 2. Compute overall uncertainty bounded in [0.0, 1.0]
    uncertainty.overallUncertainty = this.computeOverallUncertainty(uncertainty);

    // 3. Calibrate confidence
    let calibratedConfidence = originalConfidence;

    // A. Multi-hop multiplicative decay
    if (claim.hopDepth > 0) {
      calibratedConfidence = calibratedConfidence * Math.pow(0.92, claim.hopDepth);
    }

    // B. Uncertainty adjustment
    calibratedConfidence = calibratedConfidence * (1.0 - uncertainty.overallUncertainty * 0.40);

    // C. Apply deterministic ceilings
    if (claim.authority === "PREDICTIVE_CONTEXT" || claim.isAdvisory) {
      if (calibratedConfidence > 0.40) {
        calibratedConfidence = 0.40;
        appliedCeilings.push("Predictive context ceiling (0.40)");
      }
    }

    if (isContradicted || claim.isContested) {
      if (calibratedConfidence > 0.35) {
        calibratedConfidence = 0.35;
        appliedCeilings.push("Contested contradiction ceiling (0.35)");
      }
    }

    if (uncertainty.causalAmbiguity > 0.6) {
      if (calibratedConfidence > 0.50) {
        calibratedConfidence = 0.50;
        appliedCeilings.push("Causal ambiguity ceiling (0.50)");
      }
    }

    if (claim.hopDepth === 1 && calibratedConfidence > 0.85) {
      calibratedConfidence = 0.85;
      appliedCeilings.push("Single-hop inference ceiling (0.85)");
    }

    if (claim.provenance.length === 0 && claim.epistemicState !== "UNKNOWN" && calibratedConfidence > 0.20) {
      calibratedConfidence = 0.20;
      appliedCeilings.push("Missing provenance ceiling (0.20)");
    }

    // Clamp strictly within [0.0, 1.0]
    calibratedConfidence = Math.min(1.0, Math.max(0.0, calibratedConfidence));

    // 4. Determine final EpistemicState
    let calibratedState: EpistemicState = claim.epistemicState;

    if (claim.isSuppressed || this.containsSensitiveData(claim.statement)) {
      calibratedState = "REJECTED";
      calibratedConfidence = 0.0;
    } else if (claim.epistemicState === "UNKNOWN") {
      calibratedState = "UNKNOWN";
      calibratedConfidence = 0.0;
    } else if (isContradicted || claim.isContested) {
      calibratedState = "CONTESTED";
    } else if (claim.authority === "PREDICTIVE_CONTEXT" || claim.isAdvisory) {
      calibratedState = "ADVISORY";
    } else if (
      uncertainty.overallUncertainty > 0.65 ||
      calibratedConfidence < 0.35 ||
      uncertainty.causalAmbiguity > 0.6
    ) {
      calibratedState = "UNCERTAIN";
    } else if (claim.authority === "CURRENT_TURN_EXPLICIT" || claim.authority === "VERIFIED_EVIDENCE") {
      calibratedState = "VERIFIED";
    } else if (claim.independentSupportCount >= 2 && calibratedConfidence >= 0.70) {
      calibratedState = "SUPPORTED";
    } else if (claim.hopDepth > 0 || claim.sourceType === "MULTI_HOP_CHAIN" || claim.sourceType === "CAUSAL_RELATION") {
      calibratedState = "INFERRED";
    } else if (
      claim.authority === "GOVERNANCE_APPROVED_MEMORY" ||
      claim.authority === "CONFIRMED_USER_MODEL" ||
      claim.authority === "ACTIVE_GOAL_PROJECT_COMMITMENT"
    ) {
      calibratedState = "KNOWN";
    }

    if (calibratedConfidence < originalConfidence) {
      diagnostics.confidenceDowngrades++;
    }
    if (uncertainty.overallUncertainty > claim.uncertainty.overallUncertainty) {
      diagnostics.uncertaintyIncreases++;
    }

    const confidenceLabel = this.getConfidenceLabel(calibratedConfidence);

    const calibratedClaim: EpistemicClaim = {
      ...claim,
      epistemicState: calibratedState,
      confidence: calibratedConfidence,
      confidenceLabel,
      uncertainty,
      calibrationReason:
        appliedCeilings.length > 0 || uncertaintyFactors.length > 0
          ? `Calibrated: ${[...appliedCeilings, ...uncertaintyFactors].join("; ")}`
          : claim.calibrationReason,
    };

    const record: EpistemicCalibrationRecord = {
      id: `cal_rec_${this.deterministicHash(claim.id + "_" + calibratedState)}`,
      claimId: claim.id,
      originalState,
      calibratedState,
      originalConfidence,
      calibratedConfidence,
      confidenceDelta: calibratedConfidence - originalConfidence,
      reason: calibratedClaim.calibrationReason,
      appliedCeilings,
      uncertaintyFactors,
    };

    return { calibratedClaim, record };
  }

  /**
   * Computes overall bounded uncertainty from dimensions.
   */
  private computeOverallUncertainty(u: EpistemicUncertainty): number {
    const raw =
      u.evidenceInsufficiency * 0.25 +
      u.sourceConflict * 0.25 +
      u.inferenceDepth * 0.15 +
      u.provenanceWeakness * 0.10 +
      u.temporalStaleness * 0.05 +
      u.scopeAmbiguity * 0.05 +
      u.topicAmbiguity * 0.05 +
      u.predictiveDependence * 0.05 +
      u.causalAmbiguity * 0.05;

    return Math.min(1.0, Math.max(0.0, raw));
  }

  /**
   * Synthesizes sanitized natural-language prompt directives from calibrated claims.
   * Strips all internal IDs, numeric scores, timestamps, and bracketed tags.
   */
  private synthesizeDirectives(
    claims: EpistemicClaim[],
    maxDirectives: number,
    diagnostics: EpistemicCalibrationDiagnostics
  ): string[] {
    const directives: string[] = [];

    for (const c of claims) {
      if (directives.length >= maxDirectives) break;
      if (c.epistemicState === "REJECTED" || c.isSuppressed) continue;

      const cleanStmt = this.sanitizeText(c.statement);
      if (cleanStmt.length === 0) continue;

      let directiveText = "";
      switch (c.epistemicState) {
        case "VERIFIED":
          directiveText = `[EPISTEMIC_CALIBRATION] The available verified evidence indicates that ${cleanStmt}.`;
          break;
        case "KNOWN":
          directiveText = `[EPISTEMIC_CALIBRATION] The available established context indicates that ${cleanStmt}.`;
          break;
        case "SUPPORTED":
          directiveText = `[EPISTEMIC_CALIBRATION] The available evidence supports that ${cleanStmt}.`;
          break;
        case "INFERRED":
          directiveText = `[EPISTEMIC_CALIBRATION] The available information suggests that ${cleanStmt}.`;
          break;
        case "UNCERTAIN":
          directiveText = `[EPISTEMIC_CALIBRATION] The available evidence is insufficient to determine this with confidence.`;
          break;
        case "CONTESTED":
          directiveText = `[EPISTEMIC_CALIBRATION] The available information contains conflicting evidence, so this conclusion remains unresolved.`;
          break;
        case "UNKNOWN":
          directiveText = `[EPISTEMIC_CALIBRATION] There is not enough authorized information to determine this.`;
          break;
        case "ADVISORY":
          directiveText = `[EPISTEMIC_CALIBRATION] This is an advisory possibility, not an established fact.`;
          break;
        default:
          continue;
      }

      if (directiveText && !directives.includes(directiveText)) {
        directives.push(directiveText);
        diagnostics.directivesSanitized++;
      }
    }

    return directives;
  }

  /**
   * Sanitizes text to remove internal IDs, UUIDs, numeric scores, tokens, and credentials.
   */
  private sanitizeText(text: string): string {
    if (!text) return "";
    return text
      .replace(/\b(?:ep|cal|hop|node|fact|proj|conflict|rec)_[0-9a-f_]+\b/gi, "")
      .replace(/\b(?:confidence|uncertainty|score|authority)=\s*[\d.]+\b/gi, "")
      .replace(/\[(?:CURRENT_TURN_EXPLICIT|VERIFIED_EVIDENCE|GOVERNANCE_APPROVED_MEMORY|PREDICTIVE_CONTEXT|ADVISORY|INFERRED|UNKNOWN)\]/gi, "")
      .replace(/\b(?:sk_live|ghp_|eyJh|bearer\s+)[A-Za-z0-9_\-.]+\b/gi, "[REDACTED]")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Checks if a string contains sensitive patterns (API keys, credentials, passwords).
   */
  private containsSensitiveData(text: string): boolean {
    if (!text) return false;
    const lower = text.toLowerCase();
    return (
      /\b(?:sk_live_[a-z0-9]+|ghp_[a-z0-9]+|eyj[a-z0-9_\-.]+\.[a-z0-9_\-.]+|bearer\s+[a-z0-9_\-.]+)\b/i.test(text) ||
      /\b(?:password|passwd|api_key|secret_key|private_key)\s*[:=]\s*["']?[a-z0-9!@#$%^&*()_+=-]{6,}["']?/i.test(text) ||
      lower.includes("private_key:") ||
      lower.includes("bearer token")
    );
  }

  /**
   * Checks if a key represents an unsupported identity/demographic assertion.
   */
  private isUnsupportedIdentityClaim(key: string): boolean {
    const lower = key.toLowerCase();
    return (
      lower.includes("salary") ||
      lower.includes("income") ||
      lower.includes("ethnicity") ||
      lower.includes("religion") ||
      lower.includes("health_status") ||
      lower.includes("medical_history")
    );
  }

  /**
   * Detects question syntax or intent.
   */
  private isQuestionIntent(message: string, primaryIntent?: string): boolean {
    if (primaryIntent === "QUESTION" || primaryIntent === "QUERY") return true;
    const trimmed = message.trim();
    if (trimmed.endsWith("?")) return true;
    return /^(?:what|when|where|who|why|how|is|are|can|could|would|should|will|do|does|did)\b/i.test(trimmed);
  }

  /**
   * Detects hypothetical or conditional phrasing.
   */
  private isHypotheticalOrConditional(message: string): boolean {
    return /\b(?:what if|suppose|imagine|hypothetically|assuming that|if\s+.+\s+then|in the event that)\b/i.test(message);
  }

  /**
   * Detects speculative phrasing.
   */
  private isSpeculation(message: string): boolean {
    return /\b(?:maybe|perhaps|possibly|i guess|i think maybe|might be|could be)\b/i.test(message);
  }

  /**
   * Detects assistant attribution.
   */
  private isAssistantAttribution(message: string): boolean {
    return /\b(?:you said|dora said|assistant said|you claimed|according to you)\b/i.test(message);
  }

  /**
   * Generates confidence band label.
   */
  private getConfidenceLabel(confidence: number): ConfidenceLabel {
    if (confidence >= 0.85) return "VERY_HIGH";
    if (confidence >= 0.70) return "HIGH";
    if (confidence >= 0.50) return "MODERATE";
    if (confidence >= 0.30) return "LOW";
    return "VERY_LOW";
  }

  /**
   * Creates default uncertainty object.
   */
  private createDefaultUncertainty(base: number): EpistemicUncertainty {
    const clamped = Math.min(1.0, Math.max(0.0, base));
    return {
      overallUncertainty: clamped,
      evidenceInsufficiency: clamped * 0.8,
      sourceConflict: 0.0,
      inferenceDepth: 0.0,
      provenanceWeakness: 0.0,
      temporalStaleness: 0.0,
      scopeAmbiguity: 0.0,
      topicAmbiguity: 0.0,
      predictiveDependence: 0.0,
      missingEvidence: 0.0,
      causalAmbiguity: 0.0,
    };
  }

  /**
   * Normalizes keys to lowercase alphanumeric tokens.
   */
  private normalizeKey(key: string): string {
    return key
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .trim();
  }

  /**
   * Deterministic 32-bit FNV-1a hash.
   */
  private deterministicHash(str: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }
}

export const epistemicCalibrationEngine = EpistemicCalibrationEngine.getInstance();
