/**
 * Dora Context Engine
 * 
 * Implements structured, stateful conversation-context tracking for Dora:
 * - Semantic active topic tracking & topic switch detection
 * - Task state tracking (recommendation, comparison, troubleshooting, etc.)
 * - Entity extraction and tracking (brands, models, products, people, locations)
 * - Dynamic constraint extraction & updates (budget, specs, exclusions)
 * - Multi-turn reference resolution (anaphora, comparative, ordinal)
 * - Ambiguous reference detection (prevents false confidence)
 * - Context vs Long-Term Memory separation
 */

import {
  ActiveConversationContext,
  ConversationConstraint,
  ConversationTurn,
  EntityRole,
  EntityType,
  ResolvedReference,
  TrackedEntity,
} from "./contextTypes";
import { BrainIntent } from "./brainEngine";

export interface TurnContextInput {
  message: string;
  history: ConversationTurn[];
  existingContext?: ActiveConversationContext;
  currentTurnIndex?: number;
}

export class ContextEngine {
  private static instance: ContextEngine;

  private constructor() {}

  public static getInstance(): ContextEngine {
    if (!ContextEngine.instance) {
      ContextEngine.instance = new ContextEngine();
    }
    return ContextEngine.instance;
  }

  // Reference tokens for Bangla, Banglish, and English
  private referencePatterns = [
    { regex: /\b(?:which\s*one|konta|konti|kon\s*ta)\b/i, type: "comparative" },
    { regex: /\b(?:first\s*(?:one|option|laptop|phone|item)|prothom\s*(?:ta|ti)|1st\s*(?:one|option))\b/i, type: "ordinal_1" },
    { regex: /\b(?:second\s*(?:one|option|laptop|phone|item)|ditiyo\s*(?:ta|ti)|2nd\s*(?:one|option)|the\s*other\s*one|onno\s*ta)\b/i, type: "ordinal_2" },
    { regex: /\b(?:last\s*one|previous\s*one|ager\s*ta|ager\s*ti|shesh\s*er\s*ta)\b/i, type: "previous" },
    { regex: /\b(?:oitar\s*cheye|oitar\s*theke|better\s*than\s*(?:that|this))\b/i, type: "comparative_target" },
    { regex: /\b(?:eta|eita|oita|sheta|seta|this|that|it|its|oitar|shetar|etar|eitar)\b|[ওইএই][টত]া|[ওইএই]টার|আগেরটা/i, type: "pronoun" },
    { regex: /\b(?:they|them|these|those|eigula|oigula|eigulo|oigulo)\b|[ওইএই]গুলো|[ওইএই]গুলা/i, type: "plural_pronoun" },
  ];

  // Common brand / tech entity patterns
  private brandPatterns = [
    { name: "ASUS", regex: /\b(?:asus|rog|tuf|zenbook)\b/i, type: "brand" as EntityType },
    { name: "Lenovo", regex: /\b(?:lenovo|legion|ideapad|thinkpad)\b/i, type: "brand" as EntityType },
    { name: "Apple", regex: /\b(?:apple|macbook|mac\s*book|iphone|ipad)\b/i, type: "brand" as EntityType },
    { name: "Samsung", regex: /\b(?:samsung|galaxy)\b/i, type: "brand" as EntityType },
    { name: "Dell", regex: /\b(?:dell|alienware|xps|inspiron)\b/i, type: "brand" as EntityType },
    { name: "HP", regex: /\b(?:hp|victus|omen|pavilion)\b/i, type: "brand" as EntityType },
    { name: "Acer", regex: /\b(?:acer|predator|nitro|swift)\b/i, type: "brand" as EntityType },
    { name: "MSI", regex: /\b(?:msi|katana|stealth|cyborg)\b/i, type: "brand" as EntityType },
    { name: "Xiaomi", regex: /\b(?:xiaomi|redmi|poco)\b/i, type: "brand" as EntityType },
    { name: "Realme", regex: /\b(?:realme)\b/i, type: "brand" as EntityType },
    { name: "OnePlus", regex: /\b(?:oneplus|one\s*plus)\b/i, type: "brand" as EntityType },
    { name: "Google", regex: /\b(?:google|pixel)\b/i, type: "brand" as EntityType },
    { name: "Sony", regex: /\b(?:sony|playstation|ps5|bravia)\b/i, type: "brand" as EntityType },
  ];

