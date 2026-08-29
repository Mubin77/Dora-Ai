/**
 * Dora Adaptive Executive Control & Cognitive Prioritization Engine
 * Phase 3 — Step 9
 * 
 * Deterministic, non-LLM, bounded executive control engine that determines
 * what cognitive information deserves attention, suppresses irrelevant/stale/unsafe
 * outputs, tracks unresolved issues, sets response modes, and generates sanitized
 * behavioral directives.
 */

import {
  ExecutiveControlInput,
  ExecutiveControlAnalysis,
  ExecutiveControlEngineOptions,
  ExecutiveControlBudgetConfig,
  ExecutivePriorityClass,
  ExecutiveEscalationState,
  ExecutiveResponseMode,
  ExecutiveAttentionItem,
  ExecutiveAttentionType,
  ExecutiveAttentionReason,
  ExecutiveSuppressionReason,
  ExecutiveSuppressionRecord,
  ExecutiveEscalationRecord,
  ExecutiveUnresolvedIssue,
  ExecutiveUnresolvedIssueType,
  ExecutiveFocus,
  ExecutiveControlDiagnostics,
} from "./adaptiveExecutiveControlTypes";
import {
  EpistemicAuthority,
  EpistemicScope,
  EpistemicProvenance,
} from "./epistemicCalibrationTypes";

export class AdaptiveExecutiveControlEngine {
  // Hard Budget Ceilings (Enforced even if input budget is maliciously large)
  private readonly HARD_CEILINGS = {
    maxAttentionItems: 30,
    maxCriticalItems: 10,
    maxHighPriorityItems: 15,
    maxUnresolvedIssues: 12,
    maxEscalations: 8,
    maxDirectives: 12,
    maxFocusDimensions: 10,
  };

  // Default Conservative Budgets
  private readonly DEFAULT_BUDGET: Required<ExecutiveControlBudgetConfig> = {
    maxAttentionItems: 15,
    maxCriticalItems: 5,
    maxHighPriorityItems: 8,
    maxUnresolvedIssues: 6,
    maxEscalations: 4,
    maxDirectives: 6,
    maxFocusDimensions: 5,
  };

  // 10-Tier Epistemic Authority Hierarchy Weights (0.00 to 1.00)
  private readonly AUTHORITY_WEIGHTS: Record<EpistemicAuthority, number> = {
    CURRENT_TURN_EXPLICIT: 1.00,
    HARD_CONSTRAINT: 0.95,
    VERIFIED_EVIDENCE: 0.90,
    GOVERNANCE_APPROVED_MEMORY: 0.80,
    CONFIRMED_USER_MODEL: 0.75,
    ACTIVE_GOAL_PROJECT_COMMITMENT: 0.70,
    TEMPORAL_CONTEXT: 0.60,
    CONFIRMED_ADAPTIVE_PATTERN: 0.50,
    PREDICTIVE_CONTEXT: 0.30,
    SYSTEM_DEFAULT: 0.10,
  };

  /**
   * Main entry point for Adaptive Executive Control & Cognitive Prioritization
   */
  public evaluate(input: ExecutiveControlInput): ExecutiveControlAnalysis {
    const budget = this.resolveBudget(input.options?.budget);
    const currentTime = input.options?.currentTime ?? 0;
    const strictTopicIsolation = !!input.options?.strictTopicIsolation;
    const activeTopic = input.options?.activeTopic || input.context?.activeTopic || "";

    const suppressedItems: ExecutiveSuppressionRecord[] = [];
    const provenance: EpistemicProvenance[] = [];

    // 1. Gather all attention candidates from upstream cognitive engines
    const rawAttentionCandidates = this.gatherAttentionCandidates(
      input,
      currentTime,
      strictTopicIsolation,
      activeTopic,
      suppressedItems,
      provenance
    );

    // 2. Deduplicate attention items deterministically
    const deduplicatedCandidates = this.deduplicateCandidates(
      rawAttentionCandidates,
      suppressedItems
    );

    // 3. Score, rank, and classify attention items lexicographically
    const rankedAttentionItems = this.rankAndClassifyAttentionItems(
      deduplicatedCandidates,
      input,
      activeTopic
    );

    // 4. Enforce strict attention budgets & ceilings
    const { activeAttentionSet, budgetTruncationCount } = this.applyAttentionBudget(
      rankedAttentionItems,
      budget,
      suppressedItems
    );

    // 5. Identify, bound, and track unresolved cognitive issues
    const unresolvedIssues = this.extractUnresolvedIssues(
      input,
      activeAttentionSet,
      budget
    );

    // 6. Evaluate deterministic escalation rules
    const { escalations, escalationState } = this.evaluateEscalations(
      input,
      activeAttentionSet,
      unresolvedIssues,
      budget
    );

    // 7. Determine deterministic response mode
    const responseMode = this.determineResponseMode(
      escalationState,
      input,
      unresolvedIssues,
      activeAttentionSet
    );

    // 8. Formulate deterministic Executive Focus
    const focus = this.formulateExecutiveFocus(
      input,
      activeAttentionSet,
      unresolvedIssues,
      escalationState,
      responseMode,
      budget
    );

    // 9. Generate sanitized behavioral directives
    const { rawDirectives, sanitizedDirectives, sanitizationCount } = this.generateDirectives(
      focus,
      escalationState,
      responseMode,
      activeAttentionSet,
      budget
    );

    // 10. Compile diagnostic metrics
    const diagnostics = this.compileDiagnostics(
      rawAttentionCandidates.length,
      activeAttentionSet,
      suppressedItems.length,
      unresolvedIssues.length,
      escalations.length,
      budgetTruncationCount,
      sanitizationCount,
      escalationState,
      responseMode
    );

    return {
      escalationState,
      responseMode,
      focus,
      attentionSet: activeAttentionSet,
      suppressedItems,
      unresolvedIssues,
      escalations,
      directives: rawDirectives,
      sanitizedDirectives,
      diagnostics,
      provenance,
    };
  }

  /**
   * Resolves configuration budgets with hard ceilings
   */
  private resolveBudget(config?: ExecutiveControlBudgetConfig): Required<ExecutiveControlBudgetConfig> {
    return {
      maxAttentionItems: Math.min(
        this.HARD_CEILINGS.maxAttentionItems,
        config?.maxAttentionItems ?? this.DEFAULT_BUDGET.maxAttentionItems
      ),
      maxCriticalItems: Math.min(
        this.HARD_CEILINGS.maxCriticalItems,
        config?.maxCriticalItems ?? this.DEFAULT_BUDGET.maxCriticalItems
      ),
      maxHighPriorityItems: Math.min(
        this.HARD_CEILINGS.maxHighPriorityItems,
        config?.maxHighPriorityItems ?? this.DEFAULT_BUDGET.maxHighPriorityItems
      ),
      maxUnresolvedIssues: Math.min(
        this.HARD_CEILINGS.maxUnresolvedIssues,
        config?.maxUnresolvedIssues ?? this.DEFAULT_BUDGET.maxUnresolvedIssues
      ),
      maxEscalations: Math.min(
        this.HARD_CEILINGS.maxEscalations,
        config?.maxEscalations ?? this.DEFAULT_BUDGET.maxEscalations
      ),
      maxDirectives: Math.min(
        this.HARD_CEILINGS.maxDirectives,
        config?.maxDirectives ?? this.DEFAULT_BUDGET.maxDirectives
      ),
      maxFocusDimensions: Math.min(
        this.HARD_CEILINGS.maxFocusDimensions,
        config?.maxFocusDimensions ?? this.DEFAULT_BUDGET.maxFocusDimensions
      ),
    };
  }

