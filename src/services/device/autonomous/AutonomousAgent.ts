/**
 * Dora Autonomous Android Agent (Phase 3 Core Engine)
 * 
 * Implements the continuous autonomous loop:
 * GOAL → UNDERSTAND → PLAN → OBSERVE → DECIDE → ACT → OBSERVE AGAIN → VERIFY → (SUCCESS? NEXT STEP : RECOVER / REPLAN) → TASK COMPLETE
 * 
 * Provides adaptive goal execution, automated recovery, loop detection,
 * strict safety boundaries, and mock-verified execution.
 */

import { deviceControlService } from "../DeviceControlService";
import { ScreenObservation, DeviceActionResult } from "../DeviceActionTypes";
import {
  ActionDecision,
  AutonomousActionRecord,
  AutonomousProgressEvent,
  AutonomousTask,
  AutonomousTaskOptions,
  AutonomousTaskResult,
  NormalizedScreenSummary,
  StepVerificationOutcome,
  TaskPlanStep,
} from "./AutonomousTaskTypes";
import { goalInterpreter } from "./GoalInterpreter";
import { autonomousPlanner } from "./AutonomousPlanner";
import { screenUnderstandingEngine } from "./ScreenUnderstandingEngine";
import { actionSelector } from "./ActionSelector";
import { autonomousVerificationEngine } from "./AutonomousVerificationEngine";
import { recoveryEngine } from "./RecoveryEngine";
import { loopDetector } from "./LoopDetector";
import { taskStateManager } from "./TaskStateManager";
import { mockAutonomousEnvironment } from "./MockAutonomousEnvironment";

export class AutonomousAgent {
  private static instance: AutonomousAgent;

  private constructor() {}

  public static getInstance(): AutonomousAgent {
    if (!AutonomousAgent.instance) {
      AutonomousAgent.instance = new AutonomousAgent();
    }
    return AutonomousAgent.instance;
  }

  /**
   * Registers global progress listener for autonomous tasks
   */
  public onProgress(callback: (event: AutonomousProgressEvent) => void): () => void {
    return taskStateManager.onProgress(callback);
  }

  /**
   * Retrieves task by ID
   */
  public getTask(taskId: string): AutonomousTask | null {
    return taskStateManager.getTask(taskId);
  }

  /**
   * Retrieves all tracked tasks
   */
  public getAllTasks(): AutonomousTask[] {
    return taskStateManager.getAllTasks();
  }

  /**
   * Cancels a running autonomous task
   */
  public cancelTask(taskId: string): boolean {
    return taskStateManager.cancelTask(taskId);
  }

  /**
   * Responds to a user confirmation request for a sensitive/high-risk step
   */
  public async confirmAction(taskId: string, approved: boolean): Promise<AutonomousTaskResult | null> {
    const task = taskStateManager.getTask(taskId);
    if (!task || task.status !== "waiting_for_confirmation" || !task.pendingConfirmation) {
      return null;
    }

    if (!approved) {
      taskStateManager.transitionState(task, "cancelled", "Action confirmation declined by user.");
      task.pendingConfirmation = undefined;
      return this.finalizeTask(task, false, "User declined confirmation for sensitive action.");
    }

    // User confirmed -> proceed with execution
    const pendingAction = task.pendingConfirmation.action;
    task.pendingConfirmation = undefined;
    taskStateManager.transitionState(task, "acting", `User confirmed action: ${pendingAction.action}`);

    return this.executeAutonomousLoop(task, pendingAction);
  }

  /**
   * Starts an autonomous task given a user goal
   */
  public async startTask(goal: string, options: AutonomousTaskOptions = {}): Promise<AutonomousTaskResult> {
    const startTime = Date.now();

    // 1. UNDERSTAND: Interpret natural language goal
    const interpreted = goalInterpreter.interpret(goal);

    // 2. PLAN: Generate initial adaptive task plan
    const plan = autonomousPlanner.generateInitialPlan(interpreted);

    // 3. Initialize task state
    const task = taskStateManager.createTask(goal, plan, options);
    taskStateManager.transitionState(task, "planning", `Formulated initial ${plan.steps.length}-step plan for: "${goal}"`, { plan });

    // 4. Run the Autonomous Execution Loop
    return this.executeAutonomousLoop(task);
  }

