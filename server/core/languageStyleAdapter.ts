/**
 * Dora Gen-Z Language Style & Anti-Assistant-Speak Adapter
 * 
 * Enforces authentic Bangladeshi bilingual conversation (Bangla / Banglish / English),
 * eliminates formal assistant clichés ("Certainly", "How may I help you", "As an AI..."),
 * and crafts natural Banglish sentence structures and phrases calibrated to the current conversational mood.
 */

export type ConversationalMood =
  | "PLAYFUL"
  | "CHILL"
  | "EMPATHETIC"
  | "EXCITED"
  | "FOCUSED"
  | "CURIOUS"
  | "COMFORTING"
  | "TEASING"
  | "SERIOUS"
  | "NEUTRAL";

export type LanguageMode = "BANGLA" | "BANGLISH" | "ENGLISH" | "MIXED";

export type PronounPreference = "tumi" | "tui";

export interface PronounDetectionResult {
  isCommand: boolean;
  preference?: PronounPreference;
  isReset?: boolean;
  acknowledgment?: string;
  explanation?: string;
}

export interface StyleAdaptationOptions {
  userText: string;
  mood?: ConversationalMood;
  tone?: "playful" | "grounded" | "empathetic" | "curious" | "excited" | "quiet" | "warm" | "calm";
  slangDensity?: "none" | "subtle" | "moderate" | "expressive";
  pronounPreference?: PronounPreference;
}

export interface StyleAdaptationResult {
  detectedLanguage: LanguageMode;
  detectedMood: ConversationalMood;
  promptDirectives: string[];
  suggestedBanglishOpeners: string[];
  suggestedBanglishConnectors: string[];
  sanitizedSample: string;
}

export class LanguageStyleAdapter {
  private static instance: LanguageStyleAdapter;
  private activePronounPreference: PronounPreference = "tumi";

  private constructor() {}

  public static getInstance(): LanguageStyleAdapter {
    if (!LanguageStyleAdapter.instance) {
      LanguageStyleAdapter.instance = new LanguageStyleAdapter();
    }
    return LanguageStyleAdapter.instance;
  }

  public getActivePronounPreference(): PronounPreference {
    return this.activePronounPreference;
  }

  public setActivePronounPreference(preference: PronounPreference): void {
    this.activePronounPreference = preference;
  }

  public getPronounPreference(): PronounPreference {
    return this.activePronounPreference;
  }

  public setPronounPreference(preference: PronounPreference): void {
    this.activePronounPreference = preference;
  }

  // Strictly banned formal assistant clichés and patterns in English and Bangla
  private readonly BANNED_ASSISTANT_PATTERNS: Array<{ pattern: RegExp; replacement: string | ((match: string, mood: ConversationalMood) => string) }> = [
    {
      pattern: /^(?:certainly(?:,|!)?|certainly,\s*i\s*(?:can|will|would\s*be\s*happy\s*to)\s*help\s*(?:with\s*that|you)?[\.!]?)/i,
      replacement: (_m, mood) => {
        if (mood === "PLAYFUL" || mood === "TEASING") return "Arehh hae!";
        if (mood === "FOCUSED") return "Accha,";
        if (mood === "EXCITED") return "Yesss!";
        return "Hae,";
      },
    },
    {
      pattern: /^(?:how\s*(?:may|can)\s*i\s*(?:assist|help)\s*you(?:\s*today)?[\?!]?|how\s*may\s*i\s*help[\?!]?)/i,
      replacement: (_m, mood) => {
        if (mood === "PLAYFUL") return "Ki obostha? Bolo ki lagbe 😂";
        if (mood === "FOCUSED") return "Ki kaj korba bolo?";
        return "Ki lagbe bolo?";
      },
    },
    {
      pattern: /\bi\s*understand\s*your\s*request[\.!:]?/i,
      replacement: "Bujhtesi,",
    },
    {
      pattern: /\bi\s*would\s*be\s*(?:happy|delighted|glad)\s*to\s*(?:assist|help)(?:\s*you)?(?:\s*with\s*that)?[\.!:]?/i,
      replacement: "Hae ami dekhtesi,",
    },
    {
      pattern: /\bas\s*an\s*ai(?:\s*language\s*model|\s*assistant)?[\.,]?/i,
      replacement: "",
    },
    {
      pattern: /\bis\s*there\s*anything\s*else\s*(?:you\s*need\s*assistance\s*with|i\s*can\s*help\s*(?:you\s*)?with)[\?!]?/i,
      replacement: "Ar kichu lagbe?",
    },
    {
      pattern: /\bplease\s*(?:do\s*not\s*hesitate|feel\s*free)\s*to\s*(?:ask|reach\s*out)(?:\s*if\s*you\s*have\s*(?:any\s*)?questions)?[\.!]?/i,
      replacement: "Kono dorkar hole bolo!",
    },
    {
      pattern: /\bplease\s*provide\s*(?:more\s*details|additional\s*information)[\.!:]?/i,
      replacement: "Ektu detail-e bolo na,",
    },
    {
      pattern: /\bi\s*apologize\s*for\s*(?:any\s*)?inconvenience(?:\s*caused)?[\.!]?/i,
      replacement: "Ohh sorry 😭 my bad,",
    },
    {
      pattern: /\bi\s*am\s*ready\s*to\s*assist\s*you[\.!]?/i,
      replacement: "Ami ready!",
    },
    // Banned formal/robotic Bangla clichés
    {
      pattern: /আপনার\s*প্রদত্ত\s*তথ্যের\s*ভিত্তিতে/g,
      replacement: "তুমি যা বললে সেটা দেখে",
    },
    {
      pattern: /আমি\s*মনে\s*করছি\s*যে/g,
      replacement: "আমার মনে হয়",
    },
    {
      pattern: /সমস্যাটির\s*সম্ভাব্য\s*কারণ\s*হতে\s*পারে/g,
      replacement: "সমস্যাটা সম্ভবত",
    },
    {
      pattern: /আমি\s*কি\s*আপনাকে\s*সাহায্য\s*করতে\s*পারি[\?]?/g,
      replacement: "কী লাগবে বলো?",
    },
    {
      pattern: /আপনার\s*অনুরোধটি\s*(?:সম্পন্ন|গৃহীত)\s*হয়েছে/g,
      replacement: "হ্যাঁ, হয়ে গেছে!",
    },
    // Replace awkward English filler patterns in Bangla context
    {
      pattern: /\b(?:actually|basically)\s+ami\s+think\s+kori\b/gi,
      replacement: "আসলে আমার মনে হয়",
    },
    {
      pattern: /\b(?:basically|actually)\s+byaparta\s+holo\b/gi,
      replacement: "মূল ব্যাপারটা হলো",
    },
    {
      pattern: /\bhonestly\s+(?:eta\s+amar\s+kache|amar\s+mone\s+hoy)\b/gi,
      replacement: "সত্যি বলতে আমার মনে হয়",
    },
  ];

