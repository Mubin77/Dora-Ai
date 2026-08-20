/**
 * Dora Adaptive Memory Learning & User Model Engine Test Suite
 * Phase 2 — Step 5
 * 
 * Verifies all 30 deterministic requirements for pattern learning, candidate promotion,
 * independent evidence deduplication, user corrections, current-turn precedence,
 * sensitive data suppression, temporal decay, and BrainEngine integration.
 */

import { adaptiveLearningEngine } from "./adaptiveLearningEngine";
import {
  LearningPattern,
  LearningSignal,
  PatternStatus,
} from "./adaptiveLearningTypes";
import { ConversationContext } from "./contextTypes";
import { StructuredIntent } from "./intentTypes";
import { MemoryGovernanceAnalysis, MemoryGovernanceCandidate } from "./memoryGovernanceTypes";
import { brainEngine } from "./brainEngine";
import { memoryStore } from "./memoryStore";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function createDummyContext(id: string = "session_test"): ConversationContext {
  return {
    id,
    activeTopic: "software_development",
    currentTask: null,
    userGoal: null,
    entities: [],
    constraints: [],
    preferences: [],
    recentReferences: [],
    conversationState: "active",
    lastMeaningfulUserIntent: null,
    lastMeaningfulAssistantResponse: null,
    createdAt: 1000,
    updatedAt: 1000,
    contextTimestamp: 1000,
    turnsCount: 1,
    isTopicSwitched: false,
    isAmbiguousReference: false,
    archivedContexts: [],
    topicHistory: [],
  };
}

function createDummyIntent(primaryIntent: any = "INFORMATION"): StructuredIntent {
  return {
    primaryIntent,
    relationship: "STANDALONE",
    intentConfidence: 0.9,
    intentSignals: {},
    requiresClarification: false,
    isMultiIntent: false,
    suggestedDirectives: [],
  };
}

