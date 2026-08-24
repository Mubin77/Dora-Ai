/**
 * Dora Adaptive Memory Learning & User Model Engine
 * Phase 2 — Step 5
 * 
 * Implements a deterministic, bounded Adaptive Learning layer that extracts stable user-level
 * patterns from already validated memory and interaction signals.
 * 
 * Guarantees:
 * 1. Deterministic, non-LLM, non-networked, non-blocking, privacy-safe.
 * 2. Does NOT invent facts or hallucinate biography/ownership.
 * 3. Distinguishes CANDIDATE vs CONFIRMED vs SUPPRESSED vs OUTDATED.
 * 4. Bounded confidence strictly in [0.0, 1.0].
 * 5. Deduplicates independent evidence and avoids duplicate inflation.
 * 6. Explicit user corrections supersede and decay outdated patterns.
 * 7. Current-turn user instructions strictly outrank historical preferences.
 * 8. Sanitized output directives never expose internal IDs or scoring math.
 * 9. Idempotent analysis.
 */

import { ConversationContext, ConversationTurn } from "./contextTypes";
import { StructuredIntent, BrainIntent } from "./intentTypes";
import { ReasoningAnalysis } from "./reasoningTypes";
import { PlanningAnalysis } from "./planningTypes";
import { VerificationAnalysis } from "./verificationTypes";
import { MemoryGovernanceAnalysis, MemoryGovernanceCandidate } from "./memoryGovernanceTypes";
import {
  LearningAnalysis,
  LearningPattern,
  LearningSignal,
  LearningSignalSource,
  LearningSignalType,
  PatternStatus,
  PatternType,
  LearningDecision,
  LearningEvidence,
  UserBehaviorProfile,
  UserPreferenceProfile,
  InteractionPreference,
  TaskPattern,
  DomainInterest,
  LearningAction,
} from "./adaptiveLearningTypes";

export class AdaptiveLearningEngine {
  private static instance: AdaptiveLearningEngine;

  private constructor() {}

  public static getInstance(): AdaptiveLearningEngine {
    if (!AdaptiveLearningEngine.instance) {
      AdaptiveLearningEngine.instance = new AdaptiveLearningEngine();
    }
    return AdaptiveLearningEngine.instance;
  }

  // Thresholds for deterministic pattern promotion & decay
  private readonly CANDIDATE_INITIAL_CONFIDENCE = 0.60;
  private readonly PROMOTION_CONFIDENCE_THRESHOLD = 0.75;
  private readonly PROMOTION_INDEPENDENT_EVIDENCE_THRESHOLD = 3;
  private readonly EXPLICIT_PROMOTION_EVIDENCE_THRESHOLD = 2;
  private readonly MAX_CONFIDENCE = 1.0;
  private readonly MIN_CONFIDENCE = 0.0;
  private readonly STALE_DECAY_MILLIS = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly OUTDATED_CONFIDENCE_THRESHOLD = 0.35;

  /**
   * Main entry point for Adaptive Memory Learning & User Model Engine
   */
  public analyze(params: {
    message: string;
    context: ConversationContext;
    intent: StructuredIntent;
    reasoning?: ReasoningAnalysis;
    planning?: PlanningAnalysis;
    verification?: VerificationAnalysis;
    governanceAnalysis?: MemoryGovernanceAnalysis;
    existingPatterns?: LearningPattern[];
    history?: ConversationTurn[];
    options?: {
      userId?: string;
      currentTime?: number;
      currentTurnOverrides?: Record<string, any>;
    };
  }): LearningAnalysis {
    const {
      message = "",
      context,
      intent,
      reasoning,
      planning,
      verification,
      governanceAnalysis,
      existingPatterns = [],
      history = [],
      options,
    } = params;

    const userId = options?.userId || context?.id || "default";
    const currentTime = options?.currentTime ?? 0;
    const currentTurnOverrides: string[] = [];
    let currentTurnOverrideApplied = false;

    const decisions: LearningAction[] = [];
    let totalSignalsProcessed = 0;
    let sensitiveSignalsBlocked = 0;
    let candidatesCreated = 0;
    let patternsReinforced = 0;
    let patternsPromoted = 0;
    let patternsDemoted = 0;
    let conflictsDetected = 0;

    // Deep clone existing patterns to avoid in-place corruption
    let currentPatterns: LearningPattern[] = existingPatterns.map((p) => ({
      ...p,
      evidence: p.evidence.map((e) => ({ ...e })),
      directives: p.directives ? [...p.directives] : undefined,
    }));

    // 1. Extract raw learning signals from governed sources and interaction turn
    const rawSignals = this.extractSignals({
      message,
      context,
      intent,
      reasoning,
      planning,
      governanceAnalysis,
      history,
      existingPatterns: currentPatterns,
      currentTime,
    });

    totalSignalsProcessed = rawSignals.length;

    // 2. Filter sensitive signals and deduplicate same-turn signals
    const safeSignals: LearningSignal[] = [];
    const seenSignalKeys = new Set<string>();

    for (const sig of rawSignals) {
      if (sig.isSensitive || this.isSensitiveContent(sig.signalKey, sig.signalValue)) {
        sensitiveSignalsBlocked++;
        decisions.push({
          actionType: "SUPPRESS",
          patternId: sig.id,
          reason: "SENSITIVE_DATA_SUPPRESSED",
          patternKey: sig.signalKey,
          patternValue: "[REDACTED_SENSITIVE_DATA]",
        });
      } else {
        const sigDedupeKey = `${sig.source}_${sig.signalKey}_${this.normalizeKey(sig.signalValue)}`;
        if (!seenSignalKeys.has(sigDedupeKey)) {
          seenSignalKeys.add(sigDedupeKey);
          safeSignals.push(sig);
        }
      }
    }

    // 3. Process User Corrections First (Highest Precedence among historical signals)
    const correctionSignals = safeSignals.filter(
      (s) => s.type === "CORRECTION" || s.source === "USER_CORRECTION"
    );
    for (const corr of correctionSignals) {
      const result = this.processCorrection(corr, currentPatterns, currentTime);
      currentPatterns = result.updatedPatterns;
      decisions.push(...result.actions);
      conflictsDetected += result.conflictsCount;
    }

    // 4. Process safe learning signals (Preferences, Styles, Tasks, Domains)
    const standardSignals = safeSignals.filter(
      (s) => s.type !== "CORRECTION" && s.source !== "USER_CORRECTION"
    );

    for (const signal of standardSignals) {
      const matchIndex = this.findMatchingPatternIndex(currentPatterns, signal);

      if (matchIndex === -1) {
        // No existing pattern: Create pattern (CONFIRMED if explicit, CANDIDATE if inferred)
        const newPattern = this.createPattern(userId, signal, currentTime);
        currentPatterns.push(newPattern);
        if (newPattern.status === "CANDIDATE") {
          candidatesCreated++;
        } else if (newPattern.status === "CONFIRMED") {
          patternsPromoted++;
        }
        decisions.push({
          actionType: "CREATE_CANDIDATE",
          patternId: newPattern.id,
          reason: signal.isExplicit ? "EXPLICIT_INITIAL_STATEMENT" : "INTERACTION_OBSERVED",
          newStatus: newPattern.status,
          patternKey: newPattern.key,
          patternValue: newPattern.value,
        });
      } else {
        // Existing pattern found: Evaluate reinforcement or promotion
        const existing = currentPatterns[matchIndex];

        // Check if values conflict
        if (this.isConflictingValue(existing, signal)) {
          conflictsDetected++;
          if (signal.isExplicit) {
            // Newer explicit statement overrides existing
            const updateResult = this.overridePatternWithExplicit(
              existing,
              signal,
              userId,
              currentTime
            );
            currentPatterns[matchIndex] = updateResult.updatedExisting;
            if (updateResult.newPattern) {
              currentPatterns.push(updateResult.newPattern);
            }
            decisions.push(...updateResult.actions);
          } else {
            decisions.push({
              actionType: "CONFLICT",
              patternId: existing.id,
              reason: "CONFLICTING_UNCONFIRMED_SIGNAL",
              patternKey: signal.signalKey,
              patternValue: signal.signalValue,
            });
          }
        } else {
          // Reinforce matching pattern
          const reinforceResult = this.reinforcePattern(existing, signal, currentTime);
          currentPatterns[matchIndex] = reinforceResult.pattern;
          if (reinforceResult.isReinforced) {
            patternsReinforced++;
          }
          if (reinforceResult.isPromoted) {
            patternsPromoted++;
          }
          decisions.push(...reinforceResult.actions);
        }
      }
    }

    // 5. Apply Temporal Decay to Inactive Patterns
    const decayedResult = this.applyTemporalDecay(currentPatterns, currentTime);
    currentPatterns = decayedResult.patterns;
    patternsDemoted += decayedResult.demotedCount;
    decisions.push(...decayedResult.actions);

    // 6. Check Current-Turn User Overrides & Build Sanitized Directives
    const activeDirectives: string[] = [];
    const lowerMessage = message.toLowerCase();

    // Check explicit current-turn instructions against learned patterns
    const currentExplicitStyle = this.detectCurrentTurnStyleInstruction(lowerMessage);

    // If existing pattern was superseded or overridden in this turn, mark currentTurnOverrideApplied
    if (
      decisions.some(
        (d) =>
          d.reason === "SUPERSEDED_BY_EXPLICIT_UPDATE" ||
          d.reason === "SUPERSEDED_BY_EXPLICIT_CORRECTION"
      ) ||
      (existingPatterns.length > 0 &&
        (currentExplicitStyle.verbosity ||
          currentExplicitStyle.language ||
          currentExplicitStyle.codeDensity))
    ) {
      currentTurnOverrideApplied = true;
    }

    // Build synthesized user profile
    const profile = this.buildUserProfile(userId, currentPatterns, currentTime);

    for (const pattern of currentPatterns) {
      if (pattern.status === "SUPPRESSED" || pattern.status === "OUTDATED") {
        continue;
      }

      // Check current-turn override
      if (this.isCurrentTurnOverridden(pattern, lowerMessage, currentExplicitStyle)) {
        currentTurnOverrideApplied = true;
        currentTurnOverrides.push(
          `Overrode ${pattern.patternType} '${pattern.key}' with current turn instruction`
        );
        continue; // Do NOT generate directive if current turn explicitly contradicts it!
      }

      // Generate sanitized directive for CONFIRMED or strong CANDIDATE patterns
      const directive = this.generateSanitizedDirective(pattern);
      if (directive && !activeDirectives.includes(directive)) {
        activeDirectives.push(directive);
      }
    }

    return {
      userId,
      patterns: currentPatterns,
      activeDirectives,
      decisions,
      profile,
      diagnostics: {
        totalSignalsProcessed,
        sensitiveSignalsBlocked,
        candidatesCreated,
        patternsReinforced,
        patternsPromoted,
        patternsDemoted,
        conflictsDetected,
        currentTurnOverrides,
      },
      currentTurnOverrideApplied,
    };
  }

