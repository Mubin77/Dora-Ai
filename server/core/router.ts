import { AIRequest, AIProvider, AITaskType, SearchRequest, SearchProvider } from "../providers/types";
import { ProviderRegistry } from "../providers/registry";
import { ProviderHealthTracker } from "./health";

export interface RoutingDecision {
  primaryProvider: AIProvider;
  fallbackProviders: AIProvider[];
  task: AITaskType;
  requiresVision: boolean;
}

export interface SearchRoutingDecision {
  primaryProvider: SearchProvider;
  fallbackProviders: SearchProvider[];
}

export class SmartAIRouter {
  private registry = ProviderRegistry.getInstance();
  private healthTracker = ProviderHealthTracker.getInstance();

  /**
   * Routing priority configurations per task
   */
  private readonly routingPriorities: Record<AITaskType, string[]> = {
    chat: ["google", "groq", "cerebras", "mistral", "openrouter", "huggingface"],
    "fast-inference": ["groq", "cerebras", "google", "openrouter", "mistral", "huggingface"],
    reasoning: ["google", "openrouter", "groq", "mistral", "cerebras", "huggingface"],
    vision: ["google", "groq", "mistral", "openrouter"],
    extraction: ["google", "groq", "cerebras", "mistral", "openrouter", "huggingface"],
    general: ["google", "groq", "cerebras", "mistral", "openrouter", "huggingface"],
  };

  /**
   * Search routing priority: Tavily -> Jina
   */
  private readonly searchPriorities: string[] = ["tavily", "jina"];

  /**
   * Resolves the best available AI provider chain for a given request
   */
  public resolveRoute(request: AIRequest): RoutingDecision {
    const hasImage = request.messages.some((m) => m.image?.base64Data);

    // Determine effective task type
    let task: AITaskType = request.task || "chat";
    if (hasImage) {
      task = "vision";
    } else if (request.deepThink) {
      task = "reasoning";
    }

    const priorityList = [...(this.routingPriorities[task] || this.routingPriorities.general)];

    // If a preferred provider was specified, put it first in the evaluation list
    if (request.preferredProviderId) {
      const idx = priorityList.indexOf(request.preferredProviderId);
      if (idx > -1) {
        priorityList.splice(idx, 1);
      }
      priorityList.unshift(request.preferredProviderId);
    }

    // Filter and score candidates
    const eligibleProviders: AIProvider[] = [];
    const inCooldownCandidates: AIProvider[] = [];

    for (const providerId of priorityList) {
      const provider = this.registry.getAIProvider(providerId);
      if (!provider) continue;

      // Must be configured (API key exists)
      if (!provider.isConfigured()) continue;

      // If vision is required, provider must support vision
      if (hasImage && !provider.capabilities.includes("vision")) continue;

      // Check health and cooldown status
      if (this.healthTracker.isAvailable(providerId)) {
        eligibleProviders.push(provider);
      } else {
        // Kept as emergency last-resort fallback if no healthy providers exist
      }
    }

    // If all configured providers are temporarily in cooldown, salvage the in-cooldown list
    const candidateChain =
      eligibleProviders.length > 0
        ? [...eligibleProviders, ...inCooldownCandidates]
        : inCooldownCandidates;

    if (candidateChain.length === 0) {
      // Return unconfigured default provider so meaningful error can be raised by manager
      const defaultProvider = this.registry.getAIProvider("google") || this.registry.getAIProviders()[0];
      return {
        primaryProvider: defaultProvider,
        fallbackProviders: [],
        task,
        requiresVision: hasImage,
      };
    }

    const primaryProvider = candidateChain[0];
    const fallbackProviders = candidateChain.slice(1);

    return {
      primaryProvider,
      fallbackProviders,
      task,
      requiresVision: hasImage,
    };
  }

  /**
   * Resolves the best available Search provider chain (Tavily -> Brave -> Jina)
   */
  public resolveSearchRoute(request: SearchRequest): SearchRoutingDecision {
    const priorityList = [...this.searchPriorities];

    if (request.preferredProviderId) {
      const idx = priorityList.indexOf(request.preferredProviderId);
      if (idx > -1) {
        priorityList.splice(idx, 1);
      }
      priorityList.unshift(request.preferredProviderId);
    }

    const eligibleProviders: SearchProvider[] = [];
    const inCooldownCandidates: SearchProvider[] = [];

    for (const providerId of priorityList) {
      const provider = this.registry.getSearchProvider(providerId);
      if (!provider) continue;

      if (!provider.isConfigured()) continue;

      if (this.healthTracker.isAvailable(providerId)) {
        eligibleProviders.push(provider);
      } else {
        inCooldownCandidates.push(provider);
      }
    }

    const candidateChain =
      eligibleProviders.length > 0
        ? [...eligibleProviders, ...inCooldownCandidates]
        : inCooldownCandidates;

    if (candidateChain.length === 0) {
      const defaultProvider = this.registry.getSearchProvider("tavily") || this.registry.getSearchProviders()[0];
      return {
        primaryProvider: defaultProvider,
        fallbackProviders: [],
      };
    }

    return {
      primaryProvider: candidateChain[0],
      fallbackProviders: candidateChain.slice(1),
    };
  }
}

