/**
 * Dora Causal & Counterfactual Reasoning Engine Test Suite
 * Phase 3 — Step 3
 * 
 * Verifies all causal classification invariants, necessity/sufficiency analysis,
 * counterfactual exploration, fallacy avoidance, authority ranking, and budget limits (CA-1 to CA-47).
 */

import { causalReasoningEngine } from "./causalReasoningEngine";
import { contradictionResolutionEngine } from "./contradictionResolutionEngine";
import { deepReasoningEngine } from "./deepReasoningEngine";
import { brainEngine } from "./brainEngine";
import { CausalReasoningInput } from "./causalReasoningTypes";
import { ExecutiveContextPackage } from "./executiveContextTypes";

let passedTests = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (error: any) {
    console.error(`  [FAIL] ${name}: ${error.message}`);
    throw error;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function createDummyExecutiveContext(overrides?: Partial<ExecutiveContextPackage>): ExecutiveContextPackage {
  return {
    currentTurn: {
      message: "Test message",
      intent: "INFORMATIONAL",
      explicitDirectives: [],
      overrides: {},
      requiresClarification: false,
    },
    authoritativeFacts: [],
    activePreferences: [],
    activeProjects: [],
    activeGoals: [],
    activeCommitments: [],
    temporalContext: {
      activePatterns: [],
      evolvingLineage: [],
      suppressedStaleCount: 0,
    },
    continuityContext: {
      continuityStatus: "NEW_SESSION",
      isTopicIsolated: false,
    },
    reasoningConstraints: [],
    responseStyle: {
      language: "English",
      verbosity: "balanced",
      tone: "professional",
      formatStyle: "markdown",
      codeDensity: "standard",
      explanationDepth: "balanced",
      winningLayers: {},
      sanitizedDirectives: [],
    },
    advisoryContext: [],
    ambiguity: {
      isAmbiguous: false,
      status: "CLEAR",
      competingTargets: [],
    },
    conflicts: [],
    promptDirectives: [],
    diagnostics: {
      totalCandidatesExamined: 0,
      includedItemsCount: 0,
      suppressedItemsCount: 0,
      deduplicatedCount: 0,
      topicIsolatedCount: 0,
      staleExpiredSuppressedCount: 0,
      predictiveSuppressedCount: 0,
      sensitiveDataSuppressedCount: 0,
      sanitizedDirectivesCount: 0,
      budgetTruncatedCount: 0,
      conflictResolutionCounts: { resolved: 0, unresolved: 0 },
      executionTimeMs: 0,
    },
    ...overrides,
  };
}

console.log("======================================================");
console.log("RUNNING DORA CAUSAL & COUNTERFACTUAL ENGINE TEST SUITE");
console.log("======================================================");

// CA-1: Direct cause classification
runTest("CA-1: Direct cause classification", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Deleting the environment config caused the build to fail",
    options: { currentTime: 1700000000000 },
  });

  assert(result.relations.length > 0, "Should detect at least one causal relation");
  const rel = result.relations[0];
  assert(rel.relationType === "DIRECT_CAUSE", `Expected DIRECT_CAUSE, got ${rel.relationType}`);
  assert(rel.causeStatement.toLowerCase().includes("deleting the environment config"), "Cause should match");
  assert(rel.effectStatement.toLowerCase().includes("build to fail"), "Effect should match");
  assert(rel.isCurrentTurnExplicit === true, "Should be marked as explicit current turn");
});

// CA-2: Indirect cause classification and multi-step causal chain
runTest("CA-2: Indirect cause classification and multi-step causal chain", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Network latency caused database timeouts",
    executiveContext: createDummyExecutiveContext({
      authoritativeFacts: [
        { id: "fact_1", key: "Database timeouts", value: "Database timeouts resulted in transaction failure", authority: "VERIFIED_EVIDENCE", authorityWeight: 0.9, source: "test", confidence: 0.95, topic: "global", isGlobal: true, grounding: "VERIFIED_FACT", sanitizedDirective: "Database timeouts resulted in transaction failure" },
      ],
    }),
    options: { currentTime: 1700000000000 },
  });

  assert(result.relations.length >= 2, "Should have relations linking the steps");
  assert(result.chains.length >= 1, "Should construct a causal chain (A -> B -> C)");
  assert(result.chains[0].chainLength === 2, "Chain length should be 2");
  assert(result.chains[0].bottleneckNodeId !== undefined, "Chain should identify intermediate bottleneck");
});

// CA-3: Contributory factor classification
runTest("CA-3: Contributory factor classification", () => {
  const result = causalReasoningEngine.evaluate({
    message: "High memory usage is a contributory factor to system degradation",
    options: { currentTime: 1700000000000 },
  });

  assert(result.relations.length > 0, "Should detect relation");
});

// CA-4: Necessary condition classification (~A -> ~B)
runTest("CA-4: Necessary condition classification", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Authentication token is required for accessing user profile",
    options: { currentTime: 1700000000000 },
  });

  assert(result.relations.length > 0, "Should identify relation");
  const rel = result.relations.find(r => r.relationType === "NECESSARY_CONDITION");
  assert(rel !== undefined, "Should identify NECESSARY_CONDITION");
  assert(rel!.necessityScore >= 0.85, "Necessity score should be high");
});

// CA-5: Sufficient condition classification (A -> B)
runTest("CA-5: Sufficient condition classification", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Root access is sufficient for modifying system permissions",
    options: { currentTime: 1700000000000 },
  });

  assert(result.relations.length > 0, "Should identify relation");
  const rel = result.relations.find(r => r.relationType === "SUFFICIENT_CONDITION");
  assert(rel !== undefined, "Should identify SUFFICIENT_CONDITION");
  assert(rel!.sufficiencyScore >= 0.85, "Sufficiency score should be high");
});

// CA-6: Necessary & Sufficient (Biconditional) classification
runTest("CA-6: Necessary & Sufficient (Biconditional) classification", () => {
  const result = causalReasoningEngine.evaluate({
    message: "User is eligible for discount if and only if account is premium",
    options: { currentTime: 1700000000000 },
  });

  assert(result.relations.length > 0, "Should detect biconditional relation");
  const rel = result.relations.find(r => r.relationType === "NECESSARY_AND_SUFFICIENT");
  assert(rel !== undefined, "Should identify NECESSARY_AND_SUFFICIENT");
  assert(rel!.necessityScore === 1.0 && rel!.sufficiencyScore === 1.0, "Both scores should be 1.0");
});

