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

    // 0. Explicit Pronoun Style Preference Command (TUI / TUMI / RESET)
    const pronounCheck = this.parsePronounCommand(raw);
    if (pronounCheck.isCommand && pronounCheck.preference) {
      return {
        isCommand: true,
        action: "explicit_remember",
        explicitCandidate: {
          category: "preferences",
          key: "pronoun_style",
          value: pronounCheck.preference,
          importance: 100,
          confidence: 1.0,
          tags: ["preference", "language_style", "pronoun_style"],
          naturalConfirmation: pronounCheck.acknowledgment || "Got it, I'll use that from now on!",
        },
      };
    }

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

  /**
   * Helper to evaluate explicit pronoun style preference commands
   */
  public parsePronounCommand(text: string): {
    isCommand: boolean;
    preference?: "tui" | "tumi";
    isReset?: boolean;
    acknowledgment?: string;
  } {
    const raw = (text || "").trim();
    if (!raw || raw.length < 3) return { isCommand: false };

    const clean = raw.toLowerCase().replace(/[।!?.,;:'"()\-–—]/g, " ").replace(/\s+/g, " ").trim();
    const isBangla = /[\u0980-\u09FF]/.test(raw);

    // 1. Explicit TUI Request Patterns (Bangla, Banglish, English)
    const tuiPatterns = [
      /(?:এখন\s*থেকে|আজ\s*থেকে|আজকে\s*থেকে|পরের\s*থেকে|এরপর\s*থেকে)?\s*(?:আমার\s*সাথে|আমার\s*লগে|আমাকে|আমারে)?\s*(?:tui|তুই)\s*করে\s*(?:কথা\s*)?(?:বলবি|বলিস|বল|বলো|বলবেন)/i,
      /\b(?:আমাকে|আমারে)\s*(?:এখন\s*থেকে|আজ\s*থেকে)?\s*(?:tui|তুই)\s*(?:করে\s*)?(?:বলিস|বলবি|বল|বলো)\b/i,
      /\b(?:tui|তুই)\s*করে\s*(?:কথা\s*)?(?:বলবি|বলিস|বল|বলো)\b/i,
      /\b(?:tui|তুই)\s*করে\s*(?:বলিস|বলবি|বল)\b/i,
      /(?:ekhon\s*theke|aj\s*theke|ajke\s*theke|porer\s*theke)?\s*(?:amar\s*sathe|amr\s*sathe|amar\s*shathe|amr\s*shathe|amake|amk|amare)?\s*tui\s*kore\s*(?:kotha\s*)?(?:bolbi|bolish|bolis|bol|bolo|bolben)/i,
      /\b(?:amake|amk|amare)\s*(?:ekhon\s*theke|aj\s*theke)?\s*tui\s*(?:kore\s*)?(?:bolish|bolbi|bol|bolo)\b/i,
      /\btui\s*kore\s*(?:kotha\s*)?(?:bolbi|bolish|bolis|bol|bolo)\b/i,
      /\btui\s*kore\s*(?:bolish|bolbi|bol)\b/i,
      /\b(?:call\s*me\s*tui|use\s*tui\s*(?:with\s*me|mode)?|speak\s*(?:with|to)\s*me\s*(?:in|using)\s*tui|talk\s*(?:to|with)\s*me\s*(?:in|using)\s*tui|switch\s*(?:to|into)\s*tui(?:\s*mode)?)\b/i,
    ];

    for (const pattern of tuiPatterns) {
      if (pattern.test(clean) || pattern.test(raw)) {
        return {
          isCommand: true,
          preference: "tui",
          isReset: false,
          acknowledgment: isBangla
            ? "আচ্ছা, ঠিক আছে 😭 এখন থেকে তুই করেই বলব।"
            : "Accha, thik ache 😭 ekhon theke tui korei bolbo.",
        };
      }
    }

    // 2. Explicit TUMI Request Patterns (Bangla, Banglish, English)
    const tumiPatterns = [
      /(?:এখন\s*থেকে|আজ\s*থেকে|আজকে\s*থেকে|পরের\s*থেকে|এরপর\s*থেকে)?\s*(?:আমার\s*সাথে|আমার\s*লগে|আমাকে|আমারে)?\s*(?:tumi|তুমি)\s*করে\s*(?:কথা\s*)?(?:বলবে|বলবা|বলো|বলিস|বল|বলবেন)/i,
      /\b(?:আমাকে|আমারে)\s*(?:এখন\s*থেকে|আজ\s*থেকে)?\s*(?:tumi|তুমি)\s*(?:করে\s*)?(?:বলবে|বলবা|বলো|বল)\b/i,
      /\b(?:tumi|তুমি)\s*করে\s*(?:কথা\s*)?(?:বলবে|বলবা|বলো|বল)\b/i,
      /\b(?:tumi|তুমি)\s*করে\s*(?:বলো|বলবে|বলবা|বল)\b/i,
      /(?:ekhon\s*theke|aj\s*theke|ajke\s*theke|porer\s*theke)?\s*(?:amar\s*sathe|amr\s*sathe|amar\s*shathe|amr\s*shathe|amake|amk|amare)?\s*tumi\s*kore\s*(?:kotha\s*)?(?:bolba|bolbe|bolo|bol|bolish|bolben)/i,
      /\b(?:amake|amk|amare)\s*(?:ekhon\s*theke|aj\s*theke)?\s*tumi\s*(?:kore\s*)?(?:bolba|bolbe|bolo|bol)\b/i,
      /\btumi\s*kore\s*(?:kotha\s*)?(?:bolba|bolbe|bolo|bol)\b/i,
      /\btumi\s*kore\s*(?:bolo|bolba|bolbe|bol)\b/i,
      /\b(?:call\s*me\s*tumi|use\s*tumi\s*(?:with\s*me|mode)?|speak\s*(?:with|to)\s*me\s*(?:in|using)\s*tumi|talk\s*(?:to|with)\s*me\s*(?:in|using)\s*tumi|switch\s*(?:to|into)\s*tumi(?:\s*mode)?)\b/i,
    ];

    for (const pattern of tumiPatterns) {
      if (pattern.test(clean) || pattern.test(raw)) {
        return {
          isCommand: true,
          preference: "tumi",
          isReset: false,
          acknowledgment: isBangla
            ? "আচ্ছা, ঠিক আছে। এখন থেকে তুমি করেই বলব।"
            : "Accha, thik ache. Ekhon theke tumi korei bolbo.",
        };
      }
    }

    // 3. Reset to Default Patterns
    const resetPatterns = [
      /\b(?:আগের\s*মতো\s*কথা\s*বলো|আগের\s*মতো\s*বলো|নরমাল\s*করে\s*কথা\s*বলো|normal\s*করে\s*কথা\s*বলো|ডিফল্ট\s*রাখো|default\s*রাখো)\b/i,
      /\b(?:ager\s*moto\s*kotha\s*bolo|ager\s*moto\s*bolo|normal\s*kore\s*kotha\s*bolo|normal\s*kore\s*bolo|default\s*rakho|reset\s*pronoun|reset\s*to\s*default|default\s*mode)\b/i,
    ];

    for (const pattern of resetPatterns) {
      if (pattern.test(clean) || pattern.test(raw)) {
        return {
          isCommand: true,
          preference: "tumi",
          isReset: true,
          acknowledgment: isBangla
            ? "আচ্ছা, আগের মতো নরমাল করেই বলছি।"
            : "Accha, ager moto normal korei bolchi.",
        };
      }
    }

    return { isCommand: false };
  }
}

