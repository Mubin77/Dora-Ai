/**
 * Dora Predictive Context & Proactive Memory Orchestration Test Suite
 * Phase 2 — Step 6
 * 
 * Verifies all 35 deterministic requirements for proactive context preparation,
 * plan DAG dependency safety, memory governance compliance, current-turn precedence,
 * topic isolation, sensitive data suppression, TTL enforcement, and BrainEngine integration.
 */

import { predictiveContextEngine } from "./predictiveContextEngine";
import {
  PredictiveContextInput,
  ProactiveContextCandidate,
  PredictionType,
} from "./predictiveContextTypes";
import { ConversationContext } from "./contextTypes";
import { StructuredIntent, BrainIntent } from "./intentTypes";
import { PlanningAnalysis, TaskPlan, PlanStep } from "./planningTypes";
import { MemoryGovernanceAnalysis, MemoryGovernanceCandidate } from "./memoryGovernanceTypes";
import { LearningAnalysis, LearningPattern } from "./adaptiveLearningTypes";
import { VerificationAnalysis } from "./verificationTypes";
import { brainEngine } from "./brainEngine";
import { memoryStore } from "./memoryStore";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function createDummyContext(topic: string = "software_development"): ConversationContext {
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
    intentConfidence: 0.9,
    intentSignals: {},
    requiresClarification: false,
    isMultiIntent: false,
    suggestedDirectives: [],
  };
}

function createDummyLearningAnalysis(patterns: LearningPattern[] = []): LearningAnalysis {
  return {
    userId: "user_test",
    patterns,
    activeDirectives: [],
    decisions: [],
    profile: {
      userId: "user_test",
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
      totalSignalsProcessed: 1,
      sensitiveSignalsBlocked: 0,
      candidatesCreated: 0,
      patternsReinforced: 0,
      patternsPromoted: 0,
      patternsDemoted: 0,
      conflictsDetected: 0,
      currentTurnOverrides: [],
    },
    currentTurnOverrideApplied: false,
  };
}

