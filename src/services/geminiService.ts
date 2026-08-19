import { ChatMessage, DoraEmotion, VoiceSettings } from "../types";
import { MemoryManager } from "../memory/MemoryManager";

export interface DoraChatResponse {
  reply: string;
  emotion: DoraEmotion;
  reaction?: string;
  audioBase64?: string;
  context?: any;
}

export interface LatencyMetrics {
  messageSentAt: number;
  responseStartedAt: number | null;
  firstAudioChunkAt: number | null;
  playbackStartedAt: number | null;
  responseCompletedAt: number | null;
}

export interface LiveStreamCallbacks {
  onAudio?: (base64Audio: string) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onUserTranscript?: (text: string, isFinal: boolean) => void;
  onInterrupted?: () => void;
  onError?: (err: any) => void;
  onReady?: () => void;
}

export class DoraService {
  private ws: WebSocket | null = null;
  private isWsReady: boolean = false;
  private currentVoiceName: string = "Kore";
  private lastMemoryContext: string = "";
  private reconnectTimer: any = null;
  private wsCallbacks: LiveStreamCallbacks = {};
  private sessionId: string = `session-${Date.now()}`;
  private activeContext: any = null;

  // Active turn latency tracking
  private activeMetrics: LatencyMetrics | null = null;
  private latestScreenFrame: string | null = null;

