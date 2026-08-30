/**
 * Dora Screen Observation Manager
 * 
 * Manages accessibility tree observations, generates stable observation-scoped element IDs,
 * detects stale elements, executes safe semantic element queries, and enforces privacy redaction.
 */

import {
  FindUiElementParams,
  ScreenObservation,
  UIElement,
} from "./DeviceActionTypes";

export class ScreenObservationManager {
  private static instance: ScreenObservationManager;

  // Cache of recent observations with TTL
  private observations: Map<string, ScreenObservation> = new Map();
  private latestObservationId: string | null = null;
  private readonly OBSERVATION_TTL_MS = 25000; // 25 seconds observation lifetime

  // Privacy: Patterns identifying sensitive fields that must be masked / flagged
  private sensitivePatterns = [
    /\b(?:password|passwd|pin|otp|cvv|secret|token|passcode|card\s*number)\b/i,
    /\b(?:auth|credential|ssn|social\s*security)\b/i,
  ];

  private constructor() {}

  public static getInstance(): ScreenObservationManager {
    if (!ScreenObservationManager.instance) {
      ScreenObservationManager.instance = new ScreenObservationManager();
    }
    return ScreenObservationManager.instance;
  }

  /**
   * Generates a stable observation-scoped element ID
   */
  public generateElementId(observationId: string, index: number): string {
    return `${observationId}_el_${index}`;
  }

  /**
   * Creates a structured ScreenObservation from raw native/mock accessibility tree data
   */
  public createObservation(rawData: {
    packageName?: string;
    activityName?: string;
    windowTitle?: string;
    elements: Array<Partial<UIElement>>;
  }): ScreenObservation {
    const timestamp = Date.now();
    const observationId = `obs_${timestamp}_${Math.random().toString(36).slice(2, 6)}`;
    const expiresAt = timestamp + this.OBSERVATION_TTL_MS;

    const sanitizedElements: UIElement[] = (rawData.elements || []).map((el, index) => {
      const isPassword =
        Boolean(el.isPassword) ||
        this.isSensitiveField(el.text, el.contentDescription, el.resourceId, el.className);

      // Privacy: Redact plaintext from password fields
      const displayText = isPassword ? "[PROTECTED_INPUT_FIELD]" : el.text;

      return {
        elementId: this.generateElementId(observationId, index),
        className: el.className || "android.view.View",
        text: displayText,
        contentDescription: el.contentDescription,
        resourceId: el.resourceId,
        clickable: Boolean(el.clickable),
        editable: Boolean(el.editable),
        enabled: el.enabled !== false,
        focusable: Boolean(el.focusable),
        scrollable: Boolean(el.scrollable),
        bounds: el.bounds || { left: 0, top: 0, right: 0, bottom: 0 },
        isPassword,
        parentIndex: el.parentIndex,
        childrenCount: el.childrenCount,
      };
    });

    const observation: ScreenObservation = {
      observationId,
      timestamp,
      packageName: rawData.packageName || "unknown.package",
      activityName: rawData.activityName,
      windowTitle: rawData.windowTitle,
      elements: sanitizedElements,
      isStale: false,
      expiresAt,
    };

    this.observations.set(observationId, observation);
    this.latestObservationId = observationId;
    this.cleanupOldObservations();

    return observation;
  }

  /**
   * Retrieves an observation by ID, checking for TTL staleness
   */
  public getObservation(observationId: string): ScreenObservation | null {
    const obs = this.observations.get(observationId);
    if (!obs) {
      return null;
    }

    if (Date.now() > obs.expiresAt) {
      obs.isStale = true;
    }

    return obs;
  }

  /**
   * Retrieves the latest valid observation
   */
  public getLatestObservation(): ScreenObservation | null {
    if (!this.latestObservationId) {
      return null;
    }
    return this.getObservation(this.latestObservationId);
  }