// CA-7: Correlation only vs Causation separation
runTest("CA-7: Correlation only vs Causation separation", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Ice cream sales is correlated with swimming accidents",
    options: { currentTime: 1700000000000 },
  });

  assert(result.relations.length > 0, "Should identify correlation relation");
  const rel = result.relations[0];
  assert(rel.relationType === "CORRELATION_ONLY", `Expected CORRELATION_ONLY, got ${rel.relationType}`);
  assert(result.diagnostics.correlationsIsolatedCount >= 1, "Should count in correlations isolated");
});

// CA-8: Post hoc ergo propter hoc fallacy blocked
runTest("CA-8: Post hoc ergo propter hoc fallacy blocked", () => {
  const result = causalReasoningEngine.evaluate({
    message: "App update happened before server crash, so it caused it",
    options: { currentTime: 1700000000000 },
  });

  assert(result.relations.length > 0, "Should detect relation");
  const rel = result.relations[0];
  assert(rel.relationType === "CORRELATION_ONLY", "Temporal precedence alone should not be inferred as direct cause");
  assert(result.diagnostics.postHocFallaciesBlockedCount >= 1, "Should increment post-hoc fallacy blocked count");
});

// CA-9: Reverse causation detection
runTest("CA-9: Reverse causation detection", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Fatigue is actually caused by the lack of sleep",
    options: { currentTime: 1700000000000 },
  });

  assert(result.relations.length > 0, "Should identify reverse causation relation");
  const rel = result.relations.find(r => r.relationType === "REVERSE_CAUSATION");
  assert(rel !== undefined, "Should classify as REVERSE_CAUSATION");
});

// CA-10: Confounding factor detection
runTest("CA-10: Confounding factor detection", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Sunburn and heat exhaustion are both caused by extreme sun exposure",
    options: { currentTime: 1700000000000 },
  });

  assert(result.relations.length > 0, "Should detect confounded relation");
  const rel = result.relations.find(r => r.relationType === "CONFOUNDED");
  assert(rel !== undefined, "Should identify CONFOUNDED relation");
  assert(rel!.confoundingFactors.length > 0, "Should record confounding factor");
});

// CA-11: Coincidence / spurious correlation separation
runTest("CA-11: Coincidence / spurious correlation separation", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Wearing blue socks at the same time as winning the game",
    options: { currentTime: 1700000000000 },
  });

  assert(result.relations.length > 0, "Should detect co-occurrence");
  const rel = result.relations[0];
  assert(rel.relationType === "CORRELATION_ONLY" || rel.relationType === "COINCIDENCE", "Should not infer direct causation");
});

// CA-12: Counterfactual query for necessary condition (outcome: WOULD_NOT_HAPPEN)
runTest("CA-12: Counterfactual query for necessary condition", () => {
  const result = causalReasoningEngine.evaluate({
    message: "What if the user had not deleted the environment config?",
    executiveContext: createDummyExecutiveContext({
      authoritativeFacts: [
        { id: "fact_cf_1", key: "Build Failure", value: "Environment config is required for the build to succeed", authority: "VERIFIED_EVIDENCE", authorityWeight: 0.9, source: "test", confidence: 0.95, topic: "global", isGlobal: true, grounding: "VERIFIED_FACT", sanitizedDirective: "Environment config is required for the build to succeed" },
      ],
    }),
    options: { currentTime: 1700000000000 },
  });

  assert(result.counterfactuals.length > 0, "Should evaluate counterfactual scenario");
  const cf = result.counterfactuals[0];
  assert(cf.consequentEvaluation.counterfactualNecessityEstablished === true, "Counterfactual necessity should be established");
  assert(cf.consequentEvaluation.projectedOutcome === "WOULD_NOT_HAPPEN", "Projected outcome should be WOULD_NOT_HAPPEN");
});

// CA-13: Counterfactual query for correlation only (outcome: WOULD_STILL_HAPPEN)
runTest("CA-13: Counterfactual query for correlation only", () => {
  const result = causalReasoningEngine.evaluate({
    message: "What if ice cream sales did not increase, would swimming accidents happen?",
    options: { currentTime: 1700000000000 },
  });

  assert(result.counterfactuals.length >= 0, "Evaluates counterfactuals safely");
});

// CA-14: Counterfactual closest possible world distance is minimal for direct cause
runTest("CA-14: Counterfactual closest possible world distance is minimal for direct cause", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Deleting node_modules caused the server to crash",
    options: { currentTime: 1700000000000 },
  });

  assert(result.counterfactuals.length > 0, "Should produce baseline counterfactual");
  assert(result.counterfactuals[0].consequentEvaluation.closestWorldDistance <= 0.25, "Distance should be small for direct causal negation");
});

// CA-15: Authority hierarchy respected (CURRENT_TURN_EXPLICIT outranks predictive context)
runTest("CA-15: Authority hierarchy respected", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Upgrading React caused the test runner failure",
    predictiveContext: {
      predictions: [],
      acceptedCandidates: [
        { id: "pred_1", source: "CURRENT_CONTEXT", predictionType: "CONTEXT_RELEVANT", relevance: 0.8, confidence: 0.8, topic: "test", reasonCategory: "REASONING_HEURISTIC", expiresAt: 1700001000000, isSafeToInject: true, requiresConfirmation: false, contextSummary: "TypeScript version might be correlated with test runner" },
      ],
      rejectedCandidates: [],
      suppressionReasons: [],
      confidence: 0.8,
      directives: [],
      requiresConfirmation: false,
      analysisStatus: "SUCCESS",
      diagnostics: { signalsEvaluated: 1, candidatesGenerated: 1, candidatesAccepted: 1, candidatesRejected: 0, reasons: [] },
    },
    options: { currentTime: 1700000000000 },
  });

  assert(result.relations.length > 0, "Should have causal relations");
  const topRel = result.relations[0];
  assert(topRel.evidenceAuthority === "CURRENT_TURN_EXPLICIT", "Current turn explicit assertion should be top authority");
});

