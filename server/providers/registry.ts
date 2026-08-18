import {
  AIProvider,
  SearchProvider,
  VoiceProvider,
  DataProvider,
  AnyProvider,
  ProviderCategory,
  AICapability,
} from "./types";
import { GoogleGeminiProvider } from "./ai/google";
import { GroqProvider } from "./ai/groq";
import { CerebrasProvider } from "./ai/cerebras";
import { MistralProvider } from "./ai/mistral";
import { OpenRouterProvider } from "./ai/openrouter";
import { HuggingFaceProvider } from "./ai/huggingface";
import { ElevenLabsVoiceProvider } from "./voice/elevenlabs";
import { DeepgramVoiceProvider, AssemblyAIVoiceProvider } from "./voice/stubs";
import { TavilySearchProvider } from "./search/tavily";
import { JinaSearchProvider } from "./search/jina";
import {
  SupabaseDataProvider,
  FirebaseDataProvider,
  NeonDataProvider,
  MongoDBDataProvider,
  UpstashDataProvider,
} from "./data/stubs";
import { ProviderHealthTracker } from "../core/health";

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, AnyProvider> = new Map();
  private healthTracker = ProviderHealthTracker.getInstance();

  private constructor() {
    this.registerDefaults();
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  private registerDefaults() {
    // 1. Register V1 AI Providers
    this.register(new GoogleGeminiProvider());
    this.register(new GroqProvider());
    this.register(new CerebrasProvider());
    this.register(new MistralProvider());
    this.register(new OpenRouterProvider());
    this.register(new HuggingFaceProvider());

    // 2. Register Voice Provider stubs
    this.register(new ElevenLabsVoiceProvider());
    this.register(new DeepgramVoiceProvider());
    this.register(new AssemblyAIVoiceProvider());

    // 3. Register Real Search Providers (Tavily -> Jina)
    this.register(new TavilySearchProvider());
    this.register(new JinaSearchProvider());

    // 4. Register Data Provider stubs
    this.register(new SupabaseDataProvider());
    this.register(new FirebaseDataProvider());
    this.register(new NeonDataProvider());
    this.register(new MongoDBDataProvider());
    this.register(new UpstashDataProvider());
  }

  public register(provider: AnyProvider) {
    this.providers.set(provider.id, provider);
    this.healthTracker.register(
      provider.id,
      provider.name,
      provider.category,
      provider.isConfigured()
    );
  }

  public getProvider<T extends AnyProvider = AnyProvider>(id: string): T | undefined {
    return this.providers.get(id) as T | undefined;
  }

  public getAIProvider(id: string): AIProvider | undefined {
    const provider = this.providers.get(id);
    if (provider && provider.category === "ai") {
      return provider as AIProvider;
    }
    return undefined;
  }

  public getSearchProvider(id: string): SearchProvider | undefined {
    const provider = this.providers.get(id);
    if (provider && provider.category === "search") {
      return provider as SearchProvider;
    }
    return undefined;
  }

  public getAllProviders(): AnyProvider[] {
    return Array.from(this.providers.values());
  }

  public getByCategory(category: ProviderCategory): AnyProvider[] {
    return Array.from(this.providers.values()).filter((p) => p.category === category);
  }

  public getAIProviders(): AIProvider[] {
    return this.getByCategory("ai") as AIProvider[];
  }

  public getConfiguredAIProviders(): AIProvider[] {
    return this.getAIProviders().filter((p) => p.isConfigured());
  }

  public getSearchProviders(): SearchProvider[] {
    return this.getByCategory("search") as SearchProvider[];
  }

  public getConfiguredSearchProviders(): SearchProvider[] {
    return this.getSearchProviders().filter((p) => p.isConfigured());
  }

  public getAIProvidersWithCapability(capability: AICapability): AIProvider[] {
    return this.getAIProviders().filter(
      (p) => p.isConfigured() && p.capabilities.includes(capability)
    );
  }
}

