/**
 * Dora Deliberative Decision & Action Planning Engine Types
 * Phase 3 — Step 8
 * 
 * Defines deterministic, bounded, non-LLM contracts for candidate evaluation,
 * constraint filtering, goal alignment, evidence & epistemic auditing,
 * causal/simulation evaluation, tradeoff & risk analysis, lexicographical ranking,
 * advisory action planning, and sanitized decision directives.
 */

import { ConversationContext, ConversationTurn } from "./contextTypes";
import { StructuredIntent } from "./intentTypes";
import { ReasoningAnalysis } from "./reasoningTypes";
import { PlanningAnalysis } from "./planningTypes";
import { VerificationAnalysis } from "./verificationTypes";
import { MemoryGovernanceAnalysis } from "./memoryGovernanceTypes";
import { UserModelAnalysis } from "./longTermUserModelTypes";
import { TemporalMemoryAnalysis } from "./temporalMemoryTypes";
import { GoalProjectAnalysis } from "./goalProjectTypes";
import { ContextContinuityAnalysis } from "./contextContinuityTypes";
import { PredictiveContextAnalysis } from "./predictiveContextTypes";
import { ExecutiveContextPackage, ExecutiveConstraint } from "./executiveContextTypes";
export type ReasoningConstraint = ExecutiveConstraint;
import { DeepReasoningAnalysis } from "./deepReasoningTypes";
import { ContradictionResolutionAnalysis } from "./contradictionResolutionTypes";
import { CausalReasoningAnalysis } from "./causalReasoningTypes";
import { MultiHopReasoningAnalysis } from "./multiHopReasoningTypes";
import {
  EpistemicCalibrationAnalysis,
  EpistemicAuthority,
  EpistemicState,
  EpistemicScope,
  EpistemicProvenance,
  EpistemicUncertainty,
} from "./epistemicCalibrationTypes";
import {
  ScenarioSimulationAnalysis,
  ScenarioType,
  ScenarioEpistemicStatus,
} from "./scenarioSimulationTypes";
import {
  MetaReasoningAnalysis,
  CritiqueIssue,
  CritiqueVerdict,
  CritiqueSeverity,
} from "./metaReasoningTypes";

/**
 * Deterministic Decision States
 */
export type DecisionState =
  | "READY"
  | "READY_WITH_WARNINGS"
  | "CONDITIONAL"
  | "INSUFFICIENT_INFORMATION"
  | "BLOCKED"
  | "REJECTED";

/**
 * Types of Decision Recommendations
 */
export type DecisionRecommendationType =
  | "RECOMMEND_OPTION"
  | "RECOMMEND_CONDITIONAL_OPTION"
  | "REQUEST_INFORMATION"
  | "DEFER_DECISION"
  | "BLOCK_OPTION"
  | "RECOMMEND_REVERSIBLE_NEXT_STEP"
  | "NO_SAFE_OPTION";

/**
 * Candidate Discovery Origin
 */
export type DecisionCandidateSource =
  | "EXPLICIT_USER_OPTION"
  | "ACTIVE_GOAL_PROJECT"
  | "EXISTING_PLAN"
  | "REASONING_OUTPUT"
  | "SCENARIO_SIMULATION"
  | "CAUSAL_ALTERNATIVE"
  | "ACTION_PROPOSAL"
  | "SUPPLIED_ALTERNATIVE"
  | "DEFAULT_CONTINUATION";

/**
 * Reversibility Assessment
 */
export type DecisionReversibility =
  | "REVERSIBLE"
  | "PARTIALLY_REVERSIBLE"
  | "IRREVERSIBLE"
  | "UNKNOWN";

/**
 * Decision Evaluation Criteria
 */
