/**
 * Dora Cross-Session Context Continuity & Intelligent Recall Types (Phase 2 — Step 11)
 * 
 * Provides strongly typed contracts for deterministic, bounded, non-LLM
 * cross-session context continuity, intelligent recall orchestration,
 * authority-weighted filtering, deduplication, and directive sanitization.
 */

import { ConversationContext, ConversationTurn } from "./contextTypes";
import { StructuredIntent } from "./intentTypes";
import { ReasoningAnalysis } from "./reasoningTypes";
import { PlanningAnalysis } from "./planningTypes";
import { VerificationAnalysis } from "./verificationTypes";
import { MemoryGovernanceAnalysis } from "./memoryGovernanceTypes";
import { MemoryRetrievalAnalysis } from "./memoryRetrievalTypes";
import { UserModelAnalysis, UserModelEvidenceAuthority } from "./longTermUserModelTypes";
import { TemporalMemoryAnalysis } from "./temporalMemoryTypes";
import { GoalProjectAnalysis, Project, Goal, Commitment, ProjectTask } from "./goalProjectTypes";
import { LearningAnalysis } from "./adaptiveLearningTypes";
import { PredictiveContextAnalysis } from "./predictiveContextTypes";

/**
 * Continuity status indicating how historical context connects to current turn.
 */
export type ContextContinuityStatus =
  | "ACTIVE"           // Continuously active on current topic/project
  | "RESUMED"          // Explicitly or safely resumed prior topic/project
  | "SWITCHED"         // Topic/project switch occurred; prior context suppressed
  | "ISOLATED"         // Strict topic/privacy boundary applied
  | "AMBIGUOUS"        // Multiple competing candidates; requires clarification
  | "STALE"            // Context is too old / inactive to carry forward
  | "EXPLICIT_RECALL"  // Historical context recalled due to explicit user question
  | "NONE";            // No historical continuity needed for turn

/**
 * Scope of continuity items.
 */
export type ContinuityScope =
  | "TURN"
  | "SESSION"
  | "PROJECT"
  | "TOPIC"
  | "GLOBAL";

/**
 * Strict Authority Hierarchy (Higher index/weight = higher precedence)
 */
export type ContinuitySourceAuthority =
  | "CURRENT_TURN_EXPLICIT"            // 1.00 - Explicit current instruction
  | "HARD_CONSTRAINT"                  // 0.95 - Hard safety/governance constraint
  | "VERIFIED_EVIDENCE"                // 0.90 - Verified tool output / validated fact
  | "GOVERNANCE_APPROVED_MEMORY"       // 0.85 - Memory passed governance
  | "CONFIRMED_USER_MODEL"             // 0.80 - Confirmed Step 8 user model
  | "ACTIVE_GOAL_PROJECT_COMMITMENT"   // 0.75 - Active Step 10 project/goal
  | "TEMPORAL_CONTEXT"                 // 0.70 - Stable Step 9 temporal pattern
  | "CONFIRMED_ADAPTIVE_PATTERN"       // 0.60 - Confirmed Step 5 adaptive habit
  | "PREDICTIVE_CONTEXT"               // 0.30 - Step 6/11 predictive suggestion (Advisory only)
  | "SYSTEM_DEFAULT";                  // 0.10 - Fallback system default

/**
 * Classification of items eligible for continuity orchestration.
 */
export type ContinuityItemType =
  | "MEMORY"
  | "USER_MODEL_ATTRIBUTE"
  | "PROJECT"
  | "GOAL"
  | "COMMITMENT"
  | "TASK"
  | "TEMPORAL_PATTERN"
  | "CONVERSATION_TURN"
  | "ADAPTIVE_PATTERN"
  | "PREDICTIVE_SUGGESTION";

/**
 * A single context item processed by the continuity engine.
 */
