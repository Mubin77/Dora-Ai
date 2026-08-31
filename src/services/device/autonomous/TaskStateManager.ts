/**
 * Dora Autonomous Task State Manager
 * 
 * Manages task lifecycle, state machine transitions, timeout enforcement,
 * cancellation signals, and event dispatching.
 */

import {
  AutonomousProgressEvent,
  AutonomousProgressEventType,
  AutonomousTask,
  AutonomousTaskOptions,
  TaskPlan,
  TaskStatus,
  TaskTimeouts,
} from "./AutonomousTaskTypes";

export class TaskStateManager {
  private static instance: TaskStateManager;
  private tasks: Map<string, AutonomousTask> = new Map();
  private progressListeners: Array<(event: AutonomousProgressEvent) => void> = [];

  private readonly DEFAULT_TIMEOUTS: TaskTimeouts = {
    actionTimeoutMs: 10000,        // 10 seconds per individual action
    observationTimeoutMs: 5000,    // 5 seconds for screen inspection
    verificationTimeoutMs: 5000,   // 5 seconds for state verification
    totalTaskTimeoutMs: 120000,    // 120 seconds total task execution budget
  };

  private readonly DEFAULT_MAX_STEPS = 20;
  private readonly DEFAULT_MAX_RETRIES_PER_STEP = 3;

  private constructor() {}

  public static getInstance(): TaskStateManager {
    if (!TaskStateManager.instance) {
      TaskStateManager.instance = new TaskStateManager();
    }
    return TaskStateManager.instance;
  }

  /**
   * Registers a global progress event listener
   */
  public onProgress(callback: (event: AutonomousProgressEvent) => void): () => void {
    this.progressListeners.push(callback);
    return () => {
      this.progressListeners = this.progressListeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Initializes a new AutonomousTask
   */
  public createTask(goal: string, plan: TaskPlan, options: AutonomousTaskOptions = {}): AutonomousTask {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();

    const task: AutonomousTask = {
      taskId,
      goal,
      status: "idle",
      createdAt: now,
      updatedAt: now,
      currentStepIndex: 0,
      maxSteps: options.maxSteps || this.DEFAULT_MAX_STEPS,
      maxRetriesPerStep: options.maxRetriesPerStep || this.DEFAULT_MAX_RETRIES_PER_STEP,
      timeouts: {
        ...this.DEFAULT_TIMEOUTS,
        ...(options.timeouts || {}),
      },
      plan,
      observations: [],
      normalizedScreens: [],
      actionsHistory: [],
      result: null,
      cancellationRequested: false,
      options,
    };

    this.tasks.set(taskId, task);
    this.emitEvent(task, "TASK_STARTED", `Autonomous task created for goal: "${goal}"`);

    return task;
  }

  /**
   * Retrieves an active or completed task
   */
  public getTask(taskId: string): AutonomousTask | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Retrieves all tracked tasks
   */
  public getAllTasks(): AutonomousTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Transitions task to a new state with strict state machine validation
   */
  public transitionState(task: AutonomousTask, newStatus: TaskStatus, message: string, data?: Record<string, any>): boolean {
    if (task.status === "completed" || task.status === "failed" || task.status === "cancelled") {
      // Terminal states cannot be transitioned away from
      return false;
    }

    // Check cancellation
    if (task.cancellationRequested && newStatus !== "cancelled") {
      task.status = "cancelled";
      task.updatedAt = Date.now();
      this.emitEvent(task, "TASK_CANCELLED", "Task cancelled by user request.");
      return true;
    }

    // Check timeout
    const elapsed = Date.now() - task.createdAt;
    if (elapsed > task.timeouts.totalTaskTimeoutMs && newStatus !== "failed" && newStatus !== "cancelled") {
      task.status = "failed";
      task.updatedAt = Date.now();
      this.emitEvent(task, "TASK_FAILED", `Task timed out after ${Math.round(elapsed / 1000)}s.`);
      return true;
    }

    task.status = newStatus;
    task.updatedAt = Date.now();

    const eventType = this.mapStatusToEventType(newStatus);
    this.emitEvent(task, eventType, message, data);
    return true;
  }

  /**
   * Requests cancellation of a running task
   */
  public cancelTask(taskId: string): boolean {
    const task = this.getTask(taskId);
    if (!task) return false;

    task.cancellationRequested = true;
    if (task.status !== "completed" && task.status !== "failed") {
      task.status = "cancelled";
      task.updatedAt = Date.now();
      this.emitEvent(task, "TASK_CANCELLED", `Task "${taskId}" cancelled by user.`);
    }
    return true;
  }

  /**
   * Dispatches progress events to global and task-specific listeners
   */
  public emitEvent(
    task: AutonomousTask,
    type: AutonomousProgressEventType,
    message: string,
    data?: Record<string, any>
  ): void {
    const event: AutonomousProgressEvent = {
      taskId: task.taskId,
      type,
      status: task.status,
      stepIndex: task.currentStepIndex,
      totalSteps: task.plan.steps.length,
      message,
      timestamp: Date.now(),
      data,
    };

    // Task-specific callback
    if (typeof task.options.onProgress === "function") {
      try {
        task.options.onProgress(event);
      } catch (err) {
        console.warn("[TaskStateManager] Error in task options onProgress:", err);
      }
    }

    // Global listeners
    for (const listener of this.progressListeners) {
      try {
        listener(event);
      } catch (err) {
        console.warn("[TaskStateManager] Error in global onProgress listener:", err);
      }
    }
  }

  private mapStatusToEventType(status: TaskStatus): AutonomousProgressEventType {
    switch (status) {
      case "planning": return "PLAN_GENERATED";
      case "observing": return "OBSERVATION_CAPTURED";
      case "acting": return "ACTION_EXECUTED";
      case "verifying": return "VERIFICATION_COMPLETED";
      case "recovering": return "RECOVERY_TRIGGERED";
      case "waiting_for_confirmation": return "CONFIRMATION_REQUIRED";
      case "completed": return "TASK_COMPLETED";
      case "failed": return "TASK_FAILED";
      case "cancelled": return "TASK_CANCELLED";
      default: return "STATE_CHANGED";
    }
  }
}

export const taskStateManager = TaskStateManager.getInstance();
