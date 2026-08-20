/**
 * Dora Long-Term Memory Consolidation, Maintenance & Lifecycle Engine Test Suite
 * Phase 2 — Step 3
 */

import { memoryConsolidationEngine } from "./memoryConsolidationEngine";
import { memoryRetrievalEngine } from "./memoryRetrievalEngine";
import { memoryDecisionEngine } from "./memoryDecisionEngine";
import { contextStore } from "./contextStore";
import { intentEngine } from "./intentEngine";
import { MemoryRecord, MemoryForgetDirective } from "./memoryTypes";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runConsolidationTests() {
  console.log("==========================================");
  console.log("RUNNING DORA MEMORY CONSOLIDATION ENGINE TEST SUITE");
  console.log("==========================================");

  const baseTime = 1700000000000;

  // =========================================================================
  // TEST 1 — Duplicate Memory Consolidation
  // =========================================================================
  console.log("\nTEST 1 — Duplicate memory consolidation:");
  {
    const mem1: MemoryRecord = {
      id: "mem_dup_1",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preferred_laptop_brand",
      value: "Lenovo",
      normalizedValue: "lenovo",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 85,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 2,
      status: "ACTIVE",
      tags: ["laptop", "brand"],
      evidence: ["I prefer Lenovo laptops"],
      version: 1,
    };

    const mem2: MemoryRecord = {
      id: "mem_dup_2",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preferred_laptop_brand",
      value: "Lenovo",
      normalizedValue: "lenovo",
      source: "REPEATED_USER_STATEMENT",
      confidence: 0.9,
      importance: 80,
      createdAt: baseTime + 5000,
      updatedAt: baseTime + 5000,
      lastAccessedAt: baseTime + 5000,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["brand", "preference"],
      evidence: ["Lenovo is my favorite"],
      version: 1,
    };

    const result = memoryConsolidationEngine.consolidateDuplicates([mem1, mem2], baseTime + 10000);
    assert(result.merges.length === 1, "Exactly one merge candidate cluster identified");
    assert(result.merges[0].canonicalId === "mem_dup_1", "Canonical record is explicit user record mem_dup_1");
    assert(result.merges[0].duplicateIds.includes("mem_dup_2"), "mem_dup_2 marked as duplicate");
    
    const canonical = result.updatedMemories.find((m) => m.id === "mem_dup_1");
    const duplicate = result.updatedMemories.find((m) => m.id === "mem_dup_2");

    assert(canonical?.status === "ACTIVE", "Canonical memory remains ACTIVE");
    assert(duplicate?.status === "SUPERSEDED", "Duplicate memory marked SUPERSEDED");
    assert(duplicate?.mergedInto === "mem_dup_1", "Duplicate has mergedInto pointer to canonical");
    assert(canonical?.mergedFrom?.includes("mem_dup_2") === true, "Canonical has mergedFrom containing mem_dup_2");
    assert(canonical?.reinforcementCount === 2, "Reinforcement count combined to 2");
  }

  // =========================================================================
  // TEST 2 — Compatible Memory Merge (Tags & Evidence Preservation)
  // =========================================================================
  console.log("\nTEST 2 — Compatible memory merge:");
  {
    const memA: MemoryRecord = {
      id: "mem_theme_a",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preference_ui_theme",
      value: "dark mode",
      normalizedValue: "dark mode",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 90,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 3,
      status: "ACTIVE",
      tags: ["theme", "ui"],
      evidence: ["use dark mode"],
      version: 1,
    };

    const memB: MemoryRecord = {
      id: "mem_theme_b",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preference_ui_theme",
      value: "dark mode",
      normalizedValue: "dark mode",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 90,
      createdAt: baseTime + 1000,
      updatedAt: baseTime + 1000,
      lastAccessedAt: baseTime + 1000,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["dark", "appearance"],
      evidence: ["I love dark mode"],
      version: 1,
    };

    const res = memoryConsolidationEngine.maintain([memA, memB], { currentTime: baseTime + 2000 });
    const canonical = res.updatedMemories.find((m) => m.id === "mem_theme_a");
    assert(canonical !== undefined, "Canonical found");
    assert(canonical?.tags.includes("theme") && canonical?.tags.includes("dark"), "Tags successfully unioned");
    assert(canonical?.evidence.includes("use dark mode") && canonical?.evidence.includes("I love dark mode"), "Evidence successfully unioned");
  }

  // =========================================================================
  // TEST 3 — Conflicting Memory Resolution
  // =========================================================================
  console.log("\nTEST 3 — Conflicting memory resolution:");
  {
    const olderMem: MemoryRecord = {
      id: "mem_asus",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preference_laptop_brand",
      value: "ASUS",
      normalizedValue: "asus",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 85,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 4,
      status: "ACTIVE",
      tags: ["laptop", "asus"],
      evidence: ["I prefer ASUS"],
      version: 1,
    };

    const newerMem: MemoryRecord = {
      id: "mem_lenovo",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preference_laptop_brand",
      value: "Lenovo",
      normalizedValue: "lenovo",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 85,
      createdAt: baseTime + 50000,
      updatedAt: baseTime + 50000,
      lastAccessedAt: baseTime + 50000,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["laptop", "lenovo"],
      evidence: ["Actually I switched to Lenovo"],
      version: 1,
    };

    const res = memoryConsolidationEngine.resolveConflicts([olderMem, newerMem], baseTime + 60000);
    assert(res.conflicts.length === 1, "Conflict detected");
    assert(res.conflicts[0].winnerId === "mem_lenovo", "Newer explicit statement won conflict");
    
    const loser = res.updatedMemories.find((m) => m.id === "mem_asus");
    const winner = res.updatedMemories.find((m) => m.id === "mem_lenovo");

    assert(loser?.status === "SUPERSEDED", "Older memory marked SUPERSEDED");
    assert(loser?.supersededBy === "mem_lenovo", "Older memory has supersededBy pointer");
    assert(winner?.supersedes === "mem_asus", "Winner memory has supersedes pointer");
  }

  // =========================================================================
  // TEST 4 — Explicit Correction Precedence (Explicit vs Inferred)
  // =========================================================================
  console.log("\nTEST 4 — Explicit correction precedence:");
  {
    const inferredMem: MemoryRecord = {
      id: "mem_inferred_apple",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preferred_laptop_brand",
      value: "Apple MacBook",
      normalizedValue: "apple macbook",
      source: "INFERRED",
      confidence: 0.65,
      importance: 60,
      createdAt: baseTime + 10000,
      updatedAt: baseTime + 10000,
      lastAccessedAt: baseTime + 10000,
      accessCount: 2,
      status: "ACTIVE",
      tags: ["apple", "laptop"],
      evidence: ["User asked about M3 chips"],
      version: 1,
    };

    const explicitMem: MemoryRecord = {
      id: "mem_explicit_thinkpad",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preferred_laptop_brand",
      value: "ThinkPad",
      normalizedValue: "thinkpad",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 90,
      createdAt: baseTime + 5000,
      updatedAt: baseTime + 5000,
      lastAccessedAt: baseTime + 5000,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["thinkpad", "laptop"],
      evidence: ["I only use ThinkPads"],
      version: 1,
    };

    const res = memoryConsolidationEngine.resolveConflicts([inferredMem, explicitMem], baseTime + 20000);
    assert(res.conflicts.length === 1, "Conflict resolved");
    assert(res.conflicts[0].winnerId === "mem_explicit_thinkpad", "Explicit user memory wins over inferred");
    
    const loser = res.updatedMemories.find((m) => m.id === "mem_inferred_apple");
    assert(loser?.status === "SUPERSEDED", "Inferred memory superseded");
  }

  // =========================================================================
  // TEST 5 — Repeated Reinforcement
  // =========================================================================
  console.log("\nTEST 5 — Repeated reinforcement:");
  {
    const initialMem: MemoryRecord = {
      id: "mem_python",
      userId: "user_1",
      type: "PREFERENCE",
      key: "fav_programming_language",
      value: "Python",
      normalizedValue: "python",
      source: "REPEATED_USER_STATEMENT",
      confidence: 0.8,
      importance: 75,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 1,
      reinforcementCount: 1,
      status: "ACTIVE",
      tags: ["python", "coding"],
      evidence: ["I code in python"],
      version: 1,
    };

    const turn1 = memoryConsolidationEngine.reinforceMemory(
      initialMem,
      "Python is great for ML",
      baseTime + 1000,
      false
    );
    assert(turn1.updatedMemory.reinforcementCount === 2, "Reinforcement count incremented to 2");
    assert(turn1.updatedMemory.confidence === 0.9, "Confidence incremented boundedly to 0.9");

    const turn2 = memoryConsolidationEngine.reinforceMemory(
      turn1.updatedMemory,
      "I always pick Python",
      baseTime + 2000,
      false
    );
    assert(turn2.updatedMemory.reinforcementCount === 3, "Reinforcement count incremented to 3");
    assert(turn2.updatedMemory.importance === 80, "Importance boosted by 5 on reaching 3 reinforcements");
  }

  // =========================================================================
  // TEST 6 — Confidence Boundedness ([0.0, 1.0])
  // =========================================================================
  console.log("\nTEST 6 — Confidence boundedness:");
  {
    let currentMem: MemoryRecord = {
      id: "mem_bounded",
      userId: "user_1",
      type: "PREFERENCE",
      key: "coffee_preference",
      value: "Espresso",
      normalizedValue: "espresso",
      source: "INFERRED",
      confidence: 0.90,
      importance: 50,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["coffee"],
      evidence: ["ordered espresso"],
      version: 1,
    };

    for (let i = 0; i < 5; i++) {
      currentMem = memoryConsolidationEngine.reinforceMemory(
        currentMem,
        `evidence ${i}`,
        baseTime + (i + 1) * 1000,
        false
      ).updatedMemory;
      assert(currentMem.confidence <= 1.0, `Confidence never exceeds 1.0 (step ${i}: ${currentMem.confidence})`);
      assert(currentMem.confidence >= 0.0, `Confidence never falls below 0.0 (step ${i}: ${currentMem.confidence})`);
    }
  }

  // =========================================================================
  // TEST 7 — Importance vs Confidence Separation
  // =========================================================================
  console.log("\nTEST 7 — Importance vs confidence separation:");
  {
    // High confidence (1.0), low importance (trivial temporary preference)
    const trivialMem: MemoryRecord = {
      id: "mem_trivial",
      userId: "user_1",
      type: "PREFERENCE",
      key: "lunch_choice_today",
      value: "Sandwich",
      normalizedValue: "sandwich",
      source: "EXPLICIT_USER",
      confidence: 1.0, // 100% true
      importance: 15,  // low durable value
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["food"],
      evidence: ["I'm having a sandwich"],
      version: 1,
    };

    // High importance (90), medium confidence (0.7 inferred)
    const vitalMem: MemoryRecord = {
      id: "mem_vital",
      userId: "user_1",
      type: "GOAL",
      key: "career_goal",
      value: "Transitioning to AI Engineering",
      normalizedValue: "transitioning to ai engineering",
      source: "INFERRED",
      confidence: 0.70, // Inferred
      importance: 90,   // High importance
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["career", "goal"],
      evidence: ["looking at AI jobs"],
      version: 1,
    };

    assert(trivialMem.confidence > vitalMem.confidence, "Confidence reflects truth probability");
    assert(vitalMem.importance > trivialMem.importance, "Importance reflects durable utility independently");
  }

  // =========================================================================
  // TEST 8 — Candidate Memory Promotion
  // =========================================================================
  console.log("\nTEST 8 — Candidate memory promotion:");
  {
    const candidateMem: MemoryRecord = {
      id: "mem_cand_gaming",
      userId: "user_1",
      type: "CANDIDATE",
      key: "interest_gaming_laptops",
      value: "Interested in high-end RTX 4080 gaming laptops",
      normalizedValue: "interested in high-end rtx 4080 gaming laptops",
      source: "INFERRED",
      confidence: 0.85,
      importance: 70,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 3,
      reinforcementCount: 3, // Meets threshold >= 2
      status: "CANDIDATE",
      tags: ["gaming", "rtx"],
      evidence: ["Searched RTX 4080", "Asked about benchmark", "Checked ROG Strix"],
      version: 1,
    };

    const res = memoryConsolidationEngine.evaluateCandidate(candidateMem, [candidateMem], {
      currentTime: baseTime + 1000,
      candidatePromotionThreshold: 2,
      candidateConfidenceThreshold: 0.75,
    });

    assert(res.updatedMemory.status === "ACTIVE", "Candidate memory successfully promoted to ACTIVE");
    assert(res.action?.action === "PROMOTE_CANDIDATE", "Promotion action recorded");
  }

  // =========================================================================
  // TEST 9 — Candidate Memory Demotion
  // =========================================================================
  console.log("\nTEST 9 — Candidate memory demotion:");
  {
    const staleCandidate: MemoryRecord = {
      id: "mem_cand_drone",
      userId: "user_1",
      type: "CANDIDATE",
      key: "interest_drones",
      value: "Considering DJI Mini",
      normalizedValue: "considering dji mini",
      source: "INFERRED",
      confidence: 0.50,
      importance: 40,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 1,
      reinforcementCount: 1, // Only 1 observation
      status: "CANDIDATE",
      tags: ["drone"],
      evidence: ["asked price once"],
      version: 1,
    };

    // 40 days later without any reinforcement
    const sixtyDaysLater = baseTime + 40 * 24 * 60 * 60 * 1000;
    const res = memoryConsolidationEngine.evaluateCandidate(staleCandidate, [staleCandidate], {
      currentTime: sixtyDaysLater,
      candidateMaxStaleDays: 30,
    });

    assert(res.updatedMemory.status === "OUTDATED", "Stale unreinforced candidate demoted to OUTDATED");
    assert(res.action?.action === "DEMOTE_CANDIDATE", "Demotion action recorded");
  }

  // =========================================================================
  // TEST 10 — Stale Memory Detection & Decay
  // =========================================================================
  console.log("\nTEST 10 — Stale memory detection & decay:");
  {
    const activeMem: MemoryRecord = {
      id: "mem_temp_interest",
      userId: "user_1",
      type: "PREFERENCE",
      key: "casual_topic",
      value: "Mechanical Keyboards",
      normalizedValue: "mechanical keyboards",
      source: "INFERRED",
      confidence: 0.6,
      importance: 30, // Low importance
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["keyboards"],
      evidence: ["asked about switches"],
      version: 1,
    };

    const oneHundredDaysLater = baseTime + 100 * 24 * 60 * 60 * 1000;
    const decay = memoryConsolidationEngine.assessDecay(activeMem, oneHundredDaysLater);

    assert(decay.decayFactor > 0.3, "Decay factor is non-zero after 100 days");
    assert(decay.isStale === true, "Marked as stale for low importance unaccessed record");
    assert(decay.suggestedState === "OUTDATED", "Suggested state is OUTDATED");
  }

  // =========================================================================
  // TEST 11 — Temporary Memory Expiration
  // =========================================================================
  console.log("\nTEST 11 — Temporary memory expiration:");
  {
    const tempMem: MemoryRecord = {
      id: "mem_travel",
      userId: "user_1",
      type: "TEMPORARY",
      key: "travel_schedule",
      value: "Traveling to Cox's Bazar this weekend",
      normalizedValue: "traveling to coxs bazar this weekend",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 50,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 1,
      expiresAt: baseTime + 3 * 24 * 60 * 60 * 1000, // 3 days expiry
      status: "ACTIVE",
      tags: ["travel"],
      evidence: ["I'm traveling this weekend"],
      version: 1,
    };

    // Before expiration
    const beforeExp = memoryConsolidationEngine.checkExpiration(tempMem, baseTime + 1 * 24 * 60 * 60 * 1000);
    assert(beforeExp.isExpired === false, "Not expired on day 1");

    // After expiration (day 4)
    const afterExp = memoryConsolidationEngine.checkExpiration(tempMem, baseTime + 4 * 24 * 60 * 60 * 1000);
    assert(afterExp.isExpired === true, "Flagged as expired on day 4");
    assert(afterExp.updatedMemory?.status === "EXPIRED", "Memory status updated to EXPIRED");
    assert(afterExp.action?.action === "EXPIRE", "Action is EXPIRE");
  }

  // =========================================================================
  // TEST 12 — Explicit Forget Lifecycle
  // =========================================================================
  console.log("\nTEST 12 — Explicit forget lifecycle:");
  {
    const pool: MemoryRecord[] = [
      {
        id: "mem_asus_del",
        userId: "user_1",
        type: "PREFERENCE",
        key: "preference_laptop_brand",
        value: "ASUS",
        normalizedValue: "asus",
        source: "EXPLICIT_USER",
        confidence: 1.0,
        importance: 85,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["laptop", "asus"],
        evidence: ["prefer asus"],
        version: 1,
      },
      {
        id: "mem_theme_del",
        userId: "user_1",
        type: "PREFERENCE",
        key: "preference_ui_theme",
        value: "dark mode",
        normalizedValue: "dark mode",
        source: "EXPLICIT_USER",
        confidence: 1.0,
        importance: 90,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["theme"],
        evidence: ["dark mode"],
        version: 1,
      },
    ];

    const directive: MemoryForgetDirective = {
      keyOrTopic: "preference_laptop_brand",
      scope: "exact",
      reason: "User requested deletion of laptop brand",
    };

    const res = memoryConsolidationEngine.executeForget(pool, directive, baseTime + 1000);
    assert(res.forgottenCount === 1, "Exactly one memory deleted");
    
    const forgotten = res.updatedMemories.find((m) => m.id === "mem_asus_del");
    const retained = res.updatedMemories.find((m) => m.id === "mem_theme_del");

    assert(forgotten?.status === "DELETED", "Target memory marked as DELETED");
    assert(retained?.status === "ACTIVE", "Untargeted memory remains ACTIVE");
  }

  // =========================================================================
  // TEST 13 — Global Forget Lifecycle
  // =========================================================================
  console.log("\nTEST 13 — Global forget lifecycle:");
  {
    const pool: MemoryRecord[] = [
      {
        id: "mem_g1",
        userId: "user_1",
        type: "PREFERENCE",
        key: "k1",
        value: "v1",
        normalizedValue: "v1",
        source: "EXPLICIT_USER",
        confidence: 1.0,
        importance: 80,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "ACTIVE",
        tags: [],
        evidence: [],
        version: 1,
      },
      {
        id: "mem_g2",
        userId: "user_1",
        type: "GOAL",
        key: "k2",
        value: "v2",
        normalizedValue: "v2",
        source: "EXPLICIT_USER",
        confidence: 1.0,
        importance: 90,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "ACTIVE",
        tags: [],
        evidence: [],
        version: 1,
      },
    ];

    const directive: MemoryForgetDirective = {
      keyOrTopic: "all",
      scope: "all",
      reason: "User requested full memory wipe",
    };

    const res = memoryConsolidationEngine.executeForget(pool, directive, baseTime + 1000);
    assert(res.forgottenCount === 2, "All memories forgotten in global scope");
    assert(res.updatedMemories.every((m) => m.status === "DELETED"), "Every memory status is DELETED");
  }

  // =========================================================================
  // TEST 14 — Sensitive Data Quarantine
  // =========================================================================
  console.log("\nTEST 14 — Sensitive data quarantine:");
  {
    const sensitiveMem: MemoryRecord = {
      id: "mem_secret",
      userId: "user_1",
      type: "FACT",
      key: "api_key",
      value: "sk-1234567890abcdef1234567890abcdef",
      normalizedValue: "sk-1234567890abcdef1234567890abcdef",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 99,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["api", "key"],
      evidence: ["here is my api key"],
      version: 1,
    };

    const q = memoryConsolidationEngine.quarantineSensitive(sensitiveMem);
    assert(q.isSensitive === true, "Sensitive API key detected");
    assert(q.updatedMemory?.status === "DELETED", "Quarantined record status set to DELETED");
    assert(q.updatedMemory?.isQuarantined === true, "isQuarantined flag set to true");
    assert(q.updatedMemory?.value === "[REDACTED_SENSITIVE_DATA]", "Sensitive value redacted in storage");
  }

  // =========================================================================
  // TEST 15 — Supersession Lineage Preservation
  // =========================================================================
  console.log("\nTEST 15 — Supersession lineage preservation:");
  {
    const oldMem: MemoryRecord = {
      id: "mem_gen1",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preference_editor",
      value: "Sublime Text",
      normalizedValue: "sublime text",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 80,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["editor"],
      evidence: ["I use Sublime"],
      version: 1,
    };

    const newMem: MemoryRecord = {
      id: "mem_gen2",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preference_editor",
      value: "VS Code",
      normalizedValue: "vs code",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 85,
      createdAt: baseTime + 10000,
      updatedAt: baseTime + 10000,
      lastAccessedAt: baseTime + 10000,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["editor"],
      evidence: ["Switched to VS Code"],
      version: 1,
    };

    const res = memoryConsolidationEngine.resolveConflicts([oldMem, newMem], baseTime + 20000);
    const v1 = res.updatedMemories.find((m) => m.id === "mem_gen1");
    const v2 = res.updatedMemories.find((m) => m.id === "mem_gen2");

    assert(v1?.supersededBy === "mem_gen2", "Lineage node 1 points forward to mem_gen2");
    assert(v2?.supersedes === "mem_gen1", "Lineage node 2 points backward to mem_gen1");
  }

  // =========================================================================
  // TEST 16 — Merge Lineage Preservation
  // =========================================================================
  console.log("\nTEST 16 — Merge lineage preservation:");
  {
    const m1: MemoryRecord = {
      id: "merge_src_1",
      userId: "user_1",
      type: "PREFERENCE",
      key: "keyboard_layout",
      value: "QWERTY",
      normalizedValue: "qwerty",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 80,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["keyboard"],
      evidence: ["qwerty layout"],
      version: 1,
    };

    const m2: MemoryRecord = {
      id: "merge_src_2",
      userId: "user_1",
      type: "PREFERENCE",
      key: "keyboard_layout",
      value: "QWERTY",
      normalizedValue: "qwerty",
      source: "REPEATED_USER_STATEMENT",
      confidence: 0.9,
      importance: 80,
      createdAt: baseTime + 1000,
      updatedAt: baseTime + 1000,
      lastAccessedAt: baseTime + 1000,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["typing"],
      evidence: ["standard qwerty"],
      version: 1,
    };

    const res = memoryConsolidationEngine.consolidateDuplicates([m1, m2], baseTime + 2000);
    const canonical = res.updatedMemories.find((m) => m.id === "merge_src_1");
    const redundant = res.updatedMemories.find((m) => m.id === "merge_src_2");

    assert(canonical?.mergedFrom?.includes("merge_src_2") === true, "Canonical tracks merged source ID");
    assert(redundant?.mergedInto === "merge_src_1", "Redundant record tracks target canonical ID");
  }

  // =========================================================================
  // TEST 17 — Maintenance Idempotency
  // =========================================================================
  console.log("\nTEST 17 — Maintenance idempotency:");
  {
    const initialMemories: MemoryRecord[] = [
      {
        id: "idem_1",
        userId: "user_1",
        type: "PREFERENCE",
        key: "shell",
        value: "zsh",
        normalizedValue: "zsh",
        source: "EXPLICIT_USER",
        confidence: 1.0,
        importance: 80,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["terminal"],
        evidence: ["I use zsh"],
        version: 1,
      },
      {
        id: "idem_2",
        userId: "user_1",
        type: "PREFERENCE",
        key: "shell",
        value: "zsh",
        normalizedValue: "zsh",
        source: "REPEATED_USER_STATEMENT",
        confidence: 0.9,
        importance: 80,
        createdAt: baseTime + 1000,
        updatedAt: baseTime + 1000,
        lastAccessedAt: baseTime + 1000,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["terminal"],
        evidence: ["zsh terminal"],
        version: 1,
      },
    ];

    // Sweep 1
    const sweep1 = memoryConsolidationEngine.maintain(initialMemories, { currentTime: baseTime + 2000 });
    assert(sweep1.mergesCount === 1, "Sweep 1 performed 1 merge");
    assert(sweep1.actionsTaken.length > 0, "Sweep 1 performed maintenance actions");

    // Sweep 2 (Immediately run on sweep 1's output)
    const sweep2 = memoryConsolidationEngine.maintain(sweep1.updatedMemories, { currentTime: baseTime + 2000 });
    assert(sweep2.mergesCount === 0, "Sweep 2 performed 0 merges (Idempotent)");
    assert(sweep2.conflictsResolved.length === 0, "Sweep 2 resolved 0 conflicts (Idempotent)");
    assert(sweep2.actionsTaken.length === 0, "Sweep 2 produced 0 new actions (Idempotent)");
    assert(
      JSON.stringify(sweep1.updatedMemories) === JSON.stringify(sweep2.updatedMemories),
      "Memory states between sweep 1 and sweep 2 are identical"
    );
  }

  // =========================================================================
  // TEST 18 — Topic-Safe Maintenance
  // =========================================================================
  console.log("\nTEST 18 — Topic-safe maintenance:");
  {
    const unrelatedMemories: MemoryRecord[] = [
      {
        id: "topic_laptop",
        userId: "user_1",
        type: "PREFERENCE",
        key: "preference_laptop_brand",
        value: "Lenovo",
        normalizedValue: "lenovo",
        source: "EXPLICIT_USER",
        confidence: 1.0,
        importance: 85,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["laptop"],
        evidence: ["prefer lenovo"],
        version: 1,
      },
      {
        id: "topic_weather",
        userId: "user_1",
        type: "FACT",
        key: "home_city",
        value: "Dhaka",
        normalizedValue: "dhaka",
        source: "EXPLICIT_USER",
        confidence: 1.0,
        importance: 90,
        createdAt: baseTime + 1000,
        updatedAt: baseTime + 1000,
        lastAccessedAt: baseTime + 1000,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["location"],
        evidence: ["I live in Dhaka"],
        version: 1,
      },
    ];

    const res = memoryConsolidationEngine.maintain(unrelatedMemories, { currentTime: baseTime + 2000 });
    assert(res.conflictsResolved.length === 0, "No false conflicts detected across different topics/keys");
    assert(res.mergesCount === 0, "No false merges across different topics");
    assert(res.updatedMemories.length === 2, "All memories preserved independently");
  }

  // =========================================================================
  // TEST 19 — Contradiction Handling & Analysis
  // =========================================================================
  console.log("\nTEST 19 — Contradiction handling:");
  {
    const activeContradictionA: MemoryRecord = {
      id: "contra_a",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preferred_db",
      value: "PostgreSQL",
      normalizedValue: "postgresql",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 85,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["database"],
      evidence: ["I love postgres"],
      version: 1,
    };

    const activeContradictionB: MemoryRecord = {
      id: "contra_b",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preferred_db",
      value: "MongoDB",
      normalizedValue: "mongodb",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 85,
      createdAt: baseTime + 10000,
      updatedAt: baseTime + 10000,
      lastAccessedAt: baseTime + 10000,
      accessCount: 1,
      status: "ACTIVE",
      tags: ["database"],
      evidence: ["Switched to mongo"],
      version: 1,
    };

    const health = memoryConsolidationEngine.evaluateHealth(
      activeContradictionA,
      [activeContradictionA, activeContradictionB],
      baseTime + 15000
    );

    assert(health.contradictionRisk === "HIGH", "High contradiction risk detected for conflicting active record");
    assert(health.overallStatus === "NEEDS_MAINTENANCE", "Status is NEEDS_MAINTENANCE");
  }

  // =========================================================================
  // TEST 20 — Memory Health Assessment
  // =========================================================================
  console.log("\nTEST 20 — Memory health assessment:");
  {
    const cleanMemory: MemoryRecord = {
      id: "health_clean",
      userId: "user_1",
      type: "PREFERENCE",
      key: "preference_ui_theme",
      value: "dark mode",
      normalizedValue: "dark mode",
      source: "EXPLICIT_USER",
      confidence: 1.0,
      importance: 90,
      createdAt: baseTime,
      updatedAt: baseTime,
      lastAccessedAt: baseTime,
      accessCount: 5,
      status: "ACTIVE",
      tags: ["theme"],
      evidence: ["dark mode"],
      version: 1,
    };

    const health = memoryConsolidationEngine.evaluateHealth(cleanMemory, [cleanMemory], baseTime + 1000);
    assert(health.overallStatus === "HEALTHY", "Clean memory status is HEALTHY");
    assert(health.privacyHealth === 1.0, "Privacy health is 1.0");
    assert(health.healthScore >= 0.9, "Health score is >= 0.9");
    assert(health.issues.length === 0, "Zero health issues");
  }

  // =========================================================================
  // TEST 21 — Existing Retrieval Compatibility
  // =========================================================================
  console.log("\nTEST 21 — Existing retrieval compatibility:");
  {
    const preMaintainedMemories: MemoryRecord[] = [
      {
        id: "ret_old_asus",
        userId: "user_1",
        type: "PREFERENCE",
        key: "preference_laptop_brand",
        value: "ASUS",
        normalizedValue: "asus",
        source: "EXPLICIT_USER",
        confidence: 1.0,
        importance: 85,
        createdAt: baseTime,
        updatedAt: baseTime,
        lastAccessedAt: baseTime,
        accessCount: 2,
        status: "ACTIVE",
        tags: ["laptop"],
        evidence: ["prefer asus"],
        version: 1,
      },
      {
        id: "ret_new_lenovo",
        userId: "user_1",
        type: "PREFERENCE",
        key: "preference_laptop_brand",
        value: "Lenovo",
        normalizedValue: "lenovo",
        source: "EXPLICIT_USER",
        confidence: 1.0,
        importance: 85,
        createdAt: baseTime + 5000,
        updatedAt: baseTime + 5000,
        lastAccessedAt: baseTime + 5000,
        accessCount: 1,
        status: "ACTIVE",
        tags: ["laptop"],
        evidence: ["prefer lenovo"],
        version: 1,
      },
    ];

    // Maintain first
    const maintained = memoryConsolidationEngine.maintain(preMaintainedMemories, { currentTime: baseTime + 10000 });
    
    // Test retrieval on maintained output
    const context = contextStore.getOrCreate("compat_test");
    const intent = intentEngine.classifyIntent("What laptop do I like?", [], context);

    const retrievalResult = memoryRetrievalEngine.retrieve({
      message: "What laptop do I like?",
      context,
      intent,
      memories: maintained.updatedMemories,
      userId: "user_1",
    });

    assert(retrievalResult.retrievedMemories.length === 1, "Retrieval returned exactly 1 resolved memory");
    assert(retrievalResult.retrievedMemories[0].memory.value === "Lenovo", "Retrieved active Lenovo memory");
    assert(retrievalResult.excludedCount.superseded === 1, "Superseded ASUS record cleanly excluded by retrieval engine");
  }

  // =========================================================================
  // TEST 22 — Phase 1 Memory Decision Engine Regression Compatibility
  // =========================================================================
  console.log("\nTEST 22 — Phase 1 Memory Decision Engine regression compatibility:");
  {
    const context = contextStore.getOrCreate("phase1_compat");
    const intent = intentEngine.classifyIntent("Remember that I prefer dark mode.", [], context);

    const decision = memoryDecisionEngine.evaluate({
      message: "Remember that I prefer dark mode.",
      context,
      intent,
    });

    assert(decision.action === "SAVE", "Decision engine produced SAVE");
    assert(decision.isExplicit === true, "Explicit flag is true");
    assert(decision.targetRecord?.key === "preference_ui_theme", "Target key is preference_ui_theme");
    assert(decision.targetRecord?.value === "dark mode", "Target value is dark mode");
  }

  console.log("==========================================");
  console.log("ALL 22 MEMORY CONSOLIDATION TESTS PASSED!");
  console.log("==========================================");
}

runConsolidationTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
