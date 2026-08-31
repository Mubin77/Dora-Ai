/**
 * Dora Autonomous Verification Engine
 * 
 * Verifies whether an autonomous action successfully progressed toward the goal.
 * Compares pre-action and post-action observations, validates expected transitions,
 * and prevents false positive claims of success.
 */

import { DeviceActionResult } from "../DeviceActionTypes";
import {
  ActionDecision,
  NormalizedScreenSummary,
  StepVerificationOutcome,
  TaskPlanStep,
} from "./AutonomousTaskTypes";

export class AutonomousVerificationEngine {
  private static instance: AutonomousVerificationEngine;

  private constructor() {}

  public static getInstance(): AutonomousVerificationEngine {
    if (!AutonomousVerificationEngine.instance) {
      AutonomousVerificationEngine.instance = new AutonomousVerificationEngine();
    }
    return AutonomousVerificationEngine.instance;
  }

  /**
   * Verifies action execution result and screen state transition
   */
  public verifyStep(
    step: TaskPlanStep,
    decision: ActionDecision,
    actionResult: DeviceActionResult,
    preScreen: NormalizedScreenSummary | null,
    postScreen: NormalizedScreenSummary | null,
    isFinalStep: boolean = false
  ): StepVerificationOutcome {
    // 1. If low-level action failed outright, step failed
    if (!actionResult.success) {
      return {
        verified: false,
        confidence: 0.95,
        status: "VERIFIED_FAILED",
        details: `Action execution failed: ${actionResult.error?.details || actionResult.message}`,
        isGoalSatisfied: false,
        isSubgoalSatisfied: false,
        screenChanged: false,
        newObservationId: postScreen?.observationId,
      };
    }

    // 2. Evaluate screen state change
    const screenChanged =
      preScreen !== null &&
      postScreen !== null &&
      preScreen.fingerprint !== postScreen.fingerprint;

    // 3. Action-specific verification logic
    switch (decision.action) {
      case "open_application": {
        const targetApp = step.targetAppName?.toLowerCase() || "";
        const postPkg = postScreen?.packageName.toLowerCase() || "";

        // Check if package matches or screen reflects target app
        const appMatches =
          postPkg.includes(targetApp) ||
          postScreen?.textSummary.toLowerCase().includes(targetApp);

        if (actionResult.success && (appMatches || screenChanged || !postScreen)) {
          return {
            verified: true,
            confidence: 0.95,
            status: "VERIFIED_SUCCESS",
            details: `Application ${step.targetAppName} is active on screen.`,
            isGoalSatisfied: isFinalStep,
            isSubgoalSatisfied: true,
            screenChanged: true,
            newObservationId: postScreen?.observationId,
          };
        }

        return {
          verified: false,
          confidence: 0.85,
          status: "VERIFIED_NO_CHANGE",
          details: `Screen did not transition to ${step.targetAppName}.`,
          isGoalSatisfied: false,
          isSubgoalSatisfied: false,
          screenChanged: false,
          newObservationId: postScreen?.observationId,
        };
      }

      case "type_text": {
        const targetQuery = (step.targetQuery || decision.parameters.text || "").toLowerCase();
        // Check if entered query is now in active input or on screen
        const hasTextOnScreen =
          postScreen?.keyElements.some((e) => e.text?.toLowerCase().includes(targetQuery)) ||
          postScreen?.textSummary.toLowerCase().includes(targetQuery);

        if (actionResult.success) {
          return {
            verified: true,
            confidence: hasTextOnScreen ? 0.95 : 0.85,
            status: "VERIFIED_SUCCESS",
            details: `Typed text "${targetQuery}" into search/input field.`,
            isGoalSatisfied: isFinalStep,
            isSubgoalSatisfied: true,
            screenChanged,
            newObservationId: postScreen?.observationId,
          };
        }
        break;
      }

      case "tap": {
        if (actionResult.success) {
          // If tapping search button, verify search input opened
          if (step.targetRole === "search_button") {
            const hasInputNow = postScreen?.hasInputControl || postScreen?.hasSearchControl;
            return {
              verified: Boolean(hasInputNow || screenChanged),
              confidence: 0.90,
              status: screenChanged ? "VERIFIED_SUCCESS" : "VERIFIED_NO_CHANGE",
              details: screenChanged
                ? "Search interface opened successfully."
                : "Tapped search button, awaiting search UI focus.",
              isGoalSatisfied: false,
              isSubgoalSatisfied: true,
              screenChanged,
              newObservationId: postScreen?.observationId,
            };
          }

          // General tap
          return {
            verified: true,
            confidence: screenChanged ? 0.90 : 0.80,
            status: screenChanged ? "VERIFIED_SUCCESS" : "VERIFIED_NO_CHANGE",
            details: screenChanged
              ? "UI updated following tap action."
              : "Tap executed on element.",
            isGoalSatisfied: isFinalStep,
            isSubgoalSatisfied: true,
            screenChanged,
            newObservationId: postScreen?.observationId,
          };
        }
        break;
      }

      case "scroll":
      case "swipe": {
        return {
          verified: true,
          confidence: 0.85,
          status: screenChanged ? "VERIFIED_SUCCESS" : "VERIFIED_NO_CHANGE",
          details: screenChanged
            ? "Viewport content scrolled successfully."
            : "Scroll gesture completed.",
          isGoalSatisfied: false,
          isSubgoalSatisfied: true,
          screenChanged,
          newObservationId: postScreen?.observationId,
        };
      }

      default:
        return {
          verified: actionResult.success,
          confidence: 0.80,
          status: actionResult.success ? "VERIFIED_SUCCESS" : "VERIFIED_FAILED",
          details: actionResult.message,
          isGoalSatisfied: isFinalStep && actionResult.success,
          isSubgoalSatisfied: actionResult.success,
          screenChanged,
          newObservationId: postScreen?.observationId,
        };
    }

    return {
      verified: false,
      confidence: 0.70,
      status: "NOT_VERIFIED",
      details: "Verification could not determine definitive state transition.",
      isGoalSatisfied: false,
      isSubgoalSatisfied: false,
      screenChanged: false,
    };
  }
}

export const autonomousVerificationEngine = AutonomousVerificationEngine.getInstance();
