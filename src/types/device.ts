/**
 * Dora Device Control - Type Definitions
 * 
 * Defines strongly typed models for device identity, supported actions,
 * execution requests, safety levels, and structured results.
 */

export type DeviceType = "android" | "pc";

export type DevicePlatform = "android" | "web" | "desktop";

export type DeviceAction =
  | "open_application"   // Implemented in Milestone 1
  | "tap"                // Future Phase 2
  | "type_text"          // Future Phase 2
  | "swipe"              // Future Phase 2
  | "scroll"             // Future Phase 2
  | "press_back"         // Future Phase 2
  | "press_home"         // Future Phase 2
  | "read_screen"        // Future Phase 2
  | "take_screenshot"    // Future Phase 2
  | "open_url";          // Future Phase 2

export type DeviceSafetyLevel = "SAFE" | "CONFIRMATION_REQUIRED" | "HIGH_RISK";

export type DeviceErrorCode =
  | "ANDROID_NOT_AVAILABLE"
  | "APP_NOT_FOUND"
  | "APP_LAUNCH_FAILED"
  | "ACCESSIBILITY_DISABLED"
  | "DEVICE_NOT_CONNECTED"
  | "PERMISSION_DENIED"
  | "ACTION_NOT_SUPPORTED"
  | "ACTION_NOT_IMPLEMENTED"
  | "BRIDGE_UNAVAILABLE"
  | "INVALID_ACTION"
  | "CONFIRMATION_REQUIRED"
  | "SAFETY_VIOLATION";

export interface DeviceActionError {
  code: DeviceErrorCode;
  details: string;
}

export interface OpenApplicationParams {
  appName: string;
  packageName?: string;
  fallbackUrl?: string;
}

export interface DeviceActionRequest<T = Record<string, any>> {
  requestId: string;
  device: DeviceType;
  action: DeviceAction;
  parameters: T;
  timestamp: number;
}

export interface DeviceActionResult<T = any> {
  requestId: string;
  success: boolean;
  device: DeviceType;
  action: DeviceAction;
  message: string;
  data?: T;
  error: DeviceActionError | null;
  timestamp: number;
}

export interface Device {
  deviceId: string;
  deviceType: DeviceType;
  deviceName: string;
  platform: DevicePlatform;
  isConnected: boolean;
  accessibilityEnabled: boolean;
  capabilities: DeviceAction[];
  lastSeen?: number;
}

export interface DevicePermissionStatus {
  accessibilityEnabled: boolean;
  bridgeConnected: boolean;
  deviceModel?: string;
  androidVersion?: string;
}

export interface DeviceMemoryEvent {
  type: "device_action";
  device: DeviceType;
  action: DeviceAction;
  target: string;
  success: boolean;
  timestamp: number;
  details?: string;
}
