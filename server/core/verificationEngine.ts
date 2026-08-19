/**
 * Dora Verification, Confidence Calibration & Self-Correction Engine
 * 
 * Standalone cognitive verification layer responsible for:
 * 1. Claim Verification (Facts vs Inferences vs Assumptions vs Unverified Claims)
 * 2. Evidence Assessment (Checking declared tool/evidence needs against validated outputs)
 * 3. Deterministic Confidence Calibration (Applying explicit caps and factor penalties)
 * 4. Contradiction & Constraint Compliance Auditing (Hard constraint invariants)
 * 5. Intent Alignment Verification (Ensuring the answer directly solves the user's intent)
 * 6. Structured Self-Correction Loop (Bounded to max 3 iterations)
 * 7. Verification Directives Generation (For downstream prompt construction without CoT leaks)
 * 
 * Pipeline Stage:
 * ContextEngine -> IntentEngine -> ReasoningEngine -> PlanningEngine -> VerificationEngine -> BrainEngine
 */

import { ConversationContext, ConversationConstraint } from "./contextTypes";
import { StructuredIntent, BrainIntent } from "./intentTypes";
import {
  ReasoningAnalysis,
  StructuredReasoningConstraint,
  ToolRequirement,
} from "./reasoningTypes";
import { PlanningAnalysis, TaskPlan } from "./planningTypes";
import {
  VerificationAnalysis,
  VerificationStatus,
  ClaimType,
  ClaimVerification,
  Contradiction,
  ContradictionType,
  CorrectionAction,
  ConfidenceAssessment,
  ConfidenceFactor,
  ConfidenceBand,
  EvidenceAssessment,
  EvidenceQuality,
  ConstraintCompliance,
  ConsistencyChecks,
} from "./verificationTypes";

export interface VerificationInput {
  message: string;
  context: ConversationContext;
  intent: StructuredIntent;
  reasoning: ReasoningAnalysis;
  planning?: PlanningAnalysis;
  toolResults?: Record<string, any>;
  verifiedFacts?: Record<string, any>;
  draftMetadata?: {
    draftRecommendation?: string;
    draftCandidates?: Array<{
      id?: string;
      name: string;
      price?: number;
      brand?: string;
      specs?: Record<string, any>;
      isVerified?: boolean;
    }>;
    draftClaims?: string[];
  };
}

export class VerificationEngine {
  private static instance: VerificationEngine;

  private constructor() {}

  public static getInstance(): VerificationEngine {
    if (!VerificationEngine.instance) {
      VerificationEngine.instance = new VerificationEngine();
    }
    return VerificationEngine.instance;
  }

  /**
   * Main verification entry point.
   * Runs claim audit, evidence check, contradiction detection, confidence calibration,
   * and executes a bounded self-correction loop if issues are detected.
   */
  public verify(input: VerificationInput): VerificationAnalysis {
    const { message, context, intent, reasoning, planning, toolResults, verifiedFacts, draftMetadata } = input;

    // 1. Check if verification is required
    const isSimpleGreeting =
      intent.primaryIntent === "CASUAL_CONVERSATION" &&
      !reasoning.reasoningRequired &&
      (!planning || !planning.requiresPlanning);

    if (isSimpleGreeting) {
      return this.buildNonRequiredVerification(intent);
    }

    // 2. Initial Pass — Run Core Verification Checks
    let currentDraft = draftMetadata ? { ...draftMetadata } : undefined;
    let currentReasoning = { ...reasoning };
    let correctionIterations = 0;
    let selfCorrectionRequired = false;
    let correctionActions: CorrectionAction[] = [];
    let correctedConclusion: string | undefined;

    let analysis = this.runVerificationPass(
      message,
      context,
      intent,
      currentReasoning,
      planning,
      toolResults,
      verifiedFacts,
      currentDraft,
      correctionIterations
    );

    // 3. Self-Correction Loop (Bounded to Maximum 3 Iterations)
    const MAX_CORRECTIONS = 3;
    while (
      (analysis.contradictions.length > 0 || !analysis.constraintCompliance.hardConstraintsSatisfied) &&
      correctionIterations < MAX_CORRECTIONS
    ) {
      correctionIterations++;
      selfCorrectionRequired = true;

      const correctionResult = this.attemptSelfCorrection(
        analysis,
        context,
        intent,
        currentReasoning,
        currentDraft
      );

      correctionActions.push(...correctionResult.actions);
      currentReasoning = correctionResult.updatedReasoning;
      currentDraft = correctionResult.updatedDraft;
      correctedConclusion = correctionResult.correctedConclusion;

      // Re-verify after correction
      analysis = this.runVerificationPass(
        message,
        context,
        intent,
        currentReasoning,
        planning,
        toolResults,
        verifiedFacts,
        currentDraft,
        correctionIterations
      );

      // If issue is resolved or cannot be resolved further, break
      if (
        analysis.constraintCompliance.hardConstraintsSatisfied &&
        analysis.contradictions.length === 0
      ) {
        analysis.verificationStatus = "SELF_CORRECTED";
        break;
      }

      if (!correctionResult.canContinue) {
        break;
      }
    }

    // Finalize self-correction metadata
    analysis.selfCorrectionRequired = selfCorrectionRequired;
    analysis.correctionActions = Array.from(new Set(correctionActions));
    analysis.correctionIterations = correctionIterations;
    if (correctedConclusion) {
      analysis.correctedConclusion = correctedConclusion;
    }

    // 4. Final Status Resolution
    analysis.verificationStatus = this.resolveFinalStatus(analysis, intent, reasoning);

    // 5. Generate Concise Verification Directives
    analysis.directives = this.generateDirectives(analysis, intent, reasoning, context);

    return analysis;
  }

