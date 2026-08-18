import { AIProvider, AIRequest, AIResponse, AICapability } from "../types";
import { isRealApiKey } from "./google";

export class HuggingFaceProvider implements AIProvider {
  public readonly id = "huggingface";
  public readonly name = "Hugging Face";
  public readonly category = "ai" as const;
  public readonly capabilities: AICapability[] = [
    "chat",
    "reasoning",
    "code",
    "json-mode",
    "extraction",
  ];
  public readonly defaultModel = "meta-llama/Meta-Llama-3-70B-Instruct";
  public readonly supportedModels = [
    "meta-llama/Meta-Llama-3-70B-Instruct",
    "mistralai/Mistral-7B-Instruct-v0.3",
    "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B",
    "Qwen/Qwen2.5-Coder-32B-Instruct",
  ];

  // Hugging Face OpenAI-compatible Serverless Inference Router endpoint
  private readonly API_URL = "https://router.huggingface.co/hf-inference/v1/chat/completions";

  public isConfigured(): boolean {
    return isRealApiKey(process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN);
  }

  public async generate(request: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
    if (!apiKey) {
      throw new Error("HUGGINGFACE_API_KEY is not configured");
    }

    const startTime = Date.now();
    let targetModel = request.model;
    if (!targetModel) {
      if (request.deepThink) {
        targetModel = "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B";
      } else {
        targetModel = this.defaultModel;
      }
    }

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
        const errObj: any = new Error(`Hugging Face API error ${status}: ${errText}`);
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
