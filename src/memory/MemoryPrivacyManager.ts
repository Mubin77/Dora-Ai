import { MemoryStore } from "./MemoryStore";
import { MemoryExtractor, ExplicitMemoryCandidate } from "./MemoryExtractor";
import { MemoryItem } from "./types";

export class MemoryPrivacyManager {
  private store: MemoryStore;
  private extractor: MemoryExtractor;

  constructor(store: MemoryStore) {
    this.store = store;
    this.extractor = new MemoryExtractor(store);
  }

  /**
   * Checks if user message is a memory control, privacy, query, or explicit remember command.
   */
  public parseMemoryCommand(
    text: string
  ): {
    isCommand: boolean;
    action?: 'forget_all' | 'forget_topic' | 'query_memories' | 'explicit_remember';
    payload?: string;
    explicitCandidate?: ExplicitMemoryCandidate;
  } {
    const raw = text.trim();
    if (!raw) return { isCommand: false };

    let clean = raw.toLowerCase();

    // Strip optional leading address ("Dora, ", "Hey Dora: ", etc.)
    clean = clean.replace(/^(?:hey|yo|hi|hello|listen|ok|okay)?\s*dora[,\s:!-]+/, "").trim();

    // 1. Forget All / Delete All
    if (
      clean === "forget everything about me" ||
      clean === "forget everything" ||
      clean === "delete all my memories" ||
      clean === "delete all memories" ||
      clean === "delete my memories" ||
      clean === "clear all memories" ||
      clean === "delete everything you remember about me" ||
      clean === "delete everything you remember" ||
      clean === "reset memories" ||
      clean === "reset all memories" ||
      clean.includes("delete all memories") ||
      clean.includes("forget everything about me") ||
      clean.includes("delete all my memories")
    ) {
      return { isCommand: true, action: "forget_all" };
    }

    // 2. Query what Dora remembers
    if (
      clean === "what do you remember about me?" ||
      clean === "what do you remember about me" ||
      clean === "what do you know about me?" ||
      clean === "what do you know about me" ||
      clean === "what is in your memory?" ||
      clean === "what's in your memory?" ||
      clean === "show my memories" ||
      clean.includes("what do you remember about me") ||
      clean.includes("what you remember about me") ||
      clean.includes("what do you know about me")
    ) {
      return { isCommand: true, action: "query_memories" };
    }

    // 3. Forget specific topic or item
    const forgetPrefixes = [
      "forget what i just said",
      "forget what i said about",
      "forget what i told you about",
      "don't remember this anymore",
      "dont remember this anymore",
      "don't remember this",
      "dont remember this",
      "stop remembering",
      "delete memory about",
      "delete memory of",
      "delete my memory of",
      "forget that",
      "forget my",
      "forget about",
      "forget",
    ];

    for (const prefix of forgetPrefixes) {
      if (clean.startsWith(prefix)) {
        let topic = clean.slice(prefix.length).trim().replace(/^[:\-\s]+/, "").replace(/[.!?]+$/, "");
        if (!topic && (prefix === "forget that" || prefix === "forget" || prefix.includes("just said") || prefix.includes("this"))) {
          topic = "recent";
        }
        if (topic) {
          return { isCommand: true, action: "forget_topic", payload: topic };
        }
      }
    }

    // 4. Explicit Memory Extraction Check (e.g. "Remember that my favorite color is black")
    const explicitCandidate = this.extractor.extractExplicitRemember(raw);
    if (explicitCandidate) {
      return {
        isCommand: true,
        action: "explicit_remember",
        explicitCandidate,
      };
    }

    return { isCommand: false };
  }

  /**
   * Forgets a specific topic, key, or recent item
   */
  public forgetTopic(topic: string): { count: number; topicName: string } {
    const all = this.store.getAll(true);
    let deletedCount = 0;
    const cleanTopic = topic.toLowerCase().trim().replace(/^my\s+/, "");

    if (cleanTopic === "" || cleanTopic === "that" || cleanTopic === "recent" || cleanTopic === "this" || cleanTopic === "it") {
      // Forget most recently added/updated memory
      if (all.length > 0) {
        const latest = [...all].sort((a, b) => b.updatedAt - a.updatedAt)[0];
        if (latest) {
          const name = latest.key.replace(/_/g, " ");
          this.store.delete(latest.id);
          return { count: 1, topicName: name };
        }
      }
      return { count: 0, topicName: "recent note" };
    }

    const normalizedTopic = cleanTopic.replace(/\s+/g, "_");
    const matchedNames: string[] = [];

    for (const mem of all) {
      const keyNorm = mem.key.toLowerCase();
      const valNorm = mem.value.toLowerCase();
      const catNorm = mem.category.toLowerCase();
      const tags = (mem.tags || []).map((t) => t.toLowerCase());

      if (
        keyNorm === normalizedTopic ||
        keyNorm.includes(normalizedTopic) ||
        keyNorm.includes(cleanTopic) ||
        valNorm.includes(cleanTopic) ||
        catNorm.includes(cleanTopic) ||
        tags.includes(cleanTopic)
      ) {
        matchedNames.push(mem.key.replace(/_/g, " "));
        this.store.delete(mem.id);
        deletedCount++;
      }
    }

    return {
      count: deletedCount,
      topicName: matchedNames[0] || cleanTopic,
    };
  }

  /**
   * Forgets everything
   */
  public forgetAll(): void {
    this.store.clearAll();
  }

  /**
   * Formats a natural spoken summary of what Dora remembers for conversational playback
   */
  public getNaturalMemorySummary(): string {
    const memories = this.store.getAll(false);
    if (memories.length === 0) {
      return "I don't have any saved personal memories stored right now. We're starting with a completely fresh slate! 🖤";
    }

    // Group items nicely
    const items = memories.slice(0, 4).map((m) => {
      const readableKey = m.key.replace(/_/g, " ");
      return `${readableKey}: ${m.value}`;
    });

    return `Here's what I have stored in my long-term memory: ${items.join(", ")}. You can tell me to forget anything anytime! 🖤`;
  }
}