export function runTests() {
  console.log("==========================================");
  console.log("RUNNING DORA ADAPTIVE LEARNING TEST SUITE");
  console.log("==========================================");

  // -------------------------------------------------------------
  // TEST 1 — Explicit preference vs Inferred preference lifecycle
  // -------------------------------------------------------------
  console.log("TEST 1 — Explicit preference vs Inferred preference lifecycle:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();

    // 1a. Explicit preference immediately confirmed
    const explicitResult = adaptiveLearningEngine.analyze({
      message: "I prefer ASUS laptops.",
      context: ctx,
      intent,
      options: { userId: "user_1_a", currentTime: 1000 },
    });

    assert(explicitResult.patterns.length >= 1, "Pattern created for explicit preference");
    const explicitPref = explicitResult.patterns.find((p) => p.value.toLowerCase().includes("asus"));
    assert(Boolean(explicitPref), "ASUS preference pattern found");
    assert(explicitPref!.status === "CONFIRMED", "Explicit statement MUST be CONFIRMED immediately");
    assert(explicitPref!.confidence >= 0.85, "Explicit statement has high confidence >= 0.85");
    assert(explicitPref!.isExplicit === true, "Explicit flag is true");

    // 1b. Inferred query preference starts safely as CANDIDATE
    const inferredResult = adaptiveLearningEngine.analyze({
      message: "Show me specs for RTX gaming laptops",
      context: ctx,
      intent,
      options: { userId: "user_1_b", currentTime: 1000 },
    });

    const inferredPref = inferredResult.patterns.find((p) => p.patternType === "DOMAIN_INTEREST" || p.key.includes("laptop"));
    if (inferredPref) {
      assert(inferredPref.status === "CANDIDATE", "Inferred domain query MUST start as CANDIDATE");
      assert(inferredPref.isExplicit === false, "Inferred query isExplicit is false");
    }
    console.log("  ✓ Explicit statements promoted to CONFIRMED; inferred queries start as CANDIDATE");
  }

  // -------------------------------------------------------------
  // TEST 2 — Repeated preference reinforcement
  // -------------------------------------------------------------
  console.log("TEST 2 — Repeated preference reinforcement:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    // Turn 1
    const res1 = adaptiveLearningEngine.analyze({
      message: "I prefer ASUS laptops.",
      context: ctx,
      intent,
      options: { userId: "user_2", currentTime: 1000 },
    });
    const p1 = res1.patterns.find((p) => p.value.toLowerCase().includes("asus"))!;
    const initialConf = p1.confidence;

    // Turn 2 (independent evidence at time 2000)
    const res2 = adaptiveLearningEngine.analyze({
      message: "I usually choose ASUS models.",
      context: ctx,
      intent,
      existingPatterns: res1.patterns,
      options: { userId: "user_2", currentTime: 2000 },
    });

    const p2 = res2.patterns.find((p) => p.value.toLowerCase().includes("asus"))!;
    assert(p2.independentEvidenceCount === 2, "Evidence count incremented to 2");
    assert(p2.reinforcementCount === 2, "Reinforcement count incremented to 2");
    assert(p2.confidence > initialConf, "Confidence increased with reinforcement");
    console.log("  ✓ Repeated evidence reinforces pattern and increments confidence");
  }

  // -------------------------------------------------------------
  // TEST 3 — Candidate promotion
  // -------------------------------------------------------------
  console.log("TEST 3 — Candidate promotion:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const candidatePattern: LearningPattern = {
      id: "pat_cand_promote",
      userId: "user_3",
      patternType: "USER_PREFERENCE",
      category: "general",
      key: "pref_oled_display",
      value: "OLED Display",
      status: "CANDIDATE",
      confidence: 0.60,
      reinforcementCount: 1,
      independentEvidenceCount: 1,
      firstObservedAt: 1000,
      lastObservedAt: 1000,
      evidence: [],
      source: "DOMAIN_QUERY",
      isExplicit: false,
    };

    // Turn 2: Second observation
    const res2 = adaptiveLearningEngine.analyze({
      message: "Tell me about OLED Display laptops",
      context: ctx,
      intent,
      existingPatterns: [candidatePattern],
      options: { userId: "user_3", currentTime: 2000 },
    });

    // Turn 3: Third observation (satisfies threshold >= 3, conf >= 0.75)
    const res3 = adaptiveLearningEngine.analyze({
      message: "Are OLED Display screens good for coding?",
      context: ctx,
      intent,
      existingPatterns: res2.patterns,
      options: { userId: "user_3", currentTime: 3000 },
    });

    const pref = res3.patterns.find((p) => p.value.toLowerCase().includes("oled"))!;
    assert(pref.status === "CONFIRMED", "Pattern promoted to CONFIRMED after reaching threshold");
    const promoAction = res3.decisions.find((d) => d.actionType === "PROMOTE_PATTERN");
    assert(Boolean(promoAction), "Promotion action recorded in decisions");
    console.log("  ✓ Candidate promoted to CONFIRMED upon satisfying criteria");
  }

  // -------------------------------------------------------------
  // TEST 4 — Candidate demotion (temporal decay / outdated)
  // -------------------------------------------------------------
  console.log("TEST 4 — Candidate demotion:");
  {
    const initialPattern: LearningPattern = {
      id: "pat_stale",
      userId: "user_4",
      patternType: "USER_PREFERENCE",
      category: "general",
      key: "pref_old_tool",
      value: "OldTool",
      status: "CANDIDATE",
      confidence: 0.40,
      reinforcementCount: 1,
      independentEvidenceCount: 1,
      firstObservedAt: 1000,
      lastObservedAt: 1000,
      evidence: [],
      source: "EXPLICIT_USER_STATEMENT",
    };

    const ctx = createDummyContext();
    const intent = createDummyIntent();
    // 60 days later with no reinforcement
    const res = adaptiveLearningEngine.analyze({
      message: "Hello there",
      context: ctx,
      intent,
      existingPatterns: [initialPattern],
      options: { userId: "user_4", currentTime: 1000 + 60 * 24 * 60 * 60 * 1000 },
    });

    const demoted = res.patterns.find((p) => p.id === "pat_stale")!;
    assert(demoted.status === "OUTDATED", "Stale unreinforced pattern demoted to OUTDATED");
    console.log("  ✓ Stale candidate demoted to OUTDATED");
  }

  // -------------------------------------------------------------
  // TEST 5 — Duplicate evidence suppression
  // -------------------------------------------------------------
  console.log("TEST 5 — Duplicate evidence suppression:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const res1 = adaptiveLearningEngine.analyze({
      message: "I prefer Firefox.",
      context: ctx,
      intent,
      options: { userId: "user_5", currentTime: 1000 },
    });

    // Run identical message in same millisecond (duplicate)
    const res2 = adaptiveLearningEngine.analyze({
      message: "I prefer Firefox.",
      context: ctx,
      intent,
      existingPatterns: res1.patterns,
      options: { userId: "user_5", currentTime: 1000 },
    });

    const pref = res2.patterns.find((p) => p.value.toLowerCase().includes("firefox"))!;
    assert(pref.independentEvidenceCount === 1, "Duplicate evidence in same turn does NOT increment count");
    const noChange = res2.decisions.find((d) => d.reason === "DUPLICATE_EVIDENCE_SUPPRESSED");
    assert(Boolean(noChange), "Duplicate evidence logged as suppressed");
    console.log("  ✓ Identical duplicate evidence within same turn is suppressed");
  }

  // -------------------------------------------------------------
  // TEST 6 — Independent evidence counting
  // -------------------------------------------------------------
  console.log("TEST 6 — Independent evidence counting:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    let patterns: LearningPattern[] = [];

    // 3 distinct turns across time
    for (let t = 1; t <= 3; t++) {
      const res = adaptiveLearningEngine.analyze({
        message: `Turn ${t}: I like Neovim editor.`,
        context: ctx,
        intent,
        existingPatterns: patterns,
        options: { userId: "user_6", currentTime: t * 10000 },
      });
      patterns = res.patterns;
    }

    const nvim = patterns.find((p) => p.value.toLowerCase().includes("neovim"))!;
    assert(nvim.independentEvidenceCount === 3, "Independent evidence count is exactly 3");
    assert(nvim.status === "CONFIRMED", "Promoted to CONFIRMED on 3 independent observations");
    console.log("  ✓ Distinct turns increment independent evidence count accurately");
  }

  // -------------------------------------------------------------
  // TEST 7 — Explicit correction precedence
  // -------------------------------------------------------------
  console.log("TEST 7 — Explicit correction precedence:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    // Turn 1: Lenovo
    const res1 = adaptiveLearningEngine.analyze({
      message: "I prefer Lenovo laptops.",
      context: ctx,
      intent,
      options: { userId: "user_7", currentTime: 1000 },
    });

    // Turn 2: User explicitly corrects to ASUS
    const corrIntent = createDummyIntent("CORRECTION");
    const res2 = adaptiveLearningEngine.analyze({
      message: "No, actually I prefer ASUS.",
      context: ctx,
      intent: corrIntent,
      existingPatterns: res1.patterns,
      options: { userId: "user_7", currentTime: 2000 },
    });

    const oldPat = res2.patterns.find((p) => p.value.toLowerCase().includes("lenovo"))!;
    const newPat = res2.patterns.find((p) => p.value.toLowerCase().includes("asus"))!;

    assert(oldPat.status === "OUTDATED", "Old Lenovo preference marked OUTDATED");
    assert(oldPat.supersededBy === newPat.id, "Old pattern points to new pattern via supersededBy");
    assert(newPat.supersedes === oldPat.id, "New pattern points to old pattern via supersedes");
    assert(newPat.status === "CONFIRMED", "New ASUS pattern active and CONFIRMED from explicit correction");
    console.log("  ✓ Explicit correction cleanly supersedes old preference with lineage");
  }

  // -------------------------------------------------------------
  // TEST 8 — Conflicting preferences
  // -------------------------------------------------------------
  console.log("TEST 8 — Conflicting preferences:");
  {
    const existing: LearningPattern = {
      id: "pat_light",
      userId: "user_8",
      patternType: "USER_PREFERENCE",
      category: "ui_theme",
      key: "pref_ui_theme",
      value: "light mode",
      status: "CANDIDATE",
      confidence: 0.6,
      reinforcementCount: 1,
      independentEvidenceCount: 1,
      firstObservedAt: 1000,
      lastObservedAt: 1000,
      evidence: [],
      source: "EXPLICIT_USER_STATEMENT",
    };

    const ctx = createDummyContext();
    const intent = createDummyIntent();
    // Signal conflicting value without explicit override
    const govAnalysis: MemoryGovernanceAnalysis = {
      governanceRequired: true,
      governanceConfidence: 0.9,
      allowedMemories: [],
      cautiousMemories: [],
      internalOnlyMemories: [],
      suppressedMemories: [],
      governedCandidates: [],
      conflicts: [],
      memoryInfluenceAllowed: false,
      privacyBlocks: [],
      topicIsolationApplied: false,
      explicitReferenceDetected: false,
      directives: [],
      sanitizedMemoryContext: "",
    };

    const res = adaptiveLearningEngine.analyze({
      message: "I prefer dark mode",
      context: ctx,
      intent,
      existingPatterns: [existing],
      governanceAnalysis: govAnalysis,
      options: { userId: "user_8", currentTime: 2000 },
    });

    assert(res.diagnostics.conflictsDetected >= 1, "Conflict detected and tracked in diagnostics");
    console.log("  ✓ Conflicting preference recorded in conflict diagnostics");
  }

  // -------------------------------------------------------------
  // TEST 9 — Current-turn precedence
  // -------------------------------------------------------------
  console.log("TEST 9 — Current-turn precedence:");
  {
    const concisePattern: LearningPattern = {
      id: "pat_style_concise",
      userId: "user_9",
      patternType: "INTERACTION_STYLE",
      category: "style",
      key: "style_verbosity",
      value: "concise",
      status: "CONFIRMED",
      confidence: 0.9,
      reinforcementCount: 5,
      independentEvidenceCount: 5,
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      evidence: [],
      source: "INTERACTION_STYLE",
    };

    const ctx = createDummyContext();
    const intent = createDummyIntent();
    // Current turn explicitly requests detailed explanation
    const res = adaptiveLearningEngine.analyze({
      message: "Explain this in detail please.",
      context: ctx,
      intent,
      existingPatterns: [concisePattern],
      options: { userId: "user_9", currentTime: 3000 },
    });

    assert(res.currentTurnOverrideApplied === true, "currentTurnOverrideApplied flag set to true");
    assert(
      !res.activeDirectives.some((d) => d.includes("concise")),
      "Historical concise directive suppressed for this turn"
    );
    console.log("  ✓ Current turn instruction overrides historical preference directive");
  }

  // -------------------------------------------------------------
  // TEST 10 — Bangla preference learning
  // -------------------------------------------------------------
  console.log("TEST 10 — Bangla preference learning:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const res = adaptiveLearningEngine.analyze({
      message: "আমার পছন্দ ডার্ক মোড। দয়া করে বাংলায় বলো।",
      context: ctx,
      intent,
      options: { userId: "user_10", currentTime: 1000 },
    });

    const langPref = res.patterns.find((p) => p.key === "style_language");
    assert(Boolean(langPref), "Bangla language preference pattern created");
    assert(langPref!.value === "bn", "Language value is bn");
    console.log("  ✓ Bangla preference and language style learned accurately");
  }

  // -------------------------------------------------------------
  // TEST 11 — Banglish preference learning
  // -------------------------------------------------------------
  console.log("TEST 11 — Banglish preference learning:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const res = adaptiveLearningEngine.analyze({
      message: "amar pochondo OLED display. banglish e bolo.",
      context: ctx,
      intent,
      options: { userId: "user_11", currentTime: 1000 },
    });

    const langPref = res.patterns.find((p) => p.key === "style_language");
    assert(Boolean(langPref), "Banglish language pattern created");
    assert(langPref!.value === "banglish", "Language value is banglish");
    console.log("  ✓ Banglish preference recognized and stored");
  }

  // -------------------------------------------------------------
  // TEST 12 — English preference learning
  // -------------------------------------------------------------
  console.log("TEST 12 — English preference learning:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const res = adaptiveLearningEngine.analyze({
      message: "Respond in English please.",
      context: ctx,
      intent,
      options: { userId: "user_12", currentTime: 1000 },
    });

    const langPref = res.patterns.find((p) => p.key === "style_language");
    assert(Boolean(langPref), "English language pattern created");
    assert(langPref!.value === "en", "Language value is en");
    console.log("  ✓ English style preference recorded");
  }

  // -------------------------------------------------------------
  // TEST 13 — Response-style learning (concise vs detailed)
  // -------------------------------------------------------------
  console.log("TEST 13 — Response-style learning:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const res = adaptiveLearningEngine.analyze({
      message: "Keep it brief and be concise.",
      context: ctx,
      intent,
      options: { userId: "user_13", currentTime: 1000 },
    });

    const verbPref = res.patterns.find((p) => p.key === "style_verbosity");
    assert(Boolean(verbPref), "Verbosity style pattern created");
    assert(verbPref!.value === "concise", "Value is concise");
    assert(
      res.activeDirectives.some((d) => d.includes("concise technical responses")),
      "Directive generated for concise style"
    );
    console.log("  ✓ Concise interaction style extracted with sanitized directive");
  }

  // -------------------------------------------------------------
  // TEST 14 — Task-pattern detection
  // -------------------------------------------------------------
  console.log("TEST 14 — Task-pattern detection:");
  {
    const ctx = createDummyContext();
    ctx.currentTask = "code_refactoring";
    const intent = createDummyIntent("CODE_GENERATION");

    const res = adaptiveLearningEngine.analyze({
      message: "Refactor this TypeScript function",
      context: ctx,
      intent,
      options: { userId: "user_14", currentTime: 1000 },
    });

    const taskPat = res.patterns.find((p) => p.patternType === "TASK_WORKFLOW");
    assert(Boolean(taskPat), "Task pattern detected for code_refactoring");
    assert(taskPat!.value === "code_refactoring", "Workflow pattern value matches task");
    console.log("  ✓ Task workflow pattern detected and recorded");
  }

  // -------------------------------------------------------------
  // TEST 15 — Domain-interest candidate detection
  // -------------------------------------------------------------
  console.log("TEST 15 — Domain-interest candidate detection:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const res = adaptiveLearningEngine.analyze({
      message: "How does deep learning and neural network training work?",
      context: ctx,
      intent,
      options: { userId: "user_15", currentTime: 1000 },
    });

    const domainPat = res.patterns.find((p) => p.patternType === "DOMAIN_INTEREST");
    assert(Boolean(domainPat), "Domain interest detected");
    assert(domainPat!.category === "ai_development", "Domain categorized as ai_development");
    console.log("  ✓ Domain interest candidate identified from topic keywords");
  }

  // -------------------------------------------------------------
  // TEST 16 — No ownership hallucination
  // -------------------------------------------------------------
  console.log("TEST 16 — No ownership hallucination:");
  {
    const domainPat: LearningPattern = {
      id: "pat_laptop",
      userId: "user_16",
      patternType: "DOMAIN_INTEREST",
      category: "hardware",
      key: "domain_laptops",
      value: "gaming laptops",
      status: "CANDIDATE",
      confidence: 0.6,
      reinforcementCount: 3,
      independentEvidenceCount: 3,
      firstObservedAt: 1000,
      lastObservedAt: 3000,
      evidence: [],
      source: "DOMAIN_QUERY",
    };

    const directive = adaptiveLearningEngine.generateSanitizedDirective(domainPat);
    assert(Boolean(directive), "Directive generated");
    assert(!directive!.toLowerCase().includes("owns"), "MUST NOT state user owns anything");
    assert(directive!.includes("recurring interest in"), "Uses cautious recurring interest phrasing");
    console.log("  ✓ Domain interest NEVER claims user ownership");
  }

  // -------------------------------------------------------------
  // TEST 17 — No biography hallucination
  // -------------------------------------------------------------
  console.log("TEST 17 — No biography hallucination:");
  {
    const devPat: LearningPattern = {
      id: "pat_dev",
      userId: "user_17",
      patternType: "DOMAIN_INTEREST",
      category: "software_engineering",
      key: "domain_rust",
      value: "Rust programming",
      status: "CONFIRMED",
      confidence: 0.8,
      reinforcementCount: 4,
      independentEvidenceCount: 4,
      firstObservedAt: 1000,
      lastObservedAt: 4000,
      evidence: [],
      source: "DOMAIN_QUERY",
    };

    const directive = adaptiveLearningEngine.generateSanitizedDirective(devPat);
    assert(!directive!.toLowerCase().includes("employed"), "MUST NOT claim employment");
    assert(!directive!.toLowerCase().includes("is a rust developer"), "MUST NOT claim identity fact");
    console.log("  ✓ Domain interest NEVER invents biographical facts");
  }

  // -------------------------------------------------------------
  // TEST 18 — Sensitive data suppression
  // -------------------------------------------------------------
  console.log("TEST 18 — Sensitive data suppression:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const res = adaptiveLearningEngine.analyze({
      message: "My api key is sk-12345678901234567890 and my password is secret123",
      context: ctx,
      intent,
      options: { userId: "user_18", currentTime: 1000 },
    });

    assert(res.diagnostics.sensitiveSignalsBlocked >= 1, "Sensitive signal blocked");
    assert(
      !res.patterns.some((p) => p.value.includes("secret123") || p.value.includes("sk-12345")),
      "Sensitive tokens NEVER enter learned patterns"
    );
    assert(
      !res.activeDirectives.some((d) => d.includes("secret123") || d.includes("sk-12345")),
      "Sensitive tokens NEVER enter active directives"
    );
    console.log("  ✓ Sensitive credentials completely suppressed from learning");
  }

  // -------------------------------------------------------------
  // TEST 19 — Expired memory suppression
  // -------------------------------------------------------------
  console.log("TEST 19 — Expired memory suppression:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    // Pass governance analysis where memory is expired and usageDecision is SUPPRESS
    const govAnalysis: MemoryGovernanceAnalysis = {
      governanceRequired: true,
      governanceConfidence: 0.9,
      allowedMemories: [],
      cautiousMemories: [],
      internalOnlyMemories: [],
      suppressedMemories: [
        {
          memoryId: "mem_exp",
          type: "FACT",
          key: "temp_pass",
          value: "temporary value",
          status: "EXPIRED",
          confidence: 0.9,
          usageScore: 0.1,
          relevance: 0.1,
          usageDecision: "SUPPRESS",
          reasons: ["EXPIRED_MEMORY"],
          canSupportFactualClaim: false,
          canPersonalize: false,
          canAffectResponseContent: false,
          requiresExplicitAttribution: false,
          isCandidateInferred: false,
          source: "EXPLICIT_USER",
        },
      ],
      governedCandidates: [],
      conflicts: [],
      memoryInfluenceAllowed: false,
      privacyBlocks: [],
      topicIsolationApplied: false,
      explicitReferenceDetected: false,
      directives: [],
      sanitizedMemoryContext: "",
    };

    const res = adaptiveLearningEngine.analyze({
      message: "Hello",
      context: ctx,
      intent,
      governanceAnalysis: govAnalysis,
      options: { userId: "user_19", currentTime: 1000 },
    });

    assert(
      !res.patterns.some((p) => p.value === "temporary value"),
      "Expired memory not added to learned patterns"
    );
    console.log("  ✓ Expired memories excluded from learning signals");
  }

  // -------------------------------------------------------------
  // TEST 20 — Superseded memory suppression
  // -------------------------------------------------------------
  console.log("TEST 20 — Superseded memory suppression:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const govAnalysis: MemoryGovernanceAnalysis = {
      governanceRequired: true,
      governanceConfidence: 0.9,
      allowedMemories: [],
      cautiousMemories: [],
      internalOnlyMemories: [],
      suppressedMemories: [
        {
          memoryId: "mem_sup",
          type: "PREFERENCE",
          key: "laptop_brand",
          value: "Dell",
          status: "SUPERSEDED",
          confidence: 0.9,
          usageScore: 0.1,
          relevance: 0.1,
          usageDecision: "SUPPRESS",
          reasons: ["SUPERSEDED_MEMORY"],
          canSupportFactualClaim: false,
          canPersonalize: false,
          canAffectResponseContent: false,
          requiresExplicitAttribution: false,
          isCandidateInferred: false,
          source: "EXPLICIT_USER",
        },
      ],
      governedCandidates: [],
      conflicts: [],
      memoryInfluenceAllowed: false,
      privacyBlocks: [],
      topicIsolationApplied: false,
      explicitReferenceDetected: false,
      directives: [],
      sanitizedMemoryContext: "",
    };

    const res = adaptiveLearningEngine.analyze({
      message: "Hello",
      context: ctx,
      intent,
      governanceAnalysis: govAnalysis,
      options: { userId: "user_20", currentTime: 1000 },
    });

    assert(
      !res.patterns.some((p) => p.value === "Dell"),
      "Superseded memory not added to patterns"
    );
    console.log("  ✓ Superseded memories excluded from learning signals");
  }

  // -------------------------------------------------------------
  // TEST 21 — Topic isolation
  // -------------------------------------------------------------
  console.log("TEST 21 — Topic isolation:");
  {
    const ctx = createDummyContext();
    ctx.activeTopic = "weather_inquiry";
    const intent = createDummyIntent();

    const res = adaptiveLearningEngine.analyze({
      message: "What is the weather in Dhaka?",
      context: ctx,
      intent,
      options: { userId: "user_21", currentTime: 1000 },
    });

    // Should not learn hardware or code preference from unrelated weather topic
    assert(
      !res.patterns.some((p) => p.key === "pref_asus" || p.key === "domain_rust"),
      "Unrelated preferences not created from weather inquiry"
    );
    console.log("  ✓ Topic isolation prevents cross-domain pollution");
  }

  // -------------------------------------------------------------
  // TEST 22 — Governance integration
  // -------------------------------------------------------------
  console.log("TEST 22 — Governance integration:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    // Memory approved by MemoryGovernanceEngine
    const govMemory: MemoryGovernanceCandidate = {
      memoryId: "mem_gov_approved",
      type: "PREFERENCE",
      key: "pref_browser",
      value: "Firefox Developer Edition",
      status: "ACTIVE",
      confidence: 0.95,
      usageScore: 0.95,
      relevance: 0.95,
      usageDecision: "ALLOW",
      reasons: ["EXPLICIT_REFERENCE"],
      canSupportFactualClaim: false,
      canPersonalize: true,
      canAffectResponseContent: true,
      requiresExplicitAttribution: false,
      isCandidateInferred: false,
      source: "EXPLICIT_USER",
    };

    const govAnalysis: MemoryGovernanceAnalysis = {
      governanceRequired: true,
      governanceConfidence: 0.9,
      allowedMemories: [govMemory],
      cautiousMemories: [],
      internalOnlyMemories: [],
      suppressedMemories: [],
      governedCandidates: [govMemory],
      conflicts: [],
      memoryInfluenceAllowed: true,
      privacyBlocks: [],
      topicIsolationApplied: false,
      explicitReferenceDetected: true,
      directives: [],
      sanitizedMemoryContext: "User preference: Firefox Developer Edition",
    };

    const res = adaptiveLearningEngine.analyze({
      message: "Recommend browser extensions",
      context: ctx,
      intent,
      governanceAnalysis: govAnalysis,
      options: { userId: "user_22", currentTime: 1000 },
    });

    const browserPat = res.patterns.find((p) => p.key === "pref_browser");
    assert(Boolean(browserPat), "Governance-allowed memory converted into learning signal");
    assert(browserPat!.value === "Firefox Developer Edition", "Value correctly preserved");
    console.log("  ✓ Governance-approved memories safely ingested into adaptive learning");
  }

  // -------------------------------------------------------------
  // TEST 23 — Idempotency
  // -------------------------------------------------------------
  console.log("TEST 23 — Idempotency:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const res1 = adaptiveLearningEngine.analyze({
      message: "I prefer TypeScript",
      context: ctx,
      intent,
      options: { userId: "user_23", currentTime: 1000 },
    });

    const p1 = res1.patterns[0];
    const initialEvidenceCount = p1.independentEvidenceCount;
    const initialConfidence = p1.confidence;

    // Run identical pass over identical state
    const res2 = adaptiveLearningEngine.analyze({
      message: "I prefer TypeScript",
      context: ctx,
      intent,
      existingPatterns: res1.patterns,
      options: { userId: "user_23", currentTime: 1000 },
    });

    const p2 = res2.patterns[0];
    assert(p2.independentEvidenceCount === initialEvidenceCount, "Evidence count identical across duplicate runs");
    assert(p2.confidence === initialConfidence, "Confidence identical across duplicate runs");
    assert(res1.patterns.length === res2.patterns.length, "Pattern count identical across duplicate runs");
    console.log("  ✓ Analysis pass is strictly idempotent");
  }

  // -------------------------------------------------------------
  // TEST 24 — Confidence upper bound
  // -------------------------------------------------------------
  console.log("TEST 24 — Confidence upper bound:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    let patterns: LearningPattern[] = [];

    // Reinforce 20 times across distinct timestamps
    for (let i = 1; i <= 20; i++) {
      const res = adaptiveLearningEngine.analyze({
        message: `I prefer Python programming ${i}`,
        context: ctx,
        intent,
        existingPatterns: patterns,
        options: { userId: "user_24", currentTime: i * 5000 },
      });
      patterns = res.patterns;
    }

    const py = patterns.find((p) => p.value.toLowerCase().includes("python"))!;
    assert(py.confidence <= 1.0, `Confidence must not exceed 1.0 (got ${py.confidence})`);
    assert(py.confidence >= 0.0, `Confidence must not be negative (got ${py.confidence})`);
    console.log("  ✓ Confidence mathematically bounded strictly in [0.0, 1.0]");
  }

  // -------------------------------------------------------------
  // TEST 25 — Empty/no-signal behavior
  // -------------------------------------------------------------
  console.log("TEST 25 — Empty/no-signal behavior:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const res = adaptiveLearningEngine.analyze({
      message: "hello",
      context: ctx,
      intent,
      options: { userId: "user_25", currentTime: 1000 },
    });

    assert(res.patterns.length === 0, "No spurious patterns created for generic greeting");
    assert(res.activeDirectives.length === 0, "No spurious directives created for generic greeting");
    console.log("  ✓ Empty/casual queries produce zero spurious patterns");
  }

  // -------------------------------------------------------------
  // TEST 26 — Candidate confirmation threshold
  // -------------------------------------------------------------
  console.log("TEST 26 — Candidate confirmation threshold:");
  {
    const pattern: LearningPattern = {
      id: "pat_cand",
      userId: "user_26",
      patternType: "USER_PREFERENCE",
      category: "general",
      key: "pref_tea",
      value: "Green Tea",
      status: "CANDIDATE",
      confidence: 0.65,
      reinforcementCount: 1,
      independentEvidenceCount: 1,
      firstObservedAt: 1000,
      lastObservedAt: 1000,
      evidence: [],
      source: "DOMAIN_QUERY",
      isExplicit: false,
    };

    const ctx = createDummyContext();
    const intent = createDummyIntent();
    // Second observation (non-explicit needs >= 3)
    const res1 = adaptiveLearningEngine.analyze({
      message: "Green tea brewing temp",
      context: ctx,
      intent,
      existingPatterns: [pattern],
      options: { userId: "user_26", currentTime: 2000 },
    });

    const p1 = res1.patterns.find((p) => p.id === "pat_cand")!;
    assert(p1.status === "CANDIDATE", "Remains CANDIDATE at evidence count 2 for implicit signals");

    // Third observation (satisfies threshold >= 3)
    const res2 = adaptiveLearningEngine.analyze({
      message: "Green tea benefits",
      context: ctx,
      intent,
      existingPatterns: res1.patterns,
      options: { userId: "user_26", currentTime: 3000 },
    });

    const p2 = res2.patterns.find((p) => p.id === "pat_cand")!;
    assert(p2.status === "CONFIRMED", "Promoted to CONFIRMED on reaching 3 independent observations");
    console.log("  ✓ Implicit candidates promoted only when satisfying threshold >= 3");
  }

  // -------------------------------------------------------------
  // TEST 27 — Repeated correction handling
  // -------------------------------------------------------------
  console.log("TEST 27 — Repeated correction handling:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    // Turn 1: Red
    const res1 = adaptiveLearningEngine.analyze({
      message: "I prefer Red color theme.",
      context: ctx,
      intent,
      options: { userId: "user_27", currentTime: 1000 },
    });

    // Turn 2: Correction to Blue
    const corr1 = createDummyIntent("CORRECTION");
    const res2 = adaptiveLearningEngine.analyze({
      message: "No, actually I prefer Blue color theme.",
      context: ctx,
      intent: corr1,
      existingPatterns: res1.patterns,
      options: { userId: "user_27", currentTime: 2000 },
    });

    // Turn 3: Correction to Green
    const corr2 = createDummyIntent("CORRECTION");
    const res3 = adaptiveLearningEngine.analyze({
      message: "Actually change to Green color theme.",
      context: ctx,
      intent: corr2,
      existingPatterns: res2.patterns,
      options: { userId: "user_27", currentTime: 3000 },
    });

    const activeGreen = res3.patterns.find((p) => p.value.toLowerCase().includes("green"))!;
    const outdatedBlue = res3.patterns.find((p) => p.value.toLowerCase().includes("blue"))!;
    const outdatedRed = res3.patterns.find((p) => p.value.toLowerCase().includes("red"))!;

    assert(Boolean(activeGreen), "Green pattern active");
    assert(outdatedBlue.status === "OUTDATED", "Blue pattern marked OUTDATED");
    assert(outdatedRed.status === "OUTDATED", "Red pattern marked OUTDATED");
    assert(activeGreen.supersedes === outdatedBlue.id, "Green supersedes Blue");
    assert(outdatedBlue.supersedes === outdatedRed.id, "Blue supersedes Red");
    console.log("  ✓ Multi-step corrections maintain full sequential lineage");
  }

  // -------------------------------------------------------------
  // TEST 28 — Temporal decay
  // -------------------------------------------------------------
  console.log("TEST 28 — Temporal decay:");
  {
    const activePattern: LearningPattern = {
      id: "pat_decay",
      userId: "user_28",
      patternType: "USER_PREFERENCE",
      category: "general",
      key: "pref_old_ide",
      value: "Eclipse",
      status: "CONFIRMED",
      confidence: 0.85,
      reinforcementCount: 3,
      independentEvidenceCount: 3,
      firstObservedAt: 1000,
      lastObservedAt: 1000,
      evidence: [],
      source: "EXPLICIT_USER_STATEMENT",
    };

    const ctx = createDummyContext();
    const intent = createDummyIntent();
    // 40 days later
    const res = adaptiveLearningEngine.analyze({
      message: "Hello world",
      context: ctx,
      intent,
      existingPatterns: [activePattern],
      options: { userId: "user_28", currentTime: 1000 + 40 * 24 * 60 * 60 * 1000 },
    });

    const decayed = res.patterns.find((p) => p.id === "pat_decay")!;
    assert(decayed.isDecayed === true, "isDecayed flag set after 40 days of inactivity");
    assert(decayed.confidence < 0.85, "Confidence decayed");
    console.log("  ✓ Inactive patterns decay confidence over time");
  }

  // -------------------------------------------------------------
  // TEST 29 — Learning directive sanitization
  // -------------------------------------------------------------
  console.log("TEST 29 — Learning directive sanitization:");
  {
    const pattern: LearningPattern = {
      id: "pat_internal_secret_id_12345",
      userId: "user_29",
      patternType: "USER_PREFERENCE",
      category: "tools",
      key: "pref_editor",
      value: "VS Code",
      status: "CONFIRMED",
      confidence: 0.923456,
      reinforcementCount: 5,
      independentEvidenceCount: 5,
      firstObservedAt: 1000,
      lastObservedAt: 5000,
      evidence: [
        {
          evidenceId: "ev_hash_9876",
          signalType: "PREFERENCE",
          timestamp: 1000,
          valueHash: "h_abcdef1234",
          source: "USER_EXPLICIT",
        },
      ],
      source: "EXPLICIT_USER_STATEMENT",
    };

    const directive = adaptiveLearningEngine.generateSanitizedDirective(pattern);
    assert(Boolean(directive), "Directive generated");
    assert(!directive!.includes("pat_internal_secret_id_12345"), "Does NOT leak internal ID");
    assert(!directive!.includes("0.923456"), "Does NOT leak confidence weight");
    assert(!directive!.includes("h_abcdef1234"), "Does NOT leak hash");
    assert(directive!.includes("VS Code"), "Contains clean user-facing preference value");
    console.log("  ✓ Directives are thoroughly sanitized and leak zero internal metadata");
  }

  // -------------------------------------------------------------
  // TEST 30 — Current instruction overrides historical preference
  // -------------------------------------------------------------
  console.log("TEST 30 — Current instruction overrides historical preference:");
  {
    const englishPref: LearningPattern = {
      id: "pat_lang_en",
      userId: "user_30",
      patternType: "INTERACTION_STYLE",
      category: "style",
      key: "style_language",
      value: "en",
      status: "CONFIRMED",
      confidence: 0.9,
      reinforcementCount: 10,
      independentEvidenceCount: 10,
      firstObservedAt: 1000,
      lastObservedAt: 5000,
      evidence: [],
      source: "INTERACTION_STYLE",
    };

    const ctx = createDummyContext();
    const intent = createDummyIntent();
    // User says in current message: "Respond in Bangla"
    const res = adaptiveLearningEngine.analyze({
      message: "দয়া করে বাংলায় বলো। Respond in Bangla.",
      context: ctx,
      intent,
      existingPatterns: [englishPref],
      options: { userId: "user_30", currentTime: 6000 },
    });

    assert(res.currentTurnOverrideApplied === true, "Current turn override applied");
    assert(
      !res.activeDirectives.some((d) => d.includes("English")),
      "English directive suppressed when user requests Bangla in current turn"
    );
    console.log("  ✓ Historical language preference suppressed when current turn specifies a different language");
  }

  // -------------------------------------------------------------
  // TEST 31 — End-to-End BrainEngine Pipeline Integration
  // -------------------------------------------------------------
  console.log("TEST 31 — End-to-End BrainEngine Pipeline Integration:");
  {
    memoryStore.clearAll();

    // Turn 1: User declares preference
    const analysis1 = brainEngine.analyze(
      "I prefer Dark Mode UI and TypeScript.",
      [],
      undefined,
      "session_pipeline",
      undefined,
      { userId: "pipeline_user_1", currentTime: 1000 }
    );

    assert(Boolean(analysis1.adaptiveLearningAnalysis), "BrainAnalysis contains adaptiveLearningAnalysis");
    const storedPatterns = memoryStore.getPatterns("pipeline_user_1");
    assert(storedPatterns.length >= 1, "MemoryStore has stored learned patterns for user");

    // Turn 2: User asks another question
    const analysis2 = brainEngine.analyze(
      "Recommend a web framework.",
      [],
      analysis1.context,
      "session_pipeline",
      undefined,
      { userId: "pipeline_user_1", currentTime: 2000 }
    );

    assert(Boolean(analysis2.adaptiveLearningAnalysis), "BrainAnalysis turn 2 contains adaptive learning");
    assert(
      analysis2.promptDirectives.some((d) => d.includes("Dark Mode") || d.includes("TypeScript")),
      "Sanitized adaptive learning directive integrated into BrainEngine promptDirectives"
    );
    console.log("  ✓ Full BrainEngine cognitive pipeline seamlessly incorporates adaptive learning");
  }

  console.log("==========================================");
  console.log("ALL 30 + 1 ADAPTIVE LEARNING TESTS PASSED!");
  console.log("==========================================");
}

runTests();