export type DecisionCriterionType =
  | "GOAL_ALIGNMENT"
  | "CONSTRAINT_COMPLIANCE"
  | "EVIDENCE_STRENGTH"
  | "EPISTEMIC_RELIABILITY"
  | "CAUSAL_SUPPORT"
  | "ROBUSTNESS"
  | "REVERSIBILITY"
  | "DEPENDENCY_COMPLEXITY"
  | "RISK_EXPOSURE"
  | "UNCERTAINTY"
  | "IMPLEMENTATION_COMPLEXITY"
  | "TIME_SENSITIVITY"
  | "USER_EXPLICIT_PREFERENCE"
  | "SCENARIO_SUPPORT";

/**
 * Qualitative Criterion Status
 */
export type DecisionCriterionStatus =
  | "SUPPORTED"
  | "PARTIALLY_SUPPORTED"
  | "UNKNOWN"
  | "CONFLICTED"
  | "NOT_APPLICABLE";

/**
 * Risk Taxonomy for Decisions
 */
export type DecisionRiskCategory =
  | "SAFETY_RISK"
  | "CONSTRAINT_RISK"
  | "EVIDENCE_RISK"
  | "EPISTEMIC_RISK"
  | "CAUSAL_RISK"
  | "TEMPORAL_RISK"
  | "DEPENDENCY_RISK"
  | "REVERSIBILITY_RISK"
  | "EXECUTION_RISK"
  | "SCOPE_RISK"
  | "UNKNOWN_RISK";

/**
 * Tradeoff State
 */
export type DecisionTradeoffState =
  | "RESOLVED_BY_PREFERENCE"
  | "TRADEOFF_UNRESOLVED"
  | "NOT_APPLICABLE";

/**
 * Structured Risk Record
 */
export interface DecisionRisk {
  id: string;
  category: DecisionRiskCategory;
  severity: CritiqueSeverity;
  description: string;
  mitigation?: string;
  isBlocking: boolean;
  sourceAuthority?: EpistemicAuthority;
}

/**
 * Structured Tradeoff Record
 */
export interface DecisionTradeoff {
  id: string;
  dimensionA: string;
  dimensionB: string;
  description: string;
  state: DecisionTradeoffState;
  resolutionRationale?: string;
}

/**
 * Goal Alignment Record
 */
export interface GoalAlignmentEvaluation {
  goalId: string;
  title: string;
  alignment: "ALIGNED" | "NEUTRAL" | "OPPOSING" | "BLOCKING";
  rationale: string;
}

/**
 * Evidence Reference for Decision
 */
export interface DecisionEvidenceRef {
  sourceId: string;
  sourceType: string;
  authority: EpistemicAuthority;
  epistemicState: EpistemicState;
  statement: string;
  relevance: "DIRECT" | "INDIRECT" | "CONTEXTUAL";
}

/**
 * Constraint Reference for Decision
 */
export interface DecisionConstraintRef {
  constraintId: string;
  type: string;
  description: string;
  isHardConstraint: boolean;
  isSatisfied: boolean;
  violationReason?: string;
}

/**
 * Orthogonal Uncertainty Dimensions (bounded [0, 1])
 */
export interface DecisionUncertainty {
  evidenceInsufficiency: number;
  sourceConflict: number;
  epistemicUncertainty: number;
  causalAmbiguity: number;
  multiHopDependence: number;
  assumptionDependence: number;
  temporalStaleness: number;
  simulationDependence: number;
  scopeAmbiguity: number;
  preferenceAmbiguity: number;
  executionUncertainty: number;
  reversibilityUncertainty: number;
  compositeUncertainty: number;
}

/**
 * Candidate Option Model
 */
