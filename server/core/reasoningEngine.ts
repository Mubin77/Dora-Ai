/**
 * Dora Reasoning Engine
 * 
 * Performs deterministic, structured reasoning analysis for Dora's Core Intelligence:
 * - Determines whether reasoning is required
 * - Classifies reasoning type and complexity
 * - Filters relevant context and entities (isolates stale/unrelated domain context)
 * - Identifies hard constraints vs soft preferences
 * - Decomposes multi-step tasks into actionable structured subtasks
 * - Analyzes comparison factors and trade-off dimensions
 * - Detects missing information and external tool requirements
 * - Calculates structured reasoning confidence
 * 
 * STRICT CONSTRAINT: Does NOT store or output hidden chain-of-thought.
 */

import { ConversationContext, ConversationTurn, TrackedEntity } from "./contextTypes";
import { StructuredIntent, BrainIntent } from "./intentTypes";
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

export class ReasoningEngine {
  private static instance: ReasoningEngine;

  private constructor() {}

  public static getInstance(): ReasoningEngine {
    if (!ReasoningEngine.instance) {
      ReasoningEngine.instance = new ReasoningEngine();
    }
    return ReasoningEngine.instance;
  }

  // Trade-off detection patterns
  private tradeoffRegex =
    /\b(?:trade-?off|which\s+is\s+better\s*:\s*[a-z0-9\s]+\s+or\s+[a-z0-9\s]+|should\s+i\s+(?:choose|get|pick|buy)\s+(?:a\s+)?(?:lighter|faster|cheaper|smaller|bigger|portable|powerful)\s+.*?\s+or\s+(?:a\s+)?(?:lighter|faster|cheaper|smaller|bigger|portable|powerful)|performance\s+vs\s+battery|power\s+vs\s+portability|price\s+vs\s+performance|quality\s+vs\s+speed)\b/i;

  // Simple math / computation pattern
  private simpleMathRegex =
    /^(?:what\s+is|calculate|compute)?\s*([0-9]+(?:\.[0-9]+)?)\s*([\+\-\*\/x×÷])\s*([0-9]+(?:\.[0-9]+)?)\s*\??$/i;

  // Hard constraint signal words
  private hardConstraintSignalRegex =
    /\b(?:must|mandatory|strictly|required|needs?\s+to\s+have|only|cannot|must\s+be|compulsory)\b/i;

  // Soft preference signal words
  private softPreferenceSignalRegex =
    /\b(?:preferred|prefer|nice\s+to\s+have|optional|decent|good|ideally|if\s+possible|better\s+if)\b/i;

