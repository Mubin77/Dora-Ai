/**
 * Dora Intent Understanding Types
 * 
 * Defines structured intent models, intent categories, relationships,
 * multi-intent support, and ambiguity indicators for Dora's Core Intelligence.
 * 
 * Distinct concepts:
 * - TOPIC: Domain/Subject (e.g., "gaming laptop", "weather inquiry")
 * - INTENT: Speech act goal (e.g., "RECOMMENDATION", "CONSTRAINT_UPDATE", "COMPARISON")
 * - TASK: Operational flow (e.g., "purchase_research", "troubleshooting", "planning")
 * - USER GOAL: High-level user objective (e.g., "Find suitable gaming laptop matching specs and budget")
 */

export type BrainIntent =
  | "RECOMMENDATION"
  | "COMPARISON"
  | "CONSTRAINT_UPDATE"
  | "INFORMATION"
  | "QUESTION"
  | "EXPLANATION"
  | "HOW_TO"
  | "TROUBLESHOOTING"
  | "DEBUGGING"
  | "PLANNING"
  | "CALCULATION"
  | "REASONING"
  | "CREATIVE_REQUEST"
  | "WRITING"
  | "SUMMARIZATION"
  | "TRANSLATION"
  | "OPINION"
  | "ADVICE"
  | "CASUAL_CONVERSATION"
  | "EMOTIONAL_SUPPORT"
  | "MEMORY_RECALL"
  | "MEMORY_UPDATE"
  | "REAL_TIME_INFORMATION"
  | "TOOL_ACTION"
  | "FOLLOW_UP"
  | "CLARIFICATION"
  | "CORRECTION"
  | "CONFIRMATION"
  | "REJECTION"
  | "TASK_CONTINUATION"
  | "TASK_COMPLETION";

export type IntentRelationship =
  | "STANDALONE"
  | "FOLLOW_UP"
  | "REFINEMENT"
  | "CORRECTION"
  | "CONFIRMATION"
  | "REJECTION"
  | "CLARIFICATION"
  | "TOPIC_SWITCH";

export interface StructuredIntent {
  primaryIntent: BrainIntent;
  secondaryIntent?: BrainIntent;
  relationship: IntentRelationship;
  intentConfidence: number;
  intentSignals: Record<string, number>;
  targetEntity?: string;
  targetAspect?: string;
  requiresClarification: boolean;
  ambiguityReason?: string;
  isMultiIntent: boolean;
  suggestedDirectives: string[];
}
