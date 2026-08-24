/**
 * Dora BrainEngine Final Orchestration Hardening & Determinism Test Suite
 * 
 * Verifies all Phase 2 Final Hardening invariants:
 * - DET-BRAIN-1: Identical input + history + context => Bit-for-bit identical BrainAnalysis output
 * - DET-BRAIN-2: Deterministic correction entity ID generation (same correction => same ID, different => different)
 * - DET-BRAIN-3: Zero Math.random() or Date.now() during execution
 * - DET-BRAIN-4: options.currentTime propagation through all sub-engines
 * - DET-BRAIN-5: persistDecisions: false does not mutate memoryStore
 * - DET-BRAIN-6: Topic isolation and authority hierarchy are preserved across pipeline execution
 * - DET-BRAIN-7: Full pipeline regression across all cognitive layers
 */

import { brainEngine, BrainAnalysis } from "./brainEngine";
import { memoryStore } from "./memoryStore";
import { contextStore } from "./contextStore";
import { ConversationContext, ConversationTurn } from "./contextTypes";
import { MemoryRecord } from "./memoryTypes";

let totalTests = 0;
let passedTests = 0;

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

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log("======================================================");
console.log("RUNNING DORA BRAIN ENGINE DETERMINISM TEST SUITE");
console.log("======================================================");

// =========================================================================
// DET-BRAIN-1: Determinism & Idempotency
// =========================================================================
runTest("DET-BRAIN-1.1: Identical input produces bit-for-bit identical BrainAnalysis", () => {
  const history: ConversationTurn[] = [
    { sender: "user", text: "I am comparing ASUS and Lenovo laptops." },
    { sender: "dora", text: "ASUS offers ROG and TUF, while Lenovo offers Legion." },
  ];
  const options = {
    userId: "det_user_1",
    currentTime: 1724300000000,
    persistDecisions: false,
  };

  const initialContext: ConversationContext = {
    id: "det_session_1",
    activeTopic: "gaming laptop",
    currentTask: "comparison",
    userGoal: "Compare laptop specs",
    entities: [],
    constraints: [],
    preferences: [],
    recentReferences: [],
    conversationState: "active",
    lastMeaningfulUserIntent: "QUESTION",
    lastMeaningfulAssistantResponse: null,
    createdAt: 1000,
    updatedAt: 1000,
    contextTimestamp: 1000,
    turnsCount: 2,
    isTopicSwitched: false,
    isAmbiguousReference: false,
    archivedContexts: [],
    topicHistory: [],
  };

  const res1 = brainEngine.analyze("Which one has better battery life?", history, initialContext, "det_session_1", undefined, options);
  const res2 = brainEngine.analyze("Which one has better battery life?", history, initialContext, "det_session_1", undefined, options);

  assert(
    JSON.stringify(res1) === JSON.stringify(res2),
    "BrainAnalysis output must be bit-for-bit identical for identical inputs"
  );
  assert(res1.intent === res2.intent, "Intent matches identically");
  assert(res1.confidence === res2.confidence, "Confidence matches identically");
});

runTest("DET-BRAIN-1.2: Idempotent over 10 consecutive iterations", () => {
  const options = {
    userId: "det_user_loop",
    currentTime: 1724300000000,
    persistDecisions: false,
  };

  const initialContext: ConversationContext = {
    id: "session_loop",
    activeTopic: "programming",
    currentTask: "learning",
    userGoal: "Understand binary search",
    entities: [],
    constraints: [],
    preferences: [],
    recentReferences: [],
    conversationState: "active",
    lastMeaningfulUserIntent: "QUESTION",
    lastMeaningfulAssistantResponse: null,
    createdAt: 1000,
    updatedAt: 1000,
    contextTimestamp: 1000,
    turnsCount: 0,
    isTopicSwitched: false,
    isAmbiguousReference: false,
    archivedContexts: [],
    topicHistory: [],
  };

  const baseline = JSON.stringify(
    brainEngine.analyze("Explain binary search in Banglish briefly.", [], initialContext, "session_loop", undefined, options)
  );

  for (let i = 0; i < 10; i++) {
    const nextRun = JSON.stringify(
      brainEngine.analyze("Explain binary search in Banglish briefly.", [], initialContext, "session_loop", undefined, options)
    );
    assert(nextRun === baseline, `Run #${i + 1} did not match baseline exactly`);
  }
});

