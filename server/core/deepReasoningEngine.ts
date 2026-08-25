/**
 * Dora Deep Reasoning & Hypothesis Management Engine
 * Phase 3 — Step 1
 * 
 * Provides deterministic, bounded, non-LLM reasoning over authorized cognitive inputs:
 * EVIDENCE EXTRACTION -> EVIDENCE NORMALIZATION -> HYPOTHESIS GENERATION ->
 * HYPOTHESIS EVALUATION -> CONTRADICTION ANALYSIS -> UNCERTAINTY ANALYSIS ->
 * DETERMINISTIC HYPOTHESIS RANKING -> REASONED CONCLUSION.
 * 
 * STRICT ARCHITECTURAL INVARIANTS:
 * - Purely deterministic (zero Math.random, zero Date.now, zero random UUIDs).
 * - Zero side effects (no mutation of inputs, memory stores, or Phase 2 state).
 * - Synchronous, read-only, non-LLM, tool-free.
 * - Never fabricates facts or unsupported identity inferences.
 * - Current-turn explicit instruction takes highest precedence for the current turn.
 * - Predictive context remains advisory only and cannot become verified fact.
 */

import {
  ReasoningEvidence,
  ReasoningEvidenceAuthority,
  ReasoningEvidenceScope,
  REASONING_AUTHORITY_WEIGHTS,
  ReasoningHypothesis,
  HypothesisEvaluation,
  HypothesisStatus,
  ReasoningContradiction,
  ContradictionResolutionStatus,
  ReasoningUncertainty,
  ReasoningUncertaintyLevel,
  ReasoningConclusion,
  ConclusionType,
  DeepReasoningAnalysis,
  DeepReasoningInput,
  DeepReasoningOptions,
  DeepReasoningBudgetConfig,
  DeepReasoningDiagnostics,
  DEFAULT_DEEP_REASONING_BUDGET,
} from "./deepReasoningTypes";

export class DeepReasoningEngine {
  private static instance: DeepReasoningEngine;

  private constructor() {}

