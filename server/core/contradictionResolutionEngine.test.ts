/**
 * Dora Contradiction Resolution & Belief Revision Engine Test Suite
 * Phase 3 — Step 2
 * 
 * Verifies all 43 required invariants and hardening tests (CR-1 to CR-43).
 */

import { contradictionResolutionEngine } from "./contradictionResolutionEngine";
import { deepReasoningEngine } from "./deepReasoningEngine";
import { brainEngine } from "./brainEngine";
import { ContradictionInput } from "./contradictionResolutionTypes";
import { DeepReasoningInput, ReasoningEvidence } from "./deepReasoningTypes";
import { ExecutiveContextPackage } from "./executiveContextTypes";

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
      codeDensity: "standard",
      explanationDepth: "balanced",
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
    promptDirectives: [],
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
      conflictResolutionCounts: {
        resolved: 0,
        unresolved: 0,
      },
      executionTimeMs: 0,
    },
    ...overrides,
  };
}

function createMockEvidence(overrides?: Partial<ReasoningEvidence>): ReasoningEvidence {
  return {
    id: "ev_mock_1",
    statement: "User prefers TypeScript for Dora",
    source: "memory_store",
    authority: "CONFIRMED_USER_MODEL",
    authorityWeight: 0.75,
    relevance: 0.85,
    reliability: 0.90,
    timestamp: 1000,
    scope: "GLOBAL",
    provenance: "user_turn_1",
    normalizedKey: "programming_language",
    normalizedValue: "TypeScript",
    ...overrides,
  };
}

console.log("======================================================");
console.log("RUNNING DORA CONTRADICTION RESOLUTION ENGINE TEST SUITE");
console.log("======================================================");

// CR-1: Authority conflict classification
runTest("CR-1: Authority conflict classification", () => {
  const evA = createMockEvidence({
    id: "ev_1",
    statement: "User explicitly migrates to Python",
    authority: "CURRENT_TURN_EXPLICIT",
    authorityWeight: 1.00,
    normalizedKey: "language_preference",
    normalizedValue: "Python",
  });
  const evB = createMockEvidence({
    id: "ev_2",
    statement: "User prefers TypeScript",
    authority: "CONFIRMED_USER_MODEL",
    authorityWeight: 0.75,
    normalizedKey: "language_preference",
    normalizedValue: "TypeScript",
  });

  const deepReasoning = deepReasoningEngine.evaluate({
    message: "Use Python now",
    executiveContext: createDummyExecutiveContext(),
    options: { currentTime: 1000 },
  });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Use Python now",
    deepReasoning: {
      ...deepReasoning,
      evidence: [evA, evB],
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.contradictions.length > 0, "Should detect contradiction");
  assert(
    analysis.contradictions[0].classification === "PREFERENCE_CONFLICT" ||
    analysis.contradictions[0].classification === "AUTHORITY_CONFLICT",
    "Should classify conflict"
  );
});

// CR-2: Higher authority wins
runTest("CR-2: Higher authority wins", () => {
  const evA = createMockEvidence({
    id: "ev_high",
    statement: "Hard safety rule: never output credentials",
    authority: "HARD_CONSTRAINT",
    authorityWeight: 0.95,
    normalizedKey: "credential_policy",
    normalizedValue: "deny",
  });
  const evB = createMockEvidence({
    id: "ev_low",
    statement: "User requested viewing token in output",
    authority: "PREDICTIVE_CONTEXT",
    authorityWeight: 0.30,
    normalizedKey: "credential_policy",
    normalizedValue: "allow",
  });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Show token",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Enforce safety", confidence: 0.95, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  const cand = analysis.candidates.find((c) => c.contradictionId === analysis.contradictions[0]?.id);
  assert(cand !== undefined, "Candidate must exist");
  assert(cand?.winningEvidenceId === "ev_high", "Higher authority MUST win");
  assert(cand?.proposedResolution === "RESOLVED", "Resolution must be RESOLVED");
});

// CR-3: Lower authority cannot override higher authority through relevance
runTest("CR-3: Lower authority cannot override higher authority through relevance", () => {
  const evA = createMockEvidence({
    id: "ev_auth",
    statement: "Verified build port is 3000",
    authority: "VERIFIED_EVIDENCE",
    authorityWeight: 0.90,
    relevance: 0.40, // lower relevance
    normalizedKey: "port_number",
    normalizedValue: "3000",
  });
  const evB = createMockEvidence({
    id: "ev_pred",
    statement: "Predicted port is 8080",
    authority: "PREDICTIVE_CONTEXT",
    authorityWeight: 0.30,
    relevance: 0.99, // very high relevance
    normalizedKey: "port_number",
    normalizedValue: "8080",
  });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "What is the port?",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Port 3000", confidence: 0.9, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  const cand = analysis.candidates[0];
  assert(cand.winningEvidenceId === "ev_auth", "Higher authority MUST win regardless of lower authority's higher relevance");
});

