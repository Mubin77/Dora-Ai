/**
 * Dora Unified Device Control Service
 * 
 * Top-level orchestration service for device actions across Android (and future PC).
 * 
 * Workflow:
 * 1. Validates request against allowlisted DeviceActionRegistry.
 * 2. Checks DeviceActionSafety risk tier and sanitization rules.
 * 3. Routes to appropriate sub-service (AndroidControlService / Mock).
 * 4. Captures structured results and emits future-compatible memory events.
 */

import {
  DeviceActionRequest,
  DeviceActionResult,
  DeviceMemoryEvent,
  DeviceType,
  OpenApplicationParams,
} from "./DeviceActionTypes";
import { deviceActionRegistry } from "./DeviceActionRegistry";
import { deviceSafety } from "./DeviceSafety";
import { androidControlService } from "./AndroidControlService";
import { deviceRegistry } from "./DeviceRegistry";

export class DeviceControlService {
  private static instance: DeviceControlService;
  private memoryEventListeners: Array<(event: DeviceMemoryEvent) => void> = [];

  private constructor() {}

  public static getInstance(): DeviceControlService {
    if (!DeviceControlService.instance) {
      DeviceControlService.instance = new DeviceControlService();
    }
    return DeviceControlService.instance;
  }

  /**
   * Registers a callback for device action memory events (future-compatible memory bridge)
   */
  public onMemoryEvent(callback: (event: DeviceMemoryEvent) => void): () => void {
    this.memoryEventListeners.push(callback);
    return () => {
      this.memoryEventListeners = this.memoryEventListeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Primary entry point to execute an allowlisted device action request
   */
  public async executeAction(request: Partial<DeviceActionRequest>): Promise<DeviceActionResult> {
    const requestId = request.requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const deviceType: DeviceType = request.device || "android";
    const action = request.action || "open_application";
    const timestamp = request.timestamp || Date.now();

    // 1. Validate request with allowlisted Registry
    const validation = deviceActionRegistry.validateRequest({
      requestId,
      device: deviceType,
      action,
      parameters: request.parameters || {},
      timestamp,
    });

    if (!validation.isValid) {
      const errorResult: DeviceActionResult = {
        requestId,
        success: false,
        status: "ACTION_FAILED",
        device: deviceType,
        action,
        message: validation.errorMessage || "Action validation failed",
        error: {
          code: validation.errorCode || "INVALID_ACTION",
          details: validation.errorMessage || "Validation failed against Device Action Registry",
        },
        timestamp: Date.now(),
      };
      this.emitMemoryEvent(deviceType, action, JSON.stringify(request.parameters || {}), false);
      return errorResult;
    }

    // 2. Route by device type
    if (deviceType === "android") {
      let result: DeviceActionResult;

      switch (action) {
        case "open_application":
          result = await androidControlService.openApplication({
            appName: request.parameters?.appName || "",
            packageName: request.parameters?.packageName,
            fallbackUrl: request.parameters?.fallbackUrl,
          });
          break;

        case "tap":
          result = await androidControlService.tap({
            elementId: request.parameters?.elementId,
            x: request.parameters?.x !== undefined ? Number(request.parameters.x) : undefined,
            y: request.parameters?.y !== undefined ? Number(request.parameters.y) : undefined,
            longPress: Boolean(request.parameters?.longPress),
          });
          break;

        case "type_text":
          result = await androidControlService.typeText({
            elementId: request.parameters?.elementId,
            text: String(request.parameters?.text ?? ""),
            clearFirst: Boolean(request.parameters?.clearFirst),
            pressEnter: Boolean(request.parameters?.pressEnter),
          });
          break;

        case "swipe":
          result = await androidControlService.swipe({
            direction: request.parameters?.direction || "up",
            durationMs: request.parameters?.durationMs ? Number(request.parameters.durationMs) : undefined,
            startX: request.parameters?.startX ? Number(request.parameters.startX) : undefined,
            startY: request.parameters?.startY ? Number(request.parameters.startY) : undefined,
            endX: request.parameters?.endX ? Number(request.parameters.endX) : undefined,
            endY: request.parameters?.endY ? Number(request.parameters.endY) : undefined,
          });
          break;

        case "scroll":
          result = await androidControlService.scroll({
            direction: request.parameters?.direction || "down",
            elementId: request.parameters?.elementId,
          });
          break;

        case "press_back":
          result = await androidControlService.pressBack();
          break;

        case "press_home":
          result = await androidControlService.pressHome();
          break;

        case "take_screenshot":
          result = await androidControlService.takeScreenshot({
            quality: request.parameters?.quality ? Number(request.parameters.quality) : undefined,
          });
          break;

        case "read_screen":
          result = await androidControlService.readScreen({
            includeNonClickable: request.parameters?.includeNonClickable !== undefined ? Boolean(request.parameters.includeNonClickable) : true,
          });
          break;

        case "find_ui_element":
          result = await androidControlService.findUiElement({
            text: request.parameters?.text,
            contentDescription: request.parameters?.contentDescription,
            resourceId: request.parameters?.resourceId,
            className: request.parameters?.className,
            matchCase: Boolean(request.parameters?.matchCase),
          });
          break;

        case "open_url":
          result = await androidControlService.openUrl(String(request.parameters?.url || ""));
          break;

        default:
          result = {
            requestId,
            success: false,
            status: "ACTION_FAILED",
            device: "android",
            action,
            message: `Action '${action}' is not handled.`,
            error: {
              code: "ACTION_NOT_IMPLEMENTED",
              details: `Action '${action}' is declared but not handled by Android control dispatcher.`,
            },
            timestamp: Date.now(),
          };
      }

      this.emitMemoryEvent(
        deviceType,
        action,
        request.parameters?.appName || request.parameters?.elementId || request.parameters?.text || action,
        result.success,
        result.message
      );
      return result;
    }

    // 3. Handle unsupported device type (e.g. PC placeholder)
    const unsupportedResult: DeviceActionResult = {
      requestId,
      success: false,
      status: "DEVICE_NOT_CONNECTED",
      device: deviceType,
      action,
      message: `Device platform '${deviceType}' is not supported yet.`,
      error: {
        code: "DEVICE_NOT_CONNECTED",
        details: `Platform '${deviceType}' is reserved for future PC device control integration.`,
      },
      timestamp: Date.now(),
    };
    return unsupportedResult;
  }

  /**
   * Helper shortcut to open an application
   */
  public async openApplication(appName: string, device: DeviceType = "android"): Promise<DeviceActionResult> {
    return this.executeAction({
      requestId: `req_${Date.now()}_open_app`,
      device,
      action: "open_application",
      parameters: { appName },
      timestamp: Date.now(),
    });
  }

  /**
   * Retrieves overall device subsystem status
   */
  public async getStatus() {
    const androidStatus = await deviceRegistry.refreshPrimaryAndroidStatus();
    return {
      primaryDevice: deviceRegistry.getPrimaryDevice("android"),
      allDevices: deviceRegistry.getAllDevices(),
      androidStatus,
      supportedActions: deviceActionRegistry.getSupportedActions(),
      implementedActions: deviceActionRegistry.getImplementedActions(),
      safetyPolicies: {
        open_application: deviceSafety.getSafetyLevel("open_application"),
      },
      timestamp: Date.now(),
    };
  }

  private emitMemoryEvent(
    device: DeviceType,
    action: any,
    target: string,
    success: boolean,
    details?: string
  ): void {
    const event: DeviceMemoryEvent = {
      type: "device_action",
      device,
      action,
      target,
      success,
      timestamp: Date.now(),
      details,
    };
    for (const listener of this.memoryEventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.warn("[DeviceControlService] Error in memory event listener:", err);
      }
    }
  }
}

export const deviceControlService = DeviceControlService.getInstance();
