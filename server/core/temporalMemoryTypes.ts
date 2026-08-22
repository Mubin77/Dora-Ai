/**
 * Dora Temporal Memory & Life-Pattern Reasoning Types
 * Phase 2 — Step 9
 * 
 * Strongly typed deterministic models for temporal memory analysis,
 * life-pattern evolution, recency/stability scoring, and temporal relationships.
 */

import { UserModelEvidenceAuthority, UserModelDimension } from "./longTermUserModelTypes";

/**
 * Temporal state classification for memories, preferences, and interaction patterns.
 */
export type TemporalStatus =
  | "CURRENT"
  | "RECENT"
  | "STABLE"
  | "RECURRING"
  | "EVOLVING"
  | "HISTORICAL"
  | "STALE"
  | "SUPERSEDED"
  | "EXPIRED"
  | "UNKNOWN";

/**
 * Scope of temporal validity.
 */
export type TemporalScope =
  | "TURN"
  | "SESSION"
  | "PROJECT"
  | "TOPIC"
  | "GLOBAL";

/**
 * Temporal relationship type between two memory records or patterns.
 */
export type TemporalRelationType =
  | "SUPERSEDES"
  | "SUPERSEDED_BY"
  | "EVOLVED_FROM"
  | "EVOLVED_TO"
  | "CONCURRENT_WITH"
  | "REINFORCES"
  | "CONTRADICTS"
  | "UNRELATED";

/**
 * Single temporal observation representing evidence observed at a specific time/turn.
 */
export interface TemporalObservation {
  observationId: string;
  timestamp: number;
  turnOrSessionId: string;
  source: string;
  authority: UserModelEvidenceAuthority;
  value: string;
  valueHash: string;
  isExplicit: boolean;
  contextTopic?: string;
}

/**
 * Historical value record within an evolution track.
 */
export interface PreviousValueRecord {
  value: string;
  normalizedValue: string;
  firstObservedAt: number;
  lastObservedAt: number;
  observationCount: number;
  supersededAt: number;
  supersededBy?: string;
  authority: UserModelEvidenceAuthority;
  reason?: string;
}

/**
 * Temporal pattern representing an attribute or habit evaluated across time.
 */
export interface TemporalPattern {
  patternId: string;
  attributeKey: string;
  dimension: UserModelDimension;
  currentValue: string;
  normalizedValue: string;
  firstObservedAt: number;
  lastObservedAt: number;
  observationCount: number;
  independentObservationCount: number;
  activePeriods: string[];
  previousValues: PreviousValueRecord[];
  temporalStatus: TemporalStatus;
  confidence: number;
  sourceAuthority: UserModelEvidenceAuthority;
  scope: TemporalScope;
  lineage: string[];
  relevanceScore: number;
  isStable: boolean;
  isRecurring: boolean;
  isStale: boolean;
  isCurrentTurnOverride: boolean;
  associatedTopic?: string;
}

/**
 * Temporal relationship link between two entities/memories.
 */
export interface TemporalRelation {
  sourceKey: string;
  targetKey: string;
  relationType: TemporalRelationType;
  establishedAt: number;
  confidence: number;
  description: string;
}

/**
 * Evolution record capturing a detected preference or behavior transition (A -> B).
 */
export interface TemporalEvolutionRecord {
  attributeKey: string;
  previousValue: string;
  currentValue: string;
  transitionTimestamp: number;
  authority: UserModelEvidenceAuthority;
  lineageIds: string[];
  sanitizedSummary: string;
}

/**
 * Diagnostics and metric breakdown for temporal reasoning.
 */
export interface TemporalDiagnostics {
  totalPatternsAnalyzed: number;
  stableCount: number;
  recurringCount: number;
  evolvingCount: number;
  historicalCount: number;
  staleCount: number;
  suppressedSensitiveCount: number;
  topicIsolatedCount: number;
  evolutionTransitions: TemporalEvolutionRecord[];
}

/**
 * Input configuration provided to TemporalMemoryEngine.
 */
export interface TemporalMemoryInput {
  userId: string;
  message?: string;
  currentTime?: number;
  context?: any;
  intent?: any;
  reasoning?: any;
  planning?: any;
  verification?: any;
  governanceAnalysis?: any;
  adaptiveLearning?: any;
  longTermUserModel?: any;
  predictiveContext?: any;
  history?: any[];
  options?: {
    userId?: string;
    currentTime?: number;
    isTopicIsolated?: boolean;
    activeTopic?: string;
    recencyWindowMs?: number;
    staleThresholdMs?: number;
  };
}

/**
 * Complete analysis result produced by TemporalMemoryEngine.
 */
export interface TemporalMemoryAnalysis {
  userId: string;
  analyzedAt: number;
  patterns: TemporalPattern[];
  activePatterns: TemporalPattern[];
  historicalPatterns: TemporalPattern[];
  evolutions: TemporalEvolutionRecord[];
  relations: TemporalRelation[];
  directives: string[];
  diagnostics: TemporalDiagnostics;
}
