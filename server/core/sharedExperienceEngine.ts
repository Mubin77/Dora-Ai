/**
 * Dora Shared Experience Engine
 * 
 * Manages Camera and Screen sharing as a genuine shared human experience:
 * - Selects meaningful visual moments and filters out mundane static objects.
 * - Categorizes environment and screen activity.
 * - Links tentative visual memory references respectfully (non-hallucinatory).
 * - Generates natural Gen-Z Bangladeshi companion dialogue framing.
 */

import {
  SharedEnvironmentType,
  ScreenActivityType,
  VisualEmotionalTrigger,
  VisualObservationItem,
  SharedExperienceContext,
} from "./sharedExperienceTypes";

export class SharedExperienceEngine {
  private static instance: SharedExperienceEngine;

  private context: SharedExperienceContext = {
    activeEnvironment: "UNKNOWN",
    activeScreenActivity: "GENERAL",
    recentObservations: [],
    currentMood: "relaxed",
    lastReactionTimestamp: 0,
  };

  private constructor() {}

  public static getInstance(): SharedExperienceEngine {
    if (!SharedExperienceEngine.instance) {
      SharedExperienceEngine.instance = new SharedExperienceEngine();
    }
    return SharedExperienceEngine.instance;
  }

  // Mundane objects that should NOT trigger unprompted interruptions
  private readonly MUNDANE_OBJECTS = [
    "wall",
    "white wall",
    "empty wall",
    "floor",
    "ceiling",
    "blank screen",
    "empty desk",
    "keyboard",
    "curtain",
    "chair",
    "table",
    "door",
    "window",
  ];

  /**
   * Process a new visual frame description from Camera
   */
  public processCameraObservation(
    visualDescription: string,
    knownMemories: Array<{ key: string; value: string }> = []
  ): VisualObservationItem {
    const desc = visualDescription.toLowerCase();
    const isMundane = this.isMundaneScene(desc);

    let environment: SharedEnvironmentType = "UNKNOWN";
    let trigger: VisualEmotionalTrigger = "NONE";
    let suggestedReaction: string | undefined = undefined;
    let tentativeLink: VisualObservationItem["tentativeMemoryLink"] = undefined;

    // Detect Environment
    if (/party|celebration|lights|crowd|music|dancing|balloons|gathering/i.test(desc)) {
      environment = "PARTY";
      trigger = "SURPRISE";
      suggestedReaction = "Arehh, tui party-te achos naki? 😭 Eikhane toh pura jomjomat!";
    } else if (/cafe|restaurant|coffee|cup|plate|food|burger|pizza|biryani|tea/i.test(desc)) {
      environment = "CAFE_RESTAURANT";
      trigger = "CASUAL_CHILL";
      suggestedReaction = "Yummm, khabar dekhe toh amaro lobh lagche! 😋";
    } else if (/park|nature|trees|street|road|car|bus|sky|sun|walk|outside/i.test(desc)) {
      environment = "OUTDOORS";
      trigger = "CASUAL_CHILL";
      suggestedReaction = "Baire ghurchis? Weather kemon?";
    } else if (/monitor|laptop|code|desk|setup|study|books|workspace/i.test(desc)) {
      environment = "DESK_WORKSPACE";
      trigger = "NONE";
    }

    // Check for tentative memory match (e.g., user's friend or pet)
    for (const mem of knownMemories) {
      const name = mem.key.toLowerCase();
      if (name.length > 2 && desc.includes(name)) {
        tentativeLink = {
          memoryKey: mem.key,
          tentativePrompt: `Wait... ei cheleta/meye-ta ki tor oi friend ${mem.key}? Naki ami bhul dekhchi? 😂`,
        };
        trigger = "SURPRISE";
        break;
      }
    }

    const observation: VisualObservationItem = {
      id: `cam-obs-${Date.now()}`,
      source: "camera",
      timestamp: Date.now(),
      environment,
      trigger,
      isMeaningful: !isMundane,
      summary: visualDescription,
      suggestedReaction,
      tentativeMemoryLink: tentativeLink,
    };

    this.recordObservation(observation);
    return observation;
  }

