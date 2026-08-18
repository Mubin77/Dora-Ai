/**
 * Dora Active Conversation Context Types
 * 
 * Defines structured conversation state, entity tracking, constraint tracking,
 * reference resolution, and task state for Dora's Core Intelligence.
 */

import { BrainIntent } from "./brainEngine";

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
  value: string | number;
  rawText: string;
  operator?: "<=" | ">=" | "==" | "!=" | "contains";
  isOverridden?: boolean;
  updatedAtTurn: number;
}

export interface ResolvedReference {
  rawToken: string;
  resolvedTarget?: string;
  entityId?: string;
  confidence: number;
  isAmbiguous: boolean;
  candidateTargets?: string[];
  reason?: string;
}

export type ConversationState =
  | "idle"
  | "active"
  | "clarifying"
  | "topic_switched"
  | "concluding"
  | "stale";

export interface ActiveConversationContext {
  activeTopic: string | null;
  currentTask: string | null;
  userGoal: string | null;
  entities: TrackedEntity[];
  constraints: ConversationConstraint[];
  preferences: string[];
  recentReferences: ResolvedReference[];
  conversationState: ConversationState;
  lastMeaningfulUserIntent: BrainIntent | null;
  lastMeaningfulAssistantResponse: string | null;
  contextTimestamp: number;
  turnsCount: number;
  isTopicSwitched: boolean;
  isAmbiguousReference: boolean;
  topicHistory: Array<{ topic: string; endedAtTurn: number }>;
}

export interface ContextAnalysisResult {
  context: ActiveConversationContext;
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