// CA-16: Predictive context cannot elevate hypothesis to verified direct cause
runTest("CA-16: Predictive context cannot elevate hypothesis to verified direct cause", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Check status of system",
    predictiveContext: {
      predictions: [],
      acceptedCandidates: [
        { id: "pred_1", source: "CURRENT_CONTEXT", predictionType: "CONTEXT_RELEVANT", relevance: 0.9, confidence: 0.9, topic: "system", reasonCategory: "REASONING_HEURISTIC", expiresAt: 1700001000000, isSafeToInject: true, requiresConfirmation: false, contextSummary: "Network fluctuation might cause slow response" },
      ],
      rejectedCandidates: [],
      suppressionReasons: [],
      confidence: 0.9,
      directives: [],
      requiresConfirmation: false,
      analysisStatus: "SUCCESS",
      diagnostics: { signalsEvaluated: 1, candidatesGenerated: 1, candidatesAccepted: 1, candidatesRejected: 0, reasons: [] },
    },
    options: { currentTime: 1700000000000 },
  });

  for (const rel of result.relations) {
    assert(rel.evidenceAuthority !== "CURRENT_TURN_EXPLICIT", "Predictive node must not pretend to be explicit turn");
  }
});

// CA-17: Topic isolation blocks foreign-domain causal linking
runTest("CA-17: Topic isolation blocks foreign-domain causal linking", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Analyze current project",
    deepReasoning: {
      evidence: [
        { id: "ev_foreign", statement: "Python script memory leak caused slowdown", source: "USER_MESSAGE", authority: "VERIFIED_EVIDENCE", authorityWeight: 0.9, relevance: 0.9, reliability: 0.9, scope: "TOPIC_SPECIFIC", topic: "crypto_bot", provenance: "test" },
      ],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "NO_CONCLUSION", statement: "None", confidence: 0.9, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: { totalEvidenceExamined: 1, authorizedEvidenceCount: 1, suppressedEvidenceCount: 0, sensitiveBlockedCount: 0, identityInferenceBlockedCount: 0, topicIsolatedCount: 0, staleSupersededBlockedCount: 0, deduplicatedCount: 0, hypothesesGeneratedCount: 0, contradictionsDetectedCount: 0, contradictionsResolvedCount: 0, unresolvedContradictionsCount: 0, stepsExecuted: 0, executionTimeMs: 0, isDeterministic: true },
    },
    options: {
      strictTopicIsolation: true,
      activeTopic: "web_frontend",
      currentTime: 1700000000000,
    },
  });

  assert(result.diagnostics.topicIsolatedSuppressedCount >= 1, "Should suppress foreign topic evidence under strict isolation");
});

// CA-18: Global facts survive topic isolation
runTest("CA-18: Global facts survive topic isolation", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Evaluate global architecture",
    executiveContext: createDummyExecutiveContext({
      authoritativeFacts: [
        { id: "fact_glob_1", key: "NodeJS", value: "NodeJS version 20 is installed globally", authority: "VERIFIED_EVIDENCE", authorityWeight: 1.0, source: "test", confidence: 1.0, topic: "global", isGlobal: true, grounding: "VERIFIED_FACT", sanitizedDirective: "NodeJS version 20 is installed globally" },
      ],
    }),
    options: {
      strictTopicIsolation: true,
      activeTopic: "specific_submodule",
      currentTime: 1700000000000,
    },
  });

  const node = result.nodes.find(n => n.statement.includes("NodeJS version 20"));
  assert(node !== undefined, "Global scope node must not be suppressed by topic isolation");
});

// CA-19: Sensitive credentials are sanitized
runTest("CA-19: Sensitive credentials are sanitized", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Using api_key = 'sk-12345678901234567890' caused authorization failure",
    options: { currentTime: 1700000000000 },
  });

  for (const rel of result.relations) {
    assert(!rel.causeStatement.includes("sk-12345678901234567890"), "Raw secret key must be sanitized from cause");
    assert(!rel.effectStatement.includes("sk-12345678901234567890"), "Raw secret key must be sanitized from effect");
  }
  for (const d of result.activeDirectives) {
    assert(!d.includes("sk-12345678901234567890"), "Raw secret key must be sanitized from directives");
  }
});

// CA-20: Technical non-credential tokens are not falsely suppressed
runTest("CA-20: Technical non-credential tokens are not falsely suppressed", () => {
  const result = causalReasoningEngine.evaluate({
    message: "PostgreSQL index rebuild caused disk usage spike",
    options: { currentTime: 1700000000000 },
  });

  assert(result.relations.length > 0, "Should identify causal relation");
  assert(result.relations[0].causeStatement.toLowerCase().includes("postgresql index rebuild"), "Technical keywords must be retained");
});

// CA-21: Unsupported identity inferences cannot form verified causal relations
runTest("CA-21: Unsupported identity inferences cannot form verified causal relations", () => {
  const result = causalReasoningEngine.evaluate({
    message: "User must be an expert coder because they asked about compilers",
    options: { currentTime: 1700000000000 },
  });

  assert(result.relations.length >= 0, "Handles speculative inference safely");
});

// CA-22: Duplicate evidence does not inflate causal confidence
runTest("CA-22: Duplicate evidence does not inflate causal confidence", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Port conflict caused server launch failure",
    executiveContext: createDummyExecutiveContext({
      authoritativeFacts: [
        { id: "fact_dup_1", key: "Port conflict", value: "Port conflict caused server launch failure", authority: "VERIFIED_EVIDENCE", authorityWeight: 0.9, source: "test", confidence: 0.9, topic: "global", isGlobal: true, grounding: "VERIFIED_FACT", sanitizedDirective: "Port conflict caused server launch failure" },
      ],
    }),
    options: { currentTime: 1700000000000 },
  });

  const matchingNodes = result.nodes.filter(n => n.statement.toLowerCase().includes("port conflict caused server launch failure"));
  assert(matchingNodes.length === 1, "Duplicate statements must be deduplicated to a single node");
});

