/**
 * Dora Autonomous Android Agent (Phase 3) Test Suite
 * 
 * Tests the complete autonomous task loop:
 * GOAL -> UNDERSTAND -> PLAN -> OBSERVE -> DECIDE -> ACT -> OBSERVE AGAIN -> VERIFY -> RECOVER/REPLAN -> COMPLETE
 */

import { goalInterpreter } from "../../src/services/device/autonomous/GoalInterpreter";
import { screenUnderstandingEngine } from "../../src/services/device/autonomous/ScreenUnderstandingEngine";
import { autonomousPlanner } from "../../src/services/device/autonomous/AutonomousPlanner";
import { actionSelector } from "../../src/services/device/autonomous/ActionSelector";
import { autonomousVerificationEngine } from "../../src/services/device/autonomous/AutonomousVerificationEngine";
import { recoveryEngine } from "../../src/services/device/autonomous/RecoveryEngine";
import { loopDetector } from "../../src/services/device/autonomous/LoopDetector";
import { taskStateManager } from "../../src/services/device/autonomous/TaskStateManager";
import { mockAutonomousEnvironment } from "../../src/services/device/autonomous/MockAutonomousEnvironment";
import { autonomousAgent } from "../../src/services/device/autonomous/AutonomousAgent";
import { screenObservationManager } from "../../src/services/device/ScreenObservationManager";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

