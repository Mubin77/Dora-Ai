/**
 * Dora Screen Understanding Engine
 * 
 * Analyzes and normalizes accessibility screen observations into rich semantic representations.
 * Identifies functional UI roles (search, text input, navigation, action buttons, dialogs, media items),
 * generates structural fingerprints, and redacts sensitive authentication components.
 */

import { ScreenObservation, UIElement } from "../DeviceActionTypes";
import {
  NormalizedScreenSummary,
  SemanticElementRole,
  SemanticUIElement,
} from "./AutonomousTaskTypes";

export class ScreenUnderstandingEngine {
  private static instance: ScreenUnderstandingEngine;

  private sensitivePatterns = [
    /\b(?:password|passwd|pin|otp|cvv|secret|token|passcode|card\s*number)\b/i,
    /\b(?:auth|credential|ssn|social\s*security)\b/i,
  ];

  private searchKeywords = [
    "search", "query", "find", "magnifier", "lookup", "explore", "discover"
  ];

  private constructor() {}

  public static getInstance(): ScreenUnderstandingEngine {
    if (!ScreenUnderstandingEngine.instance) {
      ScreenUnderstandingEngine.instance = new ScreenUnderstandingEngine();
    }
    return ScreenUnderstandingEngine.instance;
  }

  /**
   * Transforms raw ScreenObservation into a structured, semantic NormalizedScreenSummary
   */
  public analyzeScreen(observation: ScreenObservation | null): NormalizedScreenSummary | null {
    if (!observation) {
      return null;
    }

    const keyElements: SemanticUIElement[] = [];
    let isPasswordOrAuthScreen = false;
    let hasSearchControl = false;
    let hasInputControl = false;
    let hasDialog = false;
    let clickableCount = 0;
    let editableCount = 0;

    // Check window/activity for dialog signals
    if (
      observation.activityName?.toLowerCase().includes("dialog") ||
      observation.windowTitle?.toLowerCase().includes("dialog") ||
      observation.windowTitle?.toLowerCase().includes("permission")
    ) {
      hasDialog = true;
    }

    for (const el of observation.elements) {
      if (el.clickable) clickableCount++;
      if (el.editable) editableCount++;

      const roleInfo = this.classifyElement(el, observation.packageName);
      const isSensitive = el.isPassword || this.isSensitiveField(el.text, el.contentDescription, el.resourceId);

      if (isSensitive) {
        isPasswordOrAuthScreen = true;
      }

      if (roleInfo.role === "search_button" || roleInfo.role === "search_input") {
        hasSearchControl = true;
      }
      if (roleInfo.role === "text_input" || roleInfo.role === "search_input") {
        hasInputControl = true;
      }
      if (roleInfo.role === "dialog_confirm" || roleInfo.role === "dialog_cancel") {
        hasDialog = true;
      }

      // Include meaningful, interactable or label elements in keyElements
      if (el.clickable || el.editable || (el.text && el.text.length > 2) || (el.contentDescription && el.contentDescription.length > 2)) {
        keyElements.push({
          ...el,
          role: isSensitive ? "sensitive_field" : roleInfo.role,
          semanticLabel: isSensitive ? "[PROTECTED_INPUT_FIELD]" : (roleInfo.semanticLabel || el.text || el.contentDescription || "Unnamed Element"),
          confidence: roleInfo.confidence,
        });
      }
    }

    const fingerprint = this.computeFingerprint(observation);
    const textSummary = this.generateTextSummary(observation, keyElements);

    return {
      observationId: observation.observationId,
      packageName: observation.packageName || "unknown",
      activityName: observation.activityName,
      windowTitle: observation.windowTitle,
      fingerprint,
      isPasswordOrAuthScreen,
      hasSearchControl,
      hasInputControl,
      hasDialog,
      keyElements,
      totalElementsCount: observation.elements.length,
      clickableCount,
      editableCount,
      textSummary,
    };
  }

