/**
 * Dora Autonomous Task Planner
 * 
 * Generates initial adaptive multi-step plans and updates plans dynamically
 * based on live screen observations and step execution outcomes.
 */

import { InterpretedGoal } from "./GoalInterpreter";
import {
  NormalizedScreenSummary,
  TaskPlan,
  TaskPlanStep,
} from "./AutonomousTaskTypes";

export class AutonomousPlanner {
  private static instance: AutonomousPlanner;

  private constructor() {}

  public static getInstance(): AutonomousPlanner {
    if (!AutonomousPlanner.instance) {
      AutonomousPlanner.instance = new AutonomousPlanner();
    }
    return AutonomousPlanner.instance;
  }

  /**
   * Generates initial task plan from interpreted goal
   */
  public generateInitialPlan(interpreted: InterpretedGoal): TaskPlan {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const steps: TaskPlanStep[] = [];

    switch (interpreted.intent) {
      case "open_app":
        steps.push({
          stepId: `${planId}_s1`,
          stepNumber: 1,
          description: `Open ${interpreted.targetApp}`,
          intendedAction: "open_application",
          targetAppName: interpreted.targetApp,
          status: "pending",
          retryCount: 0,
          maxRetries: 2,
          expectedOutcome: `Application ${interpreted.targetApp} is active on screen`,
        });
        break;

      case "search":
      case "play_media":
        // 1. Open App
        steps.push({
          stepId: `${planId}_s1`,
          stepNumber: 1,
          description: `Open ${interpreted.targetApp}`,
          intendedAction: "open_application",
          targetAppName: interpreted.targetApp,
          status: "pending",
          retryCount: 0,
          maxRetries: 2,
          expectedOutcome: `${interpreted.targetApp} window is in the foreground`,
        });

        // 2. Open Search Input
        steps.push({
          stepId: `${planId}_s2`,
          stepNumber: 2,
          description: `Tap search control in ${interpreted.targetApp}`,
          intendedAction: "tap",
          targetRole: "search_button",
          targetText: "Search",
          status: "pending",
          retryCount: 0,
          maxRetries: 3,
          expectedOutcome: `Search input field is focused and editable`,
        });

        // 3. Type Query
        steps.push({
          stepId: `${planId}_s3`,
          stepNumber: 3,
          description: `Type search query "${interpreted.searchQuery}"`,
          intendedAction: "type_text",
          targetRole: "search_input",
          targetQuery: interpreted.searchQuery,
          status: "pending",
          retryCount: 0,
          maxRetries: 3,
          expectedOutcome: `Query text is entered into search field`,
        });

        // 4. Select Result or Play
        if (interpreted.intent === "play_media") {
          steps.push({
            stepId: `${planId}_s4`,
            stepNumber: 4,
            description: `Select and play matching item for "${interpreted.searchQuery}"`,
            intendedAction: "tap",
            targetRole: "media_item",
            targetText: interpreted.searchQuery,
            status: "pending",
            retryCount: 0,
            maxRetries: 3,
            expectedOutcome: `Selected media playback begins`,
          });
        } else {
          steps.push({
            stepId: `${planId}_s4`,
            stepNumber: 4,
            description: `Submit search and inspect results for "${interpreted.searchQuery}"`,
            intendedAction: "tap",
            targetRole: "action_button",
            targetText: "Search",
            status: "pending",
            retryCount: 0,
            maxRetries: 3,
            expectedOutcome: `Search results are displayed on screen`,
          });
        }
        break;

      case "send_message":
        steps.push(
          {
            stepId: `${planId}_s1`,
            stepNumber: 1,
            description: `Open ${interpreted.targetApp}`,
            intendedAction: "open_application",
            targetAppName: interpreted.targetApp,
            status: "pending",
            retryCount: 0,
            maxRetries: 2,
            expectedOutcome: `${interpreted.targetApp} is active on screen`,
          },
          {
            stepId: `${planId}_s2`,
            stepNumber: 2,
            description: `Find and open chat with ${interpreted.recipient || "target contact"}`,
            intendedAction: "tap",
            targetText: interpreted.recipient,
            status: "pending",
            retryCount: 0,
            maxRetries: 3,
            expectedOutcome: `Conversation screen with ${interpreted.recipient} is open`,
          },
          {
            stepId: `${planId}_s3`,
            stepNumber: 3,
            description: `Type message "${interpreted.messageText || "Hello"}"`,
            intendedAction: "type_text",
            targetRole: "text_input",
            targetQuery: interpreted.messageText,
            status: "pending",
            retryCount: 0,
            maxRetries: 2,
            expectedOutcome: `Message draft is populated in input box`,
          },
          {
            stepId: `${planId}_s4`,
            stepNumber: 4,
            description: `Confirm and send message to ${interpreted.recipient}`,
            intendedAction: "tap",
            targetRole: "action_button",
            targetText: "Send",
            status: "pending",
            retryCount: 0,
            maxRetries: 2,
            expectedOutcome: `Message is sent`,
          }
        );
        break;

      default:
        steps.push(
          {
            stepId: `${planId}_s1`,
            stepNumber: 1,
            description: `Inspect active screen hierarchy`,
            intendedAction: "read_screen",
            status: "pending",
            retryCount: 0,
            maxRetries: 2,
            expectedOutcome: `Accessibility elements are captured`,
          },
          {
            stepId: `${planId}_s2`,
            stepNumber: 2,
            description: `Execute required action for goal: ${interpreted.rawGoal}`,
            intendedAction: "find_ui_element",
            status: "pending",
            retryCount: 0,
            maxRetries: 2,
            expectedOutcome: `Target UI elements found and interacted`,
          }
        );
    }

    return {
      planId,
      goal: interpreted.rawGoal,
      targetApp: interpreted.targetApp,
      steps,
      isAdaptive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    };
  }

