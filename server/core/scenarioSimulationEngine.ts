/**
 * Dora Scenario Simulation & Predictive Planning Engine
 * Phase 3 — Step 6
 * 
 * Deterministic, bounded, non-LLM, read-only engine that evaluates bounded possible
 * scenarios, propagates causal & constraint effects, compares projected outcomes,
 * and produces decision-ready sanitized predictive directives.
 * 
 * Invariant: Simulation is not reality. All projected outcomes are strictly marked
 * SIMULATED / PROJECTED / COUNTERFACTUAL / PREDICTIVE / ADVISORY.
 */

import {
  ScenarioType,
  ScenarioEpistemicStatus,
  OutcomeType,
  ActionReversibility,
  ScenarioAssumption,
  SimulationAction,
  SimulationState,
  ScenarioRisk,
  ScenarioBenefit,
  ScenarioTradeoff,
  ScenarioOutcome,
  ScenarioDefinition,
  ScenarioComparison,
  ScenarioSimulationBudgetConfig,
  DEFAULT_SCENARIO_SIMULATION_BUDGET,
  HARD_CEILING_SCENARIO_SIMULATION_BUDGET,
  ScenarioSimulationDiagnostics,
  ScenarioSimulationAnalysis,
  ScenarioSimulationOptions,
  ScenarioSimulationInput,
} from "./scenarioSimulationTypes";
import {
  EpistemicAuthority,
  EpistemicScope,
  EpistemicProvenance,
  EpistemicUncertainty,
  EPISTEMIC_AUTHORITY_WEIGHTS,
} from "./epistemicCalibrationTypes";

export class ScenarioSimulationEngine {
  private static instance: ScenarioSimulationEngine;

  private constructor() {}

  public static getInstance(): ScenarioSimulationEngine {
    if (!ScenarioSimulationEngine.instance) {
      ScenarioSimulationEngine.instance = new ScenarioSimulationEngine();
    }
    return ScenarioSimulationEngine.instance;
  }

  /**
   * Main evaluation entry point for Scenario Simulation Engine.
   * Completely read-only, deterministic, non-LLM, side-effect-free.
   */
  public evaluate(input: ScenarioSimulationInput): ScenarioSimulationAnalysis {
    const startTime = input.options?.currentTime ?? 1740000000000;
    const activeTopic = input.options?.activeTopic || "general";
    const strictTopicIsolation = input.options?.strictTopicIsolation ?? false;

    // Resolve budget with hard ceiling clamps
    const budget = this.resolveBudget(input.options?.budget);

    const diagnostics: ScenarioSimulationDiagnostics = {
      scenariosRequested: 0,
      scenariosEvaluated: 0,
      scenariosRejected: 0,
      invalidActions: 0,
      constraintViolations: 0,
      branchesCreated: 0,
      branchesRejected: 0,
      branchesTruncated: 0,
      stepsExecuted: 0,
      outcomesGenerated: 0,
      unresolvedOutcomes: 0,
      assumptionSensitiveOutcomes: 0,
      contradictionAffectedScenarios: 0,
      causalUncertaintyCount: 0,
      predictiveOnlyInputs: 0,
      unsupportedAssumptions: 0,
      topicIsolationRejections: 0,
      scopeIsolationRejections: 0,
      budgetTruncations: 0,
      directivesSanitized: 0,
      scenariosTruncated: 0,
      stepsTruncated: 0,
      outcomesTruncated: 0,
      evaluationTimeMs: 0,
    };

    // 1. Build Base State from authorized upstream context
    const baseState = this.constructBaseState(input, activeTopic, strictTopicIsolation, diagnostics);

    // 2. Discover and Define Candidate Scenarios
    const candidateScenarios = this.discoverScenarios(
      input,
      baseState,
      activeTopic,
      strictTopicIsolation,
      budget,
      diagnostics
    );

    // 3. Simulate Each Scenario deterministically
    const evaluatedScenarios: ScenarioDefinition[] = [];
    const outcomes: ScenarioOutcome[] = [];
    const allAssumptions: ScenarioAssumption[] = [];
    let baselineScenario: ScenarioDefinition | undefined;

    for (let i = 0; i < candidateScenarios.length; i++) {
      if (evaluatedScenarios.length >= budget.maxScenarios) {
        diagnostics.scenariosTruncated++;
        diagnostics.budgetTruncations++;
        break;
      }

      const rawScenario = candidateScenarios[i];
      diagnostics.scenariosEvaluated++;

      // Simulate state transitions and evaluate outcome
      const simulated = this.simulateScenario(
        rawScenario,
        input,
        budget,
        diagnostics
      );

      evaluatedScenarios.push(simulated);
      if (simulated.outcome) {
        outcomes.push(simulated.outcome);
        diagnostics.outcomesGenerated++;
      }

      for (const assump of simulated.assumptions) {
        if (!allAssumptions.some((a) => a.id === assump.id)) {
          allAssumptions.push(assump);
        }
      }

      if (simulated.scenarioType === "BASELINE") {
        baselineScenario = simulated;
      }
    }

    // 4. Deterministic Scenario Comparison & Plan Ranking
    const comparisons: ScenarioComparison[] = [];
    const { recommendedScenario, unresolvedScenarios, comparisonList } = this.compareAndRankScenarios(
      evaluatedScenarios,
      budget,
      diagnostics
    );
    comparisons.push(...comparisonList);

    // 5. Generate Sanitized Decision-Ready Directives
    const directives = this.generateDirectives(
      evaluatedScenarios,
      recommendedScenario,
      comparisons,
      budget,
      diagnostics
    );

    return {
      baselineScenario,
      scenarios: evaluatedScenarios,
      outcomes,
      comparisons,
      recommendedScenario,
      unresolvedScenarios,
      assumptions: allAssumptions,
      directives,
      diagnostics,
    };
  }

