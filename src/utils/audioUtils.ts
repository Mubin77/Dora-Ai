/**
 * Audio Utilities for Dora Voice Assistant
 * Supports 16kHz PCM recording, 24kHz PCM playback, frequency analysis,
 * VAD (Voice Activity Detection), and Web Speech API fallbacks.
 */

export class AudioEngine {
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;

  private nextPlayTime: number = 0;
  private activeSourceNodes: AudioBufferSourceNode[] = [];
  private isListening: boolean = false;
  private isSpeaking: boolean = false;

  // Callbacks
  public onAudioChunk?: (base64Pcm: string) => void;
  public onSpeechStart?: () => void;
  public onSpeechEnd?: (durationMs: number) => void;
  public onVolumeChange?: (volume: number, isOutput: boolean) => void;
  public onPlaybackStarted?: () => void;
  public onPlaybackEnded?: () => void;

  // VAD state
  private silenceTimer: any = null;
  private speechStartTime: number = 0;
  private isUserTalking: boolean = false;
  private silenceThresholdMs: number = 1200; // configurable pause threshold

  constructor() {}

  public getOutputAnalyser(): AnalyserNode | null {
    return this.outputAnalyser;
  }

  public getInputAnalyser(): AnalyserNode | null {
    return this.inputAnalyser;
  }

  public setPauseThreshold(ms: number) {
    this.silenceThresholdMs = Math.max(600, Math.min(3000, ms));
  }

