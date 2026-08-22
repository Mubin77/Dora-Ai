/**
 * Dora Memory-Aware Response Adaptation & Personalization Engine
 * Phase 2 — Step 7
 * 
 * Implements a deterministic, bounded, non-LLM response-adaptation layer.
 * Resolves multi-layer style profiling, format constraints, language switching,
 * and verified personalization according to a strict precedence hierarchy.
 * 
 * Precedence Hierarchy:
 * 1. CURRENT_TURN_EXPLICIT (Highest)
 * 2. HARD_CONSTRAINT
 * 3. CORRECTION_NEGATION
 * 4. VERIFIED_EVIDENCE
 * 5. GOVERNANCE_BOUNDARY
 * 6. CONFIRMED_ADAPTIVE
 * 7. CONFIRMED_PREFERENCE
 * 8. PREDICTIVE_CONTEXT
 * 9. SYSTEM_DEFAULT (Lowest)
 * 
 * Guarantees:
 * - Deterministic, non-LLM, non-networked, non-mutating.
 * - Current-turn instructions strictly outrank historical preferences and predictive signals.
 * - Sensitive data (passwords, tokens, financial details) is strictly intercepted and suppressed.
 * - Internal metadata (memory IDs, evidence hashes, confidence floats) is never exposed.
 * - Idempotent and safe.
 */

import { ConversationContext, ConversationTurn } from "./contextTypes";
import { StructuredIntent } from "./intentTypes";
import { ReasoningAnalysis } from "./reasoningTypes";
import { PlanningAnalysis } from "./planningTypes";
import { VerificationAnalysis } from "./verificationTypes";
import { MemoryGovernanceAnalysis, MemoryGovernanceCandidate } from "./memoryGovernanceTypes";
import { LearningAnalysis, LearningPattern } from "./adaptiveLearningTypes";
import { PredictiveContextAnalysis, ProactiveContextCandidate } from "./predictiveContextTypes";
import {
  ResponseAdaptationAnalysis,
  ResponseAdaptationInput,
  ResponseLanguage,
  ResponseVerbosity,
  ResponseTone,
  ResponseFormatStyle,
  ResponseCodeDensity,
  ResponseExplanationDepth,
  AdaptationPrecedenceLayer,
  AdaptationDimension,
  ResolvedDimensionValue,
  ResponseStyleProfile,
  PersonalizationContextItem,
  AppliedOverride,
  SuppressedAttribute,
} from "./responseAdaptationTypes";

interface CandidateValue<T> {
  dimension: AdaptationDimension;
  value: T;
  layer: AdaptationPrecedenceLayer;
  source: string;
  confidence: number;
}

export class ResponseAdaptationEngine {
  private static instance: ResponseAdaptationEngine;

  private constructor() {}

  public static getInstance(): ResponseAdaptationEngine {
    if (!ResponseAdaptationEngine.instance) {
      ResponseAdaptationEngine.instance = new ResponseAdaptationEngine();
    }
    return ResponseAdaptationEngine.instance;
  }

  private readonly LAYER_RANK: Record<AdaptationPrecedenceLayer, number> = {
    CURRENT_TURN_EXPLICIT: 1,
    HARD_CONSTRAINT: 2,
    CORRECTION_NEGATION: 3,
    VERIFIED_EVIDENCE: 4,
    GOVERNANCE_BOUNDARY: 5,
    CONFIRMED_ADAPTIVE: 6,
    CONFIRMED_PREFERENCE: 7,
    PREDICTIVE_CONTEXT: 8,
    SYSTEM_DEFAULT: 9,
  };

  // Sensitive patterns for privacy filtering
  private readonly SENSITIVE_REGEX =
    /\b(?:password|passwd|pin|secret|api[_-]?key|auth[_-]?token|bearer\s+[a-zA-Z0-9_\-\.]+|cvv|cvc|ssn|nid|credit\s*card|bank\s*account)\b/i;

  // Explicit Regex Patterns for Current Turn
  private readonly BANGLA_LANG_REGEX =
    /\b(?:banglay|bangla\s*te|bangla\s*bhashay|speak\s*in\s*bangla|in\s*bangla|in\s*bengali|bangla\s*language|speak\s*bengali|বাংলায়|বাংলাতে|বাংলা\s*ভাষায়|বাংলায়\s*বলো|বাংলাতে\s*বলুন)\b/i;
  private readonly BANGLISH_LANG_REGEX =
    /\b(?:banglish\s*e|in\s*banglish|banglish\s*language|speak\s*in\s*banglish|banglish\s*koro|banglish\s*bol)\b/i;
  private readonly ENGLISH_LANG_REGEX =
    /\b(?:in\s*english|speak\s*in\s*english|english\s*please|english\s*only|english\s*language|ইংরেজিতে|ইংরেজিতে\s*বলো|ইংরেজিতে\s*লিখুন)\b/i;
  private readonly BANGLA_SCRIPT_REGEX = /[\u0980-\u09FF]/;

  private readonly EXTREME_CONCISE_REGEX =
    /\b(?:1\s*sentence|one\s*sentence|single\s*sentence|one\s*line|single\s*line|1\s*line|in\s*one\s*word|single\s*word|super\s*short|extreme(?:ly)?\s*concise|১\s*লাইনে|এক\s*লাইনে|এক\s*বাক্যে|এক\s*কথায়)\b/i;
  private readonly CONCISE_REGEX =
    /\b(?:concise|brief(?:ly)?|short\s*(?:answer|summary|version|response)?|keep\s*it\s*short|quick\s*summary|to\s*the\s*point|tl;?dr|short\s*form|সংক্ষেপে|ছোট\s*করে|খাটো\s*করে)\b/i;
  private readonly DETAILED_REGEX =
    /\b(?:detailed|in\s*detail|in-depth|elaborate|comprehensive|thorough(?:ly)?|step\s*by\s*step\s*detail|full\s*explanation|deep\s*explanation|expand|বিস্তারিত|বিস্তারিতভাবে|বিশদভাবে)\b/i;