  /**
   * Classifies an individual UIElement into a SemanticElementRole
   */
  public classifyElement(
    el: UIElement,
    _packageName?: string
  ): { role: SemanticElementRole; semanticLabel: string; confidence: number } {
    const text = (el.text || "").trim();
    const desc = (el.contentDescription || "").trim();
    const resId = (el.resourceId || "").trim().toLowerCase();
    const className = (el.className || "").toLowerCase();
    const combined = `${text} ${desc} ${resId}`.toLowerCase();

    // 1. Sensitive / Authentication Check
    if (el.isPassword || this.isSensitiveField(text, desc, resId)) {
      return {
        role: "sensitive_field",
        semanticLabel: "Password / Sensitive Credentials Field",
        confidence: 0.99,
      };
    }

    // 2. Search Input (Editable field matching search cues)
    if (el.editable && (this.containsAnyKeyword(combined, this.searchKeywords) || className.includes("searchview") || resId.includes("search"))) {
      return {
        role: "search_input",
        semanticLabel: text || desc || "Search input box",
        confidence: 0.95,
      };
    }

    // 3. Search Button / Icon (Clickable button or icon matching search cues)
    if (el.clickable && !el.editable && this.containsAnyKeyword(combined, this.searchKeywords)) {
      return {
        role: "search_button",
        semanticLabel: text || desc || "Search button",
        confidence: 0.92,
      };
    }

    // 4. Back / Up Navigation
    if (el.clickable && (combined.includes("navigate up") || combined.includes("back") || resId.includes("btn_back") || resId.includes("action_back"))) {
      return {
        role: "back_button",
        semanticLabel: desc || text || "Back button",
        confidence: 0.90,
      };
    }

    // 5. Close / Dismiss
    if (el.clickable && (combined.includes("close") || combined.includes("dismiss") || combined.includes("cancel") || resId.includes("close"))) {
      return {
        role: "close_button",
        semanticLabel: desc || text || "Close button",
        confidence: 0.88,
      };
    }

    // 6. Dialog Actions
    if (el.clickable && (text.match(/^(?:ok|allow|continue|agree|confirm|yes)$/i) || resId.includes("positive") || resId.includes("confirm"))) {
      return {
        role: "dialog_confirm",
        semanticLabel: text || "Confirm button",
        confidence: 0.90,
      };
    }
    if (el.clickable && (text.match(/^(?:cancel|deny|reject|no|not now)$/i) || resId.includes("negative") || resId.includes("cancel"))) {
      return {
        role: "dialog_cancel",
        semanticLabel: text || "Cancel button",
        confidence: 0.90,
      };
    }

    // 7. General Text Input
    if (el.editable) {
      return {
        role: "text_input",
        semanticLabel: text || desc || "Text input field",
        confidence: 0.85,
      };
    }

    // 8. Navigation Tabs
    if (el.clickable && (className.includes("tab") || resId.includes("tab_") || combined.includes("home tab") || combined.includes("subscriptions tab"))) {
      return {
        role: "navigation_tab",
        semanticLabel: text || desc || "Navigation Tab",
        confidence: 0.85,
      };
    }

    // 9. Media Item / Video Card / Result Item
    if (
      el.clickable &&
      (resId.includes("video") || resId.includes("item") || resId.includes("thumbnail") || (el.bounds && (el.bounds.bottom - el.bounds.top) > 150))
    ) {
      return {
        role: "media_item",
        semanticLabel: text || desc || "Media / Result item",
        confidence: 0.80,
      };
    }

    // 10. Action Button
    if (el.clickable && (className.includes("button") || text.length > 0 || desc.length > 0)) {
      return {
        role: "action_button",
        semanticLabel: text || desc || "Action Button",
        confidence: 0.75,
      };
    }

    // 11. Generic Clickable
    if (el.clickable) {
      return {
        role: "generic_clickable",
        semanticLabel: text || desc || "Clickable UI element",
        confidence: 0.60,
      };
    }

    // 12. Header
    if (text && text.length > 0 && !el.clickable && (className.includes("textview") || className.includes("header"))) {
      return {
        role: "header",
        semanticLabel: text,
        confidence: 0.70,
      };
    }

    return {
      role: "unknown",
      semanticLabel: text || desc || "Element",
      confidence: 0.40,
    };
  }

  /**
   * Computes a deterministic structural fingerprint of the active screen observation
   */
  public computeFingerprint(obs: ScreenObservation): string {
    const pkg = obs.packageName || "pkg";
    const activity = obs.activityName || "act";
    const visibleTexts = obs.elements
      .filter((e) => e.text && e.text.trim().length > 0)
      .map((e) => e.text!.trim())
      .slice(0, 8)
      .join("|");

    const elementCount = obs.elements.length;
    return `${pkg}:${activity}:${elementCount}:${this.simpleHash(visibleTexts)}`;
  }

  /**
   * Checks if two observations represent effectively the same screen state
   */
  public areScreensEqual(a: ScreenObservation | null, b: ScreenObservation | null): boolean {
    if (!a || !b) return false;
    return this.computeFingerprint(a) === this.computeFingerprint(b);
  }

  private isSensitiveField(...fields: Array<string | undefined>): boolean {
    for (const f of fields) {
      if (!f) continue;
      for (const pattern of this.sensitivePatterns) {
        if (pattern.test(f)) {
          return true;
        }
      }
    }
    return false;
  }

  private containsAnyKeyword(text: string, keywords: string[]): boolean {
    return keywords.some((kw) => text.includes(kw));
  }

  private generateTextSummary(obs: ScreenObservation, keyElements: SemanticUIElement[]): string {
    const lines: string[] = [
      `Package: ${obs.packageName || "unknown"} (${obs.activityName || "unknown"})`,
    ];
    if (obs.windowTitle) {
      lines.push(`Window Title: "${obs.windowTitle}"`);
    }

    const searchEls = keyElements.filter((e) => e.role === "search_input" || e.role === "search_button");
    if (searchEls.length > 0) {
      lines.push(`Search Controls: ${searchEls.map((e) => `[${e.role}: "${e.semanticLabel}"]`).join(", ")}`);
    }

    const buttons = keyElements.filter((e) => e.role === "action_button" || e.role === "dialog_confirm");
    if (buttons.length > 0) {
      lines.push(`Key Actions: ${buttons.slice(0, 5).map((e) => `"${e.semanticLabel}"`).join(", ")}`);
    }

    const items = keyElements.filter((e) => e.role === "media_item" || e.role === "list_item");
    if (items.length > 0) {
      lines.push(`Visible Items: ${items.slice(0, 4).map((e) => `"${e.semanticLabel}"`).join("; ")}`);
    }

    return lines.join(" | ");
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }
}

export const screenUnderstandingEngine = ScreenUnderstandingEngine.getInstance();
