/**
 * Dora Reasoning Engine Test Suite
 * 
 * Verifies all 12 core reasoning scenarios:
 * 1. Direct answer (Simple calculation / no complex plan)
 * 2. Multi-factor recommendation (Multiple constraints evaluated)
 * 3. Comparison (Side-by-side evaluation of entities)
 * 4. Targeted follow-up (Comparison focused strictly on battery)
 * 5. Trade-off (Portability vs Performance analysis)
 * 6. Constraint satisfaction (Hard constraints vs soft preferences)
 * 7. Missing information (Broad query with zero context triggers clarification)
 * 8. Tool requirement (Live price / external info lookup)
 * 9. Multi-step task (Decomposed into sequential subtasks)
 * 10. Simple conversation (Greetings bypass reasoning)
 * 11. Context isolation (Weather switch isolates prior laptop constraints)
 * 12. No hallucinated facts (Identifies missing evidence without fabrication)
 */

import { brainEngine } from "./brainEngine";
import { ConversationTurn } from "./contextTypes";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

export function runAllReasoningTests() {
  console.log("\n==========================================");
  console.log("RUNNING DORA REASONING ENGINE TEST SUITE");
  console.log("==========================================\n");

  // TEST 1 — Direct answer (Simple calculation)
  console.log("TEST 1 — Direct Answer / Calculation:");
  {
    const res = brainEngine.analyze("What is 2 + 2?", [], undefined, "reasoning-test-1");

    assert(
      res.reasoningAnalysis.reasoningType === "CALCULATION" || res.reasoningAnalysis.reasoningType === "DIRECT_ANSWER",
      `Reasoning type is CALCULATION or DIRECT_ANSWER (got: "${res.reasoningAnalysis.reasoningType}")`
    );
    assert(
      res.reasoningAnalysis.subtasks.length === 0,
      `No unnecessary multi-step subtasks created (count: ${res.reasoningAnalysis.subtasks.length})`
    );
    assert(
      res.reasoningAnalysis.complexity === "LOW",
      `Complexity is LOW (got: "${res.reasoningAnalysis.complexity}")`
    );
  }

  // TEST 2 — Multi-factor recommendation
  console.log("\nTEST 2 — Multi-Factor Recommendation:");
  {
    const res = brainEngine.analyze(
      "I need a gaming laptop under 80k, RTX required, good battery.",
      [],
      undefined,
      "reasoning-test-2"
    );

    assert(
      res.reasoningRequired === true,
      `Reasoning is required (got: ${res.reasoningRequired})`
    );
    assert(
      res.reasoningAnalysis.reasoningType === "MULTI_FACTOR_DECISION" || res.reasoningAnalysis.reasoningType === "RECOMMENDATION_REASONING",
      `Reasoning type is MULTI_FACTOR_DECISION (got: "${res.reasoningAnalysis.reasoningType}")`
    );
    assert(
      res.reasoningAnalysis.relevantConstraints.length >= 2,
      `Identified multiple constraints (found: ${res.reasoningAnalysis.relevantConstraints.map(c => c.key).join(", ")})`
    );
    assert(
      res.reasoningAnalysis.conclusionStrategy === "RANKED_RECOMMENDATION",
      `Conclusion strategy is RANKED_RECOMMENDATION (got: "${res.reasoningAnalysis.conclusionStrategy}")`
    );
  }

  // TEST 3 — Comparison
  console.log("\nTEST 3 — Comparison Reasoning:");
  {
    const res = brainEngine.analyze("Compare ASUS and Lenovo for gaming.", [], undefined, "reasoning-test-3");

    assert(
      res.reasoningAnalysis.reasoningType === "COMPARISON",
      `Reasoning type is COMPARISON (got: "${res.reasoningAnalysis.reasoningType}")`
    );
    assert(
      res.reasoningAnalysis.relevantEntities.includes("ASUS") && res.reasoningAnalysis.relevantEntities.includes("Lenovo"),
      `Entities identified as ASUS and Lenovo (got: ${res.reasoningAnalysis.relevantEntities.join(", ")})`
    );
    assert(
      res.reasoningAnalysis.conclusionStrategy === "COMPARISON_VERDICT",
      `Conclusion strategy is COMPARISON_VERDICT (got: "${res.reasoningAnalysis.conclusionStrategy}")`
    );
  }

  // TEST 4 — Targeted follow-up
  console.log("\nTEST 4 — Targeted Comparison Follow-Up:");
  {
    const history: ConversationTurn[] = [];

    // Turn 1
    const res1 = brainEngine.analyze("Compare ASUS and Lenovo.", history, undefined, "reasoning-test-4");
    history.push({ sender: "user", text: "Compare ASUS and Lenovo." });
    history.push({ sender: "dora", text: "Both ASUS and Lenovo have strong lineups." });

    // Turn 2
    const res2 = brainEngine.analyze("Which one has better battery?", history, res1.context, "reasoning-test-4");

    assert(
      res2.reasoningAnalysis.reasoningType === "COMPARISON",
      `Reasoning type is COMPARISON (got: "${res2.reasoningAnalysis.reasoningType}")`
    );
    assert(
      res2.reasoningAnalysis.comparisons.some(c => c.factor === "battery"),
      `Comparison focused specifically on battery factor (factors: ${res2.reasoningAnalysis.comparisons.map(c => c.factor).join(", ")})`
    );
    assert(
      res2.reasoningAnalysis.complexity === "LOW",
      `Targeted single-aspect comparison has LOW complexity (got: "${res2.reasoningAnalysis.complexity}")`
    );
  }

  // TEST 5 — Trade-off
  console.log("\nTEST 5 — Trade-off Analysis:");
  {
    const res = brainEngine.analyze(
      "Should I choose a lighter laptop or a more powerful one?",
      [],
      undefined,
      "reasoning-test-5"
    );

    assert(
      res.reasoningAnalysis.reasoningType === "TRADEOFF_ANALYSIS",
      `Reasoning type is TRADEOFF_ANALYSIS (got: "${res.reasoningAnalysis.reasoningType}")`
    );
    assert(
      res.reasoningAnalysis.tradeoffs.length > 0,
      `Identified tradeoff dimensions (dimensions: ${res.reasoningAnalysis.tradeoffs.map(t => `${t.dimensionA} vs ${t.dimensionB}`).join("; ")})`
    );
    assert(
      res.reasoningAnalysis.conclusionStrategy === "TRADEOFF_EXPLANATION",
      `Conclusion strategy is TRADEOFF_EXPLANATION (got: "${res.reasoningAnalysis.conclusionStrategy}")`
    );
  }

  // TEST 6 — Constraint satisfaction (Hard vs Soft)
  console.log("\nTEST 6 — Hard Constraints vs Soft Preferences:");
  {
    const res = brainEngine.analyze(
      "RTX is mandatory, battery life is preferred.",
      [],
      undefined,
      "reasoning-test-6"
    );

    const rtxConstraint = res.reasoningAnalysis.relevantConstraints.find(
      c => c.key === "gpu_requirement" || c.key === "gpu" || String(c.value).includes("RTX")
    );
    const batteryConstraint = res.reasoningAnalysis.relevantConstraints.find(
      c => c.key === "battery_preference" || c.key === "battery" || String(c.value).toLowerCase().includes("battery")
    );

    assert(
      Boolean(rtxConstraint && rtxConstraint.isHardConstraint === true),
      `RTX identified as hard constraint (got isHardConstraint: ${rtxConstraint?.isHardConstraint})`
    );
    assert(
      Boolean(batteryConstraint && batteryConstraint.isHardConstraint === false),
      `Battery identified as soft preference (got isHardConstraint: ${batteryConstraint?.isHardConstraint})`
    );
  }

  // TEST 7 — Missing information & Clarification
  console.log("\nTEST 7 — Missing Information & Clarification:");
  {
    const res = brainEngine.analyze("Which laptop should I buy?", [], undefined, "reasoning-test-7");

    assert(
      res.reasoningAnalysis.missingInformation.length > 0,
      `Identified missing information (missing: ${res.reasoningAnalysis.missingInformation.join(", ")})`
    );
    assert(
      res.requiresClarification === true,
      `Flagged requiresClarification = true (got: ${res.requiresClarification})`
    );
    assert(
      res.reasoningAnalysis.conclusionStrategy === "CLARIFICATION_REQUEST",
      `Conclusion strategy is CLARIFICATION_REQUEST (got: "${res.reasoningAnalysis.conclusionStrategy}")`
    );
  }

  // TEST 8 — Tool requirement
  console.log("\nTEST 8 — Tool Requirements (Live Price Lookup):");
  {
    const res = brainEngine.analyze("What is the latest price of the iPhone?", [], undefined, "reasoning-test-8");

    assert(
      res.reasoningAnalysis.toolRequirements.some(t => t.toolType === "search"),
      `Tool requirement includes search for latest price (tools: ${res.reasoningAnalysis.toolRequirements.map(t => t.toolType).join(", ")})`
    );
    assert(
      res.reasoningAnalysis.conclusionStrategy === "TOOL_ASSISTED_RESULT",
      `Conclusion strategy is TOOL_ASSISTED_RESULT (got: "${res.reasoningAnalysis.conclusionStrategy}")`
    );
  }

  // TEST 9 — Multi-step task
  console.log("\nTEST 9 — Multi-Step Problem Decomposition:");
  {
    const res = brainEngine.analyze(
      "Find the best laptop under 80k, compare the top options, and recommend one.",
      [],
      undefined,
      "reasoning-test-9"
    );

    assert(
      res.reasoningAnalysis.subtasks.length >= 3,
      `Generated sequential subtasks (count: ${res.reasoningAnalysis.subtasks.length})`
    );
    assert(
      res.reasoningAnalysis.reasoningPlanSummary !== undefined && res.reasoningAnalysis.reasoningPlanSummary.length > 0,
      `Reasoning plan summary generated (steps: ${res.reasoningAnalysis.reasoningPlanSummary?.join(" -> ")})`
    );
  }

  // TEST 10 — Simple conversation
  console.log("\nTEST 10 — Simple Non-Reasoning Conversation:");
  {
    const res = brainEngine.analyze("Hey Dora, what's up?", [], undefined, "reasoning-test-10");

    assert(
      res.reasoningRequired === false,
      `reasoningRequired is false (got: ${res.reasoningRequired})`
    );
    assert(
      res.reasoningAnalysis.reasoningType === "DIRECT_ANSWER",
      `Reasoning type is DIRECT_ANSWER (got: "${res.reasoningAnalysis.reasoningType}")`
    );
    assert(
      res.reasoningAnalysis.subtasks.length === 0,
      `No subtasks created for greeting`
    );
  }

  // TEST 11 — Context isolation (Weather switch)
  console.log("\nTEST 11 — Context Isolation:");
  {
    const history: ConversationTurn[] = [];

    // Turn 1: Laptop discussion
    const res1 = brainEngine.analyze("I need a gaming laptop under 80k.", history, undefined, "reasoning-test-11");
    history.push({ sender: "user", text: "I need a gaming laptop under 80k." });
    history.push({ sender: "dora", text: "I can help with gaming laptops." });

    // Turn 2: Weather inquiry
    const res2 = brainEngine.analyze("What's the weather tomorrow?", history, res1.context, "reasoning-test-11");

    assert(
      res2.reasoningAnalysis.relevantConstraints.length === 0,
      `Laptop constraints isolated and excluded from weather query (constraints count: ${res2.reasoningAnalysis.relevantConstraints.length})`
    );
    assert(
      res2.reasoningAnalysis.toolRequirements.some(t => t.toolType === "weather"),
      `Weather tool requirement attached (tools: ${res2.reasoningAnalysis.toolRequirements.map(t => t.toolType).join(", ")})`
    );
  }

  // TEST 12 — No hallucinated facts
  console.log("\nTEST 12 — Missing Evidence / No Hallucinated Facts:");
  {
    const res = brainEngine.analyze("Compare ASUS ROG Zephyrus G14 and Lenovo Legion Slim 5.", [], undefined, "reasoning-test-12");

    assert(
      res.reasoningAnalysis.evidenceRequirements.length > 0,
      `Identified evidence requirement for verified specifications (evidence: ${res.reasoningAnalysis.evidenceRequirements.join("; ")})`
    );
    assert(
      res.reasoningAnalysis.assumptions.length === 0,
      `No fabricated specification assumptions stored (assumptions count: ${res.reasoningAnalysis.assumptions.length})`
    );
  }

  console.log("\n==========================================");
  console.log("ALL 12 REASONING ENGINE TESTS PASSED!");
  console.log("==========================================\n");
}

runAllReasoningTests();
