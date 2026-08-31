/**
 * Dora Autonomous Loop Detector
 * 
 * Monitors execution history, screen fingerprints, and repeated action patterns
 * to detect unproductive oscillation or repeated ineffective interactions.
 */

import { DeviceAction } from "../DeviceActionTypes";
import { AutonomousActionRecord } from "./AutonomousTaskTypes";

export interface LoopDetectionResult {
  isLoop: boolean;
  loopType?: "repeated_action" | "screen_oscillation" | "unproductive_scroll";
  description?: string;
  recommendedAction?: "break_loop_by_back" | "replan" | "abort";
}

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
   * Evaluates recent action history and screen fingerprints for loops
   */
  public detectLoop(
    actions: AutonomousActionRecord[],
    currentFingerprint?: string
  ): LoopDetectionResult {
    if (actions.length < 3) {
      return { isLoop: false };
    }

    const recent = actions.slice(-4);

    // 1. Repeated Identical Action with Same Ineffective Result
    const lastAction = recent[recent.length - 1];
    const sameActionCount = recent.filter(
      (a) =>
        a.action === lastAction.action &&
        JSON.stringify(a.parameters) === JSON.stringify(lastAction.parameters) &&
        a.verification?.status === "VERIFIED_NO_CHANGE"
    ).length;

    if (sameActionCount >= 2) {
      return {
        isLoop: true,
        loopType: "repeated_action",
        description: `Action '${lastAction.action}' executed ${sameActionCount} times with no screen change.`,
        recommendedAction: "replan",
      };
    }

    // 2. Screen Oscillation Loop (A -> B -> A -> B)
    const fingerprints = actions
      .map((a) => a.postObservationId)
      .filter(Boolean);

    if (fingerprints.length >= 4) {
      const len = fingerprints.length;
      if (
        fingerprints[len - 1] === fingerprints[len - 3] &&
        fingerprints[len - 2] === fingerprints[len - 4]
      ) {
        return {
          isLoop: true,
          loopType: "screen_oscillation",
          description: "Detected cyclic screen oscillation between two identical UI states.",
          recommendedAction: "break_loop_by_back",
        };
      }
    }

    // 3. Unproductive Scroll Loop (3 consecutive scrolls with no state change)
    const recentScrolls = recent.filter((a) => a.action === "scroll");
    if (recentScrolls.length >= 3) {
      const allUnchanged = recentScrolls.every((s) => s.verification?.screenChanged === false);
      if (allUnchanged) {
        return {
          isLoop: true,
          loopType: "unproductive_scroll",
          description: "Multiple scrolls executed at boundary without revealing new elements.",
          recommendedAction: "replan",
        };
      }
    }

    return { isLoop: false };
  }
}

export const loopDetector = LoopDetector.getInstance();
