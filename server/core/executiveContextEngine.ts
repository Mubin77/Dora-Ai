/**
 * Dora Executive Context Synthesis & Decision-Ready Context Engine
 * Phase 2 — Step 12
 * 
 * Centralized, deterministic context-composition engine that transforms
 * authorized outputs from upstream cognitive engines into a compact,
 * conflict-free, decision-ready executive context package.
 * 
 * Pure transformation layer: Read-only, deterministic, zero LLM calls, zero side-effects.
 */

import {
  ExecutiveContextPackage,
  ExecutiveContextInput,
  ExecutiveAuthority,
  EXECUTIVE_AUTHORITY_WEIGHTS,
  ExecutiveFact,
  ExecutivePreference,
  ExecutiveProject,
  ExecutiveGoal,
  ExecutiveCommitment,
  ExecutiveTemporalContext,
  ExecutiveContinuityContext,
  ExecutiveConstraint,
  ExecutiveResponseStyle,
  ExecutiveAdvisory,
  ExecutiveAmbiguity,
  ExecutiveConflictRecord,
  ExecutiveDiagnostics,
  ExecutiveCurrentTurn,
  FactGroundingType,
  ConflictResolutionStatus,
  DEFAULT_EXECUTIVE_BUDGET,
  ExecutiveContextBudgetConfig,
} from "./executiveContextTypes";

export class ExecutiveContextEngine {
  private static instance: ExecutiveContextEngine;

  private constructor() {}

  public static getInstance(): ExecutiveContextEngine {
    if (!ExecutiveContextEngine.instance) {
      ExecutiveContextEngine.instance = new ExecutiveContextEngine();
    }
    return ExecutiveContextEngine.instance;
  }

  /**
   * Main synthesis pipeline: Transforms upstream cognitive outputs into
   * a compact, conflict-free, decision-ready ExecutiveContextPackage.
   */
  public synthesize(input: ExecutiveContextInput): ExecutiveContextPackage {
    const startTime = 0; // Deterministic tracking
    const message = (input.message || "").trim();
    const lowerMessage = message.toLowerCase();
    const currentTime = input.options?.currentTime ?? 1724300000000;
    const budgetConfig: ExecutiveContextBudgetConfig = {
      ...DEFAULT_EXECUTIVE_BUDGET,
      ...(input.options?.budgetConfig || {}),
    };

    let totalCandidatesExamined = 0;
    let suppressedItemsCount = 0;
    let deduplicatedCount = 0;
    let topicIsolatedCount = 0;
    let staleExpiredSuppressedCount = 0;
    let predictiveSuppressedCount = 0;
    let sensitiveDataSuppressedCount = 0;
    let budgetTruncatedCount = 0;
    let resolvedConflictsCount = 0;
    let unresolvedConflictsCount = 0;

    // 1. Determine active topic and continuity context
    const activeTopic =
      (input.contextContinuity as any)?.activeTopic ||
      (input.contextContinuity?.activeProject as any)?.topic ||
      input.context?.activeTopic ||
      undefined;

    const isTopicIsolated = Boolean(
      input.options?.strictTopicIsolation ||
      (input.contextContinuity as any)?.isTopicIsolated ||
      (input.context as any)?.isTopicSwitched ||
      (input.context as any)?.isTopicSwitch ||
      input.memoryGovernance?.topicIsolationApplied
    );

    // 2. Parse Current-Turn Directives & Overrides
    const currentTurn = this.extractCurrentTurn(
      message,
      lowerMessage,
      activeTopic,
      input
    );

    // 3. Extract and Ground Candidates from Upstream Engines
    const rawFacts: Array<{
      item: ExecutiveFact;
      normalizedKey: string;
      rawStatus?: string;
      isSensitive: boolean;
      topic?: string;
      isGlobal: boolean;
    }> = [];

    const rawPreferences: Array<{
      item: ExecutivePreference;
      normalizedKey: string;
      rawStatus?: string;
      isSensitive: boolean;
      topic?: string;
      isGlobal: boolean;
    }> = [];

    const rawConstraints: ExecutiveConstraint[] = [];
    const conflictRecords: ExecutiveConflictRecord[] = [];

    // 3a. Extract Constraints (Hard constraints, Safety, Reasoning constraints)
    this.extractConstraints(input, rawConstraints);
    totalCandidatesExamined += rawConstraints.length;

    // 3b. Extract Authoritative Facts
    this.extractFacts(input, rawFacts, currentTime);
    totalCandidatesExamined += rawFacts.length;

    // 3c. Extract Preferences across User Model, Adaptive Learning, Governed Memories, Response Adaptation
    this.extractPreferences(input, rawPreferences, currentTurn, currentTime);
    totalCandidatesExamined += rawPreferences.length;

    // 4. Extract Projects, Goals, and Commitments (Strictly validated from GoalProjectEngine)
    const { projects, goals, commitments, goalProjectDiagnostics } =
      this.extractGoalProjectCommitments(input, currentTurn, activeTopic, isTopicIsolated);
    
    totalCandidatesExamined += goalProjectDiagnostics.totalExamined;
    suppressedItemsCount += goalProjectDiagnostics.suppressed;
    staleExpiredSuppressedCount += goalProjectDiagnostics.staleExpired;

    // 5. Extract Temporal Context (Lineage, Evolving preferences, Stable patterns)
    const { temporalContext, temporalDiagnostics } =
      this.extractTemporalContext(input, activeTopic, isTopicIsolated, currentTurn);
    
    totalCandidatesExamined += temporalDiagnostics.totalExamined;
    suppressedItemsCount += temporalDiagnostics.suppressed;
    staleExpiredSuppressedCount += temporalDiagnostics.staleSuppressed;

    // 6. Extract Cross-Session Continuity Context
    const continuityContext = this.extractContinuityContext(input, currentTurn);

    // 7. Resolve Ambiguity
    const ambiguity = this.extractAmbiguity(input, currentTurn, projects);

    // 8. Filter, Resolve Conflicts, and Deduplicate Preferences & Facts
    // 8a. Filter Sensitive Data
    const filteredFacts = rawFacts.filter((f) => {
      if (f.isSensitive || this.containsSensitiveData(f.item.value) || this.containsSensitiveData(f.item.key)) {
        sensitiveDataSuppressedCount++;
        suppressedItemsCount++;
        return false;
      }
      return true;
    });

    const filteredPreferences = rawPreferences.filter((p) => {
      if (p.isSensitive || this.containsSensitiveData(p.item.value) || this.containsSensitiveData(p.item.key)) {
        sensitiveDataSuppressedCount++;
        suppressedItemsCount++;
        return false;
      }
      return true;
    });

    // 8b. Topic Isolation Filtering
    const topicFilteredFacts = filteredFacts.filter((f) => {
      if (!isTopicIsolated || f.isGlobal || !activeTopic) return true;
      const isCompat = this.isCompatibleWithTopic(f.topic, activeTopic, f.isGlobal);
      if (!isCompat) {
        topicIsolatedCount++;
        suppressedItemsCount++;
        return false;
      }
      return true;
    });

    const topicFilteredPreferences = filteredPreferences.filter((p) => {
      if (!isTopicIsolated || p.isGlobal || !activeTopic) return true;
      const isCompat = this.isCompatibleWithTopic(p.topic, activeTopic, p.isGlobal);
      if (!isCompat) {
        topicIsolatedCount++;
        suppressedItemsCount++;
        return false;
      }
      return true;
    });

    // 8c. Resolve Conflicts & Deduplicate Facts
    const { resolvedFacts, factConflictRecords, factDeduplicatedCount } =
      this.resolveAndDeduplicateFacts(topicFilteredFacts, currentTurn);
    deduplicatedCount += factDeduplicatedCount;
    conflictRecords.push(...factConflictRecords);

    // 8d. Resolve Conflicts & Deduplicate Preferences
    const { resolvedPreferences, prefConflictRecords, prefDeduplicatedCount } =
      this.resolveAndDeduplicatePreferences(topicFilteredPreferences, currentTurn);
    deduplicatedCount += prefDeduplicatedCount;
    conflictRecords.push(...prefConflictRecords);

    // Update conflict counts
    for (const cr of conflictRecords) {
      if (cr.conflictStatus === "UNRESOLVED") {
        unresolvedConflictsCount++;
      } else {
        resolvedConflictsCount++;
      }
    }

    // 9. Extract and Filter Predictive Advisory Context
    const { advisories, predictiveDiagnostics } =
      this.extractPredictiveAdvisories(
        input,
        resolvedFacts,
        resolvedPreferences,
        activeTopic,
        isTopicIsolated,
        currentTurn
      );
    totalCandidatesExamined += predictiveDiagnostics.totalExamined;
    suppressedItemsCount += predictiveDiagnostics.suppressed;
    predictiveSuppressedCount += predictiveDiagnostics.predictiveSuppressed;

    // 10. Synthesize Response Style
    const responseStyle = this.synthesizeResponseStyle(
      input,
      currentTurn,
      resolvedPreferences
    );

    // 11. Context Budgeting & Truncation (Strict Authority-Ordered Truncation)
    const budgetedFacts = this.applyBudget(
      resolvedFacts,
      budgetConfig.maxFacts,
      (count) => {
        budgetTruncatedCount += count;
        suppressedItemsCount += count;
      }
    );

    const budgetedPreferences = this.applyBudget(
      resolvedPreferences,
      budgetConfig.maxPreferences,
      (count) => {
        budgetTruncatedCount += count;
        suppressedItemsCount += count;
      }
    );

    const budgetedProjects = this.applyBudget(
      projects,
      budgetConfig.maxProjects,
      (count) => {
        budgetTruncatedCount += count;
        suppressedItemsCount += count;
      }
    );

    const budgetedGoals = this.applyBudget(
      goals,
      budgetConfig.maxGoals,
      (count) => {
        budgetTruncatedCount += count;
        suppressedItemsCount += count;
      }
    );

    const budgetedCommitments = this.applyBudget(
      commitments,
      budgetConfig.maxCommitments,
      (count) => {
        budgetTruncatedCount += count;
        suppressedItemsCount += count;
      }
    );

    const budgetedTemporalPatterns = this.applyBudget(
      temporalContext.activePatterns,
      budgetConfig.maxTemporalItems,
      (count) => {
        budgetTruncatedCount += count;
        suppressedItemsCount += count;
      }
    );
    temporalContext.activePatterns = budgetedTemporalPatterns;

    const budgetedAdvisories = this.applyBudget(
      advisories,
      budgetConfig.maxAdvisories,
      (count) => {
        budgetTruncatedCount += count;
        suppressedItemsCount += count;
      }
    );

    // 12. Compile Sanitized Prompt Directives
    const promptDirectives = this.compilePromptDirectives(
      currentTurn,
      rawConstraints,
      budgetedFacts,
      budgetedPreferences,
      budgetedProjects,
      budgetedGoals,
      budgetedCommitments,
      temporalContext,
      responseStyle,
      budgetedAdvisories,
      ambiguity,
      budgetConfig.maxDirectives
    );

    const includedItemsCount =
      rawConstraints.length +
      budgetedFacts.length +
      budgetedPreferences.length +
      budgetedProjects.length +
      budgetedGoals.length +
      budgetedCommitments.length +
      temporalContext.activePatterns.length +
      budgetedAdvisories.length;

    const diagnostics: ExecutiveDiagnostics = {
      totalCandidatesExamined,
      includedItemsCount,
      suppressedItemsCount,
      deduplicatedCount,
      topicIsolatedCount,
      staleExpiredSuppressedCount,
      predictiveSuppressedCount,
      sensitiveDataSuppressedCount,
      sanitizedDirectivesCount: promptDirectives.length,
      budgetTruncatedCount,
      conflictResolutionCounts: {
        resolved: resolvedConflictsCount,
        unresolved: unresolvedConflictsCount,
      },
      executionTimeMs: 0,
    };

    return {
      currentTurn,
      authoritativeFacts: budgetedFacts,
      activePreferences: budgetedPreferences,
      activeProjects: budgetedProjects,
      activeGoals: budgetedGoals,
      activeCommitments: budgetedCommitments,
      temporalContext,
      continuityContext,
      reasoningConstraints: rawConstraints,
      responseStyle,
      advisoryContext: budgetedAdvisories,
      ambiguity,
      conflicts: conflictRecords,
      diagnostics,
      promptDirectives,
    };
  }

