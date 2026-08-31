/**
 * Dora Device Action Safety System
 * 
 * Classifies all device actions by risk tier and enforces strict security boundaries.
 * Prohibits arbitrary shell commands, adb scripts, native reflection, or unsanctioned code execution.
 */

import { DeviceAction, DeviceSafetyLevel } from "./DeviceActionTypes";

export class DeviceActionSafety {
  private static instance: DeviceActionSafety;

  // SAFE actions can execute immediately without explicit user modal interruption
  private safeActions: ReadonlySet<string> = new Set([
    "open_application",
    "open_url",
    "take_screenshot",
    "read_screen",
    "find_ui_element",
    "press_back",
    "press_home",
    "scroll",
    "swipe",
    "tap",
    "type_text",
  ]);

  // CONFIRMATION_REQUIRED actions will require explicit user approval before execution
  private confirmationActions: ReadonlySet<string> = new Set([
    "send_message",
    "post_content",
    "modify_files",
    "install_application",
  ]);

  // HIGH_RISK actions represent destructive or security-critical actions
  private highRiskActions: ReadonlySet<string> = new Set([
    "delete_files",
    "factory_reset",
    "financial_action",
    "password_change",
    "change_permissions",
    "disable_security",
  ]);

  // Explicitly forbidden malicious/unbounded keywords in parameters
  private forbiddenPatterns: RegExp[] = [
    /\b(?:rm\s+-rf|sh\s+-c|bash\s+-c|chmod|chown|kill|pkill|eval\(|exec\(|<script)/i,
    /\b(?:adb\s+shell|su\b|root\b|busybox|dd\s+if=)/i,
    /(?:javascript:|data:text\/html)/i,
  ];

  // Sensitive keywords forbidden from automated type_text injection
  private sensitiveTypePatterns: RegExp[] = [
    /(?:password|passwd|otp|pin|cvv|secret_key|private_key|auth_token|bearer)/i,
  ];

  private constructor() {}

  public static getInstance(): DeviceActionSafety {
    if (!DeviceActionSafety.instance) {
      DeviceActionSafety.instance = new DeviceActionSafety();
    }
    return DeviceActionSafety.instance;
  }

  /**
   * Returns the safety tier for a requested action
   */
  public getSafetyLevel(action: DeviceAction | string): DeviceSafetyLevel {
    if (this.safeActions.has(action)) {
      return "SAFE";
    }
    if (this.highRiskActions.has(action)) {
      return "HIGH_RISK";
    }
    return "CONFIRMATION_REQUIRED";
  }

  public isSafe(action: DeviceAction | string): boolean {
    return this.getSafetyLevel(action) === "SAFE";
  }

  public requiresConfirmation(action: DeviceAction | string): boolean {
    return this.getSafetyLevel(action) === "CONFIRMATION_REQUIRED";
  }

  public isHighRisk(action: DeviceAction | string): boolean {
    return this.getSafetyLevel(action) === "HIGH_RISK";
  }

  /**
   * Validates parameters against injection or arbitrary command execution attempts.
   */
  public validateActionSecurity(
    action: string,
    parameters: Record<string, any> = {}
  ): { isAllowed: boolean; violationReason?: string; errorCode?: string } {
    // 1. Check if action is high risk / destructive
    if (this.isHighRisk(action)) {
      return {
        isAllowed: false,
        errorCode: "SAFETY_VIOLATION",
        violationReason: `Action '${action}' is classified as HIGH_RISK and is blocked by default device safety policy.`,
      };
    }

    // 2. Inspect all string parameters for arbitrary execution patterns
    const serializedParams = JSON.stringify(parameters);
    for (const pattern of this.forbiddenPatterns) {
      if (pattern.test(serializedParams)) {
        return {
          isAllowed: false,
          errorCode: "SAFETY_VIOLATION",
          violationReason: "Security boundary violation: parameter contains prohibited shell or script pattern.",
        };
      }
    }

    // 3. For open_application, validate appName
    if (action === "open_application") {
      const appName = parameters?.appName;
      if (!appName || typeof appName !== "string" || appName.trim().length === 0) {
        return {
          isAllowed: false,
          errorCode: "INVALID_ACTION",
          violationReason: "Invalid parameter: appName must be a non-empty string.",
        };
      }
      if (appName.length > 100) {
        return {
          isAllowed: false,
          errorCode: "INVALID_ACTION",
          violationReason: "Invalid parameter: appName exceeds safe maximum length.",
        };
      }
    }

    // 4. For type_text, enforce privacy & sensitive data protection
    if (action === "type_text") {
      const text = parameters?.text;
      if (text === undefined || text === null || typeof text !== "string") {
        return {
          isAllowed: false,
          errorCode: "INVALID_ACTION",
          violationReason: "Invalid parameter: text must be a valid string.",
        };
      }

      // Check if text payload or field context contains sensitive authentication/payment data
      const fieldDesc = String(parameters?.elementDescription || parameters?.elementId || "");
      for (const pattern of this.sensitiveTypePatterns) {
        if (pattern.test(fieldDesc)) {
          return {
            isAllowed: false,
            errorCode: "SENSITIVE_FIELD_BLOCKED",
            violationReason: "Automated text input into sensitive authentication or password fields is strictly prohibited.",
          };
        }
      }
    }

    // 5. For tap with coordinates, validate coordinate numbers
    if (action === "tap" && (parameters?.x !== undefined || parameters?.y !== undefined)) {
      const x = Number(parameters?.x);
      const y = Number(parameters?.y);
      if (isNaN(x) || isNaN(y) || x < 0 || y < 0 || x > 5000 || y > 5000) {
        return {
          isAllowed: false,
          errorCode: "INVALID_ACTION",
          violationReason: "Coordinates must be valid finite numbers within display bounds (0 to 5000).",
        };
      }
    }

    // 6. For swipe, validate direction
    if (action === "swipe") {
      const direction = parameters?.direction;
      if (!direction || !["up", "down", "left", "right"].includes(direction)) {
        return {
          isAllowed: false,
          errorCode: "INVALID_ACTION",
          violationReason: "Swipe direction must be one of: 'up', 'down', 'left', 'right'.",
        };
      }
    }

    // 7. For scroll, validate direction
    if (action === "scroll") {
      const direction = parameters?.direction;
      if (!direction || !["up", "down"].includes(direction)) {
        return {
          isAllowed: false,
          errorCode: "INVALID_ACTION",
          violationReason: "Scroll direction must be one of: 'up', 'down'.",
        };
      }
    }

    return { isAllowed: true };
  }
}

export const deviceSafety = DeviceActionSafety.getInstance();
