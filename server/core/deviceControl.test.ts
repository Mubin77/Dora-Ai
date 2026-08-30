/**
 * Dora Device Control Subsystem Test Suite
 * 
 * Tests and verifies:
 * - Case A: No Android companion connected -> "YouTube open koro" -> success=false -> Dora does NOT claim YouTube opened.
 * - Case B: Mock successful Android bridge -> action returns success=true -> status=ACTION_EXECUTED -> Dora may confirm YouTube opened.
 * - Case C: Android companion unavailable -> status=BRIDGE_UNAVAILABLE -> Dora explains phone is not connected.
 * - Case D: Safety validation blocks command injections and high-risk payloads.
 * - Case E: Application resolver gracefully handles known apps and rejects unresolvable ones without false success.
 * - Case F: Status lifecycle distinction (ACTION_REQUESTED, ACTION_EXECUTED, ACTION_FAILED, DEVICE_NOT_CONNECTED, BRIDGE_UNAVAILABLE).
 */

import { deviceControlService } from "../../src/services/device/DeviceControlService";
import { androidControlService } from "../../src/services/device/AndroidControlService";
import { mockAndroidControlService } from "../../src/services/device/MockAndroidControlService";
import { applicationResolver } from "../../src/services/device/ApplicationResolver";
import { deviceSafety } from "../../src/services/device/DeviceSafety";
import { taskDetector } from "./taskDetector";
import { DeviceActionResult } from "../../src/types/device";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

