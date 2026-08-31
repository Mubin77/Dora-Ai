/**
 * Dora Action Selector (Phase 3 Autonomy)
 * 
 * Chooses the next concrete device action based on the active plan,
 * current screen observation, and execution context.
 */

import { ActionDecision, TaskPlan, TaskPlanStep } from "./AutonomousTypes";
import { ScreenObservation } from "../DeviceActionTypes";
import { screenInterpreter } from "./ScreenInterpreter";
import { deviceSafety } from "../DeviceSafety";

export class ActionSelector {
  private static instance: ActionSelector;

  private constructor() {}

  public static getInstance(): ActionSelector {
    if (!ActionSelector.instance) {
      ActionSelector.instance = new ActionSelector();
    }
    return ActionSelector.instance;
  }

  /**
   * Selects the next concrete ActionDecision based on the active plan and current observation
   */
  public selectNextAction(
    plan: TaskPlan,
    currentStep: TaskPlanStep | null,
    observation: ScreenObservation | null
  ): ActionDecision {
    // If no observation or stale, first action must be to observe
    if (!observation || observation.isStale) {
      return {
        action: "read_screen",
        reason: "Active screen state is unobserved or stale. Reading screen tree.",
        expectedOutcome: "Fresh screen observation is cataloged.",
        stepId: currentStep?.stepId,
      };
    }

    if (!currentStep) {
      return {
        action: "read_screen",
        reason: "All planned steps completed. Final verification observation.",
        expectedOutcome: "Final screen state is verified.",
      };
    }

    const norm = screenInterpreter.normalize(observation);

    // -------------------------------------------------------------
    // Step Type 1: App Launch
    // -------------------------------------------------------------
    if (currentStep.targetAction === "open_application" || currentStep.stepId.includes("launch")) {
      const appName = plan.targetApp || "YouTube";
      // If the target app is already in the foreground, we can skip directly to observing/next step
      if (norm.packageName.toLowerCase().includes(appName.toLowerCase())) {
        return {
          action: "read_screen",
          reason: `${appName} is already open on screen (${norm.packageName}).`,
          expectedOutcome: "Screen hierarchy is ready for interaction.",
          stepId: currentStep.stepId,
        };
      }

      return {
        action: "open_application",
        reason: `Launching target application ${appName}.`,
        target: { appName },
        parameters: { appName },
        expectedOutcome: `${appName} opens in the active foreground window.`,
        stepId: currentStep.stepId,
      };
    }

    // -------------------------------------------------------------
    // Step Type 2: Locate & Tap Search Icon / Field
    // -------------------------------------------------------------
    if (currentStep.stepId.includes("find_search") || currentStep.description.toLowerCase().includes("search")) {
      // 1. Check if an editable search field is already visible and focused
      const editableSearch = observation.elements.find(
        (el) => el.editable && !el.isPassword && (el.text || el.contentDescription || el.resourceId)?.toLowerCase().includes("search")
      );
      if (editableSearch) {
        return {
          action: "tap",
          reason: `Editable search field is visible: "${editableSearch.text || editableSearch.contentDescription || editableSearch.resourceId}".`,
          target: {
            elementId: editableSearch.elementId,
            text: editableSearch.text,
            contentDescription: editableSearch.contentDescription,
            resourceId: editableSearch.resourceId,
          },
          parameters: { elementId: editableSearch.elementId },
          expectedOutcome: "Search field receives keyboard focus.",
          stepId: currentStep.stepId,
        };
      }

      // 2. Look for search icon or button
      const searchButton = screenInterpreter.findBestMatchingElement(observation, {
        text: "Search",
        contentDescription: "Search",
        resourceId: "search",
        isClickable: true,
      });

      if (searchButton.element && searchButton.confidence >= 0.7) {
        return {
          action: "tap",
          reason: `Found search control (${searchButton.matchType}): "${searchButton.element.text || searchButton.element.contentDescription}".`,
          target: {
            elementId: searchButton.element.elementId,
            text: searchButton.element.text,
            contentDescription: searchButton.element.contentDescription,
            resourceId: searchButton.element.resourceId,
          },
          parameters: { elementId: searchButton.element.elementId },
          expectedOutcome: "Search input box becomes available.",
          stepId: currentStep.stepId,
        };
      }

      // 3. If any editable field exists on screen, tap it
      const anyEditable = observation.elements.find((el) => el.editable && !el.isPassword);
      if (anyEditable) {
        return {
          action: "tap",
          reason: `Tapping active editable field (${anyEditable.elementId}).`,
          target: { elementId: anyEditable.elementId },
          parameters: { elementId: anyEditable.elementId },
          expectedOutcome: "Input field is focused.",
          stepId: currentStep.stepId,
        };
      }

      // 4. If search button isn't visible, try safe scroll down
      return {
        action: "scroll",
        reason: "Search control not visible in current viewport; scrolling down to locate it.",
        parameters: { direction: "down" },
        expectedOutcome: "Additional UI elements become visible.",
        stepId: currentStep.stepId,
        fallbackStrategy: "scroll_down",
      };
    }

    // -------------------------------------------------------------
    // Step Type 3: Type Query into Field
    // -------------------------------------------------------------
    if (currentStep.targetAction === "type_text" || currentStep.stepId.includes("type")) {
      const match = currentStep.description.match(/Type "([^"]+)"/i);
      const query = match ? match[1] : "relaxing music";

      // Find target editable element
      const targetEditable = observation.elements.find((el) => el.editable && !el.isPassword);
      const elementId = targetEditable?.elementId;

      return {
        action: "type_text",
        reason: `Typing query "${query}" into active input field.`,
        target: { elementId },
        parameters: { elementId, text: query, pressEnter: true, clearFirst: true },
        expectedOutcome: `Text "${query}" is entered and search is submitted.`,
        stepId: currentStep.stepId,
      };
    }