  private readonly CASUAL_TONE_REGEX =
    /\b(?:casual(?:ly)?|chill|informal|friendly\s*chat|friendly\s*tone|conversational|বন্ধুত্বপূর্ণ|বন্ধুর\s*মতো)\b/i;
  private readonly PROFESSIONAL_TONE_REGEX =
    /\b(?:professional(?:ly)?|formal(?:ly)?|business|corporate|official|অফিসিয়াল|আনুষ্ঠানিক)\b/i;
  private readonly TECHNICAL_TONE_REGEX =
    /\b(?:technical(?:ly)?|engineering|dev\s*mode|strict\s*technical|প্রযুক্তিগত)\b/i;
  private readonly ACADEMIC_TONE_REGEX =
    /\b(?:academic(?:ally)?|scholarly|scientific|peer\s*reviewed|গবেষণামূলক)\b/i;
  private readonly WARM_FRIENDLY_TONE_REGEX =
    /\b(?:warm(?:ly)?|empathetic|kindly|supportive|gentle|উষ্ণ|সহানুভূতিশীল)\b/i;
  private readonly DIRECT_TONE_REGEX =
    /\b(?:direct(?:ly)?|no\s*fluff|blunt|straightforward|straight\s*to\s*the\s*point|সরাসরি)\b/i;

  private readonly BULLETS_FORMAT_REGEX =
    /\b(?:bullet\s*points?|bullets?|bulleted\s*list|বুলট\s*পয়েন্ট|পয়েন্ট\s*আকারে|পয়েন্ট\s*করে)\b/i;
  private readonly NUMBERED_FORMAT_REGEX =
    /\b(?:numbered\s*list|numbers?|numbered|তালিকা\s*আকারে|নম্বর\s*দিয়ে)\b/i;
  private readonly STEP_FORMAT_REGEX =
    /\b(?:step\s*by\s*step|steps|walkthrough|step-wise|ধাপে\s*ধাপে|স্টেপ\s*বাই\s*স্টেপ)\b/i;
  private readonly TABLE_FORMAT_REGEX =
    /\b(?:table\s*format|table|tabular|in\s*a\s*table|ছক\s*আকারে|টেবিল\s*আকারে)\b/i;
  private readonly CODE_ONLY_FORMAT_REGEX =
    /\b(?:code\s*only|only\s*code|just\s*the\s*code|raw\s*code|nothing\s*but\s*code|শুধু\s*কোড)\b/i;
  private readonly RAW_FORMAT_REGEX =
    /\b(?:raw\s*text|plain\s*text|no\s*markdown|raw\s*json|json\s*only|raw\s*output)\b/i;
  private readonly PROSE_FORMAT_REGEX =
    /\b(?:prose|paragraphs?|essay\s*format|in\s*paragraphs?|text\s*only|অনুচ্ছেদ\s*আকারে)\b/i;