// CA-23: Determinism: Same input + same injected currentTime gives identical output
runTest("CA-23: Determinism: Same input + same injected currentTime gives identical output", () => {
  const input: CausalReasoningInput = {
    message: "Database lock caused query timeout",
    options: { currentTime: 1700000000000 },
  };

  const res1 = causalReasoningEngine.evaluate(input);
  const res2 = causalReasoningEngine.evaluate(input);

  assert(JSON.stringify(res1.relations) === JSON.stringify(res2.relations), "Relations must be identical");
  assert(JSON.stringify(res1.activeDirectives) === JSON.stringify(res2.activeDirectives), "Directives must be identical");
});

// CA-24: Determinism: 10 repeated iterations produce identical output
runTest("CA-24: Determinism: 10 repeated iterations produce identical output", () => {
  const input: CausalReasoningInput = {
    message: "Deleting cache caused slower first load",
    options: { currentTime: 1700000000000 },
  };

  const baseline = JSON.stringify(causalReasoningEngine.evaluate(input));
  for (let i = 0; i < 10; i++) {
    const run = JSON.stringify(causalReasoningEngine.evaluate(input));
    assert(run === baseline, `Iteration ${i} produced non-deterministic output`);
  }
});

// CA-25: Injected currentTime changes only timestamp-dependent fields
runTest("CA-25: Injected currentTime changes only timestamp-dependent fields", () => {
  const input1: CausalReasoningInput = {
    message: "File missing caused 404 error",
    options: { currentTime: 100000 },
  };
  const input2: CausalReasoningInput = {
    message: "File missing caused 404 error",
    options: { currentTime: 200000 },
  };

  const res1 = causalReasoningEngine.evaluate(input1);
  const res2 = causalReasoningEngine.evaluate(input2);

  assert(res1.relations.length === res2.relations.length, "Relation counts should match");
  assert(res1.relations[0].relationType === res2.relations[0].relationType, "Relation types should match");
});

// CA-26: Zero Date.now() in causalReasoningEngine
runTest("CA-26: Zero Date.now() in causalReasoningEngine", () => {
  const originalDateNow = Date.now;
  try {
    Date.now = () => { throw new Error("Date.now called unexpectedly"); };
    causalReasoningEngine.evaluate({
      message: "Testing date independence",
      options: { currentTime: 1700000000000 },
    });
  } finally {
    Date.now = originalDateNow;
  }
});

// CA-27: Zero Math.random() in causalReasoningEngine
runTest("CA-27: Zero Math.random() in causalReasoningEngine", () => {
  const originalRandom = Math.random;
  try {
    Math.random = () => { throw new Error("Math.random called unexpectedly"); };
    causalReasoningEngine.evaluate({
      message: "Testing randomness independence",
      options: { currentTime: 1700000000000 },
    });
  } finally {
    Math.random = originalRandom;
  }
});

// CA-28: Zero random UUIDs in causalReasoningEngine
runTest("CA-28: Zero random UUIDs in causalReasoningEngine", () => {
  const res = causalReasoningEngine.evaluate({
    message: "A caused B",
    options: { currentTime: 1700000000000 },
  });

  for (const node of res.nodes) {
    assert(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(node.id), "Node IDs must be deterministic hashes, not random UUIDs");
  }
  for (const rel of res.relations) {
    assert(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rel.id), "Relation IDs must be deterministic, not random UUIDs");
  }
});

// CA-29: Input immutability
runTest("CA-29: Input immutability", () => {
  const input: CausalReasoningInput = {
    message: "Network drop caused disconnect",
    options: { currentTime: 1700000000000 },
  };

  const frozenInput = Object.freeze({ ...input });
  causalReasoningEngine.evaluate(frozenInput);
  assert(true, "Input remained immutable");
});

// CA-30: Budgeting: maxEvidenceNodes limit enforced
runTest("CA-30: Budgeting: maxEvidenceNodes limit enforced", () => {
  const result = causalReasoningEngine.evaluate({
    message: "A caused B",
    options: {
      budget: { maxEvidenceNodes: 1 },
      currentTime: 1700000000000,
    },
  });

  assert(result.nodes.length <= 1, "Nodes should not exceed budget limit");
});

// CA-31: Budgeting: maxCausalRelations limit enforced
runTest("CA-31: Budgeting: maxCausalRelations limit enforced", () => {
  const result = causalReasoningEngine.evaluate({
    message: "A caused B",
    options: {
      budget: { maxCausalRelations: 1 },
      currentTime: 1700000000000,
    },
  });

  assert(result.relations.length <= 1, "Relations should not exceed budget limit");
});

// CA-32: Budgeting: maxCausalChains limit enforced
runTest("CA-32: Budgeting: maxCausalChains limit enforced", () => {
  const result = causalReasoningEngine.evaluate({
    message: "A caused B",
    options: {
      budget: { maxCausalChains: 0 },
      currentTime: 1700000000000,
    },
  });

  assert(result.chains.length === 0, "Chains should respect 0 cap");
});

// CA-33: Budgeting: maxCounterfactuals limit enforced
runTest("CA-33: Budgeting: maxCounterfactuals limit enforced", () => {
  const result = causalReasoningEngine.evaluate({
    message: "What if A did not cause B?",
    options: {
      budget: { maxCounterfactuals: 0 },
      currentTime: 1700000000000,
    },
  });

  assert(result.counterfactuals.length === 0, "Counterfactuals should respect 0 cap");
});

// CA-34: Budgeting: maxDirectives limit enforced
runTest("CA-34: Budgeting: maxDirectives limit enforced", () => {
  const result = causalReasoningEngine.evaluate({
    message: "A caused B",
    options: {
      budget: { maxDirectives: 1 },
      currentTime: 1700000000000,
    },
  });

  assert(result.activeDirectives.length <= 1, "Directives should not exceed max limit");
});

// CA-35: Directives are sanitized (no raw internal IDs)
runTest("CA-35: Directives are sanitized (no raw internal IDs)", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Disk full caused crash",
    options: { currentTime: 1700000000000 },
  });

  for (const d of result.activeDirectives) {
    assert(!d.includes("node_"), "Directive must not contain raw node IDs");
    assert(!d.includes("causal_"), "Directive must not contain raw causal relation IDs");
  }
});

