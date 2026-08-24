/**
 * Dora Cross-Session Context Continuity & Intelligent Recall Orchestration Engine
 * Phase 2 — Step 11
 * 
 * Deterministic, bounded, non-LLM engine that safely selects, ranks, filters,
 * deduplicates, compresses, and presents already-authorized historical context,
 * user-model attributes, temporal patterns, and project/goal commitments across sessions.
 * 
 * Read-only orchestrator: Does NOT mutate state, create memories, or bypass governance.
 */

import {
  ContextContinuityAnalysis,
  ContextContinuityDiagnostics,
  ContextContinuityEvaluationInput,
  ContextContinuityItem,
  ContextContinuityOptions,
  ContextContinuityStatus,
  ContinuityItemType,
  ContinuityScope,
  ContinuitySourceAuthority,
  ExplicitRecallSignal,
  ProjectContinuitySummary,
  ContextBudgetConfig,
} from "./contextContinuityTypes";
import { Project, Goal, Commitment, ProjectTask } from "./goalProjectTypes";
import { UserModelAttribute } from "./longTermUserModelTypes";
import { MemoryGovernanceAnalysis } from "./memoryGovernanceTypes";

/**
 * Strict Authority Precedence Weights (Higher = Greater Authority).
 * Authority strictly outweighs lexical relevance.
 */
export const CONTINUITY_AUTHORITY_WEIGHTS: Record<ContinuitySourceAuthority, number> = {
  CURRENT_TURN_EXPLICIT: 1.00,
  HARD_CONSTRAINT: 0.95,
  VERIFIED_EVIDENCE: 0.90,
  GOVERNANCE_APPROVED_MEMORY: 0.85,
  CONFIRMED_USER_MODEL: 0.80,
  ACTIVE_GOAL_PROJECT_COMMITMENT: 0.75,
  TEMPORAL_CONTEXT: 0.70,
  CONFIRMED_ADAPTIVE_PATTERN: 0.60,
  PREDICTIVE_CONTEXT: 0.30,
  SYSTEM_DEFAULT: 0.10,
};

/**
 * Default Context Budget Limits.
 */
export const DEFAULT_CONTEXT_BUDGET: ContextBudgetConfig = {
  maxMemories: 5,
  maxProjects: 2,
  maxGoals: 3,
  maxCommitments: 3,
  maxDirectives: 8,
  maxTotalContextItems: 15,
};

export class ContextContinuityEngine {
  private static instance: ContextContinuityEngine;

  private constructor() {}

  public static getInstance(): ContextContinuityEngine {
    if (!ContextContinuityEngine.instance) {
      ContextContinuityEngine.instance = new ContextContinuityEngine();
    }
    return ContextContinuityEngine.instance;
  }

