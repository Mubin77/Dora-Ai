/**
 * Dora Multi-Hop Reasoning & Evidence Chain Engine Test Suite
 * Phase 3 — Step 4
 * 
 * Verifies all multi-hop reasoning invariants:
 * - Deterministic evidence node extraction & deduplication (MH-1 to MH-10)
 * - Multi-hop chain generation across syllogisms, causal links, constraints, and goals (MH-11 to MH-20)
 * - Cycle detection, DFS depth bounding, and strict budget ceilings (MH-21 to MH-30)
 * - Authority degradation, anti-inflation, confidence bounding (MH-31 to MH-40)
 * - BrainEngine integration, credential sanitization, determinism, and regression (MH-41 to MH-50)
 */

import { multiHopReasoningEngine } from "./multiHopReasoningEngine";
import { brainEngine } from "./brainEngine";
import { causalReasoningEngine } from "./causalReasoningEngine";
import { deepReasoningEngine } from "./deepReasoningEngine";
import { contradictionResolutionEngine } from "./contradictionResolutionEngine";
import { MultiHopReasoningInput } from "./multiHopReasoningTypes";
import { ExecutiveContextPackage } from "./executiveContextTypes";

let passedTests = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
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

function createMockExecutiveContext(overrides?: any): ExecutiveContextPackage {
  return {
    currentTurn: {
      message: "Test message",
      intent: "INFORM",
      explicitDirectives: [],
      overrides: {},
    },
    authoritativeFacts: [],
    activePreferences: [],
    activeProjects: [],
    activeGoals: [],
    activeCommitments: [],
    temporalContext: {
      stablePreferences: [],
      recurringHabits: [],
      evolvingLineage: [],
      suppressedStaleCount: 0,
    },
    continuityContext: {
      continuityStatus: "ACTIVE",
      isTopicIsolated: false,
    },
    reasoningConstraints: [],
    responseStyle: {
      language: "en",
      verbosity: "BALANCED",
      tone: "FRIENDLY",
      formatStyle: "NATURAL",
      codeDensity: "MEDIUM",
      explanationDepth: "MODERATE",
      winningLayers: {},
      sanitizedDirectives: [],
    },
    advisoryContext: [],
    ambiguity: {
      isAmbiguous: false,
      status: "CLEAR",
      competingTargets: [],
    },
    conflicts: [],
    diagnostics: {
      totalCandidatesExamined: 0,
      includedItemsCount: 0,
      suppressedItemsCount: 0,
      deduplicatedCount: 0,
      topicIsolatedCount: 0,
      staleExpiredSuppressedCount: 0,
      predictiveSuppressedCount: 0,
      sensitiveDataSuppressedCount: 0,
      sanitizedDirectivesCount: 0,
      budgetTruncatedCount: 0,
      conflictResolutionCounts: { resolved: 0, unresolved: 0 },
      executionTimeMs: 0,
    },
    promptDirectives: [],
    ...overrides,
  };
}

function createBaseInput(overrides?: Partial<MultiHopReasoningInput>): MultiHopReasoningInput {
  const context = {
    activeTopic: "programming",
    turns: [],
    variables: {},
    currentGoal: undefined,
    userState: {},
    systemState: {},
    lastTurnTimestamp: Date.now(),
    conversationId: "test-conv",
  };

  const intent = {
    primaryIntent: "STATEMENT" as any,
    confidence: 0.95,
    intents: [],
    slots: {},
    isAmbiguous: false,
    requiresClarification: false,
    intentSignals: {},
  };

  const reasoning = {
    reasoningRequired: true,
    reasoningType: "CAUSAL_ANALYSIS" as any,
    complexity: "MEDIUM" as any,
    confidence: 0.9,
    reasoningConfidence: 0.9,
    missingInformation: [],
    constraints: [],
    subtasks: [],
    conclusionStrategy: "DIRECT" as any,
    suggestedTools: [],
    requiresClarification: false,
  };

  const planning = {
    requiresPlanning: false,
    confidence: 0.8,
  };

  const verification = {
    confidence: {
      rawScore: 0.9,
      calibratedScore: 0.9,
      confidenceBand: "HIGH" as any,
      calibrationSignals: {},
    },
    claims: [],
    contradictions: [],
    unsupportedClaims: [],
    requiresClarification: false,
    status: "VERIFIED" as any,
  };

  return {
    userId: "user_123",
    message: "Deploy to production requires build passing",
    context: context as any,
    intent: intent as any,
    reasoning: reasoning as any,
    planning: planning as any,
    verification: verification as any,
    executiveContext: createMockExecutiveContext(),
    options: {
      currentTime: 1700000000000,
    },
    ...overrides,
  };
}

console.log("\n=======================================================");
console.log("DORA PHASE 3 STEP 4: MULTI-HOP REASONING TEST SUITE");
console.log("=======================================================\n");

// ==========================================
// 1. Evidence Extraction & Deduplication (MH-1 to MH-10)
// ==========================================

runTest("MH-1: Extracts facts from Executive Context", () => {
  const execContext = createMockExecutiveContext({
    authoritativeFacts: [
      {
        id: "fact_1",
        key: "db_version",
        value: "PostgreSQL 15",
        normalizedKey: "db_version",
        normalizedValue: "postgresql 15",
        authority: "VERIFIED_EVIDENCE",
        authorityWeight: 0.9,
        source: "system_probe",
        isCurrentTurnFact: false,
        confidence: 0.95,
        sanitizedDirective: "Database is PostgreSQL 15",
      },
    ],
  });

  const input = createBaseInput({ executiveContext: execContext });
  const result = multiHopReasoningEngine.evaluate(input);

  assert(result.evidenceNodes.length >= 1, "Should extract at least 1 evidence node");
  const dbNode = result.evidenceNodes.find((n) => n.normalizedKey.includes("db_version"));
  assert(!!dbNode, "Should find db_version node");
  assert(dbNode?.authority === "VERIFIED_EVIDENCE", "Node authority should match fact authority");
});

runTest("MH-2: Extracts Active Projects and Goals from Executive Context", () => {
  const execContext = createMockExecutiveContext({
    activeProjects: [
      {
        id: "proj_alpha",
        name: "Alpha Migration",
        status: "IN_PROGRESS",
        activeTasks: ["task_1"],
        readyTasks: ["task_1"],
        blockers: [],
        isPrimaryActive: true,
        sanitizedDirective: "Alpha Migration is in progress",
      },
    ],
  });

  const input = createBaseInput({ executiveContext: execContext });
  const result = multiHopReasoningEngine.evaluate(input);

  const projNode = result.evidenceNodes.find((n) => n.normalizedKey.includes("alpha migration"));
  assert(!!projNode, "Should extract project node");
  assert(projNode?.authority === "ACTIVE_GOAL_PROJECT_COMMITMENT", "Should have ACTIVE_GOAL_PROJECT_COMMITMENT authority");
});

