/**
 * Dora Advanced Brain & Intelligence System
 * 
 * Implements context-aware intent classification, anaphora/pronoun resolution (Bangla/Banglish/English),
 * follow-up conversation linking, correction intelligence, static vs dynamic routing, and
 * multi-step reasoning guidance.
 */

import {
  ActiveConversationContext,
  ConversationContext,
  ConversationConstraint,
  ResolvedReference,
  TrackedEntity,
  ConversationTurn,
} from "./contextTypes";
import { contextEngine } from "./contextEngine";
import { contextStore } from "./contextStore";

export * from "./contextTypes";
export * from "./contextStore";

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
  isAmbiguous?: boolean;
  candidateTargets?: string[];
  resolvedEntities?: TrackedEntity[];
}

export interface BrainAnalysis {
  intent: BrainIntent;
  knowledgeType: KnowledgeType;
  confidence: number;
  contextReference: ContextualReference;
  reasoningRequired: boolean;
  multiStepGoal?: string;
  promptDirectives: string[];
  activeContext?: ConversationContext;
  context?: ConversationContext;
  contextUpdated?: boolean;
  topicSwitched?: boolean;
  resolvedReferences?: ResolvedReference[];
  ambiguity?: {
    isAmbiguous: boolean;
    candidateTargets?: string[];
  };
  confidenceSignals?: Record<string, number>;
  diagnostics?: {
    signals: Record<string, number>;
    reasoningTrace: string[];
  };
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
    /\b(?:eta|eita|oita|oitar|sheta|seta|eigula|oigula|ager\s*ta|ager\s*ti|last\s*one|previous\s*one|same\s*thing|that\s*one|this\s*one|the\s*other\s*one|second\s*one|first\s*one|last\s*thing|which\s*one)\b|[ওইএই][টত]া|[ওইএই]গুলো|[ওইএই]গুলা|আগেরটা/i;

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
  public analyze(
    message: string,
    history: ConversationTurn[] = [],
    existingContext?: ConversationContext,
    sessionId: string = "default"
  ): BrainAnalysis {
    const trimmed = (message || "").trim();
    const lower = trimmed.toLowerCase();
    const recentHistory = Array.isArray(history) ? history.slice(-12) : [];

    // 1. Run Structured Active Context Engine
    const contextResult = contextEngine.analyze(
      trimmed,
      recentHistory,
      existingContext,
      sessionId
    );

    const isCorrection = this.correctionRegex.test(trimmed);
    const refMatches = trimmed.match(this.referenceRegex);
    const hasReference = Boolean(refMatches) || contextResult.resolvedReferences.length > 0;
    const referenceTokens = refMatches ? Array.from(new Set(refMatches.map((m) => m.toLowerCase()))) : [];

    const isAmbiguous = contextResult.context.isAmbiguousReference;
    const candidateTargets = contextResult.resolvedReferences.flatMap((r) => r.candidateTargets || []);

    const contextRef: ContextualReference = {
      hasReference,
      referenceTokens,
      inferredSubject: contextResult.context.activeTopic || undefined,
      previousTopic: contextResult.context.topicHistory.slice(-1)[0]?.topic || undefined,
      isFollowUp: contextResult.isFollowUp,
      isCorrection,
      correctionDetail: isCorrection
        ? `User corrected previous turn`
        : undefined,
      isAmbiguous,
      candidateTargets: candidateTargets.length > 0 ? Array.from(new Set(candidateTargets)) : undefined,
      resolvedEntities: contextResult.context.entities,
    };

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
    else if (contextResult.isFollowUp) {
      intent = "FOLLOW_UP";
      if (contextResult.context.activeTopic) {
        promptDirectives.push(
          `ACTIVE CONVERSATION THREAD: User response is a direct follow-up constraint/answer regarding "${contextResult.context.activeTopic}". Do not ask them to repeat the question; combine with their earlier goal to answer directly.`
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
    else if (this.reasoningRegex.test(lower) || (contextResult.context.entities.filter((e) => e.role === "comparison_target").length >= 2 && /better|which|difference|compare/i.test(lower))) {
      intent = "REASONING";
      reasoningRequired = true;
      promptDirectives.push(
        "REASONING & COMPARISON: Break the problem down logically, check constraints, compare options objectively, and deliver a well-reasoned, clear recommendation in conversational language."
      );
    }
    // 5. Dynamic / Real-Time Information
    else if (this.dynamicRegex.test(lower) || contextResult.context.currentTask === "realtime_information") {
      intent = "REAL_TIME_INFORMATION";
      knowledgeType = "DYNAMIC";
    }
    // 6. Direct Question / Information
    else if (/[?？]$/.test(trimmed) || /^(?:what|who|where|when|why|how|ki|kobe|kothay|kivabe|keno)\b/i.test(lower)) {
      intent = "QUESTION";
    }

    // Merge structured context directives from contextEngine
    for (const d of contextResult.contextDirectives) {
      if (!promptDirectives.includes(d)) {
        promptDirectives.push(d);
      }
    }

    // Calculate structured confidence based on signal clarity
    let confidence = 0.85;
    if (isCorrection) confidence = 0.96;
    else if (isAmbiguous) confidence = 0.50; // Ambiguous explicitly lowers confidence rather than pretending certainty
    else if (contextResult.context.activeTopic && contextResult.isFollowUp) confidence = 0.93;
    else if (intent === "QUESTION" || intent === "REASONING") confidence = 0.90;

    return {
      intent,
      knowledgeType,
      confidence,
      contextReference: contextRef,
      reasoningRequired,
      promptDirectives,
      activeContext: contextResult.context,
      context: contextResult.context,
      contextUpdated: true,
      topicSwitched: contextResult.isTopicSwitch,
      resolvedReferences: contextResult.resolvedReferences,
      ambiguity: {
        isAmbiguous,
        candidateTargets: candidateTargets.length > 0 ? Array.from(new Set(candidateTargets)) : undefined,
      },
      confidenceSignals: contextResult.diagnostics.signals,
      diagnostics: contextResult.diagnostics,
    };
  }
}

export const brainEngine = BrainEngine.getInstance();
