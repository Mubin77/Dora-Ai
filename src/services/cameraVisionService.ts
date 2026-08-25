/**
 * Dora Live Camera Vision Service
 * Captures real-time camera video via getUserMedia, provides video stream for live UI preview,
 * performs lightweight frame sampling with compression, and feeds visual context to Dora's AI session.
 */

export type CameraFacingMode = "environment" | "user";

export interface CameraVisionCallbacks {
  onFrame?: (base64Jpeg: string) => void;
  onStarted?: (stream: MediaStream) => void;
  onStopped?: () => void;
  onError?: (err: Error) => void;
}

export class CameraVisionService {
  private static instance: CameraVisionService | null = null;
  private stream: MediaStream | null = null;
  private offscreenVideo: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private captureIntervalId: any = null;
  private isCapturing: boolean = false;
  private currentFacingMode: CameraFacingMode = "environment";
  private latestFrame: string | null = null;
  private lastSentTime: number = 0;
  private lastFrameData: Uint8ClampedArray | null = null;
  private callbacks: CameraVisionCallbacks = {};

  public static getInstance(): CameraVisionService {
    if (!CameraVisionService.instance) {
      CameraVisionService.instance = new CameraVisionService();
    }
    return CameraVisionService.instance;
  }

  public isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function"
    );
  }

  public getIsActive(): boolean {
    return this.isCapturing && this.stream !== null && this.stream.active;
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }

  public getLatestFrame(): string | null {
    return this.latestFrame;
  }

  public getFacingMode(): CameraFacingMode {
    return this.currentFacingMode;
  }

  /**
   * Starts real device camera stream and initiates background frame sampling
   */
  public async startCamera(
    callbacks: CameraVisionCallbacks,
    facingMode: CameraFacingMode = "environment"
  ): Promise<boolean> {
    this.callbacks = callbacks;
    this.currentFacingMode = facingMode;

    if (!this.isSupported()) {
      const err = new Error("Camera is not supported on this device or browser.");
      this.callbacks.onError?.(err);
      return false;
    }

    // Stop any existing stream before starting a new one
    this.stopCamera();

    try {
      let stream: MediaStream;

      try {
        // Prefer desired facing mode (environment for rear camera)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
          },
          audio: false,
        });
      } catch (idealErr) {
        console.warn("[CameraVision] Ideal camera constraints failed, attempting fallback:", idealErr);
        // Fallback to basic video constraint if ideal facingMode is rejected
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      this.stream = stream;
      this.isCapturing = true;

      // Handle track ended unexpectedly (e.g. system interrupt)
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopCamera();
        };
      }

      // Initialize offscreen video element for frame sampling
      this.offscreenVideo = document.createElement("video");
      this.offscreenVideo.autoplay = true;
      this.offscreenVideo.playsInline = true;
      this.offscreenVideo.muted = true;
      this.offscreenVideo.srcObject = stream;

      await new Promise<void>((resolve) => {
        if (!this.offscreenVideo) return resolve();
        this.offscreenVideo.onloadedmetadata = () => {
          this.offscreenVideo?.play().then(() => resolve()).catch(() => resolve());
        };
      });

      this.canvasElement = document.createElement("canvas");
      this.lastFrameData = null;
      this.lastSentTime = 0;

      // Extract initial frame immediately
      this.sampleFrame(true);

      // Throttled frame sampling every 1000ms (1 frame/sec) for lightweight network bandwidth
      this.captureIntervalId = setInterval(() => {
        this.sampleFrame(false);
      }, 1000);

      this.callbacks.onStarted?.(stream);
      return true;
    } catch (err: any) {
      this.isCapturing = false;
      this.cleanupStream();

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError" || err.message?.includes("denied")) {
        const customErr = new Error("Camera permission was denied. Please allow camera access.");
        (customErr as any).isPermissionDenied = true;
        this.callbacks.onError?.(customErr);
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        const customErr = new Error("No camera found on this device.");
        this.callbacks.onError?.(customErr);
      } else {
        this.callbacks.onError?.(err);
      }
      return false;
    }
  }

  /**
   * Toggles between front and rear cameras
   */
  public async switchCamera(): Promise<boolean> {
    const nextMode: CameraFacingMode = this.currentFacingMode === "environment" ? "user" : "environment";
    return this.startCamera(this.callbacks, nextMode);
  }

  /**
   * Samples and compresses a frame from the live video stream
   */
  private sampleFrame(force: boolean = false) {
    if (!this.isCapturing || !this.offscreenVideo || !this.canvasElement || !this.stream) {
      return;
    }

    const video = this.offscreenVideo;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    // Downscale to max dimension 640px for fast transmission (< 35KB per frame)
    const maxDim = 640;
    const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);

    this.canvasElement.width = width;
    this.canvasElement.height = height;

    const ctx = this.canvasElement.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    const now = Date.now();
    let shouldSend = force;

    // Check if visual change occurred or if keepalive interval (3s) elapsed
    if (!shouldSend) {
      try {
        const smallCanvas = document.createElement("canvas");
        smallCanvas.width = 32;
        smallCanvas.height = 24;
        const smallCtx = smallCanvas.getContext("2d");
        if (smallCtx) {
          smallCtx.drawImage(this.canvasElement, 0, 0, 32, 24);
          const currentData = smallCtx.getImageData(0, 0, 32, 24).data;

          if (!this.lastFrameData) {
            shouldSend = true;
          } else {
            let diffScore = 0;
            const step = 4 * 2;
            for (let i = 0; i < currentData.length; i += step) {
              diffScore += Math.abs(currentData[i] - this.lastFrameData[i]);
            }
            if (diffScore > 500 || now - this.lastSentTime > 3000) {
              shouldSend = true;
            }
          }
          this.lastFrameData = currentData;
        }
      } catch (_) {
        shouldSend = now - this.lastSentTime > 2000;
      }
    }

    if (shouldSend) {
      const dataUrl = this.canvasElement.toDataURL("image/jpeg", 0.68);
      const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
      this.latestFrame = base64Data;
      this.lastSentTime = now;
      this.callbacks.onFrame?.(base64Data);
    }
  }

  /**
   * Stops camera stream and releases all media tracks, intervals, and memory
   */
  public stopCamera() {
    if (!this.isCapturing && !this.stream) return;
    this.isCapturing = false;
    if (this.captureIntervalId) {
      clearInterval(this.captureIntervalId);
      this.captureIntervalId = null;
    }
    this.cleanupStream();
    this.latestFrame = null;
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
    if (this.offscreenVideo) {
      this.offscreenVideo.srcObject = null;
      this.offscreenVideo = null;
    }
    this.canvasElement = null;
    this.lastFrameData = null;
  }
}

export const cameraVisionService = CameraVisionService.getInstance();