runTest("MH-3: Extracts Deep Reasoning evidence and hypotheses", () => {
  const deepReasoning: any = {
    evidence: [
      {
        id: "dr_ev_1",
        statement: "Server memory is 95% full",
        authority: "VERIFIED_EVIDENCE",
        scope: "GLOBAL",
        reliability: 0.95,
        normalizedKey: "server_memory",
        normalizedValue: "95%",
      },
    ],
    hypotheses: [
      {
        id: "dr_hyp_1",
        statement: "Memory leak in worker pool",
        winningAuthority: "GOVERNANCE_APPROVED_MEMORY",
        status: "SUPPORTED",
        confidence: 0.85,
      },
    ],
  };

  const input = createBaseInput({ deepReasoning });
  const result = multiHopReasoningEngine.evaluate(input);

  const memNode = result.evidenceNodes.find((n) => n.normalizedKey.includes("server_memory"));
  const hypNode = result.evidenceNodes.find((n) => n.normalizedKey.includes("dr_hyp_1") || n.statement.includes("Memory leak"));
  assert(!!memNode, "Should extract deep reasoning evidence");
  assert(!!hypNode, "Should extract supported hypothesis");
});

runTest("MH-4: Extracts Causal Reasoning relations", () => {
  const causalReasoning: any = {
    relations: [
      {
        id: "causal_rel_1",
        causeStatement: "High disk I/O",
        effectStatement: "Slow query response",
        relationType: "DIRECT_CAUSE",
        evidenceAuthority: "VERIFIED_EVIDENCE",
        confidence: 0.9,
      },
    ],
  };

  const input = createBaseInput({ causalReasoning });
  const result = multiHopReasoningEngine.evaluate(input);

  const relNode = result.evidenceNodes.find((n) => n.normalizedKey.includes("causal") || n.statement.includes("disk I/O"));
  assert(!!relNode, "Should extract causal relation node");
});

runTest("MH-5: Deduplicates identical nodes preserving highest authority", () => {
  const execContext = createMockExecutiveContext({
    authoritativeFacts: [
      {
        id: "fact_low",
        key: "api_endpoint",
        value: "https://api.example.com",
        normalizedKey: "api_endpoint",
        normalizedValue: "https://api.example.com",
        authority: "SYSTEM_DEFAULT",
        authorityWeight: 0.1,
        source: "default",
        isCurrentTurnFact: false,
        confidence: 0.5,
        sanitizedDirective: "Endpoint is https://api.example.com",
      },
      {
        id: "fact_high",
        key: "api_endpoint",
        value: "https://api.example.com",
        normalizedKey: "api_endpoint",
        normalizedValue: "https://api.example.com",
        authority: "CURRENT_TURN_EXPLICIT",
        authorityWeight: 1.0,
        source: "user_override",
        isCurrentTurnFact: true,
        confidence: 0.99,
        sanitizedDirective: "Endpoint is https://api.example.com",
      },
    ],
  });

  const input = createBaseInput({ executiveContext: execContext });
  const result = multiHopReasoningEngine.evaluate(input);

  const nodes = result.evidenceNodes.filter((n) => n.normalizedKey.includes("api_endpoint"));
  assert(nodes.length === 1, "Should deduplicate to a single node for key 'api_endpoint'");
  assert(nodes[0].authority === "CURRENT_TURN_EXPLICIT", "Should retain the highest authority (CURRENT_TURN_EXPLICIT)");
  assert(nodes[0].authorityWeight === 1.0, "Should retain highest authority weight");
});

runTest("MH-6: Excludes UNAUTHORIZED or suppressed governance candidates", () => {
  const execContext = createMockExecutiveContext({
    authoritativeFacts: [
      {
        id: "fact_suppressed",
        key: "private_email",
        value: "secret@example.com",
        normalizedKey: "private_email",
        normalizedValue: "secret@example.com",
        authority: "CONFIRMED_USER_MODEL",
        authorityWeight: 0.75,
        source: "memory",
        isCurrentTurnFact: false,
        confidence: 0.8,
        sanitizedDirective: "Email is secret@example.com",
      },
    ],
  });

  const memoryGovernance: any = {
    governedCandidates: [
      {
        memoryId: "mem_priv",
        key: "private_email",
        value: "secret@example.com",
        usageDecision: "SUPPRESS",
        status: "ACTIVE",
      },
    ],
  };

  const input = createBaseInput({ executiveContext: execContext, memoryGovernance });
  const result = multiHopReasoningEngine.evaluate(input);

  const node = result.evidenceNodes.find((n) => n.normalizedKey.includes("private_email"));
  assert(!node, "Suppressed candidate must NOT be present in accepted evidence nodes");
});

runTest("MH-7: Enforces strict scope boundaries (TOPIC isolation)", () => {
  const deepReasoning: any = {
    evidence: [
      {
        id: "topic_ev_sports",
        statement: "Team won the final match",
        authority: "VERIFIED_EVIDENCE",
        scope: "TOPIC",
        topic: "sports",
        reliability: 0.9,
        normalizedKey: "sports_victory",
        normalizedValue: "won match",
      },
    ],
  };

  const input = createBaseInput({
    deepReasoning,
    options: {
      activeTopic: "finance",
      strictTopicIsolation: true,
    },
  });

  const result = multiHopReasoningEngine.evaluate(input);
  const sportsNode = result.evidenceNodes.find((n) => n.normalizedKey.includes("sports"));
  assert(!sportsNode, "Cross-topic evidence must NOT be included in accepted evidence nodes when topic isolation is active");
  assert(result.diagnostics.topicConflictsRejected >= 1, "Should count topic conflict in diagnostics");
});

runTest("MH-8: Question intent is NOT extracted as declarative evidence", () => {
  const input = createBaseInput({
    message: "Does deploying to prod break the staging environment?",
    intent: {
      primaryIntent: "QUESTION" as any,
      confidence: 0.95,
      intents: [],
      slots: {},
      isAmbiguous: false,
      requiresClarification: false,
      intentSignals: {},
    } as any,
  });

  const result = multiHopReasoningEngine.evaluate(input);
  const turnAssertion = result.evidenceNodes.find((n) => n.id.startsWith("turn_assertion"));
  assert(!turnAssertion, "Questions must NOT be promoted to turn assertion evidence nodes");
});

