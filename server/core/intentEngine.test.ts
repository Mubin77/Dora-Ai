/**
 * Dora Intent Understanding Test Suite
 * 
 * Verifies all 10 core intent understanding scenarios:
 * 1. Basic intent (Purchase / Recommendation)
 * 2. Contextual refinement (Constraint update on active task)
 * 3. Contextual follow-up (Comparison follow-up on battery)
 * 4. Topic switch (Weather real-time query taking priority)
 * 5. Correction (Entity correction to Lenovo)
 * 6. Confirmation (Conversational affirmative linked to proposal)
 * 7. Clarification (Questioning meaning of previous term)
 * 8. Ambiguous intent (Unanchored command with no context)
 * 9. Multi-intent (Comparison + Recommendation)
 * 10. Natural/Banglish follow-up ("Accha eta kemon?" evaluation)
 */

import { brainEngine } from "./brainEngine";
import { ConversationTurn } from "./contextTypes";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

export function runAllIntentTests() {
  console.log("\n==========================================");
  console.log("RUNNING DORA INTENT UNDERSTANDING TEST SUITE");
  console.log("==========================================\n");

  // TEST 1 — Basic intent
  console.log("TEST 1 — Basic Intent Detection:");
  {
    const analysis = brainEngine.analyze("I need a gaming laptop.", [], undefined, "intent-test-1");

    assert(
      analysis.intent === "RECOMMENDATION",
      `Primary intent is RECOMMENDATION (got: "${analysis.intent}")`
    );
    assert(
      analysis.activeContext?.currentTask === "purchase_research",
      `Task is purchase_research (got: "${analysis.activeContext?.currentTask}")`
    );
    assert(
      analysis.activeContext?.activeTopic === "gaming laptop",
      `Topic is gaming laptop (got: "${analysis.activeContext?.activeTopic}")`
    );
  }

  // TEST 2 — Contextual refinement
  console.log("\nTEST 2 — Contextual Refinement:");
  {
    const history: ConversationTurn[] = [];

    // Turn 1
    const res1 = brainEngine.analyze("I need a gaming laptop.", history, undefined, "intent-test-2");
    history.push({ sender: "user", text: "I need a gaming laptop." });
    history.push({ sender: "dora", text: "Sure! What is your preferred budget or brand?" });

    // Turn 2
    const res2 = brainEngine.analyze("My budget is 80k.", history, res1.context, "intent-test-2");

    assert(
      res2.intent === "CONSTRAINT_UPDATE",
      `Second message classified as CONSTRAINT_UPDATE (got: "${res2.intent}")`
    );
    assert(
      res2.structuredIntent.relationship === "REFINEMENT",
      `Relationship is REFINEMENT (got: "${res2.structuredIntent.relationship}")`
    );
    assert(
      res2.activeContext?.currentTask === "purchase_research",
      `Active task remains purchase_research (got: "${res2.activeContext?.currentTask}")`
    );
  }

  // TEST 3 — Contextual follow-up
  console.log("\nTEST 3 — Contextual Follow-Up:");
  {
    const history: ConversationTurn[] = [];

    // Turn 1
    const res1 = brainEngine.analyze("Compare ASUS and Lenovo.", history, undefined, "intent-test-3");
    history.push({ sender: "user", text: "Compare ASUS and Lenovo." });
    history.push({ sender: "dora", text: "Both ASUS and Lenovo make great laptops. Which aspects matter most?" });

    // Turn 2
    const res2 = brainEngine.analyze("Which one has better battery?", history, res1.context, "intent-test-3");

    assert(
      res2.intent === "COMPARISON",
      `Intent is COMPARISON question (got: "${res2.intent}")`
    );
    assert(
      res2.structuredIntent.relationship === "FOLLOW_UP",
      `Relationship is FOLLOW_UP (got: "${res2.structuredIntent.relationship}")`
    );
    assert(
      res2.structuredIntent.targetAspect === "battery",
      `Target aspect identified as battery (got: "${res2.structuredIntent.targetAspect}")`
    );
  }

  // TEST 4 — Topic switch
  console.log("\nTEST 4 — Topic Switch:");
  {
    const history: ConversationTurn[] = [];

    // Turn 1
    const res1 = brainEngine.analyze("I need a gaming laptop.", history, undefined, "intent-test-4");
    history.push({ sender: "user", text: "I need a gaming laptop." });
    history.push({ sender: "dora", text: "I can help with gaming laptops." });

    // Turn 2
    const res2 = brainEngine.analyze("What's the weather tomorrow?", history, res1.context, "intent-test-4");

    assert(
      res2.intent === "REAL_TIME_INFORMATION",
      `New intent is REAL_TIME_INFORMATION (got: "${res2.intent}")`
    );
    assert(
      res2.structuredIntent.relationship === "TOPIC_SWITCH",
      `Relationship is TOPIC_SWITCH (got: "${res2.structuredIntent.relationship}")`
    );
    assert(
      res2.activeContext?.activeTopic === "weather inquiry",
      `Active topic updated to weather inquiry (got: "${res2.activeContext?.activeTopic}")`
    );
  }

  // TEST 5 — Correction
  console.log("\nTEST 5 — User Correction:");
  {
    const history: ConversationTurn[] = [];

    // Turn 1
    const res1 = brainEngine.analyze("Show me ASUS laptops.", history, undefined, "intent-test-5");
    history.push({ sender: "user", text: "Show me ASUS laptops." });
    history.push({ sender: "dora", text: "Here are some top ASUS ROG and TUF options." });

    // Turn 2
    const res2 = brainEngine.analyze("No, I meant Lenovo.", history, res1.context, "intent-test-5");

    assert(
      res2.intent === "CORRECTION",
      `Intent is CORRECTION (got: "${res2.intent}")`
    );
    assert(
      res2.structuredIntent.relationship === "CORRECTION",
      `Relationship is CORRECTION (got: "${res2.structuredIntent.relationship}")`
    );
    assert(
      res2.structuredIntent.targetEntity === "Lenovo",
      `Target entity extracted as Lenovo (got: "${res2.structuredIntent.targetEntity}")`
    );
    assert(
      res2.activeContext?.entities.some((e) => e.name === "Lenovo" && e.status === "active"),
      "Active entity updated to Lenovo"
    );
  }

  // TEST 6 — Confirmation
  console.log("\nTEST 6 — Conversational Confirmation:");
  {
    const history: ConversationTurn[] = [
      { sender: "user", text: "I am deciding between ASUS and Lenovo." },
      { sender: "dora", text: "Should I compare ASUS and Lenovo for you?" }
    ];

    const res = brainEngine.analyze("Yeah.", history, undefined, "intent-test-6");

    assert(
      res.intent === "CONFIRMATION",
      `Intent is CONFIRMATION (got: "${res.intent}")`
    );
    assert(
      res.structuredIntent.relationship === "CONFIRMATION",
      `Relationship is CONFIRMATION (got: "${res.structuredIntent.relationship}")`
    );
  }

  // TEST 7 — Clarification
  console.log("\nTEST 7 — Clarification Request:");
  {
    const history: ConversationTurn[] = [
      { sender: "user", text: "Tell me about graphics cards." },
      { sender: "dora", text: "For modern 1440p gaming, the RTX 4060 with Ada Lovelace architecture is very capable." }
    ];

    const res = brainEngine.analyze("What do you mean by that?", history, undefined, "intent-test-7");

    assert(
      res.intent === "CLARIFICATION",
      `Intent is CLARIFICATION (got: "${res.intent}")`
    );
    assert(
      res.structuredIntent.relationship === "CLARIFICATION",
      `Relationship is CLARIFICATION (got: "${res.structuredIntent.relationship}")`
    );
  }

  // TEST 8 — Ambiguous intent
  console.log("\nTEST 8 — Ambiguous Intent with Zero Context:");
  {
    const res = brainEngine.analyze("Can you do that?", [], undefined, "intent-test-8");

    assert(
      res.requiresClarification === true,
      `Flagged requiresClarification = true (got: ${res.requiresClarification})`
    );
    assert(
      Boolean(res.ambiguityReason && res.ambiguityReason.length > 0),
      `Provided clear ambiguityReason (got: "${res.ambiguityReason}")`
    );
  }

  // TEST 9 — Multi-intent
  console.log("\nTEST 9 — Multi-Intent Detection:");
  {
    const res = brainEngine.analyze(
      "Compare these two phones and tell me which one you'd recommend.",
      [],
      undefined,
      "intent-test-9"
    );

    assert(
      res.structuredIntent.primaryIntent === "COMPARISON",
      `Primary intent is COMPARISON (got: "${res.structuredIntent.primaryIntent}")`
    );
    assert(
      res.structuredIntent.secondaryIntent === "RECOMMENDATION",
      `Secondary intent is RECOMMENDATION (got: "${res.structuredIntent.secondaryIntent}")`
    );
    assert(
      res.structuredIntent.isMultiIntent === true,
      `Flagged isMultiIntent = true (got: ${res.structuredIntent.isMultiIntent})`
    );
  }

  // TEST 10 — Natural/Banglish follow-up
  console.log("\nTEST 10 — Natural/Banglish Follow-up:");
  {
    const history: ConversationTurn[] = [];

    // Turn 1
    const res1 = brainEngine.analyze("Tell me about ASUS Zephyrus G14.", history, undefined, "intent-test-10");
    history.push({ sender: "user", text: "Tell me about ASUS Zephyrus G14." });
    history.push({ sender: "dora", text: "The ASUS Zephyrus G14 is a lightweight, high-performance compact gaming laptop." });

    // Turn 2
    const res2 = brainEngine.analyze("Accha eta kemon?", history, res1.context, "intent-test-10");

    assert(
      res2.intent === "OPINION" || res2.intent === "RECOMMENDATION" || res2.intent === "INFORMATION",
      `Classified as evaluation/opinion/recommendation intent (got: "${res2.intent}")`
    );
    assert(
      res2.structuredIntent.relationship === "FOLLOW_UP",
      `Relationship is FOLLOW_UP (got: "${res2.structuredIntent.relationship}")`
    );
  }

  console.log("\n==========================================");
  console.log("ALL 10 INTENT UNDERSTANDING TESTS PASSED!");
  console.log("==========================================\n");
}

runAllIntentTests();
