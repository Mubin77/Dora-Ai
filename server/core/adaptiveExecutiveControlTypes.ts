/**
 * Dora Adaptive Executive Control & Cognitive Prioritization Engine Types
 * Phase 3 — Step 9
 * 
 * Defines deterministic, non-LLM, bounded contracts for cognitive attention allocation,
 * executive prioritization, cognitive suppression, escalation, unresolved issue tracking,
 * executive focus, response-mode selection, and sanitized behavioral directives.
 */

import { ConversationContext, ConversationTurn, ConversationConstraint } from "./contextTypes";
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
import {
  DecisionAnalysis,
  DecisionState,
  DecisionRecommendationType,
  DecisionCandidate,
  DecisionPlan,
} from "./deliberativeDecisionTypes";

/**
 * Priority Classes for Cognitive Attention
 */
export type ExecutivePriorityClass =
  | "PRIORITY_CRITICAL"
  | "PRIORITY_HIGH"
  | "PRIORITY_NORMAL"
  | "PRIORITY_LOW"
  | "SUPPRESSED";

/**
 * Deterministic Escalation States
 */
export type ExecutiveEscalationState =
  | "NONE"
  | "CLARIFICATION_REQUIRED"
  | "WARNING_REQUIRED"
  | "DECISION_DEFERRED"
  | "SAFETY_BLOCKED"
  | "NO_SAFE_PATH";

/**
 * Deterministic Response Modes
 */
export type ExecutiveResponseMode =
  | "ANSWER"
  | "CLARIFY"
  | "CONDITIONAL_ANSWER"
  | "WARN"
  | "DEFER"
  | "REFUSE_ACTION"
  | "PLAN"
  | "ACKNOWLEDGE";

/**
 * Types of Attention Items
 */
export type ExecutiveAttentionType =
  | "USER_REQUEST"
  | "HARD_CONSTRAINT"
  | "DECISION_BLOCKER"
  | "UNRESOLVED_CONTRADICTION"
  | "EPISTEMIC_UNCERTAINTY"
  | "CAUSAL_RISK"
  | "SCENARIO_WARNING"
  | "META_REASONING_WARNING"
  | "REQUIRED_CLARIFICATION"
  | "ACTION_PREREQUISITE"
  | "ACTIVE_GOAL"
  | "ACTIVE_COMMITMENT"
  | "TEMPORAL_STATE"
  | "ADVISORY_PLAN"
  | "GENERAL_COGNITIVE";

/**
 * Reason Codes for Executive Attention
 */
export type ExecutiveAttentionReason =
  | "EXPLICIT_USER_DIRECTIVE"
  | "HARD_SAFETY_CONSTRAINT"
  | "UNRESOLVED_CRITICAL_CONTRADICTION"
  | "EPISTEMIC_OVERCLAIM_DETECTED"
  | "CAUSAL_UNCERTAINTY_HIGH"
  | "SCENARIO_RISK_WARNING"
  | "DECISION_PREREQUISITE_PENDING"
  | "DECISION_BLOCKED"
  | "INFORMATION_DEFICIT"
  | "GOAL_ALIGNMENT_REQUIRED"
  | "COMMITMENT_CONTINUITY"
  | "TEMPORAL_FRESHNESS"
  | "META_REASONING_FLAG";

/**
 * Reasons for Cognitive Suppression
 */
export type ExecutiveSuppressionReason =
  | "IRRELEVANT_TO_CURRENT_TURN"
  | "FOREIGN_TOPIC"
  | "STALE_SUPERSEDED"
  | "REJECTED_EVIDENCE"
  | "QUARANTINED_EVIDENCE"
  | "DUPLICATE_ITEM"
  | "UNSUPPORTED_SPECULATION"
  | "SIMULATION_REALITY_BREACH"
  | "PREDICTIVE_IRRELEVANT"
  | "INTERNAL_DIAGNOSTIC"
  | "SENSITIVE_CREDENTIAL"
  | "BUDGET_TRUNCATION";

/**
 * Types of Unresolved Issues Tracked by Executive Control
 */
export type ExecutiveUnresolvedIssueType =
  | "MISSING_INFORMATION"
  | "CONTRADICTION"
  | "EPISTEMIC_UNCERTAINTY"
  | "CAUSAL_UNCERTAINTY"
  | "TEMPORAL_STALENESS"
  | "GOAL_CONFLICT"
  | "COMMITMENT_BLOCK"
  | "CONSTRAINT_CONFLICT"
  | "TRADEOFF_UNRESOLVED"
  | "SIMULATION_RISK"
  | "PREREQUISITE_MISSING";

/**
 * Unresolved Issue Representation
 */
export interface ExecutiveUnresolvedIssue {
  id: string;
  issueType: ExecutiveUnresolvedIssueType;
  scope: EpistemicScope;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  sourceProvenance: string[];
  isBlocking: boolean;
  resolutionRequirement: string;
  deterministicPriority: number;
  description: string;
}