  // ==========================================
  // SIGNAL EXTRACTION & GOVERNANCE COMPLIANCE
  // ==========================================

  private extractSignals(params: {
    message: string;
    context: ConversationContext;
    intent: StructuredIntent;
    reasoning?: ReasoningAnalysis;
    planning?: PlanningAnalysis;
    governanceAnalysis?: MemoryGovernanceAnalysis;
    history: ConversationTurn[];
    existingPatterns?: LearningPattern[];
    currentTime: number;
  }): LearningSignal[] {
    const {
      message,
      context,
      intent,
      reasoning,
      planning,
      governanceAnalysis,
      history,
      existingPatterns,
      currentTime,
    } = params;

    const signals: LearningSignal[] = [];
    const trimmed = (message || "").trim();
    const lower = trimmed.toLowerCase();

    // 1. Extract from Governance-Approved Memories ONLY (Downstream boundary)
    if (governanceAnalysis && Array.isArray(governanceAnalysis.allowedMemories)) {
      for (const gov of governanceAnalysis.allowedMemories) {
        if (gov.usageDecision === "ALLOW" && gov.status === "ACTIVE") {
          signals.push({
            id: `gov_${gov.memoryId}`,
            source: "GOVERNED_MEMORY",
            type: gov.type === "PREFERENCE" ? "PREFERENCE" : "WORKFLOW_PATTERN",
            signalKey: gov.key,
            signalValue: gov.value,
            confidence: Math.min(gov.confidence, 0.95),
            timestamp: currentTime,
            isExplicit: gov.source === "EXPLICIT_USER",
            domain: context?.activeTopic || undefined,
            context: context?.activeTopic || undefined,
          });
        }
      }
    }

    // 2. Extract Explicit Preference Declarations from Message
    const explicitPrefs = this.detectExplicitPreferences(trimmed, lower, currentTime);
    signals.push(...explicitPrefs);

    // 3. Extract User Corrections
    if (intent?.primaryIntent === "CORRECTION" || this.isCorrectionMessage(trimmed, lower)) {
      const correctionDetail = this.extractCorrectionDetail(trimmed, lower, currentTime);
      if (correctionDetail) {
        signals.push(correctionDetail);
      }
    }

    // 4. Extract Interaction Style Preferences
    const styleSignals = this.detectInteractionStyleSignals(trimmed, lower, currentTime);
    signals.push(...styleSignals);

    // 5. Extract Task Patterns from Repeated Workflows
    if (context?.currentTask || intent?.primaryIntent) {
      const taskSignal = this.detectTaskPatternSignal(context, intent, planning, currentTime);
      if (taskSignal) {
        signals.push(taskSignal);
      }
    }

    // 6. Extract Domain Interest from Recurring Queries
    const domainSignal = this.detectDomainInterestSignal(trimmed, lower, context, currentTime);
    if (domainSignal) {
      signals.push(domainSignal);
    }

    // 7. Detect Raw Sensitive Input to ensure explicit suppression tracking
    if (this.isSensitiveContent("input", trimmed)) {
      signals.push({
        id: this.generateSignalId("sensitive", "sensitive_credential", "[REDACTED_SENSITIVE_DATA]", currentTime),
        source: "EXPLICIT_USER_STATEMENT",
        type: "PREFERENCE",
        signalKey: "sensitive_credential",
        signalValue: "[REDACTED_SENSITIVE_DATA]",
        confidence: 1.0,
        timestamp: currentTime,
        isExplicit: true,
        isSensitive: true,
      });
    }

    // 8. Track recurring candidate entity query mentions
    if (existingPatterns && existingPatterns.length > 0) {
      for (const p of existingPatterns) {
        if (p.status === "CANDIDATE" || p.status === "CONFIRMED") {
          const valLower = (p.value || "").toLowerCase();
          if (valLower.length >= 3 && lower.includes(valLower)) {
            const alreadyExtracted = signals.some(
              (s) => s.signalKey === p.key || s.signalValue.toLowerCase() === valLower
            );
            if (!alreadyExtracted) {
              signals.push({
                id: this.generateSignalId("cand_obs", p.key, p.value, currentTime),
                source: (p.source as LearningSignalSource) || "DOMAIN_QUERY",
                type: p.patternType === "DOMAIN_INTEREST" ? "DOMAIN_INTEREST" : "PREFERENCE",
                signalKey: p.key,
                signalValue: p.value,
                confidence: 0.65,
                timestamp: currentTime,
                isExplicit: false,
                domain: p.category,
              });
            }
          }
        }
      }
    }

    return signals;
  }

