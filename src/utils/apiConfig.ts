/**
 * Dora Centralized Public API & WebSocket Configuration
 * 
 * Centralized production endpoint configuration for the standalone Android APK.
 * The APK communicates directly with the public HTTPS Dora backend without
 * requiring an interactive AI Studio browser session, cookies, or redirect chains.
 */

// Centralized Public HTTPS Dora Backend URL
// Cloud Run production endpoint hosting the Express server.
export const API_BASE_URL: string = (
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_DORA_API_BASE_URL) ||
  "https://ais-dev-us6d4iivtwlkjr66rw4rhy-108268106407.asia-southeast1.run.app"
).replace(/\/+$/, "");

export const PRODUCTION_API_BASE_URL = API_BASE_URL;

/**
 * Returns the base HTTP/HTTPS URL for Dora backend API calls
 */
export function getBackendBaseUrl(): string {
  // 1. User custom override in localStorage
  try {
    if (typeof window !== "undefined") {
      const custom = localStorage.getItem("dora_custom_backend_url");
      if (custom && (custom.startsWith("https://") || custom.startsWith("http://"))) {
        return custom.replace(/\/+$/, "");
      }
    }
  } catch {
    // ignore
  }

  // 2. Check native Android bridge configuration
  try {
    if (typeof window !== "undefined") {
      const bridge = (window as any)?.DoraAndroidBridge;
      if (bridge && typeof bridge.getServerUrl === "function") {
        const serverRes = bridge.getServerUrl();
        if (typeof serverRes === "string" && (serverRes.startsWith("https://") || serverRes.startsWith("http://"))) {
          return serverRes.replace(/\/+$/, "");
        }
      }
    }
  } catch {
    // ignore
  }

  // 3. Android APK (appassets or file protocol) uses ONLY the public production API URL
  if (typeof window !== "undefined") {
    const host = window.location.host;
    const protocol = window.location.protocol;
    const isApk = !host || host === "appassets.androidplatform.net" || protocol === "file:";
    if (isApk) {
      return API_BASE_URL;
    }
    // Web Preview inside browser
    return window.location.origin;
  }

  return API_BASE_URL;
}

/**
 * Resolves a full API URL for fetch calls (e.g. /api/chat)
 */
export function getApiUrl(endpoint: string): string {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const base = getBackendBaseUrl();

  // If in web browser on same origin, relative URLs are valid
  if (typeof window !== "undefined" && base === window.location.origin) {
    return normalizedEndpoint;
  }

  return `${base}${normalizedEndpoint}`;
}

/**
 * Resolves a full WebSocket URL for Live Streaming (e.g. /live-ws)
 */
export function getWebSocketUrl(endpoint: string = "/live-ws"): string {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const base = getBackendBaseUrl();

  let wsBase = base;
  if (wsBase.startsWith("https://")) {
    wsBase = wsBase.replace(/^https:\/\//, "wss://");
  } else if (wsBase.startsWith("http://")) {
    wsBase = wsBase.replace(/^http:\/\//, "ws://");
  } else {
    const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
    wsBase = `${isSecure ? "wss" : "ws"}://${window.location.host}`;
  }

  return `${wsBase}${normalizedEndpoint}`;
}

/**
 * Diagnostic health check utility
 */
export async function checkBackendHealth(): Promise<{ ok: boolean; status: number; data?: any }> {
  const url = getApiUrl("/api/health");
  console.log(`[APK-NET] Production API URL: ${getBackendBaseUrl()}`);
  console.log(`[APK-NET] Health request: ${url}`);
  try {
    const res = await fetch(url, { method: "GET" });
    console.log(`[APK-NET] Health status: ${res.status}`);
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    console.error(`[APK-NET] Health check failed:`, err?.message);
    return { ok: false, status: 0 };
  }
}