  /**
   * Executes the core autonomous decision & action loop
   */
  private async executeAutonomousLoop(
    task: AutonomousTask,
    resumedAction?: ActionDecision
  ): Promise<AutonomousTaskResult> {
    const isMock = Boolean(task.options.mockMode || !deviceControlService.getBridgeStatus().connected);

    while (task.currentStepIndex < task.plan.steps.length && task.actionsHistory.length < task.maxSteps) {
      if (task.cancellationRequested || task.status === "cancelled") {
        return this.finalizeTask(task, false, "Task was cancelled.");
      }

      const currentStep = task.plan.steps[task.currentStepIndex];
      currentStep.status = "in_progress";
      currentStep.startedAt = currentStep.startedAt || Date.now();

      // Step A: OBSERVE - Capture current screen observation
      taskStateManager.transitionState(
        task,
        "observing",
        `Observing screen for step ${currentStep.stepNumber}: "${currentStep.description}"`
      );

      const preObservation = await this.captureObservation(isMock);
      const preScreen = screenUnderstandingEngine.analyzeScreen(preObservation);
      if (preObservation) {
        task.observations.push(preObservation);
      }
      if (preScreen) {
        task.normalizedScreens.push(preScreen);
      }

      // Check for security violation on active screen
      if (preScreen?.isPasswordOrAuthScreen) {
        taskStateManager.transitionState(task, "failed", "Protected authentication/password screen detected. Stopping autonomous execution.");
        return this.finalizeTask(task, false, "Protected password/auth screen detected. Autonomous execution blocked for user privacy.");
      }

      // Step B: DECIDE - Select next action or resume from confirmation
      let decision: ActionDecision;
      if (resumedAction) {
        decision = resumedAction;
        resumedAction = undefined;
      } else {
        taskStateManager.transitionState(task, "deciding", `Deciding next action for step ${currentStep.stepNumber}`);
        decision = actionSelector.selectNextAction(
          currentStep,
          preScreen,
          task.actionsHistory.map((a) => ({ action: a.action, success: a.result.success }))
        );
      }

      // Check if user confirmation is required
      if (decision.requiresConfirmation && !task.options.allowHighRiskWithConfirmation) {
        task.pendingConfirmation = {
          prompt: decision.confirmationPrompt || `Confirmation required for step: ${currentStep.description}`,
          action: decision,
          stepId: currentStep.stepId,
        };
        taskStateManager.transitionState(
          task,
          "waiting_for_confirmation",
          decision.confirmationPrompt || "Awaiting user confirmation",
          { pendingConfirmation: task.pendingConfirmation }
        );
        // Pause execution and return intermediate state
        return this.generateIntermediateResult(task);
      }

      // Step C: ACT - Execute the chosen action
      taskStateManager.transitionState(
        task,
        "acting",
        `Executing ${decision.action}: ${decision.reason}`,
        { decision }
      );

      const actionStartTime = Date.now();
      const actionResult = await this.executeAction(decision, isMock);
      const actionDuration = Date.now() - actionStartTime;

      // Step D: OBSERVE AGAIN - Capture post-action screen state
      const postObservation = await this.captureObservation(isMock);
      const postScreen = screenUnderstandingEngine.analyzeScreen(postObservation);
      if (postObservation) {
        task.observations.push(postObservation);
      }
      if (postScreen) {
        task.normalizedScreens.push(postScreen);
      }

      // Step E: VERIFY - Check if action achieved the expected outcome
      taskStateManager.transitionState(task, "verifying", `Verifying result of step ${currentStep.stepNumber}`);
      const isFinalStep = task.currentStepIndex === task.plan.steps.length - 1;
      const verification = autonomousVerificationEngine.verifyStep(
        currentStep,
        decision,
        actionResult,
        preScreen,
        postScreen,
        isFinalStep
      );

      const actionRecord: AutonomousActionRecord = {
        actionId: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        stepId: currentStep.stepId,
        action: decision.action,
        parameters: decision.parameters,
        decisionReason: decision.reason,
        preObservationId: preObservation?.observationId,
        postObservationId: postObservation?.observationId,
        result: actionResult,
        verification,
        timestamp: Date.now(),
        durationMs: actionDuration,
      };
      task.actionsHistory.push(actionRecord);

      // Step F: SUCCESS vs RECOVER / REPLAN
      if (verification.verified && (verification.status === "VERIFIED_SUCCESS" || verification.isSubgoalSatisfied)) {
        // Step succeeded
        currentStep.status = "completed";
        currentStep.completedAt = Date.now();
        currentStep.actualOutcome = verification.details;

        task.currentStepIndex += 1;

        // Check if goal is fully satisfied or all steps are completed
        if (task.currentStepIndex >= task.plan.steps.length || verification.isGoalSatisfied) {
          taskStateManager.transitionState(task, "completed", `Task completed successfully: ${verification.details}`);
          return this.finalizeTask(task, true, `Successfully completed goal: "${task.goal}"`);
        }
      } else {
        // Step verification failed or no state change detected
        currentStep.retryCount += 1;
        taskStateManager.transitionState(task, "recovering", `Step ${currentStep.stepNumber} unverified. Assessing recovery strategy.`);

        // 1. Loop Detection
        const loopCheck = loopDetector.detectLoop(task.actionsHistory, postScreen?.fingerprint);
        if (loopCheck.isLoop) {
          taskStateManager.emitEvent(task, "LOOP_DETECTED", `Loop detected: ${loopCheck.description}`);
          if (loopCheck.recommendedAction === "abort") {
            return this.finalizeTask(task, false, `Aborted due to loop: ${loopCheck.description}`);
          }
        }

        // 2. Recovery Planning
        const recovery = recoveryEngine.planRecovery(
          currentStep,
          decision,
          actionResult,
          verification,
          postScreen,
          task.actionsHistory.map((a) => ({ action: a.action, success: a.result.success }))
        );

        if (recovery.strategy === "abort_task") {
          currentStep.status = "failed";
          currentStep.error = recovery.reason;
          taskStateManager.transitionState(task, "failed", recovery.reason);
          return this.finalizeTask(task, false, recovery.reason);
        }

        // 3. Plan Adaptation
        task.plan = autonomousPlanner.adaptPlan(task.plan, postScreen, task.currentStepIndex, currentStep);
        taskStateManager.emitEvent(task, "PLAN_UPDATED", `Adapted plan after recovery evaluation`, { plan: task.plan });

        // If recovery suggests an immediate fallback action (like scroll or back), execute it
        if (recovery.actionToExecute) {
          await this.executeAction(recovery.actionToExecute, isMock);
        }
      }
    }

    if (task.actionsHistory.length >= task.maxSteps) {
      taskStateManager.transitionState(task, "failed", `Exceeded maximum step budget of ${task.maxSteps} actions.`);
      return this.finalizeTask(task, false, `Task stopped: reached maximum step budget (${task.maxSteps} actions).`);
    }

    return this.finalizeTask(task, true, "Goal completed.");
  }

