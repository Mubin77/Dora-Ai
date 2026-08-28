/**
 * Dora Scenario Simulation & Predictive Planning Engine Types
 * Phase 3 — Step 6
 * 
 * Defines deterministic, bounded, non-LLM contracts for scenario modeling,
 * bounded state perturbation, causal & constraint propagation, outcome projection,
 * risk/benefit/tradeoff evaluation, lexicographical scenario comparison,
 * assumption sensitivity analysis, and sanitized decision-ready predictive directives.
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
import { ExecutiveContextPackage } from "./executiveContextTypes";
import { DeepReasoningAnalysis } from "./deepReasoningTypes";
import { ContradictionResolutionAnalysis } from "./contradictionResolutionTypes";
import { CausalReasoningAnalysis } from "./causalReasoningTypes";
import { MultiHopReasoningAnalysis } from "./multiHopReasoningTypes";
import {
  EpistemicCalibrationAnalysis,
  EpistemicAuthority,
  EpistemicScope,
  EpistemicProvenance,
  EpistemicUncertainty,
} from "./epistemicCalibrationTypes";

/**
 * Supported bounded scenario types.
 */
export type ScenarioType =
  | "BASELINE"            // Reference state without simulated intervention
  | "WHAT_IF"             // Explicit exploratory intervention
  | "COUNTERFACTUAL"      // Alternative antecedent inquiry
  | "ALTERNATIVE_PLAN"    // Alternative action sequence for current objective
  | "BEST_CASE"           // Optimistic bounded assumption envelope
  | "WORST_CASE"          // Pessimistic bounded risk envelope
  | "EXPECTED_CASE"       // Evidence-supported projection envelope
  | "CONSTRAINT_CHANGE"   // Perturbation of relaxed/tightened constraint
  | "GOAL_CHANGE";        // Perturbation of adjusted goal/priority

/**
 * Epistemic status of simulated outcome.
 * MUST NEVER BE 'VERIFIED' OR 'KNOWN'.
 */
export type ScenarioEpistemicStatus =
  | "SIMULATED"
  | "PROJECTED"
  | "COUNTERFACTUAL"
  | "PREDICTIVE"
  | "ADVISORY"
  | "INVALID";

/**
 * Outcome category classification.
 */
export type OutcomeType =
  | "POSITIVE"
  | "NEGATIVE"
  | "MIXED"
  | "NEUTRAL"
  | "BLOCKED"
  | "UNRESOLVED";

/**
 * Classification of action reversibility.
 */
export type ActionReversibility =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "IRREVERSIBLE"
  | "UNKNOWN";

/**
 * Explicit assumption supporting a scenario.
 */
export interface ScenarioAssumption {
  id: string;
  statement: string;
  source: string;
  authority: EpistemicAuthority;
  confidence: number;            // Bounded [0.0, 1.0]
  uncertainty: number;           // Bounded [0.0, 1.0]
  required: boolean;
  isSupported: boolean;
  isSensitive: boolean;
  provenance: EpistemicProvenance[];
}

/**
 * Deterministic action in a scenario.
 */
export interface SimulationAction {
  actionKey: string;
  description: string;
  preconditions: string[];
  effects: string[];
  affectedEntities: string[];
  affectedGoals: string[];
  affectedConstraints: string[];
  riskFactors: string[];
  reversibility: ActionReversibility;
  isInvalid?: boolean;
  invalidationReason?: string;
  provenance: EpistemicProvenance[];
}

/**
 * Bounded state representation within simulation.
 */
export interface SimulationState {
  stateKey: string;
  facts: Array<{
    key: string;
    value: string;
    authority?: EpistemicAuthority;
    isSimulated?: boolean;
    confidence?: number;
  }>;
  constraints: Array<{
    key: string;
    description: string;
    isHard: boolean;
    isSatisfied: boolean;
  }>;
  goals: Array<{
    id: string;
    title: string;
    status: string;
    progress?: number;
  }>;
  commitments: Array<{
    id: string;
    description: string;
    status: string;
  }>;
  actions: SimulationAction[];
  risks: ScenarioRisk[];
  dependencies: string[];
  causalRelations: Array<{
    causeKey: string;
    effectKey: string;
    relationType: string;
    confidence: number;
  }>;
  temporalMarkers: Array<{
    label: string;
    stepIndex: number;
  }>;
  provenance: EpistemicProvenance[];
}

/**
 * Bounded risk dimension model (all metrics bounded in [0.0, 1.0]).
 */
export interface ScenarioRisk {
  id: string;
  description: string;
  likelihood: number;           // Bounded [0.0, 1.0]
  severity: number;             // Bounded [0.0, 1.0]
  reversibility: ActionReversibility;
  dependencyRisk: number;       // Bounded [0.0, 1.0]
  constraintRisk: number;       // Bounded [0.0, 1.0]
  uncertainty: number;          // Bounded [0.0, 1.0]
  overallRisk: number;          // Bounded [0.0, 1.0]
}

/**
 * Bounded benefit dimension model (all metrics bounded in [0.0, 1.0]).
 */
export interface ScenarioBenefit {
  id: string;
  description: string;
  goalAlignment: number;        // Bounded [0.0, 1.0]
  expectedUtility: number;      // Bounded [0.0, 1.0]
  reversibility: ActionReversibility;
  constraintCompatibility: number; // Bounded [0.0, 1.0]
  evidenceSupport: number;      // Bounded [0.0, 1.0]
  uncertainty: number;          // Bounded [0.0, 1.0]
  overallBenefit: number;       // Bounded [0.0, 1.0]
}

/**
 * Trade-off breakdown preserving distinct pros/cons without flattening.
 */
