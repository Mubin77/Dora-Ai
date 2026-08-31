import { FreshnessIntent } from "./searchFreshness";
import { temporalEngine, TemporalResolution } from "./temporalEngine";

export type DetectedTask = "web_search" | "realtime_temporal" | "chat" | "reasoning" | "vision" | "device_action";

export interface TaskDetectionResult {
  task: DetectedTask;
  searchQuery?: string;
  confidence: number;
  reason?: string;
  isNewsQuery?: boolean;
  freshness?: FreshnessIntent;
  temporal?: TemporalResolution;
  deviceAction?: {
    device: "android" | "pc";
    action: "open_application" | "autonomous_task";
    appName: string;
    isAutonomous?: boolean;
    goal?: string;
  };
}


/**
 * Natural language task, temporal awareness, and search intent detector for Dora.
 * Analyzes conversational context to strictly distinguish between static knowledge,
 * dynamic temporal/time/weather queries, and web search requirements.
 */
export class TaskDetector {
  private static instance: TaskDetector;

  private constructor() {}

  public static getInstance(): TaskDetector {
    if (!TaskDetector.instance) {
      TaskDetector.instance = new TaskDetector();
    }
    return TaskDetector.instance;
  }

  public detect(
    message: string,
    options: {
      hasImage?: boolean;
      deepThink?: boolean;
      clientTimeZone?: string;
      referenceDate?: Date;
    } = {}
  ): TaskDetectionResult {
    if (options.hasImage) {
      return { task: "vision", confidence: 1.0, reason: "Image or screen frame attached" };
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return { task: "chat", confidence: 1.0, reason: "Empty message" };
    }

    const trimmed = message.trim();
    const lower = trimmed.toLowerCase();

    // 1. First-Priority Temporal & Real-Time Classification
    const temporal = temporalEngine.analyzeAndResolve(trimmed, {
      clientTimeZone: options.clientTimeZone,
      referenceDate: options.referenceDate,
    });

    if (temporal.isRealTime) {
      if (temporal.intent === "WEATHER" && temporal.weatherQuery) {
        return {
          task: "web_search",
          searchQuery: temporal.weatherQuery,
          confidence: 0.98,
          reason: temporal.reason,
          temporal,
        };
      }

      return {
        task: "realtime_temporal",
        confidence: temporal.confidence,
        reason: temporal.reason,
        temporal,
      };
    }

    // 2. High-Priority Device Control Action Detection (e.g., "Open YouTube", "YouTube open koro")
    const deviceAction = this.detectDeviceAction(trimmed);
    if (deviceAction) {
      return {
        task: "device_action",
        confidence: 0.96,
        reason: `Device control intent: ${deviceAction.action} (${deviceAction.appName})`,
        deviceAction,
      };
    }

    // 3. Guard against false-positives for programming/academic terms (e.g. "binary search", "search tree", "breadth first search")

    const isProgrammingSearch =
      /\b(?:binary|linear|depth\s*first|breadth\s*first|tree|graph|a\*|ternary)\s+search\b/i.test(lower) ||
      /\bsearch\s+(?:algorithm|complexity|space|method\s+in\s+python|function)\b/i.test(lower);

    if (!isProgrammingSearch) {
      // 3. High-confidence explicit search command signals
      const hasExplicitSearchCommand =
        /\b(?:search\s+(?:the\s+web|online|google|internet|bing)|look\s*up\s+(?:online|on\s+the\s+web|the\s+latest|the\s+news)|google\s+this|find\s+online|search\s+for\s+the\s+latest|browse\s+the\s+web)\b/i.test(lower) ||
        /^(?:search|look\s*up|google|find\s+info\s+(?:about|on)|find\s+out\s+(?:about|on))\b/i.test(lower) ||
        /\bsearch\s+online\s+(?:and|to)?/i.test(lower);

      // 4. Temporal current-event / breaking news / real-time information signals
      const hasCurrentEventSignals =
        /\b(?:latest|recent|today'?s?|current|breaking|now|right\s+now|this\s+week|this\s+month|upcoming)\s+(?:news|updates?|announcements?|developments?|headlines?|events?|releases?|models?|versions?|trends?|price|prices|stock|score|scores|status|schedule)\b/i.test(lower) ||
        /\bwhat(?:'s|\s+is)\s+(?:the\s+)?(?:latest|current|newest|recent)\b/i.test(lower) ||
        /\bwhat\s+happened\s+(?:in|with|to|today|recently|this\s+week|today\s+in)\b/i.test(lower) ||
        /\b(?:latest|current)\s+(?:ai|tech|technology|market|markets|crypto|bitcoin|ethereum|openai|gemini|google|apple|tesla|nvidia|meta|anthropic|stock|sports?|score|game)\b/i.test(lower) ||
        /\b(?:current|today'?s?)\s+(?:price|exchange\s*rate|gas\s+price|inflation\s+rate)\b/i.test(lower) ||
        /\bwhen\s+is\s+the\s+next\s+(?:match|game|event|eclipse|launch|keynote|release|conference|election|concert)\b/i.test(lower) ||
        /\bfind\s+(?:the\s+)?(?:current|latest)\s+price\s+of\b/i.test(lower) ||
        /\bnews\s+today\b/i.test(lower) ||
        /\btoday'?s?\s+(?:major\s+)?(?:ai\s+)?news\b/i.test(lower) ||
        /\blatest\s+major\s+ai\s+news\b/i.test(lower) ||
        /\bwhat\s+is\s+happening\s+in\s+.+\s+(?:right\s+now|today)\b/i.test(lower);

      if (hasExplicitSearchCommand || hasCurrentEventSignals) {
        const searchQuery = this.extractSearchQuery(trimmed);

        // Determine specific freshness intent
        let freshness: FreshnessIntent = "any";
        const isToday = /\b(?:today|today'?s?|breaking|right\s+now|now|past\s+24\s+hours)\b/i.test(lower);
        const isThisWeek = /\b(?:this\s+week|past\s+few\s+days|recent\s+days)\b/i.test(lower);
        const isRecent = /\b(?:latest|recent|newest|current|recently|this\s+month)\b/i.test(lower);

        if (isToday) {
          freshness = "today";
        } else if (isThisWeek) {
          freshness = "this_week";
        } else if (isRecent) {
          freshness = "recent";
        }

        const isNewsQuery =
          /\b(?:news|headlines|developments|updates|announcements|events|launch|market|stocks?)\b/i.test(lower) ||
          /\b(?:what\s+happened|what's\s+new)\b/i.test(lower);

        return {
          task: "web_search",
          searchQuery,
          confidence: hasExplicitSearchCommand ? 0.98 : 0.92,
          reason: hasExplicitSearchCommand ? "Explicit search command detected" : "Current information or real-time event intent detected",
          isNewsQuery,
          freshness,
        };
      }
    }

    if (options.deepThink) {
      return { task: "reasoning", confidence: 0.95, reason: "DeepThink mode active" };
    }

    return { task: "chat", confidence: 0.90, reason: "Standard conversational turn" };
  }

  /**
   * Detects device control commands and multi-step autonomous goals.
   */
  public detectDeviceAction(rawText: string): {
    device: "android" | "pc";
    action: "open_application" | "autonomous_task";
    appName: string;
    isAutonomous?: boolean;
    goal?: string;
  } | null {
    const trimmed = rawText.trim();
    const lower = trimmed.toLowerCase();

    // 1. Multi-Step Autonomous Goal Patterns
    // Examples: "Open YouTube and search for relaxing music", "YouTube e giye relaxing music search koro",
    // "Open WhatsApp and message Ryan", "Search cat videos on YouTube"
    const isMultiStepGoal =
      /(?:open\s+[a-z0-9\s._\-]+?\s+and\s+(?:search|find|play|look|message|type|send)|(?:search|find|play)\s+.+?\s+(?:on|in)\s+[a-z0-9\s._\-]+|[a-z0-9\u0980-\u09FF\s._\-]+?\s+(?:giye|dhuke)\s+.+?\s*(?:search\s*koro|khujo|chalao|play|dekhao))/i.test(lower);

    if (isMultiStepGoal) {
      // Extract target app name if possible
      let appName = "Android";
      const appMatch = lower.match(/(?:open\s+([a-z0-9\s._\-]+?)\s+and|(?:on|in)\s+([a-z0-9\s._\-]+)|([a-z0-9\u0980-\u09FF\s._\-]+?)\s+(?:giye|dhuke))/i);
      if (appMatch) {
        appName = (appMatch[1] || appMatch[2] || appMatch[3] || "Android").trim();
      }

      return {
        device: "android",
        action: "autonomous_task",
        appName: appName.charAt(0).toUpperCase() + appName.slice(1),
        isAutonomous: true,
        goal: trimmed,
      };
    }

    // 2. English patterns: "open <app>", "launch <app>", "start <app>", "open the <app> app"
    const englishMatch = lower.match(
      /^(?:hey\s+dora[,\s]*|dora[,\s]*|please\s+|can\s+you\s+(?:please\s+)?|could\s+you\s+(?:please\s+)?)?(?:open|launch|start)\s+(?:the\s+)?([a-z0-9\s._\-]+?)(?:\s+app|\s+application)?$/i
    );
    if (englishMatch && englishMatch[1]) {
      const appName = englishMatch[1].trim();
      // Filter out non-app generic phrases like "the door", "your eyes"
      if (!/^(?:door|window|eyes|mouth|link|website|file|tab|browser|settings\s+modal)$/i.test(appName)) {
        return {
          device: "android",
          action: "open_application",
          appName: appName.charAt(0).toUpperCase() + appName.slice(1),
        };
      }
    }

    // 3. Bangla / Banglish patterns: "<app> open koro", "<app> kholo", "<app> chalau", "<app> app ta open koro"
    const banglaMatch = lower.match(
      /^(?:hey\s+dora[,\s]*|dora[,\s]*)?([a-z0-9\u0980-\u09FF\s._\-]+?)\s*(?:app\s*ta\s*|app\s*)?(?:open\s*koro|open\s*kor|kholo|khule\s*dao|chalu\s*koro|chalau)$/i
    );
    if (banglaMatch && banglaMatch[1]) {
      const appName = banglaMatch[1].trim();
      if (appName.length > 0 && !/^(?:dorja|janala|chokh)$/i.test(appName)) {
        return {
          device: "android",
          action: "open_application",
          appName: appName.charAt(0).toUpperCase() + appName.slice(1),
        };
      }
    }

    return null;
  }

  /**
   * Cleans conversational wrapper phrases from user prompt to produce a focused search query
   */

  public extractSearchQuery(rawText: string): string {
    let clean = rawText.trim();

    // Strip leading conversational phrases
    clean = clean.replace(
      /^(?:hey\s+dora[,\s]*|dora[,\s]*|please\s+|can\s+you\s+(?:please\s+)?|could\s+you\s+(?:please\s+)?|i\s+want\s+you\s+to\s+)?(?:search\s+(?:the\s+web|online|google|the\s+internet)?\s*(?:and\s+(?:tell|show|give)\s+me|for|to\s+find)?|look\s*up\s*(?:online|on\s+the\s+web)?|find\s+(?:out|info\s+about|information\s+on)?|tell\s+me\s+(?:about)?|check\s+online\s+for|what\s+is\s+the\s+latest\s+on)\s+/i,
      ""
    );

    // Strip trailing conversational filler & punctuation
    clean = clean.replace(/[?.!]+$/, "").trim();

    if (clean.length < 3) {
      return rawText.replace(/[?.!]+$/, "").trim();
    }

    return clean;
  }
}

export const taskDetector = TaskDetector.getInstance();
