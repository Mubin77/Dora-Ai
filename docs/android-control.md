# Dora Android Phone Control — Architecture & Implementation Guide

## 1. Overview & Long-Term Flow

Dora's Android Phone Control system enables autonomous, voice-directed mobile interaction using a secure, accessibility-first architecture.

```
User Voice / Text ("YouTube open koro", "Search for high energy mix")
          ↓
Dora Brain & Conversational Behavior Engine
          ↓
TaskDetector / Device Action Planner
          ↓
DeviceControlService (Validation & Safety Guardrails)
          ↓
AndroidControlService (Routing & Observation Manager)
          ↓
Native Companion Bridge (`window.DoraAndroidBridge` / `Capacitor.Plugins.DoraAndroidBridge`)
          ↓
DoraAccessibilityService (Native Android Accessibility Node Inspection & Gesture Engine)
          ↓
Android OS UI & Target Applications
          ↓
ScreenObservation & Action Verification Transition
          ↓
Dora Brain Response (Bilingual Bangla / English Confirmation)
```

---

## 2. Implemented Capabilities (Phase 1 & Phase 2)

| Action | Phase | Description | Key Parameters | Safety Tier |
|---|---|---|---|---|
| `open_application` | Phase 1 | Resolves package name and launches target Android application | `appName`, `packageName` (optional) | Standard |
| `read_screen` | Phase 2 | Inspects active window accessibility tree and dumps structured elements | `includeNonClickable` (bool) | Read-Only |
| `find_ui_element` | Phase 2 | Queries active screen hierarchy by text, content description, or resource ID | `text`, `resourceId`, `contentDescription`, `className` | Read-Only |
| `tap` | Phase 2 | Taps target UI element using observation `elementId` or center bounds (with coordinate fallback) | `elementId`, `x`, `y`, `longPress` | Interactive |
| `type_text` | Phase 2 | Sets text into target editable node or active input focus via `ACTION_SET_TEXT` | `text`, `elementId`, `clearFirst`, `pressEnter` | High Risk (Sensitive field protection active) |
| `swipe` | Phase 2 | Dispatches directional gesture swipe (`up`, `down`, `left`, `right`) | `direction`, `durationMs` | Interactive |
| `scroll` | Phase 2 | Scrolls active viewport forward or backward (`ACTION_SCROLL_FORWARD/BACKWARD`) | `direction` (`up`/`down`) | Interactive |
| `press_back` | Phase 2 | Sends system-level Back navigation action (`GLOBAL_ACTION_BACK`) | None | Standard |
| `press_home` | Phase 2 | Sends system-level Home navigation action (`GLOBAL_ACTION_HOME`) | None | Standard |
| `take_screenshot` | Phase 2 | Captures temporary frame buffer for visual inspection | `quality` | Read-Only |

---

## 3. Observation Lifecycle & Staleness Management

To prevent incorrect or dangerous interactions after the screen has changed:

1. **Observation-Scoped Element IDs**: When `read_screen` or inspection runs, each detected UI element receives a unique identifier (e.g. `el_171400_abc123`) tied specifically to the observation frame.
2. **Time-To-Live (TTL)**: Screen observations expire automatically after **8 seconds**.
3. **Action-Triggered Invalidation**: Any state-changing action (`tap`, `swipe`, `scroll`, `press_back`, `press_home`, `open_application`) immediately marks existing observations as **stale**.
4. **Stale Element Rejection**: If the AI attempts to tap or type on a stale element, `AndroidControlService` rejects the action with `STALE_ELEMENT`, prompting a fresh `read_screen`.

---

## 4. Privacy & Safety Boundaries

Dora enforces strict security and privacy boundaries:

- **Sensitive Field Protection**: Automated text entry into password, PIN, OTP, payment, and private authentication fields (`isPassword: true` or matching sensitive resource keywords) is **strictly blocked** (`SENSITIVE_FIELD_BLOCKED`).
- **Privacy Redaction**: Text content in password and PIN nodes is automatically redacted (`[REDACTED]`) in observations.
- **Command Injection Prevention**: All action parameters are sanitized. System shell commands, ADB commands, and script injections are actively blocked with `SAFETY_VIOLATION`.
- **Coordinate Bounds Validation**: Coordinate taps and gestures must fall within the physical display bounds (0 to viewport width/height). Negative, non-numeric, or out-of-bounds coordinates are rejected.

---

## 5. Native Android Architecture (Companion APK)

The native companion source is structured under `/android/src/main/java/ai/dora/companion/`:

1. **`DoraAccessibilityService.kt`**:
   - Extends Android `AccessibilityService`.
   - Traverses `rootInActiveWindow` and child `AccessibilityNodeInfo` objects to construct the UI hierarchy.
   - Performs `ACTION_CLICK`, `ACTION_SET_TEXT`, `ACTION_SCROLL_FORWARD`, and `dispatchGesture` for smooth touch/swipe paths.
   - Executes `performGlobalAction(GLOBAL_ACTION_BACK)` and `performGlobalAction(GLOBAL_ACTION_HOME)`.
2. **`DoraAndroidBridgePlugin.kt`**:
   - Bridges JavaScript/Capacitor calls with native service instances.
   - Handles `openApp`, `getInstalledApplications`, `checkAccessibility`, `readScreen`, `tapNode`, `typeTextOnNode`, `swipeGesture`, `scrollWindow`, `pressBack`, `pressHome`.

---

## 6. Environment Honest Reporting & Verification Status

- **Web Preview / Sandbox Mode**: When running in a standard web browser or AI Studio container without a physical Android companion bridge attached, `AndroidControlService` and `MockAndroidControlService` return `success: false` with status `BRIDGE_UNAVAILABLE`.
- **Conversational Honesty**: Dora never claims that a real Android hardware action succeeded unless the native bridge returns `success: true` and `status: ACTION_EXECUTED`.
- **Verification Status**:
  - **TypeScript & Service Orchestration Layer**: Fully implemented and verified via automated test suites (`/server/core/deviceControl.test.ts`).
  - **Native Android Kotlin Source**: Implemented per Android Accessibility API specifications (API 24+ for gestures, API 30+ for screenshots).
  - **Hardware Testing Note**: *Implemented but not device-verified in the current web preview environment (requires real Android companion hardware).*
