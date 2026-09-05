/**
 * Dora Goal Interpreter
 * 
 * Analyzes natural language user goals across English, Bangla, and Banglish.
 * Extracts target applications, primary intent, search queries, recipient entities,
 * and high-level goal decomposition.
 */

import { applicationResolver } from "../ApplicationResolver";

export type InterpretedGoalIntent =
  | "open_app"
  | "search"
  | "play_media"
  | "send_message"
  | "inspect_screen"
  | "navigate_settings"
  | "capture_photo"
  | "general_task";

export interface InterpretedGoal {
  rawGoal: string;
  intent: InterpretedGoalIntent;
  targetApp: string;
  resolvedPackage?: string;
  searchQuery?: string;
  recipient?: string;
  messageText?: string;
  isMultiStep: boolean;
  subGoals: string[];
  confidence: number;
}

export class GoalInterpreter {
  private static instance: GoalInterpreter;

  private constructor() {}

  public static getInstance(): GoalInterpreter {
    if (!GoalInterpreter.instance) {
      GoalInterpreter.instance = new GoalInterpreter();
    }
    return GoalInterpreter.instance;
  }

  /**
   * Interprets natural language goal into structured operational metadata
   */
  public interpret(goal: string): InterpretedGoal {
    const trimmed = (goal || "").trim();
    const lower = trimmed.toLowerCase();

    // 1. Check for YouTube / Media Search & Play Patterns
    // Examples: "Open YouTube and search for relaxing music", "YouTube e giye relaxing music search koro",
    // "search relaxing music on YouTube", "play lofi on Spotify"
    const ytSearchMatch = lower.match(
      /(?:open\s+(?:the\s+)?([a-z0-9\s._]+?)\s+(?:and\s+)?(?:search|find|play|look\s*up)\s+(?:for\s+)?(.+)|(?:search|find|look\s*up|play)\s+(?:for\s+)?(.+?)\s+(?:on|in)\s+([a-z0-9\s._]+))/i
    );

    if (ytSearchMatch) {
      let app = "";
      let query = "";
      if (ytSearchMatch[1] && ytSearchMatch[2]) {
        app = ytSearchMatch[1].trim();
        query = ytSearchMatch[2].trim();
      } else if (ytSearchMatch[3] && ytSearchMatch[4]) {
        query = ytSearchMatch[3].trim();
        app = ytSearchMatch[4].trim();
      }

      const resolution = applicationResolver.resolveApplication(app);
      const isPlay = (/\bplay\b|\bchalao\b/i.test(lower) || /gaan\s+chalao/i.test(lower)) && !/\bsearch\b|\bkhujo\b/i.test(lower);

      return {
        rawGoal: trimmed,
        intent: isPlay ? "play_media" : "search",
        targetApp: resolution.appName || app,
        resolvedPackage: resolution.packageName,
        searchQuery: this.cleanQuery(query),
        isMultiStep: true,
        subGoals: [
          `Open ${resolution.appName || app}`,
          `Locate and activate search`,
          `Type search query "${this.cleanQuery(query)}"`,
          `Submit search and select result`,
        ],
        confidence: 0.95,
      };
    }

    // 2. Bangla / Banglish Search & Play Patterns
    // Examples: "YouTube e giye relaxing music search koro", "Spotify te Arijit Singh er gaan chalao", "YouTube e cats khujo"
    const banglaSearchMatch = lower.match(
      /(?:([a-z0-9\u0980-\u09FF._\-]+(?:\s+(?:music|browser|app))?)\s*(?:-e|-te|\s+e|\s+te)?\s+(?:giye|dhuke)?\s*(.+?)\s*(?:search\s*koro|khujo|chalao|play\s*koro|dekhao))/i
    );

    if (banglaSearchMatch && banglaSearchMatch[1] && banglaSearchMatch[2]) {
      const app = banglaSearchMatch[1].trim();
      const query = banglaSearchMatch[2].trim();
      const resolution = applicationResolver.resolveApplication(app);

      if (resolution.isResolved || /youtube|spotify|facebook|whatsapp|chrome|google/i.test(app)) {
        const isPlay = /chalao|play|gaan/i.test(lower);
        return {
          rawGoal: trimmed,
          intent: isPlay ? "play_media" : "search",
          targetApp: resolution.appName || app,
          resolvedPackage: resolution.packageName,
          searchQuery: this.cleanQuery(query),
          isMultiStep: true,
          subGoals: [
            `Open ${resolution.appName || app}`,
            `Locate and activate search`,
            `Type search query "${this.cleanQuery(query)}"`,
            `Submit search and select result`,
          ],
          confidence: 0.94,
        };
      }
    }

    // 3. Messaging Patterns
    // Examples: "Open WhatsApp and message Ryan saying hello", "WhatsApp e Ryan ke message dao 'ki khobor'"
    const msgMatch = trimmed.match(
      /(?:open\s+([a-z0-9\s._]+?)\s+and\s+(?:message|send\s+message\s+to|text)\s+([a-z0-9\s._]+?)(?:\s+(?:saying|with\s+text)\s+(.+))?$)/i
    );
    if (msgMatch) {
      const app = msgMatch[1].trim();
      const recipient = msgMatch[2].trim();
      const text = msgMatch[3]?.trim();
      const resolution = applicationResolver.resolveApplication(app);

      return {
        rawGoal: trimmed,
        intent: "send_message",
        targetApp: resolution.appName || app,
        resolvedPackage: resolution.packageName,
        recipient,
        messageText: text,
        isMultiStep: true,
        subGoals: [
          `Open ${resolution.appName || app}`,
          `Find conversation with ${recipient}`,
          text ? `Type message "${text}"` : `Prepare message input`,
          `Request confirmation before sending`,
        ],
        confidence: 0.92,
      };
    }

    // 4. Multi-step chained actions (e.g., "YouTube kholo, AI news search koro, first result open koro")
    const chainedMatch = lower.match(/(?:(?:open|launch|kholo)\s+([a-z0-9\s._\-]+?)|([a-z0-9\u0980-\u09FF\s._\-]+?)\s*(?:kholo|open\s*koro))\s*,\s*(.+)/i);
    if (chainedMatch) {
      const app = (chainedMatch[1] || chainedMatch[2] || "").trim();
      const rest = (chainedMatch[3] || "").trim();
      const resolution = applicationResolver.resolveApplication(app);
      
      const searchSubMatch = rest.match(/(?:(.+?)\s*(?:search\s*koro|search\s*for|find|khujo)|(?:search\s+for|search)\s+(.+))/i);
      const query = searchSubMatch ? (searchSubMatch[1] || searchSubMatch[2] || rest).trim() : rest;

      return {
        rawGoal: trimmed,
        intent: "search",
        targetApp: resolution.appName || app,
        resolvedPackage: resolution.packageName,
        searchQuery: this.cleanQuery(query),
        isMultiStep: true,
        subGoals: [
          `Open ${resolution.appName || app}`,
          `Find and tap search bar`,
          `Type "${this.cleanQuery(query)}" and submit`,
          `Select and open top result`,
        ],
        confidence: 0.96,
      };
    }

    // 5. Navigation intents (Home, Back, Scroll)
    if (/^(?:go\s+to\s+home|go\s+home|home\s*e\s*jao|home\s*e\s*niye\s*jao|home\s*e\s*cholo|home\s*jao|home|press\s*home|হোম(?:\s*এ\s*যাও)?)$/i.test(lower)) {
      return {
        rawGoal: trimmed,
        intent: "general_task",
        targetApp: "Android System",
        isMultiStep: false,
        subGoals: ["Press Home Button"],
        confidence: 0.99,
      };
    }

    if (/^(?:go\s+back|back\s*jao|back\s*e\s*jao|back|press\s*back|pichone\s*jao|pechhone\s*jao|pichone\s*phire\s*jao|পিছনে(?:\s*যাও)?|পেছনে(?:\s*যাও)?)$/i.test(lower)) {
      return {
        rawGoal: trimmed,
        intent: "general_task",
        targetApp: "Android System",
        isMultiStep: false,
        subGoals: ["Press Back Button"],
        confidence: 0.99,
      };
    }

    if (/^(?:scroll\s*down(?:\s*koro)?|niche\s*scroll(?:\s*koro)?|down\s*scroll(?:\s*koro)?|scroll\s*niche|down|নিচে\s*স্ক্রল(?:\s*করো)?)$/i.test(lower)) {
      return {
        rawGoal: trimmed,
        intent: "general_task",
        targetApp: "Android System",
        isMultiStep: false,
        subGoals: ["Scroll Down"],
        confidence: 0.98,
      };
    }

    if (/^(?:scroll\s*up(?:\s*koro)?|upore\s*scroll(?:\s*koro)?|up\s*scroll(?:\s*koro)?|scroll\s*upore|up|উপরে\s*স্ক্রল(?:\s*করো)?)$/i.test(lower)) {
      return {
        rawGoal: trimmed,
        intent: "general_task",
        targetApp: "Android System",
        isMultiStep: false,
        subGoals: ["Scroll Up"],
        confidence: 0.98,
      };
    }

    // 6. Simple Open App (English + Bangla/Banglish)
    // Examples: "Open YouTube", "YouTube kholo", "Launch Camera", "WhatsApp open koro", "YouTube ta kholo", "Chrome kholo", "Settings kholo"
    const openMatch = lower.match(
      /^(?:open|launch|start|chalu\s*koro|chalau)\s+(?:the\s+)?([a-z0-9\s._\-]+?)(?:\s+app|\s+application|\s+ta)?$/i
    );
    if (openMatch && openMatch[1]) {
      const app = openMatch[1].replace(/-(?:ta|te|e)$/i, "").replace(/\s+ta$/i, "").trim();
      const resolution = applicationResolver.resolveApplication(app);
      return {
        rawGoal: trimmed,
        intent: "open_app",
        targetApp: resolution.appName || app,
        resolvedPackage: resolution.packageName,
        isMultiStep: false,
        subGoals: [`Launch ${resolution.appName || app}`],
        confidence: 0.96,
      };
    }

    const banglaOpenMatch = lower.match(
      /^([a-z0-9\u0980-\u09FF\s._\-]+?)\s*(?:app\s*ta\s*|app\s*|-?ta\s*)?(?:open\s*koro|open\s*kor|open\s*koren|kholo|khulo|khule\s*dao|khule\s*den|chalu\s*koro|chalau)$/i
    );
    if (banglaOpenMatch && banglaOpenMatch[1]) {
      const app = banglaOpenMatch[1].replace(/-(?:ta|te|e)$/i, "").replace(/\s+ta$/i, "").trim();
      const resolution = applicationResolver.resolveApplication(app);
      return {
        rawGoal: trimmed,
        intent: "open_app",
        targetApp: resolution.appName || app,
        resolvedPackage: resolution.packageName,
        isMultiStep: false,
        subGoals: [`Launch ${resolution.appName || app}`],
        confidence: 0.96,
      };
    }

    // 5. Fallback General Goal
    const words = trimmed.split(/\s+/);
    const candidateApp = words[0] || "Unknown";
    const resolution = applicationResolver.resolveApplication(candidateApp);

    return {
      rawGoal: trimmed,
      intent: "general_task",
      targetApp: resolution.isResolved ? resolution.appName : "Android System",
      resolvedPackage: resolution.packageName,
      isMultiStep: true,
      subGoals: [
        `Understand current active screen`,
        `Locate relevant elements for "${trimmed}"`,
        `Execute step-by-step actions`,
      ],
      confidence: 0.70,
    };
  }

  private cleanQuery(rawQuery: string): string {
    return rawQuery
      .replace(/^(?:for\s+|search\s+|find\s+|about\s+)/i, "")
      .replace(/[?.!]+$/, "")
      .trim();
  }
}

export const goalInterpreter = GoalInterpreter.getInstance();
