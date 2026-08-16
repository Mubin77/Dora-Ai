import { MemoryItem, MemoryCategory, MemoryStatus, MemoryFilterOptions } from "./types";

const STORAGE_PREFIX = "dora_memories_v2_";
const MEMORY_ENABLED_KEY = "dora_memory_enabled";
const DEFAULT_USER_ID = "default_user";

export class MemoryStore {
  private userId: string;
  private memories: Map<string, MemoryItem> = new Map();
  private listeners: Set<() => void> = new Set();
  private isEnabled: boolean = true;

  constructor(userId: string = DEFAULT_USER_ID) {
    this.userId = userId;
    this.loadFromStorage();

    // Multi-tab and window storage synchronization
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("storage", (event) => {
        if (event.key === this.getStorageKey() || event.key === MEMORY_ENABLED_KEY) {
          this.loadFromStorage();
          this.notifyListeners();
        }
      });
    }
  }

  public setUserId(userId: string): void {
    if (this.userId !== userId) {
      this.userId = userId;
      this.loadFromStorage();
      this.notifyListeners();
    }
  }

  public getUserId(): string {
    return this.userId;
  }

  public isMemoryEnabled(): boolean {
    return this.isEnabled;
  }

  public setMemoryEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    try {
      localStorage.setItem(MEMORY_ENABLED_KEY, JSON.stringify(enabled));
    } catch (_) {}
    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.warn("[MemoryStore] Listener error:", err);
      }
    });
  }

  private getStorageKey(): string {
    return `${STORAGE_PREFIX}${this.userId}`;
  }

  public loadFromStorage(): void {
    this.memories.clear();
    try {
      if (typeof window === "undefined" || typeof localStorage === "undefined") {
        return;
      }
      const enabledVal = localStorage.getItem(MEMORY_ENABLED_KEY);
      if (enabledVal !== null) {
        this.isEnabled = JSON.parse(enabledVal);
      }

      let raw = localStorage.getItem(this.getStorageKey());

      // Fallback migration check for any previous keys
      if (!raw) {
        const legacyKeys = [
          `dora_memories_${this.userId}`,
          "dora_memories",
          "dora_user_memories",
          "dora_long_term_memories",
          `dora_memories_v1_${this.userId}`,
        ];
        for (const k of legacyKeys) {
          const legacyRaw = localStorage.getItem(k);
          if (legacyRaw) {
            try {
              const testParsed = JSON.parse(legacyRaw);
              if (Array.isArray(testParsed) && testParsed.length > 0) {
                raw = legacyRaw;
                // Migrate to current primary storage key
                localStorage.setItem(this.getStorageKey(), legacyRaw);
                break;
              }
            } catch (_) {}
          }
        }
      }

      if (raw) {
        const parsed: MemoryItem[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item.id) {
              this.memories.set(item.id, item);
            }
          }
        }
      }
    } catch (err) {
      console.warn("[MemoryStore] Failed to load memories from localStorage:", err);
    }
  }

  public saveToStorage(): void {
    try {
      if (typeof window === "undefined" || typeof localStorage === "undefined") {
        return;
      }
      const items = Array.from(this.memories.values());
      localStorage.setItem(this.getStorageKey(), JSON.stringify(items));
      this.notifyListeners();
    } catch (err) {
      console.warn("[MemoryStore] Failed to save memories to localStorage:", err);
    }
  }

  public getAll(includeOutdated = false): MemoryItem[] {
    if (this.memories.size === 0) {
      this.loadFromStorage();
    }
    const items = Array.from(this.memories.values());
    if (!includeOutdated) {
      return items.filter((m) => m.status === "active");
    }
    return items;
  }

  public getById(id: string): MemoryItem | undefined {
    if (this.memories.size === 0) {
      this.loadFromStorage();
    }
    return this.memories.get(id);
  }

  public findByKey(key: string, category?: MemoryCategory): MemoryItem | undefined {
    if (this.memories.size === 0) {
      this.loadFromStorage();
    }
    const normalizedKey = key.trim().toLowerCase().replace(/[_\s]+/g, " ");
    for (const item of this.memories.values()) {
      const itemKey = item.key.trim().toLowerCase().replace(/[_\s]+/g, " ");
      if (item.status === "active" && itemKey === normalizedKey) {
        if (!category || item.category === category) {
          return item;
        }
      }
    }
    return undefined;
  }

  public add(item: Omit<MemoryItem, "id" | "userId" | "createdAt" | "updatedAt" | "lastUsedAt" | "accessCount">): MemoryItem {
    const now = Date.now();
    const id = `mem_${now}_${Math.random().toString(36).substring(2, 9)}`;

    const newMemory: MemoryItem = {
      ...item,
      id,
      userId: this.userId,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
      accessCount: 0,
      status: item.status || "active",
    };

    this.memories.set(id, newMemory);
    this.saveToStorage();
    return newMemory;
  }

  public update(id: string, updates: Partial<Omit<MemoryItem, "id" | "userId" | "createdAt">>): MemoryItem | null {
    const existing = this.memories.get(id);
    if (!existing) return null;

    const previousValues = existing.previousValues ? [...existing.previousValues] : [];
    if (updates.value && updates.value !== existing.value) {
      previousValues.push({
        value: existing.value,
        changedAt: Date.now(),
        reason: (updates as any).changeReason || "Value updated",
      });
    }

    const updated: MemoryItem = {
      ...existing,
      ...updates,
      previousValues,
      updatedAt: Date.now(),
    };

    this.memories.set(id, updated);
    this.saveToStorage();
    return updated;
  }

  public recordAccess(id: string): void {
    const memory = this.memories.get(id);
    if (memory) {
      memory.lastUsedAt = Date.now();
      memory.accessCount = (memory.accessCount || 0) + 1;
      this.memories.set(id, memory);
      // Debounce saving
      this.saveToStorage();
    }
  }

  public delete(id: string): boolean {
    if (this.memories.has(id)) {
      this.memories.delete(id);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  public clearAll(): void {
    this.memories.clear();
    this.saveToStorage();
  }

  public filter(options: MemoryFilterOptions): MemoryItem[] {
    if (this.memories.size === 0) {
      this.loadFromStorage();
    }
    let list = Array.from(this.memories.values());

    if (options.status) {
      list = list.filter((m) => m.status === options.status);
    } else {
      list = list.filter((m) => m.status === "active");
    }

    if (options.category && options.category !== "all") {
      list = list.filter((m) => m.category === options.category);
    }

    if (options.minImportance !== undefined) {
      list = list.filter((m) => m.importance >= options.minImportance!);
    }

    if (options.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.key.toLowerCase().includes(q) ||
          m.value.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          (m.tags && m.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    // Sort
    const sortBy = options.sortBy || "importance";
    list.sort((a, b) => {
      if (sortBy === "importance") {
        return b.importance - a.importance || b.updatedAt - a.updatedAt;
      }
      if (sortBy === "recency") {
        return b.updatedAt - a.updatedAt;
      }
      if (sortBy === "accessCount") {
        return (b.accessCount || 0) - (a.accessCount || 0);
      }
      if (sortBy === "confidence") {
        return b.confidence - a.confidence;
      }
      return 0;
    });

    return list;
  }
}