  /**
   * Detects explicit user preferences in English, Bangla, and Banglish
   */
  private detectExplicitPreferences(
    message: string,
    lower: string,
    currentTime: number
  ): LearningSignal[] {
    const signals: LearningSignal[] = [];

    // Common descriptor suffixes to canonicalize core preference values
    const cleanValue = (raw: string): { value: string; category?: string } => {
      let val = raw.trim().replace(/\.$/, "");
      let category: string | undefined;

      // Keep compound names like "Dark Mode", "Light Mode", "OLED Display" intact
      if (!/^(?:dark|light)\s+mode/i.test(val)) {
        const descriptorMatch = val.match(/\b(laptops?|models?|phones?|cars?|editors?|ides?|browsers?|frameworks?)\b/i);
        if (descriptorMatch) {
          category = descriptorMatch[1].toLowerCase();
          val = val.replace(new RegExp(`\\b${descriptorMatch[1]}\\b`, "i"), "").trim();
        }
      }

      return { value: val || raw.trim(), category };
    };

    // English patterns: "I prefer X", "I like X", "My favorite X is Y", "I usually use X", "I usually choose X", "I always want X"
    const enPrefMatch =
      message.match(/\b(?:i\s+prefer|i\s+like|i\s+always\s+use|i\s+always\s+want|i\s+usually\s+choose|i\s+usually\s+use|my\s+favorite\s+(\w+)\s+is)\s+([a-zA-Z0-9_\-\s]+)/i);
    if (enPrefMatch) {
      const explicitCat = enPrefMatch[1] ? enPrefMatch[1].trim() : undefined;
      const rawVal = enPrefMatch[2] ? enPrefMatch[2].trim() : "";
      const { value, category } = cleanValue(rawVal);

      if (value && value.length > 1 && !this.isCommonFiller(value)) {
        const cat = explicitCat || category || "general";
        signals.push({
          id: this.generateSignalId("exp_en", `pref_${value}`, value, currentTime),
          source: "EXPLICIT_USER_STATEMENT",
          type: "PREFERENCE",
          signalKey: this.normalizeKey(`pref_${value}`),
          signalValue: value,
          confidence: 0.85,
          timestamp: currentTime,
          isExplicit: true,
          domain: cat,
        });
      }
    }

    // Bangla patterns: "আমার পছন্দ X", "আমি X পছন্দ করি", "আমার প্রিয় X হলো Y", "আমি X ব্যবহার করি", "সবসময় X দিও"
    const bnPrefMatch =
      message.match(/(?:আমার\s+পছন্দ|আমি\s+([\u0980-\u09FF\w\s]+)\s+পছন্দ\s+করি|আমার\s+প্রিয়\s+([\u0980-\u09FF\w]+)\s+(?:হলো|হল)\s+([\u0980-\u09FF\w\s]+)|সবসময়\s+([\u0980-\u09FF\w\s]+)\s+(?:দিও|করো|করুন))/);
    if (bnPrefMatch) {
      const rawVal = (bnPrefMatch[1] || bnPrefMatch[3] || bnPrefMatch[4] || message.replace(/.*আমার\s+পছন্দ\s+/, "")).trim();
      const { value, category } = cleanValue(rawVal);
      if (value && value.length > 1) {
        signals.push({
          id: this.generateSignalId("exp_bn", `pref_${value}`, value, currentTime),
          source: "EXPLICIT_USER_STATEMENT",
          type: "PREFERENCE",
          signalKey: this.normalizeKey(`pref_${value}`),
          signalValue: value,
          confidence: 0.85,
          timestamp: currentTime,
          isExplicit: true,
          domain: category || "general",
        });
      }
    }

    // Banglish patterns: "amar pochondo X", "ami X prefer kori", "ami shobshomoy X use kori"
    const banglishMatch =
      message.match(/\b(?:amar\s+pochondo|ami\s+([a-zA-Z0-9_\-\s]+)\s+prefer\s+kori|ami\s+([a-zA-Z0-9_\-\s]+)\s+use\s+kori|shobshomoy\s+([a-zA-Z0-9_\-\s]+)\s+dio)\b/i);
    if (banglishMatch) {
      const rawVal = (banglishMatch[1] || banglishMatch[2] || banglishMatch[3] || message.replace(/.*amar\s+pochondo\s+/i, "")).trim();
      const { value, category } = cleanValue(rawVal);
      if (value && value.length > 1 && !this.isCommonFiller(value)) {
        signals.push({
          id: this.generateSignalId("exp_bng", `pref_${value}`, value, currentTime),
          source: "EXPLICIT_USER_STATEMENT",
          type: "PREFERENCE",
          signalKey: this.normalizeKey(`pref_${value}`),
          signalValue: value,
          confidence: 0.85,
          timestamp: currentTime,
          isExplicit: true,
          domain: category || "general",
        });
      }
    }

    return signals;
  }

  /**
   * Detects correction statements and extracts correction learning signals
   */
  private isCorrectionMessage(message: string, lower: string): boolean {
    return (
      lower.startsWith("no,") ||
      lower.startsWith("no ") ||
      lower.startsWith("actually,") ||
      lower.startsWith("actually ") ||
      lower.includes("not that,") ||
      lower.includes("instead of") ||
      lower.includes("i meant") ||
      lower.includes("i mean") ||
      lower.includes("na,") ||
      lower.includes("na ") ||
      lower.includes("bhul hoyeche") ||
      lower.includes("change to")
    );
  }