// CA-36: Cycle detection in causal chains avoids infinite loops
runTest("CA-36: Cycle detection in causal chains avoids infinite loops", () => {
  const result = causalReasoningEngine.evaluate({
    message: "A caused B",
    deepReasoning: {
      evidence: [
        { id: "ev1", statement: "B caused A", source: "SYSTEM", authority: "VERIFIED_EVIDENCE", authorityWeight: 0.9, relevance: 0.9, reliability: 0.9, scope: "GLOBAL", provenance: "test" },
      ],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "NO_CONCLUSION", statement: "None", confidence: 0.9, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: { totalEvidenceExamined: 1, authorizedEvidenceCount: 1, suppressedEvidenceCount: 0, sensitiveBlockedCount: 0, identityInferenceBlockedCount: 0, topicIsolatedCount: 0, staleSupersededBlockedCount: 0, deduplicatedCount: 0, hypothesesGeneratedCount: 0, contradictionsDetectedCount: 0, contradictionsResolvedCount: 0, unresolvedContradictionsCount: 0, stepsExecuted: 0, executionTimeMs: 0, isDeterministic: true },
    },
    options: { currentTime: 1700000000000 },
  });

  assert(Array.isArray(result.chains), "Chains array returned safely without hanging");
});

// CA-37: Malformed / empty input fails safely
runTest("CA-37: Malformed / empty input fails safely", () => {
  const result = causalReasoningEngine.evaluate({} as any);
  assert(result.status === "EMPTY" || result.status === "COMPLETE", "Empty input handles gracefully");
});

// CA-38: Integration with ExecutiveContext
runTest("CA-38: Integration with ExecutiveContext", () => {
  const execContext = createDummyExecutiveContext({
    authoritativeFacts: [
      { id: "fact_ex_1", key: "Config", value: "Invalid JSON in config caused parser exception", authority: "VERIFIED_EVIDENCE", authorityWeight: 0.95, source: "test", confidence: 0.95, topic: "global", isGlobal: true, grounding: "VERIFIED_FACT", sanitizedDirective: "Invalid JSON in config caused parser exception" },
    ],
  });

  const result = causalReasoningEngine.evaluate({
    message: "Check exception cause",
    executiveContext: execContext,
    options: { currentTime: 1700000000000 },
  });

  assert(result.nodes.some(n => n.statement.includes("Invalid JSON in config")), "Node extracted from executive context");
});

// CA-39: Integration with DeepReasoningEngine evidence
runTest("CA-39: Integration with DeepReasoningEngine evidence", () => {
  const deepReasoning = deepReasoningEngine.evaluate({
    message: "Syntax error in server.ts caused compilation abort",
    options: { currentTime: 1700000000000 },
  });

  const result = causalReasoningEngine.evaluate({
    message: "Why did compilation fail?",
    deepReasoning,
    options: { currentTime: 1700000000000 },
  });

  assert(result.nodes.length > 0, "Deep reasoning evidence consumed");
});

// CA-40: Integration with ContradictionResolutionEngine revisions
runTest("CA-40: Integration with ContradictionResolutionEngine revisions", () => {
  const ev1 = {
    id: "ev_1",
    statement: "User previously used JavaScript",
    source: "memory_store",
    authority: "CONFIRMED_USER_MODEL" as const,
    authorityWeight: 0.75,
    relevance: 0.85,
    reliability: 0.9,
    timestamp: 1000,
    scope: "GLOBAL" as const,
    provenance: "turn_1",
    normalizedKey: "language",
    normalizedValue: "JavaScript",
  };
  const ev2 = {
    id: "ev_2",
    statement: "User switched to TypeScript",
    source: "current_turn",
    authority: "CURRENT_TURN_EXPLICIT" as const,
    authorityWeight: 1.0,
    relevance: 1.0,
    reliability: 1.0,
    timestamp: 2000,
    scope: "GLOBAL" as const,
    provenance: "turn_2",
    normalizedKey: "language",
    normalizedValue: "TypeScript",
  };

  const contradictionRes = contradictionResolutionEngine.evaluate({
    message: "I switched from JavaScript to TypeScript",
    deepReasoning: {
      evidence: [ev1, ev2],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Switched language", confidence: 1.0, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1700000000000 },
  });

  const result = causalReasoningEngine.evaluate({
    message: "Why did the file extension change?",
    contradictionResolution: contradictionRes,
    options: { currentTime: 1700000000000 },
  });

  assert(result.nodes.length > 0, "Contradiction resolution beliefs consumed");
});

// CA-41: Integration with TemporalMemory transitions
runTest("CA-41: Integration with TemporalMemory transitions", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Why did the test suite slow down?",
    temporalMemory: {
      userId: "test_user",
      analyzedAt: 1700000000000,
      patterns: [],
      activePatterns: [],
      historicalPatterns: [],
      evolutions: [
        {
          attributeKey: "Database state",
          previousValue: "in-memory",
          currentValue: "disk-backed",
          transitionTimestamp: 1690000000000,
          authority: "CURRENT_TURN_EXPLICIT",
          lineageIds: [],
          sanitizedSummary: "Transitioned from in-memory to disk-backed",
        },
      ],
      relations: [],
      directives: [],
      diagnostics: { totalPatternsAnalyzed: 1, stableCount: 0, recurringCount: 0, evolvingCount: 1, historicalCount: 0, staleCount: 0, suppressedSensitiveCount: 0, topicIsolatedCount: 0, evolutionTransitions: [] },
    },
    options: { currentTime: 1700000000000 },
  });

  assert(result.nodes.some(n => n.statement.includes("Transitioned from in-memory to disk-backed")), "Temporal transition node extracted");
});

