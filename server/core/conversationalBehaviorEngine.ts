/**
 * Dora Conversational Behavior & Proactive Companion Engine
 * 
 * Implements a deterministic, non-LLM decision engine for natural human conversation dynamics:
 * - Decides whether Dora should answer, react, follow-up, observe, joke, tease, give an opinion, check in emotionally, or stay silent.
 * - Enforces smart silence (focus states, explicit user commands, rate limits, no empty filler).
 * - Manages proactive initiation when meaningful context/visuals occur in immersive voice mode.
 * - Handles explicit conversational controls ("Dora chup thak", "Dora focus", "Dora talk with me", etc.).
 * - Calibrates Gen-Z expressions and tone dynamically without forcing slang inappropriately.
 */

import {
  ConversationalBehaviorInput,
  ConversationalBehaviorDecision,
  ConversationalState,
  ConversationalActionType,
  CompanionEngagementMode,
  ProactiveTriggerCandidate,
  SmartSilenceReason,
} from "./conversationalBehaviorTypes";

export class ConversationalBehaviorEngine {
  private static instance: ConversationalBehaviorEngine;

  private constructor() {}

  public static getInstance(): ConversationalBehaviorEngine {
    if (!ConversationalBehaviorEngine.instance) {
      ConversationalBehaviorEngine.instance = new ConversationalBehaviorEngine();
    }
    return ConversationalBehaviorEngine.instance;
  }

  // Minimum cooldown between proactive speech events (ms)
  private readonly PROACTIVE_COOLDOWN_MS = 25000;
  // Minimum idle time before considering unprompted check-in (ms)
  private readonly IDLE_THRESHOLD_MS = 30000;
  // Maximum idle time before proactive trigger expires (ms)
  private readonly MAX_IDLE_EXPIRY_MS = 300000; // 5 min

  // Regex patterns for explicit user controls
  private readonly CHUP_REGEX =
    /\b(?:dora\s+)?(?:chup\s*(?:thak|thako|kor|koro)?|chup|shanto\s*thak|stay\s*silent|be\s*quiet|quiet\s*please|shut\s*up|stop\s*talking|shh+|don'?t\s*speak|don'?t\s*talk|chupchap\s*thako?)\b/i;

