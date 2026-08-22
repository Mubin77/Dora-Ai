/**
 * Dora Response Adaptation & Personalization Engine Test Suite
 * Phase 2 — Step 7
 * 
 * Verifies all 33 deterministic requirements for:
 * 1. Current-turn explicit overrides (Language, Verbosity, Tone, Format, Code Density, Depth).
 * 2. Strict Precedence Hierarchy (Current-Turn > Hard Constraint > Correction > Evidence > Governance > Adaptive > Preference > Predictive > Default).
 * 3. Script detection (Bangla Unicode, Banglish, English).
 * 4. Sensitive data interception & suppression.
 * 5. Memory governance compliance.
 * 6. Verification confidence calibration & caution injection.
 * 7. BrainEngine end-to-end integration downstream of PredictiveContextEngine.
 */

import { responseAdaptationEngine } from "./responseAdaptationEngine";
import {
  ResponseAdaptationInput,
  ResponseLanguage,
  ResponseVerbosity,
  ResponseTone,
  ResponseFormatStyle,
  ResponseCodeDensity,
  ResponseExplanationDepth,
} from "./responseAdaptationTypes";
import { ConversationContext } from "./contextTypes";
import { StructuredIntent, BrainIntent } from "./intentTypes";
import { MemoryGovernanceAnalysis, MemoryGovernanceCandidate } from "./memoryGovernanceTypes";
import { LearningAnalysis, LearningPattern } from "./adaptiveLearningTypes";
import { PredictiveContextAnalysis, ProactiveContextCandidate } from "./predictiveContextTypes";
import { VerificationAnalysis } from "./verificationTypes";
import { brainEngine } from "./brainEngine";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function createDummyContext(topic: string = "general"): ConversationContext {
  return {
    id: "session_test",
    activeTopic: topic,
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
    topicHistory: [{ topic, endedAtTurn: 1 }],
  };
}

function createDummyIntent(primaryIntent: BrainIntent = "INFORMATION"): StructuredIntent {
  return {
    primaryIntent,
    relationship: "STANDALONE",
    isMultiIntent: false,
    intentConfidence: 0.9,
    intentSignals: {},
    suggestedDirectives: [],
    requiresClarification: false,
  };
}

