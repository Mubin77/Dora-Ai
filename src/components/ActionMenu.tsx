import React, { useEffect, useRef } from "react";
import {
  Camera,
  Image,
  FileText,
  Brain,
  Monitor,
  ChevronRight,
  Sparkles,
} from "lucide-react";
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

  // Close on tap / click outside for desktop floating popup
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
          {/* ========================================================== */}
          {/* MOBILE BOTTOM SHEET (< sm)                                 */}
          {/* ========================================================== */}
          <div className="sm:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              ref={menuRef}
              id="dora-action-sheet-mobile"
              role="dialog"
              aria-modal="true"
              aria-label="Attachment and Action Options"
              initial={{ y: "100%", opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#18191C] rounded-t-[28px] border-t border-white/10 shadow-[0_-12px_40px_rgba(0,0,0,0.8)] pb-8 pt-3 px-4 text-white"
            >
              {/* Drag Handle Indicator */}
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3" />

              {/* Action Rows */}
              <div className="space-y-1">
                {/* 1. Camera */}
                <button
                  id="action-mobile-camera"
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectCamera();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.06] active:bg-white/[0.1] transition-all text-left group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-white/[0.06] group-hover:bg-[#1D72FE]/15 text-white/80 group-hover:text-[#38BDF8] flex items-center justify-center transition-colors shrink-0">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-white block">Camera</span>
                      <span className="text-xs text-white/50 block">Take a photo</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                </button>

                {/* 2. Photos */}
                <button
                  id="action-mobile-photos"
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectPhotos();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.06] active:bg-white/[0.1] transition-all text-left group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-white/[0.06] group-hover:bg-[#1D72FE]/15 text-white/80 group-hover:text-[#38BDF8] flex items-center justify-center transition-colors shrink-0">
                      <Image className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-white block">Photos</span>
                      <span className="text-xs text-white/50 block">Choose from gallery</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                </button>

                {/* 3. Files */}
                <button
                  id="action-mobile-files"
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectFiles();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.06] active:bg-white/[0.1] transition-all text-left group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-white/[0.06] group-hover:bg-[#1D72FE]/15 text-white/80 group-hover:text-[#38BDF8] flex items-center justify-center transition-colors shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-white block">Files</span>
                      <span className="text-xs text-white/50 block">Upload a document</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                </button>

                {/* 4. Screen Vision */}
                {onToggleScreenVision && (
                  <button
                    id="action-mobile-screen-vision"
                    type="button"
                    onClick={() => {
                      onClose();
                      onToggleScreenVision();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.06] active:bg-white/[0.1] transition-all text-left group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                          isScreenVisionActive
                            ? "bg-[#1D72FE]/20 text-[#38BDF8]"
                            : "bg-white/[0.06] text-white/80 group-hover:bg-[#1D72FE]/15 group-hover:text-[#38BDF8]"
                        }`}
                      >
                        <Monitor className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-white block">Screen Vision</span>
                        <span className="text-xs text-white/50 block">Share your screen</span>
                      </div>
                    </div>
                    {isScreenVisionActive ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#1D72FE]/20 text-[#38BDF8] border border-[#1D72FE]/40 uppercase font-mono">
                        Active
                      </span>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                    )}
                  </button>
                )}

                {/* Divider */}
                <div className="py-1">
                  <div className="border-t border-white/[0.08]" />
                </div>

                {/* 5. Deep Think Toggle */}
                <div
                  id="action-mobile-deep-think"
                  onClick={onToggleDeepThink}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.06] active:bg-white/[0.1] transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                        isDeepThinkActive
                          ? "bg-[#1D72FE]/20 text-[#38BDF8]"
                          : "bg-white/[0.06] text-white/80 group-hover:bg-[#1D72FE]/15 group-hover:text-[#38BDF8]"
                      }`}
                    >
                      <Brain className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-white block">Deep Think</span>
                      <span className="text-xs text-white/50 block">Extended reasoning mode</span>
                    </div>
                  </div>

                  {/* Minimal Toggle Switch */}
                  <div
                    className={`w-10 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
                      isDeepThinkActive ? "bg-[#1D72FE]" : "bg-white/20"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
                        isDeepThinkActive ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ========================================================== */}
          {/* DESKTOP COMPACT FLOATING MENU (>= sm)                      */}
          {/* ========================================================== */}
          <motion.div
            ref={menuRef}
            id="dora-action-menu-desktop"
            role="menu"
            aria-label="Actions Menu"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="hidden sm:flex absolute left-0 bottom-full mb-3 w-64 rounded-2xl bg-[#1E1F22] border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.7)] p-1.5 z-50 flex-col gap-0.5 text-white/90 backdrop-blur-xl"
          >
            {/* Camera */}
            <button
              id="action-item-camera"
              type="button"
              role="menuitem"
              onClick={() => {
                onClose();
                onSelectCamera();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-medium text-white/80 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors focus:outline-none group"
            >
              <div className="w-7 h-7 rounded-full bg-white/[0.06] group-hover:bg-[#1D72FE]/15 text-white/70 group-hover:text-[#38BDF8] flex items-center justify-center shrink-0 transition-colors">
                <Camera className="w-3.5 h-3.5" />
              </div>
              <span>Camera</span>
            </button>

            {/* Photos */}
            <button
              id="action-item-photos"
              type="button"
              role="menuitem"
              onClick={() => {
                onClose();
                onSelectPhotos();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-medium text-white/80 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors focus:outline-none group"
            >
              <div className="w-7 h-7 rounded-full bg-white/[0.06] group-hover:bg-[#1D72FE]/15 text-white/70 group-hover:text-[#38BDF8] flex items-center justify-center shrink-0 transition-colors">
                <Image className="w-3.5 h-3.5" />
              </div>
              <span>Photos</span>
            </button>

            {/* Files */}
            <button
              id="action-item-files"
              type="button"
              role="menuitem"
              onClick={() => {
                onClose();
                onSelectFiles();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-medium text-white/80 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors focus:outline-none group"
            >
              <div className="w-7 h-7 rounded-full bg-white/[0.06] group-hover:bg-[#1D72FE]/15 text-white/70 group-hover:text-[#38BDF8] flex items-center justify-center shrink-0 transition-colors">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <span>Files</span>
            </button>

            {/* Screen Vision */}
            {onToggleScreenVision && (
              <button
                id="action-item-screen-vision"
                type="button"
                role="menuitem"
                onClick={() => {
                  onClose();
                  onToggleScreenVision();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-medium text-white/80 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors focus:outline-none group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isScreenVisionActive
                        ? "bg-[#1D72FE]/20 text-[#38BDF8]"
                        : "bg-white/[0.06] text-white/70 group-hover:bg-[#1D72FE]/15 group-hover:text-[#38BDF8]"
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </div>
                  <span>Screen Vision</span>
                </div>
                {isScreenVisionActive && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#1D72FE]/20 text-[#38BDF8] border border-[#1D72FE]/40 uppercase font-mono">
                    ON
                  </span>
                )}
              </button>
            )}

            {/* Subtle Divider */}
            <div className="my-1 border-t border-white/[0.08]" />

            {/* Deep Think with Modern Minimal Toggle */}
            <div
              id="action-item-deep-think"
              role="menuitem"
              onClick={onToggleDeepThink}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-medium text-white/80 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors focus:outline-none cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isDeepThinkActive
                      ? "bg-[#1D72FE]/20 text-[#38BDF8]"
                      : "bg-white/[0.06] text-white/70 group-hover:bg-[#1D72FE]/15 group-hover:text-[#38BDF8]"
                  }`}
                >
                  <Brain className="w-3.5 h-3.5" />
                </div>
                <span>Deep Think</span>
              </div>

              {/* Minimal Pill Toggle */}
              <div
                className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
                  isDeepThinkActive ? "bg-[#1D72FE]" : "bg-white/20"
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white transition-transform shadow-xs ${
                    isDeepThinkActive ? "translate-x-3.5" : "translate-x-0"
                  }`}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
