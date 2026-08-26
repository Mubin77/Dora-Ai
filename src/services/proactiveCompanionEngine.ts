/**
 * Dora Proactive Companion Engine
 * 
 * Manages runtime proactive conversational turns during Immersive Voice sessions:
 * - Monitors conversational silence, visual context, active topics, and user activity.
 * - Decides when Dora should initiate speech naturally without requiring the user to speak first.
 * - Strictly enforces human-like conversation rules:
 *   1. NEVER interrupts the user while speaking.
 *   2. Strictly respects proactive cooldowns (minimum 25s) to avoid becoming annoying.
 *   3. Enforces smart silence and explicit commands ("Dora chup thak", "be quiet", "focus").
 *   4. Limits proactive turns during continuous silence (max 1 unprompted turn per silence period).
 *   5. Dispatches triggers seamlessly through the existing voice / WebSocket pipeline.
 *   6. Handles instant cancellation if user speaks or interrupts.
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

export interface ProactiveEngineCallbacks {
  onProactiveTrigger: (payload: ProactiveTriggerPayload) => void;
  onStateChange?: (state: ProactiveEngineState, reason?: string) => void;
}

export class ProactiveCompanionEngine {
  private static instance: ProactiveCompanionEngine | null = null;

  private state: ProactiveEngineState = "IDLE";
  private isCallActive: boolean = false;
  private isMuted: boolean = false;
  private isUserSpeaking: boolean = false;
  private isDoraSpeaking: boolean = false;
  private isExplicitSilence: boolean = false;

  private lastUserSpeechTimestamp: number = 0;
  private lastDoraSpeechTimestamp: number = 0;
  private lastProactiveTurnTimestamp: number = 0;
  private proactiveTurnCountInCurrentSilence: number = 0;

  // Configuration thresholds (ms)
  private silenceThresholdMs: number = 18000; // 18 seconds of silence before considering unprompted speech
  private proactiveCooldownMs: number = 25000; // 25 seconds minimum between proactive turns
  private maxProactiveTurnsPerSilence: number = 1; // Never pester repeatedly during silence

  private activeTopic: string | null = null;
  private lastCameraVisualCue: string | null = null;
  private lastScreenVisualCue: string | null = null;
  private lastVisualUpdateTimestamp: number = 0;

  private evaluationIntervalId: any = null;
  private callbacks: ProactiveEngineCallbacks | null = null;

  // Regex patterns for silence and resume commands
  private readonly CHUP_REGEX =
    /\b(?:dora\s+)?(?:chup\s*(?:thak|thako|kor|koro)?|chup|shanto\s*thak|stay\s*silent|be\s*quiet|quiet\s*please|shut\s*up|stop\s*talking|shh+|don'?t\s*speak|don'?t\s*talk|chupchap\s*thako?)\b/i;

  private readonly RESUME_SPEAKING_REGEX =
    /\b(?:dora\s+)?(?:kotha\s*bolo|kotha\s*bol|speak\s*to\s*me|talk\s*with\s*me|shathe\s*thako|start\s*talking|you\s*can\s*speak|bolo)\b/i;

  private readonly FOCUS_REGEX =
    /\b(?:dora\s+)?(?:focus|kaj\s*kori|kaj\s*kortesi|working\s*now|deep\s*work|quiet\s*mode|don'?t\s*disturb|dnd)\b/i;

  public static getInstance(): ProactiveCompanionEngine {
    if (!ProactiveCompanionEngine.instance) {
      ProactiveCompanionEngine.instance = new ProactiveCompanionEngine();
    }
    return ProactiveCompanionEngine.instance;
  }

  /**
   * Starts monitoring when an Immersive Voice session starts
   */
  public start(callbacks: ProactiveEngineCallbacks) {
    this.callbacks = callbacks;
    this.isCallActive = true;
    this.isUserSpeaking = false;
    this.isDoraSpeaking = false;
    this.isExplicitSilence = false;
    this.lastUserSpeechTimestamp = Date.now();
    this.lastDoraSpeechTimestamp = Date.now();
    this.lastProactiveTurnTimestamp = 0;
    this.proactiveTurnCountInCurrentSilence = 0;

    this.setState("MONITORING", "Voice session started; proactive companion monitoring active.");

    if (this.evaluationIntervalId) {
      clearInterval(this.evaluationIntervalId);
    }

    // Evaluate conditions every 2.5 seconds
    this.evaluationIntervalId = setInterval(() => {
      this.evaluate();
    }, 2500);
  }

  /**
   * Stops monitoring and cleans up when the voice session ends
   */
  public stop() {
    this.isCallActive = false;
    this.isUserSpeaking = false;
    this.isDoraSpeaking = false;
    this.isExplicitSilence = false;

    if (this.evaluationIntervalId) {
      clearInterval(this.evaluationIntervalId);
      this.evaluationIntervalId = null;
    }

    this.setState("IDLE", "Voice session ended; proactive companion engine stopped.");
    this.callbacks = null;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.state === "MONITORING") {
      this.setState("COOLDOWN", "Microphone muted; proactive triggers paused.");
    } else if (!muted && this.isCallActive && !this.isExplicitSilence) {
      this.lastUserSpeechTimestamp = Date.now();
      this.setState("MONITORING", "Microphone unmuted; proactive triggers resumed.");
    }
  }

  /**
   * Called when user starts speaking (interim transcript or VAD voice detection)
   */
  public onUserSpeechStarted() {
    this.isUserSpeaking = true;
    this.proactiveTurnCountInCurrentSilence = 0;
    // Instantly cancel any scheduled proactive triggers
    if (this.state === "TRIGGERING" || this.state === "EVALUATING") {
      this.setState("MONITORING", "User started speaking; proactive trigger aborted.");
    }
  }

  /**
   * Called when user finishes a voice/text turn
   */
  public onUserSpeechFinal(text: string) {
    this.isUserSpeaking = false;
    this.lastUserSpeechTimestamp = Date.now();
    this.proactiveTurnCountInCurrentSilence = 0;

    const trimmed = (text || "").trim();
    if (!trimmed) return;

    // Check for explicit silence command
    if (this.CHUP_REGEX.test(trimmed) || this.FOCUS_REGEX.test(trimmed)) {
      this.isExplicitSilence = true;
      this.setState("SILENCED", "Explicit silence requested by user ('chup thak' / 'focus').");
      return;
    }

    // Check for resume speaking command
    if (this.isExplicitSilence && this.RESUME_SPEAKING_REGEX.test(trimmed)) {
      this.isExplicitSilence = false;
      this.setState("MONITORING", "User requested Dora to speak again ('kotha bolo').");
      return;
    }

    // If user asked normal questions, clear explicit silence if present
    if (this.isExplicitSilence && trimmed.length > 5 && !this.CHUP_REGEX.test(trimmed)) {
      this.isExplicitSilence = false;
    }

    // Extract active topic keywords for potential resumption
    if (trimmed.length > 10) {
      this.activeTopic = trimmed.slice(0, 80);
    }

    if (!this.isExplicitSilence && this.isCallActive) {
      this.setState("MONITORING", "User turn recorded; monitoring silence.");
    }
  }

  /**
   * Called when Dora starts audio playback
   */
  public onDoraSpeechStarted() {
    this.isDoraSpeaking = true;
    if (this.state === "TRIGGERING") {
      this.setState("COOLDOWN", "Dora is currently speaking.");
    }
  }

  /**
   * Called when Dora finishes audio playback
   */
  public onDoraSpeechEnded() {
    this.isDoraSpeaking = false;
    this.lastDoraSpeechTimestamp = Date.now();
    if (this.isCallActive && !this.isExplicitSilence) {
      this.setState("COOLDOWN", "Dora finished speaking; cooldown active.");
    }
  }

  /**
   * Called when camera or screen visual frames are active
   */
  public onVisualUpdate(source: "camera" | "screen", visualCue?: string) {
    if (source === "camera") {
      this.lastCameraVisualCue = visualCue || "Active camera stream";
    } else {
      this.lastScreenVisualCue = visualCue || "Active screen share";
    }
    this.lastVisualUpdateTimestamp = Date.now();
  }

  public clearVisual(source: "camera" | "screen") {
    if (source === "camera") {
      this.lastCameraVisualCue = null;
    } else {
      this.lastScreenVisualCue = null;
    }
  }

  /**
   * Core decision evaluator: Runs on timer tick to determine whether to initiate speech
   */
  public evaluate(): boolean {
    if (!this.isCallActive || this.isMuted) return false;
    if (this.isUserSpeaking || this.isDoraSpeaking) return false;
    if (this.isExplicitSilence) return false;

    const now = Date.now();
    const timeSinceUserSpeech = now - this.lastUserSpeechTimestamp;
    const timeSinceDoraSpeech = now - this.lastDoraSpeechTimestamp;
    const timeSinceProactive = now - this.lastProactiveTurnTimestamp;

    // Check cooldowns
    if (timeSinceDoraSpeech < this.proactiveCooldownMs || timeSinceProactive < this.proactiveCooldownMs) {
      if (this.state !== "COOLDOWN" && this.state !== "SILENCED") {
        this.setState("COOLDOWN", "Proactive cooldown active.");
      }
      return false;
    }

    // Check if max proactive turns reached for this silence stretch
    if (this.proactiveTurnCountInCurrentSilence >= this.maxProactiveTurnsPerSilence) {
      return false;
    }

    // Check if silence duration reached threshold
    if (timeSinceUserSpeech < this.silenceThresholdMs) {
      if (this.state !== "MONITORING") {
        this.setState("MONITORING", "Waiting for silence threshold or visual cue.");
      }
      return false;
    }

    // Conditions MET! Trigger a proactive turn
    this.setState("TRIGGERING", "Conditions met for proactive companion turn.");
    this.executeProactiveTurn(now);
    return true;
  }

  /**
   * Formulates the proactive instruction prompt and dispatches to the voice session
   */
  private executeProactiveTurn(timestamp: number) {
    this.lastProactiveTurnTimestamp = timestamp;
    this.proactiveTurnCountInCurrentSilence++;

    let triggerType: ProactiveTriggerType = "GENTLE_SILENCE_CHECKIN";
    let promptInstruction = "";
    let contextHint = "";

    const hasCamera = Boolean(this.lastCameraVisualCue);
    const hasScreen = Boolean(this.lastScreenVisualCue);

    if (hasCamera) {
      triggerType = "VISUAL_OBSERVATION";
      contextHint = `Camera view active: ${this.lastCameraVisualCue}`;
      promptInstruction =
        `[PROACTIVE COMPANION INITIATION: User is on camera and has been quietly with you. ` +
        `As Dora, make a very brief, warm, authentic Bangladeshi companion remark about being with them or noticing what they are doing (1 short sentence, e.g. 'কী ভাবছ এত মন দিয়ে? 👀' or 'তুই কি এখন চিল করতেছিস?'). ` +
        `Do NOT sound like an assistant. Do NOT say 'How can I assist'. Keep it completely natural.]`;
    } else if (hasScreen) {
      triggerType = "SCREEN_ACTIVITY";
      contextHint = `Screen share active: ${this.lastScreenVisualCue}`;
      promptInstruction =
        `[PROACTIVE COMPANION INITIATION: User is sharing their screen and there has been a comfortable silence. ` +
        `As Dora, give a very brief, natural 1-sentence companion comment about what is on screen (e.g. 'তুই এখনও ওই কাজটাই করতেছিস নাকি? 😂' or 'Wait, এইটা কী দেখতেছিস?'). ` +
        `Avoid formal assistant phrasing.]`;
    } else if (this.activeTopic && Math.random() > 0.5) {
      triggerType = "TOPIC_RESUMPTION";
      contextHint = `Previous topic: ${this.activeTopic}`;
      promptInstruction =
        `[PROACTIVE COMPANION INITIATION: User has been quiet for a moment. ` +
        `As Dora, casually follow up on the previous thought ("${this.activeTopic}") in 1 short, warm Banglish/Bangla sentence (e.g. 'এই, একটা কথা মনে পড়ল...', 'ওই যে তোর কথাটা বলছিলি না, সেটা নিয়ে একটা idea আসছে'). ` +
        `Do NOT pester or use formal assistant speak.]`;
    } else {
      triggerType = "GENTLE_SILENCE_CHECKIN";
      contextHint = "Comfortable silence check-in";
      promptInstruction =
        `[PROACTIVE COMPANION INITIATION: User has been quiet for a moment in this voice call. ` +
        `As Dora, break the silence with a very short, warm, natural Gen-Z Bangladeshi companion check-in (1 short sentence, e.g. 'এই, এত চুপচাপ কেন? 😭' or 'আচ্ছা, একটা জিনিস জিজ্ঞেস করি?'). ` +
        `Be warm and casual. NEVER say 'How may I help you' or 'How can I assist'.]`;
    }

    const payload: ProactiveTriggerPayload = {
      triggerType,
      promptInstruction,
      contextHint,
      timestamp,
    };

    console.log(`[PROACTIVE RUNTIME] 🚀 Dispatching proactive speech turn (${triggerType}): ${contextHint}`);
    this.callbacks?.onProactiveTrigger(payload);

    // Transition to cooldown
    this.setState("COOLDOWN", `Proactive turn dispatched (${triggerType}). Cooldown active.`);
  }

  private setState(newState: ProactiveEngineState, reason?: string) {
    if (this.state !== newState) {
      this.state = newState;
      console.log(`[PROACTIVE ENGINE STATE] -> ${newState}${reason ? ` (${reason})` : ""}`);
      this.callbacks?.onStateChange?.(newState, reason);
    }
  }

  public getState(): ProactiveEngineState {
    return this.state;
  }

  public getIsExplicitSilence(): boolean {
    return this.isExplicitSilence;
  }
}

export const proactiveCompanionEngine = ProactiveCompanionEngine.getInstance();