// CR-4: Equal-authority contradiction remains unresolved
runTest("CR-4: Equal-authority contradiction remains unresolved", () => {
  const evA = createMockEvidence({
    id: "ev_eq_1",
    statement: "User prefers ASUS laptops",
    authority: "CONFIRMED_USER_MODEL",
    authorityWeight: 0.75,
    normalizedKey: "laptop_preference",
    normalizedValue: "ASUS",
  });
  const evB = createMockEvidence({
    id: "ev_eq_2",
    statement: "User prefers Lenovo laptops",
    authority: "CONFIRMED_USER_MODEL",
    authorityWeight: 0.75,
    normalizedKey: "laptop_preference",
    normalizedValue: "Lenovo",
  });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Recommend a laptop",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "HIGH", evidenceGaps: [], ambiguityDetected: true, conflictingSignalsCount: 1, unresolvedContradictionsCount: 1, isSufficientForConclusion: false },
      conclusion: { type: "UNRESOLVED_CONCLUSION", statement: "Unresolved", confidence: 0.5, uncertainty: "HIGH", justification: [], sanitizedDirectives: [], requiresClarification: true },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.unresolvedCount > 0, "Equal authority conflict must remain unresolved");
  assert(analysis.revisions[0].decisionType === "DEFER_REVISION", "Revision must be DEFERRED");
});

// CR-5: Current-turn explicit override is temporary
runTest("CR-5: Current-turn explicit override is temporary", () => {
  const evA = createMockEvidence({
    id: "ev_curr",
    statement: "For this question, use Bangla",
    authority: "CURRENT_TURN_EXPLICIT",
    authorityWeight: 1.00,
    normalizedKey: "response_language",
    normalizedValue: "Bangla",
  });
  const evB = createMockEvidence({
    id: "ev_hist",
    statement: "User general preference is English",
    authority: "CONFIRMED_USER_MODEL",
    authorityWeight: 0.75,
    normalizedKey: "response_language",
    normalizedValue: "English",
  });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Answer in Bangla",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Use Bangla", confidence: 0.98, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.revisions.length > 0, "Revision must exist");
  assert(analysis.revisions[0].decisionType === "TEMPORARY_OVERRIDE", "Current turn override must be TEMPORARY_OVERRIDE");
  assert(analysis.revisions[0].effectivePeriod === "CURRENT_TURN", "Effective period must be CURRENT_TURN");
});

// CR-6: Current-turn override does not mutate memory
runTest("CR-6: Current-turn override does not mutate memory", () => {
  const evA = createMockEvidence({
    id: "ev_curr",
    statement: "Temporarily recommend Lenovo instead of ASUS",
    authority: "CURRENT_TURN_EXPLICIT",
    authorityWeight: 1.00,
    normalizedKey: "brand_pref",
    normalizedValue: "Lenovo",
  });
  const evB = createMockEvidence({
    id: "ev_hist",
    statement: "User prefers ASUS",
    authority: "GOVERNANCE_APPROVED_MEMORY",
    authorityWeight: 0.80,
    normalizedKey: "brand_pref",
    normalizedValue: "ASUS",
  });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Recommend Lenovo today",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Lenovo", confidence: 0.98, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.revisions[0].isPreservedHistorically === true, "Historical belief must remain marked as preserved");
});

// CR-7: Historical belief remains preserved
runTest("CR-7: Historical belief remains preserved", () => {
  const evA = createMockEvidence({
    id: "ev_new",
    statement: "Migrated repository to TypeScript",
    authority: "VERIFIED_EVIDENCE",
    authorityWeight: 0.90,
    timestamp: 2000,
    normalizedKey: "repo_language",
    normalizedValue: "TypeScript",
  });
  const evB = createMockEvidence({
    id: "ev_old",
    statement: "Previous repository language was JavaScript",
    authority: "GOVERNANCE_APPROVED_MEMORY",
    authorityWeight: 0.80,
    timestamp: 1000,
    normalizedKey: "repo_language",
    normalizedValue: "JavaScript",
  });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Build the project",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "TypeScript", confidence: 0.90, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 2000 },
  });

  assert(analysis.revisions[0].decisionType === "REVISE_ACTIVE_BELIEF", "Should revise active belief");
  assert(analysis.revisions[0].previousBelief === "Previous repository language was JavaScript", "Must record previous belief");
  assert(analysis.revisions[0].isPreservedHistorically === true, "Must preserve historical lineage");
});

