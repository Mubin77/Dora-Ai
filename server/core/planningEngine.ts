/**
 * Dora Planning & Task Orchestration Engine (Phase 1, Step 4)
 * 
 * Translates User Goal + Structured Intent + Conversation Context + Reasoning Analysis
 * into a deterministic, executable, dependency-aware TaskPlan.
 * 
 * Key Principles:
 * 1. Strict separation between Reasoning ("How to think about the problem") and Planning ("What concrete sequence of actions to execute").
 * 2. Voice-first efficiency: Simple greetings, direct math, and single-turn queries bypass plan generation (requiresPlanning = false).
 * 3. Dependency-aware orchestration: Steps declare explicit prerequisites, input requirements, expected outputs, and parallelism flags.
 * 4. Plan adaptation across turns: Supports in-place constraint updates, entity corrections, confirmation activation, and explicit cancellation.
 * 5. Topic isolation: Topic switches archive prior plans to prevent cross-domain contamination.
 * 6. Safety against fabrication: PlanningEngine plans intended actions; it never assumes unexecuted tools succeeded or invents synthetic outputs.
 */

import { BrainIntent, StructuredIntent } from "./intentTypes";
import { ConversationContext, ConversationTurn, TrackedEntity } from "./contextTypes";
import {
  ReasoningAnalysis,
  ReasoningType,
  StructuredReasoningConstraint,
  ToolRequirement,
} from "./reasoningTypes";
import {
  ExecutionStrategy,
  FailureStrategy,
  PlanActionType,
  PlanComplexity,
  PlanPriority,
  PlanStatus,
  PlanStep,
  PlanningAnalysis,
  TaskPlan,
} from "./planningTypes";

export class PlanningEngine {
  private static instance: PlanningEngine;

  private constructor() {}

  public static getInstance(): PlanningEngine {
    if (!PlanningEngine.instance) {
      PlanningEngine.instance = new PlanningEngine();
    }
    return PlanningEngine.instance;
  }

  // Explicit cancellation signals
  private cancellationRegex =
    /^(?:never\s*mind|forget\s*(?:it|that|about\s*it)|cancel\s*(?:that|this|the\s*plan)?|stop|drop\s*it|nah\s*forget\s*it)[.!]?$/i;

  // Urgency signal patterns for priority derivation
  private urgentRegex = /\b(?:urgently|asap|emergency|immediately|right\s+away|critical|hurry)\b/i;

