/**
 * Dora Android Application Resolver
 * 
 * Resolves natural language application names (English, Bangla, Banglish)
 * into Android package identifiers.
 * 
 * Includes:
 * 1. Dynamic native application lookup when native bridge is present.
 * 2. Safe temporary resolver fallback for standard common applications.
 * 3. Natural language normalization and alias resolution.
 */

export interface InstalledAppInfo {
  appName: string;
  packageName: string;
  isSystemApp?: boolean;
}

export interface ApplicationResolutionResult {
  appName: string;
  packageName: string | null;
  isResolved: boolean;
  resolutionSource: "NATIVE_INSTALLED_LIST" | "SAFE_COMMON_RESOLVER_TEMPORARY" | "DIRECT_PACKAGE_NAME" | "UNRESOLVED";
  fallbackUrl?: string;
}

export class ApplicationResolver {
  private static instance: ApplicationResolver;

  // Cached list of installed applications received from native Android bridge
  private cachedInstalledApps: Map<string, InstalledAppInfo> = new Map();

  /**
   * Safe temporary fallback resolver dictionary for common mobile applications.
   * NOTE: This is clearly marked as TEMPORARY until full on-device package enumeration
   * is provided by the native Android layer.
   */
  private readonly TEMPORARY_COMMON_APPS: Record<
    string,
    { packageName: string; aliases: string[]; fallbackUrl?: string }
  > = {
    youtube: {
      packageName: "com.google.android.youtube",
      aliases: ["yt", "you tube", "ইউটিউব", "ইউটুব"],
      fallbackUrl: "https://www.youtube.com",
    },
    whatsapp: {
      packageName: "com.whatsapp",
      aliases: ["wa", "whats app", "watsapp", "হোয়াটসঅ্যাপ", "হুয়াটস্যাপ", "হোয়াটসঅ্যাপ"],
    },
    spotify: {
      packageName: "com.spotify.music",
      aliases: ["spoti", "স্পটিফাই"],
      fallbackUrl: "https://open.spotify.com",
    },
    chrome: {
      packageName: "com.android.chrome",
      aliases: ["google chrome", "browser", "ক্রোম", "ব্রাউজার"],
    },
    maps: {
      packageName: "com.google.android.apps.maps",
      aliases: ["google maps", "gmaps", "navigation", "ম্যাপস", "ম্যাপ"],
    },
    gmail: {
      packageName: "com.google.android.gm",
      aliases: ["google mail", "mail", "ইমেইল", "জিমেইল"],
    },
    camera: {
      packageName: "com.android.camera",
      aliases: ["cam", "ক্যামেরা"],
    },
    settings: {
      packageName: "com.android.settings",
      aliases: ["preferences", "setting", "সেটিংস", "ফোন সেটিংস", "সেটিং"],
    },
    phone: {
      packageName: "com.google.android.dialer",
      aliases: ["dialer", "call", "ফোন", "ডায়ালার"],
    },
    messages: {
      packageName: "com.google.android.apps.messaging",
      aliases: ["sms", "message", "মেসেজ"],
    },
    clock: {
      packageName: "com.google.android.deskclock",
      aliases: ["alarm", "timer", "ঘড়ি", "অ্যালার্ম"],
    },
    calculator: {
      packageName: "com.google.android.calculator",
      aliases: ["calc", "ক্যালকুলেটর"],
    },
    photos: {
      packageName: "com.google.android.apps.photos",
      aliases: ["gallery", "google photos", "ফটোস", "গ্যালারি"],
    },
    instagram: {
      packageName: "com.instagram.android",
      aliases: ["insta", "ig", "ইনস্টাগ্রাম"],
      fallbackUrl: "https://www.instagram.com",
    },
    telegram: {
      packageName: "org.telegram.messenger",
      aliases: ["tg", "টেলিগ্রাম"],
    },
    facebook: {
      packageName: "com.facebook.katana",
      aliases: ["fb", "ফেসবুক"],
      fallbackUrl: "https://www.facebook.com",
    },
    messenger: {
      packageName: "com.facebook.orca",
      aliases: ["fb messenger", "মেসেঞ্জার"],
    },
    netflix: {
      packageName: "com.netflix.mediaclient",
      aliases: ["নেটফ্লিক্স"],
    },
  };

  private constructor() {}

  public static getInstance(): ApplicationResolver {
    if (!ApplicationResolver.instance) {
      ApplicationResolver.instance = new ApplicationResolver();
    }
    return ApplicationResolver.instance;
  }

  /**
   * Updates cached installed applications from native Android bridge
   */
  public setInstalledApplications(apps: InstalledAppInfo[]): void {
    this.cachedInstalledApps.clear();
    for (const app of apps) {
      const normalizedName = this.normalize(app.appName);
      this.cachedInstalledApps.set(normalizedName, app);
    }
  }

  /**
   * Resolves a user-provided app name into a launchable Android package identifier
   */
  public resolveApplication(appName: string): ApplicationResolutionResult {
    if (!appName || typeof appName !== "string") {
      return {
        appName: "",
        packageName: null,
        isResolved: false,
        resolutionSource: "UNRESOLVED",
      };
    }

    const trimmed = appName.trim();
    const normalized = this.normalize(trimmed);

    // 1. Direct package name format check (e.g. "com.example.app")
    if (/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(trimmed)) {
      return {
        appName: trimmed,
        packageName: trimmed,
        isResolved: true,
        resolutionSource: "DIRECT_PACKAGE_NAME",
      };
    }

    // 2. Check native installed applications cache if populated
    if (this.cachedInstalledApps.size > 0) {
      const match = this.cachedInstalledApps.get(normalized);
      if (match) {
        return {
          appName: match.appName,
          packageName: match.packageName,
          isResolved: true,
          resolutionSource: "NATIVE_INSTALLED_LIST",
        };
      }
      // Partial / fuzzy match in installed apps
      for (const [key, app] of this.cachedInstalledApps.entries()) {
        if (key.includes(normalized) || normalized.includes(key)) {
          return {
            appName: app.appName,
            packageName: app.packageName,
            isResolved: true,
            resolutionSource: "NATIVE_INSTALLED_LIST",
          };
        }
      }
    }

    // 3. Fallback to Safe Temporary Common Resolver
    for (const [key, data] of Object.entries(this.TEMPORARY_COMMON_APPS)) {
      if (normalized === key || data.aliases.some((alias) => this.normalize(alias) === normalized)) {
        return {
          appName: this.capitalize(key),
          packageName: data.packageName,
          isResolved: true,
          resolutionSource: "SAFE_COMMON_RESOLVER_TEMPORARY",
          fallbackUrl: data.fallbackUrl,
        };
      }

      // Check substring inclusion
      if (normalized.includes(key) || data.aliases.some((alias) => normalized.includes(this.normalize(alias)))) {
        return {
          appName: this.capitalize(key),
          packageName: data.packageName,
          isResolved: true,
          resolutionSource: "SAFE_COMMON_RESOLVER_TEMPORARY",
          fallbackUrl: data.fallbackUrl,
        };
      }
    }

    return {
      appName: trimmed,
      packageName: null,
      isResolved: false,
      resolutionSource: "UNRESOLVED",
    };
  }

  private normalize(str: string): string {
    return str
      .toLowerCase()
      .replace(/[\s\-_]+/g, "")
      .replace(/[^\w\u0980-\u09FF]/g, "");
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export const applicationResolver = ApplicationResolver.getInstance();
