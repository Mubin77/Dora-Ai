import { MemoryItem, MemoryContextResult } from "./types";
import { MemoryStore } from "./MemoryStore";

export class MemoryRetriever {
  private store: MemoryStore;

  constructor(store: MemoryStore) {
    this.store = store;
  }

  /**
   * Retrieves and ranks the most relevant long-term memories for a given query or conversational context.
   */
  public retrieveRelevantMemories(
    queryText: string,
    maxMemories: number = 6
  ): MemoryContextResult {
    if (!this.store.isMemoryEnabled()) {
      return { relevantMemories: [], formattedContext: "" };
    }

    const allMemories = this.store.getAll(false);
    if (allMemories.length === 0) {
      return { relevantMemories: [], formattedContext: "" };
    }

    const ranked = this.rankMemories(queryText, allMemories);
    const topMemories = ranked.slice(0, maxMemories);

    // Record access for top selected memories
    for (const mem of topMemories) {
      this.store.recordAccess(mem.id);
    }

    const formattedContext = this.buildContextString(topMemories);
    return {
      relevantMemories: topMemories,
      formattedContext,
    };
  }

  /**
   * Fast token-based and semantic scoring
   */
  private rankMemories(queryText: string, memories: MemoryItem[]): MemoryItem[] {
    const queryLower = (queryText || "").toLowerCase();
    const queryTokens = new Set(
      queryLower
        .replace(/[^\w\s\u0980-\u09FF]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );

    const scored = memories.map((mem) => {
      let score = 0;

      // 1. Identity & Critical Profile facts get high baseline relevance
      if (mem.category === "identity") {
        score += 35;
      }

      // 2. Token Matching (Query vs Key, Value, Tags)
      const keyNormalized = mem.key.toLowerCase().replace(/[_\s]+/g, " ");
      const keyWords = mem.key.toLowerCase().split(/[_\s]+/);
      const valWords = mem.value.toLowerCase().split(/\s+/);
      const tags = (mem.tags || []).map((t) => t.toLowerCase());

      let matches = 0;
      for (const token of queryTokens) {
        if (keyWords.includes(token)) matches += 3;
        if (valWords.some((vw) => vw.includes(token))) matches += 2;
        if (tags.includes(token)) matches += 2.5;
        if (queryLower.includes(token)) matches += 1;
      }

      // Exact phrase match on key or value
      if (queryLower.includes(keyNormalized) || queryLower.includes(mem.key.toLowerCase())) {
        matches += 5;
      }
      if (queryLower.includes(mem.value.toLowerCase())) {
        matches += 4;
      }

      const matchScore = Math.min(matches * 15, 75);
      score += matchScore;

      // 3. Importance weighting (0 - 100 scaled to 0 - 25)
      score += (mem.importance / 100) * 25;

      // 4. Confidence weighting (0.0 - 1.0 scaled to 0 - 15)
      score += mem.confidence * 15;

      // 5. Recency boost (up to 10 points for updated/accessed in past 7 days)
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const ageMs = Date.now() - mem.updatedAt;
      if (ageMs < sevenDaysMs) {
        score += (1 - ageMs / sevenDaysMs) * 10;
      }

      // 6. Access count boost (up to 5 points)
      score += Math.min((mem.accessCount || 0) * 0.5, 5);

      return { mem, score };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    return scored.map((s) => s.mem);
  }

  /**
   * Formats retrieved memories into a conversational context directive for Dora.
   */
  public buildContextString(memories: MemoryItem[]): string {
    if (!memories || memories.length === 0) return "";

    const lines = memories.map((m) => {
      return `- [${m.category.toUpperCase()}] ${m.key}: ${m.value}`;
    });

    return `
---
[DORA'S LONG-TERM KNOWLEDGE ABOUT THE USER]
(Use this background knowledge naturally and subtly when relevant. Never recite records or database keys like a robot; integrate like a close friend who genuinely remembers):
${lines.join("\n")}
---`.trim();
  }
}
