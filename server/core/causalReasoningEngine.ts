/**
 * Dora Causal & Counterfactual Reasoning Engine
 * Phase 3 — Step 3
 * 
 * Deterministic, bounded, non-LLM engine for evaluating causal relations,
 * necessity vs sufficiency, counterfactual scenarios, causal chains,
 * correlation vs causation differentiation, and post-hoc fallacy prevention.
 */

import {
  CausalReasoningAnalysis,
  CausalReasoningInput,
  CausalReasoningOptions,
  CausalEvidenceNode,
  CausalRelation,
  CausalRelationType,
  CausalChain,
  CounterfactualScenario,
  CounterfactualOutcome,
  NecessitySufficiencyClassification,
  CausalReasoningBudgetConfig,
  DEFAULT_CAUSAL_REASONING_BUDGET,
  CausalReasoningDiagnostics,
} from "./causalReasoningTypes";
import {
  ReasoningEvidenceAuthority,
  ReasoningEvidence,
} from "./deepReasoningTypes";

/**
 * Authority numeric ranking for deterministic comparison.
 * Lower number = higher authority.
 */
const AUTHORITY_RANK: Record<ReasoningEvidenceAuthority, number> = {
  CURRENT_TURN_EXPLICIT: 1,
  HARD_CONSTRAINT: 2,
  VERIFIED_EVIDENCE: 3,
  GOVERNANCE_APPROVED_MEMORY: 4,
  CONFIRMED_USER_MODEL: 5,
  ACTIVE_GOAL_PROJECT_COMMITMENT: 6,
  TEMPORAL_CONTEXT: 7,
  CONFIRMED_ADAPTIVE_PATTERN: 8,
  PREDICTIVE_CONTEXT: 9,
  SYSTEM_DEFAULT: 10,
};

/**
 * Sensitive credential patterns to sanitize.
 */
const SENSITIVE_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/gi,
  /ghp_[a-zA-Z0-9]{20,}/gi,
  /bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi,
  /password\s*[:=]\s*['"][^'"]+['"]/gi,
  /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
  /secret\s*[:=]\s*['"][^'"]+['"]/gi,
];

export class CausalReasoningEngine {
  /**
   * Main deterministic evaluation pipeline for causal and counterfactual reasoning.
   */
  public evaluate(input: CausalReasoningInput): CausalReasoningAnalysis {
    const startTime = input.options?.currentTime ?? 0;
    const budget: CausalReasoningBudgetConfig = {
      ...DEFAULT_CAUSAL_REASONING_BUDGET,
      ...(input.options?.budget || {}),
    };

    const diagnostics: CausalReasoningDiagnostics = {
      totalEvidenceNodesExamined: 0,
      totalRelationsIdentified: 0,
      directCausesCount: 0,
      indirectCausesCount: 0,
      correlationsIsolatedCount: 0,
      postHocFallaciesBlockedCount: 0,
      confoundedRelationsCount: 0,
      counterfactualsEvaluatedCount: 0,
      causalChainsConstructedCount: 0,
      topicIsolatedSuppressedCount: 0,
      sensitiveTokensSuppressedCount: 0,
      budgetTruncatedCount: 0,
      executionTimeMs: 0,
    };

    if (!input || typeof input !== "object") {
      return this.createEmptyAnalysis(diagnostics, "DEGRADED");
    }

    const message = (typeof input.message === "string" ? input.message : "").trim();
    const options = input.options || {};
    const strictTopicIsolation = !!options.strictTopicIsolation;
    const activeTopic = (options.activeTopic || input.context?.activeTopic || "").toLowerCase().trim();

    // 1. Extract and Normalize Causal Evidence Nodes
    const rawNodes = this.extractEvidenceNodes(input, diagnostics, strictTopicIsolation, activeTopic);
    diagnostics.totalEvidenceNodesExamined = rawNodes.length;

    // Apply node budget
    let nodes = rawNodes;
    if (nodes.length > budget.maxEvidenceNodes) {
      nodes = nodes.slice(0, budget.maxEvidenceNodes);
      diagnostics.budgetTruncatedCount++;
    }

    // 2. Discover and Classify Causal Relations
    const rawRelations = this.evaluateCausalRelations(message, nodes, input, diagnostics, activeTopic);
    diagnostics.totalRelationsIdentified = rawRelations.length;

    // Apply relation budget
    let relations = rawRelations;
    if (relations.length > budget.maxCausalRelations) {
      relations = relations.slice(0, budget.maxCausalRelations);
      diagnostics.budgetTruncatedCount++;
    }

    // Update diagnostic counts based on classified relations
    for (const rel of relations) {
      if (rel.relationType === "DIRECT_CAUSE" || rel.relationType === "NECESSARY_AND_SUFFICIENT") {
        diagnostics.directCausesCount++;
      } else if (rel.relationType === "INDIRECT_CAUSE") {
        diagnostics.indirectCausesCount++;
      } else if (rel.relationType === "CORRELATION_ONLY" || rel.relationType === "COINCIDENCE") {
        diagnostics.correlationsIsolatedCount++;
      } else if (rel.relationType === "CONFOUNDED") {
        diagnostics.confoundedRelationsCount++;
      }
    }

    // 3. Construct Causal Chains & Detect Confounders
    const rawChains = this.constructCausalChains(nodes, relations, diagnostics);
    diagnostics.causalChainsConstructedCount = rawChains.length;

    let chains = rawChains;
    if (chains.length > budget.maxCausalChains) {
      chains = chains.slice(0, budget.maxCausalChains);
      diagnostics.budgetTruncatedCount++;
    }

    // 4. Evaluate Counterfactual Scenarios
    const rawCounterfactuals = this.evaluateCounterfactuals(
      message,
      nodes,
      relations,
      chains,
      input,
      diagnostics
    );
    diagnostics.counterfactualsEvaluatedCount = rawCounterfactuals.length;

    let counterfactuals = rawCounterfactuals;
    if (counterfactuals.length > budget.maxCounterfactuals) {
      counterfactuals = counterfactuals.slice(0, budget.maxCounterfactuals);
      diagnostics.budgetTruncatedCount++;
    }

    // 5. Synthesize Sanitized Causal Directives
    const activeDirectives = this.synthesizeDirectives(
      relations,
      chains,
      counterfactuals,
      budget.maxDirectives,
      diagnostics
    );

    // Primary Causal Claim determination
    let primaryCausalClaim: string | undefined;
    if (relations.length > 0) {
      const topRel = relations[0];
      primaryCausalClaim = `[${topRel.relationType}] ${topRel.causeStatement} -> ${topRel.effectStatement}`;
    }

    const status = diagnostics.budgetTruncatedCount > 0
      ? "BUDGET_TRUNCATED"
      : relations.length === 0 && counterfactuals.length === 0
      ? "EMPTY"
      : "COMPLETE";

    return {
      status,
      primaryCausalClaim,
      nodes,
      relations,
      chains,
      counterfactuals,
      activeDirectives,
      diagnostics,
    };
  }

