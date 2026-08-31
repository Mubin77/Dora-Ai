/**
 * Dora Recovery Engine (Phase 3 Autonomy)
 * 
 * Manages controlled recovery when UI actions fail, elements are missing,
 * or unexpected dialogs/overlays block the autonomous workflow.
 */

import { ActionDecision, TaskPlan, TaskPlanStep } from "./AutonomousTypes";
import { ScreenObservation } from "../DeviceActionTypes";
import { goalInterpreter } from "./GoalInterpreter";

export class RecoveryEngine {
  private static instance: RecoveryEngine;

  private constructor() {}

  public static getInstance(): RecoveryEngine {
    if (!RecoveryEngine.instance) {
      RecoveryEngine.instance = new RecoveryEngine();
    }
    return RecoveryEngine.instance;
  }

  /**
   * Generates a recovery action when a step or action encounters an error or missing element
   */
  public determineRecoveryStrategy(
    failedStep: TaskPlanStep,
    attemptNumber: number,
    observation: ScreenObservation | null,
    plan: TaskPlan,
    errorCode?: string
  ): {
    strategy: "retry_observation" | "scroll" | "press_back" | "replan" | "abort";
    recoveryAction?: ActionDecision;
    updatedPlan?: TaskPlan;
    reason: string;
  } {
    // Exceeded action retry limit (3 attempts)
    if (attemptNumber >= 3) {
      return {
        strategy: "abort",
        reason: `Maximum retries (${attemptNumber}) exceeded for step '${failedStep.description}'.`,
      };
    }

    // 1. Sensitive field blocked: Abort immediately for safety
    if (errorCode === "SENSITIVE_FIELD_BLOCKED") {
      return {
        strategy: "abort",
        reason: "Protected security/credential field detected. Action blocked by safety policy.",
      };
    }

    // 2. Missing element or Stale element on first attempt: Fetch fresh observation
    if (attemptNumber === 1 || errorCode === "STALE_ELEMENT") {
      return {
        strategy: "retry_observation",
        recoveryAction: {
          action: "read_screen",
          reason: "Refreshing screen observation to resolve stale or missing UI reference.",
          expectedOutcome: "Fresh accessibility hierarchy is loaded.",
          stepId: failedStep.stepId,
        },
        reason: "Requesting fresh screen observation.",
      };
    }

    // 3. Second attempt on search/tap: Scroll down to reveal hidden element
    if (attemptNumber === 2 && (failedStep.targetAction === "tap" || failedStep.description.includes("search"))) {
      const scrollStep: TaskPlanStep = {
        stepId: `recovery_scroll_${Date.now()}`,
        description: "Scroll screen down to find hidden controls",
        targetAction: "scroll",
        status: "pending",
        expectedOutcome: "Additional viewport controls revealed",
      };

      const updatedPlan = goalInterpreter.replan(
        plan,
        "Scrolling down to reveal target control",
        scrollStep
      );

      return {
        strategy: "scroll",
        recoveryAction: {
          action: "scroll",
          reason: "Target control not visible; scrolling down.",
          parameters: { direction: "down" },
          expectedOutcome: "Target control scrolls into active viewport.",
          stepId: scrollStep.stepId,
        },
        updatedPlan,
        reason: "Inserted recovery scroll step.",
      };
    }

    // 4. Third attempt: Press back to dismiss possible modal or popup dialog
    const backStep: TaskPlanStep = {
      stepId: `recovery_back_${Date.now()}`,
      description: "Press back to dismiss modal or popup overlay",
      targetAction: "press_back",
      status: "pending",
      expectedOutcome: "Dismiss overlay and return to previous screen",
    };

    const updatedPlan = goalInterpreter.replan(
      plan,
      "Pressing back to clear blocking overlay",
      backStep
    );

    return {
      strategy: "press_back",
      recoveryAction: {
        action: "press_back",
        reason: "Dismissing unexpected dialog or keyboard overlay.",
        expectedOutcome: "Underlying screen controls restored.",
        stepId: backStep.stepId,
      },
      updatedPlan,
      reason: "Inserted recovery back step.",
    };
  }
}

export const recoveryEngine = RecoveryEngine.getInstance();