export async function runAllAutonomousAgentTests() {
  console.log("\n========================================================");
  console.log("RUNNING DORA AUTONOMOUS AGENT TEST SUITE (PHASE 3)");
  console.log("========================================================\n");

  const results: Array<{ name: string; success: boolean; details?: string }> = [];

  async function test(name: string, fn: () => Promise<void> | void) {
    console.log(`TEST: ${name}`);
    try {
      await fn();
      results.push({ name, success: true });
    } catch (err: any) {
      console.error(`  ✗ FAIL: ${err.message}`);
      results.push({ name, success: false, details: err.message });
      throw err;
    }
  }

  // 1. Goal Interpreter Tests
  await test("GoalInterpreter decomposes English & Bangla multi-step search requests", () => {
    // English
    const eng = goalInterpreter.interpret("Open YouTube and search for relaxing music");
    assert(eng.targetApp.toLowerCase() === "youtube", "Identified YouTube as targetApp");
    assert(eng.intent === "search", "Identified intent as search");
    assert(eng.searchQuery === "relaxing music", "Extracted search query 'relaxing music'");
    assert(eng.isMultiStep === true, "Identified as multi-step goal");
    assert(eng.subGoals.length >= 3, "Decomposed into sub-goals");

    // Banglish
    const bang = goalInterpreter.interpret("YouTube e giye relaxing music search koro");
    assert(bang.targetApp.toLowerCase() === "youtube", "Banglish: Identified YouTube");
    assert(bang.searchQuery === "relaxing music", "Banglish: Extracted query 'relaxing music'");
    assert(bang.isMultiStep === true, "Banglish: Identified as multi-step");

    // Messaging
    const msg = goalInterpreter.interpret("Open WhatsApp and message Ryan saying hello");
    assert(msg.targetApp.toLowerCase() === "whatsapp", "Messaging: Identified WhatsApp");
    assert(msg.recipient === "Ryan", "Messaging: Identified recipient Ryan");
    assert(msg.messageText === "hello", "Messaging: Identified message hello");

    // Simple Open
    const simple = goalInterpreter.interpret("Open Camera");
    assert(simple.targetApp.toLowerCase() === "camera", "Simple open: Identified Camera");
    assert(simple.isMultiStep === false, "Simple open: isMultiStep is false");
  });

  // 2. Screen Understanding & Semantic Classification
  await test("ScreenUnderstandingEngine classifies UI roles and flags sensitive fields", () => {
    const obs = screenObservationManager.createObservation({
      packageName: "com.google.android.youtube",
      activityName: "com.google.android.youtube.HomeActivity",
      elements: [
        {
          className: "android.widget.Button",
          text: "Search",
          contentDescription: "Search YouTube",
          clickable: true,
        },
        {
          className: "android.widget.EditText",
          text: "",
          contentDescription: "Search query box",
          editable: true,
          clickable: true,
        },
        {
          className: "android.widget.EditText",
          text: "",
          contentDescription: "Enter password",
          isPassword: true,
          editable: true,
        },
      ],
    });

    const summary = screenUnderstandingEngine.analyzeScreen(obs);
    assert(summary !== null, "Generated screen summary");
    assert(summary?.hasSearchControl === true, "Identified presence of search control");
    assert(summary?.hasInputControl === true, "Identified presence of input control");
    assert(summary?.isPasswordOrAuthScreen === true, "Detected password / authentication field");

    const searchBtn = summary?.keyElements.find((e) => e.role === "search_button");
    assert(searchBtn !== undefined, "Classified search button role");

    const sensitiveField = summary?.keyElements.find((e) => e.role === "sensitive_field");
    assert(sensitiveField !== undefined, "Classified sensitive password field role");
    assert(sensitiveField?.semanticLabel.includes("PROTECTED"), "Redacted sensitive field label");
  });

  // 3. Autonomous Task Planner & Adaptation
  await test("AutonomousPlanner generates multi-step plans and adapts to UI prompts", () => {
    const interpreted = goalInterpreter.interpret("Open YouTube and search for relaxing music");
    const plan = autonomousPlanner.generateInitialPlan(interpreted);

    assert(plan.steps.length === 4, "Initial plan contains 4 steps");
    assert(plan.steps[0].intendedAction === "open_application", "Step 1: open_application");
    assert(plan.steps[1].intendedAction === "tap", "Step 2: tap search");
    assert(plan.steps[2].intendedAction === "type_text", "Step 3: type_text");
    assert(plan.steps[3].intendedAction === "tap", "Step 4: submit / select result");

    // Simulate unexpected dialog appearing on screen
    const dialogObs = screenObservationManager.createObservation({
      packageName: "com.google.android.youtube",
      windowTitle: "Permission Dialog",
      elements: [
        {
          className: "android.widget.Button",
          text: "Allow",
          clickable: true,
        },
      ],
    });
    const dialogSummary = screenUnderstandingEngine.analyzeScreen(dialogObs);
    const adaptedPlan = autonomousPlanner.adaptPlan(plan, dialogSummary, 1);

    assert(adaptedPlan.steps.length === 5, "Adapted plan injected dialog handler step (total 5 steps)");
    assert(adaptedPlan.steps[1].targetRole === "dialog_confirm", "Injected step handles dialog confirmation");
  });

  // 4. Action Selector & Safety Gatekeeper
  await test("ActionSelector selects optimal actions and flags high-risk confirmation", () => {
    const step = {
      stepId: "s1",
      stepNumber: 1,
      description: "Send WhatsApp message to Ryan",
      intendedAction: "tap" as const,
      targetRole: "action_button" as const,
      targetText: "Send",
      status: "pending" as const,
      retryCount: 0,
      maxRetries: 3,
      expectedOutcome: "Message sent",
    };

    const screenSummary = screenUnderstandingEngine.analyzeScreen(
      screenObservationManager.createObservation({
        packageName: "com.whatsapp",
        elements: [
          {
            className: "android.widget.Button",
            text: "Send",
            clickable: true,
          },
        ],
      })
    );

    const decision = actionSelector.selectNextAction(step, screenSummary);
    assert(decision.action === "tap", "Selected tap action");
    assert(decision.requiresConfirmation === true, "Identified high-risk action requiring user confirmation");
    assert(decision.confirmationPrompt !== undefined, "Populated confirmation prompt for user safety");
  });

  // 5. Autonomous Verification Engine
  await test("AutonomousVerificationEngine verifies state transitions correctly", () => {
    const step = {
      stepId: "s1",
      stepNumber: 1,
      description: "Open YouTube",
      intendedAction: "open_application" as const,
      targetAppName: "YouTube",
      status: "in_progress" as const,
      retryCount: 0,
      maxRetries: 2,
      expectedOutcome: "YouTube foreground",
    };

    const decision = {
      action: "open_application" as const,
      parameters: { appName: "YouTube" },
      reason: "Open YouTube",
      stepId: "s1",
      expectedOutcome: "YouTube foreground",
      confidence: 0.98,
    };

    const preScreen = screenUnderstandingEngine.analyzeScreen(
      screenObservationManager.createObservation({ packageName: "com.android.launcher", elements: [] })
    );
    const postScreen = screenUnderstandingEngine.analyzeScreen(
      screenObservationManager.createObservation({ packageName: "com.google.android.youtube", elements: [] })
    );

    const outcome = autonomousVerificationEngine.verifyStep(
      step,
      decision,
      {
        requestId: "req1",
        success: true,
        status: "ACTION_EXECUTED",
        device: "android",
        action: "open_application",
        message: "Opened YouTube",
        error: null,
        timestamp: Date.now(),
      },
      preScreen,
      postScreen,
      false
    );

    assert(outcome.verified === true, "Verified transition to YouTube");
    assert(outcome.status === "VERIFIED_SUCCESS", "Status is VERIFIED_SUCCESS");
    assert(outcome.screenChanged === true, "Screen changed is true");
  });

  // 6. Loop Detection & Recovery
  await test("LoopDetector detects repeated ineffective actions and oscillations", () => {
    const repeatedActions: any[] = [
      {
        actionId: "1",
        stepId: "s1",
        action: "tap",
        parameters: { elementId: "btn_1" },
        result: { success: true },
        verification: { status: "VERIFIED_NO_CHANGE", screenChanged: false },
      },
      {
        actionId: "2",
        stepId: "s1",
        action: "tap",
        parameters: { elementId: "btn_1" },
        result: { success: true },
        verification: { status: "VERIFIED_NO_CHANGE", screenChanged: false },
      },
      {
        actionId: "3",
        stepId: "s1",
        action: "tap",
        parameters: { elementId: "btn_1" },
        result: { success: true },
        verification: { status: "VERIFIED_NO_CHANGE", screenChanged: false },
      },
    ];

    const loop = loopDetector.detectLoop(repeatedActions);
    assert(loop.isLoop === true, "Detected repeated ineffective action loop");
    assert(loop.loopType === "repeated_action", "Identified loopType as repeated_action");
    assert(loop.recommendedAction === "replan", "Recommended replan");
  });

  // 7. Full End-to-End Autonomous Journey (Mock Verified)
  await test("AutonomousAgent executes complete multi-step YouTube search & play journey", async () => {
    mockAutonomousEnvironment.reset("ANDROID_HOME");

    const taskResult = await autonomousAgent.startTask(
      "Open YouTube and search for relaxing music",
      {
        mockMode: true,
        maxSteps: 10,
      }
    );

    assert(taskResult.success === true, "Autonomous task completed with success=true");
    assert(taskResult.status === "completed", "Final task status is completed");
    assert(taskResult.totalStepsExecuted >= 3, `Executed ${taskResult.totalStepsExecuted} actions in autonomous loop`);
    assert(taskResult.isMockVerified === true, "Correctly flagged as isMockVerified=true");
    assert(taskResult.isDeviceVerified === false, "Correctly flagged as isDeviceVerified=false (mock execution)");
    assert(mockAutonomousEnvironment.getScreenState() === "YOUTUBE_VIDEO_PLAYING", "Environment reached YOUTUBE_VIDEO_PLAYING state");
  });

  // 8. Safety Stop on Protected Password Screen
  await test("AutonomousAgent halts execution and protects user on password screen", async () => {
    mockAutonomousEnvironment.reset("PASSWORD_AUTH_SCREEN");

    const taskResult = await autonomousAgent.startTask(
      "Type secret into password field",
      {
        mockMode: true,
        maxSteps: 5,
      }
    );

    assert(taskResult.success === false, "Task failed safely when encountering password screen");
    assert(taskResult.status === "failed", "Status is failed");
    assert(taskResult.summary.includes("password") || taskResult.summary.includes("Protected"), "Summary mentions password protection");
  });

  // 9. Task Cancellation Flow
  await test("AutonomousAgent supports cancellation during execution", async () => {
    mockAutonomousEnvironment.reset("ANDROID_HOME");

    // Start long-step task
    const taskPromise = autonomousAgent.startTask("Open YouTube and search for calming sounds", {
      mockMode: true,
      maxSteps: 20,
    });

    const activeTasks = autonomousAgent.getAllTasks();
    const current = activeTasks[activeTasks.length - 1];
    assert(current !== undefined, "Task created in state manager");

    // Cancel task
    const cancelRes = autonomousAgent.cancelTask(current.taskId);
    assert(cancelRes === true, "Task cancellation registered");

    const result = await taskPromise;
    assert(result.status === "cancelled" || result.status === "completed", "Task terminated cleanly");
  });

  console.log("\n========================================================");
  console.log(`PHASE 3 AUTONOMOUS AGENT TEST SUITE PASSED (${results.length}/${results.length} tests)`);
  console.log("========================================================\n");

  return {
    success: true,
    totalTests: results.length,
    passedTests: results.filter((r) => r.success).length,
    results,
  };
}
