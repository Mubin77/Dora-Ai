import React, { useRef, useEffect } from "react";
import { ChatMessage, DoraEmotion } from "../types";
import { Volume2, Sparkles, User, Ban } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LiveTranscriptProps {
  messages: ChatMessage[];
  currentSpokenText?: string;
  isSpeaking: boolean;
  onReplayAudio?: (text: string) => void;
  onClearHistory?: () => void;
}

const EMOTION_BADGE_STYLE: Record<DoraEmotion, string> = {
  warm: "bg-orange-500/15 text-orange-200 border-orange-500/30",
  playful: "bg-pink-500/15 text-pink-200 border-pink-500/30",
  empathetic: "bg-teal-500/15 text-teal-200 border-teal-500/30",
  curious: "bg-purple-500/15 text-purple-200 border-purple-500/30",
  calm: "bg-sky-500/15 text-sky-200 border-sky-500/30",
  witty: "bg-amber-500/15 text-amber-200 border-amber-500/30",
  attentive: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30",
  surprised: "bg-yellow-500/15 text-yellow-200 border-yellow-500/30",
};

export const LiveTranscript: React.FC<LiveTranscriptProps> = ({
  messages,
  currentSpokenText,
  isSpeaking,
  onReplayAudio,
  onClearHistory,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentSpokenText]);

  return (
    <div
      id="dora-transcript-panel"
      className="flex flex-col h-full bg-white/[0.03] backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
          <h2 className="text-xs font-semibold text-white/80 tracking-[0.12em] uppercase">
            Live Dialogue
          </h2>
          {messages.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50 font-mono">
              {messages.length}
            </span>
          )}
        </div>

        {messages.length > 0 && (
          <button
            id="clear-transcript-btn"
            onClick={onClearHistory}
            className="text-[10px] text-white/40 hover:text-white transition-colors px-2 py-0.5 rounded-full bg-white/5 border border-white/5 hover:border-white/15"
          >
            Clear
          </button>
        )}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 font-sans custom-scrollbar">
        {messages.length === 0 && !currentSpokenText && (
          <div className="flex items-center justify-center h-full text-center py-6 px-4 text-white/40 gap-2">
            <Sparkles className="w-3.5 h-3.5 text-orange-400/70 shrink-0" />
            <p className="text-xs text-white/50 font-light">
              Spoken conversation will appear here in real time.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              {/* Sender label and metadata */}
              <div className="flex items-center gap-1.5 mb-0.5 px-1 text-[10px] text-white/40">
                {msg.sender === "user" ? (
                  <>
                    <span className="tracking-wider uppercase text-[9px]">You</span>
                    <User className="w-2.5 h-2.5 text-white/40" />
                  </>
                ) : (
                  <>
                    <span className="font-medium text-orange-200 tracking-wider uppercase text-[9px]">Dora</span>
                    {msg.emotion && (
                      <span
                        className={`text-[8px] px-1.5 py-0.2 rounded-full border capitalize tracking-wider ${
                          EMOTION_BADGE_STYLE[msg.emotion] || EMOTION_BADGE_STYLE.warm
                        }`}
                      >
                        {msg.emotion}
                      </span>
                    )}
                  </>
                )}
                <span className="text-[8px] text-white/30 font-mono ml-0.5">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Message Bubble */}
              <div
                className={`group relative max-w-[88%] sm:max-w-[85%] px-3.5 py-2 rounded-xl text-xs leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-[#FF6B4A]/25 border border-[#FF6B4A]/40 text-white rounded-tr-xs backdrop-blur-md shadow-md"
                    : "bg-white/[0.05] border border-white/10 text-white/90 rounded-tl-xs backdrop-blur-md font-light"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Interruption indicator */}
                {msg.isInterrupted && (
                  <div className="mt-1 flex items-center gap-1 text-[9px] text-amber-300/80 font-medium tracking-wide">
                    <Ban className="w-2.5 h-2.5" />
                    <span>Response interrupted</span>
                  </div>
                )}

                {/* Audio replay button for Dora messages */}
                {msg.sender === "dora" && onReplayAudio && (
                  <button
                    onClick={() => onReplayAudio(msg.text)}
                    title="Replay Spoken Audio"
                    className="absolute -right-7 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white/60 hover:text-white"
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Live Spoken Text streaming chunk */}
        {currentSpokenText && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-start"
          >
            <div className="flex items-center gap-1 mb-0.5 px-1 text-[10px] text-orange-200">
              <span className="font-semibold uppercase tracking-wider text-[9px]">Dora</span>
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
              </span>
            </div>
            <div className="max-w-[88%] px-3.5 py-2 rounded-xl rounded-tl-xs bg-white/[0.06] border border-orange-500/30 text-white text-xs leading-relaxed shadow-lg backdrop-blur-md font-light">
              <p className="whitespace-pre-wrap">{currentSpokenText}</p>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
