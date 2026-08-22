/**
 * Dora Phase 2 — Step 11: Cross-Session Context Continuity & Intelligent Recall Test Suite
 * 
 * 60 Deterministic, Bounded, Non-LLM Test Cases (CC-1 to CC-60)
 */

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let beforeEachHooks: Array<() => void> = [];

function beforeEach(fn: () => void) {
  beforeEachHooks.push(fn);
}

function describe(name: string, fn: () => void) {
  console.log(`\n=== ${name} ===`);
  const prevHooks = [...beforeEachHooks];
  fn();
  beforeEachHooks = prevHooks;
}

function it(name: string, fn: () => void) {
  totalTests++;
  for (const hook of beforeEachHooks) {
    hook();
  }
  try {
    fn();
    passedTests++;
    console.log(`[PASS] ${name}`);
  } catch (err: any) {
    failedTests++;
    console.error(`[FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined`);
      }
    },
    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`Expected value to be undefined but got ${JSON.stringify(actual)}`);
      }
    },
    toContain(item: any) {
      if (typeof actual === "string") {
        if (!actual.includes(item)) {
          throw new Error(`Expected string "${actual}" to contain "${item}"`);
        }
      } else if (Array.isArray(actual)) {
        if (!actual.includes(item)) {
          throw new Error(`Expected array to contain ${JSON.stringify(item)}`);
        }
      } else {
        throw new Error(`Cannot use toContain on ${typeof actual}`);
      }
    },
    toBeGreaterThan(val: number) {
      if (!(actual > val)) {
        throw new Error(`Expected ${actual} > ${val}`);
      }
    },
    toBeLessThan(val: number) {
      if (!(actual < val)) {
        throw new Error(`Expected ${actual} < ${val}`);
      }
    },
    toBeGreaterThanOrEqual(val: number) {
      if (!(actual >= val)) {
        throw new Error(`Expected ${actual} >= ${val}`);
      }
    },
    toBeLessThanOrEqual(val: number) {
      if (!(actual <= val)) {
        throw new Error(`Expected ${actual} <= ${val}`);
      }
    },
    toMatch(pattern: RegExp | string) {
      const reg = typeof pattern === "string" ? new RegExp(pattern) : pattern;
      if (!reg.test(String(actual))) {
        throw new Error(`Expected "${actual}" to match ${pattern}`);
      }
    },
    not: {
      toBe(expected: any) {
        if (actual === expected) {
          throw new Error(`Expected ${JSON.stringify(actual)} NOT to be ${JSON.stringify(expected)}`);
        }
      },
      toContain(item: any) {
        if (typeof actual === "string") {
          if (actual.includes(item)) {
            throw new Error(`Expected string "${actual}" NOT to contain "${item}"`);
          }
        } else if (Array.isArray(actual)) {
          if (actual.includes(item)) {
            throw new Error(`Expected array NOT to contain ${JSON.stringify(item)}`);
          }
        }
      },
      toMatch(pattern: RegExp | string) {
        const reg = typeof pattern === "string" ? new RegExp(pattern) : pattern;
        if (reg.test(String(actual))) {
          throw new Error(`Expected "${actual}" NOT to match ${pattern}`);
        }
      },
    },
  };
}
import {
  ContextContinuityEngine,
  contextContinuityEngine,
  CONTINUITY_AUTHORITY_WEIGHTS,
} from "./contextContinuityEngine";
import {
  ContextContinuityEvaluationInput,
  ContextContinuityItem,
  ContinuitySourceAuthority,
} from "./contextContinuityTypes";
import { Project, Goal, Commitment, ProjectTask } from "./goalProjectTypes";
import { UserModelAttribute } from "./longTermUserModelTypes";

