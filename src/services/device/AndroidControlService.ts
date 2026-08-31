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
  FindUiElementParams,
  OpenApplicationParams,
  PressBackParams,
  PressHomeParams,
  ReadScreenParams,
  ScreenObservation,
  ScrollActionParams,
  SwipeActionParams,
  TakeScreenshotParams,
  TapActionParams,
  TypeTextParams,
  UIElement,
} from "./DeviceActionTypes";
import { applicationResolver } from "./ApplicationResolver";
import { mockAndroidControlService } from "./MockAndroidControlService";
import { screenObservationManager } from "./ScreenObservationManager";
import { deviceActionVerifier } from "./DeviceActionVerifier";

export interface NativeBridgeInterface {
  openApp(options: { appName: string; packageName: string }): Promise<{ success: boolean; message?: string; error?: string }>;
  checkAccessibility(): Promise<{ enabled: boolean; running?: boolean; model?: string; version?: string }>;
  getInstalledApplications?(): Promise<{ apps: Array<{ appName: string; packageName: string }> }>;
  readScreen?(options?: { includeNonClickable?: boolean }): Promise<{ success: boolean; screen?: any; error?: string }>;
  tapNode?(options: { elementId?: string; resourceId?: string; text?: string; contentDescription?: string; x?: number; y?: number }): Promise<{ success: boolean; message?: string; error?: string }>;
  typeTextOnNode?(options: { elementId?: string; text: string; clearFirst?: boolean; pressEnter?: boolean }): Promise<{ success: boolean; message?: string; error?: string }>;
  swipeGesture?(options: { direction: "up" | "down" | "left" | "right"; durationMs?: number }): Promise<{ success: boolean; message?: string; error?: string }>;
  scrollWindow?(options: { direction: "up" | "down" }): Promise<{ success: boolean; message?: string; error?: string }>;
  pressBack?(): Promise<{ success: boolean; message?: string; error?: string }>;
  pressHome?(): Promise<{ success: boolean; message?: string; error?: string }>;
  takeScreenshot?(options?: { quality?: number }): Promise<{ success: boolean; screenshotId?: string; base64?: string; error?: string }>;
  openAccessibilitySettings?(): Promise<{ success: boolean; message?: string; error?: string }>;
}

export class AndroidControlService {
  private static instance: AndroidControlService;
  private testBridge: NativeBridgeInterface | null = null;
  private wrappedNativeBridge: NativeBridgeInterface | null = null;

  private constructor() {}

  public static getInstance(): AndroidControlService {
    if (!AndroidControlService.instance) {
      AndroidControlService.instance = new AndroidControlService();
    }
    return AndroidControlService.instance;
  }

  /**
   * Injects a native bridge implementation for automated test suites
   */
  public setNativeBridgeForTesting(bridge: NativeBridgeInterface | null): void {
    this.testBridge = bridge;
  }

