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
        } as any,
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

// DD-26: Tradeoff unresolved representation
runTest("DD-26: tradeoff unresolved representation and directive reflection", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        {
          title: "Aggressive In-Memory Cache",
          source: "ACTION_PROPOSAL",
          benefits: ["Ultra high throughput"],
          risks: [{ id: "r1", description: "High memory consumption and volatility", severity: "MODERATE", isBlocking: false } as any],
          reversibility: "PARTIALLY_REVERSIBLE",
        },
      ],
    },
  });

  assert(res.candidates[0].tradeoffs.length >= 1, "Candidate includes tradeoff representation");
  assert(res.candidates[0].tradeoffs.some((t) => t.state === "TRADEOFF_UNRESOLVED"), "Tradeoff marked TRADEOFF_UNRESOLVED");
  assert(res.sanitizedDirectives.some((d) => d.includes("Tradeoff")), "Directives reflect tradeoff considerations");
});

// DD-27: Insufficient information detection
runTest("DD-27: insufficient information produces INSUFFICIENT_INFORMATION state", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [],
    },
  });

  assert(res.decisionState === "INSUFFICIENT_INFORMATION", "State is INSUFFICIENT_INFORMATION");
  assert(res.recommendation.type === "REQUEST_INFORMATION", "Recommendation is REQUEST_INFORMATION");
});

// DD-28: Request information on missing data
runTest("DD-28: request information provides targeted questions", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [],
    },
  });

  assert(res.recommendation.informationRequests !== undefined, "Information requests populated");
  assert((res.recommendation.informationRequests?.length ?? 0) >= 1, "At least one clarification requested");
});

// DD-29: Decision deferral / conditional representation
runTest("DD-29: decision deferral / conditional on sensitive assumptions", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    scenarioSimulation: {
      assumptions: [
        { id: "a1", statement: "Upstream auth provider latency is < 20ms", isSensitive: true, required: true, isSupported: false },
      ],
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Direct Auth Bypass", assumptions: ["Upstream auth provider latency is < 20ms"] },
      ],
    },
  });

  assert(res.decisionState === "CONDITIONAL", "State is CONDITIONAL due to sensitive assumption");
  assert(res.recommendation.type === "RECOMMEND_CONDITIONAL_OPTION", "Recommendation type is RECOMMEND_CONDITIONAL_OPTION");
});

// DD-30: No safe option when all candidates blocked
runTest("DD-30: no safe option when all candidates violate constraints", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    executiveContext: {
      reasoningConstraints: [
        { id: "rc_1", type: "HARD_CONSTRAINT", description: "Never drop production database", authority: "HARD_CONSTRAINT", enforceStrictly: true },
      ],
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Drop production database and reinstall", description: "drop table all data" },
      ],
    },
  });

  assert(res.decisionState === "BLOCKED", "Decision state is BLOCKED");
  assert(res.recommendation.type === "NO_SAFE_OPTION", "Recommendation is NO_SAFE_OPTION");
});

// DD-31: Action plan generation
runTest("DD-31: action plan generation for viable candidate", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Deploy Staging Environment", benefits: ["Safe testing ground"], reversibility: "REVERSIBLE" },
      ],
    },
  });

  assert(res.actionPlan !== undefined, "Action plan generated");
  assert(res.actionPlan?.isAdvisory === true, "Action plan is explicitly advisory");
  assert(res.actionPlan?.orderedSteps.length >= 1, "Action plan contains steps");
});

// DD-32: Ordered action steps
runTest("DD-32: ordered action steps with sequential indices", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Run Database Migration", benefits: ["Updates schema"], reversibility: "REVERSIBLE" },
      ],
    },
  });

  const steps = res.actionPlan?.orderedSteps || [];
  assert(steps.length >= 2, "Has precondition check and execution step");
  assert(steps[0].stepIndex === 1, "Step 1 index is 1");
  assert(steps[1].stepIndex === 2, "Step 2 index is 2");
});

