/**
 * Dora Autonomous Android Task Agent (Phase 3 Core Orchestrator)
 * 
 * Orchestrates the closed-loop autonomous execution cycle:
 * GOAL -> UNDERSTAND -> PLAN -> OBSERVE -> DECIDE -> SAFETY -> ACT -> OBSERVE AGAIN -> VERIFY -> (SUCCESS ? NEXT : RECOVER) -> COMPLETE
 * 
 * Never blindly executes predefined sequences; continuously verifies and adapts to live screen state.
 */

import {
  ActionDecision,
  AutonomousActionRecord,
  AutonomousConfig,
  AutonomousProgressEvent,
  AutonomousTask,
  AutonomousTaskResult,
  AutonomousTaskStatus,
  TaskPlan,
  TaskPlanStep,
} from "./AutonomousTypes";
import { DeviceActionResult, ScreenObservation } from "../DeviceActionTypes";
import { goalInterpreter } from "./GoalInterpreter";
import { screenInterpreter } from "./ScreenInterpreter";
import { actionSelector } from "./ActionSelector";
import { verificationEngine } from "./VerificationEngine";
import { recoveryEngine } from "./RecoveryEngine";
import { loopDetector } from "./LoopDetector";
import { autonomousStateManager } from "./AutonomousStateManager";
import { mockAutonomousSimulator } from "./MockAutonomousSimulator";
import { deviceControlService } from "../DeviceControlService";
import { androidControlService } from "../AndroidControlService";
import { deviceSafety } from "../DeviceSafety";

export class AutonomousAgent {
  private static instance: AutonomousAgent;

  private activeTasks: Map<string, AutonomousTask> = new Map();

  private readonly DEFAULT_CONFIG: Required<AutonomousConfig> = {
    maxSteps: 20,
    maxRetriesPerAction: 3,
    maxRepeatedActions: 3,
    actionTimeoutMs: 10000,
    observationTimeoutMs: 5000,
    verificationTimeoutMs: 5000,
    totalTaskTimeoutMs: 120000,
    isMockMode: false,
  };

  private constructor() {}

  public static getInstance(): AutonomousAgent {
    if (!AutonomousAgent.instance) {
      AutonomousAgent.instance = new AutonomousAgent();
    }
    return AutonomousAgent.instance;
  }

