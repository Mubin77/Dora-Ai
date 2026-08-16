import express from "express";
import http from "http";
import path from "path";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { DORA_SYSTEM_INSTRUCTION } from "./src/doraSystemPrompt";
import { normalizeBanglishPhonetics, containsBanglaOrBanglish } from "./src/utils/banglaPhonetics";

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
      capabilities: ["live-audio", "tts-synthesis", "gemini-3.7-flash", "real-time-chat"],
      timestamp: Date.now(),
    });
  });

  // Helper function to generate content with fallback models and retry
  async function generateDoraResponse(
    ai: GoogleGenAI,
    contents: Array<{ role: "user" | "model"; parts: Array<any> }>,
    systemInstruction: string,
    deepThink: boolean = false
  ): Promise<{ text: string; modelUsed: string }> {
    const candidateModels = deepThink
      ? [
          "gemini-2.5-pro",
          "gemini-3.7-flash",
          "gemini-2.5-flash",
          "gemini-flash-latest",
        ]
      : [
          "gemini-2.5-flash",
          "gemini-3.7-flash",
          "gemini-3.1-flash-lite",
          "gemini-flash-latest",
        ];

    let lastError: any = null;

    for (const model of candidateModels) {
      // Try up to 2 attempts per model for transient errors
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const config: any = {
            systemInstruction,
            temperature: deepThink ? 0.65 : 0.85,
            topP: 0.95,
          };

          if (deepThink && (model.includes("2.5") || model.includes("3.7"))) {
            config.thinkingConfig = { thinkingBudget: 4096 };
          }

          const response = await ai.models.generateContent({
            model,
            contents,
            config,
          });

          if (response && response.text) {
            return { text: response.text, modelUsed: model };
          }
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || String(err);
          
          // If it's a 503 (high demand) or 429 (rate limit), wait briefly or try fallback
          if (attempt === 0 && (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("high demand") || errMsg.includes("429"))) {
            await new Promise((resolve) => setTimeout(resolve, 600));
            continue;
          }
          // Move to next candidate model
          break;
        }
      }
    }

    throw lastError || new Error("All Gemini candidate models failed to respond");
  }

  // Chat endpoint for conversational turn
  app.post("/api/chat", async (req, res) => {
    try {
      const {
        message,
        history = [],
        language = "auto",
        memoryContext = "",
        screenFrame = null,
        imageAttachment = null,
        deepThink = false,
      } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      const ai = getGenAI();

      // Format conversation history for multi-turn context
      const contents: Array<{ role: "user" | "model"; parts: Array<any> }> = [];

      // Add recent history context (up to last 12 turns)
      const recentHistory = Array.isArray(history) ? history.slice(-12) : [];
      for (const h of recentHistory) {
        if (h.sender === "user" && h.text) {
          contents.push({ role: "user", parts: [{ text: h.text }] });
        } else if (h.sender === "dora" && h.text) {
          contents.push({ role: "model", parts: [{ text: h.text }] });
        }
      }

      // Add current message with optional real-time screen or image attachment
      const userParts: Array<any> = [{ text: message }];
      if (imageAttachment && typeof imageAttachment === "string") {
        const cleanBase64 = imageAttachment.replace(/^data:image\/[a-z]+;base64,/, "");
        userParts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: cleanBase64,
          },
        });
      } else if (screenFrame && typeof screenFrame === "string") {
        const cleanBase64 = screenFrame.replace(/^data:image\/[a-z]+;base64,/, "");
        userParts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: cleanBase64,
          },
        });
      }
      contents.push({ role: "user", parts: userParts });

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
        memoryContext ? `\n\n${memoryContext}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      let reply = "Yeah, I'm here. What's on your mind?";
      try {
        const result = await generateDoraResponse(
          ai,
          contents,
          effectiveSystemInstruction,
          Boolean(deepThink)
        );
        reply = result.text;
      } catch (genError: any) {
        console.warn("Falling back to in-character resilience reply due to model unavailability:", genError?.message);
        reply = "Hey, I'm right here with you! Caught a tiny glitch on the connection, but I'm listening. Tell me what's on your mind.";
      }

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

  // Background deep memory extraction endpoint
  app.post("/api/memory/extract", async (req, res) => {
    try {
      const { userText, doraResponse = "", existingMemories = [] } = req.body;
      if (!userText || typeof userText !== "string" || userText.trim().length < 5) {
        return res.json({ candidates: [] });
      }

      const ai = getGenAI();
      const prompt = `