  /**
   * Resolves and bounds budget configurations with strict hard ceilings.
   */
  private resolveBudget(custom?: Partial<ScenarioSimulationBudgetConfig>): ScenarioSimulationBudgetConfig {
    const raw = { ...DEFAULT_SCENARIO_SIMULATION_BUDGET, ...custom };
    return {
      maxScenarios: Math.min(Math.max(1, raw.maxScenarios), HARD_CEILING_SCENARIO_SIMULATION_BUDGET.maxScenarios),
      maxStepsPerScenario: Math.min(Math.max(1, raw.maxStepsPerScenario), HARD_CEILING_SCENARIO_SIMULATION_BUDGET.maxStepsPerScenario),
      maxBranches: Math.min(Math.max(1, raw.maxBranches), HARD_CEILING_SCENARIO_SIMULATION_BUDGET.maxBranches),
      maxOutcomes: Math.min(Math.max(1, raw.maxOutcomes), HARD_CEILING_SCENARIO_SIMULATION_BUDGET.maxOutcomes),
      maxActionsPerScenario: Math.min(Math.max(1, raw.maxActionsPerScenario), HARD_CEILING_SCENARIO_SIMULATION_BUDGET.maxActionsPerScenario),
      maxComparisons: Math.min(Math.max(1, raw.maxComparisons), HARD_CEILING_SCENARIO_SIMULATION_BUDGET.maxComparisons),
      maxDirectives: Math.min(Math.max(1, raw.maxDirectives), HARD_CEILING_SCENARIO_SIMULATION_BUDGET.maxDirectives),
      maxTotalItems: Math.min(Math.max(10, raw.maxTotalItems), HARD_CEILING_SCENARIO_SIMULATION_BUDGET.maxTotalItems),
    };
  }

  /**
   * Constructs the Base State from authorized inputs without mutating any sources.
   */
  private constructBaseState(
    input: ScenarioSimulationInput,
    activeTopic: string,
    strictTopicIsolation: boolean,
    diagnostics: ScenarioSimulationDiagnostics
  ): SimulationState {
    const facts: SimulationState["facts"] = [];
    const constraints: SimulationState["constraints"] = [];
    const goals: SimulationState["goals"] = [];
    const commitments: SimulationState["commitments"] = [];
    const causalRelations: SimulationState["causalRelations"] = [];
    const provenance: EpistemicProvenance[] = [];

    // 1. Facts & Constraints from Executive Context
    if (input.executiveContext) {
      const allRawFacts = [
        ...(Array.isArray((input.executiveContext as any).facts) ? (input.executiveContext as any).facts : []),
        ...(Array.isArray((input.executiveContext as any).authoritativeFacts) ? (input.executiveContext as any).authoritativeFacts : []),
      ];

      const seenFactKeys = new Set<string>();
      for (const f of allRawFacts) {
        if (!f || !f.key) continue;
        const normKey = this.normalizeKey(f.key);
        if (seenFactKeys.has(normKey)) continue;
        seenFactKeys.add(normKey);

        const topic = f.topic || "general";
        const isGlobal = f.isGlobal || f.scope === "GLOBAL";
        if (strictTopicIsolation && topic !== activeTopic && topic !== "global" && !isGlobal) {
          diagnostics.topicIsolationRejections++;
          continue;
        }

        facts.push({
          key: normKey,
          value: String(f.value || ""),
          authority: f.authority || "GOVERNANCE_APPROVED_MEMORY",
          confidence: f.confidence ?? 0.85,
          isSimulated: false,
        });

        provenance.push({
          sourceId: f.id || f.key,
          sourceType: "EXECUTIVE_FACT",
          authority: f.authority || "GOVERNANCE_APPROVED_MEMORY",
          confidence: f.confidence ?? 0.85,
          statement: `${f.key}: ${f.value}`,
          scope: isGlobal ? "GLOBAL" : "TOPIC",
          topic,
        });
      }

      // Hard Constraints
      const execConstraints = (input.executiveContext as any).reasoningConstraints || (input.executiveContext as any).hardConstraints;
      if (Array.isArray(execConstraints)) {
        for (const c of execConstraints) {
          if (!c) continue;
          constraints.push({
            key: this.normalizeKey(c.id || c.rule || "hard_constraint"),
            description: c.description || c.rule || "Hard safety/governance constraint",
            isHard: c.type === "HARD_CONSTRAINT" || c.isHard === true || c.enforceStrictly === true,
            isSatisfied: true,
          });
        }
      }

      // Active Goals
      const execGoals = input.executiveContext.activeGoals;
      if (Array.isArray(execGoals)) {
        for (const g of execGoals) {
          if (!g) continue;
          goals.push({
            id: g.id || "goal",
            title: g.title || "Active Goal",
            status: g.status || "ACTIVE",
            progress: (g as any).progress,
          });
        }
      }

      // Active Projects
      const execProjects = input.executiveContext.activeProjects;
      if (Array.isArray(execProjects)) {
        for (const p of execProjects) {
          if (!p) continue;
          goals.push({
            id: p.id || "project",
            title: `Project: ${p.name || "Active Project"}`,
            status: p.status || "IN_PROGRESS",
          });
        }
      }
    }

    // 2. GoalProjectAnalysis if available
    if (input.goalProject) {
      if (Array.isArray(input.goalProject.activeCommitments)) {
        for (const c of input.goalProject.activeCommitments) {
          if (!c) continue;
          commitments.push({
            id: (c as any).id || (c as any).key || "commitment",
            description: (c as any).statement || (c as any).title || (c as any).value || "User Commitment",
            status: (c as any).status || "ACTIVE",
          });
        }
      }
    }

    // 3. Causal Relations from CausalReasoningAnalysis
    if (input.causalReasoning?.relations) {
      for (const rel of input.causalReasoning.relations) {
        if (!rel) continue;
        causalRelations.push({
          causeKey: this.normalizeKey(rel.causeStatement || rel.causeId || "cause"),
          effectKey: this.normalizeKey(rel.effectStatement || rel.effectId || "effect"),
          relationType: rel.relationType,
          confidence: rel.confidence,
        });

        if (rel.relationType === "CORRELATION_ONLY" || rel.relationType === "UNRESOLVED") {
          diagnostics.causalUncertaintyCount++;
        }
      }
    }

    // 4. Epistemic Calibrated Claims
    if (input.epistemicCalibration?.claims) {
      for (const claim of input.epistemicCalibration.claims) {
        if (!claim || claim.isSuppressed) continue;
        if (claim.epistemicState === "REJECTED") continue;

        const topic = claim.topic || "general";
        if (strictTopicIsolation && topic !== activeTopic && topic !== "global" && claim.scope !== "GLOBAL") {
          continue;
        }

        const normKey = claim.normalizedKey;
        if (!facts.some((f) => f.key === normKey)) {
          facts.push({
            key: normKey,
            value: claim.statement,
            authority: claim.authority,
            confidence: claim.confidence,
            isSimulated: false,
          });
        }
      }
    }

    return {
      stateKey: "state_base_0",
      facts,
      constraints,
      goals,
      commitments,
      actions: [],
      risks: [],
      dependencies: [],
      causalRelations,
      temporalMarkers: [{ label: "initial", stepIndex: 0 }],
      provenance,
    };
  }