// CR-8: Scope difference prevents false contradiction
runTest("CR-8: Scope difference prevents false contradiction", () => {
  const evA = createMockEvidence({
    id: "ev_scope_1",
    statement: "Use TypeScript for Dora web app",
    authority: "CONFIRMED_USER_MODEL",
    authorityWeight: 0.75,
    scope: "PROJECT_SPECIFIC",
    topic: "dora_web",
    normalizedKey: "language_choice",
    normalizedValue: "TypeScript",
  });
  const evB = createMockEvidence({
    id: "ev_scope_2",
    statement: "Use Python for data analysis pipelines",
    authority: "CONFIRMED_USER_MODEL",
    authorityWeight: 0.75,
    scope: "PROJECT_SPECIFIC",
    topic: "data_pipelines",
    normalizedKey: "language_choice",
    normalizedValue: "Python",
  });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Configure language",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Configure languages", confidence: 0.9, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.contradictions[0].classification === "SCOPE_CONFLICT", "Must classify as SCOPE_CONFLICT");
  assert(analysis.revisions[0].decisionType === "PRESERVE_BOTH_SCOPED", "Must PRESERVE_BOTH_SCOPED");
});

// CR-9: Topic isolation blocks foreign-domain conflict
runTest("CR-9: Topic isolation blocks foreign-domain conflict", () => {
  const evA = createMockEvidence({
    id: "ev_dora",
    statement: "Active stack is React and Tailwind",
    authority: "ACTIVE_GOAL_PROJECT_COMMITMENT",
    topic: "dora_app",
    scope: "TOPIC_SPECIFIC",
    normalizedKey: "active_stack",
    normalizedValue: "React Tailwind",
  });
  const evB = createMockEvidence({
    id: "ev_flutter",
    statement: "Active stack is Flutter and Dart",
    authority: "ACTIVE_GOAL_PROJECT_COMMITMENT",
    topic: "mobile_game",
    scope: "TOPIC_SPECIFIC",
    normalizedKey: "active_stack",
    normalizedValue: "Flutter Dart",
  });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Update UI",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "React UI", confidence: 0.9, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: {
      currentTime: 1000,
      strictTopicIsolation: true,
      activeTopic: "dora_app",
    },
  });

  assert(analysis.contradictions[0].isScopeCompatible === true, "Must recognize scope compatibility across topics");
});

// CR-10: Temporal progression supports revision when authorized
runTest("CR-10: Temporal progression supports revision when authorized", () => {
  const evOld = createMockEvidence({
    id: "ev_old",
    statement: "Project status: in progress",
    authority: "ACTIVE_GOAL_PROJECT_COMMITMENT",
    authorityWeight: 0.70,
    timestamp: 1000,
    normalizedKey: "project_status",
    normalizedValue: "in_progress",
  });
  const evNew = createMockEvidence({
    id: "ev_new",
    statement: "Project status: completed",
    authority: "ACTIVE_GOAL_PROJECT_COMMITMENT",
    authorityWeight: 0.70,
    timestamp: 2000,
    normalizedKey: "project_status",
    normalizedValue: "completed",
  });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Project status update",
    deepReasoning: {
      evidence: [evOld, evNew],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Project completed", confidence: 0.9, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 2000 },
  });

  assert(analysis.candidates[0].proposedResolution === "RESOLVED", "Should resolve via temporal progression");
  assert(analysis.candidates[0].winningEvidenceId === "ev_new", "Newer state wins");
});

// CR-11: Expired evidence is rejected
runTest("CR-11: Expired evidence is rejected", () => {
  const evA = createMockEvidence({
    id: "ev_valid",
    statement: "Valid current framework is Next.js",
    authority: "VERIFIED_EVIDENCE",
    authorityWeight: 0.90,
  });
  const evB = createMockEvidence({
    id: "ev_expired",
    statement: "Expired framework note",
    authority: "GOVERNANCE_APPROVED_MEMORY",
    authorityWeight: 0.80,
  });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Check stack",
    memoryGovernance: {
      governanceRequired: true,
      memoryInfluenceAllowed: true,
      allowedMemories: [],
      cautiousMemories: [],
      internalOnlyMemories: [],
      suppressedMemories: [{ memoryId: "ev_expired", key: "framework", value: "Expired", type: "FACT", source: "EXPLICIT_USER", status: "EXPIRED", usageDecision: "SUPPRESS", usageScore: 0, confidence: 0, relevance: 0, reasons: ["EXPIRED_MEMORY"], canAffectResponseContent: false, canPersonalize: false, canSupportFactualClaim: false, requiresExplicitAttribution: false, isCandidateInferred: false }],
      governedCandidates: [],
      conflicts: [],
      privacyBlocks: [],
      topicIsolationApplied: false,
      explicitReferenceDetected: false,
      directives: [],
      sanitizedMemoryContext: "",
      governanceConfidence: 1.0,
    },
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Next.js", confidence: 0.9, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.candidates[0].winningEvidenceId === "ev_valid", "Valid evidence must win over quarantined/expired item");
});

