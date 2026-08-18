import { SearchProvider, SearchRequest, SearchResponse, SearchResultItem, SearchCapability } from "../types";
import { isRealApiKey } from "../ai/google";

export class TavilySearchProvider implements SearchProvider {
  public readonly id = "tavily";
  public readonly name = "Tavily Search";
  public readonly category = "search" as const;
  public readonly capabilities: SearchCapability[] = [
    "web-search",
    "news",
    "deep-crawl",
    "raw-content",
    "summary",
  ];

  private readonly API_URL = "https://api.tavily.com/search";

  private getApiKey(): string | undefined {
    return (
      process.env.TAVILY_API_KEY ||
      process.env.TAVILY_KEY ||
      process.env.TVLY_API_KEY ||
      process.env.TAVILY_TOKEN
    );
  }

  public isConfigured(): boolean {
    return isRealApiKey(this.getApiKey());
  }

  public async search(request: SearchRequest): Promise<SearchResponse> {
    if (request.simulateFailure || request.simulateTavilyFailure) {
      throw new Error("Simulated Tavily Search upstream 503 outage for fallback test");
    }

    const apiKey = this.getApiKey();
    if (!apiKey || !isRealApiKey(apiKey)) {
      throw new Error("Tavily API key is not configured");
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs || 10000);

    try {
      const topic = request.topic || (request.freshness === "today" || request.freshness === "this_week" ? "news" : "general");
      let days = request.days;
      if (!days) {
        if (request.freshness === "today") {
          days = 2;
        } else if (request.freshness === "this_week") {
          days = 7;
        } else if (request.freshness === "this_month" || request.freshness === "recent") {
          days = 30;
        }
      }

      const excludeDomains = [
        ...(request.excludeDomains || []),
        "aitoolmind.com",
        "topai.tools",
        "allthingsai.com",
        "futurepedia.io",
        "therundown.ai",
        "toolify.ai",
      ];

      const requestBody: Record<string, any> = {
        api_key: apiKey,
        query: request.query,
        max_results: Math.max(request.limit || 5, 8),
        search_depth: request.searchDepth || "basic",
        include_answer: request.includeAnswer ?? true,
        include_raw_content: false,
        topic,
        exclude_domains: excludeDomains,
      };

      if (days && topic === "news") {
        requestBody.days = days;
      }

      const response = await fetch(this.API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "dora-central-search",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        const error = new Error(`Tavily API returned ${response.status}: ${errText.slice(0, 200)}`);
        (error as any).statusCode = response.status;
        (error as any).isRateLimit = response.status === 429;
        (error as any).isAuthError = response.status === 401 || response.status === 403;
        throw error;
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      const rawResults = Array.isArray(data.results) ? data.results : [];
      const normalizedResults: SearchResultItem[] = rawResults.map((item: any) => ({
        title: item.title || "Untitled",
        url: item.url || "",
        snippet: item.content || item.snippet || "",
        content: item.raw_content || item.content,
        score: typeof item.score === "number" ? item.score : undefined,
        publishedAt: item.published_date || undefined,
        source: item.source || (item.url ? new URL(item.url).hostname : undefined),
      }));

      return {
        query: request.query,
        results: normalizedResults,
        providerId: this.id,
        latencyMs,
        answer: data.answer || undefined,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        const timeoutErr = new Error(`Tavily search timed out after ${request.timeoutMs || 10000}ms`);
        (timeoutErr as any).isTimeout = true;
        throw timeoutErr;
      }
      throw err;
    }
  }
}