  /**
   * Extract evidence nodes from input message, executive context, deep reasoning, temporal memory, etc.
   */
  private extractEvidenceNodes(
    input: CausalReasoningInput,
    diagnostics: CausalReasoningDiagnostics,
    strictTopicIsolation: boolean,
    activeTopic: string
  ): CausalEvidenceNode[] {
    const nodes: CausalEvidenceNode[] = [];
    const seenStatements = new Set<string>();

    const addNode = (
      label: string,
      statement: string,
      authority: ReasoningEvidenceAuthority,
      sourceType: CausalEvidenceNode["sourceType"],
      scope: string = "global",
      timestamp?: number,
      confidence: number = 0.9
    ) => {
      const sanitizedStatement = this.sanitizeText(statement, diagnostics);
      const normalizedKey = sanitizedStatement.toLowerCase().trim();

      if (!normalizedKey || seenStatements.has(normalizedKey)) {
        return;
      }

      // Check topic isolation
      if (strictTopicIsolation && activeTopic && scope && scope !== "global") {
        const normalizedScope = scope.toLowerCase().trim();
        if (normalizedScope !== activeTopic && !normalizedScope.includes(activeTopic) && !activeTopic.includes(normalizedScope)) {
          diagnostics.topicIsolatedSuppressedCount++;
          return;
        }
      }

      seenStatements.add(normalizedKey);
      const nodeId = `node_${nodes.length + 1}_${this.hashString(normalizedKey)}`;
      nodes.push({
        id: nodeId,
        label: this.sanitizeText(label, diagnostics),
        statement: sanitizedStatement,
        authority,
        scope,
        timestamp,
        isObserved: true,
        confidence,
        sourceType,
      });
    };

    // 1. Extract from Current Turn Message
    const message = (input.message || "").trim();
    if (message) {
      addNode(
        "Current Turn Assertion",
        message,
        "CURRENT_TURN_EXPLICIT",
        "USER_ASSERTION",
        activeTopic || "global",
        input.options?.currentTime,
        1.0
      );
    }

    // 2. Extract from Executive Context Authoritative Facts
    if (input.executiveContext?.authoritativeFacts) {
      for (const fact of input.executiveContext.authoritativeFacts) {
        addNode(
          fact.key || "Authoritative Fact",
          fact.value || fact.sanitizedDirective,
          fact.authority || "VERIFIED_EVIDENCE",
          "SYSTEM_FACT",
          fact.topic || (fact.isGlobal ? "GLOBAL" : "global"),
          undefined,
          fact.confidence ?? 0.95
        );
      }
    }

    // 3. Extract from Deep Reasoning Evidence
    if (input.deepReasoning?.evidence) {
      for (const ev of input.deepReasoning.evidence) {
        addNode(
          ev.normalizedKey || ev.source || "Deep Reasoning Evidence",
          ev.statement,
          ev.authority,
          ev.authority === "CURRENT_TURN_EXPLICIT" ? "USER_ASSERTION" : "SYSTEM_FACT",
          typeof ev.scope === "string" ? ev.scope : "global",
          ev.timestamp,
          ev.reliability ?? 0.9
        );
      }
    }

    // 4. Extract from Contradiction Resolution Revisions
    if (input.contradictionResolution?.revisions) {
      for (const rev of input.contradictionResolution.revisions) {
        if (rev.revisedBelief) {
          addNode(
            `Revised Belief: ${rev.targetSubject}`,
            rev.revisedBelief,
            "VERIFIED_EVIDENCE",
            "SYSTEM_FACT",
            rev.scope || "global",
            undefined,
            rev.confidence ?? 0.9
          );
        }
      }
    }

    // 5. Extract from Temporal Memory transitions & events
    if (input.temporalMemory?.evolutions) {
      for (const trans of input.temporalMemory.evolutions) {
        addNode(
          `Temporal Event: ${trans.attributeKey}`,
          trans.sanitizedSummary || `Transitioned to ${trans.currentValue}`,
          "TEMPORAL_CONTEXT",
          "TEMPORAL_EVENT",
          "global",
          trans.transitionTimestamp,
          0.9
        );
      }
    }

    // 6. Extract from Goal/Project commitments & blockers
    if (input.goalProject?.activeProjects) {
      for (const proj of input.goalProject.activeProjects) {
        addNode(
          `Project: ${proj.name}`,
          `${proj.name} status is ${proj.status}${proj.blockerDescription ? ` with blockers: ${proj.blockerDescription}` : ""}`,
          "ACTIVE_GOAL_PROJECT_COMMITMENT",
          "SYSTEM_FACT",
          proj.name,
          undefined,
          proj.confidence ?? 0.9
        );
      }
    }

    // 7. Extract from Predictive Context Candidates (Advisory)
    if (input.predictiveContext?.acceptedCandidates) {
      for (const cand of input.predictiveContext.acceptedCandidates) {
        addNode(
          `Predictive Signal: ${cand.topic || cand.predictionType}`,
          cand.contextSummary,
          "PREDICTIVE_CONTEXT",
          "PREDICTIVE_INFERENCE",
          cand.topic || "global",
          undefined,
          cand.confidence * 0.7 // Bounded down to prevent elevating prediction over fact
        );
      }
    }

    // Sort deterministically: Authority rank ascending, confidence descending, label ascending
    return nodes.sort((a, b) => {
      const authA = AUTHORITY_RANK[a.authority] ?? 99;
      const authB = AUTHORITY_RANK[b.authority] ?? 99;
      if (authA !== authB) return authA - authB;
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return a.label.localeCompare(b.label);
    });
  }

