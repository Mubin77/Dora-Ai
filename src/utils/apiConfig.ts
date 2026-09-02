/**
 * Dora Backend & WebSocket API Endpoint Configuration
 * 
 * Provides unified, environment-aware endpoint resolution across:
 * 1. Web Browser & AI Studio preview (relative / current origin)
 * 2. Standalone Android APK with bundled local assets (https://appassets.androidplatform.net or file://)
 * 3. Custom user-configured backend endpoints
 */

export const DEFAULT_REMOTE_BACKEND_URL = "https://ais-dev-us6d4iivtwlkjr66rw4rhy-108268106407.asia-southeast1.run.app";

/**
 * Returns the base HTTP/HTTPS URL for Dora backend API calls
 */
export function getBackendBaseUrl(): string {
  if (typeof window === "undefined") {
    return DEFAULT_REMOTE_BACKEND_URL;
  }

  // 1. User custom override in localStorage
  try {
    const custom = localStorage.getItem("dora_custom_backend_url");
    if (custom && (custom.startsWith("http://") || custom.startsWith("https://"))) {
      return custom.replace(/\/+$/, "");
    }
  } catch {
    // ignore
  }

  // 2. Check native Android bridge configuration
  try {
    const bridge = (window as any)?.DoraAndroidBridge;
    if (bridge && typeof bridge.getServerUrl === "function") {
      const serverRes = bridge.getServerUrl();
      if (typeof serverRes === "string" && (serverRes.startsWith("http://") || serverRes.startsWith("https://"))) {
        return serverRes.replace(/\/+$/, "");
      }
    }
  } catch {
    // ignore
  }

  // 3. If running inside local Android assets or file protocol, fallback to remote Cloud Run host
  const host = window.location.host;
  const protocol = window.location.protocol;
  if (
    !host ||
    host === "appassets.androidplatform.net" ||
    host === "localhost" && !window.location.port ||
    protocol === "file:"
  ) {
    return DEFAULT_REMOTE_BACKEND_URL;
  }

  // 4. Default web preview (same origin relative or absolute)
  return window.location.origin;
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
