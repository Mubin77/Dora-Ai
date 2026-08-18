/**
 * Dora Intelligent Context Engine
 * 
 * Implements stateful Active Conversation Context for Dora's Core Intelligence:
 * - Semantic topic tracking and topic switch isolation
 * - Dedicated user goal tracking vs topic classification
 * - Generic task tracking across multi-turn interactions
 * - Entity state tracking with comparison roles
 * - Structured constraint management with in-place overrides
 * - Reference & anaphora resolution with explicit ambiguity states
 * - Context freshness and memory separation
 */

import {
  ConversationContext,
  ConversationConstraint,
  ConversationTurn,
  EntityType,
  EntityRole,
  ResolvedReference,
  TrackedEntity,
  ContextAnalysisResult,
  ConstraintCategory,
} from "./contextTypes";
import { contextStore } from "./contextStore";

interface TopicDomainDefinition {
  topic: string;
  task: string;
  goalTemplate: string;
  keywords: RegExp;
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

  // Pre-compiled domain definitions for generic classification
  private domainDefinitions: TopicDomainDefinition[] = [
    {
      topic: "gaming laptop",
      task: "purchase_research",
      goalTemplate: "Find suitable gaming laptop matching user specifications and budget",
      keywords: /\b(?:gaming\s*laptop|gaming\s*pc|rtx\s*\d+|gtx\s*\d+|rog|tuf|legion|alienware|predator|gpu|frame\s*rate|fps)\b/i,
    },
    {
      topic: "laptop recommendation",
      task: "purchase_research",
      goalTemplate: "Find suitable laptop matching user requirements",
      keywords: /\b(?:laptop|notebook|ultrabook|macbook|thinkpad|zenbook|laptop\s*kinbo|laptop\s*lagbe|laptop\s*dorkar)\b/i,
    },
    {
      topic: "smartphone recommendation",
      task: "purchase_research",
      goalTemplate: "Find suitable smartphone matching user requirements and budget",
      keywords: /\b(?:phone|smartphone|mobile|iphone|samsung\s*galaxy|pixel|redmi|xiaomi|oneplus|realme|camera\s*phone)\b/i,
    },
    {
      topic: "graphics & hardware specs",
      task: "technical_research",
      goalTemplate: "Analyze and explain hardware specifications and performance",
      keywords: /\b(?:rtx\s*\d+|gtx\s*\d+|gpu|graphics\s*card|nvidia|amd\s*radeon|processor|cpu|intel\s*core|ryzen|ram|vram|benchmark)\b/i,
    },
    {
      topic: "programming & debugging",
      task: "troubleshooting",
      goalTemplate: "Debug code and resolve software development error",
      keywords: /\b(?:python|javascript|typescript|react|nodejs|bug|error|exception|traceback|fix\s*code|debug|function|api|syntax|compiler)\b/i,
    },
    {
      topic: "weather inquiry",
      task: "information_request",
      goalTemplate: "Provide real-time weather and atmospheric conditions",
      keywords: /\b(?:weather|forecast|temperature|rain|abr\s*hawa|bristi|gorom|thanda|climate)\b/i,
    },
    {
      topic: "time & date",
      task: "information_request",
      goalTemplate: "Provide accurate current time or calendar date",
      keywords: /\b(?:time|clock|date|today|tomorrow|koyta\s*baje|tarik|somoy)\b/i,
    },
    {
      topic: "travel & itinerary",
      task: "planning",
      goalTemplate: "Plan travel itinerary, routes, and recommendations",
      keywords: /\b(?:travel|trip|tour|flight|hotel|resort|vacation|visit|cox'?s\s*bazar|sajek|sylhet|ticket|itinerary|ghurte\s*jabo)\b/i,
    },
    {
      topic: "movie & entertainment",
      task: "information_request",
      goalTemplate: "Provide movie, TV show, or entertainment details and recommendations",
      keywords: /\b(?:movie|film|oscar|cinema|actor|actress|director|netflix|series|season|episode|hollywood|bollywood|natok)\b/i,
    },
    {
      topic: "math & calculation",
      task: "calculation",
      goalTemplate: "Compute mathematical calculation or numeric conversion",
      keywords: /\b(?:calculate|convert|how\s*much\s*is|\d+\s*[\+\-\*\/]\s*\d+|percentage|formula|equation)\b/i,
    },
  ];

  // Pronouns and reference tokens in English, Bangla, and Banglish
  private referenceTokens = [
    { token: "which one", type: "comparative" as const },
    { token: "which is better", type: "comparative" as const },
    { token: "konta", type: "comparative" as const },
    { token: "konta bhalo", type: "comparative" as const },
    { token: "first one", type: "ordinal" as const },
    { token: "1st one", type: "ordinal" as const },
    { token: "prothom ta", type: "ordinal" as const },
    { token: "second one", type: "ordinal" as const },
    { token: "2nd one", type: "ordinal" as const },
    { token: "ditiyo ta", type: "ordinal" as const },
    { token: "the other one", type: "relative" as const },
    { token: "onno ta", type: "relative" as const },
    { token: "last one", type: "ordinal" as const },
    { token: "previous one", type: "ordinal" as const },
    { token: "ager ta", type: "ordinal" as const },
    { token: "shesh er ta", type: "ordinal" as const },
    { token: "it", type: "pronoun" as const },
    { token: "its", type: "pronoun" as const },
    { token: "this", type: "deictic" as const },
    { token: "that", type: "deictic" as const },
    { token: "they", type: "pronoun" as const },
    { token: "them", type: "pronoun" as const },
    { token: "these", type: "deictic" as const },
    { token: "those", type: "deictic" as const },
    { token: "eta", type: "deictic" as const },
    { token: "eita", type: "deictic" as const },
    { token: "oita", type: "deictic" as const },
    { token: "oitar", type: "deictic" as const },
    { token: "sheta", type: "deictic" as const },
    { token: "seta", type: "deictic" as const },
    { token: "eigula", type: "deictic" as const },
    { token: "oigula", type: "deictic" as const },
  ];

  /**
   * Primary entry point: Analyzes user input in the context of the conversation,
   * updates the persistent structured ConversationContext state, and returns rich analysis results.
   */
  public analyze(
    message: string,
    history: ConversationTurn[] = [],
    existingContext?: ConversationContext,
    sessionId: string = "default"
  ): ContextAnalysisResult {
    const rawContext = existingContext || contextStore.getOrCreate(sessionId);
    const trimmed = (message || "").trim();
    const turnIndex = rawContext.turnsCount + 1;

    const reasoningTrace: string[] = [];
    const signals: Record<string, number> = {};

    // 1. Detect Domain & Candidate Topic from current turn
    const detectedDomain = this.detectDomain(trimmed);

    // 2. Determine Topic Continuity vs Topic Switch
    const { isTopicSwitch, activeTopic, currentTask, userGoal } = this.evaluateTopicTransition(
      trimmed,
      detectedDomain,
      rawContext,
      history,
      reasoningTrace,
      signals
    );

    // 3. If Topic Switched, archive previous topic's state so old constraints do not contaminate new topic
    let workingContext = rawContext;
    if (isTopicSwitch && rawContext.activeTopic) {
      reasoningTrace.push(`Topic switched from "${rawContext.activeTopic}" to "${activeTopic}". Archiving old context.`);
      workingContext = contextStore.archiveCurrentTopic(rawContext, turnIndex);
    }

    // 4. Extract Entities from current message & merge with active entities
    const { newEntities, allEntities } = this.extractAndMergeEntities(
      trimmed,
      workingContext.entities,
      turnIndex,
      isTopicSwitch,
      reasoningTrace
    );

    // 5. Extract & In-Place Update Constraints
    const { newlyExtractedConstraints, updatedConstraintList } = this.extractAndMergeConstraints(
      trimmed,
      workingContext.constraints,
      turnIndex,
      isTopicSwitch,
      reasoningTrace
    );

    // 6. Perform Multi-Turn Reference & Anaphora Resolution with Ambiguity Safety
    const resolvedReferences = this.resolveReferences(
      trimmed,
      allEntities,
      activeTopic,
      workingContext,
      history,
      reasoningTrace
    );

    const isAmbiguous = resolvedReferences.some((r) => r.isAmbiguous);

    // 7. Follow-Up Detection
    const isFollowUp = this.detectFollowUp(
      trimmed,
      activeTopic,
      isTopicSwitch,
      resolvedReferences,
      newlyExtractedConstraints,
      allEntities,
      history,
      signals
    );

    // 8. Build Directives for Dora System Prompt
    const contextDirectives = this.generateContextDirectives(
      activeTopic,
      currentTask,
      userGoal,
      allEntities,
      updatedConstraintList,
      resolvedReferences,
      isFollowUp,
      isTopicSwitch,
      isAmbiguous
    );

    // 9. Build Updated Persistent Structured Context
    const updatedContext: ConversationContext = {
      ...workingContext,
      id: workingContext.id || sessionId,
      activeTopic,
      currentTask,
      userGoal,
      entities: allEntities,
      constraints: updatedConstraintList,
      recentReferences: resolvedReferences,
      conversationState: isAmbiguous ? "clarifying" : isTopicSwitch ? "topic_switched" : "active",
      turnsCount: turnIndex,
      isTopicSwitched: isTopicSwitch,
      isAmbiguousReference: isAmbiguous,
      updatedAt: Date.now(),
      contextTimestamp: Date.now(),
    };

    // Save in context store
    contextStore.save(sessionId, updatedContext);

    return {
      context: updatedContext,
      isFollowUp,
      isTopicSwitch,
      resolvedReferences,
      newEntities,
      updatedConstraints: newlyExtractedConstraints,
      contextDirectives,
      diagnostics: {
        signals,
        reasoningTrace,
      },
    };
  }

  /**
   * Detects domain matches from message text
   */
  private detectDomain(text: string): TopicDomainDefinition | null {
    for (const def of this.domainDefinitions) {
      if (def.keywords.test(text)) {
        return def;
      }
    }
    return null;
  }

  /**
   * Evaluates whether the current message continues the existing topic or introduces a new topic.
   */
  private evaluateTopicTransition(
    text: string,
    detectedDomain: TopicDomainDefinition | null,
    context: ConversationContext,
    history: ConversationTurn[],
    reasoningTrace: string[],
    signals: Record<string, number>
  ): {
    isTopicSwitch: boolean;
    activeTopic: string | null;
    currentTask: string | null;
    userGoal: string | null;
  } {
    const priorTopic = context.activeTopic;
    const priorTask = context.currentTask;
    const priorGoal = context.userGoal;

    // If no prior topic existed, initialize with detected domain or generic classification
    if (!priorTopic) {
      if (detectedDomain) {
        reasoningTrace.push(`Initialized new topic: "${detectedDomain.topic}" [task: ${detectedDomain.task}]`);
        return {
          isTopicSwitch: false,
          activeTopic: detectedDomain.topic,
          currentTask: detectedDomain.task,
          userGoal: detectedDomain.goalTemplate,
        };
      }

      // Check if entities or generic pattern exist
      const genericTopic = this.inferGenericTopic(text);
      return {
        isTopicSwitch: false,
        activeTopic: genericTopic.topic,
        currentTask: genericTopic.task,
        userGoal: genericTopic.goal,
      };
    }

    // Check if the current message contains explicit markers of a NEW domain incompatible with prior topic
    if (detectedDomain && detectedDomain.topic !== priorTopic) {
      // Check if this is a sub-topic refinement (e.g. "RTX 4060" inside "gaming laptop" or "laptop recommendation")
      const isCompatibleRefinement =
        (priorTopic.includes("laptop") && (detectedDomain.topic.includes("hardware") || detectedDomain.topic.includes("laptop"))) ||
        (priorTopic.includes("programming") && detectedDomain.topic.includes("programming"));

      if (isCompatibleRefinement) {
        reasoningTrace.push(`Refinement within domain "${priorTopic}" via sub-feature "${detectedDomain.topic}"`);
        signals["topic_refinement"] = 1.0;
        return {
          isTopicSwitch: false,
          activeTopic: priorTopic,
          currentTask: priorTask || detectedDomain.task,
          userGoal: priorGoal || detectedDomain.goalTemplate,
        };
      }

      // Explicitly different domain (e.g., laptop -> weather, laptop -> movie, travel -> python)
      reasoningTrace.push(`Genuine topic switch detected: "${priorTopic}" -> "${detectedDomain.topic}"`);
      signals["topic_switch"] = 1.0;
      return {
        isTopicSwitch: true,
        activeTopic: detectedDomain.topic,
        currentTask: detectedDomain.task,
        userGoal: detectedDomain.goalTemplate,
      };
    }

    // If no new explicit domain detected:
    // Check if user message is a follow-up, constraint adjustment, or continuation (e.g. "Actually 90k is okay", "What about battery?")
    const isConstraintOrFollowUp =
      /\b(?:budget|actually|kintu|tahole|battery|screen|ram|ssd|price|dam|better|which\s*one|eta|oita|konta)\b/i.test(text) ||
      /\d+\s*(?:k|thousand|tk|taka)/i.test(text) ||
      text.split(/\s+/).length <= 7;

    if (isConstraintOrFollowUp && priorTopic) {
      reasoningTrace.push(`Continuing existing topic "${priorTopic}" with follow-up or refinement.`);
      signals["topic_continuity"] = 1.0;
      return {
        isTopicSwitch: false,
        activeTopic: priorTopic,
        currentTask: priorTask,
        userGoal: priorGoal,
      };
    }

    // Otherwise check for generic topic change
    const generic = this.inferGenericTopic(text);
    if (generic.topic && generic.topic !== priorTopic) {
      // If words are completely orthogonal
      const isOrthogonal = !this.isSemanticallyRelated(text, priorTopic);
      if (isOrthogonal) {
        reasoningTrace.push(`Topic switched to generic topic "${generic.topic}"`);
        signals["topic_switch_generic"] = 1.0;
        return {
          isTopicSwitch: true,
          activeTopic: generic.topic,
          currentTask: generic.task,
          userGoal: generic.goal,
        };
      }
    }

    return {
      isTopicSwitch: false,
      activeTopic: priorTopic,
      currentTask: priorTask,
      userGoal: priorGoal,
    };
  }

  /**
   * Infers generic topic, task, and goal when no predefined domain keyword matches
   */
  private inferGenericTopic(text: string): {
    topic: string | null;
    task: string | null;
    goal: string | null;
  } {
    const lower = text.toLowerCase();

    if (/\b(?:compare|comparison|vs|versus|tarthamyo|parthokko)\b/i.test(lower)) {
      return {
        topic: "comparative analysis",
        task: "comparison",
        goal: "Compare options and highlight strengths and trade-offs",
      };
    }

    if (/\b(?:how\s+to|explain|what\s+is|kivabe|ki\s+eta|meaning|definition)\b/i.test(lower)) {
      return {
        topic: "explanation request",
        task: "research",
        goal: "Provide clear explanation and concept breakdown",
      };
    }

    if (/\b(?:write|draft|compose|email|letter|poem|golpo|kobita|likhe\s*dao)\b/i.test(lower)) {
      return {
        topic: "content creation",
        task: "writing",
        goal: "Draft requested text or creative content",
      };
    }

    if (/\b(?:hi|hello|hey|kemon\s*acho|bhalo\s*achi|good\s*morning|good\s*night)\b/i.test(lower)) {
      return {
        topic: "social greeting",
        task: "casual_conversation",
        goal: "Engage in friendly natural greeting",
      };
    }

    return {
      topic: null,
      task: null,
      goal: null,
    };
  }

  private isSemanticallyRelated(text: string, priorTopic: string): boolean {
    const topicWords = priorTopic.toLowerCase().split(/\s+/);
    const textLower = text.toLowerCase();
    return topicWords.some((w) => w.length > 3 && textLower.includes(w));
  }

  /**
   * Extracts entities from text and merges with active entity state
   */
  private extractAndMergeEntities(
    text: string,
    existingEntities: TrackedEntity[],
    turnIndex: number,
    isTopicSwitch: boolean,
    reasoningTrace: string[]
  ): { newEntities: TrackedEntity[]; allEntities: TrackedEntity[] } {
    // If topic switched, active entities from old topic are archived
    const baseEntities = isTopicSwitch
      ? existingEntities.map((e) => ({ ...e, status: "archived" as const }))
      : [...existingEntities];

    const newEntities: TrackedEntity[] = [];

    // Check for comparison statements (e.g. "I am comparing ASUS and Lenovo", "Compare ASUS, Lenovo and Dell")
    const comparisonMatch = text.match(/\b(?:comparing|compare|vs|versus|moddhe)\s+([A-Za-z0-9\s,\/&]+)/i);
    const isComparingIntent = Boolean(comparisonMatch) || /\b(?:compare|comparing|vs)\b/i.test(text);

    // Named product & brand matchers
    const knownBrands = [
      "ASUS", "Lenovo", "Dell", "HP", "Apple", "MacBook", "Acer", "MSI",
      "Samsung", "Google", "Pixel", "Xiaomi", "OnePlus", "Sony", "Microsoft", "Razer"
    ];

    const knownHardware = [
      "RTX 4060", "RTX 4070", "RTX 4080", "RTX 4090", "RTX 4050", "RTX 3060", "RTX 3050",
      "GTX 1650", "Intel i7", "Intel i5", "Intel i9", "Ryzen 7", "Ryzen 5", "Ryzen 9",
      "M1", "M2", "M3", "M4", "OLED", "IPS", "16GB RAM", "32GB RAM", "1TB SSD"
    ];

    const extractedNames: Array<{ name: string; type: EntityType }> = [];

    for (const brand of knownBrands) {
      const regex = new RegExp(`\\b${brand}\\b`, "i");
      if (regex.test(text)) {
        extractedNames.push({ name: brand, type: "brand" });
      }
    }

    for (const hw of knownHardware) {
      const regex = new RegExp(`\\b${hw.replace(/\s+/g, "\\s*")}\\b`, "i");
      if (regex.test(text)) {
        extractedNames.push({ name: hw, type: "product" });
      }
    }

    // Determine role: if comparison intent is present and 2+ brands found, assign 'comparison_target'
    const brandCount = extractedNames.filter((e) => e.type === "brand").length;
    const roleToAssign: EntityRole = (isComparingIntent || brandCount >= 2)
      ? "comparison_target"
      : "primary";

    const allEntities = [...baseEntities];

    for (const item of extractedNames) {
      const existingIdx = allEntities.findIndex(
        (e) => e.name.toLowerCase() === item.name.toLowerCase() && e.status === "active"
      );

      if (existingIdx > -1) {
        // Update mention
        allEntities[existingIdx] = {
          ...allEntities[existingIdx],
          lastMentionedTurn: turnIndex,
          mentionCount: allEntities[existingIdx].mentionCount + 1,
          role: roleToAssign === "comparison_target" ? "comparison_target" : allEntities[existingIdx].role,
        };
      } else {
        const newEntity: TrackedEntity = {
          id: `ent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: item.name,
          type: item.type,
          role: roleToAssign,
          firstMentionedTurn: turnIndex,
          lastMentionedTurn: turnIndex,
          mentionCount: 1,
          status: "active",
        };
        newEntities.push(newEntity);
        allEntities.push(newEntity);
        reasoningTrace.push(`Tracked entity: "${newEntity.name}" [role: ${newEntity.role}]`);
      }
    }

    return { newEntities, allEntities };
  }

  /**
   * Extracts constraints and performs in-place overrides without creating conflicting duplicates
   */
  private extractAndMergeConstraints(
    text: string,
    existingConstraints: ConversationConstraint[],
    turnIndex: number,
    isTopicSwitch: boolean,
    reasoningTrace: string[]
  ): {
    newlyExtractedConstraints: ConversationConstraint[];
    updatedConstraintList: ConversationConstraint[];
  } {
    // If topic switched, prior constraints are marked overridden/inactive for the new topic
    let constraintList: ConversationConstraint[] = isTopicSwitch
      ? existingConstraints.map((c) => ({ ...c, isOverridden: true }))
      : [...existingConstraints];

    const newlyExtractedConstraints: ConversationConstraint[] = [];
    const now = Date.now();

    // 1. Budget Constraint Extraction (e.g., "budget 80k", "under 90k", "actually 90k is okay", "max 1 lakh")
    const budgetMatch = text.match(
      /\b(?:budget|under|within|max|upto|actually|moddhe|khoroch)?\s*(\d+(?:\.\d+)?)\s*(k|thousand|lakh|lac|taka|tk|\$|usd|euro|inr)?\b/i
    );

    if (budgetMatch && (budgetMatch[2] || /\b(?:budget|under|upto|actually|moddhe)\b/i.test(text))) {
      const rawNum = parseFloat(budgetMatch[1]);
      let multiplier = 1;
      const unit = (budgetMatch[2] || "").toLowerCase();

      if (unit === "k" || unit === "thousand") multiplier = 1000;
      else if (unit === "lakh" || unit === "lac") multiplier = 100000;
      else if (rawNum < 500 && !unit) multiplier = 1000; // e.g. "budget is 80" -> 80,000

      const calculatedValue = rawNum * multiplier;

      if (calculatedValue >= 5000 || unit || /\b(?:budget|khoroch)\b/i.test(text)) {
        const newConstraintId = `c-budget-${now}`;

        // In-place override: mark any existing active budget constraint as overridden
        constraintList = constraintList.map((c) => {
          if (c.category === "budget" && !c.isOverridden) {
            reasoningTrace.push(`Budget constraint overridden: ${c.value} -> ${calculatedValue}`);
            return {
              ...c,
              isOverridden: true,
              overriddenBy: newConstraintId,
              updatedAt: now,
              updatedAtTurn: turnIndex,
            };
          }
          return c;
        });

        const newConstraint: ConversationConstraint = {
          id: newConstraintId,
          category: "budget",
          key: "max_budget",
          value: calculatedValue,
          operator: "<=",
          rawText: budgetMatch[0].trim(),
          createdAt: now,
          updatedAt: now,
          updatedAtTurn: turnIndex,
        };

        newlyExtractedConstraints.push(newConstraint);
        constraintList.push(newConstraint);
        reasoningTrace.push(`Added active budget constraint: <= ${calculatedValue}`);
      }
    }

    // 2. Feature Requirement Extraction (e.g. "must have RTX", "requires OLED", "needs 16GB RAM")
    const requireMatch = text.match(
      /\b(?:must\s+have|needs?|requires?|with|thaka\s*lagbe|dorkar)\s+([A-Za-z0-9\s]+?)(?:[\.,;]|$|\band\b|\bactually\b)/i
    );
    if (requireMatch && !/\b(?:budget|k|taka|money)\b/i.test(requireMatch[1])) {
      const featureName = requireMatch[1].trim();
      if (featureName.length >= 2 && !/^(?:a|the|an|some)$/i.test(featureName)) {
        const newConstraint: ConversationConstraint = {
          id: `c-feat-${now}-${Math.random().toString(36).slice(2, 5)}`,
          category: "feature_required",
          key: "feature",
          value: featureName,
          operator: "contains",
          rawText: requireMatch[0].trim(),
          createdAt: now,
          updatedAt: now,
          updatedAtTurn: turnIndex,
        };
        newlyExtractedConstraints.push(newConstraint);
        constraintList.push(newConstraint);
        reasoningTrace.push(`Added required feature constraint: "${featureName}"`);
      }
    }

    // 3. Exclusion Extraction (e.g. "don't want HP", "no Dell", "exclude Acer", "HP baad")
    const excludeMatch = text.match(
      /\b(?:don'?t\s*want|no|exclude|without|chara|baad)\s+([A-Za-z0-9\s]+?)(?:[\.,;]|$|\band\b)/i
    );
    if (excludeMatch) {
      const excludedItem = excludeMatch[1].trim();
      if (excludedItem.length >= 2 && !/^(?:a|the|problem|issue)$/i.test(excludedItem)) {
        const newConstraint: ConversationConstraint = {
          id: `c-excl-${now}-${Math.random().toString(36).slice(2, 5)}`,
          category: "brand_exclusion",
          key: "excluded_brand_or_feature",
          value: excludedItem,
          operator: "!=",
          rawText: excludeMatch[0].trim(),
          createdAt: now,
          updatedAt: now,
          updatedAtTurn: turnIndex,
        };
        newlyExtractedConstraints.push(newConstraint);
        constraintList.push(newConstraint);
        reasoningTrace.push(`Added exclusion constraint: != "${excludedItem}"`);
      }
    }

    return { newlyExtractedConstraints, updatedConstraintList: constraintList };
  }

  /**
   * Resolves pronouns, ordinals, and comparative references with structured ambiguity handling
   */
  private resolveReferences(
    text: string,
    entities: TrackedEntity[],
    activeTopic: string | null,
    context: ConversationContext,
    history: ConversationTurn[],
    reasoningTrace: string[]
  ): ResolvedReference[] {
    const resolved: ResolvedReference[] = [];
    const lower = text.toLowerCase();
    const activeEntities = entities.filter((e) => e.status === "active");

    for (const refDef of this.referenceTokens) {
      const regex = new RegExp(`\\b${refDef.token.replace(/\s+/g, "\\s*")}\\b`, "i");
      if (regex.test(lower)) {
        const rawToken = refDef.token;

        // COMPARATIVE REFERENCE ("which one", "which is better", "konta")
        if (refDef.type === "comparative") {
          const comparisonTargets = activeEntities.filter((e) => e.role === "comparison_target");
          const candidateEntities = comparisonTargets.length >= 2 ? comparisonTargets : activeEntities;

          if (candidateEntities.length === 2) {
            const targetNames = `${candidateEntities[0].name} vs ${candidateEntities[1].name}`;
            resolved.push({
              rawToken,
              tokenType: "comparative",
              status: "resolved",
              resolvedTarget: targetNames,
              confidence: 0.95,
              isAmbiguous: false,
              reason: `Resolved against comparison pair [${targetNames}]`,
            });
            reasoningTrace.push(`Resolved comparative reference "${rawToken}" -> "${targetNames}"`);
          } else if (candidateEntities.length > 2) {
            // 3+ candidate entities -> produce explicit AMBIGUOUS state without arbitrary picking
            const candidateNames = candidateEntities.map((e) => e.name);
            resolved.push({
              rawToken,
              tokenType: "comparative",
              status: "ambiguous",
              candidateTargets: candidateNames,
              confidence: 0.4,
              isAmbiguous: true,
              reason: `Multiple (${candidateEntities.length}) candidate options available without distinguishing criteria`,
            });
            reasoningTrace.push(`Ambiguous comparative reference "${rawToken}" with candidates [${candidateNames.join(", ")}]`);
          } else if (activeTopic) {
            resolved.push({
              rawToken,
              tokenType: "comparative",
              status: "resolved",
              resolvedTarget: activeTopic,
              confidence: 0.75,
              isAmbiguous: false,
              reason: `Resolved to active topic "${activeTopic}"`,
            });
          }
        }

        // ORDINAL REFERENCES ("first one", "second one", "last one", "ager ta")
        else if (refDef.type === "ordinal") {
          if (/first|1st|prothom/i.test(rawToken) && activeEntities.length >= 1) {
            const firstEntity = activeEntities[0];
            resolved.push({
              rawToken,
              tokenType: "ordinal",
              status: "resolved",
              resolvedTarget: firstEntity.name,
              entityId: firstEntity.id,
              confidence: 0.95,
              isAmbiguous: false,
              reason: `Resolved to first mentioned active entity "${firstEntity.name}"`,
            });
            reasoningTrace.push(`Resolved ordinal reference "${rawToken}" -> "${firstEntity.name}"`);
          } else if (/second|2nd|ditiyo/i.test(rawToken) && activeEntities.length >= 2) {
            const secondEntity = activeEntities[1];
            resolved.push({
              rawToken,
              tokenType: "ordinal",
              status: "resolved",
              resolvedTarget: secondEntity.name,
              entityId: secondEntity.id,
              confidence: 0.95,
              isAmbiguous: false,
              reason: `Resolved to second mentioned active entity "${secondEntity.name}"`,
            });
            reasoningTrace.push(`Resolved ordinal reference "${rawToken}" -> "${secondEntity.name}"`);
          } else if (/last|previous|ager|shesh/i.test(rawToken) && activeEntities.length >= 1) {
            const sortedByRecent = [...activeEntities].sort(
              (a, b) => b.lastMentionedTurn - a.lastMentionedTurn
            );
            const lastEntity = sortedByRecent[0];
            resolved.push({
              rawToken,
              tokenType: "ordinal",
              status: "resolved",
              resolvedTarget: lastEntity.name,
              entityId: lastEntity.id,
              confidence: 0.9,
              isAmbiguous: false,
              reason: `Resolved to most recently mentioned entity "${lastEntity.name}"`,
            });
            reasoningTrace.push(`Resolved ordinal reference "${rawToken}" -> "${lastEntity.name}"`);
          }
        }

        // RELATIVE REFERENCES ("the other one", "onno ta")
        else if (refDef.type === "relative" && activeEntities.length >= 2) {
          const secondEntity = activeEntities[1];
          resolved.push({
            rawToken,
            tokenType: "relative",
            status: "resolved",
            resolvedTarget: secondEntity.name,
            entityId: secondEntity.id,
            confidence: 0.9,
            isAmbiguous: false,
            reason: `Resolved relative reference to alternate candidate "${secondEntity.name}"`,
          });
          reasoningTrace.push(`Resolved relative reference "${rawToken}" -> "${secondEntity.name}"`);
        }

        // PRONOUNS / DEICTIC ("it", "eta", "eita", "oita", "sheta", "this", "that")
        else if (refDef.type === "pronoun" || refDef.type === "deictic") {
          if (activeEntities.length === 1) {
            const singularEntity = activeEntities[0];
            resolved.push({
              rawToken,
              tokenType: refDef.type,
              status: "resolved",
              resolvedTarget: singularEntity.name,
              entityId: singularEntity.id,
              confidence: 0.9,
              isAmbiguous: false,
              reason: `Resolved singular active entity "${singularEntity.name}"`,
            });
            reasoningTrace.push(`Resolved pronoun "${rawToken}" -> "${singularEntity.name}"`);
          } else if (activeEntities.length > 1) {
            // Check if last turn from user singled one out
            const lastMentioned = [...activeEntities].sort(
              (a, b) => b.lastMentionedTurn - a.lastMentionedTurn
            );
            if (lastMentioned[0].lastMentionedTurn > lastMentioned[1].lastMentionedTurn) {
              resolved.push({
                rawToken,
                tokenType: refDef.type,
                status: "resolved",
                resolvedTarget: lastMentioned[0].name,
                entityId: lastMentioned[0].id,
                confidence: 0.85,
                isAmbiguous: false,
                reason: `Resolved to most recently singled out entity "${lastMentioned[0].name}"`,
              });
            } else {
              resolved.push({
                rawToken,
                tokenType: refDef.type,
                status: "ambiguous",
                candidateTargets: activeEntities.map((e) => e.name),
                confidence: 0.4,
                isAmbiguous: true,
                reason: `Multiple active entities in context without specific antecedent`,
              });
            }
          } else if (activeTopic) {
            resolved.push({
              rawToken,
              tokenType: refDef.type,
              status: "resolved",
              resolvedTarget: activeTopic,
              confidence: 0.8,
              isAmbiguous: false,
              reason: `Resolved to active topic "${activeTopic}"`,
            });
          }
        }
      }
    }

    return resolved;
  }

  /**
   * Evaluates if the current turn is a follow-up
   */
  private detectFollowUp(
    text: string,
    activeTopic: string | null,
    isTopicSwitch: boolean,
    resolvedReferences: ResolvedReference[],
    newlyExtractedConstraints: ConversationConstraint[],
    entities: TrackedEntity[],
    history: ConversationTurn[],
    signals: Record<string, number>
  ): boolean {
    if (isTopicSwitch || !activeTopic) return false;

    const trimmed = text.trim();
    const isShort = trimmed.split(/\s+/).length <= 7;
    const hasFollowUpPrefix =
      /^(?:what\s+about|how\s+about|and|why|how|then|ar\s+eta|tahole|ebong|kintu|oitar)\b/i.test(trimmed);
    const hasResolvedRef = resolvedReferences.some((r) => !r.isAmbiguous && r.resolvedTarget);
    const hasConstraintUpdate = newlyExtractedConstraints.length > 0;
    const lastDoraTurn = [...history].reverse().find((h) => h.sender === "dora");
    const doraAskedQuestion = lastDoraTurn ? /[?？]/.test(lastDoraTurn.text) : false;

    const isFollowUp =
      hasFollowUpPrefix ||
      hasResolvedRef ||
      hasConstraintUpdate ||
      (isShort && (entities.length > 0 || doraAskedQuestion));

    if (isFollowUp) {
      signals["is_follow_up"] = 1.0;
    }

    return Boolean(isFollowUp);
  }

  /**
   * Generates context-aware prompt directives to guide Dora's response
   */
  private generateContextDirectives(
    activeTopic: string | null,
    currentTask: string | null,
    userGoal: string | null,
    entities: TrackedEntity[],
    constraints: ConversationConstraint[],
    resolvedReferences: ResolvedReference[],
    isFollowUp: boolean,
    isTopicSwitch: boolean,
    isAmbiguous: boolean
  ): string[] {
    const directives: string[] = [];

    if (activeTopic) {
      directives.push(`ACTIVE CONVERSATION TOPIC: ${activeTopic}`);
    }

    if (currentTask) {
      directives.push(`CURRENT TASK: ${currentTask}`);
    }

    if (userGoal) {
      directives.push(`USER GOAL: ${userGoal}`);
    }

    const activeEntities = entities.filter((e) => e.status === "active");
    if (activeEntities.length > 0) {
      const comparisonTargets = activeEntities.filter((e) => e.role === "comparison_target");
      if (comparisonTargets.length >= 2) {
        directives.push(
          `ACTIVE COMPARISON TARGETS: ${comparisonTargets.map((e) => e.name).join(" vs ")}`
        );
      } else {
        directives.push(
          `ACTIVE ENTITIES: ${activeEntities.map((e) => `${e.name} (${e.type})`).join(", ")}`
        );
      }
    }

    const activeConstraints = constraints.filter((c) => !c.isOverridden);
    if (activeConstraints.length > 0) {
      const constraintSummary = activeConstraints
        .map((c) => `${c.category}: ${c.operator || ""} ${c.value}`)
        .join("; ");
      directives.push(`CURRENT CONSTRAINTS: ${constraintSummary}`);
    }

    if (resolvedReferences.length > 0) {
      for (const ref of resolvedReferences) {
        if (ref.status === "resolved" && ref.resolvedTarget) {
          directives.push(
            `REFERENCE RESOLUTION: User mentioned "${ref.rawToken}" which refers to -> ${ref.resolvedTarget}`
          );
        } else if (ref.isAmbiguous && ref.candidateTargets) {
          directives.push(
            `AMBIGUITY NOTICE: User reference "${ref.rawToken}" is ambiguous among [${ref.candidateTargets.join(", ")}]. Address comparison or ask for clarification naturally without making false assumptions.`
          );
        }
      }
    }

    if (isTopicSwitch) {
      directives.push(
        `TOPIC SWITCH: The user has switched to a new topic. Do NOT mention prior topic constraints unless the user explicitly asks.`
      );
    } else if (isFollowUp) {
      directives.push(
        `FOLLOW-UP CONTINUITY: Seamlessly continue the active topic and task without repeating greetings or re-asking solved constraints.`
      );
    }

    return directives;
  }
}

export const contextEngine = ContextEngine.getInstance();