  private extractCorrectionDetail(
    message: string,
    lower: string,
    currentTime: number
  ): LearningSignal | undefined {
    // English correction: "No, actually I prefer ASUS" or "Change to dark mode"
    const corrMatch =
      message.match(/(?:no,?\s+actually\s+(?:i\s+prefer\s+|i\s+want\s+)?|i\s+meant\s+|instead\s+of\s+\w+,?\s+(?:use\s+|prefer\s+)?|change\s+to\s+)([a-zA-Z0-9_\-\s]+)/i);
    if (corrMatch && corrMatch[1]) {
      const correctedVal = corrMatch[1].trim().replace(/\.$/, "");
      if (correctedVal && !this.isCommonFiller(correctedVal)) {
        return {
          id: this.generateSignalId("corr", `pref_${correctedVal}`, correctedVal, currentTime),
          source: "USER_CORRECTION",
          type: "CORRECTION",
          signalKey: this.normalizeKey(`pref_${correctedVal}`),
          signalValue: correctedVal,
          confidence: 0.95,
          timestamp: currentTime,
          isExplicit: true,
        };
      }
    }

    // Bangla correction: "না, আসলে আমি ASUS পছন্দ করি"
    const bnCorrMatch = message.match(/(?:না,?\s+আসলে\s+(?:আমি\s+)?([\u0980-\u09FF\w\s]+)\s+পছন্দ\s+করি|পরিবর্তন\s+করে\s+([\u0980-\u09FF\w\s]+)\s+করুন)/);
    if (bnCorrMatch) {
      const val = (bnCorrMatch[1] || bnCorrMatch[2]).trim();
      if (val) {
        return {
          id: this.generateSignalId("corr_bn", `pref_${val}`, val, currentTime),
          source: "USER_CORRECTION",
          type: "CORRECTION",
          signalKey: this.normalizeKey(`pref_${val}`),
          signalValue: val,
          confidence: 0.95,
          timestamp: currentTime,
          isExplicit: true,
        };
      }
    }

    return undefined;
  }

  /**
   * Detects interaction style preferences (verbosity, language, guidance style)
   */
  private detectInteractionStyleSignals(
    message: string,
    lower: string,
    currentTime: number
  ): LearningSignal[] {
    const signals: LearningSignal[] = [];

    // Verbosity: Concise vs Detailed
    if (
      lower.includes("be concise") ||
      lower.includes("keep it brief") ||
      lower.includes("short answer") ||
      lower.includes("short summary") ||
      lower.includes("kom kothay") ||
      lower.includes("choto kore") ||
      /\bconcise\b/i.test(lower)
    ) {
      signals.push({
        id: `style_verb_${currentTime}`,
        source: "INTERACTION_STYLE",
        type: "INTERACTION_STYLE",
        signalKey: "style_verbosity",
        signalValue: "concise",
        confidence: 0.85,
        timestamp: currentTime,
        isExplicit: true,
      });
    } else if (
      lower.includes("in detail") ||
      lower.includes("detailed") ||
      lower.includes("in-depth") ||
      lower.includes("step by step") ||
      lower.includes("bistarito") ||
      lower.includes("boro kore")
    ) {
      signals.push({
        id: `style_verb_${currentTime}`,
        source: "INTERACTION_STYLE",
        type: "INTERACTION_STYLE",
        signalKey: "style_verbosity",
        signalValue: "detailed",
        confidence: 0.85,
        timestamp: currentTime,
        isExplicit: true,
      });
    }

    // Language preference: Bangla / Banglish / English
    if (
      lower.includes("respond in bangla") ||
      lower.includes("banglay bolo") ||
      lower.includes("bangla te bolen") ||
      message.includes("বাংলায় বলো") ||
      message.includes("বাংলায় বলো") ||
      message.includes("বাংলায়") ||
      message.includes("বাংলায়")
    ) {
      signals.push({
        id: `style_lang_${currentTime}`,
        source: "INTERACTION_STYLE",
        type: "INTERACTION_STYLE",
        signalKey: "style_language",
        signalValue: "bn",
        confidence: 0.90,
        timestamp: currentTime,
        isExplicit: true,
      });
    } else if (
      lower.includes("respond in banglish") ||
      lower.includes("banglish e bolo") ||
      lower.includes("banglish e lekho") ||
      lower.includes("banglish e")
    ) {
      signals.push({
        id: `style_lang_${currentTime}`,
        source: "INTERACTION_STYLE",
        type: "INTERACTION_STYLE",
        signalKey: "style_language",
        signalValue: "banglish",
        confidence: 0.90,
        timestamp: currentTime,
        isExplicit: true,
      });
    } else if (
      lower.includes("respond in english") ||
      lower.includes("in english please") ||
      lower.includes("english please") ||
      lower.includes("in english")
    ) {
      signals.push({
        id: `style_lang_${currentTime}`,
        source: "INTERACTION_STYLE",
        type: "INTERACTION_STYLE",
        signalKey: "style_language",
        signalValue: "en",
        confidence: 0.90,
        timestamp: currentTime,
        isExplicit: true,
      });
    }

    // Code density: Code-heavy vs Explanation
    if (
      lower.includes("just give me the code") ||
      lower.includes("code only") ||
      lower.includes("no explanation, just code")
    ) {
      signals.push({
        id: `style_code_${currentTime}`,
        source: "INTERACTION_STYLE",
        type: "INTERACTION_STYLE",
        signalKey: "style_code_density",
        signalValue: "high",
        confidence: 0.85,
        timestamp: currentTime,
        isExplicit: true,
      });
    }

    return signals;
  }

  /**
   * Detects recurring task patterns
   */
  private detectTaskPatternSignal(
    context: ConversationContext,
    intent: StructuredIntent,
    planning?: PlanningAnalysis,
    currentTime: number = 0
  ): LearningSignal | undefined {
    const task = context?.currentTask;
    if (task && task !== "general_chat" && task !== "greeting" && task !== "chat") {
      return {
        id: `task_${currentTime}_${this.normalizeKey(task)}`,
        source: "TASK_COMPLETION",
        type: "WORKFLOW_PATTERN",
        signalKey: `task_workflow_${this.normalizeKey(task)}`,
        signalValue: task,
        confidence: 0.65,
        timestamp: currentTime,
        isExplicit: false,
      };
    }

    const intentWorkflow = intent?.primaryIntent;
    const meaningfulWorkflows: BrainIntent[] = [
      "DEBUGGING",
      "TROUBLESHOOTING",
      "PLANNING",
      "CALCULATION",
      "SUMMARIZATION",
      "TRANSLATION",
    ];

    if (intentWorkflow && meaningfulWorkflows.includes(intentWorkflow)) {
      return {
        id: `task_${currentTime}_${intentWorkflow}`,
        source: "TASK_COMPLETION",
        type: "WORKFLOW_PATTERN",
        signalKey: `task_workflow_${this.normalizeKey(intentWorkflow)}`,
        signalValue: intentWorkflow,
        confidence: 0.65,
        timestamp: currentTime,
        isExplicit: false,
      };
    }

    return undefined;
  }

