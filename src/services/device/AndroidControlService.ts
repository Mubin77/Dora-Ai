/**
 * Dora Android Control Service
 * 
 * Manages communication between Dora and the native Android Companion Bridge.
 * 
 * Supports:
 * - Native Capacitor Bridge (`Capacitor.Plugins.DoraAndroidBridge`)
 * - Injected Native JavaScript Interface (`window.DoraAndroidBridge`)
 * - Fallback to MockAndroidControlService when running in browser
 */

import {
  DeviceAction,
  DeviceActionResult,
  DevicePermissionStatus,
  OpenApplicationParams,
} from "./DeviceActionTypes";
import { applicationResolver } from "./ApplicationResolver";
import { mockAndroidControlService } from "./MockAndroidControlService";

export interface NativeBridgeInterface {
  openApp(options: { appName: string; packageName: string }): Promise<{ success: boolean; message?: string; error?: string }>;
  checkAccessibility(): Promise<{ enabled: boolean; model?: string; version?: string }>;
  getInstalledApplications?(): Promise<{ apps: Array<{ appName: string; packageName: string }> }>;
}

export class AndroidControlService {
  private static instance: AndroidControlService;

  private constructor() {}

  public static getInstance(): AndroidControlService {
    if (!AndroidControlService.instance) {
      AndroidControlService.instance = new AndroidControlService();
    }
    return AndroidControlService.instance;
  }

  /**
   * Retrieves the native Android bridge interface if present in the runtime window
   */
  public getNativeBridge(): NativeBridgeInterface | null {
    if (typeof window === "undefined") {
      return null;
    }

    // 1. Check Capacitor plugin registration
    const cap = (window as any)?.Capacitor;
    if (cap?.Plugins?.DoraAndroidBridge) {
      return cap.Plugins.DoraAndroidBridge as NativeBridgeInterface;
    }

    // 2. Check injected Android WebView JavaScript interface
    const directBridge = (window as any)?.DoraAndroidBridge;
    if (directBridge && typeof directBridge.openApp === "function") {
      return directBridge as NativeBridgeInterface;
    }

    return null;
  }

  public isBridgeAvailable(): boolean {
    return this.getNativeBridge() !== null;
  }

  /**
   * Checks whether Android accessibility service and companion bridge are active
   */
  public async getPermissionStatus(): Promise<DevicePermissionStatus> {
    const bridge = this.getNativeBridge();
    if (!bridge) {
      return mockAndroidControlService.getPermissionStatus();
    }

    try {
      const res = await bridge.checkAccessibility();
      return {
        accessibilityEnabled: Boolean(res.enabled),
        bridgeConnected: true,
        deviceModel: res.model || "Android Device",
        androidVersion: res.version || "Android OS",
      };
    } catch (err: any) {
      console.warn("[AndroidControlService] Failed to query native accessibility status:", err);
      return {
        accessibilityEnabled: false,
        bridgeConnected: true,
        deviceModel: "Android Device",
        androidVersion: "Unknown",
      };
    }
  }

  /**
   * Refreshes installed applications list from the native Android bridge
   */
  public async syncInstalledApplications(): Promise<boolean> {
    const bridge = this.getNativeBridge();
    if (!bridge || typeof bridge.getInstalledApplications !== "function") {
      return false;
    }

    try {
      const result = await bridge.getInstalledApplications();
      if (result && Array.isArray(result.apps)) {
        applicationResolver.setInstalledApplications(result.apps);
        return true;
      }
    } catch (err) {
      console.warn("[AndroidControlService] Could not sync installed applications from bridge:", err);
    }
    return false;
  }

  /**
   * Launches an Android application by natural language name or package identifier
   */
  public async openApplication(params: OpenApplicationParams): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const bridge = this.getNativeBridge();

    // 1. If bridge is not present, route directly to Mock service
    if (!bridge) {
      return mockAndroidControlService.openApplication(params);
    }

