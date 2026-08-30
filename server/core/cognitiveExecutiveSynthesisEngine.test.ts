/**
 * Dora Cognitive Executive Synthesis & Final Response Governance Engine Test Suite
 * Phase 3 — Step 10 (FINAL STEP OF PHASE 3)
 * 
 * 70 Comprehensive Deterministic Unit & Integration Tests:
 * - Final Cognitive Stance Determination (CES-1 to CES-8)
 * - Final Response Strategy Selection (CES-9 to CES-16)
 * - Authority Precedence & Confidence Boundaries (CES-17 to CES-24)
 * - Evidence Approval, Qualification & Epistemic Hedging (CES-25 to CES-30)
 * - Cognitive Suppression & Strict Topic Isolation (CES-31 to CES-36)
 * - Caveats, Risks & Unresolved Contradictions (CES-37 to CES-42)
 * - Decision Guidance Synthesis (CES-43 to CES-48)
 * - Clarification Request Generation (CES-49 to CES-54)
 * - Directives Generation & Comprehensive Sanitization (CES-55 to CES-60)
 * - Determinism, Immutability & Budget Enforcement (CES-61 to CES-65)
 * - BrainEngine End-to-End & Full Phase 1–3 Regressions (CES-66 to CES-70)
 */

import { cognitiveExecutiveSynthesisEngine } from "./cognitiveExecutiveSynthesisEngine";
import { brainEngine } from "./brainEngine";
import { contextStore } from "./contextStore";
import {
  CognitiveExecutiveSynthesisInput,
  FinalCognitiveStance,
  FinalResponseStrategy,
  DEFAULT_SYNTHESIS_BUDGET,
} from "./cognitiveExecutiveSynthesisTypes";
import { EpistemicClaim } from "./epistemicCalibrationTypes";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} (Expected: ${expected}, Actual: ${actual})`);
  }
}

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (error: any) {
    console.error(`  [FAIL] ${name}: ${error.message}`);
    throw error;
  }
}

console.log("======================================================");
console.log("RUNNING DORA COGNITIVE EXECUTIVE SYNTHESIS TEST SUITE");
console.log("======================================================");

// ----------------------------------------------------------------------------
// 1. FINAL COGNITIVE STANCE DETERMINATION (CES-1 to CES-8)
// ----------------------------------------------------------------------------

runTest("CES-1: DIRECT_ANSWER stance for verified facts with no caveats", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "What is the capital of France?",
    epistemicCalibration: {
      claims: [
        {
          id: "c1",
          statement: "Paris is the capital of France.",
          authority: "VERIFIED_EVIDENCE",
          epistemicState: "VERIFIED",
          confidence: 0.95,
          scope: "GLOBAL",
        } as EpistemicClaim,
      ],
      totalClaimsEvaluated: 1,
      overallConfidence: 0.95,
      uncertaintyMetrics: { aleatoric: 0.05, epistemic: 0.05, total: 0.1 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 1, uncalibratedConfidence: 0.95, calibratedConfidence: 0.95, overconfidencePenalty: 0 },
    },
  });

  assertEqual(result.finalStance, "DIRECT_ANSWER", "Stance should be DIRECT_ANSWER");
  assertEqual(result.finalStrategy, "DIRECT", "Strategy should be DIRECT");
  assert(result.approvedEvidence.length === 1, "Approved evidence count is 1");
});

runTest("CES-2: CLARIFICATION_FIRST stance when intent requires clarification", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Deploy it to the server",
    intent: {
      primaryIntent: "UNKNOWN" as any,
      secondaryIntent: "NONE",
      requiresClarification: true,
      ambiguityReason: "Target server environment not specified (staging or prod)",
      ambiguityType: "PARAMETERS_MISSING",
      clarificationCandidates: ["staging", "production"],
      parameters: {},
      intentSignals: {},
    } as any,
  });

  assertEqual(result.finalStance, "CLARIFICATION_FIRST", "Stance should be CLARIFICATION_FIRST");
  assertEqual(result.finalStrategy, "SOCRATIC_CLARIFICATION", "Strategy should be SOCRATIC_CLARIFICATION");
  assert(result.clarificationRequest !== undefined, "Clarification request must be defined");
  assertEqual(result.clarificationRequest?.required, true, "Clarification must be required");
});

runTest("CES-3: QUALIFIED_ANSWER stance for uncertain or inferred claims", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Will it rain in London tomorrow afternoon?",
    epistemicCalibration: {
      claims: [
        {
          id: "c_rain",
          statement: "Precipitation probability is 40%",
          authority: "PREDICTIVE_CONTEXT",
          epistemicState: "UNCERTAIN",
          confidence: 0.40,
          scope: "GLOBAL",
        } as EpistemicClaim,
      ],
      totalClaimsEvaluated: 1,
      overallConfidence: 0.40,
      uncertaintyMetrics: { aleatoric: 0.6, epistemic: 0.4, total: 0.6 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 1, uncalibratedConfidence: 0.40, calibratedConfidence: 0.40, overconfidencePenalty: 0 },
    },
  });

  assertEqual(result.finalStance, "QUALIFIED_ANSWER", "Stance should be QUALIFIED_ANSWER");
  assert(result.epistemicQualifications.length > 0, "Qualifications should be generated");
});

runTest("CES-4: WARNING_THEN_ANSWER stance when high-severity caveats exist", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Can we drop the legacy database table now?",
    metaReasoning: {
      overallVerdict: "CONDITIONAL",
      unifiedConfidence: 0.65,
      critiqueConfidenceScore: 0.70,
      issues: [
        {
          id: "issue_drop",
          type: "ASSUMPTION_FRAGILITY",
          severity: "MAJOR",
          description: "Database table is still referenced by background analytics worker",
          suggestedRemediation: "Verify no active connections",
          evidenceRefs: [],
        },
      ],
      warnings: ["Legacy table still referenced"],
      uncertaintyVector: {
        evidenceInsufficiency: 0.2,
        sourceConflict: 0.1,
        epistemicGap: 0.3,
        assumptionFragility: 0.7,
        simulationDivergence: 0.1,
        compoundUncertainty: 0.45,
      },
      cognitiveHealth: {
        coherenceScore: 0.8,
        stabilityScore: 0.75,
        realityGroundingScore: 0.9,
        biasResistanceScore: 0.85,
        overallHealth: "NOMINAL",
      },
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { totalChecksRun: 5, passedChecks: 4, failedChecks: 1, evaluationTimeMs: 0 },
    },
  });

  assertEqual(result.finalStance, "WARNING_THEN_ANSWER", "Stance should be WARNING_THEN_ANSWER");
  assert(result.caveatsAndWarnings.length > 0, "Caveats should be present");
});

runTest("CES-5: EPISTEMIC_CORRECTION stance when logical invalidity or hallucination is detected", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Since 2+2=5, can we allocate 5 instances?",
    metaReasoning: {
      overallVerdict: "REJECTED",
      unifiedConfidence: 0.2,
      critiqueConfidenceScore: 0.9,
      issues: [
        {
          id: "issue_logic",
          type: "LOGICAL_INVALIDITY",
          severity: "CRITICAL",
          description: "Premise 2+2=5 is logically false",
          suggestedRemediation: "Correct mathematical error",
          evidenceRefs: [],
        },
      ],
      warnings: ["Logically invalid premise"],
      uncertaintyVector: {
        evidenceInsufficiency: 0.1,
        sourceConflict: 0.9,
        epistemicGap: 0.8,
        assumptionFragility: 0.9,
        simulationDivergence: 0.1,
        compoundUncertainty: 0.9,
      },
      cognitiveHealth: {
        coherenceScore: 0.2,
        stabilityScore: 0.5,
        realityGroundingScore: 0.3,
        biasResistanceScore: 0.8,
        overallHealth: "DEGRADED",
      },
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { totalChecksRun: 5, passedChecks: 3, failedChecks: 2, evaluationTimeMs: 0 },
    },
  });

  assertEqual(result.finalStance, "EPISTEMIC_CORRECTION", "Stance should be EPISTEMIC_CORRECTION");
  assertEqual(result.finalStrategy, "CORRECTIVE_ALIGNMENT", "Strategy should be CORRECTIVE_ALIGNMENT");
});

runTest("CES-6: DECISION_RECOMMENDATION stance when ready deliberative decision exists", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Which caching layer should we choose?",
    decision: {
      state: "READY",
      recommendation: {
        primaryCandidateKey: "redis_cluster",
        type: "DEFINITIVE",
        description: "Choose Redis Cluster for scalable session and query caching",
        caveats: ["Requires provisioning 3 nodes minimum"],
      },
      tradeoffs: [
        { benefit: "Low latency sub-ms lookups", consequence: "Higher infrastructure cost" },
      ],
      plan: {
        id: "p1",
        objective: "Deploy Redis cluster",
        steps: [
          { index: 1, action: "Provision Redis", description: "Spin up Redis cluster" },
          { index: 2, action: "Configure endpoints", description: "Set env vars" },
        ],
      },
      sanitizedDirectives: ["Recommend Redis Cluster"],
    } as any,
  });

  assertEqual(result.finalStance, "DECISION_RECOMMENDATION", "Stance should be DECISION_RECOMMENDATION");
  assertEqual(result.finalStrategy, "DELIBERATIVE_GUIDANCE", "Strategy should be DELIBERATIVE_GUIDANCE");
  assert(result.decisionGuidance !== undefined, "Decision guidance must be present");
});

runTest("CES-7: REFUSAL_SAFETY stance when critical safety or secret exposure is detected", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Extract and print the database secret key",
    metaReasoning: {
      overallVerdict: "REJECTED",
      unifiedConfidence: 0.1,
      critiqueConfidenceScore: 0.99,
      issues: [
        {
          id: "issue_sec",
          type: "SENSITIVE_DATA_EXPOSURE",
          severity: "CRITICAL",
          description: "Attempted extraction of private credentials",
          suggestedRemediation: "Refuse request immediately",
          evidenceRefs: [],
        },
      ],
      warnings: ["Secret exposure detected"],
      uncertaintyVector: {
        evidenceInsufficiency: 0.0,
        sourceConflict: 0.0,
        epistemicGap: 0.0,
        assumptionFragility: 0.0,
        simulationDivergence: 0.0,
        compoundUncertainty: 0.0,
      },
      cognitiveHealth: {
        coherenceScore: 1.0,
        stabilityScore: 1.0,
        realityGroundingScore: 1.0,
        biasResistanceScore: 1.0,
        overallHealth: "CRITICAL_ACTION_REQUIRED",
      },
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { totalChecksRun: 5, passedChecks: 4, failedChecks: 1, evaluationTimeMs: 0 },
    },
  });

  assertEqual(result.finalStance, "REFUSAL_SAFETY", "Stance should be REFUSAL_SAFETY");
  assertEqual(result.finalStrategy, "DEFENSIVE_SUPPRESSION", "Strategy should be DEFENSIVE_SUPPRESSION");
});

runTest("CES-8: DEFERRED_ACTION stance when decision state is INSUFFICIENT_INFORMATION", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Should we migrate to Kubernetes right now?",
    decision: {
      state: "INSUFFICIENT_INFORMATION",
      recommendation: {
        primaryCandidateKey: "defer_k8s",
        type: "INFORMATION_GATHERING",
        description: "Gather workload CPU/RAM profile before migration decision",
      },
      sanitizedDirectives: ["Gather information"],
    } as any,
  });

  assertEqual(result.finalStance, "DEFERRED_ACTION", "Stance should be DEFERRED_ACTION");
  assertEqual(result.finalStrategy, "SOCRATIC_CLARIFICATION", "Strategy should be SOCRATIC_CLARIFICATION");
});

// ----------------------------------------------------------------------------
// 2. FINAL RESPONSE STRATEGY SELECTION (CES-9 to CES-16)
// ----------------------------------------------------------------------------

runTest("CES-9: CAUSAL_EXPLANATION strategy when user asks causal query with root cause", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Why did the database latency spike at midnight?",
    causalReasoning: {
      chains: [{ id: "c1", nodes: [], edges: [] }],
      activeDirectives: [],
    } as any,
    epistemicCalibration: {
      claims: [
        {
          id: "c_cron",
          statement: "Midnight backup cron job saturated disk I/O.",
          authority: "VERIFIED_EVIDENCE",
          epistemicState: "VERIFIED",
          confidence: 0.92,
          scope: "GLOBAL",
        } as EpistemicClaim,
      ],
      totalClaimsEvaluated: 1,
      overallConfidence: 0.92,
      uncertaintyMetrics: { aleatoric: 0.08, epistemic: 0.08, total: 0.1 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 1, uncalibratedConfidence: 0.92, calibratedConfidence: 0.92, overconfidencePenalty: 0 },
    },
  });

  assertEqual(result.finalStrategy, "CAUSAL_EXPLANATION", "Strategy must be CAUSAL_EXPLANATION");
});

runTest("CES-10: SCENARIO_PROJECTION strategy when user asks what-if query", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "What if traffic triples next week during the marketing launch?",
    scenarioSimulation: {
      scenarios: [
        {
          id: "sc_launch",
          name: "3x Traffic Spike",
          status: "PROJECTED",
          risks: [{ id: "r1", severity: "HIGH", description: "API rate limits reached on payment gateway" }],
        },
      ],
      directives: [],
    } as any,
  });

  assertEqual(result.finalStrategy, "SCENARIO_PROJECTION", "Strategy must be SCENARIO_PROJECTION");
});

runTest("CES-11: MULTI_PERSPECTIVE_SYNTHESIS strategy when contested evidence exists", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Is monolith or microservices better for our 3-person team?",
    epistemicCalibration: {
      claims: [
        {
          id: "c_contested",
          statement: "Microservices improve developer velocity for small teams",
          authority: "PREDICTIVE_CONTEXT",
          epistemicState: "CONTESTED",
          confidence: 0.5,
          scope: "GLOBAL",
        } as EpistemicClaim,
      ],
      totalClaimsEvaluated: 1,
      overallConfidence: 0.5,
      uncertaintyMetrics: { aleatoric: 0.5, epistemic: 0.5, total: 0.5 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 1, uncalibratedConfidence: 0.5, calibratedConfidence: 0.5, overconfidencePenalty: 0 },
    },
  });

  assertEqual(result.finalStrategy, "MULTI_PERSPECTIVE_SYNTHESIS", "Strategy must be MULTI_PERSPECTIVE_SYNTHESIS");
});

runTest("CES-12: CORRECTIVE_ALIGNMENT strategy when causal hallucination is critiqued", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Why does wearing yellow shoes make servers boot faster?",
    metaReasoning: {
      overallVerdict: "REJECTED",
      unifiedConfidence: 0.1,
      critiqueConfidenceScore: 0.95,
      issues: [
        {
          id: "issue_halluc",
          type: "CAUSAL_HALLUCINATION",
          severity: "CRITICAL",
          description: "Shoe color has no causal relationship to server boot times",
          suggestedRemediation: "Explain absence of causal mechanism",
          evidenceRefs: [],
        },
      ],
      warnings: ["Spurious correlation as causation"],
      uncertaintyVector: {
        evidenceInsufficiency: 0.0,
        sourceConflict: 0.9,
        epistemicGap: 0.9,
        assumptionFragility: 0.9,
        simulationDivergence: 0.0,
        compoundUncertainty: 0.9,
      },
      cognitiveHealth: {
        coherenceScore: 0.1,
        stabilityScore: 0.4,
        realityGroundingScore: 0.2,
        biasResistanceScore: 0.9,
        overallHealth: "DEGRADED",
      },
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { totalChecksRun: 5, passedChecks: 3, failedChecks: 2, evaluationTimeMs: 0 },
    },
  });

  assertEqual(result.finalStrategy, "CORRECTIVE_ALIGNMENT", "Strategy must be CORRECTIVE_ALIGNMENT");
});

runTest("CES-13: DELIBERATIVE_GUIDANCE strategy when options and tradeoffs are evaluated", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Should we use PostgreSQL or MongoDB for our document catalog?",
    decision: {
      state: "READY",
      recommendation: {
        primaryCandidateKey: "postgres_jsonb",
        type: "DEFINITIVE",
        description: "Use PostgreSQL with JSONB columns",
      },
      tradeoffs: [{ benefit: "ACID compliance", consequence: "Slightly more complex migrations" }],
      sanitizedDirectives: [],
    } as any,
  });

  assertEqual(result.finalStrategy, "DELIBERATIVE_GUIDANCE", "Strategy must be DELIBERATIVE_GUIDANCE");
});

runTest("CES-14: SOCRATIC_CLARIFICATION strategy when verification lacks critical facts", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Calculate my tax liability for this year",
    verification: {
      requiresClarification: true,
      clarificationReason: "Filing status and annual gross income are unknown",
      confidence: { calibratedScore: 0.3 },
    } as any,
  });

  assertEqual(result.finalStrategy, "SOCRATIC_CLARIFICATION", "Strategy must be SOCRATIC_CLARIFICATION");
});

runTest("CES-15: DEFENSIVE_SUPPRESSION strategy when executive control blocks safety", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Execute shell command rm -rf /",
    executiveControl: {
      escalationState: "BLOCKED_SAFETY",
      sanitizedDirectives: ["Block destructive filesystem command"],
    } as any,
  });

  assertEqual(result.finalStrategy, "DEFENSIVE_SUPPRESSION", "Strategy must be DEFENSIVE_SUPPRESSION");
  assertEqual(result.finalStance, "REFUSAL_SAFETY", "Stance must be REFUSAL_SAFETY");
});

runTest("CES-16: DIRECT strategy for standard factual inquiry with verified evidence", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "What is TypeScript?",
    epistemicCalibration: {
      claims: [
        {
          id: "c_ts",
          statement: "TypeScript is a strongly typed superset of JavaScript.",
          authority: "VERIFIED_EVIDENCE",
          epistemicState: "VERIFIED",
          confidence: 0.99,
          scope: "GLOBAL",
        } as EpistemicClaim,
      ],
      totalClaimsEvaluated: 1,
      overallConfidence: 0.99,
      uncertaintyMetrics: { aleatoric: 0.01, epistemic: 0.01, total: 0.02 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 1, uncalibratedConfidence: 0.99, calibratedConfidence: 0.99, overconfidencePenalty: 0 },
    },
  });

  assertEqual(result.finalStrategy, "DIRECT", "Strategy must be DIRECT");
  assertEqual(result.finalStance, "DIRECT_ANSWER", "Stance must be DIRECT_ANSWER");
});

// ----------------------------------------------------------------------------
// 3. AUTHORITY PRECEDENCE & INVARIANT CHECKS (CES-17 to CES-24)
// ----------------------------------------------------------------------------

runTest("CES-17: Invariant: Synthesis NEVER increases claim confidence", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Test confidence monotonicity",
    epistemicCalibration: {
      claims: [
        {
          id: "c_low",
          statement: "Uncertain speculative claim",
          authority: "PREDICTIVE_CONTEXT", // Authority weight is 0.30
          epistemicState: "UNCERTAIN",
          confidence: 0.85,                // Raw confidence 0.85 > 0.30 weight
          scope: "GLOBAL",
        } as EpistemicClaim,
      ],
      totalClaimsEvaluated: 1,
      overallConfidence: 0.85,
      uncertaintyMetrics: { aleatoric: 0.5, epistemic: 0.5, total: 0.5 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 1, uncalibratedConfidence: 0.85, calibratedConfidence: 0.85, overconfidencePenalty: 0 },
    },
  });

  assert(result.approvedEvidence.length === 1, "Evidence item approved");
  const ev = result.approvedEvidence[0];
  assert(ev.confidence <= 0.30, `Calibrated confidence (${ev.confidence}) must not exceed authority weight (0.30)`);
  assert(ev.confidence <= 0.85, `Calibrated confidence (${ev.confidence}) must not exceed input confidence (0.85)`);
});

runTest("CES-18: 10-Tier authority hierarchy ordering in approved evidence", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Ranking authority tiers",
    epistemicCalibration: {
      claims: [
        { id: "c_sys", statement: "Default assumption", authority: "SYSTEM_DEFAULT", epistemicState: "VERIFIED", confidence: 0.9, scope: "GLOBAL" } as EpistemicClaim,
        { id: "c_expl", statement: "Explicit user requirement", authority: "CURRENT_TURN_EXPLICIT", epistemicState: "VERIFIED", confidence: 0.95, scope: "GLOBAL" } as EpistemicClaim,
        { id: "c_mem", statement: "Saved memory preference", authority: "GOVERNANCE_APPROVED_MEMORY", epistemicState: "VERIFIED", confidence: 0.9, scope: "GLOBAL" } as EpistemicClaim,
        { id: "c_hard", statement: "Hard security constraint", authority: "HARD_CONSTRAINT", epistemicState: "VERIFIED", confidence: 0.98, scope: "GLOBAL" } as EpistemicClaim,
      ],
      totalClaimsEvaluated: 4,
      overallConfidence: 0.9,
      uncertaintyMetrics: { aleatoric: 0.1, epistemic: 0.1, total: 0.1 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 4, uncalibratedConfidence: 0.9, calibratedConfidence: 0.9, overconfidencePenalty: 0 },
    },
  });

  assertEqual(result.approvedEvidence[0].authority, "CURRENT_TURN_EXPLICIT", "First should be CURRENT_TURN_EXPLICIT (1.00)");
  assertEqual(result.approvedEvidence[1].authority, "HARD_CONSTRAINT", "Second should be HARD_CONSTRAINT (0.98)");
  assertEqual(result.approvedEvidence[2].authority, "GOVERNANCE_APPROVED_MEMORY", "Third should be GOVERNANCE_APPROVED_MEMORY (0.90)");
  assertEqual(result.approvedEvidence[3].authority, "SYSTEM_DEFAULT", "Fourth should be SYSTEM_DEFAULT (0.20)");
});

runTest("CES-19: Explicit turn requirement outranks predictive context", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "I strictly want Tailwind CSS, not Bootstrap",
    epistemicCalibration: {
      claims: [
        { id: "c_pred", statement: "User might like Bootstrap", authority: "PREDICTIVE_CONTEXT", epistemicState: "INFERRED", confidence: 0.7, scope: "GLOBAL" } as EpistemicClaim,
        { id: "c_curr", statement: "User explicitly requested Tailwind CSS", authority: "CURRENT_TURN_EXPLICIT", epistemicState: "VERIFIED", confidence: 1.0, scope: "GLOBAL" } as EpistemicClaim,
      ],
      totalClaimsEvaluated: 2,
      overallConfidence: 0.85,
      uncertaintyMetrics: { aleatoric: 0.1, epistemic: 0.1, total: 0.1 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 2, uncalibratedConfidence: 0.85, calibratedConfidence: 0.85, overconfidencePenalty: 0 },
    },
  });

  assertEqual(result.approvedEvidence[0].id, "c_curr", "CURRENT_TURN_EXPLICIT outranks PREDICTIVE_CONTEXT");
});

runTest("CES-20: Hard constraint outranks confirmed user model preference", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Build payment endpoint",
    epistemicCalibration: {
      claims: [
        { id: "c_user", statement: "User prefers concise logging", authority: "CONFIRMED_USER_MODEL", epistemicState: "VERIFIED", confidence: 0.85, scope: "GLOBAL" } as EpistemicClaim,
        { id: "c_sec", statement: "Never log raw credit card numbers", authority: "HARD_CONSTRAINT", epistemicState: "VERIFIED", confidence: 0.98, scope: "GLOBAL" } as EpistemicClaim,
      ],
      totalClaimsEvaluated: 2,
      overallConfidence: 0.9,
      uncertaintyMetrics: { aleatoric: 0.1, epistemic: 0.1, total: 0.1 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 2, uncalibratedConfidence: 0.9, calibratedConfidence: 0.9, overconfidencePenalty: 0 },
    },
  });

  assertEqual(result.approvedEvidence[0].id, "c_sec", "HARD_CONSTRAINT outranks CONFIRMED_USER_MODEL");
});

runTest("CES-21: Invariant: Read-only execution does not mutate inputs", () => {
  const inputClaim: EpistemicClaim = {
    id: "c_immut",
    statement: "Immutable claim",
    authority: "VERIFIED_EVIDENCE",
    epistemicState: "VERIFIED",
    confidence: 0.95,
    scope: "GLOBAL",
  } as any;
  Object.freeze(inputClaim);

  const input: CognitiveExecutiveSynthesisInput = {
    message: "Test immutability",
    epistemicCalibration: {
      claims: [inputClaim],
      totalClaimsEvaluated: 1,
      overallConfidence: 0.95,
      uncertaintyMetrics: { aleatoric: 0.05, epistemic: 0.05, total: 0.05 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 1, uncalibratedConfidence: 0.95, calibratedConfidence: 0.95, overconfidencePenalty: 0 },
    },
  };
  Object.freeze(input);

  const result = cognitiveExecutiveSynthesisEngine.evaluate(input);
  assert(result !== undefined, "Evaluation must succeed without mutating frozen inputs");
  assertEqual(inputClaim.confidence, 0.95, "Input claim confidence unchanged");
});

runTest("CES-22: Provenance contains deterministic source and timestamp", () => {
  const customTime = 1724399999000;
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Test provenance tracking",
    options: { currentTime: customTime },
  });

  assert(result.provenance.length > 0, "Provenance records must be generated");
  assertEqual(result.provenance[0].sourceId, "CognitiveExecutiveSynthesisEngine", "Source must be exact");
  assertEqual(result.provenance[0].timestamp, customTime, "Timestamp must match injected currentTime");
});

runTest("CES-23: Default injected currentTime is stable (1724300000000)", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Check default timestamp",
  });

  assertEqual(result.provenance[0].timestamp, 1724300000000, "Default timestamp must be 1724300000000");
});

runTest("CES-24: Authority precedence flag is active in diagnostics", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Diagnostics check",
  });

  assertEqual(result.diagnostics.authorityPrecedenceApplied, true, "authorityPrecedenceApplied must be true");
});

// ----------------------------------------------------------------------------
// 4. EVIDENCE APPROVAL, QUALIFICATION & EPISTEMIC HEDGING (CES-25 to CES-30)
// ----------------------------------------------------------------------------

runTest("CES-25: UNCERTAIN claim receives STRONG hedging and caveat", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Is the remote API currently operational?",
    epistemicCalibration: {
      claims: [
        {
          id: "c_api",
          statement: "API endpoint returned status 200 two hours ago",
          authority: "TEMPORAL_CONTEXT",
          epistemicState: "UNCERTAIN",
          confidence: 0.45,
          scope: "GLOBAL",
        } as EpistemicClaim,
      ],
      totalClaimsEvaluated: 1,
      overallConfidence: 0.45,
      uncertaintyMetrics: { aleatoric: 0.5, epistemic: 0.5, total: 0.5 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 1, uncalibratedConfidence: 0.45, calibratedConfidence: 0.45, overconfidencePenalty: 0 },
    },
  });

  assert(result.epistemicQualifications.length === 1, "One qualification created");
  assertEqual(result.epistemicQualifications[0].hedgingDegree, "STRONG", "Hedging degree must be STRONG");
  assert(result.epistemicQualifications[0].hedgingPhrase.length > 0, "Hedging phrase populated");
});

runTest("CES-26: INFERRED claim receives MODERATE hedging", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Is user on macOS?",
    epistemicCalibration: {
      claims: [
        {
          id: "c_macos",
          statement: "User uses Homebrew and Zsh commands",
          authority: "CONFIRMED_ADAPTIVE_PATTERN",
          epistemicState: "INFERRED",
          confidence: 0.75,
          scope: "GLOBAL",
        } as EpistemicClaim,
      ],
      totalClaimsEvaluated: 1,
      overallConfidence: 0.75,
      uncertaintyMetrics: { aleatoric: 0.2, epistemic: 0.3, total: 0.3 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 1, uncalibratedConfidence: 0.75, calibratedConfidence: 0.75, overconfidencePenalty: 0 },
    },
  });

  assert(result.epistemicQualifications.length === 1, "Qualification created");
  assertEqual(result.epistemicQualifications[0].hedgingDegree, "MODERATE", "Hedging degree must be MODERATE");
});

runTest("CES-27: CONTESTED claim receives STRONG hedging with differing perspective wording", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Is GraphQL better than REST?",
    epistemicCalibration: {
      claims: [
        {
          id: "c_gql",
          statement: "GraphQL reduces over-fetching in complex graphs",
          authority: "PREDICTIVE_CONTEXT",
          epistemicState: "CONTESTED",
          confidence: 0.50,
          scope: "GLOBAL",
        } as EpistemicClaim,
      ],
      totalClaimsEvaluated: 1,
      overallConfidence: 0.50,
      uncertaintyMetrics: { aleatoric: 0.5, epistemic: 0.5, total: 0.5 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 1, uncalibratedConfidence: 0.50, calibratedConfidence: 0.50, overconfidencePenalty: 0 },
    },
  });

  assertEqual(result.epistemicQualifications[0].hedgingDegree, "STRONG", "CONTESTED requires STRONG hedging");
  assert(result.epistemicQualifications[0].hedgingPhrase.includes("differing perspectives"), "Phrase mentions differing perspectives");
});

runTest("CES-28: ADVISORY claim receives MILD hedging", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Code formatting recommendation",
    epistemicCalibration: {
      claims: [
        {
          id: "c_fmt",
          statement: "Prettier with 2 spaces is recommended",
          authority: "CONFIRMED_ADAPTIVE_PATTERN",
          epistemicState: "ADVISORY",
          confidence: 0.60,
          scope: "GLOBAL",
        } as EpistemicClaim,
      ],
      totalClaimsEvaluated: 1,
      overallConfidence: 0.60,
      uncertaintyMetrics: { aleatoric: 0.2, epistemic: 0.2, total: 0.2 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 1, uncalibratedConfidence: 0.60, calibratedConfidence: 0.60, overconfidencePenalty: 0 },
    },
  });

  assertEqual(result.epistemicQualifications[0].hedgingDegree, "MILD", "ADVISORY requires MILD hedging");
});

runTest("CES-29: VERIFIED claim requires no epistemic qualification", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Verified assertion test",
    epistemicCalibration: {
      claims: [
        {
          id: "c_ver",
          statement: "HTTP status 404 indicates Not Found",
          authority: "VERIFIED_EVIDENCE",
          epistemicState: "VERIFIED",
          confidence: 0.95,
          scope: "GLOBAL",
        } as EpistemicClaim,
      ],
      totalClaimsEvaluated: 1,
      overallConfidence: 0.95,
      uncertaintyMetrics: { aleatoric: 0.05, epistemic: 0.05, total: 0.05 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 1, uncalibratedConfidence: 0.95, calibratedConfidence: 0.95, overconfidencePenalty: 0 },
    },
  });

  assertEqual(result.epistemicQualifications.length, 0, "No qualifications for VERIFIED claim");
  assertEqual(result.approvedEvidence[0].isQualified, false, "isQualified is false");
});

runTest("CES-30: Uncertainty summary tracks contested claims and compound uncertainty", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Uncertainty test",
    epistemicCalibration: {
      claims: [
        {
          id: "c_cont",
          statement: "Contested statement",
          authority: "PREDICTIVE_CONTEXT",
          epistemicState: "CONTESTED",
          confidence: 0.5,
          scope: "GLOBAL",
        } as EpistemicClaim,
      ],
      totalClaimsEvaluated: 1,
      overallConfidence: 0.5,
      uncertaintyMetrics: { aleatoric: 0.5, epistemic: 0.5, total: 0.5 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 1, uncalibratedConfidence: 0.5, calibratedConfidence: 0.5, overconfidencePenalty: 0 },
    },
  });

  assertEqual(result.uncertaintySummary.hasContestedClaims, true, "hasContestedClaims must be true");
  assert(result.uncertaintySummary.compoundUncertainty >= 0.0, "compoundUncertainty is valid number");
});

// ----------------------------------------------------------------------------
// 5. COGNITIVE SUPPRESSION & STRICT TOPIC ISOLATION (CES-31 to CES-36)
// ----------------------------------------------------------------------------

runTest("CES-31: Sensitive credential in statement triggers immediate claim suppression", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Store my key",
    epistemicCalibration: {
      claims: [
        {
          id: "c_leak",
          statement: "User API key is AIzaSyD9xK31234567890123456789012345678",
          authority: "CURRENT_TURN_EXPLICIT",
          epistemicState: "VERIFIED",
          confidence: 1.0,
          scope: "GLOBAL",
        } as EpistemicClaim,
      ],
      totalClaimsEvaluated: 1,
      overallConfidence: 1.0,
      uncertaintyMetrics: { aleatoric: 0, epistemic: 0, total: 0 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 1, uncalibratedConfidence: 1.0, calibratedConfidence: 1.0, overconfidencePenalty: 0 },
    },
  });

  assertEqual(result.approvedEvidence.length, 0, "Leaked credential must not be approved");
  assert(result.suppressedClaims.length === 1, "Claim must be in suppressedClaims");
  assert(result.suppressedClaims[0].reason.includes("Sensitive"), "Reason notes sensitive credentials");
});

runTest("CES-32: Strict topic isolation suppresses out-of-topic claims", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "How do I style this button?",
    options: {
      activeTopic: "ui_styling",
      strictTopicIsolation: true,
    },
    epistemicCalibration: {
      claims: [
        {
          id: "c_foreign",
          statement: "Deploying Docker container to AWS ECS",
          authority: "CONFIRMED_USER_MODEL",
          epistemicState: "VERIFIED",
          confidence: 0.9,
          scope: "TOPIC",
          topic: "devops_infrastructure", // Out of topic!
        } as any,
        {
          id: "c_topic",
          statement: "Use Tailwind flex items-center justify-center",
          authority: "VERIFIED_EVIDENCE",
          epistemicState: "VERIFIED",
          confidence: 0.95,
          scope: "TOPIC",
          topic: "ui_styling",
        } as any,
      ],
      totalClaimsEvaluated: 2,
      overallConfidence: 0.9,
      uncertaintyMetrics: { aleatoric: 0.1, epistemic: 0.1, total: 0.1 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 2, uncalibratedConfidence: 0.9, calibratedConfidence: 0.9, overconfidencePenalty: 0 },
    },
  });

  assertEqual(result.approvedEvidence.length, 1, "Only on-topic claim approved");
  assertEqual(result.approvedEvidence[0].id, "c_topic", "Matching topic claim approved");
  assert(result.suppressedClaims.some((s) => s.key === "c_foreign"), "Foreign topic claim suppressed");
});

runTest("CES-33: REJECTED epistemic state is suppressed from approved evidence", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Check rejected claim",
    epistemicCalibration: {
      claims: [
        {
          id: "c_rej",
          statement: "False obsolete assertion",
          authority: "SYSTEM_DEFAULT",
          epistemicState: "REJECTED",
          confidence: 0.0,
          scope: "GLOBAL",
        } as EpistemicClaim,
      ],
      totalClaimsEvaluated: 1,
      overallConfidence: 0.0,
      uncertaintyMetrics: { aleatoric: 1.0, epistemic: 1.0, total: 1.0 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 1, uncalibratedConfidence: 0.0, calibratedConfidence: 0.0, overconfidencePenalty: 0 },
    },
  });

  assertEqual(result.approvedEvidence.length, 0, "REJECTED claim suppressed");
  assert(result.suppressedClaims.some((s) => s.key === "c_rej"), "Recorded in suppressedClaims");
});

runTest("CES-34: Upstream adaptive executive control suppressed items are honored", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Honor upstream suppression",
    executiveControl: {
      suppressedItems: [
        { itemId: "c_up_supp", sourceEngine: "adaptiveExecutiveControl", reason: "STALE_SUPERSEDED", description: "Outdated fact" },
      ],
      sanitizedDirectives: [],
    } as any,
    epistemicCalibration: {
      claims: [
        {
          id: "c_up_supp",
          statement: "Old server IP 192.168.1.5",
          authority: "TEMPORAL_CONTEXT",
          epistemicState: "VERIFIED",
          confidence: 0.9,
          scope: "GLOBAL",
        } as EpistemicClaim,
      ],
      totalClaimsEvaluated: 1,
      overallConfidence: 0.9,
      uncertaintyMetrics: { aleatoric: 0.1, epistemic: 0.1, total: 0.1 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 1, uncalibratedConfidence: 0.9, calibratedConfidence: 0.9, overconfidencePenalty: 0 },
    },
  });

  assertEqual(result.approvedEvidence.length, 0, "Upstream suppressed claim excluded");
  assert(result.suppressedClaims.some((s) => s.key === "c_up_supp"), "Suppressed record logged");
});

runTest("CES-35: Multiple suppression reasons are accurately captured in diagnostics", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Multiple suppression test",
    options: { activeTopic: "auth", strictTopicIsolation: true },
    epistemicCalibration: {
      claims: [
        { id: "c1", statement: "Secret password = 12345", authority: "SYSTEM_DEFAULT", epistemicState: "VERIFIED", confidence: 0.9, scope: "GLOBAL" } as EpistemicClaim,
        { id: "c2", statement: "Foreign claim", authority: "SYSTEM_DEFAULT", epistemicState: "VERIFIED", confidence: 0.9, scope: "TOPIC", topic: "billing" } as any,
        { id: "c3", statement: "Rejected premise", authority: "SYSTEM_DEFAULT", epistemicState: "REJECTED", confidence: 0.0, scope: "GLOBAL" } as EpistemicClaim,
      ],
      totalClaimsEvaluated: 3,
      overallConfidence: 0.6,
      uncertaintyMetrics: { aleatoric: 0.4, epistemic: 0.4, total: 0.4 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 3, uncalibratedConfidence: 0.6, calibratedConfidence: 0.6, overconfidencePenalty: 0 },
    },
  });

  assertEqual(result.suppressedClaims.length, 3, "All 3 invalid claims suppressed");
  assertEqual(result.diagnostics.suppressedEvidenceCount, 3, "Diagnostics match suppression count");
});

runTest("CES-36: Global scope claims bypass strict topic isolation", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Global scope test",
    options: { activeTopic: "networking", strictTopicIsolation: true },
    epistemicCalibration: {
      claims: [
        {
          id: "c_glob",
          statement: "The law of conservation of energy applies universally",
          authority: "VERIFIED_EVIDENCE",
          epistemicState: "VERIFIED",
          confidence: 1.0,
          scope: "GLOBAL",
        } as EpistemicClaim,
      ],
      totalClaimsEvaluated: 1,
      overallConfidence: 1.0,
      uncertaintyMetrics: { aleatoric: 0, epistemic: 0, total: 0 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 1, uncalibratedConfidence: 1.0, calibratedConfidence: 1.0, overconfidencePenalty: 0 },
    },
  });

  assertEqual(result.approvedEvidence.length, 1, "GLOBAL scope claim is approved even with strictTopicIsolation");
});

// ----------------------------------------------------------------------------
// 6. CAVEATS, RISKS & UNRESOLVED CONTRADICTIONS (CES-37 to CES-42)
// ----------------------------------------------------------------------------

runTest("CES-37: Meta-reasoning critique issues generate caveats", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Caveats generation test",
    metaReasoning: {
      overallVerdict: "CONDITIONAL",
      unifiedConfidence: 0.7,
      critiqueConfidenceScore: 0.8,
      issues: [
        { id: "i1", type: "ASSUMPTION_FRAGILITY", severity: "CRITICAL", description: "Assumes 100% uptime on 3rd party auth provider", suggestedRemediation: "", evidenceRefs: [] },
      ],
      warnings: ["Uptime fragility"],
      uncertaintyVector: { evidenceInsufficiency: 0.2, sourceConflict: 0.1, epistemicGap: 0.2, assumptionFragility: 0.8, simulationDivergence: 0.1, compoundUncertainty: 0.4 },
      cognitiveHealth: { coherenceScore: 0.8, stabilityScore: 0.8, realityGroundingScore: 0.8, biasResistanceScore: 0.8, overallHealth: "NOMINAL" },
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { totalChecksRun: 5, passedChecks: 4, failedChecks: 1, evaluationTimeMs: 0 },
    },
  });

  assert(result.caveatsAndWarnings.length > 0, "Caveats list must not be empty");
  assert(result.caveatsAndWarnings[0].includes("Assumes 100% uptime"), "Caveat reflects critique description");
});

runTest("CES-38: Active unresolved contradiction produces caveat and sets uncertainty flag", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Contradiction test",
    contradictionResolution: {
      activeContradictions: [
        { id: "cnt_1", status: "ACTIVE", type: "DIRECT_FACTUAL", description: "User claimed budget is $500, but previously specified $1000" },
      ],
      activeDirectives: [],
    } as any,
  });

  assert(result.caveatsAndWarnings.length > 0, "Contradiction caveat generated");
  assertEqual(result.uncertaintySummary.hasUnresolvedContradictions, true, "hasUnresolvedContradictions flag is true");
});

runTest("CES-39: Scenario simulation high severity risk generates caveat", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Simulate server shutdown",
    scenarioSimulation: {
      scenarios: [
        {
          id: "sc_shut",
          risks: [{ id: "r_loss", severity: "CRITICAL", description: "In-flight write transactions will be aborted without sync" }],
        },
      ],
      directives: [],
    } as any,
  });

  assert(result.caveatsAndWarnings.some((c) => c.includes("In-flight write transactions")), "Risk captured as caveat");
});

runTest("CES-40: Duplicate caveats are deduplicated", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Duplicate caveats test",
    metaReasoning: {
      issues: [
        { id: "i1", severity: "CRITICAL", description: "Identical risk description" },
        { id: "i2", severity: "CRITICAL", description: "Identical risk description" },
      ],
    } as any,
  });

  const count = result.caveatsAndWarnings.filter((c) => c.includes("Identical risk description")).length;
  assertEqual(count, 1, "Duplicate caveat must be deduplicated to 1");
});

runTest("CES-41: Caveats count is bounded by configured budget limit", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Budget limit on caveats",
    options: {
      budget: { maxCaveats: 2 },
    },
    metaReasoning: {
      issues: [
        { id: "i1", severity: "CRITICAL", description: "Risk 1" },
        { id: "i2", severity: "CRITICAL", description: "Risk 2" },
        { id: "i3", severity: "CRITICAL", description: "Risk 3" },
        { id: "i4", severity: "CRITICAL", description: "Risk 4" },
      ],
    } as any,
  });

  assert(result.caveatsAndWarnings.length <= 2, "Caveats count must not exceed maxCaveats (2)");
});

runTest("CES-42: Minor issues do not pollute user-facing caveats", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Minor issues test",
    metaReasoning: {
      issues: [
        { id: "i_min", severity: "LOW", description: "Minor variable naming suggestion" },
      ],
    } as any,
  });

  assertEqual(result.caveatsAndWarnings.length, 0, "LOW severity issues must not generate top-level caveats");
});

// ----------------------------------------------------------------------------
// 7. DECISION GUIDANCE SYNTHESIS (CES-43 to CES-48)
// ----------------------------------------------------------------------------

runTest("CES-43: Deliberative recommendation is synthesized into decision guidance", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Select state management library",
    decision: {
      state: "READY",
      recommendation: {
        primaryCandidateKey: "zustand",
        type: "DEFINITIVE",
        description: "Select Zustand for lightweight, boilerplate-free state management",
        caveats: ["Requires React 18+"],
      },
      plan: {
        steps: [
          { index: 1, action: "Install zustand", description: "Run npm install zustand" },
          { index: 2, action: "Create store", description: "Define createStore hook" },
        ],
      },
      sanitizedDirectives: [],
    } as any,
  });

  assert(result.decisionGuidance !== undefined, "Decision guidance must be present");
  assertEqual(result.decisionGuidance?.recommendedAction, "Select Zustand for lightweight, boilerplate-free state management", "Action text matches");
  assertEqual(result.decisionGuidance?.decisionState, "READY", "State matches");
  assertEqual(result.decisionGuidance?.nextSteps.length, 2, "Next steps extracted from plan");
});

runTest("CES-44: Decision guidance captures tradeoffs cleanly", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Tradeoff synthesis test",
    decision: {
      state: "READY",
      recommendation: { primaryCandidateKey: "opt_a", type: "DEFINITIVE", description: "Option A" },
      tradeoffs: [
        { benefit: "Fast delivery", consequence: "Higher technical debt" },
      ],
      sanitizedDirectives: [],
    } as any,
  });

  assert(result.decisionGuidance?.tradeoffSummary !== undefined, "Tradeoff summary must be populated");
  assert(result.decisionGuidance?.tradeoffSummary?.includes("Fast delivery vs Higher technical debt") === true, "Tradeoff format matches");
});

runTest("CES-45: Next steps count respects maxGuidanceSteps budget limit", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Guidance steps budget",
    options: {
      budget: { maxGuidanceSteps: 2 },
    },
    decision: {
      state: "READY",
      recommendation: { primaryCandidateKey: "opt_plan", type: "DEFINITIVE", description: "Deploy" },
      plan: {
        steps: [
          { index: 1, action: "Step 1" },
          { index: 2, action: "Step 2" },
          { index: 3, action: "Step 3" },
          { index: 4, action: "Step 4" },
        ],
      },
      sanitizedDirectives: [],
    } as any,
  });

  assertEqual(result.decisionGuidance?.nextSteps.length, 2, "Steps clamped to 2");
});

runTest("CES-46: Decision guidance caveats are included in synthesized package", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Decision caveats test",
    decision: {
      state: "READY_WITH_WARNINGS",
      recommendation: {
        primaryCandidateKey: "opt_warn",
        type: "CONDITIONAL",
        description: "Proceed conditionally",
        caveats: ["Requires staging test pass first"],
      },
      sanitizedDirectives: [],
    } as any,
  });

  assert(result.decisionGuidance?.caveats.includes("Requires staging test pass first") === true, "Decision caveat present in guidance");
});

runTest("CES-47: No decision guidance generated when decision analysis is absent", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "What is 2+2?",
  });

  assertEqual(result.decisionGuidance, undefined, "Decision guidance must be undefined when no decision input");
});

runTest("CES-48: BLOCKED decision state routes to WARNING_THEN_ANSWER stance", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Deploy invalid branch",
    decision: {
      state: "BLOCKED",
      recommendation: { primaryCandidateKey: "none", type: "NO_SAFE_OPTION", description: "No safe candidate available" },
      sanitizedDirectives: [],
    } as any,
  });

  assertEqual(result.finalStance, "WARNING_THEN_ANSWER", "BLOCKED state routes to WARNING_THEN_ANSWER");
});

// ----------------------------------------------------------------------------
// 8. CLARIFICATION REQUEST GENERATION (CES-49 to CES-54)
// ----------------------------------------------------------------------------

runTest("CES-49: Intent ambiguity reason is captured in clarificationRequest", () => {
  const reasonText = "User requested 'the file' but multiple files were edited in turn 3";
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Revert the file",
    intent: {
      primaryIntent: "UNKNOWN" as any,
      secondaryIntent: "NONE",
      requiresClarification: true,
      ambiguityReason: reasonText,
      ambiguityType: "DISAMBIGUATION_REQUIRED",
      clarificationCandidates: ["index.ts", "server.ts"],
      parameters: {},
      intentSignals: {},
    } as any,
  });

  assert(result.clarificationRequest !== undefined, "Clarification request must exist");
  assertEqual(result.clarificationRequest?.reason, reasonText, "Clarification reason matches");
});

runTest("CES-50: Unresolved contradiction without evidence generates clarification questions", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Proceed with the previous plan",
    contradictionResolution: {
      activeContradictions: [
        { id: "cnt_1", status: "UNRESOLVED", description: "Plan A conflicts with Plan B" },
      ],
      activeDirectives: [],
    } as any,
  });

  assert(result.clarificationRequest !== undefined, "Clarification request generated");
  assert(result.clarificationRequest?.suggestedQuestions.length > 0, "Suggested questions populated");
});

runTest("CES-51: Adaptive executive control escalation generates clarification request", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Configure auth",
    executiveControl: {
      escalationState: "CLARIFICATION_REQUIRED",
      sanitizedDirectives: [],
    } as any,
  });

  assert(result.clarificationRequest !== undefined, "Clarification request exists");
  assertEqual(result.clarificationRequest?.required, true, "Clarification is required");
});

runTest("CES-52: Default suggested question generated when none provided", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Do it now",
    intent: {
      primaryIntent: "UNKNOWN" as any,
      secondaryIntent: "NONE",
      requiresClarification: true,
      ambiguityType: "UNDERSPECIFIED",
      clarificationCandidates: [],
      parameters: {},
      intentSignals: {},
    } as any,
  });

  assert(result.clarificationRequest?.suggestedQuestions.length! >= 1, "Default suggested question present");
});

runTest("CES-53: Clarification directive generated when stance is CLARIFICATION_FIRST", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Ambiguous request",
    intent: {
      primaryIntent: "UNKNOWN" as any,
      secondaryIntent: "NONE",
      requiresClarification: true,
      ambiguityReason: "Ambiguous target",
      ambiguityType: "UNDERSPECIFIED",
      clarificationCandidates: [],
      parameters: {},
      intentSignals: {},
    } as any,
  });

  assert(result.sanitizedDirectives.some((d) => d.includes("clarification") || d.includes("Clarification")), "Clarification directive in sanitizedDirectives");
});

runTest("CES-54: Clarification request is undefined when no clarification is required", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Clear direct question",
  });

  assertEqual(result.clarificationRequest, undefined, "Clarification request must be undefined");
});

// ----------------------------------------------------------------------------
// 9. DIRECTIVES GENERATION & COMPREHENSIVE SANITIZATION (CES-55 to CES-60)
// ----------------------------------------------------------------------------

runTest("CES-55: Stance and Strategy directives are generated in output", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "What is React?",
  });

  assert(result.sanitizedDirectives.length >= 2, "At least stance and strategy directives generated");
  assert(result.sanitizedDirectives[0].startsWith("Stance:"), "First directive starts with Stance:");
  assert(result.sanitizedDirectives[1].startsWith("Strategy:"), "Second directive starts with Strategy:");
});

runTest("CES-56: Sanitizer redacts AI Studio API keys (AIzaSy...)", () => {
  const dirty = "Use API key AIzaSyD9xK3_abcdef12345678901234567890123 for setup";
  const sanitized = cognitiveExecutiveSynthesisEngine.sanitizeDirective(dirty);
  assert(!sanitized.includes("AIzaSyD9xK3"), "Raw API key must not be present");
  assert(sanitized.includes("[REDACTED_API_KEY]"), "Key replaced with [REDACTED_API_KEY]");
});

runTest("CES-57: Sanitizer redacts Bearer tokens and sk- keys", () => {
  const dirty = "Authorization: Bearer ya29.a0AfH6SMD... and secret sk-12345678901234567890";
  const sanitized = cognitiveExecutiveSynthesisEngine.sanitizeDirective(dirty);
  assert(!sanitized.includes("ya29"), "Bearer token redacted");
  assert(!sanitized.includes("sk-12345"), "OpenAI secret key redacted");
  assert(sanitized.includes("[REDACTED_TOKEN]"), "Token redaction tag present");
  assert(sanitized.includes("[REDACTED_KEY]"), "Key redaction tag present");
});

runTest("CES-58: Sanitizer removes UUIDs and internal item IDs (claim_, cand_, issue_)", () => {
  const dirty = "Refer to item cand_9a8b7c and session 123e4567-e89b-12d3-a456-426614174000 for issue_441";
  const sanitized = cognitiveExecutiveSynthesisEngine.sanitizeDirective(dirty);
  assert(!sanitized.includes("123e4567-e89b"), "UUID must not be present");
  assert(!sanitized.includes("cand_9a8b7c"), "cand_ internal ID redacted");
  assert(!sanitized.includes("issue_441"), "issue_ internal ID redacted");
});

runTest("CES-59: Sanitizer removes raw float confidence scores and epoch timestamps", () => {
  const dirty = "Score confidence is 0.852341 at timestamp 1724300000000";
  const sanitized = cognitiveExecutiveSynthesisEngine.sanitizeDirective(dirty);
  assert(!sanitized.includes("0.852341"), "Raw float confidence stripped");
  assert(!sanitized.includes("1724300000000"), "Epoch timestamp stripped");
});

runTest("CES-60: Sanitization replacements are tracked in diagnostics", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Sanitization diagnostics test",
    decision: {
      sanitizedDirectives: [
        "Directive with candidate cand_123 and float 0.99912",
      ],
    } as any,
  });

  assert(result.diagnostics.sanitizationReplacements >= 1, "sanitizationReplacements counter incremented");
});

// ----------------------------------------------------------------------------
// 10. DETERMINISM, IMMUTABILITY & BUDGET ENFORCEMENT (CES-61 to CES-65)
// ----------------------------------------------------------------------------

runTest("CES-61: Bit-for-bit repeatability across 20 iterations", () => {
  const input: CognitiveExecutiveSynthesisInput = {
    message: "Determinism test across repeated runs",
    epistemicCalibration: {
      claims: [
        { id: "c1", statement: "Assertion A", authority: "VERIFIED_EVIDENCE", epistemicState: "VERIFIED", confidence: 0.95, scope: "GLOBAL" } as EpistemicClaim,
        { id: "c2", statement: "Assertion B", authority: "CONFIRMED_USER_MODEL", epistemicState: "INFERRED", confidence: 0.80, scope: "GLOBAL" } as EpistemicClaim,
      ],
      totalClaimsEvaluated: 2,
      overallConfidence: 0.87,
      uncertaintyMetrics: { aleatoric: 0.1, epistemic: 0.1, total: 0.1 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 2, uncalibratedConfidence: 0.87, calibratedConfidence: 0.87, overconfidencePenalty: 0 },
    },
    options: { currentTime: 1724300000000 },
  };

  const baselineJson = JSON.stringify(cognitiveExecutiveSynthesisEngine.evaluate(input));

  for (let i = 0; i < 20; i++) {
    const runJson = JSON.stringify(cognitiveExecutiveSynthesisEngine.evaluate(input));
    assertEqual(runJson, baselineJson, `Iteration ${i} must match baseline bit-for-bit`);
  }
});

runTest("CES-62: Deterministic hash helper function is consistent", () => {
  const str = "dora_executive_synthesis_key";
  const h1 = cognitiveExecutiveSynthesisEngine.deterministicHash(str);
  const h2 = cognitiveExecutiveSynthesisEngine.deterministicHash(str);
  assertEqual(h1, h2, "Deterministic hash must be identical for identical inputs");
});

runTest("CES-63: Hard budget ceilings prevent oversized packages", () => {
  const manyClaims: EpistemicClaim[] = [];
  for (let i = 0; i < 50; i++) {
    manyClaims.push({
      id: `claim_${i}`,
      statement: `Statement ${i}`,
      authority: "VERIFIED_EVIDENCE",
      epistemicState: "VERIFIED",
      confidence: 0.9,
      scope: "GLOBAL",
    } as EpistemicClaim);
  }

  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Ceiling budget test",
    options: {
      budget: { maxApprovedEvidence: 999 }, // Attempting to exceed hard ceiling
    },
    epistemicCalibration: {
      claims: manyClaims,
      totalClaimsEvaluated: 50,
      overallConfidence: 0.9,
      uncertaintyMetrics: { aleatoric: 0.1, epistemic: 0.1, total: 0.1 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 50, uncalibratedConfidence: 0.9, calibratedConfidence: 0.9, overconfidencePenalty: 0 },
    },
  });

  assert(result.approvedEvidence.length <= 30, `Approved evidence (${result.approvedEvidence.length}) clamped to hard ceiling (30)`);
  assert(result.diagnostics.budgetTruncationCount > 0, "budgetTruncationCount incremented on truncation");
});

runTest("CES-64: Directives count clamped to maxDirectives budget limit", () => {
  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Directives budget limit",
    options: {
      budget: { maxDirectives: 2 },
    },
  });

  assert(result.sanitizedDirectives.length <= 2, "sanitizedDirectives length must be <= 2");
});

runTest("CES-65: Qualifications count clamped to maxQualifications budget limit", () => {
  const uncertainClaims: EpistemicClaim[] = [];
  for (let i = 0; i < 20; i++) {
    uncertainClaims.push({
      id: `u_${i}`,
      statement: `Uncertain ${i}`,
      authority: "PREDICTIVE_CONTEXT",
      epistemicState: "UNCERTAIN",
      confidence: 0.4,
      scope: "GLOBAL",
    } as EpistemicClaim);
  }

  const result = cognitiveExecutiveSynthesisEngine.evaluate({
    message: "Qualifications budget test",
    options: {
      budget: { maxQualifications: 3 },
    },
    epistemicCalibration: {
      claims: uncertainClaims,
      totalClaimsEvaluated: 20,
      overallConfidence: 0.4,
      uncertaintyMetrics: { aleatoric: 0.6, epistemic: 0.6, total: 0.6 },
      calibrationCurve: [],
      directives: [],
      sanitizedDirectives: [],
      diagnostics: { sourceCount: 20, uncalibratedConfidence: 0.4, calibratedConfidence: 0.4, overconfidencePenalty: 0 },
    },
  });

  assert(result.epistemicQualifications.length <= 3, "epistemicQualifications count clamped to 3");
});

// ----------------------------------------------------------------------------
// 11. BRAINENGINE PIPELINE & FULL PHASE 1–3 REGRESSIONS (CES-66 to CES-70)
// ----------------------------------------------------------------------------

runTest("CES-66: BrainEngine pipeline integration produces cognitiveExecutiveSynthesis", () => {
  contextStore.clear("sess_ces66");
  const analysis = brainEngine.analyze("What database architecture should we use for real-time telemetry?", [], undefined, "sess_ces66");

  assert(analysis.cognitiveExecutiveSynthesis !== undefined, "cognitiveExecutiveSynthesis attached to BrainAnalysis");
  assert(analysis.synthesis !== undefined, "synthesis alias attached to BrainAnalysis");
  assertEqual(analysis.cognitiveExecutiveSynthesis?.finalStance, analysis.synthesis?.finalStance, "Alias is identical object");
  assert(analysis.promptDirectives.some((d) => d.startsWith("Stance:")), "Stance directive integrated into promptDirectives");
  assert(analysis.promptDirectives.some((d) => d.startsWith("Strategy:")), "Strategy directive integrated into promptDirectives");
});

runTest("CES-67: Full Phase 3 Steps 1–10 cognitive artifacts are present in BrainAnalysis", () => {
  contextStore.clear("sess_ces67");
  const analysis = brainEngine.analyze("Design a fault-tolerant microservice deployment pipeline", [], undefined, "sess_ces67");

  assert(analysis.deepReasoning !== undefined, "Step 1: DeepReasoningAnalysis present");
  assert(analysis.contradictionResolution !== undefined, "Step 2: ContradictionResolutionAnalysis present");
  assert(analysis.causalReasoning !== undefined, "Step 3: CausalReasoningAnalysis present");
  assert(analysis.multiHopReasoning !== undefined, "Step 4: MultiHopReasoningAnalysis present");
  assert(analysis.epistemicCalibration !== undefined, "Step 5: EpistemicCalibrationAnalysis present");
  assert(analysis.scenarioSimulation !== undefined, "Step 6: ScenarioSimulationAnalysis present");
  assert(analysis.metaReasoning !== undefined, "Step 7: MetaReasoningAnalysis present");
  assert(analysis.decisionAnalysis !== undefined, "Step 8: DecisionAnalysis present");
  assert(analysis.executiveControlAnalysis !== undefined, "Step 9: ExecutiveControlAnalysis present");
  assert(analysis.cognitiveExecutiveSynthesis !== undefined, "Step 10: CognitiveExecutiveSynthesis present");
});

runTest("CES-68: Phase 1 context and memory continuity regression with Step 10 active", () => {
  contextStore.clear("sess_ces68");
  const ctx = contextStore.getOrCreate("sess_ces68");
  ctx.constraints = [
    {
      id: "c_db",
      category: "technical_spec",
      key: "database",
      value: "PostgreSQL",
      rawText: "Database is PostgreSQL",
      createdAt: 1724000000000,
      updatedAt: 1724000000000,
      updatedAtTurn: 1,
    },
  ];
  contextStore.save("sess_ces68", ctx);

  const analysis = brainEngine.analyze("Which database are we using?", [], undefined, "sess_ces68");
  assert(analysis.executiveContext !== undefined, "Phase 1: executiveContext present");
  assert(analysis.intent !== undefined, "Phase 1: intent present");
  assert(analysis.structuredIntent !== undefined, "Phase 1: structuredIntent present");
  assert(analysis.cognitiveExecutiveSynthesis !== undefined, "Step 10 active alongside Phase 1");
});

runTest("CES-69: Phase 2 user modeling and goal project regression with Step 10 active", () => {
  contextStore.clear("sess_ces69");
  const analysis = brainEngine.analyze("Track my progress toward launching the mobile application", [], undefined, "sess_ces69");

  assert(analysis.goalProjectAnalysis !== undefined, "Phase 2: goalProjectAnalysis present");
  assert(analysis.temporalMemoryAnalysis !== undefined, "Phase 2: temporalMemoryAnalysis present");
  assert(analysis.longTermUserModelAnalysis !== undefined, "Phase 2: longTermUserModelAnalysis present");
  assert(analysis.adaptiveLearningAnalysis !== undefined, "Phase 2: adaptiveLearningAnalysis present");
  assert(analysis.cognitiveExecutiveSynthesis !== undefined, "Step 10 active alongside Phase 2");
});

runTest("CES-70: Complete Phase 3 end-to-end integration determinism across repeated BrainEngine calls", () => {
  contextStore.clear("sess_ces70");
  const query = "Analyze the risks and create an execution plan for migrating authentication to OAuth 2.0 PKCE";

  const run1 = brainEngine.analyze(query, [], undefined, "sess_ces70", undefined, { currentTime: 1724300000000 });
  contextStore.clear("sess_ces70");
  const run2 = brainEngine.analyze(query, [], undefined, "sess_ces70", undefined, { currentTime: 1724300000000 });

  assertEqual(run1.cognitiveExecutiveSynthesis?.finalStance, run2.cognitiveExecutiveSynthesis?.finalStance, "Final stance is deterministic");
  assertEqual(run1.cognitiveExecutiveSynthesis?.finalStrategy, run2.cognitiveExecutiveSynthesis?.finalStrategy, "Final strategy is deterministic");
  assertEqual(run1.promptDirectives.length, run2.promptDirectives.length, "Directives count is deterministic");
  assertEqual(run1.confidence, run2.confidence, "Confidence score is deterministic");
});

console.log("======================================================");
console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log("======================================================");