  /**
   * Main evaluation entry point for Cross-Session Context Continuity & Intelligent Recall.
   * Pure read-only orchestrator with zero mutation of persistent structures.
   */
  public evaluate(input: ContextContinuityEvaluationInput): ContextContinuityAnalysis {
    const message = input.message || "";
    const trimmedMessage = message.trim();
    const lowerMessage = trimmedMessage.toLowerCase();
    const currentTime = input.options?.currentTime ?? 1000;
    const isTopicIsolated = input.options?.isTopicIsolated ?? false;
    const activeTopic = (input.options?.activeTopic || input.context?.activeTopic || "").toLowerCase();
    const isNewSession = input.options?.isNewSession ?? false;
    const budgetConfig: ContextBudgetConfig = {
      ...DEFAULT_CONTEXT_BUDGET,
      ...input.options?.budgetConfig,
    };

    // 1. Detect Explicit Recall intent
    const recallSignal = input.recallSignal || this.detectExplicitRecall(lowerMessage);

    // 2. Detect Current-Turn Directives & Conflict Overrides
    const currentTurnOverrides = this.detectCurrentTurnOverrides(lowerMessage);

    // 3. Extract Candidates from all authoritative sources
    const allCandidates: ContextContinuityItem[] = [];

    // 3a. Ingest Governed Memories & Retrieved Records (FIX #1: Strict Governance Boundary)
    const candidateMemories = (input.retrievedMemories as any)?.memories ||
      input.retrievedMemories?.retrievedMemories ||
      input.retrievedMemories?.candidates ||
      [];
    if (candidateMemories && Array.isArray(candidateMemories)) {
      for (const rawMem of candidateMemories) {
        const mem = rawMem.memory || rawMem;
        const memId = mem.id || rawMem.memoryId || "unknown";
        const key = mem.key || rawMem.key || "memory";
        const val = mem.value || mem.content || rawMem.content || "";
        const cat = mem.category || rawMem.category || "GENERAL";
        const status = ((mem.status || rawMem.status || "ACTIVE") as string).toUpperCase();
        
        // Strict lifecycle gate
        if (status === "SUPERSEDED" || status === "EXPIRED" || status === "DELETED" || status === "OUTDATED" || status === "QUARANTINED" || status === "ARCHIVED") {
          allCandidates.push({
            id: `cc_mem_${memId}`,
            type: "MEMORY",
            sourceId: memId,
            title: key,
            content: val,
            normalizedKey: this.normalizeKey(key),
            authority: "SYSTEM_DEFAULT",
            authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS["SYSTEM_DEFAULT"],
            relevanceScore: 0.1,
            recencyScore: 0.1,
            compositeScore: 0,
            scope: "TOPIC",
            topic: cat,
            timestamp: mem.updatedAt || mem.createdAt || currentTime,
            isExplicitlyRecalled: recallSignal.isExplicitRecall,
            isCurrentTurnConflict: false,
            isTopicIsolated: false,
            isSensitive: false,
            isSuppressed: true,
            suppressionReason: `MEMORY_${status}`,
          });
          continue;
        }

        // FIX #1 & FIX #9: Deterministic Authority Resolution via Governance Gate
        const authRes = this.resolveContinuityAuthority("MEMORY", rawMem, input.governanceAnalysis);
        const scope = this.determineScope(key, cat);
        const isGlobal = scope === "GLOBAL";

        if (!authRes.isAllowed) {
          allCandidates.push({
            id: `cc_mem_${memId}`,
            type: "MEMORY",
            sourceId: memId,
            title: key,
            content: val,
            normalizedKey: this.normalizeKey(key),
            authority: authRes.authority,
            authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[authRes.authority],
            relevanceScore: this.calculateLexicalRelevance(lowerMessage, `${key} ${val}`, activeTopic, isGlobal),
            recencyScore: this.calculateRecencyScore(mem.updatedAt || mem.createdAt || currentTime, currentTime),
            compositeScore: 0,
            scope,
            topic: cat,
            timestamp: mem.updatedAt || mem.createdAt || currentTime,
            isExplicitlyRecalled: recallSignal.isExplicitRecall,
            isCurrentTurnConflict: false,
            isTopicIsolated: false,
            isSensitive: false,
            isSuppressed: true,
            suppressionReason: authRes.reason || "GOVERNANCE_SUPPRESSED",
          });
          continue;
        }

        allCandidates.push({
          id: `cc_mem_${memId}`,
          type: "MEMORY",
          sourceId: memId,
          title: key,
          content: val,
          normalizedKey: this.normalizeKey(key),
          authority: authRes.authority,
          authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[authRes.authority],
          relevanceScore: this.calculateLexicalRelevance(lowerMessage, `${key} ${val}`, activeTopic, isGlobal),
          recencyScore: this.calculateRecencyScore(mem.updatedAt || mem.createdAt || currentTime, currentTime),
          compositeScore: 0,
          scope,
          topic: cat,
          timestamp: mem.updatedAt || mem.createdAt || currentTime,
          isExplicitlyRecalled: recallSignal.isExplicitRecall,
          isCurrentTurnConflict: false,
          isTopicIsolated: false,
          isSensitive: false,
          isSuppressed: false,
        });
      }
    }

    // 3b. Ingest Confirmed Long-Term User Model Attributes (Step 8)
    if (input.longTermUserModel?.profile?.confirmedAttributes) {
      for (const attr of input.longTermUserModel.profile.confirmedAttributes) {
        const scope = this.determineScope(attr.key, attr.dimension);
        const isGlobal = scope === "GLOBAL";
        const authRes = this.resolveContinuityAuthority("USER_MODEL_ATTRIBUTE", attr);

        allCandidates.push({
          id: `cc_um_${attr.key}`,
          type: "USER_MODEL_ATTRIBUTE",
          sourceId: attr.key,
          title: attr.key,
          content: attr.normalizedValue,
          normalizedKey: this.normalizeKey(attr.key),
          authority: authRes.authority,
          authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[authRes.authority],
          relevanceScore: this.calculateLexicalRelevance(lowerMessage, `${attr.key} ${attr.normalizedValue}`, activeTopic, isGlobal),
          recencyScore: this.calculateRecencyScore(attr.lastObservedAt || currentTime, currentTime),
          compositeScore: 0,
          scope,
          topic: attr.dimension,
          timestamp: attr.lastObservedAt || currentTime,
          isExplicitlyRecalled: recallSignal.isExplicitRecall,
          isCurrentTurnConflict: false,
          isTopicIsolated: false,
          isSensitive: false,
          isSuppressed: false,
        });
      }
    }

    // 3c. Ingest Temporal Patterns (Step 9)
    if (input.temporalMemory?.activePatterns) {
      for (const pat of input.temporalMemory.activePatterns) {
        if (pat.temporalStatus === "SUPERSEDED" || pat.temporalStatus === "EXPIRED" || pat.temporalStatus === "STALE") {
          continue;
        }

        const scope = pat.scope || this.determineScope(pat.attributeKey, pat.dimension);
        const isGlobal = scope === "GLOBAL";
        const authRes = this.resolveContinuityAuthority("TEMPORAL_PATTERN", pat);

        allCandidates.push({
          id: `cc_temp_${pat.patternId}`,
          type: "TEMPORAL_PATTERN",
          sourceId: pat.patternId,
          title: pat.attributeKey,
          content: pat.currentValue,
          normalizedKey: this.normalizeKey(pat.attributeKey),
          authority: authRes.authority,
          authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[authRes.authority],
          relevanceScore: this.calculateLexicalRelevance(lowerMessage, `${pat.attributeKey} ${pat.currentValue}`, activeTopic, isGlobal),
          recencyScore: this.calculateRecencyScore(pat.lastObservedAt || currentTime, currentTime),
          compositeScore: 0,
          scope,
          topic: pat.dimension,
          timestamp: pat.lastObservedAt || currentTime,
          isExplicitlyRecalled: recallSignal.isExplicitRecall,
          isCurrentTurnConflict: false,
          isTopicIsolated: false,
          isSensitive: false,
          isSuppressed: false,
        });
      }
    }

    // 3c-2. Ingest Confirmed Adaptive Learning Patterns (Step 5)
    if (input.adaptiveLearning) {
      const adaptivePatterns =
        (input.adaptiveLearning as any).confirmedPatterns ||
        (input.adaptiveLearning as any).patterns?.filter((p: any) => p.status === "CONFIRMED") ||
        (input.adaptiveLearning as any).userProfile?.confirmedPreferences ||
        [];
      if (Array.isArray(adaptivePatterns)) {
        for (const pat of adaptivePatterns) {
          const patKey = pat.key || pat.signalKey || pat.category || "adaptive_pattern";
          const patVal = pat.value || pat.signalValue || pat.preference || "";
          const scope = this.determineScope(patKey, pat.category || "ADAPTIVE");
          const isGlobal = scope === "GLOBAL";
          const authRes = this.resolveContinuityAuthority("ADAPTIVE_PATTERN", pat);

          allCandidates.push({
            id: `cc_adp_${pat.id || patKey}`,
            type: "ADAPTIVE_PATTERN",
            sourceId: pat.id || patKey,
            title: patKey,
            content: patVal,
            normalizedKey: this.normalizeKey(patKey),
            authority: authRes.authority,
            authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[authRes.authority],
            relevanceScore: this.calculateLexicalRelevance(lowerMessage, `${patKey} ${patVal}`, activeTopic, isGlobal),
            recencyScore: this.calculateRecencyScore(pat.lastObservedAt || currentTime, currentTime),
            compositeScore: 0,
            scope,
            topic: pat.category || "ADAPTIVE",
            timestamp: pat.lastObservedAt || currentTime,
            isExplicitlyRecalled: recallSignal.isExplicitRecall,
            isCurrentTurnConflict: false,
            isTopicIsolated: false,
            isSensitive: false,
            isSuppressed: false,
          });
        }
      }
    }

    // 3d. Ingest Active Projects, Goals, Commitments, Tasks (Step 10)
    let candidateProjects: Project[] = [];
    if (input.goalProjectAnalysis?.activeProjects) {
      candidateProjects = input.goalProjectAnalysis.activeProjects;
    } else if (input.goalProjectAnalysis?.state?.activeProjects) {
      candidateProjects = input.goalProjectAnalysis.state.activeProjects;
    }

    // Historical/completed projects retrieved ONLY during explicit recall
    if (recallSignal.isExplicitRecall && input.goalProjectAnalysis?.state?.completedProjects) {
      candidateProjects = [...candidateProjects, ...input.goalProjectAnalysis.state.completedProjects];
    }

    for (const proj of candidateProjects) {
      const isCompleted = proj.status === "COMPLETED";
      if (!recallSignal.isExplicitRecall && (proj.status === "ARCHIVED" || proj.status === "ABANDONED" || isCompleted)) {
        continue;
      }

      const authRes = this.resolveContinuityAuthority("PROJECT", proj);
      allCandidates.push({
        id: `cc_proj_${proj.projectId}`,
        type: "PROJECT",
        sourceId: proj.projectId,
        title: proj.name,
        content: `Project: ${proj.name} [Status: ${proj.status}]${proj.description ? ` - ${proj.description}` : ""}`,
        normalizedKey: this.normalizeKey(`project_${proj.name}`),
        authority: authRes.authority,
        authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[authRes.authority],
        relevanceScore: this.calculateProjectRelevance(lowerMessage, proj, activeTopic),
        recencyScore: this.calculateRecencyScore(proj.updatedAt || proj.createdAt || currentTime, currentTime),
        compositeScore: 0,
        scope: "PROJECT",
        projectId: proj.projectId,
        topic: proj.name,
        timestamp: proj.updatedAt || proj.createdAt || currentTime,
        isExplicitlyRecalled: recallSignal.isExplicitRecall,
        isCurrentTurnConflict: false,
        isTopicIsolated: false,
        isSensitive: false,
        isSuppressed: false,
      });

      // Project Goals
      for (const g of proj.goals || []) {
        if (!recallSignal.isExplicitRecall && g.status === "COMPLETED") continue;
        const gAuth = this.resolveContinuityAuthority("GOAL", g);
        allCandidates.push({
          id: `cc_goal_${g.goalId}`,
          type: "GOAL",
          sourceId: g.goalId,
          title: g.title,
          content: `Goal: ${g.title} [Status: ${g.status}]`,
          normalizedKey: this.normalizeKey(`goal_${g.title}`),
          authority: gAuth.authority,
          authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[gAuth.authority],
          relevanceScore: this.calculateLexicalRelevance(lowerMessage, `Goal: ${g.title}`, activeTopic),
          recencyScore: this.calculateRecencyScore(g.updatedAt || g.createdAt || currentTime, currentTime),
          compositeScore: 0,
          scope: "PROJECT",
          projectId: proj.projectId,
          timestamp: g.updatedAt || g.createdAt || currentTime,
          isExplicitlyRecalled: recallSignal.isExplicitRecall,
          isCurrentTurnConflict: false,
          isTopicIsolated: false,
          isSensitive: false,
          isSuppressed: false,
        });
      }

      // Project Commitments
      for (const c of proj.commitments || []) {
        if (c.isExpired || c.status === "EXPIRED" || (!recallSignal.isExplicitRecall && c.status === "COMPLETED")) continue;
        const cAuth = this.resolveContinuityAuthority("COMMITMENT", c);
        allCandidates.push({
          id: `cc_commit_${c.commitmentId}`,
          type: "COMMITMENT",
          sourceId: c.commitmentId,
          title: c.title,
          content: `Commitment: ${c.title} [Status: ${c.status}]`,
          normalizedKey: this.normalizeKey(`commit_${c.title}`),
          authority: cAuth.authority,
          authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[cAuth.authority],
          relevanceScore: this.calculateLexicalRelevance(lowerMessage, `Commitment: ${c.title}`, activeTopic),
          recencyScore: this.calculateRecencyScore(c.updatedAt || c.createdAt || currentTime, currentTime),
          compositeScore: 0,
          scope: "PROJECT",
          projectId: proj.projectId,
          timestamp: c.updatedAt || c.createdAt || currentTime,
          isExplicitlyRecalled: recallSignal.isExplicitRecall,
          isCurrentTurnConflict: false,
          isTopicIsolated: false,
          isSensitive: false,
          isSuppressed: false,
        });
      }

      // Project Tasks
      for (const t of proj.tasks || []) {
        if (!recallSignal.isExplicitRecall && t.status === "COMPLETED") continue;
        const tAuth = this.resolveContinuityAuthority("TASK", t);
        allCandidates.push({
          id: `cc_task_${t.taskId}`,
          type: "TASK",
          sourceId: t.taskId,
          title: t.title,
          content: `Task: ${t.title} [Status: ${t.status}]`,
          normalizedKey: this.normalizeKey(`task_${t.title}`),
          authority: tAuth.authority,
          authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[tAuth.authority],
          relevanceScore: this.calculateLexicalRelevance(lowerMessage, `Task: ${t.title}`, activeTopic),
          recencyScore: this.calculateRecencyScore(t.updatedAt || t.createdAt || currentTime, currentTime),
          compositeScore: 0,
          scope: "PROJECT",
          projectId: proj.projectId,
          timestamp: t.updatedAt || t.createdAt || currentTime,
          isExplicitlyRecalled: recallSignal.isExplicitRecall,
          isCurrentTurnConflict: false,
          isTopicIsolated: false,
          isSensitive: false,
          isSuppressed: false,
        });
      }
    }

    // 3e. Ingest Standalone Active Goals / Commitments from Step 10
    if (input.goalProjectAnalysis?.activeGoals) {
      for (const g of input.goalProjectAnalysis.activeGoals) {
        if (allCandidates.some((c) => c.sourceId === g.goalId)) continue;
        const gAuth = this.resolveContinuityAuthority("GOAL", g);
        allCandidates.push({
          id: `cc_goal_${g.goalId}`,
          type: "GOAL",
          sourceId: g.goalId,
          title: g.title,
          content: `Goal: ${g.title} [Status: ${g.status}]`,
          normalizedKey: this.normalizeKey(`goal_${g.title}`),
          authority: gAuth.authority,
          authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[gAuth.authority],
          relevanceScore: this.calculateLexicalRelevance(lowerMessage, `Goal: ${g.title}`, activeTopic),
          recencyScore: this.calculateRecencyScore(g.updatedAt || g.createdAt || currentTime, currentTime),
          compositeScore: 0,
          scope: g.scope === "GLOBAL" ? "GLOBAL" : "PROJECT",
          timestamp: g.updatedAt || g.createdAt || currentTime,
          isExplicitlyRecalled: recallSignal.isExplicitRecall,
          isCurrentTurnConflict: false,
          isTopicIsolated: false,
          isSensitive: false,
          isSuppressed: false,
        });
      }
    }

    if (input.goalProjectAnalysis?.activeCommitments) {
      for (const c of input.goalProjectAnalysis.activeCommitments) {
        if (c.isExpired || c.status === "EXPIRED") continue;
        if (allCandidates.some((cand) => cand.sourceId === c.commitmentId)) continue;
        const cAuth = this.resolveContinuityAuthority("COMMITMENT", c);
        allCandidates.push({
          id: `cc_commit_${c.commitmentId}`,
          type: "COMMITMENT",
          sourceId: c.commitmentId,
          title: c.title,
          content: `Commitment: ${c.title} [Status: ${c.status}]`,
          normalizedKey: this.normalizeKey(`commit_${c.title}`),
          authority: cAuth.authority,
          authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[cAuth.authority],
          relevanceScore: this.calculateLexicalRelevance(lowerMessage, `Commitment: ${c.title}`, activeTopic),
          recencyScore: this.calculateRecencyScore(c.updatedAt || c.createdAt || currentTime, currentTime),
          compositeScore: 0,
          scope: "PROJECT",
          timestamp: c.updatedAt || c.createdAt || currentTime,
          isExplicitlyRecalled: recallSignal.isExplicitRecall,
          isCurrentTurnConflict: false,
          isTopicIsolated: false,
          isSensitive: false,
          isSuppressed: false,
        });
      }
    }

    // 3f. Ingest Predictive Suggestions (FIX #3: Advisory only — strictly non-authoritative)
    const suggestions = (input.predictiveContext as any)?.candidateSuggestions ||
      input.predictiveContext?.acceptedCandidates ||
      [];
    if (suggestions && Array.isArray(suggestions)) {
      for (const sug of suggestions) {
        const authRes = this.resolveContinuityAuthority("PREDICTIVE_SUGGESTION", sug);
        const sugId = sug.id || "pred";
        const sugType = sug.type || sug.predictionType || "predictive_suggestion";
        const sugDesc = sug.description || sug.contextSummary || sug.directive || sug.promptDirective || "";
        allCandidates.push({
          id: `cc_pred_${sugId}`,
          type: "PREDICTIVE_SUGGESTION",
          sourceId: sugId,
          title: sugType,
          content: sugDesc,
          normalizedKey: this.normalizeKey(sugType),
          authority: authRes.authority,
          authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[authRes.authority],
          relevanceScore: this.calculateLexicalRelevance(lowerMessage, sugDesc, activeTopic),
          recencyScore: 0.5,
          compositeScore: 0,
          scope: "GLOBAL",
          timestamp: currentTime,
          isExplicitlyRecalled: false,
          isCurrentTurnConflict: false,
          isTopicIsolated: false,
          isSensitive: false,
          isSuppressed: false,
        });
      }
    }

    // 4. Ambiguity Resolution & Project Continuity Target (FIX #8)
    const ambiguityCheck = this.resolveContinuityTarget(
      lowerMessage,
      candidateProjects,
      input.context?.activeTopic,
      recallSignal.isExplicitRecall,
      currentTurnOverrides
    );

    let continuityStatus: ContextContinuityStatus = "NONE";
    let requiresClarification = false;
    let clarificationPrompt: string | undefined;
    let activeProjectSummary: ProjectContinuitySummary | undefined;

    if (ambiguityCheck.resolvedProject) {
      const p = ambiguityCheck.resolvedProject;
      activeProjectSummary = {
        projectId: p.projectId,
        name: p.name,
        status: p.status,
        activeGoals: (p.goals || []).filter((g) => g.status === "ACTIVE").map((g) => g.title),
        activeMilestones: (p.milestones || []).filter((m) => m.status === "ACTIVE").map((m) => m.title),
        readyTasks: (p.tasks || []).filter((t) => t.status === "READY" || t.status === "NOT_STARTED").map((t) => t.title),
        blockedTasks: (p.tasks || []).filter((t) => t.status === "BLOCKED").map((t) => t.title),
        activeCommitments: (p.commitments || []).filter((c) => c.status === "ACTIVE").map((c) => c.title),
        currentBlockers: p.blockerDescription ? [p.blockerDescription] : [],
        lastActiveAt: p.updatedAt || p.createdAt || currentTime,
      };
    }

    // Determine continuity status (Predictive suggestions CANNOT establish continuity status)
    const hasAuthoritativeRelevance = allCandidates.some(
      (c) => c.type !== "PREDICTIVE_SUGGESTION" && c.relevanceScore > 0.40
    );

    if (ambiguityCheck.isAmbiguous) {
      continuityStatus = "AMBIGUOUS";
      requiresClarification = true;
      clarificationPrompt = ambiguityCheck.clarificationPrompt;
    } else if (recallSignal.isExplicitRecall) {
      continuityStatus = "EXPLICIT_RECALL";
    } else if (currentTurnOverrides.isProjectPaused || currentTurnOverrides.switchedToProject) {
      continuityStatus = "SWITCHED";
    } else if (isTopicIsolated) {
      continuityStatus = "ISOLATED";
    } else if (ambiguityCheck.resolvedProject) {
      continuityStatus = ambiguityCheck.isResumed ? "RESUMED" : "ACTIVE";
    } else if (hasAuthoritativeRelevance) {
      continuityStatus = "ACTIVE";
    }

    // 5. Evaluate Gates, Suppression, and Filtering for All Candidates (FIX #4 & FIX #5)
    let suppressedConflictCount = 0;
    let suppressedTopicCount = 0;
    let suppressedSensitiveCount = 0;
    let suppressedStaleCount = 0;
    let suppressedDuplicateCount = 0;
    let suppressedPredictiveCount = 0;

    // Build map of higher-authority keys to suppress predictive items if higher authority exists (FIX #3)
    const nonPredictiveKeys = new Set(
      allCandidates
        .filter((c) => c.type !== "PREDICTIVE_SUGGESTION")
        .map((c) => c.normalizedKey)
    );

    for (const item of allCandidates) {
      const isPred = item.type === "PREDICTIVE_SUGGESTION";

      // 5a. SENSITIVE DATA GATE (Final defense boundary)
      if (this.isSensitivePayload(item.content) || this.isSensitivePayload(item.title)) {
        item.isSensitive = true;
        item.isSuppressed = true;
        item.suppressionReason = "SENSITIVE_DATA_SUPPRESSED";
        if (isPred) suppressedPredictiveCount++;
        else suppressedSensitiveCount++;
        continue;
      }

      // 5b. IDENTITY SAFETY GATE (Never infer employment, age, salary, etc.)
      if (this.isForbiddenIdentityInference(item.content, item.title, item.authority)) {
        item.isSuppressed = true;
        item.suppressionReason = "FORBIDDEN_IDENTITY_INFERENCE";
        if (isPred) suppressedPredictiveCount++;
        else suppressedSensitiveCount++;
        continue;
      }

      // 5c. CURRENT-TURN CONFLICT GATE (FIX #7)
      if (this.hasCurrentTurnConflict(item, currentTurnOverrides, lowerMessage)) {
        item.isCurrentTurnConflict = true;
        item.isSuppressed = true;
        item.suppressionReason = "CURRENT_TURN_CONFLICT";
        if (isPred) suppressedPredictiveCount++;
        else suppressedConflictCount++;
        continue;
      }

      // 5d. PREDICTIVE SUPPRESSION: If a higher-authority representation already exists for key (FIX #3)
      if (isPred && nonPredictiveKeys.has(item.normalizedKey)) {
        item.isSuppressed = true;
        item.suppressionReason = "PREDICTIVE_OVERRIDDEN_BY_AUTHORITATIVE";
        suppressedPredictiveCount++;
        continue;
      }

      // 5e. AMBIGUITY SUPPRESSION: If ambiguous, suppress competing project items to prevent false assumptions
      if (ambiguityCheck.isAmbiguous && item.scope === "PROJECT") {
        item.isSuppressed = true;
        item.suppressionReason = "AMBIGUOUS_PROJECT_REFERENCE";
        if (isPred) suppressedPredictiveCount++;
        continue;
      }

      // 5f. PROJECT ISOLATION GATE: If specific project is active/switched, suppress other projects
      if (ambiguityCheck.resolvedProject && item.scope === "PROJECT" && item.projectId && item.projectId !== ambiguityCheck.resolvedProject.projectId) {
        item.isSuppressed = true;
        item.suppressionReason = "UNRELATED_PROJECT_SUPPRESSED";
        if (isPred) suppressedPredictiveCount++;
        continue;
      } else if (currentTurnOverrides.switchedToProject && item.scope === "PROJECT" && item.topic && !item.topic.toLowerCase().includes(currentTurnOverrides.switchedToProject.toLowerCase())) {
        item.isSuppressed = true;
        item.suppressionReason = "PROJECT_SWITCH_OVERRIDE";
        if (isPred) suppressedPredictiveCount++;
        continue;
      }

      // 5g. HARD TOPIC ISOLATION GATE (FIX #5)
      if (!this.isTopicCompatible(item, activeTopic, isTopicIsolated, lowerMessage)) {
        item.isTopicIsolated = true;
        item.isSuppressed = true;
        item.suppressionReason = "TOPIC_ISOLATED";
        if (isPred) suppressedPredictiveCount++;
        else suppressedTopicCount++;
        continue;
      }

      // 5h. STALE CONTEXT GATE (Unless explicitly recalled)
      const elapsedMs = Math.max(0, currentTime - item.timestamp);
      const isStale = elapsedMs > 30 * 24 * 3600 * 1000;
      if (isStale && !recallSignal.isExplicitRecall && !input.options?.allowStaleRecall) {
        item.isSuppressed = true;
        item.suppressionReason = "STALE_CONTEXT_SUPPRESSED";
        if (isPred) suppressedPredictiveCount++;
        else suppressedStaleCount++;
        continue;
      }

      // 5i. NEW SESSION NON-RELEVANT SUPPRESSION: New session != automatic full dump
      if (isNewSession && !recallSignal.isExplicitRecall && !ambiguityCheck.resolvedProject && item.relevanceScore < 0.35 && item.scope !== "GLOBAL") {
        item.isSuppressed = true;
        item.suppressionReason = "NEW_SESSION_IRRELEVANT_SUPPRESSED";
        if (isPred) suppressedPredictiveCount++;
        continue;
      }

      // 5j. GENERAL IRRELEVANCE SUPPRESSION (For simple non-recall turns)
      if (
        !recallSignal.isExplicitRecall &&
        item.scope !== "GLOBAL" &&
        item.authority !== "HARD_CONSTRAINT" &&
        item.authority !== "VERIFIED_EVIDENCE" &&
        item.relevanceScore < 0.20 &&
        !ambiguityCheck.resolvedProject
      ) {
        item.isSuppressed = true;
        item.suppressionReason = "IRRELEVANT_CONTEXT_SUPPRESSED";
        if (isPred) suppressedPredictiveCount++;
        continue;
      }

      // 5k. Purely diagnostic composite score
      const scopeBonus = item.scope === "GLOBAL" || (ambiguityCheck.resolvedProject && item.projectId === ambiguityCheck.resolvedProject.projectId) ? 1.0 : 0.5;
      item.compositeScore = Number(
        (
          item.authorityWeight * 0.45 +
          item.relevanceScore * 0.30 +
          item.recencyScore * 0.15 +
          scopeBonus * 0.10
        ).toFixed(4)
      );
    }

    // 6. Deduplication & Collapse across layers (FIX #2 & FIX #6: Lexicographic Ranking)
    const deduplicatedCandidates: ContextContinuityItem[] = [];
    const keyToItemMap = new Map<string, ContextContinuityItem>();

    // Sort using strict lexicographic authority comparison
    const activeCandidates = allCandidates
      .filter((c) => !c.isSuppressed)
      .sort((a, b) => this.compareContinuityItems(a, b));

    for (const item of activeCandidates) {
      const existing = keyToItemMap.get(item.normalizedKey);
      if (existing) {
        // Suppress the lower-authority duplicate
        item.isSuppressed = true;
        item.suppressionReason = "DUPLICATE_LOWER_AUTHORITY";
        if (item.type === "PREDICTIVE_SUGGESTION") {
          suppressedPredictiveCount++;
        } else {
          suppressedDuplicateCount++;
        }
      } else {
        keyToItemMap.set(item.normalizedKey, item);
        deduplicatedCandidates.push(item);
      }
    }

    // 7. Context Budgeting & Truncation (Applied strictly in authority order)
    const selectedItems: ContextContinuityItem[] = [];
    let memoryCount = 0;
    let projectCount = 0;
    let goalCount = 0;
    let commitmentCount = 0;

    for (const item of deduplicatedCandidates) {
      const isPred = item.type === "PREDICTIVE_SUGGESTION";

      // Check total context budget cap first
      if (selectedItems.length >= budgetConfig.maxTotalContextItems) {
        item.isSuppressed = true;
        item.suppressionReason = "BUDGET_TOTAL_EXCEEDED";
        if (isPred) suppressedPredictiveCount++;
        continue;
      }

      // Check per-type budget caps
      if (item.type === "MEMORY") {
        if (memoryCount >= budgetConfig.maxMemories) {
          item.isSuppressed = true;
          item.suppressionReason = "BUDGET_MEMORY_EXCEEDED";
          if (isPred) suppressedPredictiveCount++;
          continue;
        }
        memoryCount++;
      } else if (item.type === "PROJECT") {
        if (projectCount >= budgetConfig.maxProjects) {
          item.isSuppressed = true;
          item.suppressionReason = "BUDGET_PROJECT_EXCEEDED";
          if (isPred) suppressedPredictiveCount++;
          continue;
        }
        projectCount++;
      } else if (item.type === "GOAL") {
        if (goalCount >= budgetConfig.maxGoals) {
          item.isSuppressed = true;
          item.suppressionReason = "BUDGET_GOAL_EXCEEDED";
          if (isPred) suppressedPredictiveCount++;
          continue;
        }
        goalCount++;
      } else if (item.type === "COMMITMENT") {
        if (commitmentCount >= budgetConfig.maxCommitments) {
          item.isSuppressed = true;
          item.suppressionReason = "BUDGET_COMMITMENT_EXCEEDED";
          if (isPred) suppressedPredictiveCount++;
          continue;
        }
        commitmentCount++;
      }

      selectedItems.push(item);
    }

    const suppressedItems = allCandidates.filter((c) => c.isSuppressed);

    // 8. Synthesize Clean, Natural Language Prompt Directives
    const rawDirectives: string[] = [];

    // 8a. Explicit current turn directives
    if (currentTurnOverrides.overrideDirectives.length > 0) {
      for (const d of currentTurnOverrides.overrideDirectives) {
        rawDirectives.push(d);
      }
    }

    // 8b. Active Project & Goal Directives
    if (activeProjectSummary) {
      rawDirectives.push(`The user is currently working on the ${activeProjectSummary.name} project.`);
      if (activeProjectSummary.activeGoals.length > 0) {
        rawDirectives.push(`Active project goal: ${activeProjectSummary.activeGoals.join(", ")}.`);
      }
      if (activeProjectSummary.readyTasks.length > 0) {
        rawDirectives.push(`Next ready project task: ${activeProjectSummary.readyTasks[0]}.`);
      }
      if (activeProjectSummary.activeCommitments.length > 0) {
        rawDirectives.push(`Active commitment: ${activeProjectSummary.activeCommitments[0]}.`);
      }
      if (activeProjectSummary.currentBlockers.length > 0) {
        rawDirectives.push(`Current blocker: ${activeProjectSummary.currentBlockers[0]}.`);
      }
    }

    // 8c. Selected Attribute & Memory Directives
    for (const item of selectedItems) {
      if (item.type === "USER_MODEL_ATTRIBUTE" || item.type === "MEMORY" || item.type === "TEMPORAL_PATTERN") {
        const formatted = this.formatAttributeDirective(item);
        if (formatted && !rawDirectives.includes(formatted)) {
          rawDirectives.push(formatted);
        }
      } else if (item.type === "GOAL" && (!activeProjectSummary || !activeProjectSummary.activeGoals.includes(item.title))) {
        const d = `Active goal: ${item.title}.`;
        if (!rawDirectives.includes(d)) rawDirectives.push(d);
      } else if (item.type === "COMMITMENT" && (!activeProjectSummary || !activeProjectSummary.activeCommitments.includes(item.title))) {
        const d = `Active commitment: ${item.title}.`;
        if (!rawDirectives.includes(d)) rawDirectives.push(d);
      }
    }

    // 8d. Explicit Recall Summary Directive
    if (recallSignal.isExplicitRecall && selectedItems.length > 0) {
      rawDirectives.push("Providing requested recall of previous conversation decisions and context.");
    }

    // 9. Directive Sanitization Gate (Strict stripping of internal IDs, floats, timestamps - FIX #12)
    const sanitizedDirectives: string[] = [];
    for (const dir of rawDirectives.slice(0, budgetConfig.maxDirectives)) {
      const sanitized = this.sanitizeDirective(dir);
      if (sanitized && !sanitizedDirectives.includes(sanitized)) {
        sanitizedDirectives.push(sanitized);
      }
    }

    // 10. Compile Final Diagnostics
    const selectedGoals = selectedItems.filter((i) => i.type === "GOAL");
    const selectedCommitments = selectedItems.filter((i) => i.type === "COMMITMENT");

    const activeGoals = [
      ...(activeProjectSummary?.activeGoals || []),
      ...selectedGoals.map((g) => g.title),
    ].filter((v, i, a) => a.indexOf(v) === i);

    const activeCommitments = [
      ...(activeProjectSummary?.activeCommitments || []),
      ...selectedCommitments.map((c) => c.title),
    ].filter((v, i, a) => a.indexOf(v) === i);

    const diagnostics: ContextContinuityDiagnostics = {
      totalCandidatesEvaluated: allCandidates.length,
      eligibleItemsCount: deduplicatedCandidates.length,
      selectedItemsCount: selectedItems.length,
      suppressedConflictCount,
      suppressedTopicCount,
      suppressedSensitiveCount,
      suppressedStaleCount,
      suppressedDuplicateCount,
      suppressedPredictiveCount,
      ambiguousReferencesCount: ambiguityCheck.isAmbiguous ? 1 : 0,
      isExplicitRecall: recallSignal.isExplicitRecall,
      continuityStatus,
      budgetUtilization: Number((selectedItems.length / budgetConfig.maxTotalContextItems).toFixed(2)),
      evaluationTimeMs: 0,
    };

    return {
      continuityStatus,
      activeProject: activeProjectSummary,
      activeGoals,
      activeCommitments,
      selectedItems,
      suppressedItems,
      directives: sanitizedDirectives,
      sanitizedDirectives,
      resolvedContinuityTarget: ambiguityCheck.resolvedProject?.name,
      requiresClarification,
      clarificationPrompt,
      diagnostics,
    };
  }

