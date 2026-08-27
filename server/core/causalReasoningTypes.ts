/**
 * Dora Causal & Counterfactual Reasoning Engine Types
 * Phase 3 — Step 3
 * 
 * Defines strict, deterministic, non-LLM contracts for causal dependency classification,
 * causal chain construction, necessity/sufficiency evaluation, counterfactual exploration,
 * and safe causal directive generation.
 */

import { ConversationContext, ConversationTurn } from "./contextTypes";
import { StructuredIntent } from "./intentTypes";
import { MemoryGovernanceAnalysis } from "./memoryGovernanceTypes";
import { UserModelAnalysis } from "./longTermUserModelTypes";
import { TemporalMemoryAnalysis } from "./temporalMemoryTypes";
import { GoalProjectAnalysis } from "./goalProjectTypes";
import { ContextContinuityAnalysis } from "./contextContinuityTypes";
import { PredictiveContextAnalysis } from "./predictiveContextTypes";
import { ExecutiveContextPackage } from "./executiveContextTypes";
import {
  DeepReasoningAnalysis,
  ReasoningEvidence,
  ReasoningEvidenceAuthority,
  ReasoningEvidenceScope,
} from "./deepReasoningTypes";
import { ContradictionResolutionAnalysis } from "./contradictionResolutionTypes";

/**
 * Deterministic Turn Intent for Causal Reasoning.
 */
export type TurnCausalIntent =
  | "ASSERTION"
  | "QUESTION"
  | "HYPOTHETICAL"
  | "SPECULATION"
  | "CONDITIONAL"
  | "ASSISTANT_ATTRIBUTION"
  | "OBSERVATION"
  | "UNKNOWN";

/**
 * Deterministic Causal Classification Categories.
 */
export type CausalRelationType =
  | "DIRECT_CAUSE"              // Direct, unmediated causal link (A -> B)
  | "INDIRECT_CAUSE"            // Mediated causal chain (A -> M -> B)
  | "CONTRIBUTORY_FACTOR"       // Increases probability/severity; not solely sufficient
  | "NECESSARY_CONDITION"       // B cannot happen without A (~A -> ~B)
  | "SUFFICIENT_CONDITION"      // A is sufficient to produce B (A -> B)
  | "NECESSARY_AND_SUFFICIENT" // A is both necessary and sufficient (A <-> B)
  | "CORRELATION_ONLY"          // Co-occurring in data/time with no causal link established
  | "REVERSE_CAUSATION"         // Direction is actually B -> A
  | "CONFOUNDED"                // Common unobserved or third variable Z causes both A and B
  | "COINCIDENCE"               // Temporal or statistical adjacency with zero causal connection
  | "SPURIOUS"                  // Invalid inference or statistical illusion
  | "UNRESOLVED";               // Insufficient evidence to establish or refute causality

/**
 * Counterfactual Outcome Classification.
 */
export type CounterfactualOutcome =
  | "WOULD_NOT_HAPPEN"      // If ~A occurred, B would definitely not have happened
  | "WOULD_STILL_HAPPEN"    // If ~A occurred, B would still have happened via other causes
  | "PARTIALLY_MODIFIED"    // If ~A occurred, B would happen with reduced intensity/variation
  | "UNCERTAIN"             // Insufficient information to determine downstream counterfactual state
  | "UNSUPPORTED";          // Counterfactual premise is ungrounded or contradicts invariant laws

/**
 * Necessity & Sufficiency Status.
 */
export type NecessitySufficiencyClassification =
  | "NECESSARY_ONLY"
  | "SUFFICIENT_ONLY"
  | "NECESSARY_AND_SUFFICIENT"
  | "CONTRIBUTORY_INUS"     // Insufficient but Necessary part of an Unnecessary but Sufficient condition
  | "NEITHER"
  | "UNRESOLVED";

/**
 * Structured Causal Evidence node.
 */
export interface CausalEvidenceNode {
  id: string;
  label: string;
  statement: string;
  authority: ReasoningEvidenceAuthority;
  scope?: ReasoningEvidenceScope | string;
  timestamp?: number;
  isObserved: boolean;
  confidence: number;
  sourceType: "USER_ASSERTION" | "SYSTEM_FACT" | "PREDICTIVE_INFERENCE" | "TEMPORAL_EVENT" | "COUNTERFACTUAL_PREMISE" | "SPECULATIVE_CLAIM";
}

/**
 * Structured Causal Relation evaluated between cause and effect nodes.
 */
