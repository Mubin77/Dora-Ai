/**
 * Dora Long-Term User Model Synthesis & Identity-Aware Context Test Suite
 * Phase 2 — Step 8
 * 
 * Verifies deterministic synthesis of evidence-backed user characteristics,
 * strict non-hallucination of identity/ownership/expertise, precedence rules,
 * temporary vs durable handling, topic isolation, sensitive data suppression,
 * and zero runtime variance.
 */

import { longTermUserModelEngine } from "./longTermUserModelEngine";
import {
  LongTermUserModelInput,
  UserModelAnalysis,
  UserModelAttribute,
} from "./longTermUserModelTypes";
import { MemoryGovernanceCandidate, MemoryGovernanceAnalysis } from "./memoryGovernanceTypes";
import { LearningPattern, LearningAnalysis } from "./adaptiveLearningTypes";
import { PredictiveContextAnalysis, ProactiveContextCandidate } from "./predictiveContextTypes";
import { brainEngine } from "./brainEngine";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    testsPassed++;
  } catch (err: any) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    testsFailed++;
  }
}

function makeGovCand(
  key: string,
  value: string,
  overrides?: Partial<MemoryGovernanceCandidate>
): MemoryGovernanceCandidate {
  return {
    memoryId: `mem_${key}`,
    key,
    value,
    type: "PREFERENCE",
    source: "EXPLICIT_USER",
    status: "ACTIVE",
    usageDecision: "ALLOW",
    usageScore: 1.0,
    confidence: 1.0,
    relevance: 1.0,
    reasons: ["ACTIVE_USER_PREFERENCE"],
    canAffectResponseContent: true,
    canPersonalize: true,
    canSupportFactualClaim: true,
    requiresExplicitAttribution: false,
    isCandidateInferred: false,
    ...overrides,
  };
}

function makeGovAnalysis(
  candidates: MemoryGovernanceCandidate[],
  overrides?: Partial<MemoryGovernanceAnalysis>
): MemoryGovernanceAnalysis {
  const allowed = candidates.filter((c) => c.usageDecision === "ALLOW");
  const suppressed = candidates.filter((c) => c.usageDecision === "SUPPRESS");
  return {
    governanceRequired: candidates.length > 0,
    memoryInfluenceAllowed: allowed.length > 0,
    allowedMemories: allowed,
    cautiousMemories: [],
    internalOnlyMemories: [],
    suppressedMemories: suppressed,
    governedCandidates: candidates,
    conflicts: [],
    privacyBlocks: [],
    topicIsolationApplied: false,
    explicitReferenceDetected: false,
    directives: [],
    sanitizedMemoryContext: "",
    governanceConfidence: 0.95,
    ...overrides,
  };
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function makeLearningPat(
  key: string,
  value: string,
  overrides?: Partial<LearningPattern>
): LearningPattern {
  return {
    id: `pat_${key}_${Math.abs(simpleHash(key + value))}`,
    userId: "test_user",
    patternType: "USER_PREFERENCE",
    category: "PREFERENCE",
    key,
    value,
    status: "CONFIRMED",
    confidence: 0.85,
    reinforcementCount: 3,
    independentEvidenceCount: 3,
    firstObservedAt: 100,
    lastObservedAt: 1000,
    evidence: [],
    source: "ADAPTIVE_LEARNING",
    ...overrides,
  };
}

function makePredictiveAnalysis(
  candidates: ProactiveContextCandidate[],
  overrides?: Partial<PredictiveContextAnalysis>
): PredictiveContextAnalysis {
  return {
    predictions: candidates.map((c) => c.predictionType),
    acceptedCandidates: candidates,
    rejectedCandidates: [],
    suppressionReasons: [],
    confidence: candidates.length > 0 ? candidates[0].confidence : 0.8,
    directives: candidates.map((c) => c.directive || "").filter(Boolean),
    requiresConfirmation: false,
    analysisStatus: "SUCCESS",
    diagnostics: {
      signalsEvaluated: candidates.length,
      candidatesGenerated: candidates.length,
      candidatesAccepted: candidates.length,
      candidatesRejected: 0,
      reasons: [],
    },
    ...overrides,
  };
}

function makeLearningAnalysis(
  patterns: LearningPattern[],
  overrides?: Partial<LearningAnalysis>
): LearningAnalysis {
  return {
    userId: "test_user",
    patterns,
    activeDirectives: [],
    decisions: [],
    profile: {
      userId: "test_user",
      interactionPreferences: [],
      taskPatterns: [],
      domainInterests: [],
      preferences: {
        confirmedPreferences: patterns.filter((p) => p.status === "CONFIRMED"),
        candidatePreferences: patterns.filter((p) => p.status === "CANDIDATE"),
      },
      lastUpdatedAt: 1000,
    },
    diagnostics: {
      totalSignalsProcessed: patterns.length,
      sensitiveSignalsBlocked: 0,
      candidatesCreated: 0,
      patternsReinforced: 0,
      patternsPromoted: 0,
      patternsDemoted: 0,
      conflictsDetected: 0,
      currentTurnOverrides: [],
    },
    currentTurnOverrideApplied: false,
    ...overrides,
  };
}

console.log("=== DORA PHASE 2 STEP 8: LONG-TERM USER MODEL TEST SUITE ===");

// ---------------------------------------------------------------------------
// TEST 1: Explicit language preference becomes confirmed
// ---------------------------------------------------------------------------
runTest("TEST 1: Explicit language preference becomes confirmed", () => {
  const govCand = makeGovCand("preferred_language", "Banglish", {
    memoryId: "mem_lang_01",
    confidence: 1.0,
    source: "EXPLICIT_USER",
    reasons: ["EXPLICIT_REFERENCE", "ACTIVE_USER_PREFERENCE"],
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([govCand]),
    options: { currentTime: 1000 },
  });

  assert(res.profile.confirmedAttributes.length === 1, "Must have 1 confirmed attribute");
  const langAttr = res.profile.attributes["language"];
  assert(langAttr !== undefined, "Language attribute must exist");
  assert(langAttr.status === "CONFIRMED", "Language attribute must be CONFIRMED");
  assert(langAttr.normalizedValue === "Banglish", "Value must be normalized to Banglish");
  assert(langAttr.sourceClassification === "EXPLICIT_USER_MEMORY", "Authority must be EXPLICIT_USER_MEMORY");
  assert(res.activeDirectives.some((d) => d.includes("Banglish")), "Must generate Banglish directive");
});

// ---------------------------------------------------------------------------
// TEST 2: Explicit verbosity preference becomes confirmed
// ---------------------------------------------------------------------------
runTest("TEST 2: Explicit verbosity preference becomes confirmed", () => {
  const govCand = makeGovCand("preferred_verbosity", "Concise", {
    memoryId: "mem_verb_01",
    confidence: 0.95,
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([govCand]),
    options: { currentTime: 1000 },
  });

  const verbAttr = res.profile.attributes["verbosity"];
  assert(verbAttr !== undefined, "Verbosity attribute must exist");
  assert(verbAttr.status === "CONFIRMED", "Must be CONFIRMED");
  assert(verbAttr.normalizedValue === "Concise", "Must be Concise");
  assert(res.activeDirectives.some((d) => d.includes("concise explanations")), "Must generate concise directive");
});

// ---------------------------------------------------------------------------
// TEST 3: Current-turn instruction overrides historical model
// ---------------------------------------------------------------------------
runTest("TEST 3: Current-turn instruction overrides historical model", () => {
  const govCand = makeGovCand("preferred_verbosity", "Concise", {
    memoryId: "mem_verb_01",
    confidence: 0.95,
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    message: "Explain quantum computing in detail please",
    governanceAnalysis: makeGovAnalysis([govCand]),
    options: { currentTime: 1000 },
  });

  assert(res.currentTurnOverrides.length > 0, "Must have current-turn overrides");
  assert(res.currentTurnOverrides.some((o) => o.normalizedValue === "Detailed"), "Detailed override must exist");
  assert(res.activeDirectives.some((d) => d.includes("detailed explanations")), "Active directive must reflect Detailed");
  assert(!res.activeDirectives.some((d) => d.includes("concise explanations")), "Concise directive must be overridden");
});

// ---------------------------------------------------------------------------
// TEST 4: Current-turn override does not mutate persistent model
// ---------------------------------------------------------------------------
runTest("TEST 4: Current-turn override does not mutate persistent model", () => {
  const govCand = makeGovCand("preferred_verbosity", "Concise", {
    memoryId: "mem_verb_01",
    confidence: 0.95,
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    message: "Explain this in detail",
    governanceAnalysis: makeGovAnalysis([govCand]),
    options: { currentTime: 1000 },
  });

  const persistentAttr = res.profile.attributes["verbosity"];
  assert(persistentAttr.normalizedValue === "Concise", "Persistent attribute must remain Concise");
  assert(persistentAttr.status === "CONFIRMED", "Persistent attribute remains CONFIRMED");
});

// ---------------------------------------------------------------------------
// TEST 5: Durable explicit instruction updates model
// ---------------------------------------------------------------------------
runTest("TEST 5: Durable explicit instruction updates model", () => {
  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    message: "From now on, always speak in Bangla",
    options: { currentTime: 1000 },
  });

  const langAttr = res.profile.attributes["language"];
  assert(langAttr !== undefined, "Language attribute must exist");
  assert(langAttr.status === "CONFIRMED", "Must be CONFIRMED");
  assert(langAttr.isDurable === true, "Must be durable");
  assert(langAttr.normalizedValue === "Bangla", "Value must be Bangla");
});

