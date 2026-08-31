/**
 * Dora Autonomous Android Agent - Phase 3 Type Definitions
 * 
 * Defines state machines, execution plans, semantic screen models,
 * recovery strategies, verification outcomes, and autonomous task lifecycles.
 */

import {
  DeviceAction,
  DeviceActionResult,
  DeviceErrorCode,
  DeviceType,
  RectBounds,
  ScreenObservation,
  UIElement,
} from "../DeviceActionTypes";

export type TaskStatus =
  | "idle"
  | "planning"
  | "observing"
  | "deciding"
  | "acting"
  | "verifying"
  | "recovering"
  | "waiting_for_confirmation"
  | "completed"
  | "failed"
  | "cancelled";

export type StepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "skipped"
  | "recovering";

export type SemanticElementRole =
  | "search_input"
  | "search_button"
  | "text_input"
  | "action_button"
  | "list_item"
  | "navigation_tab"
  | "back_button"
  | "close_button"
  | "dialog_confirm"
  | "dialog_cancel"
  | "media_item"
  | "header"
  | "switch_toggle"
  | "sensitive_field"
  | "generic_clickable"
  | "unknown";

export interface SemanticUIElement extends UIElement {
  role: SemanticElementRole;
  semanticLabel: string;
  confidence: number;
}

export interface NormalizedScreenSummary {
  observationId: string;
  packageName: string;
  activityName?: string;
  windowTitle?: string;
  fingerprint: string;
  isPasswordOrAuthScreen: boolean;
  hasSearchControl: boolean;
  hasInputControl: boolean;
  hasDialog: boolean;
  keyElements: SemanticUIElement[];
  totalElementsCount: number;
  clickableCount: number;
  editableCount: number;
  textSummary: string;
}

export interface TaskPlanStep {
  stepId: string;
  stepNumber: number;
  description: string;
  intendedAction: DeviceAction;
  targetQuery?: string;
  targetAppName?: string;
  targetRole?: SemanticElementRole;
  targetText?: string;
  status: StepStatus;
  retryCount: number;
  maxRetries: number;
  expectedOutcome: string;
  actualOutcome?: string;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface TaskPlan {
  planId: string;
  goal: string;
  targetApp?: string;
  steps: TaskPlanStep[];
  isAdaptive: boolean;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface ActionDecision {
  action: DeviceAction;
  parameters: Record<string, any>;
  reason: string;
  stepId: string;
  targetElement?: SemanticUIElement;
  expectedOutcome: string;
  confidence: number;
  requiresConfirmation?: boolean;
  confirmationPrompt?: string;
  fallbackStrategy?: "scroll_down" | "scroll_up" | "press_back" | "retry_fresh" | "replan" | "vision_fallback";
}

export interface StepVerificationOutcome {
  verified: boolean;
  confidence: number;
  status: "VERIFIED_SUCCESS" | "VERIFIED_NO_CHANGE" | "VERIFIED_FAILED" | "NOT_VERIFIED";
  details: string;
  isGoalSatisfied: boolean;
  isSubgoalSatisfied: boolean;
  screenChanged: boolean;
  newObservationId?: string;
}

export interface RecoveryActionPlan {
  strategy: "retry_fresh_observation" | "scroll_to_find" | "press_back_escape" | "replan_subgoals" | "ask_confirmation" | "abort_task";
  reason: string;
  actionToExecute?: ActionDecision;
  replanRequired?: boolean;
}

export interface AutonomousActionRecord {
  actionId: string;
  stepId: string;
  action: DeviceAction;
  parameters: Record<string, any>;
  decisionReason: string;
  preObservationId?: string;
  postObservationId?: string;
  result: DeviceActionResult;
  verification?: StepVerificationOutcome;
  timestamp: number;
  durationMs: number;
}

export interface TaskTimeouts {
  actionTimeoutMs: number;
  observationTimeoutMs: number;
  verificationTimeoutMs: number;
  totalTaskTimeoutMs: number;
}

export interface AutonomousTaskOptions {
  maxSteps?: number;
  maxRetriesPerStep?: number;
  timeouts?: Partial<TaskTimeouts>;
  mockMode?: boolean;
  allowHighRiskWithConfirmation?: boolean;
  onProgress?: (event: AutonomousProgressEvent) => void;
}

export interface AutonomousTaskResult {
  taskId: string;
  goal: string;
  success: boolean;
  status: TaskStatus;
  summary: string;
  totalStepsExecuted: number;
  totalDurationMs: number;
  plan: TaskPlan;
  actionsHistory: AutonomousActionRecord[];
  finalObservation?: ScreenObservation | null;
  error?: {
    code: DeviceErrorCode | string;
    details: string;
  } | null;
  isMockVerified: boolean;
  isDeviceVerified: boolean;
}

export interface AutonomousTask {
  taskId: string;
  goal: string;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
  currentStepIndex: number;
  maxSteps: number;
  maxRetriesPerStep: number;
  timeouts: TaskTimeouts;
  plan: TaskPlan;
  observations: ScreenObservation[];
  normalizedScreens: NormalizedScreenSummary[];
  actionsHistory: AutonomousActionRecord[];
  pendingConfirmation?: {
    prompt: string;
    action: ActionDecision;
    stepId: string;
  };
  result: AutonomousTaskResult | null;
  cancellationRequested: boolean;
  options: AutonomousTaskOptions;
}

export type AutonomousProgressEventType =
  | "TASK_STARTED"
  | "STATE_CHANGED"
  | "PLAN_GENERATED"
  | "PLAN_UPDATED"
  | "OBSERVATION_CAPTURED"
  | "ACTION_DECIDED"
  | "ACTION_EXECUTED"
  | "VERIFICATION_COMPLETED"
  | "RECOVERY_TRIGGERED"
  | "CONFIRMATION_REQUIRED"
  | "LOOP_DETECTED"
  | "TASK_COMPLETED"
  | "TASK_FAILED"
  | "TASK_CANCELLED";

export interface AutonomousProgressEvent {
  taskId: string;
  type: AutonomousProgressEventType;
  status: TaskStatus;
  stepIndex?: number;
  totalSteps?: number;
  message: string;
  timestamp: number;
  data?: Record<string, any>;
}