  // Product model patterns
  private modelPatterns = [
    { name: "RTX 4060", regex: /\b(?:rtx\s*4060|4060)\b/i, type: "product" as EntityType },
    { name: "RTX 4050", regex: /\b(?:rtx\s*4050|4050)\b/i, type: "product" as EntityType },
    { name: "RTX 4070", regex: /\b(?:rtx\s*4070|4070)\b/i, type: "product" as EntityType },
    { name: "iPhone 17", regex: /\b(?:iphone\s*17|17\s*pro|17\s*pro\s*max)\b/i, type: "product" as EntityType },
    { name: "iPhone 16", regex: /\b(?:iphone\s*16|16\s*pro|16\s*pro\s*max)\b/i, type: "product" as EntityType },
    { name: "Galaxy S26", regex: /\b(?:galaxy\s*s26|s26\s*ultra|s26)\b/i, type: "product" as EntityType },
    { name: "Galaxy S25", regex: /\b(?:galaxy\s*s25|s25\s*ultra|s25)\b/i, type: "product" as EntityType },
    { name: "MacBook Pro", regex: /\b(?:macbook\s*pro|m3\s*pro|m4\s*pro)\b/i, type: "product" as EntityType },
    { name: "MacBook Air", regex: /\b(?:macbook\s*air|m2\s*air|m3\s*air)\b/i, type: "product" as EntityType },
  ];

  // Generic category keywords for topic detection
  private topicDomains = [
    {
      topic: "gaming laptop",
      keywords: /\b(?:gaming\s*laptop|gaming\s*pc|gaming\s*notebook|laptop\s*for\s*gaming|gpu\s*laptop)\b/i,
      task: "purchase_research",
    },
    {
      topic: "laptop recommendation",
      keywords: /\b(?:laptop|notebook|ultrabook|macbook)\b/i,
      task: "purchase_research",
    },
    {
      topic: "smartphone recommendation",
      keywords: /\b(?:phone|smartphone|mobile|android|iphone|galaxy)\b/i,
      task: "purchase_research",
    },
    {
      topic: "weather inquiry",
      keywords: /\b(?:weather|temperature|rain|brishti|abohawa|forecast|sunny|cloudy)\b/i,
      task: "realtime_information",
    },
    {
      topic: "movie discussion",
      keywords: /\b(?:movie|film|cinema|oscar|actor|actress|director|netflix|watch)\b/i,
      task: "entertainment_discussion",
    },
    {
      topic: "programming & code",
      keywords: /\b(?:code|coding|javascript|typescript|python|react|bug|function|api|error|debug)\b/i,
      task: "technical_assistance",
    },
    {
      topic: "graphics & hardware specs",
      keywords: /\b(?:rtx\s*\d+|gtx\s*\d+|gpu|graphics\s*card|nvidia|amd\s*radeon|processor|cpu|ram|specs?)\b/i,
      task: "technical_research",
    },
    {
      topic: "time & date",
      keywords: /\b(?:time|clock|date|today|tomorrow|koyta\s*baje|tarik|somoy)\b/i,
      task: "realtime_information",
    },
  ];

