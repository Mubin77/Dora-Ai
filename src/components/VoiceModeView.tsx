import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Mic,
  MicOff,
  Tv,
  Camera,
  Keyboard,
  Share2,
  Copy,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Sparkles,
  Send,
  Check,
  SwitchCamera,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatMessage, ConversationState, DoraEmotion } from "../types";

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
  const [isTextInputOpen, setIsTextInputOpen] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [isCameraExpanded, setIsCameraExpanded] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const contentEndRef = useRef<HTMLDivElement>(null);
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
        console.log("[CameraPreview] Autoplay suppressed, retrying on user interaction:", e);
      });
    }
  }, [cameraStream, isCameraActive, isCameraExpanded]);

  // Identify the latest user voice turn & latest Dora response
  const latestUserVoiceMsg = [...messages]
    .reverse()
    .find((m) => m.sender === "user");

  const latestDoraMsg = [...messages]
    .reverse()
    .find((m) => m.sender === "dora");

  // Format first name for the personal greeting
  const firstName = userName ? userName.split(" ")[0] : "Abdul";

  // Focus input when text input drawer opens
  useEffect(() => {
    if (isTextInputOpen) {
      setTimeout(() => textInputRef.current?.focus(), 150);
    }
  }, [isTextInputOpen]);

  // Auto scroll to latest text when speaking/streaming
  useEffect(() => {
    contentEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSpokenText, latestDoraMsg?.text, latestUserVoiceMsg?.text, state]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    onSendTextMessage(textInput.trim());
    setTextInput("");
    setIsTextInputOpen(false);
  };

  const handleCopyText = (text: string, msgId: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedMessageId(msgId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const isSpeaking = state === "speaking";
  const isListening = isCallActive && state === "listening" && !isMuted;
  const isThinking = state === "thinking";

  // Active streaming display text logic:
  // Priority: 1. Current real-time spoken streaming text
  //           2. If speaking without active subtitle: latest Dora message
  //           3. If user speaking: live user transcript
  //           4. If thinking: show last user prompt
  //           5. Default initial greeting
  const activeDoraText = currentSpokenText || (isSpeaking ? latestDoraMsg?.text : null);
  const isUserSpeakingActive = isListening && latestUserVoiceMsg && latestUserVoiceMsg.isStreaming;

  return (
    <div
      id="dora-voice-mode-root"
      className="fixed inset-0 z-30 flex flex-col justify-between bg-black text-[#E3E3E3] font-sans select-none overflow-hidden"
    >
      {/* Background Cinematic Deep-Blue Ambient Bottom Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Deep navy base layer for smooth falloff into AMOLED black */}
        <div className="absolute -bottom-48 left-1/2 -translate-x-1/2 w-[900px] sm:w-[1200px] h-[450px] sm:h-[520px] bg-[#0E358A]/[0.28] rounded-full blur-[160px]" />
        {/* Core lower deep-blue atmospheric bloom */}
        <div className="absolute -bottom-36 left-1/2 -translate-x-1/2 w-[720px] sm:w-[900px] h-[360px] sm:h-[420px] bg-[#1A56DB]/[0.22] rounded-full blur-[120px]" />
      </div>

      {/* ============================================================ */}
      {/* TOP BAR: Clean, Minimal, Spacious (NO DORA LIVE LABEL)        */}
      {/* ============================================================ */}
      <header
        id="dora-voice-topbar"
        className="relative z-20 w-full px-5 sm:px-8 pt-6 pb-4 flex items-center justify-between"
      >
        {/* Left: Minimal Hamburger Icon Button */}
        <div className="flex items-center gap-3">
          <button
            id="btn-voice-menu"
            type="button"
            onClick={onOpenSidebar}
            aria-label="Open Navigation Menu"
            className="p-2.5 rounded-full text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors flex items-center justify-center shrink-0"
          >
            <div className="flex flex-col gap-1 w-5">
              <span className="w-5 h-0.5 bg-white/90 rounded-full" />
              <span className="w-3.5 h-0.5 bg-white/90 rounded-full" />
            </div>
          </button>
        </div>

        {/* Right: Active Vision Status Pill if Camera or Screen Active */}
        <div className="flex items-center gap-2">
          {isCameraActive && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1D72FE]/20 border border-[#1D72FE]/40 text-[#38BDF8] text-xs font-medium backdrop-blur-md animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
              <span>Camera Active</span>
            </div>
          )}
          {isScreenVisionActive && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium backdrop-blur-md animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Screen Sharing</span>
            </div>
          )}
        </div>
      </header>

      {/* Screen Sharing / Camera Error Notice Toast */}
      {screenSharingNotice && (
        <div
          id="voice-screen-sharing-notice"
          className="relative z-30 mx-auto px-4 py-2 rounded-full bg-[#1E1F22] border border-white/10 flex items-center gap-2.5 text-sm text-white/90 shadow-2xl backdrop-blur-md animate-fade-in max-w-md"
        >
          <Sparkles className="w-4 h-4 text-[#38BDF8] shrink-0" />
          <span className="text-xs sm:text-sm">{screenSharingNotice}</span>
          <button
            onClick={onDismissScreenNotice}
            className="ml-1 p-0.5 rounded-full text-white/50 hover:text-white shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* CENTER STAGE: Pure Clean Dialogue & Status                  */}
      {/* ============================================================ */}
      <main
        id="dora-voice-center-stage"
        className="relative z-10 flex-1 flex flex-col justify-center px-4 sm:px-12 md:px-20 max-w-4xl mx-auto w-full overflow-y-auto custom-scrollbar my-auto py-4 sm:py-8 text-center"
        onClick={() => {
          if (isOptionsMenuOpen) setIsOptionsMenuOpen(false);
        }}
      >
        {/* Prominent Voice State Label: Clearly visible */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              isSpeaking
                ? "bg-[#38BDF8] shadow-[0_0_12px_#38BDF8] animate-pulse"
                : isThinking
                ? "bg-purple-400 shadow-[0_0_12px_rgba(192,132,252,0.8)] animate-pulse"
                : state === "requesting_permission"
                ? "bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.8)] animate-pulse"
                : state === "error"
                ? "bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.8)]"
                : isListening
                ? "bg-[#1D72FE] shadow-[0_0_12px_#1D72FE] animate-pulse"
                : isMuted
                ? "bg-amber-400"
                : isCallActive
                ? "bg-[#1D72FE]"
                : "bg-white/40"
            }`}
          />
          <span className="text-base sm:text-xl font-medium tracking-tight text-white/70 font-sans">
            {isSpeaking
              ? "Speaking..."
              : isThinking
              ? "Thinking..."
              : state === "requesting_permission"
              ? "Requesting Mic..."
              : state === "error"
              ? "Microphone Unavailable"
              : isListening
              ? "Listening..."
              : isMuted
              ? "Microphone Muted"
              : isCallActive
              ? "Listening..."
              : "Tap microphone or voice button to talk"}
          </span>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* LIVE RESPONSE & TRANSCRIPT PRESENTATION (Large Readable Text)*/}
        {/* ---------------------------------------------------------- */}
        <div className="w-full text-center transition-all duration-300">
          {/* 1. Dora Live Streaming Spoken Response */}
          {activeDoraText ? (
            <div className="space-y-6 animate-fade-in">
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-light sm:font-normal text-white tracking-tight leading-relaxed select-text font-sans max-w-2xl mx-auto">
                {activeDoraText}
              </h1>

              {/* Action Icons underneath finalized Dora response */}
              {!isSpeaking && latestDoraMsg && latestDoraMsg.text && (
                <div className="flex items-center justify-center gap-4 pt-4 text-white/50">
                  <button
                    title="Helpful"
                    className="p-2.5 rounded-full hover:bg-white/[0.08] hover:text-white transition-colors"
                  >
                    <ThumbsUp className="w-5 h-5" />
                  </button>
                  <button
                    title="Not helpful"
                    className="p-2.5 rounded-full hover:bg-white/[0.08] hover:text-white transition-colors"
                  >
                    <ThumbsDown className="w-5 h-5" />
                  </button>
                  <button
                    title="Share response"
                    className="p-2.5 rounded-full hover:bg-white/[0.08] hover:text-white transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleCopyText(latestDoraMsg.text, latestDoraMsg.id)}
                    title={copiedMessageId === latestDoraMsg.id ? "Copied!" : "Copy response"}
                    className="p-2.5 rounded-full hover:bg-white/[0.08] hover:text-white transition-colors"
                  >
                    {copiedMessageId === latestDoraMsg.id ? (
                      <Check className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => setIsOptionsMenuOpen((p) => !p)}
                    title="More actions"
                    className="p-2.5 rounded-full hover:bg-white/[0.08] hover:text-white transition-colors"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ) : isUserSpeakingActive ? (
            /* 2. User Live Speech Transcript (Updating in real-time) */
            <div className="animate-fade-in max-w-2xl mx-auto">
              <p className="text-2xl sm:text-3xl md:text-4xl font-light text-sky-200 tracking-tight leading-relaxed select-text">
                "{latestUserVoiceMsg.text}"
              </p>
            </div>
          ) : isThinking ? (
            /* 3. Dora Thinking State */
            <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
              {latestUserVoiceMsg && (
                <p className="text-lg sm:text-2xl font-light text-white/60 italic leading-relaxed">
                  "{latestUserVoiceMsg.text}"
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div ref={contentEndRef} />
      </main>

      {/* ============================================================ */}
      {/* TEXT INPUT DRAWER (When Keyboard button is clicked)          */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isTextInputOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="relative z-30 w-full max-w-xl mx-auto px-4 mb-3"
          >
            <form
              onSubmit={handleTextSubmit}
              className="flex items-center gap-2 p-2 rounded-full bg-[#18191E] border border-white/10 shadow-2xl backdrop-blur-xl"
            >
              <input
                ref={textInputRef}
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Ask Dora anything (she will speak back)..."
                className="flex-1 bg-transparent px-4 py-2.5 text-base text-white placeholder-white/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="p-3 rounded-full bg-[#1D72FE] hover:bg-[#155FD6] disabled:opacity-30 text-white transition-all shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsTextInputOpen(false)}
                className="p-2.5 rounded-full text-white/50 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* FLOATING LIVE CAMERA PREVIEW (Compact WhatsApp-Style Widget) */}
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
            className="fixed bottom-24 sm:bottom-28 right-4 sm:right-6 md:right-8 z-30 w-[34vw] min-w-[125px] max-w-[155px] sm:w-44 md:w-52 aspect-[3/4] sm:aspect-[4/3] rounded-2xl overflow-hidden bg-[#121316] border border-white/20 hover:border-[#1D72FE]/70 shadow-[0_12px_36px_rgba(0,0,0,0.85),0_0_24px_rgba(29,114,254,0.18)] cursor-pointer group select-none backdrop-blur-md"
            title="Tap to expand camera preview"
          >
            <video
              ref={videoPreviewRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover rounded-2xl pointer-events-none"
            />

            {/* Subtle Gradient Shadow for Controls Legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/40 pointer-events-none" />

            {/* Top Bar on Compact View: Tiny LIVE badge & Flip camera button */}
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
                  title="Switch Front/Rear Camera"
                  className="p-1 rounded-full bg-black/65 hover:bg-black/85 text-white/80 hover:text-white backdrop-blur-md border border-white/10 transition-colors"
                >
                  <SwitchCamera className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Bottom-right Expand Icon Badge on Hover/Touch */}
            <div className="absolute bottom-2 right-2 p-1 rounded-full bg-black/65 backdrop-blur-md text-white/70 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity border border-white/10">
              <Maximize2 className="w-3 h-3" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* EXPANDED CAMERA PREVIEW MODAL (When Tapped to Expand)         */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isCameraActive && isCameraExpanded && (
          <>
            {/* Dimmed Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsCameraExpanded(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            />

            {/* Expanded Center Camera Modal */}
            <motion.div
              key="camera-expanded-modal"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-lg aspect-[4/3] sm:aspect-video rounded-3xl overflow-hidden bg-[#121316] border border-white/20 shadow-[0_24px_60px_rgba(0,0,0,0.95),0_0_30px_rgba(29,114,254,0.2)]"
            >
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Gradient Overlay for Top Controls Legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none" />

              {/* Top Bar on Expanded Camera View */}
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
                      title="Switch Front/Rear Camera"
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
                    title="Minimize to Floating View"
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
      {/* BOTTOM CONTROLS BAR (Compact on Mobile, Spacious on Desktop) */}
      {/* 5 Elements: [Camera] [Screen] [Voice Glow Pill] [Mic] [Keyboard] */}
      {/* ============================================================ */}
      <footer
        id="dora-voice-bottom-controls"
        className="relative z-20 w-full pb-6 sm:pb-12 pt-2 px-3 sm:px-5 flex items-center justify-center"
      >
        <div className="flex items-center justify-center gap-2.5 sm:gap-5 max-w-lg w-full">
          {/* 1. Real Live Camera Button */}
          <button
            id="btn-voice-camera"
            type="button"
            onClick={onToggleCamera}
            title={isCameraActive ? "Turn Off Live Camera" : "Turn On Live Camera"}
            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border transition-all shadow-md shrink-0 ${
              isCameraActive
                ? "bg-[#1D72FE]/25 border-[#1D72FE]/50 text-[#38BDF8] hover:bg-[#1D72FE]/35"
                : "bg-[#18191E] hover:bg-[#23242B] active:bg-[#2C2D35] border-white/[0.08] text-white/80 hover:text-white"
            }`}
          >
            <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* 2. Screen Share / Screen Vision Control Button */}
          <button
            id="btn-voice-screen"
            type="button"
            onClick={onToggleScreenVision}
            title={isScreenVisionActive ? "Stop Screen Vision" : "Share Screen with Dora"}
            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border transition-all shadow-md shrink-0 ${
              isScreenVisionActive
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30"
                : "bg-[#18191E] hover:bg-[#23242B] active:bg-[#2C2D35] border-white/[0.08] text-white/80 hover:text-white"
            }`}
          >
            <Tv className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* 3. MAIN VOICE BUTTON: START/STOP DORA VOICE SESSION */}
          <div className="relative flex items-center justify-center shrink-0">
            <button
              id="btn-voice-center-pill"
              type="button"
              onClick={isSpeaking ? onInterrupt : onToggleCall}
              title={
                isSpeaking
                  ? "Tap to interrupt Dora"
                  : isCallActive
                  ? "Tap to stop voice session"
                  : "Tap to start voice session"
              }
              className="w-28 sm:w-44 h-12 sm:h-16 rounded-full bg-[#141519] hover:bg-[#1A1B22] border border-white/[0.12] relative overflow-hidden flex items-center justify-center transition-all duration-300 shadow-xl group cursor-pointer"
            >
              {/* Vibrant Blue Curved Bottom Glow */}
              <div
                className={`absolute inset-x-0 bottom-0 transition-all duration-300 ${
                  isSpeaking
                    ? "h-full bg-gradient-to-t from-[#1D72FE] via-[#38BDF8]/40 to-transparent opacity-90 animate-pulse"
                    : isThinking
                    ? "h-4/5 bg-gradient-to-t from-purple-500 via-[#1D72FE]/40 to-transparent opacity-80"
                    : isListening
                    ? "h-4/5 bg-gradient-to-t from-[#1D72FE] via-[#1D72FE]/30 to-transparent opacity-85"
                    : isCallActive
                    ? "h-3/5 bg-gradient-to-t from-[#1D72FE]/80 via-[#1D72FE]/30 to-transparent opacity-75"
                    : "h-2/5 bg-gradient-to-t from-[#1D72FE]/40 via-[#1D72FE]/10 to-transparent opacity-50"
                }`}
              />

              {/* Dynamic Sound Waveform Bars inside the capsule */}
              <div className="relative z-10 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3">
                {isSpeaking ? (
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <span
                      className="w-1 sm:w-1.5 bg-white rounded-full transition-all duration-100"
                      style={{ height: Math.max(8, volumeLevel * 30) }}
                    />
                    <span
                      className="w-1 sm:w-1.5 bg-white rounded-full transition-all duration-100"
                      style={{ height: Math.max(16, volumeLevel * 40) }}
                    />
                    <span
                      className="w-1 sm:w-1.5 bg-white rounded-full transition-all duration-100"
                      style={{ height: Math.max(10, volumeLevel * 34) }}
                    />
                  </div>
                ) : isThinking ? (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isCallActive ? (
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <span
                      className="w-1 sm:w-1.5 bg-white/90 rounded-full transition-all duration-75"
                      style={{ height: Math.max(6, volumeLevel * 22) }}
                    />
                    <span
                      className="w-1 sm:w-1.5 bg-white/90 rounded-full transition-all duration-75"
                      style={{ height: Math.max(14, volumeLevel * 30) }}
                    />
                    <span
                      className="w-1 sm:w-1.5 bg-white/90 rounded-full transition-all duration-75"
                      style={{ height: Math.max(6, volumeLevel * 22) }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <span className="w-1 sm:w-1.5 h-2 bg-white/50 rounded-full" />
                    <span className="w-1 sm:w-1.5 h-3.5 bg-white/60 rounded-full" />
                    <span className="w-1 sm:w-1.5 h-2 bg-white/50 rounded-full" />
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* 4. Microphone Mute / Unmute Control Button (Mutes/Unmutes MIC ONLY) */}
          <button
            id="btn-voice-mic"
            type="button"
            onClick={onToggleMute}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border transition-all shadow-md shrink-0 ${
              isMuted
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30"
                : "bg-[#18191E] hover:bg-[#23242B] active:bg-[#2C2D35] border-white/[0.08] text-white/80 hover:text-white"
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          {/* 5. KEYBOARD BUTTON (Replaces old unused X button) */}
          <button
            id="btn-voice-keyboard"
            type="button"
            onClick={() => setIsTextInputOpen((prev) => !prev)}
            title={isTextInputOpen ? "Close Keyboard" : "Open Keyboard to type with Dora"}
            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border transition-all shadow-md shrink-0 ${
              isTextInputOpen
                ? "bg-white/20 border-white/40 text-white"
                : "bg-[#18191E] hover:bg-[#23242B] active:bg-[#2C2D35] border-white/[0.08] text-white/80 hover:text-white"
            }`}
          >
            <Keyboard className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </footer>
    </div>
  );
};