export interface ContextContinuityItem {
  id: string;
  type: ContinuityItemType;
  sourceId: string;
  title: string;
  content: string;
  normalizedKey: string;
  authority: ContinuitySourceAuthority;
  authorityWeight: number;    // Bounded [0.0, 1.0]
  relevanceScore: number;     // Bounded [0.0, 1.0]
  recencyScore: number;       // Bounded [0.0, 1.0]
  compositeScore: number;     // Bounded [0.0, 1.0]
  scope: ContinuityScope;
  topic?: string;
  projectId?: string;
  timestamp: number;
  isExplicitlyRecalled: boolean;
  isCurrentTurnConflict: boolean;
  isTopicIsolated: boolean;
  isSensitive: boolean;
  isSuppressed: boolean;
  suppressionReason?: string;
}

/**
 * Structured summary of active project continuity.
 */
export interface ProjectContinuitySummary {
  projectId: string;
  name: string;
  status: string;
  activeGoals: string[];
  activeMilestones: string[];
  readyTasks: string[];
  blockedTasks: string[];
  activeCommitments: string[];
  currentBlockers: string[];
  lastActiveAt: number;
}

/**
 * Explicit recall detection.
 */
export interface ExplicitRecallSignal {
  isExplicitRecall: boolean;
  recallType:
    | "PREVIOUS_DISCUSSION"
    | "PLAN_RECALL"
    | "DECISION_RECALL"
    | "PROJECT_STATUS"
    | "GENERAL_HISTORY"
    | "NONE";
  targetSubject?: string;
  targetTimeframe?: string;
}

/**
 * Context budget configuration limits.
 */
export interface ContextBudgetConfig {
  maxMemories: number;              // default: 5
  maxProjects: number;              // default: 2
  maxGoals: number;                 // default: 3
  maxCommitments: number;           // default: 3
  maxDirectives: number;            // default: 8
  maxTotalContextItems: number;     // default: 15
}

/**
 * Diagnostic metrics for Context Continuity Engine.
 */
export interface ContextContinuityDiagnostics {
  totalCandidatesEvaluated: number;
  eligibleItemsCount: number;
  selectedItemsCount: number;
  suppressedConflictCount: number;
  suppressedTopicCount: number;
  suppressedSensitiveCount: number;
  suppressedStaleCount: number;
  suppressedDuplicateCount: number;
  suppressedPredictiveCount: number;
  ambiguousReferencesCount: number;
  isExplicitRecall: boolean;
  continuityStatus: ContextContinuityStatus;
  budgetUtilization: number;        // Bounded [0.0, 1.0]
  evaluationTimeMs: number;
}

/**
 * Complete analysis returned by ContextContinuityEngine.
 */
export interface ContextContinuityAnalysis {
  continuityStatus: ContextContinuityStatus;
  activeProject?: ProjectContinuitySummary;
  activeGoals: string[];
  activeCommitments: string[];
  selectedItems: ContextContinuityItem[];
  suppressedItems: ContextContinuityItem[];
  directives: string[];
  sanitizedDirectives: string[];
  resolvedContinuityTarget?: string;
  requiresClarification: boolean;
  clarificationPrompt?: string;
  diagnostics: ContextContinuityDiagnostics;
}

/**
 * Evaluation options for Context Continuity Engine.
 */
export interface ContextContinuityOptions {
  userId?: string;
  currentTime?: number;
  sessionId?: string;
  previousSessionId?: string;
  isNewSession?: boolean;
  isTopicIsolated?: boolean;
  activeTopic?: string;
  budgetConfig?: Partial<ContextBudgetConfig>;
  allowStaleRecall?: boolean;
}

/**
 * Input arguments for ContextContinuityEngine.evaluate().
 */
export interface ContextContinuityEvaluationInput {
  userId?: string;
  message: string;
  context?: ConversationContext;
  history?: ConversationTurn[];
  intent?: StructuredIntent;
  reasoning?: ReasoningAnalysis;
  planning?: PlanningAnalysis;
  verification?: VerificationAnalysis;
  governanceAnalysis?: MemoryGovernanceAnalysis;
  retrievedMemories?: MemoryRetrievalAnalysis;
  longTermUserModel?: UserModelAnalysis;
  temporalMemory?: TemporalMemoryAnalysis;
  goalProjectAnalysis?: GoalProjectAnalysis;
  adaptiveLearning?: LearningAnalysis;
  predictiveContext?: PredictiveContextAnalysis;
  recallSignal?: ExplicitRecallSignal;
  options?: ContextContinuityOptions;
}
