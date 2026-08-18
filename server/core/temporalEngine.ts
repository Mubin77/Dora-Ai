export type RealTimeIntent =
  | "CURRENT_TIME"
  | "CURRENT_DATE"
  | "RELATIVE_TIME"
  | "LOCATION_TIME"
  | "WEATHER"
  | "LIVE_EVENT"
  | "STATIC";

export interface TemporalResolution {
  isRealTime: boolean;
  intent: RealTimeIntent;
  confidence: number;
  location?: string;
  isLocationAmbiguous?: boolean;
  ambiguousChoices?: string[];
  resolvedTimeZone?: string;
  formattedTime?: string;
  formattedDate?: string;
  relativeDescription?: string;
  calculatedTargetTime?: string;
  calculatedTargetDate?: string;
  weatherQuery?: string;
  rawDetails?: string;
  reason?: string;
}

// City to IANA Time Zone Mappings
const CITY_TIMEZONE_MAP: Record<string, string> = {
  // Bangladesh
  dhaka: "Asia/Dhaka",
  chittagong: "Asia/Dhaka",
  sylhet: "Asia/Dhaka",
  rajshahi: "Asia/Dhaka",
  khulna: "Asia/Dhaka",
  barisal: "Asia/Dhaka",
  rangpur: "Asia/Dhaka",
  comilla: "Asia/Dhaka",
  bangladesh: "Asia/Dhaka",

  // UK & Europe
  london: "Europe/London",
  uk: "Europe/London",
  "united kingdom": "Europe/London",
  england: "Europe/London",
  paris: "Europe/Paris",
  france: "Europe/Paris",
  berlin: "Europe/Berlin",
  germany: "Europe/Berlin",
  rome: "Europe/Rome",
  italy: "Europe/Rome",
  madrid: "Europe/Madrid",
  spain: "Europe/Madrid",
  amsterdam: "Europe/Amsterdam",
  netherlands: "Europe/Amsterdam",
  dublin: "Europe/Dublin",
  ireland: "Europe/Dublin",
  moscow: "Europe/Moscow",

  // Asia & Middle East
  tokyo: "Asia/Tokyo",
  japan: "Asia/Tokyo",
  kyoto: "Asia/Tokyo",
  osaka: "Asia/Tokyo",
  seoul: "Asia/Seoul",
  korea: "Asia/Seoul",
  "south korea": "Asia/Seoul",
  singapore: "Asia/Singapore",
  kolkata: "Asia/Kolkata",
  calcutta: "Asia/Kolkata",
  delhi: "Asia/Kolkata",
  "new delhi": "Asia/Kolkata",
  mumbai: "Asia/Kolkata",
  bombay: "Asia/Kolkata",
  bangalore: "Asia/Kolkata",
  bengaluru: "Asia/Kolkata",
  hyderabad: "Asia/Kolkata",
  chennai: "Asia/Kolkata",
  madras: "Asia/Kolkata",
  india: "Asia/Kolkata",
  dubai: "Asia/Dubai",
  uae: "Asia/Dubai",
  "abu dhabi": "Asia/Dubai",
  doha: "Asia/Qatar",
  qatar: "Asia/Qatar",
  riyadh: "Asia/Riyadh",
  "saudi arabia": "Asia/Riyadh",
  saudi: "Asia/Riyadh",
  beijing: "Asia/Shanghai",
  shanghai: "Asia/Shanghai",
  china: "Asia/Shanghai",
  "hong kong": "Asia/Hong_Kong",
  bangkok: "Asia/Bangkok",
  thailand: "Asia/Bangkok",
  kuala_lumpur: "Asia/Kuala_Lumpur",
  malaysia: "Asia/Kuala_Lumpur",
  jakarta: "Asia/Jakarta",
  indonesia: "Asia/Jakarta",

  // Americas (Specific Cities)
  "new york": "America/New_York",
  nyc: "America/New_York",
  boston: "America/New_York",
  washington: "America/New_York",
  "washington dc": "America/New_York",
  miami: "America/New_York",
  atlanta: "America/New_York",
  toronto: "America/Toronto",
  montreal: "America/Toronto",
  chicago: "America/Chicago",
  dallas: "America/Chicago",
  houston: "America/Chicago",
  austin: "America/Chicago",
  denver: "America/Denver",
  phoenix: "America/Phoenix",
  "los angeles": "America/Los_Angeles",
  la: "America/Los_Angeles",
  "san francisco": "America/Los_Angeles",
  sf: "America/Los_Angeles",
  seattle: "America/Los_Angeles",
  vancouver: "America/Vancouver",

  // Oceania
  sydney: "Australia/Sydney",
  melbourne: "Australia/Melbourne",
  brisbane: "Australia/Brisbane",
  perth: "Australia/Perth",
  auckland: "Pacific/Auckland",
  "new zealand": "Pacific/Auckland",
};

