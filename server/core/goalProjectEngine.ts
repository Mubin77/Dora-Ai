/**
 * Goal, Project & Commitment Memory Engine (Phase 2 - Step 10)
 * 
 * Deterministic, bounded, non-LLM engine that safely maintains validated
 * long-running user goals, projects, commitments, milestones, blockers,
 * dependencies, and project lifecycle state across turns and sessions.
 * 
 * Invariants Enforced:
 * 1. Deterministic execution: Zero Math.random(), zero Date.now() in decisions, zero random UUIDs.
 * 2. Strict read-only analysis: Zero side-effect mutation of persistent memory store.
 * 3. Authority Hierarchy:
 *    CURRENT_TURN_EXPLICIT > EXPLICIT_USER_MEMORY > VERIFIED_EVIDENCE >
 *    CONFIRMED_ADAPTIVE_PATTERN > CONFIRMED_PREFERENCE > REPEATED_VALIDATED_SIGNAL > PREDICTIVE_CONTEXT.
 * 4. Candidate Safety: CANDIDATE records cannot establish authoritative goals/projects.
 * 5. Predictive Boundary: Predictive Context is strictly advisory.
 * 6. Completion Evidence: Completion requires explicit user claim or verified tool result.
 * 7. Blocker Detection: Evidence-based blockers only; never invent emotional/personal blockers.
 * 8. Deadlines: Explicit dates only; relative time calculated deterministically via injected currentTime.
 * 9. Current-Turn Precedence: Current-turn instructions override historical state for the current turn.
 * 10. Topic/Project Isolation: Project-scoped context does not leak into unrelated projects.
 * 11. Privacy & Identity: Sensitive credentials and unsupported identity inferences are strictly suppressed.
 * 12. Sanitized Directives: Natural language only; zero internal IDs, raw floats, or epoch timestamps.
 * 13. Intent-Aware Extraction: Rejects questions, hypotheticals, quotes, and assistant statements from creating authoritative records.
 */

import { ConversationContext, ConversationTurn } from "./contextTypes";
import { StructuredIntent } from "./intentTypes";
import { ReasoningAnalysis } from "./reasoningTypes";
import { PlanningAnalysis } from "./planningTypes";
import { VerificationAnalysis } from "./verificationTypes";
import { MemoryGovernanceAnalysis } from "./memoryGovernanceTypes";
import { LearningAnalysis } from "./adaptiveLearningTypes";
import { UserModelAnalysis, UserModelEvidenceAuthority } from "./longTermUserModelTypes";
import { TemporalMemoryAnalysis } from "./temporalMemoryTypes";
import {
  Commitment,
  EvidenceIntentType,
  Goal,
  GoalProjectAnalysis,
  GoalProjectDiagnostics,
  GoalProjectEvaluationOptions,
  GoalProjectEvidence,
  GoalProjectPriority,
  GoalProjectStatus,
  GoalScope,
  Milestone,
  Project,
  ProjectDependency,
  ProjectEvent,
  ProjectState,
  ProjectTask,
  TaskExecutionStatus,
} from "./goalProjectTypes";

export class GoalProjectEngine {
  private static instance: GoalProjectEngine;

  // Authority Weight Map
  private readonly AUTHORITY_WEIGHTS: Record<UserModelEvidenceAuthority, number> = {
    CURRENT_TURN_EXPLICIT: 100,
    EXPLICIT_USER_MEMORY: 90,
    VERIFIED_EVIDENCE: 80,
    CONFIRMED_ADAPTIVE_PATTERN: 60,
    CONFIRMED_PREFERENCE: 50,
    REPEATED_VALIDATED_SIGNAL: 40,
    PREDICTIVE_CONTEXT: 10,
  };

  // Precise Sensitive Credential Patterns (Avoid suppressing ordinary terms like "token budget" or "secret project")
  private readonly SENSITIVE_PATTERNS = [
    /\bsk-[a-zA-Z0-9_\-]{10,}\b/,
    /\bghp_[a-zA-Z0-9]{10,}\b/,
    /\bAIza[0-9A-Za-z-_]{20,}\b/,
    /\bBearer\s+[a-zA-Z0-9_\-\.]{15,}\b/i,
    /\b(?:password|passwd|pwd)\s*[:=]\s*\S+/i,
    /\b(?:api[_-]?key|secret[_-]?key|auth[_-]?token|access[_-]?token|refresh[_-]?token)\s*[:=]\s*\S+/i,
    /\b(?:\d{4}[- ]?){3}\d{4}\b/, // Credit card numbers
    /\b(?:cvv|cvc)\s*[:=]?\s*\d{3,4}\b/i,
    /\bpin\s*[:=]?\s*\d{4,6}\b/i,
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b(?:bank[_-]?account|routing[_-]?number)\s*[:=]?\s*\d{6,}\b/i,
    /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
  ];

  // Forbidden Identity Patterns (Cannot infer profession, employment, enrollment)
  private readonly FORBIDDEN_IDENTITY_DIMENSIONS = [
    /\b(i am a|i work as a|my job is|my profession is|my title is)\b/i,
    /\b(employed at|working at|employee of|software engineer at|architect at)\b/i,
    /\b(student at|enrolled at|enrolled in|university student|college student)\b/i,
    /\b(salary|income|net worth|bank balance|debt|loan)\b/i,
    /\b(diagnosed with|medical condition|prescription|illness)\b/i,
  ];

  // Negative Framing Regexes
  private readonly QUESTION_PATTERNS = [
    /\?$/,
    /\b(?:do i|should i|will i|how do i|how to|how can i|can i|can you|could you|would you|is it|what if|why do i|why should i|when will i|where do i|is there a|are we)\b/i,
    /\b(?:suggest|recommend)\s+(?:a|any|some)?\s*(?:project|goal|task|commitment|step)\b/i,
  ];

  private readonly HYPOTHETICAL_PATTERNS = [
    /\b(?:if i|suppose i|supposing|maybe i|maybe we|i might|i could|what if|imagine i|maybe i should|in case i|could potentially|perhaps i|someday|eventually)\b/i,
  ];

  private readonly ASSISTANT_STATEMENT_PATTERNS = [
    /\b(?:the assistant said|you said|assistant suggested|you told me|system said|according to the assistant|you should|you must|assistant stated)\b/i,
  ];

  // Goal Detection Regexes (Bangla, English, Banglish)
  private readonly EXPLICIT_GOAL_PATTERNS = [
    /(?:i want to|my goal is to|aiming to|i aim to|i intend to|my target is to)\s+([^.,;!?\n]+)/i,
    /(?:amar goal|amader goal|amar target|amader target|target holo|target hocche)\s+([^.,;!?\n]+)/i,
    /(?:sesh korte chai|complete korte chai|build korte chai|banate chai)\s+([^.,;!?\n]+)/i,
  ];

