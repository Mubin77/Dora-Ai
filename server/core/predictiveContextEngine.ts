/**
 * Dora Predictive Context & Proactive Memory Orchestration Engine
 * Phase 2 — Step 6
 * 
 * Implements deterministic, non-LLM, privacy-safe, non-hallucinatory evaluation
 * of active plans, governed memories, confirmed user models, and conversational context
 * to proactively prepare safe, validated context for response generation.
 */

import { ConversationContext, ConversationTurn } from "./contextTypes";
import { StructuredIntent, BrainIntent } from "./intentTypes";
import { ReasoningAnalysis } from "./reasoningTypes";
import { PlanningAnalysis, TaskPlan, PlanStep, PlanStatus } from "./planningTypes";
import { VerificationAnalysis } from "./verificationTypes";
import { MemoryGovernanceAnalysis, MemoryGovernanceCandidate } from "./memoryGovernanceTypes";
import { LearningAnalysis, LearningPattern, PatternStatus } from "./adaptiveLearningTypes";
import {
  PredictiveContextInput,
  PredictiveContextAnalysis,
  ProactiveContextCandidate,
  PredictiveSignal,
  PredictiveSignalSource,
  PredictionType,
  SuppressionReason,
  PredictiveStatus,
} from "./predictiveContextTypes";

export class PredictiveContextEngine {
  // Confidence thresholds
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.75;
  private readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.50;

  // Default TTLs (in milliseconds)
  private readonly DEFAULT_PLAN_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly DEFAULT_PREFERENCE_TTL = 60 * 60 * 1000; // 1 hour
  private readonly DEFAULT_CONTEXT_TTL = 30 * 60 * 1000; // 30 minutes