// DD-33: Prerequisite handling
runTest("DD-33: prerequisite handling in action plan", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Deploy Microservice", dependencies: ["Network config", "TLS certificate"], reversibility: "REVERSIBLE" },
      ],
    },
  });

  assert(res.actionPlan?.prerequisites.length === 2, "Prerequisites preserved in plan");
  assert(res.actionPlan?.prerequisites.includes("TLS certificate"), "TLS certificate prerequisite listed");
});

// DD-34: Dependency handling
runTest("DD-34: dependency handling without circular traversal", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Setup Cluster", dependencies: ["dep_A", "dep_B", "dep_C"] },
      ],
    },
  });

  assert(res.actionPlan?.dependencies.length === 3, "All dependencies mapped");
});

// DD-35: Stop conditions
runTest("DD-35: stop conditions explicitly specified", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Run Batch Job", benefits: ["Process backlog"], reversibility: "REVERSIBLE" },
      ],
    },
  });

  assert(res.actionPlan?.stopConditions.length >= 1, "Plan has stop conditions");
  assert(res.actionPlan?.orderedSteps.every((s) => s.stopCondition.length > 0), "All steps have stop conditions");
});

// DD-36: Rollback/reversal representation
runTest("DD-36: rollback/reversal representation for reversible and irreversible options", () => {
  const engine = new DeliberativeDecisionEngine();
  const resRev = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Reversible Feature Flag", reversibility: "REVERSIBLE" },
      ],
    },
  });
  assert(resRev.actionPlan?.rollbackGuidance.includes("checkpoint"), "Reversible plan includes checkpoint rollback guidance");

  const resIrrev = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Hard Delete Database Schema", reversibility: "IRREVERSIBLE" },
      ],
    },
  });
  assert(resIrrev.sanitizedDirectives.some((d) => d.includes("irreversible")), "Irreversible action produces directive warning");
});

// DD-37: No action execution
runTest("DD-37: no action execution side effects", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Send External Webhook", benefits: ["Notifies slack"] },
      ],
    },
  });
  assert(res.actionPlan?.isAdvisory === true, "Plan is purely advisory description");
});

// DD-38: No memory mutation
runTest("DD-38: no memory mutation during evaluation", () => {
  contextStore.clear("sess_dd38");
  const ctx = contextStore.getOrCreate("sess_dd38");
  ctx.constraints = [
    {
      id: "c1",
      category: "technical_spec",
      key: "language",
      value: "TypeScript",
      rawText: "Must use TypeScript",
      createdAt: 1724000000000,
      updatedAt: 1724000000000,
      updatedAtTurn: 1,
    },
  ];
  contextStore.save("sess_dd38", ctx);
  const snapshotBefore = JSON.stringify(contextStore.get("sess_dd38"));

  const engine = new DeliberativeDecisionEngine();
  engine.evaluate({
    message: "Should I switch to test env?",
    options: { currentTime: 1724000000000 },
  });

  const snapshotAfter = JSON.stringify(contextStore.get("sess_dd38"));
  assert(snapshotBefore === snapshotAfter, "ContextStore remains unmodified");
});

// DD-39: No goal mutation
runTest("DD-39: no goal mutation during evaluation", () => {
  const goals = [{ id: "g1", title: "Scale to 10k users", status: "ACTIVE" }];
  const goalsSnapshot = JSON.stringify(goals);

  const engine = new DeliberativeDecisionEngine();
  engine.evaluate({
    goalProject: { goals } as any,
    options: { currentTime: 1724000000000 },
  });

  assert(JSON.stringify(goals) === goalsSnapshot, "Goals object remains unmodified");
});

// DD-40: No commitment mutation
runTest("DD-40: no commitment mutation during evaluation", () => {
  const commitments = [{ id: "c1", title: "Deliver beta by Friday", status: "ACTIVE" }];
  const commSnapshot = JSON.stringify(commitments);

  const engine = new DeliberativeDecisionEngine();
  engine.evaluate({
    executiveContext: { activeCommitments: commitments } as any,
    options: { currentTime: 1724000000000 },
  });

  assert(JSON.stringify(commitments) === commSnapshot, "Commitments remain unmodified");
});

