/**
 * Dora Long-Term Memory Retrieval & Recall Engine Test Suite
 * Phase 2 — Step 2
 */

import { memoryRetrievalEngine } from "./memoryRetrievalEngine";
import { contextStore } from "./contextStore";
import { intentEngine } from "./intentEngine";
import { MemoryRecord } from "./memoryTypes";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runRetrievalTests() {
  console.log("==========================================");
  console.log("RUNNING DORA MEMORY RETRIEVAL ENGINE TEST SUITE");
  console.log("==========================================");

  const baseTime = 1700000000000;

  // Shared test pool of memories
  const sampleMemories: MemoryRecord[] = [
    {
      id: "mem_theme_dark",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preference_ui_theme",
      value: "dark mode",
      normalizedValue: "dark mode",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 90,
      createdAt: baseTime,
      updatedAt: baseTime + 1000,
      lastAccessedAt: baseTime + 1000,
      accessCount: 5,
      status: "ACTIVE",
      tags: ["preference", "ui", "theme", "dark mode"],
      evidence: ["remember dark mode"],
      version: 1,
    },
    {
      id: "mem_laptop_asus",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preference_laptop_brand",
      value: "ASUS",
      normalizedValue: "asus",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 85,
      createdAt: baseTime + 2000,
      updatedAt: baseTime + 2000,
      lastAccessedAt: baseTime + 2000,
      accessCount: 3,
      status: "ACTIVE",
      tags: ["preference", "brand", "laptop", "asus", "gaming laptop"],
      evidence: ["I prefer ASUS"],
      version: 1,
    },
    {
      id: "mem_dev_lang_python",
      userId: "user_1",
      type: "PREFERENCE",
      key: "fav_programming_language",
      value: "Python",
      normalizedValue: "python",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 85,
      createdAt: baseTime + 3000,
      updatedAt: baseTime + 3000,
      lastAccessedAt: baseTime + 3000,
      accessCount: 2,
      status: "ACTIVE",
      tags: ["preference", "programming", "python"],
      evidence: ["remember python"],
      version: 1,
    },
    {
      id: "mem_goal_ml",
      userId: "user_1",
      type: "GOAL",
      key: "learning_goal",
      value: "Mastering Large Language Models and Machine Learning",
      normalizedValue: "mastering large language models and machine learning",
      source: "EXPLICIT_USER",
      confidence: 0.95,
      importance: 90,
      createdAt: baseTime + 4000,
      updatedAt: baseTime + 4000,
      lastAccessedAt: baseTime + 4000,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["goal", "learning", "ai", "machine learning"],
      evidence: ["My goal is to learn ML"],
      version: 1,
    },
    {
      id: "mem_project_dora",
      userId: "user_1",
      type: "PROJECT_CONTEXT",
      key: "project_dora",
      value: "Dora AI Voice Assistant system",
      normalizedValue: "dora ai voice assistant system",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 95,
      createdAt: baseTime + 5000,
      updatedAt: baseTime + 5000,
      lastAccessedAt: baseTime + 5000,
      accessCount: 10,
      status: "ACTIVE",
      tags: ["project", "dora", "ai_assistant"],
      evidence: ["Dora is my long-term project"],
      version: 1,
    },
    {
      id: "mem_hobby_football",
      userId: "user_1",
      type: "FACT",
      key: "user_hobby",
      value: "Plays football on weekends",
      normalizedValue: "plays football on weekends",
      source: "EXPLICIT_USER",
      confidence: 0.9,
      importance: 60,
      createdAt: baseTime + 6000,
      updatedAt: baseTime + 6000,
      lastAccessedAt: baseTime + 6000,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["hobby", "sports", "football"],
      evidence: ["I like football"],
      version: 1,
    },
  ];

  // TEST 1 — Exact Relevant Memory Retrieval
  console.log("\nTEST 1 — Exact relevant memory retrieval:");
  {
    const context = contextStore.getOrCreate("ret-test-1");
    context.activeTopic = "programming";
    const intent = intentEngine.classifyIntent("What programming language should I use for machine learning?", [], context);

    const analysis = memoryRetrievalEngine.retrieve({
      message: "What programming language should I use for machine learning?",
      context,
      intent,
      memories: sampleMemories,
    });

    assert(analysis.retrievedMemories.length > 0, "Retrieved memories for ML programming query");
    assert(analysis.retrievedMemories.some((m) => m.memoryId === "mem_dev_lang_python"), "Retrieved Python preference");
    assert(analysis.contextString.includes("Python"), "Context string contains Python");
  }

  // TEST 2 — Irrelevant Memory Exclusion
  console.log("\nTEST 2 — Irrelevant memory exclusion:");
  {
    const context = contextStore.getOrCreate("ret-test-2");
    context.activeTopic = "weather inquiry";
    const intent = intentEngine.classifyIntent("What's the weather in Dhaka tomorrow?", [], context);

    const analysis = memoryRetrievalEngine.retrieve({
      message: "What's the weather in Dhaka tomorrow?",
      context,
      intent,
      memories: sampleMemories,
    });

    assert(!analysis.retrievedMemories.some((m) => m.memoryId === "mem_hobby_football"), "Did not inject football hobby for weather query");
    assert(!analysis.retrievedMemories.some((m) => m.memoryId === "mem_laptop_asus"), "Did not inject laptop preference for weather query");
  }

  // TEST 3 — Topic-Aware Retrieval
  console.log("\nTEST 3 — Topic-aware retrieval:");
  {
    const context = contextStore.getOrCreate("ret-test-3");
    context.activeTopic = "gaming laptop";
    context.currentTask = "purchase_research";
    const intent = intentEngine.classifyIntent("Which model should I buy under 90k?", [], context);

    const analysis = memoryRetrievalEngine.retrieve({
      message: "Which model should I buy under 90k?",
      context,
      intent,
      memories: sampleMemories,
    });

    assert(analysis.retrievedMemories.some((m) => m.memoryId === "mem_laptop_asus"), "Retrieved ASUS preference when researching gaming laptops");
    assert(analysis.directives.some((d) => d.includes("ASUS")), "Directive applies ASUS preference");
  }

  // TEST 4 — Entity-Aware Retrieval
  console.log("\nTEST 4 — Entity-aware retrieval:");
  {
    const context = contextStore.getOrCreate("ret-test-4");
    context.entities = [{ id: "ent_legion", name: "Lenovo Legion", type: "product", role: "primary", firstMentionedTurn: 1, lastMentionedTurn: 1, mentionCount: 1, status: "active" }];

    const ownedLaptopMemory: MemoryRecord = {
      id: "mem_owned_legion",
      userId: "user_1",
      type: "FACT",
      key: "owned_device",
      value: "Lenovo Legion 5 Pro",
      normalizedValue: "lenovo legion 5 pro",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 90,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 2,
      status: "ACTIVE",
      tags: ["device", "laptop", "lenovo legion"],
      evidence: ["I have a Lenovo Legion"],
      version: 1,
    };

    const analysis = memoryRetrievalEngine.retrieve({
      message: "What about my laptop's battery health?",
      context,
      intent: intentEngine.classifyIntent("What about my laptop's battery health?", [], context),
      memories: [...sampleMemories, ownedLaptopMemory],
    });

    assert(analysis.retrievedMemories.some((m) => m.memoryId === "mem_owned_legion"), "Retrieved owned Lenovo Legion memory based on entity match");
  }

  // TEST 5 — Intent-Aware Retrieval
  console.log("\nTEST 5 — Intent-aware retrieval (Recommendation intent boosts preferences):");
  {
    const context = contextStore.getOrCreate("ret-test-5");
    context.activeTopic = "laptop";
    const intent = intentEngine.classifyIntent("Give me some laptop recommendations.", [], context);

    const analysis = memoryRetrievalEngine.retrieve({
      message: "Give me some laptop recommendations.",
      context,
      intent,
      memories: sampleMemories,
    });

    assert(analysis.retrievedMemories.some((m) => m.memoryType === "PREFERENCE"), "Retrieved preference for recommendation intent");
    assert(analysis.retrievedMemories[0].memoryId === "mem_laptop_asus", "Top retrieved memory is ASUS laptop preference");
  }

  // TEST 6 — User Preference Retrieval
  console.log("\nTEST 6 — User preference retrieval:");
  {
    const context = contextStore.getOrCreate("ret-test-6");
    const intent = intentEngine.classifyIntent("Can we switch to dark theme?", [], context);

    const analysis = memoryRetrievalEngine.retrieve({
      message: "Can we switch to dark theme?",
      context,
      intent,
      memories: sampleMemories,
    });

    assert(analysis.retrievedMemories.some((m) => m.memoryId === "mem_theme_dark"), "Retrieved dark mode preference");
  }

  // TEST 7 — User Goal Retrieval
  console.log("\nTEST 7 — User goal retrieval:");
  {
    const context = contextStore.getOrCreate("ret-test-7");
    context.activeTopic = "machine learning career";
    const intent = intentEngine.classifyIntent("What study roadmap should I follow for my career goal?", [], context);

    const analysis = memoryRetrievalEngine.retrieve({
      message: "What study roadmap should I follow for my career goal?",
      context,
      intent,
      memories: sampleMemories,
    });

    assert(analysis.retrievedMemories.some((m) => m.memoryId === "mem_goal_ml"), "Retrieved ML learning goal");
  }

  // TEST 8 — Project Context Retrieval
  console.log("\nTEST 8 — Project context retrieval:");
  {
    const context = contextStore.getOrCreate("ret-test-8");
    const intent = intentEngine.classifyIntent("How should we design the architecture for Dora?", [], context);

    const analysis = memoryRetrievalEngine.retrieve({
      message: "How should we design the architecture for Dora?",
      context,
      intent,
      memories: sampleMemories,
    });

    assert(analysis.retrievedMemories.some((m) => m.memoryId === "mem_project_dora"), "Retrieved project_dora context");
  }

  // TEST 9 — Explicit Memory Reference
  console.log("\nTEST 9 — Explicit memory reference (English):");
  {
    const context = contextStore.getOrCreate("ret-test-9");
    const intent = intentEngine.classifyIntent("What did I tell you before about my laptop brand preference?", [], context);

    const analysis = memoryRetrievalEngine.retrieve({
      message: "What did I tell you before about my laptop brand preference?",
      context,
      intent,
      memories: sampleMemories,
    });

    assert(analysis.isExplicitRequest === true, "Identified isExplicitRequest = true");
    assert(analysis.retrievedMemories[0].memoryId === "mem_laptop_asus", "Recalled ASUS laptop preference with high priority");
  }

  // TEST 10 — Banglish Memory Reference
  console.log("\nTEST 10 — Banglish memory reference:");
  {
    const context = contextStore.getOrCreate("ret-test-10");
    const intent = intentEngine.classifyIntent("Amar oi laptop preference ta ki mone ase?", [], context);

    const analysis = memoryRetrievalEngine.retrieve({
      message: "Amar oi laptop preference ta ki mone ase?",
      context,
      intent,
      memories: sampleMemories,
    });

    assert(analysis.isExplicitRequest === true, "Identified Banglish explicit reference");
    assert(analysis.retrievedMemories.some((m) => m.memoryId === "mem_laptop_asus"), "Recalled ASUS laptop memory for Banglish query");
  }

  // TEST 11 — Bangla Memory Reference
  console.log("\nTEST 11 — Bangla memory reference:");
  {
    const context = contextStore.getOrCreate("ret-test-11");
    const intent = intentEngine.classifyIntent("আমি আগে ল্যাপটপ ব্র্যান্ড নিয়ে কী বলেছিলাম?", [], context);

    const analysis = memoryRetrievalEngine.retrieve({
      message: "আমি আগে ল্যাপটপ ব্র্যান্ড নিয়ে কী বলেছিলাম?",
      context,
      intent,
      memories: sampleMemories,
    });

    assert(analysis.retrievedMemories.some((m) => m.memoryId === "mem_laptop_asus"), "Recalled ASUS preference for Bangla inquiry");
  }

  // TEST 12 — Superseded Memory Exclusion
  console.log("\nTEST 12 — Superseded memory exclusion:");
  {
    const context = contextStore.getOrCreate("ret-test-12");
    context.activeTopic = "laptop";

    const oldAsus: MemoryRecord = {
      id: "mem_old_asus",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preference_laptop_brand",
      value: "ASUS",
      normalizedValue: "asus",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 80,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["laptop"],
      evidence: ["old pref"],
      version: 1,
    };

    const newLenovo: MemoryRecord = {
      id: "mem_new_lenovo",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preference_laptop_brand",
      value: "Lenovo",
      normalizedValue: "lenovo",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 90,
      createdAt: baseTime + 10000,
      updatedAt: baseTime + 10000,
      lastAccessedAt: baseTime + 10000,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["laptop"],
      evidence: ["actually I prefer Lenovo"],
      supersedes: "mem_old_asus",
      version: 2,
    };

    const analysis = memoryRetrievalEngine.retrieve({
      message: "Recommend me a laptop.",
      context,
      intent: intentEngine.classifyIntent("Recommend me a laptop.", [], context),
      memories: [oldAsus, newLenovo],
    });

    assert(!analysis.retrievedMemories.some((m) => m.memoryId === "mem_old_asus"), "Excluded superseded ASUS memory");
    assert(analysis.retrievedMemories.some((m) => m.memoryId === "mem_new_lenovo"), "Retrieved active new Lenovo memory");
    assert(analysis.excludedCount.superseded > 0, "Recorded superseded count");
  }

  // TEST 13 — Conflicting Memory Handling
  console.log("\nTEST 13 — Conflicting memory handling (same key without explicit link):");
  {
    const context = contextStore.getOrCreate("ret-test-13");
    context.activeTopic = "laptop";

    const mem1: MemoryRecord = {
      id: "mem_conflict_1",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preference_laptop_brand",
      value: "ASUS",
      normalizedValue: "asus",
      source: "EXPLICIT_USER",
      confidence: 0.8,
      importance: 70,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["laptop"],
      evidence: ["pref asus"],
      version: 1,
    };

    const mem2: MemoryRecord = {
      id: "mem_conflict_2",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preference_laptop_brand",
      value: "Lenovo",
      normalizedValue: "lenovo",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 90,
      createdAt: baseTime + 5000,
      updatedAt: baseTime + 5000,
      lastAccessedAt: baseTime + 5000,
      accessCount: 2,
      status: "ACTIVE",
      tags: ["laptop"],
      evidence: ["pref lenovo"],
      version: 1,
    };

    const analysis = memoryRetrievalEngine.retrieve({
      message: "Which laptop brand should I check?",
      context,
      intent: intentEngine.classifyIntent("Which laptop brand should I check?", [], context),
      memories: [mem1, mem2],
    });

    assert(analysis.retrievedMemories.length === 1, "Only one resolved brand preference retrieved");
    assert(analysis.retrievedMemories[0].memory.value === "Lenovo", "Resolved in favor of higher confidence/importance Lenovo");
    assert(analysis.conflictsDetected.length > 0, "Conflict detected and logged");
  }

  // TEST 14 — Sensitive Memory Filtering
  console.log("\nTEST 14 — Sensitive memory filtering:");
  {
    const context = contextStore.getOrCreate("ret-test-14");

    const sensitiveMemory: MemoryRecord = {
      id: "mem_leak_password",
      userId: "user_1",
      type: "FACT",
      key: "user_password",
      value: "Password123!",
      normalizedValue: "password123!",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 100,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["credentials"],
      evidence: ["password is Password123!"],
      version: 1,
    };

    const analysis = memoryRetrievalEngine.retrieve({
      message: "What is my account password?",
      context,
      intent: intentEngine.classifyIntent("What is my account password?", [], context),
      memories: [...sampleMemories, sensitiveMemory],
    });

    assert(!analysis.retrievedMemories.some((m) => m.memoryId === "mem_leak_password"), "Filtered out sensitive password memory");
    assert(!analysis.contextString.includes("Password123!"), "Context string is completely clean of passwords");
    assert(analysis.excludedCount.sensitive > 0, "Recorded sensitive exclusion count");
  }

  // TEST 15 — Top-K Limit
  console.log("\nTEST 15 — Top-K retrieval limit enforcement:");
  {
    const context = contextStore.getOrCreate("ret-test-15");
    context.activeTopic = "general";

    const tenMemories: MemoryRecord[] = Array.from({ length: 12 }, (_, i) => ({
      id: `mem_bulk_${i}`,
      userId: "user_1",
      type: "FACT",
      key: `bulk_fact_${i}`,
      value: `Fact description number ${i}`,
      normalizedValue: `fact description number ${i}`,
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 80,
      createdAt: baseTime + i * 100,
      updatedAt: baseTime + i * 100,
      lastAccessedAt: baseTime + i * 100,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["fact", "general"],
      evidence: [`fact ${i}`],
      version: 1,
    }));

    const analysis = memoryRetrievalEngine.retrieve({
      message: "Tell me general facts",
      context,
      intent: intentEngine.classifyIntent("Tell me general facts", [], context),
      memories: tenMemories,
      options: { topK: 4 },
    });

    assert(analysis.retrievedMemories.length <= 4, `Enforced topK = 4 (got: ${analysis.retrievedMemories.length})`);
  }

  // TEST 16 — Duplicate Suppression
  console.log("\nTEST 16 — Duplicate suppression:");
  {
    const context = contextStore.getOrCreate("ret-test-16");
    context.activeTopic = "laptop";

    const dup1: MemoryRecord = {
      id: "mem_dup_1",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preference_laptop_brand",
      value: "ASUS",
      normalizedValue: "asus",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 80,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["laptop"],
      evidence: ["pref asus 1"],
      version: 1,
    };

    const dup2: MemoryRecord = {
      id: "mem_dup_2",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preference_laptop_brand",
      value: "ASUS",
      normalizedValue: "asus",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 85,
      createdAt: baseTime + 1000,
      updatedAt: baseTime + 1000,
      lastAccessedAt: baseTime + 1000,
      accessCount: 2,
      status: "ACTIVE",
      tags: ["laptop"],
      evidence: ["pref asus 2"],
      version: 1,
    };

    const analysis = memoryRetrievalEngine.retrieve({
      message: "Suggest a gaming laptop.",
      context,
      intent: intentEngine.classifyIntent("Suggest a gaming laptop.", [], context),
      memories: [dup1, dup2],
    });

    assert(analysis.retrievedMemories.length === 1, "Suppressed duplicate memory for same key and value");
    assert(analysis.excludedCount.duplicate > 0, "Recorded duplicate count");
  }

  // TEST 17 — Topic Switch Isolation
  console.log("\nTEST 17 — Topic switch isolation:");
  {
    const context = contextStore.getOrCreate("ret-test-17");
    context.activeTopic = "weather inquiry";
    context.isTopicSwitched = true;
    context.archivedContexts = [
      {
        topic: "gaming laptop",
        task: "purchase_research",
        goal: null,
        entities: [{ id: "ent_tuf", name: "ASUS TUF", type: "product", role: "primary", firstMentionedTurn: 1, lastMentionedTurn: 1, mentionCount: 1, status: "active" }],
        constraints: [],
        endedAt: baseTime,
        endedAtTurn: 2,
      },
    ];

    const analysis = memoryRetrievalEngine.retrieve({
      message: "Is it raining outside?",
      context,
      intent: intentEngine.classifyIntent("Is it raining outside?", [], context),
      memories: sampleMemories,
    });

    assert(!analysis.retrievedMemories.some((m) => m.memoryId === "mem_laptop_asus"), "Laptop memory isolated and excluded after topic switch to weather");
  }

  // TEST 18 — No Hallucinated Memory
  console.log("\nTEST 18 — No hallucinated memory:");
  {
    const context = contextStore.getOrCreate("ret-test-18");
    context.activeTopic = "crypto trading";

    const analysis = memoryRetrievalEngine.retrieve({
      message: "What crypto coins do I own?",
      context,
      intent: intentEngine.classifyIntent("What crypto coins do I own?", [], context),
      memories: sampleMemories,
    });

    assert(analysis.retrievedMemories.length === 0, "Did not hallucinate any crypto ownership memory");
    assert(analysis.contextString === "", "Empty context string returned for non-existent memories");
  }

  // TEST 19 — Low-Confidence Candidate Handling
  console.log("\nTEST 19 — Low-confidence candidate handling:");
  {
    const context = contextStore.getOrCreate("ret-test-19");
    context.activeTopic = "gaming laptop";

    const candidateMemory: MemoryRecord = {
      id: "mem_candidate_1",
      userId: "user_1",
      type: "CANDIDATE",
      key: "interest_gaming_laptops",
      value: "Potential interest in high-end gaming laptops",
      normalizedValue: "potential interest in high-end gaming laptops",
      source: "INFERRED",
      confidence: 0.6,
      importance: 50,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 1,
      status: "CANDIDATE",
      tags: ["candidate", "gaming laptop"],
      evidence: ["Repeated inquiries"],
      version: 1,
    };

    const analysis = memoryRetrievalEngine.retrieve({
      message: "Tell me about RTX 4080 laptops",
      context,
      intent: intentEngine.classifyIntent("Tell me about RTX 4080 laptops", [], context),
      memories: [candidateMemory],
    });

    assert(analysis.retrievedMemories.length === 1, "Retrieved candidate memory");
    assert(analysis.retrievedMemories[0].isLowConfidenceInferred === true, "Flagged isLowConfidenceInferred = true");
    assert(analysis.contextString.includes("INFERRED INTEREST"), "Context string explicitly formats candidate as inferred interest, not confirmed fact");
  }

  // TEST 20 — Recency vs Importance Ranking
  console.log("\nTEST 20 — Recency vs importance ranking:");
  {
    const context = contextStore.getOrCreate("ret-test-20");
    context.activeTopic = "ui";

    const olderHighImportance: MemoryRecord = {
      id: "mem_important_old",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preference_ui_theme",
      value: "dark mode",
      normalizedValue: "dark mode",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 95,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 10,
      status: "ACTIVE",
      tags: ["theme", "ui"],
      evidence: ["I need dark mode"],
      version: 1,
    };

    const newerLowImportance: MemoryRecord = {
      id: "mem_unimportant_new",
      userId: "user_1",
      type: "FACT",
      key: "random_ui_comment",
      value: "once viewed a light theme mockup",
      normalizedValue: "once viewed a light theme mockup",
      source: "INFERRED",
      confidence: 0.7,
      importance: 25,
      createdAt: baseTime + 100000,
      updatedAt: baseTime + 100000,
      lastAccessedAt: baseTime + 100000,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["theme", "ui"],
      evidence: ["viewed mockup"],
      version: 1,
    };

    const analysis = memoryRetrievalEngine.retrieve({
      message: "Set up the UI for me.",
      context,
      intent: intentEngine.classifyIntent("Set up the UI for me.", [], context),
      memories: [olderHighImportance, newerLowImportance],
    });

    assert(analysis.retrievedMemories[0].memoryId === "mem_important_old", "High-importance dark theme outranks newer trivial comment");
  }

  // TEST 21 — Multi-Memory Retrieval
  console.log("\nTEST 21 — Multi-memory retrieval:");
  {
    const context = contextStore.getOrCreate("ret-test-21");
    context.activeTopic = "machine learning and programming";
    const intent = intentEngine.classifyIntent("I want to continue my machine learning studies in Python", [], context);

    const analysis = memoryRetrievalEngine.retrieve({
      message: "I want to continue my machine learning studies in Python",
      context,
      intent,
      memories: sampleMemories,
    });

    assert(analysis.retrievedMemories.length >= 2, "Retrieved both relevant memories");
    assert(analysis.retrievedMemories.some((m) => m.memoryId === "mem_dev_lang_python"), "Retrieved Python preference");
    assert(analysis.retrievedMemories.some((m) => m.memoryId === "mem_goal_ml"), "Retrieved ML goal");
  }

  // TEST 22 — Zero Relevant Memory Result
  console.log("\nTEST 22 — Zero relevant memory result:");
  {
    const context = contextStore.getOrCreate("ret-test-22");
    context.activeTopic = "culinary recipes";

    const analysis = memoryRetrievalEngine.retrieve({
      message: "How do I bake sourdough bread?",
      context,
      intent: intentEngine.classifyIntent("How do I bake sourdough bread?", [], context),
      memories: sampleMemories,
    });

    assert(analysis.retrievedMemories.length === 0, "No irrelevant memories forced into result");
    assert(analysis.contextString === "", "Empty context string when no memories match");
  }

  // TEST 23 — Ambiguous Memory Reference
  console.log("\nTEST 23 — Ambiguous memory reference:");
  {
    const context = contextStore.getOrCreate("ret-test-23");
    context.activeTopic = ""; // zero antecedent context

    const analysis = memoryRetrievalEngine.retrieve({
      message: "Amar oi preference ta ki?",
      context,
      intent: intentEngine.classifyIntent("Amar oi preference ta ki?", [], context),
      memories: sampleMemories,
    });

    assert(analysis.requiresClarification === true, "Flagged requiresClarification = true for ambiguous memory reference");
    assert(analysis.clarificationPrompt !== undefined, "Provided clarification prompt to ask user which preference");
  }

  // TEST 24 — Safe Broad Profile Retrieval ("What do you remember about me?")
  console.log("\nTEST 24 — Safe broad profile retrieval:");
  {
    const context = contextStore.getOrCreate("ret-test-24");
    const intent = intentEngine.classifyIntent("What do you remember about me?", [], context);

    const analysis = memoryRetrievalEngine.retrieve({
      message: "What do you remember about me?",
      context,
      intent,
      memories: sampleMemories,
    });

    assert(analysis.isBroadProfileQuery === true, "Identified isBroadProfileQuery = true");
    assert(analysis.retrievedMemories.length >= 4, "Retrieved full safe profile memories");
    assert(analysis.directives.some((d) => d.includes("SAFE_MEMORY_SUMMARY")), "Generated SAFE_MEMORY_SUMMARY directive");
  }

  console.log("\n==========================================");
  console.log("ALL 24 MEMORY RETRIEVAL TESTS PASSED!");
  console.log("==========================================");
}

runRetrievalTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
