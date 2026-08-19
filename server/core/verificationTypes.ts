/**
 * Dora Verification, Confidence Calibration & Self-Correction Engine Types
 * 
 * Defines structured verification models, claim classifications, confidence assessments,
 * contradiction detections, constraint compliance audits, and self-correction actions
 * for Dora's cognitive pipeline.
 * 
 * Pipeline Stage:
 * ContextEngine -> IntentEngine -> ReasoningEngine -> PlanningEngine -> VerificationEngine -> BrainEngine
 */

export type VerificationStatus =
  | "NOT_REQUIRED"
  | "PASSED"
  | "PASSED_WITH_UNCERTAINTY"
  | "NEEDS_EVIDENCE"
  | "NEEDS_CLARIFICATION"
  | "FAILED"
  | "SELF_CORRECTED";

export type ClaimType =
  | "VERIFIED_FACT"
  | "USER_PROVIDED_FACT"
  | "DERIVED_CONCLUSION"
  | "ASSUMPTION"
  | "UNVERIFIED_CLAIM";

export interface ClaimVerification {
  id: string;
  claim: string;
  type: ClaimType;
  isSupported: boolean;
  evidenceSource?: string;
  confidenceImpact: number;
}

export type ContradictionType =
  | "HARD_CONSTRAINT_VIOLATION"
  | "INTENT_MISMATCH"
  | "EVIDENCE_CONTRADICTION"
  | "TOPIC_POLLUTION"
  | "LOGICAL_INCONSISTENCY";

export type ContradictionSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface Contradiction {
  type: ContradictionType;
  description: string;
  expected: string;
  actual: string;
  severity: ContradictionSeverity;
}

export type CorrectionAction =
  | "RECHECK_CONSTRAINTS"
  | "RECHECK_CONTEXT"
  | "RECHECK_INTENT"
  | "RECHECK_EVIDENCE"
  | "REVISE_REASONING"
  | "REVISE_PLAN"
  | "REQUEST_CLARIFICATION"
  | "REQUEST_TOOL_DATA"
  | "LOWER_CONFIDENCE"
  | "ABORT_UNSUPPORTED_CONCLUSION";

export type ConfidenceBand =
  | "STRONGLY_VERIFIED"    // 0.90 - 1.00
  | "GOOD_CONFIDENCE"      // 0.75 - 0.89
  | "MODERATE_UNCERTAINTY"  // 0.50 - 0.74
  | "LOW_CONFIDENCE"        // 0.30 - 0.49
  | "INSUFFICIENT_BASIS";   // 0.00 - 0.29

export interface ConfidenceFactor {
  factor: string;
  impact: number;
  reason: string;
}

export interface ConfidenceAssessment {
  rawScore: number;
  calibratedScore: number;
  confidenceCap?: number;
  confidenceBand: ConfidenceBand;
  factors: ConfidenceFactor[];
}

export type EvidenceQuality = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export interface EvidenceAssessment {
  requiredEvidence: string[];
  availableEvidence: string[];
  missingEvidence: string[];
  evidenceQuality: EvidenceQuality;
  isEvidenceComplete: boolean;
}

export interface ConstraintCompliance {
  hardConstraintsSatisfied: boolean;
  softPreferencesSatisfied: boolean;
  violatedHardConstraints: string[];
  violatedSoftConstraints: string[];
}

export interface ConsistencyChecks {
  isInternallyConsistent: boolean;
  isPlanAligned: boolean;
  isIntentAligned: boolean;
  isContextIsolated: boolean;
  details: string[];
}

export interface VerificationAnalysis {
  verificationRequired: boolean;
  verificationStatus: VerificationStatus;
  factualClaims: ClaimVerification[];
  supportedClaims: ClaimVerification[];
  unsupportedClaims: ClaimVerification[];
  assumptions: string[];
  contradictions: Contradiction[];
  missingEvidence: string[];
  evidenceQuality: EvidenceQuality;
  evidenceAssessment: EvidenceAssessment;
  confidence: ConfidenceAssessment;
  confidenceScore: number;
  selfCorrectionRequired: boolean;
  correctionActions: CorrectionAction[];
  correctionIterations: number;
  correctedConclusion?: string;
  consistencyChecks: ConsistencyChecks;
  constraintCompliance: ConstraintCompliance;
  intentAlignment: boolean;
  recommendationValidity: boolean;
  requiresClarification: boolean;
  clarificationReason?: string;
  directives: string[];
}