  // =========================================================================
  // Extraction Helpers
  // =========================================================================

  private extractCurrentTurn(
    message: string,
    lowerMessage: string,
    activeTopic: string | undefined,
    input: ExecutiveContextInput
  ): ExecutiveCurrentTurn {
    const explicitDirectives: string[] = [];
    const brandOrEntityOverrides: Array<{ original: string; replacement: string }> = [];
    const excludedToolsOrPatterns: string[] = [];

    let languageOverride: string | undefined;
    let verbosityOverride: string | undefined;
    let toneOverride: string | undefined;
    let formatOverride: string | undefined;
    let switchedProject: string | undefined;
    let pausedProject: string | undefined;

    // Language
    if (/\b(?:answer|speak|respond|write)\s+in\s+english\b|\benglish\s+(?:please|only)\b/i.test(lowerMessage)) {
      languageOverride = "ENGLISH";
      explicitDirectives.push("Current-turn instruction: Respond in English.");
    } else if (/\b(?:answer|speak|respond|write)\s+in\s+banglish\b|\bbanglish\s+(?:please|only)\b/i.test(lowerMessage)) {
      languageOverride = "BANGLISH";
      explicitDirectives.push("Current-turn instruction: Respond in Banglish.");
    } else if (/\b(?:answer|speak|respond|write)\s+in\s+bangla\b|\bbangla\s+(?:please|only)\b/i.test(lowerMessage)) {
      languageOverride = "BANGLA";
      explicitDirectives.push("Current-turn instruction: Respond in standard Bangla.");
    }

    // Verbosity
    if (/\b(?:keep\s+it\s+concise|brief|short|shortly|concisely|one\s+sentence)\b/i.test(lowerMessage)) {
      verbosityOverride = "CONCISE";
      explicitDirectives.push("Current-turn instruction: Keep response concise.");
    } else if (/\b(?:in\s+detail|detailed|explain\s+thoroughly|elaborate|in-depth)\b/i.test(lowerMessage)) {
      verbosityOverride = "DETAILED";
      explicitDirectives.push("Current-turn instruction: Provide detailed explanation.");
    }

    // Tone
    if (/\b(?:be\s+professional|professional\s+tone|formally)\b/i.test(lowerMessage)) {
      toneOverride = "PROFESSIONAL";
      explicitDirectives.push("Current-turn instruction: Use a professional tone.");
    } else if (/\b(?:be\s+casual|casual\s+tone|informal)\b/i.test(lowerMessage)) {
      toneOverride = "CASUAL";
      explicitDirectives.push("Current-turn instruction: Use a casual, friendly tone.");
    }

    // Brand / Entity substitution (e.g., "Recommend Lenovo instead of ASUS" or "Recommend Lenovo instead")
    const brandInsteadOfMatch = lowerMessage.match(/\b(?:recommend|prefer|switch to|use)\s+([a-z0-9_-]+)(?:\s+[a-z0-9_-]+)?\s+instead\s+of\s+([a-z0-9_-]+)\b/i);
    if (brandInsteadOfMatch && brandInsteadOfMatch[1] && brandInsteadOfMatch[2]) {
      const rep = brandInsteadOfMatch[1].charAt(0).toUpperCase() + brandInsteadOfMatch[1].slice(1);
      const orig = brandInsteadOfMatch[2].charAt(0).toUpperCase() + brandInsteadOfMatch[2].slice(1);
      brandOrEntityOverrides.push({ original: orig, replacement: rep });
      explicitDirectives.push(`Current-turn instruction: Prefer ${rep} over ${orig}.`);
    } else {
      const brandMatch = lowerMessage.match(/\b(?:recommend|prefer|switch to|use)\s+([a-z0-9_-]+)\s+instead\b/i);
      if (brandMatch && brandMatch[1]) {
        const brandName = brandMatch[1].charAt(0).toUpperCase() + brandMatch[1].slice(1);
        brandOrEntityOverrides.push({ original: "HISTORICAL_BRAND", replacement: brandName });
        explicitDirectives.push(`Current-turn instruction: Prefer ${brandName} over historical choices.`);
      }
    }

    // Exclusions (e.g. "Don't use Python", "No ASUS")
    const excludeMatch = lowerMessage.match(/\b(?:don'?t|do\s+not|never)\s+(?:use|recommend|include)\s+([a-z0-9_-]+)\b/i);
    if (excludeMatch && excludeMatch[1]) {
      excludedToolsOrPatterns.push(excludeMatch[1].toLowerCase());
      explicitDirectives.push(`Current-turn instruction: Do NOT use or recommend ${excludeMatch[1]}.`);
    }

    // Project switch / pause override
    const projSwitchMatch = lowerMessage.match(/\b(?:forget|pause|stop|hold)\s+([a-z0-9_\s]+?)\s*(?:for now|temporarily)?,\s*(?:let'?s\s+(?:switch to|work on|focus on)\s+([a-z0-9_\s]+))\b/i);
    if (projSwitchMatch && projSwitchMatch[1] && projSwitchMatch[2]) {
      pausedProject = projSwitchMatch[1].trim();
      switchedProject = projSwitchMatch[2].trim();
      explicitDirectives.push(`Current-turn instruction: Focus on project '${switchedProject}' (pausing '${pausedProject}').`);
    } else {
      const singleSwitch = lowerMessage.match(/\b(?:switch\s+to|let'?s\s+work\s+on|focus\s+on)\s+([a-z0-9_\s]+)\b/i);
      if (singleSwitch && singleSwitch[1]) {
        switchedProject = singleSwitch[1].trim();
      }
    }

    const requiresClarification = Boolean(
      input.intent?.requiresClarification ||
      input.reasoning?.requiresClarification ||
      input.verification?.requiresClarification ||
      input.context?.isAmbiguousReference ||
      (input.contextContinuity as any)?.ambiguityStatus === "AMBIGUOUS" ||
      input.contextContinuity?.requiresClarification
    );

    const clarificationReason =
      input.intent?.ambiguityReason ||
      input.verification?.clarificationReason ||
      (requiresClarification ? "Ambiguity detected in turn references" : undefined);

    return {
      message,
      intent: input.intent?.primaryIntent || "GENERAL_QUERY",
      primaryTopic: activeTopic,
      explicitDirectives,
      overrides: {
        language: languageOverride,
        verbosity: verbosityOverride,
        tone: toneOverride,
        format: formatOverride,
        brandOrEntityOverrides,
        switchedProject,
        pausedProject,
        excludedToolsOrPatterns,
      },
      requiresClarification,
      clarificationReason,
    };
  }

  private extractConstraints(
    input: ExecutiveContextInput,
    rawConstraints: ExecutiveConstraint[]
  ): void {
    let count = 1;

    // 1. Safety & Verification constraints
    const verifConstraints: any[] = (input.verification as any)?.constraints || input.verification?.directives || [];
    if (verifConstraints && Array.isArray(verifConstraints)) {
      for (const c of verifConstraints) {
        const desc = typeof c === "string" ? c : (c as any).description || (c as any).type || "Verification constraint";
        rawConstraints.push({
          id: `exec_const_${count++}`,
          type: "VERIFICATION",
          description: desc,
          authority: "HARD_CONSTRAINT",
          enforceStrictly: true,
          sanitizedDirective: this.sanitizeDirective(`Constraint: ${desc}`),
        });
      }
    }

    if ((input.verification as any)?.cautionDirectives) {
      for (const c of (input.verification as any).cautionDirectives) {
        const desc = typeof c === "string" ? c : (c as any).description || "Verification caution";
        rawConstraints.push({
          id: `exec_const_${count++}`,
          type: "VERIFICATION",
          description: desc,
          authority: "HARD_CONSTRAINT",
          enforceStrictly: true,
          sanitizedDirective: this.sanitizeDirective(`Caution: ${desc}`),
        });
      }
    }

    // 2. Reasoning constraints
    if ((input.reasoning as any)?.constraints) {
      for (const c of (input.reasoning as any).constraints) {
        const desc = typeof c === "string" ? c : (c as any).description || "Reasoning constraint";
        const hard = typeof c === "string" ? true : ((c as any).isHardConstraint ?? true);
        rawConstraints.push({
          id: `exec_const_${count++}`,
          type: "REASONING",
          description: desc,
          authority: "HARD_CONSTRAINT",
          enforceStrictly: hard,
          sanitizedDirective: this.sanitizeDirective(`Constraint: ${desc}`),
        });
      }
    }
  }

  private extractFacts(
    input: ExecutiveContextInput,
    rawFacts: Array<{
      item: ExecutiveFact;
      normalizedKey: string;
      rawStatus?: string;
      isSensitive: boolean;
      topic?: string;
      isGlobal: boolean;
    }>,
    currentTime: number
  ): void {
    let factIdCount = 1;

    // 1. Verified Evidence facts from VerificationEngine
    const verifEvidence = (input.verification as any)?.evidence || (input.verification as any)?.verifiedEvidence;
    if (verifEvidence) {
      const evList = Array.isArray(verifEvidence)
        ? verifEvidence
        : [verifEvidence];
      
      for (const ev of evList) {
        if (ev && typeof ev === "object") {
          const key = (ev as any).claim || (ev as any).fact || "verified_fact";
          const val = (ev as any).content || (ev as any).details || String(key);
          const isSens = this.containsSensitiveData(`${key} ${val}`);

          rawFacts.push({
            item: {
              id: `exec_fact_${factIdCount++}`,
              key,
              value: val,
              grounding: "VERIFIED_FACT",
              authority: "VERIFIED_EVIDENCE",
              authorityWeight: EXECUTIVE_AUTHORITY_WEIGHTS["VERIFIED_EVIDENCE"],
              source: "verification_engine",
              confidence: 1.0,
              isGlobal: false,
              sanitizedDirective: this.sanitizeDirective(`Verified Fact: ${key} = ${val}`),
            },
            normalizedKey: this.normalizeKey(key),
            isSensitive: isSens,
            isGlobal: false,
          });
        }
      }
    }

    // 2. Governed Memories (ONLY memories authorized by MemoryGovernanceEngine)
    const governedList: any[] = (input.memoryGovernance as any)?.governedMemories || input.memoryGovernance?.allowedMemories || [];
    if (governedList && Array.isArray(governedList)) {
      for (const gm of governedList) {
        const mem = gm.memory || gm;
        if (!mem) continue;

        // Lifecycle check
        const status = (mem.status || "ACTIVE").toUpperCase();
        if (status === "SUPERSEDED" || status === "EXPIRED" || status === "DELETED" || status === "QUARANTINED" || status === "OUTDATED") {
          continue;
        }

        // Category & Fact check (we only extract factual / profile memories as facts)
        const key = mem.key || mem.title || "memory";
        const val = mem.value || mem.content || "";
        const cat = (mem.category || mem.type || "GENERAL").toUpperCase();
        const scope = this.determineScope(key, cat);
        const isGlobal = scope === "GLOBAL";
        const isSens = this.containsSensitiveData(`${key} ${val}`);

        rawFacts.push({
          item: {
            id: `exec_fact_${factIdCount++}`,
            key,
            value: val,
            grounding: "GOVERNED_MEMORY",
            authority: "GOVERNANCE_APPROVED_MEMORY",
            authorityWeight: EXECUTIVE_AUTHORITY_WEIGHTS["GOVERNANCE_APPROVED_MEMORY"],
            source: "governed_memory",
            confidence: mem.confidence || 0.85,
            topic: cat,
            isGlobal,
            sanitizedDirective: this.sanitizeDirective(`Memory: ${key}: ${val}`),
          },
          normalizedKey: this.normalizeKey(key),
          rawStatus: status,
          isSensitive: isSens,
          topic: cat,
          isGlobal,
        });
      }
    }

    // 3. User Claims in Current Turn
    if (input.message && ((input.intent?.primaryIntent as any) === "INFORM" || input.intent?.primaryIntent === "INFORMATION")) {
      const key = "user_current_turn_claim";
      const val = input.message;
      const isSens = this.containsSensitiveData(val);

      rawFacts.push({
        item: {
          id: `exec_fact_${factIdCount++}`,
          key,
          value: val,
          grounding: "USER_PROVIDED_CURRENT_TURN_CLAIM",
          authority: "CURRENT_TURN_EXPLICIT",
          authorityWeight: EXECUTIVE_AUTHORITY_WEIGHTS["CURRENT_TURN_EXPLICIT"],
          source: "current_turn_message",
          confidence: 1.0,
          isGlobal: true,
          sanitizedDirective: this.sanitizeDirective(`User stated: ${val}`),
        },
        normalizedKey: this.normalizeKey(key),
        isSensitive: isSens,
        isGlobal: true,
      });
    }
  }

  private extractPreferences(
    input: ExecutiveContextInput,
    rawPreferences: Array<{
      item: ExecutivePreference;
      normalizedKey: string;
      rawStatus?: string;
      isSensitive: boolean;
      topic?: string;
      isGlobal: boolean;
    }>,
    currentTurn: ExecutiveCurrentTurn,
    currentTime: number
  ): void {
    let prefIdCount = 1;

    // 1. Current-Turn Explicit Overrides (Highest Authority: 1.00)
    if (currentTurn.overrides.language) {
      const key = "language";
      const val = currentTurn.overrides.language;
      rawPreferences.push({
        item: {
          id: `exec_pref_${prefIdCount++}`,
          key,
          value: val,
          dimension: "language",
          authority: "CURRENT_TURN_EXPLICIT",
          authorityWeight: EXECUTIVE_AUTHORITY_WEIGHTS["CURRENT_TURN_EXPLICIT"],
          source: "current_turn_explicit",
          isCurrentTurnOverride: true,
          isGlobal: true,
          sanitizedDirective: this.sanitizeDirective(`User preference (current turn): Language is ${val}.`),
        },
        normalizedKey: this.normalizeKey(key),
        isSensitive: false,
        isGlobal: true,
      });
    }

    if (currentTurn.overrides.verbosity) {
      const key = "verbosity";
      const val = currentTurn.overrides.verbosity;
      rawPreferences.push({
        item: {
          id: `exec_pref_${prefIdCount++}`,
          key,
          value: val,
          dimension: "verbosity",
          authority: "CURRENT_TURN_EXPLICIT",
          authorityWeight: EXECUTIVE_AUTHORITY_WEIGHTS["CURRENT_TURN_EXPLICIT"],
          source: "current_turn_explicit",
          isCurrentTurnOverride: true,
          isGlobal: true,
          sanitizedDirective: this.sanitizeDirective(`User preference (current turn): Verbosity is ${val}.`),
        },
        normalizedKey: this.normalizeKey(key),
        isSensitive: false,
        isGlobal: true,
      });
    }

    if (currentTurn.overrides.tone) {
      const key = "tone";
      const val = currentTurn.overrides.tone;
      rawPreferences.push({
        item: {
          id: `exec_pref_${prefIdCount++}`,
          key,
          value: val,
          dimension: "tone",
          authority: "CURRENT_TURN_EXPLICIT",
          authorityWeight: EXECUTIVE_AUTHORITY_WEIGHTS["CURRENT_TURN_EXPLICIT"],
          source: "current_turn_explicit",
          isCurrentTurnOverride: true,
          isGlobal: true,
          sanitizedDirective: this.sanitizeDirective(`User preference (current turn): Tone is ${val}.`),
        },
        normalizedKey: this.normalizeKey(key),
        isSensitive: false,
        isGlobal: true,
      });
    }

    for (const bo of currentTurn.overrides.brandOrEntityOverrides || []) {
      const key = "preferred_brand";
      const val = bo.replacement;
      rawPreferences.push({
        item: {
          id: `exec_pref_${prefIdCount++}`,
          key,
          value: val,
          dimension: "brand",
          authority: "CURRENT_TURN_EXPLICIT",
          authorityWeight: EXECUTIVE_AUTHORITY_WEIGHTS["CURRENT_TURN_EXPLICIT"],
          source: "current_turn_explicit",
          isCurrentTurnOverride: true,
          isGlobal: false,
          sanitizedDirective: this.sanitizeDirective(`User preference (current turn): Prefer ${val}.`),
        },
        normalizedKey: this.normalizeKey(key),
        isSensitive: false,
        topic: "HARDWARE",
        isGlobal: false,
      });
    }

    // 2. Confirmed User Model (Authority: CONFIRMED_USER_MODEL = 0.75)
    if (input.userModel?.profile) {
      const prof: any = input.userModel.profile;
      
      // Communication style
      if (prof.communication) {
        if (prof.communication.preferredLanguage && !currentTurn.overrides.language) {
          const key = "language";
          const val = prof.communication.preferredLanguage;
          rawPreferences.push({
            item: {
              id: `exec_pref_${prefIdCount++}`,
              key,
              value: val,
              dimension: "language",
              authority: "CONFIRMED_USER_MODEL",
              authorityWeight: EXECUTIVE_AUTHORITY_WEIGHTS["CONFIRMED_USER_MODEL"],
              source: "user_model_profile",
              isCurrentTurnOverride: false,
              isGlobal: true,
              sanitizedDirective: this.sanitizeDirective(`User prefers ${val} language.`),
            },
            normalizedKey: this.normalizeKey(key),
            isSensitive: false,
            isGlobal: true,
          });
        }

        if (prof.communication.preferredVerbosity && !currentTurn.overrides.verbosity) {
          const key = "verbosity";
          const val = prof.communication.preferredVerbosity;
          rawPreferences.push({
            item: {
              id: `exec_pref_${prefIdCount++}`,
              key,
              value: val,
              dimension: "verbosity",
              authority: "CONFIRMED_USER_MODEL",
              authorityWeight: EXECUTIVE_AUTHORITY_WEIGHTS["CONFIRMED_USER_MODEL"],
              source: "user_model_profile",
              isCurrentTurnOverride: false,
              isGlobal: true,
              sanitizedDirective: this.sanitizeDirective(`User prefers ${val} responses.`),
            },
            normalizedKey: this.normalizeKey(key),
            isSensitive: false,
            isGlobal: true,
          });
        }
      }

      // Confirmed preferences list
      const confirmedList = prof.confirmedPreferences || prof.confirmedAttributes || Object.values(prof.attributes || {});
      if (Array.isArray(confirmedList)) {
        for (const pref of confirmedList) {
          const key = pref.key || pref.dimension || "preference";
          const val = pref.normalizedValue || pref.value || "";
          const status = (pref.status || "CONFIRMED").toUpperCase();
          if (status === "QUARANTINED" || status === "DELETED" || status === "EXPIRED" || status === "OUTDATED") {
            continue;
          }

          const scope = this.determineScope(key, pref.category || pref.dimension);
          const isGlobal = scope === "GLOBAL";
          const isSens = this.containsSensitiveData(`${key} ${val}`);

          rawPreferences.push({
            item: {
              id: `exec_pref_${prefIdCount++}`,
              key,
              value: val,
              dimension: pref.dimension || key,
              authority: "CONFIRMED_USER_MODEL",
              authorityWeight: EXECUTIVE_AUTHORITY_WEIGHTS["CONFIRMED_USER_MODEL"],
              source: "user_model_confirmed_preferences",
              isCurrentTurnOverride: false,
              isGlobal,
              sanitizedDirective: this.sanitizeDirective(`User confirmed preference: ${key} = ${val}`),
            },
            normalizedKey: this.normalizeKey(key),
            rawStatus: status,
            isSensitive: isSens,
            topic: pref.dimension || pref.category,
            isGlobal,
          });
        }
      }
    }

    // 3. Governed Memory Preferences (Authority: GOVERNANCE_APPROVED_MEMORY = 0.80)
    const governedList: any[] = (input.memoryGovernance as any)?.governedMemories || input.memoryGovernance?.allowedMemories || [];
    if (governedList && Array.isArray(governedList)) {
      for (const gm of governedList) {
        const mem = gm.memory || gm;
        if (!mem) continue;

        const status = (mem.status || "ACTIVE").toUpperCase();
        if (status === "SUPERSEDED" || status === "EXPIRED" || status === "DELETED" || status === "QUARANTINED" || status === "OUTDATED") {
          continue;
        }

        const cat = (mem.category || mem.type || "GENERAL").toUpperCase();
        if (cat === "PREFERENCE" || cat === "PERSONALIZATION" || cat === "STYLE") {
          const key = mem.key || mem.title || "memory_preference";
          const val = mem.value || mem.content || "";
          const scope = this.determineScope(key, cat);
          const isGlobal = scope === "GLOBAL";
          const isSens = this.containsSensitiveData(`${key} ${val}`);

          rawPreferences.push({
            item: {
              id: `exec_pref_${prefIdCount++}`,
              key,
              value: val,
              dimension: cat,
              authority: "GOVERNANCE_APPROVED_MEMORY",
              authorityWeight: EXECUTIVE_AUTHORITY_WEIGHTS["GOVERNANCE_APPROVED_MEMORY"],
              source: "governed_memory_preference",
              isCurrentTurnOverride: false,
              isGlobal,
              sanitizedDirective: this.sanitizeDirective(`Governed memory preference: ${key}: ${val}`),
            },
            normalizedKey: this.normalizeKey(key),
            rawStatus: status,
            isSensitive: isSens,
            topic: cat,
            isGlobal,
          });
        }
      }
    }

    // 4. Adaptive Habits (Authority: CONFIRMED_ADAPTIVE_PATTERN = 0.50)
    if (input.adaptiveLearning?.patterns) {
      for (const pat of input.adaptiveLearning.patterns) {
        const status = (pat.status || "OBSERVED").toUpperCase();
        if (status !== "CONFIRMED") continue; // Only confirmed patterns

        const key = (pat as any).patternKey || pat.key || "adaptive_habit";
        const val = (pat as any).preferredValue || pat.value || "";
        const domain = (pat as any).domain || pat.category || key;
        const scope = this.determineScope(key, domain);
        const isGlobal = scope === "GLOBAL";
        const isSens = this.containsSensitiveData(`${key} ${val}`);

        rawPreferences.push({
          item: {
            id: `exec_pref_${prefIdCount++}`,
            key,
            value: val,
            dimension: domain,
            authority: "CONFIRMED_ADAPTIVE_PATTERN",
            authorityWeight: EXECUTIVE_AUTHORITY_WEIGHTS["CONFIRMED_ADAPTIVE_PATTERN"],
            source: "adaptive_learning_pattern",
            isCurrentTurnOverride: false,
            isGlobal,
            sanitizedDirective: this.sanitizeDirective(`Adaptive preference: ${key} = ${val}`),
          },
          normalizedKey: this.normalizeKey(key),
          rawStatus: status,
          isSensitive: isSens,
          topic: domain,
          isGlobal,
        });
      }
    }
  }

  private extractGoalProjectCommitments(
    input: ExecutiveContextInput,
    currentTurn: ExecutiveCurrentTurn,
    activeTopic: string | undefined,
    isTopicIsolated: boolean
  ): {
    projects: ExecutiveProject[];
    goals: ExecutiveGoal[];
    commitments: ExecutiveCommitment[];
    goalProjectDiagnostics: {
      totalExamined: number;
      suppressed: number;
      staleExpired: number;
    };
  } {
    const projects: ExecutiveProject[] = [];
    const goals: ExecutiveGoal[] = [];
    const commitments: ExecutiveCommitment[] = [];

    let totalExamined = 0;
    let suppressed = 0;
    let staleExpired = 0;

    if (!input.goalProject) {
      return {
        projects,
        goals,
        commitments,
        goalProjectDiagnostics: { totalExamined, suppressed, staleExpired },
      };
    }

    // 1. Projects
    const rawProjects: any[] = input.goalProject.activeProjects || (input.goalProject as any).projects || [];
    if (rawProjects && Array.isArray(rawProjects)) {
      for (const proj of rawProjects) {
        totalExamined++;
        const status = (proj.status || "ACTIVE").toUpperCase();

        // Lifecycle check: Reject completed/archived/abandoned projects from active presentation
        if (status === "COMPLETED" || status === "ARCHIVED" || status === "ABANDONED" || status === "EXPIRED") {
          staleExpired++;
          suppressed++;
          continue;
        }

        // Current-turn paused project override
        if (currentTurn.overrides.pausedProject) {
          const pausedNorm = currentTurn.overrides.pausedProject.toLowerCase();
          if (proj.name.toLowerCase().includes(pausedNorm) || pausedNorm.includes(proj.name.toLowerCase())) {
            suppressed++;
            continue;
          }
        }

        // Topic isolation check
        if (isTopicIsolated && activeTopic) {
          const isCompat =
            proj.name.toLowerCase().includes(activeTopic.toLowerCase()) ||
            activeTopic.toLowerCase().includes(proj.name.toLowerCase()) ||
            (proj.description && proj.description.toLowerCase().includes(activeTopic.toLowerCase()));
          if (!isCompat) {
            suppressed++;
            continue;
          }
        }

        const isPrimaryActive = Boolean(
          ((input.goalProject as any).primaryActiveProject && (input.goalProject as any).primaryActiveProject.id === (proj.projectId || proj.id)) ||
          (currentTurn.overrides.switchedProject &&
            proj.name.toLowerCase().includes(currentTurn.overrides.switchedProject.toLowerCase()))
        );

        const activeTasks = (proj.tasks || [])
          .filter((t: any) => t.status === "READY" || t.status === "IN_PROGRESS")
          .map((t: any) => t.title || t.name);

        const readyTasks = (proj.tasks || [])
          .filter((t: any) => t.status === "READY")
          .map((t: any) => t.title || t.name);

        const blockers = (proj.blockers || []).map((b: any) =>
          typeof b === "string" ? b : b.description || b.text || b.name || String(b)
        );

        projects.push({
          id: proj.projectId || proj.id || `exec_proj_${proj.name}`,
          name: proj.name,
          status: proj.status,
          description: proj.description,
          currentMilestone: proj.milestones?.find((m: any) => m.status === "IN_PROGRESS")?.title,
          activeTasks,
          readyTasks,
          blockers,
          isPrimaryActive,
          sanitizedDirective: this.sanitizeDirective(
            `Active Project: ${proj.name}${proj.description ? ` (${proj.description})` : ""}${
              activeTasks.length > 0 ? ` [Next: ${activeTasks.slice(0, 2).join(", ")}]` : ""
            }`
          ),
        });
      }
    }

    // 2. Goals
    const rawGoals: any[] = input.goalProject.activeGoals || (input.goalProject as any).goals || [];
    if (rawGoals && Array.isArray(rawGoals)) {
      for (const goal of rawGoals) {
        totalExamined++;
        const status = (goal.status || "ACTIVE").toUpperCase();

        if (status === "COMPLETED" || status === "ABANDONED" || status === "ARCHIVED") {
          staleExpired++;
          suppressed++;
          continue;
        }

        goals.push({
          id: goal.goalId || goal.id || `exec_goal_${goal.title}`,
          title: goal.title,
          status: goal.status,
          priority: goal.priority || "MEDIUM",
          targetDate: goal.targetDateString || (typeof goal.targetDate === "number" ? new Date(goal.targetDate).toISOString() : goal.targetDate),
          scope: goal.scope || "GLOBAL",
          sanitizedDirective: this.sanitizeDirective(`Active Goal: ${goal.title} (Priority: ${goal.priority || "MEDIUM"})`),
        });
      }
    }

    // 3. Commitments (Strictly validated from direct user commitments)
    const rawCommitments: any[] = input.goalProject.activeCommitments || (input.goalProject as any).commitments || [];
    if (rawCommitments && Array.isArray(rawCommitments)) {
      for (const comm of rawCommitments) {
        totalExamined++;
        const status = (comm.status || "ACTIVE").toUpperCase();

        if (status === "COMPLETED" || status === "EXPIRED" || status === "CANCELLED") {
          staleExpired++;
          suppressed++;
          continue;
        }

        // Must originate from direct user commitment, not uncertain/question/assistant statement
        const sourceIntent = comm.sourceIntent || "DIRECT_USER_COMMITMENT";
        if (sourceIntent === "QUESTION" || sourceIntent === "HYPOTHETICAL" || sourceIntent === "ASSISTANT_STATEMENT") {
          suppressed++;
          continue;
        }

        commitments.push({
          id: comm.commitmentId || comm.id || `exec_commit_${comm.description}`,
          description: comm.description,
          status: comm.status,
          dueDate: comm.dueDateString || comm.dueDate,
          sourceIntent,
          sanitizedDirective: this.sanitizeDirective(`Active Commitment: ${comm.description}${comm.dueDate ? ` (Due: ${comm.dueDate})` : ""}`),
        });
      }
    }

    return {
      projects,
      goals,
      commitments,
      goalProjectDiagnostics: { totalExamined, suppressed, staleExpired },
    };
  }

  private extractTemporalContext(
    input: ExecutiveContextInput,
    activeTopic: string | undefined,
    isTopicIsolated: boolean,
    currentTurn: ExecutiveCurrentTurn
  ): {
    temporalContext: ExecutiveTemporalContext;
    temporalDiagnostics: {
      totalExamined: number;
      suppressed: number;
      staleSuppressed: number;
    };
  } {
    const activePatterns: ExecutiveTemporalContext["activePatterns"] = [];
    const evolvingLineage: ExecutiveTemporalContext["evolvingLineage"] = [];

    let totalExamined = 0;
    let suppressed = 0;
    let staleSuppressed = 0;

    if (!input.temporalMemory) {
      return {
        temporalContext: {
          activePatterns,
          evolvingLineage,
          suppressedStaleCount: 0,
        },
        temporalDiagnostics: { totalExamined, suppressed, staleSuppressed },
      };
    }

    if (input.temporalMemory.patterns && Array.isArray(input.temporalMemory.patterns)) {
      for (const pat of input.temporalMemory.patterns) {
        totalExamined++;
        const status = ((pat as any).status || pat.temporalStatus || "CURRENT").toUpperCase();

        // Stale & Expired lifecycle suppression
        if (status === "STALE" || status === "SUPERSEDED" || status === "EXPIRED" || status === "UNKNOWN") {
          staleSuppressed++;
          suppressed++;
          continue;
        }

        // Topic isolation
        const key = (pat as any).patternKey || (pat as any).key || pat.attributeKey || "temporal_pattern";
        const val = (pat as any).value || pat.currentValue || "";
        const topic = (pat as any).topic || pat.dimension;
        const scope = this.determineScope(key, topic);
        const isGlobal = scope === "GLOBAL";

        if (isTopicIsolated && !isGlobal && activeTopic) {
          const isCompat = this.isCompatibleWithTopic(topic, activeTopic, isGlobal);
          if (!isCompat) {
            suppressed++;
            continue;
          }
        }

        // Evolving check
        if (status === "EVOLVING" && pat.previousValues && pat.previousValues.length > 0) {
          const lastPrev = pat.previousValues[pat.previousValues.length - 1];
          const fromVal = typeof lastPrev === "string" ? lastPrev : (lastPrev.value || lastPrev.normalizedValue || "");
          evolvingLineage.push({
            key,
            fromValue: fromVal,
            toValue: val,
            isCurrentTurnEvolution: (pat as any).isCurrentTurnEvolution ?? false,
          });
        }

        activePatterns.push({
          key,
          value: val,
          status: (pat as any).status || pat.temporalStatus,
          authority: "TEMPORAL_CONTEXT",
          sanitizedDirective: this.sanitizeDirective(`Temporal context: ${key} = ${val} (${status.toLowerCase()})`),
        });
      }
    }

    return {
      temporalContext: {
        activePatterns,
        evolvingLineage,
        suppressedStaleCount: staleSuppressed,
      },
      temporalDiagnostics: { totalExamined, suppressed, staleSuppressed },
    };
  }

  private extractContinuityContext(
    input: ExecutiveContextInput,
    currentTurn: ExecutiveCurrentTurn
  ): ExecutiveContinuityContext {
    const continuity = input.contextContinuity;

    let continuityStatus = continuity?.continuityStatus || "NONE";
    if (currentTurn.overrides.switchedProject) {
      continuityStatus = "SWITCHED";
    } else if (currentTurn.requiresClarification) {
      continuityStatus = "AMBIGUOUS";
    }

    return {
      continuityStatus,
      activeTopic: (continuity as any)?.activeTopic || (continuity?.activeProject as any)?.topic || input.context?.activeTopic,
      resumedProject: (continuity as any)?.activeProjectSummary?.name || continuity?.activeProject?.name,
      switchedAwayFrom: currentTurn.overrides.pausedProject,
      isTopicIsolated: Boolean((continuity as any)?.isTopicIsolated || (input.context as any)?.isTopicSwitched || (input.context as any)?.isTopicSwitch),
    };
  }

  private extractAmbiguity(
    input: ExecutiveContextInput,
    currentTurn: ExecutiveCurrentTurn,
    projects: ExecutiveProject[]
  ): ExecutiveAmbiguity {
    const isAmbiguous = Boolean(
      currentTurn.requiresClarification ||
      (input.contextContinuity as any)?.ambiguityStatus === "AMBIGUOUS" ||
      input.contextContinuity?.requiresClarification ||
      input.context?.isAmbiguousReference
    );

    const competingTargets: string[] = [];
    if ((input.contextContinuity as any)?.competingCandidates) {
      competingTargets.push(
        ...(input.contextContinuity as any).competingCandidates.map((c: any) => c.title || c.id)
      );
    } else if (isAmbiguous && projects.length > 1) {
      competingTargets.push(...projects.map((p) => p.name));
    }

    let clarificationPrompt: string | undefined;
    if (isAmbiguous) {
      if (competingTargets.length > 1) {
        clarificationPrompt = `Which project are you referring to: ${competingTargets.join(" or ")}?`;
      } else {
        clarificationPrompt =
          input.contextContinuity?.clarificationPrompt ||
          input.reasoning?.clarificationPrompt ||
          input.intent?.ambiguityReason ||
          "Please clarify your request.";
      }
    }

    return {
      isAmbiguous,
      status: isAmbiguous ? "AMBIGUOUS" : "CLEAR",
      competingTargets: Array.from(new Set(competingTargets)),
      clarificationPrompt,
    };
  }

  // =========================================================================
  // Conflict Resolution & Deduplication
  // =========================================================================

  private resolveAndDeduplicateFacts(
    rawFacts: Array<{
      item: ExecutiveFact;
      normalizedKey: string;
      rawStatus?: string;
      isSensitive: boolean;
      topic?: string;
      isGlobal: boolean;
    }>,
    currentTurn: ExecutiveCurrentTurn
  ): {
    resolvedFacts: ExecutiveFact[];
    factConflictRecords: ExecutiveConflictRecord[];
    factDeduplicatedCount: number;
  } {
    const groups = new Map<string, Array<{ item: ExecutiveFact; rawStatus?: string }>>();
    for (const f of rawFacts) {
      const list = groups.get(f.normalizedKey) || [];
      list.push(f);
      groups.set(f.normalizedKey, list);
    }

    const resolvedFacts: ExecutiveFact[] = [];
    const factConflictRecords: ExecutiveConflictRecord[] = [];
    let factDeduplicatedCount = 0;

    for (const [normKey, candidates] of groups.entries()) {
      if (candidates.length === 1) {
        resolvedFacts.push(candidates[0].item);
        continue;
      }

      // Sort candidates by authority weight descending, then confidence descending, then deterministic id
      candidates.sort((a, b) => {
        const weightA = EXECUTIVE_AUTHORITY_WEIGHTS[a.item.authority] || 0;
        const weightB = EXECUTIVE_AUTHORITY_WEIGHTS[b.item.authority] || 0;
        if (weightB !== weightA) return weightB - weightA;
        if (b.item.confidence !== a.item.confidence) return b.item.confidence - a.item.confidence;
        return a.item.id.localeCompare(b.item.id);
      });

      const winner = candidates[0];
      const suppressed = candidates.slice(1);
      factDeduplicatedCount += suppressed.length;

      // Check for equal authority contradiction
      const second = candidates[1];
      const isContradiction =
        second &&
        EXECUTIVE_AUTHORITY_WEIGHTS[winner.item.authority] === EXECUTIVE_AUTHORITY_WEIGHTS[second.item.authority] &&
        winner.item.value.toLowerCase() !== second.item.value.toLowerCase();

      factConflictRecords.push({
        key: normKey,
        winner: {
          source: winner.item.source,
          authority: winner.item.authority,
          value: winner.item.value,
        },
        suppressed: suppressed.map((s) => ({
          source: s.item.source,
          authority: s.item.authority,
          value: s.item.value,
          reason: "LOWER_AUTHORITY_OR_DUPLICATE_COLLAPSED",
        })),
        conflictStatus: isContradiction ? "UNRESOLVED" : "RESOLVED_BY_AUTHORITY",
      });

      if (isContradiction) {
        // Equal authority contradiction -> mark unresolved and do not promote definitive winner
        winner.item.grounding = "UNRESOLVED";
      }

      resolvedFacts.push(winner.item);
    }

    // Sort final facts by authority weight descending
    resolvedFacts.sort((a, b) => {
      const diff = (EXECUTIVE_AUTHORITY_WEIGHTS[b.authority] || 0) - (EXECUTIVE_AUTHORITY_WEIGHTS[a.authority] || 0);
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
    });

    return { resolvedFacts, factConflictRecords, factDeduplicatedCount };
  }

  private resolveAndDeduplicatePreferences(
    rawPreferences: Array<{
      item: ExecutivePreference;
      normalizedKey: string;
      rawStatus?: string;
      isSensitive: boolean;
      topic?: string;
      isGlobal: boolean;
    }>,
    currentTurn: ExecutiveCurrentTurn
  ): {
    resolvedPreferences: ExecutivePreference[];
    prefConflictRecords: ExecutiveConflictRecord[];
    prefDeduplicatedCount: number;
  } {
    const groups = new Map<string, Array<{ item: ExecutivePreference; rawStatus?: string }>>();
    for (const p of rawPreferences) {
      const list = groups.get(p.normalizedKey) || [];
      list.push(p);
      groups.set(p.normalizedKey, list);
    }

    const resolvedPreferences: ExecutivePreference[] = [];
    const prefConflictRecords: ExecutiveConflictRecord[] = [];
    let prefDeduplicatedCount = 0;

    for (const [normKey, candidates] of groups.entries()) {
      if (candidates.length === 1) {
        resolvedPreferences.push(candidates[0].item);
        continue;
      }

      // Check if one of candidates is CURRENT_TURN_EXPLICIT
      const explicitTurnCandidate = candidates.find((c) => c.item.authority === "CURRENT_TURN_EXPLICIT");

      if (explicitTurnCandidate) {
        const suppressed = candidates.filter((c) => c !== explicitTurnCandidate);
        prefDeduplicatedCount += suppressed.length;

        prefConflictRecords.push({
          key: normKey,
          winner: {
            source: explicitTurnCandidate.item.source,
            authority: explicitTurnCandidate.item.authority,
            value: explicitTurnCandidate.item.value,
          },
          suppressed: suppressed.map((s) => ({
            source: s.item.source,
            authority: s.item.authority,
            value: s.item.value,
            reason: "SUPPRESSED_BY_CURRENT_TURN_EXPLICIT",
          })),
          conflictStatus: "RESOLVED_BY_CURRENT_TURN",
        });

        resolvedPreferences.push(explicitTurnCandidate.item);
        continue;
      }

      // Sort by authority weight descending, then deterministic id
      candidates.sort((a, b) => {
        const weightA = EXECUTIVE_AUTHORITY_WEIGHTS[a.item.authority] || 0;
        const weightB = EXECUTIVE_AUTHORITY_WEIGHTS[b.item.authority] || 0;
        if (weightB !== weightA) return weightB - weightA;
        return a.item.id.localeCompare(b.item.id);
      });

      const winner = candidates[0];
      const suppressed = candidates.slice(1);
      prefDeduplicatedCount += suppressed.length;

      prefConflictRecords.push({
        key: normKey,
        winner: {
          source: winner.item.source,
          authority: winner.item.authority,
          value: winner.item.value,
        },
        suppressed: suppressed.map((s) => ({
          source: s.item.source,
          authority: s.item.authority,
          value: s.item.value,
          reason: "LOWER_AUTHORITY_OR_DUPLICATE_COLLAPSED",
        })),
        conflictStatus: "RESOLVED_BY_AUTHORITY",
      });

      resolvedPreferences.push(winner.item);
    }

    // Sort final preferences by authority weight descending
    resolvedPreferences.sort((a, b) => {
      const diff = (EXECUTIVE_AUTHORITY_WEIGHTS[b.authority] || 0) - (EXECUTIVE_AUTHORITY_WEIGHTS[a.authority] || 0);
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
    });

    return { resolvedPreferences, prefConflictRecords, prefDeduplicatedCount };
  }

  // =========================================================================
  // Predictive Context & Response Adaptation Synthesizers
  // =========================================================================

  private extractPredictiveAdvisories(
    input: ExecutiveContextInput,
    resolvedFacts: ExecutiveFact[],
    resolvedPreferences: ExecutivePreference[],
    activeTopic: string | undefined,
    isTopicIsolated: boolean,
    currentTurn: ExecutiveCurrentTurn
  ): {
    advisories: ExecutiveAdvisory[];
    predictiveDiagnostics: {
      totalExamined: number;
      suppressed: number;
      predictiveSuppressed: number;
    };
  } {
    let totalExamined = 0;
    let suppressed = 0;
    let predictiveSuppressed = 0;

    const list: ExecutiveAdvisory[] = [];

    if (!input.predictiveContext) {
      return {
        advisories: list,
        predictiveDiagnostics: { totalExamined, suppressed, predictiveSuppressed },
      };
    }

    const candidateList =
      input.predictiveContext.acceptedCandidates ||
      (input.predictiveContext as any).candidates ||
      input.predictiveContext.directives?.map((d, i) => ({
        id: `pred_${i}`,
        title: d,
        content: d,
        relevanceScore: 0.5,
      })) ||
      [];

    const authoritativeKeys = new Set([
      ...resolvedFacts.map((f) => this.normalizeKey(f.key)),
      ...resolvedPreferences.map((p) => this.normalizeKey(p.key)),
    ]);

    for (const cand of candidateList) {
      totalExamined++;
      const key = (cand as any).key || (cand as any).title || (cand as any).contextSummary || "predictive_suggestion";
      const val = (cand as any).content || (cand as any).suggestion || (cand as any).directive || String(key);
      const normKey = this.normalizeKey(key);

      // 1. Sensitive check
      if (this.containsSensitiveData(`${key} ${val}`)) {
        suppressed++;
        predictiveSuppressed++;
        continue;
      }

      // 2. Conflict with higher authority check
      if (authoritativeKeys.has(normKey)) {
        suppressed++;
        predictiveSuppressed++;
        continue;
      }

      // 3. Current-turn exclusion check
      if (currentTurn.overrides.excludedToolsOrPatterns) {
        const isExcluded = currentTurn.overrides.excludedToolsOrPatterns.some(
          (ex) => normKey.includes(ex) || val.toLowerCase().includes(ex)
        );
        if (isExcluded) {
          suppressed++;
          predictiveSuppressed++;
          continue;
        }
      }

      // 4. Topic isolation check
      const candTopic = (cand as any).topic || (cand as any).domain;
      if (isTopicIsolated && activeTopic && candTopic) {
        const isCompat = this.isCompatibleWithTopic(candTopic, activeTopic, false);
        if (!isCompat) {
          suppressed++;
          predictiveSuppressed++;
          continue;
        }
      }

      list.push({
        id: cand.id || `exec_adv_${list.length + 1}`,
        key,
        suggestion: val,
        relevanceScore: (cand as any).relevanceScore || (cand as any).relevance || 0.5,
        topic: candTopic,
        isAdvisoryOnly: true,
        sanitizedDirective: this.sanitizeDirective(`Advisory suggestion: ${val}`),
      });
    }

    return {
      advisories: list,
      predictiveDiagnostics: { totalExamined, suppressed, predictiveSuppressed },
    };
  }

  private synthesizeResponseStyle(
    input: ExecutiveContextInput,
    currentTurn: ExecutiveCurrentTurn,
    resolvedPreferences: ExecutivePreference[]
  ): ExecutiveResponseStyle {
    const adaptation = input.responseAdaptation;
    const styleProf = adaptation?.styleProfile;

    // Default style
    let language = styleProf?.language?.value || (adaptation as any)?.resolvedLanguage?.value || "ENGLISH";
    let verbosity = styleProf?.verbosity?.value || (adaptation as any)?.resolvedVerbosity?.value || "NORMAL";
    let tone = styleProf?.tone?.value || (adaptation as any)?.resolvedTone?.value || "WARM_FRIENDLY";
    let formatStyle = styleProf?.formatStyle?.value || (adaptation as any)?.resolvedFormat?.value || "PROSE";
    let codeDensity = styleProf?.codeDensity?.value || (adaptation as any)?.resolvedCodeDensity?.value || "BALANCED";
    let explanationDepth = styleProf?.explanationDepth?.value || (adaptation as any)?.resolvedExplanationDepth?.value || "INTERMEDIATE";

    const winningLayers: Record<string, string> = {
      language: styleProf?.language?.winningLayer || (adaptation as any)?.resolvedLanguage?.winningLayer || "SYSTEM_DEFAULT",
      verbosity: styleProf?.verbosity?.winningLayer || (adaptation as any)?.resolvedVerbosity?.winningLayer || "SYSTEM_DEFAULT",
      tone: styleProf?.tone?.winningLayer || (adaptation as any)?.resolvedTone?.winningLayer || "SYSTEM_DEFAULT",
      formatStyle: styleProf?.formatStyle?.winningLayer || (adaptation as any)?.resolvedFormat?.winningLayer || "SYSTEM_DEFAULT",
      codeDensity: styleProf?.codeDensity?.winningLayer || (adaptation as any)?.resolvedCodeDensity?.winningLayer || "SYSTEM_DEFAULT",
      explanationDepth: styleProf?.explanationDepth?.winningLayer || (adaptation as any)?.resolvedExplanationDepth?.winningLayer || "SYSTEM_DEFAULT",
    };

    // Apply resolved preferences from User Model / Governed Memories
    for (const p of resolvedPreferences) {
      if (p.dimension === "language" || p.key === "language") {
        language = p.value.toUpperCase();
        winningLayers.language = p.authority;
      } else if (p.dimension === "verbosity" || p.key === "verbosity") {
        verbosity = p.value.toUpperCase();
        winningLayers.verbosity = p.authority;
      } else if (p.dimension === "tone" || p.key === "tone") {
        tone = p.value.toUpperCase();
        winningLayers.tone = p.authority;
      }
    }

    // CURRENT_TURN_EXPLICIT has absolute precedence over all historical styles
    if (currentTurn.overrides.language) {
      language = currentTurn.overrides.language;
      winningLayers.language = "CURRENT_TURN_EXPLICIT";
    }
    if (currentTurn.overrides.verbosity) {
      verbosity = currentTurn.overrides.verbosity;
      winningLayers.verbosity = "CURRENT_TURN_EXPLICIT";
    }
    if (currentTurn.overrides.tone) {
      tone = currentTurn.overrides.tone;
      winningLayers.tone = "CURRENT_TURN_EXPLICIT";
    }
    if (currentTurn.overrides.format) {
      formatStyle = currentTurn.overrides.format;
      winningLayers.formatStyle = "CURRENT_TURN_EXPLICIT";
    }

    const sanitizedDirectives: string[] = [];
    if (language) sanitizedDirectives.push(`Response language: ${language}`);
    if (verbosity) sanitizedDirectives.push(`Response verbosity: ${verbosity}`);
    if (tone) sanitizedDirectives.push(`Response tone: ${tone}`);

    return {
      language,
      verbosity,
      tone,
      formatStyle,
      codeDensity,
      explanationDepth,
      winningLayers,
      sanitizedDirectives,
    };
  }

  // =========================================================================
  // Context Budgeting & Directives Compilation
  // =========================================================================

  private applyBudget<T>(
    items: T[],
    maxCount: number,
    onTruncate: (count: number) => void
  ): T[] {
    if (items.length <= maxCount) {
      return items;
    }
    const truncatedCount = items.length - maxCount;
    onTruncate(truncatedCount);
    return items.slice(0, maxCount);
  }

  private compilePromptDirectives(
    currentTurn: ExecutiveCurrentTurn,
    constraints: ExecutiveConstraint[],
    facts: ExecutiveFact[],
    preferences: ExecutivePreference[],
    projects: ExecutiveProject[],
    goals: ExecutiveGoal[],
    commitments: ExecutiveCommitment[],
    temporal: ExecutiveTemporalContext,
    responseStyle: ExecutiveResponseStyle,
    advisories: ExecutiveAdvisory[],
    ambiguity: ExecutiveAmbiguity,
    maxDirectives: number
  ): string[] {
    const directives: string[] = [];

    const addDirective = (d: string) => {
      const sanitized = this.sanitizeDirective(d);
      if (sanitized && !directives.includes(sanitized) && directives.length < maxDirectives) {
        directives.push(sanitized);
      }
    };

    // 1. Current-turn explicit overrides (Highest priority in prompt)
    for (const d of currentTurn.explicitDirectives) {
      addDirective(d);
    }

    // 2. Ambiguity clarification requirement (if ambiguous)
    if (ambiguity.isAmbiguous && ambiguity.clarificationPrompt) {
      addDirective(`Clarification requirement: ${ambiguity.clarificationPrompt}`);
    }

    // 3. Hard Safety & Reasoning Constraints
    for (const c of constraints) {
      addDirective(c.sanitizedDirective);
    }

    // 4. Authoritative Facts (Highest authority first)
    for (const f of facts) {
      addDirective(f.sanitizedDirective);
    }

    // 5. Active Projects & Tasks
    for (const p of projects) {
      addDirective(p.sanitizedDirective);
    }

    // 6. Active Goals & Commitments
    for (const g of goals) {
      addDirective(g.sanitizedDirective);
    }
    for (const c of commitments) {
      addDirective(c.sanitizedDirective);
    }

    // 7. Active Personalization Preferences
    for (const p of preferences) {
      addDirective(p.sanitizedDirective);
    }

    // 8. Temporal Context Directives
    for (const t of temporal.activePatterns) {
      addDirective(t.sanitizedDirective);
    }

    // 9. Response Style Presentation Directives
    for (const s of responseStyle.sanitizedDirectives) {
      addDirective(s);
    }

    // 10. Predictive Advisory Directives
    for (const a of advisories) {
      addDirective(a.sanitizedDirective);
    }

    return directives;
  }

  // =========================================================================
  // General Utility & Security Methods
  // =========================================================================

  public sanitizeDirective(rawText: string): string {
    if (!rawText) return "";

    return (
      rawText
        // Strip internal IDs
        .replace(/\b(?:mem|pat|cand|evi|proj|goal|commit|db)_[a-zA-Z0-9_\-]+\b/gi, "")
        // Strip hashes & hex
        .replace(/sha256:[a-fA-F0-9]+/gi, "")
        .replace(/\b0x[a-fA-F0-9]+\b/gi, "")
        // Strip confidence & authority scores
        .replace(/\b(?:confidence|authority|weight|score)\s*[:=]\s*\d+(?:\.\d+)?/gi, "")
        // Strip raw timestamps
        .replace(/\btimestamp\s*[:=]\s*\d{10,13}\b/gi, "")
        // Clean up redundant punctuation & whitespace
        .replace(/\s{2,}/g, " ")
        .replace(/\(\s*\)/g, "")
        .replace(/\[\s*\]/g, "")
        .replace(/:\s*:/g, ":")
        .trim()
    );
  }

  public containsSensitiveData(text: string): boolean {
    if (!text) return false;

    // API Keys (e.g. OpenAI sk-..., GitHub ghp_..., AWS AKIA...)
    if (/sk-[a-zA-Z0-9_\-]{16,}/i.test(text)) return true;
    if (/ghp_[a-zA-Z0-9]{20,}/i.test(text)) return true;
    if (/AKIA[0-9A-Z]{16}/i.test(text)) return true;

    // Bearer / Auth tokens
    if (/Bearer\s+[a-zA-Z0-9_\-\.]{16,}/i.test(text)) return true;

    // Private key headers
    if (/-----BEGIN[ A-Z0-9_-]*PRIVATE KEY-----/i.test(text)) return true;

    // Passwords
    if (/password\s*[:=]\s*\S{4,}/i.test(text)) return true;

    // SSN patterns
    if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) return true;

    // Credit Card numbers (Luhn candidate 16 digits)
    if (/\b(?:\d{4}[-\s]?){3}\d{4}\b/.test(text)) return true;

    return false;
  }

  public normalizeKey(key: string): string {
    return (key || "")
      .toLowerCase()
      .replace(/^(?:pref_|mem_|user_|dim_|pat_)/, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  public determineScope(key: string, category?: string): "GLOBAL" | "TOPIC" | "PROJECT" {
    const k = (key || "").toLowerCase();
    const c = (category || "").toLowerCase();

    if (
      k.includes("lang") ||
      k.includes("verbos") ||
      k.includes("tone") ||
      k.includes("format") ||
      k.includes("ui_mode") ||
      k.includes("theme") ||
      c.includes("communication") ||
      c.includes("style")
    ) {
      return "GLOBAL";
    }

    if (k.includes("proj") || c.includes("proj") || k.includes("dora") || c.includes("dora")) {
      return "PROJECT";
    }

    return "TOPIC";
  }

  public isCompatibleWithTopic(
    itemTopic: string | undefined,
    activeTopic: string | undefined,
    isGlobal: boolean
  ): boolean {
    if (isGlobal) return true;
    if (!activeTopic || !itemTopic) return true;

    const it = itemTopic.toLowerCase();
    const at = activeTopic.toLowerCase();

    if (it === at || it.includes(at) || at.includes(it)) return true;

    // Domain semantic affinities
    if ((it.includes("coding") || it.includes("tech") || it.includes("dev")) && (at.includes("code") || at.includes("script") || at.includes("programming") || at.includes("dev"))) {
      return true;
    }
    if ((it.includes("hardware") || it.includes("device") || it.includes("laptop")) && (at.includes("hardware") || at.includes("laptop") || at.includes("pc") || at.includes("computer"))) {
      return true;
    }

    return false;
  }
}

export const executiveContextEngine = ExecutiveContextEngine.getInstance();