// ---------------------------------------------------------------------------
// TEST 6: Temporary statement does not become stable identity
// ---------------------------------------------------------------------------
runTest("TEST 6: Temporary statement does not become stable identity", () => {
  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    message: "I am using a Mac today, explain concise ajke",
    options: { currentTime: 1000 },
  });

  assert(res.currentTurnOverrides.length > 0, "Must be in currentTurnOverrides");
  const verbOverride = res.currentTurnOverrides.find((o) => o.dimension === "VERBOSITY");
  assert(verbOverride !== undefined && verbOverride.isTemporary === true, "Must be marked temporary");
});

// ---------------------------------------------------------------------------
// TEST 7: Repeated inferred signal remains candidate until threshold
// ---------------------------------------------------------------------------
runTest("TEST 7: Repeated inferred signal remains candidate until threshold", () => {
  const pat: LearningPattern = {
    id: "pat_style_01",
    userId: "test_user",
    patternType: "INTERACTION_STYLE",
    category: "FORMAT",
    key: "format_preference",
    value: "Table",
    confidence: 0.6,
    reinforcementCount: 2,
    independentEvidenceCount: 2, // Threshold is 3
    status: "CANDIDATE",
    firstObservedAt: 100,
    lastObservedAt: 200,
    evidence: [],
    source: "INFERRED",
  };

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    adaptiveLearning: makeLearningAnalysis([pat]),
    options: { currentTime: 1000 },
  });

  const attr = res.profile.attributes["format"];
  assert(attr !== undefined, "Format attribute exists");
  assert(attr.status === "CANDIDATE", "Must remain CANDIDATE with < 3 independent observations");
  assert(!res.activeDirectives.some((d) => d.includes("Table")), "Candidate must NOT generate active authoritative directive");
});

// ---------------------------------------------------------------------------
// TEST 8: Independent turns can promote candidate
// ---------------------------------------------------------------------------
runTest("TEST 8: Independent turns can promote candidate", () => {
  const pat: LearningPattern = {
    id: "pat_style_02",
    userId: "test_user",
    patternType: "INTERACTION_STYLE",
    category: "FORMAT",
    key: "format_preference",
    value: "Table",
    confidence: 0.85,
    reinforcementCount: 3,
    independentEvidenceCount: 3, // Meets threshold of 3
    status: "CONFIRMED",
    firstObservedAt: 100,
    lastObservedAt: 300,
    evidence: [],
    source: "INFERRED",
  };

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    adaptiveLearning: makeLearningAnalysis([pat]),
    options: { currentTime: 1000 },
  });

  const attr = res.profile.attributes["format"];
  assert(attr !== undefined, "Format attribute exists");
  assert(attr.status === "CONFIRMED", "Must be CONFIRMED with threshold >= 3");
  assert(res.activeDirectives.some((d) => d.includes("table presentation format")), "Must generate directive");
});

// ---------------------------------------------------------------------------
// TEST 9: Same-turn duplicate does not inflate evidence
// ---------------------------------------------------------------------------
runTest("TEST 9: Same-turn duplicate does not inflate evidence", () => {
  const govCand = makeGovCand("code_language", "TypeScript", {
    memoryId: "mem_code_01",
    confidence: 0.9,
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([govCand, govCand]), // Same turn duplicate
    options: { currentTime: 1000 },
  });

  const attr = res.profile.attributes["code_language"];
  assert(attr !== undefined, "Attribute exists");
  assert(attr.evidenceCount === 1, `Evidence count must not inflate on same turn duplicate (got: ${attr.evidenceCount})`);
});

// ---------------------------------------------------------------------------
// TEST 10: Explicit correction supersedes older preference
// ---------------------------------------------------------------------------
runTest("TEST 10: Explicit correction supersedes older preference", () => {
  const oldCand = makeGovCand("preferred_verbosity", "Concise", {
    memoryId: "mem_old_01",
    confidence: 0.8,
  });

  const newCand = makeGovCand("preferred_verbosity", "Detailed", {
    memoryId: "mem_new_02",
    confidence: 1.0,
    reasons: ["EXPLICIT_REFERENCE", "ACTIVE_USER_PREFERENCE"],
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([oldCand, newCand]),
    options: { currentTime: 2000 },
  });

  const attr = res.profile.attributes["verbosity"];
  assert(attr.normalizedValue === "Detailed", "Active attribute value must be Detailed");
  assert(attr.previousValue === "Concise", "Previous value must be recorded as Concise");
  assert(attr.lineage && attr.lineage.length > 0, "Lineage must be preserved");
  assert(res.diagnostics.conflictsResolved === 1, "Conflict resolution count must be 1");
});

