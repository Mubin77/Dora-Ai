import { AIProvider, AIRequest, AIResponse, AICapability } from "../types";
import { isRealApiKey } from "./google";

export class OpenRouterProvider implements AIProvider {
  public readonly id = "openrouter";
  public readonly name = "OpenRouter";
  public readonly category = "ai" as const;
  public readonly capabilities: AICapability[] = [
    "chat",
    "reasoning",
    "vision",
    "code",
    "fast-inference",
    "json-mode",
    "extraction",
  ];
  public readonly defaultModel = "meta-llama/llama-3.3-70b-instruct";
  public readonly supportedModels = [
    "meta-llama/llama-3.3-70b-instruct",
    "google/gemini-2.5-flash",
    "deepseek/deepseek-r1",
    "anthropic/claude-3.5-sonnet",
    "mistralai/mistral-large-2411",
  ];

  private readonly API_URL = "https://openrouter.ai/api/v1/chat/completions";

  public isConfigured(): boolean {
    return isRealApiKey(process.env.OPENROUTER_API_KEY);
  }

  public async generate(request: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const startTime = Date.now();
    const hasImage = request.messages.some((m) => m.image?.base64Data);

    let targetModel = request.model;
    if (!targetModel) {
      if (request.deepThink) {
        targetModel = "deepseek/deepseek-r1";
      } else if (hasImage) {
        targetModel = "google/gemini-2.5-flash";
      } else if (request.task === "fast-inference") {
        targetModel = "meta-llama/llama-3.3-70b-instruct";
      } else {
        targetModel = this.defaultModel;
      }
    }

    const messages: Array<{ role: string; content: any }> = [];

    if (request.systemInstruction) {
      messages.push({
        role: "system",
        content: request.systemInstruction,
      });
    }

    for (const msg of request.messages) {
      if (msg.image && msg.image.base64Data) {
        const mime = msg.image.mimeType || "image/jpeg";
        const dataUrl = msg.image.base64Data.startsWith("data:")
          ? msg.image.base64Data
          : `data:${mime};base64,${msg.image.base64Data}`;

        messages.push({
          role: msg.role,
          content: [
            { type: "text", text: msg.content },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        });
      } else {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    const payload: Record<string, any> = {
      model: targetModel,
      messages,
      temperature: request.temperature ?? 0.7,
      top_p: request.topP ?? 0.95,
      max_tokens: request.maxTokens ?? 2048,
    };

    if (request.jsonMode) {
      payload.response_format = { type: "json_object" };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs || 25_000);

    try {
      const res = await fetch(this.API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://dora-ai.internal",
          "X-Title": "Dora AI Assistant",
          "User-Agent": "dora-central-provider",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        const status = res.status;
        const errObj: any = new Error(`OpenRouter API error ${status}: ${errText}`);
        errObj.statusCode = status;
        errObj.isRateLimit = status === 429;
        errObj.isAuthError = status === 401 || status === 403;
        throw errObj;
      }

      const data = await res.json();
      const latencyMs = Date.now() - startTime;
      const text = data.choices?.[0]?.message?.content || "";

      return {
        text,
        providerId: this.id,
        modelUsed: targetModel,
        latencyMs,
        finishReason: data.choices?.[0]?.finish_reason,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
