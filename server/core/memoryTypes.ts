/**
 * Dora Long-Term Memory Architecture & Models
 * Phase 2 — Step 1
 * 
 * Provides deterministic, structured, privacy-aware memory models
 * distinguishing between active conversation context, working state,
 * short-lived temporal data, and persistent long-term memories.
 */

export type MemoryType =
  | "FACT"
  | "PREFERENCE"
  | "GOAL"
  | "HABIT"
  | "PERSONALIZATION"
  | "PROJECT_CONTEXT"
  | "EXPLICIT_MEMORY"
  | "TEMPORARY"
  | "CANDIDATE";

export type MemorySource =
  | "EXPLICIT_USER"
  | "REPEATED_USER_STATEMENT"
  | "INFERRED"
  | "SYSTEM"
  | "IMPORTED"
  | "MANUAL";

export type MemoryStatus =
  | "ACTIVE"
  | "OUTDATED"
  | "ARCHIVED"
  | "SUPERSEDED"
  | "CANDIDATE"
  | "EXPIRED"
  | "DELETED";

export type MemoryDecisionAction =
  | "SAVE"
  | "UPDATE"
  | "IGNORE"
  | "TEMPORARY"
  | "CANDIDATE"
  | "FORGET";

export interface MemoryRecord {
  id: string;
  userId: string;
  type: MemoryType;
  key: string;
  value: string;
  normalizedValue: string;
  source: MemorySource;
  confidence: number;       // 0.0 - 1.0 (Explicit = 1.0, Inferred = 0.5 - 0.75)
  importance: number;       // 0 - 100
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
  accessCount: number;
  expiresAt?: number | null;
  status: MemoryStatus;
  tags: string[];
  evidence: string[];
  supersedes?: string | null; // ID of replaced/superseded memory
  supersededBy?: string | null; // ID of winning memory that superseded this one
  mergedFrom?: string[];      // IDs of memories merged into this canonical record
  mergedInto?: string | null; // ID of canonical memory this was merged into
  reinforcementCount?: number;
  lastReinforcedAt?: number;
  isQuarantined?: boolean;
  quarantineReason?: string;
  healthScore?: number;
  decayScore?: number;
  version: number;
}

export interface MemoryForgetDirective {
  keyOrTopic: string;
  scope: "exact" | "topic" | "all";
  reason?: string;
}

export interface MemoryDecision {
  action: MemoryDecisionAction;
  reason: string;
  confidence: number;
  isExplicit: boolean;
  targetRecord?: Partial<MemoryRecord>;
  existingRecordId?: string;
  supersededRecordId?: string;
  forgetDirective?: MemoryForgetDirective;
  isSensitiveRejected?: boolean;
  isTemporaryRejected?: boolean;
  directive?: string;
}

export interface MemoryQueryOptions {
  category?: MemoryType | "ALL";
  queryText?: string;
  tags?: string[];
  minImportance?: number;
  minConfidence?: number;
  status?: MemoryStatus;
  limit?: number;
  includeExpired?: boolean;
}

export interface MemoryRetrievalResult {
  records: MemoryRecord[];
  formattedContext: string;
  retrievedCount: number;
  queryTimeMs: number;
}
