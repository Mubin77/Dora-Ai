/**
 * Dora Autonomous Android Agent - Type Definitions (Phase 3)
 * 
 * Defines models for autonomous tasks, adaptive planning, action decisions,
 * execution context, state machine, verification, recovery, and progress events.
 */

import {
  DeviceAction,
  DeviceActionResult,
  DeviceErrorCode,
  ScreenObservation,
  UIElement,
} from "../DeviceActionTypes";

export type AutonomousTaskStatus =
  | "planning"
  | "observing"
  | "acting"
  | "verifying"
  | "recovering"
  | "completed"
  | "failed"
  | "cancelled"
  | "waiting_for_confirmation";

export type AutonomousState =
  | "IDLE"
  | "UNDERSTANDING"
  | "PLANNING"
  | "OBSERVING"
  | "DECIDING"
  | "ACTING"
  | "VERIFYING"
  | "RECOVERING"
  | "WAITING_FOR_CONFIRMATION"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type TaskPlanStepStatus = "pending" | "in_progress" | "completed" | "failed" | "skipped";

export interface TaskPlanStep {
  stepId: string;
  description: string;
  targetAction?: DeviceAction;
  status: TaskPlanStepStatus;
  reason?: string;
  expectedOutcome?: string;
  attempts?: number;
}

export interface TaskPlan {
  taskId: string;
  goal: string;
  targetApp?: string;
  steps: TaskPlanStep[];
  isAdaptive: boolean;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface ActionDecisionTarget {
  elementId?: string;
  text?: string;
  resourceId?: string;
  contentDescription?: string;
  className?: string;
  appName?: string;
  x?: number;
  y?: number;
  direction?: "up" | "down" | "left" | "right";
  durationMs?: number;
}

export interface ActionDecision {
  action: DeviceAction;
  reason: string;
  target?: ActionDecisionTarget;
  parameters?: Record<string, any>;
  expectedOutcome: string;
  stepId?: string;
  requiresConfirmation?: boolean;
  confidence?: number;
  fallbackStrategy?: "scroll_down" | "press_back" | "retry_observation" | "replan";
}

export interface AutonomousActionRecord {
  stepIndex: number;
  stepId?: string;
  action: DeviceAction;
  targetDescription: string;
  parameters?: Record<string, any>;
  result: DeviceActionResult;
  fingerprintBefore?: string;
  fingerprintAfter?: string;
  timestamp: number;
  durationMs: number;
}

export interface TaskVerificationResult {
  verified: boolean;
  confidence: number;
  reason: string;
  isGoalComplete?: boolean;
  stateChanged?: boolean;
  details?: string;
}

export interface ConfirmationRequest {
  taskId: string;
  action: DeviceAction;
  reason: string;
  targetDescription: string;
  parameters?: Record<string, any>;
  riskLevel: "HIGH_RISK" | "CONFIRMATION_REQUIRED";
  timestamp: number;
}

export interface AutonomousTaskResult {
  taskId: string;
  goal: string;
  success: boolean;
  status: AutonomousTaskStatus;
  stepsCompleted: number;
  totalSteps: number;
  actionCount: number;
  durationMs: number;
  summaryMessage: string;
  error?: {
    code: DeviceErrorCode | "AUTONOMOUS_STEP_LIMIT_REACHED" | "TASK_TIMEOUT" | "TASK_CANCELLED" | "LOOP_DETECTED" | "UNRECOVERABLE_ERROR";
    details: string;
  } | null;
  plan: TaskPlan;
  history: AutonomousActionRecord[];
  isMockMode: boolean;
}

export interface AutonomousTask {
  taskId: string;
  goal: string;
  status: AutonomousTaskStatus;
  createdAt: number;
  updatedAt: number;
  currentStep: number;
  maxSteps: number;
  steps: TaskPlanStep[];
  observations: Array<{ observationId: string; timestamp: number; packageName?: string }>;
  actions: AutonomousActionRecord[];
  result: AutonomousTaskResult | null;
  confirmationRequest?: ConfirmationRequest | null;
}

export type AutonomousProgressEventType =
  | "TASK_STARTED"
  | "OBSERVATION_UPDATED"
  | "ACTION_STARTED"
  | "ACTION_COMPLETED"
  | "VERIFICATION_STARTED"
  | "VERIFICATION_COMPLETED"
  | "RECOVERY_STARTED"
  | "TASK_COMPLETED"
  | "TASK_FAILED"
  | "TASK_CANCELLED"
  | "CONFIRMATION_REQUIRED";

export interface AutonomousProgressEvent {
  type: AutonomousProgressEventType;
  taskId: string;
  status: AutonomousTaskStatus;
  currentStep: number;
  totalSteps: number;
  message: string;
  data?: Record<string, any>;
  timestamp: number;
}

export interface AutonomousConfig {
  maxSteps?: number;
  maxRetriesPerAction?: number;
  maxRepeatedActions?: number;
  actionTimeoutMs?: number;
  observationTimeoutMs?: number;
  verificationTimeoutMs?: number;
  totalTaskTimeoutMs?: number;
  isMockMode?: boolean;
}

export interface NormalizedScreenRepresentation {
  observationId: string;
  packageName: string;
  activityName?: string;
  windowTitle?: string;
  visibleTexts: string[];
  clickableElements: Array<{ id: string; text?: string; desc?: string; resId?: string; bounds: any }>;
  editableFields: Array<{ id: string; text?: string; desc?: string; resId?: string; isPassword?: boolean }>;
  scrollableContainers: Array<{ id: string; className: string }>;
  fingerprint: string;
  elementCount: number;
  timestamp: number;
}
