/**
 * Dora Deep Reasoning & Hypothesis Management Engine Test Suite
 * Phase 3 — Step 1
 * 
 * Verifies all 37 required invariants and hardening tests (DR-1 to DR-37).
 */

import { deepReasoningEngine } from "./deepReasoningEngine";
import { brainEngine } from "./brainEngine";
import { DeepReasoningInput } from "./deepReasoningTypes";
import { ExecutiveContextPackage } from "./executiveContextTypes";
import { contextStore } from "./contextStore";

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
      codeDensity: "medium",
      explanationDepth: "standard",
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
    promptDirectives: [],
    ...overrides,
  };
}

console.log("======================================================");
console.log("RUNNING DORA DEEP REASONING ENGINE TEST SUITE");
console.log("======================================================");

// DR-1: Evidence normalization is deterministic.
runTest("DR-1: Evidence normalization is deterministic", () => {
  const input: DeepReasoningInput = {
    message: "Tell me about TypeScript",
    executiveContext: createDummyExecutiveContext({
      authoritativeFacts: [
        {
          id: "fact_1",
          key: "stack_language",
          value: "TypeScript",
          grounding: "VERIFIED_FACT",
          authority: "VERIFIED_EVIDENCE",
          authorityWeight: 0.90,
          source: "user_repo",
          confidence: 1.0,
          isGlobal: true,
          sanitizedDirective: "Verified Fact: stack_language = TypeScript",
        },
      ],
    }),
    options: { currentTime: 1724500000000 },
  };

  const res1 = deepReasoningEngine.evaluate(input);
  const res2 = deepReasoningEngine.evaluate(input);

  assert(res1.evidence.length === 1, "Expected 1 evidence item");
  assert(res1.evidence[0].id === res2.evidence[0].id, "Evidence IDs must match identically");
  assert(res1.evidence[0].normalizedKey === "stack_language", "Normalized key must match");
});

// DR-2: Duplicate evidence does not inflate support.
runTest("DR-2: Duplicate evidence does not inflate support", () => {
  const input: DeepReasoningInput = {
    message: "TypeScript discussion",
    executiveContext: createDummyExecutiveContext({
      authoritativeFacts: [
        {
          id: "fact_1",
          key: "language",
          value: "TypeScript",
          grounding: "VERIFIED_FACT",
          authority: "VERIFIED_EVIDENCE",
          authorityWeight: 0.90,
          source: "repo_config",
          confidence: 0.95,
          isGlobal: true,
          sanitizedDirective: "language: TypeScript",
        },
        {
          id: "fact_2",
          key: "language",
          value: "TypeScript",
          grounding: "VERIFIED_FACT",
          authority: "VERIFIED_EVIDENCE",
          authorityWeight: 0.90,
          source: "repo_config",
          confidence: 0.95,
          isGlobal: true,
          sanitizedDirective: "language: TypeScript",
        },
      ],
    }),
    options: { currentTime: 1724500000000 },
  };

  const res = deepReasoningEngine.evaluate(input);
  assert(res.evidence.length === 1, "Duplicate evidence should be collapsed");
  assert(res.diagnostics.deduplicatedCount >= 1, "Deduplication counter incremented");
});

// DR-3: Higher-authority evidence outranks lower-authority evidence.
runTest("DR-3: Higher-authority evidence outranks lower-authority evidence", () => {
  const input: DeepReasoningInput = {
    message: "Recommend a framework",
    executiveContext: createDummyExecutiveContext({
      authoritativeFacts: [
        {
          id: "fact_1",
          key: "framework",
          value: "React",
          grounding: "VERIFIED_FACT",
          authority: "VERIFIED_EVIDENCE", // 0.90
          authorityWeight: 0.90,
          source: "package_json",
          confidence: 1.0,
          isGlobal: true,
          sanitizedDirective: "framework: React",
        },
      ],
      activePreferences: [
        {
          id: "pref_1",
          key: "framework",
          value: "Vue",
          dimension: "tech_stack",
          authority: "CONFIRMED_USER_MODEL", // 0.75
          authorityWeight: 0.75,
          source: "user_model",
          isCurrentTurnOverride: false,
          isGlobal: true,
          sanitizedDirective: "preference: Vue",
        },
      ],
    }),
    options: { currentTime: 1724500000000 },
  };

  const res = deepReasoningEngine.evaluate(input);
  assert(res.hypotheses.length >= 1, "Must produce a hypothesis");
  const top = res.hypotheses[0];
  assert(top.winningAuthority === "VERIFIED_EVIDENCE", "Verified evidence must win");
  assert(top.proposedActionOrFact === "React", "React must be selected over Vue");
});