export interface ScenarioTradeoff {
  id: string;
  description: string;
  benefitFactors: string[];
  riskFactors: string[];
  uncertaintyFactors: string[];
  resourceFactors: string[];
  opportunityCosts: string[];
  unresolvedFactors: string[];
}

/**
 * Projected outcome of a simulated scenario.
 */
export interface ScenarioOutcome {
  outcomeKey: string;
  description: string;
  stateDelta: Record<string, string | number | boolean>;
  outcomeType: OutcomeType;
  projectedBenefits: ScenarioBenefit[];
  projectedRisks: ScenarioRisk[];
  tradeoffs: ScenarioTradeoff[];
  overallUncertainty: number;
  uncertaintyDetails?: EpistemicUncertainty;
  provenance: EpistemicProvenance[];
  epistemicStatus: ScenarioEpistemicStatus;
  isAssumptionSensitive: boolean;
  sensitiveAssumptionIds: string[];
}

/**
 * Full definition of a simulated scenario.
 */
export interface ScenarioDefinition {
  id: string;
  normalizedKey: string;
  title: string;
  description: string;
  scenarioType: ScenarioType;
  baseState: SimulationState;
  finalState?: SimulationState;
  assumptions: ScenarioAssumption[];
  actions: SimulationAction[];
  constraints: Array<{
    key: string;
    isHard: boolean;
    description: string;
  }>;
  scope: EpistemicScope;
  topic: string;
  outcome?: ScenarioOutcome;
  isValid: boolean;
  invalidationReasons: string[];
  provenance: EpistemicProvenance[];
  simulationConfidence: number;  // Bounded <= supportingEvidenceConfidence
  rankingScore?: number;
}

/**
 * Deterministic comparison across evaluated scenarios.
 */
export interface ScenarioComparison {
  comparisonKey: string;
  scenarioRefs: string[];
  preferredScenario?: string;
  rejectedScenarios: string[];
  unresolvedScenarios: string[];
  comparisonFactors: string[];
  tradeoffs: ScenarioTradeoff[];
  uncertainty: number;
  rationale: string;
  provenance: EpistemicProvenance[];
}

/**
 * Budget limits for Scenario Simulation Engine.
 */
export interface ScenarioSimulationBudgetConfig {
  maxScenarios: number;
  maxStepsPerScenario: number;
  maxBranches: number;
  maxOutcomes: number;
  maxActionsPerScenario: number;
  maxComparisons: number;
  maxDirectives: number;
  maxTotalItems: number;
}

export const DEFAULT_SCENARIO_SIMULATION_BUDGET: ScenarioSimulationBudgetConfig = {
  maxScenarios: 5,
  maxStepsPerScenario: 5,
  maxBranches: 3,
  maxOutcomes: 8,
  maxActionsPerScenario: 5,
  maxComparisons: 5,
  maxDirectives: 6,
  maxTotalItems: 100,
};

export const HARD_CEILING_SCENARIO_SIMULATION_BUDGET: ScenarioSimulationBudgetConfig = {
  maxScenarios: 10,
  maxStepsPerScenario: 10,
  maxBranches: 6,
  maxOutcomes: 15,
  maxActionsPerScenario: 10,
  maxComparisons: 10,
  maxDirectives: 10,
  maxTotalItems: 200,
};

/**
 * Diagnostic metrics for Scenario Simulation Engine.
 */
export interface ScenarioSimulationDiagnostics {
  scenariosRequested: number;
  scenariosEvaluated: number;
  scenariosRejected: number;
  invalidActions: number;
  constraintViolations: number;
  branchesCreated: number;
  branchesRejected: number;
  branchesTruncated: number;
  stepsExecuted: number;
  outcomesGenerated: number;
  unresolvedOutcomes: number;
  assumptionSensitiveOutcomes: number;
  contradictionAffectedScenarios: number;
  causalUncertaintyCount: number;
  predictiveOnlyInputs: number;
  unsupportedAssumptions: number;
  topicIsolationRejections: number;
  scopeIsolationRejections: number;
  budgetTruncations: number;
  directivesSanitized: number;
  scenariosTruncated: number;
  stepsTruncated: number;
  outcomesTruncated: number;
  evaluationTimeMs?: number;
}

/**
 * Output analysis package from Scenario Simulation Engine.
 */
export interface ScenarioSimulationAnalysis {
  baselineScenario?: ScenarioDefinition;
  scenarios: ScenarioDefinition[];
  outcomes: ScenarioOutcome[];
  comparisons: ScenarioComparison[];
  recommendedScenario?: ScenarioDefinition;
  unresolvedScenarios: ScenarioDefinition[];
  assumptions: ScenarioAssumption[];
  directives: string[];
  diagnostics: ScenarioSimulationDiagnostics;
}

/**
 * Options for Scenario Simulation execution.
 */
export interface ScenarioSimulationOptions {
  userId?: string;
  currentTime?: number;
  activeTopic?: string;
  strictTopicIsolation?: boolean;
  budget?: Partial<ScenarioSimulationBudgetConfig>;
  explicitScenarioRequest?: {
    type?: ScenarioType;
    interventions?: string[];
    assumptions?: string[];
  };
}

/**
 * Input package for Scenario Simulation Engine.
 */
export interface ScenarioSimulationInput {
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
  memoryGovernance?: MemoryGovernanceAnalysis;
  temporalMemory?: TemporalMemoryAnalysis;
  userModel?: UserModelAnalysis;
  goalProject?: GoalProjectAnalysis;
  contextContinuity?: ContextContinuityAnalysis;
  predictiveContext?: PredictiveContextAnalysis;
  history?: ConversationTurn[];
  options?: ScenarioSimulationOptions;
}