// Ambiguous countries with multiple time zones
const AMBIGUOUS_LOCATIONS: Record<string, string[]> = {
  usa: ["New York (Eastern)", "Chicago (Central)", "Denver (Mountain)", "Los Angeles (Pacific)"],
  america: ["New York (Eastern)", "Chicago (Central)", "Denver (Mountain)", "Los Angeles (Pacific)"],
  "united states": ["New York", "Chicago", "Los Angeles"],
  us: ["New York", "Los Angeles", "Chicago"],
  canada: ["Toronto (Eastern)", "Vancouver (Pacific)", "Calgary (Mountain)"],
  australia: ["Sydney (Eastern)", "Perth (Western)", "Adelaide (Central)"],
  russia: ["Moscow", "Vladivostok", "Novosibirsk"],
};

export class TemporalEngine {
  private static instance: TemporalEngine;

  private constructor() {}

  public static getInstance(): TemporalEngine {
    if (!TemporalEngine.instance) {
      TemporalEngine.instance = new TemporalEngine();
    }
    return TemporalEngine.instance;
  }

  /**
   * Analyzes user message to determine real-time temporal and environmental requirements
   */
  public analyzeAndResolve(
    message: string,
    options: {
      clientTimeZone?: string;
      referenceDate?: Date;
    } = {}
  ): TemporalResolution {
    if (!message || typeof message !== "string") {
      return { isRealTime: false, intent: "STATIC", confidence: 1.0 };
    }

    const trimmed = message.trim();
    const lower = trimmed.toLowerCase();
    const refDate = options.referenceDate || new Date();
    const userTimeZone = options.clientTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dhaka";

    // -------------------------------------------------------------
    // 1. WEATHER QUERIES
    // -------------------------------------------------------------
    const isWeather =
      /\b(?:weather|temperature|forecast|rain|raining|snow|humidity|brishti|gorom|thanda|abohawa)\b/i.test(lower) ||
      /\b(?:ajke\s+weather|brishti\s+hobe|weather\s+kemon|kemon\s+weather|ajker\s+abohawa)\b/i.test(lower) ||
      /\b(?:what(?:'s|\s+is)\s+the\s+weather|is\s+it\s+raining|how(?:'s|\s+is)\s+the\s+weather)\b/i.test(lower);

    if (isWeather) {
      // Check if location is in the prompt
      const locationMatch = this.extractLocationFromWeather(trimmed);
      return {
        isRealTime: true,
        intent: "WEATHER",
        confidence: 0.95,
        location: locationMatch || undefined,
        weatherQuery: locationMatch ? `weather in ${locationMatch}` : undefined,
        reason: locationMatch
          ? `Weather requested for specific location: ${locationMatch}`
          : "General weather requested without explicit location",
      };
    }

    // -------------------------------------------------------------
    // 2. LOCATION-AWARE TIME (e.g. "London e ekhon koyta baje?", "USA te koyta baje?", "Japan e ekhon koto?")
    // -------------------------------------------------------------
    const locationTimeCheck = this.detectLocationTime(trimmed);
    if (locationTimeCheck) {
      if (locationTimeCheck.isAmbiguous) {
        return {
          isRealTime: true,
          intent: "LOCATION_TIME",
          confidence: 0.95,
          location: locationTimeCheck.location,
          isLocationAmbiguous: true,
          ambiguousChoices: locationTimeCheck.choices,
          reason: `Location "${locationTimeCheck.location}" has multiple timezones and requires city clarification.`,
        };
      }

      if (locationTimeCheck.timeZone) {
        const targetTimeStr = this.formatTimeInZone(refDate, locationTimeCheck.timeZone);
        const targetDateStr = this.formatDateInZone(refDate, locationTimeCheck.timeZone);
        return {
          isRealTime: true,
          intent: "LOCATION_TIME",
          confidence: 0.98,
          location: locationTimeCheck.location,
          resolvedTimeZone: locationTimeCheck.timeZone,
          formattedTime: targetTimeStr,
          formattedDate: targetDateStr,
          rawDetails: `Current local time in ${locationTimeCheck.location} (${locationTimeCheck.timeZone}) is ${targetTimeStr}, ${targetDateStr}.`,
          reason: `Resolved timezone ${locationTimeCheck.timeZone} for ${locationTimeCheck.location}`,
        };
      }
    }

    // -------------------------------------------------------------
    // 3. RELATIVE TIME (e.g. "2 ghonta por koyta baje hobe?", "in 30 minutes", "3 hours from now")
    // -------------------------------------------------------------
    const relativeTimeCheck = this.detectRelativeTime(trimmed, refDate, userTimeZone);
    if (relativeTimeCheck) {
      return {
        isRealTime: true,
        intent: "RELATIVE_TIME",
        confidence: 0.98,
        resolvedTimeZone: userTimeZone,
        formattedTime: this.formatTimeInZone(refDate, userTimeZone),
        formattedDate: this.formatDateInZone(refDate, userTimeZone),
        relativeDescription: relativeTimeCheck.description,
        calculatedTargetTime: relativeTimeCheck.targetTimeStr,
        calculatedTargetDate: relativeTimeCheck.targetDateStr,
        rawDetails: `Current time is ${this.formatTimeInZone(refDate, userTimeZone)}. ${relativeTimeCheck.description} will be ${relativeTimeCheck.targetTimeStr} (${relativeTimeCheck.targetDateStr}).`,
        reason: `Calculated future/relative time: ${relativeTimeCheck.description}`,
      };
    }

    // -------------------------------------------------------------
    // 4. CURRENT TIME (User Local Time)
    // -------------------------------------------------------------
    const isCurrentTimeQuery =
      /\b(?:what\s+time\s+is\s+it|current\s+time|time\s+now|what's\s+the\s+time|koyta\s+baje|koto\s+baje|time\s+koto|ekhon\s+koyta|ekhon\s+koto|somoy\s+koto)\b/i.test(lower) ||
      /^(?:time|what\s+time|ekhon\s+koyta\s+baje\??|time\s+please)\b/i.test(lower) ||
      /\b(?:koyta\s+baje\s+ekhon|ekhon\s+time\s+koto)\b/i.test(lower);

    if (isCurrentTimeQuery) {
      const formattedTime = this.formatTimeInZone(refDate, userTimeZone);
      const formattedDate = this.formatDateInZone(refDate, userTimeZone);
      return {
        isRealTime: true,
        intent: "CURRENT_TIME",
        confidence: 0.99,
        resolvedTimeZone: userTimeZone,
        formattedTime,
        formattedDate,
        rawDetails: `User's current local time is ${formattedTime} (${userTimeZone}). Date: ${formattedDate}.`,
        reason: "User local current time requested",
      };
    }

    // -------------------------------------------------------------
    // 5. CURRENT DATE (User Local Date, Day of Week, Tomorrow/Yesterday)
    // -------------------------------------------------------------
    const isDateQuery =
      /\b(?:what\s+is\s+today'?s?\s+date|what\s+date\s+is\s+today|today'?s?\s+date|what\s+day\s+is\s+it|ajke\s+koy\s+tarik|ajke\s+ki\s+bar|ajker\s+tarik|aj\s+ki\s+bar|kalke\s+koy\s+tarik|kalke\s+ki\s+bar|tarik\s+koto|aj\s+koto\s+tarik)\b/i.test(lower) ||
      /^(?:date|today\s+date|ajke\s+koy\s+tarik\??|ajke\s+ki\s+bar\??)\b/i.test(lower);

    if (isDateQuery) {
      const isTomorrow = /\b(?:kalke|tomorrow|shokal|porer\s+din)\b/i.test(lower);
      const isYesterday = /\b(?:yesterday|gotokal|kal)\b/i.test(lower) && !isTomorrow;

      let targetRef = refDate;
      let label = "Today";
      if (isTomorrow) {
        targetRef = new Date(refDate.getTime() + 24 * 60 * 60 * 1000);
        label = "Tomorrow (Kalke)";
      } else if (isYesterday) {
        targetRef = new Date(refDate.getTime() - 24 * 60 * 60 * 1000);
        label = "Yesterday (Gotokal)";
      }

      const formattedDate = this.formatDateInZone(targetRef, userTimeZone);
      const formattedTime = this.formatTimeInZone(targetRef, userTimeZone);
      const dayOfWeek = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: userTimeZone }).format(targetRef);

      return {
        isRealTime: true,
        intent: "CURRENT_DATE",
        confidence: 0.99,
        resolvedTimeZone: userTimeZone,
        formattedTime,
        formattedDate,
        rawDetails: `${label} date is ${formattedDate} (${dayOfWeek}). Current time: ${formattedTime} (${userTimeZone}).`,
        reason: `${label} date / day-of-week requested`,
      };
    }

