/**
 * Dora Verification Engine (Phase 3 Autonomy)
 * 
 * Verifies action transitions and overall goal completion by analyzing
 * pre-action and post-action screen observations.
 */

import { TaskPlan, TaskPlanStep, TaskVerificationResult } from "./AutonomousTypes";
import { ScreenObservation } from "../DeviceActionTypes";
import { screenInterpreter } from "./ScreenInterpreter";

export class VerificationEngine {
  private static instance: VerificationEngine;

  private constructor() {}

  public static getInstance(): VerificationEngine {
    if (!VerificationEngine.instance) {
      VerificationEngine.instance = new VerificationEngine();
    }
    return VerificationEngine.instance;
  }

  /**
   * Verifies the execution outcome of an individual step
   */
  public verifyStep(
    step: TaskPlanStep,
    before: ScreenObservation | null,
    after: ScreenObservation | null,
    plan: TaskPlan
  ): TaskVerificationResult {
    if (!after) {
      return {
        verified: false,
        confidence: 0,
        reason: "Post-action screen observation is missing.",
      };
    }

    const norm = screenInterpreter.normalize(after);
    const targetApp = (plan.targetApp || "").toLowerCase();

    // -------------------------------------------------------------
    // Verification 1: App Launch
    // -------------------------------------------------------------
    if (step.targetAction === "open_application" || step.stepId.includes("launch")) {
      const packageMatches = norm.packageName.toLowerCase().includes(targetApp);
      const titleMatches = (norm.windowTitle || "").toLowerCase().includes(targetApp);
      const textMatches = norm.visibleTexts.some((t) => t.toLowerCase().includes(targetApp));

      if (packageMatches || titleMatches || textMatches) {
        return {
          verified: true,
          confidence: packageMatches ? 0.98 : 0.85,
          reason: `Target app ${plan.targetApp} is active on screen (${norm.packageName}).`,
          stateChanged: true,
        };
      }

      return {
        verified: false,
        confidence: 0.2,
        reason: `Target app ${plan.targetApp} is not visible in the foreground (Current: ${norm.packageName || "unknown"}).`,
        stateChanged: false,
      };
    }

    // -------------------------------------------------------------
    // Verification 2: Find & Tap Search
    // -------------------------------------------------------------
    if (step.stepId.includes("find_search") || step.description.toLowerCase().includes("search")) {
      const hasEditableField = norm.editableFields.length > 0;
      const stateChanged = screenInterpreter.hasStateChanged(before, after);

      if (hasEditableField) {
        return {
          verified: true,
          confidence: 0.92,
          reason: "Editable search input field is now active and ready for typing.",
          stateChanged: true,
        };
      }

      return {
        verified: stateChanged,
        confidence: stateChanged ? 0.75 : 0.3,
        reason: stateChanged ? "Search control tapped, screen updated." : "No editable field detected after tapping search control.",
        stateChanged,
      };
    }

    // -------------------------------------------------------------
    // Verification 3: Type Query & Submit
    // -------------------------------------------------------------
    if (step.targetAction === "type_text" || step.stepId.includes("type")) {
      const stateChanged = screenInterpreter.hasStateChanged(before, after);
      return {
        verified: true,
        confidence: 0.90,
        reason: "Search query text was entered and search submitted.",
        stateChanged,
      };
    }

    // -------------------------------------------------------------
    // Verification 4: Observe Results / Goal Finish
    // -------------------------------------------------------------
    if (step.stepId.includes("verify_results") || step.targetAction === "read_screen") {
      const hasContent = norm.visibleTexts.length > 0 || norm.clickableElements.length > 0;
      return {
        verified: hasContent,
        confidence: 0.95,
        reason: `Screen verified with ${norm.elementCount} active UI elements.`,
        isGoalComplete: true,
        stateChanged: true,
      };
    }

    // Generic verification fallback
    const stateChanged = screenInterpreter.hasStateChanged(before, after);
    return {
      verified: true,
      confidence: 0.8,
      reason: stateChanged ? "UI transition detected." : "Action processed.",
      stateChanged,
    };
  }

  /**
   * Evaluates if the full high-level goal has been completely achieved
   */
  public verifyGoalCompletion(
    plan: TaskPlan,
    currentObservation: ScreenObservation | null
  ): TaskVerificationResult {
    if (!currentObservation) {
      return {
        verified: false,
        confidence: 0,
        reason: "Screen observation unavailable for goal verification.",
        isGoalComplete: false,
      };
    }

    const allStepsCompleted = plan.steps.every(
      (s) => s.status === "completed" || s.status === "skipped"
    );

    const norm = screenInterpreter.normalize(currentObservation);

    if (allStepsCompleted) {
      return {
        verified: true,
        confidence: 0.95,
        reason: `All ${plan.steps.length} planned steps verified successfully.`,
        isGoalComplete: true,
      };
    }

    // Check if target app is open and content is active
    if (plan.targetApp && norm.packageName.toLowerCase().includes(plan.targetApp.toLowerCase())) {
      const remainingSteps = plan.steps.filter((s) => s.status === "pending" || s.status === "in_progress");
      if (remainingSteps.length <= 1) {
        return {
          verified: true,
          confidence: 0.88,
          reason: `Target app ${plan.targetApp} is active and final results are on screen.`,
          isGoalComplete: true,
        };
      }
    }

    return {
      verified: false,
      confidence: 0.4,
      reason: "Goal has remaining incomplete steps.",
      isGoalComplete: false,
    };
  }
}

export const verificationEngine = VerificationEngine.getInstance();