  /**
   * Discovers candidate scenarios from user intent, planning, causal counterfactuals, and hypotheses.
   */
  private discoverScenarios(
    input: ScenarioSimulationInput,
    baseState: SimulationState,
    activeTopic: string,
    strictTopicIsolation: boolean,
    budget: ScenarioSimulationBudgetConfig,
    diagnostics: ScenarioSimulationDiagnostics
  ): ScenarioDefinition[] {
    const candidates: ScenarioDefinition[] = [];
    const message = (input.message || "").toLowerCase();

    // A. Baseline Scenario (Reference continuation)
    const baseline = this.createBaselineScenario(baseState, activeTopic);
    candidates.push(baseline);

    // B. Explicit User "What-If" / Simulation Request
    const isWhatIf =
      message.includes("what if") ||
      message.includes("suppose") ||
      message.includes("hypothetically") ||
      message.includes("if we switch") ||
      message.includes("if i switch") ||
      message.includes("if we change") ||
      message.includes("alternative");

    if (isWhatIf || input.options?.explicitScenarioRequest) {
      diagnostics.scenariosRequested++;
      const whatIfScenario = this.createWhatIfScenario(
        input,
        baseState,
        activeTopic,
        diagnostics
      );
      if (whatIfScenario) {
        candidates.push(whatIfScenario);
      }
    }

    // C. Counterfactual Scenarios from Causal Reasoning
    if (input.causalReasoning?.counterfactuals && input.causalReasoning.counterfactuals.length > 0) {
      for (const cf of input.causalReasoning.counterfactuals) {
        if (candidates.length >= HARD_CEILING_SCENARIO_SIMULATION_BUDGET.maxScenarios) break;
        const premise = cf?.antecedentModification?.counterfactualPremise || (cf as any)?.antecedent;
        if (!cf || !premise) continue;

        const cfScenario = this.createCounterfactualScenario(cf, baseState, activeTopic);
        candidates.push(cfScenario);
      }
    }

    // D. Alternative Plan Scenario from Planning / Reasoning
    if (input.planning?.plan && input.planning.plan.steps && input.planning.plan.steps.length > 0) {
      if (candidates.length < HARD_CEILING_SCENARIO_SIMULATION_BUDGET.maxScenarios) {
        const altPlan = this.createAlternativePlanScenario(input, baseState, activeTopic);
        if (altPlan) {
          candidates.push(altPlan);
        }
      }
    }

    // E. Best-Case / Worst-Case Bounded Envelopes
    if (candidates.length < HARD_CEILING_SCENARIO_SIMULATION_BUDGET.maxScenarios && (message.includes("best case") || message.includes("worst case") || isWhatIf)) {
      if (candidates.length < HARD_CEILING_SCENARIO_SIMULATION_BUDGET.maxScenarios) {
        candidates.push(this.createBestCaseScenario(baseState, activeTopic));
      }
      if (candidates.length < HARD_CEILING_SCENARIO_SIMULATION_BUDGET.maxScenarios) {
        candidates.push(this.createWorstCaseScenario(baseState, activeTopic));
      }
    }

    // F. Expected Case Scenario (if room)
    if (candidates.length < HARD_CEILING_SCENARIO_SIMULATION_BUDGET.maxScenarios) {
      candidates.push(this.createExpectedCaseScenario(baseState, activeTopic));
    }

    if (candidates.length > budget.maxScenarios) {
      diagnostics.scenariosTruncated += (candidates.length - budget.maxScenarios);
      diagnostics.budgetTruncations++;
    }

    return candidates.slice(0, budget.maxScenarios);
  }

  /**
   * Creates the baseline reference scenario.
   */
  private createBaselineScenario(baseState: SimulationState, activeTopic: string): ScenarioDefinition {
    const normKey = "baseline_continuation";
    const id = `scen_base_${this.deterministicHash(normKey)}`;

    const assumptions: ScenarioAssumption[] = [
      {
        id: `assump_${this.deterministicHash("current_state_persists")}`,
        statement: "Current environment and constraints persist without simulated intervention",
        source: "BASELINE_CONVENTIONS",
        authority: "HARD_CONSTRAINT",
        confidence: 0.90,
        uncertainty: 0.10,
        required: true,
        isSupported: true,
        isSensitive: false,
        provenance: [],
      },
    ];

    const actions: SimulationAction[] = [
      {
        actionKey: "continue_active_trajectory",
        description: "Maintain ongoing plan and authorized system state",
        preconditions: [],
        effects: ["active_trajectory_maintained"],
        affectedEntities: [],
        affectedGoals: baseState.goals.map((g) => g.id),
        affectedConstraints: [],
        riskFactors: [],
        reversibility: "HIGH",
        provenance: [],
      },
    ];

    return {
      id,
      normalizedKey: normKey,
      title: "Baseline Reference",
      description: "Continuation of current authorized state without exploratory intervention",
      scenarioType: "BASELINE",
      baseState: this.deepClone(baseState),
      assumptions,
      actions,
      constraints: baseState.constraints.map((c) => ({ key: c.key, isHard: c.isHard, description: c.description })),
      scope: "TOPIC",
      topic: activeTopic,
      isValid: true,
      invalidationReasons: [],
      provenance: baseState.provenance,
      simulationConfidence: 0.85,
    };
  }

