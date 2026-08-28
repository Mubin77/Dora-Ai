/**
 * Dora Multi-Hop Reasoning & Evidence Chain Engine
 * Phase 3 — Step 4
 * 
 * Deterministic, bounded, non-LLM reasoning engine that constructs multi-hop evidence
 * chains by connecting already-authorized evidence, relations, and conclusions from
 * upstream cognitive engines (ExecutiveContext, DeepReasoning, ContradictionResolution,
 * CausalReasoning, TemporalMemory, and GoalProject).
 * 
 * Guarantees:
 * - Bounded depth traversal (maxHops clamped <= 5, default 3)
 * - Strict graph cycle detection and rejection
 * - Full provenance tracing back to original authorized evidence
 * - Deterministic authority degradation (no elevation via chaining)
 * - Calibrated confidence propagation clamped to [0, 1]
 * - Strict topic and scope isolation
 * - Non-assertive turn intent gating (questions/hypotheticals/speculations cannot become ground truth)
 * - Zero MemoryStore mutation or external API calls
 * - Zero Date.now() / Math.random() / random UUIDs
 * - Pure natural-language directive sanitization
 */

import {
  MultiHopEvidenceAuthority,
  MULTI_HOP_AUTHORITY_WEIGHTS,
  MultiHopScope,
  MultiHopEvidenceEligibility,
  MultiHopInferenceType,
  MultiHopChainStatus,
  MultiHopEvidenceNode,
  MultiHopReasoningHop,
  MultiHopReasoningChain,
  MultiHopGroundedConclusion,
  MultiHopReasoningBudgetConfig,
  DEFAULT_MULTI_HOP_BUDGET,
  HARD_CEILING_MULTI_HOP_BUDGET,
  MultiHopReasoningDiagnostics,
  MultiHopReasoningAnalysis,
  MultiHopReasoningInput,
  MultiHopReasoningOptions,
} from "./multiHopReasoningTypes";

/**
 * Sensitive patterns to suppress in directives & evidence.
 */
const SENSITIVE_PATTERNS: RegExp[] = [
  /(?:api[_-]?key|apikey|secret|password|passwd|token|bearer|auth|credential|private[_-]?key)[\s:=]+([^\s,;]+)/gi,
  /\b[A-Za-z0-9+/]{32,}={0,2}\b/g,
  /\bsk-[A-Za-z0-9]{20,}\b/g,
  /\bAIza[0-9A-Za-z-_]{20,}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\b(?:bearer\s+)?[A-Za-z0-9\-_]{20,}\.[A-Za-z0-9\-_]{20,}\.[A-Za-z0-9\-_]{20,}\b/gi,
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
];

/**
 * Forbidden biographical identity dimensions.
 */
const FORBIDDEN_IDENTITY_DIMENSIONS: RegExp[] = [
  /\b(?:salary|income|net\s*worth|earnings|wage|compensation)\s*(?:is|was|of|equals|around)?\s*[:$]?\s*\d+/gi,
  /\b(?:age|years\s*old)\s*(?:is|was|of|equals|around)?\s*\d+\b/gi,
  /\b(?:race|ethnicity|sexual\s*orientation|religion|political\s*party|medical\s*diagnosis)\b/gi,
];