let totalTests = 0;
let passedTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] Test ${totalTests}: ${name}`);
  } catch (err: any) {
    console.error(`[FAIL] Test ${totalTests}: ${name}`);
    console.error(err);
    throw err;
  }
}

console.log("=== DORA PHASE 2 STEP 7: RESPONSE ADAPTATION TEST SUITE ===");

// 1. Explicit Bangla language command
runTest("Explicit Current-Turn: Bangla Language Request", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "Banglay bolo how does React work?",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.language === "BANGLA", `Expected BANGLA, got ${result.language}`);
  assert(result.styleProfile.language.winningLayer === "CURRENT_TURN_EXPLICIT", "Winning layer must be CURRENT_TURN_EXPLICIT");
  assert(result.adaptationDirectives.some((d) => d.includes("Bangla")), "Directives should contain Bangla instruction");
});

// 2. Explicit English language command overrides memory
runTest("Explicit Current-Turn: English overrides Confirmed Memory Bangla", () => {
  const govCand: MemoryGovernanceCandidate = {
    memoryId: "mem_lang_1",
    key: "preferred_language",
    value: "Bangla",
    type: "PREFERENCE",
    source: "EXPLICIT_USER",
    status: "ACTIVE",
    usageDecision: "ALLOW",
    usageScore: 0.9,
    confidence: 0.9,
    relevance: 0.9,
    reasons: ["ACTIVE_USER_PREFERENCE"],
    canAffectResponseContent: true,
    canPersonalize: true,
    canSupportFactualClaim: false,
    requiresExplicitAttribution: false,
    isCandidateInferred: false,
  };

  const govAnalysis: MemoryGovernanceAnalysis = {
    governanceRequired: true,
    memoryInfluenceAllowed: true,
    cautiousMemories: [],
    internalOnlyMemories: [],
    topicIsolationApplied: false,
    explicitReferenceDetected: false,
    governanceConfidence: 0.9,
    governedCandidates: [govCand],
    allowedMemories: [govCand],
    suppressedMemories: [],
    privacyBlocks: [],
    directives: [],
    conflicts: [],
    sanitizedMemoryContext: "User prefers Bangla",
  };

  const result = responseAdaptationEngine.evaluate({
    message: "Explain in English please",
    context: createDummyContext(),
    intent: createDummyIntent(),
    governanceAnalysis: govAnalysis,
  });

  assert(result.language === "ENGLISH", `Expected ENGLISH, got ${result.language}`);
  assert(result.styleProfile.language.winningLayer === "CURRENT_TURN_EXPLICIT", "Current turn must win");
  assert(result.appliedOverrides.some((o) => o.dimension === "language" && o.overrode === "CONFIRMED_PREFERENCE"), "Override must be logged");
});

// 3. Explicit Banglish command
runTest("Explicit Current-Turn: Banglish Language Request", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "Banglish e bolo ami bujhte chai",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.language === "BANGLISH", `Expected BANGLISH, got ${result.language}`);
  assert(result.adaptationDirectives.some((d) => d.includes("Banglish")), "Directives should specify Banglish");
});

// 4. Bangla Unicode Script Auto-detection
runTest("Bangla Unicode Script Detection", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "জাভাস্ক্রিপ্ট কিভাবে কাজ করে?",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.language === "BANGLA", `Expected BANGLA from script, got ${result.language}`);
  assert(result.styleProfile.language.winningSource.includes("SCRIPT_DETECTION"), "Source must indicate script detection");
});

// 5. Extreme Concise Verbosity (1 sentence)
runTest("Explicit Current-Turn: Extreme Concise (1 sentence)", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "Answer in 1 sentence: what is Docker?",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.verbosity === "EXTREME_CONCISE", `Expected EXTREME_CONCISE, got ${result.verbosity}`);
  assert(result.adaptationDirectives.some((d) => d.includes("exactly one concise sentence")), "Directive must state single sentence");
});

// 6. Concise Verbosity (brief/short)
runTest("Explicit Current-Turn: Concise Verbosity", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "Give me a brief summary of TypeScript",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.verbosity === "CONCISE", `Expected CONCISE, got ${result.verbosity}`);
  assert(result.adaptationDirectives.some((d) => d.includes("brief, direct")), "Directive should specify brief");
});

// 7. Detailed Verbosity
runTest("Explicit Current-Turn: Detailed Verbosity", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "Explain Kubernetes in detail with step-by-step breakdown",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.verbosity === "DETAILED", `Expected DETAILED, got ${result.verbosity}`);
  assert(result.adaptationDirectives.some((d) => d.includes("comprehensive")), "Directive should state comprehensive");
});

// 8. Casual Tone Request
runTest("Explicit Current-Turn: Casual Tone", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "Give me a casual friendly chat about gaming",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.tone === "CASUAL", `Expected CASUAL, got ${result.tone}`);
  assert(result.adaptationDirectives.some((d) => d.includes("relaxed, friendly")), "Tone directive must match");
});

// 9. Professional Tone Request
runTest("Explicit Current-Turn: Professional Tone", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "Draft this with a professional corporate tone",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.tone === "PROFESSIONAL", `Expected PROFESSIONAL, got ${result.tone}`);
});

// 10. Technical Tone Request
runTest("Explicit Current-Turn: Technical Tone", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "Explain this in dev mode with strict technical terminology",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.tone === "TECHNICAL", `Expected TECHNICAL, got ${result.tone}`);
  assert(result.adaptationDirectives.some((d) => d.includes("technical terminology")), "Technical directive should be present");
});

// 11. Academic Tone Request
runTest("Explicit Current-Turn: Academic Tone", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "Provide an academic scholarly evaluation of quantum computing",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.tone === "ACADEMIC", `Expected ACADEMIC, got ${result.tone}`);
});

// 12. Warm & Friendly Tone Request
runTest("Explicit Current-Turn: Warm Friendly Tone", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "I feel overwhelmed, give me some warm and supportive advice",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.tone === "WARM_FRIENDLY", `Expected WARM_FRIENDLY, got ${result.tone}`);
  assert(result.adaptationDirectives.some((d) => d.includes("empathetic, warm")), "Warm tone directive must match");
});

// 13. Direct Tone Request
runTest("Explicit Current-Turn: Direct Tone", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "Be direct, no fluff, straight to the point",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.tone === "DIRECT", `Expected DIRECT, got ${result.tone}`);
});

// 14. Bullet Points Format
runTest("Explicit Current-Turn: Bullet Points Format", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "List the benefits of Vite using bullet points",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.formatStyle === "BULLET_POINTS", `Expected BULLET_POINTS, got ${result.formatStyle}`);
  assert(result.adaptationDirectives.some((d) => d.includes("bulleted list")), "Format directive should state bulleted list");
});

// 15. Numbered List Format
runTest("Explicit Current-Turn: Numbered List Format", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "Give me a numbered list of top databases",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.formatStyle === "NUMBERED_LIST", `Expected NUMBERED_LIST, got ${result.formatStyle}`);
});

// 16. Step-by-Step Format
runTest("Explicit Current-Turn: Step-by-Step Format", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "Show me a step by step walkthrough to deploy this app",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.formatStyle === "STEP_BY_STEP", `Expected STEP_BY_STEP, got ${result.formatStyle}`);
  assert(result.adaptationDirectives.some((d) => d.includes("sequential numbered steps")), "Directive should state sequential steps");
});

// 17. Table Format
runTest("Explicit Current-Turn: Table Format", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "Compare SQL and NoSQL in a table format",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.formatStyle === "TABLE", `Expected TABLE, got ${result.formatStyle}`);
  assert(result.adaptationDirectives.some((d) => d.includes("Markdown table")), "Directive should mention Markdown table");
});

// 18. Code Only Format
runTest("Explicit Current-Turn: Code Only Format", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "Give me code only for binary search",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.formatStyle === "CODE_ONLY", `Expected CODE_ONLY, got ${result.formatStyle}`);
  assert(result.codeDensity === "CODE_ONLY", `Expected CODE_ONLY code density, got ${result.codeDensity}`);
});

// 19. Prose Format
runTest("Explicit Current-Turn: Prose Paragraphs Format", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "Write an essay format in paragraphs about history",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.formatStyle === "PROSE", `Expected PROSE, got ${result.formatStyle}`);
});

// 20. Code Density: None
runTest("Explicit Current-Turn: No Code Request", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "Explain recursion with no code, just conceptual logic",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.codeDensity === "NONE", `Expected NONE, got ${result.codeDensity}`);
  assert(result.adaptationDirectives.some((d) => d.includes("Do not include code blocks")), "Code directive should forbid code blocks");
});

// 21. Code Density: Code Focused
runTest("Explicit Current-Turn: Code Focused Request", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "Show complete code implementation for this Express server",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.codeDensity === "CODE_FOCUSED", `Expected CODE_FOCUSED, got ${result.codeDensity}`);
  assert(result.adaptationDirectives.some((d) => d.includes("Prioritize clean, production-ready code")), "Directive should prioritize code");
});

// 22. Explanation Depth: Beginner (ELI5)
runTest("Explicit Current-Turn: Beginner Depth (ELI5)", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "Explain like I'm 5 how the internet works",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.explanationDepth === "BEGINNER", `Expected BEGINNER, got ${result.explanationDepth}`);
  assert(result.adaptationDirectives.some((d) => d.includes("ELI5")), "Directive should include ELI5 guidance");
});

// 23. Explanation Depth: Expert / Advanced
runTest("Explicit Current-Turn: Expert Level Depth", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "Explain Postgres MVCC under the hood at an expert level",
    context: createDummyContext(),
    intent: createDummyIntent(),
  });
  assert(result.explanationDepth === "EXPERT", `Expected EXPERT, got ${result.explanationDepth}`);
  assert(result.adaptationDirectives.some((d) => d.includes("expert-level")), "Directive should target expert depth");
});

// 24. Precedence: Current Turn Instruction strictly overrides Confirmed Adaptive Pattern
runTest("Precedence: Current-Turn Instruction Overrides Confirmed Adaptive Pattern", () => {
  const pattern: LearningPattern = {
    id: "pat_verb_1",
    userId: "user1",
    patternType: "INTERACTION_STYLE",
    category: "verbosity",
    key: "preferred_verbosity",
    value: "concise",
    status: "CONFIRMED",
    confidence: 0.95,
    reinforcementCount: 5,
    independentEvidenceCount: 4,
    firstObservedAt: 1000,
    lastObservedAt: 2000,
    evidence: [],
    source: "HISTORICAL_INTERACTIONS",
  };

  const adaptiveLearning: LearningAnalysis = {
    userId: "user1",
    patterns: [pattern],
    activeDirectives: ["[ADAPTIVE: User prefers concise answers]"],
    decisions: [],
    profile: {
      userId: "user1",
      interactionPreferences: [],
      taskPatterns: [],
      domainInterests: [],
      preferences: {
        confirmedPreferences: [pattern],
        candidatePreferences: [],
      },
      lastUpdatedAt: 2000,
    },
    diagnostics: {
      totalSignalsProcessed: 5,
      sensitiveSignalsBlocked: 0,
      candidatesCreated: 0,
      patternsReinforced: 1,
      patternsPromoted: 0,
      patternsDemoted: 0,
      conflictsDetected: 0,
      currentTurnOverrides: [],
    },
    currentTurnOverrideApplied: false,
  };

  const result = responseAdaptationEngine.evaluate({
    message: "Explain microservices in detail with step-by-step breakdown",
    context: createDummyContext(),
    intent: createDummyIntent(),
    adaptiveLearning,
  });

  assert(result.verbosity === "DETAILED", `Expected DETAILED, got ${result.verbosity}`);
  assert(result.styleProfile.verbosity.winningLayer === "CURRENT_TURN_EXPLICIT", "Current turn must win");
  assert(result.appliedOverrides.some((o) => o.dimension === "verbosity" && o.overrode === "CONFIRMED_ADAPTIVE"), "Override of adaptive pattern must be recorded");
});

// 25. Precedence: Hard Context Constraint overrides Confirmed Preference
runTest("Precedence: Hard Constraint overrides Confirmed Preference", () => {
  const ctx = createDummyContext();
  ctx.constraints.push({
    id: "const_1",
    category: "other",
    key: "format",
    value: "bullet_points",
    rawText: "format: bullet_points",
    createdAt: 1000,
    updatedAt: 1000,
    updatedAtTurn: 1,
  });

  const govCand: MemoryGovernanceCandidate = {
    memoryId: "mem_form_1",
    key: "preferred_format",
    value: "prose",
    type: "PREFERENCE",
    source: "EXPLICIT_USER",
    status: "ACTIVE",
    usageDecision: "ALLOW",
    usageScore: 0.9,
    confidence: 0.9,
    relevance: 0.9,
    reasons: ["ACTIVE_USER_PREFERENCE"],
    canAffectResponseContent: true,
    canPersonalize: true,
    canSupportFactualClaim: false,
    requiresExplicitAttribution: false,
    isCandidateInferred: false,
  };

  const govAnalysis: MemoryGovernanceAnalysis = {
    governanceRequired: true,
    memoryInfluenceAllowed: true,
    cautiousMemories: [],
    internalOnlyMemories: [],
    topicIsolationApplied: false,
    explicitReferenceDetected: false,
    governanceConfidence: 0.9,
    governedCandidates: [govCand],
    allowedMemories: [govCand],
    suppressedMemories: [],
    privacyBlocks: [],
    directives: [],
    conflicts: [],
    sanitizedMemoryContext: "User prefers prose",
  };

  const result = responseAdaptationEngine.evaluate({
    message: "Summarize the project status",
    context: ctx,
    intent: createDummyIntent(),
    governanceAnalysis: govAnalysis,
  });

  assert(result.formatStyle === "BULLET_POINTS", `Expected BULLET_POINTS, got ${result.formatStyle}`);
  assert(result.styleProfile.formatStyle.winningLayer === "HARD_CONSTRAINT", "Hard constraint must win over preference");
});

// 26. Precedence: User Correction Negation overrides Format
runTest("Precedence: User Correction Negation overrides Format", () => {
  const result = responseAdaptationEngine.evaluate({
    message: "Don't use bullet points, write in paragraphs instead",
    context: createDummyContext(),
    intent: createDummyIntent("CORRECTION"),
  });

  assert(result.formatStyle === "PROSE", `Expected PROSE, got ${result.formatStyle}`);
  assert(
    result.styleProfile.formatStyle.winningLayer === "CURRENT_TURN_EXPLICIT" ||
    result.styleProfile.formatStyle.winningLayer === "CORRECTION_NEGATION",
    "Correction or explicit instruction must win"
  );
});

// 27. Sensitive Data Interception & Suppression
runTest("Sensitive Data Interception: Passwords and API keys suppressed", () => {
  const govCand: MemoryGovernanceCandidate = {
    memoryId: "mem_sens_1",
    key: "api_key",
    value: "sk-proj-9999888877776666",
    type: "PERSONALIZATION",
    source: "EXPLICIT_USER",
    status: "ACTIVE",
    usageDecision: "ALLOW",
    usageScore: 0.9,
    confidence: 0.9,
    relevance: 0.9,
    reasons: ["ACTIVE_USER_PREFERENCE"],
    canAffectResponseContent: true,
    canPersonalize: true,
    canSupportFactualClaim: false,
    requiresExplicitAttribution: false,
    isCandidateInferred: false,
  };

  const govAnalysis: MemoryGovernanceAnalysis = {
    governanceRequired: true,
    memoryInfluenceAllowed: true,
    cautiousMemories: [],
    internalOnlyMemories: [],
    topicIsolationApplied: false,
    explicitReferenceDetected: false,
    governanceConfidence: 0.9,
    governedCandidates: [govCand],
    allowedMemories: [govCand],
    suppressedMemories: [],
    privacyBlocks: [],
    directives: [],
    conflicts: [],
    sanitizedMemoryContext: "",
  };

  const result = responseAdaptationEngine.evaluate({
    message: "What is my tech profile?",
    context: createDummyContext(),
    intent: createDummyIntent(),
    governanceAnalysis: govAnalysis,
  });

  assert(result.safetyStatus === "SENSITIVE_SUPPRESSED", "Safety status must be SENSITIVE_SUPPRESSED");
  assert(result.diagnostics.sensitiveBlockedCount > 0, "Sensitive count must be > 0");
  assert(!result.sanitizedPersonalizationContext.some((c) => c.key === "api_key"), "API key must not be in personalization context");
  assert(!result.adaptationDirectives.some((d) => d.includes("sk-proj")), "Directives must not leak key");
});

// 28. Memory Governance Compliance: Suppressed Memory Ignored
runTest("Memory Governance Compliance: Suppressed memory not used for style", () => {
  const govCand: MemoryGovernanceCandidate = {
    memoryId: "mem_supp_1",
    key: "preferred_language",
    value: "Bangla",
    type: "PREFERENCE",
    source: "EXPLICIT_USER",
    status: "ACTIVE",
    usageDecision: "SUPPRESS",
    usageScore: 0.2,
    confidence: 0.3,
    relevance: 0.2,
    reasons: ["UNVERIFIED_CLAIM"],
    canAffectResponseContent: false,
    canPersonalize: false,
    canSupportFactualClaim: false,
    requiresExplicitAttribution: false,
    isCandidateInferred: true,
  };

  const govAnalysis: MemoryGovernanceAnalysis = {
    governanceRequired: true,
    memoryInfluenceAllowed: false,
    cautiousMemories: [],
    internalOnlyMemories: [],
    topicIsolationApplied: false,
    explicitReferenceDetected: false,
    governanceConfidence: 0.3,
    governedCandidates: [govCand],
    allowedMemories: [],
    suppressedMemories: [govCand],
    privacyBlocks: [],
    directives: [],
    conflicts: [],
    sanitizedMemoryContext: "",
  };

  const result = responseAdaptationEngine.evaluate({
    message: "Explain recursion",
    context: createDummyContext(),
    intent: createDummyIntent(),
    governanceAnalysis: govAnalysis,
  });

  assert(result.language === "ENGLISH", `Expected ENGLISH default because Bangla memory was suppressed, got ${result.language}`);
});

// 29. Truth Calibration & Verification Caution
runTest("Verification Calibration: Low confidence injects caution directive", () => {
  const verification: VerificationAnalysis = {
    verificationRequired: true,
    verificationStatus: "FAILED",
    factualClaims: [],
    supportedClaims: [],
    unsupportedClaims: [],
    assumptions: [],
    missingEvidence: ["Unverified live data"],
    evidenceQuality: "LOW",
    evidenceAssessment: {
      requiredEvidence: [],
      availableEvidence: [],
      missingEvidence: ["Unverified live data"],
      evidenceQuality: "LOW",
      isEvidenceComplete: false,
    },
    contradictions: [],
    correctionActions: [],
    correctionIterations: 1,
    consistencyChecks: {
      isInternallyConsistent: true,
      isPlanAligned: true,
      isIntentAligned: true,
      isContextIsolated: true,
      details: [],
    },
    confidenceScore: 0.45,
    selfCorrectionRequired: false,
    intentAlignment: true,
    recommendationValidity: false,
    confidence: {
      rawScore: 0.4,
      calibratedScore: 0.45,
      confidenceBand: "LOW_CONFIDENCE",
      factors: [],
    },
    constraintCompliance: {
      hardConstraintsSatisfied: true,
      softPreferencesSatisfied: true,
      violatedHardConstraints: [],
      violatedSoftConstraints: [],
    },
    requiresClarification: false,
    clarificationReason: "Live data unverified",
    directives: ["[CAUTION: Low verification score]"],
  };

  const result = responseAdaptationEngine.evaluate({
    message: "What is the live gold price?",
    context: createDummyContext(),
    intent: createDummyIntent(),
    verification,
  });

  assert(result.styleProfile.cautionRequired === true, "Caution must be required");
  assert(result.adaptationDirectives.some((d) => d.includes("CAUTION_DIRECTIVE")), "Directives must contain caution directive");
});

// 30. Predictive Context Suggestion when no explicit override
runTest("Predictive Context Suggestion works as low-priority fallback", () => {
  const predCand: ProactiveContextCandidate = {
    id: "pred_lang_1",
    source: "USER_MODEL",
    predictionType: "PREFERENCE_RELEVANT",
    relevance: 0.85,
    confidence: 0.85,
    topic: "language",
    reasonCategory: "USER_HISTORY",
    expiresAt: 50000,
    isSafeToInject: true,
    requiresConfirmation: false,
    contextSummary: "Bangla",
  };

  const predictiveContext: PredictiveContextAnalysis = {
    predictions: ["PREFERENCE_RELEVANT"],
    acceptedCandidates: [predCand],
    rejectedCandidates: [],
    suppressionReasons: [],
    confidence: 0.85,
    directives: [],
    requiresConfirmation: false,
    analysisStatus: "SUCCESS",
    diagnostics: { signalsEvaluated: 1, candidatesGenerated: 1, candidatesAccepted: 1, candidatesRejected: 0, reasons: [] },
  };

  const result = responseAdaptationEngine.evaluate({
    message: "What is photosynthesis?",
    context: createDummyContext(),
    intent: createDummyIntent(),
    predictiveContext,
  });

  assert(result.language === "BANGLA", `Expected BANGLA from predictive candidate, got ${result.language}`);
  assert(result.styleProfile.language.winningLayer === "PREDICTIVE_CONTEXT", "Winning layer must be PREDICTIVE_CONTEXT");
});

// 31. Directives do not leak internal metadata (IDs, hashes, floats)
runTest("Metadata Security: Directives never leak internal IDs, hashes, or floats", () => {
  const govCand: MemoryGovernanceCandidate = {
    memoryId: "mem_internal_999",
    key: "tech_stack",
    value: "React, TypeScript",
    type: "PREFERENCE",
    source: "EXPLICIT_USER",
    status: "ACTIVE",
    usageDecision: "ALLOW",
    usageScore: 0.876543,
    confidence: 0.94123,
    relevance: 0.88776,
    reasons: ["ACTIVE_USER_PREFERENCE"],
    canAffectResponseContent: true,
    canPersonalize: true,
    canSupportFactualClaim: false,
    requiresExplicitAttribution: false,
    isCandidateInferred: false,
  };

  const govAnalysis: MemoryGovernanceAnalysis = {
    governanceRequired: true,
    memoryInfluenceAllowed: true,
    cautiousMemories: [],
    internalOnlyMemories: [],
    topicIsolationApplied: false,
    explicitReferenceDetected: false,
    governanceConfidence: 0.9,
    governedCandidates: [govCand],
    allowedMemories: [govCand],
    suppressedMemories: [],
    privacyBlocks: [],
    directives: [],
    conflicts: [],
    sanitizedMemoryContext: "User works with React, TypeScript",
  };

  const result = responseAdaptationEngine.evaluate({
    message: "Help me write a web component",
    context: createDummyContext(),
    intent: createDummyIntent(),
    governanceAnalysis: govAnalysis,
  });

  for (const d of result.adaptationDirectives) {
    assert(!d.includes("mem_internal_999"), "Directive must not contain memory ID");
    assert(!d.includes("0.876543"), "Directive must not contain float confidence/score");
    assert(!d.includes("0.94123"), "Directive must not contain float score");
  }
});

// 32. BrainEngine Integration Downstream Test
runTest("BrainEngine Integration: Response adaptation is generated downstream", () => {
  const analysis = brainEngine.analyze("Banglay bolo in 1 sentence what is React?");
  assert(analysis.responseAdaptationAnalysis !== undefined, "BrainAnalysis must include responseAdaptationAnalysis");
  assert(analysis.responseAdaptationAnalysis?.language === "BANGLA", `Expected BANGLA, got ${analysis.responseAdaptationAnalysis?.language}`);
  assert(analysis.responseAdaptationAnalysis?.verbosity === "EXTREME_CONCISE", `Expected EXTREME_CONCISE, got ${analysis.responseAdaptationAnalysis?.verbosity}`);
  assert(analysis.promptDirectives.some((d) => d.includes("Bangla")), "Brain prompt directives must include adaptation directives");
});

// 33. BrainEngine Idempotence & Clean Memory Isolation
runTest("BrainEngine Idempotence: No memory corruption across repeated calls", () => {
  const res1 = brainEngine.analyze("Explain GraphQL briefly");
  const res2 = brainEngine.analyze("Explain GraphQL briefly");

  assert(res1.responseAdaptationAnalysis?.verbosity === "CONCISE", "Should be concise");
  assert(res2.responseAdaptationAnalysis?.verbosity === "CONCISE", "Should still be concise");
  assert(res1.responseAdaptationAnalysis?.language === res2.responseAdaptationAnalysis?.language, "Language must match");
});

console.log(`\n=============================================`);
console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log(`=============================================\n`);
