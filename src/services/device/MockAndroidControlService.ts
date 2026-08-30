/**
 * Dora Mock Android Control Service
 * 
 * Used when running in a pure web browser / preview container where native Android APIs are absent.
 * Strictly avoids pretending that a real Android hardware/OS action succeeded.
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
} from "./DeviceActionTypes";
import { applicationResolver } from "./ApplicationResolver";
import { screenObservationManager } from "./ScreenObservationManager";

export class MockAndroidControlService {
  private static instance: MockAndroidControlService;

  private constructor() {}

  public static getInstance(): MockAndroidControlService {
    if (!MockAndroidControlService.instance) {
      MockAndroidControlService.instance = new MockAndroidControlService();
    }
    return MockAndroidControlService.instance;
  }

  public async isBridgeAvailable(): Promise<boolean> {
    return false;
  }

  public async getPermissionStatus(): Promise<DevicePermissionStatus> {
    return {
      accessibilityEnabled: false,
      bridgeConnected: false,
      deviceModel: "Browser Sandbox (Mock Environment)",
      androidVersion: "N/A",
    };
  }

  /**
   * Generates a simulated realistic Android Home / App screen observation for testing
   */
  public generateSimulatedScreen(packageName: string = "com.google.android.youtube"): ScreenObservation {
    return screenObservationManager.createObservation({
      packageName,
      activityName: `${packageName}.MainActivity`,
      windowTitle: "YouTube",
      elements: [
        {
          className: "android.widget.TextView",
          text: "YouTube",
          contentDescription: "YouTube Header",
          clickable: false,
          editable: false,
          bounds: { left: 40, top: 80, right: 300, bottom: 160 },
        },
        {
          className: "android.widget.Button",
          text: "Search",
          contentDescription: "Search YouTube",
          resourceId: "com.google.android.youtube:id/menu_search",
          clickable: true,
          editable: false,
          bounds: { left: 750, top: 80, right: 880, bottom: 160 },
        },
        {
          className: "android.widget.EditText",
          text: "",
          contentDescription: "Search query",
          resourceId: "com.google.android.youtube:id/search_edit_text",
          clickable: true,
          editable: true,
          bounds: { left: 100, top: 80, right: 800, bottom: 160 },
        },
        {
          className: "android.widget.Button",
          text: "Settings",
          contentDescription: "Account & Settings",
          resourceId: "com.google.android.youtube:id/menu_settings",
          clickable: true,
          editable: false,
          bounds: { left: 900, top: 80, right: 1020, bottom: 160 },
        },
        {
          className: "android.view.ViewGroup",
          text: "Workout Music 2026 - High Energy Mix",
          contentDescription: "Video item: Workout Music 2026",
          clickable: true,
          editable: false,
          bounds: { left: 0, top: 200, right: 1080, bottom: 650 },
        },
        {
          className: "android.widget.Button",
          text: "Subscribe",
          contentDescription: "Subscribe to channel",
          clickable: true,
          editable: false,
          bounds: { left: 800, top: 580, right: 1040, bottom: 640 },
        },
      ],
    });
  }

  public async openApplication(params: OpenApplicationParams): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const resolution = applicationResolver.resolveApplication(params.appName);

    return {
      requestId,
      success: false,
      status: "BRIDGE_UNAVAILABLE",
      device: "android",
      action: "open_application",
      message: `Cannot open ${params.appName}: Android native bridge is not available in this web environment.`,
      data: {
        appName: params.appName,
        resolvedPackage: resolution.packageName,
        resolutionSource: resolution.resolutionSource,
        fallbackUrl: resolution.fallbackUrl,
        isSimulated: true,
      },
      error: {
        code: "BRIDGE_UNAVAILABLE",
        details: "Android native bridge is not available in this web environment. Connect the Dora Android companion APK to interact with a real device.",
      },
      timestamp: Date.now(),
    };
  }

  public async tap(params: TapActionParams): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_tap`;
    return {
      requestId,
      success: false,
      status: "BRIDGE_UNAVAILABLE",
      device: "android",
      action: "tap",
      message: "Cannot tap UI element: Android native bridge is not available in web environment.",
      data: {
        target: params.elementId || `(${params.x}, ${params.y})`,
        isSimulated: true,
      },
      error: {
        code: "BRIDGE_UNAVAILABLE",
        details: "Native bridge is not active.",
      },
      timestamp: Date.now(),
    };
  }

  public async typeText(params: TypeTextParams): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_type`;
    return {
      requestId,
      success: false,
      status: "BRIDGE_UNAVAILABLE",
      device: "android",
      action: "type_text",
      message: "Cannot type text: Android native bridge is not available in web environment.",
      data: {
        textLength: params.text.length,
        isSimulated: true,
      },
      error: {
        code: "BRIDGE_UNAVAILABLE",
        details: "Native bridge is not active.",
      },
      timestamp: Date.now(),
    };
  }

  public async swipe(params: SwipeActionParams): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_swipe`;
    return {
      requestId,
      success: false,
      status: "BRIDGE_UNAVAILABLE",
      device: "android",
      action: "swipe",
      message: `Cannot swipe ${params.direction}: Android native bridge is not available.`,
      data: { direction: params.direction, isSimulated: true },
      error: {
        code: "BRIDGE_UNAVAILABLE",
        details: "Native bridge is not active.",
      },
      timestamp: Date.now(),
    };
  }

  public async scroll(params: ScrollActionParams): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_scroll`;
    return {
      requestId,
      success: false,
      status: "BRIDGE_UNAVAILABLE",
      device: "android",
      action: "scroll",
      message: `Cannot scroll ${params.direction}: Android native bridge is not available.`,
      data: { direction: params.direction, isSimulated: true },
      error: {
        code: "BRIDGE_UNAVAILABLE",
        details: "Native bridge is not active.",
      },
      timestamp: Date.now(),
    };
  }

  public async pressBack(_params?: PressBackParams): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_back`;
    return {
      requestId,
      success: false,
      status: "BRIDGE_UNAVAILABLE",
      device: "android",
      action: "press_back",
      message: "Cannot press back: Android native bridge is not available.",
      data: { isSimulated: true },
      error: {
        code: "BRIDGE_UNAVAILABLE",
        details: "Native bridge is not active.",
      },
      timestamp: Date.now(),
    };
  }

  public async pressHome(_params?: PressHomeParams): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_home`;
    return {
      requestId,
      success: false,
      status: "BRIDGE_UNAVAILABLE",
      device: "android",
      action: "press_home",
      message: "Cannot press home: Android native bridge is not available.",
      data: { isSimulated: true },
      error: {
        code: "BRIDGE_UNAVAILABLE",
        details: "Native bridge is not active.",
      },
      timestamp: Date.now(),
    };
  }

  public async takeScreenshot(_params?: TakeScreenshotParams): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_screenshot`;
    return {
      requestId,
      success: false,
      status: "BRIDGE_UNAVAILABLE",
      device: "android",
      action: "take_screenshot",
      message: "Cannot capture screenshot: Android native bridge is not available.",
      data: {
        screenshotId: `mock_shot_${Date.now()}`,
        isSimulated: true,
      },
      error: {
        code: "BRIDGE_UNAVAILABLE",
        details: "Native bridge is not active.",
      },
      timestamp: Date.now(),
    };
  }

  public async readScreen(_params?: ReadScreenParams): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_read_screen`;
    const mockObs = this.generateSimulatedScreen();

    return {
      requestId,
      success: false,
      status: "BRIDGE_UNAVAILABLE",
      device: "android",
      action: "read_screen",
      message: "Cannot read live device screen: Android native bridge is not available in web environment.",
      data: {
        screen: mockObs,
        elementsCount: mockObs.elements.length,
        isSimulated: true,
      },
      error: {
        code: "BRIDGE_UNAVAILABLE",
        details: "Native bridge is not active.",
      },
      timestamp: Date.now(),
    };
  }

  public async findUiElement(params: FindUiElementParams): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_find_el`;
    const mockObs = this.generateSimulatedScreen();
    const matched = screenObservationManager.findMatchingElement(params, mockObs);

    return {
      requestId,
      success: false,
      status: "BRIDGE_UNAVAILABLE",
      device: "android",
      action: "find_ui_element",
      message: matched
        ? `Found simulated element '${matched.text || matched.contentDescription}' but native bridge is not active.`
        : "Element not found and native bridge is not active.",
      data: {
        element: matched,
        isSimulated: true,
      },
      error: {
        code: "BRIDGE_UNAVAILABLE",
        details: "Native bridge is not active.",
      },
      timestamp: Date.now(),
    };
  }
}

export const mockAndroidControlService = MockAndroidControlService.getInstance();

