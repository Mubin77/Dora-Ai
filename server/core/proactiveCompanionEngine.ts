/**
 * Dora Proactive Companion Engine (Server-side / Core)
 * 
 * Implements deterministic decision rules and proactive conversational trigger generation:
 * - Evaluates silence intervals, user speech state, explicit silence commands, and cooldowns.
 * - Formulates authentic, non-assistant Banglish prompt directives for Gemini Live turns.
 * - Enforces zero interruptions during user turns.
 */

export type ProactiveEngineState =
  | "IDLE"
  | "MONITORING"
  | "EVALUATING"
  | "COOLDOWN"
  | "SILENCED"
  | "TRIGGERING";

export type ProactiveTriggerType =
  | "GENTLE_SILENCE_CHECKIN"
  | "VISUAL_OBSERVATION"
  | "SCREEN_ACTIVITY"
  | "TOPIC_RESUMPTION"
  | "EMOTIONAL_CHECKIN";

export interface ProactiveTriggerPayload {
  triggerType: ProactiveTriggerType;
  promptInstruction: string;
  contextHint: string;
  timestamp: number;
}

export interface ProactiveEngineInput {
  isCallActive: boolean;
  isMuted: boolean;
  isUserSpeaking: boolean;
  isDoraSpeaking: boolean;
  timeSinceLastUserSpeechMs: number;
  timeSinceLastDoraSpeechMs: number;
  timeSinceLastProactiveTurnMs: number;
  lastUserMessage?: string;
  isExplicitSilenceActive?: boolean;
  cameraVisualCue?: string;
  screenVisualCue?: string;
  activeTopic?: string;
}

export interface ProactiveEngineDecision {
  shouldInitiate: boolean;
  state: ProactiveEngineState;
  reason: string;
  payload?: ProactiveTriggerPayload;
}

export class ProactiveCompanionCore {
  private static instance: ProactiveCompanionCore;

  // Thresholds (ms)
  public readonly SILENCE_THRESHOLD_MS = 18000;
  public readonly PROACTIVE_COOLDOWN_MS = 25000;

  // Regex patterns
  private readonly CHUP_REGEX =
    /\b(?:dora\s+)?(?:chup\s*(?:thak|thako|kor|koro)?|chup|shanto\s*thak|stay\s*silent|be\s*quiet|quiet\s*please|shut\s*up|stop\s*talking|shh+|don'?t\s*speak|don'?t\s*talk|chupchap\s*thako?)\b/i;

  private readonly RESUME_SPEAKING_REGEX =
    /\b(?:dora\s+)?(?:kotha\s*bolo|kotha\s*bol|speak\s*to\s*me|talk\s*with\s*me|shathe\s*thako|start\s*talking|you\s*can\s*speak|bolo)\b/i;

  private readonly FOCUS_REGEX =
    /\b(?:dora\s+)?(?:focus|kaj\s*kori|kaj\s*kortesi|working\s*now|deep\s*work|quiet\s*mode|don'?t\s*disturb|dnd)\b/i;

  public static getInstance(): ProactiveCompanionCore {
    if (!ProactiveCompanionCore.instance) {
      ProactiveCompanionCore.instance = new ProactiveCompanionCore();
    }
    return ProactiveCompanionCore.instance;
  }

  public checkExplicitSilenceCommand(userText: string): { isSilenceCommand: boolean; isResumeCommand: boolean } {
    const trimmed = (userText || "").trim();
    if (!trimmed) return { isSilenceCommand: false, isResumeCommand: false };

    const isSilenceCommand = this.CHUP_REGEX.test(trimmed) || this.FOCUS_REGEX.test(trimmed);
    const isResumeCommand = this.RESUME_SPEAKING_REGEX.test(trimmed);

    return { isSilenceCommand, isResumeCommand };
  }

  public evaluate(input: ProactiveEngineInput): ProactiveEngineDecision {
    if (!input.isCallActive) {
      return {
        shouldInitiate: false,
        state: "IDLE",
        reason: "Call is not active.",
      };
    }

    if (input.isMuted) {
      return {
        shouldInitiate: false,
        state: "COOLDOWN",
        reason: "Microphone is muted.",
      };
    }

    if (input.isUserSpeaking) {
      return {
        shouldInitiate: false,
        state: "MONITORING",
        reason: "User is currently speaking; never interrupt the user.",
      };
    }

    if (input.isDoraSpeaking) {
      return {
        shouldInitiate: false,
        state: "COOLDOWN",
        reason: "Dora is currently speaking.",
      };
    }

    if (input.isExplicitSilenceActive) {
      return {
        shouldInitiate: false,
        state: "SILENCED",
        reason: "User explicitly requested silence ('chup thak' / 'focus').",
      };
    }

    // Cooldown check
    if (
      input.timeSinceLastDoraSpeechMs < this.PROACTIVE_COOLDOWN_MS ||
      input.timeSinceLastProactiveTurnMs < this.PROACTIVE_COOLDOWN_MS
    ) {
      return {
        shouldInitiate: false,
        state: "COOLDOWN",
        reason: "Proactive cooldown timer active.",
      };
    }

    // Silence duration check
    if (input.timeSinceLastUserSpeechMs < this.SILENCE_THRESHOLD_MS) {
      return {
        shouldInitiate: false,
        state: "MONITORING",
        reason: `Silence duration (${input.timeSinceLastUserSpeechMs}ms) has not met threshold (${this.SILENCE_THRESHOLD_MS}ms).`,
      };
    }

    // Determine trigger type and prompt
    let triggerType: ProactiveTriggerType = "GENTLE_SILENCE_CHECKIN";
    let promptInstruction = "";
    let contextHint = "";

    if (input.cameraVisualCue) {
      triggerType = "VISUAL_OBSERVATION";
      contextHint = `Camera view: ${input.cameraVisualCue}`;
      promptInstruction =
        `[PROACTIVE COMPANION INITIATION: User is on camera and has been quiet. ` +
        `As Dora, give a very short, warm Banglish companion comment about what you see or check in casually (1 short sentence). Avoid formal assistant phrasing.]`;
    } else if (input.screenVisualCue) {
      triggerType = "SCREEN_ACTIVITY";
      contextHint = `Screen share: ${input.screenVisualCue}`;
      promptInstruction =
        `[PROACTIVE COMPANION INITIATION: User is sharing screen and has been quiet. ` +
        `As Dora, make a very short, natural 1-sentence comment about the screen activity in authentic Banglish.]`;
    } else if (input.activeTopic) {
      triggerType = "TOPIC_RESUMPTION";
      contextHint = `Topic: ${input.activeTopic}`;
      promptInstruction =
        `[PROACTIVE COMPANION INITIATION: User has been quiet. ` +
        `As Dora, follow up naturally on previous thought "${input.activeTopic}" in 1 short, warm Banglish sentence without pestering.]`;
    } else {
      triggerType = "GENTLE_SILENCE_CHECKIN";
      contextHint = "Silence check-in";
      promptInstruction =
        `[PROACTIVE COMPANION INITIATION: User has been quiet for a moment. ` +
        `As Dora, give a very short, warm, authentic Bangladeshi companion check-in (1 short sentence in natural Banglish). Avoid formal assistant clichés.]`;
    }

    return {
      shouldInitiate: true,
      state: "TRIGGERING",
      reason: "All conditions met for proactive companion speech.",
      payload: {
        triggerType,
        promptInstruction,
        contextHint,
        timestamp: Date.now(),
      },
    };
  }
}

export const proactiveCompanionCore = ProactiveCompanionCore.getInstance();