  /**
   * Main entry point to run an autonomous task against real Android bridge or mock simulator
   */
  public async executeTask(
    goal: string,
    options: AutonomousConfig = {}
  ): Promise<AutonomousTaskResult> {
    const config: Required<AutonomousConfig> = {
      ...this.DEFAULT_CONFIG,
      ...options,
    };

    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const startTime = Date.now();
    const actionHistory: AutonomousActionRecord[] = [];
    const observationHistory: Array<{ observationId: string; timestamp: number; packageName?: string }> = [];
    const fingerprintHistory: string[] = [];
    const retryCounts: Record<string, number> = {};

    // Determine mode: If native bridge is active, use live device; otherwise fall back to mock mode
    const isBridgeConnected = await androidControlService.isBridgeAvailable();
    const isMockMode = config.isMockMode || !isBridgeConnected;

    if (isMockMode) {
      mockAutonomousSimulator.reset();
    }

    // 1. Initialize Task and State Machine
    autonomousStateManager.reset(taskId);
    autonomousStateManager.transition("UNDERSTANDING", taskId, "Decomposing goal");

    this.emitProgress({
      type: "TASK_STARTED",
      taskId,
      status: "planning",
      currentStep: 0,
      totalSteps: 0,
      message: `Starting task: "${goal}"`,
      data: { goal, isMockMode },
      timestamp: Date.now(),
    });

    // 2. Planning Phase
    autonomousStateManager.transition("PLANNING", taskId, "Generating initial plan");
    let plan = goalInterpreter.planTask(goal, taskId);

    const taskRecord: AutonomousTask = {
      taskId,
      goal,
      status: "planning",
      createdAt: startTime,
      updatedAt: startTime,
      currentStep: 0,
      maxSteps: config.maxSteps,
      steps: plan.steps,
      observations: observationHistory,
      actions: actionHistory,
      result: null,
    };
    this.activeTasks.set(taskId, taskRecord);

    let currentObservation: ScreenObservation | null = null;
    let stepIndex = 0;
    let executionStatus: AutonomousTaskStatus = "acting";

    // 3. Autonomous Observe-Decide-Act-Verify Loop
    while (stepIndex < config.maxSteps) {
      const loopTime = Date.now();

      // Check Cancellation
      if (autonomousStateManager.isCancelled(taskId)) {
        executionStatus = "cancelled";
        break;
      }

      // Check Total Timeout
      if (loopTime - startTime > config.totalTaskTimeoutMs) {
        return this.finishTask({
          taskId,
          goal,
          success: false,
          status: "failed",
          stepsCompleted: plan.steps.filter((s) => s.status === "completed").length,
          totalSteps: plan.steps.length,
          actionCount: actionHistory.length,
          durationMs: loopTime - startTime,
          summaryMessage: "Task timed out before completion.",
          error: { code: "TASK_TIMEOUT", details: "Execution exceeded totalTaskTimeoutMs." },
          plan,
          history: actionHistory,
          isMockMode,
        });
      }

      // -------------------------------------------------------------
      // Step A: Observe Screen
      // -------------------------------------------------------------
      autonomousStateManager.transition("OBSERVING", taskId, "Fetching screen state");
      taskRecord.status = "observing";

      try {
        currentObservation = await this.fetchObservation(isMockMode);
        if (currentObservation) {
          const norm = screenInterpreter.normalize(currentObservation);
          observationHistory.push({
            observationId: currentObservation.observationId,
            timestamp: currentObservation.timestamp,
            packageName: currentObservation.packageName,
          });
          fingerprintHistory.push(norm.fingerprint);

          this.emitProgress({
            type: "OBSERVATION_UPDATED",
            taskId,
            status: "observing",
            currentStep: stepIndex + 1,
            totalSteps: plan.steps.length,
            message: `Screen observed: ${norm.packageName || "Launcher"} (${norm.elementCount} elements)`,
            data: { packageName: norm.packageName, elementCount: norm.elementCount },
            timestamp: Date.now(),
          });
        }
      } catch (err: any) {
        console.warn("[AutonomousAgent] Observation failed:", err);
      }

      // -------------------------------------------------------------
      // Step B: Loop & Oscillation Detection
      // -------------------------------------------------------------
      const loopCheck = loopDetector.detectLoop(
        actionHistory,
        fingerprintHistory,
        config.maxRepeatedActions
      );

      if (loopCheck.hasLoop) {
        console.warn(`[AutonomousAgent] Loop detected: ${loopCheck.reason}`);
        if (loopCheck.suggestedRecovery === "replan") {
          plan = goalInterpreter.replan(plan, "Loop detected; modifying route");
        }
      }

      // Check if overall goal is already complete
      const goalCheck = verificationEngine.verifyGoalCompletion(plan, currentObservation);
      if (goalCheck.isGoalComplete && goalCheck.verified) {
        executionStatus = "completed";
        break;
      }

      // -------------------------------------------------------------
      // Step C: Decide Next Action
      // -------------------------------------------------------------
      autonomousStateManager.transition("DECIDING", taskId, "Selecting next action");
      taskRecord.status = "acting";

      const currentStep = plan.steps.find((s) => s.status === "pending" || s.status === "in_progress") || null;
      if (currentStep) {
        currentStep.status = "in_progress";
      }

      const decision: ActionDecision = actionSelector.selectNextAction(
        plan,
        currentStep,
        currentObservation
      );

      // Check Confirmation Policy
      const confirmation = actionSelector.checkConfirmationRequirement(decision, goal);
      if (confirmation.requiresConfirmation) {
        autonomousStateManager.transition("WAITING_FOR_CONFIRMATION", taskId, confirmation.reason);
        taskRecord.status = "waiting_for_confirmation";
        taskRecord.confirmationRequest = {
          taskId,
          action: decision.action,
          reason: confirmation.reason || "Action requires explicit user confirmation.",
          targetDescription: decision.reason,
          parameters: decision.parameters,
          riskLevel: "CONFIRMATION_REQUIRED",
          timestamp: Date.now(),
        };

        this.emitProgress({
          type: "CONFIRMATION_REQUIRED",
          taskId,
          status: "waiting_for_confirmation",
          currentStep: stepIndex + 1,
          totalSteps: plan.steps.length,
          message: confirmation.reason || "Confirmation required to proceed.",
          data: taskRecord.confirmationRequest as any,
          timestamp: Date.now(),
        });

        // Pause autonomous execution until confirmed
        return this.finishTask({
          taskId,
          goal,
          success: false,
          status: "waiting_for_confirmation",
          stepsCompleted: plan.steps.filter((s) => s.status === "completed").length,
          totalSteps: plan.steps.length,
          actionCount: actionHistory.length,
          durationMs: Date.now() - startTime,
          summaryMessage: `Action paused: ${confirmation.reason}`,
          plan,
          history: actionHistory,
          isMockMode,
        });
      }

      // -------------------------------------------------------------
      // Step D: Execute Action
      // -------------------------------------------------------------
      autonomousStateManager.transition("ACTING", taskId, `Executing ${decision.action}`);
      const actionStartTime = Date.now();

      this.emitProgress({
        type: "ACTION_STARTED",
        taskId,
        status: "acting",
        currentStep: stepIndex + 1,
        totalSteps: plan.steps.length,
        message: decision.reason,
        data: { action: decision.action, target: decision.target },
        timestamp: actionStartTime,
      });

      const preActionObservation = currentObservation;
      let actionResult: DeviceActionResult;

      if (isMockMode) {
        mockAutonomousSimulator.simulateAction(decision.action, decision.parameters);
        actionResult = {
          requestId: `mock_act_${Date.now()}`,
          success: true,
          status: "ACTION_EXECUTED",
          device: "android",
          action: decision.action,
          message: `Simulated ${decision.action} successfully.`,
          timestamp: Date.now(),
          error: null,
        };
      } else {
        actionResult = await deviceControlService.executeAction({
          device: "android",
          action: decision.action,
          parameters: decision.parameters,
        });
      }

      const actionDuration = Date.now() - actionStartTime;

      // -------------------------------------------------------------
      // Step E: Post-Action Observation & Verification
      // -------------------------------------------------------------
      autonomousStateManager.transition("VERIFYING", taskId, "Verifying state change");
      const postActionObservation = await this.fetchObservation(isMockMode);

      actionHistory.push({
        stepIndex,
        stepId: currentStep?.stepId,
        action: decision.action,
        targetDescription: decision.reason,
        parameters: decision.parameters,
        result: actionResult,
        fingerprintBefore: preActionObservation ? screenInterpreter.normalize(preActionObservation).fingerprint : undefined,
        fingerprintAfter: postActionObservation ? screenInterpreter.normalize(postActionObservation).fingerprint : undefined,
        timestamp: Date.now(),
        durationMs: actionDuration,
      });

      this.emitProgress({
        type: "ACTION_COMPLETED",
        taskId,
        status: "verifying",
        currentStep: stepIndex + 1,
        totalSteps: plan.steps.length,
        message: `Action ${decision.action} completed.`,
        data: { success: actionResult.success },
        timestamp: Date.now(),
      });

      // Verify Step Outcome
      if (currentStep) {
        const stepVerification = verificationEngine.verifyStep(
          currentStep,
          preActionObservation,
          postActionObservation,
          plan
        );

        if (stepVerification.verified) {
          currentStep.status = "completed";
          this.emitProgress({
            type: "VERIFICATION_COMPLETED",
            taskId,
            status: "verifying",
            currentStep: stepIndex + 1,
            totalSteps: plan.steps.length,
            message: `Step verified: ${stepVerification.reason}`,
            data: { confidence: stepVerification.confidence },
            timestamp: Date.now(),
          });
        } else {
          // -------------------------------------------------------------
          // Step F: Recovery & Re-planning on Failure
          // -------------------------------------------------------------
          autonomousStateManager.transition("RECOVERING", taskId, "Attempting recovery");
          const retries = (retryCounts[currentStep.stepId] || 0) + 1;
          retryCounts[currentStep.stepId] = retries;

          const recovery = recoveryEngine.determineRecoveryStrategy(
            currentStep,
            retries,
            postActionObservation,
            plan,
            actionResult.error?.code
          );

          if (recovery.strategy === "abort") {
            currentStep.status = "failed";
            executionStatus = "failed";
            return this.finishTask({
              taskId,
              goal,
              success: false,
              status: "failed",
              stepsCompleted: plan.steps.filter((s) => s.status === "completed").length,
              totalSteps: plan.steps.length,
              actionCount: actionHistory.length,
              durationMs: Date.now() - startTime,
              summaryMessage: `Task failed: ${recovery.reason}`,
              error: { code: "UNRECOVERABLE_ERROR", details: recovery.reason },
              plan,
              history: actionHistory,
              isMockMode,
            });
          }

          if (recovery.updatedPlan) {
            plan = recovery.updatedPlan;
          }

          this.emitProgress({
            type: "RECOVERY_STARTED",
            taskId,
            status: "recovering",
            currentStep: stepIndex + 1,
            totalSteps: plan.steps.length,
            message: recovery.reason,
            data: { strategy: recovery.strategy, attempt: retries },
            timestamp: Date.now(),
          });
        }
      }

      currentObservation = postActionObservation;
      stepIndex++;
    }

    // Step Limit Exceeded Check
    if (stepIndex >= config.maxSteps && executionStatus !== "completed") {
      return this.finishTask({
        taskId,
        goal,
        success: false,
        status: "failed",
        stepsCompleted: plan.steps.filter((s) => s.status === "completed").length,
        totalSteps: plan.steps.length,
        actionCount: actionHistory.length,
        durationMs: Date.now() - startTime,
        summaryMessage: "Task stopped: autonomous step limit reached.",
        error: { code: "AUTONOMOUS_STEP_LIMIT_REACHED", details: `Exceeded ${config.maxSteps} autonomous steps.` },
        plan,
        history: actionHistory,
        isMockMode,
      });
    }

    // Final Success Completion
    return this.finishTask({
      taskId,
      goal,
      success: true,
      status: "completed",
      stepsCompleted: plan.steps.filter((s) => s.status === "completed").length,
      totalSteps: plan.steps.length,
      actionCount: actionHistory.length,
      durationMs: Date.now() - startTime,
      summaryMessage: this.generateHumanSummary(plan, goal),
      error: null,
      plan,
      history: actionHistory,
      isMockMode,
    });
  }