  /**
   * Detects domain interests from topics
   */
  private detectDomainInterestSignal(
    message: string,
    lower: string,
    context: ConversationContext,
    currentTime: number
  ): LearningSignal | undefined {
    const domainKeywords: Record<string, string[]> = {
      ai_development: ["ai", "llm", "neural network", "deep learning", "machine learning", "gemini", "prompt"],
      hardware_laptops: ["laptop", "laptops", "processor", "gpu", "ram", "oled", "thinkpad", "macbook", "zenbook"],
      software_engineering: ["typescript", "javascript", "rust", "golang", "react", "docker", "kubernetes", "git"],
      editor_tooling: ["neovim", "vim", "vscode", "emacs", "tmux", "terminal", "zsh"],
      food_beverage: ["tea", "green tea", "black tea", "coffee", "espresso", "latte", "matcha"],
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      const match = keywords.find((k) => lower.includes(k));
      if (match) {
        return {
          id: `domain_${currentTime}_${domain}`,
          source: "DOMAIN_QUERY",
          type: "DOMAIN_INTEREST",
          signalKey: `domain_${domain}`,
          signalValue: domain.replace(/_/g, " "),
          confidence: 0.60,
          timestamp: currentTime,
          isExplicit: false,
          domain,
        };
      }
    }

    return undefined;
  }

  // ==========================================
  // PATTERN REINFORCEMENT & DEDUPLICATION
  // ==========================================

  private createPattern(
    userId: string,
    signal: LearningSignal,
    currentTime: number
  ): LearningPattern {
    const patternType: PatternType =
      signal.type === "PREFERENCE"
        ? "USER_PREFERENCE"
        : signal.type === "INTERACTION_STYLE"
        ? "INTERACTION_STYLE"
        : signal.type === "WORKFLOW_PATTERN"
        ? "TASK_WORKFLOW"
        : signal.type === "DOMAIN_INTEREST"
        ? "DOMAIN_INTEREST"
        : "USER_PREFERENCE";

    const isExplicit = !!signal.isExplicit;
    const initialStatus: PatternStatus = isExplicit ? "CONFIRMED" : "CANDIDATE";
    const initialConfidence = isExplicit
      ? Math.max(0.85, Math.min(this.MAX_CONFIDENCE, signal.confidence || 0.85))
      : Math.min(
          0.65,
          Math.max(this.MIN_CONFIDENCE, signal.confidence || this.CANDIDATE_INITIAL_CONFIDENCE)
        );

    const patternId = this.generatePatternId(userId, patternType, signal.signalKey, signal.signalValue);
    const evidenceId = this.generateEvidenceId(signal.source, signal.signalKey, signal.signalValue, currentTime);

    const evidence: LearningEvidence = {
      evidenceId,
      signalType: signal.type,
      timestamp: currentTime,
      valueHash: this.hashValue(signal.signalKey, signal.signalValue),
      source: signal.source,
      isExplicit,
    };

    return {
      id: patternId,
      userId,
      patternType,
      category: signal.domain || "general",
      key: signal.signalKey,
      value: signal.signalValue,
      status: initialStatus,
      confidence: initialConfidence,
      reinforcementCount: 1,
      independentEvidenceCount: 1,
      firstObservedAt: currentTime,
      lastObservedAt: currentTime,
      evidence: [evidence],
      source: signal.source,
      isExplicit,
    };
  }

  private reinforcePattern(
    pattern: LearningPattern,
    signal: LearningSignal,
    currentTime: number
  ): {
    pattern: LearningPattern;
    isReinforced: boolean;
    isPromoted: boolean;
    actions: LearningAction[];
  } {
    const actions: LearningAction[] = [];
    const valHash = this.hashValue(signal.signalKey, signal.signalValue);
    const evidenceId = this.generateEvidenceId(signal.source, signal.signalKey, signal.signalValue, currentTime);

    // Check for duplicate evidence in the exact same turn or with identical evidence ID / timestamp
    const isDuplicateEvidence = pattern.evidence.some(
      (e) =>
        (e.evidenceId === evidenceId) ||
        (e.valueHash === valHash && Math.abs(e.timestamp - currentTime) < 1000)
    );

    if (isDuplicateEvidence) {
      // Idempotency: Duplicate identical evidence in same turn does NOT reinforce or inflate confidence
      actions.push({
        actionType: "NO_CHANGE",
        patternId: pattern.id,
        reason: "DUPLICATE_EVIDENCE_SUPPRESSED",
        patternKey: pattern.key,
        patternValue: pattern.value,
      });
      return { pattern, isReinforced: false, isPromoted: false, actions };
    }

    // New independent evidence
    const newEvidence: LearningEvidence = {
      evidenceId,
      signalType: signal.type,
      timestamp: currentTime,
      valueHash: valHash,
      source: signal.source,
      isExplicit: signal.isExplicit,
    };

    const newEvidenceCount = pattern.independentEvidenceCount + 1;
    const newReinforceCount = pattern.reinforcementCount + 1;

    // Bounded reinforcement calculation: 1 - (1 - c0) * 0.85
    const boostedConfidence = Math.min(
      this.MAX_CONFIDENCE,
      pattern.confidence + (1 - pattern.confidence) * 0.25
    );

    const updatedPattern: LearningPattern = {
      ...pattern,
      confidence: boostedConfidence,
      reinforcementCount: newReinforceCount,
      independentEvidenceCount: newEvidenceCount,
      lastObservedAt: currentTime,
      evidence: [...pattern.evidence, newEvidence],
      isExplicit: pattern.isExplicit || signal.isExplicit,
    };

    actions.push({
      actionType: "REINFORCE",
      patternId: pattern.id,
      reason: "INDEPENDENT_EVIDENCE_REINFORCEMENT",
      patternKey: pattern.key,
      patternValue: pattern.value,
    });

    let isPromoted = false;
    // Check Promotion Threshold
    const isExplicitPromotion =
      updatedPattern.isExplicit &&
      updatedPattern.independentEvidenceCount >= this.EXPLICIT_PROMOTION_EVIDENCE_THRESHOLD &&
      updatedPattern.confidence >= this.PROMOTION_CONFIDENCE_THRESHOLD;

    const isGeneralPromotion =
      updatedPattern.independentEvidenceCount >= this.PROMOTION_INDEPENDENT_EVIDENCE_THRESHOLD &&
      updatedPattern.confidence >= this.PROMOTION_CONFIDENCE_THRESHOLD;

    if (
      updatedPattern.status === "CANDIDATE" &&
      (isExplicitPromotion || isGeneralPromotion)
    ) {
      updatedPattern.status = "CONFIRMED";
      isPromoted = true;
      actions.push({
        actionType: "PROMOTE_PATTERN",
        patternId: updatedPattern.id,
        reason: isExplicitPromotion ? "EXPLICIT_EVIDENCE_PROMOTION" : "REPEATED_INDEPENDENT_EVIDENCE_PROMOTION",
        previousStatus: "CANDIDATE",
        newStatus: "CONFIRMED",
        patternKey: updatedPattern.key,
        patternValue: updatedPattern.value,
      });
    }

    return {
      pattern: updatedPattern,
      isReinforced: true,
      isPromoted,
      actions,
    };
  }

  // ==========================================
  // USER CORRECTION & CONFLICT RESOLUTION
  // ==========================================