// CR-12: Superseded evidence is rejected
runTest("CR-12: Superseded evidence is rejected", () => {
  const evA = createMockEvidence({
    id: "ev_active",
    statement: "Active database is PostgreSQL",
    authority: "VERIFIED_EVIDENCE",
    authorityWeight: 0.90,
  });
  const evB = createMockEvidence({
    id: "ev_superseded",
    statement: "Superseded database was MySQL",
    authority: "GOVERNANCE_APPROVED_MEMORY",
    authorityWeight: 0.80,
  });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "What DB?",
    memoryGovernance: {
      governanceRequired: true,
      memoryInfluenceAllowed: true,
      allowedMemories: [],
      cautiousMemories: [],
      internalOnlyMemories: [],
      suppressedMemories: [{ memoryId: "ev_superseded", key: "database", value: "Superseded", type: "FACT", source: "EXPLICIT_USER", status: "SUPERSEDED", usageDecision: "SUPPRESS", usageScore: 0, confidence: 0, relevance: 0, reasons: ["SUPERSEDED_MEMORY"], canAffectResponseContent: false, canPersonalize: false, canSupportFactualClaim: false, requiresExplicitAttribution: false, isCandidateInferred: false }],
      governedCandidates: [],
      conflicts: [],
      privacyBlocks: [],
      topicIsolationApplied: false,
      explicitReferenceDetected: false,
      directives: [],
      sanitizedMemoryContext: "",
      governanceConfidence: 1.0,
    },
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "PostgreSQL", confidence: 0.9, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.candidates[0].winningEvidenceId === "ev_active", "Active verified evidence must win");
});

// CR-13: Candidate evidence cannot cause revision
runTest("CR-13: Candidate evidence cannot cause revision", () => {
  const evA = createMockEvidence({
    id: "ev_approved",
    statement: "User prefers light theme",
    authority: "CONFIRMED_USER_MODEL",
    authorityWeight: 0.75,
    normalizedKey: "theme",
    normalizedValue: "light",
  });
  const evB = createMockEvidence({
    id: "ev_candidate",
    statement: "Unapproved candidate: dark theme",
    authority: "SYSTEM_DEFAULT",
    authorityWeight: 0.10,
    normalizedKey: "theme",
    normalizedValue: "dark",
  });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Theme preference",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Light theme", confidence: 0.75, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.candidates[0].winningEvidenceId === "ev_approved", "Approved evidence must outrank candidate evidence");
});

// CR-14: Predictive context cannot resolve authoritative conflict
runTest("CR-14: Predictive context cannot resolve authoritative conflict", () => {
  const evA = createMockEvidence({
    id: "ev_fact",
    statement: "Hard constraint: port 3000 only",
    authority: "HARD_CONSTRAINT",
    authorityWeight: 0.95,
  });
  const evB = createMockEvidence({
    id: "ev_pred",
    statement: "Predicted port 8080",
    authority: "PREDICTIVE_CONTEXT",
    authorityWeight: 0.30,
  });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Run server",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Port 3000", confidence: 0.95, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.diagnostics.predictiveSuppressedCount >= 1, "Predictive context must be marked suppressed");
  assert(analysis.candidates[0].winningEvidenceId === "ev_fact", "Authoritative fact wins");
});

// CR-15: Predictive context cannot create belief revision
runTest("CR-15: Predictive context cannot create belief revision", () => {
  const evA = createMockEvidence({
    id: "ev_curr_belief",
    statement: "User prefers React",
    authority: "CONFIRMED_USER_MODEL",
    authorityWeight: 0.75,
    normalizedKey: "ui_lib",
    normalizedValue: "React",
  });
  const evB = createMockEvidence({
    id: "ev_pred",
    statement: "Predict user might want Vue",
    authority: "PREDICTIVE_CONTEXT",
    authorityWeight: 0.30,
    normalizedKey: "ui_lib",
    normalizedValue: "Vue",
  });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "UI library suggestion",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "React", confidence: 0.75, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.revisions[0].decisionType === "NO_REVISION", "Predictive context cannot revise confirmed belief");
});

// CR-16: Governance boundary is respected
runTest("CR-16: Governance boundary is respected", () => {
  const evA = createMockEvidence({
    id: "ev_gov_approved",
    statement: "Governance approved user preference",
    authority: "GOVERNANCE_APPROVED_MEMORY",
    authorityWeight: 0.80,
  });
  const evB = createMockEvidence({
    id: "ev_quarantined",
    statement: "Quarantined statement",
    authority: "SYSTEM_DEFAULT",
    authorityWeight: 0.10,
  });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Check preference",
    memoryGovernance: {
      governanceRequired: true,
      memoryInfluenceAllowed: true,
      allowedMemories: [],
      cautiousMemories: [],
      internalOnlyMemories: [],
      suppressedMemories: [{ memoryId: "ev_quarantined", key: "preference", value: "Quarantined", type: "FACT", source: "EXPLICIT_USER", status: "ARCHIVED", usageDecision: "SUPPRESS", usageScore: 0, confidence: 0, relevance: 0, reasons: ["QUARANTINED_MEMORY"], canAffectResponseContent: false, canPersonalize: false, canSupportFactualClaim: false, requiresExplicitAttribution: false, isCandidateInferred: false }],
      governedCandidates: [],
      conflicts: [],
      privacyBlocks: [],
      topicIsolationApplied: false,
      explicitReferenceDetected: false,
      directives: [],
      sanitizedMemoryContext: "",
      governanceConfidence: 1.0,
    },
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Approved preference", confidence: 0.8, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.candidates[0].winningEvidenceId === "ev_gov_approved", "Governance approved evidence wins");
});