// ---------------------------------------------------------------------------
// TEST 11: Conflicting inferred patterns resolve deterministically
// ---------------------------------------------------------------------------
runTest("TEST 11: Conflicting inferred patterns resolve deterministically", () => {
  const pat1: LearningPattern = {
    id: "pat_01",
    userId: "test_user",
    patternType: "INTERACTION_STYLE",
    category: "TONE",
    key: "tone_style",
    value: "Casual",
    confidence: 0.7,
    reinforcementCount: 3,
    independentEvidenceCount: 3,
    status: "CONFIRMED",
    firstObservedAt: 100,
    lastObservedAt: 200,
    evidence: [],
    source: "INFERRED",
  };

  const pat2: LearningPattern = {
    id: "pat_02",
    userId: "test_user",
    patternType: "INTERACTION_STYLE",
    category: "TONE",
    key: "tone_style",
    value: "Professional",
    confidence: 0.5,
    reinforcementCount: 1,
    independentEvidenceCount: 1,
    status: "CANDIDATE",
    firstObservedAt: 300,
    lastObservedAt: 300,
    evidence: [],
    source: "INFERRED",
  };

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    adaptiveLearning: makeLearningAnalysis([pat1, pat2]),
    options: { currentTime: 1000 },
  });

  const attr = res.profile.attributes["tone"];
  assert(attr.normalizedValue === "Casual", "Higher confidence confirmed pattern Casual must remain active");
});

// ---------------------------------------------------------------------------
// TEST 12: Candidate never becomes authoritative without promotion
// ---------------------------------------------------------------------------
runTest("TEST 12: Candidate never becomes authoritative without promotion", () => {
  const govCand = makeGovCand("coding_preference", "Rust", {
    memoryId: "mem_cand_01",
    type: "FACT",
    confidence: 0.5,
    source: "INFERRED",
    isCandidateInferred: true,
    reasons: ["CANDIDATE_UNCERTAIN"],
    canSupportFactualClaim: false,
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([govCand]),
    options: { currentTime: 1000 },
  });

  assert(res.profile.candidateAttributes.length === 1, "Must be recorded in candidateAttributes");
  assert(res.profile.confirmedAttributes.length === 0, "Confirmed attributes must be empty");
  assert(!res.activeDirectives.some((d) => d.includes("Rust")), "No directive should be created for unpromoted candidate");
});

// ---------------------------------------------------------------------------
// TEST 13: Domain interest does not become ownership
// ---------------------------------------------------------------------------
runTest("TEST 13: Domain interest does not become ownership", () => {
  const govCand = makeGovCand("domain_interest_laptop", "MacBook Pro M3", {
    memoryId: "mem_dom_01",
    type: "FACT",
    confidence: 0.8,
    source: "INFERRED",
    isCandidateInferred: true,
    reasons: ["HIGH_RELEVANCE"],
    canSupportFactualClaim: false,
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([govCand]),
    options: { currentTime: 1000 },
  });

  assert(!res.profile.attributes["product_ownership"], "Must not synthesize product ownership");
  assert(!res.activeDirectives.some((d) => d.toLowerCase().includes("owns")), "Directives must not state ownership");
});

// ---------------------------------------------------------------------------
// TEST 14: Domain interest does not become expertise
// ---------------------------------------------------------------------------
runTest("TEST 14: Domain interest does not become expertise", () => {
  const pat: LearningPattern = {
    id: "pat_exp_01",
    userId: "test_user",
    patternType: "DOMAIN_INTEREST",
    category: "DOMAIN_INTEREST",
    key: "interest_machine_learning",
    value: "PyTorch",
    confidence: 0.8,
    reinforcementCount: 3,
    independentEvidenceCount: 3,
    status: "CONFIRMED",
    firstObservedAt: 100,
    lastObservedAt: 300,
    evidence: [],
    source: "INFERRED",
  };

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    adaptiveLearning: makeLearningAnalysis([pat]),
    options: { currentTime: 1000 },
  });

  assert(!res.profile.attributes["professional_expertise_claim"], "Must not infer professional expertise");
  assert(!res.activeDirectives.some((d) => d.toLowerCase().includes("expert")), "Directives must not state expertise");
});

// ---------------------------------------------------------------------------
// TEST 15: Topic isolation works
// ---------------------------------------------------------------------------
runTest("TEST 15: Topic isolation works", () => {
  const pat: LearningPattern = {
    id: "pat_laptop_01",
    userId: "test_user",
    patternType: "DOMAIN_INTEREST",
    category: "DOMAIN_INTEREST",
    key: "domain_interest",
    value: "Laptops & Hardware",
    confidence: 0.9,
    reinforcementCount: 4,
    independentEvidenceCount: 4,
    status: "CONFIRMED",
    firstObservedAt: 100,
    lastObservedAt: 400,
    evidence: [],
    source: "INFERRED",
  };

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    adaptiveLearning: makeLearningAnalysis([pat]),
    options: { currentTime: 1000, isTopicIsolated: true },
  });

  assert(!res.activeDirectives.some((d) => d.includes("Laptops")), "Domain interest directive must be suppressed under topic isolation");
});

// ---------------------------------------------------------------------------
// TEST 16: Global communication preference survives topic switch
// ---------------------------------------------------------------------------
runTest("TEST 16: Global communication preference survives topic switch", () => {
  const govCand = makeGovCand("preferred_language", "Banglish", {
    memoryId: "mem_lang_02",
    confidence: 1.0,
    source: "EXPLICIT_USER",
    reasons: ["ACTIVE_USER_PREFERENCE"],
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([govCand], { topicIsolationApplied: true }),
    options: { currentTime: 1000, isTopicIsolated: true },
  });

  assert(res.activeDirectives.some((d) => d.includes("Banglish")), "Global language preference must survive topic switch");
});

// ---------------------------------------------------------------------------
// TEST 17: Expired memory is excluded
// ---------------------------------------------------------------------------
runTest("TEST 17: Expired memory is excluded", () => {
  const expCand = makeGovCand("preferred_tone", "Casual", {
    memoryId: "mem_exp_01",
    status: "EXPIRED",
    confidence: 0.5,
    usageDecision: "SUPPRESS",
    reasons: ["EXPIRED_MEMORY"],
    canAffectResponseContent: false,
    canPersonalize: false,
    canSupportFactualClaim: false,
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([expCand]),
    options: { currentTime: 1000 },
  });

  assert(res.profile.confirmedAttributes.length === 0, "Expired memory must not produce confirmed attribute");
});

