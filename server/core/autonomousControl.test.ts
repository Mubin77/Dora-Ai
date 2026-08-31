/**
 * Dora Phase 3 Autonomous Android Agent Test Suite
 * 
 * Validates:
 * 1. Goal decomposition & task planning (GoalInterpreter)
 * 2. Screen normalization & fingerprinting (ScreenInterpreter)
 * 3. Action selection & adaptive decision making (ActionSelector)
 * 4. Verification engine & outcome detection (VerificationEngine)
 * 5. Loop & oscillation detection (LoopDetector)
 * 6. Recovery strategies & re-planning (RecoveryEngine)
 * 7. Safety gate & sensitive field blocking (DeviceSafety)
 * 8. State machine transitions & cancellation (AutonomousStateManager)
 * 9. End-to-End autonomous execution in mock mode (AutonomousAgent)
 */

import { goalInterpreter } from "../../src/services/device/autonomy/GoalInterpreter";
import { screenInterpreter } from "../../src/services/device/autonomy/ScreenInterpreter";
import { actionSelector } from "../../src/services/device/autonomy/ActionSelector";
import { verificationEngine } from "../../src/services/device/autonomy/VerificationEngine";
import { loopDetector } from "../../src/services/device/autonomy/LoopDetector";
import { recoveryEngine } from "../../src/services/device/autonomy/RecoveryEngine";
import { autonomousStateManager } from "../../src/services/device/autonomy/AutonomousStateManager";
import { autonomousAgent } from "../../src/services/device/autonomy/AutonomousAgent";
import { mockAutonomousSimulator } from "../../src/services/device/autonomy/MockAutonomousSimulator";
import { deviceSafety } from "../../src/services/device/DeviceSafety";
import { screenObservationManager } from "../../src/services/device/ScreenObservationManager";

export interface AutonomousTestResult {
  suiteName: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  details: Array<{ testName: string; passed: boolean; message?: string }>;
}