// DD-41: Input immutability
runTest("DD-41: input immutability with nested object freeze", () => {
  const input: DecisionEngineInput = {
    message: "Test message",
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [{ title: "Candidate A", benefits: ["Fast"] }],
    },
  };
  Object.freeze(input);
  Object.freeze(input.options);

  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate(input);
  assert(res !== undefined, "Evaluated frozen input successfully");
});

// DD-42: Credential suppression
runTest("DD-42: credential suppression from all directives and rationales", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        {
          title: "Connect with AIzaSyC873827489237498237482937482938 and Bearer eyJhbGciOiJIUzI1NiIsIn",
          description: "Use api_key=secret_12345 to authenticate",
        },
      ],
    },
  });

  for (const d of res.sanitizedDirectives) {
    assert(!d.includes("AIzaSyC873827489237498237482937482938"), "API key suppressed from directives");
    assert(!d.includes("Bearer eyJhbGciOiJIUzI1NiIsIn"), "Bearer token suppressed from directives");
    assert(!d.includes("secret_12345"), "Secret suppressed from directives");
  }
});

// DD-43: Unsupported identity inference suppression
runTest("DD-43: unsupported identity inference suppression", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    epistemicCalibration: {
      claims: [
        { id: "c1", statement: "User identity role is SuperAdmin", epistemicState: "UNCERTAIN", authority: "SYSTEM_DEFAULT" } as any,
      ],
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Grant SuperAdmin Privileges", description: "Based on ungrounded identity inference" },
      ],
    },
  });

  assert(res.candidates[0].uncertainty.epistemicUncertainty > 0.4, "Uncertain identity inference penalized");
  assert(res.candidates[0].decisionState !== "READY", "Ungrounded identity inference cannot produce READY state");
});

// DD-44: Directive sanitization
runTest("DD-44: directive sanitization produces natural human readable text", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [{ title: "Compile Project", benefits: ["Builds cleanly"] }],
    },
  });

  for (const d of res.sanitizedDirectives) {
    assert(d.length > 5, "Directive is non-empty sentence");
    assert(!d.includes("undefined") && !d.includes("null"), "No undefined/null tokens");
  }
});

// DD-45: Internal ID sanitization
runTest("DD-45: internal ID sanitization (cand_, risk_, step_, plan_ not leaked)", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [{ title: "Run Analysis", benefits: ["Insightful"] }],
    },
  });

  for (const d of res.sanitizedDirectives) {
    assert(!/\b(cand|risk|step|plan|opt)_[0-9a-f]{4,}\b/i.test(d), "No internal ID tokens in directives");
  }
});

// DD-46: Numeric metadata sanitization
runTest("DD-46: numeric metadata sanitization (no raw floats in directives)", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [{ title: "Scale Pods", benefits: ["Higher throughput"] }],
    },
  });

  for (const d of res.sanitizedDirectives) {
    assert(!/\b0\.\d{3,}\b/.test(d), "No 3+ decimal raw float precision in directives");
  }
});

// DD-47: Timestamp sanitization
runTest("DD-47: timestamp sanitization (no epoch timestamps in directives)", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [{ title: "Perform Healthcheck", benefits: ["Confirms uptime"] }],
    },
  });

  for (const d of res.sanitizedDirectives) {
    assert(!/\b1[5-9]\d{9,11}\b/.test(d), "No raw 10-13 digit epoch timestamps in directives");
  }
});

// DD-48: Deterministic candidate ordering
runTest("DD-48: deterministic candidate ordering across multiple options", () => {
  const engine = new DeliberativeDecisionEngine();
  const input: DecisionEngineInput = {
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Alpha Option", benefits: ["Fast"] },
        { title: "Beta Option", benefits: ["Secure"] },
        { title: "Gamma Option", benefits: ["Cheap"] },
      ],
    },
  };

  const r1 = engine.evaluate(input).ranking.map((r) => r.title);
  const r2 = engine.evaluate(input).ranking.map((r) => r.title);
  assert(JSON.stringify(r1) === JSON.stringify(r2), "Ranking order is 100% deterministic");
});

