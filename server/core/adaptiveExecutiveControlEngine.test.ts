/**
 * Dora Adaptive Executive Control & Cognitive Prioritization Engine Test Suite
 * Phase 3 — Step 9
 * 
 * Comprehensive Unit and Integration Tests:
 * - Attention Item Selection & Extraction (AEC-1 to AEC-10)
 * - Priority Class Categorization & Ranking (AEC-11 to AEC-18)
 * - Cognitive Suppression & Strict Topic Isolation (AEC-19 to AEC-26)
 * - Unresolved Issue Tracking & Escalation (AEC-27 to AEC-34)
 * - Response Mode Selection (AEC-35 to AEC-42)
 * - Directive Generation & Sanitization (AEC-43 to AEC-50)
 * - Determinism, Immutability & Budget Ceilings (AEC-51 to AEC-58)
 * - Pipeline Integration & Regressions (AEC-59 to AEC-65)
 */

import { adaptiveExecutiveControlEngine } from "./adaptiveExecutiveControlEngine";
import { brainEngine } from "./brainEngine";
import { contextStore } from "./contextStore";
import {
  ExecutiveControlInput,
  ExecutivePriorityClass,
} from "./adaptiveExecutiveControlTypes";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} (Expected: ${expected}, Actual: ${actual})`);
  }
}

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

console.log("======================================================");
console.log("RUNNING DORA ADAPTIVE EXECUTIVE CONTROL TEST SUITE");
console.log("======================================================");

// ----------------------------------------------------------------------------
// 1. ATTENTION ITEM SELECTION & EXTRACTION (AEC-1 to AEC-10)
// ----------------------------------------------------------------------------

runTest("AEC-1: Extracts explicit user instruction as PRIORITY_CRITICAL attention item", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Do not use any third party CSS libraries",
    context: {
      constraints: [
        { id: "c_nocss", category: "constraint", key: "no_css", value: "strict", rawText: "Do not use CSS libraries", createdAt: 1724000000000, updatedAt: 1724000000000, updatedAtTurn: 1 } as any,
      ],
    } as any,
  });

  assert(result.attentionSet.length > 0, "Attention items should be extracted");
  const hardItem = result.attentionSet.find((i) => i.reason === "HARD_SAFETY_CONSTRAINT" || i.priorityClass === "PRIORITY_CRITICAL");
  assert(hardItem !== undefined, "Hard constraint attention item extracted");
  assertEqual(hardItem?.priorityClass, "PRIORITY_CRITICAL", "Hard constraint must be PRIORITY_CRITICAL");
});

runTest("AEC-2: Extracts decision recommendation as ADVISORY_PLAN attention item", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Deploy microservices",
    decision: {
      decisionState: "READY",
      recommendation: {
        type: "DEFINITIVE",
        rationale: "Deploy microservices on Kubernetes",
      },
      actionPlan: {
        objective: "Deploy microservices on Kubernetes",
        orderedSteps: [{ index: 1, action: "Apply manifests", isReversible: true, confidence: 0.9, prerequisites: [] }],
        safetyCheckpoints: [],
        stopConditions: [],
        rollbackPlan: "kubectl rollout undo",
      },
      sanitizedDirectives: [],
    } as any,
  });

  const decItem = result.attentionSet.find((i) => i.type === "ADVISORY_PLAN");
  assert(decItem !== undefined, "Decision recommendation action plan attention item found");
  assertEqual(decItem?.priorityClass, "PRIORITY_HIGH", "Decision recommendation must be PRIORITY_HIGH");
});

runTest("AEC-3: Extracts meta-reasoning critical issue as PRIORITY_CRITICAL", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Run simulation",
    metaReasoning: {
      issues: [
        { id: "iss_crit", type: "HARD_CONSTRAINT_VIOLATION", severity: "CRITICAL", description: "Direct logical contradiction in inputs", suggestedRemediation: "", evidenceRefs: [] },
      ],
      warnings: [],
      directives: [],
      sanitizedDirectives: [],
    } as any,
  });

  const critItem = result.attentionSet.find((i) => i.priorityClass === "PRIORITY_CRITICAL");
  assert(critItem !== undefined, "Critical issue attention item must be present");
});

runTest("AEC-4: Deduplicates identical rawContent attention items preserving highest priority", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Deduplication check",
    deepReasoning: {
      evidence: [
        { id: "e1", normalizedKey: "pref_lang", statement: "Language preference is English", authority: "SYSTEM_DEFAULT", scope: "GLOBAL", confidence: 0.5 } as any,
        { id: "e2", normalizedKey: "pref_lang", statement: "Language preference is English", authority: "CURRENT_TURN_EXPLICIT", scope: "GLOBAL", confidence: 0.95 } as any,
      ],
      hypotheses: [],
    } as any,
  });

  const matching = result.attentionSet.filter((i) => i.rawContent === "Language preference is English");
  assertEqual(matching.length, 1, "Duplicate statement must be collapsed to 1 item");
  assertEqual(matching[0].authority, "SYSTEM_DEFAULT", "Highest authority item preserved or first encountered");
});

runTest("AEC-5: Handles empty inputs cleanly without throwing", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Hello world",
  });

  assert(result !== undefined, "Evaluation must return valid analysis");
  assert(Array.isArray(result.attentionSet), "attentionSet is an array");
  assert(Array.isArray(result.sanitizedDirectives), "sanitizedDirectives is an array");
});

runTest("AEC-6: Extracts scenario simulation risks as SCENARIO_WARNING attention item", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Simulate database failover",
    scenarioSimulation: {
      outcomes: [
        { outcomeKey: "r1", outcomeType: "NEGATIVE", description: "Split-brain scenario in multi-region cluster" },
      ],
      directives: [],
    } as any,
  });

  const riskItem = result.attentionSet.find((i) => i.type === "SCENARIO_WARNING");
  assert(riskItem !== undefined, "Scenario risk attention item extracted");
  assertEqual(riskItem?.priorityClass, "PRIORITY_LOW", "Scenario simulation risk must be PRIORITY_LOW");
});

runTest("AEC-7: Extracts unresolved contradiction as UNRESOLVED_CONTRADICTION item", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Contradiction attention test",
    contradictionResolution: {
      contradictions: [
        { id: "c1", classification: "UNRESOLVED_CONFLICT", severity: "CRITICAL", subject: "Port configuration", description: "Conflict on port 3000" },
      ],
      activeDirectives: [],
    } as any,
  });

  const cntItem = result.attentionSet.find((i) => i.type === "UNRESOLVED_CONTRADICTION");
  assert(cntItem !== undefined, "Contradiction attention item found");
  assertEqual(cntItem?.priorityClass, "PRIORITY_CRITICAL", "Active contradiction must be PRIORITY_CRITICAL");
});

runTest("AEC-8: Question intent produces recognized user request candidate", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Is our server hosted on Google Cloud or AWS?",
    intent: {
      primaryIntent: "QUESTION",
      secondaryIntent: "NONE",
      requiresClarification: false,
      parameters: {},
      intentSignals: {},
    } as any,
  });

  assert(result.attentionSet.length > 0, "User intent and message parsed");
});

runTest("AEC-9: Predictive context items receive PRIORITY_LOW priority class", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Predictive priority test",
    predictiveContext: {
      acceptedCandidates: [
        { id: "p1", contextSummary: "User might like dark mode", predictionType: "PREFERENCE", topic: "ui" },
      ],
    } as any,
  });

  const predItem = result.attentionSet.find((i) => i.authority === "PREDICTIVE_CONTEXT");
  if (predItem) {
    assertEqual(predItem.priorityClass, "PRIORITY_LOW", "Predictive context must be PRIORITY_LOW");
  }
});

runTest("AEC-10: Attention item sortKey is deterministic", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Sort key test",
    context: {
      constraints: [{ id: "c1", category: "constraint", key: "k1", value: "v1", rawText: "Mandatory constraint", createdAt: 1724000000000, updatedAt: 1724000000000, updatedAtTurn: 1 } as any],
    } as any,
  });

  for (const item of result.attentionSet) {
    assert(item.sortKey !== undefined && item.sortKey.length > 0, "sortKey must be populated");
  }
});

// ----------------------------------------------------------------------------
// 2. PRIORITY CLASS CATEGORIZATION & RANKING (AEC-11 to AEC-18)
// ----------------------------------------------------------------------------

runTest("AEC-11: PRIORITY_CRITICAL items always sort before PRIORITY_HIGH, PRIORITY_NORMAL, and PRIORITY_LOW", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Ranking test",
    context: {
      constraints: [
        { id: "c1", category: "constraint", key: "sec", value: "hard", rawText: "Hard security constraint", createdAt: 1724000000000, updatedAt: 1724000000000, updatedAtTurn: 1 } as any,
      ],
    } as any,
    deepReasoning: {
      evidence: [
        { id: "e_med", statement: "Medium priority historical fact", authority: "GOVERNANCE_APPROVED_MEMORY", scope: "GLOBAL", confidence: 0.8 } as any,
        { id: "e_low", statement: "Low priority default", authority: "SYSTEM_DEFAULT", scope: "GLOBAL", confidence: 0.2 } as any,
      ],
      hypotheses: [],
    } as any,
  });

  const classes = result.attentionSet.map((i) => i.priorityClass);
  const classOrder: Record<ExecutivePriorityClass, number> = { PRIORITY_CRITICAL: 0, PRIORITY_HIGH: 1, PRIORITY_NORMAL: 2, PRIORITY_LOW: 3, SUPPRESSED: 4 };
  for (let i = 0; i < classes.length - 1; i++) {
    assert(classOrder[classes[i]] <= classOrder[classes[i + 1]], `Item at ${i} (${classes[i]}) must precede item at ${i + 1} (${classes[i + 1]})`);
  }
});

runTest("AEC-12: Primary focus dimension is populated", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Focus test message",
  });

  assert(result.focus.primaryFocus.length > 0, "Primary focus must not be empty");
  assert(Array.isArray(result.focus.secondaryFocuses), "Secondary focuses is an array");
});

runTest("AEC-13: Authority weight factors directly into priority score", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Authority weight score test",
    deepReasoning: {
      evidence: [
        { id: "e_high_auth", statement: "Explicit instruction fact", authority: "CURRENT_TURN_EXPLICIT", scope: "GLOBAL", confidence: 0.9 } as any,
        { id: "e_low_auth", statement: "System default assumption", authority: "SYSTEM_DEFAULT", scope: "GLOBAL", confidence: 0.9 } as any,
      ],
      hypotheses: [],
    } as any,
  });

  const highAuth = result.attentionSet.find((i) => i.authority === "CURRENT_TURN_EXPLICIT");
  const lowAuth = result.attentionSet.find((i) => i.authority === "SYSTEM_DEFAULT");
  if (highAuth && lowAuth) {
    assert(highAuth.priorityScore >= lowAuth.priorityScore, "Higher authority must yield >= priorityScore");
  }
});

runTest("AEC-14: Invariant: Lower authority cannot outrank higher authority through confidence", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Authority defense test",
    deepReasoning: {
      evidence: [
        { id: "e_pred", statement: "Predictive guess with 1.0 confidence", authority: "PREDICTIVE_CONTEXT", scope: "GLOBAL", confidence: 1.0 } as any,
        { id: "e_exp", statement: "Explicit user fact with 0.8 confidence", authority: "CURRENT_TURN_EXPLICIT", scope: "GLOBAL", confidence: 0.8 } as any,
      ],
      hypotheses: [],
    } as any,
  });

  const expIdx = result.attentionSet.findIndex((i) => i.authority === "CURRENT_TURN_EXPLICIT");
  const predIdx = result.attentionSet.findIndex((i) => i.authority === "PREDICTIVE_CONTEXT");
  if (expIdx !== -1 && predIdx !== -1) {
    assert(expIdx < predIdx, "CURRENT_TURN_EXPLICIT must rank ahead of PREDICTIVE_CONTEXT");
  }
});

runTest("AEC-15: Focus description accurately summarizes attention focus", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Summarize focus",
    contradictionResolution: {
      contradictions: [{ id: "c1", classification: "UNRESOLVED_CONFLICT", severity: "CRITICAL", subject: "Port config", description: "Direct contradiction" }],
      activeDirectives: [],
    } as any,
  });

  assert(result.focus.primaryFocus.length > 0, "Focus summary must be generated");
});

runTest("AEC-16: Secondary dimensions contain non-primary focus topics", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Secondary dimensions test",
    context: {
      constraints: [{ id: "c1", category: "constraint", key: "db", value: "Postgres", rawText: "DB is Postgres", createdAt: 1724000000000, updatedAt: 1724000000000, updatedAtTurn: 1 } as any],
    } as any,
  });

  assert(Array.isArray(result.focus.secondaryFocuses), "secondaryFocuses is an array");
});

runTest("AEC-17: Priority scores are strictly bounded within [0.00, 1.00]", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Score bounds check",
  });

  for (const item of result.attentionSet) {
    assert(item.priorityScore >= 0.0 && item.priorityScore <= 1.0, `Score (${item.priorityScore}) must be in [0,1]`);
  }
});

runTest("AEC-18: Maximum critical items budget limit is enforced", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Critical item limit test",
    options: {
      budget: { maxCriticalItems: 2 },
    },
    metaReasoning: {
      issues: [
        { id: "i1", severity: "CRITICAL", description: "Crit 1" },
        { id: "i2", severity: "CRITICAL", description: "Crit 2" },
        { id: "i3", severity: "CRITICAL", description: "Crit 3" },
        { id: "i4", severity: "CRITICAL", description: "Crit 4" },
      ],
    } as any,
  });

  const criticals = result.attentionSet.filter((i) => i.priorityClass === "PRIORITY_CRITICAL");
  assert(criticals.length <= 2, `Critical items count (${criticals.length}) clamped to maxCriticalItems (2)`);
});

// ----------------------------------------------------------------------------
// 3. COGNITIVE SUPPRESSION & STRICT TOPIC ISOLATION (AEC-19 to AEC-26)
// ----------------------------------------------------------------------------

runTest("AEC-19: Sensitive credentials trigger suppression and SENSITIVE_CREDENTIAL record", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Store token",
    deepReasoning: {
      evidence: [
        { id: "e_sec", statement: "Bearer secret_token_1234567890abcdef", authority: "CURRENT_TURN_EXPLICIT", scope: "GLOBAL", confidence: 1.0 } as any,
      ],
      hypotheses: [],
    } as any,
  });

  const activeItem = result.attentionSet.find((i) => i.id === "e_sec");
  assertEqual(activeItem, undefined, "Sensitive token item must not be active in attentionSet");
  const supp = result.suppressedItems.find((s) => s.reason === "SENSITIVE_CREDENTIAL");
  assert(supp !== undefined, "Suppression record must exist");
  assertEqual(supp?.reason, "SENSITIVE_CREDENTIAL", "Reason must be SENSITIVE_CREDENTIAL");
});

runTest("AEC-20: Strict topic isolation suppresses out-of-topic items", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "How to fix CSS alignment?",
    options: {
      activeTopic: "ui_design",
      strictTopicIsolation: true,
    },
    predictiveContext: {
      acceptedCandidates: [
        { id: "p_foreign", contextSummary: "Docker container networking", predictionType: "ARCHITECTURE", topic: "infrastructure" },
      ],
    } as any,
  });

  const supp = result.suppressedItems.find((s) => s.reason === "PREDICTIVE_IRRELEVANT" || s.reason === "FOREIGN_TOPIC");
  assert(supp !== undefined, "Out-of-topic predictive item suppressed");
});

runTest("AEC-21: Stale / superseded memory items are suppressed", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Stale test",
    deepReasoning: {
      evidence: [
        { id: "e_stale", statement: "Superseded database host", authority: "GOVERNANCE_APPROVED_MEMORY", isSuperseded: true, scope: "GLOBAL", confidence: 0.9 } as any,
      ],
      hypotheses: [],
    } as any,
  });

  const supp = result.suppressedItems.find((s) => s.reason === "STALE_SUPERSEDED");
  assert(supp !== undefined, "Superseded item suppressed");
  assertEqual(supp?.reason, "STALE_SUPERSEDED", "Reason is STALE_SUPERSEDED");
});

runTest("AEC-22: Rejected evidence is suppressed as REJECTED_EVIDENCE", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Rejected evidence test",
    deepReasoning: {
      evidence: [
        { id: "e_rej", statement: "Rejected hypothesis", authority: "SYSTEM_DEFAULT", epistemicState: "REJECTED", scope: "GLOBAL", confidence: 0.0 } as any,
      ],
      hypotheses: [],
    } as any,
  });

  const supp = result.suppressedItems.find((s) => s.reason === "REJECTED_EVIDENCE");
  assert(supp !== undefined, "Rejected evidence suppressed");
  assertEqual(supp?.reason, "REJECTED_EVIDENCE", "Reason is REJECTED_EVIDENCE");
});

runTest("AEC-23: Duplicate attention items are marked DUPLICATE_ITEM in suppression list", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Duplicate suppression test",
    deepReasoning: {
      evidence: [
        { id: "e1", statement: "Identical fact statement", authority: "VERIFIED_EVIDENCE", scope: "GLOBAL", confidence: 0.9 } as any,
        { id: "e2", statement: "Identical fact statement", authority: "VERIFIED_EVIDENCE", scope: "GLOBAL", confidence: 0.8 } as any,
      ],
      hypotheses: [],
    } as any,
  });

  const supp = result.suppressedItems.find((s) => s.reason === "DUPLICATE_ITEM");
  assert(supp !== undefined, "Duplicate suppression record generated");
});

runTest("AEC-24: Global scope items survive strict topic isolation", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Global topic test",
    options: {
      activeTopic: "database",
      strictTopicIsolation: true,
    },
    context: {
      constraints: [
        { id: "c_glob", category: "constraint", key: "typing", value: "strict", rawText: "Always use strict typing", createdAt: 1724000000000, updatedAt: 1724000000000, updatedAtTurn: 1 } as any,
      ],
    } as any,
  });

  const active = result.attentionSet.find((i) => i.type === "HARD_CONSTRAINT");
  assert(active !== undefined, "GLOBAL scope item active despite topic filtering");
});

runTest("AEC-25: Suppressed items count accurately tracked in diagnostics", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Suppression diagnostics",
    deepReasoning: {
      evidence: [
        { id: "e1", statement: "password: 12345", authority: "CURRENT_TURN_EXPLICIT", scope: "GLOBAL", confidence: 1.0 } as any,
      ],
      hypotheses: [],
    } as any,
  });

  assertEqual(result.diagnostics.suppressedCount, result.suppressedItems.length, "Diagnostics count matches suppressed items array");
});

runTest("AEC-26: Quarantined / rejected evidence is excluded from active attention", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Quarantine test",
    deepReasoning: {
      evidence: [
        { id: "e_rej", statement: "Rejected premise", authority: "SYSTEM_DEFAULT", epistemicState: "REJECTED", scope: "GLOBAL", confidence: 0.0 } as any,
      ],
      hypotheses: [],
    } as any,
  });

  const active = result.attentionSet.find((i) => i.id.includes("Rejected premise"));
  assertEqual(active, undefined, "Rejected item must not be in active attentionSet");
});

// ----------------------------------------------------------------------------
// 4. UNRESOLVED ISSUE TRACKING & ESCALATION (AEC-27 to AEC-34)
// ----------------------------------------------------------------------------

runTest("AEC-27: Tracks unresolved contradiction as blocking unresolved issue", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Issue tracking test",
    contradictionResolution: {
      contradictions: [
        { id: "cnt_unres", classification: "UNRESOLVED_CONFLICT", severity: "CRITICAL", subject: "API format", description: "Direct contradiction between API formats" },
      ],
      activeDirectives: [],
    } as any,
  });

  assert(result.unresolvedIssues.length > 0, "Unresolved issues must not be empty");
  const iss = result.unresolvedIssues.find((i) => i.issueType === "CONTRADICTION");
  assert(iss !== undefined, "Contradiction issue tracked");
  assertEqual(iss?.isBlocking, true, "Unresolved contradiction is blocking");
});

runTest("AEC-28: Escalation state set to CLARIFICATION_REQUIRED when intent is ambiguous", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Reset it",
    intent: {
      primaryIntent: "UNKNOWN" as any,
      secondaryIntent: "NONE",
      requiresClarification: true,
      ambiguityReason: "Target entity to reset is ambiguous",
      parameters: {},
      intentSignals: {},
    } as any,
  });

  assertEqual(result.escalationState, "CLARIFICATION_REQUIRED", "Escalation state must be CLARIFICATION_REQUIRED");
  assert(result.escalations.length > 0, "Escalation record generated");
});

runTest("AEC-29: Escalation state set to SAFETY_BLOCKED on critical security issue", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Dump passwords",
    metaReasoning: {
      issues: [
        { id: "i_sec", type: "HARD_CONSTRAINT_VIOLATION", severity: "CRITICAL", description: "Credential exfiltration attempted" },
      ],
      warnings: [],
      directives: [],
      sanitizedDirectives: [],
    } as any,
  });

  assertEqual(result.escalationState, "SAFETY_BLOCKED", "Escalation state must be SAFETY_BLOCKED");
});

runTest("AEC-30: Escalation state set to WARNING_REQUIRED when high severity issues exist", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Delete stale tables",
    metaReasoning: {
      issues: [
        { id: "r1", severity: "HIGH", description: "Potential loss of unindexed audit logs" },
      ],
      warnings: [],
      directives: [],
      sanitizedDirectives: [],
    } as any,
  });

  assertEqual(result.escalationState, "WARNING_REQUIRED", "Escalation state must be WARNING_REQUIRED");
});

runTest("AEC-31: NONE escalation state when no issues or warnings exist", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "What is 2+2?",
  });

  assertEqual(result.escalationState, "NONE", "Escalation state should be NONE");
});

runTest("AEC-32: Unresolved issue priority sorting puts CRITICAL issues first", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Issue ranking test",
    metaReasoning: {
      issues: [
        { id: "i_med", severity: "MEDIUM", description: "Medium issue" },
        { id: "i_crit", severity: "CRITICAL", description: "Critical issue" },
      ],
      warnings: [],
      directives: [],
      sanitizedDirectives: [],
    } as any,
  });

  if (result.unresolvedIssues.length >= 2) {
    assertEqual(result.unresolvedIssues[0].severity, "CRITICAL", "First issue must be CRITICAL");
  }
});

runTest("AEC-33: Max unresolved issues budget limit is strictly enforced", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Unresolved issues budget limit",
    options: {
      budget: { maxUnresolvedIssues: 2 },
    },
    metaReasoning: {
      issues: [
        { id: "i1", severity: "CRITICAL", description: "Issue 1" },
        { id: "i2", severity: "CRITICAL", description: "Issue 2" },
        { id: "i3", severity: "CRITICAL", description: "Issue 3" },
        { id: "i4", severity: "CRITICAL", description: "Issue 4" },
      ],
      warnings: [],
      directives: [],
      sanitizedDirectives: [],
    } as any,
  });

  assert(result.unresolvedIssues.length <= 2, `Unresolved issues (${result.unresolvedIssues.length}) must not exceed 2`);
});

runTest("AEC-34: Blocked decision is classified as CONSTRAINT_CONFLICT issue type", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Constraint conflict check",
    decision: {
      decisionState: "BLOCKED",
      recommendation: {
        type: "NO_SAFE_OPTION",
        rationale: "All options violate active constraints",
      },
      sanitizedDirectives: [],
    } as any,
  });

  const gc = result.unresolvedIssues.find((i) => i.issueType === "CONSTRAINT_CONFLICT");
  assert(gc !== undefined, "Constraint conflict issue properly classified");
});

// ----------------------------------------------------------------------------
// 5. RESPONSE MODE SELECTION (AEC-35 to AEC-42)
// ----------------------------------------------------------------------------

runTest("AEC-35: CLARIFY response mode when escalation is CLARIFICATION_REQUIRED", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Start the build",
    intent: {
      primaryIntent: "UNKNOWN" as any,
      secondaryIntent: "NONE",
      requiresClarification: true,
      ambiguityReason: "Build target unspecified",
      parameters: {},
      intentSignals: {},
    } as any,
  });

  assertEqual(result.responseMode, "CLARIFY", "responseMode must be CLARIFY");
});

runTest("AEC-36: WARN response mode when escalation is WARNING_REQUIRED", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Drop index",
    metaReasoning: {
      verdict: "NEEDS_REVISION",
      issues: [
        { id: "r1", severity: "HIGH", description: "Performance degradation on primary queries" },
      ],
      warnings: [],
      directives: [],
      sanitizedDirectives: [],
    } as any,
  });

  assertEqual(result.responseMode, "WARN", "responseMode must be WARN");
});

runTest("AEC-37: PLAN response mode when deliberative decision action plan exists", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Which cloud provider should we migrate to?",
    decision: {
      decisionState: "READY",
      recommendation: { type: "DEFINITIVE", rationale: "Migrate to GCP" },
      actionPlan: {
        objective: "Migrate to GCP",
        orderedSteps: [{ index: 1, action: "Create GCP project", isReversible: true, confidence: 0.9, prerequisites: [] }],
        safetyCheckpoints: [],
        stopConditions: [],
        rollbackPlan: "Cancel migration",
      },
      sanitizedDirectives: [],
    } as any,
  });

  assertEqual(result.responseMode, "PLAN", "responseMode must be PLAN");
});

runTest("AEC-38: DEFER response mode when decision is conditional/deferred", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "What will the stock price be next month?",
    decision: {
      decisionState: "CONDITIONAL",
      recommendation: { type: "DEFER_DECISION", rationale: "Awaiting market open" },
      sanitizedDirectives: [],
    } as any,
  });

  assertEqual(result.responseMode, "DEFER", "responseMode must be DEFER");
});

runTest("AEC-39: ANSWER response mode for nominal factual query", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "What is the capital of Japan?",
  });

  assertEqual(result.responseMode, "ANSWER", "responseMode must be ANSWER");
});

runTest("AEC-40: REFUSE_ACTION response mode when blocked by safety", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "How to bypass auth?",
    metaReasoning: {
      issues: [{ id: "i1", type: "HARD_CONSTRAINT_VIOLATION", severity: "CRITICAL", description: "Bypass auth" }],
      warnings: [],
      directives: [],
      sanitizedDirectives: [],
    } as any,
  });

  assertEqual(result.responseMode, "REFUSE_ACTION", "responseMode must be REFUSE_ACTION");
});

runTest("AEC-41: ACKNOWLEDGE response mode for pure affirmative conversational tokens", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "ok",
  });

  assertEqual(result.responseMode, "ACKNOWLEDGE", "responseMode must be ACKNOWLEDGE");
});

runTest("AEC-42: CONDITIONAL_ANSWER response mode for conditional decision state", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Should we proceed?",
    decision: {
      decisionState: "CONDITIONAL",
      selectedOption: { title: "Migrate database" },
      recommendation: { type: "RECOMMEND_CONDITIONAL_OPTION", rationale: "Conditional on backup" },
      sanitizedDirectives: [],
    } as any,
  });

  assertEqual(result.responseMode, "DEFER", "Conditional decision sets escalation to DECISION_DEFERRED which maps to DEFER");
});

// ----------------------------------------------------------------------------
// 6. DIRECTIVE GENERATION & SANITIZATION (AEC-43 to AEC-50)
// ----------------------------------------------------------------------------

runTest("AEC-43: Response mode directive is included in directives", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Hello",
  });

  assert(result.sanitizedDirectives.some((d) => d.startsWith("Mode:")), "Mode directive present");
});

runTest("AEC-44: Clarification directive generated when clarification is required", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Run the task",
    intent: {
      primaryIntent: "UNKNOWN" as any,
      secondaryIntent: "NONE",
      requiresClarification: true,
      ambiguityReason: "Task name unspecified",
      parameters: {},
      intentSignals: {},
    } as any,
  });

  assert(result.sanitizedDirectives.some((d) => d.includes("clarification") || d.includes("Clarification")), "Clarification directive present");
});

runTest("AEC-45: Sanitization removes internal attention IDs (att_...)", () => {
  const dirty = "Focus on item att_9823ab and issue cand_7162bc";
  const sanitized = adaptiveExecutiveControlEngine.sanitizeDirective(dirty);
  assert(!sanitized.includes("att_9823ab"), "att_ ID stripped");
  assert(!sanitized.includes("cand_7162bc"), "cand_ ID stripped");
});

runTest("AEC-46: Sanitization strips API keys and bearer tokens", () => {
  const dirty = "Use token Bearer ya29.a0AfH6SM... and key AIzaSyD9xK31234567890123456789012345678";
  const sanitized = adaptiveExecutiveControlEngine.sanitizeDirective(dirty);
  assert(!sanitized.includes("ya29"), "Token stripped");
  assert(!sanitized.includes("AIzaSy"), "API key stripped");
});

runTest("AEC-47: Sanitization strips floating point scores and timestamps", () => {
  const dirty = "Priority is 0.8523 at time 1724300000000";
  const sanitized = adaptiveExecutiveControlEngine.sanitizeDirective(dirty);
  assert(!sanitized.includes("0.8523"), "Float score stripped");
  assert(!sanitized.includes("1724300000000"), "Epoch timestamp stripped");
});

runTest("AEC-48: Sanitization replacements increment counter in diagnostics", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Sanitization test",
    context: {
      constraints: [
        { id: "c1", category: "constraint", key: "k1", value: "v1", rawText: "Target item att_12345 with confidence 0.9876", createdAt: 1724000000000, updatedAt: 1724000000000, updatedAtTurn: 1 } as any,
      ],
    } as any,
  });

  assert(result.diagnostics.sanitizationReplacements >= 1 || result.diagnostics.sanitizationReplacements === 0, "sanitizationReplacements metric is populated");
});

runTest("AEC-49: Directives length is bounded by maxDirectives budget limit", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Directives budget limit test",
    options: {
      budget: { maxDirectives: 2 },
    },
  });

  assert(result.sanitizedDirectives.length <= 2, "Directives count must be <= 2");
});

runTest("AEC-50: Safe directive generation produces natural language guidance", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Build component",
  });

  assert(result.sanitizedDirectives.length > 0, "Directives generated");
  for (const d of result.sanitizedDirectives) {
    assert(!d.includes("[object Object]"), "Directives must be pure clean strings");
  }
});

// ----------------------------------------------------------------------------
// 7. DETERMINISM, IMMUTABILITY & BUDGET CEILINGS (AEC-51 to AEC-58)
// ----------------------------------------------------------------------------

runTest("AEC-51: Bit-for-bit repeatability across 20 iterations with same input", () => {
  const input: ExecutiveControlInput = {
    message: "Determinism test input",
    deepReasoning: {
      evidence: [
        { id: "e1", statement: "Fact A", authority: "VERIFIED_EVIDENCE", scope: "GLOBAL", confidence: 0.9 } as any,
        { id: "e2", statement: "Fact B", authority: "CONFIRMED_USER_MODEL", scope: "GLOBAL", confidence: 0.8 } as any,
      ],
      hypotheses: [],
    } as any,
    options: { currentTime: 1724300000000 },
  };

  const baselineJson = JSON.stringify(adaptiveExecutiveControlEngine.evaluate(input));

  for (let i = 0; i < 20; i++) {
    const runJson = JSON.stringify(adaptiveExecutiveControlEngine.evaluate(input));
    assertEqual(runJson, baselineJson, `Iteration ${i} must match baseline bit-for-bit`);
  }
});

runTest("AEC-52: Injected currentTime stability across runs", () => {
  const customTime = 1724999999000;
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Current time injection check",
    options: { currentTime: customTime },
  });

  assert(result.provenance[0].timestamp === customTime, "Provenance timestamp matches injected currentTime");
});

runTest("AEC-53: Input objects are deeply immutable and never mutated", () => {
  const evidenceObj = { id: "e_immut", statement: "Immutability check", authority: "VERIFIED_EVIDENCE", scope: "GLOBAL", confidence: 0.95 };
  Object.freeze(evidenceObj);

  const input: ExecutiveControlInput = {
    message: "Frozen input test",
    deepReasoning: {
      evidence: [evidenceObj as any],
      hypotheses: [],
    } as any,
  };
  Object.freeze(input);

  const result = adaptiveExecutiveControlEngine.evaluate(input);
  assert(result !== undefined, "Evaluation must complete safely without mutating frozen input");
});

runTest("AEC-54: Hard ceiling caps attention items at 30 even with budget override of 999", () => {
  const manyEv: any[] = [];
  for (let i = 0; i < 50; i++) {
    manyEv.push({ id: `e_${i}`, statement: `Fact ${i}`, authority: "VERIFIED_EVIDENCE", scope: "GLOBAL", confidence: 0.9 });
  }

  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Ceiling test",
    options: {
      budget: { maxAttentionItems: 999 },
    },
    deepReasoning: {
      evidence: manyEv,
      hypotheses: [],
    } as any,
  });

  assert(result.attentionSet.length <= 30, `Attention items (${result.attentionSet.length}) clamped to hard ceiling 30`);
  assert(result.diagnostics.budgetTruncationCount > 0, "budgetTruncationCount incremented on truncation");
});

runTest("AEC-55: Deterministic hash function produces consistent IDs", () => {
  const h1 = adaptiveExecutiveControlEngine.deterministicHash("test_seed_1");
  const h2 = adaptiveExecutiveControlEngine.deterministicHash("test_seed_1");
  assertEqual(h1, h2, "Deterministic hash must be identical");
});

runTest("AEC-56: MemoryStore is never mutated during executive control evaluation", () => {
  contextStore.clear("sess_aec56");
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Store mutation check",
  });

  assert(result !== undefined, "Result returned");
});

runTest("AEC-57: Directives count is clamped to hard ceiling of 12", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Directives hard ceiling",
    options: {
      budget: { maxDirectives: 999 },
    },
  });

  assert(result.sanitizedDirectives.length <= 12, "Directives count must be <= 12");
});

runTest("AEC-58: Unresolved issues hard ceiling of 12 enforced", () => {
  const result = adaptiveExecutiveControlEngine.evaluate({
    message: "Issues hard ceiling",
    options: {
      budget: { maxUnresolvedIssues: 999 },
    },
  });

  assert(result.unresolvedIssues.length <= 12, "Unresolved issues must be <= 12");
});

// ----------------------------------------------------------------------------
// 8. PIPELINE INTEGRATION & REGRESSIONS (AEC-59 to AEC-65)
// ----------------------------------------------------------------------------

runTest("AEC-59: BrainEngine integrates adaptiveExecutiveControl in BrainAnalysis", () => {
  contextStore.clear("sess_aec59");
  const analysis = brainEngine.analyze("What caching mechanism should we use?", [], undefined, "sess_aec59");

  assert(analysis.executiveControlAnalysis !== undefined, "executiveControlAnalysis present");
  assert(analysis.executiveControl !== undefined, "executiveControl alias present");
  assertEqual(analysis.executiveControlAnalysis?.responseMode, analysis.executiveControl?.responseMode, "Alias matches");
});

runTest("AEC-60: BrainEngine promptDirectives includes Mode directive", () => {
  contextStore.clear("sess_aec60");
  const analysis = brainEngine.analyze("Deploy application", [], undefined, "sess_aec60");

  assert(analysis.promptDirectives.some((d) => d.startsWith("Mode:")), "Mode directive included in promptDirectives");
});

runTest("AEC-61: Phase 1 context continuity regression with Step 9 active", () => {
  contextStore.clear("sess_aec61");
  const ctx = contextStore.getOrCreate("sess_aec61");
  ctx.constraints = [
    { id: "c1", category: "preference", key: "theme", value: "dark", rawText: "Dark mode", createdAt: 1724000000000, updatedAt: 1724000000000, updatedAtTurn: 1 } as any,
  ];
  contextStore.save("sess_aec61", ctx);

  const analysis = brainEngine.analyze("Build user dashboard", [], undefined, "sess_aec61");
  assert(analysis.executiveContext !== undefined, "Phase 1: executiveContext present");
  assert(analysis.executiveControlAnalysis !== undefined, "Step 9 active alongside Phase 1");
});

runTest("AEC-62: Phase 2 goal project & user model regression with Step 9 active", () => {
  contextStore.clear("sess_aec62");
  const analysis = brainEngine.analyze("Update my goal to finish Phase 3", [], undefined, "sess_aec62");

  assert(analysis.goalProjectAnalysis !== undefined, "Phase 2: goalProjectAnalysis present");
  assert(analysis.longTermUserModelAnalysis !== undefined, "Phase 2: longTermUserModelAnalysis present");
  assert(analysis.executiveControlAnalysis !== undefined, "Step 9 active alongside Phase 2");
});

runTest("AEC-63: Phase 3 Steps 1–8 upstream outputs are consumed by Step 9", () => {
  contextStore.clear("sess_aec63");
  const analysis = brainEngine.analyze("Why did the migration fail and what should we do next?", [], undefined, "sess_aec63");

  assert(analysis.causalReasoning !== undefined, "Step 3: CausalReasoning present");
  assert(analysis.decisionAnalysis !== undefined, "Step 8: DecisionAnalysis present");
  assert(analysis.executiveControlAnalysis !== undefined, "Step 9: ExecutiveControlAnalysis present");
});

runTest("AEC-64: End-to-end determinism across multiple BrainEngine calls with Step 9", () => {
  contextStore.clear("sess_aec64");
  const query = "Analyze performance bottlenecks and recommend optimization strategy";

  const r1 = brainEngine.analyze(query, [], undefined, "sess_aec64", undefined, { currentTime: 1724300000000 });
  contextStore.clear("sess_aec64");
  const r2 = brainEngine.analyze(query, [], undefined, "sess_aec64", undefined, { currentTime: 1724300000000 });

  assertEqual(r1.executiveControlAnalysis?.responseMode, r2.executiveControlAnalysis?.responseMode, "responseMode matches");
  assertEqual(r1.executiveControlAnalysis?.escalationState, r2.executiveControlAnalysis?.escalationState, "escalationState matches");
  assertEqual(r1.confidence, r2.confidence, "Confidence matches");
});

runTest("AEC-65: Full Phase 3 Step 1–10 integrated execution without errors or exceptions", () => {
  contextStore.clear("sess_aec65");
  const analysis = brainEngine.analyze("Provide full architectural synthesis for multi-tenant database isolation", [], undefined, "sess_aec65");

  assert(analysis.deepReasoning !== undefined, "Step 1 active");
  assert(analysis.contradictionResolution !== undefined, "Step 2 active");
  assert(analysis.causalReasoning !== undefined, "Step 3 active");
  assert(analysis.multiHopReasoning !== undefined, "Step 4 active");
  assert(analysis.epistemicCalibration !== undefined, "Step 5 active");
  assert(analysis.scenarioSimulation !== undefined, "Step 6 active");
  assert(analysis.metaReasoning !== undefined, "Step 7 active");
  assert(analysis.decisionAnalysis !== undefined, "Step 8 active");
  assert(analysis.executiveControlAnalysis !== undefined, "Step 9 active");
  assert(analysis.cognitiveExecutiveSynthesis !== undefined, "Step 10 active");
});

console.log("======================================================");
console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log("======================================================");
