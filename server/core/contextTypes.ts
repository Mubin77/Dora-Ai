/**
 * Dora Active Conversation Context Types
 * 
 * Defines structured conversation state, entity tracking, constraint tracking,
 * reference resolution, and task state for Dora's Core Intelligence.
 * 
 * ConversationContext is the active working memory for the CURRENT task/dialogue.
 * It is NOT long-term memory.
 */

import { BrainIntent } from "./intentTypes";
import { TaskPlan } from "./planningTypes";
export * from "./intentTypes";

export interface ConversationTurn {
  sender: "user" | "dora";
  text: string;
}

export type EntityType =
  | "product"
  | "brand"
  | "device"
  | "person"
  | "location"
  | "date"
  | "website"
  | "project"
  | "file"
  | "concept"
  | "tech_stack"
  | "other";

export type EntityRole =
  | "primary"
  | "comparison_target"
  | "secondary"
  | "referenced";

export interface TrackedEntity {
  id: string;
  name: string;
  type: EntityType;
  role: EntityRole;
  attributes?: Record<string, string | number | boolean>;
  firstMentionedTurn: number;
  lastMentionedTurn: number;
  mentionCount: number;
  status: "active" | "archived" | "superseded";
}

export type ConstraintCategory =
  | "budget"
  | "date"
  | "time"
  | "location"
  | "brand_preference"
  | "brand_exclusion"
  | "feature_required"
  | "feature_excluded"
  | "technical_spec"
  | "quantity"
  | "deadline"
  | "other";

export interface ConversationConstraint {
  id: string;
  category: ConstraintCategory;
  key: string;
  value: string | number | boolean;
  rawText: string;
  operator?: "<=" | ">=" | "==" | "!=" | "contains" | "within";
  isOverridden?: boolean;
  overriddenBy?: string;
  createdAt: number;
  updatedAt: number;
  updatedAtTurn: number;
}

export type ReferenceStatus = "resolved" | "ambiguous" | "unresolved";

export interface ResolvedReference {
  rawToken: string;
  tokenType?: "pronoun" | "deictic" | "ordinal" | "comparative" | "anaphora" | "relative";
  status: ReferenceStatus;
  resolvedTarget?: string;
  entityId?: string;
  candidateTargets?: string[];
  confidence: number;
  isAmbiguous: boolean;
  reason?: string;
}

export type ActiveConversationStatus =
  | "idle"
  | "active"
  | "clarifying"
  | "topic_switched"
  | "concluding"
  | "stale";

export interface InactiveContextSnapshot {
  topic: string;
  task: string | null;
  goal: string | null;
  entities: TrackedEntity[];
  constraints: ConversationConstraint[];
  endedAt: number;
  endedAtTurn: number;
}

/**
 * Structured Active Conversation Context for Dora
 */
export interface ConversationContext {
  id: string;
  activeTopic: string | null;
  currentTask: string | null;
  userGoal: string | null;
  entities: TrackedEntity[];
  constraints: ConversationConstraint[];
  preferences: string[];
  recentReferences: ResolvedReference[];
  conversationState: ActiveConversationStatus;
  lastMeaningfulUserIntent: BrainIntent | null;
  lastMeaningfulAssistantResponse: string | null;
  createdAt: number;
  updatedAt: number;
  contextTimestamp: number;
  turnsCount: number;
  isTopicSwitched: boolean;
  isAmbiguousReference: boolean;
  activeTaskPlan?: TaskPlan;
  archivedPlans?: TaskPlan[];
  archivedContexts: InactiveContextSnapshot[];
  topicHistory: Array<{ topic: string; endedAtTurn: number }>;
}

// Alias for backward compatibility
export type ActiveConversationContext = ConversationContext;

export interface ContextAnalysisResult {
  context: ConversationContext;
  isFollowUp: boolean;
  isTopicSwitch: boolean;
  resolvedReferences: ResolvedReference[];
  newEntities: TrackedEntity[];
  updatedConstraints: ConversationConstraint[];
  contextDirectives: string[];
  diagnostics: {
    signals: Record<string, number>;
    reasoningTrace: string[];
  };
}
