# Dora Android App & Companion Deployment Guide (Phase 4)

## 1. Overview & Architecture

The Dora Android Companion deployment turns Dora's multi-modal intelligence into an autonomous, real-world Android assistant capable of understanding natural language requests, navigating apps, inspecting screen hierarchies, and executing multi-step workflows.

```
┌────────────────────────────────────────────────────────┐
│                   Dora Brain Engine                    │
│   (LLM Reasoning, Intent Extraction, Autonomous Loop)  │
└──────────────────────────┬─────────────────────────────┘
                           │ (Encrypted WebSocket / REST)
                           ▼
┌────────────────────────────────────────────────────────┐
│             Device Pairing & Security Gate             │
│    (Session Token Auth, Allowlist, Sensitive Guards)   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                Dora Android Companion App               │
│            Application ID: ai.dora.companion           │
│                   App Name: "Dora"                     │
├──────────────────────────┬─────────────────────────────┤
│  DoraAndroidBridgePlugin │   DoraAccessibilityService  │
│  (App Launch & Discovery)│   (Hierarchy & Interaction) │
└──────────────────────────┴─────────────────────────────┘
```

---

## 2. App Identity & Android Manifest

- **User-Facing App Name**: `Dora`
- **Application Package**: `ai.dora.companion`
- **Accessibility Service Label**: `Dora Device Assistant`
- **Target Output**: `Dora-debug.apk`

### Permissions Declared
Dora strictly adheres to Android's principle of least privilege:
- `android.permission.INTERNET`: For secure WebSocket/REST connection to the Dora server.
- `android.permission.FOREGROUND_SERVICE`: For maintaining low-power background connection resilience.
- `android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE`: For Android 14+ connected device service compliance.
- `android.permission.QUERY_ALL_PACKAGES`: To resolve user voice requests to installed apps (e.g. "Open YouTube", "Open WhatsApp").

---

## 3. Accessibility Service & Manual Setup Flow

Android OS requires explicit user consent in system settings for Accessibility Services. Dora uses an honest, transparent setup flow:

1. **Step 1:** Open Dora on your Android device.
2. **Step 2:** Tap **"Open Accessibility Settings"**.
3. **Step 3:** Under Downloaded Apps / Services, find **Dora Device Assistant** and toggle it **ON**.
4. **Step 4:** Return to Dora. The status instantly transitions to `CONNECTED`.

> **Safety Guarantee:** Dora never attempts to silently enable accessibility or use root/exploit mechanisms.

---

## 4. Device Deployment Status Lifecycle

| Status | Meaning | Next Action |
| :--- | :--- | :--- |
| `NOT_CONFIGURED` | No Android companion device has been paired yet. | Generate a pairing code and enter it on the phone. |
| `ACCESSIBILITY_DISABLED` | Phone is connected, but Accessibility permission is OFF. | User enables Dora in Android Accessibility settings. |
| `READY` | Phone is configured and paired, but bridge is currently idle. | Standby for voice or text requests. |
| `CONNECTED` | Phone is connected, Accessibility is active, and bridge is live. | Ready for autonomous execution. |
| `ERROR` | Bridge communication encountered a network or timeout error. | Dora attempts automatic reconnect via heartbeat. |

---

## 5. Secure Pairing Protocol

1. **Pairing Code Generation:** The Dora Web dashboard calls `POST /api/device/pairing/code` to generate a 6-character code (e.g. `DORA-9742`) with a 10-minute Time-To-Live (TTL).
2. **Pairing Exchange:** The Android app submits `POST /api/device/pairing/pair` with the pairing code, device ID, and hardware model.
3. **Cryptographic Token Issuance:** The server verifies the single-use code and returns a unique `dora_token_<uuid>` session token.
4. **Heartbeat & Reconnection:** The companion periodically sends `POST /api/device/pairing/heartbeat` with the bearer token to report status and keep the connection alive.

---

## 6. Cloud-Based APK Build System

Because this environment does not require a local PC or Android Studio, the project includes an automated GitHub Actions workflow:

- **Workflow File**: `.github/workflows/build-apk.yml`
- **Output**: `Dora-debug.apk`

### Building in GitHub Actions:
1. Push the repository to GitHub.
2. Go to the **Actions** tab in your GitHub repository.
3. Select **Build Dora Android Debug APK** and click **Run workflow**.
4. Once completed, download the `Dora-debug.apk` artifact and install it directly on your Android phone via USB, Google Drive, or ADB.

### Building via Command Line (if JDK/Android SDK is installed):
```bash
cd android
./gradlew assembleDebug
# Generated APK will be at android/app/build/outputs/apk/debug/Dora-debug.apk
```

---

## 7. Safety Gate & Allowlist

All device control actions must satisfy three layers of safety before execution:

1. **Strict Action Allowlist**: Only explicit approved actions (`open_app`, `get_installed_apps`, `read_screen`, `find_element`, `tap`, `type_text`, `scroll`, `swipe`, `press_home`, `press_back`) are accepted. Disallowed actions (e.g. shell execution, arbitrary intent broadcasting) are rejected.
2. **Password & Sensitive Field Protection**: Dora automatically checks `node.isPassword` and sensitive resource IDs. Text injection into password fields is strictly blocked.
3. **No Private Credential Persistence**: Auth tokens and device IDs are transiently verified; sensitive credentials are never stored in plain text.

---

## 8. Diagnostic Endpoints & Testing

- `GET /api/device/pairing/status`: Returns current device deployment status.
- `GET /api/test-companion-deployment`: Executes the complete 15-point Phase 4 Companion Deployment test suite.
- `GET /api/test-device-control`: Executes Phase 1-3 device control test scenarios.
