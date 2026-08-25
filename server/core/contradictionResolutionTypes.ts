/**
 * Dora Contradiction Resolution & Belief Revision Engine Types
 * Phase 3 — Step 2
 * 
 * Defines strict, deterministic, non-LLM contracts for conflict classification,
 * authority-based contradiction resolution, scope awareness, and safe belief revision.
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

/**
 * Deterministic Contradiction Classification Categories.
 */
export type ContradictionClassification =
  | "AUTHORITY_CONFLICT"      // Conflict between different authority tiers
  | "TEMPORAL_CONFLICT"       // Conflict arising from chronological state evolution
  | "SCOPE_CONFLICT"          // Conflict valid across separate domains/projects
  | "ENTITY_CONFLICT"         // Entity boundary or ownership mismatch
  | "PREFERENCE_CONFLICT"     // Conflicting user preferences on same subject
  | "FACTUAL_CONFLICT"        // Mutually exclusive factual claims
  | "GOAL_CONFLICT"           // Conflicting goals or milestones
  | "PROJECT_CONFLICT"        // Conflicting project states or tech stacks
  | "COMMITMENT_CONFLICT"     // Conflicting obligations or deadlines
  | "IDENTITY_CONFLICT"       // Identity attribute conflict or speculative inference
  | "AMBIGUOUS_CONFLICT"      // Conflict with ambiguous intent/subject
  | "UNRESOLVED_CONFLICT";    // Equal authority with no clear differentiator

/**
 * Resolution Outcome for an analyzed contradiction.
 */
export type ResolutionOutcome =
  | "RESOLVED"            // Fully resolved by authority, temporal lineage, or explicit scope
  | "PARTIALLY_RESOLVED"  // Resolved for specific scope while retaining sub-conflict
  | "UNRESOLVED"          // Genuine stalemate between equal-authority evidence
  | "DEFERRED"            // Deferred pending user clarification or additional evidence
  | "REJECTED";           // Rejected due to invalid/quarantined/unauthorized evidence

/**
 * Belief Revision Decision Type.
 */
export type BeliefRevisionDecisionType =
  | "NO_REVISION"             // Existing belief is maintained without modification
  | "TEMPORARY_OVERRIDE"      // Ephemeral turn-scoped override; historical belief preserved
  | "REVISE_ACTIVE_BELIEF"    // Active belief revised with preserved historical lineage
  | "PRESERVE_BOTH_SCOPED"    // Both beliefs co-exist across separated scopes/domains
  | "DEFER_REVISION";         // Revision deferred due to uncertainty or equal conflict

/**
 * Deterministic Contradiction Severity Categories.
 */
export type ContradictionSeverity =
  | "NONE"
  | "LOW"
  | "MODERATE"
  | "HIGH"
  | "CRITICAL";

/**
 * Structured Contradiction Record extracted and analyzed by the engine.
 */
export interface ContradictionRecord {
  id: string;
  sourceContradictionId?: string;
  subject: string;
  classification: ContradictionClassification;
  severity: ContradictionSeverity;
  evidenceA: ReasoningEvidence;
  evidenceB: ReasoningEvidence;
  authorityA: ReasoningEvidenceAuthority;
  authorityB: ReasoningEvidenceAuthority;
  authorityComparison: {
    higherAuthoritySide: "A" | "B" | "EQUAL";
    higherAuthority?: ReasoningEvidenceAuthority;
    lowerAuthority?: ReasoningEvidenceAuthority;
    difference: number;
  };
  scopeA?: ReasoningEvidenceScope | string;
  scopeB?: ReasoningEvidenceScope | string;
  temporalRelation?: "A_NEWER" | "B_NEWER" | "SAME_TIME" | "UNKNOWN";
  description: string;
  isCurrentTurnOverride: boolean;
  isScopeCompatible: boolean;
}

/**
 * Candidate resolution evaluated for a contradiction.
 */