  /**
   * Cancels a currently running task
   */
  public cancelTask(taskId: string): boolean {
    const task = this.activeTasks.get(taskId);
    if (!task) return false;
    autonomousStateManager.cancelTask(taskId);
    task.status = "cancelled";
    return true;
  }

  /**
   * Retrieves active or completed task by ID
   */
  public getTask(taskId: string): AutonomousTask | null {
    return this.activeTasks.get(taskId) || null;
  }

  private async fetchObservation(isMockMode: boolean): Promise<ScreenObservation | null> {
    if (isMockMode) {
      return mockAutonomousSimulator.getCurrentScreenObservation();
    }

    const readResult = await androidControlService.readScreen({ includeNonClickable: true });
    if (readResult.success && readResult.data) {
      return readResult.data;
    }
    return null;
  }

  private finishTask(result: AutonomousTaskResult): AutonomousTaskResult {
    autonomousStateManager.transition(
      result.status === "completed" ? "COMPLETED" : (result.status === "cancelled" ? "CANCELLED" : "FAILED"),
      result.taskId,
      result.summaryMessage
    );

    const task = this.activeTasks.get(result.taskId);
    if (task) {
      task.status = result.status;
      task.result = result;
      task.updatedAt = Date.now();
    }

    this.emitProgress({
      type: result.status === "completed" ? "TASK_COMPLETED" : (result.status === "cancelled" ? "TASK_CANCELLED" : "TASK_FAILED"),
      taskId: result.taskId,
      status: result.status,
      currentStep: result.stepsCompleted,
      totalSteps: result.totalSteps,
      message: result.summaryMessage,
      data: { success: result.success, error: result.error },
      timestamp: Date.now(),
    });

    return result;
  }

  private generateHumanSummary(plan: TaskPlan, goal: string): string {
    const app = plan.targetApp || "target app";
    const searchQuery = goalInterpreter.extractSearchQuery(goal);

    if (searchQuery) {
      return `Done — I opened ${app} and searched for "${searchQuery}".`;
    }

    return `Done — I opened ${app} on your phone.`;
  }

  private emitProgress(event: AutonomousProgressEvent): void {
    autonomousStateManager.emitEvent(event);
  }
}

export const autonomousAgent = AutonomousAgent.getInstance();
