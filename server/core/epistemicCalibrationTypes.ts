/**
 * Dora Uncertainty, Confidence & Epistemic Calibration Engine Types
 * Phase 3 — Step 5
 * 
 * Defines deterministic, bounded, non-LLM contracts for epistemic state classification,
 * uncertainty dimensions, confidence calibration, hop-depth penalties, contradiction adjustments,
 * causal ambiguity propagation, and sanitized epistemic prompt directives.
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

/**
 * Strict Authority Hierarchy Levels for Epistemic Calibration.
 * Matches canonical DORA Phase 3 hierarchy.
 */
export type EpistemicAuthority =
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
 * Authority Weight Mapping for Epistemic Calibration.
 */
export const EPISTEMIC_AUTHORITY_WEIGHTS: Record<EpistemicAuthority, number> = {
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
 * Strongly typed Epistemic States.
 */
export type EpistemicState =
  | "VERIFIED"    // Directly supported by authorized verified evidence
  | "KNOWN"       // Established from authoritative existing context
  | "SUPPORTED"   // Strongly supported by multiple valid evidence sources but not directly verified fact
  | "INFERRED"    // Derived through one or more valid reasoning operations
  | "UNCERTAIN"   // Plausible but evidence is insufficient or materially incomplete
  | "CONTESTED"   // Competing credible evidence exists without definitive resolution
  | "UNKNOWN"     // There is insufficient authorized evidence to determine the claim
  | "REJECTED"    // The claim fails eligibility, provenance, safety, or logical validity
  | "ADVISORY";   // Predictive or otherwise non-authoritative suggestion

/**
 * Epistemic State Rank mapping for deterministic ordering.
 * Higher rank = stronger epistemic warrant.
 */
export const EPISTEMIC_STATE_RANKS: Record<EpistemicState, number> = {
  VERIFIED: 9,
  KNOWN: 8,
  SUPPORTED: 7,
  INFERRED: 6,
  UNCERTAIN: 5,
  CONTESTED: 4,
  ADVISORY: 3,
  UNKNOWN: 2,
  REJECTED: 1,
};

/**
 * Scope boundaries for Epistemic Claims.
 */
export type EpistemicScope =
  | "GLOBAL"
  | "TOPIC"
  | "PROJECT"
  | "GOAL"
  | "COMMITMENT"
  | "CURRENT_TURN";

/**
 * Calibrated confidence band labels.
 */
export type ConfidenceLabel =
  | "VERY_HIGH"  // >= 0.85
  | "HIGH"       // >= 0.70
  | "MODERATE"   // >= 0.50
  | "LOW"        // >= 0.30
  | "VERY_LOW";  // < 0.30

/**
 * Epistemic Provenance item tracking originating evidence.
 */
export interface EpistemicProvenance {
  sourceId: string;
  sourceType:
    | "EXECUTIVE_FACT"
    | "DEEP_REASONING"
    | "CONTRADICTION_RESOLUTION"
    | "CAUSAL_RELATION"
    | "MULTI_HOP_CHAIN"
    | "USER_MODEL"
    | "TEMPORAL_MEMORY"
    | "GOAL_PROJECT"
    | "PREDICTIVE_CONTEXT"
    | "DIRECT_USER_INPUT";
  authority: EpistemicAuthority;
  confidence: number;
  statement: string;
  scope: EpistemicScope;
  topic: string;
}

/**
 * Multi-dimensional Epistemic Uncertainty breakdown (all bounded [0, 1]).
 */
export interface EpistemicUncertainty {
  overallUncertainty: number;
  evidenceInsufficiency: number;
  sourceConflict: number;
  inferenceDepth: number;
  provenanceWeakness: number;
  temporalStaleness: number;
  scopeAmbiguity: number;
  topicAmbiguity: number;
  predictiveDependence: number;
  missingEvidence: number;
  causalAmbiguity: number;
}

/**
 * Competing claim record for contested epistemic claims.
 */
export interface CompetingClaim {
  claimId: string;
  statement: string;
  authority: EpistemicAuthority;
  confidence: number;
}

/**
 * Primary calibrated epistemic claim representation.
 */
export interface EpistemicClaim {
  id: string;
  normalizedKey: string;
  statement: string;
  epistemicState: EpistemicState;
  authority: EpistemicAuthority;
  authorityWeight: number;
  confidence: number;               // Bounded [0.0, 1.0]
  confidenceLabel: ConfidenceLabel;
  uncertainty: EpistemicUncertainty;
  scope: EpistemicScope;
  topic: string;
  evidenceRefs: string[];
  provenance: EpistemicProvenance[];
  independentSupportCount: number;
  contradictionCount: number;
  hopDepth: number;
  sourceType: string;
  calibrationReason: string;
  isContested?: boolean;
  isAdvisory?: boolean;
  isSuppressed?: boolean;
  competingClaims?: CompetingClaim[];
}

/**
 * Audit record of a calibration adjustment applied to an epistemic claim.
 */
export interface EpistemicCalibrationRecord {
  id: string;
  claimId: string;
  originalState: EpistemicState;
  calibratedState: EpistemicState;
  originalConfidence: number;
  calibratedConfidence: number;
  confidenceDelta: number;
  reason: string;
  appliedCeilings: string[];
  uncertaintyFactors: string[];
}

/**
 * Budget limits for Epistemic Calibration Engine.
 */
export interface EpistemicCalibrationBudgetConfig {
  maxClaims: number;
  maxEvidenceRefsPerClaim: number;
  maxCalibrationRecords: number;
  maxUncertainties: number;
  maxDirectives: number;
  maxTotalItems: number;
}

export const DEFAULT_EPISTEMIC_CALIBRATION_BUDGET: EpistemicCalibrationBudgetConfig = {
  maxClaims: 20,
  maxEvidenceRefsPerClaim: 10,
  maxCalibrationRecords: 30,
  maxUncertainties: 30,
  maxDirectives: 6,
  maxTotalItems: 100,
};

/**
 * Comprehensive diagnostic metrics for Epistemic Calibration.
 */
export interface EpistemicCalibrationDiagnostics {
  claimsEvaluated: number;
  verifiedClaims: number;
  knownClaims: number;
  supportedClaims: number;
  inferredClaims: number;
  uncertainClaims: number;
  contestedClaims: number;
  unknownClaims: number;
  advisoryClaims: number;
  rejectedClaims: number;
  confidenceDowngrades: number;
  uncertaintyIncreases: number;
  contradictionAdjustments: number;
  causalAmbiguityAdjustments: number;
  multiHopAdjustments: number;
  predictiveSuppressionCount: number;
  unsupportedEvidenceCount: number;
  missingProvenanceCount: number;
  duplicateEvidenceSuppressed: number;
  budgetTruncations: number;
  directivesSanitized: number;
  evaluationTimeMs?: number;
}

/**
 * Output analysis package from Epistemic Calibration Engine.
 */
export interface EpistemicCalibrationAnalysis {
  claims: EpistemicClaim[];
  calibrationRecords: EpistemicCalibrationRecord[];
  uncertainties: Array<{ claimId: string; uncertainty: EpistemicUncertainty }>;
  contestedClaims: EpistemicClaim[];
  unknownClaims: EpistemicClaim[];
  directives: string[];
  diagnostics: EpistemicCalibrationDiagnostics;
}

/**
 * Execution options for Epistemic Calibration Engine.
 */
export interface EpistemicCalibrationOptions {
  userId?: string;
  currentTime?: number;
  activeTopic?: string;
  strictTopicIsolation?: boolean;
  budget?: Partial<EpistemicCalibrationBudgetConfig>;
}

/**
 * Input package for Epistemic Calibration Engine.
 */
export interface EpistemicCalibrationInput {
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
  memoryGovernance?: MemoryGovernanceAnalysis;
  temporalMemory?: TemporalMemoryAnalysis;
  userModel?: UserModelAnalysis;
  goalProject?: GoalProjectAnalysis;
  contextContinuity?: ContextContinuityAnalysis;
  predictiveContext?: PredictiveContextAnalysis;
  history?: ConversationTurn[];
  options?: EpistemicCalibrationOptions;
}