// DR-4: Current-turn explicit instruction overrides historical preference.
runTest("DR-4: Current-turn explicit instruction overrides historical preference", () => {
  const input: DeepReasoningInput = {
    message: "Recommend Lenovo instead of ASUS",
    executiveContext: createDummyExecutiveContext({
      activePreferences: [
        {
          id: "pref_asus",
          key: "laptop_brand",
          value: "ASUS",
          dimension: "hardware",
          authority: "CONFIRMED_USER_MODEL",
          authorityWeight: 0.75,
          source: "user_history",
          isCurrentTurnOverride: false,
          isGlobal: true,
          sanitizedDirective: "User prefers ASUS laptops",
        },
      ],
    }),
    options: { currentTime: 1724500000000 },
  };

  const res = deepReasoningEngine.evaluate(input);
  const top = res.hypotheses[0];
  assert(top.statement.includes("Lenovo") || top.proposedActionOrFact.includes("Lenovo"), "Lenovo must win current turn");
  assert(top.winningAuthority === "CURRENT_TURN_EXPLICIT", "Winning authority must be CURRENT_TURN_EXPLICIT");
});

// DR-5: Current-turn override does not mutate memory.
runTest("DR-5: Current-turn override does not mutate memory", () => {
  const pref = {
    id: "pref_asus",
    key: "laptop_brand",
    value: "ASUS",
    dimension: "hardware",
    authority: "CONFIRMED_USER_MODEL" as const,
    authorityWeight: 0.75,
    source: "user_history",
    isCurrentTurnOverride: false,
    isGlobal: true,
    sanitizedDirective: "User prefers ASUS laptops",
  };
  const exec = createDummyExecutiveContext({ activePreferences: [pref] });
  Object.freeze(pref);
  Object.freeze(exec);

  const input: DeepReasoningInput = {
    message: "Recommend Lenovo instead of ASUS",
    executiveContext: exec,
  };

  const res = deepReasoningEngine.evaluate(input);
  assert(pref.value === "ASUS", "Underlying preference object must remain unmutated");
  assert(res.conclusion.type === "SUPPORTED_CONCLUSION", "Must formulate conclusion cleanly");
});

// DR-6: Contradictory evidence creates a conflict record.
runTest("DR-6: Contradictory evidence creates a conflict record", () => {
  const input: DeepReasoningInput = {
    message: "Recommend Lenovo instead of ASUS",
    executiveContext: createDummyExecutiveContext({
      activePreferences: [
        {
          id: "pref_asus",
          key: "brand_asus",
          value: "ASUS",
          dimension: "hardware",
          authority: "CONFIRMED_USER_MODEL",
          authorityWeight: 0.75,
          source: "user_history",
          isCurrentTurnOverride: false,
          isGlobal: true,
          sanitizedDirective: "User prefers ASUS",
        },
      ],
    }),
  };

  const res = deepReasoningEngine.evaluate(input);
  assert(res.contradictions.length >= 1, "Must detect contradiction");
  assert(res.contradictions[0].resolutionStatus === "RESOLVED_BY_CURRENT_TURN", "Conflict resolved by current turn");
});

// DR-7: Higher-authority contradiction resolves lower-authority conflict.
runTest("DR-7: Higher-authority contradiction resolves lower-authority conflict", () => {
  const input: DeepReasoningInput = {
    message: "Laptop recommendation query",
    executiveContext: createDummyExecutiveContext({
      authoritativeFacts: [
        {
          id: "fact_1",
          key: "ram",
          value: "32GB",
          grounding: "VERIFIED_FACT",
          authority: "VERIFIED_EVIDENCE", // 0.90
          authorityWeight: 0.90,
          source: "specs",
          confidence: 1.0,
          isGlobal: true,
          sanitizedDirective: "ram: 32GB",
        },
      ],
      advisoryContext: [
        {
          id: "adv_1",
          key: "ram",
          suggestion: "16GB",
          relevanceScore: 0.8,
          isAdvisoryOnly: true,
          sanitizedDirective: "Consider 16GB",
        },
      ],
    }),
  };

  const res = deepReasoningEngine.evaluate(input);
  const conflict = res.contradictions.find((c) => c.subject.includes("ram"));
  assert(!!conflict, "Contradiction on RAM detected");
  assert(conflict?.resolutionStatus === "RESOLVED_BY_AUTHORITY", "Resolved by higher authority");
  assert(conflict?.authorityComparison.higherAuthority === "VERIFIED_EVIDENCE", "Verified evidence is higher");
});

// DR-8: Unresolved equal-authority contradiction remains unresolved.
runTest("DR-8: Unresolved equal-authority contradiction remains unresolved", () => {
  const input: DeepReasoningInput = {
    message: "What is my preferred editor?",
    executiveContext: createDummyExecutiveContext({
      activePreferences: [
        {
          id: "pref_1",
          key: "editor",
          value: "VSCode",
          dimension: "tools",
          authority: "CONFIRMED_USER_MODEL", // 0.75
          authorityWeight: 0.75,
          source: "profile_1",
          isCurrentTurnOverride: false,
          isGlobal: true,
          sanitizedDirective: "editor: VSCode",
        },
        {
          id: "pref_2",
          key: "editor",
          value: "Neovim",
          dimension: "tools",
          authority: "CONFIRMED_USER_MODEL", // 0.75
          authorityWeight: 0.75,
          source: "profile_2",
          isCurrentTurnOverride: false,
          isGlobal: true,
          sanitizedDirective: "editor: Neovim",
        },
      ],
    }),
  };

  const res = deepReasoningEngine.evaluate(input);
  assert(res.contradictions.length >= 1, "Must detect contradiction");
  assert(res.contradictions[0].resolutionStatus === "UNRESOLVED", "Equal authority conflict must remain UNRESOLVED");
  assert(res.conclusion.type === "UNRESOLVED_CONCLUSION", "Conclusion must be UNRESOLVED_CONCLUSION");
});

