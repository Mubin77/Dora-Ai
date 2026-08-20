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
import { planningEngine } from "./planningEngine";
import {
  PlanningAnalysis,
  TaskPlan,
  PlanStep,
  PlanStatus,
  PlanPriority,
  PlanComplexity,
  ExecutionStrategy,
  FailureStrategy,
  PlanActionType,
} from "./planningTypes";
import { verificationEngine } from "./verificationEngine";
import {
  VerificationAnalysis,
  VerificationStatus,
  ClaimVerification,
  Contradiction,
  CorrectionAction,
  ConfidenceAssessment,
  EvidenceAssessment,
  ConstraintCompliance,
} from "./verificationTypes";
import { memoryDecisionEngine } from "./memoryDecisionEngine";
import {
  MemoryDecision,
  MemoryRecord,
  MemoryType,
  MemorySource,
  MemoryStatus as MemoryRecordStatus,
} from "./memoryTypes";
import { memoryRetrievalEngine } from "./memoryRetrievalEngine";
import { MemoryRetrievalAnalysis } from "./memoryRetrievalTypes";
import { memoryConsolidationEngine } from "./memoryConsolidationEngine";
import { MemoryConsolidationAnalysis } from "./memoryConsolidationTypes";

export * from "./contextTypes";
export * from "./contextStore";
export * from "./intentTypes";
export * from "./reasoningTypes";
export * from "./planningTypes";
export * from "./verificationTypes";
export * from "./memoryTypes";
export * from "./memoryRetrievalTypes";
export * from "./memoryConsolidationTypes";
export { intentEngine } from "./intentEngine";
export { reasoningEngine } from "./reasoningEngine";
export { planningEngine } from "./planningEngine";
export { verificationEngine } from "./verificationEngine";
export { memoryDecisionEngine } from "./memoryDecisionEngine";
export { memoryRetrievalEngine } from "./memoryRetrievalEngine";
export { memoryConsolidationEngine } from "./memoryConsolidationEngine";

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
  planningAnalysis: PlanningAnalysis;
  verificationAnalysis?: VerificationAnalysis;
  memoryDecision?: MemoryDecision;
  memoryRetrieval?: MemoryRetrievalAnalysis;
  memoryConsolidation?: MemoryConsolidationAnalysis;
  activeTaskPlan?: TaskPlan;
  requiresPlanning: boolean;
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
    sessionId: string = "default",
    memories: MemoryRecord[] = []
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

    // 4. Run Structured Planning & Task Orchestration Engine
    const planningAnalysis = planningEngine.generatePlan(
      trimmed,
      structuredIntent,
      reasoningAnalysis,
      contextResult.context,
      recentHistory
    );

    // 5. Run Verification, Confidence Calibration & Self-Correction Engine
    const verificationAnalysis = verificationEngine.verify({
      message: trimmed,
      context: contextResult.context,
      intent: structuredIntent,
      reasoning: reasoningAnalysis,
      planning: planningAnalysis,
    });

    // Save updated active context (including activeTaskPlan) to persistent session store
    contextStore.save(sessionId, contextResult.context);

    const isCorrection = structuredIntent.primaryIntent === "CORRECTION";
    const refMatches = trimmed.match(this.referenceRegex);
    const hasReference = Boolean(refMatches) || contextResult.resolvedReferences.length > 0;
    const referenceTokens = refMatches ? Array.from(new Set(refMatches.map((m) => m.toLowerCase()))) : [];

    const isAmbiguous =
      contextResult.context.isAmbiguousReference ||
      structuredIntent.requiresClarification ||
      reasoningAnalysis.requiresClarification ||
      verificationAnalysis.requiresClarification;
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
      reasoningAnalysis.toolRequirements.some(t => t.toolType === "weather" || t.toolType === "search") ||
      (planningAnalysis.plan?.toolRequirements && planningAnalysis.plan.toolRequirements.length > 0) ||
      verificationAnalysis.missingEvidence.length > 0
    ) {
      knowledgeType = "DYNAMIC";
    }

    // Combine prompt directives (Intent + Context + Reasoning + Planning + Verification)
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
    for (const d of planningAnalysis.directives) {
      if (!promptDirectives.includes(d)) {
        promptDirectives.push(d);
      }
    }
    for (const d of verificationAnalysis.directives) {
      if (!promptDirectives.includes(d)) {
        promptDirectives.push(d);
      }
    }

    // Step 6 / Phase 2: Memory Decision Engine Evaluation (Non-intrusive to Context)
    const memoryDecision = memoryDecisionEngine.evaluate({
      message,
      context: contextResult.context,
      intent: structuredIntent,
      reasoning: reasoningAnalysis,
      existingMemories: memories,
    });

    if (memoryDecision.directive && !promptDirectives.includes(memoryDecision.directive)) {
      promptDirectives.push(memoryDecision.directive);
    }

    // Step 7 / Phase 2: Long-Term Memory Retrieval & Recall Engine
    const memoryRetrieval = memoryRetrievalEngine.retrieve({
      message,
      context: contextResult.context,
      intent: structuredIntent,
      memories,
      userId: sessionId,
    });

    for (const d of memoryRetrieval.directives) {
      if (!promptDirectives.includes(d)) {
        promptDirectives.push(d);
      }
    }

    // Step 8 / Phase 2: Memory Consolidation & Lifecycle Diagnostics (Read-Only Analysis)
    let memoryConsolidation: MemoryConsolidationAnalysis | undefined;
    if (memories && memories.length > 0) {
      memoryConsolidation = memoryConsolidationEngine.analyze(memories);
      for (const d of memoryConsolidation.directives) {
        if (!promptDirectives.includes(d)) {
          promptDirectives.push(d);
        }
      }
    }

    // Calibrated unified confidence score from Verification Engine
    const confidence = verificationAnalysis.confidence.calibratedScore;

    return {
      intent: structuredIntent.primaryIntent,
      structuredIntent,
      reasoningAnalysis,
      planningAnalysis,
      verificationAnalysis,
      memoryDecision,
      memoryRetrieval,
      memoryConsolidation,
      activeTaskPlan: planningAnalysis.plan,
      requiresPlanning: planningAnalysis.requiresPlanning,
      knowledgeType,
      confidence,
      contextReference: contextRef,
      reasoningRequired: reasoningAnalysis.reasoningRequired,
      requiresClarification: isAmbiguous || structuredIntent.requiresClarification || reasoningAnalysis.requiresClarification || verificationAnalysis.requiresClarification,
      ambiguityReason: structuredIntent.ambiguityReason || verificationAnalysis.clarificationReason || (reasoningAnalysis.missingInformation.length > 0 ? `Missing: ${reasoningAnalysis.missingInformation.join(", ")}` : undefined),
      clarificationPrompt: reasoningAnalysis.clarificationPrompt || planningAnalysis.plan?.clarificationRequirement,
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
        verification_confidence: verificationAnalysis.confidence.calibratedScore,
      },
      diagnostics: {
        signals: {
          ...contextResult.diagnostics.signals,
          ...structuredIntent.intentSignals,
          reasoning_confidence: reasoningAnalysis.reasoningConfidence,
          verification_confidence: verificationAnalysis.confidence.calibratedScore,
        },
        reasoningTrace: contextResult.diagnostics.reasoningTrace,
      },
    };
  }
}

export const brainEngine = BrainEngine.getInstance();