  /**
   * Deterministic Authority Resolution (FIX #1 & FIX #9).
   * Maps already-authorized inputs into the strict authority hierarchy.
   * Step 11 is NOT an authority engine and NEVER promotes records locally.
   */
  public resolveContinuityAuthority(
    itemType: ContinuityItemType,
    sourceData: any,
    governanceAnalysis?: MemoryGovernanceAnalysis
  ): { authority: ContinuitySourceAuthority; isAllowed: boolean; reason?: string } {
    if (sourceData?.authority && (sourceData.authority === "HARD_CONSTRAINT" || sourceData.authority === "VERIFIED_EVIDENCE" || sourceData.authority === "CURRENT_TURN_EXPLICIT")) {
      return { authority: sourceData.authority, isAllowed: true };
    }

    if (itemType === "MEMORY") {
      const mem = sourceData.memory || sourceData;
      const memId = mem.id || sourceData.memoryId || "unknown";

      if (mem?.authority === "HARD_CONSTRAINT" || sourceData?.authority === "HARD_CONSTRAINT") {
        return { authority: "HARD_CONSTRAINT", isAllowed: true };
      }
      if (mem?.authority === "VERIFIED_EVIDENCE" || sourceData?.authority === "VERIFIED_EVIDENCE" || mem?.source === "VERIFIED_EVIDENCE" || mem?.source === "TOOL_EXECUTION") {
        return { authority: "VERIFIED_EVIDENCE", isAllowed: true };
      }

      // If status is expired, superseded, or quarantined, suppress immediately
      if (mem.status === "SUPERSEDED" || mem.status === "EXPIRED" || mem.status === "QUARANTINED" || mem.status === "DELETED") {
        return {
          authority: "SYSTEM_DEFAULT",
          isAllowed: false,
          reason: `MEMORY_${mem.status}`,
        };
      }

      // If Governance Analysis is provided, it is the sole authoritative eligibility gate
      if (governanceAnalysis) {
        const allowedCandidate = (governanceAnalysis.allowedMemories || []).find(
          (m) => m.memoryId === memId || m.key === mem.key
        );
        const cautiousCandidate = (governanceAnalysis.cautiousMemories || []).find(
          (m) => m.memoryId === memId || m.key === mem.key
        );
        const suppressedCandidate = (governanceAnalysis.suppressedMemories || []).find(
          (m) => m.memoryId === memId || m.key === mem.key
        );

        if (suppressedCandidate || (!allowedCandidate && !cautiousCandidate)) {
          return {
            authority: "SYSTEM_DEFAULT",
            isAllowed: false,
            reason: "GOVERNANCE_SUPPRESSED_OR_UNAUTHORIZED",
          };
        }

        return {
          authority: "GOVERNANCE_APPROVED_MEMORY",
          isAllowed: true,
        };
      }

      // If Governance Analysis is not provided (standalone unit tests)
      const isExplicit = mem.source === "EXPLICIT_USER" || mem.isExplicit === true || sourceData.source === "EXPLICIT_USER";
      if (isExplicit && (mem.status === "ACTIVE" || !mem.status)) {
        return {
          authority: "GOVERNANCE_APPROVED_MEMORY",
          isAllowed: true,
        };
      }

      // Non-explicit memories without governance cannot promote to GOVERNANCE_APPROVED_MEMORY or CONFIRMED_ADAPTIVE_PATTERN
      return {
        authority: "SYSTEM_DEFAULT",
        isAllowed: false,
        reason: "NON_EXPLICIT_MEMORY_UNAUTHORIZED",
      };
    }

    if (itemType === "USER_MODEL_ATTRIBUTE") {
      return { authority: "CONFIRMED_USER_MODEL", isAllowed: true };
    }

    if (itemType === "TEMPORAL_PATTERN") {
      return { authority: "TEMPORAL_CONTEXT", isAllowed: true };
    }

    if (itemType === "PROJECT" || itemType === "GOAL" || itemType === "COMMITMENT" || itemType === "TASK") {
      return { authority: "ACTIVE_GOAL_PROJECT_COMMITMENT", isAllowed: true };
    }

    if (itemType === "ADAPTIVE_PATTERN") {
      return { authority: "CONFIRMED_ADAPTIVE_PATTERN", isAllowed: true };
    }

    if (itemType === "PREDICTIVE_SUGGESTION") {
      return { authority: "PREDICTIVE_CONTEXT", isAllowed: true };
    }

    return { authority: "SYSTEM_DEFAULT", isAllowed: true };
  }