describe("Dora Phase 2 — Step 11: Cross-Session Context Continuity Engine", () => {
  let engine: ContextContinuityEngine = ContextContinuityEngine.getInstance();

  beforeEach(() => {
    engine = ContextContinuityEngine.getInstance();
  });

  // ==========================================
  // GROUP 1: Authority Hierarchy (CC-1 to CC-6)
  // ==========================================
  describe("Authority Hierarchy & Precedence", () => {
    it("CC-1: Current-turn explicit instruction has highest authority (1.00)", () => {
      expect(CONTINUITY_AUTHORITY_WEIGHTS["CURRENT_TURN_EXPLICIT"]).toBe(1.00);
      expect(CONTINUITY_AUTHORITY_WEIGHTS["CURRENT_TURN_EXPLICIT"]).toBeGreaterThan(
        CONTINUITY_AUTHORITY_WEIGHTS["GOVERNANCE_APPROVED_MEMORY"]
      );
    });

    it("CC-2: Hard constraint and verified evidence outrank memory and user model", () => {
      expect(CONTINUITY_AUTHORITY_WEIGHTS["HARD_CONSTRAINT"]).toBe(0.95);
      expect(CONTINUITY_AUTHORITY_WEIGHTS["VERIFIED_EVIDENCE"]).toBe(0.90);
      expect(CONTINUITY_AUTHORITY_WEIGHTS["VERIFIED_EVIDENCE"]).toBeGreaterThan(
        CONTINUITY_AUTHORITY_WEIGHTS["CONFIRMED_USER_MODEL"]
      );
    });

    it("CC-3: Governance approved memory outranks user model and project context", () => {
      expect(CONTINUITY_AUTHORITY_WEIGHTS["GOVERNANCE_APPROVED_MEMORY"]).toBe(0.85);
      expect(CONTINUITY_AUTHORITY_WEIGHTS["CONFIRMED_USER_MODEL"]).toBe(0.80);
      expect(CONTINUITY_AUTHORITY_WEIGHTS["ACTIVE_GOAL_PROJECT_COMMITMENT"]).toBe(0.75);
    });

    it("CC-4: Temporal context outranks adaptive patterns and predictive suggestions", () => {
      expect(CONTINUITY_AUTHORITY_WEIGHTS["TEMPORAL_CONTEXT"]).toBe(0.70);
      expect(CONTINUITY_AUTHORITY_WEIGHTS["CONFIRMED_ADAPTIVE_PATTERN"]).toBe(0.60);
      expect(CONTINUITY_AUTHORITY_WEIGHTS["PREDICTIVE_CONTEXT"]).toBe(0.30);
    });

    it("CC-5: Predictive context is strictly advisory (0.30) and cannot outrank governed memory", () => {
      const res = engine.evaluate({
        message: "how should I format this?",
        retrievedMemories: {
          memories: [
            {
              id: "mem_pref",
              key: "format_style",
              value: "bullet points",
              category: "COMMUNICATION",
              source: "EXPLICIT_USER",
              isExplicit: true,
              status: "ACTIVE",
              confidence: 0.9,
              createdAt: 1000,
              updatedAt: 1000,
            } as any,
          ],
        } as any,
        predictiveContext: {
          candidateSuggestions: [
            {
              id: "pred_sug_1",
              type: "format_style",
              description: "numbered list",
              promptDirective: "Use numbered list",
            },
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      const memoryItem = res.selectedItems.find((i) => i.title === "format_style");
      expect(memoryItem).toBeDefined();
      expect(memoryItem?.content).toBe("bullet points");
      expect(memoryItem?.authority).toBe("GOVERNANCE_APPROVED_MEMORY");
    });

    it("CC-6: System default has lowest authority (0.10)", () => {
      expect(CONTINUITY_AUTHORITY_WEIGHTS["SYSTEM_DEFAULT"]).toBe(0.10);
    });
  });

  // ==========================================
  // GROUP 2: Explicit Recall (CC-7 to CC-12)
  // ==========================================
  describe("Explicit Recall Triggers", () => {
    it("CC-7: Detects 'where were we?' as explicit recall", () => {
      const res = engine.evaluate({
        message: "where were we?",
        goalProjectAnalysis: {
          activeProjects: [
            {
              projectId: "proj_dora",
              name: "Dora",
              status: "ACTIVE",
              goals: [{ goalId: "g1", title: "Build Step 11", status: "ACTIVE" } as any],
              milestones: [],
              tasks: [{ taskId: "t1", title: "Write tests", status: "READY" } as any],
              commitments: [],
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 1000,
              updatedAt: 1000,
              lineage: [],
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      expect(res.continuityStatus).toBe("EXPLICIT_RECALL");
      expect(res.diagnostics.isExplicitRecall).toBe(true);
      expect(res.activeProject?.name).toBe("Dora");
      expect(res.activeProject?.readyTasks).toContain("Write tests");
    });

    it("CC-8: Detects 'where did we stop?' as explicit recall", () => {
      const res = engine.evaluate({
        message: "where did we stop yesterday?",
        options: { currentTime: 1000 },
      });
      expect(res.continuityStatus).toBe("EXPLICIT_RECALL");
      expect(res.diagnostics.isExplicitRecall).toBe(true);
    });

    it("CC-9: Detects Bangla 'amra kothay chilam?' as explicit recall", () => {
      const res = engine.evaluate({
        message: "amra kothay chilam?",
        options: { currentTime: 1000 },
      });
      expect(res.continuityStatus).toBe("EXPLICIT_RECALL");
    });

    it("CC-10: Detects Bangla 'kothay shesh korechilam?' as explicit recall", () => {
      const res = engine.evaluate({
        message: "kothay shesh korechilam bolo to",
        options: { currentTime: 1000 },
      });
      expect(res.continuityStatus).toBe("EXPLICIT_RECALL");
    });

    it("CC-11: Detects 'what did we decide' as DECISION_RECALL", () => {
      const res = engine.evaluate({
        message: "what did we decide regarding the database?",
        options: { currentTime: 1000 },
      });
      expect(res.continuityStatus).toBe("EXPLICIT_RECALL");
    });

    it("CC-12: Detects 'what was the plan' as PLAN_RECALL", () => {
      const res = engine.evaluate({
        message: "what was the plan for our backend?",
        options: { currentTime: 1000 },
      });
      expect(res.continuityStatus).toBe("EXPLICIT_RECALL");
    });
  });

  // =======================================================
  // GROUP 3: Ambiguous References & Deictic Resolution (CC-13 to CC-18)
  // =======================================================
  describe("Ambiguous References & Deictic Resolution", () => {
    it("CC-13: Unambiguous single project resolved when user says 'continue it'", () => {
      const res = engine.evaluate({
        message: "let's continue it",
        goalProjectAnalysis: {
          activeProjects: [
            {
              projectId: "proj_1",
              name: "Compiler Optimizer",
              status: "ACTIVE",
              goals: [],
              milestones: [],
              tasks: [],
              commitments: [],
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 1000,
              updatedAt: 1000,
              lineage: [],
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      expect(res.continuityStatus).toBe("RESUMED");
      expect(res.resolvedContinuityTarget).toBe("Compiler Optimizer");
      expect(res.requiresClarification).toBe(false);
    });

    it("CC-14: Multiple active projects trigger AMBIGUOUS status and clarification prompt", () => {
      const res = engine.evaluate({
        message: "continue that project",
        goalProjectAnalysis: {
          activeProjects: [
            {
              projectId: "proj_1",
              name: "Alpha Web",
              status: "ACTIVE",
              goals: [],
              milestones: [],
              tasks: [],
              commitments: [],
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 1000,
              updatedAt: 1000,
              lineage: [],
            } as any,
            {
              projectId: "proj_2",
              name: "Beta Mobile",
              status: "ACTIVE",
              goals: [],
              milestones: [],
              tasks: [],
              commitments: [],
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 1000,
              updatedAt: 1000,
              lineage: [],
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      expect(res.continuityStatus).toBe("AMBIGUOUS");
      expect(res.requiresClarification).toBe(true);
      expect(res.clarificationPrompt).toContain("Alpha Web");
      expect(res.clarificationPrompt).toContain("Beta Mobile");
    });

    it("CC-15: Ambiguous status suppresses competing project context directives", () => {
      const res = engine.evaluate({
        message: "continue the task",
        goalProjectAnalysis: {
          activeProjects: [
            {
              projectId: "proj_1",
              name: "Alpha Web",
              status: "ACTIVE",
              goals: [],
              milestones: [],
              tasks: [{ taskId: "t1", title: "Task Alpha", status: "READY" } as any],
              commitments: [],
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 1000,
              updatedAt: 1000,
              lineage: [],
            } as any,
            {
              projectId: "proj_2",
              name: "Beta Mobile",
              status: "ACTIVE",
              goals: [],
              milestones: [],
              tasks: [{ taskId: "t2", title: "Task Beta", status: "READY" } as any],
              commitments: [],
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 1000,
              updatedAt: 1000,
              lineage: [],
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      expect(res.continuityStatus).toBe("AMBIGUOUS");
      // Directives should not assert a specific project
      expect(res.directives.some((d) => d.includes("currently working on"))).toBe(false);
    });

    it("CC-16: Explicitly named project resolves even if multiple active projects exist", () => {
      const res = engine.evaluate({
        message: "continue the Beta Mobile work",
        goalProjectAnalysis: {
          activeProjects: [
            {
              projectId: "proj_1",
              name: "Alpha Web",
              status: "ACTIVE",
              goals: [],
              milestones: [],
              tasks: [],
              commitments: [],
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 1000,
              updatedAt: 1000,
              lineage: [],
            } as any,
            {
              projectId: "proj_2",
              name: "Beta Mobile",
              status: "ACTIVE",
              goals: [],
              milestones: [],
              tasks: [],
              commitments: [],
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 1000,
              updatedAt: 1000,
              lineage: [],
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      expect(res.continuityStatus).toBe("RESUMED");
      expect(res.resolvedContinuityTarget).toBe("Beta Mobile");
      expect(res.requiresClarification).toBe(false);
    });

    it("CC-17: Active topic in context disambiguates generic reference", () => {
      const res = engine.evaluate({
        message: "where were we?",
        context: {
          activeTopic: "Alpha Web",
          activeEntities: ["Alpha Web"],
        } as any,
        goalProjectAnalysis: {
          activeProjects: [
            {
              projectId: "proj_1",
              name: "Alpha Web",
              status: "ACTIVE",
              goals: [],
              milestones: [],
              tasks: [],
              commitments: [],
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 1000,
              updatedAt: 1000,
              lineage: [],
            } as any,
            {
              projectId: "proj_2",
              name: "Beta Mobile",
              status: "ACTIVE",
              goals: [],
              milestones: [],
              tasks: [],
              commitments: [],
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 1000,
              updatedAt: 1000,
              lineage: [],
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      expect(res.resolvedContinuityTarget).toBe("Alpha Web");
      expect(res.requiresClarification).toBe(false);
    });

    it("CC-18: Banglish deictic reference 'oita continue koro' resolves unambiguous project", () => {
      const res = engine.evaluate({
        message: "oita continue koro",
        goalProjectAnalysis: {
          activeProjects: [
            {
              projectId: "proj_1",
              name: "Website Redesign",
              status: "ACTIVE",
              goals: [],
              milestones: [],
              tasks: [],
              commitments: [],
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 1000,
              updatedAt: 1000,
              lineage: [],
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      expect(res.continuityStatus).toBe("RESUMED");
      expect(res.resolvedContinuityTarget).toBe("Website Redesign");
    });
  });

  // =======================================================
  // GROUP 4: Current-Turn Conflict Gates & Overrides (CC-19 to CC-24)
  // =======================================================
  describe("Current-Turn Conflict Gates & Overrides", () => {
    it("CC-19: Language override in current turn suppresses historical language preference", () => {
      const res = engine.evaluate({
        message: "বাংলায় উত্তর দাও",
        longTermUserModel: {
          profile: {
            confirmedAttributes: [
              {
                key: "preferred_language",
                dimension: "LANGUAGE",
                normalizedValue: "English",
                confidence: 0.95,
                evidenceCount: 5,
                independentEvidenceCount: 3,
                status: "CONFIRMED",
                sourceClassification: "CONFIRMED_USER_MODEL",
                firstObservedAt: 100,
                lastObservedAt: 900,
                isDurable: true,
                isTemporary: false,
                evidence: [],
              } as any,
            ],
          } as any,
        } as any,
        options: { currentTime: 1000 },
      });

      const langItem = res.suppressedItems.find((i) => i.normalizedKey === "pref_language");
      expect(langItem).toBeDefined();
      expect(langItem?.isCurrentTurnConflict).toBe(true);
      expect(res.directives.some((d) => d.includes("Bangla"))).toBe(true);
      expect(res.directives.some((d) => d.includes("English"))).toBe(false);
    });

    it("CC-20: Verbosity override in current turn ('in detail') suppresses historical concise preference", () => {
      const res = engine.evaluate({
        message: "explain in detail step by step",
        longTermUserModel: {
          profile: {
            confirmedAttributes: [
              {
                key: "preferred_verbosity",
                dimension: "VERBOSITY",
                normalizedValue: "concise and brief",
                confidence: 0.9,
                evidenceCount: 3,
                independentEvidenceCount: 2,
                status: "CONFIRMED",
                sourceClassification: "CONFIRMED_USER_MODEL",
                firstObservedAt: 100,
                lastObservedAt: 900,
                isDurable: true,
                isTemporary: false,
                evidence: [],
              } as any,
            ],
          } as any,
        } as any,
        options: { currentTime: 1000 },
      });

      const verbItem = res.suppressedItems.find((i) => i.normalizedKey === "pref_verbosity");
      expect(verbItem).toBeDefined();
      expect(verbItem?.isCurrentTurnConflict).toBe(true);
      expect(res.directives.some((d) => d.includes("detailed explanation"))).toBe(true);
    });

    it("CC-21: Brand override ('Recommend Lenovo instead') suppresses historical ASUS preference", () => {
      const res = engine.evaluate({
        message: "Recommend Lenovo instead for my setup",
        retrievedMemories: {
          memories: [
            {
              id: "mem_laptop",
              key: "preferred_laptop_brand",
              value: "ASUS ROG series",
              category: "PREFERENCES",
              source: "EXPLICIT_USER",
              isExplicit: true,
              status: "ACTIVE",
              confidence: 0.9,
              createdAt: 500,
              updatedAt: 500,
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      const brandItem = res.suppressedItems.find((i) => i.normalizedKey.includes("laptop") || i.title.includes("laptop"));
      expect(brandItem).toBeDefined();
      expect(brandItem?.isCurrentTurnConflict).toBe(true);
      expect(res.directives.some((d) => d.includes("Lenovo"))).toBe(true);
    });

    it("CC-22: Project switch override ('Forget Dora for now, let's switch to my website') suppresses Dora", () => {
      const res = engine.evaluate({
        message: "Forget Dora for now, let's switch to my website",
        goalProjectAnalysis: {
          activeProjects: [
            {
              projectId: "proj_dora",
              name: "Dora",
              status: "ACTIVE",
              goals: [],
              milestones: [],
              tasks: [],
              commitments: [],
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 500,
              updatedAt: 500,
              lineage: [],
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      expect(res.continuityStatus).toBe("SWITCHED");
      expect(res.suppressedItems.some((i) => i.title === "Dora" && i.isCurrentTurnConflict)).toBe(true);
    });

    it("CC-23: Explicit exclusion ('Don't use Python') suppresses historical Python tool preferences", () => {
      const res = engine.evaluate({
        message: "Don't use Python for this task",
        retrievedMemories: {
          memories: [
            {
              id: "mem_py",
              key: "primary_language_preference",
              value: "Python 3.11",
              category: "TECHNICAL",
              source: "EXPLICIT_USER",
              isExplicit: true,
              status: "ACTIVE",
              confidence: 0.9,
              createdAt: 500,
              updatedAt: 500,
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      expect(res.suppressedItems.some((i) => i.title.includes("language_preference") && i.isCurrentTurnConflict)).toBe(true);
    });

    it("CC-24: Current turn directives win without mutating stored background memories", () => {
      const input: ContextContinuityEvaluationInput = {
        message: "Speak in Banglish",
        longTermUserModel: {
          profile: {
            confirmedAttributes: [
              {
                key: "language_preference",
                dimension: "LANGUAGE",
                normalizedValue: "English",
                confidence: 0.95,
                evidenceCount: 4,
                independentEvidenceCount: 2,
                status: "CONFIRMED",
                sourceClassification: "CONFIRMED_USER_MODEL",
                firstObservedAt: 100,
                lastObservedAt: 800,
                isDurable: true,
                isTemporary: false,
                evidence: [],
              } as any,
            ],
          } as any,
        } as any,
      };

      const res = engine.evaluate(input);
      expect(res.directives.some((d) => d.includes("Banglish"))).toBe(true);
      // Verify input object was not mutated (read-only guarantee)
      expect(input.longTermUserModel?.profile?.confirmedAttributes[0].normalizedValue).toBe("English");
    });
  });

  // =======================================================
  // GROUP 5: Topic & Domain Isolation (CC-25 to CC-30)
  // =======================================================
  describe("Topic & Domain Isolation", () => {
    it("CC-25: In isolated topic (weather), project-specific context is suppressed", () => {
      const res = engine.evaluate({
        message: "what is the weather like in Dhaka today?",
        options: {
          currentTime: 1000,
          isTopicIsolated: true,
          activeTopic: "weather",
        },
        retrievedMemories: {
          memories: [
            {
              id: "mem_proj",
              key: "dora_architecture",
              value: "Dora uses 11 cognitive steps",
              category: "PROJECT_CONTEXT",
              source: "EXPLICIT_USER",
              isExplicit: true,
              status: "ACTIVE",
              confidence: 0.9,
              createdAt: 500,
              updatedAt: 500,
            } as any,
          ],
        } as any,
      });

      expect(res.continuityStatus).toBe("ISOLATED");
      const projItem = res.suppressedItems.find((i) => i.title === "dora_architecture");
      expect(projItem).toBeDefined();
      expect(projItem?.isTopicIsolated).toBe(true);
    });

    it("CC-26: Global communication preferences are preserved during topic isolation", () => {
      const res = engine.evaluate({
        message: "what is the weather in Sylhet?",
        longTermUserModel: {
          profile: {
            confirmedAttributes: [
              {
                key: "preferred_language",
                dimension: "LANGUAGE",
                normalizedValue: "Bangla",
                confidence: 0.95,
                evidenceCount: 5,
                independentEvidenceCount: 3,
                status: "CONFIRMED",
                sourceClassification: "CONFIRMED_USER_MODEL",
                firstObservedAt: 100,
                lastObservedAt: 900,
                isDurable: true,
                isTemporary: false,
                evidence: [],
              } as any,
            ],
          } as any,
        } as any,
        options: {
          currentTime: 1000,
          isTopicIsolated: true,
          activeTopic: "weather",
        },
      });

      const langItem = res.selectedItems.find((i) => i.normalizedKey === "pref_language");
      expect(langItem).toBeDefined();
      expect(langItem?.scope).toBe("GLOBAL");
      expect(res.directives.some((d) => d.includes("Bangla"))).toBe(true);
    });

    it("CC-27: Cross-domain memory contamination is blocked when topic switches", () => {
      const res = engine.evaluate({
        message: "give me a recipe for chicken biryani",
        options: {
          currentTime: 1000,
          isTopicIsolated: true,
          activeTopic: "cooking",
        },
        retrievedMemories: {
          memories: [
            {
              id: "mem_code",
              key: "database_schema",
              value: "PostgreSQL with Drizzle ORM",
              category: "PROJECT_CONTEXT",
              source: "EXPLICIT_USER",
              isExplicit: true,
              status: "ACTIVE",
              confidence: 0.9,
              createdAt: 500,
              updatedAt: 500,
            } as any,
          ],
        } as any,
      });

      expect(res.suppressedItems.some((i) => i.title === "database_schema" && i.isTopicIsolated)).toBe(true);
    });

    it("CC-28: Topic-isolated items are accurately counted in diagnostics", () => {
      const res = engine.evaluate({
        message: "tell me a joke",
        options: {
          currentTime: 1000,
          isTopicIsolated: true,
          activeTopic: "humor",
        },
        retrievedMemories: {
          memories: [
            {
              id: "mem_1",
              key: "work_topic_1",
              value: "audit logs",
              category: "WORK",
              source: "EXPLICIT_USER",
              isExplicit: true,
              status: "ACTIVE",
              confidence: 0.9,
              createdAt: 500,
              updatedAt: 500,
            } as any,
          ],
        } as any,
      });

      expect(res.diagnostics.suppressedTopicCount).toBeGreaterThanOrEqual(1);
    });

    it("CC-29: Matching topic allows domain context to be selected", () => {
      const res = engine.evaluate({
        message: "how do we structure our cognitive pipeline?",
        options: {
          currentTime: 1000,
          isTopicIsolated: false,
          activeTopic: "Dora architecture",
        },
        retrievedMemories: {
          memories: [
            {
              id: "mem_dora",
              key: "dora_pipeline",
              value: "Sequential 11-step engine",
              category: "PROJECT_CONTEXT",
              source: "EXPLICIT_USER",
              isExplicit: true,
              status: "ACTIVE",
              confidence: 0.95,
              createdAt: 900,
              updatedAt: 900,
            } as any,
          ],
        } as any,
      });

      expect(res.selectedItems.some((i) => i.title === "dora_pipeline")).toBe(true);
    });

    it("CC-30: Multiple topic changes in succession isolate prior domains safely", () => {
      const res = engine.evaluate({
        message: "Let's check the stock prices",
        options: {
          currentTime: 1000,
          isTopicIsolated: true,
          activeTopic: "finance",
        },
        retrievedMemories: {
          memories: [
            {
              id: "mem_health",
              key: "workout_routine",
              value: "5km run daily",
              category: "HEALTH",
              source: "EXPLICIT_USER",
              isExplicit: true,
              status: "ACTIVE",
              confidence: 0.9,
              createdAt: 500,
              updatedAt: 500,
            } as any,
          ],
        } as any,
      });

      expect(res.suppressedItems.some((i) => i.title === "workout_routine")).toBe(true);
    });
  });

  // =========================================================================
  // GROUP 6: Project, Goal, Milestone, Task & Blocker Continuity (CC-31 to CC-36)
  // =========================================================================
  describe("Project, Goal, Milestone, Task & Blocker Continuity", () => {
    it("CC-31: Project continuity includes active goals, ready tasks, and blockers", () => {
      const res = engine.evaluate({
        message: "where were we on Dora?",
        goalProjectAnalysis: {
          activeProjects: [
            {
              projectId: "p_dora",
              name: "Dora",
              status: "ACTIVE",
              goals: [{ goalId: "g1", title: "Complete Phase 2", status: "ACTIVE" } as any],
              milestones: [{ milestoneId: "m1", title: "Step 11 Core", status: "ACTIVE" } as any],
              tasks: [{ taskId: "t1", title: "Test suite implementation", status: "READY" } as any],
              commitments: [{ commitmentId: "c1", title: "Deliver by Friday", status: "ACTIVE" } as any],
              blockerDescription: "Waiting for schema signoff",
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 1000,
              updatedAt: 1000,
              lineage: [],
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      expect(res.activeProject).toBeDefined();
      expect(res.activeProject?.name).toBe("Dora");
      expect(res.activeProject?.activeGoals).toContain("Complete Phase 2");
      expect(res.activeProject?.readyTasks).toContain("Test suite implementation");
      expect(res.activeProject?.currentBlockers).toContain("Waiting for schema signoff");
      expect(res.directives.some((d) => d.includes("Waiting for schema signoff"))).toBe(true);
    });

    it("CC-32: Completed tasks and expired commitments are not presented as active", () => {
      const res = engine.evaluate({
        message: "what is the current status of the project?",
        goalProjectAnalysis: {
          activeProjects: [
            {
              projectId: "p_1",
              name: "E-Commerce",
              status: "ACTIVE",
              goals: [],
              milestones: [],
              tasks: [{ taskId: "t_done", title: "Setup repo", status: "COMPLETED" } as any],
              commitments: [{ commitmentId: "c_exp", title: "Deploy demo", status: "EXPIRED", isExpired: true } as any],
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 1000,
              updatedAt: 1000,
              lineage: [],
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      expect(res.activeProject?.readyTasks).not.toContain("Setup repo");
      expect(res.activeProject?.activeCommitments).not.toContain("Deploy demo");
    });

    it("CC-33: Standalone active goals from Step 10 are selected", () => {
      const res = engine.evaluate({
        message: "what are my current goals?",
        goalProjectAnalysis: {
          activeGoals: [
            {
              goalId: "g_standalone",
              title: "Learn Rust",
              status: "ACTIVE",
              scope: "GLOBAL",
              priority: "HIGH",
              createdAt: 500,
              updatedAt: 500,
              evidence: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 0.9,
              projectIds: [],
              milestoneIds: [],
              lineage: [],
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      expect(res.activeGoals).toContain("Learn Rust");
      expect(res.directives.some((d) => d.includes("Learn Rust"))).toBe(true);
    });

    it("CC-34: Standalone active commitments from Step 10 are selected", () => {
      const res = engine.evaluate({
        message: "what did I commit to?",
        goalProjectAnalysis: {
          activeCommitments: [
            {
              commitmentId: "c_standalone",
              title: "Review PR #42",
              status: "ACTIVE",
              isExpired: false,
              createdAt: 800,
              updatedAt: 800,
              evidence: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 0.95,
              isUserInitiated: true,
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      expect(res.activeCommitments).toContain("Review PR #42");
    });

    it("CC-35: Blocked project tasks are identified and separated from ready tasks", () => {
      const res = engine.evaluate({
        message: "show project tasks",
        goalProjectAnalysis: {
          activeProjects: [
            {
              projectId: "p_1",
              name: "Cloud Migration",
              status: "ACTIVE",
              goals: [],
              milestones: [],
              tasks: [
                { taskId: "t1", title: "Provision DB", status: "READY" } as any,
                { taskId: "t2", title: "Run Migration Script", status: "BLOCKED" } as any,
              ],
              commitments: [],
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 1000,
              updatedAt: 1000,
              lineage: [],
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      expect(res.activeProject?.readyTasks).toContain("Provision DB");
      expect(res.activeProject?.blockedTasks).toContain("Run Migration Script");
    });

    it("CC-36: Non-project unrelated turns do not inject full project dumps", () => {
      const res = engine.evaluate({
        message: "how do I calculate standard deviation?",
        goalProjectAnalysis: {
          activeProjects: [
            {
              projectId: "p_1",
              name: "Internal Accounting App",
              status: "ACTIVE",
              goals: [{ goalId: "g1", title: "Finish payroll module", status: "ACTIVE" } as any],
              milestones: [],
              tasks: [],
              commitments: [],
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 1000,
              updatedAt: 1000,
              lineage: [],
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      expect(res.activeProject).toBeUndefined();
      expect(res.directives.some((d) => d.includes("payroll module"))).toBe(false);
    });
  });

  // =========================================================================
  // GROUP 7: Cross-Session Boundary & State Transitions (CC-37 to CC-42)
  // =========================================================================
  describe("Cross-Session Boundaries & State Transitions", () => {
    it("CC-37: New session without explicit recall suppresses low-relevance non-global items", () => {
      const res = engine.evaluate({
        message: "Hi there, good morning!",
        retrievedMemories: {
          memories: [
            {
              id: "mem_specific",
              key: "yesterday_debugging_variable",
              value: "temp_ptr_3 was null",
              category: "DEBUG",
              source: "EXPLICIT_USER",
              status: "ACTIVE",
              createdAt: 500,
              updatedAt: 500,
            } as any,
          ],
        } as any,
        options: {
          currentTime: 1000,
          isNewSession: true,
        },
      });

      expect(res.selectedItems.some((i) => i.title === "yesterday_debugging_variable")).toBe(false);
    });

    it("CC-38: New session retains confirmed global user preferences", () => {
      const res = engine.evaluate({
        message: "Good morning!",
        longTermUserModel: {
          profile: {
            confirmedAttributes: [
              {
                key: "theme_preference",
                dimension: "COMMUNICATION",
                normalizedValue: "Dark mode",
                confidence: 0.95,
                evidenceCount: 5,
                independentEvidenceCount: 3,
                status: "CONFIRMED",
                sourceClassification: "CONFIRMED_USER_MODEL",
                firstObservedAt: 100,
                lastObservedAt: 900,
                isDurable: true,
                isTemporary: false,
                evidence: [],
              } as any,
            ],
          } as any,
        } as any,
        options: {
          currentTime: 1000,
          isNewSession: true,
        },
      });

      expect(res.selectedItems.some((i) => i.title === "theme_preference")).toBe(true);
    });

    it("CC-39: Cross-session explicit recall restores prior active project safely", () => {
      const res = engine.evaluate({
        message: "where were we in our previous session?",
        goalProjectAnalysis: {
          activeProjects: [
            {
              projectId: "p_prev",
              name: "Compiler Backend",
              status: "ACTIVE",
              goals: [{ goalId: "g1", title: "LLVM IR Generation", status: "ACTIVE" } as any],
              milestones: [],
              tasks: [{ taskId: "t1", title: "Implement SSA pass", status: "READY" } as any],
              commitments: [],
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 500,
              updatedAt: 500,
              lineage: [],
            } as any,
          ],
        } as any,
        options: {
          currentTime: 1000,
          isNewSession: true,
          previousSessionId: "sess_001",
          sessionId: "sess_002",
        },
      });

      expect(res.continuityStatus).toBe("EXPLICIT_RECALL");
      expect(res.activeProject?.name).toBe("Compiler Backend");
      expect(res.activeProject?.readyTasks).toContain("Implement SSA pass");
    });

    it("CC-40: Historical completed projects are retrieved only during explicit recall", () => {
      const projectState = {
        activeProjects: [],
        completedProjects: [
          {
            projectId: "p_comp",
            name: "V1 Launch",
            status: "COMPLETED",
            goals: [],
            milestones: [],
            tasks: [],
            commitments: [],
            dependencies: [],
            events: [],
            sourceAuthority: "VERIFIED_EVIDENCE",
            confidence: 1.0,
            createdAt: 100,
            updatedAt: 300,
            lineage: [],
          } as any,
        ],
      };

      // Normal turn: completed project NOT in candidates
      const normalRes = engine.evaluate({
        message: "hello",
        goalProjectAnalysis: { state: projectState } as any,
        options: { currentTime: 1000 },
      });
      expect(normalRes.selectedItems.some((i) => i.title === "V1 Launch")).toBe(false);

      // Explicit recall turn: completed project is ingested
      const recallRes = engine.evaluate({
        message: "what did we finish before?",
        goalProjectAnalysis: { state: projectState } as any,
        options: { currentTime: 1000 },
      });
      expect(recallRes.continuityStatus).toBe("EXPLICIT_RECALL");
    });

    it("CC-41: Session ID metadata is respected without side-effects", () => {
      const res = engine.evaluate({
        message: "hello",
        options: {
          sessionId: "sess_abc",
          previousSessionId: "sess_xyz",
          currentTime: 1000,
        },
      });
      expect(res.diagnostics).toBeDefined();
    });

    it("CC-42: Continuity status transitions from NONE to RESUMED to SWITCHED predictably", () => {
      // NONE
      const res1 = engine.evaluate({
        message: "hi",
        options: { currentTime: 1000 },
      });
      expect(res1.continuityStatus).toBe("NONE");

      // RESUMED
      const res2 = engine.evaluate({
        message: "let's continue Dora",
        goalProjectAnalysis: {
          activeProjects: [
            {
              projectId: "p_dora",
              name: "Dora",
              status: "ACTIVE",
              goals: [],
              milestones: [],
              tasks: [],
              commitments: [],
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 500,
              updatedAt: 500,
              lineage: [],
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });
      expect(res2.continuityStatus).toBe("RESUMED");

      // SWITCHED
      const res3 = engine.evaluate({
        message: "Pause Dora, let's switch to WebApp",
        goalProjectAnalysis: {
          activeProjects: [
            {
              projectId: "p_dora",
              name: "Dora",
              status: "ACTIVE",
              goals: [],
              milestones: [],
              tasks: [],
              commitments: [],
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 500,
              updatedAt: 500,
              lineage: [],
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });
      expect(res3.continuityStatus).toBe("SWITCHED");
    });
  });

  // =========================================================================
  // GROUP 8: Recency, Stale Context & Time Decay (CC-43 to CC-48)
  // =========================================================================
  describe("Recency, Stale Context & Time Decay", () => {
    it("CC-43: Recent items (<1 day old) receive 1.0 recency score", () => {
      const res = engine.evaluate({
        message: "search query",
        retrievedMemories: {
          memories: [
            {
              id: "mem_rec",
              key: "search_query",
              value: "react typescript",
              category: "TECH",
              source: "EXPLICIT_USER",
              status: "ACTIVE",
              createdAt: 950,
              updatedAt: 950,
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      const item = res.selectedItems.find((i) => i.title === "search_query");
      expect(item?.recencyScore).toBe(1.0);
    });

    it("CC-44: Stale items (>30 days old) with low recency score are suppressed by default", () => {
      const thirtyFiveDaysAgo = 1000 - (35 * 24 * 3600 * 1000);
      const res = engine.evaluate({
        message: "tell me about algorithms",
        retrievedMemories: {
          memories: [
            {
              id: "mem_stale",
              key: "stale_note",
              value: "old temporary note",
              category: "GENERAL",
              source: "EXPLICIT_USER",
              status: "ACTIVE",
              createdAt: thirtyFiveDaysAgo,
              updatedAt: thirtyFiveDaysAgo,
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      const staleItem = res.suppressedItems.find((i) => i.title === "stale_note");
      expect(staleItem).toBeDefined();
      expect(staleItem?.suppressionReason).toBe("STALE_CONTEXT_SUPPRESSED");
      expect(res.diagnostics.suppressedStaleCount).toBe(1);
    });

    it("CC-45: Explicit recall allows stale historical context to be retrieved", () => {
      const sixtyDaysAgo = 1000 - (60 * 24 * 3600 * 1000);
      const res = engine.evaluate({
        message: "what did we discuss before about our architecture?",
        retrievedMemories: {
          memories: [
            {
              id: "mem_arch",
              key: "architecture_decision",
              value: "Event driven microservices",
              category: "TECH",
              source: "EXPLICIT_USER",
              status: "ACTIVE",
              createdAt: sixtyDaysAgo,
              updatedAt: sixtyDaysAgo,
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      expect(res.continuityStatus).toBe("EXPLICIT_RECALL");
      expect(res.selectedItems.some((i) => i.title === "architecture_decision")).toBe(true);
    });

    it("CC-46: allowStaleRecall option permits stale context retrieval", () => {
      const fortyDaysAgo = 1000 - (40 * 24 * 3600 * 1000);
      const res = engine.evaluate({
        message: "tell me about architecture",
        retrievedMemories: {
          memories: [
            {
              id: "mem_arch_2",
              key: "architecture_spec",
              value: "Hexagonal architecture",
              category: "TECH",
              source: "EXPLICIT_USER",
              status: "ACTIVE",
              createdAt: fortyDaysAgo,
              updatedAt: fortyDaysAgo,
            } as any,
          ],
        } as any,
        options: {
          currentTime: 1000,
          allowStaleRecall: true,
        },
      });

      expect(res.selectedItems.some((i) => i.title === "architecture_spec")).toBe(true);
    });

    it("CC-47: Recency decay follows deterministic stepped schedule", () => {
      const res1 = engine.evaluate({
        message: "note",
        retrievedMemories: {
          memories: [
            {
              id: "m1",
              key: "note",
              value: "val1",
              source: "EXPLICIT_USER",
              status: "ACTIVE",
              updatedAt: 1000 - 5 * 24 * 3600 * 1000,
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });
      expect(res1.selectedItems[0].recencyScore).toBe(0.85);
    });

    it("CC-48: currentTime parameter default is fully deterministic without Date.now() calls", () => {
      const res = engine.evaluate({
        message: "hello",
      });
      expect(res.diagnostics.evaluationTimeMs).toBe(0);
    });
  });

  // =========================================================================
  // GROUP 9: Deduplication & Collapse across layers (CC-49 to CC-52)
  // =========================================================================
  describe("Deduplication & Collapse Across Layers", () => {
    it("CC-49: Duplicate representations across Memory, UserModel, and Temporal are collapsed", () => {
      const res = engine.evaluate({
        message: "how should you reply?",
        retrievedMemories: {
          memories: [
            {
              id: "mem_lang",
              key: "preferred_language",
              value: "Banglish",
              source: "EXPLICIT_USER",
              isExplicit: true,
              status: "ACTIVE",
              createdAt: 1000,
              updatedAt: 1000,
            } as any,
          ],
        } as any,
        longTermUserModel: {
          profile: {
            confirmedAttributes: [
              {
                key: "language_pref",
                dimension: "LANGUAGE",
                normalizedValue: "Banglish",
                confidence: 0.9,
                status: "CONFIRMED",
                sourceClassification: "CONFIRMED_USER_MODEL",
                firstObservedAt: 100,
                lastObservedAt: 900,
                isDurable: true,
                isTemporary: false,
                evidence: [],
              } as any,
            ],
          } as any,
        } as any,
        temporalMemory: {
          activePatterns: [
            {
              patternId: "temp_lang",
              attributeKey: "language_preference",
              dimension: "LANGUAGE",
              currentValue: "Banglish",
              temporalStatus: "STABLE",
              scope: "GLOBAL",
              lastObservedAt: 800,
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      // Exactly ONE item with normalizedKey pref_language selected
      const selectedLangItems = res.selectedItems.filter((i) => i.normalizedKey === "pref_language");
      expect(selectedLangItems.length).toBe(1);
      // Governed memory has higher authority (0.85) than user model (0.80) or temporal (0.70)
      expect(selectedLangItems[0].authority).toBe("GOVERNANCE_APPROVED_MEMORY");
      expect(res.diagnostics.suppressedDuplicateCount).toBeGreaterThanOrEqual(2);
    });

    it("CC-50: Highest authority item is retained during deduplication", () => {
      const res = engine.evaluate({
        message: "hardware setup",
        retrievedMemories: {
          memories: [
            {
              id: "mem_brand",
              key: "preferred_brand_laptop",
              value: "Lenovo ThinkPad",
              source: "EXPLICIT_USER",
              isExplicit: true,
              status: "ACTIVE",
              createdAt: 1000,
              updatedAt: 1000,
            } as any,
          ],
        } as any,
        predictiveContext: {
          candidateSuggestions: [
            {
              id: "pred_brand",
              type: "preferred_brand_laptop",
              description: "Lenovo IdeaPad",
            },
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      const selectedBrand = res.selectedItems.find((i) => i.normalizedKey === "pref_hardware_laptop");
      expect(selectedBrand?.authority).toBe("GOVERNANCE_APPROVED_MEMORY");
      expect(selectedBrand?.content).toBe("Lenovo ThinkPad");
    });

    it("CC-51: Duplicate suppression count is tracked in diagnostics", () => {
      const res = engine.evaluate({
        message: "tone",
        retrievedMemories: {
          memories: [
            { id: "m1", key: "response_tone", value: "professional", source: "EXPLICIT_USER", status: "ACTIVE" } as any,
          ],
        } as any,
        longTermUserModel: {
          profile: {
            confirmedAttributes: [
              { key: "response_tone", dimension: "TONE", normalizedValue: "professional", status: "CONFIRMED" } as any,
            ],
          } as any,
        } as any,
        options: { currentTime: 1000 },
      });

      expect(res.diagnostics.suppressedDuplicateCount).toBe(1);
    });

    it("CC-52: Non-duplicate items with distinct normalized keys are both retained", () => {
      const res = engine.evaluate({
        message: "my setup",
        retrievedMemories: {
          memories: [
            { id: "m1", key: "preferred_theme", value: "dark", source: "EXPLICIT_USER", status: "ACTIVE" } as any,
            { id: "m2", key: "preferred_verbosity", value: "concise", source: "EXPLICIT_USER", status: "ACTIVE" } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      expect(res.selectedItems.some((i) => i.normalizedKey === "pref_theme")).toBe(true);
      expect(res.selectedItems.some((i) => i.normalizedKey === "pref_verbosity")).toBe(true);
    });
  });

  // =========================================================================
  // GROUP 10: Sensitive Data & Identity Safety Defense Gates (CC-53 to CC-56)
  // =========================================================================
  describe("Sensitive Data & Identity Safety Defense Gates", () => {
    it("CC-53: Suppresses raw API keys (sk-...) in content or title", () => {
      const res = engine.evaluate({
        message: "show credentials",
        retrievedMemories: {
          memories: [
            {
              id: "mem_key",
              key: "stripe_secret",
              value: "sk-proj-1234567890abcdef1234",
              source: "EXPLICIT_USER",
              status: "ACTIVE",
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      const sensitiveItem = res.suppressedItems.find((i) => i.title === "stripe_secret");
      expect(sensitiveItem?.isSensitive).toBe(true);
      expect(sensitiveItem?.isSuppressed).toBe(true);
      expect(sensitiveItem?.suppressionReason).toBe("SENSITIVE_DATA_SUPPRESSED");
      expect(res.selectedItems.some((i) => i.title === "stripe_secret")).toBe(false);
      expect(res.diagnostics.suppressedSensitiveCount).toBe(1);
    });

    it("CC-54: Suppresses Bearer auth tokens in historical context", () => {
      const res = engine.evaluate({
        message: "show auth header",
        retrievedMemories: {
          memories: [
            {
              id: "mem_tok",
              key: "auth_token",
              value: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.secret",
              source: "EXPLICIT_USER",
              status: "ACTIVE",
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      expect(res.suppressedItems.some((i) => i.title === "auth_token" && i.isSensitive)).toBe(true);
    });

    it("CC-55: Preserves safe phrases like 'token budget' without false-positive suppression", () => {
      const res = engine.evaluate({
        message: "token management",
        retrievedMemories: {
          memories: [
            {
              id: "mem_budget",
              key: "token_budget_policy",
              value: "Ensure prompt token budget is under 4000 tokens",
              source: "EXPLICIT_USER",
              status: "ACTIVE",
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      });

      const item = res.selectedItems.find((i) => i.title === "token_budget_policy");
      expect(item).toBeDefined();
      expect(item?.isSensitive).toBe(false);
    });

    it("CC-56: Blocks forbidden identity inferences (e.g. inferred employment/salary)", () => {
      const res = engine.evaluate({
        message: "tell me about myself",
        longTermUserModel: {
          profile: {
            confirmedAttributes: [
              {
                key: "inferred_employment",
                dimension: "DOMAIN_INTEREST",
                normalizedValue: "User works at Google as an engineer earning 200k",
                sourceClassification: "CONFIRMED_ADAPTIVE_PATTERN", // Non-explicit inference
                status: "CONFIRMED",
              } as any,
            ],
          } as any,
        } as any,
        options: { currentTime: 1000 },
      });

      const item = res.suppressedItems.find((i) => i.title === "inferred_employment");
      expect(item?.suppressionReason).toBe("FORBIDDEN_IDENTITY_INFERENCE");
      expect(res.selectedItems.some((i) => i.title === "inferred_employment")).toBe(false);
    });
  });

  // =========================================================================
  // GROUP 11: Directive Sanitization & Context Budget limits (CC-57 to CC-60)
  // =========================================================================
  describe("Directive Sanitization & Context Budget Limits", () => {
    it("CC-57: Directives are sanitized to remove raw UUIDs, scores, and timestamps", () => {
      const res = engine.evaluate({
        message: "tell me about my project",
        goalProjectAnalysis: {
          activeProjects: [
            {
              projectId: "proj_9b542886_6ddd_4e46",
              name: "Dora",
              status: "ACTIVE",
              goals: [{ goalId: "goal_12345678", title: "Complete Phase 2", status: "ACTIVE" } as any],
              milestones: [],
              tasks: [{ taskId: "task_abcdef12", title: "Refactor core", status: "READY" } as any],
              commitments: [],
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 1700000000000,
              updatedAt: 1700000000000,
              lineage: [],
            } as any,
          ],
        } as any,
        options: { currentTime: 1700000000000 },
      });

      for (const d of res.sanitizedDirectives) {
        expect(d).not.toMatch(/\bproj_[a-f0-9_]{4,}\b/);
        expect(d).not.toMatch(/\bgoal_[a-f0-9_]{4,}\b/);
        expect(d).not.toMatch(/\btask_[a-f0-9_]{4,}\b/);
        expect(d).not.toMatch(/\b1700000000000\b/);
        expect(d).not.toMatch(/\bconfidence\s*[:=]\s*0\.\d+\b/);
      }
    });

    it("CC-58: Context budget limits (maxMemories, maxTotalContextItems) are strictly enforced", () => {
      const memories = Array.from({ length: 10 }, (_, i) => ({
        id: `mem_${i}`,
        key: `custom_note_${i}`,
        value: `value ${i}`,
        source: "EXPLICIT_USER",
        status: "ACTIVE",
        createdAt: 1000,
        updatedAt: 1000,
      }));

      const res = engine.evaluate({
        message: "custom note",
        retrievedMemories: { memories: memories as any } as any,
        options: {
          currentTime: 1000,
          budgetConfig: {
            maxMemories: 3,
            maxTotalContextItems: 3,
          },
        },
      });

      expect(res.selectedItems.length).toBeLessThanOrEqual(3);
      expect(res.suppressedItems.some((i) => i.suppressionReason === "BUDGET_MEMORY_EXCEEDED" || i.suppressionReason === "BUDGET_TOTAL_EXCEEDED")).toBe(true);
    });

    it("CC-59: Max directives cap is respected", () => {
      const res = engine.evaluate({
        message: "where were we?",
        goalProjectAnalysis: {
          activeProjects: [
            {
              projectId: "p1",
              name: "Dora",
              status: "ACTIVE",
              goals: [
                { goalId: "g1", title: "Goal 1", status: "ACTIVE" } as any,
                { goalId: "g2", title: "Goal 2", status: "ACTIVE" } as any,
                { goalId: "g3", title: "Goal 3", status: "ACTIVE" } as any,
              ],
              milestones: [],
              tasks: [{ taskId: "t1", title: "Task 1", status: "READY" } as any],
              commitments: [{ commitmentId: "c1", title: "Commit 1", status: "ACTIVE" } as any],
              blockerDescription: "Blocker 1",
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 1000,
              updatedAt: 1000,
              lineage: [],
            } as any,
          ],
        } as any,
        options: {
          currentTime: 1000,
          budgetConfig: { maxDirectives: 3 },
        },
      });

      expect(res.sanitizedDirectives.length).toBeLessThanOrEqual(3);
    });

    it("CC-60: Determinism and idempotency check: identical inputs yield identical output", () => {
      const input: ContextContinuityEvaluationInput = {
        message: "where were we on Dora?",
        goalProjectAnalysis: {
          activeProjects: [
            {
              projectId: "p_dora",
              name: "Dora",
              status: "ACTIVE",
              goals: [{ goalId: "g1", title: "Complete Step 11", status: "ACTIVE" } as any],
              milestones: [],
              tasks: [{ taskId: "t1", title: "Write tests", status: "READY" } as any],
              commitments: [],
              dependencies: [],
              events: [],
              sourceAuthority: "VERIFIED_EVIDENCE",
              confidence: 1.0,
              createdAt: 1000,
              updatedAt: 1000,
              lineage: [],
            } as any,
          ],
        } as any,
        options: { currentTime: 1000 },
      };

      const res1 = engine.evaluate(input);
      const res2 = engine.evaluate(input);

      expect(JSON.stringify(res1)).toBe(JSON.stringify(res2));
    });
  });
});

console.log("\n=============================================");
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log("=============================================\n");
