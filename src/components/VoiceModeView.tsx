import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Tv,
  Camera,
  Sparkles,
  SwitchCamera,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatMessage, ConversationState, DoraEmotion } from "../types";
import { VoiceOrb } from "./VoiceOrb";
import { DoraSparkle } from "./DoraSparkle";

export interface VoiceModeViewProps {
  state: ConversationState;
  emotion: DoraEmotion;
  volumeLevel: number;
  isMuted: boolean;
  isCallActive: boolean;
  callDuration: number;
  currentSpokenText: string;
  messages: ChatMessage[];
  userName: string;
  isScreenVisionActive: boolean;
  screenSharingNotice: string | null;
  isCameraActive: boolean;
  cameraStream: MediaStream | null;
  onToggleCamera: () => void;
  onSwitchCameraFacing?: () => void;
  onDismissScreenNotice: () => void;
  onToggleScreenVision: () => void;
  onToggleMute: () => void;
  onToggleCall: () => void;
  onInterrupt: () => void;
  onOpenSidebar: () => void;
  onOpenMemory: () => void;
  onOpenSettings: () => void;
  onSwitchToChat: () => void;
  onSendTextMessage: (text: string) => void;
}

export const VoiceModeView: React.FC<VoiceModeViewProps> = ({
  state,
  emotion,
  volumeLevel,
  isMuted,
  isCallActive,
  callDuration,
  currentSpokenText,
  messages,
  userName,
  isScreenVisionActive,
  screenSharingNotice,
  isCameraActive,
  cameraStream,
  onToggleCamera,
  onSwitchCameraFacing,
  onDismissScreenNotice,
  onToggleScreenVision,
  onToggleMute,
  onToggleCall,
  onInterrupt,
  onOpenSidebar,
  onOpenMemory,
  onOpenSettings,
  onSwitchToChat,
  onSendTextMessage,
}) => {
  const [isCameraExpanded, setIsCameraExpanded] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Reset expanded state if camera is stopped
  useEffect(() => {
    if (!isCameraActive) {
      setIsCameraExpanded(false);
    }
  }, [isCameraActive]);

  // Attach camera stream to live video preview element
  useEffect(() => {
    if (videoPreviewRef.current && cameraStream) {
      videoPreviewRef.current.srcObject = cameraStream;
      videoPreviewRef.current.play().catch((e) => {
        console.log("[CameraPreview] Autoplay suppressed, retrying on interaction:", e);
      });
    }
  }, [cameraStream, isCameraActive, isCameraExpanded]);

  // Identify latest user voice turn & latest Dora response
  const latestUserVoiceMsg = [...messages]
    .reverse()
    .find((m) => m.sender === "user");

  const latestDoraMsg = [...messages]
    .reverse()
    .find((m) => m.sender === "dora");

  const isSpeaking = state === "speaking";
  const isListening = isCallActive && state === "listening" && !isMuted;
  const isThinking = state === "thinking";

  // Active dialogue text
  const activeDoraText = currentSpokenText || (isSpeaking ? latestDoraMsg?.text : null);
  const isUserSpeakingActive = isListening && latestUserVoiceMsg && latestUserVoiceMsg.isStreaming;

  // Dora Voice button handler: single primary control for starting or ending immersive voice session
  const handleDoraVoiceToggle = () => {
    onToggleCall();
  };

  return (
    <div
      id="dora-voice-mode-root"
      className="fixed inset-0 z-30 flex flex-col justify-between bg-black text-[#E3E3E3] font-sans select-none overflow-hidden"
    >
      {/* Background Cinematic Deep-Blue Ambient Bottom Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Deep navy base layer for smooth falloff into pure AMOLED black */}
        <div className="absolute -bottom-48 left-1/2 -translate-x-1/2 w-[900px] sm:w-[1200px] h-[450px] sm:h-[520px] bg-[#0E358A]/[0.25] rounded-full blur-[160px]" />
        {/* Core lower deep-blue atmospheric bloom */}
        <div className="absolute -bottom-36 left-1/2 -translate-x-1/2 w-[720px] sm:w-[900px] h-[360px] sm:h-[420px] bg-[#1A56DB]/[0.2] rounded-full blur-[120px]" />
      </div>

      {/* ============================================================ */}
      {/* TOP BAR: Clean Floating Top-Left Menu, Clean Top-Right       */}
      {/* ============================================================ */}
      <header
        id="dora-voice-topbar"
        className="relative z-20 w-full px-5 sm:px-8 pt-6 pb-2 flex items-center justify-between"
      >
        {/* Left: Floating Circular Hamburger Icon Button */}
        <button
          id="btn-voice-menu"
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open Navigation Menu"
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#18181b]/80 hover:bg-[#232328] active:bg-[#2c2c32] border border-white/[0.1] text-white/90 hover:text-white active:scale-95 transition-all flex items-center justify-center shrink-0 backdrop-blur-md shadow-md"
        >
          <div className="flex flex-col gap-1 w-4 sm:w-4.5">
            <span className="w-full h-0.5 bg-white/90 rounded-full" />
            <span className="w-3 h-0.5 bg-white/90 rounded-full" />
          </div>
        </button>

        {/* Center/Right Vision Status Indicators (if active) */}
        <div className="flex items-center gap-2">
          {isCameraActive && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1D72FE]/20 border border-[#1D72FE]/40 text-[#38BDF8] text-xs font-medium backdrop-blur-md animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
              <span>Camera Active</span>
            </div>
          )}
          {isScreenVisionActive && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium backdrop-blur-md animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Screen Sharing</span>
            </div>
          )}
        </div>
      </header>

      {/* Screen Sharing / Camera Notice Toast */}
      {screenSharingNotice && (
        <div
          id="voice-screen-sharing-notice"
          className="relative z-30 mx-auto px-4 py-2 rounded-full bg-[#18181b] border border-white/10 flex items-center gap-2.5 text-sm text-white/90 shadow-2xl backdrop-blur-md animate-fade-in max-w-md"
        >
          <Sparkles className="w-4 h-4 text-[#38BDF8] shrink-0" />
          <span className="text-xs sm:text-sm">{screenSharingNotice}</span>
          <button
            onClick={onDismissScreenNotice}
            className="ml-1 text-xs text-white/50 hover:text-white shrink-0 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* CENTER STAGE: Centered Dora Celestial Orb & Minimal Dialogue */}
      {/* ============================================================ */}
      <main
        id="dora-voice-center-stage"
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 max-w-3xl mx-auto w-full my-auto"
      >
        {/* Large Centered Celestial Voice Orb (Animated Ethereal Sphere) */}
        <div className="relative flex flex-col items-center justify-center">
          <VoiceOrb
            state={state}
            volumeLevel={volumeLevel}
            emotion={emotion}
            isMuted={isMuted}
            onClick={isSpeaking ? onInterrupt : handleDoraVoiceToggle}
          />
        </div>

        {/* Minimal Subtitle / Status Dialogue (Clean negative space) */}
        <div className="w-full text-center mt-6 min-h-[48px] flex items-center justify-center">
          {activeDoraText ? (
            <p className="text-base sm:text-lg text-white/80 font-light max-w-xl mx-auto line-clamp-2 animate-fade-in">
              {activeDoraText}
            </p>
          ) : isUserSpeakingActive ? (
            <p className="text-base sm:text-lg text-[#38BDF8]/90 font-light max-w-xl mx-auto line-clamp-2 animate-fade-in">
              "{latestUserVoiceMsg.text}"
            </p>
          ) : isThinking ? (
            <div className="flex items-center gap-2 text-white/50 text-sm font-light">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-ping" />
              <span>Thinking...</span>
            </div>
          ) : isMuted ? (
            <p className="text-sm text-amber-400/80 font-normal">Microphone Muted</p>
          ) : null}
        </div>
      </main>

      {/* ============================================================ */}
      {/* FLOATING LIVE CAMERA PREVIEW (When Camera is Active)         */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isCameraActive && !isCameraExpanded && (
          <motion.div
            key="camera-compact-preview"
            initial={{ opacity: 0, scale: 0.8, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 15 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={() => setIsCameraExpanded(true)}
            className="fixed bottom-28 sm:bottom-32 right-4 sm:right-6 md:right-8 z-30 w-[34vw] min-w-[125px] max-w-[155px] sm:w-44 md:w-52 aspect-[3/4] sm:aspect-[4/3] rounded-2xl overflow-hidden bg-[#121316] border border-white/20 hover:border-[#1D72FE]/70 shadow-[0_12px_36px_rgba(0,0,0,0.85),0_0_24px_rgba(29,114,254,0.18)] cursor-pointer group select-none backdrop-blur-md"
            title="Tap to expand camera preview"
          >
            <video
              ref={videoPreviewRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover rounded-2xl pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/40 pointer-events-none" />

            <div className="absolute top-2 inset-x-2 flex items-center justify-between z-10">
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/65 backdrop-blur-md border border-white/10 text-[9px] font-medium text-white/90">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span>LIVE</span>
              </div>

              {onSwitchCameraFacing && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSwitchCameraFacing();
                  }}
                  title="Switch Camera"
                  className="p-1 rounded-full bg-black/65 hover:bg-black/85 text-white/80 hover:text-white backdrop-blur-md border border-white/10 transition-colors"
                >
                  <SwitchCamera className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="absolute bottom-2 right-2 p-1 rounded-full bg-black/65 backdrop-blur-md text-white/70 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity border border-white/10">
              <Maximize2 className="w-3 h-3" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Camera Preview Modal */}
      <AnimatePresence>
        {isCameraActive && isCameraExpanded && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCameraExpanded(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              key="camera-expanded-modal"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-lg aspect-[4/3] sm:aspect-video rounded-3xl overflow-hidden bg-[#121316] border border-white/20 shadow-[0_24px_60px_rgba(0,0,0,0.95)]"
            >
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none" />

              <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/10 text-[11px] font-medium text-white/90">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>LIVE CAMERA</span>
                </div>

                <div className="flex items-center gap-2">
                  {onSwitchCameraFacing && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSwitchCameraFacing();
                      }}
                      title="Switch Camera"
                      className="p-1.5 rounded-full bg-black/65 hover:bg-black/85 text-white/80 hover:text-white backdrop-blur-md border border-white/10 transition-colors"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCameraExpanded(false);
                    }}
                    title="Minimize"
                    className="p-1.5 rounded-full bg-black/65 hover:bg-black/85 text-white/80 hover:text-white backdrop-blur-md border border-white/10 transition-colors"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* BOTTOM CONTROLS BAR: Circular Floating Controls             */}
      {/* EXACT LAYOUT: Camera → Device/Media → Dora Voice → Mic       */}
      {/* ============================================================ */}
      <footer
        id="dora-voice-bottom-controls"
        className="relative z-20 w-full pb-8 sm:pb-12 pt-2 px-4 flex items-center justify-center"
      >
        <div className="flex items-center justify-center gap-3.5 sm:gap-5">
          {/* 1. Camera Control Button */}
          <button
            id="btn-voice-camera"
            type="button"
            onClick={onToggleCamera}
            title={isCameraActive ? "Turn Off Camera" : "Turn On Camera"}
            aria-label={isCameraActive ? "Turn Off Camera" : "Turn On Camera"}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border transition-all duration-200 shrink-0 backdrop-blur-md active:scale-95 shadow-md ${
              isCameraActive
                ? "bg-[#1D72FE]/25 border-[#1D72FE]/60 text-[#38BDF8] hover:bg-[#1D72FE]/35"
                : "bg-[#18181b]/90 hover:bg-[#232328] active:bg-[#2c2c32] border-white/[0.1] text-white/80 hover:text-white"
            }`}
          >
            <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* 2. Device / Media (Screen Share) Control Button */}
          <button
            id="btn-voice-screen"
            type="button"
            onClick={onToggleScreenVision}
            title={isScreenVisionActive ? "Stop Screen Sharing" : "Share Screen / Device Media"}
            aria-label={isScreenVisionActive ? "Stop Screen Sharing" : "Share Screen / Device Media"}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border transition-all duration-200 shrink-0 backdrop-blur-md active:scale-95 shadow-md ${
              isScreenVisionActive
                ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/30"
                : "bg-[#18181b]/90 hover:bg-[#232328] active:bg-[#2c2c32] border-white/[0.1] text-white/80 hover:text-white"
            }`}
          >
            <Tv className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* 3. Dora Voice Button (Primary Session Toggle Control) */}
          <button
            id="btn-voice-dora"
            type="button"
            onClick={handleDoraVoiceToggle}
            title={isCallActive ? "End Voice Session" : "Start Voice Session"}
            aria-label={isCallActive ? "End Voice Session" : "Start Voice Session"}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border transition-all duration-200 shrink-0 backdrop-blur-md active:scale-95 relative group shadow-[0_0_24px_rgba(29,114,254,0.35)] ${
              isCallActive
                ? "bg-[#1D72FE] hover:bg-[#155FD6] border-[#38BDF8]/60 text-white shadow-[0_0_30px_rgba(29,114,254,0.5)]"
                : "bg-[#18181b]/90 hover:bg-[#232328] active:bg-[#2c2c32] border-white/[0.15] text-white"
            }`}
          >
            {/* Glowing animated halo when active */}
            {isCallActive && (
              <span className="absolute inset-0 rounded-full border-2 border-[#38BDF8]/40 animate-ping pointer-events-none opacity-40" />
            )}
            <DoraSparkle
              size={32}
              state={state}
              isCallActive={isCallActive}
              volumeLevel={volumeLevel}
            />
          </button>

          {/* 4. Microphone Mute / Unmute Control Button */}
          <button
            id="btn-voice-mic"
            type="button"
            onClick={onToggleMute}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            aria-label={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border transition-all duration-200 shrink-0 backdrop-blur-md active:scale-95 shadow-md ${
              isMuted
                ? "bg-amber-500/20 border-amber-500/60 text-amber-300 hover:bg-amber-500/30"
                : "bg-[#18181b]/90 hover:bg-[#232328] active:bg-[#2c2c32] border-white/[0.1] text-white/80 hover:text-white"
            }`}
          >
            {isMuted ? (
              <MicOff className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
            ) : (
              <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </button>
        </div>
      </footer>
    </div>
  );
};
