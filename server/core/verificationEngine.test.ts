/**
 * Dora Verification, Confidence Calibration & Self-Correction Engine Test Suite
 * 
 * Tests the 15 required cognitive verification scenarios:
 * 1. Simple factual/direct answer
 * 2. Verified evidence (confidence boost)
 * 3. Missing required evidence
 * 4. Unsupported factual claim (confidence penalty)
 * 5. Hard constraint violation (failure / self-correction)
 * 6. Soft preference trade-off (valid recommendation)
 * 7. Intent mismatch
 * 8. Ambiguous reference (clarification / confidence cap)
 * 9. Topic switch isolation (no cross-domain contamination)
 * 10. Tool required but no tool result (no fake execution)
 * 11. Valid tool result (evidence accepted)
 * 12. Self-correction successfully fixes invalid recommendation
 * 13. Self-correction cannot resolve issue (abort / clarification)
 * 14. Maximum 3 correction iterations (no infinite loop)
 * 15. Simple greeting (verification not required)
 */

import { contextStore } from "./contextStore";
import { intentEngine } from "./intentEngine";
import { reasoningEngine } from "./reasoningEngine";
import { planningEngine } from "./planningEngine";
import { verificationEngine } from "./verificationEngine";
import { brainEngine } from "./brainEngine";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

