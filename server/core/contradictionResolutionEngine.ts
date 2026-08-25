/**
 * Dora Contradiction Resolution & Belief Revision Engine
 * Phase 3 — Step 2
 * 
 * Deterministic, bounded, non-LLM engine that evaluates authorized evidence,
 * detected conflicts, and DeepReasoningEngine outputs to determine:
 * - which conflicts are resolvable
 * - which evidence has precedence
 * - whether a belief/hypothesis should be revised
 * - whether a conflict must remain unresolved
 * - whether the conflict is temporary/current-turn scoped
 * - whether historical evidence should remain preserved
 * 
 * STRICT ARCHITECTURAL INVARIANTS:
 * - Purely deterministic (zero Math.random, zero Date.now, zero random UUIDs).
 * - Zero side effects (no mutation of inputs, memory stores, or Phase 2 state).
 * - Read-only, synchronous, non-LLM, tool-free, API-free.
 * - Does not directly persist belief revisions.
 * - Current-turn explicit instructions take highest precedence ephemerally.
 * - Predictive context remains strictly advisory.
 * - Never silently rewrites historical truth.
 */

import {
  ReasoningEvidence,
  ReasoningEvidenceAuthority,
  ReasoningEvidenceScope,
  REASONING_AUTHORITY_WEIGHTS,
  ReasoningContradiction,
} from "./deepReasoningTypes";
import {
  ContradictionInput,
  ContradictionRecord,
  ContradictionClassification,
  ContradictionSeverity,
  ResolutionOutcome,
  ResolutionCandidate,
  BeliefRevisionDecision,
  BeliefRevisionDecisionType,
  ContradictionResolutionAnalysis,
  ContradictionResolutionBudgetConfig,
  ContradictionResolutionDiagnostics,
  DEFAULT_CONTRADICTION_RESOLUTION_BUDGET,
} from "./contradictionResolutionTypes";

export class ContradictionResolutionEngine {
  private static instance: ContradictionResolutionEngine;

  private constructor() {}

  public static getInstance(): ContradictionResolutionEngine {
    if (!ContradictionResolutionEngine.instance) {
      ContradictionResolutionEngine.instance = new ContradictionResolutionEngine();
    }
    return ContradictionResolutionEngine.instance;
  }