    // 2. Resolve target application package
    const resolution = applicationResolver.resolveApplication(params.appName);
    if (!resolution.isResolved || !resolution.packageName) {
      return {
        requestId,
        success: false,
        device: "android",
        action: "open_application",
        message: `Could not find an installed application matching "${params.appName}".`,
        data: { appName: params.appName },
        error: {
          code: "APP_NOT_FOUND",
          details: `Package resolution failed for app name "${params.appName}". Ensure the application is installed.`,
        },
        timestamp: Date.now(),
      };
    }

    // 3. Dispatch execution to native Android companion bridge
    try {
      const nativeResult = await bridge.openApp({
        appName: resolution.appName,
        packageName: resolution.packageName,
      });

      if (nativeResult && nativeResult.success) {
        return {
          requestId,
          success: true,
          device: "android",
          action: "open_application",
          message: nativeResult.message || `Successfully opened ${resolution.appName}.`,
          data: {
            appName: resolution.appName,
            packageName: resolution.packageName,
            resolutionSource: resolution.resolutionSource,
          },
          error: null,
          timestamp: Date.now(),
        };
      } else {
        return {
          requestId,
          success: false,
          device: "android",
          action: "open_application",
          message: nativeResult?.error || `Failed to launch ${resolution.appName}.`,
          data: {
            appName: resolution.appName,
            packageName: resolution.packageName,
          },
          error: {
            code: "APP_LAUNCH_FAILED",
            details: nativeResult?.error || "Native launchIntent returned false or threw an activity exception.",
          },
          timestamp: Date.now(),
        };
      }
    } catch (bridgeError: any) {
      console.error("[AndroidControlService] Bridge invocation exception:", bridgeError);
      return {
        requestId,
        success: false,
        device: "android",
        action: "open_application",
        message: `Failed to communicate with Android bridge: ${bridgeError?.message || "Unknown error"}`,
        data: {
          appName: resolution.appName,
          packageName: resolution.packageName,
        },
        error: {
          code: "BRIDGE_UNAVAILABLE",
          details: bridgeError?.message || "Exception during bridge openApp call.",
        },
        timestamp: Date.now(),
      };
    }
  }

  // =========================================================================
  // Future-Compatible Action Stubs (Phase 2 Placeholders)
  // All strictly return ACTION_NOT_IMPLEMENTED instead of failing silently
  // =========================================================================

  public async tap(_x: number, _y: number): Promise<DeviceActionResult> {
    return this.notImplemented("tap");
  }

  public async typeText(_text: string): Promise<DeviceActionResult> {
    return this.notImplemented("type_text");
  }

  public async swipe(_direction: "up" | "down" | "left" | "right"): Promise<DeviceActionResult> {
    return this.notImplemented("swipe");
  }

  public async scroll(_direction: "up" | "down"): Promise<DeviceActionResult> {
    return this.notImplemented("scroll");
  }

  public async pressBack(): Promise<DeviceActionResult> {
    return this.notImplemented("press_back");
  }

  public async pressHome(): Promise<DeviceActionResult> {
    return this.notImplemented("press_home");
  }

  public async readScreen(): Promise<DeviceActionResult> {
    return this.notImplemented("read_screen");
  }

  public async takeScreenshot(): Promise<DeviceActionResult> {
    return this.notImplemented("take_screenshot");
  }

  public async openUrl(_url: string): Promise<DeviceActionResult> {
    return this.notImplemented("open_url");
  }

  private notImplemented(action: DeviceAction): DeviceActionResult {
    return {
      requestId: `req_${Date.now()}_not_impl`,
      success: false,
      device: "android",
      action,
      message: `Action '${action}' is not implemented in Milestone 1.`,
      error: {
        code: "ACTION_NOT_IMPLEMENTED",
        details: `The action '${action}' is reserved for Phase 2 UI automation with Android AccessibilityService.`,
      },
      timestamp: Date.now(),
    };
  }
}

export const androidControlService = AndroidControlService.getInstance();
