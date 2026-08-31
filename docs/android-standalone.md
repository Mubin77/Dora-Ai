# Dora Standalone Android Application & Local Device Controller

## Overview

**Dora** is an autonomous AI assistant and on-device controller for Android. In Standalone Mode, the installed `Dora.apk` operates locally on the phone using Android's native Accessibility Service APIs and Android Bridge Plugin—**without requiring pairing codes, remote servers, or computer connections**.

```
┌─────────────────────────────────────────────────────────────┐
│                      Dora Android App                       │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │             Local Natural Language & Voice          │   │
│   │        "YouTube kholo" / "Open WhatsApp" / "Home"   │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              │                              │
│                              ▼                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │            DoraAndroidBridgePlugin.kt               │   │
│   │       - Natural Command Intent Parser               │   │
│   │       - App / Package Resolver                      │   │
│   │       - Gesture & Action Dispatcher                 │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              │                              │
│                              ▼                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │            DoraAccessibilityService.kt              │   │
│   │       - Global Actions (Home, Back, Recents)        │   │
│   │       - View Hierarchy Traversal & Text Reading     │   │
│   │       - Programmatic Taps & Smooth Swipes           │   │
│   │       - Hardened Password & Sensitive Shielding     │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Getting Started

### 1. Installation
Install `Dora.apk` on your physical Android device (Android 7.0+ / API 24–34).

### 2. One-Time Accessibility Setup
1. Launch **Dora** on your phone.
2. Tap the **"Open Accessibility Settings"** button.
3. Locate **Dora** under Installed Apps / Downloaded Apps and toggle it **ON**.
4. Return to Dora. The status badge will immediately turn green:
   `● Dora Active & Ready Locally`

### 3. Immediate Hands-Free Control (Zero Pairing Needed)
You can now speak or type local natural commands directly:
- **"YouTube kholo"** or **"Open YouTube"** &rarr; Launches YouTube immediately
- **"WhatsApp kholo"** or **"Open WhatsApp"** &rarr; Launches WhatsApp immediately
- **"Settings kholo"** or **"Open Settings"** &rarr; Launches Android System Settings
- **"Go Home"** / **"Home jao"** &rarr; Triggers the system Home button
- **"Go Back"** / **"Back jao"** &rarr; Triggers the system Back button
- **"Scroll Down"** / **"Niche scroll koro"** &rarr; Performs smooth gesture scroll

---

## Safety & Privacy Architecture

Dora enforces strict device-level safety boundaries:
1. **Password Shielding**: Never inputs text into fields flagged as `isPassword` or containing sensitive credential markers.
2. **Local Execution**: Standalone device control commands execute directly within the on-device sandbox.
3. **No Intrusive Permissions**: Uses standard Android Accessibility and Launcher queries without root or risky overlays.

---

## Building the APK

Run the Gradle wrapper inside the `/android` directory:

```bash
cd android
./gradlew assembleDebug
```

The compiled APK will be located at:
`android/app/build/outputs/apk/debug/app-debug.apk`

GitHub Actions automatically builds and uploads `Dora-debug-apk` on every push to `main` via `/.github/workflows/build-apk.yml`.
