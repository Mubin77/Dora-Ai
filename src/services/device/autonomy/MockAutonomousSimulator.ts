/**
 * Dora Mock Autonomous Simulator (Phase 3 Autonomy)
 * 
 * Provides a faithful simulated environment for testing the autonomous observe-plan-act-verify
 * loop without requiring an active physical Android companion hardware connection.
 */

import { ScreenObservation, UIElement } from "../DeviceActionTypes";
import { screenObservationManager } from "../ScreenObservationManager";

export class MockAutonomousSimulator {
  private static instance: MockAutonomousSimulator;

  private currentApp: string = "com.android.launcher";
  private currentScreenState: "home" | "search_bar_open" | "search_results" | "settings" = "home";
  private currentSearchQuery: string = "";

  private constructor() {}

  public static getInstance(): MockAutonomousSimulator {
    if (!MockAutonomousSimulator.instance) {
      MockAutonomousSimulator.instance = new MockAutonomousSimulator();
    }
    return MockAutonomousSimulator.instance;
  }

  public reset(): void {
    this.currentApp = "com.android.launcher";
    this.currentScreenState = "home";
    this.currentSearchQuery = "";
  }

  public setApp(packageName: string): void {
    this.currentApp = packageName;
    this.currentScreenState = "home";
  }

  /**
   * Generates a simulated live screen observation based on current simulated device state
   */
  public getCurrentScreenObservation(): ScreenObservation {
    const isYouTube = this.currentApp.includes("youtube");
    const isWhatsApp = this.currentApp.includes("whatsapp");

    if (isYouTube) {
      return this.generateYouTubeScreen();
    }

    if (isWhatsApp) {
      return this.generateWhatsAppScreen();
    }

    return this.generateHomeScreen();
  }

  /**
   * Simulates the execution of a device action and transitions the mock screen state
   */
  public simulateAction(action: string, params: Record<string, any> = {}): { success: boolean; stateChanged: boolean } {
    let stateChanged = false;

    switch (action) {
      case "open_application":
        const appName = String(params.appName || "YouTube").toLowerCase();
        if (appName.includes("youtube")) {
          this.currentApp = "com.google.android.youtube";
        } else if (appName.includes("whatsapp")) {
          this.currentApp = "com.whatsapp";
        } else {
          this.currentApp = `com.example.${appName}`;
        }
        this.currentScreenState = "home";
        stateChanged = true;
        break;

      case "tap":
        if (this.currentApp.includes("youtube")) {
          if (this.currentScreenState === "home") {
            this.currentScreenState = "search_bar_open";
            stateChanged = true;
          }
        }
        break;

      case "type_text":
        if (params.text) {
          this.currentSearchQuery = String(params.text);
          this.currentScreenState = "search_results";
          stateChanged = true;
        }
        break;

      case "scroll":
      case "swipe":
        stateChanged = true;
        break;

      case "press_back":
        if (this.currentScreenState === "search_results") {
          this.currentScreenState = "search_bar_open";
          stateChanged = true;
        } else if (this.currentScreenState === "search_bar_open") {
          this.currentScreenState = "home";
          stateChanged = true;
        } else {
          this.currentApp = "com.android.launcher";
          this.currentScreenState = "home";
          stateChanged = true;
        }
        break;

      case "press_home":
        this.currentApp = "com.android.launcher";
        this.currentScreenState = "home";
        stateChanged = true;
        break;
    }

    return { success: true, stateChanged };
  }