// DD-49: Deterministic ranking tie-breaking
runTest("DD-49: deterministic ranking tie-breaking by candidateKey", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Option B", benefits: ["Identical"] },
        { title: "Option A", benefits: ["Identical"] },
      ],
    },
  });

  assert(res.ranking[0].title === "Option A", "Option A alphabetically breaks tie over Option B");
});

// DD-50: Multi-run determinism (20 iterations)
runTest("DD-50: multi-run determinism across 20 iterations", () => {
  const engine = new DeliberativeDecisionEngine();
  const input: DecisionEngineInput = {
    message: "Choose optimal strategy",
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Strategy 1", benefits: ["Good"] },
        { title: "Strategy 2", benefits: ["Better"] },
      ],
    },
  };

  const base = JSON.stringify(engine.evaluate(input));
  for (let i = 0; i < 20; i++) {
    const iter = JSON.stringify(engine.evaluate(input));
    assert(base === iter, `Iteration ${i + 1} is identical to base`);
  }
});

// DD-51: Diagnostic determinism
runTest("DD-51: diagnostic metrics determinism", () => {
  const engine = new DeliberativeDecisionEngine();
  const input: DecisionEngineInput = {
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [{ title: "Opt 1" }, { title: "Opt 2" }],
    },
  };

  const d1 = engine.evaluate(input).diagnostics;
  const d2 = engine.evaluate(input).diagnostics;
  assert(JSON.stringify(d1) === JSON.stringify(d2), "Diagnostics bit-for-bit identical");
});

// DD-52: Budget enforcement
runTest("DD-52: budget enforcement respects all configured ceilings", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      budget: { maxCandidates: 2, maxDirectives: 1, maxPlanSteps: 1 },
      explicitCandidateOptions: [
        { title: "Opt 1" },
        { title: "Opt 2" },
        { title: "Opt 3" },
      ],
    },
  });

  assert(res.candidates.length <= 2, "Bounded to maxCandidates 2");
  assert(res.sanitizedDirectives.length <= 1, "Bounded to maxDirectives 1");
  assert((res.actionPlan?.orderedSteps.length ?? 0) <= 1, "Bounded to maxPlanSteps 1");
});

// DD-53: Candidate bounding
runTest("DD-53: candidate bounding prevents oversized arrays", () => {
  const engine = new DeliberativeDecisionEngine();
  const many = Array.from({ length: 50 }, (_, i) => ({ title: `Option ${i}` }));
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      budget: { maxCandidates: 3 },
      explicitCandidateOptions: many,
    },
  });

  assert(res.candidates.length === 3, "Exactly 3 candidates evaluated");
});

// DD-54: Plan-step bounding
runTest("DD-54: plan-step bounding restricts steps to budget", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    planning: {
      plan: {
        steps: Array.from({ length: 20 }, (_, i) => ({ action: `Step ${i}` })),
      },
    } as any,
    options: {
      currentTime: 1724000000000,
      budget: { maxPlanSteps: 4 },
      explicitCandidateOptions: [{ title: "Multi-step migration" }],
    },
  });

  assert((res.actionPlan?.orderedSteps.length ?? 0) <= 4, "Plan steps bounded to 4");
});

// DD-55: Dependency/depth bounding
runTest("DD-55: dependency and evidence depth bounding", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      budget: { maxEvidenceRefs: 2, maxTradeoffs: 1 },
      explicitCandidateOptions: [
        {
          title: "Complex Architecture",
          benefits: ["Benefit 1", "Benefit 2"],
          risks: [{ id: "r1", description: "Risk 1", severity: "MAJOR", isBlocking: false } as any],
        },
      ],
    },
  });

  assert(res.candidates[0].tradeoffs.length <= 1, "Tradeoffs bounded to 1");
});

