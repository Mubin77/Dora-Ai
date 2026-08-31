/**
 * Dora Loop Detector (Phase 3 Autonomy)
 * 
 * Detects infinite loops, repeated ineffective actions, and observation cycles
 * during autonomous task execution.
 */

import { AutonomousActionRecord } from "./AutonomousTypes";

export class LoopDetector {
  private static instance: LoopDetector;

  private constructor() {}

  public static getInstance(): LoopDetector {
    if (!LoopDetector.instance) {
      LoopDetector.instance = new LoopDetector();
    }
    return LoopDetector.instance;
  }

  /**
   * Evaluates action history and observation fingerprints for repetitive cycles
   */
  public detectLoop(
    actionHistory: AutonomousActionRecord[],
    fingerprintHistory: string[],
    maxRepeatedActions: number = 3
  ): {
    hasLoop: boolean;
    reason?: string;
    loopType?: "repeated_action" | "state_oscillation" | "ineffective_actions";
    suggestedRecovery?: "scroll" | "press_back" | "replan";
  } {
    if (actionHistory.length < 2 && fingerprintHistory.length < 4) {
      return { hasLoop: false };
    }

    // 1. Check for Identical Ineffective Actions in a Row
    const recentActions = actionHistory.slice(-maxRepeatedActions);
    if (recentActions.length >= maxRepeatedActions) {
      const firstAction = recentActions[0];
      const allIdentical = recentActions.every(
        (a) =>
          a.action === firstAction.action &&
          a.targetDescription === firstAction.targetDescription
      );

      if (allIdentical) {
        return {
          hasLoop: true,
          reason: `Action '${firstAction.action}' on '${firstAction.targetDescription}' was repeated ${maxRepeatedActions} times without forward progress.`,
          loopType: "repeated_action",
          suggestedRecovery: firstAction.action === "tap" ? "scroll" : "replan",
        };
      }
    }

    // 2. Check for State Oscillation (e.g. A -> B -> A -> B)
    if (fingerprintHistory.length >= 4) {
      const last4 = fingerprintHistory.slice(-4);
      if (last4[0] === last4[2] && last4[1] === last4[3] && last4[0] !== last4[1]) {
        return {
          hasLoop: true,
          reason: "Screen state is oscillating back and forth between two UI layouts.",
          loopType: "state_oscillation",
          suggestedRecovery: "press_back",
        };
      }
    }

    // 3. Check for Consecutive No-Op / Failed Actions
    const recentFailures = actionHistory.slice(-3);
    if (recentFailures.length >= 3 && recentFailures.every((a) => !a.result.success)) {
      return {
        hasLoop: true,
        reason: "Three consecutive device actions failed.",
        loopType: "ineffective_actions",
        suggestedRecovery: "replan",
      };
    }

    return { hasLoop: false };
  }
}

export const loopDetector = LoopDetector.getInstance();
