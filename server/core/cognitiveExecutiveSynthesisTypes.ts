/**
 * Dora Cognitive Executive Synthesis & Final Response Governance Engine Types
 * Phase 3 — Step 10 (FINAL STEP OF PHASE 3)
 * 
 * Defines deterministic, non-LLM, bounded contracts for synthesizing all authorized
 * outputs from Phase 3 Steps 1–9 into a final cognitive governance package.
 * 
 * Determines:
 * - Final cognitive stance
 * - Final response strategy
 * - What information may be communicated
 * - What information must be qualified
 * - What information must be suppressed
 * - What caveats, warnings, and clarification needs exist
 * - Sanitized, high-level behavioral directives for downstream conversational generation
 * 
 * INVARIANTS:
 * - Deterministic, non-LLM, read-only, side-effect-free, bounded, explainable.
 * - Synthesis MUST NEVER increase authority.
 * - Injected currentTime stability.
 * - No Math.random(), no Date.now().
 * - Sanitized directives (no UUIDs, internal IDs, raw floats, auth credentials).
 */

import { ConversationContext, ConversationTurn, ConversationConstraint } from "./contextTypes";
import { StructuredIntent } from "./intentTypes";
import { ReasoningAnalysis } from "./reasoningTypes";
import { PlanningAnalysis } from "./planningTypes";
import { VerificationAnalysis } from "./verificationTypes";
import { MemoryGovernanceAnalysis } from "./memoryGovernanceTypes";
import { UserModelAnalysis } from "./longTermUserModelTypes";
import { TemporalMemoryAnalysis } from "./temporalMemoryTypes";
import { GoalProjectAnalysis } from "./goalProjectTypes";
import { ContextContinuityAnalysis } from "./contextContinuityTypes";
import { PredictiveContextAnalysis } from "./predictiveContextTypes";
import { ExecutiveContextPackage, ExecutiveConstraint } from "./executiveContextTypes";
import { DeepReasoningAnalysis } from "./deepReasoningTypes";
import { ContradictionResolutionAnalysis } from "./contradictionResolutionTypes";
import { CausalReasoningAnalysis } from "./causalReasoningTypes";
import { MultiHopReasoningAnalysis } from "./multiHopReasoningTypes";
import {
  EpistemicCalibrationAnalysis,
  EpistemicAuthority,
  EpistemicState,
  EpistemicScope,
  EpistemicProvenance,
  EpistemicUncertainty,
} from "./epistemicCalibrationTypes";
import {
  ScenarioSimulationAnalysis,
  ScenarioType,
  ScenarioEpistemicStatus,
} from "./scenarioSimulationTypes";
import {
  MetaReasoningAnalysis,
  CritiqueIssue,
  CritiqueVerdict,
  CritiqueSeverity,
} from "./metaReasoningTypes";
import {
  DecisionAnalysis,
  DecisionState,
  DecisionRecommendationType,
  DecisionCandidate,
  DecisionPlan,
} from "./deliberativeDecisionTypes";
import {
  ExecutiveControlAnalysis,
  ExecutivePriorityClass,
  ExecutiveEscalationState,
  ExecutiveResponseMode,
} from "./adaptiveExecutiveControlTypes";

/**
 * 1. Final Cognitive Stance
 * Authoritative disposition of the system towards the current turn.
 */
export type FinalCognitiveStance =
  | "DIRECT_ANSWER"              // High confidence, verified or well-supported claims, no blockers
  | "CLARIFICATION_FIRST"         // Ambiguity, missing essential parameters, or unresolved contradiction
  | "QUALIFIED_ANSWER"            // Inferred or uncertain claims requiring epistemic hedging/caveats
  | "WARNING_THEN_ANSWER"         // High-risk or assumption-sensitive, but answerable with caveats
  | "EPISTEMIC_CORRECTION"        // Addressing false premise, hallucinated causal link, or invalid logic
  | "DECISION_RECOMMENDATION"     // Deliberative evaluation produced an actionable choice/plan
  | "REFUSAL_SAFETY"              // Hard safety violation, secret exposure, or severe policy breach
  | "DEFERRED_ACTION";            // Information gathering needed before acting or escalating

/**
 * 2. Final Response Strategy
 * High-level orchestration strategy guiding conversational synthesis.
 */
export type FinalResponseStrategy =
  | "DIRECT"                      // Straightforward, unencumbered assertion
  | "SOCRATIC_CLARIFICATION"      // Targeted questions to resolve ambiguity or missing data
  | "MULTI_PERSPECTIVE_SYNTHESIS" // Presenting nuanced viewpoints or contested claims neutrally
  | "CAUSAL_EXPLANATION"          // Tracing root cause, mechanism, or counterfactual reasoning
  | "SCENARIO_PROJECTION"         // Illustrating future trade-offs, risks, or simulations
  | "CORRECTIVE_ALIGNMENT"        // Gently correcting misconceptions or outdated facts
  | "DELIBERATIVE_GUIDANCE"       // Providing structured recommendation with decision steps
  | "DEFENSIVE_SUPPRESSION";      // Withholding unsafe/stale data and focusing on safe boundaries

/**
 * Synthesized Evidence Item approved for communication
 */
export interface SynthesizedEvidenceItem {
  id: string;
  sourceType: string;
  statement: string;
  authority: EpistemicAuthority;
  authorityWeight: number;
  epistemicState: EpistemicState;
  confidence: number;             // Bounded [0.0, 1.0]
  isQualified: boolean;
  qualificationReason?: string;
  scope: EpistemicScope;
}

/**
 * Epistemic Qualification Record
 */
