/**
 * Dora Meta-Reasoning & Self-Critique Engine Types
 * Phase 3 — Step 7
 * 
 * Defines deterministic, bounded, non-LLM contracts for inspecting Dora's own authorized
 * reasoning outputs across all upstream cognitive layers (Steps 1–6, Executive Context, Memory,
 * Goals, Constraints) to audit logical coherence, epistemic calibration, causal validity,
 * assumption sensitivity, authority alignment, topic/scope isolation, and simulation/reality separation.
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
  EpistemicState,
  EpistemicScope,
  EpistemicProvenance,
  EpistemicUncertainty,
} from "./epistemicCalibrationTypes";
import { ScenarioSimulationAnalysis } from "./scenarioSimulationTypes";

/**
 * Deterministic Issue Classification Taxonomy.
 */
export type MetaReasoningIssueType =
  | "UNSUPPORTED_CLAIM"
  | "WEAK_EVIDENCE"
  | "AUTHORITY_MISMATCH"
  | "CONFIDENCE_OVERREACH"
  | "OVERCONFIDENCE"
  | "UNDERCONFIDENCE"
  | "EPISTEMIC_OVERCLAIM"
  | "CONTRADICTION_UNRESOLVED"
  | "CONTRADICTION_DISREGARD"
  | "CAUSAL_OVERREACH"
  | "CAUSAL_HALLUCINATION"
  | "POST_HOC_REASONING"
  | "CORRELATION_CAUSATION_CONFUSION"
  | "MULTI_HOP_OVERREACH"
  | "MULTI_HOP_BREAK"
  | "ASSUMPTION_OVERREACH"
  | "ASSUMPTION_FRAGILITY"
  | "MISSING_ASSUMPTION"
  | "SIMULATION_REALITY_CONFUSION"
  | "PREDICTION_AS_FACT"
  | "TOPIC_CONTAMINATION"
  | "TOPIC_BOUNDARY_SPILL"
  | "SCOPE_CONTAMINATION"
  | "TEMPORAL_OVERREACH"
  | "STALE_CONTEXT"
  | "STALE_MEMORY_RELIANCE"
  | "SPECULATIVE_PROPAGATION"
  | "UNANCHORED_HYPOTHESIS"
  | "DIRECTIVE_CONFLICT"
  | "LOGICAL_INVALIDITY"
  | "CIRCULAR_REASONING"
  | "REASONING_CYCLE"
  | "INSUFFICIENT_INFORMATION"
  | "UNJUSTIFIED_CERTAINTY"
  | "UNRESOLVED_AMBIGUITY"
  | "CONSTRAINT_VIOLATION"
  | "HARD_CONSTRAINT_VIOLATION"
  | "GOAL_MISALIGNMENT"
  | "DUPLICATE_EVIDENCE"
  | "PROVENANCE_BREAK"
  | "SANITIZATION_FAILURE"
  | "SENSITIVE_DATA_EXPOSURE";

/**
 * Deterministic severity level for detected meta-reasoning issues.
 */
export type MetaCritiqueSeverity =
  | "CRITICAL"   // Hard constraint violation, credential exposure, simulation presented as verified reality, major authority escalation
  | "MAJOR"      // Alias for high severity
  | "HIGH"       // Epistemic overclaim, causal overreach, major contradiction suppression, provenance break
  | "MEDIUM"     // Unsupported assumption, multi-hop overreach, temporal staleness, scope contamination
  | "MINOR"      // Alias for low severity
  | "LOW"        // Duplicate evidence, minor ambiguity, weak phrasing
  | "ADVISORY"   // Informational observation
  | "INFO";      // Informational observation / advisory notice

export const META_SEVERITY_RANKS: Record<MetaCritiqueSeverity, number> = {
  CRITICAL: 5,
  MAJOR: 4,
  HIGH: 4,
  MEDIUM: 3,
  MINOR: 2,
  LOW: 2,
  ADVISORY: 1,
  INFO: 1,
};

/**
 * Deterministic correction actions emitted by the self-critique layer.
 * Note: Corrections are advisory directives for downstream layers, never in-place mutations.
 */