  /**
   * Creates a What-If exploratory scenario based on message context.
   */
  private createWhatIfScenario(
    input: ScenarioSimulationInput,
    baseState: SimulationState,
    activeTopic: string,
    diagnostics: ScenarioSimulationDiagnostics
  ): ScenarioDefinition | null {
    const rawMsg = input.message || "what_if_intervention";
    const sanitizedMsg = this.sanitizeDirective(rawMsg);
    const normKey = this.normalizeKey(`what_if_${sanitizedMsg.slice(0, 40)}`);
    const id = `scen_whatif_${this.deterministicHash(normKey)}`;

    const assumptions: ScenarioAssumption[] = [
      {
        id: `assump_${this.deterministicHash(normKey + "_assump")}`,
        statement: `Simulated assumption based on inquiry: ${sanitizedMsg}`,
        source: "USER_WHAT_IF_INQUIRY",
        authority: "CURRENT_TURN_EXPLICIT",
        confidence: 0.60,
        uncertainty: 0.40,
        required: true,
        isSupported: false, // Unsupported hypothetical
        isSensitive: true,
        provenance: [],
      },
    ];
    diagnostics.unsupportedAssumptions++;

    const actions: SimulationAction[] = [
      {
        actionKey: `act_${normKey}`,
        description: `Apply hypothetical intervention: ${sanitizedMsg}`,
        preconditions: [],
        effects: [`effect_of_${normKey}`],
        affectedEntities: [],
        affectedGoals: baseState.goals.map((g) => g.id),
        affectedConstraints: [],
        riskFactors: ["hypothetical_deviation_from_baseline"],
        reversibility: "MEDIUM",
        provenance: [],
      },
    ];

    return {
      id,
      normalizedKey: normKey,
      title: `What-If: ${sanitizedMsg.slice(0, 30)}`,
      description: `Exploratory simulation of: ${sanitizedMsg}`,
      scenarioType: "WHAT_IF",
      baseState: this.deepClone(baseState),
      assumptions,
      actions,
      constraints: baseState.constraints.map((c) => ({ key: c.key, isHard: c.isHard, description: c.description })),
      scope: "TOPIC",
      topic: activeTopic,
      isValid: true,
      invalidationReasons: [],
      provenance: baseState.provenance,
      simulationConfidence: 0.55,
    };
  }

  /**
   * Creates a counterfactual scenario reusing CausalReasoningEngine counterfactual outputs.
   */
  private createCounterfactualScenario(
    cf: any,
    baseState: SimulationState,
    activeTopic: string
  ): ScenarioDefinition {
    const antecedent = cf.antecedentModification?.counterfactualPremise || cf.antecedent || "alternative_history";
    const normKey = this.normalizeKey(`cf_${antecedent}`);
    const id = `scen_cf_${this.deterministicHash(normKey + "_" + (cf.id || "1"))}`;

    const assumptions: ScenarioAssumption[] = [
      {
        id: `assump_cf_${this.deterministicHash(antecedent)}`,
        statement: `Counterfactual antecedent: ${antecedent}`,
        source: "CAUSAL_COUNTERFACTUAL_ENGINE",
        authority: "CURRENT_TURN_EXPLICIT",
        confidence: cf.plausibility ?? cf.confidence ?? 0.70,
        uncertainty: 0.30,
        required: true,
        isSupported: true,
        isSensitive: true,
        provenance: [],
      },
    ];

    const projected = cf.consequentEvaluation?.targetEffect || cf.projectedConsequence || `outcome_of_${normKey}`;

    const actions: SimulationAction[] = [
      {
        actionKey: `act_cf_${this.deterministicHash(antecedent)}`,
        description: `Evaluate consequence if: ${antecedent}`,
        preconditions: [],
        effects: [projected],
        affectedEntities: [],
        affectedGoals: [],
        affectedConstraints: [],
        riskFactors: [],
        reversibility: "UNKNOWN",
        provenance: [],
      },
    ];

    return {
      id,
      normalizedKey: normKey,
      title: `Counterfactual: ${antecedent.slice(0, 30)}`,
      description: `Simulation of counterfactual antecedent: ${antecedent}`,
      scenarioType: "COUNTERFACTUAL",
      baseState: this.deepClone(baseState),
      assumptions,
      actions,
      constraints: baseState.constraints.map((c) => ({ key: c.key, isHard: c.isHard, description: c.description })),
      scope: "TOPIC",
      topic: activeTopic,
      isValid: true,
      invalidationReasons: [],
      provenance: baseState.provenance,
      simulationConfidence: Math.min(0.70, cf.plausibility ?? 0.65),
    };
  }

  /**
   * Creates an alternative plan scenario.
   */
  private createAlternativePlanScenario(
    input: ScenarioSimulationInput,
    baseState: SimulationState,
    activeTopic: string
  ): ScenarioDefinition | null {
    const plan = input.planning?.plan;
    if (!plan) return null;

    const normKey = this.normalizeKey(`alt_plan_${plan.goal || "execution"}`);
    const id = `scen_alt_${this.deterministicHash(normKey)}`;

    const assumptions: ScenarioAssumption[] = [
      {
        id: `assump_alt_${this.deterministicHash(normKey)}`,
        statement: "Alternative execution order or tool strategy optimizes objective",
        source: "PLANNING_ENGINE",
        authority: "ACTIVE_GOAL_PROJECT_COMMITMENT",
        confidence: 0.75,
        uncertainty: 0.25,
        required: true,
        isSupported: true,
        isSensitive: false,
        provenance: [],
      },
    ];

    const actions: SimulationAction[] = (plan.steps || []).slice(0, 3).map((s: any, idx: number) => ({
      actionKey: `step_${idx}_${this.normalizeKey(s.description || s.action || "action")}`,
      description: s.description || s.action || `Plan step ${idx + 1}`,
      preconditions: s.dependencies || [],
      effects: [`completed_${idx}`],
      affectedEntities: [],
      affectedGoals: baseState.goals.map((g) => g.id),
      affectedConstraints: [],
      riskFactors: [],
      reversibility: "HIGH",
      provenance: [],
    }));

    return {
      id,
      normalizedKey: normKey,
      title: `Alternative Plan: ${(plan.goal || "Optimization").slice(0, 30)}`,
      description: `Projected alternative execution sequence for: ${plan.goal || "objective"}`,
      scenarioType: "ALTERNATIVE_PLAN",
      baseState: this.deepClone(baseState),
      assumptions,
      actions,
      constraints: baseState.constraints.map((c) => ({ key: c.key, isHard: c.isHard, description: c.description })),
      scope: "PROJECT",
      topic: activeTopic,
      isValid: true,
      invalidationReasons: [],
      provenance: baseState.provenance,
      simulationConfidence: 0.70,
    };
  }

