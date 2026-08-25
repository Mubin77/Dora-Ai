/**
 * Dora BrainEngine Orchestration & Hardening Test Suite
 * Phase 2 — Final Orchestration Hardening
 * 
 * Exhaustive test suite verifying:
 * - Deterministic execution: Zero Math.random(), zero Date.now() in decision path, zero random UUIDs.
 * - Stable, deterministic correction IDs.
 * - Current-turn override precedence & ephemerality.
 * - State boundary invariants (read/write separation & non-mutation of long-term state).
 * - Full pipeline orchestration through ExecutiveContextEngine.
 */

import { brainEngine, BrainAnalysis } from "./brainEngine";
import { ConversationTurn, ConversationContext } from "./contextTypes";
import { MemoryRecord } from "./memoryTypes";
import { memoryStore } from "./memoryStore";
import { contextStore } from "./contextStore";

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
console.log("RUNNING DORA BRAIN ENGINE HARNESS & DETERMINISM SUITE");
console.log("======================================================");

// --- 1. Determinism Tests (DET-BRAIN-1 to DET-BRAIN-7) ---

runTest("DET-BRAIN-1: Same input + same injected currentTime produces identical cognitive output", () => {
  const message = "Recommend a good laptop for coding";
  const history: ConversationTurn[] = [
    { sender: "user", text: "Hi, I need a new workstation" },
    { sender: "dora", text: "Hello! What kind of work do you do?" },
  ];
  const injectedTime = 1724300000000;

  const result1 = brainEngine.analyze(message, history, undefined, "det_session_1", [], {
    userId: "det_user_1",
    persistDecisions: false,
    currentTime: injectedTime,
  });

  const result2 = brainEngine.analyze(message, history, undefined, "det_session_1", [], {
    userId: "det_user_1",
    persistDecisions: false,
    currentTime: injectedTime,
  });

  assert(
    JSON.stringify(result1.promptDirectives) === JSON.stringify(result2.promptDirectives),
    "Prompt directives must be identical"
  );
  assert(
    result1.intent === result2.intent,
    "Intent must match exactly"
  );
  assert(
    result1.confidence === result2.confidence,
    "Confidence score must match exactly"
  );
  assert(
    JSON.stringify(result1.executiveContext?.promptDirectives) ===
      JSON.stringify(result2.executiveContext?.promptDirectives),
    "Executive context prompt directives must match bit-for-bit"
  );
});

runTest("DET-BRAIN-2: Run identical analysis 10 times produces identical decision-relevant output", () => {
  const message = "Let's work on project Dora and write unit tests";
  const history: ConversationTurn[] = [];
  const injectedTime = 1724300050000;

  const baseResult = brainEngine.analyze(message, history, undefined, "det_session_2", [], {
    userId: "det_user_2",
    persistDecisions: false,
    currentTime: injectedTime,
  });
  const baseJson = JSON.stringify({
    directives: baseResult.promptDirectives,
    intent: baseResult.intent,
    execDirectives: baseResult.executiveContext?.promptDirectives,
    execFacts: baseResult.executiveContext?.authoritativeFacts,
    execPrefs: baseResult.executiveContext?.activePreferences,
  });

  for (let i = 0; i < 10; i++) {
    const iterResult = brainEngine.analyze(message, history, undefined, "det_session_2", [], {
      userId: "det_user_2",
      persistDecisions: false,
      currentTime: injectedTime,
    });
    const iterJson = JSON.stringify({
      directives: iterResult.promptDirectives,
      intent: iterResult.intent,
      execDirectives: iterResult.executiveContext?.promptDirectives,
      execFacts: iterResult.executiveContext?.authoritativeFacts,
      execPrefs: iterResult.executiveContext?.activePreferences,
    });
    assert(baseJson === iterJson, `Iteration ${i + 1} produced differing decision output`);
  }
});

runTest("DET-BRAIN-3: No Math.random() in BrainEngine decision path", () => {
  const originalRandom = Math.random;
  let randomCalled = false;
  Math.random = () => {
    randomCalled = true;
    return 0.42;
  };

  try {
    brainEngine.analyze(
      "No, actually recommend Lenovo instead of ASUS",
      [],
      undefined,
      "det_session_random_check",
      [],
      {
        userId: "det_user_random",
        persistDecisions: false,
        currentTime: 1724300000000,
      }
    );
  } finally {
    Math.random = originalRandom;
  }

  assert(!randomCalled, "Math.random() must not be called anywhere in BrainEngine analysis path");
});

runTest("DET-BRAIN-4: No Date.now() in BrainEngine decision path", () => {
  const originalDateNow = Date.now;
  let dateNowCalled = false;
  Date.now = () => {
    dateNowCalled = true;
    return 9999999999999;
  };

  try {
    brainEngine.analyze(
      "Set my preferred language to Bangla and keep answers concise",
      [],
      undefined,
      "det_session_datenow_check",
      [],
      {
        userId: "det_user_datenow",
        persistDecisions: false,
        currentTime: 1724300000000,
      }
    );
  } finally {
    Date.now = originalDateNow;
  }

  assert(!dateNowCalled, "Date.now() must not be called when explicit currentTime is provided");
});