  private processCorrection(
    correction: LearningSignal,
    patterns: LearningPattern[],
    currentTime: number
  ): {
    updatedPatterns: LearningPattern[];
    actions: LearningAction[];
    conflictsCount: number;
  } {
    const actions: LearningAction[] = [];
    let conflictsCount = 0;
    const updated: LearningPattern[] = [];

    // Identify and supersede outdated conflicting patterns
    for (const p of patterns) {
      if (
        (p.status === "CONFIRMED" || p.status === "CANDIDATE") &&
        this.areKeysOrCategoriesConflicting(p.key, correction.signalKey)
      ) {
        conflictsCount++;
        const newPatternId = this.generatePatternId(
          p.userId,
          p.patternType,
          correction.signalKey,
          correction.signalValue
        );

        const superseded: LearningPattern = {
          ...p,
          status: "OUTDATED",
          supersededBy: newPatternId,
          lastObservedAt: currentTime,
        };
        updated.push(superseded);

        actions.push({
          actionType: "DEMOTE_PATTERN",
          patternId: p.id,
          reason: "SUPERSEDED_BY_EXPLICIT_CORRECTION",
          previousStatus: p.status,
          newStatus: "OUTDATED",
          patternKey: p.key,
          patternValue: p.value,
        });

        // Add the new corrected pattern with direct lineage
        const newPattern: LearningPattern = {
          id: newPatternId,
          userId: p.userId,
          patternType: p.patternType,
          category: p.category,
          key: correction.signalKey,
          value: correction.signalValue,
          status: "CONFIRMED",
          confidence: 0.95,
          reinforcementCount: 1,
          independentEvidenceCount: 1,
          firstObservedAt: currentTime,
          lastObservedAt: currentTime,
          evidence: [
            {
              evidenceId: this.generateEvidenceId(
                "USER_CORRECTION",
                correction.signalKey,
                correction.signalValue,
                currentTime
              ),
              signalType: "CORRECTION",
              timestamp: currentTime,
              valueHash: this.hashValue(correction.signalKey, correction.signalValue),
              source: "USER_CORRECTION",
              isExplicit: true,
            },
          ],
          supersedes: p.id,
          source: "USER_CORRECTION",
          isExplicit: true,
        };
        updated.push(newPattern);

        actions.push({
          actionType: "CREATE_CANDIDATE",
          patternId: newPattern.id,
          reason: "CREATED_FROM_EXPLICIT_CORRECTION",
          newStatus: "CONFIRMED",
          patternKey: newPattern.key,
          patternValue: newPattern.value,
        });
      } else {
        updated.push(p);
      }
    }

    return { updatedPatterns: updated, actions, conflictsCount };
  }

  private overridePatternWithExplicit(
    existing: LearningPattern,
    signal: LearningSignal,
    userId: string,
    currentTime: number
  ): {
    updatedExisting: LearningPattern;
    newPattern?: LearningPattern;
    actions: LearningAction[];
  } {
    const actions: LearningAction[] = [];
    const newId = this.generatePatternId(
      userId,
      existing.patternType,
      signal.signalKey,
      signal.signalValue
    );

    const updatedExisting: LearningPattern = {
      ...existing,
      status: "OUTDATED",
      supersededBy: newId,
      lastObservedAt: currentTime,
    };

    actions.push({
      actionType: "DEMOTE_PATTERN",
      patternId: existing.id,
      reason: "SUPERSEDED_BY_EXPLICIT_UPDATE",
      previousStatus: existing.status,
      newStatus: "OUTDATED",
      patternKey: existing.key,
      patternValue: existing.value,
    });

    const newPattern: LearningPattern = {
      id: newId,
      userId,
      patternType: existing.patternType,
      category: existing.category,
      key: signal.signalKey,
      value: signal.signalValue,
      status: "CONFIRMED",
      confidence: 0.90,
      reinforcementCount: 1,
      independentEvidenceCount: 1,
      firstObservedAt: currentTime,
      lastObservedAt: currentTime,
      evidence: [
        {
          evidenceId: this.generateEvidenceId(
            signal.source,
            signal.signalKey,
            signal.signalValue,
            currentTime
          ),
          signalType: signal.type,
          timestamp: currentTime,
          valueHash: this.hashValue(signal.signalKey, signal.signalValue),
          source: signal.source,
          isExplicit: true,
        },
      ],
      supersedes: existing.id,
      source: signal.source,
      isExplicit: true,
    };

    actions.push({
      actionType: "CREATE_CANDIDATE",
      patternId: newPattern.id,
      reason: "CREATED_FROM_EXPLICIT_UPDATE",
      newStatus: "CONFIRMED",
      patternKey: newPattern.key,
      patternValue: newPattern.value,
    });

    return { updatedExisting, newPattern, actions };
  }

  // ==========================================
  // TEMPORAL DECAY
  // ==========================================

  private applyTemporalDecay(
    patterns: LearningPattern[],
    currentTime: number
  ): {
    patterns: LearningPattern[];
    demotedCount: number;
    actions: LearningAction[];
  } {
    const actions: LearningAction[] = [];
    let demotedCount = 0;

    const updated = patterns.map((p) => {
      if (p.status === "SUPPRESSED" || p.status === "OUTDATED") {
        return p;
      }

      const elapsed = currentTime - p.lastObservedAt;
      if (elapsed > this.STALE_DECAY_MILLIS) {
        // Calculate decay factor based on days elapsed past threshold
        const daysPast = Math.floor((elapsed - this.STALE_DECAY_MILLIS) / (24 * 60 * 60 * 1000));
        const decayAmount = Math.min(0.5, daysPast * 0.02);
        const decayedConfidence = Math.max(0.0, p.confidence - decayAmount);

        if (decayedConfidence < this.OUTDATED_CONFIDENCE_THRESHOLD) {
          demotedCount++;
          actions.push({
            actionType: "DEMOTE_PATTERN",
            patternId: p.id,
            reason: "TEMPORAL_DECAY_EXPIRED",
            previousStatus: p.status,
            newStatus: "OUTDATED",
            patternKey: p.key,
            patternValue: p.value,
          });
          return {
            ...p,
            confidence: decayedConfidence,
            status: "OUTDATED" as PatternStatus,
            isDecayed: true,
          };
        }

        return {
          ...p,
          confidence: decayedConfidence,
          isDecayed: true,
        };
      }

      return p;
    });

    return { patterns: updated, demotedCount, actions };
  }

  // ==========================================
  // CURRENT-TURN OVERRIDES & DIRECTIVE SANITIZATION
  // ==========================================

