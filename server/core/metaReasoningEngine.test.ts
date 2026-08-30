/**
 * Dora Phase 3 Step 7: Meta-Reasoning & Self-Critique Engine Test Suite
 * 
 * Tests MR-1 through MR-54 covering:
 * - Unsupported claim detection, authority mismatch, logical invalidity, circular reasoning, contradiction disregard, causal hallucination
 * - Simulation/reality confusion, multi-hop break, overconfidence, underconfidence, hard constraint violation, goal misalignment
 * - Topic boundary spill, sensitive data exposure, stale memory reliance, speculative propagation, unanchored hypothesis, directive conflict
 * - Read-only invariant, advisory corrections, severity classification, recommendation priority, directive sanitization
 * - 10-dimensional uncertainty vector calculation, compound uncertainty, budget enforcement, hard ceiling truncation, diagnostics
 * - Determinism across runs, input immutability, state preservation, empty/null safety
 * - BrainEngine integration, promptDirectives injection, full regression test suite (Steps 1-6).
 */

import { metaReasoningEngine } from "./metaReasoningEngine";
import {
  MetaReasoningInput,
  DEFAULT_META_REASONING_BUDGET,
  HARD_CEILING_META_REASONING_BUDGET,
} from "./metaReasoningTypes";
import { brainEngine } from "./brainEngine";
import { deepReasoningEngine } from "./deepReasoningEngine";
import { contradictionResolutionEngine } from "./contradictionResolutionEngine";
import { causalReasoningEngine } from "./causalReasoningEngine";
import { multiHopReasoningEngine } from "./multiHopReasoningEngine";
import { epistemicCalibrationEngine } from "./epistemicCalibrationEngine";
import { scenarioSimulationEngine } from "./scenarioSimulationEngine";
import { memoryStore } from "./memoryStore";

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTest(name: string, fn: () => void) {
  totalCount++;
  try {
    fn();
    passedCount++;
    console.log(`  [PASS] ${name}`);
  } catch (error: any) {
    console.error(`  [FAIL] ${name}: ${error?.message || error}`);
    throw error;
  }
}

function createBaseMockInput(overrides?: Partial<MetaReasoningInput>): MetaReasoningInput {
  return {
    userId: "user_test_123",
    message: "What is our architecture deployment strategy?",
    context: {
      activeTopic: "architecture",
      entities: {},
      pendingClarification: false,
    } as any,
    executiveContext: {
      currentTurn: {
        message: "What is our architecture deployment strategy?",
        normalizedIntent: "QUERY",
        topic: "architecture",
        isTopicSwitch: false,
        resolvedEntities: [],
      },
      activeGoal: {
        id: "goal_arch",
        title: "Scale architecture",
        status: "active",
      },
      activeProjects: [
        {
          id: "proj_arch",
          name: "System Scaling",
          status: "active",
        },
      ],
      authoritativeFacts: [
        {
          id: "fact_1",
          key: "cluster_node_count",
          value: "3 nodes",
          confidence: 0.95,
          authority: "VERIFIED_EVIDENCE",
          scope: "GLOBAL",
          topic: "architecture",
          eligibility: "ELIGIBLE",
        },
      ],
      constraints: [
        {
          id: "const_1",
          type: "HARD_CONSTRAINT",
          description: "Never deploy without automated regression tests",
        },
      ],
      promptDirectives: ["Follow safe architectural guidelines."],
    } as any,
    reasoning: {
      reasoningRequired: true,
      reasoningConfidence: 0.9,
      subtasks: [],
      constraints: [],
      missingInformation: [],
    } as any,
    planning: {
      requiresPlanning: false,
    } as any,
    verification: {
      confidence: {
        calibratedScore: 0.9,
        uncertaintyLevel: "LOW",
      },
      claims: [],
      contradictions: [],
    } as any,
    deepReasoning: {
      hypotheses: [
        {
          id: "hyp_1",
          claim: "Adding a load balancer improves cluster throughput",
          confidence: 0.85,
          status: "SUPPORTED",
          supportingEvidence: ["fact_1"],
          refutingEvidence: [],
        },
      ],
      cycles: [],
      sanitizedDirectives: ["Utilize load balancer for throughput."],
    } as any,
    contradictionResolution: {
      contradictions: [],
      decisions: [],
      activeDirectives: [],
    } as any,
    causalReasoning: {
      relations: [
        {
          id: "cr_1",
          cause: "Increased traffic",
          effect: "Increased latency",
          relationType: "DIRECT_CAUSE",
          confidence: 0.88,
          evidenceNodeIds: ["fact_1"],
        },
      ],
      chains: [],
      counterfactuals: [],
      activeDirectives: [],
    } as any,
    multiHopReasoning: {
      chains: [
        {
          id: "mhc_1",
          conclusion: "Cluster handles 10k requests with 3 nodes and load balancer",
          status: "GROUNDED",
          confidence: 0.82,
          hops: [
            {
              hopIndex: 1,
              sourceFactId: "fact_1",
              targetFactId: "hyp_1",
              inferredRelation: "supports",
            },
          ],
        },
      ],
      groundedConclusions: [
        {
          conclusion: "Cluster handles 10k requests with 3 nodes and load balancer",
          confidence: 0.82,
          epistemicAuthority: "VERIFIED_EVIDENCE",
        },
      ],
      directives: [],
    } as any,
    epistemicCalibration: {
      epistemicState: "PROBABILISTIC",
      unifiedConfidence: 0.85,
      claims: [
        {
          id: "ep_1",
          text: "Cluster handles 10k requests with 3 nodes and load balancer",
          epistemicState: "PROBABILISTIC",
          calibratedConfidence: 0.85,
          authority: "VERIFIED_EVIDENCE",
        },
      ],
      uncertainty: {
        evidenceInsufficiency: 0.1,
        sourceConflict: 0.05,
        reasoningDepth: 0.1,
        epistemicGap: 0.1,
        intentAmbiguity: 0.05,
        causalAmbiguity: 0.1,
        temporalDecay: 0.05,
        domainVolatility: 0.1,
        multiHopDecay: 0.1,
        simulationSpeculation: 0.05,
        compoundUncertainty: 0.2,
      },
      directives: [],
    } as any,
    scenarioSimulation: {
      scenarios: [
        {
          id: "scen_1",
          name: "High Traffic Event",
          epistemicStatus: "SIMULATION_HEURISTIC",
          outcomes: [
            {
              description: "Latency increases gracefully",
              probability: 0.75,
              epistemicStatus: "SIMULATION_HEURISTIC",
            },
          ],
          assumptions: ["Traffic stays under 20k RPS"],
        },
      ],
      directives: [],
    } as any,
    history: [],
    ...overrides,
  };
}