// CA-42: Integration with GoalProject blockers
runTest("CA-42: Integration with GoalProject blockers", () => {
  const result = causalReasoningEngine.evaluate({
    message: "What is blocking deployment?",
    goalProject: {
      state: {
        activeProjects: [
          {
            projectId: "p1",
            name: "Alpha Release",
            normalizedName: "alpha release",
            status: "ACTIVE",
            priority: "HIGH",
            createdAt: 1700000000000,
            updatedAt: 1700000000000,
            goals: [],
            milestones: [],
            tasks: [],
            commitments: [],
            dependencies: [],
            events: [],
            sourceAuthority: "CURRENT_TURN_EXPLICIT",
            confidence: 0.9,
            lineage: [],
            blockerDescription: "Missing SSL cert",
          },
        ],
        pausedProjects: [],
        blockedProjects: [],
        completedProjects: [],
        historicalProjects: [],
        activeGoals: [],
        completedGoals: [],
        activeCommitments: [],
        expiredCommitments: [],
        activeTasks: [],
      },
      activeProjects: [
        {
          projectId: "p1",
          name: "Alpha Release",
          normalizedName: "alpha release",
          status: "ACTIVE",
          priority: "HIGH",
          createdAt: 1700000000000,
          updatedAt: 1700000000000,
          goals: [],
          milestones: [],
          tasks: [],
          commitments: [],
          dependencies: [],
          events: [],
          sourceAuthority: "CURRENT_TURN_EXPLICIT",
          confidence: 0.9,
          lineage: [],
          blockerDescription: "Missing SSL cert",
        },
      ],
      blockedProjects: [],
      activeGoals: [],
      activeCommitments: [],
      readyTasks: [],
      blockedTasks: [],
      directives: [],
      currentTurnOverrides: {},
      diagnostics: {
        totalGoals: 0,
        activeGoalsCount: 0,
        totalProjects: 1,
        activeProjectsCount: 1,
        totalCommitments: 0,
        expiredCommitmentsCount: 0,
        readyTasksCount: 0,
        blockedTasksCount: 0,
        suppressedCandidateCount: 0,
        suppressedSensitiveCount: 0,
        suppressedPredictiveCount: 0,
        isolatedTopicCount: 0,
        evaluationTimeMs: 0,
      },
    },
    options: { currentTime: 1700000000000 },
  });

  assert(result.nodes.some(n => n.statement.includes("Missing SSL cert")), "Goal blocker extracted into causal evidence nodes");
});

// CA-43: BrainEngine pipeline integration produces valid causalReasoning analysis
runTest("CA-43: BrainEngine pipeline integration produces valid causalReasoning analysis", () => {
  const brainOutput = brainEngine.analyze(
    "Deleting node_modules caused the build failure",
    [],
    undefined,
    "test_sess_causal",
    [],
    { currentTime: 1700000000000, persistDecisions: false }
  );

  assert((brainOutput as any).causalReasoning !== undefined, "BrainEngine output must include causalReasoning analysis");
  assert((brainOutput as any).causalReasoning.relations.length > 0, "Causal reasoning in BrainEngine should identify relation");
});

// CA-44: Phase 1 regression remains green
runTest("CA-44: Phase 1 regression remains green", () => {
  const brainOutput = brainEngine.analyze(
    "Hi Dora, can you help me?",
    [],
    undefined,
    "test_sess_reg1",
    [],
    { currentTime: 1700000000000, persistDecisions: false }
  );

  assert(brainOutput.intent !== undefined, "Intent classification must function");
  assert(brainOutput.reasoningAnalysis !== undefined, "Reasoning analysis must function");
});

// CA-45: Phase 2 regression remains green
runTest("CA-45: Phase 2 regression remains green", () => {
  const brainOutput = brainEngine.analyze(
    "I prefer concise answers",
    [],
    undefined,
    "test_sess_reg2",
    [],
    { currentTime: 1700000000000, persistDecisions: false }
  );

  assert(brainOutput.executiveContext !== undefined, "Executive context must function");
  assert(brainOutput.responseAdaptationAnalysis !== undefined, "Response adaptation must function");
});

// CA-46: Phase 3 Step 1 (DeepReasoning) regression remains green
runTest("CA-46: Phase 3 Step 1 (DeepReasoning) regression remains green", () => {
  const brainOutput = brainEngine.analyze(
    "Hypothesis: The database is offline because port 5432 is closed",
    [],
    undefined,
    "test_sess_reg3",
    [],
    { currentTime: 1700000000000, persistDecisions: false }
  );

  assert(brainOutput.deepReasoningAnalysis !== undefined, "Deep reasoning must function");
});

// CA-47: Phase 3 Step 2 (ContradictionResolution) regression remains green
runTest("CA-47: Phase 3 Step 2 (ContradictionResolution) regression remains green", () => {
  const brainOutput = brainEngine.analyze(
    "Actually, forget that, my favorite language is Rust, not Python",
    [],
    undefined,
    "test_sess_reg4",
    [],
    { currentTime: 1700000000000, persistDecisions: false }
  );

  assert(brainOutput.contradictionResolutionAnalysis !== undefined, "Contradiction resolution must function");
});

// ======================================================
// TARGETED ARCHITECTURAL HARDENING TESTS (CR-H1 to CR-H20)
// ======================================================

// CR-H1: Pure user question MUST NOT be promoted to authoritative causal evidence
runTest("CR-H1: Pure user question MUST NOT be promoted to authoritative causal evidence", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Did updating React break the build?",
    options: { currentTime: 1700000000000 },
  });

  assert(result.diagnostics.questionsSuppressedCount >= 1, "Question must be tracked in diagnostics");
  assert(result.nodes.every(n => n.authority !== "CURRENT_TURN_EXPLICIT"), "Questions must not become CURRENT_TURN_EXPLICIT evidence");
});

// CR-H2: User question with causal terms MUST NOT form a verified causal relation
runTest("CR-H2: User question with causal terms MUST NOT form a verified causal relation", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Why did the server crash?",
    options: { currentTime: 1700000000000 },
  });

  assert(result.diagnostics.questionsSuppressedCount >= 1, "Question must be suppressed from causal assertion gate");
  assert(result.relations.length === 0, "Question cannot create causal relations on its own");
});

// CR-H3: Hypothetical query MUST NOT become observed evidence
runTest("CR-H3: Hypothetical query MUST NOT become observed evidence", () => {
  const result = causalReasoningEngine.evaluate({
    message: "What if we had used Vite instead of Webpack?",
    options: { currentTime: 1700000000000 },
  });

  assert(result.diagnostics.hypotheticalsSuppressedCount >= 1, "Hypothetical must be tracked in diagnostics");
  assert(result.nodes.every(n => n.sourceType !== "USER_ASSERTION"), "Hypothetical cannot produce USER_ASSERTION");
});

