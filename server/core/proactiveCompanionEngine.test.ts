/**
 * Dora Proactive Companion Engine Test Suite
 * 
 * Verifies all 10 core requirements:
 * 1. Silence threshold detection (triggers when silence exceeds threshold).
 * 2. Cooldown timer enforcement (never triggers within cooldown window).
 * 3. User speaking detection (aborts/prevents initiation when user is speaking).
 * 4. Dora speaking awareness (never triggers while Dora is already speaking).
 * 5. Explicit silence command handling ("Dora chup thak", "be quiet", "focus").
 * 6. Explicit resume command handling ("Dora kotha bolo", "talk with me").
 * 7. Camera visual context incorporation in proactive prompt.
 * 8. Screen share context incorporation in proactive prompt.
 * 9. Lifecycle management (call inactive = IDLE, no triggers).
 * 10. Mute state awareness (muted = COOLDOWN/PAUSED, no triggers).
 */

import { proactiveCompanionCore, ProactiveEngineInput } from "./proactiveCompanionEngine";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

export function runAllProactiveEngineTests() {
  console.log("\n========================================================");
  console.log("RUNNING DORA PROACTIVE COMPANION ENGINE TEST SUITE");
  console.log("========================================================\n");

  const core = proactiveCompanionCore;

  // TEST 1 — Inactive Call Lifecycle
  console.log("TEST 1 — Inactive Call Lifecycle:");
  {
    const input: ProactiveEngineInput = {
      isCallActive: false,
      isMuted: false,
      isUserSpeaking: false,
      isDoraSpeaking: false,
      timeSinceLastUserSpeechMs: 30000,
      timeSinceLastDoraSpeechMs: 30000,
      timeSinceLastProactiveTurnMs: 30000,
    };
    const decision = core.evaluate(input);
    assert(!decision.shouldInitiate, "Engine does NOT initiate when call is inactive");
    assert(decision.state === "IDLE", "State is IDLE when call is inactive");
  }

  // TEST 2 — Silence Below Threshold
  console.log("\nTEST 2 — Silence Below Threshold:");
  {
    const input: ProactiveEngineInput = {
      isCallActive: true,
      isMuted: false,
      isUserSpeaking: false,
      isDoraSpeaking: false,
      timeSinceLastUserSpeechMs: 5000, // Only 5s of silence (< 18s threshold)
      timeSinceLastDoraSpeechMs: 30000,
      timeSinceLastProactiveTurnMs: 30000,
    };
    const decision = core.evaluate(input);
    assert(!decision.shouldInitiate, "Engine does NOT trigger when silence is below threshold");
    assert(decision.state === "MONITORING", "State remains MONITORING");
  }

  // TEST 3 — Silence Meeting Threshold -> Trigger
  console.log("\nTEST 3 — Silence Meeting Threshold -> Trigger:");
  {
    const input: ProactiveEngineInput = {
      isCallActive: true,
      isMuted: false,
      isUserSpeaking: false,
      isDoraSpeaking: false,
      timeSinceLastUserSpeechMs: 22000, // 22s of silence (> 18s threshold)
      timeSinceLastDoraSpeechMs: 30000,
      timeSinceLastProactiveTurnMs: 30000,
    };
    const decision = core.evaluate(input);
    assert(decision.shouldInitiate, "Engine initiates proactive speech when silence threshold is met");
    assert(decision.state === "TRIGGERING", "State transitions to TRIGGERING");
    assert(
      decision.payload?.triggerType === "GENTLE_SILENCE_CHECKIN",
      "Trigger type is GENTLE_SILENCE_CHECKIN"
    );
    assert(
      decision.payload?.promptInstruction.includes("PROACTIVE COMPANION INITIATION"),
      "Prompt instruction contains proactive companion directive"
    );
  }

  // TEST 4 — Cooldown Timer Enforcement
  console.log("\nTEST 4 — Cooldown Timer Enforcement:");
  {
    const input: ProactiveEngineInput = {
      isCallActive: true,
      isMuted: false,
      isUserSpeaking: false,
      isDoraSpeaking: false,
      timeSinceLastUserSpeechMs: 30000,
      timeSinceLastDoraSpeechMs: 10000, // Only 10s since Dora last spoke (< 25s cooldown)
      timeSinceLastProactiveTurnMs: 30000,
    };
    const decision = core.evaluate(input);
    assert(!decision.shouldInitiate, "Engine does NOT trigger while cooldown is active");
    assert(decision.state === "COOLDOWN", "State is COOLDOWN");
  }

  // TEST 5 — User Speaking Detection (NEVER Interrupt User)
  console.log("\nTEST 5 — User Speaking Detection:");
  {
    const input: ProactiveEngineInput = {
      isCallActive: true,
      isMuted: false,
      isUserSpeaking: true, // User is talking right now
      isDoraSpeaking: false,
      timeSinceLastUserSpeechMs: 30000,
      timeSinceLastDoraSpeechMs: 30000,
      timeSinceLastProactiveTurnMs: 30000,
    };
    const decision = core.evaluate(input);
    assert(!decision.shouldInitiate, "Engine NEVER triggers while user is speaking");
    assert(decision.reason.includes("never interrupt the user"), "Explicitly cites user speaking protection");
  }

  // TEST 6 — Dora Speaking Awareness
  console.log("\nTEST 6 — Dora Speaking Awareness:");
  {
    const input: ProactiveEngineInput = {
      isCallActive: true,
      isMuted: false,
      isUserSpeaking: false,
      isDoraSpeaking: true, // Dora is currently speaking
      timeSinceLastUserSpeechMs: 30000,
      timeSinceLastDoraSpeechMs: 30000,
      timeSinceLastProactiveTurnMs: 30000,
    };
    const decision = core.evaluate(input);
    assert(!decision.shouldInitiate, "Engine does NOT trigger while Dora is already speaking");
  }

  // TEST 7 — Explicit Silence Command Detection ("Dora chup thak")
  console.log("\nTEST 7 — Explicit Silence Command Detection:");
  {
    const check1 = core.checkExplicitSilenceCommand("Dora chup thak");
    assert(check1.isSilenceCommand, "Correctly identifies 'Dora chup thak' as silence command");

    const check2 = core.checkExplicitSilenceCommand("shh be quiet please");
    assert(check2.isSilenceCommand, "Correctly identifies 'be quiet please' as silence command");

    const check3 = core.checkExplicitSilenceCommand("Dora focus mode");
    assert(check3.isSilenceCommand, "Correctly identifies 'focus mode' as silence command");

    const input: ProactiveEngineInput = {
      isCallActive: true,
      isMuted: false,
      isUserSpeaking: false,
      isDoraSpeaking: false,
      isExplicitSilenceActive: true,
      timeSinceLastUserSpeechMs: 40000,
      timeSinceLastDoraSpeechMs: 40000,
      timeSinceLastProactiveTurnMs: 40000,
    };
    const decision = core.evaluate(input);
    assert(!decision.shouldInitiate, "Engine stays completely SILENT when explicit silence is active");
    assert(decision.state === "SILENCED", "State is SILENCED");
  }

  // TEST 8 — Explicit Resume Command Detection ("Dora kotha bolo")
  console.log("\nTEST 8 — Explicit Resume Command Detection:");
  {
    const resumeCheck1 = core.checkExplicitSilenceCommand("Dora kotha bolo");
    assert(resumeCheck1.isResumeCommand, "Correctly identifies 'Dora kotha bolo' as resume command");

    const resumeCheck2 = core.checkExplicitSilenceCommand("Dora talk with me");
    assert(resumeCheck2.isResumeCommand, "Correctly identifies 'Dora talk with me' as resume command");
  }

  // TEST 9 — Visual Context Integration (Camera & Screen Vision)
  console.log("\nTEST 9 — Visual Context Integration:");
  {
    const cameraInput: ProactiveEngineInput = {
      isCallActive: true,
      isMuted: false,
      isUserSpeaking: false,
      isDoraSpeaking: false,
      cameraVisualCue: "User working at desk with notebook",
      timeSinceLastUserSpeechMs: 25000,
      timeSinceLastDoraSpeechMs: 30000,
      timeSinceLastProactiveTurnMs: 30000,
    };
    const camDecision = core.evaluate(cameraInput);
    assert(camDecision.shouldInitiate, "Triggers visual observation on camera");
    assert(camDecision.payload?.triggerType === "VISUAL_OBSERVATION", "Trigger type is VISUAL_OBSERVATION");
    assert(camDecision.payload?.contextHint.includes("Camera view"), "Context hint includes Camera view");

    const screenInput: ProactiveEngineInput = {
      isCallActive: true,
      isMuted: false,
      isUserSpeaking: false,
      isDoraSpeaking: false,
      screenVisualCue: "VSCode React coding session",
      timeSinceLastUserSpeechMs: 25000,
      timeSinceLastDoraSpeechMs: 30000,
      timeSinceLastProactiveTurnMs: 30000,
    };
    const screenDecision = core.evaluate(screenInput);
    assert(screenDecision.shouldInitiate, "Triggers screen activity observation");
    assert(screenDecision.payload?.triggerType === "SCREEN_ACTIVITY", "Trigger type is SCREEN_ACTIVITY");
  }

  // TEST 10 — Mute State Pauses Proactive Triggers
  console.log("\nTEST 10 — Mute State Pauses Proactive Triggers:");
  {
    const mutedInput: ProactiveEngineInput = {
      isCallActive: true,
      isMuted: true, // User is muted
      isUserSpeaking: false,
      isDoraSpeaking: false,
      timeSinceLastUserSpeechMs: 40000,
      timeSinceLastDoraSpeechMs: 40000,
      timeSinceLastProactiveTurnMs: 40000,
    };
    const decision = core.evaluate(mutedInput);
    assert(!decision.shouldInitiate, "Engine does NOT trigger while muted");
  }

  console.log("\n========================================================");
  console.log("ALL 10 PROACTIVE COMPANION ENGINE TESTS PASSED SUCCESSFULLY! ✓");
  console.log("========================================================\n");
}
