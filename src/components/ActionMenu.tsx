import React, { useEffect, useRef } from "react";
import { Camera, Image, FileText, Brain, Monitor, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCamera: () => void;
  onSelectPhotos: () => void;
  onSelectFiles: () => void;
  isDeepThinkActive: boolean;
  onToggleDeepThink: () => void;
  isScreenVisionActive?: boolean;
  onToggleScreenVision?: () => void;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  isOpen,
  onClose,
  onSelectCamera,
  onSelectPhotos,
  onSelectFiles,
  isDeepThinkActive,
  onToggleDeepThink,
  isScreenVisionActive = false,
  onToggleScreenVision,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on tap / click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          id="dora-action-menu"
          role="menu"
          aria-label="Actions Menu"
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.96 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="absolute left-0 bottom-full mb-3 w-56 rounded-2xl bg-[#1E1F22] border border-white/[0.1] shadow-[0_16px_40px_rgba(0,0,0,0.7)] p-1.5 z-50 flex flex-col gap-0.5 text-white/90"
        >
          {/* Camera Option */}
          <button
            id="action-item-camera"
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              onSelectCamera();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs sm:text-sm font-medium text-white/80 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors focus:outline-none"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-400/20 flex items-center justify-center text-[#38BDF8] shrink-0">
              <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span>Camera</span>
          </button>

          {/* Photos Option */}
          <button
            id="action-item-photos"
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              onSelectPhotos();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs sm:text-sm font-medium text-white/80 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors focus:outline-none"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Image className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span>Photos</span>
          </button>

          {/* Files Option */}
          <button
            id="action-item-files"
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              onSelectFiles();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs sm:text-sm font-medium text-white/80 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors focus:outline-none"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-400/20 flex items-center justify-center text-indigo-400 shrink-0">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span>Files</span>
          </button>

          {/* Screen Vision Option if handler provided */}
          {onToggleScreenVision && (
            <button
              id="action-item-screen-vision"
              type="button"
              role="menuitem"
              onClick={() => {
                onClose();
                onToggleScreenVision();
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs sm:text-sm font-medium text-white/80 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isScreenVisionActive
                      ? "bg-[#1D72FE]/20 border border-[#38BDF8] text-[#38BDF8]"
                      : "bg-cyan-500/15 border border-cyan-400/20 text-[#38BDF8]"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span>Screen Vision</span>
              </div>
              {isScreenVisionActive && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#1D72FE]/30 text-[#38BDF8] border border-[#1D72FE]/50 uppercase">
                  ON
                </span>
              )}
            </button>
          )}

          {/* Divider */}
          <div className="my-1 border-t border-white/[0.08]" />

          {/* Deep Think Option */}
          <button
            id="action-item-deep-think"
            type="button"
            role="menuitem"
            onClick={() => {
              onToggleDeepThink();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs sm:text-sm font-medium text-white/80 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isDeepThinkActive
                    ? "bg-[#1D72FE]/20 border border-[#38BDF8] text-[#38BDF8]"
                    : "bg-purple-500/15 border border-purple-400/20 text-[#C084FC]"
                }`}
              >
                <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span>Deep Think</span>
            </div>

            {/* Active ON / OFF Badge */}
            <div
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1 ${
                isDeepThinkActive
                  ? "bg-[#1D72FE]/20 border border-[#38BDF8]/60 text-[#38BDF8]"
                  : "bg-white/5 border border-white/10 text-white/40"
              }`}
            >
              {isDeepThinkActive && <Check className="w-2.5 h-2.5 text-[#38BDF8]" />}
              {isDeepThinkActive ? "ON" : "OFF"}
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