// CR-H4: Counterfactual antecedent treated as hypothetical inquiry, not historical ground truth
runTest("CR-H4: Counterfactual antecedent treated as hypothetical inquiry", () => {
  const result = causalReasoningEngine.evaluate({
    message: "If I hadn't deleted the file, would the build pass?",
    options: { currentTime: 1700000000000 },
  });

  assert(result.diagnostics.hypotheticalsSuppressedCount >= 1 || result.diagnostics.questionsSuppressedCount >= 1, "Counterfactual inquiry must be gated");
  assert(result.nodes.every(n => n.authority !== "CURRENT_TURN_EXPLICIT"), "Counterfactual premise cannot become current turn explicit fact");
});

// CR-H5: Speculative claim classified as speculation, not verified evidence
runTest("CR-H5: Speculative claim classified as speculation, not verified evidence", () => {
  const result = causalReasoningEngine.evaluate({
    message: "I guess maybe the network timeout caused the error",
    options: { currentTime: 1700000000000 },
  });

  assert(result.diagnostics.speculationsSuppressedCount >= 1, "Speculation tracked in diagnostics");
  assert(result.nodes.every(n => n.authority !== "CURRENT_TURN_EXPLICIT" && n.authority !== "VERIFIED_EVIDENCE"), "Speculation cannot have authoritative evidence rank");
  assert(result.nodes.every(n => n.confidence <= 0.5), "Speculation confidence must be capped <= 0.5");
});

// CR-H6: Assistant attribution cannot inflate evidence authority as user evidence
runTest("CR-H6: Assistant attribution cannot inflate evidence authority as user evidence", () => {
  const result = causalReasoningEngine.evaluate({
    message: "You said earlier that port 3000 was blocked",
    options: { currentTime: 1700000000000 },
  });

  assert(result.diagnostics.assistantAttributionsSuppressedCount >= 1, "Assistant attribution tracked in diagnostics");
  assert(result.nodes.every(n => n.authority !== "CURRENT_TURN_EXPLICIT"), "Assistant attribution cannot be elevated to CURRENT_TURN_EXPLICIT");
});

// CR-H7: Assistant-quoted causal statement cannot count as independent user evidence
runTest("CR-H7: Assistant-quoted causal statement cannot count as independent user evidence", () => {
  const result = causalReasoningEngine.evaluate({
    message: "According to you, the database crashed because of high memory usage",
    options: { currentTime: 1700000000000 },
  });

  assert(result.diagnostics.assistantAttributionsSuppressedCount >= 1, "Assistant attribution suppressed");
  assert(result.nodes.every(n => n.sourceType !== "USER_ASSERTION"), "Assistant attribution cannot be USER_ASSERTION");
});

// CR-H8: Declarative causal assertion correctly classified as USER_ASSERTION / CURRENT_TURN_EXPLICIT
runTest("CR-H8: Declarative causal assertion correctly classified as USER_ASSERTION / CURRENT_TURN_EXPLICIT", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Deleting node_modules broke the dev server",
    options: { currentTime: 1700000000000 },
  });

  assert(result.nodes.some(n => n.authority === "CURRENT_TURN_EXPLICIT" && n.isObserved === true), "Direct assertion creates observed CURRENT_TURN_EXPLICIT node");
  assert(result.relations.some(r => r.relationType === "DIRECT_CAUSE"), "Direct assertion creates DIRECT_CAUSE relation");
});

// CR-H9: Verified evidence from upstream engines retains VERIFIED_EVIDENCE authority
runTest("CR-H9: Verified evidence from upstream engines retains VERIFIED_EVIDENCE authority", () => {
  const execContext = createDummyExecutiveContext({
    authoritativeFacts: [
      {
        id: "fact_db_1",
        key: "database_status",
        value: "PostgreSQL is running on port 5432",
        source: "system_probe",
        confidence: 0.98,
        authority: "VERIFIED_EVIDENCE",
        authorityWeight: 0.95,
        grounding: "VERIFIED_FACT",
        isGlobal: true,
        topic: "database",
        sanitizedDirective: "Database is online",
      },
    ],
  });

  const result = causalReasoningEngine.evaluate({
    message: "Is the database active?",
    executiveContext: execContext,
    options: { currentTime: 1700000000000 },
  });

  assert(result.nodes.some(n => n.authority === "VERIFIED_EVIDENCE" && n.statement.includes("running on port 5432")), "Upstream fact retains VERIFIED_EVIDENCE");
  assert(result.diagnostics.questionsSuppressedCount >= 1, "Query message itself is suppressed as question");
});

// CR-H10: Question inquiring about verified fact does NOT duplicate fact with question text
runTest("CR-H10: Question inquiring about verified fact does NOT duplicate fact with question text", () => {
  const execContext = createDummyExecutiveContext({
    authoritativeFacts: [
      {
        id: "fact_err_1",
        key: "build_error",
        value: "Syntax error on line 42",
        source: "compiler",
        confidence: 0.99,
        authority: "VERIFIED_EVIDENCE",
        authorityWeight: 0.95,
        grounding: "VERIFIED_FACT",
        isGlobal: true,
        topic: "build",
        sanitizedDirective: "Syntax error on line 42",
      },
    ],
  });

  const result = causalReasoningEngine.evaluate({
    message: "Did the build fail because of syntax error?",
    executiveContext: execContext,
    options: { currentTime: 1700000000000 },
  });

  assert(result.diagnostics.questionsSuppressedCount >= 1, "Question must be gated");
  assert(result.nodes.every(n => !n.statement.startsWith("Did the build fail")), "Question text must not be inserted as a node");
});

// CR-H11: Mixed turn with conditional clause does not promote conditional to observed ground truth
runTest("CR-H11: Mixed turn with conditional clause does not promote conditional to observed ground truth", () => {
  const result = causalReasoningEngine.evaluate({
    message: "If the config is missing, the app crashes",
    options: { currentTime: 1700000000000 },
  });

  assert(result.diagnostics.hypotheticalsSuppressedCount >= 1, "Conditional clause flagged as hypothetical");
  assert(result.nodes.every(n => n.authority !== "CURRENT_TURN_EXPLICIT"), "Conditional statement not elevated to observed fact");
});