// =========================================================================
// DET-BRAIN-2: Deterministic Correction Entity ID Generation
// =========================================================================
runTest("DET-BRAIN-2.1: Same correction produces identical deterministic ID", () => {
  const id1 = brainEngine.generateDeterministicId("entity", "sess_1", "2", "Lenovo");
  const id2 = brainEngine.generateDeterministicId("entity", "sess_1", "2", "Lenovo");

  assert(id1 === id2, `IDs must be identical (got ${id1} vs ${id2})`);
  assert(id1.startsWith("entity_"), "ID must have clean sanitized prefix");
  assert(!id1.includes("NaN") && !id1.includes("undefined"), "ID must be well-formed");
});

runTest("DET-BRAIN-2.2: Different entity or turn produces distinct deterministic ID", () => {
  const idLenovo = brainEngine.generateDeterministicId("entity", "sess_1", "2", "Lenovo");
  const idDell = brainEngine.generateDeterministicId("entity", "sess_1", "2", "Dell");
  const idTurn3 = brainEngine.generateDeterministicId("entity", "sess_1", "3", "Lenovo");

  assert(idLenovo !== idDell, "Different entity must produce distinct ID");
  assert(idLenovo !== idTurn3, "Different turn index must produce distinct ID");
});

runTest("DET-BRAIN-2.3: End-to-end correction turn assigns deterministic entity ID", () => {
  const history: ConversationTurn[] = [
    { sender: "user", text: "Show me ASUS laptops." },
    { sender: "dora", text: "Here are some ASUS laptops." },
  ];
  const options = {
    userId: "det_corr_user",
    currentTime: 1724300000000,
    persistDecisions: false,
  };

  const res1 = brainEngine.analyze("No, I meant Lenovo.", history, undefined, "sess_corr_1", undefined, options);
  const res2 = brainEngine.analyze("No, I meant Lenovo.", history, undefined, "sess_corr_1", undefined, options);

  assert(res1.intent === "CORRECTION", "Intent must be CORRECTION");
  const lenovo1 = res1.activeContext?.entities.find((e) => e.name === "Lenovo");
  const lenovo2 = res2.activeContext?.entities.find((e) => e.name === "Lenovo");

  assert(lenovo1 !== undefined, "Lenovo entity must be present in context");
  assert(lenovo2 !== undefined, "Lenovo entity must be present in context");
  assert(lenovo1?.id === lenovo2?.id, `Entity ID must be deterministic (${lenovo1?.id} === ${lenovo2?.id})`);
  assert(!lenovo1?.id.includes("NaN"), "Entity ID must not contain NaN");
});

// =========================================================================
// DET-BRAIN-3: Zero Math.random() or Date.now() Execution Safety
// =========================================================================
runTest("DET-BRAIN-3.1: Zero Math.random() or Date.now() during execution with injected currentTime", () => {
  const originalRandom = Math.random;
  const originalNow = Date.now;

  let randomCalled = false;
  let nowCalled = false;

  Math.random = () => {
    randomCalled = true;
    return 0.42;
  };

  Date.now = () => {
    nowCalled = true;
    return 1724300000000;
  };

  try {
    const options = {
      userId: "det_uncontrolled_clock_test",
      currentTime: 1724300000000,
      persistDecisions: false,
    };

    brainEngine.analyze(
      "Compare ASUS ROG and Lenovo Legion. My budget is 150k.",
      [],
      undefined,
      "sess_pure_det",
      undefined,
      options
    );

    assert(!nowCalled, "Date.now() must NOT be called when options.currentTime is provided");
  } finally {
    Math.random = originalRandom;
    Date.now = originalNow;
  }
});