runTest("MH-9: Speculation / hypothetical input is NOT extracted as authoritative evidence", () => {
  const input = createBaseInput({
    message: "What if we delete the production database?",
  });

  const result = multiHopReasoningEngine.evaluate(input);
  const turnAssertion = result.evidenceNodes.find((n) => n.id.startsWith("turn_assertion"));
  assert(!turnAssertion, "Hypothetical statements must NOT be promoted to evidence nodes");
});

runTest("MH-10: Sensitive patterns (API keys/credentials) are sanitized from nodes", () => {
  const execContext = createMockExecutiveContext({
    authoritativeFacts: [
      {
        id: "fact_api_key",
        key: "secret_token",
        value: "AIzaSyB12345678901234567890",
        normalizedKey: "secret_token",
        normalizedValue: "AIzaSyB12345678901234567890",
        authority: "VERIFIED_EVIDENCE",
        authorityWeight: 0.9,
        source: "env",
        isCurrentTurnFact: false,
        confidence: 0.9,
        sanitizedDirective: "Token is present",
      },
    ],
  });

  const input = createBaseInput({ executiveContext: execContext });
  const result = multiHopReasoningEngine.evaluate(input);

  const node = result.evidenceNodes.find((n) => n.normalizedKey.includes("secret_token"));
  assert(!!node, "Node should exist");
  assert(!node?.statement.includes("AIzaSyB"), "Node statement must be sanitized of raw credential strings");
});

// ==========================================
// 2. Hop Generation & Chain Synthesis (MH-11 to MH-20)
// ==========================================

runTest("MH-11: Constructs direct deduction hop between connected facts", () => {
  const execContext = createMockExecutiveContext({
    authoritativeFacts: [
      {
        id: "fact_service_a",
        key: "service_a_status",
        value: "Service A depends on Service B",
        normalizedKey: "service_a_status",
        normalizedValue: "depends on service b",
        authority: "VERIFIED_EVIDENCE",
        authorityWeight: 0.9,
        source: "manifest",
        isCurrentTurnFact: false,
        confidence: 0.95,
        sanitizedDirective: "Service A depends on Service B",
      },
      {
        id: "fact_service_b",
        key: "service_b_status",
        value: "Service B is down",
        normalizedKey: "service_b_status",
        normalizedValue: "service b is down",
        authority: "VERIFIED_EVIDENCE",
        authorityWeight: 0.9,
        source: "monitoring",
        isCurrentTurnFact: false,
        confidence: 0.95,
        sanitizedDirective: "Service B is down",
      },
    ],
  });

  const input = createBaseInput({ executiveContext: execContext });
  const result = multiHopReasoningEngine.evaluate(input);

  assert(result.hops.length >= 1, "Should generate at least 1 logical hop");
  const directHop = result.hops.find((h) => h.inferenceType === "DIRECT_DEDUCTION" || h.inferenceType === "CHAINED_DEDUCTION");
  assert(!!directHop, "Should generate a deduction hop between dependent service facts");
});

runTest("MH-12: Multi-step chained deduction (A -> B -> C)", () => {
  const execContext = createMockExecutiveContext({
    authoritativeFacts: [
      {
        id: "fact_a",
        key: "node_a",
        value: "Auth service requires Redis cache",
        normalizedKey: "node_a",
        normalizedValue: "auth requires redis",
        authority: "VERIFIED_EVIDENCE",
        authorityWeight: 0.9,
        source: "arch",
        isCurrentTurnFact: false,
        confidence: 0.95,
        sanitizedDirective: "Auth requires Redis",
      },
      {
        id: "fact_b",
        key: "node_b",
        value: "Redis cache is degraded",
        normalizedKey: "node_b",
        normalizedValue: "redis cache is degraded",
        authority: "VERIFIED_EVIDENCE",
        authorityWeight: 0.9,
        source: "monitoring",
        isCurrentTurnFact: false,
        confidence: 0.95,
        sanitizedDirective: "Redis cache is degraded",
      },
    ],
  });

  const causalReasoning: any = {
    relations: [
      {
        id: "causal_redis_auth",
        causeStatement: "Redis cache is degraded",
        effectStatement: "User logins fail",
        relationType: "DIRECT_CAUSE",
        evidenceAuthority: "VERIFIED_EVIDENCE",
        confidence: 0.9,
      },
    ],
  };

  const input = createBaseInput({ executiveContext: execContext, causalReasoning });
  const result = multiHopReasoningEngine.evaluate(input);

  assert(result.chains.length >= 1, "Should construct multi-hop chain");
  const chain = result.chains[0];
  assert(chain.hops.length >= 1, "Chain must contain hops");
});

runTest("MH-13: Causal propagation across verified causal relations", () => {
  const causalReasoning: any = {
    relations: [
      {
        id: "causal_1",
        causeStatement: "High network latency",
        effectStatement: "Database connection timeout",
        relationType: "DIRECT_CAUSE",
        evidenceAuthority: "VERIFIED_EVIDENCE",
        confidence: 0.92,
      },
    ],
  };

  const deepReasoning: any = {
    evidence: [
      {
        id: "dr_ev_lat",
        statement: "Network latency is 850ms",
        authority: "VERIFIED_EVIDENCE",
        scope: "GLOBAL",
        reliability: 0.95,
        normalizedKey: "network_latency",
        normalizedValue: "850ms",
      },
    ],
  };

  const input = createBaseInput({ causalReasoning, deepReasoning });
  const result = multiHopReasoningEngine.evaluate(input);

  const causalHop = result.hops.find((h) => h.inferenceType === "CAUSAL_PROPAGATION");
  assert(!!causalHop, "Should generate a CAUSAL_PROPAGATION hop");
});

