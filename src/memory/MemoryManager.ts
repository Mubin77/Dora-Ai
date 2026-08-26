import { MemoryStore } from "./MemoryStore";
import { MemoryRetriever } from "./MemoryRetriever";
import { MemoryExtractor } from "./MemoryExtractor";
import { MemoryPrivacyManager } from "./MemoryPrivacyManager";
import { MemoryItem, MemoryCategory, MemoryFilterOptions, MemoryContextResult, MemorySource } from "./types";

export class MemoryManager {
  private static instance: MemoryManager;
  private store: MemoryStore;
  private retriever: MemoryRetriever;
  private extractor: MemoryExtractor;
  private privacyManager: MemoryPrivacyManager;

  private constructor() {
    this.store = new MemoryStore();
    this.retriever = new MemoryRetriever(this.store);
    this.extractor = new MemoryExtractor(this.store);
    this.privacyManager = new MemoryPrivacyManager(this.store);
  }

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  public isEnabled(): boolean {
    return this.store.isMemoryEnabled();
  }

  public setEnabled(enabled: boolean): void {
    this.store.setMemoryEnabled(enabled);
  }

  public subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  /**
   * Retrieves relevant memory context for a query/turn.
   */
  public retrieve(queryText: string, maxMemories: number = 5): MemoryContextResult {
    return this.retriever.retrieveRelevantMemories(queryText, maxMemories);
  }

  /**
   * Generates a context injection string for Dora's system instruction.
   */
  public buildContext(queryText: string = ""): string {
    const { formattedContext } = this.retriever.retrieveRelevantMemories(queryText);
    return formattedContext;
  }

  /**
   * Retrieves active persistent pronoun preference ('tumi' or 'tui')
   */
  public getActivePronounPreference(): "tumi" | "tui" {
    const item = this.store.findByKey("pronoun_style", "preferences");
    if (item && (item.value === "tui" || item.value === "tumi")) {
      return item.value as "tumi" | "tui";
    }
    return "tumi";
  }

  /**
   * Stores persistent pronoun preference ('tumi' or 'tui')
   */
  public setPronounPreference(pref: "tumi" | "tui"): MemoryItem {
    return this.remember(
      "preferences",
      "pronoun_style",
      pref,
      100,
      1.0,
      "explicit",
      ["preference", "language_style", "pronoun_style"]
    );
  }

  /**
   * Adds or updates a memory in long-term storage.
   * Both manual settings and conversation memory write trigger this identical method.
   */
  public remember(
    category: MemoryCategory,
    key: string,
    value: string,
    importance: number = 80,
    confidence: number = 1.0,
    source: MemorySource = "manual",
    tags?: string[]
  ): MemoryItem {
    const existing = this.store.findByKey(key, category);
    if (existing) {
      const updated = this.store.update(existing.id, {
        value,
        importance: Math.max(existing.importance, importance),
        confidence: Math.max(existing.confidence, confidence),
        source,
        tags: tags || existing.tags,
      });
      return updated || existing;
    }

    return this.store.add({
      category,
      key,
      value,
      importance,
      confidence,
      source,
      status: "active",
      tags: tags || [category, source],
    });
  }

  /**
   * Updates an existing memory.
   */
  public update(id: string, updates: Partial<Omit<MemoryItem, "id" | "userId" | "createdAt">>): MemoryItem | null {
    return this.store.update(id, updates);
  }

  /**
   * Deletes a memory by ID.
   */
  public delete(id: string): boolean {
    return this.store.delete(id);
  }

  /**
   * Forgets a specific topic, keyword, or last saved item.
   */
  public forget(topic: string): { count: number; topicName: string } {
    return this.privacyManager.forgetTopic(topic);
  }

  /**
   * Clears all memories.
   */
  public clearAll(): void {
    this.privacyManager.forgetAll();
  }

  /**
   * Searches and filters stored memories.
   */
  public search(options: MemoryFilterOptions): MemoryItem[] {
    return this.store.filter(options);
  }

  /**
   * Returns all active memories.
   */
  public getAll(includeOutdated: boolean = false): MemoryItem[] {
    return this.store.getAll(includeOutdated);
  }

  /**
   * Returns total count of active memories in persistent storage.
   */
  public getTotalCount(): number {
    return this.store.getAll(false).length;
  }

  /**
   * Reloads persistent memory directly from storage.
   */
  public reload(): void {
    this.store.loadFromStorage();
  }