  /**
   * Processes a new turn, reconstructing or updating the structured active context
   */
  public updateContext(input: TurnContextInput): {
    context: ActiveConversationContext;
    isFollowUp: boolean;
    isTopicSwitch: boolean;
    resolvedReferences: ResolvedReference[];
    contextDirectives: string[];
    diagnostics: {
      signals: Record<string, number>;
      reasoningTrace: string[];
    };
  } {
    const { message, history } = input;
    const trimmed = message.trim();
    const lower = trimmed.toLowerCase();
    const turnIndex = input.currentTurnIndex ?? history.length;
    const reasoningTrace: string[] = [];

    // 1. Build initial context or reconstruct from history
    let prevContext = input.existingContext || this.reconstructContextFromHistory(history);
    let activeTopic = prevContext.activeTopic;
    let currentTask = prevContext.currentTask;
    let userGoal = prevContext.userGoal;
    let entities = [...prevContext.entities];
    let constraints = [...prevContext.constraints];
    const preferences = [...prevContext.preferences];
    const topicHistory = [...prevContext.topicHistory];

    reasoningTrace.push(`Initial active topic: "${activeTopic || 'none'}", task: "${currentTask || 'none'}"`);

    // 2. Detect Topic Switch vs Topic Continuity
    const detectedDomain = this.detectExplicitTopic(trimmed);
    let isTopicSwitch = false;

    if (detectedDomain) {
      if (!activeTopic) {
        activeTopic = detectedDomain.topic;
        currentTask = detectedDomain.task;
        userGoal = `Explore / discuss ${detectedDomain.topic}`;
        reasoningTrace.push(`Established new active topic: "${activeTopic}"`);
      } else if (this.isExplicitTopicSwitch(trimmed, activeTopic, detectedDomain.topic)) {
        isTopicSwitch = true;
        reasoningTrace.push(`Detected topic switch from "${activeTopic}" -> "${detectedDomain.topic}"`);
        topicHistory.push({ topic: activeTopic, endedAtTurn: turnIndex - 1 });
        activeTopic = detectedDomain.topic;
        currentTask = detectedDomain.task;
        userGoal = `Explore / discuss ${detectedDomain.topic}`;
        // Isolate stale context: clear specific product entities and constraints
        entities = [];
        constraints = [];
      } else {
        // Refinement of existing topic or compatible subtopic
        reasoningTrace.push(`Topic continuity with domain "${detectedDomain.topic}"`);
      }
    } else {
      // No new domain detected; evaluate if message continues existing topic
      if (activeTopic) {
        reasoningTrace.push(`Retaining existing topic: "${activeTopic}"`);
      }
    }

    // 3. Extract & Track Entities (Brands, Models, Devices, Locations, etc.)
    const newlyExtractedEntities = this.extractEntities(trimmed, turnIndex);
    for (const newEnt of newlyExtractedEntities) {
      const existingIdx = entities.findIndex(
        (e) => e.name.toLowerCase() === newEnt.name.toLowerCase() || (e.id && e.id === newEnt.id)
      );
      if (existingIdx >= 0) {
        entities[existingIdx].lastMentionedTurn = turnIndex;
        if (newEnt.attributes) {
          entities[existingIdx].attributes = {
            ...entities[existingIdx].attributes,
            ...newEnt.attributes,
          };
        }
      } else {
        // If we have 2+ brands/products in comparison, mark their role as comparison_target
        if (entities.length >= 1 && newEnt.type === entities[0].type) {
          newEnt.role = "comparison_target";
          entities[0].role = "comparison_target";
        }
        entities.push(newEnt);
        reasoningTrace.push(`Tracked entity: "${newEnt.name}" (${newEnt.type}, role: ${newEnt.role})`);
      }
    }

    // 4. Extract & Update Constraints (Budget, GPU, Exclusions, etc.)
    const newlyExtractedConstraints = this.extractConstraints(trimmed, turnIndex);
    for (const newConst of newlyExtractedConstraints) {
      // Look for an existing constraint in the same category/key to override
      const existingIdx = constraints.findIndex(
        (c) => !c.isOverridden && (c.category === newConst.category || c.key === newConst.key)
      );
      if (existingIdx >= 0) {
        constraints[existingIdx].isOverridden = true;
        reasoningTrace.push(
          `Updated constraint: overridden "${constraints[existingIdx].key}=${constraints[existingIdx].value}" with "${newConst.key}=${newConst.value}"`
        );
      } else {
        reasoningTrace.push(`Added new constraint: "${newConst.key}=${newConst.value}" (${newConst.category})`);
      }
      constraints.push(newConst);
    }

    // 5. Reference Resolution (Anaphora, Pronouns, Ordinal, Comparative)
    const resolvedReferences = this.resolveReferences(trimmed, {
      activeTopic,
      entities,
      constraints,
      history,
    });

    let isAmbiguousReference = false;
    for (const ref of resolvedReferences) {
      if (ref.isAmbiguous) {
        isAmbiguousReference = true;
        reasoningTrace.push(`Ambiguous reference detected for token "${ref.rawToken}": candidates [${ref.candidateTargets?.join(', ')}]`);
      } else if (ref.resolvedTarget) {
        reasoningTrace.push(`Resolved reference "${ref.rawToken}" -> "${ref.resolvedTarget}"`);
      }
    }

    // 6. Follow-Up Detection
    const lastDoraTurn = [...history].reverse().find((h) => h.sender === "dora");
    const isShortMessage = trimmed.split(/\s+/).length <= 7;
    const hasFollowUpPrefix = /^(?:what\s+about|how\s+about|and|why|how|then|ar\s+eta|tahole|ebong|kintu|oitar)\b/i.test(trimmed);
    const isFollowUp =
      (Boolean(activeTopic) || entities.length > 0) &&
      !isTopicSwitch &&
      (hasFollowUpPrefix ||
        isShortMessage ||
        resolvedReferences.some((r) => !r.isAmbiguous && r.resolvedTarget) ||
        newlyExtractedConstraints.length > 0 ||
        (lastDoraTurn && /[?？]/.test(lastDoraTurn.text)));

    // 7. Synthesize Prompt Directives for Dora
    const contextDirectives: string[] = [];

    if (activeTopic) {
      contextDirectives.push(`ACTIVE CONVERSATION TOPIC: "${activeTopic}" (Task: ${currentTask || 'general'}).`);
    }

    if (entities.length > 0) {
      const activeEntities = entities.filter((e) => turnIndex - e.lastMentionedTurn <= 5);
      if (activeEntities.length > 0) {
        const entStr = activeEntities.map((e) => `${e.name} (${e.type}, role: ${e.role})`).join(", ");
        contextDirectives.push(`ACTIVE TRACKED ENTITIES: ${entStr}.`);
      }
    }

    const activeConstraints = constraints.filter((c) => !c.isOverridden);
    if (activeConstraints.length > 0) {
      const constStr = activeConstraints.map((c) => `${c.key}: ${c.value} (${c.rawText})`).join("; ");
      contextDirectives.push(`ACTIVE CONSTRAINTS & REQUIREMENTS: ${constStr}.`);
    }

    for (const ref of resolvedReferences) {
      if (ref.isAmbiguous) {
        contextDirectives.push(
          `AMBIGUOUS REFERENCE: The user referenced "${ref.rawToken}", which could refer to multiple candidates (${ref.candidateTargets?.join(", ")}). Do not invent an assumption with false confidence; ask a concise clarification if necessary.`
        );
      } else if (ref.resolvedTarget) {
        contextDirectives.push(
          `REFERENCE RESOLVED: "${ref.rawToken}" refers to "${ref.resolvedTarget}".`
        );
      }
    }

    if (isTopicSwitch) {
      contextDirectives.push(
        `TOPIC SWITCH: The user has switched topics to "${activeTopic}". Do not apply previous unrelated constraints or product details to this new topic.`
      );
    }

    const lastUserTurn = [...history].reverse().find((h) => h.sender === "user");

    const updatedContext: ActiveConversationContext = {
      activeTopic,
      currentTask,
      userGoal,
      entities,
      constraints,
      preferences,
      recentReferences: resolvedReferences,
      conversationState: isTopicSwitch ? "topic_switched" : isFollowUp ? "active" : "active",
      lastMeaningfulUserIntent: isFollowUp ? "FOLLOW_UP" : "QUESTION",
      lastMeaningfulAssistantResponse: lastDoraTurn ? lastDoraTurn.text.slice(0, 120) : null,
      contextTimestamp: Date.now(),
      turnsCount: turnIndex + 1,
      isTopicSwitched: isTopicSwitch,
      isAmbiguousReference,
      topicHistory,
    };

    return {
      context: updatedContext,
      isFollowUp,
      isTopicSwitch,
      resolvedReferences,
      contextDirectives,
      diagnostics: {
        signals: {
          topicConfidence: activeTopic ? 0.95 : 0.5,
          entitiesCount: entities.length,
          activeConstraintsCount: activeConstraints.length,
          isFollowUp: isFollowUp ? 1 : 0,
          isTopicSwitch: isTopicSwitch ? 1 : 0,
          isAmbiguousReference: isAmbiguousReference ? 1 : 0,
        },
        reasoningTrace,
      },
    };
  }