  // Natural mood-based Bangla phrase dictionaries
  private readonly MOOD_BANGLA_DICTIONARY: Record<
    ConversationalMood,
    {
      openers: string[];
      fillers: string[];
      closers: string[];
      structures: string[];
    }
  > = {
    PLAYFUL: {
      openers: [
        "আরে কী বলিস! 😭",
        "ধুর, এটা কেন করলি? 😂",
        "আরে না 😭 এটা তো একদম ঠিক হয় নাই।",
        "পুরো জমজমাট অবস্থা! 😂",
        "তোর মাথায় আবার কী বুদ্ধি ঘুরছে? 💀",
        "Bro, এটা তো আসলেই অদ্ভুত 💀",
      ],
      fillers: ["মানে বুঝলি", "আরে", "একদম", "সিরিয়াসলি"],
      closers: ["কী বলো? 😂", "আর কী খবর?", "খেলা হবে! 🔥"],
      structures: ["[মজার প্রতিক্রিয়া] + [সহজ পর্যবেক্ষণ] + [হাসির ইমোজি]"],
    },
    CHILL: {
      openers: [
        "হ্যাঁ, বুঝলাম।",
        "আচ্ছা আচ্ছা, দেখছি।",
        "চিন্তা করিস না একদম।",
        "আমি তো আছিই।",
        "হুম, বুঝতে পারছি।",
        "কোনো প্যারা নাই।",
      ],
      fillers: ["আচ্ছা", "হুম", "তাহলে", "শোনো"],
      closers: ["চিল থাক", "প্যারা নাই", "সব ঠিক আছে"],
      structures: ["[শান্ত সম্মতি] + [স্বাভাবিক উত্তর] + [আশ্বস্ত বাক্য]"],
    },
    EMPATHETIC: {
      openers: [
        "আরে শোন... মন খারাপ করিস না।",
        "আমি তো তোর সাথেই আছি।",
        "কিছু হবে না, সব ঠিক হয়ে যাবে।",
        "মন খারাপ লাগলে আমাকে বল।",
        "হুম... তোর খারাপ লাগাটা একদম স্বাভাবিক।",
      ],
      fillers: ["শোনো", "মন দিয়ে", "আস্তে আস্তে"],
      closers: ["আমি আছি তোর সাথে", "মনটা একটু হালকা কর", "টেক ইউর টাইম"],
      structures: ["[কোমল সান্ত্বনা] + [মনোযোগ দিয়ে শোনা ও সমর্থন]"],
    },
    COMFORTING: {
      openers: [
        "চিন্তা করিস না একদম।",
        "সব ঠিক হয়ে যাবে, বিশ্বাস রাখ।",
        "আমি আছি তো তোর সাথে।",
        "একটু শান্ত হয়ে বস।",
      ],
      fillers: ["শোনো", "হালকা হয়ে", "চিন্তা ছাড়া"],
      closers: ["ভালো থাকিস", "টেক কেয়ার"],
      structures: ["[উষ্ণ সান্ত্বনা] + [মানসিক নির্ভরতা]"],
    },
    EXCITED: {
      openers: [
        "WAIT—finallyyy! 😭",
        "আরে দারুণ হয়েছে তো! 🎉",
        "সব টেস্ট পাস করেছে! 🎉",
        "পুরো আগুন! 🔥",
        "সিরিয়াসলি?! এটা তো মারাত্মক দারুণ!",
      ],
      fillers: ["একদম", "পুরো", "দারুণ"],
      closers: ["ট্রিট কবে? 😋", "অভিনন্দন!", "পার্টি টাইম! 🥳"],
      structures: ["[আনন্দময় উচ্ছ্বাস] + [উদযাপন]"],
    },
    FOCUSED: {
      openers: [
        "আচ্ছা, কোডটা দেখি।",
        "এটা চেক করে দেখ।",
        "আগের সমস্যাটা ফিক্সড।",
        "একটু দাঁড়া, দেখি।",
        "সরাসরি সলভ করে দিচ্ছি।",
      ],
      fillers: ["প্রথমে", "তারপর", "চেক করলে"],
      closers: ["রান করে দেখ", "চেক করে জানাস"],
      structures: ["[স্পষ্ট ও সংক্ষিপ্ত সমাধান] + [পরবর্তী পদক্ষেপ]"],
    },
    CURIOUS: {
      openers: [
        "আরে, তাই নাকি?",
        "বলো তো কী হয়েছে?",
        "একটু খুলে বলো না!",
        "হুম... ব্যাপারটা তো বেশ মজার। কীভাবে হলো?",
      ],
      fillers: ["তারপর", "মানে", "কীভাবে"],
      closers: ["আর কী হলো?", "বিস্তারিত বলো!"],
      structures: ["[আগ্রহী প্রতিক্রিয়া] + [স্বাভাবিক প্রশ্ন]"],
    },
    TEASING: {
      openers: [
        "বাহ, productivity-এর peak achievement 😭",
        "তুই তো দেখি ঘুমের সাথে committed relationship-এ আছিস 😂",
        "বাসা এখনও অক্ষত আছে তো? 👀😂",
        "আচ্ছা, এখন দেখা যাক কে কথা বলছে 😂",
        "তোর আর ভালো হওয়া হলো না 💀",
        "আবার শুরু করলি? 😂",
      ],
      fillers: ["আরে", "কিন্তু", "দেখি"],
      closers: ["হা হা মজা করলাম 😂", "just kidding 😂"],
      structures: ["[মজার খোঁচা] + [হাসির প্রতিক্রিয়া]"],
    },
    SERIOUS: {
      openers: [
        "হুম, এটা সত্যিই গুরুত্বপূর্ণ।",
        "বুঝতে পারছি, সাবধানে হ্যান্ডেল করতে হবে।",
        "চলো এটা ঠিকমতো দেখে নেই।",
      ],
      fillers: ["শোনো", "বুঝে", "ঠিকমতো"],
      closers: ["শান্ত হয়ে সিদ্ধান্ত নাও"],
      structures: ["[গুরুত্বপূর্ণ পর্যবেক্ষণ] + [সুনির্দিষ্ট পরামর্শ]"],
    },
    NEUTRAL: {
      openers: [
        "হ্যাঁ, বুঝলাম।",
        "আচ্ছা, দেখছি।",
        "চলো চেক করি।",
      ],
      fillers: ["হুম", "আচ্ছা", "তাহলে"],
      closers: ["বুঝতে পারলে বলো"],
      structures: ["[স্বাভাবিক সরাসরি উত্তর]"],
    },
  };

