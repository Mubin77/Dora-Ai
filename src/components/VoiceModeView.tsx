import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Mic,
  MicOff,
  Tv,
  Camera,
  Share2,
  Copy,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Brain,
  Settings,
  MessageSquare,
  Sparkles,
  Send,
  Radio,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatMessage, ConversationState, DoraEmotion } from "../types";

interface VoiceModeViewProps {
  state: ConversationState;
  emotion: DoraEmotion;
  volumeLevel: number;
  isMuted: boolean;
  callDuration: number;
  currentSpokenText: string;
  messages: ChatMessage[];
  userName: string;
  isScreenVisionActive: boolean;
  screenSharingNotice: string | null;
  onDismissScreenNotice: () => void;
  onToggleScreenVision: () => void;
  onToggleMute: () => void;
  onInterrupt: () => void;
  onEndVoice: () => void;
  onOpenSidebar: () => void;
  onOpenMemory: () => void;
  onOpenSettings: () => void;
  onSwitchToChat: () => void;
  onSendTextMessage: (text: string) => void;
  onSelectCamera: () => void;
  onSelectPhotos: () => void;
}

export const VoiceModeView: React.FC<VoiceModeViewProps> = ({
  state,
  emotion,
  volumeLevel,
  isMuted,
  callDuration,
  currentSpokenText,
  messages,
  userName,
  isScreenVisionActive,
  screenSharingNotice,
  onDismissScreenNotice,
  onToggleScreenVision,
  onToggleMute,
  onInterrupt,
  onEndVoice,
  onOpenSidebar,
  onOpenMemory,
  onOpenSettings,
  onSwitchToChat,
  onSendTextMessage,
  onSelectCamera,
  onSelectPhotos,
}) => {
  const [isTextInputOpen, setIsTextInputOpen] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const contentEndRef = useRef<HTMLDivElement>(null);

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
  const isListening = state === "listening" && !isMuted;
  const isThinking = state === "thinking";

  // Active streaming display text logic
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
      {/* Background Cinematic Deep-Blue Ambient Bottom Glow (70-80% AMOLED Black / 20-30% Visible Ambient Glow) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Deep navy base layer for smooth falloff into AMOLED black */}
        <div className="absolute -bottom-48 left-1/2 -translate-x-1/2 w-[900px] sm:w-[1200px] h-[450px] sm:h-[520px] bg-[#0E358A]/[0.28] rounded-full blur-[160px]" />
        {/* Core lower deep-blue atmospheric bloom */}
        <div className="absolute -bottom-36 left-1/2 -translate-x-1/2 w-[720px] sm:w-[900px] h-[360px] sm:h-[420px] bg-[#1A56DB]/[0.22] rounded-full blur-[120px]" />
      </div>

      {/* ============================================================ */}
      {/* TOP BAR: Clean, Minimal, Spacious                            */}
      {/* ============================================================ */}
      <header
        id="dora-voice-topbar"
        className="relative z-20 w-full px-5 sm:px-8 pt-6 pb-4 flex items-center justify-between"
      >
        {/* Left: Minimal Hamburger Icon */}
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

          {/* Model Title Indicator */}
          <button
            onClick={onSwitchToChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/[0.06] text-white/90 hover:text-white text-base font-medium tracking-tight transition-colors"
          >
            <span>Dora Live</span>
            <span className="text-white/40 text-xs">▾</span>
          </button>
        </div>

        {/* Right: Clean minimal space */}
        <div className="flex items-center gap-2" />
      </header>

      {/* Screen Sharing Error Notice Toast */}
      {screenSharingNotice && (
        <div className="relative z-30 mx-auto px-4 py-2 rounded-full bg-[#1E1F22] border border-white/10 flex items-center gap-2.5 text-sm text-white/90 shadow-2xl backdrop-blur-md animate-fade-in">
          <Sparkles className="w-4 h-4 text-[#38BDF8]" />
          <span>{screenSharingNotice}</span>
          <button
            onClick={onDismissScreenNotice}
            className="ml-1 p-0.5 rounded-full text-white/50 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* CENTER STAGE: Pure Clean Dialogue & Status (NO ORB, NO STAR) */}
      {/* Focused on Large Live Text & Status Indicator                */}
      {/* ============================================================ */}
      <main
        id="dora-voice-center-stage"
        className="relative z-10 flex-1 flex flex-col justify-center px-6 sm:px-12 md:px-20 max-w-3xl mx-auto w-full overflow-y-auto custom-scrollbar my-auto py-8 text-center"
        onClick={() => {
          if (isOptionsMenuOpen) setIsOptionsMenuOpen(false);
        }}
      >
        {/* Prominent Voice State Label: Clearly visible and significantly larger */}
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
              : "Dora Live"}
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
      {/* TEXT INPUT DRAWER (When user types in Voice Mode)            */}
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
      {/* BOTTOM CONTROLS BAR (Compact on Mobile, Spacious on Desktop) */}
      {/* 5 Elements: [Camera] [Share/Screen] [Voice Glow Pill] [Mic] [X] */}
      {/* ============================================================ */}
      <footer
        id="dora-voice-bottom-controls"
        className="relative z-20 w-full pb-6 sm:pb-12 pt-2 px-3 sm:px-5 flex items-center justify-center"
      >
        <div className="flex items-center justify-center gap-2.5 sm:gap-5 max-w-lg w-full">
          {/* 1. Camera Control Button */}
          <button
            id="btn-voice-camera"
            type="button"
            onClick={onSelectCamera}
            title="Camera & Image Input"
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center bg-[#18191E] hover:bg-[#23242B] active:bg-[#2C2D35] border border-white/[0.08] text-white/80 hover:text-white transition-all shadow-md shrink-0"
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
                : "bg-[#18191E] hover:bg-[#23242B] active:bg-[#2C2D35] border border-white/[0.08] text-white/80 hover:text-white"
            }`}
          >
            <Tv className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* 3. CENTER WIDE GLOWING PILL CONTROL */}
          <div className="relative flex items-center justify-center shrink-0">
            <button
              id="btn-voice-center-pill"
              type="button"
              onClick={isSpeaking ? onInterrupt : () => setIsTextInputOpen((prev) => !prev)}
              title={
                isSpeaking
                  ? "Tap to interrupt Dora"
                  : "Tap to type a message or speak naturally"
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
                    : "h-3/5 bg-gradient-to-t from-[#1D72FE]/60 via-[#1D72FE]/20 to-transparent opacity-60"
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
                ) : (
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
                )}
              </div>
            </button>
          </div>

          {/* 4. Microphone Mute / Unmute Control Button */}
          <button
            id="btn-voice-mic"
            type="button"
            onClick={onToggleMute}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border transition-all shadow-md shrink-0 ${
              isMuted
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30"
                : "bg-[#18191E] hover:bg-[#23242B] active:bg-[#2C2D35] border border-white/[0.08] text-white/80 hover:text-white"
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          {/* 5. End / Close Voice Button (Returns cleanly to Chat View) */}
          <button
            id="btn-voice-end"
            type="button"
            onClick={onEndVoice}
            title="Close Voice Mode & Return to Chat"
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center bg-[#18191E] hover:bg-red-500/20 active:bg-red-500/30 border border-white/[0.08] text-white/80 hover:text-red-300 transition-all shadow-md shrink-0"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </footer>

      {/* ============================================================ */}
      {/* SLIDE-OVER CONVERSATION HISTORY DRAWER (Inside Voice Mode)   */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isHistoryDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex justify-end"
            onClick={() => setIsHistoryDrawerOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="w-full max-w-md h-full bg-[#18191E] border-l border-white/10 flex flex-col shadow-2xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#38BDF8]" />
                  <h3 className="text-base font-semibold text-white">Conversation History</h3>
                </div>
                <button
                  onClick={() => setIsHistoryDrawerOpen(false)}
                  className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center text-white/40 text-sm">
                    <span>No messages yet in this conversation.</span>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${
                        m.sender === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-xs text-white/40">
                        <span>{m.sender === "user" ? userName : "Dora"}</span>
                        {m.inputMode === "voice" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/20">
                            Voice
                          </span>
                        )}
                      </div>
                      <div
                        className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm sm:text-base leading-relaxed ${
                          m.sender === "user"
                            ? "bg-[#1D72FE]/25 border border-[#1D72FE]/40 text-white"
                            : "bg-white/[0.05] border border-white/10 text-white/90"
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
