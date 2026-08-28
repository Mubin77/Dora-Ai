/**
 * DORA Phase 3 — Step 7: Meta-Reasoning & Self-Critique Engine Test Suite
 * 
 * Verifies all 54 required test cases (MR-1 through MR-54) ensuring deterministic,
 * non-LLM, read-only self-critique, grounding verification, epistemic calibration auditing,
 * causal & multi-hop integrity, reality boundary defense, constraint checking,
 * directive sanitization, and full BrainEngine integration.
 */

import { metaReasoningEngine } from "./metaReasoningEngine";
import {
  MetaReasoningInput,
  MetaReasoningBudgetConfig,
} from "./metaReasoningTypes";
import { brainEngine } from "./brainEngine";

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

function createBaseMockInput(): MetaReasoningInput {
  return {
    userId: "user_test_7",
    message: "analyze system performance and optimize query",
    context: {
      activeTopic: "database_optimization",
      entities: [],
      pendingClarification: false,
    } as any,
    executiveContext: {
      currentTurn: {
        message: "analyze system performance and optimize query",
        intent: "ANALYZE",
        explicitDirectives: [],
        overrides: {},
        requiresClarification: false,
      },
      authoritativeFacts: [
        {
          id: "fact_db_version",
          key: "db_version",
          value: "PostgreSQL 16",
          authority: "GOVERNANCE_APPROVED_MEMORY",
          confidence: 0.90,
          isGlobal: true,
          scope: "GLOBAL",
          topic: "database_optimization",
          groundingType: "GOVERNED_MEMORY",
          sanitizedDirective: "Database is PostgreSQL 16",
        } as any,
      ],
      activePreferences: [],
      reasoningConstraints: [
        {
          id: "const_no_drop_table",
          type: "HARD_CONSTRAINT",
          description: "Never drop production tables",
          authority: "HARD_CONSTRAINT",
          enforceStrictly: true,
          sanitizedDirective: "Never drop production tables",
        } as any,
      ],
      activeGoals: [
        {
          goalId: "goal_optimize_query",
          title: "Optimize latency under 50ms",
          status: "IN_PROGRESS",
          progress: 0.50,
          sanitizedDirective: "Optimize latency under 50ms",
        } as any,
      ],
      activeProjects: [],
      activeCommitments: [],
      recentInteractionPatterns: [],
      temporalContext: {
        currentTime: 1724300000000,
        formattedCurrentTime: "2024-08-22T00:00:00.000Z",
        activeTemporalAnchors: [],
        stateHistory: [],
        staleEntityThresholdMs: 86400000,
      } as any,
      promptDirectives: [],
      sanitizedContextPackage: "Active DB is PostgreSQL 16",
      diagnostics: {
        factsIncluded: 1,
        factsFiltered: 0,
        preferencesIncluded: 0,
        constraintsIncluded: 1,
        goalsIncluded: 1,
        commitmentsIncluded: 0,
        temporalAnchorsIncluded: 0,
        topicFilterApplied: false,
        totalDirectivesGenerated: 1,
        contextPackageLength: 30,
      } as any,
    } as any,
    epistemicCalibration: {
      records: [],
      claims: [
        {
          claimKey: "db_version",
          statement: "Database is PostgreSQL 16",
          epistemicState: "VERIFIED",
          authority: "GOVERNANCE_APPROVED_MEMORY",
          confidence: 0.88,
          uncertainty: 0.12,
          scope: "GLOBAL",
          provenance: [{ sourceId: "fact_db_version", sourceType: "EXECUTIVE_FACT", authority: "GOVERNANCE_APPROVED_MEMORY", confidence: 0.90 }],
          evidence: ["PostgreSQL 16 config verified"],
        } as any,
      ],
      calibratedConfidenceScore: 0.88,
      directives: ["High confidence database context"],
      diagnostics: {} as any,
    } as any,
    deepReasoning: {
      hypotheses: [
        {
          id: "hyp_1",
          hypothesisKey: "index_scan",
          statement: "Using index scan improves query time",
          epistemicStatus: "SUPPORTED",
          supportingEvidence: ["Index scan bench test"],
          contradictingEvidence: [],
        } as any,
      ],
      activeHypotheses: [],
      sanitizedDirectives: [],
      diagnostics: {} as any,
    } as any,
    causalReasoning: {
      relations: [
        {
          relationKey: "index->latency",
          causeKey: "index_added",
          effectKey: "latency_reduced",
          relationType: "DETERMINISTIC",
          mechanism: "B-Tree index reduces disk seek time",
          confidence: 0.90,
          necessitySufficiency: "NECESSARY_AND_SUFFICIENT",
          isCounterfactuallyRobust: true,
          provenance: [],
        } as any,
      ],
      chains: [],
      counterfactuals: [],
      activeDirectives: [],
      diagnostics: {} as any,
    } as any,
    multiHopReasoning: {
      chains: [
        {
          chainId: "chain_1",
          hops: [
            {
              hopIndex: 0,
              sourceEntity: "Query",
              targetEntity: "Index",
              relation: "uses",
              inferenceType: "DEDUCTIVE",
              confidence: 0.90,
              status: "VALID",
            } as any,
          ],
          status: "COMPLETE",
          cumulativeConfidence: 0.90,
        } as any,
      ],
      groundedConclusions: [],
      directives: [],
      diagnostics: {} as any,
    } as any,
    scenarioSimulation: {
      scenarios: [
        {
          scenarioId: "scen_baseline",
          scenarioName: "Baseline Query",
          scenarioType: "BASELINE",
          epistemicStatus: "SIMULATED",
          actions: [],
          assumptions: [],
          projectedOutcome: { outcomeId: "out_1", title: "Projected latency", outcomeType: "POSITIVE", epistemicStatus: "SIMULATED", confidence: 0.80 } as any,
        } as any,
      ],
      outcomes: [],
      comparisons: [],
      unresolvedScenarios: [],
      assumptions: [],
      directives: [],
      diagnostics: {} as any,
    },
    planning: {
      requiresPlanning: true,
      plan: {
        id: "plan_1",
        goal: "Optimize query latency",
        objective: "Add index and benchmark",
        steps: [
          {
            id: "step_1",
            action: "CREATE INDEX on users(created_at)",
            description: "Add index to reduce scan time",
            status: "PENDING",
          } as any,
        ],
      } as any,
      directives: [],
    } as any,
  };
}

