export type MemoryCategory =
  | 'identity'
  | 'preferences'
  | 'personality'
  | 'goals'
  | 'projects'
  | 'habits'
  | 'relationships'
  | 'life_events'
  | 'context';

export type MemoryStatus = 'active' | 'outdated' | 'archived';

export type MemorySource = 'explicit' | 'inferred' | 'manual';

export interface MemoryItem {
  id: string;
  userId: string;
  category: MemoryCategory;
  key: string;
  value: string;
  importance: number; // 0-100 (90-100: critical, 70-89: high, 40-69: useful, 20-39: temporary, 0-19: ignore)
  confidence: number; // 0.0 - 1.0
  source: MemorySource;
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number;
  accessCount: number;
  expiresAt?: number | null;
  status: MemoryStatus;
  previousValues?: Array<{
    value: string;
    changedAt: number;
    reason?: string;
  }>;
  tags?: string[];
}

export interface MemoryExtractionResult {
  memoriesToCreate: Array<{
    category: MemoryCategory;
    key: string;
    value: string;
    importance: number;
    confidence: number;
    source: MemorySource;
    tags?: string[];
  }>;
  memoriesToUpdate: Array<{
    id?: string;
    key: string;
    newValue: string;
    importance: number;
    confidence: number;
    reason: string;
  }>;
  memoriesToForget: Array<{
    keyOrTopic: string;
    reason: string;
  }>;
}

export interface MemoryFilterOptions {
  category?: MemoryCategory | 'all';
  searchQuery?: string;
  minImportance?: number;
  status?: MemoryStatus;
  sortBy?: 'importance' | 'recency' | 'accessCount' | 'confidence';
}

export interface MemoryContextResult {
  relevantMemories: MemoryItem[];
  formattedContext: string;
}
