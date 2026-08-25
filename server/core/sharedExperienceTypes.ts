/**
 * Dora Shared Experience & Multimodal Context Types
 * 
 * Defines types for treating Camera and Screen Share as a continuous shared experience
 * between the user and Dora, including selective visual attention, environment classification,
 * and authentic conversational reactions.
 */

export type SharedEnvironmentType =
  | "PARTY"
  | "CAFE_RESTAURANT"
  | "OUTDOORS"
  | "DESK_WORKSPACE"
  | "HOME_RELAX"
  | "COMMUTE"
  | "EVENT"
  | "UNKNOWN";

export type ScreenActivityType =
  | "CODE_DEVELOPMENT"
  | "MEME_REEL_VIDEO"
  | "SOCIAL_FEED"
  | "BROWSING"
  | "GAMING"
  | "DOCUMENT_WORK"
  | "DESIGN"
  | "GENERAL";

export type VisualEmotionalTrigger =
  | "HUMOR_MEME"
  | "SURPRISE"
  | "CUTENESS"
  | "FRUSTRATION_BUG"
  | "ACHIEVEMENT_CELEBRATION"
  | "CASUAL_CHILL"
  | "NONE";

export interface VisualObservationItem {
  id: string;
  source: "camera" | "screen";
  timestamp: number;
  environment?: SharedEnvironmentType;
  activity?: ScreenActivityType;
  trigger: VisualEmotionalTrigger;
  isMeaningful: boolean; // false for mundane static objects like empty walls or tables
  summary: string;
  suggestedReaction?: string;
  tentativeMemoryLink?: {
    memoryKey: string;
    tentativePrompt: string;
  };
}

export interface SharedExperienceContext {
  activeEnvironment: SharedEnvironmentType;
  activeScreenActivity: ScreenActivityType;
  recentObservations: VisualObservationItem[];
  currentMood: "energetic" | "focused" | "relaxed" | "playful" | "supportive";
  lastReactionTimestamp: number;
}