export type MetaCorrectionType =
  | "RETAIN"
  | "DOWNGRADE"
  | "DOWNGRADE_EPISTEMIC_STATUS"
  | "REDUCE_CONFIDENCE"
  | "QUALIFY"
  | "ADD_EPISTEMIC_HEDGING"
  | "REJECT"
  | "REQUEST_MORE_EVIDENCE"
  | "ISOLATE_SCOPE"
  | "PRESERVE_CONTRADICTION"
  | "MARK_SIMULATION"
  | "TAG_AS_SIMULATION"
  | "MARK_UNCERTAIN"
  | "BLOCK_DIRECTIVE";

/**
 * Bounded Orthogonal Uncertainty Dimensions.
 * Values bounded in [0.0, 1.0].
 */
export interface MetaReasoningUncertainty {
  evidenceInsufficiency?: number;
  sourceConflict?: number;
  reasoningDepth?: number;
  epistemicGap?: number;
  intentAmbiguity?: number;
  causalAmbiguity?: number;
  temporalDecay?: number;
  domainVolatility?: number;
  multiHopDecay?: number;
  simulationSpeculation?: number;
  compoundUncertainty?: number;
  // Extended dimensions
  assumptionDependence?: number;
  assumptionFragility?: number;
  temporalStaleness?: number;
  topicAmbiguity?: number;
  predictiveDependence?: number;
  provenanceWeakness?: number;
  simulationDependence?: number;
  simulationDivergence?: number;
  overallUncertainty?: number;
}

/**
 * Audited claim representation in meta-reasoning.
 */
export interface AuditedClaim {
  id: string;
  statement: string;
  text: string;
  claim?: string;
  sourceLayer: string;
  sourceAuthority: EpistemicAuthority;
  epistemicState: EpistemicState;
  confidence: number;
  scope: EpistemicScope;
  topic: string;
  provenance: EpistemicProvenance[];
  evidenceCount: number;
  hasUnresolvedContradiction: boolean;
  isSimulated: boolean;
  isPredictive: boolean;
}

/**
 * Concrete detected meta-reasoning issue.
 */
export interface MetaReasoningIssue {
  id: string;
  type: MetaReasoningIssueType;
  issueType?: MetaReasoningIssueType;
  severity: MetaCritiqueSeverity;
  affectedLayer?: string;
  targetStatement?: string;
  explanation?: string;
  evidenceRefs?: string[];
  suggestedCorrection?: MetaCorrectionType;
  provenance?: EpistemicProvenance[];
  description?: string;
  remediationRecommendation?: string;
  suggestedRemediation?: string;
  scorePenalty?: number;
}

/**
 * Self-Critique entry reviewing a reasoning step or claim.
 */
export interface MetaReasoningCritique {
  id: string;
  targetId: string;
  targetStatement: string;
  issueType: MetaReasoningIssueType;
  severity: MetaCritiqueSeverity;
  explanation: string;
  evidenceRefs: string[];
  affectedLayer: string;
  correction: MetaCorrectionType;
  uncertainty: MetaReasoningUncertainty;
  epistemicStatus: EpistemicState;
  provenance: EpistemicProvenance[];
}

/**
 * Downstream correction guidance produced by meta-reasoning.
 */
export interface MetaReasoningCorrection {
  id: string;
  targetId: string;
  target: string;
  correctionType: MetaCorrectionType;
  reason: string;
  description: string;
  originalStatement: string;
  qualifiedStatement?: string;
  enforceBlock: boolean;
  sanitizedGuidance: string;
}

/**
 * Downstream behavioral recommendation.
 */
export interface MetaReasoningRecommendation {
  id: string;
  category: "EPISTEMIC_CAUTION" | "CAUSAL_QUALIFICATION" | "SIMULATION_DISCLAIMER" | "CONTRADICTION_CLARIFICATION" | "CONSTRAINT_ENFORCEMENT" | "SCOPE_ISOLATION";
  text: string;
  priority: number;
}

/**
 * Deterministic Diagnostics tracking audit metrics.
 */
