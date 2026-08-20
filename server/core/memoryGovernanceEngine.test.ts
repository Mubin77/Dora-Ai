/**
 * Dora Memory Governance & Response Integration Engine Test Suite
 * Phase 2 — Step 4
 * 
 * Verifies that the memory governance engine deterministically audits,
 * filters, safety-checks, and safely exposes retrieved memories to downstream
 * prompt generation without leaking raw internal objects or private credentials.
 */

import { memoryGovernanceEngine } from "./memoryGovernanceEngine";
import { brainEngine } from "./brainEngine";
import { memoryStore } from "./memoryStore";
import { MemoryCandidate, MemoryRetrievalAnalysis } from "./memoryRetrievalTypes";
import { ConversationContext, ConversationConstraint } from "./contextTypes";
import { StructuredIntent, BrainIntent } from "./intentTypes";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

function createDummyContext(topic = "general", isTopicSwitched = false): ConversationContext {
  return {
    id: "test_context_id",
    activeTopic: topic,
    currentTask: null,
    userGoal: null,
    entities: [],
    constraints: [],
    preferences: [],
    recentReferences: [],
    conversationState: isTopicSwitched ? "topic_switched" : "active",
    lastMeaningfulUserIntent: "INFORMATION",
    lastMeaningfulAssistantResponse: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    contextTimestamp: Date.now(),
    turnsCount: 1,
    isTopicSwitched,
    isAmbiguousReference: false,
    archivedContexts: [],
    topicHistory: [],
  };
}

function createDummyIntent(intentName: BrainIntent = "RECOMMENDATION"): StructuredIntent {
  return {
    primaryIntent: intentName,
    secondaryIntent: undefined,
    relationship: "STANDALONE",
    intentConfidence: 0.9,
    intentSignals: { [intentName]: 0.9 },
    requiresClarification: false,
    isMultiIntent: false,
    suggestedDirectives: [],
  };
}

function createDummyRetrieval(
  candidates: MemoryCandidate[] = [],
  isExplicit = false
): MemoryRetrievalAnalysis {
  return {
    query: {
      message: "test message",
      isExplicitMemoryQuery: isExplicit,
    },
    candidates,
    retrievedMemories: candidates,
    totalConsidered: candidates.length,
    totalRetrieved: candidates.length,
    isExplicitRequest: isExplicit,
    isBroadProfileQuery: false,
    requiresClarification: false,
    directives: [],
    contextString: "",
    conflictsDetected: [],
    excludedCount: {
      superseded: 0,
      expired: 0,
      sensitive: 0,
      lowRelevance: 0,
      duplicate: 0,
      topicIsolated: 0,
    },
  };
}

