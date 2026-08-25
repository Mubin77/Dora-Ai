/**
 * Dora Conversational Behavior & Proactive Companion Types
 * 
 * Defines the core types for Dora's Gen-Z Bangladeshi companion intelligence,
 * proactive conversation triggers, smart silence conditions, and natural human conversational actions.
 */

export type ConversationalState = 
  | "ENGAGE"
  | "WAIT"
  | "SILENT"
  | "REACT"
  | "FOLLOW_UP"
  | "OBSERVE"
  | "SUGGEST"
  | "INITIATE_TOPIC";

export type ConversationalActionType =
  | "ANSWER"
  | "REACTION"
  | "FOLLOW_UP"
  | "OBSERVATION"
  | "SUGGESTION"
  | "OPINION"
  | "JOKE"
  | "TEASING"
  | "EMOTIONAL_CHECKIN"
  | "INITIATE_TOPIC"
  | "SMART_SILENCE";

export type CompanionEngagementMode =
  | "CHILL_COMPANION"     // Casual, conversational, playful, high warmth
  | "TASK_FOCUSED"        // Grounded, direct, minimal banter, high accuracy
  | "QUIET_OBSERVER"      // Minimal unprompted talking, stays silent unless addressed
  | "IMMERSIVE_VOICE"     // Full proactive companion presence with visual awareness
  | "EXPLICIT_SILENCE";   // User asked Dora to be quiet ("chup thak")

export type ProactiveInitiationReason =
  | "UNFINISHED_TOPIC"
  | "VISUAL_OBSERVATION"
  | "EMOTIONAL_STATE_CHANGE"
  | "MEANINGFUL_IDLE_CHECKIN"
  | "PLAYFUL_THOUGHT"
  | "USER_CELEBRATION"
  | "SHARED_MEME_REACTION"
  | "CODING_BUG_SPOTTED";

export type SmartSilenceReason =
  | "USER_EXPLICIT_SILENCE"     // User said "chup thak", "quiet", "stop talking"
  | "USER_DEEP_FOCUS"           // User is busy coding, reading, writing
  | "COOLDOWN_ACTIVE"           // Proactive rate limit / cooldown in effect
  | "NO_MEANINGFUL_CONTRIBUTION"// Silence is better than empty filler/trivia
  | "USER_CURRENTLY_SPEAKING"   // User audio active
  | "NON_IMMERSIVE_MODE";       // Chat mode or call inactive

export interface ProactiveTriggerCandidate {
  id: string;
  reason: ProactiveInitiationReason;
  relevanceScore: number; // 0.0 to 1.0
  suggestedPrompt: string;
  topic?: string;
  visualTrigger?: string;
  contextFact?: string;
}

export interface ConversationalBehaviorInput {
  userMessage?: string;
  history?: Array<{ sender: "user" | "dora"; text: string; timestamp?: number }>;
  timeSinceLastUserMessageMs?: number;
  timeSinceLastDoraMessageMs?: number;
  isCallActive?: boolean;
  isUserSpeaking?: boolean;
  isUserMuted?: boolean;
  activeTopic?: string;
  currentTask?: string;
  userGoal?: string;
  emotionalState?: string;
  isScreenSharing?: boolean;
  isCameraActive?: boolean;
  screenVisualCue?: string;
  cameraVisualCue?: string;
  explicitControlCommand?: string; // "chup thak", "talk with me", "focus", "chill", etc.
  currentMode?: CompanionEngagementMode;
  injectedCurrentTime?: number;
}

export interface ConversationalBehaviorDecision {
  state: ConversationalState;
  actionType: ConversationalActionType;
  shouldSpeak: boolean;
  engagementMode: CompanionEngagementMode;
  relevanceScore: number;
  silenceReason?: SmartSilenceReason;
  proactiveTrigger?: ProactiveTriggerCandidate;
  detectedUserControl?: {
    command: string;
    newMode: CompanionEngagementMode;
    acknowledgment: string;
  };
  companionTone: "playful" | "grounded" | "empathetic" | "curious" | "excited" | "quiet" | "warm" | "calm";
  genZSlangDensity: "none" | "subtle" | "moderate" | "expressive";
  suggestedReaction?: string;
  companionDirectives: string[];
  sanitizedPromptSnippet: string;
}