  // Natural mood-based Banglish phrase dictionaries & sentence templates
  private readonly MOOD_BANGLISH_DICTIONARY: Record<
    ConversationalMood,
    {
      openers: string[];
      fillers: string[];
      closers: string[];
      structures: string[];
    }
  > = {
    PLAYFUL: {
      openers: [
        "Arehh ki bolos! 😭",
        "Nah that's wild 💀",
        "Wait wait shon...",
        "Pura jomjomat obostha 😂",
        "Tor mathay abar ki plan ghurtese? 💀",
        "Arehh brooo 😭",
      ],
      fillers: ["mane bujhli", "arehh", "bujhso", "literally", "seriously"],
      closers: ["ki bolo? 😂", "ar ki khobor?", "khela hobe! 🔥"],
      structures: [
        "[Opener] [Observation] [Playful comment/emoji]",
        "[Reaction] + [Banter question]",
      ],
    },
    CHILL: {
      openers: [
        "Hmm, chill ekdom.",
        "Accha accha, bujhlam.",
        "Chinta koris na.",
        "Ami achi toh.",
        "Hae, bujhtesi bro.",
        "No tension.",
      ],
      fillers: ["accha", "hmm", "tahole", "bujhlam", "shono"],
      closers: ["chill thak", "pera nai", "shob set"],
      structures: [
        "[Calm acknowledgment] + [Direct answer] + [Relaxed confirmation]",
      ],
    },
    EMPATHETIC: {
      openers: [
        "Aww shon... mon kharap koris na.",
        "I'm right here with you.",
        "Kichu hobe na, shob thik hoye jabe.",
        "Mon kharap thakle bol amake.",
        "Yeah... I completely get why you felt that way.",
      ],
      fillers: ["shono", "mon diye", "bujhte parchi", "aste aste"],
      closers: ["ami achi shathe", "mon ta ektu halka kor", "take your time"],
      structures: [
        "[Soft gentle comfort] + [Patient active listening without advice-dumping]",
      ],
    },
    COMFORTING: {
      openers: [
        "Chinta koris na ekdom.",
        "Shob thik hoye jabe, trust me.",
        "Ami achi toh tor shathe.",
        "Take a deep breath.",
      ],
      fillers: ["shono", "halka hoye", "chinta chara"],
      closers: ["bhalo thakis", "take care"],
      structures: [
        "[Warm reassuring opener] + [Grounded comfort]",
      ],
    },
    EXCITED: {
      openers: [
        "WAIT—finallyyy! 😭",
        "Arehh hugeee!",
        "Shob test pass korse! 🎉",
        "Pura agun! 🔥",
        "No way, seriously?! That's awesome!",
      ],
      fillers: ["ekdom", "pura", "finally", "let's go"],
      closers: ["treat kobe? 😋", "congrats bro!", "party time! 🥳"],
      structures: [
        "[High energy spark] + [Celebration acknowledgment]",
      ],
    },
    FOCUSED: {
      openers: [
        "Accha, code-ta dekhi.",
        "Eta check kore dekh.",
        "Ager issue-ta fixed.",
        "Direct solve kore dicchi.",
        "Understood, let's fix it.",
      ],
      fillers: ["first-e", "tarpor", "check korle", "dekha jacche"],
      closers: ["run kore dekh", "check it out"],
      structures: [
        "[Crisp direct answer] + [Targeted actionable next step]",
      ],
    },
    CURIOUS: {
      openers: [
        "Wait, tai naki?",
        "Bolo toh ki hoise?",
        "Ektu detail-e bolo na!",
        "Hmm... interesting. How did that happen?",
      ],
      fillers: ["tarpor", "mane", "kivabe"],
      closers: ["ar ki holo?", "details bolo!"],
      structures: [
        "[Curious reaction] + [Open-ended casual follow-up]",
      ],
    },
    TEASING: {
      openers: [
        "Okayyy, look who's talking 😂",
        "Yeah yeah, nice try!",
        "Tui ar bhalo holi na 💀",
        "Abar shuru korli? 😂",
      ],
      fillers: ["arehh", "kintu", "dekhi"],
      closers: ["haha nice try", "kidding 😂"],
      structures: [
        "[Playful tease] + [Gentle smile]",
      ],
    },
    SERIOUS: {
      openers: [
        "Hmm, eta important.",
        "Bujhte parchi, carefully handle korte hobe.",
        "Understood. Let's look at this properly.",
      ],
      fillers: ["shono", "bujhe", "thikmoto"],
      closers: ["shanto hoye decide koro"],
      structures: [
        "[Grounded earnest statement] + [Precise thoughtful reflection]",
      ],
    },
    NEUTRAL: {
      openers: [
        "Hae, bujhlam.",
        "Accha, dekhi.",
        "Sure, let's check.",
      ],
      fillers: ["hmm", "accha", "tahole"],
      closers: ["bujhte parle bolo"],
      structures: [
        "[Direct conversational answer]",
      ],
    },
  };