// DR-9: Insufficient evidence produces NO_CONCLUSION or UNCERTAIN.
runTest("DR-9: Insufficient evidence produces NO_CONCLUSION or UNCERTAIN", () => {
  const input: DeepReasoningInput = {
    message: "Unknown query with zero background",
    executiveContext: createDummyExecutiveContext(),
  };

  const res = deepReasoningEngine.evaluate(input);
  assert(res.conclusion.type === "NO_CONCLUSION", "Zero evidence produces NO_CONCLUSION");
  assert(res.uncertainty.overallLevel === "CRITICAL", "Uncertainty level must be CRITICAL");
});

// DR-10: Predictive context remains advisory.
runTest("DR-10: Predictive context remains advisory", () => {
  const input: DeepReasoningInput = {
    message: "What project next?",
    executiveContext: createDummyExecutiveContext({
      advisoryContext: [
        {
          id: "adv_1",
          key: "next_project",
          suggestion: "Build mobile app",
          relevanceScore: 0.7,
          isAdvisoryOnly: true,
          sanitizedDirective: "Consider mobile app",
        },
      ],
    }),
  };

  const res = deepReasoningEngine.evaluate(input);
  assert(res.hypotheses.length >= 1, "Hypothesis generated");
  assert(res.hypotheses[0].status === "PLAUSIBLE", "Predictive context alone produces PLAUSIBLE not SUPPORTED");
  assert(res.conclusion.type === "TENTATIVE_CONCLUSION", "Conclusion must be TENTATIVE_CONCLUSION");
});

// DR-11: Predictive context cannot create confirmed facts.
runTest("DR-11: Predictive context cannot create confirmed facts", () => {
  const input: DeepReasoningInput = {
    message: "Framework query",
    executiveContext: createDummyExecutiveContext({
      advisoryContext: [
        {
          id: "adv_1",
          key: "framework",
          suggestion: "NextJS",
          relevanceScore: 0.99, // High relevance score
          isAdvisoryOnly: true,
          sanitizedDirective: "Suggest NextJS",
        },
      ],
    }),
  };

  const res = deepReasoningEngine.evaluate(input);
  assert(res.evidence[0].authority === "PREDICTIVE_CONTEXT", "Authority remains PREDICTIVE_CONTEXT");
  assert(res.hypotheses[0].winningAuthority === "PREDICTIVE_CONTEXT", "Winning authority is PREDICTIVE_CONTEXT");
  assert(res.hypotheses[0].status !== "SUPPORTED", "Cannot become SUPPORTED fact");
});

// DR-12: Topic isolation blocks unrelated domain evidence.
runTest("DR-12: Topic isolation blocks unrelated domain evidence", () => {
  const input: DeepReasoningInput = {
    message: "What is the weather today?",
    executiveContext: createDummyExecutiveContext({
      authoritativeFacts: [
        {
          id: "fact_laptop",
          key: "laptop_model",
          value: "ThinkPad X1",
          grounding: "VERIFIED_FACT",
          authority: "VERIFIED_EVIDENCE",
          authorityWeight: 0.90,
          source: "hw_profile",
          confidence: 1.0,
          topic: "laptop_purchase",
          isGlobal: false,
          sanitizedDirective: "laptop_model: ThinkPad X1",
        },
      ],
    }),
    options: {
      strictTopicIsolation: true,
      activeTopic: "weather",
    },
  };

  const res = deepReasoningEngine.evaluate(input);
  assert(res.evidence.length === 0, "Unrelated laptop domain fact must be isolated and suppressed");
  assert(res.diagnostics.topicIsolatedCount >= 1, "Topic isolated count incremented");
});

// DR-13: Global communication preference survives topic isolation.
runTest("DR-13: Global communication preference survives topic isolation", () => {
  const input: DeepReasoningInput = {
    message: "How to cook biryani?",
    executiveContext: createDummyExecutiveContext({
      activePreferences: [
        {
          id: "pref_lang",
          key: "language",
          value: "Bangla",
          dimension: "communication",
          authority: "CONFIRMED_USER_MODEL",
          authorityWeight: 0.75,
          source: "global_prefs",
          isCurrentTurnOverride: false,
          isGlobal: true,
          sanitizedDirective: "language: Bangla",
        },
        {
          id: "pref_laptop",
          key: "gpu",
          value: "RTX 4090",
          dimension: "hardware",
          authority: "CONFIRMED_USER_MODEL",
          authorityWeight: 0.75,
          source: "laptop_prefs",
          isCurrentTurnOverride: false,
          isGlobal: false,
          sanitizedDirective: "gpu: RTX 4090",
        },
      ],
    }),
    options: {
      strictTopicIsolation: true,
      activeTopic: "cooking",
    },
  };

  const res = deepReasoningEngine.evaluate(input);
  const hasLang = res.evidence.some((e) => e.normalizedKey === "language");
  const hasGpu = res.evidence.some((e) => e.normalizedKey === "gpu");

  assert(hasLang, "Global language preference must survive topic isolation");
  assert(!hasGpu, "Topic-specific GPU preference must be suppressed in cooking topic");
});

