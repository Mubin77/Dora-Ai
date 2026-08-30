/**
 * Dora Device Action Verifier
 * 
 * Compares pre-action and post-action screen observations to determine
 * whether a UI interaction succeeded, triggered a window transition, or had no effect.
 */

import {
  ActionVerificationResult,
  DeviceAction,
  ScreenObservation,
} from "./DeviceActionTypes";

export class DeviceActionVerifier {
  private static instance: DeviceActionVerifier;

  private constructor() {}

  public static getInstance(): DeviceActionVerifier {
    if (!DeviceActionVerifier.instance) {
      DeviceActionVerifier.instance = new DeviceActionVerifier();
    }
    return DeviceActionVerifier.instance;
  }

  /**
   * Verifies action execution outcome by comparing observation states
   */
  public verifyTransition(
    action: DeviceAction,
    before: ScreenObservation | null,
    after: ScreenObservation | null
  ): ActionVerificationResult {
    if (!before || !after) {
      return {
        verified: true,
        status: "NOT_VERIFIED",
        previousObservationId: before?.observationId,
        currentObservationId: after?.observationId,
        details: "Single observation context; cross-observation verification skipped.",
      };
    }

    const packageChanged = before.packageName !== after.packageName;
    const activityChanged = before.activityName !== after.activityName;
    const elementCountChanged = before.elements.length !== after.elements.length;

    // Check if key texts differ
    const beforeTexts = new Set(before.elements.map((e) => e.text).filter(Boolean));
    const afterTexts = new Set(after.elements.map((e) => e.text).filter(Boolean));
    let textDifferences = 0;
    for (const t of afterTexts) {
      if (!beforeTexts.has(t)) textDifferences++;
    }

    const stateChanged = packageChanged || activityChanged || elementCountChanged || textDifferences > 0;

    switch (action) {
      case "press_back":
      case "press_home":
      case "open_application":
        if (stateChanged) {
          return {
            verified: true,
            status: "VERIFIED_SUCCESS",
            previousObservationId: before.observationId,
            currentObservationId: after.observationId,
            expectedChangeDetected: true,
            details: `Screen transition confirmed: ${after.packageName || "new screen"} (${after.activityName || ""})`,
          };
        }
        return {
          verified: false,
          status: "VERIFIED_NO_CHANGE",
          previousObservationId: before.observationId,
          currentObservationId: after.observationId,
          expectedChangeDetected: false,
          details: "Screen state did not change after navigation action.",
        };

      case "tap":
      case "type_text":
      case "scroll":
      case "swipe":
        return {
          verified: true,
          status: stateChanged ? "VERIFIED_SUCCESS" : "VERIFIED_NO_CHANGE",
          previousObservationId: before.observationId,
          currentObservationId: after.observationId,
          expectedChangeDetected: stateChanged,
          details: stateChanged
            ? "UI state updated following interaction."
            : "Action executed, UI elements remained stable.",
        };

      case "read_screen":
      case "take_screenshot":
      case "find_ui_element":
        return {
          verified: true,
          status: "VERIFIED_SUCCESS",
          previousObservationId: before.observationId,
          currentObservationId: after.observationId,
          expectedChangeDetected: true,
          details: "Inspection action completed.",
        };

      default:
        return {
          verified: true,
          status: "NOT_VERIFIED",
        };
    }
  }
}

export const deviceActionVerifier = DeviceActionVerifier.getInstance();