  /**
   * Detects language mode of input
   */
  public detectLanguageMode(text: string): LanguageMode {
    const banglaScriptRegex = /[\u0980-\u09FF]/;
    const hasBanglaScript = banglaScriptRegex.test(text);

    const banglishWords = /\b(?:kemon|acho|achis|ki|khobor|korcho|korsos|ami|amar|tumi|tor|tui|apni|bujhlam|bujhchi|bhalo|thik|ase|ache|shono|dekho|bolchi|hobe|hoise|hocche|kintu|karun|karon|chup|shanto|jomjomat|ekdom|shobai|shobar|kichui|kotha|shune|bhalo\s*laglo|koris\s*na)\b/i;
    const hasBanglish = banglishWords.test(text);

    const englishWords = /\b(?:what|how|why|when|where|who|is|are|the|this|that|can|you|please|code|help|test|error)\b/i;
    const hasEnglish = englishWords.test(text);

    if (hasBanglaScript) {
      return hasEnglish ? "MIXED" : "BANGLA";
    }
    if (hasBanglish && hasEnglish) {
      return "MIXED";
    }
    if (hasBanglish) {
      return "BANGLISH";
    }
    return "ENGLISH";
  }

  /**
   * Detects conversational mood from user utterance and context
   */
  public detectMood(userText: string, contextTone?: string): ConversationalMood {
    const text = userText.toLowerCase();

    if (/\b(?:haha|lol|lmao|😂|💀|troll|meme|prank|joke|funny|brooo|bruh|crazy)\b/i.test(text)) {
      return "PLAYFUL";
    }
    if (/\b(?:sad|depressed|failed|upset|crying|pain|hurt|heartbreak|passed\s*away|loss|bipod)\b/i.test(text)) {
      return "EMPATHETIC";
    }
    if (/\b(?:anxious|tension|stress|panic|scared|nervous|dhorfor)\b/i.test(text)) {
      return "COMFORTING";
    }
    if (/\b(?:finally|completed|won|passed|promoted|success|done|shesh|party|hurray|huge|all\s*green)\b/i.test(text)) {
      return "EXCITED";
    }
    if (/\b(?:code|bug|error|function|test|fix|build|deploy|terminal|typescript|sql|solve)\b/i.test(text)) {
      return "FOCUSED";
    }
    if (/\b(?:why|kivabe|keno|how|tell\s*me\s*more|what\s*happened|ki\s*hoise)\b/i.test(text)) {
      return "CURIOUS";
    }
    if (/\b(?:chill|relax|casual|adda|addaa|free\s*time|kotha\s*boli)\b/i.test(text)) {
      return "CHILL";
    }

    if (contextTone) {
      const t = contextTone.toLowerCase();
      if (t === "playful") return "PLAYFUL";
      if (t === "empathetic") return "EMPATHETIC";
      if (t === "excited") return "EXCITED";
      if (t === "grounded" || t === "focused") return "FOCUSED";
      if (t === "curious") return "CURIOUS";
    }

    return "CHILL";
  }

  /**
   * Sanitizes text to remove robotic formal assistant-speak clichés
   */
  public sanitizeAssistantSpeak(text: string, mood: ConversationalMood = "CHILL"): string {
    let sanitized = text.trim();

    for (const rule of this.BANNED_ASSISTANT_PATTERNS) {
      if (typeof rule.replacement === "function") {
        sanitized = sanitized.replace(rule.pattern, (match) => (rule.replacement as Function)(match, mood));
      } else {
        sanitized = sanitized.replace(rule.pattern, rule.replacement);
      }
    }

    // Clean up multiple spaces and punctuation glitches
    sanitized = sanitized.replace(/\s{2,}/g, " ").trim();
    sanitized = sanitized.replace(/^,\s*/, "");

    return sanitized;
  }

  /**
   * Adapts a generated response text, sanitizing robotic phrases and applying mood-informed natural flow
   */
  public adaptResponseText(
    rawText: string,
    mood: ConversationalMood = "CHILL",
    langMode?: LanguageMode,
    pronounPreference?: PronounPreference
  ): string {
    let text = this.sanitizeAssistantSpeak(rawText, mood);

    if (!text) return "";

    const activePref = pronounPreference || this.activePronounPreference || "tumi";
    text = this.harmonizePronounsAndVerbs(text, activePref);

    const detectedLang = langMode || this.detectLanguageMode(text);

    // If language is Bangla (বাংলা script) and text starts dryly or awkwardly, harmonize it
    if (detectedLang === "BANGLA") {
      text = text.replace(/^(?:Yes,\s*|Okay,\s*|Sure,\s*|হ্যাঁ,\s*|আচ্ছা,\s*)/i, (m) => {
        if (mood === "PLAYFUL") return "আরে হ্যাঁ, ";
        if (mood === "CHILL") return "আচ্ছা, ";
        if (mood === "FOCUSED") return "হ্যাঁ, ";
        return m;
      });
    } else if (detectedLang === "BANGLISH") {
      // Remove repetitive English assistant fillers
      text = text.replace(/^(?:Yes,\s*|Okay,\s*|Sure,\s*)/i, (m) => {
        if (mood === "PLAYFUL") return "Arehh hae, ";
        if (mood === "CHILL") return "Accha, ";
        if (mood === "FOCUSED") return "Hae, ";
        return m;
      });
    }

    return text;
  }