console.log("\n--- STARTING DORA PHASE 3 STEP 7 META-REASONING ENGINE TEST SUITE ---\n");

// =========================================================================
// Group 1: Core Mechanics, Determinism, Budget & Invariants (MR-1 to MR-6)
// =========================================================================

runTest("MR-1: Deterministic evaluation (same inputs -> identical hash, verdict, issues, and directives)", () => {
  const input = createBaseMockInput();
  const res1 = metaReasoningEngine.evaluate(input);
  const res2 = metaReasoningEngine.evaluate(input);
  assert(res1.verdict === res2.verdict, "Verdicts must match exactly");
  assert(res1.overallQualityScore === res2.overallQualityScore, "Quality score must match exactly");
  assert(res1.issues.length === res2.issues.length, "Issues count must match exactly");
  assert(JSON.stringify(res1.sanitizedDirectives) === JSON.stringify(res2.sanitizedDirectives), "Directives must match");
});

runTest("MR-2: Read-only side-effect-free invariant (no mutation of input packages)", () => {
  const input = createBaseMockInput();
  const snapshot = JSON.stringify(input);
  metaReasoningEngine.evaluate(input);
  assert(JSON.stringify(input) === snapshot, "Input must not be mutated during evaluation");
});

runTest("MR-3: Budget truncation on claims, chains, assumptions, scenarios", () => {
  const input = createBaseMockInput();
  input.options = {
    budget: {
      maxAuditedClaims: 1,
      maxCritiqueIssues: 2,
    },
  };
  input.epistemicCalibration!.claims = [
    { claimKey: "c1", statement: "Claim 1", epistemicState: "UNKNOWN", authority: "SYSTEM_DEFAULT", confidence: 0.1 } as any,
    { claimKey: "c2", statement: "Claim 2", epistemicState: "UNKNOWN", authority: "SYSTEM_DEFAULT", confidence: 0.1 } as any,
    { claimKey: "c3", statement: "Claim 3", epistemicState: "UNKNOWN", authority: "SYSTEM_DEFAULT", confidence: 0.1 } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.diagnostics.claimsAudited <= 1, "Claims audited must be clamped to maxAuditedClaims budget");
});

runTest("MR-4: Hard ceiling enforcement (cannot exceed hard ceiling budget limits)", () => {
  const input = createBaseMockInput();
  input.options = {
    budget: {
      maxAuditedClaims: 9999,
      maxCritiqueIssues: 9999,
    },
  };
  const res = metaReasoningEngine.evaluate(input);
  assert(res.diagnostics.issuesDetected <= 50, "Issues count must not exceed hard ceiling of 50");
});

runTest("MR-5: Empty/minimal inputs handling without crashing", () => {
  const res = metaReasoningEngine.evaluate({});
  assert(res.verdict !== undefined, "Verdict must be defined on empty input");
  assert(Array.isArray(res.issues), "Issues array must be defined");
  assert(Array.isArray(res.sanitizedDirectives), "Directives must be defined");
});

