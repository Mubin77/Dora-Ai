export type ProviderCategory = "ai" | "voice" | "search" | "data" | "weather";

export type AICapability =
  | "chat"
  | "fast-inference"
  | "reasoning"
  | "vision"
  | "code"
  | "extraction"
  | "json-mode";

export type AITaskType =
  | "chat"
  | "fast-inference"
  | "reasoning"
  | "vision"
  | "extraction"
  | "general";

export type SearchCapability =
  | "web-search"
  | "news"
  | "deep-crawl"
  | "raw-content"
  | "summary";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
  image?: {
    mimeType: string;
    base64Data: string;
  };
}

export interface AIRequest {
  task?: AITaskType;
  messages: AIMessage[];
  systemInstruction?: string;
  model?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  deepThink?: boolean;
  preferredProviderId?: string;
  timeoutMs?: number;
  jsonMode?: boolean;
  simulateFailure?: boolean;
}

export interface AIResponse {
  text: string;
  providerId: string;
  modelUsed: string;
  latencyMs: number;
  finishReason?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  content?: string;
  source?: string;
  publishedAt?: string;
  score?: number;
}

export interface SearchRequest {
  query: string;
  limit?: number;
  searchDepth?: "basic" | "advanced";
  includeAnswer?: boolean;
  topic?: "general" | "news" | "finance";
  days?: number;
  freshness?: "today" | "this_week" | "this_month" | "recent" | "any";
  excludeDomains?: string[];
  preferredProviderId?: string;
  timeoutMs?: number;
  simulateFailure?: boolean;
  simulateTavilyFailure?: boolean;
  simulateJinaFailure?: boolean;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  providerId: string;
  latencyMs: number;
  answer?: string;
}

export interface BaseProvider {
  id: string;
  name: string;
  category: ProviderCategory;
  isConfigured(): boolean;
}

export interface AIProvider extends BaseProvider {
  category: "ai";
  capabilities: AICapability[];
  defaultModel: string;
  supportedModels: string[];
  generate(request: AIRequest): Promise<AIResponse>;
}

export interface VoiceProvider extends BaseProvider {
  category: "voice";
  capabilities: Array<"tts" | "stt" | "realtime-voice">;
  synthesizeSpeech?(text: string, voiceId?: string): Promise<{ audio: string; mimeType: string }>;
}

export interface SearchProvider extends BaseProvider {
  category: "search";
  capabilities: SearchCapability[];
  search(request: SearchRequest): Promise<SearchResponse>;
}

export interface DataProvider extends BaseProvider {
  category: "data";
  capabilities: Array<"kv" | "relational" | "vector" | "document">;
}

export type AnyProvider = AIProvider | VoiceProvider | SearchProvider | DataProvider;

export interface ProviderHealthStatus {
  providerId: string;
  category: ProviderCategory;
  name: string;
  configured: boolean;
  healthy: boolean;
  consecutiveFailures: number;
  lastFailureAt: number | null;
  lastFailureReason: string | null;
  lastSuccessAt: number | null;
  totalRequests: number;
  totalFailures: number;
  cooldownUntil: number | null;
  averageLatencyMs: number;
}

export interface ProviderRoutingConfig {
  primary: string;
  fallbacks: string[];
}

export interface ExecutionMeta {
  providerId: string;
  modelUsed: string;
  latencyMs: number;
  fallbacksAttempted: Array<{
    providerId: string;
    reason: string;
    errorCode?: string | number;
  }>;
}

export interface SearchExecutionMeta {
  providerId: string;
  latencyMs: number;
  fallbacksAttempted: Array<{
    providerId: string;
    reason: string;
    errorCode?: string | number;
  }>;
}

export interface SearchExecutionResult {
  response: SearchResponse;
  meta: SearchExecutionMeta;
}

