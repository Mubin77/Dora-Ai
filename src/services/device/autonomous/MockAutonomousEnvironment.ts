/**
 * Dora Mock Autonomous Android Environment
 * 
 * Provides a stateful simulated Android OS environment for autonomous agent testing.
 * Accurately transitions UI screens (Home -> App -> Search Box -> Results -> Playback),
 * generates realistic accessibility trees, and simulates edge cases (popups, dialogs, auth screens).
 */

import { ScreenObservation, UIElement } from "../DeviceActionTypes";
import { screenObservationManager } from "../ScreenObservationManager";

export type MockScreenState =
  | "ANDROID_HOME"
  | "YOUTUBE_FEED"
  | "YOUTUBE_SEARCH_BOX"
  | "YOUTUBE_SEARCH_RESULTS"
  | "YOUTUBE_VIDEO_PLAYING"
  | "WHATSAPP_CHATS"
  | "WHATSAPP_CONVERSATION"
  | "DIALOG_OVERLAY"
  | "PASSWORD_AUTH_SCREEN";

export class MockAutonomousEnvironment {
  private static instance: MockAutonomousEnvironment;

  private state: MockScreenState = "ANDROID_HOME";
  private activePackage: string = "com.google.android.apps.nexuslauncher";
  private searchQuery: string = "";
  private hasPendingDialog: boolean = false;
  private isSimulatedDeviceActive: boolean = true;

  private constructor() {}

  public static getInstance(): MockAutonomousEnvironment {
    if (!MockAutonomousEnvironment.instance) {
      MockAutonomousEnvironment.instance = new MockAutonomousEnvironment();
    }
    return MockAutonomousEnvironment.instance;
  }

  /**
   * Resets simulation environment to clean home screen state
   */
  public reset(initialState: MockScreenState = "ANDROID_HOME"): void {
    this.state = initialState;
    this.searchQuery = "";
    this.hasPendingDialog = false;
    this.isSimulatedDeviceActive = true;
    if (initialState === "YOUTUBE_FEED") {
      this.activePackage = "com.google.android.youtube";
    } else if (initialState === "WHATSAPP_CHATS") {
      this.activePackage = "com.whatsapp";
    } else {
      this.activePackage = "com.google.android.apps.nexuslauncher";
    }
  }

  public setScreenState(state: MockScreenState): void {
    this.state = state;
  }

  public getScreenState(): MockScreenState {
    return this.state;
  }

  public setSimulatedDeviceActive(active: boolean): void {
    this.isSimulatedDeviceActive = active;
  }

  public isDeviceActive(): boolean {
    return this.isSimulatedDeviceActive;
  }

  /**
   * Simulates action execution and produces state transition
   */
  public simulateAction(
    action: string,
    params: Record<string, any> = {}
  ): { success: boolean; message: string; newObservation: ScreenObservation } {
    if (!this.isSimulatedDeviceActive) {
      return {
        success: false,
        message: "Simulated Android companion is disconnected.",
        newObservation: this.getCurrentScreenObservation(),
      };
    }

    switch (action) {
      case "open_application": {
        const app = (params.appName || "").toLowerCase();
        if (app.includes("youtube")) {
          this.activePackage = "com.google.android.youtube";
          this.state = "YOUTUBE_FEED";
          return {
            success: true,
            message: "Opened YouTube",
            newObservation: this.getCurrentScreenObservation(),
          };
        }
        if (app.includes("whatsapp")) {
          this.activePackage = "com.whatsapp";
          this.state = "WHATSAPP_CHATS";
          return {
            success: true,
            message: "Opened WhatsApp",
            newObservation: this.getCurrentScreenObservation(),
          };
        }
        this.activePackage = `com.example.${app.replace(/\s+/g, "")}`;
        return {
          success: true,
          message: `Opened ${params.appName}`,
          newObservation: this.getCurrentScreenObservation(),
        };
      }

      case "tap": {
        const desc = (params.targetDescription || "").toLowerCase();
        const elId = params.elementId || "";

        // Tapping Search in YouTube
        if (this.state === "YOUTUBE_FEED" && (desc.includes("search") || elId.includes("search"))) {
          this.state = "YOUTUBE_SEARCH_BOX";
          return {
            success: true,
            message: "Tapped Search icon",
            newObservation: this.getCurrentScreenObservation(),
          };
        }

        // Tapping Video result in YouTube Search Results
        if (this.state === "YOUTUBE_SEARCH_RESULTS" && (desc.includes("video") || desc.includes("music") || desc.includes("relaxing") || desc.includes("result") || elId.length > 0)) {
          this.state = "YOUTUBE_VIDEO_PLAYING";
          return {
            success: true,
            message: "Tapped video result to start playback",
            newObservation: this.getCurrentScreenObservation(),
          };
        }

        // Tapping confirm on dialog
        if (this.state === "DIALOG_OVERLAY" && (desc.includes("ok") || desc.includes("allow") || desc.includes("continue") || desc.includes("confirm"))) {
          this.state = "YOUTUBE_FEED";
          this.hasPendingDialog = false;
          return {
            success: true,
            message: "Acknowledged and dismissed dialog overlay",
            newObservation: this.getCurrentScreenObservation(),
          };
        }

        return {
          success: true,
          message: `Tapped element (${params.elementId || desc})`,
          newObservation: this.getCurrentScreenObservation(),
        };
      }

      case "type_text": {
        const text = params.text || "";
        this.searchQuery = text;

        if (this.state === "YOUTUBE_SEARCH_BOX") {
          // After typing search text, transitions to search results
          this.state = "YOUTUBE_SEARCH_RESULTS";
          return {
            success: true,
            message: `Typed search query "${text}" and submitted search`,
            newObservation: this.getCurrentScreenObservation(),
          };
        }

        return {
          success: true,
          message: `Typed text "${text}"`,
          newObservation: this.getCurrentScreenObservation(),
        };
      }

      case "scroll":
      case "swipe": {
        return {
          success: true,
          message: `Scrolled ${params.direction || "down"}`,
          newObservation: this.getCurrentScreenObservation(),
        };
      }

      case "press_back": {
        if (this.state === "YOUTUBE_VIDEO_PLAYING") {
          this.state = "YOUTUBE_SEARCH_RESULTS";
        } else if (this.state === "YOUTUBE_SEARCH_RESULTS") {
          this.state = "YOUTUBE_FEED";
        } else if (this.state === "YOUTUBE_SEARCH_BOX") {
          this.state = "YOUTUBE_FEED";
        } else if (this.state === "DIALOG_OVERLAY") {
          this.state = "YOUTUBE_FEED";
          this.hasPendingDialog = false;
        } else {
          this.state = "ANDROID_HOME";
        }
        return {
          success: true,
          message: "Navigated Back",
          newObservation: this.getCurrentScreenObservation(),
        };
      }

      case "press_home": {
        this.state = "ANDROID_HOME";
        this.activePackage = "com.google.android.apps.nexuslauncher";
        return {
          success: true,
          message: "Navigated to Home screen",
          newObservation: this.getCurrentScreenObservation(),
        };
      }

      default:
        return {
          success: true,
          message: `Executed simulated action: ${action}`,
          newObservation: this.getCurrentScreenObservation(),
        };
    }
  }

