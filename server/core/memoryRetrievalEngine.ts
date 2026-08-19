/**
 * Dora Long-Term Memory Retrieval & Recall Engine
 * Phase 2 — Step 2
 * 
 * Provides deterministic, context-aware, privacy-safe retrieval of
 * relevant long-term memories for BrainEngine without LLM or network calls.
 */

import { MemoryRecord, MemoryType, MemorySource, MemoryStatus } from "./memoryTypes";
import { ConversationContext, TrackedEntity } from "./contextTypes";
import { StructuredIntent } from "./intentTypes";
import {
  MemoryRetrievalAnalysis,
  MemoryRetrievalQuery,
  MemoryCandidate,
  MemoryRetrievalScore,
  MemoryRetrievalOptions,
  MemoryConflictRecord,
  MemoryRetrievalExclusionStats,
} from "./memoryRetrievalTypes";

export class MemoryRetrievalEngine {
  private static instance: MemoryRetrievalEngine;

  private readonly DEFAULT_TOP_K = 5;
  private readonly MAX_TOP_K = 8;
  private readonly DEFAULT_MIN_SCORE = 0.32;

  public static getInstance(): MemoryRetrievalEngine {
    if (!MemoryRetrievalEngine.instance) {
      MemoryRetrievalEngine.instance = new MemoryRetrievalEngine();
    }
    return MemoryRetrievalEngine.instance;
  }