// DR-14: Expired evidence is excluded.
runTest("DR-14: Expired evidence is excluded", () => {
  const input: DeepReasoningInput = {
    message: "Test expired",
    memoryGovernance: {
      governanceRequired: false,
      memoryInfluenceAllowed: false,
      allowedMemories: [
        {
          memoryId: "m_exp",
          key: "temporary_key",
          value: "temp_val",
          type: "PREFERENCE",
          source: "EXPLICIT_USER",
          status: "EXPIRED",
          usageDecision: "SUPPRESS",
          usageScore: 0.5,
          confidence: 0.5,
          relevance: 0.5,
          reasons: ["EXPIRED_MEMORY"],
          canAffectResponseContent: false,
          canPersonalize: false,
          canSupportFactualClaim: false,
          requiresExplicitAttribution: false,
          isCandidateInferred: false,
        },
      ],
      cautiousMemories: [],
      internalOnlyMemories: [],
      suppressedMemories: [],
      governedCandidates: [],
      conflicts: [],
      privacyBlocks: [],
      topicIsolationApplied: false,
      explicitReferenceDetected: false,
      directives: [],
      sanitizedMemoryContext: "",
      governanceConfidence: 0.5,
    },
  };

  const res = deepReasoningEngine.evaluate(input);
  assert(res.evidence.length === 0, "Expired memory must not enter evidence");
});

// DR-15: Superseded evidence is excluded from active reasoning.
runTest("DR-15: Superseded evidence is excluded from active reasoning", () => {
  const input: DeepReasoningInput = {
    message: "Test superseded",
    userModel: {
      userId: "u1",
      profile: {
        userId: "u1",
        attributes: {
          lang: {
            key: "lang",
            dimension: "CODE_STYLE",
            normalizedValue: "Python",
            confidence: 0.9,
            evidenceCount: 1,
            independentEvidenceCount: 1,
            status: "SUPERSEDED",
            sourceClassification: "EXPLICIT_USER_MEMORY",
            firstObservedAt: 0,
            lastObservedAt: 0,
            isDurable: true,
            isTemporary: false,
            evidence: [],
          },
        },
        confirmedAttributes: [],
        candidateAttributes: [],
        temporaryAttributes: [],
        supersededAttributes: [],
        domainInterests: [],
        projectContexts: [],
        goals: [],
        lastSynthesizedAt: 0,
      },
      activeDirectives: [],
      currentTurnOverrides: [],
      decisions: [],
      health: {
        evidenceCoverage: 1.0,
        conflictCount: 0,
        staleAttributeCount: 0,
        confirmedAttributeCount: 0,
        candidateAttributeCount: 0,
        suppressedAttributeCount: 1,
        overallHealth: "GOOD",
      },
      safetyStatus: "SAFE",
      diagnostics: {
        signalsProcessed: 1,
        memoriesIngested: 0,
        patternsIngested: 0,
        conflictsResolved: 0,
        sensitiveBlocked: 0,
        unsupportedIdentityBlocked: 0,
        isDeterministic: true,
      },
    },
  };

  const res = deepReasoningEngine.evaluate(input);
  assert(res.evidence.length === 0, "Superseded user model attribute must be excluded");
});

// DR-16: Sensitive credentials are suppressed.
runTest("DR-16: Sensitive credentials are suppressed", () => {
  const input: DeepReasoningInput = {
    message: "Here is my secret sk-proj-12345678901234567890 and api_key: AIzaSyD1234567890123456789012345678901",
    executiveContext: createDummyExecutiveContext({
      authoritativeFacts: [
        {
          id: "fact_secret",
          key: "auth_token",
          value: "Bearer ghp_123456789012345678901234567890123456",
          grounding: "VERIFIED_FACT",
          authority: "VERIFIED_EVIDENCE",
          authorityWeight: 0.90,
          source: "headers",
          confidence: 1.0,
          isGlobal: true,
          sanitizedDirective: "Bearer ghp_123456789012345678901234567890123456",
        },
      ],
    }),
  };

  const res = deepReasoningEngine.evaluate(input);
  assert(res.evidence.length === 0, "All sensitive tokens and credentials must be stripped");
  assert(res.diagnostics.sensitiveBlockedCount >= 1, "Sensitive blocked count incremented");
});

