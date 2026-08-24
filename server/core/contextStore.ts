/**
 * Dora Active Conversation Context Store
 * 
 * Manages in-memory stateful ConversationContext instances per session.
 * Provides thread/session persistence, snapshotting, topic archiving,
 * and clean isolation from long-term memory.
 */

import { ConversationContext, InactiveContextSnapshot } from "./contextTypes";
import { PlanStatus } from "./planningTypes";

export class ContextStore {
  private static instance: ContextStore;
  private contexts: Map<string, ConversationContext> = new Map();
  private readonly TTL_MS = 1000 * 60 * 60 * 4; // 4 hours in-memory session lifetime

  private constructor() {}

  public static getInstance(): ContextStore {
    if (!ContextStore.instance) {
      ContextStore.instance = new ContextStore();
    }
    return ContextStore.instance;
  }

  /**
   * Generates a fresh blank active conversation context
   */
  public createBlankContext(sessionId: string = "default", currentTime?: number): ConversationContext {
    const now = currentTime !== undefined ? currentTime : 0;
    return {
      id: sessionId,
      activeTopic: null,
      currentTask: null,
      userGoal: null,
      entities: [],
      constraints: [],
      preferences: [],
      recentReferences: [],
      conversationState: "idle",
      lastMeaningfulUserIntent: null,
      lastMeaningfulAssistantResponse: null,
      createdAt: now,
      updatedAt: now,
      contextTimestamp: now,
      turnsCount: 0,
      isTopicSwitched: false,
      isAmbiguousReference: false,
      archivedContexts: [],
      topicHistory: [],
    };
  }

  /**
   * Retrieves the current context for a session, initializing one if needed
   */
  public getOrCreate(sessionId: string = "default", currentTime?: number): ConversationContext {
    const existing = this.contexts.get(sessionId);
    const now = currentTime !== undefined ? currentTime : 0;

    if (existing) {
      // Check freshness TTL
      if (now === 0 || (now - existing.updatedAt < this.TTL_MS)) {
        return existing;
      }
    }

    const fresh = this.createBlankContext(sessionId, currentTime);
    this.contexts.set(sessionId, fresh);
    return fresh;
  }

  /**
   * Saves or updates an active conversation context for a session
   */
  public save(sessionId: string = "default", context: ConversationContext, currentTime?: number): ConversationContext {
    const ts = currentTime !== undefined ? currentTime : (context.updatedAt ?? 0);
    const updated: ConversationContext = {
      ...context,
      id: sessionId,
      updatedAt: ts,
      contextTimestamp: ts,
    };
    this.contexts.set(sessionId, updated);
    return updated;
  }

  /**
   * Safely archives the current topic and active constraints into archivedContexts
   * when a topic switch occurs, isolating them so they do NOT contaminate the new topic.
   */
  public archiveCurrentTopic(
    context: ConversationContext,
    endedAtTurn: number,
    currentTime?: number
  ): ConversationContext {
    if (!context.activeTopic) return context;

    const now = currentTime !== undefined ? currentTime : (context.updatedAt ?? 0);

    const snapshot: InactiveContextSnapshot = {
      topic: context.activeTopic,
      task: context.currentTask,
      goal: context.userGoal,
      entities: [...context.entities],
      constraints: [...context.constraints],
      endedAt: now,
      endedAtTurn,
    };

    const updatedArchived = [snapshot, ...context.archivedContexts].slice(0, 10);
    const updatedHistory = [
      { topic: context.activeTopic, endedAtTurn },
      ...context.topicHistory,
    ].slice(0, 10);

    const updatedArchivedPlans = context.activeTaskPlan
      ? [{ ...context.activeTaskPlan, status: (context.activeTaskPlan.status === "COMPLETED" ? "COMPLETED" : "CANCELLED") as PlanStatus, updatedAt: now }, ...(context.archivedPlans || [])]
      : (context.archivedPlans || []);

    return {
      ...context,
      activeTopic: null,
      currentTask: null,
      userGoal: null,
      activeTaskPlan: undefined,
      archivedPlans: updatedArchivedPlans,
      // Archive entities: mark existing entities as archived
      entities: context.entities.map((e) => ({ ...e, status: "archived" })),
      // Invalidate current constraints for the new topic
      constraints: context.constraints.map((c) => ({ ...c, isOverridden: true })),
      recentReferences: [],
      isTopicSwitched: true,
      archivedContexts: updatedArchived,
      topicHistory: updatedHistory,
      updatedAt: now,
      contextTimestamp: now,
    };
  }

  /**
   * Clears context for a given session
   */
  public clear(sessionId: string = "default"): void {
    this.contexts.delete(sessionId);
  }

  /**
   * Clears all contexts (useful for tests)
   */
  public clearAll(): void {
    this.contexts.clear();
  }
}

export const contextStore = ContextStore.getInstance();