  /**
   * Evaluate and classify causal relations between evidence nodes and message clauses.
   */
  private evaluateCausalRelations(
    message: string,
    nodes: CausalEvidenceNode[],
    input: CausalReasoningInput,
    diagnostics: CausalReasoningDiagnostics,
    activeTopic: string
  ): CausalRelation[] {
    const relations: CausalRelation[] = [];
    const lowerMessage = message.toLowerCase();

    // 1. Analyze explicit current-turn causal statements
    const explicitTurnRelations = this.extractExplicitTurnCausalRelations(message, nodes, diagnostics, activeTopic);
    for (const rel of explicitTurnRelations) {
      relations.push(rel);
    }

    // 2. Extract causal statements from other authoritative/evidence nodes
    for (const node of nodes) {
      if (node.sourceType !== "USER_ASSERTION") {
        const nodeRels = this.extractExplicitTurnCausalRelations(node.statement, nodes, diagnostics, node.scope || activeTopic);
        for (const rel of nodeRels) {
          // Adjust authority to match node authority
          rel.evidenceAuthority = node.authority;
          rel.isCurrentTurnExplicit = false;
          const existing = relations.find(r => r.causeStatement.toLowerCase() === rel.causeStatement.toLowerCase() && r.effectStatement.toLowerCase() === rel.effectStatement.toLowerCase());
          if (!existing) {
            relations.push(rel);
          }
        }
      }
    }

    // 3. Inter-node causal evaluations
    for (let i = 0; i < nodes.length; i++) {
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const nodeA = nodes[i];
        const nodeB = nodes[j];

        // Check if relation already captured
        const existing = relations.find(r => r.causeId === nodeA.id && r.effectId === nodeB.id);
        if (existing) continue;

        const evaluatedRel = this.evaluateNodePairCausality(nodeA, nodeB, lowerMessage, diagnostics, activeTopic);
        if (evaluatedRel) {
          relations.push(evaluatedRel);
        }
      }
    }