export class MultiHopReasoningEngine {
  /**
   * Main evaluation entry point for Multi-Hop Reasoning & Evidence Chain Engine.
   */
  public evaluate(input: MultiHopReasoningInput): MultiHopReasoningAnalysis {
    const options = input.options || {};
    const currentTime = options.currentTime ?? 1700000000000;
    const activeTopic = options.activeTopic || input.context?.activeTopic || "general";
    const strictTopicIsolation = options.strictTopicIsolation ?? false;

    const budget = this.resolveBudget(options.budget);

    const diagnostics: MultiHopReasoningDiagnostics = {
      evidenceNodesExtracted: 0,
      evidenceNodesAccepted: 0,
      evidenceNodesRejected: 0,
      duplicateEvidenceSuppressed: 0,
      hopsCreated: 0,
      unsupportedHopsRejected: 0,
      chainsCreated: 0,
      chainsTruncated: 0,
      cyclesDetected: 0,
      cyclesRejected: 0,
      topicConflictsRejected: 0,
      scopeConflictsRejected: 0,
      predictiveOnlyChainsSuppressed: 0,
      unresolvedChains: 0,
      maxDepthReached: 0,
      directivesSanitized: 0,
      questionsSuppressedCount: 0,
      hypotheticalsSuppressedCount: 0,
      speculationsSuppressedCount: 0,
      assistantAttributionsSuppressedCount: 0,
      evaluationTimeMs: 0,
    };

    const message = (input.message || "").trim();

    // 1. Classify Turn Intent to prevent non-assertive inputs from becoming ground truth evidence
    const turnIntent = this.classifyTurnIntent(message);
    if (turnIntent === "QUESTION") {
      diagnostics.questionsSuppressedCount++;
    } else if (turnIntent === "HYPOTHETICAL" || turnIntent === "CONDITIONAL") {
      diagnostics.hypotheticalsSuppressedCount++;
    } else if (turnIntent === "SPECULATION") {
      diagnostics.speculationsSuppressedCount++;
    } else if (turnIntent === "ASSISTANT_ATTRIBUTION") {
      diagnostics.assistantAttributionsSuppressedCount++;
    }

    // 2. Extract and Normalize Evidence Nodes from authorized upstream cognitive outputs
    const rawNodes = this.extractEvidenceNodes(input, diagnostics, strictTopicIsolation, activeTopic, turnIntent);
    diagnostics.evidenceNodesExtracted = rawNodes.length;

    // Deduplicate and collapse identical/equivalent nodes
    const deduplicatedNodes = this.deduplicateNodes(rawNodes, diagnostics);
    diagnostics.evidenceNodesAccepted = deduplicatedNodes.length;

    // Apply budget to evidence nodes
    let evidenceNodes = deduplicatedNodes;
    if (evidenceNodes.length > budget.maxEvidenceNodes) {
      evidenceNodes = evidenceNodes.slice(0, budget.maxEvidenceNodes);
      diagnostics.chainsTruncated++;
    }

    // Index nodes for quick lookup
    const nodeMap = new Map<string, MultiHopEvidenceNode>();
    for (const node of evidenceNodes) {
      nodeMap.set(node.id, node);
    }

    // 3. Construct Reasoning Hops connecting evidence nodes
    const rawHops = this.constructReasoningHops(
      evidenceNodes,
      input,
      diagnostics,
      strictTopicIsolation,
      activeTopic
    );
    diagnostics.hopsCreated = rawHops.length;

    // 4. Construct Multi-Hop Reasoning Chains with Cycle Detection and Depth Bounding
    const rawChains = this.constructReasoningChains(
      evidenceNodes,
      rawHops,
      nodeMap,
      budget,
      diagnostics,
      strictTopicIsolation,
      activeTopic
    );
    diagnostics.chainsCreated = rawChains.length;

    // 5. Separate Chains by Status
    const groundedChains: MultiHopReasoningChain[] = [];
    const unresolvedChains: MultiHopReasoningChain[] = [];
    const rejectedChains: MultiHopReasoningChain[] = [];

    for (const chain of rawChains) {
      if (chain.status === "GROUNDED" || chain.status === "ADVISORY") {
        groundedChains.push(chain);
      } else if (chain.status === "UNRESOLVED") {
        unresolvedChains.push(chain);
        diagnostics.unresolvedChains++;
      } else {
        rejectedChains.push(chain);
      }
    }

    // Apply chain budget
    let activeGroundedChains = groundedChains;
    if (activeGroundedChains.length > budget.maxChains) {
      activeGroundedChains = activeGroundedChains.slice(0, budget.maxChains);
      diagnostics.chainsTruncated++;
    }

    // 6. Synthesize Grounded Conclusions from Validated Chains
    const rawConclusions = this.synthesizeConclusions(
      activeGroundedChains,
      nodeMap,
      diagnostics
    );

    let groundedConclusions = rawConclusions;
    if (groundedConclusions.length > budget.maxConclusions) {
      groundedConclusions = groundedConclusions.slice(0, budget.maxConclusions);
    }

    // 7. Generate Sanitized Directives (Natural language only, zero internal IDs/floats)
    const directives = this.generateSanitizedDirectives(
      groundedConclusions,
      activeGroundedChains,
      budget.maxDirectives,
      diagnostics
    );

    const primaryConclusion = groundedConclusions.length > 0
      ? groundedConclusions[0].statement
      : undefined;

    const validHops = rawHops.filter((h) => h.isValid);

    return {
      evidenceNodes,
      reasoningHops: validHops,
      reasoningChains: activeGroundedChains,
      groundedConclusions,
      unresolvedChains,
      rejectedChains,
      directives,
      diagnostics,
      primaryConclusion,
      hops: validHops,
      chains: activeGroundedChains,
      conclusions: groundedConclusions,
    };
  }

  /**
   * Resolves and bounds budget configurations.
   */
  private resolveBudget(budget?: Partial<MultiHopReasoningBudgetConfig>): MultiHopReasoningBudgetConfig {
    const raw = { ...DEFAULT_MULTI_HOP_BUDGET, ...(budget || {}) };
    return {
      maxEvidenceNodes: Math.min(Math.max(1, raw.maxEvidenceNodes), HARD_CEILING_MULTI_HOP_BUDGET.maxEvidenceNodes),
      maxHops: Math.min(Math.max(1, raw.maxHops), HARD_CEILING_MULTI_HOP_BUDGET.maxHops),
      maxChains: Math.min(Math.max(1, raw.maxChains), HARD_CEILING_MULTI_HOP_BUDGET.maxChains),
      maxConclusions: Math.min(Math.max(1, raw.maxConclusions), HARD_CEILING_MULTI_HOP_BUDGET.maxConclusions),
      maxDirectives: Math.min(Math.max(1, raw.maxDirectives), HARD_CEILING_MULTI_HOP_BUDGET.maxDirectives),
      maxTotalItems: Math.min(Math.max(10, raw.maxTotalItems), HARD_CEILING_MULTI_HOP_BUDGET.maxTotalItems),
    };
  }