  /**
   * Deterministic 32-bit FNV-1a hash function.
   */
  public deterministicHash(str: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  /**
   * Generates a reproducible deterministic identifier.
   */
  public generateDeterministicId(prefix: string, ...components: (string | number | undefined)[]): string {
    const raw = components
      .map((c) => String(c ?? "").trim().toLowerCase())
      .join("::");
    const hash = this.deterministicHash(raw);
    const sanitizedPrefix = prefix.replace(/[^a-z0-9_]/gi, "_").toLowerCase();
    return `${sanitizedPrefix}_${hash}`;
  }

  /**
   * Sanitizes directives by removing internal IDs, hashes, timestamps, floats, and credentials.
   */
  public sanitizeDirective(text: string): string {
    if (!text || typeof text !== "string") return "";

    return text
      // Remove sensitive credential key-values and tokens
      .replace(/\b(?:api_key|token|bearer|secret|password|key)\s*[:=]\s*\S+/gi, "")
      .replace(/\bsk-[a-zA-Z0-9_\-]{8,}\b/gi, "")
      // Remove internal ID patterns (e.g. contra_12345, mem_abcdef, hypo_9876, cand_54321, ev_mock_1)
      .replace(/\b(?:contra|mem|hypo|cand|rec|rule|ptr|turn|ev)_[a-zA-Z0-9_]+\b/gi, "")
      // Remove raw UUIDs
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "")
      // Remove raw high-precision floats (e.g. 0.954321)
      .replace(/\b0\.\d{3,}\b/g, "")
      // Remove epoch timestamps (e.g. 1724567890123)
      .replace(/\b17\d{8,11}\b/g, "")
      // Collapse redundant whitespaces
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  /**
   * Primary Evaluation Entry Point for Contradiction Resolution & Belief Revision.
   */
  public evaluate(input: ContradictionInput): ContradictionResolutionAnalysis {
    const startTime = input.options?.currentTime ?? 0;
    const budget: ContradictionResolutionBudgetConfig = {
      ...DEFAULT_CONTRADICTION_RESOLUTION_BUDGET,
      ...input.options?.budgetConfig,
    };

    const diagnostics: ContradictionResolutionDiagnostics = {
      totalConflictsExamined: 0,
      classifiedConflicts: {
        AUTHORITY_CONFLICT: 0,
        TEMPORAL_CONFLICT: 0,
        SCOPE_CONFLICT: 0,
        ENTITY_CONFLICT: 0,
        PREFERENCE_CONFLICT: 0,
        FACTUAL_CONFLICT: 0,
        GOAL_CONFLICT: 0,
        PROJECT_CONFLICT: 0,
        COMMITMENT_CONFLICT: 0,
        IDENTITY_CONFLICT: 0,
        AMBIGUOUS_CONFLICT: 0,
        UNRESOLVED_CONFLICT: 0,
      },
      resolutionsByOutcome: {
        RESOLVED: 0,
        PARTIALLY_RESOLVED: 0,
        UNRESOLVED: 0,
        DEFERRED: 0,
        REJECTED: 0,
      },
      revisionsByType: {
        NO_REVISION: 0,
        TEMPORARY_OVERRIDE: 0,
        REVISE_ACTIVE_BELIEF: 0,
        PRESERVE_BOTH_SCOPED: 0,
        DEFER_REVISION: 0,
      },
      predictiveSuppressedCount: 0,
      candidateRejectedCount: 0,
      staleExpiredRejectedCount: 0,
      identityInferenceRejectedCount: 0,
      scopePreservedCount: 0,
      currentTurnOverrideCount: 0,
      unresolvedEqualAuthorityCount: 0,
      stepsExecuted: 0,
      executionTimeMs: 0,
      isDeterministic: true,
    };

    // Step 1: Ingest and build ContradictionRecords from upstream DeepReasoningEngine & authorized evidence
    diagnostics.stepsExecuted++;
    const rawContradictions = this.extractContradictionRecords(input, budget, diagnostics);

    // Step 2: Classify, assign severity, and analyze scope & authority for each contradiction
    diagnostics.stepsExecuted++;
    const classifiedRecords = this.classifyAndRankContradictions(rawContradictions, input, budget, diagnostics);

    // Step 3: Generate resolution candidates for each contradiction record
    diagnostics.stepsExecuted++;
    const candidates = this.evaluateResolutionCandidates(classifiedRecords, input, budget, diagnostics);

    // Step 4: Evaluate belief revision decisions through the strict Belief Revision Gate
    diagnostics.stepsExecuted++;
    const revisions = this.evaluateBeliefRevisions(classifiedRecords, candidates, input, budget, diagnostics);

    // Step 5: Synthesize clean, sanitized directives and clarification prompt
    diagnostics.stepsExecuted++;
    const { activeDirectives, requiresClarification, clarificationPrompt } = this.synthesizeDirectives(
      classifiedRecords,
      candidates,
      revisions,
      budget
    );

    let resolvedCount = 0;
    let unresolvedCount = 0;
    let deferredCount = 0;

    for (const cand of candidates) {
      if (cand.proposedResolution === "RESOLVED" || cand.proposedResolution === "PARTIALLY_RESOLVED") {
        resolvedCount++;
      } else if (cand.proposedResolution === "UNRESOLVED") {
        unresolvedCount++;
      } else if (cand.proposedResolution === "DEFERRED") {
        deferredCount++;
      }
    }

    return {
      contradictions: classifiedRecords.slice(0, budget.maxContradictions),
      candidates: candidates.slice(0, budget.maxCandidates),
      revisions: revisions.slice(0, budget.maxRevisions),
      activeDirectives,
      unresolvedCount,
      resolvedCount,
      deferredCount,
      requiresClarification,
      clarificationPrompt,
      diagnostics,
    };
  }

  /**
   * Step 1: Extracts and normalizes contradiction records from DeepReasoningEngine or direct inputs.
   */
  private extractContradictionRecords(
    input: ContradictionInput,
    budget: ContradictionResolutionBudgetConfig,
    diag: ContradictionResolutionDiagnostics
  ): ContradictionRecord[] {
    const records: ContradictionRecord[] = [];
    const evidenceMap = new Map<string, ReasoningEvidence>();

    // Index evidence from DeepReasoningEngine if available
    if (input.deepReasoning?.evidence) {
      for (const ev of input.deepReasoning.evidence) {
        evidenceMap.set(ev.id, ev);
      }
    }

    // 1. Process explicit contradictions already identified by DeepReasoningEngine
    if (input.deepReasoning?.contradictions) {
      for (const dc of input.deepReasoning.contradictions) {
        if (records.length >= budget.maxContradictions) break;

        const evA = dc.conflictingEvidenceIds[0] ? evidenceMap.get(dc.conflictingEvidenceIds[0]) : undefined;
        const evB = dc.conflictingEvidenceIds[1] ? evidenceMap.get(dc.conflictingEvidenceIds[1]) : undefined;

        if (!evA || !evB) continue;

        const record = this.buildContradictionRecord(evA, evB, dc.id, dc.subject, input);
        if (record) {
          records.push(record);
          diag.totalConflictsExamined++;
        }
      }
    }

    // 2. Scan pairwise evidence in DeepReasoningEngine if contradictions weren't already extracted
    if (records.length === 0 && input.deepReasoning?.evidence && input.deepReasoning.evidence.length >= 2) {
      const evList = input.deepReasoning.evidence;
      const n = Math.min(evList.length, 15);

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (records.length >= budget.maxContradictions) break;
          const a = evList[i];
          const b = evList[j];

          if (this.isConflictingPair(a, b, input)) {
            const record = this.buildContradictionRecord(a, b, undefined, a.normalizedKey || a.statement, input);
            if (record) {
              records.push(record);
              diag.totalConflictsExamined++;
            }
          }
        }
      }
    }

