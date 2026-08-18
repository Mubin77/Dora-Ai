import { SearchProvider, SearchRequest, SearchResponse, SearchResultItem, SearchCapability } from "../types";
import { isRealApiKey } from "../ai/google";

export class JinaSearchProvider implements SearchProvider {
  public readonly id = "jina";
  public readonly name = "Jina AI Search";
  public readonly category = "search" as const;
  public readonly capabilities: SearchCapability[] = [
    "web-search",
    "deep-crawl",
    "raw-content",
  ];

  private readonly API_URL = "https://s.jina.ai/";

  public isConfigured(): boolean {
    return isRealApiKey(process.env.JINA_API_KEY);
  }

  public async search(request: SearchRequest): Promise<SearchResponse> {
    if (request.simulateFailure || request.simulateJinaFailure) {
      throw new Error("Simulated Jina AI Search upstream 503 outage for fallback test");
    }

    const apiKey = process.env.JINA_API_KEY;
    if (!apiKey || !isRealApiKey(apiKey)) {
      throw new Error("Jina API key is not configured");
    }

    const startTime = Date.now();
    const url = `${this.API_URL}${encodeURIComponent(request.query)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs || 15000);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-No-Cache": "true",
          "User-Agent": "dora-central-search",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        const error = new Error(`Jina AI API returned ${response.status}: ${errText.slice(0, 200)}`);
        (error as any).statusCode = response.status;
        (error as any).isRateLimit = response.status === 429;
        (error as any).isAuthError = response.status === 401 || response.status === 403;
        throw error;
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      const rawItems = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
      const limit = Math.max(request.limit || 5, 8);
      const normalizedResults: SearchResultItem[] = rawItems.slice(0, limit).map((item: any) => ({
        title: item.title || "Untitled",
        url: item.url || "",
        snippet: item.description || (item.content ? item.content.slice(0, 300) : ""),
        content: item.content,
        publishedAt: item.publishedTime || item.published_time || item.date || undefined,
        source: item.url ? new URL(item.url).hostname : undefined,
      }));

      return {
        query: request.query,
        results: normalizedResults,
        providerId: this.id,
        latencyMs,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        const timeoutErr = new Error(`Jina Search timed out after ${request.timeoutMs || 10000}ms`);
        (timeoutErr as any).isTimeout = true;
        throw timeoutErr;
      }
      throw err;
    }
  }
}
