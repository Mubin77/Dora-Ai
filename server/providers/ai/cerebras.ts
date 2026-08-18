import { AIProvider, AIRequest, AIResponse, AICapability } from "../types";
import { isRealApiKey } from "./google";

export class CerebrasProvider implements AIProvider {
  public readonly id = "cerebras";
  public readonly name = "Cerebras";
  public readonly category = "ai" as const;
  public readonly capabilities: AICapability[] = [
    "chat",
    "fast-inference",
    "code",
    "json-mode",
    "extraction",
  ];
  public readonly defaultModel = "llama3.3-70b";
  public readonly supportedModels = ["llama3.3-70b", "llama3.1-8b"];

  private readonly API_URL = "https://api.cerebras.ai/v1/chat/completions";

  public isConfigured(): boolean {
    return isRealApiKey(process.env.CEREBRAS_API_KEY);
  }

  public async generate(request: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.CEREBRAS_API_KEY;
    if (!apiKey) {
      throw new Error("CEREBRAS_API_KEY is not configured");
    }

    const startTime = Date.now();
    const targetModel =
      request.model ||
      (request.task === "fast-inference" ? "llama3.1-8b" : this.defaultModel);

    const messages: Array<{ role: string; content: string }> = [];

    if (request.systemInstruction) {
      messages.push({
        role: "system",
        content: request.systemInstruction,
      });
    }

    for (const msg of request.messages) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
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
        const errObj: any = new Error(`Cerebras API error ${status}: ${errText}`);
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
