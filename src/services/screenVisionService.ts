/**
 * Dora Screen Vision Service
 * Captures screen frames efficiently via getDisplayMedia, performs adaptive change
 * detection, and feeds low-latency visual context to Dora's Live AI session.
 */

export interface ScreenVisionCallbacks {
  onFrame?: (base64Jpeg: string) => void;
  onStarted?: () => void;
  onStopped?: () => void;
  onError?: (err: Error) => void;
}

export class ScreenVisionService {
  private static instance: ScreenVisionService | null = null;
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private captureIntervalId: any = null;
  private isCapturing: boolean = false;
  private lastFrameData: Uint8ClampedArray | null = null;
  private lastSentTime: number = 0;
  private callbacks: ScreenVisionCallbacks = {};

  public static getInstance(): ScreenVisionService {
    if (!ScreenVisionService.instance) {
      ScreenVisionService.instance = new ScreenVisionService();
    }
    return ScreenVisionService.instance;
  }

  /**
   * Feature check whether getDisplayMedia is supported on the current browser/device
   */
  public isSupported(): boolean {
    try {
      return (
        typeof window !== "undefined" &&
        typeof navigator !== "undefined" &&
        !!navigator.mediaDevices &&
        typeof navigator.mediaDevices.getDisplayMedia === "function"
      );
    } catch {
      return false;
    }
  }

  public getIsActive(): boolean {
    return this.isCapturing && this.stream !== null && this.stream.active;
  }

  /**
   * Requests user permission to share screen and begins adaptive frame extraction
   */
  public async startCapture(callbacks: ScreenVisionCallbacks): Promise<boolean> {
    this.callbacks = callbacks;

    if (!this.isSupported()) {
      const err = new Error("Screen sharing is not supported on this device or browser.");
      this.callbacks.onError?.(err);
      return false;
    }

    try {
      if (!navigator?.mediaDevices?.getDisplayMedia) {
        throw new Error("Screen sharing is not supported on this device or browser.");
      }

      // Prompt user for screen / window / tab capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "default" as any,
          frameRate: { ideal: 5, max: 15 },
        },
        audio: false,
      });

      this.stream = stream;
      this.isCapturing = true;

      // Listen for when user stops sharing via browser's native bar
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopCapture();
        };
      }

      // Initialize hidden video element for frame capture
      this.videoElement = document.createElement("video");
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true;
      this.videoElement.muted = true;
      this.videoElement.srcObject = stream;

      await new Promise<void>((resolve) => {
        if (!this.videoElement) return resolve();
        this.videoElement.onloadedmetadata = () => {
          this.videoElement?.play().then(() => resolve()).catch(() => resolve());
        };
      });

      this.canvasElement = document.createElement("canvas");
      this.lastFrameData = null;
      this.lastSentTime = 0;

      // Extract first frame immediately
      this.sampleFrame(true);

      // Start adaptive periodic frame extraction (every 1.2s check for visual changes)
      this.captureIntervalId = setInterval(() => {
        this.sampleFrame(false);
      }, 1200);

      this.callbacks.onStarted?.();
      return true;
    } catch (err: any) {
      this.isCapturing = false;
      this.cleanupStream();

      // Detect if user simply cancelled the dialog
      if (err.name === "NotAllowedError" || err.message?.includes("Permission denied")) {
        console.log("[Screen Vision] Screen capture was cancelled or dismissed by user.");
      } else {
        console.warn("[Screen Vision] Screen capture error:", err);
        this.callbacks.onError?.(err);
      }
      return false;
    }
  }

  /**
   * Samples a frame from the live video stream with downscaling and compression
   */
  private sampleFrame(force: boolean = false) {
    if (!this.isCapturing || !this.videoElement || !this.canvasElement || !this.stream) {
      return;
    }

    const video = this.videoElement;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    // Scale to max width 960px to keep payload ultra lightweight (< 40KB) and fast
    const maxWidth = 960;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);

    this.canvasElement.width = width;
    this.canvasElement.height = height;

    const ctx = this.canvasElement.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    const now = Date.now();
    let shouldSend = force;

    // Check if enough visual change occurred or if maximum keep-alive time (4.5s) elapsed
    if (!shouldSend) {
      try {
        // Sample downscaled thumbnail (32x18) for quick change detection
        const smallCanvas = document.createElement("canvas");
        smallCanvas.width = 32;
        smallCanvas.height = 18;
        const smallCtx = smallCanvas.getContext("2d");
        if (smallCtx) {
          smallCtx.drawImage(this.canvasElement, 0, 0, 32, 18);
          const currentData = smallCtx.getImageData(0, 0, 32, 18).data;

          if (!this.lastFrameData) {
            shouldSend = true;
          } else {
            let diffScore = 0;
            const step = 4 * 2; // sample pixels
            for (let i = 0; i < currentData.length; i += step) {
              diffScore += Math.abs(currentData[i] - this.lastFrameData[i]);
            }
            // If significant change detected or 4.5s has elapsed since last frame
            if (diffScore > 600 || now - this.lastSentTime > 4500) {
              shouldSend = true;
            }
          }
          this.lastFrameData = currentData;
        }
      } catch (_) {
        shouldSend = now - this.lastSentTime > 2500;
      }
    }

    if (shouldSend) {
      // Export as efficient JPEG (quality 0.72)
      const dataUrl = this.canvasElement.toDataURL("image/jpeg", 0.72);
      const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
      this.lastSentTime = now;
      this.callbacks.onFrame?.(base64Data);
    }
  }

  /**
   * Stops screen capture and cleans up all media tracks and timers
   */
  public stopCapture() {
    if (!this.isCapturing && !this.stream) return;
    this.isCapturing = false;
    if (this.captureIntervalId) {
      clearInterval(this.captureIntervalId);
      this.captureIntervalId = null;
    }
    this.cleanupStream();
    this.callbacks.onStopped?.();
  }

  private cleanupStream() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
    this.canvasElement = null;
    this.lastFrameData = null;
  }
}

export const screenVisionService = ScreenVisionService.getInstance();
