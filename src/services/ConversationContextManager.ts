/**
 * Dora Persistent Conversation Context Manager
 * 
 * Manages short-term conversation continuity across session transitions, app minimization,
 * and background wake-word turns without polluting long-term memory.
 * 
 * Features:
 * - Tracks recent conversation turns (user & Dora)
 * - Synthesizes compact rolling conversation summary
 * - Tracks active discussion entities (people, dates, locations, tasks)
 * - Persists across session termination and app restart (via LocalStorage & Native Bridge)
 * - Compact context injection strategy for Gemini Live & Dora AI
 */

import { ChatMessage } from "../types";

export interface ContextEntity {
  name: string;
  category: "person" | "location" | "time" | "task" | "preference" | "general";
  lastMentioned: number;
  details?: string;
}

export interface ActiveTaskContext {
  taskId?: string;
  goal?: string;
  targetApp?: string;
  status: "idle" | "planning" | "in_progress" | "completed" | "failed";
  lastAction?: string;
  updatedAt: number;
}

export interface PersistentConversationContext {
  version: number;
  lastSessionId: string;
  lastUpdated: number;
  conversationSummary: string;
  activeTopic: string;
  activeEntities: ContextEntity[];
  activeTaskState?: ActiveTaskContext;
  recentTurns: Array<{
    sender: "user" | "dora";
    text: string;
    timestamp: number;
    inputMode?: "voice" | "text";
  }>;
}

const STORAGE_KEY = "dora_persistent_context_v2";
const MAX_RECENT_TURNS = 12;

export class ConversationContextManager {
  private static instance: ConversationContextManager;
  private currentContext: PersistentConversationContext;
  private listeners: Array<(ctx: PersistentConversationContext) => void> = [];

  private constructor() {
    this.currentContext = this.loadFromStorage();
  }

  public static getInstance(): ConversationContextManager {
    if (!ConversationContextManager.instance) {
      ConversationContextManager.instance = new ConversationContextManager();
    }
    return ConversationContextManager.instance;
  }

