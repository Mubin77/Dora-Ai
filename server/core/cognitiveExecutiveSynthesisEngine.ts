/**
 * Dora Cognitive Executive Synthesis & Final Response Governance Engine
 * Phase 3 — Step 10 (FINAL STEP OF PHASE 3)
 * 
 * Deterministic, non-LLM, read-only cognitive governance layer that synthesizes
 * the authorized outputs of Phase 3 Steps 1–9 into a final, safe, epistemically
 * calibrated governance package for downstream conversational generation.
 */

import {
  FinalCognitiveStance,
  FinalResponseStrategy,
  SynthesizedEvidenceItem,
  EpistemicQualification,
  SynthesisUncertaintySummary,
  SynthesizedDecisionGuidance,
  CognitiveExecutiveSynthesisDiagnostics,
  CognitiveExecutiveSynthesisBudgetConfig,
  DEFAULT_SYNTHESIS_BUDGET,
  HARD_CEILING_SYNTHESIS_BUDGET,
  CognitiveExecutiveSynthesis,
  CognitiveExecutiveSynthesisOptions,
  CognitiveExecutiveSynthesisInput,
} from "./cognitiveExecutiveSynthesisTypes";
import {
  EpistemicAuthority,
  EpistemicState,
  EpistemicScope,
  EpistemicProvenance,
  EpistemicClaim,
} from "./epistemicCalibrationTypes";
import { DecisionState } from "./deliberativeDecisionTypes";

export class CognitiveExecutiveSynthesisEngine {
  // 10-Tier Epistemic Authority Hierarchy Weights (0.00 to 1.00)
  private readonly AUTHORITY_WEIGHTS: Record<EpistemicAuthority, number> = {
    CURRENT_TURN_EXPLICIT: 1.00,
    HARD_CONSTRAINT: 0.98,
    VERIFIED_EVIDENCE: 0.95,
    GOVERNANCE_APPROVED_MEMORY: 0.90,
    CONFIRMED_USER_MODEL: 0.85,
    ACTIVE_GOAL_PROJECT_COMMITMENT: 0.80,
    TEMPORAL_CONTEXT: 0.60,
    CONFIRMED_ADAPTIVE_PATTERN: 0.50,
    PREDICTIVE_CONTEXT: 0.30,
    SYSTEM_DEFAULT: 0.20,
  };

