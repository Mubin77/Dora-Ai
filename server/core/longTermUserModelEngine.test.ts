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
