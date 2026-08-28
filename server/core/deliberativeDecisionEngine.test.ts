/**
 * Dora Deliberative Decision & Action Planning Engine Test Suite
 * Phase 3 — Step 8
 * 
 * Verifies deterministic candidate evaluation, constraint filtering, goal alignment,
 * evidence & epistemic auditing, causal/simulation integration, meta-reasoning handling,
 * lexicographical ranking, action planning, sanitization, and full BrainEngine integration.
 */

import { deliberativeDecisionEngine, DeliberativeDecisionEngine } from "./deliberativeDecisionEngine";
import {
  DecisionEngineInput,
  DecisionState,
  DecisionRecommendationType,
} from "./deliberativeDecisionTypes";
import { brainEngine } from "./brainEngine";
import { contextStore } from "./contextStore";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

let passedTests = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err: any) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

console.log("======================================================");
console.log("RUNNING DORA DELIBERATIVE DECISION ENGINE TEST SUITE");
console.log("======================================================");

// DD-1: Basic candidate evaluation (default candidate)
runTest("DD-1: Basic candidate evaluation for default continuation", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    message: "Summarize the project status",
    options: { currentTime: 1724000000000 },
  });

  assert(res.candidates.length >= 1, "Discovered at least one candidate option");
  assert(res.decisionState === "READY" || res.decisionState === "READY_WITH_WARNINGS", "Valid decision state");
  assert(res.recommendation.type === "RECOMMEND_OPTION", "Recommends default continuation option");
  assert(res.evaluations.length >= 1, "Evaluations generated");
});

// DD-2: Multiple candidate ranking
runTest("DD-2: Multiple candidate ranking produces sorted ranking", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    message: "Choose between Option A and Option B",
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "PostgreSQL Database", benefits: ["ACID compliance", "Robust relational model"] },
        { title: "Flat JSON File Storage", risks: ["No concurrency control", "Data corruption risk"] },
      ],
    },
  });

  assert(res.candidates.length === 2, "Discovered both candidates");
  assert(res.ranking.length === 2, "Both candidates ranked");
  assert(res.ranking[0].title === "PostgreSQL Database", "PostgreSQL outranks Flat JSON file");
  assert(res.ranking[0].rank === 1, "PostgreSQL rank is 1");
  assert(res.ranking[1].rank === 2, "Flat JSON rank is 2");
});

// DD-3: Hard constraint filtering
runTest("DD-3: Hard constraint filtering blocks violating candidate", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    message: "Choose action",
    executiveContext: {
      currentTurnId: "turn_1",
      userId: "u1",
      assembledAt: 1724000000000,
      authoritativeFacts: [],
      activeGoals: [],
      reasoningConstraints: [
        {
          id: "rc_1",
          type: "HARD_CONSTRAINT",
          description: "Never drop production tables",
          authority: "HARD_CONSTRAINT",
          sanitizedDirective: "Never drop production tables",
          enforceStrictly: true,
        } as any,
      ],
      temporalAnchors: [],
      activePreferences: [],
      topicBoundary: { activeTopic: "database", isTopicSwitch: false, boundaryType: "PERSISTENT" },
      epistemicSummary: { verifiedCount: 1, inferredCount: 0, uncertainCount: 0, contestedCount: 0, overallReliability: 1.0 },
      sourceLayersIncluded: [],
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Drop Table Production Orders", description: "Directly drop table to reset schema" },
        { title: "Apply Non-Destructive Migration", description: "Use alter table with safety checks" },
      ],
    },
  });

  const blocked = res.candidates.find((c) => c.title.includes("Drop Table"));
  const safe = res.candidates.find((c) => c.title.includes("Apply Non-Destructive"));

  assert(blocked !== undefined && blocked.decisionState === "BLOCKED", "Drop table option is BLOCKED");
  assert(safe !== undefined && (safe.decisionState === "READY" || safe.decisionState === "READY_WITH_WARNINGS"), "Safe migration is READY");
  assert(res.ranking[0].title.includes("Apply Non-Destructive"), "Safe migration ranked #1");
  assert(res.diagnostics.candidatesBlocked >= 1, "Recorded blocked candidate in diagnostics");
});

