/**
 * Dora Long-Term User Model Synthesis & Identity-Aware Context Types
 * Phase 2 — Step 8
 * 
 * Provides deterministic, strongly-typed contracts for synthesizing
 * evidence-backed user characteristics, communication preferences, workflows,
 * domain interests, and safe identity boundaries without hallucination.
 */

import { ConversationContext, ConversationTurn } from "./contextTypes";
import { StructuredIntent } from "./intentTypes";
import { MemoryGovernanceAnalysis, MemoryGovernanceCandidate } from "./memoryGovernanceTypes";
import { LearningAnalysis, LearningPattern } from "./adaptiveLearningTypes";
import { PredictiveContextAnalysis } from "./predictiveContextTypes";

export type UserModelDimension =
  | "COMMUNICATION"
  | "LANGUAGE"
  | "VERBOSITY"
  | "TONE"
  | "FORMAT"
  | "CODE_STYLE"
  | "TASK_WORKFLOW"
  | "DOMAIN_INTEREST"
  | "PROJECT_CONTEXT"
  | "USER_GOAL";

export type UserModelAttributeStatus =
  | "CANDIDATE"
  | "CONFIRMED"
  | "STABLE"
  | "TEMPORARY"
  | "SUPERSEDED"
  | "OUTDATED"
  | "SUPPRESSED";

export type UserModelEvidenceAuthority =
  | "CURRENT_TURN_EXPLICIT"
  | "EXPLICIT_USER_MEMORY"
  | "VERIFIED_EVIDENCE"
  | "CONFIRMED_ADAPTIVE_PATTERN"
  | "CONFIRMED_PREFERENCE"
  | "REPEATED_VALIDATED_SIGNAL"
  | "PREDICTIVE_CONTEXT";

export type UserModelDecisionType =
  | "SYNTHESIZED"
  | "UPDATED"
  | "SUPERSEDED"
  | "HELD_AS_CANDIDATE"
  | "TEMPORARY_OVERRIDE"
  | "SUPPRESSED_SENSITIVE"
  | "EXCLUDED_UNSUPPORTED";

export interface UserModelEvidence {
  evidenceId: string;
  source: string;
  authority: UserModelEvidenceAuthority;
  dimension: UserModelDimension;
  value: string;
  turnId?: string;
  timestamp: number;
  isExplicit: boolean;
  contextSummary?: string;
}

export interface UserModelAttribute {
  key: string;
  dimension: UserModelDimension;
  normalizedValue: string;
  confidence: number; // Bounded [0.0, 1.0]
  evidenceCount: number;
  independentEvidenceCount: number;
  status: UserModelAttributeStatus;
  sourceClassification: UserModelEvidenceAuthority;
  firstObservedAt: number;
  lastObservedAt: number;
  isDurable: boolean;
  isTemporary: boolean;
  supersededBy?: string;
  previousValue?: string;
  lineage?: string[];
  evidence: UserModelEvidence[];
}

export interface UserModelDecision {
  key: string;
  dimension: UserModelDimension;
  decision: UserModelDecisionType;
  authority: UserModelEvidenceAuthority;
  reason: string;
}

export interface UserModelProfile {
  userId: string;
  attributes: Record<string, UserModelAttribute>;
  confirmedAttributes: UserModelAttribute[];
  candidateAttributes: UserModelAttribute[];
  temporaryAttributes: UserModelAttribute[];
  supersededAttributes: UserModelAttribute[];
  domainInterests: UserModelAttribute[];
  projectContexts: UserModelAttribute[];
  goals: UserModelAttribute[];
  lastSynthesizedAt: number;
}

export interface UserModelHealth {
  evidenceCoverage: number; // Bounded [0.0, 1.0]
  conflictCount: number;
  staleAttributeCount: number;
  confirmedAttributeCount: number;
  candidateAttributeCount: number;
  suppressedAttributeCount: number;
  overallHealth: "EXCELLENT" | "GOOD" | "DEGRADED" | "INSUFFICIENT_EVIDENCE";
}

export interface UserModelAnalysis {
  userId: string;
  profile: UserModelProfile;
  activeDirectives: string[];
  currentTurnOverrides: UserModelAttribute[];
  decisions: UserModelDecision[];
  health: UserModelHealth;
  safetyStatus: "SAFE" | "SENSITIVE_SUPPRESSED" | "UNSUPPORTED_IDENTITY_BLOCKED";
  diagnostics: {
    signalsProcessed: number;
    memoriesIngested: number;
    patternsIngested: number;
    conflictsResolved: number;
    sensitiveBlocked: number;
    unsupportedIdentityBlocked: number;
    isDeterministic: true;
  };
}

export interface LongTermUserModelInput {
  userId?: string;
  message?: string;
  context?: ConversationContext;
  intent?: StructuredIntent;
  governanceAnalysis?: MemoryGovernanceAnalysis;
  adaptiveLearning?: LearningAnalysis;
  predictiveContext?: PredictiveContextAnalysis;
  history?: ConversationTurn[];
  options?: {
    userId?: string;
    currentTime?: number;
    isTopicIsolated?: boolean;
  };
}