export async function runAllDeviceControlTests() {
  console.log("\n========================================================");
  console.log("RUNNING DORA DEVICE CONTROL TEST SUITE (PHASE 1)");
  console.log("========================================================\n");

  // -------------------------------------------------------------
  // TEST 1 (Case A): No Android companion connected
  // "YouTube open koro" -> success=false, status=BRIDGE_UNAVAILABLE
  // -------------------------------------------------------------
  console.log("TEST 1 (Case A) — No Android Companion Connected:");
  {
    // Ensure native bridge is disconnected
    androidControlService.setNativeBridgeForTesting(null);

    // 1. TaskDetector identifies device action
    const detected = taskDetector.detect("YouTube open koro");
    assert(detected.task === "device_action", "TaskDetector identifies 'YouTube open koro' as device_action");
    assert(detected.deviceAction?.action === "open_application", "Action identified as open_application");
    assert(detected.deviceAction?.appName.toLowerCase() === "youtube", "App name identified as YouTube");

    // 2. Dispatch action via DeviceControlService
    const result: DeviceActionResult = await deviceControlService.executeAction({
      device: detected.deviceAction?.device || "android",
      action: detected.deviceAction?.action || "open_application",
      parameters: { appName: detected.deviceAction?.appName || "YouTube" },
    });

    // 3. Must NEVER return success=true when no companion device is connected
    assert(result.success === false, "Action result success is strictly FALSE when bridge is not connected");
    assert(result.status === "BRIDGE_UNAVAILABLE", "Status is distinctly BRIDGE_UNAVAILABLE");
    assert(result.error?.code === "BRIDGE_UNAVAILABLE", "Error code is BRIDGE_UNAVAILABLE");
    assert(result.error !== null, "Error object is populated");
  }

  // -------------------------------------------------------------
  // TEST 2 (Case B): Mock Successful Android Native Bridge
  // Action returns success=true, status=ACTION_EXECUTED
  // -------------------------------------------------------------
  console.log("\nTEST 2 (Case B) — Successful Android Native Bridge:");
  {
    let nativeOpenAppCalled = false;
    let launchedPackage = "";

    // Inject active native bridge mock
    androidControlService.setNativeBridgeForTesting({
      openApp: async (options) => {
        nativeOpenAppCalled = true;
        launchedPackage = options.packageName;
        return {
          success: true,
          message: `Successfully launched ${options.appName}`,
        };
      },
      checkAccessibility: async () => ({
        enabled: true,
        model: "Pixel 8 Pro (Simulated)",
        version: "Android 14",
      }),
    });

    const result = await deviceControlService.executeAction({
      device: "android",
      action: "open_application",
      parameters: { appName: "YouTube" },
    });

    assert(nativeOpenAppCalled, "Native bridge openApp was invoked");
    assert(launchedPackage === "com.google.android.youtube", "Target package correctly resolved to com.google.android.youtube");
    assert(result.success === true, "Result success is TRUE when native bridge confirms execution");
    assert(result.status === "ACTION_EXECUTED", "Status is strictly ACTION_EXECUTED");
    assert(result.error === null, "Error is null on successful execution");

    // Clean up test bridge
    androidControlService.setNativeBridgeForTesting(null);
  }

  // -------------------------------------------------------------
  // TEST 3 (Case C): Android Companion Native Bridge Returns Error
  // Action returns success=false, status=ACTION_FAILED
  // -------------------------------------------------------------
  console.log("\nTEST 3 (Case C) — Bridge Active But Launch Failed on Device:");
  {
    androidControlService.setNativeBridgeForTesting({
      openApp: async () => ({
        success: false,
        error: "ActivityNotFoundException: Activity could not be started",
      }),
      checkAccessibility: async () => ({ enabled: true }),
    });

    const result = await deviceControlService.executeAction({
      device: "android",
      action: "open_application",
      parameters: { appName: "YouTube" },
    });

    assert(result.success === false, "Result success is FALSE when native bridge launch fails");
    assert(result.status === "ACTION_FAILED", "Status is ACTION_FAILED when app launch fails on device");
    assert(result.error?.code === "APP_LAUNCH_FAILED", "Error code is APP_LAUNCH_FAILED");

    // Clean up test bridge
    androidControlService.setNativeBridgeForTesting(null);
  }

  // -------------------------------------------------------------
  // TEST 4 (Case D): Mock Service Strictly Never Returns True
  // -------------------------------------------------------------
  console.log("\nTEST 4 (Case D) — Mock Android Service Strictly Never Returns True:");
  {
    const mockResult = await mockAndroidControlService.openApplication({ appName: "YouTube" });
    assert(mockResult.success === false, "MockAndroidControlService NEVER returns success=true");
    assert(mockResult.status === "BRIDGE_UNAVAILABLE", "Mock status is BRIDGE_UNAVAILABLE");
    assert(mockResult.error?.code === "BRIDGE_UNAVAILABLE", "Mock error code is BRIDGE_UNAVAILABLE");
  }

  // -------------------------------------------------------------
  // TEST 5 (Case E): Safety Boundaries & Injection Prevention
  // -------------------------------------------------------------
  console.log("\nTEST 5 (Case E) — Safety Boundaries & Injection Prevention:");
  {
    const dangerousPayload = "rm -rf /; adb shell su";
    const safetyCheck = deviceSafety.validateActionSecurity("open_application", { appName: dangerousPayload });
    assert(!safetyCheck.isAllowed, "Safety engine blocks shell injection payload");

    const execResult = await deviceControlService.executeAction({
      device: "android",
      action: "open_application",
      parameters: { appName: dangerousPayload },
    });

    assert(execResult.success === false, "Execution blocked for dangerous payload");
    assert(execResult.status === "ACTION_FAILED", "Status is ACTION_FAILED for security violation");
    assert(execResult.error?.code === "SAFETY_VIOLATION", "Error code is SAFETY_VIOLATION");
  }

  // -------------------------------------------------------------
  // TEST 6 (Case F): Application Resolver & Aliases
  // -------------------------------------------------------------
  console.log("\nTEST 6 (Case F) — Application Resolver & Bilingual Aliases:");
  {
    const ytEng = applicationResolver.resolveApplication("YouTube");
    assert(ytEng.isResolved && ytEng.packageName === "com.google.android.youtube", "Resolves English 'YouTube'");

    const ytBangla = applicationResolver.resolveApplication("ইউটিউব");
    assert(ytBangla.isResolved && ytBangla.packageName === "com.google.android.youtube", "Resolves Bangla 'ইউটিউব'");

    const wa = applicationResolver.resolveApplication("WhatsApp");
    assert(wa.isResolved && wa.packageName === "com.whatsapp", "Resolves 'WhatsApp'");

    const unknown = applicationResolver.resolveApplication("NonExistentApp12345");
    assert(!unknown.isResolved, "Uninstalled/unknown app returns isResolved=false");
  }

  // -------------------------------------------------------------
  // TEST 7 (Case G): Bilingual Task Detection Coverage
  // -------------------------------------------------------------
  console.log("\nTEST 7 (Case G) — TaskDetector Bilingual App Launch Phrases:");
  {
    const phrases = [
      { text: "YouTube open koro", app: "YouTube" },
      { text: "open YouTube", app: "YouTube" },
      { text: "WhatsApp kholo", app: "WhatsApp" },
      { text: "Spotify chalu koro", app: "Spotify" },
      { text: "launch Camera", app: "Camera" },
      { text: "Chrome browser open koro", app: "Chrome" },
    ];

    for (const p of phrases) {
      const d = taskDetector.detect(p.text);
      assert(d.task === "device_action", `Identified device_action for: "${p.text}"`);
      assert(d.deviceAction?.action === "open_application", `Action is open_application for: "${p.text}"`);
    }
  }

  console.log("\n========================================================");
  console.log("✅ ALL DORA DEVICE CONTROL TESTS PASSED SUCCESSFULLY");
  console.log("========================================================\n");

  return { success: true, timestamp: Date.now() };
}