  /**
   * Reconstructs initial context from previous conversation turns
   */
  public reconstructContextFromHistory(history: ConversationTurn[]): ActiveConversationContext {
    let activeTopic: string | null = null;
    let currentTask: string | null = null;
    const entities: TrackedEntity[] = [];
    const constraints: ConversationConstraint[] = [];
    const topicHistory: Array<{ topic: string; endedAtTurn: number }> = [];

    for (let i = 0; i < history.length; i++) {
      const turn = history[i];
      if (turn.sender !== "user") continue;

      const domain = this.detectExplicitTopic(turn.text);
      if (domain) {
        if (activeTopic && this.isExplicitTopicSwitch(turn.text, activeTopic, domain.topic)) {
          topicHistory.push({ topic: activeTopic, endedAtTurn: i - 1 });
          activeTopic = domain.topic;
          currentTask = domain.task;
        } else if (!activeTopic) {
          activeTopic = domain.topic;
          currentTask = domain.task;
        }
      }

      // Extract entities
      const newEnts = this.extractEntities(turn.text, i);
      for (const ent of newEnts) {
        if (!entities.some((e) => e.name.toLowerCase() === ent.name.toLowerCase())) {
          entities.push(ent);
        }
      }

      // Extract constraints
      const newConsts = this.extractConstraints(turn.text, i);
      for (const c of newConsts) {
        const existing = constraints.find((ec) => !ec.isOverridden && ec.category === c.category);
        if (existing) {
          existing.isOverridden = true;
        }
        constraints.push(c);
      }
    }

    if (!activeTopic && entities.length > 0) {
      activeTopic = `${entities[0].name} discussion`;
      currentTask = "product_research";
    }

    return {
      activeTopic,
      currentTask,
      userGoal: activeTopic ? `Explore / discuss ${activeTopic}` : null,
      entities,
      constraints,
      preferences: [],
      recentReferences: [],
      conversationState: activeTopic ? "active" : "idle",
      lastMeaningfulUserIntent: null,
      lastMeaningfulAssistantResponse: null,
      contextTimestamp: Date.now(),
      turnsCount: history.length,
      isTopicSwitched: false,
      isAmbiguousReference: false,
      topicHistory,
    };
  }

