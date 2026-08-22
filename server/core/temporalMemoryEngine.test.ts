/**
 * Test Suite for Dora Temporal Memory & Life-Pattern Reasoning Engine
 * Phase 2 — Step 9 (TM-1 to TM-40)
 */

import { temporalMemoryEngine } from "./temporalMemoryEngine";
import { TemporalMemoryAnalysis } from "./temporalMemoryTypes";
import { brainEngine } from "./brainEngine";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTest(name: string, fn: () => void): void {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] ${name}`);
  } catch (err: any) {
    failedTests++;
    console.error(`[FAIL] ${name}: ${err.message}`);
  }
}

console.log("=== DORA PHASE 2 STEP 9: TEMPORAL MEMORY & LIFE-PATTERN TEST SUITE ===");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUserModel(attributes: Record<string, any>) {
  return {
    userId: "test_user",
    profile: {
      userId: "test_user",
      attributes,
      confirmedAttributes: Object.values(attributes).filter((a) => a.status === "CONFIRMED"),
      candidateAttributes: Object.values(attributes).filter((a) => a.status === "CANDIDATE"),
      communicationStyle: { preferredLanguage: "Bangla", verbosity: "Concise" },
      domainInterests: [],
      projectContexts: [],
      goals: [],
      contradictions: [],
      lastUpdated: 1000,
    },
    activeDirectives: [],
    auditLog: [],
  };
}

function makeAdaptiveLearning(patterns: any[]) {
  return {
    patterns,
    activeDirectives: [],
    suppressedPatterns: [],
    diagnostics: { totalPatternsAnalyzed: patterns.length },
  };
}

function makeGovernanceAnalysis(candidates: any[]) {
  return {
    approvedCandidates: candidates,
    rejectedCandidates: [],
    directives: [],
    sanitizedMemoryContext: [],
    topicIsolationApplied: false,
  };
}

// ---------------------------------------------------------------------------
// TESTS TM-1 to TM-40
// ---------------------------------------------------------------------------

runTest("TM-1: Old memory remains historical when newer explicit correction exists", () => {
  const userModel = makeUserModel({
    laptop: {
      key: "laptop",
      normalizedValue: "ASUS",
      value: "ASUS",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "CONFIRMED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      confidence: 1.0,
      evidenceCount: 2,
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    message: "I now prefer Lenovo laptops.",
    longTermUserModel: userModel,
    options: { currentTime: 5000 },
  });

  const laptopPat = res.patterns.find((p) => p.attributeKey === "laptop");
  assert(laptopPat !== undefined, "Laptop pattern must exist");
  assert(laptopPat.previousValues.length === 1, "Previous values must contain ASUS");
  assert(laptopPat.previousValues[0].value === "ASUS", "Historical value must be ASUS");
  assert(laptopPat.previousValues[0].supersededBy === "Lenovo", "Superseded by must be Lenovo");
});

runTest("TM-2: New explicit correction becomes current", () => {
  const userModel = makeUserModel({
    laptop: {
      key: "laptop",
      normalizedValue: "ASUS",
      value: "ASUS",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "CONFIRMED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      confidence: 1.0,
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    message: "I now prefer Lenovo.",
    longTermUserModel: userModel,
    options: { currentTime: 5000 },
  });

  const laptopPat = res.patterns.find((p) => p.attributeKey === "laptop");
  assert(laptopPat !== undefined, "Laptop pattern must exist");
  assert(laptopPat.currentValue === "Lenovo", "Current value must be Lenovo");
  assert(laptopPat.temporalStatus === "EVOLVING" || laptopPat.temporalStatus === "CURRENT", "Temporal status must be EVOLVING or CURRENT");
  assert(res.directives.some((d) => d.includes("Lenovo rather than the older ASUS")), "Must generate evolution directive");
});

runTest("TM-3: ASUS -> Lenovo evolution is detected", () => {
  const userModel = makeUserModel({
    laptop: {
      key: "laptop",
      normalizedValue: "ASUS",
      value: "ASUS",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "CONFIRMED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    message: "I now prefer Lenovo.",
    longTermUserModel: userModel,
    options: { currentTime: 6000 },
  });

  assert(res.evolutions.length === 1, "Must record 1 evolution");
  assert(res.evolutions[0].attributeKey === "laptop", "Evolution key must be laptop");
  assert(res.evolutions[0].previousValue === "ASUS", "Previous must be ASUS");
  assert(res.evolutions[0].currentValue === "Lenovo", "Current must be Lenovo");
});

runTest("TM-4: Python -> TypeScript evolution is detected", () => {
  const userModel = makeUserModel({
    programming_language: {
      key: "programming_language",
      normalizedValue: "Python",
      value: "Python",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "CONFIRMED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    message: "I now prefer TypeScript.",
    longTermUserModel: userModel,
    options: { currentTime: 7000 },
  });

  const evo = res.evolutions.find((e) => e.attributeKey === "programming_language");
  assert(evo !== undefined, "Programming language evolution must exist");
  assert(evo.previousValue === "Python", "Previous must be Python");
  assert(evo.currentValue === "TypeScript", "Current must be TypeScript");
});

runTest("TM-5: Same value repeated across independent periods becomes recurring/stable when thresholds are satisfied", () => {
  const day1 = 1000 * 60 * 60 * 24 * 1;
  const day2 = 1000 * 60 * 60 * 24 * 2;
  const day3 = 1000 * 60 * 60 * 24 * 3;
  const userModel = makeUserModel({
    language: {
      key: "language",
      normalizedValue: "Bangla",
      value: "Bangla",
      sourceClassification: "CONFIRMED_ADAPTIVE_PATTERN",
      status: "CONFIRMED",
      confidence: 0.85,
      firstObservedAt: day1,
      lastObservedAt: day3,
      independentEvidenceCount: 3,
      evidence: [
        { evidenceId: "evi_1", turnOrSessionId: "turn_1", timestamp: day1, isExplicit: false },
        { evidenceId: "evi_2", turnOrSessionId: "turn_2", timestamp: day2, isExplicit: false },
        { evidenceId: "evi_3", turnOrSessionId: "turn_3", timestamp: day3, isExplicit: false },
      ],
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: day3 + 1000 },
  });

  const langPat = res.patterns.find((p) => p.attributeKey === "language");
  assert(langPat !== undefined, "Language pattern must exist");
  assert(langPat.isStable === true, "Pattern must be stable (count >= 3, periods >= 2, conf >= 0.75)");
  assert(langPat.isRecurring === true, "Pattern must be recurring");
  assert(langPat.temporalStatus === "STABLE", "Temporal status must be STABLE");
});

runTest("TM-6: Same-turn duplicates do not count as independent observations", () => {
  const userModel = makeUserModel({
    format: {
      key: "format",
      normalizedValue: "Bullet Points",
      value: "Bullet Points",
      sourceClassification: "CONFIRMED_ADAPTIVE_PATTERN",
      status: "CANDIDATE",
      confidence: 0.80,
      evidence: [
        { evidenceId: "evi_1", turnOrSessionId: "turn_10", timestamp: 1000 },
        { evidenceId: "evi_2", turnOrSessionId: "turn_10", timestamp: 1000 },
        { evidenceId: "evi_3", turnOrSessionId: "turn_10", timestamp: 1000 },
      ],
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 2000 },
  });

  const formatPat = res.patterns.find((p) => p.attributeKey === "format");
  assert(formatPat !== undefined, "Format pattern must exist");
  assert(formatPat.independentObservationCount === 1, "Independent observation count must be 1 for same-turn duplicates");
  assert(formatPat.isStable === false, "Must not be stable with only 1 independent turn");
});

runTest("TM-7: Duplicate evidence hashes do not inflate observations", () => {
  const userModel = makeUserModel({
    tone: {
      key: "tone",
      normalizedValue: "Direct",
      value: "Direct",
      sourceClassification: "CONFIRMED_ADAPTIVE_PATTERN",
      status: "CANDIDATE",
      confidence: 0.80,
      evidence: [
        { evidenceId: "dup_hash_1", turnOrSessionId: "turn_1", timestamp: 1000, value: "Direct" },
        { evidenceId: "dup_hash_1", turnOrSessionId: "turn_2", timestamp: 2000, value: "Direct" },
      ],
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 3000 },
  });

  const tonePat = res.patterns.find((p) => p.attributeKey === "tone");
  assert(tonePat !== undefined, "Tone pattern must exist");
  assert(tonePat.independentObservationCount === 1, "Duplicate evidence hash must not inflate count");
});

runTest("TM-8: Temporary current-turn preference does not become permanent", () => {
  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    message: "Today I want concise answers.",
    options: { currentTime: 4000 },
  });

  const verbPat = res.patterns.find((p) => p.attributeKey === "verbosity");
  assert(verbPat !== undefined, "Verbosity pattern must exist");
  assert(verbPat.isCurrentTurnOverride === true, "Must be flagged as current turn override");
  assert(verbPat.scope === "TURN", "Scope must be TURN");
  assert(verbPat.isStable === false, "Must not be marked stable");
});

runTest("TM-9: Historical memory does not override current-turn instruction", () => {
  const userModel = makeUserModel({
    language: {
      key: "language",
      normalizedValue: "Bangla",
      value: "Bangla",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "CONFIRMED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      confidence: 1.0,
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    message: "Answer this in English for now.",
    longTermUserModel: userModel,
    options: { currentTime: 5000 },
  });

  const langPat = res.patterns.find((p) => p.attributeKey === "language");
  assert(langPat !== undefined, "Language pattern must exist");
  assert(langPat.currentValue === "English", "Current turn English must take precedence over historical Bangla");
  assert(langPat.isCurrentTurnOverride === true, "Must be marked as current turn override");
});

runTest("TM-10: Higher-authority older evidence beats lower-authority newer evidence when authority rules require it", () => {
  const userModel = makeUserModel({
    laptop: {
      key: "laptop",
      normalizedValue: "ASUS",
      value: "ASUS",
      sourceClassification: "EXPLICIT_USER_MEMORY", // Authority = 80
      status: "CONFIRMED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      confidence: 1.0,
    },
  });

  // Newer inferred signal with lower authority (authority = 40)
  const adaptiveLearning = makeAdaptiveLearning([
    {
      key: "laptop",
      value: "Dell",
      status: "CANDIDATE",
      confidence: 0.70,
      firstObservedAt: 3000,
      lastObservedAt: 4000,
      reinforcementCount: 1,
    },
  ]);

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    adaptiveLearning,
    options: { currentTime: 5000 },
  });

  const laptopPat = res.patterns.find((p) => p.attributeKey === "laptop");
  assert(laptopPat !== undefined, "Laptop pattern must exist");
  assert(laptopPat.currentValue === "ASUS", "Explicit user memory (ASUS) must prevail over inferred candidate (Dell)");
  assert(laptopPat.sourceAuthority === "EXPLICIT_USER_MEMORY", "Authority must remain EXPLICIT_USER_MEMORY");
});

runTest("TM-11: Equal-authority conflicts resolve deterministically", () => {
  const cand1 = {
    key: "format",
    value: "Markdown",
    source: "EXPLICIT_USER",
    timestamp: 1000,
    confidence: 1.0,
  };
  const cand2 = {
    key: "format",
    value: "Bullet Points",
    source: "EXPLICIT_USER",
    timestamp: 2000,
    confidence: 1.0,
  };

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    governanceAnalysis: makeGovernanceAnalysis([cand1, cand2]),
    options: { currentTime: 3000 },
  });

  const formatPat = res.patterns.find((p) => p.attributeKey === "format");
  assert(formatPat !== undefined, "Format pattern must exist");
  assert(formatPat.currentValue === "Bullet Points", "More recent equal-authority observation (timestamp 2000) must win");
});

runTest("TM-12: Superseded memories cannot become current again", () => {
  const userModel = makeUserModel({
    laptop: {
      key: "laptop",
      normalizedValue: "Lenovo",
      value: "Lenovo",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "CONFIRMED",
      firstObservedAt: 1000,
      lastObservedAt: 3000,
      confidence: 1.0,
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 4000 },
  });

  const laptopPat = res.patterns.find((p) => p.attributeKey === "laptop");
  assert(laptopPat?.currentValue === "Lenovo", "Current active value is Lenovo");
  assert(!res.activePatterns.some((p) => p.currentValue === "ASUS"), "Superseded ASUS must not be active");
});

runTest("TM-13: Expired memories cannot become current", () => {
  const userModel = makeUserModel({
    temp_focus: {
      key: "temp_focus",
      normalizedValue: "Exam Prep",
      value: "Exam Prep",
      sourceClassification: "VERIFIED_EVIDENCE",
      status: "EXPIRED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      confidence: 0.70,
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 500000000 },
  });

  const tempPat = res.patterns.find((p) => p.attributeKey === "temp_focus");
  assert(tempPat !== undefined, "Pattern exists");
  assert(tempPat.temporalStatus === "STALE" || tempPat.isStale === true, "Must be stale/historical");
  assert(!res.activePatterns.some((p) => p.attributeKey === "temp_focus"), "Expired pattern cannot be in activePatterns");
});

runTest("TM-14: Deleted memories cannot participate", () => {
  const userModel = makeUserModel({}); // Deleted memories are excluded from userModel upstream
  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 1000 },
  });

  assert(res.patterns.length === 0, "Deleted memories must not appear");
});

runTest("TM-15: Outdated memories cannot become authoritative", () => {
  const userModel = makeUserModel({
    legacy_stack: {
      key: "legacy_stack",
      normalizedValue: "AngularJS",
      value: "AngularJS",
      sourceClassification: "REPEATED_VALIDATED_SIGNAL",
      status: "OUTDATED",
      firstObservedAt: 100,
      lastObservedAt: 200,
      confidence: 0.50,
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 999999999 }, // Far in future -> stale
  });

  const legacyPat = res.patterns.find((p) => p.attributeKey === "legacy_stack");
  assert(legacyPat?.isStale === true, "Must be marked stale");
  assert(res.directives.length === 0, "Outdated stale pattern must not generate authoritative directives");
});

runTest("TM-16: Topic-specific temporal history does not leak into unrelated topics", () => {
  const userModel = makeUserModel({
    laptop: {
      key: "laptop",
      normalizedValue: "Lenovo",
      value: "Lenovo",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "CONFIRMED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    message: "What is the weather in Tokyo today?",
    longTermUserModel: userModel,
    options: {
      currentTime: 3000,
      isTopicIsolated: true, // Topic switch to weather
      activeTopic: "weather",
    },
  });

  assert(!res.activePatterns.some((p) => p.attributeKey === "laptop"), "Laptop must not be in activePatterns under topic isolation");
  assert(!res.directives.some((d) => d.includes("laptop") || d.includes("Lenovo")), "Laptop directive must not leak into weather response");
});

runTest("TM-17: Global communication preference survives topic switches", () => {
  const userModel = makeUserModel({
    language: {
      key: "language",
      normalizedValue: "Bangla",
      value: "Bangla",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "CONFIRMED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      confidence: 1.0,
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    message: "What is the weather in Tokyo?",
    longTermUserModel: userModel,
    options: {
      currentTime: 3000,
      isTopicIsolated: true,
      activeTopic: "weather",
    },
  });

  const langPat = res.activePatterns.find((p) => p.attributeKey === "language");
  assert(langPat !== undefined, "Global language preference must survive topic switch");
  assert(res.directives.some((d) => d.includes("Bangla")), "Global language directive must be emitted");
});

runTest("TM-18: Predictive-only evidence cannot establish temporal stability", () => {
  const userModel = makeUserModel({
    proactive_action: {
      key: "proactive_action",
      normalizedValue: "Show Code",
      value: "Show Code",
      sourceClassification: "PREDICTIVE_CONTEXT",
      confidence: 0.99,
      evidence: [
        { evidenceId: "pred_1", source: "PREDICTIVE_CONTEXT", timestamp: 1000 },
        { evidenceId: "pred_2", source: "PREDICTIVE_CONTEXT", timestamp: 2000 },
        { evidenceId: "pred_3", source: "PREDICTIVE_CONTEXT", timestamp: 3000 },
      ],
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 4000 },
  });

  const predPat = res.patterns.find((p) => p.attributeKey === "proactive_action");
  assert(predPat !== undefined, "Pattern exists");
  assert(predPat.isStable === false, "Predictive-only evidence CANNOT establish stability");
});

runTest("TM-19: Predictive-only evidence cannot establish recurrence", () => {
  const userModel = makeUserModel({
    proactive_suggestion: {
      key: "proactive_suggestion",
      normalizedValue: "Suggest Refactor",
      value: "Suggest Refactor",
      sourceClassification: "PREDICTIVE_CONTEXT",
      evidence: [
        { evidenceId: "pred_1", source: "PREDICTIVE_CONTEXT", timestamp: 1000 },
        { evidenceId: "pred_2", source: "PREDICTIVE_CONTEXT", timestamp: 2000 },
      ],
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 3000 },
  });

  const predPat = res.patterns.find((p) => p.attributeKey === "proactive_suggestion");
  assert(predPat?.isRecurring === false, "Predictive-only evidence CANNOT establish recurrence");
});

runTest("TM-20: Predictive evidence cannot increase evidence counts", () => {
  const { distinctTurnsCount } = temporalMemoryEngine.extractObservations(
    [
      { evidenceId: "pred_1", source: "PREDICTIVE_CONTEXT", timestamp: 1000 },
      { evidenceId: "pred_2", source: "PREDICTIVE_CONTEXT", timestamp: 2000 },
    ],
    "val",
    "PREDICTIVE_CONTEXT",
    1000,
    2000,
    1
  );

  assert(distinctTurnsCount === 0, "Predictive observations must count as 0 independent turns");
});

runTest("TM-21: Sensitive credentials are suppressed", () => {
  const userModel = makeUserModel({
    api_key: {
      key: "api_key",
      normalizedValue: "bearer secret_token_xyz999",
      value: "bearer secret_token_xyz999",
      sourceClassification: "EXPLICIT_USER_MEMORY",
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 1000 },
  });

  assert(res.patterns.length === 0, "Sensitive credential must be suppressed completely");
  assert(res.diagnostics.suppressedSensitiveCount === 1, "Must record 1 suppressed sensitive item");
});

runTest("TM-22: Domain interest does not become ownership", () => {
  const userModel = makeUserModel({
    laptop_query: {
      key: "domain_laptop",
      normalizedValue: "MacBook Pro",
      value: "MacBook Pro",
      sourceClassification: "REPEATED_VALIDATED_SIGNAL",
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 1000 },
  });

  assert(!res.directives.some((d) => d.includes("owns") || d.includes("has a MacBook")), "Must not infer ownership");
});

runTest("TM-23: Repeated TypeScript questions do not create professional expertise", () => {
  const userModel = makeUserModel({
    tech_stack: {
      key: "tech_stack",
      normalizedValue: "TypeScript",
      value: "TypeScript",
      sourceClassification: "REPEATED_VALIDATED_SIGNAL",
      confidence: 0.85,
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 1000 },
  });

  assert(!res.directives.some((d) => d.includes("is a professional") || d.includes("senior engineer")), "Must not invent profession or expertise");
});

runTest("TM-24: Same input + same currentTime produces identical output", () => {
  const userModel = makeUserModel({
    language: {
      key: "language",
      normalizedValue: "Bangla",
      value: "Bangla",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "CONFIRMED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      confidence: 1.0,
    },
  });

  const res1 = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 5000 },
  });

  const res2 = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 5000 },
  });

  assert(JSON.stringify(res1) === JSON.stringify(res2), "Deterministic evaluation must match identically");
});

runTest("TM-25: Changing injected currentTime changes temporal calculations deterministically", () => {
  const userModel = makeUserModel({
    preference: {
      key: "tone",
      normalizedValue: "Direct",
      value: "Direct",
      sourceClassification: "REPEATED_VALIDATED_SIGNAL",
      status: "CONFIRMED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
    },
  });

  const resFresh = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 2500 }, // Fresh
  });

  const resStale = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 2000 + 40 * 24 * 60 * 60 * 1000 }, // 40 days later -> stale
  });

  const freshPat = resFresh.patterns.find((p) => p.attributeKey === "tone");
  const stalePat = resStale.patterns.find((p) => p.attributeKey === "tone");
  assert(freshPat?.isStale === false, "Fresh pattern must not be stale");
  assert(stalePat?.isStale === true, "Stale pattern must be marked stale");
  assert(freshPat!.relevanceScore > stalePat!.relevanceScore, "Fresh relevance score must exceed stale score");
});

runTest("TM-26: Step 9 performs no persistent memory mutation", () => {
  const userModel = makeUserModel({
    language: {
      key: "language",
      normalizedValue: "Bangla",
      value: "Bangla",
      sourceClassification: "EXPLICIT_USER_MEMORY",
    },
  });

  const originalStr = JSON.stringify(userModel);
  temporalMemoryEngine.evaluate({
    userId: "test_user",
    message: "Answer this in English for now.",
    longTermUserModel: userModel,
    options: { currentTime: 5000 },
  });

  assert(JSON.stringify(userModel) === originalStr, "Input user model object must remain unmodified");
});

runTest("TM-27: Historical lineage is preserved after preference evolution", () => {
  const userModel = makeUserModel({
    laptop: {
      key: "laptop",
      normalizedValue: "ASUS",
      value: "ASUS",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "CONFIRMED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      lineage: ["mem_laptop_asus_1"],
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    message: "I now prefer Lenovo.",
    longTermUserModel: userModel,
    options: { currentTime: 5000 },
  });

  const laptopPat = res.patterns.find((p) => p.attributeKey === "laptop");
  assert(laptopPat !== undefined, "Pattern exists");
  assert(laptopPat.lineage.includes("mem_laptop_asus_1"), "Historical lineage ID must be preserved");
});

runTest("TM-28: First observation timestamp remains stable", () => {
  const userModel = makeUserModel({
    format: {
      key: "format",
      normalizedValue: "Bullet Points",
      value: "Bullet Points",
      sourceClassification: "CONFIRMED_ADAPTIVE_PATTERN",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
    },
  });

  const adaptiveLearning = makeAdaptiveLearning([
    {
      key: "format",
      value: "Bullet Points",
      firstObservedAt: 1000,
      lastObservedAt: 5000,
      reinforcementCount: 3,
    },
  ]);

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    adaptiveLearning,
    options: { currentTime: 6000 },
  });

  const formatPat = res.patterns.find((p) => p.attributeKey === "format");
  assert(formatPat?.firstObservedAt === 1000, "firstObservedAt must remain anchored to earliest observation");
});

runTest("TM-29: Last observation timestamp updates correctly", () => {
  const userModel = makeUserModel({
    verbosity: {
      key: "verbosity",
      normalizedValue: "Concise",
      value: "Concise",
      sourceClassification: "CONFIRMED_ADAPTIVE_PATTERN",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
    },
  });

  const adaptiveLearning = makeAdaptiveLearning([
    {
      key: "verbosity",
      value: "Concise",
      firstObservedAt: 1000,
      lastObservedAt: 7500,
      reinforcementCount: 4,
    },
  ]);

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    adaptiveLearning,
    options: { currentTime: 8000 },
  });

  const verbPat = res.patterns.find((p) => p.attributeKey === "verbosity");
  assert(verbPat?.lastObservedAt === 7500, "lastObservedAt must update to latest timestamp");
});

runTest("TM-30: Independent observation count remains bounded and correct", () => {
  const userModel = makeUserModel({
    language: {
      key: "language",
      normalizedValue: "Bangla",
      value: "Bangla",
      sourceClassification: "CONFIRMED_ADAPTIVE_PATTERN",
      evidence: [
        { evidenceId: "e1", turnOrSessionId: "turn_1", timestamp: 1000 },
        { evidenceId: "e2", turnOrSessionId: "turn_2", timestamp: 2000 },
        { evidenceId: "e3", turnOrSessionId: "turn_3", timestamp: 3000 },
        { evidenceId: "e4", turnOrSessionId: "turn_3", timestamp: 3000 }, // Duplicate turn
      ],
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 4000 },
  });

  const langPat = res.patterns.find((p) => p.attributeKey === "language");
  assert(langPat?.independentObservationCount === 3, "Count must be exactly 3 distinct turns");
});

runTest("TM-31: Stable pattern requires multiple independent time periods", () => {
  // 3 observations but all in the same session/period
  const userModel = makeUserModel({
    tone: {
      key: "tone",
      normalizedValue: "Direct",
      value: "Direct",
      sourceClassification: "CONFIRMED_ADAPTIVE_PATTERN",
      confidence: 0.85,
      evidence: [
        { evidenceId: "e1", turnOrSessionId: "turn_1", timestamp: 1000 },
        { evidenceId: "e2", turnOrSessionId: "turn_2", timestamp: 1050 },
        { evidenceId: "e3", turnOrSessionId: "turn_3", timestamp: 1100 },
      ],
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 2000 },
  });

  const tonePat = res.patterns.find((p) => p.attributeKey === "tone");
  assert(tonePat !== undefined, "Pattern exists");
  assert(tonePat.activePeriods.length === 1, "Only 1 active calendar period");
  assert(tonePat.isStable === false, "Must not be STABLE when observed only within 1 period");
});

runTest("TM-32: Stale detection is deterministic", () => {
  const userModel = makeUserModel({
    framework: {
      key: "tech_stack",
      normalizedValue: "Svelte",
      value: "Svelte",
      sourceClassification: "REPEATED_VALIDATED_SIGNAL",
      confidence: 0.65,
      firstObservedAt: 1000,
      lastObservedAt: 2000,
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: {
      currentTime: 2000 + 35 * 24 * 60 * 60 * 1000, // 35 days elapsed (> 30 days)
    },
  });

  const pat = res.patterns.find((p) => p.attributeKey === "programming_language" || p.attributeKey === "tech_stack");
  assert(pat?.isStale === true, "Must be flagged as stale after 35 days without reinforcement");
  assert(pat?.temporalStatus === "STALE", "Status must be STALE");
});

runTest("TM-33: Important stable memories decay more slowly than low-importance temporary patterns", () => {
  // Stable pattern (90-day threshold)
  const stableAttr = {
    key: "language",
    normalizedValue: "Bangla",
    value: "Bangla",
    sourceClassification: "EXPLICIT_USER_MEMORY",
    status: "CONFIRMED",
    confidence: 1.0,
    firstObservedAt: 1000,
    lastObservedAt: 1000 + 40 * 24 * 60 * 60 * 1000, // 40 days ago
    evidence: [
      { evidenceId: "e1", turnOrSessionId: "turn_1", timestamp: 1000 },
      { evidenceId: "e2", turnOrSessionId: "turn_2", timestamp: 2000 },
      { evidenceId: "e3", turnOrSessionId: "turn_3", timestamp: 3000 },
    ],
  };

  // Temporary candidate (30-day threshold)
  const tempAttr = {
    key: "format",
    normalizedValue: "Tables",
    value: "Tables",
    sourceClassification: "REPEATED_VALIDATED_SIGNAL",
    status: "CANDIDATE",
    confidence: 0.60,
    firstObservedAt: 1000,
    lastObservedAt: 1000, // 40 days ago
  };

  const userModel = makeUserModel({ language: stableAttr, format: tempAttr });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: {
      currentTime: 1000 + 40 * 24 * 60 * 60 * 1000, // 40 days elapsed
    },
  });

  const langPat = res.patterns.find((p) => p.attributeKey === "language");
  const formatPat = res.patterns.find((p) => p.attributeKey === "format");

  assert(langPat?.isStale === false, "Stable high-authority preference remains non-stale after 40 days");
  assert(formatPat?.isStale === true, "Low-importance candidate becomes stale after 40 days (> 30 days)");
});

runTest("TM-34: Current-turn explicit instruction always wins", () => {
  const userModel = makeUserModel({
    verbosity: {
      key: "verbosity",
      normalizedValue: "Detailed",
      value: "Detailed",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "CONFIRMED",
      confidence: 1.0,
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    message: "Today I want concise answers.",
    longTermUserModel: userModel,
    options: { currentTime: 5000 },
  });

  const verbPat = res.patterns.find((p) => p.attributeKey === "verbosity");
  assert(verbPat?.currentValue === "Concise", "Current-turn concise instruction must win");
  assert(res.directives.some((d) => d.includes("verbosity: Concise")), "Must generate current-turn directive");
});

runTest("TM-35: Explicit user correction wins over older inferred preference", () => {
  const adaptiveLearning = makeAdaptiveLearning([
    {
      key: "preferred_laptop",
      value: "ASUS",
      status: "CONFIRMED",
      confidence: 0.85,
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      reinforcementCount: 3,
    },
  ]);

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    message: "I now prefer Lenovo.",
    adaptiveLearning,
    options: { currentTime: 3000 },
  });

  const laptopPat = res.patterns.find((p) => p.attributeKey === "laptop");
  assert(laptopPat?.currentValue === "Lenovo", "Explicit user correction (Lenovo) must win over inferred ASUS");
  assert(laptopPat?.sourceAuthority === "EXPLICIT_USER_MEMORY", "Authority must be EXPLICIT_USER_MEMORY");
});

runTest("TM-36: Sanitized directives contain no internal IDs or raw scoring data", () => {
  const userModel = makeUserModel({
    language: {
      key: "language",
      normalizedValue: "Bangla",
      value: "Bangla",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "CONFIRMED",
      confidence: 0.934812,
      id: "raw_internal_id_12345",
      evidence: [{ evidenceId: "raw_evi_hash_9876", timestamp: 12345678 }],
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 15000 },
  });

  for (const d of res.directives) {
    assert(!d.includes("raw_internal_id"), "Directive must not contain internal ID");
    assert(!d.includes("raw_evi_hash"), "Directive must not contain evidence hash");
    assert(!d.includes("0.934812"), "Directive must not contain raw confidence score");
    assert(!d.includes("12345678"), "Directive must not contain raw timestamp");
  }
});

runTest("TM-37: Cross-session recurring pattern detection works without inventing facts", () => {
  const userModel = makeUserModel({
    explanation_style: {
      key: "format",
      normalizedValue: "Step-by-step",
      value: "Step-by-step",
      sourceClassification: "CONFIRMED_ADAPTIVE_PATTERN",
      confidence: 0.80,
      evidence: [
        { evidenceId: "e1", turnOrSessionId: "session_A_turn_1", timestamp: 1000 * 60 * 60 * 24 * 1 },
        { evidenceId: "e2", turnOrSessionId: "session_B_turn_1", timestamp: 1000 * 60 * 60 * 24 * 2 },
      ],
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 1000 * 60 * 60 * 24 * 3 },
  });

  const formatPat = res.patterns.find((p) => p.attributeKey === "format");
  assert(formatPat?.isRecurring === true, "Must be marked recurring across multiple session periods");
  assert(!res.directives.some((d) => d.includes("professor") || d.includes("student")), "Must not invent life facts or occupation");
});

runTest("TM-38: Project-scoped temporal memory does not become global", () => {
  const userModel = makeUserModel({
    project_lang: {
      key: "project_framework",
      dimension: "PROJECT_CONTEXT",
      normalizedValue: "Next.js",
      value: "Next.js",
      sourceClassification: "VERIFIED_EVIDENCE",
      status: "CONFIRMED",
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 2000 },
  });

  const pat = res.patterns.find((p) => p.currentValue === "Next.js");
  assert(pat?.scope === "PROJECT", "Scope must remain PROJECT");
  assert(pat?.scope !== "GLOBAL", "Must not be GLOBAL");
});

runTest("TM-39: Topic-scoped temporal memory does not become global", () => {
  const userModel = makeUserModel({
    topic_pref: {
      key: "crypto_interest",
      dimension: "DOMAIN_INTEREST",
      normalizedValue: "Bitcoin",
      value: "Bitcoin",
      sourceClassification: "VERIFIED_EVIDENCE",
    },
  });

  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 2000 },
  });

  const pat = res.patterns.find((p) => p.currentValue === "Bitcoin");
  assert(pat?.scope === "TOPIC", "Scope must remain TOPIC");
  assert(pat?.scope !== "GLOBAL", "Must not be GLOBAL");
});

runTest("TM-40: Idempotent repeated analysis produces identical results", () => {
  const userModel = makeUserModel({
    lang: {
      key: "language",
      normalizedValue: "Bangla",
      value: "Bangla",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "CONFIRMED",
    },
    verb: {
      key: "verbosity",
      normalizedValue: "Concise",
      value: "Concise",
      sourceClassification: "CONFIRMED_ADAPTIVE_PATTERN",
    },
  });

  const input = {
    userId: "test_user",
    message: "Tell me about cars.",
    longTermUserModel: userModel,
    options: { currentTime: 10000 },
  };

  const resA = temporalMemoryEngine.evaluate(input);
  const resB = temporalMemoryEngine.evaluate(input);

  assert(JSON.stringify(resA) === JSON.stringify(resB), "Repeated analysis of identical input must be strictly idempotent");
});

// ---------------------------------------------------------------------------
// TARGETED INVARIANT TESTS (TI-1 to TI-20)
// ---------------------------------------------------------------------------
console.log("\n--- RUNNING TARGETED INVARIANT SUITE (TI-1 to TI-20) ---");

runTest("TI-1: isAuthoritativeTemporalEvidence strictly identifies authoritative sources", () => {
  assert(temporalMemoryEngine.isAuthoritativeTemporalEvidence("CURRENT_TURN_EXPLICIT") === true, "CURRENT_TURN_EXPLICIT must be authoritative");
  assert(temporalMemoryEngine.isAuthoritativeTemporalEvidence("EXPLICIT_USER_MEMORY") === true, "EXPLICIT_USER_MEMORY must be authoritative");
  assert(temporalMemoryEngine.isAuthoritativeTemporalEvidence("VERIFIED_EVIDENCE") === true, "VERIFIED_EVIDENCE must be authoritative");
  assert(temporalMemoryEngine.isAuthoritativeTemporalEvidence("CONFIRMED_ADAPTIVE_PATTERN") === false, "CONFIRMED_ADAPTIVE_PATTERN is adaptive, not hard verified evidence");
  assert(temporalMemoryEngine.isAuthoritativeTemporalEvidence("REPEATED_VALIDATED_SIGNAL") === false, "REPEATED_VALIDATED_SIGNAL is signal, not verified evidence");
  assert(temporalMemoryEngine.isAuthoritativeTemporalEvidence("PREDICTIVE_CONTEXT") === false, "PREDICTIVE_CONTEXT is advisory, never authoritative evidence");
});

runTest("TI-2: Governance Candidate without explicit/verified source is not classified as VERIFIED_EVIDENCE", () => {
  const cand = {
    key: "laptop",
    value: "Dell XPS",
    source: "INFERRED_CONTEXT",
    timestamp: 5000,
    confidence: 0.7,
  };
  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    governanceAnalysis: makeGovernanceAnalysis([cand]),
    options: { currentTime: 6000 },
  });
  const pat = res.patterns.find((p) => p.attributeKey === "laptop");
  assert(pat !== undefined, "Pattern must exist");
  assert(pat.sourceAuthority !== "VERIFIED_EVIDENCE", "Unconfirmed candidate must NOT receive VERIFIED_EVIDENCE authority");
  assert(pat.sourceAuthority === "REPEATED_VALIDATED_SIGNAL", "Candidate should receive REPEATED_VALIDATED_SIGNAL authority");
});

runTest("TI-3: Governance Candidate with explicit source receives EXPLICIT_USER_MEMORY", () => {
  const cand = {
    key: "laptop",
    value: "MacBook Pro",
    source: "EXPLICIT_USER",
    timestamp: 5000,
    confidence: 1.0,
  };
  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    governanceAnalysis: makeGovernanceAnalysis([cand]),
    options: { currentTime: 6000 },
  });
  const pat = res.patterns.find((p) => p.attributeKey === "laptop");
  assert(pat !== undefined, "Pattern must exist");
  assert(pat.sourceAuthority === "EXPLICIT_USER_MEMORY", "Explicit source must receive EXPLICIT_USER_MEMORY authority");
});

runTest("TI-4: Governance Candidate with verified tool output receives VERIFIED_EVIDENCE", () => {
  const cand = {
    key: "current_city",
    value: "Dhaka",
    source: "VERIFIED_TOOL_OUTPUT",
    sourceClassification: "VERIFIED_EVIDENCE",
    timestamp: 5000,
    confidence: 0.95,
  };
  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    governanceAnalysis: makeGovernanceAnalysis([cand]),
    options: { currentTime: 6000 },
  });
  const pat = res.patterns.find((p) => p.attributeKey === "current_city");
  assert(pat !== undefined, "Pattern must exist");
  assert(pat.sourceAuthority === "VERIFIED_EVIDENCE", "Verified tool output must receive VERIFIED_EVIDENCE authority");
});

runTest("TI-5: Same-day multiple observations collapse to a single day period", () => {
  const baseDay = 1000 * 60 * 60 * 24 * 10;
  const { observations, distinctPeriods, distinctTurnsCount } = temporalMemoryEngine.extractObservations(
    [
      { evidenceId: "e1", turnOrSessionId: "turn_1", timestamp: baseDay + 1000 },
      { evidenceId: "e2", turnOrSessionId: "turn_2", timestamp: baseDay + 5000 },
      { evidenceId: "e3", turnOrSessionId: "turn_3", timestamp: baseDay + 10000 },
    ],
    "Bangla",
    "EXPLICIT_USER_MEMORY",
    baseDay,
    baseDay + 10000,
    3
  );
  assert(observations.length === 3, "All 3 observations must be recorded");
  assert(distinctTurnsCount === 3, "Distinct turns count must be 3");
  assert(distinctPeriods.length === 1, "Same-day observations must collapse to exactly 1 active period");
});

runTest("TI-6: Multi-day observations generate distinct active periods", () => {
  const day1 = 1000 * 60 * 60 * 24 * 1;
  const day2 = 1000 * 60 * 60 * 24 * 2;
  const day3 = 1000 * 60 * 60 * 24 * 3;
  const { distinctPeriods } = temporalMemoryEngine.extractObservations(
    [
      { evidenceId: "e1", turnOrSessionId: "turn_1", timestamp: day1 },
      { evidenceId: "e2", turnOrSessionId: "turn_2", timestamp: day2 },
      { evidenceId: "e3", turnOrSessionId: "turn_3", timestamp: day3 },
    ],
    "Bangla",
    "CONFIRMED_ADAPTIVE_PATTERN",
    day1,
    day3,
    3
  );
  assert(distinctPeriods.length === 3, "3 different calendar days must produce 3 distinct periods");
});

runTest("TI-7: Predictive evidence sources are completely stripped from extractObservations", () => {
  const { observations, distinctPeriods, distinctTurnsCount } = temporalMemoryEngine.extractObservations(
    [
      { evidenceId: "p1", source: "PREDICTIVE_CONTEXT", turnOrSessionId: "pred_1", timestamp: 1000 },
      { evidenceId: "p2", source: "PREDICTION", turnOrSessionId: "pred_2", timestamp: 2000 },
    ],
    "Concise",
    "PREDICTIVE_CONTEXT",
    1000,
    2000,
    2
  );
  assert(observations.length === 0, "Predictive evidence must produce zero temporal observations");
  assert(distinctTurnsCount === 0, "Distinct turns must be 0 for predictive-only items");
  assert(distinctPeriods.length === 0, "Distinct periods must be 0 for predictive-only items");
});

runTest("TI-8: Stability requires at least 2 distinct periods in addition to 3 observations", () => {
  const baseDay = 1000 * 60 * 60 * 24 * 10;
  const userModel = makeUserModel({
    tone: {
      key: "tone",
      normalizedValue: "Friendly",
      value: "Friendly",
      sourceClassification: "CONFIRMED_ADAPTIVE_PATTERN",
      confidence: 0.85,
      evidence: [
        { evidenceId: "e1", turnOrSessionId: "turn_1", timestamp: baseDay + 100 },
        { evidenceId: "e2", turnOrSessionId: "turn_2", timestamp: baseDay + 200 },
        { evidenceId: "e3", turnOrSessionId: "turn_3", timestamp: baseDay + 300 },
      ],
    },
  });
  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: baseDay + 500 },
  });
  const tonePat = res.patterns.find((p) => p.attributeKey === "tone");
  assert(tonePat !== undefined, "Tone pattern must exist");
  assert(tonePat.independentObservationCount === 3, "Observation count is 3");
  assert(tonePat.activePeriods.length === 1, "Only 1 active period (same day)");
  assert(tonePat.isStable === false, "Must not be stable if all observations are within a single day");
});

runTest("TI-9: Injected currentTime is strictly respected across all computations", () => {
  const userModel = makeUserModel({
    laptop: {
      key: "laptop",
      normalizedValue: "Lenovo",
      value: "Lenovo",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "CONFIRMED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      confidence: 1.0,
    },
  });
  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 1000000 },
  });
  assert(res.analyzedAt === 1000000, "analyzedAt must match injected currentTime exactly");
});

runTest("TI-10: Quarantined attributes are completely excluded from analysis", () => {
  const userModel = makeUserModel({
    secret_note: {
      key: "secret_note",
      normalizedValue: "Confidential",
      value: "Confidential",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "QUARANTINED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
    },
  });
  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 3000 },
  });
  assert(!res.patterns.some((p) => p.attributeKey === "secret_note"), "QUARANTINED memory must be excluded");
});

runTest("TI-11: Deleted attributes are completely excluded from analysis", () => {
  const userModel = makeUserModel({
    deleted_pref: {
      key: "old_style",
      normalizedValue: "Raw",
      value: "Raw",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "DELETED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
    },
  });
  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 3000 },
  });
  assert(!res.patterns.some((p) => p.attributeKey === "old_style"), "DELETED memory must be excluded");
});

runTest("TI-12: Expired attributes are classified as historical EXPIRED patterns", () => {
  const userModel = makeUserModel({
    temporary_coupon: {
      key: "coupon",
      normalizedValue: "SAVE20",
      value: "SAVE20",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "EXPIRED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
    },
  });
  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 3000 },
  });
  const pat = res.patterns.find((p) => p.attributeKey === "coupon");
  assert(pat !== undefined, "Pattern must exist");
  assert(pat.temporalStatus === "EXPIRED", "Status must be EXPIRED");
  assert(res.historicalPatterns.some((p) => p.attributeKey === "coupon"), "Must be in historicalPatterns");
  assert(!res.activePatterns.some((p) => p.attributeKey === "coupon"), "Must not be in activePatterns");
});

runTest("TI-13: Outdated attributes are classified as STALE and placed in historical patterns", () => {
  const userModel = makeUserModel({
    old_version: {
      key: "library_version",
      normalizedValue: "v1.0",
      value: "v1.0",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "OUTDATED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
    },
  });
  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 3000 },
  });
  const pat = res.patterns.find((p) => p.attributeKey === "library_version");
  assert(pat !== undefined, "Pattern must exist");
  assert(pat.temporalStatus === "STALE", "Status must be STALE");
  assert(pat.isStale === true, "isStale flag must be true");
});

runTest("TI-14: Global preferences generate directives even under topic switch", () => {
  const userModel = makeUserModel({
    lang: {
      key: "language",
      normalizedValue: "Bangla",
      value: "Bangla",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "CONFIRMED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      confidence: 1.0,
    },
    laptop: {
      key: "laptop",
      normalizedValue: "Lenovo",
      value: "Lenovo",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "CONFIRMED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      confidence: 1.0,
    },
  });
  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    message: "How is the weather in Sylhet?",
    longTermUserModel: userModel,
    options: {
      currentTime: 3000,
      isTopicIsolated: true,
      activeTopic: "weather inquiry",
    },
  });
  assert(res.directives.some((d) => d.includes("Bangla")), "Global language directive must be emitted");
  assert(!res.directives.some((d) => d.includes("Lenovo")), "Topic-isolated laptop preference must not emit directive");
  assert(res.diagnostics.topicIsolatedCount >= 1, "topicIsolatedCount must be incremented");
});

runTest("TI-15: Directives never leak raw UUIDs, floats, or evidence hashes", () => {
  const userModel = makeUserModel({
    verb: {
      key: "verbosity",
      normalizedValue: "Concise",
      value: "Concise",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "CONFIRMED",
      confidence: 0.8872134,
      id: "raw_model_uuid_998877",
      evidence: [{ evidenceId: "raw_evidence_hash_aabbcc", timestamp: 1700000000000 }],
    },
  });
  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 1700000050000 },
  });
  for (const d of res.directives) {
    assert(!d.includes("raw_model_uuid"), "No UUID leakage in directives");
    assert(!d.includes("raw_evidence_hash"), "No hash leakage in directives");
    assert(!d.includes("0.8872134"), "No raw float leakage in directives");
    assert(!d.includes("1700000000000"), "No timestamp leakage in directives");
  }
});

runTest("TI-16: Contradiction relation is established when higher authority rejects lower authority", () => {
  const userModel = makeUserModel({
    laptop: {
      key: "laptop",
      normalizedValue: "MacBook Pro",
      value: "MacBook Pro",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "CONFIRMED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      confidence: 1.0,
    },
  });
  const adaptiveLearning = makeAdaptiveLearning([
    {
      key: "laptop",
      value: "Chromebook",
      status: "CANDIDATE",
      confidence: 0.6,
      firstObservedAt: 3000,
      lastObservedAt: 4000,
    },
  ]);
  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    adaptiveLearning,
    options: { currentTime: 5000 },
  });
  const contradictRel = res.relations.find((r) => r.relationType === "CONTRADICTS");
  assert(contradictRel !== undefined, "CONTRADICTS relation must be created");
  assert(contradictRel.sourceKey.includes("Chromebook"), "Rejected candidate is source of contradiction");
  assert(contradictRel.targetKey.includes("MacBook Pro"), "Higher authority target is preserved");
});

runTest("TI-17: SUPERSEDES and EVOLVED_TO relations established when higher authority replaces older value", () => {
  const userModel = makeUserModel({
    editor: {
      key: "editor",
      normalizedValue: "Vim",
      value: "Vim",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "CONFIRMED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      confidence: 1.0,
    },
  });
  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    message: "From now on, switch to Neovim",
    longTermUserModel: userModel,
    governanceAnalysis: makeGovernanceAnalysis([
      {
        key: "editor",
        value: "Neovim",
        source: "EXPLICIT_USER",
        timestamp: 5000,
        confidence: 1.0,
      },
    ]),
    options: { currentTime: 6000 },
  });
  assert(res.relations.some((r) => r.relationType === "SUPERSEDES"), "SUPERSEDES relation must be recorded");
  assert(res.relations.some((r) => r.relationType === "EVOLVED_TO"), "EVOLVED_TO relation must be recorded");
});

runTest("TI-18: Multiple sensitive patterns in same input are all suppressed", () => {
  const userModel = makeUserModel({
    pwd: { key: "admin_password", value: "SuperSecret123!" },
    api_key: { key: "openai_api_key", value: "sk-1234567890abcdef" },
    card: { key: "credit_card", value: "4111-2222-3333-4444" },
  });
  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 5000 },
  });
  assert(res.diagnostics.suppressedSensitiveCount === 3, "All 3 sensitive items must be suppressed");
  assert(res.patterns.length === 0, "No sensitive patterns admitted");
});

runTest("TI-19: Forbidden identity dimensions are completely filtered", () => {
  const userModel = makeUserModel({
    job: { key: "profession", value: "Senior Architect" },
    salary: { key: "salary", value: "$200,000" },
    age: { key: "age", value: "35" },
    health: { key: "medical_condition", value: "Hypertension" },
  });
  const res = temporalMemoryEngine.evaluate({
    userId: "test_user",
    longTermUserModel: userModel,
    options: { currentTime: 5000 },
  });
  assert(res.patterns.length === 0, "Forbidden identity attributes must never create temporal patterns");
});

runTest("TI-20: Full BrainEngine pipeline produces unified TemporalMemoryAnalysis", () => {
  const analysis = brainEngine.analyze("Amar default language Bangla koro", [], undefined, "session_test", undefined, {
    currentTime: 10000,
  });
  assert(analysis.temporalMemoryAnalysis !== undefined, "temporalMemoryAnalysis must be present on BrainAnalysis");
  assert(analysis.temporalMemoryAnalysis.patterns.length >= 1, "Temporal patterns must be analyzed");
  assert(analysis.promptDirectives.length >= 1, "Safe directives must reach promptDirectives");
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("=============================================");
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log("=============================================");

if (failedTests > 0) {
  process.exit(1);
}
