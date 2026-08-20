/**
 * Dora Long-Term Memory Consolidation, Maintenance & Lifecycle Types
 * Phase 2 — Step 3
 * 
 * Provides strongly-typed models, enums, and interfaces for:
 * - Lifecycle state tracking (ACTIVE, CANDIDATE, SUPERSEDED, OUTDATED, ARCHIVED, EXPIRED, DELETED)
 * - Duplicate consolidation & canonical merging
 * - Conflict resolution & lineage tracking
 * - Reinforcement & bounded confidence calibration
 * - Candidate promotion & demotion
 * - Recency decay & safe expiration
 * - Explicit forget/delete lifecycle
 * - Privacy & sensitive data quarantine
 * - Memory health diagnostics & idempotent maintenance sweeps
 */

import {
  MemoryRecord,
  MemoryType,
  MemorySource,
  MemoryStatus,
  MemoryForgetDirective,
} from "./memoryTypes";

export type MemoryLifecycleState =
  | "ACTIVE"
  | "CANDIDATE"
  | "SUPERSEDED"
  | "OUTDATED"
  | "ARCHIVED"
  | "EXPIRED"
  | "DELETED";

export type MemoryConsolidationAction =
  | "NO_OP"
  | "MERGE"
  | "REINFORCE"
  | "UPDATE_CONFIDENCE"
  | "SUPERSEDE"
  | "PROMOTE_CANDIDATE"
  | "DEMOTE_CANDIDATE"
  | "MARK_OUTDATED"
  | "ARCHIVE"
  | "EXPIRE"
  | "DELETE"
  | "RESOLVE_CONFLICT"
  | "REQUEST_CONFIRMATION"
  | "QUARANTINE_SENSITIVE";

export interface MemoryHealth {
  overallStatus: "HEALTHY" | "DEGRADED" | "NEEDS_MAINTENANCE" | "CRITICAL";
  healthScore: number;         // 0.0 - 1.0
  confidenceHealth: number;    // 0.0 - 1.0
  freshnessHealth: number;     // 0.0 - 1.0
  consistencyHealth: number;   // 0.0 - 1.0
  privacyHealth: number;       // 0.0 - 1.0 (1.0 = safe, 0.0 = sensitive breach)
  duplicationRisk: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  contradictionRisk: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  decayScore: number;          // 0.0 - 1.0 (0 = fresh, 1 = decayed)
  isSensitiveRisk: boolean;
  issues: string[];
}

export interface MemoryConflict {
  existingMemoryId: string;
  conflictingMemoryId: string;
  key: string;
  existingValue: string;
  conflictingValue: string;
  existingSource: MemorySource;
  conflictingSource: MemorySource;
  resolution: "KEEP_EXISTING" | "SUPERSEDE_WITH_NEW" | "MERGE" | "MANUAL_REVIEW";
  winnerId?: string;
  loserId?: string;
  reason: string;
  confidenceDiff: number;
  recencyDiffMs: number;
}

export interface MemoryMergeCandidate {
  canonicalId: string;
  duplicateIds: string[];
  key: string;
  canonicalValue: string;
  mergedEvidence: string[];
  mergedTags: string[];
  combinedReinforcementCount: number;
  calibratedConfidence: number;
  calibratedImportance: number;
  reason: string;
}

export interface MemoryReinforcement {
  memoryId: string;
  key: string;
  previousReinforcementCount: number;
  newReinforcementCount: number;
  previousConfidence: number;
  newConfidence: number;
  previousImportance: number;
  newImportance: number;
  lastReinforcedAt: number;
  evidenceAdded: string;
  reason: string;
}

export interface MemoryDecayAssessment {
  memoryId: string;
  key: string;
  ageMs: number;
  inactiveDurationMs: number;
  decayFactor: number;         // 0.0 - 1.0
  isStale: boolean;
  suggestedState: MemoryLifecycleState;
  reason: string;
}

export interface MemoryRetentionAssessment {
  memoryId: string;
  retain: boolean;
  reason: string;
  lifecycleState: MemoryLifecycleState;
  isSensitive: boolean;
  isExpired: boolean;
}

export interface MemoryMaintenanceAction {
  action: MemoryConsolidationAction;
  targetMemoryId: string;
  secondaryMemoryIds?: string[];
  reason: string;
  updatedFields?: Partial<MemoryRecord>;
  lineageUpdate?: {
    supersededBy?: string | null;
    supersedes?: string | null;
    mergedInto?: string | null;
    mergedFrom?: string[];
    previousState?: MemoryLifecycleState;
  };
}

export interface MemoryConsolidationResult {
  updatedMemories: MemoryRecord[];
  actionsTaken: MemoryMaintenanceAction[];
  mergesCount: number;
  reinforcementsCount: number;
  promotionsCount: number;
  demotionsCount: number;
  supersededCount: number;
  expiredCount: number;
  deletedCount: number;
  quarantinedCount: number;
  conflictsResolved: MemoryConflict[];
  overallHealth: {
    totalMemories: number;
    activeCount: number;
    candidateCount: number;
    archivedCount: number;
    supersededCount: number;
    expiredCount: number;
    deletedCount: number;
    averageHealthScore: number;
  };
  processingTimeMs: number;
}

export interface MemoryConsolidationAnalysis {
  isMaintenanceNeeded: boolean;
  recommendedActions: MemoryMaintenanceAction[];
  conflicts: MemoryConflict[];
  mergeCandidates: MemoryMergeCandidate[];
  healthAssessments: Record<string, MemoryHealth>;
  directives: string[];
}

export interface MemoryConsolidationOptions {
  currentTime?: number;
  candidatePromotionThreshold?: number; // min reinforcements needed (default: 2)
  candidateConfidenceThreshold?: number; // min confidence (default: 0.75)
  candidateMaxStaleDays?: number;       // default: 30 days
  autoQuarantineSensitive?: boolean;    // default: true
  autoMergeDuplicates?: boolean;        // default: true
  autoResolveConflicts?: boolean;       // default: true
  autoExpireTemporal?: boolean;         // default: true
  autoPromoteCandidates?: boolean;      // default: true
  autoDemoteStaleCandidates?: boolean;  // default: true
}