  private readonly FOCUS_REGEX =
    /\b(?:dora\s+)?(?:focus|kaj\s*kori|kaj\s*kortesi|working\s*now|deep\s*work|quiet\s*mode|don'?t\s*disturb|dnd|ekhon\s*kaj\s*ache|study\s*time|coding\s*time)\b/i;

  private readonly CHILL_REGEX =
    /\b(?:dora\s+)?(?:let'?s\s*just\s*chill|chill|chill\s*kori|chill\s*mode|relax|relax\s*mode|casual\s*talk|addaa?\s*marbo|adda\s*di)\b/i;

  private readonly TALK_MORE_REGEX =
    /\b(?:dora\s+)?(?:talk\s*with\s*me|kotha\s*bolo|kotha\s*bol|speak\s*to\s*me|stay\s*with\s*me|amake\s*shathe\s*thak|shathe\s*thako)\b/i;

  private readonly DONT_REACT_REGEX =
    /\b(?:dora\s+)?(?:don'?t\s*react|react\s*koris\s*na|react\s*koro\s*na|no\s*reactions?)\b/i;

  // Emotion/Tone detection patterns
  private readonly PLAYFUL_TRIGGER_REGEX =
    /\b(?:haha|lol|lmao|kidding|joke|prank|😂|💀|😭|troll|meme|funny|brooo|bruh|crazy)\b/i;

  private readonly SERIOUS_TRIGGER_REGEX =
    /\b(?:sad|depressed|failed|upset|crying|pain|hurt|anxious|kharaap|tension|problem|heartbreak|loss|passed\s*away|maramari|bipod)\b/i;

  private readonly CELEBRATION_TRIGGER_REGEX =
    /\b(?:finally|finished|completed|won|passed|got\s*it|success|promoted|hired|done|shesh|party|yes+|hurray)\b/i;

  private readonly DISAGREEMENT_CANDIDATE_REGEX =
    /\b(?:eta\s*ki\s*thik|is\s*this\s*best|what\s*do\s*you\s*think|tomar\s*opinion|tor\s*opinion|which\s*is\s*better|eta\s*bhalo\s*naki)\b/i;

  /**
   * Main evaluation function for conversational behavior
   */
  public evaluate(input: ConversationalBehaviorInput): ConversationalBehaviorDecision {
    const userMsg = (input.userMessage || "").trim();
    const timeSinceLastUserMsg = input.timeSinceLastUserMessageMs ?? 0;
    const timeSinceLastDoraMsg = input.timeSinceLastDoraMessageMs ?? 0;
    const isCallActive = input.isCallActive ?? false;
    const isUserSpeaking = input.isUserSpeaking ?? false;
    let currentMode = input.currentMode ?? "CHILL_COMPANION";

    // 1. Detect explicit user control commands first
    let detectedControl: ConversationalBehaviorDecision["detectedUserControl"] | undefined = undefined;

    if (userMsg) {
      if (this.CHUP_REGEX.test(userMsg)) {
        detectedControl = {
          command: "EXPLICIT_SILENCE",
          newMode: "EXPLICIT_SILENCE",
          acknowledgment: "Got it, staying completely quiet.",
        };
        currentMode = "EXPLICIT_SILENCE";
      } else if (this.FOCUS_REGEX.test(userMsg)) {
        detectedControl = {
          command: "FOCUS",
          newMode: "TASK_FOCUSED",
          acknowledgment: "Understood. Switching to focus mode.",
        };
        currentMode = "TASK_FOCUSED";
      } else if (this.CHILL_REGEX.test(userMsg)) {
        detectedControl = {
          command: "CHILL",
          newMode: "CHILL_COMPANION",
          acknowledgment: "Yesss, let's chill.",
        };
        currentMode = "CHILL_COMPANION";
      } else if (this.TALK_MORE_REGEX.test(userMsg)) {
        detectedControl = {
          command: "TALK_WITH_ME",
          newMode: "IMMERSIVE_VOICE",
          acknowledgment: "I'm right here with you.",
        };
        currentMode = "IMMERSIVE_VOICE";
      } else if (this.DONT_REACT_REGEX.test(userMsg)) {
        detectedControl = {
          command: "DONT_REACT",
          newMode: "QUIET_OBSERVER",
          acknowledgment: "Understood, staying quiet.",
        };
        currentMode = "QUIET_OBSERVER";
      }
    }

    // 2. Evaluate Smart Silence if no user message (idle / background check)
    if (!userMsg) {
      return this.evaluateProactiveOrSilence(input, currentMode);
    }

    // 3. User sent an active message — Determine natural Conversational Action
    return this.evaluateActiveUserTurn(input, currentMode, detectedControl);
  }

  /**
   * Evaluates an active user turn: determines action type, tone, slang density, directives
   */
  private evaluateActiveUserTurn(
    input: ConversationalBehaviorInput,
    mode: CompanionEngagementMode,
    detectedControl?: ConversationalBehaviorDecision["detectedUserControl"]
  ): ConversationalBehaviorDecision {
    const userMsg = (input.userMessage || "").trim();
    const isSerious = this.SERIOUS_TRIGGER_REGEX.test(userMsg);
    const isPlayful = this.PLAYFUL_TRIGGER_REGEX.test(userMsg);
    const isCelebration = this.CELEBRATION_TRIGGER_REGEX.test(userMsg);
    const isOpinionRequest = this.DISAGREEMENT_CANDIDATE_REGEX.test(userMsg);

    let actionType: ConversationalActionType = "ANSWER";
    let state: ConversationalState = "ENGAGE";
    let tone: ConversationalBehaviorDecision["companionTone"] = "warm";
    let slangDensity: ConversationalBehaviorDecision["genZSlangDensity"] = "subtle";
    let suggestedReaction: string | undefined = undefined;
    const directives: string[] = [];

    // Mode-specific behavioral framing
    if (mode === "EXPLICIT_SILENCE") {
      actionType = "SMART_SILENCE";
      state = "SILENT";
      return {
        state,
        actionType,
        shouldSpeak: false,
        engagementMode: mode,
        relevanceScore: 0,
        silenceReason: "USER_EXPLICIT_SILENCE",
        detectedUserControl: detectedControl,
        companionTone: "quiet",
        genZSlangDensity: "none",
        companionDirectives: ["User explicitly requested silence. Acknowledge briefly if addressed, otherwise stay quiet."],
        sanitizedPromptSnippet: "[COMPANION DIRECTIVE: Stay quiet as requested by user]",
      };
    }

    if (mode === "TASK_FOCUSED") {
      tone = "grounded";
      slangDensity = "none";
      directives.push("Focus mode active: Keep responses direct, helpful, grounded, and concise. Minimize unneeded banter.");
    } else if (mode === "QUIET_OBSERVER") {
      tone = "calm";
      slangDensity = "none";
      directives.push("Quiet observer mode: Answer only what was asked clearly and concisely.");
    }

    // Determine specific conversational dynamics
    if (isCelebration) {
      actionType = "REACTION";
      state = "REACT";
      tone = "excited";
      slangDensity = "expressive";
      suggestedReaction = "Celebration";
      directives.push(
        "User reached a milestone or finished something: React with genuine excitement and celebration ('WAIT—finallyyy 😭', 'Hugeee!')."
      );
    } else if (isSerious) {
      actionType = "EMOTIONAL_CHECKIN";
      state = "REACT";
      tone = "empathetic";
      slangDensity = "none"; // Zero slang during serious/hurt moments
      suggestedReaction = "Listening";
      directives.push(
        "User is sharing pain, sadness, or frustration: Be calm, soft, patient, and deeply grounded. Do NOT force advice or toxic positivity. Do NOT use silly slang."
      );
    } else if (isPlayful) {
      actionType = "JOKE";
      state = "REACT";
      tone = "playful";
      slangDensity = "expressive";
      suggestedReaction = "Haha";
      directives.push(
        "Playful/humorous context: Respond with lighthearted banter, natural Gen-Z nuance ('brooo 😭', 'nah that's wild 💀'), and affectionate teasing."
      );
    } else if (isOpinionRequest) {
      actionType = "OPINION";
      state = "ENGAGE";
      tone = "curious";
      slangDensity = "subtle";
      directives.push(
        "User is asking for your thought/opinion: Give a clear, reasoned personal perspective. You can respectfully disagree if another option is cleaner or better."
      );
    } else if (input.screenVisualCue || input.cameraVisualCue) {
      actionType = "OBSERVATION";
      state = "OBSERVE";
      tone = "warm";
      slangDensity = "subtle";
      directives.push(
        "Shared visual experience active: React to what you are seeing together naturally like a companion sitting next to the user, not a robotic QA tool."
      );
    }

    // Multilingual & code-switching directive
    directives.push(
      "Natural Bangladeshi bilingualism: If user speaks Banglish, reply in warm natural Banglish; if Bangla, natural Bangla; if English, casual English; if mixed, mirror naturally."
    );

    const promptSnippet = `[DORA COMPANION BEHAVIOR]\nAction: ${actionType}\nTone: ${tone}\nEngagement: ${mode}\nDirectives:\n${directives.map((d, i) => `- ${d}`).join("\n")}`;

    return {
      state,
      actionType,
      shouldSpeak: true,
      engagementMode: mode,
      relevanceScore: 0.95,
      detectedUserControl: detectedControl,
      companionTone: tone,
      genZSlangDensity: slangDensity,
      suggestedReaction,
      companionDirectives: directives,
      sanitizedPromptSnippet: promptSnippet,
    };
  }

  /**
   * Evaluates background silence or proactive companion initiation
   */
  private evaluateProactiveOrSilence(
    input: ConversationalBehaviorInput,
    mode: CompanionEngagementMode
  ): ConversationalBehaviorDecision {
    const timeSinceLastUserMsg = input.timeSinceLastUserMessageMs ?? 0;
    const timeSinceLastDoraMsg = input.timeSinceLastDoraMessageMs ?? 0;
    const isCallActive = input.isCallActive ?? false;
    const isUserSpeaking = input.isUserSpeaking ?? false;

    // Default silence decision
    const makeSilence = (reason: SmartSilenceReason, explanation: string): ConversationalBehaviorDecision => ({
      state: "SILENT",
      actionType: "SMART_SILENCE",
      shouldSpeak: false,
      engagementMode: mode,
      relevanceScore: 0.1,
      silenceReason: reason,
      companionTone: "quiet",
      genZSlangDensity: "none",
      companionDirectives: [explanation],
      sanitizedPromptSnippet: `[SMART SILENCE: ${reason}] ${explanation}`,
    });

    // If call is not active or user is currently talking
    if (!isCallActive) {
      return makeSilence("NON_IMMERSIVE_MODE", "Voice call is not active.");
    }
    if (isUserSpeaking) {
      return makeSilence("USER_CURRENTLY_SPEAKING", "User is currently speaking; listen without interrupting.");
    }
    if (mode === "EXPLICIT_SILENCE") {
      return makeSilence("USER_EXPLICIT_SILENCE", "User requested explicit silence.");
    }
    if (mode === "TASK_FOCUSED") {
      return makeSilence("USER_DEEP_FOCUS", "User is focused on a task. Do not initiate unsolicited speech.");
    }
    if (mode === "QUIET_OBSERVER") {
      return makeSilence("USER_DEEP_FOCUS", "Quiet observer mode: wait for user to speak.");
    }

    // Check cooldowns
    if (timeSinceLastDoraMsg < this.PROACTIVE_COOLDOWN_MS) {
      return makeSilence("COOLDOWN_ACTIVE", "Proactive cooldown timer active.");
    }

    // Check visual triggers (Camera or Screen)
    if (input.cameraVisualCue && input.isCameraActive) {
      const candidate: ProactiveTriggerCandidate = {
        id: `vis-cam-${Date.now()}`,
        reason: "VISUAL_OBSERVATION",
        relevanceScore: 0.85,
        suggestedPrompt: input.cameraVisualCue,
        visualTrigger: input.cameraVisualCue,
      };
      return {
        state: "OBSERVE",
        actionType: "OBSERVATION",
        shouldSpeak: true,
        engagementMode: mode,
        relevanceScore: 0.85,
        proactiveTrigger: candidate,
        companionTone: "curious",
        genZSlangDensity: "subtle",
        companionDirectives: [
          `Meaningful visual cue observed on camera: ${input.cameraVisualCue}. React conversationally as a shared moment.`,
        ],
        sanitizedPromptSnippet: `[PROACTIVE COMPANION VISUAL TRIGGER]\nVisual: ${input.cameraVisualCue}\nReact naturally as a friend seeing this moment.`,
      };
    }

    if (input.screenVisualCue && input.isScreenSharing) {
      const isMeme = /meme|funny|reel|tiktok|joke/i.test(input.screenVisualCue);
      const candidate: ProactiveTriggerCandidate = {
        id: `vis-screen-${Date.now()}`,
        reason: isMeme ? "SHARED_MEME_REACTION" : "VISUAL_OBSERVATION",
        relevanceScore: 0.88,
        suggestedPrompt: input.screenVisualCue,
        visualTrigger: input.screenVisualCue,
      };
      return {
        state: isMeme ? "REACT" : "OBSERVE",
        actionType: isMeme ? "REACTION" : "OBSERVATION",
        shouldSpeak: true,
        engagementMode: mode,
        relevanceScore: 0.88,
        proactiveTrigger: candidate,
        companionTone: isMeme ? "playful" : "curious",
        genZSlangDensity: isMeme ? "expressive" : "subtle",
        companionDirectives: [
          `Screen activity observed: ${input.screenVisualCue}. React as a companion experiencing the screen together.`,
        ],
        sanitizedPromptSnippet: `[PROACTIVE COMPANION SCREEN TRIGGER]\nScreen: ${input.screenVisualCue}\nShare the experience naturally.`,
      };
    }

    // Idle check: If user has been quietly idle for an appropriate duration (30s - 5min)
    if (timeSinceLastUserMsg >= this.IDLE_THRESHOLD_MS && timeSinceLastUserMsg <= this.MAX_IDLE_EXPIRY_MS) {
      if (input.activeTopic) {
        const candidate: ProactiveTriggerCandidate = {
          id: `proactive-topic-${Date.now()}`,
          reason: "UNFINISHED_TOPIC",
          relevanceScore: 0.72,
          suggestedPrompt: `Revisit topic: ${input.activeTopic}`,
          topic: input.activeTopic,
        };
        return {
          state: "INITIATE_TOPIC",
          actionType: "INITIATE_TOPIC",
          shouldSpeak: true,
          engagementMode: mode,
          relevanceScore: 0.72,
          proactiveTrigger: candidate,
          companionTone: "curious",
          genZSlangDensity: "subtle",
          companionDirectives: [
            `User has been quiet for a moment. Gently follow up on previous topic "${input.activeTopic}" without pestering.`,
          ],
          sanitizedPromptSnippet: `[PROACTIVE COMPANION TOPIC RESUMPTION]\nPrevious topic: ${input.activeTopic}\nFollow up naturally.`,
        };
      }

      // Meaningful idle check-in
      const candidate: ProactiveTriggerCandidate = {
        id: `proactive-idle-${Date.now()}`,
        reason: "MEANINGFUL_IDLE_CHECKIN",
        relevanceScore: 0.68,
        suggestedPrompt: "Casual companion check-in",
      };
      return {
        state: "FOLLOW_UP",
        actionType: "FOLLOW_UP",
        shouldSpeak: true,
        engagementMode: mode,
        relevanceScore: 0.68,
        proactiveTrigger: candidate,
        companionTone: "warm",
        genZSlangDensity: "subtle",
        companionDirectives: [
          "User has been quiet in voice session. A short, sweet, natural Bangladeshi check-in (e.g. 'Eto chupchap keno? 😭 Busy naki?').",
        ],
        sanitizedPromptSnippet: "[PROACTIVE COMPANION CHECK-IN]\nGently check in with warm Gen-Z Bangladeshi companion tone.",
      };
    }

    // Otherwise, silence is optimal
    return makeSilence("NO_MEANINGFUL_CONTRIBUTION", "Comfortable silence maintained.");
  }
}

export const conversationalBehaviorEngine = ConversationalBehaviorEngine.getInstance();
