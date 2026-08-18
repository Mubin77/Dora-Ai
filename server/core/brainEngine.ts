/**
 * Dora Advanced Brain & Intelligence System
 * 
 * Implements context-aware intent classification, anaphora/pronoun resolution (Bangla/Banglish/English),
 * follow-up conversation linking, correction intelligence, static vs dynamic routing, structured reasoning,
 * and multi-step plan generation.
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
import { intentEngine } from "./intentEngine";
import { BrainIntent, StructuredIntent, IntentRelationship } from "./intentTypes";
import { reasoningEngine } from "./reasoningEngine";
import {
  ReasoningAnalysis,
  ReasoningType,
  ComplexityLevel,
  ConclusionStrategy,
  ReasoningSubtask,
  ComparisonFactor,
  TradeoffDimension,
  StructuredReasoningConstraint,
  ToolRequirement,
} from "./reasoningTypes";

export * from "./contextTypes";
export * from "./contextStore";
export * from "./intentTypes";
export * from "./reasoningTypes";
export { intentEngine } from "./intentEngine";
export { reasoningEngine } from "./reasoningEngine";

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
  structuredIntent: StructuredIntent;
  reasoningAnalysis: ReasoningAnalysis;
  knowledgeType: KnowledgeType;
  confidence: number;
  contextReference: ContextualReference;
  reasoningRequired: boolean;
  requiresClarification: boolean;
  ambiguityReason?: string;
  clarificationPrompt?: string;
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
    const recentHistory = Array.isArray(history) ? history.slice(-12) : [];

    // 1. Run Structured Active Context Engine
    const contextResult = contextEngine.analyze(
      trimmed,
      recentHistory,
      existingContext,
      sessionId
    );

    // 2. Run Context-First Structured Intent Engine
    const structuredIntent = intentEngine.classifyIntent(
      trimmed,
      recentHistory,
      contextResult.context
    );

    // Handle correction side-effects on context
    if (structuredIntent.primaryIntent === "CORRECTION" && structuredIntent.targetEntity) {
      for (const entity of contextResult.context.entities) {
        if (entity.status === "active" && entity.role === "primary") {
          entity.status = "superseded";
        }
      }
      contextResult.context.entities.unshift({
        id: `entity-${Date.now()}`,
        name: structuredIntent.targetEntity,
        type: "brand",
        role: "primary",
        firstMentionedTurn: recentHistory.length,
        lastMentionedTurn: recentHistory.length,
        mentionCount: 1,
        status: "active",
      });
      contextStore.save(sessionId, contextResult.context);
    }

    // Update last meaningful user intent on active context
    contextResult.context.lastMeaningfulUserIntent = structuredIntent.primaryIntent;

    // 3. Run Structured Reasoning Engine
    const reasoningAnalysis = reasoningEngine.analyze(
      trimmed,
      structuredIntent,
      contextResult.context,
      recentHistory
    );

    const isCorrection = structuredIntent.primaryIntent === "CORRECTION";
    const refMatches = trimmed.match(this.referenceRegex);
    const hasReference = Boolean(refMatches) || contextResult.resolvedReferences.length > 0;
    const referenceTokens = refMatches ? Array.from(new Set(refMatches.map((m) => m.toLowerCase()))) : [];

    const isAmbiguous =
      contextResult.context.isAmbiguousReference ||
      structuredIntent.requiresClarification ||
      reasoningAnalysis.requiresClarification;
    const candidateTargets = contextResult.resolvedReferences.flatMap((r) => r.candidateTargets || []);

    const isFollowUp = structuredIntent.relationship === "FOLLOW_UP" || contextResult.isFollowUp;

    const contextRef: ContextualReference = {
      hasReference,
      referenceTokens,
      inferredSubject: contextResult.context.activeTopic || undefined,
      previousTopic: contextResult.context.topicHistory.slice(-1)[0]?.topic || undefined,
      isFollowUp,
      isCorrection,
      correctionDetail: isCorrection ? `User corrected previous turn` : undefined,
      isAmbiguous,
      candidateTargets: candidateTargets.length > 0 ? Array.from(new Set(candidateTargets)) : undefined,
      resolvedEntities: contextResult.context.entities,
    };

    // Determine Knowledge Type (Static vs Dynamic)
    let knowledgeType: KnowledgeType = "STATIC";
    if (
      structuredIntent.primaryIntent === "REAL_TIME_INFORMATION" ||
      contextResult.context.currentTask === "realtime_information" ||
      reasoningAnalysis.reasoningType === "TOOL_ASSISTED_REASONING" ||
      reasoningAnalysis.toolRequirements.some(t => t.toolType === "weather" || t.toolType === "search")
    ) {
      knowledgeType = "DYNAMIC";
    }

    // Combine prompt directives (Intent + Context + Reasoning)
    const promptDirectives: string[] = [];
    for (const d of structuredIntent.suggestedDirectives) {
      if (!promptDirectives.includes(d)) {
        promptDirectives.push(d);
      }
    }
    for (const d of contextResult.contextDirectives) {
      if (!promptDirectives.includes(d)) {
        promptDirectives.push(d);
      }
    }
    for (const d of reasoningAnalysis.directives) {
      if (!promptDirectives.includes(d)) {
        promptDirectives.push(d);
      }
    }

    // Unified confidence score
    let confidence = Math.min(structuredIntent.intentConfidence, reasoningAnalysis.reasoningConfidence);
    if (isAmbiguous) {
      confidence = Math.min(confidence, 0.45);
    }

    return {
      intent: structuredIntent.primaryIntent,
      structuredIntent,
      reasoningAnalysis,
      knowledgeType,
      confidence,
      contextReference: contextRef,
      reasoningRequired: reasoningAnalysis.reasoningRequired,
      requiresClarification: isAmbiguous || structuredIntent.requiresClarification || reasoningAnalysis.requiresClarification,
      ambiguityReason: structuredIntent.ambiguityReason || (reasoningAnalysis.missingInformation.length > 0 ? `Missing: ${reasoningAnalysis.missingInformation.join(", ")}` : undefined),
      clarificationPrompt: reasoningAnalysis.clarificationPrompt,
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
      confidenceSignals: {
        ...contextResult.diagnostics.signals,
        ...structuredIntent.intentSignals,
        reasoning_confidence: reasoningAnalysis.reasoningConfidence,
      },
      diagnostics: {
        signals: {
          ...contextResult.diagnostics.signals,
          ...structuredIntent.intentSignals,
          reasoning_confidence: reasoningAnalysis.reasoningConfidence,
        },
        reasoningTrace: contextResult.diagnostics.reasoningTrace,
      },
    };
  }
}

export const brainEngine = BrainEngine.getInstance();
