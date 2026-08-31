# Dora Autonomous Android Agent (Phase 3 Architecture)

## 1. Overview & Core Philosophy

**Phase 3** evolves Dora from a single-command executor (Phase 1 & Phase 2) into a **fully autonomous Android task agent**. Rather than blindly firing static command sequences, Dora continuously observes the device screen, understands UI context semantically, reasons about next steps, verifies state transitions after every action, and adaptively recovers or replans when encountering unexpected dialogs, missing elements, or UI changes.

```
                  ┌──────────────────────┐
                  │      USER GOAL       │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  UNDERSTAND & PARSE  │ (GoalInterpreter)
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │    FORMULATE PLAN    │ (AutonomousPlanner)
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 │
     ┌─────────────┐                          │
     │   OBSERVE   │ (ScreenUnderstanding)    │
     └──────┬──────┘                          │
            │                                 │
            ▼                                 │
     ┌─────────────┐                          │
     │   DECIDE    │ (ActionSelector)         │
     └──────┬──────┘                          │
            │                                 │
            ▼                                 │
     ┌─────────────┐                          │
     │     ACT     │ (DeviceControlService)   │
     └──────┬──────┘                          │
            │                                 │
            ▼                                 │
     ┌─────────────┐                          │
     │OBSERVE AGAIN│ (Accessibility State)    │
     └──────┬──────┘                          │
            │                                 │
            ▼                                 │
     ┌─────────────┐                          │
     │   VERIFY    │ (VerificationEngine)     │
     └──────┬──────┘                          │
            │                                 │
     ───────┴───────                          │
    │  SUCCESSFUL?  │                         │
     ───────┬───────                          │
     YES ┌──┴──┐ NO                           │
         │     │                              │
         ▼     ▼                              │
    ┌────────┐ ┌──────────────────┐           │
    │  NEXT  │ │ RECOVER / REPLAN │───────────┘
    │  STEP  │ └──────────────────┘
    └────┬───┘
         │ (All steps complete)
         ▼
 ┌───────────────┐
 │ TASK COMPLETE │
 └───────────────┘
```

---

## 2. Component Architecture

The autonomous engine is organized into modular services under `src/services/device/autonomous/`:

| Component | Role |
| :--- | :--- |
| **`AutonomousAgent`** | Central orchestrator coordinating the continuous decision and execution loop. |
| **`GoalInterpreter`** | Translates natural language goals across English, Bengali, and Banglish into structured intent, target apps, search queries, and sub-goals. |
| **`AutonomousPlanner`** | Generates initial multi-step plans and adapts plans dynamically in response to dialog popups or UI transitions. |
| **`ScreenUnderstandingEngine`** | Normalizes raw accessibility trees, classifies elements into semantic roles (`search_input`, `search_button`, `action_button`, `media_item`, `dialog_confirm`, `sensitive_field`), and computes structural fingerprints. |
| **`ActionSelector`** | Selects optimal concrete device actions (`open_application`, `tap`, `type_text`, `scroll`, `press_back`) and flags high-risk actions requiring user confirmation. |
| **`AutonomousVerificationEngine`** | Assesses whether the executed action produced the intended screen state transition, computing verification confidence scores. |
| **`RecoveryEngine`** | Deploys structured fallback plans (cache invalidation, scroll-to-find, back navigation to clear overlays, re-planning) when steps fail or stall. |
| **`LoopDetector`** | Monitors action history and screen fingerprints to detect oscillation loops or repeated ineffective clicks before step limits are exhausted. |
| **`TaskStateManager`** | Enforces valid state machine transitions, handles cancellation tokens, enforces step limits (default 20) and timeouts (default 120s). |
| **`MockAutonomousEnvironment`** | Stateful multi-screen Android OS simulator supporting comprehensive mock-verified end-to-end task execution. |

---

## 3. State Machine & Task Lifecycle

Every autonomous task transitions through a strict, validated state machine:

```
                  ┌─────────┐
                  │  IDLE   │
                  └────┬────┘
                       │ startTask()
                       ▼
                 ┌───────────┐
                 │ PLANNING  │
                 └─────┬─────┘
                       │
         ┌─────────────┼──────────────┐
         ▼             ▼              ▼
   ┌───────────┐ ┌───────────┐ ┌──────────────┐
   │ OBSERVING │◄┤ RECOVERING│ │ WAITING FOR  │
   └─────┬─────┘ └───────────┘ │ CONFIRMATION │
         │             ▲       └──────┬───────┘
         ▼             │              │ (approved)
   ┌───────────┐       │              ▼
   │ DECIDING  │───────┼────────►┌────────────┐
   └─────┬─────┘       │         │   ACTING   │
         │             │         └──────┬─────┘
         └─────────────┼────────────────┘
                       │
                       ▼
                 ┌───────────┐
                 │ VERIFYING │
                 └─────┬─────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
   ┌───────────┐               ┌───────────┐
   │ COMPLETED │               │  FAILED   │
   └───────────┘               └───────────┘
```

---

## 4. Safety, Privacy & Redaction Directives

To protect user safety and security:

1. **Credential Protection**:
   - Dora **NEVER** autonomously inputs passwords, PINs, OTPs, CVVs, credit card numbers, or private authentication tokens.
   - Any screen classified with `isPasswordOrAuthScreen = true` immediately triggers a safe halt.
2. **High-Risk Actions Confirmation**:
   - Actions involving sending messages, financial transactions, or destructive data modifications require explicit user confirmation via the `waiting_for_confirmation` state.
3. **Execution Honesty**:
   - When running against the simulated environment, the agent outputs `isMockVerified = true` and `isDeviceVerified = false`.
   - Dora explicitly informs the user if a task is mock-verified rather than physically executed on hardware.

---

## 5. API Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/device/autonomous/task` | `POST` | Starts a new autonomous task with goal string and options. |
| `/api/device/autonomous/task/:id` | `GET` | Retrieves full task status, action history, plan, and verification outcome. |
| `/api/device/autonomous/task/:id/cancel` | `POST` | Cancels an ongoing autonomous task. |
| `/api/device/autonomous/task/:id/confirm` | `POST` | Approves or declines a pending high-risk confirmation step. |
| `/api/test-autonomous-agent` | `GET` | Executes the Phase 3 automated test suite and returns test results. |

---

## 6. Verification & Automated Test Results

Phase 3 is validated through unit and integration test suites in `server/core/autonomousAgent.test.ts`:
- **Goal Decomposition**: English, Bangla, and Banglish NLP parsing.
- **Screen Understanding**: Semantic role assignment and password redaction.
- **Dynamic Plan Adaptation**: Dialog injection and redundant step skipping.
- **Verification Engine**: Deterministic fingerprint and state transition checks.
- **Loop Detection**: Repeated action and screen oscillation detection.
- **End-to-End Execution**: Full YouTube search & play journey in mock environment.