  /**
   * Detects explicit domain/topic from user input
   */
  private detectExplicitTopic(text: string): { topic: string; task: string } | null {
    for (const d of this.topicDomains) {
      if (d.keywords.test(text)) {
        return { topic: d.topic, task: d.task };
      }
    }
    return null;
  }

  /**
   * Evaluates if a new detected domain is an explicit topic switch
   */
  private isExplicitTopicSwitch(text: string, currentTopic: string, newTopic: string): boolean {
    if (currentTopic.toLowerCase() === newTopic.toLowerCase()) {
      return false;
    }

    // Explicit transition phrases (e.g. "by the way", "forget that", "now tell me", "what about the weather")
    const hasSwitchPhrase =
      /\b(?:by\s+the\s+way|btw|now|onno\s*kotha|arekta\s*kotha|leave\s*that|forget\s*that|switch\s*to)\b/i.test(text);

    // Weather vs Laptop is a clear, incompatible domain switch
    const isDifferentMajorDomain =
      (currentTopic.includes("laptop") || currentTopic.includes("phone")) &&
      (newTopic.includes("weather") || newTopic.includes("time") || newTopic.includes("movie"));

    const isMovieVsTech =
      (currentTopic.includes("movie") && (newTopic.includes("laptop") || newTopic.includes("phone"))) ||
      ((currentTopic.includes("laptop") || currentTopic.includes("phone")) && newTopic.includes("movie"));

    return hasSwitchPhrase || isDifferentMajorDomain || isMovieVsTech;
  }