  /**
   * Deterministic Hash for Key/ID Generation
   */
  public deterministicHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Main evaluate method for Cognitive Executive Synthesis
   */
  public evaluate(input: CognitiveExecutiveSynthesisInput): CognitiveExecutiveSynthesis {
    const startTime = input.options?.currentTime ?? 1724300000000;
    const userId = input.userId || (input.context as any)?.userId || "default";
    const activeTopic = input.options?.activeTopic || (input.context as any)?.activeTopic || "general";
    const strictTopicIsolation = Boolean(input.options?.strictTopicIsolation);

    // 1. Resolve and clamp budget against hard ceilings
    const rawBudget = { ...DEFAULT_SYNTHESIS_BUDGET, ...(input.options?.budget || {}) };
    const budget: Required<CognitiveExecutiveSynthesisBudgetConfig> = {
      maxApprovedEvidence: Math.min(rawBudget.maxApprovedEvidence, HARD_CEILING_SYNTHESIS_BUDGET.maxApprovedEvidence),
      maxQualifications: Math.min(rawBudget.maxQualifications, HARD_CEILING_SYNTHESIS_BUDGET.maxQualifications),
      maxCaveats: Math.min(rawBudget.maxCaveats, HARD_CEILING_SYNTHESIS_BUDGET.maxCaveats),
      maxDirectives: Math.min(rawBudget.maxDirectives, HARD_CEILING_SYNTHESIS_BUDGET.maxDirectives),
      maxSuppressedItems: Math.min(rawBudget.maxSuppressedItems, HARD_CEILING_SYNTHESIS_BUDGET.maxSuppressedItems),
      maxGuidanceSteps: Math.min(rawBudget.maxGuidanceSteps, HARD_CEILING_SYNTHESIS_BUDGET.maxGuidanceSteps),
    };

    let budgetTruncationCount = 0;
    let sanitizationReplacements = 0;

    // 2. Extract upstream inputs safely
    const message = (input.message || "").trim();
    const intent = input.intent;
    const verification = input.verification;
    const contradiction = input.contradictionResolution;
    const causal = input.causalReasoning;
    const multiHop = input.multiHopReasoning;
    const epistemic = input.epistemicCalibration;
    const scenario = input.scenarioSimulation;
    const metaReasoning = input.metaReasoning;
    const decision = input.decision;
    const execControl = input.executiveControl;

    // 3. Collect and classify candidate claims/evidence
    const candidateClaims: EpistemicClaim[] = [];
    if (epistemic && Array.isArray(epistemic.claims)) {
      candidateClaims.push(...epistemic.claims);
    }

    // Include claims from memory governance if available and not present
    if (input.memoryGovernance && Array.isArray((input.memoryGovernance as any).sanitizedDirectives)) {
      // Memory governance directives are handled as guidance/context
    }

    let totalInputClaims = candidateClaims.length;

    // 4. Evidence Filtering, Qualification & Suppression
    const approvedEvidence: SynthesizedEvidenceItem[] = [];
    const suppressedClaims: Array<{ key: string; reason: string }> = [];
    const epistemicQualifications: EpistemicQualification[] = [];

    // Check upstream suppression lists
    const suppressedKeys = new Set<string>();
    if (execControl && Array.isArray(execControl.suppressedItems)) {
      for (const item of execControl.suppressedItems) {
        if (item.itemId) suppressedKeys.add(item.itemId);
        if ((item as any).id) suppressedKeys.add((item as any).id);
        if ((item as any).key) suppressedKeys.add((item as any).key);
      }
    }

    for (const claim of candidateClaims) {
      // Check for secret/auth disclosure or sensitive content
      if (this.containsSensitiveData(claim.statement)) {
        suppressedClaims.push({ key: claim.normalizedKey || claim.id, reason: "Sensitive data / credentials detected" });
        continue;
      }

      // Check strict topic isolation
      if (strictTopicIsolation && claim.topic && claim.topic !== activeTopic && claim.scope === "TOPIC") {
        suppressedClaims.push({ key: claim.normalizedKey || claim.id, reason: "Strict topic isolation boundary violated" });
        continue;
      }

      // Check if suppressed upstream
      if (suppressedKeys.has(claim.id) || suppressedKeys.has(claim.normalizedKey) || claim.isSuppressed) {
        suppressedClaims.push({ key: claim.normalizedKey || claim.id, reason: "Suppressed by Adaptive Executive Control" });
        continue;
      }

      // Check epistemic state validity
      if (claim.epistemicState === "REJECTED") {
        suppressedClaims.push({ key: claim.normalizedKey || claim.id, reason: "Epistemic state is REJECTED" });
        continue;
      }

      // Claim is admissible: Determine if qualification is needed
      const authWeight = this.AUTHORITY_WEIGHTS[claim.authority] ?? 0.20;
      // Invariant: Synthesis NEVER increases confidence or authority
      const calibratedConf = Math.min(claim.confidence, authWeight);

      const needsQualification =
        claim.epistemicState === "UNCERTAIN" ||
        claim.epistemicState === "INFERRED" ||
        claim.epistemicState === "CONTESTED" ||
        claim.epistemicState === "ADVISORY" ||
        calibratedConf < 0.70;

      let qualReason: string | undefined;
      if (needsQualification) {
        let hedgingDegree: "NONE" | "MILD" | "MODERATE" | "STRONG" = "MILD";
        let hedgingPhrase = "Evidence indicates that";

        if (claim.epistemicState === "CONTESTED") {
          hedgingDegree = "STRONG";
          hedgingPhrase = "While there are differing perspectives, indications suggest that";
          qualReason = "Competing evidence exists without definitive resolution";
        } else if (claim.epistemicState === "UNCERTAIN" || calibratedConf < 0.50) {
          hedgingDegree = "STRONG";
          hedgingPhrase = "Although inconclusive, current indications suggest that";
          qualReason = "Evidence is partial or uncertain";
        } else if (claim.epistemicState === "INFERRED") {
          hedgingDegree = "MODERATE";
          hedgingPhrase = "Based on available reasoning hops, it follows that";
          qualReason = "Inferred via reasoning rather than direct observation";
        } else if (claim.epistemicState === "ADVISORY") {
          hedgingDegree = "MILD";
          hedgingPhrase = "As a non-binding suggestion,";
          qualReason = "Advisory recommendation";
        }

        if (epistemicQualifications.length < budget.maxQualifications) {
          epistemicQualifications.push({
            claimKey: claim.normalizedKey || claim.id,
            statement: claim.statement,
            epistemicState: claim.epistemicState,
            hedgingDegree,
            hedgingPhrase,
            rationale: qualReason || "Hedging applied due to epistemic state",
          });
        } else {
          budgetTruncationCount++;
        }
      }

      if (approvedEvidence.length < budget.maxApprovedEvidence) {
        approvedEvidence.push({
          id: claim.id,
          sourceType: claim.sourceType || "EPISTEMIC_ENGINE",
          statement: claim.statement,
          authority: claim.authority,
          authorityWeight: authWeight,
          epistemicState: claim.epistemicState,
          confidence: calibratedConf,
          isQualified: needsQualification,
          qualificationReason: qualReason,
          scope: claim.scope || "GLOBAL",
        });
      } else {
        budgetTruncationCount++;
      }
    }

    // Sort approved evidence by authority weight descending, then confidence descending
    approvedEvidence.sort((a, b) => {
      if (b.authorityWeight !== a.authorityWeight) {
        return b.authorityWeight - a.authorityWeight;
      }
      return b.confidence - a.confidence;
    });

    // 5. Synthesize Caveats and Warnings
    const caveatsAndWarnings: string[] = [];

    // Meta-reasoning critiques
    if (metaReasoning && Array.isArray(metaReasoning.issues)) {
      for (const issue of metaReasoning.issues) {
        if (issue.severity === "CRITICAL" || (issue.severity as string) === "MAJOR" || issue.severity === "HIGH") {
          const caveat = `Note: ${issue.description || (issue as any).targetStatement}`;
          if (!caveatsAndWarnings.includes(caveat) && caveatsAndWarnings.length < budget.maxCaveats) {
            caveatsAndWarnings.push(caveat);
          }
        }
      }
    }

    // Contradiction warnings
    const rawContradictions = contradiction ? ((contradiction as any).contradictions || (contradiction as any).activeContradictions || []) : [];
    if (Array.isArray(rawContradictions) && rawContradictions.length > 0) {
      const activeUnresolved = rawContradictions.filter((c: any) => c.status === "ACTIVE" || c.status === "UNRESOLVED" || c.classification === "UNRESOLVED_CONFLICT");
      if (activeUnresolved.length > 0) {
        const cWarning = "Conflicting premises exist regarding the current topic.";
        if (!caveatsAndWarnings.includes(cWarning) && caveatsAndWarnings.length < budget.maxCaveats) {
          caveatsAndWarnings.push(cWarning);
        }
      }
    }

    // Scenario simulation risks
    if (scenario && Array.isArray(scenario.scenarios)) {
      for (const sc of scenario.scenarios) {
        const risks = (sc as any).risks || (sc as any).outcomes?.filter((o: any) => o.severity === "HIGH" || o.severity === "CRITICAL") || [];
        if (risks.length > 0) {
          for (const risk of risks) {
            if (risk.severity === "HIGH" || risk.severity === "CRITICAL") {
              const rCaveat = `Potential Risk: ${risk.description || risk.summary}`;
              if (!caveatsAndWarnings.includes(rCaveat) && caveatsAndWarnings.length < budget.maxCaveats) {
                caveatsAndWarnings.push(rCaveat);
              }
            }
          }
        }
      }
    }

    // 6. Synthesize Decision Guidance
    let decisionGuidance: SynthesizedDecisionGuidance | undefined;
    if (decision && decision.recommendation) {
      const rec = decision.recommendation;
      const caveats: string[] = [];
      if ((rec as any).caveats && Array.isArray((rec as any).caveats)) {
        caveats.push(...(rec as any).caveats.slice(0, budget.maxCaveats));
      }

      const nextSteps: string[] = [];
      if ((decision as any).plan && Array.isArray((decision as any).plan.steps)) {
        for (const step of (decision as any).plan.steps.slice(0, budget.maxGuidanceSteps)) {
          nextSteps.push(step.description || step.action);
        }
      }

      let tradeoffSummary: string | undefined;
      if (decision.tradeoffs && decision.tradeoffs.length > 0) {
        tradeoffSummary = decision.tradeoffs.map((t: any) => `${t.benefit} vs ${t.consequence}`).join("; ");
      }

      decisionGuidance = {
        recommendedAction: (rec as any).description || (rec as any).primaryCandidateKey || (rec as any).title || "PROCEED",
        decisionState: (decision as any).state || (decision as any).decisionState || "DECIDED",
        recommendationType: (rec as any).type || (rec as any).recommendationType || "ADVISORY",
        tradeoffSummary,
        caveats,
        nextSteps,
      };
    }

    // 7. Uncertainty Summary Synthesis
    let compoundUncertainty = 0.1;
    const primaryUncertaintySources: string[] = [];

    const metaUncertainty = (metaReasoning as any)?.uncertainty || (metaReasoning as any)?.uncertaintyVector;
    if (metaUncertainty) {
      compoundUncertainty = metaUncertainty.compoundUncertainty ?? 0.1;
      if (metaUncertainty.evidenceInsufficiency > 0.4) {
        primaryUncertaintySources.push("Evidence Insufficiency");
      }
      if (metaUncertainty.sourceConflict > 0.4) {
        primaryUncertaintySources.push("Source Conflict");
      }
      if (metaUncertainty.epistemicGap > 0.4) {
        primaryUncertaintySources.push("Epistemic Gap");
      }
    }

    const hasContested = candidateClaims.some((c) => c.epistemicState === "CONTESTED");
    const hasUnresolvedContradiction = Boolean(
      contradiction &&
      ((contradiction as any).contradictions || (contradiction as any).activeContradictions) &&
      ((contradiction as any).contradictions || (contradiction as any).activeContradictions).some((c: any) => c.status === "ACTIVE" || c.status === "UNRESOLVED" || c.classification === "UNRESOLVED_CONFLICT")
    );

    const uncertaintySummary: SynthesisUncertaintySummary = {
      compoundUncertainty: Math.min(1.0, Math.max(0.0, compoundUncertainty)),
      primaryUncertaintySources,
      evidenceSufficiency: approvedEvidence.length > 0 ? Math.min(1.0, 0.4 + approvedEvidence.length * 0.15) : 0.2,
      epistemicGap: Math.min(1.0, Math.max(0.0, epistemicQualifications.length * 0.15)),
      hasContestedClaims: hasContested,
      hasUnresolvedContradictions: hasUnresolvedContradiction,
    };

    // 8. Determine Clarification Request
    let clarificationRequired = false;
    let clarificationReason: string | undefined;
    const suggestedQuestions: string[] = [];

    if (intent?.requiresClarification) {
      clarificationRequired = true;
      clarificationReason = intent.ambiguityReason || "Intent contains ambiguous or underspecified elements.";
    } else if (verification?.requiresClarification) {
      clarificationRequired = true;
      clarificationReason = verification.clarificationReason || "Verification identified missing critical facts.";
    } else if (execControl?.escalationState === "CLARIFICATION_REQUIRED") {
      clarificationRequired = true;
      clarificationReason = "Adaptive Executive Control flagged mandatory clarification.";
    } else if (hasUnresolvedContradiction && approvedEvidence.length === 0) {
      clarificationRequired = true;
      clarificationReason = "Unresolved direct contradiction blocks safe completion.";
      suggestedQuestions.push("Could you clarify which previous statement or preference takes precedence?");
    }

    if (clarificationRequired && suggestedQuestions.length === 0) {
      suggestedQuestions.push("Could you provide additional details on what you would like to prioritize?");
    }

    // 9. Determine Final Cognitive Stance & Final Response Strategy
    const { stance, strategy } = this.determineStanceAndStrategy({
      message,
      intent,
      verification,
      metaReasoning,
      decision,
      execControl,
      hasUnresolvedContradiction,
      hasContested,
      clarificationRequired,
      approvedEvidenceCount: approvedEvidence.length,
      qualifiedEvidenceCount: epistemicQualifications.length,
      caveatsCount: caveatsAndWarnings.length,
      causal,
      scenario,
    });

    // 10. Generate Directives & Behavioral Guidance
    const rawDirectives: string[] = [];

    // Stance directive
    rawDirectives.push(this.formatStanceDirective(stance));

    // Strategy directive
    rawDirectives.push(this.formatStrategyDirective(strategy));

    // Upstream executive control directives
    if (execControl && Array.isArray(execControl.sanitizedDirectives)) {
      for (const d of execControl.sanitizedDirectives) {
        if (!rawDirectives.includes(d) && rawDirectives.length < budget.maxDirectives) {
          rawDirectives.push(d);
        }
      }
    }

    // Decision directives
    if (decision && Array.isArray(decision.sanitizedDirectives)) {
      for (const d of decision.sanitizedDirectives) {
        if (!rawDirectives.includes(d) && rawDirectives.length < budget.maxDirectives) {
          rawDirectives.push(d);
        }
      }
    }

    // Epistemic hedging directive
    if (epistemicQualifications.length > 0 && stance === "QUALIFIED_ANSWER") {
      rawDirectives.push("Hedging required: Express conclusions with appropriate epistemic modesty and nuance.");
    }

    // Clarification directive
    if (clarificationRequired && (stance === "CLARIFICATION_FIRST" || stance === "DEFERRED_ACTION")) {
      rawDirectives.push("Seek immediate clarification before committing to a definitive assertion.");
    }

    // Sanitize directives
    const sanitizedDirectives: string[] = [];
    for (const dir of rawDirectives) {
      const sanitized = this.sanitizeDirective(dir);
      if (sanitized !== dir) {
        sanitizationReplacements++;
      }
      if (sanitized && !sanitizedDirectives.includes(sanitized) && sanitizedDirectives.length < budget.maxDirectives) {
        sanitizedDirectives.push(sanitized);
      }
    }

    // 11. Compile Epistemic Provenance
    const provenance: EpistemicProvenance[] = [
      {
        sourceId: "CognitiveExecutiveSynthesisEngine",
        sourceType: "EXECUTIVE_FACT",
        authority: "HARD_CONSTRAINT",
        confidence: 1.0,
        statement: "Synthesized executive cognitive governance package",
        scope: "GLOBAL",
        topic: "synthesis",
        timestamp: startTime,
      },
    ];

    // 12. Diagnostics
    const diagnostics: CognitiveExecutiveSynthesisDiagnostics = {
      totalInputClaimsEvaluated: totalInputClaims,
      approvedEvidenceCount: approvedEvidence.length,
      qualifiedEvidenceCount: epistemicQualifications.length,
      suppressedEvidenceCount: suppressedClaims.length,
      caveatCount: caveatsAndWarnings.length,
      directiveCount: sanitizedDirectives.length,
      sanitizationReplacements,
      budgetTruncationCount,
      finalStance: stance,
      finalStrategy: strategy,
      authorityPrecedenceApplied: true,
      evaluationTimeMs: 0,
    };

    return {
      finalStance: stance,
      finalStrategy: strategy,
      approvedEvidence,
      epistemicQualifications,
      suppressedClaims,
      uncertaintySummary,
      caveatsAndWarnings,
      decisionGuidance,
      clarificationRequest: clarificationRequired
        ? {
            required: true,
            reason: clarificationReason,
            suggestedQuestions,
          }
        : undefined,
      directives: rawDirectives,
      sanitizedDirectives,
      provenance,
      diagnostics,
    };
  }

