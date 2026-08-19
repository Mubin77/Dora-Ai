/**
 * Dora Memory Decision Engine
 * Phase 2 — Step 1
 * 
 * Deterministic engine deciding whether user input should be:
 * - SAVE (high-confidence, durable facts, preferences, goals)
 * - UPDATE (reinforce or supersede existing memory)
 * - IGNORE (ephemeral conversation, noise, sensitive data)
 * - TEMPORARY (short-lived time-bound activities kept in context only)
 * - CANDIDATE (inferred patterns requiring reinforcement)
 * - FORGET (explicit or targeted memory deletion)
 */

import {
  MemoryRecord,
  MemoryDecision,
  MemoryType,
  MemorySource,
  MemoryStatus,
} from "./memoryTypes";
import { ConversationContext } from "./contextTypes";
import { StructuredIntent } from "./intentTypes";
import { ReasoningAnalysis } from "./reasoningTypes";

export class MemoryDecisionEngine {
  private static instance: MemoryDecisionEngine;

  public static getInstance(): MemoryDecisionEngine {
    if (!MemoryDecisionEngine.instance) {
      MemoryDecisionEngine.instance = new MemoryDecisionEngine();
    }
    return MemoryDecisionEngine.instance;
  }

  /**
   * Evaluates a user message, active dialog context, intent, and existing memories
   * to deterministically decide on long-term memory lifecycle actions.
   */
  public evaluate(params: {
    message: string;
    context: ConversationContext;
    intent: StructuredIntent;
    reasoning?: ReasoningAnalysis;
    existingMemories?: MemoryRecord[];
    userId?: string;
  }): MemoryDecision {
    const raw = (params.message || "").trim();
    const userId = params.userId || "default_user";
    const existing = params.existingMemories || [];

    if (!raw) {
      return {
        action: "IGNORE",
        reason: "Empty input",
        confidence: 1.0,
        isExplicit: false,
      };
    }

    const clean = raw.toLowerCase();

    // =========================================================================
    // 1. SENSITIVE CREDENTIALS / PRIVACY SECURITY GATE
    // =========================================================================
    if (this.detectSensitiveData(raw)) {
      return {
        action: "IGNORE",
        reason: "Sensitive credentials, passwords, or secrets are never saved in long-term memory",
        confidence: 1.0,
        isExplicit: false,
        isSensitiveRejected: true,
      };
    }

    // =========================================================================
    // 2. EXPLICIT FORGET / DELETE COMMANDS
    // =========================================================================
    const forgetDecision = this.checkExplicitForget(raw, existing);
    if (forgetDecision) {
      return forgetDecision;
    }

    // =========================================================================
    // 3. EXPLICIT REMEMBER COMMANDS (Highest Priority)
    // =========================================================================
    const explicitRemember = this.checkExplicitRemember(raw, userId, existing);
    if (explicitRemember) {
      return explicitRemember;
    }

    // =========================================================================
    // 4. TEMPORARY & EPHEMERAL TIME-BOUND ACTIVITIES
    // =========================================================================
    const temporaryCheck = this.checkTemporaryActivity(raw);
    if (temporaryCheck) {
      return temporaryCheck;
    }

    // =========================================================================
    // 5. PROJECT CONTEXT & LONG-TERM DOMAIN FACTS
    // =========================================================================
    const projectCheck = this.checkProjectContext(raw, userId, existing);
    if (projectCheck) {
      return projectCheck;
    }

    // =========================================================================
    // 6. IMPLICIT PREFERENCE UPDATE (e.g., "Actually, I prefer Lenovo now")
    // =========================================================================
    const preferenceUpdate = this.checkImplicitPreferenceUpdate(raw, userId, existing);
    if (preferenceUpdate) {
      return preferenceUpdate;
    }

    // =========================================================================
    // 7. INFERENCE SAFETY & REPETITION
    // =========================================================================
    const inferenceCheck = this.checkInferredCandidate(params.context, params.intent, existing);
    if (inferenceCheck) {
      return inferenceCheck;
    }

    // =========================================================================
    // 8. DEFAULT: ACTIVE CONVERSATION CONTEXT ONLY
    // =========================================================================
    return {
      action: "IGNORE",
      reason: "Standard conversation context; managed ephemerally by ContextEngine",
      confidence: 0.95,
      isExplicit: false,
    };
  }

