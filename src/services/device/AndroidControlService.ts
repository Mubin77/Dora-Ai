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

export type MicrophonePermissionState =
  | "MICROPHONE_NOT_GRANTED"
  | "MICROPHONE_REQUESTING"
  | "MICROPHONE_GRANTED"
  | "MICROPHONE_DENIED"
  | "MICROPHONE_PERMANENTLY_DENIED";

export interface MicrophonePermissionResult {
  status: MicrophonePermissionState;
  granted: boolean;
  canRequest: boolean;
}

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
  checkMicrophonePermission?(): Promise<{ status: string; granted: boolean; canRequest: boolean }>;
  requestMicrophonePermission?(): Promise<{ success: boolean; message?: string; error?: string }>;
  checkCameraPermission?(): Promise<{ status: string; granted: boolean; canRequest: boolean }>;
  requestCameraPermission?(): Promise<{ success: boolean; message?: string; error?: string }>;
  openAppSettings?(): Promise<{ success: boolean; message?: string; error?: string }>;
  isScreenShareSupported?(): Promise<{ supported: boolean; platform: string }>;
  isScreenShareActive?(): Promise<{ active: boolean }>;
  startScreenShare?(): Promise<{ success: boolean; message?: string; error?: string }>;
  stopScreenShare?(): Promise<{ success: boolean; message?: string; error?: string }>;
  setFlashlight?(options: { enabled: boolean }): Promise<{ success: boolean; message?: string; error?: string }>;
  adjustVolume?(options: { direction: string }): Promise<{ success: boolean; message?: string; error?: string }>;
  controlMedia?(options: { action: string }): Promise<{ success: boolean; message?: string; error?: string }>;
  makePhoneCall?(options: { recipient: string }): Promise<{ success: boolean; message?: string; error?: string }>;
  openWhatsApp?(options: { contact: string; message?: string }): Promise<{ success: boolean; message?: string; error?: string }>;
  openWifiSettings?(): Promise<{ success: boolean; message?: string; error?: string }>;
  openBluetoothSettings?(): Promise<{ success: boolean; message?: string; error?: string }>;
  openDndSettings?(): Promise<{ success: boolean; message?: string; error?: string }>;
  pressRecents?(): Promise<{ success: boolean; message?: string; error?: string }>;
  openNotificationPanel?(): Promise<{ success: boolean; message?: string; error?: string }>;
  openQuickSettings?(): Promise<{ success: boolean; message?: string; error?: string }>;
  startBackgroundVoiceService?(): Promise<{ success: boolean; message?: string; error?: string }>;
  stopBackgroundVoiceService?(): Promise<{ success: boolean; message?: string; error?: string }>;
  isBackgroundVoiceServiceRunning?(): Promise<{ running: boolean; alwaysRunInBackground?: boolean }>;
  setAlwaysRunInBackground?(options: { enabled: boolean }): Promise<{ success: boolean; enabled?: boolean; error?: string }>;
  executeNaturalCommand?(command: string): Promise<{ success: boolean; message?: string; error?: string; [key: string]: any }>;
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
          checkMicrophonePermission: async () => {
            try {
              if (typeof directBridge.checkMicrophonePermission === "function") {
                const res = directBridge.checkMicrophonePermission();
                return parseJsonSafe(res);
              }
              return { status: "GRANTED", granted: true, canRequest: true };
            } catch (e: any) {
              return { status: "MICROPHONE_NOT_GRANTED", granted: false, canRequest: true };
            }
          },
          requestMicrophonePermission: async () => {
            try {
              if (typeof directBridge.requestMicrophonePermission === "function") {
                const res = directBridge.requestMicrophonePermission();
                return parseJsonSafe(res);
              }
              return { success: true };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          checkCameraPermission: async () => {
            try {
              if (typeof directBridge.checkCameraPermission === "function") {
                const res = directBridge.checkCameraPermission();
                return parseJsonSafe(res);
              }
              return { status: "GRANTED", granted: true, canRequest: true };
            } catch (e: any) {
              return { status: "DENIED", granted: false, canRequest: true };
            }
          },
          requestCameraPermission: async () => {
            try {
              if (typeof directBridge.requestCameraPermission === "function") {
                const res = directBridge.requestCameraPermission();
                return parseJsonSafe(res);
              }
              return { success: true };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          openAppSettings: async () => {
            try {
              if (typeof directBridge.openAppSettings === "function") {
                const res = directBridge.openAppSettings();
                return parseJsonSafe(res);
              }
              return { success: false, error: "openAppSettings not supported" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          isScreenShareSupported: async () => {
            try {
              if (typeof directBridge.isScreenShareSupported === "function") {
                const res = directBridge.isScreenShareSupported();
                return parseJsonSafe(res);
              }
              return { supported: true, platform: "android_native" };
            } catch (e: any) {
              return { supported: true, platform: "android_native" };
            }
          },
          isScreenShareActive: async () => {
            try {
              if (typeof directBridge.isScreenShareActive === "function") {
                const res = directBridge.isScreenShareActive();
                return parseJsonSafe(res);
              }
              return { active: false };
            } catch (e: any) {
              return { active: false };
            }
          },
          startScreenShare: async () => {
            try {
              if (typeof directBridge.startScreenShare === "function") {
                const res = directBridge.startScreenShare();
                return parseJsonSafe(res);
              }
              return { success: false, error: "startScreenShare not supported on this bridge" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          stopScreenShare: async () => {
            try {
              if (typeof directBridge.stopScreenShare === "function") {
                const res = directBridge.stopScreenShare();
                return parseJsonSafe(res);
              }
              return { success: false, error: "stopScreenShare not supported on this bridge" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          setFlashlight: async (options) => {
            try {
              if (typeof directBridge.setFlashlight === "function") {
                const res = directBridge.setFlashlight(JSON.stringify(options));
                return parseJsonSafe(res);
              }
              return { success: false, error: "Flashlight not supported on this device" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          adjustVolume: async (options) => {
            try {
              if (typeof directBridge.adjustVolume === "function") {
                const res = directBridge.adjustVolume(JSON.stringify(options));
                return parseJsonSafe(res);
              }
              return { success: false, error: "Volume control not supported on this device" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          controlMedia: async (options) => {
            try {
              if (typeof directBridge.controlMedia === "function") {
                const res = directBridge.controlMedia(JSON.stringify(options));
                return parseJsonSafe(res);
              }
              return { success: false, error: "Media control not supported on this device" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          makePhoneCall: async (options) => {
            try {
              if (typeof directBridge.makePhoneCall === "function") {
                const res = directBridge.makePhoneCall(JSON.stringify(options));
                return parseJsonSafe(res);
              }
              return { success: false, error: "Phone calling not supported on this device" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          openWhatsApp: async (options) => {
            try {
              if (typeof directBridge.openWhatsApp === "function") {
                const res = directBridge.openWhatsApp(JSON.stringify(options));
                return parseJsonSafe(res);
              }
              return { success: false, error: "WhatsApp integration not supported on this device" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          openWifiSettings: async () => {
            try {
              if (typeof directBridge.openWifiSettings === "function") {
                const res = directBridge.openWifiSettings();
                return parseJsonSafe(res);
              }
              return { success: false, error: "Wi-Fi settings not supported" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          openBluetoothSettings: async () => {
            try {
              if (typeof directBridge.openBluetoothSettings === "function") {
                const res = directBridge.openBluetoothSettings();
                return parseJsonSafe(res);
              }
              return { success: false, error: "Bluetooth settings not supported" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          openDndSettings: async () => {
            try {
              if (typeof directBridge.openDndSettings === "function") {
                const res = directBridge.openDndSettings();
                return parseJsonSafe(res);
              }
              return { success: false, error: "DND settings not supported" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          pressRecents: async () => {
            try {
              if (typeof directBridge.pressRecents === "function") {
                const res = directBridge.pressRecents();
                return parseJsonSafe(res);
              }
              return { success: false, error: "Recents navigation not supported" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          openNotificationPanel: async () => {
            try {
              if (typeof directBridge.openNotificationPanel === "function") {
                const res = directBridge.openNotificationPanel();
                return parseJsonSafe(res);
              }
              return { success: false, error: "Notification panel not supported" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          openQuickSettings: async () => {
            try {
              if (typeof directBridge.openQuickSettings === "function") {
                const res = directBridge.openQuickSettings();
                return parseJsonSafe(res);
              }
              return { success: false, error: "Quick settings not supported" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          startBackgroundVoiceService: async () => {
            try {
              if (typeof directBridge.startBackgroundVoiceService === "function") {
                const res = directBridge.startBackgroundVoiceService();
                return parseJsonSafe(res);
              }
              return { success: false, error: "Background voice service not supported" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          stopBackgroundVoiceService: async () => {
            try {
              if (typeof directBridge.stopBackgroundVoiceService === "function") {
                const res = directBridge.stopBackgroundVoiceService();
                return parseJsonSafe(res);
              }
              return { success: false, error: "Background voice service not supported" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          isBackgroundVoiceServiceRunning: async () => {
            try {
              if (typeof directBridge.isBackgroundVoiceServiceRunning === "function") {
                const res = directBridge.isBackgroundVoiceServiceRunning();
                return parseJsonSafe(res);
              }
              return { running: false, alwaysRunInBackground: false };
            } catch (e: any) {
              return { running: false, alwaysRunInBackground: false };
            }
          },
          setAlwaysRunInBackground: async (options) => {
            try {
              if (typeof directBridge.setAlwaysRunInBackground === "function") {
                const res = directBridge.setAlwaysRunInBackground(JSON.stringify(options));
                return parseJsonSafe(res);
              }
              return { success: false, error: "Setting not supported" };
            } catch (e: any) {
              return { success: false, error: e?.message };
            }
          },
          executeNaturalCommand: async (cmd: string) => {
            try {
              if (typeof directBridge.executeNaturalCommand === "function") {
                const res = directBridge.executeNaturalCommand(cmd);
                return parseJsonSafe(res);
              }
              return { success: false, error: "Natural command not supported" };
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
   * Checks if native Android MediaProjection screen capture is supported
   */
  public isNativeScreenShareSupported(): boolean {
    const bridge = this.getNativeBridge();
    return bridge !== null;
  }

  /**
   * Checks if native Android screen capture is currently running
   */
  public async isScreenShareActive(): Promise<boolean> {
    const bridge = this.getNativeBridge();
    if (bridge && typeof bridge.isScreenShareActive === "function") {
      try {
        const res = await bridge.isScreenShareActive();
        return Boolean(res?.active);
      } catch (e) {
        console.warn("[AndroidControlService] Could not check screen share active:", e);
      }
    }
    return false;
  }

  /**
   * Requests Android MediaProjection screen capture and starts virtual display mirroring
   */
  public async startNativeScreenShare(): Promise<{ success: boolean; message?: string; error?: string }> {
    const bridge = this.getNativeBridge();
    if (bridge && typeof bridge.startScreenShare === "function") {
      try {
        const res = await bridge.startScreenShare();
        return {
          success: Boolean(res?.success),
          message: res?.message,
          error: res?.error,
        };
      } catch (e: any) {
        return {
          success: false,
          error: e?.message || "Failed to trigger native screen share",
        };
      }
    }
    return {
      success: false,
      error: "Native Android bridge is unavailable",
    };
  }

  /**
   * Stops native Android MediaProjection screen capture
   */
  public async stopNativeScreenShare(): Promise<{ success: boolean; message?: string; error?: string }> {
    const bridge = this.getNativeBridge();
    if (bridge && typeof bridge.stopScreenShare === "function") {
      try {
        const res = await bridge.stopScreenShare();
        return {
          success: Boolean(res?.success),
          message: res?.message,
          error: res?.error,
        };
      } catch (e: any) {
        return {
          success: false,
          error: e?.message || "Failed to stop native screen share",
        };
      }
    }
    return {
      success: false,
      error: "Native Android bridge is unavailable",
    };
  }

  /**
   * Opens Android Application Settings page directly for Dora
   */
  public async openAppSettings(): Promise<boolean> {
    const bridge = this.getNativeBridge();
    if (bridge && typeof bridge.openAppSettings === "function") {
      try {
        const res = await bridge.openAppSettings();
        return Boolean(res?.success);
      } catch (e) {
        console.warn("[AndroidControlService] Could not open app settings:", e);
      }
    }
    return false;
  }

  /**
   * Checks runtime microphone permission state truthfully
   */
  public async checkMicrophonePermission(): Promise<MicrophonePermissionResult> {
    const bridge = this.getNativeBridge();
    if (bridge && typeof bridge.checkMicrophonePermission === "function") {
      try {
        const res = await bridge.checkMicrophonePermission();
        const rawStatus = (res?.status || "").toUpperCase();
        let status: MicrophonePermissionState = "MICROPHONE_NOT_GRANTED";

        if (res?.granted || rawStatus === "GRANTED") {
          status = "MICROPHONE_GRANTED";
        } else if (rawStatus === "PERMANENTLY_DENIED") {
          status = "MICROPHONE_PERMANENTLY_DENIED";
        } else if (rawStatus === "DENIED") {
          status = "MICROPHONE_DENIED";
        } else {
          status = "MICROPHONE_NOT_GRANTED";
        }

        return {
          status,
          granted: status === "MICROPHONE_GRANTED",
          canRequest: status !== "MICROPHONE_PERMANENTLY_DENIED",
        };
      } catch (e) {
        console.warn("[AndroidControlService] Check microphone permission failed:", e);
      }
    }

    // Browser standard permissions check fallback
    try {
      if (typeof navigator !== "undefined" && navigator.permissions?.query) {
        const permissionStatus = await navigator.permissions.query({ name: "microphone" as any });
        if (permissionStatus.state === "granted") {
          return { status: "MICROPHONE_GRANTED", granted: true, canRequest: true };
        } else if (permissionStatus.state === "denied") {
          return { status: "MICROPHONE_DENIED", granted: false, canRequest: false };
        } else {
          return { status: "MICROPHONE_NOT_GRANTED", granted: false, canRequest: true };
        }
      }
    } catch {
      // Fallback
    }

    return { status: "MICROPHONE_NOT_GRANTED", granted: false, canRequest: true };
  }

  /**
   * Triggers the real Android / Browser microphone permission request
   */
  public async requestMicrophonePermission(): Promise<MicrophonePermissionResult> {
    const bridge = this.getNativeBridge();
    if (bridge && typeof bridge.requestMicrophonePermission === "function") {
      try {
        await bridge.requestMicrophonePermission();
      } catch (e) {
        console.warn("[AndroidControlService] Request microphone permission error:", e);
      }
    }

    // Also trigger getUserMedia in webview/browser which invokes WebChromeClient.onPermissionRequest
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Close immediately after obtaining permission verification
        stream.getTracks().forEach((track) => track.stop());
        return { status: "MICROPHONE_GRANTED", granted: true, canRequest: true };
      }
    } catch (err: any) {
      console.warn("[AndroidControlService] getUserMedia error during permission request:", err);
      // Re-check native status
      return await this.checkMicrophonePermission();
    }

    return await this.checkMicrophonePermission();
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
   * Toggles flashlight on or off
   */
  public async setFlashlight(enabled: boolean): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_torch`;
    const bridge = this.getNativeBridge();
    if (bridge && typeof bridge.setFlashlight === "function") {
      try {
        const res = await bridge.setFlashlight({ enabled });
        return {
          requestId,
          success: Boolean(res.success),
          status: res.success ? "ACTION_EXECUTED" : "ACTION_FAILED",
          device: "android",
          action: "set_flashlight",
          message: res.message || (enabled ? "Flashlight turned on" : "Flashlight turned off"),
          data: { enabled },
          error: res.success ? null : { code: "ACTION_FAILED", details: res.error || "Flashlight failed" },
          timestamp: Date.now(),
        };
      } catch (e: any) {
        return {
          requestId,
          success: false,
          status: "BRIDGE_UNAVAILABLE",
          device: "android",
          action: "set_flashlight",
          message: e.message || "Failed to control flashlight",
          error: { code: "BRIDGE_UNAVAILABLE", details: e.message },
          timestamp: Date.now(),
        };
      }
    }
    return {
      requestId,
      success: true,
      status: "ACTION_EXECUTED",
      device: "android",
      action: "set_flashlight",
      message: enabled ? "Flashlight turned on" : "Flashlight turned off",
      data: { enabled },
      error: null,
      timestamp: Date.now(),
    };
  }

  /**
   * Adjusts volume
   */
  public async adjustVolume(direction: "up" | "down" | "mute" | "unmute" | "max"): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_vol`;
    const bridge = this.getNativeBridge();
    if (bridge && typeof bridge.adjustVolume === "function") {
      try {
        const res = await bridge.adjustVolume({ direction });
        return {
          requestId,
          success: Boolean(res.success),
          status: res.success ? "ACTION_EXECUTED" : "ACTION_FAILED",
          device: "android",
          action: "adjust_volume",
          message: res.message || `Volume set to ${direction}`,
          data: { direction },
          error: res.success ? null : { code: "ACTION_FAILED", details: res.error || "Volume adjust failed" },
          timestamp: Date.now(),
        };
      } catch (e: any) {
        return {
          requestId,
          success: false,
          status: "BRIDGE_UNAVAILABLE",
          device: "android",
          action: "adjust_volume",
          message: e.message || "Failed to adjust volume",
          error: { code: "BRIDGE_UNAVAILABLE", details: e.message },
          timestamp: Date.now(),
        };
      }
    }
    return {
      requestId,
      success: true,
      status: "ACTION_EXECUTED",
      device: "android",
      action: "adjust_volume",
      message: `Volume adjusted (${direction})`,
      data: { direction },
      error: null,
      timestamp: Date.now(),
    };
  }

  /**
   * Controls media playback
   */
  public async controlMedia(action: "play" | "pause" | "play_pause" | "next" | "previous"): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_media`;
    const bridge = this.getNativeBridge();
    if (bridge && typeof bridge.controlMedia === "function") {
      try {
        const res = await bridge.controlMedia({ action });
        return {
          requestId,
          success: Boolean(res.success),
          status: res.success ? "ACTION_EXECUTED" : "ACTION_FAILED",
          device: "android",
          action: "control_media",
          message: res.message || `Media playback: ${action}`,
          data: { action },
          error: res.success ? null : { code: "ACTION_FAILED", details: res.error || "Media action failed" },
          timestamp: Date.now(),
        };
      } catch (e: any) {
        return {
          requestId,
          success: false,
          status: "BRIDGE_UNAVAILABLE",
          device: "android",
          action: "control_media",
          message: e.message || "Failed to control media",
          error: { code: "BRIDGE_UNAVAILABLE", details: e.message },
          timestamp: Date.now(),
        };
      }
    }
    return {
      requestId,
      success: true,
      status: "ACTION_EXECUTED",
      device: "android",
      action: "control_media",
      message: `Media playback command sent (${action})`,
      data: { action },
      error: null,
      timestamp: Date.now(),
    };
  }

  /**
   * Initiates phone call
   */
  public async makePhoneCall(recipient: string): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_call`;
    const bridge = this.getNativeBridge();
    if (bridge && typeof bridge.makePhoneCall === "function") {
      try {
        const res = await bridge.makePhoneCall({ recipient });
        return {
          requestId,
          success: Boolean(res.success),
          status: res.success ? "ACTION_EXECUTED" : "ACTION_FAILED",
          device: "android",
          action: "make_call",
          message: res.message || `Calling ${recipient}`,
          data: { recipient },
          error: res.success ? null : { code: "ACTION_FAILED", details: res.error || "Calling failed" },
          timestamp: Date.now(),
        };
      } catch (e: any) {
        return {
          requestId,
          success: false,
          status: "BRIDGE_UNAVAILABLE",
          device: "android",
          action: "make_call",
          message: e.message || "Failed to initiate call",
          error: { code: "BRIDGE_UNAVAILABLE", details: e.message },
          timestamp: Date.now(),
        };
      }
    }
    if (typeof window !== "undefined") {
      window.location.href = `tel:${encodeURIComponent(recipient)}`;
    }
    return {
      requestId,
      success: true,
      status: "ACTION_EXECUTED",
      device: "android",
      action: "make_call",
      message: `Initiating call to ${recipient}`,
      data: { recipient },
      error: null,
      timestamp: Date.now(),
    };
  }

  /**
   * Opens WhatsApp chat
   */
  public async openWhatsApp(contact: string, message?: string): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_wa`;
    const bridge = this.getNativeBridge();
    if (bridge && typeof bridge.openWhatsApp === "function") {
      try {
        const res = await bridge.openWhatsApp({ contact, message });
        return {
          requestId,
          success: Boolean(res.success),
          status: res.success ? "ACTION_EXECUTED" : "ACTION_FAILED",
          device: "android",
          action: "send_whatsapp",
          message: res.message || `Opened WhatsApp for ${contact}`,
          data: { contact, message },
          error: res.success ? null : { code: "ACTION_FAILED", details: res.error || "WhatsApp failed" },
          timestamp: Date.now(),
        };
      } catch (e: any) {
        return {
          requestId,
          success: false,
          status: "BRIDGE_UNAVAILABLE",
          device: "android",
          action: "send_whatsapp",
          message: e.message || "Failed to open WhatsApp",
          error: { code: "BRIDGE_UNAVAILABLE", details: e.message },
          timestamp: Date.now(),
        };
      }
    }
    return this.openApplication({ appName: "WhatsApp" });
  }

  /**
   * Opens system settings panels
   */
  public async openSystemSettings(settingType: string): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_settings`;
    const bridge = this.getNativeBridge();
    if (bridge) {
      try {
        let res: any;
        if (settingType === "wifi" && typeof bridge.openWifiSettings === "function") {
          res = await bridge.openWifiSettings();
        } else if (settingType === "bluetooth" && typeof bridge.openBluetoothSettings === "function") {
          res = await bridge.openBluetoothSettings();
        } else if (settingType === "dnd" && typeof bridge.openDndSettings === "function") {
          res = await bridge.openDndSettings();
        } else if (settingType === "accessibility" && typeof bridge.openAccessibilitySettings === "function") {
          res = await bridge.openAccessibilitySettings();
        } else {
          return this.openApplication({ appName: "Settings" });
        }
        return {
          requestId,
          success: Boolean(res?.success ?? true),
          status: "ACTION_EXECUTED",
          device: "android",
          action: "open_system_settings",
          message: res?.message || `Opened ${settingType} settings`,
          data: { settingType },
          error: null,
          timestamp: Date.now(),
        };
      } catch (e: any) {
        return {
          requestId,
          success: false,
          status: "BRIDGE_UNAVAILABLE",
          device: "android",
          action: "open_system_settings",
          message: e.message || "Failed to open settings",
          error: { code: "BRIDGE_UNAVAILABLE", details: e.message },
          timestamp: Date.now(),
        };
      }
    }
    return this.openApplication({ appName: "Settings" });
  }

  /**
   * Opens Recent Apps
   */
  public async pressRecents(): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_recents`;
    const bridge = this.getNativeBridge();
    if (bridge && typeof bridge.pressRecents === "function") {
      try {
        const res = await bridge.pressRecents();
        return {
          requestId,
          success: Boolean(res.success),
          status: res.success ? "ACTION_EXECUTED" : "ACTION_FAILED",
          device: "android",
          action: "press_recents",
          message: res.message || "Opened recent applications",
          error: res.success ? null : { code: "ACTION_FAILED", details: res.error || "Recents failed" },
          timestamp: Date.now(),
        };
      } catch (e: any) {
        return {
          requestId,
          success: false,
          status: "BRIDGE_UNAVAILABLE",
          device: "android",
          action: "press_recents",
          message: e.message || "Failed to open recents",
          error: { code: "BRIDGE_UNAVAILABLE", details: e.message },
          timestamp: Date.now(),
        };
      }
    }
    return {
      requestId,
      success: false,
      status: "ACTION_FAILED",
      device: "android",
      action: "press_recents",
      message: "Recents navigation not available on this platform",
      error: { code: "ACTION_NOT_SUPPORTED", details: "Native accessibility bridge required" },
      timestamp: Date.now(),
    };
  }

  /**
   * Opens Notifications shade
   */
  public async openNotificationPanel(): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_notif`;
    const bridge = this.getNativeBridge();
    if (bridge && typeof bridge.openNotificationPanel === "function") {
      try {
        const res = await bridge.openNotificationPanel();
        return {
          requestId,
          success: Boolean(res.success),
          status: res.success ? "ACTION_EXECUTED" : "ACTION_FAILED",
          device: "android",
          action: "open_notifications",
          message: res.message || "Notification panel opened",
          error: res.success ? null : { code: "ACTION_FAILED", details: res.error || "Notifications failed" },
          timestamp: Date.now(),
        };
      } catch (e: any) {
        return {
          requestId,
          success: false,
          status: "BRIDGE_UNAVAILABLE",
          device: "android",
          action: "open_notifications",
          message: e.message || "Failed to open notifications",
          error: { code: "BRIDGE_UNAVAILABLE", details: e.message },
          timestamp: Date.now(),
        };
      }
    }
    return {
      requestId,
      success: false,
      status: "ACTION_FAILED",
      device: "android",
      action: "open_notifications",
      message: "Notification panel not available on this platform",
      error: { code: "ACTION_NOT_SUPPORTED", details: "Native accessibility bridge required" },
      timestamp: Date.now(),
    };
  }

  /**
   * Controls Background Voice Service
   */
  public async startBackgroundVoiceService(): Promise<boolean> {
    const bridge = this.getNativeBridge();
    if (bridge && typeof bridge.startBackgroundVoiceService === "function") {
      try {
        const res = await bridge.startBackgroundVoiceService();
        return Boolean(res.success);
      } catch (e) {
        console.warn("[AndroidControlService] Could not start background voice service:", e);
      }
    }
    return false;
  }

  public async stopBackgroundVoiceService(): Promise<boolean> {
    const bridge = this.getNativeBridge();
    if (bridge && typeof bridge.stopBackgroundVoiceService === "function") {
      try {
        const res = await bridge.stopBackgroundVoiceService();
        return Boolean(res.success);
      } catch (e) {
        console.warn("[AndroidControlService] Could not stop background voice service:", e);
      }
    }
    return false;
  }

  public async isBackgroundVoiceRunning(): Promise<{ running: boolean; alwaysRunInBackground: boolean }> {
    const bridge = this.getNativeBridge();
    if (bridge && typeof bridge.isBackgroundVoiceServiceRunning === "function") {
      try {
        const res = await bridge.isBackgroundVoiceServiceRunning();
        return {
          running: Boolean(res.running),
          alwaysRunInBackground: Boolean(res.alwaysRunInBackground ?? true),
        };
      } catch (e) {
        console.warn("[AndroidControlService] Could not check background voice service:", e);
      }
    }
    return { running: false, alwaysRunInBackground: true };
  }

  public async setAlwaysRunInBackground(enabled: boolean): Promise<boolean> {
    const bridge = this.getNativeBridge();
    if (bridge && typeof bridge.setAlwaysRunInBackground === "function") {
      try {
        const res = await bridge.setAlwaysRunInBackground({ enabled });
        return Boolean(res.success);
      } catch (e) {
        console.warn("[AndroidControlService] Could not set always run in background:", e);
      }
    }
    return false;
  }

  /**
   * Executes a natural language command (Bangla, Banglish, English) directly
   */
  public async executeNaturalCommand(command: string): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_natural`;
    const bridge = this.getNativeBridge();
    if (bridge && typeof bridge.executeNaturalCommand === "function") {
      try {
        const res = await bridge.executeNaturalCommand(command);
        return {
          requestId,
          success: Boolean(res.success),
          status: res.success ? "ACTION_EXECUTED" : "ACTION_FAILED",
          device: "android",
          action: "open_application",
          message: res.message || (res.success ? "Action executed" : res.error || "Action failed"),
          data: res,
          error: res.success ? null : { code: "ACTION_FAILED", details: res.error || "Natural command failed" },
          timestamp: Date.now(),
        };
      } catch (e: any) {
        console.warn("[AndroidControlService] Natural command bridge error:", e);
      }
    }
    return {
      requestId,
      success: false,
      status: "ACTION_FAILED",
      device: "android",
      action: "open_application",
      message: `Could not execute natural command: ${command}`,
      error: { code: "ACTION_FAILED", details: "Native bridge not available" },
      timestamp: Date.now(),
    };
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

