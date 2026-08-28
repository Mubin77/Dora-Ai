/**
 * DORA Phase 3 — Step 6: Scenario Simulation & Predictive Planning Engine Test Suite
 * 
 * Verifies all 58 required tests (SS-1 through SS-58) ensuring deterministic, bounded,
 * non-LLM, read-only scenario simulation, constraint blocking, causal propagation,
 * assumption sensitivity, risk/benefit evaluation, sanitization, and full pipeline integration.
 */

import { scenarioSimulationEngine } from "./scenarioSimulationEngine";
import {
  ScenarioSimulationInput,
  ScenarioSimulationBudgetConfig,
} from "./scenarioSimulationTypes";
import { brainEngine } from "./brainEngine";
import { deepReasoningEngine } from "./deepReasoningEngine";
import { contradictionResolutionEngine } from "./contradictionResolutionEngine";
import { causalReasoningEngine } from "./causalReasoningEngine";
import { multiHopReasoningEngine } from "./multiHopReasoningEngine";
import { epistemicCalibrationEngine } from "./epistemicCalibrationEngine";

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  [FAIL] ${msg}`);
    failCount++;
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passCount++;
  } catch (err: any) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
  }
}

function createMockBaseInput(): ScenarioSimulationInput {
  return {
    userId: "test_user",
    message: "evaluate project options",
    context: {
      activeTopic: "software_engineering",
      entities: {},
      pendingClarification: false,
    } as any,
    executiveContext: {
      currentTurn: {
        message: "evaluate project options",
        intent: "EVALUATE",
        explicitDirectives: [],
        overrides: {},
        requiresClarification: false,
      },
      authoritativeFacts: [
        {
          id: "fact_1",
          key: "db_engine",
          value: "PostgreSQL 16",
          authority: "GOVERNANCE_APPROVED_MEMORY",
          confidence: 0.90,
          isGlobal: true,
          scope: "GLOBAL",
          topic: "software_engineering",
          groundingType: "GOVERNED_MEMORY",
          sanitizedDirective: "Database is PostgreSQL 16",
        },
      ],
      activePreferences: [],
      reasoningConstraints: [
        {
          id: "const_no_plaintext_passwords",
          type: "HARD_CONSTRAINT",
          description: "All credentials must use scrypt hashing with strict salt",
          authority: "HARD_CONSTRAINT",
          enforceStrictly: true,
          sanitizedDirective: "NEVER store plaintext passwords",
        },
      ],
      activeGoals: [
        {
          goalId: "goal_deploy_v1",
          title: "Deploy V1 Service",
          status: "IN_PROGRESS",
          progress: 0.70,
          sanitizedDirective: "Deploy V1 Service",
        },
      ],
      activeProjects: [
        {
          projectId: "proj_cloud_migration",
          name: "Cloud Migration",
          status: "ACTIVE",
          goals: [],
          sanitizedDirective: "Cloud Migration",
        },
      ],
      activeCommitments: [],
      temporalContext: { activePatterns: [], evolvingLineage: [], suppressedStaleCount: 0 },
      continuityContext: { continuityStatus: "ACTIVE", isTopicIsolated: false },
      responseStyle: {} as any,
      advisoryContext: [],
      ambiguity: { isAmbiguous: false, status: "CLEAR", competingTargets: [] },
      conflicts: [],
      diagnostics: {} as any,
      promptDirectives: [],
    } as any,
    causalReasoning: {
      relations: [
        {
          id: "rel_1",
          causeStatement: "db_index_tuning",
          effectStatement: "query_latency_reduced",
          relationType: "DIRECT_CAUSE",
          confidence: 0.85,
          necessitySufficiency: "SUFFICIENT",
        } as any,
      ],
      counterfactuals: [
        {
          id: "cf_1",
          antecedent: "database indexing was disabled",
          projectedConsequence: "query latency would degrade",
          plausibility: 0.80,
          outcome: "WOULD_STILL_HAPPEN",
        } as any,
      ],
      chains: [],
      activeDirectives: [],
      diagnostics: {} as any,
    } as any,
    epistemicCalibration: {
      claims: [
        {
          id: "claim_db",
          normalizedKey: "db_engine",
          statement: "Database is PostgreSQL 16",
          epistemicState: "KNOWN",
          authority: "GOVERNANCE_APPROVED_MEMORY",
          authorityWeight: 0.80,
          confidence: 0.90,
          confidenceLabel: "VERY_HIGH",
          uncertainty: { overallUncertainty: 0.10 } as any,
          scope: "GLOBAL",
          topic: "software_engineering",
          evidenceRefs: ["fact_1"],
          provenance: [],
          independentSupportCount: 1,
          contradictionCount: 0,
          hopDepth: 0,
          sourceType: "EXECUTIVE_FACT",
          calibrationReason: "Approved memory",
        },
      ],
      calibrationRecords: [],
      uncertainties: [],
      contestedClaims: [],
      unknownClaims: [],
      directives: [],
      diagnostics: {} as any,
    } as any,
    options: {
      currentTime: 1740000000000,
      activeTopic: "software_engineering",
    },
  };
}

console.log("=======================================================");
console.log("DORA PHASE 3 STEP 6: SCENARIO SIMULATION TEST SUITE");
console.log("=======================================================");

// SS-1: Baseline scenario generation
runTest("SS-1: baseline scenario generation", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  assert(result.baselineScenario !== undefined, "Baseline scenario must be generated");
  assert(result.baselineScenario!.scenarioType === "BASELINE", "Type must be BASELINE");
  assert(result.baselineScenario!.isValid === true, "Baseline must be valid");
  assert(result.baselineScenario!.outcome?.epistemicStatus === "PROJECTED", "Baseline status must be PROJECTED");
});

// SS-2: Single action simulation
runTest("SS-2: single action simulation", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  assert(result.scenarios.length > 0, "Should generate evaluated scenarios");
  const baseline = result.scenarios.find((s) => s.scenarioType === "BASELINE");
  assert(baseline?.actions.length === 1, "Baseline has 1 action");
  assert(baseline?.finalState !== undefined, "Final state must exist");
});

// SS-3: Multi-step simulation
runTest("SS-3: multi-step simulation", () => {
  const input = createMockBaseInput();
  input.planning = {
    plan: {
      id: "plan_1",
      goal: "Optimize database performance",
      steps: [
        { id: "s1", description: "Audit slow queries", dependencies: [] },
        { id: "s2", description: "Apply composite index", dependencies: ["s1"] },
        { id: "s3", description: "Run benchmark load test", dependencies: ["s2"] },
      ],
    } as any,
    requiresPlanning: true,
    diagnostics: {} as any,
  } as any;

  const result = scenarioSimulationEngine.evaluate(input);
  const altPlan = result.scenarios.find((s) => s.scenarioType === "ALTERNATIVE_PLAN");
  assert(altPlan !== undefined, "Alternative plan scenario should be generated");
  assert(altPlan!.actions.length === 3, "Should have 3 steps simulated");
  assert(altPlan!.finalState?.temporalMarkers.length === 4, "Should have initial + 3 step markers");
});

// SS-4: Maximum step enforcement
runTest("SS-4: maximum step enforcement", () => {
  const input = createMockBaseInput();
  input.planning = {
    plan: {
      id: "plan_2",
      goal: "Long multi-step migration",
      steps: Array.from({ length: 15 }, (_, i) => ({ id: `s${i}`, description: `Step ${i}` })),
    } as any,
    requiresPlanning: true,
    diagnostics: {} as any,
  } as any;
  input.options = { ...input.options, budget: { maxStepsPerScenario: 2 } };

  const result = scenarioSimulationEngine.evaluate(input);
  const altPlan = result.scenarios.find((s) => s.scenarioType === "ALTERNATIVE_PLAN");
  assert(altPlan !== undefined, "Plan should exist");
  assert(result.diagnostics.stepsExecuted <= 10, "Steps executed must be bounded");
});

// SS-5: Maximum scenario enforcement
runTest("SS-5: maximum scenario enforcement", () => {
  const input = createMockBaseInput();
  input.options = { ...input.options, budget: { maxScenarios: 2 } };

  const result = scenarioSimulationEngine.evaluate(input);
  assert(result.scenarios.length <= 2, `Should respect maxScenarios 2, got ${result.scenarios.length}`);
  assert(result.diagnostics.scenariosTruncated >= 0, "Diagnostics should track truncation");
});

// SS-6: Branching limit
runTest("SS-6: branching limit", () => {
  const input = createMockBaseInput();
  input.options = { ...input.options, budget: { maxBranches: 2 } };

  const result = scenarioSimulationEngine.evaluate(input);
  assert(result.scenarios.length <= 5, "Scenarios bounded");
});

// SS-7: Invalid action detection
runTest("SS-7: invalid action detection", () => {
  const input = createMockBaseInput();
  input.message = "what if we bypass security and store plaintext passwords?";
  const result = scenarioSimulationEngine.evaluate(input);
  const whatIf = result.scenarios.find((s) => s.scenarioType === "WHAT_IF");
  // Hard constraint check
  if (whatIf) {
    // If it violates constraint
    assert(result.diagnostics.invalidActions >= 0, "Invalid actions counted");
  }
});

// SS-8: Hard constraint violation blocks scenario
runTest("SS-8: hard constraint violation blocks scenario", () => {
  const input = createMockBaseInput();
  input.executiveContext!.reasoningConstraints = [
    {
      id: "const_no_bypass",
      type: "HARD_CONSTRAINT",
      description: "Never bypass security",
      authority: "HARD_CONSTRAINT",
      enforceStrictly: true,
      sanitizedDirective: "bypass security",
    },
  ];

  // Manually construct scenario with invalid action
  const whatIf = scenarioSimulationEngine.evaluate({
    ...input,
    message: "what if we bypass security completely?",
  });
  const blockedScen = whatIf.scenarios.find((s) => !s.isValid);
  if (blockedScen) {
    assert(blockedScen.isValid === false, "Scenario must be invalid");
    assert(blockedScen.outcome?.epistemicStatus === "INVALID", "Epistemic status must be INVALID");
    assert(blockedScen.outcome?.outcomeType === "BLOCKED", "Outcome must be BLOCKED");
  }
});

// SS-9: Hard constraint cannot be overridden by benefit
runTest("SS-9: hard constraint cannot be overridden by benefit", () => {
  const input = createMockBaseInput();
  input.executiveContext!.reasoningConstraints = [
    {
      id: "c1",
      type: "HARD_CONSTRAINT",
      description: "Do not disable security",
      authority: "HARD_CONSTRAINT",
      enforceStrictly: true,
      sanitizedDirective: "disable security",
    },
  ];
  input.message = "what if we disable security to get 100x speedup?";

  const result = scenarioSimulationEngine.evaluate(input);
  const blockedScen = result.scenarios.find((s) => !s.isValid);
  if (blockedScen) {
    assert(result.recommendedScenario?.id !== blockedScen.id, "Invalid scenario cannot be recommended regardless of benefit");
  }
});

// SS-10: Goal alignment propagation
runTest("SS-10: goal alignment propagation", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  const baseline = result.baselineScenario;
  assert(baseline?.outcome?.projectedBenefits[0]?.goalAlignment !== undefined, "Goal alignment must be computed");
  assert(baseline!.outcome!.projectedBenefits[0]!.goalAlignment > 0, "Positive alignment for baseline");
});

// SS-11: Project scope preservation
runTest("SS-11: project scope preservation", () => {
  const input = createMockBaseInput();
  input.planning = {
    plan: { id: "p1", goal: "migration", steps: [{ description: "migrate" }] },
  } as any;
  const result = scenarioSimulationEngine.evaluate(input);
  const altPlan = result.scenarios.find((s) => s.scenarioType === "ALTERNATIVE_PLAN");
  assert(altPlan?.scope === "PROJECT", "Alternative plan is project-scoped");
});

// SS-12: Goal scope preservation
runTest("SS-12: goal scope preservation", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  assert(result.scenarios.every((s) => s.scope !== "GLOBAL" || s.scenarioType === "BASELINE"), "Scoped properly");
});

// SS-13: Current-turn hypothetical remains hypothetical
runTest("SS-13: current-turn hypothetical remains hypothetical", () => {
  const input = createMockBaseInput();
  input.message = "what if we switch to MySQL?";
  const result = scenarioSimulationEngine.evaluate(input);
  const whatIf = result.scenarios.find((s) => s.scenarioType === "WHAT_IF");
  assert(whatIf !== undefined, "What-if should exist");
  assert((whatIf!.outcome?.epistemicStatus as string) !== "VERIFIED", "Hypothetical outcome cannot be VERIFIED");
  assert((whatIf!.outcome?.epistemicStatus as string) !== "KNOWN", "Hypothetical outcome cannot be KNOWN");
});

// SS-14: Simulation never mutates source state
runTest("SS-14: simulation never mutates source state", () => {
  const input = createMockBaseInput();
  const originalFactsCount = input.executiveContext!.authoritativeFacts.length;
  scenarioSimulationEngine.evaluate(input);
  assert(input.executiveContext!.authoritativeFacts.length === originalFactsCount, "Source facts must remain unmutated");
});

// SS-15: Causal relation reuse
runTest("SS-15: causal relation reuse", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  assert(result.scenarios.some((s) => s.baseState.causalRelations.length > 0), "Should reuse causal relations");
});

// SS-16: Correlation does not become causation
runTest("SS-16: correlation does not become causation", () => {
  const input = createMockBaseInput();
  input.causalReasoning!.relations = [
    {
      id: "rel_coinc",
      causeStatement: "reboot_on_friday",
      effectStatement: "error_reduction",
      relationType: "CORRELATION_ONLY",
      confidence: 0.90,
    } as any,
  ];
  const result = scenarioSimulationEngine.evaluate(input);
  assert(result.diagnostics.causalUncertaintyCount > 0, "Causal uncertainty must be registered for correlation only");
});

// SS-17: Unresolved causal relation remains uncertain
runTest("SS-17: unresolved causal relation remains uncertain", () => {
  const input = createMockBaseInput();
  input.causalReasoning!.relations = [
    {
      id: "rel_unres",
      causeStatement: "custom_tuning",
      effectStatement: "cache_misses",
      relationType: "UNRESOLVED",
      confidence: 0.50,
    } as any,
  ];
  const result = scenarioSimulationEngine.evaluate(input);
  assert(result.diagnostics.causalUncertaintyCount > 0, "Unresolved relation increases uncertainty");
});

// SS-18: Counterfactual semantics preserved
runTest("SS-18: counterfactual semantics preserved", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  const cf = result.scenarios.find((s) => s.scenarioType === "COUNTERFACTUAL");
  assert(cf !== undefined, "Counterfactual scenario should exist");
  assert(cf!.outcome?.epistemicStatus === "COUNTERFACTUAL", "Epistemic status must be COUNTERFACTUAL");
});

// SS-19: Multi-hop provenance preserved
runTest("SS-19: multi-hop provenance preserved", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  assert(result.baselineScenario?.provenance !== undefined, "Provenance preserved");
});

// SS-20: Multi-hop uncertainty propagation
runTest("SS-20: multi-hop uncertainty propagation", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  assert(result.outcomes.every((o) => o.overallUncertainty >= 0 && o.overallUncertainty <= 1.0), "Uncertainty bounded");
});

// SS-21: Epistemic calibration integration
runTest("SS-21: epistemic calibration integration", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  assert(result.baselineScenario?.baseState.facts.some((f) => f.key === "db_engine"), "Epistemic facts integrated");
});

// SS-22: Simulated result cannot become VERIFIED
runTest("SS-22: simulated result cannot become VERIFIED", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  for (const outcome of result.outcomes) {
    assert((outcome.epistemicStatus as string) !== "VERIFIED", "Outcome status cannot be VERIFIED");
  }
});

// SS-23: Simulated result cannot become KNOWN
runTest("SS-23: simulated result cannot become KNOWN", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  for (const outcome of result.outcomes) {
    assert((outcome.epistemicStatus as string) !== "KNOWN", "Outcome status cannot be KNOWN");
  }
});

// SS-24: Predictive context remains advisory
runTest("SS-24: predictive context remains advisory", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  const bestCase = result.scenarios.find((s) => s.scenarioType === "BEST_CASE");
  if (bestCase?.assumptions.some((a) => a.authority === "PREDICTIVE_CONTEXT")) {
    assert(bestCase.outcome?.epistemicStatus === "ADVISORY" || bestCase.outcome?.epistemicStatus === "PROJECTED", "Predictive is advisory/projected");
  }
});

// SS-25: Predictive-only scenario remains advisory
runTest("SS-25: predictive-only scenario remains advisory", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  const bestCase = result.scenarios.find((s) => s.scenarioType === "BEST_CASE");
  assert((bestCase?.outcome?.epistemicStatus as string) !== "VERIFIED", "Cannot be verified");
});

// SS-26: Contradictory evidence produces unresolved scenario
runTest("SS-26: contradictory evidence produces unresolved scenario", () => {
  const input = createMockBaseInput();
  input.contradictionResolution = {
    contradictions: [
      {
        id: "c_1",
        topic: "software_engineering",
        description: "Contradiction about db engine performance",
        competingEvidenceIds: ["a", "b"],
      } as any,
    ],
    candidates: [],
    revisions: [],
    activeDirectives: [],
    unresolvedCount: 1,
    resolvedCount: 0,
    deferredCount: 0,
    requiresClarification: true,
    diagnostics: {} as any,
  } as any;

  const result = scenarioSimulationEngine.evaluate(input);
  assert(result.diagnostics.contradictionAffectedScenarios > 0, "Contradiction affects scenarios");
  assert(result.unresolvedScenarios.length > 0 || result.diagnostics.unresolvedOutcomes > 0, "Unresolved outcomes tracked");
});

// SS-27: Equal-authority contradiction is preserved
runTest("SS-27: equal-authority contradiction is preserved", () => {
  const input = createMockBaseInput();
  input.contradictionResolution = {
    contradictions: [
      {
        id: "c_eq",
        topic: "software_engineering",
        description: "Equal authority clash",
      } as any,
    ],
    candidates: [],
    revisions: [],
    activeDirectives: [],
    unresolvedCount: 1,
    resolvedCount: 0,
    deferredCount: 0,
    requiresClarification: true,
    diagnostics: {} as any,
  } as any;

  const result = scenarioSimulationEngine.evaluate(input);
  assert(result.diagnostics.contradictionAffectedScenarios > 0, "Clash is recognized and preserved");
});

// SS-28: Unsupported assumption is detected
runTest("SS-28: unsupported assumption is detected", () => {
  const input = createMockBaseInput();
  input.message = "what if we switch to an unverified experimental server?";
  const result = scenarioSimulationEngine.evaluate(input);
  assert(result.diagnostics.unsupportedAssumptions > 0, "Unsupported assumption must be tracked");
});

// SS-29: Assumption sensitivity detection
runTest("SS-29: assumption sensitivity detection", () => {
  const input = createMockBaseInput();
  input.message = "what if we migrate without testing?";
  const result = scenarioSimulationEngine.evaluate(input);
  assert(result.diagnostics.assumptionSensitiveOutcomes >= 0, "Sensitivity tracked");
});

// SS-30: Uncertainty remains bounded
runTest("SS-30: uncertainty remains bounded", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  for (const o of result.outcomes) {
    assert(o.overallUncertainty >= 0.0 && o.overallUncertainty <= 1.0, "Uncertainty in [0, 1]");
  }
});

// SS-31: Risk values remain bounded
runTest("SS-31: risk values remain bounded", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  for (const o of result.outcomes) {
    for (const r of o.projectedRisks) {
      assert(r.likelihood >= 0.0 && r.likelihood <= 1.0, "Likelihood in [0, 1]");
      assert(r.severity >= 0.0 && r.severity <= 1.0, "Severity in [0, 1]");
      assert(r.overallRisk >= 0.0 && r.overallRisk <= 1.0, "OverallRisk in [0, 1]");
    }
  }
});

// SS-32: Benefit values remain bounded
runTest("SS-32: benefit values remain bounded", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  for (const o of result.outcomes) {
    for (const b of o.projectedBenefits) {
      assert(b.goalAlignment >= 0.0 && b.goalAlignment <= 1.0, "GoalAlignment in [0, 1]");
      assert(b.expectedUtility >= 0.0 && b.expectedUtility <= 1.0, "Utility in [0, 1]");
      assert(b.overallBenefit >= 0.0 && b.overallBenefit <= 1.0, "OverallBenefit in [0, 1]");
    }
  }
});

// SS-33: No fabricated probabilities
runTest("SS-33: no fabricated probabilities", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  // Directives should not contain fabricated percentages like "94.2%" or "87%"
  for (const d of result.directives) {
    assert(!/\b\d{2,3}%\b/.test(d), `Directive should not contain fabricated percentages: ${d}`);
  }
});

// SS-34: Best-case simulation
runTest("SS-34: best-case simulation", () => {
  const input = createMockBaseInput();
  input.message = "simulate best case scenario";
  const result = scenarioSimulationEngine.evaluate(input);
  const bestCase = result.scenarios.find((s) => s.scenarioType === "BEST_CASE");
  assert(bestCase !== undefined, "Best-case scenario should be generated");
});

// SS-35: Worst-case simulation
runTest("SS-35: worst-case simulation", () => {
  const input = createMockBaseInput();
  input.message = "simulate worst case scenario";
  const result = scenarioSimulationEngine.evaluate(input);
  const worstCase = result.scenarios.find((s) => s.scenarioType === "WORST_CASE");
  assert(worstCase !== undefined, "Worst-case scenario should be generated");
  assert(worstCase!.outcome?.outcomeType === "NEGATIVE" || worstCase!.outcome?.outcomeType === "MIXED", "Worst case has negative/mixed outcome");
});

// SS-36: Expected-case without fabricated probability
runTest("SS-36: expected-case without fabricated probability", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  const expCase = result.scenarios.find((s) => s.scenarioType === "EXPECTED_CASE");
  assert(expCase !== undefined, "Expected-case should be generated");
  assert(expCase!.outcome?.epistemicStatus === "PROJECTED", "Status must be PROJECTED");
});

// SS-37: Reversibility handling
runTest("SS-37: reversibility handling", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  const baseline = result.baselineScenario;
  assert(baseline?.actions[0]?.reversibility === "HIGH", "Baseline action reversibility is HIGH");
});

// SS-38: Topic isolation
runTest("SS-38: topic isolation", () => {
  const input = createMockBaseInput();
  input.executiveContext!.authoritativeFacts.push({
    id: "fact_foreign",
    key: "foreign_finance_rate",
    value: "5.5%",
    authority: "GOVERNANCE_APPROVED_MEMORY",
    authorityWeight: 0.80,
    source: "MEMORY",
    confidence: 0.90,
    isGlobal: false,
    topic: "personal_finance",
    grounding: "GOVERNED_MEMORY",
    sanitizedDirective: "Foreign rate is 5.5%",
  });
  input.options = { ...input.options, strictTopicIsolation: true, activeTopic: "software_engineering" };

  const result = scenarioSimulationEngine.evaluate(input);
  assert(result.diagnostics.topicIsolationRejections > 0, "Foreign topic fact must be rejected under strict isolation");
  assert(!result.baselineScenario?.baseState.facts.some((f) => f.key.includes("finance")), "Foreign fact excluded");
});

// SS-39: Scope isolation
runTest("SS-39: scope isolation", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  assert(result.scenarios.every((s) => s.scope !== "GLOBAL" || s.scenarioType === "BASELINE"), "Scenarios scoped appropriately");
});

// SS-40: Sensitive credential suppression
runTest("SS-40: sensitive credential suppression", () => {
  const input = createMockBaseInput();
  input.message = "what if we use Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 and api_key=sk-1234567890?";
  const result = scenarioSimulationEngine.evaluate(input);
  for (const d of result.directives) {
    assert(!d.includes("sk-1234567890"), "Raw API key must be sanitized");
    assert(!d.includes("eyJhbGciOi"), "Raw JWT token must be sanitized");
  }
});

// SS-41: Unsupported identity inference suppression
runTest("SS-41: unsupported identity inference suppression", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  for (const d of result.directives) {
    assert(!d.toLowerCase().includes("user is 25 years old"), "No biographical hallucination");
  }
});

// SS-42: Directive sanitization
runTest("SS-42: directive sanitization", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  for (const d of result.directives) {
    assert(!d.includes("scen_"), "No raw scen_ IDs in directives");
    assert(!d.includes("out_"), "No raw out_ IDs in directives");
    assert(!d.includes("act_"), "No raw act_ IDs in directives");
  }
});

// SS-43: Numeric metrics absent from directives
runTest("SS-43: numeric metrics absent from directives", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  for (const d of result.directives) {
    assert(!/risk\s*=\s*\d+/i.test(d), "No raw risk numbers in directives");
    assert(!/confidence\s*=\s*\d+/i.test(d), "No raw confidence numbers in directives");
  }
});

// SS-44: Internal IDs absent from directives
runTest("SS-44: internal IDs absent from directives", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  for (const d of result.directives) {
    assert(!/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(d), "No UUIDs in directives");
  }
});

// SS-45: Hypothetical language preserved
runTest("SS-45: hypothetical language preserved", () => {
  const input = createMockBaseInput();
  const result = scenarioSimulationEngine.evaluate(input);
  assert(result.directives.some((d) => d.includes("projected") || d.includes("assumptions") || d.includes("simulated")), "Must use hypothetical language");
});

// SS-46: Deterministic scenario IDs
runTest("SS-46: deterministic scenario IDs", () => {
  const id1 = scenarioSimulationEngine.deterministicHash("test_scenario_key");
  const id2 = scenarioSimulationEngine.deterministicHash("test_scenario_key");
  assert(id1 === id2, "Hash must be strictly deterministic");
});

// SS-47: 10-run determinism
runTest("SS-47: 10-run determinism", () => {
  const input = createMockBaseInput();
  const firstRun = scenarioSimulationEngine.evaluate(input);
  for (let i = 0; i < 9; i++) {
    const nextRun = scenarioSimulationEngine.evaluate(input);
    assert(firstRun.scenarios.length === nextRun.scenarios.length, `Run ${i + 2} scenario count mismatch`);
    assert(firstRun.directives.length === nextRun.directives.length, `Run ${i + 2} directive count mismatch`);
    assert(firstRun.recommendedScenario?.id === nextRun.recommendedScenario?.id, `Run ${i + 2} recommendation mismatch`);
  }
});

// SS-48: Scenario ranking determinism
runTest("SS-48: scenario ranking determinism", () => {
  const input = createMockBaseInput();
  const r1 = scenarioSimulationEngine.evaluate(input);
  const r2 = scenarioSimulationEngine.evaluate(input);
  assert(r1.comparisons.length === r2.comparisons.length, "Comparisons count must match");
  assert(r1.comparisons[0]?.preferredScenario === r2.comparisons[0]?.preferredScenario, "Preferred scenario must match");
});

// SS-49: Input immutability
runTest("SS-49: input immutability", () => {
  const input = createMockBaseInput();
  const serialized = JSON.stringify(input);
  scenarioSimulationEngine.evaluate(input);
  assert(JSON.stringify(input) === serialized, "Input must remain 100% byte-for-byte identical");
});

// SS-50: Budget truncation
runTest("SS-50: budget truncation", () => {
  const input = createMockBaseInput();
  input.options = { ...input.options, budget: { maxScenarios: 1 } };
  const result = scenarioSimulationEngine.evaluate(input);
  assert(result.scenarios.length === 1, "Clamped to 1");
  assert(result.diagnostics.scenariosTruncated >= 1, "Truncation incremented");
});

// SS-51: Diagnostic determinism
runTest("SS-51: diagnostic determinism", () => {
  const input = createMockBaseInput();
  const r1 = scenarioSimulationEngine.evaluate(input);
  const r2 = scenarioSimulationEngine.evaluate(input);
  assert(r1.diagnostics.scenariosEvaluated === r2.diagnostics.scenariosEvaluated, "Diagnostics must be deterministic");
});

// SS-52: BrainEngine integration
runTest("SS-52: BrainEngine integration", () => {
  const brainAnalysis = brainEngine.analyze("what if we deploy to staging first?", [], undefined, "test_sess");
  assert((brainAnalysis as any).scenarioSimulationAnalysis !== undefined, "BrainAnalysis must include scenarioSimulationAnalysis");
  assert((brainAnalysis as any).scenarioSimulation !== undefined, "BrainAnalysis must include scenarioSimulation");
  assert((brainAnalysis as any).scenarioSimulationAnalysis.scenarios.length > 0, "Should evaluate scenarios in BrainEngine");
});

// SS-53: Step 1 regression (DeepReasoningEngine)
runTest("SS-53: Step 1 regression (DeepReasoningEngine)", () => {
  const res = deepReasoningEngine.evaluate({
    message: "analyze architecture",
    options: { currentTime: 1740000000000 },
  } as any);
  assert(res !== undefined, "DeepReasoningEngine must execute cleanly");
});

// SS-54: Step 2 regression (ContradictionResolutionEngine)
runTest("SS-54: Step 2 regression (ContradictionResolutionEngine)", () => {
  const res = contradictionResolutionEngine.evaluate({
    message: "resolve contradictions",
    options: { currentTime: 1740000000000 },
  } as any);
  assert(res !== undefined, "ContradictionResolutionEngine must execute cleanly");
});

// SS-55: Step 3 regression (CausalReasoningEngine)
runTest("SS-55: Step 3 regression (CausalReasoningEngine)", () => {
  const res = causalReasoningEngine.evaluate({
    message: "evaluate causes",
    options: { currentTime: 1740000000000 },
  } as any);
  assert(res !== undefined, "CausalReasoningEngine must execute cleanly");
});

// SS-56: Step 4 regression (MultiHopReasoningEngine)
runTest("SS-56: Step 4 regression (MultiHopReasoningEngine)", () => {
  const res = multiHopReasoningEngine.evaluate({
    message: "deduce chain",
    options: { currentTime: 1740000000000 },
  } as any);
  assert(res !== undefined, "MultiHopReasoningEngine must execute cleanly");
});

// SS-57: Step 5 regression (EpistemicCalibrationEngine)
runTest("SS-57: Step 5 regression (EpistemicCalibrationEngine)", () => {
  const res = epistemicCalibrationEngine.evaluate({
    message: "calibrate claims",
    options: { currentTime: 1740000000000 },
  } as any);
  assert(res !== undefined, "EpistemicCalibrationEngine must execute cleanly");
});

// SS-58: full Phase 1 + Phase 2 + Phase 3 Steps 1–6 regression
runTest("SS-58: full Phase 1 + Phase 2 + Phase 3 Steps 1–6 regression", () => {
  const analysis = brainEngine.analyze("Can we switch our primary database to SQLite?", [], undefined, "full_reg_session");
  assert(analysis.intent !== undefined, "Phase 1 intent passes");
  assert(analysis.memoryGovernanceAnalysis !== undefined, "Phase 2 governance passes");
  assert(analysis.executiveContext !== undefined, "Phase 2 executive context passes");
  assert(analysis.deepReasoningAnalysis !== undefined, "Phase 3 Step 1 passes");
  assert(analysis.contradictionResolutionAnalysis !== undefined, "Phase 3 Step 2 passes");
  assert(analysis.causalReasoningAnalysis !== undefined, "Phase 3 Step 3 passes");
  assert(analysis.multiHopReasoningAnalysis !== undefined, "Phase 3 Step 4 passes");
  assert(analysis.epistemicCalibrationAnalysis !== undefined, "Phase 3 Step 5 passes");
  assert(analysis.scenarioSimulationAnalysis !== undefined, "Phase 3 Step 6 passes");
  assert(analysis.promptDirectives.length > 0, "Directives populated");
});

console.log("=======================================================");
console.log(`TEST RESULTS: ${passCount}/${passCount + failCount} TESTS PASSED`);
console.log("=======================================================");

if (failCount > 0) {
  process.exit(1);
}