export async function runAllVerificationTests() {
  console.log("==========================================");
  console.log("RUNNING DORA VERIFICATION ENGINE TEST SUITE");
  console.log("==========================================");

  // TEST 1 — Simple Factual / Direct Answer
  console.log("\nTEST 1 — Simple factual / direct answer:");
  {
    const res = brainEngine.analyze("What is 15 * 80?");
    const v = res.verificationAnalysis;
    assert(Boolean(v), "Verification analysis generated");
    assert(v?.verificationStatus === "PASSED", `Status is PASSED for deterministic math (got: "${v?.verificationStatus}")`);
    assert(v?.confidence.calibratedScore! >= 0.90, `Confidence is high (got: ${v?.confidence.calibratedScore})`);
    assert(v?.constraintCompliance.hardConstraintsSatisfied === true, "Hard constraints satisfied");
  }

  // TEST 2 — Verified Evidence
  console.log("\nTEST 2 — Verified evidence:");
  {
    const sessionId = "ver-test-2";
    const context = contextStore.getOrCreate(sessionId);
    context.activeTopic = "gaming laptop";
    const intent = intentEngine.classifyIntent("What is the battery life of ASUS ROG?", [], context);
    const reasoning = reasoningEngine.analyze("What is the battery life of ASUS ROG?", intent, context);

    // Provide verified benchmark and availability data in toolResults
    const verifiedToolResults = {
      asus_specs_and_availability: {
        model: "ASUS ROG Zephyrus G14",
        runtimeHours: 9.5,
        availability: "In Stock",
        currentPrice: 145000,
        testStandard: "PCMark 10 Modern Office",
        verified: true,
      },
    };

    const v = verificationEngine.verify({
      message: "What is the battery life of ASUS ROG?",
      context,
      intent,
      reasoning,
      toolResults: verifiedToolResults,
    });

    assert(v.evidenceQuality === "HIGH", `Evidence quality is HIGH (got: "${v.evidenceQuality}")`);
    assert(v.supportedClaims.length > 0, `Supported claims recorded (count: ${v.supportedClaims.length})`);
    assert(v.confidence.calibratedScore >= 0.85, `Confidence is strong with verified evidence (got: ${v.confidence.calibratedScore})`);
  }

  // TEST 3 — Missing Required Evidence
  console.log("\nTEST 3 — Missing required evidence:");
  {
    const sessionId = "ver-test-3";
    const context = contextStore.getOrCreate(sessionId);
    context.activeTopic = "gaming laptop";
    const intent = intentEngine.classifyIntent("Which laptop is cheapest in the market today?", [], context);
    const reasoning = reasoningEngine.analyze("Which laptop is cheapest in the market today?", intent, context);

    // No tool results provided
    const v = verificationEngine.verify({
      message: "Which laptop is cheapest in the market today?",
      context,
      intent,
      reasoning,
      toolResults: {},
    });

    assert(v.verificationStatus === "NEEDS_EVIDENCE", `Status is NEEDS_EVIDENCE (got: "${v.verificationStatus}")`);
    assert(v.missingEvidence.length > 0, `Missing evidence recorded (count: ${v.missingEvidence.length})`);
    assert(v.confidence.calibratedScore <= 0.65, `Confidence is capped at <= 0.65 due to missing live evidence (got: ${v.confidence.calibratedScore})`);
  }

  // TEST 4 — Unsupported Factual Claim
  console.log("\nTEST 4 — Unsupported factual claim:");
  {
    const sessionId = "ver-test-4";
    const context = contextStore.getOrCreate(sessionId);
    context.activeTopic = "gaming laptop";
    const intent = intentEngine.classifyIntent("ASUS has better battery life than Lenovo.", [], context);
    const reasoning = reasoningEngine.analyze("ASUS has better battery life than Lenovo.", intent, context);

    const v = verificationEngine.verify({
      message: "ASUS has better battery life than Lenovo.",
      context,
      intent,
      reasoning,
      draftMetadata: {
        draftClaims: ["ASUS ROG battery life is superior to Lenovo Legion in gaming"],
      },
    });

    assert(v.unsupportedClaims.length > 0, `Unsupported factual claim detected (count: ${v.unsupportedClaims.length})`);
    assert(v.confidence.calibratedScore < 0.75, `Confidence penalized for unverified comparative claim (got: ${v.confidence.calibratedScore})`);
    assert(v.verificationStatus === "PASSED_WITH_UNCERTAINTY" || v.verificationStatus === "NEEDS_EVIDENCE", `Status reflects uncertainty (got: "${v.verificationStatus}")`);
  }

  // TEST 5 — Hard Constraint Violation
  console.log("\nTEST 5 — Hard constraint violation:");
  {
    const sessionId = "ver-test-5";
    const context = contextStore.getOrCreate(sessionId);
    context.activeTopic = "gaming laptop";
    context.constraints = [
      { id: "c1", category: "budget", key: "max_budget", value: 80000, rawText: "80k budget", createdAt: Date.now(), updatedAt: Date.now(), updatedAtTurn: 1 },
    ];

    const intent = intentEngine.classifyIntent("Recommend a laptop within 80k budget", [], context);
    const reasoning = reasoningEngine.analyze("Recommend a laptop within 80k budget", intent, context);

    // Draft recommendation that blatantly violates 80k budget (costs 95k) and has NO valid alternative
    const v = verificationEngine.verify({
      message: "Recommend a laptop within 80k budget",
      context,
      intent,
      reasoning,
      draftMetadata: {
        draftRecommendation: "ASUS ROG Strix G16",
        draftCandidates: [
          { name: "ASUS ROG Strix G16", price: 95000, brand: "ASUS" },
        ],
      },
    });

    assert(v.constraintCompliance.hardConstraintsSatisfied === false, "Hard constraint violation detected");
    assert(v.contradictions.some(c => c.type === "HARD_CONSTRAINT_VIOLATION"), "Critical contradiction flagged");
    assert(v.confidence.calibratedScore <= 0.40, `Confidence capped at <= 0.40 on hard violation (got: ${v.confidence.calibratedScore})`);
  }

  // TEST 6 — Soft Preference Trade-off
  console.log("\nTEST 6 — Soft preference trade-off:");
  {
    const sessionId = "ver-test-6";
    const context = contextStore.getOrCreate(sessionId);
    context.activeTopic = "gaming laptop";
    context.constraints = [
      { id: "c1", category: "technical_spec", key: "gpu_requirement", value: "RTX 4060", rawText: "RTX 4060", createdAt: Date.now(), updatedAt: Date.now(), updatedAtTurn: 1 },
    ];
    context.preferences = [
      "good battery life",
    ];

    const intent = intentEngine.classifyIntent("Find an RTX 4060 laptop, good battery preferred", [], context);
    const reasoning = reasoningEngine.analyze("Find an RTX 4060 laptop, good battery preferred", intent, context);

    const v = verificationEngine.verify({
      message: "Find an RTX 4060 laptop, good battery preferred",
      context,
      intent,
      reasoning,
      draftMetadata: {
        draftRecommendation: "Lenovo LOQ 15 RTX 4060",
        draftCandidates: [
          { name: "Lenovo LOQ 15 RTX 4060", price: 82000, brand: "Lenovo", specs: { batteryLife: "poor" } },
        ],
      },
    });

    assert(v.constraintCompliance.hardConstraintsSatisfied === true, "Hard constraint is satisfied");
    assert(v.constraintCompliance.softPreferencesSatisfied === false, "Soft preference trade-off noted");
    assert(v.recommendationValidity === true, "Recommendation remains valid despite soft trade-off");
  }

  // TEST 7 — Intent Mismatch
  console.log("\nTEST 7 — Intent mismatch:");
  {
    const sessionId = "ver-test-7";
    const context = contextStore.getOrCreate(sessionId);
    context.activeTopic = "gaming laptop";

    // Intent is COMPARISON
    const intent = intentEngine.classifyIntent("Compare ASUS and Lenovo for gaming", [], context);
    const reasoning = reasoningEngine.analyze("Compare ASUS and Lenovo for gaming", intent, context);

    // Intentionally corrupt conclusionStrategy to simulate reasoning mismatch
    const mismatchedReasoning = {
      ...reasoning,
      conclusionStrategy: "DIRECT_ANSWER" as any,
      reasoningType: "DIRECT_ANSWER" as any,
    };

    const v = verificationEngine.verify({
      message: "Compare ASUS and Lenovo for gaming",
      context,
      intent,
      reasoning: mismatchedReasoning,
    });

    assert(v.selfCorrectionRequired === true, "Self-correction triggered by intent mismatch");
    assert(v.correctionActions.includes("RECHECK_INTENT"), "Correction action includes RECHECK_INTENT");
    assert(v.verificationStatus === "FAILED", `Verification status is FAILED for intent mismatch (got: "${v.verificationStatus}")`);
  }

  // TEST 8 — Ambiguous Reference
  console.log("\nTEST 8 — Ambiguous reference:");
  {
    const sessionId = "ver-test-8";
    const context = contextStore.getOrCreate(sessionId);
    // Zero context
    const intent = intentEngine.classifyIntent("Do that.", [], context);
    const reasoning = reasoningEngine.analyze("Do that.", intent, context);

    const v = verificationEngine.verify({
      message: "Do that.",
      context,
      intent,
      reasoning,
    });

    assert(v.requiresClarification === true, "Flagged requiresClarification = true");
    assert(v.verificationStatus === "NEEDS_CLARIFICATION", `Status is NEEDS_CLARIFICATION (got: "${v.verificationStatus}")`);
    assert(v.confidence.calibratedScore <= 0.50, `Confidence is capped at <= 0.50 for ambiguous input (got: ${v.confidence.calibratedScore})`);
  }

  // TEST 9 — Topic Switch Isolation
  console.log("\nTEST 9 — Topic switch isolation:");
  {
    const sessionId = "ver-test-9";
    const context = contextStore.getOrCreate(sessionId);
    context.activeTopic = "gaming laptop";
    context.constraints = [
      { id: "c1", category: "budget", key: "max_budget", value: 80000, rawText: "80k budget", createdAt: Date.now(), updatedAt: Date.now(), updatedAtTurn: 1 },
    ];

    const res = brainEngine.analyze("What is the weather in Dhaka right now?", [], context, sessionId);
    const v = res.verificationAnalysis;

    assert(Boolean(v), "Verification analysis generated for topic switch");
    assert(v?.consistencyChecks.isContextIsolated === true, "Topic switch verified cleanly without context contamination");
  }

  // TEST 10 — Tool Required But No Tool Result
  console.log("\nTEST 10 — Tool required but no tool result:");
  {
    const sessionId = "ver-test-10";
    const context = contextStore.getOrCreate(sessionId);
    const intent = intentEngine.classifyIntent("Check the live weather in Chittagong right now", [], context);
    const reasoning = reasoningEngine.analyze("Check the live weather in Chittagong right now", intent, context);

    const v = verificationEngine.verify({
      message: "Check the live weather in Chittagong right now",
      context,
      intent,
      reasoning,
      toolResults: undefined, // No tool result executed yet
    });

    assert(v.missingEvidence.length > 0, "Missing tool evidence declared");
    assert(v.verificationStatus === "NEEDS_EVIDENCE", `Status is NEEDS_EVIDENCE (got: "${v.verificationStatus}")`);
    assert(v.evidenceQuality === "NONE", `Evidence quality is NONE (got: "${v.evidenceQuality}")`);
  }

  // TEST 11 — Valid Tool Result
  console.log("\nTEST 11 — Valid tool result:");
  {
    const sessionId = "ver-test-11";
    const context = contextStore.getOrCreate(sessionId);
    const intent = intentEngine.classifyIntent("Check the live weather in Chittagong right now", [], context);
    const reasoning = reasoningEngine.analyze("Check the live weather in Chittagong right now", intent, context);

    const v = verificationEngine.verify({
      message: "Check the live weather in Chittagong right now",
      context,
      intent,
      reasoning,
      toolResults: {
        weather_chittagong: {
          city: "Chittagong",
          tempC: 28,
          condition: "Partly Cloudy",
          humidity: 78,
        },
      },
    });

    assert(v.evidenceQuality === "HIGH", `Evidence quality is HIGH (got: "${v.evidenceQuality}")`);
    assert(v.missingEvidence.length === 0, "No missing evidence");
    assert(v.confidence.calibratedScore >= 0.85, `High confidence calibrated (got: ${v.confidence.calibratedScore})`);
  }

  // TEST 12 — Self-Correction Successfully Fixes Invalid Recommendation
  console.log("\nTEST 12 — Self-correction successfully fixes invalid recommendation:");
  {
    const sessionId = "ver-test-12";
    const context = contextStore.getOrCreate(sessionId);
    context.activeTopic = "gaming laptop";
    context.constraints = [
      { id: "c1", category: "budget", key: "max_budget", value: 80000, rawText: "80k budget", createdAt: Date.now(), updatedAt: Date.now(), updatedAtTurn: 1 },
    ];

    const intent = intentEngine.classifyIntent("Find the best gaming laptop within 80k budget", [], context);
    const reasoning = reasoningEngine.analyze("Find the best gaming laptop within 80k budget", intent, context);

    // Initial draft has an overbudget 95k candidate as #1, but a valid 78k candidate as #2
    const v = verificationEngine.verify({
      message: "Find the best gaming laptop within 80k budget",
      context,
      intent,
      reasoning,
      draftMetadata: {
        draftRecommendation: "ASUS ROG Strix G16",
        draftCandidates: [
          { name: "ASUS ROG Strix G16", price: 95000, brand: "ASUS" },
          { name: "Acer Nitro 5 RTX 3050", price: 78000, brand: "Acer" },
        ],
      },
    });

    assert(v.selfCorrectionRequired === true, "Self correction was triggered");
    assert(v.verificationStatus === "SELF_CORRECTED", `Status is SELF_CORRECTED (got: "${v.verificationStatus}")`);
    assert(v.constraintCompliance.hardConstraintsSatisfied === true, "Hard constraints satisfied after correction");
    assert(Boolean(v.correctedConclusion && v.correctedConclusion.includes("Acer Nitro 5")), "Corrected conclusion selected valid candidate within 80k budget");
  }

  // TEST 13 — Self-Correction Cannot Resolve Issue
  console.log("\nTEST 13 — Self-correction cannot resolve issue:");
  {
    const sessionId = "ver-test-13";
    const context = contextStore.getOrCreate(sessionId);
    context.activeTopic = "gaming laptop";
    context.constraints = [
      { id: "c1", category: "budget", key: "max_budget", value: 30000, rawText: "30k budget", createdAt: Date.now(), updatedAt: Date.now(), updatedAtTurn: 1 },
    ];

    const intent = intentEngine.classifyIntent("Find RTX 4080 laptop under 30k", [], context);
    const reasoning = reasoningEngine.analyze("Find RTX 4080 laptop under 30k", intent, context);

    // Only candidates available are way above 30k
    const v = verificationEngine.verify({
      message: "Find RTX 4080 laptop under 30k",
      context,
      intent,
      reasoning,
      draftMetadata: {
        draftRecommendation: "ASUS RTX 4080 Extreme",
        draftCandidates: [
          { name: "ASUS RTX 4080 Extreme", price: 250000, brand: "ASUS" },
        ],
      },
    });

    assert(v.correctionActions.includes("ABORT_UNSUPPORTED_CONCLUSION") || v.correctionActions.includes("REQUEST_CLARIFICATION"), "Abort or clarification action declared");
    assert(v.constraintCompliance.hardConstraintsSatisfied === false, "Hard constraint remains unsatisfied");
  }

  // TEST 14 — Maximum 3 Correction Iterations
  console.log("\nTEST 14 — Maximum 3 correction iterations:");
  {
    const sessionId = "ver-test-14";
    const context = contextStore.getOrCreate(sessionId);
    context.constraints = [
      { id: "c1", category: "budget", key: "max_budget", value: 50000, rawText: "50k budget", createdAt: Date.now(), updatedAt: Date.now(), updatedAtTurn: 1 },
    ];

    const intent = intentEngine.classifyIntent("Laptop recommendation", [], context);
    const reasoning = reasoningEngine.analyze("Laptop recommendation", intent, context);

    const v = verificationEngine.verify({
      message: "Laptop recommendation",
      context,
      intent,
      reasoning,
      draftMetadata: {
        draftRecommendation: "Expensive Laptop",
        draftCandidates: [
          { name: "Expensive Laptop", price: 120000 },
        ],
      },
    });

    assert(v.correctionIterations <= 3, `Correction iterations strictly bounded to <= 3 (got: ${v.correctionIterations})`);
  }

  // TEST 15 — Simple Greeting
  console.log("\nTEST 15 — Simple greeting:");
  {
    const res = brainEngine.analyze("Hello Dora!");
    const v = res.verificationAnalysis;

    assert(Boolean(v), "Verification analysis returned");
    assert(v?.verificationRequired === false, `verificationRequired is false for greeting (got: ${v?.verificationRequired})`);
    assert(v?.verificationStatus === "NOT_REQUIRED", `Status is NOT_REQUIRED (got: "${v?.verificationStatus}")`);
    assert(v?.confidence.calibratedScore === 1.0, `Confidence is 1.0 (got: ${v?.confidence.calibratedScore})`);
  }

  console.log("==========================================");
  console.log("ALL 15 VERIFICATION ENGINE TESTS PASSED!");
  console.log("==========================================");
}

runAllVerificationTests().catch((err) => {
  console.error("\nVerification Engine Test Suite Failed:\n", err);
  process.exit(1);
});
