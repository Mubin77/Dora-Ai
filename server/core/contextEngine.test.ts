/**
 * Dora Structured Context Engine Test Suite
 * 
 * Verifies all 8 core test scenarios with real multi-turn state transitions:
 * 1. Topic continuity & task retention across turns
 * 2. Entity reference resolution against comparison targets
 * 3. In-place constraint update without conflicting duplicates
 * 4. Follow-up understanding linked to active entity/topic
 * 5. Topic switch detection & isolation of prior constraints
 * 6. Ambiguous reference handling with explicit candidate state
 * 7. Temporary context isolation between disparate topics
 * 8. Context vs permanent long-term memory separation
 */

import { brainEngine } from "./brainEngine";
import { contextEngine } from "./contextEngine";
import { ConversationTurn } from "./contextTypes";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

export function runAllTests() {
  console.log("\n==========================================");
  console.log("RUNNING DORA CONTEXT UNDERSTANDING TEST SUITE");
  console.log("==========================================\n");

  // TEST 1 — Topic continuity & Task retention
  console.log("TEST 1 — Topic Continuity & Task Retention:");
  {
    const history: ConversationTurn[] = [];

    // Turn 1
    const res1 = contextEngine.analyze("I need a gaming laptop.", history, undefined, "test-session-1");
    history.push({ sender: "user", text: "I need a gaming laptop." });
    history.push({ sender: "dora", text: "Sure! What budget do you have in mind?" });

    // Turn 2 (feeds context from Turn 1)
    const res2 = contextEngine.analyze("My budget is 80k.", history, res1.context, "test-session-1");

    assert(
      res2.context.activeTopic === "gaming laptop",
      `Topic remains gaming laptop across turns (got: "${res2.context.activeTopic}")`
    );
    assert(
      res2.context.currentTask === "purchase_research",
      `Task remains purchase_research (got: "${res2.context.currentTask}")`
    );
    const activeConstraints = res2.context.constraints.filter((c) => !c.isOverridden);
    const budgetConstraint = activeConstraints.find((c) => c.category === "budget");
    assert(
      budgetConstraint?.value === 80000,
      `Budget constraint set to 80000 (got: ${budgetConstraint?.value})`
    );
  }

  // TEST 2 — Entity reference resolution against comparison entities
  console.log("\nTEST 2 — Entity Reference Resolution:");
  {
    const history: ConversationTurn[] = [];

    // Turn 1
    const res1 = contextEngine.analyze("Compare ASUS and Lenovo.", history, undefined, "test-session-2");
    history.push({ sender: "user", text: "Compare ASUS and Lenovo." });
    history.push({ sender: "dora", text: "Both ASUS and Lenovo make great laptops. What aspects matter most to you?" });

    // Turn 2
    const res2 = contextEngine.analyze("Which one has better battery?", history, res1.context, "test-session-2");

    const whichOneRef = res2.resolvedReferences.find((r) =>
      /which\s*one/i.test(r.rawToken)
    );
    assert(Boolean(whichOneRef), "Detected 'which one' reference");
    assert(
      whichOneRef?.status === "resolved",
      `Reference resolved with status 'resolved' (got: "${whichOneRef?.status}")`
    );
    assert(
      whichOneRef?.resolvedTarget?.includes("ASUS") === true &&
      whichOneRef?.resolvedTarget?.includes("Lenovo") === true,
      `'which one' resolved to comparison targets ASUS vs Lenovo (got: "${whichOneRef?.resolvedTarget}")`
    );
  }

  // TEST 3 — Constraint in-place update (override without duplicates)
  console.log("\nTEST 3 — Constraint In-Place Update:");
  {
    const history: ConversationTurn[] = [];

    // Turn 1
    const res1 = contextEngine.analyze("Budget is 80k.", history, undefined, "test-session-3");
    history.push({ sender: "user", text: "Budget is 80k." });
    history.push({ sender: "dora", text: "Under 80k there are good options like ASUS TUF or Lenovo Ideapad Gaming." });

    // Turn 2
    const res2 = contextEngine.analyze("Actually 90k is okay.", history, res1.context, "test-session-3");

    const activeConstraints = res2.context.constraints.filter((c) => !c.isOverridden);
    const budgetConstraints = activeConstraints.filter((c) => c.category === "budget");

    assert(
      budgetConstraints.length === 1,
      `Exactly one active budget constraint exists without duplicate conflicts (count: ${budgetConstraints.length})`
    );
    assert(
      budgetConstraints[0].value === 90000,
      `Budget constraint successfully updated to 90000 (got: ${budgetConstraints[0].value})`
    );
  }

  // TEST 4 — Follow-up understanding linked to active context
  console.log("\nTEST 4 — Follow-up Understanding:");
  {
    const history: ConversationTurn[] = [];

    // Turn 1
    const res1 = contextEngine.analyze("Tell me about RTX 4060.", history, undefined, "test-session-4");
    history.push({ sender: "user", text: "Tell me about RTX 4060." });
    history.push({ sender: "dora", text: "The RTX 4060 offers great 1080p and 1440p gaming performance." });

    // Turn 2
    const res2 = contextEngine.analyze("What about battery?", history, res1.context, "test-session-4");

    assert(
      res2.isFollowUp === true,
      "Identified as follow-up turn"
    );
    assert(
      res2.context.entities.some((e) => e.name === "RTX 4060" && e.status === "active"),
      "RTX 4060 entity preserved in active context state"
    );
  }

  // TEST 5 — Topic switch detection & isolation
  console.log("\nTEST 5 — Topic Switch Detection & Isolation:");
  {
    const history: ConversationTurn[] = [];

    // Turn 1
    const res1 = contextEngine.analyze("Recommend a gaming laptop.", history, undefined, "test-session-5");
    history.push({ sender: "user", text: "Recommend a gaming laptop." });
    history.push({ sender: "dora", text: "I can help! Any preferred brand or budget?" });

    // Turn 2
    const res2 = contextEngine.analyze("What is the weather tomorrow?", history, res1.context, "test-session-5");

    assert(
      res2.context.activeTopic === "weather inquiry",
      `Topic switched to weather inquiry (got: "${res2.context.activeTopic}")`
    );
    assert(
      res2.isTopicSwitch === true,
      "Flagged isTopicSwitch = true"
    );
    assert(
      res2.context.archivedContexts.some((a) => a.topic === "gaming laptop"),
      "Previous gaming laptop topic archived safely in archivedContexts"
    );
  }

  // TEST 6 — Ambiguous reference handling with multiple candidate entities
  console.log("\nTEST 6 — Ambiguous Reference Handling:");
  {
    const history: ConversationTurn[] = [];

    // Turn 1 (User compares 3 brands: ASUS, Lenovo, Dell)
    const res1 = contextEngine.analyze("Compare ASUS, Lenovo and Dell.", history, undefined, "test-session-6");
    history.push({ sender: "user", text: "Compare ASUS, Lenovo and Dell." });
    history.push({ sender: "dora", text: "Here is a comparison of build quality, thermals, and warranty across ASUS, Lenovo, and Dell." });

    // Turn 2 (User asks "Which one is cheaper?" without specifying)
    const res2 = contextEngine.analyze("Which one is cheaper?", history, res1.context, "test-session-6");

    const whichOneRef = res2.resolvedReferences.find((r) => /which\s*one/i.test(r.rawToken));

    assert(Boolean(whichOneRef), "Found 'which one' reference in analysis");
    assert(
      whichOneRef?.status === "ambiguous",
      `Reference status is explicitly 'ambiguous' (got: "${whichOneRef?.status}")`
    );
    assert(
      whichOneRef?.isAmbiguous === true,
      "isAmbiguous flag is true"
    );
    assert(
      whichOneRef?.candidateTargets?.length === 3,
      `Contains all 3 candidates without arbitrary entity selection (candidates: ${whichOneRef?.candidateTargets?.join(", ")})`
    );
  }

  // TEST 7 — Temporary context isolation (Laptop -> Movie)
  console.log("\nTEST 7 — Temporary Context Isolation:");
  {
    const history: ConversationTurn[] = [];

    // Turn 1: Laptop discussion with budget & feature constraints
    const res1 = contextEngine.analyze("I need a laptop under 80k with RTX.", history, undefined, "test-session-7");
    history.push({ sender: "user", text: "I need a laptop under 80k with RTX." });
    history.push({ sender: "dora", text: "Under 80k with RTX, Lenovo LOQ or ASUS TUF are top choices." });

    // Turn 2: Unrelated movie discussion
    const res2 = contextEngine.analyze("Which movie won Best Picture Oscar last year?", history, res1.context, "test-session-7");

    assert(
      res2.context.activeTopic === "movie & entertainment",
      `Topic switched to movie & entertainment (got: "${res2.context.activeTopic}")`
    );
    const activeConstraints = res2.context.constraints.filter((c) => !c.isOverridden);
    assert(
      activeConstraints.length === 0,
      `Old laptop constraints are inactive for movie context (active constraints count: ${activeConstraints.length})`
    );
  }

  // TEST 8 — Context vs Memory Separation
  console.log("\nTEST 8 — Context vs Memory Separation:");
  {
    const userTurn = "I'm buying a laptop today.";
    const analysis = brainEngine.analyze(userTurn, []);

    assert(
      Boolean(analysis.activeContext?.activeTopic?.includes("laptop")),
      `Identified as active conversation topic/task (got: "${analysis.activeContext?.activeTopic}")`
    );
    assert(
      analysis.intent !== "MEMORY_UPDATE",
      `Not classified as permanent MEMORY_UPDATE intent (intent: ${analysis.intent})`
    );
  }

  console.log("\n==========================================");
  console.log("ALL 8 CONTEXT UNDERSTANDING TESTS PASSED!");
  console.log("==========================================\n");
}

runAllTests();