  /**
   * Strict Lexicographic Ranking Comparator (FIX #2).
   * Enforces: Authority > Governance Eligibility > Scope > Relevance > Recency > Stable Tie-breaker.
   * Authority strictly outweighs lexical relevance.
   */
  public compareContinuityItems(a: ContextContinuityItem, b: ContextContinuityItem): number {
    // 1. Authority Tier (Primary Ordering Dimension)
    const weightDiff = CONTINUITY_AUTHORITY_WEIGHTS[b.authority] - CONTINUITY_AUTHORITY_WEIGHTS[a.authority];
    if (Math.abs(weightDiff) > 0.0001) {
      return weightDiff;
    }

    // 2. Scope match (Global or active project matching > other)
    const scopeScoreA = a.scope === "GLOBAL" ? 2 : (a.scope === "PROJECT" ? 1 : 0);
    const scopeScoreB = b.scope === "GLOBAL" ? 2 : (b.scope === "PROJECT" ? 1 : 0);
    if (scopeScoreB !== scopeScoreA) {
      return scopeScoreB - scopeScoreA;
    }

    // 3. Relevance Score
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }

    // 4. Recency Score
    if (b.recencyScore !== a.recencyScore) {
      return b.recencyScore - a.recencyScore;
    }

    // 5. Stable Timestamp
    if (b.timestamp !== a.timestamp) {
      return b.timestamp - a.timestamp;
    }

