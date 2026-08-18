import {
  AIProvider,
  AIRequest,
  AIResponse,
  ExecutionMeta,
  SearchProvider,
  SearchRequest,
  SearchResponse,
  SearchExecutionResult,
  SearchExecutionMeta,
} from "../providers/types";
import { ProviderHealthTracker, FailureDetail } from "./health";

export interface FallbackExecutionResult {
  response: AIResponse;
  meta: ExecutionMeta;
}

export class FallbackExecutor {
  private healthTracker = ProviderHealthTracker.getInstance();
  private readonly MAX_PROVIDER_ATTEMPTS = 4;

  /**
   * Executes AI request across candidate provider chain with graceful fallback
   */
  public async executeWithFallback(
    primaryProvider: AIProvider,
    fallbackProviders: AIProvider[],
    request: AIRequest
  ): Promise<FallbackExecutionResult> {
    const chain = [primaryProvider, ...fallbackProviders].slice(0, this.MAX_PROVIDER_ATTEMPTS);
    const fallbacksAttempted: ExecutionMeta["fallbacksAttempted"] = [];

    let lastError: any = null;

    for (let i = 0; i < chain.length; i++) {
      const provider = chain[i];
      const isPrimary = i === 0;

      // Skip unconfigured providers
      if (!provider.isConfigured()) {
        continue;
      }

      console.log(
        `[ProviderRouter] task=${request.task || "chat"} selected=${provider.id} mode=${isPrimary ? "primary" : "fallback"}`
      );

      const startTime = Date.now();

      try {
        const response = await provider.generate(request);
        const latencyMs = Date.now() - startTime;

        this.healthTracker.recordSuccess(provider.id, latencyMs);

        console.log(
          `[Provider] ${provider.id} status=success model=${response.modelUsed} latency=${latencyMs}ms`
        );

        return {
          response,
          meta: {
            providerId: provider.id,
            modelUsed: response.modelUsed,
            latencyMs,
            fallbacksAttempted,
          },
        };
      } catch (err: any) {
        lastError = err;
        const latencyMs = Date.now() - startTime;
        const errMsg = err?.message || String(err);
        const statusCode = err?.statusCode;
        const isRateLimit = Boolean(
          err?.isRateLimit ||
          statusCode === 429 ||
          errMsg.includes("429") ||
          errMsg.toLowerCase().includes("rate limit") ||
          errMsg.toLowerCase().includes("quota")
        );
        const isAuthError = Boolean(
          err?.isAuthError ||
          statusCode === 401 ||
          statusCode === 403 ||
          errMsg.toLowerCase().includes("unauthorized") ||
          errMsg.toLowerCase().includes("invalid api key")
        );
        const isTimeout = Boolean(
          err?.isTimeout ||
          err?.name === "AbortError" ||
          errMsg.toLowerCase().includes("timeout")
        );

        const failureDetail: FailureDetail = {
          reason: isRateLimit
            ? "rate_limit"
            : isAuthError
            ? "authentication_error"
            : isTimeout
            ? "timeout"
            : "provider_error",
          isRateLimit,
          isAuthError,
          isTimeout,
          statusCode,
        };

        this.healthTracker.recordFailure(provider.id, failureDetail);

        const nextProvider = chain[i + 1];
        if (nextProvider && nextProvider.isConfigured()) {
          console.warn(
            `[ProviderFallback] from=${provider.id} reason=${failureDetail.reason} latency=${latencyMs}ms -> falling back to=${nextProvider.id}`
          );
        } else {
          console.warn(
            `[Provider] ${provider.id} failed (${failureDetail.reason}): ${errMsg.slice(0, 120)}`
          );
        }

        fallbacksAttempted.push({
          providerId: provider.id,
          reason: failureDetail.reason,
          errorCode: statusCode,
        });

        // If client provided a malformed request (400 Bad Request not related to provider limits), do not keep hammering other providers
        if (statusCode === 400 && !errMsg.toLowerCase().includes("model")) {
          throw err;
        }
      }
    }

    const safeMessage = lastError?.message || "All configured AI providers failed to respond";
    const error = new Error(`Central Provider Error: ${safeMessage}`);
    (error as any).fallbacksAttempted = fallbacksAttempted;
    throw error;
  }

  /**
   * Executes search request across search provider chain (Tavily -> Jina) with graceful fallback
   */
  public async executeSearchWithFallback(
    primaryProvider: SearchProvider,
    fallbackProviders: SearchProvider[],
    request: SearchRequest
  ): Promise<SearchExecutionResult> {
    const chain = [primaryProvider, ...fallbackProviders].slice(0, this.MAX_PROVIDER_ATTEMPTS);
    const fallbacksAttempted: SearchExecutionMeta["fallbacksAttempted"] = [];

    let lastError: any = null;

    for (let i = 0; i < chain.length; i++) {
      const provider = chain[i];
      const isPrimary = i === 0;

      // Skip unconfigured providers
      if (!provider.isConfigured()) {
        continue;
      }

      console.log(
        `[SearchRouter] queryLength=${request.query.length} selected=${provider.id} mode=${isPrimary ? "primary" : "fallback"}`
      );

      const startTime = Date.now();

      try {
        const response = await provider.search(request);
        const latencyMs = Date.now() - startTime;

        this.healthTracker.recordSuccess(provider.id, latencyMs);

        console.log(
          `[SearchProvider]\nqueryLength=${request.query.length}\nselectedProvider=${provider.id}\nstatus=success`
        );

        return {
          response,
          meta: {
            providerId: provider.id,
            latencyMs,
            fallbacksAttempted,
          },
        };
      } catch (err: any) {
        lastError = err;
        const latencyMs = Date.now() - startTime;
        const errMsg = err?.message || String(err);
        const statusCode = err?.statusCode;
        const isRateLimit = Boolean(
          err?.isRateLimit ||
          statusCode === 429 ||
          errMsg.includes("429") ||
          errMsg.toLowerCase().includes("rate limit") ||
          errMsg.toLowerCase().includes("quota")
        );
        const isAuthError = Boolean(
          err?.isAuthError ||
          statusCode === 401 ||
          statusCode === 403 ||
          errMsg.toLowerCase().includes("unauthorized") ||
          errMsg.toLowerCase().includes("invalid api key")
        );
        const isTimeout = Boolean(
          err?.isTimeout ||
          err?.name === "AbortError" ||
          errMsg.toLowerCase().includes("timeout")
        );

        const failureDetail: FailureDetail = {
          reason: isRateLimit
            ? "rate_limit"
            : isAuthError
            ? "authentication_error"
            : isTimeout
            ? "timeout"
            : "provider_error",
          isRateLimit,
          isAuthError,
          isTimeout,
          statusCode,
        };

        this.healthTracker.recordFailure(provider.id, failureDetail);

        const nextProvider = chain[i + 1];
        if (nextProvider && nextProvider.isConfigured()) {
          console.warn(
            `[SearchProviderFallback]\nfrom=${provider.id}\nreason=${failureDetail.reason}\nto=${nextProvider.id}`
          );
        } else {
          console.warn(
            `[SearchProvider] ${provider.id} failed (${failureDetail.reason}): ${errMsg.slice(0, 120)}`
          );
        }

        fallbacksAttempted.push({
          providerId: provider.id,
          reason: failureDetail.reason,
          errorCode: statusCode,
        });
      }
    }

    const safeMessage = lastError?.message || "All configured Search providers failed to respond";
    const error = new Error(`Central Search Provider Error: ${safeMessage}`);
    (error as any).fallbacksAttempted = fallbacksAttempted;
    throw error;
  }
}

