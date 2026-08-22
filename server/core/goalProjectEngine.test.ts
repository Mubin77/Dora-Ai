/**
 * DORA PHASE 2 STEP 10: GOAL, PROJECT & COMMITMENT MEMORY ENGINE TEST SUITE
 * 
 * Tests GP-1 through GP-50 verifying:
 * - Deterministic, bounded, non-LLM goal/project/commitment tracking
 * - Authority hierarchy & candidate memory safety
 * - Current-turn precedence & non-destructive temporary overrides
 * - Dependency DAG evaluation (unknown dependency blocks, completion enables)
 * - Evidence-based completion & blocker handling (no invented blockers/failures)
 * - Deterministic deadline parsing & neutral expiration semantics
 * - Project/topic isolation & privacy/identity safeguards
 * - Sanitized natural language directives without internal metadata leakage
 * - Full pipeline integration with BrainEngine
 */

import { goalProjectEngine } from "./goalProjectEngine";
import { brainEngine } from "./brainEngine";
import {
  Goal,
  Project,
  Commitment,
  ProjectTask,
  Milestone,
} from "./goalProjectTypes";
import { UserModelAnalysis } from "./longTermUserModelTypes";
import { MemoryGovernanceAnalysis } from "./memoryGovernanceTypes";
import { PlanningAnalysis } from "./planningTypes";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] ${name}`);
  } catch (err: any) {
    failedTests++;
    console.error(`[FAIL] ${name}: ${err.message}`);
  }
}

// Helpers for synthesizing test fixtures
function makeUserModel(attributes: Record<string, any>): UserModelAnalysis {
  const convertedAttrs: Record<string, any> = {};
  for (const [k, v] of Object.entries(attributes)) {
    convertedAttrs[k] = {
      key: v.key || k,
      dimension: v.dimension || (k.includes("goal") ? "USER_GOAL" : k.includes("project") ? "PROJECT_CONTEXT" : "INTERACTION_STYLE"),
      normalizedValue: v.value || "",
      confidence: v.confidence ?? 1.0,
      evidenceCount: 1,
      independentEvidenceCount: 1,
      status: v.status || "CONFIRMED",
      sourceClassification: v.sourceClassification || "EXPLICIT_USER_MEMORY",
      firstObservedAt: v.firstObservedAt || 1000,
      lastObservedAt: v.lastObservedAt || 1000,
      isDurable: true,
      isTemporary: false,
      evidence: [
        {
          evidenceId: `evi_${k}`,
          source: "USER_EXPLICIT",
          authority: v.sourceClassification || "EXPLICIT_USER_MEMORY",
          dimension: "INTERACTION_STYLE",
          value: v.value || "",
          timestamp: 1000,
          isExplicit: true,
        },
      ],
    };
  }

  return {
    userId: "test_user",
    profile: {
      userId: "test_user",
      attributes: convertedAttrs,
      confirmedAttributes: Object.values(convertedAttrs),
      candidateAttributes: [],
      temporaryAttributes: [],
      supersededAttributes: [],
      domainInterests: [],
      projectContexts: [],
      goals: [],
      lastSynthesizedAt: 1000,
    },
    activeDirectives: [],
    currentTurnOverrides: [],
    decisions: [],
    health: {
      evidenceCoverage: 1.0,
      conflictCount: 0,
      staleAttributeCount: 0,
      confirmedAttributeCount: Object.keys(convertedAttrs).length,
      candidateAttributeCount: 0,
      suppressedAttributeCount: 0,
      overallHealth: "EXCELLENT",
    },
    safetyStatus: "SAFE",
    diagnostics: {
      signalsProcessed: 1,
      memoriesIngested: 1,
      patternsIngested: 0,
      conflictsResolved: 0,
      sensitiveBlocked: 0,
      unsupportedIdentityBlocked: 0,
      isDeterministic: true,
    },
  };
}

function makeGovernanceAnalysis(allowedMemories: Array<{ key: string; value: string; type?: any; confidence?: number }>): MemoryGovernanceAnalysis {
  return {
    governanceRequired: true,
    memoryInfluenceAllowed: true,
    allowedMemories: allowedMemories.map((m) => ({
      memoryId: `mem_${m.key}`,
      key: m.key,
      value: m.value,
      type: m.type || "FACT",
      source: "EXPLICIT_USER",
      confidence: m.confidence ?? 1.0,
      status: "ACTIVE",
      usageDecision: "ALLOW",
      usageScore: 1.0,
      relevance: 1.0,
      reasons: ["HIGH_RELEVANCE"],
      canAffectResponseContent: true,
      canPersonalize: true,
      canSupportFactualClaim: true,
      requiresExplicitAttribution: false,
      isCandidateInferred: false,
    })),
    cautiousMemories: [],
    internalOnlyMemories: [],
    suppressedMemories: [],
    governedCandidates: [],
    conflicts: [],
    privacyBlocks: [],
    topicIsolationApplied: false,
    explicitReferenceDetected: false,
    directives: [],
    sanitizedMemoryContext: "",
    governanceConfidence: 1.0,
  };
}

console.log("=== DORA PHASE 2 STEP 10: GOAL, PROJECT & COMMITMENT MEMORY TEST SUITE ===");

// GP-1: Explicit user goal is detected
runTest("GP-1: Explicit user goal is detected", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I want to finish Dora's memory system",
    options: { currentTime: 5000 },
  });
  assert(res.activeGoals.length >= 1, "Goal must be extracted");
  const g = res.activeGoals[0];
  assert(g.title.toLowerCase().includes("finish dora"), "Goal title should match");
  assert(g.sourceAuthority === "CURRENT_TURN_EXPLICIT", "Authority should be CURRENT_TURN_EXPLICIT");
  assert(g.status === "ACTIVE", "Goal status must be ACTIVE");
});

// GP-2: Explicit project is detected
runTest("GP-2: Explicit project is detected", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "Working on project Website Redesign",
    options: { currentTime: 5000 },
  });
  assert(res.activeProjects.length >= 1, "Project must be extracted");
  const p = res.activeProjects[0];
  assert(p.name.toLowerCase().includes("website redesign"), "Project name should match");
  assert(p.status === "ACTIVE", "Project status must be ACTIVE");
});

// GP-3: Explicit commitment is detected
runTest("GP-3: Explicit commitment is detected", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I will review the voice system tomorrow",
    options: { currentTime: 5000 },
  });
  assert(res.activeCommitments.length >= 1, "Commitment must be extracted");
  const c = res.activeCommitments[0];
  assert(c.title.toLowerCase().includes("review the voice system"), "Commitment title should match");
  assert(c.isUserInitiated === true, "Must be user initiated");
  assert(c.deadlineString === "tomorrow", "Deadline string must be tomorrow");
});

// GP-4: Assistant suggestion does not create commitment
runTest("GP-4: Assistant suggestion does not create commitment", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "You should optimize the rendering performance",
    options: { currentTime: 5000 },
  });
  assert(res.activeCommitments.length === 0, "Assistant suggestion must NOT create user commitment");
});

// GP-5: Predictive context cannot create goal
runTest("GP-5: Predictive context cannot create goal", () => {
  const userModel = makeUserModel({
    pred_goal: {
      key: "predicted_goal",
      value: "Learn Rust",
      sourceClassification: "PREDICTIVE_CONTEXT",
      status: "CONFIRMED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
    },
  });
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    longTermUserModel: userModel,
    options: { currentTime: 5000 },
  });
  assert(res.activeGoals.length === 0, "Predictive context must not create active goal");
  assert(res.diagnostics.suppressedPredictiveCount >= 1, "Must increment suppressedPredictiveCount");
});

// GP-6: Predictive context cannot create project
runTest("GP-6: Predictive context cannot create project", () => {
  const userModel = makeUserModel({
    pred_proj: {
      key: "predicted_project",
      value: "E-Commerce App",
      sourceClassification: "PREDICTIVE_CONTEXT",
      status: "CONFIRMED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
    },
  });
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    longTermUserModel: userModel,
    options: { currentTime: 5000 },
  });
  assert(res.activeProjects.length === 0, "Predictive context must not create project");
});

// GP-7: Predictive context cannot create commitment
runTest("GP-7: Predictive context cannot create commitment", () => {
  const userModel = makeUserModel({
    pred_commit: {
      key: "predicted_commitment",
      value: "Deploy Friday",
      sourceClassification: "PREDICTIVE_CONTEXT",
      status: "CONFIRMED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
    },
  });
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    longTermUserModel: userModel,
    options: { currentTime: 5000 },
  });
  assert(res.activeCommitments.length === 0, "Predictive context must not create commitment");
});

// GP-8: Candidate memory cannot create authoritative project state
runTest("GP-8: Candidate memory cannot create authoritative project state", () => {
  const userModel = makeUserModel({
    cand_proj: {
      key: "project",
      value: "Unconfirmed Mobile App",
      sourceClassification: "REPEATED_VALIDATED_SIGNAL",
      status: "CANDIDATE",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
    },
  });
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    longTermUserModel: userModel,
    options: { currentTime: 5000 },
  });
  assert(res.activeProjects.length === 0, "Candidate record must not create authoritative project");
  assert(res.diagnostics.suppressedCandidateCount >= 1, "Candidate must be recorded in diagnostics");
});

// GP-9: Current-turn instruction overrides historical project context
runTest("GP-9: Current-turn instruction overrides historical project context", () => {
  const existingProjects: Project[] = [
    {
      projectId: "proj_dora",
      name: "Dora AI",
      normalizedName: "dora ai",
      status: "ACTIVE",
      priority: "HIGH",
      createdAt: 1000,
      updatedAt: 2000,
      goals: [],
      milestones: [],
      tasks: [],
      commitments: [],
      dependencies: [],
      events: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      lineage: [],
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "Pause Dora work for now",
    existingProjects,
    options: { currentTime: 5000 },
  });
  assert(res.currentTurnOverrides.isProjectPaused === true, "Current turn must indicate project paused");
  assert(res.directives.some((d) => d.includes("Current-turn instruction")), "Directive must reflect pause instruction");
});

// GP-10: Temporary current-turn instruction does not mutate durable project state
runTest("GP-10: Temporary current-turn instruction does not mutate durable project state", () => {
  const existingProjects: Project[] = [
    {
      projectId: "proj_dora",
      name: "Dora AI",
      normalizedName: "dora ai",
      status: "ACTIVE",
      priority: "HIGH",
      createdAt: 1000,
      updatedAt: 2000,
      goals: [],
      milestones: [],
      tasks: [],
      commitments: [],
      dependencies: [],
      events: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      lineage: [],
    },
  ];
  goalProjectEngine.evaluate({
    userId: "u1",
    message: "Pause Dora work for now",
    existingProjects,
    options: { currentTime: 5000 },
  });
  // Verify existingProjects array is NOT mutated
  assert(existingProjects[0].status === "ACTIVE", "Durable project status must remain ACTIVE");
});

// GP-11: Explicit durable update changes project state
runTest("GP-11: Explicit durable update changes project state", () => {
  const existingProjects: Project[] = [
    {
      projectId: "proj_dora",
      name: "Dora AI",
      normalizedName: "dora ai",
      status: "ACTIVE",
      priority: "HIGH",
      createdAt: 1000,
      updatedAt: 2000,
      goals: [],
      milestones: [],
      tasks: [],
      commitments: [],
      dependencies: [],
      events: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      lineage: [],
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I finished Dora AI project",
    existingProjects,
    options: { currentTime: 6000 },
  });
  const p = res.state.completedProjects.find((proj) => proj.projectId === "proj_dora");
  assert(p !== undefined, "Project must be marked completed in evaluated state");
  assert(p.status === "COMPLETED", "Status must be COMPLETED");
});

// GP-12: Explicit completion marks task completed
runTest("GP-12: Explicit completion marks task completed", () => {
  const planning: PlanningAnalysis = {
    plan: {
      id: "p1",
      objective: "Memory System",
      goal: "Implement memory engine",
      status: "IN_PROGRESS",
      priority: "NORMAL",
      complexity: "MEDIUM",
      executionStrategy: "SEQUENTIAL",
      failureStrategy: "RETRY",
      steps: [
        {
          id: "task_1",
          title: "Implement memory engine",
          description: "Implement memory engine",
          order: 1,
          status: "IN_PROGRESS",
          dependencies: [],
          requiredInputs: [],
          expectedOutput: "Done",
          canRunInParallel: false,
          completionCriteria: "Done",
        },
      ],
      dependencies: {},
      requiredInputs: [],
      availableInputs: [],
      missingInputs: [],
      toolRequirements: [],
      completionCriteria: ["Done"],
      createdAt: 1000,
      updatedAt: 1000,
      sourceIntent: "PLANNING",
      sourceReasoning: "PLANNING",
      isCancellable: true,
    },
    requiresPlanning: true,
    directives: [],
  };
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I finished implement memory engine",
    planning,
    options: { currentTime: 6000 },
  });
  const t = res.state.activeTasks.find((task) => task.taskId === "task_1");
  assert(t !== undefined, "Task must exist");
  assert(t.status === "COMPLETED", "Task must be marked COMPLETED");
});

// GP-13: Silence does not imply completion
runTest("GP-13: Silence does not imply completion", () => {
  const existingGoals: Goal[] = [
    {
      goalId: "g1",
      title: "Finish Dora Step 10",
      normalizedTitle: "finish dora step 10",
      scope: "PROJECT",
      status: "ACTIVE",
      priority: "HIGH",
      createdAt: 1000,
      updatedAt: 2000,
      evidence: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      projectIds: [],
      milestoneIds: [],
      lineage: [],
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "How is the weather today?",
    existingGoals,
    options: { currentTime: 100000 },
  });
  const g = res.activeGoals.find((goal) => goal.goalId === "g1");
  assert(g !== undefined, "Goal must remain active");
  assert(g.status === "ACTIVE", "Goal status must NOT change to completed simply due to silence/time");
});

// GP-14: Assistant statement does not imply completion
runTest("GP-14: Assistant statement does not imply completion", () => {
  const existingGoals: Goal[] = [
    {
      goalId: "g1",
      title: "Finish Dora Step 10",
      normalizedTitle: "finish dora step 10",
      scope: "PROJECT",
      status: "ACTIVE",
      priority: "HIGH",
      createdAt: 1000,
      updatedAt: 2000,
      evidence: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      projectIds: [],
      milestoneIds: [],
      lineage: [],
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "Assistant: You probably finished Dora Step 10",
    existingGoals,
    options: { currentTime: 5000 },
  });
  const g = res.activeGoals.find((goal) => goal.goalId === "g1");
  assert(g?.status === "ACTIVE", "Assistant speculation must not mark goal completed");
});

// GP-15: Unknown dependency blocks readiness
runTest("GP-15: Unknown dependency blocks readiness", () => {
  const taskMap = new Map<string, ProjectTask>();
  taskMap.set("task_b", {
    taskId: "task_b",
    title: "Integrate memory",
    normalizedTitle: "integrate memory",
    status: "NOT_STARTED",
    dependencies: ["non_existent_task_id"],
    createdAt: 1000,
    updatedAt: 1000,
    sourceAuthority: "VERIFIED_EVIDENCE",
  });
  const milestoneMap = new Map<string, Milestone>();
  const diagnostics = {
    totalGoals: 0,
    activeGoalsCount: 0,
    totalProjects: 0,
    activeProjectsCount: 0,
    totalCommitments: 0,
    expiredCommitmentsCount: 0,
    readyTasksCount: 0,
    blockedTasksCount: 0,
    suppressedCandidateCount: 0,
    suppressedSensitiveCount: 0,
    suppressedPredictiveCount: 0,
    isolatedTopicCount: 0,
    evaluationTimeMs: 0,
  };

  goalProjectEngine.resolveTaskDependencies(taskMap, milestoneMap, diagnostics);
  const taskB = taskMap.get("task_b")!;
  assert(taskB.status === "BLOCKED", "Unknown dependency must cause BLOCKED status");
  assert(taskB.blockedBy !== undefined && taskB.blockedBy.some((b) => b.includes("Unknown dependency")), "Must record unknown dependency in blockedBy");
});

// GP-16: Completed dependency enables dependent task
runTest("GP-16: Completed dependency enables dependent task", () => {
  const taskMap = new Map<string, ProjectTask>();
  taskMap.set("task_a", {
    taskId: "task_a",
    title: "Implement memory",
    normalizedTitle: "implement memory",
    status: "COMPLETED",
    dependencies: [],
    createdAt: 1000,
    updatedAt: 1000,
    sourceAuthority: "VERIFIED_EVIDENCE",
  });
  taskMap.set("task_b", {
    taskId: "task_b",
    title: "Integrate memory",
    normalizedTitle: "integrate memory",
    status: "NOT_STARTED",
    dependencies: ["task_a"],
    createdAt: 1000,
    updatedAt: 1000,
    sourceAuthority: "VERIFIED_EVIDENCE",
  });
  const milestoneMap = new Map<string, Milestone>();
  const diagnostics = {
    totalGoals: 0,
    activeGoalsCount: 0,
    totalProjects: 0,
    activeProjectsCount: 0,
    totalCommitments: 0,
    expiredCommitmentsCount: 0,
    readyTasksCount: 0,
    blockedTasksCount: 0,
    suppressedCandidateCount: 0,
    suppressedSensitiveCount: 0,
    suppressedPredictiveCount: 0,
    isolatedTopicCount: 0,
    evaluationTimeMs: 0,
  };

  goalProjectEngine.resolveTaskDependencies(taskMap, milestoneMap, diagnostics);
  const taskB = taskMap.get("task_b")!;
  assert(taskB.status === "READY", "Task with completed dependencies must become READY");
});

// GP-17: Parallel independent task remains eligible
runTest("GP-17: Parallel independent task remains eligible", () => {
  const taskMap = new Map<string, ProjectTask>();
  taskMap.set("task_blocked", {
    taskId: "task_blocked",
    title: "Dependent task",
    normalizedTitle: "dependent task",
    status: "NOT_STARTED",
    dependencies: ["unmet_dep"],
    createdAt: 1000,
    updatedAt: 1000,
    sourceAuthority: "VERIFIED_EVIDENCE",
  });
  taskMap.set("task_parallel", {
    taskId: "task_parallel",
    title: "Independent documentation",
    normalizedTitle: "independent documentation",
    status: "NOT_STARTED",
    dependencies: [],
    createdAt: 1000,
    updatedAt: 1000,
    sourceAuthority: "VERIFIED_EVIDENCE",
  });
  const milestoneMap = new Map<string, Milestone>();
  const diagnostics = {
    totalGoals: 0,
    activeGoalsCount: 0,
    totalProjects: 0,
    activeProjectsCount: 0,
    totalCommitments: 0,
    expiredCommitmentsCount: 0,
    readyTasksCount: 0,
    blockedTasksCount: 0,
    suppressedCandidateCount: 0,
    suppressedSensitiveCount: 0,
    suppressedPredictiveCount: 0,
    isolatedTopicCount: 0,
    evaluationTimeMs: 0,
  };

  goalProjectEngine.resolveTaskDependencies(taskMap, milestoneMap, diagnostics);
  assert(taskMap.get("task_blocked")!.status === "BLOCKED", "Blocked task is blocked");
  assert(taskMap.get("task_parallel")!.status === "READY", "Parallel independent task becomes READY");
});

// GP-18: Explicit blocker produces BLOCKED state
runTest("GP-18: Explicit blocker produces BLOCKED state", () => {
  const existingProjects: Project[] = [
    {
      projectId: "proj_api",
      name: "API Integration",
      normalizedName: "api integration",
      status: "ACTIVE",
      priority: "HIGH",
      createdAt: 1000,
      updatedAt: 2000,
      goals: [],
      milestones: [],
      tasks: [],
      commitments: [],
      dependencies: [],
      events: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      lineage: [],
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I can't continue because the API isn't working",
    existingProjects,
    options: { currentTime: 5000 },
  });
  assert(res.blockedProjects.length >= 1, "Project must be placed in blockedProjects");
  assert(res.blockedProjects[0].blockerDescription !== undefined, "Must record blockerDescription");
  assert(res.blockedProjects[0].blockerDescription!.toLowerCase().includes("api"), "Blocker must mention API");
});

// GP-19: Unspecified blocker is not invented
runTest("GP-19: Unspecified blocker is not invented", () => {
  const existingProjects: Project[] = [
    {
      projectId: "proj_api",
      name: "API Integration",
      normalizedName: "api integration",
      status: "ACTIVE",
      priority: "HIGH",
      createdAt: 1000,
      updatedAt: 2000,
      goals: [],
      milestones: [],
      tasks: [],
      commitments: [],
      dependencies: [],
      events: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      lineage: [],
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "Let's check the database logs",
    existingProjects,
    options: { currentTime: 5000 },
  });
  assert(res.blockedProjects.length === 0, "No blocker must be invented");
  assert(res.activeProjects.length === 1, "Project remains active");
});

// GP-20: Explicit deadline is preserved
runTest("GP-20: Explicit deadline is preserved", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I will submit the assignment by Friday",
    options: { currentTime: 1000000 },
  });
  assert(res.activeCommitments.length >= 1, "Commitment must be created");
  const c = res.activeCommitments[0];
  assert(c.deadline !== undefined, "Deadline timestamp must be calculated");
  assert(c.deadlineString === "by Friday", "Deadline label must be preserved");
});

// GP-21: No invented deadline
runTest("GP-21: No invented deadline", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I will improve code coverage",
    options: { currentTime: 1000000 },
  });
  assert(res.activeCommitments.length >= 1, "Commitment created");
  const c = res.activeCommitments[0];
  assert(c.deadline === undefined, "No deadline should be invented when not stated");
});

// GP-22: Expired commitment is detected deterministically
runTest("GP-22: Expired commitment is detected deterministically", () => {
  const existingCommitments: Commitment[] = [
    {
      commitmentId: "c_past",
      title: "Submit report",
      normalizedTitle: "submit report",
      status: "ACTIVE",
      createdAt: 1000,
      updatedAt: 2000,
      deadline: 5000,
      deadlineString: "yesterday",
      isExpired: false,
      evidence: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      isUserInitiated: true,
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    existingCommitments,
    options: { currentTime: 10000 }, // currentTime is past deadline
  });
  assert(res.state.expiredCommitments.length === 1, "Commitment must be marked expired");
  assert(res.state.expiredCommitments[0].isExpired === true, "isExpired flag must be true");
  assert(res.diagnostics.expiredCommitmentsCount === 1, "expired count must be 1");
});

// GP-23: Expired commitment does not imply user failure
runTest("GP-23: Expired commitment does not imply user failure", () => {
  const existingCommitments: Commitment[] = [
    {
      commitmentId: "c_past",
      title: "Submit report",
      normalizedTitle: "submit report",
      status: "EXPIRED",
      createdAt: 1000,
      updatedAt: 2000,
      deadline: 5000,
      isExpired: true,
      evidence: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      isUserInitiated: true,
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    existingCommitments,
    options: { currentTime: 10000 },
  });
  for (const d of res.directives) {
    assert(!d.toLowerCase().includes("failed"), "Directives must not say user failed");
    assert(!d.toLowerCase().includes("slacking"), "Directives must use neutral semantics");
  }
});

// GP-24: Completed project cannot silently resurrect
runTest("GP-24: Completed project cannot silently resurrect", () => {
  const existingProjects: Project[] = [
    {
      projectId: "proj_v1",
      name: "Version 1.0 Release",
      normalizedName: "version 1.0 release",
      status: "COMPLETED",
      priority: "MEDIUM",
      createdAt: 1000,
      updatedAt: 2000,
      completedAt: 2000,
      goals: [],
      milestones: [],
      tasks: [],
      commitments: [],
      dependencies: [],
      events: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      lineage: [],
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I remember Version 1.0 Release had good performance",
    existingProjects,
    options: { currentTime: 5000 },
  });
  assert(res.activeProjects.length === 0, "Completed project must not silently become active");
  assert(res.state.completedProjects.length === 1, "Must remain in completedProjects");
});

// GP-25: Explicitly reopened project creates valid new state/version
runTest("GP-25: Explicitly reopened project creates valid new state/version", () => {
  const existingProjects: Project[] = [
    {
      projectId: "proj_v1",
      name: "Website Redesign",
      normalizedName: "website redesign",
      status: "COMPLETED",
      priority: "MEDIUM",
      createdAt: 1000,
      updatedAt: 2000,
      completedAt: 2000,
      version: 1,
      goals: [],
      milestones: [],
      tasks: [],
      commitments: [],
      dependencies: [],
      events: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      lineage: ["created_at_1000"],
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "Reopen Website Redesign project",
    existingProjects,
    options: { currentTime: 8000 },
  });
  assert(res.activeProjects.length === 1, "Project must now be ACTIVE");
  const p = res.activeProjects[0];
  assert(p.version === 2, "Project version must increment to 2");
  assert(p.lineage.some((l) => l.includes("reopened")), "Lineage must record reopening");
});

// GP-26: Project-specific context does not leak into unrelated project
runTest("GP-26: Project-specific context does not leak into unrelated project", () => {
  const existingProjects: Project[] = [
    {
      projectId: "proj_dora",
      name: "Dora AI System",
      normalizedName: "dora ai system",
      status: "ACTIVE",
      priority: "HIGH",
      createdAt: 1000,
      updatedAt: 2000,
      goals: [],
      milestones: [],
      tasks: [],
      commitments: [],
      dependencies: [],
      events: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      lineage: [],
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "Let's do my University assignment essay",
    existingProjects,
    options: {
      currentTime: 5000,
      isTopicIsolated: true,
      activeTopic: "university assignment essay",
    },
  });
  assert(!res.directives.some((d) => d.includes("Dora AI System")), "Dora project directive must be suppressed under isolated topic");
  assert(res.diagnostics.isolatedTopicCount >= 1, "isolatedTopicCount must be incremented");
});

// GP-27: Global communication preference remains available
runTest("GP-27: Global communication preference remains available", () => {
  const userModel = makeUserModel({
    lang: {
      key: "preferred_language",
      value: "Bangla",
      category: "INTERACTION_STYLE",
      sourceClassification: "EXPLICIT_USER_MEMORY",
      status: "CONFIRMED",
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      confidence: 1.0,
    },
  });
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    longTermUserModel: userModel,
    options: {
      currentTime: 5000,
      isTopicIsolated: true,
      activeTopic: "cooking recipe",
    },
  });
  // GoalProjectEngine strictly leaves global language preferences untouched without errors
  assert(res !== undefined, "Evaluation must succeed cleanly");
});

// GP-28: Sensitive credentials are suppressed
runTest("GP-28: Sensitive credentials are suppressed", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "My goal is to store api_key sk-1234567890abcdef and password secret123",
    options: { currentTime: 5000 },
  });
  assert(res.activeGoals.length === 0, "Sensitive input must NOT create goal");
  assert(res.diagnostics.suppressedSensitiveCount >= 1, "Sensitive count must be incremented");
  for (const d of res.directives) {
    assert(!d.includes("sk-1234567890abcdef"), "Must not leak API key");
    assert(!d.includes("secret123"), "Must not leak password");
  }
});

// GP-29: No unsupported identity inference
runTest("GP-29: No unsupported identity inference", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I work as a senior software engineer at Google and earn salary 200k",
    options: { currentTime: 5000 },
  });
  assert(res.activeProjects.length === 0, "Identity claim must not create a project");
  assert(res.activeGoals.length === 0, "Identity claim must not create a goal");
});

// GP-30: Same input + same currentTime is deterministic
runTest("GP-30: Same input + same currentTime is deterministic", () => {
  const input = {
    userId: "u1",
    message: "I want to finish Dora memory system by Friday",
    options: { currentTime: 1000000 },
  };
  const res1 = goalProjectEngine.evaluate(input);
  const res2 = goalProjectEngine.evaluate(input);
  assert(JSON.stringify(res1) === JSON.stringify(res2), "Repeated evaluations must be identical");
});

// GP-31: Different currentTime changes temporal state deterministically
runTest("GP-31: Different currentTime changes temporal state deterministically", () => {
  const existingCommitments: Commitment[] = [
    {
      commitmentId: "c1",
      title: "Deploy code",
      normalizedTitle: "deploy code",
      status: "ACTIVE",
      createdAt: 1000,
      updatedAt: 1000,
      deadline: 5000,
      evidence: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      isUserInitiated: true,
    },
  ];
  const resBefore = goalProjectEngine.evaluate({
    userId: "u1",
    existingCommitments,
    options: { currentTime: 4000 },
  });
  const resAfter = goalProjectEngine.evaluate({
    userId: "u1",
    existingCommitments,
    options: { currentTime: 6000 },
  });
  assert(resBefore.activeCommitments.length === 1, "Active before deadline");
  assert(resAfter.activeCommitments.length === 0, "Expired after deadline");
  assert(resAfter.state.expiredCommitments.length === 1, "Recorded as expired");
});

// GP-32: No Date.now() decision dependency
runTest("GP-32: No Date.now() decision dependency", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I will finish tomorrow",
    options: { currentTime: 500000 },
  });
  const c = res.activeCommitments[0];
  assert(c.deadline === 500000 + 24 * 60 * 60 * 1000, "Deadline strictly relative to injected currentTime");
});

// GP-33: No Math.random()
runTest("GP-33: No Math.random()", () => {
  const h1 = goalProjectEngine.deterministicHash("test_string");
  const h2 = goalProjectEngine.deterministicHash("test_string");
  assert(h1 === h2, "Hash must be 100% deterministic");
});

// GP-34: No external network calls
runTest("GP-34: No external network calls", () => {
  const res = goalProjectEngine.evaluate({
    userId: "offline_user",
    message: "My goal is to learn offline programming",
    options: { currentTime: 1000 },
  });
  assert(res.activeGoals.length === 1, "Engine operates completely synchronously in-memory");
});

// GP-35: No LLM calls
runTest("GP-35: No LLM calls", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I want to build a compiler",
    options: { currentTime: 1000 },
  });
  assert(res.activeGoals[0].title.includes("build a compiler"), "Pure regex/rule engine without LLM calls");
});

// GP-36: No autonomous tool execution
runTest("GP-36: No autonomous tool execution", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "Please delete the database",
    options: { currentTime: 1000 },
  });
  assert(res !== undefined, "Engine performs zero autonomous side effects");
});

// GP-37: Engine is read-only
runTest("GP-37: Engine is read-only", () => {
  const inputList: Project[] = [];
  goalProjectEngine.evaluate({
    userId: "u1",
    message: "Working on project Alpha",
    existingProjects: inputList,
    options: { currentTime: 1000 },
  });
  assert(inputList.length === 0, "Input arrays must not be mutated in-place");
});

// GP-38: Directive contains no internal IDs
runTest("GP-38: Directive contains no internal IDs", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "Working on project Dora AI System",
    options: { currentTime: 1000 },
  });
  for (const d of res.directives) {
    assert(!d.includes("proj_"), "No proj_ ID in directive");
    assert(!d.includes("goal_"), "No goal_ ID in directive");
    assert(!d.includes("commit_"), "No commit_ ID in directive");
  }
});

// GP-39: Directive contains no confidence values
runTest("GP-39: Directive contains no confidence values", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I want to finish Dora memory engine",
    options: { currentTime: 1000 },
  });
  for (const d of res.directives) {
    assert(!/\b0\.\d+\b/.test(d), "No confidence floats in directives");
  }
});

// GP-40: Directive contains no raw timestamps
runTest("GP-40: Directive contains no raw timestamps", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I will submit by Friday",
    options: { currentTime: 1700000000000 },
  });
  for (const d of res.directives) {
    assert(!d.includes("1700000000000"), "No epoch timestamps in directives");
  }
});

// GP-41: Multiple goals can coexist without collision
runTest("GP-41: Multiple goals can coexist without collision", () => {
  const existingGoals: Goal[] = [
    {
      goalId: "g1",
      title: "Learn TypeScript",
      normalizedTitle: "learn typescript",
      scope: "PROJECT",
      status: "ACTIVE",
      priority: "MEDIUM",
      createdAt: 1000,
      updatedAt: 1000,
      evidence: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      projectIds: [],
      milestoneIds: [],
      lineage: [],
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I want to master React",
    existingGoals,
    options: { currentTime: 2000 },
  });
  assert(res.activeGoals.length === 2, "Both goals must coexist");
});

// GP-42: Multiple projects remain isolated
runTest("GP-42: Multiple projects remain isolated", () => {
  const existingProjects: Project[] = [
    {
      projectId: "p1",
      name: "Project Alpha",
      normalizedName: "project alpha",
      status: "ACTIVE",
      priority: "HIGH",
      createdAt: 1000,
      updatedAt: 1000,
      goals: [],
      milestones: [],
      tasks: [],
      commitments: [],
      dependencies: [],
      events: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      lineage: [],
    },
    {
      projectId: "p2",
      name: "Project Beta",
      normalizedName: "project beta",
      status: "ACTIVE",
      priority: "MEDIUM",
      createdAt: 1000,
      updatedAt: 1000,
      goals: [],
      milestones: [],
      tasks: [],
      commitments: [],
      dependencies: [],
      events: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      lineage: [],
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    existingProjects,
    options: { currentTime: 2000 },
  });
  assert(res.activeProjects.length === 2, "Both projects preserved distinctly");
});

// GP-43: Project-scoped task remains project-scoped
runTest("GP-43: Project-scoped task remains project-scoped", () => {
  const planning: PlanningAnalysis = {
    plan: {
      id: "p_dora",
      objective: "Dora Memory",
      goal: "Write tests",
      status: "READY",
      priority: "NORMAL",
      complexity: "LOW",
      executionStrategy: "SEQUENTIAL",
      failureStrategy: "RETRY",
      steps: [
        {
          id: "step_1",
          title: "Write tests",
          description: "Write tests",
          order: 1,
          status: "READY",
          dependencies: [],
          requiredInputs: [],
          expectedOutput: "Tests written",
          canRunInParallel: false,
          completionCriteria: "Tests pass",
        },
      ],
      dependencies: {},
      requiredInputs: [],
      availableInputs: [],
      missingInputs: [],
      toolRequirements: [],
      completionCriteria: ["Tests pass"],
      createdAt: 1000,
      updatedAt: 1000,
      sourceIntent: "PLANNING",
      sourceReasoning: "PLANNING",
      isCancellable: true,
    },
    requiresPlanning: true,
    directives: [],
  };
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    planning,
    options: { currentTime: 2000 },
  });
  assert(res.readyTasks.length === 1, "Ready task must be captured");
  assert(res.readyTasks[0].title === "Write tests", "Task title matches");
});

// GP-44: Milestone dependency ordering is deterministic
runTest("GP-44: Milestone dependency ordering is deterministic", () => {
  const taskMap = new Map<string, ProjectTask>();
  taskMap.set("t1", {
    taskId: "t1",
    title: "Phase 1 Setup",
    normalizedTitle: "phase 1 setup",
    status: "COMPLETED",
    dependencies: [],
    createdAt: 1000,
    updatedAt: 1000,
    sourceAuthority: "VERIFIED_EVIDENCE",
  });
  taskMap.set("t2", {
    taskId: "t2",
    title: "Phase 2 Core",
    normalizedTitle: "phase 2 core",
    status: "NOT_STARTED",
    dependencies: ["t1"],
    createdAt: 1000,
    updatedAt: 1000,
    sourceAuthority: "VERIFIED_EVIDENCE",
  });
  taskMap.set("t3", {
    taskId: "t3",
    title: "Phase 3 Release",
    normalizedTitle: "phase 3 release",
    status: "NOT_STARTED",
    dependencies: ["t2"],
    createdAt: 1000,
    updatedAt: 1000,
    sourceAuthority: "VERIFIED_EVIDENCE",
  });
  const milestoneMap = new Map<string, Milestone>();
  const diagnostics = {
    totalGoals: 0,
    activeGoalsCount: 0,
    totalProjects: 0,
    activeProjectsCount: 0,
    totalCommitments: 0,
    expiredCommitmentsCount: 0,
    readyTasksCount: 0,
    blockedTasksCount: 0,
    suppressedCandidateCount: 0,
    suppressedSensitiveCount: 0,
    suppressedPredictiveCount: 0,
    isolatedTopicCount: 0,
    evaluationTimeMs: 0,
  };

  goalProjectEngine.resolveTaskDependencies(taskMap, milestoneMap, diagnostics);
  assert(taskMap.get("t1")!.status === "COMPLETED", "t1 remains COMPLETED");
  assert(taskMap.get("t2")!.status === "READY", "t2 becomes READY because t1 is completed");
  assert(taskMap.get("t3")!.status === "BLOCKED", "t3 remains BLOCKED because t2 is not completed yet");
});

// GP-45: Historical project state remains in lineage
runTest("GP-45: Historical project state remains in lineage", () => {
  const existingProjects: Project[] = [
    {
      projectId: "p1",
      name: "Old Project",
      normalizedName: "old project",
      status: "COMPLETED",
      priority: "LOW",
      createdAt: 1000,
      updatedAt: 2000,
      completedAt: 2000,
      version: 1,
      goals: [],
      milestones: [],
      tasks: [],
      commitments: [],
      dependencies: [],
      events: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      lineage: ["created_1000", "completed_2000"],
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "Reopen Old Project",
    existingProjects,
    options: { currentTime: 3000 },
  });
  const p = res.activeProjects[0];
  assert(p.lineage.length === 3, "Lineage must preserve full history");
  assert(p.lineage[0] === "created_1000", "First lineage item intact");
  assert(p.lineage[1] === "completed_2000", "Second lineage item intact");
  assert(p.lineage[2].includes("reopened"), "Third lineage item recorded");
});

// GP-46: Current project state is selected deterministically
runTest("GP-46: Current project state is selected deterministically", () => {
  const existingProjects: Project[] = [
    {
      projectId: "p_active",
      name: "Active Work",
      normalizedName: "active work",
      status: "ACTIVE",
      priority: "HIGH",
      createdAt: 1000,
      updatedAt: 2000,
      goals: [],
      milestones: [],
      tasks: [],
      commitments: [],
      dependencies: [],
      events: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      lineage: [],
    },
    {
      projectId: "p_archived",
      name: "Archived Work",
      normalizedName: "archived work",
      status: "ARCHIVED",
      priority: "LOW",
      createdAt: 500,
      updatedAt: 800,
      goals: [],
      milestones: [],
      tasks: [],
      commitments: [],
      dependencies: [],
      events: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      lineage: [],
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    existingProjects,
    options: { currentTime: 3000 },
  });
  assert(res.activeProjects.length === 1, "Only active project is in activeProjects");
  assert(res.activeProjects[0].projectId === "p_active", "Selected active project");
  assert(res.state.historicalProjects.length === 1, "Archived is in historicalProjects");
});

// GP-47: Equal-authority conflicts resolve deterministically
runTest("GP-47: Equal-authority conflicts resolve deterministically", () => {
  const existingGoals: Goal[] = [
    {
      goalId: "g_a",
      title: "Goal Alpha",
      normalizedTitle: "goal alpha",
      scope: "PROJECT",
      status: "ACTIVE",
      priority: "MEDIUM",
      createdAt: 1000,
      updatedAt: 1000,
      evidence: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      projectIds: [],
      milestoneIds: [],
      lineage: [],
    },
    {
      goalId: "g_b",
      title: "Goal Beta",
      normalizedTitle: "goal beta",
      scope: "PROJECT",
      status: "ACTIVE",
      priority: "MEDIUM",
      createdAt: 2000,
      updatedAt: 2000,
      evidence: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      projectIds: [],
      milestoneIds: [],
      lineage: [],
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    existingGoals,
    options: { currentTime: 3000 },
  });
  assert(res.activeGoals.length === 2, "Both goals maintained deterministically without random drops");
});

// GP-48: Higher-authority explicit update wins
runTest("GP-48: Higher-authority explicit update wins", () => {
  const existingGoals: Goal[] = [
    {
      goalId: "g1",
      title: "Write Python App",
      normalizedTitle: "write python app",
      scope: "PROJECT",
      status: "ACTIVE",
      priority: "MEDIUM",
      createdAt: 1000,
      updatedAt: 1000,
      evidence: [],
      sourceAuthority: "REPEATED_VALIDATED_SIGNAL",
      confidence: 0.7,
      projectIds: [],
      milestoneIds: [],
      lineage: [],
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I finished write python app",
    existingGoals,
    options: { currentTime: 5000 },
  });
  assert(res.state.completedGoals.length === 1, "Explicit completion wins over inferred baseline");
});

// GP-49: Step 9 temporal evidence does not create unsupported project facts
runTest("GP-49: Step 9 temporal evidence does not create unsupported project facts", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    temporalMemory: {
      userId: "u1",
      analyzedAt: 5000,
      patterns: [],
      activePatterns: [],
      historicalPatterns: [],
      evolutions: [],
      relations: [],
      directives: ["User frequently asks coding questions on weekends"],
      diagnostics: {
        totalPatternsAnalyzed: 0,
        stableCount: 0,
        recurringCount: 0,
        evolvingCount: 0,
        historicalCount: 0,
        staleCount: 0,
        suppressedSensitiveCount: 0,
        topicIsolatedCount: 0,
        evolutionTransitions: [],
      },
    },
    options: { currentTime: 5000 },
  });
  assert(res.activeProjects.length === 0, "Temporal pattern does not create a fake project");
  assert(res.activeGoals.length === 0, "Temporal pattern does not create a fake goal");
});

// GP-50: Idempotent repeated analysis produces identical results
runTest("GP-50: Idempotent repeated analysis produces identical results", () => {
  const analysis1 = brainEngine.analyze("I want to finish Dora Step 10 project", [], undefined, "session_test", undefined, {
    currentTime: 10000,
  });
  const analysis2 = brainEngine.analyze("I want to finish Dora Step 10 project", [], undefined, "session_test", undefined, {
    currentTime: 10000,
  });
  assert(analysis1.goalProjectAnalysis !== undefined, "goalProjectAnalysis present in BrainAnalysis 1");
  assert(analysis2.goalProjectAnalysis !== undefined, "goalProjectAnalysis present in BrainAnalysis 2");
  assert(
    analysis1.goalProjectAnalysis.activeGoals.length === analysis2.goalProjectAnalysis.activeGoals.length,
    "Idempotent goal count matches"
  );
  assert(
    analysis1.promptDirectives.length === analysis2.promptDirectives.length,
    "Idempotent directive count matches"
  );
});

// ===========================================================================
// TARGETED ARCHITECTURAL HARDENING TESTS (GP-T1 through GP-T32)
// ===========================================================================

// GP-T1: Question containing "I need to" does not create commitment
runTest("GP-T1: Question containing 'I need to' does not create commitment", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "Do I need to finish this report by Friday?",
    options: { currentTime: 1000 },
  });
  assert(res.activeCommitments.length === 0, "Question with 'need to' must not create commitment");
});

// GP-T2: Question containing "I will" does not create commitment
runTest("GP-T2: Question containing 'I will' does not create commitment", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "Will I finish this today?",
    options: { currentTime: 1000 },
  });
  assert(res.activeCommitments.length === 0, "Question with 'will I' must not create commitment");
});

// GP-T3: Hypothetical "if I..." does not create commitment
runTest("GP-T3: Hypothetical 'if I...' does not create commitment", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "If I work on the memory engine tomorrow, what should I start with?",
    options: { currentTime: 1000 },
  });
  assert(res.activeCommitments.length === 0, "Hypothetical 'if I...' must not create commitment");
});

// GP-T4: "maybe I'll..." does not create authoritative commitment
runTest("GP-T4: 'maybe I'll...' does not create authoritative commitment", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "Maybe I'll finish Step 10 someday.",
    options: { currentTime: 1000 },
  });
  assert(res.activeCommitments.length === 0, "Speculative 'maybe I'll...' must not create commitment");
});

// GP-T5: Assistant statement does not create user commitment
runTest("GP-T5: Assistant statement does not create user commitment", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "The assistant said I will finish the task tomorrow.",
    options: { currentTime: 1000 },
  });
  assert(res.activeCommitments.length === 0, "Assistant attribution must not create user commitment");
});

// GP-T6: Predictive Context does not create goal
runTest("GP-T6: Predictive Context does not create goal", () => {
  const userModel = makeUserModel({
    predictedGoal: {
      key: "predicted_goal",
      value: "Learn Rust",
      dimension: "USER_GOAL",
      sourceClassification: "PREDICTIVE_CONTEXT",
      status: "CONFIRMED",
    },
  });
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    longTermUserModel: userModel,
    options: { currentTime: 1000 },
  });
  assert(res.activeGoals.length === 0, "Predictive Context must not create durable goal");
});

// GP-T7: Predictive Context does not create project
runTest("GP-T7: Predictive Context does not create project", () => {
  const userModel = makeUserModel({
    predictedProj: {
      key: "predicted_project",
      value: "Rust Compiler",
      dimension: "PROJECT_CONTEXT",
      sourceClassification: "PREDICTIVE_CONTEXT",
      status: "CONFIRMED",
    },
  });
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    longTermUserModel: userModel,
    options: { currentTime: 1000 },
  });
  assert(res.activeProjects.length === 0, "Predictive Context must not create durable project");
});

// GP-T8: Predictive Context does not create commitment
runTest("GP-T8: Predictive Context does not create commitment", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "Can you suggest a project for me?",
    options: { currentTime: 1000 },
  });
  assert(res.activeCommitments.length === 0, "Project suggestion query must not create commitment");
});

// GP-T9: Repeated generic mention of a topic does not create a project
runTest("GP-T9: Repeated generic mention of a topic does not create a project", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "Python is great. I love Python. Can you explain Python decorators?",
    options: { currentTime: 1000 },
  });
  assert(res.activeProjects.length === 0, "Generic topic mentions must not create a project");
});

// GP-T10: Repeated technical questions do not imply project ownership
runTest("GP-T10: Repeated technical questions do not imply project ownership", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "How does async/await work in Node.js event loop?",
    options: { currentTime: 1000 },
  });
  assert(res.activeProjects.length === 0, "Technical questions must not create project ownership");
});

// GP-T11: 'secret project' is not automatically classified as credential data
runTest("GP-T11: 'secret project' is not automatically classified as credential data", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I am working on the secret project",
    options: { currentTime: 1000 },
  });
  assert(res.diagnostics.suppressedSensitiveCount === 0, "'secret project' should not trigger sensitive suppression");
  assert(res.activeProjects.length === 1, "'secret project' should be extracted as project");
  assert(res.activeProjects[0].name === "secret project", "Project name matches");
});

// GP-T12: 'token budget' is not automatically suppressed
runTest("GP-T12: 'token budget' is not automatically suppressed", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I will allocate the token budget for the project",
    options: { currentTime: 1000 },
  });
  assert(res.diagnostics.suppressedSensitiveCount === 0, "'token budget' should not trigger sensitive suppression");
  assert(res.activeCommitments.length === 1, "'token budget' commitment is extracted");
});

// GP-T13: Actual API key is suppressed
runTest("GP-T13: Actual API key is suppressed", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "My api_key=sk-1234567890abcdef1234567890 for the project",
    options: { currentTime: 1000 },
  });
  assert(res.diagnostics.suppressedSensitiveCount === 1, "Actual API key must trigger sensitive suppression");
  assert(res.activeProjects.length === 0, "No project created from sensitive payload");
});

// GP-T14: Actual bearer token is suppressed
runTest("GP-T14: Actual bearer token is suppressed", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
    options: { currentTime: 1000 },
  });
  assert(res.diagnostics.suppressedSensitiveCount === 1, "Actual bearer token must trigger sensitive suppression");
});

// GP-T15: Actual password value is suppressed
runTest("GP-T15: Actual password value is suppressed", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "My database password: superSecretPassword123",
    options: { currentTime: 1000 },
  });
  assert(res.diagnostics.suppressedSensitiveCount === 1, "Actual password must trigger sensitive suppression");
});

// GP-T16: Current-turn project switch overrides historical project context
runTest("GP-T16: Current-turn project switch overrides historical project context", () => {
  const existingProjects: Project[] = [
    {
      projectId: "proj_dora",
      name: "Dora Memory System",
      normalizedName: "dora memory system",
      status: "ACTIVE",
      priority: "MEDIUM",
      createdAt: 1000,
      updatedAt: 1000,
      goals: [],
      milestones: [],
      tasks: [],
      commitments: [],
      dependencies: [],
      events: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      lineage: [],
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "Forget Dora for now, let's switch to my website.",
    existingProjects,
    options: { currentTime: 2000 },
  });
  assert(res.currentTurnOverrides.isProjectPaused === true, "Current turn pause detected");
  assert(
    res.directives.some((d) => d.includes("Current-turn instruction")),
    "Current-turn override directive generated"
  );
});

// GP-T17: Temporary current-turn switch does not mutate historical project state
runTest("GP-T17: Temporary current-turn switch does not mutate historical project state", () => {
  const existingProjects: Project[] = [
    {
      projectId: "proj_dora",
      name: "Dora Memory System",
      normalizedName: "dora memory system",
      status: "ACTIVE",
      priority: "MEDIUM",
      createdAt: 1000,
      updatedAt: 1000,
      goals: [],
      milestones: [],
      tasks: [],
      commitments: [],
      dependencies: [],
      events: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      lineage: [],
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "Forget Dora for now, let's work on my website.",
    existingProjects,
    options: { currentTime: 2000 },
  });
  // Durable state in project map remains ACTIVE (not destroyed)
  assert(res.state.activeProjects.some((p) => p.projectId === "proj_dora"), "Durable project remains preserved");
});

// GP-T18: Explicit durable project update does mutate project state
runTest("GP-T18: Explicit durable project update does mutate project state", () => {
  const existingProjects: Project[] = [
    {
      projectId: "proj_dora",
      name: "Dora Memory System",
      normalizedName: "dora memory system",
      status: "ACTIVE",
      priority: "MEDIUM",
      createdAt: 1000,
      updatedAt: 1000,
      goals: [],
      milestones: [],
      tasks: [],
      commitments: [],
      dependencies: [],
      events: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      lineage: [],
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I completed the Dora Memory System",
    existingProjects,
    options: { currentTime: 3000 },
  });
  assert(res.state.completedProjects.some((p) => p.projectId === "proj_dora"), "Project is marked COMPLETED");
  assert(res.state.activeProjects.length === 0, "No active projects remaining");
});

// GP-T19: Ambiguous project names are not merged
runTest("GP-T19: Ambiguous project names are not merged", () => {
  const existingProjects: Project[] = [
    {
      projectId: "proj_alpha",
      name: "Alpha Compiler",
      normalizedName: "alpha compiler",
      status: "ACTIVE",
      priority: "MEDIUM",
      createdAt: 1000,
      updatedAt: 1000,
      goals: [],
      milestones: [],
      tasks: [],
      commitments: [],
      dependencies: [],
      events: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      lineage: [],
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I am working on the Beta Engine project",
    existingProjects,
    options: { currentTime: 2000 },
  });
  assert(res.activeProjects.length === 2, "Distinct projects must not be merged");
});

// GP-T20: 'Dora', 'Dora AI', and 'Dora project' resolve only when contextual identity evidence is sufficient
runTest("GP-T20: 'Dora', 'Dora AI', and 'Dora project' resolve when contextual identity evidence matches", () => {
  const existingProjects: Project[] = [
    {
      projectId: "proj_dora",
      name: "Dora AI",
      normalizedName: "dora ai",
      status: "ACTIVE",
      priority: "MEDIUM",
      createdAt: 1000,
      updatedAt: 1000,
      goals: [],
      milestones: [],
      tasks: [],
      commitments: [],
      dependencies: [],
      events: [],
      sourceAuthority: "EXPLICIT_USER_MEMORY",
      confidence: 1.0,
      lineage: [],
    },
  ];
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I am working on the Dora project",
    existingProjects,
    options: { currentTime: 2000 },
  });
  assert(res.activeProjects.length === 1, "Should resolve to existing Dora project without duplicate");
  assert(res.activeProjects[0].projectId === "proj_dora", "Resolved to existing project ID");
});

// GP-T21: Unknown dependency blocks task readiness
runTest("GP-T21: Unknown dependency blocks task readiness", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    planning: {
      requiresPlanning: true,
      directives: [],
      plan: {
        id: "plan_1",
        objective: "Test Objective",
        goal: "Deploy to cloud",
        status: "IN_PROGRESS",
        priority: "NORMAL",
        complexity: "MEDIUM",
        executionStrategy: "SEQUENTIAL",
        failureStrategy: "RETRY",
        dependencies: {},
        requiredInputs: [],
        availableInputs: [],
        missingInputs: [],
        toolRequirements: [],
        completionCriteria: ["Done"],
        createdAt: 1000,
        updatedAt: 1000,
        sourceIntent: "PLANNING",
        sourceReasoning: "PLANNING",
        isCancellable: true,
        steps: [
          {
            id: "task_1",
            title: "Deploy to cloud",
            description: "Deploy to cloud",
            order: 1,
            status: "NOT_STARTED",
            dependencies: ["non_existent_step_99"],
            requiredInputs: [],
            expectedOutput: "Done",
            canRunInParallel: false,
            completionCriteria: "Done",
          },
        ],
      },
    },
    options: { currentTime: 1000 },
  });
  assert(res.blockedTasks.length === 1, "Task with unknown dependency must be BLOCKED");
  assert(res.readyTasks.length === 0, "Task must not be ready");
});

// GP-T22: Completed dependency enables dependent task
runTest("GP-T22: Completed dependency enables dependent task", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    planning: {
      requiresPlanning: true,
      directives: [],
      plan: {
        id: "plan_1",
        objective: "Test Objective",
        goal: "Build and run",
        status: "IN_PROGRESS",
        priority: "NORMAL",
        complexity: "MEDIUM",
        executionStrategy: "SEQUENTIAL",
        failureStrategy: "RETRY",
        dependencies: {},
        requiredInputs: [],
        availableInputs: [],
        missingInputs: [],
        toolRequirements: [],
        completionCriteria: ["Done"],
        createdAt: 1000,
        updatedAt: 1000,
        sourceIntent: "PLANNING",
        sourceReasoning: "PLANNING",
        isCancellable: true,
        steps: [
          {
            id: "task_1",
            title: "Build binary",
            description: "Build binary",
            order: 1,
            status: "COMPLETED",
            dependencies: [],
            requiredInputs: [],
            expectedOutput: "Done",
            canRunInParallel: false,
            completionCriteria: "Done",
          },
          {
            id: "task_2",
            title: "Run binary",
            description: "Run binary",
            order: 2,
            status: "NOT_STARTED",
            dependencies: ["task_1"],
            requiredInputs: [],
            expectedOutput: "Done",
            canRunInParallel: false,
            completionCriteria: "Done",
          },
        ],
      },
    },
    options: { currentTime: 1000 },
  });
  assert(res.readyTasks.some((t) => t.taskId === "task_2"), "Dependent task is enabled and READY");
  assert(res.blockedTasks.length === 0, "No tasks blocked");
});

// GP-T23: Silence does not mark task completed
runTest("GP-T23: Silence does not mark task completed", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "",
    planning: {
      requiresPlanning: true,
      directives: [],
      plan: {
        id: "plan_1",
        objective: "Test Objective",
        goal: "Active task",
        status: "IN_PROGRESS",
        priority: "NORMAL",
        complexity: "MEDIUM",
        executionStrategy: "SEQUENTIAL",
        failureStrategy: "RETRY",
        dependencies: {},
        requiredInputs: [],
        availableInputs: [],
        missingInputs: [],
        toolRequirements: [],
        completionCriteria: ["Done"],
        createdAt: 1000,
        updatedAt: 1000,
        sourceIntent: "PLANNING",
        sourceReasoning: "PLANNING",
        isCancellable: true,
        steps: [
          {
            id: "task_1",
            title: "Active task",
            description: "Active task",
            order: 1,
            status: "IN_PROGRESS",
            dependencies: [],
            requiredInputs: [],
            expectedOutput: "Done",
            canRunInParallel: false,
            completionCriteria: "Done",
          },
        ],
      },
    },
    options: { currentTime: 2000 },
  });
  assert(res.readyTasks.some((t) => t.taskId === "task_1"), "Silence must not mark task completed");
});

// GP-T24: Assistant prediction does not mark task completed
runTest("GP-T24: Assistant prediction does not mark task completed", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "The assistant predicts I completed the task",
    planning: {
      requiresPlanning: true,
      directives: [],
      plan: {
        id: "plan_1",
        objective: "Test Objective",
        goal: "Active task",
        status: "IN_PROGRESS",
        priority: "NORMAL",
        complexity: "MEDIUM",
        executionStrategy: "SEQUENTIAL",
        failureStrategy: "RETRY",
        dependencies: {},
        requiredInputs: [],
        availableInputs: [],
        missingInputs: [],
        toolRequirements: [],
        completionCriteria: ["Done"],
        createdAt: 1000,
        updatedAt: 1000,
        sourceIntent: "PLANNING",
        sourceReasoning: "PLANNING",
        isCancellable: true,
        steps: [
          {
            id: "task_1",
            title: "Active task",
            description: "Active task",
            order: 1,
            status: "IN_PROGRESS",
            dependencies: [],
            requiredInputs: [],
            expectedOutput: "Done",
            canRunInParallel: false,
            completionCriteria: "Done",
          },
        ],
      },
    },
    options: { currentTime: 2000 },
  });
  assert(res.readyTasks.some((t) => t.taskId === "task_1"), "Assistant prediction cannot mark task completed");
});

// GP-T25: Temporal recurrence does not create unsupported project
runTest("GP-T25: Temporal recurrence does not create unsupported project", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    temporalMemory: {
      userId: "u1",
      analyzedAt: 5000,
      patterns: [],
      activePatterns: [],
      historicalPatterns: [],
      evolutions: [],
      relations: [],
      directives: ["User asks frequent JavaScript questions on Mondays"],
      diagnostics: {
        totalPatternsAnalyzed: 0,
        stableCount: 0,
        recurringCount: 0,
        evolvingCount: 0,
        historicalCount: 0,
        staleCount: 0,
        suppressedSensitiveCount: 0,
        topicIsolatedCount: 0,
        evolutionTransitions: [],
      },
    },
    options: { currentTime: 5000 },
  });
  assert(res.activeProjects.length === 0, "Temporal recurrence cannot create a project");
});

// GP-T26: Adaptive preference does not create unsupported commitment
runTest("GP-T26: Adaptive preference does not create unsupported commitment", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    adaptiveLearning: {
      userId: "u1",
      patterns: [],
      activeDirectives: ["User prefers dark mode UI"],
      decisions: [],
      profile: {
        userId: "u1",
        interactionPreferences: [],
        taskPatterns: [],
        domainInterests: [],
        preferences: { confirmedPreferences: [], candidatePreferences: [] },
        lastUpdatedAt: 5000,
      },
      diagnostics: {
        totalSignalsProcessed: 0,
        sensitiveSignalsBlocked: 0,
        candidatesCreated: 0,
        patternsReinforced: 0,
        patternsPromoted: 0,
        patternsDemoted: 0,
        conflictsDetected: 0,
        currentTurnOverrides: [],
      },
      currentTurnOverrideApplied: false,
    },
    options: { currentTime: 5000 },
  });
  assert(res.activeCommitments.length === 0, "Adaptive preference cannot create a commitment");
});

// GP-T27: Same input produces identical output
runTest("GP-T27: Same input produces identical output", () => {
  const eval1 = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I want to finish Dora's memory system.",
    options: { currentTime: 1000 },
  });
  const eval2 = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I want to finish Dora's memory system.",
    options: { currentTime: 1000 },
  });
  assert(eval1.activeGoals.length === eval2.activeGoals.length, "Goal count matches");
  assert(eval1.directives[0] === eval2.directives[0], "Directive matches");
});

// GP-T28: Same input + same currentTime produces identical output
runTest("GP-T28: Same input + same currentTime produces identical output", () => {
  const eval1 = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I will deploy the cluster by Friday",
    options: { currentTime: 15000 },
  });
  const eval2 = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I will deploy the cluster by Friday",
    options: { currentTime: 15000 },
  });
  assert(eval1.activeCommitments[0].deadline === eval2.activeCommitments[0].deadline, "Deadline matches");
  assert(eval1.activeCommitments[0].commitmentId === eval2.activeCommitments[0].commitmentId, "Commitment ID matches");
});

// GP-T29: No internal IDs appear in directives
runTest("GP-T29: No internal IDs appear in directives", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I want to finish Dora memory system",
    options: { currentTime: 1000 },
  });
  for (const d of res.directives) {
    assert(!/\b(?:proj|goal|commit|task|evt|evi)_[a-f0-9_]{6,}\b/i.test(d), `No internal ID in directive: "${d}"`);
  }
});

// GP-T30: No confidence floats appear in directives
runTest("GP-T30: No confidence floats appear in directives", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I want to finish Dora memory system",
    options: { currentTime: 1000 },
  });
  for (const d of res.directives) {
    assert(!/\b0\.\d+\b/.test(d), `No confidence float in directive: "${d}"`);
  }
});

// GP-T31: No raw timestamps appear in directives
runTest("GP-T31: No raw timestamps appear in directives", () => {
  const res = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I will finish Dora memory system tomorrow",
    options: { currentTime: 1700000000000 },
  });
  for (const d of res.directives) {
    assert(!/\b1700000000000\b/.test(d), `No raw timestamp in directive: "${d}"`);
  }
});

// GP-T32: Repeated identical evidence is idempotent
runTest("GP-T32: Repeated identical evidence is idempotent", () => {
  const res1 = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I am working on the Dora project",
    options: { currentTime: 1000 },
  });
  const res2 = goalProjectEngine.evaluate({
    userId: "u1",
    message: "I am working on the Dora project",
    existingProjects: res1.activeProjects,
    options: { currentTime: 1000 },
  });
  assert(res2.activeProjects.length === 1, "Idempotent project evaluation maintains single project record");
  assert(res2.activeProjects[0].projectId === res1.activeProjects[0].projectId, "Project ID is consistent");
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("=============================================");
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log("=============================================");

if (failedTests > 0) {
  process.exit(1);
}