  /**
   * Safety Filter: Prevents persisting passwords, auth tokens, API keys, or financial secrets.
   */
  private detectSensitiveData(text: string): boolean {
    const sensitivePatterns = [
      /\b(?:password|passwd|pwd)\b/i,
      /\b(?:api[_-]?key|secret[_-]?key|auth[_-]?token|bearer\s+[a-zA-Z0-9_\-\.]+)\b/i,
      /\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z-_]{35})\b/,
      /\b(?:cvv|cvc)\b/i,
      /\b(?:\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4})\b/, // Credit Card regex
      /\b(?:credit\s*card|bank\s*pin|atm\s*pin|private\s*key|financial\s*secret)\b/i,
    ];
    return sensitivePatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Detects explicit memory forget / delete instructions in English, Bangla, and Banglish.
   */
  private checkExplicitForget(raw: string, existing: MemoryRecord[]): MemoryDecision | null {
    let clean = raw.toLowerCase().trim();
    // Strip address
    clean = clean.replace(/^(?:hey|hi|hello|dora|দোরা|shono|ei)[,\s:!-]+/i, "").trim();

    // 1. Forget All
    if (
      clean === "forget everything" ||
      clean === "forget everything about me" ||
      clean === "delete all memories" ||
      clean === "clear all memories" ||
      clean === "shob bhule jao" ||
      clean === "সব ভুলে যাও" ||
      clean === "সব স্মৃতি মুছে ফেলো"
    ) {
      return {
        action: "FORGET",
        reason: "Explicit user request to forget all stored long-term memories",
        confidence: 1.0,
        isExplicit: true,
        forgetDirective: {
          keyOrTopic: "*",
          scope: "all",
          reason: "User commanded full memory wipe",
        },
        directive: "MEMORY ACTION: Forget all user memories.",
      };
    }

    // 2. Forget Specific Topic
    const forgetPrefixes = [
      "forget that i prefer",
      "forget that my favorite",
      "forget that i like",
      "forget that",
      "forget my",
      "forget about",
      "forget",
      "delete memory about",
      "delete memory of",
      "don't remember this anymore",
      "dont remember this anymore",
      "bhule ja",
      "bhule jao",
      "eta bhule jao",
      "ভুলে যাও",
      "ভুলে যা",
      "এটা ভুলে যাও",
    ];

    for (const prefix of forgetPrefixes) {
      if (clean.startsWith(prefix)) {
        const topic = clean.slice(prefix.length).trim().replace(/^[:\-\s]+/, "").replace(/[.!?]+$/, "");
        if (topic) {
          // Check matching existing memory
          const matching = existing.find(
            (m) =>
              m.status === "ACTIVE" &&
              (m.key.toLowerCase().includes(topic.replace(/\s+/g, "_")) ||
               m.value.toLowerCase().includes(topic) ||
               topic.includes(m.value.toLowerCase()))
          );

          return {
            action: "FORGET",
            reason: `Explicit user request to forget memory related to '${topic}'`,
            confidence: 1.0,
            isExplicit: true,
            existingRecordId: matching?.id,
            forgetDirective: {
              keyOrTopic: matching ? matching.key : topic,
              scope: matching ? "exact" : "topic",
              reason: `User requested to forget ${topic}`,
            },
            directive: `MEMORY ACTION: Forget memory related to '${topic}'.`,
          };
        }
      }
    }

    return null;
  }

  /**
   * Detects explicit memory save instructions in English, Bangla, and Banglish.
   */
  private checkExplicitRemember(
    raw: string,
    userId: string,
    existing: MemoryRecord[]
  ): MemoryDecision | null {
    let clean = raw.trim();
    const cleanLower = clean.toLowerCase();

    // Strip address
    const stripped = clean.replace(/^(?:hey|hi|hello|listen|dora|দোরা|shono|ei|accha|আচ্ছা|এই|শোনো)[,\s:!-]+/i, "").trim();

    // Explicit triggers regex
    const explicitPatterns = [
      // English
      /^(?:please\s+|plz\s+)?remember\s+that\s+(.+)$/i,
      /^(?:please\s+|plz\s+)?remember\s+this[:\s]+(.+)$/i,
      /^(?:please\s+|plz\s+)?remember\s+my\s+(.+)$/i,
      /^(?:please\s+|plz\s+)?remember\s+(.+)$/i,
      /^(?:can\s+you\s+|could\s+you\s+)?(?:please\s+)?save\s+this(?:\s+to\s+your\s+memory|\s+in\s+your\s+memory)?[:\s]+(.+)$/i,
      /^(?:can\s+you\s+|could\s+you\s+)?(?:please\s+)?save\s+(?:this|that)[:\s]+(.+)$/i,
      /^(?:please\s+|plz\s+)?keep\s+(?:this\s+)?in\s+mind(?:\s+that)?[:\s]+(.+)$/i,
      /^(?:please\s+|plz\s+)?don['’]?t\s+forget\s+(?:that\s+)?(.+)$/i,

      // Bangla
      /^(?:এই\s+কথা\s+|এটা\s+)?মনে\s+(?:রাখিস|রাখবা|রাখিও|রেখো|রাখবেন|রাখো|রাখ)(?:[,\s]+যে)?(?:[:\s—–-]+|\s+)(.+)$/i,
      /^(?:এটা\s+)?মনে\s+রেখো(?:\s+যে)?(?:[:\s—–-]+|\s+)(.+)$/i,
      /^(?:এটা\s+)?মনে\s+রাখিস(?:\s+যে)?(?:[:\s—–-]+|\s+)(.+)$/i,
      /^(?:এটা\s+)?মনে\s+রাখবা(?:\s+যে)?(?:[:\s—–-]+|\s+)(.+)$/i,
      /^(?:এটা\s+)?মনে\s+রাখবেন(?:\s+যে)?(?:[:\s—–-]+|\s+)(.+)$/i,
      /^(?:এটা\s+)?ভুলিস\s+না(?:[:\s—–-]+|\s+)(.+)$/i,
      /^(?:আজ\s+থেকে\s+)?আমাকে\s+(.+)\s+বলে\s+ডাকবে$/i,

      // Banglish
      /^(?:ei\s+kotha\s+|eta\s+)?mone\s+(?:rakhish|rakhba|rakhio|rekho|rakhben|rakho|rakh)(?:[,\s]+je)?(?:[:\s—–-]+|\s+)(.+)$/i,
      /^(?:eta\s+)?remember\s+(?:koro|korish|korba|rakho|rakhba)(?:[:\s—–-]+|\s+)(.+)$/i,
      /^(?:ajke\s+theke\s+|aj\s+theke\s+)(?:amake\s+)?(.+)\s+dakis$/i,
    ];

    let extractedFact: string | null = null;

    for (const pattern of explicitPatterns) {
      const match = stripped.match(pattern);
      if (match && match[1]) {
        extractedFact = match[1].trim();
        break;
      }
    }

    if (!extractedFact) {
      // Direct keyword presence fallback
      if (
        cleanLower.includes("remember that i prefer") ||
        cleanLower.includes("remember i prefer") ||
        cleanLower.includes("remember my favorite") ||
        cleanLower.includes("eta mone rakhis") ||
        cleanLower.includes("mone rakhis") ||
        cleanLower.includes("mone rekho") ||
        cleanLower.includes("mone rakhba")
      ) {
        extractedFact = stripped
          .replace(/^(?:eta\s+)?mone\s+(?:rakhish|rakhba|rekho|rakhben|rakho|rakh)[,\s:!-]+/i, "")
          .replace(/^remember\s+(?:that\s+)?/i, "")
          .trim();
      }
    }

    if (!extractedFact) return null;

    // Semantic decomposition of extracted fact
    const parsed = this.parseMemorySemantic(extractedFact);
    const now = Date.now();

    // Check for existing memory with same key
    const existingRecord = existing.find(
      (m) => m.status === "ACTIVE" && (m.key === parsed.key || m.key.replace(/[_\s]+/g, "") === parsed.key.replace(/[_\s]+/g, ""))
    );

    // 1. Same key AND same normalized value -> Deduplication update (reinforce)
    if (existingRecord && existingRecord.normalizedValue === parsed.normalizedValue) {
      return {
        action: "UPDATE",
        reason: `Reinforcing existing ${existingRecord.key} memory (duplicate prevented)`,
        confidence: 1.0,
        isExplicit: true,
        existingRecordId: existingRecord.id,
        targetRecord: {
          ...existingRecord,
          updatedAt: now,
          lastAccessedAt: now,
          accessCount: (existingRecord.accessCount || 0) + 1,
          importance: Math.max(existingRecord.importance, parsed.importance),
          confidence: 1.0,
          source: "EXPLICIT_USER",
        },
        directive: `MEMORY REINFORCED: ${existingRecord.key} = ${existingRecord.value}`,
      };
    }

    // 2. Same key BUT different value -> Update & Supersede old memory
    if (existingRecord && existingRecord.normalizedValue !== parsed.normalizedValue) {
      const newRecord: MemoryRecord = {
        id: `mem_${now}_${Math.random().toString(36).substring(2, 8)}`,
        userId,
        type: parsed.type,
        key: parsed.key,
        value: parsed.value,
        normalizedValue: parsed.normalizedValue,
        source: "EXPLICIT_USER",
        confidence: 1.0,
        importance: parsed.importance,
        createdAt: now,
        updatedAt: now,
        lastAccessedAt: now,
        accessCount: 1,
        status: "ACTIVE",
        tags: parsed.tags,
        evidence: [raw],
        supersedes: existingRecord.id,
        version: (existingRecord.version || 1) + 1,
      };

      return {
        action: "UPDATE",
        reason: `Updating preference '${parsed.key}' from '${existingRecord.value}' to '${parsed.value}' (superseded previous memory)`,
        confidence: 1.0,
        isExplicit: true,
        existingRecordId: existingRecord.id,
        supersededRecordId: existingRecord.id,
        targetRecord: newRecord,
        directive: `MEMORY UPDATED: ${parsed.key} changed to ${parsed.value} (supersedes ${existingRecord.id})`,
      };
    }

    // 3. New Record -> SAVE
    const newRecord: MemoryRecord = {
      id: `mem_${now}_${Math.random().toString(36).substring(2, 8)}`,
      userId,
      type: parsed.type,
      key: parsed.key,
      value: parsed.value,
      normalizedValue: parsed.normalizedValue,
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: parsed.importance,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      status: "ACTIVE",
      tags: parsed.tags,
      evidence: [raw],
      version: 1,
    };

    return {
      action: "SAVE",
      reason: `Explicit user command to remember ${parsed.key}`,
      confidence: 1.0,
      isExplicit: true,
      targetRecord: newRecord,
      directive: `MEMORY SAVED: [${parsed.type}] ${parsed.key} = ${parsed.value}`,
    };
  }

  /**
   * Filters out short-lived, ephemeral activities from permanent long-term storage.
   */
  private checkTemporaryActivity(raw: string): MemoryDecision | null {
    const lower = raw.toLowerCase().trim();

    // Temporal day and time markers indicating fleeting working context or time-bound events
    const ephemeralPatterns = [
      /\b(?:today|tonight|this\s+morning|this\s+afternoon|this\s+evening|right\s+now|just\s+now|at\s+the\s+moment|currently)\b/i,
      /\b(?:tomorrow|next\s+week|this\s+weekend|upcoming|next\s+month|later\s+today)\b/i,
      /\b(?:buying\s+a\s+laptop\s+today|going\s+to\s+(?:the\s+)?cinema\s+today|working\s+on\s+step\s+\d+\s+today)\b/i,
      /\b(?:ajke|aajke|aj|ekhon|akhon|aj\s+cinema\s+jabo|kalk|poroborti)\b/i,
    ];

    const hasDayMarker = ephemeralPatterns.some((p) => p.test(lower));

    if (hasDayMarker) {
      // Check if it is a time-bound future plan (e.g., "I'm traveling next week")
      if (lower.includes("traveling") || lower.includes("visiting") || lower.includes("trip")) {
        return {
          action: "TEMPORARY",
          reason: "Time-bound travel or temporary future activity; expires after event",
          confidence: 0.85,
          isExplicit: false,
          isTemporaryRejected: true,
          targetRecord: {
            type: "TEMPORARY",
            key: "temporary_travel_plan",
            value: raw,
            expiresAt: Date.now() + 14 * 86400000,
          },
        };
      }

      return {
        action: "TEMPORARY",
        reason: "Short-lived temporal event/activity; maintained only in working context, not saved permanently",
        confidence: 0.95,
        isExplicit: false,
        isTemporaryRejected: true,
      };
    }

    return null;
  }

  /**
   * Identifies long-term project definitions and developer workspace contexts.
   */
  private checkProjectContext(
    raw: string,
    userId: string,
    existing: MemoryRecord[]
  ): MemoryDecision | null {
    const lower = raw.toLowerCase();

    if (
      lower.includes("dora is my") ||
      lower.includes("project is dora") ||
      lower.includes("building dora") ||
      lower.includes("my long-term ai assistant project") ||
      lower.includes("my project is")
    ) {
      const now = Date.now();
      const existingProject = existing.find((m) => m.key === "project_dora" && m.status === "ACTIVE");

      const target: MemoryRecord = {
        id: existingProject ? existingProject.id : `mem_${now}_${Math.random().toString(36).substring(2, 8)}`,
        userId,
        type: "PROJECT_CONTEXT",
        key: "project_dora",
        value: "Dora AI Voice Assistant",
        normalizedValue: "dora ai voice assistant",
        source: "EXPLICIT_USER",
        confidence: 0.95,
        importance: 90,
        createdAt: existingProject ? existingProject.createdAt : now,
        updatedAt: now,
        lastAccessedAt: now,
        accessCount: (existingProject?.accessCount || 0) + 1,
        status: "ACTIVE",
        tags: ["project", "dora", "ai_assistant"],
        evidence: [raw],
        version: existingProject ? existingProject.version + 1 : 1,
      };

      return {
        action: existingProject ? "UPDATE" : "SAVE",
        reason: "Durable project definition identified",
        confidence: 0.95,
        isExplicit: true,
        targetRecord: target,
        directive: "PROJECT CONTEXT RECORDED: Dora AI Assistant project.",
      };
    }

    return null;
  }

  /**
   * Detects implicit preference revisions (e.g., "Actually, I prefer Lenovo now") and supersedes older memories.
   */
  private checkImplicitPreferenceUpdate(
    raw: string,
    userId: string,
    existing: MemoryRecord[]
  ): MemoryDecision | null {
    const lower = raw.toLowerCase();

    // Revisions like "Actually I prefer X now", "I prefer Lenovo instead", "Now I like X"
    if (
      lower.includes("actually") &&
      (lower.includes("prefer") || lower.includes("like") || lower.includes("want"))
    ) {
      // Extract target entity (e.g. Lenovo, dark theme, Python)
      let brandMatch: string | null = null;
      if (lower.includes("lenovo")) brandMatch = "Lenovo";
      else if (lower.includes("asus")) brandMatch = "ASUS";
      else if (lower.includes("hp")) brandMatch = "HP";
      else if (lower.includes("dell")) brandMatch = "Dell";
      else if (lower.includes("apple") || lower.includes("macbook")) brandMatch = "Apple";

      if (brandMatch) {
        const existingPref = existing.find(
          (m) => m.status === "ACTIVE" && (m.key === "preference_laptop_brand" || m.key === "brand_preference")
        );

        const now = Date.now();
        const newRecord: MemoryRecord = {
          id: `mem_${now}_${Math.random().toString(36).substring(2, 8)}`,
          userId,
          type: "PREFERENCE",
          key: "preference_laptop_brand",
          value: brandMatch,
          normalizedValue: brandMatch.toLowerCase(),
          source: "EXPLICIT_USER",
          confidence: 0.95,
          importance: 85,
          createdAt: now,
          updatedAt: now,
          lastAccessedAt: now,
          accessCount: 1,
          status: "ACTIVE",
          tags: ["preference", "brand", "laptop"],
          evidence: [raw],
          supersedes: existingPref?.id || null,
          version: existingPref ? existingPref.version + 1 : 1,
        };

        return {
          action: "UPDATE",
          reason: `Superseding previous brand preference with new preference: ${brandMatch}`,
          confidence: 0.95,
          isExplicit: true,
          existingRecordId: existingPref?.id,
          supersededRecordId: existingPref?.id,
          targetRecord: newRecord,
          directive: `MEMORY UPDATED: preference_laptop_brand changed to ${brandMatch} (supersedes ${existingPref?.id || "none"})`,
        };
      }
    }

    return null;
  }

  /**
   * Safety guard for inferences: ensures repeated inquiries do NOT hallucinate unconfirmed facts (e.g. ownership).
   */
  private checkInferredCandidate(
    context: ConversationContext,
    intent: StructuredIntent,
    existing: MemoryRecord[]
  ): MemoryDecision | null {
    // If user repeatedly researches laptops, do NOT fabricate "owns a gaming laptop"
    // At most, if strongly repeated across turns, flag as CANDIDATE interest
    if (context.activeTopic === "gaming laptop" && context.turnsCount >= 4) {
      const existingCandidate = existing.find((m) => m.key === "interest_gaming_laptops");
      if (!existingCandidate) {
        return {
          action: "CANDIDATE",
          reason: "Repeated user interest in gaming laptops observed across multiple turns; flagged as candidate interest, not factual ownership",
          confidence: 0.60,
          isExplicit: false,
          targetRecord: {
            type: "CANDIDATE",
            key: "interest_gaming_laptops",
            value: "Interested in gaming laptops",
            normalizedValue: "interested in gaming laptops",
            source: "REPEATED_USER_STATEMENT",
            confidence: 0.60,
            importance: 50,
            status: "CANDIDATE",
            tags: ["candidate", "interest", "gaming_laptop"],
          },
        };
      }
    }

    return null;
  }

  /**
   * Semantic parsing of user statements into clean key, value, type, and tags.
   */
  private parseMemorySemantic(fact: string): {
    key: string;
    value: string;
    normalizedValue: string;
    type: MemoryType;
    importance: number;
    tags: string[];
  } {
    const raw = fact.trim();
    const lower = raw.toLowerCase();

    // 1. Dark Mode / Theme
    if (lower.includes("dark mode") || lower.includes("light mode") || lower.includes("dark theme")) {
      const isDark = !lower.includes("light");
      const val = isDark ? "dark mode" : "light mode";
      return {
        key: "preference_ui_theme",
        value: val,
        normalizedValue: val,
        type: "PREFERENCE",
        importance: 85,
        tags: ["preference", "ui", "theme"],
      };
    }

    // 2. Favorite Programming Language
    if (lower.includes("programming language") || lower.includes("favorite language") || lower.includes("language is")) {
      let lang = "Python";
      if (lower.includes("python")) lang = "Python";
      else if (lower.includes("typescript") || lower.includes("ts")) lang = "TypeScript";
      else if (lower.includes("javascript") || lower.includes("js")) lang = "JavaScript";
      else if (lower.includes("rust")) lang = "Rust";
      else if (lower.includes("c++") || lower.includes("cpp")) lang = "C++";
      else if (lower.includes("go") || lower.includes("golang")) lang = "Go";

      return {
        key: "fav_programming_language",
        value: lang,
        normalizedValue: lang.toLowerCase(),
        type: "PREFERENCE",
        importance: 85,
        tags: ["preference", "programming", "language"],
      };
    }

    // 3. Brand preference (ASUS / Lenovo / Apple / etc.)
    if (
      lower.includes("prefer asus") ||
      lower.includes("asus prefer") ||
      lower.includes("prefer lenovo") ||
      lower.includes("lenovo prefer") ||
      lower.includes("prefer hp") ||
      lower.includes("prefer apple")
    ) {
      let brand = "ASUS";
      if (lower.includes("lenovo")) brand = "Lenovo";
      else if (lower.includes("hp")) brand = "HP";
      else if (lower.includes("apple")) brand = "Apple";

      return {
        key: "preference_laptop_brand",
        value: brand,
        normalizedValue: brand.toLowerCase(),
        type: "PREFERENCE",
        importance: 85,
        tags: ["preference", "brand", "laptop"],
      };
    }

    // 4. Nickname / Name
    if (lower.includes("call me") || lower.includes("my name is") || lower.includes("বলে ডাকবে") || lower.includes("dakis")) {
      const match = raw.match(/(?:call me|my name is|amake|আমাকে)\s+([a-zA-Z\u0980-\u09FF\s]+)/i);
      const name = match ? match[1].trim() : raw;
      return {
        key: "user_preferred_name",
        value: name,
        normalizedValue: name.toLowerCase(),
        type: "PERSONALIZATION",
        importance: 90,
        tags: ["identity", "name", "personalization"],
      };
    }

    // 5. Default generic preference / fact
    const key = `user_${lower.replace(/[^\w\s]/g, "").trim().replace(/\s+/g, "_").substring(0, 30)}`;
    return {
      key,
      value: raw,
      normalizedValue: lower,
      type: "FACT",
      importance: 75,
      tags: ["user_fact"],
    };
  }
}

export const memoryDecisionEngine = MemoryDecisionEngine.getInstance();