  /**
   * Adapts existing plan given live screen observation and step failure/progress
   */
  public adaptPlan(
    currentPlan: TaskPlan,
    screenSummary: NormalizedScreenSummary | null,
    currentStepIndex: number,
    failedStep?: TaskPlanStep
  ): TaskPlan {
    const updated = { ...currentPlan };
    updated.updatedAt = Date.now();
    updated.version += 1;

    // 1. If an unexpected blocking dialog appeared on screen, inject a dialog handling step
    if (screenSummary?.hasDialog) {
      const dialogConfirm = screenSummary.keyElements.find((e) => e.role === "dialog_confirm");
      if (dialogConfirm) {
        const injectedStep: TaskPlanStep = {
          stepId: `injected_dlg_${Date.now()}`,
          stepNumber: currentStepIndex + 1,
          description: `Acknowledge screen prompt "${dialogConfirm.semanticLabel}"`,
          intendedAction: "tap",
          targetRole: "dialog_confirm",
          targetText: dialogConfirm.semanticLabel,
          status: "pending",
          retryCount: 0,
          maxRetries: 2,
          expectedOutcome: "Dialog is dismissed",
        };

        // Insert before current step
        updated.steps.splice(currentStepIndex, 0, injectedStep);
        this.reindexSteps(updated.steps);
        return updated;
      }
    }

    // 2. If the current step was to tap search button, but search input is ALREADY open and focused
    const currentStep = updated.steps[currentStepIndex];
    if (currentStep && currentStep.intendedAction === "tap" && currentStep.targetRole === "search_button") {
      const hasDirectSearchInput = screenSummary?.keyElements.find((e) => e.role === "search_input" && e.editable);
      if (hasDirectSearchInput) {
        // Skip redundant search button tap and mark completed
        currentStep.status = "completed";
        currentStep.actualOutcome = "Search input is already available on screen.";
        return updated;
      }
    }

    // 3. If target element is not found on screen and scroll is possible, inject a scroll search step
    if (failedStep && failedStep.retryCount < failedStep.maxRetries) {
      // Keep in plan for retry
      failedStep.status = "recovering";
    }

    return updated;
  }

  private reindexSteps(steps: TaskPlanStep[]): void {
    steps.forEach((s, idx) => {
      s.stepNumber = idx + 1;
    });
  }
}

export const autonomousPlanner = AutonomousPlanner.getInstance();