  /**
   * Retrieves an element by its observation-scoped ID with staleness checking
   */
  public getElement(elementId: string): {
    element: UIElement | null;
    isStale: boolean;
    reason?: string;
  } {
    if (!elementId || typeof elementId !== "string") {
      return { element: null, isStale: true, reason: "Invalid elementId" };
    }

    // Parse observationId from elementId prefix: "obs_<timestamp>_<rand>_el_<index>"
    const match = elementId.match(/^(obs_\d+_[a-z0-9]+)_el_(\d+)$/);
    if (!match) {
      return { element: null, isStale: true, reason: "Malformed element identifier" };
    }

    const obsId = match[1];
    const obs = this.getObservation(obsId);

    if (!obs) {
      return { element: null, isStale: true, reason: "Screen observation expired or not found" };
    }

    if (obs.isStale || Date.now() > obs.expiresAt) {
      return { element: null, isStale: true, reason: "Screen observation is stale" };
    }

    const found = obs.elements.find((el) => el.elementId === elementId);
    if (!found) {
      return { element: null, isStale: false, reason: "Element not found in observation" };
    }

    return { element: found, isStale: false };
  }

  /**
   * Finds matching UI element within an observation.
   * Prioritizes exact matches, then safe normalized (trimmed, case-insensitive) matches.
   * Prohibits reckless uncontrolled fuzzy matching.
   */
  public findMatchingElement(
    params: FindUiElementParams,
    observation?: ScreenObservation | null
  ): UIElement | null {
    const targetObs = observation || this.getLatestObservation();
    if (!targetObs || targetObs.isStale || Date.now() > targetObs.expiresAt) {
      return null;
    }

    const textTarget = params.text?.trim();
    const descTarget = params.contentDescription?.trim();
    const idTarget = params.resourceId?.trim();
    const classTarget = params.className?.trim();
    const exact = Boolean(params.exactMatch);

    // 1. Exact Match Priority
    for (const el of targetObs.elements) {
      if (textTarget && el.text === textTarget) return el;
      if (descTarget && el.contentDescription === descTarget) return el;
      if (idTarget && el.resourceId === idTarget) return el;
    }

    // If exact match only requested, stop here
    if (exact) {
      return null;
    }

    // 2. Safe Normalized Match (case-insensitive equality or clean containment)
    const normText = textTarget?.toLowerCase();
    const normDesc = descTarget?.toLowerCase();
    const normId = idTarget?.toLowerCase();

    for (const el of targetObs.elements) {
      const elText = el.text?.toLowerCase().trim();
      const elDesc = el.contentDescription?.toLowerCase().trim();
      const elId = el.resourceId?.toLowerCase().trim();

      // Direct normalized equality
      if (normText && elText === normText) return el;
      if (normDesc && elDesc === normDesc) return el;
      if (normId && elId === normId) return el;

      // Safe substring inclusion if target length >= 3
      if (normText && normText.length >= 3 && elText && (elText.includes(normText) || normText.includes(elText))) {
        return el;
      }
      if (normDesc && normDesc.length >= 3 && elDesc && (elDesc.includes(normDesc) || normDesc.includes(elDesc))) {
        return el;
      }
      if (normId && normId.length >= 3 && elId && elId.includes(normId)) {
        return el;
      }
    }

    // 3. Class filter if provided
    if (classTarget) {
      const byClass = targetObs.elements.find((el) => el.className.toLowerCase().includes(classTarget.toLowerCase()));
      if (byClass) return byClass;
    }

    return null;
  }

  /**
   * Invalidates all cached observations on navigation or major screen changes
   */
  public invalidateObservations(reason: string = "Screen transition"): void {
    for (const obs of this.observations.values()) {
      obs.isStale = true;
    }
    this.latestObservationId = null;
  }

  /**
   * Checks if an input element or text refers to a sensitive authentication/financial field
   */
  public isSensitiveField(...fields: Array<string | undefined>): boolean {
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

  private cleanupOldObservations(): void {
    const now = Date.now();
    for (const [id, obs] of this.observations.entries()) {
      if (now > obs.expiresAt + 60000) {
        this.observations.delete(id);
      }
    }
  }
}

export const screenObservationManager = ScreenObservationManager.getInstance();