  /**
   * Extracts entities (Brands, Models, Devices, etc.)
   */
  private extractEntities(text: string, turnIndex: number): TrackedEntity[] {
    const results: TrackedEntity[] = [];

    for (const b of this.brandPatterns) {
      if (b.regex.test(text)) {
        results.push({
          id: `ent-${b.name.toLowerCase()}`,
          name: b.name,
          type: b.type,
          role: "primary",
          firstMentionedTurn: turnIndex,
          lastMentionedTurn: turnIndex,
        });
      }
    }

    for (const m of this.modelPatterns) {
      if (m.regex.test(text)) {
        results.push({
          id: `ent-${m.name.toLowerCase().replace(/\s+/g, "-")}`,
          name: m.name,
          type: m.type,
          role: "primary",
          firstMentionedTurn: turnIndex,
          lastMentionedTurn: turnIndex,
        });
      }
    }

    return results;
  }

  /**
   * Extracts constraints (Budget, Technical Specs, Brand Exclusions)
   */
  private extractConstraints(text: string, turnIndex: number): ConversationConstraint[] {
    const results: ConversationConstraint[] = [];
    const lower = text.toLowerCase();

    // 1. Budget constraint (e.g. "under 80k", "budget is 80k", "20k er moddhe", "90k is okay", "max 90k")
    const budgetMatch = text.match(/\b(?:budget\s*(?:is|hoche)?\s*|under\s*|within\s*|upto\s*|max\s*|moddhe\s*|actually\s*)?(\d{1,3}(?:[,\.]\d{3})*|\d+)\s*(?:k|thousand|taka|tk|usd|\$)\b/i) ||
      text.match(/(\d+)\s*k\s*(?:er\s*moddhe|is\s*okay|budget)/i);

    if (budgetMatch) {
      const rawNum = budgetMatch[1].replace(/,/g, "");
      let numVal = parseInt(rawNum, 10);
      if (budgetMatch[0].toLowerCase().includes("k")) {
        numVal = numVal * 1000;
      }

      results.push({
        id: `const-budget-${turnIndex}`,
        category: "budget",
        key: "budget",
        value: numVal,
        rawText: budgetMatch[0].trim(),
        operator: "<=",
        updatedAtTurn: turnIndex,
      });
    }

    // 2. Feature / GPU requirement (e.g. "must have RTX GPU", "needs RTX 4060", "with 16GB RAM")
    if (/\b(?:must\s+have|need|with|requires?)\s+(?:an?\s+)?rtx(?:\s+gpu)?\b/i.test(lower) || /\brtx\s+gpu\b/i.test(lower)) {
      results.push({
        id: `const-gpu-${turnIndex}`,
        category: "feature_required",
        key: "required_gpu",
        value: "RTX GPU",
        rawText: "requires RTX GPU",
        operator: "==",
        updatedAtTurn: turnIndex,
      });
    }

    // 3. Brand exclusion (e.g. "I don't want HP", "not HP", "exclude Dell", "HP baad")
    const exclusionMatch = text.match(/\b(?:don'?t\s+want|not|exclude|no|baad)\s+(hp|dell|lenovo|asus|acer|apple|samsung)\b/i) ||
      text.match(/\b(hp|dell|lenovo|asus|acer|apple|samsung)\s+(?:don'?t\s+want|baad|exclude)\b/i);

    if (exclusionMatch) {
      const brand = exclusionMatch[1].toUpperCase();
      results.push({
        id: `const-excl-brand-${turnIndex}`,
        category: "brand_exclusion",
        key: "excluded_brand",
        value: brand,
        rawText: `excludedBrand = ${brand}`,
        operator: "!=",
        updatedAtTurn: turnIndex,
      });
    }

    return results;
  }

  /**
   * Resolves reference tokens (anaphora, comparative, ordinal)
   */
  private resolveReferences(
    text: string,
    context: {
      activeTopic: string | null;
      entities: TrackedEntity[];
      constraints: ConversationConstraint[];
      history: ConversationTurn[];
    }
  ): ResolvedReference[] {
    const results: ResolvedReference[] = [];
    const comparisonEntities = context.entities.filter(
      (e) => e.role === "comparison_target" || e.type === "brand" || e.type === "product"
    );

    for (const pattern of this.referencePatterns) {
      const match = text.match(pattern.regex);
      if (!match) continue;

      const rawToken = match[0];

      if (pattern.type === "comparative") {
        // "Which one" / "konta"
        if (comparisonEntities.length >= 2) {
          results.push({
            rawToken,
            resolvedTarget: comparisonEntities.map((e) => e.name).join(" vs "),
            confidence: 0.95,
            isAmbiguous: false,
            candidateTargets: comparisonEntities.map((e) => e.name),
            reason: `Resolved 'which one' to active comparison entities: ${comparisonEntities.map((e) => e.name).join(', ')}`,
          });
        } else if (context.activeTopic) {
          results.push({
            rawToken,
            resolvedTarget: context.activeTopic,
            confidence: 0.88,
            isAmbiguous: false,
            reason: `Resolved 'which one' to active topic: ${context.activeTopic}`,
          });
        }
      } else if (pattern.type === "ordinal_1") {
        // "First one" / "prothom ta"
        if (comparisonEntities.length >= 1) {
          results.push({
            rawToken,
            resolvedTarget: comparisonEntities[0].name,
            entityId: comparisonEntities[0].id,
            confidence: 0.95,
            isAmbiguous: false,
            reason: `Resolved 'first one' to primary entity: ${comparisonEntities[0].name}`,
          });
        } else {
          results.push({
            rawToken,
            confidence: 0.4,
            isAmbiguous: true,
            reason: "No preceding comparison entity list found for 'first one'",
          });
        }
      } else if (pattern.type === "ordinal_2") {
        // "Second one" / "the other one"
        if (comparisonEntities.length >= 2) {
          results.push({
            rawToken,
            resolvedTarget: comparisonEntities[1].name,
            entityId: comparisonEntities[1].id,
            confidence: 0.95,
            isAmbiguous: false,
            reason: `Resolved 'second one' to second comparison entity: ${comparisonEntities[1].name}`,
          });
        } else {
          results.push({
            rawToken,
            confidence: 0.4,
            isAmbiguous: true,
            reason: "Insufficient entities to resolve 'second one'",
          });
        }
      } else if (pattern.type === "pronoun" || pattern.type === "comparative_target") {
        // "it", "its", "eta", "oita", "oitar cheye"
        // Check if there are multiple entities without a clear winner
        if (comparisonEntities.length > 1 && !text.toLowerCase().includes("first") && !text.toLowerCase().includes("second")) {
          // If user previously spoke about one specific entity, resolve to it; otherwise mark ambiguous
          const lastUserTurn = [...context.history].reverse().find((h) => h.sender === "user");
          const specificMatch = lastUserTurn
            ? comparisonEntities.find((e) => lastUserTurn.text.toLowerCase().includes(e.name.toLowerCase()))
            : null;

          if (specificMatch) {
            results.push({
              rawToken,
              resolvedTarget: specificMatch.name,
              entityId: specificMatch.id,
              confidence: 0.88,
              isAmbiguous: false,
              reason: `Resolved pronoun to recently mentioned specific entity: ${specificMatch.name}`,
            });
          } else {
            // Ambiguous reference between comparison targets
            results.push({
              rawToken,
              isAmbiguous: true,
              confidence: 0.5,
              candidateTargets: comparisonEntities.map((e) => e.name),
              reason: `Ambiguous pronoun '${rawToken}' among multiple active entities: ${comparisonEntities.map((e) => e.name).join(', ')}`,
            });
          }
        } else if (comparisonEntities.length === 1) {
          results.push({
            rawToken,
            resolvedTarget: comparisonEntities[0].name,
            entityId: comparisonEntities[0].id,
            confidence: 0.92,
            isAmbiguous: false,
            reason: `Resolved pronoun to sole active entity: ${comparisonEntities[0].name}`,
          });
        } else if (context.activeTopic) {
          results.push({
            rawToken,
            resolvedTarget: context.activeTopic,
            confidence: 0.85,
            isAmbiguous: false,
            reason: `Resolved pronoun to active topic: ${context.activeTopic}`,
          });
        }
      }
    }

    return results;
  }
}

export const contextEngine = ContextEngine.getInstance();