  /**
   * Main Planning Orchestration Entry Point
   */
  public generatePlan(
    message: string,
    structuredIntent: StructuredIntent,
    reasoningAnalysis: ReasoningAnalysis,
    context?: ConversationContext,
    history: ConversationTurn[] = []
  ): PlanningAnalysis {
    const trimmed = (message || "").trim();
    const lower = trimmed.toLowerCase();
    const activeTaskPlan = context?.activeTaskPlan;
    const isTopicSwitched = Boolean(context?.isTopicSwitched);

    // =========================================================================
    // 1. TOPIC SWITCH HANDLING: Archive prior plan to prevent contamination
    // =========================================================================
    if (isTopicSwitched && activeTaskPlan) {
      if (context) {
        if (!context.archivedPlans) {
          context.archivedPlans = [];
        }
        context.archivedPlans.push({
          ...activeTaskPlan,
          status: activeTaskPlan.status === "IN_PROGRESS" ? "CANCELLED" : activeTaskPlan.status,
          updatedAt: context.updatedAt || 0,
        });
        context.activeTaskPlan = undefined;
      }
    }

    // =========================================================================
    // 2. EXPLICIT CANCELLATION
    // =========================================================================
    if (this.cancellationRegex.test(trimmed) || lower === "cancel" || lower === "never mind") {
      if (activeTaskPlan && activeTaskPlan.status !== "COMPLETED" && activeTaskPlan.status !== "CANCELLED") {
        activeTaskPlan.status = "CANCELLED";
        activeTaskPlan.updatedAt = context?.updatedAt || 0;
        for (const step of activeTaskPlan.steps) {
          if (step.status === "IN_PROGRESS" || step.status === "READY" || step.status === "NOT_STARTED") {
            step.status = "CANCELLED";
          }
        }
        return {
          requiresPlanning: true,
          plan: activeTaskPlan,
          planningReason: "Active task plan cancelled by explicit user command",
          activePlanStatus: "CANCELLED",
          planAction: "CANCELLED",
          directives: [
            "TASK CANCELLED: The active multi-step plan has been cancelled. Acknowledge briefly and warmly, and ask how you can help next."
          ],
        };
      }

      return {
        requiresPlanning: false,
        planningReason: "User cancelled without an active cancellable plan",
        planAction: "BYPASSED",
        directives: [
          "Acknowledge with gentle composure that the previous inquiry is set aside."
        ],
      };
    }

    // =========================================================================
    // 3. USER CONFIRMATION OF PROPOSAL / PENDING PLAN
    // =========================================================================
    const isConfirmationText = /^(?:yes|yeah|yep|sure|ok|okay|proceed|go\s+ahead|do\s+it|please\s+do)\b/i.test(lower);
    if (
      structuredIntent.relationship === "CONFIRMATION" ||
      structuredIntent.primaryIntent === "CONFIRMATION" ||
      (isConfirmationText && activeTaskPlan)
    ) {
      if (activeTaskPlan && (activeTaskPlan.status === "READY" || activeTaskPlan.status === "NOT_STARTED" || activeTaskPlan.status === "IN_PROGRESS")) {
        activeTaskPlan.status = "IN_PROGRESS";
        activeTaskPlan.updatedAt = context?.updatedAt || 0;

        // Check if there is already an active step in progress
        const existingInProgressStep = activeTaskPlan.steps.find(s => s.status === "IN_PROGRESS");
        if (existingInProgressStep) {
          activeTaskPlan.activeStepId = existingInProgressStep.id;
        } else {
          // Find first pending step whose dependencies are strictly ALL COMPLETED
          const eligibleStep = activeTaskPlan.steps.find(s => {
            if (s.status !== "NOT_STARTED" && s.status !== "READY") return false;
            return this.areDependenciesSatisfied(s, activeTaskPlan);
          });
          if (eligibleStep) {
            eligibleStep.status = "IN_PROGRESS";
            activeTaskPlan.activeStepId = eligibleStep.id;
          }
        }

        const activeStep = activeTaskPlan.steps.find(s => s.id === activeTaskPlan.activeStepId);

        return {
          requiresPlanning: true,
          plan: activeTaskPlan,
          planningReason: "User confirmed pending proposal; activated execution plan",
          activePlanStatus: "IN_PROGRESS",
          planAction: "ACTIVATED",
          directives: [
            `PLAN ACTIVATED: User confirmed the action. Proceed with executing step: "${activeStep?.title || activeTaskPlan.objective}".`
          ],
        };
      }
    }

    // =========================================================================
    // 4. USER CORRECTION ON ACTIVE PLAN
    // =========================================================================
    if (
      (structuredIntent.relationship === "CORRECTION" || structuredIntent.primaryIntent === "CORRECTION") &&
      activeTaskPlan &&
      activeTaskPlan.status !== "CANCELLED" &&
      activeTaskPlan.status !== "COMPLETED"
    ) {
      const targetEntity = structuredIntent.targetEntity || "";
      const updatedPlan = this.applyCorrectionToPlan(activeTaskPlan, targetEntity, trimmed);

      return {
        requiresPlanning: true,
        plan: updatedPlan,
        planningReason: `Plan adapted to user correction: ${targetEntity || "updated requirement"}`,
        activePlanStatus: updatedPlan.status,
        planAction: "UPDATED",
        directives: [
          `PLAN CORRECTION: Updated candidate entity to "${targetEntity}". Recalibrate filtering and comparison steps accordingly.`
        ],
      };
    }

    // =========================================================================
    // 5. CONSTRAINT REFINEMENT / UPDATE ON ACTIVE PLAN
    // =========================================================================
    if (
      (structuredIntent.relationship === "REFINEMENT" || structuredIntent.primaryIntent === "CONSTRAINT_UPDATE") &&
      activeTaskPlan &&
      activeTaskPlan.status !== "CANCELLED" &&
      activeTaskPlan.status !== "COMPLETED"
    ) {
      const updatedPlan = this.applyConstraintUpdateToPlan(
        activeTaskPlan,
        reasoningAnalysis.relevantConstraints,
        trimmed
      );

      return {
        requiresPlanning: true,
        plan: updatedPlan,
        planningReason: "Plan steps adjusted to accommodate updated constraints while preserving progress",
        activePlanStatus: updatedPlan.status,
        planAction: "UPDATED",
        directives: [
          "PLAN CONSTRAINT UPDATE: Constraints modified by user. Re-evaluated affected filter and ranking steps."
        ],
      };
    }

    // =========================================================================
    // 6. CONTINUATION OF MULTI-TURN ACTIVE PLAN
    // =========================================================================
    if (
      activeTaskPlan &&
      activeTaskPlan.status === "IN_PROGRESS" &&
      (structuredIntent.relationship === "FOLLOW_UP" || context?.currentTask === activeTaskPlan.goal)
    ) {
      const progressedPlan = this.progressActivePlan(activeTaskPlan, structuredIntent, reasoningAnalysis, trimmed);
      return {
        requiresPlanning: true,
        plan: progressedPlan,
        planningReason: `Continued execution of active task plan: ${progressedPlan.objective}`,
        activePlanStatus: progressedPlan.status,
        planAction: "CONTINUED",
        directives: [
          `PLAN CONTINUATION: Active step is "${progressedPlan.activeStepId || "Finalizing"}". Fulfill this step's expected output.`
        ],
      };
    }

    // =========================================================================
    // 7. EVALUATE WHETHER A NEW TASK PLAN IS REQUIRED
    // =========================================================================
    const requiresPlan = this.evaluatePlanRequirement(
      trimmed,
      lower,
      structuredIntent,
      reasoningAnalysis,
      context
    );

    if (!requiresPlan) {
      return {
        requiresPlanning: false,
        planningReason: "Direct single-turn conversational or factual request does not warrant multi-step decomposition",
        planAction: "BYPASSED",
        directives: [],
      };
    }

    // =========================================================================
    // 8. CONSTRUCT NEW TASK PLAN
    // =========================================================================
    const newPlan = this.buildNewTaskPlan(
      trimmed,
      lower,
      structuredIntent,
      reasoningAnalysis,
      context
    );

    if (context) {
      context.activeTaskPlan = newPlan;
    }

    return {
      requiresPlanning: true,
      plan: newPlan,
      planningReason: `Decomposed goal "${newPlan.goal}" into ${newPlan.steps.length} structured steps`,
      activePlanStatus: newPlan.status,
      planAction: newPlan.status === "BLOCKED" ? "BLOCKED" : "CREATED",
      directives: [
        `TASK PLAN CREATED [${newPlan.executionStrategy}]: ${newPlan.objective}`,
        ...newPlan.steps.map(s => `Step ${s.order} (${s.status}): ${s.title}`)
      ],
    };
  }