  /**
   * Deterministic Stance and Strategy Matrix
   */
  private determineStanceAndStrategy(ctx: {
    message: string;
    intent?: any;
    verification?: any;
    metaReasoning?: any;
    decision?: any;
    execControl?: any;
    hasUnresolvedContradiction: boolean;
    hasContested: boolean;
    clarificationRequired: boolean;
    approvedEvidenceCount: number;
    qualifiedEvidenceCount: number;
    caveatsCount: number;
    causal?: any;
    scenario?: any;
  }): { stance: FinalCognitiveStance; strategy: FinalResponseStrategy } {
    const msgLower = ctx.message.toLowerCase();

    // 1. Refusal / Safety Check
    const hasCriticalSafetyIssue =
      ctx.metaReasoning?.issues?.some((i: any) => i.type === "SENSITIVE_DATA_EXPOSURE" || i.type === "SAFETY_VIOLATION" || (i.type === "SECURITY_VIOLATION" && i.severity === "CRITICAL")) ||
      ctx.execControl?.escalationState === "BLOCKED_SAFETY";

    if (hasCriticalSafetyIssue) {
      return {
        stance: "REFUSAL_SAFETY",
        strategy: "DEFENSIVE_SUPPRESSION",
      };
    }

    // 2. Epistemic Correction Check
    const hasFlawedLogicOrHallucination =
      ctx.metaReasoning?.issues?.some(
        (i: any) =>
          i.type === "LOGICAL_INVALIDITY" ||
          i.type === "CAUSAL_HALLUCINATION" ||
          i.type === "SIMULATION_REALITY_CONFUSION" ||
          i.type === "CIRCULAR_REASONING"
      );

    if (hasFlawedLogicOrHallucination) {
      return {
        stance: "EPISTEMIC_CORRECTION",
        strategy: "CORRECTIVE_ALIGNMENT",
      };
    }

    // 3. Clarification First Check
    if (ctx.clarificationRequired || ctx.execControl?.escalationState === "CLARIFICATION_REQUIRED") {
      return {
        stance: "CLARIFICATION_FIRST",
        strategy: "SOCRATIC_CLARIFICATION",
      };
    }

    // 4. Decision & Action Planning Check
    if (ctx.decision && ctx.decision.state) {
      if (ctx.decision.state === "READY" || ctx.decision.state === "READY_WITH_WARNINGS") {
        if (ctx.decision.state === "READY_WITH_WARNINGS" || ctx.caveatsCount > 0) {
          return {
            stance: "DECISION_RECOMMENDATION",
            strategy: "DELIBERATIVE_GUIDANCE",
          };
        }
        return {
          stance: "DECISION_RECOMMENDATION",
          strategy: "DELIBERATIVE_GUIDANCE",
        };
      } else if (ctx.decision.state === "INSUFFICIENT_INFORMATION") {
        return {
          stance: "DEFERRED_ACTION",
          strategy: "SOCRATIC_CLARIFICATION",
        };
      } else if (ctx.decision.state === "BLOCKED" || ctx.decision.state === "REJECTED") {
        return {
          stance: "WARNING_THEN_ANSWER",
          strategy: "DELIBERATIVE_GUIDANCE",
        };
      }
    }

    // 5. Causal Explanation Check
    const isCausalQuery =
      msgLower.includes("why did") ||
      msgLower.includes("what caused") ||
      msgLower.includes("root cause") ||
      msgLower.includes("causal chain") ||
      Boolean(ctx.causal && ctx.causal.chains && ctx.causal.chains.length > 0 && msgLower.includes("because"));

    if (isCausalQuery) {
      return {
        stance: ctx.qualifiedEvidenceCount > 0 ? "QUALIFIED_ANSWER" : "DIRECT_ANSWER",
        strategy: "CAUSAL_EXPLANATION",
      };
    }

    // 6. Scenario Simulation Check
    const isScenarioQuery =
      msgLower.includes("simulate") ||
      msgLower.includes("what if") ||
      msgLower.includes("future scenario") ||
      msgLower.includes("projected outcome");

    if (isScenarioQuery || (ctx.scenario && ctx.scenario.scenarios && ctx.scenario.scenarios.length > 0)) {
      return {
        stance: ctx.caveatsCount > 0 ? "WARNING_THEN_ANSWER" : "DIRECT_ANSWER",
        strategy: "SCENARIO_PROJECTION",
      };
    }

    // 7. Multi-Perspective / Contested Check
    if (ctx.hasContested || ctx.hasUnresolvedContradiction) {
      return {
        stance: "QUALIFIED_ANSWER",
        strategy: "MULTI_PERSPECTIVE_SYNTHESIS",
      };
    }

    // 8. Warning Then Answer Check
    if (ctx.caveatsCount > 0 || ctx.execControl?.escalationState === "WARNING_REQUIRED") {
      return {
        stance: "WARNING_THEN_ANSWER",
        strategy: "DELIBERATIVE_GUIDANCE",
      };
    }

    // 9. Qualified Answer Check
    if (ctx.qualifiedEvidenceCount > 0 || ctx.approvedEvidenceCount === 0) {
      return {
        stance: "QUALIFIED_ANSWER",
        strategy: "MULTI_PERSPECTIVE_SYNTHESIS",
      };
    }

    // 10. Direct Answer Default
    return {
      stance: "DIRECT_ANSWER",
      strategy: "DIRECT",
    };
  }

