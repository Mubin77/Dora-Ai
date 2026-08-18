import { GoogleGenAI } from "@google/genai";
import { AIProvider, AIRequest, AIResponse, AICapability } from "../types";

export function isRealApiKey(key?: string): boolean {
  if (!key) return false;
  const trimmed = key.trim().replace(/^["']|["']$/g, "").trim();
  if (trimmed.length < 6) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("my_") ||
    lower.startsWith("your_") ||
    lower.startsWith("enter_") ||
    lower.includes("placeholder") ||
    lower === "undefined" ||
    lower === "null"
  ) {
    return false;
  }
  return true;
}

export class GoogleGeminiProvider implements AIProvider {
  public readonly id = "google";
  public readonly name = "Google Gemini";
  public readonly category = "ai" as const;
  public readonly capabilities: AICapability[] = [
    "chat",
    "reasoning",
    "vision",
    "code",
    "extraction",
    "json-mode",
  ];
  public readonly defaultModel = "gemini-2.5-flash";
  public readonly supportedModels = [
    "gemini-2.5-flash",
    "gemini-3.7-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.5-pro",
    "gemini-flash-latest",
  ];

  private client: GoogleGenAI | null = null;

  public isConfigured(): boolean {
    return isRealApiKey(process.env.GEMINI_API_KEY);
  }

  private getClient(): GoogleGenAI {
    if (!this.client) {
      const apiKey = process.env.GEMINI_API_KEY || "";
      this.client = new GoogleGenAI({
        apiKey: apiKey || undefined,
        httpOptions: {
          headers: {
            "User-Agent": "dora-central-provider",
          },
        },
      });
    }
    return this.client;
  }

  public async generate(request: AIRequest): Promise<AIResponse> {
    if (request.simulateFailure) {
      throw new Error("Simulated upstream primary provider 503 outage for fallback test");
    }

    const startTime = Date.now();
    const client = this.getClient();

    const hasImage = request.messages.some((m) => m.image?.base64Data);

    // Build candidate model list with automatic fallbacks
    const candidateModels: string[] = [];
    if (request.model) {
      candidateModels.push(request.model);
    }

    if (request.deepThink) {
      const reasoningModels = [
        "gemini-2.5-pro",
        "gemini-3.7-flash",
        "gemini-2.5-flash",
        "gemini-flash-latest",
      ];
      for (const m of reasoningModels) {
        if (!candidateModels.includes(m)) candidateModels.push(m);
      }
    } else if (hasImage) {
      const visionModels = [
        "gemini-2.5-flash",
        "gemini-3.7-flash",
        "gemini-2.5-pro",
        "gemini-flash-latest",
      ];
      for (const m of visionModels) {
        if (!candidateModels.includes(m)) candidateModels.push(m);
      }
    } else {
      const standardModels = [
        "gemini-2.5-flash",
        "gemini-3.7-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
      ];
      for (const m of standardModels) {
        if (!candidateModels.includes(m)) candidateModels.push(m);
      }
    }

    // Format contents
    const contents: Array<{ role: "user" | "model"; parts: Array<any> }> = [];

    for (const msg of request.messages) {
      if (msg.role === "system") continue; // Handled in systemInstruction config

      const role = msg.role === "assistant" ? "model" : "user";
      const parts: Array<any> = [{ text: msg.content }];

      if (msg.image && msg.image.base64Data) {
        const cleanBase64 = msg.image.base64Data.replace(/^data:image\/[a-z]+;base64,/, "");
        parts.push({
          inlineData: {
            mimeType: msg.image.mimeType || "image/jpeg",
            data: cleanBase64,
          },
        });
      }

      contents.push({ role, parts });
    }

    if (contents.length === 0) {
      contents.push({ role: "user", parts: [{ text: "Hello" }] });
    }

    let lastError: any = null;

    // Try candidate models in order
    for (const model of candidateModels) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const config: any = {
            systemInstruction: request.systemInstruction,
            temperature: request.temperature ?? (request.deepThink ? 0.65 : 0.85),
            topP: request.topP ?? 0.95,
          };

          if (request.maxTokens) {
            config.maxOutputTokens = request.maxTokens;
          }

          if (request.jsonMode) {
            config.responseMimeType = "application/json";
          }

          if (request.deepThink && (model.includes("2.5") || model.includes("3.7"))) {
            config.thinkingConfig = { thinkingBudget: 2048 };
          }

          const response = await client.models.generateContent({
            model,
            contents,
            config,
          });

          const latencyMs = Date.now() - startTime;
          const text = response?.text || "";

          return {
            text,
            providerId: this.id,
            modelUsed: model,
            latencyMs,
            usage: response.usageMetadata
              ? {
                  promptTokens: response.usageMetadata.promptTokenCount,
                  completionTokens: response.usageMetadata.candidatesTokenCount,
                  totalTokens: response.usageMetadata.totalTokenCount,
                }
              : undefined,
          };
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || String(err);
          const isRetryable =
            errMsg.includes("503") ||
            errMsg.includes("UNAVAILABLE") ||
            errMsg.includes("high demand") ||
            errMsg.includes("429") ||
            errMsg.includes("RESOURCE_EXHAUSTED") ||
            errMsg.includes("quota");

          if (attempt === 0 && isRetryable) {
            // Brief backoff before retry or trying next model
            await new Promise((r) => setTimeout(r, 400));
            continue;
          }

          // Move to next candidate Gemini model
          break;
        }
      }
    }

    throw lastError || new Error("All Gemini candidate models failed to generate content");
  }
}