  private loadFromStorage(): PersistentConversationContext {
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.recentTurns)) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn("[ConversationContextManager] Error loading context:", e);
    }

    return {
      version: 2,
      lastSessionId: `session-${Date.now()}`,
      lastUpdated: Date.now(),
      conversationSummary: "",
      activeTopic: "",
      activeEntities: [],
      recentTurns: [],
    };
  }

  private saveToStorage(): void {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentContext));
        // Also sync to Android Native Bridge if available
        const bridge = (window as any)?.DoraAndroidBridge;
        if (bridge && typeof bridge.saveConversationContext === "function") {
          bridge.saveConversationContext(JSON.stringify(this.currentContext));
        }
      }
    } catch (e) {
      console.warn("[ConversationContextManager] Error saving context:", e);
    }
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentContext);
      } catch (err) {
        console.error("[ConversationContextManager] Listener error:", err);
      }
    }
  }

  public subscribe(listener: (ctx: PersistentConversationContext) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentContext);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getContext(): PersistentConversationContext {
    return this.currentContext;
  }

  /**
   * Records a conversational turn and extracts contextual entities
   */
  public recordTurn(
    sender: "user" | "dora",
    text: string,
    inputMode: "voice" | "text" = "voice"
  ): void {
    const cleanText = text.trim();
    if (!cleanText) return;

    const turn = {
      sender,
      text: cleanText,
      timestamp: Date.now(),
      inputMode,
    };

    const turns = [...this.currentContext.recentTurns, turn];
    if (turns.length > MAX_RECENT_TURNS) {
      turns.splice(0, turns.length - MAX_RECENT_TURNS);
    }

    this.currentContext.recentTurns = turns;
    this.currentContext.lastUpdated = Date.now();

    // Extract notable entities and topics from user input
    if (sender === "user") {
      this.extractEntitiesAndTopic(cleanText);
    }

    // Update rolling summary if we have enough turns
    this.updateRollingSummary();

    this.saveToStorage();
  }

  /**
   * Synchronizes active message list from chat
   */
  public syncFromMessages(messages: ChatMessage[], sessionId?: string): void {
    if (sessionId) {
      this.currentContext.lastSessionId = sessionId;
    }

    const recent = messages.slice(-MAX_RECENT_TURNS).map((m) => ({
      sender: m.sender,
      text: m.text,
      timestamp: m.timestamp,
      inputMode: (m.inputMode || "voice") as "voice" | "text",
    }));

    this.currentContext.recentTurns = recent;
    this.currentContext.lastUpdated = Date.now();

    // Re-extract entities from recent turns
    for (const m of messages.filter((msg) => msg.sender === "user").slice(-5)) {
      this.extractEntitiesAndTopic(m.text);
    }

    this.updateRollingSummary();
    this.saveToStorage();
  }

  /**
   * Updates current active autonomous task state
   */
  public setActiveTask(task: ActiveTaskContext): void {
    this.currentContext.activeTaskState = task;
    this.currentContext.lastUpdated = Date.now();
    this.saveToStorage();
  }

  public clearActiveTask(): void {
    this.currentContext.activeTaskState = undefined;
    this.currentContext.lastUpdated = Date.now();
    this.saveToStorage();
  }

  /**
   * Lightweight entity & topic extractor for natural Bangla & English conversations
   */
  private extractEntitiesAndTopic(text: string): void {
    const lower = text.toLowerCase();

    // Meeting / appointments
    const meetingMatch = text.match(/(?:meeting|dekha|porichoy)\s+(?:with|sathe|kore)?\s*([A-Za-z\u0980-\u09FF\s]{2,25})/i);
    if (meetingMatch && meetingMatch[1]) {
      const name = meetingMatch[1].trim();
      this.addOrUpdateEntity(name, "person", `Meeting mentioned: "${text}"`);
      this.currentContext.activeTopic = `Meeting with ${name}`;
    }

    // Travel / places (e.g. Cox's Bazar, Dhaka, Sylhet, Chittagong, etc.)
    const placeMatch = text.match(/(?:trip|tour|jabo|visit|travel|ghurte)\s+(?:to|e)?\s*([A-Za-z\u0980-\u09FF\s']{2,30})/i) ||
      text.match(/([A-Za-z\u0980-\u09FF\s']{2,30})\s+(?:trip|tour|jabo|ghurte)/i);
    if (placeMatch && placeMatch[1]) {
      const place = placeMatch[1].trim();
      if (!["next", "week", "tomorrow", "ajke", "pore"].includes(place.toLowerCase())) {
        this.addOrUpdateEntity(place, "location", `Trip or destination: ${place}`);
        this.currentContext.activeTopic = `Trip to ${place}`;
      }
    }

    // Direct personal names after remember/mone rakho
    const rememberMatch = text.match(/(?:remember|mone\s*rakho|bhule\s*jeona)\s+(?:that|je)?\s*([^.!?\n]{3,60})/i);
    if (rememberMatch && rememberMatch[1]) {
      const detail = rememberMatch[1].trim();
      this.addOrUpdateEntity(detail.slice(0, 30), "general", detail);
    }
  }

  private addOrUpdateEntity(name: string, category: ContextEntity["category"], details?: string): void {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) return;

    const existingIdx = this.currentContext.activeEntities.findIndex(
      (e) => e.name.toLowerCase() === trimmed.toLowerCase()
    );

    const entity: ContextEntity = {
      name: trimmed,
      category,
      lastMentioned: Date.now(),
      details,
    };

    if (existingIdx >= 0) {
      this.currentContext.activeEntities[existingIdx] = entity;
    } else {
      this.currentContext.activeEntities.unshift(entity);
      // Cap at 8 active entities
      if (this.currentContext.activeEntities.length > 8) {
        this.currentContext.activeEntities.pop();
      }
    }
  }

  private updateRollingSummary(): void {
    const turns = this.currentContext.recentTurns;
    if (turns.length === 0) {
      this.currentContext.conversationSummary = "";
      return;
    }

    const recentPairs = turns.slice(-6);
    const summaryLines = recentPairs.map(
      (t) => `${t.sender === "user" ? "User" : "Dora"}: ${t.text}`
    );
    this.currentContext.conversationSummary = summaryLines.join(" | ");
  }

  /**
   * Builds a compact context block for new Live Sessions / Gemini turns
   */
  public getCompactContextForNewSession(): string {
    const { activeTopic, activeEntities, recentTurns, activeTaskState } = this.currentContext;

    if (recentTurns.length === 0 && activeEntities.length === 0 && !activeTopic) {
      return "";
    }

    const sections: string[] = ["[PERSISTENT RECENT CONVERSATION CONTEXT]"];

    if (activeTopic) {
      sections.push(`Active Topic / Discussion: ${activeTopic}`);
    }

    if (activeEntities.length > 0) {
      const entityStr = activeEntities
        .slice(0, 5)
        .map((e) => `${e.name} (${e.category}${e.details ? `: ${e.details}` : ""})`)
        .join("; ");
      sections.push(`Active Entities: ${entityStr}`);
    }

    if (activeTaskState && activeTaskState.status === "in_progress") {
      sections.push(`Active Task: ${activeTaskState.goal || activeTaskState.targetApp} (${activeTaskState.status})`);
    }

    if (recentTurns.length > 0) {
      sections.push("Recent Turns:");
      const lastFew = recentTurns.slice(-6);
      for (const t of lastFew) {
        sections.push(`- ${t.sender === "user" ? "User" : "Dora"}: ${t.text}`);
      }
    }

    sections.push("[Instruction: Seamlessly understand follow-up references like 'tomorrow', 'how should I get there?', 'what time?' based on the above context.]");

    return sections.join("\n");
  }

  /**
   * Resets context on explicit New Chat or Clear Messages
   */
  public clearContext(): void {
    this.currentContext = {
      version: 2,
      lastSessionId: `session-${Date.now()}`,
      lastUpdated: Date.now(),
      conversationSummary: "",
      activeTopic: "",
      activeEntities: [],
      recentTurns: [],
    };
    this.saveToStorage();
  }
}

export const conversationContextManager = ConversationContextManager.getInstance();