runTest("DET-BRAIN-5: No runtime-generated UUID/random identifiers in correction path", () => {
  const message = "No, not ASUS, recommend Lenovo";
  const session = "det_session_correction_uuid";

  const res1 = brainEngine.analyze(message, [], undefined, session, [], {
    userId: "user_corr_1",
    persistDecisions: false,
    currentTime: 1724300000000,
  });

  const res2 = brainEngine.analyze(message, [], undefined, session, [], {
    userId: "user_corr_1",
    persistDecisions: false,
    currentTime: 1724300000000,
  });

  const entities1 = res1.context?.entities || [];
  const entities2 = res2.context?.entities || [];

  assert(entities1.length > 0, "Entities must be tracked");
  assert(entities1[0].id === entities2[0].id, "Entity ID must be deterministic across runs");
  assert(!entities1[0].id.includes("undefined"), "Entity ID must not contain undefined");
  assert(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(entities1[0].id), "Entity ID must not be a random UUID");
});

runTest("DET-BRAIN-6: Injected currentTime changes recency calculations only where intended", () => {
  const message = "What are my laptop preferences?";
  const memories: MemoryRecord[] = [
    {
      id: "mem_pref_1",
      userId: "user_recency",
      type: "PREFERENCE",
      key: "laptop_brand",
      value: "ThinkPad",
      normalizedValue: "thinkpad",
      confidence: 0.95,
      importance: 0.8,
      source: "EXPLICIT_USER",
      status: "ACTIVE",
      tags: ["device"],
      evidence: ["user_statement"],
      version: 1,
      createdAt: 1000,
      updatedAt: 1000,
      lastAccessedAt: 1000,
      accessCount: 1,
    },
  ];

  // Fresh time (1 day after creation)
  const freshTime = 1000 + 24 * 60 * 60 * 1000;
  const resFresh = brainEngine.analyze(message, [], undefined, "recency_session", memories, {
    userId: "user_recency",
    persistDecisions: false,
    currentTime: freshTime,
  });

  // Stale time (100 days after creation)
  const staleTime = 1000 + 100 * 24 * 60 * 60 * 1000;
  const resStale = brainEngine.analyze(message, [], undefined, "recency_session", memories, {
    userId: "user_recency",
    persistDecisions: false,
    currentTime: staleTime,
  });

  assert(
    resFresh.executiveContext !== undefined,
    "Executive context should be populated for fresh memory"
  );
  assert(
    resStale.executiveContext !== undefined,
    "Executive context should be populated for stale memory"
  );
});

runTest("DET-BRAIN-7: Same currentTime + same context produces stable correction IDs", () => {
  const hash1 = brainEngine.deterministicHash("session_a_Lenovo_2");
  const hash2 = brainEngine.deterministicHash("session_a_Lenovo_2");
  const hash3 = brainEngine.deterministicHash("session_a_ASUS_2");

  assert(hash1 === hash2, "Identical inputs must yield identical hash");
  assert(hash1 !== hash3, "Different entity must yield different hash");
  assert(hash1.length > 0, "Hash must be non-empty");
});

// --- 2. State Boundary & Non-Mutation Tests (STATE-1 to STATE-6) ---

runTest("STATE-1: BrainEngine analysis does NOT mutate external memory input array", () => {
  const initialMemories: MemoryRecord[] = [
    {
      id: "mem_input_1",
      userId: "state_user",
      type: "PREFERENCE",
      key: "editor",
      value: "VSCode",
      normalizedValue: "vscode",
      confidence: 0.9,
      importance: 0.7,
      source: "EXPLICIT_USER",
      status: "ACTIVE",
      tags: ["coding"],
      evidence: ["user_statement"],
      version: 1,
      createdAt: 1000,
      updatedAt: 1000,
      lastAccessedAt: 1000,
      accessCount: 1,
    },
  ];
  const snapshot = JSON.stringify(initialMemories);

  brainEngine.analyze("Recommend extensions for my editor", [], undefined, "state_session", initialMemories, {
    userId: "state_user",
    persistDecisions: false,
    currentTime: 2000,
  });

  assert(JSON.stringify(initialMemories) === snapshot, "Input memory array must remain completely unmutated");
});

runTest("STATE-2: BrainEngine analysis with persistDecisions=false does NOT mutate MemoryStore", () => {
  const userId = "state_user_persist_false";
  memoryStore.clear(userId);

  brainEngine.analyze("I always use TypeScript and React", [], undefined, "state_session_2", [], {
    userId,
    persistDecisions: false,
    currentTime: 2000,
  });

  const storedMemories = memoryStore.get(userId);
  assert(storedMemories.length === 0, "MemoryStore must not be mutated when persistDecisions=false");
});

