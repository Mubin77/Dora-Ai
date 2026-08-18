import { ProviderHealthStatus, ProviderCategory } from "../providers/types";

export interface FailureDetail {
  reason: string;
  isRateLimit?: boolean;
  isAuthError?: boolean;
  isTimeout?: boolean;
  statusCode?: number;
}

export class ProviderHealthTracker {
  private static instance: ProviderHealthTracker;
  private healthMap: Map<string, ProviderHealthStatus> = new Map();

  // Cooldown durations in milliseconds
  private readonly DEFAULT_COOLDOWN_MS = 30_000; // 30 seconds
  private readonly RATE_LIMIT_COOLDOWN_MS = 60_000; // 1 minute
  private readonly AUTH_ERROR_COOLDOWN_MS = 300_000; // 5 minutes

  private constructor() {}

  public static getInstance(): ProviderHealthTracker {
    if (!ProviderHealthTracker.instance) {
      ProviderHealthTracker.instance = new ProviderHealthTracker();
    }
    return ProviderHealthTracker.instance;
  }

  public register(providerId: string, name: string, category: ProviderCategory, configured: boolean) {
    if (!this.healthMap.has(providerId)) {
      this.healthMap.set(providerId, {
        providerId,
        category,
        name,
        configured,
        healthy: configured,
        consecutiveFailures: 0,
        lastFailureAt: null,
        lastFailureReason: null,
        lastSuccessAt: null,
        totalRequests: 0,
        totalFailures: 0,
        cooldownUntil: null,
        averageLatencyMs: 0,
      });
    } else {
      const existing = this.healthMap.get(providerId)!;
      existing.configured = configured;
      if (!configured) {
        existing.healthy = false;
      }
    }
  }

  public isAvailable(providerId: string): boolean {
    const status = this.healthMap.get(providerId);
    if (!status || !status.configured) return false;

    // Check if provider is currently in a cooldown window
    if (status.cooldownUntil && Date.now() < status.cooldownUntil) {
      return false;
    }

    return true;
  }

  public recordSuccess(providerId: string, latencyMs: number) {
    const status = this.healthMap.get(providerId);
    if (!status) return;

    status.healthy = true;
    status.consecutiveFailures = 0;
    status.lastSuccessAt = Date.now();
    status.cooldownUntil = null;
    status.lastFailureReason = null;
    status.totalRequests += 1;

    // Moving average latency
    if (status.averageLatencyMs === 0) {
      status.averageLatencyMs = latencyMs;
    } else {
      status.averageLatencyMs = Math.round(status.averageLatencyMs * 0.8 + latencyMs * 0.2);
    }
  }

  public recordFailure(providerId: string, detail: FailureDetail) {
    const status = this.healthMap.get(providerId);
    if (!status) return;

    const now = Date.now();
    status.consecutiveFailures += 1;
    status.totalFailures += 1;
    status.totalRequests += 1;
    status.lastFailureAt = now;
    status.lastFailureReason = detail.reason;

    // Calculate cooldown based on error nature
    let cooldownMs = this.DEFAULT_COOLDOWN_MS;
    if (detail.isAuthError) {
      cooldownMs = this.AUTH_ERROR_COOLDOWN_MS;
      status.healthy = false;
    } else if (detail.isRateLimit) {
      cooldownMs = this.RATE_LIMIT_COOLDOWN_MS;
    } else if (status.consecutiveFailures >= 3) {
      cooldownMs = Math.min(this.DEFAULT_COOLDOWN_MS * Math.pow(2, status.consecutiveFailures - 3), 300_000);
      status.healthy = false;
    }

    status.cooldownUntil = now + cooldownMs;
  }

  public getStatus(providerId: string): ProviderHealthStatus | undefined {
    return this.healthMap.get(providerId);
  }

  public getAllStatuses(): Record<string, { configured: boolean; healthy: boolean; averageLatencyMs: number; consecutiveFailures: number; inCooldown: boolean }> {
    const summary: Record<string, { configured: boolean; healthy: boolean; averageLatencyMs: number; consecutiveFailures: number; inCooldown: boolean }> = {};
    const now = Date.now();

    for (const [id, s] of this.healthMap.entries()) {
      summary[id] = {
        configured: s.configured,
        healthy: s.healthy && (!s.cooldownUntil || now >= s.cooldownUntil),
        averageLatencyMs: s.averageLatencyMs,
        consecutiveFailures: s.consecutiveFailures,
        inCooldown: !!(s.cooldownUntil && now < s.cooldownUntil),
      };
    }
    return summary;
  }
}
