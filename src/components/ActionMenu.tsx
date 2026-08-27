import React, { useEffect, useRef } from "react";
import { Camera, Image as ImageIcon, Paperclip, AtSign, Brain, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCamera: () => void;
  onSelectPhotos: () => void;
  onSelectFiles: () => void;
  isDeepThinkActive?: boolean;
  onToggleDeepThink?: () => void;
  onOpenPlugins?: () => void;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  isOpen,
  onClose,
  onSelectCamera,
  onSelectPhotos,
  onSelectFiles,
  isDeepThinkActive,
  onToggleDeepThink,
  onOpenPlugins,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click / touch outside
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

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Transparent Backdrop for dismissing */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          />

          {/* Floating Action Menu Container (Positioned above the [+] button) */}
          <motion.div
            ref={menuRef}
            id="dora-attachment-action-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Attachment Options"
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 bottom-full mb-3 z-50 w-64 sm:w-72 bg-[#212124] rounded-[28px] border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-3 text-[#EDEDED] font-sans select-none"
          >
            <div className="flex flex-col gap-1">
              {/* 1. Camera */}
              <button
                id="action-item-camera"
                type="button"
                onClick={() => {
                  onClose();
                  onSelectCamera();
                }}
                className="w-full flex items-center gap-3.5 px-2.5 py-2 rounded-2xl hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors text-left group"
              >
                <div className="w-11 h-11 rounded-full bg-[#2F2F34] group-hover:bg-[#38383E] text-white flex items-center justify-center shrink-0 transition-colors shadow-sm">
                  <Camera className="w-5 h-5 stroke-[1.75]" />
                </div>
                <span className="text-[16px] font-medium text-white/95">Camera</span>
              </button>

              {/* 2. Photos */}
              <button
                id="action-item-photos"
                type="button"
                onClick={() => {
                  onClose();
                  onSelectPhotos();
                }}
                className="w-full flex items-center gap-3.5 px-2.5 py-2 rounded-2xl hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors text-left group"
              >
                <div className="w-11 h-11 rounded-full bg-[#2F2F34] group-hover:bg-[#38383E] text-white flex items-center justify-center shrink-0 transition-colors shadow-sm">
                  <ImageIcon className="w-5 h-5 stroke-[1.75]" />
                </div>
                <span className="text-[16px] font-medium text-white/95">Photos</span>
              </button>

              {/* 3. Files */}
              <button
                id="action-item-files"
                type="button"
                onClick={() => {
                  onClose();
                  onSelectFiles();
                }}
                className="w-full flex items-center gap-3.5 px-2.5 py-2 rounded-2xl hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors text-left group"
              >
                <div className="w-11 h-11 rounded-full bg-[#2F2F34] group-hover:bg-[#38383E] text-white flex items-center justify-center shrink-0 transition-colors shadow-sm">
                  <Paperclip className="w-5 h-5 stroke-[1.75]" />
                </div>
                <span className="text-[16px] font-medium text-white/95">Files</span>
              </button>

              {/* 4. Plugins */}
              <button
                id="action-item-plugins"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPlugins?.();
                }}
                className="w-full flex items-center gap-3.5 px-2.5 py-2 rounded-2xl hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors text-left group"
              >
                <div className="w-11 h-11 rounded-full bg-[#2F2F34] group-hover:bg-[#38383E] text-white flex items-center justify-center shrink-0 transition-colors shadow-sm">
                  <AtSign className="w-5 h-5 stroke-[1.75]" />
                </div>
                <span className="text-[16px] font-medium text-white/95">Plugins</span>
              </button>

              {/* 5. Think harder / Deep Think */}
              <button
                id="action-item-think-harder"
                type="button"
                onClick={() => {
                  onClose();
                  onToggleDeepThink?.();
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-2xl hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors shadow-sm ${
                      isDeepThinkActive
                        ? "bg-[#1D72FE] text-white"
                        : "bg-[#2F2F34] group-hover:bg-[#38383E] text-white"
                    }`}
                  >
                    <Brain className="w-5 h-5 stroke-[1.75]" />
                  </div>
                  <span className="text-[16px] font-medium text-white/95">Think harder</span>
                </div>
                {isDeepThinkActive && (
                  <Check className="w-4 h-4 text-[#38BDF8] shrink-0 mr-2" />
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