  /**
   * Updates and transmits a real-time screen frame for Dora's visual awareness
   */
  public sendScreenFrame(base64Jpeg: string) {
    this.latestScreenFrame = base64Jpeg;
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isWsReady) {
      try {
        this.ws.send(
          JSON.stringify({
            type: "screen_frame",
            frame: base64Jpeg,
          })
        );
      } catch (err) {
        console.warn("[Dora Live] Error sending screen frame:", err);
      }
    }
  }

  /**
   * Clears the current screen frame when Screen Vision is stopped
   */
  public clearScreenFrame() {
    this.latestScreenFrame = null;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: "screen_stop" }));
      } catch (err) {
        console.warn("[Dora Live] Error sending screen stop:", err);
      }
    }
  }

  public getLatestScreenFrame(): string | null {
    return this.latestScreenFrame;
  }

  private lastHistoryContext: string = "";

  /**
   * Returns whether the Live WebSocket session is connected and ready
   */
  public isLiveReady(): boolean {
    return this.isWsReady && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Connect to backend WebSocket for Live Audio stream
   */
  public connectLiveStream(
    callbacks: LiveStreamCallbacks,
    voiceName = "Kore",
    memoryContext = "",
    historyContext = ""
  ) {
    this.wsCallbacks = callbacks;
    this.currentVoiceName = voiceName;
    const effectiveMemoryContext = memoryContext || MemoryManager.getInstance().buildContext("");
    this.lastMemoryContext = effectiveMemoryContext;
    this.lastHistoryContext = historyContext;

    // If socket is already open and ready, notify callback and return
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (this.isWsReady) {
        callbacks.onReady?.();
      }
      return;
    }

    // If socket is currently connecting, do not spawn another concurrent connection
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Clean up any stale socket listeners before instantiating a new one
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
      this.isWsReady = false;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/live-ws`;

    try {
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        if (this.ws !== socket || socket.readyState !== WebSocket.OPEN) {
          return;
        }
        console.log("[Dora Live] WebSocket connected, warming up Live session...");
        const contextToSend = this.lastMemoryContext || MemoryManager.getInstance().buildContext("");
        try {
          socket.send(
            JSON.stringify({
              type: "start_session",
              voiceName: this.currentVoiceName,
              memoryContext: contextToSend,
              historyContext: this.lastHistoryContext,
            })
          );
        } catch (err) {
          console.warn("[Dora Live] Error sending start_session on open:", err);
        }
      };

      socket.onmessage = (event) => {
        if (this.ws !== socket) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === "session_ready") {
            this.isWsReady = true;
            console.log("[Dora Live] Session ready and warm (Model:", data.modelUsed || "default", ")");
            this.wsCallbacks.onReady?.();
          } else if (data.type === "user_transcript" && data.text) {
            this.wsCallbacks.onUserTranscript?.(data.text, !!data.isFinal);
          } else if (data.type === "audio" && data.audio) {
            if (this.activeMetrics) {
              const now = performance.now();
              if (!this.activeMetrics.firstAudioChunkAt) {
                this.activeMetrics.firstAudioChunkAt = now;
                const latency = now - this.activeMetrics.messageSentAt;
                console.log(`[Dora Latency] ⚡ First audio chunk arrived in ${latency.toFixed(1)}ms`);
              }
              if (!this.activeMetrics.responseStartedAt) {
                this.activeMetrics.responseStartedAt = now;
              }
            }
            this.wsCallbacks.onAudio?.(data.audio);
          } else if (data.type === "transcript_chunk" && data.text) {
            if (this.activeMetrics && !this.activeMetrics.responseStartedAt) {
              this.activeMetrics.responseStartedAt = performance.now();
              const textLatency = this.activeMetrics.responseStartedAt - this.activeMetrics.messageSentAt;
              console.log(`[Dora Latency] 💬 First text token arrived in ${textLatency.toFixed(1)}ms`);
            }
            this.wsCallbacks.onTranscript?.(data.text, false);
          } else if (data.type === "turn_complete") {
            if (this.activeMetrics) {
              this.activeMetrics.responseCompletedAt = performance.now();
              const totalStreamMs = this.activeMetrics.responseCompletedAt - this.activeMetrics.messageSentAt;
              console.log(`[Dora Latency] ✅ Full turn response completed in ${totalStreamMs.toFixed(1)}ms`);
              this.activeMetrics = null;
            }
            this.wsCallbacks.onTranscript?.("", true);
          } else if (data.type === "interrupted") {
            console.log("[Dora Live] Response interrupted by user");
            this.activeMetrics = null;
            this.wsCallbacks.onInterrupted?.();
          } else if (data.type === "live_error" || data.type === "live_unavailable") {
            console.warn("[Dora Live] Live API notice:", data.message || data.error);
            this.wsCallbacks.onError?.(data);
          }
        } catch (err) {
          console.error("[Dora Live] Error handling WS message:", err);
        }
      };

      socket.onerror = (err) => {
        if (this.ws !== socket) return;
        this.isWsReady = false;
        console.warn("[Dora Live] WebSocket error:", err);
        this.wsCallbacks.onError?.(err);
      };

      socket.onclose = () => {
        if (this.ws !== socket) return;
        this.isWsReady = false;
        console.log("[Dora Live] WebSocket closed, auto-reconnecting in 2s...");
        this.reconnectTimer = setTimeout(() => {
          this.connectLiveStream(this.wsCallbacks, this.currentVoiceName, this.lastMemoryContext);
        }, 2000);
      };
    } catch (err) {
      console.warn("[Dora Live] WebSocket initialization error:", err);
      callbacks.onError?.(err);
    }
  }

  public recordPlaybackStarted() {
    if (this.activeMetrics && !this.activeMetrics.playbackStartedAt) {
      this.activeMetrics.playbackStartedAt = performance.now();
      const timeToPlayback = this.activeMetrics.playbackStartedAt - this.activeMetrics.messageSentAt;
      console.log(`[Dora Latency] 🔊 Audio playback began in ${timeToPlayback.toFixed(1)}ms`);
    }
  }

  public sendLiveAudioChunk(base64Audio: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isWsReady) {
      try {
        this.ws.send(JSON.stringify({ type: "audio_input", audio: base64Audio }));
      } catch (err) {
        console.warn("[Dora Live] Error sending audio chunk:", err);
      }
    }
  }

  public sendLiveText(text: string, language: string = "auto", memoryContext: string = "", deepThink: boolean = false) {
    this.activeMetrics = {
      messageSentAt: performance.now(),
      responseStartedAt: null,
      firstAudioChunkAt: null,
      playbackStartedAt: null,
      responseCompletedAt: null,
    };
    console.log(`[Dora Latency] 📤 User message sent ("${text.slice(0, 30)}...") [DeepThink: ${deepThink}]`);

    const effectiveMemoryContext = memoryContext || MemoryManager.getInstance().buildContext(text);
    this.lastMemoryContext = effectiveMemoryContext;
    const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dhaka";
    const clientTimestamp = Date.now();

    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isWsReady) {
      try {
        this.ws.send(
          JSON.stringify({
            type: "text_input",
            text,
            language,
            memoryContext: effectiveMemoryContext,
            deepThink,
            clientTimeZone,
            clientTimestamp,
          })
        );
      } catch (err) {
        console.warn("[Dora Live] Error sending live text:", err);
      }
    }
  }

  public sendInterruptSignal() {
    this.activeMetrics = null;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: "interrupt" }));
      } catch (err) {
        console.warn("[Dora Live] Error sending interrupt signal:", err);
      }
    }
  }

  public disconnectLiveStream() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
      this.isWsReady = false;
    }
  }

  /**
   * REST Conversational API Turn (Fallback when Live API is offline)
   */
  public async sendMessage(
    message: string,
    history: ChatMessage[],
    settings: VoiceSettings,
    memoryContext: string = "",
    imageAttachment?: string,
    deepThink: boolean = false
  ): Promise<DoraChatResponse> {
    const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dhaka";
    const clientTimestamp = Date.now();

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history,
        language: settings.language,
        memoryContext,
        screenFrame: this.latestScreenFrame || undefined,
        imageAttachment: imageAttachment || undefined,
        deepThink,
        clientTimeZone,
        clientTimestamp,
        sessionId: this.sessionId,
        existingContext: this.activeContext || undefined,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to communicate with Dora");
    }

    const data = await res.json();
    if (data.context) {
      this.activeContext = data.context;
    }

    return {
      reply: data.reply,
      emotion: data.emotion || "warm",
      reaction: data.reaction,
      context: data.context,
    };
  }

  /**
   * REST TTS generation for Dora voice output (Fallback)
   */
  public async generateSpeech(text: string, voiceName: string = "Aoede", language: string = "auto"): Promise<string | null> {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceName, language }),
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      return data.audio || null;
    } catch (err) {
      console.warn("TTS synthesis error:", err);
      return null;
    }
  }
}

export const doraService = new DoraService();