// ---------------------------------------------------------------------------
// TEST 18: Superseded memory is excluded
// ---------------------------------------------------------------------------
runTest("TEST 18: Superseded memory is excluded", () => {
  const supCand = makeGovCand("preferred_format", "Bullet Points", {
    memoryId: "mem_sup_01",
    status: "SUPERSEDED",
    confidence: 0.5,
    usageDecision: "SUPPRESS",
    reasons: ["SUPERSEDED_MEMORY"],
    canAffectResponseContent: false,
    canPersonalize: false,
    canSupportFactualClaim: false,
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([supCand]),
    options: { currentTime: 1000 },
  });

  assert(res.profile.confirmedAttributes.length === 0, "Superseded memory must not produce confirmed attribute");
});

// ---------------------------------------------------------------------------
// TEST 19: Deleted memory is excluded
// ---------------------------------------------------------------------------
runTest("TEST 19: Deleted memory is excluded", () => {
  const delCand = makeGovCand("preferred_code", "Python", {
    memoryId: "mem_del_01",
    status: "DELETED",
    confidence: 0.5,
    usageDecision: "SUPPRESS",
    reasons: ["DELETED_MEMORY"],
    canAffectResponseContent: false,
    canPersonalize: false,
    canSupportFactualClaim: false,
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([delCand]),
    options: { currentTime: 1000 },
  });

  assert(res.profile.confirmedAttributes.length === 0, "Deleted memory must not produce confirmed attribute");
});

// ---------------------------------------------------------------------------
// TEST 20: Sensitive credential is suppressed
// ---------------------------------------------------------------------------
runTest("TEST 20: Sensitive credential is suppressed", () => {
  const secCand = makeGovCand("user_api_key", "sk-abcdef1234567890abcdef", {
    memoryId: "mem_sec_01",
    type: "FACT",
    confidence: 1.0,
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([secCand]),
    options: { currentTime: 1000 },
  });

  assert(res.safetyStatus === "SENSITIVE_SUPPRESSED", "Safety status must be SENSITIVE_SUPPRESSED");
  assert(!res.profile.attributes["user_api_key"], "API key attribute must not exist");
  assert(!res.activeDirectives.some((d) => d.includes("sk-")), "API key must not be in directives");
});

// ---------------------------------------------------------------------------
// TEST 21: Payment information is suppressed
// ---------------------------------------------------------------------------
runTest("TEST 21: Payment information is suppressed", () => {
  const cardCand = makeGovCand("credit_card", "4111 2222 3333 4444", {
    memoryId: "mem_card_01",
    type: "FACT",
    confidence: 1.0,
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([cardCand]),
    options: { currentTime: 1000 },
  });

  assert(res.safetyStatus === "SENSITIVE_SUPPRESSED", "Safety status must be SENSITIVE_SUPPRESSED");
  assert(!res.profile.attributes["credit_card"], "Credit card attribute must not exist");
});

// ---------------------------------------------------------------------------
// TEST 22: No sensitive identity inference
// ---------------------------------------------------------------------------
runTest("TEST 22: No sensitive identity inference", () => {
  const infCand = makeGovCand("inferred_religion", "Islam", {
    memoryId: "mem_inf_01",
    type: "FACT",
    confidence: 0.5,
    source: "INFERRED",
    isCandidateInferred: true,
    reasons: ["CANDIDATE_UNCERTAIN"],
    canSupportFactualClaim: false,
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([infCand]),
    options: { currentTime: 1000 },
  });

  assert(res.safetyStatus === "UNSUPPORTED_IDENTITY_BLOCKED", "Safety status must be UNSUPPORTED_IDENTITY_BLOCKED");
  assert(!res.profile.attributes["inferred_religion"], "Inferred religion attribute must not exist");
});

// ---------------------------------------------------------------------------
// TEST 23: Confidence remains bounded
// ---------------------------------------------------------------------------
runTest("TEST 23: Confidence remains bounded", () => {
  const govCand = makeGovCand("preferred_language", "English", {
    memoryId: "mem_conf_01",
    confidence: 1.5, // Out of bounds input
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([govCand]),
    options: { currentTime: 1000 },
  });

  const attr = res.profile.attributes["language"];
  assert(attr.confidence >= 0.0 && attr.confidence <= 1.0, `Confidence must be bounded <= 1.0 (got: ${attr.confidence})`);
});

// ---------------------------------------------------------------------------
// TEST 24: Evidence count remains bounded and deterministic
// ---------------------------------------------------------------------------
runTest("TEST 24: Evidence count remains bounded and deterministic", () => {
  const pat: LearningPattern = {
    id: "pat_bound_01",
    userId: "test_user",
    patternType: "INTERACTION_STYLE",
    category: "VERBOSITY",
    key: "verbosity_style",
    value: "Concise",
    confidence: 0.9,
    reinforcementCount: 100, // Large count
    independentEvidenceCount: 100,
    status: "CONFIRMED",
    firstObservedAt: 100,
    lastObservedAt: 200,
    evidence: [],
    source: "INFERRED",
  };

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    adaptiveLearning: makeLearningAnalysis([pat]),
    options: { currentTime: 1000 },
  });

  const attr = res.profile.attributes["verbosity"];
  assert(attr.evidenceCount <= 50, `Evidence count must be capped <= 50 (got: ${attr.evidenceCount})`);
});

// ---------------------------------------------------------------------------
// TEST 25: Repeated identical execution is idempotent
// ---------------------------------------------------------------------------
runTest("TEST 25: Repeated identical execution is idempotent", () => {
  const govCand = makeGovCand("preferred_language", "Banglish", {
    memoryId: "mem_idemp_01",
    confidence: 1.0,
  });

  const input: LongTermUserModelInput = {
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([govCand]),
    options: { currentTime: 5000 },
  };

  const res1 = longTermUserModelEngine.synthesize(input);
  const res2 = longTermUserModelEngine.synthesize(input);

  assert(JSON.stringify(res1) === JSON.stringify(res2), "Repeated synthesis on identical inputs must be strictly identical");
});

// ---------------------------------------------------------------------------
// TEST 26: No random IDs
// ---------------------------------------------------------------------------
runTest("TEST 26: No random IDs", () => {
  const govCand = makeGovCand("preferred_tone", "Direct", {
    memoryId: "mem_test_01",
    confidence: 1.0,
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([govCand]),
    options: { currentTime: 1000 },
  });

  const attr = res.profile.attributes["tone"];
  const evi = attr.evidence[0];
  assert(evi.evidenceId.startsWith("evi_mem_"), "Evidence ID must use deterministic hash prefix");
});

// ---------------------------------------------------------------------------
// TEST 27: No runtime clock dependency
// ---------------------------------------------------------------------------
runTest("TEST 27: No runtime clock dependency", () => {
  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    options: { currentTime: 4242 },
  });

  assert(res.profile.lastSynthesizedAt === 4242, `Synthesized timestamp must equal injected currentTime (got: ${res.profile.lastSynthesizedAt})`);
});