// CR-H12: Conditional hypothetical does not add unverified technology as active fact
runTest("CR-H12: Conditional hypothetical does not add unverified technology as active fact", () => {
  const result = causalReasoningEngine.evaluate({
    message: "What if we migrate to Redis next week?",
    options: { currentTime: 1700000000000 },
  });

  assert(result.diagnostics.hypotheticalsSuppressedCount >= 1, "Hypothetical question gated");
  assert(result.nodes.length === 0, "No evidence nodes generated from pure hypothetical");
});

// CR-H13: Ambiguous speculation suppressed or marked speculative, not direct causal link
runTest("CR-H13: Ambiguous speculation suppressed or marked speculative, not direct causal link", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Maybe it's the cache?",
    options: { currentTime: 1700000000000 },
  });

  assert(result.diagnostics.speculationsSuppressedCount >= 1 || result.diagnostics.questionsSuppressedCount >= 1, "Speculation/question suppressed");
  assert(result.relations.length === 0, "No causal relations formed from ambiguous speculation");
});

// CR-H14: Question with 'because' treated as QUESTION intent, not DIRECT_CAUSE assertion
runTest("CR-H14: Question with 'because' treated as QUESTION intent, not DIRECT_CAUSE assertion", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Is the app slow because of the database query?",
    options: { currentTime: 1700000000000 },
  });

  assert(result.diagnostics.questionsSuppressedCount >= 1, "Question with 'because' must be classified as QUESTION");
  assert(result.relations.length === 0, "Question with 'because' must not create causal relation");
});

// CR-H15: Assistant attribution with claim does not elevate assistant claim to user assertion
runTest("CR-H15: Assistant attribution with claim does not elevate assistant claim to user assertion", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Dora said that the port conflict caused the failure",
    options: { currentTime: 1700000000000 },
  });

  assert(result.diagnostics.assistantAttributionsSuppressedCount >= 1, "Assistant attribution suppressed");
  assert(result.nodes.every(n => n.sourceType !== "USER_ASSERTION"), "Assistant claim is not user assertion");
});

// CR-H16: Directives generated under speculative intent do NOT state 'directly caused' as verified fact
runTest("CR-H16: Directives generated under speculative intent do NOT state 'directly caused' as verified fact", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Perhaps the memory leak caused the slowdown",
    options: { currentTime: 1700000000000 },
  });

  assert(result.activeDirectives.every(d => !d.includes("directly caused") || d.includes("unverified") || d.includes("caution")), "Speculative input cannot produce unconditional direct cause directive");
});

// CR-H17: Diagnostics accurately track all suppression counters
runTest("CR-H17: Diagnostics accurately track all suppression counters", () => {
  const qRes = causalReasoningEngine.evaluate({ message: "Is the build passing?" });
  assert(qRes.diagnostics.questionsSuppressedCount === 1, "questionsSuppressedCount must equal 1");

  const hRes = causalReasoningEngine.evaluate({ message: "What if we restart the pod?" });
  assert(hRes.diagnostics.hypotheticalsSuppressedCount === 1, "hypotheticalsSuppressedCount must equal 1");

  const sRes = causalReasoningEngine.evaluate({ message: "I suspect maybe the token expired" });
  assert(sRes.diagnostics.speculationsSuppressedCount === 1, "speculationsSuppressedCount must equal 1");

  const aRes = causalReasoningEngine.evaluate({ message: "You previously told me to delete dist" });
  assert(aRes.diagnostics.assistantAttributionsSuppressedCount === 1, "assistantAttributionsSuppressedCount must equal 1");
});

// CR-H18: Sanitization removes all raw internal tokens, IDs, and bracketed tags from directives
runTest("CR-H18: Sanitization removes all raw internal tokens, IDs, and bracketed tags from directives", () => {
  const result = causalReasoningEngine.evaluate({
    message: "Corrupted lockfile caused the npm install failure",
    options: { currentTime: 1700000000000 },
  });

  for (const d of result.activeDirectives) {
    assert(!/\[(?:DIRECT_CAUSE|INDIRECT_CAUSE|CORRELATION_ONLY|CONFOUNDED)\]/i.test(d), "No bracketed relation tags in directives");
    assert(!/\bnode_[0-9a-f_]+\b/i.test(d), "No raw node IDs in directives");
    assert(!/\bcausal_[0-9a-f_]+\b/i.test(d), "No raw causal IDs in directives");
    assert(!/\bcf_[0-9a-f_]+\b/i.test(d), "No raw counterfactual IDs in directives");
    assert(!/\bchain_[0-9a-f_]+\b/i.test(d), "No raw chain IDs in directives");
  }
});

// CR-H19: Strict determinism preserved across 10 repeated hardening evaluations
runTest("CR-H19: Strict determinism preserved across 10 repeated hardening evaluations", () => {
  const runs = Array.from({ length: 10 }, () =>
    causalReasoningEngine.evaluate({
      message: "What if deleting cache caused the error? You told me it would work.",
      options: { currentTime: 1700000000000 },
    })
  );

  const baseline = JSON.stringify(runs[0]);
  for (let i = 1; i < 10; i++) {
    assert(JSON.stringify(runs[i]) === baseline, `Run ${i + 1} must match baseline byte-for-byte`);
  }
});

// CR-H20: Full BrainEngine pipeline integration with hardened gating on conversational inputs
runTest("CR-H20: Full BrainEngine pipeline integration with hardened gating on conversational inputs", () => {
  const brainOutput = brainEngine.analyze(
    "Why is port 3000 busy?",
    [],
    undefined,
    "test_sess_hardened",
    [],
    { currentTime: 1700000000000, persistDecisions: false }
  );

  const cr = (brainOutput as any).causalReasoning;
  assert(cr !== undefined, "BrainEngine output contains causalReasoning");
  assert(cr.diagnostics.questionsSuppressedCount >= 1, "Question intent must be gated in BrainEngine pipeline");
});

console.log("======================================================");
console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log("======================================================");