export interface DecisionCandidate {
  id: string;
  candidateKey: string;
  title: string;
  description: string;
  source: DecisionCandidateSource;
  scope: EpistemicScope;
  topic?: string;
  goalAlignment: GoalAlignmentEvaluation[];
  evidenceReferences: DecisionEvidenceRef[];
  constraints: DecisionConstraintRef[];
  risks: DecisionRisk[];
  benefits: string[];
  tradeoffs: DecisionTradeoff[];
  dependencies: string[];
  assumptions: string[];
  simulationReferences: string[];
  causalReferences: string[];
  uncertainty: DecisionUncertainty;
  decisionState: DecisionState;
  reversibility: DecisionReversibility;
  isAssumptionSensitive: boolean;
  blockedReasons: string[];
  warningReasons: string[];
  rationale: string;
  rawScore?: number;
  lexicographicalRank?: number;
}

/**
 * Individual Criterion Evaluation
 */
export interface DecisionCriterionScore {
  criterion: DecisionCriterionType;
  status: DecisionCriterionStatus;
  score: number; // bounded [0, 1]
  rationale: string;
}

/**
 * Full Evaluation Record for a Candidate
 */
export interface DecisionEvaluation {
  candidateId: string;
  candidateKey: string;
  candidateTitle: string;
  decisionState: DecisionState;
  criteriaScores: DecisionCriterionScore[];
  hardConstraintPassed: boolean;
  explicitRequirementSatisfied: boolean;
  goalAlignmentScore: number;
  evidenceQualityScore: number;
  epistemicReliabilityScore: number;
  causalSupportScore: number;
  robustnessScore: number;
  riskScore: number;
  compositeScore: number;
  recommendationRank: number;
  decisionRationale: string;
  conditions?: string[];
}

/**
 * Deterministic Ranking Entry
 */
export interface DecisionRanking {
  candidateId: string;
  candidateKey: string;
  rank: number;
  title: string;
  state: DecisionState;
  compositeScore: number;
  primaryFactor: string;
}

/**
 * Structured Advisory Action Step
 */
export interface DecisionStep {
  id: string;
  stepIndex: number;
  action: string;
  description: string;
  rationale: string;
  prerequisites: string[];
  dependencies: string[];
  expectedResult: string;
  uncertainty: number;
  checkpointVerification: string;
  stopCondition: string;
  isReversible: boolean;
  rollbackGuidance?: string;
}

/**
 * Structured Advisory Action Plan
 */
export interface DecisionPlan {
  id: string;
  objective: string;
  selectedOptionId: string;
  selectedOptionTitle: string;
  rationale: string;
  prerequisites: string[];
  orderedSteps: DecisionStep[];
  dependencies: string[];
  checkpoints: string[];
  stopConditions: string[];
  uncertainty: DecisionUncertainty;
  rollbackGuidance: string;
  unresolvedQuestions: string[];
  isAdvisory: true;
}

/**
 * Decision Recommendation
 */
export interface DecisionRecommendation {
  type: DecisionRecommendationType;
  selectedOptionId?: string;
  selectedOptionKey?: string;
  selectedOptionTitle?: string;
  summary: string;
  rationale: string;
  conditions?: string[];
  informationRequests?: string[];
  warnings: string[];
}

/**
 * Provenance Record
 */
export interface DecisionProvenance {
  layer: string;
  identifier: string;
  authority: EpistemicAuthority;
  epistemicState: EpistemicState;
  scope: EpistemicScope;
  topic?: string;
}

/**
 * Decision Budget Configuration
 */
export interface DecisionBudgetConfig {
  maxCandidates?: number;
  maxCriteria?: number;
  maxEvidenceRefs?: number;
  maxRisks?: number;
  maxTradeoffs?: number;
  maxPlanSteps?: number;
  maxDirectives?: number;
  maxTotalItems?: number;
}

/**
 * Default Decision Budget Limits
 */
export const DEFAULT_DECISION_BUDGET: Required<DecisionBudgetConfig> = {
  maxCandidates: 20,
  maxCriteria: 20,
  maxEvidenceRefs: 100,
  maxRisks: 50,
  maxTradeoffs: 30,
  maxPlanSteps: 30,
  maxDirectives: 20,
  maxTotalItems: 250,
};