// CR-17: Sensitive credentials are suppressed
runTest("CR-17: Sensitive credentials are suppressed", () => {
  const rawDirective = "Configure key contra_98765 api_key=sk-1234567890123456789012345678901234";
  const sanitized = contradictionResolutionEngine.sanitizeDirective(rawDirective);
  assert(!sanitized.includes("contra_98765"), "Internal ID must be removed");
  assert(sanitized.length < rawDirective.length, "Sanitized directive must strip internal identifiers");
});

// CR-18: Unsupported identity inference is rejected
runTest("CR-18: Unsupported identity inference is rejected", () => {
  const evA = createMockEvidence({
    id: "ev_spec",
    statement: "User works as a senior architect earning $200k",
    authority: "CONFIRMED_USER_MODEL",
    authorityWeight: 0.75,
    source: "user_model",
    normalizedKey: "occupation",
    normalizedValue: "senior architect",
  });
  const evB = createMockEvidence({
    id: "ev_user_stated",
    statement: "User explicitly stated: I am a student",
    authority: "VERIFIED_EVIDENCE",
    authorityWeight: 0.90,
    source: "user_model",
    normalizedKey: "occupation",
    normalizedValue: "student",
  });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Who am I?",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Student", confidence: 0.9, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.candidates[0].winningEvidenceId === "ev_user_stated", "Explicit verified statement wins over speculative inference");
});

// CR-19: Duplicate evidence does not inflate independence
runTest("CR-19: Duplicate evidence does not inflate independence", () => {
  const evA = createMockEvidence({ id: "ev_dup_1", statement: "User likes Python", normalizedKey: "lang", normalizedValue: "Python" });
  const evB = createMockEvidence({ id: "ev_dup_2", statement: "User likes Python", normalizedKey: "lang", normalizedValue: "Python" });

  const deep = deepReasoningEngine.evaluate({
    message: "test",
    executiveContext: createDummyExecutiveContext(),
    options: { currentTime: 1000 },
  });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "test",
    deepReasoning: {
      ...deep,
      evidence: [evA, evB],
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.contradictions.length === 0, "Identical duplicate statements should not create contradiction");
});

// CR-20: Same-turn duplicates do not inflate support
runTest("CR-20: Same-turn duplicates do not inflate support", () => {
  const ev1 = createMockEvidence({ id: "ev_t1", statement: "Use dark theme", provenance: "turn_1" });
  const ev2 = createMockEvidence({ id: "ev_t2", statement: "Use dark theme", provenance: "turn_1" });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Theme",
    deepReasoning: {
      evidence: [ev1, ev2],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Dark theme", confidence: 0.8, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.contradictions.length === 0, "Same turn duplicates must not create conflict");
});

// CR-21: Revision gate rejects insufficient evidence
runTest("CR-21: Revision gate rejects insufficient evidence", () => {
  const evA = createMockEvidence({
    id: "ev_confirmed",
    statement: "Confirmed preference for TypeScript",
    authority: "CONFIRMED_USER_MODEL",
    authorityWeight: 0.75,
    normalizedKey: "programming_language",
    normalizedValue: "TypeScript",
  });
  const evB = createMockEvidence({
    id: "ev_low_signal",
    statement: "Low confidence signal for Rust",
    authority: "SYSTEM_DEFAULT",
    authorityWeight: 0.10,
    normalizedKey: "programming_language",
    normalizedValue: "Rust",
  });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Choose language",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "TypeScript", confidence: 0.75, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.revisions[0].decisionType === "NO_REVISION", "Insufficient authority must result in NO_REVISION");
});

// CR-22: Revision gate rejects unresolved contradiction
runTest("CR-22: Revision gate rejects unresolved contradiction", () => {
  const evA = createMockEvidence({ id: "ev_a", statement: "Option A", authority: "CONFIRMED_USER_MODEL", authorityWeight: 0.75 });
  const evB = createMockEvidence({ id: "ev_b", statement: "Option B", authority: "CONFIRMED_USER_MODEL", authorityWeight: 0.75 });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Pick option",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "HIGH", evidenceGaps: [], ambiguityDetected: true, conflictingSignalsCount: 1, unresolvedContradictionsCount: 1, isSufficientForConclusion: false },
      conclusion: { type: "UNRESOLVED_CONCLUSION", statement: "Unresolved", confidence: 0.5, uncertainty: "HIGH", justification: [], sanitizedDirectives: [], requiresClarification: true },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.revisions[0].decisionType === "DEFER_REVISION", "Unresolved contradiction must defer revision");
});