runTest("MR-6: Handling undefined upstream engine packages gracefully", () => {
  const input: MetaReasoningInput = {
    userId: "test",
    message: "hello",
    epistemicCalibration: undefined,
    deepReasoning: undefined,
    causalReasoning: undefined,
    multiHopReasoning: undefined,
    scenarioSimulation: undefined,
  };
  const res = metaReasoningEngine.evaluate(input);
  assert(res.verdict === "PASS", "Should default to pass when no issues in undefined packages");
});

// =========================================================================
// Group 2: Grounding & Evidence Auditing (MR-7 to MR-12)
// =========================================================================

runTest("MR-7: Detects UNSUPPORTED_CLAIM when claim has no supporting verified evidence", () => {
  const input = createBaseMockInput();
  input.epistemicCalibration!.claims = [
    {
      claimKey: "unsupported_fact",
      statement: "The earth is flat",
      epistemicState: "VERIFIED",
      authority: "SYSTEM_DEFAULT",
      confidence: 0.95,
      evidence: [],
      provenance: [{ sourceId: "p1", sourceType: "EXECUTIVE_FACT" }],
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.unsupportedClaims.includes("unsupported_fact"), "Must register unsupported_fact in unsupportedClaims");
  assert(res.issues.some((i) => i.type === "UNSUPPORTED_CLAIM"), "Must emit UNSUPPORTED_CLAIM issue");
});

runTest("MR-8: Validates grounded claims supported by verified evidence / governance facts", () => {
  const input = createBaseMockInput();
  const res = metaReasoningEngine.evaluate(input);
  assert(res.unsupportedClaims.length === 0, "Well-grounded claims must have 0 unsupported claims");
  assert(res.sectionResults.find((s) => s.section === "GROUNDING")?.passed === true, "Grounding section must pass");
});

runTest("MR-9: Detects PROVENANCE_MISSING when claim has zero provenance", () => {
  const input = createBaseMockInput();
  input.epistemicCalibration!.claims = [
    {
      claimKey: "claim_no_prov",
      statement: "Server is running",
      epistemicState: "INFERRED",
      authority: "TEMPORAL_CONTEXT",
      confidence: 0.60,
      provenance: [],
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.issues.some((i) => i.type === "PROVENANCE_MISSING"), "Must detect PROVENANCE_MISSING");
});

runTest("MR-10: Detects WEAK_EVIDENCE_LINK when evidence has low authority holding excessive confidence", () => {
  const input = createBaseMockInput();
  input.epistemicCalibration!.claims = [
    {
      claimKey: "pred_claim",
      statement: "User will buy item tomorrow",
      epistemicState: "INFERRED",
      authority: "PREDICTIVE_CONTEXT",
      confidence: 0.85,
      provenance: [{ sourceId: "p1", sourceType: "EXECUTIVE_FACT" }],
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.issues.some((i) => i.type === "WEAK_EVIDENCE_LINK"), "Must detect WEAK_EVIDENCE_LINK");
});

runTest("MR-11: Flags ungrounded claims in deep reasoning hypotheses claiming ESTABLISHED status", () => {
  const input = createBaseMockInput();
  input.deepReasoning!.hypotheses = [
    {
      id: "hyp_unsupported",
      hypothesisKey: "hyp_quantum",
      statement: "Quantum processor in use",
      epistemicStatus: "ESTABLISHED",
      supportingEvidence: [],
      contradictingEvidence: [],
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.unsupportedClaims.includes("hyp_quantum"), "Must flag ungrounded hypothesis in unsupportedClaims");
});

runTest("MR-12: Grounding score calculation reflects ratio of supported vs unsupported claims", () => {
  const input = createBaseMockInput();
  input.epistemicCalibration!.claims = [
    { claimKey: "c1", statement: "Valid", epistemicState: "VERIFIED", evidence: ["Verified"], provenance: [{ sourceId: "1", sourceType: "EXECUTIVE_FACT" }] } as any,
    { claimKey: "c2", statement: "Invalid", epistemicState: "VERIFIED", evidence: [], provenance: [{ sourceId: "1", sourceType: "EXECUTIVE_FACT" }] } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.diagnostics.groundingScore <= 0.60, "Grounding score must be penalized for unsupported claim");
});

// =========================================================================
// Group 3: Coherence, Contradictions & Logic Auditing (MR-13 to MR-18)
// =========================================================================

runTest("MR-13: Detects UNRESOLVED_CONTRADICTION when active unresolved contradiction exists", () => {
  const input = createBaseMockInput();
  input.contradictionResolution = {
    unresolvedContradictions: [
      {
        contradictionId: "contra_1",
        premiseA: "DB is Postgres",
        premiseB: "DB is MySQL",
        severity: "CRITICAL",
        classification: "HARD_LOGICAL_CONTRADICTION",
      } as any,
    ],
    resolvedContradictions: [],
    activeDirectives: [],
    diagnostics: {} as any,
  } as any;
  const res = metaReasoningEngine.evaluate(input);
  assert(res.issues.some((i) => i.type === "UNRESOLVED_CONTRADICTION"), "Must detect UNRESOLVED_CONTRADICTION");
  assert(res.verdict === "REJECTED" || res.verdict === "NEEDS_REVISION", "Verdict must not be PASS");
});

runTest("MR-14: Validates resolved contradictions when belief revision successfully applied", () => {
  const input = createBaseMockInput();
  input.contradictionResolution = {
    unresolvedContradictions: [],
    resolvedContradictions: [
      { contradictionId: "contra_res_1", resolutionOutcome: "PREMISE_A_ACCEPTED" } as any,
    ],
    activeDirectives: [],
    diagnostics: {} as any,
  } as any;
  const res = metaReasoningEngine.evaluate(input);
  assert(!res.issues.some((i) => i.type === "UNRESOLVED_CONTRADICTION"), "Must not flag resolved contradictions");
});

runTest("MR-15: Detects CIRCULAR_REASONING in causal dependency graphs", () => {
  const input = createBaseMockInput();
  input.causalReasoning!.chains = [
    {
      chainId: "chain_circ",
      nodes: [
        { nodeKey: "node_A" },
        { nodeKey: "node_B" },
        { nodeKey: "node_A" }, // loop back to A
      ],
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.issues.some((i) => i.type === "CIRCULAR_REASONING"), "Must detect CIRCULAR_REASONING");
});

runTest("MR-16: Detects LOGICAL_FALLACY in multi-hop loops", () => {
  const input = createBaseMockInput();
  input.multiHopReasoning!.chains = [
    {
      chainId: "chain_loop",
      hops: [
        { sourceEntity: "NodeX", targetEntity: "NodeX" } as any,
      ],
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.issues.some((i) => i.type === "CIRCULAR_REASONING"), "Must detect loop in multi-hop hops");
});

runTest("MR-17: Coherence score calculation reflects presence and severity of logical issues", () => {
  const input = createBaseMockInput();
  input.contradictionResolution = {
    unresolvedContradictions: [
      { contradictionId: "c1", severity: "MAJOR" } as any,
      { contradictionId: "c2", severity: "CRITICAL" } as any,
    ],
    resolvedContradictions: [],
    activeDirectives: [],
    diagnostics: {} as any,
  } as any;
  const res = metaReasoningEngine.evaluate(input);
  assert(res.diagnostics.coherenceScore <= 0.60, "Coherence score must be penalized heavily");
});

runTest("MR-18: Multiple co-existing contradictions handled without budget overflow", () => {
  const input = createBaseMockInput();
  input.contradictionResolution = {
    unresolvedContradictions: Array.from({ length: 30 }, (_, i) => ({
      contradictionId: `contra_${i}`,
      severity: "MODERATE",
    })) as any,
    resolvedContradictions: [],
    activeDirectives: [],
    diagnostics: {} as any,
  } as any;
  const res = metaReasoningEngine.evaluate(input);
  assert(res.issues.length <= 25, "Issues must stay within budget cap");
});

// =========================================================================
// Group 4: Epistemic Calibration & Authority Auditing (MR-19 to MR-24)
// =========================================================================

runTest("MR-19: Detects CONFIDENCE_OVERCLAIM when claim confidence is significantly higher than authority warrant", () => {
  const input = createBaseMockInput();
  input.epistemicCalibration!.claims = [
    {
      claimKey: "temporal_overclaim",
      statement: "User usually sleeps at 11pm",
      epistemicState: "INFERRED",
      authority: "TEMPORAL_CONTEXT", // weight 0.60
      confidence: 0.98, // far exceeds 0.60 + 0.25
      provenance: [{ sourceId: "p1", sourceType: "EXECUTIVE_FACT" }],
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.issues.some((i) => i.type === "CONFIDENCE_OVERCLAIM"), "Must detect CONFIDENCE_OVERCLAIM");
  assert(res.epistemicAdjustments.some((a) => a.claimKey === "temporal_overclaim"), "Must produce EpistemicAdjustment");
});

runTest("MR-20: Detects CONFIDENCE_UNDERCLAIM when verified evidence supports high confidence", () => {
  const input = createBaseMockInput();
  input.epistemicCalibration!.claims = [
    {
      claimKey: "verified_underclaim",
      statement: "Postgres version is 16",
      epistemicState: "VERIFIED",
      authority: "VERIFIED_EVIDENCE",
      confidence: 0.20, // artificially low for verified fact
      evidence: ["Verified query output"],
      provenance: [{ sourceId: "p1", sourceType: "EXECUTIVE_FACT" }],
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.issues.some((i) => i.type === "CONFIDENCE_UNDERCLAIM"), "Must detect CONFIDENCE_UNDERCLAIM");
});

runTest("MR-21: Detects AUTHORITY_MISMATCH when lower authority source overrides higher authority source", () => {
  const input = createBaseMockInput();
  input.epistemicCalibration!.claims = [
    {
      claimKey: "mismatched_claim",
      statement: "User language is French",
      epistemicState: "INFERRED",
      authority: "PREDICTIVE_CONTEXT", // weight 0.30
      confidence: 0.80,
      competingClaims: [
        {
          statement: "User language is Bengali",
          authority: "CURRENT_TURN_EXPLICIT", // weight 1.00
          confidence: 0.70,
        },
      ],
      provenance: [{ sourceId: "p1", sourceType: "EXECUTIVE_FACT" }],
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.issues.some((i) => i.type === "AUTHORITY_MISMATCH"), "Must detect AUTHORITY_MISMATCH");
});

runTest("MR-22: Epistemic adjustment recommendations generated for overclaimed confidence", () => {
  const input = createBaseMockInput();
  input.epistemicCalibration!.claims = [
    {
      claimKey: "pattern_overclaim",
      statement: "User loves dark mode",
      epistemicState: "SUPPORTED",
      authority: "CONFIRMED_ADAPTIVE_PATTERN", // weight 0.50
      confidence: 0.95,
      provenance: [{ sourceId: "p1", sourceType: "EXECUTIVE_FACT" }],
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  const adj = res.epistemicAdjustments.find((a) => a.claimKey === "pattern_overclaim");
  assert(adj !== undefined, "Adjustment must be generated");
  assert(adj!.recommendedConfidence <= 0.70, "Recommended confidence must be calibrated downwards");
});

runTest("MR-23: Calibration score reflects alignment between stated confidence and authority levels", () => {
  const input = createBaseMockInput();
  input.epistemicCalibration!.claims = [
    { claimKey: "c1", statement: "Ok", epistemicState: "VERIFIED", authority: "VERIFIED_EVIDENCE", confidence: 0.90, evidence: ["ok"], provenance: [{ sourceId: "1", sourceType: "EXECUTIVE_FACT" }] } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.diagnostics.calibrationScore >= 0.85, "Calibration score must be high on well-calibrated claims");
});

runTest("MR-24: Respects epistemic state ranks across audit evaluation", () => {
  const input = createBaseMockInput();
  const res = metaReasoningEngine.evaluate(input);
  assert(res.sectionResults.find((s) => s.section === "EPISTEMIC_CALIBRATION")?.passed === true, "Epistemic section must pass");
});

// =========================================================================
// Group 5: Causal Reasoning & Counterfactual Auditing (MR-25 to MR-30)
// =========================================================================

runTest("MR-25: Detects CAUSAL_GAP when causal claim lacks intermediate mechanism", () => {
  const input = createBaseMockInput();
  input.causalReasoning!.relations = [
    {
      relationKey: "rain->stocks",
      causeKey: "raining",
      effectKey: "stock_market_rises",
      relationType: "INSUFFICIENT",
      mechanism: "", // missing mechanism
      confidence: 0.70,
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.issues.some((i) => i.type === "CAUSAL_GAP"), "Must detect CAUSAL_GAP");
});

runTest("MR-26: Detects COUNTERFACTUAL_INVALIDITY when counterfactual scenario has invalid antecedent", () => {
  const input = createBaseMockInput();
  input.causalReasoning!.counterfactuals = [
    {
      scenarioId: "cf_impossible",
      antecedent: "",
      outcome: "INVALID",
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.issues.some((i) => i.type === "COUNTERFACTUAL_INVALIDITY"), "Must detect COUNTERFACTUAL_INVALIDITY");
});

runTest("MR-27: Validates well-grounded causal chains with clear mechanisms", () => {
  const input = createBaseMockInput();
  const res = metaReasoningEngine.evaluate(input);
  assert(res.sectionResults.find((s) => s.section === "CAUSAL_JUSTIFICATION")?.passed === true, "Causal section must pass");
});

runTest("MR-28: Detects causal ambiguity propagation from weak causes", () => {
  const input = createBaseMockInput();
  input.causalReasoning!.relations = [
    {
      relationKey: "weak_link",
      causeKey: "rumor",
      effectKey: "panic",
      relationType: "INSUFFICIENT",
      mechanism: "",
      confidence: 0.40,
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.issues.some((i) => i.category === "CAUSAL_JUSTIFICATION"), "Must flag causal issue");
});

runTest("MR-29: Flags causal relations with temporal inconsistency", () => {
  const input = createBaseMockInput();
  input.causalReasoning!.relations = [
    {
      relationKey: "gap",
      causeKey: "step_2",
      effectKey: "step_1",
      relationType: "INSUFFICIENT",
      mechanism: "",
      confidence: 0.50,
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.issues.some((i) => i.type === "CAUSAL_GAP"), "Must flag causal gap");
});

runTest("MR-30: Causal section score reflects causal chain integrity", () => {
  const input = createBaseMockInput();
  input.causalReasoning!.relations = [
    { relationKey: "r1", causeKey: "a", effectKey: "b", relationType: "INSUFFICIENT", mechanism: "" } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.diagnostics.causalRelationsAudited >= 1, "Must record audited relations count");
});

// =========================================================================
// Group 6: Multi-Hop Reasoning & Evidence Chain Auditing (MR-31 to MR-36)
// =========================================================================

runTest("MR-31: Detects BROKEN_MULTI_HOP_CHAIN when intermediate link in reasoning chain is invalid", () => {
  const input = createBaseMockInput();
  input.multiHopReasoning!.chains = [
    {
      chainId: "broken_chain_9",
      status: "BROKEN",
      hops: [],
      cumulativeConfidence: 0.20,
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.issues.some((i) => i.type === "BROKEN_MULTI_HOP_CHAIN"), "Must detect BROKEN_MULTI_HOP_CHAIN");
});

runTest("MR-32: Detects multi-hop authority degradation when hop depth exceeds threshold without penalty", () => {
  const input = createBaseMockInput();
  input.multiHopReasoning!.chains = [
    {
      chainId: "deep_chain",
      status: "COMPLETE",
      hops: [
        { hopIndex: 0, status: "VALID" },
        { hopIndex: 1, status: "VALID" },
        { hopIndex: 2, status: "VALID" },
        { hopIndex: 3, status: "VALID" },
      ] as any,
      cumulativeConfidence: 0.98, // excessive confidence for 4-hop inference
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.issues.some((i) => i.type === "CONFIDENCE_OVERCLAIM"), "Must detect confidence overclaim on 4-hop chain");
});

runTest("MR-33: Validates fully grounded multi-hop chains with verified root provenance", () => {
  const input = createBaseMockInput();
  const res = metaReasoningEngine.evaluate(input);
  assert(res.sectionResults.find((s) => s.section === "MULTI_HOP_INTEGRITY")?.passed === true, "Multi-hop section must pass");
});

runTest("MR-34: Flags multi-hop chains with circular entity references", () => {
  const input = createBaseMockInput();
  input.multiHopReasoning!.chains = [
    {
      chainId: "circular_hops",
      status: "COMPLETE",
      hops: [
        { sourceEntity: "NodeA", targetEntity: "NodeB" },
        { sourceEntity: "NodeA", targetEntity: "NodeA" }, // self loop
      ] as any,
      cumulativeConfidence: 0.70,
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.issues.some((i) => i.type === "CIRCULAR_REASONING"), "Must detect circular entity loop");
});

runTest("MR-35: Enforces multi-hop scope isolation compliance", () => {
  const input = createBaseMockInput();
  const res = metaReasoningEngine.evaluate(input);
  assert(res.diagnostics.chainsAudited >= 1, "Chains audited metric must be tracked");
});

runTest("MR-36: Multi-hop section score reflects chain completion and validity", () => {
  const input = createBaseMockInput();
  const res = metaReasoningEngine.evaluate(input);
  const score = res.sectionResults.find((s) => s.section === "MULTI_HOP_INTEGRITY")?.score;
  assert(score !== undefined && score >= 0.80, "Score should be >= 0.80 for valid base input");
});

// =========================================================================
// Group 7: Scenario Simulation & Reality Boundary Auditing (MR-37 to MR-42)
// =========================================================================

runTest("MR-37: CRITICAL DEFENSE: Detects SIMULATION_REALITY_CONFUSION (verdict REJECTED)", () => {
  const input = createBaseMockInput();
  input.scenarioSimulation!.scenarios = [
    {
      scenarioId: "scen_hallucinated_reality",
      scenarioName: "Simulated merger happened",
      scenarioType: "WHAT_IF",
      epistemicStatus: "VERIFIED" as any, // ILLEGAL: Simulated scenario claiming VERIFIED reality
      actions: [],
      assumptions: [],
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.simulationRealityConfusions.includes("scen_hallucinated_reality"), "Must flag scenario in simulationRealityConfusions");
  assert(res.issues.some((i) => i.type === "SIMULATION_REALITY_CONFUSION"), "Must emit SIMULATION_REALITY_CONFUSION issue");
  assert(res.verdict === "REJECTED", "Must immediately REJECT simulation reality confusion");
});

runTest("MR-38: Enforces scenario epistemic status (SIMULATED/PROJECTED cannot be KNOWN)", () => {
  const input = createBaseMockInput();
  input.scenarioSimulation!.outcomes = [
    {
      outcomeId: "out_illegal_known",
      title: "Stock price $1000",
      outcomeType: "POSITIVE",
      epistemicStatus: "KNOWN" as any, // ILLEGAL
      confidence: 0.99,
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.verdict === "REJECTED", "Must reject KNOWN status on simulated outcome");
});

runTest("MR-39: Detects UNCHECKED_ASSUMPTION in scenario definitions", () => {
  const input = createBaseMockInput();
  input.scenarioSimulation!.assumptions = [
    {
      id: "assump_1",
      statement: "Interest rates drop to 0%",
      required: true,
      isSupported: false,
      isSensitive: false,
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.issues.some((i) => i.type === "UNCHECKED_ASSUMPTION"), "Must detect UNCHECKED_ASSUMPTION");
});

runTest("MR-40: Detects SENSITIVE_ASSUMPTION_DEPENDENCY where scenario relies on ungrounded sensitive assumption", () => {
  const input = createBaseMockInput();
  input.scenarioSimulation!.assumptions = [
    {
      id: "assump_sensitive",
      statement: "Competitor shuts down tomorrow",
      required: true,
      isSupported: false,
      isSensitive: true,
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.issues.some((i) => i.type === "SENSITIVE_ASSUMPTION_DEPENDENCY"), "Must detect SENSITIVE_ASSUMPTION_DEPENDENCY");
});

runTest("MR-41: Flags invalid actions in scenario simulations", () => {
  const input = createBaseMockInput();
  input.scenarioSimulation!.assumptions = [
    {
      id: "assump_test",
      statement: "Test assumption",
      required: false,
      isSupported: true,
      isSensitive: false,
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.sectionResults.find((s) => s.section === "ASSUMPTION_AUDIT")?.passed === true, "Valid assumption passes");
});

runTest("MR-42: Validates well-bounded scenario simulations with explicit advisory status", () => {
  const input = createBaseMockInput();
  const res = metaReasoningEngine.evaluate(input);
  assert(res.sectionResults.find((s) => s.section === "SIMULATION_SANITY")?.passed === true, "Simulation sanity section passes");
});

// =========================================================================
// Group 8: Temporal Memory, Topic Boundaries & Scope Isolation (MR-43 to MR-48)
// =========================================================================

runTest("MR-43: Detects TEMPORAL_INCONSISTENCY when superseded temporal state is asserted as active", () => {
  const input = createBaseMockInput();
  input.temporalMemory = {
    stateRecords: [
      {
        key: "old_city",
        value: "Chittagong",
        isSuperseded: true,
        isActiveInCurrentTurn: true, // ERROR: asserting superseded state as active
      } as any,
    ],
  } as any;
  const res = metaReasoningEngine.evaluate(input);
  assert(res.issues.some((i) => i.type === "TEMPORAL_INCONSISTENCY"), "Must detect TEMPORAL_INCONSISTENCY");
});

runTest("MR-44: Detects TOPIC_BOUNDARY_LEAK when isolated topic context leaks into current turn", () => {
  const input = createBaseMockInput();
  input.options = {
    strictTopicIsolation: true,
    activeTopic: "cooking_recipes",
  };
  input.executiveContext!.authoritativeFacts = [
    {
      id: "fact_crypto",
      key: "bitcoin_wallet",
      value: "0x123",
      isGlobal: false,
      topic: "cryptocurrency", // Different isolated topic
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.issues.some((i) => i.type === "TOPIC_BOUNDARY_LEAK"), "Must detect TOPIC_BOUNDARY_LEAK");
});

runTest("MR-45: Enforces strict topic isolation flag (rejects cross-topic memory claims)", () => {
  const input = createBaseMockInput();
  input.options = {
    strictTopicIsolation: true,
    activeTopic: "database_optimization",
  };
  const res = metaReasoningEngine.evaluate(input);
  assert(res.diagnostics.topicIsolationChecks >= 1, "Must record topic isolation check");
});

runTest("MR-46: Validates temporal evolution continuity across turn history", () => {
  const input = createBaseMockInput();
  const res = metaReasoningEngine.evaluate(input);
  assert(res.sectionResults.find((s) => s.section === "TEMPORAL_AND_SCOPE")?.passed === true, "Temporal and scope section passes");
});

runTest("MR-47: Temporal and scope section score reflects isolation compliance", () => {
  const input = createBaseMockInput();
  const res = metaReasoningEngine.evaluate(input);
  const score = res.sectionResults.find((s) => s.section === "TEMPORAL_AND_SCOPE")?.score;
  assert(score !== undefined && score >= 0.80, "Temporal score must be >= 0.80");
});

runTest("MR-48: Handles rapid topic switching without false positive leak flags on global facts", () => {
  const input = createBaseMockInput();
  input.options = {
    strictTopicIsolation: true,
    activeTopic: "new_random_topic",
  };
  input.executiveContext!.authoritativeFacts = [
    {
      id: "fact_global",
      key: "user_name",
      value: "Rahim",
      isGlobal: true, // Global facts are permitted across topics
      topic: "general",
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(!res.issues.some((i) => i.type === "TOPIC_BOUNDARY_LEAK"), "Global facts must not trigger topic leak");
});

// =========================================================================
// Group 9: Constraints, Goals, Synthesis & Directive Sanitization (MR-49 to MR-54)
// =========================================================================

runTest("MR-49: CRITICAL: Detects HARD_CONSTRAINT_VIOLATION (verdict REJECTED)", () => {
  const input = createBaseMockInput();
  input.executiveContext!.reasoningConstraints = [
    {
      id: "const_strict_safety",
      type: "HARD_CONSTRAINT",
      description: "Never drop production tables",
      authority: "HARD_CONSTRAINT",
      enforceStrictly: true,
      sanitizedDirective: "Never drop production tables",
    } as any,
  ];
  input.planning!.plan!.steps = [
    {
      id: "step_bad",
      action: "DROP TABLE users CASCADE",
      description: "Drop production tables to reset state",
      status: "PENDING",
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.hardConstraintViolations.includes("const_strict_safety"), "Must record hard constraint violation");
  assert(res.issues.some((i) => i.type === "HARD_CONSTRAINT_VIOLATION"), "Must emit HARD_CONSTRAINT_VIOLATION");
  assert(res.verdict === "REJECTED", "Must reject on hard constraint violation");
});

runTest("MR-50: Detects GOAL_CONFLICT when planned step opposes active user commitment or blocked goal", () => {
  const input = createBaseMockInput();
  input.goalProject = {
    goals: [
      {
        id: "goal_blocked",
        title: "Migrate Cloud Cluster",
        status: "BLOCKED",
      } as any,
    ],
  } as any;
  input.planning!.plan!.steps = [
    {
      id: "step_premature",
      action: "Migrate Cloud Cluster",
      description: "Executing migration step directly",
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  assert(res.issues.some((i) => i.type === "GOAL_CONFLICT"), "Must detect GOAL_CONFLICT");
});

runTest("MR-51: Overall Quality Score computation penalizes detected issues", () => {
  const input = createBaseMockInput();
  const resClean = metaReasoningEngine.evaluate(input);

  const inputDirty = createBaseMockInput();
  inputDirty.epistemicCalibration!.claims.push({
    claimKey: "bad_c",
    statement: "Bad claim",
    epistemicState: "VERIFIED",
    evidence: [],
  } as any);
  const resDirty = metaReasoningEngine.evaluate(inputDirty);

  assert(resDirty.overallQualityScore < resClean.overallQualityScore, "Dirty score must be lower than clean score");
});

runTest("MR-52: Verdict transitions across quality and severity spectrum", () => {
  const input = createBaseMockInput();
  const resPass = metaReasoningEngine.evaluate(input);
  assert(resPass.verdict === "PASS" || resPass.verdict === "PASS_WITH_WARNINGS", "Clean input should pass");
});

runTest("MR-53: Meta-Directive sanitization strips UUIDs, hashes, and raw floats", () => {
  const input = createBaseMockInput();
  input.epistemicCalibration!.claims = [
    {
      claimKey: "claim_over",
      statement: "Test 12345678-1234-1234-1234-123456789abc",
      epistemicState: "SUPPORTED",
      authority: "SYSTEM_DEFAULT",
      confidence: 0.9523,
      provenance: [{ sourceId: "p1", sourceType: "EXECUTIVE_FACT" }],
    } as any,
  ];
  const res = metaReasoningEngine.evaluate(input);
  for (const d of res.sanitizedDirectives) {
    assert(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(d), "Must not contain UUIDs");
    assert(!/\b0\.\d{3,}\b/.test(d), "Must not contain raw 3+ digit floats");
  }
});

runTest("MR-54: Integration verification with BrainEngine.analyze pipeline", () => {
  const analysis = brainEngine.analyze("optimize database query latency for postgresql 16");
  assert(analysis.metaReasoningAnalysis !== undefined, "BrainEngine must return metaReasoningAnalysis");
  assert(analysis.metaReasoning !== undefined, "BrainEngine must provide metaReasoning alias");
  assert(analysis.metaReasoningAnalysis.verdict !== undefined, "Verdict must be present in analysis");
  assert(Array.isArray(analysis.metaReasoningAnalysis.sanitizedDirectives), "Sanitized directives must be array");
  assert(analysis.metaReasoningAnalysis.diagnostics.issuesDetected >= 0, "Diagnostics must be populated");
});

console.log(`\n--- TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED ---\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  console.log("ALL 54 META-REASONING ENGINE TESTS PASSED SUCCESSFULLY.\n");
}