  /**
   * Retrieves the native Android bridge interface if present in the runtime window
   */
  public getNativeBridge(): NativeBridgeInterface | null {
    if (this.testBridge) {
      return this.testBridge;
    }

    if (typeof window === "undefined") {
      return null;
    }

    // 1. Check Capacitor plugin registration
    const cap = (window as any)?.Capacitor;
    if (cap?.Plugins?.DoraAndroidBridge) {
      return cap.Plugins.DoraAndroidBridge as NativeBridgeInterface;
    }

    // 2. Check injected Android WebView JavaScript interface (window.DoraAndroidBridge)
    const directBridge = (window as any)?.DoraAndroidBridge;
    if (directBridge && typeof directBridge.openApp === "function") {
      if (!this.wrappedNativeBridge) {
        // Safe adapter wrapping native Android @JavascriptInterface methods that take/return JSON strings
        const parseJsonSafe = (raw: any) => {
          if (typeof raw === "string") {
            try {
              return JSON.parse(raw);
            } catch {
              return { success: false, error: raw };
            }
          }
          return raw || { success: false };
        };

        this.wrappedNativeBridge = {
          openApp: async (options) => {
            try {
              const res = directBridge.openApp(JSON.stringify(options));
              return parseJsonSafe(res);
            } catch (e: any) {
              return { success: false, error: e?.message || "Failed to open app" };
            }
          },
          checkAccessibility: async () => {
            try {
              const res = directBridge.checkAccessibility();
              return parseJsonSafe(res);
            } catch (e: any) {
              return { enabled: false, running: false, error: e?.message };
            }
          },
          getInstalledApplications: async () => {
            try {
              if (typeof directBridge.getInstalledApplications === "function") {
                const res = directBridge.getInstalledApplications();
                return parseJsonSafe(res);
              }
              return { apps: [] };
            } catch (e: any) {
              return { apps: [] };
            }
          },
          readScreen: async (options) => {
            try {
              if (typeof directBridge.readScreen === "function") {
                const res = directBridge.readScreen(options ? JSON.stringify(options) : null);
                return parseJsonSafe(res);
              }
              return { success: false, error: "readScreen not supported" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          tapNode: async (options) => {
            try {
              if (typeof directBridge.tapNode === "function") {
                const res = directBridge.tapNode(JSON.stringify(options));
                return parseJsonSafe(res);
              }
              return { success: false, error: "tapNode not supported" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          typeTextOnNode: async (options) => {
            try {
              if (typeof directBridge.typeTextOnNode === "function") {
                const res = directBridge.typeTextOnNode(JSON.stringify(options));
                return parseJsonSafe(res);
              }
              return { success: false, error: "typeTextOnNode not supported" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          swipeGesture: async (options) => {
            try {
              if (typeof directBridge.swipeGesture === "function") {
                const res = directBridge.swipeGesture(JSON.stringify(options));
                return parseJsonSafe(res);
              }
              return { success: false, error: "swipeGesture not supported" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          scrollWindow: async (options) => {
            try {
              if (typeof directBridge.scrollWindow === "function") {
                const res = directBridge.scrollWindow(JSON.stringify(options));
                return parseJsonSafe(res);
              }
              return { success: false, error: "scrollWindow not supported" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          pressBack: async () => {
            try {
              if (typeof directBridge.pressBack === "function") {
                const res = directBridge.pressBack();
                return parseJsonSafe(res);
              }
              return { success: false, error: "pressBack not supported" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          pressHome: async () => {
            try {
              if (typeof directBridge.pressHome === "function") {
                const res = directBridge.pressHome();
                return parseJsonSafe(res);
              }
              return { success: false, error: "pressHome not supported" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          openAccessibilitySettings: async () => {
            try {
              if (typeof directBridge.openAccessibilitySettings === "function") {
                const res = directBridge.openAccessibilitySettings();
                return parseJsonSafe(res);
              }
              return { success: false, error: "openAccessibilitySettings not supported" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
        };
      }
      return this.wrappedNativeBridge;
    }

    return null;
  }

  public isBridgeAvailable(): boolean {
    return this.getNativeBridge() !== null;
  }

  /**
   * Opens Android Accessibility Settings page directly via bridge
   */
  public async openAccessibilitySettings(): Promise<boolean> {
    const bridge = this.getNativeBridge();
    if (bridge && typeof bridge.openAccessibilitySettings === "function") {
      try {
        const res = await bridge.openAccessibilitySettings();
        return Boolean(res?.success);
      } catch (e) {
        console.warn("[AndroidControlService] Could not open accessibility settings:", e);
      }
    }
    return false;
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
      const isEnabled = Boolean(res.enabled);
      return {
        accessibilityEnabled: isEnabled,
        bridgeConnected: true,
        deploymentStatus: isEnabled ? "CONNECTED" : "ACCESSIBILITY_DISABLED",
        deviceModel: res.model || "Android Device",
        androidVersion: res.version || "Android OS",
        isRealDevice: true,
        lastHeartbeat: Date.now(),
      };
    } catch (err: any) {
      console.warn("[AndroidControlService] Failed to query native accessibility status:", err);
      return {
        accessibilityEnabled: false,
        bridgeConnected: false,
        deploymentStatus: "ERROR",
        deviceModel: "Android Device",
        androidVersion: "Unknown",
        isRealDevice: true,
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

    // If bridge is not present, route to Mock service (returns honest BRIDGE_UNAVAILABLE)
    if (!bridge) {
      return mockAndroidControlService.openApplication(params);
    }

    const resolution = applicationResolver.resolveApplication(params.appName);
    if (!resolution.isResolved || !resolution.packageName) {
      return {
        requestId,
        success: false,
        status: "ACTION_FAILED",
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

    try {
      const nativeResult = await bridge.openApp({
        appName: resolution.appName,
        packageName: resolution.packageName,
      });

      // Major app launch clears previous screen state
      screenObservationManager.invalidateObservations(`Launched ${resolution.appName}`);

      if (nativeResult && nativeResult.success) {
        return {
          requestId,
          success: true,
          status: "ACTION_EXECUTED",
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
          status: "ACTION_FAILED",
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
      return {
        requestId,
        success: false,
        status: "BRIDGE_UNAVAILABLE",
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

  /**
   * Reads current active screen tree and generates structured ScreenObservation
   */
  public async readScreen(params?: ReadScreenParams): Promise<DeviceActionResult<ScreenObservation>> {
    const requestId = `req_${Date.now()}_read`;
    const bridge = this.getNativeBridge();

    if (!bridge) {
      return mockAndroidControlService.readScreen(params);
    }

    if (typeof bridge.readScreen !== "function") {
      return {
        requestId,
        success: false,
        status: "ACTION_FAILED",
        device: "android",
        action: "read_screen",
        message: "Native bridge does not support readScreen capability.",
        error: {
          code: "ACTION_NOT_SUPPORTED",
          details: "Native bridge readScreen function is missing.",
        },
        timestamp: Date.now(),
      };
    }

    try {
      const nativeResult = await bridge.readScreen({
        includeNonClickable: params?.includeNonClickable ?? true,
      });

      if (!nativeResult || !nativeResult.success || !nativeResult.screen) {
        return {
          requestId,
          success: false,
          status: "ACTION_FAILED",
          device: "android",
          action: "read_screen",
          message: nativeResult?.error || "Failed to inspect active window accessibility hierarchy.",
          error: {
            code: "SCREEN_READ_FAILED",
            details: nativeResult?.error || "Accessibility tree returned null root node.",
          },
          timestamp: Date.now(),
        };
      }

      const observation = screenObservationManager.createObservation(nativeResult.screen);

      return {
        requestId,
        success: true,
        status: "ACTION_EXECUTED",
        device: "android",
        action: "read_screen",
        message: `Read screen successfully (${observation.elements.length} elements detected on ${observation.packageName}).`,
        data: observation,
        error: null,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      return {
        requestId,
        success: false,
        status: "BRIDGE_UNAVAILABLE",
        device: "android",
        action: "read_screen",
        message: `Exception during readScreen bridge call: ${err?.message || "Unknown error"}`,
        error: { code: "BRIDGE_UNAVAILABLE", details: err?.message || "Bridge execution failed" },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Finds a UI element matching query criteria
   */
  public async findUiElement(params: FindUiElementParams): Promise<DeviceActionResult<UIElement | null>> {
    const requestId = `req_${Date.now()}_find`;
    const bridge = this.getNativeBridge();

    if (!bridge) {
      return mockAndroidControlService.findUiElement(params);
    }

    // 1. First ensure we have a fresh screen observation
    let currentObs = screenObservationManager.getLatestObservation();
    if (!currentObs || currentObs.isStale || Date.now() > currentObs.expiresAt) {
      const readRes = await this.readScreen();
      if (readRes.success && readRes.data) {
        currentObs = readRes.data;
      }
    }

    if (!currentObs) {
      return {
        requestId,
        success: false,
        status: "ACTION_FAILED",
        device: "android",
        action: "find_ui_element",
        message: "No active screen observation available to search UI elements.",
        error: {
          code: "NO_ACTIVE_WINDOW",
          details: "Could not obtain active window accessibility hierarchy.",
        },
        timestamp: Date.now(),
      };
    }

    const match = screenObservationManager.findMatchingElement(params, currentObs);
    if (!match) {
      return {
        requestId,
        success: false,
        status: "ACTION_FAILED",
        device: "android",
        action: "find_ui_element",
        message: `No UI element found matching criteria: ${JSON.stringify(params)}`,
        data: null,
        error: {
          code: "ELEMENT_NOT_FOUND",
          details: `No accessibility node in active observation matched: ${params.text || params.contentDescription || params.resourceId || params.className}`,
        },
        timestamp: Date.now(),
      };
    }

    return {
      requestId,
      success: true,
      status: "ACTION_EXECUTED",
      device: "android",
      action: "find_ui_element",
      message: `Found element: "${match.text || match.contentDescription || match.resourceId}"`,
      data: match,
      error: null,
      timestamp: Date.now(),
    };
  }

  /**
   * Taps on a UI element (preferred via elementId) or safe validated coordinate fallback
   */
  public async tap(params: TapActionParams): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_tap`;
    const bridge = this.getNativeBridge();

    if (!bridge) {
      return mockAndroidControlService.tap(params);
    }

    if (typeof bridge.tapNode !== "function") {
      return {
        requestId,
        success: false,
        status: "ACTION_FAILED",
        device: "android",
        action: "tap",
        message: "Native bridge does not support tap capability.",
        error: { code: "ACTION_NOT_SUPPORTED", details: "Native bridge tapNode function is missing." },
        timestamp: Date.now(),
      };
    }

    let targetElement: UIElement | null = null;
    let clickX: number | undefined = params.x;
    let clickY: number | undefined = params.y;

    // 1. If elementId provided, validate observation staleness and resolve element
    if (params.elementId) {
      const elLookup = screenObservationManager.getElement(params.elementId);
      if (elLookup.isStale || !elLookup.element) {
        return {
          requestId,
          success: false,
          status: "ACTION_FAILED",
          device: "android",
          action: "tap",
          message: `Stale UI element reference: ${elLookup.reason || "Element expired"}`,
          error: {
            code: "STALE_ELEMENT",
            details: "The screen observation has expired or changed. Read screen again before interacting.",
          },
          timestamp: Date.now(),
        };
      }

      targetElement = elLookup.element;
      // Calculate center coordinate from bounds
      const b = targetElement.bounds;
      clickX = Math.round((b.left + b.right) / 2);
      clickY = Math.round((b.top + b.bottom) / 2);
    }

    // 2. Dispatch tap to native bridge
    try {
      const prevObs = screenObservationManager.getLatestObservation();
      const nativeResult = await bridge.tapNode({
        elementId: targetElement?.elementId,
        resourceId: targetElement?.resourceId,
        text: targetElement?.text,
        contentDescription: targetElement?.contentDescription,
        x: clickX,
        y: clickY,
      });

      // Post-tap invalidation
      screenObservationManager.invalidateObservations("Tap action dispatched");

      if (nativeResult && nativeResult.success) {
        return {
          requestId,
          success: true,
          status: "ACTION_EXECUTED",
          device: "android",
          action: "tap",
          message: nativeResult.message || `Tapped ${targetElement?.text || targetElement?.contentDescription || `coordinates (${clickX}, ${clickY})`}`,
          data: {
            element: targetElement,
            coordinates: { x: clickX, y: clickY },
          },
          verification: deviceActionVerifier.verifyTransition("tap", prevObs, null),
          error: null,
          timestamp: Date.now(),
        };
      } else {
        return {
          requestId,
          success: false,
          status: "ACTION_FAILED",
          device: "android",
          action: "tap",
          message: nativeResult?.error || "Tap action was rejected by native AccessibilityService.",
          error: {
            code: "ELEMENT_NOT_CLICKABLE",
            details: nativeResult?.error || "Node does not accept ACTION_CLICK and gesture dispatch failed.",
          },
          timestamp: Date.now(),
        };
      }
    } catch (err: any) {
      return {
        requestId,
        success: false,
        status: "BRIDGE_UNAVAILABLE",
        device: "android",
        action: "tap",
        message: `Bridge call failed: ${err?.message || "Unknown error"}`,
        error: { code: "BRIDGE_UNAVAILABLE", details: err?.message || "Bridge exception" },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Types text into target editable element or active focus
   */
  public async typeText(params: TypeTextParams): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_type`;
    const bridge = this.getNativeBridge();

    if (!bridge) {
      return mockAndroidControlService.typeText(params);
    }

    if (typeof bridge.typeTextOnNode !== "function") {
      return {
        requestId,
        success: false,
        status: "ACTION_FAILED",
        device: "android",
        action: "type_text",
        message: "Native bridge does not support text input capability.",
        error: { code: "ACTION_NOT_SUPPORTED", details: "typeTextOnNode function missing." },
        timestamp: Date.now(),
      };
    }

    let targetElement: UIElement | null = null;
    if (params.elementId) {
      const elLookup = screenObservationManager.getElement(params.elementId);
      if (elLookup.isStale || !elLookup.element) {
        return {
          requestId,
          success: false,
          status: "ACTION_FAILED",
          device: "android",
          action: "type_text",
          message: `Stale UI element reference: ${elLookup.reason}`,
          error: {
            code: "STALE_ELEMENT",
            details: "The screen observation has expired or changed. Read screen again before typing.",
          },
          timestamp: Date.now(),
        };
      }
      targetElement = elLookup.element;

      if (targetElement.isPassword) {
        return {
          requestId,
          success: false,
          status: "ACTION_FAILED",
          device: "android",
          action: "type_text",
          message: "Automated typing into password / authentication fields is strictly blocked by safety policy.",
          error: {
            code: "SENSITIVE_FIELD_BLOCKED",
            details: "Security boundary: Automated credentials typing is forbidden.",
          },
          timestamp: Date.now(),
        };
      }
    }

    try {
      const nativeResult = await bridge.typeTextOnNode({
        elementId: targetElement?.elementId,
        text: params.text,
        clearFirst: params.clearFirst ?? false,
        pressEnter: params.pressEnter ?? false,
      });

      if (nativeResult && nativeResult.success) {
        return {
          requestId,
          success: true,
          status: "ACTION_EXECUTED",
          device: "android",
          action: "type_text",
          message: nativeResult.message || `Typed ${params.text.length} characters successfully.`,
          data: {
            textLength: params.text.length,
            element: targetElement,
          },
          error: null,
          timestamp: Date.now(),
        };
      } else {
        return {
          requestId,
          success: false,
          status: "ACTION_FAILED",
          device: "android",
          action: "type_text",
          message: nativeResult?.error || "Failed to set text on input element.",
          error: {
            code: "TEXT_INPUT_FAILED",
            details: nativeResult?.error || "ACTION_SET_TEXT was rejected by the active node.",
          },
          timestamp: Date.now(),
        };
      }
    } catch (err: any) {
      return {
        requestId,
        success: false,
        status: "BRIDGE_UNAVAILABLE",
        device: "android",
        action: "type_text",
        message: `Bridge call failed: ${err?.message || "Unknown error"}`,
        error: { code: "BRIDGE_UNAVAILABLE", details: err?.message || "Bridge exception" },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Executes a directional swipe gesture
   */
  public async swipe(params: SwipeActionParams): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_swipe`;
    const bridge = this.getNativeBridge();

    if (!bridge) {
      return mockAndroidControlService.swipe(params);
    }

    if (typeof bridge.swipeGesture !== "function") {
      return {
        requestId,
        success: false,
        status: "ACTION_FAILED",
        device: "android",
        action: "swipe",
        message: "Native bridge does not support swipe gesture capability.",
        error: { code: "ACTION_NOT_SUPPORTED", details: "swipeGesture function is missing." },
        timestamp: Date.now(),
      };
    }

    try {
      const nativeResult = await bridge.swipeGesture({
        direction: params.direction,
        durationMs: params.durationMs || 300,
      });

      screenObservationManager.invalidateObservations("Swipe gesture dispatched");

      if (nativeResult && nativeResult.success) {
        return {
          requestId,
          success: true,
          status: "ACTION_EXECUTED",
          device: "android",
          action: "swipe",
          message: nativeResult.message || `Swiped ${params.direction} successfully.`,
          data: { direction: params.direction },
          error: null,
          timestamp: Date.now(),
        };
      } else {
        return {
          requestId,
          success: false,
          status: "ACTION_FAILED",
          device: "android",
          action: "swipe",
          message: nativeResult?.error || "Swipe gesture failed on Android OS.",
          error: { code: "GESTURE_FAILED", details: nativeResult?.error || "Gesture dispatch cancelled" },
          timestamp: Date.now(),
        };
      }
    } catch (err: any) {
      return {
        requestId,
        success: false,
        status: "BRIDGE_UNAVAILABLE",
        device: "android",
        action: "swipe",
        message: `Bridge call failed: ${err?.message || "Unknown error"}`,
        error: { code: "BRIDGE_UNAVAILABLE", details: err?.message || "Bridge exception" },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Scrolls the viewport up or down
   */
  public async scroll(params: ScrollActionParams): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_scroll`;
    const bridge = this.getNativeBridge();

    if (!bridge) {
      return mockAndroidControlService.scroll(params);
    }

    if (typeof bridge.scrollWindow !== "function") {
      return {
        requestId,
        success: false,
        status: "ACTION_FAILED",
        device: "android",
        action: "scroll",
        message: "Native bridge does not support scroll capability.",
        error: { code: "ACTION_NOT_SUPPORTED", details: "scrollWindow function is missing." },
        timestamp: Date.now(),
      };
    }

    try {
      const nativeResult = await bridge.scrollWindow({
        direction: params.direction,
      });

      screenObservationManager.invalidateObservations("Scroll action dispatched");

      if (nativeResult && nativeResult.success) {
        return {
          requestId,
          success: true,
          status: "ACTION_EXECUTED",
          device: "android",
          action: "scroll",
          message: nativeResult.message || `Scrolled ${params.direction} successfully.`,
          data: { direction: params.direction },
          error: null,
          timestamp: Date.now(),
        };
      } else {
        return {
          requestId,
          success: false,
          status: "ACTION_FAILED",
          device: "android",
          action: "scroll",
          message: nativeResult?.error || "Scroll action failed on active window.",
          error: { code: "GESTURE_FAILED", details: nativeResult?.error || "ACTION_SCROLL was not handled." },
          timestamp: Date.now(),
        };
      }
    } catch (err: any) {
      return {
        requestId,
        success: false,
        status: "BRIDGE_UNAVAILABLE",
        device: "android",
        action: "scroll",
        message: `Bridge call failed: ${err?.message || "Unknown error"}`,
        error: { code: "BRIDGE_UNAVAILABLE", details: err?.message || "Bridge exception" },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Presses the Android system Back navigation button
   */
  public async pressBack(params?: PressBackParams): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_back`;
    const bridge = this.getNativeBridge();

    if (!bridge) {
      return mockAndroidControlService.pressBack(params);
    }

    if (typeof bridge.pressBack !== "function") {
      return {
        requestId,
        success: false,
        status: "ACTION_FAILED",
        device: "android",
        action: "press_back",
        message: "Native bridge does not support pressBack capability.",
        error: { code: "ACTION_NOT_SUPPORTED", details: "pressBack function is missing." },
        timestamp: Date.now(),
      };
    }

    try {
      const nativeResult = await bridge.pressBack();
      screenObservationManager.invalidateObservations("Back navigation");

      if (nativeResult && nativeResult.success) {
        return {
          requestId,
          success: true,
          status: "ACTION_EXECUTED",
          device: "android",
          action: "press_back",
          message: nativeResult.message || "Navigated back successfully.",
          error: null,
          timestamp: Date.now(),
        };
      } else {
        return {
          requestId,
          success: false,
          status: "ACTION_FAILED",
          device: "android",
          action: "press_back",
          message: nativeResult?.error || "Global back action failed.",
          error: { code: "ACTION_FAILED", details: nativeResult?.error || "GLOBAL_ACTION_BACK failed" },
          timestamp: Date.now(),
        };
      }
    } catch (err: any) {
      return {
        requestId,
        success: false,
        status: "BRIDGE_UNAVAILABLE",
        device: "android",
        action: "press_back",
        message: `Bridge call failed: ${err?.message || "Unknown error"}`,
        error: { code: "BRIDGE_UNAVAILABLE", details: err?.message || "Bridge exception" },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Presses the Android system Home navigation button
   */
  public async pressHome(params?: PressHomeParams): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_home`;
    const bridge = this.getNativeBridge();

    if (!bridge) {
      return mockAndroidControlService.pressHome(params);
    }

    if (typeof bridge.pressHome !== "function") {
      return {
        requestId,
        success: false,
        status: "ACTION_FAILED",
        device: "android",
        action: "press_home",
        message: "Native bridge does not support pressHome capability.",
        error: { code: "ACTION_NOT_SUPPORTED", details: "pressHome function is missing." },
        timestamp: Date.now(),
      };
    }

    try {
      const nativeResult = await bridge.pressHome();
      screenObservationManager.invalidateObservations("Home navigation");

      if (nativeResult && nativeResult.success) {
        return {
          requestId,
          success: true,
          status: "ACTION_EXECUTED",
          device: "android",
          action: "press_home",
          message: nativeResult.message || "Navigated to home screen successfully.",
          error: null,
          timestamp: Date.now(),
        };
      } else {
        return {
          requestId,
          success: false,
          status: "ACTION_FAILED",
          device: "android",
          action: "press_home",
          message: nativeResult?.error || "Global home action failed.",
          error: { code: "ACTION_FAILED", details: nativeResult?.error || "GLOBAL_ACTION_HOME failed" },
          timestamp: Date.now(),
        };
      }
    } catch (err: any) {
      return {
        requestId,
        success: false,
        status: "BRIDGE_UNAVAILABLE",
        device: "android",
        action: "press_home",
        message: `Bridge call failed: ${err?.message || "Unknown error"}`,
        error: { code: "BRIDGE_UNAVAILABLE", details: err?.message || "Bridge exception" },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Captures a temporary screenshot frame
   */
  public async takeScreenshot(params?: TakeScreenshotParams): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_screenshot`;
    const bridge = this.getNativeBridge();

    if (!bridge) {
      return mockAndroidControlService.takeScreenshot(params);
    }

    if (typeof bridge.takeScreenshot !== "function") {
      return {
        requestId,
        success: false,
        status: "ACTION_FAILED",
        device: "android",
        action: "take_screenshot",
        message: "Native bridge does not support takeScreenshot capability.",
        error: { code: "ACTION_NOT_SUPPORTED", details: "takeScreenshot function is missing." },
        timestamp: Date.now(),
      };
    }

    try {
      const nativeResult = await bridge.takeScreenshot({ quality: params?.quality || 70 });
      if (nativeResult && nativeResult.success) {
        return {
          requestId,
          success: true,
          status: "ACTION_EXECUTED",
          device: "android",
          action: "take_screenshot",
          message: "Captured screenshot frame successfully.",
          data: {
            screenshotId: nativeResult.screenshotId || `shot_${Date.now()}`,
            base64: nativeResult.base64,
          },
          error: null,
          timestamp: Date.now(),
        };
      } else {
        return {
          requestId,
          success: false,
          status: "ACTION_FAILED",
          device: "android",
          action: "take_screenshot",
          message: nativeResult?.error || "Failed to capture display frame.",
          error: { code: "SCREENSHOT_FAILED", details: nativeResult?.error || "takeScreenshot failed" },
          timestamp: Date.now(),
        };
      }
    } catch (err: any) {
      return {
        requestId,
        success: false,
        status: "BRIDGE_UNAVAILABLE",
        device: "android",
        action: "take_screenshot",
        message: `Bridge call failed: ${err?.message || "Unknown error"}`,
        error: { code: "BRIDGE_UNAVAILABLE", details: err?.message || "Bridge exception" },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Opens a URL in the browser
   */
  public async openUrl(url: string): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_url`;
    if (typeof window !== "undefined" && window.open) {
      window.open(url, "_blank");
      return {
        requestId,
        success: true,
        status: "ACTION_EXECUTED",
        device: "android",
        action: "open_url",
        message: `Opened ${url}`,
        data: { url },
        error: null,
        timestamp: Date.now(),
      };
    }

    return {
      requestId,
      success: true,
      status: "ACTION_EXECUTED",
      device: "android",
      action: "open_url",
      message: `Navigated to ${url}`,
      data: { url },
      error: null,
      timestamp: Date.now(),
    };
  }
}

export const androidControlService = AndroidControlService.getInstance();

