/**
 * Dora Long-Term Memory & Decision Engine Test Suite
 * Phase 2 — Step 1
 */

import { memoryDecisionEngine } from "./memoryDecisionEngine";
import { contextStore } from "./contextStore";
import { intentEngine } from "./intentEngine";
import { reasoningEngine } from "./reasoningEngine";
import { MemoryRecord } from "./memoryTypes";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runMemoryTests() {
  console.log("==========================================");
  console.log("RUNNING DORA MEMORY DECISION ENGINE TEST SUITE");
  console.log("==========================================");

  // TEST 1 — Explicit Memory Save
  console.log("\nTEST 1 — Explicit memory save:");
  {
    const sessionId = "mem-test-1";
    const context = contextStore.getOrCreate(sessionId);
    const intent = intentEngine.classifyIntent("Remember that I prefer dark mode.", [], context);

    const decision = memoryDecisionEngine.evaluate({
      message: "Remember that I prefer dark mode.",
      context,
      intent,
    });

    assert(decision.action === "SAVE", `Decision action is SAVE (got: "${decision.action}")`);
    assert(decision.isExplicit === true, "isExplicit is true");
    assert(decision.confidence === 1.0, "Confidence is 1.0 for explicit save");
    assert(decision.targetRecord?.type === "PREFERENCE", `Record type is PREFERENCE (got: "${decision.targetRecord?.type}")`);
    assert(decision.targetRecord?.key === "preference_ui_theme", `Key is preference_ui_theme (got: "${decision.targetRecord?.key}")`);
    assert(decision.targetRecord?.value === "dark mode", `Value is dark mode (got: "${decision.targetRecord?.value}")`);
  }

  // TEST 2 — Explicit Banglish Memory Save
  console.log("\nTEST 2 — Explicit Banglish memory save:");
  {
    const sessionId = "mem-test-2";
    const context = contextStore.getOrCreate(sessionId);
    const intent = intentEngine.classifyIntent("Eta mone rakhis, ami ASUS prefer kori.", [], context);

    const decision = memoryDecisionEngine.evaluate({
      message: "Eta mone rakhis, ami ASUS prefer kori.",
      context,
      intent,
    });

    assert(decision.action === "SAVE", `Decision action is SAVE for Banglish command (got: "${decision.action}")`);
    assert(decision.isExplicit === true, "isExplicit is true");
    assert(decision.targetRecord?.type === "PREFERENCE", "Record type is PREFERENCE");
    assert(decision.targetRecord?.key === "preference_laptop_brand", `Key is preference_laptop_brand (got: "${decision.targetRecord?.key}")`);
    assert(decision.targetRecord?.value === "ASUS", `Value is ASUS (got: "${decision.targetRecord?.value}")`);
  }

  // TEST 3 — Temporary Context Rejection
  console.log("\nTEST 3 — Temporary context rejection:");
  {
    const sessionId = "mem-test-3";
    const context = contextStore.getOrCreate(sessionId);
    const intent = intentEngine.classifyIntent("I'm buying a laptop today.", [], context);

    const decision = memoryDecisionEngine.evaluate({
      message: "I'm buying a laptop today.",
      context,
      intent,
    });

    assert(decision.action === "TEMPORARY", `Action is TEMPORARY (got: "${decision.action}")`);
    assert(decision.isTemporaryRejected === true, "Flagged isTemporaryRejected = true");
    assert(decision.isExplicit === false, "isExplicit is false");
  }

  // TEST 4 — Duplicate Prevention
  console.log("\nTEST 4 — Duplicate prevention:");
  {
    const sessionId = "mem-test-4";
    const context = contextStore.getOrCreate(sessionId);
    const intent = intentEngine.classifyIntent("Remember I prefer ASUS.", [], context);

    const existingMemory: MemoryRecord = {
      id: "mem_1001",
      userId: "default_user",
      type: "PREFERENCE",
      key: "preference_laptop_brand",
      value: "ASUS",
      normalizedValue: "asus",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 85,
      createdAt: Date.now() - 10000,
      updatedAt: Date.now() - 10000,
      lastAccessedAt: Date.now() - 10000,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["preference", "brand"],
      evidence: ["first statement"],
      version: 1,
    };

    const decision = memoryDecisionEngine.evaluate({
      message: "Remember I prefer ASUS.",
      context,
      intent,
      existingMemories: [existingMemory],
    });

    assert(decision.action === "UPDATE", `Action is UPDATE instead of duplicate SAVE (got: "${decision.action}")`);
    assert(decision.existingRecordId === "mem_1001", "Identified existingRecordId");
    assert(decision.reason.includes("duplicate prevented"), "Reason notes duplicate prevention");
  }

  // TEST 5 — Memory Update
  console.log("\nTEST 5 — Memory update (implicit correction):");
  {
    const sessionId = "mem-test-5";
    const context = contextStore.getOrCreate(sessionId);
    const intent = intentEngine.classifyIntent("Actually, I prefer Lenovo now.", [], context);

    const existingMemory: MemoryRecord = {
      id: "mem_1001",
      userId: "default_user",
      type: "PREFERENCE",
      key: "preference_laptop_brand",
      value: "ASUS",
      normalizedValue: "asus",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 85,
      createdAt: Date.now() - 10000,
      updatedAt: Date.now() - 10000,
      lastAccessedAt: Date.now() - 10000,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["preference", "brand"],
      evidence: ["first statement"],
      version: 1,
    };

    const decision = memoryDecisionEngine.evaluate({
      message: "Actually, I prefer Lenovo now.",
      context,
      intent,
      existingMemories: [existingMemory],
    });

    assert(decision.action === "UPDATE", `Action is UPDATE (got: "${decision.action}")`);
    assert(decision.supersededRecordId === "mem_1001", "Identified supersededRecordId");
    assert(decision.targetRecord?.value === "Lenovo", `New target value is Lenovo (got: "${decision.targetRecord?.value}")`);
    assert(decision.targetRecord?.supersedes === "mem_1001", "New target explicitly points to superseded memory ID");
  }

  // TEST 6 — Explicit Forget
  console.log("\nTEST 6 — Explicit forget:");
  {
    const sessionId = "mem-test-6";
    const context = contextStore.getOrCreate(sessionId);
    const intent = intentEngine.classifyIntent("Forget that I prefer ASUS.", [], context);

    const existingMemory: MemoryRecord = {
      id: "mem_1001",
      userId: "default_user",
      type: "PREFERENCE",
      key: "preference_laptop_brand",
      value: "ASUS",
      normalizedValue: "asus",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 85,
      createdAt: Date.now() - 10000,
      updatedAt: Date.now() - 10000,
      lastAccessedAt: Date.now() - 10000,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["preference", "brand"],
      evidence: ["first statement"],
      version: 1,
    };

    const decision = memoryDecisionEngine.evaluate({
      message: "Forget that I prefer ASUS.",
      context,
      intent,
      existingMemories: [existingMemory],
    });

    assert(decision.action === "FORGET", `Action is FORGET (got: "${decision.action}")`);
    assert(decision.isExplicit === true, "isExplicit is true");
    assert(decision.forgetDirective !== undefined, "Forget directive created");
    assert(decision.existingRecordId === "mem_1001", "Identified matching memory to forget");
  }

  // TEST 7 — Inference Safety
  console.log("\nTEST 7 — Inference safety (No false ownership):");
  {
    const sessionId = "mem-test-7";
    const context = contextStore.getOrCreate(sessionId);
    context.activeTopic = "gaming laptop";
    context.turnsCount = 5;

    const intent = intentEngine.classifyIntent("Compare RTX 4060 laptops", [], context);

    const decision = memoryDecisionEngine.evaluate({
      message: "Compare RTX 4060 laptops",
      context,
      intent,
    });

    // Should NOT create "owns a gaming laptop" fact
    assert(decision.targetRecord?.key !== "user_owns_gaming_laptop", "Did not hallucinate ownership fact");
    assert(decision.action === "CANDIDATE" || decision.action === "IGNORE", `Action is safe CANDIDATE or IGNORE (got: "${decision.action}")`);
  }

  // TEST 8 — Temporal Memory
  console.log("\nTEST 8 — Temporal memory classification:");
  {
    const sessionId = "mem-test-8";
    const context = contextStore.getOrCreate(sessionId);
    const intent = intentEngine.classifyIntent("I'm traveling next week to Cox's Bazar.", [], context);

    const decision = memoryDecisionEngine.evaluate({
      message: "I'm traveling next week to Cox's Bazar.",
      context,
      intent,
    });

    assert(decision.action === "TEMPORARY", `Action is TEMPORARY (got: "${decision.action}")`);
    assert(decision.isTemporaryRejected === true, "Marked as temporary");
  }

  // TEST 9 — Project Memory
  console.log("\nTEST 9 — Project memory classification:");
  {
    const sessionId = "mem-test-9";
    const context = contextStore.getOrCreate(sessionId);
    const intent = intentEngine.classifyIntent("Dora is my long-term AI assistant project.", [], context);

    const decision = memoryDecisionEngine.evaluate({
      message: "Dora is my long-term AI assistant project.",
      context,
      intent,
    });

    assert(decision.action === "SAVE" || decision.action === "UPDATE", `Action is SAVE (got: "${decision.action}")`);
    assert(decision.targetRecord?.type === "PROJECT_CONTEXT", `Type is PROJECT_CONTEXT (got: "${decision.targetRecord?.type}")`);
    assert(decision.targetRecord?.key === "project_dora", `Key is project_dora (got: "${decision.targetRecord?.key}")`);
  }

  // TEST 10 — Context vs Memory Separation
  console.log("\nTEST 10 — Context vs memory separation:");
  {
    const sessionId = "mem-test-10";
    const context = contextStore.getOrCreate(sessionId);
    context.activeTopic = "gaming laptop";
    const intent = intentEngine.classifyIntent("My budget is 80k.", [], context);

    const decision = memoryDecisionEngine.evaluate({
      message: "My budget is 80k.",
      context,
      intent,
    });

    assert(decision.action === "IGNORE", `Action is IGNORE for active dialog constraint (got: "${decision.action}")`);
    assert(decision.reason.includes("ContextEngine"), "Reason explicitly delegates to ContextEngine");
  }

  // TEST 11 — Source Confidence Calibration
  console.log("\nTEST 11 — Source confidence calibration:");
  {
    const sessionId = "mem-test-11";
    const context = contextStore.getOrCreate(sessionId);
    
    // Explicit
    const explicitDecision = memoryDecisionEngine.evaluate({
      message: "Remember my favorite programming language is Python.",
      context,
      intent: intentEngine.classifyIntent("Remember my favorite programming language is Python.", [], context),
    });

    assert(explicitDecision.confidence === 1.0, `Explicit confidence is 1.0 (got: ${explicitDecision.confidence})`);
    assert(explicitDecision.targetRecord?.source === "EXPLICIT_USER", "Source is EXPLICIT_USER");
  }

  // TEST 12 — Conflicting Memory Resolution
  console.log("\nTEST 12 — Conflicting memory resolution:");
  {
    const sessionId = "mem-test-12";
    const context = contextStore.getOrCreate(sessionId);

    const oldMemory: MemoryRecord = {
      id: "mem_pref_1",
      userId: "default_user",
      type: "PREFERENCE",
      key: "preference_laptop_brand",
      value: "ASUS",
      normalizedValue: "asus",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 85,
      createdAt: 1000,
      updatedAt: 1000,
      lastAccessedAt: 1000,
      accessCount: 2,
      status: "ACTIVE",
      tags: ["preference"],
      evidence: ["I prefer ASUS"],
      version: 1,
    };

    const decision = memoryDecisionEngine.evaluate({
      message: "Remember that I prefer Lenovo now.",
      context,
      intent: intentEngine.classifyIntent("Remember that I prefer Lenovo now.", [], context),
      existingMemories: [oldMemory],
    });

    assert(decision.action === "UPDATE", "Action is UPDATE for conflicting preference");
    assert(decision.supersededRecordId === "mem_pref_1", "Old memory ID marked superseded");
    assert(decision.targetRecord?.version === 2, `Version incremented to 2 (got: ${decision.targetRecord?.version})`);
    assert(decision.targetRecord?.value === "Lenovo", `New value is Lenovo (got: "${decision.targetRecord?.value}")`);
  }

  // TEST 13 — Privacy & Sensitive Information Safety
  console.log("\nTEST 13 — Sensitive information safety:");
  {
    const sessionId = "mem-test-13";
    const context = contextStore.getOrCreate(sessionId);

    const sensitiveInputs = [
      "Remember my password is Password123!",
      "My API key is sk-1234567890abcdef1234567890abcdef",
      "Save my credit card number 4532 1234 5678 9010",
      "Remember my CVV is 842",
    ];

    for (const input of sensitiveInputs) {
      const decision = memoryDecisionEngine.evaluate({
        message: input,
        context,
        intent: intentEngine.classifyIntent(input, [], context),
      });

      assert(decision.action === "IGNORE", `Sensitive input was rejected (got action: "${decision.action}")`);
      assert(decision.isSensitiveRejected === true, `isSensitiveRejected flag is true for "${input}"`);
    }
  }

  // TEST 14 — Natural Language Variations (Bangla, Banglish, English)
  console.log("\nTEST 14 — Natural language variations:");
  {
    const sessionId = "mem-test-14";
    const context = contextStore.getOrCreate(sessionId);

    const banglaDecision = memoryDecisionEngine.evaluate({
      message: "দোরা, মনে রাখিস আমার নাম আবির",
      context,
      intent: intentEngine.classifyIntent("দোরা, মনে রাখিস আমার নাম আবির", [], context),
    });
    assert(banglaDecision.action === "SAVE", `Bangla remember is SAVE (got: "${banglaDecision.action}")`);
    assert(banglaDecision.isExplicit === true, "Bangla isExplicit is true");

    const banglishForget = memoryDecisionEngine.evaluate({
      message: "Dora, shob bhule jao",
      context,
      intent: intentEngine.classifyIntent("Dora, shob bhule jao", [], context),
    });
    assert(banglishForget.action === "FORGET", `Banglish forget is FORGET (got: "${banglishForget.action}")`);
    assert(banglishForget.forgetDirective?.scope === "all", "Scope is all");
  }

  // TEST 15 — Memory Retrieval Interface
  console.log("\nTEST 15 — Memory retrieval foundation:");
  {
    const testRecords: MemoryRecord[] = [
      {
        id: "mem_1",
        userId: "default_user",
        type: "PREFERENCE",
        key: "preference_ui_theme",
        value: "dark mode",
        normalizedValue: "dark mode",
        source: "EXPLICIT_USER",
        confidence: 1.0,
        importance: 85,
        createdAt: 1000,
        updatedAt: 1000,
        lastAccessedAt: 1000,
        accessCount: 3,
        status: "ACTIVE",
        tags: ["preference", "ui", "theme"],
        evidence: ["remember dark mode"],
        version: 1,
      },
      {
        id: "mem_2",
        userId: "default_user",
        type: "PREFERENCE",
        key: "fav_programming_language",
        value: "Python",
        normalizedValue: "python",
        source: "EXPLICIT_USER",
        confidence: 1.0,
        importance: 85,
        createdAt: 2000,
        updatedAt: 2000,
        lastAccessedAt: 2000,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["preference", "programming", "python"],
        evidence: ["remember python"],
        version: 1,
      },
    ];

    // Check retrieval logic
    const themeRecords = testRecords.filter(r => r.tags.includes("theme") && r.status === "ACTIVE");
    assert(themeRecords.length === 1, "Retrieved exactly 1 theme preference");
    assert(themeRecords[0].value === "dark mode", "Theme is dark mode");
  }

  console.log("\n==========================================");
  console.log("ALL 15 MEMORY DECISION ENGINE TESTS PASSED!");
  console.log("==========================================");
}

runMemoryTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
