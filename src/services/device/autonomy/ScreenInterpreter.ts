/**
 * Dora Screen Interpreter (Phase 3 Autonomy)
 * 
 * Generates normalized screen representations, computes observation fingerprints,
 * detects screen state transitions, and performs multi-criteria semantic UI matching.
 */

import { ScreenObservation, UIElement } from "../DeviceActionTypes";
import { NormalizedScreenRepresentation } from "./AutonomousTypes";

export class ScreenInterpreter {
  private static instance: ScreenInterpreter;

  private constructor() {}

  public static getInstance(): ScreenInterpreter {
    if (!ScreenInterpreter.instance) {
      ScreenInterpreter.instance = new ScreenInterpreter();
    }
    return ScreenInterpreter.instance;
  }

  /**
   * Transforms a raw ScreenObservation into a normalized representation for the planner
   */
  public normalize(observation: ScreenObservation | null): NormalizedScreenRepresentation {
    if (!observation) {
      return {
        observationId: "null_obs",
        packageName: "",
        visibleTexts: [],
        clickableElements: [],
        editableFields: [],
        scrollableContainers: [],
        fingerprint: "empty_screen",
        elementCount: 0,
        timestamp: Date.now(),
      };
    }

    const visibleTexts: string[] = [];
    const clickableElements: Array<{ id: string; text?: string; desc?: string; resId?: string; bounds: any }> = [];
    const editableFields: Array<{ id: string; text?: string; desc?: string; resId?: string; isPassword?: boolean }> = [];
    const scrollableContainers: Array<{ id: string; className: string }> = [];

    for (const el of observation.elements) {
      const text = (el.text || "").trim();
      const desc = (el.contentDescription || "").trim();

      if (text && !visibleTexts.includes(text)) {
        visibleTexts.push(text);
      }
      if (desc && !visibleTexts.includes(desc)) {
        visibleTexts.push(desc);
      }

      if (el.clickable) {
        clickableElements.push({
          id: el.elementId,
          text: el.text,
          desc: el.contentDescription,
          resId: el.resourceId,
          bounds: el.bounds,
        });
      }

      if (el.editable) {
        editableFields.push({
          id: el.elementId,
          text: el.text,
          desc: el.contentDescription,
          resId: el.resourceId,
          isPassword: el.isPassword,
        });
      }

      if (el.scrollable) {
        scrollableContainers.push({
          id: el.elementId,
          className: el.className,
        });
      }
    }

    const fingerprint = this.computeFingerprint(observation.packageName, visibleTexts, clickableElements.length);

    return {
      observationId: observation.observationId,
      packageName: observation.packageName || "unknown",
      activityName: observation.activityName,
      windowTitle: observation.windowTitle,
      visibleTexts,
      clickableElements,
      editableFields,
      scrollableContainers,
      fingerprint,
      elementCount: observation.elements.length,
      timestamp: observation.timestamp,
    };
  }

  /**
   * Calculates a stable, content-based screen fingerprint
   */
  public computeFingerprint(packageName?: string, visibleTexts: string[] = [], clickableCount: number = 0): string {
    const pkg = (packageName || "none").toLowerCase();
    const sortedSampleTexts = [...visibleTexts]
      .sort()
      .slice(0, 10)
      .map((t) => t.slice(0, 20))
      .join("|");

    return `${pkg}:${clickableCount}:${sortedSampleTexts}`;
  }

  /**
   * Detects whether an action triggered a meaningful UI or window state change
   */
  public hasStateChanged(before: ScreenObservation | null, after: ScreenObservation | null): boolean {
    if (!before || !after) return false;
    if (before.observationId === after.observationId) return false;

    // 1. Package change is a major state transition
    if (before.packageName !== after.packageName) return true;

    // 2. Activity / window title change
    if (before.activityName !== after.activityName && Boolean(after.activityName)) return true;
    if (before.windowTitle !== after.windowTitle && Boolean(after.windowTitle)) return true;

    // 3. Fingerprint change
    const normBefore = this.normalize(before);
    const normAfter = this.normalize(after);
    if (normBefore.fingerprint !== normAfter.fingerprint) return true;

    // 4. Element count delta
    if (Math.abs(before.elements.length - after.elements.length) >= 2) return true;

    return false;
  }

  /**
   * Finds the best matching UI element for a target descriptor using prioritized heuristic matching
   */
  public findBestMatchingElement(
    observation: ScreenObservation | null,
    criteria: {
      text?: string;
      contentDescription?: string;
      resourceId?: string;
      className?: string;
      isEditable?: boolean;
      isClickable?: boolean;
    }
  ): { element: UIElement | null; confidence: number; matchType: string } {
    if (!observation || observation.elements.length === 0) {
      return { element: null, confidence: 0, matchType: "none" };
    }

    const targetText = criteria.text?.trim();
    const targetDesc = criteria.contentDescription?.trim();
    const targetResId = criteria.resourceId?.trim();
    const targetClass = criteria.className?.trim();

    // 1. Exact ResourceId Match (Highest confidence)
    if (targetResId) {
      const match = observation.elements.find((el) => el.resourceId === targetResId);
      if (match) {
        return { element: match, confidence: 0.98, matchType: "exact_resource_id" };
      }
    }

    // 2. Exact Text Match
    if (targetText) {
      const match = observation.elements.find(
        (el) => el.text && el.text.trim().toLowerCase() === targetText.toLowerCase()
      );
      if (match) {
        return { element: match, confidence: 0.95, matchType: "exact_text" };
      }
    }

    // 3. Exact ContentDescription Match
    if (targetDesc) {
      const match = observation.elements.find(
        (el) => el.contentDescription && el.contentDescription.trim().toLowerCase() === targetDesc.toLowerCase()
      );
      if (match) {
        return { element: match, confidence: 0.93, matchType: "exact_content_desc" };
      }
    }

    // 4. Semantic Substring Match on Text
    if (targetText && targetText.length >= 3) {
      const normTarget = targetText.toLowerCase();
      const match = observation.elements.find((el) => {
        const t = (el.text || "").toLowerCase();
        return t.includes(normTarget) || normTarget.includes(t);
      });
      if (match) {
        return { element: match, confidence: 0.85, matchType: "substring_text" };
      }
    }

    // 5. Semantic Substring Match on ContentDescription
    if (targetText && targetText.length >= 3) {
      const normTarget = targetText.toLowerCase();
      const match = observation.elements.find((el) => {
        const d = (el.contentDescription || "").toLowerCase();
        return d.includes(normTarget) || normTarget.includes(d);
      });
      if (match) {
        return { element: match, confidence: 0.82, matchType: "substring_content_desc" };
      }
    }

    // 6. Generic Editable Field Query
    if (criteria.isEditable) {
      const match = observation.elements.find((el) => el.editable);
      if (match) {
        return { element: match, confidence: 0.75, matchType: "first_editable_field" };
      }
    }

    // 7. Generic Class Match
    if (targetClass) {
      const match = observation.elements.find((el) =>
        el.className.toLowerCase().includes(targetClass.toLowerCase())
      );
      if (match) {
        return { element: match, confidence: 0.70, matchType: "class_name" };
      }
    }

    return { element: null, confidence: 0, matchType: "none" };
  }
}

export const screenInterpreter = ScreenInterpreter.getInstance();
