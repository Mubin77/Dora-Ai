/**
 * Dora Intent Understanding Engine
 * 
 * Determines user intent using multi-turn conversational context:
 * - Current message
 * - Active ConversationContext (topic, task, userGoal, entities, constraints, state)
 * - Conversation history
 * - Pending assistant questions/proposals
 * 
 * Maintains strict conceptual separation between:
 * - TOPIC (Domain subject)
 * - INTENT (Speech act goal)
 * - TASK (Operational category)
 * - USER GOAL (High-level objective)
 */

import { ConversationContext, ConversationTurn, TrackedEntity } from "./contextTypes";
import { BrainIntent, IntentRelationship, StructuredIntent } from "./intentTypes";

export class IntentEngine {
  private static instance: IntentEngine;

  private constructor() {}

  public static getInstance(): IntentEngine {
    if (!IntentEngine.instance) {
      IntentEngine.instance = new IntentEngine();
    }
    return IntentEngine.instance;
  }

  // Correction markers
  private correctionRegex =
    /^(?:no|nah|na|wrong|vul|eta\s*na|eita\s*na|oita\s*na|areh?\s+ami|ami\s+eta\s+boli\s*ni|ami\s+oita\s+bolsi|bujhos\s*nai|bujhte\s*paro\s*ni|that'?s\s+not\s+what\s+i\s+(?:meant|said|asked)|not\s+this|incorrect|i\s+meant|actually\s+i\s+(?:said|meant))\b|না|ভুল|এটা\s*না|ওটা\s*না|বুঝিস\s*নাই|আমি\s*ওটা\s*বলি\s*নাই|আমি\s+বলেছিলাম/i;

  // Confirmation markers (Exact standalone affirmations)
  private confirmationRegex =
    /^(?:yes|yeah|yep|yup|sure|ok|okay|definitely|absolutely|exactly|that'?s\s+right|do\s+that|please\s+do|yeah\s+do\s+that|hae|haan|thik\s*ase|hmmm?)[.!]?$|^[হহা]াঁ[.!]?$|^হ্যাঁ[.!]?$|^ঠিক\s*আছে[.!]?$|^করো[.!]?$/i;

  // Rejection markers
  private rejectionRegex =
    /^(?:no|nope|nah|never|don'?t|do\s+not|not\s+that\s+one|not\s+now|cancel|skip|bad\s+dao|lagbe\s+na)\b|না|থাক|লাগবে\s*না|বাতিল/i;

  // Clarification request markers
  private clarificationRegex =
    /\b(?:what\s+do\s+you\s+mean|can\s+you\s+clarify|explain\s+that|clarify|why\s+did\s+you\s+say\s+that|what\s+does\s+that\s+mean|i\s+don'?t\s+understand|bujhlam\s+na|mane\s+ki|keno\s+bolle|kivabe\s+bolle)\b|মানে\s*কী|কেন\s*বললে|বুঝলাম\s*না|পরিষ্কার\s*করো/i;

  // Recommendation markers
  private recommendationRegex =
    /\b(?:recommend|suggestion|suggest|best|top|which\s+should\s+i\s+buy|what\s+should\s+i\s+get|help\s+me\s+choose|konta\s+kinto\s+parbo|konta\s+bhalo|konta\s+nebo|konta\s+kena\s+uchit|advice\s+on\s+buying|looking\s+for|need\s+a|want\s+a)\b|সুপারিশ|ভালো\s*হবে|কেনা\s*উচিত/i;

  // Comparison markers
  private comparisonRegex =
    /\b(?:compare|comparison|difference|vs|versus|which\s+is\s+better|which\s+one\s+is\s+better|konta\s+better|konta\s+bhalo|differ|pros\s+and\s+cons|konta\s+egiye)\b|তুলনা|পার্থক্য|কোনটা\s*ভালো/i;

  // Troubleshooting / debugging
  private troubleshootingRegex =
    /\b(?:fix|error|bug|issue|not\s+working|problem|debug|exception|crash|failed|stuck|help\s+solve|somossya|kaj\s+korche\s+na|cholche\s+na)\b|সমস্যা|কাজ\s*করছে\s*না|ত্রুটি/i;

  // How-to / Explanation
  private howToRegex =
    /\b(?:how\s+to|how\s+do\s+i|steps\s+to|guide\s+me|kivabe|kemne|how\s+can\s+i|teach\s+me)\b|কীভাবে|কিভাবে/i;

  // Calculation / Math
  private calculationRegex =
    /\b(?:calculate|sum|multiply|divide|equation|solve\s+for|percentage|formula|hishab|gun|vag|jog|biyog)\b|হিসাব|গণনা/i;

  // Creative / Writing
  private creativeRegex =
    /\b(?:write|compose|generate\s+a\s+story|poem|essay|script|draft|email|caption|golpo|kobita|likhe\s+dao)\b|লিখ|কবিতা|গল্প/i;

  // Real-time information
  private realtimeRegex =
    /\b(?:weather|temperature|forecast|today'?s\s+news|breaking\s+news|current\s+time|what\s+time\s+is\s+it|latest\s+price|stock\s+price|score|flight\s+status|ajker\s+khobor|abohawa|taapmatra|baje\s+koto)\b|আবহাওয়া|সময়|খবর|আজকের/i;

  // Emotional support
  private emotionalRegex =
    /\b(?:sad|depressed|lonely|tired|crying|failed|broken|hurt|angry|stressed|anxious|khub\s*kharap|mon\s*kharap|valo\s*lagtese\s*na|bhalo\s*lagche\s*na|pain|upset|frustrated)\b|মন\s*খারাপ|ভালো\s*লাগছে\s*না|কষ্ট/i;

  /**
   * Main intent classification method
   */
  public classifyIntent(
    message: string,
    history: ConversationTurn[] = [],
    context?: ConversationContext
  ): StructuredIntent {
    const trimmed = (message || "").trim();
    const lower = trimmed.toLowerCase();
    const signals: Record<string, number> = {};
    const directives: string[] = [];

    const hasContext = Boolean(
      context?.activeTopic ||
      (context?.entities && context.entities.length > 0) ||
      (context?.currentTask && context.currentTask !== "general_chat")
    );
    const activeTopic = context?.activeTopic;
    const isTopicSwitched = Boolean(context?.isTopicSwitched);
    const lastAssistantMsg = history.filter((h) => h.sender === "dora").slice(-1)[0]?.text || "";

    // 1. Check for Ambiguous Command with zero context
    if (this.isAmbiguousUnanchoredCommand(lower, context)) {
      signals["ambiguous_unanchored"] = 0.95;
      return {
        primaryIntent: "QUESTION",
        relationship: "STANDALONE",
        intentConfidence: 0.35,
        intentSignals: signals,
        requiresClarification: true,
        ambiguityReason: "No active task or clear antecedent for the action 'do that'",
        isMultiIntent: false,
        suggestedDirectives: [
          "AMBIGUOUS REQUEST: The user asked 'Can you do that?' or similar without an active task or subject. Ask a friendly, concise clarification question to understand what specific task they would like help with."
        ],
      };
    }

    // 2. CORRECTION INTENT (High Priority)
    if (this.correctionRegex.test(trimmed)) {
      signals["correction_marker"] = 0.98;
      
      // Extract target entity if stated (e.g., "No, I meant Lenovo")
      let targetEntity: string | undefined;
      const meantMatch = trimmed.match(/(?:meant|said|actually)\s+([A-Za-z0-9\-_]+)/i);
      if (meantMatch) {
        targetEntity = meantMatch[1];
      }

      directives.push(
        "USER CORRECTION: User is correcting a previous statement. Acknowledge with genuine warmth and empathy, update the target requirement immediately, and answer directly."
      );

      return {
        primaryIntent: "CORRECTION",
        relationship: "CORRECTION",
        intentConfidence: 0.96,
        intentSignals: signals,
        targetEntity,
        requiresClarification: false,
        isMultiIntent: false,
        suggestedDirectives: directives,
      };
    }

    // 3. CONFIRMATION / REJECTION (Context-Aware)
    if (this.confirmationRegex.test(trimmed) && trimmed.split(/\s+/).length <= 4) {
      signals["confirmation_marker"] = 0.95;
      const hasPendingQuestion = /[?？]$/.test(lastAssistantMsg.trim()) || /should\s+i|do\s+you\s+want|would\s+you\s+like/i.test(lastAssistantMsg);
      
      directives.push(
        `USER CONFIRMATION: User confirmed ("${trimmed}"). Proceed directly with the pending conversational proposal or action.`
      );

      return {
        primaryIntent: "CONFIRMATION",
        relationship: "CONFIRMATION",
        intentConfidence: hasPendingQuestion ? 0.95 : 0.85,
        intentSignals: signals,
        requiresClarification: false,
        isMultiIntent: false,
        suggestedDirectives: directives,
      };
    }

    if (this.rejectionRegex.test(trimmed) && trimmed.split(/\s+/).length <= 4) {
      signals["rejection_marker"] = 0.95;
      directives.push(
        `USER REJECTION: User declined ("${trimmed}"). Gracefully step back, do not force the suggestion, and ask how they would prefer to proceed.`
      );

      return {
        primaryIntent: "REJECTION",
        relationship: "REJECTION",
        intentConfidence: 0.95,
        intentSignals: signals,
        requiresClarification: false,
        isMultiIntent: false,
        suggestedDirectives: directives,
      };
    }

    // 4. CLARIFICATION REQUEST
    if (this.clarificationRegex.test(lower)) {
      signals["clarification_request"] = 0.92;
      directives.push(
        "USER ASKING FOR CLARIFICATION: User wants simpler or deeper explanation of the previous turn. Clarify clearly in friendly, conversational terms without being defensive."
      );

      return {
        primaryIntent: "CLARIFICATION",
        relationship: "CLARIFICATION",
        intentConfidence: 0.93,
        intentSignals: signals,
        requiresClarification: false,
        isMultiIntent: false,
        suggestedDirectives: directives,
      };
    }

    // 5. TOPIC SWITCH CHECK
    if (isTopicSwitched) {
      signals["topic_switch"] = 0.95;
      if (this.realtimeRegex.test(lower)) {
        signals["realtime_query"] = 0.95;
        return {
          primaryIntent: "REAL_TIME_INFORMATION",
          relationship: "TOPIC_SWITCH",
          intentConfidence: 0.95,
          intentSignals: signals,
          requiresClarification: false,
          isMultiIntent: false,
          suggestedDirectives: [
            `TOPIC SWITCH: User has transitioned away from earlier topics to "${activeTopic || "new query"}". Focus entirely on answering the new request directly.`
          ],
        };
      }
    }

    // 6. CONSTRAINT REFINEMENT (Attached to active task)
    // E.g. "My budget is 80k", "Under 80k", "Actually 90k is okay", "Samsung only", "Only ones with a pool"
    if (hasContext && this.isConstraintRefinement(trimmed, context)) {
      signals["constraint_refinement"] = 0.94;
      directives.push(
        `CONSTRAINT REFINEMENT: User updated specific constraints for active task "${context?.currentTask || "inquiry"}". Update your recommendations to strictly respect this constraint without resetting the topic.`
      );

      return {
        primaryIntent: "CONSTRAINT_UPDATE",
        relationship: "REFINEMENT",
        intentConfidence: 0.94,
        intentSignals: signals,
        requiresClarification: false,
        isMultiIntent: false,
        suggestedDirectives: directives,
      };
    }

    // 7. MULTI-INTENT DETECTION
    // E.g., "Compare these two phones and tell me which one you'd recommend."
    const multiIntent = this.detectMultiIntent(trimmed, lower);
    if (multiIntent) {
      signals["multi_intent"] = 0.92;
      return {
        primaryIntent: multiIntent.primary,
        secondaryIntent: multiIntent.secondary,
        relationship: "STANDALONE",
        intentConfidence: 0.92,
        intentSignals: signals,
        requiresClarification: false,
        isMultiIntent: true,
        suggestedDirectives: [
          `MULTI-INTENT REQUEST: User is requesting both [${multiIntent.primary}] and [${multiIntent.secondary}]. Satisfy both intents comprehensively.`
        ],
      };
    }

    // 8. CONTEXTUAL FOLLOW-UP QUESTION / EVALUATION (Banglish & Natural Speech)
    // E.g., "Accha eta kemon?", "What about battery?", "Ar battery?", "Which one has better battery?"
    if (hasContext && this.isContextualFollowUp(trimmed, lower, context)) {
      signals["contextual_follow_up"] = 0.90;
      const targetAspect = this.extractTargetAspect(lower);
      const isComparisonTask = context?.currentTask === "comparison" || (context?.entities?.filter(e => e.role === "comparison_target").length || 0) >= 2;

      let primary: BrainIntent = "INFORMATION";
      let secondary: BrainIntent | undefined = undefined;

      if (isComparisonTask || /which|konta|better|compare/i.test(lower)) {
        primary = "COMPARISON";
        secondary = "INFORMATION";
      } else if (/kemon|opinion|thoughts|review|worth|good/i.test(lower)) {
        primary = "OPINION";
        secondary = "RECOMMENDATION";
      }

      directives.push(
        `CONTEXTUAL FOLLOW-UP: User is asking about "${targetAspect || "active subject"}" regarding active topic "${context?.activeTopic}". Answer directly in context without asking them to repeat.`
      );

      return {
        primaryIntent: primary,
        secondaryIntent: secondary,
        relationship: "FOLLOW_UP",
        targetAspect,
        intentConfidence: 0.91,
        intentSignals: signals,
        requiresClarification: false,
        isMultiIntent: Boolean(secondary),
        suggestedDirectives: directives,
      };
    }

    // 9. STANDALONE INTENT DETECTION

    // Real-time information (weather, time, live score, news)
    if (this.realtimeRegex.test(lower)) {
      signals["realtime_query"] = 0.94;
      return {
        primaryIntent: "REAL_TIME_INFORMATION",
        relationship: isTopicSwitched ? "TOPIC_SWITCH" : "STANDALONE",
        intentConfidence: 0.94,
        intentSignals: signals,
        requiresClarification: false,
        isMultiIntent: false,
        suggestedDirectives: [],
      };
    }

    // Emotional support
    if (this.emotionalRegex.test(lower)) {
      signals["emotional_support"] = 0.95;
      directives.push(
        "EMOTIONAL SUPPORT: User is expressing emotional vulnerability or distress. Listen attentively with quiet empathy, comfort them warmly in Dora's soft voice."
      );
      return {
        primaryIntent: "EMOTIONAL_SUPPORT",
        relationship: "STANDALONE",
        intentConfidence: 0.95,
        intentSignals: signals,
        requiresClarification: false,
        isMultiIntent: false,
        suggestedDirectives: directives,
      };
    }

    // Comparison intent
    if (this.comparisonRegex.test(lower)) {
      signals["comparison_query"] = 0.92;
      return {
        primaryIntent: "COMPARISON",
        relationship: "STANDALONE",
        intentConfidence: 0.92,
        intentSignals: signals,
        requiresClarification: false,
        isMultiIntent: false,
        suggestedDirectives: [
          "COMPARISON REQUEST: Break down differences objectively, weigh pros and cons, and deliver a well-structured comparison."
        ],
      };
    }

    // Recommendation / Purchase intent
    if (this.recommendationRegex.test(lower) || /\b(?:need\s+a|want\s+a|looking\s+for\s+a)\s+(?:laptop|phone|camera|car|hotel|monitor|gpu|pc)\b/i.test(lower)) {
      signals["recommendation_query"] = 0.93;
      return {
        primaryIntent: "RECOMMENDATION",
        relationship: "STANDALONE",
        intentConfidence: 0.93,
        intentSignals: signals,
        requiresClarification: false,
        isMultiIntent: false,
        suggestedDirectives: [
          "RECOMMENDATION REQUEST: Present curated top options fitting user criteria, highlighting distinctive strengths and value."
        ],
      };
    }

    // Troubleshooting / Debugging
    if (this.troubleshootingRegex.test(lower)) {
      signals["troubleshooting_query"] = 0.90;
      return {
        primaryIntent: "TROUBLESHOOTING",
        secondaryIntent: "HOW_TO",
        relationship: "STANDALONE",
        intentConfidence: 0.90,
        intentSignals: signals,
        requiresClarification: false,
        isMultiIntent: true,
        suggestedDirectives: [],
      };
    }

    // How-to / Explanation
    if (this.howToRegex.test(lower)) {
      signals["how_to_query"] = 0.90;
      return {
        primaryIntent: "HOW_TO",
        relationship: "STANDALONE",
        intentConfidence: 0.90,
        intentSignals: signals,
        requiresClarification: false,
        isMultiIntent: false,
        suggestedDirectives: [],
      };
    }

    // Calculation / Math
    if (this.calculationRegex.test(lower) || /[0-9]+\s*[\+\-\*\/]\s*[0-9]+/.test(trimmed)) {
      signals["calculation_query"] = 0.92;
      return {
        primaryIntent: "CALCULATION",
        relationship: "STANDALONE",
        intentConfidence: 0.92,
        intentSignals: signals,
        requiresClarification: false,
        isMultiIntent: false,
        suggestedDirectives: [],
      };
    }

    // Creative / Writing
    if (this.creativeRegex.test(lower)) {
      signals["creative_query"] = 0.91;
      return {
        primaryIntent: "CREATIVE_REQUEST",
        relationship: "STANDALONE",
        intentConfidence: 0.91,
        intentSignals: signals,
        requiresClarification: false,
        isMultiIntent: false,
        suggestedDirectives: [],
      };
    }

    // General Question
    if (/[?？]$/.test(trimmed) || /^(?:what|who|where|when|why|how|ki|kobe|kothay|kivabe|keno)\b/i.test(lower)) {
      signals["general_question"] = 0.88;
      return {
        primaryIntent: "QUESTION",
        relationship: "STANDALONE",
        intentConfidence: 0.88,
        intentSignals: signals,
        requiresClarification: false,
        isMultiIntent: false,
        suggestedDirectives: [],
      };
    }

    // Casual conversation / Fallback
    signals["casual_conversation"] = 0.80;
    return {
      primaryIntent: "CASUAL_CONVERSATION",
      relationship: "STANDALONE",
      intentConfidence: 0.80,
      intentSignals: signals,
      requiresClarification: false,
      isMultiIntent: false,
      suggestedDirectives: [],
    };
  }

  /**
   * Identifies unanchored action commands lacking prior context
   */
  private isAmbiguousUnanchoredCommand(lower: string, context?: ConversationContext): boolean {
    const isVagueAction =
      /^(?:can\s+you\s+do\s+that|do\s+that|do\s+it|can\s+you\s+make\s+it|how\s+about\s+that|what\s+about\s+it|which\s+one)[?.]?$/i.test(lower);
    
    if (!isVagueAction) return false;

    // If there is no active task, no active topic, and no entities, it is completely ambiguous
    const hasContext = Boolean(
      context?.activeTopic ||
      context?.currentTask ||
      (context?.entities && context.entities.length > 0)
    );

    return !hasContext;
  }

  /**
   * Checks if message is a constraint refinement on active task
   */
  private isConstraintRefinement(trimmed: string, context?: ConversationContext): boolean {
    const lower = trimmed.toLowerCase();
    
    // Budget refinement: "My budget is 80k", "Under 80k", "Actually 90k is okay", "Max 100k"
    if (/\b(?:budget|taka|tk|k|thousand|dollar|\$|under|below|max|maximum|upto|within)\s*(?:is|hoche)?\s*[0-9]+|\b[0-9]+k\s*(?:is\s*okay|er\s*moddhe|budget)\b/i.test(lower)) {
      return true;
    }

    // Brand preference/exclusion refinement: "Actually Samsung only", "Only ASUS", "Dell chara"
    if (/\b(?:only|actually|just|chara|excluding|except)\s+(?:samsung|asus|lenovo|apple|dell|hp|acer|sony|intel|amd|nvidia)\b/i.test(lower)) {
      return true;
    }

    // Feature constraint refinement: "Only ones with a pool", "Must have RTX", "With 16gb ram"
    if (/\b(?:only\s+ones?\s+with|must\s+have|with\s+a?|having|including)\s+[a-z0-9\s]+/i.test(lower)) {
      return true;
    }

    return false;
  }

  /**
   * Detects multi-intent requests
   */
  private detectMultiIntent(
    trimmed: string,
    lower: string
  ): { primary: BrainIntent; secondary: BrainIntent } | null {
    // "Compare these two phones and tell me which one you'd recommend."
    if (
      this.comparisonRegex.test(lower) &&
      (this.recommendationRegex.test(lower) || /which\s+one\s+(?:would\s+you|do\s+you)\s+recommend/i.test(lower))
    ) {
      return { primary: "COMPARISON", secondary: "RECOMMENDATION" };
    }

    // "Find the latest price and tell me whether it's worth buying."
    if (
      (this.realtimeRegex.test(lower) || /find\s+(?:the\s+)?(?:latest\s+)?price/i.test(lower)) &&
      (/worth\s+buying|should\s+i\s+buy|your\s+advice|opinion/i.test(lower))
    ) {
      return { primary: "REAL_TIME_INFORMATION", secondary: "ADVICE" };
    }

    // "Check the weather tomorrow and tell me if I should carry an umbrella."
    if (
      /weather|forecast|rain/i.test(lower) &&
      /should\s+i|umbrella|advise/i.test(lower)
    ) {
      return { primary: "REAL_TIME_INFORMATION", secondary: "ADVICE" };
    }

    return null;
  }

  /**
   * Checks if input is a natural conversational follow-up
   */
  private isContextualFollowUp(
    trimmed: string,
    lower: string,
    context?: ConversationContext
  ): boolean {
    // Banglish / natural follow-ups: "Accha eta kemon?", "Eta kemon?", "Then?", "Tarpor?", "Eta nile?", "Ar battery?"
    if (
      /^(?:accha\s+)?(?:eta|eita|oita)\s+kemon[?.]?$/i.test(lower) ||
      /^(?:then|tarpor|and\s+then|after\s+that)[?.]?$/i.test(lower) ||
      /^(?:eta|eita|oita)\s+nile[?.]?$/i.test(lower) ||
      /^(?:ar|and|what\s+about)\s+(?:battery|price|display|camera|performance|warranty|ram|thermals)[?.]?$/i.test(lower) ||
      /\bwhich\s+one\s+has\s+better\s+[a-z]+\b/i.test(lower) ||
      /\bwhat\s+about\s+(?:its\s+)?(?:battery|camera|screen|specs|price)\b/i.test(lower)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Extracts targeted aspect from a follow-up
   */
  private extractTargetAspect(lower: string): string | undefined {
    const match = lower.match(
      /\b(?:battery|display|screen|camera|performance|gpu|cpu|ram|storage|price|dam|thermals|cooling|warranty|weight|build\s*quality)\b/i
    );
    return match ? match[0] : undefined;
  }
}

export const intentEngine = IntentEngine.getInstance();
