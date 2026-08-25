/**
 * Dora Deep Reasoning & Hypothesis Management Engine Types
 * Phase 3 — Step 1
 * 
 * Provides strict, deterministic, non-LLM reasoning contracts to evaluate
 * authorized cognitive inputs into grounded hypotheses, explicit contradictions,
 * calibrated uncertainty, and decision-ready conclusions.
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

/**
 * Strict Authority Hierarchy Levels for Deep Reasoning.
 */
export type ReasoningEvidenceAuthority =
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
 * Canonical Authority Weight Mapping.
 */
export const REASONING_AUTHORITY_WEIGHTS: Record<ReasoningEvidenceAuthority, number> = {
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
 * Scope of Reasoning Evidence.
 */
export type ReasoningEvidenceScope =
  | "GLOBAL"
  | "TOPIC_SPECIFIC"
  | "PROJECT_SPECIFIC"
  | "TURN_EPHEMERAL";

/**
 * Sanitized, structured evidence item extracted from authorized inputs.
 */
export interface ReasoningEvidence {
  id: string;
  statement: string;
  source: string;
  authority: ReasoningEvidenceAuthority;
  authorityWeight: number;
  relevance: number;
  reliability: number;
  timestamp?: number;
  scope: ReasoningEvidenceScope;
  provenance: string;
  topic?: string;
  isNegated?: boolean;
  normalizedKey?: string;
  normalizedValue?: string;
}

/**
 * Status classification for a Reasoning Hypothesis.
 */
export type HypothesisStatus =
  | "SUPPORTED"
  | "PLAUSIBLE"
  | "UNCERTAIN"
  | "CONTRADICTED"
  | "REJECTED";

/**
 * Structured reasoning hypothesis derived strictly from evidence.
 */
export interface ReasoningHypothesis {
  id: string;
  statement: string;
  targetSubject: string;
  proposedActionOrFact: string;
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  supportScore: number;
  contradictionScore: number;
  confidence: number;
  uncertainty: ReasoningUncertaintyLevel;
  status: HypothesisStatus;
  winningAuthority?: ReasoningEvidenceAuthority;
  sanitizedDirective?: string;
}

/**
 * Evaluation metrics for a hypothesis.
 */
export interface HypothesisEvaluation {
  hypothesisId: string;
  supportScore: number;
  contradictionScore: number;
  netScore: number;
  independentSupportCount: number;
  highestSupportingAuthority: ReasoningEvidenceAuthority;
  highestContradictingAuthority?: ReasoningEvidenceAuthority;
  isAuthorityConsistent: boolean;
  status: HypothesisStatus;
  evaluationTrace: string[];
}

/**
 * Contradiction resolution status.
 */
export type ContradictionResolutionStatus =
  | "RESOLVED_BY_AUTHORITY"
  | "RESOLVED_BY_CURRENT_TURN"
  | "TEMPORAL_OVERRIDE"
  | "SCOPE_CONFLICT"
  | "UNRESOLVED";

/**
 * Explicit contradiction detected between conflicting evidence items.
 */
export interface ReasoningContradiction {
  id: string;
  conflictingEvidenceIds: string[];
  subject: string;
  authorityComparison: {
    higherAuthorityId?: string;
    lowerAuthorityId?: string;
    higherAuthority?: ReasoningEvidenceAuthority;
    lowerAuthority?: ReasoningEvidenceAuthority;
    difference: number;
  };
  conflictScope: ReasoningEvidenceScope;
  resolutionStatus: ContradictionResolutionStatus;
  winningEvidenceId?: string;
  explanation: string;
}

/**
 * Bounded uncertainty level.
 */
export type ReasoningUncertaintyLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

/**
 * Structured uncertainty assessment.
 */
export interface ReasoningUncertainty {
  overallLevel: ReasoningUncertaintyLevel;
  evidenceGaps: string[];
  ambiguityDetected: boolean;
  conflictingSignalsCount: number;
  unresolvedContradictionsCount: number;
  isSufficientForConclusion: boolean;
}

/**
 * Final reasoning conclusion classification.
 */
export type ConclusionType =
  | "SUPPORTED_CONCLUSION"
  | "TENTATIVE_CONCLUSION"
  | "UNRESOLVED_CONCLUSION"
  | "NO_CONCLUSION";

/**
 * Grounded conclusion output.
 */
export interface ReasoningConclusion {
  type: ConclusionType;
  primaryHypothesisId?: string;
  statement: string;
  confidence: number;
  uncertainty: ReasoningUncertaintyLevel;
  justification: string[];
  sanitizedDirectives: string[];
  requiresClarification: boolean;
  clarificationPrompt?: string;
}

/**
 * Configurable budget limits for reasoning bounds.
 */
export interface DeepReasoningBudgetConfig {
  maxEvidence: number;           // default: 50
  maxHypotheses: number;         // default: 10
  maxEvidencePerHypothesis: number; // default: 10
  maxContradictions: number;     // default: 20
  maxReasoningSteps: number;     // default: 25
  maxDirectives: number;         // default: 10
}

/**
 * Default budget limits.
 */
export const DEFAULT_DEEP_REASONING_BUDGET: DeepReasoningBudgetConfig = {
  maxEvidence: 50,
  maxHypotheses: 10,
  maxEvidencePerHypothesis: 10,
  maxContradictions: 20,
  maxReasoningSteps: 25,
  maxDirectives: 10,
};

/**
 * Diagnostic metrics for DeepReasoningEngine.
 */
export interface DeepReasoningDiagnostics {
  totalEvidenceExamined: number;
  authorizedEvidenceCount: number;
  suppressedEvidenceCount: number;
  sensitiveBlockedCount: number;
  identityInferenceBlockedCount: number;
  topicIsolatedCount: number;
  staleSupersededBlockedCount: number;
  deduplicatedCount: number;
  hypothesesGeneratedCount: number;
  contradictionsDetectedCount: number;
  contradictionsResolvedCount: number;
  unresolvedContradictionsCount: number;
  stepsExecuted: number;
  executionTimeMs: number;
  isDeterministic: boolean;
}

/**
 * Full output package of DeepReasoningEngine.
 */
export interface DeepReasoningAnalysis {
  evidence: ReasoningEvidence[];
  hypotheses: ReasoningHypothesis[];
  evaluations: HypothesisEvaluation[];
  contradictions: ReasoningContradiction[];
  uncertainty: ReasoningUncertainty;
  conclusion: ReasoningConclusion;
  sanitizedDirectives: string[];
  diagnostics: DeepReasoningDiagnostics;
}

/**
 * Options for deep reasoning execution.
 */
export interface DeepReasoningOptions {
  userId?: string;
  currentTime?: number;
  budgetConfig?: Partial<DeepReasoningBudgetConfig>;
  strictTopicIsolation?: boolean;
  activeTopic?: string;
}

/**
 * Input contract for Deep Reasoning Engine.
 */
export interface DeepReasoningInput {
  userId?: string;
  message: string;
  context?: ConversationContext;
  intent?: StructuredIntent;
  executiveContext?: ExecutiveContextPackage;
  contextContinuity?: ContextContinuityAnalysis;
  userModel?: UserModelAnalysis;
  temporalMemory?: TemporalMemoryAnalysis;
  goalProject?: GoalProjectAnalysis;
  predictiveContext?: PredictiveContextAnalysis;
  governanceAnalysis?: MemoryGovernanceAnalysis;
  memoryGovernance?: MemoryGovernanceAnalysis;
  verification?: VerificationAnalysis;
  reasoning?: ReasoningAnalysis;
  planning?: PlanningAnalysis;
  history?: ConversationTurn[];
  options?: DeepReasoningOptions;
}
