/**
 * Speech Recognition Engine for Dora
 * Provides continuous speech-to-text with interim results, automatic language detection,
 * Bangla / Banglish / English support, permission handling, and echo suppression.
 */

export interface SpeechRecognizerOptions {
  language?: string;
  continuous?: boolean;
  pauseThresholdMs?: number;
  onSpeechStart?: () => void;
  onInterimResult?: (interimText: string) => void;
  onFinalResult?: (finalText: string) => void;
  onError?: (error: { code: string; message: string; isPermissionDenied?: boolean }) => void;
  onStateChange?: (isListening: boolean) => void;
}

export class SpeechRecognizer {
  private recognition: any = null;
  private isListening: boolean = false;
  private isPausedForPlayback: boolean = false;
  private shouldBeRunning: boolean = false;
  private options: SpeechRecognizerOptions = {};
  private currentTranscript: string = "";
  private accumulatedText: string = "";
  private silenceTimer: any = null;
  private restartTimeout: any = null;
  private lastSpeechTimestamp: number = 0;

  constructor(options: SpeechRecognizerOptions = {}) {
    this.options = options;
  }

  public static isSupported(): boolean {
    return typeof window !== "undefined" && Boolean(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  }

  public setOptions(newOptions: Partial<SpeechRecognizerOptions>) {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Starts speech recognition
   */
  public async start(): Promise<boolean> {
    if (!SpeechRecognizer.isSupported()) {
      this.options.onError?.({
        code: "not_supported",
        message: "Speech recognition is not supported in this browser. Please use Google Chrome, Edge, or Safari.",
        isPermissionDenied: false,
      });
      return false;
    }

    // Stop any existing instance cleanly first
    this.stop();
    this.shouldBeRunning = true;
    this.isPausedForPlayback = false;
    this.currentTranscript = "";
    this.accumulatedText = "";

    try {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      const recognition = new SpeechRecognitionClass();
      this.recognition = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Select speech language
      if (this.options.language === "bn-en" || this.options.language === "bn") {
        recognition.lang = "bn-BD";
      } else if (this.options.language === "en") {
        recognition.lang = "en-US";
      } else {
        // Auto / mixed: Use user browser locale or en-US default
        const browserLang = navigator.language || "en-US";
        recognition.lang = browserLang.startsWith("bn") ? "bn-BD" : "en-US";
      }

      recognition.onstart = () => {
        this.isListening = true;
        this.options.onStateChange?.(true);
      };

      recognition.onspeechstart = () => {
        this.lastSpeechTimestamp = Date.now();
        if (!this.isPausedForPlayback) {
          this.options.onSpeechStart?.();
        }
      };

      recognition.onresult = (event: any) => {
        if (this.isPausedForPlayback) return;

        let interim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || "";

          if (result.isFinal) {
            finalChunk += transcript + " ";
          } else {
            interim += transcript;
          }
        }

        if (finalChunk.trim()) {
          this.accumulatedText = (this.accumulatedText + " " + finalChunk).trim();
          this.currentTranscript = this.accumulatedText;
        } else {
          this.currentTranscript = (this.accumulatedText + " " + interim).trim();
        }

        this.lastSpeechTimestamp = Date.now();

        if (this.currentTranscript) {
          this.options.onInterimResult?.(this.currentTranscript);

          // Clear any pending silence timer
          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }

          // Schedule speech finalization after configured pause threshold (default 1200ms)
          const pauseMs = this.options.pauseThresholdMs || 1200;
          this.silenceTimer = setTimeout(() => {
            this.finalizeSpeechTurn();
          }, pauseMs);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("[SpeechRecognizer] Notice:", event.error);

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          this.shouldBeRunning = false;
          this.isListening = false;
          this.options.onError?.({
            code: "permission_denied",
            message: "Microphone permission was denied. Please allow microphone access in your browser.",
            isPermissionDenied: true,
          });
          this.options.onStateChange?.(false);
          return;
        }

        if (event.error === "no-speech") {
          // Normal when silent, keep running
          return;
        }

        if (event.error === "network") {
          console.warn("[SpeechRecognizer] Network hiccup with speech recognition service.");
        }
      };

      recognition.onend = () => {
        this.isListening = false;

        // If user finished a turn right as recognition ended, emit final text
        if (this.currentTranscript && this.currentTranscript.trim().length > 0) {
          this.finalizeSpeechTurn();
        }

        // If session should continue running and not paused, restart automatically
        if (this.shouldBeRunning && !this.isPausedForPlayback) {
          this.restartTimeout = setTimeout(() => {
            if (this.shouldBeRunning && !this.isPausedForPlayback) {
              try {
                this.recognition?.start();
              } catch {
                // Ignore if already started
              }
            }
          }, 200);
        } else {
          this.options.onStateChange?.(false);
        }
      };

      recognition.start();
      return true;
    } catch (err: any) {
      console.warn("[SpeechRecognizer] Start error:", err);
      if (err?.name === "NotAllowedError") {
        this.options.onError?.({
          code: "permission_denied",
          message: "Microphone permission was denied.",
          isPermissionDenied: true,
        });
      }
      this.shouldBeRunning = false;
      this.isListening = false;
      this.options.onStateChange?.(false);
      return false;
    }
  }

  /**
   * Finalizes the current user speech turn and sends to Dora
   */
  public finalizeSpeechTurn(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    const textToEmit = this.currentTranscript.trim();
    this.currentTranscript = "";
    this.accumulatedText = "";

    if (textToEmit.length > 0) {
      this.options.onFinalResult?.(textToEmit);
    }
  }

  /**
   * Temporarily pauses speech recognition while Dora is speaking
   * (Prevents Dora from hearing and transcribing her own voice)
   */
  public pauseForPlayback(): void {
    this.isPausedForPlayback = true;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    try {
      this.recognition?.stop();
    } catch {
      // ignore
    }
  }

  /**
   * Resumes speech recognition once Dora has finished speaking
   */
  public resumeAfterPlayback(): void {
    this.isPausedForPlayback = false;
    this.currentTranscript = "";
    this.accumulatedText = "";

    if (this.shouldBeRunning) {
      try {
        this.recognition?.start();
      } catch {
        // ignore if already running
      }
    }
  }

  /**
   * Completely stops speech recognition
   */
  public stop(): void {
    this.shouldBeRunning = false;
    this.isPausedForPlayback = false;
    this.isListening = false;
    this.currentTranscript = "";
    this.accumulatedText = "";

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.recognition = null;
    }

    this.options.onStateChange?.(false);
  }

  public getIsListening(): boolean {
    return this.isListening;
  }
}