    // -------------------------------------------------------------
    // Step Type 4: Navigation (Back / Home)
    // -------------------------------------------------------------
    if (currentStep.targetAction === "press_back" || currentStep.targetAction === "press_home") {
      const action = currentStep.targetAction;
      return {
        action,
        reason: `Executing planned navigation: ${action}.`,
        expectedOutcome: `Device performs global ${action}.`,
        stepId: currentStep.stepId,
      };
    }

    // Default fallback: Read screen
    return {
      action: "read_screen",
      reason: "Observing current screen state.",
      expectedOutcome: "Screen hierarchy is cataloged.",
      stepId: currentStep.stepId,
    };
  }

  /**
   * Checks if an action carries high risk and requires user confirmation
   */
  public checkConfirmationRequirement(
    action: ActionDecision,
    goal: string
  ): { requiresConfirmation: boolean; reason?: string } {
    const safetyLevel = deviceSafety.getSafetyLevel(action.action);

    if (safetyLevel === "HIGH_RISK") {
      return {
        requiresConfirmation: true,
        reason: `Action '${action.action}' is classified as High Risk under device safety policies.`,
      };
    }

    // Check goal keywords for sensitive operations
    const sensitiveGoalPatterns = [
      /\b(?:send\s+money|transfer|pay|purchase|buy|checkout|order)\b/i,
      /\b(?:delete\s+account|factory\s+reset|wipe|format|erase)\b/i,
      /\b(?:send\s+message|post|tweet|publish|send\s+email)\b/i,
    ];

    for (const pattern of sensitiveGoalPatterns) {
      if (pattern.test(goal)) {
        return {
          requiresConfirmation: true,
          reason: `Goal contains sensitive operation requiring user confirmation before proceeding.`,
        };
      }
    }

    return { requiresConfirmation: false };
  }
}

export const actionSelector = ActionSelector.getInstance();