  /**
   * Evaluates current cognitive context and returns proactive context analysis.
   */
  public evaluate(input: PredictiveContextInput): PredictiveContextAnalysis {
    const currentTime = input.options?.currentTime ?? Date.now();
    const message = input.message || "";
    const lowerMessage = message.toLowerCase().trim();

    const diagnostics = {
      signalsEvaluated: 0,
      candidatesGenerated: 0,
      candidatesAccepted: 0,
      candidatesRejected: 0,
      reasons: [] as string[],
    };

    const acceptedCandidates: ProactiveContextCandidate[] = [];
    const rejectedCandidates: ProactiveContextCandidate[] = [];
    const suppressionReasons: string[] = [];
    const directives: string[] = [];

    // =========================================================================
    // STEP 1: Fast-Path Casual / Greeting Check
    // =========================================================================
    const isCasualGreeting = this.isCasualOrGreeting(lowerMessage);
    const hasActiveMultiStepPlan =
      input.planning?.plan &&
      (input.planning.plan.status === "IN_PROGRESS" || input.planning.plan.status === "READY") &&
      input.planning.plan.steps.length > 1;

    if (isCasualGreeting && !hasActiveMultiStepPlan) {
      return {
        predictions: ["NO_PREDICTION"],
        acceptedCandidates: [],
        rejectedCandidates: [],
        suppressionReasons: ["CASUAL_INTERACTION"],
        activeTopic: input.context.activeTopic,
        confidence: 1.0,
        directives: [],
        requiresConfirmation: false,
        analysisStatus: "NO_PREDICTION",
        diagnostics: {
          signalsEvaluated: 1,
          candidatesGenerated: 0,
          candidatesAccepted: 0,
          candidatesRejected: 0,
          reasons: ["Casual greeting or pleasantry without active workflow"],
        },
      };
    }

    // =========================================================================
    // STEP 2: Sensitive Data Pre-Filtering
    // =========================================================================
    if (this.isSensitiveContent(message)) {
      suppressionReasons.push("SENSITIVE_DATA");
      diagnostics.reasons.push("Message contains sensitive credential pattern");
      return {
        predictions: ["NO_PREDICTION"],
        acceptedCandidates: [],
        rejectedCandidates: [],
        suppressionReasons,
        activeTopic: input.context.activeTopic,
        confidence: 0.0,
        directives: [],
        requiresConfirmation: false,
        analysisStatus: "SUPPRESSED",
        diagnostics,
      };
    }

    // =========================================================================
    // STEP 3: Extract Validated Predictive Signals
    // =========================================================================
    const signals = this.extractSignals(input, currentTime);
    diagnostics.signalsEvaluated = signals.length;

    // =========================================================================
    // STEP 4: Generate Proactive Candidates by Category
    // =========================================================================
    const rawCandidates: ProactiveContextCandidate[] = [];

    // Category A: Active Task Plan Continuation
    const planCandidate = this.evaluatePlanContinuation(input, currentTime);
    if (planCandidate) {
      rawCandidates.push(planCandidate);
    }

    // Category B: Preference Relevance (from Adaptive Learning & Governance)
    const preferenceCandidates = this.evaluatePreferenceRelevance(input, currentTime);
    rawCandidates.push(...preferenceCandidates);

    // Category C: Clarification Prediction
    const clarificationCandidate = this.evaluateClarificationPrediction(input, currentTime);
    if (clarificationCandidate) {
      rawCandidates.push(clarificationCandidate);
    }

    // Category D: Context Relevance (from Governed Memories)
    const contextCandidates = this.evaluateContextRelevance(input, currentTime);
    rawCandidates.push(...contextCandidates);

    diagnostics.candidatesGenerated = rawCandidates.length;

    // =========================================================================
    // STEP 5: Filter Candidates by Safety, Precedence, and Scoring
    // =========================================================================
    const activeTopic = input.context.activeTopic || "general";

    for (const candidate of rawCandidates) {
      const suppressionReason = this.evaluateCandidateSuppression(
        candidate,
        input,
        activeTopic,
        currentTime
      );

      if (suppressionReason) {
        candidate.isSafeToInject = false;
        candidate.suppressionReason = suppressionReason;
        rejectedCandidates.push(candidate);
        if (!suppressionReasons.includes(suppressionReason)) {
          suppressionReasons.push(suppressionReason);
        }
        diagnostics.candidatesRejected++;
        diagnostics.reasons.push(`Rejected candidate ${candidate.predictionType}: ${suppressionReason}`);
        continue;
      }

      // Candidate passes all safety checks
      candidate.isSafeToInject = true;
      acceptedCandidates.push(candidate);
      diagnostics.candidatesAccepted++;

      if (candidate.directive && !directives.includes(candidate.directive)) {
        directives.push(candidate.directive);
      }
    }

    // =========================================================================
    // STEP 6: Determine Final Analysis Status & Confidence
    // =========================================================================
    const predictions: PredictionType[] = acceptedCandidates.map((c) => c.predictionType);
    if (predictions.length === 0) {
      predictions.push("NO_PREDICTION");
    }

    const requiresConfirmation = acceptedCandidates.some((c) => c.requiresConfirmation);

    let maxConfidence = 0.0;
    if (acceptedCandidates.length > 0) {
      maxConfidence = Math.max(...acceptedCandidates.map((c) => c.confidence));
    } else if (rejectedCandidates.length > 0) {
      maxConfidence = 0.3;
    } else {
      maxConfidence = 1.0; // Safe NO_PREDICTION confidence
    }

    // Bounded in [0.0, 1.0]
    const finalConfidence = Math.min(1.0, Math.max(0.0, Number(maxConfidence.toFixed(4))));

    let analysisStatus: PredictiveStatus = "SUCCESS";
    if (acceptedCandidates.length === 0) {
      if (rejectedCandidates.length > 0) {
        analysisStatus = "SUPPRESSED";
      } else {
        analysisStatus = "NO_PREDICTION";
      }
    }

    return {
      predictions,
      acceptedCandidates,
      rejectedCandidates,
      suppressionReasons,
      activeTopic,
      confidence: finalConfidence,
      directives,
      requiresConfirmation,
      analysisStatus,
      diagnostics,
    };
  }

  // =========================================================================
  // SIGNAL EXTRACTION
  // =========================================================================

  private extractSignals(input: PredictiveContextInput, currentTime: number): PredictiveSignal[] {
    const signals: PredictiveSignal[] = [];

    // 1. Current Context Signals
    if (input.context.activeTopic) {
      signals.push({
        id: this.generateSignalId("CURRENT_CONTEXT", "active_topic", input.context.activeTopic, currentTime),
        source: "CURRENT_CONTEXT",
        signalKey: "active_topic",
        signalValue: input.context.activeTopic,
        confidence: 0.95,
        timestamp: currentTime,
        topic: input.context.activeTopic,
        isExplicit: false,
      });
    }

    // 2. Active Plan Signals
    if (input.planning?.plan) {
      const plan = input.planning.plan;
      signals.push({
        id: this.generateSignalId("ACTIVE_PLAN", "plan_status", plan.status, currentTime),
        source: "ACTIVE_PLAN",
        signalKey: "plan_status",
        signalValue: `${plan.id}:${plan.status}:${plan.objective}`,
        confidence: 0.95,
        timestamp: currentTime,
        topic: input.context.activeTopic,
        isExplicit: true,
        metadata: {
          planId: plan.id,
          status: plan.status,
          stepsCount: plan.steps.length,
          activeStepId: plan.activeStepId,
        },
      });
    }

    // 3. Adaptive Learning / Confirmed User Model Signals
    if (input.adaptiveLearning?.patterns) {
      for (const pattern of input.adaptiveLearning.patterns) {
        if (pattern.status === "CONFIRMED") {
          signals.push({
            id: this.generateSignalId("USER_MODEL", pattern.key, pattern.value, currentTime),
            source: "USER_MODEL",
            signalKey: pattern.key,
            signalValue: pattern.value,
            confidence: pattern.confidence,
            timestamp: pattern.lastObservedAt || currentTime,
            topic: pattern.category,
            isExplicit: !!pattern.isExplicit,
          });
        }
      }
    }

    // 4. Governed Long-Term Memory Signals
    if (input.governanceAnalysis) {
      const govList = input.governanceAnalysis.allowedMemories || input.governanceAnalysis.governedCandidates || [];
      for (const gov of govList) {
        if (gov.usageDecision === "ALLOW" || gov.usageDecision === "ALLOW_WITH_CAUTION") {
          signals.push({
            id: this.generateSignalId("CONFIRMED_MEMORY", gov.key, gov.value, currentTime),
            source: "CONFIRMED_MEMORY",
            signalKey: gov.key,
            signalValue: gov.value,
            confidence: gov.confidence,
            timestamp: currentTime,
            isExplicit: true,
          });
        }
      }
    }

    // 5. Intent Signals
    if (input.intent) {
      signals.push({
        id: this.generateSignalId("EXPLICIT_USER_INTENT", "primary_intent", input.intent.primaryIntent, currentTime),
        source: "EXPLICIT_USER_INTENT",
        signalKey: "primary_intent",
        signalValue: input.intent.primaryIntent,
        confidence: input.intent.intentConfidence || 0.9,
        timestamp: currentTime,
        isExplicit: true,
      });
    }

    return signals;
  }

