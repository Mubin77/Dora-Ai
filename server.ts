import express from "express";
import http from "http";
import path from "path";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { DORA_SYSTEM_INSTRUCTION } from "./src/doraSystemPrompt";
import { normalizeBanglishPhonetics, containsBanglaOrBanglish } from "./src/utils/banglaPhonetics";
import { providerManager } from "./server/core/providerManager";
import { taskDetector } from "./server/core/taskDetector";
import { brainEngine, conversationalBehaviorEngine, sharedExperienceEngine, languageStyleAdapter } from "./server/core/brainEngine";
import { runAllLanguageStyleAdapterTests } from "./server/core/languageStyleAdapter.test";
import { proactiveCompanionCore } from "./server/core/proactiveCompanionEngine";
import { runAllProactiveEngineTests } from "./server/core/proactiveCompanionEngine.test";
import { runAllDeviceControlTests } from "./server/core/deviceControl.test";
import { validateAndRankSearchResults } from "./server/core/searchFreshness";
import { AIMessage, AIRequest, SearchRequest } from "./server/providers/types";
import { deviceControlService } from "./src/services/device/DeviceControlService";
import { deviceActionRegistry } from "./src/services/device/DeviceActionRegistry";

dotenv.config();

const PORT = 3000;

// Lazy GenAI client
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is missing; calls will fail if not provided");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "15mb" }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/live-ws" });

  // -------------------------------------------------------------
  // REST API Routes
  // -------------------------------------------------------------

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      dora: "online",
      capabilities: [
        "live-audio",
        "tts-synthesis",
        "central-provider-core",
        "multi-provider-routing",
        "real-time-chat"
      ],
      providersConfigured: providerManager.getStatusSummary().totalConfigured,
      timestamp: Date.now(),
    });
  });

  // Sanitized Central Provider diagnostics endpoint (Safe, no credentials exposed)
  app.get("/api/providers/status", (_req, res) => {
    res.json(providerManager.getStatusSummary());
  });

  // Android & Companion Device Control Status endpoint
  app.get("/api/device/status", async (_req, res) => {
    try {
      const status = await deviceControlService.getStatus();
      res.json({
        status: "ok",
        deviceStatus: status,
        supportedActions: deviceActionRegistry.getAllowlistedActions(),
        timestamp: Date.now(),
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to query device status", details: err?.message });
    }
  });

  // Direct Device Action Execution endpoint (Allowlist-enforced)
  app.post("/api/device/action", async (req, res) => {
    try {
      const { device = "android", action, parameters } = req.body;
      if (!action) {
        return res.status(400).json({ error: "action is required" });
      }

      const result = await deviceControlService.executeAction({
        device,
        action,
        parameters: parameters || {},
      });

      res.json({
        status: "ok",
        result,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      res.status(500).json({ error: "Device action execution failed", details: err?.message });
    }
  });

  // Diagnostic endpoint to run Proactive Engine test suite
  app.get("/api/test-proactive", (_req, res) => {
    try {
      runAllProactiveEngineTests();
      runAllLanguageStyleAdapterTests();
      res.json({
        status: "ok",
        message: "All Proactive Companion Engine and Language Style Adapter tests passed successfully.",
        timestamp: Date.now(),
      });
    } catch (err: any) {
      res.status(500).json({ status: "error", error: err?.message || String(err) });
    }
  });

  // Diagnostic endpoint to run Device Control test suite (Case A, B, C, D, E, F, G)
  app.get("/api/test-device-control", async (_req, res) => {
    try {
      const result = await runAllDeviceControlTests();
      res.json({
        status: "ok",
        message: "All Dora Android Phone Control tests passed successfully.",
        result,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      res.status(500).json({ status: "error", error: err?.message || String(err) });
    }
  });

  // Chat endpoint for conversational turn (Powered by Central Provider Core)
  app.post("/api/chat", async (req, res) => {
    try {
      const {
        message,
        history = [],
        language = "auto",
        memoryContext = "",
        cameraFrame = null,
        screenFrame = null,
        imageAttachment = null,
        deepThink = false,
        clientTimeZone,
        clientTimestamp,
        existingContext = undefined,
        sessionId = "default",
      } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      // Format conversation history for multi-turn context
      const messages: AIMessage[] = [];

      // Add recent history context (up to last 12 turns)
      const recentHistory = Array.isArray(history) ? history.slice(-12) : [];
      for (const h of recentHistory) {
        if (h.sender === "user" && h.text) {
          messages.push({ role: "user", content: h.text });
        } else if (h.sender === "dora" && h.text) {
          messages.push({ role: "assistant", content: h.text });
        }
      }

      // Current user turn with optional camera/screen/image attachment
      const currentMsg: AIMessage = {
        role: "user",
        content: message,
      };

      if (imageAttachment && typeof imageAttachment === "string") {
        currentMsg.image = {
          mimeType: "image/jpeg",
          base64Data: imageAttachment,
        };
      } else if (cameraFrame && typeof cameraFrame === "string") {
        currentMsg.image = {
          mimeType: "image/jpeg",
          base64Data: cameraFrame,
        };
      } else if (screenFrame && typeof screenFrame === "string") {
        currentMsg.image = {
          mimeType: "image/jpeg",
          base64Data: screenFrame,
        };
      }
      messages.push(currentMsg);

      const referenceDate = clientTimestamp ? new Date(Number(clientTimestamp)) : new Date();

      // Advanced Brain & Intelligence System analysis with Structured Active Context
      const brainAnalysis = brainEngine.analyze(
        message,
        Array.isArray(history) ? history : [],
        existingContext,
        sessionId
      );
      console.log(
        `[BrainIntelligence]\nintent=${brainAnalysis.intent}\nsecondaryIntent=${brainAnalysis.structuredIntent.secondaryIntent || "none"}\nrelationship=${brainAnalysis.structuredIntent.relationship}\nreasoningRequired=${brainAnalysis.reasoningRequired}\nreasoningType=${brainAnalysis.reasoningAnalysis.reasoningType}\nconclusionStrategy=${brainAnalysis.reasoningAnalysis.conclusionStrategy}\nrequiresPlanning=${brainAnalysis.requiresPlanning}\nplanAction=${brainAnalysis.planningAnalysis.planAction || "none"}\nplanStatus=${brainAnalysis.activeTaskPlan?.status || "none"}\nknowledgeType=${brainAnalysis.knowledgeType}\ntopic=${brainAnalysis.activeContext?.activeTopic || "none"}\ntask=${brainAnalysis.activeContext?.currentTask || "none"}\ngoal=${brainAnalysis.activeContext?.userGoal || "none"}\nentities=${brainAnalysis.activeContext?.entities.map((e) => e.name).join(", ") || "none"}\nconstraints=${brainAnalysis.activeContext?.constraints.filter((c) => !c.isOverridden).map((c) => `${c.key}:${c.value}`).join("; ") || "none"}\nisFollowUp=${brainAnalysis.contextReference.isFollowUp}\nisCorrection=${brainAnalysis.contextReference.isCorrection}\nhasReference=${brainAnalysis.contextReference.hasReference}\nisTopicSwitched=${brainAnalysis.activeContext?.isTopicSwitched || false}\nisAmbiguous=${brainAnalysis.activeContext?.isAmbiguousReference || false}\nrequiresClarification=${brainAnalysis.requiresClarification}\nconfidence=${brainAnalysis.confidence}`
      );

      let brainPromptContext = "";
      const promptSections: string[] = [];

      if (brainAnalysis.memoryGovernanceAnalysis?.sanitizedMemoryContext) {
        promptSections.push(brainAnalysis.memoryGovernanceAnalysis.sanitizedMemoryContext);
      }

      if (brainAnalysis.promptDirectives.length > 0) {
        promptSections.push(
          `[DORA ADVANCED BRAIN & CONTEXTUAL COGNITION]\n${brainAnalysis.promptDirectives.map((d, i) => `${i + 1}. ${d}`).join("\n")}`
        );
      }

      if (promptSections.length > 0) {
        brainPromptContext = `\n\n${promptSections.join("\n\n")}`;
      }

      // 1. Detect task and intent (e.g. realtime_temporal vs web_search vs normal chat vs reasoning vs vision)
      const detected = taskDetector.detect(message, {
        hasImage: Boolean(imageAttachment || screenFrame),
        deepThink: Boolean(deepThink) || brainAnalysis.reasoningRequired,
        clientTimeZone,
        referenceDate,
      });

      let searchPromptContext = "";
      let isWebSearch = detected.task === "web_search";
      let isTemporal = detected.task === "realtime_temporal";
      let isDeviceAction = detected.task === "device_action";
      let searchProviderUsed = "";
      let searchResultsCount = 0;
      let freshResultsCount = 0;
      let validatedUrlsCount = 0;

      let deviceActionResult: any = null;
      let deviceActionContext = "";

      if (isDeviceAction && detected.deviceAction) {
        try {
          deviceActionResult = await deviceControlService.executeAction({
            device: detected.deviceAction.device,
            action: detected.deviceAction.action,
            parameters: { appName: detected.deviceAction.appName },
          });

          console.log(
            `[DeviceActionExecution]\ndevice=${detected.deviceAction.device}\naction=${detected.deviceAction.action}\nappName=${detected.deviceAction.appName}\nsuccess=${deviceActionResult.success}\nstatus=${deviceActionResult.status}`
          );

          if (!deviceActionResult.success) {
            deviceActionContext = `\n\n[ANDROID COMPANION PHONE ACTION EXECUTION RESULT]
Command: "${message}"
Requested Action: ${detected.deviceAction.action}
Target Application: ${detected.deviceAction.appName}
EXECUTION STATUS: ${deviceActionResult.status} (FAILED / NOT EXECUTED)
SUCCESS: false
Error Code: ${deviceActionResult.error?.code || "DEVICE_NOT_CONNECTED"}
Reason: ${deviceActionResult.error?.details || deviceActionResult.message}

CRITICAL RULES FOR DORA:
1. THE APP DID NOT OPEN. NO REAL ANDROID COMPANION IS CONNECTED.
2. YOU ARE STRICTLY FORBIDDEN FROM SAYING "Opening YouTube", "YouTube open kore dicchi", "YouTube khule dicchi", "Sure, opening", or claiming in any way that the app opened or is opening.
3. Warmly and naturally tell the user in your conversational voice that their Android phone / companion isn't connected yet, so you couldn't open ${detected.deviceAction.appName}.
   Example Banglish: "Tor Android phone-ta ekhono connect kora nai, tai YouTube open korte parlam na." (or in Tumi: "Tomar Android phone-ta connect kora nei, tai YouTube open korte parlam na.").
   Example English: "Your Android phone isn't connected yet, so I couldn't open ${detected.deviceAction.appName}."
4. NEVER output raw technical error codes or stack traces to the user.`;
          } else {
            deviceActionContext = `\n\n[ANDROID COMPANION PHONE ACTION EXECUTION RESULT]
Command: "${message}"
Requested Action: ${detected.deviceAction.action}
Target Application: ${detected.deviceAction.appName}
EXECUTION STATUS: ACTION_EXECUTED
SUCCESS: true
Message: ${deviceActionResult.message}

INSTRUCTIONS FOR DORA:
1. The Android companion confirmed that ${detected.deviceAction.appName} was successfully launched.
2. Confirm warmly to the user that ${detected.deviceAction.appName} is open / opening now on their phone (e.g., "YouTube open kore dilam!" or "YouTube is open!").`;
          }
        } catch (err: any) {
          console.warn("[Device Action Execution Error]:", err?.message);
          deviceActionContext = `\n\n[ANDROID COMPANION PHONE ACTION EXECUTION RESULT]
Command: "${message}"
Requested Action: ${detected.deviceAction.action}
Target Application: ${detected.deviceAction.appName}
EXECUTION STATUS: ACTION_FAILED
SUCCESS: false
Reason: Exception occurred during device action dispatch.

CRITICAL RULES FOR DORA:
1. THE APP DID NOT OPEN.
2. YOU MUST NOT CLAIM THAT THE APP OPENED.
3. Warmly explain that you couldn't complete the action on their phone right now.`;
        }
      }

      if (isTemporal && detected.temporal) {
        const t = detected.temporal;
        console.log(
          `[RealTimeClassification]\nintent=${t.intent}\nrequiresRealtime=true\nlocation=${t.location || "user_local"}`
        );
        console.log(
          `[RealTimeTool]\ntool=get_current_local_time()\ntimeZone=${t.resolvedTimeZone || "default"}\nvalue=${t.formattedTime || ""}`
        );

        if (t.intent === "LOCATION_TIME" && t.isLocationAmbiguous) {
          searchPromptContext = `\n\n[REAL-TIME TEMPORAL INTELLIGENCE: LOCATION TIME CLARIFICATION]
The user asked about the time in "${t.location}", but this country/region spans multiple distinct timezones.
Required Action for Dora:
- Ask a short, friendly, natural clarification question in Dora's warm voice.
- Example: "${t.location}-te kon city ta? ${t.ambiguousChoices?.slice(0, 3).join(", ")}, naki onno kono city?" (or in English if user asked in English).
- NEVER guess a specific city or calculate from a random timezone.`;
        } else if (t.intent === "WEATHER" && !t.location) {
          searchPromptContext = `\n\n[REAL-TIME ENVIRONMENTAL INTELLIGENCE: WEATHER LOCATION REQUIRED]
The user asked about current weather or rain ("${message}"), but didn't specify a location.
Required Action for Dora:
- Ask a sweet, conversational clarification question asking which city/location's weather they want to check.
- Example (Banglish): "Kon location-er weather jante chaccho?"
- Example (English): "Which location's weather would you like to know?"
- NEVER output placeholders like "[Insert weather]" or "[location]".`;
        } else {
          searchPromptContext = `\n\n[REAL-TIME TEMPORAL INTELLIGENCE: VERIFIED DATA]
Intent: ${t.intent}
User Timezone: ${t.resolvedTimeZone || "Client Local Timezone"}
Current Verified Time: ${t.formattedTime || "N/A"}
Current Verified Date: ${t.formattedDate || "N/A"}
${t.relativeDescription ? `Calculated Offset: ${t.relativeDescription}\nCalculated Target Time: ${t.calculatedTargetTime}\nCalculated Target Date: ${t.calculatedTargetDate}` : ""}
${t.rawDetails ? `Verified Fact Summary: ${t.rawDetails}` : ""}

MANDATORY RULES FOR DORA:
1. STRICT FACTUAL PRECISION: Use the exact verified real-time numbers provided above.
2. ZERO PLACEHOLDERS: NEVER output placeholder tokens such as "[Insert current time]", "[current date]", "[location]", "[weather]", or "[unknown]".
3. INVISIBLE TOOLING: Keep the time tool invisible. Do NOT say "I called a time API" or "According to the clock". Respond with natural warmth:
   - Example (Banglish): "Ekhon ${t.formattedTime} 😊" or "Ajke ${t.formattedDate}."
   - Example (English): "It's ${t.formattedTime} right now." or "Today is ${t.formattedDate}."
4. RELATIVE TIME: For future or relative queries ("2 ghonta por koyta baje hobe?"), state the calculated target time (${t.calculatedTargetTime || t.formattedTime}) directly without guessing.
5. ANTI-HALLUCINATION: If the verified time is somehow unavailable, honestly say: "Amar current-time source ta ekhon available nei, tai exact time ta verify korte parchi na."`;
        }
      }

      if (isWebSearch) {
        console.log(`[TaskDetection]\ntask=web_search`);
        const queryToSearch = detected.searchQuery || message;
        const runtimeDate = referenceDate;
        const currentDateStr = runtimeDate.toISOString().split("T")[0];
        const freshnessIntent = detected.freshness || "any";

        try {
          const searchReq: SearchRequest = {
            query: queryToSearch,
            limit: 8,
            searchDepth: "basic",
            includeAnswer: true,
            topic: detected.isNewsQuery || freshnessIntent === "today" || freshnessIntent === "this_week" ? "news" : "general",
            freshness: freshnessIntent,
            days: freshnessIntent === "today" ? 2 : (freshnessIntent === "this_week" ? 7 : (freshnessIntent === "recent" ? 30 : undefined)),
            simulateFailure: Boolean(req.body.simulateSearchFailure),
            simulateTavilyFailure: Boolean(req.body.simulateTavilyFailure),
            simulateJinaFailure: Boolean(req.body.simulateJinaFailure),
          };

          let searchResult = await providerManager.executeSearch(searchReq);
          searchProviderUsed = searchResult.meta.providerId;
          searchResultsCount = searchResult.response.results.length;

          console.log(`[SearchExecution]\nprovider=${searchProviderUsed}\nstatus=success`);

          if (searchResult.meta.fallbacksAttempted && searchResult.meta.fallbacksAttempted.length > 0) {
            console.log(
              `[SearchFallbackVerification]\nprimaryProvider=${searchResult.meta.fallbacksAttempted[0].providerId}\nfallbackProvider=${searchProviderUsed}\nfallbackUsed=true`
            );
          }

          // Validate dates, filter low-quality SEO scrapers, and rank by credibility & freshness
          let validation = validateAndRankSearchResults(
            searchResult.response.results,
            freshnessIntent,
            runtimeDate
          );

          // If looking for today's news and 0 fresh items were found with news topic, try a general query retry
          if (validation.freshResults.length === 0 && freshnessIntent === "today" && searchReq.topic === "news") {
            try {
              const retryResult = await providerManager.executeSearch({
                ...searchReq,
                topic: "general",
                days: undefined,
              });
              const retryValidation = validateAndRankSearchResults(
                retryResult.response.results,
                freshnessIntent,
                runtimeDate
              );
              if (retryValidation.freshResults.length > 0) {
                searchResult = retryResult;
                searchProviderUsed = retryResult.meta.providerId;
                searchResultsCount = retryResult.response.results.length;
                validation = retryValidation;
              }
            } catch {
              // keep previous result
            }
          }

          freshResultsCount = validation.freshResults.length;
          validatedUrlsCount = validation.validatedUrls.length;

          console.log(
            `[SearchFreshness]\nrequested=${freshnessIntent}\ncurrentDate=${currentDateStr}\nfreshResults=${freshResultsCount}`
          );

          console.log(
            `[SearchSources]\nprovider=${searchProviderUsed}\nresults=${searchResultsCount}\nvalidatedUrls=${validatedUrlsCount}`
          );

          const resultsToUse = validation.freshResults.length > 0 ? validation.freshResults : validation.staleResults;

          if (resultsToUse.length === 0) {
            searchPromptContext = `\n\n[SEARCH NOTICE: Live search query for "${queryToSearch}" returned no verified sources. Please tell the user warmly: "I couldn't verify enough fresh sources right now." and answer what you know with clear uncertainty.]`;
          } else {
            const sourcesList = resultsToUse
              .map((r, i) => {
                const domain = r.source || (r.url ? new URL(r.url).hostname.replace(/^www\./, "") : "Web");
                return `SEARCH RESULT ${i + 1}
Title: ${r.title}
URL: ${r.url}
Source: ${domain}
Published: ${r.publishedAt || "Recently"}
Credibility: ${r.score && r.score >= 80 ? "High (Reputable Publication / Primary Source)" : "Standard Web Source"}
Snippet: ${r.snippet}
${r.content ? `Content Excerpt: ${r.content.slice(0, 400)}` : ""}`;
              })
              .join("\n\n");

            const isFreshNewsQuery = freshnessIntent === "today" || freshnessIntent === "this_week" || detected.isNewsQuery;

            searchPromptContext = `\n\n[LIVE CURRENT WEB SEARCH RESULTS]
Current Runtime Date: ${currentDateStr} (Year: ${runtimeDate.getFullYear()}, Month: ${runtimeDate.toLocaleString('default', { month: 'long' })})
User Freshness Intent: "${freshnessIntent}"
Search Query: "${searchResult.response.query}"
Search Provider: ${searchProviderUsed}
Fresh & Verified Sources: ${freshResultsCount}
Validated URLs:
${validation.validatedUrls.map((u) => `- ${u}`).join("\n")}

${sourcesList}

${searchResult.response.answer ? `Search Engine Direct Summary: ${searchResult.response.answer}\n` : ""}
MANDATORY GUIDELINES FOR DORA:
1. STRICT CHRONOLOGICAL ACCURACY: Today is ${currentDateStr} (${runtimeDate.toLocaleString('default', { month: 'long' })} ${runtimeDate.getDate()}, ${runtimeDate.getFullYear()}). NEVER present older articles (such as from January 2026 or earlier) as today's or this week's news.
2. SOURCE-GROUNDED ONLY: Every fact, company announcement, product release, or event MUST come strictly from the SEARCH RESULTS above. Do NOT use outdated internal training memory for breaking news.
3. NO INVENTED / FABRICATED URLs: Every URL in your answer MUST be an exact copy of one of the Validated URLs listed above. NEVER guess or invent a URL.
4. FORMATTING FOR CURRENT NEWS:
${isFreshNewsQuery ? `Present the latest developments in a clean, scannable format:
Start with: "Here are the latest major AI developments I found:" (or natural equivalent in Dora's warm voice)
Then organize key headlines with:
- Short summary of what occurred
- Why it matters
- Source: [Actual Source Name](Actual Exact URL from search results above)
- Published: Date if available` : `Answer directly and conversationally, citing sources as markdown links [Source Name](URL) whenever referencing specific articles.`}
5. HONESTY: If the search results do not have enough fresh information to answer completely, honestly say: "I couldn't verify enough fresh sources right now."`;
          }
        } catch (searchErr: any) {
          console.log(`[SearchExecution]\nprovider=none\nstatus=failed`);
          console.warn("[Search Provider Notice during Chat]:", searchErr?.message);
          searchPromptContext = `\n\n[SEARCH NOTICE: Attempted web search for "${queryToSearch}", but search retrieval was unavailable. Honestly inform the user: "I tried searching the web for the latest updates, but couldn't retrieve live search results right now." and answer what general knowledge you have with that clear disclaimer.]`;
        }
      }

      let languageHint = "";
      if (language === "bn-en") {
        languageHint = "\nNote: The user prefers Banglish (Bengali in English script). Respond in natural, warm Banglish / English mix.";
      }

      let deepThinkPrompt = "";
      if (deepThink) {
        deepThinkPrompt = "\n\n[DEEP THINK REASONING MODE: Rigorously analyze the problem, think through step-by-step logic, calculations, code, or planning with depth and high accuracy, while still expressing the solution in Dora's warm, supportive, natural conversational voice.]";
      }

      const effectiveSystemInstruction = [
        DORA_SYSTEM_INSTRUCTION,
        languageHint,
        deepThinkPrompt,
        brainPromptContext,
        searchPromptContext,
        deviceActionContext,
      ]
        .filter(Boolean)
        .join("\n");

      let reply = "Yeah, I'm here. What's on your mind?";
      let providerUsed = "central-provider";
      let modelUsed = "default";

      try {
        const aiRequest: AIRequest = {
          task: (imageAttachment || screenFrame) ? "vision" : (deepThink ? "reasoning" : "chat"),
          messages,
          systemInstruction: effectiveSystemInstruction,
          deepThink: Boolean(deepThink),
          simulateFailure: Boolean(req.body.simulateGoogleFailure),
        };

        const result = await providerManager.executeAI(aiRequest);
        reply = result.response.text;
        providerUsed = result.meta.providerId;
        modelUsed = result.meta.modelUsed;

        if (isWebSearch) {
          console.log(`[SearchToAI]\nresults=${searchResultsCount}\nprovider=${result.meta.providerId}`);
          console.log(
            `[WebSearchIntegrationVerification]\nnormalChatSearch=false\nwebSearchTriggered=true\nsearchProvider=${searchProviderUsed || "tavily"}\nresultsRetrieved=${searchResultsCount}\nresultsPassedToAI=true\nsourceMetadataPreserved=true\nstatus=success`
          );
        }

        const fallbacksCount = result.meta.fallbacksAttempted?.length || 0;
        if (fallbacksCount > 0) {
          const firstFailure = result.meta.fallbacksAttempted[0];
          console.log(
            `[ProviderFallbackVerification]\nprimaryProvider=${firstFailure.providerId}\nprimaryStatus=failed\nfallbackProvider=${result.meta.providerId}\nfallbackStatus=success\nfallbackUsed=true\nattempts=${fallbacksCount + 1}`
          );
        } else {
          console.log(
            `[ProviderVerification]\ntask=${aiRequest.task || "chat"}\nselectedProvider=${result.meta.providerId}\nfallbackUsed=false\nattempts=1\nstatus=success`
          );
        }
      } catch (genError: any) {
        if (req.body.simulateGoogleFailure) {
          console.log(
            `[ProviderFallbackVerification]\nprimaryProvider=google\nprimaryStatus=failed\nfallbackProvider=none\nfallbackStatus=failure\nfallbackUsed=true\nattempts=1`
          );
        } else {
          console.log(
            `[ProviderVerification]\ntask=${(imageAttachment || screenFrame) ? "vision" : (deepThink ? "reasoning" : "chat")}\nselectedProvider=none\nfallbackUsed=false\nattempts=1\nstatus=failure`
          );
        }
        console.warn("[Central Provider Error] Falling back to in-character resilience reply:", genError?.message);
        reply = "Hey, I'm right here with you! Caught a tiny glitch on the connection, but I'm listening. Tell me what's on your mind.";
      }


      // Apply LanguageStyleAdapter to eliminate formal assistant-speak and harmonize Banglish/Bangla flow
      const conversationalMood = (brainAnalysis.languageStyle?.mood as any) || languageStyleAdapter.detectMood(message);
      const languageMode = (brainAnalysis.languageStyle?.languageMode as any) || languageStyleAdapter.detectLanguageMode(message);
      const activePronoun = brainAnalysis.languageStyle?.pronounPreference || languageStyleAdapter.getPronounPreference();
      reply = languageStyleAdapter.adaptResponseText(reply, conversationalMood, languageMode, activePronoun);

      // Determine emotional tone and quick reaction for visual resonance
      let emotion = "warm";
      let reaction = "";
      const lowerReply = reply.toLowerCase();
      if (lowerReply.includes("wait, really") || lowerReply.includes("oh wow") || lowerReply.includes("seriously?")) {
        emotion = "surprised";
        reaction = "Oh wow";
      } else if (lowerReply.includes("haha") || lowerReply.includes("😂") || lowerReply.includes("tease") || lowerReply.includes("kidding")) {
        emotion = "playful";
        reaction = "Haha";
      } else if (lowerReply.includes("i'm so sorry") || lowerReply.includes("rough") || lowerReply.includes("take your time") || lowerReply.includes("here for you")) {
        emotion = "empathetic";
        reaction = "I'm with you";
      } else if (lowerReply.includes("why") || lowerReply.includes("how come") || lowerReply.includes("tell me more")) {
        emotion = "curious";
        reaction = "Curious";
      } else if (lowerReply.includes("okay, so") || lowerReply.includes("let's see") || lowerReply.includes("breathe")) {
        emotion = "calm";
        reaction = "Got it";
      }

      res.json({
        reply,
        emotion,
        reaction,
        mood: conversationalMood,
        languageMode,
        provider: providerUsed,
        model: modelUsed,
        context: brainAnalysis.activeContext,
        deviceAction: detected.deviceAction || null,
        deviceActionResult: deviceActionResult || null,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error("Chat API error:", error);
      res.json({
        reply: "Hey, I had a brief glitch listening to that. Say that one more time?",
        emotion: "warm",
        reaction: "Listening",
        timestamp: Date.now(),
      });
    }
  });

  // Companion Decision & Proactive Behavior Endpoint
  app.post("/api/companion/decision", (req, res) => {
    try {
      const {
        userMessage = "",
        history = [],
        timeSinceLastUserMessageMs = 0,
        timeSinceLastDoraMessageMs = 0,
        isCallActive = false,
        isUserSpeaking = false,
        activeTopic = "",
        currentTask = "",
        screenVisualCue = "",
        cameraVisualCue = "",
        currentMode = "CHILL_COMPANION",
      } = req.body;

      const decision = conversationalBehaviorEngine.evaluate({
        userMessage,
        history,
        timeSinceLastUserMessageMs,
        timeSinceLastDoraMessageMs,
        isCallActive,
        isUserSpeaking,
        activeTopic,
        currentTask,
        screenVisualCue,
        cameraVisualCue,
        currentMode,
      });

      const sharedContext = sharedExperienceEngine.getContext();

      res.json({
        decision,
        sharedContext,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      console.error("Companion decision error:", err);
      res.status(500).json({ error: "Failed to evaluate companion decision" });
    }
  });

  // Background deep memory extraction endpoint (Powered by Central Provider Core)
  app.post("/api/memory/extract", async (req, res) => {
    try {
      const { userText, doraResponse = "", existingMemories = [] } = req.body;
      if (!userText || typeof userText !== "string" || userText.trim().length < 5) {
        return res.json({ candidates: [] });
      }

      const prompt = `
You are the background intelligent long-term memory extraction engine for Dora, an authentic AI companion.
Analyze the user message (and Dora's response) in ANY language (English, Bengali, Banglish, or mixed) to extract durable, valuable facts about the user for persistent long-term memory.

SELECTIVE IMPORTANCE & FILTERING DIRECTIVES:
DO NOT STORE:
- Temporary conversation context or active task items ("I'm buying a laptop today", "I need a phone under 30k", "What's the weather today?", "Ami laptop kinbo ajke")
- Ordinary temporary states ("Ami ekhon pani khacchi", "Ami ajke tired", "I am eating pizza right now", "Ami ekhon YouTube dekhchi", "I am going outside")
- Transient conversational pleasantries ("hello", "thanks", "kemon acho", "bhalo")
- Uncertain / speculative statements ("Maybe ami next year abroad jabo", "Perhaps I might try that")
- Low importance (<40) trivial details

DO STORE (importance >= 40, confidence >= 0.60):
- IDENTITY: Name ("Amar naam Ryan", "Call me Mubin"), birthday ("My birthday is July 4"), location ("Ami Dhaka te thaki"), background
- PREFERENCES & RECURRING PATTERNS:
  * Favorite games, movies, music, food, creators ("Amar favorite color black", "Amar favorite movie Interstellar", "Ami usually black shirt porte pochondo kori")
  * Preference shifts/updates: ("Actually, ekhon ami Minecraft ar kheli na. FC Mobile beshi kheli." -> update favorite_game to "FC Mobile")
- PROJECTS & WORK:
  * Current projects & names ("Ami ekhon ekta AI assistant project niye kaj kortesi. Project tar naam Dora." -> project="Dora", project_type="AI Assistant")
  * Long-term project goals, stack, or tech decisions
- GOALS & ASPIRATIONS: Long-term plans, career goals ("Next year ami ekta new AI project start korte chai")
- HABITS & ROUTINES: Regular routines, sleeping habits, study habits
- RELATIONSHIPS: Meaningful people/pets ("Amar biral Luna", "My best friend Ryan")
- LIFE EVENTS & MILESTONES: Meaningful achievements, major life moments
- PERSONALITY & COMMUNICATION PREFERENCES: How user likes to be addressed

CRITICAL CONFLICT & DEDUPLICATION:
If the user provides an update to an existing memory (e.g. changing favorite game from Minecraft to FC Mobile), output the updated value using the same concise key so it updates the existing memory cleanly rather than creating duplicates.

Existing known memories: ${JSON.stringify(existingMemories.slice(0, 15))}

User Message: "${userText}"
Dora Response: "${doraResponse}"

Output ONLY a JSON array of candidates (or empty array [] if no lasting facts):
[
  {
    "category": "identity" | "preferences" | "personality" | "goals" | "projects" | "habits" | "relationships" | "life_events" | "context",
    "key": "concise_snake_case_key",
    "value": "clear, concise factual statement",
    "importance": number between 40 and 100,
    "confidence": number between 0.60 and 1.0,
    "source": "inferred",
    "tags": ["tag1", "tag2"]
  }
]
`;

      let candidates = [];
      try {
        const result = await providerManager.executeAI({
          task: "extraction",
          messages: [{ role: "user", content: prompt }],
          jsonMode: true,
          temperature: 0.1,
        });

        if (result.response.text) {
          const raw = result.response.text.trim();
          // Strip possible markdown code fence
          const cleanJson = raw.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "").trim();
          const parsed = JSON.parse(cleanJson);
          if (Array.isArray(parsed)) {
            candidates = parsed;
          }
        }
      } catch (extractErr: any) {
        console.warn("[Background Extraction Provider Notice]:", extractErr?.message);
      }

      res.json({ candidates });
    } catch (err: any) {
      res.json({ candidates: [] });
    }
  });

  // Central Provider Web Search endpoint (Tavily -> Jina)
  app.post("/api/search", async (req, res) => {
    try {
      const {
        query,
        limit = 5,
        searchDepth = "basic",
        includeAnswer = true,
        preferredProviderId,
        simulateFailure,
        simulateTavilyFailure,
        simulateJinaFailure,
      } = req.body;

      if (!query || typeof query !== "string" || query.trim().length === 0) {
        return res.status(400).json({ error: "Query is required" });
      }

      const searchReq: any = {
        query: query.trim(),
        limit: Number(limit) || 5,
        searchDepth,
        includeAnswer: Boolean(includeAnswer),
        preferredProviderId,
        simulateFailure: Boolean(simulateFailure),
        simulateTavilyFailure: Boolean(simulateTavilyFailure),
        simulateJinaFailure: Boolean(simulateJinaFailure),
      };

      const result = await providerManager.executeSearch(searchReq);

      const fallbacksCount = result.meta.fallbacksAttempted?.length || 0;
      if (fallbacksCount > 0) {
        const firstFailure = result.meta.fallbacksAttempted[0];
        console.log(
          `[SearchFallbackVerification]\nprimaryProvider=${firstFailure.providerId}\nprimaryStatus=failed\nfallbackProvider=${result.meta.providerId}\nfallbackStatus=success\nfallbackUsed=true\nattempts=${fallbacksCount + 1}`
        );
      } else {
        console.log(
          `[SearchProviderVerification]\nprimaryProvider=${result.meta.providerId}\nstatus=success`
        );
      }

      res.json({
        query: result.response.query,
        results: result.response.results,
        provider: result.meta.providerId,
        latencyMs: result.meta.latencyMs,
        answer: result.response.answer,
        fallbacksAttempted: result.meta.fallbacksAttempted,
      });
    } catch (searchError: any) {
      console.warn("[Central Search Provider Notice]:", searchError?.message);
      res.status(500).json({
        query: req.body?.query || "",
        results: [],
        error: searchError?.message || "Search failed",
      });
    }
  });

  // Providers Health & Status Diagnostic endpoint
  app.get("/api/providers/status", (_req, res) => {
    try {
      const summary = providerManager.getStatusSummary();
      res.json(summary);
    } catch (statusErr: any) {
      res.status(500).json({ error: "Failed to retrieve provider status" });
    }
  });

  // Text-To-Speech (TTS) Endpoint
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voiceName = "Aoede" } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required" });
      }

      const ai = getGenAI();

      // Clean text of emojis and special markdown before TTS for natural pronunciation
      let cleanedText = text
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .trim();

      if (req.body.language === "bn-en" || containsBanglaOrBanglish(cleanedText)) {
        cleanedText = normalizeBanglishPhonetics(cleanedText);
      }

      // Attempt TTS generation
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: cleanedText }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName || "Aoede" },
              },
            },
          },
        });

        const audioPart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
        if (audioPart && audioPart.inlineData) {
          return res.json({
            audio: audioPart.inlineData.data,
            mimeType: audioPart.inlineData.mimeType || "audio/pcm;rate=24000",
            sampleRate: 24000,
          });
        }
      } catch (ttsErr: any) {
        console.warn("Gemini TTS high-demand or unavailable, delegating to client voice synthesis:", ttsErr?.message);
      }

      // Return graceful fallback signal
      res.json({ audio: null, fallbackToBrowser: true });
    } catch (error: any) {
      console.error("TTS API error:", error);
      res.json({ audio: null, fallbackToBrowser: true });
    }
  });

  // -------------------------------------------------------------
  // Real-Time WebSocket Voice Bridge (Gemini Live API)
  // -------------------------------------------------------------
  wss.on("connection", (clientWs: WebSocket) => {
    console.log("WebSocket client connected for real-time Dora voice");

    let liveSession: any = null;
    let isConnecting = false;
    let activeScreenFrame: string | null = null;
    let activeCameraFrame: string | null = null;

    async function initLiveSession(voiceName = "Aoede", memoryContext = "", historyContext = "") {
      if (liveSession) {
        console.log("[VOICE DEBUG] Gemini Live session already active, sending session_ready");
        clientWs.send(JSON.stringify({ type: "session_ready" }));
        return;
      }
      if (isConnecting) return;
      isConnecting = true;

      console.log(`[VOICE DEBUG] Initializing Gemini Live session with voice: ${voiceName}...`);

      const liveModels = [
        "gemini-3.1-flash-live-preview",
      ];

      // Inject persistent pronoun preference directive into live voice session
      const pronounPref = languageStyleAdapter.getPronounPreference();
      const pronounDirectives = languageStyleAdapter.getPronounPromptDirectives(pronounPref);
      const pronounDirectiveContext = `\n\n[PERSISTENT PRONOUN PREFERENCE DIRECTIVE]\n${pronounDirectives.join("\n")}`;

      const effectiveSystemInstruction = [
        DORA_SYSTEM_INSTRUCTION,
        pronounDirectiveContext,
        memoryContext ? `\n\n${memoryContext}` : "",
        historyContext ? `\n\n[RECENT ACTIVE CONVERSATION CONTEXT]\n${historyContext}\n(Continue seamlessly from the above context in this voice session)` : "",
      ]
        .filter(Boolean)
        .join("\n");

      for (const model of liveModels) {
        try {
          console.log(`[VOICE DEBUG] Attempting Live connect to model: ${model}`);
          const ai = getGenAI();
          liveSession = await ai.live.connect({
            model,
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voiceName || "Aoede" },
                },
              },
              systemInstruction: effectiveSystemInstruction,
              outputAudioTranscription: {},
              inputAudioTranscription: {},
            },
            callbacks: {
              onmessage: (message: any) => {
                console.log("[VOICE DEBUG] Gemini Live message received from SDK:", Object.keys(message || {}).join(", "));

                // User input audio transcription (from Gemini Live speech-to-text)
                const userTranscriptText =
                  message.serverContent?.inputAudioTranscription?.text ||
                  message.inputAudioTranscription?.text ||
                  (message.serverContent?.userTurn?.parts?.map((p: any) => p.text || "").join("") || "") ||
                  (message.userTurn?.parts?.map((p: any) => p.text || "").join("") || "");

                if (userTranscriptText && userTranscriptText.trim()) {
                  console.log(`[VOICE DEBUG] speech recognition result from Live STT: "${userTranscriptText}"`);
                  clientWs.send(
                    JSON.stringify({
                      type: "user_transcript",
                      text: userTranscriptText,
                      isFinal: !!(
                        message.serverContent?.inputAudioTranscription?.isFinal ??
                        message.inputAudioTranscription?.isFinal ??
                        false
                      ),
                    })
                  );
                }

                // Model output audio stream parts
                const parts = message.serverContent?.modelTurn?.parts;
                if (parts) {
                  for (const part of parts) {
                    if (part.inlineData?.data) {
                      console.log(`[VOICE DEBUG] audio data received from Gemini: ${part.inlineData.data.length} base64 chars (${part.inlineData.mimeType || "audio/pcm"})`);
                      clientWs.send(
                        JSON.stringify({
                          type: "audio",
                          audio: part.inlineData.data,
                          mimeType: part.inlineData.mimeType || "audio/pcm;rate=24000",
                        })
                      );
                    }
                    if (part.text) {
                      console.log(`[VOICE DEBUG] Gemini Live transcript chunk: "${part.text}"`);
                      clientWs.send(
                        JSON.stringify({
                          type: "transcript_chunk",
                          sender: "dora",
                          text: part.text,
                        })
                      );
                    }
                  }
                }

                if (message.serverContent?.outputAudioTranscription?.text) {
                  clientWs.send(
                    JSON.stringify({
                      type: "transcript_chunk",
                      sender: "dora",
                      text: message.serverContent.outputAudioTranscription.text,
                    })
                  );
                }

                if (message.serverContent?.turnComplete) {
                  console.log("[VOICE DEBUG] Gemini Live turnComplete received");
                  clientWs.send(JSON.stringify({ type: "turn_complete" }));
                }

                if (message.serverContent?.interrupted) {
                  console.log("[VOICE DEBUG] Gemini Live interrupted received");
                  clientWs.send(JSON.stringify({ type: "interrupted" }));
                }
              },
              onerror: (err: any) => {
                console.error("[VOICE DEBUG] Gemini Live session error:", err?.message || err);
                clientWs.send(
                  JSON.stringify({
                    type: "live_error",
                    error: err?.message || "Live stream error",
                  })
                );
              },
              onclose: () => {
                console.log("[VOICE DEBUG] Gemini Live session closed");
                liveSession = null;
                clientWs.send(JSON.stringify({ type: "session_closed" }));
              },
            },
          });

          console.log(`[VOICE DEBUG] Gemini Live connection: OPEN (model: ${model})`);
          clientWs.send(JSON.stringify({ type: "session_ready", modelUsed: model }));
          isConnecting = false;
          return;
        } catch (err: any) {
          console.warn(`[VOICE DEBUG] Live connection with model ${model} failed:`, err?.message || err);
        }
      }

      isConnecting = false;
      console.warn("[VOICE DEBUG] Gemini Live connection could not be established; sending live_unavailable to client");
      clientWs.send(
        JSON.stringify({
          type: "live_unavailable",
          message: "Live API not active in this environment; fallback speech enabled.",
        })
      );
    }

    clientWs.on("message", async (raw: any) => {
      try {
        const data = JSON.parse(raw.toString());

        if (data.type === "start_session") {
          console.log("[VOICE DEBUG] Received start_session from frontend client");
          await initLiveSession(data.voiceName || "Aoede", data.memoryContext || "", data.historyContext || "");
        } else if (data.type === "camera_frame" && data.frame) {
          activeCameraFrame = data.frame;
          if (liveSession) {
            try {
              liveSession.sendRealtimeInput({
                video: { data: data.frame, mimeType: "image/jpeg" },
              });
            } catch (err: any) {
              console.warn("[Live Camera] Live API media stream frame error:", err?.message);
            }
          }
        } else if (data.type === "camera_stop") {
          activeCameraFrame = null;
        } else if (data.type === "screen_frame" && data.frame) {
          activeScreenFrame = data.frame;
          if (liveSession) {
            try {
              liveSession.sendRealtimeInput({
                video: { data: data.frame, mimeType: "image/jpeg" },
              });
            } catch (err: any) {
              console.warn("[Screen Vision] Live API media stream frame error:", err?.message);
            }
          }
        } else if (data.type === "screen_stop") {
          activeScreenFrame = null;
        } else if (data.type === "audio_input" && liveSession) {
          // Send 16kHz PCM audio chunk to Live API
          liveSession.sendRealtimeInput({
            audio: { data: data.audio, mimeType: "audio/pcm;rate=16000" },
          });
        } else if (data.type === "text_input") {
          console.log(`[VOICE DEBUG] Received text_input over WS: "${data.text}" (liveSession active: ${Boolean(liveSession)})`);
          if (!liveSession) {
            await initLiveSession(data.voiceName || "Aoede", data.memoryContext || "", data.historyContext || "");
          }
          if (liveSession) {
            let processedText = data.text;
            // If language is bn-en or input contains Banglish/Bengali, apply lightweight phonetic normalization
            if (data.language === "bn-en" || containsBanglaOrBanglish(data.text)) {
              processedText = normalizeBanglishPhonetics(data.text);
            }

            if (data.deepThink) {
              processedText = `[Deep Think requested: Think through this carefully and step-by-step] ${processedText}`;
            }

            const userParts: any[] = [{ text: processedText }];
            const activeVisual = activeCameraFrame || activeScreenFrame;
            if (activeVisual) {
              userParts.push({
                inlineData: {
                  mimeType: "image/jpeg",
                  data: activeVisual,
                },
              });
            }

            console.log(`[VOICE DEBUG] Sending user content to Gemini Live session: "${processedText}"`);
            try {
              liveSession.sendClientContent({
                turns: [{ role: "user", parts: userParts }],
                turnComplete: true,
              });
              console.log("[VOICE DEBUG] sendClientContent completed successfully");
            } catch (err: any) {
              console.warn("[VOICE DEBUG] sendClientContent failed, attempting sendRealtimeInput:", err?.message);
              try {
                liveSession.sendRealtimeInput({ text: processedText });
              } catch (_) {}
            }
          } else {
            console.error("[VOICE DEBUG] Cannot send text to Gemini Live: liveSession is null");
          }
        } else if (data.type === "proactive_trigger") {
          console.log(`[PROACTIVE RUNTIME] Received proactive_trigger event: "${data.promptInstruction}"`);
          if (!liveSession) {
            await initLiveSession(data.voiceName || "Aoede", data.memoryContext || "", data.historyContext || "");
          }
          if (liveSession) {
            const proactiveText = data.promptInstruction || "[PROACTIVE INITIATION: Greet user warmly in natural Banglish.]";
            const userParts: any[] = [{ text: proactiveText }];
            const activeVisual = activeCameraFrame || activeScreenFrame;
            if (activeVisual) {
              userParts.push({
                inlineData: {
                  mimeType: "image/jpeg",
                  data: activeVisual,
                },
              });
            }
            try {
              liveSession.sendClientContent({
                turns: [{ role: "user", parts: userParts }],
                turnComplete: true,
              });
              console.log("[PROACTIVE RUNTIME] Proactive trigger sent to Gemini Live successfully");
            } catch (err: any) {
              console.warn("[PROACTIVE RUNTIME] Failed to send proactive trigger to Live API:", err?.message);
            }
          }
        } else if (data.type === "interrupt") {
          if (liveSession) {
            // Signal interruption to clear any queued model generation
            try {
              liveSession.sendRealtimeInput({});
            } catch (_) {}
          }
        }
      } catch (err) {
        console.error("Error processing WS message:", err);
      }
    });

    clientWs.on("close", () => {
      console.log("Client WS disconnected");
      if (liveSession) {
        try {
          liveSession.close();
        } catch (_) {}
        liveSession = null;
      }
    });
  });

  // -------------------------------------------------------------
  // Vite Middleware & Static Assets
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Dora Voice Assistant server running on http://localhost:${PORT}`);
    try {
      runAllProactiveEngineTests();
      runAllLanguageStyleAdapterTests();
    } catch (e) {
      console.warn("Startup tests warning:", e);
    }
  });
}

startServer();