  /**
   * Helper to format stance directive
   */
  private formatStanceDirective(stance: FinalCognitiveStance): string {
    switch (stance) {
      case "DIRECT_ANSWER":
        return "Stance: Provide a direct, assertive answer grounded in verified facts.";
      case "CLARIFICATION_FIRST":
        return "Stance: Request clarification on missing parameters or ambiguity before finalizing assertions.";
      case "QUALIFIED_ANSWER":
        return "Stance: Provide a calibrated answer with explicit hedging on unverified inferences.";
      case "WARNING_THEN_ANSWER":
        return "Stance: Articulate key caveats and risks before presenting the answer.";
      case "EPISTEMIC_CORRECTION":
        return "Stance: Address and correct the underlying premise or logical discrepancy constructively.";
      case "DECISION_RECOMMENDATION":
        return "Stance: Present the recommended option along with trade-offs and next execution steps.";
      case "REFUSAL_SAFETY":
        return "Stance: Refuse unsafe or unauthorized actions while clearly explaining policy boundaries.";
      case "DEFERRED_ACTION":
        return "Stance: Defer definitive commitment until required information gathering is complete.";
    }
  }

  /**
   * Helper to format strategy directive
   */
  private formatStrategyDirective(strategy: FinalResponseStrategy): string {
    switch (strategy) {
      case "DIRECT":
        return "Strategy: Direct and clear presentation without unnecessary disclaimers.";
      case "SOCRATIC_CLARIFICATION":
        return "Strategy: Ask targeted, concise questions to resolve epistemic ambiguity.";
      case "MULTI_PERSPECTIVE_SYNTHESIS":
        return "Strategy: Present balanced perspectives reflecting varying degrees of evidence.";
      case "CAUSAL_EXPLANATION":
        return "Strategy: Structure the response by explaining underlying causal mechanisms.";
      case "SCENARIO_PROJECTION":
        return "Strategy: Illustrate prospective scenarios, assumptions, and potential consequences.";
      case "CORRECTIVE_ALIGNMENT":
        return "Strategy: Align understanding by clarifying factual corrections neutrally.";
      case "DELIBERATIVE_GUIDANCE":
        return "Strategy: Guide decision-making through structured options, criteria, and trade-offs.";
      case "DEFENSIVE_SUPPRESSION":
        return "Strategy: Suppress sensitive or unverified content and enforce strict safety boundaries.";
    }
  }

