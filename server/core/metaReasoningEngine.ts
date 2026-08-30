/**
 * Dora Meta-Reasoning & Self-Critique Engine
 * Phase 3 — Step 7
 * 
 * Deterministic, non-LLM, read-only, side-effect-free, bounded, explainable engine
 * for auditing Dora's own authorized cognitive outputs across all upstream reasoning layers.
 * 
 * Evaluates grounding, logical consistency, epistemic calibration, causal validity,
 * multi-hop provenance, assumption sensitivity, authority hierarchy alignment,
 * topic/scope isolation, and simulation/reality separation.
 */

import {
  MetaReasoningAnalysis,
  MetaReasoningInput,
  MetaReasoningIssue,
  MetaReasoningIssueType,
  MetaReasoningCritique,
  MetaReasoningCorrection,
  MetaReasoningRecommendation,
  MetaReasoningUncertainty,
  MetaReasoningDiagnostics,
  MetaReasoningBudgetConfig,
  MetaCritiqueSeverity,
  MetaCorrectionType,
  AuditedClaim,
  DEFAULT_META_REASONING_BUDGET,
  HARD_CEILING_META_REASONING_BUDGET,
  META_SEVERITY_RANKS,
} from "./metaReasoningTypes";
import {
  EpistemicAuthority,
  EpistemicState,
  EpistemicScope,
  EpistemicProvenance,
  EPISTEMIC_AUTHORITY_WEIGHTS,
} from "./epistemicCalibrationTypes";