  private getOrCreateInputContext(): AudioContext {
    if (!this.inputAudioCtx || this.inputAudioCtx.state === "closed") {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Web Audio API is not supported in this browser");
      }
      try {
        this.inputAudioCtx = new AudioContextClass({ sampleRate: 16000 });
      } catch {
        try {
          this.inputAudioCtx = new AudioContextClass();
        } catch (e: any) {
          throw new Error("Failed to initialize AudioContext: " + (e?.message || "unsupported"));
        }
      }
    }
    return this.inputAudioCtx;
  }

  /**
   * Initializes microphone stream and audio processor
   */
  public async startMicrophone(): Promise<boolean> {
    try {
      if (this.isListening) return true;

      // 1. Request microphone access
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 2. Ensure AudioContext is ready and active
      const ctx = this.getOrCreateInputContext();
      if (ctx.state === "suspended") {
        await ctx.resume().catch(() => {});
      }

      // 3. Connect MediaStreamSource and Analyser
      this.sourceNode = ctx.createMediaStreamSource(this.micStream);
      this.inputAnalyser = ctx.createAnalyser();
      this.inputAnalyser.fftSize = 256;
      this.inputAnalyser.smoothingTimeConstant = 0.8;

      // Script processor for audio streaming (buffer size 4096 gives ~256ms packets)
      this.processorNode = ctx.createScriptProcessor(4096, 1, 1);

      this.sourceNode.connect(this.inputAnalyser);
      this.inputAnalyser.connect(this.processorNode);
      this.processorNode.connect(ctx.destination);

      this.processorNode.onaudioprocess = (e) => {
        if (!this.isListening) return;

        const inputData = e.inputBuffer.getChannelData(0);
        
        // Compute volume level
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const volume = Math.min(1, rms * 5);

        if (this.onVolumeChange) {
          this.onVolumeChange(volume, false);
        }

        // Voice Activity Detection (VAD)
        const speechVolumeThreshold = 0.015;
        if (rms > speechVolumeThreshold) {
          if (!this.isUserTalking) {
            this.isUserTalking = true;
            this.speechStartTime = Date.now();
            if (this.onSpeechStart) this.onSpeechStart();
          }

          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }
        } else if (this.isUserTalking) {
          if (!this.silenceTimer) {
            this.silenceTimer = setTimeout(() => {
              if (this.isUserTalking) {
                this.isUserTalking = false;
                const duration = Date.now() - this.speechStartTime;
                if (this.onSpeechEnd) this.onSpeechEnd(duration);
              }
              this.silenceTimer = null;
            }, this.silenceThresholdMs);
          }
        }

        // Convert audio buffer to 16-bit PCM little-endian at 16kHz
        const pcm16 = this.downsampleTo16k(inputData, ctx.sampleRate);
        const base64Audio = this.arrayBufferToBase64(pcm16.buffer);
        if (this.onAudioChunk) {
          this.onAudioChunk(base64Audio);
        }
      };

      this.isListening = true;
      return true;
    } catch (err: any) {
      console.error("Failed to start microphone:", err);
      this.isListening = false;
      if (this.micStream) {
        this.micStream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch (_) {}
        });
        this.micStream = null;
      }
      if (this.inputAudioCtx && this.inputAudioCtx.state !== "closed") {
        try {
          this.inputAudioCtx.close();
        } catch {
          // ignore
        }
        this.inputAudioCtx = null;
      }
      throw err;
    }
  }

  private downsampleTo16k(inputData: Float32Array, inputSampleRate: number): Int16Array {
    if (inputSampleRate === 16000) {
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      return pcm16;
    }

    const sampleRateRatio = inputSampleRate / 16000;
    const newLength = Math.round(inputData.length / sampleRateRatio);
    const result = new Int16Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < inputData.length; i++) {
        accum += inputData[i];
        count++;
      }
      const s = count > 0 ? Math.max(-1, Math.min(1, accum / count)) : 0;
      result[offsetResult] = s < 0 ? s * 0x8000 : s * 0x7fff;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  /**
   * Initializes 24kHz output audio context for model playback
   */
  public ensureOutputContext(): AudioContext {
    if (!this.outputAudioCtx || this.outputAudioCtx.state === "closed") {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Web Audio API is not supported in this browser");
      }
      try {
        this.outputAudioCtx = new AudioContextClass({ sampleRate: 24000 });
      } catch {
        this.outputAudioCtx = new AudioContextClass();
      }
      this.outputAnalyser = this.outputAudioCtx.createAnalyser();
      this.outputAnalyser.fftSize = 256;
      this.outputAnalyser.smoothingTimeConstant = 0.8;
      this.outputAnalyser.connect(this.outputAudioCtx.destination);
    }
    if (this.outputAudioCtx.state === "suspended") {
      this.outputAudioCtx.resume().catch(() => {});
    }
    return this.outputAudioCtx;
  }

  /**
   * Schedules a chunk of 24kHz raw PCM base64 audio with gapless low-latency playback
   */
  public playAudioChunk(base64Pcm: string, sampleRate = 24000): void {
    try {
      const ctx = this.ensureOutputContext();
      const binary = atob(base64Pcm);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Convert 16-bit PCM bytes to Float32
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      if (this.outputAnalyser) {
        source.connect(this.outputAnalyser);
      } else {
        source.connect(ctx.destination);
      }

      const currentTime = ctx.currentTime;
      const isFirstInQueue = this.activeSourceNodes.length === 0;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime + 0.005; // Immediate start (5ms lookahead for gapless scheduling)
      }

      source.start(this.nextPlayTime);
      this.isSpeaking = true;
      this.activeSourceNodes.push(source);

      if (isFirstInQueue && this.onPlaybackStarted) {
        this.onPlaybackStarted();
      }

      const duration = audioBuffer.duration;
      this.nextPlayTime += duration;

      source.onended = () => {
        const index = this.activeSourceNodes.indexOf(source);
        if (index > -1) {
          this.activeSourceNodes.splice(index, 1);
        }
        if (this.activeSourceNodes.length === 0) {
          this.isSpeaking = false;
          if (this.onPlaybackEnded) {
            this.onPlaybackEnded();
          }
        }
      };
    } catch (err) {
      console.error("Error playing audio chunk:", err);
    }
  }

  /**
   * Instantly stops all scheduled audio playback (for live interruptions)
   */
  public interruptPlayback(): void {
    for (const source of this.activeSourceNodes) {
      try {
        source.stop();
        source.disconnect();
      } catch (_) {}
    }
    this.activeSourceNodes = [];
    this.nextPlayTime = 0;
    this.isSpeaking = false;

    // Stop browser TTS speech if any active
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  public resetQueue(): void {
    this.interruptPlayback();
  }

  public stopMicrophone(): void {
    this.isListening = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    if (this.inputAudioCtx && this.inputAudioCtx.state !== "closed") {
      this.inputAudioCtx.close();
      this.inputAudioCtx = null;
    }
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking || (window.speechSynthesis ? window.speechSynthesis.speaking : false);
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

/**
 * Natural Browser Speech Synthesis Helper (for high-compatibility client playback)
 */
export function playNaturalBrowserSpeech(
  text: string,
  options: {
    rate?: number;
    pitch?: number;
    voiceName?: string;
    onStart?: () => void;
    onEnd?: () => void;
  } = {}
): void {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  // Clean text of emojis & markdown
  const cleanedText = text
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanedText);
  utterance.rate = options.rate || 0.96; // Gentle, unhurried speaking rate (0.93-0.97x)
  utterance.pitch = options.pitch || 1.05; // Soft young-adult feminine tone

  const voices = window.speechSynthesis.getVoices();
  // Prefer natural feminine female voices
  const preferredFemaleVoice = voices.find(
    (v) =>
      (v.name.includes("Female") ||
        v.name.includes("Samantha") ||
        v.name.includes("Karen") ||
        v.name.includes("Victoria") ||
        v.name.includes("Zira") ||
        v.name.includes("Google US English") ||
        v.name.includes("Natural") ||
        v.name.includes("Jenny")) &&
      v.lang.startsWith("en")
  ) || voices.find((v) => v.lang.startsWith("en"));

  if (preferredFemaleVoice) {
    utterance.voice = preferredFemaleVoice;
  }

  if (options.onStart) utterance.onstart = options.onStart;
  if (options.onEnd) utterance.onend = options.onEnd;

  window.speechSynthesis.speak(utterance);
}
