import React, { useEffect, useRef } from "react";
import {
  Camera,
  Image,
  FileText,
  Brain,
  ChevronRight,
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

  // Close on Escape
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
              transition={{ duration: 0.16 }}
              onClick={onClose}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              ref={menuRef}
              id="dora-action-sheet-mobile"
              role="dialog"
              aria-modal="true"
              aria-label="Attachment and Action Options"
              initial={{ y: "100%", opacity: 0.6 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 380 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#05070B] rounded-t-3xl border-t border-white/[0.08] shadow-[0_-16px_48px_rgba(0,0,0,0.95)] pb-8 pt-3 px-4 text-[#E3E3E3] font-sans select-none"
            >
              {/* Drag Handle Indicator */}
              <div className="w-8 h-1 rounded-full bg-white/20 mx-auto mb-3" />

              {/* Clean Standalone Action Rows */}
              <div className="space-y-0.5">
                {/* 1. Camera */}
                <button
                  id="action-mobile-camera"
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectCamera();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
                >
                  <div className="flex items-center gap-3.5">
                    <Camera className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
                    <div>
                      <span className="text-sm font-medium text-white block">Camera</span>
                      <span className="text-xs text-white/45 block">Take a photo</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-white/60 transition-colors" />
                </button>

                {/* 2. Photos */}
                <button
                  id="action-mobile-photos"
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectPhotos();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
                >
                  <div className="flex items-center gap-3.5">
                    <Image className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
                    <div>
                      <span className="text-sm font-medium text-white block">Photos</span>
                      <span className="text-xs text-white/45 block">Choose from gallery</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-white/60 transition-colors" />
                </button>

                {/* 3. Files */}
                <button
                  id="action-mobile-files"
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectFiles();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
                >
                  <div className="flex items-center gap-3.5">
                    <FileText className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
                    <div>
                      <span className="text-sm font-medium text-white block">Files</span>
                      <span className="text-xs text-white/45 block">Upload documents & text</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-white/60 transition-colors" />
                </button>

                {/* Subtle Divider */}
                <div className="my-1 border-t border-white/[0.04]" />

                {/* 4. Deep Thinking Toggle */}
                <button
                  id="action-mobile-deep-think"
                  type="button"
                  onClick={() => {
                    onToggleDeepThink();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl transition-colors text-left ${
                    isDeepThinkActive
                      ? "bg-[#0C1938] text-[#38BDF8]"
                      : "hover:bg-white/[0.04] active:bg-white/[0.08] text-white"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Brain
                      className={`w-5 h-5 ${
                        isDeepThinkActive ? "text-[#38BDF8]" : "text-white/60"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium block">Deep Thinking</span>
                        {isDeepThinkActive && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#1D72FE]/20 text-[#38BDF8] font-mono">
                            ON
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-white/45 block">
                        Advanced multi-step reasoning
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-9 h-5 rounded-full transition-colors relative shrink-0 p-0.5 ${
                      isDeepThinkActive ? "bg-[#1D72FE]" : "bg-white/20"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        isDeepThinkActive ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </div>
                </button>
              </div>
            </motion.div>
          </div>

          {/* ========================================================== */}
          {/* DESKTOP / TABLET POPOVER (>= sm)                           */}
          {/* ========================================================== */}
          <div className="hidden sm:block">
            {/* Click-away overlay */}
            <div className="fixed inset-0 z-40" onClick={onClose} />

            {/* Floating Popover Container */}
            <motion.div
              ref={menuRef}
              id="dora-action-menu-desktop"
              role="dialog"
              aria-modal="false"
              aria-label="Attachment and Action Options"
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="absolute left-0 bottom-full mb-3.5 z-50 w-72 bg-[#05070B] rounded-2xl border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.95)] p-1.5 text-[#E3E3E3] font-sans select-none"
            >
              {/* Standalone Action Rows */}
              <div className="space-y-0.5">
                {/* 1. Camera */}
                <button
                  id="action-desktop-camera"
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectCamera();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <Camera className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                    <div>
                      <span className="text-sm font-medium text-white block">Camera</span>
                      <span className="text-xs text-white/45 block">Take a photo</span>
                    </div>
                  </div>
                </button>

                {/* 2. Photos */}
                <button
                  id="action-desktop-photos"
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectPhotos();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <Image className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                    <div>
                      <span className="text-sm font-medium text-white block">Photos</span>
                      <span className="text-xs text-white/45 block">Choose from gallery</span>
                    </div>
                  </div>
                </button>

                {/* 3. Files */}
                <button
                  id="action-desktop-files"
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectFiles();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                    <div>
                      <span className="text-sm font-medium text-white block">Files</span>
                      <span className="text-xs text-white/45 block">Upload documents & text</span>
                    </div>
                  </div>
                </button>

                {/* Subtle Divider */}
                <div className="my-1 border-t border-white/[0.04]" />

                {/* 4. Deep Thinking Toggle */}
                <button
                  id="action-desktop-deep-think"
                  type="button"
                  onClick={() => {
                    onToggleDeepThink();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors text-left ${
                    isDeepThinkActive
                      ? "bg-[#0C1938] text-[#38BDF8]"
                      : "hover:bg-white/[0.04] active:bg-white/[0.08] text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Brain
                      className={`w-4 h-4 ${
                        isDeepThinkActive ? "text-[#38BDF8]" : "text-white/60"
                      }`}
                    />
                    <div>
                      <span className="text-sm font-medium block">Deep Thinking</span>
                      <span className="text-xs text-white/45 block">
                        Advanced multi-step reasoning
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-8 h-4.5 rounded-full transition-colors relative shrink-0 p-0.5 ${
                      isDeepThinkActive ? "bg-[#1D72FE]" : "bg-white/20"
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        isDeepThinkActive ? "translate-x-3.5" : "translate-x-0"
                      }`}
                    />
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