export interface ResolutionCandidate {
  candidateId: string;
  contradictionId: string;
  proposedResolution: ResolutionOutcome;
  winningEvidenceId?: string;
  winningAuthority?: ReasoningEvidenceAuthority;
  losingEvidenceId?: string;
  confidence: number;
  rationale: string;
  scope: string;
  appliesToCurrentTurnOnly: boolean;
}

/**
 * Belief Revision Decision.
 */
export interface BeliefRevisionDecision {
  id: string;
  targetSubject: string;
  decisionType: BeliefRevisionDecisionType;
  previousBelief?: string;
  revisedBelief?: string;
  winningEvidenceId?: string;
  losingEvidenceId?: string;
  scope: string;
  effectivePeriod?: string;
  reason: string;
  confidence: number;
  sanitizedDirective?: string;
  requiresClarification: boolean;
  clarificationPrompt?: string;
  isPreservedHistorically: boolean;
}

/**
 * Configurable Budget Limits for Contradiction Resolution.
 */
export interface ContradictionResolutionBudgetConfig {
  maxContradictions: number;     // default: 25
  maxCandidates: number;         // default: 25
  maxRevisions: number;          // default: 15
  maxDirectives: number;          // default: 10
}

/**
 * Default Budget Limits.
 */
export const DEFAULT_CONTRADICTION_RESOLUTION_BUDGET: ContradictionResolutionBudgetConfig = {
  maxContradictions: 25,
  maxCandidates: 25,
  maxRevisions: 15,
  maxDirectives: 10,
};

/**
 * Diagnostic Metrics for ContradictionResolutionEngine.
 */
export interface ContradictionResolutionDiagnostics {
  totalConflictsExamined: number;
  classifiedConflicts: Record<ContradictionClassification, number>;
  resolutionsByOutcome: Record<ResolutionOutcome, number>;
  revisionsByType: Record<BeliefRevisionDecisionType, number>;
  predictiveSuppressedCount: number;
  candidateRejectedCount: number;
  staleExpiredRejectedCount: number;
  identityInferenceRejectedCount: number;
  scopePreservedCount: number;
  currentTurnOverrideCount: number;
  unresolvedEqualAuthorityCount: number;
  stepsExecuted: number;
  executionTimeMs: number;
  isDeterministic: boolean;
}

/**
 * Full Analysis Package of ContradictionResolutionEngine.
 */
export interface ContradictionResolutionAnalysis {
  contradictions: ContradictionRecord[];
  candidates: ResolutionCandidate[];
  revisions: BeliefRevisionDecision[];
  activeDirectives: string[];
  unresolvedCount: number;
  resolvedCount: number;
  deferredCount: number;
  requiresClarification: boolean;
  clarificationPrompt?: string;
  diagnostics: ContradictionResolutionDiagnostics;
}

/**
 * Execution Options for Contradiction Resolution Engine.
 */
export interface ContradictionResolutionOptions {
  userId?: string;
  currentTime?: number;
  budgetConfig?: Partial<ContradictionResolutionBudgetConfig>;
  strictTopicIsolation?: boolean;
  activeTopic?: string;
}

import { ReasoningAnalysis } from "./reasoningTypes";
import { PlanningAnalysis } from "./planningTypes";
import { VerificationAnalysis } from "./verificationTypes";

/**
 * Input Contract for Contradiction Resolution Engine.
 */
export interface ContradictionInput {
  userId?: string;
  message: string;
  context?: ConversationContext;
  intent?: StructuredIntent;
  reasoning?: ReasoningAnalysis;
  planning?: PlanningAnalysis;
  verification?: VerificationAnalysis;
  deepReasoning?: DeepReasoningAnalysis;
  executiveContext?: ExecutiveContextPackage;
  memoryGovernance?: MemoryGovernanceAnalysis;
  temporalMemory?: TemporalMemoryAnalysis;
  userModel?: UserModelAnalysis;
  goalProject?: GoalProjectAnalysis;
  contextContinuity?: ContextContinuityAnalysis;
  predictiveContext?: PredictiveContextAnalysis;
  history?: ConversationTurn[];
  options?: ContradictionResolutionOptions;
}
