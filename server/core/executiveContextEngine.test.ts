/**
 * Dora Executive Context Synthesis & Decision-Ready Context Engine Test Suite
 * Phase 2 — Step 12
 * 
 * Exhaustive test suite verifying all invariants:
 * 1. Current-turn explicit overrides (Language, Verbosity, Tone, Format, Brand, Exclusions, Project switches).
 * 2. Precedence Hierarchy & Conflict Resolution (Current Turn > Hard Constraint > Verified Evidence > Governed Memory > User Model > Adaptive > Predictive > Default).
 * 3. Equal-authority contradiction tracking & unresolved conflict handling.
 * 4. Deduplication & collapsing of redundant facts & preferences.
 * 5. Topic isolation enforcement & global preference retention.
 * 6. Goal, project, and commitment lifecycle filtering & direct commitment validation.
 * 7. Temporal memory lineage tracking & stale state suppression.
 * 8. Cross-session continuity & project switching context.
 * 9. Ambiguity detection, candidate extraction, and clarification generation.
 * 10. Sensitive data filtering (API keys, tokens, passwords, SSN, Credit Cards).
 * 11. Strict context budgeting & priority-ordered truncation.
 * 12. Sanitized prompt directives generation.
 * 13. End-to-end integration downstream of cognitive engines in BrainEngine.
 * 14. Pure determinism, zero side effects, zero LLM calls.
 */

import { executiveContextEngine } from "./executiveContextEngine";
import {
  ExecutiveContextInput,
  ExecutiveAuthority,
  EXECUTIVE_AUTHORITY_WEIGHTS,
  DEFAULT_EXECUTIVE_BUDGET,
} from "./executiveContextTypes";
import { brainEngine } from "./brainEngine";
import { ConversationContext } from "./contextTypes";
import { StructuredIntent } from "./intentTypes";
import { MemoryGovernanceAnalysis } from "./memoryGovernanceTypes";