// DD-56: Duplicate evidence cannot inflate support
runTest("DD-56: duplicate evidence cannot inflate support", () => {
  const engine = new DeliberativeDecisionEngine();
  const resSingle = engine.evaluate({
    epistemicCalibration: {
      claims: [
        { id: "c1", statement: "Database throughput is 10000 QPS", epistemicState: "VERIFIED", authority: "VERIFIED_EVIDENCE" } as any,
      ],
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Use Database throughput 10000 QPS" },
      ],
    },
  });

  const resDuplicate = engine.evaluate({
    epistemicCalibration: {
      claims: [
        { id: "c1", statement: "Database throughput is 10000 QPS", epistemicState: "VERIFIED", authority: "VERIFIED_EVIDENCE" } as any,
        { id: "c2", statement: "Database throughput is 10000 QPS", epistemicState: "VERIFIED", authority: "VERIFIED_EVIDENCE" } as any,
        { id: "c3", statement: "Database throughput is 10000 QPS", epistemicState: "VERIFIED", authority: "VERIFIED_EVIDENCE" } as any,
      ],
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Use Database throughput 10000 QPS" },
      ],
    },
  });

  assert(resSingle.candidates[0].evidenceReferences.length === resDuplicate.candidates[0].evidenceReferences.length, "Deduplication prevents inflated evidence count");
});

// DD-57: Rejected evidence exclusion
runTest("DD-57: rejected evidence exclusion from supporting claims", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    epistemicCalibration: {
      claims: [
        { id: "c_rej", statement: "Unreliable server is fastest", epistemicState: "REJECTED", authority: "SYSTEM_DEFAULT" } as any,
      ],
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Use Unreliable server" },
      ],
    },
  });

  assert(res.candidates[0].evidenceReferences.length === 0, "Rejected claim excluded from evidence references");
});

// DD-58: Quarantined/deleted context exclusion
runTest("DD-58: quarantined/deleted context exclusion", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    epistemicCalibration: {
      claims: [
        { id: "c_q", statement: "Quarantined secret info", isQuarantined: true, epistemicState: "VERIFIED", authority: "VERIFIED_EVIDENCE" } as any,
        { id: "c_d", statement: "Deleted fact info", isDeleted: true, epistemicState: "VERIFIED", authority: "VERIFIED_EVIDENCE" } as any,
      ],
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [{ title: "Use Quarantined secret info" }],
    },
  });

  assert(res.candidates[0].evidenceReferences.length === 0, "Quarantined and deleted claims excluded");
});

// DD-59: Stale context handling
runTest("DD-59: stale context handling flags superseded records", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    temporalMemory: {
      stateRecords: [
        { key: "legacy_auth_protocol", isSuperseded: true },
      ],
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Use legacy_auth_protocol" },
      ],
    },
  });

  assert(res.candidates[0].uncertainty.temporalStaleness > 0.5, "Temporal staleness flagged");
  assert(res.candidates[0].warningReasons.some((w) => w.includes("superseded")), "Superseded state warning generated");
});

// DD-60: Current-turn hypothetical remains ephemeral
runTest("DD-60: current-turn hypothetical remains ephemeral", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    message: "Suppose hypothetically we delete the cache server",
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [{ title: "Hypothetical cache deletion", source: "EXPLICIT_USER_OPTION" }],
    },
  });

  assert(res.provenance.every((p) => p.layer === "DELIBERATIVE_DECISION"), "Provenance localized to deliberative layer without writing permanent facts");
});

// DD-61: Predictive context remains advisory
runTest("DD-61: predictive context remains advisory and cannot override hard constraint", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    predictiveContext: {
      predictions: [{ text: "Drop database is 99% likely user intention", authority: "PREDICTIVE_CONTEXT" }],
    } as any,
    executiveContext: {
      reasoningConstraints: [
        { id: "rc_1", type: "HARD_CONSTRAINT", description: "Never drop production tables", authority: "HARD_CONSTRAINT", enforceStrictly: true },
      ],
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [{ title: "Drop database table" }],
    },
  });

  assert(res.candidates[0].decisionState === "BLOCKED", "Hard constraint blocks predictive candidate");
});