  // Real-time / Live Price / Specs Lookup pattern
  private externalInfoRegex =
    /\b(?:latest\s+price|current\s+price|how\s+much\s+does\s+it\s+cost\s+today|today'?s\s+rate|weather|forecast|stock\s+price|live\s+score|news\s+today|release\s+date)\b/i;

  /**
   * Main reasoning evaluation entry point
   */
  public analyze(
    message: string,
    structuredIntent: StructuredIntent,
    context?: ConversationContext,
    history: ConversationTurn[] = []
  ): ReasoningAnalysis {
    const trimmed = (message || "").trim();
    const lower = trimmed.toLowerCase();

    const activeTopic = context?.activeTopic;
    const currentTask = context?.currentTask;
    const userGoal = context?.userGoal;
    const isTopicSwitched = Boolean(context?.isTopicSwitched);

    // 1. Check for Simple Direct Conversational Requests (No reasoning needed)
    if (this.isSimpleConversational(lower, structuredIntent)) {
      return this.buildDirectAnswerAnalysis(
        "Casual conversation or standard greeting",
        structuredIntent,
        context
      );
    }

    // 2. Check for Simple Calculation (Direct computation)
    const mathMatch = trimmed.match(this.simpleMathRegex);
    if (mathMatch) {
      return this.buildCalculationAnalysis(mathMatch, trimmed, context);
    }

    // 3. Filter context relevance (Isolate unrelated topics like movie vs laptop or weather vs laptop)
    const { relevantEntities, relevantConstraints } = this.filterRelevantContext(
      trimmed,
      lower,
      context,
      isTopicSwitched
    );

    // 4. Extract explicit constraints from current message
    const explicitConstraints = this.extractConstraintsFromMessage(trimmed, lower);
    const combinedConstraints = this.mergeConstraints(relevantConstraints, explicitConstraints);

    // 5. Trade-off Analysis
    if (this.tradeoffRegex.test(lower) || /should\s+i\s+(?:choose|pick|get)\s+.*?\s+or\s+/i.test(lower)) {
      return this.buildTradeoffAnalysis(trimmed, lower, combinedConstraints, context);
    }

    // 6. Tool-Assisted / External Real-Time Information (Highest priority for live/weather/price lookups)
    if (
      structuredIntent.primaryIntent === "REAL_TIME_INFORMATION" ||
      this.externalInfoRegex.test(lower) ||
      context?.activeTopic === "weather inquiry" ||
      /\b(?:latest|current)\s+price\b/i.test(lower)
    ) {
      return this.buildToolAssistedAnalysis(trimmed, lower, structuredIntent, context);
    }

    // 7. Multi-Step Problem Detection
    if (
      (structuredIntent.isMultiIntent && !structuredIntent.primaryIntent.includes("COMPARISON")) ||
      /\b(?:find\s+.*?compare\s+.*?recommend|and\s+then|after\s+that|steps\s+to|how\s+to\s+build)\b/i.test(lower)
    ) {
      return this.buildMultiStepAnalysis(
        trimmed,
        lower,
        structuredIntent,
        relevantEntities,
        combinedConstraints,
        context
      );
    }

    // 8. Targeted Comparison Follow-Up vs Broad Comparison
    if (
      structuredIntent.primaryIntent === "COMPARISON" ||
      structuredIntent.secondaryIntent === "COMPARISON" ||
      /\b(?:compare|vs|versus|difference\s+between)\b/i.test(lower)
    ) {
      return this.buildComparisonAnalysis(
        trimmed,
        lower,
        structuredIntent,
        relevantEntities,
        combinedConstraints,
        context
      );
    }

    // 9. Multi-Factor Recommendation / Decision
    if (
      structuredIntent.primaryIntent === "RECOMMENDATION" ||
      currentTask === "purchase_research" ||
      combinedConstraints.length >= 2 ||
      /\b(?:need\s+a|want\s+a|looking\s+for|recommend|which\s+laptop|which\s+phone)\s+(?:laptop|phone|pc|gpu|camera|car|device|should\s+i\s+buy)?\b/i.test(lower)
    ) {
      return this.buildRecommendationAnalysis(
        trimmed,
        lower,
        structuredIntent,
        relevantEntities,
        combinedConstraints,
        context
      );
    }

    // 10. Default Direct / Simple Deduction
    return this.buildStandardAnalysis(
      trimmed,
      lower,
      structuredIntent,
      relevantEntities,
      combinedConstraints,
      context
    );
  }

  /**
   * Identifies simple non-reasoning conversational inputs
   */
  private isSimpleConversational(lower: string, intent: StructuredIntent): boolean {
    if (intent.primaryIntent === "CONFIRMATION" || intent.primaryIntent === "REJECTION") {
      return false; // Confirmations link to actions
    }

    // If it contains technical specs, requirements, or constraints, it is not a casual greeting
    if (/\b(?:mandatory|required|prefer|rtx|gpu|laptop|phone|price|budget|weather|compare|vs)\b/i.test(lower)) {
      return false;
    }

    const simpleGreetings =
      /^(?:hey\s+(?:dora|there)[,\s]*|hi\s+(?:dora|there)[,\s]*|hello[,\s]*|assalamu\s+alaikum[,\s]*)?(?:what'?s\s+up|how\s+are\s+you|how's\s+it\s+going|kemon\s+acho|ki\s+khobor|ki\s+obostha|good\s+(?:morning|evening|afternoon|night)|hi|hello|hey|howdy|sup)[.?!]?$/i;
    
    return simpleGreetings.test(lower.trim());
  }

  /**
   * Direct answer analysis
   */
  private buildDirectAnswerAnalysis(
    objective: string,
    intent: StructuredIntent,
    context?: ConversationContext
  ): ReasoningAnalysis {
    return {
      reasoningRequired: false,
      reasoningType: "DIRECT_ANSWER",
      complexity: "LOW",
      objective,
      relevantContext: {
        topic: context?.activeTopic,
        task: context?.currentTask,
        userGoal: context?.userGoal,
      },
      relevantEntities: [],
      relevantConstraints: [],
      assumptions: [],
      missingInformation: [],
      subtasks: [],
      comparisons: [],
      tradeoffs: [],
      evidenceRequirements: [],
      toolRequirements: [],
      conclusionStrategy: "FACTUAL_ANSWER",
      reasoningConfidence: 0.98,
      requiresClarification: false,
      directives: [
        "Respond warmly, concisely, and naturally in Dora's conversational voice."
      ],
    };
  }

  /**
   * Simple Calculation analysis
   */
  private buildCalculationAnalysis(
    mathMatch: RegExpMatchArray,
    message: string,
    context?: ConversationContext
  ): ReasoningAnalysis {
    const num1 = parseFloat(mathMatch[1]);
    const op = mathMatch[2];
    const num2 = parseFloat(mathMatch[3]);

    let result = 0;
    if (op === "+") result = num1 + num2;
    else if (op === "-") result = num1 - num2;
    else if (op === "*" || op === "x" || op === "×") result = num1 * num2;
    else if (op === "/" || op === "÷") result = num2 !== 0 ? num1 / num2 : NaN;

    return {
      reasoningRequired: false, // Simple arithmetic does not require complex multi-step reasoning
      reasoningType: "CALCULATION",
      complexity: "LOW",
      objective: `Calculate ${num1} ${op} ${num2}`,
      relevantContext: {},
      relevantEntities: [],
      relevantConstraints: [],
      assumptions: [],
      missingInformation: [],
      subtasks: [],
      comparisons: [],
      tradeoffs: [],
      evidenceRequirements: [],
      toolRequirements: [],
      conclusionStrategy: "FACTUAL_ANSWER",
      reasoningConfidence: 1.0,
      requiresClarification: false,
      directives: [
        `Direct arithmetic result: ${num1} ${op} ${num2} = ${result}. State the exact answer directly.`
      ],
    };
  }

  /**
   * Filters context so unrelated historical domains (e.g. weather or movies) do not contaminate current reasoning
   */
  private filterRelevantContext(
    message: string,
    lower: string,
    context?: ConversationContext,
    isTopicSwitched: boolean = false
  ): {
    relevantEntities: string[];
    relevantConstraints: StructuredReasoningConstraint[];
  } {
    if (!context) {
      return { relevantEntities: [], relevantConstraints: [] };
    }

    // If the topic just switched to something unrelated (e.g. Weather inquiry), clear prior domain constraints
    if (isTopicSwitched) {
      return { relevantEntities: [], relevantConstraints: [] };
    }

    const currentDomain = (context.activeTopic || "").toLowerCase();
    const isTechDomain = /laptop|phone|hardware|gpu|computer|device|tech/i.test(currentDomain) ||
      /laptop|phone|gpu|pc|ram|specs/i.test(lower);

    const relevantEntities: string[] = [];
    for (const entity of context.entities) {
      if (entity.status === "active") {
        relevantEntities.push(entity.name);
      }
    }

    const relevantConstraints: StructuredReasoningConstraint[] = [];
    for (const constraint of context.constraints) {
      if (!constraint.isOverridden) {
        // If current query is weather, ignore laptop budget/specs constraints
        if (/weather/i.test(lower) && (constraint.key === "budget" || constraint.key === "brand" || constraint.key === "gpu")) {
          continue;
        }

        const isHard = Boolean(
          constraint.key === "budget" ||
          constraint.key === "brand" ||
          (this.hardConstraintSignalRegex.test(lower) && !this.softPreferenceSignalRegex.test(String(constraint.value))) ||
          this.hardConstraintSignalRegex.test(String(constraint.value))
        );

        relevantConstraints.push({
          key: constraint.key,
          value: constraint.value,
          isHardConstraint: isHard,
          source: "context_inferred",
        });
      }
    }

    return { relevantEntities, relevantConstraints };
  }

  /**
   * Extracts constraints with hard vs soft qualification
   */
  private extractConstraintsFromMessage(
    message: string,
    lower: string
  ): StructuredReasoningConstraint[] {
    const constraints: StructuredReasoningConstraint[] = [];

    // Budget: under 80k, max 90000, 80k budget
    const budgetMatch = lower.match(/\b(?:budget|under|below|max|upto|within)\s*(?:is|of)?\s*([0-9]+)k?\b|\b([0-9]+)k\s*(?:budget|er\s*moddhe)\b/i);
    if (budgetMatch) {
      const rawNum = budgetMatch[1] || budgetMatch[2];
      const val = parseInt(rawNum, 10) < 1000 ? parseInt(rawNum, 10) * 1000 : parseInt(rawNum, 10);
      constraints.push({
        key: "budget",
        value: val,
        isHardConstraint: true, // Budget is by default a hard limit
        source: "user_explicit",
      });
    }

    // RTX requirement
    if (/\brtx\b/i.test(lower)) {
      const isMandatory = this.hardConstraintSignalRegex.test(lower) || /rtx\s+(?:is\s+)?(?:mandatory|required|must|needed)\b/i.test(lower);
      constraints.push({
        key: "gpu_requirement",
        value: "RTX",
        isHardConstraint: isMandatory || true,
        source: "user_explicit",
      });
    }

    // Battery preference
    if (/\bbattery\b/i.test(lower)) {
      const isMandatory = /battery\s+(?:is\s+)?(?:mandatory|must|strictly\s+required)/i.test(lower);
      const isSoft = /good\s+battery|decent\s+battery|battery\s+(?:is\s+)?preferred|prefer\s+battery/i.test(lower);
      constraints.push({
        key: "battery_preference",
        value: "good battery life",
        isHardConstraint: isMandatory,
        source: "user_explicit",
      });
    }

    // Weight / Portability
    if (/\b(?:lightweight|portable|thin\s+and\s+light|light\s+weight)\b/i.test(lower)) {
      const isMandatory = /must\s+be\s+lightweight|strictly\s+lightweight/i.test(lower);
      constraints.push({
        key: "weight_preference",
        value: "lightweight / portable",
        isHardConstraint: isMandatory,
        source: "user_explicit",
      });
    }

    // Brand constraint
    const brandMatch = lower.match(/\b(?:only|actually|just)?\s*(samsung|asus|lenovo|apple|dell|hp|acer|sony)\b/i);
    if (brandMatch && !/compare/i.test(lower)) {
      const isHard = /only|strictly|must\s+be/i.test(lower);
      constraints.push({
        key: "brand",
        value: brandMatch[1].toUpperCase(),
        isHardConstraint: isHard,
        source: "user_explicit",
      });
    }

    return constraints;
  }

  /**
   * Merges constraints, deduplicating keys
   */
  private mergeConstraints(
    existing: StructuredReasoningConstraint[],
    novel: StructuredReasoningConstraint[]
  ): StructuredReasoningConstraint[] {
    const map = new Map<string, StructuredReasoningConstraint>();
    for (const c of existing) {
      map.set(c.key, c);
    }
    for (const c of novel) {
      map.set(c.key, c); // novel overrides or adds
    }
    return Array.from(map.values());
  }

  /**
   * Trade-off reasoning builder
   */
  private buildTradeoffAnalysis(
    message: string,
    lower: string,
    constraints: StructuredReasoningConstraint[],
    context?: ConversationContext
  ): ReasoningAnalysis {
    const tradeoffs: TradeoffDimension[] = [];

    if (/light|portable|weight/i.test(lower) && /power|perform|gpu|gaming/i.test(lower)) {
      tradeoffs.push({
        dimensionA: "Portability & Lightweight Chassis",
        dimensionB: "Raw Performance & Cooling Capacity",
        explanation: "Lighter laptops are easier to carry but have smaller heatsinks and lower power limits, whereas heavier performance laptops sustain higher wattage and framerates at the cost of bulk.",
      });
    } else if (/battery/i.test(lower) && /performance|power|display|4k|high\s+refresh/i.test(lower)) {
      tradeoffs.push({
        dimensionA: "Battery Longevity",
        dimensionB: "Peak Performance & High-Wattage Components",
        explanation: "Dedicated GPUs and high-wattage CPUs drain battery rapidly, necessitating a balance between unplugged runtime and peak processing power.",
      });
    } else {
      tradeoffs.push({
        dimensionA: "Form Factor / Cost Efficiency",
        dimensionB: "Maximum Feature Set / Performance",
        explanation: "Evaluating competing design priorities where optimizing for one metric inevitably impacts the other.",
      });
    }

    const directives = [
      "TRADE-OFF ANALYSIS: Do not declare one option universally superior. Clearly articulate the trade-offs between both dimensions and guide the user on which choice aligns with their specific workflow."
    ];

    return {
      reasoningRequired: true,
      reasoningType: "TRADEOFF_ANALYSIS",
      complexity: "MEDIUM",
      objective: "Analyze conflicting requirements and articulate key trade-offs",
      relevantContext: {
        topic: context?.activeTopic,
        task: context?.currentTask,
        userGoal: context?.userGoal,
      },
      relevantEntities: context?.entities.map(e => e.name) || [],
      relevantConstraints: constraints,
      assumptions: [],
      missingInformation: [],
      subtasks: [
        {
          id: "subtask-1",
          stepNumber: 1,
          description: "Identify competing user priorities (Portability vs Performance)",
          status: "completed",
        },
        {
          id: "subtask-2",
          stepNumber: 2,
          description: "Evaluate advantages and compromises of each dimension",
          status: "pending",
        },
        {
          id: "subtask-3",
          stepNumber: 3,
          description: "Synthesize clear, balanced guidance for the user",
          status: "pending",
        },
      ],
      comparisons: [],
      tradeoffs,
      evidenceRequirements: [],
      toolRequirements: [],
      conclusionStrategy: "TRADEOFF_EXPLANATION",
      reasoningConfidence: 0.94,
      requiresClarification: false,
      reasoningPlanSummary: [
        "1. Identify competing attributes",
        "2. Break down thermal/performance vs portability compromises",
        "3. Deliver balanced decision guidance"
      ],
      directives,
    };
  }

  /**
   * Comparison reasoning builder
   */
  private buildComparisonAnalysis(
    message: string,
    lower: string,
    intent: StructuredIntent,
    entities: string[],
    constraints: StructuredReasoningConstraint[],
    context?: ConversationContext
  ): ReasoningAnalysis {
    // Extract entities from message if not already tracked
    const extractedEntities = [...entities];
    const brandMatches = lower.match(/\b(asus|lenovo|dell|hp|apple|samsung|acer|razer|msi)\b/gi);
    if (brandMatches) {
      for (const b of brandMatches) {
        const capitalized = b.charAt(0).toUpperCase() + b.slice(1).toLowerCase();
        if (!extractedEntities.includes(capitalized)) {
          extractedEntities.push(capitalized);
        }
      }
    }

    // Check if user is asking a targeted comparison (e.g. "Which one has better battery?")
    const isTargetedAspect = Boolean(intent.targetAspect || /\b(?:battery|display|screen|camera|price|thermals|gpu|cooling)\b/i.test(lower));
    const targetAspect = intent.targetAspect || lower.match(/\b(battery|display|screen|camera|price|thermals|gpu|cooling)\b/i)?.[1];

    const comparisons: ComparisonFactor[] = [];
    if (isTargetedAspect && targetAspect) {
      comparisons.push({
        factor: targetAspect.toLowerCase(),
        relevance: 1.0,
        entities: extractedEntities,
      });
    } else {
      comparisons.push(
        { factor: "Performance & Hardware", relevance: 0.9, entities: extractedEntities },
        { factor: "Build Quality & Thermals", relevance: 0.85, entities: extractedEntities },
        { factor: "Price & Value Proposition", relevance: 0.8, entities: extractedEntities },
        { factor: "Battery Life & Efficiency", relevance: 0.75, entities: extractedEntities }
      );
    }

    const directives = [
      `COMPARISON REASONING: Compare [${extractedEntities.join(", ")}] focusing on ${isTargetedAspect ? `[${targetAspect}]` : "key differentiators (performance, thermals, build, value)"}. Weigh strengths objectively.`
    ];

    const toolRequirements: ToolRequirement[] = [];
    const evidenceRequirements: string[] = [];

    // If specific models are being compared without verified specs in context, note evidence requirement
    if (extractedEntities.length >= 2) {
      evidenceRequirements.push(`Verified specifications and benchmark data for ${extractedEntities.join(" and ")}`);
    }

    return {
      reasoningRequired: true,
      reasoningType: "COMPARISON",
      complexity: isTargetedAspect ? "LOW" : "MEDIUM",
      objective: isTargetedAspect
        ? `Compare ${extractedEntities.join(" vs ")} specifically on ${targetAspect}`
        : `Comprehensive comparison of ${extractedEntities.join(" vs ")}`,
      relevantContext: {
        topic: context?.activeTopic,
        task: context?.currentTask,
        userGoal: context?.userGoal,
      },
      relevantEntities: extractedEntities,
      relevantConstraints: constraints,
      assumptions: [],
      missingInformation: [],
      subtasks: [
        {
          id: "subtask-1",
          stepNumber: 1,
          description: `Analyze ${isTargetedAspect ? targetAspect : "key performance and build metrics"} for each entity`,
          status: "pending",
        },
        {
          id: "subtask-2",
          stepNumber: 2,
          description: "Synthesize side-by-side comparison verdict",
          status: "pending",
        },
      ],
      comparisons,
      tradeoffs: [],
      evidenceRequirements,
      toolRequirements,
      conclusionStrategy: "COMPARISON_VERDICT",
      reasoningConfidence: extractedEntities.length >= 2 ? 0.92 : 0.75,
      requiresClarification: extractedEntities.length < 2 && !context?.activeTopic,
      reasoningPlanSummary: [
        `1. Evaluate ${extractedEntities.join(" & ")}`,
        `2. Compare on ${comparisons.map(c => c.factor).join(", ")}`,
        "3. Produce clear verdict"
      ],
      directives,
    };
  }

  /**
   * Multi-Factor Recommendation Analysis
   */
  private buildRecommendationAnalysis(
    message: string,
    lower: string,
    intent: StructuredIntent,
    entities: string[],
    constraints: StructuredReasoningConstraint[],
    context?: ConversationContext
  ): ReasoningAnalysis {
    const missingInfo: string[] = [];
    let requiresClarification = false;
    let clarificationPrompt: string | undefined;

    // If there are zero constraints and zero use-case specified for a broad recommendation, note missing info
    const hasBudget = constraints.some(c => c.key === "budget");
    const hasUseCase = /gaming|programming|editing|student|office|work|casual/i.test(lower) ||
      /gaming|programming|editing/i.test(context?.activeTopic || "");

    if (!hasBudget && !hasUseCase) {
      missingInfo.push("budget", "primary use case");
      requiresClarification = true;
      clarificationPrompt = "To help you pick the best laptop, could you share your approximate budget and whether you need it for gaming, coding, or everyday use?";
    }

    const subtasks: ReasoningSubtask[] = [
      {
        id: "subtask-1",
        stepNumber: 1,
        description: "Filter candidate models by hard constraints (budget, mandatory GPU)",
        status: "pending",
      },
      {
        id: "subtask-2",
        stepNumber: 2,
        description: "Rank remaining options based on soft preferences (battery, weight, thermals)",
        status: "pending",
      },
      {
        id: "subtask-3",
        stepNumber: 3,
        description: "Formulate top recommendation with rationale",
        status: "pending",
      },
    ];

    const directives = [
      "MULTI-FACTOR RECOMMENDATION: Evaluate all hard constraints strictly. Weigh secondary preferences to present the most suitable top choices."
    ];

    return {
      reasoningRequired: true,
      reasoningType: "MULTI_FACTOR_DECISION",
      complexity: constraints.length >= 3 ? "HIGH" : "MEDIUM",
      objective: "Select optimal product matching multi-factor constraints",
      relevantContext: {
        topic: context?.activeTopic || "product recommendation",
        task: context?.currentTask || "purchase_research",
        userGoal: context?.userGoal || "find best fitting product",
      },
      relevantEntities: entities,
      relevantConstraints: constraints,
      assumptions: [],
      missingInformation: missingInfo,
      subtasks,
      comparisons: [],
      tradeoffs: [],
      evidenceRequirements: ["Current product availability and pricing"],
      toolRequirements: [],
      conclusionStrategy: requiresClarification ? "CLARIFICATION_REQUEST" : "RANKED_RECOMMENDATION",
      reasoningConfidence: requiresClarification ? 0.60 : 0.91,
      requiresClarification,
      clarificationPrompt,
      reasoningPlanSummary: [
        "1. Filter by budget and hard constraints",
        "2. Score options against soft preferences",
        "3. Deliver tailored recommendation"
      ],
      directives,
    };
  }

  /**
   * Tool-Assisted / External Real-Time Information Analysis
   */
  private buildToolAssistedAnalysis(
    message: string,
    lower: string,
    intent: StructuredIntent,
    context?: ConversationContext
  ): ReasoningAnalysis {
    const isWeather = /weather|temperature|forecast|rain/i.test(lower) || context?.activeTopic === "weather inquiry";
    const isPrice = /price|cost|dam/i.test(lower);

    const toolRequirements: ToolRequirement[] = [];
    if (isWeather) {
      toolRequirements.push({
        toolType: "weather",
        query: message,
        reason: "Real-time meteorological forecast required",
        isMandatory: true,
      });
    } else if (isPrice) {
      toolRequirements.push({
        toolType: "search",
        query: message,
        reason: "Current market pricing verification required",
        isMandatory: true,
      });
    } else {
      toolRequirements.push({
        toolType: "search",
        query: message,
        reason: "External real-time information lookup",
        isMandatory: true,
      });
    }

    return {
      reasoningRequired: true,
      reasoningType: "TOOL_ASSISTED_REASONING",
      complexity: "LOW",
      objective: isWeather ? "Retrieve and communicate live weather forecast" : "Lookup external current information",
      relevantContext: {
        topic: isWeather ? "weather inquiry" : context?.activeTopic,
      },
      relevantEntities: [],
      relevantConstraints: [], // Laptop constraints are filtered out
      assumptions: [],
      missingInformation: [],
      subtasks: [
        {
          id: "subtask-1",
          stepNumber: 1,
          description: `Query external data source (${toolRequirements[0].toolType})`,
          status: "pending",
          requiredTool: toolRequirements[0].toolType,
        },
        {
          id: "subtask-2",
          stepNumber: 2,
          description: "Synthesize and present accurate result",
          status: "pending",
        },
      ],
      comparisons: [],
      tradeoffs: [],
      evidenceRequirements: ["Live external data feed"],
      toolRequirements,
      conclusionStrategy: "TOOL_ASSISTED_RESULT",
      reasoningConfidence: 0.95,
      requiresClarification: false,
      reasoningPlanSummary: [
        `1. Query ${toolRequirements[0].toolType} data`,
        "2. Present verified information directly"
      ],
      directives: [
        `TOOL-ASSISTED INFORMATION: Retrieve verified data for "${message}". Present the facts clearly and concisely.`
      ],
    };
  }

  /**
   * Multi-Step Problem Analysis
   */
  private buildMultiStepAnalysis(
    message: string,
    lower: string,
    intent: StructuredIntent,
    entities: string[],
    constraints: StructuredReasoningConstraint[],
    context?: ConversationContext
  ): ReasoningAnalysis {
    const subtasks: ReasoningSubtask[] = [
      {
        id: "subtask-1",
        stepNumber: 1,
        description: "Identify valid candidate options matching baseline criteria",
        status: "pending",
      },
      {
        id: "subtask-2",
        stepNumber: 2,
        description: "Filter candidates strictly by hard constraints",
        status: "pending",
      },
      {
        id: "subtask-3",
        stepNumber: 3,
        description: "Compare remaining candidates across key performance and value metrics",
        status: "pending",
      },
      {
        id: "subtask-4",
        stepNumber: 4,
        description: "Evaluate trade-offs between leading contenders",
        status: "pending",
      },
      {
        id: "subtask-5",
        stepNumber: 5,
        description: "Formulate final structured recommendation",
        status: "pending",
      },
    ];

    return {
      reasoningRequired: true,
      reasoningType: "MULTI_STEP_PROBLEM",
      complexity: "HIGH",
      objective: "Execute comprehensive multi-stage research and recommendation",
      relevantContext: {
        topic: context?.activeTopic,
        task: context?.currentTask,
        userGoal: context?.userGoal,
      },
      relevantEntities: entities,
      relevantConstraints: constraints,
      assumptions: [],
      missingInformation: [],
      subtasks,
      comparisons: [
        { factor: "Performance & Specs", relevance: 0.95, entities },
        { factor: "Price & Value", relevance: 0.9, entities },
      ],
      tradeoffs: [],
      evidenceRequirements: ["Comparative benchmark data and current pricing"],
      toolRequirements: [],
      conclusionStrategy: "RANKED_RECOMMENDATION",
      reasoningConfidence: 0.90,
      requiresClarification: false,
      reasoningPlanSummary: [
        "1. Identify candidate models",
        "2. Filter by hard constraints",
        "3. Compare key factors",
        "4. Evaluate trade-offs",
        "5. Recommend top choice"
      ],
      directives: [
        "MULTI-STEP PROBLEM: Address all facets of the user request sequentially, comparing options before delivering a definitive recommendation."
      ],
    };
  }

  /**
   * Standard / Simple Deduction Analysis
   */
  private buildStandardAnalysis(
    message: string,
    lower: string,
    intent: StructuredIntent,
    entities: string[],
    constraints: StructuredReasoningConstraint[],
    context?: ConversationContext
  ): ReasoningAnalysis {
    const isQuestion = intent.primaryIntent === "QUESTION" || /[?？]$/.test(message);

    return {
      reasoningRequired: isQuestion,
      reasoningType: isQuestion ? "SIMPLE_DEDUCTION" : "DIRECT_ANSWER",
      complexity: "LOW",
      objective: "Provide direct, accurate response to user inquiry",
      relevantContext: {
        topic: context?.activeTopic,
        task: context?.currentTask,
        userGoal: context?.userGoal,
      },
      relevantEntities: entities,
      relevantConstraints: constraints,
      assumptions: [],
      missingInformation: [],
      subtasks: [],
      comparisons: [],
      tradeoffs: [],
      evidenceRequirements: [],
      toolRequirements: [],
      conclusionStrategy: "FACTUAL_ANSWER",
      reasoningConfidence: 0.88,
      requiresClarification: false,
      directives: [],
    };
  }
}

export const reasoningEngine = ReasoningEngine.getInstance();