  private async captureObservation(isMock: boolean): Promise<ScreenObservation | null> {
    if (isMock) {
      return mockAutonomousEnvironment.getCurrentScreenObservation();
    }

    const obsRes = await deviceControlService.readScreen({ forceFresh: true });
    if (obsRes.success && obsRes.data?.observation) {
      return obsRes.data.observation as ScreenObservation;
    }
    // Fallback to mock observation if physical bridge failed
    return mockAutonomousEnvironment.getCurrentScreenObservation();
  }

  private async executeAction(decision: ActionDecision, isMock: boolean): Promise<DeviceActionResult> {
    if (isMock) {
      const mockResult = mockAutonomousEnvironment.simulateAction(decision.action, decision.parameters);
      return {
        requestId: `mock_${Date.now()}`,
        success: mockResult.success,
        status: mockResult.success ? ("ACTION_EXECUTED" as const) : ("ACTION_FAILED" as const),
        device: "android" as const,
        action: decision.action,
        message: mockResult.message,
        error: mockResult.success ? null : { code: "ACTION_FAILED" as const, details: mockResult.message },
        timestamp: Date.now(),
      };
    }

    return await deviceControlService.executeAction({
      device: "android",
      action: decision.action,
      parameters: decision.parameters,
    });
  }

  private finalizeTask(task: AutonomousTask, success: boolean, summary: string): AutonomousTaskResult {
    const isMock = Boolean(task.options.mockMode || !deviceControlService.getBridgeStatus().connected);
    const duration = Date.now() - task.createdAt;

    const result: AutonomousTaskResult = {
      taskId: task.taskId,
      goal: task.goal,
      success,
      status: task.status,
      summary,
      totalStepsExecuted: task.actionsHistory.length,
      totalDurationMs: duration,
      plan: task.plan,
      actionsHistory: task.actionsHistory,
      finalObservation: task.observations[task.observations.length - 1] || null,
      error: success ? null : { code: "TASK_FAILED", details: summary },
      isMockVerified: isMock,
      isDeviceVerified: !isMock && success,
    };

    task.result = result;
    return result;
  }

  private generateIntermediateResult(task: AutonomousTask): AutonomousTaskResult {
    const isMock = Boolean(task.options.mockMode || !deviceControlService.getBridgeStatus().connected);
    return {
      taskId: task.taskId,
      goal: task.goal,
      success: false,
      status: task.status,
      summary: task.pendingConfirmation?.prompt || "Task paused awaiting user confirmation",
      totalStepsExecuted: task.actionsHistory.length,
      totalDurationMs: Date.now() - task.createdAt,
      plan: task.plan,
      actionsHistory: task.actionsHistory,
      finalObservation: task.observations[task.observations.length - 1] || null,
      error: null,
      isMockVerified: isMock,
      isDeviceVerified: false,
    };
  }
}

export const autonomousAgent = AutonomousAgent.getInstance();