  /**
   * Generates a realistic ScreenObservation for current mock state
   */
  public getCurrentScreenObservation(): ScreenObservation {
    const elements: Array<Partial<UIElement>> = [];

    switch (this.state) {
      case "ANDROID_HOME":
        elements.push(
          {
            className: "android.widget.TextView",
            text: "Google Search Bar",
            contentDescription: "Search Bar",
            clickable: true,
            editable: false,
            bounds: { left: 40, top: 120, right: 1040, bottom: 220 },
          },
          {
            className: "android.widget.TextView",
            text: "YouTube",
            contentDescription: "YouTube app icon",
            clickable: true,
            bounds: { left: 80, top: 500, right: 280, bottom: 700 },
          },
          {
            className: "android.widget.TextView",
            text: "WhatsApp",
            contentDescription: "WhatsApp app icon",
            clickable: true,
            bounds: { left: 320, top: 500, right: 520, bottom: 700 },
          }
        );
        return screenObservationManager.createObservation({
          packageName: "com.google.android.apps.nexuslauncher",
          activityName: "com.google.android.apps.nexuslauncher.NexusLauncherActivity",
          windowTitle: "Home",
          elements,
        });

      case "YOUTUBE_FEED":
        elements.push(
          {
            className: "android.widget.TextView",
            text: "YouTube",
            contentDescription: "YouTube Header Logo",
            clickable: false,
            bounds: { left: 40, top: 80, right: 300, bottom: 160 },
          },
          {
            className: "android.widget.Button",
            text: "Search",
            contentDescription: "Search YouTube",
            resourceId: "com.google.android.youtube:id/menu_search",
            clickable: true,
            editable: false,
            bounds: { left: 800, top: 80, right: 940, bottom: 160 },
          },
          {
            className: "android.view.ViewGroup",
            text: "Trending: Global Tech Summit 2026 Keynote",
            contentDescription: "Video card: Global Tech Summit 2026",
            clickable: true,
            bounds: { left: 0, top: 200, right: 1080, bottom: 650 },
          }
        );
        return screenObservationManager.createObservation({
          packageName: "com.google.android.youtube",
          activityName: "com.google.android.youtube.HomeActivity",
          windowTitle: "YouTube Home",
          elements,
        });

      case "YOUTUBE_SEARCH_BOX":
        elements.push(
          {
            className: "android.widget.ImageView",
            contentDescription: "Navigate up",
            resourceId: "com.google.android.youtube:id/btn_back",
            clickable: true,
            bounds: { left: 20, top: 80, right: 120, bottom: 160 },
          },
          {
            className: "android.widget.EditText",
            text: this.searchQuery || "",
            contentDescription: "Search YouTube query input",
            resourceId: "com.google.android.youtube:id/search_query_box",
            clickable: true,
            editable: true,
            focusable: true,
            bounds: { left: 140, top: 80, right: 920, bottom: 160 },
          },
          {
            className: "android.widget.Button",
            text: "Search",
            contentDescription: "Submit search",
            clickable: true,
            bounds: { left: 930, top: 80, right: 1060, bottom: 160 },
          }
        );
        return screenObservationManager.createObservation({
          packageName: "com.google.android.youtube",
          activityName: "com.google.android.youtube.SearchActivity",
          windowTitle: "Search",
          elements,
        });

      case "YOUTUBE_SEARCH_RESULTS":
        elements.push(
          {
            className: "android.widget.EditText",
            text: this.searchQuery || "relaxing music",
            contentDescription: "Search query",
            resourceId: "com.google.android.youtube:id/search_query_box",
            clickable: true,
            editable: true,
            bounds: { left: 140, top: 80, right: 920, bottom: 160 },
          },
          {
            className: "android.view.ViewGroup",
            text: `Deep Focus & ${this.searchQuery || "Relaxing Music"} - 3 Hours Calm Mix`,
            contentDescription: `Video item: Deep Focus & ${this.searchQuery || "Relaxing Music"}`,
            resourceId: "com.google.android.youtube:id/video_item_1",
            clickable: true,
            bounds: { left: 0, top: 200, right: 1080, bottom: 600 },
          },
          {
            className: "android.view.ViewGroup",
            text: `Calm Ambient Chillout Soundscapes for Stress Relief`,
            contentDescription: `Video item: Calm Ambient Chillout`,
            resourceId: "com.google.android.youtube:id/video_item_2",
            clickable: true,
            bounds: { left: 0, top: 620, right: 1080, bottom: 1020 },
          }
        );
        return screenObservationManager.createObservation({
          packageName: "com.google.android.youtube",
          activityName: "com.google.android.youtube.SearchResultsActivity",
          windowTitle: "Search Results",
          elements,
        });

      case "YOUTUBE_VIDEO_PLAYING":
        elements.push(
          {
            className: "android.view.View",
            contentDescription: "Video Player Surface",
            clickable: true,
            bounds: { left: 0, top: 80, right: 1080, bottom: 700 },
          },
          {
            className: "android.widget.TextView",
            text: `Deep Focus & ${this.searchQuery || "Relaxing Music"} - 3 Hours Calm Mix`,
            clickable: false,
            bounds: { left: 40, top: 720, right: 1040, bottom: 800 },
          },
          {
            className: "android.widget.Button",
            text: "Like",
            contentDescription: "Like video",
            clickable: true,
            bounds: { left: 40, top: 820, right: 200, bottom: 900 },
          },
          {
            className: "android.widget.Button",
            text: "Subscribe",
            contentDescription: "Subscribe to channel",
            clickable: true,
            bounds: { left: 800, top: 820, right: 1040, bottom: 900 },
          }
        );
        return screenObservationManager.createObservation({
          packageName: "com.google.android.youtube",
          activityName: "com.google.android.youtube.WatchActivity",
          windowTitle: "Playing Video",
          elements,
        });

      case "DIALOG_OVERLAY":
        elements.push(
          {
            className: "android.widget.TextView",
            text: "Update YouTube to latest version?",
            contentDescription: "Dialog Title",
            bounds: { left: 100, top: 400, right: 980, bottom: 500 },
          },
          {
            className: "android.widget.Button",
            text: "Not Now",
            contentDescription: "Dismiss update dialog",
            resourceId: "android:id/button2",
            clickable: true,
            bounds: { left: 500, top: 600, right: 700, bottom: 680 },
          },
          {
            className: "android.widget.Button",
            text: "OK",
            contentDescription: "Confirm update dialog",
            resourceId: "android:id/button1",
            clickable: true,
            bounds: { left: 740, top: 600, right: 940, bottom: 680 },
          }
        );
        return screenObservationManager.createObservation({
          packageName: "com.google.android.youtube",
          activityName: "com.google.android.youtube.PromptDialog",
          windowTitle: "Prompt Dialog",
          elements,
        });

      case "PASSWORD_AUTH_SCREEN":
        elements.push(
          {
            className: "android.widget.TextView",
            text: "Enter your account password",
            bounds: { left: 100, top: 200, right: 980, bottom: 300 },
          },
          {
            className: "android.widget.EditText",
            text: "",
            contentDescription: "Password entry field",
            resourceId: "com.example.bank:id/password",
            isPassword: true,
            clickable: true,
            editable: true,
            bounds: { left: 100, top: 350, right: 980, bottom: 450 },
          }
        );
        return screenObservationManager.createObservation({
          packageName: "com.example.bank",
          activityName: "com.example.bank.AuthActivity",
          windowTitle: "Account Verification",
          elements,
        });

      default:
        return screenObservationManager.createObservation({
          packageName: this.activePackage,
          elements: [],
        });
    }
  }
}

export const mockAutonomousEnvironment = MockAutonomousEnvironment.getInstance();