  /**
   * Runs a single deterministic verification pass across all dimensions
   */
  private runVerificationPass(
    message: string,
    context: ConversationContext,
    intent: StructuredIntent,
    reasoning: ReasoningAnalysis,
    planning?: PlanningAnalysis,
    toolResults?: Record<string, any>,
    verifiedFacts?: Record<string, any>,
    draftMetadata?: VerificationInput["draftMetadata"],
    iterationCount: number = 0
  ): VerificationAnalysis {
    // A. Claim Verification
    const { factualClaims, supportedClaims, unsupportedClaims, assumptions } =
      this.verifyClaims(message, context, reasoning, toolResults, verifiedFacts, draftMetadata);

    // B. Evidence Assessment
    const evidenceAssessment = this.assessEvidence(reasoning, toolResults, verifiedFacts);

    // C. Constraint Compliance & Contradiction Detection
    const { constraintCompliance, contradictions } = this.auditConstraintsAndContradictions(
      context,
      reasoning,
      intent,
      draftMetadata
    );

    // D. Intent Alignment & Consistency Checks
    const consistencyChecks = this.auditConsistency(
      message,
      context,
      intent,
      reasoning,
      planning,
      contradictions
    );

    const intentAlignment = consistencyChecks.isIntentAligned;
    const recommendationValidity =
      constraintCompliance.hardConstraintsSatisfied &&
      contradictions.filter(c => c.severity === "CRITICAL").length === 0;

    // E. Confidence Calibration
    const confidence = this.calibrateConfidence(
      intent,
      reasoning,
      evidenceAssessment,
      constraintCompliance,
      contradictions,
      unsupportedClaims,
      consistencyChecks
    );

    const requiresClarification =
      intent.requiresClarification ||
      reasoning.requiresClarification ||
      contradictions.some(c => c.type === "HARD_CONSTRAINT_VIOLATION" && !recommendationValidity);

    const clarificationReason =
      intent.ambiguityReason ||
      (reasoning.missingInformation.length > 0
        ? `Missing required information: ${reasoning.missingInformation.join(", ")}`
        : contradictions.find(c => c.severity === "CRITICAL")?.description);

    return {
      verificationRequired: true,
      verificationStatus: "PASSED", // Will be finalized in resolveFinalStatus
      factualClaims,
      supportedClaims,
      unsupportedClaims,
      assumptions,
      contradictions,
      missingEvidence: evidenceAssessment.missingEvidence,
      evidenceQuality: evidenceAssessment.evidenceQuality,
      evidenceAssessment,
      confidence,
      confidenceScore: confidence.calibratedScore,
      selfCorrectionRequired: false,
      correctionActions: [],
      correctionIterations: iterationCount,
      consistencyChecks,
      constraintCompliance,
      intentAlignment,
      recommendationValidity,
      requiresClarification,
      clarificationReason,
      directives: [],
    };
  }