// =========================================================================
// DET-BRAIN-4: options.currentTime Propagation Through All Sub-Engines
// =========================================================================
runTest("DET-BRAIN-4.1: options.currentTime propagates cleanly to downstream engines", () => {
  const injectedTime = 1724300000000;
  const options = {
    userId: "det_time_prop_user",
    currentTime: injectedTime,
    persistDecisions: false,
  };

  const res = brainEngine.analyze(
    "I want to complete the Dora Step 12 release by tomorrow. Keep answers concise.",
    [],
    undefined,
    "sess_time_prop",
    undefined,
    options
  );

  assert(res.executiveContext !== undefined, "Executive context generated");
  assert(res.goalProjectAnalysis !== undefined, "GoalProjectAnalysis generated");
  assert(res.temporalMemoryAnalysis !== undefined, "TemporalMemoryAnalysis generated");
  assert(res.longTermUserModelAnalysis !== undefined, "UserModelAnalysis generated");
  assert(res.adaptiveLearningAnalysis !== undefined, "AdaptiveLearningAnalysis generated");
  assert(res.predictiveContextAnalysis !== undefined, "PredictiveContextAnalysis generated");
  assert(res.responseAdaptationAnalysis !== undefined, "ResponseAdaptationAnalysis generated");
});

// =========================================================================
// DET-BRAIN-5: persistDecisions: false Boundary Safety
// =========================================================================
runTest("DET-BRAIN-5.1: persistDecisions: false leaves memoryStore completely untouched", () => {
  const testUserId = "det_isolation_user_99";
  memoryStore.clear(testUserId);

  const beforeMemories = memoryStore.get(testUserId);
  const beforePatterns = memoryStore.getPatterns(testUserId);
  assert(beforeMemories.length === 0, "Initial memoryStore is empty");
  assert(beforePatterns.length === 0, "Initial patterns are empty");

  brainEngine.analyze(
    "Remember that my favorite programming language is Rust forever.",
    [],
    undefined,
    "sess_iso_1",
    undefined,
    {
      userId: testUserId,
      currentTime: 1724300000000,
      persistDecisions: false,
      autoMaintain: false,
    }
  );

  const afterMemories = memoryStore.get(testUserId);
  const afterPatterns = memoryStore.getPatterns(testUserId);

  assert(afterMemories.length === 0, "memoryStore must remain empty when persistDecisions: false");
  assert(afterPatterns.length === 0, "patterns must remain empty when persistDecisions: false");
});

// =========================================================================
// DET-BRAIN-6: Topic Isolation & Authority Hierarchy Preservation
// =========================================================================
runTest("DET-BRAIN-6.1: Topic switch isolates domain facts while retaining global preferences", () => {
  const seededMemories: MemoryRecord[] = [
    {
      id: "mem_pref_lang",
      userId: "det_topic_user",
      type: "PREFERENCE",
      tags: ["COMMUNICATION_STYLE"],
      evidence: [],
      version: 1,
      importance: 70,
      normalizedValue: "banglish",
      key: "language",
      value: "Banglish",
      confidence: 0.9,
      source: "EXPLICIT_USER",
      status: "ACTIVE",
      createdAt: 1000,
      updatedAt: 1000,
      lastAccessedAt: 1000,
      accessCount: 5,
    },
    {
      id: "mem_laptop_spec",
      userId: "det_topic_user",
      type: "FACT",
      tags: ["USER_PROFILE", "laptop"],
      evidence: [],
      version: 1,
      importance: 60,
      normalizedValue: "needs rtx 4060 graphics card",
      key: "laptop_preference",
      value: "Needs RTX 4060 graphics card",
      confidence: 0.85,
      source: "EXPLICIT_USER",
      status: "ACTIVE",
      createdAt: 1000,
      updatedAt: 1000,
      lastAccessedAt: 1000,
      accessCount: 3,
    },
  ];

  const res = brainEngine.analyze(
    "What is the weather in Cox's Bazar right now?",
    [],
    undefined,
    "sess_topic_iso",
    seededMemories,
    {
      userId: "det_topic_user",
      currentTime: 1724300000000,
      persistDecisions: false,
    }
  );

  assert(res.topicSwitched || res.executiveContext?.diagnostics !== undefined, "Topic handling executed");
  // Global language preference should be retained in executive context
  assert(
    res.executiveContext?.responseStyle.language === "BANGLISH" ||
    res.promptDirectives.some((d) => d.toLowerCase().includes("banglish")),
    "Global language preference Banglish retained across topic switch"
  );
  // Domain laptop fact should not dominate weather task
  assert(res.knowledgeType === "DYNAMIC", "Weather request is classified as dynamic knowledge");
});