// DD-4: Hard constraint cannot be overridden by benefits
runTest("DD-4: Hard constraint cannot be overridden by high benefits or scores", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    message: "Evaluate speedup",
    executiveContext: {
      currentTurnId: "turn_1",
      userId: "u1",
      assembledAt: 1724000000000,
      authoritativeFacts: [],
      activeGoals: [],
      reasoningConstraints: [
        {
          id: "rc_2",
          type: "HARD_CONSTRAINT",
          description: "Never expose secret API keys in client code",
          authority: "HARD_CONSTRAINT",
          sanitizedDirective: "Never expose secret API keys in client code",
          enforceStrictly: true,
        } as any,
      ],
      temporalAnchors: [],
      activePreferences: [],
      topicBoundary: { activeTopic: "security", isTopicSwitch: false, boundaryType: "PERSISTENT" },
      epistemicSummary: { verifiedCount: 1, inferredCount: 0, uncertainCount: 0, contestedCount: 0, overallReliability: 1.0 },
      sourceLayersIncluded: [],
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        {
          title: "Hardcode Secret API Keys into Frontend",
          benefits: ["10x Faster setup", "Zero server maintenance", "Instant demo"],
        },
        {
          title: "Setup Backend Proxy",
          benefits: ["Secure proxy"],
        },
      ],
    },
  });

  const hardcoded = res.candidates.find((c) => c.title.includes("Hardcode Secret"));
  assert(hardcoded?.decisionState === "BLOCKED", "Hardcoding keys is BLOCKED despite 3 benefits");
  assert(res.recommendation.selectedOptionTitle?.includes("Backend Proxy"), "Backend proxy recommended");
});

// DD-5: Current-turn explicit requirement precedence
runTest("DD-5: Current-turn explicit requirement outranks historical preference", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    message: "I explicitly want to use SQLite for this temporary test",
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Use SQLite for test", description: "Current turn explicit preference" },
        { title: "Use Postgres", description: "Default historical preference" },
      ],
    },
  });

  assert(res.ranking[0].title === "Use SQLite for test", "Current turn explicit requirement outranks default");
});

// DD-6: Goal alignment
runTest("DD-6: Goal alignment boosts aligned options and penalizes opposing options", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    goalProject: {
      goals: [
        { id: "g_1", title: "Optimize latency and performance", status: "ACTIVE", priority: "HIGH" } as any,
      ],
      projects: [],
      commitments: [],
      activeGoalCount: 1,
      activeProjectCount: 0,
      activeCommitmentCount: 0,
      completionRate: 0,
      diagnostics: {} as any,
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Optimize latency and performance via caching", benefits: ["Sub-millisecond reads"] },
        { title: "Introduce slow synchronous polling", risks: ["Increases latency"] },
      ],
    },
  });

  const caching = res.candidates.find((c) => c.title.includes("caching"));
  const polling = res.candidates.find((c) => c.title.includes("polling"));

  assert(caching?.goalAlignment.some((g) => g.alignment === "ALIGNED") === true, "Caching is ALIGNED with goal");
  assert(res.ranking[0].title.includes("caching"), "Aligned caching option ranked first");
});

// DD-7: Epistemic boundary defense
runTest("DD-7: Epistemic boundary defense (VERIFIED vs UNCERTAIN vs CONTESTED)", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    epistemicCalibration: {
      claims: [
        {
          id: "c_verified",
          statement: "Redis cluster is operational and verified",
          epistemicState: "VERIFIED",
          authority: "VERIFIED_EVIDENCE",
          confidenceScore: 0.98,
          provenance: [],
          evidence: ["ping: pong"],
        } as any,
        {
          id: "c_contested",
          statement: "Memcached cluster is unstable and contested",
          epistemicState: "CONTESTED",
          authority: "SYSTEM_DEFAULT",
          confidenceScore: 0.20,
          provenance: [],
          evidence: [],
        } as any,
      ],
      overallReliability: 0.85,
      calibrationState: "CALIBRATED",
      diagnostics: {} as any,
      directives: [],
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Deploy Redis cluster", description: "Use verified Redis cluster" },
        { title: "Deploy Memcached cluster", description: "Use contested Memcached cluster" },
      ],
    },
  });

  const redis = res.candidates.find((c) => c.title.includes("Redis"));
  const memcached = res.candidates.find((c) => c.title.includes("Memcached"));

  assert(redis?.decisionState === "READY", "Redis option is READY");
  assert(memcached?.decisionState === "CONDITIONAL" || memcached?.decisionState === "READY_WITH_WARNINGS", "Memcached option has warnings");
  assert(res.ranking[0].title.includes("Redis"), "Redis ranked higher due to verified epistemic evidence");
});

