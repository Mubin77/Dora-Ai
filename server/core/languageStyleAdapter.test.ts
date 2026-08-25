/**
 * Dora Language Style Adapter Test Suite
 * 
 * Verifies that the LanguageStyleAdapter:
 * 1. Strictly eliminates formal assistant-speak ("Certainly", "How may I help", "As an AI...", etc.).
 * 2. Accurately detects Bangla, Banglish, English, and Mixed code-switching.
 * 3. Identifies conversational moods (PLAYFUL, EMPATHETIC, EXCITED, FOCUSED, CHILL, etc.).
 * 4. Generates natural mood-tailored Banglish phrases and sentence structures.
 * 5. Adapts raw responses into natural conversational flow.
 */

import { languageStyleAdapter, ConversationalMood, LanguageMode } from "./languageStyleAdapter";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

export function runAllLanguageStyleAdapterTests() {
  console.log("\n========================================================");
  console.log("RUNNING DORA LANGUAGE STYLE ADAPTER TEST SUITE");
  console.log("========================================================\n");

  // TEST 1 — Eliminating formal assistant-speak
  console.log("TEST 1 — Formal Assistant-Speak Sanitization:");
  {
    const formal1 = "Certainly, I would be happy to assist you with that. Here is the code.";
    const sanitized1 = languageStyleAdapter.sanitizeAssistantSpeak(formal1, "FOCUSED");
    assert(
      !sanitized1.toLowerCase().includes("certainly"),
      `"Certainly" was removed or replaced (got: "${sanitized1}")`
    );
    assert(
      !sanitized1.toLowerCase().includes("would be happy to assist"),
      `"would be happy to assist" was eliminated (got: "${sanitized1}")`
    );

    const formal2 = "How may I assist you today? Please provide more details.";
    const sanitized2 = languageStyleAdapter.sanitizeAssistantSpeak(formal2, "PLAYFUL");
    assert(
      !sanitized2.toLowerCase().includes("how may i assist you"),
      `"How may I assist you" was replaced (got: "${sanitized2}")`
    );
    assert(
      !sanitized2.toLowerCase().includes("please provide more details"),
      `"Please provide more details" was replaced with natural wording (got: "${sanitized2}")`
    );

    const formal3 = "As an AI language model, I understand your request.";
    const sanitized3 = languageStyleAdapter.sanitizeAssistantSpeak(formal3, "CHILL");
    assert(
      !sanitized3.toLowerCase().includes("as an ai"),
      `"As an AI language model" was stripped (got: "${sanitized3}")`
    );
  }

  // TEST 2 — Language Mode Detection
  console.log("\nTEST 2 — Language Mode Detection:");
  {
    const bangla = languageStyleAdapter.detectLanguageMode("কেমন আছো? আজকের আবহাওয়া কেমন?");
    assert(bangla === "BANGLA", `Detected pure Bangla script (got: ${bangla})`);

    const banglish = languageStyleAdapter.detectLanguageMode("kemon acho dora? ajke ki khobor?");
    assert(banglish === "BANGLISH", `Detected Banglish Latin text (got: ${banglish})`);

    const english = languageStyleAdapter.detectLanguageMode("Can you help me write this TypeScript function?");
    assert(english === "ENGLISH", `Detected English text (got: ${english})`);

    const mixed = languageStyleAdapter.detectLanguageMode("amar React code-e ekta weird error hocche, ektu check koro");
    assert(mixed === "MIXED", `Detected Mixed Bangla/English code-switching (got: ${mixed})`);
  }

  // TEST 3 — Conversational Mood Detection
  console.log("\nTEST 3 — Conversational Mood Detection:");
  {
    const playful = languageStyleAdapter.detectMood("Brooo that meme was crazy lol 😂");
    assert(playful === "PLAYFUL", `Detected PLAYFUL mood (got: ${playful})`);

    const empathetic = languageStyleAdapter.detectMood("I feel so sad and heartbroken today...");
    assert(empathetic === "EMPATHETIC", `Detected EMPATHETIC mood (got: ${empathetic})`);

    const excited = languageStyleAdapter.detectMood("Finallyyy completed my project and all tests passed! 🎉");
    assert(excited === "EXCITED", `Detected EXCITED mood (got: ${excited})`);

    const focused = languageStyleAdapter.detectMood("I have a bug in my typescript build function");
    assert(focused === "FOCUSED", `Detected FOCUSED mood (got: ${focused})`);

    const chill = languageStyleAdapter.detectMood("Let's just relax and chat casually");
    assert(chill === "CHILL", `Detected CHILL mood (got: ${chill})`);
  }

  // TEST 4 — Mood-based Banglish phrase dictionary & structures
  console.log("\nTEST 4 — Mood-based Banglish Phrase Structures:");
  {
    const playfulPhrases = languageStyleAdapter.getMoodPhrases("PLAYFUL");
    assert(playfulPhrases.openers.length > 0, "Playful openers exist");
    assert(
      playfulPhrases.openers.some((o) => o.includes("ki bolos") || o.includes("wild")),
      "Playful phrases contain genuine Gen-Z Banglish"
    );

    const excitedPhrases = languageStyleAdapter.getMoodPhrases("EXCITED");
    assert(
      excitedPhrases.openers.some((o) => o.includes("finallyyy") || o.includes("hugeee")),
      "Excited phrases contain natural celebration Banglish"
    );

    const empatheticPhrases = languageStyleAdapter.getMoodPhrases("EMPATHETIC");
    assert(
      empatheticPhrases.openers.some((o) => o.includes("mon kharap koris na") || o.includes("right here")),
      "Empathetic phrases contain tender comfort without forced memes"
    );
  }

  // TEST 5 — Prompt directives generation
  console.log("\nTEST 5 — Prompt Directives Generation:");
  {
    const directives = languageStyleAdapter.getStylePromptDirectives(
      "PLAYFUL",
      "BANGLISH",
      "Haha tui eto funny keno"
    );
    assert(
      directives.some((d) => d.includes("STRICT ANTI-ASSISTANT RULE")),
      "Strict anti-assistant rule is present"
    );
    assert(
      directives.some((d) => d.includes("Banglish Response Mode")),
      "Banglish response mode directive is present"
    );
    assert(
      directives.some((d) => d.includes("PLAYFUL")),
      "Playful mood directive is present"
    );
  }

  // TEST 6 — Full Response Text Adaptation
  console.log("\nTEST 6 — Response Text Adaptation:");
  {
    const raw = "Certainly! Yes, amar mone hoy eta perfectly kaj korbe.";
    const adapted = languageStyleAdapter.adaptResponseText(raw, "PLAYFUL", "BANGLISH");
    assert(!adapted.toLowerCase().includes("certainly"), "Certainly removed from adapted response");
    assert(adapted.includes("Arehh hae") || adapted.includes("amar mone hoy"), "Natural Banglish structure applied");
  }

  // TEST 7 — Bangla Formal Cliché Sanitization & Filler Conversion
  console.log("\nTEST 7 — Bangla Formal Clichés & English Filler Conversion:");
  {
    const formalBangla = "আপনার প্রদত্ত তথ্যের ভিত্তিতে আমি মনে করছি যে সমস্যাটির সম্ভাব্য কারণ হতে পারে নেটওয়ার্ক।";
    const cleanedBangla = languageStyleAdapter.sanitizeAssistantSpeak(formalBangla, "CHILL");
    assert(!cleanedBangla.includes("আপনার প্রদত্ত তথ্যের ভিত্তিতে"), "Formal Bangla preamble eliminated");
    assert(!cleanedBangla.includes("আমি মনে করছি যে"), "Textbook phrase replaced with natural wording");
    assert(cleanedBangla.includes("আমার মনে হয়"), "Natural colloquial phrasing inserted");

    const englishFillerInBangla = "Actually ami think kori eta thik na.";
    const cleanedFiller = languageStyleAdapter.sanitizeAssistantSpeak(englishFillerInBangla, "CHILL");
    assert(cleanedFiller.includes("আসলে আমার মনে হয়"), "English filler replaced with natural Bangla");
  }

  console.log("\n========================================================");
  console.log("ALL LANGUAGE STYLE ADAPTER TESTS PASSED SUCCESSFULLY! ✓");
  console.log("========================================================\n");
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith("languageStyleAdapter.test.ts")) {
  runAllLanguageStyleAdapterTests();
}
