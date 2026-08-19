/**
 * Dora Planning & Task Orchestration Types
 * 
 * Formal representation of multi-step task plans, step dependencies, execution strategies,
 * failure fallbacks, input/output flow, and plan lifecycle state transitions.
 */

import { BrainIntent } from "./intentTypes";
import { ReasoningType, ToolRequirement } from "./reasoningTypes";

export type PlanStatus =
  | "NOT_STARTED"
  | "READY"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type PlanPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export type PlanComplexity = "LOW" | "MEDIUM" | "HIGH";

export type ExecutionStrategy =
  | "SEQUENTIAL"
  | "PARALLEL_BATCH"
  | "CONDITIONAL_BRANCH"
  | "DIRECT_EXECUTION";

export type FailureStrategy =
  | "RETRY"
  | "REQUEST_CLARIFICATION"
  | "ALTERNATIVE_TOOL"
  | "SKIP_OPTIONAL"
  | "BLOCK_PLAN"
  | "TERMINATE";

export type PlanActionType =
  | "CREATED"
  | "CONTINUED"
  | "UPDATED"
  | "ACTIVATED"
  | "CANCELLED"
  | "BLOCKED"
  | "BYPASSED";

/**
 * Individual executable step in a TaskPlan
 */
export interface PlanStep {
  id: string;
  title: string;
  description: string;
  order: number;
  status: PlanStatus;
  dependencies: string[]; // IDs of preceding steps that must be COMPLETED
  requiredInputs: string[];
  expectedOutput: string;
  toolRequirement?: ToolRequirement;
  canRunInParallel: boolean;
  completionCriteria: string;
  failureReason?: string;
  completedAt?: number;
}

/**
 * Structured Task Plan for multi-step reasoning, research, or execution
 */
export interface TaskPlan {
  id: string;
  objective: string;
  goal: string;
  status: PlanStatus;
  priority: PlanPriority;
  complexity: PlanComplexity;
  steps: PlanStep[];
  dependencies: Record<string, string[]>; // Step ID -> Array of dependency Step IDs
  requiredInputs: string[];
  availableInputs: string[];
  missingInputs: string[];
  toolRequirements: ToolRequirement[];
  executionStrategy: ExecutionStrategy;
  completionCriteria: string[];
  failureStrategy: FailureStrategy;
  createdAt: number;
  updatedAt: number;
  sourceIntent: BrainIntent;
  sourceReasoning: ReasoningType;
  isCancellable: boolean;
  activeStepId?: string;
  clarificationRequirement?: string;
}

/**
 * Result of PlanningEngine evaluation on the current conversational turn
 */
export interface PlanningAnalysis {
  requiresPlanning: boolean;
  plan?: TaskPlan;
  planningReason?: string;
  activePlanStatus?: PlanStatus;
  planAction?: PlanActionType;
  directives: string[];
}
