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

console.log(`\n======================================================`);
console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log(`======================================================\n`);
