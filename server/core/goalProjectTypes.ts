/**
 * Goal, Project & Commitment Memory Types (Phase 2 - Step 10)
 * 
 * Defines strongly-typed models for validated long-running user goals,
 * bounded projects, explicit commitments, milestones, dependencies,
 * blockers, and project lifecycle state.
 */

import { UserModelEvidenceAuthority } from "./longTermUserModelTypes";

/**
 * Standard lifecycle states for Goals, Projects, Commitments, and Milestones.
 */
export type GoalProjectStatus =
  | "ACTIVE"
  | "PAUSED"
  | "BLOCKED"
  | "COMPLETED"
  | "ABANDONED"
  | "ARCHIVED"
  | "EXPIRED"
  | "UNKNOWN";

/**
 * Task execution statuses for project tasks.
 */
export type TaskExecutionStatus =
  | "NOT_STARTED"
  | "READY"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "COMPLETED"
  | "CANCELLED";

/**
 * Priority levels.
 */
export type GoalProjectPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * Scope of a goal or commitment.
 */
export type GoalScope = "GLOBAL" | "PROJECT" | "TOPIC";

/**
 * Evidence supporting a goal, project, or commitment.
 */
export interface GoalProjectEvidence {
  evidenceId: string;
  source: string;
  authority: UserModelEvidenceAuthority;
  textSnippet?: string;
  turnOrSessionId?: string;
  timestamp: number;
}

/**
 * Goal Model: Validated desired outcome.
 */
export interface Goal {
  goalId: string;
  title: string;
  normalizedTitle: string;
  scope: GoalScope;
  status: GoalProjectStatus;
  priority: GoalProjectPriority;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  targetDate?: number;
  targetDateString?: string;
  evidence: GoalProjectEvidence[];
  sourceAuthority: UserModelEvidenceAuthority;
  confidence: number;
  projectIds: string[];
  milestoneIds: string[];
  lineage: string[];
  blockerDescription?: string;
  isCurrentTurnOverride?: boolean;
  version?: number;
}

/**
 * Milestone Model: Intermediate outcome within a project.
 */
export interface Milestone {
  milestoneId: string;
  title: string;
  normalizedTitle: string;
  projectId: string;
  order: number;
  status: GoalProjectStatus;
  dependencies: string[];
  completedAt?: number;
  evidence: GoalProjectEvidence[];
  sourceAuthority: UserModelEvidenceAuthority;
  targetDate?: number;
}

/**
 * Project Task Model: Lightweight actionable step within a project/goal.
 */
export interface ProjectTask {
  taskId: string;
  title: string;
  normalizedTitle: string;
  status: TaskExecutionStatus;
  projectId?: string;
  goalId?: string;
  milestoneId?: string;
  dependencies: string[];
  blockedBy?: string[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  sourceAuthority: UserModelEvidenceAuthority;
  order?: number;
}

/**
 * Commitment Model: Validated explicit user intention/promise.
 */
export interface Commitment {
  commitmentId: string;
  title: string;
  normalizedTitle: string;
  status: GoalProjectStatus;
  projectId?: string;
  goalId?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  deadline?: number;
  deadlineString?: string;
  isExpired?: boolean;
  evidence: GoalProjectEvidence[];
  sourceAuthority: UserModelEvidenceAuthority;
  confidence: number;
  isUserInitiated: boolean;
  blockerDescription?: string;
}

/**
 * Dependency Model: Relationship between tasks, milestones, or goals.
 */
export interface ProjectDependency {
  dependencyId: string;
  sourceType: "TASK" | "MILESTONE" | "GOAL";
  sourceId: string;
  targetType: "TASK" | "MILESTONE" | "GOAL";
  targetId: string;
  isSatisfied: boolean;
  blockerReason?: string;
}

/**
 * Event Model: Historical event or state transition in a project/goal.
 */
export interface ProjectEvent {
  eventId: string;
  eventType:
    | "CREATED"
    | "STATUS_CHANGED"
    | "BLOCKED"
    | "UNBLOCKED"
    | "COMPLETED"
    | "PAUSED"
    | "RESUMED"
    | "REOPENED"
    | "DEADLINE_SET"
    | "EXPIRED"
    | "CANCELLED";
  targetType: "PROJECT" | "GOAL" | "COMMITMENT" | "MILESTONE" | "TASK";
  targetId: string;
  timestamp: number;
  description: string;
  sourceAuthority: UserModelEvidenceAuthority;
}

/**
 * Project Model: Bounded body of work containing goals, milestones, tasks, and commitments.
 */
export interface Project {
  projectId: string;
  name: string;
  normalizedName: string;
  description?: string;
  status: GoalProjectStatus;
  priority: GoalProjectPriority;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  targetDate?: number;
  targetDateString?: string;
  goals: Goal[];
  milestones: Milestone[];
  tasks: ProjectTask[];
  commitments: Commitment[];
  dependencies: ProjectDependency[];
  events: ProjectEvent[];
  sourceAuthority: UserModelEvidenceAuthority;
  confidence: number;
  lineage: string[];
  blockerDescription?: string;
  isCurrentTurnOverride?: boolean;
  version?: number;
}

/**
 * Aggregated state across all projects, goals, and commitments.
 */
export interface ProjectState {
  activeProjects: Project[];
  pausedProjects: Project[];
  blockedProjects: Project[];
  completedProjects: Project[];
  historicalProjects: Project[];
  activeGoals: Goal[];
  completedGoals: Goal[];
  activeCommitments: Commitment[];
  expiredCommitments: Commitment[];
  activeTasks: ProjectTask[];
}

/**
 * Diagnostic metrics for Goal & Project Engine.
 */
export interface GoalProjectDiagnostics {
  totalGoals: number;
  activeGoalsCount: number;
  totalProjects: number;
  activeProjectsCount: number;
  totalCommitments: number;
  expiredCommitmentsCount: number;
  readyTasksCount: number;
  blockedTasksCount: number;
  suppressedCandidateCount: number;
  suppressedSensitiveCount: number;
  suppressedPredictiveCount: number;
  isolatedTopicCount: number;
  evaluationTimeMs: number;
}

/**
 * Complete analysis returned by GoalProjectEngine.
 */
export interface GoalProjectAnalysis {
  state: ProjectState;
  activeProjects: Project[];
  blockedProjects: Project[];
  activeGoals: Goal[];
  activeCommitments: Commitment[];
  readyTasks: ProjectTask[];
  blockedTasks: ProjectTask[];
  directives: string[];
  currentTurnOverrides: {
    isProjectPaused?: boolean;
    isGoalCompleted?: boolean;
    switchedProject?: string;
    overrideReason?: string;
  };
  diagnostics: GoalProjectDiagnostics;
}

/**
 * Evaluation options for GoalProjectEngine.
 */
export interface GoalProjectEvaluationOptions {
  userId?: string;
  currentTime?: number;
  isTopicIsolated?: boolean;
  activeTopic?: string;
  currentProjectHint?: string;
}
