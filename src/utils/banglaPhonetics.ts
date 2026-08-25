// Lightweight Banglish and Bangla phonetic normalizer for natural speech synthesis
// Ensures Latin-script Bangla words and colloquial terms are pronounced with natural Bangladeshi phonetics

// Common Banglish words mapped to unambiguous phonetic representations for speech models
const BANGLISH_PHONETIC_MAP: Record<string, string> = {
  // Common greetings and inquiries
  "kemon": "কেমন",
  "acho": "আছো",
  "asen": "আছেন",
  "aso": "আসো",
  "achis": "আছিস",
  "ki": "কী",
  "khobor": "খবর",
  "korcho": "করছো",
  "korsos": "করছিস",
  "korchen": "করছেন",
  "kori": "করি",
  "korte": "করতে",
  "koro": "করো",
  "korbo": "করবো",
  "korlam": "করলাম",
  "kore": "করে",
  "korechi": "করেছি",
  "koreche": "করেছে",
  
  // Pronouns & references
  "ami": "আমি",
  "amar": "আমার",
  "amake": "আমাকে",
  "amra": "আমরা",
  "amader": "আমাদের",
  "tumi": "তুমি",
  "tomar": "তোমার",
  "tomake": "তোমাকে",
  "apni": "আপনি",
  "apnar": "আপনার",
  "apnake": "আপনাকে",
  "tui": "তুই",
  "tor": "তোর",
  "toke": "তোকে",
  "she": "সে",
  "tini": "তিনি",
  "ora": "ওরা",
  "tara": "তারা",
  "oder": "ওদের",
  "tader": "তাদের",

  // Demonstratives & question words
  "eta": "এটা",
  "ota": "ওটা",
  "eita": "এইটা",
  "oita": "ওইটা",
  "ei": "এই",
  "oi": "ওই",
  "erkom": "এরকম",
  "orkom": "ওরকম",
  "emon": "এমন",
  "keno": "কেনো",
  "kothay": "কোথায়",
  "kokhon": "কখন",
  "kivabe": "কীভাবে",
  "kibhabe": "কীভাবে",
  "koto": "কত",
  "koyta": "কয়টা",

  // Common verbs & auxiliaries
  "bujhte": "বুঝতে",
  "bujhlam": "বুঝলাম",
  "bujhchi": "বুঝছি",
  "bujhechi": "বুঝেছি",
  "bujhsi": "বুঝছি",
  "bolo": "বলো",
  "bolen": "বলেন",
  "bolchi": "বলছি",
  "bollam": "বললাম",
  "bolte": "বলতে",
  "dekhi": "দেখি",
  "dekho": "দেখো",
  "dekhen": "দেখেন",
  "dekhlam": "দেখলাম",
  "dekhte": "দেখতে",
  "shuno": "শোনো",
  "shunchen": "শুনছেন",
  "shunlam": "শুনলাম",
  "hobe": "হবে",
  "hoyeche": "হয়েছে",
  "hoise": "হইছে",
  "hocche": "হচ্ছে",
  "hoche": "হচ্ছে",
  "parbo": "পারবো",
  "parchi": "পারছি",
  "parsi": "পারছি",
  "parbo na": "পারবো না",
  "lagche": "লাগছে",
  "lagse": "লাগছে",
  "jani": "জানি",
  "jantam": "জানতাম",
  "jano": "জানো",

  // Common particles & adjectives
  "bhalo": "ভালো",
  "valo": "ভালো",
  "shundor": "সুন্দর",
  "sotti": "সত্যি",
  "shotti": "সত্যি",
  "onek": "অনেক",
  "khub": "খুব",
  "ektu": "একটু",
  "ekhon": "এখন",
  "tokhon": "তখন",
  "pore": "পরে",
  "age": "আগে",
  "thik": "ঠিক",
  "thik ache": "ঠিক আছে",
  "thikase": "ঠিক আছে",
  "thikache": "ঠিক আছে",
  "hae": "হ্যাঁ",
  "haa": "হ্যাঁ",
  "na": "না",
  "tai": "তাই",
  "to": "তো",
  "ar": "আর",
  "aro": "আরো",
  "kintu": "কিন্তু",
  "karun": "কারণ",
  "karon": "কারণ",
  "shob": "সব",
  "sob": "সব",
  "kichu": "কিছু",
  "chinta": "চিন্তা",
  "koro na": "করো না",
  "koris na": "করিস না",
  "dhonnobad": "ধন্যবাদ",
  "shagotom": "স্বাগতম",
  "biday": "বিদায়",
  "chup": "চুপ",
  "shanto": "শান্ত",
  "jomjomat": "জমজমাট",
  "ekdom": "একদম",
  "shobai": "সবাই",
  "shobar": "সবার",
  "kichui": "কিছুই",
  "kotha": "কথা",
  "shune": "শুনে",
  "bhalo laglo": "ভালো লাগলো",
};

// Common English words frequently mixed in Banglish that should be preserved as English
const ENGLISH_PRESERVED_WORDS = new Set([
  "okay", "ok", "yes", "no", "yeah", "yep", "hey", "hi", "hello", "project",
  "code", "app", "application", "file", "error", "bug", "fix", "check",
  "test", "deploy", "server", "client", "screen", "button", "link",
  "call", "chat", "voice", "audio", "video", "system", "feature", "data",
  "user", "login", "update", "start", "stop", "cool", "nice", "great",
  "awesome", "please", "thanks", "thank", "you", "sorry", "wait", "time",
  "sure", "fine", "ready", "done", "problem", "solution", "idea", "browser"
]);

/**
 * Detects if a text snippet contains Banglish or Bengali text
 */
export function containsBanglaOrBanglish(text: string): boolean {
  if (!text) return false;
  
  // Direct Bengali Unicode range
  if (/[\u0980-\u09FF]/.test(text)) {
    return true;
  }

  // Check against known Banglish tokens
  const words = text.toLowerCase().split(/[\s,?.!;:()"]+/);
  let banglishMatchCount = 0;
  for (const w of words) {
    if (BANGLISH_PHONETIC_MAP[w]) {
      banglishMatchCount++;
    }
  }

  // If at least 1 prominent Banglish word is found, flag as Bangla/Banglish
  return banglishMatchCount >= 1;
}

/**
 * Preprocesses Banglish/Bangla input for natural speech synthesis without altering meaning
 * or changing English code-switched terms.
 */
export function normalizeBanglishPhonetics(text: string): string {
  if (!text || typeof text !== "string") return text;

  // Process text word-by-word while preserving punctuation and spacing
  return text.replace(/\b([a-zA-Z]+(?:'[a-zA-Z]+)?)\b/g, (match) => {
    const lower = match.toLowerCase();

    // Preserve English words in mixed code-switched contexts
    if (ENGLISH_PRESERVED_WORDS.has(lower)) {
      return match;
    }

    // Replace unambiguous Banglish token with its Bengali counterpart for crisp pronunciation
    if (BANGLISH_PHONETIC_MAP[lower]) {
      return BANGLISH_PHONETIC_MAP[lower];
    }

    return match;
  });
}
