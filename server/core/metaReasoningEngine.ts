/**
 * Dora Meta-Reasoning & Self-Critique Engine
 * Phase 3 — Step 7
 * 
 * Deterministic, non-LLM, read-only, side-effect-free cognitive audit engine.
 * Audits reasoning outputs across grounding, epistemic calibration, coherence,
 * causal justification, multi-hop chains, simulation reality boundaries,
 * assumptions, temporal boundaries, and hard constraints.
 */

import {
  MetaReasoningInput,
  MetaReasoningAnalysis,
  MetaReasoningOptions,
  MetaReasoningBudgetConfig,
  MetaReasoningDiagnostics,
  MetaReasoningIssueType,
  CritiqueSeverity,
  CritiqueCategory,
  CritiqueVerdict,
  CritiqueIssue,
  AuditSectionResult,
  EpistemicAdjustment,
  DEFAULT_META_REASONING_BUDGET,
  HARD_CEILING_META_REASONING_BUDGET,
} from "./metaReasoningTypes";
import { EPISTEMIC_AUTHORITY_WEIGHTS, EpistemicAuthority } from "./epistemicCalibrationTypes";

export class MetaReasoningEngine {
  private static instance: MetaReasoningEngine;

  private constructor() {}

  public static getInstance(): MetaReasoningEngine {
    if (!MetaReasoningEngine.instance) {
      MetaReasoningEngine.instance = new MetaReasoningEngine();
    }
    return MetaReasoningEngine.instance;
  }

  /**
   * Deterministic hash helper.
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
   * Resolve and clamp execution budget against hard ceiling.
   */
  private resolveBudget(optionsBudget?: Partial<MetaReasoningBudgetConfig>): MetaReasoningBudgetConfig {
    const base = { ...DEFAULT_META_REASONING_BUDGET, ...(optionsBudget || {}) };
    return {
      maxAuditedClaims: Math.min(base.maxAuditedClaims, HARD_CEILING_META_REASONING_BUDGET.maxAuditedClaims),
      maxAuditedChains: Math.min(base.maxAuditedChains, HARD_CEILING_META_REASONING_BUDGET.maxAuditedChains),
      maxAuditedAssumptions: Math.min(base.maxAuditedAssumptions, HARD_CEILING_META_REASONING_BUDGET.maxAuditedAssumptions),
      maxAuditedScenarios: Math.min(base.maxAuditedScenarios, HARD_CEILING_META_REASONING_BUDGET.maxAuditedScenarios),
      maxCritiqueIssues: Math.min(base.maxCritiqueIssues, HARD_CEILING_META_REASONING_BUDGET.maxCritiqueIssues),
      maxMetaDirectives: Math.min(base.maxMetaDirectives, HARD_CEILING_META_REASONING_BUDGET.maxMetaDirectives),
      maxTotalItems: Math.min(base.maxTotalItems, HARD_CEILING_META_REASONING_BUDGET.maxTotalItems),
    };
  }