// DR-17: Legitimate technical terminology is not over-suppressed.
runTest("DR-17: Legitimate technical terminology is not over-suppressed", () => {
  const input: DeepReasoningInput = {
    message: "Explain the token budget and password manager architecture for this secret project",
    executiveContext: createDummyExecutiveContext({
      authoritativeFacts: [
        {
          id: "fact_tech",
          key: "architecture_topic",
          value: "Password Manager and Token Budget system",
          grounding: "VERIFIED_FACT",
          authority: "VERIFIED_EVIDENCE",
          authorityWeight: 0.90,
          source: "docs",
          confidence: 1.0,
          isGlobal: true,
          sanitizedDirective: "Password Manager and Token Budget system",
        },
      ],
    }),
  };

  const res = deepReasoningEngine.evaluate(input);
  assert(res.evidence.length >= 1, "Legitimate technical terms must NOT be suppressed");
  assert(res.evidence[0].statement.includes("Password Manager"), "Statement preserved");
});

// DR-18: Unsupported identity inference is rejected.
runTest("DR-18: Unsupported identity inference is rejected", () => {
  const input: DeepReasoningInput = {
    message: "The user is a professional senior software engineer at Google who earns a salary of $300k and suffers from bipolar illness",
    executiveContext: createDummyExecutiveContext({
      authoritativeFacts: [
        {
          id: "fact_infer",
          key: "identity_speculation",
          value: "User is a professional TypeScript engineer and earns $200k",
          grounding: "VERIFIED_FACT",
          authority: "VERIFIED_EVIDENCE",
          authorityWeight: 0.90,
          source: "inference",
          confidence: 1.0,
          isGlobal: true,
          sanitizedDirective: "User is a professional TypeScript engineer and earns $200k",
        },
      ],
    }),
  };

  const res = deepReasoningEngine.evaluate(input);
  assert(res.evidence.length === 0, "Unsupported speculative identity inferences must be blocked");
  assert(res.diagnostics.identityInferenceBlockedCount >= 1, "Identity inference blocked count incremented");
});

// DR-19: Hypothesis ranking is deterministic.
runTest("DR-19: Hypothesis ranking is deterministic", () => {
  const input: DeepReasoningInput = {
    message: "Select optimal configuration",
    executiveContext: createDummyExecutiveContext({
      authoritativeFacts: [
        {
          id: "fact_1",
          key: "db",
          value: "PostgreSQL",
          grounding: "VERIFIED_FACT",
          authority: "VERIFIED_EVIDENCE",
          authorityWeight: 0.90,
          source: "schema",
          confidence: 1.0,
          isGlobal: true,
          sanitizedDirective: "db: PostgreSQL",
        },
      ],
      activePreferences: [
        {
          id: "pref_1",
          key: "styling",
          value: "Tailwind",
          dimension: "ui",
          authority: "CONFIRMED_USER_MODEL",
          authorityWeight: 0.75,
          source: "user_prefs",
          isCurrentTurnOverride: false,
          isGlobal: true,
          sanitizedDirective: "styling: Tailwind",
        },
      ],
    }),
  };

  const res1 = deepReasoningEngine.evaluate(input);
  const res2 = deepReasoningEngine.evaluate(input);

  assert(res1.hypotheses.length === res2.hypotheses.length, "Hypotheses count must match");
  for (let i = 0; i < res1.hypotheses.length; i++) {
    assert(res1.hypotheses[i].id === res2.hypotheses[i].id, `Hypothesis ${i} ID must match`);
    assert(res1.hypotheses[i].statement === res2.hypotheses[i].statement, `Hypothesis ${i} statement must match`);
  }
});

// DR-20: Repeated execution produces identical output.
runTest("DR-20: Repeated execution produces identical output over 10 iterations", () => {
  const input: DeepReasoningInput = {
    message: "Keep it brief and use TypeScript",
    executiveContext: createDummyExecutiveContext({
      authoritativeFacts: [
        {
          id: "fact_ts",
          key: "lang",
          value: "TypeScript",
          grounding: "VERIFIED_FACT",
          authority: "VERIFIED_EVIDENCE",
          authorityWeight: 0.90,
          source: "test",
          confidence: 1.0,
          isGlobal: true,
          sanitizedDirective: "lang: TypeScript",
        },
      ],
    }),
    options: { currentTime: 1724500000000 },
  };

  const baseline = JSON.stringify(deepReasoningEngine.evaluate(input));
  for (let i = 0; i < 10; i++) {
    const next = JSON.stringify(deepReasoningEngine.evaluate(input));
    assert(baseline === next, `Run ${i + 1} must match baseline bit-for-bit`);
  }
});

// DR-21: Injected currentTime produces stable output.
runTest("DR-21: Injected currentTime produces stable output", () => {
  const input: DeepReasoningInput = {
    message: "Testing injected time",
    options: { currentTime: 1724599999999 },
  };
  const res = deepReasoningEngine.evaluate(input);
  assert(res.diagnostics.isDeterministic === true, "Engine is deterministic");
});

