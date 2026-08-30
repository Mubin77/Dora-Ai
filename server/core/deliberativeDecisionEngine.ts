/**
 * Dora Deliberative Decision & Action Planning Engine
 * Phase 3 — Step 8
 * 
 * Deterministic, bounded, non-LLM engine that evaluates candidate decisions and action plans.
 * Authority-aware, epistemically calibrated, constraint-safe, goal-aligned,
 * contradiction-aware, causally grounded, simulation-aware, and meta-reasoning-checked.
 */

import {
  DecisionState,
  DecisionRecommendationType,
  DecisionCandidateSource,
  DecisionReversibility,
  DecisionCriterionType,
  DecisionCriterionStatus,
  DecisionRiskCategory,
  DecisionTradeoffState,
  DecisionRisk,
  DecisionTradeoff,
  GoalAlignmentEvaluation,
  DecisionEvidenceRef,
  DecisionConstraintRef,
  DecisionUncertainty,
  DecisionCandidate,
  DecisionCriterionScore,
  DecisionEvaluation,
  DecisionRanking,
  DecisionStep,
  DecisionPlan,
  DecisionRecommendation,
  DecisionProvenance,
  DecisionBudgetConfig,
  DEFAULT_DECISION_BUDGET,
  HARD_CEILING_DECISION_BUDGET,
  DecisionDiagnostics,
  DecisionAnalysis,
  DecisionEngineOptions,
  DecisionEngineInput,
} from "./deliberativeDecisionTypes";
import { EpistemicAuthority, EpistemicState, EpistemicScope } from "./epistemicCalibrationTypes";
import { MetaCritiqueSeverity } from "./metaReasoningTypes";

/**
 * Authority Precedence Weight Table
 */
const AUTHORITY_WEIGHTS: Record<EpistemicAuthority, number> = {
  CURRENT_TURN_EXPLICIT: 1.00,
  HARD_CONSTRAINT: 0.98,
  VERIFIED_EVIDENCE: 0.95,
  GOVERNANCE_APPROVED_MEMORY: 0.90,
  CONFIRMED_USER_MODEL: 0.85,
  ACTIVE_GOAL_PROJECT_COMMITMENT: 0.80,
  TEMPORAL_CONTEXT: 0.60,
  CONFIRMED_ADAPTIVE_PATTERN: 0.50,
  PREDICTIVE_CONTEXT: 0.30,
  SYSTEM_DEFAULT: 0.20,
};

/**
 * Epistemic State Quality Weights
 */
const EPISTEMIC_STATE_WEIGHTS: Record<EpistemicState, number> = {
  VERIFIED: 1.00,
  KNOWN: 0.95,
  SUPPORTED: 0.80,
  INFERRED: 0.60,
  ADVISORY: 0.40,
  UNCERTAIN: 0.30,
  CONTESTED: 0.20,
  UNKNOWN: 0.10,
  REJECTED: 0.00,
};

/**
 * Reversibility Rank Ordering
 */
const REVERSIBILITY_SCORES: Record<DecisionReversibility, number> = {
  REVERSIBLE: 1.00,
  PARTIALLY_REVERSIBLE: 0.60,
  UNKNOWN: 0.40,
  IRREVERSIBLE: 0.10,
};

/**
 * State Rank Ordering for Lexicographical Sorting
 */
const STATE_TIERS: Record<DecisionState, number> = {
  READY: 5,
  READY_WITH_WARNINGS: 4,
  CONDITIONAL: 3,
  INSUFFICIENT_INFORMATION: 2,
  BLOCKED: 1,
  REJECTED: 0,
};