  /**
   * Sanitize text by removing UUIDs, hashes, internal keys, and raw floating point numbers.
   */
  private sanitizeDirective(text: string): string {
    return text
      // Replace UUIDs
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "item")
      // Replace hex IDs like fact_1a2b3c
      .replace(/\b(?:fact|claim|entity|step|plan|hyp|scenario|action|rule)_[0-9a-fA-F_]+\b/g, "identified element")
      // Replace raw float scores like 0.852 or 0.95
      .replace(/\b0\.\d{2,}\b/g, (match) => {
        const val = parseFloat(match);
        if (val >= 0.85) return "high confidence";
        if (val >= 0.65) return "moderate confidence";
        return "calibrated confidence";
      })
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Main entry point: Evaluate cognitive pipeline and audit all reasoning.
   */
  public evaluate(input: MetaReasoningInput): MetaReasoningAnalysis {
    const budget = this.resolveBudget(input.options?.budget);
    const userId = input.userId || "default";
    const activeTopic = input.options?.activeTopic || input.context?.activeTopic || "general";
    const strictTopicIsolation = Boolean(input.options?.strictTopicIsolation);

    const issues: CritiqueIssue[] = [];
    const sectionResults: AuditSectionResult[] = [];
    const epistemicAdjustments: EpistemicAdjustment[] = [];
    const unsupportedClaims: string[] = [];
    const simulationRealityConfusions: string[] = [];
    const hardConstraintViolations: string[] = [];
    const revisionRequirements: string[] = [];
    const sanitizedDirectives: string[] = [];

    let claimsAudited = 0;
    let chainsAudited = 0;
    let assumptionsAudited = 0;
    let scenariosAudited = 0;
    let contradictionsAudited = 0;
    let causalRelationsAudited = 0;
    let budgetTruncations = 0;
    let topicIsolationChecks = 0;

    const addIssue = (issue: Omit<CritiqueIssue, "id">) => {
      if (issues.length >= budget.maxCritiqueIssues) {
        budgetTruncations++;
        return;
      }
      const id = `issue_${this.deterministicHash(`${issue.type}_${issue.targetComponent}_${issue.targetIdentifier || ""}_${issues.length}`)}`;
      issues.push({ id, ...issue });
    };

    // =========================================================================
    // 1. GROUNDING & EVIDENCE AUDIT
    // =========================================================================
    let groundingAudited = 0;
    let groundingPassed = 0;

    // Collect claims from Epistemic Calibration
    const epistemicClaims = input.epistemicCalibration?.claims || [];
    const deepHypotheses = input.deepReasoning?.hypotheses || [];
    const authoritativeFacts = input.executiveContext?.authoritativeFacts || [];
    const verifiedFacts = input.verification?.verifiedFacts || [];

    for (const claim of epistemicClaims.slice(0, budget.maxAuditedClaims)) {
      claimsAudited++;
      groundingAudited++;
      const claimIdentifier = claim.claimKey || claim.statement || "claim";

      const hasDirectEvidence = (claim.evidence && claim.evidence.length > 0) ||
        verifiedFacts.some((f) => (claim.claimKey && f.factKey === claim.claimKey) || (claim.statement && f.factText && f.factText.toLowerCase().includes(claim.statement.toLowerCase()))) ||
        authoritativeFacts.some((f) => (claim.claimKey && f.key === claim.claimKey) || (claim.statement && f.value && f.value.toLowerCase().includes(claim.statement.toLowerCase())));

      const hasProvenance = claim.provenance && claim.provenance.length > 0;

      if (!hasProvenance) {
        addIssue({
          type: "PROVENANCE_MISSING",
          category: "PROVENANCE",
          severity: "MODERATE",
          targetComponent: "epistemicCalibration",
          targetIdentifier: claimIdentifier,
          description: `Epistemic claim '${claimIdentifier}' has no traceable provenance records.`,
          remediationRecommendation: "Attach originating source evidence or downgrade claim status to INFERRED.",
          scorePenalty: 0.10,
        });
      }

      if (claim.epistemicState === "VERIFIED" && !hasDirectEvidence) {
        groundingPassed--;
        unsupportedClaims.push(claimIdentifier);
        addIssue({
          type: "UNSUPPORTED_CLAIM",
          category: "GROUNDING",
          severity: "MAJOR",
          targetComponent: "epistemicCalibration",
          targetIdentifier: claimIdentifier,
          description: `Claim '${claimIdentifier}' is marked as VERIFIED but lacks authoritative verified evidence.`,
          remediationRecommendation: "Demote epistemic state to INFERRED or UNCERTAIN until verified via tool or authoritative memory.",
          scorePenalty: 0.20,
        });
      } else if (claim.epistemicState === "UNKNOWN" || claim.epistemicState === "REJECTED") {
        // Known non-grounded state
      } else {
        groundingPassed++;
      }

      // Check for weak evidence link
      if (claim.authority === "PREDICTIVE_CONTEXT" || claim.authority === "SYSTEM_DEFAULT") {
        if (claim.confidence > 0.50) {
          addIssue({
            type: "WEAK_EVIDENCE_LINK",
            category: "GROUNDING",
            severity: "MODERATE",
            targetComponent: "epistemicCalibration",
            targetIdentifier: claimIdentifier,
            description: `Claim '${claimIdentifier}' relies on low-authority source (${claim.authority}) but holds confidence exceeding 0.50.`,
            remediationRecommendation: "Cap confidence to 0.40 or seek corroborating evidence.",
            scorePenalty: 0.10,
          });
        }
      }
    }

    // Check deep hypotheses grounding
    for (const hyp of deepHypotheses.slice(0, budget.maxAuditedClaims)) {
      groundingAudited++;
      const hasSupport = (hyp.supportingEvidence && hyp.supportingEvidence.length > 0) ||
        (hyp.evidenceNodes && hyp.evidenceNodes.length > 0);

      if (!hasSupport && hyp.epistemicStatus === "ESTABLISHED") {
        unsupportedClaims.push(hyp.hypothesisKey || hyp.id);
        addIssue({
          type: "UNSUPPORTED_CLAIM",
          category: "GROUNDING",
          severity: "MAJOR",
          targetComponent: "deepReasoning",
          targetIdentifier: hyp.hypothesisKey || hyp.id,
          description: `Hypothesis '${hyp.hypothesisKey || hyp.id}' is marked as ESTABLISHED but possesses no supporting evidence.`,
          remediationRecommendation: "Mark hypothesis as EXPLORATORY or UNPROVEN.",
          scorePenalty: 0.20,
        });
      } else {
        groundingPassed++;
      }
    }

    const groundingScore = groundingAudited > 0 ? Math.max(0.0, Math.min(1.0, groundingPassed / groundingAudited)) : 1.0;
    sectionResults.push({
      section: "GROUNDING",
      passed: groundingScore >= 0.70,
      issuesCount: issues.filter((i) => i.category === "GROUNDING" || i.category === "PROVENANCE").length,
      auditedCount: groundingAudited,
      score: groundingScore,
      notes: `Audited ${groundingAudited} claims/hypotheses; score: ${groundingScore.toFixed(2)}`,
    });

    // =========================================================================
    // 2. COHERENCE, CONTRADICTIONS & LOGIC AUDIT
    // =========================================================================
    let coherenceAudited = 0;
    let coherencePassed = 0;

    const unresolvedContradictions = input.contradictionResolution?.unresolvedContradictions || [];
    const verificationContradictions = input.verification?.contradictions || [];
    contradictionsAudited = unresolvedContradictions.length + verificationContradictions.length;

    for (const contra of unresolvedContradictions) {
      coherenceAudited++;
      const isCritical = contra.severity === "CRITICAL" || contra.classification === "HARD_LOGICAL_CONTRADICTION";
      addIssue({
        type: "UNRESOLVED_CONTRADICTION",
        category: "COHERENCE",
        severity: isCritical ? "CRITICAL" : "MAJOR",
        targetComponent: "contradictionResolution",
        targetIdentifier: contra.contradictionId || contra.id,
        description: `Unresolved contradiction detected between '${contra.premiseA || "Premise A"}' and '${contra.premiseB || "Premise B"}'.`,
        remediationRecommendation: "Trigger explicit belief revision or solicit user clarification before asserting conclusion.",
        scorePenalty: isCritical ? 0.35 : 0.20,
      });
    }

    // Check verification contradictions
    for (const vContra of verificationContradictions) {
      coherenceAudited++;
      if (vContra.severity === "CRITICAL" || vContra.severity === "MAJOR") {
        addIssue({
          type: "UNRESOLVED_CONTRADICTION",
          category: "COHERENCE",
          severity: vContra.severity === "CRITICAL" ? "CRITICAL" : "MAJOR",
          targetComponent: "verification",
          targetIdentifier: vContra.id,
          description: `Verification engine flagged unresolved contradiction: ${vContra.description}`,
          remediationRecommendation: "Reconcile competing statements with authoritative memory or current turn instruction.",
          scorePenalty: vContra.severity === "CRITICAL" ? 0.35 : 0.20,
        });
      } else {
        coherencePassed++;
      }
    }

    // Circular Reasoning check in causal and multi-hop graphs
    const causalChains = input.causalReasoning?.chains || [];
    for (const chain of causalChains) {
      const visited = new Set<string>();
      for (const node of chain.nodes || []) {
        if (visited.has(node.nodeKey)) {
          addIssue({
            type: "CIRCULAR_REASONING",
            category: "LOGIC",
            severity: "MAJOR",
            targetComponent: "causalReasoning",
            targetIdentifier: chain.chainId,
            description: `Circular causal dependency detected at node '${node.nodeKey}' in chain '${chain.chainId}'.`,
            remediationRecommendation: "Break circular feedback loop into separate temporal stages.",
            scorePenalty: 0.20,
          });
          break;
        }
        visited.add(node.nodeKey);
      }
    }

    const multiHopChains = input.multiHopReasoning?.chains || [];
    for (const chain of multiHopChains) {
      const visitedEntities = new Set<string>();
      for (const hop of chain.hops || []) {
        if (hop.sourceEntity && hop.targetEntity && hop.sourceEntity === hop.targetEntity) {
          addIssue({
            type: "CIRCULAR_REASONING",
            category: "LOGIC",
            severity: "MAJOR",
            targetComponent: "multiHopReasoning",
            targetIdentifier: chain.chainId,
            description: `Circular entity self-hop detected on '${hop.sourceEntity}' in chain '${chain.chainId}'.`,
            remediationRecommendation: "Prune recursive self-referential reasoning hops.",
            scorePenalty: 0.20,
          });
          break;
        }
        if (hop.sourceEntity && visitedEntities.has(hop.sourceEntity)) {
          addIssue({
            type: "CIRCULAR_REASONING",
            category: "LOGIC",
            severity: "MAJOR",
            targetComponent: "multiHopReasoning",
            targetIdentifier: chain.chainId,
            description: `Circular entity cycle detected on '${hop.sourceEntity}' in chain '${chain.chainId}'.`,
            remediationRecommendation: "Prune cyclic reasoning hops.",
            scorePenalty: 0.20,
          });
          break;
        }
        if (hop.sourceEntity) visitedEntities.add(hop.sourceEntity);
        if (hop.targetEntity && visitedEntities.has(hop.targetEntity) && visitedEntities.size > 1) {
          addIssue({
            type: "CIRCULAR_REASONING",
            category: "LOGIC",
            severity: "MAJOR",
            targetComponent: "multiHopReasoning",
            targetIdentifier: chain.chainId,
            description: `Circular entity cycle back to '${hop.targetEntity}' in chain '${chain.chainId}'.`,
            remediationRecommendation: "Prune cyclic reasoning hops.",
            scorePenalty: 0.20,
          });
          break;
        }
      }
    }

    const coherenceScore = coherenceAudited > 0 ? Math.max(0.0, 1.0 - (issues.filter((i) => i.category === "COHERENCE" || i.category === "LOGIC").length * 0.25)) : 1.0;
    sectionResults.push({
      section: "COHERENCE",
      passed: coherenceScore >= 0.70,
      issuesCount: issues.filter((i) => i.category === "COHERENCE" || i.category === "LOGIC").length,
      auditedCount: Math.max(1, coherenceAudited),
      score: coherenceScore,
      notes: `Coherence score: ${coherenceScore.toFixed(2)} with ${contradictionsAudited} contradictions evaluated.`,
    });

    // =========================================================================
    // 3. EPISTEMIC CALIBRATION & AUTHORITY AUDIT
    // =========================================================================
    let calibrationAudited = 0;
    let calibrationPassed = 0;

    for (const claim of epistemicClaims.slice(0, budget.maxAuditedClaims)) {
      calibrationAudited++;
      const authorityWeight = claim.authority ? (EPISTEMIC_AUTHORITY_WEIGHTS[claim.authority] ?? 0.50) : 0.50;

      // Detect Confidence Overclaim
      if (claim.confidence > authorityWeight + 0.25 && claim.confidence > 0.75) {
        const recommended = Math.min(0.70, authorityWeight + 0.10);
        epistemicAdjustments.push({
          claimKey: claim.claimKey,
          originalConfidence: claim.confidence,
          recommendedConfidence: recommended,
          reason: `Stated confidence (${claim.confidence.toFixed(2)}) significantly exceeds authority warrant (${claim.authority}: ${authorityWeight.toFixed(2)}).`,
        });

        addIssue({
          type: "CONFIDENCE_OVERCLAIM",
          category: "EPISTEMIC_CALIBRATION",
          severity: claim.confidence >= 0.90 ? "MAJOR" : "MODERATE",
          targetComponent: "epistemicCalibration",
          targetIdentifier: claim.claimKey,
          description: `Confidence overclaim on '${claim.claimKey}': stated ${claim.confidence.toFixed(2)}, max warranted ${recommended.toFixed(2)}.`,
          remediationRecommendation: `Calibrate confidence downward to ${recommended.toFixed(2)} or label as INFERRED.`,
          scorePenalty: claim.confidence >= 0.90 ? 0.20 : 0.10,
        });
      }
      // Detect Confidence Underclaim
      else if (authorityWeight >= 0.90 && claim.epistemicState === "VERIFIED" && claim.confidence < 0.35) {
        epistemicAdjustments.push({
          claimKey: claim.claimKey,
          originalConfidence: claim.confidence,
          recommendedConfidence: 0.85,
          reason: "Verified authoritative evidence supports higher confidence.",
        });

        addIssue({
          type: "CONFIDENCE_UNDERCLAIM",
          category: "EPISTEMIC_CALIBRATION",
          severity: "MINOR",
          targetComponent: "epistemicCalibration",
          targetIdentifier: claim.claimKey,
          description: `Confidence underclaim on verified claim '${claim.claimKey}': stated ${claim.confidence.toFixed(2)}.`,
          remediationRecommendation: "Raise confidence to reflect authoritative verified grounding.",
          scorePenalty: 0.05,
        });
      } else {
        calibrationPassed++;
      }

      // Detect Authority Mismatch (e.g. Predictive context overriding explicit turn)
      if (claim.competingClaims && claim.competingClaims.length > 0) {
        for (const competing of claim.competingClaims) {
          const compWeight = competing.authority ? (EPISTEMIC_AUTHORITY_WEIGHTS[competing.authority] ?? 0.50) : 0.50;
          if (compWeight > authorityWeight + 0.20 && claim.confidence >= competing.confidence) {
            addIssue({
              type: "AUTHORITY_MISMATCH",
              category: "EPISTEMIC_CALIBRATION",
              severity: "MAJOR",
              targetComponent: "epistemicCalibration",
              targetIdentifier: claim.claimKey,
              description: `Lower-authority claim '${claim.claimKey}' (${claim.authority}) supersedes higher-authority claim (${competing.authority}).`,
              remediationRecommendation: "Enforce canonical authority hierarchy: higher-authority evidence must take precedence.",
              scorePenalty: 0.20,
            });
          }
        }
      }
    }

    const calibrationScore = calibrationAudited > 0 ? Math.max(0.0, Math.min(1.0, calibrationPassed / calibrationAudited)) : 1.0;
    sectionResults.push({
      section: "EPISTEMIC_CALIBRATION",
      passed: calibrationScore >= 0.70,
      issuesCount: issues.filter((i) => i.category === "EPISTEMIC_CALIBRATION").length,
      auditedCount: calibrationAudited,
      score: calibrationScore,
      notes: `Audited ${calibrationAudited} claims for epistemic calibration; adjustments recommended: ${epistemicAdjustments.length}`,
    });

    // =========================================================================
    // 4. CAUSAL REASONING & COUNTERFACTUAL AUDIT
    // =========================================================================
    let causalAudited = 0;
    let causalPassed = 0;

    const causalRelations = input.causalReasoning?.relations || [];
    causalRelationsAudited = causalRelations.length;

    for (const rel of causalRelations.slice(0, budget.maxAuditedChains)) {
      causalAudited++;
      if (rel.relationType === "INSUFFICIENT" || !rel.mechanism) {
        addIssue({
          type: "CAUSAL_GAP",
          category: "CAUSAL_JUSTIFICATION",
          severity: "MODERATE",
          targetComponent: "causalReasoning",
          targetIdentifier: rel.relationKey || `${rel.causeKey}->${rel.effectKey}`,
          description: `Causal relation from '${rel.causeKey}' to '${rel.effectKey}' lacks explicit explanatory mechanism or necessity.`,
          remediationRecommendation: "Establish intermediate mechanism or qualify causal link as correlational.",
          scorePenalty: 0.10,
        });
      } else {
        causalPassed++;
      }
    }

    // Check counterfactuals
    const counterfactuals = input.causalReasoning?.counterfactuals || [];
    for (const cf of counterfactuals) {
      causalAudited++;
      if (cf.outcome === "INVALID" || !cf.antecedent) {
        addIssue({
          type: "COUNTERFACTUAL_INVALIDITY",
          category: "CAUSAL_JUSTIFICATION",
          severity: "MAJOR",
          targetComponent: "causalReasoning",
          targetIdentifier: cf.scenarioId,
          description: `Counterfactual scenario '${cf.scenarioId}' possesses invalid antecedent or impossible outcome.`,
          remediationRecommendation: "Validate antecedent against physical/logical constraints.",
          scorePenalty: 0.20,
        });
      } else {
        causalPassed++;
      }
    }

    const causalScore = causalAudited > 0 ? Math.max(0.0, Math.min(1.0, causalPassed / causalAudited)) : 1.0;
    sectionResults.push({
      section: "CAUSAL_JUSTIFICATION",
      passed: causalScore >= 0.70,
      issuesCount: issues.filter((i) => i.category === "CAUSAL_JUSTIFICATION").length,
      auditedCount: Math.max(1, causalAudited),
      score: causalScore,
      notes: `Causal justification score: ${causalScore.toFixed(2)} across ${causalAudited} relations/scenarios.`,
    });

    // =========================================================================
    // 5. MULTI-HOP REASONING & EVIDENCE CHAIN AUDIT
    // =========================================================================
    let multiHopAudited = 0;
    let multiHopPassed = 0;

    for (const chain of multiHopChains.slice(0, budget.maxAuditedChains)) {
      chainsAudited++;
      multiHopAudited++;

      if (chain.status === "BROKEN" || chain.status === "INVALID") {
        addIssue({
          type: "BROKEN_MULTI_HOP_CHAIN",
          category: "MULTI_HOP_INTEGRITY",
          severity: "MAJOR",
          targetComponent: "multiHopReasoning",
          targetIdentifier: chain.chainId,
          description: `Multi-hop chain '${chain.chainId}' has broken or missing intermediate inference links.`,
          remediationRecommendation: "Prune severed chain or request additional evidence to bridge missing hop.",
          scorePenalty: 0.20,
        });
      } else {
        multiHopPassed++;
      }

      // Check hop depth penalty compliance
      if (chain.hops && chain.hops.length >= 3) {
        if (chain.cumulativeConfidence > 0.85) {
          addIssue({
            type: "CONFIDENCE_OVERCLAIM",
            category: "MULTI_HOP_INTEGRITY",
            severity: "MODERATE",
            targetComponent: "multiHopReasoning",
            targetIdentifier: chain.chainId,
            description: `Multi-hop chain '${chain.chainId}' spans ${chain.hops.length} hops but retains excessively high cumulative confidence (${chain.cumulativeConfidence.toFixed(2)}).`,
            remediationRecommendation: "Apply standard hop-depth decay penalty (minimum 0.05 per hop).",
            scorePenalty: 0.10,
          });
        }
      }
    }

    const multiHopScore = multiHopAudited > 0 ? Math.max(0.0, Math.min(1.0, multiHopPassed / multiHopAudited)) : 1.0;
    sectionResults.push({
      section: "MULTI_HOP_INTEGRITY",
      passed: multiHopScore >= 0.70,
      issuesCount: issues.filter((i) => i.category === "MULTI_HOP_INTEGRITY").length,
      auditedCount: Math.max(1, multiHopAudited),
      score: multiHopScore,
      notes: `Multi-hop integrity score: ${multiHopScore.toFixed(2)} across ${chainsAudited} audited chains.`,
    });

    // =========================================================================
    // 6. SCENARIO SIMULATION SANITY & ASSUMPTION AUDIT
    // =========================================================================
    let simSanityAudited = 0;
    let simSanityPassed = 0;

    const simulationScenarios = input.scenarioSimulation?.scenarios || [];
    const simulationAssumptions = input.scenarioSimulation?.assumptions || [];
    const simulationOutcomes = input.scenarioSimulation?.outcomes || [];
    scenariosAudited = simulationScenarios.length;
    assumptionsAudited = simulationAssumptions.length;

    for (const scenario of simulationScenarios.slice(0, budget.maxAuditedScenarios)) {
      simSanityAudited++;

      // CRITICAL REALITY BOUNDARY DEFENSE:
      // Epistemic status MUST NEVER BE VERIFIED or KNOWN for simulated outcomes
      if (scenario.epistemicStatus === ("VERIFIED" as any) || scenario.epistemicStatus === ("KNOWN" as any)) {
        simulationRealityConfusions.push(scenario.scenarioId);
        addIssue({
          type: "SIMULATION_REALITY_CONFUSION",
          category: "SIMULATION_SANITY",
          severity: "CRITICAL",
          targetComponent: "scenarioSimulation",
          targetIdentifier: scenario.scenarioId,
          description: `Simulated scenario '${scenario.scenarioId}' improperly claims authoritative epistemic status (${scenario.epistemicStatus}).`,
          remediationRecommendation: "Strictly enforce epistemic boundary: simulated projections must be SIMULATED, PROJECTED, or ADVISORY.",
          scorePenalty: 0.35,
        });
      } else {
        simSanityPassed++;
      }
    }

    // Check simulation outcomes for reality confusion
    for (const outcome of simulationOutcomes) {
      if (outcome.epistemicStatus === ("VERIFIED" as any) || outcome.epistemicStatus === ("KNOWN" as any)) {
        simulationRealityConfusions.push(outcome.outcomeId);
        addIssue({
          type: "SIMULATION_REALITY_CONFUSION",
          category: "SIMULATION_SANITY",
          severity: "CRITICAL",
          targetComponent: "scenarioSimulation",
          targetIdentifier: outcome.outcomeId,
          description: `Simulated outcome '${outcome.outcomeId}' incorrectly asserts reality status (${outcome.epistemicStatus}).`,
          remediationRecommendation: "Demote outcome epistemic status to PROJECTED or SIMULATED.",
          scorePenalty: 0.35,
        });
      }
    }

    // Audit assumptions
    for (const assumption of simulationAssumptions.slice(0, budget.maxAuditedAssumptions)) {
      if (assumption.required && !assumption.isSupported) {
        addIssue({
          type: "UNCHECKED_ASSUMPTION",
          category: "ASSUMPTION_AUDIT",
          severity: "MODERATE",
          targetComponent: "scenarioSimulation",
          targetIdentifier: assumption.id,
          description: `Required assumption '${assumption.statement}' is ungrounded in authoritative evidence.`,
          remediationRecommendation: "Flag assumption sensitivity or seek confirmation.",
          scorePenalty: 0.10,
        });
      }
      if (assumption.isSensitive && !assumption.isSupported) {
        addIssue({
          type: "SENSITIVE_ASSUMPTION_DEPENDENCY",
          category: "ASSUMPTION_AUDIT",
          severity: "MAJOR",
          targetComponent: "scenarioSimulation",
          targetIdentifier: assumption.id,
          description: `Simulation heavily depends on sensitive unverified assumption: '${assumption.statement}'.`,
          remediationRecommendation: "Include explicit assumption caveat in user-facing advisory directives.",
          scorePenalty: 0.20,
        });
      }
    }

    const simSanityScore = simSanityAudited > 0 ? Math.max(0.0, Math.min(1.0, simSanityPassed / simSanityAudited)) : 1.0;
    sectionResults.push({
      section: "SIMULATION_SANITY",
      passed: simSanityScore >= 0.70 && simulationRealityConfusions.length === 0,
      issuesCount: issues.filter((i) => i.category === "SIMULATION_SANITY").length,
      auditedCount: Math.max(1, simSanityAudited),
      score: simSanityScore,
      notes: `Simulation sanity score: ${simSanityScore.toFixed(2)}; reality confusions: ${simulationRealityConfusions.length}`,
    });

    const assumptionScore = simulationAssumptions.length > 0
      ? Math.max(0.0, 1.0 - (issues.filter((i) => i.category === "ASSUMPTION_AUDIT").length * 0.15))
      : 1.0;
    sectionResults.push({
      section: "ASSUMPTION_AUDIT",
      passed: assumptionScore >= 0.70,
      issuesCount: issues.filter((i) => i.category === "ASSUMPTION_AUDIT").length,
      auditedCount: Math.max(1, simulationAssumptions.length),
      score: assumptionScore,
      notes: `Assumption audit score: ${assumptionScore.toFixed(2)} across ${simulationAssumptions.length} assumptions.`,
    });

    // =========================================================================
    // 7. TEMPORAL MEMORY & TOPIC / SCOPE BOUNDARY AUDIT
    // =========================================================================
    let temporalAudited = 1;
    let temporalPassed = 1;

    topicIsolationChecks++;
    if (strictTopicIsolation) {
      // Check retrieved facts / memories for topic leakage
      for (const fact of authoritativeFacts) {
        if (fact.topic && fact.topic !== activeTopic && !fact.isGlobal) {
          addIssue({
            type: "TOPIC_BOUNDARY_LEAK",
            category: "TEMPORAL_AND_SCOPE",
            severity: "MAJOR",
            targetComponent: "executiveContext",
            targetIdentifier: fact.id || fact.key,
            description: `Memory fact '${fact.key}' belongs to isolated topic '${fact.topic}', leaking into active topic '${activeTopic}'.`,
            remediationRecommendation: "Enforce topic isolation filtering in executive context synthesis.",
            scorePenalty: 0.20,
          });
          temporalPassed--;
        }
      }
    }

    // Check temporal continuity state
    if (input.temporalMemory) {
      temporalAudited += input.temporalMemory.stateRecords?.length || 0;
      for (const record of input.temporalMemory.stateRecords || []) {
        if (record.isSuperseded && record.isActiveInCurrentTurn) {
          addIssue({
            type: "TEMPORAL_INCONSISTENCY",
            category: "TEMPORAL_AND_SCOPE",
            severity: "MODERATE",
            targetComponent: "temporalMemory",
            targetIdentifier: record.key,
            description: `Superseded temporal record '${record.key}' is asserted as currently active state.`,
            remediationRecommendation: "Promote latest temporal evolution state and archive superseded record.",
            scorePenalty: 0.10,
          });
        } else {
          temporalPassed++;
        }
      }
    }

    const temporalScore = temporalAudited > 0 ? Math.max(0.0, Math.min(1.0, temporalPassed / temporalAudited)) : 1.0;
    sectionResults.push({
      section: "TEMPORAL_AND_SCOPE",
      passed: temporalScore >= 0.70,
      issuesCount: issues.filter((i) => i.category === "TEMPORAL_AND_SCOPE").length,
      auditedCount: temporalAudited,
      score: temporalScore,
      notes: `Temporal and scope score: ${temporalScore.toFixed(2)} with strict isolation: ${strictTopicIsolation}`,
    });

    // =========================================================================
    // 8. HARD CONSTRAINTS & GOAL ALIGNMENT AUDIT
    // =========================================================================
    let constraintAudited = 0;
    let constraintPassed = 0;

    const reasoningConstraints = input.executiveContext?.reasoningConstraints || [];
    const planSteps = input.planning?.plan?.steps || [];
    const activeGoals = input.goalProject?.goals || [];

    for (const constraint of reasoningConstraints) {
      constraintAudited++;
      if (constraint.type === "HARD_CONSTRAINT" && constraint.enforceStrictly) {
        // Check if any plan step or claim violates hard constraint
        for (const step of planSteps) {
          const stepText = `${step.action || ""} ${step.description || ""}`.toLowerCase();
          const constraintDesc = constraint.description.toLowerCase();

          // Check if plan description opposes explicit hard constraint directive
          if (
            (constraintDesc.includes("never") || constraintDesc.includes("do not") || constraintDesc.includes("prohibited")) &&
            stepText.includes(constraintDesc.replace(/(never|do not|prohibited|must not)\s*/gi, "").trim())
          ) {
            hardConstraintViolations.push(constraint.id);
            addIssue({
              type: "HARD_CONSTRAINT_VIOLATION",
              category: "CONSTRAINT_AND_GOAL",
              severity: "CRITICAL",
              targetComponent: "planning",
              targetIdentifier: step.id || step.action,
              description: `Plan step '${step.description}' violates strict hard constraint '${constraint.description}'.`,
              remediationRecommendation: "Cancel plan step and reformulate strategy adhering strictly to hard safety constraint.",
              scorePenalty: 0.35,
            });
          }
        }
      }
      constraintPassed++;
    }

    // Check goal conflicts
    for (const goal of activeGoals) {
      if (goal.status === "BLOCKED") {
        for (const step of planSteps) {
          if (step.action === goal.title && !step.riskMitigation) {
            addIssue({
              type: "GOAL_CONFLICT",
              category: "CONSTRAINT_AND_GOAL",
              severity: "MAJOR",
              targetComponent: "planning",
              targetIdentifier: goal.id,
              description: `Plan advances blocked goal '${goal.title}' without resolving identified blockers.`,
              remediationRecommendation: "Sequence blocker resolution step prior to goal advancement.",
              scorePenalty: 0.20,
            });
          }
        }
      }
    }

    const constraintScore = constraintAudited > 0 ? Math.max(0.0, 1.0 - (hardConstraintViolations.length * 0.50)) : 1.0;
    sectionResults.push({
      section: "CONSTRAINT_AND_GOAL",
      passed: hardConstraintViolations.length === 0,
      issuesCount: issues.filter((i) => i.category === "CONSTRAINT_AND_GOAL").length,
      auditedCount: Math.max(1, constraintAudited),
      score: constraintScore,
      notes: `Constraint and goal score: ${constraintScore.toFixed(2)}; hard violations: ${hardConstraintViolations.length}`,
    });

    // =========================================================================
    // 9. OVERALL QUALITY SCORE, VERDICT & DIRECTIVE SANITIZATION
    // =========================================================================
    const criticalCount = issues.filter((i) => i.severity === "CRITICAL").length;
    const majorCount = issues.filter((i) => i.severity === "MAJOR").length;
    const moderateCount = issues.filter((i) => i.severity === "MODERATE").length;
    const minorCount = issues.filter((i) => i.severity === "MINOR").length;
    const infoCount = issues.filter((i) => i.severity === "INFO").length;

    // Base average of section scores
    const totalSectionScore = sectionResults.reduce((sum, s) => sum + s.score, 0);
    const avgSectionScore = sectionResults.length > 0 ? totalSectionScore / sectionResults.length : 1.0;

    // Calculate total penalties
    const totalPenalty = issues.reduce((sum, i) => sum + i.scorePenalty, 0);
    const overallQualityScore = Math.max(0.0, Math.min(1.0, avgSectionScore - (totalPenalty * 0.40)));

    // Determine Verdict
    let verdict: CritiqueVerdict = "PASS";
    if (criticalCount > 0 || hardConstraintViolations.length > 0 || simulationRealityConfusions.length > 0) {
      verdict = "REJECTED";
    } else if (majorCount > 0 || overallQualityScore < 0.65) {
      verdict = "NEEDS_REVISION";
    } else if (moderateCount > 0 || minorCount > 0 || overallQualityScore < 0.85) {
      verdict = "PASS_WITH_WARNINGS";
    } else {
      verdict = "PASS";
    }

    // Build Revision Requirements
    for (const issue of issues.filter((i) => i.severity === "CRITICAL" || i.severity === "MAJOR")) {
      revisionRequirements.push(`[${issue.targetComponent}] ${issue.description} -> ${issue.remediationRecommendation}`);
    }

    // Build Sanitized Meta-Directives (Deterministic & Explainable)
    if (verdict === "REJECTED") {
      sanitizedDirectives.push("CRITICAL DEFENSE: Reject ungrounded plan or simulation confusion. Require explicit clarification.");
    } else if (verdict === "NEEDS_REVISION") {
      sanitizedDirectives.push("META-REASONING: Moderate confidence. Address identified assumptions and causal gaps before finalizing answer.");
    } else if (verdict === "PASS_WITH_WARNINGS") {
      sanitizedDirectives.push("META-REASONING: Calibrated reasoning passed with minor epistemic advisories.");
    } else {
      sanitizedDirectives.push("META-REASONING: Full cognitive audit verified. High confidence, well-grounded reasoning.");
    }

    // Add specific sanitized guidance
    for (const adj of epistemicAdjustments.slice(0, 3)) {
      sanitizedDirectives.push(this.sanitizeDirective(`Calibrate ${adj.claimKey}: ${adj.reason}`));
    }

    for (const issue of issues.filter((i) => i.severity === "MAJOR").slice(0, 3)) {
      sanitizedDirectives.push(this.sanitizeDirective(`Guidance: ${issue.remediationRecommendation}`));
    }

    // Truncate directives to budget ceiling
    const finalDirectives = sanitizedDirectives.slice(0, budget.maxMetaDirectives);

    const diagnostics: MetaReasoningDiagnostics = {
      claimsAudited,
      chainsAudited,
      assumptionsAudited,
      scenariosAudited,
      contradictionsAudited,
      causalRelationsAudited,
      issuesDetected: issues.length,
      criticalIssuesCount: criticalCount,
      majorIssuesCount: majorCount,
      moderateIssuesCount: moderateCount,
      minorIssuesCount: minorCount,
      infoIssuesCount: infoCount,
      groundingScore,
      coherenceScore,
      calibrationScore,
      overallQualityScore,
      budgetTruncations,
      topicIsolationChecks,
      directivesGenerated: finalDirectives.length,
    };

    return {
      verdict,
      overallQualityScore,
      issues,
      sectionResults,
      sanitizedDirectives: finalDirectives,
      directives: finalDirectives,
      revisionRequirements,
      epistemicAdjustments,
      unsupportedClaims,
      simulationRealityConfusions,
      hardConstraintViolations,
      diagnostics,
    };
  }
}

export const metaReasoningEngine = MetaReasoningEngine.getInstance();
