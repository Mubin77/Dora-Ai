import React from "react";
import { ConversationState } from "../types";
import {
  Mic,
  MicOff,
  Hand,
  Sparkles,
  Keyboard,
} from "lucide-react";
import { motion } from "motion/react";

interface ControlsBarProps {
  state: ConversationState;
  isMuted: boolean;
  isCallActive: boolean;
  callDurationSec: number;
  onToggleCall: () => void;
  onToggleMute: () => void;
  onInterrupt: () => void;
  onOpenSettings?: () => void;
  onOpenMemory: () => void;
  onToggleTextInput: () => void;
  isTextInputOpen: boolean;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  state,
  isMuted,
  isCallActive,
  onToggleMute,
  onInterrupt,
  onOpenMemory,
  onToggleTextInput,
  isTextInputOpen,
}) => {
  return (
    <div
      id="dora-controls-container"
      className="flex flex-col items-center gap-3 w-full max-w-2xl mx-auto px-4"
    >
      {/* Main control action buttons */}
      <div
        id="dora-main-actions"
        className="flex items-center justify-center gap-3 sm:gap-4 p-2.5 rounded-full bg-white/[0.04] border border-white/10 shadow-2xl backdrop-blur-2xl"
      >
        {/* Memory & Context Button */}
        <button
          id="btn-dora-memory"
          onClick={onOpenMemory}
          title="Active Conversational Memory"
          className="p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-orange-300/80 hover:text-orange-200 transition-all focus:outline-none"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {/* Mic Mute / Unmute Button */}
        <button
          id="btn-toggle-mute"
          onClick={onToggleMute}
          title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          className={`p-3 rounded-full transition-all focus:outline-none ${
            isMuted
              ? "bg-orange-500/20 border border-orange-500/50 text-orange-300 hover:bg-orange-500/30"
              : "bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white"
          }`}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Instant Interruption Button */}
        {isCallActive && state === "speaking" && (
          <motion.button
            id="btn-interrupt"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={onInterrupt}
            title="Interrupt Dora (Speak now)"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/40 text-orange-200 text-xs font-medium tracking-wide transition-all focus:outline-none"
          >
            <Hand className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Interrupt</span>
          </motion.button>
        )}

        {/* Text Input Toggle Button */}
        <button
          id="btn-toggle-text-input"
          onClick={onToggleTextInput}
          title="Type to Dora"
          className={`p-3 rounded-full transition-all focus:outline-none ${
            isTextInputOpen
              ? "bg-[#FF6B4A]/30 text-orange-200 border border-[#FF6B4A]/50"
              : "bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white"
          }`}
        >
          <Keyboard className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