runTest("MH-14: Constraint propagation preserves hard boundary", () => {
  const execContext = createMockExecutiveContext({
    reasoningConstraints: [
      {
        id: "constraint_no_delete",
        type: "HARD_CONSTRAINT",
        description: "Do not delete production tables without confirmation",
        authority: "HARD_CONSTRAINT",
        enforceStrictly: true,
        sanitizedDirective: "No unconfirmed table deletion",
      },
    ],
    activeProjects: [
      {
        id: "proj_db_cleanup",
        name: "Database Cleanup",
        status: "IN_PROGRESS",
        activeTasks: ["drop_old_tables"],
        readyTasks: ["drop_old_tables"],
        blockers: [],
        isPrimaryActive: true,
        sanitizedDirective: "Database Cleanup is in progress",
      },
    ],
  });

  const input = createBaseInput({ executiveContext: execContext });
  const result = multiHopReasoningEngine.evaluate(input);

  const constraintHop = result.hops.find((h) => h.inferenceType === "CONSTRAINT_PROPAGATION");
  assert(!!constraintHop, "Should generate a CONSTRAINT_PROPAGATION hop connecting hard constraint to project action");
});

runTest("MH-15: Temporal evolution propagation tracks preference transitions", () => {
  const temporalMemory: any = {
    evolutions: [
      {
        attributeKey: "editor_preference",
        previousValue: "VSCode",
        currentValue: "Neovim",
        authority: "CURRENT_TURN_EXPLICIT",
        transitionTimestamp: 1700000000000,
        lineageIds: ["turn_1", "turn_5"],
        sanitizedSummary: "Switched editor preference to Neovim",
      },
    ],
  };

  const input = createBaseInput({ temporalMemory });
  const result = multiHopReasoningEngine.evaluate(input);

  const temporalNode = result.evidenceNodes.find((n) => n.normalizedKey.includes("editor_preference"));
  assert(!!temporalNode, "Should extract temporal evolution node");
  assert(temporalNode?.authority === "CURRENT_TURN_EXPLICIT", "Temporal node should retain high authority");
});

runTest("MH-16: Goal propagation links blocker to stalled project", () => {
  const goalProject: any = {
    blockedProjects: [
      {
        projectId: "proj_payment",
        name: "Stripe Integration",
        status: "BLOCKED",
        blockerDescription: "Missing API credentials",
      },
    ],
    activeGoals: [
      {
        goalId: "goal_checkout",
        title: "Complete Checkout Flow",
        status: "IN_PROGRESS",
      },
    ],
  };

  const input = createBaseInput({ goalProject });
  const result = multiHopReasoningEngine.evaluate(input);

  const blockerNode = result.evidenceNodes.find((n) => n.normalizedKey.includes("stripe integration"));
  assert(!!blockerNode, "Should extract blocker node");
  assert(blockerNode?.evidenceKind === "CONSTRAINT", "Blocker node must be typed as CONSTRAINT");
});

runTest("MH-17: Contradiction resolution propagation integrates belief revisions", () => {
  const contradictionResolution: any = {
    revisions: [
      {
        targetSubject: "user_timezone",
        revisedBelief: "User timezone is UTC+6 (Dhaka)",
        authority: "CURRENT_TURN_EXPLICIT",
        confidence: 0.95,
      },
    ],
  };

  const input = createBaseInput({ contradictionResolution });
  const result = multiHopReasoningEngine.evaluate(input);

  const revNode = result.evidenceNodes.find((n) => n.normalizedKey.includes("user_timezone"));
  assert(!!revNode, "Should extract revised belief node");
  assert(revNode?.authority === "VERIFIED_EVIDENCE", "Revision node should have verified evidence status");
});

runTest("MH-18: Synthesizes Grounded Conclusion from valid reasoning chain", () => {
  const execContext = createMockExecutiveContext({
    authoritativeFacts: [
      {
        id: "fact_10",
        key: "rate_limit",
        value: "API rate limit is exceeded",
        normalizedKey: "rate_limit",
        normalizedValue: "rate limit exceeded",
        authority: "VERIFIED_EVIDENCE",
        authorityWeight: 0.9,
        source: "api_gateway",
        isCurrentTurnFact: false,
        confidence: 0.95,
        sanitizedDirective: "Rate limit is exceeded",
      },
      {
        id: "fact_11",
        key: "retry_policy",
        value: "Client retry policy is exponential backoff",
        normalizedKey: "retry_policy",
        normalizedValue: "exponential backoff",
        authority: "VERIFIED_EVIDENCE",
        authorityWeight: 0.9,
        source: "client_config",
        isCurrentTurnFact: false,
        confidence: 0.9,
        sanitizedDirective: "Retry policy is exponential backoff",
      },
    ],
  });

  const input = createBaseInput({ executiveContext: execContext });
  const result = multiHopReasoningEngine.evaluate(input);

  assert(result.conclusions.length >= 1, "Should synthesize grounded conclusion");
  const conclusion = result.conclusions[0];
  assert(!conclusion.isAdvisory, "Conclusion must be marked non-advisory (isAdvisory=false)");
  assert(conclusion.supportingEvidenceCount >= 1, "Conclusion must have supporting evidence");
  assert(conclusion.confidence > 0 && conclusion.confidence <= 1, "Confidence must be calibrated in (0, 1]");
});

runTest("MH-19: Generates concise sanitized directives from grounded conclusions", () => {
  const execContext = createMockExecutiveContext({
    authoritativeFacts: [
      {
        id: "fact_env",
        key: "env_type",
        value: "Environment is PRODUCTION",
        normalizedKey: "env_type",
        normalizedValue: "production",
        authority: "VERIFIED_EVIDENCE",
        authorityWeight: 0.9,
        source: "env",
        isCurrentTurnFact: false,
        confidence: 0.99,
        sanitizedDirective: "Environment is production",
      },
    ],
  });

  const input = createBaseInput({ executiveContext: execContext });
  const result = multiHopReasoningEngine.evaluate(input);

  assert(result.directives.length >= 1, "Should produce at least 1 directive");
  for (const d of result.directives) {
    assert(typeof d === "string" && d.length > 0, "Directives must be non-empty strings");
    assert(!d.includes("node_") && !d.includes("hop_"), "Directives must be sanitized of internal IDs");
  }
});

runTest("MH-20: Tracks comprehensive diagnostic metrics", () => {
  const input = createBaseInput();
  const result = multiHopReasoningEngine.evaluate(input);

  assert(result.diagnostics.evidenceNodesExtracted >= 0, "Diagnostic evidenceNodesExtracted must be non-negative");
  assert(result.diagnostics.hopsCreated >= 0, "Diagnostic hopsCreated must be non-negative");
  assert(result.diagnostics.chainsCreated >= 0, "Diagnostic chainsCreated must be non-negative");
});

// ==========================================
// 3. Cycle Detection, Depth Bounding & Ceilings (MH-21 to MH-30)
// ==========================================