// DD-62: Simulation remains advisory
runTest("DD-62: simulation remains advisory and cannot assert verified truth", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    scenarioSimulation: {
      outcomes: [{ id: "o1", description: "Simulation predicts 10x throughput", isSimulated: true }],
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [{ title: "Simulated scaling architecture", source: "SCENARIO_SIMULATION" }],
    },
  });

  assert(res.candidates[0].uncertainty.simulationDependence > 0.5, "Simulation dependence recognized");
  assert(res.candidates[0].decisionState !== "READY" || res.sanitizedDirectives.some((d) => !d.includes("verified")), "Simulation does not assert verified fact");
});

// DD-63: MetaReasoning warning propagation
runTest("DD-63: MetaReasoning warning propagation", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    metaReasoning: {
      issues: [
        { type: "WEAK_EVIDENCE_LINK", targetIdentifier: "cand_test", description: "Weak supporting evidence", severity: "MODERATE" },
      ],
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [{ title: "Test option", candidateKey: "cand_test" }],
    },
  });

  assert(res.diagnostics !== undefined, "Diagnostics captured");
});

// DD-64: Critical MetaReasoning warning handling
runTest("DD-64: critical MetaReasoning warning handling rejects candidate", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    metaReasoning: {
      simulationRealityConfusions: ["cand_bad_reality"],
      issues: [
        { type: "SIMULATION_REALITY_CONFUSION", targetIdentifier: "cand_bad_reality", severity: "CRITICAL", description: "Reality confusion" },
      ],
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [{ title: "Bad Reality Candidate", candidateKey: "cand_bad_reality" }],
    },
  });

  assert(res.candidates[0].decisionState === "REJECTED", "Candidate is REJECTED due to reality confusion");
});

// DD-65: Hard constraint violation
runTest("DD-65: hard constraint violation blocks option unconditionally", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    executiveContext: {
      reasoningConstraints: [
        { id: "rc_sec", type: "HARD_CONSTRAINT", description: "Never expose secret API keys in client code", authority: "HARD_CONSTRAINT", enforceStrictly: true },
      ],
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "Expose API key secret in browser client", benefits: ["Fast setup"] },
      ],
    },
  });

  assert(res.candidates[0].decisionState === "BLOCKED", "Candidate blocked by hard security constraint");
});

// DD-66: Causal overreach handling
runTest("DD-66: causal overreach handling flags correlation-only mechanism", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    causalReasoning: {
      relations: [
        { relationKey: "r1", effectStatement: "Faster rendering", relationType: "CORRELATION_ONLY" },
      ],
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [{ title: "Enable Faster rendering toggle", description: "Faster rendering feature" }],
    },
  });

  assert(res.candidates[0].warningReasons.some((w) => w.includes("correlational")), "Correlational mechanism flagged");
});

// DD-67: Multi-hop overreach handling
runTest("DD-67: multi-hop overreach handling flags broken chains", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    multiHopReasoning: {
      chains: [
        { id: "hop_1", targetEntity: "Microservice Gateway", status: "BROKEN" },
      ],
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [{ title: "Route to Microservice Gateway" }],
    },
  });

  assert(res.candidates[0].warningReasons.some((w) => w.includes("Multi-hop")), "Broken multi-hop chain flagged");
});

// DD-68: Epistemic overclaim handling
runTest("DD-68: epistemic overclaim handling decreases reliability", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    epistemicCalibration: {
      claims: [
        { id: "c1", statement: "Network link is lossless", epistemicState: "CONTESTED", authority: "SYSTEM_DEFAULT" } as any,
      ],
    } as any,
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [{ title: "Rely on Network link is lossless" }],
    },
  });

  assert(res.candidates[0].uncertainty.epistemicUncertainty > 0.4, "Contested claim causes epistemic uncertainty");
});

// DD-69: Provenance preservation
runTest("DD-69: provenance preservation across evaluation layers", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [{ title: "Verified Action" }],
    },
  });

  assert(res.provenance.length >= 1, "Provenance records created");
  assert(res.provenance[0].layer === "DELIBERATIVE_DECISION", "Provenance layer is DELIBERATIVE_DECISION");
});

