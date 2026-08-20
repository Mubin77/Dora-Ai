/**
 * Dora Predictive Context & Proactive Memory Orchestration Types
 * Phase 2 — Step 6
 * 
 * Provides deterministic, strongly-typed contracts for evaluating validated
 * cognitive context, active plan DAGs, confirmed memories, and learned patterns
 * to proactively prepare safe, non-hallucinatory contextual assistance.
 */

import { ConversationContext, ConversationTurn } from "./contextTypes";
import { StructuredIntent } from "./intentTypes";
import { ReasoningAnalysis } from "./reasoningTypes";
import { PlanningAnalysis, TaskPlan, PlanStep } from "./planningTypes";
import { VerificationAnalysis } from "./verificationTypes";
import { MemoryGovernanceAnalysis, MemoryGovernanceCandidate } from "./memoryGovernanceTypes";
import { LearningAnalysis, LearningPattern } from "./adaptiveLearningTypes";

export type PredictiveSignalSource =
  | "CURRENT_CONTEXT"
  | "ACTIVE_PLAN"
  | "USER_MODEL"
  | "CONFIRMED_MEMORY"
  | "RECENT_INTERACTION"
  | "TASK_WORKFLOW"
  | "EXPLICIT_USER_INTENT";

export type PredictionType =
  | "FOLLOW_UP_LIKELY"
  | "TASK_CONTINUATION"
  | "PREFERENCE_RELEVANT"
  | "CONTEXT_RELEVANT"
  | "CLARIFICATION_LIKELY"
  | "NO_PREDICTION";

export type PredictiveStatus =
  | "SUCCESS"
  | "NO_PREDICTION"
  | "SUPPRESSED"
  | "INSUFFICIENT_SIGNALS";

export type SuppressionReason =
  | "SENSITIVE_DATA"
  | "TOPIC_MISMATCH"
  | "CURRENT_TURN_OVERRIDE"
  | "HARD_CONSTRAINT_CONFLICT"
  | "LIVE_EVIDENCE_CONFLICT"
  | "DAG_DEPENDENCY_BLOCKED"
  | "PLAN_TERMINATED"
  | "CONFIDENCE_BELOW_THRESHOLD"
  | "UNCONFIRMED_CANDIDATE"
  | "GOVERNANCE_SUPPRESSED"
  | "EXPIRED_TTL"
  | "SUPERSEDED_MEMORY"
  | "EXPIRED_MEMORY"
  | "DELETED_MEMORY"
  | "QUARANTINED_MEMORY"
  | "OUTDATED_PATTERN"
  | "CASUAL_INTERACTION";

export interface PredictiveSignal {
  id: string;
  source: PredictiveSignalSource;
  signalKey: string;
  signalValue: string;
  confidence: number; // 0.0 <= confidence <= 1.0
  timestamp: number;
  topic?: string;
  isExplicit: boolean;
  isSensitive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ProactiveContextCandidate {
  id: string;
  source: PredictiveSignalSource;
  predictionType: PredictionType;
  relevance: number; // 0.0 <= relevance <= 1.0
  confidence: number; // 0.0 <= confidence <= 1.0
  topic: string;
  reasonCategory: string;
  expiresAt: number; // Timestamp
  isSafeToInject: boolean;
  requiresConfirmation: boolean;
  contextSummary: string;
  directive?: string;
  suppressionReason?: SuppressionReason;
  targetStepId?: string;
}

export interface PredictiveDiagnostics {
  signalsEvaluated: number;
  candidatesGenerated: number;
  candidatesAccepted: number;
  candidatesRejected: number;
  reasons: string[];
}

export interface PredictiveContextAnalysis {
  predictions: PredictionType[];
  acceptedCandidates: ProactiveContextCandidate[];
  rejectedCandidates: ProactiveContextCandidate[];
  suppressionReasons: string[];
  activeTopic?: string;
  confidence: number; // 0.0 <= confidence <= 1.0
  directives: string[];
  requiresConfirmation: boolean;
  analysisStatus: PredictiveStatus;
  diagnostics: PredictiveDiagnostics;
}

export interface PredictiveContextInput {
  message: string;
  context: ConversationContext;
  intent: StructuredIntent;
  reasoning?: ReasoningAnalysis;
  planning?: PlanningAnalysis;
  verification?: VerificationAnalysis;
  governanceAnalysis?: MemoryGovernanceAnalysis;
  adaptiveLearning?: LearningAnalysis;
  history?: ConversationTurn[];
  options?: {
    userId?: string;
    currentTime?: number;
    ttlMs?: number;
  };
}