  /**
   * Main retrieval method: Evaluates message, context, intent, and memory pool
   * to deterministically extract the most relevant, non-sensitive memories.
   */
  public retrieve(params: {
    message: string;
    context: ConversationContext;
    intent: StructuredIntent;
    memories: MemoryRecord[];
    userId?: string;
    options?: MemoryRetrievalOptions;
  }): MemoryRetrievalAnalysis {
    const startTime = Date.now();
    const rawMessage = (params.message || "").trim();
    const lowerMessage = rawMessage.toLowerCase();
    const context = params.context;
    const intent = params.intent;
    const allMemories = params.memories || [];
    const now = params.options?.now || Date.now();
    const topK = Math.min(params.options?.topK || this.DEFAULT_TOP_K, this.MAX_TOP_K);
    const minScore = params.options?.minRelevanceScore ?? this.DEFAULT_MIN_SCORE;
    const allowedTypes = params.options?.allowedTypes;

    const exclusionStats: MemoryRetrievalExclusionStats = {
      superseded: 0,
      expired: 0,
      sensitive: 0,
      lowRelevance: 0,
      duplicate: 0,
      topicIsolated: 0,
    };

    // 1. Detect Explicit Queries & Reference Patterns
    const isBroadProfileQuery = this.detectBroadProfileQuery(lowerMessage);
    const explicitReferenceMatch = this.detectExplicitMemoryReference(lowerMessage);
    const isExplicitRequest = isBroadProfileQuery || explicitReferenceMatch.isExplicitReference;

    const query: MemoryRetrievalQuery = {
      message: rawMessage,
      activeTopic: context.activeTopic,
      currentTask: context.currentTask,
      userGoal: context.userGoal,
      entities: (context.entities || []).map((e) => e.name),
      intent: intent.primaryIntent,
      isTopicSwitched: context.isTopicSwitched,
      isExplicitMemoryQuery: isExplicitRequest,
      explicitReferenceTokens: explicitReferenceMatch.tokens,
      userId: params.userId,
      topK,
      minRelevanceScore: minScore,
      allowedTypes,
    };

    // 2. Pre-filter Memories: Privacy, Status, Expiry, Supersession
    const validMemories = this.filterValidMemories(allMemories, now, exclusionStats);

    // 3. Score Each Candidate Memory
    const scoredCandidates: MemoryCandidate[] = [];
    const tokenizedMessage = this.tokenize(lowerMessage);
    const tokenizedTopic = this.tokenize(context.activeTopic || "");
    const contextEntities = context.entities || [];

    for (const mem of validMemories) {
      // Check type restrictions if specified
      if (allowedTypes && !allowedTypes.includes(mem.type)) {
        continue;
      }

      // Topic switch protection: isolate topic-specific memories unless current turn references them
      if (context.isTopicSwitched && !isExplicitRequest) {
        if (this.isTopicIsolated(mem, context, lowerMessage)) {
          exclusionStats.topicIsolated++;
          continue;
        }
      }

      const scoreBreakdown = this.scoreMemory({
        memory: mem,
        message: lowerMessage,
        messageTokens: tokenizedMessage,
        topicTokens: tokenizedTopic,
        context,
        intent,
        entities: contextEntities,
        isBroadProfileQuery,
        explicitReferenceMatch,
        now,
      });

      const matchedSignals: string[] = [];
      if (scoreBreakdown.topicMatch > 0.3) matchedSignals.push("topic_match");
      if (scoreBreakdown.entityMatch > 0.3) matchedSignals.push("entity_match");
      if (scoreBreakdown.intentMatch > 0.3) matchedSignals.push("intent_match");
      if (scoreBreakdown.taskMatch > 0.3) matchedSignals.push("task_match");
      if (scoreBreakdown.goalMatch > 0.3) matchedSignals.push("goal_match");
      if (scoreBreakdown.categoryMatch > 0.3) matchedSignals.push("category_match");
      if (scoreBreakdown.explicitBoost > 0) matchedSignals.push("explicit_reference");

      const candidate: MemoryCandidate = {
        memory: mem,
        memoryId: mem.id,
        content: `${mem.key}: ${mem.value}`,
        memoryType: mem.type,
        category: mem.tags?.[0] || mem.type.toLowerCase(),
        confidence: mem.confidence,
        importance: mem.importance,
        relevanceScore: scoreBreakdown.normalizedScore,
        matchedSignals,
        source: mem.source,
        createdAt: mem.createdAt,
        updatedAt: mem.updatedAt,
        status: mem.status,
        supersedes: mem.supersedes,
        retrievalReason: this.generateRetrievalReason(mem, scoreBreakdown),
        scoreBreakdown,
        isLowConfidenceInferred: mem.source === "INFERRED" || mem.status === "CANDIDATE" || mem.confidence < 0.8,
      };

      scoredCandidates.push(candidate);
    }

    // 4. Resolve Conflicts & Deduplicate Candidates
    const { deduplicated, conflicts } = this.resolveConflictsAndDeduplicate(
      scoredCandidates,
      exclusionStats
    );

    // 5. Rank and Apply Threshold / Budget Filter
    const threshold = isBroadProfileQuery ? 0.0 : minScore;
    const passingCandidates = deduplicated.filter((c) => {
      const passes = c.relevanceScore >= threshold;
      if (!passes) exclusionStats.lowRelevance++;
      return passes;
    });

    // Sort descending by relevance score, then importance, then recency
    passingCandidates.sort((a, b) => {
      if (Math.abs(b.relevanceScore - a.relevanceScore) > 0.05) {
        return b.relevanceScore - a.relevanceScore;
      }
      if (Math.abs(b.importance - a.importance) > 5) {
        return b.importance - a.importance;
      }
      return b.updatedAt - a.updatedAt;
    });

    const retrievedMemories = passingCandidates.slice(0, topK);

    // 6. Ambiguous Reference Handling (e.g. "that preference" with multiple candidates and no antecedent)
    let requiresClarification = false;
    let clarificationReason: string | undefined;
    let clarificationPrompt: string | undefined;

    if (
      explicitReferenceMatch.isAmbiguousReference &&
      retrievedMemories.length > 1 &&
      !context.activeTopic
    ) {
      requiresClarification = true;
      clarificationReason = "Ambiguous memory reference; multiple candidate preferences exist with no clear antecedent";
      clarificationPrompt = `Which preference are you referring to? (e.g. ${retrievedMemories.slice(0, 2).map(m => m.memory.key.replace(/_/g, " ")).join(" or ")})`;
    }

    // 7. Format Directives and Clean Prompt Context
    const directives: string[] = [];
    const contextLines: string[] = [];

    if (isBroadProfileQuery) {
      directives.push("SAFE_MEMORY_SUMMARY: Present the user's stored preferences and facts accurately, without exposing internal keys or scores.");
    }

    for (const item of retrievedMemories) {
      const cleanKey = item.memory.key.replace(/_/g, " ");
      const cleanVal = item.memory.value;

      if (item.isLowConfidenceInferred) {
        contextLines.push(`- [INFERRED INTEREST] ${cleanKey}: ${cleanVal} (Unconfirmed candidate)`);
      } else {
        contextLines.push(`- [${item.memoryType}] ${cleanKey}: ${cleanVal}`);
      }

      // Generate clean conversational directive
      const directive = this.createCleanDirective(item);
      if (directive && !directives.includes(directive)) {
        directives.push(directive);
      }
    }

    const contextString = contextLines.length > 0
      ? `[RELEVANT LONG-TERM MEMORY]\n${contextLines.join("\n")}`
      : "";

    return {
      query,
      candidates: scoredCandidates,
      retrievedMemories,
      totalConsidered: allMemories.length,
      totalRetrieved: retrievedMemories.length,
      isExplicitRequest,
      isBroadProfileQuery,
      requiresClarification,
      clarificationReason,
      clarificationPrompt,
      directives,
      contextString,
      conflictsDetected: conflicts,
      excludedCount: exclusionStats,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Pre-filters memories for status validity, privacy/sensitive data, expiry, and superseded records.
   */
  private filterValidMemories(
    memories: MemoryRecord[],
    now: number,
    stats: MemoryRetrievalExclusionStats
  ): MemoryRecord[] {
    const valid: MemoryRecord[] = [];
    // Collect all IDs that are explicitly superseded by another record in the set
    const supersededIds = new Set<string>();

    for (const mem of memories) {
      if (mem.supersedes) {
        supersededIds.add(mem.supersedes);
      }
    }

    for (const mem of memories) {
      // 1. Status Filter: Only ACTIVE and CANDIDATE (if valid)
      if (mem.status === "ARCHIVED" || mem.status === "OUTDATED" || mem.status === "SUPERSEDED") {
        stats.superseded++;
        continue;
      }

      // 2. Explicit Supersession Link Filter
      if (supersededIds.has(mem.id)) {
        stats.superseded++;
        continue;
      }

      // 3. Expiry Filter
      if (mem.expiresAt && mem.expiresAt < now) {
        stats.expired++;
        continue;
      }

      // 4. Privacy & Sensitive Information Filter
      if (this.containsSensitiveData(mem)) {
        stats.sensitive++;
        continue;
      }

      valid.push(mem);
    }

    return valid;
  }

  /**
   * Privacy Guard: Ensures passwords, API keys, bearer tokens, financial secrets are excluded.
   */
  private containsSensitiveData(mem: MemoryRecord): boolean {
    const combined = `${mem.key} ${mem.value} ${(mem.tags || []).join(" ")} ${(mem.evidence || []).join(" ")}`;
    const sensitivePatterns = [
      /\b(?:password|passwd|pwd)\b/i,
      /\b(?:api[_-]?key|secret[_-]?key|auth[_-]?token|bearer\s+[a-zA-Z0-9_\-\.]+)\b/i,
      /\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z-_]{35})\b/,
      /\b(?:cvv|cvc)\b/i,
      /\b(?:\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4})\b/,
      /\b(?:credit\s*card|bank\s*pin|atm\s*pin|private\s*key|financial\s*secret)\b/i,
    ];
    return sensitivePatterns.some((pattern) => pattern.test(combined));
  }

  /**
   * Multi-signal scoring engine combining topic, entity, intent, task, recency, importance, and confidence.
   */
  private scoreMemory(params: {
    memory: MemoryRecord;
    message: string;
    messageTokens: Set<string>;
    topicTokens: Set<string>;
    context: ConversationContext;
    intent: StructuredIntent;
    entities: TrackedEntity[];
    isBroadProfileQuery: boolean;
    explicitReferenceMatch: { isExplicitReference: boolean; tokens: string[] };
    now: number;
  }): MemoryRetrievalScore {
    const { memory, message, messageTokens, topicTokens, context, intent, entities, isBroadProfileQuery, explicitReferenceMatch, now } = params;

    if (isBroadProfileQuery) {
      // In broad profile query mode ("What do you remember about me?"), all valid memories get high baseline score
      return {
        topicMatch: 1.0,
        entityMatch: 1.0,
        intentMatch: 1.0,
        taskMatch: 1.0,
        goalMatch: 1.0,
        categoryMatch: 1.0,
        recencyWeight: 0.8,
        importanceWeight: memory.importance / 100,
        confidenceWeight: memory.confidence,
        explicitBoost: 1.0,
        normalizedScore: 0.95,
      };
    }

    const memTokens = this.tokenize(`${memory.key} ${memory.value} ${(memory.tags || []).join(" ")}`);
    const keyLower = memory.key.toLowerCase().replace(/_/g, " ");
    const valLower = memory.value.toLowerCase();

    // A. Topic Match
    let topicMatch = 0.0;
    if (context.activeTopic) {
      const topicLower = context.activeTopic.toLowerCase();
      if (keyLower.includes(topicLower) || valLower.includes(topicLower) || (memory.tags || []).some(t => topicLower.includes(t.toLowerCase()))) {
        topicMatch = 1.0;
      } else {
        const intersection = this.setIntersection(topicTokens, memTokens);
        topicMatch = intersection.size > 0 ? Math.min(intersection.size * 0.4, 0.9) : 0.0;
      }
    }
    // Direct message token overlap
    const msgOverlap = this.setIntersection(messageTokens, memTokens);
    if (msgOverlap.size > 0) {
      topicMatch = Math.max(topicMatch, Math.min(msgOverlap.size * 0.35, 1.0));
    }
    if (message.includes(keyLower) || message.includes(valLower)) {
      topicMatch = Math.max(topicMatch, 0.9);
    }

    // B. Entity Overlap
    let entityMatch = 0.0;
    for (const ent of entities) {
      const entName = ent.name.toLowerCase();
      if (keyLower.includes(entName) || valLower.includes(entName) || (memory.tags || []).some(t => t.toLowerCase() === entName)) {
        entityMatch = 1.0;
        break;
      }
    }
    for (const token of messageTokens) {
      if (valLower.includes(token) && token.length >= 3) {
        entityMatch = Math.max(entityMatch, 0.7);
      }
    }

    // C. Intent Relevance
    let intentMatch = 0.4;
    const primIntent = intent.primaryIntent;
    if (primIntent === "RECOMMENDATION") {
      if (memory.type === "PREFERENCE" || memory.type === "GOAL" || memory.type === "PERSONALIZATION") intentMatch = 1.0;
    } else if (primIntent === "COMPARISON") {
      if (memory.type === "PREFERENCE" || keyLower.includes("brand") || keyLower.includes("prefer")) intentMatch = 0.95;
    } else if (primIntent === "CORRECTION") {
      if (memory.type === "PREFERENCE" || memory.type === "FACT") intentMatch = 0.85;
    } else if (primIntent === "REAL_TIME_INFORMATION") {
      if (memory.key.includes("location") || memory.key.includes("city") || memory.key.includes("language")) intentMatch = 0.9;
      else intentMatch = 0.2; // Don't inject laptop preference when asking weather
    } else if (primIntent === "CASUAL_CONVERSATION") {
      if (memory.key.includes("name") || memory.key.includes("language") || memory.key.includes("theme")) intentMatch = 0.6;
      else intentMatch = 0.25;
    }

    // D. Task Match & Goal Match
    let taskMatch = 0.3;
    if (context.currentTask && (keyLower.includes(context.currentTask) || (memory.tags || []).includes(context.currentTask))) {
      taskMatch = 0.9;
    }
    let goalMatch = 0.3;
    if (context.userGoal && (keyLower.includes(context.userGoal) || valLower.includes(context.userGoal))) {
      goalMatch = 0.9;
    }

    // E. Category Match
    let categoryMatch = 0.5;
    if (memory.type === "PROJECT_CONTEXT" && (message.includes("dora") || message.includes("project") || message.includes("assistant"))) {
      categoryMatch = 1.0;
    }

    // F. Recency Weight (0.0 to 1.0, decayed over 30 days)
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const ageMs = Math.max(0, now - (memory.updatedAt || memory.createdAt));
    const recencyWeight = Math.max(0.1, 1.0 - (ageMs / thirtyDaysMs));

    // G. Importance & Confidence
    const importanceWeight = Math.max(0.2, (memory.importance || 50) / 100);
    const confidenceWeight = Math.max(0.3, memory.confidence || 1.0);

    // H. Explicit Reference Boost
    let explicitBoost = 0.0;
    if (explicitReferenceMatch.isExplicitReference) {
      // Check if reference tokens match memory key/value
      for (const tok of explicitReferenceMatch.tokens) {
        if (keyLower.includes(tok) || valLower.includes(tok) || (memory.tags || []).some(t => t.toLowerCase().includes(tok))) {
          explicitBoost = 0.5;
          break;
        }
      }
      if (explicitBoost === 0.0 && (memory.type === "PREFERENCE" || memory.type === "FACT")) {
        explicitBoost = 0.3;
      }
    }

    // Composite Weighted Score Calculation
    // Base signal contribution: Topic (0.30) + Entity (0.20) + Intent (0.15) + Task (0.05) + Goal (0.05) + Category (0.05)
    // Multipliers / Additions: Recency (0.05) + Importance (0.08) + Confidence (0.07) + ExplicitBoost (up to 0.30)
    let rawScore =
      (topicMatch * 0.30) +
      (entityMatch * 0.20) +
      (intentMatch * 0.15) +
      (taskMatch * 0.05) +
      (goalMatch * 0.05) +
      (categoryMatch * 0.05) +
      (recencyWeight * 0.05) +
      (importanceWeight * 0.08) +
      (confidenceWeight * 0.07) +
      explicitBoost;

    // Special Boost for Personalization & Identity (e.g. user preferred name / Banglish / Dark mode)
    if (memory.type === "PERSONALIZATION" || memory.key === "preference_ui_theme" || memory.key === "user_preferred_name") {
      if (message.includes("name") || message.includes("dakba") || message.includes("theme") || message.includes("dark") || message.includes("light")) {
        rawScore = Math.max(rawScore, 0.85);
      }
    }

    // Special Boost for Project Context
    if (memory.type === "PROJECT_CONTEXT" && (message.includes("dora") || message.includes("project") || context.activeTopic?.includes("project"))) {
      rawScore = Math.max(rawScore, 0.90);
    }

    const normalizedScore = Math.min(1.0, Math.max(0.0, Number(rawScore.toFixed(3))));

    return {
      topicMatch,
      entityMatch,
      intentMatch,
      taskMatch,
      goalMatch,
      categoryMatch,
      recencyWeight,
      importanceWeight,
      confidenceWeight,
      explicitBoost,
      normalizedScore,
    };
  }

  /**
   * Topic switch guard: Checks whether a memory belongs strictly to an old/archived topic
   * and should be excluded from the switched context.
   */
  private isTopicIsolated(mem: MemoryRecord, context: ConversationContext, message: string): boolean {
    const memKey = mem.key.toLowerCase();
    const memVal = mem.value.toLowerCase();
    const tags = (mem.tags || []).map(t => t.toLowerCase());

    // Identity, personalization, and general developer facts are not isolated
    if (mem.type === "PERSONALIZATION" || mem.type === "PROJECT_CONTEXT" || memKey === "user_preferred_name") {
      return false;
    }

    // Check if the memory matches any of the archived topics
    const archivedTopics = (context.archivedContexts || []).map(a => a.topic.toLowerCase());
    const isArchivedTopicMatch = archivedTopics.some(t => memKey.includes(t) || tags.includes(t) || memVal.includes(t));

    if (isArchivedTopicMatch) {
      // Only permit if current message explicitly mentions that topic or entity
      const msgMentions = archivedTopics.some(t => message.includes(t));
      if (!msgMentions) {
        return true; // Isolate from active context
      }
    }

    return false;
  }

  /**
   * Deduplicates candidates and resolves conflicting preference records.
   */
  private resolveConflictsAndDeduplicate(
    candidates: MemoryCandidate[],
    stats: MemoryRetrievalExclusionStats
  ): { deduplicated: MemoryCandidate[]; conflicts: MemoryConflictRecord[] } {
    const byKeyMap = new Map<string, MemoryCandidate>();
    const conflicts: MemoryConflictRecord[] = [];

    for (const cand of candidates) {
      const normalizedKey = cand.memory.key.trim().toLowerCase().replace(/[_\s]+/g, " ");
      const existing = byKeyMap.get(normalizedKey);

      if (!existing) {
        byKeyMap.set(normalizedKey, cand);
        continue;
      }

      // Check if they are exact duplicates
      if (existing.memory.normalizedValue === cand.memory.normalizedValue) {
        stats.duplicate++;
        // Prefer candidate with higher score or newer updatedAt
        if (cand.relevanceScore > existing.relevanceScore || cand.updatedAt > existing.updatedAt) {
          byKeyMap.set(normalizedKey, cand);
        }
        continue;
      }

      // Contradictory values for same key!
      // Resolve: Prefer latest version, higher confidence, explicit source
      let winner = existing;
      let loser = cand;

      if (cand.supersedes === existing.memoryId || cand.memory.version > existing.memory.version) {
        winner = cand;
        loser = existing;
      } else if (cand.confidence > existing.confidence) {
        winner = cand;
        loser = existing;
      } else if (cand.updatedAt > existing.updatedAt && cand.confidence >= existing.confidence) {
        winner = cand;
        loser = existing;
      }

      winner.isConflict = true;
      winner.conflictDetail = `Resolved conflict for '${normalizedKey}': selected '${winner.memory.value}' over older '${loser.memory.value}'`;

      conflicts.push({
        activeMemoryId: winner.memoryId,
        conflictingMemoryId: loser.memoryId,
        key: normalizedKey,
        description: `Resolved conflicting values for ${normalizedKey} (${winner.memory.value} vs ${loser.memory.value})`,
      });

      byKeyMap.set(normalizedKey, winner);
      stats.superseded++;
    }

    return {
      deduplicated: Array.from(byKeyMap.values()),
      conflicts,
    };
  }

  /**
   * Detects explicit memory queries asking what Dora remembers (English, Bangla, Banglish).
   */
  private detectBroadProfileQuery(clean: string): boolean {
    const broadPatterns = [
      /\bwhat\s+do\s+you\s+remember(?:\s+about\s+me)?\b/i,
      /\bwhat\s+do\s+you\s+know\s+about\s+me\b/i,
      /\bwhat['’]?s\s+in\s+your\s+memory\b/i,
      /\bshow\s+(?:all\s+)?my\s+memories\b/i,
      /\btell\s+me\s+what\s+you\s+remember\b/i,
      /আমার\s+সম্পর্কে\s+কী\s+মনে\s+রেখেছো/i,
      /কী\s+কী\s+মনে\s+রাখছো/i,
      /\bamar\s+sh?omporke\s+ki\s+(?:jano|mone\s+ase|mone\s+rakhso)\b/i,
      /\bki\s+ki\s+mone\s+rakhso\b/i,
      /\bwhat\s+you\s+remember\b/i,
    ];
    return broadPatterns.some(p => p.test(clean));
  }

  /**
   * Detects explicit in-turn references to past memories (English, Bangla, Banglish).
   */
  private detectExplicitMemoryReference(clean: string): {
    isExplicitReference: boolean;
    isAmbiguousReference: boolean;
    tokens: string[];
  } {
    const refPatterns = [
      /\bwhat\s+did\s+i\s+(?:tell\s+you|say)\s+before\b/i,
      /\bremember\s+when\s+i\s+said\b/i,
      /\byou\s+know\s+my\s+preference\b/i,
      /\bas\s+i\s+told\s+you\s+before\b/i,
      /\bmy\s+usual\s+choice\b/i,
      /\bthat\s+preference\b/i,
      /\bamar\s+(?:oi\s+)?(?:\w+\s+)*preference(?:\s+ta)?(?:\s+ki)?(?:\s+mone\s+ase)?\b/i,
      /\bmone\s+(?:ase|ache|rakhso|rakhco)\b/i,
      /\b(?:ami\s+)?age(?:\s+ki)?\s+bolsilam\b/i,
      /\bage\s+jeita\s+bolsilam\b/i,
      /\bamar\s+oi\s+jinishta\b/i,
      /\boita\s+ki\s+mone\s+ase\b/i,
      /\bdo\s+you\s+remember\b/i,
      /আমি\s+আগে.*(?:বলেছিলাম|বলছিলাম|বলেছি)/i,
      /মনে\s+(?:আছে|রেখেছো|রাখছো)/i,
      /আমার\s+পছন্দ/i,
    ];

    const isMatch = refPatterns.some(p => p.test(clean));
    const isAmbiguous = clean.trim() === "that preference" ||
      clean.trim() === "my usual choice" ||
      clean.trim() === "amar oi preference ta ki?" ||
      clean.trim() === "amar oi preference ta ki" ||
      clean.trim() === "oita";

    const extractedTokens: string[] = [];
    if (clean.includes("laptop") || clean.includes("brand") || clean.includes("ল্যাপটপ") || clean.includes("ব্র্যান্ড")) extractedTokens.push("laptop", "brand");
    if (clean.includes("theme") || clean.includes("mode") || clean.includes("থিম")) extractedTokens.push("theme", "mode");
    if (clean.includes("language") || clean.includes("programming") || clean.includes("প্রোগ্রামিং") || clean.includes("ভাষা")) extractedTokens.push("programming", "language");
    if (clean.includes("name") || clean.includes("nam") || clean.includes("নাম")) extractedTokens.push("name");

    return {
      isExplicitReference: isMatch,
      isAmbiguousReference: isAmbiguous,
      tokens: extractedTokens,
    };
  }

  /**
   * Generates a clean internal diagnostic reason (never exposed raw to end-user).
   */
  private generateRetrievalReason(mem: MemoryRecord, score: MemoryRetrievalScore): string {
    const reasons: string[] = [];
    if (score.topicMatch >= 0.7) reasons.push("strong topic match");
    if (score.entityMatch >= 0.7) reasons.push("entity overlap");
    if (score.intentMatch >= 0.8) reasons.push("intent alignment");
    if (score.explicitBoost > 0) reasons.push("explicit reference match");
    if (score.importanceWeight >= 0.8) reasons.push("high importance");
    return reasons.length > 0 ? reasons.join(", ") : "general relevance";
  }

  /**
   * Creates a natural, non-technical directive for BrainEngine prompt assembly.
   */
  private createCleanDirective(candidate: MemoryCandidate): string {
    const key = candidate.memory.key.replace(/_/g, " ");
    const val = candidate.memory.value;

    if (candidate.memoryType === "PREFERENCE") {
      return `Apply user's stored preference for ${key} (${val}) when relevant.`;
    }
    if (candidate.memoryType === "PERSONALIZATION") {
      return `Personalize response acknowledging ${key}: ${val}.`;
    }
    if (candidate.memoryType === "PROJECT_CONTEXT") {
      return `Integrate project context: ${val}.`;
    }
    if (candidate.isLowConfidenceInferred) {
      return `Consider potential user interest in ${val} subtly without assuming confirmed fact.`;
    }
    return `Note user fact: ${key} is ${val}.`;
  }

  private tokenize(text: string): Set<string> {
    const tokens = (text || "")
      .toLowerCase()
      .replace(/[^\w\s\u0980-\u09FF]/g, " ")
      .split(/\s+/)
      .filter(t => t.length > 2);
    return new Set(tokens);
  }

  private setIntersection(a: Set<string>, b: Set<string>): Set<string> {
    const intersection = new Set<string>();
    for (const elem of a) {
      if (b.has(elem)) intersection.add(elem);
    }
    return intersection;
  }
}

export const memoryRetrievalEngine = MemoryRetrievalEngine.getInstance();