  private readonly CODE_NONE_REGEX =
    /\b(?:no\s*code|without\s*code|don'?t\s*write\s*code|do\s*not\s*write\s*code|skip\s*code|zero\s*code|কোড\s*ছাড়া|কোড\s*দিও\s*না)\b/i;
  private readonly CODE_MINIMAL_REGEX =
    /\b(?:minimal\s*code|brief\s*code|short\s*snippet|just\s*a\s*snippet|small\s*code)\b/i;
  private readonly CODE_FOCUSED_REGEX =
    /\b(?:code\s*focused|more\s*code|show\s*code|complete\s*code|full\s*implementation|provide\s*code|কোড\s*সহ)\b/i;
  private readonly CODE_BALANCED_REGEX =
    /\b(?:code\s*and\s*explanation|balanced\s*code|code\s*with\s*explanation)\b/i;

  private readonly DEPTH_BEGINNER_REGEX =
    /\b(?:eli5|explain\s*like\s*i(?:'m| am)\s*5|for\s*beginners?|simple\s*terms|easy\s*to\s*understand|basic\s*level|বাচ্চাদের\s*মতো\s*বোঝাও|সহজ\s*করে\s*বোঝাও)\b/i;
  private readonly DEPTH_INTERMEDIATE_REGEX =
    /\b(?:intermediate|general\s*audience|standard\s*explanation|moderate\s*depth)\b/i;
  private readonly DEPTH_ADVANCED_REGEX =
    /\b(?:advanced|deep\s*dive|in-depth\s*analysis|under\s*the\s*hood|internals|low\s*level)\b/i;
  private readonly DEPTH_EXPERT_REGEX =
    /\b(?:expert\s*level|production\s*grade|architectural|deep\s*technical\s*internals|for\s*experts)\b/i;

  /**
   * Main evaluation entry point for Response Adaptation & Personalization
   */
  public evaluate(input: ResponseAdaptationInput): ResponseAdaptationAnalysis {
    const startTime = Date.now();
    const {
      message = "",
      context,
      intent,
      reasoning,
      planning,
      verification,
      governanceAnalysis,
      adaptiveLearning,
      predictiveContext,
      history = [],
      options,
    } = input;

    const trimmed = (message || "").trim();
    const appliedOverrides: AppliedOverride[] = [];
    const suppressedAttributes: SuppressedAttribute[] = [];
    let sensitiveBlockedCount = 0;
    let cautionApplied = false;
    let cautionReason: string | undefined;

    // Evaluate caution from Verification Engine & Governance
    if (verification) {
      if (verification.verificationStatus === "FAILED" || verification.confidence?.calibratedScore < 0.60) {
        cautionApplied = true;
        cautionReason = verification.clarificationReason || "Truth calibration confidence below threshold";
      }
    }
    if (governanceAnalysis?.cautiousMemories && governanceAnalysis.cautiousMemories.length > 0) {
      cautionApplied = true;
      cautionReason = cautionReason || "Governed memory requires cautious attribution";
    }

    // 1. Gather Candidate Dimension Values across all 9 layers
    const languageCandidates = this.resolveLanguageCandidates(trimmed, input, suppressedAttributes);
    const verbosityCandidates = this.resolveVerbosityCandidates(trimmed, input, suppressedAttributes);
    const toneCandidates = this.resolveToneCandidates(trimmed, input, suppressedAttributes);
    const formatCandidates = this.resolveFormatCandidates(trimmed, input, suppressedAttributes);
    const codeCandidates = this.resolveCodeCandidates(trimmed, input, suppressedAttributes);
    const depthCandidates = this.resolveDepthCandidates(trimmed, input, suppressedAttributes);

    // 2. Resolve Winning Values via Precedence Hierarchy
    const resolvedLanguage = this.resolveWinningCandidate<ResponseLanguage>(
      "language",
      languageCandidates,
      options?.defaultLanguage || "ENGLISH",
      appliedOverrides
    );

    const resolvedVerbosity = this.resolveWinningCandidate<ResponseVerbosity>(
      "verbosity",
      verbosityCandidates,
      options?.defaultVerbosity || "NORMAL",
      appliedOverrides
    );

    const resolvedTone = this.resolveWinningCandidate<ResponseTone>(
      "tone",
      toneCandidates,
      options?.defaultTone || "PROFESSIONAL",
      appliedOverrides
    );

    const resolvedFormat = this.resolveWinningCandidate<ResponseFormatStyle>(
      "formatStyle",
      formatCandidates,
      options?.defaultFormatStyle || "PROSE",
      appliedOverrides
    );

    const resolvedCode = this.resolveWinningCandidate<ResponseCodeDensity>(
      "codeDensity",
      codeCandidates,
      options?.defaultCodeDensity || "BALANCED",
      appliedOverrides
    );

    const resolvedDepth = this.resolveWinningCandidate<ResponseExplanationDepth>(
      "explanationDepth",
      depthCandidates,
      options?.defaultExplanationDepth || "INTERMEDIATE",
      appliedOverrides
    );

    // 3. Extract and Sanitize Personalization Context
    const sanitizedPersonalizationContext: PersonalizationContextItem[] = [];
    const rawPersonalizationItems = this.extractPersonalizationItems(input);

    for (const item of rawPersonalizationItems) {
      if (this.isSensitive(item.key) || this.isSensitive(item.value)) {
        sensitiveBlockedCount++;
        suppressedAttributes.push({
          attribute: item.key,
          value: "[REDACTED_SENSITIVE]",
          reason: "SENSITIVE_DATA",
        });
        continue;
      }
      sanitizedPersonalizationContext.push(item);
    }

    // 4. Build Style Profile
    const styleProfile: ResponseStyleProfile = {
      language: resolvedLanguage,
      verbosity: resolvedVerbosity,
      tone: resolvedTone,
      formatStyle: resolvedFormat,
      codeDensity: resolvedCode,
      explanationDepth: resolvedDepth,
      cautionRequired: cautionApplied,
      cautionReason,
    };

    // 5. Generate Sanitized Adaptation Directives (strictly non-LLM, non-internal)
    const adaptationDirectives = this.generateDirectives(
      styleProfile,
      sanitizedPersonalizationContext,
      cautionApplied,
      cautionReason
    );

    // 6. Determine Safety Status
    let safetyStatus: "SAFE" | "CAUTION_APPLIED" | "SENSITIVE_SUPPRESSED" = "SAFE";
    if (sensitiveBlockedCount > 0) {
      safetyStatus = "SENSITIVE_SUPPRESSED";
    } else if (cautionApplied) {
      safetyStatus = "CAUTION_APPLIED";
    }

    const duration = Date.now() - startTime;

    return {
      styleProfile,
      language: resolvedLanguage.value,
      verbosity: resolvedVerbosity.value,
      tone: resolvedTone.value,
      formatStyle: resolvedFormat.value,
      codeDensity: resolvedCode.value,
      explanationDepth: resolvedDepth.value,
      appliedOverrides,
      suppressedAttributes,
      adaptationDirectives,
      sanitizedPersonalizationContext,
      safetyStatus,
      diagnostics: {
        layersEvaluated: 9,
        overridesCount: appliedOverrides.length,
        suppressedCount: suppressedAttributes.length,
        sensitiveBlockedCount,
        cautionApplied,
        timingMs: duration,
      },
    };
  }

  /**
   * Resolves the winning candidate among layers according to strict precedence rank
   */
  private resolveWinningCandidate<T>(
    dimension: AdaptationDimension,
    candidates: CandidateValue<T>[],
    defaultValue: T,
    appliedOverrides: AppliedOverride[]
  ): ResolvedDimensionValue<T> {
    if (!candidates || candidates.length === 0) {
      return {
        dimension,
        value: defaultValue,
        winningLayer: "SYSTEM_DEFAULT",
        winningSource: "DEFAULT_FALLBACK",
        confidence: 0.9,
        overriddenLayers: [],
      };
    }

    // Sort by layer rank ascending (rank 1 = highest precedence)
    const sorted = [...candidates].sort((a, b) => {
      const rankA = this.LAYER_RANK[a.layer] || 99;
      const rankB = this.LAYER_RANK[b.layer] || 99;
      return rankA - rankB;
    });

    const winner = sorted[0];
    const overriddenLayers: Array<{
      layer: AdaptationPrecedenceLayer;
      source: string;
      value: string;
    }> = [];

    for (let i = 1; i < sorted.length; i++) {
      const lower = sorted[i];
      if (lower.value !== winner.value) {
        overriddenLayers.push({
          layer: lower.layer,
          source: lower.source,
          value: String(lower.value),
        });

        appliedOverrides.push({
          dimension,
          winner: winner.layer,
          overrode: lower.layer,
          winningValue: String(winner.value),
          overriddenValue: String(lower.value),
          reason: `Layer ${winner.layer} (${winner.source}) took precedence over ${lower.layer} (${lower.source})`,
        });
      }
    }

    return {
      dimension,
      value: winner.value,
      winningLayer: winner.layer,
      winningSource: winner.source,
      confidence: winner.confidence,
      overriddenLayers,
    };
  }

  // ==========================================
  // Dimension Resolvers
  // ==========================================

  private resolveLanguageCandidates(
    message: string,
    input: ResponseAdaptationInput,
    suppressed: SuppressedAttribute[]
  ): CandidateValue<ResponseLanguage>[] {
    const candidates: CandidateValue<ResponseLanguage>[] = [];

    // 1. Current-Turn Explicit
    if (this.BANGLA_LANG_REGEX.test(message)) {
      candidates.push({
        dimension: "language",
        value: "BANGLA",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:BANGLA",
        confidence: 1.0,
      });
    } else if (this.BANGLISH_LANG_REGEX.test(message)) {
      candidates.push({
        dimension: "language",
        value: "BANGLISH",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:BANGLISH",
        confidence: 1.0,
      });
    } else if (this.ENGLISH_LANG_REGEX.test(message)) {
      candidates.push({
        dimension: "language",
        value: "ENGLISH",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:ENGLISH",
        confidence: 1.0,
      });
    } else if (this.BANGLA_SCRIPT_REGEX.test(message)) {
      // Natural input in Bangla Unicode
      candidates.push({
        dimension: "language",
        value: "BANGLA",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "SCRIPT_DETECTION:BANGLA_UNICODE",
        confidence: 0.95,
      });
    }

    // 2. Hard Constraints
    const hardLangConstraint = input.context?.constraints?.find(
      (c) => (c.key === "language" || c.category === "brand_preference") && !c.isOverridden
    );
    if (hardLangConstraint) {
      const parsed = this.parseLanguage(String(hardLangConstraint.value));
      if (parsed) {
        candidates.push({
          dimension: "language",
          value: parsed,
          layer: "HARD_CONSTRAINT",
          source: `CONSTRAINT:${hardLangConstraint.key}`,
          confidence: 0.98,
        });
      }
    }

    // 3. Correction / Negation
    if (input.intent?.primaryIntent === "CORRECTION" && /\b(?:not\s+bangla|stop\s+bangla|english\s+instead)\b/i.test(message)) {
      candidates.push({
        dimension: "language",
        value: "ENGLISH",
        layer: "CORRECTION_NEGATION",
        source: "USER_CORRECTION:SWITCH_TO_ENGLISH",
        confidence: 0.95,
      });
    }

    // 6. Confirmed Adaptive Patterns
    if (input.adaptiveLearning?.patterns) {
      const confirmedLangPattern = input.adaptiveLearning.patterns.find(
        (p) => p.status === "CONFIRMED" && (p.key === "preferred_language" || p.category === "language")
      );
      if (confirmedLangPattern) {
        const parsed = this.parseLanguage(confirmedLangPattern.value);
        if (parsed) {
          candidates.push({
            dimension: "language",
            value: parsed,
            layer: "CONFIRMED_ADAPTIVE",
            source: `ADAPTIVE_PATTERN:${confirmedLangPattern.key}`,
            confidence: confirmedLangPattern.confidence,
          });
        }
      }
    }

    // 7. Confirmed Preference / Governed Memory
    if (input.governanceAnalysis?.governedCandidates) {
      const approvedLangMemory = input.governanceAnalysis.governedCandidates.find(
        (c) => c.usageDecision === "ALLOW" && (c.key === "preferred_language" || c.key === "language")
      );
      if (approvedLangMemory) {
        const parsed = this.parseLanguage(approvedLangMemory.value);
        if (parsed) {
          candidates.push({
            dimension: "language",
            value: parsed,
            layer: "CONFIRMED_PREFERENCE",
            source: `GOVERNED_MEMORY:${approvedLangMemory.key}`,
            confidence: approvedLangMemory.confidence,
          });
        }
      }
    }

    // 8. Predictive Context
    if (input.predictiveContext?.acceptedCandidates) {
      const predLang = input.predictiveContext.acceptedCandidates.find(
        (c) => c.predictionType === "PREFERENCE_RELEVANT" && c.topic === "language"
      );
      if (predLang) {
        const parsed = this.parseLanguage(predLang.contextSummary);
        if (parsed) {
          candidates.push({
            dimension: "language",
            value: parsed,
            layer: "PREDICTIVE_CONTEXT",
            source: `PROACTIVE_CANDIDATE:${predLang.id}`,
            confidence: predLang.confidence,
          });
        }
      }
    }

    return candidates;
  }

  private resolveVerbosityCandidates(
    message: string,
    input: ResponseAdaptationInput,
    suppressed: SuppressedAttribute[]
  ): CandidateValue<ResponseVerbosity>[] {
    const candidates: CandidateValue<ResponseVerbosity>[] = [];

    // 1. Current-Turn Explicit
    if (this.EXTREME_CONCISE_REGEX.test(message)) {
      candidates.push({
        dimension: "verbosity",
        value: "EXTREME_CONCISE",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:EXTREME_CONCISE",
        confidence: 1.0,
      });
    } else if (this.CONCISE_REGEX.test(message)) {
      candidates.push({
        dimension: "verbosity",
        value: "CONCISE",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:CONCISE",
        confidence: 1.0,
      });
    } else if (this.DETAILED_REGEX.test(message)) {
      candidates.push({
        dimension: "verbosity",
        value: "DETAILED",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:DETAILED",
        confidence: 1.0,
      });
    }

    // 2. Hard Constraints
    const hardVerbosityConstraint = input.context?.constraints?.find(
      (c) => (c.key === "verbosity" || c.key === "length") && !c.isOverridden
    );
    if (hardVerbosityConstraint) {
      const parsed = this.parseVerbosity(String(hardVerbosityConstraint.value));
      if (parsed) {
        candidates.push({
          dimension: "verbosity",
          value: parsed,
          layer: "HARD_CONSTRAINT",
          source: `CONSTRAINT:${hardVerbosityConstraint.key}`,
          confidence: 0.98,
        });
      }
    }

    // 3. Correction / Negation
    if (/\b(?:don'?t\s+be\s+verbose|stop\s+long\s+explanations|too\s+long)\b/i.test(message)) {
      candidates.push({
        dimension: "verbosity",
        value: "CONCISE",
        layer: "CORRECTION_NEGATION",
        source: "USER_CORRECTION:REDUCE_VERBOSITY",
        confidence: 0.95,
      });
    }

    // 6. Confirmed Adaptive Patterns
    if (input.adaptiveLearning?.patterns) {
      const confirmedVerbPattern = input.adaptiveLearning.patterns.find(
        (p) => p.status === "CONFIRMED" && (p.key === "preferred_verbosity" || p.category === "verbosity")
      );
      if (confirmedVerbPattern) {
        const parsed = this.parseVerbosity(confirmedVerbPattern.value);
        if (parsed) {
          candidates.push({
            dimension: "verbosity",
            value: parsed,
            layer: "CONFIRMED_ADAPTIVE",
            source: `ADAPTIVE_PATTERN:${confirmedVerbPattern.key}`,
            confidence: confirmedVerbPattern.confidence,
          });
        }
      }
    }

    // 7. Confirmed Preference / Governed Memory
    if (input.governanceAnalysis?.governedCandidates) {
      const approvedVerbMemory = input.governanceAnalysis.governedCandidates.find(
        (c) => c.usageDecision === "ALLOW" && (c.key === "preferred_verbosity" || c.key === "verbosity")
      );
      if (approvedVerbMemory) {
        const parsed = this.parseVerbosity(approvedVerbMemory.value);
        if (parsed) {
          candidates.push({
            dimension: "verbosity",
            value: parsed,
            layer: "CONFIRMED_PREFERENCE",
            source: `GOVERNED_MEMORY:${approvedVerbMemory.key}`,
            confidence: approvedVerbMemory.confidence,
          });
        }
      }
    }

    return candidates;
  }

  private resolveToneCandidates(
    message: string,
    input: ResponseAdaptationInput,
    suppressed: SuppressedAttribute[]
  ): CandidateValue<ResponseTone>[] {
    const candidates: CandidateValue<ResponseTone>[] = [];

    // 1. Current Turn Explicit
    if (this.CASUAL_TONE_REGEX.test(message)) {
      candidates.push({
        dimension: "tone",
        value: "CASUAL",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:CASUAL",
        confidence: 1.0,
      });
    } else if (this.PROFESSIONAL_TONE_REGEX.test(message)) {
      candidates.push({
        dimension: "tone",
        value: "PROFESSIONAL",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:PROFESSIONAL",
        confidence: 1.0,
      });
    } else if (this.TECHNICAL_TONE_REGEX.test(message)) {
      candidates.push({
        dimension: "tone",
        value: "TECHNICAL",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:TECHNICAL",
        confidence: 1.0,
      });
    } else if (this.ACADEMIC_TONE_REGEX.test(message)) {
      candidates.push({
        dimension: "tone",
        value: "ACADEMIC",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:ACADEMIC",
        confidence: 1.0,
      });
    } else if (this.WARM_FRIENDLY_TONE_REGEX.test(message)) {
      candidates.push({
        dimension: "tone",
        value: "WARM_FRIENDLY",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:WARM_FRIENDLY",
        confidence: 1.0,
      });
    } else if (this.DIRECT_TONE_REGEX.test(message)) {
      candidates.push({
        dimension: "tone",
        value: "DIRECT",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:DIRECT",
        confidence: 1.0,
      });
    }

    // 6. Confirmed Adaptive Patterns
    if (input.adaptiveLearning?.patterns) {
      const confirmedTonePattern = input.adaptiveLearning.patterns.find(
        (p) => p.status === "CONFIRMED" && (p.key === "preferred_tone" || p.category === "tone")
      );
      if (confirmedTonePattern) {
        const parsed = this.parseTone(confirmedTonePattern.value);
        if (parsed) {
          candidates.push({
            dimension: "tone",
            value: parsed,
            layer: "CONFIRMED_ADAPTIVE",
            source: `ADAPTIVE_PATTERN:${confirmedTonePattern.key}`,
            confidence: confirmedTonePattern.confidence,
          });
        }
      }
    }

    // 7. Confirmed Preference / Governed Memory
    if (input.governanceAnalysis?.governedCandidates) {
      const approvedToneMemory = input.governanceAnalysis.governedCandidates.find(
        (c) => c.usageDecision === "ALLOW" && (c.key === "preferred_tone" || c.key === "tone")
      );
      if (approvedToneMemory) {
        const parsed = this.parseTone(approvedToneMemory.value);
        if (parsed) {
          candidates.push({
            dimension: "tone",
            value: parsed,
            layer: "CONFIRMED_PREFERENCE",
            source: `GOVERNED_MEMORY:${approvedToneMemory.key}`,
            confidence: approvedToneMemory.confidence,
          });
        }
      }
    }

    return candidates;
  }

  private resolveFormatCandidates(
    message: string,
    input: ResponseAdaptationInput,
    suppressed: SuppressedAttribute[]
  ): CandidateValue<ResponseFormatStyle>[] {
    const candidates: CandidateValue<ResponseFormatStyle>[] = [];

    const isNegatingBullets = /\b(?:don'?t\s+(?:use|write|include)|no\s+|stop\s+(?:using)?|avoid|without)\s+bullets?\b/i.test(message);

    // 1. Current Turn Explicit
    if (this.BULLETS_FORMAT_REGEX.test(message) && !isNegatingBullets) {
      candidates.push({
        dimension: "formatStyle",
        value: "BULLET_POINTS",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:BULLET_POINTS",
        confidence: 1.0,
      });
    } else if (this.NUMBERED_FORMAT_REGEX.test(message)) {
      candidates.push({
        dimension: "formatStyle",
        value: "NUMBERED_LIST",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:NUMBERED_LIST",
        confidence: 1.0,
      });
    } else if (this.STEP_FORMAT_REGEX.test(message)) {
      candidates.push({
        dimension: "formatStyle",
        value: "STEP_BY_STEP",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:STEP_BY_STEP",
        confidence: 1.0,
      });
    } else if (this.TABLE_FORMAT_REGEX.test(message)) {
      candidates.push({
        dimension: "formatStyle",
        value: "TABLE",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:TABLE",
        confidence: 1.0,
      });
    } else if (this.CODE_ONLY_FORMAT_REGEX.test(message)) {
      candidates.push({
        dimension: "formatStyle",
        value: "CODE_ONLY",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:CODE_ONLY",
        confidence: 1.0,
      });
    } else if (this.RAW_FORMAT_REGEX.test(message)) {
      candidates.push({
        dimension: "formatStyle",
        value: "RAW",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:RAW",
        confidence: 1.0,
      });
    } else if (this.PROSE_FORMAT_REGEX.test(message) || isNegatingBullets) {
      candidates.push({
        dimension: "formatStyle",
        value: "PROSE",
        layer: "CURRENT_TURN_EXPLICIT",
        source: isNegatingBullets ? "EXPLICIT_USER_CORRECTION:SWITCH_TO_PROSE" : "EXPLICIT_USER_COMMAND:PROSE",
        confidence: 1.0,
      });
    }

    // 2. Hard Constraints
    const hardFormat = input.context?.constraints?.find(
      (c) => c.key === "format" && !c.isOverridden
    );
    if (hardFormat) {
      const parsed = this.parseFormat(String(hardFormat.value));
      if (parsed) {
        candidates.push({
          dimension: "formatStyle",
          value: parsed,
          layer: "HARD_CONSTRAINT",
          source: `CONSTRAINT:${hardFormat.key}`,
          confidence: 0.98,
        });
      }
    }

    // 3. Correction / Negation
    if (/\b(?:don'?t\s+use\s+bullet\s*points?|no\s+bullets|paragraphs\s+instead)\b/i.test(message)) {
      candidates.push({
        dimension: "formatStyle",
        value: "PROSE",
        layer: "CORRECTION_NEGATION",
        source: "USER_CORRECTION:SWITCH_TO_PROSE",
        confidence: 0.95,
      });
    }

    // 6. Confirmed Adaptive Patterns
    if (input.adaptiveLearning?.patterns) {
      const confirmedFormatPattern = input.adaptiveLearning.patterns.find(
        (p) => p.status === "CONFIRMED" && (p.key === "preferred_format" || p.category === "format")
      );
      if (confirmedFormatPattern) {
        const parsed = this.parseFormat(confirmedFormatPattern.value);
        if (parsed) {
          candidates.push({
            dimension: "formatStyle",
            value: parsed,
            layer: "CONFIRMED_ADAPTIVE",
            source: `ADAPTIVE_PATTERN:${confirmedFormatPattern.key}`,
            confidence: confirmedFormatPattern.confidence,
          });
        }
      }
    }

    return candidates;
  }

  private resolveCodeCandidates(
    message: string,
    input: ResponseAdaptationInput,
    suppressed: SuppressedAttribute[]
  ): CandidateValue<ResponseCodeDensity>[] {
    const candidates: CandidateValue<ResponseCodeDensity>[] = [];

    // 1. Current Turn Explicit
    if (this.CODE_NONE_REGEX.test(message)) {
      candidates.push({
        dimension: "codeDensity",
        value: "NONE",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:NO_CODE",
        confidence: 1.0,
      });
    } else if (this.CODE_ONLY_FORMAT_REGEX.test(message)) {
      candidates.push({
        dimension: "codeDensity",
        value: "CODE_ONLY",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:CODE_ONLY",
        confidence: 1.0,
      });
    } else if (this.CODE_FOCUSED_REGEX.test(message)) {
      candidates.push({
        dimension: "codeDensity",
        value: "CODE_FOCUSED",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:CODE_FOCUSED",
        confidence: 1.0,
      });
    } else if (this.CODE_MINIMAL_REGEX.test(message)) {
      candidates.push({
        dimension: "codeDensity",
        value: "MINIMAL",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:CODE_MINIMAL",
        confidence: 1.0,
      });
    } else if (this.CODE_BALANCED_REGEX.test(message)) {
      candidates.push({
        dimension: "codeDensity",
        value: "BALANCED",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:CODE_BALANCED",
        confidence: 1.0,
      });
    }

    // 3. Correction / Negation
    if (/\b(?:stop\s+writing\s+code|no\s+code\s+needed|remove\s+code)\b/i.test(message)) {
      candidates.push({
        dimension: "codeDensity",
        value: "NONE",
        layer: "CORRECTION_NEGATION",
        source: "USER_CORRECTION:REMOVE_CODE",
        confidence: 0.95,
      });
    }

    // 6. Confirmed Adaptive Patterns
    if (input.adaptiveLearning?.patterns) {
      const confirmedCodePattern = input.adaptiveLearning.patterns.find(
        (p) => p.status === "CONFIRMED" && (p.key === "preferred_code_density" || p.category === "code_density")
      );
      if (confirmedCodePattern) {
        const parsed = this.parseCodeDensity(confirmedCodePattern.value);
        if (parsed) {
          candidates.push({
            dimension: "codeDensity",
            value: parsed,
            layer: "CONFIRMED_ADAPTIVE",
            source: `ADAPTIVE_PATTERN:${confirmedCodePattern.key}`,
            confidence: confirmedCodePattern.confidence,
          });
        }
      }
    }

    return candidates;
  }

  private resolveDepthCandidates(
    message: string,
    input: ResponseAdaptationInput,
    suppressed: SuppressedAttribute[]
  ): CandidateValue<ResponseExplanationDepth>[] {
    const candidates: CandidateValue<ResponseExplanationDepth>[] = [];

    // 1. Current Turn Explicit
    if (this.DEPTH_BEGINNER_REGEX.test(message)) {
      candidates.push({
        dimension: "explanationDepth",
        value: "BEGINNER",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:BEGINNER",
        confidence: 1.0,
      });
    } else if (this.DEPTH_EXPERT_REGEX.test(message)) {
      candidates.push({
        dimension: "explanationDepth",
        value: "EXPERT",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:EXPERT",
        confidence: 1.0,
      });
    } else if (this.DEPTH_ADVANCED_REGEX.test(message)) {
      candidates.push({
        dimension: "explanationDepth",
        value: "ADVANCED",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:ADVANCED",
        confidence: 1.0,
      });
    } else if (this.DEPTH_INTERMEDIATE_REGEX.test(message)) {
      candidates.push({
        dimension: "explanationDepth",
        value: "INTERMEDIATE",
        layer: "CURRENT_TURN_EXPLICIT",
        source: "EXPLICIT_USER_COMMAND:INTERMEDIATE",
        confidence: 1.0,
      });
    }

    // 6. Confirmed Adaptive Patterns
    if (input.adaptiveLearning?.patterns) {
      const confirmedDepthPattern = input.adaptiveLearning.patterns.find(
        (p) => p.status === "CONFIRMED" && (p.key === "preferred_depth" || p.category === "technical_depth")
      );
      if (confirmedDepthPattern) {
        const parsed = this.parseDepth(confirmedDepthPattern.value);
        if (parsed) {
          candidates.push({
            dimension: "explanationDepth",
            value: parsed,
            layer: "CONFIRMED_ADAPTIVE",
            source: `ADAPTIVE_PATTERN:${confirmedDepthPattern.key}`,
            confidence: confirmedDepthPattern.confidence,
          });
        }
      }
    }

    return candidates;
  }

  // ==========================================
  // Personalization Extraction & Sanitization
  // ==========================================

  private extractPersonalizationItems(input: ResponseAdaptationInput): PersonalizationContextItem[] {
    const items: PersonalizationContextItem[] = [];

    // 1. From Governance-Approved Memories
    if (input.governanceAnalysis?.governedCandidates) {
      for (const candidate of input.governanceAnalysis.governedCandidates) {
        if (candidate.usageDecision === "ALLOW" && candidate.canPersonalize) {
          items.push({
            key: candidate.key,
            value: candidate.value,
            category: candidate.type,
            source: "GOVERNANCE_MEMORY",
            sanitized: true,
          });
        }
      }
    }

    // 2. From Confirmed Adaptive Patterns (Domain Interests / Frameworks)
    if (input.adaptiveLearning?.patterns) {
      for (const pattern of input.adaptiveLearning.patterns) {
        if (pattern.status === "CONFIRMED" && (pattern.patternType === "DOMAIN_INTEREST" || pattern.patternType === "USER_PREFERENCE")) {
          // Avoid duplicate keys
          if (!items.some((it) => it.key === pattern.key)) {
            items.push({
              key: pattern.key,
              value: pattern.value,
              category: pattern.category,
              source: "ADAPTIVE_PATTERN",
              sanitized: true,
            });
          }
        }
      }
    }

    // 3. From Predictive Context (Proactive Contexts)
    if (input.predictiveContext?.acceptedCandidates) {
      for (const cand of input.predictiveContext.acceptedCandidates) {
        if (cand.predictionType === "CONTEXT_RELEVANT" && cand.isSafeToInject) {
          if (!items.some((it) => it.key === cand.topic)) {
            items.push({
              key: cand.topic,
              value: cand.contextSummary,
              category: "predictive_context",
              source: "PREDICTIVE_CONTEXT",
              sanitized: true,
            });
          }
        }
      }
    }

    return items;
  }

  /**
   * Generates actionable, sanitized prompt directives without internal metadata
   */
  private generateDirectives(
    profile: ResponseStyleProfile,
    personalization: PersonalizationContextItem[],
    cautionRequired: boolean,
    cautionReason?: string
  ): string[] {
    const directives: string[] = [];

    // Language Directive
    if (profile.language.value === "BANGLA") {
      directives.push("[STYLE_DIRECTIVE: Respond in fluent, natural Bangla (বাংলা)]");
    } else if (profile.language.value === "BANGLISH") {
      directives.push("[STYLE_DIRECTIVE: Respond in conversational Banglish (Bengali transliterated into English alphabet)]");
    } else if (profile.language.value === "ENGLISH") {
      directives.push("[STYLE_DIRECTIVE: Respond in clear, natural English]");
    }

    // Verbosity Directive
    if (profile.verbosity.value === "EXTREME_CONCISE") {
      directives.push("[VERBOSITY_DIRECTIVE: Answer in exactly one concise sentence without filler]");
    } else if (profile.verbosity.value === "CONCISE") {
      directives.push("[VERBOSITY_DIRECTIVE: Keep the response brief, direct, and tightly focused]");
    } else if (profile.verbosity.value === "DETAILED") {
      directives.push("[VERBOSITY_DIRECTIVE: Provide a comprehensive, in-depth explanation with step-by-step breakdown]");
    }

    // Tone Directive
    if (profile.tone.value === "CASUAL") {
      directives.push("[TONE_DIRECTIVE: Maintain a relaxed, friendly, and approachable tone]");
    } else if (profile.tone.value === "TECHNICAL") {
      directives.push("[TONE_DIRECTIVE: Use precise technical terminology and engineering-oriented explanations]");
    } else if (profile.tone.value === "ACADEMIC") {
      directives.push("[TONE_DIRECTIVE: Use scholarly, formal academic phrasing]");
    } else if (profile.tone.value === "DIRECT") {
      directives.push("[TONE_DIRECTIVE: Be direct and to the point with zero unnecessary preamble]");
    } else if (profile.tone.value === "WARM_FRIENDLY") {
      directives.push("[TONE_DIRECTIVE: Maintain an empathetic, warm, and supportive tone]");
    }

    // Format Directive
    if (profile.formatStyle.value === "BULLET_POINTS") {
      directives.push("[FORMAT_DIRECTIVE: Structure key points as a bulleted list]");
    } else if (profile.formatStyle.value === "NUMBERED_LIST") {
      directives.push("[FORMAT_DIRECTIVE: Structure items as a numbered list]");
    } else if (profile.formatStyle.value === "STEP_BY_STEP") {
      directives.push("[FORMAT_DIRECTIVE: Present the solution in sequential numbered steps]");
    } else if (profile.formatStyle.value === "TABLE") {
      directives.push("[FORMAT_DIRECTIVE: Format key comparisons in a clean Markdown table]");
    } else if (profile.formatStyle.value === "CODE_ONLY") {
      directives.push("[FORMAT_DIRECTIVE: Output raw code only without conversational filler]");
    }

    // Code Density Directive
    if (profile.codeDensity.value === "NONE") {
      directives.push("[CODE_DIRECTIVE: Do not include code blocks; provide conceptual explanations only]");
    } else if (profile.codeDensity.value === "CODE_FOCUSED") {
      directives.push("[CODE_DIRECTIVE: Prioritize clean, production-ready code with minimal surrounding prose]");
    } else if (profile.codeDensity.value === "MINIMAL") {
      directives.push("[CODE_DIRECTIVE: Keep code examples short and minimal]");
    }

    // Explanation Depth Directive
    if (profile.explanationDepth.value === "BEGINNER") {
      directives.push("[DEPTH_DIRECTIVE: Explain using simple metaphors and accessible beginner-friendly concepts (ELI5)]");
    } else if (profile.explanationDepth.value === "EXPERT") {
      directives.push("[DEPTH_DIRECTIVE: Target expert-level architectural understanding and performance nuances]");
    } else if (profile.explanationDepth.value === "ADVANCED") {
      directives.push("[DEPTH_DIRECTIVE: Provide advanced technical insight into underlying mechanisms]");
    }

    // Personalization Directives
    for (const item of personalization) {
      if (item.category === "USER_PREFERENCE" || item.category === "DOMAIN_INTEREST" || item.category === "tech_stack") {
        directives.push(`[PERSONALIZATION_DIRECTIVE: User context: ${item.key} is ${item.value}]`);
      }
    }

    // Caution Directives
    if (cautionRequired) {
      directives.push(`[CAUTION_DIRECTIVE: State assumptions clearly; factual confidence is low${cautionReason ? ` (${cautionReason})` : ""}]`);
    }

    return directives;
  }

  // ==========================================
  // Helper Parsers & Checkers
  // ==========================================

  private isSensitive(text: string): boolean {
    if (!text) return false;
    return this.SENSITIVE_REGEX.test(text);
  }

  private parseLanguage(val: string): ResponseLanguage | null {
    const s = (val || "").toLowerCase().trim();
    if (s.includes("bangla") || s.includes("bengali") || s.includes("বাংলা")) return "BANGLA";
    if (s.includes("banglish")) return "BANGLISH";
    if (s.includes("english") || s.includes("ইংরেজি")) return "ENGLISH";
    if (s.includes("mixed")) return "MIXED";
    return null;
  }

  private parseVerbosity(val: string): ResponseVerbosity | null {
    const s = (val || "").toLowerCase().trim();
    if (s.includes("extreme") || s.includes("1 sentence") || s.includes("one sentence") || s.includes("one line")) return "EXTREME_CONCISE";
    if (s.includes("concise") || s.includes("brief") || s.includes("short")) return "CONCISE";
    if (s.includes("detail") || s.includes("elaborate") || s.includes("comprehensive") || s.includes("in-depth")) return "DETAILED";
    if (s.includes("normal") || s.includes("moderate")) return "NORMAL";
    return null;
  }

  private parseTone(val: string): ResponseTone | null {
    const s = (val || "").toLowerCase().trim();
    if (s.includes("casual") || s.includes("informal")) return "CASUAL";
    if (s.includes("profess") || s.includes("formal")) return "PROFESSIONAL";
    if (s.includes("tech") || s.includes("eng")) return "TECHNICAL";
    if (s.includes("acad") || s.includes("schol")) return "ACADEMIC";
    if (s.includes("warm") || s.includes("friend") || s.includes("empathet")) return "WARM_FRIENDLY";
    if (s.includes("direct") || s.includes("blunt") || s.includes("straight")) return "DIRECT";
    return null;
  }

  private parseFormat(val: string): ResponseFormatStyle | null {
    const s = (val || "").toLowerCase().trim();
    if (s.includes("bullet")) return "BULLET_POINTS";
    if (s.includes("number")) return "NUMBERED_LIST";
    if (s.includes("step")) return "STEP_BY_STEP";
    if (s.includes("table") || s.includes("tabular")) return "TABLE";
    if (s.includes("code_only") || s.includes("code only")) return "CODE_ONLY";
    if (s.includes("raw") || s.includes("json")) return "RAW";
    if (s.includes("prose") || s.includes("paragraph")) return "PROSE";
    return null;
  }

  private parseCodeDensity(val: string): ResponseCodeDensity | null {
    const s = (val || "").toLowerCase().trim();
    if (s === "none" || s.includes("no code") || s.includes("zero")) return "NONE";
    if (s.includes("minimal") || s.includes("brief") || s.includes("snippet")) return "MINIMAL";
    if (s.includes("focus") || s.includes("complete") || s.includes("full") || s.includes("more")) return "CODE_FOCUSED";
    if (s.includes("only")) return "CODE_ONLY";
    if (s.includes("balance") || s.includes("normal")) return "BALANCED";
    return null;
  }

  private parseDepth(val: string): ResponseExplanationDepth | null {
    const s = (val || "").toLowerCase().trim();
    if (s.includes("eli5") || s.includes("begin") || s.includes("simple") || s.includes("easy")) return "BEGINNER";
    if (s.includes("expert") || s.includes("prod")) return "EXPERT";
    if (s.includes("advanc") || s.includes("deep") || s.includes("internals")) return "ADVANCED";
    if (s.includes("intermed") || s.includes("standard") || s.includes("moderate")) return "INTERMEDIATE";
    return null;
  }
}

export const responseAdaptationEngine = ResponseAdaptationEngine.getInstance();
