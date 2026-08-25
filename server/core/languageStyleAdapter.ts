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

export interface StyleAdaptationOptions {
  userText: string;
  mood?: ConversationalMood;
  tone?: "playful" | "grounded" | "empathetic" | "curious" | "excited" | "quiet" | "warm" | "calm";
  slangDensity?: "none" | "subtle" | "moderate" | "expressive";
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

  private constructor() {}

  public static getInstance(): LanguageStyleAdapter {
    if (!LanguageStyleAdapter.instance) {
      LanguageStyleAdapter.instance = new LanguageStyleAdapter();
    }
    return LanguageStyleAdapter.instance;
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
    langMode?: LanguageMode
  ): string {
    let text = this.sanitizeAssistantSpeak(rawText, mood);

    if (!text) return "";

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
   * Generates prompt directives enforcing natural Banglish phrasing and anti-assistant speak
   */
  public getStylePromptDirectives(
    mood: ConversationalMood,
    langMode: LanguageMode,
    userText: string
  ): string[] {
    const dict = this.MOOD_BANGLISH_DICTIONARY[mood] || this.MOOD_BANGLISH_DICTIONARY.CHILL;
    const banglaDict = this.MOOD_BANGLA_DICTIONARY[mood] || this.MOOD_BANGLA_DICTIONARY.CHILL;
    const directives: string[] = [];

    directives.push(
      "STRICT ANTI-ASSISTANT RULE: NEVER use formal robotic phrases like 'Certainly', 'How may I assist you today', 'I understand your request', 'As an AI...', or 'Please provide more details'."
    );

    directives.push(
      `Current Conversational Mood: ${mood}. Mirror natural human emotion and pacing.`
    );

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

    const directives = this.getStylePromptDirectives(mood, lang, options.userText);

    const parts: string[] = [];
    parts.push(`- Detected Input Language: ${lang}`);
    parts.push(`- Conversational Mood: ${mood}`);
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
