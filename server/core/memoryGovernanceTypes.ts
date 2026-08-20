/**
 * Dora Memory Governance & Response Integration Types
 * Phase 2 — Step 4
 * 
 * Provides deterministic, strongly-typed data structures for governing
 * how retrieved and consolidated long-term memories are filtered, audited,
 * safety-checked, and safely exposed to downstream response generation.
 * 
 * Pipeline Stage:
 * ContextEngine -> IntentEngine -> ReasoningEngine -> PlanningEngine -> 
 * VerificationEngine -> MemoryDecisionEngine -> MemoryRetrievalEngine -> 
 * MemoryConsolidationEngine -> MemoryGovernanceEngine -> BrainEngine Directives
 */

import {
  MemoryRecord,
  MemoryType,
  MemorySource,
  MemoryStatus,
} from "./memoryTypes";
import {
  MemoryCandidate,
  MemoryRetrievalAnalysis,
  MemoryConflictRecord,
} from "./memoryRetrievalTypes";
import { MemoryConsolidationAnalysis } from "./memoryConsolidationTypes";
import { ConversationContext } from "./contextTypes";
import { StructuredIntent } from "./intentTypes";
import { ReasoningAnalysis } from "./reasoningTypes";
import { PlanningAnalysis } from "./planningTypes";
import { VerificationAnalysis } from "./verificationTypes";

export type MemoryUsageDecision =
  | "ALLOW"
  | "ALLOW_WITH_CAUTION"
  | "INTERNAL_ONLY"
  | "SUPPRESS";

export type MemoryUsageReason =
  | "HIGH_RELEVANCE"
  | "EXPLICIT_REFERENCE"
  | "HIGH_CONFIDENCE"
  | "ACTIVE_USER_PREFERENCE"
  | "ACTIVE_USER_GOAL"
  | "CANDIDATE_UNCERTAIN"
  | "LOW_RELEVANCE"
  | "TOPIC_MISMATCH"
  | "CONFLICTING_MEMORY"
  | "SENSITIVE_DATA"
  | "STALE_MEMORY"
  | "EXPIRED_MEMORY"
  | "SUPERSEDED_MEMORY"
  | "DELETED_MEMORY"
  | "QUARANTINED_MEMORY"
  | "ARCHIVED_MEMORY"
  | "AMBIGUOUS_REFERENCE"
  | "INTENT_MISMATCH"
  | "HARD_CONSTRAINT_OVERRIDDEN"
  | "VERIFIED_EVIDENCE_OVERRIDDEN"
  | "UNVERIFIED_CLAIM";

export interface MemoryGovernanceCandidate {
  memoryId: string;
  key: string;
  value: string;
  type: MemoryType;
  source: MemorySource;
  status: MemoryStatus;
  usageDecision: MemoryUsageDecision;
  usageScore: number;                 // 0.0 - 1.0
  confidence: number;                 // 0.0 - 1.0
  relevance: number;                  // 0.0 - 1.0
  reasons: MemoryUsageReason[];
  canAffectResponseContent: boolean;
  canPersonalize: boolean;
  canSupportFactualClaim: boolean;
  requiresExplicitAttribution: boolean; // e.g., must state as inferred / preference
  isCandidateInferred: boolean;
  governanceNotes?: string;
}

export interface MemoryConflictGovernance {
  key: string;
  winningCandidateId?: string;
  conflictingCandidateIds: string[];
  resolutionStatus: "RESOLVED" | "UNRESOLVED_REQUIRES_CAUTION" | "SUPPRESSED";
  governanceDirective?: string;
}

export interface MemoryPrivacyBlock {
  memoryId: string;
  key: string;
  reason: string;
  redactedPattern: string;
}

export interface MemoryGovernanceInput {
  context: ConversationContext;
  intent: StructuredIntent;
  reasoning?: ReasoningAnalysis;
  planning?: PlanningAnalysis;
  verification?: VerificationAnalysis;
  retrieval: MemoryRetrievalAnalysis;
  consolidation?: MemoryConsolidationAnalysis;
  message: string;
  options?: {
    strictPrivacy?: boolean;
    currentTime?: number;
  };
}

export interface MemoryGovernanceAnalysis {
  governanceRequired: boolean;
  memoryInfluenceAllowed: boolean;
  allowedMemories: MemoryGovernanceCandidate[];
  cautiousMemories: MemoryGovernanceCandidate[];
  internalOnlyMemories: MemoryGovernanceCandidate[];
  suppressedMemories: MemoryGovernanceCandidate[];
  governedCandidates: MemoryGovernanceCandidate[];
  conflicts: MemoryConflictGovernance[];
  privacyBlocks: MemoryPrivacyBlock[];
  topicIsolationApplied: boolean;
  explicitReferenceDetected: boolean;
  directives: string[];
  sanitizedMemoryContext: string;
  governanceConfidence: number;        // 0.0 - 1.0
  executionTimeMs?: number;
}