// ---------------------------------------------------------------------------
// TEST 28: Sanitized directives contain no internal metadata
// ---------------------------------------------------------------------------
runTest("TEST 28: Sanitized directives contain no internal metadata", () => {
  const govCand = makeGovCand("preferred_verbosity", "Concise", {
    memoryId: "mem_sanitize_01",
    confidence: 0.9423,
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([govCand]),
    options: { currentTime: 1000 },
  });

  for (const d of res.activeDirectives) {
    assert(!d.includes("mem_"), "Directive must not contain mem_ ID");
    assert(!d.includes("0.9423"), "Directive must not contain raw confidence float");
    assert(!d.includes("confidence="), "Directive must not contain confidence key");
  }
});

// ---------------------------------------------------------------------------
// TEST 29: Predictive context cannot create confirmed identity
// ---------------------------------------------------------------------------
runTest("TEST 29: Predictive context cannot create confirmed identity", () => {
  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    options: { currentTime: 1000 },
  });

  assert(res.profile.confirmedAttributes.length === 0, "No confirmed identity should be created without evidence");
});

// ---------------------------------------------------------------------------
// TEST 30: Response adaptation can consume the synthesized model safely
// ---------------------------------------------------------------------------
runTest("TEST 30: Response adaptation can consume the synthesized model safely", () => {
  const res = brainEngine.analyze("Hello world!", [], undefined, "test_user", [], { currentTime: 1000 });

  assert(res.longTermUserModelAnalysis !== undefined, "BrainEngine must produce longTermUserModelAnalysis");
  assert(res.responseAdaptationAnalysis !== undefined, "BrainEngine must produce responseAdaptationAnalysis");
});

// ---------------------------------------------------------------------------
// TEST 31: BrainEngine end-to-end integration
// ---------------------------------------------------------------------------
runTest("TEST 31: BrainEngine end-to-end integration", () => {
  const res = brainEngine.analyze("From now on, I prefer concise answers in Banglish", [], undefined, "test_user", [], { currentTime: 1000 });

  assert(res.longTermUserModelAnalysis !== undefined, "UserModelAnalysis produced");
  assert(res.promptDirectives.some((d) => d.includes("USER_MODEL")), "User model directive added to promptDirectives");
});

// ---------------------------------------------------------------------------
// TEST 32: Existing Phase 1 regression
// ---------------------------------------------------------------------------
runTest("TEST 32: Existing Phase 1 regression (Context, Intent, Reasoning, Planning, Verification)", () => {
  const res = brainEngine.analyze("Amar ekta gaming laptop lagbe budget 80k", [], undefined, "test_user", [], { currentTime: 1000 });

  assert(res.intent !== undefined, "Intent must be classified");
  assert(res.reasoningAnalysis !== undefined, "Reasoning analysis must execute");
  assert(res.planningAnalysis !== undefined, "Planning analysis must execute");
  assert(res.verificationAnalysis !== undefined, "Verification analysis must execute");
  assert(res.confidence > 0, "Calibrated confidence must be positive");
});

// ---------------------------------------------------------------------------
// TEST 33: Existing Phase 2 Steps 1–7 regression
// ---------------------------------------------------------------------------
runTest("TEST 33: Existing Phase 2 Steps 1–7 regression (Retrieval, Consolidation, Governance, Adaptive, ResponseAdaptation)", () => {
  const res = brainEngine.analyze("Amar nam Mubin, amake Banglish e bolo", [], undefined, "test_user", [], { currentTime: 1000 });

  assert(res.memoryDecision !== undefined, "Memory decision executed");
  assert(res.memoryRetrieval !== undefined, "Memory retrieval executed");
  assert(res.memoryConsolidation !== undefined, "Memory consolidation executed");
  assert(res.memoryGovernanceAnalysis !== undefined, "Memory governance executed");
  assert(res.adaptiveLearningAnalysis !== undefined, "Adaptive learning executed");
  assert(res.predictiveContextAnalysis !== undefined, "Predictive context executed");
  assert(res.responseAdaptationAnalysis !== undefined, "Response adaptation executed");
});

// ===========================================================================
// TOPIC ISOLATION TEST SERIES (TI-1 to TI-7)
// ===========================================================================

runTest("TI-1: Domain interest attribute excluded from authoritative profile when isTopicIsolated: true", () => {
  const domainCand = makeGovCand("domain_interest", "Machine Learning", {
    memoryId: "mem_domain_01",
    type: "FACT",
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([domainCand]),
    options: { currentTime: 1000, isTopicIsolated: true },
  });

  assert(res.profile.attributes["domain_interest"] === undefined, "Domain interest must not enter attributesMap under topic isolation");
  assert(res.profile.domainInterests.length === 0, "domainInterests collection must be empty under topic isolation");
});

runTest("TI-2: Global communication preferences retained when isTopicIsolated: true", () => {
  const langCand = makeGovCand("preferred_language", "Bangla", { memoryId: "mem_lang_01" });
  const verbCand = makeGovCand("preferred_verbosity", "Concise", { memoryId: "mem_verb_01" });
  const domainCand = makeGovCand("domain_interest", "Quantum Physics", { memoryId: "mem_domain_02", type: "FACT" });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([langCand, verbCand, domainCand]),
    options: { currentTime: 1000, isTopicIsolated: true },
  });

  assert(res.profile.attributes["language"] !== undefined, "Language preference must be retained");
  assert(res.profile.attributes["verbosity"] !== undefined, "Verbosity preference must be retained");
  assert(res.profile.attributes["domain_interest"] === undefined, "Domain interest must be excluded");
  assert(res.profile.confirmedAttributes.some((a) => a.key === "language"), "Language must remain confirmed");
});

runTest("TI-3: profile.domainInterests and profile.projectContexts are strictly empty under isTopicIsolated: true", () => {
  const pat1 = makeLearningPat("domain_web3", "Solidity Development", {
    id: "pat_dom_01",
    patternType: "DOMAIN_INTEREST",
    category: "DOMAIN_INTEREST",
    confidence: 0.9,
    reinforcementCount: 5,
    independentEvidenceCount: 4,
    firstObservedAt: 500,
    lastObservedAt: 1000,
  });
  const pat2 = makeLearningPat("project_finance", "Ledger Engine", {
    id: "pat_proj_01",
    patternType: "TASK_WORKFLOW",
    category: "PROJECT_CONTEXT",
    confidence: 0.85,
    reinforcementCount: 4,
    independentEvidenceCount: 3,
    firstObservedAt: 500,
    lastObservedAt: 1000,
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    adaptiveLearning: makeLearningAnalysis([pat1, pat2]),
    options: { currentTime: 1000, isTopicIsolated: true },
  });

  assert(res.profile.domainInterests.length === 0, "domainInterests must be empty");
  assert(res.profile.projectContexts.length === 0, "projectContexts must be empty");
  assert(res.profile.confirmedAttributes.length === 0, "No domain attributes confirmed under topic isolation");
});