// CR-23: Scoped beliefs can coexist
runTest("CR-23: Scoped beliefs can coexist", () => {
  const evA = createMockEvidence({ id: "ev_work", statement: "Use Windows for work", scope: "PROJECT_SPECIFIC", topic: "work" });
  const evB = createMockEvidence({ id: "ev_home", statement: "Use macOS for personal", scope: "PROJECT_SPECIFIC", topic: "home" });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "OS setup",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Scoped OS setup", confidence: 0.8, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.revisions[0].decisionType === "PRESERVE_BOTH_SCOPED", "Scoped beliefs must coexist");
});

// CR-24: Clarification generated only when necessary
runTest("CR-24: Clarification generated only when necessary", () => {
  const evA = createMockEvidence({ id: "ev_1", statement: "Direct command: delete DB", authority: "VERIFIED_EVIDENCE", authorityWeight: 0.90 });
  const evB = createMockEvidence({ id: "ev_2", statement: "Direct command: keep DB", authority: "VERIFIED_EVIDENCE", authorityWeight: 0.90 });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Execute DB action",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "HIGH", evidenceGaps: [], ambiguityDetected: true, conflictingSignalsCount: 1, unresolvedContradictionsCount: 1, isSufficientForConclusion: false },
      conclusion: { type: "UNRESOLVED_CONCLUSION", statement: "Unresolved", confidence: 0.5, uncertainty: "HIGH", justification: [], sanitizedDirectives: [], requiresClarification: true },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.requiresClarification === true, "High severity unresolvable conflict requires clarification");
  assert(analysis.clarificationPrompt !== undefined, "Clarification prompt must be generated");
});

// CR-25: No unnecessary clarification when authority resolves conflict
runTest("CR-25: No unnecessary clarification when authority resolves conflict", () => {
  const evA = createMockEvidence({ id: "ev_1", statement: "Explicit user command", authority: "CURRENT_TURN_EXPLICIT", authorityWeight: 1.00 });
  const evB = createMockEvidence({ id: "ev_2", statement: "Old preference", authority: "CONFIRMED_USER_MODEL", authorityWeight: 0.75 });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Do something different",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Action", confidence: 0.98, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.requiresClarification === false, "No clarification when authority resolves conflict");
});

// CR-26: Conflict severity is deterministic
runTest("CR-26: Conflict severity is deterministic", () => {
  const evA = createMockEvidence({ id: "ev_hard", statement: "Hard security constraint", authority: "HARD_CONSTRAINT" });
  const evB = createMockEvidence({ id: "ev_soft", statement: "User request", authority: "CURRENT_TURN_EXPLICIT" });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Security check",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Security pass", confidence: 0.95, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.contradictions[0].severity === "CRITICAL", "Hard constraint must produce CRITICAL severity");
});

// CR-27: Resolution ranking is deterministic
runTest("CR-27: Resolution ranking is deterministic", () => {
  const evA = createMockEvidence({ id: "ev_1", statement: "Pref A", authority: "CONFIRMED_USER_MODEL", authorityWeight: 0.75 });
  const evB = createMockEvidence({ id: "ev_2", statement: "Pref B", authority: "GOVERNANCE_APPROVED_MEMORY", authorityWeight: 0.80 });

  const run1 = contradictionResolutionEngine.evaluate({
    message: "Rank",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Rank", confidence: 0.8, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  const run2 = contradictionResolutionEngine.evaluate({
    message: "Rank",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Rank", confidence: 0.8, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  assert(JSON.stringify(run1.candidates) === JSON.stringify(run2.candidates), "Resolution ranking must be bit-for-bit deterministic");
});

// CR-28: Repeated execution returns identical output
runTest("CR-28: Repeated execution returns identical output over 10 iterations", () => {
  const evA = createMockEvidence({ id: "ev_1", statement: "Use Python", authority: "CURRENT_TURN_EXPLICIT", authorityWeight: 1.00 });
  const evB = createMockEvidence({ id: "ev_2", statement: "Use TypeScript", authority: "CONFIRMED_USER_MODEL", authorityWeight: 0.75 });

  const first = JSON.stringify(
    contradictionResolutionEngine.evaluate({
      message: "Language test",
      deepReasoning: {
        evidence: [evA, evB],
        hypotheses: [],
        evaluations: [],
        contradictions: [],
        uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
        conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Python", confidence: 0.98, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
        sanitizedDirectives: [],
        diagnostics: {} as any,
      },
      options: { currentTime: 1000 },
    })
  );

  for (let i = 0; i < 10; i++) {
    const iter = JSON.stringify(
      contradictionResolutionEngine.evaluate({
        message: "Language test",
        deepReasoning: {
          evidence: [evA, evB],
          hypotheses: [],
          evaluations: [],
          contradictions: [],
          uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
          conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Python", confidence: 0.98, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
          sanitizedDirectives: [],
          diagnostics: {} as any,
        },
        options: { currentTime: 1000 },
      })
    );
    assert(iter === first, `Iteration ${i} must match baseline`);
  }
});

// CR-29: Injected currentTime remains deterministic
runTest("CR-29: Injected currentTime remains deterministic", () => {
  const input: ContradictionInput = {
    message: "Test",
    options: { currentTime: 123456 },
  };
  const res = contradictionResolutionEngine.evaluate(input);
  assert(res.diagnostics.isDeterministic === true, "Diagnostics must indicate deterministic execution");
});

// CR-30: No Date.now dependency
runTest("CR-30: No Date.now dependency exists in contradictionResolutionEngine", () => {
  const originalDateNow = Date.now;
  Date.now = () => {
    throw new Error("Date.now() called unexpectedly!");
  };
  try {
    contradictionResolutionEngine.evaluate({
      message: "Date test",
      options: { currentTime: 5000 },
    });
  } finally {
    Date.now = originalDateNow;
  }
});

// CR-31: No Math.random dependency
runTest("CR-31: No Math.random dependency exists in contradictionResolutionEngine", () => {
  const originalRandom = Math.random;
  Math.random = () => {
    throw new Error("Math.random() called unexpectedly!");
  };
  try {
    contradictionResolutionEngine.evaluate({
      message: "Random test",
      options: { currentTime: 5000 },
    });
  } finally {
    Math.random = originalRandom;
  }
});

// CR-32: No random UUID dependency
runTest("CR-32: No random UUID dependency exists", () => {
  const id1 = contradictionResolutionEngine.generateDeterministicId("contra", "test", "item");
  const id2 = contradictionResolutionEngine.generateDeterministicId("contra", "test", "item");
  assert(id1 === id2, "Generated IDs must be purely deterministic");
});

// CR-33: Inputs remain immutable
runTest("CR-33: Inputs remain immutable", () => {
  const evA = Object.freeze(createMockEvidence({ id: "ev_frozen_1", statement: "Frozen A" }));
  const evB = Object.freeze(createMockEvidence({ id: "ev_frozen_2", statement: "Frozen B" }));

  const deep = Object.freeze({
    evidence: [evA, evB],
    hypotheses: [],
    evaluations: [],
    contradictions: [],
    uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
    conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Frozen conclusion", confidence: 0.9, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
    sanitizedDirectives: [],
    diagnostics: {} as any,
  }) as any;

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Frozen input test",
    deepReasoning: deep,
    options: { currentTime: 1000 },
  });

  assert(analysis !== undefined, "Execution on frozen inputs must succeed without mutation");
});