  /**
   * Sensitive data detection
   */
  private containsSensitiveData(text?: string): boolean {
    if (!text || typeof text !== "string") return false;
    const sensitivePatterns = [
      /AIzaSy[A-Za-z0-9_-]{33}/,
      /Bearer\s+[A-Za-z0-9\-._~+/]+=*/i,
      /sk-[A-Za-z0-9]{20,}/,
      /password\s*[:=]\s*\S+/i,
      /secret\s*[:=]\s*\S+/i,
      /api[_-]?key\s*[:=]\s*\S+/i,
    ];
    return sensitivePatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Directive Sanitization (strips UUIDs, hashes, raw timestamps, floats, credentials)
   */
  public sanitizeDirective(text: string): string {
    if (!text || typeof text !== "string") return "";
    return text
      // API keys & auth tokens
      .replace(/AIzaSy[A-Za-z0-9_-]{33}/g, "[REDACTED_API_KEY]")
      .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "[REDACTED_TOKEN]")
      .replace(/sk-[A-Za-z0-9]{20,}/g, "[REDACTED_KEY]")
      // Internal IDs & UUIDs
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[ID]")
      .replace(/\b(?:claim|rule|scen|eval|hop|critique|issue|cand)_[a-z0-9_]+\b/gi, "[ITEM]")
      // Raw Unix millisecond timestamps (e.g. 1724300000000)
      .replace(/\b1[5-9]\d{8,11}\b/g, "")
      // Raw floating point numbers with 2+ decimal places (e.g. 0.8523)
      .replace(/\b\d+\.\d{2,}\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
}

export const cognitiveExecutiveSynthesisEngine = new CognitiveExecutiveSynthesisEngine();