  /**
   * Creates best-case scenario envelope.
   */
  private createBestCaseScenario(baseState: SimulationState, activeTopic: string): ScenarioDefinition {
    const normKey = "best_case_optimistic_envelope";
    const id = `scen_best_${this.deterministicHash(normKey)}`;

    const assumptions: ScenarioAssumption[] = [
      {
        id: `assump_best_${this.deterministicHash(normKey)}`,
        statement: "All external dependencies resolve promptly with zero blocking errors",
        source: "SIMULATION_ENVELOPE",
        authority: "PREDICTIVE_CONTEXT",
        confidence: 0.40,
        uncertainty: 0.60,
        required: false,
        isSupported: false,
        isSensitive: true,
        provenance: [],
      },
    ];

    const actions: SimulationAction[] = [
      {
        actionKey: "fast_track_all_steps",
        description: "Execute steps concurrently without environmental delays",
        preconditions: [],
        effects: ["rapid_goal_completion", "minimal_latency"],
        affectedEntities: [],
        affectedGoals: baseState.goals.map((g) => g.id),
        affectedConstraints: [],
        riskFactors: ["unsupported_optimistic_assumption"],
        reversibility: "MEDIUM",
        provenance: [],
      },
    ];

    return {
      id,
      normalizedKey: normKey,
      title: "Best-Case Projection",
      description: "Optimistic bounded scenario assuming minimal friction and fast resolution",
      scenarioType: "BEST_CASE",
      baseState: this.deepClone(baseState),
      assumptions,
      actions,
      constraints: baseState.constraints.map((c) => ({ key: c.key, isHard: c.isHard, description: c.description })),
      scope: "TOPIC",
      topic: activeTopic,
      isValid: true,
      invalidationReasons: [],
      provenance: baseState.provenance,
      simulationConfidence: 0.45,
    };
  }

  /**
   * Creates worst-case scenario envelope.
   */
  private createWorstCaseScenario(baseState: SimulationState, activeTopic: string): ScenarioDefinition {
    const normKey = "worst_case_risk_envelope";
    const id = `scen_worst_${this.deterministicHash(normKey)}`;

    const assumptions: ScenarioAssumption[] = [
      {
        id: `assump_worst_${this.deterministicHash(normKey)}`,
        statement: "Resource constraints and external dependency latency trigger blockers",
        source: "SIMULATION_ENVELOPE",
        authority: "PREDICTIVE_CONTEXT",
        confidence: 0.40,
        uncertainty: 0.60,
        required: false,
        isSupported: false,
        isSensitive: true,
        provenance: [],
      },
    ];

    const actions: SimulationAction[] = [
      {
        actionKey: "stalled_dependency_chain",
        description: "Observe consequences of delayed dependency resolution",
        preconditions: [],
        effects: ["delayed_milestone", "increased_retry_cost"],
        affectedEntities: [],
        affectedGoals: baseState.goals.map((g) => g.id),
        affectedConstraints: [],
        riskFactors: ["deadline_slippage", "blocker_escalation"],
        reversibility: "HIGH",
        provenance: [],
      },
    ];

    return {
      id,
      normalizedKey: normKey,
      title: "Worst-Case Projection",
      description: "Pessimistic bounded scenario evaluating potential failure modes and blockers",
      scenarioType: "WORST_CASE",
      baseState: this.deepClone(baseState),
      assumptions,
      actions,
      constraints: baseState.constraints.map((c) => ({ key: c.key, isHard: c.isHard, description: c.description })),
      scope: "TOPIC",
      topic: activeTopic,
      isValid: true,
      invalidationReasons: [],
      provenance: baseState.provenance,
      simulationConfidence: 0.45,
    };
  }

  /**
   * Creates expected-case scenario envelope.
   */
  private createExpectedCaseScenario(baseState: SimulationState, activeTopic: string): ScenarioDefinition {
    const normKey = "expected_case_balanced_envelope";
    const id = `scen_exp_${this.deterministicHash(normKey)}`;

    const assumptions: ScenarioAssumption[] = [
      {
        id: `assump_exp_${this.deterministicHash(normKey)}`,
        statement: "Historical performance and verified patterns remain consistent",
        source: "SIMULATION_ENVELOPE",
        authority: "GOVERNANCE_APPROVED_MEMORY",
        confidence: 0.80,
        uncertainty: 0.20,
        required: true,
        isSupported: true,
        isSensitive: false,
        provenance: [],
      },
    ];

    const actions: SimulationAction[] = [
      {
        actionKey: "standard_paced_execution",
        description: "Progress sequentially with normal verification gates",
        preconditions: [],
        effects: ["steady_progress", "verified_safety"],
        affectedEntities: [],
        affectedGoals: baseState.goals.map((g) => g.id),
        affectedConstraints: [],
        riskFactors: ["standard_operational_variance"],
        reversibility: "HIGH",
        provenance: [],
      },
    ];

    return {
      id,
      normalizedKey: normKey,
      title: "Expected-Case Projection",
      description: "Balanced projection based on verified historical constraints and patterns",
      scenarioType: "EXPECTED_CASE",
      baseState: this.deepClone(baseState),
      assumptions,
      actions,
      constraints: baseState.constraints.map((c) => ({ key: c.key, isHard: c.isHard, description: c.description })),
      scope: "TOPIC",
      topic: activeTopic,
      isValid: true,
      invalidationReasons: [],
      provenance: baseState.provenance,
      simulationConfidence: 0.75,
    };
  }

