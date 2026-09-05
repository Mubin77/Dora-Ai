import { ChatMessage, DoraEmotion, VoiceSettings } from "../types";
import { MemoryManager } from "../memory/MemoryManager";
import { getApiUrl, getWebSocketUrl } from "../utils/apiConfig";

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
  onTurnComplete?: () => void;
  onInterrupted?: () => void;
  onError?: (err: any) => void;
  onReady?: () => void;
  onDeviceAction?: (call: { id: string; name: string; args: any }) => void;
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
  private latestCameraFrame: string | null = null;

  /**
   * Updates and transmits a real-time live camera frame for Dora's visual awareness
   */
  public sendCameraFrame(base64Jpeg: string) {
    this.latestCameraFrame = base64Jpeg;
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isWsReady) {
      try {
        this.ws.send(
          JSON.stringify({
            type: "camera_frame",
            frame: base64Jpeg,
          })
        );
      } catch (err) {
        console.warn("[Dora Live] Error sending camera frame:", err);
      }
    }
  }

  /**
   * Clears the current camera frame when Live Camera is stopped
   */
  public clearCameraFrame() {
    this.latestCameraFrame = null;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: "camera_stop" }));
      } catch (err) {
        console.warn("[Dora Live] Error sending camera stop:", err);
      }
    }
  }

  public getLatestCameraFrame(): string | null {
    return this.latestCameraFrame;
  }

  public getLatestVisualFrame(): string | null {
    return this.latestCameraFrame || this.latestScreenFrame;
  }

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

  private pendingTextQueue: Array<{
    text: string;
    language: string;
    memoryContext: string;
    deepThink: boolean;
    clientTimeZone: string;
    clientTimestamp: number;
  }> = [];

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
    voiceName = "Aoede",
    memoryContext = "",
    historyContext = ""
  ) {
    this.wsCallbacks = callbacks;
    this.currentVoiceName = voiceName;
    const effectiveMemoryContext = memoryContext || MemoryManager.getInstance().buildContext("");
    this.lastMemoryContext = effectiveMemoryContext;
    this.lastHistoryContext = historyContext;

    // If socket is already open and ready, notify callback, flush any pending messages and return
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (this.isWsReady) {
        callbacks.onReady?.();
        this.flushPendingTextQueue();
      }
      return;
    }

    // If socket is currently connecting, do not spawn another concurrent connection
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      console.log("[VOICE DEBUG] WebSocket already connecting, skipping duplicate creation");
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Clean up any stale socket listeners before instantiating a new one
    if (this.ws) {
      const oldWs = this.ws;
      this.ws = null;
      this.isWsReady = false;
      oldWs.onopen = null;
      oldWs.onmessage = null;
      oldWs.onerror = null;
      oldWs.onclose = null;
      try {
        oldWs.close();
      } catch {
        // ignore
      }
    }

    const wsUrl = getWebSocketUrl("/live-ws");

    try {
      console.log(`[VOICE DEBUG] Creating authoritative Live WebSocket to ${wsUrl}`);
      console.log(`[APK][VOICE] 6. Gemini Live session connection initialized at ${wsUrl}`);
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        if (this.ws !== socket || socket.readyState !== WebSocket.OPEN) {
          return;
        }
        console.log("[VOICE DEBUG] Gemini Live connection: OPEN (WebSocket connected to /live-ws)");
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
          console.warn("[VOICE DEBUG] Error sending start_session on open:", err);
        }
      };

      socket.onmessage = (event) => {
        if (this.ws !== socket) return;
        try {
          const data = JSON.parse(event.data);
          console.log(`[VOICE DEBUG] Gemini Live message received: ${data.type}`);
          if (data.type === "session_ready") {
            this.isWsReady = true;
            console.log("[VOICE DEBUG] Gemini Live session: READY (Model:", data.modelUsed || "default", ")");
            this.wsCallbacks.onReady?.();
            this.flushPendingTextQueue();
          } else if (data.type === "user_transcript" && data.text) {
            console.log(`[VOICE DEBUG] speech recognition result (Gemini STT): "${data.text}"`);
            this.wsCallbacks.onUserTranscript?.(data.text, !!data.isFinal);
          } else if (data.type === "audio" && data.audio) {
            console.log(`[VOICE DEBUG] audio data received: ${data.audio.length} base64 chars`);
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
            console.log("[VOICE DEBUG] Gemini Live turn complete");
            if (this.activeMetrics) {
              this.activeMetrics.responseCompletedAt = performance.now();
              const totalStreamMs = this.activeMetrics.responseCompletedAt - this.activeMetrics.messageSentAt;
              console.log(`[Dora Latency] ✅ Full turn response completed in ${totalStreamMs.toFixed(1)}ms`);
              this.activeMetrics = null;
            }
            this.wsCallbacks.onTranscript?.("", true);
            this.wsCallbacks.onTurnComplete?.();
          } else if (data.type === "interrupted") {
            console.log("[VOICE DEBUG] Gemini Live response interrupted by user");
            this.activeMetrics = null;
            this.wsCallbacks.onInterrupted?.();
          } else if (data.type === "execute_device_action" && data.call) {
            console.log("[VOICE DEBUG] Received device action tool call from Gemini Live:", data.call);
            this.wsCallbacks.onDeviceAction?.(data.call);
          } else if (data.type === "live_error" || data.type === "live_unavailable") {
            console.warn("[VOICE DEBUG] Gemini Live notice/error:", data.message || data.error);
            this.wsCallbacks.onError?.(data);
          }
        } catch (err) {
          console.error("[VOICE DEBUG] Error handling WS message:", err);
        }
      };

      socket.onerror = (err) => {
        if (this.ws !== socket) return;
        this.isWsReady = false;
        console.warn("[VOICE DEBUG] WebSocket error event:", err);
        this.wsCallbacks.onError?.(err);
      };

      socket.onclose = (event) => {
        if (this.ws !== socket) return;
        this.isWsReady = false;
        console.log(`[VOICE DEBUG] WebSocket closed (code=${event.code}, reason=${event.reason || "normal"})`);
      };
    } catch (err) {
      console.warn("[VOICE DEBUG] WebSocket initialization error:", err);
      callbacks.onError?.(err);
    }
  }

  private flushPendingTextQueue() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isWsReady) return;
    while (this.pendingTextQueue.length > 0) {
      const item = this.pendingTextQueue.shift();
      if (item) {
        console.log(`[VOICE DEBUG] Flushing queued text to Gemini Live: "${item.text}"`);
        try {
          this.ws.send(
            JSON.stringify({
              type: "text_input",
              text: item.text,
              language: item.language,
              memoryContext: item.memoryContext,
              deepThink: item.deepThink,
              clientTimeZone: item.clientTimeZone,
              clientTimestamp: item.clientTimestamp,
            })
          );
        } catch (err) {
          console.warn("[VOICE DEBUG] Error sending flushed text:", err);
        }
      }
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
    console.log(`[VOICE DEBUG] submitting transcript to Gemini Live: "${text}" [DeepThink: ${deepThink}]`);

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
        console.warn("[VOICE DEBUG] Error sending live text:", err);
      }
    } else {
      console.log(`[VOICE DEBUG] Gemini Live session warming up (ws readyState=${this.ws?.readyState}, isWsReady=${this.isWsReady}). Enqueuing transcript.`);
      this.pendingTextQueue.push({
        text,
        language,
        memoryContext: effectiveMemoryContext,
        deepThink,
        clientTimeZone,
        clientTimestamp,
      });
    }
  }

  /**
   * Transmits a proactive companion initiation trigger to the active Gemini Live session
   */
  public sendProactiveTrigger(promptInstruction: string, language: string = "auto") {
    this.activeMetrics = {
      messageSentAt: performance.now(),
      responseStartedAt: null,
      firstAudioChunkAt: null,
      playbackStartedAt: null,
      responseCompletedAt: null,
    };
    console.log(`[PROACTIVE RUNTIME] Dispatching proactive trigger to Gemini Live: "${promptInstruction}"`);

    const effectiveMemoryContext = this.lastMemoryContext || MemoryManager.getInstance().buildContext("");
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isWsReady) {
      try {
        this.ws.send(
          JSON.stringify({
            type: "proactive_trigger",
            promptInstruction,
            language,
            memoryContext: effectiveMemoryContext,
          })
        );
      } catch (err) {
        console.warn("[PROACTIVE RUNTIME] Error sending proactive trigger over WS:", err);
      }
    } else {
      this.sendLiveText(promptInstruction, language, effectiveMemoryContext, false);
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

  public sendToolResponse(callId: string, result: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: "tool_response", callId, result }));
      } catch (err) {
        console.warn("[Dora Live] Error sending tool response:", err);
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
    const apiUrl = getApiUrl("/api/chat");

    console.log(`[APK] Chat submit: "${message.slice(0, 80)}"`);
    console.log(`[APK] API request started`);
    console.log(`[APK] API URL: ${apiUrl}`);

    let res: Response;
    try {
      res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history,
          language: settings.language,
          memoryContext,
          cameraFrame: this.latestCameraFrame || undefined,
          screenFrame: this.latestScreenFrame || undefined,
          imageAttachment: imageAttachment || undefined,
          deepThink,
          clientTimeZone,
          clientTimestamp,
          sessionId: this.sessionId,
          existingContext: this.activeContext || undefined,
        }),
      });
    } catch (networkErr: any) {
      console.error(`[APK] Network fetch error to ${apiUrl}:`, networkErr);
      throw new Error(`Connection error: Could not reach Dora server at ${apiUrl}. Please ensure device is connected to the internet and backend is online.`);
    }

    console.log(`[APK] API response status: ${res.status}`);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error(`[APK] API error ${res.status}:`, errorData);
      throw new Error(errorData.error || `Server responded with status ${res.status}`);
    }

    const data = await res.json();
    console.log(`[APK] Response received (${(data.reply || "").length} chars)`);
    console.log(`[APK] Response parsed`);
    console.log(`[APK] UI updated`);

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
      const res = await fetch(getApiUrl("/api/tts"), {
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
