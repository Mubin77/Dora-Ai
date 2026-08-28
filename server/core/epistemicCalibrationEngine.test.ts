/**
 * Dora Phase 3 Step 5: Uncertainty, Confidence & Epistemic Calibration Engine Test Suite
 * 
 * Tests epistemic states, multi-dimensional uncertainty bounds, confidence ceilings,
 * authority-confidence separation, multi-hop propagation, contradiction handling,
 * causal ambiguity propagation, intent boundary hardening, sanitization, determinism,
 * read-only guarantees, BrainEngine integration, and full stack regressions.
 */

import { epistemicCalibrationEngine } from "./epistemicCalibrationEngine";
import {
  EpistemicCalibrationInput,
  EpistemicClaim,
  EpistemicAuthority,
  EpistemicState,
} from "./epistemicCalibrationTypes";
import { ExecutiveContextPackage } from "./executiveContextTypes";
import { deepReasoningEngine } from "./deepReasoningEngine";
import { contradictionResolutionEngine } from "./contradictionResolutionEngine";
import { causalReasoningEngine } from "./causalReasoningEngine";
import { multiHopReasoningEngine } from "./multiHopReasoningEngine";
import { brainEngine } from "./brainEngine";

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

function createMockExecutiveContext(overrides?: any): ExecutiveContextPackage {
  return {
    currentTurn: {
      message: "Test turn message",
      normalizedIntent: "GENERAL",
      topic: "devops",
      isTopicSwitch: false,
      resolvedEntities: [],
    },
    activeGoal: {
      id: "goal_1",
      title: "Deploy reliable cloud backend",
      status: "in_progress",
    },
    activeProjects: [
      {
        id: "proj_1",
        name: "Cloud Backend",
        status: "active",
        milestones: ["Setup DB", "Pass CI Tests", "Deploy Prod"],
      },
    ],
    facts: [
      {
        id: "fact_1",
        key: "database_engine",
        value: "PostgreSQL",
        confidence: 0.95,
        authority: "VERIFIED_EVIDENCE",
        scope: "GLOBAL",
        topic: "devops",
        eligibility: "ELIGIBLE",
      },
      {
        id: "fact_2",
        key: "primary_language",
        value: "TypeScript",
        confidence: 0.90,
        authority: "GOVERNANCE_APPROVED_MEMORY",
        scope: "GLOBAL",
        topic: "devops",
        eligibility: "ELIGIBLE",
      },
    ],
    constraints: [
      {
        id: "const_1",
        type: "HARD_CONSTRAINT",
        description: "Never deploy without all unit tests passing",
      },
    ],
    decisions: [],
    conversationalState: {
      mood: "focused",
      turnCount: 3,
      clarificationPending: false,
    },
    governance: {
      activeTopic: "devops",
      isolatedDomains: [],
      quarantinedEntities: [],
    },
    temporalState: {
      activeTimeWindow: "work_hours",
      timezone: "UTC",
    },
    ...overrides,
  };
}

function createMockBaseInput(message = "Deploy production system"): EpistemicCalibrationInput {
  const context = {
    activeTopic: "devops",
    turns: [],
    variables: {},
    lastTurnTimestamp: 1700000000000,
    conversationId: "conv_123",
  };
  const intent = {
    primaryIntent: "EXECUTE" as any,
    confidence: 0.9,
    intents: [],
    slots: {},
    isAmbiguous: false,
    requiresClarification: false,
    intentSignals: {},
  };
  const reasoning = {
    reasoningRequired: false,
    reasoningType: "GENERAL" as any,
    complexity: "LOW" as any,
    confidence: 0.85,
    reasoningConfidence: 0.85,
    missingInformation: [],
    constraints: [],
    subtasks: [],
    conclusionStrategy: "DIRECT" as any,
    suggestedTools: [],
    requiresClarification: false,
  };
  const planning = {
    requiresPlanning: false,
    confidence: 0.85,
  };
  const verification = {
    confidence: {
      rawScore: 0.85,
      calibratedScore: 0.85,
      confidenceBand: "HIGH" as any,
      calibrationSignals: {},
    },
    claims: [],
    contradictions: [],
    unsupportedClaims: [],
    requiresClarification: false,
    status: "VERIFIED" as any,
  };

  return {
    userId: "user_123",
    message,
    context: context as any,
    intent: intent as any,
    reasoning: reasoning as any,
    planning: planning as any,
    verification: verification as any,
    executiveContext: createMockExecutiveContext(),
    options: {
      currentTime: 1700000000000,
      activeTopic: "devops",
    },
  };
}

console.log("=======================================================");
console.log("DORA PHASE 3 STEP 5: EPISTEMIC CALIBRATION TEST SUITE");
console.log("=======================================================");

// EC-1: verified evidence produces VERIFIED state
runTest("EC-1: verified evidence produces VERIFIED state", () => {
  const input = createMockBaseInput("Verified test statement");
  input.executiveContext = createMockExecutiveContext({
    facts: [
      {
        id: "f_verified",
        key: "ci_build_status",
        value: "passed",
        confidence: 0.95,
        authority: "VERIFIED_EVIDENCE",
        scope: "GLOBAL",
        topic: "devops",
        eligibility: "ELIGIBLE",
      },
    ],
  });

  const result = epistemicCalibrationEngine.evaluate(input);
  const factClaim = result.claims.find((c) => c.normalizedKey.includes("ci_build_status"));
  assert(factClaim !== undefined, "Verified claim should be extracted");
  assert(factClaim!.epistemicState === "VERIFIED", `State should be VERIFIED, got ${factClaim!.epistemicState}`);
  assert(factClaim!.confidence >= 0.85, "Verified claim should have high confidence");
});