  // =========================================================================
  // CATEGORY A: TASK PLAN CONTINUATION EVALUATION
  // =========================================================================

  private evaluatePlanContinuation(
    input: PredictiveContextInput,
    currentTime: number
  ): ProactiveContextCandidate | null {
    const plan = input.planning?.plan;
    if (!plan) return null;

    // 1. Terminated or Non-Active Plans do NOT produce task continuation
    if (plan.status === "COMPLETED" || plan.status === "CANCELLED" || plan.status === "FAILED") {
      return null;
    }

    // 2. Blocked Plan -> Handled by Clarification Prediction
    if (plan.status === "BLOCKED") {
      return null;
    }

    // 3. Inspect Steps and DAG Dependencies
    const steps = plan.steps || [];
    if (steps.length === 0) return null;

    // Build completedStepIds from steps with status COMPLETED
    const completedStepIds = new Set(
      steps.filter((s) => s.status === "COMPLETED").map((s) => s.id)
    );

    // Filter out already COMPLETED steps and active IN_PROGRESS steps
    // Candidates for NEXT step continuation are unstarted/ready steps (READY or NOT_STARTED)
    const pendingSteps = steps.filter(
      (s) => s.status === "READY" || s.status === "NOT_STARTED"
    );
    if (pendingSteps.length === 0) {
      return null;
    }

    // Step Map for checking dependency existence
    const stepMap = new Map<string, PlanStep>(steps.map((s) => [s.id, s]));

    // Collect all eligible steps whose dependencies are ALL strictly COMPLETED
    const eligibleSteps: PlanStep[] = [];

    for (const step of pendingSteps) {
      // Resolve dependencies from step.dependencies first, then fallback to plan.dependencies[step.id]
      const deps = step.dependencies ?? (plan.dependencies?.[step.id] ?? []);

      // If dependency list is empty, the step is independently eligible
      if (deps.length === 0) {
        eligibleSteps.push(step);
        continue;
      }

      // Otherwise ALL dependencies must exist in the plan and be COMPLETED
      const allDepsMet = deps.every((depId) => {
        const depStep = stepMap.get(depId);
        return depStep !== undefined && depStep.status === "COMPLETED" && completedStepIds.has(depId);
      });

      if (allDepsMet) {
        eligibleSteps.push(step);
      }
    }

    // If no eligible steps exist, return the suppressed DAG_DEPENDENCY_BLOCKED candidate
    if (eligibleSteps.length === 0) {
      return {
        id: this.generateCandidateId("ACTIVE_PLAN", "TASK_CONTINUATION", plan.id, currentTime),
        source: "ACTIVE_PLAN",
        predictionType: "TASK_CONTINUATION",
        relevance: 0.4,
        confidence: 0.3,
        topic: input.context.activeTopic || "task",
        reasonCategory: "DAG_DEPENDENCY_BLOCKED",
        expiresAt: currentTime + this.DEFAULT_PLAN_TTL,
        isSafeToInject: false,
        requiresConfirmation: false,
        contextSummary: `Step dependency is not met in active plan "${plan.objective}".`,
        suppressionReason: "DAG_DEPENDENCY_BLOCKED",
      };
    }

    // Deterministic selection:
    // a) lowest order first
    // b) then READY before NOT_STARTED (and others)
    // c) then stable step id as final tie-breaker
    const getStatusPriority = (status: string): number => {
      if (status === "READY") return 0;
      if (status === "NOT_STARTED") return 1;
      if (status === "IN_PROGRESS") return 2;
      return 3;
    };

    eligibleSteps.sort((a, b) => {
      const orderA = a.order ?? 0;
      const orderB = b.order ?? 0;
      if (orderA !== orderB) return orderA - orderB;

      const priorityA = getStatusPriority(a.status);
      const priorityB = getStatusPriority(b.status);
      if (priorityA !== priorityB) return priorityA - priorityB;

      return a.id.localeCompare(b.id);
    });

    const nextStep = eligibleSteps[0];

    // Calculate score
    const completedRatio = completedStepIds.size / steps.length;
    const baseConfidence = 0.85;
    const continuityScore = Math.min(1.0, baseConfidence + completedRatio * 0.1);

    const candidateId = this.generateCandidateId("ACTIVE_PLAN", "TASK_CONTINUATION", nextStep.id, currentTime);

    return {
      id: candidateId,
      source: "ACTIVE_PLAN",
      predictionType: "TASK_CONTINUATION",
      relevance: 0.95,
      confidence: continuityScore,
      topic: input.context.activeTopic || "task",
      reasonCategory: "ACTIVE_PLAN_NEXT_STEP",
      expiresAt: currentTime + this.DEFAULT_PLAN_TTL,
      isSafeToInject: true,
      requiresConfirmation: false,
      contextSummary: `User is continuing active multi-step task "${plan.objective}". Next step: "${nextStep.title}".`,
      directive: `CONTEXT: User is actively continuing workflow "${plan.objective}". Next operational step is: ${nextStep.title}.`,
      targetStepId: nextStep.id,
    };
  }