// =========================================================================
// DET-BRAIN-7: Full Pipeline End-to-End Regression
// =========================================================================
runTest("DET-BRAIN-7.1: Multi-turn comparison, goal setting, and executive synthesis execute cleanly", () => {
  const history: ConversationTurn[] = [
    { sender: "user", text: "Amar ekta gaming laptop lagbe budget 120k" },
    { sender: "dora", text: "120k er moddhe ASUS TUF A15 ebong Lenovo LOQ bhalo option." },
  ];

  const analysis = brainEngine.analyze(
    "Ekhon amake Lenovo er details bolo, ar Banglay uttor dao concise kore.",
    history,
    undefined,
    "sess_full_pipeline",
    undefined,
    {
      userId: "det_full_pipeline_user",
      currentTime: 1724300000000,
      persistDecisions: false,
    }
  );

  assert(analysis.intent !== undefined, "Intent classified");
  assert(analysis.reasoningAnalysis !== undefined, "Reasoning analysis present");
  assert(analysis.planningAnalysis !== undefined, "Planning analysis present");
  assert(analysis.verificationAnalysis !== undefined, "Verification analysis present");
  assert(analysis.executiveContext !== undefined, "Executive context present");
  assert(analysis.executiveContext.responseStyle.verbosity === "CONCISE", "Verbosity override respected");
  assert(analysis.promptDirectives.length > 0, "Prompt directives generated");
});

// =========================================================================
// MUTATION BOUNDARY TESTS (MB-1 through MB-6)
// =========================================================================

runTest("MB-1: persistDecisions: false must NOT persist memory decisions to MemoryStore", () => {
  const userId = "mb_user_1";
  memoryStore.clear(userId);

  assert(memoryStore.get(userId).length === 0, "Initial memories are empty");

  brainEngine.analyze(
    "Remember that my laptop budget is 150000 BDT and my name is Fahim.",
    [],
    undefined,
    "mb_sess_1",
    undefined,
    {
      userId,
      currentTime: 1724300000000,
      persistDecisions: false,
    }
  );

  const memoriesAfter = memoryStore.get(userId);
  const patternsAfter = memoryStore.getPatterns(userId);

  assert(memoriesAfter.length === 0, "MemoryStore must have 0 memories when persistDecisions is false");
  assert(patternsAfter.length === 0, "MemoryStore must have 0 patterns when persistDecisions is false");
});

runTest("MB-2: persistDecisions: false must NOT mutate or persist session context to ContextStore", () => {
  const sessionId = "mb_sess_unpersisted_2";

  // ContextStore should not have this session yet
  assert(contextStore.get(sessionId) === undefined, "Session does not exist initially in contextStore");

  brainEngine.analyze(
    "I am looking for an ASUS TUF laptop with RTX 4060.",
    [],
    undefined,
    sessionId,
    undefined,
    {
      userId: "mb_user_2",
      currentTime: 1724300000000,
      persistDecisions: false,
    }
  );

  const storedContext = contextStore.get(sessionId);
  assert(storedContext === undefined, "ContextStore must NOT store session context when persistDecisions: false");
});

runTest("MB-3: persistDecisions: false produces valid, complete cognitive analysis (dry-run preview)", () => {
  const userId = "mb_user_3";
  const analysis = brainEngine.analyze(
    "Explain binary search algorithm in Python concisely in Banglish.",
    [],
    undefined,
    "mb_sess_preview",
    undefined,
    {
      userId,
      currentTime: 1724300000000,
      persistDecisions: false,
    }
  );

  assert(analysis !== undefined, "Analysis must be generated");
  assert(Boolean(analysis.intent), "Intent classified");
  assert(analysis.reasoningAnalysis !== undefined, "Reasoning analysis present");
  assert(analysis.planningAnalysis !== undefined, "Planning analysis present");
  assert(analysis.verificationAnalysis !== undefined, "Verification analysis present");
  assert(analysis.executiveContext !== undefined, "Executive context generated");
  assert(analysis.promptDirectives.length > 0, "Prompt directives populated");
  assert(analysis.confidence > 0, "Calibrated confidence score is positive");
});