// DR-22: No Date.now() dependency exists.
runTest("DR-22: No Date.now() dependency exists", () => {
  const originalDateNow = Date.now;
  Date.now = () => {
    throw new Error("Illegal Date.now() called in deterministic deep reasoning engine");
  };
  try {
    const input: DeepReasoningInput = {
      message: "Test clock safety",
      executiveContext: createDummyExecutiveContext({
        authoritativeFacts: [
          {
            id: "f1",
            key: "k",
            value: "v",
            grounding: "VERIFIED_FACT",
            authority: "VERIFIED_EVIDENCE",
            authorityWeight: 0.90,
            source: "src",
            confidence: 1.0,
            isGlobal: true,
            sanitizedDirective: "k: v",
          },
        ],
      }),
      options: { currentTime: 123456789 },
    };
    deepReasoningEngine.evaluate(input);
  } finally {
    Date.now = originalDateNow;
  }
});

// DR-23: No Math.random() dependency exists.
runTest("DR-23: No Math.random() dependency exists", () => {
  const originalRandom = Math.random;
  Math.random = () => {
    throw new Error("Illegal Math.random() called in deterministic deep reasoning engine");
  };
  try {
    const input: DeepReasoningInput = {
      message: "Test random safety",
      executiveContext: createDummyExecutiveContext(),
    };
    deepReasoningEngine.evaluate(input);
  } finally {
    Math.random = originalRandom;
  }
});

// DR-24: No random UUID generation exists.
runTest("DR-24: No random UUID generation exists", () => {
  const input: DeepReasoningInput = {
    message: "Respond in English",
  };
  const res = deepReasoningEngine.evaluate(input);
  for (const h of res.hypotheses) {
    assert(h.id.startsWith("hyp_"), "Hypothesis ID must be deterministically prefixed");
    assert(/^[a-z0-9_]+$/.test(h.id), "ID must be lowercase alphanumeric hash format");
  }
});

// DR-25: Input objects remain unchanged.
runTest("DR-25: Input objects remain unchanged", () => {
  const input: DeepReasoningInput = {
    message: "Analyze immutable structure",
    executiveContext: createDummyExecutiveContext({
      authoritativeFacts: [
        {
          id: "fact_1",
          key: "test_k",
          value: "test_v",
          grounding: "VERIFIED_FACT",
          authority: "VERIFIED_EVIDENCE",
          authorityWeight: 0.90,
          source: "src",
          confidence: 1.0,
          isGlobal: true,
          sanitizedDirective: "test_k: test_v",
        },
      ],
    }),
  };

  const before = JSON.stringify(input);
  deepReasoningEngine.evaluate(input);
  const after = JSON.stringify(input);
  assert(before === after, "Input must not be mutated during evaluation");
});

// DR-26: Reasoning remains bounded by configured limits.
runTest("DR-26: Reasoning remains bounded by configured limits", () => {
  const facts = [];
  for (let i = 0; i < 30; i++) {
    facts.push({
      id: `fact_${i}`,
      key: `key_${i}`,
      value: `value_${i}`,
      grounding: "VERIFIED_FACT" as const,
      authority: "VERIFIED_EVIDENCE" as const,
      authorityWeight: 0.90,
      source: "bulk",
      confidence: 1.0,
      isGlobal: true,
      sanitizedDirective: `key_${i}: value_${i}`,
    });
  }

  const input: DeepReasoningInput = {
    message: "Bulk facts limit test",
    executiveContext: createDummyExecutiveContext({ authoritativeFacts: facts }),
    options: {
      budgetConfig: {
        maxEvidence: 10,
        maxHypotheses: 5,
        maxDirectives: 3,
      },
    },
  };

  const res = deepReasoningEngine.evaluate(input);
  assert(res.evidence.length <= 10, "Evidence bounded by maxEvidence 10");
  assert(res.hypotheses.length <= 5, "Hypotheses bounded by maxHypotheses 5");
  assert(res.sanitizedDirectives.length <= 3, "Directives bounded by maxDirectives 3");
});

// DR-27: Contradiction metadata is sanitized.
runTest("DR-27: Contradiction metadata is sanitized", () => {
  const input: DeepReasoningInput = {
    message: "Recommend Lenovo instead of ASUS",
    executiveContext: createDummyExecutiveContext({
      activePreferences: [
        {
          id: "pref_asus",
          key: "brand_asus",
          value: "ASUS",
          dimension: "hardware",
          authority: "CONFIRMED_USER_MODEL",
          authorityWeight: 0.75,
          source: "user_history",
          isCurrentTurnOverride: false,
          isGlobal: true,
          sanitizedDirective: "User prefers ASUS",
        },
      ],
    }),
  };

  const res = deepReasoningEngine.evaluate(input);
  assert(res.contradictions.length >= 1, "Contradiction detected");
  const c = res.contradictions[0];
  assert(!c.explanation.includes("0.75"), "Raw floats stripped from sanitized explanation");
  assert(typeof c.explanation === "string", "Explanation is human readable");
});