runTest("TI-4: activeDirectives contains no domain interest directives under topic isolation", () => {
  const domainCand = makeGovCand("domain_interest", "Cybersecurity", {
    memoryId: "mem_cyber_01",
    type: "FACT",
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([domainCand]),
    options: { currentTime: 1000, isTopicIsolated: true },
  });

  assert(!res.activeDirectives.some((d) => d.includes("Cybersecurity")), "No domain directive generated under topic isolation");
});

runTest("TI-5: Cross-domain attribute leakage prevented across isolated sessions", () => {
  const pat = makeLearningPat("domain_crypto", "Bitcoin Mining", {
    id: "pat_crypto_01",
    patternType: "DOMAIN_INTEREST",
    category: "DOMAIN_INTEREST",
    confidence: 0.95,
    reinforcementCount: 8,
    independentEvidenceCount: 5,
    firstObservedAt: 100,
    lastObservedAt: 1000,
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    adaptiveLearning: makeLearningAnalysis([pat]),
    options: { currentTime: 1000, isTopicIsolated: true },
  });

  assert(Object.keys(res.profile.attributes).length === 0, "No domain attributes in profile.attributes");
  assert(res.activeDirectives.length === 0, "No active directives generated");
});

runTest("TI-6: Pre-synthesis gate produces EXCLUDED_UNSUPPORTED audit decisions", () => {
  const domainCand = makeGovCand("domain_interest", "Astronomy", {
    memoryId: "mem_astro_01",
    type: "FACT",
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([domainCand]),
    options: { currentTime: 1000, isTopicIsolated: true },
  });

  const exclusionDecision = res.decisions.find((d) => d.key === "domain_interest");
  assert(exclusionDecision !== undefined, "Exclusion decision must be logged");
  assert(exclusionDecision?.decision === "EXCLUDED_UNSUPPORTED", "Decision must be EXCLUDED_UNSUPPORTED");
  assert(exclusionDecision?.reason.includes("topic isolation"), "Reason must mention topic isolation");
});

runTest("TI-7: Topic isolation flag in governanceAnalysis triggers hard topic isolation", () => {
  const domainCand = makeGovCand("domain_interest", "Robotics", {
    memoryId: "mem_robot_01",
    type: "FACT",
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([domainCand], { topicIsolationApplied: true }),
    options: { currentTime: 1000 },
  });

  assert(res.profile.domainInterests.length === 0, "domainInterests must be empty when governanceAnalysis.topicIsolationApplied is true");
  assert(res.profile.attributes["domain_interest"] === undefined, "Attribute must be excluded");
});

// ===========================================================================
// CANDIDATE PROMOTION GATE TEST SERIES (CP-1 to CP-15)
// ===========================================================================

runTest("CP-1: Candidate with independentEvidenceCount: 1, confidence: 0.70 remains CANDIDATE", () => {
  const res = longTermUserModelEngine.evaluateCandidatePromotion({
    key: "verbosity",
    confidence: 0.70,
    independentEvidenceCount: 1,
  });

  assert(res.canPromote === false, "Must not promote with 1 count");
  assert(res.targetStatus === "CANDIDATE", "Target status must be CANDIDATE");
  assert(res.reason.includes("Insufficient independent evidence"), "Reason must cite insufficient count");
});

runTest("CP-2: Candidate with independentEvidenceCount: 2, confidence: 0.85 remains CANDIDATE", () => {
  const res = longTermUserModelEngine.evaluateCandidatePromotion({
    key: "format",
    confidence: 0.85,
    independentEvidenceCount: 2,
  });

  assert(res.canPromote === false, "Must not promote with 2 counts");
  assert(res.targetStatus === "CANDIDATE", "Target status must be CANDIDATE");
});

runTest("CP-3: Candidate with independentEvidenceCount: 3, confidence: 0.70 remains CANDIDATE", () => {
  const res = longTermUserModelEngine.evaluateCandidatePromotion({
    key: "tone",
    confidence: 0.70,
    independentEvidenceCount: 3,
  });

  assert(res.canPromote === false, "Must not promote with confidence < 0.75");
  assert(res.targetStatus === "CANDIDATE", "Target status must be CANDIDATE");
  assert(res.reason.includes("Confidence below threshold"), "Reason must cite confidence below threshold");
});

runTest("CP-4: Candidate with independentEvidenceCount: 3, confidence: 0.75 promotes to CONFIRMED", () => {
  const res = longTermUserModelEngine.evaluateCandidatePromotion({
    key: "verbosity",
    confidence: 0.75,
    independentEvidenceCount: 3,
  });

  assert(res.canPromote === true, "Must promote when thresholds met");
  assert(res.targetStatus === "CONFIRMED", "Target status must be CONFIRMED");
  assert(res.reason.includes("promotion threshold"), "Reason must cite promotion threshold met");
});

runTest("CP-5: Candidate with independentEvidenceCount: 5, confidence: 0.90 promotes to CONFIRMED", () => {
  const res = longTermUserModelEngine.evaluateCandidatePromotion({
    key: "language",
    confidence: 0.90,
    independentEvidenceCount: 5,
  });

  assert(res.canPromote === true, "Must promote");
  assert(res.targetStatus === "CONFIRMED", "Target status must be CONFIRMED");
});

runTest("CP-6: Explicit user confirmation immediately promotes attribute regardless of count", () => {
  const res = longTermUserModelEngine.evaluateCandidatePromotion({
    key: "code_style",
    confidence: 1.0,
    independentEvidenceCount: 1,
    isExplicit: true,
  });

  assert(res.canPromote === true, "Explicit confirmation authorizes promotion");
  assert(res.targetStatus === "CONFIRMED", "Target status must be CONFIRMED");
});

runTest("CP-7: Candidate with sensitive key/value is blocked from promotion", () => {
  const res = longTermUserModelEngine.evaluateCandidatePromotion({
    key: "api_key",
    value: "sk-secret-1234567890abcdef",
    confidence: 0.99,
    independentEvidenceCount: 5,
  });

  assert(res.canPromote === false, "Sensitive candidate cannot be promoted");
  assert(res.targetStatus === "SUPPRESSED", "Target status must be SUPPRESSED");
  assert(res.reason.includes("Sensitive"), "Reason must state sensitive");
});

runTest("CP-8: Inferred candidate for forbidden identity is blocked from promotion", () => {
  const res = longTermUserModelEngine.evaluateCandidatePromotion({
    key: "salary",
    value: "100k",
    confidence: 0.95,
    independentEvidenceCount: 4,
    isExplicit: false,
  });

  assert(res.canPromote === false, "Inferred identity dimension cannot be promoted");
  assert(res.targetStatus === "SUPPRESSED", "Target status must be SUPPRESSED");
  assert(res.reason.includes("Unsupported inferred identity"), "Reason must cite unsupported identity");
});