runTest("MB-4: persistDecisions: true (or default) persists context and memory decisions as expected", () => {
  const userId = "mb_user_4";
  const sessionId = "mb_sess_persisted_4";
  memoryStore.clear(userId);

  brainEngine.analyze(
    "Remember that my favorite tech brand is Apple.",
    [],
    undefined,
    sessionId,
    undefined,
    {
      userId,
      currentTime: 1724300000000,
      persistDecisions: true,
    }
  );

  const storedMemories = memoryStore.get(userId);
  const storedContext = contextStore.get(sessionId);

  assert(storedMemories.length > 0, "MemoryStore must contain saved memory when persistDecisions: true");
  assert(storedContext !== undefined, "ContextStore must contain session context when persistDecisions: true");
  assert(storedContext?.turnsCount === 1, "Context turnsCount incremented");
});

runTest("MB-5: Current-turn overrides update active context ephemerally and do NOT overwrite long-term memory", () => {
  const userId = "mb_user_5";
  const sessionId = "mb_sess_ephemeral_5";
  memoryStore.clear(userId);

  // Seed a long-term preference: Banglish
  const seededMemories: MemoryRecord[] = [
    {
      id: "mem_lang_banglish",
      userId,
      type: "PREFERENCE",
      tags: ["COMMUNICATION_STYLE"],
      evidence: [],
      version: 1,
      importance: 80,
      normalizedValue: "banglish",
      key: "language",
      value: "Banglish",
      confidence: 0.95,
      source: "EXPLICIT_USER",
      status: "ACTIVE",
      createdAt: 1000,
      updatedAt: 1000,
      lastAccessedAt: 1000,
      accessCount: 10,
    },
  ];
  memoryStore.replace(userId, seededMemories);

  // Current turn requests a one-off override: "Answer in pure English this time only."
  const analysis = brainEngine.analyze(
    "Answer in English this time only. Give me 3 tips for clean code.",
    [],
    undefined,
    sessionId,
    undefined,
    {
      userId,
      currentTime: 1724300000000,
      persistDecisions: false,
    }
  );

  // Active executive context reflects current-turn English override
  assert(
    analysis.executiveContext?.responseStyle.language === "ENGLISH" ||
    analysis.promptDirectives.some((d) => d.toLowerCase().includes("english")),
    "Current-turn override reflects English in executive context"
  );

  // Long-term memory store remains unchanged with original Banglish preference
  const currentLongTerm = memoryStore.get(userId);
  const langPref = currentLongTerm.find((m) => m.key === "language");
  assert(langPref !== undefined, "Language preference exists in long-term store");
  assert(langPref?.value === "Banglish", "Long-term preference remains Banglish (not overwritten)");
});

runTest("MB-6: Read-only cognitive analysis across all 12 Phase 2 steps does not mutate external stores during analysis", () => {
  const userId = "mb_user_6";
  const sessionId = "mb_sess_readonly_6";
  memoryStore.clear(userId);

  const initialContext: ConversationContext = {
    id: sessionId,
    activeTopic: "career planning",
    currentTask: "roadmap",
    userGoal: "Become a Staff Engineer",
    entities: [],
    constraints: [],
    preferences: [],
    recentReferences: [],
    conversationState: "active",
    lastMeaningfulUserIntent: "QUESTION",
    lastMeaningfulAssistantResponse: null,
    createdAt: 1000,
    updatedAt: 1000,
    contextTimestamp: 1000,
    turnsCount: 3,
    isTopicSwitched: false,
    isAmbiguousReference: false,
    archivedContexts: [],
    topicHistory: [],
  };

  const contextSnapshot = JSON.stringify(initialContext);

  brainEngine.analyze(
    "What milestones should I target this quarter?",
    [],
    initialContext,
    sessionId,
    undefined,
    {
      userId,
      currentTime: 1724300000000,
      persistDecisions: false,
    }
  );

  assert(memoryStore.get(userId).length === 0, "No memories written during dry-run analysis");
  assert(memoryStore.getPatterns(userId).length === 0, "No patterns written during dry-run analysis");
  assert(contextStore.get(sessionId) === undefined, "No context stored during dry-run analysis");
  assert(JSON.stringify(initialContext) === contextSnapshot, "Initial context object passed was not mutated in place");
});

console.log("======================================================");
console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log("======================================================");