You are the background intelligent long-term memory extraction engine for Dora, an authentic AI companion.
Analyze the user message (and Dora's response) in ANY language (English, Bengali, Banglish, or mixed) to extract durable, valuable facts about the user for persistent long-term memory.

SELECTIVE IMPORTANCE & FILTERING DIRECTIVES:
DO NOT STORE:
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

      const extractionModels = [
        "gemini-2.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-3.7-flash",
        "gemini-flash-latest",
      ];

      let candidates = [];
      let lastExtractError: any = null;

      for (const model of extractionModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          });

          if (response && response.text) {
            const parsed = JSON.parse(response.text.trim());
            if (Array.isArray(parsed)) {
              candidates = parsed;
              break;
            }
          }
        } catch (modelErr: any) {
          lastExtractError = modelErr;
          const errMsg = modelErr?.message || String(modelErr);
          // If 503 or 429, wait a split second and continue to fallback model
          if (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("high demand") || errMsg.includes("429")) {
            await new Promise((resolve) => setTimeout(resolve, 400));
          }
          continue;
        }
      }

      if (candidates.length === 0 && lastExtractError) {
        // Quiet debug log without noisy warning spam
        const errNotice = lastExtractError?.message || String(lastExtractError);
        if (!errNotice.includes("503") && !errNotice.includes("UNAVAILABLE") && !errNotice.includes("high demand")) {
          console.warn("[Background Extraction Notice]:", errNotice);
        }
      }

      res.json({ candidates });
    } catch (err: any) {
      res.json({ candidates: [] });
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

    async function initLiveSession(voiceName = "Aoede", memoryContext = "") {
      if (liveSession) {
        clientWs.send(JSON.stringify({ type: "session_ready" }));
        return;
      }
      if (isConnecting) return;
      isConnecting = true;

      const liveModels = [
        "gemini-3.1-flash-live-preview",
        "gemini-2.5-flash",
      ];

      const effectiveSystemInstruction = [
        DORA_SYSTEM_INSTRUCTION,
        memoryContext ? `\n\n${memoryContext}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      for (const model of liveModels) {
        try {
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
                // User input audio transcription (from Gemini Live speech-to-text)
                const userTranscriptText =
                  message.serverContent?.inputAudioTranscription?.text ||
                  message.inputAudioTranscription?.text ||
                  (message.serverContent?.userTurn?.parts?.map((p: any) => p.text || "").join("") || "") ||
                  (message.userTurn?.parts?.map((p: any) => p.text || "").join("") || "");

                if (userTranscriptText && userTranscriptText.trim()) {
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
                      clientWs.send(
                        JSON.stringify({
                          type: "audio",
                          audio: part.inlineData.data,
                          mimeType: part.inlineData.mimeType || "audio/pcm;rate=24000",
                        })
                      );
                    }
                    if (part.text) {
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
                  clientWs.send(JSON.stringify({ type: "turn_complete" }));
                }

                if (message.serverContent?.interrupted) {
                  clientWs.send(JSON.stringify({ type: "interrupted" }));
                }
              },
              onerror: (err: any) => {
                console.warn("Live API session error:", err?.message || err);
                clientWs.send(
                  JSON.stringify({
                    type: "live_error",
                    error: err?.message || "Live stream error",
                  })
                );
              },
              onclose: () => {
                console.log("Live session closed");
                liveSession = null;
                clientWs.send(JSON.stringify({ type: "session_closed" }));
              },
            },
          });

          clientWs.send(JSON.stringify({ type: "session_ready", modelUsed: model }));
          isConnecting = false;
          return;
        } catch (err: any) {
          console.warn(`Live connection with model ${model} failed:`, err?.message || err);
        }
      }

      isConnecting = false;
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
          await initLiveSession(data.voiceName || "Aoede", data.memoryContext || "");
        } else if (data.type === "screen_frame" && data.frame) {
          activeScreenFrame = data.frame;
          if (liveSession) {
            try {
              liveSession.sendRealtimeInput({
                media: { data: data.frame, mimeType: "image/jpeg" },
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
          if (!liveSession) {
            await initLiveSession(data.voiceName || "Aoede", data.memoryContext || "");
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
            if (activeScreenFrame) {
              userParts.push({
                inlineData: {
                  mimeType: "image/jpeg",
                  data: activeScreenFrame,
                },
              });
            }

            try {
              liveSession.sendClientContent({
                turns: [{ role: "user", parts: userParts }],
                turnComplete: true,
              });
            } catch (err: any) {
              console.warn("sendClientContent failed, attempting sendRealtimeInput:", err?.message);
              try {
                liveSession.sendRealtimeInput({ text: processedText });
              } catch (_) {}
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
  });
}

startServer();