// DR-28: Final directives contain no internal IDs.
runTest("DR-28: Final directives contain no internal IDs", () => {
  const input: DeepReasoningInput = {
    message: "Respond in Bangla please",
    executiveContext: createDummyExecutiveContext({
      authoritativeFacts: [
        {
          id: "exec_fact_811c9dc5",
          key: "pref",
          value: "Bangla",
          grounding: "VERIFIED_FACT",
          authority: "VERIFIED_EVIDENCE",
          authorityWeight: 0.90,
          source: "profile",
          confidence: 1.0,
          isGlobal: true,
          sanitizedDirective: "exec_fact_811c9dc5: preference is Bangla",
        },
      ],
    }),
  };

  const res = deepReasoningEngine.evaluate(input);
  for (const d of res.sanitizedDirectives) {
    assert(!/exec_fact_[a-f0-9]+/.test(d), "Internal ID must be stripped from directives");
  }
});

// DR-29: Evidence confidence is not treated as truth.
runTest("DR-29: Evidence confidence is not treated as truth", () => {
  // Low-authority item with 1.0 confidence vs higher-authority item with 0.85 confidence
  const input: DeepReasoningInput = {
    message: "Language test",
    executiveContext: createDummyExecutiveContext({
      activePreferences: [
        {
          id: "pref_1",
          key: "lang",
          value: "TypeScript",
          dimension: "language",
          authority: "CONFIRMED_USER_MODEL", // 0.75
          authorityWeight: 0.75,
          source: "user_model",
          isCurrentTurnOverride: false,
          isGlobal: true,
          sanitizedDirective: "lang: TypeScript",
        },
      ],
      advisoryContext: [
        {
          id: "adv_1",
          key: "lang",
          suggestion: "Python",
          relevanceScore: 1.0, // 100% confidence but low authority
          isAdvisoryOnly: true,
          sanitizedDirective: "lang: Python",
        },
      ],
    }),
  };

  const res = deepReasoningEngine.evaluate(input);
  const top = res.hypotheses[0];
  assert(top.winningAuthority === "CONFIRMED_USER_MODEL", "Confirmed user model (0.75) must beat predictive (0.30) regardless of predictive score");
  assert(top.proposedActionOrFact === "TypeScript", "TypeScript must win over Python");
});

// DR-30: Lower-authority relevance cannot override higher authority.
runTest("DR-30: Lower-authority relevance cannot override higher authority", () => {
  const input: DeepReasoningInput = {
    message: "Database selection",
    executiveContext: createDummyExecutiveContext({
      reasoningConstraints: [
        {
          id: "const_1",
          type: "HARD_CONSTRAINT",
          description: "Must use PostgreSQL for relational integrity",
          authority: "HARD_CONSTRAINT", // 0.95
          enforceStrictly: true,
          sanitizedDirective: "Must use PostgreSQL",
        },
      ],
      advisoryContext: [
        {
          id: "adv_db",
          key: "database",
          suggestion: "MongoDB",
          relevanceScore: 0.99,
          isAdvisoryOnly: true,
          sanitizedDirective: "Use MongoDB",
        },
      ],
    }),
  };

  const res = deepReasoningEngine.evaluate(input);
  const top = res.hypotheses[0];
  assert(top.winningAuthority === "HARD_CONSTRAINT", "Hard constraint must dominate");
});

// DR-31: Temporal current state outranks stale state appropriately.
runTest("DR-31: Temporal current state outranks stale state appropriately", () => {
  const input: DeepReasoningInput = {
    message: "Framework query",
    executiveContext: createDummyExecutiveContext({
      temporalContext: {
        activePatterns: [
          {
            key: "framework",
            value: "Next.js",
            status: "CURRENT",
            authority: "TEMPORAL_CONTEXT",
            sanitizedDirective: "Current framework is Next.js",
          },
        ],
        evolvingLineage: [
          {
            key: "framework",
            fromValue: "CRA",
            toValue: "Next.js",
            isCurrentTurnEvolution: true,
          },
        ],
        suppressedStaleCount: 1,
      },
    }),
  };

  const res = deepReasoningEngine.evaluate(input);
  const top = res.hypotheses[0];
  assert(top.proposedActionOrFact === "Next.js", "Current Next.js must be active");
});

// DR-32: Tentative hypotheses remain tentative.
runTest("DR-32: Tentative hypotheses remain tentative", () => {
  const input: DeepReasoningInput = {
    message: "Proactive suggestion query",
    executiveContext: createDummyExecutiveContext({
      advisoryContext: [
        {
          id: "adv_1",
          key: "topic",
          suggestion: "Explore Docker",
          relevanceScore: 0.6,
          isAdvisoryOnly: true,
          sanitizedDirective: "Explore Docker",
        },
      ],
    }),
  };

  const res = deepReasoningEngine.evaluate(input);
  assert(res.conclusion.type === "TENTATIVE_CONCLUSION", "Must produce TENTATIVE_CONCLUSION for advisory only");
  assert(res.hypotheses[0].status === "PLAUSIBLE", "Status must remain PLAUSIBLE");
});

