/**
 * Dora Reasoning Engine Types
 * 
 * Defines structured reasoning representation, reasoning categories,
 * complexity levels, constraint separation (hard vs soft), subtasks,
 * trade-off models, and tool/evidence requirements.
 * 
 * NOTE: Does NOT store private chain-of-thought or hidden reasoning traces.
 * Stores only structured, actionable metadata and plan summaries.
 */

export type ReasoningType =
  | "DIRECT_ANSWER"
  | "SIMPLE_DEDUCTION"
  | "MULTI_FACTOR_DECISION"
  | "COMPARISON"
  | "TRADEOFF_ANALYSIS"
  | "CAUSAL_ANALYSIS"
  | "DIAGNOSTIC"
  | "ESTIMATION"
  | "CALCULATION"
  | "STEP_BY_STEP_PROCEDURE"
  | "PLANNING"
  | "MULTI_STEP_PROBLEM"
  | "INFORMATION_SYNTHESIS"
  | "CONSTRAINT_SATISFACTION"
  | "RECOMMENDATION_REASONING"
  | "TOOL_ASSISTED_REASONING";

export type ComplexityLevel = "LOW" | "MEDIUM" | "HIGH";

export type ConclusionStrategy =
  | "FACTUAL_ANSWER"
  | "RANKED_RECOMMENDATION"
  | "COMPARISON_VERDICT"
  | "TRADEOFF_EXPLANATION"
  | "DIAGNOSTIC_CONCLUSION"
  | "STEP_BY_STEP_SOLUTION"
  | "CLARIFICATION_REQUEST"
  | "TOOL_ASSISTED_RESULT";

export interface ReasoningSubtask {
  id: string;
  stepNumber: number;
  description: string;
  status: "pending" | "completed";
  requiredTool?: string;
}

export interface ComparisonFactor {
  factor: string;
  relevance: number;
  entities?: string[];
}

export interface TradeoffDimension {
  dimensionA: string;
  dimensionB: string;
  explanation: string;
}

export interface StructuredReasoningConstraint {
  key: string;
  value: any;
  isHardConstraint: boolean;
  source: "user_explicit" | "context_inferred";
}

export interface ToolRequirement {
  toolType: "search" | "weather" | "calculator" | "specs_lookup" | "temporal";
  query?: string;
  reason: string;
  isMandatory: boolean;
}

export interface ReasoningAnalysis {
  reasoningRequired: boolean;
  reasoningType: ReasoningType;
  complexity: ComplexityLevel;
  objective: string;
  relevantContext: {
    topic?: string;
    task?: string;
    userGoal?: string;
  };
  relevantEntities: string[];
  relevantConstraints: StructuredReasoningConstraint[];
  assumptions: string[];
  missingInformation: string[];
  subtasks: ReasoningSubtask[];
  comparisons: ComparisonFactor[];
  tradeoffs: TradeoffDimension[];
  evidenceRequirements: string[];
  toolRequirements: ToolRequirement[];
  conclusionStrategy: ConclusionStrategy;
  reasoningConfidence: number;
  requiresClarification: boolean;
  clarificationPrompt?: string;
  reasoningPlanSummary?: string[];
  directives: string[];
}