  /**
   * Deterministically executes state transitions and evaluates outcome for a single scenario.
   */
  private simulateScenario(
    scenario: ScenarioDefinition,
    input: ScenarioSimulationInput,
    budget: ScenarioSimulationBudgetConfig,
    diagnostics: ScenarioSimulationDiagnostics
  ): ScenarioDefinition {
    const workingState = this.deepClone(scenario.baseState);
    const maxSteps = Math.min(scenario.actions.length, budget.maxStepsPerScenario);

    let isScenarioValid = true;
    const invalidationReasons: string[] = [];
    const stateDelta: Record<string, string | number | boolean> = {};

    // 1. Check if scenario is affected by unresolved contradictions
    let contradictionAffected = false;
    if (input.contradictionResolution?.contradictions && input.contradictionResolution.contradictions.length > 0) {
      for (const unres of input.contradictionResolution.contradictions) {
        const unresTopic = (unres as any).topic || (unres as any).evidenceA?.scope || (unres as any).subject;
        if (
          unresTopic === scenario.topic ||
          (unres.description && scenario.description.toLowerCase().includes(unres.description.toLowerCase()))
        ) {
          contradictionAffected = true;
          diagnostics.contradictionAffectedScenarios++;
          break;
        }
      }
    }

    // 2. Execute Action Steps boundedly
    for (let stepIdx = 0; stepIdx < maxSteps; stepIdx++) {
      if (stepIdx >= budget.maxActionsPerScenario) {
        diagnostics.stepsTruncated++;
        diagnostics.budgetTruncations++;
        break;
      }

      const action = scenario.actions[stepIdx];
      diagnostics.stepsExecuted++;

      // Check Hard Constraints
      for (const constraint of workingState.constraints) {
        if (constraint.isHard) {
          // Check if action violates constraint
          const violates =
            action.description.toLowerCase().includes("disable security") ||
            action.description.toLowerCase().includes("bypass") ||
            action.actionKey.includes("violate") ||
            action.riskFactors.some((r) => r.toLowerCase().includes("constraint_violation"));

          if (violates) {
            action.isInvalid = true;
            action.invalidationReason = `Violates hard constraint: ${constraint.description}`;
            isScenarioValid = false;
            invalidationReasons.push(action.invalidationReason);
            diagnostics.invalidActions++;
            diagnostics.constraintViolations++;
            diagnostics.scenariosRejected++;
          }
        }
      }

      // If invalid, break early
      if (!isScenarioValid) {
        break;
      }

      // Propagate Causal Relations
      for (const effect of action.effects) {
        const normEffect = this.normalizeKey(effect);
        stateDelta[normEffect] = true;
        workingState.facts.push({
          key: normEffect,
          value: `Simulated effect of ${action.actionKey}`,
          isSimulated: true,
          confidence: scenario.simulationConfidence,
        });

        // Check if this triggers any downstream causal relation
        for (const rel of workingState.causalRelations) {
          if (rel.causeKey === normEffect) {
            const downstreamEffect = rel.effectKey;
            stateDelta[downstreamEffect] = rel.relationType === "DIRECT_CAUSE";
            workingState.facts.push({
              key: downstreamEffect,
              value: `Causally propagated effect (${rel.relationType})`,
              isSimulated: true,
              confidence: rel.relationType === "DIRECT_CAUSE" ? scenario.simulationConfidence * rel.confidence : 0.40,
            });
          }
        }
      }

      workingState.temporalMarkers.push({
        label: `step_${stepIdx + 1}`,
        stepIndex: stepIdx + 1,
      });
    }

    // 3. Assumption Sensitivity Analysis
    const sensitiveAssumptions = scenario.assumptions.filter((a) => a.isSensitive);
    const isAssumptionSensitive = sensitiveAssumptions.length > 0;
    if (isAssumptionSensitive) {
      diagnostics.assumptionSensitiveOutcomes++;
    }

    // 4. Compute Bounded Risk, Benefit & Tradeoffs
    const projectedRisks = this.computeRisks(scenario, workingState, isScenarioValid, invalidationReasons);
    const projectedBenefits = this.computeBenefits(scenario, workingState, isScenarioValid);
    const tradeoffs = this.computeTradeoffs(scenario, projectedBenefits, projectedRisks);

    // 5. Determine Outcome Category & Epistemic Status
    let outcomeType: OutcomeType = "POSITIVE";
    let epistemicStatus: ScenarioEpistemicStatus = "PROJECTED";

    if (!isScenarioValid) {
      outcomeType = "BLOCKED";
      epistemicStatus = "INVALID";
    } else if (contradictionAffected) {
      outcomeType = "UNRESOLVED";
      epistemicStatus = "ADVISORY";
      diagnostics.unresolvedOutcomes++;
    } else if (scenario.scenarioType === "COUNTERFACTUAL") {
      outcomeType = "NEUTRAL";
      epistemicStatus = "COUNTERFACTUAL";
    } else if (scenario.scenarioType === "WORST_CASE") {
      outcomeType = "NEGATIVE";
      epistemicStatus = "PROJECTED";
    } else if (projectedRisks.some((r) => r.overallRisk > 0.6) && projectedBenefits.some((b) => b.overallBenefit > 0.6)) {
      outcomeType = "MIXED";
      epistemicStatus = "PROJECTED";
    } else if (scenario.assumptions.some((a) => a.authority === "PREDICTIVE_CONTEXT")) {
      epistemicStatus = "ADVISORY";
      diagnostics.predictiveOnlyInputs++;
    } else {
      outcomeType = "POSITIVE";
      epistemicStatus = "PROJECTED";
    }

    // Never allow simulated result to be VERIFIED or KNOWN
    const overallUncertainty = Math.min(
      1.0,
      Math.max(0.1, 1.0 - scenario.simulationConfidence + (contradictionAffected ? 0.3 : 0.0) + (isAssumptionSensitive ? 0.15 : 0.0))
    );

    const outcome: ScenarioOutcome = {
      outcomeKey: `out_${scenario.normalizedKey}`,
      description: `Projected outcome for ${scenario.title}: ${outcomeType}`,
      stateDelta,
      outcomeType,
      projectedBenefits,
      projectedRisks,
      tradeoffs,
      overallUncertainty,
      provenance: scenario.provenance,
      epistemicStatus,
      isAssumptionSensitive,
      sensitiveAssumptionIds: sensitiveAssumptions.map((a) => a.id),
    };

    return {
      ...scenario,
      finalState: workingState,
      isValid: isScenarioValid,
      invalidationReasons,
      outcome,
    };
  }