  // =========================================================================
  // CATEGORY B: PREFERENCE RELEVANCE EVALUATION
  // =========================================================================

  private evaluatePreferenceRelevance(
    input: PredictiveContextInput,
    currentTime: number
  ): ProactiveContextCandidate[] {
    const candidates: ProactiveContextCandidate[] = [];
    const patterns = input.adaptiveLearning?.patterns || [];

    for (const pattern of patterns) {
      // 1. Candidate patterns are UNCONFIRMED -> generate candidate with flag or suppress
      if (pattern.status === "CANDIDATE") {
        candidates.push({
          id: this.generateCandidateId("USER_MODEL", "PREFERENCE_RELEVANT", pattern.id, currentTime),
          source: "USER_MODEL",
          predictionType: "PREFERENCE_RELEVANT",
          relevance: 0.5,
          confidence: 0.45,
          topic: pattern.category || "general",
          reasonCategory: "UNCONFIRMED_CANDIDATE",
          expiresAt: currentTime + this.DEFAULT_PREFERENCE_TTL,
          isSafeToInject: false,
          requiresConfirmation: true,
          contextSummary: `Candidate unconfirmed preference: ${pattern.key} = ${pattern.value}`,
          suppressionReason: "UNCONFIRMED_CANDIDATE",
        });
        continue;
      }

      // 2. Outdated or Suppressed patterns
      if (pattern.status === "OUTDATED" || pattern.status === "SUPPRESSED") {
        candidates.push({
          id: this.generateCandidateId("USER_MODEL", "PREFERENCE_RELEVANT", pattern.id, currentTime),
          source: "USER_MODEL",
          predictionType: "PREFERENCE_RELEVANT",
          relevance: 0.2,
          confidence: 0.2,
          topic: pattern.category || "general",
          reasonCategory: "OUTDATED_PATTERN",
          expiresAt: currentTime + this.DEFAULT_PREFERENCE_TTL,
          isSafeToInject: false,
          requiresConfirmation: false,
          contextSummary: `Outdated or suppressed pattern: ${pattern.key}`,
          suppressionReason: "OUTDATED_PATTERN",
        });
        continue;
      }

      // 3. Confirmed patterns
      if (pattern.status === "CONFIRMED") {
        const sanitizedVal = this.sanitizeText(pattern.value);
        const directive = this.createSanitizedPreferenceDirective(pattern);

        candidates.push({
          id: this.generateCandidateId("USER_MODEL", "PREFERENCE_RELEVANT", pattern.id, currentTime),
          source: "USER_MODEL",
          predictionType: "PREFERENCE_RELEVANT",
          relevance: 0.85,
          confidence: Math.min(1.0, Math.max(0.75, pattern.confidence)),
          topic: pattern.category || "general",
          reasonCategory: "CONFIRMED_USER_PREFERENCE",
          expiresAt: currentTime + this.DEFAULT_PREFERENCE_TTL,
          isSafeToInject: true,
          requiresConfirmation: false,
          contextSummary: `Confirmed user preference: ${sanitizedVal}`,
          directive,
        });
      }
    }

    return candidates;
  }

