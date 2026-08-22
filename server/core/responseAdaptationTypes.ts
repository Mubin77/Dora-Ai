/**
 * Dora Memory-Aware Response Adaptation & Personalization Types
 * Phase 2 — Step 7
 * 
 * Provides deterministic, strongly-typed contracts for resolving multi-layer
 * response personalization, style profiling, and constraint hierarchy.
 * 
 * Precedence Hierarchy:
 * 1. CURRENT_TURN_EXPLICIT (Highest)
 * 2. HARD_CONSTRAINT
 * 3. CORRECTION_NEGATION
 * 4. VERIFIED_EVIDENCE
 * 5. GOVERNANCE_BOUNDARY
 * 6. CONFIRMED_ADAPTIVE
 * 7. CONFIRMED_PREFERENCE
 * 8. PREDICTIVE_CONTEXT
 * 9. SYSTEM_DEFAULT (Lowest)
 */

import { ConversationContext, ConversationTurn } from "./contextTypes";
import { StructuredIntent } from "./intentTypes";
import { ReasoningAnalysis } from "./reasoningTypes";
import { PlanningAnalysis } from "./planningTypes";
import { VerificationAnalysis } from "./verificationTypes";
import { MemoryGovernanceAnalysis } from "./memoryGovernanceTypes";
import { LearningAnalysis } from "./adaptiveLearningTypes";
import { PredictiveContextAnalysis } from "./predictiveContextTypes";

export type ResponseLanguage = "ENGLISH" | "BANGLA" | "BANGLISH" | "MIXED";
export type ResponseVerbosity = "EXTREME_CONCISE" | "CONCISE" | "NORMAL" | "DETAILED";
export type ResponseTone = "CASUAL" | "PROFESSIONAL" | "TECHNICAL" | "ACADEMIC" | "WARM_FRIENDLY" | "DIRECT";
export type ResponseFormatStyle = "PROSE" | "BULLET_POINTS" | "NUMBERED_LIST" | "STEP_BY_STEP" | "TABLE" | "CODE_ONLY" | "RAW";
export type ResponseCodeDensity = "NONE" | "MINIMAL" | "BALANCED" | "CODE_FOCUSED" | "CODE_ONLY";
export type ResponseExplanationDepth = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

export type AdaptationPrecedenceLayer =
  | "CURRENT_TURN_EXPLICIT"
  | "HARD_CONSTRAINT"
  | "CORRECTION_NEGATION"
  | "VERIFIED_EVIDENCE"
  | "GOVERNANCE_BOUNDARY"
  | "CONFIRMED_ADAPTIVE"
  | "CONFIRMED_PREFERENCE"
  | "PREDICTIVE_CONTEXT"
  | "SYSTEM_DEFAULT";

export type AdaptationDimension =
  | "language"
  | "verbosity"
  | "tone"
  | "formatStyle"
  | "codeDensity"
  | "explanationDepth";

export interface ResolvedDimensionValue<T> {
  dimension: AdaptationDimension;
  value: T;
  winningLayer: AdaptationPrecedenceLayer;
  winningSource: string;
  confidence: number; // Bounded [0.0, 1.0]
  overriddenLayers: Array<{
    layer: AdaptationPrecedenceLayer;
    source: string;
    value: string;
  }>;
}

export interface ResponseStyleProfile {
  language: ResolvedDimensionValue<ResponseLanguage>;
  verbosity: ResolvedDimensionValue<ResponseVerbosity>;
  tone: ResolvedDimensionValue<ResponseTone>;
  formatStyle: ResolvedDimensionValue<ResponseFormatStyle>;
  codeDensity: ResolvedDimensionValue<ResponseCodeDensity>;
  explanationDepth: ResolvedDimensionValue<ResponseExplanationDepth>;
  targetPersona?: string;
  domainSpecialization?: string;
  cautionRequired: boolean;
  cautionReason?: string;
}

export interface PersonalizationContextItem {
  key: string;
  value: string;
  category: string;
  source: "GOVERNANCE_MEMORY" | "ADAPTIVE_PATTERN" | "PREDICTIVE_CONTEXT";
  sanitized: boolean;
}

export interface AppliedOverride {
  dimension: AdaptationDimension;
  winner: AdaptationPrecedenceLayer;
  overrode: AdaptationPrecedenceLayer;
  winningValue: string;
  overriddenValue: string;
  reason: string;
}

export interface SuppressedAttribute {
  attribute: string;
  value?: string;
  reason:
    | "SENSITIVE_DATA"
    | "TOPIC_MISMATCH"
    | "CURRENT_TURN_OVERRIDE"
    | "GOVERNANCE_SUPPRESSED"
    | "UNCONFIRMED_CANDIDATE"
    | "CONFLICT_RESOLVED";
}

export interface AdaptationDiagnostics {
  layersEvaluated: number;
  overridesCount: number;
  suppressedCount: number;
  sensitiveBlockedCount: number;
  cautionApplied: boolean;
  timingMs?: number;
}

export interface ResponseAdaptationAnalysis {
  styleProfile: ResponseStyleProfile;
  language: ResponseLanguage;
  verbosity: ResponseVerbosity;
  tone: ResponseTone;
  formatStyle: ResponseFormatStyle;
  codeDensity: ResponseCodeDensity;
  explanationDepth: ResponseExplanationDepth;
  appliedOverrides: AppliedOverride[];
  suppressedAttributes: SuppressedAttribute[];
  adaptationDirectives: string[];
  sanitizedPersonalizationContext: PersonalizationContextItem[];
  safetyStatus: "SAFE" | "CAUTION_APPLIED" | "SENSITIVE_SUPPRESSED";
  diagnostics: AdaptationDiagnostics;
}

export interface ResponseAdaptationInput {
  message: string;
  context: ConversationContext;
  intent: StructuredIntent;
  reasoning?: ReasoningAnalysis;
  planning?: PlanningAnalysis;
  verification?: VerificationAnalysis;
  governanceAnalysis?: MemoryGovernanceAnalysis;
  adaptiveLearning?: LearningAnalysis;
  predictiveContext?: PredictiveContextAnalysis;
  history?: ConversationTurn[];
  options?: {
    userId?: string;
    currentTime?: number;
    defaultLanguage?: ResponseLanguage;
    defaultVerbosity?: ResponseVerbosity;
    defaultTone?: ResponseTone;
    defaultFormatStyle?: ResponseFormatStyle;
    defaultCodeDensity?: ResponseCodeDensity;
    defaultExplanationDepth?: ResponseExplanationDepth;
  };
}
