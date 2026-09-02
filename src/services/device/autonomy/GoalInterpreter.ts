/**
 * Dora Goal Interpreter & Adaptive Planner (Phase 3 Autonomy)
 * 
 * Decomposes natural language user goals (in English, Bangla, and Banglish)
 * into high-level adaptive task plans.
 */

import { TaskPlan, TaskPlanStep } from "./AutonomousTypes";
import { applicationResolver } from "../ApplicationResolver";

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
   * Decomposes a user prompt into a high-level adaptive TaskPlan
   */
  public planTask(goal: string, taskId?: string): TaskPlan {
    const id = taskId || `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const trimmed = goal.trim();
    const lower = trimmed.toLowerCase();
    const steps: TaskPlanStep[] = [];

    // 1. Check Hardware & System Controls first
    // Flashlight
    if (/\b(?:flashlight|torch|light)\b/i.test(lower)) {
      const isOff = /\b(?:off|bondho|nibhao|nibhiye|stop)\b/i.test(lower);
      const isOn = /\b(?:on|chalu|jalao|jalo|start)\b/i.test(lower) || !isOff;
      steps.push({
        stepId: "step_1_torch",
        description: isOn ? "Turn on flashlight" : "Turn off flashlight",
        targetAction: "set_flashlight",
        status: "pending",
        expectedOutcome: isOn ? "Flashlight is on" : "Flashlight is off",
      });
      return { taskId: id, goal: trimmed, steps, isAdaptive: false, version: 1, createdAt: Date.now(), updatedAt: Date.now() };
    }

    // Volume
    if (/\b(?:volume|sound|awaj|shobdo)\b/i.test(lower)) {
      let dir: "up" | "down" | "mute" | "unmute" | "max" = "up";
      if (/\b(?:mute|bondho|thamao|chup|silent)\b/i.test(lower)) dir = "mute";
      else if (/\b(?:unmute|chalu)\b/i.test(lower)) dir = "unmute";
      else if (/\b(?:max|full|puro)\b/i.test(lower)) dir = "max";
      else if (/\b(?:down|low|komao|koma|kom)\b/i.test(lower)) dir = "down";
      else dir = "up";

      steps.push({
        stepId: "step_1_volume",
        description: `Adjust volume to ${dir}`,
        targetAction: "adjust_volume",
        status: "pending",
        expectedOutcome: `Volume adjusted (${dir})`,
      });
      return { taskId: id, goal: trimmed, steps, isAdaptive: false, version: 1, createdAt: Date.now(), updatedAt: Date.now() };
    }

    // Media
    if (/\b(?:music|song|gaan|video)\b/i.test(lower) && /\b(?:pause|play|stop|resume|next|previous|thamao|chalu|lagao|porer)\b/i.test(lower)) {
      let action: "play" | "pause" | "play_pause" | "next" | "previous" = "play_pause";
      if (/\b(?:pause|stop|thamao|bondho)\b/i.test(lower)) action = "pause";
      else if (/\b(?:next|porer|porerta)\b/i.test(lower)) action = "next";
      else if (/\b(?:prev|previous|ager|agerta)\b/i.test(lower)) action = "previous";
      else if (/\b(?:play|resume|chalu|lagao)\b/i.test(lower)) action = "play";

      steps.push({
        stepId: "step_1_media",
        description: `Media playback: ${action}`,
        targetAction: "control_media",
        status: "pending",
        expectedOutcome: `Media command ${action} executed`,
      });
      return { taskId: id, goal: trimmed, steps, isAdaptive: false, version: 1, createdAt: Date.now(), updatedAt: Date.now() };
    }

    // Phone Call (e.g., "Rahim-ke call dao", "call John", "01712345678 e phone koro")
    const callMatch = trimmed.match(/(?:call\s+(?:to\s+)?|phone\s+(?:to\s+)?)([a-z0-9\s._\-+]+)/i) ||
      trimmed.match(/([a-z0-9\s._\-+]+?)(?:-ke|-re|\s+ke|\s+re)?\s*(?:call\s*(?:dao|koro|lagao)|phone\s*(?:dao|koro|lagao))/i);
    if (callMatch && callMatch[1] && !/^(?:the|an|a|phone)$/i.test(callMatch[1].trim()) && !lower.includes("whatsapp")) {
      const recipient = callMatch[1].trim();
      steps.push({
        stepId: "step_1_call",
        description: `Initiate phone call to ${recipient}`,
        targetAction: "make_call",
        status: "pending",
        expectedOutcome: `Call dialer initiated for ${recipient}`,
      });
      return { taskId: id, goal: trimmed, steps, isAdaptive: false, version: 1, createdAt: Date.now(), updatedAt: Date.now() };
    }

    // WhatsApp Message / Chat
    if (/\b(?:whatsapp)\b/i.test(lower)) {
      const waMatch = trimmed.match(/whatsapp(?:\s+e)?\s+([a-z0-9\s._\-]+?)(?:-ke|-re|\s+ke)?\s*(?:bolo|message\s+dao|message\s+koro|send\s+message)?(?:\s+(.+))?$/i) ||
        trimmed.match(/(?:send\s+whatsapp\s+(?:message\s+)?to\s+)([a-z0-9\s._\-]+)/i);
      const contact = waMatch && waMatch[1] ? waMatch[1].trim() : "contact";
      const message = waMatch && waMatch[2] ? waMatch[2].trim() : undefined;
      steps.push({
        stepId: "step_1_whatsapp",
        description: `Open WhatsApp chat for ${contact}`,
        targetAction: "send_whatsapp",
        status: "pending",
        expectedOutcome: `WhatsApp chat opened for ${contact}`,
      });
      return { taskId: id, goal: trimmed, steps, isAdaptive: false, version: 1, createdAt: Date.now(), updatedAt: Date.now() };
    }

    // System panels (Recents, Notifications, Quick settings, Settings)
    if (/\b(?:recent\s*apps?|recents|recent\s+kholo|recent\s+dekhao)\b/i.test(lower)) {
      steps.push({
        stepId: "step_1_recents",
        description: "Open Recent Applications",
        targetAction: "press_recents",
        status: "pending",
        expectedOutcome: "Recent applications overview is open",
      });
      return { taskId: id, goal: trimmed, steps, isAdaptive: false, version: 1, createdAt: Date.now(), updatedAt: Date.now() };
    }

    if (/\b(?:notifications?|notification\s+panel|notification\s+dekhao|notif\s+namo)\b/i.test(lower)) {
      steps.push({
        stepId: "step_1_notif",
        description: "Open Notification Shade",
        targetAction: "open_notifications",
        status: "pending",
        expectedOutcome: "Notification shade is pulled down",
      });
      return { taskId: id, goal: trimmed, steps, isAdaptive: false, version: 1, createdAt: Date.now(), updatedAt: Date.now() };
    }

    if (/\b(?:wifi\s+settings?|wifi\s+kholo|bluetooth\s+settings?|bluetooth\s+kholo)\b/i.test(lower)) {
      const isWifi = /\bwifi\b/i.test(lower);
      steps.push({
        stepId: "step_1_sys_settings",
        description: `Open ${isWifi ? "Wi-Fi" : "Bluetooth"} Settings`,
        targetAction: "open_system_settings",
        status: "pending",
        expectedOutcome: `${isWifi ? "Wi-Fi" : "Bluetooth"} settings page is opened`,
      });
      return { taskId: id, goal: trimmed, steps, isAdaptive: false, version: 1, createdAt: Date.now(), updatedAt: Date.now() };
    }

    // 2. Identify Target App
    const targetApp = this.extractTargetApp(trimmed);

    // Case A: App Launch + Search / Play (e.g. "Open YouTube and search for relaxing music", "YouTube e gaan bajao")
    const searchQuery = this.extractSearchQuery(trimmed);

    if (targetApp && searchQuery) {
      steps.push({
        stepId: "step_1_launch",
        description: `Open ${targetApp} application`,
        targetAction: "open_application",
        status: "pending",
        expectedOutcome: `${targetApp} application is active on screen`,
      });

      steps.push({
        stepId: "step_2_find_search",
        description: `Locate search icon or search bar in ${targetApp}`,
        targetAction: "tap",
        status: "pending",
        expectedOutcome: "Search input field is focused and editable",
      });

      steps.push({
        stepId: "step_3_type_query",
        description: `Type "${searchQuery}" into the search field`,
        targetAction: "type_text",
        status: "pending",
        expectedOutcome: `Query text "${searchQuery}" is entered`,
      });

      steps.push({
        stepId: "step_4_verify_results",
        description: `Observe and verify search results for "${searchQuery}"`,
        targetAction: "read_screen",
        status: "pending",
        expectedOutcome: "Search result list or matching items are visible",
      });
    } else if (targetApp) {
      // Case B: Simple App Launch (e.g. "Open YouTube", "WhatsApp open koro")
      steps.push({
        stepId: "step_1_launch",
        description: `Open ${targetApp} application`,
        targetAction: "open_application",
        status: "pending",
        expectedOutcome: `${targetApp} is opened and active in foreground`,
      });

      steps.push({
        stepId: "step_2_verify",
        description: `Verify ${targetApp} home screen is visible`,
        targetAction: "read_screen",
        status: "pending",
        expectedOutcome: `${targetApp} elements are displayed`,
      });
    } else if (this.isNavigationCommand(lower)) {
      // Case C: Navigation (Back / Home)
      const action = lower.includes("home") ? "press_home" : "press_back";
      steps.push({
        stepId: "step_1_nav",
        description: action === "press_home" ? "Navigate to Home Screen" : "Navigate Back",
        targetAction: action,
        status: "pending",
        expectedOutcome: "Screen navigates accordingly",
      });
    } else {
      // Case D: Generic Autonomous Goal
      steps.push({
        stepId: "step_1_observe",
        description: "Observe active screen",
        targetAction: "read_screen",
        status: "pending",
        expectedOutcome: "Screen elements are cataloged",
      });

      steps.push({
        stepId: "step_2_decide",
        description: `Execute actions for goal: "${trimmed}"`,
        status: "pending",
        expectedOutcome: "Goal objectives are achieved",
      });
    }

    return {
      taskId: id,
      goal: trimmed,
      targetApp,
      steps,
      isAdaptive: true,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Adapts or re-plans an existing plan based on current observations or obstacles
   */
  public replan(
    currentPlan: TaskPlan,
    reason: string,
    additionalStep?: TaskPlanStep
  ): TaskPlan {
    const updatedSteps = [...currentPlan.steps];

    if (additionalStep) {
      // Insert recovery step right after currently active or failed step
      const inProgIndex = updatedSteps.findIndex((s) => s.status === "in_progress" || s.status === "pending");
      if (inProgIndex >= 0) {
        updatedSteps.splice(inProgIndex, 0, additionalStep);
      } else {
        updatedSteps.push(additionalStep);
      }
    }

    return {
      ...currentPlan,
      steps: updatedSteps,
      version: currentPlan.version + 1,
      updatedAt: Date.now(),
    };
  }

  public extractTargetApp(text: string): string | undefined {
    const lower = text.toLowerCase();

    // Check against known application registry
    const appMap: Record<string, string> = {
      youtube: "YouTube",
      whatsapp: "WhatsApp",
      spotify: "Spotify",
      chrome: "Chrome",
      browser: "Chrome",
      settings: "Settings",
      camera: "Camera",
      clock: "Clock",
      alarm: "Clock",
      calculator: "Calculator",
      maps: "Google Maps",
      gmail: "Gmail",
      telegram: "Telegram",
      facebook: "Facebook",
      instagram: "Instagram",
    };

    for (const [key, appName] of Object.entries(appMap)) {
      if (new RegExp(`\\b${key}\\b`, "i").test(lower)) {
        return appName;
      }
    }

    // Heuristic regex
    const match = lower.match(/(?:open|launch|start|kholo|chalau)\s+([a-z0-9]+)/i);
    if (match && match[1]) {
      const candidate = match[1];
      if (!/^(?:the|an|a|app|screen|phone)$/i.test(candidate)) {
        return candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }

    return undefined;
  }

  public extractSearchQuery(text: string): string | undefined {
    const lower = text.toLowerCase();

    // English patterns: "search for <query>", "play <query>", "look up <query>", "find <query>"
    const searchMatch = text.match(
      /(?:search\s+for|search|play|look\s+up|find|type)\s+["']?([^"'\n]+?)["']?(?:\s+on|\s+in|\s+app|$)/i
    );
    if (searchMatch && searchMatch[1]) {
      let q = searchMatch[1].trim();
      // Remove target app if included in query capture
      q = q.replace(/\b(?:on\s+youtube|in\s+youtube|youtube\s+e|youtube)\b/i, "").trim();
      if (q.length > 1 && !/^(?:youtube|whatsapp|spotify|settings)$/i.test(q)) {
        return q;
      }
    }

    // Bangla / Banglish patterns: "<query> search koro", "<query> play koro", "<query> bajao"
    const banglaMatch = text.match(
      /(?:youtube\s*(?:-e|\s+e)?\s*)?([a-z0-9\u0980-\u09FF\s._\-]+?)\s*(?:search\s*koro|play\s*koro|bajao|khujo)/i
    );
    if (banglaMatch && banglaMatch[1]) {
      let q = banglaMatch[1].trim();
      q = q.replace(/^(?:youtube|whatsapp|spotify)\s+/i, "").trim();
      if (q.length > 1) {
        return q;
      }
    }

    return undefined;
  }

  private isNavigationCommand(lower: string): boolean {
    return (
      /\b(?:go\s+back|back\s+jao|piche\s+jao|press\s+back|back)\b/i.test(lower) ||
      /\b(?:go\s+home|home\s+screen|press\s+home|home\s+jao)\b/i.test(lower)
    );
  }
}

export const goalInterpreter = GoalInterpreter.getInstance();