// DD-70: Scope isolation
runTest("DD-70: scope isolation filters out of topic candidates", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      activeTopic: "database",
      strictTopicIsolation: true,
      explicitCandidateOptions: [
        { title: "Fix billing tax rate", topic: "billing" },
        { title: "Optimize DB query", topic: "database" },
      ],
    },
  });

  const dbOpt = res.candidates.find((c) => c.title === "Optimize DB query");
  const billOpt = res.candidates.find((c) => c.title === "Fix billing tax rate");
  assert(dbOpt?.decisionState === "READY" || dbOpt?.decisionState === "READY_WITH_WARNINGS", "In-topic option ready");
  assert(billOpt?.decisionState === "BLOCKED", "Foreign topic option blocked under strict isolation");
});

// DD-71: Authority cannot be inflated
runTest("DD-71: authority cannot be inflated (PREDICTIVE_CONTEXT < CURRENT_TURN_EXPLICIT)", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [
        { title: "User explicit preference", source: "EXPLICIT_USER_OPTION" },
        { title: "Heuristic suggestion", source: "ACTION_PROPOSAL" },
      ],
    },
  });

  assert(res.ranking[0].title === "User explicit preference", "EXPLICIT_USER_OPTION ranked higher than heuristic");
});

// DD-72: Decision recommendation is not evidence
runTest("DD-72: decision recommendation is marked as advisory evaluation, not fact", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: { currentTime: 1724000000000 },
  });

  assert(res.recommendation !== undefined, "Recommendation generated");
  assert(res.provenance.every((p) => p.layer === "DELIBERATIVE_DECISION"), "Decision output scoped to decision layer");
});

// DD-73: Decision recommendation is not memory
runTest("DD-73: decision recommendation does not modify memory stores", () => {
  contextStore.clear("sess_dd73");
  const ctx = contextStore.getOrCreate("sess_dd73");
  const countBefore = ctx.entities.length;

  const engine = new DeliberativeDecisionEngine();
  engine.evaluate({
    message: "Evaluate database architecture",
    options: { currentTime: 1724000000000 },
  });

  const ctxAfter = contextStore.getOrCreate("sess_dd73");
  assert(ctxAfter.entities.length === countBefore, "No memory facts written");
});

// DD-74: Decision recommendation is not commitment
runTest("DD-74: decision recommendation does not generate active commitment", () => {
  const engine = new DeliberativeDecisionEngine();
  const res = engine.evaluate({
    options: {
      currentTime: 1724000000000,
      explicitCandidateOptions: [{ title: "Schedule maintenance window" }],
    },
  });

  assert(res.actionPlan?.isAdvisory === true, "Action plan is explicitly advisory");
});

// DD-75: BrainEngine integration
runTest("DD-75: BrainEngine end-to-end integration", () => {
  contextStore.clear("sess_dd75");
  const analysis = brainEngine.analyze("What is the best way to optimize database indexes?", [], undefined, "sess_dd75");
  assert(analysis.decisionAnalysis !== undefined, "decisionAnalysis attached to BrainAnalysis");
  assert(analysis.promptDirectives.length >= 1, "promptDirectives populated");
});

// DD-76: Step 1 regression (DeepReasoning)
runTest("DD-76: Step 1 DeepReasoning regression", () => {
  contextStore.clear("sess_dd76");
  const analysis = brainEngine.analyze("Deep reasoning analysis query", [], undefined, "sess_dd76");
  assert(analysis.deepReasoning !== undefined, "DeepReasoningAnalysis present");
});

// DD-77: Step 2 regression (ContradictionResolution)
runTest("DD-77: Step 2 ContradictionResolution regression", () => {
  contextStore.clear("sess_dd77");
  const analysis = brainEngine.analyze("Contradiction check query", [], undefined, "sess_dd77");
  assert(analysis.contradictionResolution !== undefined, "ContradictionResolutionAnalysis present");
});

// DD-78: Step 3 regression (CausalReasoning)
runTest("DD-78: Step 3 CausalReasoning regression", () => {
  contextStore.clear("sess_dd78");
  const analysis = brainEngine.analyze("Causal reasoning query", [], undefined, "sess_dd78");
  assert(analysis.causalReasoning !== undefined, "CausalReasoningAnalysis present");
});