  /**
   * Deterministically classifies turn intent to enforce evidence gating.
   */
  private classifyTurnIntent(message: string): "QUESTION" | "HYPOTHETICAL" | "SPECULATION" | "CONDITIONAL" | "ASSISTANT_ATTRIBUTION" | "ASSERTION" | "UNKNOWN" {
    if (!message) return "UNKNOWN";
    const lower = message.toLowerCase().trim();

    // 1. Direct Question check
    if (
      lower.endsWith("?") ||
      lower.startsWith("why ") ||
      lower.startsWith("did ") ||
      lower.startsWith("do ") ||
      lower.startsWith("does ") ||
      lower.startsWith("is ") ||
      lower.startsWith("are ") ||
      lower.startsWith("can ") ||
      lower.startsWith("could ") ||
      lower.startsWith("would ") ||
      lower.startsWith("how ") ||
      lower.startsWith("what ") ||
      lower.startsWith("where ") ||
      lower.startsWith("when ") ||
      lower.startsWith("who ") ||
      lower.startsWith("which ")
    ) {
      return "QUESTION";
    }

    // 2. Hypothetical / Counterfactual check
    if (
      lower.startsWith("what if") ||
      lower.startsWith("what would happen if") ||
      lower.startsWith("suppose") ||
      lower.startsWith("assuming that") ||
      lower.startsWith("imagine if")
    ) {
      return "HYPOTHETICAL";
    }

    // 3. Conditional inquiry
    if (lower.startsWith("if ") || lower.includes(" if ")) {
      return "CONDITIONAL";
    }

    // 4. Assistant Attribution check
    if (
      lower.startsWith("you said") ||
      lower.startsWith("you told me") ||
      lower.startsWith("according to you") ||
      lower.startsWith("as you mentioned") ||
      lower.startsWith("dora said") ||
      lower.startsWith("dora mentioned")
    ) {
      return "ASSISTANT_ATTRIBUTION";
    }

    // 5. Speculative check
    if (
      lower.startsWith("maybe") ||
      lower.startsWith("perhaps") ||
      lower.startsWith("i guess") ||
      lower.startsWith("i suspect") ||
      lower.startsWith("i think maybe") ||
      lower.startsWith("might be") ||
      lower.startsWith("could possibly")
    ) {
      return "SPECULATION";
    }

    return "ASSERTION";
  }

