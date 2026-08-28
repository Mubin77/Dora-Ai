/**
 * Dora Multi-Hop Reasoning & Evidence Chain Engine Types
 * Phase 3 — Step 4
 * 
 * Defines strict, deterministic, non-LLM contracts for multi-hop evidence chaining,
 * bounded graph traversal, provenance tracking, cycle rejection, authority degradation,
 * and sanitized grounded conclusion synthesis.
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

/**
 * Strict Authority Hierarchy Levels for Multi-Hop Reasoning.
 * Identical to DORA Phase 3 canonical hierarchy.
 */
export type MultiHopEvidenceAuthority =
  | "CURRENT_TURN_EXPLICIT"            // 1.00 - Explicit current instruction
  | "HARD_CONSTRAINT"                  // 0.95 - Hard safety/governance constraint
  | "VERIFIED_EVIDENCE"                // 0.90 - Verified tool output / validated fact
  | "GOVERNANCE_APPROVED_MEMORY"       // 0.80 - Memory passed governance
  | "CONFIRMED_USER_MODEL"             // 0.75 - Confirmed user model attribute
  | "ACTIVE_GOAL_PROJECT_COMMITMENT"   // 0.70 - Active project/goal/commitment
  | "TEMPORAL_CONTEXT"                 // 0.60 - Stable/recurring temporal pattern
  | "CONFIRMED_ADAPTIVE_PATTERN"       // 0.50 - Confirmed adaptive habit
  | "PREDICTIVE_CONTEXT"               // 0.30 - Predictive context (Advisory only)
  | "SYSTEM_DEFAULT";                  // 0.10 - Fallback system default

/**
 * Authority Weight Mapping for Multi-Hop Reasoning.
 */
export const MULTI_HOP_AUTHORITY_WEIGHTS: Record<MultiHopEvidenceAuthority, number> = {
  CURRENT_TURN_EXPLICIT: 1.00,
  HARD_CONSTRAINT: 0.95,
  VERIFIED_EVIDENCE: 0.90,
  GOVERNANCE_APPROVED_MEMORY: 0.80,
  CONFIRMED_USER_MODEL: 0.75,
  ACTIVE_GOAL_PROJECT_COMMITMENT: 0.70,
  TEMPORAL_CONTEXT: 0.60,
  CONFIRMED_ADAPTIVE_PATTERN: 0.50,
  PREDICTIVE_CONTEXT: 0.30,
  SYSTEM_DEFAULT: 0.10,
};

/**
 * Scope boundaries for Multi-Hop Evidence & Chains.
 */
export type MultiHopScope =
  | "GLOBAL"
  | "TOPIC"
  | "PROJECT"
  | "GOAL"
  | "COMMITMENT"
  | "CURRENT_TURN";

/**
 * Eligibility status of evidence node.
 */
export type MultiHopEvidenceEligibility =
  | "ELIGIBLE"
  | "QUARANTINED"
  | "EXPIRED"
  | "DELETED"
  | "SUPERSEDED"
  | "UNAUTHORIZED";

/**
 * Inference classification taxonomy for individual hops.
 */
export type MultiHopInferenceType =
  | "DIRECT_DEDUCTION"            // Single-step direct logical deduction from facts
  | "CHAINED_DEDUCTION"           // Multi-step syllogistic deduction (A -> B, B -> C => A -> C)
  | "CAUSAL_PROPAGATION"          // Propagation across verified causal dependency link
  | "CONSTRAINT_PROPAGATION"      // Safety/governance boundary propagation
  | "TEMPORAL_PROPAGATION"        // Historical transition or lifecycle propagation
  | "GOAL_PROPAGATION"            // Goal-to-subgoal/blocker dependency propagation
  | "CONTRADICTION_RESOLUTION"    // Propagation through resolved belief revision
  | "CONTEXTUAL_INFERENCE"        // Contextual entity/topic linkage
  | "SUPPORTED_GENERALIZATION"    // Bounded inductive pattern with >= 3 independent observations
  | "UNRESOLVED_INFERENCE";       // Inference path with unresolved ambiguity or conflict

/**
 * Status of a multi-hop reasoning chain.
 */
export type MultiHopChainStatus =
  | "GROUNDED"     // Fully supported by authorized evidence across all hops
  | "UNRESOLVED"   // Branches on unresolved contradiction or missing bridge
  | "REJECTED"     // Violates cycle, unauthorized parent, or scope boundary
  | "TRUNCATED"    // Exceeds max depth ceiling
  | "ADVISORY";    // Grounded solely in predictive/advisory context

/**
 * Evidence Node in the Multi-Hop Reasoning Graph.
 */
export interface MultiHopEvidenceNode {
  id: string;
  normalizedKey: string;
  normalizedValue?: string;
  statement: string;
  sourceType:
    | "USER_ASSERTION"
    | "SYSTEM_FACT"
    | "PREDICTIVE_INFERENCE"
    | "TEMPORAL_EVENT"
    | "GOAL_PROJECT_STATE"
    | "CONTRADICTION_STATE"
    | "CAUSAL_STATE";
  authority: MultiHopEvidenceAuthority;
  authorityWeight: number;
  scope: MultiHopScope;
  topic?: string;
  provenance: string;
  timestamp?: number;
  evidenceKind: "FACT" | "RULE" | "OBSERVATION" | "HYPOTHESIS" | "RELATION" | "CONSTRAINT";
  eligibility: MultiHopEvidenceEligibility;
  confidence: number;
  isObserved: boolean;
}