function runTests() {
  console.log("==========================================");
  console.log("RUNNING DORA MEMORY GOVERNANCE ENGINE TEST SUITE");
  console.log("==========================================");

  const baseTime = 1700000000000;

  // =========================================================================
  // TEST 1 — High-confidence ACTIVE memory -> ALLOW
  // =========================================================================
  console.log("\nTEST 1 — High-confidence ACTIVE memory -> ALLOW:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_pref_1",
        userId: "u1",
        type: "PREFERENCE",
        key: "preference_laptop_brand",
        value: "ASUS",
        normalizedValue: "asus",
        source: "EXPLICIT_USER",
        confidence: 0.95,
        importance: 85,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 3,
        status: "ACTIVE",
        tags: ["tech", "laptop"],
        evidence: ["User said: I prefer ASUS"],
        version: 1,
      },
      memoryId: "mem_pref_1",
      content: "prefers ASUS laptops",
      memoryType: "PREFERENCE",
      category: "preference_laptop_brand",
      confidence: 0.95,
      importance: 85,
      relevanceScore: 0.92,
      matchedSignals: ["laptop", "brand"],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "High relevance to laptop query",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("laptops"),
      intent: createDummyIntent("RECOMMENDATION"),
      retrieval: createDummyRetrieval([cand]),
      message: "Which laptop should I buy for gaming under 100k?",
    });

    assert(analysis.governanceRequired === true, "Governance required is true");
    assert(analysis.memoryInfluenceAllowed === true, "Memory influence is allowed");
    assert(analysis.allowedMemories.length === 1, "Exactly 1 memory in allowedMemories");
    assert(analysis.allowedMemories[0].usageDecision === "ALLOW", "Usage decision is ALLOW");
    assert(analysis.allowedMemories[0].confidence === 0.95, "Confidence preserved at 0.95");
    assert(analysis.allowedMemories[0].canPersonalize === true, "canPersonalize is true");
  }

  // =========================================================================
  // TEST 2 — Medium-confidence memory -> ALLOW_WITH_CAUTION
  // =========================================================================
  console.log("\nTEST 2 — Medium-confidence memory -> ALLOW_WITH_CAUTION:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_pref_med",
        userId: "u1",
        type: "PREFERENCE",
        key: "preference_screen_type",
        value: "OLED",
        normalizedValue: "oled",
        source: "INFERRED",
        confidence: 0.70,
        importance: 60,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["display"],
        evidence: ["User mentioned liking vibrant screens"],
        version: 1,
      },
      memoryId: "mem_pref_med",
      content: "prefers OLED screen",
      memoryType: "PREFERENCE",
      category: "preference_screen_type",
      confidence: 0.70,
      importance: 60,
      relevanceScore: 0.65,
      matchedSignals: ["display"],
      source: "INFERRED",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "Medium relevance",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("laptops"),
      intent: createDummyIntent("RECOMMENDATION"),
      retrieval: createDummyRetrieval([cand]),
      message: "Looking for a new laptop",
    });

    assert(analysis.cautiousMemories.length === 1, "Medium confidence classified as cautious");
    assert(analysis.cautiousMemories[0].usageDecision === "ALLOW_WITH_CAUTION", "Decision is ALLOW_WITH_CAUTION");
  }

  // =========================================================================
  // TEST 3 — Low-confidence memory -> INTERNAL_ONLY / SUPPRESS
  // =========================================================================
  console.log("\nTEST 3 — Low-confidence memory -> INTERNAL_ONLY / SUPPRESS:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_low_conf",
        userId: "u1",
        type: "CANDIDATE",
        key: "interest_crypto",
        value: "Bitcoin trading",
        normalizedValue: "bitcoin",
        source: "INFERRED",
        confidence: 0.40,
        importance: 30,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "CANDIDATE",
        tags: ["finance"],
        evidence: ["One-off comment"],
        version: 1,
      },
      memoryId: "mem_low_conf",
      content: "interested in Bitcoin",
      memoryType: "CANDIDATE",
      category: "interest_crypto",
      confidence: 0.40,
      importance: 30,
      relevanceScore: 0.45,
      matchedSignals: ["finance"],
      source: "INFERRED",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "CANDIDATE",
      retrievalReason: "Weak candidate",
      isLowConfidenceInferred: true,
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("finance"),
      intent: createDummyIntent("INFORMATION"),
      retrieval: createDummyRetrieval([cand]),
      message: "How does blockchain work?",
    });

    assert(analysis.allowedMemories.length === 0, "Low confidence not in allowedMemories");
    assert(analysis.internalOnlyMemories.length === 1, "Low confidence isolated to internalOnlyMemories");
    assert(analysis.internalOnlyMemories[0].usageDecision === "INTERNAL_ONLY", "Decision is INTERNAL_ONLY");
  }

  // =========================================================================
  // TEST 4 — No memories -> fast path
  // =========================================================================
  console.log("\nTEST 4 — No memories -> fast path:");
  {
    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("general"),
      intent: createDummyIntent("INFORMATION"),
      retrieval: createDummyRetrieval([]),
      message: "What is quantum computing?",
    });

    assert(analysis.governanceRequired === false, "Fast path sets governanceRequired = false");
    assert(analysis.memoryInfluenceAllowed === false, "Fast path sets memoryInfluenceAllowed = false");
    assert(analysis.sanitizedMemoryContext === "", "Sanitized memory context is empty string");
  }

  // =========================================================================
  // TEST 5 — Casual conversation -> no unnecessary memory injection
  // =========================================================================
  console.log("\nTEST 5 — Casual conversation -> no unnecessary memory injection:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_random",
        userId: "u1",
        type: "PREFERENCE",
        key: "preference_laptop_brand",
        value: "ASUS",
        normalizedValue: "asus",
        source: "EXPLICIT_USER",
        confidence: 0.95,
        importance: 85,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["tech"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_random",
      content: "ASUS",
      memoryType: "PREFERENCE",
      category: "preference_laptop_brand",
      confidence: 0.95,
      importance: 85,
      relevanceScore: 0.3,
      matchedSignals: [],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "Weak match",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("general"),
      intent: createDummyIntent("CASUAL_CONVERSATION"),
      retrieval: createDummyRetrieval([cand]),
      message: "Hello! How are you doing today?",
    });

    assert(analysis.allowedMemories.length === 0, "No memories allowed for casual hello");
    assert(analysis.memoryInfluenceAllowed === false, "Memory influence disallowed for casual greeting");
    assert(analysis.sanitizedMemoryContext === "", "No memory injected into context for casual greeting");
  }

  // =========================================================================
  // TEST 6 — CANDIDATE cannot be presented as confirmed fact
  // =========================================================================
  console.log("\nTEST 6 — CANDIDATE cannot be presented as confirmed fact:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_cand_1",
        userId: "u1",
        type: "CANDIDATE",
        key: "interest_ai",
        value: "LLM fine-tuning",
        normalizedValue: "llm fine-tuning",
        source: "INFERRED",
        confidence: 0.72,
        importance: 50,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 2,
        status: "CANDIDATE",
        tags: ["ai"],
        evidence: ["User asked about LoRA"],
        version: 1,
      },
      memoryId: "mem_cand_1",
      content: "interested in LLM fine-tuning",
      memoryType: "CANDIDATE",
      category: "interest_ai",
      confidence: 0.72,
      importance: 50,
      relevanceScore: 0.85,
      matchedSignals: ["ai"],
      source: "INFERRED",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "CANDIDATE",
      retrievalReason: "Topic match",
      isLowConfidenceInferred: true,
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("ai"),
      intent: createDummyIntent("RECOMMENDATION"),
      retrieval: createDummyRetrieval([cand]),
      message: "Recommend some GPU rigs",
    });

    assert(analysis.cautiousMemories.length === 1, "Candidate placed in cautiousMemories");
    assert(analysis.cautiousMemories[0].canSupportFactualClaim === false, "canSupportFactualClaim is strictly FALSE for CANDIDATE");
    assert(analysis.cautiousMemories[0].requiresExplicitAttribution === true, "requiresExplicitAttribution is true");
    assert(analysis.sanitizedMemoryContext.includes("[INFERRED USER INTEREST — NOT CONFIRMED]"), "Context explicitly tags candidate as unconfirmed");
  }

  // =========================================================================
  // TEST 7 — SUPERSEDED memory suppressed
  // =========================================================================
  console.log("\nTEST 7 — SUPERSEDED memory suppressed:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_old_superseded",
        userId: "u1",
        type: "PREFERENCE",
        key: "preference_laptop_brand",
        value: "HP",
        normalizedValue: "hp",
        source: "EXPLICIT_USER",
        confidence: 0.9,
        importance: 70,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "SUPERSEDED",
        tags: ["laptop"],
        evidence: [],
        supersededBy: "mem_new_asus",
        version: 1,
      },
      memoryId: "mem_old_superseded",
      content: "prefers HP",
      memoryType: "PREFERENCE",
      category: "preference_laptop_brand",
      confidence: 0.9,
      importance: 70,
      relevanceScore: 0.88,
      matchedSignals: ["laptop"],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "SUPERSEDED",
      retrievalReason: "Old match",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("laptops"),
      intent: createDummyIntent("RECOMMENDATION"),
      retrieval: createDummyRetrieval([cand]),
      message: "Recommend a laptop",
    });

    assert(analysis.suppressedMemories.length === 1, "Superseded memory is suppressed");
    assert(analysis.suppressedMemories[0].usageDecision === "SUPPRESS", "Decision is SUPPRESS");
    assert(analysis.suppressedMemories[0].reasons.includes("SUPERSEDED_MEMORY"), "Reason includes SUPERSEDED_MEMORY");
  }

  // =========================================================================
  // TEST 8 — EXPIRED memory suppressed
  // =========================================================================
  console.log("\nTEST 8 — EXPIRED memory suppressed:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_expired",
        userId: "u1",
        type: "TEMPORARY",
        key: "temp_delivery_address",
        value: "Hotel Continental Room 402",
        normalizedValue: "hotel continental",
        source: "EXPLICIT_USER",
        confidence: 1.0,
        importance: 50,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        expiresAt: baseTime + 1000,
        status: "EXPIRED",
        tags: ["temp"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_expired",
      content: "Hotel Continental",
      memoryType: "TEMPORARY",
      category: "temp_delivery_address",
      confidence: 1.0,
      importance: 50,
      relevanceScore: 0.9,
      matchedSignals: ["address"],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "EXPIRED",
      retrievalReason: "Expired temporary",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("delivery"),
      intent: createDummyIntent("TOOL_ACTION"),
      retrieval: createDummyRetrieval([cand]),
      message: "Where should my order be delivered?",
      options: { currentTime: baseTime + 5000 },
    });

    assert(analysis.suppressedMemories.length === 1, "Expired memory is in suppressedMemories");
    assert(analysis.suppressedMemories[0].usageDecision === "SUPPRESS", "Decision is SUPPRESS");
    assert(analysis.suppressedMemories[0].reasons.includes("EXPIRED_MEMORY"), "Reason includes EXPIRED_MEMORY");
  }

  // =========================================================================
  // TEST 9 — DELETED memory suppressed
  // =========================================================================
  console.log("\nTEST 9 — DELETED memory suppressed:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_deleted",
        userId: "u1",
        type: "FACT",
        key: "user_employer",
        value: "Old Company Corp",
        normalizedValue: "old company",
        source: "EXPLICIT_USER",
        confidence: 1.0,
        importance: 80,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "DELETED",
        tags: ["career"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_deleted",
      content: "worked at Old Company Corp",
      memoryType: "FACT",
      category: "user_employer",
      confidence: 1.0,
      importance: 80,
      relevanceScore: 0.9,
      matchedSignals: ["company"],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "DELETED",
      retrievalReason: "Deleted match",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("career"),
      intent: createDummyIntent("INFORMATION"),
      retrieval: createDummyRetrieval([cand]),
      message: "Tell me about my career",
    });

    assert(analysis.suppressedMemories.length === 1, "Deleted memory suppressed");
    assert(analysis.suppressedMemories[0].reasons.includes("DELETED_MEMORY"), "Reason includes DELETED_MEMORY");
  }

  // =========================================================================
  // TEST 10 — QUARANTINED memory suppressed
  // =========================================================================
  console.log("\nTEST 10 — QUARANTINED memory suppressed:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_quarantine",
        userId: "u1",
        type: "FACT",
        key: "secret_token",
        value: "[REDACTED_SENSITIVE_DATA]",
        normalizedValue: "[redacted]",
        source: "EXPLICIT_USER",
        confidence: 1.0,
        importance: 90,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "DELETED",
        isQuarantined: true,
        quarantineReason: "API Key detected",
        tags: ["sensitive"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_quarantine",
      content: "secret_token",
      memoryType: "FACT",
      category: "secret_token",
      confidence: 1.0,
      importance: 90,
      relevanceScore: 0.95,
      matchedSignals: ["token"],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "DELETED",
      retrievalReason: "Quarantined secret",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("security"),
      intent: createDummyIntent("INFORMATION"),
      retrieval: createDummyRetrieval([cand]),
      message: "What is my API key?",
    });

    assert(analysis.suppressedMemories.length === 1, "Quarantined memory suppressed");
    assert(analysis.privacyBlocks.length === 1, "Privacy block recorded");
    assert(analysis.directives.some((d) => d.includes("Sensitive memory was blocked")), "Directive generated for privacy block");
  }

  // =========================================================================
  // TEST 11 — Password blocked
  // =========================================================================
  console.log("\nTEST 11 — Password blocked:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_pwd",
        userId: "u1",
        type: "FACT",
        key: "user_password",
        value: "SuperSecretPassword123!",
        normalizedValue: "supersecretpassword123!",
        source: "EXPLICIT_USER",
        confidence: 1.0,
        importance: 100,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["auth"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_pwd",
      content: "user password is SuperSecretPassword123!",
      memoryType: "FACT",
      category: "user_password",
      confidence: 1.0,
      importance: 100,
      relevanceScore: 0.99,
      matchedSignals: ["password"],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "Password match",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("auth"),
      intent: createDummyIntent("INFORMATION"),
      retrieval: createDummyRetrieval([cand], true),
      message: "What is my password?",
    });

    assert(analysis.allowedMemories.length === 0, "Password never reaches allowedMemories");
    assert(analysis.suppressedMemories.length === 1, "Password caught by privacy gate");
    assert(analysis.privacyBlocks.length === 1, "Privacy block recorded for password");
    assert(!analysis.sanitizedMemoryContext.includes("SuperSecretPassword123!"), "Password not in sanitized context");
  }

  // =========================================================================
  // TEST 12 — API key blocked
  // =========================================================================
  console.log("\nTEST 12 — API key blocked:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_apikey",
        userId: "u1",
        type: "FACT",
        key: "openai_key",
        value: "sk-1234567890abcdefghijklmnopqrstuv",
        normalizedValue: "sk-1234567890abcdefghijklmnopqrstuv",
        source: "EXPLICIT_USER",
        confidence: 1.0,
        importance: 100,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["api"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_apikey",
      content: "sk-1234567890abcdefghijklmnopqrstuv",
      memoryType: "FACT",
      category: "openai_key",
      confidence: 1.0,
      importance: 100,
      relevanceScore: 0.99,
      matchedSignals: ["api"],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "API key match",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("dev"),
      intent: createDummyIntent("INFORMATION"),
      retrieval: createDummyRetrieval([cand], true),
      message: "What is my OpenAI API key?",
    });

    assert(analysis.allowedMemories.length === 0, "API key not in allowedMemories");
    assert(!analysis.sanitizedMemoryContext.includes("sk-1234567890"), "API key not in sanitized context");
  }

  // =========================================================================
  // TEST 13 — Financial data (credit card / CVV) blocked
  // =========================================================================
  console.log("\nTEST 13 — Financial data (credit card / CVV) blocked:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_cc",
        userId: "u1",
        type: "FACT",
        key: "credit_card",
        value: "4532 1234 5678 9010",
        normalizedValue: "4532123456789010",
        source: "EXPLICIT_USER",
        confidence: 1.0,
        importance: 100,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["finance"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_cc",
      content: "4532 1234 5678 9010",
      memoryType: "FACT",
      category: "credit_card",
      confidence: 1.0,
      importance: 100,
      relevanceScore: 0.99,
      matchedSignals: ["cc"],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "Credit card match",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("payment"),
      intent: createDummyIntent("INFORMATION"),
      retrieval: createDummyRetrieval([cand]),
      message: "My payment details",
    });

    assert(analysis.allowedMemories.length === 0, "Credit card not allowed");
    assert(analysis.privacyBlocks.length === 1, "Credit card caught in privacy block");
  }

  // =========================================================================
  // TEST 14 — Sensitive data never appears in directives
  // =========================================================================
  console.log("\nTEST 14 — Sensitive data never appears in directives:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_pin",
        userId: "u1",
        type: "FACT",
        key: "bank_pin",
        value: "8421",
        normalizedValue: "8421",
        source: "EXPLICIT_USER",
        confidence: 1.0,
        importance: 100,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["pin"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_pin",
      content: "pin is 8421",
      memoryType: "FACT",
      category: "bank_pin",
      confidence: 1.0,
      importance: 100,
      relevanceScore: 0.9,
      matchedSignals: ["pin"],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "Pin match",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("banking"),
      intent: createDummyIntent("INFORMATION"),
      retrieval: createDummyRetrieval([cand]),
      message: "What was my pin?",
    });

    for (const d of analysis.directives) {
      assert(!d.includes("8421"), "Directives do not contain raw pin digits");
    }
  }

  // =========================================================================
  // TEST 15 — Topic switch isolates unrelated memory
  // =========================================================================
  console.log("\nTEST 15 — Topic switch isolates unrelated memory:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_laptop_pref",
        userId: "u1",
        type: "PREFERENCE",
        key: "preference_laptop_brand",
        value: "ASUS ROG",
        normalizedValue: "asus rog",
        source: "EXPLICIT_USER",
        confidence: 0.95,
        importance: 85,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 2,
        status: "ACTIVE",
        tags: ["laptops", "tech"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_laptop_pref",
      content: "prefers ASUS ROG",
      memoryType: "PREFERENCE",
      category: "preference_laptop_brand",
      confidence: 0.95,
      importance: 85,
      relevanceScore: 0.8,
      matchedSignals: ["brand"],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "Cached retrieval",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("weather", true), // isTopicSwitched = true
      intent: createDummyIntent("REAL_TIME_INFORMATION"),
      retrieval: createDummyRetrieval([cand]),
      message: "What is the weather in Dhaka tomorrow?",
    });

    assert(analysis.topicIsolationApplied === true, "Topic isolation flag set to true");
    assert(analysis.allowedMemories.length === 0, "Laptop preference isolated from weather query");
    assert(analysis.suppressedMemories[0].reasons.includes("TOPIC_MISMATCH"), "Reason is TOPIC_MISMATCH");
  }

  // =========================================================================
  // TEST 16 — Relevant stable preference survives topic switch
  // =========================================================================
  console.log("\nTEST 16 — Relevant stable preference survives topic switch:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_theme_pref",
        userId: "u1",
        type: "PREFERENCE",
        key: "preference_ui_theme",
        value: "dark mode",
        normalizedValue: "dark mode",
        source: "EXPLICIT_USER",
        confidence: 1.0,
        importance: 90,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 5,
        status: "ACTIVE",
        tags: ["global_profile", "ui"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_theme_pref",
      content: "dark mode",
      memoryType: "PREFERENCE",
      category: "preference_ui_theme",
      confidence: 1.0,
      importance: 90,
      relevanceScore: 0.9,
      matchedSignals: ["theme"],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "Global preference",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("weather", true),
      intent: createDummyIntent("REAL_TIME_INFORMATION"),
      retrieval: createDummyRetrieval([cand]),
      message: "Show me weather in dark mode UI",
    });

    assert(analysis.allowedMemories.length === 1, "Global preference survives topic switch");
    assert(analysis.allowedMemories[0].key === "preference_ui_theme", "Retained UI theme preference");
  }

  // =========================================================================
  // TEST 17 — English explicit memory reference
  // =========================================================================
  console.log("\nTEST 17 — English explicit memory reference:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_budget_1",
        userId: "u1",
        type: "PREFERENCE",
        key: "preference_laptop_budget",
        value: "80,000 BDT",
        normalizedValue: "80000 bdt",
        source: "EXPLICIT_USER",
        confidence: 0.95,
        importance: 90,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 2,
        status: "ACTIVE",
        tags: ["budget"],
        evidence: ["User said: My budget is 80k BDT"],
        version: 1,
      },
      memoryId: "mem_budget_1",
      content: "budget is 80k BDT",
      memoryType: "PREFERENCE",
      category: "preference_laptop_budget",
      confidence: 0.95,
      importance: 90,
      relevanceScore: 0.95,
      matchedSignals: ["budget"],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "Explicit recall match",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("laptops"),
      intent: createDummyIntent("MEMORY_RECALL"),
      retrieval: createDummyRetrieval([cand], true),
      message: "Do you remember my laptop budget?",
    });

    assert(analysis.explicitReferenceDetected === true, "Explicit reference detected in English");
    assert(analysis.allowedMemories.length === 1, "Budget memory approved in allowedMemories");
    assert(analysis.allowedMemories[0].reasons.includes("EXPLICIT_REFERENCE"), "Reason includes EXPLICIT_REFERENCE");
  }

  // =========================================================================
  // TEST 18 — Bangla explicit memory reference
  // =========================================================================
  console.log("\nTEST 18 — Bangla explicit memory reference:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_brand_bn",
        userId: "u1",
        type: "PREFERENCE",
        key: "preference_laptop_brand",
        value: "Lenovo Legion",
        normalizedValue: "lenovo legion",
        source: "EXPLICIT_USER",
        confidence: 0.95,
        importance: 90,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 2,
        status: "ACTIVE",
        tags: ["laptop"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_brand_bn",
      content: "Lenovo Legion",
      memoryType: "PREFERENCE",
      category: "preference_laptop_brand",
      confidence: 0.95,
      importance: 90,
      relevanceScore: 0.95,
      matchedSignals: ["brand"],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "Bangla recall match",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("laptops"),
      intent: createDummyIntent("MEMORY_RECALL"),
      retrieval: createDummyRetrieval([cand], true),
      message: "আগে আমি কোন ল্যাপটপ ব্র্যান্ড পছন্দ বলেছিলাম?",
    });

    assert(analysis.explicitReferenceDetected === true, "Bangla explicit reference detected");
    assert(analysis.allowedMemories.length === 1, "Approved memory in Bangla context");
  }

  // =========================================================================
  // TEST 19 — Banglish explicit memory reference
  // =========================================================================
  console.log("\nTEST 19 — Banglish explicit memory reference:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_budget_bng",
        userId: "u1",
        type: "PREFERENCE",
        key: "preference_laptop_budget",
        value: "80,000 BDT",
        normalizedValue: "80000 bdt",
        source: "EXPLICIT_USER",
        confidence: 0.95,
        importance: 90,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 2,
        status: "ACTIVE",
        tags: ["budget"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_budget_bng",
      content: "80,000 BDT",
      memoryType: "PREFERENCE",
      category: "preference_laptop_budget",
      confidence: 0.95,
      importance: 90,
      relevanceScore: 0.95,
      matchedSignals: ["budget"],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "Banglish recall match",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("laptops"),
      intent: createDummyIntent("MEMORY_RECALL"),
      retrieval: createDummyRetrieval([cand], true),
      message: "Amar laptop budget ta mone ache?",
    });

    assert(analysis.explicitReferenceDetected === true, "Banglish explicit reference detected");
    assert(analysis.allowedMemories.length === 1, "Budget recalled successfully in Banglish");
  }

  // =========================================================================
  // TEST 20 — Missing requested memory does not hallucinate
  // =========================================================================
  console.log("\nTEST 20 — Missing requested memory does not hallucinate:");
  {
    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("general"),
      intent: createDummyIntent("MEMORY_RECALL"),
      retrieval: createDummyRetrieval([], true),
      message: "What did I tell you about my sister's birthday?",
    });

    assert(analysis.explicitReferenceDetected === true, "Explicit query detected");
    assert(analysis.memoryInfluenceAllowed === false, "Memory influence disallowed when no memory exists");
    assert(
      analysis.directives.some((d) => d.includes("no confirmed memory exists")),
      "Directive generated to inform user honestly without hallucinating"
    );
  }

  // =========================================================================
  // TEST 21 — Recommendation uses relevant preference for personalization
  // =========================================================================
  console.log("\nTEST 21 — Recommendation uses relevant preference for personalization:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_lightweight",
        userId: "u1",
        type: "PREFERENCE",
        key: "preference_weight",
        value: "lightweight under 1.5kg",
        normalizedValue: "lightweight",
        source: "EXPLICIT_USER",
        confidence: 0.95,
        importance: 85,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 2,
        status: "ACTIVE",
        tags: ["laptop"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_lightweight",
      content: "lightweight under 1.5kg",
      memoryType: "PREFERENCE",
      category: "preference_weight",
      confidence: 0.95,
      importance: 85,
      relevanceScore: 0.9,
      matchedSignals: ["weight"],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "Weight preference",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("laptops"),
      intent: createDummyIntent("RECOMMENDATION"),
      retrieval: createDummyRetrieval([cand]),
      message: "Suggest a good ultrabook",
    });

    assert(analysis.allowedMemories.length === 1, "Weight preference allowed");
    assert(analysis.allowedMemories[0].canPersonalize === true, "canPersonalize is true");
    assert(analysis.allowedMemories[0].canSupportFactualClaim === false, "canSupportFactualClaim is false (personalization only)");
    assert(
      analysis.directives.some((d) => d.includes("Do not treat it as a mandatory constraint")),
      "Directive instructs LLM to use as soft personalization, not hard constraint"
    );
  }

  // =========================================================================
  // TEST 22 — Comparison does not convert preference into factual claim
  // =========================================================================
  console.log("\nTEST 22 — Comparison does not convert preference into factual claim:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_asus_pref",
        userId: "u1",
        type: "PREFERENCE",
        key: "preference_laptop_brand",
        value: "ASUS",
        normalizedValue: "asus",
        source: "EXPLICIT_USER",
        confidence: 0.95,
        importance: 85,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 2,
        status: "ACTIVE",
        tags: ["laptop"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_asus_pref",
      content: "prefers ASUS",
      memoryType: "PREFERENCE",
      category: "preference_laptop_brand",
      confidence: 0.95,
      importance: 85,
      relevanceScore: 0.85,
      matchedSignals: ["brand"],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "Brand preference",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("laptops"),
      intent: createDummyIntent("COMPARISON"),
      retrieval: createDummyRetrieval([cand]),
      message: "Compare ASUS Zephyrus vs Lenovo Legion 5",
    });

    assert(analysis.allowedMemories.length === 1, "Allowed for personalization");
    assert(analysis.allowedMemories[0].canSupportFactualClaim === false, "Factual claim flag is strictly false");
    assert(
      analysis.directives.some((d) => d.includes("must not distort factual")),
      "Directive ensures comparison remains evidence-grounded"
    );
  }

  // =========================================================================
  // TEST 23 — Real-time query does not substitute stale memory
  // =========================================================================
  console.log("\nTEST 23 — Real-time query does not substitute stale memory:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_old_temp",
        userId: "u1",
        type: "FACT",
        key: "last_weather",
        value: "Rainy 24C",
        normalizedValue: "rainy",
        source: "SYSTEM",
        confidence: 0.9,
        importance: 40,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["weather"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_old_temp",
      content: "Rainy 24C",
      memoryType: "FACT",
      category: "last_weather",
      confidence: 0.9,
      importance: 40,
      relevanceScore: 0.8,
      matchedSignals: ["weather"],
      source: "SYSTEM",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "Weather memory",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("weather"),
      intent: createDummyIntent("REAL_TIME_INFORMATION"),
      retrieval: createDummyRetrieval([cand]),
      message: "Is it raining outside right now?",
    });

    assert(analysis.allowedMemories.length === 0, "Old weather fact not allowed as truth");
    assert(analysis.internalOnlyMemories[0].usageDecision === "INTERNAL_ONLY", "Isolated to INTERNAL_ONLY");
    assert(analysis.internalOnlyMemories[0].canSupportFactualClaim === false, "Cannot support factual claim for real-time query");
  }

  // =========================================================================
  // TEST 24 — Calculation ignores unrelated memory
  // =========================================================================
  console.log("\nTEST 24 — Calculation ignores unrelated memory:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_hobby",
        userId: "u1",
        type: "PREFERENCE",
        key: "hobby",
        value: "Football",
        normalizedValue: "football",
        source: "EXPLICIT_USER",
        confidence: 0.95,
        importance: 70,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["sports"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_hobby",
      content: "Football",
      memoryType: "PREFERENCE",
      category: "hobby",
      confidence: 0.95,
      importance: 70,
      relevanceScore: 0.4,
      matchedSignals: [],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "Random match",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("math"),
      intent: createDummyIntent("CALCULATION"),
      retrieval: createDummyRetrieval([cand]),
      message: "Calculate 450 * 32.5",
    });

    assert(analysis.allowedMemories.length === 0, "Unrelated hobby memory not allowed in calculation");
    assert(analysis.internalOnlyMemories.length === 1, "Isolated to internalOnlyMemories");
  }

  // =========================================================================
  // TEST 25 — Latest explicit correction wins
  // =========================================================================
  console.log("\nTEST 25 — Latest explicit correction wins:");
  {
    const candOld: MemoryCandidate = {
      memory: {
        id: "mem_brand_old",
        userId: "u1",
        type: "PREFERENCE",
        key: "preference_laptop_brand",
        value: "ASUS",
        normalizedValue: "asus",
        source: "INFERRED",
        confidence: 0.8,
        importance: 70,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["laptop"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_brand_old",
      content: "ASUS",
      memoryType: "PREFERENCE",
      category: "preference_laptop_brand",
      confidence: 0.8,
      importance: 70,
      relevanceScore: 0.85,
      matchedSignals: ["brand"],
      source: "INFERRED",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "Brand match",
    };

    const candNew: MemoryCandidate = {
      memory: {
        id: "mem_brand_new",
        userId: "u1",
        type: "PREFERENCE",
        key: "preference_laptop_brand",
        value: "Lenovo",
        normalizedValue: "lenovo",
        source: "EXPLICIT_USER",
        confidence: 0.95,
        importance: 85,
        createdAt: baseTime + 10000,
        updatedAt: baseTime + 10000,
        lastAccessedAt: baseTime + 10000,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["laptop"],
        evidence: ["User said: I changed my mind, I want Lenovo"],
        version: 2,
      },
      memoryId: "mem_brand_new",
      content: "Lenovo",
      memoryType: "PREFERENCE",
      category: "preference_laptop_brand",
      confidence: 0.95,
      importance: 85,
      relevanceScore: 0.9,
      matchedSignals: ["brand"],
      source: "EXPLICIT_USER",
      createdAt: baseTime + 10000,
      updatedAt: baseTime + 10000,
      status: "ACTIVE",
      retrievalReason: "New brand match",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("laptops"),
      intent: createDummyIntent("RECOMMENDATION"),
      retrieval: createDummyRetrieval([candOld, candNew]),
      message: "Suggest a laptop for me",
    });

    assert(analysis.allowedMemories.length === 1, "Only 1 winning memory allowed");
    assert(analysis.allowedMemories[0].value === "Lenovo", "Winner is newer explicit Lenovo record");
    assert(analysis.suppressedMemories.some((m) => m.value === "ASUS"), "Older ASUS record suppressed in conflict governance");
  }

  // =========================================================================
  // TEST 26 — Unresolved conflict requires caution / clarification
  // =========================================================================
  console.log("\nTEST 26 — Unresolved conflict requires caution / clarification:");
  {
    const candA: MemoryCandidate = {
      memory: {
        id: "mem_lang_a",
        userId: "u1",
        type: "PREFERENCE",
        key: "preferred_programming_lang",
        value: "Python",
        normalizedValue: "python",
        source: "EXPLICIT_USER",
        confidence: 0.9,
        importance: 80,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["code"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_lang_a",
      content: "Python",
      memoryType: "PREFERENCE",
      category: "preferred_programming_lang",
      confidence: 0.9,
      importance: 80,
      relevanceScore: 0.9,
      matchedSignals: ["lang"],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "Lang match",
    };

    const candB: MemoryCandidate = {
      memory: {
        id: "mem_lang_b",
        userId: "u1",
        type: "PREFERENCE",
        key: "preferred_programming_lang",
        value: "TypeScript",
        normalizedValue: "typescript",
        source: "EXPLICIT_USER",
        confidence: 0.9,
        importance: 80,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["code"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_lang_b",
      content: "TypeScript",
      memoryType: "PREFERENCE",
      category: "preferred_programming_lang",
      confidence: 0.9,
      importance: 80,
      relevanceScore: 0.9,
      matchedSignals: ["lang"],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "Lang match",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("code"),
      intent: createDummyIntent("RECOMMENDATION"),
      retrieval: createDummyRetrieval([candA, candB]),
      message: "Which language framework should I use?",
    });

    assert(analysis.conflicts.length > 0, "Conflict detected and logged");
  }

  // =========================================================================
  // TEST 27 — Memory cannot override current hard constraint
  // =========================================================================
  console.log("\nTEST 27 — Memory cannot override current hard constraint:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_old_budget",
        userId: "u1",
        type: "PREFERENCE",
        key: "budget",
        value: "80,000 BDT",
        normalizedValue: "80000 bdt",
        source: "EXPLICIT_USER",
        confidence: 0.95,
        importance: 90,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 2,
        status: "ACTIVE",
        tags: ["budget"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_old_budget",
      content: "budget 80k BDT",
      memoryType: "PREFERENCE",
      category: "budget",
      confidence: 0.95,
      importance: 90,
      relevanceScore: 0.9,
      matchedSignals: ["budget"],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "Old budget",
    };

    const ctx = createDummyContext("laptops");
    const constraint: ConversationConstraint = {
      id: "c1",
      category: "budget",
      key: "budget",
      value: "100,000 BDT",
      rawText: "budget is 100k BDT",
      isOverridden: false,
      createdAt: baseTime,
      updatedAt: baseTime,
      updatedAtTurn: 2,
    };
    ctx.constraints.push(constraint);

    const analysis = memoryGovernanceEngine.evaluate({
      context: ctx,
      intent: createDummyIntent("RECOMMENDATION"),
      retrieval: createDummyRetrieval([cand]),
      message: "My budget is now 100k BDT, recommend something",
    });

    assert(analysis.allowedMemories.length === 0, "Old 80k memory blocked by active 100k constraint");
    assert(analysis.suppressedMemories[0].reasons.includes("HARD_CONSTRAINT_OVERRIDDEN"), "Reason is HARD_CONSTRAINT_OVERRIDDEN");
  }

  // =========================================================================
  // TEST 28 — Memory preference cannot become hard constraint in planning
  // =========================================================================
  console.log("\nTEST 28 — Memory preference cannot become hard constraint in planning:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_pref_oled",
        userId: "u1",
        type: "PREFERENCE",
        key: "preference_display",
        value: "OLED display",
        normalizedValue: "oled",
        source: "EXPLICIT_USER",
        confidence: 0.95,
        importance: 80,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["display"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_pref_oled",
      content: "OLED display",
      memoryType: "PREFERENCE",
      category: "preference_display",
      confidence: 0.95,
      importance: 80,
      relevanceScore: 0.9,
      matchedSignals: ["display"],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "Display pref",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("laptops"),
      intent: createDummyIntent("RECOMMENDATION"),
      retrieval: createDummyRetrieval([cand]),
      message: "Find me laptops under 60k",
    });

    assert(analysis.allowedMemories[0].canSupportFactualClaim === false, "canSupportFactualClaim is false");
    assert(
      analysis.directives.some((d) => d.includes("Do not treat it as a mandatory constraint")),
      "Directive generated to forbid treating preference as hard constraint"
    );
  }

  // =========================================================================
  // TEST 29 — Verified tool result overrides stale memory
  // =========================================================================
  console.log("\nTEST 29 — Verified tool result overrides stale memory:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_time_fact",
        userId: "u1",
        type: "FACT",
        key: "tokyo_time",
        value: "3:00 PM",
        normalizedValue: "3:00 pm",
        source: "SYSTEM",
        confidence: 0.9,
        importance: 30,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["time"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_time_fact",
      content: "tokyo time is 3:00 PM",
      memoryType: "FACT",
      category: "tokyo_time",
      confidence: 0.9,
      importance: 30,
      relevanceScore: 0.9,
      matchedSignals: ["time"],
      source: "SYSTEM",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "Time fact",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("time"),
      intent: createDummyIntent("REAL_TIME_INFORMATION"),
      retrieval: createDummyRetrieval([cand]),
      message: "What time is it in Tokyo right now?",
    });

    assert(analysis.allowedMemories.length === 0, "Stale time memory not allowed for live temporal query");
    assert(analysis.internalOnlyMemories[0].reasons.includes("VERIFIED_EVIDENCE_OVERRIDDEN"), "Reason is VERIFIED_EVIDENCE_OVERRIDDEN");
  }

  // =========================================================================
  // TEST 30 — Current user correction overrides old memory
  // =========================================================================
  console.log("\nTEST 30 — Current user correction overrides old memory:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_old_name",
        userId: "u1",
        type: "FACT",
        key: "user_nickname",
        value: "Johnny",
        normalizedValue: "johnny",
        source: "EXPLICIT_USER",
        confidence: 0.95,
        importance: 80,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["profile"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_old_name",
      content: "Johnny",
      memoryType: "FACT",
      category: "user_nickname",
      confidence: 0.95,
      importance: 80,
      relevanceScore: 0.9,
      matchedSignals: ["name"],
      source: "EXPLICIT_USER",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "ACTIVE",
      retrievalReason: "Name match",
    };

    const ctx = createDummyContext("profile");
    const constraint: ConversationConstraint = {
      id: "c2",
      category: "other",
      key: "user_nickname",
      value: "Alex",
      rawText: "call me Alex",
      isOverridden: false,
      createdAt: baseTime,
      updatedAt: baseTime,
      updatedAtTurn: 3,
    };
    ctx.constraints.push(constraint);

    const analysis = memoryGovernanceEngine.evaluate({
      context: ctx,
      intent: createDummyIntent("INFORMATION"),
      retrieval: createDummyRetrieval([cand]),
      message: "Actually call me Alex from now on",
    });

    assert(analysis.allowedMemories.length === 0, "Old nickname Johnny suppressed by active Alex correction");
    assert(analysis.suppressedMemories[0].reasons.includes("HARD_CONSTRAINT_OVERRIDDEN"), "Reason includes HARD_CONSTRAINT_OVERRIDDEN");
  }

  // =========================================================================
  // TEST 31 — Candidate marked as inferred
  // =========================================================================
  console.log("\nTEST 31 — Candidate marked as inferred:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_cand_gaming",
        userId: "u1",
        type: "CANDIDATE",
        key: "interest_gaming",
        value: "Cyberpunk 2077",
        normalizedValue: "cyberpunk 2077",
        source: "INFERRED",
        confidence: 0.70,
        importance: 60,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 2,
        status: "CANDIDATE",
        tags: ["gaming"],
        evidence: ["User asked about Cyberpunk specs"],
        version: 1,
      },
      memoryId: "mem_cand_gaming",
      content: "Cyberpunk 2077",
      memoryType: "CANDIDATE",
      category: "interest_gaming",
      confidence: 0.70,
      importance: 60,
      relevanceScore: 0.8,
      matchedSignals: ["gaming"],
      source: "INFERRED",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "CANDIDATE",
      retrievalReason: "Candidate match",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("gaming"),
      intent: createDummyIntent("RECOMMENDATION"),
      retrieval: createDummyRetrieval([cand]),
      message: "Recommend a gaming GPU",
    });

    assert(analysis.cautiousMemories.length === 1, "Candidate placed in cautiousMemories");
    assert(analysis.cautiousMemories[0].isCandidateInferred === true, "isCandidateInferred is true");
    assert(analysis.sanitizedMemoryContext.includes("[INFERRED USER INTEREST — NOT CONFIRMED]"), "Context marked with inferred tag");
  }

  // =========================================================================
  // TEST 32 — Candidate cannot establish factual certainty
  // =========================================================================
  console.log("\nTEST 32 — Candidate cannot establish factual certainty:");
  {
    const cand: MemoryCandidate = {
      memory: {
        id: "mem_cand_car",
        userId: "u1",
        type: "CANDIDATE",
        key: "owns_tesla",
        value: "Model 3",
        normalizedValue: "model 3",
        source: "INFERRED",
        confidence: 0.65,
        importance: 50,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "CANDIDATE",
        tags: ["cars"],
        evidence: [],
        version: 1,
      },
      memoryId: "mem_cand_car",
      content: "owns Tesla Model 3",
      memoryType: "CANDIDATE",
      category: "owns_tesla",
      confidence: 0.65,
      importance: 50,
      relevanceScore: 0.8,
      matchedSignals: ["tesla"],
      source: "INFERRED",
      createdAt: baseTime,
      updatedAt: baseTime,
      status: "CANDIDATE",
      retrievalReason: "Candidate inference",
    };

    const analysis = memoryGovernanceEngine.evaluate({
      context: createDummyContext("cars"),
      intent: createDummyIntent("INFORMATION"),
      retrieval: createDummyRetrieval([cand]),
      message: "How to charge my car?",
    });

    assert(analysis.cautiousMemories[0].canSupportFactualClaim === false, "Candidate canSupportFactualClaim is strictly false");
    assert(analysis.directives.some((d) => d.includes("Do not present it as an established fact")), "Directive forbids presenting candidate as established fact");
  }

  // =========================================================================
  // TEST 33 — BrainEngine receives governance analysis in pipeline
  // =========================================================================
  console.log("\nTEST 33 — BrainEngine receives governance analysis in pipeline:");
  {
    const testUserId = "user_gov_pipeline_test";
    memoryStore.clear(testUserId);

    // Save a confirmed preference into MemoryStore
    memoryStore.save(testUserId, {
      id: "mem_fav_editor",
      userId: testUserId,
      type: "PREFERENCE",
      key: "preference_code_editor",
      value: "Neovim",
      normalizedValue: "neovim",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 90,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["dev", "editor"],
      evidence: ["User said: I love Neovim"],
      version: 1,
    });

    const brainAnalysis = brainEngine.analyze(
      "Which code editor do I use?",
      [],
      undefined,
      testUserId,
      undefined,
      { persistDecisions: false, currentTime: baseTime }
    );

    assert(brainAnalysis.memoryGovernanceAnalysis !== undefined, "BrainEngine output contains memoryGovernanceAnalysis");
    assert(brainAnalysis.memoryGovernanceAnalysis?.memoryInfluenceAllowed === true, "Memory influence allowed in brain analysis");
    assert(
      brainAnalysis.memoryGovernanceAnalysis?.allowedMemories.length === 1 ||
      brainAnalysis.memoryGovernanceAnalysis?.cautiousMemories.length === 1,
      "Neovim memory evaluated and admitted into memory context"
    );
    assert(
      brainAnalysis.memoryGovernanceAnalysis?.sanitizedMemoryContext.includes("Neovim") === true,
      "Sanitized memory context contains Neovim"
    );
  }

  // =========================================================================
  // TEST 34 — Clean directives reach response generation
  // =========================================================================
  console.log("\nTEST 34 — Clean directives reach response generation:");
  {
    const testUserId = "user_gov_directives_test";
    memoryStore.clear(testUserId);

    memoryStore.save(testUserId, {
      id: "mem_gpu_pref",
      userId: testUserId,
      type: "PREFERENCE",
      key: "preference_gpu",
      value: "NVIDIA RTX 4080",
      normalizedValue: "nvidia rtx 4080",
      source: "EXPLICIT_USER",
      confidence: 0.95,
      importance: 85,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["hardware"],
      evidence: [],
      version: 1,
    });

    const brainAnalysis = brainEngine.analyze(
      "Suggest a gaming PC build",
      [],
      undefined,
      testUserId,
      undefined,
      { persistDecisions: false, currentTime: baseTime }
    );

    assert(
      brainAnalysis.promptDirectives.some((d) => d.includes("personalization factor")),
      "Prompt directives contains executive memory usage directive"
    );
  }

  // =========================================================================
  // TEST 35 — Raw memory objects & private IDs not injected into prompt
  // =========================================================================
  console.log("\nTEST 35 — Raw memory objects & private IDs not injected into prompt:");
  {
    const testUserId = "user_gov_sanitized_test";
    memoryStore.clear(testUserId);

    const internalId = "mem_internal_secret_uuid_9999";
    memoryStore.save(testUserId, {
      id: internalId,
      userId: testUserId,
      type: "PREFERENCE",
      key: "favorite_fruit",
      value: "Mango",
      normalizedValue: "mango",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 70,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["food"],
      evidence: [],
      version: 1,
    });

    const brainAnalysis = brainEngine.analyze(
      "What is my favorite fruit?",
      [],
      undefined,
      testUserId,
      undefined,
      { persistDecisions: false, currentTime: baseTime }
    );

    const sanitizedContext = brainAnalysis.memoryGovernanceAnalysis?.sanitizedMemoryContext || "";
    assert(sanitizedContext.includes("Mango"), "Sanitized context contains user value Mango");
    assert(!sanitizedContext.includes(internalId), "Sanitized context NEVER leaks raw internal memory ID");
    assert(!sanitizedContext.includes("normalizedValue"), "Sanitized context does not leak raw object properties");
  }

  console.log("\n==========================================");
  console.log("ALL 35 MEMORY GOVERNANCE TESTS PASSED!");
  console.log("==========================================");
}

runTests();
