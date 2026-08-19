/**
 * Dora Long-Term Memory Retrieval & Recall Types
 * Phase 2 — Step 2
 * 
 * Provides deterministic, structured, and strongly-typed data structures
 * for memory retrieval, relevance scoring, conflict resolution, privacy
 * filtering, and prompt directive generation.
 */

import { MemoryRecord, MemoryType, MemorySource, MemoryStatus } from "./memoryTypes";

export interface MemoryRetrievalScore {
  topicMatch: number;        // 0.0 - 1.0
  entityMatch: number;       // 0.0 - 1.0
  intentMatch: number;       // 0.0 - 1.0
  taskMatch: number;         // 0.0 - 1.0
  goalMatch: number;         // 0.0 - 1.0
  categoryMatch: number;     // 0.0 - 1.0
  recencyWeight: number;     // 0.0 - 1.0
  importanceWeight: number;  // 0.0 - 1.0
  confidenceWeight: number;  // 0.0 - 1.0
  explicitBoost: number;     // 0.0 - 1.0
  normalizedScore: number;   // 0.0 - 1.0 (Composite calibrated score)
}

export interface MemoryCandidate {
  memory: MemoryRecord;
  memoryId: string;
  content: string;
  memoryType: MemoryType;
  category: string;
  confidence: number;
  importance: number;
  relevanceScore: number;    // 0.0 - 1.0
  matchedSignals: string[];
  source: MemorySource;
  createdAt: number;
  updatedAt: number;
  status: MemoryStatus;
  supersedes?: string | null;
  retrievalReason: string;
  scoreBreakdown?: MemoryRetrievalScore; // Internal scoring metadata (never shown to user)
  isConflict?: boolean;
  conflictDetail?: string;
  isLowConfidenceInferred?: boolean;
}

export interface MemoryRetrievalQuery {
  message: string;
  activeTopic?: string;
  currentTask?: string;
  userGoal?: string;
  entities?: string[];
  intent?: string;
  isTopicSwitched?: boolean;
  isExplicitMemoryQuery?: boolean;
  explicitReferenceTokens?: string[];
  userId?: string;
  topK?: number;
  minRelevanceScore?: number;
  allowedTypes?: MemoryType[];
}

export interface MemoryRetrievalDirective {
  type: "CONTEXT_INJECTION" | "CLARIFICATION_REQUIRED" | "NO_RELEVANT_MEMORY" | "SAFE_MEMORY_SUMMARY";
  promptDirective: string;
  userFacingSummary?: string;
}

export interface MemoryRetrievalContext {
  formattedMemoryContext: string;
  injectedMemoriesCount: number;
  memories: Array<{
    id: string;
    key: string;
    value: string;
    type: MemoryType;
    source: MemorySource;
    confidence: number;
  }>;
}

export interface MemoryRetrievalExclusionStats {
  superseded: number;
  expired: number;
  sensitive: number;
  lowRelevance: number;
  duplicate: number;
  topicIsolated: number;
}

export interface MemoryConflictRecord {
  activeMemoryId: string;
  conflictingMemoryId: string;
  key: string;
  description: string;
}

export interface MemoryRetrievalAnalysis {
  query: MemoryRetrievalQuery;
  candidates: MemoryCandidate[];
  retrievedMemories: MemoryCandidate[];
  totalConsidered: number;
  totalRetrieved: number;
  isExplicitRequest: boolean;
  isBroadProfileQuery: boolean;
  requiresClarification: boolean;
  clarificationReason?: string;
  clarificationPrompt?: string;
  directives: string[];
  contextString: string;
  conflictsDetected: MemoryConflictRecord[];
  excludedCount: MemoryRetrievalExclusionStats;
  executionTimeMs?: number;
}

export interface MemoryRetrievalOptions {
  topK?: number;
  minRelevanceScore?: number;
  includeInferredCandidates?: boolean;
  allowedTypes?: MemoryType[];
  strictTopicIsolation?: boolean;
  now?: number;
}