  /**
   * Extracts evidence nodes from upstream authorized packages.
   */
  private extractEvidenceNodes(
    input: MultiHopReasoningInput,
    diagnostics: MultiHopReasoningDiagnostics,
    strictTopicIsolation: boolean,
    activeTopic: string,
    turnIntent: string
  ): MultiHopEvidenceNode[] {
    const rawNodes: MultiHopEvidenceNode[] = [];

    // Helper to add node safely
    const addNode = (
      normalizedKey: string,
      statement: string,
      authority: MultiHopEvidenceAuthority,
      sourceType: MultiHopEvidenceNode["sourceType"],
      scope: MultiHopScope = "GLOBAL",
      topic?: string,
      confidence: number = 0.85,
      isObserved: boolean = true,
      provenance: string = "upstream",
      evidenceKind: MultiHopEvidenceNode["evidenceKind"] = "FACT",
      normalizedValue?: string,
      eligibility: MultiHopEvidenceEligibility = "ELIGIBLE"
    ) => {
      // Sensitive data suppression
      const cleanStatement = this.sanitizeText(statement, diagnostics);
      if (!cleanStatement) {
        diagnostics.evidenceNodesRejected++;
        return;
      }

      // Check forbidden biographical identity inferences
      if (this.isForbiddenIdentityInference(cleanStatement)) {
        diagnostics.evidenceNodesRejected++;
        return;
      }

      // Topic isolation check
      if (strictTopicIsolation && topic && topic !== "global" && topic !== "general" && activeTopic !== "general" && topic !== activeTopic) {
        diagnostics.topicConflictsRejected++;
        diagnostics.evidenceNodesRejected++;
        return;
      }

      const normKey = normalizedKey.trim().toLowerCase();
      const id = `node_${this.hashString(`${normKey}:${cleanStatement}:${authority}`)}`;
      const authorityWeight = MULTI_HOP_AUTHORITY_WEIGHTS[authority] ?? 0.5;

      rawNodes.push({
        id,
        normalizedKey: normKey,
        normalizedValue,
        statement: cleanStatement,
        sourceType,
        authority,
        authorityWeight,
        scope,
        topic: topic || "general",
        provenance,
        evidenceKind,
        eligibility,
        confidence: Math.max(0, Math.min(1, confidence)),
        isObserved,
      });
    };

    // 1. Executive Context authoritative facts
    if (input.executiveContext?.authoritativeFacts) {
      for (const fact of input.executiveContext.authoritativeFacts) {
        addNode(
          fact.key || fact.id,
          fact.value || fact.sanitizedDirective || fact.key,
          fact.authority as MultiHopEvidenceAuthority || "VERIFIED_EVIDENCE",
          "SYSTEM_FACT",
          fact.isGlobal ? "GLOBAL" : "TOPIC",
          fact.topic,
          fact.confidence ?? 0.95,
          true,
          `executive_context:${fact.id}`,
          "FACT",
          fact.value
        );
      }
    }

    // 2. Executive Context active projects & constraints
    if (input.executiveContext?.activeProjects) {
      for (const proj of input.executiveContext.activeProjects) {
        addNode(
          `project:${proj.name}`,
          `Active Project ${proj.name}: ${proj.status}`,
          "ACTIVE_GOAL_PROJECT_COMMITMENT",
          "GOAL_PROJECT_STATE",
          "PROJECT",
          undefined,
          0.9,
          true,
          `executive_project:${proj.id || proj.name}`,
          "FACT",
          proj.status
        );
      }
    }

    if (input.executiveContext?.reasoningConstraints) {
      for (const c of input.executiveContext.reasoningConstraints) {
        addNode(
          `constraint:${c.id}`,
          c.description,
          c.authority as MultiHopEvidenceAuthority || "HARD_CONSTRAINT",
          "SYSTEM_FACT",
          "GLOBAL",
          undefined,
          0.98,
          true,
          `executive_constraint:${c.id}`,
          "CONSTRAINT"
        );
      }
    }

    // 3. Deep Reasoning Evidence, Hypotheses, Conclusion
    if (input.deepReasoning?.evidence) {
      for (const ev of input.deepReasoning.evidence) {
        addNode(
          ev.normalizedKey || ev.id,
          ev.statement,
          ev.authority as MultiHopEvidenceAuthority || "VERIFIED_EVIDENCE",
          "SYSTEM_FACT",
          ev.scope === "GLOBAL" ? "GLOBAL" : "TOPIC",
          ev.topic,
          ev.reliability ?? 0.85,
          true,
          `deep_reasoning:${ev.id}`,
          "FACT",
          ev.normalizedValue
        );
      }
    }

    if (input.deepReasoning?.hypotheses) {
      for (const hyp of input.deepReasoning.hypotheses) {
        if (hyp.status === "SUPPORTED" || hyp.status === "PLAUSIBLE") {
          addNode(
            `hypothesis:${hyp.id}`,
            hyp.statement,
            hyp.winningAuthority as MultiHopEvidenceAuthority || "GOVERNANCE_APPROVED_MEMORY",
            "PREDICTIVE_INFERENCE",
            "GLOBAL",
            undefined,
            hyp.confidence ?? 0.8,
            false,
            `deep_hypothesis:${hyp.id}`,
            "HYPOTHESIS"
          );
        }
      }
    }

    if (input.deepReasoning?.conclusion && input.deepReasoning.conclusion.statement) {
      addNode(
        "deep_reasoning:conclusion",
        input.deepReasoning.conclusion.statement,
        "VERIFIED_EVIDENCE",
        "SYSTEM_FACT",
        "GLOBAL",
        undefined,
        input.deepReasoning.conclusion.confidence ?? 0.85,
        true,
        "deep_reasoning:conclusion",
        "FACT"
      );
    }

    // 4. Contradiction Resolution Revisions
    if (input.contradictionResolution?.revisions) {
      for (const rev of input.contradictionResolution.revisions) {
        const text = rev.revisedBelief || rev.sanitizedDirective || rev.reason || rev.targetSubject;
        if (text) {
          addNode(
            `revision:${rev.targetSubject}`,
            text,
            "VERIFIED_EVIDENCE",
            "CONTRADICTION_STATE",
            rev.scope === "GLOBAL" ? "GLOBAL" : "TOPIC",
            undefined,
            rev.confidence ?? 0.9,
            true,
            `contradiction_rev:${rev.targetSubject}`,
            "FACT"
          );
        }
      }
    }

    // 5. Causal Reasoning Relations & Chains
    if (input.causalReasoning?.relations) {
      for (const rel of input.causalReasoning.relations) {
        if (rel.relationType === "DIRECT_CAUSE" || rel.relationType === "INDIRECT_CAUSE" || rel.relationType === "NECESSARY_AND_SUFFICIENT") {
          addNode(
            `causal:${rel.causeStatement}->${rel.effectStatement}`,
            `${rel.causeStatement} causes ${rel.effectStatement}`,
            rel.evidenceAuthority as MultiHopEvidenceAuthority || "VERIFIED_EVIDENCE",
            "CAUSAL_STATE",
            rel.scope === "GLOBAL" ? "GLOBAL" : "TOPIC",
            undefined,
            rel.confidence ?? 0.85,
            true,
            `causal_relation:${rel.id}`,
            "RELATION"
          );
        }
      }
    }

    // 6. Temporal Memory Evolutions
    if (input.temporalMemory?.evolutions) {
      for (const evo of input.temporalMemory.evolutions) {
        addNode(
          `temporal:${evo.attributeKey}`,
          evo.sanitizedSummary || `Preference for ${evo.attributeKey} changed from ${evo.previousValue} to ${evo.currentValue}`,
          evo.authority as MultiHopEvidenceAuthority || "TEMPORAL_CONTEXT",
          "TEMPORAL_EVENT",
          "GLOBAL",
          undefined,
          0.85,
          true,
          `temporal_evolution:${evo.attributeKey}`,
          "FACT",
          evo.currentValue
        );
      }
    }

    // 7. Goal Project Blockers & Commitments
    if (input.goalProject?.blockedProjects) {
      for (const blk of input.goalProject.blockedProjects) {
        addNode(
          `blocker:${blk.name}`,
          `Blocker on project ${blk.name}: ${blk.blockerDescription || blk.status}`,
          "ACTIVE_GOAL_PROJECT_COMMITMENT",
          "GOAL_PROJECT_STATE",
          "GOAL",
          undefined,
          0.9,
          true,
          `goal_blocker:${blk.projectId || blk.name}`,
          "CONSTRAINT"
        );
      }
    }

    if (input.goalProject?.activeGoals) {
      for (const g of input.goalProject.activeGoals) {
        addNode(
          `goal:${g.title}`,
          `Goal: ${g.title} (${g.status})`,
          "ACTIVE_GOAL_PROJECT_COMMITMENT",
          "GOAL_PROJECT_STATE",
          "GOAL",
          undefined,
          0.85,
          true,
          `goal:${g.goalId || g.title}`,
          "FACT"
        );
      }
    }

    // 8. Quarantined/Superseded Memory Governance checks
    if (input.memoryGovernance?.governedCandidates) {
      for (const cand of input.memoryGovernance.governedCandidates) {
        if (cand.status === "DELETED" || cand.status === "EXPIRED" || cand.status === "SUPERSEDED" || cand.usageDecision === "SUPPRESS") {
          for (const n of rawNodes) {
            if (n.normalizedKey.includes(cand.key)) {
              n.eligibility = cand.status === "DELETED" ? "DELETED" : cand.status === "EXPIRED" ? "EXPIRED" : cand.status === "SUPERSEDED" ? "SUPERSEDED" : "UNAUTHORIZED";
            }
          }
        }
      }
    }

    // 9. Current turn user message (Only if it is a clear declarative assertion)
    const msg = (input.message || "").trim();
    if (msg && turnIntent === "ASSERTION") {
      addNode(
        `turn_assertion:${this.hashString(msg)}`,
        msg,
        "CURRENT_TURN_EXPLICIT",
        "USER_ASSERTION",
        "CURRENT_TURN",
        activeTopic,
        0.95,
        true,
        "current_turn_assertion",
        "OBSERVATION"
      );
    }

    return rawNodes;
  }