  // =========================================================================
  // CATEGORY C: CLARIFICATION PREDICTION EVALUATION
  // =========================================================================

  private evaluateClarificationPrediction(
    input: PredictiveContextInput,
    currentTime: number
  ): ProactiveContextCandidate | null {
    const isIntentAmbiguous = input.intent?.requiresClarification;
    const isReasoningAmbiguous = input.reasoning?.requiresClarification;
    const isVerificationAmbiguous = input.verification?.requiresClarification;
    const isPlanBlocked = input.planning?.plan?.status === "BLOCKED";
    const missingInputs = input.planning?.plan?.missingInputs || [];

    if (isIntentAmbiguous || isReasoningAmbiguous || isVerificationAmbiguous || isPlanBlocked || missingInputs.length > 0) {
      const missingDetail =
        input.reasoning?.missingInformation?.join(", ") ||
        missingInputs.join(", ") ||
        input.intent?.ambiguityReason ||
        input.verification?.clarificationReason ||
        "missing required task parameters";

      const sanitizedMissing = this.sanitizeText(missingDetail);

      return {
        id: this.generateCandidateId("EXPLICIT_USER_INTENT", "CLARIFICATION_LIKELY", "clarif", currentTime),
        source: "EXPLICIT_USER_INTENT",
        predictionType: "CLARIFICATION_LIKELY",
        relevance: 0.90,
        confidence: 0.85,
        topic: input.context.activeTopic || "general",
        reasonCategory: "MISSING_TASK_INFORMATION",
        expiresAt: currentTime + this.DEFAULT_PLAN_TTL,
        isSafeToInject: true,
        requiresConfirmation: false,
        contextSummary: `Clarification needed for missing parameters: ${sanitizedMissing}`,
        directive: `CLARIFICATION: Request user clarification for missing parameters: ${sanitizedMissing}.`,
      };
    }

    return null;
  }

  // =========================================================================
  // CATEGORY D: CONTEXT RELEVANCE EVALUATION
  // =========================================================================

  private evaluateContextRelevance(
    input: PredictiveContextInput,
    currentTime: number
  ): ProactiveContextCandidate[] {
    const candidates: ProactiveContextCandidate[] = [];
    const govCandidates = input.governanceAnalysis?.allowedMemories || input.governanceAnalysis?.governedCandidates || [];

    for (const gov of govCandidates) {
      // Governed status must be ALLOW or ALLOW_WITH_CAUTION
      if (gov.usageDecision !== "ALLOW" && gov.usageDecision !== "ALLOW_WITH_CAUTION") {
        continue;
      }

      // Must be relevant (relevance >= 0.6)
      if (gov.relevance < 0.6) {
        continue;
      }

      const sanitizedVal = this.sanitizeText(gov.value);
      const sanitizedKey = this.sanitizeText(gov.key);

      candidates.push({
        id: this.generateCandidateId("CONFIRMED_MEMORY", "CONTEXT_RELEVANT", gov.memoryId, currentTime),
        source: "CONFIRMED_MEMORY",
        predictionType: "CONTEXT_RELEVANT",
        relevance: gov.relevance,
        confidence: gov.confidence,
        topic: input.context.activeTopic || "general",
        reasonCategory: "GOVERNED_HISTORICAL_CONTEXT",
        expiresAt: currentTime + this.DEFAULT_CONTEXT_TTL,
        isSafeToInject: true,
        requiresConfirmation: gov.requiresExplicitAttribution,
        contextSummary: `Relevant historical context: ${sanitizedKey} = ${sanitizedVal}`,
        directive: `CONTEXT: User previously established: ${sanitizedVal}.`,
      });
    }

    return candidates;
  }

  // =========================================================================
  // CANDIDATE SUPPRESSION & SAFETY AUDIT
  // =========================================================================