/**
 * Attention Item
 */
export interface ExecutiveAttentionItem {
  id: string;
  type: ExecutiveAttentionType;
  priorityClass: ExecutivePriorityClass;
  priorityScore: number; // 0.00 to 1.00
  scope: EpistemicScope;
  authority: EpistemicAuthority;
  authorityWeight: number; // 0.00 to 1.00
  reason: ExecutiveAttentionReason;
  sourceEngine: string;
  sourceProvenance: string[];
  recommendedHandling: string;
  topic?: string;
  rawContent: string;
  isBlocking: boolean;
  isSuppressed: boolean;
  suppressionReason?: ExecutiveSuppressionReason;
  sortKey: string;
}

/**
 * Suppression Record
 */
export interface ExecutiveSuppressionRecord {
  itemId: string;
  sourceEngine: string;
  reason: ExecutiveSuppressionReason;
  description: string;
}

/**
 * Escalation Record
 */
export interface ExecutiveEscalationRecord {
  id: string;
  state: ExecutiveEscalationState;
  trigger: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  requiredAction: string;
  isBlocking: boolean;
}

/**
 * Executive Focus Output
 */
export interface ExecutiveFocus {
  primaryFocus: string;
  secondaryFocuses: string[];
  activeDecision?: {
    state: DecisionState;
    recommendationType: DecisionRecommendationType;
    selectedOptionTitle?: string;
    isBlocked: boolean;
    requiresPrerequisites: boolean;
  };
  activeGoal?: {
    id: string;
    title: string;
    status: string;
    isAligned: boolean;
  };
  activeCommitment?: {
    id: string;
    description: string;
    status: string;
  };
  criticalRisks: string[];
  unresolvedIssues: ExecutiveUnresolvedIssue[];
  requiredClarifications: string[];
  recommendedResponseMode: ExecutiveResponseMode;
}

/**
 * Executive Control Directives
 */
export interface ExecutiveControlDirective {
  id: string;
  text: string;
  priorityClass: ExecutivePriorityClass;
  category: "SAFETY" | "FOCUS" | "CLARIFICATION" | "EPISTEMIC" | "ACTION" | "DEFERRAL";
}

/**
 * Diagnostic Metrics
 */
export interface ExecutiveControlDiagnostics {
  totalAttentionCandidates: number;
  activeAttentionCount: number;
  criticalCount: number;
  highPriorityCount: number;
  normalPriorityCount: number;
  lowPriorityCount: number;
  suppressedCount: number;
  unresolvedIssueCount: number;
  escalationCount: number;
  budgetTruncationCount: number;
  sanitizationReplacements: number;
  dominantPriorityClass: ExecutivePriorityClass;
  escalationState: ExecutiveEscalationState;
  responseMode: ExecutiveResponseMode;
}

/**
 * Configurable Budget Limits
 */
export interface ExecutiveControlBudgetConfig {
  maxAttentionItems?: number;
  maxCriticalItems?: number;
  maxHighPriorityItems?: number;
  maxUnresolvedIssues?: number;
  maxEscalations?: number;
  maxDirectives?: number;
  maxFocusDimensions?: number;
}

/**
 * Complete Executive Control Analysis Output
 */
export interface ExecutiveControlAnalysis {
  escalationState: ExecutiveEscalationState;
  responseMode: ExecutiveResponseMode;
  focus: ExecutiveFocus;
  attentionSet: ExecutiveAttentionItem[];
  attentionItems?: ExecutiveAttentionItem[];
  suppressedItems: ExecutiveSuppressionRecord[];
  unresolvedIssues: ExecutiveUnresolvedIssue[];
  escalations: ExecutiveEscalationRecord[];
  directives: string[];
  sanitizedDirectives: string[];
  diagnostics: ExecutiveControlDiagnostics;
  provenance: EpistemicProvenance[];
}

/**
 * Execution Options for Executive Control Engine
 */
export interface ExecutiveControlEngineOptions {
  userId?: string;
  currentTime?: number;
  budget?: ExecutiveControlBudgetConfig;
  strictTopicIsolation?: boolean;
  activeTopic?: string;
}

/**
 * Complete Input Package for Adaptive Executive Control Engine
 */
export interface ExecutiveControlInput {
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
  decision?: DecisionAnalysis;
  memoryGovernance?: MemoryGovernanceAnalysis;
  temporalMemory?: TemporalMemoryAnalysis;
  userModel?: UserModelAnalysis;
  goalProject?: GoalProjectAnalysis;
  contextContinuity?: ContextContinuityAnalysis;
  predictiveContext?: PredictiveContextAnalysis;
  history?: ConversationTurn[];
  options?: ExecutiveControlEngineOptions;
}