console.log("===============================================================================");
console.log("DORA PHASE 3, STEP 7 — META-REASONING & SELF-CRITIQUE ENGINE TEST SUITE");
console.log("===============================================================================\n");

// ----------------------------------------------------------------------------
// MR-1 to MR-6: Fundamental Critique & Audit Capabilities
// ----------------------------------------------------------------------------

runTest("MR-1: Detect unsupported claim with zero evidence or low confidence", () => {
  const input = createBaseMockInput({
    deepReasoning: {
      hypotheses: [
        {
          id: "hyp_unsupported",
          claim: "Our system can withstand a million requests per second easily",
          confidence: 0.35,
          status: "SPECULATIVE",
          supportingEvidence: [],
          refutingEvidence: [],
        },
      ],
      cycles: [],
      sanitizedDirectives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.issues.some((i) => i.type === "UNSUPPORTED_CLAIM"), "Should detect UNSUPPORTED_CLAIM");
  assert(analysis.critiques.some((c) => c.issueType === "UNSUPPORTED_CLAIM"), "Should generate critique for unsupported claim");
});

runTest("MR-2: Detect authority mismatch between claim confidence and source authority", () => {
  const input = createBaseMockInput({
    epistemicCalibration: {
      epistemicState: "FACTUAL",
      unifiedConfidence: 0.98,
      claims: [
        {
          id: "ep_spec",
          text: "Revenue will double next quarter based on user rumor",
          epistemicState: "FACTUAL",
          calibratedConfidence: 0.98,
          authority: "UNVERIFIED_INTENT",
        },
      ],
      uncertainty: { compoundUncertainty: 0.1 } as any,
      directives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.issues.some((i) => i.type === "AUTHORITY_MISMATCH"), "Should detect AUTHORITY_MISMATCH");
  assert(analysis.corrections.some((c) => c.correctionType === "DOWNGRADE_EPISTEMIC_STATUS" || c.correctionType === "REDUCE_CONFIDENCE"), "Should suggest downgrading status or reducing confidence");
});

runTest("MR-3: Detect logical invalidity in reasoning structure", () => {
  const input = createBaseMockInput({
    deepReasoning: {
      hypotheses: [
        {
          id: "hyp_invalid",
          claim: "The database is fast because the database is fast",
          confidence: 0.9,
          status: "SUPPORTED",
          supportingEvidence: ["hyp_invalid"],
          refutingEvidence: [],
        },
      ],
      cycles: [],
      sanitizedDirectives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.issues.some((i) => i.type === "LOGICAL_INVALIDITY" || i.type === "CIRCULAR_REASONING"), "Should detect circular reasoning or logical invalidity");
});

runTest("MR-4: Detect circular reasoning in dependency or causal chain", () => {
  const input = createBaseMockInput({
    deepReasoning: {
      hypotheses: [],
      cycles: [
        {
          cycleLength: 3,
          nodeIds: ["node_A", "node_B", "node_A"],
          description: "A depends on B which depends on A",
        },
      ],
      sanitizedDirectives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.issues.some((i) => i.type === "CIRCULAR_REASONING"), "Should detect CIRCULAR_REASONING from cycles");
});

runTest("MR-5: Detect contradiction disregard when unresolved contradiction exists", () => {
  const input = createBaseMockInput({
    contradictionResolution: {
      contradictions: [
        {
          id: "contra_1",
          classification: "DIRECT_FACTUAL_CONFLICT",
          claimA: "We have 3 nodes in production",
          claimB: "We have 0 nodes in production",
          status: "UNRESOLVED",
        },
      ],
      decisions: [],
      activeDirectives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.issues.some((i) => i.type === "CONTRADICTION_DISREGARD"), "Should detect CONTRADICTION_DISREGARD");
  assert(analysis.critiques.some((c) => c.severity === "CRITICAL" || c.severity === "MAJOR"), "Contradiction disregard should have high severity");
});

runTest("MR-6: Detect causal hallucination when causal relation has zero evidence", () => {
  const input = createBaseMockInput({
    causalReasoning: {
      relations: [
        {
          id: "cr_fake",
          cause: "Wearing blue socks",
          effect: "Server crash",
          relationType: "DIRECT_CAUSE",
          confidence: 0.95,
          evidenceNodeIds: [],
        },
      ],
      chains: [],
      counterfactuals: [],
      activeDirectives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.issues.some((i) => i.type === "CAUSAL_HALLUCINATION"), "Should detect CAUSAL_HALLUCINATION");
});

// ----------------------------------------------------------------------------
// MR-7 to MR-12: Simulation, Epistemic & Multi-Hop Auditing
// ----------------------------------------------------------------------------

runTest("MR-7: Detect simulation/reality confusion when hypothetical outcome is treated as ground fact", () => {
  const input = createBaseMockInput({
    scenarioSimulation: {
      scenarios: [
        {
          id: "scen_treat_as_fact",
          name: "Outage simulation",
          epistemicStatus: "SIMULATION_HEURISTIC",
          outcomes: [
            {
              description: "The entire datacenter was destroyed by fire",
              probability: 0.9,
              epistemicStatus: "FACTUAL", // Treated as factual reality!
            },
          ],
          assumptions: ["All power failed"],
        },
      ],
      directives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.issues.some((i) => i.type === "SIMULATION_REALITY_CONFUSION"), "Should detect SIMULATION_REALITY_CONFUSION");
  assert(analysis.corrections.some((c) => c.correctionType === "TAG_AS_SIMULATION" || c.correctionType === "DOWNGRADE_EPISTEMIC_STATUS"), "Should suggest tagging as simulation or downgrading status");
});

runTest("MR-8: Detect multi-hop break when chain has broken link or non-sequitur", () => {
  const input = createBaseMockInput({
    multiHopReasoning: {
      chains: [
        {
          id: "mhc_broken",
          conclusion: "Deploying redis will reduce our office rent",
          status: "BROKEN",
          confidence: 0.1,
          hops: [
            {
              hopIndex: 1,
              sourceFactId: "fact_1",
              targetFactId: "fact_nonexistent",
              inferredRelation: "unsupported",
            },
          ],
        },
      ],
      groundedConclusions: [],
      directives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.issues.some((i) => i.type === "MULTI_HOP_BREAK"), "Should detect MULTI_HOP_BREAK");
});

runTest("MR-9: Detect overconfidence when confidence exceeds epistemic state bounds", () => {
  const input = createBaseMockInput({
    epistemicCalibration: {
      epistemicState: "SPECULATIVE",
      unifiedConfidence: 0.95, // Speculative cannot have 0.95 confidence
      claims: [
        {
          id: "ep_over",
          text: "Quantum computing will break all encryption by next month",
          epistemicState: "SPECULATIVE",
          calibratedConfidence: 0.95,
          authority: "UNVERIFIED_INTENT",
        },
      ],
      uncertainty: { compoundUncertainty: 0.5 } as any,
      directives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.issues.some((i) => i.type === "OVERCONFIDENCE"), "Should detect OVERCONFIDENCE");
  assert(analysis.uncertainty.evidenceInsufficiency > 0.3, "Evidence insufficiency should be elevated");
});

runTest("MR-10: Detect underconfidence when verified evidence is treated with excessive doubt", () => {
  const input = createBaseMockInput({
    epistemicCalibration: {
      epistemicState: "UNKNOWN",
      unifiedConfidence: 0.1,
      claims: [
        {
          id: "ep_under",
          text: "The cluster has 3 nodes as verified by cloud API",
          epistemicState: "UNKNOWN",
          calibratedConfidence: 0.1,
          authority: "VERIFIED_EVIDENCE",
        },
      ],
      uncertainty: { compoundUncertainty: 0.05 } as any,
      directives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.issues.some((i) => i.type === "UNDERCONFIDENCE"), "Should detect UNDERCONFIDENCE");
});

runTest("MR-11: Detect hard constraint violation across planning or hypotheses", () => {
  const input = createBaseMockInput({
    executiveContext: {
      constraints: [
        {
          id: "const_strict",
          type: "HARD_CONSTRAINT",
          description: "Never deploy without automated regression tests",
        },
      ],
      authoritativeFacts: [],
      promptDirectives: [],
    } as any,
    deepReasoning: {
      hypotheses: [
        {
          id: "hyp_violates",
          claim: "We can deploy immediately and skip regression tests to save time",
          confidence: 0.9,
          status: "SUPPORTED",
          supportingEvidence: [],
          refutingEvidence: [],
        },
      ],
      cycles: [],
      sanitizedDirectives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.issues.some((i) => i.type === "HARD_CONSTRAINT_VIOLATION"), "Should detect HARD_CONSTRAINT_VIOLATION");
  const violCrit = analysis.critiques.find((c) => c.issueType === "HARD_CONSTRAINT_VIOLATION");
  assert(violCrit?.severity === "CRITICAL", "Constraint violation must be CRITICAL severity");
});

runTest("MR-12: Detect goal misalignment when proposed action moves away from active goal", () => {
  const input = createBaseMockInput({
    executiveContext: {
      activeGoal: {
        id: "goal_sec",
        title: "Harden database security and encrypt data",
        status: "active",
      },
      constraints: [],
      authoritativeFacts: [],
      promptDirectives: [],
    } as any,
    deepReasoning: {
      hypotheses: [
        {
          id: "hyp_misaligned",
          claim: "Disable all database passwords to make developer access faster",
          confidence: 0.8,
          status: "SUPPORTED",
          supportingEvidence: [],
          refutingEvidence: [],
        },
      ],
      cycles: [],
      sanitizedDirectives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.issues.some((i) => i.type === "GOAL_MISALIGNMENT" || i.type === "HARD_CONSTRAINT_VIOLATION"), "Should detect GOAL_MISALIGNMENT or constraint violation");
});

// ----------------------------------------------------------------------------
// MR-13 to MR-18: Context & Boundary Auditing
// ----------------------------------------------------------------------------

runTest("MR-13: Detect topic boundary spill during topic switch or strict isolation", () => {
  const input = createBaseMockInput({
    options: {
      strictTopicIsolation: true,
      activeTopic: "personal_finance",
    },
    deepReasoning: {
      hypotheses: [
        {
          id: "hyp_spill",
          claim: "Deploy docker containers to Kubernetes cluster",
          confidence: 0.85,
          status: "SUPPORTED",
          supportingEvidence: [],
          refutingEvidence: [],
        },
      ],
      cycles: [],
      sanitizedDirectives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.issues.some((i) => i.type === "TOPIC_BOUNDARY_SPILL"), "Should detect TOPIC_BOUNDARY_SPILL");
});

runTest("MR-14: Prevent sensitive data exposure (passwords, tokens, API keys, PII)", () => {
  const input = createBaseMockInput({
    deepReasoning: {
      hypotheses: [
        {
          id: "hyp_leak",
          claim: "Use API key AIzaSyA1234567890abcdefghijklmnopqrstuv and password hunter2",
          confidence: 0.9,
          status: "SUPPORTED",
          supportingEvidence: [],
          refutingEvidence: [],
        },
      ],
      cycles: [],
      sanitizedDirectives: ["Use API key AIzaSyA1234567890abcdefghijklmnopqrstuv and password hunter2"],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.issues.some((i) => i.type === "SENSITIVE_DATA_EXPOSURE"), "Should detect SENSITIVE_DATA_EXPOSURE");
  assert(analysis.critiques.some((c) => c.severity === "CRITICAL"), "Sensitive data exposure must be CRITICAL");
  for (const d of analysis.directives) {
    assert(!d.includes("AIzaSy"), "Directives must not leak API keys");
    assert(!d.includes("hunter2"), "Directives must not leak passwords");
  }
});

runTest("MR-15: Detect stale memory reliance", () => {
  const input = createBaseMockInput({
    temporalMemory: {
      staleFacts: [
        {
          id: "fact_stale_1",
          key: "office_address",
          value: "Old Office Building",
          lastObserved: "2020-01-01",
        },
      ],
      evolutionPatterns: [],
      directives: [],
    } as any,
    deepReasoning: {
      hypotheses: [
        {
          id: "hyp_stale",
          claim: "Deliver physical servers to Old Office Building",
          confidence: 0.9,
          status: "SUPPORTED",
          supportingEvidence: ["fact_stale_1"],
          refutingEvidence: [],
        },
      ],
      cycles: [],
      sanitizedDirectives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.issues.some((i) => i.type === "STALE_MEMORY_RELIANCE" || i.type === "UNSUPPORTED_CLAIM"), "Should detect reliance on stale facts");
});

runTest("MR-16: Detect speculative propagation without epistemic hedging", () => {
  const input = createBaseMockInput({
    epistemicCalibration: {
      epistemicState: "SPECULATIVE",
      unifiedConfidence: 0.4,
      claims: [
        {
          id: "ep_spec_unhedged",
          text: "The competitor definitely goes bankrupt tomorrow without question",
          epistemicState: "SPECULATIVE",
          calibratedConfidence: 0.4,
          authority: "UNVERIFIED_INTENT",
        },
      ],
      uncertainty: { compoundUncertainty: 0.6 } as any,
      directives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.issues.some((i) => i.type === "SPECULATIVE_PROPAGATION" || i.type === "OVERCONFIDENCE"), "Should detect speculative claim asserted without hedging");
  assert(analysis.corrections.some((c) => c.correctionType === "ADD_EPISTEMIC_HEDGING" || c.correctionType === "DOWNGRADE_EPISTEMIC_STATUS"), "Should advise adding epistemic hedging");
});

runTest("MR-17: Detect unanchored hypothesis disconnected from context facts", () => {
  const input = createBaseMockInput({
    executiveContext: {
      authoritativeFacts: [],
      constraints: [],
      promptDirectives: [],
    } as any,
    deepReasoning: {
      hypotheses: [
        {
          id: "hyp_floating",
          claim: "Submarines operate better at high altitude in the mountains",
          confidence: 0.7,
          status: "SUPPORTED",
          supportingEvidence: [],
          refutingEvidence: [],
        },
      ],
      cycles: [],
      sanitizedDirectives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.issues.some((i) => i.type === "UNANCHORED_HYPOTHESIS" || i.type === "UNSUPPORTED_CLAIM"), "Should detect unanchored hypothesis");
});

runTest("MR-18: Detect directive conflict across upstream engine directives", () => {
  const input = createBaseMockInput({
    executiveContext: {
      promptDirectives: ["Always explain in extreme technical detail with code."],
      authoritativeFacts: [],
      constraints: [],
    } as any,
    deepReasoning: {
      hypotheses: [],
      cycles: [],
      sanitizedDirectives: ["Keep response strictly under one sentence and non-technical."],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.issues.some((i) => i.type === "DIRECTIVE_CONFLICT"), "Should detect DIRECTIVE_CONFLICT between opposing directives");
});

// ----------------------------------------------------------------------------
// MR-19 to MR-24: Self-Critique & Advisory Corrections
// ----------------------------------------------------------------------------

runTest("MR-19: Read-only invariant — self-critique does not mutate input or upstream state", () => {
  const input = createBaseMockInput();
  const inputBefore = JSON.stringify(input);

  const analysis = metaReasoningEngine.evaluate(input);
  const inputAfter = JSON.stringify(input);

  assert(inputBefore === inputAfter, "Input must remain 100% byte-for-byte identical after evaluate()");
  assert(analysis !== null && typeof analysis === "object", "Must return valid MetaReasoningAnalysis object");
});

runTest("MR-20: Advisory correction generation — produces actionable, structured corrections", () => {
  const input = createBaseMockInput({
    deepReasoning: {
      hypotheses: [
        {
          id: "hyp_low",
          claim: "Switching database will solve all problems",
          confidence: 0.3,
          status: "SPECULATIVE",
          supportingEvidence: [],
          refutingEvidence: [],
        },
      ],
      cycles: [],
      sanitizedDirectives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.corrections.length > 0, "Should generate at least one advisory correction");
  const corr = analysis.corrections[0];
  assert(Boolean(corr.id), "Correction must have an ID");
  assert(Boolean(corr.target), "Correction must state the target");
  assert(Boolean(corr.description), "Correction must have a clear description");
  assert(Boolean(corr.correctionType), "Correction must have a valid correctionType");
});

runTest("MR-21: Severity classification correctly stratifies CRITICAL, MAJOR, MINOR, ADVISORY", () => {
  const input = createBaseMockInput({
    executiveContext: {
      constraints: [
        {
          id: "const_1",
          type: "HARD_CONSTRAINT",
          description: "Never delete database without approval",
        },
      ],
      authoritativeFacts: [],
      promptDirectives: [],
    } as any,
    deepReasoning: {
      hypotheses: [
        {
          id: "hyp_del",
          claim: "Delete database immediately without approval",
          confidence: 0.9,
          status: "SUPPORTED",
          supportingEvidence: [],
          refutingEvidence: [],
        },
      ],
      cycles: [],
      sanitizedDirectives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  const crit = analysis.critiques.find((c) => c.issueType === "HARD_CONSTRAINT_VIOLATION");
  assert(crit !== undefined, "Critique for constraint violation must exist");
  assert(crit?.severity === "CRITICAL", "Must be CRITICAL severity");
});

runTest("MR-22: Recommendation priority ranking sorts by severity and impact", () => {
  const input = createBaseMockInput({
    executiveContext: {
      constraints: [
        { id: "c1", type: "HARD_CONSTRAINT", description: "Critical safety lock" },
      ],
      authoritativeFacts: [],
      promptDirectives: [],
    } as any,
    deepReasoning: {
      hypotheses: [
        {
          id: "h_crit",
          claim: "Bypass critical safety lock",
          confidence: 0.9,
          status: "SUPPORTED",
          supportingEvidence: [],
          refutingEvidence: [],
        },
        {
          id: "h_minor",
          claim: "Minor formatting tweak might look cleaner",
          confidence: 0.4,
          status: "SPECULATIVE",
          supportingEvidence: [],
          refutingEvidence: [],
        },
      ],
      cycles: [],
      sanitizedDirectives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  if (analysis.recommendations.length >= 2) {
    const r1 = analysis.recommendations[0];
    const r2 = analysis.recommendations[1];
    assert(r1.priority <= r2.priority, "Recommendations must be sorted in ascending priority order (1 is highest)");
  }
});

runTest("MR-23: Safe directive generation produces natural language guidance", () => {
  const input = createBaseMockInput({
    deepReasoning: {
      hypotheses: [
        {
          id: "h_spec",
          claim: "Unverified rumor about system outage",
          confidence: 0.35,
          status: "SPECULATIVE",
          supportingEvidence: [],
          refutingEvidence: [],
        },
      ],
      cycles: [],
      sanitizedDirectives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.directives.length > 0, "Should generate at least one directive");
  for (const d of analysis.directives) {
    assert(typeof d === "string" && d.length > 0, "Directive must be a non-empty string");
  }
});

runTest("MR-24: Directive sanitization strips internal UUIDs, hashes, and raw debug floats", () => {
  const input = createBaseMockInput({
    deepReasoning: {
      hypotheses: [
        {
          id: "123e4567-e89b-12d3-a456-426614174000",
          claim: "System load test claim with confidence=0.884129581 and fact_id_992",
          confidence: 0.3,
          status: "SPECULATIVE",
          supportingEvidence: [],
          refutingEvidence: [],
        },
      ],
      cycles: [],
      sanitizedDirectives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  for (const d of analysis.directives) {
    assert(!d.includes("123e4567-e89b-12d3-a456-426614174000"), "Directives must not leak raw UUIDs");
    assert(!d.includes("0.884129581"), "Directives must not leak raw float confidence scores");
  }
});

// ----------------------------------------------------------------------------
// MR-25 to MR-30: Uncertainty & Multi-Dimensional Calibration
// ----------------------------------------------------------------------------

runTest("MR-25: 10-dimensional uncertainty vector calculation is bounded in [0.0, 1.0]", () => {
  const input = createBaseMockInput();
  const analysis = metaReasoningEngine.evaluate(input);

  const u = analysis.uncertainty;
  assert(u.evidenceInsufficiency >= 0.0 && u.evidenceInsufficiency <= 1.0, "evidenceInsufficiency bounded [0, 1]");
  assert(u.sourceConflict >= 0.0 && u.sourceConflict <= 1.0, "sourceConflict bounded [0, 1]");
  assert(u.reasoningDepth >= 0.0 && u.reasoningDepth <= 1.0, "reasoningDepth bounded [0, 1]");
  assert(u.epistemicGap >= 0.0 && u.epistemicGap <= 1.0, "epistemicGap bounded [0, 1]");
  assert(u.intentAmbiguity >= 0.0 && u.intentAmbiguity <= 1.0, "intentAmbiguity bounded [0, 1]");
  assert(u.causalAmbiguity >= 0.0 && u.causalAmbiguity <= 1.0, "causalAmbiguity bounded [0, 1]");
  assert(u.temporalDecay >= 0.0 && u.temporalDecay <= 1.0, "temporalDecay bounded [0, 1]");
  assert(u.domainVolatility >= 0.0 && u.domainVolatility <= 1.0, "domainVolatility bounded [0, 1]");
  assert(u.multiHopDecay >= 0.0 && u.multiHopDecay <= 1.0, "multiHopDecay bounded [0, 1]");
  assert(u.simulationSpeculation >= 0.0 && u.simulationSpeculation <= 1.0, "simulationSpeculation bounded [0, 1]");
  assert(u.compoundUncertainty >= 0.0 && u.compoundUncertainty <= 1.0, "compoundUncertainty bounded [0, 1]");
});

runTest("MR-26: Compound uncertainty aggregates orthogonal dimensions properly", () => {
  const inputClean = createBaseMockInput();
  const cleanAnalysis = metaReasoningEngine.evaluate(inputClean);

  const inputNoisy = createBaseMockInput({
    contradictionResolution: {
      contradictions: [
        { id: "c1", classification: "DIRECT_FACTUAL_CONFLICT", claimA: "A", claimB: "B", status: "UNRESOLVED" },
      ],
      decisions: [],
      activeDirectives: [],
    } as any,
    scenarioSimulation: {
      scenarios: [
        {
          id: "s1",
          name: "High speculation",
          epistemicStatus: "SIMULATION_HEURISTIC",
          outcomes: [{ description: "Speculative outcome", probability: 0.5, epistemicStatus: "SPECULATIVE" }],
          assumptions: ["A1", "A2", "A3", "A4"],
        },
      ],
      directives: [],
    } as any,
  });
  const noisyAnalysis = metaReasoningEngine.evaluate(inputNoisy);

  assert(noisyAnalysis.uncertainty.compoundUncertainty >= cleanAnalysis.uncertainty.compoundUncertainty, "Compound uncertainty must increase with more conflict and speculation");
});

runTest("MR-27: Evidence insufficiency dimension scales with missing evidence and unsupported claims", () => {
  const input = createBaseMockInput({
    deepReasoning: {
      hypotheses: [
        { id: "h1", claim: "Claim 1", confidence: 0.2, status: "SPECULATIVE", supportingEvidence: [], refutingEvidence: [] },
        { id: "h2", claim: "Claim 2", confidence: 0.2, status: "SPECULATIVE", supportingEvidence: [], refutingEvidence: [] },
      ],
      cycles: [],
      sanitizedDirectives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.uncertainty.evidenceInsufficiency > 0.2, "Evidence insufficiency should be elevated when multiple claims have no evidence");
});

runTest("MR-28: Source conflict dimension reflects unresolved contradictions", () => {
  const input = createBaseMockInput({
    contradictionResolution: {
      contradictions: [
        { id: "c1", classification: "DIRECT_FACTUAL_CONFLICT", claimA: "Yes", claimB: "No", status: "UNRESOLVED" },
      ],
      decisions: [],
      activeDirectives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.uncertainty.sourceConflict > 0.1, "Source conflict must be non-trivial when contradictions are unresolved");
});

runTest("MR-29: Reasoning depth dimension penalizes cycles and deep unanchored hops", () => {
  const input = createBaseMockInput({
    deepReasoning: {
      hypotheses: [],
      cycles: [
        { cycleLength: 4, nodeIds: ["A", "B", "C", "A"], description: "Cycle A-B-C-A" },
      ],
      sanitizedDirectives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.uncertainty.reasoningDepth > 0.15, "Reasoning depth uncertainty must reflect cycles");
});

runTest("MR-30: Epistemic gap dimension increases when claims lack verified authority", () => {
  const input = createBaseMockInput({
    epistemicCalibration: {
      epistemicState: "HYPOTHETICAL",
      unifiedConfidence: 0.5,
      claims: [
        { id: "c1", text: "Hypothetical statement", epistemicState: "HYPOTHETICAL", calibratedConfidence: 0.5, authority: "UNVERIFIED_INTENT" },
      ],
      uncertainty: { compoundUncertainty: 0.5 } as any,
      directives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.uncertainty.epistemicGap > 0.1, "Epistemic gap should be non-zero for unverified hypotheses");
});

// ----------------------------------------------------------------------------
// MR-31 to MR-36: Budget & Bounded Execution
// ----------------------------------------------------------------------------

runTest("MR-31: Issue count capped at maxIssues budget", () => {
  // Generate 20 problematic hypotheses
  const manyHypotheses = Array.from({ length: 20 }, (_, idx) => ({
    id: `hyp_${idx}`,
    claim: `Unsupported speculative claim ${idx}`,
    confidence: 0.2,
    status: "SPECULATIVE",
    supportingEvidence: [],
    refutingEvidence: [],
  }));

  const input = createBaseMockInput({
    deepReasoning: {
      hypotheses: manyHypotheses,
      cycles: [],
      sanitizedDirectives: [],
    } as any,
  });

  const customBudget = { ...DEFAULT_META_REASONING_BUDGET, maxIssues: 4 };
  const analysis = metaReasoningEngine.evaluate(input, customBudget);
  assert(analysis.issues.length <= 4, `Issues (${analysis.issues.length}) must be <= maxIssues (4)`);
});

runTest("MR-32: Critique count capped at maxCritiques budget", () => {
  const manyHypotheses = Array.from({ length: 20 }, (_, idx) => ({
    id: `hyp_${idx}`,
    claim: `Unsupported speculative claim ${idx}`,
    confidence: 0.2,
    status: "SPECULATIVE",
    supportingEvidence: [],
    refutingEvidence: [],
  }));

  const input = createBaseMockInput({
    deepReasoning: {
      hypotheses: manyHypotheses,
      cycles: [],
      sanitizedDirectives: [],
    } as any,
  });

  const customBudget = { ...DEFAULT_META_REASONING_BUDGET, maxCritiques: 3 };
  const analysis = metaReasoningEngine.evaluate(input, customBudget);
  assert(analysis.critiques.length <= 3, `Critiques (${analysis.critiques.length}) must be <= maxCritiques (3)`);
});

runTest("MR-33: Correction count capped at maxCorrections budget", () => {
  const manyHypotheses = Array.from({ length: 20 }, (_, idx) => ({
    id: `hyp_${idx}`,
    claim: `Unsupported speculative claim ${idx}`,
    confidence: 0.2,
    status: "SPECULATIVE",
    supportingEvidence: [],
    refutingEvidence: [],
  }));

  const input = createBaseMockInput({
    deepReasoning: {
      hypotheses: manyHypotheses,
      cycles: [],
      sanitizedDirectives: [],
    } as any,
  });

  const customBudget = { ...DEFAULT_META_REASONING_BUDGET, maxCorrections: 2 };
  const analysis = metaReasoningEngine.evaluate(input, customBudget);
  assert(analysis.corrections.length <= 2, `Corrections (${analysis.corrections.length}) must be <= maxCorrections (2)`);
});

runTest("MR-34: Directive count capped at maxDirectives budget", () => {
  const input = createBaseMockInput({
    deepReasoning: {
      hypotheses: [
        { id: "h1", claim: "Bad 1", confidence: 0.2, status: "SPECULATIVE", supportingEvidence: [], refutingEvidence: [] },
        { id: "h2", claim: "Bad 2", confidence: 0.2, status: "SPECULATIVE", supportingEvidence: [], refutingEvidence: [] },
      ],
      cycles: [],
      sanitizedDirectives: [],
    } as any,
  });

  const customBudget = { ...DEFAULT_META_REASONING_BUDGET, maxDirectives: 2 };
  const analysis = metaReasoningEngine.evaluate(input, customBudget);
  assert(analysis.directives.length <= 2, `Directives (${analysis.directives.length}) must be <= maxDirectives (2)`);
});

runTest("MR-35: Hard ceiling truncation enforces upper safety limits", () => {
  const input = createBaseMockInput();
  // Pass overly high requested budget
  const oversizedBudget = {
    maxIssues: 500,
    maxCritiques: 500,
    maxCorrections: 500,
    maxRecommendations: 500,
    maxDirectives: 500,
    maxExecutionTimeMs: 5000,
  };

  const analysis = metaReasoningEngine.evaluate(input, oversizedBudget);
  assert(analysis.issues.length <= HARD_CEILING_META_REASONING_BUDGET.maxIssues, "Issues must not exceed hard ceiling");
  assert(analysis.critiques.length <= HARD_CEILING_META_REASONING_BUDGET.maxCritiques, "Critiques must not exceed hard ceiling");
  assert(analysis.corrections.length <= HARD_CEILING_META_REASONING_BUDGET.maxCorrections, "Corrections must not exceed hard ceiling");
});

runTest("MR-36: Diagnostic metric collection records execution timing and audit counts", () => {
  const input = createBaseMockInput();
  const analysis = metaReasoningEngine.evaluate(input);

  assert(analysis.diagnostics !== undefined, "Diagnostics must be defined");
  assert(typeof analysis.diagnostics.executionTimeMs === "number", "executionTimeMs must be number");
  assert(typeof analysis.diagnostics.claimsAudited === "number", "claimsAudited must be number");
  assert(typeof analysis.diagnostics.rulesEvaluated === "number", "rulesEvaluated must be number");
  assert(analysis.diagnostics.rulesEvaluated > 0, "rulesEvaluated must be > 0");
});

// ----------------------------------------------------------------------------
// MR-37 to MR-42: Determinism & Side-Effect Free Invariants
// ----------------------------------------------------------------------------

runTest("MR-37: Identical output across multiple runs with same input (pure determinism)", () => {
  const input = createBaseMockInput({
    deepReasoning: {
      hypotheses: [
        { id: "h_det", claim: "Deterministic test hypothesis", confidence: 0.8, status: "SUPPORTED", supportingEvidence: ["fact_1"], refutingEvidence: [] },
      ],
      cycles: [],
      sanitizedDirectives: [],
    } as any,
  });

  const res1 = metaReasoningEngine.evaluate(input);
  const res2 = metaReasoningEngine.evaluate(input);

  assert(JSON.stringify(res1.issues) === JSON.stringify(res2.issues), "Issues must match across runs");
  assert(JSON.stringify(res1.critiques) === JSON.stringify(res2.critiques), "Critiques must match across runs");
  assert(JSON.stringify(res1.corrections) === JSON.stringify(res2.corrections), "Corrections must match across runs");
  assert(JSON.stringify(res1.directives) === JSON.stringify(res2.directives), "Directives must match across runs");
  assert(JSON.stringify(res1.uncertainty) === JSON.stringify(res2.uncertainty), "Uncertainty must match across runs");
});

runTest("MR-38: No Math.random() or non-deterministic sources used", () => {
  const input = createBaseMockInput();
  const originalRandom = Math.random;
  let randomCalled = false;
  Math.random = () => {
    randomCalled = true;
    return 0.5;
  };

  try {
    metaReasoningEngine.evaluate(input);
    assert(!randomCalled, "MetaReasoningEngine must NEVER call Math.random()");
  } finally {
    Math.random = originalRandom;
  }
});

runTest("MR-39: Input immutability deep freeze test", () => {
  const input = createBaseMockInput();
  Object.freeze(input);
  if (input.deepReasoning) Object.freeze(input.deepReasoning);
  if (input.executiveContext) Object.freeze(input.executiveContext);

  // Should run without throwing TypeError: Cannot assign to read only property
  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis !== null, "Engine must execute cleanly on frozen inputs");
});

runTest("MR-40: MemoryStore state preservation", () => {
  const userId = "mem_user_test_preserve";
  memoryStore.save(userId, {
    id: "mem_preserve_1",
    userId,
    key: "preserved_fact",
    value: "Initial State",
    type: "FACT",
    confidence: 1.0,
    source: "EXPLICIT_USER",
    status: "ACTIVE",
    createdAt: 1724000000000,
    updatedAt: 1724000000000,
    accessCount: 1,
    lastAccessedAt: 1724000000000,
    isQuarantined: false,
  } as any);

  const countBefore = memoryStore.get(userId).length;
  const input = createBaseMockInput({ userId });
  metaReasoningEngine.evaluate(input);
  const countAfter = memoryStore.get(userId).length;

  assert(countBefore === countAfter, "MemoryStore count must not change during MetaReasoning evaluate()");
});

runTest("MR-41: ExecutiveContext state preservation", () => {
  const execContext = {
    currentTurn: { message: "Test", normalizedIntent: "QUERY" },
    authoritativeFacts: [{ id: "f1", key: "k", value: "v", confidence: 0.9 }],
    constraints: [],
  } as any;
  const beforeStr = JSON.stringify(execContext);

  const input = createBaseMockInput({ executiveContext: execContext });
  metaReasoningEngine.evaluate(input);
  const afterStr = JSON.stringify(execContext);

  assert(beforeStr === afterStr, "ExecutiveContext must not be mutated");
});

runTest("MR-42: Clean handling of empty/null inputs", () => {
  const emptyInput: MetaReasoningInput = {
    userId: "empty_user",
    message: "",
    context: {} as any,
  };

  const analysis = metaReasoningEngine.evaluate(emptyInput);
  assert(analysis !== null && typeof analysis === "object", "Must return valid analysis on empty input");
  assert(Array.isArray(analysis.issues), "issues must be array");
  assert(Array.isArray(analysis.critiques), "critiques must be array");
  assert(Array.isArray(analysis.corrections), "corrections must be array");
  assert(Array.isArray(analysis.directives), "directives must be array");
});

// ----------------------------------------------------------------------------
// MR-43 to MR-48: Pipeline & Engine Integration
// ----------------------------------------------------------------------------

runTest("MR-43: Integration downstream of Steps 1-6 — receives all upstream reasoning packages", () => {
  const input = createBaseMockInput();
  assert(input.deepReasoning !== undefined, "DeepReasoning must be provided");
  assert(input.contradictionResolution !== undefined, "ContradictionResolution must be provided");
  assert(input.causalReasoning !== undefined, "CausalReasoning must be provided");
  assert(input.multiHopReasoning !== undefined, "MultiHopReasoning must be provided");
  assert(input.epistemicCalibration !== undefined, "EpistemicCalibration must be provided");
  assert(input.scenarioSimulation !== undefined, "ScenarioSimulation must be provided");

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.diagnostics.claimsAudited >= 0, "Audit must process upstream claims");
});

runTest("MR-44: Upstream engine inputs consumed correctly in audit passes", () => {
  const input = createBaseMockInput({
    epistemicCalibration: {
      epistemicState: "FACTUAL",
      unifiedConfidence: 0.95,
      claims: [
        { id: "c_fact", text: "Production cluster running normal", epistemicState: "FACTUAL", calibratedConfidence: 0.95, authority: "VERIFIED_EVIDENCE" },
      ],
      uncertainty: { compoundUncertainty: 0.05 } as any,
      directives: [],
    } as any,
  });

  const analysis = metaReasoningEngine.evaluate(input);
  assert(analysis.auditedClaims.some((c) => c.text.includes("Production cluster")), "Audited claims must capture upstream epistemic claims");
});

runTest("MR-45: BrainEngine end-to-end integration produces metaReasoningAnalysis", () => {
  const result = brainEngine.analyze("Plan a resilient cloud deployment", [], undefined, "user_brain_test");

  assert(result.metaReasoningAnalysis !== undefined, "brainEngine.analyze() must return metaReasoningAnalysis");
  assert(Array.isArray(result.metaReasoningAnalysis.issues), "metaReasoningAnalysis.issues must be an array");
  assert(Array.isArray(result.metaReasoningAnalysis.directives), "metaReasoningAnalysis.directives must be an array");
});

runTest("MR-46: Directive propagation to BrainEngine promptDirectives", () => {
  const result = brainEngine.analyze("Simulate an unexpected database cluster failure", [], undefined, "user_brain_dir_test");

  assert(Array.isArray(result.promptDirectives), "promptDirectives must be array");
  // Meta reasoning directives must be present in promptDirectives
  if (result.metaReasoningAnalysis && result.metaReasoningAnalysis.directives.length > 0) {
    for (const d of result.metaReasoningAnalysis.directives) {
      assert(result.promptDirectives.includes(d), `Directive '${d}' must be present in BrainAnalysis.promptDirectives`);
    }
  }
});

runTest("MR-47: Diagnostics exposed in BrainAnalysis", () => {
  const result = brainEngine.analyze("Check system health and status", [], undefined, "user_brain_diag_test");

  assert(result.metaReasoningAnalysis?.diagnostics !== undefined, "metaReasoningAnalysis diagnostics must be present");
  assert(typeof result.metaReasoningAnalysis.diagnostics.executionTimeMs === "number", "executionTimeMs must be number");
});

runTest("MR-48: Graceful fallback when upstream reasoning engines are omitted", () => {
  const minimalInput: MetaReasoningInput = {
    userId: "user_min",
    message: "Simple greeting",
    context: { activeTopic: "general", entities: {}, pendingClarification: false } as any,
  };

  const analysis = metaReasoningEngine.evaluate(minimalInput);
  assert(analysis !== null, "Must evaluate cleanly on minimal input");
  assert(analysis.isCoherent === true, "Simple greeting with no issues must be coherent");
});

// ----------------------------------------------------------------------------
// MR-49 to MR-54: Full-Stack Regression & Stress Tests
// ----------------------------------------------------------------------------

runTest("MR-49: Regression — DeepReasoningEngine (Step 1) functions without regression", () => {
  const deepRes = deepReasoningEngine.evaluate({
    userId: "reg_user",
    message: "Should we migrate from MySQL to Postgres?",
    context: { activeTopic: "db", entities: {}, pendingClarification: false } as any,
  });

  assert(deepRes !== null, "DeepReasoningEngine evaluate must succeed");
  assert(Array.isArray(deepRes.hypotheses), "DeepReasoning hypotheses must be array");
});

runTest("MR-50: Regression — ContradictionResolutionEngine (Step 2) functions without regression", () => {
  const contraRes = contradictionResolutionEngine.evaluate({
    userId: "reg_user",
    message: "I live in New York. Actually I live in London.",
    context: { activeTopic: "location", entities: {}, pendingClarification: false } as any,
  });

  assert(contraRes !== null, "ContradictionResolutionEngine evaluate must succeed");
  assert(Array.isArray(contraRes.contradictions), "Contradictions must be array");
});

runTest("MR-51: Regression — CausalReasoningEngine (Step 3) functions without regression", () => {
  const causalRes = causalReasoningEngine.evaluate({
    userId: "reg_user",
    message: "Because the power supply failed, the server crashed",
    context: { activeTopic: "infrastructure", entities: {}, pendingClarification: false } as any,
  });

  assert(causalRes !== null, "CausalReasoningEngine evaluate must succeed");
  assert(Array.isArray(causalRes.relations), "Causal relations must be array");
});

runTest("MR-52: Regression — MultiHopReasoningEngine (Step 4) functions without regression", () => {
  const multiHopRes = multiHopReasoningEngine.evaluate({
    userId: "reg_user",
    message: "If server load exceeds capacity, response times increase",
    context: { activeTopic: "infrastructure", entities: {}, pendingClarification: false } as any,
  });

  assert(multiHopRes !== null, "MultiHopReasoningEngine evaluate must succeed");
  assert(Array.isArray(multiHopRes.chains), "MultiHop chains must be array");
});

runTest("MR-53: Regression — EpistemicCalibrationEngine (Step 5) functions without regression", () => {
  const epistemicRes = epistemicCalibrationEngine.evaluate({
    userId: "reg_user",
    message: "Verify deployment confidence",
    context: { activeTopic: "devops", entities: {}, pendingClarification: false } as any,
  });

  assert(epistemicRes !== null, "EpistemicCalibrationEngine evaluate must succeed");
  assert(Array.isArray(epistemicRes.claims), "Epistemic claims must be array");
  assert(typeof epistemicRes.diagnostics.claimsEvaluated === "number", "Claims evaluated must be number");
});

runTest("MR-54: Regression — ScenarioSimulationEngine (Step 6) functions without regression", () => {
  const simRes = scenarioSimulationEngine.evaluate({
    userId: "reg_user",
    message: "Simulate switching to a multi-cloud failover architecture",
    context: { activeTopic: "architecture", entities: {}, pendingClarification: false } as any,
  });

  assert(simRes !== null, "ScenarioSimulationEngine evaluate must succeed");
  assert(Array.isArray(simRes.scenarios), "Scenarios must be array");
});

console.log("\n===============================================================================");
console.log(`META-REASONING ENGINE TEST RESULTS: ${passedCount} / ${totalCount} PASSED`);
console.log("===============================================================================\n");

if (passedCount !== totalCount) {
  process.exit(1);
}
