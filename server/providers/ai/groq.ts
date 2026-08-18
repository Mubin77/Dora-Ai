import { AIProvider, AIRequest, AIResponse, AICapability } from "../types";
import { isRealApiKey } from "./google";

export class GroqProvider implements AIProvider {
  public readonly id = "groq";
  public readonly name = "Groq";
  public readonly category = "ai" as const;
  public readonly capabilities: AICapability[] = [
    "chat",
    "fast-inference",
    "vision",
    "code",
    "json-mode",
    "extraction",
  ];
  public readonly defaultModel = "llama-3.3-70b-versatile";
  public readonly supportedModels = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "llama-3.2-11b-vision-preview",
    "mixtral-8x7b-32768",
    "deepseek-r1-distill-llama-70b",
  ];

  private readonly API_URL = "https://api.groq.com/openai/v1/chat/completions";

  public isConfigured(): boolean {
    return isRealApiKey(process.env.GROQ_API_KEY);
  }

  public async generate(request: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const startTime = Date.now();
    const hasImage = request.messages.some((m) => m.image?.base64Data);

    let targetModel = request.model;
    if (!targetModel) {
      if (hasImage) {
        targetModel = "llama-3.2-11b-vision-preview";
      } else if (request.deepThink) {
        targetModel = "deepseek-r1-distill-llama-70b";
      } else if (request.task === "fast-inference") {
        targetModel = "llama-3.1-8b-instant";
      } else {
        targetModel = this.defaultModel;
      }
    }

    // Build OpenAI-compatible messages array
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
          "User-Agent": "dora-central-provider",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        const status = res.status;
        const errObj: any = new Error(`Groq API error ${status}: ${errText}`);
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