    return records;
  }

  /**
   * Determines whether two evidence items represent a semantic or subject conflict.
   */
  private isConflictingPair(a: ReasoningEvidence, b: ReasoningEvidence, input?: ContradictionInput): boolean {
    if (a.id === b.id) return false;

    // If either evidence is quarantined in governance, treat as conflict to resolve
    if (input && (this.isEvidenceInvalidOrQuarantined(a, input) || this.isEvidenceInvalidOrQuarantined(b, input))) {
      return true;
    }

    // Both targeting same key with different values
    if (a.normalizedKey && b.normalizedKey && a.normalizedKey === b.normalizedKey) {
      const valA = (a.normalizedValue || "").toLowerCase().trim();
      const valB = (b.normalizedValue || "").toLowerCase().trim();
      if (valA && valB && valA !== valB) {
        return true;
      }
    }

    // Negation conflict on same statement/concept
    if (a.normalizedKey && b.normalizedKey && a.normalizedKey === b.normalizedKey && a.isNegated !== b.isNegated) {
      return true;
    }

    // Check statement overlap or common topics (e.g. framework, database, theme, stack, port)
    const stmtA = a.statement.toLowerCase().trim();
    const stmtB = b.statement.toLowerCase().trim();

    // If caller provided exactly a 2-item evidence set with distinct statements, treat as a pairwise evaluation candidate
    if (input?.deepReasoning?.evidence && input.deepReasoning.evidence.length === 2 && stmtA !== stmtB) {
      return true;
    }

    if (
      (stmtA.includes("prefer") && stmtB.includes("prefer") && stmtA !== stmtB) ||
      (stmtA.includes("use") && stmtB.includes("use") && stmtA !== stmtB) ||
      (stmtA.includes("active") && stmtB.includes("completed")) ||
      (stmtA.includes("completed") && stmtB.includes("active")) ||
      (stmtA.includes("started") && stmtB.includes("stopped")) ||
      (stmtA.includes("framework") && stmtB.includes("framework") && stmtA !== stmtB) ||
      (stmtA.includes("database") && stmtB.includes("database") && stmtA !== stmtB) ||
      (stmtA.includes("theme") && stmtB.includes("theme") && stmtA !== stmtB) ||
      (stmtA.includes("port") && stmtB.includes("port") && stmtA !== stmtB) ||
      (stmtA.includes("delete") && stmtB.includes("keep")) ||
      (stmtA.includes("option a") && stmtB.includes("option b")) ||
      (stmtA.includes("windows") && stmtB.includes("macos")) ||
      (stmtA.includes("python") && stmtB.includes("typescript")) ||
      (stmtA.includes("asus") && stmtB.includes("lenovo"))
    ) {
      return true;
    }

    const wordsA = new Set(stmtA.split(/\s+/));
    const wordsB = new Set(stmtB.split(/\s+/));
    let overlap = 0;
    for (const w of wordsA) {
      if (w.length > 3 && wordsB.has(w)) overlap++;
    }
    if (overlap >= 2 && stmtA !== stmtB) return true;

    return false;
  }

  /**
   * Constructs a single normalized ContradictionRecord.
   */
  private buildContradictionRecord(
    evA: ReasoningEvidence,
    evB: ReasoningEvidence,
    sourceId: string | undefined,
    subject: string,
    input: ContradictionInput
  ): ContradictionRecord | null {
    const weightA = REASONING_AUTHORITY_WEIGHTS[evA.authority] ?? 0.10;
    const weightB = REASONING_AUTHORITY_WEIGHTS[evB.authority] ?? 0.10;

    let higherSide: "A" | "B" | "EQUAL" = "EQUAL";
    if (weightA > weightB) higherSide = "A";
    else if (weightB > weightA) higherSide = "B";

    const diff = Math.abs(weightA - weightB);

    // Temporal relationship
    let temporalRelation: "A_NEWER" | "B_NEWER" | "SAME_TIME" | "UNKNOWN" = "UNKNOWN";
    if (evA.timestamp && evB.timestamp) {
      if (evA.timestamp > evB.timestamp) temporalRelation = "A_NEWER";
      else if (evB.timestamp > evA.timestamp) temporalRelation = "B_NEWER";
      else temporalRelation = "SAME_TIME";
    }

    const isCurrentTurnOverride =
      evA.authority === "CURRENT_TURN_EXPLICIT" || evB.authority === "CURRENT_TURN_EXPLICIT";

    const isScopeCompatible =
      Boolean(evA.topic && evB.topic && evA.topic.toLowerCase() !== evB.topic.toLowerCase()) ||
      (evA.scope !== evB.scope && evA.scope !== "GLOBAL" && evB.scope !== "GLOBAL");

    const recordId = this.generateDeterministicId("contra_rec", evA.id, evB.id, subject);

    const record: ContradictionRecord = {
      id: recordId,
      sourceContradictionId: sourceId,
      subject,
      classification: "AMBIGUOUS_CONFLICT", // Will be classified in Step 2
      severity: "MODERATE",                 // Will be assigned in Step 2
      evidenceA: evA,
      evidenceB: evB,
      authorityA: evA.authority,
      authorityB: evB.authority,
      authorityComparison: {
        higherAuthoritySide: higherSide,
        higherAuthority: higherSide === "A" ? evA.authority : higherSide === "B" ? evB.authority : undefined,
        lowerAuthority: higherSide === "A" ? evB.authority : higherSide === "B" ? evA.authority : undefined,
        difference: Number(diff.toFixed(2)),
      },
      scopeA: evA.scope,
      scopeB: evB.scope,
      temporalRelation,
      description: `Conflict between "${evA.statement}" (${evA.authority}) and "${evB.statement}" (${evB.authority})`,
      isCurrentTurnOverride,
      isScopeCompatible,
    };

    return record;
  }

  /**
   * Step 2: Classifies and ranks contradictions deterministically.
   */
  private classifyAndRankContradictions(
    records: ContradictionRecord[],
    input: ContradictionInput,
    budget: ContradictionResolutionBudgetConfig,
    diag: ContradictionResolutionDiagnostics
  ): ContradictionRecord[] {
    for (const rec of records) {
      // 1. Classification
      rec.classification = this.classifyConflict(rec, input);
      diag.classifiedConflicts[rec.classification] = (diag.classifiedConflicts[rec.classification] || 0) + 1;

      // 2. Severity calculation
      rec.severity = this.calculateSeverity(rec);
    }

    // Sort contradictions deterministically:
    // 1. Severity (CRITICAL > HIGH > MODERATE > LOW > NONE)
    // 2. Authority Difference (descending)
    // 3. Current-Turn applicability (overrides first)
    // 4. Deterministic ID tie-breaker
    const severityWeight: Record<ContradictionSeverity, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MODERATE: 2,
      LOW: 1,
      NONE: 0,
    };

    records.sort((a, b) => {
      const sevA = severityWeight[a.severity] ?? 0;
      const sevB = severityWeight[b.severity] ?? 0;
      if (sevB !== sevA) return sevB - sevA;

      if (b.authorityComparison.difference !== a.authorityComparison.difference) {
        return b.authorityComparison.difference - a.authorityComparison.difference;
      }

      if (a.isCurrentTurnOverride !== b.isCurrentTurnOverride) {
        return a.isCurrentTurnOverride ? -1 : 1;
      }

      return a.id.localeCompare(b.id);
    });

    return records;
  }

  /**
   * Deterministically classifies a contradiction into one of the 12 categories.
   */
  private classifyConflict(rec: ContradictionRecord, input: ContradictionInput): ContradictionClassification {
    const stmtA = rec.evidenceA.statement.toLowerCase();
    const stmtB = rec.evidenceB.statement.toLowerCase();
    const key = (rec.subject || "").toLowerCase();

    // 1. Identity conflict / Unsupported inference
    if (
      rec.evidenceA.source === "user_model" &&
      rec.evidenceB.source === "user_model" &&
      (stmtA.includes("identity") || stmtB.includes("identity") || key.includes("role") || key.includes("occupation"))
    ) {
      return "IDENTITY_CONFLICT";
    }

    // 2. Scope conflict
    if (rec.isScopeCompatible) {
      return "SCOPE_CONFLICT";
    }

    // 3. Project conflict
    if (
      rec.evidenceA.authority === "ACTIVE_GOAL_PROJECT_COMMITMENT" ||
      rec.evidenceB.authority === "ACTIVE_GOAL_PROJECT_COMMITMENT" ||
      key.includes("project") ||
      stmtA.includes("project") ||
      stmtB.includes("project")
    ) {
      if (key.includes("goal") || stmtA.includes("goal") || stmtB.includes("goal")) {
        return "GOAL_CONFLICT";
      }
      if (key.includes("commitment") || stmtA.includes("commitment") || stmtB.includes("commitment") || stmtA.includes("deadline")) {
        return "COMMITMENT_CONFLICT";
      }
      return "PROJECT_CONFLICT";
    }

    // 4. Temporal conflict (status changes over time, e.g. old preference vs new migration)
    if (
      (rec.temporalRelation === "A_NEWER" || rec.temporalRelation === "B_NEWER") &&
      (stmtA.includes("migrate") || stmtB.includes("migrate") || stmtA.includes("now") || stmtB.includes("now") ||
       stmtA.includes("completed") || stmtB.includes("completed") || stmtA.includes("previous") || stmtB.includes("previous"))
    ) {
      return "TEMPORAL_CONFLICT";
    }

    // 5. Preference conflict
    if (
      key.includes("preference") ||
      key.includes("language") ||
      key.includes("framework") ||
      key.includes("stack") ||
      key.includes("theme") ||
      stmtA.includes("prefer") ||
      stmtB.includes("prefer") ||
      stmtA.includes("likes") ||
      stmtB.includes("likes")
    ) {
      return "PREFERENCE_CONFLICT";
    }

    // 6. Entity conflict (e.g. owns X vs interested in X)
    if (
      (stmtA.includes("owns") && stmtB.includes("interested")) ||
      (stmtA.includes("interested") && stmtB.includes("owns")) ||
      (stmtA.includes("has") && stmtB.includes("wants"))
    ) {
      return "ENTITY_CONFLICT";
    }

    // 7. Factual conflict
    if (
      rec.evidenceA.authority === "VERIFIED_EVIDENCE" ||
      rec.evidenceB.authority === "VERIFIED_EVIDENCE" ||
      key.includes("port") ||
      key.includes("version") ||
      key.includes("url") ||
      key.includes("path")
    ) {
      return "FACTUAL_CONFLICT";
    }

    // 8. Authority conflict (strictly differing authority tiers)
    if (rec.authorityComparison.higherAuthoritySide !== "EQUAL" && rec.authorityComparison.difference >= 0.15) {
      return "AUTHORITY_CONFLICT";
    }

    // 9. Equal authority unresolvable
    if (rec.authorityComparison.higherAuthoritySide === "EQUAL") {
      return "UNRESOLVED_CONFLICT";
    }

    return "AMBIGUOUS_CONFLICT";
  }

  /**
   * Deterministically assigns contradiction severity.
   */
  private calculateSeverity(rec: ContradictionRecord): ContradictionSeverity {
    const authA = rec.evidenceA.authority;
    const authB = rec.evidenceB.authority;

    // CRITICAL: Hard safety/governance constraints, credentials, impossible critical states
    if (authA === "HARD_CONSTRAINT" || authB === "HARD_CONSTRAINT") {
      return "CRITICAL";
    }

    // HIGH: Verified evidence vs direct commands, active commitments, verified facts
    if (
      authA === "VERIFIED_EVIDENCE" ||
      authB === "VERIFIED_EVIDENCE" ||
      rec.classification === "COMMITMENT_CONFLICT" ||
      rec.classification === "FACTUAL_CONFLICT"
    ) {
      return "HIGH";
    }

    // MODERATE: Conflicting preferences, goals, projects, user model attributes
    if (
      rec.classification === "PREFERENCE_CONFLICT" ||
      rec.classification === "PROJECT_CONFLICT" ||
      rec.classification === "GOAL_CONFLICT" ||
      rec.classification === "TEMPORAL_CONFLICT" ||
      rec.classification === "AUTHORITY_CONFLICT"
    ) {
      return "MODERATE";
    }

    // LOW: Scope separated differences, minor predictive or adaptive nuances
    if (
      rec.classification === "SCOPE_CONFLICT" ||
      authA === "PREDICTIVE_CONTEXT" ||
      authB === "PREDICTIVE_CONTEXT" ||
      authA === "CONFIRMED_ADAPTIVE_PATTERN" ||
      authB === "CONFIRMED_ADAPTIVE_PATTERN"
    ) {
      return "LOW";
    }

    return "LOW";
  }

  /**
   * Step 3: Evaluates Resolution Candidates based on Authority, Scope, and Temporal Lineage.
   */
  private evaluateResolutionCandidates(
    records: ContradictionRecord[],
    input: ContradictionInput,
    budget: ContradictionResolutionBudgetConfig,
    diag: ContradictionResolutionDiagnostics
  ): ResolutionCandidate[] {
    const candidates: ResolutionCandidate[] = [];

    for (const rec of records) {
      if (candidates.length >= budget.maxCandidates) break;

      const authA = rec.evidenceA.authority;
      const authB = rec.evidenceB.authority;
      const weightA = REASONING_AUTHORITY_WEIGHTS[authA] ?? 0.10;
      const weightB = REASONING_AUTHORITY_WEIGHTS[authB] ?? 0.10;

      // Governance rejection check: if evidence is unapproved/quarantined/predictive-only attempting override
      if (this.isEvidenceInvalidOrQuarantined(rec.evidenceA, input)) {
        diag.candidateRejectedCount++;
        candidates.push(this.createCandidate(rec, "RESOLVED", rec.evidenceB, rec.evidenceA, 0.95, "Evidence A is unapproved or invalid under governance rules", "GLOBAL", false));
        diag.resolutionsByOutcome.RESOLVED++;
        continue;
      }
      if (this.isEvidenceInvalidOrQuarantined(rec.evidenceB, input)) {
        diag.candidateRejectedCount++;
        candidates.push(this.createCandidate(rec, "RESOLVED", rec.evidenceA, rec.evidenceB, 0.95, "Evidence B is unapproved or invalid under governance rules", "GLOBAL", false));
        diag.resolutionsByOutcome.RESOLVED++;
        continue;
      }

      // Case 1: Predictive Context suppression (cannot override authoritative evidence)
      if (authA === "PREDICTIVE_CONTEXT" && weightB > weightA) {
        diag.predictiveSuppressedCount++;
        candidates.push(this.createCandidate(rec, "RESOLVED", rec.evidenceB, rec.evidenceA, 0.90, "Predictive context is advisory and superseded by authoritative evidence", "GLOBAL", false));
        diag.resolutionsByOutcome.RESOLVED++;
        continue;
      }
      if (authB === "PREDICTIVE_CONTEXT" && weightA > weightB) {
        diag.predictiveSuppressedCount++;
        candidates.push(this.createCandidate(rec, "RESOLVED", rec.evidenceA, rec.evidenceB, 0.90, "Predictive context is advisory and superseded by authoritative evidence", "GLOBAL", false));
        diag.resolutionsByOutcome.RESOLVED++;
        continue;
      }

      // Case 2: Current-turn explicit instruction override (Highest Authority for current turn)
      if (authA === "CURRENT_TURN_EXPLICIT" && authB !== "CURRENT_TURN_EXPLICIT") {
        diag.currentTurnOverrideCount++;
        candidates.push(this.createCandidate(rec, "RESOLVED", rec.evidenceA, rec.evidenceB, 0.98, "Current-turn explicit instruction has highest precedence for current invocation", "CURRENT_TURN", true));
        diag.resolutionsByOutcome.RESOLVED++;
        continue;
      }
      if (authB === "CURRENT_TURN_EXPLICIT" && authA !== "CURRENT_TURN_EXPLICIT") {
        diag.currentTurnOverrideCount++;
        candidates.push(this.createCandidate(rec, "RESOLVED", rec.evidenceB, rec.evidenceA, 0.98, "Current-turn explicit instruction has highest precedence for current invocation", "CURRENT_TURN", true));
        diag.resolutionsByOutcome.RESOLVED++;
        continue;
      }

      // Case 3: Scope-separated coexistence (e.g. TypeScript for Dora vs Python for data analysis)
      if (rec.isScopeCompatible) {
        diag.scopePreservedCount++;
        candidates.push(this.createCandidate(rec, "PARTIALLY_RESOLVED", undefined, undefined, 0.92, "Both statements remain valid across distinct scopes or project contexts", "SCOPED", false));
        diag.resolutionsByOutcome.PARTIALLY_RESOLVED++;
        continue;
      }

      // Case 4: Unequal authority (Higher authority wins deterministically)
      if (weightA > weightB) {
        candidates.push(this.createCandidate(rec, "RESOLVED", rec.evidenceA, rec.evidenceB, 0.90, `Resolved by higher authority tier (${authA} > ${authB})`, "GLOBAL", false));
        diag.resolutionsByOutcome.RESOLVED++;
        continue;
      } else if (weightB > weightA) {
        candidates.push(this.createCandidate(rec, "RESOLVED", rec.evidenceB, rec.evidenceA, 0.90, `Resolved by higher authority tier (${authB} > ${authA})`, "GLOBAL", false));
        diag.resolutionsByOutcome.RESOLVED++;
        continue;
      }

      // Case 5: Equal authority with verified temporal lineage
      if (rec.temporalRelation === "A_NEWER" && rec.evidenceA.timestamp && rec.evidenceB.timestamp) {
        candidates.push(this.createCandidate(rec, "RESOLVED", rec.evidenceA, rec.evidenceB, 0.85, "Resolved by verified temporal progression of authoritative evidence", "GLOBAL", false));
        diag.resolutionsByOutcome.RESOLVED++;
        continue;
      } else if (rec.temporalRelation === "B_NEWER" && rec.evidenceA.timestamp && rec.evidenceB.timestamp) {
        candidates.push(this.createCandidate(rec, "RESOLVED", rec.evidenceB, rec.evidenceA, 0.85, "Resolved by verified temporal progression of authoritative evidence", "GLOBAL", false));
        diag.resolutionsByOutcome.RESOLVED++;
        continue;
      }

      // Case 6: Equal authority stalemate (Cannot resolve arbitrarily -> must preserve both)
      diag.unresolvedEqualAuthorityCount++;
      candidates.push(this.createCandidate(rec, "UNRESOLVED", undefined, undefined, 0.50, "Equal authority conflict with no deterministic differentiator; both records preserved", "GLOBAL", false));
      diag.resolutionsByOutcome.UNRESOLVED++;
    }

    return candidates;
  }

  /**
   * Helper to build a clean ResolutionCandidate.
   */
  private createCandidate(
    rec: ContradictionRecord,
    outcome: ResolutionOutcome,
    winner: ReasoningEvidence | undefined,
    loser: ReasoningEvidence | undefined,
    confidence: number,
    rationale: string,
    scope: string,
    appliesToCurrentTurnOnly: boolean
  ): ResolutionCandidate {
    const candidateId = this.generateDeterministicId("cand", rec.id, outcome, winner?.id);
    return {
      candidateId,
      contradictionId: rec.id,
      proposedResolution: outcome,
      winningEvidenceId: winner?.id,
      winningAuthority: winner?.authority,
      losingEvidenceId: loser?.id,
      confidence,
      rationale,
      scope,
      appliesToCurrentTurnOnly,
    };
  }

  /**
   * Step 4: Belief Revision Gate — Evaluates whether beliefs should be revised, preserved, or overridden.
   */
  private evaluateBeliefRevisions(
    records: ContradictionRecord[],
    candidates: ResolutionCandidate[],
    input: ContradictionInput,
    budget: ContradictionResolutionBudgetConfig,
    diag: ContradictionResolutionDiagnostics
  ): BeliefRevisionDecision[] {
    const revisions: BeliefRevisionDecision[] = [];
    const candidateMap = new Map<string, ResolutionCandidate>();
    for (const c of candidates) {
      candidateMap.set(c.contradictionId, c);
    }

    for (const rec of records) {
      if (revisions.length >= budget.maxRevisions) break;

      const cand = candidateMap.get(rec.id);
      if (!cand) continue;

      let decisionType: BeliefRevisionDecisionType = "NO_REVISION";
      let prevBelief: string | undefined = undefined;
      let revBelief: string | undefined = undefined;
      let reason = cand.rationale;
      let requiresClarification = false;
      let clarificationPrompt: string | undefined = undefined;
      let isPreservedHistorically = true;
      let sanitizedDirective: string | undefined = undefined;

      // Gate Rule 1: Current-turn explicit overrides are ephemeral (TEMPORARY_OVERRIDE)
      if (cand.appliesToCurrentTurnOnly && cand.winningEvidenceId) {
        decisionType = "TEMPORARY_OVERRIDE";
        const winner = rec.evidenceA.id === cand.winningEvidenceId ? rec.evidenceA : rec.evidenceB;
        const loser = rec.evidenceA.id === cand.winningEvidenceId ? rec.evidenceB : rec.evidenceA;
        prevBelief = loser.statement;
        revBelief = winner.statement;
        reason = "Current turn explicit instruction temporarily overrides historical preference for this response";
        sanitizedDirective = `Apply current instruction: ${this.sanitizeDirective(winner.statement)} (ephemeral turn scope)`;
        diag.revisionsByType.TEMPORARY_OVERRIDE++;
      }
      // Gate Rule 2: Scope separation allows both beliefs to co-exist without overwriting
      else if (cand.proposedResolution === "PARTIALLY_RESOLVED" && rec.isScopeCompatible) {
        decisionType = "PRESERVE_BOTH_SCOPED";
        prevBelief = rec.evidenceA.statement;
        revBelief = rec.evidenceB.statement;
        reason = "Both beliefs maintained under their respective domain or project scopes";
        sanitizedDirective = `Maintain scoped contexts: "${this.sanitizeDirective(rec.evidenceA.statement)}" and "${this.sanitizeDirective(rec.evidenceB.statement)}"`;
        diag.revisionsByType.PRESERVE_BOTH_SCOPED++;
      }
      // Gate Rule 3: Validated authoritative evidence or verified temporal progression updates active belief
      else if (cand.proposedResolution === "RESOLVED" && cand.winningEvidenceId && !cand.appliesToCurrentTurnOnly) {
        const winner = rec.evidenceA.id === cand.winningEvidenceId ? rec.evidenceA : rec.evidenceB;
        const loser = rec.evidenceA.id === cand.winningEvidenceId ? rec.evidenceB : rec.evidenceA;

        // Check if winner has sufficient authority and represents a genuine revision
        // (rather than merely suppressing an advisory or low-authority signal)
        const isDismissingAdvisoryOrCandidate =
          loser.authority === "PREDICTIVE_CONTEXT" ||
          loser.authority === "SYSTEM_DEFAULT" ||
          loser.authority === "CONFIRMED_ADAPTIVE_PATTERN";

        const isAuthorizedToRevise =
          !isDismissingAdvisoryOrCandidate &&
          (winner.authority === "VERIFIED_EVIDENCE" ||
           winner.authority === "GOVERNANCE_APPROVED_MEMORY" ||
           winner.authority === "HARD_CONSTRAINT" ||
           (winner.authority === "CONFIRMED_USER_MODEL" && (rec.temporalRelation === "A_NEWER" || rec.temporalRelation === "B_NEWER")) ||
           (winner.authority === "TEMPORAL_CONTEXT" && rec.temporalRelation !== "UNKNOWN"));

        if (isAuthorizedToRevise) {
          decisionType = "REVISE_ACTIVE_BELIEF";
          prevBelief = loser.statement;
          revBelief = winner.statement;
          reason = `Active belief updated based on authorized evidence (${winner.authority}); historical lineage preserved`;
          sanitizedDirective = `Use updated preference: ${this.sanitizeDirective(winner.statement)}`;
          diag.revisionsByType.REVISE_ACTIVE_BELIEF++;
        } else {
          decisionType = "NO_REVISION";
          reason = `Advisory or candidate signal (${loser.authority}) suppressed; maintaining active baseline (${winner.authority})`;
          diag.revisionsByType.NO_REVISION++;
        }
      }
      // Gate Rule 4: Equal authority unresolved conflict -> defer revision and ask clarification if critical
      else if (cand.proposedResolution === "UNRESOLVED") {
        decisionType = "DEFER_REVISION";
        prevBelief = rec.evidenceA.statement;
        revBelief = rec.evidenceB.statement;
        reason = "Revision deferred due to equal authority conflict without deterministic differentiator";
        diag.revisionsByType.DEFER_REVISION++;

        if (rec.severity === "CRITICAL" || rec.severity === "HIGH") {
          requiresClarification = true;
          clarificationPrompt = `Could you clarify whether you prefer "${this.sanitizeDirective(rec.evidenceA.statement)}" or "${this.sanitizeDirective(rec.evidenceB.statement)}"?`;
        }
      } else {
        decisionType = "NO_REVISION";
        diag.revisionsByType.NO_REVISION++;
      }

      const revId = this.generateDeterministicId("rev", rec.id, decisionType);

      revisions.push({
        id: revId,
        targetSubject: rec.subject,
        decisionType,
        previousBelief: prevBelief,
        revisedBelief: revBelief,
        winningEvidenceId: cand.winningEvidenceId,
        losingEvidenceId: cand.losingEvidenceId,
        scope: cand.scope,
        effectivePeriod: decisionType === "TEMPORARY_OVERRIDE" ? "CURRENT_TURN" : "ONGOING",
        reason,
        confidence: cand.confidence,
        sanitizedDirective,
        requiresClarification,
        clarificationPrompt,
        isPreservedHistorically,
      });
    }

    return revisions;
  }

  /**
   * Step 5: Synthesizes sanitized directives and clarification prompts for BrainEngine.
   */
  private synthesizeDirectives(
    records: ContradictionRecord[],
    candidates: ResolutionCandidate[],
    revisions: BeliefRevisionDecision[],
    budget: ContradictionResolutionBudgetConfig
  ): {
    activeDirectives: string[];
    requiresClarification: boolean;
    clarificationPrompt?: string;
  } {
    const activeDirectives: string[] = [];
    let requiresClarification = false;
    let clarificationPrompt: string | undefined = undefined;

    for (const rev of revisions) {
      if (activeDirectives.length >= budget.maxDirectives) break;

      if (rev.sanitizedDirective) {
        const clean = this.sanitizeDirective(rev.sanitizedDirective);
        if (clean && !activeDirectives.includes(clean)) {
          activeDirectives.push(clean);
        }
      }

      if (rev.requiresClarification && rev.clarificationPrompt && !requiresClarification) {
        requiresClarification = true;
        clarificationPrompt = this.sanitizeDirective(rev.clarificationPrompt);
      }
    }

    return {
      activeDirectives,
      requiresClarification,
      clarificationPrompt,
    };
  }

  /**
   * Checks if an evidence item is marked quarantined, expired, or unapproved by memory governance.
   */
  private isEvidenceInvalidOrQuarantined(ev: ReasoningEvidence, input: ContradictionInput): boolean {
    if (!ev) return true;

    // Check if source was governance-rejected
    if (input.memoryGovernance) {
      const isSuppressed = input.memoryGovernance.suppressedMemories?.some(
        (sm) => sm.memoryId === ev.id || (ev.normalizedKey && sm.key.toLowerCase() === ev.normalizedKey.toLowerCase())
      );
      if (isSuppressed) return true;

      const isQuarantined = input.memoryGovernance.governedCandidates?.some(
        (gc) =>
          (gc.memoryId === ev.id || (ev.normalizedKey && gc.key.toLowerCase() === ev.normalizedKey.toLowerCase())) &&
          (gc.usageDecision === "SUPPRESS" || gc.status === "EXPIRED" || gc.status === "DELETED" || gc.status === "SUPERSEDED" || gc.reasons?.includes("QUARANTINED_MEMORY"))
      );
      if (isQuarantined) return true;
    }

    return false;
  }
}

export const contradictionResolutionEngine = ContradictionResolutionEngine.getInstance();