    // Deterministically sort relations: authority rank asc, confidence desc, causeStatement asc
    return relations.sort((a, b) => {
      const rankA = AUTHORITY_RANK[a.evidenceAuthority] ?? 99;
      const rankB = AUTHORITY_RANK[b.evidenceAuthority] ?? 99;
      if (rankA !== rankB) return rankA - rankB;
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return a.causeStatement.localeCompare(b.causeStatement);
    });
  }

  /**
   * Extract causal relations explicitly asserted in the user message.
   */
  private extractExplicitTurnCausalRelations(
    message: string,
    nodes: CausalEvidenceNode[],
    diagnostics: CausalReasoningDiagnostics,
    activeTopic: string
  ): CausalRelation[] {
    const relations: CausalRelation[] = [];
    if (!message) return relations;

    const lower = message.toLowerCase();

    // Pattern 1: A caused B / A leads to B / A resulted in B / A because B
    // Direct cause patterns
    const directPatterns = [
      { regex: /(.*?)\s+(?:caused|leads to|led to|resulted in|triggered|broke|crashed)\s+(.*)/i, order: "CAUSE_FIRST" },
      { regex: /(.*?)\s+(?:because of|due to|as a result of)\s+(.*)/i, order: "EFFECT_FIRST" },
      { regex: /(.*?)\s+because\s+(.*)/i, order: "EFFECT_FIRST" },
      { regex: /if\s+(.*?)(?:,\s*then|\s+then|,)\s+(.*)/i, order: "CAUSE_FIRST" },
    ];

    // Check contributory factor patterns
    const contributoryPatterns = [
      /(.*?)\s+(?:is a contributory factor to|contributed to|contributes to|is a contributing factor to|partially causes|contributes towards)\s+(.*)/i,
    ];

    // Check correlation only patterns
    const correlationPatterns = [
      /(.*?)\s+(?:is correlated with|correlates with|is associated with|co-occurs with|happens alongside)\s+(.*)/i,
      /(.*?)\s+happened\s+(?:then|after)\s+(.*?)\s+(?:so it caused it|\?|did it cause)/i,
      /(.*?)\s+at the same time as\s+(.*)/i,
    ];

    // Check necessary condition patterns
    const necessaryPatterns = [
      /(.*?)\s+(?:is necessary for|is required for|requires|only happens if|cannot happen without)\s+(.*)/i,
      /without\s+(.*?)[,\s]+(?:we cannot|there is no|it fails to)\s+(.*)/i,
    ];

    // Check sufficient condition patterns
    const sufficientPatterns = [
      /(.*?)\s+(?:is sufficient for|guarantees|always produces|always leads to)\s+(.*)/i,
      /whenever\s+(.*?)[,\s]+(?:it always|always)\s+(.*)/i,
    ];

    // Check necessary and sufficient patterns
    const biconditionalPatterns = [
      /(.*?)\s+(?:if and only if|iff|is necessary and sufficient for)\s+(.*)/i,
    ];

    // Check reverse causation patterns
    const reversePatterns = [
      /(.*?)\s+(?:is actually caused by|was caused by the effect|reverse causation)\s+(.*)/i,
    ];

    // Check confounding patterns
    const confoundingPatterns = [
      /(.*?)\s+and\s+(.*?)\s+(?:are both caused by|share a common cause|confounded by)\s+(.*)/i,
    ];

    // Check post hoc ergo propter hoc fallacy avoidance
    // e.g. "A happened before B, therefore A caused B" or "A happened then B happened"
    const postHocPatterns = [
      /(.*?)\s+(?:happened before|preceded)\s+(.*?)(?:,\s*therefore it caused|\s+so it caused)/i,
      /after\s+(.*?)\s*,\s*(.*?)\s+happened/i,
    ];

    // Process Biconditional (Necessary & Sufficient)
    for (const pattern of biconditionalPatterns) {
      const match = lower.match(pattern);
      if (match && match[1] && match[2]) {
        const cause = this.sanitizeText(match[1].trim(), diagnostics);
        const effect = this.sanitizeText(match[2].trim(), diagnostics);
        relations.push(this.createRelation(
          cause,
          effect,
          "NECESSARY_AND_SUFFICIENT",
          1.0,
          1.0,
          0.98,
          "CURRENT_TURN_EXPLICIT",
          "Explicit biconditional relationship asserted in current turn",
          activeTopic || "global",
          true,
          true
        ));
        return relations;
      }
    }

    // Process Confounding
    for (const pattern of confoundingPatterns) {
      const match = lower.match(pattern);
      if (match && match[1] && match[2] && match[3]) {
        const factorA = this.sanitizeText(match[1].trim(), diagnostics);
        const factorB = this.sanitizeText(match[2].trim(), diagnostics);
        const confounder = this.sanitizeText(match[3].trim(), diagnostics);

        relations.push(this.createRelation(
          factorA,
          factorB,
          "CONFOUNDED",
          0.2,
          0.2,
          0.9,
          "CURRENT_TURN_EXPLICIT",
          `Common confounding factor identified: ${confounder}`,
          activeTopic || "global",
          true,
          false,
          [confounder]
        ));
        return relations;
      }
    }

    // Process Reverse Causation
    for (const pattern of reversePatterns) {
      const match = lower.match(pattern);
      if (match && match[1] && match[2]) {
        const effect = this.sanitizeText(match[1].trim(), diagnostics);
        const cause = this.sanitizeText(match[2].trim(), diagnostics);
        relations.push(this.createRelation(
          cause,
          effect,
          "REVERSE_CAUSATION",
          0.8,
          0.8,
          0.9,
          "CURRENT_TURN_EXPLICIT",
          "Reverse causal direction explicitly asserted in current turn",
          activeTopic || "global",
          true,
          true
        ));
        return relations;
      }
    }

    // Process Necessary Condition
    for (const pattern of necessaryPatterns) {
      const match = lower.match(pattern);
      if (match && match[1] && match[2]) {
        const cause = this.sanitizeText(match[1].trim(), diagnostics);
        const effect = this.sanitizeText(match[2].trim(), diagnostics);
        relations.push(this.createRelation(
          cause,
          effect,
          "NECESSARY_CONDITION",
          0.95,
          0.4,
          0.95,
          "CURRENT_TURN_EXPLICIT",
          "Explicit necessary condition asserted (~Cause -> ~Effect)",
          activeTopic || "global",
          true,
          true
        ));
        return relations;
      }
    }

    // Process Sufficient Condition
    for (const pattern of sufficientPatterns) {
      const match = lower.match(pattern);
      if (match && match[1] && match[2]) {
        const cause = this.sanitizeText(match[1].trim(), diagnostics);
        const effect = this.sanitizeText(match[2].trim(), diagnostics);
        relations.push(this.createRelation(
          cause,
          effect,
          "SUFFICIENT_CONDITION",
          0.4,
          0.95,
          0.95,
          "CURRENT_TURN_EXPLICIT",
          "Explicit sufficient condition asserted (Cause -> Effect)",
          activeTopic || "global",
          true,
          true
        ));
        return relations;
      }
    }

    // Process Contributory Factor
    for (const pattern of contributoryPatterns) {
      const match = lower.match(pattern);
      if (match && match[1] && match[2]) {
        const cause = this.sanitizeText(match[1].trim(), diagnostics);
        const effect = this.sanitizeText(match[2].trim(), diagnostics);
        relations.push(this.createRelation(
          cause,
          effect,
          "CONTRIBUTORY_FACTOR",
          0.5,
          0.6,
          0.9,
          "CURRENT_TURN_EXPLICIT",
          "Explicit contributory factor asserted",
          activeTopic || "global",
          true,
          true
        ));
        return relations;
      }
    }

    // Process Correlation Only
    for (const pattern of correlationPatterns) {
      const match = lower.match(pattern);
      if (match && match[1] && match[2]) {
        const a = this.sanitizeText(match[1].trim(), diagnostics);
        const b = this.sanitizeText(match[2].trim(), diagnostics);
        diagnostics.postHocFallaciesBlockedCount++;
        relations.push(this.createRelation(
          a,
          b,
          "CORRELATION_ONLY",
          0.2,
          0.2,
          0.85,
          "CURRENT_TURN_EXPLICIT",
          "Statistical or temporal correlation observed without proven causal mechanism",
          activeTopic || "global",
          true,
          true
        ));
        return relations;
      }
    }

    // Process Post-Hoc Fallacy Avoidance (e.g. "A happened before B, did A cause B?")
    for (const pattern of postHocPatterns) {
      const match = lower.match(pattern);
      if (match && match[1] && match[2]) {
        const a = this.sanitizeText(match[1].trim(), diagnostics);
        const b = this.sanitizeText(match[2].trim(), diagnostics);
        diagnostics.postHocFallaciesBlockedCount++;
        relations.push(this.createRelation(
          a,
          b,
          "CORRELATION_ONLY",
          0.1,
          0.1,
          0.8,
          "CURRENT_TURN_EXPLICIT",
          "Temporal sequence alone does not establish causality (post hoc fallacy avoided)",
          activeTopic || "global",
          true,
          true
        ));
        return relations;
      }
    }

    // Process Direct Causal Patterns
    for (const item of directPatterns) {
      const match = lower.match(item.regex);
      if (match && match[1] && match[2]) {
        let cause = match[1].trim();
        let effect = match[2].trim();
        if (item.order === "EFFECT_FIRST") {
          const temp = cause;
          cause = effect;
          effect = temp;
        }

        cause = this.sanitizeText(cause, diagnostics);
        effect = this.sanitizeText(effect, diagnostics);

        relations.push(this.createRelation(
          cause,
          effect,
          "DIRECT_CAUSE",
          0.85,
          0.9,
          0.95,
          "CURRENT_TURN_EXPLICIT",
          "Direct causal dependency asserted in current turn",
          activeTopic || "global",
          true,
          true
        ));
        return relations;
      }
    }

    return relations;
  }

  /**
   * Evaluate causality between two structured evidence nodes.
   */
  private evaluateNodePairCausality(
    nodeA: CausalEvidenceNode,
    nodeB: CausalEvidenceNode,
    message: string,
    diagnostics: CausalReasoningDiagnostics,
    activeTopic: string
  ): CausalRelation | null {
    // Cross-topic isolation check
    if (nodeA.scope && nodeB.scope && nodeA.scope !== "global" && nodeB.scope !== "global" && nodeA.scope !== nodeB.scope) {
      diagnostics.topicIsolatedSuppressedCount++;
      return null;
    }

    // Check temporal ordering if timestamps exist
    let temporalOrderValid = true;
    if (nodeA.timestamp !== undefined && nodeB.timestamp !== undefined) {
      if (nodeA.timestamp > nodeB.timestamp) {
        temporalOrderValid = false; // Cause cannot be in the future of Effect
      }
    }

    if (!temporalOrderValid) {
      return null;
    }

    const stmtA = nodeA.statement.toLowerCase();
    const stmtB = nodeB.statement.toLowerCase();

    // Check if nodeA mentions causing nodeB
    const causesWords = ["cause", "leads to", "resulted in", "broke", "crash", "trigger", "blocker", "blocked"];
    let isCausal = false;
    let mechanism: string | undefined;

    for (const word of causesWords) {
      if (stmtA.includes(word) && (stmtA.includes(nodeB.label.toLowerCase()) || stmtB.includes(nodeA.label.toLowerCase()))) {
        isCausal = true;
        mechanism = `Detected causal keyword '${word}' linking ${nodeA.label} to ${nodeB.label}`;
        break;
      }
    }

    // Check authority
    const rankA = AUTHORITY_RANK[nodeA.authority] ?? 99;
    const rankB = AUTHORITY_RANK[nodeB.authority] ?? 99;
    const authority = rankA <= rankB ? nodeA.authority : nodeB.authority;

    if (isCausal) {
      return this.createRelation(
        nodeA.statement,
        nodeB.statement,
        "DIRECT_CAUSE",
        0.8,
        0.85,
        Math.min(nodeA.confidence, nodeB.confidence),
        authority,
        mechanism || "Evidence-backed causal mechanism",
        nodeA.scope || activeTopic || "global",
        false,
        true,
        [],
        nodeA.id,
        nodeB.id
      );
    }

    // If only temporal adjacency without mechanism -> Post hoc protection
    if (nodeA.timestamp !== undefined && nodeB.timestamp !== undefined && nodeA.timestamp < nodeB.timestamp) {
      // If message does not establish mechanism, classify as correlation only
      if (!message.includes("because") && !message.includes("caused")) {
        diagnostics.postHocFallaciesBlockedCount++;
        return this.createRelation(
          nodeA.statement,
          nodeB.statement,
          "CORRELATION_ONLY",
          0.1,
          0.1,
          0.7,
          authority,
          "Temporal sequence without proven causal mechanism (post hoc avoided)",
          nodeA.scope || activeTopic || "global",
          false,
          true,
          [],
          nodeA.id,
          nodeB.id
        );
      }
    }

    return null;
  }

  /**
   * Construct multi-step causal chains (A -> B -> C) and identify intermediate/confounding variables.
   */
  private constructCausalChains(
    nodes: CausalEvidenceNode[],
    relations: CausalRelation[],
    diagnostics: CausalReasoningDiagnostics
  ): CausalChain[] {
    const chains: CausalChain[] = [];
    const directRelMap = new Map<string, CausalRelation[]>();

    for (const rel of relations) {
      if (rel.relationType === "DIRECT_CAUSE" || rel.relationType === "SUFFICIENT_CONDITION" || rel.relationType === "NECESSARY_CONDITION" || rel.relationType === "NECESSARY_AND_SUFFICIENT") {
        const list = directRelMap.get(rel.causeId) || [];
        list.push(rel);
        directRelMap.set(rel.causeId, list);
      }
    }

    // Build chains of length >= 2
    for (const rel1 of relations) {
      if (rel1.relationType !== "DIRECT_CAUSE" && rel1.relationType !== "SUFFICIENT_CONDITION" && rel1.relationType !== "NECESSARY_CONDITION" && rel1.relationType !== "NECESSARY_AND_SUFFICIENT") {
        continue;
      }

      for (const rel2 of relations) {
        if (rel1 === rel2) continue;
        if (rel2.relationType !== "DIRECT_CAUSE" && rel2.relationType !== "SUFFICIENT_CONDITION" && rel2.relationType !== "NECESSARY_CONDITION" && rel2.relationType !== "NECESSARY_AND_SUFFICIENT") {
          continue;
        }

        const eff1 = rel1.effectStatement.toLowerCase().trim();
        const cause2 = rel2.causeStatement.toLowerCase().trim();

        const isLinked = rel1.effectId === rel2.causeId || eff1 === cause2 || eff1.includes(cause2) || cause2.includes(eff1);

        if (isLinked && rel1.causeStatement.toLowerCase() !== rel2.effectStatement.toLowerCase()) {
          const chainRelations = [rel1, rel2];
          const stepNodeIds = [rel1.causeId, rel1.effectId, rel2.effectId];
          const chainId = `chain_${chains.length + 1}_${this.hashString(`${rel1.id}->${rel2.id}`)}`;

          const exists = chains.some(c => c.description === `${rel1.causeStatement} -> ${rel1.effectStatement} -> ${rel2.effectStatement}`);
          if (!exists) {
            chains.push({
              id: chainId,
              rootCauseId: rel1.causeId,
              finalEffectId: rel2.effectId,
              stepNodeIds,
              relations: chainRelations,
              chainLength: 2,
              overallConfidence: rel1.confidence * rel2.confidence,
              bottleneckNodeId: rel1.effectId,
              description: `${rel1.causeStatement} -> ${rel1.effectStatement} -> ${rel2.effectStatement}`,
            });
          }
        }
      }
    }

    // Deterministically sort chains
    return chains.sort((a, b) => {
      if (b.overallConfidence !== a.overallConfidence) return b.overallConfidence - a.overallConfidence;
      return a.description.localeCompare(b.description);
    });
  }

  /**
   * Evaluate counterfactual scenarios (~A -> B?).
   */
  private evaluateCounterfactuals(
    message: string,
    nodes: CausalEvidenceNode[],
    relations: CausalRelation[],
    chains: CausalChain[],
    input: CausalReasoningInput,
    diagnostics: CausalReasoningDiagnostics
  ): CounterfactualScenario[] {
    const scenarios: CounterfactualScenario[] = [];
    const lowerMessage = message.toLowerCase();

    // Check if user is asking a counterfactual question: "what if", "if we had not", "had I not"
    const isCounterfactualQuery =
      lowerMessage.includes("what if") ||
      lowerMessage.includes("if we had not") ||
      lowerMessage.includes("if i hadn't") ||
      lowerMessage.includes("what would happen if") ||
      lowerMessage.includes("had we used") ||
      lowerMessage.includes("if not for");

    // 1. If explicit counterfactual query, build direct scenario
    if (isCounterfactualQuery) {
      for (const rel of relations) {
        let projectedOutcome: CounterfactualOutcome = "UNCERTAIN";
        let outcomeExplanation = "";
        let necessityEstablished = false;
        let distance = 0.2;

        if (rel.relationType === "NECESSARY_CONDITION" || rel.relationType === "NECESSARY_AND_SUFFICIENT") {
          projectedOutcome = "WOULD_NOT_HAPPEN";
          outcomeExplanation = `Since '${rel.causeStatement}' is a necessary condition, removing it prevents '${rel.effectStatement}'.`;
          necessityEstablished = true;
          distance = 0.1;
        } else if (rel.relationType === "DIRECT_CAUSE") {
          if (rel.necessityScore >= 0.8) {
            projectedOutcome = "WOULD_NOT_HAPPEN";
            outcomeExplanation = `In the closest possible counterfactual world where '${rel.causeStatement}' did not occur, '${rel.effectStatement}' would not have manifested.`;
            necessityEstablished = true;
            distance = 0.15;
          } else {
            projectedOutcome = "PARTIALLY_MODIFIED";
            outcomeExplanation = `Without '${rel.causeStatement}', '${rel.effectStatement}' would likely have been altered or mitigated.`;
            distance = 0.3;
          }
        } else if (rel.relationType === "CORRELATION_ONLY" || rel.relationType === "COINCIDENCE") {
          projectedOutcome = "WOULD_STILL_HAPPEN";
          outcomeExplanation = `Because '${rel.causeStatement}' and '${rel.effectStatement}' are only correlated without causal dependency, altering the antecedent does not guarantee altering the outcome.`;
          distance = 0.4;
        } else if (rel.relationType === "SUFFICIENT_CONDITION") {
          projectedOutcome = "UNCERTAIN";
          outcomeExplanation = `While '${rel.causeStatement}' is sufficient to produce '${rel.effectStatement}', alternative causes may still produce it in its absence.`;
          distance = 0.35;
        }

        const scenarioId = `cf_${scenarios.length + 1}_${this.hashString(rel.id)}`;
        scenarios.push({
          id: scenarioId,
          scenarioName: `Counterfactual: Negation of ${rel.causeStatement.slice(0, 30)}`,
          targetRelationId: rel.id,
          antecedentModification: {
            originalCondition: rel.causeStatement,
            counterfactualPremise: `Suppose NOT(${rel.causeStatement})`,
            inversionType: "NEGATION",
          },
          consequentEvaluation: {
            targetEffect: rel.effectStatement,
            projectedOutcome,
            outcomeExplanation,
            counterfactualNecessityEstablished: necessityEstablished,
            closestWorldDistance: distance,
          },
          confidence: rel.confidence,
          isGroundedInVerifiedFacts: rel.evidenceAuthority !== "PREDICTIVE_CONTEXT",
        });
      }
    }

    // 2. Default counterfactual for top direct causal relations to ensure deep analytical support
    if (scenarios.length === 0 && relations.length > 0) {
      const topRel = relations[0];
      if (topRel.relationType === "DIRECT_CAUSE" || topRel.relationType === "NECESSARY_CONDITION" || topRel.relationType === "NECESSARY_AND_SUFFICIENT") {
        const scenarioId = `cf_${scenarios.length + 1}_${this.hashString(topRel.id)}`;
        scenarios.push({
          id: scenarioId,
          scenarioName: `Baseline Counterfactual for ${topRel.causeStatement.slice(0, 30)}`,
          targetRelationId: topRel.id,
          antecedentModification: {
            originalCondition: topRel.causeStatement,
            counterfactualPremise: `If '${topRel.causeStatement}' had not occurred`,
            inversionType: "NEGATION",
          },
          consequentEvaluation: {
            targetEffect: topRel.effectStatement,
            projectedOutcome: topRel.necessityScore >= 0.75 ? "WOULD_NOT_HAPPEN" : "PARTIALLY_MODIFIED",
            outcomeExplanation: `Under the minimal counterfactual perturbation, removing '${topRel.causeStatement}' mitigates '${topRel.effectStatement}'.`,
            counterfactualNecessityEstablished: topRel.necessityScore >= 0.75,
            closestWorldDistance: 0.15,
          },
          confidence: topRel.confidence,
          isGroundedInVerifiedFacts: topRel.evidenceAuthority !== "PREDICTIVE_CONTEXT",
        });
      }
    }

    // Deterministically sort counterfactuals
    return scenarios.sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return a.scenarioName.localeCompare(b.scenarioName);
    });
  }

  /**
   * Synthesize clean, human-readable directives free of raw internal IDs or credentials.
   */
  private synthesizeDirectives(
    relations: CausalRelation[],
    chains: CausalChain[],
    counterfactuals: CounterfactualScenario[],
    maxDirectives: number,
    diagnostics: CausalReasoningDiagnostics
  ): string[] {
    const directives: string[] = [];

    // 1. Direct and necessary causal directives
    for (const rel of relations) {
      if (directives.length >= maxDirectives) break;

      if (rel.relationType === "DIRECT_CAUSE" || rel.relationType === "NECESSARY_AND_SUFFICIENT") {
        const d = `Acknowledge direct causal link: "${rel.causeStatement}" directly caused "${rel.effectStatement}".`;
        directives.push(this.sanitizeText(d, diagnostics));
      } else if (rel.relationType === "NECESSARY_CONDITION") {
        const d = `Enforce necessary condition: "${rel.effectStatement}" strictly requires "${rel.causeStatement}".`;
        directives.push(this.sanitizeText(d, diagnostics));
      } else if (rel.relationType === "CORRELATION_ONLY") {
        const d = `Maintain correlation caution: "${rel.causeStatement}" and "${rel.effectStatement}" are correlated in time, but direct causation is unverified.`;
        directives.push(this.sanitizeText(d, diagnostics));
      } else if (rel.relationType === "CONFOUNDED") {
        const d = `Account for confounding factor: The relationship between "${rel.causeStatement}" and "${rel.effectStatement}" is mediated by a common cause.`;
        directives.push(this.sanitizeText(d, diagnostics));
      }
    }

    // 2. Chain directives
    for (const chain of chains) {
      if (directives.length >= maxDirectives) break;
      const d = `Recognize causal sequence: ${chain.description}.`;
      directives.push(this.sanitizeText(d, diagnostics));
    }

    // 3. Counterfactual insights
    for (const cf of counterfactuals) {
      if (directives.length >= maxDirectives) break;
      if (cf.consequentEvaluation.counterfactualNecessityEstablished) {
        const d = `Counterfactual analysis indicates: In the absence of "${cf.antecedentModification.originalCondition}", "${cf.consequentEvaluation.targetEffect}" would not have occurred.`;
        directives.push(this.sanitizeText(d, diagnostics));
      }
    }

    // Scrub any remaining raw internal IDs or duplicate directives
    const uniqueCleanDirectives: string[] = [];
    for (const dir of directives) {
      const scrubbed = dir
        .replace(/\bnode_\d+_[a-f0-9]+\b/gi, "")
        .replace(/\bcausal_\w+_\d+\b/gi, "")
        .replace(/\bcf_\d+_[a-f0-9]+\b/gi, "")
        .replace(/\bchain_\d+_[a-f0-9]+\b/gi, "")
        .trim();

      if (scrubbed && !uniqueCleanDirectives.includes(scrubbed)) {
        uniqueCleanDirectives.push(scrubbed);
      }
    }

    return uniqueCleanDirectives.slice(0, maxDirectives);
  }

  /**
   * Helper to create a fully formed CausalRelation object.
   */
  private createRelation(
    cause: string,
    effect: string,
    relationType: CausalRelationType,
    necessityScore: number,
    sufficiencyScore: number,
    confidence: number,
    evidenceAuthority: ReasoningEvidenceAuthority,
    mechanism: string,
    scope: string,
    isCurrentTurnExplicit: boolean,
    isPostHocFallacyAvoided: boolean,
    confoundingFactors: string[] = [],
    causeId?: string,
    effectId?: string
  ): CausalRelation {
    const cId = causeId || `cause_${this.hashString(cause)}`;
    const eId = effectId || `effect_${this.hashString(effect)}`;
    const relId = `causal_${relationType.toLowerCase()}_${this.hashString(`${cause}->${effect}`)}`;

    return {
      id: relId,
      causeId: cId,
      effectId: eId,
      causeStatement: cause,
      effectStatement: effect,
      relationType,
      necessityScore,
      sufficiencyScore,
      confidence,
      evidenceAuthority,
      temporalOrderValid: true,
      isPostHocFallacyAvoided,
      mechanism,
      interveningVariables: [],
      confoundingFactors,
      scope,
      isCurrentTurnExplicit,
    };
  }

  /**
   * Sanitize text against credentials and sensitive tokens.
   */
  private sanitizeText(text: string, diagnostics: CausalReasoningDiagnostics): string {
    if (!text || typeof text !== "string") return "";
    let sanitized = text;

    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(sanitized)) {
        diagnostics.sensitiveTokensSuppressedCount++;
        sanitized = sanitized.replace(pattern, "[REDACTED_CREDENTIAL]");
      }
    }

    return sanitized.trim();
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

  /**
   * Helper to produce an empty/degraded analysis output.
   */
  private createEmptyAnalysis(
    diagnostics: CausalReasoningDiagnostics,
    status: CausalReasoningAnalysis["status"] = "EMPTY"
  ): CausalReasoningAnalysis {
    return {
      status,
      nodes: [],
      relations: [],
      chains: [],
      counterfactuals: [],
      activeDirectives: [],
      diagnostics,
    };
  }
}

export const causalReasoningEngine = new CausalReasoningEngine();