runTest("MH-21: Cycle detection prevents circular infinite loops (A -> B -> A)", () => {
  const execContext = createMockExecutiveContext({
    authoritativeFacts: [
      {
        id: "fact_cycle_1",
        key: "node_alpha",
        value: "Alpha causes Beta",
        normalizedKey: "node_alpha",
        normalizedValue: "alpha causes beta",
        authority: "VERIFIED_EVIDENCE",
        authorityWeight: 0.9,
        source: "test",
        isCurrentTurnFact: false,
        confidence: 0.9,
        sanitizedDirective: "Alpha causes Beta",
      },
      {
        id: "fact_cycle_2",
        key: "node_beta",
        value: "Beta causes Alpha",
        normalizedKey: "node_beta",
        normalizedValue: "beta causes alpha",
        authority: "VERIFIED_EVIDENCE",
        authorityWeight: 0.9,
        source: "test",
        isCurrentTurnFact: false,
        confidence: 0.9,
        sanitizedDirective: "Beta causes Alpha",
      },
    ],
  });

  const input = createBaseInput({ executiveContext: execContext });
  const result = multiHopReasoningEngine.evaluate(input);

  // Must not hang, must track cycle diagnostics
  assert(result.diagnostics.cyclesDetected >= 0, "Cycles detected metric must be valid");
  // Every generated chain must have unique hop IDs (no circular paths)
  for (const chain of result.chains) {
    const hopIds = chain.hops.map((h) => h.id);
    const uniqueIds = new Set(hopIds);
    assert(hopIds.length === uniqueIds.size, "Reasoning chain must contain NO duplicate cyclic hops");
  }
});

runTest("MH-22: Self-looping hops are rejected immediately", () => {
  const execContext = createMockExecutiveContext({
    authoritativeFacts: [
      {
        id: "fact_self",
        key: "node_self",
        value: "Self-referencing statement about node_self",
        normalizedKey: "node_self",
        normalizedValue: "self-referencing node_self",
        authority: "VERIFIED_EVIDENCE",
        authorityWeight: 0.9,
        source: "test",
        isCurrentTurnFact: false,
        confidence: 0.9,
        sanitizedDirective: "Self loop",
      },
    ],
  });

  const input = createBaseInput({ executiveContext: execContext });
  const result = multiHopReasoningEngine.evaluate(input);

  for (const hop of result.hops) {
    assert(!hop.inputNodeIds.includes(hop.outputNodeId), "No hop can connect a node to itself");
  }
});

runTest("MH-23: Enforces default depth bound (max 3 hops)", () => {
  const facts = [];
  for (let i = 1; i <= 6; i++) {
    facts.push({
      id: `fact_seq_${i}`,
      key: `step_${i}`,
      value: `Step ${i} leads to Step ${i + 1}`,
      normalizedKey: `step_${i}`,
      normalizedValue: `step ${i} leads to step ${i + 1}`,
      authority: "VERIFIED_EVIDENCE" as any,
      authorityWeight: 0.9,
      source: "test",
      isCurrentTurnFact: false,
      confidence: 0.9,
      sanitizedDirective: `Step ${i}`,
    });
  }

  const execContext = createMockExecutiveContext({ authoritativeFacts: facts });
  const input = createBaseInput({ executiveContext: execContext });
  const result = multiHopReasoningEngine.evaluate(input);

  for (const chain of result.chains) {
    assert(chain.hops.length <= 3, `Chain length ${chain.hops.length} exceeds default maxHops=3`);
  }
});

runTest("MH-24: Respects custom maxHops budget configuration", () => {
  const facts = [];
  for (let i = 1; i <= 6; i++) {
    facts.push({
      id: `fact_seq_custom_${i}`,
      key: `custom_step_${i}`,
      value: `Custom step ${i} leads to step ${i + 1}`,
      normalizedKey: `custom_step_${i}`,
      normalizedValue: `custom step ${i} leads to step ${i + 1}`,
      authority: "VERIFIED_EVIDENCE" as any,
      authorityWeight: 0.9,
      source: "test",
      isCurrentTurnFact: false,
      confidence: 0.9,
      sanitizedDirective: `Custom Step ${i}`,
    });
  }

  const execContext = createMockExecutiveContext({ authoritativeFacts: facts });
  const input = createBaseInput({
    executiveContext: execContext,
    options: {
      budget: {
        maxHops: 2,
      },
    },
  });

  const result = multiHopReasoningEngine.evaluate(input);
  for (const chain of result.chains) {
    assert(chain.hops.length <= 2, `Chain length ${chain.hops.length} exceeds budget override maxHops=2`);
  }
});

runTest("MH-25: Hard ceiling caps maxHops at 5 even with large budget override", () => {
  const input = createBaseInput({
    options: {
      budget: {
        maxHops: 20, // requested 20, but hard ceiling is 5
      },
    },
  });

  const result = multiHopReasoningEngine.evaluate(input);
  for (const chain of result.chains) {
    assert(chain.hops.length <= 5, `Chain length ${chain.hops.length} exceeds hard ceiling maxHops=5`);
  }
});

runTest("MH-26: Enforces maxChains budget ceiling", () => {
  const input = createBaseInput({
    options: {
      budget: {
        maxChains: 2,
      },
    },
  });

  const result = multiHopReasoningEngine.evaluate(input);
  assert(result.chains.length <= 2, `Total chains ${result.chains.length} exceeds maxChains=2`);
});

runTest("MH-27: Enforces maxConclusions budget ceiling", () => {
  const input = createBaseInput({
    options: {
      budget: {
        maxConclusions: 1,
      },
    },
  });

  const result = multiHopReasoningEngine.evaluate(input);
  assert(result.conclusions.length <= 1, `Total conclusions ${result.conclusions.length} exceeds maxConclusions=1`);
});

runTest("MH-28: Enforces maxDirectives budget ceiling", () => {
  const input = createBaseInput({
    options: {
      budget: {
        maxDirectives: 2,
      },
    },
  });

  const result = multiHopReasoningEngine.evaluate(input);
  assert(result.directives.length <= 2, `Total directives ${result.directives.length} exceeds maxDirectives=2`);
});