export interface CausalRelation {
  id: string;
  causeId: string;
  effectId: string;
  causeStatement: string;
  effectStatement: string;
  relationType: CausalRelationType;
  necessityScore: number;       // [0, 1] degree to which ~Cause implies ~Effect
  sufficiencyScore: number;     // [0, 1] degree to which Cause implies Effect
  confidence: number;           // [0, 1] overall confidence in causal link
  evidenceAuthority: ReasoningEvidenceAuthority;
  temporalOrderValid: boolean;  // True if Cause occurred before or at same time as Effect
  isPostHocFallacyAvoided: boolean; // True if temporal ordering alone was rejected as proof of causality
  mechanism?: string;           // Plausible underlying deterministic mechanism
  interveningVariables: string[]; // Intermediate steps in causal chain
  confoundingFactors: string[];   // Potential shared common causes
  scope: string;
  isCurrentTurnExplicit: boolean;
}

/**
 * Causal Chain (Path of causal relations A -> B -> ... -> N).
 */
export interface CausalChain {
  id: string;
  rootCauseId: string;
  finalEffectId: string;
  stepNodeIds: string[];
  relations: CausalRelation[];
  chainLength: number;
  overallConfidence: number;
  bottleneckNodeId?: string;
  description: string;
}

/**
 * Counterfactual Scenario & Evaluation.
 */
export interface CounterfactualScenario {
  id: string;
  scenarioName: string;
  targetRelationId?: string;
  antecedentModification: {
    originalCondition: string;
    counterfactualPremise: string; // e.g. "If the user had NOT deleted .env"
    inversionType: "NEGATION" | "SUBSTITUTION" | "MODIFICATION";
  };
  consequentEvaluation: {
    targetEffect: string;
    projectedOutcome: CounterfactualOutcome;
    outcomeExplanation: string;
    counterfactualNecessityEstablished: boolean; // True if outcome WOULD_NOT_HAPPEN
    closestWorldDistance: number; // [0, 1] minimal change metric (0 = very close, 1 = distant)
  };
  confidence: number;
  isGroundedInVerifiedFacts: boolean;
}

/**
 * Configurable Budget Limits for Causal Reasoning.
 */
export interface CausalReasoningBudgetConfig {
  maxCausalRelations: number;    // default: 25
  maxCounterfactuals: number;    // default: 20
  maxCausalChains: number;       // default: 15
  maxEvidenceNodes: number;      // default: 30
  maxDirectives: number;         // default: 10
}

/**
 * Default Budget Limits.
 */
export const DEFAULT_CAUSAL_REASONING_BUDGET: CausalReasoningBudgetConfig = {
  maxCausalRelations: 25,
  maxCounterfactuals: 20,
  maxCausalChains: 15,
  maxEvidenceNodes: 30,
  maxDirectives: 10,
};

/**
 * Diagnostics recorded during causal and counterfactual reasoning.
 */
export interface CausalReasoningDiagnostics {
  totalEvidenceNodesExamined: number;
  totalRelationsIdentified: number;
  directCausesCount: number;
  indirectCausesCount: number;
  correlationsIsolatedCount: number;
  postHocFallaciesBlockedCount: number;
  confoundedRelationsCount: number;
  counterfactualsEvaluatedCount: number;
  causalChainsConstructedCount: number;
  topicIsolatedSuppressedCount: number;
  sensitiveTokensSuppressedCount: number;
  budgetTruncatedCount: number;
  questionsSuppressedCount: number;
  hypotheticalsSuppressedCount: number;
  speculationsSuppressedCount: number;
  assistantAttributionsSuppressedCount: number;
  executionTimeMs: number;
}

/**
 * Complete Causal & Counterfactual Reasoning Analysis Output.
 */
export interface CausalReasoningAnalysis {
  status: "COMPLETE" | "EMPTY" | "DEGRADED" | "BUDGET_TRUNCATED";
  primaryCausalClaim?: string;
  nodes: CausalEvidenceNode[];
  relations: CausalRelation[];
  chains: CausalChain[];
  counterfactuals: CounterfactualScenario[];
  activeDirectives: string[];
  diagnostics: CausalReasoningDiagnostics;
}

/**
 * Options for executing Causal Reasoning Engine.
 */
export interface CausalReasoningOptions {
  userId?: string;
  currentTime?: number;
  strictTopicIsolation?: boolean;
  activeTopic?: string;
  budget?: Partial<CausalReasoningBudgetConfig>;
  allowCounterfactualSimulation?: boolean;
}

/**
 * Comprehensive input package for Causal Reasoning Engine.
 */
export interface CausalReasoningInput {
  userId?: string;
  message: string;
  context?: ConversationContext;
  intent?: StructuredIntent;
  reasoning?: any;
  planning?: any;
  verification?: any;
  deepReasoning?: DeepReasoningAnalysis;
  contradictionResolution?: ContradictionResolutionAnalysis;
  executiveContext?: ExecutiveContextPackage;
  memoryGovernance?: MemoryGovernanceAnalysis;
  temporalMemory?: TemporalMemoryAnalysis;
  userModel?: UserModelAnalysis;
  goalProject?: GoalProjectAnalysis;
  contextContinuity?: ContextContinuityAnalysis;
  predictiveContext?: PredictiveContextAnalysis;
  history?: ConversationTurn[];
  options?: CausalReasoningOptions;
}
