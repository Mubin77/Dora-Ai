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
    const recallSignal = this.detectExplicitRecall(lowerMessage);

    // 2. Detect Current-Turn Directives & Conflict Overrides
    const currentTurnOverrides = this.detectCurrentTurnOverrides(lowerMessage);

    // 3. Extract Candidates from all authoritative sources
    const allCandidates: ContextContinuityItem[] = [];

    // 3a. Ingest Governed Memories & Retrieved Records
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
        if (status === "SUPERSEDED" || status === "EXPIRED" || status === "DELETED" || status === "OUTDATED") {
          continue;
        }

        const isExplicit = mem.source === "EXPLICIT_USER" || mem.isExplicit === true || rawMem.source === "EXPLICIT_USER";
        const authority: ContinuitySourceAuthority = isExplicit
          ? "GOVERNANCE_APPROVED_MEMORY"
          : "CONFIRMED_ADAPTIVE_PATTERN";

        const scope = this.determineScope(key, cat);
        const isGlobal = scope === "GLOBAL";

        allCandidates.push({
          id: `cc_mem_${memId}`,
          type: "MEMORY",
          sourceId: memId,
          title: key,
          content: val,
          normalizedKey: this.normalizeKey(key),
          authority,
          authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[authority],
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
        const isGlobal = attr.dimension === "COMMUNICATION" || attr.dimension === "LANGUAGE" || attr.dimension === "VERBOSITY" || attr.dimension === "TONE" || attr.dimension === "CODE_STYLE";
        const authority: ContinuitySourceAuthority = "CONFIRMED_USER_MODEL";

        allCandidates.push({
          id: `cc_um_${attr.key}`,
          type: "USER_MODEL_ATTRIBUTE",
          sourceId: attr.key,
          title: attr.key,
          content: attr.normalizedValue,
          normalizedKey: this.normalizeKey(attr.key),
          authority,
          authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[authority],
          relevanceScore: this.calculateLexicalRelevance(lowerMessage, `${attr.key} ${attr.normalizedValue}`, activeTopic, isGlobal),
          recencyScore: this.calculateRecencyScore(attr.lastObservedAt || currentTime, currentTime),
          compositeScore: 0,
          scope: isGlobal ? "GLOBAL" : (attr.dimension === "PROJECT_CONTEXT" ? "PROJECT" : "TOPIC"),
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

        const isGlobal = pat.scope === "GLOBAL";
        const authority: ContinuitySourceAuthority = "TEMPORAL_CONTEXT";

        allCandidates.push({
          id: `cc_temp_${pat.patternId}`,
          type: "TEMPORAL_PATTERN",
          sourceId: pat.patternId,
          title: pat.attributeKey,
          content: pat.currentValue,
          normalizedKey: this.normalizeKey(pat.attributeKey),
          authority,
          authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[authority],
          relevanceScore: this.calculateLexicalRelevance(lowerMessage, `${pat.attributeKey} ${pat.currentValue}`, activeTopic, isGlobal),
          recencyScore: this.calculateRecencyScore(pat.lastObservedAt || currentTime, currentTime),
          compositeScore: 0,
          scope: pat.scope || (isGlobal ? "GLOBAL" : "TOPIC"),
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

    // 3d. Ingest Active Projects, Goals, Commitments, Tasks (Step 10)
    let candidateProjects: Project[] = [];
    if (input.goalProjectAnalysis?.activeProjects) {
      candidateProjects = input.goalProjectAnalysis.activeProjects;
    } else if (input.goalProjectAnalysis?.state?.activeProjects) {
      candidateProjects = input.goalProjectAnalysis.state.activeProjects;
    }

    // Also collect historical/completed projects if explicit recall requested
    if (recallSignal.isExplicitRecall && input.goalProjectAnalysis?.state?.completedProjects) {
      candidateProjects = [...candidateProjects, ...input.goalProjectAnalysis.state.completedProjects];
    }

    for (const proj of candidateProjects) {
      const isCompleted = proj.status === "COMPLETED";
      if (!recallSignal.isExplicitRecall && (proj.status === "ARCHIVED" || proj.status === "ABANDONED" || isCompleted)) {
        continue;
      }

      const authority: ContinuitySourceAuthority = "ACTIVE_GOAL_PROJECT_COMMITMENT";
      allCandidates.push({
        id: `cc_proj_${proj.projectId}`,
        type: "PROJECT",
        sourceId: proj.projectId,
        title: proj.name,
        content: `Project: ${proj.name} [Status: ${proj.status}]${proj.description ? ` - ${proj.description}` : ""}`,
        normalizedKey: this.normalizeKey(`project_${proj.name}`),
        authority,
        authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[authority],
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

      // Ingest Project Goals
      for (const g of proj.goals || []) {
        if (!recallSignal.isExplicitRecall && g.status === "COMPLETED") continue;
        allCandidates.push({
          id: `cc_goal_${g.goalId}`,
          type: "GOAL",
          sourceId: g.goalId,
          title: g.title,
          content: `Goal: ${g.title} [Status: ${g.status}]`,
          normalizedKey: this.normalizeKey(`goal_${g.title}`),
          authority,
          authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[authority],
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

      // Ingest Project Commitments
      for (const c of proj.commitments || []) {
        if (c.isExpired || c.status === "EXPIRED" || (!recallSignal.isExplicitRecall && c.status === "COMPLETED")) continue;
        allCandidates.push({
          id: `cc_commit_${c.commitmentId}`,
          type: "COMMITMENT",
          sourceId: c.commitmentId,
          title: c.title,
          content: `Commitment: ${c.title} [Status: ${c.status}]`,
          normalizedKey: this.normalizeKey(`commit_${c.title}`),
          authority,
          authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[authority],
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

      // Ingest Project Tasks
      for (const t of proj.tasks || []) {
        if (!recallSignal.isExplicitRecall && t.status === "COMPLETED") continue;
        allCandidates.push({
          id: `cc_task_${t.taskId}`,
          type: "TASK",
          sourceId: t.taskId,
          title: t.title,
          content: `Task: ${t.title} [Status: ${t.status}]`,
          normalizedKey: this.normalizeKey(`task_${t.title}`),
          authority,
          authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[authority],
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
        const authority: ContinuitySourceAuthority = "ACTIVE_GOAL_PROJECT_COMMITMENT";
        allCandidates.push({
          id: `cc_goal_${g.goalId}`,
          type: "GOAL",
          sourceId: g.goalId,
          title: g.title,
          content: `Goal: ${g.title} [Status: ${g.status}]`,
          normalizedKey: this.normalizeKey(`goal_${g.title}`),
          authority,
          authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[authority],
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
        const authority: ContinuitySourceAuthority = "ACTIVE_GOAL_PROJECT_COMMITMENT";
        allCandidates.push({
          id: `cc_commit_${c.commitmentId}`,
          type: "COMMITMENT",
          sourceId: c.commitmentId,
          title: c.title,
          content: `Commitment: ${c.title} [Status: ${c.status}]`,
          normalizedKey: this.normalizeKey(`commit_${c.title}`),
          authority,
          authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[authority],
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

    // 3f. Ingest Predictive Suggestions (Advisory only — Capped low authority)
    const suggestions = (input.predictiveContext as any)?.candidateSuggestions ||
      input.predictiveContext?.acceptedCandidates ||
      [];
    if (suggestions && Array.isArray(suggestions)) {
      for (const sug of suggestions) {
        const authority: ContinuitySourceAuthority = "PREDICTIVE_CONTEXT";
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
          authority,
          authorityWeight: CONTINUITY_AUTHORITY_WEIGHTS[authority],
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

    // 4. Ambiguity Resolution & Project Continuity Target
    const ambiguityCheck = this.resolveContinuityTarget(
      lowerMessage,
      candidateProjects,
      input.context?.activeTopic,
      recallSignal.isExplicitRecall
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
    } else if (allCandidates.some((c) => c.relevanceScore > 0.4)) {
      continuityStatus = "ACTIVE";
    }

    // 5. Evaluate Gates, Suppression, and Filtering for All Candidates
    let suppressedConflictCount = 0;
    let suppressedTopicCount = 0;
    let suppressedSensitiveCount = 0;
    let suppressedStaleCount = 0;
    let suppressedDuplicateCount = 0;
    let suppressedPredictiveCount = 0;

    for (const item of allCandidates) {
      // 5a. SENSITIVE DATA GATE (Final defense boundary)
      if (this.isSensitivePayload(item.content) || this.isSensitivePayload(item.title)) {
        item.isSensitive = true;
        item.isSuppressed = true;
        item.suppressionReason = "SENSITIVE_DATA_SUPPRESSED";
        suppressedSensitiveCount++;
        continue;
      }

      // 5b. IDENTITY SAFETY GATE (Never infer employment, age, salary, etc.)
      if (this.isForbiddenIdentityInference(item.content, item.title, item.authority)) {
        item.isSuppressed = true;
        item.suppressionReason = "FORBIDDEN_IDENTITY_INFERENCE";
        suppressedSensitiveCount++;
        continue;
      }

      // 5c. CURRENT-TURN CONFLICT GATE
      if (this.hasCurrentTurnConflict(item, currentTurnOverrides, lowerMessage)) {
        item.isCurrentTurnConflict = true;
        item.isSuppressed = true;
        item.suppressionReason = "CURRENT_TURN_CONFLICT";
        suppressedConflictCount++;
        continue;
      }

      // 5d. AMBIGUITY SUPPRESSION: If ambiguous, suppress competing project items to prevent false assumptions
      if (ambiguityCheck.isAmbiguous && item.scope === "PROJECT") {
        item.isSuppressed = true;
        item.suppressionReason = "AMBIGUOUS_PROJECT_REFERENCE";
        continue;
      }

      // 5e. PROJECT ISOLATION GATE: If specific project is active/switched, suppress other projects
      if (ambiguityCheck.resolvedProject && item.scope === "PROJECT" && item.projectId && item.projectId !== ambiguityCheck.resolvedProject.projectId) {
        item.isSuppressed = true;
        item.suppressionReason = "UNRELATED_PROJECT_SUPPRESSED";
        continue;
      } else if (currentTurnOverrides.switchedToProject && item.scope === "PROJECT" && item.topic && !item.topic.toLowerCase().includes(currentTurnOverrides.switchedToProject.toLowerCase())) {
        item.isSuppressed = true;
        item.suppressionReason = "PROJECT_SWITCH_OVERRIDE";
        continue;
      }

      // 5f. TOPIC ISOLATION GATE: If topic is isolated, suppress non-global items that don't match active topic
      if (isTopicIsolated && item.scope !== "GLOBAL") {
        const itemTopic = (item.topic || "").toLowerCase();
        if (!activeTopic || !itemTopic.includes(activeTopic)) {
          item.isTopicIsolated = true;
          item.isSuppressed = true;
          item.suppressionReason = "TOPIC_ISOLATED";
          suppressedTopicCount++;
          continue;
        }
      }

      // 5g. STALE CONTEXT GATE (Unless explicitly recalled)
      const elapsedMs = Math.max(0, currentTime - item.timestamp);
      const isStale = elapsedMs > 30 * 24 * 3600 * 1000;
      if (isStale && !recallSignal.isExplicitRecall && !input.options?.allowStaleRecall) {
        item.isSuppressed = true;
        item.suppressionReason = "STALE_CONTEXT_SUPPRESSED";
        suppressedStaleCount++;
        continue;
      }

      // 5h. NEW SESSION NON-RELEVANT SUPPRESSION: New session != automatic full dump
      if (isNewSession && !recallSignal.isExplicitRecall && !ambiguityCheck.resolvedProject && item.relevanceScore < 0.35 && item.scope !== "GLOBAL") {
        item.isSuppressed = true;
        item.suppressionReason = "NEW_SESSION_IRRELEVANT_SUPPRESSED";
        continue;
      }

      // 5i. GENERAL IRRELEVANCE SUPPRESSION (For simple non-recall turns)
      if (!recallSignal.isExplicitRecall && item.scope !== "GLOBAL" && item.relevanceScore < 0.20 && !ambiguityCheck.resolvedProject) {
        item.isSuppressed = true;
        item.suppressionReason = "IRRELEVANT_CONTEXT_SUPPRESSED";
        continue;
      }

      // 5j. Calculate Final Composite Score
      // Authority heavily weighted (0.45) over Relevance (0.30), Recency (0.15), and Scope (0.10)
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

    // 6. Deduplication & Collapse across layers
    const deduplicatedCandidates: ContextContinuityItem[] = [];
    const keyToItemMap = new Map<string, ContextContinuityItem>();

    // Sort all non-suppressed candidates by authorityWeight DESC, then compositeScore DESC, then timestamp DESC
    const activeCandidates = allCandidates
      .filter((c) => !c.isSuppressed)
      .sort((a, b) => {
        if (b.authorityWeight !== a.authorityWeight) return b.authorityWeight - a.authorityWeight;
        if (b.compositeScore !== a.compositeScore) return b.compositeScore - a.compositeScore;
        if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
        return a.id.localeCompare(b.id); // Stable tie-breaker
      });

    for (const item of activeCandidates) {
      const existing = keyToItemMap.get(item.normalizedKey);
      if (existing) {
        // Suppress the lower-authority duplicate
        item.isSuppressed = true;
        item.suppressionReason = "DUPLICATE_LOWER_AUTHORITY";
        suppressedDuplicateCount++;
      } else {
        keyToItemMap.set(item.normalizedKey, item);
        deduplicatedCandidates.push(item);
      }
    }

    // 7. Context Budgeting & Truncation
    const selectedMemories: ContextContinuityItem[] = [];
    const selectedProjects: ContextContinuityItem[] = [];
    const selectedGoals: ContextContinuityItem[] = [];
    const selectedCommitments: ContextContinuityItem[] = [];
    const otherSelectedItems: ContextContinuityItem[] = [];

    for (const item of deduplicatedCandidates) {
      if (item.type === "MEMORY" || item.type === "USER_MODEL_ATTRIBUTE" || item.type === "TEMPORAL_PATTERN") {
        if (selectedMemories.length < budgetConfig.maxMemories) {
          selectedMemories.push(item);
        } else {
          item.isSuppressed = true;
          item.suppressionReason = "BUDGET_MEMORY_EXCEEDED";
        }
      } else if (item.type === "PROJECT") {
        if (selectedProjects.length < budgetConfig.maxProjects) {
          selectedProjects.push(item);
        } else {
          item.isSuppressed = true;
          item.suppressionReason = "BUDGET_PROJECT_EXCEEDED";
        }
      } else if (item.type === "GOAL") {
        if (selectedGoals.length < budgetConfig.maxGoals) {
          selectedGoals.push(item);
        } else {
          item.isSuppressed = true;
          item.suppressionReason = "BUDGET_GOAL_EXCEEDED";
        }
      } else if (item.type === "COMMITMENT") {
        if (selectedCommitments.length < budgetConfig.maxCommitments) {
          selectedCommitments.push(item);
        } else {
          item.isSuppressed = true;
          item.suppressionReason = "BUDGET_COMMITMENT_EXCEEDED";
        }
      } else {
        if (otherSelectedItems.length + selectedMemories.length + selectedProjects.length + selectedGoals.length + selectedCommitments.length < budgetConfig.maxTotalContextItems) {
          otherSelectedItems.push(item);
        } else {
          item.isSuppressed = true;
          item.suppressionReason = "BUDGET_TOTAL_EXCEEDED";
        }
      }
    }

    const selectedItems = [
      ...selectedProjects,
      ...selectedGoals,
      ...selectedCommitments,
      ...selectedMemories,
      ...otherSelectedItems,
    ].slice(0, budgetConfig.maxTotalContextItems);

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

    // 9. Directive Sanitization Gate (Strict stripping of internal IDs, floats, timestamps)
    const sanitizedDirectives: string[] = [];
    for (const dir of rawDirectives.slice(0, budgetConfig.maxDirectives)) {
      const sanitized = this.sanitizeDirective(dir);
      if (sanitized && !sanitizedDirectives.includes(sanitized)) {
        sanitizedDirectives.push(sanitized);
      }
    }

    // 10. Compile Final Diagnostics
    // Include both standalone and project-level selected goals and commitments
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
   * Detect current-turn overrides and conflict triggers.
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

    // Brand preference override (e.g., "Recommend Lenovo instead" / "Don't use ASUS")
    if (/\b(?:recommend|prefer|switch to|use)\s+([a-z0-9_-]+)\s+instead\b/i.test(message)) {
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
   * Determine if an item conflicts with current-turn explicit instructions.
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
   * Resolve anaphora, pronouns, and explicit project references across sessions.
   */
  private resolveContinuityTarget(
    message: string,
    candidateProjects: Project[],
    activeTopic?: string,
    isExplicitRecall?: boolean
  ): {
    resolvedProject?: Project;
    isAmbiguous: boolean;
    isResumed: boolean;
    clarificationPrompt?: string;
  } {
    if (candidateProjects.length === 0) {
      return { isAmbiguous: false, isResumed: false };
    }

    // 1. Check for explicit project naming in message (e.g. "continue Dora", "work on Dora")
    for (const proj of candidateProjects) {
      const normProj = proj.name.toLowerCase();
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
      // If there's an active topic matching one project exactly
      if (activeTopic) {
        const topicMatch = candidateProjects.find((p) => p.name.toLowerCase().includes(activeTopic.toLowerCase()));
        if (topicMatch) {
          return { resolvedProject: topicMatch, isAmbiguous: false, isResumed: true };
        }
      }

      // If exactly ONE active project exists, resolve unambiguously
      const activeProjects = candidateProjects.filter((p) => p.status === "ACTIVE");
      if (activeProjects.length === 1) {
        return { resolvedProject: activeProjects[0], isAmbiguous: false, isResumed: true };
      }

      // If MULTIPLE active projects exist and no specific context disambiguates
      if (activeProjects.length > 1) {
        const projectNames = activeProjects.map((p) => `"${p.name}"`).join(" and ");
        return {
          isAmbiguous: true,
          isResumed: false,
          clarificationPrompt: `You have multiple active projects: ${projectNames}. Which one would you like to continue?`,
        };
      }

      // If exactly one project in list overall
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
   * Determine item scope.
   */
  private determineScope(key: string, category?: string): ContinuityScope {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("language") ||
      lowerKey.includes("lang_pref") ||
      lowerKey.includes("theme") ||
      lowerKey.includes("verbosity") ||
      lowerKey.includes("tone") ||
      lowerKey.includes("laptop") ||
      lowerKey.includes("brand") ||
      lowerKey.includes("hardware") ||
      category === "COMMUNICATION" ||
      category === "PREFERENCES"
    ) {
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
   * Strict directive sanitization to strip internal IDs, confidence floats, and raw timestamps.
   */
  private sanitizeDirective(directive: string): string {
    let d = directive;

    // Strip raw entity/model IDs (e.g. mem_..., proj_..., goal_..., task_..., cc_...)
    d = d.replace(/\b(?:cc_|mem_|proj_|goal_|task_|commit_|evt_|evi_)[a-f0-9_]{4,}\b/gi, "");

    // Strip confidence floats (e.g. score=0.91, 0.85)
    d = d.replace(/\b(?:confidence|score|authority)\s*[:=]\s*0\.\d+\b/gi, "");
    d = d.replace(/\b0\.\d{2,}\b/g, "");

    // Strip raw epoch timestamps (e.g. 1700000000000)
    d = d.replace(/\b\d{10,13}\b/g, "");

    // Clean whitespace
    d = d.replace(/\s+/g, " ").trim();
    return d;
  }
}

export const contextContinuityEngine = ContextContinuityEngine.getInstance();
