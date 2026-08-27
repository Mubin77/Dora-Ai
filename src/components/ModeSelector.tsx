import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, AudioWaveform, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface ModeSelectorProps {
  currentMode: "chat" | "voice";
  onSelectMode: (mode: "chat" | "voice") => void;
  className?: string;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onSelectMode,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click / touch outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSelect = (mode: "chat" | "voice") => {
    setIsOpen(false);
    if (mode !== currentMode) {
      onSelectMode(mode);
    }
  };

  const modeLabel = currentMode === "chat" ? "Dora Chat" : "Dora Voice";

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Top-Center Mode Selector Trigger Button */}
      <button
        id="btn-mode-selector-trigger"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Current mode: ${modeLabel}. Click to switch modes`}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full hover:bg-white/[0.06] active:bg-white/[0.1] text-white/90 hover:text-white font-medium text-sm sm:text-base tracking-tight transition-all active:scale-[0.98]"
      >
        <span className="font-semibold text-white/95">{modeLabel}</span>
        <ChevronDown
          className={`w-4 h-4 text-white/50 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-white/80" : ""
          }`}
        />
      </button>

      {/* Floating Mode Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Transparent Backdrop for dismissing */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            />

            {/* Dropdown Card (Anchored directly under the selector) */}
            <motion.div
              id="dora-mode-dropdown-card"
              role="dialog"
              aria-modal="true"
              aria-label="Select Mode"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-64 sm:w-72 bg-[#212124] rounded-[26px] border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-2.5 text-[#EDEDED] font-sans"
            >
              <div className="flex flex-col gap-1">
                {/* 1. Dora Voice Option (Always First) */}
                <button
                  id="mode-option-voice"
                  type="button"
                  onClick={() => handleSelect("voice")}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-2xl transition-colors text-left group ${
                    currentMode === "voice"
                      ? "bg-white/[0.08] hover:bg-white/[0.1]"
                      : "hover:bg-white/[0.06] active:bg-white/[0.1]"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-[#2F2F34] group-hover:bg-[#38383E] text-white flex items-center justify-center shrink-0 transition-colors shadow-sm">
                      <AudioWaveform className="w-5 h-5 stroke-[1.75]" />
                    </div>
                    <span className="text-[16px] font-medium text-white/95">
                      Dora Voice
                    </span>
                  </div>
                  {currentMode === "voice" && (
                    <Check className="w-4 h-4 text-[#38BDF8] shrink-0 mr-2" />
                  )}
                </button>

                {/* 2. Dora Chat Option (Always Second) */}
                <button
                  id="mode-option-chat"
                  type="button"
                  onClick={() => handleSelect("chat")}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-2xl transition-colors text-left group ${
                    currentMode === "chat"
                      ? "bg-white/[0.08] hover:bg-white/[0.1]"
                      : "hover:bg-white/[0.06] active:bg-white/[0.1]"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-[#2F2F34] group-hover:bg-[#38383E] text-white flex items-center justify-center shrink-0 transition-colors shadow-sm">
                      <MessageSquare className="w-5 h-5 stroke-[1.75]" />
                    </div>
                    <span className="text-[16px] font-medium text-white/95">
                      Dora Chat
                    </span>
                  </div>
                  {currentMode === "chat" && (
                    <Check className="w-4 h-4 text-[#38BDF8] shrink-0 mr-2" />
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