  private detectCurrentTurnStyleInstruction(lowerMessage: string): {
    verbosity?: "concise" | "detailed";
    language?: "bn" | "banglish" | "en";
    codeDensity?: "high" | "minimal";
  } {
    const res: {
      verbosity?: "concise" | "detailed";
      language?: "bn" | "banglish" | "en";
      codeDensity?: "high" | "minimal";
    } = {};

    if (
      lowerMessage.includes("in detail") ||
      lowerMessage.includes("detailed") ||
      lowerMessage.includes("in-depth") ||
      lowerMessage.includes("step by step") ||
      lowerMessage.includes("bistarito") ||
      lowerMessage.includes("boro kore")
    ) {
      res.verbosity = "detailed";
    } else if (
      lowerMessage.includes("be concise") ||
      lowerMessage.includes("keep it brief") ||
      lowerMessage.includes("short answer") ||
      lowerMessage.includes("kom kothay") ||
      lowerMessage.includes("choto kore") ||
      /\bconcise\b/i.test(lowerMessage)
    ) {
      res.verbosity = "concise";
    }

    if (
      lowerMessage.includes("respond in bangla") ||
      lowerMessage.includes("banglay bolo") ||
      lowerMessage.includes("বাংলায় বলো") ||
      lowerMessage.includes("বাংলায় বলো")
    ) {
      res.language = "bn";
    } else if (
      lowerMessage.includes("respond in english") ||
      lowerMessage.includes("english please") ||
      lowerMessage.includes("in english")
    ) {
      res.language = "en";
    } else if (
      lowerMessage.includes("respond in banglish") ||
      lowerMessage.includes("banglish e bolo")
    ) {
      res.language = "banglish";
    }

    if (
      lowerMessage.includes("code only") ||
      lowerMessage.includes("just code")
    ) {
      res.codeDensity = "high";
    }

    return res;
  }