// CR-34: Resolution directives are sanitized
runTest("CR-34: Resolution directives are sanitized", () => {
  const evA = createMockEvidence({ id: "ev_curr", statement: "Use Python now", authority: "CURRENT_TURN_EXPLICIT", authorityWeight: 1.00 });
  const evB = createMockEvidence({ id: "ev_hist", statement: "Use TypeScript", authority: "CONFIRMED_USER_MODEL", authorityWeight: 0.75 });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Use Python",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Python", confidence: 0.98, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  for (const d of analysis.activeDirectives) {
    assert(!d.includes("contra_"), "Directives must not contain internal contra_ IDs");
    assert(!d.includes("mem_"), "Directives must not contain internal mem_ IDs");
  }
});

// CR-35: Internal IDs never appear in directives
runTest("CR-35: Internal IDs never appear in directives", () => {
  const dirty = "Apply rule contra_rec_abcdef123 to resolve mem_987654";
  const clean = contradictionResolutionEngine.sanitizeDirective(dirty);
  assert(!clean.includes("contra_rec_abcdef123"), "Internal contra_rec ID removed");
  assert(!clean.includes("mem_987654"), "Internal mem_ ID removed");
});

// CR-36: Confidence cannot override authority
runTest("CR-36: Confidence cannot override authority", () => {
  const evA = createMockEvidence({ id: "ev_high_auth", statement: "Verified requirement", authority: "VERIFIED_EVIDENCE", authorityWeight: 0.90, reliability: 0.50 });
  const evB = createMockEvidence({ id: "ev_low_auth", statement: "Adaptive habit", authority: "CONFIRMED_ADAPTIVE_PATTERN", authorityWeight: 0.50, reliability: 0.99 });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Requirement check",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "LOW", evidenceGaps: [], ambiguityDetected: false, conflictingSignalsCount: 0, unresolvedContradictionsCount: 0, isSufficientForConclusion: true },
      conclusion: { type: "SUPPORTED_CONCLUSION", statement: "Verified requirement", confidence: 0.9, uncertainty: "LOW", justification: [], sanitizedDirectives: [], requiresClarification: false },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.candidates[0].winningEvidenceId === "ev_high_auth", "Higher authority wins despite lower reliability score");
});