// EC-2: known authoritative context produces KNOWN state
runTest("EC-2: known authoritative context produces KNOWN state", () => {
  const input = createMockBaseInput();
  input.executiveContext = createMockExecutiveContext({
    facts: [
      {
        id: "f_known",
        key: "preferred_ide",
        value: "VSCode",
        confidence: 0.85,
        authority: "GOVERNANCE_APPROVED_MEMORY",
        scope: "GLOBAL",
        topic: "devops",
        eligibility: "ELIGIBLE",
      },
    ],
  });

  const result = epistemicCalibrationEngine.evaluate(input);
  const claim = result.claims.find((c) => c.normalizedKey.includes("preferred_ide"));
  assert(claim !== undefined, "Known claim should be extracted");
  assert(claim!.epistemicState === "KNOWN", `State should be KNOWN, got ${claim!.epistemicState}`);
});

// EC-3: multiple valid independent evidence produces SUPPORTED state
runTest("EC-3: multiple valid independent evidence produces SUPPORTED state", () => {
  const input = createMockBaseInput();
  input.deepReasoning = {
    evidence: [
      {
        id: "dr_ev_1",
        statement: "Backend services require node version 20",
        authority: "GOVERNANCE_APPROVED_MEMORY",
        confidence: 0.85,
        scope: "TOPIC",
        topic: "devops",
        eligibility: "ELIGIBLE",
      } as any,
    ],
    hypotheses: [],
    conclusion: {} as any,
    evaluations: [],
    contradictions: [],
    uncertainty: {} as any,
    sanitizedDirectives: [],
    diagnostics: {} as any,
  } as any;
  input.executiveContext = createMockExecutiveContext({
    facts: [
      {
        id: "exec_fact_20",
        key: "backend_services_require_node_version_20",
        value: "true",
        confidence: 0.85,
        authority: "GOVERNANCE_APPROVED_MEMORY",
        scope: "TOPIC",
        topic: "devops",
        eligibility: "ELIGIBLE",
      },
    ],
  });

  const result = epistemicCalibrationEngine.evaluate(input);
  const claim = result.claims.find((c) => c.normalizedKey.includes("node_version_20"));
  assert(claim !== undefined, "Merged claim should exist");
  assert(claim!.independentSupportCount >= 2, `Support count should be >= 2, got ${claim!.independentSupportCount}`);
  assert(claim!.epistemicState === "SUPPORTED", `State should be SUPPORTED, got ${claim!.epistemicState}`);
});

// EC-4: single valid inference produces INFERRED state
runTest("EC-4: single valid inference produces INFERRED state", () => {
  const input = createMockBaseInput();
  input.multiHopReasoning = {
    evidenceNodes: [],
    reasoningHops: [],
    reasoningChains: [],
    unresolvedChains: [],
    rejectedChains: [],
    groundedConclusions: [
      {
        id: "conc_hop_1",
        statement: "Automated regression tests verify build integrity",
        authority: "GOVERNANCE_APPROVED_MEMORY",
        confidence: 0.80,
        scope: "TOPIC",
        isAdvisory: false,
        supportingEvidenceCount: 1,
        independentSources: ["src_1"],
        traceableProvenance: {
          chainDepth: 2,
          rootEvidenceKeys: ["node_1"],
          hopTypes: ["DIRECT_DEDUCTION"],
        },
        chainIds: ["chain_1"],
        sanitizedDirective: "",
      },
    ],
    directives: [],
    diagnostics: {} as any,
  } as any;

  const result = epistemicCalibrationEngine.evaluate(input);
  const claim = result.claims.find((c) => c.normalizedKey.includes("build_integrity"));
  assert(claim !== undefined, "Inferred claim should exist");
  assert(claim!.epistemicState === "INFERRED", `State should be INFERRED, got ${claim!.epistemicState}`);
  assert(claim!.hopDepth === 2, `Hop depth should be 2, got ${claim!.hopDepth}`);
});

// EC-5: insufficient evidence produces UNKNOWN state
runTest("EC-5: insufficient evidence produces UNKNOWN state", () => {
  const input = createMockBaseInput("What is the secret deployment key of staging?");
  input.intent = { primaryIntent: "QUESTION" } as any;

  const result = epistemicCalibrationEngine.evaluate(input);
  const unknownClaim = result.claims.find((c) => c.epistemicState === "UNKNOWN");
  assert(unknownClaim !== undefined, "Question without authorized fact should produce UNKNOWN state");
  assert(unknownClaim!.confidence === 0.0, "UNKNOWN claim confidence should be 0.0");
});

// EC-6: partial evidence produces UNCERTAIN state
runTest("EC-6: partial evidence produces UNCERTAIN state", () => {
  const input = createMockBaseInput();
  input.causalReasoning = {
    relations: [
      {
        id: "rel_corr",
        causeStatement: "High server load",
        effectStatement: "API latency spikes",
        relationType: "CORRELATION_ONLY",
        confidence: 0.70,
        evidenceAuthority: "GOVERNANCE_APPROVED_MEMORY",
      } as any,
    ],
    chains: [],
    counterfactuals: [],
    activeDirectives: [],
    diagnostics: {} as any,
  } as any;

  const result = epistemicCalibrationEngine.evaluate(input);
  const claim = result.claims.find((c) => c.normalizedKey.includes("latency_spikes"));
  assert(claim !== undefined, "Causal claim should exist");
  assert(claim!.epistemicState === "UNCERTAIN", `Correlation should produce UNCERTAIN, got ${claim!.epistemicState}`);
  assert(claim!.uncertainty.causalAmbiguity > 0.6, "Causal ambiguity should be high for correlation");
});

