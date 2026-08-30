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
    // 1. open_application (Phase 1)
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

    // 2. tap (Phase 2)
    this.registerAction({
      action: "tap",
      description: "Taps a visible UI element by observation elementId or validated screen coordinates.",
      isImplemented: true,
      requiredParameters: [],
      validateParameters: (params) => {
        const hasElement = typeof params?.elementId === "string" && params.elementId.trim().length > 0;
        const hasCoords = params?.x !== undefined && params?.y !== undefined && !isNaN(Number(params.x)) && !isNaN(Number(params.y));
        if (!hasElement && !hasCoords) {
          return { isValid: false, error: "Tap requires either a valid 'elementId' or ('x', 'y') coordinates." };
        }
        return { isValid: true };
      },
    });

    // 3. type_text (Phase 2)
    this.registerAction({
      action: "type_text",
      description: "Inputs text into the focused or target editable UI element.",
      isImplemented: true,
      requiredParameters: ["text"],
      validateParameters: (params) => {
        if (params?.text === undefined || params?.text === null || typeof params.text !== "string") {
          return { isValid: false, error: "Missing or invalid required parameter: text" };
        }
        return { isValid: true };
      },
    });

    // 4. swipe (Phase 2)
    this.registerAction({
      action: "swipe",
      description: "Executes a directional swipe gesture (up, down, left, right).",
      isImplemented: true,
      requiredParameters: ["direction"],
      validateParameters: (params) => {
        const dir = params?.direction;
        if (!dir || !["up", "down", "left", "right"].includes(dir)) {
          return { isValid: false, error: "Swipe requires direction to be 'up', 'down', 'left', or 'right'." };
        }
        return { isValid: true };
      },
    });

    // 5. scroll (Phase 2)
    this.registerAction({
      action: "scroll",
      description: "Scrolls the active window forward or backward.",
      isImplemented: true,
      requiredParameters: ["direction"],
      validateParameters: (params) => {
        const dir = params?.direction;
        if (!dir || !["up", "down"].includes(dir)) {
          return { isValid: false, error: "Scroll requires direction to be 'up' or 'down'." };
        }
        return { isValid: true };
      },
    });

    // 6. press_back (Phase 2)
    this.registerAction({
      action: "press_back",
      description: "Sends the Android system Back navigation action.",
      isImplemented: true,
      requiredParameters: [],
      validateParameters: () => ({ isValid: true }),
    });

    // 7. press_home (Phase 2)
    this.registerAction({
      action: "press_home",
      description: "Sends the Android system Home navigation action.",
      isImplemented: true,
      requiredParameters: [],
      validateParameters: () => ({ isValid: true }),
    });

    // 8. take_screenshot (Phase 2)
    this.registerAction({
      action: "take_screenshot",
      description: "Captures a temporary frame buffer of the current screen for inspection.",
      isImplemented: true,
      requiredParameters: [],
      validateParameters: () => ({ isValid: true }),
    });

    // 9. read_screen (Phase 2)
    this.registerAction({
      action: "read_screen",
      description: "Inspects the active window accessibility tree and returns visible structured UI elements.",
      isImplemented: true,
      requiredParameters: [],
      validateParameters: () => ({ isValid: true }),
    });

    // 10. find_ui_element (Phase 2)
    this.registerAction({
      action: "find_ui_element",
      description: "Queries the active window for a UI element by text, content description, or resource ID.",
      isImplemented: true,
      requiredParameters: [],
      validateParameters: (params) => {
        const hasCriterion =
          Boolean(params?.text && typeof params.text === "string" && params.text.trim()) ||
          Boolean(params?.contentDescription && typeof params.contentDescription === "string" && params.contentDescription.trim()) ||
          Boolean(params?.resourceId && typeof params.resourceId === "string" && params.resourceId.trim()) ||
          Boolean(params?.className && typeof params.className === "string" && params.className.trim());

        if (!hasCriterion) {
          return { isValid: false, error: "find_ui_element requires at least one of: text, contentDescription, resourceId, or className." };
        }
        return { isValid: true };
      },
    });

    // 11. open_url (Auxiliary)
    this.registerAction({
      action: "open_url",
      description: "Opens a validated web URL in the default browser.",
      isImplemented: true,
      requiredParameters: ["url"],
      validateParameters: (params) => {
        if (!params || typeof params.url !== "string" || !/^https?:\/\//i.test(params.url.trim())) {
          return { isValid: false, error: "Invalid URL parameter: must begin with http:// or https://" };
        }
        return { isValid: true };
      },
    });
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