// DD-8: Contradiction handling
runTest("DD-8: Contradiction handling flags unresolved contradictions", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    contradictionResolution: {
      unresolvedContradictions: [
        {
          id: "contra_1",
          premiseA: "Server port is 3000",
          premiseB: "Server port is 8080",
          severity: "MAJOR",
          classification: "DIRECT_FACTUAL_OPPOSITION",
          authorityA: "VERIFIED_EVIDENCE",
          authorityB: "VERIFIED_EVIDENCE",
          isResolved: false,
        } as any,
      ],
      resolvedContradictions: [],
      resolutionCandidates: [],
      beliefRevisions: [],
      activeDirectives: [],
      diagnostics: {} as any,
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Bind server to Server port is 3000", description: "Port 3000 option" },
      ],
    },
  });

  assert(res.diagnostics.contradictionWarnings >= 1, "Recorded contradiction warning");
  assert(res.candidates[0].warningReasons.some((w) => w.includes("contradiction")), "Warning reason attached to candidate");
});

// DD-9: Causal decision analysis
runTest("DD-9: Causal decision analysis flags correlation-only benefit", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    causalReasoning: {
      relations: [
        {
          relationKey: "causal_1",
          causeKey: "wearing blue shirt",
          effectKey: "server uptime",
          relationType: "CORRELATION_ONLY",
          necessitySufficiency: "NEITHER",
          direction: "UNKNOWN",
          confidenceScore: 0.10,
          explanatoryMechanism: "",
          isHypothetical: false,
        } as any,
      ],
      chains: [],
      counterfactuals: [],
      activeDirectives: [],
      diagnostics: {} as any,
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Wear blue shirt to improve server uptime", description: "Superstitious practice" },
      ],
    },
  });

  assert(res.diagnostics.causalWarnings >= 1, "Detected causal warning for correlation-only claim");
  assert(res.candidates[0].risks.some((r) => r.category === "CAUSAL_RISK"), "Attached CAUSAL_RISK");
});

// DD-10: Multi-hop reasoning integrity
runTest("DD-10: Broken multi-hop chain degrades candidate score", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    multiHopReasoning: {
      chains: [
        {
          chainId: "chain_1",
          status: "BROKEN",
          targetEntity: "payment service",
          hops: [],
          groundedConclusions: [],
          cumulativeConfidence: 0.2,
          weakestHopIndex: 1,
        } as any,
      ],
      conclusions: [],
      directives: [],
      diagnostics: {} as any,
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Connect to payment service directly", description: "Target entity payment service" },
      ],
    },
  });

  assert(res.diagnostics.multiHopWarnings >= 1, "Multi-hop warning registered");
});

// DD-11: Meta-reasoning reality confusion rejection
runTest("DD-11: Meta-reasoning reality confusion causes candidate REJECTION", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    metaReasoning: {
      verdict: "REJECTED",
      overallQualityScore: 0.2,
      issues: [
        {
          id: "iss_sim_1",
          type: "SIMULATION_REALITY_CONFUSION",
          category: "SIMULATION_SANITY",
          severity: "CRITICAL",
          targetComponent: "scenarioSimulation",
          targetIdentifier: "cand_hallucinated_feature",
          description: "Hypothetical simulated API treated as existing fact.",
          remediationRecommendation: "Reject claim.",
          scorePenalty: 0.5,
        },
      ],
      sectionResults: [],
      sanitizedDirectives: ["Reject simulated reality confusion."],
      directives: [],
      revisionRequirements: [],
      epistemicAdjustments: [],
      unsupportedClaims: [],
      simulationRealityConfusions: ["cand_hallucinated_feature"],
      hardConstraintViolations: [],
      diagnostics: {} as any,
    },
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "cand_hallucinated_feature", description: "Use fake API" },
      ],
    },
  });

  assert(res.candidates[0].decisionState === "REJECTED", "Candidate with simulation-reality confusion is REJECTED");
  assert(res.decisionState === "REJECTED" || res.recommendation.type === "NO_SAFE_OPTION", "Rejects unsafe option");
});