  private generateYouTubeScreen(): ScreenObservation {
    const elements: Array<Partial<UIElement>> = [];

    if (this.currentScreenState === "home") {
      elements.push(
        {
          className: "android.widget.TextView",
          text: "YouTube",
          contentDescription: "YouTube Home",
          clickable: false,
          bounds: { left: 40, top: 80, right: 280, bottom: 150 },
        },
        {
          className: "android.widget.Button",
          text: "Search",
          contentDescription: "Search YouTube",
          resourceId: "com.google.android.youtube:id/menu_search",
          clickable: true,
          bounds: { left: 750, top: 80, right: 880, bottom: 150 },
        },
        {
          className: "android.widget.Button",
          text: "Notifications",
          contentDescription: "Notifications",
          resourceId: "com.google.android.youtube:id/menu_notifications",
          clickable: true,
          bounds: { left: 890, top: 80, right: 980, bottom: 150 },
        },
        {
          className: "android.view.ViewGroup",
          text: "Explore Trending Videos",
          contentDescription: "Feed Item 1",
          clickable: true,
          bounds: { left: 0, top: 200, right: 1080, bottom: 700 },
        }
      );
    } else if (this.currentScreenState === "search_bar_open") {
      elements.push(
        {
          className: "android.widget.Button",
          text: "Back",
          contentDescription: "Navigate up",
          resourceId: "com.google.android.youtube:id/back_button",
          clickable: true,
          bounds: { left: 20, top: 80, right: 100, bottom: 150 },
        },
        {
          className: "android.widget.EditText",
          text: this.currentSearchQuery || "",
          contentDescription: "Search YouTube",
          resourceId: "com.google.android.youtube:id/search_edit_text",
          clickable: true,
          editable: true,
          bounds: { left: 120, top: 80, right: 900, bottom: 150 },
        },
        {
          className: "android.widget.Button",
          text: "Voice Search",
          contentDescription: "Search with your voice",
          resourceId: "com.google.android.youtube:id/voice_search",
          clickable: true,
          bounds: { left: 920, top: 80, right: 1020, bottom: 150 },
        }
      );
    } else if (this.currentScreenState === "search_results") {
      elements.push(
        {
          className: "android.widget.EditText",
          text: this.currentSearchQuery || "relaxing music",
          contentDescription: "Search YouTube",
          resourceId: "com.google.android.youtube:id/search_edit_text",
          clickable: true,
          editable: true,
          bounds: { left: 120, top: 80, right: 900, bottom: 150 },
        },
        {
          className: "android.view.ViewGroup",
          text: `${this.currentSearchQuery || "Relaxing Music"} - 24/7 Live Stream Radio`,
          contentDescription: `Video: ${this.currentSearchQuery || "Relaxing Music"} Live`,
          clickable: true,
          bounds: { left: 0, top: 180, right: 1080, bottom: 650 },
        },
        {
          className: "android.view.ViewGroup",
          text: `Top 50 Best Tracks for ${this.currentSearchQuery || "Relaxation"}`,
          contentDescription: "Video Result 2",
          clickable: true,
          bounds: { left: 0, top: 660, right: 1080, bottom: 1100 },
        }
      );
    }

    return screenObservationManager.createObservation({
      packageName: "com.google.android.youtube",
      activityName: "com.google.android.youtube.HomeActivity",
      windowTitle: "YouTube",
      elements,
    });
  }

  private generateWhatsAppScreen(): ScreenObservation {
    return screenObservationManager.createObservation({
      packageName: "com.whatsapp",
      activityName: "com.whatsapp.HomeActivity",
      windowTitle: "WhatsApp",
      elements: [
        {
          className: "android.widget.TextView",
          text: "WhatsApp",
          clickable: false,
          bounds: { left: 40, top: 80, right: 300, bottom: 150 },
        },
        {
          className: "android.widget.Button",
          text: "Search",
          contentDescription: "Search chats",
          clickable: true,
          bounds: { left: 800, top: 80, right: 900, bottom: 150 },
        },
        {
          className: "android.view.ViewGroup",
          text: "Family Group",
          clickable: true,
          bounds: { left: 0, top: 180, right: 1080, bottom: 350 },
        },
      ],
    });
  }

  private generateHomeScreen(): ScreenObservation {
    return screenObservationManager.createObservation({
      packageName: "com.android.launcher",
      activityName: "com.android.launcher.Launcher",
      windowTitle: "Home",
      elements: [
        {
          className: "android.widget.TextView",
          text: "Google",
          clickable: true,
          bounds: { left: 100, top: 300, right: 980, bottom: 420 },
        },
        {
          className: "android.widget.TextView",
          text: "YouTube",
          contentDescription: "YouTube App",
          clickable: true,
          bounds: { left: 60, top: 1800, right: 240, bottom: 2000 },
        },
        {
          className: "android.widget.TextView",
          text: "WhatsApp",
          contentDescription: "WhatsApp App",
          clickable: true,
          bounds: { left: 300, top: 1800, right: 480, bottom: 2000 },
        },
      ],
    });
  }
}

export const mockAutonomousSimulator = MockAutonomousSimulator.getInstance();