  /**
   * Deduplicates evidence nodes by normalized key + normalized value.
   * Collapses duplicates and preserves highest authority.
   */
  private deduplicateNodes(
    nodes: MultiHopEvidenceNode[],
    diagnostics: MultiHopReasoningDiagnostics
  ): MultiHopEvidenceNode[] {
    const keyMap = new Map<string, MultiHopEvidenceNode>();

    for (const node of nodes) {
      // Exclude ineligible nodes from primary accepted pool
      if (node.eligibility !== "ELIGIBLE") {
        diagnostics.evidenceNodesRejected++;
        continue;
      }

      const dedupeKey = `${node.normalizedKey.toLowerCase()}::${(node.normalizedValue || node.statement).toLowerCase().trim()}`;
      const existing = keyMap.get(dedupeKey);

      if (!existing) {
        keyMap.set(dedupeKey, node);
      } else {
        diagnostics.duplicateEvidenceSuppressed++;
        // Keep highest authority
        if (node.authorityWeight > existing.authorityWeight) {
          keyMap.set(dedupeKey, {
            ...node,
            confidence: Math.max(node.confidence, existing.confidence),
          });
        }
      }
    }

    return Array.from(keyMap.values());
  }

  /**
   * Constructs directed reasoning hops connecting evidence nodes.
   */
  private constructReasoningHops(
    nodes: MultiHopEvidenceNode[],
    input: MultiHopReasoningInput,
    diagnostics: MultiHopReasoningDiagnostics,
    strictTopicIsolation: boolean,
    activeTopic: string
  ): MultiHopReasoningHop[] {
    const hops: MultiHopReasoningHop[] = [];

    // Helper to add hop
    const addHop = (
      inputNodes: MultiHopEvidenceNode[],
      outputStatement: string,
      inferenceType: MultiHopInferenceType,
      justification: string,
      scope: MultiHopScope = "GLOBAL",
      topic: string = "general",
      hopConfidenceModifier: number = 0.95
    ) => {
      if (inputNodes.length === 0) {
        diagnostics.unsupportedHopsRejected++;
        return;
      }

      // Check if any input node is unauthorized / quarantined
      for (const inNode of inputNodes) {
        if (inNode.eligibility !== "ELIGIBLE") {
          diagnostics.unsupportedHopsRejected++;
          return;
        }
      }

      // Scope and Topic check
      if (strictTopicIsolation && topic !== "general" && topic !== "global" && activeTopic !== "general" && topic !== activeTopic) {
        diagnostics.topicConflictsRejected++;
        diagnostics.unsupportedHopsRejected++;
        return;
      }

      // Calculate degraded authority = lowest parent authority
      let minAuthorityWeight = 1.0;
      let minAuthority: MultiHopEvidenceAuthority = "CURRENT_TURN_EXPLICIT";
      let minParentConf = 1.0;

      for (const inNode of inputNodes) {
        if (inNode.authorityWeight < minAuthorityWeight) {
          minAuthorityWeight = inNode.authorityWeight;
          minAuthority = inNode.authority;
        }
        if (inNode.confidence < minParentConf) {
          minParentConf = inNode.confidence;
        }
      }

      // Inferred hops can never be VERIFIED_EVIDENCE directly without direct validation
      if (minAuthority === "VERIFIED_EVIDENCE" || minAuthority === "CURRENT_TURN_EXPLICIT") {
        // Degrade to GOVERNANCE_APPROVED_MEMORY / CONFIRMED_USER_MODEL for multi-step deductions
        minAuthority = "GOVERNANCE_APPROVED_MEMORY";
        minAuthorityWeight = MULTI_HOP_AUTHORITY_WEIGHTS.GOVERNANCE_APPROVED_MEMORY;
      }

      const hopConfidence = Math.max(0, Math.min(1, minParentConf * hopConfidenceModifier));
      const hopId = `hop_${this.hashString(`${inputNodes.map((n) => n.id).join("+")}->${outputStatement}`)}`;
      const outNodeId = `node_out_${this.hashString(outputStatement)}`;

      hops.push({
        id: hopId,
        inputNodeIds: inputNodes.map((n) => n.id),
        outputNodeId: outNodeId,
        outputStatement: this.sanitizeText(outputStatement, diagnostics),
        inferenceType,
        justification,
        supportingEvidence: inputNodes.map((n) => n.statement),
        authority: minAuthority,
        authorityWeight: minAuthorityWeight,
        scope,
        topic,
        hopIndex: 0,
        confidence: hopConfidence,
        provenance: `hop:${inferenceType.toLowerCase()}:${inputNodes.map((n) => n.id).join(",")}`,
        isValid: true,
      });
    };

    // 1. Direct Deductions from Causal Relations: Cause -> Effect -> Downstream impact
    if (input.causalReasoning?.relations) {
      for (const rel of input.causalReasoning.relations) {
        if (rel.relationType === "DIRECT_CAUSE" || rel.relationType === "NECESSARY_AND_SUFFICIENT") {
          const matchingNodes = nodes.filter(
            (n) => n.statement.toLowerCase().includes(rel.causeStatement.toLowerCase()) || rel.causeStatement.toLowerCase().includes(n.statement.toLowerCase())
          );
          if (matchingNodes.length > 0) {
            addHop(
              matchingNodes,
              `${rel.effectStatement} is directly produced by ${rel.causeStatement}`,
              "CAUSAL_PROPAGATION",
              `Causal link verified from Step 3 relation between ${rel.causeStatement} and ${rel.effectStatement}`,
              rel.scope === "GLOBAL" ? "GLOBAL" : "TOPIC",
              "general",
              0.95
            );
          }
        }
      }
    }

    // 2. Chained Deductions across compatible evidence pairs (A -> B, B -> C)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const nodeA = nodes[i];
        const nodeB = nodes[j];

        // Temporal transition + current preference chaining
        if (nodeA.sourceType === "TEMPORAL_EVENT" && (nodeB.sourceType === "USER_ASSERTION" || nodeB.sourceType === "SYSTEM_FACT")) {
          if (nodeA.statement.toLowerCase().includes(nodeB.normalizedKey.toLowerCase()) || (nodeB.normalizedValue && nodeA.statement.toLowerCase().includes(nodeB.normalizedValue.toLowerCase()))) {
            addHop(
              [nodeA, nodeB],
              `Current active configuration reflects evolved state: ${nodeB.statement}`,
              "TEMPORAL_PROPAGATION",
              `Temporal evolution aligned with active state ${nodeB.statement}`,
              "GLOBAL",
              "general",
              0.9
            );
          }
        }

        // Blocker + Goal chaining
        if (nodeA.sourceType === "GOAL_PROJECT_STATE" && nodeA.evidenceKind === "CONSTRAINT" && nodeB.evidenceKind === "FACT") {
          if (nodeB.statement.toLowerCase().includes("goal") || nodeB.statement.toLowerCase().includes("project")) {
            addHop(
              [nodeA, nodeB],
              `Progress on ${nodeB.statement} is constrained by ${nodeA.statement}`,
              "GOAL_PROPAGATION",
              `Goal dependency impacted by active blocker constraint`,
              "GOAL",
              "general",
              0.92
            );
          }
        }

        // Direct deduction: Constraint on Project / System state
        if (nodeA.evidenceKind === "CONSTRAINT" && (nodeB.sourceType === "SYSTEM_FACT" || nodeB.sourceType === "GOAL_PROJECT_STATE" || nodeB.sourceType === "USER_ASSERTION")) {
          addHop(
            [nodeA, nodeB],
            `Safety constraint (${nodeA.statement}) applies to active state (${nodeB.statement})`,
            "CONSTRAINT_PROPAGATION",
            `System boundary enforced by active constraint`,
            "GLOBAL",
            "general",
            0.95
          );
        }
      }
    }

    // 3. Contradiction Resolution Propagation
    if (input.contradictionResolution?.revisions) {
      for (const rev of input.contradictionResolution.revisions) {
        const revNodes = nodes.filter((n) => n.statement.includes(rev.targetSubject) || (rev.revisedBelief && n.statement.includes(rev.revisedBelief)));
        if (revNodes.length > 0) {
          addHop(
            revNodes,
            `Belief updated to: ${rev.revisedBelief || rev.targetSubject}`,
            "CONTRADICTION_RESOLUTION",
            `Contradiction resolved by higher authority revision`,
            "GLOBAL",
            "general",
            0.95
          );
        }
      }
    }

    // 4. Single-step direct deduction fallback for isolated facts
    for (const node of nodes) {
      if (node.authorityWeight >= MULTI_HOP_AUTHORITY_WEIGHTS.GOVERNANCE_APPROVED_MEMORY && node.isObserved) {
        addHop(
          [node],
          `Direct conclusion supported: ${node.statement}`,
          "DIRECT_DEDUCTION",
          `Directly grounded in verified fact ${node.normalizedKey}`,
          node.scope,
          node.topic || "general",
          0.98
        );
      }
    }

    return hops;
  }

  /**
   * Constructs multi-hop reasoning chains through graph traversal with cycle detection.
   */
  private constructReasoningChains(
    nodes: MultiHopEvidenceNode[],
    hops: MultiHopReasoningHop[],
    nodeMap: Map<string, MultiHopEvidenceNode>,
    budget: MultiHopReasoningBudgetConfig,
    diagnostics: MultiHopReasoningDiagnostics,
    strictTopicIsolation: boolean,
    activeTopic: string
  ): MultiHopReasoningChain[] {
    const chains: MultiHopReasoningChain[] = [];

    // Map input nodes to outgoing hops
    const outgoingHops = new Map<string, MultiHopReasoningHop[]>();
    for (const hop of hops) {
      for (const inId of hop.inputNodeIds) {
        const list = outgoingHops.get(inId) || [];
        list.push(hop);
        outgoingHops.set(inId, list);
      }
    }

    // Bounded DFS search
    const traverse = (
      currentNodeId: string,
      currentHops: MultiHopReasoningHop[],
      visitedNodeIds: Set<string>,
      visitedHopIds: Set<string>,
      rootNodeIds: string[],
      depth: number
    ) => {
      // Depth bounding
      if (depth > budget.maxHops) {
        diagnostics.maxDepthReached++;
        return;
      }

      const nextHops = outgoingHops.get(currentNodeId) || [];
      if (nextHops.length === 0 || depth === budget.maxHops) {
        // Terminal node reached -> finalize chain if depth >= 1
        if (currentHops.length > 0) {
          const lastHop = currentHops[currentHops.length - 1];
          const chainId = `chain_${this.hashString(currentHops.map((h) => h.id).join("->"))}`;

          // Calculate overall chain confidence = min(parent conf) * product(hop factors)
          let minRootConf = 1.0;
          let minAuthorityWeight = 1.0;
          let minAuthority: MultiHopEvidenceAuthority = "CURRENT_TURN_EXPLICIT";
          let isPredictiveOnly = true;

          for (const rId of rootNodeIds) {
            const rNode = nodeMap.get(rId);
            if (rNode) {
              if (rNode.confidence < minRootConf) minRootConf = rNode.confidence;
              if (rNode.authorityWeight < minAuthorityWeight) {
                minAuthorityWeight = rNode.authorityWeight;
                minAuthority = rNode.authority;
              }
              if (rNode.authority !== "PREDICTIVE_CONTEXT") {
                isPredictiveOnly = false;
              }
            }
          }

          // Degrade authority for inferred multi-hop conclusions (cannot claim CURRENT_TURN_EXPLICIT or unverified root level)
          let primaryAuthority: MultiHopEvidenceAuthority = minAuthority;
          let primaryAuthorityWeight = minAuthorityWeight;
          if (primaryAuthority === "CURRENT_TURN_EXPLICIT" || primaryAuthority === "VERIFIED_EVIDENCE") {
            primaryAuthority = "GOVERNANCE_APPROVED_MEMORY";
            primaryAuthorityWeight = MULTI_HOP_AUTHORITY_WEIGHTS.GOVERNANCE_APPROVED_MEMORY;
          }

          let chainConfidence = minRootConf;
          for (const hop of currentHops) {
            chainConfidence *= (hop.confidence || 0.95);
          }
          chainConfidence = Math.max(0, Math.min(1, chainConfidence));

          // Count independent roots
          const uniqueRootKeys = new Set(rootNodeIds.map((id) => nodeMap.get(id)?.normalizedKey || id));
          const independentCount = uniqueRootKeys.size;

          const status: MultiHopChainStatus = isPredictiveOnly
            ? "ADVISORY"
            : primaryAuthorityWeight < MULTI_HOP_AUTHORITY_WEIGHTS.GOVERNANCE_APPROVED_MEMORY
            ? "UNRESOLVED"
            : "GROUNDED";

          chains.push({
            id: chainId,
            hops: [...currentHops],
            rootEvidenceNodeIds: [...rootNodeIds],
            terminalNodeId: lastHop.outputNodeId,
            terminalStatement: lastHop.outputStatement,
            chainDepth: currentHops.length,
            status,
            primaryAuthority,
            primaryAuthorityWeight,
            confidence: chainConfidence,
            independentEvidenceCount: independentCount,
            scope: lastHop.scope,
            topic: lastHop.topic,
            isPredictiveOnly,
            hasCycle: false,
            sanitizedExplanation: `Conclusion grounded through ${currentHops.length} inference step(s) from ${independentCount} independent evidence source(s).`,
          });
        }
        return;
      }

      for (const hop of nextHops) {
        if (visitedHopIds.has(hop.id)) continue;

        // Cycle detection on output node (prevent traversing to an already visited node in current path)
        if (visitedNodeIds.has(hop.outputNodeId) || hop.inputNodeIds.includes(hop.outputNodeId)) {
          diagnostics.cyclesDetected++;
          diagnostics.cyclesRejected++;

          // Record rejected cyclic chain
          chains.push({
            id: `chain_cyclic_${this.hashString(hop.id)}`,
            hops: [...currentHops, hop],
            rootEvidenceNodeIds: [...rootNodeIds],
            terminalNodeId: hop.outputNodeId,
            terminalStatement: hop.outputStatement,
            chainDepth: currentHops.length + 1,
            status: "REJECTED",
            rejectionReason: "Cyclic reasoning dependency detected and rejected",
            primaryAuthority: "SYSTEM_DEFAULT",
            primaryAuthorityWeight: 0.1,
            confidence: 0,
            independentEvidenceCount: 0,
            scope: "GLOBAL",
            isPredictiveOnly: false,
            hasCycle: true,
            sanitizedExplanation: "Reasoning rejected due to circular logic path.",
          });
          continue;
        }

        const nextVisitedNodes = new Set(visitedNodeIds);
        nextVisitedNodes.add(hop.outputNodeId);
        nextVisitedNodes.add(currentNodeId);

        const nextVisitedHops = new Set(visitedHopIds);
        nextVisitedHops.add(hop.id);

        const updatedHop = { ...hop, hopIndex: depth };

        traverse(
          hop.outputNodeId,
          [...currentHops, updatedHop],
          nextVisitedNodes,
          nextVisitedHops,
          rootNodeIds,
          depth + 1
        );
      }
    };

    // Start traversal from all root evidence nodes
    for (const node of nodes) {
      const visitedNodes = new Set<string>([node.id]);
      const visitedHops = new Set<string>();
      traverse(node.id, [], visitedNodes, visitedHops, [node.id], 0);
    }

    // Sort chains deterministically by:
    // 1. Status (GROUNDED first)
    // 2. Primary Authority Weight (descending)
    // 3. Independent Evidence Count (descending)
    // 4. Confidence (descending)
    // 5. Chain Depth (ascending)
    // 6. ID tie-breaker
    chains.sort((a, b) => {
      const statusScore = (s: MultiHopChainStatus) => (s === "GROUNDED" ? 4 : s === "ADVISORY" ? 3 : s === "UNRESOLVED" ? 2 : 1);
      const diffStatus = statusScore(b.status) - statusScore(a.status);
      if (diffStatus !== 0) return diffStatus;

      const diffAuth = b.primaryAuthorityWeight - a.primaryAuthorityWeight;
      if (Math.abs(diffAuth) > 0.001) return diffAuth;

      const diffIndep = b.independentEvidenceCount - a.independentEvidenceCount;
      if (diffIndep !== 0) return diffIndep;

      const diffConf = b.confidence - a.confidence;
      if (Math.abs(diffConf) > 0.001) return diffConf;

      const diffDepth = a.chainDepth - b.chainDepth;
      if (diffDepth !== 0) return diffDepth;

      return a.id.localeCompare(b.id);
    });

    return chains;
  }

  /**
   * Synthesizes grounded conclusions from validated non-rejected reasoning chains.
   */
  private synthesizeConclusions(
    chains: MultiHopReasoningChain[],
    nodeMap: Map<string, MultiHopEvidenceNode>,
    diagnostics: MultiHopReasoningDiagnostics
  ): MultiHopGroundedConclusion[] {
    const conclusionMap = new Map<string, MultiHopGroundedConclusion>();

    for (const chain of chains) {
      if (chain.status === "REJECTED" || chain.hasCycle) continue;

      const normalizedStatement = this.sanitizeText(chain.terminalStatement, diagnostics);
      if (!normalizedStatement) continue;

      const dedupeKey = normalizedStatement.toLowerCase().trim();
      const existing = conclusionMap.get(dedupeKey);

      const rootKeys: string[] = [];
      const sources: string[] = [];
      for (const rId of chain.rootEvidenceNodeIds) {
        const rNode = nodeMap.get(rId);
        if (rNode) {
          rootKeys.push(rNode.normalizedKey);
          sources.push(rNode.provenance);
        }
      }

      const hopTypes = chain.hops.map((h) => h.inferenceType);

      if (!existing) {
        const concId = `conclusion_${this.hashString(dedupeKey)}`;
        const directive = this.createSanitizedDirective(
          normalizedStatement,
          chain.status === "ADVISORY",
          chain.confidence,
          chain.primaryAuthority
        );

        conclusionMap.set(dedupeKey, {
          id: concId,
          statement: normalizedStatement,
          chainIds: [chain.id],
          supportingEvidenceCount: chain.independentEvidenceCount,
          independentSources: Array.from(new Set(sources)),
          confidence: chain.confidence,
          authority: chain.primaryAuthority,
          scope: chain.scope,
          topic: chain.topic,
          isAdvisory: chain.isPredictiveOnly,
          traceableProvenance: {
            chainDepth: chain.chainDepth,
            rootEvidenceKeys: Array.from(new Set(rootKeys)),
            hopTypes,
          },
          sanitizedDirective: directive,
        });
      } else {
        // Merge supporting chains
        if (!existing.chainIds.includes(chain.id)) {
          existing.chainIds.push(chain.id);
        }
        existing.supportingEvidenceCount = Math.max(existing.supportingEvidenceCount, chain.independentEvidenceCount);
        existing.confidence = Math.max(existing.confidence, chain.confidence);
      }
    }

    const conclusions = Array.from(conclusionMap.values());
    conclusions.sort((a, b) => {
      const diffAuth = MULTI_HOP_AUTHORITY_WEIGHTS[b.authority] - MULTI_HOP_AUTHORITY_WEIGHTS[a.authority];
      if (Math.abs(diffAuth) > 0.001) return diffAuth;
      const diffConf = b.confidence - a.confidence;
      if (Math.abs(diffConf) > 0.001) return diffConf;
      return a.id.localeCompare(b.id);
    });

    return conclusions;
  }

  /**
   * Creates clean natural-language directive without internal IDs or floats.
   */
  private createSanitizedDirective(
    statement: string,
    isAdvisory: boolean,
    confidence: number,
    authority: MultiHopEvidenceAuthority
  ): string {
    const cleanStmt = statement.replace(/\b(?:node|hop|chain|cf|ev)_[0-9a-f_]+\b/gi, "").trim();

    if (isAdvisory || authority === "PREDICTIVE_CONTEXT") {
      return `[MULTI_HOP_REASONING] Contextual inference suggests ${cleanStmt}, though this remains advisory pending explicit confirmation.`;
    }

    if (confidence < 0.6) {
      return `[MULTI_HOP_REASONING] Preliminary reasoning indicates ${cleanStmt}, subject to further evidence.`;
    }

    return `[MULTI_HOP_REASONING] Verified reasoning confirms: ${cleanStmt}.`;
  }

  /**
   * Generates sanitized final prompt directives.
   */
  private generateSanitizedDirectives(
    conclusions: MultiHopGroundedConclusion[],
    chains: MultiHopReasoningChain[],
    maxDirectives: number,
    diagnostics: MultiHopReasoningDiagnostics
  ): string[] {
    const directives: string[] = [];

    for (const conc of conclusions) {
      if (directives.length >= maxDirectives) break;
      const d = conc.sanitizedDirective;
      if (d && !directives.includes(d)) {
        directives.push(d);
        diagnostics.directivesSanitized++;
      }
    }

    // If no conclusions, synthesize a general grounding statement from top chain if available
    if (directives.length === 0 && chains.length > 0 && chains[0].status === "GROUNDED") {
      const topChain = chains[0];
      const d = `Reasoning establishes: ${topChain.terminalStatement}.`;
      directives.push(d);
      diagnostics.directivesSanitized++;
    }

    return directives;
  }

  /**
 * Sanitize text against credentials and sensitive tokens.
 */
  private sanitizeText(text: string, diagnostics?: MultiHopReasoningDiagnostics): string {
    if (!text || typeof text !== "string") return "";
    let sanitized = text;

    for (const pattern of SENSITIVE_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(sanitized)) {
        if (diagnostics) {
          diagnostics.evidenceNodesRejected++;
        }
        pattern.lastIndex = 0;
        sanitized = sanitized.replace(pattern, "[REDACTED_CREDENTIAL]");
      }
    }

    return sanitized.trim();
  }

  /**
   * Checks for forbidden biographical identity dimensions.
   */
  private isForbiddenIdentityInference(text: string): boolean {
    if (!text || typeof text !== "string") return false;
    for (const pattern of FORBIDDEN_IDENTITY_DIMENSIONS) {
      pattern.lastIndex = 0;
      if (pattern.test(text)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Pure deterministic hash for generating stable IDs.
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).slice(0, 8);
  }
}

export const multiHopReasoningEngine = new MultiHopReasoningEngine();
