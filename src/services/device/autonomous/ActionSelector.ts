/**
 * Dora Action Selector
 * 
 * Selects the optimal concrete DeviceAction and target parameters
 * given the active TaskPlan step, normalized screen understanding, and execution history.
 */

import { DeviceAction } from "../DeviceActionTypes";
import {
  ActionDecision,
  NormalizedScreenSummary,
  SemanticUIElement,
  TaskPlanStep,
} from "./AutonomousTaskTypes";

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
   * Decides next concrete action given plan step and active screen summary
   */
  public selectNextAction(
    step: TaskPlanStep,
    screen: NormalizedScreenSummary | null,
    history: Array<{ action: DeviceAction; success: boolean }> = []
  ): ActionDecision {
    // 1. Step specifies opening an application
    if (step.intendedAction === "open_application") {
      return {
        action: "open_application",
        parameters: { appName: step.targetAppName || "YouTube" },
        reason: `Executing step ${step.stepNumber}: Launch ${step.targetAppName}`,
        stepId: step.stepId,
        expectedOutcome: step.expectedOutcome,
        confidence: 0.98,
      };
    }

    // 2. If screen is not available, default to inspecting/reading screen
    if (!screen) {
      return {
        action: "read_screen",
        parameters: { forceFresh: true },
        reason: `Capturing active screen observation for step ${step.stepNumber}`,
        stepId: step.stepId,
        expectedOutcome: "Fresh accessibility hierarchy captured",
        confidence: 0.95,
      };
    }

    // 3. Step is to tap a UI element (search button, dialog, media item, list item, etc.)
    if (step.intendedAction === "tap") {
      const match = this.findBestMatchingElement(step, screen);

      if (match) {
        // Check if high-risk action requiring user confirmation (e.g., sending money or message)
        const isHighRiskAction =
          match.semanticLabel.toLowerCase().match(/\b(?:send|pay|buy|delete|remove|erase|format)\b/) !== null &&
          step.description.toLowerCase().includes("send");

        return {
          action: "tap",
          parameters: {
            elementId: match.elementId,
            targetDescription: match.semanticLabel,
          },
          reason: `Tapping matching element "${match.semanticLabel}" (${match.role})`,
          stepId: step.stepId,
          targetElement: match,
          expectedOutcome: step.expectedOutcome,
          confidence: match.confidence,
          requiresConfirmation: isHighRiskAction,
          confirmationPrompt: isHighRiskAction
            ? `Dora needs your confirmation to tap "${match.semanticLabel}". Proceed?`
            : undefined,
        };
      }

      // If target element not found on current screen, suggest scroll fallback
      const recentScrolls = history.filter((h) => h.action === "scroll").length;
      if (recentScrolls < 2) {
        return {
          action: "scroll",
          parameters: { direction: "down" },
          reason: `Target element "${step.targetText || step.targetRole}" not visible on current screen. Scrolling down to reveal more items.`,
          stepId: step.stepId,
          expectedOutcome: `Viewport scrolled down to find target element`,
          confidence: 0.75,
          fallbackStrategy: "scroll_down",
        };
      }

      // If already scrolled, try press_back to clear any blocking overlay
      return {
        action: "press_back",
        parameters: {},
        reason: `Target element "${step.targetText || step.targetRole}" could not be found. Navigating back to previous screen.`,
        stepId: step.stepId,
        expectedOutcome: "Returned to parent screen",
        confidence: 0.70,
        fallbackStrategy: "press_back",
      };
    }

    // 4. Step is to type text
    if (step.intendedAction === "type_text") {
      const inputEl = this.findBestInputElement(step, screen);

      if (inputEl?.isPassword) {
        return {
          action: "type_text",
          parameters: { text: "" },
          reason: "Target is a sensitive password field. Autonomous typing blocked by policy.",
          stepId: step.stepId,
          targetElement: inputEl,
          expectedOutcome: "Typing blocked for security",
          confidence: 1.0,
          requiresConfirmation: false,
        };
      }

      return {
        action: "type_text",
        parameters: {
          elementId: inputEl?.elementId,
          text: step.targetQuery || step.targetText || "",
          clearFirst: true,
          pressEnter: true,
        },
        reason: `Typing "${step.targetQuery || step.targetText}" into ${inputEl ? inputEl.semanticLabel : "active input field"}`,
        stepId: step.stepId,
        targetElement: inputEl || undefined,
        expectedOutcome: step.expectedOutcome,
        confidence: inputEl ? inputEl.confidence : 0.80,
      };
    }

    // 5. System Gestures
    if (step.intendedAction === "press_back" || step.intendedAction === "press_home") {
      return {
        action: step.intendedAction,
        parameters: {},
        reason: `Executing navigation action: ${step.intendedAction}`,
        stepId: step.stepId,
        expectedOutcome: step.expectedOutcome,
        confidence: 0.95,
      };
    }

    // 6. Generic Fallback
    return {
      action: "read_screen",
      parameters: {},
      reason: `Observing screen for step ${step.stepNumber}: ${step.description}`,
      stepId: step.stepId,
      expectedOutcome: step.expectedOutcome,
      confidence: 0.70,
    };
  }

  private findBestMatchingElement(
    step: TaskPlanStep,
    screen: NormalizedScreenSummary
  ): SemanticUIElement | null {
    const targetText = step.targetText?.trim().toLowerCase();
    const targetRole = step.targetRole;

    // 1. Match by role and targetText
    if (targetRole && targetText) {
      const match = screen.keyElements.find(
        (el) =>
          el.role === targetRole &&
          (el.text?.toLowerCase().includes(targetText) ||
            el.contentDescription?.toLowerCase().includes(targetText) ||
            el.semanticLabel.toLowerCase().includes(targetText))
      );
      if (match) return match;
    }

    // 2. Match strictly by targetRole
    if (targetRole) {
      const byRole = screen.keyElements.find((el) => el.role === targetRole && el.clickable);
      if (byRole) return byRole;
    }

    // 3. Match by text substring
    if (targetText && targetText.length >= 2) {
      const byText = screen.keyElements.find(
        (el) =>
          el.clickable &&
          (el.text?.toLowerCase().includes(targetText) ||
            el.contentDescription?.toLowerCase().includes(targetText) ||
            el.semanticLabel.toLowerCase().includes(targetText))
      );
      if (byText) return byText;
    }

    // 4. If looking for a media/list result item and no exact text matched, pick the first clickable result item
    if (targetRole === "media_item" || targetRole === "list_item") {
      const firstItem = screen.keyElements.find((el) => (el.role === "media_item" || el.role === "list_item") && el.clickable);
      if (firstItem) return firstItem;
    }

    return null;
  }

  private findBestInputElement(
    step: TaskPlanStep,
    screen: NormalizedScreenSummary
  ): SemanticUIElement | null {
    // 1. Look for search_input if step specifies search
    if (step.targetRole === "search_input") {
      const searchInput = screen.keyElements.find((el) => el.role === "search_input" && el.editable);
      if (searchInput) return searchInput;
    }

    // 2. General text_input
    const anyInput = screen.keyElements.find((el) => (el.role === "text_input" || el.role === "search_input") && el.editable);
    if (anyInput) return anyInput;

    // 3. Any editable field
    const anyEditable = screen.keyElements.find((el) => el.editable);
    return anyEditable || null;
  }
}

export const actionSelector = ActionSelector.getInstance();