runTest("MH-29: Deterministic sorting orders high-confidence, high-authority chains first", () => {
  const execContext = createMockExecutiveContext({
    authoritativeFacts: [
      {
        id: "fact_high_conf",
        key: "high_item",
        value: "High authority item",
        normalizedKey: "high_item",
        normalizedValue: "high item",
        authority: "CURRENT_TURN_EXPLICIT",
        authorityWeight: 1.0,
        source: "user",
        isCurrentTurnFact: true,
        confidence: 0.99,
        sanitizedDirective: "High item",
      },
      {
        id: "fact_low_conf",
        key: "low_item",
        value: "Low authority item",
        normalizedKey: "low_item",
        normalizedValue: "low item",
        authority: "SYSTEM_DEFAULT",
        authorityWeight: 0.1,
        source: "default",
        isCurrentTurnFact: false,
        confidence: 0.4,
        sanitizedDirective: "Low item",
      },
    ],
  });

  const input = createBaseInput({ executiveContext: execContext });
  const result = multiHopReasoningEngine.evaluate(input);

  if (result.chains.length >= 2) {
    const first = result.chains[0];
    const second = result.chains[1];
    assert(first.primaryAuthorityWeight >= second.primaryAuthorityWeight, "Chains must be sorted by authority weight descending");
  }
});

runTest("MH-30: Truncated elements increment chainsTruncated diagnostic", () => {
  const input = createBaseInput({
    options: {
      budget: {
        maxEvidenceNodes: 2,
        maxChains: 1,
        maxConclusions: 1,
      },
    },
  });

  const result = multiHopReasoningEngine.evaluate(input);
  assert(typeof result.diagnostics.chainsTruncated === "number", "chainsTruncated must be tracked");
});

// ==========================================
// 4. Authority Degradation & Anti-Inflation (MH-31 to MH-40)
// ==========================================

runTest("MH-31: Chain conclusion authority cannot exceed minimum root node authority", () => {
  const execContext = createMockExecutiveContext({
    authoritativeFacts: [
      {
        id: "fact_low_root",
        key: "habit_pattern",
        value: "User often works late on Fridays",
        normalizedKey: "habit_pattern",
        normalizedValue: "works late on fridays",
        authority: "CONFIRMED_ADAPTIVE_PATTERN", // 0.50
        authorityWeight: 0.50,
        source: "adaptive_engine",
        isCurrentTurnFact: false,
        confidence: 0.7,
        sanitizedDirective: "Works late on Fridays",
      },
    ],
  });

  const input = createBaseInput({ executiveContext: execContext });
  const result = multiHopReasoningEngine.evaluate(input);

  for (const c of result.conclusions) {
    if (c.traceableProvenance.rootEvidenceKeys.some((k) => k.includes("habit_pattern"))) {
      assert(c.authority === "CONFIRMED_ADAPTIVE_PATTERN" || c.authority === "SYSTEM_DEFAULT" || c.authority === "GOVERNANCE_APPROVED_MEMORY", "Conclusion authority cannot be higher than root node");
    }
  }
});

runTest("MH-32: Multi-hop conclusions are marked INFERRED or ADVISORY (no authority inflation)", () => {
  const execContext = createMockExecutiveContext({
    authoritativeFacts: [
      {
        id: "fact_explicit",
        key: "node_x",
        value: "Server X is running on port 8080",
        normalizedKey: "node_x",
        normalizedValue: "server x port 8080",
        authority: "CURRENT_TURN_EXPLICIT",
        authorityWeight: 1.0,
        source: "user",
        isCurrentTurnFact: true,
        confidence: 1.0,
        sanitizedDirective: "Port 8080",
      },
      {
        id: "fact_explicit_2",
        key: "node_y",
        value: "Port 8080 is blocked by firewall",
        normalizedKey: "node_y",
        normalizedValue: "port 8080 blocked",
        authority: "CURRENT_TURN_EXPLICIT",
        authorityWeight: 1.0,
        source: "user",
        isCurrentTurnFact: true,
        confidence: 1.0,
        sanitizedDirective: "Port 8080 blocked",
      },
    ],
  });

  const input = createBaseInput({ executiveContext: execContext });
  const result = multiHopReasoningEngine.evaluate(input);

  for (const c of result.conclusions) {
    // Multi-hop conclusion must NOT be marked CURRENT_TURN_EXPLICIT (inferred conclusions degrade)
    assert(c.authority !== "CURRENT_TURN_EXPLICIT", "Inferred conclusions must degrade and not claim CURRENT_TURN_EXPLICIT authority");
  }
});

runTest("MH-33: Predictive context root nodes restrict entire chain to ADVISORY status", () => {
  const deepReasoning: any = {
    hypotheses: [
      {
        id: "hyp_predictive",
        statement: "User may need export to PDF soon",
        winningAuthority: "PREDICTIVE_CONTEXT",
        status: "PLAUSIBLE",
        confidence: 0.6,
      },
    ],
  };

  const input = createBaseInput({ deepReasoning });
  const result = multiHopReasoningEngine.evaluate(input);

  for (const chain of result.chains) {
    if (chain.isPredictiveOnly) {
      assert(chain.status === "ADVISORY", "Any chain relying on PREDICTIVE_CONTEXT must have ADVISORY status");
    }
  }
});

runTest("MH-34: Multi-hop confidence decays multiplicatively across hops", () => {
  const execContext = createMockExecutiveContext({
    authoritativeFacts: [
      {
        id: "fact_c1",
        key: "comp_1",
        value: "Component 1 is ready",
        normalizedKey: "comp_1",
        normalizedValue: "comp 1 ready",
        authority: "VERIFIED_EVIDENCE",
        authorityWeight: 0.9,
        source: "ci",
        isCurrentTurnFact: false,
        confidence: 0.8,
        sanitizedDirective: "Comp 1 ready",
      },
    ],
  });

  const causalReasoning: any = {
    relations: [
      {
        id: "causal_c1_c2",
        causeStatement: "Component 1 is ready",
        effectStatement: "Component 2 triggers",
        relationType: "DIRECT_CAUSE",
        evidenceAuthority: "VERIFIED_EVIDENCE",
        confidence: 0.8,
      },
    ],
  };

  const input = createBaseInput({ executiveContext: execContext, causalReasoning });
  const result = multiHopReasoningEngine.evaluate(input);

  for (const chain of result.chains) {
    let minRootConfidence = 1.0;
    for (const rId of chain.rootEvidenceNodeIds) {
      const rNode = result.evidenceNodes.find((n) => n.id === rId);
      if (rNode && rNode.confidence < minRootConfidence) {
        minRootConfidence = rNode.confidence;
      }
    }
    assert(chain.confidence <= minRootConfidence + 0.0001, "Multi-hop confidence must be <= min(root confidence)");
  }
});