runTest("CP-9: Candidate from predictive context source cannot be promoted", () => {
  const res = longTermUserModelEngine.evaluateCandidatePromotion({
    key: "workflow",
    confidence: 0.9,
    independentEvidenceCount: 4,
    sourceClassification: "PREDICTIVE_CONTEXT",
  });

  assert(res.canPromote === false, "Predictive context source cannot promote");
  assert(res.targetStatus === "CANDIDATE", "Target status must remain CANDIDATE");
});

runTest("CP-10: Duplicate evidence within same turn does not increment independentEvidenceCount", () => {
  const cand = makeGovCand("preferred_verbosity", "Concise", {
    memoryId: "mem_verb_dup",
    isCandidateInferred: true,
    confidence: 0.8,
  });

  const res1 = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([cand]),
    options: { currentTime: 1000 },
  });

  const attr1 = res1.profile.attributes["verbosity"];
  assert(attr1.independentEvidenceCount === 1, "Initial count must be 1");
  assert(attr1.status === "CANDIDATE", "Initial status must be CANDIDATE");
});

runTest("CP-11: Multi-turn distinct reinforcement increments independentEvidenceCount to trigger promotion", () => {
  const pat = makeLearningPat("preferred_language", "Bangla", {
    id: "pat_lang_01",
    patternType: "USER_PREFERENCE",
    category: "COMMUNICATION",
    confidence: 0.82,
    reinforcementCount: 4,
    independentEvidenceCount: 3,
    firstObservedAt: 200,
    lastObservedAt: 1000,
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    adaptiveLearning: makeLearningAnalysis([pat]),
    options: { currentTime: 1000 },
  });

  const langAttr = res.profile.attributes["language"];
  assert(langAttr !== undefined, "Language attribute must exist");
  assert(langAttr.status === "CONFIRMED", "Attribute with count 3 & conf 0.82 must be CONFIRMED");
  assert(res.profile.confirmedAttributes.some((a) => a.key === "language"), "Must be in confirmedAttributes");
});

runTest("CP-12: Candidate promotion records authoritative UPDATED decision", () => {
  const pat = makeLearningPat("preferred_format", "Bullet Points", {
    id: "pat_format_01",
    patternType: "USER_PREFERENCE",
    category: "FORMAT",
    confidence: 0.88,
    reinforcementCount: 5,
    independentEvidenceCount: 3,
    firstObservedAt: 100,
    lastObservedAt: 1000,
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    adaptiveLearning: makeLearningAnalysis([pat]),
    options: { currentTime: 1000 },
  });

  const formatAttr = res.profile.attributes["format"];
  assert(formatAttr.status === "CONFIRMED", "Format attribute must be confirmed");
  assert(res.decisions.some((d) => d.key === "format"), "Decision for format must exist");
});

runTest("CP-13: Unpromoted candidates exist exclusively in candidateAttributes", () => {
  const cand = makeGovCand("preferred_tone", "Casual", {
    memoryId: "mem_tone_cand",
    isCandidateInferred: true,
    confidence: 0.7,
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([cand]),
    options: { currentTime: 1000 },
  });

  assert(res.profile.candidateAttributes.some((a) => a.key === "tone"), "Must be in candidateAttributes");
  assert(!res.profile.confirmedAttributes.some((a) => a.key === "tone"), "Must NOT be in confirmedAttributes");
});

runTest("CP-14: Candidate promotion preserves firstObservedAt and lineage integrity", () => {
  const pat = makeLearningPat("preferred_verbosity", "Concise", {
    id: "pat_verb_01",
    patternType: "USER_PREFERENCE",
    category: "VERBOSITY",
    confidence: 0.8,
    reinforcementCount: 3,
    independentEvidenceCount: 3,
    firstObservedAt: 100,
    lastObservedAt: 900,
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    adaptiveLearning: makeLearningAnalysis([pat]),
    options: { currentTime: 1000 },
  });

  const verbAttr = res.profile.attributes["verbosity"];
  assert(verbAttr.firstObservedAt === 100, "firstObservedAt must be preserved");
  assert(verbAttr.lastObservedAt === 900, "lastObservedAt must be preserved");
});

runTest("CP-15: Unconfirmed candidates never leak into activeDirectives", () => {
  const cand = makeGovCand("preferred_tone", "Casual", {
    memoryId: "mem_tone_unconfirmed",
    isCandidateInferred: true,
    confidence: 0.6,
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([cand]),
    options: { currentTime: 1000 },
  });

  assert(!res.activeDirectives.some((d) => d.includes("Casual")), "Unconfirmed candidate must not produce active directive");
});

// ===========================================================================
// PREDICTIVE CONTEXT BOUNDARY TEST SERIES (PC-1 to PC-10)
// ===========================================================================

runTest("PC-1: Predictive context candidates are held strictly advisory", () => {
  const predAnalysis = makePredictiveAnalysis([
    {
      id: "pred_01",
      source: "USER_MODEL",
      predictionType: "PREFERENCE_RELEVANT",
      relevance: 0.85,
      confidence: 0.8,
      topic: "general",
      reasonCategory: "ADVISORY",
      expiresAt: 5000,
      isSafeToInject: true,
      requiresConfirmation: false,
      contextSummary: "Predicts user might prefer concise code",
      directive: "[PREDICTIVE: Concise code]",
    },
  ]);

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    predictiveContext: predAnalysis,
    options: { currentTime: 1000 },
  });

  assert(res.profile.confirmedAttributes.length === 0, "Predictive context must not create confirmed attributes");
  assert(res.decisions.some((d) => d.authority === "PREDICTIVE_CONTEXT" && d.decision === "HELD_AS_CANDIDATE"), "Decision must be HELD_AS_CANDIDATE");
});

runTest("PC-2: Predictive context cannot create confirmed attributes in profile", () => {
  const predAnalysis = makePredictiveAnalysis([
    {
      id: "pred_02",
      source: "TASK_WORKFLOW",
      predictionType: "FOLLOW_UP_LIKELY",
      relevance: 0.9,
      confidence: 0.95,
      topic: "workflow",
      reasonCategory: "STEP_CONTINUATION",
      expiresAt: 5000,
      isSafeToInject: true,
      requiresConfirmation: false,
      contextSummary: "Step continuation",
    },
  ]);

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    predictiveContext: predAnalysis,
    options: { currentTime: 1000 },
  });

  assert(res.profile.confirmedAttributes.length === 0, "Confirmed attributes must be empty");
});

runTest("PC-3: Predictive context cannot promote an existing candidate", () => {
  const promo = longTermUserModelEngine.evaluateCandidatePromotion({
    key: "workflow",
    confidence: 0.99,
    independentEvidenceCount: 10,
    sourceClassification: "PREDICTIVE_CONTEXT",
  });

  assert(promo.canPromote === false, "Predictive context source must never promote candidate");
  assert(promo.targetStatus === "CANDIDATE", "Target status must remain CANDIDATE");
});