  /**
   * Deterministic 32-bit FNV-1a Hash for strings
   */
  private hashString(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  /**
   * Helper to generate stable deterministic IDs
   */
  private generateDeterministicId(prefix: string, content: string): string {
    const hash = this.hashString(content).toString(16).padStart(8, "0");
    return `${prefix}_${hash}`;
  }

  /**
   * Checks if string contains sensitive credentials
   */
  private containsSensitiveData(text: string): boolean {
    if (!text) return false;
    const sensitivePatterns = [
      /AIzaSy[A-Za-z0-9_-]{20,}/i,
      /Bearer\s+[A-Za-z0-9_\-\.]+/i,
      /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/i,
      /\bsk-[A-Za-z0-9]{20,}\b/i,
      /(?:password|secret|token|api_key|auth_token)\s*[:=]\s*\S+/i,
    ];
    return sensitivePatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Comprehensive sanitization for user-facing and downstream directives
   */
  public sanitizeSentence(str: string): string {
    if (!str) return "";
    return str
      // Credentials & Tokens
      .replace(/AIzaSy[A-Za-z0-9_-]{20,}/gi, "[REDACTED_API_KEY]")
      .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, "[REDACTED_AUTH_TOKEN]")
      .replace(/\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/gi, "[REDACTED_TOKEN]")
      .replace(/\bsk-[A-Za-z0-9]{20,}\b/gi, "[REDACTED_SECRET]")
      .replace(/(?:password|secret|token|api_key|auth_token)\s*[:=]\s*\S+/gi, "[REDACTED_CREDENTIAL]")
      // UUIDs
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
      // Internal IDs (att_, cand_, risk_, step_, plan_, issue_, esc_)
      .replace(/\b(?:att|cand|risk|step|plan|issue|esc|fact|claim|hyp)_[a-zA-Z0-9_-]+\b/g, "")
      // Engine Names
      .replace(/\b(?:DeliberativeDecisionEngine|MetaReasoningEngine|EpistemicCalibrationEngine|ScenarioSimulationEngine|MultiHopReasoningEngine|CausalReasoningEngine|ContradictionResolutionEngine|DeepReasoningEngine|AdaptiveExecutiveControlEngine)\b/g, "cognitive system")
      // Raw Floats (e.g. confidence=0.8124, score: 0.954)
      .replace(/\b(?:score|confidence|weight|prob|probability|priority)\s*[:=]\s*0\.\d{3,}\b/gi, "")
      .replace(/\b0\.\d{4,}\b/g, "")
      // Epoch Timestamps (> 1_000_000_000_000)
      .replace(/\b1[6-8]\d{11}\b/g, "[timestamp]")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Gathers all candidate attention items from upstream cognitive packages
   */
  private gatherAttentionCandidates(
    input: ExecutiveControlInput,
    currentTime: number,
    strictTopicIsolation: boolean,
    activeTopic: string,
    suppressedItems: ExecutiveSuppressionRecord[],
    provenance: EpistemicProvenance[]
  ): ExecutiveAttentionItem[] {
    const candidates: ExecutiveAttentionItem[] = [];

    // Helper to safely add candidate with filtering
    const addCandidate = (item: {
      type: ExecutiveAttentionType;
      reason: ExecutiveAttentionReason;
      sourceEngine: string;
      authority: EpistemicAuthority;
      scope: EpistemicScope;
      rawContent: string;
      recommendedHandling: string;
      topic?: string;
      isBlocking?: boolean;
      sourceProvenance?: string[];
      isStale?: boolean;
      isQuarantined?: boolean;
      isRejected?: boolean;
    }) => {
      const id = this.generateDeterministicId("att", `${item.type}:${item.sourceEngine}:${item.rawContent}`);
      const authorityWeight = this.AUTHORITY_WEIGHTS[item.authority] ?? 0.20;

      // 1. Check Sensitive Data
      if (this.containsSensitiveData(item.rawContent)) {
        suppressedItems.push({
          itemId: id,
          sourceEngine: item.sourceEngine,
          reason: "SENSITIVE_CREDENTIAL",
          description: "Suppressed attention item containing sensitive credential material",
        });
        return;
      }

      // 2. Check Quarantined / Rejected / Stale
      if (item.isQuarantined) {
        suppressedItems.push({
          itemId: id,
          sourceEngine: item.sourceEngine,
          reason: "QUARANTINED_EVIDENCE",
          description: "Suppressed attention item sourced from quarantined context",
        });
        return;
      }
      if (item.isRejected) {
        suppressedItems.push({
          itemId: id,
          sourceEngine: item.sourceEngine,
          reason: "REJECTED_EVIDENCE",
          description: "Suppressed attention item sourced from rejected evidence",
        });
        return;
      }
      if (item.isStale) {
        suppressedItems.push({
          itemId: id,
          sourceEngine: item.sourceEngine,
          reason: "STALE_SUPERSEDED",
          description: "Suppressed attention item that is superseded or stale",
        });
        return;
      }

      // 3. Check Strict Topic Isolation
      if (strictTopicIsolation && item.topic && activeTopic && item.topic !== activeTopic && item.scope !== "GLOBAL" && item.scope !== "CURRENT_TURN") {
        suppressedItems.push({
          itemId: id,
          sourceEngine: item.sourceEngine,
          reason: "FOREIGN_TOPIC",
          description: `Suppressed out-of-topic attention item with topic '${item.topic}' while active topic is '${activeTopic}'`,
        });
        return;
      }

      const sortKey = `${item.type}_${id}`;

      candidates.push({
        id,
        type: item.type,
        priorityClass: "PRIORITY_NORMAL", // Will be classified later
        priorityScore: 0.5, // Will be computed later
        scope: item.scope,
        authority: item.authority,
        authorityWeight,
        reason: item.reason,
        sourceEngine: item.sourceEngine,
        sourceProvenance: item.sourceProvenance || [item.sourceEngine],
        recommendedHandling: item.recommendedHandling,
        topic: item.topic,
        rawContent: item.rawContent,
        isBlocking: !!item.isBlocking,
        isSuppressed: false,
        sortKey,
      });

      provenance.push({
        sourceId: item.sourceEngine,
        sourceType: "EXECUTIVE_FACT",
        authority: item.authority,
        confidence: authorityWeight,
        statement: this.sanitizeSentence(item.rawContent),
        scope: item.scope,
        topic: item.topic || "general",
      });
    };

    // A. Current-Turn User Message & Intent
    if (input.message && input.message.trim().length > 0) {
      addCandidate({
        type: "USER_REQUEST",
        reason: "EXPLICIT_USER_DIRECTIVE",
        sourceEngine: "UserInput",
        authority: "CURRENT_TURN_EXPLICIT",
        scope: "CURRENT_TURN",
        rawContent: input.message.trim(),
        recommendedHandling: "Fulfill explicit current-turn user request directly and safely",
      });
    }

    if (input.intent?.primaryIntent) {
      addCandidate({
        type: "USER_REQUEST",
        reason: "EXPLICIT_USER_DIRECTIVE",
        sourceEngine: "IntentEngine",
        authority: "CURRENT_TURN_EXPLICIT",
        scope: "CURRENT_TURN",
        rawContent: `User intent: ${input.intent.primaryIntent}`,
        recommendedHandling: "Align downstream behavior with recognized user intent",
      });
    }

    // B. Hard Constraints (Executive Context & Constraints)
    const constraints = input.executiveContext?.reasoningConstraints || [];
    for (const c of constraints) {
      const isHard = c.type === "HARD_CONSTRAINT" || c.type === "SAFETY" || c.enforceStrictly;
      addCandidate({
        type: "HARD_CONSTRAINT",
        reason: "HARD_SAFETY_CONSTRAINT",
        sourceEngine: "ExecutiveContextEngine",
        authority: isHard ? "HARD_CONSTRAINT" : "GOVERNANCE_APPROVED_MEMORY",
        scope: "GLOBAL",
        rawContent: c.description || c.sanitizedDirective,
        recommendedHandling: isHard ? "Enforce strictly; cannot be overridden by score or benefits" : "Respect governance constraint",
        isBlocking: isHard,
      });
    }

    // C. Step 8: Deliberative Decision Engine Output
    if (input.decision) {
      const d = input.decision;
      if (d.decisionState === "BLOCKED" || d.recommendation?.type === "NO_SAFE_OPTION" || d.recommendation?.type === "BLOCK_OPTION") {
        addCandidate({
          type: "DECISION_BLOCKER",
          reason: "DECISION_BLOCKED",
          sourceEngine: "DeliberativeDecisionEngine",
          authority: "HARD_CONSTRAINT",
          scope: "CURRENT_TURN",
          rawContent: d.recommendation?.rationale || "All candidate options violate mandatory constraints",
          recommendedHandling: "Halt planned execution and report safety constraint violation to user",
          isBlocking: true,
        });
      } else if (d.decisionState === "INSUFFICIENT_INFORMATION" || d.recommendation?.type === "REQUEST_INFORMATION") {
        addCandidate({
          type: "REQUIRED_CLARIFICATION",
          reason: "INFORMATION_DEFICIT",
          sourceEngine: "DeliberativeDecisionEngine",
          authority: "VERIFIED_EVIDENCE",
          scope: "CURRENT_TURN",
          rawContent: d.unresolvedQuestions?.[0] || d.recommendation?.informationRequests?.[0] || "Critical decision evidence is missing",
          recommendedHandling: "Seek targeted clarification before selecting an irreversible option",
          isBlocking: false,
        });
      } else if (d.decisionState === "CONDITIONAL" || d.recommendation?.type === "RECOMMEND_CONDITIONAL_OPTION") {
        addCandidate({
          type: "ADVISORY_PLAN",
          reason: "DECISION_PREREQUISITE_PENDING",
          sourceEngine: "DeliberativeDecisionEngine",
          authority: "VERIFIED_EVIDENCE",
          scope: "CURRENT_TURN",
          rawContent: `Conditional recommendation: ${d.selectedOption?.title || "Option"} subject to verification of prerequisites`,
          recommendedHandling: "Provide conditional guidance while noting dependent assumptions",
        });
      } else if (d.actionPlan) {
        addCandidate({
          type: "ADVISORY_PLAN",
          reason: "EXPLICIT_USER_DIRECTIVE",
          sourceEngine: "DeliberativeDecisionEngine",
          authority: "VERIFIED_EVIDENCE",
          scope: "CURRENT_TURN",
          rawContent: `Action plan: ${d.actionPlan.objective} (${d.actionPlan.orderedSteps.length} sequential advisory steps)`,
          recommendedHandling: "Present clear ordered action plan with safety checkpoints",
        });

        // Check if plan has unfulfilled prerequisites
        for (const step of d.actionPlan.orderedSteps) {
          if (step.prerequisites && step.prerequisites.length > 0) {
            addCandidate({
              type: "ACTION_PREREQUISITE",
              reason: "DECISION_PREREQUISITE_PENDING",
              sourceEngine: "DeliberativeDecisionEngine",
              authority: "VERIFIED_EVIDENCE",
              scope: "CURRENT_TURN",
              rawContent: `Prerequisite for '${step.description || step.action}': ${step.prerequisites.join(", ")}`,
              recommendedHandling: "Ensure prerequisites are confirmed before advising irreversible progression",
            });
          }
        }
      }

      // Add decision risks
      for (const risk of d.risks || []) {
        if (risk.isBlocking || risk.severity === "CRITICAL" || risk.severity === "MAJOR") {
          addCandidate({
            type: "DECISION_BLOCKER",
            reason: "DECISION_BLOCKED",
            sourceEngine: "DeliberativeDecisionEngine",
            authority: "VERIFIED_EVIDENCE",
            scope: "CURRENT_TURN",
            rawContent: `Decision risk: ${risk.description}`,
            recommendedHandling: "Address or mitigate decision risk prior to execution",
            isBlocking: risk.isBlocking,
          });
        }
      }
    }

    // D. Step 7: Meta-Reasoning Engine Output
    if (input.metaReasoning) {
      const mr = input.metaReasoning;
      for (const issue of mr.issues || []) {
        const isCrit = issue.severity === "CRITICAL" || issue.type === "SIMULATION_REALITY_CONFUSION" || issue.type === "HARD_CONSTRAINT_VIOLATION";
        addCandidate({
          type: "META_REASONING_WARNING",
          reason: "META_REASONING_FLAG",
          sourceEngine: "MetaReasoningEngine",
          authority: isCrit ? "HARD_CONSTRAINT" : "VERIFIED_EVIDENCE",
          scope: "CURRENT_TURN",
          rawContent: issue.description,
          recommendedHandling: isCrit ? "Critically block invalid inference and rectify reality/safety boundaries" : "Note meta-reasoning caveat",
          isBlocking: isCrit,
        });
      }
    }

    // E. Step 2: Contradiction Resolution Output
    if (input.contradictionResolution) {
      const cr = input.contradictionResolution;
      for (const c of cr.contradictions || []) {
        if (c.classification === "UNRESOLVED_CONFLICT" || c.severity === "CRITICAL" || c.severity === "HIGH") {
          addCandidate({
            type: "UNRESOLVED_CONTRADICTION",
            reason: "UNRESOLVED_CRITICAL_CONTRADICTION",
            sourceEngine: "ContradictionResolutionEngine",
            authority: "VERIFIED_EVIDENCE",
            scope: "GLOBAL",
            rawContent: `Contradiction: ${c.evidenceA?.statement || c.subject} vs ${c.evidenceB?.statement || c.description}`,
            recommendedHandling: "Acknowledge unresolved contradiction explicitly; do not assert contradictory claims as fact",
            isBlocking: c.severity === "CRITICAL",
          });
        }
      }
    }

    // F. Step 5: Epistemic Calibration Output
    if (input.epistemicCalibration) {
      const ec = input.epistemicCalibration;
      if (ec.contestedClaims && ec.contestedClaims.length > 0) {
        addCandidate({
          type: "EPISTEMIC_UNCERTAINTY",
          reason: "EPISTEMIC_OVERCLAIM_DETECTED",
          sourceEngine: "EpistemicCalibrationEngine",
          authority: "VERIFIED_EVIDENCE",
          scope: "CURRENT_TURN",
          rawContent: `Epistemic contested claims (${ec.contestedClaims.length}); confidence warrants calibration`,
          recommendedHandling: "Qualify statements with appropriate epistemic hedge",
        });
      }
    }

    // G. Step 3: Causal Reasoning Output
    if (input.causalReasoning) {
      const cr = input.causalReasoning;
      const ambiguousRelations = cr.relations?.filter(r => r.relationType === "CONFOUNDED" || r.relationType === "CORRELATION_ONLY" || r.relationType === "UNRESOLVED") || [];
      for (const ca of ambiguousRelations) {
        addCandidate({
          type: "CAUSAL_RISK",
          reason: "CAUSAL_UNCERTAINTY_HIGH",
          sourceEngine: "CausalReasoningEngine",
          authority: "VERIFIED_EVIDENCE",
          scope: "CURRENT_TURN",
          rawContent: `Causal ambiguity: ${ca.causeStatement} -> ${ca.effectStatement} (${ca.relationType})`,
          recommendedHandling: "Avoid confusing correlation with causation",
        });
      }
    }

    // H. Step 6: Scenario Simulation Output
    if (input.scenarioSimulation) {
      const ss = input.scenarioSimulation;
      const simRisks = ss.outcomes?.filter(o => o.outcomeType === "NEGATIVE" || o.outcomeType === "BLOCKED") || [];
      for (const simRisk of simRisks) {
        addCandidate({
          type: "SCENARIO_WARNING",
          reason: "SCENARIO_RISK_WARNING",
          sourceEngine: "ScenarioSimulationEngine",
          authority: "PREDICTIVE_CONTEXT",
          scope: "CURRENT_TURN",
          rawContent: `Simulation advisory risk: ${simRisk.outcomeKey} - ${simRisk.description}`,
          recommendedHandling: "Treat scenario as advisory exploration without asserting simulated outcomes as verified fact",
        });
      }
    }

    // I. Goals and Commitments (GoalProject & UserModel)
    if (input.goalProject?.activeGoals) {
      for (const g of input.goalProject.activeGoals) {
        addCandidate({
          type: "ACTIVE_GOAL",
          reason: "GOAL_ALIGNMENT_REQUIRED",
          sourceEngine: "GoalProjectEngine",
          authority: "ACTIVE_GOAL_PROJECT_COMMITMENT",
          scope: "GOAL",
          rawContent: `Active Goal: ${g.title}`,
          recommendedHandling: "Prioritize actions supporting active user goal",
          topic: g.scope,
        });
      }
    }

    const activeCommitments = input.goalProject?.activeCommitments || input.executiveContext?.activeCommitments || [];
    for (const cm of activeCommitments) {
      if ((cm as any).status === "ACTIVE" || (cm as any).status === "PENDING") {
        addCandidate({
          type: "ACTIVE_COMMITMENT",
          reason: "COMMITMENT_CONTINUITY",
          sourceEngine: "GoalProjectEngine",
          authority: "ACTIVE_GOAL_PROJECT_COMMITMENT",
          scope: "COMMITMENT",
          rawContent: `Active Commitment: ${(cm as any).title || (cm as any).description}`,
          recommendedHandling: "Ensure continuity with prior commitments made to the user",
        });
      }
    }

    // J. Missing Information / Verification Clarifications
    if (input.reasoning?.missingInformation && input.reasoning.missingInformation.length > 0) {
      for (const miss of input.reasoning.missingInformation) {
        addCandidate({
          type: "REQUIRED_CLARIFICATION",
          reason: "INFORMATION_DEFICIT",
          sourceEngine: "ReasoningEngine",
          authority: "VERIFIED_EVIDENCE",
          scope: "CURRENT_TURN",
          rawContent: `Missing information: ${miss}`,
          recommendedHandling: "Request clarification from the user",
        });
      }
    }

    if (input.verification?.requiresClarification && input.verification.clarificationReason) {
      addCandidate({
        type: "REQUIRED_CLARIFICATION",
        reason: "INFORMATION_DEFICIT",
        sourceEngine: "VerificationEngine",
        authority: "VERIFIED_EVIDENCE",
        scope: "CURRENT_TURN",
        rawContent: input.verification.clarificationReason,
        recommendedHandling: "Ask clarifying questions before proceeding",
      });
    }

    // K. Temporal State
    if (input.temporalMemory?.activePatterns && input.temporalMemory.activePatterns.length > 0) {
      const topPattern = input.temporalMemory.activePatterns[0];
      addCandidate({
        type: "TEMPORAL_STATE",
        reason: "TEMPORAL_FRESHNESS",
        sourceEngine: "TemporalMemoryEngine",
        authority: "TEMPORAL_CONTEXT",
        scope: "CURRENT_TURN",
        rawContent: `Recent pattern: ${topPattern.attributeKey} = ${topPattern.currentValue}`,
        recommendedHandling: "Maintain temporal context continuity",
        isStale: topPattern.temporalStatus === "STALE" || topPattern.temporalStatus === "SUPERSEDED",
      });
    }

    // L. Predictive Context (Advisory bounded)
    if (input.predictiveContext?.acceptedCandidates && input.predictiveContext.acceptedCandidates.length > 0) {
      for (const pred of input.predictiveContext.acceptedCandidates) {
        // Only include if relevant to current turn
        const isRel = !activeTopic || !pred.topic || pred.topic === activeTopic;
        if (isRel) {
          addCandidate({
            type: "GENERAL_COGNITIVE",
            reason: "EXPLICIT_USER_DIRECTIVE",
            sourceEngine: "PredictiveContextEngine",
            authority: "PREDICTIVE_CONTEXT",
            scope: "CURRENT_TURN",
            rawContent: `Predictive cue: ${pred.contextSummary || pred.directive || pred.predictionType}`,
            recommendedHandling: "Consider advisory prediction without elevating to factual authority",
            topic: pred.topic,
          });
        } else {
          suppressedItems.push({
            itemId: this.generateDeterministicId("att", `PredictiveContext:${pred.id}`),
            sourceEngine: "PredictiveContextEngine",
            reason: "PREDICTIVE_IRRELEVANT",
            description: "Suppressed predictive cue irrelevant to active topic",
          });
        }
      }
    }

    return candidates;
  }

  /**
   * Deterministically deduplicates attention candidates based on semantic content
   */
  private deduplicateCandidates(
    candidates: ExecutiveAttentionItem[],
    suppressedItems: ExecutiveSuppressionRecord[]
  ): ExecutiveAttentionItem[] {
    const seenKeys = new Set<string>();
    const deduplicated: ExecutiveAttentionItem[] = [];

    for (const c of candidates) {
      const normalizedContent = c.rawContent.toLowerCase().replace(/[^a-z0-9]/g, "");
      const semanticKey = `${c.type}:${c.scope}:${normalizedContent}`;

      if (seenKeys.has(semanticKey)) {
        suppressedItems.push({
          itemId: c.id,
          sourceEngine: c.sourceEngine,
          reason: "DUPLICATE_ITEM",
          description: `Suppressed duplicate attention item of type ${c.type}`,
        });
      } else {
        seenKeys.add(semanticKey);
        deduplicated.push(c);
      }
    }

    return deduplicated;
  }

  /**
   * Deterministic Lexicographical Ranking & Priority Classification
   */
  private rankAndClassifyAttentionItems(
    items: ExecutiveAttentionItem[],
    input: ExecutiveControlInput,
    activeTopic: string
  ): ExecutiveAttentionItem[] {
    const ranked = items.map((item) => {
      // 1. Lexicographical Dimension Evaluation
      const hardSafetyStatus = (item.type === "HARD_CONSTRAINT" && item.isBlocking) ||
        (item.type === "DECISION_BLOCKER" && item.isBlocking) ||
        (item.type === "META_REASONING_WARNING" && item.isBlocking)
        ? 1.0 : 0.0;

      const currentTurnRelevance = (item.scope === "CURRENT_TURN" || item.type === "USER_REQUEST") ? 1.0 :
        (item.topic && activeTopic && item.topic === activeTopic) ? 0.7 : 0.4;

      const explicitIntentMatch = (item.type === "USER_REQUEST") ? 1.0 : 0.0;
      const authorityWeight = item.authorityWeight;
      const unresolvedDecisionImpact = (item.type === "DECISION_BLOCKER" || item.type === "ACTION_PREREQUISITE") ? 1.0 :
        (item.type === "ADVISORY_PLAN") ? 0.7 : 0.0;

      const goalAlignment = (item.type === "ACTIVE_GOAL" || item.type === "ACTIVE_COMMITMENT") ? 1.0 : 0.0;
      const contradictionSeverity = (item.type === "UNRESOLVED_CONTRADICTION") ? (item.isBlocking ? 1.0 : 0.8) : 0.0;
      const epistemicRisk = (item.type === "EPISTEMIC_UNCERTAINTY" || item.type === "CAUSAL_RISK" || item.type === "SCENARIO_WARNING") ? 0.8 : 0.0;
      const temporalFreshness = (item.scope === "CURRENT_TURN") ? 1.0 : (item.type === "TEMPORAL_STATE") ? 0.8 : 0.5;
      const actionability = (item.type === "USER_REQUEST" || item.type === "ADVISORY_PLAN" || item.type === "REQUIRED_CLARIFICATION") ? 1.0 : 0.5;
      const continuity = (item.type === "ACTIVE_COMMITMENT" || item.type === "TEMPORAL_STATE") ? 0.8 : 0.4;

      // Composite Priority Score (0.00 to 1.00)
      let priorityScore = (
        hardSafetyStatus * 0.30 +
        currentTurnRelevance * 0.20 +
        authorityWeight * 0.15 +
        unresolvedDecisionImpact * 0.10 +
        contradictionSeverity * 0.10 +
        explicitIntentMatch * 0.05 +
        goalAlignment * 0.04 +
        epistemicRisk * 0.03 +
        actionability * 0.02 +
        temporalFreshness * 0.01
      );
      priorityScore = Math.min(1.0, Math.max(0.0, Math.round(priorityScore * 100) / 100));

      // Priority Class Assignment
      let priorityClass: ExecutivePriorityClass = "PRIORITY_NORMAL";
      if (hardSafetyStatus > 0 || (contradictionSeverity === 1.0) || (item.isBlocking)) {
        priorityClass = "PRIORITY_CRITICAL";
      } else if (currentTurnRelevance >= 0.9 || item.type === "USER_REQUEST" || item.type === "REQUIRED_CLARIFICATION" || item.type === "ACTION_PREREQUISITE" || goalAlignment === 1.0) {
        priorityClass = "PRIORITY_HIGH";
      } else if (priorityScore < 0.35 || item.authority === "PREDICTIVE_CONTEXT" || item.authority === "SYSTEM_DEFAULT") {
        priorityClass = "PRIORITY_LOW";
      }

      return {
        ...item,
        priorityClass,
        priorityScore,
      };
    });

    // Stable Deterministic Sort
    ranked.sort((a, b) => {
      // 1. Critical class priority
      const classRank = (cls: ExecutivePriorityClass): number => {
        switch (cls) {
          case "PRIORITY_CRITICAL": return 4;
          case "PRIORITY_HIGH": return 3;
          case "PRIORITY_NORMAL": return 2;
          case "PRIORITY_LOW": return 1;
          case "SUPPRESSED": return 0;
        }
      };
      const diffClass = classRank(b.priorityClass) - classRank(a.priorityClass);
      if (diffClass !== 0) return diffClass;

      // 2. Priority score
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }

      // 3. Authority weight
      if (b.authorityWeight !== a.authorityWeight) {
        return b.authorityWeight - a.authorityWeight;
      }

      // 4. Stable Lexical Sort Key tie-breaker
      return a.sortKey.localeCompare(b.sortKey);
    });

    return ranked;
  }

  /**
   * Applies configured budgets and hard ceilings to attention items
   */
  private applyAttentionBudget(
    rankedItems: ExecutiveAttentionItem[],
    budget: Required<ExecutiveControlBudgetConfig>,
    suppressedItems: ExecutiveSuppressionRecord[]
  ): { activeAttentionSet: ExecutiveAttentionItem[]; budgetTruncationCount: number } {
    const activeAttentionSet: ExecutiveAttentionItem[] = [];
    let criticalCount = 0;
    let highCount = 0;
    let budgetTruncationCount = 0;

    for (const item of rankedItems) {
      let allow = false;

      if (item.priorityClass === "PRIORITY_CRITICAL") {
        // Critical safety items are NEVER silently discarded, but capped by hard ceiling
        if (criticalCount < budget.maxCriticalItems) {
          allow = true;
          criticalCount++;
        }
      } else if (item.priorityClass === "PRIORITY_HIGH") {
        if (highCount < budget.maxHighPriorityItems && activeAttentionSet.length < budget.maxAttentionItems) {
          allow = true;
          highCount++;
        }
      } else {
        if (activeAttentionSet.length < budget.maxAttentionItems) {
          allow = true;
        }
      }

      if (allow) {
        activeAttentionSet.push(item);
      } else {
        budgetTruncationCount++;
        suppressedItems.push({
          itemId: item.id,
          sourceEngine: item.sourceEngine,
          reason: "BUDGET_TRUNCATION",
          description: `Suppressed attention item due to budget ceiling (${item.priorityClass})`,
        });
      }
    }

    return { activeAttentionSet, budgetTruncationCount };
  }

  /**
   * Extracts and bounds unresolved issues without mutating memory or goal states
   */
  private extractUnresolvedIssues(
    input: ExecutiveControlInput,
    attentionSet: ExecutiveAttentionItem[],
    budget: Required<ExecutiveControlBudgetConfig>
  ): ExecutiveUnresolvedIssue[] {
    const issues: ExecutiveUnresolvedIssue[] = [];

    // Helper to add unique issue
    const addIssue = (issue: {
      issueType: ExecutiveUnresolvedIssueType;
      scope: EpistemicScope;
      severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      sourceProvenance: string[];
      isBlocking: boolean;
      resolutionRequirement: string;
      description: string;
    }) => {
      if (issues.length >= budget.maxUnresolvedIssues) return;
      const id = this.generateDeterministicId("issue", `${issue.issueType}:${issue.description}`);
      const priorityMap: Record<string, number> = {
        CRITICAL: 1.0,
        HIGH: 0.8,
        MEDIUM: 0.5,
        LOW: 0.2,
      };

      issues.push({
        id,
        issueType: issue.issueType,
        scope: issue.scope,
        severity: issue.severity,
        sourceProvenance: issue.sourceProvenance,
        isBlocking: issue.isBlocking,
        resolutionRequirement: issue.resolutionRequirement,
        deterministicPriority: priorityMap[issue.severity] || 0.5,
        description: this.sanitizeSentence(issue.description),
      });
    };

    // 1. Missing information / clarification requirements
    if (input.decision?.decisionState === "INSUFFICIENT_INFORMATION") {
      addIssue({
        issueType: "MISSING_INFORMATION",
        scope: "CURRENT_TURN",
        severity: "HIGH",
        sourceProvenance: ["DeliberativeDecisionEngine"],
        isBlocking: false,
        resolutionRequirement: "Obtain missing evidence or user preference before selecting option",
        description: input.decision.unresolvedQuestions?.[0] || "Critical decision evidence is missing",
      });
    }

    // 2. Blocked decisions & Constraint conflicts
    if (input.decision?.decisionState === "BLOCKED" || input.decision?.recommendation?.type === "NO_SAFE_OPTION") {
      addIssue({
        issueType: "CONSTRAINT_CONFLICT",
        scope: "CURRENT_TURN",
        severity: "CRITICAL",
        sourceProvenance: ["DeliberativeDecisionEngine"],
        isBlocking: true,
        resolutionRequirement: "Reconcile constraint conflict or reject unexecutable action",
        description: input.decision.recommendation?.rationale || "All options violate active constraints",
      });
    }

    // 3. Action plan missing prerequisites
    if (input.decision?.actionPlan) {
      for (const step of input.decision.actionPlan.orderedSteps) {
        if (step.prerequisites && step.prerequisites.length > 0) {
          addIssue({
            issueType: "PREREQUISITE_MISSING",
            scope: "CURRENT_TURN",
            severity: "MEDIUM",
            sourceProvenance: ["DeliberativeDecisionEngine"],
            isBlocking: false,
            resolutionRequirement: `Satisfy prerequisite prior to executing ${step.description || step.action}`,
            description: `Missing prerequisite: ${step.prerequisites.join(", ")}`,
          });
        }
      }
    }

    // 4. Unresolved contradictions
    if (input.contradictionResolution?.contradictions) {
      for (const c of input.contradictionResolution.contradictions) {
        if (c.classification === "UNRESOLVED_CONFLICT" || c.severity === "CRITICAL" || c.severity === "HIGH") {
          addIssue({
            issueType: "CONTRADICTION",
            scope: "GLOBAL",
            severity: c.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
            sourceProvenance: ["ContradictionResolutionEngine"],
            isBlocking: c.severity === "CRITICAL",
            resolutionRequirement: "Clarify contradictory facts or update memory governance",
            description: `Direct contradiction between '${c.evidenceA?.statement || c.subject}' and '${c.evidenceB?.statement || c.description}'`,
          });
        }
      }
    }

    // 5. Unresolved tradeoffs
    if (input.decision?.tradeoffs && input.decision.tradeoffs.length > 0) {
      for (const t of input.decision.tradeoffs) {
        addIssue({
          issueType: "TRADEOFF_UNRESOLVED",
          scope: "CURRENT_TURN",
          severity: "MEDIUM",
          sourceProvenance: ["DeliberativeDecisionEngine"],
          isBlocking: false,
          resolutionRequirement: "Highlight competing dimensions to user",
          description: `Tradeoff: ${t.dimensionA} vs ${t.dimensionB}`,
        });
      }
    }

    // 6. Meta-reasoning critical issues
    if (input.metaReasoning?.issues) {
      for (const issue of input.metaReasoning.issues) {
        if (issue.severity === "CRITICAL") {
          addIssue({
            issueType: issue.type === "SIMULATION_REALITY_CONFUSION" ? "SIMULATION_RISK" : "CONSTRAINT_CONFLICT",
            scope: "CURRENT_TURN",
            severity: "CRITICAL",
            sourceProvenance: ["MetaReasoningEngine"],
            isBlocking: true,
            resolutionRequirement: "Correct invalid epistemic inference",
            description: issue.description,
          });
        }
      }
    }

    // Sort issues by priority & severity
    issues.sort((a, b) => b.deterministicPriority - a.deterministicPriority || a.id.localeCompare(b.id));

    return issues.slice(0, budget.maxUnresolvedIssues);
  }

  /**
   * Deterministically evaluates escalation state
   */
  private evaluateEscalations(
    input: ExecutiveControlInput,
    attentionSet: ExecutiveAttentionItem[],
    unresolvedIssues: ExecutiveUnresolvedIssue[],
    budget: Required<ExecutiveControlBudgetConfig>
  ): { escalations: ExecutiveEscalationRecord[]; escalationState: ExecutiveEscalationState } {
    const escalations: ExecutiveEscalationRecord[] = [];
    let escalationState: ExecutiveEscalationState = "NONE";

    // 1. Safety Blocked & No Safe Path
    const hasSafetyBlock = attentionSet.some(
      (a) => a.priorityClass === "PRIORITY_CRITICAL" && a.type === "HARD_CONSTRAINT" && a.isBlocking
    ) || input.metaReasoning?.issues?.some((i) => i.type === "HARD_CONSTRAINT_VIOLATION");

    const hasNoSafePath = input.decision?.decisionState === "BLOCKED" ||
      input.decision?.recommendation?.type === "NO_SAFE_OPTION" ||
      input.decision?.decisionState === "REJECTED";

    if (hasSafetyBlock) {
      escalationState = "SAFETY_BLOCKED";
      escalations.push({
        id: this.generateDeterministicId("esc", "SAFETY_BLOCKED"),
        state: "SAFETY_BLOCKED",
        trigger: "Hard safety constraint violation detected",
        severity: "CRITICAL",
        requiredAction: "Refuse unsafe action and uphold safety invariant",
        isBlocking: true,
      });
    } else if (hasNoSafePath) {
      escalationState = "NO_SAFE_PATH";
      escalations.push({
        id: this.generateDeterministicId("esc", "NO_SAFE_PATH"),
        state: "NO_SAFE_PATH",
        trigger: "No viable candidate satisfies all constraints",
        severity: "HIGH",
        requiredAction: "Inform user that no safe path is available under current constraints",
        isBlocking: true,
      });
    } else {
      // 2. Clarification Required
      const hasClarification = attentionSet.some((a) => a.type === "REQUIRED_CLARIFICATION") ||
        input.decision?.decisionState === "INSUFFICIENT_INFORMATION" ||
        input.intent?.requiresClarification ||
        input.verification?.requiresClarification;

      if (hasClarification) {
        escalationState = "CLARIFICATION_REQUIRED";
        escalations.push({
          id: this.generateDeterministicId("esc", "CLARIFICATION_REQUIRED"),
          state: "CLARIFICATION_REQUIRED",
          trigger: "Information deficit prevents confident progression",
          severity: "MEDIUM",
          requiredAction: "Request targeted clarification before executing action",
          isBlocking: false,
        });
      } else {
        // 3. Decision Deferred / Conditional
        const hasDeferred = input.decision?.decisionState === "CONDITIONAL" ||
          input.decision?.recommendation?.type === "DEFER_DECISION";

        if (hasDeferred) {
          escalationState = "DECISION_DEFERRED";
          escalations.push({
            id: this.generateDeterministicId("esc", "DECISION_DEFERRED"),
            state: "DECISION_DEFERRED",
            trigger: "Decision relies on sensitive unverified assumptions",
            severity: "MEDIUM",
            requiredAction: "Provide conditional guidance while withholding commitment",
            isBlocking: false,
          });
        } else {
          // 4. Warning Required
          const hasCriticalWarning = unresolvedIssues.some((i) => i.severity === "CRITICAL" || i.severity === "HIGH") ||
            input.metaReasoning?.verdict === "NEEDS_REVISION" ||
            input.metaReasoning?.verdict === "REJECTED" ||
            input.metaReasoning?.issues?.some((i) => i.severity === "CRITICAL" || i.type === "SIMULATION_REALITY_CONFUSION");

          if (hasCriticalWarning) {
            escalationState = "WARNING_REQUIRED";
            escalations.push({
              id: this.generateDeterministicId("esc", "WARNING_REQUIRED"),
              state: "WARNING_REQUIRED",
              trigger: "Cognitive warning or unresolved contradiction active",
              severity: "MEDIUM",
              requiredAction: "Surface warning caveats in response",
              isBlocking: false,
            });
          }
        }
      }
    }

    return {
      escalations: escalations.slice(0, budget.maxEscalations),
      escalationState,
    };
  }

  /**
   * Deterministically determines downstream response mode
   */
  private determineResponseMode(
    escalationState: ExecutiveEscalationState,
    input: ExecutiveControlInput,
    unresolvedIssues: ExecutiveUnresolvedIssue[],
    attentionSet: ExecutiveAttentionItem[]
  ): ExecutiveResponseMode {
    if (escalationState === "SAFETY_BLOCKED" || escalationState === "NO_SAFE_PATH") {
      return "REFUSE_ACTION";
    }

    if (escalationState === "CLARIFICATION_REQUIRED") {
      return "CLARIFY";
    }

    if (escalationState === "DECISION_DEFERRED") {
      return "DEFER";
    }

    if (escalationState === "WARNING_REQUIRED") {
      return "WARN";
    }

    // Check if valid advisory plan exists from Step 8
    if (input.decision?.actionPlan && input.decision.decisionState === "READY") {
      return "PLAN";
    }

    if (input.decision?.decisionState === "CONDITIONAL") {
      return "CONDITIONAL_ANSWER";
    }

    // If user message is purely conversational/greeting or informational statement without question
    const trimmed = (input.message || "").trim().toLowerCase();
    if (
      (trimmed === "ok" || trimmed === "got it" || trimmed === "noted" || trimmed === "i understand" || trimmed === "sure") &&
      !input.intent?.requiresClarification
    ) {
      return "ACKNOWLEDGE";
    }

    return "ANSWER";
  }

  /**
   * Formulates deterministic Executive Focus
   */
  private formulateExecutiveFocus(
    input: ExecutiveControlInput,
    attentionSet: ExecutiveAttentionItem[],
    unresolvedIssues: ExecutiveUnresolvedIssue[],
    escalationState: ExecutiveEscalationState,
    responseMode: ExecutiveResponseMode,
    budget: Required<ExecutiveControlBudgetConfig>
  ): ExecutiveFocus {
    // Primary focus is derived from the highest priority attention item
    const topAttention = attentionSet[0];
    let primaryFocus = "Address explicit user directive safely and directly";

    if (escalationState === "SAFETY_BLOCKED") {
      primaryFocus = "Uphold mandatory safety constraint and refuse unsafe action";
    } else if (escalationState === "NO_SAFE_PATH") {
      primaryFocus = "Communicate constraint blockage and absence of safe viable options";
    } else if (escalationState === "CLARIFICATION_REQUIRED") {
      primaryFocus = "Seek targeted user clarification on missing information";
    } else if (escalationState === "DECISION_DEFERRED") {
      primaryFocus = "Provide conditional guidance subject to prerequisite confirmation";
    } else if (topAttention) {
      primaryFocus = this.sanitizeSentence(topAttention.recommendedHandling);
    }

    // Secondary focuses from subsequent top attention items
    const secondaryFocuses = attentionSet
      .slice(1, budget.maxFocusDimensions)
      .map((a) => this.sanitizeSentence(a.recommendedHandling))
      .filter((s) => s.length > 0 && s !== primaryFocus);

    // Active Decision Mapping
    let activeDecision: ExecutiveFocus["activeDecision"];
    if (input.decision) {
      activeDecision = {
        state: input.decision.decisionState,
        recommendationType: input.decision.recommendation?.type || "RECOMMEND_OPTION",
        selectedOptionTitle: input.decision.selectedOption ? this.sanitizeSentence(input.decision.selectedOption.title) : undefined,
        isBlocked: input.decision.decisionState === "BLOCKED" || input.decision.decisionState === "REJECTED",
        requiresPrerequisites: !!(input.decision.actionPlan?.prerequisites && input.decision.actionPlan.prerequisites.length > 0),
      };
    }

    // Active Goal Mapping
    let activeGoal: ExecutiveFocus["activeGoal"];
    if (input.goalProject?.activeGoals && input.goalProject.activeGoals.length > 0) {
      const g = input.goalProject.activeGoals[0];
      activeGoal = {
        id: g.goalId,
        title: this.sanitizeSentence(g.title),
        status: g.status || "ACTIVE",
        isAligned: true,
      };
    }

    // Active Commitment Mapping
    let activeCommitment: ExecutiveFocus["activeCommitment"];
    const commitments = input.goalProject?.activeCommitments || input.executiveContext?.activeCommitments || [];
    if (commitments.length > 0) {
      const activeCm = commitments.find((c: any) => c.status === "ACTIVE" || c.status === "PENDING") || commitments[0];
      if (activeCm) {
        activeCommitment = {
          id: (activeCm as any).commitmentId || (activeCm as any).id,
          description: this.sanitizeSentence((activeCm as any).title || (activeCm as any).description),
          status: (activeCm as any).status,
        };
      }
    }

    // Critical Risks
    const criticalRisks: string[] = [];
    for (const item of attentionSet) {
      if (item.priorityClass === "PRIORITY_CRITICAL" || item.type === "CAUSAL_RISK" || item.type === "SCENARIO_WARNING") {
        criticalRisks.push(this.sanitizeSentence(item.rawContent));
      }
    }

    // Required Clarifications
    const requiredClarifications: string[] = [];
    for (const item of attentionSet) {
      if (item.type === "REQUIRED_CLARIFICATION") {
        requiredClarifications.push(this.sanitizeSentence(item.rawContent));
      }
    }

    return {
      primaryFocus,
      secondaryFocuses,
      activeDecision,
      activeGoal,
      activeCommitment,
      criticalRisks: Array.from(new Set(criticalRisks)).slice(0, 4),
      unresolvedIssues,
      requiredClarifications: Array.from(new Set(requiredClarifications)).slice(0, 3),
      recommendedResponseMode: responseMode,
    };
  }

  /**
   * Generates sanitized executive-control directives
   */
  private generateDirectives(
    focus: ExecutiveFocus,
    escalationState: ExecutiveEscalationState,
    responseMode: ExecutiveResponseMode,
    attentionSet: ExecutiveAttentionItem[],
    budget: Required<ExecutiveControlBudgetConfig>
  ): { rawDirectives: string[]; sanitizedDirectives: string[]; sanitizationCount: number } {
    const rawDirectives: string[] = [];

    // 1. Safety & Escalation Directives
    if (escalationState === "SAFETY_BLOCKED") {
      rawDirectives.push("A mandatory safety constraint prevents this action. Refuse execution politely and explain the constraint.");
    } else if (escalationState === "NO_SAFE_PATH") {
      rawDirectives.push("No candidate option satisfies all requirements safely. Inform the user and outline conflicting constraints.");
    } else if (escalationState === "CLARIFICATION_REQUIRED") {
      if (focus.requiredClarifications.length > 0) {
        rawDirectives.push(`Request clarification on: ${focus.requiredClarifications[0]}`);
      } else {
        rawDirectives.push("Ask targeted clarifying questions to resolve the information deficit before proceeding.");
      }
    } else if (escalationState === "DECISION_DEFERRED") {
      rawDirectives.push("State that recommendations are conditional on assumptions, and seek confirmation before proceeding.");
    }

    // 2. Primary Focus Directive
    if (rawDirectives.length === 0) {
      rawDirectives.push(`Prioritize the following objective: ${focus.primaryFocus}`);
    }

    // 3. Response Mode Directive
    if (responseMode === "PLAN" && focus.activeDecision?.selectedOptionTitle) {
      rawDirectives.push(`Present structured advisory steps for '${focus.activeDecision.selectedOptionTitle}' with safety checkpoints.`);
    } else if (responseMode === "WARN" && focus.criticalRisks.length > 0) {
      rawDirectives.push(`Highlight key warning: ${focus.criticalRisks[0]}`);
    } else if (responseMode === "CONDITIONAL_ANSWER") {
      rawDirectives.push("Provide the answer with explicit conditional qualifications.");
    }

    // 4. Secondary Directives from Attention Items
    for (const item of attentionSet) {
      if (rawDirectives.length >= budget.maxDirectives) break;
      if (item.priorityClass === "PRIORITY_HIGH" && item.type !== "USER_REQUEST") {
        const d = `Note: ${item.recommendedHandling}`;
        if (!rawDirectives.includes(d)) {
          rawDirectives.push(d);
        }
      }
    }

    let sanitizationCount = 0;
    const sanitizedDirectives = rawDirectives.map((d) => {
      const clean = this.sanitizeSentence(d);
      if (clean !== d) sanitizationCount++;
      return clean;
    }).slice(0, budget.maxDirectives);

    return {
      rawDirectives: rawDirectives.slice(0, budget.maxDirectives),
      sanitizedDirectives,
      sanitizationCount,
    };
  }

  /**
   * Compiles deterministic diagnostics
   */
  private compileDiagnostics(
    totalCandidates: number,
    attentionSet: ExecutiveAttentionItem[],
    suppressedCount: number,
    unresolvedIssueCount: number,
    escalationCount: number,
    budgetTruncationCount: number,
    sanitizationReplacements: number,
    escalationState: ExecutiveEscalationState,
    responseMode: ExecutiveResponseMode
  ): ExecutiveControlDiagnostics {
    let criticalCount = 0;
    let highPriorityCount = 0;
    let normalPriorityCount = 0;
    let lowPriorityCount = 0;

    for (const item of attentionSet) {
      switch (item.priorityClass) {
        case "PRIORITY_CRITICAL": criticalCount++; break;
        case "PRIORITY_HIGH": highPriorityCount++; break;
        case "PRIORITY_NORMAL": normalPriorityCount++; break;
        case "PRIORITY_LOW": lowPriorityCount++; break;
      }
    }

    let dominantPriorityClass: ExecutivePriorityClass = "PRIORITY_NORMAL";
    if (criticalCount > 0) dominantPriorityClass = "PRIORITY_CRITICAL";
    else if (highPriorityCount > 0) dominantPriorityClass = "PRIORITY_HIGH";
    else if (normalPriorityCount > 0) dominantPriorityClass = "PRIORITY_NORMAL";
    else if (lowPriorityCount > 0) dominantPriorityClass = "PRIORITY_LOW";

    return {
      totalAttentionCandidates: totalCandidates,
      activeAttentionCount: attentionSet.length,
      criticalCount,
      highPriorityCount,
      normalPriorityCount,
      lowPriorityCount,
      suppressedCount,
      unresolvedIssueCount,
      escalationCount,
      budgetTruncationCount,
      sanitizationReplacements,
      dominantPriorityClass,
      escalationState,
      responseMode,
    };
  }
}

export const adaptiveExecutiveControlEngine = new AdaptiveExecutiveControlEngine();