  /**
   * Computes bounded risk dimensions for scenario.
   */
  private computeRisks(
    scenario: ScenarioDefinition,
    workingState: SimulationState,
    isValid: boolean,
    invalidationReasons: string[]
  ): ScenarioRisk[] {
    const risks: ScenarioRisk[] = [];

    if (!isValid) {
      risks.push({
        id: `risk_inv_${scenario.id}`,
        description: `Constraint violation: ${invalidationReasons.join("; ")}`,
        likelihood: 1.0,
        severity: 1.0,
        reversibility: "IRREVERSIBLE",
        dependencyRisk: 0.9,
        constraintRisk: 1.0,
        uncertainty: 0.0,
        overallRisk: 1.0,
      });
      return risks;
    }

    const isWorstCase = scenario.scenarioType === "WORST_CASE";
    const isWhatIf = scenario.scenarioType === "WHAT_IF";

    const baseLikelihood = isWorstCase ? 0.65 : isWhatIf ? 0.40 : 0.20;
    const baseSeverity = isWorstCase ? 0.70 : isWhatIf ? 0.35 : 0.15;

    risks.push({
      id: `risk_${scenario.id}_general`,
      description: `Projected operational variance for ${scenario.title}`,
      likelihood: Math.min(1.0, Math.max(0.0, baseLikelihood)),
      severity: Math.min(1.0, Math.max(0.0, baseSeverity)),
      reversibility: "HIGH",
      dependencyRisk: 0.25,
      constraintRisk: 0.10,
      uncertainty: 0.20,
      overallRisk: Math.min(1.0, Math.max(0.0, (baseLikelihood + baseSeverity) / 2)),
    });

    return risks;
  }

  /**
   * Computes bounded benefit dimensions for scenario.
   */
  private computeBenefits(
    scenario: ScenarioDefinition,
    workingState: SimulationState,
    isValid: boolean
  ): ScenarioBenefit[] {
    const benefits: ScenarioBenefit[] = [];

    if (!isValid) {
      benefits.push({
        id: `ben_inv_${scenario.id}`,
        description: "No benefit realizable due to hard constraint invalidation",
        goalAlignment: 0.0,
        expectedUtility: 0.0,
        reversibility: "UNKNOWN",
        constraintCompatibility: 0.0,
        evidenceSupport: 0.0,
        uncertainty: 1.0,
        overallBenefit: 0.0,
      });
      return benefits;
    }

    const isBestCase = scenario.scenarioType === "BEST_CASE";
    const isBaseline = scenario.scenarioType === "BASELINE";
    const isAltPlan = scenario.scenarioType === "ALTERNATIVE_PLAN";

    const goalAlign = isBestCase ? 0.90 : isAltPlan ? 0.85 : isBaseline ? 0.75 : 0.60;
    const utility = isBestCase ? 0.85 : isAltPlan ? 0.80 : isBaseline ? 0.70 : 0.55;

    benefits.push({
      id: `ben_${scenario.id}_primary`,
      description: `Projected objective progress for ${scenario.title}`,
      goalAlignment: Math.min(1.0, Math.max(0.0, goalAlign)),
      expectedUtility: Math.min(1.0, Math.max(0.0, utility)),
      reversibility: "HIGH",
      constraintCompatibility: 0.95,
      evidenceSupport: scenario.simulationConfidence,
      uncertainty: 1.0 - scenario.simulationConfidence,
      overallBenefit: Math.min(1.0, Math.max(0.0, (goalAlign + utility) / 2)),
    });

    return benefits;
  }

  /**
   * Computes transparent trade-offs without hiding distinctions.
   */
  private computeTradeoffs(
    scenario: ScenarioDefinition,
    benefits: ScenarioBenefit[],
    risks: ScenarioRisk[]
  ): ScenarioTradeoff[] {
    const maxBenefit = Math.max(0, ...benefits.map((b) => b.overallBenefit));
    const maxRisk = Math.max(0, ...risks.map((r) => r.overallRisk));

    return [
      {
        id: `tradeoff_${scenario.id}`,
        description: `Trade-off balance for ${scenario.title}`,
        benefitFactors: benefits.map((b) => b.description),
        riskFactors: risks.map((r) => r.description),
        uncertaintyFactors: scenario.assumptions.filter((a) => !a.isSupported).map((a) => a.statement),
        resourceFactors: ["execution_time", "operational_overhead"],
        opportunityCosts: scenario.scenarioType === "BASELINE" ? ["deferral_of_new_optimizations"] : ["deviation_from_standard_flow"],
        unresolvedFactors: scenario.outcome?.outcomeType === "UNRESOLVED" ? ["competing_contradictory_evidence"] : [],
      },
    ];
  }