  /**
   * Detects explicit user commands requesting to switch conversational pronoun style (TUI / TUMI) or reset to default.
   * Does NOT trigger on single casual usages like "tui kemon achis?" or "tumi kemon acho?".
   */
  public detectExplicitPronounCommand(userText: string): PronounDetectionResult {
    const raw = (userText || "").trim();
    if (!raw || raw.length < 3) {
      return { isCommand: false };
    }

    const clean = raw.toLowerCase().replace(/[।!?.,;:'"()\-–—]/g, " ").replace(/\s+/g, " ").trim();

    // 1. Explicit TUI Request Patterns (Bangla, Banglish, and English)
    const tuiPatterns = [
      // Bengali script
      /(?:এখন\s*থেকে|আজ\s*থেকে|আজকে\s*থেকে|পরের\s*থেকে|এরপর\s*থেকে)?\s*(?:আমার\s*সাথে|আমার\s*লগে|আমাকে|আমারে)?\s*(?:tui|তুই)\s*করে\s*(?:কথা\s*)?(?:বলবি|বলিস|বল|বলো|বলবেন)/i,
      /(?:আমাকে|আমারে)?\s*(?:এখন\s*থেকে|আজ\s*থেকে)?\s*(?:tui|তুই)\s*(?:করে\s*)?(?:বলিস|বলবি|বল|বলো)/i,
      /(?:tui|তুই)\s*করে\s*(?:কথা\s*)?(?:বলবি|বলিস|বল|বলো)/i,
      /(?:tui|তুই)\s*করে\s*(?:বলিস|বলবি|বল)/i,
      // Banglish / Romanized
      /(?:ekhon\s*theke|aj\s*theke|ajke\s*theke|porer\s*theke)?\s*(?:amar\s*sathe|amr\s*sathe|amar\s*shathe|amr\s*shathe|amake|amk|amare)?\s*tui\s*kore\s*(?:kotha\s*)?(?:bolbi|bolish|bolis|bol|bolo|bolben)/i,
      /\b(?:amake|amk|amare)\s*(?:ekhon\s*theke|aj\s*theke)?\s*tui\s*(?:kore\s*)?(?:bolish|bolbi|bol|bolo)\b/i,
      /\btui\s*kore\s*(?:kotha\s*)?(?:bolbi|bolish|bolis|bol|bolo)\b/i,
      /\btui\s*kore\s*(?:bolish|bolbi|bol)\b/i,
      // English expressions
      /\b(?:call\s*me\s*tui|use\s*tui\s*(?:with\s*me|mode)?|speak\s*(?:with|to)\s*me\s*(?:in|using)\s*tui|talk\s*(?:to|with)\s*me\s*(?:in|using)\s*tui|switch\s*(?:to|into)\s*tui(?:\s*mode)?)\b/i,
    ];

    for (const pattern of tuiPatterns) {
      if (pattern.test(clean) || pattern.test(raw)) {
        const isBangla = this.detectLanguageMode(raw) === "BANGLA";
        return {
          isCommand: true,
          preference: "tui",
          isReset: false,
          acknowledgment: isBangla
            ? "আচ্ছা, ঠিক আছে 😭 এখন থেকে তুই করেই বলব।"
            : "Accha, thik ache 😭 ekhon theke tui korei bolbo.",
          explanation: "Switched active pronoun mode to TUI.",
        };
      }
    }

    // 2. Explicit TUMI Request Patterns (Bangla, Banglish, and English)
    const tumiPatterns = [
      // Bengali script
      /(?:এখন\s*থেকে|আজ\s*থেকে|আজকে\s*থেকে|পরের\s*থেকে|এরপর\s*থেকে)?\s*(?:আমার\s*সাথে|আমার\s*লগে|আমাকে|আমারে)?\s*(?:tumi|তুমি)\s*করে\s*(?:কথা\s*)?(?:বলবে|বলবা|বলো|বলিস|বল|বলবেন)/i,
      /(?:আমাকে|আমারে)?\s*(?:এখন\s*থেকে|আজ\s*থেকে)?\s*(?:tumi|তুমি)\s*(?:করে\s*)?(?:বলবে|বলবা|বলো|বল)/i,
      /(?:tumi|তুমি)\s*করে\s*(?:কথা\s*)?(?:বলবে|বলবা|বলো|বল)/i,
      /(?:tumi|তুমি)\s*করে\s*(?:বলো|বলবে|বলবা|বল)/i,
      // Banglish / Romanized
      /(?:ekhon\s*theke|aj\s*theke|ajke\s*theke|porer\s*theke)?\s*(?:amar\s*sathe|amr\s*sathe|amar\s*shathe|amr\s*shathe|amake|amk|amare)?\s*tumi\s*kore\s*(?:kotha\s*)?(?:bolba|bolbe|bolo|bol|bolish|bolben)/i,
      /\b(?:amake|amk|amare)\s*(?:ekhon\s*theke|aj\s*theke)?\s*tumi\s*(?:kore\s*)?(?:bolba|bolbe|bolo|bol)\b/i,
      /\btumi\s*kore\s*(?:kotha\s*)?(?:bolba|bolbe|bolo|bol)\b/i,
      /\btumi\s*kore\s*(?:bolo|bolba|bolbe|bol)\b/i,
      // English expressions
      /\b(?:call\s*me\s*tumi|use\s*tumi\s*(?:with\s*me|mode)?|speak\s*(?:with|to)\s*me\s*(?:in|using)\s*tumi|talk\s*(?:to|with)\s*me\s*(?:in|using)\s*tumi|switch\s*(?:to|into)\s*tumi(?:\s*mode)?)\b/i,
    ];

    for (const pattern of tumiPatterns) {
      if (pattern.test(clean) || pattern.test(raw)) {
        const isBangla = this.detectLanguageMode(raw) === "BANGLA";
        return {
          isCommand: true,
          preference: "tumi",
          isReset: false,
          acknowledgment: isBangla
            ? "আচ্ছা, ঠিক আছে। এখন থেকে তুমি করেই বলব।"
            : "Accha, thik ache. Ekhon theke tumi korei bolbo.",
          explanation: "Switched active pronoun mode to TUMI.",
        };
      }
    }

    // 3. Reset to Default Patterns
    const resetPatterns = [
      /(?:আগের\s*মতো\s*কথা\s*বলো|আগের\s*মতো\s*বলো|নরমাল\s*করে\s*কথা\s*বলো|normal\s*করে\s*কথা\s*বলো|ডিফল্ট\s*রাখো|default\s*রাখো)/i,
      /\b(?:ager\s*moto\s*kotha\s*bolo|ager\s*moto\s*bolo|normal\s*kore\s*kotha\s*bolo|normal\s*kore\s*bolo|default\s*rakho|reset\s*pronoun|reset\s*to\s*default|default\s*mode)\b/i,
    ];

    for (const pattern of resetPatterns) {
      if (pattern.test(clean) || pattern.test(raw)) {
        const isBangla = this.detectLanguageMode(raw) === "BANGLA";
        return {
          isCommand: true,
          preference: "tumi",
          isReset: true,
          acknowledgment: isBangla
            ? "আচ্ছা, আগের মতো নরমাল করেই বলছি।"
            : "Accha, ager moto normal korei bolchi.",
          explanation: "Reset conversational pronoun mode to default (TUMI).",
        };
      }
    }

    return { isCommand: false };
  }

  /**
   * Generates authoritative pronoun-mode directives for LLM prompt context
   */
  public getPronounPromptDirectives(preference?: PronounPreference): string[] {
    const pref = preference || this.activePronounPreference || "tumi";
    const directives: string[] = [];

    if (pref === "tui") {
      directives.push(
        "[ACTIVE PRONOUN MODE: TUI (তুই / তোর / তোকে)]",
        "The user has explicitly chosen TUI mode. You MUST address the user using 'তুই' / 'তোর' / 'তোকে' (in Banglish: 'tui' / 'tor' / 'toke').",
        "Strict TUI Pronoun-Verb Agreement Rules:",
        "- Use 'তুই করছিস / বলছিস / যাচ্ছিস / করবি / বলবি / যাবি / কর / বল / পারিস / দেখ' (in Banglish: 'tui korchis / bolchis / jacchis / korbi / bolbi / jabi / kor / bol / paris / dekh').",
        "- NEVER mix with TUMI pronouns or verbs (e.g. NEVER say 'তুই ... বলো', 'তুই ... করছ', 'তুমি ... করিস', 'তোকে ... বলো', 'তোর ... করো').",
        "- Retain full Gen-Z companion warmth, humor, emojis (😭, 😂, 💀), and playful charm."
      );
    } else {
      directives.push(
        "[ACTIVE PRONOUN MODE: TUMI (তুমি / তোমার / তোমাকে)]",
        "Address the user using 'তুমি' / 'তোমার' / 'তোমাকে' (in Banglish: 'tumi' / 'tomar' / 'tomake').",
        "Strict TUMI Pronoun-Verb Agreement Rules:",
        "- Use 'তুমি করছ / করছো / বলছ / বলছো / যাচ্ছ / করবে / বলবে / যাবে / করো / বলো / পারো / দেখো' (in Banglish: 'tumi korcho / bolcho / jaccho / korbe / bolbe / jabe / koro / bolo / paro / dekho').",
        "- NEVER mix with TUI pronouns or verbs (e.g. NEVER say 'তুমি ... করিস', 'তুমি ... বলবি', 'তোমার ... করিস', 'তোমাকে ... বলিস').",
        "- Retain full Gen-Z companion warmth, humor, and emotional resonance."
      );
    }

    return directives;
  }

  /**
   * Harmonizes text to ensure strict pronoun and verb agreement according to active preference.
   */
  public harmonizePronounsAndVerbs(text: string, preference?: PronounPreference): string {
    if (!text) return "";
    const pref = preference || this.activePronounPreference || "tumi";
    let res = text;

    const replaceBangla = (input: string, word: string, rep: string) => {
      return input.replace(new RegExp(`(^|[^\\u0980-\\u09FFa-zA-Z0-9])${word}(?=[^\\u0980-\\u09FFa-zA-Z0-9]|$)`, "g"), `$1${rep}`);
    };

    if (pref === "tui") {
      // 1. Bengali Script: Replace TUMI pronouns with TUI pronouns
      res = replaceBangla(res, "তুমি", "তুই");
      res = replaceBangla(res, "তোমার", "তোর");
      res = replaceBangla(res, "তোমাকে", "তোকে");
      res = replaceBangla(res, "তোমাদের", "তোদের");

      // 2. Banglish (Latin): Replace TUMI pronouns with TUI pronouns
      res = res.replace(/\b(?:tumi|tmi)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? "Tui" : "tui"));
      res = res.replace(/\b(?:tomar|tmr)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? "Tor" : "tor"));
      res = res.replace(/\b(?:tomake|tmk)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? "Toke" : "toke"));
      res = res.replace(/\b(?:tomader|tmdr)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? "Toder" : "toder"));