  // Project Detection Regexes
  private readonly EXPLICIT_PROJECT_PATTERNS = [
    /(?:i am working on(?: the)?|i'm working on(?: the)?|working on(?: the)? project:?|my project is(?: the)?)\s+([a-z0-9_\-\s]{2,40})/i,
    /(?:amar project|amader project|project er naam|project hocche)\s+([a-z0-9_\-\s]{2,40})/i,
    /(?:working on)\s+([a-z0-9_\-\s]{2,40}\s+project)/i,
  ];

  // Commitment Detection Regexes
  private readonly EXPLICIT_COMMITMENT_PATTERNS = [
    /(?:i'll|i will|i promise to|i commit to|i plan to finish)\s+([^.,;!?\n]+)/i,
    /(?:i need to finish|i must finish|i have to finish)\s+([^.,;!?\n]+)/i,
    /(?:ami kal|ami pore|ami sesh korbo|ami review korbo|ami submit korbo|ami push korbo)\s+([^.,;!?\n]+)/i,
  ];

  // Blocker Detection Regexes
  private readonly EXPLICIT_BLOCKER_PATTERNS = [
    /(?:can't continue|cannot continue|blocked by|stuck on|failed because|error in|api is down|api isn't working|missing credentials|shuru korte parchi na karon|attke gechi|block hoye ache)\s*[:\s]+([^.,;!?\n]+)/i,
    /(?:because|karon)\s+(the [a-z0-9_\-\s]+ is (?:down|broken|failing|not working|unavailable))/i,
  ];

  // Completion Detection Regexes
  private readonly EXPLICIT_COMPLETION_PATTERNS = [
    /(?:i finished|i have finished|i completed|i have completed|done with|all done with|successfully completed|i've completed)\s+([^.,;!?\n]+)/i,
    /(?:sesh korechi|sesh hoyeche|complete korechi|done hoye geche)\s+([^.,;!?\n]+)/i,
    /(?:(?:marked|mark)\s+([^.,;!?\n]+)\s+(?:as completed|as done))/i,
  ];

  // Current-turn Pause / Override Regexes
  private readonly CURRENT_TURN_OVERRIDE_PATTERNS = [
    /(?:pause|hold off on|stop working on|switch away from|leave for now|postpone)\s+([^.,;!?\n]+)/i,
    /(?:actually switch to|let's switch to|instead work on|forget\s+([^.,;!?\n]+?)\s+for now|eita ekhon thak|ekhon pause rakho)\s+([^.,;!?\n]+)?/i,
  ];

  // Reopen Project / Goal Regexes
  private readonly EXPLICIT_REOPEN_PATTERNS = [
    /(?:reopen|resume|restart|continue working on|reactivate)\s+([^.,;!?\n]+)/i,
    /(?:abar shuru korbo|reopen koro|restart koro|resume koro)\s+([^.,;!?\n]+)/i,
  ];

  // Explicit Abandon Regexes
  private readonly EXPLICIT_ABANDON_PATTERNS = [
    /(?:i abandoned|i give up on|dropping|abandoned)\s+([^.,;!?\n]+)/i,
    /(?:ar korbo na|bad diyechi)\s+([^.,;!?\n]+)/i,
  ];

  private constructor() {}

  public static getInstance(): GoalProjectEngine {
    if (!GoalProjectEngine.instance) {
      GoalProjectEngine.instance = new GoalProjectEngine();
    }
    return GoalProjectEngine.instance;
  }

  /**
   * Deterministic simple hash function (no random UUIDs or runtime non-determinism).
   */
  public deterministicHash(str: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  /**
   * Generates a clean deterministic ID.
   */
  public generateDeterministicId(prefix: string, ...components: string[]): string {
    const raw = components.map((c) => (c || "").trim().toLowerCase()).join("::");
    const hash = this.deterministicHash(raw);
    const sanitizedPrefix = prefix.replace(/[^a-z0-9_]/gi, "_").toLowerCase();
    return `${sanitizedPrefix}_${hash}`;
  }

  /**
   * Normalizes a title or string.
   */
  public normalizeTitle(str: string): string {
    return (str || "")
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, " ");
  }

  /**
   * Extracts the core project identifier from a name or alias.
   * e.g., "the Dora project" -> "dora", "Dora AI" -> "dora", "my website" -> "website"
   */
  public extractCoreProjectIdentifier(name: string): string {
    return this.normalizeTitle(name)
      .replace(/^(the|my|our|a)\s+/i, "")
      .replace(/\s+(project|app|system|ai|platform)$/i, "")
      .trim();
  }

  /**
   * Checks if an evidence authority is considered authoritative.
   */
  public isAuthoritative(authority: UserModelEvidenceAuthority): boolean {
    return (
      authority === "CURRENT_TURN_EXPLICIT" ||
      authority === "EXPLICIT_USER_MEMORY" ||
      authority === "VERIFIED_EVIDENCE"
    );
  }

  /**
   * Checks if a string contains sensitive credentials contextually.
   */
  public containsSensitiveData(text: string): boolean {
    if (!text) return false;
    return this.SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
  }

  /**
   * Checks if a string contains forbidden identity assumptions.
   */
  public containsForbiddenIdentity(text: string): boolean {
    if (!text) return false;
    return this.FORBIDDEN_IDENTITY_DIMENSIONS.some((pattern) => pattern.test(text));
  }

  /**
   * Classifies Goal Evidence using intent-aware validation.
   */
  public classifyGoalEvidence(text: string): {
    intentType: EvidenceIntentType;
    extractedTitle?: string;
    isValid: boolean;
  } {
    if (!text || this.containsSensitiveData(text) || this.containsForbiddenIdentity(text)) {
      return { intentType: "UNCERTAIN", isValid: false };
    }

    const trimmed = text.trim();

    // 1. Quoted check
    if (/^["'].*["']$/.test(trimmed)) {
      return { intentType: "QUOTED_TEXT", isValid: false };
    }

    // 2. Assistant statement check
    if (this.ASSISTANT_STATEMENT_PATTERNS.some((p) => p.test(trimmed))) {
      return { intentType: "ASSISTANT_STATEMENT", isValid: false };
    }

    // 3. Question check
    if (this.QUESTION_PATTERNS.some((p) => p.test(trimmed))) {
      return { intentType: "QUESTION", isValid: false };
    }

    // 4. Hypothetical check
    if (this.HYPOTHETICAL_PATTERNS.some((p) => p.test(trimmed))) {
      return { intentType: "HYPOTHETICAL", isValid: false };
    }

    // 5. Explicit Goal Patterns
    for (const pattern of this.EXPLICIT_GOAL_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        const raw = match[1].trim();
        if (this.isValidGoalExpression(raw)) {
          return {
            intentType: "DIRECT_USER_DECLARATION",
            extractedTitle: this.cleanTitle(raw),
            isValid: true,
          };
        }
      }
    }

    return { intentType: "UNCERTAIN", isValid: false };
  }

  /**
   * Classifies Project Evidence using intent-aware validation.
   */
  public classifyProjectEvidence(text: string): {
    intentType: EvidenceIntentType;
    extractedName?: string;
    isValid: boolean;
  } {
    if (!text || this.containsSensitiveData(text) || this.containsForbiddenIdentity(text)) {
      return { intentType: "UNCERTAIN", isValid: false };
    }

    const trimmed = text.trim();

    // 1. Quoted check
    if (/^["'].*["']$/.test(trimmed)) {
      return { intentType: "QUOTED_TEXT", isValid: false };
    }

    // 2. Assistant statement check
    if (this.ASSISTANT_STATEMENT_PATTERNS.some((p) => p.test(trimmed))) {
      return { intentType: "ASSISTANT_STATEMENT", isValid: false };
    }

    // 3. Question check
    if (this.QUESTION_PATTERNS.some((p) => p.test(trimmed))) {
      return { intentType: "QUESTION", isValid: false };
    }

    // 4. Hypothetical check
    if (this.HYPOTHETICAL_PATTERNS.some((p) => p.test(trimmed))) {
      return { intentType: "HYPOTHETICAL", isValid: false };
    }

    // 5. Explicit Project Patterns
    for (const pattern of this.EXPLICIT_PROJECT_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        const raw = match[1].trim();
        if (this.isValidProjectExpression(raw)) {
          return {
            intentType: "EXPLICIT_PROJECT_REFERENCE",
            extractedName: this.cleanTitle(raw),
            isValid: true,
          };
        }
      }
    }

    return { intentType: "UNCERTAIN", isValid: false };
  }

  /**
   * Classifies Commitment Evidence using intent-aware validation.
   */
  public classifyCommitmentEvidence(text: string): {
    intentType: EvidenceIntentType;
    extractedTitle?: string;
    isValid: boolean;
  } {
    if (!text || this.containsSensitiveData(text) || this.containsForbiddenIdentity(text)) {
      return { intentType: "UNCERTAIN", isValid: false };
    }

    const trimmed = text.trim();

    // 1. Quoted check
    if (/^["'].*["']$/.test(trimmed)) {
      return { intentType: "QUOTED_TEXT", isValid: false };
    }

    // 2. Assistant statement check
    if (this.ASSISTANT_STATEMENT_PATTERNS.some((p) => p.test(trimmed))) {
      return { intentType: "ASSISTANT_STATEMENT", isValid: false };
    }

    // 3. Question check (Questions MUST NOT create commitments)
    if (this.QUESTION_PATTERNS.some((p) => p.test(trimmed))) {
      return { intentType: "QUESTION", isValid: false };
    }

    // 4. Hypothetical check ("maybe I'll...", "if I...", "suppose I...")
    if (this.HYPOTHETICAL_PATTERNS.some((p) => p.test(trimmed))) {
      return { intentType: "HYPOTHETICAL", isValid: false };
    }

    // 5. Explicit Commitment Patterns
    for (const pattern of this.EXPLICIT_COMMITMENT_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        const raw = match[1].trim();
        if (this.isValidCommitmentExpression(raw)) {
          return {
            intentType: "DIRECT_USER_COMMITMENT",
            extractedTitle: this.cleanTitle(raw),
            isValid: true,
          };
        }
      }
    }

    return { intentType: "UNCERTAIN", isValid: false };
  }

  /**
   * Classifies Status Updates (Completion, Blocker, Pause, Reopen, Abandon).
   */
  public classifyStatusUpdateEvidence(text: string): {
    intentType: EvidenceIntentType;
    status?: GoalProjectStatus;
    target?: string;
    blockerReason?: string;
    isValid: boolean;
  } {
    if (!text || this.containsSensitiveData(text) || this.containsForbiddenIdentity(text)) {
      return { intentType: "UNCERTAIN", isValid: false };
    }

    const trimmed = text.trim();

    // Reject questions and hypotheticals
    if (this.QUESTION_PATTERNS.some((p) => p.test(trimmed))) {
      return { intentType: "QUESTION", isValid: false };
    }
    if (this.HYPOTHETICAL_PATTERNS.some((p) => p.test(trimmed))) {
      return { intentType: "HYPOTHETICAL", isValid: false };
    }
    if (this.ASSISTANT_STATEMENT_PATTERNS.some((p) => p.test(trimmed))) {
      return { intentType: "ASSISTANT_STATEMENT", isValid: false };
    }

    // Completion
    for (const pattern of this.EXPLICIT_COMPLETION_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        return {
          intentType: "EXPLICIT_STATUS_UPDATE",
          status: "COMPLETED",
          target: this.cleanTitle(match[1].trim()),
          isValid: true,
        };
      }
    }

    // Blocker
    for (const pattern of this.EXPLICIT_BLOCKER_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        return {
          intentType: "EXPLICIT_STATUS_UPDATE",
          status: "BLOCKED",
          blockerReason: match[1].trim(),
          isValid: true,
        };
      }
    }

    // Pause
    for (const pattern of this.CURRENT_TURN_OVERRIDE_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match && (match[1] || match[2])) {
        const target = (match[1] || match[2] || "").trim();
        return {
          intentType: "EXPLICIT_STATUS_UPDATE",
          status: "PAUSED",
          target: this.cleanTitle(target),
          isValid: true,
        };
      }
    }

    // Reopen
    for (const pattern of this.EXPLICIT_REOPEN_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        return {
          intentType: "EXPLICIT_STATUS_UPDATE",
          status: "ACTIVE",
          target: this.cleanTitle(match[1].trim()),
          isValid: true,
        };
      }
    }

    // Abandon
    for (const pattern of this.EXPLICIT_ABANDON_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        return {
          intentType: "EXPLICIT_STATUS_UPDATE",
          status: "ABANDONED",
          target: this.cleanTitle(match[1].trim()),
          isValid: true,
        };
      }
    }

