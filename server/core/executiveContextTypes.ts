/**
 * Dora Executive Context Synthesis & Decision-Ready Context Engine Types
 * Phase 2 — Step 12
 * 
 * Provides strongly-typed, deterministic contracts for the final executive
 * context-composition layer before response reasoning/generation.
 * 
 * Centralized Precedence Hierarchy:
 * 1. CURRENT_TURN_EXPLICIT (1.00)
 * 2. HARD_CONSTRAINT (0.95)
 * 3. VERIFIED_EVIDENCE (0.90)
 * 4. GOVERNANCE_APPROVED_MEMORY (0.80)
 * 5. CONFIRMED_USER_MODEL (0.75)
 * 6. ACTIVE_GOAL_PROJECT_COMMITMENT (0.70)
 * 7. TEMPORAL_CONTEXT (0.60)
 * 8. CONFIRMED_ADAPTIVE_PATTERN (0.50)
 * 9. PREDICTIVE_CONTEXT (0.30)
 * 10. SYSTEM_DEFAULT (0.10)
 */

import { ConversationContext, ConversationTurn } from "./contextTypes";
import { StructuredIntent } from "./intentTypes";
import { ReasoningAnalysis } from "./reasoningTypes";
import { PlanningAnalysis } from "./planningTypes";
import { VerificationAnalysis } from "./verificationTypes";
import { MemoryRetrievalAnalysis } from "./memoryRetrievalTypes";
import { MemoryGovernanceAnalysis } from "./memoryGovernanceTypes";
import { LearningAnalysis } from "./adaptiveLearningTypes";
import { UserModelAnalysis } from "./longTermUserModelTypes";
import { TemporalMemoryAnalysis } from "./temporalMemoryTypes";
import { GoalProjectAnalysis, Project, Goal, Commitment } from "./goalProjectTypes";
import { ContextContinuityAnalysis } from "./contextContinuityTypes";
import { PredictiveContextAnalysis } from "./predictiveContextTypes";
import { ResponseAdaptationAnalysis } from "./responseAdaptationTypes";

/**
 * Strict Authority Hierarchy Levels.
 */
export type ExecutiveAuthority =
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
 * Authority weight mapping strictly enforcing numeric ordering.
 */
