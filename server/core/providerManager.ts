import {
  AIRequest,
  AIResponse,
  ExecutionMeta,
  SearchRequest,
  SearchResponse,
  SearchExecutionResult,
} from "../providers/types";
import { ProviderRegistry } from "../providers/registry";
import { SmartAIRouter } from "./router";
import { FallbackExecutor, FallbackExecutionResult } from "./fallback";
import { ProviderHealthTracker } from "./health";

export class CentralProviderManager {
  private static instance: CentralProviderManager;
  private registry = ProviderRegistry.getInstance();
  private router = new SmartAIRouter();
  private fallbackExecutor = new FallbackExecutor();
  private healthTracker = ProviderHealthTracker.getInstance();

  private constructor() {}

  public static getInstance(): CentralProviderManager {
    if (!CentralProviderManager.instance) {
      CentralProviderManager.instance = new CentralProviderManager();
    }
    return CentralProviderManager.instance;
  }

  /**
   * Executes an AI request through the central routing and fallback engine
   */
  public async executeAI(request: AIRequest): Promise<FallbackExecutionResult> {
    const route = this.router.resolveRoute(request);

    if (!route.primaryProvider.isConfigured() && route.fallbackProviders.length === 0) {
      throw new Error(
        "No AI providers are currently configured with active API keys (e.g. GEMINI_API_KEY, GROQ_API_KEY, CEREBRAS_API_KEY, MISTRAL_API_KEY, OPENROUTER_API_KEY, HUGGINGFACE_API_KEY)."
      );
    }

    return this.fallbackExecutor.executeWithFallback(
      route.primaryProvider,
      route.fallbackProviders,
      request
    );
  }

  /**
   * Executes a search request through the central search routing and fallback engine
   */
  public async executeSearch(request: SearchRequest): Promise<SearchExecutionResult> {
    const route = this.router.resolveSearchRoute(request);

    if (!route.primaryProvider.isConfigured() && route.fallbackProviders.length === 0) {
      throw new Error(
        "No Search providers are currently configured with active API keys (e.g. TAVILY_API_KEY, JINA_API_KEY)."
      );
    }

    return this.fallbackExecutor.executeSearchWithFallback(
      route.primaryProvider,
      route.fallbackProviders,
      request
    );
  }

  /**
   * Returns a sanitized summary of provider statuses for diagnostics and UI status endpoints
   */
  public getStatusSummary(): {
    ai: Record<string, any>;
    search: Record<string, any>;
    voice: Record<string, any>;
    data: Record<string, any>;
    providers: Record<string, {
      name: string;
      category: string;
      configured: boolean;
      healthy: boolean;
      averageLatencyMs: number;
      consecutiveFailures: number;
      inCooldown: boolean;
    }>;
    totalConfigured: number;
    timestamp: number;
  } {
    const allProviders = this.registry.getAllProviders();
    const healthSummary = this.healthTracker.getAllStatuses();
    const providers: Record<string, any> = {};
    const ai: Record<string, any> = {};
    const search: Record<string, any> = {};
    const voice: Record<string, any> = {};
    const data: Record<string, any> = {};

    let totalConfigured = 0;

    for (const p of allProviders) {
      const isConfigured = p.isConfigured();
      if (isConfigured) totalConfigured++;

      const health = healthSummary[p.id] || {
        configured: isConfigured,
        healthy: isConfigured,
        averageLatencyMs: 0,
        consecutiveFailures: 0,
        inCooldown: false,
      };

      const info = {
        name: p.name,
        category: p.category,
        configured: isConfigured,
        healthy: health.healthy,
        averageLatencyMs: health.averageLatencyMs,
        consecutiveFailures: health.consecutiveFailures,
        inCooldown: health.inCooldown,
      };

      providers[p.id] = info;

      if (p.category === "ai") ai[p.id] = info;
      else if (p.category === "search") search[p.id] = info;
      else if (p.category === "voice") voice[p.id] = info;
      else if (p.category === "data") data[p.id] = info;
    }

    return {
      ai,
      search,
      voice,
      data,
      providers,
      totalConfigured,
      timestamp: Date.now(),
    };
  }

  public getRegistry(): ProviderRegistry {
    return this.registry;
  }

  public getHealthTracker(): ProviderHealthTracker {
    return this.healthTracker;
  }
}

export const providerManager = CentralProviderManager.getInstance();