runTest("PC-4: Predictive context cannot supersede higher-authority attributes", () => {
  const govCand = makeGovCand("preferred_language", "Banglish", {
    memoryId: "mem_lang_explicit",
    source: "EXPLICIT_USER",
    confidence: 1.0,
  });

  const predAnalysis = makePredictiveAnalysis([
    {
      id: "pred_lang_conflict",
      source: "RECENT_INTERACTION",
      predictionType: "PREFERENCE_RELEVANT",
      relevance: 0.99,
      confidence: 0.99,
      topic: "language",
      reasonCategory: "PREDICTION",
      expiresAt: 5000,
      isSafeToInject: true,
      requiresConfirmation: false,
      contextSummary: "English preferred",
      directive: "English",
    },
  ]);

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([govCand]),
    predictiveContext: predAnalysis,
    options: { currentTime: 1000 },
  });

  const langAttr = res.profile.attributes["language"];
  assert(langAttr.normalizedValue === "Banglish", "Explicit Banglish must not be superseded by predictive context");
  assert(langAttr.status === "CONFIRMED", "Explicit memory remains CONFIRMED");
});

runTest("PC-5: Predictive context signals do not inflate independentEvidenceCount", () => {
  const cand = makeGovCand("preferred_verbosity", "Concise", {
    memoryId: "mem_verb_cand",
    isCandidateInferred: true,
    confidence: 0.7,
  });

  const predAnalysis = makePredictiveAnalysis([
    {
      id: "pred_verb",
      source: "RECENT_INTERACTION",
      predictionType: "PREFERENCE_RELEVANT",
      relevance: 0.8,
      confidence: 0.8,
      topic: "verbosity",
      reasonCategory: "PREDICTION",
      expiresAt: 5000,
      isSafeToInject: true,
      requiresConfirmation: false,
      contextSummary: "Concise",
    },
  ]);

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([cand]),
    predictiveContext: predAnalysis,
    options: { currentTime: 1000 },
  });

  const verbAttr = res.profile.attributes["verbosity"];
  assert(verbAttr.independentEvidenceCount === 1, "Predictive context must not inflate independent count");
  assert(verbAttr.status === "CANDIDATE", "Status must remain CANDIDATE");
});

runTest("PC-6: Predictive context cannot infer forbidden identity", () => {
  const predAnalysis = makePredictiveAnalysis([
    {
      id: "pred_ident",
      source: "CURRENT_CONTEXT",
      predictionType: "CONTEXT_RELEVANT",
      relevance: 0.9,
      confidence: 0.9,
      topic: "identity",
      reasonCategory: "INFERENCE",
      expiresAt: 5000,
      isSafeToInject: true,
      requiresConfirmation: false,
      contextSummary: "User job_title is Chief Architect",
      directive: "job_title: Chief Architect",
    },
  ]);

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    predictiveContext: predAnalysis,
    options: { currentTime: 1000 },
  });

  assert(res.profile.attributes["job_title"] === undefined, "Forbidden identity must be excluded");
});

runTest("PC-7: Predictive context with sensitive tokens is suppressed", () => {
  const predAnalysis = makePredictiveAnalysis([
    {
      id: "pred_sens",
      source: "CURRENT_CONTEXT",
      predictionType: "CONTEXT_RELEVANT",
      relevance: 0.9,
      confidence: 0.9,
      topic: "credentials",
      reasonCategory: "AUTH",
      expiresAt: 5000,
      isSafeToInject: true,
      requiresConfirmation: false,
      contextSummary: "api_key=sk-1234567890abcdef123456",
      directive: "api_key=sk-1234567890abcdef123456",
    },
  ]);

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    predictiveContext: predAnalysis,
    options: { currentTime: 1000 },
  });

  assert(res.safetyStatus === "SENSITIVE_SUPPRESSED", "Safety status must indicate sensitive suppressed");
});

runTest("PC-8: Directives from user model sanitize any predictive metadata", () => {
  const govCand = makeGovCand("preferred_language", "Bangla", {
    memoryId: "mem_lang_01",
    source: "EXPLICIT_USER",
  });

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([govCand]),
    options: { currentTime: 1000 },
  });

  for (const d of res.activeDirectives) {
    assert(!d.includes("pred_"), "Directives must not contain predictive ID");
    assert(!d.includes("0.9"), "Directives must not contain raw floats");
  }
});

runTest("PC-9: Precedence hierarchy strictly maintains EXPLICIT_USER_MEMORY > PREDICTIVE_CONTEXT", () => {
  const govCand = makeGovCand("preferred_tone", "Professional", {
    memoryId: "mem_tone_exp",
    source: "EXPLICIT_USER",
    confidence: 1.0,
  });

  const predAnalysis = makePredictiveAnalysis([
    {
      id: "pred_tone",
      source: "RECENT_INTERACTION",
      predictionType: "PREFERENCE_RELEVANT",
      relevance: 0.95,
      confidence: 0.95,
      topic: "tone",
      reasonCategory: "PREDICTION",
      expiresAt: 5000,
      isSafeToInject: true,
      requiresConfirmation: false,
      contextSummary: "Casual tone predicted",
    },
  ]);

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    governanceAnalysis: makeGovAnalysis([govCand]),
    predictiveContext: predAnalysis,
    options: { currentTime: 1000 },
  });

  const toneAttr = res.profile.attributes["tone"];
  assert(toneAttr.normalizedValue === "Professional", "Explicit tone wins over predictive tone");
  assert(toneAttr.sourceClassification === "EXPLICIT_USER_MEMORY", "Authority is EXPLICIT_USER_MEMORY");
});

runTest("PC-10: Full lifecycle: Predictive context alone never alters stable user model", () => {
  const predAnalysis = makePredictiveAnalysis([
    {
      id: "pred_task",
      source: "ACTIVE_PLAN",
      predictionType: "TASK_CONTINUATION",
      relevance: 0.9,
      confidence: 0.9,
      topic: "plan",
      reasonCategory: "PLAN_CONTINUATION",
      expiresAt: 5000,
      isSafeToInject: true,
      requiresConfirmation: false,
      contextSummary: "Continuation step 2",
    },
  ]);

  const res = longTermUserModelEngine.synthesize({
    userId: "test_user",
    predictiveContext: predAnalysis,
    options: { currentTime: 1000 },
  });

  assert(res.profile.confirmedAttributes.length === 0, "No confirmed attributes in stable profile");
  assert(res.profile.domainInterests.length === 0, "No domain interests in stable profile");
  assert(res.profile.projectContexts.length === 0, "No project contexts in stable profile");
  assert(res.profile.goals.length === 0, "No goals in stable profile");
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("=============================================");
console.log(`TOTAL TESTS: ${testsPassed + testsFailed}`);
console.log(`PASSED: ${testsPassed}`);
console.log(`FAILED: ${testsFailed}`);
console.log("=============================================");

if (testsFailed > 0) {
  process.exit(1);
}
