/**
 * Dora Advanced Brain & Intelligence System
 * 
 * Implements context-aware intent classification, anaphora/pronoun resolution (Bangla/Banglish/English),
 * follow-up conversation linking, correction intelligence, static vs dynamic routing, and
 * multi-step reasoning guidance.
 */

export type BrainIntent =
  | "INFORMATION"
  | "QUESTION"
  | "REASONING"
  | "ADVICE"
  | "OPINION"
  | "CASUAL_CONVERSATION"
  | "MEMORY_RECALL"
  | "MEMORY_UPDATE"
  | "REAL_TIME_INFORMATION"
  | "TOOL_ACTION"
  | "CREATIVE_REQUEST"
  | "FOLLOW_UP"
  | "CLARIFICATION"
  | "EMOTIONAL_SUPPORT"
  | "CORRECTION";

export type KnowledgeType = "STATIC" | "DYNAMIC";

export interface ContextualReference {
  hasReference: boolean;
  referenceTokens: string[];
  inferredSubject?: string;
  previousTopic?: string;
  isFollowUp: boolean;
  isCorrection: boolean;
  correctionDetail?: string;
}

export interface BrainAnalysis {
  intent: BrainIntent;
  knowledgeType: KnowledgeType;
  confidence: number;
  contextReference: ContextualReference;
  reasoningRequired: boolean;
  multiStepGoal?: string;
  promptDirectives: string[];
}

export interface ConversationTurn {
  sender: "user" | "dora";
  text: string;
}

export class BrainEngine {
  private static instance: BrainEngine;

  private constructor() {}

  public static getInstance(): BrainEngine {
    if (!BrainEngine.instance) {
      BrainEngine.instance = new BrainEngine();
    }
    return BrainEngine.instance;
  }

  // Deictic pronouns and anaphoric reference markers
  private referenceRegex =
    /\b(?:eta|eita|oita|sheta|seta|eigula|oigula|ager\s*ta|ager\s*ti|last\s*one|previous\s*one|same\s*thing|that\s*one|this\s*one|the\s*other\s*one|second\s*one|first\s*one|last\s*thing)\b|[ওইএই][টত]া|[ওইএই]গুলো|[ওইএই]গুলা|আগেরটা/i;

