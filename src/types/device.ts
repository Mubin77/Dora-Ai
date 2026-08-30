/**
 * Dora Device Control - Type Definitions
 * 
 * Defines strongly typed models for device identity, supported actions,
 * execution requests, safety levels, and structured results.
 */

export type DeviceType = "android" | "pc";

export type DevicePlatform = "android" | "web" | "desktop";

export type DeviceAction =
  | "open_application"   // Implemented in Phase 1
  | "tap"                // Phase 2
  | "type_text"          // Phase 2
  | "swipe"              // Phase 2
  | "scroll"             // Phase 2
  | "press_back"         // Phase 2
  | "press_home"         // Phase 2
  | "take_screenshot"    // Phase 2
  | "read_screen"        // Phase 2
  | "find_ui_element"    // Phase 2
  | "open_url";          // Allowed auxiliary action

export type DeviceSafetyLevel = "SAFE" | "CONFIRMATION_REQUIRED" | "HIGH_RISK";

export type DeviceActionExecutionStatus =
  | "ACTION_REQUESTED"
  | "ACTION_EXECUTED"
  | "ACTION_FAILED"
  | "DEVICE_NOT_CONNECTED"
  | "BRIDGE_UNAVAILABLE";

export type ActionVerificationStatus =
  | "NOT_VERIFIED"
  | "VERIFIED_SUCCESS"
  | "VERIFIED_NO_CHANGE"
  | "VERIFIED_FAILED";

export type DeviceErrorCode =
  | "ANDROID_NOT_AVAILABLE"
  | "APP_NOT_FOUND"
  | "APP_LAUNCH_FAILED"
  | "ACCESSIBILITY_DISABLED"
  | "NO_ACTIVE_WINDOW"
  | "ELEMENT_NOT_FOUND"
  | "ELEMENT_NOT_CLICKABLE"
  | "TEXT_INPUT_FAILED"
  | "GESTURE_FAILED"
  | "SCREENSHOT_FAILED"
  | "SCREEN_READ_FAILED"
  | "STALE_ELEMENT"
  | "DEVICE_NOT_CONNECTED"
  | "BRIDGE_UNAVAILABLE"
  | "ACTION_NOT_SUPPORTED"
  | "ACTION_NOT_IMPLEMENTED"
  | "PERMISSION_DENIED"
  | "INVALID_ACTION"
  | "CONFIRMATION_REQUIRED"
  | "SAFETY_VIOLATION"
  | "SENSITIVE_FIELD_BLOCKED"
  | "ACTION_FAILED"
  | "ACTION_REJECTED"
  | "NAVIGATION_FAILED";

export interface DeviceActionError {
  code: DeviceErrorCode;
  details: string;
}

export interface RectBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface UIElement {
  elementId: string;
  className: string;
  text?: string;
  contentDescription?: string;
  resourceId?: string;
  clickable: boolean;
  editable: boolean;
  enabled: boolean;
  focusable?: boolean;
  scrollable?: boolean;
  bounds: RectBounds;
  isPassword?: boolean;
  parentIndex?: number;
  childrenCount?: number;
}

export interface ScreenObservation {
  observationId: string;
  timestamp: number;
  packageName?: string;
  activityName?: string;
  windowTitle?: string;
  elements: UIElement[];
  isStale: boolean;
  expiresAt: number;
}

export interface OpenApplicationParams {
  appName: string;
  packageName?: string;
  fallbackUrl?: string;
}

export interface TapActionParams {
  elementId?: string;
  x?: number;
  y?: number;
  observationId?: string;
  targetDescription?: string;
  longPress?: boolean;
}

export interface TypeTextParams {
  elementId?: string;
  text: string;
  observationId?: string;
  clearFirst?: boolean;
  pressEnter?: boolean;
}

export interface SwipeActionParams {
  direction: "up" | "down" | "left" | "right";
  durationMs?: number;
  distancePercent?: number;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
}

export interface ScrollActionParams {
  direction: "up" | "down";
  amount?: number;
  elementId?: string;
}

export interface PressBackParams {
  reason?: string;
}

export interface PressHomeParams {
  reason?: string;
}

export interface TakeScreenshotParams {
  quality?: number;
  includeObservation?: boolean;
}

export interface ReadScreenParams {
  forceFresh?: boolean;
  includeNonClickable?: boolean;
}

export interface FindUiElementParams {
  text?: string;
  contentDescription?: string;
  resourceId?: string;
  className?: string;
  exactMatch?: boolean;
  matchCase?: boolean;
  observationId?: string;
}

export interface ActionVerificationResult {
  verified: boolean;
  status: ActionVerificationStatus;
  previousObservationId?: string;
  currentObservationId?: string;
  expectedChangeDetected?: boolean;
  details?: string;
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
  status: DeviceActionExecutionStatus;
  device: DeviceType;
  action: DeviceAction;
  message: string;
  data?: T;
  verification?: ActionVerificationResult;
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
