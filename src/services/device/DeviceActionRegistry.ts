/**
 * Dora Device Action Registry
 * 
 * Strict allowlist registry for executable device actions.
 * Ensures the AI can only execute explicitly declared and registered actions.
 */

import { DeviceAction, DeviceActionRequest, DeviceErrorCode } from "./DeviceActionTypes";
import { deviceSafety } from "./DeviceSafety";

export interface RegisteredActionDefinition {
  action: DeviceAction;
  description: string;
  isImplemented: boolean;
  requiredParameters: string[];
  validateParameters: (params: Record<string, any>) => { isValid: boolean; error?: string };
}

export class DeviceActionRegistry {
  private static instance: DeviceActionRegistry;
  private registry: Map<DeviceAction, RegisteredActionDefinition> = new Map();

  private constructor() {
    this.registerInitialActions();
  }

  public static getInstance(): DeviceActionRegistry {
    if (!DeviceActionRegistry.instance) {
      DeviceActionRegistry.instance = new DeviceActionRegistry();
    }
    return DeviceActionRegistry.instance;
  }

  private registerInitialActions(): void {
    // 1. open_application (Implemented in Milestone 1)
    this.registerAction({
      action: "open_application",
      description: "Launches an installed Android application by name or package identifier.",
      isImplemented: true,
      requiredParameters: ["appName"],
      validateParameters: (params) => {
        if (!params || typeof params.appName !== "string" || params.appName.trim().length === 0) {
          return { isValid: false, error: "Missing or empty required parameter: appName" };
        }
        return { isValid: true };
      },
    });

    // 2. Future Placeholder Actions (Registered but flagged as not implemented)
    const futureActions: Array<{ action: DeviceAction; desc: string; params: string[] }> = [
      { action: "tap", desc: "Taps at screen coordinate or UI element", params: ["x", "y"] },
      { action: "type_text", desc: "Types text into active input field", params: ["text"] },
      { action: "swipe", desc: "Performs directional swipe gesture", params: ["direction"] },
      { action: "scroll", desc: "Scrolls viewport", params: ["direction"] },
      { action: "press_back", desc: "Sends hardware/virtual back button event", params: [] },
      { action: "press_home", desc: "Sends home button event", params: [] },
      { action: "read_screen", desc: "Inspects accessibility node hierarchy", params: [] },
      { action: "take_screenshot", desc: "Captures current display frame", params: [] },
      { action: "open_url", desc: "Opens web URL in browser", params: ["url"] },
    ];

    for (const fa of futureActions) {
      this.registerAction({
        action: fa.action,
        description: fa.desc,
        isImplemented: false,
        requiredParameters: fa.params,
        validateParameters: () => ({ isValid: true }),
      });
    }
  }

  public registerAction(def: RegisteredActionDefinition): void {
    this.registry.set(def.action, def);
  }

  public isRegistered(action: string): boolean {
    return this.registry.has(action as DeviceAction);
  }

  public isImplemented(action: string): boolean {
    const def = this.registry.get(action as DeviceAction);
    return Boolean(def?.isImplemented);
  }

  public getActionDefinition(action: string): RegisteredActionDefinition | undefined {
    return this.registry.get(action as DeviceAction);
  }

  public getSupportedActions(): DeviceAction[] {
    return Array.from(this.registry.keys());
  }

  public getAllowlistedActions(): DeviceAction[] {
    return Array.from(this.registry.keys());
  }

  public getImplementedActions(): DeviceAction[] {

    return Array.from(this.registry.entries())
      .filter(([_, def]) => def.isImplemented)
      .map(([action]) => action);
  }

  /**
   * Validates a device action request against the registry and safety system
   */
  public validateRequest(request: Partial<DeviceActionRequest>): {
    isValid: boolean;
    errorCode?: DeviceErrorCode;
    errorMessage?: string;
  } {
    if (!request || !request.action) {
      return {
        isValid: false,
        errorCode: "INVALID_ACTION",
        errorMessage: "Device action request missing action property.",
      };
    }

    // 1. Check if registered
    if (!this.isRegistered(request.action)) {
      return {
        isValid: false,
        errorCode: "ACTION_NOT_SUPPORTED",
        errorMessage: `Action '${request.action}' is not in the allowlisted Device Action Registry.`,
      };
    }

    const actionDef = this.registry.get(request.action as DeviceAction)!;

    // 2. Check if implemented for current milestone
    if (!actionDef.isImplemented) {
      return {
        isValid: false,
        errorCode: "ACTION_NOT_IMPLEMENTED",
        errorMessage: `Action '${request.action}' is defined for future phases but not implemented in the current milestone.`,
      };
    }

    // 3. Safety system check
    const safetyCheck = deviceSafety.validateActionSecurity(request.action, request.parameters || {});
    if (!safetyCheck.isAllowed) {
      return {
        isValid: false,
        errorCode: "SAFETY_VIOLATION",
        errorMessage: safetyCheck.violationReason || "Action rejected by safety policy.",
      };
    }

    // 4. Parameter validation
    const paramValidation = actionDef.validateParameters(request.parameters || {});
    if (!paramValidation.isValid) {
      return {
        isValid: false,
        errorCode: "INVALID_ACTION",
        errorMessage: paramValidation.error || "Parameter validation failed.",
      };
    }

    return { isValid: true };
  }
}

export const deviceActionRegistry = DeviceActionRegistry.getInstance();