    return { intentType: "UNCERTAIN", isValid: false };
  }

  /**
   * Resolves or finds an existing project matching name or aliases deterministically.
   */
  public findMatchingProject(
    nameOrAlias: string,
    projectMap: Map<string, Project>
  ): Project | undefined {
    const norm = this.normalizeTitle(nameOrAlias);
    const core = this.extractCoreProjectIdentifier(nameOrAlias);

    // 1. Exact normalized name match
    for (const p of projectMap.values()) {
      if (p.normalizedName === norm) {
        return p;
      }
    }

    // 2. Core project identity match with sufficient evidence (do not merge ambiguous short words)
    if (core && core.length >= 3) {
      for (const p of projectMap.values()) {
        const pCore = this.extractCoreProjectIdentifier(p.name);
        if (pCore && pCore === core) {
          return p;
        }
      }
    }

    return undefined;
  }

  /**
   * Primary Evaluation Entry Point for Step 10: Goal, Project & Commitment Memory Engine.
   */
  public evaluate(params: {
    userId?: string;
    message?: string;
    context?: ConversationContext;
    intent?: StructuredIntent;
    reasoning?: ReasoningAnalysis;
    planning?: PlanningAnalysis;
    verification?: VerificationAnalysis;
    governanceAnalysis?: MemoryGovernanceAnalysis;
    adaptiveLearning?: LearningAnalysis;
    longTermUserModel?: UserModelAnalysis;
    temporalMemory?: TemporalMemoryAnalysis;
    history?: ConversationTurn[];
    existingProjects?: Project[];
    existingGoals?: Goal[];
    existingCommitments?: Commitment[];
    options?: GoalProjectEvaluationOptions;
  }): GoalProjectAnalysis {
    const userId = params.options?.userId || params.userId || "default";
    const currentTime = params.options?.currentTime ?? 1000000;
    const message = (params.message || "").trim();
    const isTopicIsolated = Boolean(
      params.options?.isTopicIsolated ||
      params.governanceAnalysis?.topicIsolationApplied
    );
    const activeTopic = params.options?.activeTopic || params.context?.activeTopic || "";

    const diagnostics: GoalProjectDiagnostics = {
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

    const currentTurnOverrides: GoalProjectAnalysis["currentTurnOverrides"] = {};

    // 1. Check for Current-Turn Overrides (Pause / Switch / Temporary Instruction)
    this.detectCurrentTurnOverrides(message, currentTurnOverrides);

    // 2. Aggregate Base Collections from Memory, LongTermUserModel & Injected State
    const goalMap = new Map<string, Goal>();
    const projectMap = new Map<string, Project>();
    const commitmentMap = new Map<string, Commitment>();
    const taskMap = new Map<string, ProjectTask>();
    const milestoneMap = new Map<string, Milestone>();

    // 2a. Ingest Existing Structured Projects, Goals, Commitments
    if (params.existingProjects) {
      for (const p of params.existingProjects) {
        if (this.isValidEntity(p.name)) {
          projectMap.set(p.projectId, this.cloneProject(p));
        }
      }
    }
    if (params.existingGoals) {
      for (const g of params.existingGoals) {
        if (this.isValidEntity(g.title)) {
          goalMap.set(g.goalId, this.cloneGoal(g));
        }
      }
    }
    if (params.existingCommitments) {
      for (const c of params.existingCommitments) {
        if (this.isValidEntity(c.title)) {
          commitmentMap.set(c.commitmentId, this.cloneCommitment(c));
        }
      }
    }

    // 2b. Ingest Governance Allowed Memories & LongTermUserModel
    this.ingestFromLongTermUserModel(
      params.longTermUserModel,
      goalMap,
      projectMap,
      commitmentMap,
      currentTime,
      diagnostics
    );

    this.ingestFromGovernanceAnalysis(
      params.governanceAnalysis,
      goalMap,
      projectMap,
      commitmentMap,
      currentTime,
      diagnostics
    );

    // 2c. Ingest Planning Engine Active Plan Tasks & Milestones
    this.ingestFromPlanningEngine(
      params.planning,
      projectMap,
      goalMap,
      taskMap,
      milestoneMap,
      currentTime
    );

    // 3. Process Current-Turn Explicit User Input (Highest Authority: CURRENT_TURN_EXPLICIT)
    if (message) {
      this.processCurrentTurnMessage(
        message,
        userId,
        goalMap,
        projectMap,
        commitmentMap,
        taskMap,
        milestoneMap,
        currentTime,
        currentTurnOverrides,
        diagnostics
      );
    }

    // 4. Resolve Dependencies & Determine Execution Readiness
    this.resolveTaskDependencies(taskMap, milestoneMap, diagnostics);

    // 5. Evaluate Deadlines & Expiration Deterministically
    this.evaluateDeadlinesAndExpirations(commitmentMap, goalMap, projectMap, currentTime, diagnostics);

    // 6. Partition States into Categorized Collections
    const allGoals = Array.from(goalMap.values());
    const allProjects = Array.from(projectMap.values());
    const allCommitments = Array.from(commitmentMap.values());
    const allTasks = Array.from(taskMap.values());

    const activeGoals: Goal[] = [];
    const completedGoals: Goal[] = [];
    for (const g of allGoals) {
      if (g.status === "ACTIVE" || g.status === "PAUSED" || g.status === "BLOCKED") {
        activeGoals.push(g);
      } else if (g.status === "COMPLETED") {
        completedGoals.push(g);
      }
    }

    const activeProjects: Project[] = [];
    const pausedProjects: Project[] = [];
    const blockedProjects: Project[] = [];
    const completedProjects: Project[] = [];
    const historicalProjects: Project[] = [];

    for (const p of allProjects) {
      if (p.status === "ACTIVE") {
        activeProjects.push(p);
      } else if (p.status === "PAUSED") {
        pausedProjects.push(p);
      } else if (p.status === "BLOCKED") {
        blockedProjects.push(p);
      } else if (p.status === "COMPLETED") {
        completedProjects.push(p);
      } else {
        historicalProjects.push(p);
      }
    }

    const activeCommitments: Commitment[] = [];
    const expiredCommitments: Commitment[] = [];
    for (const c of allCommitments) {
      if (c.status === "ACTIVE" && !c.isExpired) {
        activeCommitments.push(c);
      } else if (c.isExpired || c.status === "EXPIRED") {
        expiredCommitments.push(c);
      }
    }

    const readyTasks: ProjectTask[] = [];
    const blockedTasks: ProjectTask[] = [];
    for (const t of allTasks) {
      if (t.status === "READY" || t.status === "IN_PROGRESS") {
        readyTasks.push(t);
      } else if (t.status === "BLOCKED") {
        blockedTasks.push(t);
      }
    }

    diagnostics.totalGoals = allGoals.length;
    diagnostics.activeGoalsCount = activeGoals.length;
    diagnostics.totalProjects = allProjects.length;
    diagnostics.activeProjectsCount = activeProjects.length + pausedProjects.length + blockedProjects.length;
    diagnostics.totalCommitments = allCommitments.length;
    diagnostics.expiredCommitmentsCount = expiredCommitments.length;
    diagnostics.readyTasksCount = readyTasks.length;
    diagnostics.blockedTasksCount = blockedTasks.length;

    // 7. Generate Sanitized Natural Language Directives
    const directives = this.generateSanitizedDirectives({
      activeProjects,
      pausedProjects,
      blockedProjects,
      activeGoals,
      activeCommitments,
      readyTasks,
      blockedTasks,
      currentTurnOverrides,
      isTopicIsolated,
      activeTopic,
      diagnostics,
    });

    const state: ProjectState = {
      activeProjects,
      pausedProjects,
      blockedProjects,
      completedProjects,
      historicalProjects,
      activeGoals,
      completedGoals,
      activeCommitments,
      expiredCommitments,
      activeTasks: allTasks,
    };

    return {
      state,
      activeProjects,
      blockedProjects,
      activeGoals,
      activeCommitments,
      readyTasks,
      blockedTasks,
      directives,
      currentTurnOverrides,
      diagnostics,
    };
  }

  /**
   * Detects current-turn instructions that override project status for the current turn.
   */
  private detectCurrentTurnOverrides(
    message: string,
    overrides: GoalProjectAnalysis["currentTurnOverrides"]
  ): void {
    if (!message) return;

    // Check for explicit current-turn override/pause pattern
    for (const pattern of this.CURRENT_TURN_OVERRIDE_PATTERNS) {
      const match = message.match(pattern);
      if (match) {
        const target = (match[1] || match[2] || "").trim();
        overrides.isProjectPaused = true;
        overrides.overrideReason = `User explicitly instructed to pause/switch: "${target || "current focus"}"`;
        if (target) {
          overrides.switchedProject = target;
        }
        break;
      }
    }
  }

  /**
   * Processes current turn message to extract explicit goals, projects, commitments, and status updates.
   */
  private processCurrentTurnMessage(
    message: string,
    userId: string,
    goalMap: Map<string, Goal>,
    projectMap: Map<string, Project>,
    commitmentMap: Map<string, Commitment>,
    taskMap: Map<string, ProjectTask>,
    milestoneMap: Map<string, Milestone>,
    currentTime: number,
    overrides: GoalProjectAnalysis["currentTurnOverrides"],
    diagnostics: GoalProjectDiagnostics
  ): void {
    if (this.containsSensitiveData(message)) {
      diagnostics.suppressedSensitiveCount++;
      return;
    }
    if (this.containsForbiddenIdentity(message)) {
      return;
    }

    // 1. Status Update Classification (Completion, Blocker, Reopen, Abandon)
    const statusUpdate = this.classifyStatusUpdateEvidence(message);
    if (statusUpdate.isValid) {
      if (statusUpdate.status === "ACTIVE" && statusUpdate.target) {
        // Reopening
        const normTarget = this.normalizeTitle(statusUpdate.target);
        for (const p of projectMap.values()) {
          if (p.normalizedName.includes(normTarget) || normTarget.includes(p.normalizedName)) {
            p.status = "ACTIVE";
            p.updatedAt = currentTime;
            p.version = (p.version || 1) + 1;
            p.lineage.push(`reopened_at_${currentTime}`);
            p.events.push({
              eventId: this.generateDeterministicId("evt", p.projectId, "reopened", String(currentTime)),
              eventType: "REOPENED",
              targetType: "PROJECT",
              targetId: p.projectId,
              timestamp: currentTime,
              description: `Project reopened by explicit user instruction: "${statusUpdate.target}"`,
              sourceAuthority: "CURRENT_TURN_EXPLICIT",
            });
          }
        }
        for (const g of goalMap.values()) {
          if (g.normalizedTitle.includes(normTarget) || normTarget.includes(g.normalizedTitle)) {
            g.status = "ACTIVE";
            g.updatedAt = currentTime;
            g.version = (g.version || 1) + 1;
            g.lineage.push(`reopened_at_${currentTime}`);
          }
        }
      } else if (statusUpdate.status === "COMPLETED" && statusUpdate.target) {
        // Explicit completion
        const normTarget = this.normalizeTitle(statusUpdate.target);
        for (const t of taskMap.values()) {
          if (t.normalizedTitle.includes(normTarget) || normTarget.includes(t.normalizedTitle)) {
            t.status = "COMPLETED";
            t.completedAt = currentTime;
            t.updatedAt = currentTime;
          }
        }
        for (const g of goalMap.values()) {
          if (g.normalizedTitle.includes(normTarget) || normTarget.includes(g.normalizedTitle)) {
            g.status = "COMPLETED";
            g.completedAt = currentTime;
            g.updatedAt = currentTime;
          }
        }
        for (const c of commitmentMap.values()) {
          if (c.normalizedTitle.includes(normTarget) || normTarget.includes(c.normalizedTitle)) {
            c.status = "COMPLETED";
            c.completedAt = currentTime;
            c.updatedAt = currentTime;
          }
        }
        for (const p of projectMap.values()) {
          if (p.normalizedName.includes(normTarget) || normTarget.includes(p.normalizedName)) {
            p.status = "COMPLETED";
            p.completedAt = currentTime;
            p.updatedAt = currentTime;
            p.events.push({
              eventId: this.generateDeterministicId("evt", p.projectId, "completed", String(currentTime)),
              eventType: "COMPLETED",
              targetType: "PROJECT",
              targetId: p.projectId,
              timestamp: currentTime,
              description: `Project completed by explicit confirmation: "${statusUpdate.target}"`,
              sourceAuthority: "CURRENT_TURN_EXPLICIT",
            });
          }
        }
      } else if (statusUpdate.status === "BLOCKED" && statusUpdate.blockerReason) {
        // Explicit blocker
        const rawBlocker = statusUpdate.blockerReason;
        if (this.isValidEntity(rawBlocker)) {
          for (const p of projectMap.values()) {
            if (p.status === "ACTIVE") {
              p.status = "BLOCKED";
              p.blockerDescription = rawBlocker;
              p.updatedAt = currentTime;
              p.events.push({
                eventId: this.generateDeterministicId("evt", p.projectId, "blocked", String(currentTime)),
                eventType: "BLOCKED",
                targetType: "PROJECT",
                targetId: p.projectId,
                timestamp: currentTime,
                description: `Blocked: ${rawBlocker}`,
                sourceAuthority: "CURRENT_TURN_EXPLICIT",
              });
            }
          }
          for (const g of goalMap.values()) {
            if (g.status === "ACTIVE") {
              g.status = "BLOCKED";
              g.blockerDescription = rawBlocker;
              g.updatedAt = currentTime;
            }
          }
        }
      }
    }

    // 2. Explicit Goal Extraction (passes classifyGoalEvidence)
    const goalClass = this.classifyGoalEvidence(message);
    if (goalClass.isValid && goalClass.extractedTitle) {
      const rawGoal = goalClass.extractedTitle;
      const normGoal = this.normalizeTitle(rawGoal);
      const goalId = this.generateDeterministicId("goal", userId, normGoal);

      const existing = goalMap.get(goalId);
      if (!existing) {
        goalMap.set(goalId, {
          goalId,
          title: rawGoal,
          normalizedTitle: normGoal,
          scope: "PROJECT",
          status: "ACTIVE",
          priority: "MEDIUM",
          createdAt: currentTime,
          updatedAt: currentTime,
          evidence: [
            {
              evidenceId: this.generateDeterministicId("evi", goalId, String(currentTime)),
              source: "CURRENT_TURN_MESSAGE",
              authority: "CURRENT_TURN_EXPLICIT",
              textSnippet: rawGoal,
              timestamp: currentTime,
            },
          ],
          sourceAuthority: "CURRENT_TURN_EXPLICIT",
          confidence: 1.0,
          projectIds: [],
          milestoneIds: [],
          lineage: [`created_at_${currentTime}`],
        });
      }
    }

    // 3. Explicit Project Extraction (passes classifyProjectEvidence with identity resolution)
    const projClass = this.classifyProjectEvidence(message);
    if (projClass.isValid && projClass.extractedName) {
      const rawProj = projClass.extractedName;
      const normProj = this.normalizeTitle(rawProj);

      // Check if matches an existing project (e.g. "Dora", "Dora AI", "the Dora project")
      const matched = this.findMatchingProject(rawProj, projectMap);
      if (matched) {
        matched.updatedAt = currentTime;
      } else {
        const projectId = this.generateDeterministicId("proj", userId, normProj);
        projectMap.set(projectId, {
          projectId,
          name: rawProj,
          normalizedName: normProj,
          status: "ACTIVE",
          priority: "MEDIUM",
          createdAt: currentTime,
          updatedAt: currentTime,
          goals: [],
          milestones: [],
          tasks: [],
          commitments: [],
          dependencies: [],
          events: [
            {
              eventId: this.generateDeterministicId("evt", projectId, "created", String(currentTime)),
              eventType: "CREATED",
              targetType: "PROJECT",
              targetId: projectId,
              timestamp: currentTime,
              description: `Project created from user turn: "${rawProj}"`,
              sourceAuthority: "CURRENT_TURN_EXPLICIT",
            },
          ],
          sourceAuthority: "CURRENT_TURN_EXPLICIT",
          confidence: 1.0,
          lineage: [`created_at_${currentTime}`],
        });
      }
    }

    // 4. Explicit Commitment Extraction (passes classifyCommitmentEvidence)
    const commitClass = this.classifyCommitmentEvidence(message);
    if (commitClass.isValid && commitClass.extractedTitle) {
      const rawCommitment = commitClass.extractedTitle;
      const normCommitment = this.normalizeTitle(rawCommitment);
      const commitmentId = this.generateDeterministicId("commit", userId, normCommitment);

      // Extract explicit deadline if mentioned (e.g. "tomorrow", "by Friday")
      const deadline = this.parseExplicitDeadline(rawCommitment, currentTime);

      const existing = commitmentMap.get(commitmentId);
      if (!existing) {
        commitmentMap.set(commitmentId, {
          commitmentId,
          title: rawCommitment,
          normalizedTitle: normCommitment,
          status: "ACTIVE",
          createdAt: currentTime,
          updatedAt: currentTime,
          deadline: deadline?.timestamp,
          deadlineString: deadline?.label,
          isExpired: false,
          evidence: [
            {
              evidenceId: this.generateDeterministicId("evi", commitmentId, String(currentTime)),
              source: "CURRENT_TURN_MESSAGE",
              authority: "CURRENT_TURN_EXPLICIT",
              textSnippet: rawCommitment,
              timestamp: currentTime,
            },
          ],
          sourceAuthority: "CURRENT_TURN_EXPLICIT",
          confidence: 1.0,
          isUserInitiated: true,
        });
      }
    }
  }

  /**
   * Ingests goals, projects, and commitments from LongTermUserModel.
   */
  private ingestFromLongTermUserModel(
    modelAnalysis: UserModelAnalysis | undefined,
    goalMap: Map<string, Goal>,
    projectMap: Map<string, Project>,
    commitmentMap: Map<string, Commitment>,
    currentTime: number,
    diagnostics: GoalProjectDiagnostics
  ): void {
    if (!modelAnalysis || !modelAnalysis.profile || !modelAnalysis.profile.attributes) return;

    for (const [key, attr] of Object.entries(modelAnalysis.profile.attributes)) {
      const valStr = String(attr.normalizedValue || attr.evidence?.[0]?.value || "").trim();
      if (this.containsSensitiveData(attr.key) || this.containsSensitiveData(valStr)) {
        diagnostics.suppressedSensitiveCount++;
        continue;
      }
      if (this.containsForbiddenIdentity(attr.key) || this.containsForbiddenIdentity(valStr)) {
        continue;
      }

      // CANDIDATE safety: Candidate records cannot create authoritative project/goal state
      if (attr.status === "CANDIDATE") {
        diagnostics.suppressedCandidateCount++;
        continue;
      }
      if (attr.status === "SUPPRESSED" || attr.status === "SUPERSEDED") {
        continue;
      }

      // Predictive context safety
      if (attr.sourceClassification === "PREDICTIVE_CONTEXT") {
        diagnostics.suppressedPredictiveCount++;
        continue;
      }

      const normKey = this.normalizeTitle(attr.key);
      const normVal = this.normalizeTitle(valStr);

      if (normKey.includes("project") || attr.dimension === "PROJECT_CONTEXT") {
        // Only ingest if it's actually an explicit project reference or context
        if (this.isValidProjectExpression(valStr)) {
          const matched = this.findMatchingProject(valStr, projectMap);
          if (!matched) {
            const projectId = this.generateDeterministicId("proj", modelAnalysis.userId, normVal);
            const status: GoalProjectStatus = attr.status === "OUTDATED" ? "ARCHIVED" : "ACTIVE";
            projectMap.set(projectId, {
              projectId,
              name: this.cleanTitle(valStr),
              normalizedName: normVal,
              status,
              priority: "MEDIUM",
              createdAt: attr.firstObservedAt,
              updatedAt: attr.lastObservedAt,
              goals: [],
              milestones: [],
              tasks: [],
              commitments: [],
              dependencies: [],
              events: [],
              sourceAuthority: attr.sourceClassification || "EXPLICIT_USER_MEMORY",
              confidence: attr.confidence,
              lineage: [`imported_from_user_model`],
            });
          }
        }
      } else if (normKey.includes("goal") || normKey.includes("target") || attr.dimension === "USER_GOAL") {
        if (this.isValidGoalExpression(valStr)) {
          const goalId = this.generateDeterministicId("goal", modelAnalysis.userId, normVal);
          if (!goalMap.has(goalId)) {
            const status: GoalProjectStatus = attr.status === "OUTDATED" ? "ARCHIVED" : "ACTIVE";
            goalMap.set(goalId, {
              goalId,
              title: this.cleanTitle(valStr),
              normalizedTitle: normVal,
              scope: "PROJECT",
              status,
              priority: "MEDIUM",
              createdAt: attr.firstObservedAt,
              updatedAt: attr.lastObservedAt,
              evidence: [],
              sourceAuthority: attr.sourceClassification || "EXPLICIT_USER_MEMORY",
              confidence: attr.confidence,
              projectIds: [],
              milestoneIds: [],
              lineage: [`imported_from_user_model`],
            });
          }
        }
      }
    }
  }

  /**
   * Ingests goals, projects, commitments from MemoryGovernance approved memories.
   */
  private ingestFromGovernanceAnalysis(
    governance: MemoryGovernanceAnalysis | undefined,
    goalMap: Map<string, Goal>,
    projectMap: Map<string, Project>,
    commitmentMap: Map<string, Commitment>,
    currentTime: number,
    diagnostics: GoalProjectDiagnostics
  ): void {
    if (!governance || !governance.allowedMemories) return;

    for (const mem of governance.allowedMemories) {
      if (this.containsSensitiveData(mem.key) || this.containsSensitiveData(mem.value)) {
        diagnostics.suppressedSensitiveCount++;
        continue;
      }
      if (this.containsForbiddenIdentity(mem.key) || this.containsForbiddenIdentity(mem.value)) {
        continue;
      }

      // Suppress unverified candidate memories
      if (mem.isCandidateInferred) {
        diagnostics.suppressedCandidateCount++;
        continue;
      }

      const normKey = this.normalizeTitle(mem.key);
      const valStr = (mem.value || "").trim();
      const normVal = this.normalizeTitle(valStr);

      if ((mem.type as string) === "GOAL" || (mem.type as string) === "USER_GOAL" || normKey.includes("goal") || normKey.includes("target")) {
        if (this.isValidGoalExpression(valStr)) {
          const goalId = this.generateDeterministicId("goal", "gov", normVal);
          if (!goalMap.has(goalId)) {
            goalMap.set(goalId, {
              goalId,
              title: this.cleanTitle(valStr),
              normalizedTitle: normVal,
              scope: "PROJECT",
              status: "ACTIVE",
              priority: "MEDIUM",
              createdAt: currentTime,
              updatedAt: currentTime,
              evidence: [
                {
                  evidenceId: this.generateDeterministicId("evi", goalId, String(currentTime)),
                  source: "MEMORY_GOVERNANCE",
                  authority: "EXPLICIT_USER_MEMORY",
                  textSnippet: valStr,
                  timestamp: currentTime,
                },
              ],
              sourceAuthority: "EXPLICIT_USER_MEMORY",
              confidence: mem.confidence || 0.9,
              projectIds: [],
              milestoneIds: [],
              lineage: [`imported_from_governance`],
            });
          }
        }
      } else if (mem.type === "PROJECT_CONTEXT" || (mem.type as string) === "PROJECT" || normKey.includes("project")) {
        if (this.isValidProjectExpression(valStr)) {
          const matched = this.findMatchingProject(valStr, projectMap);
          if (!matched) {
            const projectId = this.generateDeterministicId("proj", "gov", normVal);
            projectMap.set(projectId, {
              projectId,
              name: this.cleanTitle(valStr),
              normalizedName: normVal,
              status: "ACTIVE",
              priority: "MEDIUM",
              createdAt: currentTime,
              updatedAt: currentTime,
              goals: [],
              milestones: [],
              tasks: [],
              commitments: [],
              dependencies: [],
              events: [],
              sourceAuthority: "EXPLICIT_USER_MEMORY",
              confidence: mem.confidence || 0.9,
              lineage: [`imported_from_governance`],
            });
          }
        }
      }
    }
  }

  /**
   * Ingests lightweight tasks and milestones from PlanningEngine active plan.
   */
  private ingestFromPlanningEngine(
    planning: PlanningAnalysis | undefined,
    projectMap: Map<string, Project>,
    goalMap: Map<string, Goal>,
    taskMap: Map<string, ProjectTask>,
    milestoneMap: Map<string, Milestone>,
    currentTime: number
  ): void {
    if (!planning || !planning.plan || !planning.plan.steps) return;

    const plan = planning.plan;
    for (const step of plan.steps) {
      if (this.containsSensitiveData(step.description)) continue;

      const normStepTitle = this.normalizeTitle(step.description);
      const taskId = step.id || this.generateDeterministicId("task", plan.id || "plan", normStepTitle);

      const status: TaskExecutionStatus =
        step.status === "COMPLETED"
          ? "COMPLETED"
          : step.status === "IN_PROGRESS"
          ? "IN_PROGRESS"
          : step.status === "FAILED" || step.status === "BLOCKED"
          ? "BLOCKED"
          : step.status === "CANCELLED"
          ? "CANCELLED"
          : step.status === "READY"
          ? "READY"
          : "NOT_STARTED";

      const task: ProjectTask = {
        taskId,
        title: step.description,
        normalizedTitle: normStepTitle,
        status,
        dependencies: Array.isArray(step.dependencies) ? [...step.dependencies] : [],
        createdAt: currentTime,
        updatedAt: currentTime,
        completedAt: step.status === "COMPLETED" ? currentTime : undefined,
        sourceAuthority: "VERIFIED_EVIDENCE",
        order: step.order,
      };

      taskMap.set(taskId, task);
    }
  }

  /**
   * Resolves Task Dependencies deterministically.
   * Invariant: Unknown dependency blocks execution readiness.
   * Prerequisite completion enables dependent task.
   */
  public resolveTaskDependencies(
    taskMap: Map<string, ProjectTask>,
    milestoneMap: Map<string, Milestone>,
    diagnostics: GoalProjectDiagnostics
  ): void {
    for (const [taskId, task] of taskMap.entries()) {
      if (task.status === "COMPLETED" || task.status === "CANCELLED") {
        continue;
      }

      if (!task.dependencies || task.dependencies.length === 0) {
        // No dependencies: eligible to be READY or remain IN_PROGRESS
        if (task.status === "NOT_STARTED") {
          task.status = "READY";
        }
        continue;
      }

      let allSatisfied = true;
      const blockedBy: string[] = [];

      for (const depId of task.dependencies) {
        const depTask = taskMap.get(depId);
        if (!depTask) {
          // Unknown dependency blocks execution readiness
          allSatisfied = false;
          blockedBy.push(`Unknown dependency: ${depId}`);
        } else if (depTask.status !== "COMPLETED") {
          // Dependent task not completed yet
          allSatisfied = false;
          blockedBy.push(`Prerequisite task not completed: ${depTask.title}`);
        }
      }

      if (!allSatisfied) {
        task.status = "BLOCKED";
        task.blockedBy = blockedBy;
        diagnostics.blockedTasksCount++;
      } else {
        if (task.status === "NOT_STARTED" || task.status === "BLOCKED") {
          task.status = "READY";
          task.blockedBy = undefined;
        }
      }
    }
  }

  /**
   * Evaluates deadlines and expiration deterministically using options.currentTime.
   */
  public evaluateDeadlinesAndExpirations(
    commitmentMap: Map<string, Commitment>,
    goalMap: Map<string, Goal>,
    projectMap: Map<string, Project>,
    currentTime: number,
    diagnostics: GoalProjectDiagnostics
  ): void {
    for (const [id, c] of commitmentMap.entries()) {
      if (c.status === "COMPLETED" || c.status === "ABANDONED" || c.status === "EXPIRED") {
        continue;
      }

      if (c.deadline && c.deadline < currentTime) {
        c.isExpired = true;
        c.status = "EXPIRED";
        c.updatedAt = currentTime;
        diagnostics.expiredCommitmentsCount++;
      }
    }

    for (const [id, g] of goalMap.entries()) {
      if (g.status === "COMPLETED" || g.status === "ABANDONED" || g.status === "ARCHIVED" || g.status === "EXPIRED") {
        continue;
      }

      if (g.targetDate && g.targetDate < currentTime) {
        g.status = "EXPIRED";
        g.updatedAt = currentTime;
      }
    }

    for (const [id, p] of projectMap.entries()) {
      if (p.status === "COMPLETED" || p.status === "ARCHIVED" || p.status === "ABANDONED") {
        continue;
      }

      if (p.targetDate && p.targetDate < currentTime) {
        p.status = "EXPIRED";
        p.updatedAt = currentTime;
      }
    }
  }

  /**
   * Parses explicit deadline strings deterministically using injected currentTime.
   */
  public parseExplicitDeadline(
    text: string,
    currentTime: number
  ): { timestamp: number; label: string } | undefined {
    if (!text) return undefined;

    const DAY_MS = 24 * 60 * 60 * 1000;

    if (/\btomorrow\b/i.test(text) || /\bkal\b/i.test(text)) {
      return {
        timestamp: currentTime + DAY_MS,
        label: "tomorrow",
      };
    }

    if (/\b(?:within|in)\s+2\s+days\b/i.test(text) || /\bduidin er moddhe\b/i.test(text)) {
      return {
        timestamp: currentTime + 2 * DAY_MS,
        label: "within 2 days",
      };
    }

    if (/\bby friday\b/i.test(text) || /\bshukrobar er moddhe\b/i.test(text)) {
      // Deterministically 3 days ahead
      return {
        timestamp: currentTime + 3 * DAY_MS,
        label: "by Friday",
      };
    }

    if (/\bby next week\b/i.test(text) || /\bagami shoptah\b/i.test(text)) {
      return {
        timestamp: currentTime + 7 * DAY_MS,
        label: "by next week",
      };
    }

    // Explicit ISO or date check: e.g. 2026-08-25
    const isoMatch = text.match(/\b(20\d\d-\d\d-\d\d)\b/);
    if (isoMatch && isoMatch[1]) {
      const parsed = Date.parse(isoMatch[1]);
      if (!isNaN(parsed)) {
        return {
          timestamp: parsed,
          label: isoMatch[1],
        };
      }
    }

    return undefined;
  }

  /**
   * Generates Sanitized Natural Language Directives.
   * Strict invariant: Never leak internal IDs, database hashes, confidence floats, or epoch timestamps.
   */
  private generateSanitizedDirectives(params: {
    activeProjects: Project[];
    pausedProjects: Project[];
    blockedProjects: Project[];
    activeGoals: Goal[];
    activeCommitments: Commitment[];
    readyTasks: ProjectTask[];
    blockedTasks: ProjectTask[];
    currentTurnOverrides: GoalProjectAnalysis["currentTurnOverrides"];
    isTopicIsolated: boolean;
    activeTopic: string;
    diagnostics: GoalProjectDiagnostics;
  }): string[] {
    const rawDirectives: string[] = [];

    // Current-Turn Override Directive
    if (params.currentTurnOverrides.isProjectPaused && params.currentTurnOverrides.overrideReason) {
      rawDirectives.push(`Current-turn instruction: ${params.currentTurnOverrides.overrideReason}`);
    }

    // Active Projects (Respecting Topic Isolation)
    for (const p of params.activeProjects) {
      if (params.isTopicIsolated && params.activeTopic) {
        const normActiveTopic = this.normalizeTitle(params.activeTopic);
        if (!p.normalizedName.includes(normActiveTopic) && !normActiveTopic.includes(p.normalizedName)) {
          params.diagnostics.isolatedTopicCount++;
          continue;
        }
      }
      rawDirectives.push(`Active user project: "${p.name}". Keep answers relevant to its goals and progress.`);
    }

    // Blocked Projects
    for (const p of params.blockedProjects) {
      if (p.blockerDescription) {
        rawDirectives.push(`Project "${p.name}" is currently blocked by: ${p.blockerDescription}.`);
      }
    }

    // Active Goals
    for (const g of params.activeGoals) {
      if (g.status === "ACTIVE") {
        rawDirectives.push(`The user is pursuing the goal: "${g.title}".`);
      } else if (g.status === "BLOCKED" && g.blockerDescription) {
        rawDirectives.push(`Goal "${g.title}" is currently blocked: ${g.blockerDescription}.`);
      }
    }

    // Active Commitments
    for (const c of params.activeCommitments) {
      if (c.deadlineString) {
        rawDirectives.push(`The user has committed to: "${c.title}" (${c.deadlineString}).`);
      } else {
        rawDirectives.push(`The user has committed to: "${c.title}".`);
      }
    }

    // Blocked Tasks
    for (const t of params.blockedTasks) {
      if (t.blockedBy && t.blockedBy.length > 0) {
        rawDirectives.push(`Task "${t.title}" is waiting on prerequisites.`);
      }
    }

    // Ready Next Tasks (First 2)
    const topReady = params.readyTasks.slice(0, 2);
    for (const t of topReady) {
      rawDirectives.push(`Next ready task for active plan: "${t.title}".`);
    }

    // Strict sanitization of all directives
    return rawDirectives.map((d) => this.sanitizeDirective(d));
  }

  /**
   * Sanitizes a directive string to ensure no internal IDs, hashes, timestamps, or floats leak.
   */
  public sanitizeDirective(directive: string): string {
    return directive
      .replace(/\b(?:proj|goal|commit|task|evt|evi)_[a-f0-9_]{6,}\b/gi, "")
      .replace(/\b\d{10,13}\b/g, "") // Epoch timestamps
      .replace(/\b0\.\d+\b/g, "") // Confidence floats
      .replace(/\s+/g, " ")
      .trim();
  }

  // --- Validation Helpers ---

  private isValidEntity(str: string): boolean {
    if (!str || str.length < 2) return false;
    if (this.containsSensitiveData(str)) return false;
    if (this.containsForbiddenIdentity(str)) return false;
    return true;
  }

  private isValidGoalExpression(str: string): boolean {
    if (!this.isValidEntity(str)) return false;
    const norm = str.toLowerCase();
    // Filter casual conversation or simple entity questions
    if (/^(what is|how to|why is|explain|hello|hi|tell me|can you)\b/i.test(norm)) return false;
    if (/^(python|javascript|weather|tea|coffee)$/i.test(norm.trim())) return false;
    return str.trim().split(/\s+/).length >= 2;
  }

  private isValidProjectExpression(str: string): boolean {
    if (!this.isValidEntity(str)) return false;
    const norm = str.toLowerCase();
    if (/^(what is|how to|why is|explain|hello|hi|can you)\b/i.test(norm)) return false;
    if (/^(python|javascript|typescript|weather|tea|coffee)$/i.test(norm.trim())) return false;
    return str.trim().length >= 3;
  }

  private isValidCommitmentExpression(str: string): boolean {
    if (!this.isValidEntity(str)) return false;
    const norm = str.toLowerCase();
    if (/^(you should|maybe you|assistant|ai|can you)\b/i.test(norm)) return false;
    return str.trim().split(/\s+/).length >= 2;
  }

  private cleanTitle(str: string): string {
    return str
      .replace(/^(to|that|about)\s+/i, "")
      .replace(/[.,;!?]+$/, "")
      .trim();
  }

  private cloneGoal(g: Goal): Goal {
    return {
      ...g,
      evidence: g.evidence ? [...g.evidence] : [],
      projectIds: g.projectIds ? [...g.projectIds] : [],
      milestoneIds: g.milestoneIds ? [...g.milestoneIds] : [],
      lineage: g.lineage ? [...g.lineage] : [],
    };
  }

  private cloneProject(p: Project): Project {
    return {
      ...p,
      goals: p.goals ? p.goals.map((g) => this.cloneGoal(g)) : [],
      milestones: p.milestones ? [...p.milestones] : [],
      tasks: p.tasks ? [...p.tasks] : [],
      commitments: p.commitments ? p.commitments.map((c) => this.cloneCommitment(c)) : [],
      dependencies: p.dependencies ? [...p.dependencies] : [],
      events: p.events ? [...p.events] : [],
      lineage: p.lineage ? [...p.lineage] : [],
    };
  }

  private cloneCommitment(c: Commitment): Commitment {
    return {
      ...c,
      evidence: c.evidence ? [...c.evidence] : [],
    };
  }
}

export const goalProjectEngine = GoalProjectEngine.getInstance();