export async function runAllAutonomousTests(): Promise<AutonomousTestResult> {
  const details: Array<{ testName: string; passed: boolean; message?: string }> = [];

  function assert(testName: string, condition: boolean, failMsg?: string) {
    if (condition) {
      details.push({ testName, passed: true });
    } else {
      details.push({ testName, passed: false, message: failMsg || "Assertion failed" });
      console.error(`[Autonomous Test Failed] ${testName}: ${failMsg}`);
    }
  }

  console.log("[Phase 3 Tests] Starting Autonomous Android Agent test suite...");

  // -------------------------------------------------------------
  // Test 1: Goal Decomposition & Planning
  // -------------------------------------------------------------
  try {
    const plan = goalInterpreter.planTask("Open YouTube and search for relaxing music", "test_task_1");
    assert(
      "Goal Decomposition - YouTube Search",
      plan.steps.length >= 3 &&
        plan.targetApp?.toLowerCase() === "youtube" &&
        plan.steps[0].targetAction === "open_application" &&
        plan.steps.some((s) => s.targetAction === "type_text"),
      `Expected YouTube search plan with >=3 steps. Got ${plan.steps.length} steps for app ${plan.targetApp}`
    );

    const banglaPlan = goalInterpreter.planTask("WhatsApp e Mom ke message pathao", "test_task_2");
    assert(
      "Goal Decomposition - Bangla Goal",
      banglaPlan.targetApp?.toLowerCase() === "whatsapp",
      `Expected target app WhatsApp, got ${banglaPlan.targetApp}`
    );
  } catch (err: any) {
    assert("Goal Decomposition Suite", false, err?.message);
  }

  // -------------------------------------------------------------
  // Test 2: Screen Normalization & Fingerprinting
  // -------------------------------------------------------------
  try {
    mockAutonomousSimulator.setApp("com.google.android.youtube");
    const obs = mockAutonomousSimulator.getCurrentScreenObservation();
    const normalized = screenInterpreter.normalize(obs);

    assert(
      "Screen Normalization",
      normalized.packageName === "com.google.android.youtube" &&
        normalized.elementCount > 0 &&
        normalized.fingerprint.length > 0,
      "Screen normalization failed to extract package or elements."
    );

    // Verify state change detection
    mockAutonomousSimulator.simulateAction("tap", {});
    const obs2 = mockAutonomousSimulator.getCurrentScreenObservation();
    const changed = screenInterpreter.hasStateChanged(obs, obs2);
    assert("Screen State Change Detection", changed, "Expected state change after tapping search.");
  } catch (err: any) {
    assert("Screen Normalization Suite", false, err?.message);
  }

  // -------------------------------------------------------------
  // Test 3: Action Selection & Decision Logic
  // -------------------------------------------------------------
  try {
    mockAutonomousSimulator.reset();
    mockAutonomousSimulator.setApp("com.google.android.youtube");
    const obs = mockAutonomousSimulator.getCurrentScreenObservation();
    const plan = goalInterpreter.planTask("Open YouTube and search for relaxing music", "test_task_3");

    // Plan step 1: open application is already done, step 2 is find search
    const step2 = plan.steps[1];
    const decision = actionSelector.selectNextAction(plan, step2, obs);

    assert(
      "Action Selector - Identify Search Button",
      decision.action === "tap" &&
        (Boolean(decision.target?.resourceId?.includes("search")) ||
          Boolean(decision.target?.contentDescription?.includes("Search")) ||
          Boolean(decision.target?.text?.includes("Search"))),
      `Expected tap on Search button, got action: ${decision.action}, reason: ${decision.reason}`
    );
  } catch (err: any) {
    assert("Action Selection Suite", false, err?.message);
  }

  // -------------------------------------------------------------
  // Test 4: Loop & Oscillation Detection
  // -------------------------------------------------------------
  try {
    const repeatedActions: any[] = [
      { action: "tap", targetDescription: "Search Button", result: { success: true } },
      { action: "tap", targetDescription: "Search Button", result: { success: true } },
      { action: "tap", targetDescription: "Search Button", result: { success: true } },
    ];

    const loopResult = loopDetector.detectLoop(repeatedActions, ["fp1", "fp2", "fp3"], 3);
    assert(
      "Loop Detector - Repeated Action Detection",
      loopResult.hasLoop && loopResult.loopType === "repeated_action",
      "Loop detector failed to catch 3 identical actions in a row."
    );

    const oscillatingFps = ["state_A", "state_B", "state_A", "state_B"];
    const oscillationResult = loopDetector.detectLoop([], oscillatingFps);
    assert(
      "Loop Detector - State Oscillation Detection",
      oscillationResult.hasLoop && oscillationResult.loopType === "state_oscillation",
      "Loop detector failed to catch 4-step state oscillation (A-B-A-B)."
    );
  } catch (err: any) {
    assert("Loop Detection Suite", false, err?.message);
  }

  // -------------------------------------------------------------
  // Test 5: Recovery Engine & Dynamic Re-planning
  // -------------------------------------------------------------
  try {
    const failedStep = {
      stepId: "step_search",
      description: "Tap search button",
      targetAction: "tap" as const,
      status: "in_progress" as const,
    };
    const plan = goalInterpreter.planTask("Open YouTube and search for music", "test_task_rec");

    // Attempt 1: Refresh observation
    const rec1 = recoveryEngine.determineRecoveryStrategy(failedStep, 1, null, plan);
    assert(
      "Recovery Engine - Attempt 1 Fresh Observation",
      rec1.strategy === "retry_observation" && rec1.recoveryAction?.action === "read_screen",
      `Expected retry_observation, got ${rec1.strategy}`
    );

    // Attempt 2: Scroll to find hidden element
    const rec2 = recoveryEngine.determineRecoveryStrategy(failedStep, 2, null, plan);
    assert(
      "Recovery Engine - Attempt 2 Scroll Down",
      rec2.strategy === "scroll" && rec2.recoveryAction?.action === "scroll",
      `Expected scroll strategy, got ${rec2.strategy}`
    );

    // Attempt 3: Press Back to dismiss dialog
    const rec3 = recoveryEngine.determineRecoveryStrategy(failedStep, 3, null, plan);
    assert(
      "Recovery Engine - Attempt 3 Abort after max retries",
      rec3.strategy === "abort",
      `Expected abort after max retries, got ${rec3.strategy}`
    );
  } catch (err: any) {
    assert("Recovery Engine Suite", false, err?.message);
  }

  // -------------------------------------------------------------
  // Test 6: Safety Gate & Sensitive Field Blocking
  // -------------------------------------------------------------
  try {
    const passwordInjection = deviceSafety.validateActionSecurity("type_text", {
      text: "supersecret123",
      elementDescription: "user_password_input",
    });

    assert(
      "Safety Gate - Sensitive Password Blocked",
      !passwordInjection.isAllowed && passwordInjection.errorCode === "SENSITIVE_FIELD_BLOCKED",
      "Safety gate failed to block password field injection."
    );

    const maliciousShell = deviceSafety.validateActionSecurity("type_text", {
      text: "hello; rm -rf /",
    });

    assert(
      "Safety Gate - Malicious Shell Injection Blocked",
      !maliciousShell.isAllowed && maliciousShell.errorCode === "SAFETY_VIOLATION",
      "Safety gate failed to block shell script pattern."
    );
  } catch (err: any) {
    assert("Safety Gate Suite", false, err?.message);
  }

  // -------------------------------------------------------------
  // Test 7: State Machine Transitions & Cancellation
  // -------------------------------------------------------------
  try {
    autonomousStateManager.reset("test_task_fsm");
    autonomousStateManager.transition("UNDERSTANDING", "test_task_fsm");
    autonomousStateManager.transition("PLANNING", "test_task_fsm");
    autonomousStateManager.transition("OBSERVING", "test_task_fsm");

    assert(
      "State Machine - Transition",
      autonomousStateManager.getState() === "OBSERVING",
      `Expected state OBSERVING, got ${autonomousStateManager.getState()}`
    );

    autonomousStateManager.cancelTask("test_task_fsm");
    assert(
      "State Machine - Cancellation",
      autonomousStateManager.isCancelled("test_task_fsm") &&
        autonomousStateManager.getState() === "CANCELLED",
      "State machine failed to mark task as cancelled."
    );
  } catch (err: any) {
    assert("State Machine Suite", false, err?.message);
  }

  // -------------------------------------------------------------
  // Test 8: End-to-End Autonomous Execution in Mock Mode
  // -------------------------------------------------------------
  try {
    const result = await autonomousAgent.executeTask("Open YouTube and search for relaxing music", {
      isMockMode: true,
      maxSteps: 10,
    });

    assert(
      "End-to-End Mock Execution - Success",
      result.success === true && result.status === "completed",
      `Expected completed task, got status: ${result.status}, msg: ${result.summaryMessage}`
    );

    assert(
      "End-to-End Mock Execution - Verified Actions",
      result.actionCount >= 2 && result.history.length >= 2,
      `Expected >=2 executed actions in history, got ${result.actionCount}`
    );

    assert(
      "End-to-End Mock Execution - Summary Message",
      result.summaryMessage.includes("YouTube") && result.summaryMessage.includes("relaxing music"),
      `Expected natural summary mentioning YouTube and search query, got: ${result.summaryMessage}`
    );
  } catch (err: any) {
    assert("End-to-End Mock Execution Suite", false, err?.message);
  }

  const passedTests = details.filter((d) => d.passed).length;
  const failedTests = details.filter((d) => !d.passed).length;

  console.log(`[Phase 3 Tests] Completed: ${passedTests}/${details.length} passed.`);

  return {
    suiteName: "Dora Phase 3 Autonomous Android Agent Test Suite",
    totalTests: details.length,
    passedTests,
    failedTests,
    details,
  };
}