  /**
   * Lexicographical comparison and ranking of scenarios.
   * Invariant: Hard constraints ALWAYS outrank optimization preferences.
   */
  private compareAndRankScenarios(
    scenarios: ScenarioDefinition[],
    budget: ScenarioSimulationBudgetConfig,
    diagnostics: ScenarioSimulationDiagnostics
  ): {
    recommendedScenario?: ScenarioDefinition;
    unresolvedScenarios: ScenarioDefinition[];
    comparisonList: ScenarioComparison[];
  } {
    const comparisonList: ScenarioComparison[] = [];
    const unresolvedScenarios: ScenarioDefinition[] = [];

    // Filter and score scenarios lexicographically
    const sorted = [...scenarios].sort((a, b) => {
      // 1. Validity (Valid > Invalid)
      if (a.isValid !== b.isValid) {
        return a.isValid ? -1 : 1;
      }

      // 2. Constraint Invalidation reasons (0 > >0)
      if (a.invalidationReasons.length !== b.invalidationReasons.length) {
        return a.invalidationReasons.length - b.invalidationReasons.length;
      }

      // 3. Goal Alignment & Evidence Support
      const aBenefit = a.outcome?.projectedBenefits[0]?.goalAlignment ?? 0;
      const bBenefit = b.outcome?.projectedBenefits[0]?.goalAlignment ?? 0;
      const aEvidence = a.simulationConfidence;
      const bEvidence = b.simulationConfidence;

      // 4. Risk Safety (Lower risk is better)
      const aRisk = a.outcome?.projectedRisks[0]?.overallRisk ?? 0.5;
      const bRisk = b.outcome?.projectedRisks[0]?.overallRisk ?? 0.5;

      const aScore = aEvidence * 0.4 + aBenefit * 0.4 - aRisk * 0.2;
      const bScore = bEvidence * 0.4 + bBenefit * 0.4 - bRisk * 0.2;

      if (Math.abs(aScore - bScore) > 0.05) {
        return bScore - aScore;
      }

      // 5. Deterministic Key Tie-breaker
      return a.normalizedKey.localeCompare(b.normalizedKey);
    });

    // Separate unresolved
    for (const sc of scenarios) {
      if (sc.outcome?.outcomeType === "UNRESOLVED") {
        unresolvedScenarios.push(sc);
      }
    }

    // Recommended scenario must be valid
    const recommendedScenario = sorted.find((s) => s.isValid && s.outcome?.outcomeType !== "UNRESOLVED");

    // Generate comparison record
    if (scenarios.length >= 2) {
      const top = sorted.slice(0, budget.maxComparisons);
      const comparison: ScenarioComparison = {
        comparisonKey: `comp_${top.map((t) => t.normalizedKey).join("_vs_")}`,
        scenarioRefs: top.map((t) => t.id),
        preferredScenario: recommendedScenario?.id,
        rejectedScenarios: sorted.filter((s) => !s.isValid).map((s) => s.id),
        unresolvedScenarios: unresolvedScenarios.map((s) => s.id),
        comparisonFactors: [
          "constraint_compliance",
          "evidence_support",
          "projected_risk_vs_benefit",
          "reversibility",
        ],
        tradeoffs: top.flatMap((t) => t.outcome?.tradeoffs || []),
        uncertainty: recommendedScenario?.outcome?.overallUncertainty ?? 0.3,
        rationale: recommendedScenario
          ? `Option '${recommendedScenario.title}' is projected to offer higher constraint compatibility and evidence-supported progress.`
          : "No scenario could be recommended due to active constraints or unresolved contradictions.",
        provenance: recommendedScenario?.provenance || [],
      };
      comparisonList.push(comparison);
    }

    return {
      recommendedScenario,
      unresolvedScenarios,
      comparisonList,
    };
  }

  /**
   * Generates sanitized, natural-language, decision-ready predictive directives.
   * Strips all raw IDs, uuid hashes, timestamps, confidence numbers, risk/benefit numbers.
   */
  private generateDirectives(
    scenarios: ScenarioDefinition[],
    recommended: ScenarioDefinition | undefined,
    comparisons: ScenarioComparison[],
    budget: ScenarioSimulationBudgetConfig,
    diagnostics: ScenarioSimulationDiagnostics
  ): string[] {
    const rawDirectives: string[] = [];

    // 1. Invalidation Directives (Blocked options)
    const invalid = scenarios.filter((s) => !s.isValid);
    for (const inv of invalid) {
      rawDirectives.push(
        `Blocked scenario: The simulated option '${this.sanitizeDirective(inv.title)}' conflicts with an authorized constraint and should not be pursued.`
      );
    }

    // 2. Recommended Option Projection
    if (recommended) {
      const title = this.sanitizeDirective(recommended.title);
      rawDirectives.push(
        `Under the stated assumptions, the '${title}' option is projected to provide the most balanced path forward.`
      );

      if (recommended.outcome?.isAssumptionSensitive) {
        rawDirectives.push(
          `Note: The projection for '${title}' is sensitive to key assumptions and remains subject to uncertainty.`
        );
      }
    }

    // 3. Trade-off Directives
    for (const sc of scenarios) {
      if (sc.isValid && sc.outcome?.outcomeType === "MIXED") {
        rawDirectives.push(
          `Simulated trade-off: '${this.sanitizeDirective(sc.title)}' improves projected utility but carries higher potential risk.`
        );
      }
    }

    // 4. Counterfactual Directives
    const counterfactuals = scenarios.filter((s) => s.scenarioType === "COUNTERFACTUAL");
    for (const cf of counterfactuals) {
      rawDirectives.push(
        `In the simulated counterfactual scenario '${this.sanitizeDirective(cf.title)}', outcomes would be conditionally modified.`
      );
    }

    // Sanitize and deduplicate directives
    const finalDirectives: string[] = [];
    for (const raw of rawDirectives) {
      if (finalDirectives.length >= budget.maxDirectives) {
        diagnostics.budgetTruncations++;
        break;
      }
      const sanitized = this.sanitizeDirective(raw);
      if (sanitized.length > 10 && !finalDirectives.includes(sanitized)) {
        finalDirectives.push(sanitized);
        diagnostics.directivesSanitized++;
      }
    }

    return finalDirectives;
  }

  /**
   * Deterministic sanitization removing internal IDs, hashes, timestamps, and numbers.
   */
  public sanitizeDirective(text: string): string {
    if (!text) return "";

    return text
      // Suppress sensitive credentials/tokens
      .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, "[REDACTED]")
      .replace(/(?:api[_-]?key|secret|password|auth[_-]?token)\s*[:=]\s*[^\s,;]+/gi, "[REDACTED]")
      // Remove raw IDs
      .replace(/\b(?:scen|sim|state|act|out|risk|ben|tradeoff|assump)_[a-zA-Z0-9_]+/gi, "")
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "")
      // Remove bracketed debug tokens
      .replace(/\[(?:SS|EC|MH|CA|CR|DR)-\d+\]/gi, "")
      // Remove raw numeric metrics leakage like (risk=0.37) or (confidence: 0.82)
      .replace(/(?:confidence|risk|benefit|utility|uncertainty)\s*[:=]\s*\d+(?:\.\d+)?/gi, "")
      // Remove raw numeric floats in parentheses
      .replace(/\(\s*\d+(?:\.\d+)?\s*\)/g, "")
      // Clean up whitespace
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  /**
   * Deterministic Murmur-like hash producing stable hex strings.
   */
  public deterministicHash(str: string): string {
    let h1 = 0xdeadbeef ^ 0;
    let h2 = 0x41c6ce57 ^ 0;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(8, "0").slice(0, 10);
  }

  /**
   * Normalizes keys into lowercase snake_case strings.
   */
  public normalizeKey(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80);
  }

  /**
   * Deep clone helper to ensure complete immutability of input objects.
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== "object") return obj;
    return JSON.parse(JSON.stringify(obj));
  }
}

export const scenarioSimulationEngine = ScenarioSimulationEngine.getInstance();