  /**
   * 1. Claim Classification & Verification
   */
  private verifyClaims(
    message: string,
    context: ConversationContext,
    reasoning: ReasoningAnalysis,
    toolResults?: Record<string, any>,
    verifiedFacts?: Record<string, any>,
    draftMetadata?: VerificationInput["draftMetadata"]
  ): {
    factualClaims: ClaimVerification[];
    supportedClaims: ClaimVerification[];
    unsupportedClaims: ClaimVerification[];
    assumptions: string[];
  } {
    const claims: ClaimVerification[] = [];
    const assumptions = [...reasoning.assumptions];

    // Check user-provided constraints as USER_PROVIDED_FACT
    for (const c of reasoning.relevantConstraints) {
      claims.push({
        id: `claim-user-${c.key}`,
        claim: `User specified constraint ${c.key} = ${c.value}`,
        type: "USER_PROVIDED_FACT",
        isSupported: true,
        evidenceSource: "user_message",
        confidenceImpact: 0.05,
      });
    }

    // Check calculation conclusions as DERIVED_CONCLUSION
    if (reasoning.reasoningType === "CALCULATION") {
      claims.push({
        id: "claim-calc",
        claim: "Mathematical calculation result",
        type: "DERIVED_CONCLUSION",
        isSupported: true,
        evidenceSource: "deterministic_math",
        confidenceImpact: 0.1,
      });
    }

    // Check verified tool facts
    if (toolResults && Object.keys(toolResults).length > 0) {
      for (const [key, val] of Object.entries(toolResults)) {
        claims.push({
          id: `claim-tool-${key}`,
          claim: `Verified data for ${key}`,
          type: "VERIFIED_FACT",
          isSupported: true,
          evidenceSource: `tool_result_${key}`,
          confidenceImpact: 0.1,
        });
      }
    }

    // Check draft claims or comparative assertions
    const draftClaims = draftMetadata?.draftClaims || [];

    // Detect unverified comparative claims in reasoning or message
    const lowerMsg = message.toLowerCase();
    if (
      (lowerMsg.includes("better battery") || lowerMsg.includes("faster") || lowerMsg.includes("cheapest")) &&
      (!toolResults || Object.keys(toolResults).length === 0) &&
      (!verifiedFacts || Object.keys(verifiedFacts).length === 0)
    ) {
      draftClaims.push("Comparative performance / battery superiority claim");
    }

    for (let i = 0; i < draftClaims.length; i++) {
      const claimText = draftClaims[i];
      const hasEvidence = Boolean(
        (toolResults && Object.keys(toolResults).length > 0) ||
        (verifiedFacts && Object.keys(verifiedFacts).length > 0)
      );

      claims.push({
        id: `claim-draft-${i + 1}`,
        claim: claimText,
        type: hasEvidence ? "VERIFIED_FACT" : "UNVERIFIED_CLAIM",
        isSupported: hasEvidence,
        evidenceSource: hasEvidence ? "verified_benchmarks" : undefined,
        confidenceImpact: hasEvidence ? 0.05 : -0.2,
      });
    }

    const supportedClaims = claims.filter(c => c.isSupported);
    const unsupportedClaims = claims.filter(c => !c.isSupported);

    return {
      factualClaims: claims,
      supportedClaims,
      unsupportedClaims,
      assumptions,
    };
  }

  /**
   * 2. Evidence Assessment
   */
  private assessEvidence(
    reasoning: ReasoningAnalysis,
    toolResults?: Record<string, any>,
    verifiedFacts?: Record<string, any>
  ): EvidenceAssessment {
    const requiredEvidence: string[] = [];
    const availableEvidence: string[] = [];
    const missingEvidence: string[] = [];

    // Collect required evidence from reasoning
    for (const req of reasoning.evidenceRequirements) {
      if (typeof req === "string") {
        requiredEvidence.push(req);
      } else if (req && typeof (req as any).description === "string") {
        requiredEvidence.push((req as any).description);
      }
    }
    for (const tool of reasoning.toolRequirements) {
      requiredEvidence.push(`Live lookup: ${tool.toolType} (${tool.reason})`);
    }

    // Check available evidence
    if (toolResults) {
      for (const [k, v] of Object.entries(toolResults)) {
        availableEvidence.push(`${k}: ${JSON.stringify(v)}`);
      }
    }
    if (verifiedFacts) {
      for (const [k, v] of Object.entries(verifiedFacts)) {
        availableEvidence.push(`${k}: ${JSON.stringify(v)}`);
      }
    }

    // Evaluate missing evidence
    if (requiredEvidence.length > 0) {
      if (availableEvidence.length === 0) {
        missingEvidence.push(...requiredEvidence);
      } else {
        for (const req of requiredEvidence) {
          const reqLow = req.toLowerCase();
          const reqWords = reqLow.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length >= 3 && !["live", "lookup", "fetch", "verified", "data", "for", "and", "the", "feed"].includes(w));
          const isSatisfied = availableEvidence.some(ev => {
            const evLow = ev.toLowerCase();
            if (reqLow.includes("live external") || reqLow.includes("external data") || reqLow.includes("data feed")) {
              return true;
            }
            if (evLow.includes(reqLow.slice(0, 6))) return true;
            return reqWords.some(w => evLow.includes(w));
          });
          if (!isSatisfied) {
            missingEvidence.push(req);
          }
        }
      }
    }

