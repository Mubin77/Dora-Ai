/**
 * Dora Context Engine Test Suite
 * 
 * Verifies all 8 core test scenarios:
 * 1. Topic continuity
 * 2. Entity reference resolution
 * 3. Constraint update (in-place override)
 * 4. Follow-up understanding
 * 5. Topic switch detection
 * 6. Ambiguous reference handling
 * 7. Temporary context isolation
 * 8. Context vs memory separation
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

  // TEST 1 — Topic continuity
  console.log("TEST 1 — Topic Continuity:");
  {
    const history: ConversationTurn[] = [
      { sender: "user", text: "I need a gaming laptop." },
      { sender: "dora", text: "Sure! What budget do you have in mind?" },
    ];
    const turn2 = "My budget is 80k.";
    const analysis = brainEngine.analyze(turn2, history);

    assert(
      analysis.activeContext?.activeTopic?.includes("laptop") === true,
      `Topic remains gaming laptop (got: "${analysis.activeContext?.activeTopic}")`
    );
    assert(
      analysis.activeContext?.currentTask === "purchase_research",
      `Task remains purchase_research (got: "${analysis.activeContext?.currentTask}")`
    );
  }

  // TEST 2 — Entity reference
  console.log("\nTEST 2 — Entity Reference Resolution:");
  {
    const history: ConversationTurn[] = [
      { sender: "user", text: "I am comparing ASUS and Lenovo." },
      { sender: "dora", text: "Both ASUS and Lenovo make great machines. Which models or features are you looking at?" },
    ];
    const turn2 = "Which one has better battery?";
    const analysis = brainEngine.analyze(turn2, history);

    const whichOneRef = analysis.activeContext?.recentReferences.find((r) =>
      /which\s*one/i.test(r.rawToken)
    );
    assert(Boolean(whichOneRef), "Detected 'which one' reference");
    assert(
      whichOneRef?.resolvedTarget?.includes("ASUS") === true &&
      whichOneRef?.resolvedTarget?.includes("Lenovo") === true,
      `'which one' resolved to comparison entities ASUS vs Lenovo (got: "${whichOneRef?.resolvedTarget}")`
    );
  }

  // TEST 3 — Constraint update
  console.log("\nTEST 3 — Constraint Update:");
  {
    const history: ConversationTurn[] = [
      { sender: "user", text: "I need a laptop under 80k." },
      { sender: "dora", text: "Under 80k we have some solid options with RTX 3050 or RTX 4050." },
    ];
    const turn2 = "Actually 90k is okay.";
    const analysis = brainEngine.analyze(turn2, history);

    const activeConstraints = analysis.activeContext?.constraints.filter((c) => !c.isOverridden);
    const budgetConstraint = activeConstraints?.find((c) => c.category === "budget");

    assert(Boolean(budgetConstraint), "Found active budget constraint");
    assert(
      budgetConstraint?.value === 90000,
      `Budget constraint successfully updated to 90000 (got: ${budgetConstraint?.value})`
    );
    assert(
      activeConstraints?.filter((c) => c.category === "budget").length === 1,
      "No duplicate conflicting active budget constraints exist"
    );
  }

  // TEST 4 — Follow-up
  console.log("\nTEST 4 — Follow-up Understanding:");
  {
    const history: ConversationTurn[] = [
      { sender: "user", text: "Tell me about RTX 4060." },
      { sender: "dora", text: "The RTX 4060 is great for 1080p and high-fps 1440p gaming with DLSS 3 frame generation." },
    ];
    const turn2 = "What about the battery?";
    const analysis = brainEngine.analyze(turn2, history);

    assert(
      analysis.contextReference.isFollowUp === true,
      "Identified as follow-up turn"
    );
    assert(
      analysis.activeContext?.entities.some((e) => e.name === "RTX 4060") === true,
      "RTX 4060 entity preserved in active context"
    );
  }

  // TEST 5 — Topic switch
  console.log("\nTEST 5 — Topic Switch Detection:");
  {
    const history: ConversationTurn[] = [
      { sender: "user", text: "I need a gaming laptop." },
      { sender: "dora", text: "I can help with that! Any particular budget or brand you like?" },
    ];
    const turn2 = "What is the weather tomorrow?";
    const analysis = brainEngine.analyze(turn2, history);

    assert(
      analysis.activeContext?.activeTopic?.includes("weather") === true,
      `Topic switched to weather inquiry (got: "${analysis.activeContext?.activeTopic}")`
    );
    assert(
      analysis.activeContext?.isTopicSwitched === true,
      "Flagged isTopicSwitched = true"
    );
  }

  // TEST 6 — Ambiguous reference
  console.log("\nTEST 6 — Ambiguous Reference Handling:");
  {
    const history: ConversationTurn[] = [
      { sender: "user", text: "I am comparing ASUS and Lenovo." },
      { sender: "dora", text: "Both have great advantages in cooling and build." },
      { sender: "user", text: "The first one is good." },
      { sender: "dora", text: "ASUS ROG/TUF has solid build and thermals." },
    ];
    const turn3 = "Is it cheaper?";
    const analysis = brainEngine.analyze(turn3, history);

    // Turn mentions "it" while multiple options exist
    const hasAmbiguityOrResolved = analysis.activeContext?.recentReferences.some(
      (r) => r.isAmbiguous || r.resolvedTarget
    );
    assert(Boolean(hasAmbiguityOrResolved), "Reference analyzed with safety check");
  }

  // TEST 7 — Temporary context isolation
  console.log("\nTEST 7 — Temporary Context Isolation:");
  {
    const history: ConversationTurn[] = [
      { sender: "user", text: "I need a laptop under 80k with RTX GPU." },
      { sender: "dora", text: "I recommend looking at the Lenovo LOQ or ASUS TUF series." },
      { sender: "user", text: "Actually 90k is okay, but I don't want HP." },
      { sender: "dora", text: "Noted! Excluding HP and checking up to 90k." },
    ];
    const movieTurn = "Which movie won Best Picture Oscar last year?";
    const analysis = brainEngine.analyze(movieTurn, history);

    assert(
      analysis.activeContext?.activeTopic?.includes("movie") === true,
      `Topic switched to movie discussion (got: "${analysis.activeContext?.activeTopic}")`
    );
    assert(
      analysis.activeContext?.constraints.length === 0,
      "Prior laptop constraints isolated and not carried into movie topic"
    );
  }

  // TEST 8 — Context vs Memory Separation
  console.log("\nTEST 8 — Context vs Memory Separation:");
  {
    const userTurn = "I'm buying a laptop today.";
    const analysis = brainEngine.analyze(userTurn, []);

    assert(
      analysis.activeContext?.activeTopic?.includes("laptop") === true,
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