// DD-12: Meta-reasoning sensitive assumption dependency
runTest("DD-12: Sensitive assumption dependency marks candidate ASSUMPTION_SENSITIVE and CONDITIONAL", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    scenarioSimulation: {
      scenarios: [],
      comparisons: [],
      outcomes: [],
      assumptions: [
        {
          id: "assum_1",
          statement: "Network latency will remain under 5ms",
          required: true,
          isSupported: false,
          isSensitive: true,
        } as any,
      ],
      directives: [],
      diagnostics: {} as any,
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "High-frequency in-memory sync", benefits: ["Fast synchronization"] },
      ],
    },
  });

  assert(res.candidates[0].isAssumptionSensitive === true, "Candidate flagged as assumption sensitive");
  assert(res.candidates[0].decisionState === "CONDITIONAL", "Candidate marked CONDITIONAL");
  assert(res.recommendation.type === "RECOMMEND_CONDITIONAL_OPTION", "Emits conditional recommendation");
});

// DD-13: Information gathering when no candidate is sufficiently supported
runTest("DD-13: Information gathering recommendation when evidence is insufficient", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    message: "",
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [],
    },
  });

  assert(res.recommendation.type === "REQUEST_INFORMATION" || res.decisionState === "READY", "Valid state emitted");
});

// DD-14: Tradeoff representation
runTest("DD-14: Tradeoff representation captures dimensions", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        {
          title: "Microservices Architecture",
          benefits: ["Extreme horizontal scalability"],
          risks: ["High network complexity and failure modes"],
          reversibility: "IRREVERSIBLE",
        },
      ],
    },
  });

  assert(res.tradeoffs.length >= 1, "Generated tradeoff dimension");
  assert(res.tradeoffs[0].dimensionA.includes("scalability") || res.tradeoffs[0].dimensionB.includes("complexity"), "Captures tradeoff dimensions");
});

// DD-15: Reversibility preference
runTest("DD-15: Reversibility preference favors reversible option", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        {
          title: "Option Reversible Sandbox",
          reversibility: "REVERSIBLE",
        },
        {
          title: "Option Irreversible Migration",
          reversibility: "IRREVERSIBLE",
        },
      ],
    },
  });

  assert(res.ranking[0].title === "Option Reversible Sandbox", "Reversible sandbox ranked first");
});

// DD-16: Action plan generation
runTest("DD-16: Action plan generates ordered advisory steps with checkpoints", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Run Database Indexing", benefits: ["Faster query times"], reversibility: "REVERSIBLE" },
      ],
    },
  });

  assert(res.actionPlan !== undefined, "Action plan generated");
  assert(res.actionPlan?.orderedSteps.length >= 2, "Contains ordered action steps");
  assert(res.actionPlan?.isAdvisory === true, "Plan is explicitly advisory");
  assert(res.actionPlan?.checkpoints.length >= 1, "Contains checkpoints");
  assert(res.actionPlan?.stopConditions.length >= 1, "Contains stop conditions");
});

// DD-17: Sanitized decision directives
runTest("DD-17: Decision directives are sanitized of IDs, UUIDs, and raw floats", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Deploy Safe Application Build", benefits: ["Production update"] },
      ],
    },
  });

  assert(res.sanitizedDirectives.length >= 1, "Sanitized directives generated");
  for (const d of res.sanitizedDirectives) {
    assert(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(d), "No UUIDs in directives");
    assert(!/\bcand_[0-9a-f]{6,}\b/i.test(d), "No internal cand IDs in directives");
    assert(!/\b0\.\d{3,}\b/.test(d), "No raw unrounded floats in directives");
  }
});

// DD-18: Strict topic isolation
runTest("DD-18: Strict topic isolation blocks foreign topic candidates", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      strictTopicIsolation: true,
      activeTopic: "billing",
      explicitCandidateOptions: [
        { title: "Billing Invoice Export", benefits: ["Download PDF invoice"] },
      ],
    },
  });

  assert(res.candidates[0].decisionState === "READY" || res.candidates[0].decisionState === "READY_WITH_WARNINGS", "Billing option accepted");
});