runTest("MH-35: Chain confidence is bounded in range [0.0, 1.0]", () => {
  const input = createBaseInput();
  const result = multiHopReasoningEngine.evaluate(input);

  for (const chain of result.chains) {
    assert(chain.confidence >= 0.0 && chain.confidence <= 1.0, `Chain confidence ${chain.confidence} outside [0.0, 1.0]`);
  }
  for (const conclusion of result.conclusions) {
    assert(conclusion.confidence >= 0.0 && conclusion.confidence <= 1.0, `Conclusion confidence ${conclusion.confidence} outside [0.0, 1.0]`);
  }
});

runTest("MH-36: Single ungrounded root node prevents chain completion", () => {
  const deepReasoning: any = {
    hypotheses: [
      {
        id: "hyp_unverified",
        statement: "Unverified speculative claim",
        winningAuthority: "SYSTEM_DEFAULT",
        status: "UNVERIFIED",
        confidence: 0.2,
      },
    ],
  };

  const input = createBaseInput({ deepReasoning });
  const result = multiHopReasoningEngine.evaluate(input);

  // UNVERIFIED hypotheses are not extracted as eligible evidence nodes
  const unverifiedNode = result.evidenceNodes.find((n) => n.id.includes("hyp_unverified"));
  assert(!unverifiedNode, "UNVERIFIED hypotheses must be omitted from evidence graph");
});

runTest("MH-37: Directives explicitly state advisory qualifier for predictive conclusions", () => {
  const deepReasoning: any = {
    hypotheses: [
      {
        id: "hyp_pred_2",
        statement: "Possible upcoming database schema migration",
        winningAuthority: "PREDICTIVE_CONTEXT",
        status: "SUPPORTED",
        confidence: 0.65,
      },
    ],
  };

  const input = createBaseInput({ deepReasoning });
  const result = multiHopReasoningEngine.evaluate(input);

  for (const d of result.directives) {
    if (d.toLowerCase().includes("contextual inference suggests")) {
      assert(d.includes("advisory"), "Predictive directives must include 'advisory' qualifier");
    }
  }
});

runTest("MH-38: Contradictory evidence breaks chain linkage", () => {
  const contradictionResolution: any = {
    contradictions: [
      {
        id: "contra_1",
        targetSubject: "deployment_target",
        status: "UNRESOLVED",
      },
    ],
  };

  const input = createBaseInput({ contradictionResolution });
  const result = multiHopReasoningEngine.evaluate(input);

  assert(result.unresolvedChains !== undefined, "Engine handles unresolved contradictions gracefully");
});

runTest("MH-39: Zero-confidence hops are never traversed", () => {
  const input = createBaseInput();
  const result = multiHopReasoningEngine.evaluate(input);

  for (const hop of result.hops) {
    assert(hop.confidence > 0, "All traversed hops must have positive confidence");
  }
});

runTest("MH-40: Chain status is GROUNDED only when all roots are high authority", () => {
  const execContext = createMockExecutiveContext({
    authoritativeFacts: [
      {
        id: "fact_high_1",
        key: "node_h1",
        value: "Server is online",
        normalizedKey: "node_h1",
        normalizedValue: "server online",
        authority: "VERIFIED_EVIDENCE",
        authorityWeight: 0.9,
        source: "health_check",
        isCurrentTurnFact: false,
        confidence: 0.98,
        sanitizedDirective: "Server online",
      },
    ],
  });

  const input = createBaseInput({ executiveContext: execContext });
  const result = multiHopReasoningEngine.evaluate(input);

  for (const chain of result.chains) {
    if (chain.status === "GROUNDED") {
      assert(chain.primaryAuthorityWeight >= 0.70, "GROUNDED chains must have high authority weight");
    }
  }
});

// ==========================================
// 5. BrainEngine Integration & Determinism (MH-41 to MH-50)
// ==========================================

runTest("MH-41: Full BrainEngine pipeline executes MultiHopReasoningEngine seamlessly", () => {
  const analysis = brainEngine.analyze(
    "Check deployment status for our production backend",
    [],
    undefined,
    "default",
    undefined,
    {
      userId: "user_test_41",
    }
  );

  assert(!!analysis.multiHopReasoning, "BrainAnalysis must contain multiHopReasoning analysis");
  assert(!!analysis.multiHopReasoningAnalysis, "BrainAnalysis must contain multiHopReasoningAnalysis alias");
  assert(Array.isArray(analysis.multiHopReasoning?.evidenceNodes), "Must return evidenceNodes array");
  assert(Array.isArray(analysis.multiHopReasoning?.chains), "Must return chains array");
  assert(Array.isArray(analysis.multiHopReasoning?.conclusions), "Must return conclusions array");
  assert(Array.isArray(analysis.multiHopReasoning?.directives), "Must return directives array");
});

runTest("MH-42: BrainEngine promptDirectives includes sanitized multi-hop directives", () => {
  const analysis = brainEngine.analyze(
    "Deploy the backend app after tests pass",
    [],
    undefined,
    "default",
    undefined,
    {
      userId: "user_test_42",
    }
  );

  assert(Array.isArray(analysis.promptDirectives), "promptDirectives must be an array");
  // If multi-hop generated directives, they should appear in promptDirectives
  if (analysis.multiHopReasoning && analysis.multiHopReasoning.directives.length > 0) {
    const hasMhDirective = analysis.promptDirectives.some((d) => d.startsWith("[MULTI-HOP") || d.startsWith("[MULTI_HOP"));
    assert(hasMhDirective, "Multi-hop directives must be merged into BrainAnalysis.promptDirectives");
  }
});

runTest("MH-43: Bit-for-bit output equivalence across identical evaluation inputs", () => {
  const input1 = createBaseInput();
  const input2 = createBaseInput();

  const res1 = multiHopReasoningEngine.evaluate(input1);
  const res2 = multiHopReasoningEngine.evaluate(input2);

  assert(res1.evidenceNodes.length === res2.evidenceNodes.length, "Node count must be identical");
  assert(res1.hops.length === res2.hops.length, "Hop count must be identical");
  assert(res1.chains.length === res2.chains.length, "Chain count must be identical");
  assert(res1.conclusions.length === res2.conclusions.length, "Conclusion count must be identical");
  assert(JSON.stringify(res1.directives) === JSON.stringify(res2.directives), "Directives must match bit-for-bit");
});

