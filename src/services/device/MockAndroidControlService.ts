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
  OpenApplicationParams,
} from "./DeviceActionTypes";
import { applicationResolver } from "./ApplicationResolver";

export class MockAndroidControlService {
  private static instance: MockAndroidControlService;

  // Optional test simulation flag for test harness execution
  private simulatedSuccessForTesting: boolean = false;

  private constructor() {}

  public static getInstance(): MockAndroidControlService {
    if (!MockAndroidControlService.instance) {
      MockAndroidControlService.instance = new MockAndroidControlService();
    }
    return MockAndroidControlService.instance;
  }

  /**
   * Enables or disables test simulation mode (only for automated unit test suites)
   */
  public setSimulatedSuccessForTesting(enabled: boolean): void {
    this.simulatedSuccessForTesting = enabled;
  }

  public async isBridgeAvailable(): Promise<boolean> {
    return false;
  }

  public async getPermissionStatus(): Promise<DevicePermissionStatus> {
    return {
      accessibilityEnabled: false,
      bridgeConnected: false,
      deviceModel: "Browser Sandbox (Mock)",
      androidVersion: "N/A",
    };
  }

  public async openApplication(params: OpenApplicationParams): Promise<DeviceActionResult> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const resolution = applicationResolver.resolveApplication(params.appName);

    // If simulating success for unit tests
    if (this.simulatedSuccessForTesting) {
      return {
        requestId,
        success: true,
        device: "android",
        action: "open_application",
        message: `[Simulated Test] Opened ${resolution.appName} (${resolution.packageName || "unknown package"})`,
        data: {
          appName: resolution.appName,
          packageName: resolution.packageName,
          resolutionSource: resolution.resolutionSource,
        },
        error: null,
        timestamp: Date.now(),
      };
    }

    // Standard Mock Mode: Honestly reports that native Android bridge is unavailable
    return {
      requestId,
      success: false,
      device: "android",
      action: "open_application",
      message: `Cannot open ${params.appName}: Android native bridge is not available in this web environment.`,
      data: {
        appName: params.appName,
        resolvedPackage: resolution.packageName,
        resolutionSource: resolution.resolutionSource,
        fallbackUrl: resolution.fallbackUrl,
      },
      error: {
        code: "BRIDGE_UNAVAILABLE",
        details: "Android native bridge is not available in this environment. Install the Dora Android companion APK to control a real device.",
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Future-compatible placeholders returning ACTION_NOT_IMPLEMENTED
   */
  public async executePlaceholderAction(action: DeviceAction): Promise<DeviceActionResult> {
    return {
      requestId: `req_${Date.now()}_placeholder`,
      success: false,
      device: "android",
      action,
      message: `Action '${action}' is not implemented in Milestone 1.`,
      error: {
        code: "ACTION_NOT_IMPLEMENTED",
        details: `Device action '${action}' is defined for future phases and is not executable in the current milestone.`,
      },
      timestamp: Date.now(),
    };
  }
}

export const mockAndroidControlService = MockAndroidControlService.getInstance();