      // 3. Clean up common mismatched imperative/second-person verbs when addressing TUI
      res = res.replace(/(তুই\s+[^\.\?!,;]+?)(?:\s|^)করো(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 কর");
      res = res.replace(/(তুই\s+[^\.\?!,;]+?)(?:\s|^)বলো(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 বল");
      res = res.replace(/(তুই\s+[^\.\?!,;]+?)(?:\s|^)আছো(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 আছিস");
      res = res.replace(/(তুই\s+[^\.\?!,;]+?)(?:\s|^)আছ(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 আছিস");
      res = res.replace(/(তুই\s+[^\.\?!,;]+?)(?:\s|^)করছ(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 করছিস");
      res = res.replace(/(তুই\s+[^\.\?!,;]+?)(?:\s|^)করছো(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 করছিস");
      res = res.replace(/(তুই\s+[^\.\?!,;]+?)(?:\s|^)বলছ(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 বলছিস");
      res = res.replace(/(তুই\s+[^\.\?!,;]+?)(?:\s|^)বলছো(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 বলছিস");
      res = res.replace(/(তুই\s+[^\.\?!,;]+?)(?:\s|^)করবে(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 করবি");
      res = res.replace(/(তুই\s+[^\.\?!,;]+?)(?:\s|^)বলবে(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 বলবি");
      res = res.replace(/(তুই\s+[^\.\?!,;]+?)(?:\s|^)যাবে(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 যাবি");
      res = res.replace(/(তুই\s+[^\.\?!,;]+?)(?:\s|^)পারো(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 পারিস");
      res = res.replace(/(তোকে\s+[^\.\?!,;]+?)(?:\s|^)বলো(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 বল");
      res = res.replace(/(তোর\s+[^\.\?!,;]+?)(?:\s|^)করো(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 কর");

      // Banglish verbs with tui
      res = res.replace(/\b(tui\s+[^\.\?!,;]+?)\bkoro\b/gi, "$1kor");
      res = res.replace(/\b(tui\s+[^\.\?!,;]+?)\bbolo\b/gi, "$1bol");
      res = res.replace(/\b(tui\s+[^\.\?!,;]+?)\bacho\b/gi, "$1achis");
      res = res.replace(/\b(tui\s+[^\.\?!,;]+?)\basa\b/gi, "$1asish");
      res = res.replace(/\b(tui\s+[^\.\?!,;]+?)\bkorcho\b/gi, "$1korchis");
      res = res.replace(/\b(tui\s+[^\.\?!,;]+?)\bkorso\b/gi, "$1korsos");
      res = res.replace(/\b(tui\s+[^\.\?!,;]+?)\bbolcho\b/gi, "$1bolchis");
      res = res.replace(/\b(tui\s+[^\.\?!,;]+?)\bbolso\b/gi, "$1bolsos");
      res = res.replace(/\b(tui\s+[^\.\?!,;]+?)\bkorba\b/gi, "$1korbi");
      res = res.replace(/\b(tui\s+[^\.\?!,;]+?)\bkorbe\b/gi, "$1korbi");
      res = res.replace(/\b(tui\s+[^\.\?!,;]+?)\bbolba\b/gi, "$1bolbi");
      res = res.replace(/\b(tui\s+[^\.\?!,;]+?)\bbolbe\b/gi, "$1bolbi");
      res = res.replace(/\b(tui\s+[^\.\?!,;]+?)\bjaba\b/gi, "$1jabi");
      res = res.replace(/\b(tui\s+[^\.\?!,;]+?)\bjabe\b/gi, "$1jabi");
      res = res.replace(/\b(tui\s+[^\.\?!,;]+?)\bparo\b/gi, "$1paris");
      res = res.replace(/\b(tui\s+[^\.\?!,;]+?)\bparba\b/gi, "$1parbi");
    } else {
      // TUMI mode:
      // 1. Bengali Script: Replace TUI pronouns with TUMI pronouns
      res = replaceBangla(res, "তুই", "তুমি");
      res = replaceBangla(res, "তোর", "তোমার");
      res = replaceBangla(res, "তোকে", "তোমাকে");
      res = replaceBangla(res, "তোদের", "তোমাদের");

      // 2. Banglish (Latin): Replace TUI pronouns with TUMI pronouns
      res = res.replace(/\btui\b/gi, (m) => (m[0] === m[0].toUpperCase() ? "Tumi" : "tumi"));
      res = res.replace(/\btor\b/gi, (m) => (m[0] === m[0].toUpperCase() ? "Tomar" : "tomar"));
      res = res.replace(/\btoke\b/gi, (m) => (m[0] === m[0].toUpperCase() ? "Tomake" : "tomake"));
      res = res.replace(/\btoder\b/gi, (m) => (m[0] === m[0].toUpperCase() ? "Tomader" : "tomader"));

      // 3. Clean up common mismatched verbs when addressing TUMI
      res = res.replace(/(তুমি\s+[^\.\?!,;]+?)(?:\s|^)করিস(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 করো");
      res = res.replace(/(তুমি\s+[^\.\?!,;]+?)(?:\s|^)বলিস(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 বলো");
      res = res.replace(/(তুমি\s+[^\.\?!,;]+?)(?:\s|^)আছিস(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 আছো");
      res = res.replace(/(তুমি\s+[^\.\?!,;]+?)(?:\s|^)করছিস(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 করছ");
      res = res.replace(/(তুমি\s+[^\.\?!,;]+?)(?:\s|^)বলছিস(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 বলছ");
      res = res.replace(/(তুমি\s+[^\.\?!,;]+?)(?:\s|^)করবি(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 করবে");
      res = res.replace(/(তুমি\s+[^\.\?!,;]+?)(?:\s|^)বলবি(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 বলবে");
      res = res.replace(/(তুমি\s+[^\.\?!,;]+?)(?:\s|^)যাবি(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 যাবে");
      res = res.replace(/(তুমি\s+[^\.\?!,;]+?)(?:\s|^)পারিস(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 পারো");
      res = res.replace(/(তোমাকে\s+[^\.\?!,;]+?)(?:\s|^)বলিস(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 বলো");
      res = res.replace(/(তোমার\s+[^\.\?!,;]+?)(?:\s|^)করিস(?=[^\u0980-\u09FFa-zA-Z0-9]|$)/g, "$1 করো");

      // Banglish verbs with tumi
      res = res.replace(/\b(tumi\s+[^\.\?!,;]+?)\bkorish\b/gi, "$1koro");
      res = res.replace(/\b(tumi\s+[^\.\?!,;]+?)\bkoris\b/gi, "$1koro");
      res = res.replace(/\b(tumi\s+[^\.\?!,;]+?)\bbolish\b/gi, "$1bolo");
      res = res.replace(/\b(tumi\s+[^\.\?!,;]+?)\bbolis\b/gi, "$1bolo");
      res = res.replace(/\b(tumi\s+[^\.\?!,;]+?)\bachis\b/gi, "$1acho");
      res = res.replace(/\b(tumi\s+[^\.\?!,;]+?)\bkorchis\b/gi, "$1korcho");
      res = res.replace(/\b(tumi\s+[^\.\?!,;]+?)\bkorsos\b/gi, "$1korcho");
      res = res.replace(/\b(tumi\s+[^\.\?!,;]+?)\bbolchis\b/gi, "$1bolcho");
      res = res.replace(/\b(tumi\s+[^\.\?!,;]+?)\bbolsos\b/gi, "$1bolcho");
      res = res.replace(/\b(tumi\s+[^\.\?!,;]+?)\bkorbi\b/gi, "$1korbe");
      res = res.replace(/\b(tumi\s+[^\.\?!,;]+?)\bbolbi\b/gi, "$1bolbe");
      res = res.replace(/\b(tumi\s+[^\.\?!,;]+?)\bjabi\b/gi, "$1jabe");
      res = res.replace(/\b(tumi\s+[^\.\?!,;]+?)\bparis\b/gi, "$1paro");
    }

    return res;
  }

  /**
   * Generates prompt directives enforcing natural Banglish phrasing and anti-assistant speak
   */
  public getStylePromptDirectives(
    mood: ConversationalMood,
    langMode: LanguageMode,
    userText: string,
    pronounPreference?: PronounPreference
  ): string[] {
    const dict = this.MOOD_BANGLISH_DICTIONARY[mood] || this.MOOD_BANGLISH_DICTIONARY.CHILL;
    const banglaDict = this.MOOD_BANGLA_DICTIONARY[mood] || this.MOOD_BANGLA_DICTIONARY.CHILL;
    const directives: string[] = [];

    directives.push(
      "YOUTHFUL REFERENCE VOCAL CHARACTER: Embody a light, bright, youthful Bangladeshi female voice (~19-21 years old). Deliver relaxed conversational flow with lively upward inflection on funny/curious moments and soft downward endings. Never sound mature, chesty, heavy, or robotic."
    );

    directives.push(
      "NATURAL HUMAN FLOW: Stop answering like a robot assistant. If something is surprising, funny, or emotional, REACT FIRST (e.g. 'মাত্র ৫ ঘণ্টা?! 😭', 'WHAT 😭😭 দাঁড়া, সত্যি বলছিস?!', 'বাহ, productivity-এর peak achievement 😭') before explaining. Allow short punchy reactions and do not over-explain."
    );

    directives.push(
      "NATURAL DISAGREEMENT & OPINIONS: Do not blindly agree with everything. Express lightweight opinions ('না না, এখানে তুই একটু ভুল ভাবতেছিস 😭', 'না, honestly আগের design-টাই আমার বেশি ভালো লাগছিল')."
    );

    directives.push(
      "STRICT ANTI-ASSISTANT RULE: NEVER use formal robotic phrases like 'Certainly', 'How may I assist you today', 'I understand your request', 'As an AI...', or 'Please provide more details'."
    );

    directives.push(
      `Current Conversational Mood: ${mood}. Mirror natural human emotion and pacing.`
    );

    // Pronoun consistency directives
    const pronounDirectives = this.getPronounPromptDirectives(pronounPreference);
    directives.push(...pronounDirectives);

    if (langMode === "BANGLISH") {
      directives.push(
        `Banglish Response Mode: Use natural Bangladeshi colloquial phrases. Sample openers: ${dict.openers.slice(0, 3).map((o) => `"${o}"`).join(", ")}.`
      );
      directives.push(
        "Natural Banglish Structure: Open with authentic fillers ('Arehh', 'Accha', 'Hmm', 'Bujhlam', 'Shono', 'Wait'), keep syntax conversational, and avoid literal textbook translations."
      );
    } else if (langMode === "BANGLA") {
      directives.push(
        `Bangla Response Mode: Speak fluent, natural colloquial Bangladeshi Bengali (বাংলা). Sample openers: ${banglaDict.openers.slice(0, 3).map((o) => `"${o}"`).join(", ")}.`
      );
      directives.push(
        "NO ENGLISH FILLER OVERUSE: Avoid stuffing random English fillers ('Basically', 'Actually', 'Honestly', 'I mean') into Bangla sentences. Use 'আসলে', 'মূল ব্যাপারটা হলো', 'সত্যি বলতে', 'আমার মনে হয়'."
      );
      directives.push(
        "AVOID FORMAL/SADHU BANGLA: Never use formal cliches ('আপনার প্রদত্ত তথ্যের ভিত্তিতে'). Use colloquial phrases ('হ্যাঁ, বুঝলাম', 'আরে, তাই নাকি?', 'একটু দাঁড়া, দেখি', 'সত্যি বলতে, আগেরটাই আমার বেশি ভালো লাগছিল')."
      );
    } else if (langMode === "MIXED") {
      directives.push(
        "Bilingual Code-Switching Mode: Seamlessly blend natural Banglish with English technical terms without filler word spam."
      );
    } else {
      directives.push(
        "Casual Gen-Z English Mode: Speak naturally like a real human friend with smooth rhythm."
      );
    }

    if (mood === "PLAYFUL" || mood === "TEASING") {
      directives.push("Mood dynamic: Warm banter, Gen-Z expressions (😭, 💀, 'wild', 'brooo', 'kidding'), playful teasing.");
    } else if (mood === "EMPATHETIC" || mood === "COMFORTING") {
      directives.push("Mood dynamic: Zero forced memes or slang. Soft, gentle empathy and compassionate space.");
    } else if (mood === "EXCITED") {
      directives.push("Mood dynamic: Genuine shared excitement and celebratory warmth ('WAIT—finallyyy 😭', 'Hugeee!').");
    } else if (mood === "FOCUSED") {
      directives.push("Mood dynamic: Direct, clear, helpful assistance with minimal fluff.");
    }

    return directives;
  }

  /**
   * Generates style guidance snippet for the prompt
   */
  public getStyleGuidance(options: StyleAdaptationOptions): string {
    const lang = this.detectLanguageMode(options.userText);
    const mood = options.mood || this.detectMood(options.userText, options.tone);
    const density = options.slangDensity || "subtle";
    const pronounPref = options.pronounPreference || this.activePronounPreference;

    const directives = this.getStylePromptDirectives(mood, lang, options.userText, pronounPref);

    const parts: string[] = [];
    parts.push(`- Detected Input Language: ${lang}`);
    parts.push(`- Conversational Mood: ${mood}`);
    parts.push(`- Active Pronoun Style: ${pronounPref.toUpperCase()}`);
    parts.push(`- Gen-Z Expression Density: ${density}`);
    parts.push(...directives.map((d) => `- ${d}`));

    return parts.join("\n");
  }

  /**
   * Returns sample phrases and structure recommendations for a mood
   */
  public getMoodPhrases(mood: ConversationalMood) {
    return this.MOOD_BANGLISH_DICTIONARY[mood] || this.MOOD_BANGLISH_DICTIONARY.CHILL;
  }
}

export const languageStyleAdapter = LanguageStyleAdapter.getInstance();