export const EXECUTIVE_AUTHORITY_WEIGHTS: Record<ExecutiveAuthority, number> = {
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
 * Factual grounding classification.
 */
export type FactGroundingType =
  | "VERIFIED_FACT"
  | "GOVERNED_MEMORY"
  | "USER_PROVIDED_CURRENT_TURN_CLAIM"
  | "CONFIRMED_USER_MODEL"
  | "TEMPORAL_CONTEXT"
  | "PREDICTIVE_ADVISORY"
  | "UNRESOLVED";

/**
 * Conflict resolution status.
 */
export type ConflictResolutionStatus =
  | "RESOLVED_BY_AUTHORITY"
  | "RESOLVED_BY_CURRENT_TURN"
  | "RESOLVED_BY_RECENCY"
  | "UNRESOLVED";

/**
 * Ambiguity status.
 */
export type ExecutiveAmbiguityStatus = "CLEAR" | "AMBIGUOUS" | "UNRESOLVED_REFERENCE";

/**
 * Current turn state and detected explicit overrides.
 */
export interface ExecutiveCurrentTurn {
  message: string;
  intent: string;
  primaryTopic?: string;
  explicitDirectives: string[];
  overrides: {
    language?: string;
    verbosity?: string;
    tone?: string;
    format?: string;
    brandOrEntityOverrides?: Array<{ original: string; replacement: string }>;
    switchedProject?: string;
    pausedProject?: string;
    excludedToolsOrPatterns?: string[];
  };
  requiresClarification: boolean;
  clarificationReason?: string;
}

/**
 * Strongly grounded authoritative fact.
 */
export interface ExecutiveFact {
  id: string;
  key: string;
  value: string;
  grounding: FactGroundingType;
  authority: ExecutiveAuthority;
  authorityWeight: number;
  source: string;
  confidence: number;
  topic?: string;
  isGlobal: boolean;
  sanitizedDirective: string;
}

/**
 * Active personalization or user preference.
 */
export interface ExecutivePreference {
  id: string;
  key: string;
  value: string;
  dimension: string;
  authority: ExecutiveAuthority;
  authorityWeight: number;
  source: string;
  isCurrentTurnOverride: boolean;
  isGlobal: boolean;
  sanitizedDirective: string;
}

/**
 * Active project context item.
 */
export interface ExecutiveProject {
  id: string;
  name: string;
  status: string;
  description?: string;
  currentMilestone?: string;
  activeTasks: string[];
  readyTasks: string[];
  blockers: string[];
  isPrimaryActive: boolean;
  sanitizedDirective: string;
}

/**
 * Active goal item.
 */
export interface ExecutiveGoal {
  id: string;
  title: string;
  status: string;
  priority: string;
  targetDate?: string;
  scope: string;
  sanitizedDirective: string;
}

/**
 * Active commitment item.
 */
export interface ExecutiveCommitment {
  id: string;
  description: string;
  status: string;
  dueDate?: string;
  sourceIntent: string;
  sanitizedDirective: string;
}

/**
 * Temporal context summary.
 */
export interface ExecutiveTemporalContext {
  activePatterns: Array<{
    key: string;
    value: string;
    status: string;
    authority: ExecutiveAuthority;
    sanitizedDirective: string;
  }>;
  evolvingLineage: Array<{
    key: string;
    fromValue: string;
    toValue: string;
    isCurrentTurnEvolution: boolean;
  }>;
  suppressedStaleCount: number;
}

/**
 * Cross-session continuity summary.
 */
export interface ExecutiveContinuityContext {
  continuityStatus: string;
  activeTopic?: string;
  resumedProject?: string;
  switchedAwayFrom?: string;
  isTopicIsolated: boolean;
}

/**
 * Reasoning or safety constraint item.
 */
export interface ExecutiveConstraint {
  id: string;
  type: "HARD_CONSTRAINT" | "SAFETY" | "REASONING" | "PLANNING" | "VERIFICATION";
  description: string;
  authority: ExecutiveAuthority;
  enforceStrictly: boolean;
  sanitizedDirective: string;
}

/**
 * Final resolved presentation and response style.
 */
export interface ExecutiveResponseStyle {
  language: string;
  verbosity: string;
  tone: string;
  formatStyle: string;
  codeDensity: string;
  explanationDepth: string;
  winningLayers: Record<string, string>;
  sanitizedDirectives: string[];
}

/**
 * Safe advisory item from predictive suggestions.
 */
export interface ExecutiveAdvisory {
  id: string;
  key: string;
  suggestion: string;
  relevanceScore: number;
  topic?: string;
  isAdvisoryOnly: true;
  sanitizedDirective: string;
}

/**
 * Ambiguity status and clarification prompts.
 */
export interface ExecutiveAmbiguity {
  isAmbiguous: boolean;
  status: ExecutiveAmbiguityStatus;
  competingTargets: string[];
  clarificationPrompt?: string;
}

/**
 * Conflict resolution record.
 */
export interface ExecutiveConflictRecord {
  key: string;
  winner: {
    source: string;
    authority: ExecutiveAuthority;
    value: string;
  };
  suppressed: Array<{
    source: string;
    authority: ExecutiveAuthority;
    value: string;
    reason: string;
  }>;
  conflictStatus: ConflictResolutionStatus;
}

/**
 * Comprehensive diagnostic counts.
 */
export interface ExecutiveDiagnostics {
  totalCandidatesExamined: number;
  includedItemsCount: number;
  suppressedItemsCount: number;
  deduplicatedCount: number;
  topicIsolatedCount: number;
  staleExpiredSuppressedCount: number;
  predictiveSuppressedCount: number;
  sensitiveDataSuppressedCount: number;
  sanitizedDirectivesCount: number;
  budgetTruncatedCount: number;
  conflictResolutionCounts: {
    resolved: number;
    unresolved: number;
  };
  executionTimeMs: number;
}

/**
 * Strict, decision-ready Context Package.
 */
export interface ExecutiveContextPackage {
  currentTurn: ExecutiveCurrentTurn;
  authoritativeFacts: ExecutiveFact[];
  activePreferences: ExecutivePreference[];
  activeProjects: ExecutiveProject[];
  activeGoals: ExecutiveGoal[];
  activeCommitments: ExecutiveCommitment[];
  temporalContext: ExecutiveTemporalContext;
  continuityContext: ExecutiveContinuityContext;
  reasoningConstraints: ExecutiveConstraint[];
  responseStyle: ExecutiveResponseStyle;
  advisoryContext: ExecutiveAdvisory[];
  ambiguity: ExecutiveAmbiguity;
  conflicts: ExecutiveConflictRecord[];
  diagnostics: ExecutiveDiagnostics;
  promptDirectives: string[];
}

/**
 * Configurable Context Budget Limits.
 */
export interface ExecutiveContextBudgetConfig {
  maxFacts: number;         // default: 8
  maxMemories: number;      // default: 8
  maxPreferences: number;   // default: 6
  maxProjects: number;      // default: 3
  maxGoals: number;         // default: 5
  maxCommitments: number;   // default: 5
  maxTemporalItems: number; // default: 5
  maxAdvisories: number;    // default: 4
  maxDirectives: number;    // default: 15
  maxTotalItems: number;    // default: 25
}

/**
 * Default budget limits.
 */
export const DEFAULT_EXECUTIVE_BUDGET: ExecutiveContextBudgetConfig = {
  maxFacts: 8,
  maxMemories: 8,
  maxPreferences: 6,
  maxProjects: 3,
  maxGoals: 5,
  maxCommitments: 5,
  maxTemporalItems: 5,
  maxAdvisories: 4,
  maxDirectives: 15,
  maxTotalItems: 25,
};

/**
 * Input contract for Executive Context Engine.
 */
export interface ExecutiveContextInput {
  userId?: string;
  message: string;
  context?: ConversationContext;
  intent?: StructuredIntent;
  reasoning?: ReasoningAnalysis;
  planning?: PlanningAnalysis;
  verification?: VerificationAnalysis;
  memoryRetrieval?: MemoryRetrievalAnalysis;
  memoryGovernance?: MemoryGovernanceAnalysis;
  adaptiveLearning?: LearningAnalysis;
  userModel?: UserModelAnalysis;
  temporalMemory?: TemporalMemoryAnalysis;
  goalProject?: GoalProjectAnalysis;
  contextContinuity?: ContextContinuityAnalysis;
  predictiveContext?: PredictiveContextAnalysis;
  responseAdaptation?: ResponseAdaptationAnalysis;
  history?: ConversationTurn[];
  options?: {
    userId?: string;
    currentTime?: number;
    budgetConfig?: Partial<ExecutiveContextBudgetConfig>;
    strictTopicIsolation?: boolean;
  };
}
