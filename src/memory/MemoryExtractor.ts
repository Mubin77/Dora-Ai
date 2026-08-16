import { MemoryItem, MemoryCategory, MemorySource } from "./types";
import { MemoryStore } from "./MemoryStore";

export interface ExplicitMemoryCandidate {
  category: MemoryCategory;
  key: string;
  value: string;
  importance: number;
  confidence: number;
  tags: string[];
  naturalConfirmation: string;
}

export class MemoryExtractor {
  private store: MemoryStore;

  constructor(store: MemoryStore) {
    this.store = store;
  }

  /**
   * Evaluates if a user message is an explicit memory command/request and extracts
   * the exact semantic candidate (category, clean key, value, importance, and natural confirmation).
   */
  public extractExplicitRemember(userText: string): ExplicitMemoryCandidate | null {
    const raw = userText.trim();
    if (!raw || raw.length < 3) return null;

    let clean = raw.toLowerCase();

    // 1. Strip conversational address (e.g. "Dora, ", "Hey Dora: ", "Listen Dora, ")
    clean = clean.replace(/^(?:hey|yo|hi|hello|listen|ok|okay|shono|ei|accha|আচ্ছা|এই|শোনো)?\s*(?:dora|দোরা)[,\s:!-]+/i, "").trim();

    // 2. Explicit Trigger Patterns (Bengali, Banglish & English)
    const triggerRegexes = [
      // Bengali script triggers
      /^(?:দোরা[,\s]+)?(?:এই\s+কথা\s+|এটা\s+)?মনে\s+(?:রাখিস|রাখবা|রাখিও|রেখো|রাখবেন|রাখিস রে|রাখবা রে|রাখো|রাখ)(?:[,\s]+যে)?(?:[:\s—–-]+|\s+)(.+)$/i,
      /^(?:দোরা[,\s]+)?(?:এটা\s+)?মনে\s+রেখো(?:\s+যে)?(?:[:\s—–-]+|\s+)(.+)$/i,
      /^(?:দোরা[,\s]+)?(?:এটা\s+)?মনে\s+রাখিস(?:\s+যে)?(?:[:\s—–-]+|\s+)(.+)$/i,
      /^(?:দোরা[,\s]+)?(?:এটা\s+)?মনে\s+রাখবা(?:\s+যে)?(?:[:\s—–-]+|\s+)(.+)$/i,
      /^(?:দোরা[,\s]+)?(?:এটা\s+)?মনে\s+রাখবেন(?:\s+যে)?(?:[:\s—–-]+|\s+)(.+)$/i,
      /^(?:দোরা[,\s]+)?(?:এটা\s+)?মনে\s+রাখো(?:[:\s—–-]+|\s+)(.+)$/i,
      /^(?:দোরা[,\s]+)?(?:এটা\s+)?মনে\s+রাখ(?:[:\s—–-]+|\s+)(.+)$/i,
      /^(?:দোরা[,\s]+)?(?:এটা\s+)?remember\s+(?:করো|রাখো|করিস|করবেন|রাখিস)(?:\s+যে)?(?:[:\s—–-]+|\s+)(.+)$/i,
      /^(?:দোরা[,\s]+)?(?:এটা\s+)?খাতায়\s+লিখে\s+রাখো(?:[:\s—–-]+|\s+)(.+)$/i,
      /^(?:দোরা[,\s]+)?আজ\s+থেকে\s+(?:আমাকে\s+)?(.+)\s+বলে\s+ডাকবে$/i,
      /^(?:দোরা[,\s]+)?আজ\s+থেকে\s+(.+)$/i,

      // Banglish / Romanized Bengali triggers
      /^(?:ei\s+kotha\s+|eta\s+)?mone\s+(?:rakhish|rakhba|rakhio|rekho|rakhben|rakho|rakh)(?:[,\s]+je)?(?:[:\s—–-]+|\s+)(.+)$/i,
      /^(?:dora[,\s]+)?(?:eta\s+)?mone\s+(?:rakhish|rakhba|rakhio|rekho|rakhben|rakho|rakh)(?:[,\s]+je)?(?:[:\s—–-]+|\s+)(.+)$/i,
      /^(?:dora[,\s]+)?(?:eta\s+)?remember\s+(?:koro|korish|korba|rakho|rakhba)(?:[:\s—–-]+|\s+)(.+)$/i,
      /^(?:dora[,\s]+)?ajke\s+theke\s+(?:amake\s+)?(.+)\s+dakis$/i,
      /^(?:dora[,\s]+)?aj\s+theke\s+(.+)$/i,

      // Standard English triggers
      /^(?:please\s+|plz\s+|kindly\s+)?remember\s+that\s+(.+)$/i,
      /^(?:please\s+|plz\s+|kindly\s+)?remember\s+this[:\s]+(.+)$/i,
      /^(?:please\s+|plz\s+|kindly\s+)?remember\s+(.+)$/i,
      /^(?:i\s+want\s+you\s+to\s+)?remember\s+that\s+(.+)$/i,
      /^(?:i\s+want\s+you\s+to\s+)?remember\s+(.+)$/i,
      /^(?:please\s+|plz\s+)?keep\s+(?:this\s+)?in\s+mind(?:\s+that)?[:\s]+(.+)$/i,
      /^(?:please\s+|plz\s+)?keep\s+in\s+mind\s+(.+)$/i,
      /^(?:please\s+|plz\s+)?don['’]?t\s+forget\s+(?:that\s+)?(.+)$/i,
      /^(?:please\s+|plz\s+)?never\s+forget\s+(?:that\s+)?(.+)$/i,
      /^(?:can\s+you\s+|could\s+you\s+)?(?:please\s+)?save\s+this(?:\s+to\s+your\s+memory|\s+in\s+your\s+memory)?[:\s]+(.+)$/i,
      /^(?:can\s+you\s+|could\s+you\s+)?(?:please\s+)?save\s+(?:this|that)[:\s]+(.+)$/i,
      /^(?:can\s+you\s+|could\s+you\s+)?(?:please\s+)?put\s+this\s+in\s+your\s+memory[:\s]+(.+)$/i,
      /^(?:can\s+you\s+|could\s+you\s+)?remember\s+(?:this|that)[:\s]+(.+)$/i,
      /^(?:make\s+sure\s+(?:you|to)\s+remember(?:\s+that)?)\s+(.+)$/i,
      /^from\s+now\s+on[,\s]+remember(?:\s+that)?\s+(.+)$/i,
      /^from\s+now\s+on[,\s]+keep\s+in\s+mind(?:\s+that)?\s+(.+)$/i,
      /^from\s+now\s+on[,\s]+(?:always\s+)?call\s+me\s+(.+)$/i,
      /^from\s+now\s+on[,\s]+(.+)$/i,
      /^(?:take\s+note\s+that|note\s+that|make\s+a\s+note\s+that)\s+(.+)$/i,
    ];

    let payload: string | null = null;
    let matchedPattern = false;

    for (const regex of triggerRegexes) {
      const match = clean.match(regex);
      if (match && match[1]) {
        payload = match[1].trim();
        matchedPattern = true;
        break;
      }
    }

    // Direct "From now on, call me X" check
    if (!payload && clean.match(/^(?:always\s+)?call\s+me\s+([A-Za-z0-9\s'-]{1,30})$/i)) {
      const match = clean.match(/^(?:always\s+)?call\s+me\s+([A-Za-z0-9\s'-]{1,30})$/i);
      if (match) {
        payload = `call me ${match[1]}`;
        matchedPattern = true;
      }
    }

    if (!matchedPattern || !payload || payload.length < 2) {
      return null;
    }

    // Clean up trailing punctuation
    payload = payload.replace(/[.!?]+$/, "").trim();

    return this.classifyExplicitFact(payload, raw);
  }

  /**
   * Helper to detect language style of user prompt (bengali script, banglish, english, or mixed).
   */
  private detectLanguageStyle(text: string): "bengali" | "banglish" | "english" {
    // 1. Bengali Unicode block check [\u0980-\u09FF]
    if (/[\u0980-\u09FF]/.test(text)) {
      return "bengali";
    }

    // 2. Banglish marker words
    const banglishWords = [
      "amar", "amr", "tumi", "tmi", "apni", "apnr", "kemon", "acho", "achis", "achhen",
      "mone", "rakhba", "rakhish", "rekho", "rakhben", "rakho", "kotha", "eta", "koro", "korish",
      "korba", "bhalo", "valo", "pochondo", "khabar", "shono", "accha", "acha", "ha", "haa", "humm",
      "bolbo", "bolte", "thakbe", "rakhlam", "dakis", "bolo", "hobe", "hoise", "korchi", "korlam"
    ];

    const words = text.toLowerCase().split(/[\s,.:;!?_-]+/);
    const hasBanglishWord = words.some((w) => banglishWords.includes(w));
    if (hasBanglishWord) {
      return "banglish";
    }

    return "english";
  }

  /**
   * Generates a warm, natural, language-matched acknowledgement when remembering something.
   */
  private getLanguageMatchedConfirmation(
    originalText: string,
    keyType: string,
    value: string
  ): string {
    const lang = this.detectLanguageStyle(originalText);

    if (lang === "bengali") {
      // Natural Bengali responses
      const bengaliConfirmations = [
        "হুম, মনে রাখবো।",
        "আচ্ছা, মনে রাখলাম।",
        "হুমম, এটা মনে থাকবে।",
        "হুম, মনে থাকবে 😌",
      ];
      // Randomly pick a natural response or deterministic pick
      const idx = Math.abs(originalText.length) % bengaliConfirmations.length;
      return bengaliConfirmations[idx];
    }

    if (lang === "banglish") {
      // Natural Banglish responses
      const banglishConfirmations = [
        "Hmm, mone rakhbo 😌",
        "Yeah, mone thakbe.",
        "Accha, mone rakhlam.",
        "Hmm, mone thakbe 🖤",
      ];
      const idx = Math.abs(originalText.length) % banglishConfirmations.length;
      return banglishConfirmations[idx];
    }

    // Natural English responses
    const englishConfirmations = [
      "Yeah, I'll remember that.",
      "Mmhm, got it. I'll remember.",
      "Yeah, I got you.",
      "Got it! I'll remember that 🖤",
    ];
    const idx = Math.abs(originalText.length) % englishConfirmations.length;
    return englishConfirmations[idx];
  }

  /**
   * Classifies a stripped explicit fact string into structured category, clean key, value, and in-character confirmation.
   */
  private classifyExplicitFact(fact: string, originalUserText: string = fact): ExplicitMemoryCandidate {
    const lower = fact.toLowerCase().trim();
    const defaultConfirmation = this.getLanguageMatchedConfirmation(originalUserText, "fact", fact);

    // 1. Preferred Name (e.g. "call me Mubin", "my name is Mubin", "amar naam Mubin", "I go by Mubin")
    const nameMatch =
      fact.match(/(?:call me|my name is|amar naam|amar name|i go by|my preferred name is|আমাকে|আমারে|আমার নাম)\s+([A-Za-z0-9\u0980-\u09FF\s'-]{1,30})/i) ||
      fact.match(/(?:বলো|ডাকবে|ডেকো)\s+([A-Za-z0-9\u0980-\u09FF\s'-]{1,30})/i);

    if (nameMatch) {
      const name = nameMatch[1].trim();
      const cleanName = name.charAt(0).toUpperCase() + name.slice(1);
      const lang = this.detectLanguageStyle(originalUserText);
      let conf = `Got it! I'll call you ${cleanName} from now on. 🖤`;
      if (lang === "bengali") {
        conf = `আচ্ছা, আজ থেকে তোমাকে ${cleanName} বলেই ডাকবো। 😌`;
      } else if (lang === "banglish") {
        conf = `Accha, aj theke tomake ${cleanName} bolei dakbo! 😌`;
      }

      return {
        category: "identity",
        key: "preferred_name",
        value: cleanName,
        importance: 95,
        confidence: 1.0,
        tags: ["name", "identity", "profile"],
        naturalConfirmation: conf,
      };
    }

    // 2. Favorite <Type> (e.g. "my favorite color is black", "amar favorite color black", "আমার প্রিয় রং কালো", "favorite food biryani")
    const favMatch =
      fact.match(/(?:আমার\s+)?(?:ফেভারিট|প্রিয়|পছন্দের)\s+([a-zA-Z\u0980-\u09FF_-]+(?:\s+[a-zA-Z\u0980-\u09FF_-]+)?)\s+(?:হলো|হচ্ছে|হল|is)?\s*[:=]?\s*([^.!?\n]+)/i) ||
      fact.match(/(?:amar\s+|my\s+)?(?:favorite|favourite|pochonder)\s+([a-zA-Z_-]+(?:\s+[a-zA-Z_-]+)?)\s+(?:is|are|holo|hocche)\s+([^.!?\n]+)/i) ||
      fact.match(/(?:amar\s+|my\s+)?(?:favorite|favourite|pochonder)\s+([a-zA-Z_-]+(?:\s+[a-zA-Z_-]+)?)\s*[:=]\s*([^.!?\n]+)/i) ||
      fact.match(/(?:amar\s+|my\s+)?(?:favorite|favourite|pochonder)\s+([a-zA-Z_-]+)\s+([^.!?\n]+)/i);

    if (favMatch) {
      let typeRaw = favMatch[1].trim().toLowerCase().replace(/\s+/g, "_");
      if (typeRaw === "রং" || typeRaw === "কালার" || typeRaw === "colour") typeRaw = "color";
      if (typeRaw === "খাবার" || typeRaw === "ফুড") typeRaw = "food";
      if (typeRaw === "গান") typeRaw = "song";
      if (typeRaw === "খেলা") typeRaw = "game";

      const valueRaw = favMatch[2].trim();
      const cleanType = favMatch[1].trim();

      return {
        category: "preferences",
        key: `favorite_${typeRaw}`,
        value: valueRaw,
        importance: 85,
        confidence: 1.0,
        tags: [typeRaw, "favorite", "preference", `favorite ${cleanType}`, `favorite_${typeRaw}`],
        naturalConfirmation: defaultConfirmation,
      };
    }

    // 3. Birthday (e.g. "my birthday is August 18", "born on August 18")
    const bdayMatch = fact.match(/(?:my birthday is on|my birthday is|born on|amar birthday|amar jonmodin)\s+([^.!?\n]+)/i);
    if (bdayMatch) {
      const bday = bdayMatch[1].trim();
      return {
        category: "identity",
        key: "birthday",
        value: bday,
        importance: 90,
        confidence: 1.0,
        tags: ["birthday", "date", "identity"],
        naturalConfirmation: defaultConfirmation,
      };
    }

    // 4. Location / Origin (e.g. "I live in London", "I'm from Dhaka", "ami thaki dhaka")
    const locMatch = fact.match(/(?:i live in|i am from|i'm from|i stay in|my location is|i'm based in|ami thaki|ami thakbo)\s+([^.!?\n]+)/i);
    if (locMatch) {
      const loc = locMatch[1].trim();
      const capLoc = loc.charAt(0).toUpperCase() + loc.slice(1);
      return {
        category: "identity",
        key: "location",
        value: capLoc,
        importance: 85,
        confidence: 1.0,
        tags: ["location", "place", "identity"],
        naturalConfirmation: defaultConfirmation,
      };
    }

    // 5. Projects & Work (e.g. "I'm building an AI assistant called Dora", "I'm working on a mobile game")
    const projMatch = fact.match(/(?:i am building|i'm building|i am working on|i'm working on|my project is|my current project is|developing|ami banacchi)\s+([^.!?\n]+)/i);
    if (projMatch) {
      const proj = projMatch[1].trim();
      const isDora = proj.toLowerCase().includes("dora") || proj.includes("দোরা");
      const value = isDora ? `Building an AI assistant called Dora` : `Working on ${proj}`;
      return {
        category: "projects",
        key: isDora ? "project_dora" : "current_project",
        value: value,
        importance: 90,
        confidence: 1.0,
        tags: ["project", "work", "tech"],
        naturalConfirmation: defaultConfirmation,
      };
    }

    // 6. Communication Style / Persona Preferences
    if (
      lower.includes("prefer short") ||
      lower.includes("concise answers") ||
      lower.includes("brief answers") ||
      lower.includes("keep it brief") ||
      lower.includes("short answers")
    ) {
      return {
        category: "personality",
        key: "communication_style",
        value: "Prefers short and concise spoken answers",
        importance: 85,
        confidence: 1.0,
        tags: ["communication", "style", "preferences"],
        naturalConfirmation: defaultConfirmation,
      };
    }

    if (lower.includes("banglish") || lower.includes("bengali in english")) {
      return {
        category: "personality",
        key: "language_preference",
        value: "Prefers Banglish (Bengali with English letters)",
        importance: 85,
        confidence: 1.0,
        tags: ["language", "banglish", "preference"],
        naturalConfirmation: "Haa, mone rakhbo! Banglish e kotha bolbo. 🖤",
      };
    }

    // 7. Allergies & Dietary Restrictions
    const allergyMatch = fact.match(/(?:i'm allergic to|i am allergic to|allergic to|amar allergy)\s+([^.!?\n]+)/i);
    if (allergyMatch) {
      const allergen = allergyMatch[1].trim();
      return {
        category: "habits",
        key: `allergy_${allergen.slice(0, 15).toLowerCase().replace(/\s+/g, "_")}`,
        value: `Allergic to ${allergen}`,
        importance: 90,
        confidence: 1.0,
        tags: ["health", "allergy", "diet"],
        naturalConfirmation: defaultConfirmation,
      };
    }

    // 8. Relationships & Pets (e.g. "my dog's name is Luna", "my best friend is Ryan")
    const petMatch = fact.match(/(?:my\s+)?(dog|cat|pet|puppy|kitten|biral|kukur)(?:'s)?(?:\s+name)?\s+(?:is|called|naam)\s+([^.!?\n]+)/i);
    if (petMatch) {
      const petType = petMatch[1].toLowerCase();
      const petName = petMatch[2].trim();
      return {
        category: "relationships",
        key: `pet_${petType}`,
        value: `${petType.charAt(0).toUpperCase() + petType.slice(1)} named ${petName}`,
        importance: 80,
        confidence: 1.0,
        tags: ["pet", petType, "relationships"],
        naturalConfirmation: defaultConfirmation,
      };
    }

    const relMatch = fact.match(/(?:my\s+)?(friend|best friend|sister|brother|mom|dad|wife|husband|partner|boss|manager|bondhu)(?:'s)?(?:\s+name)?\s+(?:is|called|naam)\s+([^.!?\n]+)/i);
    if (relMatch) {
      const relation = relMatch[1].toLowerCase().replace(/\s+/g, "_");
      const personName = relMatch[2].trim();
      return {
        category: "relationships",
        key: `relation_${relation}`,
        value: `${relMatch[1]} named ${personName}`,
        importance: 80,
        confidence: 1.0,
        tags: ["relationship", relation, "people"],
        naturalConfirmation: defaultConfirmation,
      };
    }

    // 9. Profession / Career (e.g. "I work as a software engineer", "I'm a UI designer")
    const jobMatch = fact.match(/(?:i work as a|i work as an|i'm a|i am a|i study|ami kaj kori)\s+([A-Za-z\u0980-\u09FF\s]{3,35})/i);
    if (jobMatch && !lower.includes("hungry") && !lower.includes("tired")) {
      const job = jobMatch[1].trim();
      return {
        category: "identity",
        key: "profession",
        value: job.charAt(0).toUpperCase() + job.slice(1),
        importance: 85,
        confidence: 1.0,
        tags: ["career", "profession", "identity"],
        naturalConfirmation: defaultConfirmation,
      };
    }

    // 10. Goals / Dreams (e.g. "my goal is to travel to Japan", "I want to become a game developer")
    const goalMatch = fact.match(/(?:my goal is to|i want to become|my dream is to|i aim to|amar icche|amar goal)\s+([^.!?\n]+)/i);
    if (goalMatch) {
      const goal = goalMatch[1].trim();
      return {
        category: "goals",
        key: "primary_goal",
        value: goal.charAt(0).toUpperCase() + goal.slice(1),
        importance: 85,
        confidence: 1.0,
        tags: ["goal", "dream", "future"],
        naturalConfirmation: defaultConfirmation,
      };
    }

    // 11. General / Arbitrary Fact (e.g. "the gate passcode is 4092", "my car is a red Civic", "আমি রাতে বেশি ভালো কাজ করতে পারি")
    const normalizedKey = fact
      .slice(0, 30)
      .toLowerCase()
      .replace(/[^\w\s\u0980-\u09FF]/g, "")
      .trim()
      .replace(/\s+/g, "_") || "user_fact";

    const cleanValue = fact.charAt(0).toUpperCase() + fact.slice(1);

    return {
      category: "context",
      key: normalizedKey,
      value: cleanValue,
      importance: 80,
      confidence: 1.0,
      tags: ["memory", "fact"],
      naturalConfirmation: defaultConfirmation,
    };
  }

  /**
   * Fast, synchronous heuristic extraction for common conversational patterns.
   * Recognizes natural implicit disclosures across Bengali, Banglish, and English
   * without needing explicit command words like "remember".
   * This executes instantaneously with zero network overhead.
   */
  public extractHeuristicMemories(
    userText: string
  ): Array<{
    category: MemoryCategory;
    key: string;
    value: string;
    importance: number;
    confidence: number;
    source: MemorySource;
    tags?: string[];
  }> {
    const results: Array<{
      category: MemoryCategory;
      key: string;
      value: string;
      importance: number;
      confidence: number;
      source: MemorySource;
      tags?: string[];
    }> = [];

    const text = userText.trim();
    const lower = text.toLowerCase();

    // Guard against ephemeral/temporary noise (e.g. "I am eating pizza now", "Ami ekhon cha khacchi", "Ami ekhon pani khacchi", "Ami ajke tired", "Ami ekhon YouTube dekhchi", "I am going outside right now")
    const isTemporaryNoise = (
      /\b(tired|sleepy|hungry|thirsty|eating|drinking|going out|right now|at the moment|currently eating|ekhon pani|ekhon cha|cha khacchi|ajke tired|ekhon youtube|ajke pizza|pizza khacchi|ekhon ghumabo|ekhon baire|ekhon jacchi)\b/i.test(lower) &&
      !/(usually|always|favorite|favourite|pochondo|habits?|routine|project|goal|aim|name|naam|amar favorite|amar priyo|productive)/i.test(lower)
    );
    if (isTemporaryNoise) {
      return results;
    }

    // 1. Identity: Name / Preferred Name (English, Bengali, Banglish)
    const nameMatch =
      text.match(/(?:my name is|i am called|call me|i go by|amar naam|amar name|amake|amare|আমার নাম|আমাকে)\s+([A-Za-z\u0980-\u09FF\s'-]{2,25})/i) ||
      text.match(/(?:ডাকবে|ডেকো|dakis|dakba)\s+([A-Za-z\u0980-\u09FF\s'-]{2,25})/i);

    if (nameMatch && !lower.includes("hungry") && !lower.includes("tired") && !lower.includes("sorry") && !lower.includes("ready") && !lower.includes("working") && !lower.includes("doing")) {
      const name = nameMatch[1].trim();
      const forbidden = ["a", "an", "the", "fine", "good", "okay", "here", "doing", "kaj", "kaj kortesi", "ekhon", "busy"];
      if (name.length > 1 && !forbidden.includes(name.toLowerCase())) {
        const cleanName = name.charAt(0).toUpperCase() + name.slice(1);
        results.push({
          category: "identity",
          key: "preferred_name",
          value: cleanName,
          importance: 95,
          confidence: 0.95,
          source: "inferred",
          tags: ["name", "identity", "profile"],
        });
      }
    }

    // 2. Identity: Location / Origin
    const locationMatch = text.match(/(?:i live in|i am from|i'm from|i'm located in|i stay in|ami thaki|ami bas kori|আমি থাকি|আমার বাসা)\s+([A-Za-z\u0980-\u09FF\s,]{2,30})/i);
    if (locationMatch) {
      const loc = locationMatch[1].trim().replace(/[.!?]$/, "");
      results.push({
        category: "identity",
        key: "location",
        value: loc.charAt(0).toUpperCase() + loc.slice(1),
        importance: 85,
        confidence: 0.90,
        source: "inferred",
        tags: ["location", "place", "identity"],
      });
    }

    // 3. Identity: Birthday / Age
    const bdayMatch = text.match(/(?:my birthday is on|my birthday is|born on|amar birthday|amar jonmodin|আমার জন্মদিন)\s+([A-Za-z0-9\u0980-\u09FF\s,]{3,30})/i);
    if (bdayMatch) {
      results.push({
        category: "identity",
        key: "birthday",
        value: bdayMatch[1].trim().replace(/[.!?]$/, ""),
        importance: 90,
        confidence: 0.95,
        source: "inferred",
        tags: ["birthday", "date", "identity"],
      });
    }

    // 4. Preferences: Favorite items (color, game, food, movie, music, song, creator, etc.)
    // Natural statement: "Amar favorite color black", "My favorite movie is Interstellar", "আমার প্রিয় খাবার বিরিয়ানি"
    const favMatch =
      text.match(/(?:আমার\s+)?(?:ফেভারিট|প্রিয়|পছন্দের)\s+([a-zA-Z\u0980-\u09FF_-]+(?:\s+[a-zA-Z\u0980-\u09FF_-]+)?)\s+(?:হলো|হচ্ছে|হল|is)?\s*[:=]?\s*([^.!?\n]{2,50})/i) ||
      text.match(/(?:amar\s+|my\s+)?(?:favorite|favourite|pochonder)\s+([a-zA-Z_-]+(?:\s+[a-zA-Z_-]+)?)\s+(?:is|are|holo|hocche)\s+([^.!?\n]{2,50})/i) ||
      text.match(/(?:amar\s+|my\s+)?(?:favorite|favourite|pochonder)\s+([a-zA-Z_-]+(?:\s+[a-zA-Z_-]+)?)\s*[:=]\s*([^.!?\n]{2,50})/i) ||
      text.match(/(?:amar\s+|my\s+)?(?:favorite|favourite|pochonder)\s+([a-zA-Z_-]+)\s+([^.!?\n]{2,50})/i);

    if (favMatch) {
      let rawType = favMatch[1].trim().toLowerCase().replace(/\s+/g, "_");
      if (rawType === "রং" || rawType === "কালার" || rawType === "colour") rawType = "color";
      if (rawType === "খাবার" || rawType === "ফুড") rawType = "food";
      if (rawType === "গান") rawType = "song";
      if (rawType === "খেলা") rawType = "game";
      if (rawType === "সিনেমা" || rawType === "মুভি") rawType = "movie";

      const val = favMatch[2].trim().replace(/[.!?]$/, "");
      // Make sure value isn't empty or temporary word
      if (val && !["kori", "kortesi", "korbo", "hobe"].includes(val.toLowerCase())) {
        results.push({
          category: "preferences",
          key: `favorite_${rawType}`,
          value: val.charAt(0).toUpperCase() + val.slice(1),
          importance: 85,
          confidence: 0.95,
          source: "inferred",
          tags: [rawType, "favorite", "preference"],
        });
      }
    }

    // 4b. Stable Preferences (Likes / Dislikes / Recurring preference)
    // e.g. "Ami usually black shirt porte pochondo kori", "I love playing FC Mobile", "Ami coffee onek pochondo kori"
    const generalPrefMatch =
      text.match(/(?:ami\s+|i\s+)?(?:usually|always|really\s+love|love|hate|really\s+like|onekpurchondo\s+kori|pochondo\s+kori|ভালোবাসি|পছন্দ করি)\s+(?:to\s+)?([^.!?\n]{4,50})/i);
    if (generalPrefMatch && !favMatch && !isTemporaryNoise) {
      const prefContent = generalPrefMatch[1].trim().replace(/[.!?]$/, "");
      if (!prefContent.toLowerCase().includes("pani") && !prefContent.toLowerCase().includes("today")) {
        const prefKey = "pref_" + prefContent.slice(0, 20).toLowerCase().replace(/[^\w\u0980-\u09FF]/g, "_").replace(/_+/g, "_");
        results.push({
          category: "preferences",
          key: prefKey,
          value: prefContent.charAt(0).toUpperCase() + prefContent.slice(1),
          importance: 75,
          confidence: 0.85,
          source: "inferred",
          tags: ["preference", "lifestyle"],
        });
      }
    }

    // 4c. Recurring Habits / Productivity patterns
    // e.g. "Ami usually raat-e beshi productive", "I am more productive at night", "Usually raat e kaj kori"
    const habitMatch =
      text.match(/(?:ami\s+|i\s+)?(?:usually|always|beshirvag\s+shomoy)?\s*([a-zA-Z\u0980-\u09FF\s-]+?(?:productive|beshi\s+productive|focus|kaj\s+kori|sleep\s+late|wake\s+up\s+early)[^.!?\n]{0,40})/i) ||
      text.match(/(?:ami\s+|i\s+)(?:usually|always)\s+([^.!?\n]{5,50})/i);

    if (habitMatch && !favMatch && !generalPrefMatch && !isTemporaryNoise) {
      const habitContent = habitMatch[1].trim().replace(/[.!?]$/, "");
      if (
        habitContent.toLowerCase().includes("productive") ||
        habitContent.toLowerCase().includes("raat") ||
        habitContent.toLowerCase().includes("night") ||
        habitContent.toLowerCase().includes("morning") ||
        habitContent.toLowerCase().includes("routine") ||
        habitContent.toLowerCase().includes("habit")
      ) {
        results.push({
          category: "habits",
          key: "productive_routine",
          value: habitContent.charAt(0).toUpperCase() + habitContent.slice(1),
          importance: 80,
          confidence: 0.90,
          source: "inferred",
          tags: ["habit", "routine", "productivity"],
        });
      }
    }

    // 4d. Preference Updates / Preference Shift (e.g. "Actually, ekhon ami Minecraft ar kheli na. FC Mobile beshi kheli.")
    const prefShiftMatch =
      text.match(/(?:(?:[a-zA-Z\s,]+)?(?:beshi\s+kheli|kheli\s+beshi|play\s+more|play\s+mostly))\s+([A-Za-z0-9\s]{2,30})/i) ||
      text.match(/(?:(?:[a-zA-Z\s,]+)?(?:beshi\s+pochondo\s+kori|pochondo\s+beshi|prefer\s+more|prefer))\s+([A-Za-z0-9\s]{2,30})/i) ||
      text.match(/([A-Za-z0-9\s]{2,25})\s+beshi\s+kheli/i) ||
      text.match(/([A-Za-z0-9\s]{2,25})\s+beshi\s+pochondo\s+kori/i);

    if (prefShiftMatch) {
      const matchedVal = (prefShiftMatch[1] || prefShiftMatch[2] || "").trim().replace(/[.!?]$/, "");
      if (matchedVal && !matchedVal.toLowerCase().includes("kheli")) {
        const isGame = lower.includes("kheli") || lower.includes("game") || lower.includes("play");
        results.push({
          category: "preferences",
          key: isGame ? "favorite_game" : "favorite_item",
          value: matchedVal.charAt(0).toUpperCase() + matchedVal.slice(1),
          importance: 85,
          confidence: 0.90,
          source: "inferred",
          tags: [isGame ? "game" : "item", "preference", "updated"],
        });
      }
    }

    // 5. Projects & Ongoing Work (e.g. "Ami ekta AI assistant banacchi, naam Dora", "Ami ekhon ekta AI assistant project niye kaj kortesi. Project tar naam Dora.")
    // "I am building a web app called Flow", "Ami ekta project banacchi"
    const projectMatch =
      text.match(/(?:i am working on|i'm working on|i'm building|i am building|my current project is|kaj kortesi|kaj korchi|banacchi|banaitesi|making|developing|প্রজেক্ট করছি|প্রজেক্ট বানাচ্ছি)\s*[:=,]?\s*([^.!?\n]{3,80})/i) ||
      text.match(/(?:project(?:[\s\w]+)?naam|project(?:[\s\w]+)?name\s+is|named|called)\s+([A-Za-z\u0980-\u09FF\s]{2,30})/i);

    if (projectMatch) {
      const projText = projectMatch[1].trim().replace(/[.!?]$/, "");
      const isDora = lower.includes("dora") || lower.includes("দোরা");
      const isAIAssistant = lower.includes("ai assistant") || lower.includes("voice assistant") || lower.includes("assistant");

      let key = "current_project";
      let value = projText;

      if (isDora) {
        key = "current_project";
        value = isAIAssistant ? "Dora AI assistant" : "Building Dora project";
      } else if (isAIAssistant) {
        key = "current_project";
        value = `AI Assistant: ${projText}`;
      } else {
        value = `Working on: ${projText}`;
      }

      results.push({
        category: "projects",
        key,
        value,
        importance: 90,
        confidence: 0.92,
        source: "inferred",
        tags: ["project", "work", "tech"],
      });
    }

    // 6. Goals & Aspirations (e.g. "Next year ami ekta new AI project start korte chai", "my goal is to become an ML engineer")
    const goalMatch =
      text.match(/(?:my goal is to|i want to become|my dream is to|i aim to|korte chai|hote chai|হতে চাই|করতে চাই)\s+([^.!?\n]{3,60})/i);

    if (goalMatch && !lower.includes("maybe") && !lower.includes("perhaps") && !lower.includes("might") && !lower.includes("jani na")) {
      const goal = goalMatch[1].trim().replace(/[.!?]$/, "");
      results.push({
        category: "goals",
        key: "primary_goal",
        value: goal.charAt(0).toUpperCase() + goal.slice(1),
        importance: 85,
        confidence: 0.85,
        source: "inferred",
        tags: ["goal", "dream", "future"],
      });
    }

    // 7. Relationships & Pets (e.g. "Amar bondhu Ryan", "my cat's name is Luna")
    const petMatch = text.match(/(?:my\s+|amar\s+)?(dog|cat|pet|puppy|kitten|biral|kukur)(?:'s)?(?:\s+name\s+is|\s+called|\s+naam)?\s+([A-Za-z\u0980-\u09FF]{2,20})/i);
    if (petMatch) {
      const petType = petMatch[1].toLowerCase();
      const petName = petMatch[2].trim();
      results.push({
        category: "relationships",
        key: `pet_${petType}`,
        value: `${petType.charAt(0).toUpperCase() + petType.slice(1)} named ${petName}`,
        importance: 80,
        confidence: 0.90,
        source: "inferred",
        tags: ["pet", petType, "relationships"],
      });
    }

    const relMatch = text.match(/(?:my\s+|amar\s+)?(friend|best friend|sister|brother|mom|dad|wife|husband|partner|boss|manager|bondhu)(?:'s)?(?:\s+name\s+is|\s+called|\s+naam)?\s+([A-Za-z\u0980-\u09FF]{2,20})/i);
    if (relMatch && !lower.includes("hungry") && !lower.includes("hello")) {
      const relation = relMatch[1].toLowerCase().replace(/\s+/g, "_");
      const personName = relMatch[2].trim();
      results.push({
        category: "relationships",
        key: `relation_${relation}`,
        value: `${relMatch[1]} named ${personName}`,
        importance: 80,
        confidence: 0.90,
        source: "inferred",
        tags: ["relationship", relation, "people"],
      });
    }

    return results;
  }

  /**
   * Applies candidate memories to the store with validation, deduplication, and conflict resolution.
   */
  public applyCandidateMemories(
    candidates: Array<{
      category: MemoryCategory;
      key: string;
      value: string;
      importance: number;
      confidence: number;
      source: MemorySource;
      tags?: string[];
    }>
  ): MemoryItem[] {
    const applied: MemoryItem[] = [];

    for (const cand of candidates) {
      // Reject if importance < 40 (Temporary / low value info)
      if (cand.importance < 40) continue;
      // Reject if confidence < 0.60 (Weak assumptions)
      if (cand.confidence < 0.60) continue;

      // Check if memory already exists
      const existing = this.store.findByKey(cand.key, cand.category);

      if (existing) {
        // If same value, bump importance/confidence if higher
        if (existing.value.toLowerCase() === cand.value.toLowerCase()) {
          const updated = this.store.update(existing.id, {
            importance: Math.max(existing.importance, cand.importance),
            confidence: Math.max(existing.confidence, cand.confidence),
            lastUsedAt: Date.now(),
          });
          if (updated) applied.push(updated);
        } else {
          // Value changed (Conflict resolution: new explicit/inferred information replaces old, updating seamlessly)
          const updated = this.store.update(existing.id, {
            value: cand.value,
            importance: Math.max(existing.importance, cand.importance),
            confidence: Math.max(existing.confidence, cand.confidence),
            source: cand.source,
            tags: cand.tags || existing.tags,
            lastUsedAt: Date.now(),
          });
          if (updated) applied.push(updated);
        }
      } else {
        // Create new memory
        const created = this.store.add({
          category: cand.category,
          key: cand.key,
          value: cand.value,
          importance: cand.importance,
          confidence: cand.confidence,
          source: cand.source,
          status: "active",
          tags: cand.tags || [cand.category],
        });
        applied.push(created);
      }
    }

    return applied;
  }

  /**
   * Asynchronous server-assisted memory extraction.
   * Runs in the background without delaying any voice output.
   */
  public async extractBackgroundMemories(
    userText: string,
    doraResponse?: string
  ): Promise<MemoryItem[]> {
    if (!this.store.isMemoryEnabled() || !userText || userText.trim().length < 5) {
      return [];
    }

    // 1. Run immediate heuristic extraction
    const heuristics = this.extractHeuristicMemories(userText);
    if (heuristics.length > 0) {
      const applied = this.applyCandidateMemories(heuristics);
      for (const item of applied) {
        console.log(
          `[IMPLICIT MEMORY] message: "${userText}" decision: SAVE reason: "Recognized long-term ${item.category} trait" memory: "${item.key} = ${item.value}"`
        );
      }
      return applied;
    }

    // 2. Call server-side deep extraction endpoint asynchronously
    try {
      const response = await fetch("/api/memory/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userText,
          doraResponse,
          existingMemories: this.store.getAll(false).map((m) => ({ key: m.key, value: m.value, category: m.category })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
          const applied = this.applyCandidateMemories(data.candidates);
          for (const item of applied) {
            console.log(
              `[IMPLICIT MEMORY] message: "${userText}" decision: SAVE reason: "Deep inferred ${item.category}" memory: "${item.key} = ${item.value}"`
            );
          }
          return applied;
        } else {
          console.log(
            `[IMPLICIT MEMORY] message: "${userText}" decision: IGNORE reason: "No durable long-term facts detected or temporary noise" memory: none`
          );
        }
      }
    } catch (err) {
      console.warn("[MemoryExtractor] Background extraction notice:", err);
    }

    return [];
  }
}