  /**
   * Evaluates whether a turn warrants a multi-step execution plan
   */
  private evaluatePlanRequirement(
    trimmed: string,
    lower: string,
    intent: StructuredIntent,
    reasoning: ReasoningAnalysis,
    context?: ConversationContext
  ): boolean {
    // 1. Explicit Trip / Itinerary / Project / Step-by-step / Multi-Action / Price Evaluation Keywords
    if (
      /\b(?:plan\s+(?:a|me|our)?|itinerary|5\s*day|trip\s+to|trip|vacation|step\s+by\s+step|debug\s+this|troubleshoot|how\s+to\s+build|find\s+.*?compare|compare\s+.*?recommend|worth\s+buying|should\s+i\s+buy|find\s+today'?s\s+price|price\s+of\s+.*?\band)\b/i.test(lower)
    ) {
      return true;
    }

    // 2. Multi-step reasoning problem or multiple subtasks
    if (reasoning.reasoningType === "MULTI_STEP_PROBLEM" || reasoning.subtasks.length >= 2) {
      return true;
    }

    // 3. Multi-intent request (e.g. Compare AND Recommend)
    if (intent.isMultiIntent && Boolean(intent.secondaryIntent)) {
      return true;
    }

    // 4. Multi-entity comparison or comparison reasoning
    if (
      reasoning.reasoningType === "COMPARISON" ||
      intent.primaryIntent === "COMPARISON" ||
      /\b(?:compare\s+[a-z0-9\s]+\s+(?:and|vs|to|with)\s+[a-z0-9\s]+|compare\s+(?:these|the\s+following|options))\b/i.test(lower)
    ) {
      return true;
    }

    // 5. Complex recommendation with multiple constraints
    if (
      reasoning.reasoningType === "MULTI_FACTOR_DECISION" ||
      (reasoning.relevantConstraints.length >= 2 && intent.primaryIntent === "RECOMMENDATION") ||
      (intent.primaryIntent === "RECOMMENDATION" && /\b(?:under|with|budget|rtx|filter|best)\b/i.test(lower))
    ) {
      return true;
    }

    // 6. Missing information requiring structured multi-step gathering
    if (reasoning.requiresClarification && reasoning.missingInformation.length > 0) {
      return true;
    }

    // 6. Non-planning exits: Simple Greetings and Casual Talk
    if (
      /^(?:hi|hello|hey|hey\s+dora|good\s+(?:morning|evening|afternoon|night)|sup|kemon\s+acho|ki\s+khobor)[.!]?$/i.test(trimmed) ||
      (intent.primaryIntent === "CASUAL_CONVERSATION" && !/\b(?:plan|trip|itinerary|compare|recommend|find|buy|budget)\b/i.test(lower))
    ) {
      return false;
    }

    // 7. Non-planning exits: Simple Math / Calculation
    if (
      reasoning.reasoningType === "CALCULATION" ||
      /^(?:what\s+is|calculate|compute)?\s*([0-9]+(?:\.[0-9]+)?)\s*([\+\-\*\/x×÷])\s*([0-9]+(?:\.[0-9]+)?)\s*\??$/i.test(trimmed)
    ) {
      return false;
    }

    // 8. Non-planning exits: Simple Real-Time Lookups (Time, simple single weather question)
    if (
      intent.primaryIntent === "REAL_TIME_INFORMATION" &&
      !intent.isMultiIntent &&
      !/\b(?:compare|itinerary|plan|recommend|steps|multi|worth\s+buying|should\s+i)\b/i.test(lower)
    ) {
      return false;
    }

    // 9. Non-planning exits: Direct factual answers / definitions
    if (
      reasoning.reasoningType === "DIRECT_ANSWER" &&
      !intent.isMultiIntent &&
      reasoning.subtasks.length === 0
    ) {
      return false;
    }

    return false;
  }

  private deterministicHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  public generateDeterministicId(prefix: string, contextId: string, turn: number | string, seed: string): string {
    const raw = `${contextId}_${turn}_${seed}`;
    const hash = this.deterministicHash(raw).toString(36).substring(0, 6);
    return `${prefix}_${contextId}_t${turn}_${hash}`;
  }

  /**
   * Builds a new structured TaskPlan from first principles
   */
  private buildNewTaskPlan(
    message: string,
    lower: string,
    intent: StructuredIntent,
    reasoning: ReasoningAnalysis,
    context?: ConversationContext
  ): TaskPlan {
    const goal = context?.userGoal || context?.currentTask || "execute_user_request";
    const contextId = context?.id || "default";
    const turn = context?.turnsCount ?? 0;
    const planId = this.generateDeterministicId("plan", contextId, turn, goal);
    const priority = this.derivePriority(lower);
    const now = context?.updatedAt || context?.contextTimestamp || 0;

    // =========================================================================
    // Scenario A: Missing Critical Inputs -> BLOCKED PLAN
    // =========================================================================
    const isPriceLookup = /\b(?:today'?s\s+price|price\s+of|worth\s+buying)\b/i.test(lower);
    if (
      !isPriceLookup &&
      (reasoning.missingInformation.length > 0 ||
      (/\bplan\s+(?:a\s+|me\s+a\s+)?trip\b/i.test(lower) && !/\b(?:to|in)\s+[a-z]+/i.test(lower)))
    ) {
      const missing = reasoning.missingInformation.length > 0
        ? reasoning.missingInformation
        : ["destination", "travel dates"];

      const isTravelDomain = /\b(?:trip|travel|itinerary|vacation)\b/i.test(lower) || (context?.activeTopic || "").includes("travel");
      const isCompareDomain = /\b(?:compare|vs|recommend|which\s+one|phones?|laptops?)\b/i.test(lower) || (context?.activeTopic || "").includes("recommendation") || (context?.activeTopic || "").includes("laptop");

      let steps: PlanStep[];
      let dependencies: Record<string, string[]>;
      let objective: string;
      let planGoal: string;

      if (isTravelDomain) {
        objective = "Formulate personalized travel itinerary upon parameter clarification";
        planGoal = "travel_planning";
        steps = [
          {
            id: "step-1",
            title: "Collect Missing Travel Parameters",
            description: `Obtain required parameters from user: ${missing.join(", ")}`,
            order: 1,
            status: "BLOCKED",
            dependencies: [],
            requiredInputs: missing,
            expectedOutput: "User-specified destination, dates, and budget",
            canRunInParallel: false,
            completionCriteria: "All essential parameters clarified by user",
            failureReason: "Essential parameters missing from initial request",
          },
          {
            id: "step-2",
            title: "Generate Tailored Itinerary",
            description: "Synthesize complete day-by-day travel plan matching user constraints",
            order: 2,
            status: "NOT_STARTED",
            dependencies: ["step-1"],
            requiredInputs: ["destination", "dates", "budget"],
            expectedOutput: "Structured itinerary with accommodations and activities",
            canRunInParallel: false,
            completionCriteria: "Complete schedule generated with actionable recommendations",
          },
        ];
        dependencies = { "step-1": [], "step-2": ["step-1"] };
      } else if (isCompareDomain) {
        objective = "Compare candidate options and deliver recommendation upon target identification";
        planGoal = "product_comparison_and_recommendation";
        steps = [
          {
            id: "step-1",
            title: "Identify Target Comparison Candidates",
            description: `Obtain target models or categories from user: ${missing.join(", ")}`,
            order: 1,
            status: "BLOCKED",
            dependencies: [],
            requiredInputs: missing,
            expectedOutput: "Specific phone/product models to compare",
            canRunInParallel: false,
            completionCriteria: "Target candidate models clearly identified",
            failureReason: "Candidate models not specified in request",
          },
          {
            id: "step-2",
            title: "Conduct Side-by-Side Dimensional Comparison",
            description: "Evaluate identified candidates across performance, display, battery, camera, and value",
            order: 2,
            status: "NOT_STARTED",
            dependencies: ["step-1"],
            requiredInputs: ["target_entities"],
            expectedOutput: "Structured comparison across key trade-offs",
            canRunInParallel: false,
            completionCriteria: "All major trade-offs analyzed",
          },
          {
            id: "step-3",
            title: "Synthesize Definitive Recommendation",
            description: "Deliver top recommendation matching user needs and priorities",
            order: 3,
            status: "NOT_STARTED",
            dependencies: ["step-2"],
            requiredInputs: ["comparison_analysis"],
            expectedOutput: "Actionable purchase recommendation",
            canRunInParallel: false,
            completionCriteria: "Clear, justified recommendation presented",
          },
        ];
        dependencies = { "step-1": [], "step-2": ["step-1"], "step-3": ["step-2"] };
      } else {
        objective = `Execute ${goal} upon clarification of missing parameters`;
        planGoal = goal;
        steps = [
          {
            id: "step-1",
            title: "Collect Missing Information",
            description: `Clarify with user: ${missing.join(", ")}`,
            order: 1,
            status: "BLOCKED",
            dependencies: [],
            requiredInputs: missing,
            expectedOutput: "Required inputs provided by user",
            canRunInParallel: false,
            completionCriteria: "All missing parameters clarified",
            failureReason: "Information missing from request",
          },
          {
            id: "step-2",
            title: "Execute Goal",
            description: `Fulfill user goal: ${goal}`,
            order: 2,
            status: "NOT_STARTED",
            dependencies: ["step-1"],
            requiredInputs: missing,
            expectedOutput: "Completed task output",
            canRunInParallel: false,
            completionCriteria: "Task successfully executed",
          },
        ];
        dependencies = { "step-1": [], "step-2": ["step-1"] };
      }

      return {
        id: planId,
        objective,
        goal: planGoal,
        status: "BLOCKED",
        priority,
        complexity: "MEDIUM",
        steps,
        dependencies,
        requiredInputs: missing,
        availableInputs: [],
        missingInputs: missing,
        toolRequirements: [],
        executionStrategy: "SEQUENTIAL",
        completionCriteria: [
          "Missing parameters clarified by user",
          "Structured task steps successfully executed",
        ],
        failureStrategy: "REQUEST_CLARIFICATION",
        createdAt: now,
        updatedAt: now,
        sourceIntent: intent.primaryIntent,
        sourceReasoning: reasoning.reasoningType,
        isCancellable: true,
        activeStepId: "step-1",
        clarificationRequirement: `Please specify your ${missing.join(" and ")} to proceed.`,
      };
    }

    // =========================================================================
    // Scenario B: Travel / Multi-Domain Planning (with Parallel Flight & Hotel)
    // =========================================================================
    if (/\b(?:trip|itinerary|vacation|travel|5\s*day)\b/i.test(lower)) {
      const destinationMatch = lower.match(/\b(?:to|in)\s+([a-z\s]+?)(?:\s+for|\s+with|\s+under|\.|$)/i);
      const destination = destinationMatch ? destinationMatch[1].trim() : "target destination";

      const steps: PlanStep[] = [
        {
          id: "step-1",
          title: `Research Flight Options to ${destination}`,
          description: "Search and evaluate optimal flight schedules and pricing",
          order: 1,
          status: "READY",
          dependencies: [],
          requiredInputs: ["destination", "travel_window"],
          expectedOutput: "Curated flight options with schedules and price ranges",
          toolRequirement: {
            toolType: "search",
            isMandatory: true,
            priority: "REQUIRED",
            query: `flights to ${destination} schedule and pricing`,
            reason: "Live flight pricing and availability",
          },
          canRunInParallel: true, // Parallel with Hotel search!
          completionCriteria: "Verified flight routes and cost estimates identified",
        },
        {
          id: "step-2",
          title: `Research Hotel & Accommodation in ${destination}`,
          description: "Identify well-reviewed accommodations suited to preferred areas",
          order: 2,
          status: "READY",
          dependencies: [],
          requiredInputs: ["destination", "stay_duration"],
          expectedOutput: "Curated list of accommodations with neighborhood ratings",
          toolRequirement: {
            toolType: "search",
            isMandatory: true,
            priority: "REQUIRED",
            query: `top hotels and accommodations in ${destination}`,
            reason: "Hotel availability and location ratings",
          },
          canRunInParallel: true, // Parallel with Flight search!
          completionCriteria: "Verified accommodation options compiled",
        },
        {
          id: "step-3",
          title: "Synthesize Day-by-Day Activity Schedule",
          description: "Structure daily attractions, dining, and logistics into a balanced itinerary",
          order: 3,
          status: "NOT_STARTED",
          dependencies: ["step-1", "step-2"],
          requiredInputs: ["flights_data", "hotel_data", "destination"],
          expectedOutput: "Comprehensive day-by-day travel itinerary",
          canRunInParallel: false,
          completionCriteria: "All days structured with sensible transit and activity timings",
        },
        {
          id: "step-4",
          title: "Finalize Trip Plan & Practical Advice",
          description: "Compile packing tips, local etiquette, currency advice, and emergency info",
          order: 4,
          status: "NOT_STARTED",
          dependencies: ["step-3"],
          requiredInputs: ["itinerary_data"],
          expectedOutput: "Complete travel guide with actionable logistics",
          canRunInParallel: false,
          completionCriteria: "Ready-to-use travel dossier delivered",
        },
      ];

      const dependencies: Record<string, string[]> = {
        "step-1": [],
        "step-2": [],
        "step-3": ["step-1", "step-2"],
        "step-4": ["step-3"],
      };

      return {
        id: planId,
        objective: `Construct comprehensive 5-day travel itinerary for ${destination}`,
        goal: "travel_planning",
        status: "READY",
        priority,
        complexity: "HIGH",
        steps,
        dependencies,
        requiredInputs: ["destination", "duration"],
        availableInputs: ["destination", "duration"],
        missingInputs: [],
        toolRequirements: steps.flatMap(s => s.toolRequirement ? [s.toolRequirement] : []),
        executionStrategy: "PARALLEL_BATCH",
        completionCriteria: [
          "Flight options identified",
          "Accommodations curated",
          "Day-by-day itinerary formulated",
          "Logistical advice synthesized"
        ],
        failureStrategy: "ALTERNATIVE_TOOL",
        createdAt: now,
        updatedAt: now,
        sourceIntent: intent.primaryIntent,
        sourceReasoning: reasoning.reasoningType,
        isCancellable: true,
        activeStepId: "step-1",
      };
    }

    // =========================================================================
    // Scenario C: Multi-Intent (Compare & Recommend) without explicit budget discovery
    // =========================================================================
    const hasExplicitBudgetFilter = /\b(?:under\s+\d+|budget|\d+\s*k\b|max\s+price)\b/i.test(lower);
    const hasExistingVerifiedData = (context?.entities.length || 0) >= 2 &&
      context?.entities.every(e => e.status === "active");

    if (
      !hasExplicitBudgetFilter &&
      (intent.isMultiIntent ||
      hasExistingVerifiedData ||
      /\b(?:compare\s+.*?recommend|recommend\s+.*?compare|compare\s+.*?\band\s+(?:suggest|tell\s+me|pick))\b/i.test(lower) ||
      (reasoning.reasoningType === "COMPARISON" && /recommend|suggest|which\s+(?:one\s+)?should\s+i\s+buy/i.test(lower)))
    ) {
      const entities = (context?.entities && context.entities.length >= 2)
        ? context.entities.map(e => e.name)
        : (reasoning.relevantEntities.length >= 2 ? reasoning.relevantEntities : ["Leading Model A", "Leading Model B"]);

      const steps: PlanStep[] = [
        {
          id: "step-1",
          title: `Extract Verified Specifications for ${entities.join(" & ")}`,
          description: "Collect factual hardware benchmarks, pricing, and feature specs",
          order: 1,
          status: hasExistingVerifiedData ? "COMPLETED" : "IN_PROGRESS",
          dependencies: [],
          requiredInputs: ["target_entities"],
          expectedOutput: `Verified specification sheets for ${entities.join(" and ")}`,
          toolRequirement: hasExistingVerifiedData ? undefined : (reasoning.toolRequirements[0] || {
            toolType: "search",
            isMandatory: true,
            priority: "REQUIRED",
            query: `${entities.join(" vs ")} detailed specs and benchmarks`,
            reason: "Verified hardware benchmarks and current pricing",
          }),
          canRunInParallel: false,
          completionCriteria: "Accurate specifications gathered for all comparison candidates",
          completedAt: hasExistingVerifiedData ? now : undefined,
        },
        {
          id: "step-2",
          title: "Conduct Side-by-Side Dimensional Comparison",
          description: "Evaluate candidates across performance, thermals, display, battery, and build",
          order: 2,
          status: hasExistingVerifiedData ? "READY" : "NOT_STARTED",
          dependencies: ["step-1"],
          requiredInputs: ["verified_specifications"],
          expectedOutput: "Structured side-by-side metric comparison table",
          canRunInParallel: false,
          completionCriteria: "All major performance and build trade-offs quantified",
        },
        {
          id: "step-3",
          title: "Synthesize Definitive Recommendation",
          description: "Deliver ranked recommendation tailored to user constraints with clear rationale",
          order: 3,
          status: "NOT_STARTED",
          dependencies: ["step-2"],
          requiredInputs: ["comparison_verdict", "user_constraints"],
          expectedOutput: "Definitive recommendation with pros/cons and purchase guidance",
          canRunInParallel: false,
          completionCriteria: "Clear, justified recommendation presented to user",
        },
      ];

      const dependencies: Record<string, string[]> = {
        "step-1": [],
        "step-2": ["step-1"],
        "step-3": ["step-2"],
      };

      return {
        id: planId,
        objective: `Compare ${entities.join(" vs ")} and provide a ranked recommendation`,
        goal: "product_comparison_and_recommendation",
        status: "IN_PROGRESS",
        priority,
        complexity: "MEDIUM",
        steps,
        dependencies,
        requiredInputs: ["target_entities", "user_priorities"],
        availableInputs: ["target_entities"],
        missingInputs: [],
        toolRequirements: steps.flatMap(s => s.toolRequirement ? [s.toolRequirement] : []),
        executionStrategy: "SEQUENTIAL",
        completionCriteria: [
          "Candidate specs verified",
          "Side-by-side comparison evaluated",
          "Tailored recommendation delivered"
        ],
        failureStrategy: "RETRY",
        createdAt: now,
        updatedAt: now,
        sourceIntent: intent.primaryIntent,
        sourceReasoning: reasoning.reasoningType,
        isCancellable: true,
        activeStepId: hasExistingVerifiedData ? "step-2" : "step-1",
      };
    }

    // =========================================================================
    // Scenario C2: Real-time Price & Purchase Worthiness Assessment
    // =========================================================================
    if (/\b(?:today'?s\s+price|price\s+of|worth\s+buying|should\s+i\s+buy)\b/i.test(lower)) {
      const targetMatch = lower.match(/\b(?:price\s+of|buy)\s+([a-z0-9\s]+?)(?:\s+in|\s+and|\.|\?|$)/i);
      const targetEntity = reasoning.relevantEntities[0] || (targetMatch ? targetMatch[1].trim() : "target product");

      const steps: PlanStep[] = [
        {
          id: "step-1",
          title: `Retrieve Current Verified Market Price for ${targetEntity}`,
          description: "Search live retail sources for genuine current pricing and availability",
          order: 1,
          status: "IN_PROGRESS",
          dependencies: [],
          requiredInputs: ["target_product", "region"],
          expectedOutput: `Verified current pricing for ${targetEntity}`,
          toolRequirement: {
            toolType: "search",
            isMandatory: true,
            priority: "REQUIRED",
            query: `${targetEntity} price today in Bangladesh`,
            reason: "Verify latest genuine retail and official price",
          },
          canRunInParallel: false,
          completionCriteria: "Accurate current price figures established",
        },
        {
          id: "step-2",
          title: "Evaluate Price-to-Performance & Key Alternatives",
          description: "Analyze whether feature set justifies current price against competitive options",
          order: 2,
          status: "NOT_STARTED",
          dependencies: ["step-1"],
          requiredInputs: ["current_price", "specs"],
          expectedOutput: "Value assessment and comparison against alternatives",
          canRunInParallel: false,
          completionCriteria: "Trade-offs and value proposition analyzed",
        },
        {
          id: "step-3",
          title: "Deliver Definitive Buying Verdict",
          description: "Provide clear buy/skip recommendation tailored to current market conditions",
          order: 3,
          status: "NOT_STARTED",
          dependencies: ["step-2"],
          requiredInputs: ["value_assessment"],
          expectedOutput: "Definitive purchase recommendation",
          canRunInParallel: false,
          completionCriteria: "Clear, justified buying advice delivered",
        },
      ];

      const dependencies: Record<string, string[]> = {
        "step-1": [],
        "step-2": ["step-1"],
        "step-3": ["step-2"],
      };

      return {
        id: planId,
        objective: `Determine today's price and evaluate purchase worthiness for ${targetEntity}`,
        goal: "price_and_value_assessment",
        status: "IN_PROGRESS",
        priority,
        complexity: "LOW",
        steps,
        dependencies,
        requiredInputs: ["target_product"],
        availableInputs: ["target_product"],
        missingInputs: [],
        toolRequirements: steps.flatMap(s => s.toolRequirement ? [s.toolRequirement] : []),
        executionStrategy: "SEQUENTIAL",
        completionCriteria: [
          "Current price verified",
          "Value proposition assessed",
          "Buying verdict provided",
        ],
        failureStrategy: "ALTERNATIVE_TOOL",
        createdAt: now,
        updatedAt: now,
        sourceIntent: intent.primaryIntent,
        sourceReasoning: reasoning.reasoningType,
        isCancellable: true,
        activeStepId: "step-1",
      };
    }

    // =========================================================================
    // Scenario D: Multi-Step Research & Recommendation (Under constraint)
    // =========================================================================
    const constraintsSummary = reasoning.relevantConstraints.map(c => `${c.key}: ${c.value}`).join(", ");

    const steps: PlanStep[] = [
      {
        id: "step-1",
        title: "Identify Candidate Products",
        description: "Surface top market options matching category and hard constraints",
        order: 1,
        status: hasExistingVerifiedData ? "COMPLETED" : "IN_PROGRESS",
        dependencies: [],
        requiredInputs: ["domain", "budget_constraint"],
        expectedOutput: "List of qualified product candidates",
        toolRequirement: hasExistingVerifiedData ? undefined : {
          toolType: "search",
          isMandatory: true,
          priority: "REQUIRED",
          query: `best ${context?.activeTopic || "laptop"} ${constraintsSummary}`,
          reason: "Find current market candidate models matching constraints",
        },
        canRunInParallel: false,
        completionCriteria: "At least 2-3 viable candidate models identified",
        completedAt: hasExistingVerifiedData ? now : undefined,
      },
      {
        id: "step-2",
        title: "Filter by Hard Constraints",
        description: "Strictly eliminate any candidate exceeding budget or lacking mandatory hardware",
        order: 2,
        status: hasExistingVerifiedData ? "READY" : "NOT_STARTED",
        dependencies: ["step-1"],
        requiredInputs: ["candidate_list", "hard_constraints"],
        expectedOutput: "Filtered list of compliant candidates",
        canRunInParallel: false,
        completionCriteria: "All remaining candidates strictly satisfy hard limits",
      },
      {
        id: "step-3",
        title: "Collect Factual Specifications",
        description: "Gather verified performance benchmarks, display ratings, and battery metrics",
        order: 3,
        status: "NOT_STARTED",
        dependencies: ["step-2"],
        requiredInputs: ["filtered_candidates"],
        expectedOutput: "Factual specification matrix",
        toolRequirement: {
          toolType: "search",
          isMandatory: true,
          priority: "REQUIRED",
          query: "candidate specifications and benchmark scores",
          reason: "Retrieve verified hardware benchmarks",
        },
        canRunInParallel: false,
        completionCriteria: "Factual specifications acquired without hallucinated estimates",
      },
      {
        id: "step-4",
        title: "Compare Candidates & Evaluate Trade-offs",
        description: "Score candidates against secondary user preferences (portability, battery, build)",
        order: 4,
        status: "NOT_STARTED",
        dependencies: ["step-3"],
        requiredInputs: ["factual_specs", "soft_preferences"],
        expectedOutput: "Comparative evaluation scoring and trade-off summary",
        canRunInParallel: false,
        completionCriteria: "Trade-offs between top contenders explicitly mapped",
      },
      {
        id: "step-5",
        title: "Synthesize Final Recommendation",
        description: "Formulate top recommended model with supporting justification and trade-off advice",
        order: 5,
        status: "NOT_STARTED",
        dependencies: ["step-4"],
        requiredInputs: ["tradeoff_analysis"],
        expectedOutput: "Comprehensive recommendation presentation",
        canRunInParallel: false,
        completionCriteria: "User presented with clear, actionable purchase guidance",
      },
    ];

    const dependencies: Record<string, string[]> = {
      "step-1": [],
      "step-2": ["step-1"],
      "step-3": ["step-2"],
      "step-4": ["step-3"],
      "step-5": ["step-4"],
    };

    return {
      id: planId,
      objective: `Identify the best ${context?.activeTopic || "product"} matching constraints and provide a justified recommendation`,
      goal: context?.currentTask || "purchase_research",
      status: "IN_PROGRESS",
      priority,
      complexity: reasoning.relevantConstraints.length >= 3 ? "HIGH" : "MEDIUM",
      steps,
      dependencies,
      requiredInputs: reasoning.relevantConstraints.map(c => c.key),
      availableInputs: reasoning.relevantConstraints.map(c => c.key),
      missingInputs: [],
      toolRequirements: steps.flatMap(s => s.toolRequirement ? [s.toolRequirement] : []),
      executionStrategy: "SEQUENTIAL",
      completionCriteria: [
        "Candidate products identified",
        "Hard constraints satisfied",
        "Factual specifications collected",
        "Trade-offs evaluated",
        "Top recommendation delivered"
      ],
      failureStrategy: "RETRY",
      createdAt: now,
      updatedAt: now,
      sourceIntent: intent.primaryIntent,
      sourceReasoning: reasoning.reasoningType,
      isCancellable: true,
      activeStepId: hasExistingVerifiedData ? "step-2" : "step-1",
    };
  }

  /**
   * Applies user correction to the active plan in-place
   */
  private applyCorrectionToPlan(plan: TaskPlan, targetEntity: string, message: string): TaskPlan {
    const updatedPlan: TaskPlan = {
      ...plan,
      updatedAt: plan.updatedAt || 0,
    };

    // Update steps referencing old entity
    updatedPlan.steps = plan.steps.map((step) => {
      if (step.id === "step-1" || step.id === "step-2" || step.id === "step-3") {
        return {
          ...step,
          status: step.status === "COMPLETED" ? "READY" : step.status, // Re-open if affected
          description: targetEntity ? step.description.replace(/ASUS|Acer|Dell|HP/i, targetEntity) : step.description,
          toolRequirement: step.toolRequirement && targetEntity
            ? {
                ...step.toolRequirement,
                query: `${targetEntity} specifications and price`,
              }
            : step.toolRequirement,
        };
      }
      return step;
    });

    return updatedPlan;
  }

  /**
   * Adapts active plan steps to modified constraints while preserving completed work
   */
  private applyConstraintUpdateToPlan(
    plan: TaskPlan,
    constraints: StructuredReasoningConstraint[],
    message: string
  ): TaskPlan {
    const updatedPlan: TaskPlan = {
      ...plan,
      updatedAt: plan.updatedAt || 0,
      requiredInputs: Array.from(new Set([...plan.requiredInputs, ...constraints.map(c => c.key)])),
      availableInputs: Array.from(new Set([...plan.availableInputs, ...constraints.map(c => c.key)])),
    };

    // Update Filter & Candidate Steps
    updatedPlan.steps = plan.steps.map((step) => {
      if (step.id === "step-2" || step.id === "step-4" || step.id === "step-5") {
        return {
          ...step,
          description: `${step.description} (Updated with: ${constraints.map(c => `${c.key}=${c.value}`).join(", ")})`,
          status: step.status === "COMPLETED" ? "READY" : step.status, // Re-evaluate filter stage
        };
      }
      return step;
    });

    return updatedPlan;
  }

  /**
   * Verifies that all declared dependencies for a step exist in the plan and have COMPLETED status
   */
  public areDependenciesSatisfied(step: PlanStep, plan: TaskPlan): boolean {
    if (!step.dependencies || step.dependencies.length === 0) {
      return true;
    }
    for (const depId of step.dependencies) {
      const depStep = plan.steps.find(s => s.id === depId);
      if (!depStep || depStep.status !== "COMPLETED") {
        return false;
      }
    }
    return true;
  }

  /**
   * Progresses step status across conversational turns safely without fabricating completion.
   * A step may transition to COMPLETED ONLY when there is genuine validated completion evidence.
   */
  public progressActivePlan(
    plan: TaskPlan,
    intent: StructuredIntent,
    reasoning: ReasoningAnalysis,
    message: string
  ): TaskPlan {
    const updatedPlan: TaskPlan = {
      ...plan,
      updatedAt: plan.updatedAt || 0,
    };

    // Update eligible steps whose dependencies are now all COMPLETED to READY if they were NOT_STARTED
    updatedPlan.steps = updatedPlan.steps.map(step => {
      if (step.status === "NOT_STARTED" && this.areDependenciesSatisfied(step, updatedPlan)) {
        return { ...step, status: "READY" };
      }
      return step;
    });

    // Find current active step
    const currentActiveStep = updatedPlan.steps.find(s => s.id === updatedPlan.activeStepId);

    // If current active step is COMPLETED (e.g. from validated execution / verified context), activate next eligible step
    if (currentActiveStep && currentActiveStep.status === "COMPLETED") {
      const nextEligibleStep = updatedPlan.steps.find(s => {
        if (s.id === currentActiveStep.id) return false;
        if (s.status !== "READY" && s.status !== "NOT_STARTED") return false;
        return this.areDependenciesSatisfied(s, updatedPlan);
      });

      if (nextEligibleStep) {
        nextEligibleStep.status = "IN_PROGRESS";
        updatedPlan.activeStepId = nextEligibleStep.id;
      }
    } else if (!currentActiveStep || currentActiveStep.status !== "IN_PROGRESS") {
      // If no step is in progress, find first eligible step whose dependencies are satisfied
      const nextEligibleStep = updatedPlan.steps.find(s => {
        if (s.status !== "READY" && s.status !== "NOT_STARTED") return false;
        return this.areDependenciesSatisfied(s, updatedPlan);
      });
      if (nextEligibleStep) {
        nextEligibleStep.status = "IN_PROGRESS";
        updatedPlan.activeStepId = nextEligibleStep.id;
      }
    }

    // Check overall plan completion: if ALL steps are COMPLETED
    const allCompleted = updatedPlan.steps.every(s => s.status === "COMPLETED");
    if (allCompleted && updatedPlan.steps.length > 0) {
      updatedPlan.status = "COMPLETED";
    }

    return updatedPlan;
  }

  /**
   * Derives plan priority based on urgency signals in message
   */
  private derivePriority(lower: string): PlanPriority {
    if (this.urgentRegex.test(lower)) {
      return "HIGH";
    }
    return "NORMAL";
  }
}

export const planningEngine = PlanningEngine.getInstance();
