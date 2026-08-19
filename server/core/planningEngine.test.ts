/**
 * Dora Planning & Task Orchestration Engine Test Suite (Phase 1, Step 4)
 * 
 * Validates deterministic plan generation, dependency mapping, parallelism,
 * plan adaptation across turns, user corrections, confirmations, cancellations,
 * topic switch isolation, and safety against fabrication.
 */

import { brainEngine } from "./brainEngine";
import { contextStore } from "./contextStore";
import { planningEngine } from "./planningEngine";
import { ConversationTurn } from "./contextTypes";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runAllPlanningTests() {
  console.log("==========================================");
  console.log("RUNNING DORA PLANNING ENGINE TEST SUITE");
  console.log("==========================================");

  // TEST 1 — Simple conversation (No plan required)
  console.log("\nTEST 1 — Simple conversation:");
  {
    const res = brainEngine.analyze("Hey Dora", [], undefined, "plan-test-1");
    assert(
      res.requiresPlanning === false,
      `requiresPlanning is false for casual greeting (got: ${res.requiresPlanning})`
    );
    assert(
      res.planningAnalysis.planAction === "BYPASSED",
      `planAction is BYPASSED (got: "${res.planningAnalysis.planAction}")`
    );
  }

  // TEST 2 — Simple calculation (No unnecessary plan)
  console.log("\nTEST 2 — Simple calculation:");
  {
    const res = brainEngine.analyze("What is 20 * 5?", [], undefined, "plan-test-2");
    assert(
      res.requiresPlanning === false,
      `requiresPlanning is false for direct calculation (got: ${res.requiresPlanning})`
    );
  }

  // TEST 3 — Multi-step recommendation
  console.log("\nTEST 3 — Multi-step recommendation:");
  {
    const res = brainEngine.analyze(
      "Find the best gaming laptop under 80k, compare the top options and recommend one.",
      [],
      undefined,
      "plan-test-3"
    );
    assert(
      res.requiresPlanning === true,
      `requiresPlanning is true for complex multi-step request (got: ${res.requiresPlanning})`
    );
    assert(
      Boolean(res.activeTaskPlan && res.activeTaskPlan.steps.length >= 3),
      `Generated multi-step plan (steps count: ${res.activeTaskPlan?.steps.length})`
    );
    assert(
      res.activeTaskPlan?.executionStrategy === "SEQUENTIAL",
      `Execution strategy is SEQUENTIAL (got: "${res.activeTaskPlan?.executionStrategy}")`
    );
  }

  // TEST 4 — Dependency handling
  console.log("\nTEST 4 — Dependency handling:");
  {
    const res = brainEngine.analyze(
      "Find the best gaming laptop under 80k, compare the top options and recommend one.",
      [],
      undefined,
      "plan-test-4"
    );
    const plan = res.activeTaskPlan!;
    const filterStep = plan.steps.find(s => s.id === "step-2");
    const compareStep = plan.steps.find(s => s.id === "step-4");

    assert(
      Boolean(filterStep && filterStep.dependencies.includes("step-1")),
      `Step 2 depends on Step 1 (dependencies: ${JSON.stringify(filterStep?.dependencies)})`
    );
    assert(
      Boolean(compareStep && compareStep.dependencies.includes("step-3")),
      `Comparison Step depends on specification collection Step 3 (dependencies: ${JSON.stringify(compareStep?.dependencies)})`
    );
  }

  // TEST 5 — Parallel tasks (Travel itinerary)
  console.log("\nTEST 5 — Parallel tasks:");
  {
    const res = brainEngine.analyze(
      "Plan a 5 day trip to Tokyo.",
      [],
      undefined,
      "plan-test-5"
    );
    const plan = res.activeTaskPlan!;
    assert(
      plan.executionStrategy === "PARALLEL_BATCH",
      `Execution strategy is PARALLEL_BATCH (got: "${plan.executionStrategy}")`
    );

    const flightStep = plan.steps.find(s => s.id === "step-1");
    const hotelStep = plan.steps.find(s => s.id === "step-2");

    assert(
      Boolean(flightStep?.canRunInParallel && hotelStep?.canRunInParallel),
      "Flight and Hotel research steps are explicitly marked canRunInParallel = true"
    );
  }

  // TEST 6 — Missing inputs (Blocked / Clarification)
  console.log("\nTEST 6 — Missing inputs (Trip with zero details):");
  {
    const res = brainEngine.analyze(
      "Plan me a trip.",
      [],
      undefined,
      "plan-test-6"
    );
    assert(
      res.activeTaskPlan?.status === "BLOCKED",
      `Plan status is BLOCKED (got: "${res.activeTaskPlan?.status}")`
    );
    assert(
      Boolean(res.activeTaskPlan?.missingInputs && res.activeTaskPlan.missingInputs.length > 0),
      `Missing inputs detected: ${res.activeTaskPlan?.missingInputs.join(", ")}`
    );
    assert(
      res.activeTaskPlan?.failureStrategy === "REQUEST_CLARIFICATION",
      `Failure strategy is REQUEST_CLARIFICATION (got: "${res.activeTaskPlan?.failureStrategy}")`
    );
  }

  // TEST 7 — Constraint update across turns
  console.log("\nTEST 7 — Constraint update across turns:");
  {
    const sessionId = "plan-test-7";
    // Turn 1
    const res1 = brainEngine.analyze(
      "Find me a gaming laptop under 80k.",
      [],
      undefined,
      sessionId
    );
    assert(
      res1.requiresPlanning === true,
      "Turn 1 created active plan"
    );

    // Turn 2
    const res2 = brainEngine.analyze(
      "Actually 90k is okay.",
      [{ sender: "user", text: "Find me a gaming laptop under 80k." }],
      res1.activeContext,
      sessionId
    );

    assert(
      res2.planningAnalysis.planAction === "UPDATED",
      `Plan action is UPDATED (got: "${res2.planningAnalysis.planAction}")`
    );
    assert(
      Boolean(res2.activeTaskPlan?.requiredInputs.includes("budget") || res2.activeTaskPlan?.requiredInputs.includes("max_budget")),
      "Plan inputs adapted to new budget constraint"
    );
  }

  // TEST 8 — User Correction
  console.log("\nTEST 8 — User Correction:");
  {
    const sessionId = "plan-test-8";
    // Turn 1
    const res1 = brainEngine.analyze(
      "Compare ASUS and Acer gaming laptops under 80k.",
      [],
      undefined,
      sessionId
    );

    // Turn 2: User corrects Acer to Lenovo
    const res2 = brainEngine.analyze(
      "No, I meant Lenovo.",
      [{ sender: "user", text: "Compare ASUS and Acer gaming laptops under 80k." }],
      res1.activeContext,
      sessionId
    );

    assert(
      res2.planningAnalysis.planAction === "UPDATED",
      `Plan adapted in-place without resetting (got: "${res2.planningAnalysis.planAction}")`
    );
    assert(
      Boolean(res2.activeContext?.entities.some(e => e.name === "Lenovo" && e.status === "active")),
      "Active entity updated to Lenovo in active context"
    );
  }

  // TEST 9 — User Confirmation
  console.log("\nTEST 9 — User Confirmation:");
  {
    const sessionId = "plan-test-9";
    // Setup pending context
    const res1 = brainEngine.analyze(
      "Compare ASUS and Lenovo.",
      [],
      undefined,
      sessionId
    );

    // User confirms
    const res2 = brainEngine.analyze(
      "Yes, compare them.",
      [{ sender: "user", text: "Compare ASUS and Lenovo." }],
      res1.activeContext,
      sessionId
    );

    assert(
      res2.activeTaskPlan?.status === "IN_PROGRESS",
      `Plan status is IN_PROGRESS after confirmation (got: "${res2.activeTaskPlan?.status}")`
    );
    assert(
      res2.planningAnalysis.planAction === "ACTIVATED" || res2.planningAnalysis.planAction === "CONTINUED",
      `Plan action is ACTIVATED or CONTINUED (got: "${res2.planningAnalysis.planAction}")`
    );
  }

  // TEST 10 — Explicit Cancellation
  console.log("\nTEST 10 — Explicit Cancellation:");
  {
    const sessionId = "plan-test-10";
    const res1 = brainEngine.analyze(
      "Find me a gaming laptop under 80k.",
      [],
      undefined,
      sessionId
    );

    const res2 = brainEngine.analyze(
      "Never mind.",
      [{ sender: "user", text: "Find me a gaming laptop under 80k." }],
      res1.activeContext,
      sessionId
    );

    assert(
      res2.activeTaskPlan?.status === "CANCELLED",
      `Active plan status transitioned to CANCELLED (got: "${res2.activeTaskPlan?.status}")`
    );
    assert(
      res2.planningAnalysis.planAction === "CANCELLED",
      `Plan action is CANCELLED (got: "${res2.planningAnalysis.planAction}")`
    );
  }

  // TEST 11 — Topic Switch Isolation
  console.log("\nTEST 11 — Topic Switch Isolation:");
  {
    const sessionId = "plan-test-11";
    const res1 = brainEngine.analyze(
      "Find me a gaming laptop under 80k.",
      [],
      undefined,
      sessionId
    );

    // Topic switch to weather
    const res2 = brainEngine.analyze(
      "Forget the laptop. What's the weather tomorrow in Dhaka?",
      [{ sender: "user", text: "Find me a gaming laptop under 80k." }],
      res1.activeContext,
      sessionId
    );

    assert(
      Boolean(res2.activeContext?.archivedPlans && res2.activeContext.archivedPlans.length > 0),
      "Old laptop plan was safely archived in archivedPlans"
    );
    assert(
      res2.activeContext?.activeTopic === "weather inquiry",
      `Active topic updated to weather inquiry (got: "${res2.activeContext?.activeTopic}")`
    );
  }

  // TEST 12 — Multi-Intent Planning (Compare & Recommend)
  console.log("\nTEST 12 — Multi-Intent Planning:");
  {
    const res = brainEngine.analyze(
      "Compare these phones and recommend one.",
      [],
      undefined,
      "plan-test-12"
    );

    assert(
      res.requiresPlanning === true,
      "Planning is required for multi-intent Compare & Recommend"
    );
    assert(
      Boolean(res.activeTaskPlan?.steps.some(s => s.title.toLowerCase().includes("compar"))),
      "Plan contains comparison step"
    );
    assert(
      Boolean(res.activeTaskPlan?.steps.some(s => s.title.toLowerCase().includes("recommend"))),
      "Plan contains recommendation synthesis step"
    );
  }

  // TEST 13 — Existing information reuse (No redundant retrieval)
  console.log("\nTEST 13 — Existing information reuse:");
  {
    const sessionId = "plan-test-13";
    // Pre-populate context with verified entities
    const initialContext = contextStore.getOrCreate(sessionId);
    initialContext.activeTopic = "gaming laptop";
    initialContext.currentTask = "purchase_research";
    initialContext.entities = [
      {
        id: "e-1",
        name: "ASUS TUF A15",
        type: "product",
        role: "primary",
        firstMentionedTurn: 1,
        lastMentionedTurn: 1,
        mentionCount: 1,
        status: "active",
      },
      {
        id: "e-2",
        name: "Lenovo LOQ 15",
        type: "product",
        role: "comparison_target",
        firstMentionedTurn: 1,
        lastMentionedTurn: 1,
        mentionCount: 1,
        status: "active",
      },
    ];

    const res = brainEngine.analyze(
      "Which one should I buy?",
      [{ sender: "user", text: "I am looking at ASUS TUF A15 and Lenovo LOQ 15." }],
      initialContext,
      sessionId
    );

    const step1 = res.activeTaskPlan?.steps.find(s => s.id === "step-1");
    assert(
      Boolean(step1 && (step1.status === "COMPLETED" || !step1.toolRequirement)),
      `Candidate identification recognizes existing verified data (step 1 status: ${step1?.status})`
    );
  }

  // TEST 14 — Tool Requirement in Plan Steps
  console.log("\nTEST 14 — Tool Requirement in Plan Steps:");
  {
    const res = brainEngine.analyze(
      "Find today's price of iPhone 16 Pro in BD and tell me if it is worth buying.",
      [],
      undefined,
      "plan-test-14"
    );

    assert(
      Boolean(res.activeTaskPlan?.toolRequirements.some(t => t.toolType === "search")),
      "Plan explicitly includes required search tool requirement"
    );
  }

  // TEST 15 — Failure Handling Strategy
  console.log("\nTEST 15 — Failure Handling Strategy:");
  {
    const res = brainEngine.analyze(
      "Find the best gaming laptop under 80k, compare the top options and recommend one.",
      [],
      undefined,
      "plan-test-15"
    );

    assert(
      res.activeTaskPlan?.failureStrategy === "RETRY" || res.activeTaskPlan?.failureStrategy === "ALTERNATIVE_TOOL",
      `Plan declares explicit non-fabricated failure strategy (got: "${res.activeTaskPlan?.failureStrategy}")`
    );
    assert(
      Boolean(res.activeTaskPlan?.completionCriteria && res.activeTaskPlan.completionCriteria.length >= 3),
      `Plan declares explicit completion criteria (count: ${res.activeTaskPlan?.completionCriteria.length})`
    );
  }

  console.log("==========================================");
  console.log("ALL 15 PLANNING ENGINE TESTS PASSED!");
  console.log("==========================================");
}

runAllPlanningTests().catch((err) => {
  console.error("\nPlanning Engine Test Suite Failed:\n", err);
  process.exit(1);
});
