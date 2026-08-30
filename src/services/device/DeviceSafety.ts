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
  ]);

  // CONFIRMATION_REQUIRED actions will require explicit user approval before execution
  private confirmationActions: ReadonlySet<string> = new Set([
    "send_message",
    "post_content",
    "modify_files",
    "install_application",
    "tap",
    "type_text",
    "swipe",
    "scroll",
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
  ): { isAllowed: boolean; violationReason?: string } {
    // 1. Check if action is high risk / destructive
    if (this.isHighRisk(action)) {
      return {
        isAllowed: false,
        violationReason: `Action '${action}' is classified as HIGH_RISK and is blocked by default device safety policy.`,
      };
    }

    // 2. Inspect all string parameters for arbitrary execution patterns
    const serializedParams = JSON.stringify(parameters);
    for (const pattern of this.forbiddenPatterns) {
      if (pattern.test(serializedParams)) {
        return {
          isAllowed: false,
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
          violationReason: "Invalid parameter: appName must be a non-empty string.",
        };
      }
      if (appName.length > 100) {
        return {
          isAllowed: false,
          violationReason: "Invalid parameter: appName exceeds safe maximum length.",
        };
      }
    }

    return { isAllowed: true };
  }
}

export const deviceSafety = DeviceActionSafety.getInstance();