export class DeliberativeDecisionEngine {
  /**
   * Deterministic 32-bit FNV-1a Hash
   */
  private hashString(str: string): string {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  /**
   * Clamps and normalizes a float between 0 and 1
   */
  private clamp01(val: number): number {
    if (Number.isNaN(val) || !Number.isFinite(val)) return 0;
    return Math.max(0, Math.min(1, Math.round(val * 1000) / 1000));
  }

  /**
   * Budget resolution with hard ceiling enforcement
   */
  private resolveBudget(config?: DecisionBudgetConfig): Required<DecisionBudgetConfig> {
    return {
      maxCandidates: Math.min(
        HARD_CEILING_DECISION_BUDGET.maxCandidates,
        Math.max(1, config?.maxCandidates ?? DEFAULT_DECISION_BUDGET.maxCandidates)
      ),
      maxCriteria: Math.min(
        HARD_CEILING_DECISION_BUDGET.maxCriteria,
        Math.max(1, config?.maxCriteria ?? DEFAULT_DECISION_BUDGET.maxCriteria)
      ),
      maxEvidenceRefs: Math.min(
        HARD_CEILING_DECISION_BUDGET.maxEvidenceRefs,
        Math.max(1, config?.maxEvidenceRefs ?? DEFAULT_DECISION_BUDGET.maxEvidenceRefs)
      ),
      maxRisks: Math.min(
        HARD_CEILING_DECISION_BUDGET.maxRisks,
        Math.max(1, config?.maxRisks ?? DEFAULT_DECISION_BUDGET.maxRisks)
      ),
      maxTradeoffs: Math.min(
        HARD_CEILING_DECISION_BUDGET.maxTradeoffs,
        Math.max(1, config?.maxTradeoffs ?? DEFAULT_DECISION_BUDGET.maxTradeoffs)
      ),
      maxPlanSteps: Math.min(
        HARD_CEILING_DECISION_BUDGET.maxPlanSteps,
        Math.max(1, config?.maxPlanSteps ?? DEFAULT_DECISION_BUDGET.maxPlanSteps)
      ),
      maxDirectives: Math.min(
        HARD_CEILING_DECISION_BUDGET.maxDirectives,
        Math.max(1, config?.maxDirectives ?? DEFAULT_DECISION_BUDGET.maxDirectives)
      ),
      maxTotalItems: Math.min(
        HARD_CEILING_DECISION_BUDGET.maxTotalItems,
        Math.max(1, config?.maxTotalItems ?? DEFAULT_DECISION_BUDGET.maxTotalItems)
      ),
    };
  }

  /**
   * Main Evaluation Entry Point
   */
  public evaluate(input: DecisionEngineInput): DecisionAnalysis {
    const budget = this.resolveBudget(input.options?.budget);
    const userId = input.userId || "default_user";
    const currentTime = input.options?.currentTime ?? 1724000000000;
    const activeTopic = input.options?.activeTopic || input.context?.activeTopic || "general";
    const strictTopicIsolation = input.options?.strictTopicIsolation ?? false;

    let candidatesDiscovered = 0;
    let candidatesEvaluated = 0;
    let candidatesBlocked = 0;
    let candidatesRejected = 0;
    let candidatesConditionallySupported = 0;
    let candidatesRecommended = 0;
    let hardConstraintViolations = 0;
    let goalAlignmentConflicts = 0;
    let epistemicWarnings = 0;
    let contradictionWarnings = 0;
    let causalWarnings = 0;
    let multiHopWarnings = 0;
    let simulationWarnings = 0;
    let assumptionWarnings = 0;
    let temporalWarnings = 0;
    let scopeRejections = 0;
    let riskFlags = 0;
    let tradeoffConflicts = 0;
    let informationRequestsCount = 0;
    let decisionsDeferred = 0;
    let plansGenerated = 0;
    let sanitizationCount = 0;
    let budgetTruncations = 0;

    const provenance: DecisionProvenance[] = [];

    // 1. Discover Candidate Options from Authorized Sources
    const rawCandidates = this.discoverCandidates(input, budget);
    candidatesDiscovered = rawCandidates.length;

    // Extract Hard Constraints from executive context & meta-reasoning
    const hardConstraints = this.extractHardConstraints(input);

    // Extract Active Goals & Commitments
    const activeGoals = this.extractActiveGoals(input);

    // Extract Epistemic Claims & Facts
    const authoritativeClaims = this.extractAuthoritativeClaims(input);

    // Extract Contradictions
    const unresolvedContradictions = ((input.contradictionResolution as any)?.unresolvedContradictions || (input.contradictionResolution as any)?.contradictions || []) as any[];

    // Extract Causal Relations
    const causalRelations = input.causalReasoning?.relations || [];

    // Extract Multi-hop chains
    const multiHopChains = input.multiHopReasoning?.chains || [];

    // Extract Scenario Outcomes
    const scenarioOutcomes = input.scenarioSimulation?.outcomes || [];
    const scenarioAssumptions = input.scenarioSimulation?.assumptions || [];

    // Extract Meta-Reasoning Findings
    const metaIssues = input.metaReasoning?.issues || [];
    const realityConfusions = new Set(
      metaIssues.filter((i) => i.type === "SIMULATION_REALITY_CONFUSION").map((i) => (i as any).targetIdentifier || i.targetStatement)
    );
    const metaConstraintViolations = new Set(
      metaIssues.filter((i) => i.type === "HARD_CONSTRAINT_VIOLATION" || i.type === "CONSTRAINT_VIOLATION").map((i) => (i as any).targetIdentifier || i.targetStatement)
    );

    const evaluatedCandidates: DecisionCandidate[] = [];
    const evaluations: DecisionEvaluation[] = [];

    // 2. Evaluate Each Candidate Option
    for (const raw of rawCandidates.slice(0, budget.maxCandidates)) {
      candidatesEvaluated++;

      const candidateKey = raw.candidateKey || this.sanitizeKey(raw.title);
      const candidateId = `cand_${this.hashString(`${userId}_${candidateKey}_${raw.source}`)}`;

      const blockedReasons: string[] = [];
      const warningReasons: string[] = [];
      const risks: DecisionRisk[] = [...(raw.risks || [])];
      for (const r of risks) {
        if (r.severity === "CRITICAL" || r.severity === "HIGH" || r.severity === "MEDIUM") {
          warningReasons.push(`Risk: ${r.description}`);
        }
      }
      const tradeoffs: DecisionTradeoff[] = [...(raw.tradeoffs || [])];
      const assumptions: string[] = [...(raw.assumptions || [])];
      let isAssumptionSensitive = false;

      // 2a. Hard Constraint Filtering
      let hardConstraintPassed = true;
      const constraintRefs: DecisionConstraintRef[] = [];

      for (const hc of hardConstraints) {
        const isViolated = this.checkConstraintViolation(raw, hc) ||
          metaConstraintViolations.has(hc.id) ||
          metaIssues.some((iss) => iss.type === "HARD_CONSTRAINT_VIOLATION" && ((iss as any).targetIdentifier === hc.id || iss.targetStatement.includes(hc.id)));

        if (isViolated) {
          hardConstraintPassed = false;
          hardConstraintViolations++;
          blockedReasons.push(`Violates hard constraint: ${hc.description}`);
          constraintRefs.push({
            constraintId: hc.id,
            type: hc.type || "HARD_CONSTRAINT",
            description: hc.description,
            isHardConstraint: true,
            isSatisfied: false,
            violationReason: `Candidate violates mandatory constraint '${hc.description}'`,
          });
          risks.push({
            id: `risk_${this.hashString(`${candidateId}_hc_${hc.id}`)}`,
            category: "CONSTRAINT_RISK",
            severity: "CRITICAL",
            description: `Violation of hard constraint: ${hc.description}`,
            isBlocking: true,
            sourceAuthority: "HARD_CONSTRAINT",
          });
        } else {
          constraintRefs.push({
            constraintId: hc.id,
            type: hc.type || "HARD_CONSTRAINT",
            description: hc.description,
            isHardConstraint: true,
            isSatisfied: true,
          });
        }
      }

      // 2b. Check Reality Boundary (Simulation vs Reality)
      let realityBoundaryPassed = true;
      if (
        realityConfusions.has(raw.id) ||
        realityConfusions.has(candidateKey) ||
        metaIssues.some((iss) => iss.type === "SIMULATION_REALITY_CONFUSION" && ((iss as any).targetIdentifier === raw.id || (iss as any).targetIdentifier === candidateKey || iss.targetStatement.includes(raw.id) || iss.targetStatement.includes(candidateKey)))
      ) {
        realityBoundaryPassed = false;
        blockedReasons.push("Violates reality boundary: simulated outcome asserted as verified fact");
        risks.push({
          id: `risk_${this.hashString(`${candidateId}_reality`)}`,
          category: "SAFETY_RISK",
          severity: "CRITICAL",
          description: "Candidate relies on simulated outcome asserted as verified reality.",
          isBlocking: true,
        });
      }

      // 2c. Goal Alignment
      const goalAlignments: GoalAlignmentEvaluation[] = [];
      let goalAlignmentScore = 1.0;
      let opposingGoalsCount = 0;

      for (const g of activeGoals) {
        const alignment = this.evaluateGoalAlignment(raw, g);
        goalAlignments.push(alignment);
        if (alignment.alignment === "OPPOSING" || alignment.alignment === "BLOCKING") {
          opposingGoalsCount++;
          goalAlignmentConflicts++;
          warningReasons.push(`Opposes active goal: ${g.title}`);
          risks.push({
            id: `risk_${this.hashString(`${candidateId}_goal_${g.id}`)}`,
            category: "EXECUTION_RISK",
            severity: "MAJOR",
            description: `Action conflicts with active objective '${g.title}'`,
            isBlocking: alignment.alignment === "BLOCKING",
          });
        }
      }
      if (activeGoals.length > 0) {
        goalAlignmentScore = this.clamp01(1 - opposingGoalsCount / activeGoals.length);
      }

      // 2d. Evidence Quality & Epistemic Audit
      const evidenceRefs: DecisionEvidenceRef[] = [];
      let evidenceQualitySum = 0;
      let evidenceCount = 0;

      for (const claim of authoritativeClaims) {
        const relevance = this.assessEvidenceRelevance(raw, claim.statement);
        if (relevance !== "NONE") {
          evidenceCount++;
          const weight = AUTHORITY_WEIGHTS[claim.authority] || 0.5;
          const epistemicWeight = EPISTEMIC_STATE_WEIGHTS[claim.epistemicState] || 0.5;
          const score = weight * epistemicWeight;
          evidenceQualitySum += score;

          evidenceRefs.push({
            sourceId: claim.sourceId,
            sourceType: claim.sourceType,
            authority: claim.authority,
            epistemicState: claim.epistemicState,
            statement: claim.statement,
            relevance: relevance as "DIRECT" | "INDIRECT" | "CONTEXTUAL",
          });

          if (claim.epistemicState === "UNCERTAIN" || claim.epistemicState === "CONTESTED") {
            epistemicWarnings++;
            warningReasons.push(`Depends on ${claim.epistemicState.toLowerCase()} claim: '${claim.statement}'`);
          }
        }
      }
      const evidenceQualityScore = evidenceCount > 0
        ? this.clamp01(evidenceQualitySum / evidenceCount)
        : (raw.source === "EXPLICIT_USER_OPTION" || raw.source === "DEFAULT_CONTINUATION" || (raw.source as any) === "REASONING_ENGINE" || (raw.source as any) === "PLANNING_ENGINE" ? 0.70 : 0.50);

      // 2e. Contradiction Audit
      let contradictionCount = 0;
      for (const contra of unresolvedContradictions) {
        const mentionsContra = this.mentionsText(raw.title + " " + raw.description, contra.premiseA) ||
          this.mentionsText(raw.title + " " + raw.description, contra.premiseB);
        if (mentionsContra) {
          contradictionCount++;
          contradictionWarnings++;
          warningReasons.push(`Relies on unresolved contradiction: '${contra.premiseA}' vs '${contra.premiseB}'`);
          risks.push({
            id: `risk_${this.hashString(`${candidateId}_contra_${contra.id}`)}`,
            category: "EVIDENCE_RISK",
            severity: contra.severity || "MODERATE",
            description: `Unresolved contradiction in underlying context.`,
            isBlocking: false,
          });
        }
      }

      // 2f. Causal and Multi-hop Check
      let causalSupportScore = 0.80;
      for (const rel of causalRelations as any[]) {
        const effectName = rel.effectStatement || rel.effectKey || rel.effect || "";
        const relId = rel.id || rel.relationKey || `${rel.causeKey}->${rel.effectKey}`;
        if (effectName && this.mentionsText(raw.title + " " + raw.description, effectName)) {
          if (rel.relationType === "CORRELATION_ONLY" || rel.relationType === "INSUFFICIENT") {
            causalWarnings++;
            causalSupportScore -= 0.20;
            warningReasons.push(`Expected outcome for '${effectName}' is correlational only.`);
            risks.push({
              id: `risk_${this.hashString(`${candidateId}_causal_${relId}`)}`,
              category: "CAUSAL_RISK",
              severity: "MEDIUM",
              description: `Causal link to outcome '${effectName}' lacks verified mechanism.`,
              isBlocking: false,
            });
          }
        }
      }
      causalSupportScore = this.clamp01(causalSupportScore);

      for (const chain of multiHopChains as any[]) {
        const targetEnt = chain.targetEntity || chain.targetConcept || chain.target || "";
        const chainId = chain.id || chain.chainId || "multi_hop_chain";
        if ((chain.status === "BROKEN" || chain.status === "FAILED") && targetEnt && this.mentionsText(raw.title + " " + raw.description, targetEnt)) {
          multiHopWarnings++;
          warningReasons.push(`Multi-hop inference chain to target entity is broken.`);
          risks.push({
            id: `risk_${this.hashString(`${candidateId}_hop_${chainId}`)}`,
            category: "EVIDENCE_RISK",
            severity: "HIGH",
            description: `Broken multi-hop reasoning chain supporting candidate.`,
            isBlocking: false,
          });
        }
      }

      // 2g. Scenario Simulation and Assumptions
      for (const assum of scenarioAssumptions) {
        if (assum.required && !assum.isSupported) {
          assumptionWarnings++;
          assumptions.push(assum.statement);
          if (assum.isSensitive) {
            isAssumptionSensitive = true;
            warningReasons.push(`Option depends critically on unverified assumption: '${assum.statement}'`);
          }
        }
      }

      // 2h. Temporal Freshness
      let temporalStaleness = 0.0;
      const stateRecords = (input.temporalMemory as any)?.stateRecords || (input.temporalMemory as any)?.states;
      if (stateRecords) {
        for (const record of stateRecords) {
          const recKey = record.key || record.id || "";
          if (record.isSuperseded && recKey && this.mentionsText(raw.title + " " + raw.description, recKey)) {
            temporalWarnings++;
            temporalStaleness = Math.max(temporalStaleness, 0.60);
            warningReasons.push(`Relies on superseded temporal state: '${recKey}'`);
            risks.push({
              id: `risk_${this.hashString(`${candidateId}_temp_${recKey}`)}`,
              category: "TEMPORAL_RISK",
              severity: "MEDIUM",
              description: `Depends on past state that has been superseded.`,
              isBlocking: false,
            });
          }
        }
      }

      // 2i. Topic & Scope Isolation
      if (strictTopicIsolation && raw.topic && raw.topic !== "general" && raw.topic !== activeTopic) {
        scopeRejections++;
        blockedReasons.push(`Option belongs to isolated topic '${raw.topic}' outside active topic '${activeTopic}'`);
        hardConstraintPassed = false;
      }

      // 2j. Calculate Orthogonal Uncertainty Vector
      const uncertainty: DecisionUncertainty = {
        evidenceInsufficiency: evidenceCount === 0 ? 0.60 : this.clamp01(1 - evidenceQualityScore),
        sourceConflict: contradictionCount > 0 ? this.clamp01(contradictionCount * 0.35) : 0,
        epistemicUncertainty: this.clamp01(1 - evidenceQualityScore),
        causalAmbiguity: this.clamp01(1 - causalSupportScore),
        multiHopDependence: (multiHopChains as any[]).some((c) => c.status === "BROKEN" || c.status === "FAILED") ? 0.70 : 0.20,
        assumptionDependence: isAssumptionSensitive ? 0.80 : (assumptions.length > 0 ? 0.40 : 0.10),
        temporalStaleness,
        simulationDependence: raw.source === "SCENARIO_SIMULATION" ? 0.60 : 0.10,
        scopeAmbiguity: raw.scope === "GLOBAL" ? 0.10 : 0.30,
        preferenceAmbiguity: raw.source === "EXPLICIT_USER_OPTION" ? 0.00 : 0.40,
        executionUncertainty: raw.reversibility === "IRREVERSIBLE" ? 0.70 : 0.20,
        reversibilityUncertainty: raw.reversibility === "UNKNOWN" ? 0.60 : 0.10,
        compositeUncertainty: 0,
      };

      const compositeUncertainty = this.clamp01(
        uncertainty.evidenceInsufficiency * 0.25 +
        uncertainty.sourceConflict * 0.15 +
        uncertainty.assumptionDependence * 0.20 +
        uncertainty.causalAmbiguity * 0.15 +
        uncertainty.executionUncertainty * 0.15 +
        uncertainty.temporalStaleness * 0.10
      );
      uncertainty.compositeUncertainty = compositeUncertainty;

      // 2k. Reversibility & Tradeoffs
      const reversibility: DecisionReversibility = raw.reversibility || "PARTIALLY_REVERSIBLE";
      const reversibilityScore = REVERSIBILITY_SCORES[reversibility];

      // Formulate explicit Tradeoffs if candidate has benefits vs risks
      if ((raw.benefits && raw.benefits.length > 0) && (risks.length > 0 || reversibility === "IRREVERSIBLE")) {
        tradeoffs.push({
          id: `tradeoff_${this.hashString(`${candidateId}_perf_risk`)}`,
          dimensionA: raw.benefits[0] || "Performance/Capability",
          dimensionB: risks[0]?.description || "Complexity/Risk",
          description: `Balancing benefit '${raw.benefits[0]}' against risk '${risks[0]?.description || "Execution risk"}'`,
          state: raw.source === "EXPLICIT_USER_OPTION" ? "RESOLVED_BY_PREFERENCE" : "TRADEOFF_UNRESOLVED",
        });
      }

      // 2l. Determine Candidate Decision State
      let candidateState: DecisionState = "READY";

      if (!realityBoundaryPassed) {
        candidateState = "REJECTED";
        candidatesRejected++;
      } else if (!hardConstraintPassed) {
        candidateState = "BLOCKED";
        candidatesBlocked++;
      } else if (isAssumptionSensitive || opposingGoalsCount > 0 || contradictionCount > 0) {
        candidateState = "CONDITIONAL";
        candidatesConditionallySupported++;
      } else if (warningReasons.length > 0 || compositeUncertainty > 0.45) {
        candidateState = "READY_WITH_WARNINGS";
      } else if (evidenceCount === 0 && (raw.source === "ACTION_PROPOSAL" || raw.source === "SCENARIO_SIMULATION" || (raw.source === "DEFAULT_CONTINUATION" && !input.message && !input.intent?.primaryIntent))) {
        candidateState = "INSUFFICIENT_INFORMATION";
      }

      // 2m. Criteria Scoring
      const matchesCurrentTurnUtterance = input.message
        ? this.mentionsText(input.message, raw.title) || this.mentionsText(input.message, raw.description || "")
        : false;
      const explicitRequirementSatisfied = (raw.source === "EXPLICIT_USER_OPTION" && matchesCurrentTurnUtterance) || raw.source === "EXPLICIT_USER_OPTION" || (input.intent?.primaryIntent as any) === "EXECUTE_TASK";
      const robustnessScore = this.clamp01(1 - (uncertainty.assumptionDependence * 0.6 + uncertainty.sourceConflict * 0.4));
      const riskScore = this.clamp01(risks.reduce((acc, r) => acc + (r.severity === "CRITICAL" ? 0.5 : r.severity === "MAJOR" ? 0.3 : 0.1), 0));

      const criteriaScores: DecisionCriterionScore[] = [
        {
          criterion: "CONSTRAINT_COMPLIANCE",
          status: hardConstraintPassed ? "SUPPORTED" : "CONFLICTED",
          score: hardConstraintPassed ? 1.0 : 0.0,
          rationale: hardConstraintPassed ? "Complies with all active constraints" : "Violates hard constraints",
        },
        {
          criterion: "USER_EXPLICIT_PREFERENCE",
          status: matchesCurrentTurnUtterance ? "SUPPORTED" : raw.source === "EXPLICIT_USER_OPTION" ? "PARTIALLY_SUPPORTED" : "UNKNOWN",
          score: matchesCurrentTurnUtterance ? 1.0 : (raw.source === "EXPLICIT_USER_OPTION" ? 0.7 : 0.4),
          rationale: matchesCurrentTurnUtterance ? "Explicitly matches user current turn request" : "General option",
        },
        {
          criterion: "GOAL_ALIGNMENT",
          status: goalAlignmentScore > 0.7 ? "SUPPORTED" : goalAlignmentScore > 0.3 ? "PARTIALLY_SUPPORTED" : "CONFLICTED",
          score: goalAlignmentScore,
          rationale: `Aligned with ${goalAlignments.filter((g) => g.alignment === "ALIGNED").length}/${activeGoals.length || 1} goals`,
        },
        {
          criterion: "EVIDENCE_STRENGTH",
          status: evidenceQualityScore > 0.7 ? "SUPPORTED" : evidenceQualityScore > 0.3 ? "PARTIALLY_SUPPORTED" : "UNKNOWN",
          score: evidenceQualityScore,
          rationale: `Evidence quality score: ${evidenceQualityScore.toFixed(2)}`,
        },
        {
          criterion: "EPISTEMIC_RELIABILITY",
          status: compositeUncertainty < 0.3 ? "SUPPORTED" : compositeUncertainty < 0.6 ? "PARTIALLY_SUPPORTED" : "CONFLICTED",
          score: this.clamp01(1 - compositeUncertainty),
          rationale: `Epistemic reliability inverse of composite uncertainty (${compositeUncertainty.toFixed(2)})`,
        },
        {
          criterion: "CAUSAL_SUPPORT",
          status: causalSupportScore > 0.7 ? "SUPPORTED" : "PARTIALLY_SUPPORTED",
          score: causalSupportScore,
          rationale: `Causal justification support score: ${causalSupportScore.toFixed(2)}`,
        },
        {
          criterion: "REVERSIBILITY",
          status: reversibilityScore > 0.7 ? "SUPPORTED" : "PARTIALLY_SUPPORTED",
          score: reversibilityScore,
          rationale: `Reversibility classification: ${reversibility}`,
        },
        {
          criterion: "ROBUSTNESS",
          status: robustnessScore > 0.6 ? "SUPPORTED" : "PARTIALLY_SUPPORTED",
          score: robustnessScore,
          rationale: `Decision robustness score: ${robustnessScore.toFixed(2)}`,
        },
      ];

      // Composite Score Formulation
      const benefitsScore = raw.benefits && raw.benefits.length > 0
        ? Math.min(1.0, raw.benefits.length * 0.35)
        : 0.0;

      const compositeScore = this.clamp01(
        (hardConstraintPassed ? 0.30 : 0.0) +
        (matchesCurrentTurnUtterance ? 0.20 : explicitRequirementSatisfied ? 0.12 : 0.05) +
        goalAlignmentScore * 0.15 +
        evidenceQualityScore * 0.15 +
        causalSupportScore * 0.10 +
        benefitsScore * 0.10 +
        robustnessScore * 0.08 +
        reversibilityScore * 0.07 -
        riskScore * 0.15
      );

      const decisionRationale = this.generateCandidateRationale(
        raw.title,
        candidateState,
        hardConstraintPassed,
        goalAlignmentScore,
        evidenceQualityScore,
        warningReasons,
        blockedReasons
      );

      const evaluatedCandidate: DecisionCandidate = {
        id: candidateId,
        candidateKey,
        title: raw.title,
        description: raw.description || raw.title,
        source: raw.source,
        scope: raw.scope || "GLOBAL",
        topic: raw.topic || activeTopic,
        goalAlignment: goalAlignments,
        evidenceReferences: evidenceRefs.slice(0, budget.maxEvidenceRefs),
        constraints: constraintRefs,
        risks: risks.slice(0, budget.maxRisks),
        benefits: raw.benefits || [],
        tradeoffs: tradeoffs.slice(0, budget.maxTradeoffs),
        dependencies: raw.dependencies || [],
        assumptions: assumptions,
        simulationReferences: raw.simulationReferences || [],
        causalReferences: raw.causalReferences || [],
        uncertainty,
        decisionState: candidateState,
        reversibility,
        isAssumptionSensitive,
        blockedReasons,
        warningReasons,
        rationale: decisionRationale,
        rawScore: compositeScore,
      };

      evaluatedCandidates.push(evaluatedCandidate);

      evaluations.push({
        candidateId,
        candidateKey,
        candidateTitle: raw.title,
        decisionState: candidateState,
        criteriaScores: criteriaScores.slice(0, budget.maxCriteria),
        hardConstraintPassed,
        explicitRequirementSatisfied,
        goalAlignmentScore,
        evidenceQualityScore,
        epistemicReliabilityScore: this.clamp01(1 - compositeUncertainty),
        causalSupportScore,
        robustnessScore,
        riskScore,
        compositeScore,
        recommendationRank: 0, // Assigned after sorting
        decisionRationale,
        conditions: isAssumptionSensitive ? assumptions : undefined,
      });

      provenance.push({
        layer: "DELIBERATIVE_DECISION",
        identifier: candidateId,
        authority: raw.source === "EXPLICIT_USER_OPTION" ? "CURRENT_TURN_EXPLICIT" : "GOVERNANCE_APPROVED_MEMORY",
        epistemicState: candidateState === "READY" ? "SUPPORTED" : "INFERRED",
        scope: evaluatedCandidate.scope,
        topic: evaluatedCandidate.topic,
      });
    }

    // 3. Strict Deterministic Lexicographical Sorting
    evaluatedCandidates.sort((a, b) => this.compareCandidates(a, b));

    // Formulate Rankings
    const ranking: DecisionRanking[] = [];
    for (let i = 0; i < evaluatedCandidates.length; i++) {
      const cand = evaluatedCandidates[i];
      cand.lexicographicalRank = i + 1;
      const evalObj = evaluations.find((e) => e.candidateId === cand.id);
      if (evalObj) evalObj.recommendationRank = i + 1;

      ranking.push({
        candidateId: cand.id,
        candidateKey: cand.candidateKey,
        rank: i + 1,
        title: cand.title,
        state: cand.decisionState,
        compositeScore: cand.rawScore || 0,
        primaryFactor: this.derivePrimaryRankingFactor(cand),
      });
    }

    // 4. Generate Top Recommendation & Action Plan
    const topCandidate = evaluatedCandidates[0];
    let overallDecisionState: DecisionState = "READY";
    let recommendation: DecisionRecommendation;

    if (!topCandidate || evaluatedCandidates.length === 0) {
      overallDecisionState = "INSUFFICIENT_INFORMATION";
      recommendation = {
        type: "REQUEST_INFORMATION",
        summary: "No viable candidate options discovered.",
        rationale: "There is insufficient information or candidate actions to formulate a decision.",
        informationRequests: ["Please clarify desired action or candidate preferences."],
        warnings: [],
      };
      informationRequestsCount++;
    } else if (topCandidate.decisionState === "BLOCKED" || topCandidate.decisionState === "REJECTED") {
      overallDecisionState = topCandidate.decisionState;
      recommendation = {
        type: "NO_SAFE_OPTION",
        selectedOptionId: topCandidate.id,
        selectedOptionKey: topCandidate.candidateKey,
        selectedOptionTitle: topCandidate.title,
        summary: `No safe candidate options available. Best candidate is ${topCandidate.decisionState.toLowerCase()}.`,
        rationale: topCandidate.blockedReasons.join("; ") || "All options violate active constraints.",
        warnings: topCandidate.blockedReasons,
      };
    } else if (topCandidate.decisionState === "CONDITIONAL") {
      overallDecisionState = "CONDITIONAL";
      candidatesConditionallySupported++;
      recommendation = {
        type: "RECOMMEND_CONDITIONAL_OPTION",
        selectedOptionId: topCandidate.id,
        selectedOptionKey: topCandidate.candidateKey,
        selectedOptionTitle: topCandidate.title,
        summary: `Option '${topCandidate.title}' is conditionally recommended.`,
        rationale: `Preferred provided that underlying conditions and assumptions hold.`,
        conditions: topCandidate.assumptions.length > 0 ? topCandidate.assumptions : ["Underlying assumptions hold"],
        warnings: topCandidate.warningReasons,
      };
    } else if (topCandidate.decisionState === "READY_WITH_WARNINGS") {
      overallDecisionState = "READY_WITH_WARNINGS";
      candidatesRecommended++;
      recommendation = {
        type: "RECOMMEND_OPTION",
        selectedOptionId: topCandidate.id,
        selectedOptionKey: topCandidate.candidateKey,
        selectedOptionTitle: topCandidate.title,
        summary: `Option '${topCandidate.title}' is recommended with caveats.`,
        rationale: topCandidate.rationale,
        warnings: topCandidate.warningReasons,
      };
    } else if (topCandidate.decisionState === "INSUFFICIENT_INFORMATION") {
      overallDecisionState = "INSUFFICIENT_INFORMATION";
      informationRequestsCount++;
      recommendation = {
        type: "REQUEST_INFORMATION",
        summary: `More information required before selecting '${topCandidate.title}'.`,
        rationale: `Evidence support is currently incomplete.`,
        informationRequests: [`Clarify evidence or requirements for '${topCandidate.title}'.`],
        warnings: topCandidate.warningReasons,
      };
    } else {
      overallDecisionState = "READY";
      candidatesRecommended++;
      recommendation = {
        type: "RECOMMEND_OPTION",
        selectedOptionId: topCandidate.id,
        selectedOptionKey: topCandidate.candidateKey,
        selectedOptionTitle: topCandidate.title,
        summary: `Option '${topCandidate.title}' is best supported and recommended.`,
        rationale: topCandidate.rationale,
        warnings: [],
      };
    }

    // 5. Generate Advisory Action Plan if viable candidate selected
    let actionPlan: DecisionPlan | undefined = undefined;
    if (
      topCandidate &&
      (topCandidate.decisionState === "READY" ||
       topCandidate.decisionState === "READY_WITH_WARNINGS" ||
       topCandidate.decisionState === "CONDITIONAL")
    ) {
      actionPlan = this.generateActionPlan(topCandidate, input, budget);
      plansGenerated++;
    }

    // 6. Synthesize Sanitized Decision Directives
    const allTradeoffs: DecisionTradeoff[] = [];
    const allRisks: DecisionRisk[] = [];
    for (const c of evaluatedCandidates) {
      allTradeoffs.push(...c.tradeoffs);
      allRisks.push(...c.risks);
    }

    const sanitizedDirectives = this.synthesizeSanitizedDirectives(
      overallDecisionState,
      recommendation,
      topCandidate,
      allTradeoffs,
      allRisks,
      budget
    );

    const diagnostics: DecisionDiagnostics = {
      candidatesDiscovered,
      candidatesEvaluated,
      candidatesBlocked,
      candidatesRejected,
      candidatesConditionallySupported,
      candidatesRecommended,
      hardConstraintViolations,
      goalAlignmentConflicts,
      epistemicWarnings,
      contradictionWarnings,
      causalWarnings,
      multiHopWarnings,
      simulationWarnings,
      assumptionWarnings,
      temporalWarnings,
      scopeRejections,
      riskFlags: allRisks.length,
      tradeoffConflicts: allTradeoffs.filter((t) => t.state === "TRADEOFF_UNRESOLVED").length,
      informationRequests: informationRequestsCount,
      decisionsDeferred,
      plansGenerated,
      directivesGenerated: sanitizedDirectives.length,
      sanitizationCount,
      budgetTruncations,
    };

    const overallUncertainty = topCandidate?.uncertainty || {
      evidenceInsufficiency: 0.5,
      sourceConflict: 0.0,
      epistemicUncertainty: 0.5,
      causalAmbiguity: 0.2,
      multiHopDependence: 0.1,
      assumptionDependence: 0.1,
      temporalStaleness: 0.0,
      simulationDependence: 0.0,
      scopeAmbiguity: 0.1,
      preferenceAmbiguity: 0.3,
      executionUncertainty: 0.2,
      reversibilityUncertainty: 0.1,
      compositeUncertainty: 0.35,
    };

    return {
      decisionState: overallDecisionState,
      objective: input.intent?.primaryIntent || input.planning?.plan?.objective || input.message || "Evaluate candidate actions",
      candidates: evaluatedCandidates.slice(0, budget.maxCandidates),
      evaluations: evaluations.slice(0, budget.maxCandidates),
      ranking: ranking.slice(0, budget.maxCandidates),
      recommendation,
      selectedOption: topCandidate,
      tradeoffs: allTradeoffs.slice(0, budget.maxTradeoffs),
      risks: allRisks.slice(0, budget.maxRisks),
      actionPlan,
      uncertainty: overallUncertainty,
      unresolvedQuestions: recommendation.informationRequests || [],
      sanitizedDirectives,
      directives: sanitizedDirectives,
      diagnostics,
      provenance,
    };
  }

  /**
   * Candidate Discovery from Authorized Sources
   */
  private discoverCandidates(
    input: DecisionEngineInput,
    budget: Required<DecisionBudgetConfig>
  ): Array<Partial<DecisionCandidate>> {
    const discovered: Array<Partial<DecisionCandidate>> = [];

    // 1. Explicit Candidate Options in input options
    if (input.options?.explicitCandidateOptions && input.options.explicitCandidateOptions.length > 0) {
      for (const opt of input.options.explicitCandidateOptions) {
        discovered.push({
          candidateKey: (opt as any).candidateKey || this.sanitizeKey(opt.title),
          title: opt.title,
          description: opt.description || opt.title,
          source: (opt as any).source || "EXPLICIT_USER_OPTION",
          scope: (opt as any).scope || "CURRENT_TURN",
          topic: (opt as any).topic,
          benefits: opt.benefits || [],
          risks: (opt.risks || []).map((r: any, i: number) => (typeof r === "string" ? {
            id: `risk_${i}`,
            category: "UNKNOWN_RISK",
            severity: "MODERATE",
            description: r,
            isBlocking: false,
          } : {
            id: r.id || `risk_${i}`,
            category: r.category || "UNKNOWN_RISK",
            severity: r.severity || "MODERATE",
            description: r.description || "Identified risk",
            isBlocking: !!r.isBlocking,
          })),
          dependencies: (opt as any).dependencies || [],
          assumptions: (opt as any).assumptions || [],
          reversibility: opt.reversibility || "REVERSIBLE",
        });
      }
    }

    // 2. Discover options from user message choices (e.g. "Postgres vs MySQL", "Should I X or Y")
    if (discovered.length === 0 && input.message) {
      const msg = input.message;
      const vsMatch = msg.match(/(?:between|choose|compare|prefer)?\s*([a-zA-Z0-9_\-\s]{2,30})\s+(?:vs\.?|versus|or)\s+([a-zA-Z0-9_\-\s]{2,30})/i);
      if (vsMatch && vsMatch[1] && vsMatch[2]) {
        const optA = vsMatch[1].trim();
        const optB = vsMatch[2].trim();
        if (optA.length > 1 && optB.length > 1 && optA.toLowerCase() !== optB.toLowerCase()) {
          discovered.push({
            candidateKey: this.sanitizeKey(optA),
            title: optA,
            description: `Option: ${optA}`,
            source: "EXPLICIT_USER_OPTION",
            scope: "CURRENT_TURN",
            reversibility: "REVERSIBLE",
          });
          discovered.push({
            candidateKey: this.sanitizeKey(optB),
            title: optB,
            description: `Option: ${optB}`,
            source: "EXPLICIT_USER_OPTION",
            scope: "CURRENT_TURN",
            reversibility: "REVERSIBLE",
          });
        }
      }
    }

    // 3. Scenario Simulation alternatives
    if (input.scenarioSimulation?.scenarios && input.scenarioSimulation.scenarios.length > 0) {
      for (const scen of input.scenarioSimulation.scenarios) {
        const title = scen.title || scen.normalizedKey || scen.id || "Simulation Scenario";
        const key = this.sanitizeKey(title);
        if (discovered.every((d) => d.candidateKey !== key)) {
          discovered.push({
            candidateKey: key,
            title,
            description: scen.description || title,
            source: "SCENARIO_SIMULATION",
            scope: scen.scope || "GLOBAL",
            topic: scen.topic,
            simulationReferences: [scen.id],
            reversibility: "PARTIALLY_REVERSIBLE",
          });
        }
      }
    }

    // 4. Planning Engine proposed plan steps / alternatives
    if (input.planning?.plan && input.planning.plan.steps && input.planning.plan.steps.length > 0) {
      const plan = input.planning.plan;
      if (discovered.every((d) => d.candidateKey !== this.sanitizeKey(plan.goal || plan.objective || "execute_plan"))) {
        discovered.push({
          candidateKey: this.sanitizeKey(plan.goal || plan.objective || "execute_plan"),
          title: plan.goal || plan.objective || "Execute Proposed Plan",
          description: plan.objective || "Follow structured execution sequence",
          source: "EXISTING_PLAN",
          scope: "PROJECT",
          reversibility: "REVERSIBLE",
        });
      }
    }

    // 5. Default single continuation option if no alternatives
    if (discovered.length === 0) {
      const defaultTitle = input.intent?.primaryIntent
        ? `Proceed with ${input.intent.primaryIntent}`
        : input.message
        ? `Proceed: ${input.message.slice(0, 40)}`
        : "Standard Task Continuation";

      discovered.push({
        candidateKey: this.sanitizeKey(defaultTitle),
        title: defaultTitle,
        description: "Continue with active task objective",
        source: "DEFAULT_CONTINUATION",
        scope: "CURRENT_TURN",
        reversibility: "REVERSIBLE",
      });
    }

    return discovered.slice(0, budget.maxCandidates);
  }

  /**
   * Extract Hard Constraints from executive context & options
   */
  private extractHardConstraints(input: DecisionEngineInput): Array<{ id: string; type: string; description: string }> {
    const list: Array<{ id: string; type: string; description: string }> = [];

    if (input.executiveContext?.reasoningConstraints) {
      for (const rc of input.executiveContext.reasoningConstraints) {
        if (rc.type === "HARD_CONSTRAINT" || rc.enforceStrictly) {
          list.push({
            id: rc.id,
            type: rc.type,
            description: rc.description || rc.sanitizedDirective,
          });
        }
      }
    }

    return list;
  }

  /**
   * Extract Active Goals & Projects
   */
  private extractActiveGoals(input: DecisionEngineInput): Array<{ id: string; title: string }> {
    const list: Array<{ id: string; title: string }> = [];

    const goals = (input.goalProject as any)?.goals || (input.goalProject as any)?.activeGoals;
    if (goals) {
      for (const g of goals) {
        if (g.status === "ACTIVE" || g.status === "IN_PROGRESS" || g.status === "BLOCKED") {
          list.push({ id: g.id, title: g.title });
        }
      }
    }

    if (input.executiveContext?.activeGoals) {
      for (const eg of input.executiveContext.activeGoals) {
        const egId = eg.id || (eg as any).goalId;
        if (list.every((item) => item.id !== egId)) {
          list.push({ id: egId, title: eg.title });
        }
      }
    }

    return list;
  }

  /**
   * Extract Authoritative Claims & Facts (with exclusion of rejected, quarantined, and duplicate entries)
   */
  private extractAuthoritativeClaims(input: DecisionEngineInput): Array<{
    sourceId: string;
    sourceType: string;
    authority: EpistemicAuthority;
    epistemicState: EpistemicState;
    statement: string;
  }> {
    const list: Array<{
      sourceId: string;
      sourceType: string;
      authority: EpistemicAuthority;
      epistemicState: EpistemicState;
      statement: string;
    }> = [];
    const seenStatements = new Set<string>();

    if (input.epistemicCalibration?.claims) {
      for (const c of input.epistemicCalibration.claims) {
        // Exclude quarantined, deleted, or explicitly rejected claims
        if ((c as any).isQuarantined || (c as any).isDeleted || (c as any).status === "QUARANTINED" || (c as any).status === "DELETED") {
          continue;
        }
        if (c.epistemicState === "REJECTED") {
          continue;
        }
        const norm = c.statement.trim().toLowerCase();
        if (seenStatements.has(norm)) {
          continue; // Prevent duplicate evidence inflation
        }
        seenStatements.add(norm);

        list.push({
          sourceId: c.id || (c as any).claimKey || c.statement,
          sourceType: "EPISTEMIC_CLAIM",
          authority: c.authority || "VERIFIED_EVIDENCE",
          epistemicState: c.epistemicState || "SUPPORTED",
          statement: c.statement,
        });
      }
    }

    if (input.executiveContext?.authoritativeFacts) {
      for (const f of input.executiveContext.authoritativeFacts) {
        if ((f as any).isQuarantined || (f as any).isDeleted || (f as any).status === "QUARANTINED" || (f as any).status === "DELETED") {
          continue;
        }
        const stmt = `${f.key}: ${f.value}`;
        const norm = stmt.trim().toLowerCase();
        if (seenStatements.has(norm)) {
          continue;
        }
        seenStatements.add(norm);

        list.push({
          sourceId: f.id,
          sourceType: "EXECUTIVE_FACT",
          authority: f.authority || "GOVERNANCE_APPROVED_MEMORY",
          epistemicState: "VERIFIED",
          statement: stmt,
        });
      }
    }

    return list;
  }

  /**
   * Check if candidate violates a specific hard constraint
   */
  private checkConstraintViolation(
    candidate: Partial<DecisionCandidate>,
    constraint: { id: string; type: string; description: string }
  ): boolean {
    const text = `${candidate.title} ${candidate.description} ${(candidate.benefits || []).join(" ")}`.toLowerCase();
    const constDesc = constraint.description.toLowerCase();

    // Check "never drop tables" / destructive actions
    if (constDesc.includes("never drop") || constDesc.includes("do not drop") || constDesc.includes("no drop")) {
      if (text.includes("drop table") || text.includes("drop database") || text.includes("delete table")) {
        return true;
      }
    }

    // Check "never delete production"
    if ((constDesc.includes("never delete") || constDesc.includes("do not delete")) && (text.includes("delete production") || text.includes("remove production"))) {
      return true;
    }

    // Check "never expose" / "client secrets" / security constraints
    if (constDesc.includes("never expose") || constDesc.includes("do not expose") || constDesc.includes("never hardcode") || constDesc.includes("secret") || constDesc.includes("security")) {
      const hasSecretKey = text.includes("secret") || text.includes("api key") || text.includes("token") || text.includes("password");
      const hasClientExposure = text.includes("client") || text.includes("frontend") || text.includes("browser") || text.includes("hardcode") || text.includes("expose");
      if (hasSecretKey && hasClientExposure) {
        return true;
      }
    }

    // Check prohibited keyword matches
    if (constDesc.includes("never") || constDesc.includes("forbidden") || constDesc.includes("must not") || constDesc.includes("prohibited")) {
      const words = constDesc.split(/\s+/).filter((w) => w.length > 3 && !["never", "use", "forbidden", "constraint", "must", "prohibited", "should", "code", "client", "into"].includes(w));
      let matchCount = 0;
      for (const w of words) {
        if (text.includes(w)) {
          matchCount++;
        }
      }
      if (matchCount >= 2) {
        return true;
      }
    }

    return false;
  }

  /**
   * Evaluate Goal Alignment
   */
  private evaluateGoalAlignment(
    candidate: Partial<DecisionCandidate>,
    goal: { id: string; title: string }
  ): GoalAlignmentEvaluation {
    const text = `${candidate.title} ${candidate.description}`.toLowerCase();
    const gText = goal.title.toLowerCase();

    if (text.includes(gText) || gText.includes(text)) {
      return {
        goalId: goal.id,
        title: goal.title,
        alignment: "ALIGNED",
        rationale: `Candidate directly supports goal '${goal.title}'.`,
      };
    }

    // Check opposing patterns
    if (
      (gText.includes("optimize") && text.includes("slow")) ||
      (gText.includes("protect") && text.includes("expose")) ||
      (gText.includes("reduce cost") && text.includes("increase spending"))
    ) {
      return {
        goalId: goal.id,
        title: goal.title,
        alignment: "OPPOSING",
        rationale: `Candidate acts against objective '${goal.title}'.`,
      };
    }

    return {
      goalId: goal.id,
      title: goal.title,
      alignment: "NEUTRAL",
      rationale: `Candidate has neutral impact on goal '${goal.title}'.`,
    };
  }

  /**
   * Assess Relevance of Evidence
   */
  private assessEvidenceRelevance(
    candidate: Partial<DecisionCandidate>,
    statement: string
  ): "DIRECT" | "INDIRECT" | "CONTEXTUAL" | "NONE" {
    const candText = `${candidate.title} ${candidate.description}`.toLowerCase();
    const stmtText = statement.toLowerCase();

    if (candText.includes(stmtText) || stmtText.includes(candText)) {
      return "DIRECT";
    }

    const STOP_WORDS = new Set([
      "cluster", "system", "service", "server", "data", "table", "module",
      "component", "process", "storage", "function", "status", "application",
      "database", "record", "with", "from", "that", "this", "these", "those",
      "have", "been", "will", "would", "should", "could", "test", "deploy",
      "use", "using", "into", "onto", "over", "under", "about", "make",
    ]);

    const candWords = candText.split(/[\s,._-]+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    const stmtWords = stmtText.split(/[\s,._-]+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    let matchCount = 0;
    for (const w of candWords) {
      if (stmtWords.includes(w)) matchCount++;
    }

    if (matchCount >= 2) {
      return "DIRECT";
    }
    if (matchCount === 1) {
      return "INDIRECT";
    }
    return "NONE";
  }

  /**
   * Helper to check word inclusion
   */
  private mentionsText(source: string, target: string): boolean {
    if (!source || !target) return false;
    const s = source.toLowerCase();
    const t = target.toLowerCase();
    if (s.includes(t) || t.includes(s)) return true;

    const sWords = s.split(/[\s,._-]+/).filter((w) => w.length > 2 && !["and", "for", "the", "use", "with", "from"].includes(w));
    const tWords = t.split(/[\s,._-]+/).filter((w) => w.length > 2 && !["and", "for", "the", "use", "with", "from"].includes(w));
    let matchCount = 0;
    for (const w of tWords) {
      if (sWords.includes(w)) matchCount++;
    }
    return matchCount >= 2 || (tWords.length === 1 && matchCount === 1);
  }

  /**
   * Deterministic Lexicographical Candidate Comparison
   */
  private compareCandidates(a: DecisionCandidate, b: DecisionCandidate): number {
    // 1. Decision state tier (higher tier wins)
    const tierA = STATE_TIERS[a.decisionState] ?? 0;
    const tierB = STATE_TIERS[b.decisionState] ?? 0;
    if (tierA !== tierB) return tierB - tierA;

    // 2. Hard constraint compliance
    const hcA = a.blockedReasons.length === 0 ? 1 : 0;
    const hcB = b.blockedReasons.length === 0 ? 1 : 0;
    if (hcA !== hcB) return hcB - hcA;

    // 3. Explicit user requirement satisfaction (EXPLICIT_USER_OPTION outranks others)
    const reqA = a.source === "EXPLICIT_USER_OPTION" ? 1 : 0;
    const reqB = b.source === "EXPLICIT_USER_OPTION" ? 1 : 0;
    if (reqA !== reqB) return reqB - reqA;

    // 4. Goal alignment score
    const goalA = a.goalAlignment.filter((g) => g.alignment === "ALIGNED").length;
    const goalB = b.goalAlignment.filter((g) => g.alignment === "ALIGNED").length;
    if (goalA !== goalB) return goalB - goalA;

    // 5. Composite score comparison
    const scoreA = a.rawScore || 0;
    const scoreB = b.rawScore || 0;
    if (Math.abs(scoreA - scoreB) > 0.001) return scoreB - scoreA;

    // 6. Uncertainty comparison (lower uncertainty is better)
    const uncA = a.uncertainty.compositeUncertainty;
    const uncB = b.uncertainty.compositeUncertainty;
    if (Math.abs(uncA - uncB) > 0.001) return uncA - uncB;

    // 7. Reversibility comparison
    const revA = REVERSIBILITY_SCORES[a.reversibility];
    const revB = REVERSIBILITY_SCORES[b.reversibility];
    if (revA !== revB) return revB - revA;

    // 8. Deterministic key tie-breaker
    return a.candidateKey.localeCompare(b.candidateKey);
  }

  /**
   * Derive Primary Ranking Factor for diagnostics
   */
  private derivePrimaryRankingFactor(cand: DecisionCandidate): string {
    if (cand.blockedReasons.length > 0) return "BLOCKED_BY_HARD_CONSTRAINT";
    if (cand.source === "EXPLICIT_USER_OPTION") return "EXPLICIT_USER_OPTION_SUPPORTED";
    if (cand.goalAlignment.some((g) => g.alignment === "ALIGNED")) return "GOAL_ALIGNED_SUPPORT";
    if (cand.evidenceReferences.length > 0) return "EVIDENCE_SUPPORT";
    if (cand.reversibility === "REVERSIBLE") return "REVERSIBLE_SAFE_ACTION";
    return "DEFAULT_HEURISTIC";
  }

  /**
   * Generate Candidate Rationale
   */
  private generateCandidateRationale(
    title: string,
    state: DecisionState,
    hardConstraintPassed: boolean,
    goalScore: number,
    evidenceScore: number,
    warnings: string[],
    blockedReasons: string[]
  ): string {
    if (!hardConstraintPassed || blockedReasons.length > 0) {
      return `Blocked: ${blockedReasons.join("; ")}`;
    }
    if (state === "CONDITIONAL") {
      return `Option '${title}' is conditionally viable provided identified assumptions hold.`;
    }
    if (state === "READY_WITH_WARNINGS") {
      return `Option '${title}' is supported with caveats: ${warnings.join("; ")}`;
    }
    if (state === "READY") {
      return `Option '${title}' is well-supported by evidence (score: ${evidenceScore.toFixed(2)}) and goal alignment (score: ${goalScore.toFixed(2)}).`;
    }
    return `Option '${title}' evaluated under state ${state}.`;
  }

  /**
   * Generate Advisory Action Plan for Recommended Option
   */
  private generateActionPlan(
    candidate: DecisionCandidate,
    input: DecisionEngineInput,
    budget: Required<DecisionBudgetConfig>
  ): DecisionPlan {
    const planId = `plan_${this.hashString(`${candidate.id}_plan`)}`;
    const steps: DecisionStep[] = [];

    // If existing planning steps exist, adapt them safely
    if (input.planning?.plan?.steps && input.planning.plan.steps.length > 0) {
      let idx = 0;
      for (const s of input.planning.plan.steps.slice(0, budget.maxPlanSteps) as any[]) {
        const stepAction = s.action || s.title || s.step || s.description || "Execute subtask";
        const stepDesc = s.description || s.action || s.title || "";
        steps.push({
          id: `step_${this.hashString(`${planId}_${idx}`)}`,
          stepIndex: idx + 1,
          action: stepAction,
          description: stepDesc,
          rationale: `Subtask required for '${candidate.title}'`,
          prerequisites: idx > 0 ? [`step_${idx}`] : [],
          dependencies: [],
          expectedResult: `Successful completion of subtask ${idx + 1}`,
          uncertainty: candidate.uncertainty.compositeUncertainty,
          checkpointVerification: `Verify output of ${stepAction}`,
          stopCondition: "Halt if unexpected error or constraint violation occurs.",
          isReversible: candidate.reversibility === "REVERSIBLE",
          rollbackGuidance: candidate.reversibility === "REVERSIBLE" ? "Revert state to prior checkpoint." : undefined,
        });
        idx++;
      }
    } else {
      // Standard 2-phase advisory plan: Verify prerequisites -> Execute verified step
      steps.push({
        id: `step_${this.hashString(`${planId}_0`)}`,
        stepIndex: 1,
        action: `Verify preconditions for '${candidate.title}'`,
        description: `Check all dependencies and constraints prior to execution.`,
        rationale: "Ensures environment and inputs satisfy required constraints.",
        prerequisites: [],
        dependencies: [],
        expectedResult: "All preconditions verified.",
        uncertainty: 0.10,
        checkpointVerification: "Precondition verification checklist complete.",
        stopCondition: "Stop if hard constraints or unverified assumptions are violated.",
        isReversible: true,
        rollbackGuidance: "No state change during verification.",
      });

      steps.push({
        id: `step_${this.hashString(`${planId}_1`)}`,
        stepIndex: 2,
        action: `Execute '${candidate.title}'`,
        description: `Perform primary action with monitoring.`,
        rationale: `Direct implementation of chosen candidate.`,
        prerequisites: [`step_${this.hashString(`${planId}_0`)}`],
        dependencies: [],
        expectedResult: `Expected positive outcome: ${candidate.benefits[0] || "Target task achieved"}`,
        uncertainty: candidate.uncertainty.compositeUncertainty,
        checkpointVerification: `Verify post-execution status.`,
        stopCondition: "Halt if error rate spikes or unintended side-effects occur.",
        isReversible: candidate.reversibility === "REVERSIBLE",
        rollbackGuidance: candidate.reversibility === "REVERSIBLE" ? "Revert to baseline state." : "Manual mitigation required.",
      });
    }

    return {
      id: planId,
      objective: candidate.title,
      selectedOptionId: candidate.id,
      selectedOptionTitle: candidate.title,
      rationale: candidate.rationale,
      prerequisites: candidate.dependencies,
      orderedSteps: steps.slice(0, budget.maxPlanSteps),
      dependencies: candidate.dependencies,
      checkpoints: ["Preconditions verified", "Execution complete"],
      stopConditions: ["Stop immediately upon constraint violation or critical error."],
      uncertainty: candidate.uncertainty,
      rollbackGuidance: candidate.reversibility === "REVERSIBLE" ? "Revert to baseline checkpoint." : "Irreversible action; proceed with care.",
      unresolvedQuestions: candidate.warningReasons,
      isAdvisory: true,
    };
  }

  /**
   * Synthesize Natural Language Directives without IDs or Raw Metrics
   */
  private synthesizeSanitizedDirectives(
    overallState: DecisionState,
    recommendation: DecisionRecommendation,
    topCandidate: DecisionCandidate | undefined,
    tradeoffs: DecisionTradeoff[],
    risks: DecisionRisk[],
    budget: Required<DecisionBudgetConfig>
  ): string[] {
    const directives: string[] = [];
    const cleanTitle = this.sanitizeSentence(topCandidate?.title || "selected option");

    if (overallState === "BLOCKED" || overallState === "REJECTED") {
      directives.push("A mandatory constraint prevents this action from being recommended.");
      for (const r of risks.filter((r) => r.isBlocking)) {
        directives.push(`Blocked reason: ${this.sanitizeSentence(r.description)}`);
      }
    } else if (overallState === "INSUFFICIENT_INFORMATION") {
      directives.push("More information is needed before selecting an option confidently.");
      if (recommendation.informationRequests && recommendation.informationRequests.length > 0) {
        directives.push(`Clarification needed: ${this.sanitizeSentence(recommendation.informationRequests[0])}`);
      }
    } else if (overallState === "CONDITIONAL") {
      directives.push(`Option '${cleanTitle}' is preferred if stated conditions and assumptions hold.`);
      if (topCandidate?.assumptions && topCandidate.assumptions.length > 0) {
        directives.push(`Key condition: ${this.sanitizeSentence(topCandidate.assumptions[0])}`);
      }
    } else if (overallState === "READY_WITH_WARNINGS") {
      directives.push(`Option '${cleanTitle}' is currently best supported, with minor caveats.`);
      if (topCandidate?.warningReasons && topCandidate.warningReasons.length > 0) {
        directives.push(`Note: ${this.sanitizeSentence(topCandidate.warningReasons[0])}`);
      }
    } else {
      directives.push(`The option '${cleanTitle}' is currently best supported by the available evidence.`);
    }

    // Add unresolved tradeoff directive if applicable
    const unresolvedTradeoff = tradeoffs.find((t) => t.state === "TRADEOFF_UNRESOLVED");
    if (unresolvedTradeoff) {
      directives.push(`Tradeoff considerations: Balancing ${this.sanitizeSentence(unresolvedTradeoff.dimensionA)} against ${this.sanitizeSentence(unresolvedTradeoff.dimensionB)}.`);
    }

    // Add reversibility directive
    if (topCandidate && topCandidate.reversibility === "IRREVERSIBLE") {
      directives.push("Note that this action is irreversible; ensure prerequisites are confirmed before execution.");
    }

    return directives.map((d) => this.sanitizeSentence(d)).slice(0, budget.maxDirectives);
  }

  /**
   * Sanitize text to remove credentials, UUIDs, internal IDs, timestamps, and raw floating-point metrics
   */
  private sanitizeSentence(str: string): string {
    if (!str) return "";
    return str
      // Credentials & Tokens
      .replace(/AIzaSy[A-Za-z0-9_-]{20,}/gi, "[REDACTED_API_KEY]")
      .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, "[REDACTED_AUTH_TOKEN]")
      .replace(/\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/gi, "[REDACTED_TOKEN]")
      .replace(/\bsk-[A-Za-z0-9]{20,}\b/gi, "[REDACTED_SECRET]")
      .replace(/(?:password|secret|token|api_key|auth_token)\s*[:=]\s*\S+/gi, "[REDACTED_CREDENTIAL]")
      // UUIDs
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
      // Internal IDs & hashes
      .replace(/\b(cand|risk|step|plan|opt|rc|claim|node|chain|eval)_[0-9a-f]{4,}\b/gi, "")
      // 10-13 digit timestamps
      .replace(/\b1[5-9]\d{8,11}\b/g, "")
      // Raw floating point numbers like 0.8523 or score: 0.85
      .replace(/\b\d+\.\d{2,}\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Helper to produce clean candidate key
   */
  private sanitizeKey(str?: string): string {
    if (!str || typeof str !== "string") return "default_key";
    return str
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "key";
  }
}

export const deliberativeDecisionEngine = new DeliberativeDecisionEngine();