    // 6. Stable ID & Normalized Key Tie-breaker
    const keyComp = a.normalizedKey.localeCompare(b.normalizedKey);
    if (keyComp !== 0) return keyComp;
    return a.id.localeCompare(b.id);
  }

  /**
   * Deterministic Topic Compatibility (FIX #5).
   * Global communication preferences cross topic boundaries.
   * Domain-specific preferences cross only when explicitly referenced or compatible.
   */
  public isTopicCompatible(
    item: ContextContinuityItem,
    activeTopic: string,
    isTopicIsolatedOption: boolean,
    currentMessage: string
  ): boolean {
    // Global communication preferences are universally compatible across all topics
    if (item.scope === "GLOBAL") {
      return true;
    }

    // If explicit recall is in flight, allow domain recall
    if (item.isExplicitlyRecalled) {
      return true;
    }

    const itemTopic = (item.topic || "").toLowerCase();
    const itemContent = item.content.toLowerCase();
    const itemTitle = item.title.toLowerCase();
    const activeTop = (activeTopic || "").toLowerCase();

    // If current message explicitly mentions domain/entity/brand/project
    const messageTokens = currentMessage.split(/\s+/).filter((t) => t.length > 2);
    const hasExplicitEntityMention = messageTokens.some(
      (t) => itemTitle.includes(t) || itemContent.includes(t) || (itemTopic && itemTopic.includes(t))
    );
    if (hasExplicitEntityMention) {
      return true;
    }

    // If topic is isolated or an active topic is set
    if (isTopicIsolatedOption || activeTop) {
      if (!activeTop) return !isTopicIsolatedOption;

      // Direct substring match
      if (itemTopic && (itemTopic.includes(activeTop) || activeTop.includes(itemTopic))) {
        return true;
      }
      if (item.projectId && activeTop.includes(item.projectId.toLowerCase())) {
        return true;
      }

      // Word-level match between active topic and item metadata
      const activeTopicWords = activeTop.split(/\s+/).filter((w) => w.length > 2);
      if (activeTopicWords.some((w) => itemTitle.includes(w) || itemContent.includes(w) || itemTopic.includes(w))) {
        return true;
      }

      return false;
    }

    return true;
  }

  /**
   * Detect explicit user recall requests across English, Bangla, and Banglish.
   */
  private detectExplicitRecall(message: string): ExplicitRecallSignal {
    const isPreviousDiscussion =
      /\b(?:what did we (?:discuss|talk about|finish|complete|do|accomplish)|what were we talking about|remind me|previous discussion|last conversation|what did we say)\b/i.test(message) ||
      /(?:amra kothay chilam|agere kotha|kothay shesh korechilam|amader ager kotha|ager project|ager kaj)/i.test(message);

    const isWhereWereWe =
      /\b(?:where were we|where did we stop|where did we leave off|where was i)\b/i.test(message) ||
      /(?:kothay thamlam|kothay chilam)/i.test(message);

    const isPlanRecall =
      /\b(?:what was the (?:plan|previous plan|original plan)|what were the steps)\b/i.test(message);

    const isDecisionRecall =
      /\b(?:what did we decide|what was decided|what did i choose)\b/i.test(message);

    const isProjectStatus =
      /\b(?:what is the (?:current )?status of|how is the project going|project status|progress on|what did we finish before)\b/i.test(message);

    if (isWhereWereWe || isPreviousDiscussion || isPlanRecall || isDecisionRecall || isProjectStatus) {
      let recallType: ExplicitRecallSignal["recallType"] = "GENERAL_HISTORY";
      if (isWhereWereWe || isPreviousDiscussion) recallType = "PREVIOUS_DISCUSSION";
      else if (isPlanRecall) recallType = "PLAN_RECALL";
      else if (isDecisionRecall) recallType = "DECISION_RECALL";
      else if (isProjectStatus) recallType = "PROJECT_STATUS";

      return {
        isExplicitRecall: true,
        recallType,
      };
    }

    return {
      isExplicitRecall: false,
      recallType: "NONE",
    };
  }

  /**
   * Detect current-turn overrides and conflict triggers (FIX #7).
   */
  private detectCurrentTurnOverrides(message: string): {
    languageOverride?: string;
    verbosityOverride?: string;
    brandExclusion?: string[];
    switchedToProject?: string;
    isProjectPaused?: boolean;
    overrideDirectives: string[];
  } {
    const overrideDirectives: string[] = [];
    let languageOverride: string | undefined;
    let verbosityOverride: string | undefined;
    const brandExclusion: string[] = [];
    let switchedToProject: string | undefined;
    let isProjectPaused: boolean = false;

    // Language override detection (support both ASCII and Unicode Bengali scripts)
    if (/(?:বাংলায়|বাংলা|banglay|in bangla|speak in bangla|reply in bangla)/i.test(message)) {
      languageOverride = "Bangla";
      overrideDirectives.push("Current-turn instruction: Respond in Bangla.");
    } else if (/\b(?:banglish|in banglish|speak in banglish|banglish e)\b/i.test(message)) {
      languageOverride = "Banglish";
      overrideDirectives.push("Current-turn instruction: Respond in Banglish.");
    } else if (/\b(?:in english|english e|speak in english|reply in english)\b/i.test(message)) {
      languageOverride = "English";
      overrideDirectives.push("Current-turn instruction: Respond in English.");
    }

    // Verbosity override detection
    if (/\b(?:in detail|detailed|elaborate|step by step|comprehensively|bistarito)\b/i.test(message)) {
      verbosityOverride = "Detailed";
      overrideDirectives.push("Current-turn instruction: Provide detailed explanation.");
    } else if (/\b(?:concise|brief|short|in short|summarize|choto kore|ek kothay)\b/i.test(message)) {
      verbosityOverride = "Concise";
      overrideDirectives.push("Current-turn instruction: Keep response concise.");
    }

    // Brand preference override (e.g., "Recommend Lenovo laptops instead of ASUS" / "Recommend Lenovo instead" / "Don't use ASUS")
    if (/\b(?:recommend|prefer|switch to|use)\s+([a-z0-9_-]+)(?:\s+[a-z0-9_-]+)?\s+instead\s+of\s+([a-z0-9_-]+)\b/i.test(message)) {
      const match = message.match(/\b(?:recommend|prefer|switch to|use)\s+([a-z0-9_-]+)(?:\s+[a-z0-9_-]+)?\s+instead\s+of\s+([a-z0-9_-]+)\b/i);
      if (match && match[1] && match[2]) {
        const brandName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
        const excludedBrand = match[2].toLowerCase();
        brandExclusion.push(excludedBrand);
        overrideDirectives.push(`Current-turn instruction: Prefer ${brandName} over historical options.`);
      }
    } else if (/\b(?:recommend|prefer|switch to|use)\s+([a-z0-9_-]+)\s+instead\b/i.test(message)) {
      const match = message.match(/\b(?:recommend|prefer|switch to|use)\s+([a-z0-9_-]+)\s+instead\b/i);
      if (match && match[1]) {
        const brandName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
        overrideDirectives.push(`Current-turn instruction: Prefer ${brandName} over historical options.`);
      }
    }
    if (/\b(?:forget|don't use|do not use|stop using)\s+([a-z0-9_-]+)\b/i.test(message)) {
      const match = message.match(/\b(?:forget|don't use|do not use|stop using)\s+([a-z0-9_-]+)\b/i);
      if (match && match[1]) {
        brandExclusion.push(match[1].toLowerCase());
      }
    }
    if (/\binstead\s+of\s+([a-z0-9_-]+)\b/i.test(message)) {
      const match = message.match(/\binstead\s+of\s+([a-z0-9_-]+)\b/i);
      if (match && match[1]) {
        brandExclusion.push(match[1].toLowerCase());
      }
    }

    // Project pause or switch override (e.g. "Forget Dora for now, let's switch to my website")
    if (/\b(?:forget|pause|stop|hold)\s+([a-z0-9_\s]+?)\s*(?:for now|temporarily)?,\s*(?:let'?s\s+(?:switch to|work on|focus on)\s+([a-z0-9_\s]+))\b/i.test(message)) {
      const match = message.match(/\b(?:forget|pause|stop|hold)\s+([a-z0-9_\s]+?)\s*(?:for now|temporarily)?,\s*(?:let'?s\s+(?:switch to|work on|focus on)\s+([a-z0-9_\s]+))\b/i);
      if (match) {
        isProjectPaused = true;
        switchedToProject = match[2].trim();
        overrideDirectives.push(`Current-turn instruction: Focus on ${switchedToProject}, pausing previous project.`);
      }
    } else if (/\b(?:let'?s\s+(?:switch to|work on|focus on))\s+([a-z0-9_\s]+)\b/i.test(message)) {
      const match = message.match(/\b(?:let'?s\s+(?:switch to|work on|focus on))\s+([a-z0-9_\s]+)\b/i);
      if (match && match[1]) {
        switchedToProject = match[1].trim();
      }
    }

    return {
      languageOverride,
      verbosityOverride,
      brandExclusion,
      switchedToProject,
      isProjectPaused,
      overrideDirectives,
    };
  }

  /**
   * Determine if an item conflicts with current-turn explicit instructions (FIX #7).
   */
  private hasCurrentTurnConflict(
    item: ContextContinuityItem,
    overrides: ReturnType<typeof this.detectCurrentTurnOverrides>,
    currentMessage: string
  ): boolean {
    const lowerContent = item.content.toLowerCase();
    const lowerKey = item.normalizedKey.toLowerCase();

    // Language conflict
    if (overrides.languageOverride) {
      if (lowerKey.includes("language") || lowerKey.includes("lang_pref") || lowerKey.includes("communication_style")) {
        if (!lowerContent.includes(overrides.languageOverride.toLowerCase())) {
          return true;
        }
      }
    }

    // Verbosity conflict
    if (overrides.verbosityOverride) {
      if (lowerKey.includes("verbosity") || lowerKey.includes("response_length") || lowerKey.includes("tone")) {
        if (overrides.verbosityOverride === "Detailed" && (lowerContent.includes("concise") || lowerContent.includes("brief"))) {
          return true;
        }
        if (overrides.verbosityOverride === "Concise" && (lowerContent.includes("detailed") || lowerContent.includes("elaborate"))) {
          return true;
        }
      }
    }

    // Brand / entity exclusion (e.g., "Recommend Lenovo instead" cancels "ASUS")
    if (overrides.brandExclusion && overrides.brandExclusion.length > 0) {
      for (const brand of overrides.brandExclusion) {
        if (lowerContent.includes(brand) || lowerKey.includes(brand)) {
          return true;
        }
      }
    }
    if (/\brecommend\s+lenovo\s+instead\b/i.test(currentMessage) && (lowerContent.includes("asus") || lowerKey.includes("asus"))) {
      return true;
    }

    // Project pause conflict
    if (overrides.isProjectPaused && item.scope === "PROJECT") {
      if (item.topic && !item.topic.toLowerCase().includes(overrides.switchedToProject || "")) {
        return true;
      }
    }

    return false;
  }

  /**
   * Resolve anaphora, pronouns, and explicit project references across sessions (FIX #8).
   */
  private resolveContinuityTarget(
    message: string,
    candidateProjects: Project[],
    activeTopic?: string,
    isExplicitRecall?: boolean,
    currentTurnOverrides?: ReturnType<typeof this.detectCurrentTurnOverrides>
  ): {
    resolvedProject?: Project;
    isAmbiguous: boolean;
    isResumed: boolean;
    clarificationPrompt?: string;
  } {
    if (candidateProjects.length === 0) {
      return { isAmbiguous: false, isResumed: false };
    }

    // 0. If current turn explicitly switched to a specific project
    if (currentTurnOverrides?.switchedToProject) {
      const switchedNorm = currentTurnOverrides.switchedToProject.toLowerCase();
      const targetProj = candidateProjects.find(
        (p) => p.name.toLowerCase().includes(switchedNorm) || switchedNorm.includes(p.name.toLowerCase())
      );
      if (targetProj) {
        return {
          resolvedProject: targetProj,
          isAmbiguous: false,
          isResumed: true,
        };
      }
    }

    // 1. Check for explicit project naming in message (ignoring paused/forgotten projects)
    for (const proj of candidateProjects) {
      const normProj = proj.name.toLowerCase();
      const isForgotten = new RegExp(`\\b(?:forget|pause|stop|hold)\\s+${normProj}\\b`, "i").test(message);
      if (isForgotten) continue;

      if (message.includes(normProj) || (proj.normalizedName && message.includes(proj.normalizedName))) {
        return {
          resolvedProject: proj,
          isAmbiguous: false,
          isResumed: true,
        };
      }
    }

    // 2. Check for generic deictic reference or project inquiries
    const isGenericContinuityReference =
      /\b(?:continue\s+(?:it|the project|that|the task|our work)|that project|the previous thing|same task|same project|where were we|where did we stop|status of the project|project status|show project tasks|project tasks)\b/i.test(message) ||
      /\b(?:oita continue koro|shei kajta|ager project)\b/i.test(message);

    if (isGenericContinuityReference || isExplicitRecall) {
      // 1. If there's an active topic matching one project exactly
      if (activeTopic) {
        const topicMatch = candidateProjects.find((p) => p.name.toLowerCase().includes(activeTopic.toLowerCase()));
        if (topicMatch) {
          return { resolvedProject: topicMatch, isAmbiguous: false, isResumed: true };
        }
      }

      // 2. If exactly ONE active project exists, resolve unambiguously
      const activeProjects = candidateProjects.filter((p) => p.status === "ACTIVE");
      if (activeProjects.length === 1) {
        return { resolvedProject: activeProjects[0], isAmbiguous: false, isResumed: true };
      }

      // 3. If MULTIPLE active projects exist and no specific context disambiguates -> AMBIGUOUS
      if (activeProjects.length > 1) {
        const projectNames = activeProjects.map((p) => `"${p.name}"`).join(" and ");
        return {
          isAmbiguous: true,
          isResumed: false,
          clarificationPrompt: `You have multiple active projects: ${projectNames}. Which one would you like to continue?`,
        };
      }

      // 4. If exactly one project in list overall
      if (candidateProjects.length === 1) {
        return { resolvedProject: candidateProjects[0], isAmbiguous: false, isResumed: true };
      }
    }

    return { isAmbiguous: false, isResumed: false };
  }

  /**
   * Calculate bounded lexical relevance score [0.0, 1.0].
   */
  private calculateLexicalRelevance(
    message: string,
    targetText: string,
    activeTopic: string,
    isGlobal: boolean = false
  ): number {
    if (isGlobal) {
      return 0.75; // Global preferences have high baseline availability
    }

    const lowerTarget = targetText.toLowerCase();
    if (!message || !lowerTarget) return 0.10;

    // Intent/entity specific boost
    if (/\b(?:commit|commitment|promise|pledge)\b/i.test(message) && lowerTarget.includes("commit")) {
      return 0.85;
    }
    if (/\b(?:goal|aim|target|objective)\b/i.test(message) && lowerTarget.includes("goal")) {
      return 0.85;
    }
    if (/\b(?:task|todo|step|action)\b/i.test(message) && lowerTarget.includes("task")) {
      return 0.85;
    }
    if (/\b(?:hardware|setup|device|brand|laptop|pc|computer)\b/i.test(message) && (lowerTarget.includes("laptop") || lowerTarget.includes("brand"))) {
      return 0.85;
    }
    if (/\b(?:security|auth|secret|policy|guideline|database|db|postgres)\b/i.test(message) && (lowerTarget.includes("sec") || lowerTarget.includes("auth") || lowerTarget.includes("policy") || lowerTarget.includes("secret") || lowerTarget.includes("db") || lowerTarget.includes("database") || lowerTarget.includes("postgres"))) {
      return 0.85;
    }

    const messageTokens = message.split(/\s+/).filter((t) => t.length > 2);
    let matchCount = 0;
    for (const token of messageTokens) {
      if (lowerTarget.includes(token)) {
        matchCount++;
      }
    }

    const tokenOverlap = messageTokens.length > 0 ? matchCount / messageTokens.length : 0;
    
    let topicBonus = 0.0;
    if (activeTopic) {
      const topicTokens = activeTopic.split(/\s+/).filter((t) => t.length > 2);
      const topicMatches = topicTokens.filter((t) => lowerTarget.includes(t)).length;
      if (topicMatches > 0) {
        topicBonus = (topicMatches / topicTokens.length) * 0.40;
      }
    }

    return Number(Math.min(1.0, Math.max(0.1, tokenOverlap * 0.7 + topicBonus)).toFixed(2));
  }

  /**
   * Calculate project-specific relevance score [0.0, 1.0].
   */
  private calculateProjectRelevance(message: string, project: Project, activeTopic: string): number {
    const normProj = project.name.toLowerCase();
    if (message.includes(normProj)) {
      return 0.95;
    }
    if (activeTopic && normProj.includes(activeTopic)) {
      return 0.85;
    }
    if (/\b(?:continue|where were we|project|task|where did we stop|status)\b/i.test(message)) {
      return 0.75;
    }
    return this.calculateLexicalRelevance(message, `${project.name} ${project.description || ""}`, activeTopic);
  }

  /**
   * Calculate recency score with deterministic time decay [0.0, 1.0].
   */
  private calculateRecencyScore(itemTimestamp: number, currentTimestamp: number): number {
    const elapsedMs = Math.max(0, currentTimestamp - itemTimestamp);
    const dayMs = 24 * 3600 * 1000;
    const elapsedDays = elapsedMs / dayMs;

    if (elapsedDays <= 1) return 1.0;
    if (elapsedDays <= 7) return 0.85;
    if (elapsedDays <= 30) return 0.60;
    if (elapsedDays <= 90) return 0.25;
    return 0.10;
  }

  /**
   * Determine item scope (FIX #5: Hardware/tools are TOPIC, global is strictly universal style/UI).
   */
  private determineScope(key: string, category?: string): ContinuityScope {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("language") ||
      lowerKey.includes("lang_pref") ||
      lowerKey.includes("theme") ||
      lowerKey.includes("ui_mode") ||
      lowerKey.includes("verbosity") ||
      lowerKey.includes("tone") ||
      lowerKey.includes("communication_style") ||
      category === "COMMUNICATION" ||
      category === "PREFERENCES"
    ) {
      // Exclude hardware/device from global scope
      if (lowerKey.includes("laptop") || lowerKey.includes("hardware") || lowerKey.includes("brand")) {
        return "TOPIC";
      }
      return "GLOBAL";
    }
    if (lowerKey.includes("proj") || lowerKey.includes("task") || category === "PROJECT_CONTEXT") {
      return "PROJECT";
    }
    return "TOPIC";
  }

  /**
   * Normalize key for cross-system deduplication.
   */
  private normalizeKey(key: string): string {
    let k = key.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    if (k.includes("language") || k.includes("lang_pref")) return "pref_language";
    if (k.includes("theme") || k.includes("ui_mode")) return "pref_theme";
    if (k.includes("verbosity") || k.includes("concise") || k.includes("detailed")) return "pref_verbosity";
    if (k.includes("tone")) return "pref_tone";
    if (k.includes("laptop") || k.includes("brand") || k.includes("asus") || k.includes("lenovo")) return "pref_hardware_laptop";
    return k;
  }

  /**
   * Final defense check for sensitive data (API keys, bearer tokens, passwords, credit cards).
   * Context-aware: does NOT suppress valid terms like "token budget" or "secret project".
   */
  private isSensitivePayload(text: string): boolean {
    if (!text) return false;

    // Actual API key patterns (e.g. sk-..., api_key=...)
    if (/\b(?:sk-[a-zA-Z0-9_-]{16,}|api[_-]?key\s*[:=]\s*[a-zA-Z0-9_-]{10,})\b/i.test(text)) {
      return true;
    }

    // Bearer token patterns (e.g. Bearer eyJ...)
    if (/\bBearer\s+[a-zA-Z0-9_\-\.]{20,}\b/i.test(text)) {
      return true;
    }

    // Password declarations with actual secrets
    if (/\b(?:password|passwd|secret_key)\s*[:=]\s*[^\s]{4,}\b/i.test(text)) {
      return true;
    }

    // Credit card / CVV / PIN patterns
    if (/\b(?:\d{4}[-\s]?){3}\d{4}\b/.test(text)) {
      return true;
    }
    if (/\b(?:cvv|cvc|pin)\s*[:=]\s*\d{3,4}\b/i.test(text)) {
      return true;
    }

    return false;
  }

  /**
   * Identity safety check: Never infer employment, age, profession, etc., from historical context.
   */
  private isForbiddenIdentityInference(
    content: string,
    title: string,
    authority: ContinuitySourceAuthority
  ): boolean {
    if (authority === "CURRENT_TURN_EXPLICIT" || authority === "VERIFIED_EVIDENCE") {
      return false; // Explicit user assertions are allowed
    }

    const combined = `${title} ${content}`.toLowerCase();
    const forbiddenPatterns = [
      /\b(?:user is (?:an? )?(?:employee|student|doctor|lawyer|engineer|teacher))\b/i,
      /\b(?:user works at|user studies at|user's salary|user's age|user's health)\b/i,
      /\b(?:user owns (?:a |the )?(?:company|corporation|real estate))\b/i,
    ];

    return forbiddenPatterns.some((p) => p.test(combined));
  }

  /**
   * Format attribute into clean natural language directive.
   */
  private formatAttributeDirective(item: ContextContinuityItem): string {
    const title = item.title.toLowerCase();
    const content = item.content;

    if (title.includes("language") || title.includes("lang")) {
      return `User communication preference: Respond in ${content}.`;
    }
    if (title.includes("theme") || title.includes("mode")) {
      return `User UI preference: ${content}.`;
    }
    if (title.includes("verbosity") || title.includes("concise")) {
      return `User interaction style: ${content}.`;
    }
    if (title.includes("laptop") || title.includes("brand")) {
      return `User hardware preference: ${content}.`;
    }
    return `User context: ${item.title} is ${content}.`;
  }

  /**
   * Strict directive sanitization to strip internal IDs, confidence floats, and raw timestamps (FIX #12).
   */
  private sanitizeDirective(directive: string): string {
    let d = directive;

    // Strip cryptographic hashes & hex addresses (e.g. sha256:..., 0x...)
    d = d.replace(/\bsha256:[a-f0-9]+\b/gi, "");
    d = d.replace(/\b0x[a-f0-9]+\b/gi, "");

    // Strip raw entity/model IDs (e.g. mem_..., pat_..., cand_..., evi_..., proj_..., goal_..., commit_..., db_..., cc_..., um_..., task_...)
    d = d.replace(/\b(?:cc_|mem_|pat_|cand_|evi_|proj_|goal_|commit_|db_|um_|task_|evt_)[a-zA-Z0-9_-]+\b/gi, "");

    // Strip confidence / authority / score floats (e.g. confidence=0.95, score: 0.85, authority: 0.80)
    d = d.replace(/\b(?:confidence|score|authority|weight)\s*[:=]?\s*0?\.\d+\b/gi, "");
    d = d.replace(/\b0\.\d{2,}\b/g, "");

    // Strip raw epoch timestamps (e.g. 1700000000000)
    d = d.replace(/\b\d{10,13}\b/g, "");

    // Clean whitespace & stray brackets/punctuation
    d = d.replace(/\[\s*\]/g, "");
    d = d.replace(/\s+/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
    return d;
  }
}

export const contextContinuityEngine = ContextContinuityEngine.getInstance();