  public static getInstance(): DeepReasoningEngine {
    if (!DeepReasoningEngine.instance) {
      DeepReasoningEngine.instance = new DeepReasoningEngine();
    }
    return DeepReasoningEngine.instance;
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
   * Checks for sensitive credentials, secrets, tokens, and credit card patterns.
   * Preserves legitimate technical terms like "token budget", "secret project", etc.
   */
  public containsSensitiveData(text: string): boolean {
    if (!text || typeof text !== "string") return false;

    // Fast-path legitimate technical terminology exemptions
    const lower = text.toLowerCase();
    const isSafeTechnicalToken =
      lower.includes("token budget") ||
      lower.includes("secret project") ||
      lower.includes("api token documentation") ||
      lower.includes("password manager") ||
      lower.includes("authentication architecture") ||
      lower.includes("jwt token validation") ||
      lower.includes("token client") ||
      lower.includes("bearer token authentication architecture");

    // Real API Key / Secret / Token patterns
    const apiKeyPattern = /(?:api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*['"]?[a-zA-Z0-9_\-./+=]{12,}['"]?/i;
    const bearerPattern = /\bbearer\s+[a-zA-Z0-9_\-./+=]{20,}\b/i;
    const githubTokenPattern = /\b(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{20,}\b/;
    const openaiKeyPattern = /\bsk-[a-zA-Z0-9]{20,}\b/;
    const googleApiKeyPattern = /\bAIza[0-9A-Za-z\-_]{35}\b/;
    const passwordPattern = /(?:password|passwd|pwd)\s*[:=]\s*['"]?[^\s'"]{6,}['"]?/i;
    const creditCardPattern = /\b(?:\d{4}[ -]?){3}\d{4}\b/;
    const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/;
    const privateKeyPattern = /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/i;

    if (
      apiKeyPattern.test(text) ||
      githubTokenPattern.test(text) ||
      openaiKeyPattern.test(text) ||
      googleApiKeyPattern.test(text) ||
      passwordPattern.test(text) ||
      creditCardPattern.test(text) ||
      ssnPattern.test(text) ||
      privateKeyPattern.test(text)
    ) {
      return true;
    }

    if (bearerPattern.test(text) && !isSafeTechnicalToken) {
      return true;
    }

    return false;
  }

  /**
   * Detects and blocks unsupported speculative identity inferences (health, salary, age, unconfirmed job titles).
   */
  public isUnsupportedIdentityInference(statement: string): boolean {
    if (!statement || typeof statement !== "string") return false;
    const lower = statement.toLowerCase();

    // Professional developer/engineer title speculation without explicit quote
    if (
      /\b(?:is\s+a\s+professional|works\s+as\s+a\s+senior|is\s+an\s+expert|certified)\s+(?:typescript|python|react|java|software|dev|engineer|architect)\b/i.test(lower) &&
      !lower.includes("stated") &&
      !lower.includes("relevant to") &&
      !lower.includes("preferred")
    ) {
      return true;
    }

    // Salary / wealth speculation
    if (
      /\b(?:earns|salary\s+of|makes\s+\$|net\s+worth|wealthy|poor|high-income|low-income)\b/i.test(lower)
    ) {
      return true;
    }

    // Health / medical conditions
    if (
      /\b(?:diagnosed\s+with|suffers\s+from|has\s+(?:cancer|depression|adhd|bipolar|disease|illness)|medical\s+condition)\b/i.test(lower)
    ) {
      return true;
    }

    // Age speculation
    if (
      /\b(?:is\s+\d{1,2}\s+years\s+old|in\s+their\s+(?:20s|30s|40s|50s|60s)|middle-aged|elderly)\b/i.test(lower)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Sanitizes directives by removing internal memory IDs, hex hashes, raw floats, and raw timestamps.
   */
  public sanitizeDirective(text: string): string {
    if (!text || typeof text !== "string") return "";

    let cleaned = text
      .replace(/\b(?:exec|mem|fact|hyp|pref|proj|comm|evid)_[a-f0-9_]{6,}\b/gi, "")
      .replace(/\b(?:0\.\d{2,}|1\.0{1,})\b/g, "")
      .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\b/g, "")
      .replace(/\b(?:m[0-9]+|mem_[0-9]+)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\(\s*\)/g, "")
      .trim();

    return cleaned;
  }

  /**
   * Main synchronous evaluation entry point.
   */
  public evaluate(input: DeepReasoningInput): DeepReasoningAnalysis {
    const diagnostics: DeepReasoningDiagnostics = {
      totalEvidenceExamined: 0,
      authorizedEvidenceCount: 0,
      suppressedEvidenceCount: 0,
      sensitiveBlockedCount: 0,
      identityInferenceBlockedCount: 0,
      topicIsolatedCount: 0,
      staleSupersededBlockedCount: 0,
      deduplicatedCount: 0,
      hypothesesGeneratedCount: 0,
      contradictionsDetectedCount: 0,
      contradictionsResolvedCount: 0,
      unresolvedContradictionsCount: 0,
      stepsExecuted: 0,
      executionTimeMs: 0,
      isDeterministic: true,
    };

    // Fail safely on empty or malformed input
    if (!input || typeof input !== "object" || (!input.message && !input.executiveContext)) {
      return this.generateEmptyResult("Malformed or empty input provided", diagnostics);
    }

    const budget: DeepReasoningBudgetConfig = {
      ...DEFAULT_DEEP_REASONING_BUDGET,
      ...(input.options?.budgetConfig || {}),
    };

    diagnostics.stepsExecuted++;

    // Step 1: Extract and Normalize Evidence from Authorized Contexts
    const rawEvidence = this.extractEvidence(input, budget, diagnostics);
    diagnostics.stepsExecuted++;

    // Step 2: Validate, Filter, and Deduplicate Evidence
    const validEvidence = this.filterAndDeduplicateEvidence(rawEvidence, input, budget, diagnostics);
    diagnostics.stepsExecuted++;

    // Step 3: Detect and Resolve Contradictions
    const contradictions = this.analyzeContradictions(validEvidence, input, budget, diagnostics);
    diagnostics.stepsExecuted++;

    // Step 4: Generate Hypotheses Grounded in Valid Evidence
    const hypotheses = this.generateHypotheses(validEvidence, contradictions, input, budget, diagnostics);
    diagnostics.stepsExecuted++;

    // Step 5: Evaluate and Rank Hypotheses
    const { rankedHypotheses, evaluations } = this.evaluateAndRankHypotheses(hypotheses, validEvidence, contradictions, budget);
    diagnostics.stepsExecuted++;

    // Step 6: Formulate Uncertainty Assessment
    const uncertainty = this.assessUncertainty(validEvidence, rankedHypotheses, contradictions, input);
    diagnostics.stepsExecuted++;

    // Step 7: Formulate Reasoned Conclusion and Sanitized Directives
    const conclusion = this.formulateConclusion(rankedHypotheses, evaluations, contradictions, uncertainty, input);
    diagnostics.stepsExecuted++;

    const sanitizedDirectives = this.extractSanitizedDirectives(rankedHypotheses, conclusion, budget);

    return {
      evidence: validEvidence.slice(0, budget.maxEvidence),
      hypotheses: rankedHypotheses.slice(0, budget.maxHypotheses),
      evaluations: evaluations.slice(0, budget.maxHypotheses),
      contradictions: contradictions.slice(0, budget.maxContradictions),
      uncertainty,
      conclusion,
      sanitizedDirectives: sanitizedDirectives.slice(0, budget.maxDirectives),
      diagnostics,
    };
  }

  /**
   * Step 1: Extracts candidate evidence items from all authorized inputs.
   */
  private extractEvidence(
    input: DeepReasoningInput,
    budget: DeepReasoningBudgetConfig,
    diag: DeepReasoningDiagnostics
  ): ReasoningEvidence[] {
    const raw: ReasoningEvidence[] = [];
    const currentTime = input.options?.currentTime ?? 0;

    // A. Current-Turn Explicit Directives (Authority: CURRENT_TURN_EXPLICIT = 1.00)
    const msg = (input.message || "").trim();
    if (msg) {
      // 1. Language overrides
      if (/\b(?:respond|reply|answer|speak|use|write)\s+in\s+bangla\b|\bবাংলা(?:য়|তে)\s*(?:বলুন|লিখুন|উত্তর\s*দিন)?\b/i.test(msg)) {
        raw.push(this.createEvidenceItem("language_preference", "Bangla", "User explicitly requested Bangla in current turn", "CURRENT_TURN_EXPLICIT", "current_turn", "GLOBAL", 1.0, 1.0, currentTime));
      } else if (/\b(?:respond|reply|answer|speak|use|write)\s+in\s+banglish\b|\bbanglish(?:e)?\s*(?:bolo|bolun|likhun)\b/i.test(msg)) {
        raw.push(this.createEvidenceItem("language_preference", "Banglish", "User explicitly requested Banglish in current turn", "CURRENT_TURN_EXPLICIT", "current_turn", "GLOBAL", 1.0, 1.0, currentTime));
      } else if (/\b(?:respond|reply|answer|speak|use|write)\s+in\s+english\b|\benglish\s*please\b/i.test(msg)) {
        raw.push(this.createEvidenceItem("language_preference", "English", "User explicitly requested English in current turn", "CURRENT_TURN_EXPLICIT", "current_turn", "GLOBAL", 1.0, 1.0, currentTime));
      }

      // 2. Verbosity overrides
      if (/\b(?:keep\s+it\s+(?:brief|concise|short)|be\s+(?:brief|concise)|short\s+answer|one\s+liner)\b/i.test(msg)) {
        raw.push(this.createEvidenceItem("verbosity_preference", "concise", "User explicitly requested concise verbosity", "CURRENT_TURN_EXPLICIT", "current_turn", "GLOBAL", 1.0, 1.0, currentTime));
      } else if (/\b(?:detailed|elaborate|in-depth|step\s+by\s+step|comprehensive\s+explanation)\b/i.test(msg)) {
        raw.push(this.createEvidenceItem("verbosity_preference", "detailed", "User explicitly requested detailed verbosity", "CURRENT_TURN_EXPLICIT", "current_turn", "GLOBAL", 1.0, 1.0, currentTime));
      }

      // 3. Tone overrides
      if (/\b(?:casual|informal|friendly|chill|relaxed)\s+tone\b|\bkeep\s+it\s+casual\b/i.test(msg)) {
        raw.push(this.createEvidenceItem("tone_preference", "casual", "User explicitly requested casual tone", "CURRENT_TURN_EXPLICIT", "current_turn", "GLOBAL", 1.0, 1.0, currentTime));
      } else if (/\b(?:formal|professional|serious|academic)\s+tone\b|\bkeep\s+it\s+professional\b/i.test(msg)) {
        raw.push(this.createEvidenceItem("tone_preference", "professional", "User explicitly requested professional tone", "CURRENT_TURN_EXPLICIT", "current_turn", "GLOBAL", 1.0, 1.0, currentTime));
      }

      // 4. Entity substitutions & exclusions
      const brandSubMatch = msg.match(/(?:recommend|use|prefer|buy|get)\s+([a-zA-Z0-9_\-]+)\s+instead\s+of\s+([a-zA-Z0-9_\-]+)/i);
      if (brandSubMatch) {
        const replacement = brandSubMatch[1];
        const original = brandSubMatch[2];
        raw.push(this.createEvidenceItem(`entity_preference_${original.toLowerCase()}`, replacement, `Prefer ${replacement} over ${original}`, "CURRENT_TURN_EXPLICIT", "current_turn", "TOPIC_SPECIFIC", 1.0, 1.0, currentTime, undefined, false, `brand_${original.toLowerCase()}`));
      }

      const exclusionMatch = msg.match(/(?:don'?t|do\s+not|never|avoid|exclude)\s+(?:use|recommend|include|apply)?\s*([a-zA-Z0-9_\-]+)/i);
      if (exclusionMatch && !brandSubMatch) {
        const excludedItem = exclusionMatch[1];
        if (!["the", "a", "an", "this", "that", "it"].includes(excludedItem.toLowerCase())) {
          raw.push(this.createEvidenceItem(`exclude_${excludedItem.toLowerCase()}`, "excluded", `Do not use ${excludedItem}`, "CURRENT_TURN_EXPLICIT", "current_turn", "TOPIC_SPECIFIC", 1.0, 1.0, currentTime, undefined, true, `brand_${excludedItem.toLowerCase()}`));
        }
      }
    }

    // B. From Executive Context Package (if present)
    const exec = input.executiveContext;
    if (exec) {
      // 1. Constraints (Authority: HARD_CONSTRAINT = 0.95)
      for (const c of exec.reasoningConstraints || []) {
        raw.push({
          id: c.id || this.generateDeterministicId("evid_const", c.description),
          statement: c.description,
          source: "executive_context_constraints",
          authority: "HARD_CONSTRAINT",
          authorityWeight: REASONING_AUTHORITY_WEIGHTS["HARD_CONSTRAINT"],
          relevance: 1.0,
          reliability: 1.0,
          timestamp: currentTime,
          scope: "GLOBAL",
          provenance: "reasoningConstraints",
          normalizedKey: "hard_constraint",
          normalizedValue: c.description,
        });
      }

      // 2. Authoritative Facts (Authority: VERIFIED_EVIDENCE = 0.90 or GOVERNANCE_APPROVED_MEMORY = 0.80)
      for (const f of exec.authoritativeFacts || []) {
        const auth: ReasoningEvidenceAuthority =
          f.authority === "VERIFIED_EVIDENCE" || f.grounding === "VERIFIED_FACT"
            ? "VERIFIED_EVIDENCE"
            : "GOVERNANCE_APPROVED_MEMORY";
        raw.push({
          id: f.id || this.generateDeterministicId("evid_fact", f.key, f.value),
          statement: `${f.key}: ${f.value}`,
          source: f.source || "executive_context_facts",
          authority: auth,
          authorityWeight: REASONING_AUTHORITY_WEIGHTS[auth],
          relevance: f.confidence || 0.9,
          reliability: f.confidence || 0.95,
          timestamp: currentTime,
          scope: f.isGlobal ? "GLOBAL" : "TOPIC_SPECIFIC",
          provenance: "authoritativeFacts",
          topic: f.topic,
          normalizedKey: f.key.toLowerCase(),
          normalizedValue: f.value,
        });
      }

      // 3. Active Preferences (Authority: CONFIRMED_USER_MODEL = 0.75 or CURRENT_TURN_EXPLICIT = 1.00)
      for (const p of exec.activePreferences || []) {
        const auth: ReasoningEvidenceAuthority = p.isCurrentTurnOverride
          ? "CURRENT_TURN_EXPLICIT"
          : "CONFIRMED_USER_MODEL";
        raw.push({
          id: p.id || this.generateDeterministicId("evid_pref", p.key, p.value),
          statement: `User preference for ${p.key} is ${p.value}`,
          source: p.source || "executive_context_preferences",
          authority: auth,
          authorityWeight: REASONING_AUTHORITY_WEIGHTS[auth],
          relevance: 0.9,
          reliability: 0.95,
          timestamp: currentTime,
          scope: p.isGlobal ? "GLOBAL" : "TOPIC_SPECIFIC",
          provenance: "activePreferences",
          normalizedKey: p.key.toLowerCase(),
          normalizedValue: p.value,
        });
      }

      // 4. Active Projects, Goals, Commitments (Authority: ACTIVE_GOAL_PROJECT_COMMITMENT = 0.70)
      for (const pr of exec.activeProjects || []) {
        raw.push({
          id: pr.id || this.generateDeterministicId("evid_proj", pr.name),
          statement: `Active Project: ${pr.name} (status: ${pr.status})`,
          source: "executive_context_projects",
          authority: "ACTIVE_GOAL_PROJECT_COMMITMENT",
          authorityWeight: REASONING_AUTHORITY_WEIGHTS["ACTIVE_GOAL_PROJECT_COMMITMENT"],
          relevance: 0.85,
          reliability: 0.9,
          timestamp: currentTime,
          scope: "PROJECT_SPECIFIC",
          provenance: "activeProjects",
          normalizedKey: `project_${pr.name.toLowerCase()}`,
          normalizedValue: pr.status,
        });
      }

      for (const g of exec.activeGoals || []) {
        raw.push({
          id: g.id || this.generateDeterministicId("evid_goal", g.title),
          statement: `Active Goal: ${g.title}`,
          source: "executive_context_goals",
          authority: "ACTIVE_GOAL_PROJECT_COMMITMENT",
          authorityWeight: REASONING_AUTHORITY_WEIGHTS["ACTIVE_GOAL_PROJECT_COMMITMENT"],
          relevance: 0.85,
          reliability: 0.9,
          timestamp: currentTime,
          scope: "GLOBAL",
          provenance: "activeGoals",
          normalizedKey: `goal_${g.title.toLowerCase()}`,
          normalizedValue: g.status,
        });
      }

      for (const cm of exec.activeCommitments || []) {
        raw.push({
          id: cm.id || this.generateDeterministicId("evid_comm", cm.description),
          statement: `Active Commitment: ${cm.description}`,
          source: "executive_context_commitments",
          authority: "ACTIVE_GOAL_PROJECT_COMMITMENT",
          authorityWeight: REASONING_AUTHORITY_WEIGHTS["ACTIVE_GOAL_PROJECT_COMMITMENT"],
          relevance: 0.85,
          reliability: 0.9,
          timestamp: currentTime,
          scope: "GLOBAL",
          provenance: "activeCommitments",
          normalizedKey: `commitment_${cm.description.toLowerCase()}`,
          normalizedValue: cm.status,
        });
      }

      // 5. Temporal Patterns (Authority: TEMPORAL_CONTEXT = 0.60)
      for (const pat of exec.temporalContext?.activePatterns || []) {
        raw.push({
          id: this.generateDeterministicId("evid_temp", pat.key, pat.value),
          statement: `Temporal pattern: ${pat.key} is ${pat.value}`,
          source: "executive_context_temporal",
          authority: "TEMPORAL_CONTEXT",
          authorityWeight: REASONING_AUTHORITY_WEIGHTS["TEMPORAL_CONTEXT"],
          relevance: 0.75,
          reliability: 0.85,
          timestamp: currentTime,
          scope: "GLOBAL",
          provenance: "temporalContext.activePatterns",
          normalizedKey: pat.key.toLowerCase(),
          normalizedValue: pat.value,
        });
      }

      // 6. Predictive Advisory (Authority: PREDICTIVE_CONTEXT = 0.30)
      for (const adv of exec.advisoryContext || []) {
        raw.push({
          id: adv.id || this.generateDeterministicId("evid_adv", adv.key, adv.suggestion),
          statement: `Advisory suggestion: ${adv.suggestion}`,
          source: "executive_context_advisory",
          authority: "PREDICTIVE_CONTEXT",
          authorityWeight: REASONING_AUTHORITY_WEIGHTS["PREDICTIVE_CONTEXT"],
          relevance: adv.relevanceScore || 0.5,
          reliability: 0.5,
          timestamp: currentTime,
          scope: "TOPIC_SPECIFIC",
          provenance: "advisoryContext",
          topic: adv.topic,
          normalizedKey: adv.key.toLowerCase(),
          normalizedValue: adv.suggestion,
        });
      }
    }

    // C. Supplemental direct inputs if not redundant
    if (input.verification?.supportedClaims) {
      for (const sc of input.verification.supportedClaims) {
        raw.push({
          id: this.generateDeterministicId("evid_claim", sc.claim),
          statement: `Verified fact: ${sc.claim}`,
          source: "verification_engine",
          authority: "VERIFIED_EVIDENCE",
          authorityWeight: REASONING_AUTHORITY_WEIGHTS["VERIFIED_EVIDENCE"],
          relevance: 0.95,
          reliability: 1.0,
          timestamp: currentTime,
          scope: "GLOBAL",
          provenance: "verification.supportedClaims",
          normalizedKey: sc.claim.toLowerCase(),
          normalizedValue: sc.claim,
        });
      }
    }

    // D. Direct User Model Attributes (if supplied)
    if (input.userModel?.profile?.attributes) {
      for (const [k, attr] of Object.entries(input.userModel.profile.attributes)) {
        if (!attr) continue;
        const status = (attr.status || "CONFIRMED").toUpperCase();
        if (status === "SUPERSEDED" || status === "EXPIRED" || status === "DELETED" || status === "QUARANTINED" || status === "OUTDATED") {
          continue;
        }
        const val = attr.normalizedValue || (attr as any).value || "";
        raw.push({
          id: this.generateDeterministicId("evid_user_attr", k, String(val)),
          statement: `User profile ${k}: ${val}`,
          source: "user_model",
          authority: "CONFIRMED_USER_MODEL",
          authorityWeight: REASONING_AUTHORITY_WEIGHTS["CONFIRMED_USER_MODEL"],
          relevance: attr.confidence || 0.8,
          reliability: 0.9,
          timestamp: currentTime,
          scope: "GLOBAL",
          provenance: "userModel.attributes",
          normalizedKey: k.toLowerCase(),
          normalizedValue: String(val),
        });
      }
    }

    // E. Direct Governance Approved Memories (if supplied)
    const gov = input.memoryGovernance || input.governanceAnalysis;
    if (gov?.allowedMemories) {
      for (const cand of gov.allowedMemories) {
        if (!cand) continue;
        const status = (cand.status || "ACTIVE").toUpperCase();
        if (status === "SUPERSEDED" || status === "EXPIRED" || status === "DELETED" || status === "QUARANTINED" || status === "OUTDATED") {
          continue;
        }
        const key = cand.key || "memory_fact";
        const val = cand.value || "";
        raw.push({
          id: cand.memoryId || this.generateDeterministicId("evid_gov_mem", key, String(val)),
          statement: `${key}: ${val}`,
          source: "memory_governance",
          authority: "GOVERNANCE_APPROVED_MEMORY",
          authorityWeight: REASONING_AUTHORITY_WEIGHTS["GOVERNANCE_APPROVED_MEMORY"],
          relevance: cand.relevance || 0.85,
          reliability: cand.confidence || 0.9,
          timestamp: currentTime,
          scope: "GLOBAL",
          provenance: "governanceAnalysis.allowedMemories",
          normalizedKey: key.toLowerCase(),
          normalizedValue: String(val),
        });
      }
    }

    // F. Direct Predictive Candidates (Advisory only)
    if (input.predictiveContext?.acceptedCandidates) {
      for (const cand of input.predictiveContext.acceptedCandidates) {
        if (!cand) continue;
        const suggestion = cand.contextSummary || cand.directive || "";
        raw.push({
          id: cand.id || this.generateDeterministicId("evid_pred_cand", cand.topic, suggestion),
          statement: `Advisory prediction: ${suggestion}`,
          source: "predictive_context",
          authority: "PREDICTIVE_CONTEXT",
          authorityWeight: REASONING_AUTHORITY_WEIGHTS["PREDICTIVE_CONTEXT"],
          relevance: cand.relevance || 0.4,
          reliability: 0.4,
          timestamp: currentTime,
          scope: "TOPIC_SPECIFIC",
          provenance: "predictiveContext.acceptedCandidates",
          topic: cand.topic,
          normalizedKey: (cand.topic || "advisory").toLowerCase(),
          normalizedValue: suggestion,
        });
      }
    }

    diag.totalEvidenceExamined = raw.length;
    return raw;
  }

  /**
   * Helper to construct a standardized ReasoningEvidence item.
   */
  private createEvidenceItem(
    key: string,
    value: string,
    statement: string,
    authority: ReasoningEvidenceAuthority,
    source: string,
    scope: ReasoningEvidenceScope,
    relevance: number,
    reliability: number,
    timestamp: number,
    topic?: string,
    isNegated: boolean = false,
    normalizedKey?: string
  ): ReasoningEvidence {
    const id = this.generateDeterministicId("evid", authority, key, value);
    return {
      id,
      statement,
      source,
      authority,
      authorityWeight: REASONING_AUTHORITY_WEIGHTS[authority],
      relevance,
      reliability,
      timestamp,
      scope,
      provenance: source,
      topic,
      isNegated,
      normalizedKey: (normalizedKey || key).toLowerCase(),
      normalizedValue: value,
    };
  }

  /**
   * Step 2: Filters out sensitive, unauthorized, identity-inferring, or topic-isolated items and deduplicates.
   */
  private filterAndDeduplicateEvidence(
    rawEvidence: ReasoningEvidence[],
    input: DeepReasoningInput,
    budget: DeepReasoningBudgetConfig,
    diag: DeepReasoningDiagnostics
  ): ReasoningEvidence[] {
    const activeTopic = input.options?.activeTopic || input.context?.activeTopic;
    const isTopicIsolated = input.options?.strictTopicIsolation || input.context?.isTopicSwitched || false;
    const seen = new Map<string, ReasoningEvidence>();
    const valid: ReasoningEvidence[] = [];

    for (const item of rawEvidence) {
      // 1. Sensitive credential suppression
      if (this.containsSensitiveData(item.statement) || (item.normalizedValue && this.containsSensitiveData(item.normalizedValue))) {
        diag.sensitiveBlockedCount++;
        diag.suppressedEvidenceCount++;
        continue;
      }

      // 2. Unsupported identity inference blocking
      if (this.isUnsupportedIdentityInference(item.statement) || (item.normalizedValue && this.isUnsupportedIdentityInference(item.normalizedValue))) {
        diag.identityInferenceBlockedCount++;
        diag.suppressedEvidenceCount++;
        continue;
      }

      // 3. Topic isolation
      if (isTopicIsolated && activeTopic && item.scope !== "GLOBAL" && item.authority !== "CURRENT_TURN_EXPLICIT") {
        if (!item.topic || item.topic.toLowerCase() !== activeTopic.toLowerCase()) {
          diag.topicIsolatedCount++;
          diag.suppressedEvidenceCount++;
          continue;
        }
      }

      // 4. Deduplication by normalizedKey + normalizedValue
      const dedupKey = `${item.normalizedKey || ""}:${(item.normalizedValue || item.statement).toLowerCase().trim()}`;
      const existing = seen.get(dedupKey);

      if (existing) {
        diag.deduplicatedCount++;
        // If current item has strictly higher authority, replace it
        if (item.authorityWeight > existing.authorityWeight) {
          seen.set(dedupKey, item);
        }
      } else {
        seen.set(dedupKey, item);
      }
    }

    for (const item of seen.values()) {
      valid.push(item);
    }

    // Sort evidence deterministically by Authority (descending), then Relevance (descending), then ID
    valid.sort((a, b) => {
      if (b.authorityWeight !== a.authorityWeight) {
        return b.authorityWeight - a.authorityWeight;
      }
      if (b.relevance !== a.relevance) {
        return b.relevance - a.relevance;
      }
      return a.id.localeCompare(b.id);
    });

    diag.authorizedEvidenceCount = valid.length;
    return valid;
  }

  /**
   * Step 3: Analyzes pairwise contradictions across evidence items.
   */
  private analyzeContradictions(
    evidence: ReasoningEvidence[],
    input: DeepReasoningInput,
    budget: DeepReasoningBudgetConfig,
    diag: DeepReasoningDiagnostics
  ): ReasoningContradiction[] {
    const contradictions: ReasoningContradiction[] = [];
    const n = Math.min(evidence.length, budget.maxEvidence);

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = evidence[i];
        const b = evidence[j];

        // Contradiction detection logic
        const isConflict = this.isConflictingPair(a, b);
        if (!isConflict) continue;

        diag.contradictionsDetectedCount++;
        const subject = a.normalizedKey || a.statement;

        let status: ContradictionResolutionStatus = "UNRESOLVED";
        let winner: ReasoningEvidence | undefined = undefined;

        if (a.authorityWeight > b.authorityWeight) {
          status = a.authority === "CURRENT_TURN_EXPLICIT" ? "RESOLVED_BY_CURRENT_TURN" : "RESOLVED_BY_AUTHORITY";
          winner = a;
          diag.contradictionsResolvedCount++;
        } else if (b.authorityWeight > a.authorityWeight) {
          status = b.authority === "CURRENT_TURN_EXPLICIT" ? "RESOLVED_BY_CURRENT_TURN" : "RESOLVED_BY_AUTHORITY";
          winner = b;
          diag.contradictionsResolvedCount++;
        } else {
          // Equal authority
          // Check if temporal override
          if (a.authority === "TEMPORAL_CONTEXT" && b.authority === "TEMPORAL_CONTEXT") {
            const timeA = a.timestamp || 0;
            const timeB = b.timestamp || 0;
            if (timeA > timeB) {
              status = "TEMPORAL_OVERRIDE";
              winner = a;
              diag.contradictionsResolvedCount++;
            } else if (timeB > timeA) {
              status = "TEMPORAL_OVERRIDE";
              winner = b;
              diag.contradictionsResolvedCount++;
            } else {
              status = "UNRESOLVED";
              diag.unresolvedContradictionsCount++;
            }
          } else {
            status = "UNRESOLVED";
            diag.unresolvedContradictionsCount++;
          }
        }

        const cid = this.generateDeterministicId("contra", a.id, b.id);
        const higher = winner === a ? a : winner === b ? b : undefined;
        const lower = winner === a ? b : winner === b ? a : undefined;

        contradictions.push({
          id: cid,
          conflictingEvidenceIds: [a.id, b.id],
          subject,
          authorityComparison: {
            higherAuthorityId: higher?.id,
            lowerAuthorityId: lower?.id,
            higherAuthority: higher?.authority,
            lowerAuthority: lower?.authority,
            difference: Math.abs(a.authorityWeight - b.authorityWeight),
          },
          conflictScope: a.scope === "GLOBAL" || b.scope === "GLOBAL" ? "GLOBAL" : "TOPIC_SPECIFIC",
          resolutionStatus: status,
          winningEvidenceId: winner?.id,
          explanation: higher
            ? `${higher.statement} (authority: ${higher.authority}) supersedes ${lower?.statement} (authority: ${lower?.authority})`
            : `Unresolved contradiction between '${a.statement}' and '${b.statement}' of equal authority (${a.authority})`,
        });

        if (contradictions.length >= budget.maxContradictions) {
          break;
        }
      }
      if (contradictions.length >= budget.maxContradictions) {
        break;
      }
    }

    return contradictions;
  }

  /**
   * Helper to determine if two evidence items conflict directly.
   */
  private isConflictingPair(a: ReasoningEvidence, b: ReasoningEvidence): boolean {
    // 1. Same normalized key with different values
    if (a.normalizedKey && b.normalizedKey) {
      const keyA = a.normalizedKey.toLowerCase();
      const keyB = b.normalizedKey.toLowerCase();
      if (keyA === keyB || keyA.includes(keyB) || keyB.includes(keyA) || (keyA.endsWith("brand") && keyB.endsWith("brand"))) {
        if (a.normalizedValue && b.normalizedValue && a.normalizedValue.toLowerCase() !== b.normalizedValue.toLowerCase()) {
          return true;
        }
      }
    }

    // 2. Affirmation vs Negation / Exclusion on same entity
    if ((a.isNegated && !b.isNegated) || (!a.isNegated && b.isNegated)) {
      const targetA = (a.normalizedValue || a.statement).toLowerCase();
      const targetB = (b.normalizedValue || b.statement).toLowerCase();
      const keyA = (a.normalizedKey || "").toLowerCase();
      const keyB = (b.normalizedKey || "").toLowerCase();
      if (targetA.includes(targetB) || targetB.includes(targetA) || keyA.includes(targetB) || keyB.includes(targetA)) {
        return true;
      }
    }

    // 3. Statement mentions replacement or substitution (e.g. "Prefer Lenovo over ASUS" vs "ASUS")
    const stmtA = a.statement.toLowerCase();
    const stmtB = b.statement.toLowerCase();
    const valA = (a.normalizedValue || "").toLowerCase();
    const valB = (b.normalizedValue || "").toLowerCase();

    if (valA && (stmtB.includes(`over ${valA}`) || stmtB.includes(`instead of ${valA}`))) return true;
    if (valB && (stmtA.includes(`over ${valB}`) || stmtA.includes(`instead of ${valB}`))) return true;

    // 4. Known opposing pairs (e.g. concise vs detailed, english vs bangla)
    const textA = (a.normalizedValue || a.statement).toLowerCase();
    const textB = (b.normalizedValue || b.statement).toLowerCase();

    if ((textA.includes("concise") && textB.includes("detailed")) || (textA.includes("detailed") && textB.includes("concise"))) {
      return true;
    }
    if ((textA.includes("casual") && textB.includes("professional")) || (textA.includes("professional") && textB.includes("casual"))) {
      return true;
    }
    if ((textA === "english" && (textB === "bangla" || textB === "banglish")) || (textA === "bangla" && (textB === "english" || textB === "banglish"))) {
      return true;
    }

    return false;
  }

  /**
   * Step 4: Generates structured hypotheses strictly from evidence and contradiction states.
   */
  private generateHypotheses(
    evidence: ReasoningEvidence[],
    contradictions: ReasoningContradiction[],
    input: DeepReasoningInput,
    budget: DeepReasoningBudgetConfig,
    diag: DeepReasoningDiagnostics
  ): ReasoningHypothesis[] {
    const hypotheses: ReasoningHypothesis[] = [];
    const clusters: ReasoningEvidence[][] = [];

    // Group evidence into connected conflict clusters
    for (const ev of evidence) {
      let matchedCluster: ReasoningEvidence[] | null = null;
      for (const cluster of clusters) {
        if (cluster.some((c) => this.isConflictingPair(c, ev) || (c.normalizedKey && ev.normalizedKey && c.normalizedKey === ev.normalizedKey))) {
          matchedCluster = cluster;
          break;
        }
      }
      if (matchedCluster) {
        matchedCluster.push(ev);
      } else {
        clusters.push([ev]);
      }
    }

    for (const items of clusters) {
      if (hypotheses.length >= budget.maxHypotheses) break;

      // Find winning/highest authority item for this cluster
      let winningItem = items[0];
      for (const it of items) {
        if (it.authorityWeight > winningItem.authorityWeight) {
          winningItem = it;
        }
      }

      const subject = winningItem.normalizedKey || winningItem.statement;

      // Check if there are unresolved contradictions in this cluster
      const itemIds = new Set(items.map((it) => it.id));
      const unresolvedInCluster = contradictions.filter(
        (c) =>
          c.conflictingEvidenceIds.some((cid) => itemIds.has(cid)) &&
          c.resolutionStatus === "UNRESOLVED"
      );

      const supportingIds = items
        .filter((it) => it.id === winningItem.id || (!this.isConflictingPair(it, winningItem) && it.normalizedValue === winningItem.normalizedValue))
        .map((it) => it.id)
        .slice(0, budget.maxEvidencePerHypothesis);

      const contradictingIds = items
        .filter((it) => it.id !== winningItem.id && (this.isConflictingPair(it, winningItem) || (it.normalizedValue && it.normalizedValue !== winningItem.normalizedValue)))
        .map((it) => it.id)
        .slice(0, budget.maxEvidencePerHypothesis);

      // Support score calculation
      let supportScore = winningItem.authorityWeight * winningItem.reliability;
      let contradictionScore = 0;

      for (const cid of contradictingIds) {
        const cItem = evidence.find((e) => e.id === cid);
        if (cItem) {
          contradictionScore += cItem.authorityWeight * cItem.reliability;
        }
      }

      // Determine hypothesis status
      let status: HypothesisStatus = "SUPPORTED";
      let uncertainty: ReasoningUncertaintyLevel = "LOW";

      if (unresolvedInCluster.length > 0) {
        status = "UNCERTAIN";
        uncertainty = "CRITICAL";
      } else if (contradictionScore > supportScore) {
        status = "CONTRADICTED";
        uncertainty = "HIGH";
      } else if (winningItem.authority === "PREDICTIVE_CONTEXT") {
        status = "PLAUSIBLE";
        uncertainty = "MODERATE";
      } else if (winningItem.authorityWeight >= 0.70) {
        status = "SUPPORTED";
        uncertainty = "LOW";
      } else {
        status = "PLAUSIBLE";
        uncertainty = "MODERATE";
      }

      // Direct turn override check
      const currentTurnOverride = items.find((it) => it.authority === "CURRENT_TURN_EXPLICIT");
      if (currentTurnOverride && winningItem.id !== currentTurnOverride.id) {
        status = "REJECTED";
        uncertainty = "HIGH";
      }

      // Calculate confidence bounded between 0.0 and 1.0
      let rawConfidence = supportScore / (supportScore + contradictionScore + 0.05);
      if (uncertainty === "CRITICAL") rawConfidence = Math.min(rawConfidence, 0.40);
      if (uncertainty === "HIGH") rawConfidence = Math.min(rawConfidence, 0.55);
      if (winningItem.authority === "PREDICTIVE_CONTEXT") rawConfidence = Math.min(rawConfidence, 0.60);
      const confidence = Number(Math.max(0.0, Math.min(1.0, rawConfidence)).toFixed(2));

      const hypId = this.generateDeterministicId("hyp", subject, winningItem.normalizedValue || winningItem.statement);
      const statement = winningItem.authority === "PREDICTIVE_CONTEXT"
        ? `Advisory suggestion: ${winningItem.statement}`
        : `${winningItem.statement}`;

      hypotheses.push({
        id: hypId,
        statement,
        targetSubject: subject,
        proposedActionOrFact: winningItem.normalizedValue || winningItem.statement,
        supportingEvidenceIds: supportingIds,
        contradictingEvidenceIds: contradictingIds,
        supportScore: Number(supportScore.toFixed(3)),
        contradictionScore: Number(contradictionScore.toFixed(3)),
        confidence,
        uncertainty,
        status,
        winningAuthority: winningItem.authority,
        sanitizedDirective: this.sanitizeDirective(statement),
      });

      diag.hypothesesGeneratedCount++;
    }

    return hypotheses;
  }

  /**
   * Step 5: Evaluates and strictly ranks hypotheses using lexicographic ordering.
   */
  private evaluateAndRankHypotheses(
    hypotheses: ReasoningHypothesis[],
    evidence: ReasoningEvidence[],
    contradictions: ReasoningContradiction[],
    budget: DeepReasoningBudgetConfig
  ): { rankedHypotheses: ReasoningHypothesis[]; evaluations: HypothesisEvaluation[] } {
    const evaluations: HypothesisEvaluation[] = [];

    for (const hyp of hypotheses) {
      const supEv = evidence.filter((e) => hyp.supportingEvidenceIds.includes(e.id));
      const contraEv = evidence.filter((e) => hyp.contradictingEvidenceIds.includes(e.id));

      // Calculate independent support count (distinct sources / provenances)
      const distinctSources = new Set(supEv.map((e) => `${e.source}:${e.provenance}`));
      const independentSupportCount = distinctSources.size;

      let highestSupportingAuthority: ReasoningEvidenceAuthority = "SYSTEM_DEFAULT";
      let highestSupportingWeight = 0;
      for (const e of supEv) {
        if (e.authorityWeight > highestSupportingWeight) {
          highestSupportingWeight = e.authorityWeight;
          highestSupportingAuthority = e.authority;
        }
      }

      let highestContradictingAuthority: ReasoningEvidenceAuthority | undefined = undefined;
      let highestContradictingWeight = 0;
      for (const e of contraEv) {
        if (e.authorityWeight > highestContradictingWeight) {
          highestContradictingWeight = e.authorityWeight;
          highestContradictingAuthority = e.authority;
        }
      }

      const netScore = Number((hyp.supportScore - hyp.contradictionScore).toFixed(3));
      const isAuthorityConsistent = highestSupportingWeight >= highestContradictingWeight;

      const evalTrace: string[] = [
        `Supporting authority: ${highestSupportingAuthority} (weight: ${highestSupportingWeight})`,
        `Independent sources count: ${independentSupportCount}`,
        `Net score: ${netScore}`,
      ];

      evaluations.push({
        hypothesisId: hyp.id,
        supportScore: hyp.supportScore,
        contradictionScore: hyp.contradictionScore,
        netScore,
        independentSupportCount,
        highestSupportingAuthority,
        highestContradictingAuthority,
        isAuthorityConsistent,
        status: hyp.status,
        evaluationTrace: evalTrace,
      });
    }

    // Strict Lexicographical Ranking:
    // 1. Status Precedence (SUPPORTED > PLAUSIBLE > UNCERTAIN > CONTRADICTED > REJECTED)
    // 2. Highest Supporting Authority Weight (descending)
    // 3. Net Score (descending)
    // 4. Independent Support Count (descending)
    // 5. Confidence (descending)
    // 6. Deterministic ID tie-breaker
    const statusOrder: Record<HypothesisStatus, number> = {
      SUPPORTED: 5,
      PLAUSIBLE: 4,
      UNCERTAIN: 3,
      CONTRADICTED: 2,
      REJECTED: 1,
    };

    const sortedHypotheses = [...hypotheses].sort((a, b) => {
      // 1. Status
      const statusDiff = (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
      if (statusDiff !== 0) return statusDiff;

      // 2. Supporting Authority Weight
      const weightA = a.winningAuthority ? REASONING_AUTHORITY_WEIGHTS[a.winningAuthority] : 0;
      const weightB = b.winningAuthority ? REASONING_AUTHORITY_WEIGHTS[b.winningAuthority] : 0;
      if (weightB !== weightA) return weightB - weightA;

      // 3. Net Score
      const evalA = evaluations.find((e) => e.hypothesisId === a.id);
      const evalB = evaluations.find((e) => e.hypothesisId === b.id);
      const netA = evalA?.netScore || 0;
      const netB = evalB?.netScore || 0;
      if (netB !== netA) return netB - netA;

      // 4. Independent Support Count
      const indA = evalA?.independentSupportCount || 0;
      const indB = evalB?.independentSupportCount || 0;
      if (indB !== indA) return indB - indA;

      // 5. Confidence
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;

      // 6. Stable deterministic ID tie breaker
      return a.id.localeCompare(b.id);
    });

    return { rankedHypotheses: sortedHypotheses, evaluations };
  }

  /**
   * Step 6: Formulates calibrated uncertainty assessment.
   */
  private assessUncertainty(
    evidence: ReasoningEvidence[],
    hypotheses: ReasoningHypothesis[],
    contradictions: ReasoningContradiction[],
    input: DeepReasoningInput
  ): ReasoningUncertainty {
    const unresolvedContradictions = contradictions.filter((c) => c.resolutionStatus === "UNRESOLVED");
    const evidenceGaps: string[] = [];

    if (evidence.length === 0) {
      evidenceGaps.push("No authorized evidence provided");
    }

    const isAmbiguous = input.executiveContext?.ambiguity?.isAmbiguous || input.context?.isAmbiguousReference || false;
    if (isAmbiguous) {
      evidenceGaps.push("Context contains unresolved ambiguous entity reference");
    }

    let overallLevel: ReasoningUncertaintyLevel = "LOW";
    if (evidence.length === 0 || unresolvedContradictions.length > 0) {
      overallLevel = "CRITICAL";
    } else if (isAmbiguous || contradictions.length > 0) {
      overallLevel = "HIGH";
    } else if (hypotheses.some((h) => h.status === "PLAUSIBLE" || h.uncertainty === "MODERATE")) {
      overallLevel = "MODERATE";
    }

    const isSufficient =
      evidence.length > 0 &&
      unresolvedContradictions.length === 0 &&
      hypotheses.some((h) => h.status === "SUPPORTED");

    return {
      overallLevel,
      evidenceGaps,
      ambiguityDetected: isAmbiguous,
      conflictingSignalsCount: contradictions.length,
      unresolvedContradictionsCount: unresolvedContradictions.length,
      isSufficientForConclusion: isSufficient,
    };
  }

  /**
   * Step 7: Formulates final grounded conclusion.
   */
  private formulateConclusion(
    rankedHypotheses: ReasoningHypothesis[],
    evaluations: HypothesisEvaluation[],
    contradictions: ReasoningContradiction[],
    uncertainty: ReasoningUncertainty,
    input: DeepReasoningInput
  ): ReasoningConclusion {
    // If no hypotheses or no evidence
    if (rankedHypotheses.length === 0) {
      return {
        type: "NO_CONCLUSION",
        statement: "Insufficient evidence to draw a grounded conclusion",
        confidence: 0.0,
        uncertainty: "CRITICAL",
        justification: ["No valid authorized evidence items available"],
        sanitizedDirectives: [],
        requiresClarification: uncertainty.ambiguityDetected,
        clarificationPrompt: input.executiveContext?.ambiguity?.clarificationPrompt,
      };
    }

    // Check for critical unresolved contradictions
    const unresolved = contradictions.filter((c) => c.resolutionStatus === "UNRESOLVED");
    if (unresolved.length > 0) {
      return {
        type: "UNRESOLVED_CONCLUSION",
        statement: `Unresolved contradiction detected: ${unresolved[0].explanation}`,
        confidence: 0.3,
        uncertainty: "CRITICAL",
        justification: unresolved.map((u) => u.explanation),
        sanitizedDirectives: [],
        requiresClarification: true,
        clarificationPrompt: `Clarification needed regarding conflicting preferences for ${unresolved[0].subject}`,
      };
    }

    const topHypothesis = rankedHypotheses[0];
    const topEval = evaluations.find((e) => e.hypothesisId === topHypothesis.id);

    let conclusionType: ConclusionType = "SUPPORTED_CONCLUSION";
    if (topHypothesis.status === "PLAUSIBLE") {
      conclusionType = "TENTATIVE_CONCLUSION";
    } else if (topHypothesis.status === "UNCERTAIN" || topHypothesis.status === "REJECTED") {
      conclusionType = "UNRESOLVED_CONCLUSION";
    }

    const justification: string[] = [
      `Primary hypothesis: ${topHypothesis.statement}`,
      `Grounded in authority: ${topHypothesis.winningAuthority || "VERIFIED_EVIDENCE"}`,
      `Net support score: ${topEval?.netScore ?? topHypothesis.supportScore}`,
    ];

    const sanitizedDirectives = [this.sanitizeDirective(topHypothesis.statement)].filter(Boolean);

    return {
      type: conclusionType,
      primaryHypothesisId: topHypothesis.id,
      statement: topHypothesis.statement,
      confidence: topHypothesis.confidence,
      uncertainty: topHypothesis.uncertainty,
      justification,
      sanitizedDirectives,
      requiresClarification: uncertainty.ambiguityDetected,
      clarificationPrompt: input.executiveContext?.ambiguity?.clarificationPrompt,
    };
  }

  /**
   * Extracts sanitized output directives.
   */
  private extractSanitizedDirectives(
    hypotheses: ReasoningHypothesis[],
    conclusion: ReasoningConclusion,
    budget: DeepReasoningBudgetConfig
  ): string[] {
    const directives: string[] = [];

    if (conclusion.statement && conclusion.type !== "NO_CONCLUSION" && conclusion.type !== "UNRESOLVED_CONCLUSION") {
      const clean = this.sanitizeDirective(conclusion.statement);
      if (clean && !directives.includes(clean)) {
        directives.push(clean);
      }
    }

    for (const hyp of hypotheses) {
      if (directives.length >= budget.maxDirectives) break;
      if (hyp.status === "SUPPORTED" || hyp.status === "PLAUSIBLE") {
        const clean = this.sanitizeDirective(hyp.statement);
        if (clean && !directives.includes(clean)) {
          directives.push(clean);
        }
      }
    }

    return directives;
  }

  /**
   * Generates safe empty result on missing/malformed input.
   */
  private generateEmptyResult(reason: string, diag: DeepReasoningDiagnostics): DeepReasoningAnalysis {
    return {
      evidence: [],
      hypotheses: [],
      evaluations: [],
      contradictions: [],
      uncertainty: {
        overallLevel: "CRITICAL",
        evidenceGaps: [reason],
        ambiguityDetected: false,
        conflictingSignalsCount: 0,
        unresolvedContradictionsCount: 0,
        isSufficientForConclusion: false,
      },
      conclusion: {
        type: "NO_CONCLUSION",
        statement: reason,
        confidence: 0.0,
        uncertainty: "CRITICAL",
        justification: [reason],
        sanitizedDirectives: [],
        requiresClarification: false,
      },
      sanitizedDirectives: [],
      diagnostics: diag,
    };
  }
}

export const deepReasoningEngine = DeepReasoningEngine.getInstance();
