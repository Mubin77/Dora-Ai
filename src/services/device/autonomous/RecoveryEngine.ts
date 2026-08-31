/**
 * Dora Autonomous Recovery Engine
 * 
 * Manages fallback and recovery strategies when an action fails,
 * expected elements are missing, or state transitions stall.
 */

import { DeviceActionResult } from "../DeviceActionTypes";
import {
  ActionDecision,
  NormalizedScreenSummary,
  RecoveryActionPlan,
  StepVerificationOutcome,
  TaskPlanStep,
} from "./AutonomousTaskTypes";

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
   * Evaluates failure context and formulates a structured recovery plan
   */
  public planRecovery(
    step: TaskPlanStep,
    lastDecision: ActionDecision | null,
    lastResult: DeviceActionResult | null,
    verification: StepVerificationOutcome | null,
    screen: NormalizedScreenSummary | null,
    actionHistory: Array<{ action: string; success: boolean }> = []
  ): RecoveryActionPlan {
    const retryCount = step.retryCount;
    const maxRetries = step.maxRetries;

    // 1. If step exceeded max retries, abort
    if (retryCount >= maxRetries) {
      return {
        strategy: "abort_task",
        reason: `Step ${step.stepNumber} ("${step.description}") exceeded maximum allowed retries (${maxRetries}).`,
        replanRequired: false,
      };
    }

    // 2. Sensitive field blocked -> abort task safely
    if (lastResult?.error?.code === "SENSITIVE_FIELD_BLOCKED" || screen?.isPasswordOrAuthScreen) {
      return {
        strategy: "abort_task",
        reason: "Encountered protected authentication/password screen. Autonomous action stopped for security.",
        replanRequired: false,
      };
    }

    // 3. Stale element error -> Capture fresh screen observation and retry
    if (lastResult?.error?.code === "STALE_ELEMENT") {
      return {
        strategy: "retry_fresh_observation",
        reason: "Stale UI element reference detected. Refreshing active screen hierarchy.",
        actionToExecute: {
          action: "read_screen",
          parameters: { forceFresh: true },
          reason: "Refreshing screen observation after stale element detection",
          stepId: step.stepId,
          expectedOutcome: "Fresh screen hierarchy captured",
          confidence: 0.95,
        },
      };
    }

    // 4. Missing target element -> Scroll to reveal
    if (lastResult?.error?.code === "ELEMENT_NOT_FOUND" || verification?.status === "VERIFIED_NO_CHANGE") {
      const scrollCount = actionHistory.filter((h) => h.action === "scroll").length;

      if (scrollCount < 2) {
        return {
          strategy: "scroll_to_find",
          reason: `Target element not found on current viewport. Scrolling down to search.`,
          actionToExecute: {
            action: "scroll",
            parameters: { direction: "down" },
            reason: `Scrolling viewport down to search for "${step.targetText || step.targetRole}"`,
            stepId: step.stepId,
            expectedOutcome: "Target element brought into view",
            confidence: 0.85,
          },
        };
      }

      // If already scrolled twice and still not found, try pressing Back to clear overlay
      return {
        strategy: "press_back_escape",
        reason: "Target element still not located after scrolling. Navigating Back to reset screen state.",
        actionToExecute: {
          action: "press_back",
          parameters: {},
          reason: "Back navigation to escape stalled view",
          stepId: step.stepId,
          expectedOutcome: "Returned to parent screen",
          confidence: 0.80,
        },
      };
    }

    // 5. Unexpected dialog / modal on screen
    if (screen?.hasDialog) {
      const confirmBtn = screen.keyElements.find((e) => e.role === "dialog_confirm");
      if (confirmBtn) {
        return {
          strategy: "ask_confirmation",
          reason: `Dialog popup detected on screen: "${confirmBtn.semanticLabel}"`,
          actionToExecute: {
            action: "tap",
            parameters: { elementId: confirmBtn.elementId },
            reason: `Dismissing dialog via "${confirmBtn.semanticLabel}"`,
            stepId: step.stepId,
            expectedOutcome: "Dialog dismissed",
            confidence: 0.90,
          },
        };
      }
    }

    // 6. Generic retry with re-read
    return {
      strategy: "retry_fresh_observation",
      reason: `Retrying step ${step.stepNumber} (attempt ${retryCount + 1}/${maxRetries}).`,
      actionToExecute: {
        action: "read_screen",
        parameters: { forceFresh: true },
        reason: "Re-inspecting screen before re-attempt",
        stepId: step.stepId,
        expectedOutcome: "Fresh screen observation obtained",
        confidence: 0.80,
      },
    };
  }
}

export const recoveryEngine = RecoveryEngine.getInstance();