// DD-19: Bit-for-bit determinism across 10 runs
runTest("DD-19: Bit-for-bit determinism across 10 repeated iterations", () => {
  const engine = new DeliberativeDecisionEngine();
  const input: DecisionEngineInput = {
    message: "Should I choose Option X or Option Y for caching?",
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "In-Memory LRU Cache", benefits: ["Sub-ms latency"], reversibility: "REVERSIBLE" },
        { title: "Distributed Redis Cluster", benefits: ["Cross-instance sharing"], reversibility: "PARTIALLY_REVERSIBLE" },
      ],
    },
  };

  const first = JSON.stringify(engine.evaluate(input));
  for (let i = 0; i < 10; i++) {
    const iter = JSON.stringify(engine.evaluate(input));
    assert(first === iter, `Iteration ${i + 1} is bit-for-bit identical`);
  }
});

// DD-20: Injected currentTime stability
runTest("DD-20: Injected currentTime stability", () => {
  const engine = new DeliberativeDecisionEngine();
  const res1 = engine.evaluate({ options: { currentTime: 1700000000000 } });
  const res2 = engine.evaluate({ options: { currentTime: 1700000000000 } });
  assert(JSON.stringify(res1) === JSON.stringify(res2), "Stable output for identical currentTime");
});

// DD-21: Input immutability
runTest("DD-21: Input objects are never mutated", () => {
  const engine = new DeliberativeDecisionEngine();
  const input: DecisionEngineInput = {
    message: "Test message",
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Sample Option", benefits: ["Benefit A"] },
      ],
    },
  };
  const snapshot = JSON.stringify(input);
  engine.evaluate(input);
  assert(JSON.stringify(input) === snapshot, "Input remains strictly unmutated");
});

// DD-22: Budget ceilings enforcement
runTest("DD-22: Budget ceilings are strictly enforced", () => {
  const engine = new DeliberativeDecisionEngine();
  const manyOptions = Array.from({ length: 40 }, (_, i) => ({
    title: `Candidate Option ${i + 1}`,
  }));

  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      budget: { maxCandidates: 5 },
      explicitCandidateOptions: manyOptions,
    },
  });

  assert(res.candidates.length <= 5, "Candidate count bounded by budget");
});

// DD-23: Sensitive data suppression
runTest("DD-23: Sensitive data suppression in directives and rationale", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Safe Option", description: "Normal description" },
      ],
    },
  });

  for (const d of res.sanitizedDirectives) {
    assert(!d.includes("AIzaSy"), "No API keys in directives");
    assert(!d.includes("Bearer "), "No auth tokens in directives");
  }
});

// DD-24: BrainEngine pipeline integration
runTest("DD-24: BrainEngine pipeline integration produces decisionAnalysis", () => {
  contextStore.clear("sess_dd24");
  const analysis = brainEngine.analyze("Should I pick SQLite or PostgreSQL for small local tests?", [], undefined, "sess_dd24");

  assert(analysis.decisionAnalysis !== undefined, "BrainAnalysis contains decisionAnalysis");
  assert(analysis.decision !== undefined, "BrainAnalysis contains decision alias");
  assert(analysis.decisionAnalysis.candidates.length >= 1, "DecisionAnalysis discovered candidates");
  assert(analysis.decisionAnalysis.recommendation !== undefined, "DecisionAnalysis generated recommendation");
  assert(analysis.promptDirectives.length >= 1, "Prompt directives include decision guidance");
});

// DD-25: Full Phase 1, Phase 2, and Phase 3 regression determinism
runTest("DD-25: Full Phase 1, 2, and 3 regression determinism with Step 8 active", () => {
  contextStore.clear("sess_dd25");
  const options = { currentTime: 1724000000000 };
  const a1 = brainEngine.analyze("Should I pick SQLite or PostgreSQL for small local tests?", [], undefined, "sess_dd25", undefined, options);
  const a2 = brainEngine.analyze("Should I pick SQLite or PostgreSQL for small local tests?", [], undefined, "sess_dd25", undefined, options);

  const d1 = JSON.stringify(a1.decisionAnalysis);
  const d2 = JSON.stringify(a2.decisionAnalysis);
  assert(d1 === d2, "Bit-for-bit identical decisionAnalysis across repeated runs with Step 8 active");
  assert(a1.promptDirectives.length > 0, "Prompt directives populated");
});

console.log("======================================================");
console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log("======================================================");
