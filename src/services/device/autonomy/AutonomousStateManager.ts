/**
 * Dora Autonomous State Manager (Phase 3 Autonomy)
 * 
 * Manages valid finite state transitions, cancellation state,
 * and progress event subscriptions for autonomous task execution.
 */

import {
  AutonomousProgressEvent,
  AutonomousProgressEventType,
  AutonomousState,
  AutonomousTaskStatus,
} from "./AutonomousTypes";

export class AutonomousStateManager {
  private currentState: AutonomousState = "IDLE";
  private cancelledTasks: Set<string> = new Set();
  private eventListeners: Array<(event: AutonomousProgressEvent) => void> = [];

  private validTransitions: Record<AutonomousState, AutonomousState[]> = {
    IDLE: ["UNDERSTANDING", "PLANNING", "CANCELLED"],
    UNDERSTANDING: ["PLANNING", "FAILED", "CANCELLED"],
    PLANNING: ["OBSERVING", "DECIDING", "WAITING_FOR_CONFIRMATION", "FAILED", "CANCELLED"],
    OBSERVING: ["DECIDING", "VERIFYING", "RECOVERING", "COMPLETED", "FAILED", "CANCELLED"],
    DECIDING: ["ACTING", "WAITING_FOR_CONFIRMATION", "RECOVERING", "COMPLETED", "FAILED", "CANCELLED"],
    ACTING: ["OBSERVING", "VERIFYING", "FAILED", "CANCELLED"],
    VERIFYING: ["DECIDING", "OBSERVING", "RECOVERING", "COMPLETED", "FAILED", "CANCELLED"],
    RECOVERING: ["OBSERVING", "DECIDING", "ACTING", "PLANNING", "FAILED", "CANCELLED"],
    WAITING_FOR_CONFIRMATION: ["DECIDING", "ACTING", "CANCELLED", "FAILED"],
    COMPLETED: ["IDLE", "PLANNING"],
    FAILED: ["IDLE", "PLANNING"],
    CANCELLED: ["IDLE", "PLANNING"],
  };

  /**
   * Subscribes to execution progress events
   */
  public subscribe(listener: (event: AutonomousProgressEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== listener);
    };
  }

  public getState(): AutonomousState {
    return this.currentState;
  }

  /**
   * Attempts a state transition, validating against transition rules
   */
  public transition(newState: AutonomousState, taskId: string, reason?: string): boolean {
    const allowed = this.validTransitions[this.currentState];
    if (!allowed || !allowed.includes(newState)) {
      console.warn(
        `[AutonomousStateManager] Invalid transition attempted: ${this.currentState} -> ${newState} (${reason || "No reason"})`
      );
      // Soft transition to ensure system does not crash, but log warning
    }

    this.currentState = newState;
    return true;
  }

  /**
   * Emits a typed progress event to all listeners
   */
  public emitEvent(event: AutonomousProgressEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.warn("[AutonomousStateManager] Error in event listener:", err);
      }
    }
  }

  /**
   * Requests cancellation of a task
   */
  public cancelTask(taskId: string): void {
    this.cancelledTasks.add(taskId);
    this.currentState = "CANCELLED";
    this.emitEvent({
      type: "TASK_CANCELLED",
      taskId,
      status: "cancelled",
      currentStep: 0,
      totalSteps: 0,
      message: `Task ${taskId} was cancelled by user.`,
      timestamp: Date.now(),
    });
  }

  /**
   * Checks if a task has been cancelled
   */
  public isCancelled(taskId: string): boolean {
    return this.cancelledTasks.has(taskId);
  }

  /**
   * Clears cancellation flag for a new execution
   */
  public reset(taskId?: string): void {
    if (taskId) {
      this.cancelledTasks.delete(taskId);
    } else {
      this.cancelledTasks.clear();
    }
    this.currentState = "IDLE";
  }

  public mapStateToTaskStatus(state: AutonomousState): AutonomousTaskStatus {
    switch (state) {
      case "PLANNING":
      case "UNDERSTANDING":
        return "planning";
      case "OBSERVING":
        return "observing";
      case "DECIDING":
      case "ACTING":
        return "acting";
      case "VERIFYING":
        return "verifying";
      case "RECOVERING":
        return "recovering";
      case "WAITING_FOR_CONFIRMATION":
        return "waiting_for_confirmation";
      case "COMPLETED":
        return "completed";
      case "CANCELLED":
        return "cancelled";
      case "FAILED":
      default:
        return "failed";
    }
  }
}

export const autonomousStateManager = new AutonomousStateManager();