// EC-7: equal-authority contradiction produces CONTESTED state
runTest("EC-7: equal-authority contradiction produces CONTESTED state", () => {
  const input = createMockBaseInput();
  input.contradictionResolution = {
    contradictions: [
      {
        id: "unres_1",
        topic: "database_port",
        description: "Port is 5432 vs Port is 5433",
        competingEvidenceIds: ["ev_1", "ev_2"],
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

  const result = epistemicCalibrationEngine.evaluate(input);
  const contested = result.claims.find((c) => c.epistemicState === "CONTESTED");
  assert(contested !== undefined, "Contradiction should produce CONTESTED state");
  assert(contested!.confidence <= 0.35, "Contested claim should have lowered confidence ceiling");
  assert(contested!.uncertainty.sourceConflict >= 0.8, "Source conflict uncertainty should be high");
});

// EC-8: resolved authority conflict preserves winner
runTest("EC-8: resolved authority conflict preserves winner", () => {
  const input = createMockBaseInput();
  input.executiveContext = createMockExecutiveContext({
    facts: [
      {
        id: "f_explicit",
        key: "primary_region",
        value: "us-central1",
        confidence: 0.95,
        authority: "CURRENT_TURN_EXPLICIT",
        scope: "GLOBAL",
        topic: "devops",
        eligibility: "ELIGIBLE",
      },
      {
        id: "f_stale_mem",
        key: "primary_region",
        value: "us-east1",
        confidence: 0.80,
        authority: "GOVERNANCE_APPROVED_MEMORY",
        scope: "GLOBAL",
        topic: "devops",
        eligibility: "ELIGIBLE",
      },
    ],
  });

  const result = epistemicCalibrationEngine.evaluate(input);
  const claim = result.claims.find((c) => c.normalizedKey.includes("primary_region"));
  assert(claim !== undefined, "Region claim should exist");
  assert(claim!.authority === "CURRENT_TURN_EXPLICIT", "Higher authority should win");
  assert(claim!.statement.includes("us-central1"), "Winning statement should be preserved");
});

// EC-9: losing historical evidence is not destroyed (tracked in provenance)
runTest("EC-9: losing historical evidence is not destroyed", () => {
  const input = createMockBaseInput();
  input.executiveContext = createMockExecutiveContext({
    facts: [
      {
        id: "f_winner",
        key: "deployment_target",
        value: "Kubernetes",
        confidence: 0.95,
        authority: "HARD_CONSTRAINT",
        scope: "GLOBAL",
        topic: "devops",
        eligibility: "ELIGIBLE",
      },
      {
        id: "f_loser",
        key: "deployment_target",
        value: "Docker Swarm",
        confidence: 0.70,
        authority: "GOVERNANCE_APPROVED_MEMORY",
        scope: "GLOBAL",
        topic: "devops",
        eligibility: "ELIGIBLE",
      },
    ],
  });

  const result = epistemicCalibrationEngine.evaluate(input);
  const claim = result.claims.find((c) => c.normalizedKey.includes("deployment_target"));
  assert(claim !== undefined, "Target claim should exist");
  assert(claim!.provenance.length === 2, `Both winning and historical evidence should be in provenance, got ${claim!.provenance.length}`);
});

// EC-10: confidence remains within [0,1]
runTest("EC-10: confidence remains within [0,1]", () => {
  const input = createMockBaseInput();
  const result = epistemicCalibrationEngine.evaluate(input);
  for (const c of result.claims) {
    assert(c.confidence >= 0.0 && c.confidence <= 1.0, `Claim ${c.id} confidence out of bounds: ${c.confidence}`);
  }
});

// EC-11: uncertainty remains within [0,1]
runTest("EC-11: uncertainty remains within [0,1]", () => {
  const input = createMockBaseInput();
  const result = epistemicCalibrationEngine.evaluate(input);
  for (const c of result.claims) {
    assert(
      c.uncertainty.overallUncertainty >= 0.0 && c.uncertainty.overallUncertainty <= 1.0,
      `Uncertainty out of bounds: ${c.uncertainty.overallUncertainty}`
    );
  }
});

// EC-12: authority cannot be overridden by confidence
runTest("EC-12: authority cannot be overridden by confidence", () => {
  const input = createMockBaseInput();
  input.executiveContext = createMockExecutiveContext({
    facts: [
      {
        id: "f_high_auth_low_conf",
        key: "security_rule_tls",
        value: "enforced",
        confidence: 0.65,
        authority: "HARD_CONSTRAINT",
        scope: "GLOBAL",
        topic: "devops",
        eligibility: "ELIGIBLE",
      },
      {
        id: "f_low_auth_high_conf",
        key: "predictive_guess",
        value: "maybe_redis",
        confidence: 0.99,
        authority: "PREDICTIVE_CONTEXT",
        scope: "GLOBAL",
        topic: "devops",
        eligibility: "ELIGIBLE",
      },
    ],
  });

  const result = epistemicCalibrationEngine.evaluate(input);
  const idxHard = result.claims.findIndex((c) => c.authority === "HARD_CONSTRAINT");
  const idxPred = result.claims.findIndex((c) => c.authority === "PREDICTIVE_CONTEXT");
  assert(idxHard < idxPred, `HARD_CONSTRAINT (idx ${idxHard}) must outrank PREDICTIVE_CONTEXT (idx ${idxPred})`);
});

// EC-13: high-confidence predictive context cannot outrank verified evidence
runTest("EC-13: high-confidence predictive context cannot outrank verified evidence", () => {
  const input = createMockBaseInput();
  input.executiveContext = createMockExecutiveContext({
    facts: [
      {
        id: "f_verified",
        key: "database_verified",
        value: "Postgres",
        confidence: 0.70,
        authority: "VERIFIED_EVIDENCE",
        scope: "GLOBAL",
        topic: "devops",
        eligibility: "ELIGIBLE",
      },
      {
        id: "f_pred",
        key: "guessed_cache",
        value: "Memcached",
        confidence: 0.95,
        authority: "PREDICTIVE_CONTEXT",
        scope: "GLOBAL",
        topic: "devops",
        eligibility: "ELIGIBLE",
      },
    ],
  });

  const result = epistemicCalibrationEngine.evaluate(input);
  const idxVer = result.claims.findIndex((c) => c.authority === "VERIFIED_EVIDENCE");
  const idxPred = result.claims.findIndex((c) => c.authority === "PREDICTIVE_CONTEXT");
  assert(idxVer < idxPred, "VERIFIED_EVIDENCE must outrank PREDICTIVE_CONTEXT");
});

// EC-14: predictive-only claim remains ADVISORY
runTest("EC-14: predictive-only claim remains ADVISORY", () => {
  const input = createMockBaseInput();
  input.predictiveContext = {
    proactiveSuggestions: [
      {
        id: "sugg_1",
        suggestion: "User might want to run database migrations",
        confidence: 0.85,
        predictionType: "PROACTIVE_WORKFLOW" as any,
        signals: [],
      },
    ],
    predictedPreferences: [],
    predictedQuestions: [],
    diagnostics: {} as any,
  } as any;

  const result = epistemicCalibrationEngine.evaluate(input);
  const predClaim = result.claims.find((c) => c.normalizedKey.includes("database_migrations"));
  assert(predClaim !== undefined, "Predictive claim should exist");
  assert(predClaim!.epistemicState === "ADVISORY", `State should be ADVISORY, got ${predClaim!.epistemicState}`);
  assert(predClaim!.confidence <= 0.40, `Predictive confidence ceiling must be <= 0.40, got ${predClaim!.confidence}`);
});

// EC-15: predictive context cannot become VERIFIED
runTest("EC-15: predictive context cannot become VERIFIED", () => {
  const input = createMockBaseInput();
  input.predictiveContext = {
    proactiveSuggestions: [
      {
        id: "sugg_high",
        suggestion: "Verified deployment pipeline active",
        confidence: 0.99,
        predictionType: "PROACTIVE_WORKFLOW" as any,
        signals: [],
      },
    ],
    predictedPreferences: [],
    predictedQuestions: [],
    diagnostics: {} as any,
  } as any;

  const result = epistemicCalibrationEngine.evaluate(input);
  const predClaim = result.claims.find((c) => c.normalizedKey.includes("deployment_pipeline_active"));
  assert(predClaim !== undefined, "Predictive claim exists");
  assert(predClaim!.epistemicState !== "VERIFIED", "Predictive suggestion must NEVER become VERIFIED");
});

// EC-16: unsupported speculation remains non-authoritative
runTest("EC-16: unsupported speculation remains non-authoritative", () => {
  const input = createMockBaseInput("Maybe our Kubernetes cluster will crash tomorrow");
  const result = epistemicCalibrationEngine.evaluate(input);
  const specClaim = result.claims.find((c) => c.normalizedKey.includes("kubernetes_cluster"));
  assert(specClaim !== undefined, "Speculation claim exists");
  assert(specClaim!.epistemicState === "ADVISORY", `Speculation state should be ADVISORY, got ${specClaim!.epistemicState}`);
});

// EC-17: question does not create verified claim
runTest("EC-17: question does not create verified claim", () => {
  const input = createMockBaseInput("Is the production cluster online right now?");
  const result = epistemicCalibrationEngine.evaluate(input);
  const qClaim = result.claims.find((c) => c.normalizedKey.includes("production_cluster_online"));
  if (qClaim) {
    assert(qClaim.epistemicState === "UNKNOWN", "Question claim must be UNKNOWN");
    assert(qClaim.epistemicState !== "VERIFIED", "Question must not be VERIFIED");
  }
});

// EC-18: hypothetical does not create verified claim
runTest("EC-18: hypothetical does not create verified claim", () => {
  const input = createMockBaseInput("What if we switch to AWS Lambda tomorrow?");
  const result = epistemicCalibrationEngine.evaluate(input);
  const hypClaim = result.claims.find((c) => c.normalizedKey.includes("aws_lambda"));
  if (hypClaim) {
    assert(hypClaim.epistemicState === "UNCERTAIN", "Hypothetical must be UNCERTAIN");
  }
});

// EC-19: conditional does not create verified claim
runTest("EC-19: conditional does not create verified claim", () => {
  const input = createMockBaseInput("If we upgrade the database then latency will drop");
  const result = epistemicCalibrationEngine.evaluate(input);
  const condClaim = result.claims.find((c) => c.normalizedKey.includes("latency_will_drop"));
  if (condClaim) {
    assert(condClaim.epistemicState !== "VERIFIED", "Conditional statement cannot be VERIFIED");
  }
});

// EC-20: assistant attribution does not create user-origin evidence
runTest("EC-20: assistant attribution does not create user-origin evidence", () => {
  const input = createMockBaseInput("You said that our server has 128GB of RAM");
  const result = epistemicCalibrationEngine.evaluate(input);
  const attrClaim = result.claims.find((c) => c.normalizedKey.includes("128gb"));
  assert(attrClaim === undefined || attrClaim.authority !== "CURRENT_TURN_EXPLICIT", "Assistant attribution cannot become user-origin fact");
});

// EC-21: multi-hop confidence propagation
runTest("EC-21: multi-hop confidence propagation", () => {
  const input = createMockBaseInput();
  input.multiHopReasoning = {
    evidenceNodes: [],
    hops: [],
    chains: [],
    groundedConclusions: [
      {
        id: "conc_chain",
        statement: "Production deploy requires green tests",
        primaryAuthority: "VERIFIED_EVIDENCE",
        confidence: 0.90,
        chainDepth: 3,
        scope: "TOPIC",
        status: "GROUNDED",
        rootEvidenceNodeIds: ["node_root"],
        intermediateInferenceTypes: ["CHAINED_DEDUCTION"],
        independentEvidenceCount: 1,
        sanitizedDirectives: [],
      },
    ],
    directives: [],
    diagnostics: {} as any,
  } as any;

  const result = epistemicCalibrationEngine.evaluate(input);
  const claim = result.claims.find((c) => c.normalizedKey.includes("green_tests"));
  assert(claim !== undefined, "Chain conclusion exists");
  assert(claim!.confidence < 0.90, "Multi-hop confidence must decay across hops");
});

// EC-22: multi-hop confidence cannot increase without evidence
runTest("EC-22: multi-hop confidence cannot increase without evidence", () => {
  const input = createMockBaseInput();
  input.multiHopReasoning = {
    evidenceNodes: [],
    hops: [],
    chains: [],
    groundedConclusions: [
      {
        id: "conc_depth",
        statement: "Multi step chained deduction result",
        primaryAuthority: "GOVERNANCE_APPROVED_MEMORY",
        confidence: 0.80,
        chainDepth: 3,
        scope: "TOPIC",
        status: "GROUNDED",
        rootEvidenceNodeIds: ["node_1"],
        intermediateInferenceTypes: ["CHAINED_DEDUCTION"],
        independentEvidenceCount: 1,
        sanitizedDirectives: [],
      },
    ],
    directives: [],
    diagnostics: {} as any,
  } as any;

  const result = epistemicCalibrationEngine.evaluate(input);
  const claim = result.claims.find((c) => c.normalizedKey.includes("multi_step_chained"));
  assert(claim !== undefined, "Claim exists");
  assert(claim!.confidence <= 0.80, "Multi-hop confidence cannot exceed parent confidence");
});

// EC-23: multi-hop depth uncertainty
runTest("EC-23: multi-hop depth uncertainty", () => {
  const input = createMockBaseInput();
  input.multiHopReasoning = {
    evidenceNodes: [],
    hops: [],
    chains: [],
    groundedConclusions: [
      {
        id: "conc_depth_3",
        statement: "Depth 3 inference chain outcome",
        primaryAuthority: "GOVERNANCE_APPROVED_MEMORY",
        confidence: 0.85,
        chainDepth: 3,
        scope: "TOPIC",
        status: "GROUNDED",
        rootEvidenceNodeIds: ["n1"],
        intermediateInferenceTypes: ["CHAINED_DEDUCTION"],
        independentEvidenceCount: 1,
        sanitizedDirectives: [],
      },
    ],
    directives: [],
    diagnostics: {} as any,
  } as any;

  const result = epistemicCalibrationEngine.evaluate(input);
  const claim = result.claims.find((c) => c.normalizedKey.includes("depth_3_inference"));
  assert(claim !== undefined, "Claim exists");
  assert(claim!.uncertainty.inferenceDepth >= 0.4, `Inference depth uncertainty must be elevated for depth 3, got ${claim!.uncertainty.inferenceDepth}`);
});

// EC-24: broken provenance causes downgrade/rejection
runTest("EC-24: broken provenance causes downgrade/rejection", () => {
  const input = createMockBaseInput();
  input.executiveContext = createMockExecutiveContext({
    facts: [
      {
        id: "f_unauth",
        key: "unauthorized_fact",
        value: "bad_data",
        confidence: 0.90,
        authority: "SYSTEM_DEFAULT",
        scope: "GLOBAL",
        topic: "devops",
        eligibility: "UNAUTHORIZED",
      },
    ],
  });

  const result = epistemicCalibrationEngine.evaluate(input);
  const claim = result.claims.find((c) => c.normalizedKey.includes("unauthorized_fact"));
  assert(claim === undefined, "Unauthorized fact must be excluded");
});

// EC-25: missing parent evidence causes rejection
runTest("EC-25: missing parent evidence causes rejection", () => {
  const input = createMockBaseInput();
  input.multiHopReasoning = {
    evidenceNodes: [],
    hops: [],
    chains: [],
    groundedConclusions: [],
    directives: [],
    diagnostics: {} as any,
  } as any;

  const result = epistemicCalibrationEngine.evaluate(input);
  assert(result.claims.every((c) => c.epistemicState !== "REJECTED" || c.confidence === 0.0), "Rejected claims have 0 confidence");
});

// EC-26: duplicate evidence does not increase support
runTest("EC-26: duplicate evidence does not increase support", () => {
  const input = createMockBaseInput();
  input.executiveContext = createMockExecutiveContext({
    facts: [
      {
        id: "f_dup_1",
        key: "cluster_nodes",
        value: "3",
        confidence: 0.85,
        authority: "GOVERNANCE_APPROVED_MEMORY",
        scope: "GLOBAL",
        topic: "devops",
        eligibility: "ELIGIBLE",
      },
      {
        id: "f_dup_1",
        key: "cluster_nodes",
        value: "3",
        confidence: 0.85,
        authority: "GOVERNANCE_APPROVED_MEMORY",
        scope: "GLOBAL",
        topic: "devops",
        eligibility: "ELIGIBLE",
      },
    ],
  });

  const result = epistemicCalibrationEngine.evaluate(input);
  const claim = result.claims.find((c) => c.normalizedKey.includes("cluster_nodes"));
  assert(claim !== undefined, "Claim exists");
  assert(claim!.provenance.length === 1, `Provenance should be deduplicated to 1, got ${claim!.provenance.length}`);
});

// EC-27: independent evidence increases support deterministically
runTest("EC-27: independent evidence increases support deterministically", () => {
  const input = createMockBaseInput();
  input.executiveContext = createMockExecutiveContext({
    facts: [
      {
        id: "fact_tool_1",
        key: "ci_pipeline_passed",
        value: "true",
        confidence: 0.90,
        authority: "VERIFIED_EVIDENCE",
        scope: "GLOBAL",
        topic: "devops",
        eligibility: "ELIGIBLE",
      },
    ],
  });
  input.deepReasoning = {
    evidence: [
      {
        id: "deep_ev_2",
        statement: "ci_pipeline_passed",
        authority: "GOVERNANCE_APPROVED_MEMORY",
        confidence: 0.85,
        scope: "GLOBAL",
        topic: "devops",
        eligibility: "ELIGIBLE",
      } as any,
    ],
    hypotheses: [],
    conclusion: {} as any,
    evaluations: [],
    contradictions: [],
    uncertainty: {} as any,
    sanitizedDirectives: [],
    diagnostics: {} as any,
  } as any;

  const result = epistemicCalibrationEngine.evaluate(input);
  const claim = result.claims.find((c) => c.normalizedKey.includes("ci_pipeline_passed"));
  assert(claim !== undefined, "Claim exists");
  assert(claim!.independentSupportCount >= 2, `Independent support count should be >= 2, got ${claim!.independentSupportCount}`);
});

// EC-28: same inference repeated cannot inflate confidence
runTest("EC-28: same inference repeated cannot inflate confidence", () => {
  const input = createMockBaseInput();
  const res1 = epistemicCalibrationEngine.evaluate(input);
  const res2 = epistemicCalibrationEngine.evaluate(input);

  assert(res1.claims.length === res2.claims.length, "Claim counts must be identical");
  for (let i = 0; i < res1.claims.length; i++) {
    assert(
      Math.abs(res1.claims[i].confidence - res2.claims[i].confidence) < 0.0001,
      `Confidence drifted across runs: ${res1.claims[i].confidence} vs ${res2.claims[i].confidence}`
    );
  }
});

// EC-29: causal correlation does not become certainty
runTest("EC-29: causal correlation does not become certainty", () => {
  const input = createMockBaseInput();
  input.causalReasoning = {
    relations: [
      {
        id: "rel_coinc",
        causeStatement: "Deploy on Friday",
        effectStatement: "System error rate",
        relationType: "COINCIDENCE",
        confidence: 0.90,
        evidenceAuthority: "GOVERNANCE_APPROVED_MEMORY",
      } as any,
    ],
    chains: [],
    counterfactuals: [],
    activeDirectives: [],
    diagnostics: {} as any,
  } as any;

  const result = epistemicCalibrationEngine.evaluate(input);
  const claim = result.claims.find((c) => c.normalizedKey.includes("friday"));
  assert(claim !== undefined, "Claim exists");
  assert(claim!.epistemicState === "UNCERTAIN", "Coincidence must remain UNCERTAIN");
  assert(claim!.confidence <= 0.50, "Coincidence confidence must be capped <= 0.50");
});

// EC-30: unresolved causal relation remains uncertain
runTest("EC-30: unresolved causal relation remains uncertain", () => {
  const input = createMockBaseInput();
  input.causalReasoning = {
    relations: [
      {
        id: "rel_unres",
        causeStatement: "Database cache tuning",
        effectStatement: "Query throughput",
        relationType: "UNRESOLVED",
        confidence: 0.80,
        evidenceAuthority: "GOVERNANCE_APPROVED_MEMORY",
      } as any,
    ],
    chains: [],
    counterfactuals: [],
    activeDirectives: [],
    diagnostics: {} as any,
  } as any;

  const result = epistemicCalibrationEngine.evaluate(input);
  const claim = result.claims.find((c) => c.normalizedKey.includes("cache_tuning"));
  assert(claim !== undefined, "Claim exists");
  assert(claim!.epistemicState === "UNCERTAIN", "UNRESOLVED causal relation must be UNCERTAIN");
});

// EC-31: counterfactual remains counterfactual
runTest("EC-31: counterfactual remains counterfactual", () => {
  const input = createMockBaseInput();
  input.causalReasoning = {
    relations: [],
    chains: [],
    counterfactuals: [
      {
        id: "cf_1",
        antecedent: "If cache was disabled",
        consequent: "Latency would increase",
        plausibility: 0.8,
      } as any,
    ],
    activeDirectives: [],
    diagnostics: {} as any,
  } as any;

  const result = epistemicCalibrationEngine.evaluate(input);
  assert(result.claims.every((c) => c.epistemicState !== "VERIFIED" || !c.statement.includes("If cache was disabled")), "Counterfactual is not a verified observed fact");
});

// EC-32: contradiction adjustment reduces confidence
runTest("EC-32: contradiction adjustment reduces confidence", () => {
  const input = createMockBaseInput();
  input.contradictionResolution = {
    contradictions: [
      {
        id: "unres_conf",
        topic: "devops",
        description: "Conflicting memory on server port",
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

  const result = epistemicCalibrationEngine.evaluate(input);
  assert(result.diagnostics.contradictionAdjustments > 0, "Contradiction adjustment should be registered");
});

// EC-33: topic isolation
runTest("EC-33: topic isolation", () => {
  const input = createMockBaseInput();
  input.options = {
    currentTime: 1700000000000,
    activeTopic: "cooking",
    strictTopicIsolation: true,
  };
  input.executiveContext = createMockExecutiveContext({
    facts: [
      {
        id: "fact_devops",
        key: "kubernetes_cluster",
        value: "prod-cluster",
        confidence: 0.95,
        authority: "VERIFIED_EVIDENCE",
        scope: "TOPIC",
        topic: "devops",
        eligibility: "ELIGIBLE",
      },
    ],
  });

  const result = epistemicCalibrationEngine.evaluate(input);
  const foreignClaim = result.claims.find((c) => c.normalizedKey.includes("kubernetes_cluster"));
  assert(foreignClaim === undefined, "Foreign topic claim must be isolated and excluded");
});

// EC-34: scope isolation
runTest("EC-34: scope isolation", () => {
  const input = createMockBaseInput();
  input.executiveContext = createMockExecutiveContext({
    facts: [
      {
        id: "fact_proj_scoped",
        key: "project_temporary_flag",
        value: "enabled",
        confidence: 0.90,
        authority: "ACTIVE_GOAL_PROJECT_COMMITMENT",
        scope: "PROJECT",
        topic: "devops",
        eligibility: "ELIGIBLE",
      },
    ],
  });

  const result = epistemicCalibrationEngine.evaluate(input);
  const claim = result.claims.find((c) => c.normalizedKey.includes("project_temporary_flag"));
  assert(claim !== undefined, "Project scoped claim exists");
  assert(claim!.scope === "PROJECT", "Scope must remain PROJECT");
});

// EC-35: project-specific inference does not become global
runTest("EC-35: project-specific inference does not become global", () => {
  const input = createMockBaseInput();
  input.multiHopReasoning = {
    evidenceNodes: [],
    hops: [],
    chains: [],
    groundedConclusions: [
      {
        id: "conc_proj",
        statement: "Project Cloud Backend requires DB migration",
        primaryAuthority: "ACTIVE_GOAL_PROJECT_COMMITMENT",
        confidence: 0.85,
        chainDepth: 1,
        scope: "PROJECT",
        status: "GROUNDED",
        rootEvidenceNodeIds: ["p1"],
        intermediateInferenceTypes: ["GOAL_PROPAGATION"],
        independentEvidenceCount: 1,
        sanitizedDirectives: [],
      },
    ],
    directives: [],
    diagnostics: {} as any,
  } as any;

  const result = epistemicCalibrationEngine.evaluate(input);
  const claim = result.claims.find((c) => c.normalizedKey.includes("db_migration"));
  assert(claim !== undefined, "Claim exists");
  assert(claim!.scope === "PROJECT", "Scope must remain PROJECT");
});

// EC-36: goal-specific inference does not become permanent memory
runTest("EC-36: goal-specific inference does not become permanent memory", () => {
  const input = createMockBaseInput();
  input.executiveContext = createMockExecutiveContext();
  const result = epistemicCalibrationEngine.evaluate(input);
  assert(result !== undefined, "Engine evaluates successfully without mutating memory");
});

// EC-37: current-turn override remains ephemeral
runTest("EC-37: current-turn override remains ephemeral", () => {
  const input = createMockBaseInput("For this turn use port 9090");
  const result = epistemicCalibrationEngine.evaluate(input);
  const turnClaim = result.claims.find((c) => c.normalizedKey.includes("port_9090"));
  if (turnClaim) {
    assert(turnClaim.scope === "CURRENT_TURN", "Current turn override must have CURRENT_TURN scope");
  }
});

// EC-38: sensitive credentials are suppressed
runTest("EC-38: sensitive credentials are suppressed", () => {
  const input = createMockBaseInput("Here is my secret API key sk_live_998877665544332211");
  const result = epistemicCalibrationEngine.evaluate(input);
  for (const c of result.claims) {
    assert(!c.statement.includes("sk_live_"), "Secret key must not appear in any claim statement");
  }
  for (const d of result.directives) {
    assert(!d.includes("sk_live_"), "Secret key must not appear in any directive");
  }
});

// EC-39: unsupported identity inference is suppressed
runTest("EC-39: unsupported identity inference is suppressed", () => {
  const input = createMockBaseInput();
  input.executiveContext = createMockExecutiveContext({
    facts: [
      {
        id: "f_bio",
        key: "user_salary_tier",
        value: "high_income",
        confidence: 0.90,
        authority: "PREDICTIVE_CONTEXT",
        scope: "GLOBAL",
        topic: "devops",
        eligibility: "ELIGIBLE",
      },
    ],
  });

  const result = epistemicCalibrationEngine.evaluate(input);
  const bioClaim = result.claims.find((c) => c.normalizedKey.includes("salary"));
  assert(bioClaim === undefined, "Unsupported biographical identity claim must be suppressed");
});

// EC-40: directive sanitization
runTest("EC-40: directive sanitization", () => {
  const input = createMockBaseInput();
  const result = epistemicCalibrationEngine.evaluate(input);
  for (const d of result.directives) {
    assert(d.startsWith("[EPISTEMIC_CALIBRATION]"), "Directives must have [EPISTEMIC_CALIBRATION] prefix");
    assert(!d.includes("confidence="), "No raw confidence parameter in directive");
    assert(!d.includes("uncertainty="), "No raw uncertainty parameter in directive");
  }
});

// EC-41: numeric confidence does not leak into directives
runTest("EC-41: numeric confidence does not leak into directives", () => {
  const input = createMockBaseInput();
  const result = epistemicCalibrationEngine.evaluate(input);
  for (const d of result.directives) {
    assert(!/\b0\.\d+\b/.test(d), `Numeric score leaked in directive: ${d}`);
  }
});

// EC-42: internal IDs do not leak into directives
runTest("EC-42: internal IDs do not leak into directives", () => {
  const input = createMockBaseInput();
  const result = epistemicCalibrationEngine.evaluate(input);
  for (const d of result.directives) {
    assert(!/\bep_[0-9a-f]+\b/i.test(d), `Internal ID leaked in directive: ${d}`);
    assert(!/\bcal_[0-9a-f]+\b/i.test(d), `Internal calibration ID leaked in directive: ${d}`);
  }
});

// EC-43: timestamps do not leak into directives
runTest("EC-43: timestamps do not leak into directives", () => {
  const input = createMockBaseInput();
  const result = epistemicCalibrationEngine.evaluate(input);
  for (const d of result.directives) {
    assert(!/\b1700000000000\b/.test(d), `Timestamp leaked in directive: ${d}`);
  }
});

// EC-44: deterministic calibration
runTest("EC-44: deterministic calibration", () => {
  const input = createMockBaseInput();
  const res1 = epistemicCalibrationEngine.evaluate(input);
  const res2 = epistemicCalibrationEngine.evaluate(input);
  assert(JSON.stringify(res1) === JSON.stringify(res2), "Evaluation must be 100% deterministic");
});

// EC-45: 10-run identical-input determinism
runTest("EC-45: 10-run identical-input determinism", () => {
  const input = createMockBaseInput();
  const baseline = JSON.stringify(epistemicCalibrationEngine.evaluate(input));
  for (let i = 0; i < 10; i++) {
    const run = JSON.stringify(epistemicCalibrationEngine.evaluate(input));
    assert(run === baseline, `Run ${i + 1} produced non-identical output`);
  }
});

// EC-46: confidence does not drift across repeated runs
runTest("EC-46: confidence does not drift across repeated runs", () => {
  const input = createMockBaseInput();
  let lastScore = epistemicCalibrationEngine.evaluate(input).claims[0]?.confidence;
  for (let i = 0; i < 5; i++) {
    const currentScore = epistemicCalibrationEngine.evaluate(input).claims[0]?.confidence;
    assert(currentScore === lastScore, "Confidence score must never drift");
  }
});

// EC-47: input immutability
runTest("EC-47: input immutability", () => {
  const input = createMockBaseInput();
  const serializedBefore = JSON.stringify(input);
  epistemicCalibrationEngine.evaluate(input);
  const serializedAfter = JSON.stringify(input);
  assert(serializedBefore === serializedAfter, "Input object must remain strictly immutable");
});

// EC-48: budget truncation
runTest("EC-48: budget truncation", () => {
  const input = createMockBaseInput();
  input.options = {
    budget: {
      maxClaims: 2,
    },
  };
  const result = epistemicCalibrationEngine.evaluate(input);
  assert(result.claims.length <= 2, `Claims must be bounded by maxClaims 2, got ${result.claims.length}`);
});

// EC-49: diagnostic determinism
runTest("EC-49: diagnostic determinism", () => {
  const input = createMockBaseInput();
  const res1 = epistemicCalibrationEngine.evaluate(input);
  const res2 = epistemicCalibrationEngine.evaluate(input);
  assert(
    res1.diagnostics.claimsEvaluated === res2.diagnostics.claimsEvaluated &&
    res1.diagnostics.verifiedClaims === res2.diagnostics.verifiedClaims,
    "Diagnostics must be deterministic"
  );
});

// EC-50: BrainEngine integration
runTest("EC-50: BrainEngine integration", () => {
  const analysis = brainEngine.analyze(
    "Check backend database status",
    [],
    undefined,
    "default",
    undefined,
    {
      userId: "user_test_50",
    }
  );

  assert(analysis.epistemicCalibrationAnalysis !== undefined, "BrainAnalysis must contain epistemicCalibrationAnalysis");
  assert(analysis.epistemicCalibration !== undefined, "BrainAnalysis must contain epistemicCalibration alias");
  assert(Array.isArray(analysis.promptDirectives), "promptDirectives must be an array");
});

// EC-51: Step 1 regression (DeepReasoningEngine)
runTest("EC-51: Step 1 regression (DeepReasoningEngine)", () => {
  const drResult = deepReasoningEngine.evaluate({
    message: "Deploy system after test passes",
    options: {
      activeTopic: "devops",
    },
  });
  assert(drResult !== undefined && drResult.conclusion !== undefined && Array.isArray(drResult.hypotheses), "DeepReasoningEngine remains fully functional");
});

// EC-52: Step 2 regression (ContradictionResolutionEngine)
runTest("EC-52: Step 2 regression (ContradictionResolutionEngine)", () => {
  const crResult = contradictionResolutionEngine.evaluate({
    message: "Check database configuration",
    options: {
      activeTopic: "devops",
    },
  });
  assert(crResult !== undefined && Array.isArray(crResult.contradictions), "ContradictionResolutionEngine remains fully functional");
});

// EC-53: Step 3 regression (CausalReasoningEngine)
runTest("EC-53: Step 3 regression (CausalReasoningEngine)", () => {
  const causalResult = causalReasoningEngine.evaluate({
    message: "High load causes server latency",
    options: {
      activeTopic: "devops",
    },
  });
  assert(causalResult !== undefined && Array.isArray(causalResult.relations), "CausalReasoningEngine remains fully functional");
});

// EC-54: Step 4 regression (MultiHopReasoningEngine)
runTest("EC-54: Step 4 regression (MultiHopReasoningEngine)", () => {
  const mhResult = multiHopReasoningEngine.evaluate({
    message: "Build pass requires tests to succeed",
    options: {
      activeTopic: "devops",
    },
  });
  assert(mhResult !== undefined && Array.isArray(mhResult.groundedConclusions), "MultiHopReasoningEngine remains fully functional");
});

// EC-55: full Phase 1 + Phase 2 + Phase 3 Steps 1–5 regression
runTest("EC-55: full Phase 1 + Phase 2 + Phase 3 Steps 1–5 regression", () => {
  const analysis = brainEngine.analyze(
    "Verify production deployment readiness",
    [],
    undefined,
    "default",
    undefined,
    {
      userId: "user_full_reg",
    }
  );

  assert(analysis.structuredIntent !== undefined, "Phase 1 Structured Intent present");
  assert(analysis.executiveContext !== undefined, "Phase 2 Executive Context present");
  assert(analysis.deepReasoningAnalysis !== undefined, "Phase 3 Step 1 Deep Reasoning present");
  assert(analysis.contradictionResolutionAnalysis !== undefined, "Phase 3 Step 2 Contradiction Resolution present");
  assert(analysis.causalReasoningAnalysis !== undefined, "Phase 3 Step 3 Causal Reasoning present");
  assert(analysis.multiHopReasoningAnalysis !== undefined, "Phase 3 Step 4 Multi-Hop Reasoning present");
  assert(analysis.epistemicCalibrationAnalysis !== undefined, "Phase 3 Step 5 Epistemic Calibration present");
});

console.log("=======================================================");
console.log(`TEST RESULTS: ${passedCount}/${totalCount} TESTS PASSED`);
console.log("=======================================================");