export interface MetaReasoningDiagnostics {
  executionTimeMs?: number;
  durationMs?: number;
  claimsAudited?: number;
  rulesEvaluated?: number;
  issuesDetected?: number;
  criticalIssues?: number;
  highIssues?: number;
  mediumIssues?: number;
  lowIssues?: number;
  unsupportedClaims?: number;
  confidenceOverreachCount?: number;
  epistemicOverclaimCount?: number;
  contradictionIssues?: number;
  causalOverreachCount?: number;
  multiHopOverreachCount?: number;
  assumptionIssues?: number;
  simulationRealityConfusions?: number;
  predictionAsFactCount?: number;
  topicIsolationRejections?: number;
  scopeIsolationRejections?: number;
  constraintViolations?: number;
  provenanceBreaks?: number;
  reasoningCycles?: number;
  duplicateEvidenceCount?: number;
  sanitizationCount?: number;
  budgetTruncations?: number;
  directivesGenerated?: number;
  totalChecksRun?: number;
  passedChecks?: number;
  failedChecks?: number;
  evaluationTimeMs?: number;
}

/**
 * Configurable Budget Limits for Meta-Reasoning Engine.
 */
export interface MetaReasoningBudgetConfig {
  maxClaims: number;
  maxIssues: number;
  maxCritiques: number;
  maxCorrections: number;
  maxRecommendations?: number;
  maxEvidenceRefs: number;
  maxGraphDepth: number;
  maxDirectives: number;
  maxTotalItems: number;
  maxExecutionTimeMs?: number;
}

export const DEFAULT_META_REASONING_BUDGET: MetaReasoningBudgetConfig = {
  maxClaims: 50,
  maxIssues: 50,
  maxCritiques: 50,
  maxCorrections: 50,
  maxRecommendations: 20,
  maxEvidenceRefs: 100,
  maxGraphDepth: 5,
  maxDirectives: 20,
  maxTotalItems: 250,
  maxExecutionTimeMs: 100,
};

export const HARD_CEILING_META_REASONING_BUDGET: MetaReasoningBudgetConfig = {
  maxClaims: 100,
  maxIssues: 100,
  maxCritiques: 100,
  maxCorrections: 100,
  maxRecommendations: 40,
  maxEvidenceRefs: 200,
  maxGraphDepth: 8,
  maxDirectives: 40,
  maxTotalItems: 500,
  maxExecutionTimeMs: 250,
};

/**
 * Options passed to evaluate meta-reasoning.
 */
export interface MetaReasoningOptions {
  userId?: string;
  currentTime?: number;
  strictTopicIsolation?: boolean;
  activeTopic?: string;
  budget?: Partial<MetaReasoningBudgetConfig>;
}

/**
 * Full input contract for Meta-Reasoning Engine.
 */
export interface MetaReasoningInput {
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
  memoryGovernance?: MemoryGovernanceAnalysis;
  temporalMemory?: TemporalMemoryAnalysis;
  userModel?: UserModelAnalysis;
  goalProject?: GoalProjectAnalysis;
  contextContinuity?: ContextContinuityAnalysis;
  predictiveContext?: PredictiveContextAnalysis;
  history?: ConversationTurn[];
  options?: MetaReasoningOptions;
}

export type CritiqueIssue = MetaReasoningIssue;
export type CritiqueVerdict = "VALID" | "NEEDS_REVISION" | "REJECTED";
export type CritiqueSeverity = MetaCritiqueSeverity;

/**
 * Complete Meta-Reasoning Engine Analysis Output.
 */
export interface MetaReasoningAnalysis {
  isCoherent?: boolean;
  verdict?: CritiqueVerdict;
  overallVerdict?: any;
  unifiedConfidence?: number;
  critiqueConfidenceScore?: number;
  warnings?: string[];
  cognitiveHealth?: any;
  auditedClaims?: AuditedClaim[];
  issues?: MetaReasoningIssue[];
  critiques?: MetaReasoningCritique[];
  corrections?: MetaReasoningCorrection[];
  uncertainty?: MetaReasoningUncertainty;
  uncertaintyVector?: MetaReasoningUncertainty;
  recommendations?: MetaReasoningRecommendation[];
  directives?: string[];
  diagnostics?: MetaReasoningDiagnostics;
  hardConstraintViolations?: number | string[];
  simulationRealityConfusions?: number | string[];
  overallQualityScore?: number;
  sectionResults?: any[];
  sanitizedDirectives?: string[];
  revisionRequirements?: any[];
  epistemicAdjustments?: any[];
  unsupportedClaims?: any[];
}
