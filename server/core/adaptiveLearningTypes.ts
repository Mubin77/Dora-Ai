/**
 * Dora Adaptive Memory Learning & User Model Types
 * Phase 2 — Step 5
 * 
 * Provides deterministic, strongly-typed contracts for pattern learning,
 * candidate tracking, pattern reinforcement, temporal decay, user behavior modeling,
 * and sanitized prompt directive generation.
 */

export type LearningSignalSource =
  | "GOVERNED_MEMORY"
  | "EXPLICIT_USER_STATEMENT"
  | "USER_CORRECTION"
  | "TASK_COMPLETION"
  | "INTERACTION_STYLE"
  | "DOMAIN_QUERY";

export type LearningSignalType =
  | "PREFERENCE"
  | "INTERACTION_STYLE"
  | "WORKFLOW_PATTERN"
  | "DOMAIN_INTEREST"
  | "DECISION_CRITERION"
  | "CORRECTION";

export type PatternStatus =
  | "CANDIDATE"
  | "CONFIRMED"
  | "SUPPRESSED"
  | "OUTDATED";

export type PatternType =
  | "USER_PREFERENCE"
  | "INTERACTION_STYLE"
  | "TASK_WORKFLOW"
  | "DOMAIN_INTEREST"
  | "DECISION_CRITERIA";

export type LearningDecision =
  | "NO_CHANGE"
  | "REINFORCE"
  | "CREATE_CANDIDATE"
  | "PROMOTE_PATTERN"
  | "DEMOTE_PATTERN"
  | "CONFLICT"
  | "SUPPRESS"
  | "REQUEST_CONFIRMATION";

export interface LearningEvidence {
  evidenceId: string;
  signalType: LearningSignalType;
  timestamp: number;
  turnOrSessionId?: string;
  valueHash: string;
  source: string;
  contextSummary?: string;
  isExplicit?: boolean;
}

export interface LearningSignal {
  id: string;
  source: LearningSignalSource;
  type: LearningSignalType;
  signalKey: string;
  signalValue: string;
  confidence: number; // Bounded [0.0, 1.0]
  timestamp: number;
  turnIndex?: number;
  isExplicit: boolean;
  domain?: string;
  context?: string;
  isSensitive?: boolean;
}

export interface LearningPattern {
  id: string;
  userId: string;
  patternType: PatternType;
  category: string;
  key: string;
  value: string;
  status: PatternStatus;
  confidence: number; // Bounded [0.0, 1.0]
  reinforcementCount: number;
  independentEvidenceCount: number;
  firstObservedAt: number;
  lastObservedAt: number;
  evidence: LearningEvidence[];
  supersedes?: string;
  supersededBy?: string;
  source: string;
  directives?: string[];
  isExplicit?: boolean;
  isDecayed?: boolean;
}

export interface InteractionPreference {
  category: "verbosity" | "language" | "code_density" | "guidance_style" | "technical_depth";
  preference: string;
  confidence: number;
  status: PatternStatus;
  evidenceCount: number;
  lastObservedAt: number;
}

export interface TaskPattern {
  workflowType: string;
  description: string;
  frequency: number;
  confidence: number;
  status: PatternStatus;
  lastObservedAt: number;
}

export interface DomainInterest {
  domain: string;
  topic: string;
  confidence: number;
  status: PatternStatus;
  mentionCount: number;
  lastObservedAt: number;
}

export interface UserPreferenceProfile {
  languagePreference?: "en" | "bn" | "banglish" | "mixed";
  codeDensity?: "high" | "moderate" | "minimal";
  responseVerbosity?: "concise" | "detailed" | "balanced";
  technicalDepth?: "expert" | "intermediate" | "simple";
  confirmedPreferences: LearningPattern[];
  candidatePreferences: LearningPattern[];
}

export interface UserBehaviorProfile {
  userId: string;
  interactionPreferences: InteractionPreference[];
  taskPatterns: TaskPattern[];
  domainInterests: DomainInterest[];
  preferences: UserPreferenceProfile;
  lastUpdatedAt: number;
}

export interface LearningAction {
  actionType: LearningDecision;
  patternId: string;
  reason: string;
  previousStatus?: PatternStatus;
  newStatus?: PatternStatus;
  patternKey: string;
  patternValue: string;
}

export interface LearningDirective {
  text: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  category: "STYLE" | "PREFERENCE" | "WORKFLOW" | "DOMAIN";
}

export interface LearningAnalysis {
  userId: string;
  patterns: LearningPattern[];
  activeDirectives: string[];
  decisions: LearningAction[];
  profile: UserBehaviorProfile;
  diagnostics: {
    totalSignalsProcessed: number;
    sensitiveSignalsBlocked: number;
    candidatesCreated: number;
    patternsReinforced: number;
    patternsPromoted: number;
    patternsDemoted: number;
    conflictsDetected: number;
    currentTurnOverrides: string[];
  };
  currentTurnOverrideApplied: boolean;
}