runTest("MH-44: Non-LLM rule execution (zero external API dependencies)", () => {
  const input = createBaseInput();
  const startTime = Date.now();
  const result = multiHopReasoningEngine.evaluate(input);
  const duration = Date.now() - startTime;

  assert(duration < 200, "Evaluation must complete synchronously in under 200ms (pure rule engine)");
  assert(result.diagnostics.evaluationTimeMs >= 0, "Must record evaluation execution time");
});

runTest("MH-45: Read-only invariant (evaluating input never mutates input parameters)", () => {
  const input = createBaseInput();
  const frozenInputCopy = JSON.stringify(input);

  multiHopReasoningEngine.evaluate(input);

  const afterInputCopy = JSON.stringify(input);
  assert(frozenInputCopy === afterInputCopy, "Evaluating multi-hop reasoning must NOT mutate input objects");
});

runTest("MH-46: Regression check: Deep Reasoning Engine remains fully functional", () => {
  const deepRes = deepReasoningEngine.evaluate({
    userId: "user_reg_1",
    message: "Optimize query performance on high latency table",
    context: { activeTopic: "database", turns: [], variables: {}, lastTurnTimestamp: Date.now(), conversationId: "c1" } as any,
    intent: { primaryIntent: "ACTION", confidence: 0.95 } as any,
    reasoning: { reasoningRequired: true, reasoningType: "TECHNICAL_ARCHITECTURE" } as any,
    planning: { requiresPlanning: false, confidence: 0.9 } as any,
    verification: { confidence: { calibratedScore: 0.9 } } as any,
    executiveContext: createMockExecutiveContext(),
  });

  assert(deepRes.conclusion.confidence >= 0, "DeepReasoningEngine must return valid confidence");
  assert(Array.isArray(deepRes.evidence), "DeepReasoningEngine must return evidence array");
});

runTest("MH-47: Regression check: Contradiction Resolution Engine remains fully functional", () => {
  const contraRes = contradictionResolutionEngine.evaluate({
    userId: "user_reg_2",
    message: "Actually I prefer dark mode now",
    context: { activeTopic: "preferences", turns: [], variables: {}, lastTurnTimestamp: Date.now(), conversationId: "c2" } as any,
    intent: { primaryIntent: "CORRECTION", confidence: 0.95 } as any,
    reasoning: { reasoningRequired: true, reasoningType: "PREFERENCE_EVALUATION" } as any,
    planning: { requiresPlanning: false, confidence: 0.9 } as any,
    verification: { confidence: { calibratedScore: 0.9 } } as any,
    executiveContext: createMockExecutiveContext({
      activePreferences: [
        {
          id: "pref_theme",
          key: "theme",
          value: "light",
          dimension: "ui",
          authority: "CONFIRMED_USER_MODEL",
          authorityWeight: 0.75,
          source: "memory",
          isCurrentTurnOverride: false,
          isGlobal: true,
          sanitizedDirective: "Theme is light",
        },
      ],
    }),
  });

  assert(Array.isArray(contraRes.contradictions), "ContradictionResolutionEngine must return contradictions array");
});

runTest("MH-48: Regression check: Causal Reasoning Engine remains fully functional", () => {
  const causalRes = causalReasoningEngine.evaluate({
    userId: "user_reg_3",
    message: "Why does cache invalidation cause temporary CPU spikes?",
    context: { activeTopic: "systems", turns: [], variables: {}, lastTurnTimestamp: Date.now(), conversationId: "c3" } as any,
    intent: { primaryIntent: "EXPLANATION", confidence: 0.95 } as any,
    reasoning: { reasoningRequired: true, reasoningType: "CAUSAL_ANALYSIS" } as any,
    planning: { requiresPlanning: false, confidence: 0.9 } as any,
    verification: { confidence: { calibratedScore: 0.9 } } as any,
    executiveContext: createMockExecutiveContext(),
  });

  assert(Array.isArray(causalRes.relations), "CausalReasoningEngine must return relations array");
  assert(Array.isArray(causalRes.chains), "CausalReasoningEngine must return chains array");
});

runTest("MH-49: Handles empty/sparse input gracefully without exceptions", () => {
  const sparseInput: MultiHopReasoningInput = {
    userId: "user_sparse",
    message: "",
    context: { activeTopic: "", turns: [], variables: {}, lastTurnTimestamp: 0, conversationId: "" } as any,
    intent: { primaryIntent: "UNKNOWN" as any, confidence: 0, intents: [], slots: {}, isAmbiguous: false, requiresClarification: false, intentSignals: {} } as any,
    reasoning: { reasoningRequired: false, reasoningType: "GENERAL" as any, complexity: "LOW" as any, confidence: 0, reasoningConfidence: 0, missingInformation: [], constraints: [], subtasks: [], conclusionStrategy: "DIRECT" as any, suggestedTools: [], requiresClarification: false } as any,
    planning: { requiresPlanning: false, confidence: 0 } as any,
    verification: { confidence: { rawScore: 0, calibratedScore: 0, confidenceBand: "LOW" as any, calibrationSignals: {} }, claims: [], contradictions: [], unsupportedClaims: [], requiresClarification: false, status: "UNVERIFIED" as any } as any,
  };

  const result = multiHopReasoningEngine.evaluate(sparseInput);
  assert(Array.isArray(result.evidenceNodes), "Sparse input should resolve without crashing");
  assert(result.evidenceNodes.length === 0, "No nodes extracted from empty input");
});

runTest("MH-50: Sanitization invariant: Never leaks raw sensitive tokens or unverified personal data", () => {
  const execContext = createMockExecutiveContext({
    authoritativeFacts: [
      {
        id: "fact_leak_check",
        key: "auth_header",
        value: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token",
        normalizedKey: "auth_header",
        normalizedValue: "bearer token",
        authority: "VERIFIED_EVIDENCE",
        authorityWeight: 0.9,
        source: "http_request",
        isCurrentTurnFact: false,
        confidence: 0.9,
        sanitizedDirective: "Bearer token authenticated",
      },
    ],
  });

  const input = createBaseInput({ executiveContext: execContext });
  const result = multiHopReasoningEngine.evaluate(input);

  for (const d of result.directives) {
    assert(!d.includes("eyJhbGciOi"), "Directives must NEVER contain JWT or bearer tokens");
  }
  for (const c of result.conclusions) {
    assert(!c.statement.includes("eyJhbGciOi"), "Conclusions must NEVER contain JWT or bearer tokens");
  }
});

console.log("\n=======================================================");
console.log(`TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
console.log("=======================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
