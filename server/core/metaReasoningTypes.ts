/**
 * Dora Meta-Reasoning & Self-Critique Engine Types
 * Phase 3 — Step 7
 * 
 * Defines deterministic, bounded, non-LLM contracts for comprehensive reasoning self-critique,
 * grounding verification, epistemic calibration auditing, causal and multi-hop chain integrity,
 * simulation reality boundary defense, constraint and goal alignment auditing,
 * and sanitized meta-directives.
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
import {
  ScenarioSimulationAnalysis,
  ScenarioType,
  ScenarioEpistemicStatus,
} from "./scenarioSimulationTypes";

/**
 * Taxonomy of critique and meta-reasoning issues.
 */
export type MetaReasoningIssueType =
  | "UNSUPPORTED_CLAIM"
  | "AUTHORITY_MISMATCH"
  | "CONFIDENCE_OVERCLAIM"
  | "CONFIDENCE_UNDERCLAIM"
  | "UNRESOLVED_CONTRADICTION"
  | "CIRCULAR_REASONING"
  | "CAUSAL_GAP"
  | "COUNTERFACTUAL_INVALIDITY"
  | "BROKEN_MULTI_HOP_CHAIN"
  | "WEAK_EVIDENCE_LINK"
  | "SIMULATION_REALITY_CONFUSION"
  | "UNCHECKED_ASSUMPTION"
  | "SENSITIVE_ASSUMPTION_DEPENDENCY"
  | "TEMPORAL_INCONSISTENCY"
  | "TOPIC_BOUNDARY_LEAK"
  | "HARD_CONSTRAINT_VIOLATION"
  | "GOAL_CONFLICT"
  | "PROVENANCE_MISSING"
  | "LOGICAL_FALLACY";

/**
 * Severity levels for critique findings.
 */
export type CritiqueSeverity =
  | "CRITICAL"
  | "MAJOR"
  | "MODERATE"
  | "MINOR"
  | "INFO";

/**
 * Categories of meta-reasoning audits.
 */
export type CritiqueCategory =
  | "GROUNDING"
  | "COHERENCE"
  | "EPISTEMIC_CALIBRATION"
  | "CAUSAL_JUSTIFICATION"
  | "MULTI_HOP_INTEGRITY"
  | "SIMULATION_SANITY"
  | "ASSUMPTION_AUDIT"
  | "TEMPORAL_AND_SCOPE"
  | "CONSTRAINT_AND_GOAL"
  | "PROVENANCE"
  | "LOGIC";

/**
 * Overall critique verdict.
 */
export type CritiqueVerdict =
  | "PASS"
  | "PASS_WITH_WARNINGS"
  | "NEEDS_REVISION"
  | "REJECTED";

/**
 * Individual critique issue identified during audit.
 */
export interface CritiqueIssue {
  id: string;
  type: MetaReasoningIssueType;
  category: CritiqueCategory;
  severity: CritiqueSeverity;
  targetComponent: string;
  targetIdentifier?: string;
  description: string;
  remediationRecommendation: string;
  scorePenalty: number;
  evidenceKeys?: string[];
}

/**
 * Section result for each audited domain.
 */
export interface AuditSectionResult {
  section: CritiqueCategory;
  passed: boolean;
  issuesCount: number;
  auditedCount: number;
  score: number; // 0.0 to 1.0
  notes?: string;
}

/**
 * Epistemic adjustment recommendation.
 */
export interface EpistemicAdjustment {
  claimKey: string;
  originalConfidence: number;
  recommendedConfidence: number;
  reason: string;
}

/**
 * Bounded Budget Configuration for Meta-Reasoning Engine.
 */
export interface MetaReasoningBudgetConfig {
  maxAuditedClaims: number;
  maxAuditedChains: number;
  maxAuditedAssumptions: number;
  maxAuditedScenarios: number;
  maxCritiqueIssues: number;
  maxMetaDirectives: number;
  maxTotalItems: number;
}

/**
 * Default budget limits for standard operation.
 */
export const DEFAULT_META_REASONING_BUDGET: MetaReasoningBudgetConfig = {
  maxAuditedClaims: 20,
  maxAuditedChains: 10,
  maxAuditedAssumptions: 15,
  maxAuditedScenarios: 10,
  maxCritiqueIssues: 25,
  maxMetaDirectives: 10,
  maxTotalItems: 200,
};

/**
 * Hard upper ceiling budget limits.
 */
export const HARD_CEILING_META_REASONING_BUDGET: MetaReasoningBudgetConfig = {
  maxAuditedClaims: 50,
  maxAuditedChains: 25,
  maxAuditedAssumptions: 30,
  maxAuditedScenarios: 20,
  maxCritiqueIssues: 50,
  maxMetaDirectives: 20,
  maxTotalItems: 400,
};

/**
 * Diagnostic telemetry from Meta-Reasoning Engine.
 */
export interface MetaReasoningDiagnostics {
  claimsAudited: number;
  chainsAudited: number;
  assumptionsAudited: number;
  scenariosAudited: number;
  contradictionsAudited: number;
  causalRelationsAudited: number;
  issuesDetected: number;
  criticalIssuesCount: number;
  majorIssuesCount: number;
  moderateIssuesCount: number;
  minorIssuesCount: number;
  infoIssuesCount: number;
  groundingScore: number;
  coherenceScore: number;
  calibrationScore: number;
  overallQualityScore: number;
  budgetTruncations: number;
  topicIsolationChecks: number;
  directivesGenerated: number;
  evaluationTimeMs?: number;
}

/**
 * Comprehensive analysis output from Meta-Reasoning Engine.
 */
export interface MetaReasoningAnalysis {
  verdict: CritiqueVerdict;
  overallQualityScore: number; // 0.0 to 1.0
  issues: CritiqueIssue[];
  sectionResults: AuditSectionResult[];
  sanitizedDirectives: string[];
  directives: string[];
  revisionRequirements: string[];
  epistemicAdjustments: EpistemicAdjustment[];
  unsupportedClaims: string[];
  simulationRealityConfusions: string[];
  hardConstraintViolations: string[];
  diagnostics: MetaReasoningDiagnostics;
}

/**
 * Configuration options for Meta-Reasoning execution.
 */
export interface MetaReasoningOptions {
  userId?: string;
  currentTime?: number;
  activeTopic?: string;
  strictTopicIsolation?: boolean;
  budget?: Partial<MetaReasoningBudgetConfig>;
  enforceHardConstraints?: boolean;
}

/**
 * Complete input package for Meta-Reasoning Engine.
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