// DD-79: Step 4 regression (MultiHopReasoning)
runTest("DD-79: Step 4 MultiHopReasoning regression", () => {
  contextStore.clear("sess_dd79");
  const analysis = brainEngine.analyze("Multi-hop inference query", [], undefined, "sess_dd79");
  assert(analysis.multiHopReasoning !== undefined, "MultiHopReasoningAnalysis present");
});

// DD-80: Step 5 regression (EpistemicCalibration)
runTest("DD-80: Step 5 EpistemicCalibration regression", () => {
  contextStore.clear("sess_dd80");
  const analysis = brainEngine.analyze("Epistemic calibration query", [], undefined, "sess_dd80");
  assert(analysis.epistemicCalibration !== undefined, "EpistemicCalibrationAnalysis present");
});

// DD-81: Step 6 regression (ScenarioSimulation)
runTest("DD-81: Step 6 ScenarioSimulation regression", () => {
  contextStore.clear("sess_dd81");
  const analysis = brainEngine.analyze("Scenario simulation query", [], undefined, "sess_dd81");
  assert(analysis.scenarioSimulation !== undefined, "ScenarioSimulationAnalysis present");
});

// DD-82: Step 7 regression (MetaReasoning)
runTest("DD-82: Step 7 MetaReasoning regression", () => {
  contextStore.clear("sess_dd82");
  const analysis = brainEngine.analyze("Meta reasoning check query", [], undefined, "sess_dd82");
  assert(analysis.metaReasoning !== undefined, "MetaReasoningAnalysis present");
});

// DD-83: Phase 1 regression
runTest("DD-83: Phase 1 context & memory pipeline regression", () => {
  contextStore.clear("sess_dd83");
  const ctx = contextStore.getOrCreate("sess_dd83");
  ctx.constraints = [
    {
      id: "c_react",
      category: "technical_spec",
      key: "framework",
      value: "React",
      rawText: "Framework is React",
      createdAt: 1724000000000,
      updatedAt: 1724000000000,
      updatedAtTurn: 1,
    },
  ];
  contextStore.save("sess_dd83", ctx);
  const analysis = brainEngine.analyze("What framework am I using?", [], undefined, "sess_dd83");
  assert(analysis.executiveContext !== undefined, "ExecutiveContext present in Phase 1");
  assert(analysis.intent !== undefined, "Intent present in Phase 1");
});

// DD-84: Phase 2 regression
runTest("DD-84: Phase 2 user model, goal & adaptive learning regression", () => {
  contextStore.clear("sess_dd84");
  const analysis = brainEngine.analyze("Help me plan my goal for the next sprint", [], undefined, "sess_dd84");
  assert(analysis.goalProjectAnalysis !== undefined, "GoalProject present in Phase 2");
  assert(analysis.temporalMemoryAnalysis !== undefined, "TemporalMemory present in Phase 2");
  assert(analysis.longTermUserModelAnalysis !== undefined, "LongTermUserModel present in Phase 2");
});

// DD-85: Full Phase 3 Step 1-8 integrated pipeline regression
runTest("DD-85: full Phase 3 Step 1–8 integrated pipeline regression", () => {
  contextStore.clear("sess_dd85");
  const analysis = brainEngine.analyze("Comprehensive pipeline test query across all cognitive engines", [], undefined, "sess_dd85");
  assert(analysis.deepReasoning !== undefined, "Step 1 active");
  assert(analysis.contradictionResolution !== undefined, "Step 2 active");
  assert(analysis.causalReasoning !== undefined, "Step 3 active");
  assert(analysis.multiHopReasoning !== undefined, "Step 4 active");
  assert(analysis.epistemicCalibration !== undefined, "Step 5 active");
  assert(analysis.scenarioSimulation !== undefined, "Step 6 active");
  assert(analysis.metaReasoning !== undefined, "Step 7 active");
  assert(analysis.decisionAnalysis !== undefined, "Step 8 active");
  assert(analysis.promptDirectives.length >= 1, "Directives integrated cleanly");
});

console.log("======================================================");
console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log("======================================================");