  /**
   * Process a new visual frame description from Screen Share
   */
  public processScreenObservation(screenDescription: string): VisualObservationItem {
    const desc = screenDescription.toLowerCase();
    const isMundane = this.isMundaneScene(desc);

    let activity: ScreenActivityType = "GENERAL";
    let trigger: VisualEmotionalTrigger = "NONE";
    let suggestedReaction: string | undefined = undefined;

    // Detect Activity
    if (/error|traceback|exception|failed|red squiggly|bug|terminal error|console\.error/i.test(desc)) {
      activity = "CODE_DEVELOPMENT";
      trigger = "FRUSTRATION_BUG";
      suggestedReaction = "Wait, oi error-ta dekhe mone hocche ekhanei issue-ta. Ektu upore check kori?";
    } else if (/vscode|sublime|ide|editor|function|import|typescript|javascript|python|react/i.test(desc)) {
      activity = "CODE_DEVELOPMENT";
      trigger = "NONE";
    } else if (/meme|funny|reel|tiktok|youtube shorts|instagram|cat video|dog video|fail/i.test(desc)) {
      activity = "MEME_REEL_VIDEO";
      trigger = "HUMOR_MEME";
      suggestedReaction = "BROOO 😭😭 Nah, oi last part-ta dekhli?! 💀";
    } else if (/graph|analytics|100%|passed|all green|deploy success|build completed/i.test(desc)) {
      activity = "DOCUMENT_WORK";
      trigger = "ACHIEVEMENT_CELEBRATION";
      suggestedReaction = "WAIT—finallyyy 😭 Shob test pass korse!";
    } else if (/twitter|x\.com|facebook|reddit|linkedin|feed/i.test(desc)) {
      activity = "SOCIAL_FEED";
      trigger = "CASUAL_CHILL";
    }

    const observation: VisualObservationItem = {
      id: `screen-obs-${Date.now()}`,
      source: "screen",
      timestamp: Date.now(),
      activity,
      trigger,
      isMeaningful: !isMundane,
      summary: screenDescription,
      suggestedReaction,
    };

    this.recordObservation(observation);
    return observation;
  }

  private isMundaneScene(text: string): boolean {
    const words = text.trim().split(/\s+/);
    if (words.length <= 2) {
      return this.MUNDANE_OBJECTS.some((obj) => text.includes(obj));
    }
    return false;
  }

  private recordObservation(obs: VisualObservationItem) {
    if (obs.environment && obs.environment !== "UNKNOWN") {
      this.context.activeEnvironment = obs.environment;
    }
    if (obs.activity && obs.activity !== "GENERAL") {
      this.context.activeScreenActivity = obs.activity;
    }
    this.context.recentObservations = [obs, ...this.context.recentObservations].slice(0, 10);
  }

  public getContext(): SharedExperienceContext {
    return { ...this.context };
  }

  public getCompanionPromptFraming(): string {
    const env = this.context.activeEnvironment;
    const act = this.context.activeScreenActivity;
    const meaningfulObs = this.context.recentObservations.find((o) => o.isMeaningful && o.suggestedReaction);

    let framing = "[SHARED MULTIMODAL EXPERIENCE CONTEXT]\n";
    if (env !== "UNKNOWN") {
      framing += `- Environment: ${env} (Experience it together with the user)\n`;
    }
    if (act !== "GENERAL") {
      framing += `- Screen Activity: ${act} (Co-viewing the screen as a companion)\n`;
    }
    if (meaningfulObs && meaningfulObs.suggestedReaction) {
      framing += `- Recent Visual Cue: ${meaningfulObs.summary}\n`;
      framing += `- Natural Companion Reaction Idea: "${meaningfulObs.suggestedReaction}"\n`;
    }
    framing += "- Golden Rule: React naturally as a Gen-Z companion sharing this moment, never as a robotic visual classifier.";

    return framing;
  }
}

export const sharedExperienceEngine = SharedExperienceEngine.getInstance();