  private evaluateCandidateSuppression(
    candidate: ProactiveContextCandidate,
    input: PredictiveContextInput,
    activeTopic: string,
    currentTime: number
  ): SuppressionReason | null {
    const message = input.message || "";
    const lowerMessage = message.toLowerCase();

    // 1. Pre-existing suppression reason
    if (candidate.suppressionReason) {
      return candidate.suppressionReason;
    }

    // 2. Sensitive Content Detection
    if (
      this.isSensitiveContent(candidate.contextSummary) ||
      (candidate.directive && this.isSensitiveContent(candidate.directive))
    ) {
      return "SENSITIVE_DATA";
    }

    // 3. TTL Expiration Check
    if (candidate.expiresAt <= currentTime) {
      return "EXPIRED_TTL";
    }

    // 4. Topic Isolation Check
    if (candidate.topic && candidate.topic !== "general" && activeTopic && activeTopic !== "general") {
      const isTopicMatch = this.checkTopicMatch(candidate.topic, activeTopic, lowerMessage);
      if (!isTopicMatch) {
        return "TOPIC_MISMATCH";
      }
    }

    // 5. Current-Turn Direct Instruction Precedence Check
    if (this.isCurrentTurnOverridingCandidate(candidate, lowerMessage, input)) {
      return "CURRENT_TURN_OVERRIDE";
    }

    // 6. Hard Constraint Conflict Check
    if (this.isHardConstraintConflicted(candidate, input)) {
      return "HARD_CONSTRAINT_CONFLICT";
    }

    // 7. Live Verified Evidence Conflict Check
    if (this.isLiveEvidenceConflicted(candidate, input)) {
      return "LIVE_EVIDENCE_CONFLICT";
    }

    // 8. Confidence Gate Check
    if (candidate.confidence < this.MEDIUM_CONFIDENCE_THRESHOLD) {
      return "CONFIDENCE_BELOW_THRESHOLD";
    }

    return null;
  }

  // =========================================================================
  // SAFETY & OVERRIDE HELPERS
  // =========================================================================