/**
 * Hard Ceilings for Decision Budget
 */
export const HARD_CEILING_DECISION_BUDGET: Required<DecisionBudgetConfig> = {
  maxCandidates: 50,
  maxCriteria: 50,
  maxEvidenceRefs: 200,
  maxRisks: 100,
  maxTradeoffs: 60,
  maxPlanSteps: 50,
  maxDirectives: 40,
  maxTotalItems: 500,
};

/**
 * Deterministic Diagnostics
 */
export interface DecisionDiagnostics {
  candidatesDiscovered: number;
  candidatesEvaluated: number;
  candidatesBlocked: number;
  candidatesRejected: number;
  candidatesConditionallySupported: number;
  candidatesRecommended: number;
  hardConstraintViolations: number;
  goalAlignmentConflicts: number;
  epistemicWarnings: number;
  contradictionWarnings: number;
  causalWarnings: number;
  multiHopWarnings: number;
  simulationWarnings: number;
  assumptionWarnings: number;
  temporalWarnings: number;
  scopeRejections: number;
  riskFlags: number;
  tradeoffConflicts: number;
  informationRequests: number;
  decisionsDeferred: number;
  plansGenerated: number;
  directivesGenerated: number;
  sanitizationCount: number;
  budgetTruncations: number;
}

/**
 * Complete Decision Analysis Output
 */
export interface DecisionAnalysis {
  decisionState: DecisionState;
  objective: string;
  candidates: DecisionCandidate[];
  evaluations: DecisionEvaluation[];
  ranking: DecisionRanking[];
  recommendation: DecisionRecommendation;
  selectedOption?: DecisionCandidate;
  tradeoffs: DecisionTradeoff[];
  risks: DecisionRisk[];
  actionPlan?: DecisionPlan;
  uncertainty: DecisionUncertainty;
  unresolvedQuestions: string[];
  sanitizedDirectives: string[];
  directives: string[];
  diagnostics: DecisionDiagnostics;
  provenance: DecisionProvenance[];
}

/**
 * Input Options for Deliberative Decision Engine
 */
export interface DecisionEngineOptions {
  userId?: string;
  currentTime?: number;
  budget?: DecisionBudgetConfig;
  strictTopicIsolation?: boolean;
  activeTopic?: string;
  explicitCandidateOptions?: Array<{
    candidateKey?: string;
    title: string;
    description?: string;
    source?: DecisionCandidateSource;
    scope?: EpistemicScope;
    topic?: string;
    benefits?: string[];
    risks?: string[] | DecisionRisk[];
    dependencies?: string[];
    assumptions?: string[];
    reversibility?: DecisionReversibility;
  }>;
}

/**
 * Complete Input Package for Deliberative Decision Engine
 */
export interface DecisionEngineInput {
  userId?: string;
  message?: string;
  context?: ConversationContext;
  intent?: StructuredIntent;
  reasoning?: ReasoningAnalysis;
  planning?: PlanningAnalysis;
  verification?: VerificationAnalysis;
  executiveContext?: ExecutiveContextPackage;
  deepReasoning?: DeepReasoningAnalysis;
  contradictionResolution?: ContradictionResolutionAnalysis;
  causalReasoning?: CausalReasoningAnalysis;
  multiHopReasoning?: MultiHopReasoningAnalysis;
  epistemicCalibration?: EpistemicCalibrationAnalysis;
  scenarioSimulation?: ScenarioSimulationAnalysis;
  metaReasoning?: MetaReasoningAnalysis;
  memoryGovernance?: MemoryGovernanceAnalysis;
  temporalMemory?: TemporalMemoryAnalysis;
  userModel?: UserModelAnalysis;
  goalProject?: GoalProjectAnalysis;
  contextContinuity?: ContextContinuityAnalysis;
  predictiveContext?: PredictiveContextAnalysis;
  history?: ConversationTurn[];
  options?: DecisionEngineOptions;
}