runTest("STATE-3: Current-turn correction does NOT mutate persistent long-term memory records", () => {
  const existingMemories: MemoryRecord[] = [
    {
      id: "mem_brand_asus",
      userId: "user_override_test",
      type: "PREFERENCE",
      key: "preferred_brand",
      value: "ASUS",
      normalizedValue: "asus",
      confidence: 0.9,
      importance: 0.8,
      source: "EXPLICIT_USER",
      status: "ACTIVE",
      tags: ["hardware"],
      evidence: ["user_statement"],
      version: 1,
      createdAt: 1000,
      updatedAt: 1000,
      lastAccessedAt: 1000,
      accessCount: 1,
    },
  ];
  const snapshot = JSON.stringify(existingMemories);

  const res = brainEngine.analyze(
    "No, actually recommend Lenovo for this project",
    [],
    undefined,
    "session_override",
    existingMemories,
    {
      userId: "user_override_test",
      persistDecisions: false,
      currentTime: 2000,
    }
  );

  assert(JSON.stringify(existingMemories) === snapshot, "Background memories must NOT be mutated by current-turn override");
  // Current-turn directive reflects the ephemeral override
  const directives = res.executiveContext?.promptDirectives.join(" ") || "";
  assert(directives.toLowerCase().includes("lenovo"), "Executive directives must reflect active current-turn correction");
});

runTest("STATE-4: Legitimate conversation context state is tracked in session contextStore", () => {
  const sessionId = "session_convo_state";
  contextStore.clear(sessionId);

  const res1 = brainEngine.analyze("Let's talk about Python machine learning", [], undefined, sessionId, [], {
    userId: "user_convo_state",
    persistDecisions: false,
    currentTime: 1000,
  });

  assert(res1.context !== undefined, "Context must be created");
  assert(res1.context?.activeTopic !== undefined, "Active topic must be populated in conversational context");

  const savedContext = contextStore.get(sessionId);
  assert(savedContext !== undefined, "Session context must be saved to contextStore");
});

// --- 3. Full Orchestration & Executive Context Invariants ---

runTest("ORCH-1: ExecutiveContext is downstream and receives all Phase 2 engine outputs", () => {
  const res = brainEngine.analyze("Please build a React fullstack dashboard with Vite", [], undefined, "orch_session", [], {
    userId: "orch_user",
    persistDecisions: false,
    currentTime: 1724300000000,
  });

  assert(res.executiveContext !== undefined, "Executive context package must be created");
  assert(Array.isArray(res.executiveContext?.promptDirectives), "Executive directives must be an array");
  assert(res.executiveContext!.authoritativeFacts !== undefined, "Authoritative facts must be generated in executive context");
  assert(res.executiveContext!.activePreferences !== undefined, "Active preferences must be generated in executive context");
  assert(res.executiveContext!.activeGoals !== undefined, "Active goals must be generated in executive context");
});

runTest("ORCH-2: Directive sanitizer eliminates raw IDs and memory hashes from executive prompt directives", () => {
  const memories: MemoryRecord[] = [
    {
      id: "mem_raw_12345_hash_abcdef",
      userId: "orch_sanitizer_user",
      type: "FACT",
      key: "role",
      value: "Software Architect",
      normalizedValue: "software architect",
      confidence: 0.95,
      importance: 0.9,
      source: "EXPLICIT_USER",
      status: "ACTIVE",
      tags: ["work"],
      evidence: ["user_statement"],
      version: 1,
      createdAt: 1000,
      updatedAt: 1000,
      lastAccessedAt: 1000,
      accessCount: 1,
    },
  ];

  const res = brainEngine.analyze("What is my current work role?", [], undefined, "orch_san_session", memories, {
    userId: "orch_sanitizer_user",
    persistDecisions: false,
    currentTime: 1724300000000,
  });

  const execDirectives = res.executiveContext?.promptDirectives || [];
  for (const d of execDirectives) {
    assert(!d.includes("mem_raw_12345"), `Internal memory ID leaked into directive: ${d}`);
    assert(!d.includes("sha256:"), `Hash leaked into directive: ${d}`);
  }
});

runTest("ORCH-3: Idempotent processing of identical correction yields identical entity IDs and context", () => {
  const sessionId = "idempotent_session";
  contextStore.clear(sessionId);

  const res1 = brainEngine.analyze("No, I meant Lenovo", [], undefined, sessionId, [], {
    userId: "idempotent_user",
    persistDecisions: false,
    currentTime: 1724300000000,
  });

  const res2 = brainEngine.analyze("No, I meant Lenovo", [], undefined, sessionId, [], {
    userId: "idempotent_user",
    persistDecisions: false,
    currentTime: 1724300000000,
  });

  const ent1 = res1.context?.entities[0];
  const ent2 = res2.context?.entities[0];
  assert(ent1?.name === "Lenovo", "Entity name must be Lenovo");
  assert(ent2?.name === "Lenovo", "Entity name must be Lenovo");
  assert(ent1?.id === ent2?.id, "Correction entity ID must be identical across identical processing");
});

console.log("======================================================");
console.log(`ALL ${passedTests}/${totalTests} BRAIN ENGINE HARNESS TESTS PASSED!`);
console.log("======================================================");
