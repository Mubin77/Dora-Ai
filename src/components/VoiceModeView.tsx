import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Tv,
  Camera,
  Plus,
  Send,
  ArrowUp,
  X,
  Sparkles,
  SwitchCamera,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatMessage, ConversationState, DoraEmotion } from "../types";
import { VoiceOrb } from "./VoiceOrb";
import { ActionMenu } from "./ActionMenu";
import { ModeSelector } from "./ModeSelector";

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
  isDeepThinkActive?: boolean;
  onToggleDeepThink?: () => void;
  onSelectCamera?: () => void;
  onSelectPhotos?: () => void;
  onSelectFiles?: () => void;
  onOpenPlugins?: () => void;
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
  callDuration: _callDuration,
  currentSpokenText,
  messages,
  userName: _userName,
  isScreenVisionActive,
  screenSharingNotice,
  isCameraActive,
  cameraStream,
  isDeepThinkActive,
  onToggleDeepThink,
  onSelectCamera,
  onSelectPhotos,
  onSelectFiles,
  onOpenPlugins,
  onToggleCamera,
  onSwitchCameraFacing,
  onDismissScreenNotice,
  onToggleScreenVision,
  onToggleMute,
  onToggleCall,
  onInterrupt: _onInterrupt,
  onOpenSidebar,
  onOpenMemory: _onOpenMemory,
  onOpenSettings: _onOpenSettings,
  onSwitchToChat,
  onSendTextMessage,
}) => {
  const [isCameraExpanded, setIsCameraExpanded] = useState(false);
  const [isTextInputOpen, setIsTextInputOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [textInputVal, setTextInputVal] = useState("");
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Reset expanded state if camera is stopped
  useEffect(() => {
    if (!isCameraActive) {
      setIsCameraExpanded(false);
    }
  }, [isCameraActive]);

  // Focus input when opened
  useEffect(() => {
    if (isTextInputOpen && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [isTextInputOpen]);

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

  // Dora Orb tap handler: toggles immersive voice on or off
  const handleOrbClick = () => {
    onToggleCall();
  };

  const handleSendPrompt = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (textInputVal.trim()) {
      onSendTextMessage(textInputVal.trim());
      setTextInputVal("");
      setIsTextInputOpen(false);
      textInputRef.current?.blur();
    }
  };

  return (
    <div
      id="dora-voice-mode-root"
      className="fixed inset-0 z-30 flex flex-col justify-between bg-black text-[#E3E3E3] font-sans select-none overflow-hidden h-[100dvh] w-full"
    >
      {/* ============================================================ */}
      {/* 1. TOP BAR: [Hamburger (Left)]                [Camera (Right)]*/}
      {/* ============================================================ */}
      <header
        id="dora-voice-topbar"
        className="relative z-20 w-full px-5 sm:px-8 md:px-12 lg:px-16 pt-[max(1.25rem,env(safe-area-inset-top,0px))] sm:pt-6 md:pt-8 pb-2 flex items-center justify-between shrink-0 max-w-7xl mx-auto"
      >
        {/* Top-Left: Circular Menu / Hamburger Button */}
        <button
          id="btn-voice-menu"
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open Navigation Menu"
          title="Open Menu"
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#18181b] hover:bg-[#222226] active:bg-[#2c2c32] border border-white/[0.08] text-white/90 hover:text-white active:scale-95 transition-all flex items-center justify-center shrink-0 shadow-sm"
        >
          <div className="flex flex-col gap-1 w-4 sm:w-4.5 items-start">
            <span className="w-full h-0.5 bg-white/90 rounded-full" />
            <span className="w-3.5 h-0.5 bg-white/90 rounded-full" />
          </div>
        </button>

        {/* Center: Mode Selector & Status Indicators */}
        <div className="flex items-center gap-2">
          <ModeSelector
            currentMode="voice"
            onSelectMode={(mode) => {
              if (mode === "chat") {
                onSwitchToChat();
              }
            }}
          />
          {isScreenVisionActive && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium backdrop-blur-md animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Screen Sharing</span>
            </div>
          )}
        </div>

        {/* Top-Right: Circular Camera Control Button */}
        <button
          id="btn-voice-top-camera"
          type="button"
          onClick={onToggleCamera}
          aria-label={isCameraActive ? "Turn off camera" : "Turn on camera"}
          title={isCameraActive ? "Turn off camera" : "Turn on camera"}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-white/[0.08] bg-[#18181b] hover:bg-[#222226] active:bg-[#2c2c32] text-white/90 hover:text-white transition-all flex items-center justify-center shrink-0 active:scale-95 shadow-sm"
        >
          <Camera className="w-5 h-5" />
        </button>
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
      {/* 2. CENTER STAGE: Centered Dora Celestial Orb & Minimal Text   */}
      {/* ============================================================ */}
      <main
        id="dora-voice-center-stage"
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 max-w-4xl mx-auto w-full my-auto py-2"
      >
        {/* Centered Celestial Dora Orb (Voice ON/OFF Primary Control) */}
        <div className="relative flex flex-col items-center justify-center">
          <VoiceOrb
            state={state}
            volumeLevel={volumeLevel}
            emotion={emotion}
            isMuted={isMuted}
            isCallActive={isCallActive}
            onClick={handleOrbClick}
          />
        </div>

        {/* Minimal Subtitle / Status Dialogue (Clean negative space) */}
        <div className="w-full text-center mt-6 sm:mt-8 min-h-[48px] sm:min-h-[56px] flex items-center justify-center px-4">
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
            <p className="text-sm text-white/50 font-light">Microphone muted</p>
          ) : !isCallActive ? (
            <p className="text-sm text-white/35 font-light">Tap orb to talk</p>
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
            className="fixed bottom-28 sm:bottom-32 md:bottom-36 right-4 sm:right-6 md:right-10 z-30 w-[clamp(120px,22vw,200px)] aspect-[3/4] sm:aspect-[4/3] rounded-2xl overflow-hidden bg-[#121316] border border-white/20 hover:border-[#1D72FE]/70 shadow-[0_12px_36px_rgba(0,0,0,0.85)] cursor-pointer group select-none backdrop-blur-md"
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
      {/* 3. BOTTOM CONTROLS BAR: Minimal ChatGPT-style Composition    */}
      {/* LAYOUT: [ + Ask Dora text input pill ] [Mic] [Camera/Screen]  */}
      {/* ============================================================ */}
      <footer
        id="dora-voice-bottom-controls"
        className="relative z-20 w-full pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-8 md:pb-10 pt-2 px-4 sm:px-8 max-w-md sm:max-w-xl md:max-w-2xl mx-auto flex items-center justify-center gap-2.5 sm:gap-3.5 shrink-0"
      >
        {/* Unified "Ask Dora" Text Composer Pill (In-place typing, with ActionMenu anchored above) */}
        <div className="relative flex-1 min-w-0">
          {/* Action Menu (opens above + button) */}
          <ActionMenu
            isOpen={isActionMenuOpen}
            onClose={() => setIsActionMenuOpen(false)}
            onSelectCamera={() => onSelectCamera?.()}
            onSelectPhotos={() => onSelectPhotos?.()}
            onSelectFiles={() => onSelectFiles?.()}
            isDeepThinkActive={isDeepThinkActive}
            onToggleDeepThink={onToggleDeepThink}
            onOpenPlugins={onOpenPlugins}
          />

          <form
            id="form-voice-ask-dora"
            onSubmit={handleSendPrompt}
            className="w-full h-12 sm:h-14 px-3.5 sm:px-4 rounded-full bg-[#18181b] hover:bg-[#202024] focus-within:bg-[#202024] border border-white/[0.08] focus-within:border-white/[0.18] transition-all flex items-center gap-2.5 shadow-sm"
          >
            {/* Left [+] Button / Icon (Opens Action Sheet) */}
            <button
              id="btn-voice-plus"
              type="button"
              onClick={() => setIsActionMenuOpen((prev) => !prev)}
              title="Add attachment or action"
              aria-label="Add attachment or action"
              className="flex items-center justify-center text-white/70 hover:text-white shrink-0 transition-colors p-1"
            >
              <Plus
                className={`w-4 h-4 text-white/70 hover:text-white shrink-0 transition-transform duration-150 ${
                  isActionMenuOpen ? "rotate-45" : ""
                }`}
              />
            </button>

            {/* Integrated Text Input */}
            <input
              ref={textInputRef}
              type="text"
              value={textInputVal}
              onChange={(e) => setTextInputVal(e.target.value)}
              onFocus={() => setIsTextInputOpen(true)}
              onBlur={() => {
                if (!textInputVal.trim()) {
                  setIsTextInputOpen(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSendPrompt();
                }
                if (e.key === "Escape") {
                  setTextInputVal("");
                  setIsTextInputOpen(false);
                  textInputRef.current?.blur();
                }
              }}
              placeholder="Ask Dora something..."
              className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-white/40 focus:outline-none min-w-0"
            />

            {/* Send Action when text is entered */}
            {textInputVal.trim() && (
              <button
                id="btn-voice-send-text"
                type="submit"
                onClick={handleSendPrompt}
                title="Send to Dora"
                aria-label="Send to Dora"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white text-black hover:bg-white/90 active:scale-95 flex items-center justify-center transition-all shrink-0 shadow-sm"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </form>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* 2. Microphone Mute / Unmute Control Button */}
          <button
            id="btn-voice-mic"
            type="button"
            onClick={onToggleMute}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            aria-label={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border border-white/[0.08] bg-[#18181b] hover:bg-[#222226] active:bg-[#2c2c32] text-white/90 hover:text-white transition-all duration-200 shrink-0 active:scale-95 shadow-sm"
          >
            {isMuted ? (
              <MicOff className="w-5 h-5 sm:w-6 sm:h-6 text-white/70" />
            ) : (
              <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-white/90" />
            )}
          </button>

          {/* 3. Screen Share Control Button (Replacing X close button) */}
          <button
            id="btn-voice-screen-share"
            type="button"
            onClick={onToggleScreenVision}
            title={isScreenVisionActive ? "Stop Screen Sharing" : "Share Screen"}
            aria-label={isScreenVisionActive ? "Stop Screen Sharing" : "Share Screen"}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border transition-all duration-200 shrink-0 active:scale-95 shadow-sm ${
              isScreenVisionActive
                ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/25"
                : "bg-[#18181b] hover:bg-[#222226] active:bg-[#2c2c32] border-white/[0.08] text-white/90 hover:text-white"
            }`}
          >
            <Tv className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </footer>
    </div>
  );
};