export interface EpistemicQualification {
  claimKey: string;
  statement: string;
  epistemicState: EpistemicState;
  hedgingDegree: "NONE" | "MILD" | "MODERATE" | "STRONG";
  hedgingPhrase: string;
  rationale: string;
}

/**
 * Uncertainty Summary for Synthesis
 */
export interface SynthesisUncertaintySummary {
  compoundUncertainty: number;     // Bounded [0.0, 1.0]
  primaryUncertaintySources: string[];
  evidenceSufficiency: number;     // Bounded [0.0, 1.0] (1.0 = fully sufficient)
  epistemicGap: number;            // Bounded [0.0, 1.0]
  hasContestedClaims: boolean;
  hasUnresolvedContradictions: boolean;
}

/**
 * Actionable Communication Directive for downstream LLM/generation
 */
export interface CommunicationDirective {
  id: string;
  text: string;
  priority: ExecutivePriorityClass;
  type: "STANCE" | "QUALIFICATION" | "CAVEAT" | "SUPPRESSION" | "GUIDANCE" | "SAFETY";
}

/**
 * Synthesized Decision Guidance
 */
export interface SynthesizedDecisionGuidance {
  recommendedAction?: string;
  decisionState?: DecisionState;
  recommendationType?: DecisionRecommendationType;
  tradeoffSummary?: string;
  caveats: string[];
  nextSteps: string[];
}

/**
 * Diagnostic Metrics for Cognitive Executive Synthesis
 */
export interface CognitiveExecutiveSynthesisDiagnostics {
  totalInputClaimsEvaluated: number;
  approvedEvidenceCount: number;
  qualifiedEvidenceCount: number;
  suppressedEvidenceCount: number;
  caveatCount: number;
  directiveCount: number;
  sanitizationReplacements: number;
  budgetTruncationCount: number;
  finalStance: FinalCognitiveStance;
  finalStrategy: FinalResponseStrategy;
  authorityPrecedenceApplied: boolean;
  evaluationTimeMs?: number;
}

/**
 * Configurable Budget Limits for Cognitive Executive Synthesis
 */
export interface CognitiveExecutiveSynthesisBudgetConfig {
  maxApprovedEvidence?: number;
  maxQualifications?: number;
  maxCaveats?: number;
  maxDirectives?: number;
  maxSuppressedItems?: number;
  maxGuidanceSteps?: number;
}

export const DEFAULT_SYNTHESIS_BUDGET: Required<CognitiveExecutiveSynthesisBudgetConfig> = {
  maxApprovedEvidence: 15,
  maxQualifications: 8,
  maxCaveats: 6,
  maxDirectives: 10,
  maxSuppressedItems: 12,
  maxGuidanceSteps: 5,
};

export const HARD_CEILING_SYNTHESIS_BUDGET: Required<CognitiveExecutiveSynthesisBudgetConfig> = {
  maxApprovedEvidence: 30,
  maxQualifications: 16,
  maxCaveats: 12,
  maxDirectives: 20,
  maxSuppressedItems: 25,
  maxGuidanceSteps: 10,
};

/**
 * Output Package: Cognitive Executive Synthesis
 */
export interface CognitiveExecutiveSynthesis {
  finalStance: FinalCognitiveStance;
  finalStrategy: FinalResponseStrategy;
  approvedEvidence: SynthesizedEvidenceItem[];
  epistemicQualifications: EpistemicQualification[];
  suppressedClaims: Array<{ key: string; reason: string }>;
  uncertaintySummary: SynthesisUncertaintySummary;
  caveatsAndWarnings: string[];
  decisionGuidance?: SynthesizedDecisionGuidance;
  clarificationRequest?: {
    required: boolean;
    reason?: string;
    suggestedQuestions: string[];
  };
  directives: string[];
  sanitizedDirectives: string[];
  provenance: EpistemicProvenance[];
  diagnostics: CognitiveExecutiveSynthesisDiagnostics;
}

/**
 * Execution Options for Cognitive Executive Synthesis
 */
export interface CognitiveExecutiveSynthesisOptions {
  userId?: string;
  currentTime?: number;
  activeTopic?: string;
  strictTopicIsolation?: boolean;
  budget?: CognitiveExecutiveSynthesisBudgetConfig;
}

/**
 * Input Package for Cognitive Executive Synthesis
 */
export interface CognitiveExecutiveSynthesisInput {
  userId?: string;
  message?: string;
  context?: ConversationContext;
  intent?: StructuredIntent;
  reasoning?: ReasoningAnalysis;
  planning?: PlanningAnalysis;
  verification?: VerificationAnalysis;
  executiveContext?: ExecutiveContextPackage;
  deepReasoning?: DeepReasoningAnalysis;
  contradictionResolution?: ContradictionResolutionAnalysis;
  causalReasoning?: CausalReasoningAnalysis;
  multiHopReasoning?: MultiHopReasoningAnalysis;
  epistemicCalibration?: EpistemicCalibrationAnalysis;
  scenarioSimulation?: ScenarioSimulationAnalysis;
  metaReasoning?: MetaReasoningAnalysis;
  decision?: DecisionAnalysis;
  executiveControl?: ExecutiveControlAnalysis;
  memoryGovernance?: MemoryGovernanceAnalysis;
  temporalMemory?: TemporalMemoryAnalysis;
  userModel?: UserModelAnalysis;
  goalProject?: GoalProjectAnalysis;
  contextContinuity?: ContextContinuityAnalysis;
  predictiveContext?: PredictiveContextAnalysis;
  history?: ConversationTurn[];
  options?: CognitiveExecutiveSynthesisOptions;
}