    return {
      isRealTime: false,
      intent: "STATIC",
      confidence: 0.9,
      reason: "Standard static/conversational query",
    };
  }

  /**
   * Extracts location from weather queries (e.g. "Dhaka-r weather", "weather in London", "Chittagong weather")
   */
  private extractLocationFromWeather(text: string): string | null {
    const clean = text.trim();
    // Patterns like "weather in London", "weather of Tokyo", "weather at New York"
    const inMatch = clean.match(/\bweather\s+(?:in|of|at|for)\s+([A-Za-z\s]+?)(?:\?|$|\s+today|\s+now)/i);
    if (inMatch && inMatch[1].trim().length > 1) {
      return inMatch[1].trim();
    }

    // Bengali suffixes like "Dhaka-r weather", "Sylhet er weather", "London-er weather"
    const suffixMatch = clean.match(/\b([A-Za-z]+)(?:-?r|-?er)\s+weather\b/i);
    if (suffixMatch && suffixMatch[1].trim().length > 1) {
      return suffixMatch[1].trim();
    }

    // Direct check for known cities in prompt
    for (const city of Object.keys(CITY_TIMEZONE_MAP)) {
      const reg = new RegExp(`\\b${city}\\b`, "i");
      if (reg.test(text)) {
        return city.charAt(0).toUpperCase() + city.slice(1);
      }
    }

    return null;
  }

  /**
   * Detects location-based time queries (e.g. "London e ekhon koyta baje?", "USA te koyta baje?")
   */
  private detectLocationTime(text: string): {
    location: string;
    timeZone?: string;
    isAmbiguous?: boolean;
    choices?: string[];
  } | null {
    const lower = text.toLowerCase();

    // Check if asking about time in another place
    const hasTimeInLocationIntent =
      /\b(?:koyta\s+baje|koto\s+baje|time\s+is\s+it|current\s+time|what\s+time|time\s+now|somoy\s+koto|koto)\b/i.test(lower) ||
      /\b(?:time\s+in|time\s+at)\b/i.test(lower);

    if (!hasTimeInLocationIntent) {
      return null;
    }

    // 1. Check ambiguous countries first
    for (const [country, choices] of Object.entries(AMBIGUOUS_LOCATIONS)) {
      const reg = new RegExp(`\\b${country}(?:[\\-\\s]?(?:te|e|er|\\s+in|\\s+at))?\\b`, "i");
      if (reg.test(lower)) {
        // If a specific city within that country is also mentioned (e.g. "USA New York e"), prioritize the city!
        const specificCity = this.findSpecificCityInText(lower);
        if (specificCity) {
          return { location: specificCity.name, timeZone: specificCity.timeZone };
        }
        return {
          location: country.toUpperCase(),
          isAmbiguous: true,
          choices,
        };
      }
    }

    // 2. Check specific cities / unambiguous countries
    const cityResult = this.findSpecificCityInText(lower);
    if (cityResult) {
      return {
        location: cityResult.name,
        timeZone: cityResult.timeZone,
      };
    }

    return null;
  }

  private findSpecificCityInText(text: string): { name: string; timeZone: string } | null {
    for (const [cityKey, timeZone] of Object.entries(CITY_TIMEZONE_MAP)) {
      // Support suffixes like "london-e", "tokyo te", "dhaka-r"
      const reg = new RegExp(`\\b${cityKey}(?:-?e|-?te|-?er|-?r)?\\b`, "i");
      if (reg.test(text)) {
        const formattedName = cityKey
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        return { name: formattedName, timeZone };
      }
    }
    return null;
  }

  /**
   * Detects relative time (e.g. "2 ghonta por koyta baje hobe?", "in 30 minutes", "1 hour ago")
   */
  private detectRelativeTime(
    text: string,
    refDate: Date,
    timeZone: string
  ): {
    description: string;
    targetTimeStr: string;
    targetDateStr: string;
  } | null {
    const lower = text.toLowerCase();

    // Check for "X ghonta/hour/minute por/later/in X hours"
    // Examples: "2 ghonta por", "2 hours from now", "in 30 minutes", "30 minute por", "half an hour later"
    let offsetMinutes = 0;
    let description = "";

    const hoursPorMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:ghonta|ghontar|hours?|hrs?)\s*(?:por|pore|later|after|from\s+now)/i);
    const inHoursMatch = lower.match(/in\s+(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);

    const minutesPorMatch = lower.match(/(\d+)\s*(?:minutes?|mins?|min|m)\s*(?:por|pore|later|after|from\s+now)/i);
    const inMinutesMatch = lower.match(/in\s+(\d+)\s*(?:minutes?|mins?|min)/i);

    if (hoursPorMatch) {
      const h = parseFloat(hoursPorMatch[1]);
      offsetMinutes = Math.round(h * 60);
      description = `In ${h} hour${h > 1 ? "s" : ""} (${h} ghonta por)`;
    } else if (inHoursMatch) {
      const h = parseFloat(inHoursMatch[1]);
      offsetMinutes = Math.round(h * 60);
      description = `In ${h} hour${h > 1 ? "s" : ""}`;
    } else if (minutesPorMatch) {
      const m = parseInt(minutesPorMatch[1], 10);
      offsetMinutes = m;
      description = `In ${m} minute${m > 1 ? "s" : ""} (${m} minute por)`;
    } else if (inMinutesMatch) {
      const m = parseInt(inMinutesMatch[1], 10);
      offsetMinutes = m;
      description = `In ${m} minute${m > 1 ? "s" : ""}`;
    }

    if (offsetMinutes === 0) {
      return null;
    }

    const targetDate = new Date(refDate.getTime() + offsetMinutes * 60 * 1000);
    const targetTimeStr = this.formatTimeInZone(targetDate, timeZone);
    const targetDateStr = this.formatDateInZone(targetDate, timeZone);

    return {
      description,
      targetTimeStr,
      targetDateStr,
    };
  }

  /**
   * Formats time strictly according to target IANA timeZone (e.g. "5:05 PM")
   */
  public formatTimeInZone(date: Date, timeZone: string): string {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(date);
    } catch {
      return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(date);
    }
  }

  /**
   * Formats date strictly according to target IANA timeZone (e.g. "17 August 2026, Monday")
   */
  public formatDateInZone(date: Date, timeZone: string): string {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        day: "numeric",
        month: "long",
        year: "numeric",
        weekday: "long",
      }).formatToParts(date);

      const day = parts.find((p) => p.type === "day")?.value;
      const month = parts.find((p) => p.type === "month")?.value;
      const year = parts.find((p) => p.type === "year")?.value;
      const weekday = parts.find((p) => p.type === "weekday")?.value;

      return `${day} ${month} ${year}, ${weekday}`;
    } catch {
      return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
        weekday: "long",
      });
    }
  }
}

export const temporalEngine = TemporalEngine.getInstance();