  // User correction markers
  private correctionRegex =
    /^(?:na|nah|no|wrong|vul|eta\s*na|eita\s*na|oita\s*na|areh?\s+ami|ami\s+eta\s+boli\s*ni|ami\s+oita\s+bolsi|bujhos\s*nai|bujhte\s*paro\s*ni|that'?s\s+not\s+what\s+i\s+meant|not\s+this|incorrect)\b|না|ভুল|এটা\s*না|ওটা\s*না|বুঝিস\s*নাই|আমি\s*ওটা\s*বলি\s*নাই/i;

  // Emotional support markers
  private emotionalRegex =
    /\b(?:sad|depressed|lonely|tired|crying|failed|broken|hurt|angry|stressed|anxious|khub\s*kharap|mon\s*kharap|valo\s*lagtese\s*na|bhalo\s*lagche\s*na|pain|upset|frustrated)\b|মন\s*খারাপ|ভালো\s*লাগছে\s*না|কষ্ট/i;

  // Dynamic knowledge markers
  private dynamicRegex =
    /\b(?:today|current|now|latest|price|rate|score|news|weather|time|date|stock|match|flight|status|released|recently|ajke|ekhon|baje|tarik|dam|khoroch)\b/i;

  // Reasoning / calculation / comparison markers
  private reasoningRegex =
    /\b(?:calculate|solve|compare|difference|which\s+is\s+better|which\s+one\s+should|why|how\s+to\s+choose|best\s+option|konta\s+bhalo|konta\s+better|konta\s+neoa\s+uchit|pros\s+and\s+cons|logic|math|code\s+error|debug|optimize)\b/i;

  /**
   * Performs deep cognitive and contextual analysis of the current turn
   */
  public analyze(message: string, history: ConversationTurn[] = []): BrainAnalysis {
    const trimmed = message.trim();
    const lower = trimmed.toLowerCase();
    const recentHistory = history.slice(-6);

    const contextRef = this.resolveContextReferences(trimmed, recentHistory);
    let intent: BrainIntent = "CASUAL_CONVERSATION";
    let knowledgeType: KnowledgeType = "STATIC";
    let reasoningRequired = false;
    const promptDirectives: string[] = [];

    // 1. Correction Check (Highest Priority)
    if (contextRef.isCorrection) {
      intent = "CORRECTION";
      promptDirectives.push(
        "USER CORRECTION: The user is clarifying or correcting a previous turn. NEVER defend your previous response. Acknowledge with genuine warmth and empathy (e.g., 'Ohh, bujhlam 😭 Tui actually...'), pivot immediately to their intended meaning, and answer directly."
      );
    }
    // 2. Follow-Up Linking
    else if (contextRef.isFollowUp) {
      intent = "FOLLOW_UP";
      if (contextRef.inferredSubject) {
        promptDirectives.push(
          `ACTIVE CONVERSATION THREAD: User response is a direct follow-up constraint/answer regarding "${contextRef.inferredSubject}". Do not ask them to repeat the question; combine with their earlier goal to answer directly.`
        );
      }
    }
    // 3. Emotional Support
    else if (this.emotionalRegex.test(lower)) {
      intent = "EMOTIONAL_SUPPORT";
      promptDirectives.push(
        "EMOTIONAL SUPPORT: User is expressing emotional vulnerability or distress. Listen attentively with quiet empathy, comfort them warmly in Dora's soft voice, and avoid prematurely jumping into clinical problem-solving."
      );
    }
    // 4. Reasoning / Calculation / Complex Comparison
    else if (this.reasoningRegex.test(lower)) {
      intent = "REASONING";
      reasoningRequired = true;
      promptDirectives.push(
        "REASONING & COMPARISON: Break the problem down logically, check constraints, compare options objectively, and deliver a well-reasoned, clear recommendation in conversational language."
      );
    }
    // 5. Dynamic / Real-Time Information
    else if (this.dynamicRegex.test(lower)) {
      intent = "REAL_TIME_INFORMATION";
      knowledgeType = "DYNAMIC";
    }
    // 6. Direct Question / Information
    else if (/[?？]$/.test(trimmed) || /^(?:what|who|where|when|why|how|ki|kobe|kothay|kivabe|keno)\b/i.test(lower)) {
      intent = "QUESTION";
    }

    // Reference resolution directive (Anaphora understanding: "eta", "oita", etc.)
    if (contextRef.hasReference && contextRef.inferredSubject) {
      promptDirectives.push(
        `PRONOUN/REFERENCE RESOLUTION: The user's words ('${contextRef.referenceTokens.join(", ")}') refer to the previously discussed subject: "${contextRef.inferredSubject}". Treat 'eta'/'oita' as referring directly to this subject.`
      );
    }

    return {
      intent,
      knowledgeType,
      confidence: 0.94,
      contextReference: contextRef,
      reasoningRequired,
      promptDirectives,
    };
  }

  /**
   * Resolves pronouns, previous subjects, and follow-up turns from conversation history
   */
  private resolveContextReferences(message: string, history: ConversationTurn[]): ContextualReference {
    const trimmed = message.trim();
    const lower = trimmed.toLowerCase();

    const isCorrection = this.correctionRegex.test(trimmed);
    const refMatches = trimmed.match(this.referenceRegex);
    const hasReference = Boolean(refMatches);
    const referenceTokens = refMatches ? Array.from(new Set(refMatches.map((m) => m.toLowerCase()))) : [];

    // Find the last assistant turn and last user turn
    const lastDoraTurn = [...history].reverse().find((h) => h.sender === "dora");
    const lastUserTurn = [...history].reverse().find((h) => h.sender === "user");

    // Check if the current message is a short follow-up (e.g. "20k er moddhe", "blue", "yes", "first one")
    const isShortTurn = trimmed.split(/\s+/).length <= 6;
    const isDoraAskedQuestion = lastDoraTurn && /[?？]/.test(lastDoraTurn.text);
    const isFollowUp = (isShortTurn && Boolean(isDoraAskedQuestion)) || hasReference;

    // Infer subject from history
    let inferredSubject: string | undefined;
    if (lastUserTurn?.text) {
      inferredSubject = this.extractCoreSubject(lastUserTurn.text);
    }
    if (!inferredSubject && lastDoraTurn?.text) {
      inferredSubject = this.extractCoreSubject(lastDoraTurn.text);
    }

    let correctionDetail: string | undefined;
    if (isCorrection && lastDoraTurn) {
      correctionDetail = `User corrected previous response: "${lastDoraTurn.text.slice(0, 80)}..."`;
    }

    return {
      hasReference,
      referenceTokens,
      inferredSubject,
      previousTopic: lastUserTurn?.text,
      isFollowUp,
      isCorrection,
      correctionDetail,
    };
  }

  /**
   * Helper to extract the central topic/subject from a prior turn
   */
  private extractCoreSubject(text: string): string {
    // Strip common filler questions
    const clean = text
      .replace(/^(?:ekta|suggest|tell me about|what about|konta|which)\s+/i, "")
      .replace(/[?.,!]+$/, "")
      .trim();
    return clean.slice(0, 60);
  }
}

export const brainEngine = BrainEngine.getInstance();