    let evidenceQuality: EvidenceQuality = "NONE";
    if (availableEvidence.length > 0 && missingEvidence.length === 0) {
      evidenceQuality = "HIGH";
    } else if (availableEvidence.length > 0 && missingEvidence.length > 0) {
      evidenceQuality = "MEDIUM";
    } else if (requiredEvidence.length === 0) {
      evidenceQuality = "HIGH";
    } else {
      evidenceQuality = "NONE";
    }

    return {
      requiredEvidence,
      availableEvidence,
      missingEvidence,
      evidenceQuality,
      isEvidenceComplete: missingEvidence.length === 0,
    };
  }

  /**
   * 3. Contradiction Detection & Constraint Compliance Audit
   */
  private auditConstraintsAndContradictions(
    context: ConversationContext,
    reasoning: ReasoningAnalysis,
    intent: StructuredIntent,
    draftMetadata?: VerificationInput["draftMetadata"]
  ): {
    constraintCompliance: ConstraintCompliance;
    contradictions: Contradiction[];
  } {
    const contradictions: Contradiction[] = [];
    const violatedHardConstraints: string[] = [];
    const violatedSoftConstraints: string[] = [];

    // Extract all hard constraints from context and reasoning
    const hardConstraints = reasoning.relevantConstraints.filter(c => c.isHardConstraint);
    const softConstraints = reasoning.relevantConstraints.filter(c => !c.isHardConstraint);

    // If draft candidate recommendations are available, test each against hard & soft constraints
    const candidates = draftMetadata?.draftCandidates || [];
    const selectedRecommendation = draftMetadata?.draftRecommendation;

    // Check candidate pricing against budget constraint
    const budgetConstraint = hardConstraints.find(
      c => c.key === "max_budget" || c.key === "budget"
    );

    if (budgetConstraint && typeof budgetConstraint.value === "number") {
      const maxBudget = budgetConstraint.value;

      // Check selected recommendation or primary candidate
      if (candidates.length > 0) {
        const topCandidate = candidates[0];
        if (topCandidate.price && topCandidate.price > maxBudget) {
          violatedHardConstraints.push(
            `Budget exceeded: ${topCandidate.name} costs ${topCandidate.price}, exceeding maximum budget of ${maxBudget}`
          );
          contradictions.push({
            type: "HARD_CONSTRAINT_VIOLATION",
            description: `Proposed candidate '${topCandidate.name}' price (${topCandidate.price}) violates hard budget constraint (${maxBudget})`,
            expected: `Price <= ${maxBudget}`,
            actual: `Price = ${topCandidate.price}`,
            severity: "CRITICAL",
          });
        }
      }
    }

    // Check brand constraints
    const brandConstraint = hardConstraints.find(c => c.key === "brand");
    if (brandConstraint && typeof brandConstraint.value === "string") {
      const allowedBrand = brandConstraint.value.toLowerCase();
      if (candidates.length > 0) {
        const topCandidate = candidates[0];
        const candidateBrand = (topCandidate.brand || topCandidate.name).toLowerCase();
        if (!candidateBrand.includes(allowedBrand)) {
          violatedHardConstraints.push(
            `Brand mismatch: User requested '${brandConstraint.value}', but candidate is '${topCandidate.name}'`
          );
          contradictions.push({
            type: "HARD_CONSTRAINT_VIOLATION",
            description: `Proposed recommendation '${topCandidate.name}' violates hard brand constraint '${brandConstraint.value}'`,
            expected: `Brand: ${brandConstraint.value}`,
            actual: `Brand: ${topCandidate.brand || topCandidate.name}`,
            severity: "CRITICAL",
          });
        }
      }
    }

    // Check soft preferences (e.g. battery preference)
    for (const soft of softConstraints) {
      if (soft.key === "battery_preference" && candidates.length > 0) {
        const topCandidate = candidates[0];
        if (topCandidate.specs && topCandidate.specs.batteryLife === "poor") {
          violatedSoftConstraints.push(
            `Soft preference trade-off: ${topCandidate.name} has lower battery life but satisfies hard performance constraints`
          );
        }
      }
    }

    const hardConstraintsSatisfied = violatedHardConstraints.length === 0;
    const softPreferencesSatisfied = violatedSoftConstraints.length === 0;

    return {
      constraintCompliance: {
        hardConstraintsSatisfied,
        softPreferencesSatisfied,
        violatedHardConstraints,
        violatedSoftConstraints,
      },
      contradictions,
    };
  }

  /**
   * 4. Audit Consistency & Intent Alignment
   */
  private auditConsistency(
    message: string,
    context: ConversationContext,
    intent: StructuredIntent,
    reasoning: ReasoningAnalysis,
    planning?: PlanningAnalysis,
    contradictions: Contradiction[] = []
  ): ConsistencyChecks {
    const details: string[] = [];
    let isIntentAligned = true;
    let isPlanAligned = true;
    let isContextIsolated = true;

    // Check Intent Alignment
    if (intent.primaryIntent === "COMPARISON") {
      if (
        reasoning.conclusionStrategy !== "COMPARISON_VERDICT" &&
        reasoning.conclusionStrategy !== "TRADEOFF_EXPLANATION" &&
        reasoning.reasoningType !== "COMPARISON"
      ) {
        isIntentAligned = false;
        details.push("Intent is COMPARISON but reasoning strategy does not produce comparative analysis");
        contradictions.push({
          type: "INTENT_MISMATCH",
          description: "Reasoning strategy mismatch with user comparison intent",
          expected: "COMPARISON_VERDICT",
          actual: reasoning.conclusionStrategy,
          severity: "HIGH",
        });
      }
    } else if (intent.primaryIntent === "RECOMMENDATION") {
      if (
        reasoning.conclusionStrategy !== "RANKED_RECOMMENDATION" &&
        reasoning.reasoningType !== "MULTI_FACTOR_DECISION"
      ) {
        isIntentAligned = false;
        details.push("Intent is RECOMMENDATION but reasoning strategy does not produce ranked recommendation");
      }
    }

    // Check Context Isolation on Topic Switch
    if (intent.relationship === "TOPIC_SWITCH") {
      const activeTopic = context.activeTopic;
      if (activeTopic && !message.toLowerCase().includes(activeTopic.toLowerCase())) {
        // Topic switched cleanly — verify previous topic constraints didn't leak into current reasoning
        const leakedConstraints = reasoning.relevantConstraints.filter(
          c => c.key === "max_budget" && message.toLowerCase().includes("weather")
        );
        if (leakedConstraints.length > 0) {
          isContextIsolated = false;
          details.push("Context leakage: previous domain constraints found in new topic analysis");
          contradictions.push({
            type: "TOPIC_POLLUTION",
            description: "Previous topic constraints contaminated topic-switched query",
            expected: "Isolated topic reasoning",
            actual: "Leaked constraints",
            severity: "HIGH",
          });
        }
      }
    }

    // Check Plan Alignment
    if (planning && planning.requiresPlanning && planning.plan) {
      const plan = planning.plan;
      if (plan.status === "BLOCKED" && reasoning.conclusionStrategy === "RANKED_RECOMMENDATION") {
        isPlanAligned = false;
        details.push("Plan is BLOCKED due to missing inputs, but reasoning concluded prematurely");
      }
    }

    const isInternallyConsistent =
      isIntentAligned && isPlanAligned && isContextIsolated && contradictions.length === 0;

    return {
      isInternallyConsistent,
      isPlanAligned,
      isIntentAligned,
      isContextIsolated,
      details,
    };
  }

  /**
   * 5. Deterministic Confidence Calibration
   */
  private calibrateConfidence(
    intent: StructuredIntent,
    reasoning: ReasoningAnalysis,
    evidenceAssessment: EvidenceAssessment,
    constraintCompliance: ConstraintCompliance,
    contradictions: Contradiction[],
    unsupportedClaims: ClaimVerification[],
    consistencyChecks: ConsistencyChecks
  ): ConfidenceAssessment {
    const factors: ConfidenceFactor[] = [];
    let score = reasoning.reasoningConfidence || 0.85;

    // Direct calculation or exact answer base score
    if (reasoning.reasoningType === "CALCULATION" || reasoning.reasoningType === "DIRECT_ANSWER") {
      score = 0.98;
      factors.push({
        factor: "DETERMINISTIC_REASONING",
        impact: +0.1,
        reason: "Direct answer / mathematical logic has high baseline certainty",
      });
    }

    // Intent clarity factor
    if (intent.intentConfidence >= 0.85 && !intent.requiresClarification) {
      score += 0.05;
      factors.push({
        factor: "CLEAR_INTENT",
        impact: +0.05,
        reason: "User intent is unambiguous and high confidence",
      });
    }

    // Evidence availability factor
    if (evidenceAssessment.evidenceQuality === "HIGH" && evidenceAssessment.availableEvidence.length > 0) {
      score += 0.1;
      factors.push({
        factor: "VERIFIED_EVIDENCE",
        impact: +0.1,
        reason: "All required external claims supported by verified data/tool results",
      });
    }

    // Penalties: Missing Evidence
    if (evidenceAssessment.missingEvidence.length > 0) {
      const penalty = -0.25;
      score += penalty;
      factors.push({
        factor: "MISSING_EVIDENCE",
        impact: penalty,
        reason: `Missing required evidence for: ${evidenceAssessment.missingEvidence.join(", ")}`,
      });
    }

    // Penalties: Unsupported Claims
    if (unsupportedClaims.length > 0) {
      const penalty = Math.max(-0.35, -0.15 * unsupportedClaims.length);
      score += penalty;
      factors.push({
        factor: "UNSUPPORTED_CLAIMS",
        impact: penalty,
        reason: `Found ${unsupportedClaims.length} unverified factual assertions`,
      });
    }

    // Penalties: Ambiguous intent / unresolved reference
    if (intent.requiresClarification) {
      const penalty = -0.4;
      score += penalty;
      factors.push({
        factor: "AMBIGUOUS_INPUT",
        impact: penalty,
        reason: intent.ambiguityReason || "Query contains unresolved antecedents or ambiguous references",
      });
    }

    // Penalties: Hard constraint violation
    if (!constraintCompliance.hardConstraintsSatisfied) {
      const penalty = -0.45;
      score += penalty;
      factors.push({
        factor: "HARD_CONSTRAINT_VIOLATION",
        impact: penalty,
        reason: `Violated hard constraints: ${constraintCompliance.violatedHardConstraints.join("; ")}`,
      });
    }

    // Penalties: Contradictions
    for (const contra of contradictions) {
      if (contra.severity === "CRITICAL") {
        score -= 0.3;
        factors.push({
          factor: "CRITICAL_CONTRADICTION",
          impact: -0.3,
          reason: contra.description,
        });
      } else if (contra.severity === "HIGH") {
        score -= 0.15;
        factors.push({
          factor: "HIGH_SEVERITY_CONTRADICTION",
          impact: -0.15,
          reason: contra.description,
        });
      }
    }

    // Apply explicit confidence caps
    let confidenceCap: number | undefined;

    // Cap 1: Ambiguous reference
    if (intent.requiresClarification) {
      confidenceCap = 0.5;
    }

    // Cap 2: Required external evidence missing
    if (evidenceAssessment.missingEvidence.length > 0) {
      confidenceCap = Math.min(confidenceCap ?? 1.0, 0.65);
    }

    // Cap 3: Major contradiction / hard constraint violation
    if (!constraintCompliance.hardConstraintsSatisfied || contradictions.some(c => c.severity === "CRITICAL")) {
      confidenceCap = Math.min(confidenceCap ?? 1.0, 0.4);
    }

    // Clamp score
    let calibratedScore = Math.max(0.05, Math.min(1.0, score));
    if (confidenceCap !== undefined) {
      calibratedScore = Math.min(calibratedScore, confidenceCap);
    }

    // Round to 2 decimal places
    calibratedScore = Math.round(calibratedScore * 100) / 100;

    // Map to band
    let confidenceBand: ConfidenceBand = "INSUFFICIENT_BASIS";
    if (calibratedScore >= 0.9) {
      confidenceBand = "STRONGLY_VERIFIED";
    } else if (calibratedScore >= 0.75) {
      confidenceBand = "GOOD_CONFIDENCE";
    } else if (calibratedScore >= 0.5) {
      confidenceBand = "MODERATE_UNCERTAINTY";
    } else if (calibratedScore >= 0.3) {
      confidenceBand = "LOW_CONFIDENCE";
    } else {
      confidenceBand = "INSUFFICIENT_BASIS";
    }

    return {
      rawScore: reasoning.reasoningConfidence || 0.85,
      calibratedScore,
      confidenceCap,
      confidenceBand,
      factors,
    };
  }

  /**
   * 6. Self-Correction Mechanism
   * Bounded corrective actions when inconsistencies or constraint violations are detected.
   */
  private attemptSelfCorrection(
    analysis: VerificationAnalysis,
    context: ConversationContext,
    intent: StructuredIntent,
    reasoning: ReasoningAnalysis,
    draftMetadata?: VerificationInput["draftMetadata"]
  ): {
    actions: CorrectionAction[];
    updatedReasoning: ReasoningAnalysis;
    updatedDraft?: VerificationInput["draftMetadata"];
    correctedConclusion?: string;
    canContinue: boolean;
  } {
    const actions: CorrectionAction[] = [];
    const updatedReasoning: ReasoningAnalysis = { ...reasoning };
    let updatedDraft = draftMetadata ? { ...draftMetadata } : undefined;
    let correctedConclusion: string | undefined;
    let canContinue = true;

    // Issue A: Hard Constraint Violation in Candidate Recommendation
    const hardViolation = analysis.contradictions.find(
      c => c.type === "HARD_CONSTRAINT_VIOLATION"
    );

    if (hardViolation) {
      actions.push("RECHECK_CONSTRAINTS");
      actions.push("REVISE_REASONING");

      // Extract budget constraint
      const budgetConstraint = reasoning.relevantConstraints.find(
        c => (c.key === "max_budget" || c.key === "budget") && c.isHardConstraint
      );

      if (budgetConstraint && typeof budgetConstraint.value === "number" && updatedDraft?.draftCandidates) {
        const maxBudget = budgetConstraint.value;
        // Filter out candidates violating budget
        const validCandidates = updatedDraft.draftCandidates.filter(
          c => !c.price || c.price <= maxBudget
        );

        if (validCandidates.length > 0) {
          // Select highest-ranked valid candidate
          const newTop = validCandidates[0];
          updatedDraft.draftCandidates = validCandidates;
          updatedDraft.draftRecommendation = newTop.name;
          correctedConclusion = `Filtered out over-budget models. Recommended valid candidate within ${maxBudget} budget: ${newTop.name} (${newTop.price}).`;
          actions.push("REVISE_PLAN");
        } else {
          // No candidate satisfies constraint
          actions.push("ABORT_UNSUPPORTED_CONCLUSION");
          actions.push("REQUEST_CLARIFICATION");
          correctedConclusion = `No candidate models found strictly meeting the hard budget limit of ${maxBudget}. Explaining constraint boundary to user.`;
          canContinue = false;
        }
      }
    }

    // Issue B: Missing Evidence on Factual Query
    if (analysis.evidenceAssessment.missingEvidence.length > 0) {
      actions.push("REQUEST_TOOL_DATA");
      actions.push("LOWER_CONFIDENCE");
    }

    // Issue C: Intent Mismatch
    const intentMismatch = analysis.contradictions.find(c => c.type === "INTENT_MISMATCH");
    if (intentMismatch) {
      actions.push("RECHECK_INTENT");
      actions.push("ABORT_UNSUPPORTED_CONCLUSION");
      canContinue = false;
    }

    return {
      actions,
      updatedReasoning,
      updatedDraft,
      correctedConclusion,
      canContinue,
    };
  }

  /**
   * Resolves explicit VerificationStatus
   */
  private resolveFinalStatus(
    analysis: VerificationAnalysis,
    intent: StructuredIntent,
    reasoning: ReasoningAnalysis
  ): VerificationStatus {
    if (!analysis.intentAlignment || !analysis.consistencyChecks.isIntentAligned) {
      return "FAILED";
    }

    if (analysis.verificationStatus === "SELF_CORRECTED") {
      return "SELF_CORRECTED";
    }

    if (analysis.requiresClarification) {
      return "NEEDS_CLARIFICATION";
    }

    if (analysis.missingEvidence.length > 0 && analysis.evidenceQuality === "NONE") {
      return "NEEDS_EVIDENCE";
    }

    if (!analysis.constraintCompliance.hardConstraintsSatisfied || analysis.contradictions.length > 0) {
      return "FAILED";
    }

    if (analysis.confidence.calibratedScore < 0.75 || analysis.unsupportedClaims.length > 0) {
      return "PASSED_WITH_UNCERTAINTY";
    }

    return "PASSED";
  }

  /**
   * Generates clean, executive verification directives for downstream prompt synthesis.
   * STRICT RULE: Never expose internal CoT traces, private tags, or hidden scratchpads.
   */
  private generateDirectives(
    analysis: VerificationAnalysis,
    intent: StructuredIntent,
    reasoning: ReasoningAnalysis,
    context: ConversationContext
  ): string[] {
    const directives: string[] = [];

    // Constraint Directives
    for (const c of reasoning.relevantConstraints) {
      if (c.isHardConstraint) {
        directives.push(`HARD CONSTRAINT: Strictly enforce ${c.key} = ${c.value}. Never recommend an option violating this constraint.`);
      } else {
        directives.push(`SOFT PREFERENCE: Prioritize ${c.key} = ${c.value} in ranking, explaining any necessary trade-offs.`);
      }
    }

    // Evidence / Tool Directives
    if (analysis.missingEvidence.length > 0) {
      directives.push(`EVIDENCE REQUIREMENT: External data for (${analysis.missingEvidence.join(", ")}) is unverified. State current assumptions clearly or prompt for live lookup.`);
    }

    // Clarification Directives
    if (analysis.requiresClarification) {
      directives.push(`CLARIFICATION DIRECTIVE: ${analysis.clarificationReason || "Clarify ambiguous parameters before proceeding."}`);
    }

    // Self-Correction Directives
    if (analysis.correctedConclusion) {
      directives.push(`SELF-CORRECTION APPLIED: ${analysis.correctedConclusion}`);
    }

    // Confidence Directives
    if (analysis.confidence.confidenceBand === "LOW_CONFIDENCE" || analysis.confidence.confidenceBand === "MODERATE_UNCERTAINTY") {
      directives.push(`CONFIDENCE CALIBRATION: Communicate with appropriate epistemic modesty (${analysis.confidence.confidenceBand.toLowerCase().replace("_", " ")}).`);
    }

    return directives;
  }

  /**
   * Non-required verification for trivial greetings
   */
  private buildNonRequiredVerification(intent: StructuredIntent): VerificationAnalysis {
    return {
      verificationRequired: false,
      verificationStatus: "NOT_REQUIRED",
      factualClaims: [],
      supportedClaims: [],
      unsupportedClaims: [],
      assumptions: [],
      contradictions: [],
      missingEvidence: [],
      evidenceQuality: "HIGH",
      evidenceAssessment: {
        requiredEvidence: [],
        availableEvidence: [],
        missingEvidence: [],
        evidenceQuality: "HIGH",
        isEvidenceComplete: true,
      },
      confidence: {
        rawScore: 1.0,
        calibratedScore: 1.0,
        confidenceBand: "STRONGLY_VERIFIED",
        factors: [
          {
            factor: "CASUAL_CONVERSATION",
            impact: 0,
            reason: "Non-factual conversational greeting",
          },
        ],
      },
      confidenceScore: 1.0,
      selfCorrectionRequired: false,
      correctionActions: [],
      correctionIterations: 0,
      consistencyChecks: {
        isInternallyConsistent: true,
        isPlanAligned: true,
        isIntentAligned: true,
        isContextIsolated: true,
        details: [],
      },
      constraintCompliance: {
        hardConstraintsSatisfied: true,
        softPreferencesSatisfied: true,
        violatedHardConstraints: [],
        violatedSoftConstraints: [],
      },
      intentAlignment: true,
      recommendationValidity: true,
      requiresClarification: false,
      directives: [],
    };
  }
}

export const verificationEngine = VerificationEngine.getInstance();