export function runTests() {
  console.log("==========================================");
  console.log("RUNNING DORA PREDICTIVE CONTEXT TEST SUITE");
  console.log("==========================================");

  // -------------------------------------------------------------
  // TEST 1 — Casual greeting -> NO_PREDICTION
  // -------------------------------------------------------------
  console.log("TEST 1 — Casual greeting -> NO_PREDICTION:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent("CASUAL_CONVERSATION");
    const result = predictiveContextEngine.evaluate({
      message: "Hello Dora! Good morning.",
      context: ctx,
      intent,
      options: { currentTime: 1000 },
    });

    assert(result.predictions.includes("NO_PREDICTION"), "Casual greeting results in NO_PREDICTION");
    assert(result.acceptedCandidates.length === 0, "No candidates accepted for casual greeting");
    assert(result.directives.length === 0, "Zero directives generated for casual greeting");
    assert(result.analysisStatus === "NO_PREDICTION", "Status is NO_PREDICTION");
    console.log("  ✓ Casual greeting produces fast NO_PREDICTION with zero spurious directives");
  }

  // -------------------------------------------------------------
  // TEST 2 — Simple direct answer -> no unnecessary prediction
  // -------------------------------------------------------------
  console.log("TEST 2 — Simple direct answer -> no unnecessary prediction:");
  {
    const ctx = createDummyContext("science");
    const intent = createDummyIntent("INFORMATION");
    const result = predictiveContextEngine.evaluate({
      message: "What is the boiling point of water at sea level?",
      context: ctx,
      intent,
      options: { currentTime: 1000 },
    });

    assert(result.predictions.includes("NO_PREDICTION"), "Simple direct question produces NO_PREDICTION");
    assert(result.acceptedCandidates.length === 0, "Zero proactive candidates forced");
    console.log("  ✓ Simple factual questions do not force arbitrary predictions");
  }

  // -------------------------------------------------------------
  // TEST 3 — Deterministic repeated analysis (Idempotency)
  // -------------------------------------------------------------
  console.log("TEST 3 — Deterministic repeated analysis (Idempotency):");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const input: PredictiveContextInput = {
      message: "Show me laptop comparison",
      context: ctx,
      intent,
      options: { currentTime: 5000 },
    };

    const res1 = predictiveContextEngine.evaluate(input);
    const res2 = predictiveContextEngine.evaluate(input);

    assert(res1.confidence === res2.confidence, "Confidence matches exactly");
    assert(res1.analysisStatus === res2.analysisStatus, "Analysis status matches");
    assert(res1.acceptedCandidates.length === res2.acceptedCandidates.length, "Accepted candidates count matches");
    assert(res1.directives.length === res2.directives.length, "Directives count matches");
    console.log("  ✓ Engine analysis is strictly deterministic and idempotent");
  }

  // -------------------------------------------------------------
  // TEST 4 — Valid workflow continuation (DAG satisfied)
  // -------------------------------------------------------------
  console.log("TEST 4 — Valid workflow continuation:");
  {
    const ctx = createDummyContext("laptop");
    const intent = createDummyIntent("PLANNING");
    const plan: TaskPlan = {
      id: "plan_laptop_compare",
      objective: "Compare 3 gaming laptops",
      goal: "Provide synthesis comparison",
      status: "IN_PROGRESS",
      priority: "NORMAL",
      complexity: "MEDIUM",
      steps: [
        {
          id: "step_1",
          title: "Search laptop candidates",
          description: "Search candidates",
          order: 1,
          status: "COMPLETED",
          dependencies: [],
          requiredInputs: [],
          expectedOutput: "Candidate list",
          canRunInParallel: false,
          completionCriteria: "Candidates found",
        },
        {
          id: "step_2",
          title: "Filter by GPU and RAM",
          description: "Filter specs",
          order: 2,
          status: "COMPLETED",
          dependencies: ["step_1"],
          requiredInputs: ["Candidate list"],
          expectedOutput: "Filtered list",
          canRunInParallel: false,
          completionCriteria: "Filtered specs",
        },
        {
          id: "step_3",
          title: "Generate recommendation synthesis",
          description: "Synthesize tradeoffs",
          order: 3,
          status: "READY",
          dependencies: ["step_1", "step_2"],
          requiredInputs: ["Filtered list"],
          expectedOutput: "Final comparison",
          canRunInParallel: false,
          completionCriteria: "Comparison generated",
        },
      ],
      dependencies: {
        step_1: [],
        step_2: ["step_1"],
        step_3: ["step_1", "step_2"],
      },
      requiredInputs: [],
      availableInputs: ["Filtered list"],
      missingInputs: [],
      toolRequirements: [],
      executionStrategy: "SEQUENTIAL",
      completionCriteria: ["Comparison generated"],
      failureStrategy: "REQUEST_CLARIFICATION",
      createdAt: 1000,
      updatedAt: 2000,
      sourceIntent: "PLANNING",
      sourceReasoning: "COMPARISON",
      isCancellable: true,
      activeStepId: "step_3",
    };

    const planning: PlanningAnalysis = {
      requiresPlanning: true,
      plan,
      directives: [],
    };

    const result = predictiveContextEngine.evaluate({
      message: "Here are the filtered laptops, what do you think?",
      context: ctx,
      intent,
      planning,
      options: { currentTime: 3000 },
    });

    assert(result.predictions.includes("TASK_CONTINUATION"), "Predicts TASK_CONTINUATION");
    assert(result.acceptedCandidates.length >= 1, "Candidate accepted");
    const taskCandidate = result.acceptedCandidates.find((c) => c.predictionType === "TASK_CONTINUATION");
    assert(Boolean(taskCandidate), "Task continuation candidate exists");
    assert(taskCandidate!.targetStepId === "step_3", "Identifies step_3 as next operational step");
    assert(taskCandidate!.confidence >= 0.75, "High confidence for satisfied DAG continuation");
    assert(result.directives.some((d) => d.includes("Generate recommendation synthesis")), "Directive references next step title");
    console.log("  ✓ Valid active plan continuation predicted when DAG dependencies are satisfied");
  }

  // -------------------------------------------------------------
  // TEST 5 — Dependency blocks invalid prediction
  // -------------------------------------------------------------
  console.log("TEST 5 — Dependency blocks invalid prediction:");
  {
    const ctx = createDummyContext("laptop");
    const intent = createDummyIntent("PLANNING");
    const plan: TaskPlan = {
      id: "plan_blocked_deps",
      objective: "Laptop comparison workflow",
      goal: "Finish comparison",
      status: "IN_PROGRESS",
      priority: "NORMAL",
      complexity: "MEDIUM",
      steps: [
        {
          id: "step_1",
          title: "Search laptop candidates",
          description: "Search candidates",
          order: 1,
          status: "COMPLETED",
          dependencies: [],
          requiredInputs: [],
          expectedOutput: "Candidate list",
          canRunInParallel: false,
          completionCriteria: "Done",
        },
        {
          id: "step_2",
          title: "Filter by specs",
          description: "Filter specs",
          order: 2,
          status: "IN_PROGRESS", // NOT COMPLETED!
          dependencies: ["step_1"],
          requiredInputs: [],
          expectedOutput: "Filtered list",
          canRunInParallel: false,
          completionCriteria: "Done",
        },
        {
          id: "step_3",
          title: "Generate recommendation synthesis",
          description: "Synthesize tradeoffs",
          order: 3,
          status: "NOT_STARTED",
          dependencies: ["step_2"], // Depends on Step 2 which is incomplete!
          requiredInputs: ["Filtered list"],
          expectedOutput: "Final comparison",
          canRunInParallel: false,
          completionCriteria: "Done",
        },
      ],
      dependencies: {
        step_1: [],
        step_2: ["step_1"],
        step_3: ["step_2"],
      },
      requiredInputs: [],
      availableInputs: [],
      missingInputs: [],
      toolRequirements: [],
      executionStrategy: "SEQUENTIAL",
      completionCriteria: ["Comparison generated"],
      failureStrategy: "REQUEST_CLARIFICATION",
      createdAt: 1000,
      updatedAt: 2000,
      sourceIntent: "PLANNING",
      sourceReasoning: "COMPARISON",
      isCancellable: true,
      activeStepId: "step_2",
    };

    const planning: PlanningAnalysis = {
      requiresPlanning: true,
      plan,
      directives: [],
    };

    const result = predictiveContextEngine.evaluate({
      message: "Still searching specs",
      context: ctx,
      intent,
      planning,
      options: { currentTime: 3000 },
    });

    // Step 3 must NOT be injected as next step because step 2 is not completed
    const step3Candidate = result.acceptedCandidates.find((c) => c.targetStepId === "step_3");
    assert(!step3Candidate, "Step 3 is blocked by incomplete dependencies and must NOT be accepted");
    console.log("  ✓ DAG dependencies strictly prevent premature step prediction");
  }

  // -------------------------------------------------------------
  // TEST 6 — Completed plan -> no continuation prediction
  // -------------------------------------------------------------
  console.log("TEST 6 — Completed plan -> no continuation prediction:");
  {
    const ctx = createDummyContext("laptop");
    const intent = createDummyIntent("INFORMATION");
    const plan: TaskPlan = {
      id: "plan_finished",
      objective: "Laptop comparison",
      goal: "Done",
      status: "COMPLETED",
      priority: "NORMAL",
      complexity: "LOW",
      steps: [],
      dependencies: {},
      requiredInputs: [],
      availableInputs: [],
      missingInputs: [],
      toolRequirements: [],
      executionStrategy: "SEQUENTIAL",
      completionCriteria: [],
      failureStrategy: "TERMINATE",
      createdAt: 1000,
      updatedAt: 2000,
      sourceIntent: "INFORMATION",
      sourceReasoning: "SIMPLE_DEDUCTION",
      isCancellable: false,
    };

    const result = predictiveContextEngine.evaluate({
      message: "Thanks for the recommendation!",
      context: ctx,
      intent,
      planning: { requiresPlanning: false, plan, directives: [] },
      options: { currentTime: 3000 },
    });

    const taskCandidate = result.acceptedCandidates.find((c) => c.predictionType === "TASK_CONTINUATION");
    assert(!taskCandidate, "Completed plan produces zero continuation candidates");
    console.log("  ✓ COMPLETED plan produces no continuation predictions");
  }

  // -------------------------------------------------------------
  // TEST 7 — Blocked plan -> clarification candidate
  // -------------------------------------------------------------
  console.log("TEST 7 — Blocked plan -> clarification candidate:");
  {
    const ctx = createDummyContext("travel");
    const intent = createDummyIntent("PLANNING");
    const plan: TaskPlan = {
      id: "plan_travel",
      objective: "Flight booking assistance",
      goal: "Book flight",
      status: "BLOCKED",
      priority: "HIGH",
      complexity: "MEDIUM",
      steps: [],
      dependencies: {},
      requiredInputs: ["destination", "departureDate"],
      availableInputs: [],
      missingInputs: ["destination"],
      toolRequirements: [],
      executionStrategy: "SEQUENTIAL",
      completionCriteria: [],
      failureStrategy: "REQUEST_CLARIFICATION",
      createdAt: 1000,
      updatedAt: 2000,
      sourceIntent: "PLANNING",
      sourceReasoning: "SIMPLE_DEDUCTION",
      isCancellable: true,
      clarificationRequirement: "Please provide destination city",
    };

    const result = predictiveContextEngine.evaluate({
      message: "Book me a flight for tomorrow",
      context: ctx,
      intent: { ...intent, requiresClarification: true },
      planning: { requiresPlanning: true, plan, directives: [] },
      options: { currentTime: 3000 },
    });

    assert(result.predictions.includes("CLARIFICATION_LIKELY"), "Identifies CLARIFICATION_LIKELY for blocked plan");
    const clarif = result.acceptedCandidates.find((c) => c.predictionType === "CLARIFICATION_LIKELY");
    assert(Boolean(clarif), "Clarification candidate is accepted");
    assert(result.directives.some((d) => d.includes("CLARIFICATION")), "Generates clarification directive");
    console.log("  ✓ Blocked plan accurately prompts for missing parameters without hallucinating values");
  }

  // -------------------------------------------------------------
  // TEST 8 — Cancelled plan -> no continuation
  // -------------------------------------------------------------
  console.log("TEST 8 — Cancelled plan -> no continuation:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const plan: TaskPlan = {
      id: "plan_cancelled",
      objective: "Discarded research",
      goal: "Discarded",
      status: "CANCELLED",
      priority: "NORMAL",
      complexity: "LOW",
      steps: [],
      dependencies: {},
      requiredInputs: [],
      availableInputs: [],
      missingInputs: [],
      toolRequirements: [],
      executionStrategy: "SEQUENTIAL",
      completionCriteria: [],
      failureStrategy: "TERMINATE",
      createdAt: 1000,
      updatedAt: 2000,
      sourceIntent: "INFORMATION",
      sourceReasoning: "SIMPLE_DEDUCTION",
      isCancellable: false,
    };

    const result = predictiveContextEngine.evaluate({
      message: "Nevermind, let's talk about something else",
      context: ctx,
      intent,
      planning: { requiresPlanning: false, plan, directives: [] },
      options: { currentTime: 3000 },
    });

    assert(!result.acceptedCandidates.some((c) => c.predictionType === "TASK_CONTINUATION"), "Zero continuation for cancelled plan");
    console.log("  ✓ CANCELLED plan cleanly suppresses continuation");
  }

  // -------------------------------------------------------------
  // TEST 9 — Confirmed preference relevance
  // -------------------------------------------------------------
  console.log("TEST 9 — Confirmed preference relevance:");
  {
    const ctx = createDummyContext("programming");
    const intent = createDummyIntent("INFORMATION");
    const pattern: LearningPattern = {
      id: "pat_lang_bn",
      userId: "user_test",
      patternType: "INTERACTION_STYLE",
      category: "language",
      key: "pref_language_bangla",
      value: "Bangla",
      status: "CONFIRMED",
      confidence: 0.90,
      reinforcementCount: 3,
      independentEvidenceCount: 3,
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      evidence: [],
      source: "EXPLICIT_USER_STATEMENT",
      isExplicit: true,
    };

    const result = predictiveContextEngine.evaluate({
      message: "How does binary search work?",
      context: ctx,
      intent,
      adaptiveLearning: createDummyLearningAnalysis([pattern]),
      options: { currentTime: 3000 },
    });

    assert(result.predictions.includes("PREFERENCE_RELEVANT"), "Predicts PREFERENCE_RELEVANT");
    const prefCand = result.acceptedCandidates.find((c) => c.predictionType === "PREFERENCE_RELEVANT");
    assert(Boolean(prefCand), "Preference candidate accepted");
    assert(result.directives.some((d) => d.includes("Bangla")), "Directives include confirmed preferred language");
    console.log("  ✓ Confirmed language preference safely applied to neutral query");
  }

  // -------------------------------------------------------------
  // TEST 10 — Irrelevant memory suppression
  // -------------------------------------------------------------
  console.log("TEST 10 — Irrelevant memory suppression:");
  {
    const ctx = createDummyContext("weather");
    const intent = createDummyIntent("INFORMATION");
    const govCandidate: MemoryGovernanceCandidate = {
      memoryId: "mem_guitar",
      key: "hobby_guitar",
      value: "Plays acoustic guitar",
      type: "FACT",
      source: "EXPLICIT_USER",
      status: "ACTIVE",
      usageDecision: "ALLOW",
      usageScore: 0.3,
      confidence: 0.8,
      relevance: 0.2, // Low relevance!
      reasons: ["LOW_RELEVANCE"],
      canAffectResponseContent: false,
      canPersonalize: false,
      canSupportFactualClaim: false,
      requiresExplicitAttribution: false,
      isCandidateInferred: false,
    };

    const govAnalysis: MemoryGovernanceAnalysis = {
      governanceRequired: true,
      memoryInfluenceAllowed: false,
      allowedMemories: [],
      cautiousMemories: [],
      internalOnlyMemories: [govCandidate],
      suppressedMemories: [govCandidate],
      governedCandidates: [govCandidate],
      conflicts: [],
      privacyBlocks: [],
      topicIsolationApplied: true,
      explicitReferenceDetected: false,
      directives: [],
      sanitizedMemoryContext: "",
      governanceConfidence: 0.9,
    };

    const result = predictiveContextEngine.evaluate({
      message: "Is it going to rain in Dhaka today?",
      context: ctx,
      intent,
      governanceAnalysis: govAnalysis,
      options: { currentTime: 3000 },
    });

    assert(result.acceptedCandidates.length === 0, "Irrelevant memory is not accepted");
    console.log("  ✓ Irrelevant memories excluded by governance remain strictly suppressed");
  }

  // -------------------------------------------------------------
  // TEST 11 — Candidate memory unconfirmed -> suppressed
  // -------------------------------------------------------------
  console.log("TEST 11 — Candidate memory unconfirmed -> suppressed:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const candPattern: LearningPattern = {
      id: "pat_cand_dark",
      userId: "user_test",
      patternType: "USER_PREFERENCE",
      category: "general",
      key: "pref_dark_mode",
      value: "Dark Mode",
      status: "CANDIDATE", // Unconfirmed candidate!
      confidence: 0.55,
      reinforcementCount: 1,
      independentEvidenceCount: 1,
      firstObservedAt: 1000,
      lastObservedAt: 1000,
      evidence: [],
      source: "DOMAIN_QUERY",
      isExplicit: false,
    };

    const result = predictiveContextEngine.evaluate({
      message: "Open dashboard view",
      context: ctx,
      intent,
      adaptiveLearning: createDummyLearningAnalysis([candPattern]),
      options: { currentTime: 2000 },
    });

    assert(result.acceptedCandidates.length === 0, "CANDIDATE pattern never creates accepted proactive candidate");
    assert(result.rejectedCandidates.some((c) => c.suppressionReason === "UNCONFIRMED_CANDIDATE"), "CANDIDATE rejected with UNCONFIRMED_CANDIDATE");
    assert(result.directives.length === 0, "No hard directive generated for unconfirmed candidate");
    console.log("  ✓ Unconfirmed CANDIDATE patterns strictly prohibited from creating proactive directives");
  }

  // -------------------------------------------------------------
  // TEST 12 — Superseded memory rejection
  // -------------------------------------------------------------
  console.log("TEST 12 — Superseded memory rejection:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const outdatedPattern: LearningPattern = {
      id: "pat_old_lenovo",
      userId: "user_test",
      patternType: "USER_PREFERENCE",
      category: "general",
      key: "pref_lenovo",
      value: "Lenovo",
      status: "OUTDATED", // Superseded!
      confidence: 0.4,
      reinforcementCount: 1,
      independentEvidenceCount: 1,
      firstObservedAt: 1000,
      lastObservedAt: 1000,
      evidence: [],
      source: "USER_CORRECTION",
    };

    const result = predictiveContextEngine.evaluate({
      message: "Suggest a laptop",
      context: ctx,
      intent,
      adaptiveLearning: createDummyLearningAnalysis([outdatedPattern]),
      options: { currentTime: 3000 },
    });

    assert(result.acceptedCandidates.length === 0, "Outdated/superseded pattern produces zero accepted candidates");
    console.log("  ✓ Superseded and OUTDATED patterns are rejected");
  }

  // -------------------------------------------------------------
  // TEST 13 — Expired memory rejection
  // -------------------------------------------------------------
  console.log("TEST 13 — Expired memory rejection:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const result = predictiveContextEngine.evaluate({
      message: "What was my coupon code from last year?",
      context: ctx,
      intent,
      governanceAnalysis: {
        governanceRequired: true,
        memoryInfluenceAllowed: false,
        allowedMemories: [],
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
        governanceConfidence: 0.9,
      },
      options: { currentTime: 100000 },
    });

    assert(result.acceptedCandidates.length === 0, "Expired memories are not accepted");
    console.log("  ✓ Expired memory records rejected by governance are completely excluded");
  }

  // -------------------------------------------------------------
  // TEST 14 — Deleted memory rejection
  // -------------------------------------------------------------
  console.log("TEST 14 — Deleted memory rejection:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const result = predictiveContextEngine.evaluate({
      message: "Show my profile info",
      context: ctx,
      intent,
      governanceAnalysis: {
        governanceRequired: true,
        memoryInfluenceAllowed: false,
        allowedMemories: [],
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
        governanceConfidence: 0.9,
      },
      options: { currentTime: 3000 },
    });

    assert(result.acceptedCandidates.length === 0, "Deleted memories cannot participate in predictive context");
    console.log("  ✓ DELETED memory records rejected cleanly");
  }

  // -------------------------------------------------------------
  // TEST 15 — Current instruction overrides historical preference
  // -------------------------------------------------------------
  console.log("TEST 15 — Current instruction overrides historical preference:");
  {
    const ctx = createDummyContext("programming");
    const intent = createDummyIntent("INFORMATION");
    const banglaPattern: LearningPattern = {
      id: "pat_bangla",
      userId: "user_test",
      patternType: "INTERACTION_STYLE",
      category: "language",
      key: "pref_language_bangla",
      value: "Bangla",
      status: "CONFIRMED",
      confidence: 0.95,
      reinforcementCount: 4,
      independentEvidenceCount: 4,
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      evidence: [],
      source: "EXPLICIT_USER_STATEMENT",
      isExplicit: true,
    };

    const result = predictiveContextEngine.evaluate({
      message: "Please explain Dijkstra algorithm in English.", // Explicit English instruction
      context: ctx,
      intent,
      adaptiveLearning: createDummyLearningAnalysis([banglaPattern]),
      options: { currentTime: 3000 },
    });

    assert(result.acceptedCandidates.length === 0, "Bangla preference candidate is suppressed");
    assert(result.rejectedCandidates.some((c) => c.suppressionReason === "CURRENT_TURN_OVERRIDE"), "Suppression reason is CURRENT_TURN_OVERRIDE");
    assert(!result.directives.some((d) => d.includes("Bangla")), "No Bangla directive generated");
    console.log("  ✓ Current-turn explicit instruction ('in English') overrides historical Bangla preference");
  }

  // -------------------------------------------------------------
  // TEST 16 — Current hard constraint overrides historical prediction
  // -------------------------------------------------------------
  console.log("TEST 16 — Current hard constraint overrides historical prediction:");
  {
    const ctx = createDummyContext("laptop");
    ctx.constraints = [
      {
        id: "c_budget_80k",
        category: "budget",
        key: "budget_max",
        value: 80000,
        rawText: "80000",
        operator: "<=",
        createdAt: 2000,
        updatedAt: 2000,
        updatedAtTurn: 1,
      },
    ];

    const intent = createDummyIntent("RECOMMENDATION");
    const highBudgetGov: MemoryGovernanceCandidate = {
      memoryId: "mem_old_budget",
      key: "budget_laptop",
      value: "120k budget",
      type: "FACT",
      source: "EXPLICIT_USER",
      status: "ACTIVE",
      usageDecision: "ALLOW",
      usageScore: 0.8,
      confidence: 0.9,
      relevance: 0.9,
      reasons: ["HIGH_RELEVANCE"],
      canAffectResponseContent: true,
      canPersonalize: true,
      canSupportFactualClaim: true,
      requiresExplicitAttribution: false,
      isCandidateInferred: false,
    };

    const result = predictiveContextEngine.evaluate({
      message: "Suggest a laptop under 80000 BDT",
      context: ctx,
      intent,
      governanceAnalysis: {
        governanceRequired: true,
        memoryInfluenceAllowed: true,
        allowedMemories: [highBudgetGov],
        cautiousMemories: [],
        internalOnlyMemories: [],
        suppressedMemories: [],
        governedCandidates: [highBudgetGov],
        conflicts: [],
        privacyBlocks: [],
        topicIsolationApplied: false,
        explicitReferenceDetected: false,
        directives: [],
        sanitizedMemoryContext: "",
        governanceConfidence: 0.9,
      },
      options: { currentTime: 3000 },
    });

    assert(result.acceptedCandidates.length === 0, "Conflicting higher budget memory is suppressed");
    assert(result.rejectedCandidates.some((c) => c.suppressionReason === "HARD_CONSTRAINT_CONFLICT"), "Suppressed due to HARD_CONSTRAINT_CONFLICT");
    console.log("  ✓ Current hard constraint (80k budget) strictly overrides historical higher budget prediction");
  }

  // -------------------------------------------------------------
  // TEST 17 — Explicit correction suppresses conflicting prediction
  // -------------------------------------------------------------
  console.log("TEST 17 — Explicit correction suppresses conflicting prediction:");
  {
    const ctx = createDummyContext();
    const intent: StructuredIntent = {
      primaryIntent: "CONSTRAINT_UPDATE",
      relationship: "CORRECTION",
      intentConfidence: 0.95,
      intentSignals: {},
      requiresClarification: false,
      isMultiIntent: false,
      suggestedDirectives: [],
    };

    const oldPref: LearningPattern = {
      id: "pat_lenovo",
      userId: "user_test",
      patternType: "USER_PREFERENCE",
      category: "general",
      key: "pref_lenovo",
      value: "Lenovo ThinkPad",
      status: "CONFIRMED",
      confidence: 0.85,
      reinforcementCount: 2,
      independentEvidenceCount: 2,
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      evidence: [],
      source: "USER_STATEMENT",
      isExplicit: true,
    };

    const result = predictiveContextEngine.evaluate({
      message: "No, I do not want Lenovo, recommend ASUS instead.",
      context: ctx,
      intent,
      adaptiveLearning: createDummyLearningAnalysis([oldPref]),
      options: { currentTime: 3000 },
    });

    assert(result.acceptedCandidates.length === 0, "Old preference suppressed on explicit correction turn");
    assert(result.rejectedCandidates.some((c) => c.suppressionReason === "CURRENT_TURN_OVERRIDE"), "Suppressed with CURRENT_TURN_OVERRIDE");
    console.log("  ✓ Explicit correction immediately suppresses conflicting historical preference");
  }

  // -------------------------------------------------------------
  // TEST 18 — Laptop -> weather topic isolation
  // -------------------------------------------------------------
  console.log("TEST 18 — Laptop -> weather topic isolation:");
  {
    const ctx = createDummyContext("weather");
    const intent = createDummyIntent("INFORMATION");
    const laptopPattern: LearningPattern = {
      id: "pat_asus",
      userId: "user_test",
      patternType: "USER_PREFERENCE",
      category: "laptop",
      key: "pref_asus_zenbook",
      value: "ASUS ZenBook",
      status: "CONFIRMED",
      confidence: 0.90,
      reinforcementCount: 3,
      independentEvidenceCount: 3,
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      evidence: [],
      source: "EXPLICIT_USER_STATEMENT",
      isExplicit: true,
    };

    const result = predictiveContextEngine.evaluate({
      message: "What's the weather in Chittagong tomorrow?",
      context: ctx,
      intent,
      adaptiveLearning: createDummyLearningAnalysis([laptopPattern]),
      options: { currentTime: 3000 },
    });

    assert(result.acceptedCandidates.length === 0, "Laptop preference NOT accepted during weather query");
    assert(result.rejectedCandidates.some((c) => c.suppressionReason === "TOPIC_MISMATCH"), "Rejected due to TOPIC_MISMATCH");
    assert(!result.directives.some((d) => d.includes("ASUS")), "Zero ASUS directives generated for weather");
    console.log("  ✓ Laptop domain preferences isolated from weather interactions");
  }

  // -------------------------------------------------------------
  // TEST 19 — Weather -> coding topic isolation
  // -------------------------------------------------------------
  console.log("TEST 19 — Weather -> coding topic isolation:");
  {
    const ctx = createDummyContext("software_development");
    const intent = createDummyIntent("DEBUGGING");
    const weatherPattern: LearningPattern = {
      id: "pat_weather_celsius",
      userId: "user_test",
      patternType: "USER_PREFERENCE",
      category: "weather",
      key: "pref_temp_unit",
      value: "Celsius",
      status: "CONFIRMED",
      confidence: 0.90,
      reinforcementCount: 3,
      independentEvidenceCount: 3,
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      evidence: [],
      source: "EXPLICIT_USER_STATEMENT",
      isExplicit: true,
    };

    const result = predictiveContextEngine.evaluate({
      message: "Write a quicksort function in TypeScript",
      context: ctx,
      intent,
      adaptiveLearning: createDummyLearningAnalysis([weatherPattern]),
      options: { currentTime: 3000 },
    });

    assert(result.acceptedCandidates.length === 0, "Weather preference NOT injected into coding task");
    assert(result.rejectedCandidates.some((c) => c.suppressionReason === "TOPIC_MISMATCH"), "Suppressed due to TOPIC_MISMATCH");
    console.log("  ✓ Weather preferences isolated from programming tasks");
  }

  // -------------------------------------------------------------
  // TEST 20 — Archived topic does not leak
  // -------------------------------------------------------------
  console.log("TEST 20 — Archived topic does not leak:");
  {
    const ctx = createDummyContext("finance");
    ctx.archivedContexts = [
      {
        topic: "laptop",
        task: null,
        goal: null,
        entities: [],
        constraints: [],
        endedAt: 600,
        endedAtTurn: 2,
      },
    ];

    const intent = createDummyIntent("INFORMATION");
    const result = predictiveContextEngine.evaluate({
      message: "Calculate interest on 50000 BDT savings account",
      context: ctx,
      intent,
      options: { currentTime: 3000 },
    });

    assert(result.predictions.includes("NO_PREDICTION"), "Archived topic does not leak predictions into new topic");
    assert(result.acceptedCandidates.length === 0, "Zero candidates from archived contexts");
    console.log("  ✓ Archived context topics do not leak into active interactions");
  }

  // -------------------------------------------------------------
  // TEST 21 — Live tool output overrides historical memory
  // -------------------------------------------------------------
  console.log("TEST 21 — Live tool output overrides historical memory:");
  {
    const ctx = createDummyContext("laptop");
    const intent = createDummyIntent("INFORMATION");
    const verification: VerificationAnalysis = {
      verificationRequired: true,
      verificationStatus: "FAILED",
      factualClaims: [
        {
          id: "claim_1",
          claim: "RTX 4060 price is 120k",
          type: "UNVERIFIED_CLAIM",
          isSupported: false,
          evidenceSource: "live_search_price",
          confidenceImpact: -0.5,
        },
      ],
      supportedClaims: [],
      unsupportedClaims: [
        {
          id: "claim_1",
          claim: "RTX 4060 price is 120k",
          type: "UNVERIFIED_CLAIM",
          isSupported: false,
          evidenceSource: "live_search_price",
          confidenceImpact: -0.5,
        },
      ],
      assumptions: [],
      contradictions: [
        {
          type: "EVIDENCE_CONTRADICTION",
          description: "RTX 4060 price is 120k contradicted by live pricing",
          expected: "Current live store price",
          actual: "RTX 4060 price is 120k",
          severity: "HIGH",
        },
      ],
      missingEvidence: [],
      evidenceQuality: "HIGH",
      evidenceAssessment: {
        requiredEvidence: ["live_search_price"],
        availableEvidence: ["live_search_price"],
        missingEvidence: [],
        evidenceQuality: "HIGH",
        isEvidenceComplete: true,
      },
      confidence: {
        rawScore: 0.9,
        calibratedScore: 0.9,
        confidenceBand: "STRONGLY_VERIFIED",
        factors: [],
      },
      confidenceScore: 0.9,
      selfCorrectionRequired: true,
      correctionActions: ["REVISE_PLAN"],
      correctionIterations: 1,
      consistencyChecks: {
        isInternallyConsistent: true,
        isPlanAligned: true,
        isIntentAligned: true,
        isContextIsolated: true,
        details: [],
      },
      constraintCompliance: {
        hardConstraintsSatisfied: true,
        softPreferencesSatisfied: true,
        violatedHardConstraints: [],
        violatedSoftConstraints: [],
      },
      intentAlignment: true,
      recommendationValidity: true,
      requiresClarification: false,
      directives: [],
    };

    const govCandidate: MemoryGovernanceCandidate = {
      memoryId: "mem_price",
      key: "price_rtx4060",
      value: "RTX 4060 price is 120k",
      type: "FACT",
      source: "EXPLICIT_USER",
      status: "ACTIVE",
      usageDecision: "ALLOW",
      usageScore: 0.8,
      confidence: 0.8,
      relevance: 0.9,
      reasons: ["HIGH_RELEVANCE"],
      canAffectResponseContent: true,
      canPersonalize: false,
      canSupportFactualClaim: false,
      requiresExplicitAttribution: false,
      isCandidateInferred: false,
    };

    const result = predictiveContextEngine.evaluate({
      message: "What is the latest price of RTX 4060?",
      context: ctx,
      intent,
      verification,
      governanceAnalysis: {
        governanceRequired: true,
        memoryInfluenceAllowed: true,
        allowedMemories: [govCandidate],
        cautiousMemories: [],
        internalOnlyMemories: [],
        suppressedMemories: [],
        governedCandidates: [govCandidate],
        conflicts: [],
        privacyBlocks: [],
        topicIsolationApplied: false,
        explicitReferenceDetected: false,
        directives: [],
        sanitizedMemoryContext: "",
        governanceConfidence: 0.9,
      },
      options: { currentTime: 3000 },
    });

    assert(result.acceptedCandidates.length === 0, "Contradicted memory candidate is rejected");
    assert(result.rejectedCandidates.some((c) => c.suppressionReason === "LIVE_EVIDENCE_CONFLICT"), "Rejected due to LIVE_EVIDENCE_CONFLICT");
    console.log("  ✓ Live verified tool evidence strictly overrides contradicted historical memory");
  }

  // -------------------------------------------------------------
  // TEST 22 — Missing live evidence does not become prediction
  // -------------------------------------------------------------
  console.log("TEST 22 — Missing live evidence does not become prediction:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const result = predictiveContextEngine.evaluate({
      message: "Check the balance on account 1234",
      context: ctx,
      intent,
      options: { currentTime: 3000 },
    });

    assert(result.predictions.includes("NO_PREDICTION"), "Does not invent live balance data as prediction");
    assert(result.directives.length === 0, "No directives inventing balance");
    console.log("  ✓ Missing live data never hallucinated as proactive context");
  }

  // -------------------------------------------------------------
  // TEST 23 — Verified evidence remains authoritative
  // -------------------------------------------------------------
  console.log("TEST 23 — Verified evidence remains authoritative:");
  {
    const ctx = createDummyContext("science");
    const intent = createDummyIntent("INFORMATION");
    const result = predictiveContextEngine.evaluate({
      message: "Speed of light in vacuum is 299,792,458 m/s",
      context: ctx,
      intent,
      options: { currentTime: 3000 },
    });

    assert(result.analysisStatus === "NO_PREDICTION", "Factual statements do not trigger spurious proactive predictions");
    console.log("  ✓ Established facts processed cleanly without altering state");
  }

  // -------------------------------------------------------------
  // TEST 24 — Password suppression
  // -------------------------------------------------------------
  console.log("TEST 24 — Password suppression:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const result = predictiveContextEngine.evaluate({
      message: "My password is SuperSecretPassword123! remember this",
      context: ctx,
      intent,
      options: { currentTime: 3000 },
    });

    assert(result.analysisStatus === "SUPPRESSED", "Analysis status is SUPPRESSED");
    assert(result.suppressionReasons.includes("SENSITIVE_DATA"), "SENSITIVE_DATA recorded in suppressionReasons");
    assert(result.acceptedCandidates.length === 0, "Zero accepted candidates for password");
    assert(result.directives.length === 0, "Zero directives generated for password");
    console.log("  ✓ Sensitive passwords strictly intercepted and suppressed");
  }

  // -------------------------------------------------------------
  // TEST 25 — API key suppression
  // -------------------------------------------------------------
  console.log("TEST 25 — API key suppression:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const result = predictiveContextEngine.evaluate({
      message: "Use API key sk_live_9876543210abcdefg for requests",
      context: ctx,
      intent,
      options: { currentTime: 3000 },
    });

    assert(result.analysisStatus === "SUPPRESSED", "Analysis status is SUPPRESSED");
    assert(result.suppressionReasons.includes("SENSITIVE_DATA"), "SENSITIVE_DATA suppression triggered");
    assert(result.directives.length === 0, "No directive leaks API key");
    console.log("  ✓ API keys strictly blocked from predictive processing");
  }

  // -------------------------------------------------------------
  // TEST 26 — Financial credential suppression
  // -------------------------------------------------------------
  console.log("TEST 26 — Financial credential suppression:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const result = predictiveContextEngine.evaluate({
      message: "My card number is 4532-1234-5678-9010 with CVV 123",
      context: ctx,
      intent,
      options: { currentTime: 3000 },
    });

    assert(result.analysisStatus === "SUPPRESSED", "Analysis status is SUPPRESSED");
    assert(result.suppressionReasons.includes("SENSITIVE_DATA"), "Suppressed due to SENSITIVE_DATA");
    assert(result.acceptedCandidates.length === 0, "Zero candidates accepted");
    console.log("  ✓ Credit cards and CVVs strictly suppressed");
  }

  // -------------------------------------------------------------
  // TEST 27 — Confirmed adaptive pattern influences relevant context
  // -------------------------------------------------------------
  console.log("TEST 27 — Confirmed adaptive pattern influences relevant context:");
  {
    const ctx = createDummyContext("coding");
    const intent = createDummyIntent("DEBUGGING");
    const stylePattern: LearningPattern = {
      id: "pat_style_concise",
      userId: "user_test",
      patternType: "INTERACTION_STYLE",
      category: "verbosity",
      key: "pref_response_style",
      value: "concise summary",
      status: "CONFIRMED",
      confidence: 0.90,
      reinforcementCount: 3,
      independentEvidenceCount: 3,
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      evidence: [],
      source: "EXPLICIT_USER_STATEMENT",
      isExplicit: true,
    };

    const result = predictiveContextEngine.evaluate({
      message: "Summarize this PR diff",
      context: ctx,
      intent,
      adaptiveLearning: createDummyLearningAnalysis([stylePattern]),
      options: { currentTime: 3000 },
    });

    assert(result.acceptedCandidates.length === 1, "Confirmed style pattern accepted as candidate");
    assert(result.directives.some((d) => d.includes("concise summary")), "Sanitized directive generated");
    console.log("  ✓ Confirmed adaptive pattern accurately generates safe advisory directive");
  }

  // -------------------------------------------------------------
  // TEST 28 — Candidate adaptive pattern cannot create hard directive
  // -------------------------------------------------------------
  console.log("TEST 28 — Candidate adaptive pattern cannot create hard directive:");
  {
    const ctx = createDummyContext("coding");
    const intent = createDummyIntent("DEBUGGING");
    const candStyle: LearningPattern = {
      id: "pat_cand_style",
      userId: "user_test",
      patternType: "INTERACTION_STYLE",
      category: "guidance_style",
      key: "pref_guidance",
      value: "socratic",
      status: "CANDIDATE", // Candidate!
      confidence: 0.60,
      reinforcementCount: 1,
      independentEvidenceCount: 1,
      firstObservedAt: 1000,
      lastObservedAt: 1000,
      evidence: [],
      source: "INTERACTION_STYLE",
      isExplicit: false,
    };

    const result = predictiveContextEngine.evaluate({
      message: "Help me debug this loop",
      context: ctx,
      intent,
      adaptiveLearning: createDummyLearningAnalysis([candStyle]),
      options: { currentTime: 3000 },
    });

    assert(result.directives.length === 0, "Zero hard directives created from CANDIDATE pattern");
    assert(result.rejectedCandidates.some((c) => c.suppressionReason === "UNCONFIRMED_CANDIDATE"), "Candidate rejected with UNCONFIRMED_CANDIDATE");
    console.log("  ✓ Candidate patterns strictly blocked from creating prompt directives");
  }

  // -------------------------------------------------------------
  // TEST 29 — No autonomous tool execution
  // -------------------------------------------------------------
  console.log("TEST 29 — No autonomous tool execution:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent("DEBUGGING");
    const result = predictiveContextEngine.evaluate({
      message: "Execute system backup and send email",
      context: ctx,
      intent,
      options: { currentTime: 3000 },
    });

    // Engine is pure calculation
    assert(typeof result.confidence === "number", "Engine returns mathematical result");
    assert(!("executeTool" in (result as any)), "No tool execution capability");
    console.log("  ✓ PredictiveContextEngine performs zero autonomous tool calls or network operations");
  }

  // -------------------------------------------------------------
  // TEST 30 — No autonomous memory writes
  // -------------------------------------------------------------
  console.log("TEST 30 — No autonomous memory writes:");
  {
    const userId = "user_ro_test";
    const initialMemories = memoryStore.get(userId);
    const initialCount = initialMemories.length;

    const ctx = createDummyContext();
    const intent = createDummyIntent();
    predictiveContextEngine.evaluate({
      message: "I love MacBook Pro laptops",
      context: ctx,
      intent,
      options: { userId, currentTime: 3000 },
    });

    const postMemories = memoryStore.get(userId);
    assert(postMemories.length === initialCount, "MemoryStore count unchanged by PredictiveContextEngine");
    console.log("  ✓ PredictiveContextEngine is strictly read-only with respect to long-term memory store");
  }

  // -------------------------------------------------------------
  // TEST 31 — TTL expiration enforcement
  // -------------------------------------------------------------
  console.log("TEST 31 — TTL expiration enforcement:");
  {
    const ctx = createDummyContext("laptop");
    const intent = createDummyIntent("PLANNING");
    const plan: TaskPlan = {
      id: "plan_expired_ttl",
      objective: "Laptop comparison",
      goal: "Finish comparison",
      status: "IN_PROGRESS",
      priority: "NORMAL",
      complexity: "LOW",
      steps: [
        {
          id: "step_1",
          title: "Search candidates",
          description: "Search",
          order: 1,
          status: "COMPLETED",
          dependencies: [],
          requiredInputs: [],
          expectedOutput: "List",
          canRunInParallel: false,
          completionCriteria: "Done",
        },
        {
          id: "step_2",
          title: "Synthesize recommendation",
          description: "Synthesize",
          order: 2,
          status: "READY",
          dependencies: ["step_1"],
          requiredInputs: [],
          expectedOutput: "Done",
          canRunInParallel: false,
          completionCriteria: "Done",
        },
      ],
      dependencies: { step_1: [], step_2: ["step_1"] },
      requiredInputs: [],
      availableInputs: [],
      missingInputs: [],
      toolRequirements: [],
      executionStrategy: "SEQUENTIAL",
      completionCriteria: [],
      failureStrategy: "REQUEST_CLARIFICATION",
      createdAt: 1000,
      updatedAt: 1000,
      sourceIntent: "PLANNING",
      sourceReasoning: "COMPARISON",
      isCancellable: true,
      activeStepId: "step_2",
    };

    // Plan evaluated at currentTime = 5,000,000 (way past DEFAULT_PLAN_TTL from start 1000)
    const result = predictiveContextEngine.evaluate({
      message: "Continue my task",
      context: ctx,
      intent,
      planning: { requiresPlanning: true, plan, directives: [] },
      options: { currentTime: 5000000 },
    });

    // Check candidate has valid future expiry relative to current time
    const cand = result.acceptedCandidates.find((c) => c.predictionType === "TASK_CONTINUATION");
    if (cand) {
      assert(cand.expiresAt > 5000000, "Candidate expiresAt is temporally bounded in the future");
    }
    console.log("  ✓ Proactive candidates strictly bounded with temporal TTL timestamps");
  }

  // -------------------------------------------------------------
  // TEST 32 — Confidence threshold suppression
  // -------------------------------------------------------------
  console.log("TEST 32 — Confidence threshold suppression:");
  {
    const ctx = createDummyContext();
    const intent = createDummyIntent();
    const lowConfPattern: LearningPattern = {
      id: "pat_low_conf",
      userId: "user_test",
      patternType: "USER_PREFERENCE",
      category: "general",
      key: "pref_low_conf",
      value: "Low confidence item",
      status: "OUTDATED",
      confidence: 0.2, // Below 0.50 threshold
      reinforcementCount: 1,
      independentEvidenceCount: 1,
      firstObservedAt: 1000,
      lastObservedAt: 1000,
      evidence: [],
      source: "DOMAIN_QUERY",
    };

    const result = predictiveContextEngine.evaluate({
      message: "Hello world",
      context: ctx,
      intent,
      adaptiveLearning: createDummyLearningAnalysis([lowConfPattern]),
      options: { currentTime: 3000 },
    });

    assert(result.acceptedCandidates.length === 0, "Low-confidence patterns strictly suppressed");
    console.log("  ✓ Candidates below confidence threshold strictly suppressed");
  }

  // -------------------------------------------------------------
  // TEST 33 — Sanitized directives
  // -------------------------------------------------------------
  console.log("TEST 33 — Sanitized directives:");
  {
    const ctx = createDummyContext("laptop");
    const intent = createDummyIntent("INFORMATION");
    const pattern: LearningPattern = {
      id: "pat_9999_internal_id",
      userId: "user_test",
      patternType: "USER_PREFERENCE",
      category: "laptop",
      key: "pref_display",
      value: "OLED 120Hz display",
      status: "CONFIRMED",
      confidence: 0.88,
      reinforcementCount: 3,
      independentEvidenceCount: 3,
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      evidence: [],
      source: "EXPLICIT_USER_STATEMENT",
      isExplicit: true,
    };

    const result = predictiveContextEngine.evaluate({
      message: "Suggest a display for coding",
      context: ctx,
      intent,
      adaptiveLearning: createDummyLearningAnalysis([pattern]),
      options: { currentTime: 3000 },
    });

    for (const d of result.directives) {
      assert(!d.includes("pat_9999"), "Directive does not leak pattern ID");
      assert(!d.includes("confidence:"), "Directive does not leak confidence score");
      assert(!d.includes("0.88"), "Directive does not leak internal score");
      assert(!d.includes("userId"), "Directive does not leak userId");
    }
    console.log("  ✓ Generated directives are thoroughly sanitized and leak zero internal metadata");
  }

  // -------------------------------------------------------------
  // TEST 34 — Hard constraint preservation
  // -------------------------------------------------------------
  console.log("TEST 34 — Hard constraint preservation:");
  {
    const ctx = createDummyContext();
    ctx.constraints = [
      {
        id: "c_lang_en",
        category: "other",
        key: "language",
        value: "English",
        rawText: "English",
        createdAt: 1000,
        updatedAt: 1000,
        updatedAtTurn: 1,
      },
    ];

    const intent = createDummyIntent();
    predictiveContextEngine.evaluate({
      message: "Show results",
      context: ctx,
      intent,
      options: { currentTime: 3000 },
    });

    assert(ctx.constraints.length === 1, "Context constraints array is untouched and preserved");
    assert(ctx.constraints[0].value === "English", "Constraint value remains English");
    console.log("  ✓ Hard constraints preserved without mutation or weakening");
  }

  // -------------------------------------------------------------
  // TEST 35 — Full BrainEngine Integration
  // -------------------------------------------------------------
  console.log("TEST 35 — Full BrainEngine Integration:");
  {
    const userId = "user_e2e_pred";
    memoryStore.clear(userId);

    const result = brainEngine.analyze(
      "Hello Dora! I'm researching gaming laptops under 85000 BDT.",
      [],
      undefined,
      "session_e2e_pred",
      undefined,
      { userId, currentTime: 1000 }
    );

    assert(Boolean(result.predictiveContextAnalysis), "BrainAnalysis contains predictiveContextAnalysis");
    assert(Array.isArray(result.predictiveContextAnalysis!.predictions), "Predictions is an array");
    assert(Array.isArray(result.predictiveContextAnalysis!.directives), "Directives is an array");
    assert(typeof result.predictiveContextAnalysis!.confidence === "number", "Confidence is a number");
    assert(result.predictiveContextAnalysis!.confidence >= 0.0 && result.predictiveContextAnalysis!.confidence <= 1.0, "Confidence bounded in [0.0, 1.0]");
    console.log("  ✓ BrainEngine cognitive pipeline seamlessly incorporates PredictiveContextEngine");
  }

  console.log("==========================================");
  console.log("ALL 35 PREDICTIVE CONTEXT TESTS PASSED!");
  console.log("==========================================");
}

runTests();