// DR-33: Assistant-generated suggestions cannot become user facts.
runTest("DR-33: Assistant-generated suggestions cannot become user facts", () => {
  const input: DeepReasoningInput = {
    message: "User query",
    predictiveContext: {
      predictions: ["TASK_CONTINUATION"],
      acceptedCandidates: [
        {
          id: "cand_1",
          source: "USER_MODEL",
          predictionType: "TASK_CONTINUATION",
          relevance: 0.9,
          confidence: 0.9,
          topic: "user_goal",
          reasonCategory: "advisory",
          expiresAt: 0,
          isSafeToInject: true,
          requiresConfirmation: false,
          contextSummary: "Learn Rust",
          directive: "Advisory: Learn Rust",
        },
      ],
      rejectedCandidates: [],
      suppressionReasons: [],
      confidence: 0.9,
      directives: [],
      requiresConfirmation: false,
      analysisStatus: "SUCCESS",
      diagnostics: {} as any,
    },
  };

  const res = deepReasoningEngine.evaluate(input);
  assert(res.evidence[0].authority === "PREDICTIVE_CONTEXT", "Must remain PREDICTIVE_CONTEXT authority");
  assert(res.hypotheses[0].status !== "SUPPORTED", "Cannot become confirmed fact");
});

// DR-34: Malformed input fails safely.
runTest("DR-34: Malformed input fails safely", () => {
  const res1 = deepReasoningEngine.evaluate({} as any);
  assert(res1.conclusion.type === "NO_CONCLUSION", "Empty object returns NO_CONCLUSION");

  const res2 = deepReasoningEngine.evaluate(null as any);
  assert(res2.conclusion.type === "NO_CONCLUSION", "Null returns NO_CONCLUSION");
});

// DR-35: ExecutiveContext integration works without mutating Phase 2 state.
runTest("DR-35: ExecutiveContext integration works without mutating Phase 2 state", () => {
  const exec = createDummyExecutiveContext({
    authoritativeFacts: [
      {
        id: "fact_1",
        key: "os",
        value: "Linux",
        grounding: "VERIFIED_FACT",
        authority: "VERIFIED_EVIDENCE",
        authorityWeight: 0.90,
        source: "env",
        confidence: 1.0,
        isGlobal: true,
        sanitizedDirective: "os: Linux",
      },
    ],
  });

  const serializedBefore = JSON.stringify(exec);
  const res = deepReasoningEngine.evaluate({
    message: "OS query",
    executiveContext: exec,
  });
  const serializedAfter = JSON.stringify(exec);

  assert(serializedBefore === serializedAfter, "ExecutiveContextPackage remains completely unmutated");
  assert(res.conclusion.type === "SUPPORTED_CONCLUSION", "Reasoning succeeds cleanly");
});

// DR-36: BrainEngine pipeline integration produces valid deepReasoningAnalysis.
runTest("DR-36: BrainEngine pipeline integration produces valid deepReasoningAnalysis", () => {
  const analysis = brainEngine.analyze("Recommend Lenovo instead of ASUS for my gaming laptop setup", [], undefined, "sess_dr36", undefined, {
    userId: "user_dr36",
    currentTime: 1724500000000,
    persistDecisions: false,
  });

  assert(Boolean(analysis.deepReasoningAnalysis), "deepReasoningAnalysis must be present on BrainAnalysis");
  assert(analysis.deepReasoningAnalysis.hypotheses.length > 0, "Hypotheses generated in brain pipeline");
  assert(analysis.promptDirectives.length > 0, "Sanitized directives populated into promptDirectives");
});

// DR-37: Phase 1 and Phase 2 determinism regression remains green with Step 13 active.
runTest("DR-37: Phase 1 and Phase 2 determinism regression remains green with Step 13 active", () => {
  const options = {
    userId: "user_dr37",
    currentTime: 1724500000000,
    persistDecisions: false,
  };

  contextStore.clear("sess_dr37");
  const a1 = brainEngine.analyze("Keep it concise and in English", [], undefined, "sess_dr37", undefined, options);
  contextStore.clear("sess_dr37");
  const a2 = brainEngine.analyze("Keep it concise and in English", [], undefined, "sess_dr37", undefined, options);

  const s1 = JSON.stringify(a1);
  const s2 = JSON.stringify(a2);
  if (s1 !== s2) {
    for (const k of Object.keys(a1)) {
      if (JSON.stringify((a1 as any)[k]) !== JSON.stringify((a2 as any)[k])) {
        console.error(`Diff on key: ${k}`);
        console.error("a1:", JSON.stringify((a1 as any)[k]));
        console.error("a2:", JSON.stringify((a2 as any)[k]));
      }
    }
  }
  assert(s1 === s2, "Bit-for-bit identical BrainAnalysis across repeated runs");
  assert(a1.deepReasoningAnalysis.diagnostics.isDeterministic === true, "Deep reasoning engine reports deterministic execution");
});

console.log("======================================================");
console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log("======================================================");