  /**
   * Helper to detect language style.
   */
  private detectLanguageStyle(text: string): "bengali" | "banglish" | "english" {
    if (/[\u0980-\u09FF]/.test(text)) return "bengali";
    const banglishWords = [
      "amar", "amr", "tumi", "tmi", "apni", "kemon", "acho", "achis", "mone", "rakhba", "rakhish", "rekho", "rakhben",
      "kotha", "eta", "koro", "korish", "bhalo", "valo", "shono", "accha", "acha", "thakbe", "rakhlam", "bolo", "bhule", "muche"
    ];
    const words = text.toLowerCase().split(/[\s,.:;!?_-]+/);
    if (words.some((w) => banglishWords.includes(w))) return "banglish";
    return "english";
  }

  /**
   * Check if a message is an explicit memory command and handles it with natural dialogue.
   */
  public checkAndHandleMemoryCommand(
    text: string
  ): { isCommand: boolean; replyText?: string } {
    const parsed = this.privacyManager.parseMemoryCommand(text);
    if (!parsed.isCommand) return { isCommand: false };

    const lang = this.detectLanguageStyle(text);

    // 1. Forget All
    if (parsed.action === "forget_all") {
      this.clearAll();
      let reply = "Got it. I've completely cleared all my stored long-term memories about you. Starting fresh! 🖤";
      if (lang === "bengali") {
        reply = "হুম, আমি আগের সব স্মৃতি মুছে ফেলেছি। নতুন করে শুরু করা যাক! 🖤";
      } else if (lang === "banglish") {
        reply = "Got it, shob memory clear kore diyechi. Fresh start! 🖤";
      }
      return {
        isCommand: true,
        replyText: reply,
      };
    }

    // 2. Forget specific topic or item
    if (parsed.action === "forget_topic" && parsed.payload) {
      const { count, topicName } = this.forget(parsed.payload);
      if (count > 0) {
        let reply = `Got it. I've forgotten ${topicName} for you. 🖤`;
        if (lang === "bengali") {
          reply = `আচ্ছা, এটা আমি আর মনে রাখবো না। 🖤`;
        } else if (lang === "banglish") {
          reply = `Accha, eta bhule gelam. 🖤`;
        }
        return {
          isCommand: true,
          replyText: reply,
        };
      } else {
        let reply = `No problem. I don't see any active memories stored about that.`;
        if (lang === "bengali") {
          reply = `এ বিষয়ে তো আমার কোনো স্মৃতি জমা নেই।`;
        } else if (lang === "banglish") {
          reply = `Eta niye amar kache kono saved memory nei.`;
        }
        return {
          isCommand: true,
          replyText: reply,
        };
      }
    }

    // 3. Query Dora's memories
    if (parsed.action === "query_memories") {
      const summary = this.privacyManager.getNaturalMemorySummary();
      return {
        isCommand: true,
        replyText: summary,
      };
    }

    // 4. Explicit Memory Write directly from natural conversation!
    if (parsed.action === "explicit_remember" && parsed.explicitCandidate) {
      if (!this.isEnabled()) {
        let reply = "My memory is currently turned off in settings, so I haven't saved that. You can turn it back on anytime! 🖤";
        if (lang === "bengali") {
          reply = "আমার মেমোরি সেটিংস থেকে বন্ধ করা আছে, তাই সেভ করতে পারিনি। তুমি চাইলে আবার অন করতে পারো! 🖤";
        } else if (lang === "banglish") {
          reply = "Amar memory settings e off kora, tai save hoyni. Chaile on kore nite paro! 🖤";
        }
        return {
          isCommand: true,
          replyText: reply,
        };
      }

      try {
        const cand = parsed.explicitCandidate;
        this.remember(
          cand.category,
          cand.key,
          cand.value,
          cand.importance,
          cand.confidence,
          "explicit",
          cand.tags
        );

        return {
          isCommand: true,
          replyText: cand.naturalConfirmation || "Yeah, got it. I'll remember that. 🖤",
        };
      } catch (err) {
        console.error("[MemoryManager] Persistent storage write failure:", err);
        return {
          isCommand: true,
          replyText: lang === "bengali" ? "একটু ঝামেলা হয়েছে, আবার বলবে?" : "Hmm, that didn't save properly. Let's try that again.",
        };
      }
    }

    return { isCommand: false };
  }

  /**
   * Non-blocking background extraction after a turn completes.
   */
  public processTurnBackground(userText: string, doraReply?: string): void {
    if (!this.isEnabled()) return;
    // Run asynchronously without awaiting
    setTimeout(() => {
      this.extractor.extractBackgroundMemories(userText, doraReply).catch((err) => {
        console.warn("[MemoryManager] Background turn processing error:", err);
      });
    }, 50);
  }
}

export const memoryManager = MemoryManager.getInstance();