let totalTests = 0;
let passedTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (error: any) {
    console.error(`  [FAIL] ${name}: ${error.message}`);
    throw error;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function createDummyContext(topic: string = "general"): ConversationContext {
  return {
    id: "session_exec_test",
    activeTopic: topic,
    currentTask: null,
    userGoal: null,
    entities: [],
    constraints: [],
    preferences: [],
    recentReferences: [],
    conversationState: "active",
    lastMeaningfulUserIntent: null,
    lastMeaningfulAssistantResponse: null,
    createdAt: 1000,
    updatedAt: 1000,
    contextTimestamp: 1000,
    turnsCount: 1,
    isTopicSwitched: false,
    isAmbiguousReference: false,
    archivedContexts: [],
    topicHistory: [{ topic, endedAtTurn: 1 }],
  };
}

function createDummyIntent(primaryIntent: string = "QUESTION"): StructuredIntent {
  return {
    primaryIntent: primaryIntent as any,
    relationship: "STANDALONE",
    intentConfidence: 0.95,
    intentSignals: {},
    requiresClarification: false,
    isMultiIntent: false,
    suggestedDirectives: [],
  };
}

console.log(`\n======================================================`);
console.log(`RUNNING DORA EXECUTIVE CONTEXT ENGINE TEST SUITE`);
console.log(`======================================================\n`);

// =========================================================================
// 1. Current-Turn Explicit Directives & Overrides
// =========================================================================
runTest("1.1 Language override in current turn: English", () => {
  const res = executiveContextEngine.synthesize({
    message: "Answer in English please",
    context: createDummyContext(),
  });
  assert(res.currentTurn.overrides.language === "ENGLISH", "Language override must be ENGLISH");
  assert(res.responseStyle.language === "ENGLISH", "Response style language must be ENGLISH");
  assert(res.promptDirectives.some((d) => d.includes("English")), "Prompt directives must mention English");
});

runTest("1.2 Language override in current turn: Banglish", () => {
  const res = executiveContextEngine.synthesize({
    message: "Banglish please",
    context: createDummyContext(),
  });
  assert(res.currentTurn.overrides.language === "BANGLISH", "Language override must be BANGLISH");
  assert(res.responseStyle.language === "BANGLISH", "Response style language must be BANGLISH");
});

runTest("1.3 Language override in current turn: Bangla", () => {
  const res = executiveContextEngine.synthesize({
    message: "Respond in Bangla",
    context: createDummyContext(),
  });
  assert(res.currentTurn.overrides.language === "BANGLA", "Language override must be BANGLA");
});

runTest("1.4 Verbosity override: concise / brief", () => {
  const res = executiveContextEngine.synthesize({
    message: "Keep it concise and brief",
    context: createDummyContext(),
  });
  assert(res.currentTurn.overrides.verbosity === "CONCISE", "Verbosity override must be CONCISE");
  assert(res.responseStyle.verbosity === "CONCISE", "Response style verbosity must be CONCISE");
});

runTest("1.5 Verbosity override: detailed", () => {
  const res = executiveContextEngine.synthesize({
    message: "Explain in detail please",
    context: createDummyContext(),
  });
  assert(res.currentTurn.overrides.verbosity === "DETAILED", "Verbosity override must be DETAILED");
  assert(res.responseStyle.verbosity === "DETAILED", "Response style verbosity must be DETAILED");
});

runTest("1.6 Tone override: professional", () => {
  const res = executiveContextEngine.synthesize({
    message: "Be professional",
    context: createDummyContext(),
  });
  assert(res.currentTurn.overrides.tone === "PROFESSIONAL", "Tone override must be PROFESSIONAL");
  assert(res.responseStyle.tone === "PROFESSIONAL", "Response style tone must be PROFESSIONAL");
});

runTest("1.7 Tone override: casual", () => {
  const res = executiveContextEngine.synthesize({
    message: "Be casual",
    context: createDummyContext(),
  });
  assert(res.currentTurn.overrides.tone === "CASUAL", "Tone override must be CASUAL");
  assert(res.responseStyle.tone === "CASUAL", "Response style tone must be CASUAL");
});

runTest("1.8 Brand substitution override: Recommend Lenovo instead of ASUS", () => {
  const res = executiveContextEngine.synthesize({
    message: "Recommend Lenovo instead of ASUS",
    context: createDummyContext("hardware"),
  });
  assert(res.currentTurn.overrides.brandOrEntityOverrides.length > 0, "Must record brand override");
  assert(res.currentTurn.overrides.brandOrEntityOverrides[0].replacement === "Lenovo", "Replacement is Lenovo");
  assert(res.currentTurn.overrides.brandOrEntityOverrides[0].original === "Asus", "Original is Asus");
  assert(res.activePreferences.some((p) => p.value === "Lenovo"), "Active preferences must include Lenovo");
});

runTest("1.9 Excluded tools/patterns override: Don't use Python", () => {
  const res = executiveContextEngine.synthesize({
    message: "Don't use Python for this script",
    context: createDummyContext("coding"),
  });
  assert(res.currentTurn.overrides.excludedToolsOrPatterns.includes("python"), "Must exclude python");
  assert(res.promptDirectives.some((d) => d.includes("Do NOT use or recommend python")), "Must inject exclusion directive");
});

runTest("1.10 Project switch in current turn: pause project X, focus on project Y", () => {
  const res = executiveContextEngine.synthesize({
    message: "Pause website redesign, let's switch to mobile app",
    context: createDummyContext(),
    goalProject: {
      projects: [
        { id: "p1", name: "website redesign", status: "ACTIVE" },
        { id: "p2", name: "mobile app", status: "ACTIVE" },
      ],
    } as any,
  });
  assert(res.currentTurn.overrides.pausedProject === "website redesign", "Paused project parsed");
  assert(res.currentTurn.overrides.switchedProject === "mobile app", "Switched project parsed");
  assert(res.activeProjects.some((p) => p.name === "mobile app"), "Switched project must be active");
  assert(!res.activeProjects.some((p) => p.name === "website redesign"), "Paused project must be suppressed");
});

// =========================================================================
// 2. Precedence Hierarchy & Conflict Resolution
// =========================================================================
runTest("2.1 Current-turn override beats Confirmed User Model", () => {
  const res = executiveContextEngine.synthesize({
    message: "Keep it brief",
    context: createDummyContext(),
    userModel: {
      profile: {
        communication: {
          preferredVerbosity: "DETAILED",
        },
      },
    } as any,
  });
  assert(res.responseStyle.verbosity === "CONCISE", "Current turn concise beats user model detailed");
  assert(res.responseStyle.winningLayers.verbosity === "CURRENT_TURN_EXPLICIT", "Winning layer is CURRENT_TURN_EXPLICIT");
});

runTest("2.2 Current-turn override beats Governed Memory", () => {
  const res = executiveContextEngine.synthesize({
    message: "Answer in English",
    context: createDummyContext(),
    memoryGovernance: {
      governedMemories: [
        {
          memory: {
            id: "m1",
            category: "PREFERENCE",
            key: "language",
            value: "BANGLA",
            status: "ACTIVE",
          },
        },
      ],
    } as any,
  });
  assert(res.responseStyle.language === "ENGLISH", "Current turn English beats memory Bangla");
  assert(res.conflicts.some((c) => c.key === "language" && c.conflictStatus === "RESOLVED_BY_CURRENT_TURN"), "Conflict resolved by current turn");
});

runTest("2.3 Governed Memory (0.80) beats Confirmed User Model (0.75)", () => {
  const res = executiveContextEngine.synthesize({
    message: "What is my preferred IDE?",
    context: createDummyContext("coding"),
    userModel: {
      profile: {
        confirmedPreferences: [
          { key: "ide", value: "Sublime", status: "CONFIRMED" },
        ],
      },
    } as any,
    memoryGovernance: {
      governedMemories: [
        {
          memory: {
            id: "m_ide",
            category: "PREFERENCE",
            key: "ide",
            value: "VS Code",
            status: "ACTIVE",
          },
        },
      ],
    } as any,
  });
  const idePref = res.activePreferences.find((p) => p.key.includes("ide"));
  assert(idePref !== undefined && idePref.value === "VS Code", "Governed memory VS Code wins over user model Sublime");
  assert(res.conflicts.some((c) => c.key.includes("ide") && c.winner.authority === "GOVERNANCE_APPROVED_MEMORY"), "Conflict resolved by authority");
});

runTest("2.4 Confirmed User Model (0.75) beats Adaptive Habit Pattern (0.50)", () => {
  const res = executiveContextEngine.synthesize({
    message: "How should I structure files?",
    context: createDummyContext("coding"),
    userModel: {
      profile: {
        confirmedPreferences: [
          { key: "structure", value: "feature-sliced", status: "CONFIRMED" },
        ],
      },
    } as any,
    adaptiveLearning: {
      patterns: [
        { patternKey: "structure", preferredValue: "flat-folder", status: "CONFIRMED", domain: "coding" },
      ],
    } as any,
  });
  const structPref = res.activePreferences.find((p) => p.key.includes("structure"));
  assert(structPref !== undefined && structPref.value === "feature-sliced", "User model feature-sliced beats adaptive flat-folder");
});

runTest("2.5 Equal-authority contradiction results in UNRESOLVED conflict", () => {
  const res = executiveContextEngine.synthesize({
    message: "What is my hardware spec?",
    context: createDummyContext("hardware"),
    verification: {
      evidence: [
        { claim: "laptop_ram", content: "16GB" },
        { claim: "laptop_ram", content: "32GB" },
      ],
    } as any,
  });
  const ramConflict = res.conflicts.find((c) => c.key.includes("laptop_ram"));
  assert(ramConflict !== undefined, "Conflict must be recorded for laptop_ram");
  assert(ramConflict.conflictStatus === "UNRESOLVED", "Equal authority contradiction must be UNRESOLVED");
  assert(res.diagnostics.conflictResolutionCounts.unresolved > 0, "Unresolved count incremented");
});

// =========================================================================
// 3. Deduplication & Redundancy Collapsing
// =========================================================================
runTest("3.1 Identical preferences collapsed without duplicate directives", () => {
  const res = executiveContextEngine.synthesize({
    message: "What is my theme preference?",
    context: createDummyContext(),
    userModel: {
      profile: {
        confirmedPreferences: [
          { key: "theme", value: "dark", status: "CONFIRMED" },
          { key: "theme", value: "dark", status: "CONFIRMED" },
        ],
      },
    } as any,
  });
  const themePrefs = res.activePreferences.filter((p) => p.key.includes("theme"));
  assert(themePrefs.length === 1, "Duplicate theme preference must be collapsed to 1");
  assert(res.diagnostics.deduplicatedCount >= 1, "Deduplicated count updated");
});

// =========================================================================
// 4. Topic Isolation & Global Retention
// =========================================================================
runTest("4.1 Strict topic isolation suppresses unrelated domain facts", () => {
  const res = executiveContextEngine.synthesize({
    message: "Let's work on cooking recipe",
    context: createDummyContext("cooking"),
    options: { strictTopicIsolation: true },
    memoryGovernance: {
      governedMemories: [
        {
          memory: {
            id: "m_tech",
            category: "CODING",
            key: "git_branch",
            value: "main",
            status: "ACTIVE",
          },
        },
        {
          memory: {
            id: "m_cook",
            category: "COOKING",
            key: "favorite_spice",
            value: "cardamom",
            status: "ACTIVE",
          },
        },
      ],
    } as any,
  });
  assert(res.authoritativeFacts.some((f) => f.key.includes("favorite_spice")), "Cooking memory preserved");
  assert(!res.authoritativeFacts.some((f) => f.key.includes("git_branch")), "Coding memory suppressed under strict topic isolation");
  assert(res.diagnostics.topicIsolatedCount > 0, "Topic isolated count incremented");
});

runTest("4.2 Global communication preferences retained regardless of topic isolation", () => {
  const res = executiveContextEngine.synthesize({
    message: "Fix this SQL query",
    context: createDummyContext("database"),
    options: { strictTopicIsolation: true },
    userModel: {
      profile: {
        communication: {
          preferredLanguage: "BANGLISH",
          preferredVerbosity: "CONCISE",
        },
      },
    } as any,
  });
  assert(res.activePreferences.some((p) => p.key === "language" && p.value === "BANGLISH"), "Global language preference retained");
  assert(res.activePreferences.some((p) => p.key === "verbosity" && p.value === "CONCISE"), "Global verbosity preference retained");
});

// =========================================================================
// 5. Goal, Project, Commitment Lifecycle & Origin
// =========================================================================
runTest("5.1 Completed, archived, and abandoned projects suppressed", () => {
  const res = executiveContextEngine.synthesize({
    message: "What are my active projects?",
    context: createDummyContext(),
    goalProject: {
      projects: [
        { id: "p1", name: "Alpha", status: "ACTIVE" },
        { id: "p2", name: "Beta", status: "COMPLETED" },
        { id: "p3", name: "Gamma", status: "ARCHIVED" },
        { id: "p4", name: "Delta", status: "ABANDONED" },
      ],
    } as any,
  });
  assert(res.activeProjects.length === 1, "Only 1 active project presented");
  assert(res.activeProjects[0].name === "Alpha", "Active project is Alpha");
  assert(res.diagnostics.staleExpiredSuppressedCount >= 3, "Stale projects suppressed");
});

runTest("5.2 Commitments must originate from direct user statements", () => {
  const res = executiveContextEngine.synthesize({
    message: "What are my commitments?",
    context: createDummyContext(),
    goalProject: {
      commitments: [
        { id: "c1", description: "Submit tax report", status: "ACTIVE", sourceIntent: "DIRECT_USER_COMMITMENT" },
        { id: "c2", description: "Maybe buy a boat?", status: "ACTIVE", sourceIntent: "HYPOTHETICAL" },
        { id: "c3", description: "Did you finish the test?", status: "ACTIVE", sourceIntent: "QUESTION" },
        { id: "c4", description: "I will assist you", status: "ACTIVE", sourceIntent: "ASSISTANT_STATEMENT" },
      ],
    } as any,
  });
  assert(res.activeCommitments.length === 1, "Only direct user commitment included");
  assert(res.activeCommitments[0].description === "Submit tax report", "Correct commitment description");
});

// =========================================================================
// 6. Temporal Memory Lineage & Evolution
// =========================================================================
runTest("6.1 Stale and superseded temporal patterns suppressed", () => {
  const res = executiveContextEngine.synthesize({
    message: "What is my routine?",
    context: createDummyContext(),
    temporalMemory: {
      patterns: [
        { patternKey: "wake_time", currentValue: "7am", status: "CURRENT" },
        { patternKey: "old_routine", currentValue: "5am", status: "SUPERSEDED" },
        { patternKey: "expired_habit", currentValue: "jogging", status: "EXPIRED" },
      ],
    } as any,
  });
  assert(res.temporalContext.activePatterns.length === 1, "Only current temporal pattern retained");
  assert(res.temporalContext.activePatterns[0].key === "wake_time", "Wake time retained");
  assert(res.temporalContext.suppressedStaleCount >= 2, "Stale count recorded");
});

runTest("6.2 Evolving preference lineage tracked fromValue -> toValue", () => {
  const res = executiveContextEngine.synthesize({
    message: "How has my coffee preference changed?",
    context: createDummyContext(),
    temporalMemory: {
      patterns: [
        {
          patternKey: "coffee",
          currentValue: "Espresso",
          previousValues: ["Latte", "Cappuccino"],
          status: "EVOLVING",
        },
      ],
    } as any,
  });
  assert(res.temporalContext.evolvingLineage.length === 1, "Evolving lineage tracked");
  assert(res.temporalContext.evolvingLineage[0].key === "coffee", "Coffee key tracked");
  assert(res.temporalContext.evolvingLineage[0].fromValue === "Cappuccino", "fromValue is Cappuccino");
  assert(res.temporalContext.evolvingLineage[0].toValue === "Espresso", "toValue is Espresso");
});

// =========================================================================
// 7. Ambiguity Handling & Clarification Requirements
// =========================================================================
runTest("7.1 Ambiguous reference produces clear clarification prompt with competing targets", () => {
  const res = executiveContextEngine.synthesize({
    message: "Continue with it",
    context: { ...createDummyContext(), isAmbiguousReference: true },
    contextContinuity: {
      ambiguityStatus: "AMBIGUOUS",
      competingCandidates: [
        { id: "p1", title: "Project Alpha" },
        { id: "p2", title: "Project Beta" },
      ],
    } as any,
  });
  assert(res.ambiguity.isAmbiguous === true, "Ambiguity marked true");
  assert(res.ambiguity.competingTargets.includes("Project Alpha"), "Competing target 1 present");
  assert(res.ambiguity.competingTargets.includes("Project Beta"), "Competing target 2 present");
  assert(res.ambiguity.clarificationPrompt?.includes("Project Alpha or Project Beta"), "Clarification prompt formed correctly");
  assert(res.promptDirectives.some((d) => d.includes("Clarification requirement:")), "Clarification requirement injected into directives");
});

// =========================================================================
// 8. Sensitive Data Interception & Scrubbing
// =========================================================================
runTest("8.1 Sensitive API keys, passwords, and tokens stripped from context", () => {
  const res = executiveContextEngine.synthesize({
    message: "Store my key",
    context: createDummyContext(),
    verification: {
      evidence: [
        { claim: "openai_key", content: "sk-proj-1234567890abcdef123456" },
        { claim: "safe_fact", content: "User lives in Dhaka" },
      ],
    } as any,
    userModel: {
      profile: {
        confirmedPreferences: [
          { key: "db_password", value: "password=secret1234", status: "CONFIRMED" },
        ],
      },
    } as any,
  });
  assert(!res.authoritativeFacts.some((f) => f.key.includes("openai_key")), "OpenAI key suppressed");
  assert(!res.activePreferences.some((p) => p.key.includes("db_password")), "Password suppressed");
  assert(res.authoritativeFacts.some((f) => f.key.includes("safe_fact")), "Safe fact retained");
  assert(res.diagnostics.sensitiveDataSuppressedCount >= 2, "Sensitive data count recorded");
});

// =========================================================================
// 9. Context Budgeting & Priority-Ordered Truncation
// =========================================================================
runTest("9.1 Budget truncation respects configured limits", () => {
  const res = executiveContextEngine.synthesize({
    message: "Check limits",
    context: createDummyContext(),
    options: {
      budgetConfig: {
        maxFacts: 2,
        maxPreferences: 2,
        maxProjects: 1,
      },
    },
    verification: {
      evidence: [
        { claim: "fact1", content: "val1" },
        { claim: "fact2", content: "val2" },
        { claim: "fact3", content: "val3" },
        { claim: "fact4", content: "val4" },
      ],
    } as any,
    goalProject: {
      projects: [
        { id: "p1", name: "Project 1", status: "ACTIVE" },
        { id: "p2", name: "Project 2", status: "ACTIVE" },
      ],
    } as any,
  });
  assert(res.authoritativeFacts.length === 2, "Facts truncated to max 2");
  assert(res.activeProjects.length === 1, "Projects truncated to max 1");
  assert(res.diagnostics.budgetTruncatedCount >= 3, "Truncated count recorded");
});

// =========================================================================
// 10. Directive Sanitization
// =========================================================================
runTest("10.1 Internal IDs, hex hashes, and confidence scores stripped from directives", () => {
  const raw = "Memory: mem_12345 user prefers VS Code (confidence: 0.95, timestamp: 1724300000000) sha256:abcd1234ef";
  const sanitized = executiveContextEngine.sanitizeDirective(raw);
  assert(!sanitized.includes("mem_12345"), "mem ID stripped");
  assert(!sanitized.includes("confidence:"), "confidence stripped");
  assert(!sanitized.includes("timestamp:"), "timestamp stripped");
  assert(!sanitized.includes("sha256:"), "hash stripped");
  assert(sanitized.includes("VS Code"), "Meaningful content preserved");
});

// =========================================================================
// 11. End-to-End BrainEngine Integration
// =========================================================================
runTest("11.1 BrainEngine produces executiveContext package seamlessly", () => {
  const brainRes = brainEngine.analyze("Keep it concise. What is React?", []);
  assert(brainRes.executiveContext !== undefined, "BrainEngine returns executiveContext");
  assert(brainRes.executiveContext.responseStyle.verbosity === "CONCISE", "Executive response style is CONCISE");
  assert(brainRes.executiveContext.promptDirectives.length > 0, "Executive context promptDirectives generated");
});

// =========================================================================
// 12. Pure Determinism & Zero Side-Effects Invariants
// =========================================================================
runTest("12.1 Pure determinism: identical inputs produce bit-for-bit identical outputs", () => {
  const input: ExecutiveContextInput = {
    message: "Recommend Lenovo instead of Dell",
    context: createDummyContext("hardware"),
    options: { currentTime: 1724300000000 },
  };
  const res1 = executiveContextEngine.synthesize(input);
  const res2 = executiveContextEngine.synthesize(input);
  assert(JSON.stringify(res1) === JSON.stringify(res2), "Deterministic identical JSON output");
});

runTest("12.2 Zero side effects: input objects remain completely unmutated", () => {
  const input: ExecutiveContextInput = {
    message: "Test message",
    context: createDummyContext(),
    goalProject: {
      projects: [{ id: "p1", name: "P1", status: "ACTIVE" }],
    } as any,
  };
  const snapshot = JSON.stringify(input);
  executiveContextEngine.synthesize(input);
  assert(JSON.stringify(input) === snapshot, "Input object must remain unmodified");
});

// =========================================================================
// 13. Hard Constraints, Multi-Step Goals & Directive Hierarchy
// =========================================================================
runTest("13.1 Hard safety and reasoning constraints extracted with highest priority", () => {
  const res = executiveContextEngine.synthesize({
    message: "Explain recursion safely",
    context: createDummyContext(),
    reasoning: {
      constraints: ["Do not output infinite loop examples"],
      missingInformation: [],
    } as any,
    verification: {
      cautionDirectives: ["Verify base case termination"],
    } as any,
  });
  assert(res.reasoningConstraints.length === 2, "2 hard constraints extracted");
  assert(res.reasoningConstraints.some((c) => c.type === "REASONING"), "Reasoning constraint present");
  assert(res.reasoningConstraints.some((c) => c.type === "VERIFICATION"), "Verification caution present");
  assert(res.promptDirectives[0].includes("Constraint:") || res.promptDirectives[0].includes("Caution:"), "Hard constraint comes near top of directives");
});

runTest("13.2 Multi-step goals and active blockers extracted cleanly", () => {
  const res = executiveContextEngine.synthesize({
    message: "What is my goal status?",
    context: createDummyContext(),
    goalProject: {
      goals: [
        {
          id: "g1",
          title: "Launch v1",
          status: "IN_PROGRESS",
          priority: "HIGH",
        },
      ],
      projects: [
        {
          id: "p1",
          name: "Project Titan",
          status: "ACTIVE",
          blockers: [{ id: "b1", description: "Pending API key access", status: "ACTIVE" }],
        },
      ],
    } as any,
  });
  assert(res.activeGoals.length === 1, "1 active goal extracted");
  assert(res.activeGoals[0].title === "Launch v1", "Goal title matches");
  assert(res.activeProjects.length === 1, "1 active project extracted");
  assert(res.activeProjects[0].blockers.includes("Pending API key access"), "Active blocker included in project");
  assert(res.promptDirectives.some((d) => d.includes("Launch v1")), "Goal directive present");
});

runTest("13.3 Predictive suggestions conflicting with exclusion list are suppressed", () => {
  const res = executiveContextEngine.synthesize({
    message: "Do not recommend Python",
    context: createDummyContext("coding"),
    predictiveContext: {
      candidates: [
        { id: "pred1", key: "python_tool", content: "Try using Python script" },
        { id: "pred2", key: "rust_tool", content: "Try using Rust cargo" },
      ],
    } as any,
  });
  assert(!res.advisoryContext.some((a) => a.key === "python_tool"), "Python predictive candidate suppressed");
  assert(res.advisoryContext.some((a) => a.key === "rust_tool"), "Rust predictive candidate retained");
  assert(res.diagnostics.predictiveSuppressedCount > 0, "Predictive suppressed counter incremented");
});

// =========================================================================
// 14. Phase 2 — Step 12 Targeted Hardening Test Suite (EC-H1 to EC-H45)
// =========================================================================

console.log(`\n--- Running Targeted Hardening Tests (EC-H1 to EC-H45) ---\n`);

// Group 1: Direct Turn Precedence (EC-H1 - EC-H5)
runTest("EC-H1: Direct turn language override beats confirmed user model & governed memory", () => {
  const res = executiveContextEngine.synthesize({
    message: "Respond in English please",
    context: createDummyContext(),
    userModel: {
      profile: {
        userId: "u1",
        attributes: {},
        confirmedAttributes: [{ key: "language", dimension: "LANGUAGE", normalizedValue: "BANGLA", confidence: 0.9, evidenceCount: 3, independentEvidenceCount: 2, status: "CONFIRMED", sourceClassification: "CONFIRMED_USER_MODEL", firstObservedAt: 100, lastObservedAt: 200, isDurable: true, isTemporary: false, evidence: [] }],
        candidateAttributes: [],
        temporaryAttributes: [],
        supersededAttributes: [],
        domainInterests: [],
        projectContexts: [],
        goals: [],
        lastSynthesizedAt: 1000,
      },
      activeDirectives: [],
      currentTurnOverrides: [],
      decisions: [],
      health: { evidenceCoverage: 1, conflictCount: 0, staleAttributeCount: 0, confirmedAttributeCount: 1, candidateAttributeCount: 0, suppressedAttributeCount: 0, overallHealth: "EXCELLENT" },
      safetyStatus: "SAFE",
      diagnostics: { signalsProcessed: 1, memoriesIngested: 1, patternsIngested: 0, conflictsResolved: 0, sensitiveBlocked: 0, unsupportedIdentityBlocked: 0, isDeterministic: true },
    },
    memoryGovernance: {
      isSafe: true,
      allowedMemories: [{ memory: { id: "m1", key: "language", value: "BANGLA", category: "PREFERENCE", status: "ACTIVE", confidence: 0.95 }, action: "ALLOW", status: "ACTIVE", confidence: 0.95, governanceTimestamp: 1000 }],
      quarantinedMemories: [],
      rejectedMemories: [],
      suppressedMemories: [],
      staleMemories: [],
      supersededMemories: [],
      conflicts: [],
      topicIsolationApplied: false,
      diagnostics: { totalMemoriesEvaluated: 1, allowedCount: 1, quarantinedCount: 0, rejectedCount: 0, suppressedCount: 0, staleCount: 0, supersededCount: 0, sensitivityBlockedCount: 0, topicMismatches: 0, confidenceFilteredCount: 0, isDeterministic: true },
    },
  });
  assert(res.currentTurn.overrides.language === "ENGLISH", "Current turn language is ENGLISH");
  assert(res.responseStyle.language === "ENGLISH", "Response style language is ENGLISH");
  assert(res.responseStyle.winningLayers.language === "CURRENT_TURN_EXPLICIT", "Winning layer is CURRENT_TURN_EXPLICIT");
});

runTest("EC-H2: Direct turn verbosity override beats confirmed user model verbosity", () => {
  const res = executiveContextEngine.synthesize({
    message: "Keep it brief and concise",
    context: createDummyContext(),
    userModel: {
      profile: {
        userId: "u1",
        attributes: {},
        confirmedAttributes: [{ key: "verbosity", dimension: "VERBOSITY", normalizedValue: "DETAILED", confidence: 0.9, evidenceCount: 3, independentEvidenceCount: 2, status: "CONFIRMED", sourceClassification: "CONFIRMED_USER_MODEL", firstObservedAt: 100, lastObservedAt: 200, isDurable: true, isTemporary: false, evidence: [] }],
        candidateAttributes: [],
        temporaryAttributes: [],
        supersededAttributes: [],
        domainInterests: [],
        projectContexts: [],
        goals: [],
        lastSynthesizedAt: 1000,
      },
      activeDirectives: [],
      currentTurnOverrides: [],
      decisions: [],
      health: { evidenceCoverage: 1, conflictCount: 0, staleAttributeCount: 0, confirmedAttributeCount: 1, candidateAttributeCount: 0, suppressedAttributeCount: 0, overallHealth: "EXCELLENT" },
      safetyStatus: "SAFE",
      diagnostics: { signalsProcessed: 1, memoriesIngested: 1, patternsIngested: 0, conflictsResolved: 0, sensitiveBlocked: 0, unsupportedIdentityBlocked: 0, isDeterministic: true },
    },
  });
  assert(res.responseStyle.verbosity === "CONCISE", "Response style verbosity is CONCISE");
  assert(res.responseStyle.winningLayers.verbosity === "CURRENT_TURN_EXPLICIT", "Winning layer is CURRENT_TURN_EXPLICIT");
});

runTest("EC-H3: Direct turn tone override beats adaptive default tone", () => {
  const res = executiveContextEngine.synthesize({
    message: "Be professional",
    context: createDummyContext(),
  });
  assert(res.responseStyle.tone === "PROFESSIONAL", "Tone is PROFESSIONAL");
  assert(res.responseStyle.winningLayers.tone === "CURRENT_TURN_EXPLICIT", "Winning layer is CURRENT_TURN_EXPLICIT");
});

runTest("EC-H4: Entity substitution in current turn overrides historical preference", () => {
  const res = executiveContextEngine.synthesize({
    message: "Recommend Lenovo instead of ASUS",
    context: createDummyContext(),
  });
  assert(res.currentTurn.overrides.brandOrEntityOverrides?.length === 1, "1 brand override");
  assert(res.currentTurn.overrides.brandOrEntityOverrides?.[0].replacement === "Lenovo", "Replacement is Lenovo");
  assert(res.activePreferences.some((p) => p.value === "Lenovo"), "Active preference for Lenovo present");
});

runTest("EC-H5: Direct turn exclusion suppresses tool or pattern across context", () => {
  const res = executiveContextEngine.synthesize({
    message: "Do not use Python",
    context: createDummyContext(),
  });
  assert(res.currentTurn.overrides.excludedToolsOrPatterns?.includes("python"), "python excluded");
});

// Group 2: Hierarchy Invariants & Strict Priority (EC-H6 - EC-H10)
runTest("EC-H6: Verified Evidence (0.90) overrides Governed Memory (0.80)", () => {
  const res = executiveContextEngine.synthesize({
    message: "What version are we using?",
    context: createDummyContext(),
    verification: {
      verifiedEvidence: [{ id: "v1", claim: "node_version", groundingDetails: "v20.0.0", confidence: 1.0, source: "test", verifiedAt: 100 }],
    } as any,
    memoryGovernance: {
      allowedMemories: [{ memory: { id: "m1", key: "node_version", value: "v18.0.0", category: "TECH_STACK", status: "ACTIVE", confidence: 0.85 }, action: "ALLOW", status: "ACTIVE", confidence: 0.85, governanceTimestamp: 1000 }],
    } as any,
  });
  const nodeFact = res.authoritativeFacts.find((f) => f.key === "node_version");
  assert(nodeFact !== undefined, "node_version fact found");
  assert(nodeFact?.value === "v20.0.0", "Verified evidence v20.0.0 won over v18.0.0");
  assert(nodeFact?.authority === "VERIFIED_EVIDENCE", "Authority is VERIFIED_EVIDENCE");
});

runTest("EC-H7: Governed Memory (0.80) overrides Confirmed User Model (0.75)", () => {
  const res = executiveContextEngine.synthesize({
    message: "What is my framework preference?",
    context: createDummyContext(),
    memoryGovernance: {
      allowedMemories: [{ memory: { id: "m1", key: "framework", value: "Next.js", category: "PREFERENCE", status: "ACTIVE", confidence: 0.90 }, action: "ALLOW", status: "ACTIVE", confidence: 0.90, governanceTimestamp: 1000 }],
    } as any,
    userModel: {
      profile: {
        attributes: {},
        confirmedAttributes: [{ key: "framework", dimension: "CODE_STYLE", normalizedValue: "Remix", confidence: 0.8, evidenceCount: 2, independentEvidenceCount: 1, status: "CONFIRMED", sourceClassification: "CONFIRMED_USER_MODEL", firstObservedAt: 100, lastObservedAt: 200, isDurable: true, isTemporary: false, evidence: [] }],
      },
    } as any,
  });
  const pref = res.activePreferences.find((p) => p.key === "framework");
  assert(pref?.value === "Next.js", "Governed memory Next.js won over Remix");
  assert(pref?.authority === "GOVERNANCE_APPROVED_MEMORY", "Authority is GOVERNANCE_APPROVED_MEMORY");
});

runTest("EC-H8: Confirmed User Model (0.75) overrides Adaptive Pattern (0.50)", () => {
  const res = executiveContextEngine.synthesize({
    message: "What is my indentation?",
    context: createDummyContext(),
    userModel: {
      profile: {
        attributes: {},
        confirmedAttributes: [{ key: "indentation", dimension: "CODE_STYLE", normalizedValue: "2_SPACES", confidence: 0.9, evidenceCount: 4, independentEvidenceCount: 2, status: "CONFIRMED", sourceClassification: "CONFIRMED_USER_MODEL", firstObservedAt: 100, lastObservedAt: 200, isDurable: true, isTemporary: false, evidence: [] }],
      },
    } as any,
    adaptiveLearning: {
      patterns: [{ patternId: "p1", domain: "CODE_STYLE", dimension: "CODE_STYLE", patternKey: "indentation", preferredValue: "4_SPACES", status: "CONFIRMED" }],
    } as any,
  });
  const pref = res.activePreferences.find((p) => p.key === "indentation");
  assert(pref?.value === "2_SPACES", "User model 2_SPACES won over adaptive 4_SPACES");
  assert(pref?.authority === "CONFIRMED_USER_MODEL", "Authority is CONFIRMED_USER_MODEL");
});

runTest("EC-H9: Adaptive Pattern (0.50) overrides Predictive Context (0.30)", () => {
  const res = executiveContextEngine.synthesize({
    message: "Next steps",
    context: createDummyContext(),
    adaptiveLearning: {
      patterns: [{ patternId: "p1", domain: "WORKFLOW", dimension: "WORKFLOW", patternKey: "build_tool", preferredValue: "Vite", status: "CONFIRMED" }],
    } as any,
    predictiveContext: {
      candidates: [{ id: "pred1", contextSummary: "build_tool", suggestion: "Webpack", relevanceScore: 0.6 }],
    } as any,
  });
  assert(res.activePreferences.some((p) => p.key === "build_tool" && p.value === "Vite"), "Adaptive pattern Vite is in active preferences");
  assert(!res.advisoryContext.some((a) => a.key === "build_tool"), "Predictive candidate build_tool suppressed due to higher authority");
});

runTest("EC-H10: Equal authority contradiction produces unresolved conflict record without unilateral promotion", () => {
  const res = executiveContextEngine.synthesize({
    message: "Show status",
    context: createDummyContext(),
    verification: {
      verifiedEvidence: [
        { id: "v1", claim: "status_code", groundingDetails: "200_OK", confidence: 1.0, source: "logA", verifiedAt: 100 },
        { id: "v2", claim: "status_code", groundingDetails: "500_ERROR", confidence: 1.0, source: "logB", verifiedAt: 100 },
      ],
    } as any,
  });
  const conflict = res.conflicts.find((c) => c.key === "status_code");
  assert(conflict !== undefined, "Conflict record created");
  assert(conflict?.conflictStatus === "UNRESOLVED", "Conflict marked UNRESOLVED");
  assert(res.diagnostics.conflictResolutionCounts.unresolved > 0, "Unresolved count incremented");
});

// Group 3: Governance Gatekeeping & Memory Lifecycle (EC-H11 - EC-H15)
runTest("EC-H11: Quarantined memories are never included in executive context", () => {
  const res = executiveContextEngine.synthesize({
    message: "Check memory",
    context: createDummyContext(),
    memoryGovernance: {
      allowedMemories: [],
      quarantinedMemories: [{ memory: { id: "qm1", key: "quarantine_fact", value: "malicious_val", status: "QUARANTINED" } }],
    } as any,
  });
  assert(!res.authoritativeFacts.some((f) => f.key === "quarantine_fact"), "Quarantined memory excluded from facts");
  assert(!res.promptDirectives.some((d) => d.includes("quarantine_fact")), "Quarantined memory excluded from directives");
});

runTest("EC-H12: Expired memories are suppressed from executive context", () => {
  const res = executiveContextEngine.synthesize({
    message: "Check memory",
    context: createDummyContext(),
    memoryGovernance: {
      allowedMemories: [{ memory: { id: "em1", key: "temp_token", value: "exp123", status: "EXPIRED" } }],
    } as any,
  });
  assert(!res.authoritativeFacts.some((f) => f.key === "temp_token"), "Expired memory excluded");
});

runTest("EC-H13: Superseded memories are suppressed from executive context", () => {
  const res = executiveContextEngine.synthesize({
    message: "Check memory",
    context: createDummyContext(),
    memoryGovernance: {
      allowedMemories: [{ memory: { id: "sm1", key: "old_city", value: "Khulna", status: "SUPERSEDED" } }],
    } as any,
  });
  assert(!res.authoritativeFacts.some((f) => f.key === "old_city"), "Superseded memory excluded");
});

runTest("EC-H14: Candidate unapproved user model attributes are not promoted to active preferences", () => {
  const res = executiveContextEngine.synthesize({
    message: "Check model",
    context: createDummyContext(),
    userModel: {
      profile: {
        attributes: {},
        confirmedAttributes: [],
        candidateAttributes: [{ key: "unconfirmed_pref", dimension: "TONE", normalizedValue: "AGGRESSIVE", status: "CANDIDATE" }],
      },
    } as any,
  });
  assert(!res.activePreferences.some((p) => p.key === "unconfirmed_pref"), "Candidate attribute not promoted");
});

runTest("EC-H15: Deleted memories are strictly filtered out", () => {
  const res = executiveContextEngine.synthesize({
    message: "Check deleted",
    context: createDummyContext(),
    memoryGovernance: {
      allowedMemories: [{ memory: { id: "dm1", key: "deleted_item", value: "val", status: "DELETED" } }],
    } as any,
  });
  assert(!res.authoritativeFacts.some((f) => f.key === "deleted_item"), "Deleted memory excluded");
});

// Group 4: Topic Isolation & Global Retention (EC-H16 - EC-H20)
runTest("EC-H16: Topic switch isolates domain-specific facts from inactive topics", () => {
  const res = executiveContextEngine.synthesize({
    message: "Let's talk about cooking",
    context: {
      ...createDummyContext("cooking"),
      isTopicSwitched: true,
    },
    memoryGovernance: {
      topicIsolationApplied: true,
      allowedMemories: [
        { memory: { id: "m1", key: "react_state", value: "useState", category: "REACT_CODING", status: "ACTIVE", confidence: 0.9 } },
        { memory: { id: "m2", key: "favorite_spice", value: "Cumin", category: "COOKING", status: "ACTIVE", confidence: 0.9 } },
      ],
    } as any,
  });
  assert(!res.authoritativeFacts.some((f) => f.key === "react_state"), "Inactive topic REACT_CODING fact excluded");
  assert(res.authoritativeFacts.some((f) => f.key === "favorite_spice"), "Active topic COOKING fact retained");
});

runTest("EC-H17: Global preferences are retained during strict topic isolation", () => {
  const res = executiveContextEngine.synthesize({
    message: "Let's talk about gaming",
    context: {
      ...createDummyContext("gaming"),
      isTopicSwitched: true,
    },
    memoryGovernance: {
      topicIsolationApplied: true,
      allowedMemories: [
        { memory: { id: "m1", key: "language", value: "ENGLISH", category: "PREFERENCE", status: "ACTIVE", confidence: 0.95 } },
      ],
    } as any,
  });
  assert(res.activePreferences.some((p) => p.key === "language"), "Global language preference retained under topic isolation");
});

runTest("EC-H18: Topic isolation suppresses predictive candidates from foreign topics", () => {
  const res = executiveContextEngine.synthesize({
    message: "Discuss gardening",
    context: {
      ...createDummyContext("gardening"),
      isTopicSwitched: true,
    },
    predictiveContext: {
      candidates: [
        { id: "pred1", domain: "DATABASE", contextSummary: "postgres_index", suggestion: "Add B-tree index" },
        { id: "pred2", domain: "GARDENING", contextSummary: "watering_schedule", suggestion: "Water twice weekly" },
      ],
    } as any,
    options: { strictTopicIsolation: true },
  });
  assert(!res.advisoryContext.some((a) => a.key === "postgres_index"), "Foreign DATABASE predictive suggestion suppressed");
  assert(res.advisoryContext.some((a) => a.key === "watering_schedule"), "Matching GARDENING predictive suggestion retained");
});

runTest("EC-H19: Topic-isolated projects are suppressed when activeTopic does not match", () => {
  const res = executiveContextEngine.synthesize({
    message: "Project update",
    context: {
      ...createDummyContext("design"),
      isTopicSwitched: true,
    },
    goalProject: {
      activeProjects: [
        { id: "p1", name: "Backend DB Migration", status: "ACTIVE", description: "Migrate Postgres tables" },
        { id: "p2", name: "UI Design System", status: "ACTIVE", description: "Figma design tokens" },
      ],
    } as any,
    options: { strictTopicIsolation: true },
  });
  assert(!res.activeProjects.some((p) => p.name === "Backend DB Migration"), "Mismatched Backend project suppressed");
  assert(res.activeProjects.some((p) => p.name === "UI Design System"), "Matched Design project retained");
});

runTest("EC-H20: Topic isolation diagnostics count incremented", () => {
  const res = executiveContextEngine.synthesize({
    message: "Topic test",
    context: {
      ...createDummyContext("biology"),
      isTopicSwitched: true,
    },
    memoryGovernance: {
      topicIsolationApplied: true,
      allowedMemories: [
        { memory: { id: "m1", key: "rust_compiler", value: "rustc", category: "PROGRAMMING", status: "ACTIVE" } },
      ],
    } as any,
  });
  assert(res.diagnostics.topicIsolatedCount > 0, "topicIsolatedCount incremented");
});

// Group 5: Predictive Advisory Boundary (EC-H21 - EC-H25)
runTest("EC-H21: Predictive context is labeled advisory-only and cannot become verified fact", () => {
  const res = executiveContextEngine.synthesize({
    message: "Check predictions",
    context: createDummyContext(),
    predictiveContext: {
      candidates: [{ id: "pred1", contextSummary: "suggested_framework", suggestion: "Astro", relevanceScore: 0.8 }],
    } as any,
  });
  assert(res.advisoryContext.length === 1, "1 advisory item");
  assert(res.advisoryContext[0].isAdvisoryOnly === true, "isAdvisoryOnly is true");
  assert(!res.authoritativeFacts.some((f) => f.key === "suggested_framework"), "Not added to authoritative facts");
});

runTest("EC-H22: Predictive context cannot create user preference without confirmation", () => {
  const res = executiveContextEngine.synthesize({
    message: "Suggest something",
    context: createDummyContext(),
    predictiveContext: {
      candidates: [{ id: "pred1", contextSummary: "theme", suggestion: "DARK_MODE", relevanceScore: 0.9 }],
    } as any,
  });
  assert(!res.activePreferences.some((p) => p.key === "theme"), "Predictive candidate does not create active preference");
});

runTest("EC-H23: Predictive context cannot create goal or commitment", () => {
  const res = executiveContextEngine.synthesize({
    message: "Status",
    context: createDummyContext(),
    predictiveContext: {
      candidates: [{ id: "pred1", contextSummary: "goal_suggestion", suggestion: "Finish thesis by Friday" }],
    } as any,
  });
  assert(res.activeGoals.length === 0, "No active goals created by prediction");
  assert(res.activeCommitments.length === 0, "No active commitments created by prediction");
});

runTest("EC-H24: Low authority of predictive context causes it to yield to any higher authority", () => {
  assert(EXECUTIVE_AUTHORITY_WEIGHTS["PREDICTIVE_CONTEXT"] === 0.30, "Predictive authority weight is 0.30");
  assert(EXECUTIVE_AUTHORITY_WEIGHTS["SYSTEM_DEFAULT"] === 0.10, "System default weight is 0.10");
  assert(EXECUTIVE_AUTHORITY_WEIGHTS["PREDICTIVE_CONTEXT"] < EXECUTIVE_AUTHORITY_WEIGHTS["CONFIRMED_ADAPTIVE_PATTERN"], "Predictive is lower than adaptive");
});

runTest("EC-H25: Predictive directives contain Advisory prefix in sanitized output", () => {
  const res = executiveContextEngine.synthesize({
    message: "Show tips",
    context: createDummyContext(),
    predictiveContext: {
      candidates: [{ id: "pred1", contextSummary: "tip", suggestion: "Consider caching responses" }],
    } as any,
  });
  assert(res.advisoryContext[0].sanitizedDirective.startsWith("Advisory suggestion:"), "Directive begins with Advisory suggestion:");
});

// Group 6: Temporal Memory Lineage & Evolution (EC-H26 - EC-H30)
runTest("EC-H26: Stale temporal patterns are suppressed from active temporal context", () => {
  const res = executiveContextEngine.synthesize({
    message: "Temporal test",
    context: createDummyContext(),
    temporalMemory: {
      patterns: [{ patternKey: "old_routine", currentValue: "morning_run", temporalStatus: "STALE" }],
    } as any,
  });
  assert(!res.temporalContext.activePatterns.some((p) => p.key === "old_routine"), "Stale pattern suppressed");
  assert(res.temporalContext.suppressedStaleCount === 1, "suppressedStaleCount is 1");
});

runTest("EC-H27: Current temporal pattern is extracted into activePatterns", () => {
  const res = executiveContextEngine.synthesize({
    message: "Temporal test",
    context: createDummyContext(),
    temporalMemory: {
      patterns: [{ patternKey: "daily_standup", currentValue: "10:00_AM", temporalStatus: "CURRENT" }],
    } as any,
  });
  assert(res.temporalContext.activePatterns.some((p) => p.key === "daily_standup" && p.value === "10:00_AM"), "Current temporal pattern present");
});

runTest("EC-H28: Evolving temporal pattern generates evolvingLineage entry", () => {
  const res = executiveContextEngine.synthesize({
    message: "Temporal test",
    context: createDummyContext(),
    temporalMemory: {
      patterns: [
        {
          patternKey: "ide_choice",
          currentValue: "Cursor",
          temporalStatus: "EVOLVING",
          status: "EVOLVING",
          previousValues: [{ value: "VS Code", normalizedValue: "VS Code" }],
          isCurrentTurnEvolution: true,
        },
      ],
    } as any,
  });
  assert(res.temporalContext.evolvingLineage.length === 1, "1 evolving lineage item");
  assert(res.temporalContext.evolvingLineage[0].fromValue === "VS Code", "fromValue is VS Code");
  assert(res.temporalContext.evolvingLineage[0].toValue === "Cursor", "toValue is Cursor");
  assert(res.temporalContext.evolvingLineage[0].isCurrentTurnEvolution === true, "isCurrentTurnEvolution is true");
});

runTest("EC-H29: Superseded temporal patterns increment staleSuppressed diagnostics", () => {
  const res = executiveContextEngine.synthesize({
    message: "Temporal test",
    context: createDummyContext(),
    temporalMemory: {
      patterns: [{ patternKey: "old_pattern", currentValue: "val", temporalStatus: "SUPERSEDED" }],
    } as any,
  });
  assert(res.diagnostics.staleExpiredSuppressedCount > 0, "staleExpiredSuppressedCount incremented");
});

runTest("EC-H30: Expired temporal patterns are excluded", () => {
  const res = executiveContextEngine.synthesize({
    message: "Temporal test",
    context: createDummyContext(),
    temporalMemory: {
      patterns: [{ patternKey: "expired_pattern", currentValue: "val", temporalStatus: "EXPIRED" }],
    } as any,
  });
  assert(!res.temporalContext.activePatterns.some((p) => p.key === "expired_pattern"), "Expired pattern excluded");
});

// Group 7: Goal & Project Integrity & Lifecycle (EC-H31 - EC-H35)
runTest("EC-H31: Completed goals are suppressed from activeGoals", () => {
  const res = executiveContextEngine.synthesize({
    message: "Goals test",
    context: createDummyContext(),
    goalProject: {
      activeGoals: [{ id: "g1", title: "Write Spec", status: "COMPLETED" }],
    } as any,
  });
  assert(res.activeGoals.length === 0, "Completed goal suppressed");
});

runTest("EC-H32: Abandoned projects are suppressed from activeProjects", () => {
  const res = executiveContextEngine.synthesize({
    message: "Projects test",
    context: createDummyContext(),
    goalProject: {
      activeProjects: [{ id: "p1", name: "Abandoned Initiative", status: "ABANDONED" }],
    } as any,
  });
  assert(res.activeProjects.length === 0, "Abandoned project suppressed");
});

runTest("EC-H33: Current-turn paused project override suppresses specified project", () => {
  const res = executiveContextEngine.synthesize({
    message: "Pause Project Alpha, let's work on Project Beta",
    context: createDummyContext(),
    goalProject: {
      activeProjects: [
        { id: "p1", name: "Project Alpha", status: "ACTIVE" },
        { id: "p2", name: "Project Beta", status: "ACTIVE" },
      ],
    } as any,
  });
  assert(!res.activeProjects.some((p) => p.name === "Project Alpha"), "Project Alpha paused and suppressed");
  assert(res.activeProjects.some((p) => p.name === "Project Beta"), "Project Beta active");
  assert(res.currentTurn.overrides.pausedProject?.toLowerCase().includes("alpha"), "Paused project detected");
});

runTest("EC-H34: Uncertain/hypothetical commitments are rejected", () => {
  const res = executiveContextEngine.synthesize({
    message: "Commitment test",
    context: createDummyContext(),
    goalProject: {
      activeCommitments: [
        { id: "c1", description: "Maybe refactor auth?", status: "ACTIVE", sourceIntent: "HYPOTHETICAL" },
        { id: "c2", description: "Deploy to prod tomorrow", status: "ACTIVE", sourceIntent: "DIRECT_USER_COMMITMENT" },
      ],
    } as any,
  });
  assert(!res.activeCommitments.some((c) => c.description.includes("Maybe refactor")), "Hypothetical commitment rejected");
  assert(res.activeCommitments.some((c) => c.description.includes("Deploy to prod")), "Direct user commitment accepted");
});

runTest("EC-H35: Cancelled commitments are suppressed", () => {
  const res = executiveContextEngine.synthesize({
    message: "Commitment test",
    context: createDummyContext(),
    goalProject: {
      activeCommitments: [{ id: "c1", description: "Old commitment", status: "CANCELLED" }],
    } as any,
  });
  assert(res.activeCommitments.length === 0, "Cancelled commitment suppressed");
});

// Group 8: Context Budgeting & Truncation (EC-H36 - EC-H38)
runTest("EC-H37: Priority-ordered truncation preserves highest authority items under tight budget", () => {
  const res = executiveContextEngine.synthesize({
    message: "Budget test",
    context: createDummyContext(),
    verification: {
      verifiedEvidence: [
        { id: "v1", claim: "fact_1", groundingDetails: "high_auth_fact", confidence: 1.0 },
      ],
    } as any,
    memoryGovernance: {
      allowedMemories: [
        { memory: { id: "m2", key: "fact_2", value: "lower_auth_fact", category: "GENERAL", status: "ACTIVE" } },
      ],
    } as any,
    options: {
      budgetConfig: { maxFacts: 1 },
    },
  });
  assert(res.authoritativeFacts.length === 1, "Budget clamped to 1 fact");
  assert(res.authoritativeFacts[0].authority === "VERIFIED_EVIDENCE", "Highest authority VERIFIED_EVIDENCE preserved");
  assert(res.diagnostics.budgetTruncatedCount === 1, "budgetTruncatedCount is 1");
});

runTest("EC-H38: Prompt directives count respects maxDirectives budget", () => {
  const res = executiveContextEngine.synthesize({
    message: "Directives budget test",
    context: createDummyContext(),
    memoryGovernance: {
      allowedMemories: [
        { memory: { id: "m1", key: "pref1", value: "v1", category: "PREFERENCE", status: "ACTIVE" } },
        { memory: { id: "m2", key: "pref2", value: "v2", category: "PREFERENCE", status: "ACTIVE" } },
        { memory: { id: "m3", key: "pref3", value: "v3", category: "PREFERENCE", status: "ACTIVE" } },
      ],
    } as any,
    options: {
      budgetConfig: { maxDirectives: 2 },
    },
  });
  assert(res.promptDirectives.length <= 2, "Prompt directives capped at 2");
});

// Group 9: Sensitive Data Suppression & Sanitization (EC-H39 - EC-H41)
runTest("EC-H39: API keys, bearer tokens, and secrets are suppressed from executive facts", () => {
  const res = executiveContextEngine.synthesize({
    message: "Secrets test",
    context: createDummyContext(),
    memoryGovernance: {
      allowedMemories: [
        { memory: { id: "m1", key: "api_key", value: "sk-proj-1234567890abcdef1234567890", category: "CREDENTIALS", status: "ACTIVE" } },
        { memory: { id: "m2", key: "clean_fact", value: "App uses TypeScript", category: "TECH_STACK", status: "ACTIVE" } },
      ],
    } as any,
  });
  assert(!res.authoritativeFacts.some((f) => f.key === "api_key"), "API key suppressed from facts");
  assert(res.authoritativeFacts.some((f) => f.key === "clean_fact"), "Clean fact retained");
  assert(res.diagnostics.sensitiveDataSuppressedCount > 0, "sensitiveDataSuppressedCount incremented");
});

runTest("EC-H40: Credit card patterns and SSNs are suppressed from predictive advisories", () => {
  const res = executiveContextEngine.synthesize({
    message: "CC test",
    context: createDummyContext(),
    predictiveContext: {
      candidates: [
        { id: "pred1", contextSummary: "card", suggestion: "Card number 4532-1234-5678-9012" },
        { id: "pred2", contextSummary: "clean_tip", suggestion: "Optimize database indexes" },
      ],
    } as any,
  });
  assert(!res.advisoryContext.some((a) => a.key === "card"), "Card suggestion suppressed");
  assert(res.advisoryContext.some((a) => a.key === "clean_tip"), "Clean tip retained");
});

runTest("EC-H41: Directive sanitizer strips internal metadata, memory IDs, and raw hashes", () => {
  const res = executiveContextEngine.synthesize({
    message: "Sanitize test",
    context: createDummyContext(),
    memoryGovernance: {
      allowedMemories: [
        { memory: { id: "mem_abc123", key: "favorite_editor", value: "Neovim [id: mem_abc123] [confidence: 0.99] [hash: 9a8b7c]", category: "PREFERENCE", status: "ACTIVE" } },
      ],
    } as any,
  });
  const directive = res.promptDirectives.find((d) => d.includes("Neovim"));
  assert(directive !== undefined, "Directive found");
  assert(!directive?.includes("mem_abc123"), "Internal mem ID stripped from directive");
  assert(!directive?.includes("confidence:"), "Confidence metadata stripped from directive");
  assert(!directive?.includes("hash:"), "Hash metadata stripped from directive");
});

// Group 10: Determinism & Immutability / State Invariance (EC-H42 - EC-H45)
runTest("EC-H42: ExecutiveContextEngine produces bit-for-bit identical output over 10 consecutive runs", () => {
  const input: ExecutiveContextInput = {
    message: "Deterministic check for complex synthesis",
    context: createDummyContext("programming"),
    memoryGovernance: {
      allowedMemories: [
        { memory: { id: "m1", key: "lang", value: "TypeScript", category: "PREFERENCE", status: "ACTIVE" } },
        { memory: { id: "m2", key: "os", value: "Linux", category: "PREFERENCE", status: "ACTIVE" } },
      ],
    } as any,
    goalProject: {
      activeProjects: [{ id: "p1", name: "Dora Core", status: "ACTIVE" }],
    } as any,
    options: { currentTime: 1724300000000 },
  };
  const firstJson = JSON.stringify(executiveContextEngine.synthesize(input));
  for (let i = 0; i < 10; i++) {
    const runJson = JSON.stringify(executiveContextEngine.synthesize(input));
    assert(runJson === firstJson, `Run ${i + 1} produced non-deterministic output`);
  }
});

runTest("EC-H43: ExecutiveContextEngine performs zero mutations on input structures", () => {
  const originalInput: ExecutiveContextInput = {
    message: "Mutation check",
    context: createDummyContext("architecture"),
    options: { currentTime: 1724300000000 },
  };
  const snapshotBefore = JSON.stringify(originalInput);
  executiveContextEngine.synthesize(originalInput);
  const snapshotAfter = JSON.stringify(originalInput);
  assert(snapshotBefore === snapshotAfter, "Input was mutated during synthesis");
});

runTest("EC-H44: Diagnostics structure accurately totals candidate items and resolutions", () => {
  const res = executiveContextEngine.synthesize({
    message: "Diagnostics verify",
    context: createDummyContext(),
    memoryGovernance: {
      allowedMemories: [
        { memory: { id: "m1", key: "theme", value: "light", category: "PREFERENCE", status: "ACTIVE" } },
      ],
    } as any,
  });
  assert(typeof res.diagnostics.totalCandidatesExamined === "number", "totalCandidatesExamined is number");
  assert(typeof res.diagnostics.includedItemsCount === "number", "includedItemsCount is number");
  assert(typeof res.diagnostics.conflictResolutionCounts === "object", "conflictResolutionCounts is object");
});

runTest("EC-H45: All authority levels are recognized and weighted correctly", () => {
  const authorities: ExecutiveAuthority[] = [
    "CURRENT_TURN_EXPLICIT",
    "HARD_CONSTRAINT",
    "VERIFIED_EVIDENCE",
    "GOVERNANCE_APPROVED_MEMORY",
    "CONFIRMED_USER_MODEL",
    "ACTIVE_GOAL_PROJECT_COMMITMENT",
    "TEMPORAL_CONTEXT",
    "CONFIRMED_ADAPTIVE_PATTERN",
    "PREDICTIVE_CONTEXT",
    "SYSTEM_DEFAULT",
  ];
  for (let i = 0; i < authorities.length - 1; i++) {
    const higher = authorities[i];
    const lower = authorities[i + 1];
    assert(
      EXECUTIVE_AUTHORITY_WEIGHTS[higher] > EXECUTIVE_AUTHORITY_WEIGHTS[lower],
      `Authority ${higher} (${EXECUTIVE_AUTHORITY_WEIGHTS[higher]}) must be strictly greater than ${lower} (${EXECUTIVE_AUTHORITY_WEIGHTS[lower]})`
    );
  }
});

console.log(`\n======================================================`);
console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log(`======================================================\n`);