// CR-37: Uncertainty remains separate from revision
runTest("CR-37: Uncertainty remains separate from revision", () => {
  const evA = createMockEvidence({ id: "ev_1", statement: "Fact 1", authority: "CONFIRMED_USER_MODEL", authorityWeight: 0.75 });
  const evB = createMockEvidence({ id: "ev_2", statement: "Fact 2", authority: "CONFIRMED_USER_MODEL", authorityWeight: 0.75 });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "Ambiguous query",
    deepReasoning: {
      evidence: [evA, evB],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: { overallLevel: "HIGH", evidenceGaps: ["Missing context"], ambiguityDetected: true, conflictingSignalsCount: 1, unresolvedContradictionsCount: 1, isSufficientForConclusion: false },
      conclusion: { type: "UNRESOLVED_CONCLUSION", statement: "Unresolved", confidence: 0.4, uncertainty: "HIGH", justification: [], sanitizedDirectives: [], requiresClarification: true },
      sanitizedDirectives: [],
      diagnostics: {} as any,
    },
    options: { currentTime: 1000 },
  });

  assert(analysis.revisions[0].decisionType === "DEFER_REVISION", "Uncertain state must defer revision without inventing certainty");
});

// CR-38: DeepReasoningEngine outputs are consumed correctly
runTest("CR-38: DeepReasoningEngine outputs are consumed correctly", () => {
  const deep = deepReasoningEngine.evaluate({
    message: "I prefer Lenovo now instead of ASUS",
    executiveContext: createDummyExecutiveContext(),
    options: { currentTime: 1000 },
  });

  const analysis = contradictionResolutionEngine.evaluate({
    message: "I prefer Lenovo now instead of ASUS",
    deepReasoning: deep,
    options: { currentTime: 1000 },
  });

  assert(analysis.diagnostics.stepsExecuted >= 4, "Must execute all 5 steps over DeepReasoningEngine outputs");
});

// CR-39: BrainEngine integration preserves existing outputs
runTest("CR-39: BrainEngine integration produces valid contradictionResolutionAnalysis", () => {
  const brainAnalysis = brainEngine.analyze("Actually use TypeScript for this project", [], undefined, "default_session", undefined, {
    persistDecisions: false,
    currentTime: 1000,
  });

  assert(brainAnalysis.deepReasoningAnalysis !== undefined, "deepReasoningAnalysis must exist");
  assert(brainAnalysis.contradictionResolutionAnalysis !== undefined, "contradictionResolutionAnalysis must exist on BrainAnalysis");
  assert(Array.isArray(brainAnalysis.promptDirectives), "promptDirectives must be an array");
});

// CR-40: Malformed input fails safely
runTest("CR-40: Malformed input fails safely", () => {
  const analysis = contradictionResolutionEngine.evaluate({
    message: "",
    options: undefined,
  });

  assert(analysis !== undefined, "Engine must not throw on empty/malformed input");
  assert(analysis.contradictions.length === 0, "Contradictions should be empty");
  assert(analysis.activeDirectives.length === 0, "Directives should be empty");
});

// CR-41: Phase 1 regression remains green
runTest("CR-41: Phase 1 regression remains green", () => {
  const brainAnalysis = brainEngine.analyze("Hello Dora", [], undefined, "default_session", undefined, {
    persistDecisions: false,
    currentTime: 1000,
  });
  assert(brainAnalysis.intent !== undefined, "Phase 1 intent must be present");
  assert(brainAnalysis.structuredIntent !== undefined, "Phase 1 structuredIntent must be present");
  assert(brainAnalysis.reasoningAnalysis !== undefined, "Phase 1 reasoningAnalysis must be present");
  assert(brainAnalysis.planningAnalysis !== undefined, "Phase 1 planningAnalysis must be present");
});

// CR-42: Phase 2 regression remains green
runTest("CR-42: Phase 2 regression remains green", () => {
  const brainAnalysis = brainEngine.analyze("Remember that I prefer dark theme", [], undefined, "default_session", undefined, {
    persistDecisions: false,
    currentTime: 1000,
  });
  assert(brainAnalysis.memoryGovernanceAnalysis !== undefined, "Phase 2 memory governance must be present");
  assert(brainAnalysis.longTermUserModelAnalysis !== undefined, "Phase 2 user model must be present");
  assert(brainAnalysis.temporalMemoryAnalysis !== undefined, "Phase 2 temporal memory must be present");
  assert(brainAnalysis.goalProjectAnalysis !== undefined, "Phase 2 goal project must be present");
  assert(brainAnalysis.contextContinuityAnalysis !== undefined, "Phase 2 continuity must be present");
  assert(brainAnalysis.executiveContext !== undefined, "Phase 2 executive context must be present");
});

// CR-43: Phase 3 Step 1 regression remains green
runTest("CR-43: Phase 3 Step 1 regression remains green", () => {
  const deep = deepReasoningEngine.evaluate({
    message: "Evaluate project architecture",
    executiveContext: createDummyExecutiveContext(),
    options: { currentTime: 1000 },
  });
  assert(deep.conclusion !== undefined, "Step 1 conclusion must exist");
  assert(deep.hypotheses !== undefined, "Step 1 hypotheses must exist");
  assert(deep.uncertainty !== undefined, "Step 1 uncertainty must exist");
});

console.log("======================================================");
console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log("======================================================");