  private isCurrentTurnOverridingCandidate(
    candidate: ProactiveContextCandidate,
    lowerMessage: string,
    input: PredictiveContextInput
  ): boolean {
    const summary = candidate.contextSummary.toLowerCase();
    const directive = (candidate.directive || "").toLowerCase();

    // A. Language overrides: E.g., Historical = Bangla, Current message requests English
    if (
      (summary.includes("bangla") || directive.includes("bangla") || summary.includes("বাংলা") || summary.includes("bengali")) &&
      (lowerMessage.includes("english") || lowerMessage.includes("in english") || lowerMessage.includes("ingreji") || lowerMessage.includes("write in english") || lowerMessage.includes("answer in english"))
    ) {
      return true;
    }
    if (
      (summary.includes("english") || directive.includes("english")) &&
      (lowerMessage.includes("bangla") || lowerMessage.includes("বাংলা") || lowerMessage.includes("banglay") || lowerMessage.includes("bengali") || lowerMessage.includes("in bangla"))
    ) {
      return true;
    }

    // B. Response style / verbosity overrides:
    // Case 1: Historical = concise/brief, Current = detailed/elaborate/explain
    if (
      (summary.includes("concise") || summary.includes("brief") || summary.includes("short") || directive.includes("concise") || directive.includes("brief")) &&
      (lowerMessage.includes("explain") || lowerMessage.includes("in detail") || lowerMessage.includes("detailed") || lowerMessage.includes("step by step") || lowerMessage.includes("elaborate") || lowerMessage.includes("comprehensive") || lowerMessage.includes("vistareto"))
    ) {
      return true;
    }
    // Case 2: Historical = detailed/verbose/comprehensive, Current = short/concise/brief
    if (
      (summary.includes("detail") || summary.includes("detailed") || summary.includes("verbose") || summary.includes("comprehensive") || directive.includes("detailed") || directive.includes("detail")) &&
      (lowerMessage.includes("short") || lowerMessage.includes("keep it short") || lowerMessage.includes("brief") || lowerMessage.includes("briefly") || lowerMessage.includes("concise") || lowerMessage.includes("summarize") || lowerMessage.includes("in short") || lowerMessage.includes("quick answer"))
    ) {
      return true;
    }

    // C. Entity / Brand alternative replacement: "Recommend Lenovo instead", "use X instead", "choose X rather than Y"
    if (lowerMessage.includes("instead") || lowerMessage.includes("rather than") || lowerMessage.includes("switch to")) {
      // If user specifies an alternative with "instead", check if candidate represents an entity that is not what the user requested
      const candidateTokens = summary
        .split(/[\s,:=()".]+/)
        .filter((t) => t.length >= 2 && !["the", "user", "has", "confirmed", "preferred", "preference", "and", "for", "with", "item"].includes(t));
      
      const insteadMatch = lowerMessage.match(/(?:recommend|use|choose|pick|suggest|prefer|give\s+me)?\s*([a-z0-9_-]+)\s+instead/i);
      if (insteadMatch && insteadMatch[1]) {
        const requestedEntity = insteadMatch[1].toLowerCase();
        if (!summary.includes(requestedEntity) && candidateTokens.length > 0) {
          return true;
        }
      } else if (candidate.source === "USER_MODEL" || candidate.source === "CONFIRMED_MEMORY") {
        return true;
      }
    }

    // D. Explicit direct negation of candidate content
    if (
      lowerMessage.includes("not ") ||
      lowerMessage.includes("without ") ||
      lowerMessage.includes("instead of ") ||
      lowerMessage.includes("no ") ||
      lowerMessage.includes("exclude ") ||
      lowerMessage.includes("avoid ") ||
      lowerMessage.includes("don't ") ||
      lowerMessage.includes("dont ") ||
      lowerMessage.includes("do not ") ||
      lowerMessage.includes("never ")
    ) {
      const tokens = summary.split(/[\s,:=()".]+/).filter((t) => t.length >= 2);
      for (const token of tokens) {
        if (["user", "has", "the", "confirmed", "preferred", "preference", "item", "and"].includes(token)) continue;
        if (
          lowerMessage.includes(`not ${token}`) ||
          lowerMessage.includes(`without ${token}`) ||
          lowerMessage.includes(`no ${token}`) ||
          lowerMessage.includes(`avoid ${token}`) ||
          lowerMessage.includes(`exclude ${token}`) ||
          lowerMessage.includes(`instead of ${token}`) ||
          lowerMessage.includes(`don't use ${token}`) ||
          lowerMessage.includes(`dont use ${token}`) ||
          lowerMessage.includes(`don't recommend ${token}`) ||
          lowerMessage.includes(`dont recommend ${token}`) ||
          lowerMessage.includes(`do not recommend ${token}`) ||
          lowerMessage.includes(`do not use ${token}`) ||
          lowerMessage.includes(`don't ${token}`) ||
          lowerMessage.includes(`dont ${token}`) ||
          lowerMessage.includes(`never ${token}`)
        ) {
          return true;
        }
      }
    }

    // E. Explicit correction intent in current turn
    if (input.intent?.primaryIntent === "CORRECTION" || input.intent?.relationship === "CORRECTION") {
      // If current turn is a correction that contradicts historical preference
      if (candidate.source === "USER_MODEL" || candidate.source === "CONFIRMED_MEMORY") {
        return true;
      }
    }

    return false;
  }

  private isHardConstraintConflicted(
    candidate: ProactiveContextCandidate,
    input: PredictiveContextInput
  ): boolean {
    const currentConstraints = input.context.constraints || [];
    const summary = candidate.contextSummary.toLowerCase();

    for (const c of currentConstraints) {
      const cVal = String(c.value ?? "").toLowerCase();
      const cCat = String(c.category || (c as any).type || c.key || "").toLowerCase();

      // Budget / price constraint conflict
      if (cCat.includes("budget") || cCat.includes("price") || cCat.includes("cost")) {
        // If candidate suggests a higher budget or alternative price
        if (summary.includes("budget") || summary.includes("price") || summary.includes("tk") || summary.includes("k")) {
          // Check if values conflict
          const cNum = parseInt(cVal.replace(/\D/g, ""), 10);
          const sNumMatch = summary.match(/\b(\d+)\s*k\b/) || summary.match(/\b(\d{4,6})\b/);
          if (sNumMatch && !isNaN(cNum)) {
            const sNum = parseInt(sNumMatch[1], 10) * (sNumMatch[0].includes("k") ? 1000 : 1);
            if (sNum !== cNum) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  private isLiveEvidenceConflicted(
    candidate: ProactiveContextCandidate,
    input: PredictiveContextInput
  ): boolean {
    const verification = input.verification;
    if (!verification) return false;

    // Check contradictions for contradiction with historical candidate
    const contradictions = verification.contradictions || [];
    for (const contra of contradictions) {
      const contraText = (contra.description || contra.actual || "").toLowerCase();
      if (contraText && candidate.contextSummary.toLowerCase().includes(contraText)) {
        return true;
      }
    }

    // Check unsupported claims or any claim marked contradicted/unverified
    const claims = (verification.factualClaims || (verification as any).claimVerifications || []) as any[];
    for (const claim of claims) {
      if (claim.status === "CONTRADICTED" || claim.status === "UNVERIFIED" || claim.isSupported === false) {
        const claimText = String(claim.claim || "").toLowerCase();
        if (claimText && candidate.contextSummary.toLowerCase().includes(claimText)) {
          return true;
        }
      }
    }

    return false;
  }

  private checkTopicMatch(candidateTopic: string, activeTopic: string, lowerMessage: string): boolean {
    const candNorm = this.normalizeKey(candidateTopic);
    const activeNorm = this.normalizeKey(activeTopic);

    if (candNorm === activeNorm) return true;
    if (candNorm === "general" || activeNorm === "general") return true;

    // Check specific domain groups
    const techDomains = ["software_development", "laptop", "pc", "tech", "coding", "hardware", "gadget", "programming"];
    const weatherDomains = ["weather", "forecast", "climate", "temperature", "rain"];
    const financeDomains = ["banking", "finance", "budget", "money", "salary", "investment"];
    const healthDomains = ["health", "medical", "fitness", "doctor", "medicine"];

    const isCandTech = techDomains.some((d) => candNorm.includes(d));
    const isActiveTech = techDomains.some((d) => activeNorm.includes(d));

    const isCandWeather = weatherDomains.some((d) => candNorm.includes(d));
    const isActiveWeather = weatherDomains.some((d) => activeNorm.includes(d));

    const isCandFinance = financeDomains.some((d) => candNorm.includes(d));
    const isActiveFinance = financeDomains.some((d) => activeNorm.includes(d));

    const isCandHealth = healthDomains.some((d) => candNorm.includes(d));
    const isActiveHealth = healthDomains.some((d) => activeNorm.includes(d));

    if (isCandTech && !isActiveTech) return false;
    if (isCandWeather && !isActiveWeather) return false;
    if (isCandFinance && !isActiveFinance) return false;
    if (isCandHealth && !isActiveHealth) return false;

    // Fallback: check if message contains candidate topic keyword
    if (lowerMessage.includes(candNorm)) return true;

    return true;
  }

  private isCasualOrGreeting(message: string): boolean {
    const casualPatterns = [
      /^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening|day))\b/i,
      /^(kemon\s+acho|ki\s+obostha|ki\s+khobor|valochin)\b/i,
      /^(ধন্যবাদ|কেমন\s+আছো|কেমন\s+আছেন|হ্যালো|হাই)\b/,
      /^(thanks|thank\s+you|thx|ok|okay|bye|goodbye|see\s+you)\b/i,
    ];
    return casualPatterns.some((pattern) => pattern.test(message));
  }

  private isSensitiveContent(text: string): boolean {
    if (!text) return false;
    const lower = text.toLowerCase();

    // Passwords, tokens, API keys, private credentials, financial details
    if (
      lower.includes("password") ||
      lower.includes("passwd") ||
      lower.includes("bearer ") ||
      lower.includes("api_key") ||
      lower.includes("api key") ||
      lower.includes("secret_key") ||
      lower.includes("secret key") ||
      lower.includes("private_key") ||
      lower.includes("private key") ||
      lower.includes("client_secret") ||
      lower.includes("auth_token") ||
      lower.includes("access_token") ||
      lower.includes("accesstoken") ||
      lower.includes("cvv") ||
      lower.includes("cvc") ||
      lower.includes("credit_card") ||
      lower.includes("credit card") ||
      lower.includes("debit_card") ||
      lower.includes("debit card") ||
      lower.includes("bank_account") ||
      lower.includes("bank account") ||
      lower.includes("routing_number") ||
      lower.includes("routing number") ||
      lower.includes("account_number") ||
      lower.includes("account number")
    ) {
      return true;
    }

    // RegEx patterns for credentials, credit cards, SSNs, and private tokens
    const sensitiveRegexes = [
      /\b(?:password|passwd|pwd)\s*[:=]\s*\S+/i,
      /\b(?:sk_live|sk_test|pk_live|pk_test|ghp_|glpat-|xox[baprs]-|sk-[a-zA-Z0-9_-]+)\w*/i,
      /\bapi\s*key\s*[:=]\s*\S+/i,
      /\b(?:\d{4}[-\s]?){3}\d{4}\b/, // Credit Card Number
      /\b\d{3}-\d{2}-\d{4}\b/,       // SSN
    ];

    return sensitiveRegexes.some((re) => re.test(text));
  }

  private createSanitizedPreferenceDirective(pattern: LearningPattern): string {
    const sanitizedVal = this.sanitizeText(pattern.value);
    const key = pattern.key.toLowerCase();

    if (key.includes("language")) {
      return `PREFERENCE: User has confirmed preferred response language: ${sanitizedVal}.`;
    }
    if (key.includes("verbosity") || key.includes("style")) {
      return `PREFERENCE: User prefers response style: ${sanitizedVal}.`;
    }
    return `PREFERENCE: User confirmed preference: ${sanitizedVal}.`;
  }

  private sanitizeText(text: string): string {
    if (!text) return "";
    return text
      .replace(/\b(?:pat|sig|ev|mem)_[a-zA-Z0-9_-]+\b/g, "")
      .replace(/\bconfidence\s*[:=]\s*\d+(?:\.\d+)?/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  private generateSignalId(source: string, key: string, value: string, timestamp: number): string {
    const hash = this.hashValue(key, value);
    return `sig_${this.normalizeKey(source)}_${hash}_${timestamp}`;
  }

  private generateCandidateId(source: string, predType: string, seed: string, timestamp: number): string {
    const hash = this.hashValue(predType, seed);
    return `cand_${this.normalizeKey(source)}_${hash}_${timestamp}`;
  }

  private normalizeKey(key: string): string {
    return key
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s\-_]+/g, "_");
  }

  private hashValue(key: string, value: string): string {
    const combined = `${this.normalizeKey(key)}:${this.normalizeKey(value)}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }
}

export const predictiveContextEngine = new PredictiveContextEngine();