/**
 * Individual Reasoning Hop between evidence nodes.
 */
export interface MultiHopReasoningHop {
  id: string;
  inputNodeIds: string[];
  outputNodeId: string;
  outputStatement: string;
  inferenceType: MultiHopInferenceType;
  justification: string;
  supportingEvidence: string[];
  authority: MultiHopEvidenceAuthority;
  authorityWeight: number;
  scope: MultiHopScope;
  topic?: string;
  hopIndex: number;
  confidence: number;
  provenance: string;
  isValid: boolean;
  rejectionReason?: string;
}

/**
 * Full Multi-Hop Reasoning Chain connecting root evidence to a conclusion.
 */
export interface MultiHopReasoningChain {
  id: string;
  hops: MultiHopReasoningHop[];
  rootEvidenceNodeIds: string[];
  terminalNodeId: string;
  terminalStatement: string;
  chainDepth: number;
  status: MultiHopChainStatus;
  rejectionReason?: string;
  primaryAuthority: MultiHopEvidenceAuthority;
  primaryAuthorityWeight: number;
  confidence: number;
  independentEvidenceCount: number;
  scope: MultiHopScope;
  topic?: string;
  isPredictiveOnly: boolean;
  hasCycle: boolean;
  sanitizedExplanation: string;
}

/**
 * Grounded Conclusion synthesized from validated reasoning chains.
 */
export interface MultiHopGroundedConclusion {
  id: string;
  statement: string;
  chainIds: string[];
  supportingEvidenceCount: number;
  independentSources: string[];
  confidence: number;
  authority: MultiHopEvidenceAuthority;
  scope: MultiHopScope;
  topic?: string;
  isAdvisory: boolean;
  traceableProvenance: {
    chainDepth: number;
    rootEvidenceKeys: string[];
    hopTypes: MultiHopInferenceType[];
  };
  sanitizedDirective: string;
}

/**
 * Budgeting configuration for Multi-Hop Engine.
 */
export interface MultiHopReasoningBudgetConfig {
  maxEvidenceNodes: number;
  maxHops: number;
  maxChains: number;
  maxConclusions: number;
  maxDirectives: number;
  maxTotalItems: number;
}

/**
 * Default budget limits with hard ceilings.
 */
export const DEFAULT_MULTI_HOP_BUDGET: MultiHopReasoningBudgetConfig = {
  maxEvidenceNodes: 24,
  maxHops: 3,
  maxChains: 10,
  maxConclusions: 8,
  maxDirectives: 5,
  maxTotalItems: 100,
};

export const HARD_CEILING_MULTI_HOP_BUDGET: MultiHopReasoningBudgetConfig = {
  maxEvidenceNodes: 50,
  maxHops: 5,
  maxChains: 25,
  maxConclusions: 20,
  maxDirectives: 10,
  maxTotalItems: 200,
};

/**
 * Diagnostics & Telemetry for Multi-Hop Reasoning.
 */
export interface MultiHopReasoningDiagnostics {
  evidenceNodesExtracted: number;
  evidenceNodesAccepted: number;
  evidenceNodesRejected: number;
  duplicateEvidenceSuppressed: number;
  hopsCreated: number;
  unsupportedHopsRejected: number;
  chainsCreated: number;
  chainsTruncated: number;
  cyclesDetected: number;
  cyclesRejected: number;
  topicConflictsRejected: number;
  scopeConflictsRejected: number;
  predictiveOnlyChainsSuppressed: number;
  unresolvedChains: number;
  maxDepthReached: number;
  directivesSanitized: number;
  questionsSuppressedCount: number;
  hypotheticalsSuppressedCount: number;
  speculationsSuppressedCount: number;
  assistantAttributionsSuppressedCount: number;
  evaluationTimeMs?: number;
}

/**
 * Complete Output Analysis of Multi-Hop Reasoning Engine.
 */
export interface MultiHopReasoningAnalysis {
  evidenceNodes: MultiHopEvidenceNode[];
  reasoningHops: MultiHopReasoningHop[];
  reasoningChains: MultiHopReasoningChain[];
  groundedConclusions: MultiHopGroundedConclusion[];
  unresolvedChains: MultiHopReasoningChain[];
  rejectedChains: MultiHopReasoningChain[];
  directives: string[];
  diagnostics: MultiHopReasoningDiagnostics;
  primaryConclusion?: string;
  // Ergonomic shorthand aliases
  hops?: MultiHopReasoningHop[];
  chains?: MultiHopReasoningChain[];
  conclusions?: MultiHopGroundedConclusion[];
}

/**
 * Execution options for Multi-Hop Engine.
 */
export interface MultiHopReasoningOptions {
  userId?: string;
  currentTime?: number;
  activeTopic?: string;
  strictTopicIsolation?: boolean;
  budget?: Partial<MultiHopReasoningBudgetConfig>;
}

/**
 * Input package passed to MultiHopReasoningEngine.evaluate().
 */
export interface MultiHopReasoningInput {
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
  memoryGovernance?: MemoryGovernanceAnalysis;
  temporalMemory?: TemporalMemoryAnalysis;
  userModel?: UserModelAnalysis;
  goalProject?: GoalProjectAnalysis;
  contextContinuity?: ContextContinuityAnalysis;
  predictiveContext?: PredictiveContextAnalysis;
  history?: ConversationTurn[];
  options?: MultiHopReasoningOptions;
}