  private isCurrentTurnOverridden(
    pattern: LearningPattern,
    lowerMessage: string,
    currentStyle: {
      verbosity?: "concise" | "detailed";
      language?: "bn" | "banglish" | "en";
      codeDensity?: "high" | "minimal";
    }
  ): boolean {
    // 1. Style overrides
    if (pattern.key === "style_verbosity") {
      if (pattern.value === "concise" && currentStyle.verbosity === "detailed") {
        return true;
      }
      if (pattern.value === "detailed" && currentStyle.verbosity === "concise") {
        return true;
      }
    }

    if (pattern.key === "style_language") {
      if (currentStyle.language && currentStyle.language !== pattern.value) {
        return true;
      }
    }

    if (pattern.key === "style_code_density") {
      if (pattern.value === "high" && (lowerMessage.includes("explain") || lowerMessage.includes("step by step"))) {
        return true;
      }
    }

    const valLower = (pattern.value || "").toLowerCase();

    // 2. Direct negation of preference in current message
    if (valLower.length > 0) {
      if (
        lowerMessage.includes(`not ${valLower}`) ||
        lowerMessage.includes(`without ${valLower}`) ||
        lowerMessage.includes(`instead of ${valLower}`) ||
        lowerMessage.includes(`no ${valLower}`) ||
        lowerMessage.includes(`exclude ${valLower}`)
      ) {
        return true;
      }

      // 3. Competing alternative entity explicitly requested in current message
      const brandTokens = ["asus", "lenovo", "dell", "hp", "apple", "macbook", "thinkpad", "acer", "samsung", "sony"];
      if (brandTokens.includes(valLower)) {
        const competingBrand = brandTokens.find(
          (b) => b !== valLower && (
            lowerMessage.includes(`choose ${b}`) ||
            lowerMessage.includes(`pick ${b}`) ||
            lowerMessage.includes(`recommend ${b}`) ||
            lowerMessage.includes(`buy ${b}`) ||
            lowerMessage.includes(`use ${b}`) ||
            lowerMessage.includes(`for this one ${b}`) ||
            lowerMessage.includes(`this time ${b}`) ||
            lowerMessage.includes(`show ${b}`)
          )
        );
        if (competingBrand) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Generates sanitized, non-leaking prompt directives for BrainEngine
   */
  public generateSanitizedDirective(pattern: LearningPattern): string | undefined {
    if (pattern.status === "OUTDATED" || pattern.status === "SUPPRESSED") {
      return undefined;
    }

    // Never leak internal ID, weights, or hash codes!
    if (pattern.patternType === "INTERACTION_STYLE") {
      if (pattern.key === "style_verbosity") {
        return pattern.value === "concise"
          ? "USER PREFERENCE: User tends to prefer concise technical responses."
          : "USER PREFERENCE: User tends to prefer detailed step-by-step explanations.";
      }
      if (pattern.key === "style_language") {
        if (pattern.value === "bn") {
          return "LANGUAGE PREFERENCE: User prefers responses in Bangla.";
        }
        if (pattern.value === "banglish") {
          return "LANGUAGE PREFERENCE: User prefers responses in Banglish (Bangla in Latin script).";
        }
        if (pattern.value === "en") {
          return "LANGUAGE PREFERENCE: User prefers responses in English.";
        }
      }
      if (pattern.key === "style_code_density" && pattern.value === "high") {
        return "FORMAT PREFERENCE: User prefers direct code-focused responses.";
      }
    }

    if (pattern.patternType === "USER_PREFERENCE") {
      if (pattern.status === "CONFIRMED") {
        return `USER PREFERENCE: User confirmed preference for ${pattern.value}.`;
      } else {
        return `PERSONALIZATION: Consider user's preference for ${pattern.value} if relevant.`;
      }
    }

    if (pattern.patternType === "TASK_WORKFLOW") {
      return `WORKFLOW CONTEXT: Recurring workflow pattern observed: ${pattern.value}.`;
    }

    if (pattern.patternType === "DOMAIN_INTEREST") {
      // CAUTIOUS: No hallucinated ownership or biography!
      return `DOMAIN INTEREST: User has recurring interest in ${pattern.value}.`;
    }

    return undefined;
  }

  // ==========================================
  // PROFILE SYNTHESIS & HELPERS
  // ==========================================

  private buildUserProfile(
    userId: string,
    patterns: LearningPattern[],
    currentTime: number
  ): UserBehaviorProfile {
    const activePatterns = patterns.filter(
      (p) => p.status !== "SUPPRESSED" && p.status !== "OUTDATED"
    );

    const confirmedPreferences = activePatterns.filter(
      (p) => p.patternType === "USER_PREFERENCE" && p.status === "CONFIRMED"
    );
    const candidatePreferences = activePatterns.filter(
      (p) => p.patternType === "USER_PREFERENCE" && p.status === "CANDIDATE"
    );

    const interactionPreferences: InteractionPreference[] = [];
    const taskPatterns: TaskPattern[] = [];
    const domainInterests: DomainInterest[] = [];

    let languagePreference: "en" | "bn" | "banglish" | "mixed" | undefined;
    let responseVerbosity: "concise" | "detailed" | "balanced" | undefined;
    let codeDensity: "high" | "moderate" | "minimal" | undefined;

    for (const p of activePatterns) {
      if (p.patternType === "INTERACTION_STYLE") {
        if (p.key === "style_language") {
          languagePreference = p.value as any;
          interactionPreferences.push({
            category: "language",
            preference: p.value,
            confidence: p.confidence,
            status: p.status,
            evidenceCount: p.independentEvidenceCount,
            lastObservedAt: p.lastObservedAt,
          });
        } else if (p.key === "style_verbosity") {
          responseVerbosity = p.value as any;
          interactionPreferences.push({
            category: "verbosity",
            preference: p.value,
            confidence: p.confidence,
            status: p.status,
            evidenceCount: p.independentEvidenceCount,
            lastObservedAt: p.lastObservedAt,
          });
        } else if (p.key === "style_code_density") {
          codeDensity = p.value as any;
          interactionPreferences.push({
            category: "code_density",
            preference: p.value,
            confidence: p.confidence,
            status: p.status,
            evidenceCount: p.independentEvidenceCount,
            lastObservedAt: p.lastObservedAt,
          });
        }
      } else if (p.patternType === "TASK_WORKFLOW") {
        taskPatterns.push({
          workflowType: p.key,
          description: p.value,
          frequency: p.reinforcementCount,
          confidence: p.confidence,
          status: p.status,
          lastObservedAt: p.lastObservedAt,
        });
      } else if (p.patternType === "DOMAIN_INTEREST") {
        domainInterests.push({
          domain: p.category || "tech",
          topic: p.value,
          confidence: p.confidence,
          status: p.status,
          mentionCount: p.reinforcementCount,
          lastObservedAt: p.lastObservedAt,
        });
      }
    }

    const prefProfile: UserPreferenceProfile = {
      languagePreference,
      responseVerbosity,
      codeDensity,
      confirmedPreferences,
      candidatePreferences,
    };

    return {
      userId,
      interactionPreferences,
      taskPatterns,
      domainInterests,
      preferences: prefProfile,
      lastUpdatedAt: currentTime,
    };
  }

  private findMatchingPatternIndex(
    patterns: LearningPattern[],
    signal: LearningSignal
  ): number {
    return patterns.findIndex((p) => {
      if (p.status === "SUPPRESSED" || p.status === "OUTDATED") {
        return false;
      }
      if (p.key === signal.signalKey) return true;
      if (
        p.key.startsWith("pref_") &&
        signal.signalKey.startsWith("pref_") &&
        this.normalizeKey(p.value) === this.normalizeKey(signal.signalValue)
      ) {
        return true;
      }
      // Check related dimension/category match (e.g. UI theme vs dark/light mode)
      if (this.areKeysOrCategoriesRelated(p.key, signal.signalKey, p.category, signal.domain)) {
        return true;
      }
      return false;
    });
  }

  private isConflictingValue(pattern: LearningPattern, signal: LearningSignal): boolean {
    if (this.normalizeKey(pattern.value) === this.normalizeKey(signal.signalValue)) {
      return false;
    }
    if (pattern.key === signal.signalKey) {
      return true;
    }
    if (this.areKeysOrCategoriesRelated(pattern.key, signal.signalKey, pattern.category, signal.domain)) {
      return true;
    }
    return false;
  }

  private areKeysOrCategoriesRelated(
    key1: string,
    key2: string,
    cat1?: string,
    cat2?: string
  ): boolean {
    const k1 = this.normalizeKey(key1);
    const k2 = this.normalizeKey(key2);
    if (k1 === k2) return true;

    // UI Theme / Mode
    const isTheme1 = k1.includes("theme") || k1.includes("mode") || cat1 === "ui_theme" || cat1 === "theme";
    const isTheme2 = k2.includes("theme") || k2.includes("mode") || cat2 === "ui_theme" || cat2 === "theme";
    if (isTheme1 && isTheme2) return true;

    // Interaction style
    if (k1.startsWith("style_") && k2.startsWith("style_")) {
      return k1.split("_")[1] === k2.split("_")[1];
    }

    // Matching domain category
    if (cat1 && cat2 && cat1 !== "general" && cat1 === cat2) {
      return true;
    }

    // Semantic category groupings for common preferences (brands, colors, editors, languages)
    const brandTokens = ["asus", "lenovo", "dell", "hp", "apple", "macbook", "thinkpad", "acer", "samsung", "sony"];
    const colorTokens = ["red", "blue", "green", "yellow", "black", "white", "purple", "orange", "pink", "cyan"];
    const editorTokens = ["neovim", "vim", "vscode", "emacs", "sublime", "intellij", "eclipse"];
    const langTokens = ["typescript", "javascript", "python", "rust", "golang", "java", "csharp", "cpp"];

    const isGroupMatch = (group: string[]) => {
      const g1 = group.some((t) => k1.includes(t));
      const g2 = group.some((t) => k2.includes(t));
      return g1 && g2;
    };

    if (
      isGroupMatch(brandTokens) ||
      isGroupMatch(colorTokens) ||
      isGroupMatch(editorTokens) ||
      isGroupMatch(langTokens)
    ) {
      return true;
    }

    // If both are general preferences and one has a specific category that matches context
    if (k1.startsWith("pref_") && k2.startsWith("pref_")) {
      if ((cat1 && cat1 !== "general") && (!cat2 || cat2 === "general")) {
        // e.g. previous was cat "laptops", new correction is brand
        if (cat1 === "laptops" && brandTokens.some((t) => k2.includes(t))) return true;
        if (cat1 === "colors" && colorTokens.some((t) => k2.includes(t))) return true;
      }
    }

    return false;
  }

  private areKeysOrCategoriesConflicting(key1: string, key2: string): boolean {
    return this.areKeysOrCategoriesRelated(key1, key2);
  }

  private normalizeKey(key: string): string {
    return (key || "")
      .toLowerCase()
      .trim()
      .replace(/[\s\-_]+/g, "_");
  }

  private generateSignalId(source: string, key: string, value: string, timestamp: number): string {
    const hash = this.hashValue(key, value);
    return `sig_${this.normalizeKey(source)}_${hash}_${timestamp}`;
  }

  private generatePatternId(userId: string, patternType: string, key: string, value: string): string {
    const hash = this.hashValue(key, value);
    return `pat_${this.normalizeKey(userId)}_${this.normalizeKey(patternType)}_${hash}`;
  }

  private generateEvidenceId(source: string, key: string, value: string, timestamp: number): string {
    const hash = this.hashValue(key, value);
    return `ev_${this.normalizeKey(source)}_${hash}_${timestamp}`;
  }

  private hashValue(key: string, value: string): string {
    const combined = `${this.normalizeKey(key)}:${this.normalizeKey(value)}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash << 5) - hash + combined.charCodeAt(i);
      hash |= 0;
    }
    return `h_${Math.abs(hash).toString(16)}`;
  }

  private isCommonFiller(val: string): boolean {
    const fillers = [
      "this",
      "that",
      "it",
      "something",
      "everything",
      "nothing",
      "anything",
      "one",
      "eta",
      "oita",
      "sheta",
      "kisu",
    ];
    return fillers.includes(val.toLowerCase().trim());
  }

  private isSensitiveContent(key: string, value: string): boolean {
    const combined = `${key} ${value}`.toLowerCase().replace(/[_\-]/g, " ");
    return (
      combined.includes("password") ||
      combined.includes("passwd") ||
      combined.includes("pin number") ||
      combined.includes("pin code") ||
      /\bpin\b/i.test(combined) ||
      combined.includes("api key") ||
      combined.includes("apikey") ||
      combined.includes("secret key") ||
      combined.includes("bearer token") ||
      combined.includes("auth token") ||
      combined.includes("access token") ||
      combined.includes("refresh token") ||
      combined.includes("credit card") ||
      combined.includes("cvv") ||
      combined.includes("cvc") ||
      combined.includes("ssn") ||
      combined.includes("social security")
    );
  }
}

export const adaptiveLearningEngine = AdaptiveLearningEngine.getInstance();