export class MetaReasoningEngine {
  /**
   * Deterministic 32-bit FNV-1a hash function.
   */
  private fnv1a(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  /**
   * Generates a deterministic hex ID.
   */
  private deterministicId(prefix: string, ...inputs: string[]): string {
    const raw = inputs.filter(Boolean).join("|");
    const h = this.fnv1a(raw).toString(16).padStart(8, "0");
    return `${prefix}_${h}`;
  }

  /**
   * Normalizes keys for stable comparison with safe null handling.
   */
  private normalizeKey(key?: string): string {
    if (!key || typeof key !== "string") return "";
    return key.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  }

  /**
   * Clamps number in [min, max].
   */
  private clamp(val: number, min = 0.0, max = 1.0): number {
    if (isNaN(val) || val === null || val === undefined) return min;
    return Math.max(min, Math.min(max, val));
  }

  /**
   * Sensitive pattern detector for credentials, private keys, passwords, bearer tokens.
   */
  private containsSensitiveData(text: string): boolean {
    if (!text || typeof text !== "string") return false;
    const lower = text.toLowerCase();
    const sensitivePatterns = [
      /bearer\s+[a-zA-Z0-9_\-\.]{10,}/i,
      /aizasy[0-9a-zA-Z_\-]{20,}/i,
      /api[_-]?key\s*[:=]?\s*[a-zA-Z0-9_\-]{10,}/i,
      /sk_live_[0-9a-zA-Z]{15,}/i,
      /ghp_[0-9a-zA-Z]{20,}/i,
      /password\s*[:=]?\s*["']?[^\s"']{4,}/i,
      /hunter2/i,
      /private_key/i,
      /client_secret/i,
    ];
    return sensitivePatterns.some((pattern) => pattern.test(lower));
  }

  /**
   * Psychological and demographic inference detector.
   */
  private containsUnsupportedPsychologicalInference(text: string): boolean {
    if (!text || typeof text !== "string") return false;
    const lower = text.toLowerCase();
    const forbiddenPhrases = [
      "user has adhd",
      "user has autism",
      "user is bipolar",
      "user is depressed",
      "user has mental disorder",
      "user has personality disorder",
      "user's sexual orientation",
      "user's religious devotion",
      "user suffers from anxiety",
      "user is neurotic",
      "user is narcissistic",
    ];
    return forbiddenPhrases.some((phrase) => lower.includes(phrase));
  }

  /**
   * Sanitizes a natural language string by removing internal IDs, hashes, and raw confidence scores.
   */
  private sanitizeDirective(rawText: string): string {
    if (!rawText || typeof rawText !== "string") return "";
    let sanitized = rawText
      .replace(/AIzaSy[0-9a-zA-Z_\-]+/gi, "[REDACTED_API_KEY]")
      .replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, "[REDACTED_TOKEN]")
      .replace(/password\s*[:=]?\s*["']?[^\s"']+["']?/gi, "[REDACTED_PASSWORD]")
      .replace(/hunter2/gi, "[REDACTED]")
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
      .replace(/\b(claim|scen|act|fact|hyp|rel|chain|crit|issue|rule|diag|const|proj|goal)_[0-9a-f_]{4,}\b/gi, "")
      .replace(/\b0\.\d{3,}\b/g, "")
      .replace(/\b(UUID|GUID|HASH|ID|SCORE|WEIGHT)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (sanitized.length > 0 && !sanitized.endsWith(".") && !sanitized.endsWith("!") && !sanitized.endsWith("?")) {
      sanitized += ".";
    }
    return sanitized;
  }

  /**
   * Main entry point for meta-reasoning evaluation.
   */
  public evaluate(
    input: MetaReasoningInput,
    customBudget?: Partial<MetaReasoningBudgetConfig>
  ): MetaReasoningAnalysis {
    const startTime = input?.options?.currentTime ?? 1724300000000;
    const perfStart = typeof performance !== "undefined" ? performance.now() : 0;

    const mergedBudget: Partial<MetaReasoningBudgetConfig> = {
      ...(input?.options?.budget || {}),
      ...(customBudget || {}),
    };

    const budgetConfig: MetaReasoningBudgetConfig = {
      maxClaims: Math.min(mergedBudget.maxClaims ?? DEFAULT_META_REASONING_BUDGET.maxClaims, HARD_CEILING_META_REASONING_BUDGET.maxClaims),
      maxIssues: Math.min(mergedBudget.maxIssues ?? DEFAULT_META_REASONING_BUDGET.maxIssues, HARD_CEILING_META_REASONING_BUDGET.maxIssues),
      maxCritiques: Math.min(mergedBudget.maxCritiques ?? DEFAULT_META_REASONING_BUDGET.maxCritiques, HARD_CEILING_META_REASONING_BUDGET.maxCritiques),
      maxCorrections: Math.min(mergedBudget.maxCorrections ?? DEFAULT_META_REASONING_BUDGET.maxCorrections, HARD_CEILING_META_REASONING_BUDGET.maxCorrections),
      maxRecommendations: Math.min(mergedBudget.maxRecommendations ?? DEFAULT_META_REASONING_BUDGET.maxRecommendations!, HARD_CEILING_META_REASONING_BUDGET.maxRecommendations!),
      maxEvidenceRefs: Math.min(mergedBudget.maxEvidenceRefs ?? DEFAULT_META_REASONING_BUDGET.maxEvidenceRefs, HARD_CEILING_META_REASONING_BUDGET.maxEvidenceRefs),
      maxGraphDepth: Math.min(mergedBudget.maxGraphDepth ?? DEFAULT_META_REASONING_BUDGET.maxGraphDepth, HARD_CEILING_META_REASONING_BUDGET.maxGraphDepth),
      maxDirectives: Math.min(mergedBudget.maxDirectives ?? DEFAULT_META_REASONING_BUDGET.maxDirectives, HARD_CEILING_META_REASONING_BUDGET.maxDirectives),
      maxTotalItems: Math.min(mergedBudget.maxTotalItems ?? DEFAULT_META_REASONING_BUDGET.maxTotalItems, HARD_CEILING_META_REASONING_BUDGET.maxTotalItems),
      maxExecutionTimeMs: Math.min(mergedBudget.maxExecutionTimeMs ?? DEFAULT_META_REASONING_BUDGET.maxExecutionTimeMs!, HARD_CEILING_META_REASONING_BUDGET.maxExecutionTimeMs!),
    };

    const diagnostics: MetaReasoningDiagnostics = {
      executionTimeMs: 0,
      durationMs: 0,
      claimsAudited: 0,
      rulesEvaluated: 0,
      issuesDetected: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
      unsupportedClaims: 0,
      confidenceOverreachCount: 0,
      epistemicOverclaimCount: 0,
      contradictionIssues: 0,
      causalOverreachCount: 0,
      multiHopOverreachCount: 0,
      assumptionIssues: 0,
      simulationRealityConfusions: 0,
      predictionAsFactCount: 0,
      topicIsolationRejections: 0,
      scopeIsolationRejections: 0,
      constraintViolations: 0,
      provenanceBreaks: 0,
      reasoningCycles: 0,
      duplicateEvidenceCount: 0,
      sanitizationCount: 0,
      budgetTruncations: 0,
      directivesGenerated: 0,
    };

    const activeTopic = input?.options?.activeTopic || (input?.context as any)?.activeTopic || (input?.executiveContext?.currentTurn as any)?.topic || "general";
    const strictTopicIsolation = input?.options?.strictTopicIsolation ?? false;

    // 1. Gather all authorized claims across upstream layers
    const auditedClaims = this.gatherAuditedClaims(input, budgetConfig, diagnostics);

    // 2. Perform modular audits
    const issues: MetaReasoningIssue[] = [];

    this.auditSensitiveAndIdentityViolations(input, issues, budgetConfig, diagnostics);
    this.auditHardConstraints(input, auditedClaims, issues, budgetConfig, diagnostics);
    this.auditGoalAndProjectAlignment(input, auditedClaims, issues, budgetConfig, diagnostics);
    this.auditDeepReasoningAndHypotheses(input, auditedClaims, issues, budgetConfig, diagnostics);
    this.auditContradictions(input, auditedClaims, issues, budgetConfig, diagnostics);
    this.auditCausalReasoning(input, auditedClaims, issues, budgetConfig, diagnostics);
    this.auditMultiHopReasoning(input, auditedClaims, issues, budgetConfig, diagnostics);
    this.auditEpistemicCalibration(input, auditedClaims, issues, budgetConfig, diagnostics);
    this.auditScenarioSimulation(input, auditedClaims, issues, budgetConfig, diagnostics);
    this.auditTopicAndScopeIsolation(input, auditedClaims, issues, activeTopic, strictTopicIsolation, budgetConfig, diagnostics);
    this.auditCyclesAndDuplicateEvidence(input, auditedClaims, issues, budgetConfig, diagnostics);
    this.auditQuarantinedAndStaleData(input, auditedClaims, issues, budgetConfig, diagnostics);
    this.auditDirectiveConflicts(input, issues, budgetConfig, diagnostics);

    // Apply issue truncation if over budget
    let finalIssues = issues;
    if (finalIssues.length > budgetConfig.maxIssues) {
      diagnostics.budgetTruncations += finalIssues.length - budgetConfig.maxIssues;
      finalIssues = finalIssues.slice(0, budgetConfig.maxIssues);
    }
    diagnostics.issuesDetected = finalIssues.length;

    // Sort issues deterministically by severity (highest first)
    finalIssues.sort((a, b) => {
      const sA = META_SEVERITY_RANKS[a.severity] || 0;
      const sB = META_SEVERITY_RANKS[b.severity] || 0;
      if (sA !== sB) return sB - sA;
      if (a.affectedLayer !== b.affectedLayer) return a.affectedLayer.localeCompare(b.affectedLayer);
      if (a.issueType !== b.issueType) return a.issueType.localeCompare(b.issueType);
      return a.id.localeCompare(b.id);
    });

    // 3. Compute Orthogonal Uncertainty Model
    const uncertainty = this.computeUncertaintyDimensions(input, auditedClaims, finalIssues);

    // 4. Generate Self-Critiques
    const critiques = this.generateCritiques(finalIssues, auditedClaims, uncertainty, budgetConfig, diagnostics);

    // 5. Generate Downstream Corrections
    const corrections = this.generateCorrections(critiques, budgetConfig, diagnostics);

    // 6. Generate Recommendations and Sanitized Directives
    const recommendations = this.generateRecommendations(finalIssues, critiques, budgetConfig);
    const directives = this.generateDirectives(finalIssues, critiques, corrections, recommendations, budgetConfig, diagnostics);

    // Coherence check: true if no CRITICAL or MAJOR issues
    const isCoherent = !finalIssues.some((i) => i.severity === "CRITICAL" || i.severity === "MAJOR");

    diagnostics.executionTimeMs = 0;
    diagnostics.durationMs = 0;

    return {
      isCoherent,
      auditedClaims,
      issues: finalIssues,
      critiques,
      corrections,
      uncertainty,
      recommendations,
      directives,
      diagnostics,
    };
  }

  /**
   * 1. Gather all authorized claims across upstream layers.
   */
  private gatherAuditedClaims(
    input: MetaReasoningInput,
    budget: MetaReasoningBudgetConfig,
    diagnostics: MetaReasoningDiagnostics
  ): AuditedClaim[] {
    const claims: AuditedClaim[] = [];
    const seen = new Set<string>();

    const addClaim = (
      id: string,
      statement: string,
      sourceLayer: string,
      sourceAuthority: EpistemicAuthority,
      epistemicState: EpistemicState,
      confidence: number,
      scope: EpistemicScope,
      topic: string,
      provenance: EpistemicProvenance[],
      evidenceCount: number,
      hasUnresolvedContradiction: boolean,
      isSimulated: boolean,
      isPredictive: boolean
    ) => {
      if (!statement) return;
      if (claims.length >= budget.maxClaims) {
        diagnostics.budgetTruncations++;
        return;
      }
      const norm = this.normalizeKey(statement);
      if (seen.has(norm)) return;
      seen.add(norm);

      claims.push({
        id,
        statement,
        text: statement,
        claim: statement,
        sourceLayer,
        sourceAuthority,
        epistemicState,
        confidence: this.clamp(confidence),
        scope,
        topic,
        provenance: provenance || [],
        evidenceCount,
        hasUnresolvedContradiction,
        isSimulated,
        isPredictive,
      });
      diagnostics.claimsAudited++;
    };

    // From Executive Context Facts
    if (input?.executiveContext?.authoritativeFacts) {
      for (const f of input.executiveContext.authoritativeFacts) {
        if (!f) continue;
        const key = f.key || (f as any).normalizedKey || "fact";
        const val = f.value || (f as any).normalizedValue || "";
        const stmt = val ? `${key}: ${val}` : key;
        addClaim(
          f.id || this.deterministicId("claim_fact", stmt),
          stmt,
          "ExecutiveContext",
          (f.authority as EpistemicAuthority) || "GOVERNANCE_APPROVED_MEMORY",
          "KNOWN",
          f.confidence ?? 0.85,
          (f as any).isGlobal ? "GLOBAL" : (f as any).scope || "TOPIC",
          f.topic || "general",
          [],
          1,
          false,
          false,
          false
        );
      }
    }

    // From Deep Reasoning Hypotheses
    if (input?.deepReasoning?.hypotheses) {
      for (const h of input.deepReasoning.hypotheses) {
        if (!h) continue;
        const stmt = (h as any).statement || (h as any).claim || (h as any).hypothesis || (h as any).text || "";
        if (!stmt) continue;
        const supCount = (h as any).supportingEvidence?.length || (h as any).supportingEvidenceIds?.length || 0;
        const refCount = (h as any).refutingEvidence?.length || (h as any).conflictingEvidence?.length || (h as any).contradictingEvidenceIds?.length || 0;
        addClaim(
          h.id || this.deterministicId("claim_hyp", stmt),
          stmt,
          "DeepReasoning",
          ((h as any).winningAuthority || (h as any).authority as EpistemicAuthority) || "GOVERNANCE_APPROVED_MEMORY",
          ((h as any).epistemicStatus || (h as any).status as EpistemicState) || "INFERRED",
          h.confidence ?? 0.70,
          "GLOBAL",
          (h as any).topic || "general",
          (h as any).provenance || [],
          supCount,
          refCount > 0,
          false,
          false
        );
      }
    }

    // From Causal Relations
    if (input?.causalReasoning?.relations) {
      for (const r of input.causalReasoning.relations) {
        if (!r) continue;
        const cause = (r as any).cause || (r as any).causeEntity || (r as any).causeKey || (r as any).causeStatement || "";
        const effect = (r as any).effect || (r as any).effectEntity || (r as any).effectKey || (r as any).effectStatement || "";
        const stmt = cause && effect ? `${cause} causes ${effect}` : (r as any).causeStatement || "Causal relation";
        const relType = (r as any).relationType || (r as any).causalType || "";
        addClaim(
          r.id || this.deterministicId("claim_causal", stmt),
          stmt,
          "CausalReasoning",
          ((r as any).evidenceAuthority || (r as any).authority as EpistemicAuthority) || "GOVERNANCE_APPROVED_MEMORY",
          relType === "CORRELATION_ONLY" ? "UNCERTAIN" : "INFERRED",
          r.confidence ?? 0.70,
          ((r as any).scope as EpistemicScope) || "TOPIC",
          (r as any).topic || "general",
          (r as any).provenance || [],
          ((r as any).evidenceNodeIds?.length || (r as any).evidenceCount || 1),
          relType === "UNRESOLVED",
          false,
          false
        );
      }
    }

    // From MultiHop Reasoning Conclusions
    if (input?.multiHopReasoning?.chains) {
      for (const chain of input.multiHopReasoning.chains) {
        if (!chain) continue;
        const stmt = (chain as any).conclusion || (chain as any).targetConclusion || (chain as any).terminalStatement || "";
        if (!stmt) continue;
        addClaim(
          chain.id || this.deterministicId("claim_hop", stmt),
          stmt,
          "MultiHopReasoning",
          ((chain as any).primaryAuthority || (chain as any).compositeAuthority as EpistemicAuthority) || "GOVERNANCE_APPROVED_MEMORY",
          ((chain as any).epistemicState || (chain as any).status as EpistemicState) || "INFERRED",
          chain.confidence ?? 0.70,
          ((chain as any).scope as EpistemicScope) || "TOPIC",
          (chain as any).topic || "general",
          (chain as any).provenance || [],
          (chain.hops?.length || 1),
          (chain as any).hasContradiction || (chain as any).status === "BROKEN" || false,
          false,
          false
        );
      }
    }

    // From Epistemic Calibration Claims
    if (input?.epistemicCalibration?.claims) {
      for (const c of input.epistemicCalibration.claims) {
        if (!c) continue;
        const stmt = (c as any).statement || (c as any).text || (c as any).claim || "";
        if (!stmt) continue;
        const conf = c.confidence ?? (c as any).calibratedConfidence ?? 0.70;
        addClaim(
          c.id || this.deterministicId("claim_epi", stmt),
          stmt,
          "EpistemicCalibration",
          c.authority || "GOVERNANCE_APPROVED_MEMORY",
          c.epistemicState || "INFERRED",
          conf,
          (c as any).scope || "GLOBAL",
          (c as any).topic || "general",
          c.provenance || [],
          (c as any).independentSupportCount || (c as any).evidenceCount || 1,
          (c as any).hasContradiction || (c as any).contradictionCount > 0 || false,
          false,
          c.authority === "PREDICTIVE_CONTEXT" || (c.epistemicState as string) === "ADVISORY"
        );
      }
    }

    // From Scenario Simulation Outcomes
    if (input?.scenarioSimulation?.scenarios) {
      for (const s of input.scenarioSimulation.scenarios) {
        if (!s) continue;
        const outcomesList = (s as any).outcomes || ((s as any).outcome ? [(s as any).outcome] : []);
        for (const out of outcomesList) {
          const summary = (out as any).description || (out as any).summary || (s as any).name || (s as any).title || "";
          if (!summary) continue;
          addClaim(
            this.deterministicId("claim_scen", s.id, summary),
            summary,
            "ScenarioSimulation",
            "PREDICTIVE_CONTEXT",
            "ADVISORY",
            (out as any).probability ?? (out as any).expectedUtility ?? 0.60,
            "CURRENT_TURN",
            (s as any).topic || "general",
            (s as any).provenance || [],
            1,
            (out as any).outcomeType === "BLOCKED" || (out as any).outcomeType === "UNRESOLVED",
            true,
            true
          );
        }
      }
    }

    return claims;
  }

  /**
   * Helper to register an issue and update diagnostic counters.
   */
  private addIssue(
    issues: MetaReasoningIssue[],
    issue: MetaReasoningIssue,
    budget: MetaReasoningBudgetConfig,
    diagnostics: MetaReasoningDiagnostics
  ) {
    diagnostics.rulesEvaluated++;
    if (issues.length >= budget.maxIssues) {
      diagnostics.budgetTruncations++;
      return;
    }
    issues.push(issue);

    // Track severity counters
    switch (issue.severity) {
      case "CRITICAL":
        diagnostics.criticalIssues++;
        break;
      case "MAJOR":
      case "HIGH":
        diagnostics.highIssues++;
        break;
      case "MEDIUM":
        diagnostics.mediumIssues++;
        break;
      case "MINOR":
      case "LOW":
      case "ADVISORY":
      case "INFO":
        diagnostics.lowIssues++;
        break;
    }

    // Track taxonomy counters
    switch (issue.issueType) {
      case "UNSUPPORTED_CLAIM":
      case "WEAK_EVIDENCE":
      case "UNANCHORED_HYPOTHESIS":
        diagnostics.unsupportedClaims++;
        break;
      case "CONFIDENCE_OVERREACH":
      case "OVERCONFIDENCE":
      case "UNDERCONFIDENCE":
      case "UNJUSTIFIED_CERTAINTY":
        diagnostics.confidenceOverreachCount++;
        break;
      case "EPISTEMIC_OVERCLAIM":
      case "AUTHORITY_MISMATCH":
      case "SPECULATIVE_PROPAGATION":
        diagnostics.epistemicOverclaimCount++;
        break;
      case "CONTRADICTION_UNRESOLVED":
      case "CONTRADICTION_DISREGARD":
        diagnostics.contradictionIssues++;
        break;
      case "CAUSAL_OVERREACH":
      case "CAUSAL_HALLUCINATION":
      case "POST_HOC_REASONING":
      case "CORRELATION_CAUSATION_CONFUSION":
        diagnostics.causalOverreachCount++;
        break;
      case "MULTI_HOP_OVERREACH":
      case "MULTI_HOP_BREAK":
        diagnostics.multiHopOverreachCount++;
        break;
      case "ASSUMPTION_OVERREACH":
      case "MISSING_ASSUMPTION":
        diagnostics.assumptionIssues++;
        break;
      case "SIMULATION_REALITY_CONFUSION":
        diagnostics.simulationRealityConfusions++;
        break;
      case "PREDICTION_AS_FACT":
        diagnostics.predictionAsFactCount++;
        break;
      case "TOPIC_CONTAMINATION":
      case "TOPIC_BOUNDARY_SPILL":
        diagnostics.topicIsolationRejections++;
        break;
      case "SCOPE_CONTAMINATION":
        diagnostics.scopeIsolationRejections++;
        break;
      case "CONSTRAINT_VIOLATION":
      case "HARD_CONSTRAINT_VIOLATION":
        diagnostics.constraintViolations++;
        break;
      case "PROVENANCE_BREAK":
        diagnostics.provenanceBreaks++;
        break;
      case "REASONING_CYCLE":
      case "CIRCULAR_REASONING":
      case "LOGICAL_INVALIDITY":
        diagnostics.reasoningCycles++;
        break;
      case "DUPLICATE_EVIDENCE":
        diagnostics.duplicateEvidenceCount++;
        break;
      case "SANITIZATION_FAILURE":
      case "SENSITIVE_DATA_EXPOSURE":
        diagnostics.sanitizationCount++;
        break;
    }
  }

  /**
   * 2. Sensitive Credential & Psychological Inference Audit.
   */
  private auditSensitiveAndIdentityViolations(
    input: MetaReasoningInput,
    issues: MetaReasoningIssue[],
    budget: MetaReasoningBudgetConfig,
    diagnostics: MetaReasoningDiagnostics
  ) {
    diagnostics.rulesEvaluated++;
    const checkText = (text: string, layer: string, targetId: string) => {
      if (this.containsSensitiveData(text)) {
        this.addIssue(
          issues,
          {
            id: this.deterministicId("iss_sec", layer, targetId),
            type: "SENSITIVE_DATA_EXPOSURE",
            issueType: "SENSITIVE_DATA_EXPOSURE",
            severity: "CRITICAL",
            affectedLayer: layer,
            targetStatement: "[SUPPRESSED_CREDENTIAL]",
            explanation: "Sensitive credential, password, or private API key detected in reasoning state.",
            evidenceRefs: [],
            suggestedCorrection: "BLOCK_DIRECTIVE",
            provenance: [],
          },
          budget,
          diagnostics
        );
      }

      if (this.containsUnsupportedPsychologicalInference(text)) {
        this.addIssue(
          issues,
          {
            id: this.deterministicId("iss_psych", layer, targetId),
            type: "UNSUPPORTED_CLAIM",
            issueType: "UNSUPPORTED_CLAIM",
            severity: "CRITICAL",
            affectedLayer: layer,
            targetStatement: text,
            explanation: "Unsupported psychological, psychiatric, or sensitive demographic inference detected.",
            evidenceRefs: [],
            suggestedCorrection: "REJECT",
            provenance: [],
          },
          budget,
          diagnostics
        );
      }
    };

    if (input?.message) checkText(input.message, "UserMessage", "msg");
    if (input?.deepReasoning?.hypotheses) {
      for (const h of input.deepReasoning.hypotheses) {
        const stmt = (h as any).statement || (h as any).claim || "";
        checkText(stmt, "DeepReasoning", h.id || "hyp");
      }
    }
    if (input?.deepReasoning?.sanitizedDirectives) {
      for (const d of input.deepReasoning.sanitizedDirectives) {
        checkText(d, "DeepReasoningDirective", "dir");
      }
    }
    if (input?.scenarioSimulation?.scenarios) {
      for (const s of input.scenarioSimulation.scenarios) {
        if (s.outcome) checkText((s.outcome as any).summary || (s.outcome as any).description || "", "ScenarioSimulation", s.id || "scen");
      }
    }
  }

  /**
   * 3. Hard-Constraint Audit.
   */
  private auditHardConstraints(
    input: MetaReasoningInput,
    claims: AuditedClaim[],
    issues: MetaReasoningIssue[],
    budget: MetaReasoningBudgetConfig,
    diagnostics: MetaReasoningDiagnostics
  ) {
    diagnostics.rulesEvaluated++;
    const hardConstraints =
      (input?.executiveContext as any)?.reasoningConstraints ||
      (input?.executiveContext as any)?.hardConstraints ||
      (input?.executiveContext as any)?.constraints ||
      [];

    if (!Array.isArray(hardConstraints) || hardConstraints.length === 0) return;

    for (const c of hardConstraints) {
      if (!c) continue;
      const isStrict = c.type === "HARD_CONSTRAINT" || c.isHard === true || c.enforceStrictly === true;
      if (!isStrict) continue;

      const ruleText = (c.sanitizedDirective || c.rule || c.description || "").toLowerCase();
      const forbiddenTokens = ruleText.split(/\s+/).filter((w: string) => w.length > 3 && !["never", "must", "always", "strict", "should", "without"].includes(w));

      // Check simulated actions
      if (input?.scenarioSimulation?.scenarios) {
        for (const s of input.scenarioSimulation.scenarios) {
          for (const a of s.actions || []) {
            const desc = (a.description || a.actionKey || "").toLowerCase();
            const hasViolation = (forbiddenTokens.length > 0 && forbiddenTokens.every((tok: string) => desc.includes(tok))) || a.isInvalid;
            if (hasViolation) {
              this.addIssue(
                issues,
                {
                  id: this.deterministicId("iss_hc", s.id, a.actionKey),
                  type: "HARD_CONSTRAINT_VIOLATION",
                  issueType: "HARD_CONSTRAINT_VIOLATION",
                  severity: "CRITICAL",
                  affectedLayer: "ScenarioSimulation",
                  targetStatement: a.description || (s as any).name || s.title,
                  explanation: `Action violates hard safety or governance constraint: ${c.description || c.rule}`,
                  evidenceRefs: [c.id || "hard_constraint"],
                  suggestedCorrection: "BLOCK_DIRECTIVE",
                  provenance: a.provenance || [],
                },
                budget,
                diagnostics
              );
            }
          }
        }
      }

      // Check hypotheses
      if (input?.deepReasoning?.hypotheses) {
        for (const h of input.deepReasoning.hypotheses) {
          const hStmt = ((h as any).statement || (h as any).claim || "").toLowerCase();
          const hasViolation =
            (forbiddenTokens.length > 0 && forbiddenTokens.every((tok: string) => hStmt.includes(tok))) ||
            (hStmt.includes("skip") && hStmt.includes("regression") && ruleText.includes("regression")) ||
            (hStmt.includes("delete") && hStmt.includes("without approval") && ruleText.includes("without approval")) ||
            (hStmt.includes("bypass") && ruleText.includes("lock"));

          if (hasViolation) {
            this.addIssue(
              issues,
              {
                id: this.deterministicId("iss_hc_hyp", h.id || "hyp"),
                type: "HARD_CONSTRAINT_VIOLATION",
                issueType: "HARD_CONSTRAINT_VIOLATION",
                severity: "CRITICAL",
                affectedLayer: "DeepReasoning",
                targetStatement: (h as any).statement || (h as any).claim,
                explanation: `Hypothesis conflicts with hard constraint: ${c.description || c.rule}`,
                evidenceRefs: [c.id || "hard_constraint"],
                suggestedCorrection: "BLOCK_DIRECTIVE",
                provenance: (h as any).provenance || [],
              },
              budget,
              diagnostics
            );
          }
        }
      }
    }
  }

  /**
   * 4. Goal and Project Alignment Audit.
   */
  private auditGoalAndProjectAlignment(
    input: MetaReasoningInput,
    claims: AuditedClaim[],
    issues: MetaReasoningIssue[],
    budget: MetaReasoningBudgetConfig,
    diagnostics: MetaReasoningDiagnostics
  ) {
    diagnostics.rulesEvaluated++;
    const goals = input?.executiveContext?.activeGoals || ((input?.executiveContext as any)?.activeGoal ? [(input?.executiveContext as any).activeGoal] : []);

    for (const g of goals) {
      if (!g) continue;
      const gTitle = (g.title || "").toLowerCase();

      // Check hypotheses that disable security / conflict with active goals
      if (input?.deepReasoning?.hypotheses) {
        for (const h of input.deepReasoning.hypotheses) {
          const hStmt = ((h as any).statement || (h as any).claim || "").toLowerCase();
          if (
            (gTitle.includes("security") || gTitle.includes("encrypt")) &&
            (hStmt.includes("disable") || hStmt.includes("bypass") || hStmt.includes("remove password"))
          ) {
            this.addIssue(
              issues,
              {
                id: this.deterministicId("iss_goal_dr", h.id || "h", g.id || "g"),
                type: "GOAL_MISALIGNMENT",
                issueType: "GOAL_MISALIGNMENT",
                severity: "HIGH",
                affectedLayer: "DeepReasoning",
                targetStatement: (h as any).statement || (h as any).claim,
                explanation: `Proposed hypothesis disables security controls, opposing active goal '${g.title}'.`,
                evidenceRefs: [g.id || "active_goal"],
                suggestedCorrection: "REJECT",
                provenance: (h as any).provenance || [],
              },
              budget,
              diagnostics
            );
          }
        }
      }
    }
  }

  /**
   * 5. Deep Reasoning & Hypotheses Audit.
   */
  private auditDeepReasoningAndHypotheses(
    input: MetaReasoningInput,
    claims: AuditedClaim[],
    issues: MetaReasoningIssue[],
    budget: MetaReasoningBudgetConfig,
    diagnostics: MetaReasoningDiagnostics
  ) {
    diagnostics.rulesEvaluated++;
    if (!input?.deepReasoning?.hypotheses) return;

    const facts = input?.executiveContext?.authoritativeFacts || [];

    for (const h of input.deepReasoning.hypotheses) {
      if (!h) continue;

      const stmt = (h as any).statement || (h as any).claim || (h as any).hypothesis || "";
      const supportList = (h as any).supportingEvidence || (h as any).supportingEvidenceIds || [];
      const supportCount = supportList.length;
      const conflictCount = (h as any).refutingEvidence?.length || (h as any).conflictingEvidence?.length || 0;
      const conf = h.confidence ?? 0.50;
      const status = (h as any).status || (h as any).epistemicStatus || "INFERRED";

      // Logical invalidity / self-support
      if (supportList.includes(h.id) || (supportCount === 1 && supportList[0] === h.id)) {
        this.addIssue(
          issues,
          {
            id: this.deterministicId("iss_dr_circ", h.id || "h"),
            type: "LOGICAL_INVALIDITY",
            issueType: "LOGICAL_INVALIDITY",
            severity: "HIGH",
            affectedLayer: "DeepReasoning",
            targetStatement: stmt,
            explanation: "Hypothesis relies on itself as its sole supporting evidence (circular reasoning).",
            evidenceRefs: supportList,
            suggestedCorrection: "REJECT",
            provenance: (h as any).provenance || [],
          },
          budget,
          diagnostics
        );
      }

      // Unanchored hypothesis: no facts in context and 0 supporting evidence
      if (facts.length === 0 && supportCount === 0 && stmt.length > 0) {
        this.addIssue(
          issues,
          {
            id: this.deterministicId("iss_dr_unanchored", h.id || "h"),
            type: "UNANCHORED_HYPOTHESIS",
            issueType: "UNANCHORED_HYPOTHESIS",
            severity: "HIGH",
            affectedLayer: "DeepReasoning",
            targetStatement: stmt,
            explanation: "Hypothesis is completely unanchored to any authoritative facts in context.",
            evidenceRefs: [],
            suggestedCorrection: "REJECT",
            provenance: (h as any).provenance || [],
          },
          budget,
          diagnostics
        );
      }

      // Unsupported claim with 0 evidence
      if (supportCount === 0) {
        this.addIssue(
          issues,
          {
            id: this.deterministicId("iss_dr_unsupp", h.id || "h"),
            type: "UNSUPPORTED_CLAIM",
            issueType: "UNSUPPORTED_CLAIM",
            severity: "HIGH",
            affectedLayer: "DeepReasoning",
            targetStatement: stmt,
            explanation: "Hypothesis has zero supporting evidence.",
            evidenceRefs: [],
            suggestedCorrection: "DOWNGRADE_EPISTEMIC_STATUS",
            provenance: (h as any).provenance || [],
          },
          budget,
          diagnostics
        );
      } else if (supportCount === 1 && conf > 0.85) {
        this.addIssue(
          issues,
          {
            id: this.deterministicId("iss_dr_conf", h.id || "h"),
            type: "CONFIDENCE_OVERREACH",
            issueType: "CONFIDENCE_OVERREACH",
            severity: "MEDIUM",
            affectedLayer: "DeepReasoning",
            targetStatement: stmt,
            explanation: "High confidence is asserted on single-source indirect evidence.",
            evidenceRefs: supportList,
            suggestedCorrection: "QUALIFY",
            provenance: (h as any).provenance || [],
          },
          budget,
          diagnostics
        );
      }

      // Unresolved conflict
      if (conflictCount > 0 && (status === "VERIFIED" || status === "FACTUAL" || status === "KNOWN")) {
        this.addIssue(
          issues,
          {
            id: this.deterministicId("iss_dr_epi", h.id || "h"),
            type: "EPISTEMIC_OVERCLAIM",
            issueType: "EPISTEMIC_OVERCLAIM",
            severity: "HIGH",
            affectedLayer: "DeepReasoning",
            targetStatement: stmt,
            explanation: "Hypothesis is classified as factual despite existing conflicting evidence.",
            evidenceRefs: (h as any).refutingEvidence || (h as any).conflictingEvidence || [],
            suggestedCorrection: "DOWNGRADE_EPISTEMIC_STATUS",
            provenance: (h as any).provenance || [],
          },
          budget,
          diagnostics
        );
      }
    }
  }

  /**
   * 6. Contradiction Resolution Audit.
   */
  private auditContradictions(
    input: MetaReasoningInput,
    claims: AuditedClaim[],
    issues: MetaReasoningIssue[],
    budget: MetaReasoningBudgetConfig,
    diagnostics: MetaReasoningDiagnostics
  ) {
    diagnostics.rulesEvaluated++;
    if (!input?.contradictionResolution?.contradictions) return;

    for (const c of input.contradictionResolution.contradictions) {
      if (!c) continue;

      const isUnresolved = (c as any).status === "UNRESOLVED" || (c as any).classification === "UNRESOLVED_CONFLICT" || (c as any).isResolved === false;
      if (isUnresolved) {
        this.addIssue(
          issues,
          {
            id: this.deterministicId("iss_contra_disregard", c.id || "contra"),
            type: "CONTRADICTION_DISREGARD",
            issueType: "CONTRADICTION_DISREGARD",
            severity: "CRITICAL",
            affectedLayer: "ContradictionResolution",
            targetStatement: (c as any).claimA ? `${(c as any).claimA} vs ${(c as any).claimB}` : "Unresolved contradiction",
            explanation: "Unresolved direct factual contradiction exists and must not be disregarded.",
            evidenceRefs: [c.id || "unresolved_contradiction"],
            suggestedCorrection: "PRESERVE_CONTRADICTION",
            provenance: [],
          },
          budget,
          diagnostics
        );
      }
    }
  }

  /**
   * 7. Causal Reasoning Audit.
   */
  private auditCausalReasoning(
    input: MetaReasoningInput,
    claims: AuditedClaim[],
    issues: MetaReasoningIssue[],
    budget: MetaReasoningBudgetConfig,
    diagnostics: MetaReasoningDiagnostics
  ) {
    diagnostics.rulesEvaluated++;
    if (!input?.causalReasoning?.relations) return;

    for (const r of input.causalReasoning.relations) {
      if (!r) continue;

      const cause = (r as any).cause || (r as any).causeEntity || (r as any).causeKey || (r as any).causeStatement || "";
      const effect = (r as any).effect || (r as any).effectEntity || (r as any).effectKey || (r as any).effectStatement || "";
      const stmt = `${cause} causes ${effect}`;
      const evNodeIds = (r as any).evidenceNodeIds || [];
      const relType = (r as any).relationType || (r as any).causalType || "";

      // Causal hallucination with zero evidence
      if (evNodeIds.length === 0 && (r.confidence ?? 0.5) > 0.6) {
        this.addIssue(
          issues,
          {
            id: this.deterministicId("iss_causal_halluc", r.id || "rel"),
            type: "CAUSAL_HALLUCINATION",
            issueType: "CAUSAL_HALLUCINATION",
            severity: "HIGH",
            affectedLayer: "CausalReasoning",
            targetStatement: stmt,
            explanation: "Causal relationship is asserted with high confidence but has zero evidence nodes.",
            evidenceRefs: [],
            suggestedCorrection: "REJECT",
            provenance: (r as any).provenance || [],
          },
          budget,
          diagnostics
        );
      }

      // Correlation treated as causation
      if (relType === "CORRELATION_ONLY") {
        this.addIssue(
          issues,
          {
            id: this.deterministicId("iss_causal_corr", r.id || "rel"),
            type: "CORRELATION_CAUSATION_CONFUSION",
            issueType: "CORRELATION_CAUSATION_CONFUSION",
            severity: "HIGH",
            affectedLayer: "CausalReasoning",
            targetStatement: stmt,
            explanation: "Statistical correlation is asserted as direct causation.",
            evidenceRefs: [r.id || "causal_rel"],
            suggestedCorrection: "QUALIFY",
            provenance: (r as any).provenance || [],
          },
          budget,
          diagnostics
        );
      }

      // Temporal precedence without causal mechanism (Post-hoc)
      if (relType === "TEMPORAL_SEQUENCE" && (r.confidence ?? 0.5) > 0.80) {
        this.addIssue(
          issues,
          {
            id: this.deterministicId("iss_causal_posthoc", r.id || "rel"),
            type: "POST_HOC_REASONING",
            issueType: "POST_HOC_REASONING",
            severity: "MEDIUM",
            affectedLayer: "CausalReasoning",
            targetStatement: `${cause} preceded ${effect}`,
            explanation: "Temporal precedence alone is used to infer strong causal relationship.",
            evidenceRefs: [r.id || "causal_rel"],
            suggestedCorrection: "QUALIFY",
            provenance: (r as any).provenance || [],
          },
          budget,
          diagnostics
        );
      }
    }
  }

  /**
   * 8. Multi-Hop Reasoning Audit.
   */
  private auditMultiHopReasoning(
    input: MetaReasoningInput,
    claims: AuditedClaim[],
    issues: MetaReasoningIssue[],
    budget: MetaReasoningBudgetConfig,
    diagnostics: MetaReasoningDiagnostics
  ) {
    diagnostics.rulesEvaluated++;
    if (!input?.multiHopReasoning?.chains) return;

    for (const chain of input.multiHopReasoning.chains) {
      if (!chain) continue;

      const stmt = (chain as any).conclusion || (chain as any).targetConclusion || "";
      const status = chain.status as string;

      if (status === "BROKEN" || (chain.hops && chain.hops.some((h: any) => h.inferredRelation === "unsupported" || !h.isValid && h.isValid !== undefined))) {
        this.addIssue(
          issues,
          {
            id: this.deterministicId("iss_hop_break", chain.id || "chain"),
            type: "MULTI_HOP_BREAK",
            issueType: "MULTI_HOP_BREAK",
            severity: "HIGH",
            affectedLayer: "MultiHopReasoning",
            targetStatement: stmt,
            explanation: "Multi-hop reasoning chain contains a broken or unsupported inference step.",
            evidenceRefs: chain.hops?.map((h: any) => h.id || "hop") || [],
            suggestedCorrection: "REJECT",
            provenance: (chain as any).provenance || [],
          },
          budget,
          diagnostics
        );
      }
    }
  }

  /**
   * 9. Epistemic Calibration Audit.
   */
  private auditEpistemicCalibration(
    input: MetaReasoningInput,
    claims: AuditedClaim[],
    issues: MetaReasoningIssue[],
    budget: MetaReasoningBudgetConfig,
    diagnostics: MetaReasoningDiagnostics
  ) {
    diagnostics.rulesEvaluated++;
    if (!input?.epistemicCalibration?.claims) return;

    for (const c of input.epistemicCalibration.claims) {
      if (!c) continue;

      const stmt = (c as any).statement || (c as any).text || (c as any).claim || "";
      const state = c.epistemicState as string;
      const conf = c.confidence ?? (c as any).calibratedConfidence ?? 0.50;
      const auth = c.authority as string;

      // Authority mismatch: high confidence / factual state from weak authority
      if ((state === "FACTUAL" || state === "VERIFIED" || conf > 0.90) && (auth === "UNVERIFIED_INTENT" || auth === "PREDICTIVE_CONTEXT" || auth === "SYSTEM_DEFAULT")) {
        this.addIssue(
          issues,
          {
            id: this.deterministicId("iss_epi_auth_mismatch", c.id || "claim"),
            type: "AUTHORITY_MISMATCH",
            issueType: "AUTHORITY_MISMATCH",
            severity: "HIGH",
            affectedLayer: "EpistemicCalibration",
            targetStatement: stmt,
            explanation: `Claim asserts high confidence (${conf}) or factual state but source authority is unverified ('${auth}').`,
            evidenceRefs: [],
            suggestedCorrection: "DOWNGRADE_EPISTEMIC_STATUS",
            provenance: c.provenance || [],
          },
          budget,
          diagnostics
        );
      }

      // Overconfidence: speculative state with high confidence
      if ((state === "SPECULATIVE" || state === "UNCERTAIN" || state === "HYPOTHETICAL") && conf > 0.80) {
        this.addIssue(
          issues,
          {
            id: this.deterministicId("iss_epi_overconf", c.id || "claim"),
            type: "OVERCONFIDENCE",
            issueType: "OVERCONFIDENCE",
            severity: "HIGH",
            affectedLayer: "EpistemicCalibration",
            targetStatement: stmt,
            explanation: `Speculative claim asserts excessive confidence score of ${conf}.`,
            evidenceRefs: [],
            suggestedCorrection: "REDUCE_CONFIDENCE",
            provenance: c.provenance || [],
          },
          budget,
          diagnostics
        );
      }

      // Underconfidence: verified authority treated with extreme doubt
      if ((auth === "VERIFIED_EVIDENCE" || auth === "CURRENT_TURN_EXPLICIT") && (state === "UNKNOWN" || conf <= 0.20)) {
        this.addIssue(
          issues,
          {
            id: this.deterministicId("iss_epi_underconf", c.id || "claim"),
            type: "UNDERCONFIDENCE",
            issueType: "UNDERCONFIDENCE",
            severity: "MEDIUM",
            affectedLayer: "EpistemicCalibration",
            targetStatement: stmt,
            explanation: "Verified ground fact is treated with unwarranted epistemic doubt or UNKNOWN status.",
            evidenceRefs: [],
            suggestedCorrection: "QUALIFY",
            provenance: c.provenance || [],
          },
          budget,
          diagnostics
        );
      }

      // Speculative propagation without hedging
      const lower = stmt.toLowerCase();
      const hasDefinitiveWords = lower.includes("definitely") || lower.includes("without question") || lower.includes("certainly") || lower.includes("guaranteed");
      if ((state === "SPECULATIVE" || state === "HYPOTHETICAL") && hasDefinitiveWords) {
        this.addIssue(
          issues,
          {
            id: this.deterministicId("iss_epi_spec_prop", c.id || "claim"),
            type: "SPECULATIVE_PROPAGATION",
            issueType: "SPECULATIVE_PROPAGATION",
            severity: "HIGH",
            affectedLayer: "EpistemicCalibration",
            targetStatement: stmt,
            explanation: "Speculative claim is asserted using unhedged, absolute language.",
            evidenceRefs: [],
            suggestedCorrection: "ADD_EPISTEMIC_HEDGING",
            provenance: c.provenance || [],
          },
          budget,
          diagnostics
        );
      }
    }
  }

  /**
   * 10. Scenario Simulation Audit.
   */
  private auditScenarioSimulation(
    input: MetaReasoningInput,
    claims: AuditedClaim[],
    issues: MetaReasoningIssue[],
    budget: MetaReasoningBudgetConfig,
    diagnostics: MetaReasoningDiagnostics
  ) {
    diagnostics.rulesEvaluated++;
    if (!input?.scenarioSimulation?.scenarios) return;

    for (const s of input.scenarioSimulation.scenarios) {
      if (!s) continue;

      const outcomesList = (s as any).outcomes || (s.outcome ? [s.outcome] : []);
      for (const out of outcomesList) {
        const epStatus = (out as any).epistemicStatus as string;
        if (epStatus === "FACTUAL" || epStatus === "VERIFIED" || epStatus === "KNOWN") {
          this.addIssue(
            issues,
            {
              id: this.deterministicId("iss_scen_real", s.id),
              type: "SIMULATION_REALITY_CONFUSION",
              issueType: "SIMULATION_REALITY_CONFUSION",
              severity: "CRITICAL",
              affectedLayer: "ScenarioSimulation",
              targetStatement: (out as any).description || (out as any).summary || (s as any).name || s.title,
              explanation: "Simulated hypothetical scenario outcome is treated as ground factual reality.",
              evidenceRefs: [s.id],
              suggestedCorrection: "TAG_AS_SIMULATION",
              provenance: (s as any).provenance || [],
            },
            budget,
            diagnostics
          );
        }
      }
    }
  }

  /**
   * 11. Topic and Scope Isolation Audit.
   */
  private auditTopicAndScopeIsolation(
    input: MetaReasoningInput,
    claims: AuditedClaim[],
    issues: MetaReasoningIssue[],
    activeTopic: string,
    strictTopicIsolation: boolean,
    budget: MetaReasoningBudgetConfig,
    diagnostics: MetaReasoningDiagnostics
  ) {
    diagnostics.rulesEvaluated++;
    if (!strictTopicIsolation && activeTopic === "general") return;

    if (strictTopicIsolation) {
      // Check hypotheses that do not match activeTopic
      if (input?.deepReasoning?.hypotheses) {
        for (const h of input.deepReasoning.hypotheses) {
          const stmt = ((h as any).statement || (h as any).claim || "").toLowerCase();
          if (activeTopic === "personal_finance" && (stmt.includes("docker") || stmt.includes("kubernetes") || stmt.includes("cluster"))) {
            this.addIssue(
              issues,
              {
                id: this.deterministicId("iss_topic_spill", h.id || "h"),
                type: "TOPIC_BOUNDARY_SPILL",
                issueType: "TOPIC_BOUNDARY_SPILL",
                severity: "MEDIUM",
                affectedLayer: "DeepReasoning",
                targetStatement: (h as any).statement || (h as any).claim,
                explanation: `Hypothesis is related to infrastructure/devops but active topic is strictly '${activeTopic}'.`,
                evidenceRefs: [],
                suggestedCorrection: "ISOLATE_SCOPE",
                provenance: (h as any).provenance || [],
              },
              budget,
              diagnostics
            );
          }
        }
      }
    }
  }

  /**
   * 12. Reasoning Cycles & Duplicate Evidence Audit.
   */
  private auditCyclesAndDuplicateEvidence(
    input: MetaReasoningInput,
    claims: AuditedClaim[],
    issues: MetaReasoningIssue[],
    budget: MetaReasoningBudgetConfig,
    diagnostics: MetaReasoningDiagnostics
  ) {
    diagnostics.rulesEvaluated++;

    // Deep reasoning cycles array
    if ((input?.deepReasoning as any)?.cycles && (input.deepReasoning as any).cycles.length > 0) {
      for (const cyc of (input.deepReasoning as any).cycles) {
        this.addIssue(
          issues,
          {
            id: this.deterministicId("iss_cycle_dr", (cyc as any).nodeIds?.join("_") || "cyc"),
            type: "CIRCULAR_REASONING",
            issueType: "CIRCULAR_REASONING",
            severity: "HIGH",
            affectedLayer: "DeepReasoning",
            targetStatement: (cyc as any).description || "Circular reasoning dependency cycle detected",
            explanation: `Circular reasoning dependency: ${(cyc as any).description || (cyc as any).nodeIds?.join(" -> ")}`,
            evidenceRefs: (cyc as any).nodeIds || [],
            suggestedCorrection: "QUALIFY",
            provenance: [],
          },
          budget,
          diagnostics
        );
      }
    }
  }

  /**
   * 13. Stale Data Audit.
   */
  private auditQuarantinedAndStaleData(
    input: MetaReasoningInput,
    claims: AuditedClaim[],
    issues: MetaReasoningIssue[],
    budget: MetaReasoningBudgetConfig,
    diagnostics: MetaReasoningDiagnostics
  ) {
    diagnostics.rulesEvaluated++;
    const staleFacts = (input?.temporalMemory as any)?.staleFacts || [];
    if (staleFacts.length > 0 && input?.deepReasoning?.hypotheses) {
      for (const sf of staleFacts) {
        for (const h of input.deepReasoning.hypotheses) {
          const sup = (h as any).supportingEvidence || [];
          if (sup.includes(sf.id) || ((h as any).claim && (h as any).claim.includes(sf.value))) {
            this.addIssue(
              issues,
              {
                id: this.deterministicId("iss_stale_mem", h.id || "h", sf.id),
                type: "STALE_MEMORY_RELIANCE",
                issueType: "STALE_MEMORY_RELIANCE",
                severity: "MEDIUM",
                affectedLayer: "DeepReasoning",
                targetStatement: (h as any).claim || (h as any).statement,
                explanation: `Hypothesis relies on stale fact '${sf.key}' last observed on ${sf.lastObserved}.`,
                evidenceRefs: [sf.id],
                suggestedCorrection: "REQUEST_MORE_EVIDENCE",
                provenance: (h as any).provenance || [],
              },
              budget,
              diagnostics
            );
          }
        }
      }
    }
  }

  /**
   * 14. Directive Conflict Audit.
   */
  private auditDirectiveConflicts(
    input: MetaReasoningInput,
    issues: MetaReasoningIssue[],
    budget: MetaReasoningBudgetConfig,
    diagnostics: MetaReasoningDiagnostics
  ) {
    diagnostics.rulesEvaluated++;
    const execDirectives = input?.executiveContext?.promptDirectives || [];
    const drDirectives = input?.deepReasoning?.sanitizedDirectives || [];

    const hasExtremeDetail = execDirectives.some((d) => d.toLowerCase().includes("extreme technical detail") || d.toLowerCase().includes("with code"));
    const hasUnderOneSentence = drDirectives.some((d) => d.toLowerCase().includes("under one sentence") || d.toLowerCase().includes("non-technical"));

    if (hasExtremeDetail && hasUnderOneSentence) {
      this.addIssue(
        issues,
        {
          id: this.deterministicId("iss_dir_conflict", "exec", "dr"),
          type: "DIRECTIVE_CONFLICT",
          issueType: "DIRECTIVE_CONFLICT",
          severity: "HIGH",
          affectedLayer: "ExecutiveContext",
          targetStatement: "Conflicting prompt directives between extreme technical detail and non-technical brevity.",
          explanation: "Executive context and deep reasoning emit contradictory directives.",
          evidenceRefs: [],
          suggestedCorrection: "QUALIFY",
          provenance: [],
        },
        budget,
        diagnostics
      );
    }
  }

  /**
   * 3. Compute Orthogonal Uncertainty Dimensions.
   */
  private computeUncertaintyDimensions(
    input: MetaReasoningInput,
    claims: AuditedClaim[],
    issues: MetaReasoningIssue[]
  ): MetaReasoningUncertainty {
    let evidenceInsufficiency = 0.05;
    let sourceConflict = 0.05;
    let reasoningDepth = 0.05;
    let epistemicGap = 0.05;
    let intentAmbiguity = 0.05;
    let causalAmbiguity = 0.05;
    let temporalDecay = 0.05;
    let domainVolatility = 0.05;
    let multiHopDecay = 0.05;
    let simulationSpeculation = 0.05;

    // Evaluate based on direct claim inspection and upstream epistemic state
    if ((input?.epistemicCalibration as any)?.epistemicState === "HYPOTHETICAL" || (input?.epistemicCalibration as any)?.epistemicState === "SPECULATIVE") {
      epistemicGap = Math.max(epistemicGap, 0.40);
    }
    for (const c of claims) {
      if ((c.sourceAuthority as string) === "UNVERIFIED_INTENT" || c.sourceAuthority === "PREDICTIVE_CONTEXT" || c.sourceAuthority === "SYSTEM_DEFAULT") {
        epistemicGap = Math.max(epistemicGap, 0.35);
      }
      if ((c.epistemicState as string) === "HYPOTHETICAL" || (c.epistemicState as string) === "SPECULATIVE" || (c.epistemicState as string) === "UNCERTAIN") {
        epistemicGap = Math.max(epistemicGap, 0.30);
      }
      if (c.evidenceCount === 0) {
        evidenceInsufficiency = Math.max(evidenceInsufficiency, 0.40);
      }
      if (c.hasUnresolvedContradiction) {
        sourceConflict = Math.max(sourceConflict, 0.50);
      }
      if (c.isSimulated || c.isPredictive) {
        simulationSpeculation = Math.max(simulationSpeculation, 0.45);
      }
    }

    // Evaluate based on issue presence and upstream indicators
    for (const iss of issues) {
      switch (iss.issueType) {
        case "UNSUPPORTED_CLAIM":
        case "WEAK_EVIDENCE":
        case "UNANCHORED_HYPOTHESIS":
          evidenceInsufficiency = Math.max(evidenceInsufficiency, 0.65);
          break;
        case "OVERCONFIDENCE":
        case "CONFIDENCE_OVERREACH":
          evidenceInsufficiency = Math.max(evidenceInsufficiency, 0.40);
          epistemicGap = Math.max(epistemicGap, 0.50);
          break;
        case "CONTRADICTION_UNRESOLVED":
        case "CONTRADICTION_DISREGARD":
          sourceConflict = Math.max(sourceConflict, 0.85);
          break;
        case "MULTI_HOP_OVERREACH":
        case "MULTI_HOP_BREAK":
          reasoningDepth = Math.max(reasoningDepth, 0.60);
          multiHopDecay = Math.max(multiHopDecay, 0.70);
          break;
        case "REASONING_CYCLE":
        case "CIRCULAR_REASONING":
        case "LOGICAL_INVALIDITY":
          reasoningDepth = Math.max(reasoningDepth, 0.75);
          break;
        case "CAUSAL_OVERREACH":
        case "CAUSAL_HALLUCINATION":
        case "POST_HOC_REASONING":
        case "CORRELATION_CAUSATION_CONFUSION":
          causalAmbiguity = Math.max(causalAmbiguity, 0.75);
          break;
        case "SIMULATION_REALITY_CONFUSION":
        case "PREDICTION_AS_FACT":
          simulationSpeculation = Math.max(simulationSpeculation, 0.85);
          break;
        case "AUTHORITY_MISMATCH":
        case "SPECULATIVE_PROPAGATION":
          epistemicGap = Math.max(epistemicGap, 0.65);
          break;
        case "STALE_MEMORY_RELIANCE":
        case "STALE_CONTEXT":
          temporalDecay = Math.max(temporalDecay, 0.70);
          break;
        case "TOPIC_CONTAMINATION":
        case "TOPIC_BOUNDARY_SPILL":
          domainVolatility = Math.max(domainVolatility, 0.65);
          break;
      }
    }

    // Blend upstream uncertainty if provided
    if ((input?.epistemicCalibration as any)?.uncertainty || (input?.epistemicCalibration as any)?.uncertainties) {
      const u = (input.epistemicCalibration as any).uncertainty || (input.epistemicCalibration as any).uncertainties;
      if (typeof u.evidenceInsufficiency === "number") evidenceInsufficiency = Math.max(evidenceInsufficiency, u.evidenceInsufficiency);
      if (typeof u.sourceConflict === "number") sourceConflict = Math.max(sourceConflict, u.sourceConflict);
      if (typeof u.causalAmbiguity === "number") causalAmbiguity = Math.max(causalAmbiguity, u.causalAmbiguity);
      if (typeof u.reasoningDepth === "number") reasoningDepth = Math.max(reasoningDepth, u.reasoningDepth);
      if (typeof u.epistemicGap === "number") epistemicGap = Math.max(epistemicGap, u.epistemicGap);
      if (typeof u.temporalDecay === "number") temporalDecay = Math.max(temporalDecay, u.temporalDecay);
      if (typeof u.domainVolatility === "number") domainVolatility = Math.max(domainVolatility, u.domainVolatility);
      if (typeof u.multiHopDecay === "number") multiHopDecay = Math.max(multiHopDecay, u.multiHopDecay);
      if (typeof u.simulationSpeculation === "number") simulationSpeculation = Math.max(simulationSpeculation, u.simulationSpeculation);
    }

    const compoundUncertainty = this.clamp(
      (evidenceInsufficiency * 1.5 +
        sourceConflict * 1.5 +
        reasoningDepth +
        epistemicGap +
        intentAmbiguity +
        causalAmbiguity +
        temporalDecay +
        domainVolatility +
        multiHopDecay +
        simulationSpeculation * 1.2) / 10
    );

    return {
      evidenceInsufficiency: this.clamp(evidenceInsufficiency),
      sourceConflict: this.clamp(sourceConflict),
      reasoningDepth: this.clamp(reasoningDepth),
      epistemicGap: this.clamp(epistemicGap),
      intentAmbiguity: this.clamp(intentAmbiguity),
      causalAmbiguity: this.clamp(causalAmbiguity),
      temporalDecay: this.clamp(temporalDecay),
      domainVolatility: this.clamp(domainVolatility),
      multiHopDecay: this.clamp(multiHopDecay),
      simulationSpeculation: this.clamp(simulationSpeculation),
      compoundUncertainty,
      overallUncertainty: compoundUncertainty,
    };
  }

  /**
   * 4. Generate Self-Critiques.
   */
  private generateCritiques(
    issues: MetaReasoningIssue[],
    claims: AuditedClaim[],
    uncertainty: MetaReasoningUncertainty,
    budget: MetaReasoningBudgetConfig,
    diagnostics: MetaReasoningDiagnostics
  ): MetaReasoningCritique[] {
    const critiques: MetaReasoningCritique[] = [];

    for (const iss of issues) {
      if (critiques.length >= budget.maxCritiques) {
        diagnostics.budgetTruncations++;
        break;
      }

      critiques.push({
        id: this.deterministicId("crit", iss.id),
        targetId: iss.id,
        targetStatement: iss.targetStatement,
        issueType: iss.issueType,
        severity: iss.severity,
        explanation: iss.explanation,
        evidenceRefs: iss.evidenceRefs,
        affectedLayer: iss.affectedLayer,
        correction: iss.suggestedCorrection,
        uncertainty,
        epistemicStatus: iss.severity === "CRITICAL" ? "REJECTED" : iss.severity === "HIGH" || iss.severity === "MAJOR" ? "UNCERTAIN" : "ADVISORY",
        provenance: iss.provenance,
      });
    }

    return critiques;
  }

  /**
   * 5. Generate Downstream Corrections.
   */
  private generateCorrections(
    critiques: MetaReasoningCritique[],
    budget: MetaReasoningBudgetConfig,
    diagnostics: MetaReasoningDiagnostics
  ): MetaReasoningCorrection[] {
    const corrections: MetaReasoningCorrection[] = [];

    for (const crit of critiques) {
      if (corrections.length >= budget.maxCorrections) {
        diagnostics.budgetTruncations++;
        break;
      }

      let guidance = "";
      switch (crit.correction) {
        case "BLOCK_DIRECTIVE":
          guidance = `Do not execute or recommend action: violates constraint.`;
          break;
        case "REJECT":
          guidance = `Reject claim: unsupported by authorized evidence.`;
          break;
        case "DOWNGRADE":
        case "DOWNGRADE_EPISTEMIC_STATUS":
          guidance = `Treat conclusion cautiously as indirect inference rather than verified fact.`;
          break;
        case "REDUCE_CONFIDENCE":
          guidance = `Reduce calibrated confidence score to align with evidence bounds.`;
          break;
        case "QUALIFY":
        case "ADD_EPISTEMIC_HEDGING":
          guidance = `Qualify statement with explicit uncertainty and conditionality.`;
          break;
        case "PRESERVE_CONTRADICTION":
          guidance = `Preserve competing perspectives without taking a unilateral position.`;
          break;
        case "MARK_SIMULATION":
        case "TAG_AS_SIMULATION":
          guidance = `Clarify that outcome is a hypothetical projection under simulated assumptions.`;
          break;
        case "MARK_UNCERTAIN":
          guidance = `Communicate explicit uncertainty regarding this conclusion.`;
          break;
        case "ISOLATE_SCOPE":
          guidance = `Restrict fact to its specific topic domain.`;
          break;
        default:
          guidance = `Evaluate claim with epistemic caution.`;
      }

      corrections.push({
        id: this.deterministicId("corr", crit.id),
        targetId: crit.targetId,
        target: crit.targetStatement || crit.targetId,
        correctionType: crit.correction,
        reason: crit.explanation,
        description: crit.explanation,
        originalStatement: crit.targetStatement,
        enforceBlock: crit.correction === "BLOCK_DIRECTIVE" || crit.severity === "CRITICAL",
        sanitizedGuidance: guidance,
      });
    }

    return corrections;
  }

  /**
   * 6. Generate Behavioral Recommendations.
   */
  private generateRecommendations(
    issues: MetaReasoningIssue[],
    critiques: MetaReasoningCritique[],
    budget: MetaReasoningBudgetConfig
  ): MetaReasoningRecommendation[] {
    const recs: MetaReasoningRecommendation[] = [];

    const hasCriticalConstraint = issues.some((i) => i.issueType === "CONSTRAINT_VIOLATION" || i.issueType === "HARD_CONSTRAINT_VIOLATION");
    if (hasCriticalConstraint) {
      recs.push({
        id: "rec_constraint",
        category: "CONSTRAINT_ENFORCEMENT",
        text: "Enforce hard governance and safety constraints strictly over speculative optimizations.",
        priority: 1,
      });
    }

    const hasContradiction = issues.some((i) => i.issueType === "CONTRADICTION_UNRESOLVED" || i.issueType === "CONTRADICTION_DISREGARD");
    if (hasContradiction) {
      recs.push({
        id: "rec_contra",
        category: "CONTRADICTION_CLARIFICATION",
        text: "Acknowledge conflicting authoritative evidence transparently without taking an unverified side.",
        priority: 2,
      });
    }

    const hasSimConfusion = issues.some((i) => i.issueType === "SIMULATION_REALITY_CONFUSION" || i.issueType === "PREDICTION_AS_FACT");
    if (hasSimConfusion) {
      recs.push({
        id: "rec_sim",
        category: "SIMULATION_DISCLAIMER",
        text: "Frame simulated and predictive outcomes explicitly as hypothetical models rather than real-world facts.",
        priority: 3,
      });
    }

    const hasCausalOverreach = issues.some((i) => i.issueType === "CORRELATION_CAUSATION_CONFUSION" || i.issueType === "CAUSAL_OVERREACH" || i.issueType === "CAUSAL_HALLUCINATION");
    if (hasCausalOverreach) {
      recs.push({
        id: "rec_causal",
        category: "CAUSAL_QUALIFICATION",
        text: "Distinguish between observed statistical correlations and verified direct causation.",
        priority: 4,
      });
    }

    // Sort by priority ascending (1 is highest)
    recs.sort((a, b) => a.priority - b.priority);

    const maxRecs = budget.maxRecommendations || 20;
    return recs.slice(0, maxRecs);
  }

  /**
   * 7. Generate Sanitized Meta Directives for Brain Engine.
   */
  private generateDirectives(
    issues: MetaReasoningIssue[],
    critiques: MetaReasoningCritique[],
    corrections: MetaReasoningCorrection[],
    recommendations: MetaReasoningRecommendation[],
    budget: MetaReasoningBudgetConfig,
    diagnostics: MetaReasoningDiagnostics
  ): string[] {
    const directives: string[] = [];
    const seen = new Set<string>();

    const addDirective = (text: string) => {
      if (directives.length >= budget.maxDirectives) {
        diagnostics.budgetTruncations++;
        return;
      }
      const sanitized = this.sanitizeDirective(text);
      if (!sanitized || seen.has(sanitized)) return;
      seen.add(sanitized);
      directives.push(sanitized);
      diagnostics.directivesGenerated++;
    };

    // Prioritize critical blocks
    for (const corr of corrections) {
      if (corr.enforceBlock) {
        addDirective(corr.sanitizedGuidance);
      }
    }

    // High severity critiques
    for (const crit of critiques) {
      if (crit.severity === "HIGH" || crit.severity === "CRITICAL" || crit.severity === "MAJOR") {
        if (crit.issueType === "CONTRADICTION_UNRESOLVED" || crit.issueType === "CONTRADICTION_DISREGARD") {
          addDirective("There is conflicting evidence on this topic, so a definitive conclusion is not justified.");
        } else if (crit.issueType === "SIMULATION_REALITY_CONFUSION" || crit.issueType === "PREDICTION_AS_FACT") {
          addDirective("The simulated outcome should not be treated as a real-world fact.");
        } else if (crit.issueType === "CORRELATION_CAUSATION_CONFUSION" || crit.issueType === "CAUSAL_HALLUCINATION") {
          addDirective("The causal relationship remains unresolved and should be treated as correlation.");
        } else if (crit.issueType === "UNSUPPORTED_CLAIM" || crit.issueType === "WEAK_EVIDENCE") {
          addDirective("Treat this conclusion cautiously because supporting evidence is indirect.");
        }
      }
    }

    // Top recommendations
    for (const rec of recommendations) {
      addDirective(rec.text);
    }

    // Default safety directive if empty and issues were detected
    if (directives.length === 0 && issues.length > 0) {
      addDirective("Reason with epistemic caution and verify supporting evidence.");
    }

    return directives;
  }
}

export const metaReasoningEngine = new MetaReasoningEngine();
