import React from "react";
import { Mic, MicOff, Settings, AlertCircle, Sparkles, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MicrophonePermissionState } from "../services/device/AndroidControlService";

interface MicrophonePermissionModalProps {
  isOpen: boolean;
  permissionState: MicrophonePermissionState;
  onRequestPermission: () => Promise<void>;
  onOpenAppSettings: () => Promise<void>;
  onClose: () => void;
}

export const MicrophonePermissionModal: React.FC<MicrophonePermissionModalProps> = ({
  isOpen,
  permissionState,
  onRequestPermission,
  onOpenAppSettings,
  onClose,
}) => {
  if (!isOpen) return null;

  const isRequesting = permissionState === "MICROPHONE_REQUESTING";
  const isPermanentlyDenied = permissionState === "MICROPHONE_PERMANENTLY_DENIED";
  const isDenied = permissionState === "MICROPHONE_DENIED";

  return (
    <AnimatePresence>
      <div
        id="modal-microphone-permission-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isRequesting) {
            onClose();
          }
        }}
      >
        <motion.div
          id="modal-microphone-permission-card"
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-[#141419] border border-white/[0.12] p-6 shadow-2xl text-white"
        >
          {/* Close button */}
          <button
            id="btn-close-permission-modal"
            type="button"
            onClick={onClose}
            disabled={isRequesting}
            className="absolute top-4 right-4 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30"
            title="Dismiss"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon Header */}
          <div className="flex flex-col items-center text-center mt-2 mb-5">
            <div className="relative mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#1D72FE]/20 blur-xl scale-125" />
              <div
                className={`relative w-16 h-16 rounded-2xl flex items-center justify-center border shadow-inner ${
                  isPermanentlyDenied
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : isDenied
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    : "bg-[#1D72FE]/15 border-[#1D72FE]/40 text-[#38BDF8]"
                }`}
              >
                {isRequesting ? (
                  <Loader2 className="w-8 h-8 animate-spin text-[#38BDF8]" />
                ) : isPermanentlyDenied ? (
                  <Settings className="w-8 h-8 text-amber-400" />
                ) : isDenied ? (
                  <MicOff className="w-8 h-8 text-rose-400" />
                ) : (
                  <Mic className="w-8 h-8 text-[#38BDF8]" />
                )}
              </div>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-white tracking-tight">
              {isPermanentlyDenied
                ? "Microphone Access Blocked"
                : isDenied
                ? "Microphone Permission Required"
                : isRequesting
                ? "Requesting Android Permission..."
                : "Microphone Access Needed"}
            </h3>

            {/* Description */}
            <p className="mt-2 text-sm text-white/70 leading-relaxed max-w-xs">
              {isPermanentlyDenied
                ? "Microphone access was denied with 'Don't ask again'. Please open Android App Settings to allow Microphone access for Dora."
                : isDenied
                ? "Microphone permission is required for Dora Live Session to hear and converse with you in real time."
                : isRequesting
                ? "Please tap 'While using the app' on the Android system permission prompt to continue."
                : "Microphone access is needed for Dora Live Session to hear and speak with you seamlessly."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5 pt-2">
            {isPermanentlyDenied ? (
              <button
                id="btn-open-app-settings"
                type="button"
                onClick={async () => {
                  await onOpenAppSettings();
                }}
                className="w-full h-11 rounded-xl font-medium text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                <span>Open App Settings</span>
              </button>
            ) : (
              <button
                id="btn-allow-microphone"
                type="button"
                onClick={async () => {
                  await onRequestPermission();
                }}
                disabled={isRequesting}
                className="w-full h-11 rounded-xl font-medium text-sm bg-[#1D72FE] hover:bg-[#155FD6] active:bg-[#124eb3] text-white shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRequesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Waiting for Android prompt...</span>
                  </>
                ) : isDenied ? (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Try Again</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Allow Microphone</span>
                  </>
                )}
              </button>
            )}

            <button
              id="btn-cancel-permission"
              type="button"
              onClick={onClose}
              disabled={isRequesting}
              className="w-full h-10 rounded-xl text-sm font-normal text-white/60 hover:text-white hover:bg-white/[0.06] transition-all flex items-center justify-center disabled:opacity-40"
            >
              Not Now
            </button>
          </div>

          {/* Subtext info */}
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-center gap-1.5 text-center text-xs text-white/40">
            <AlertCircle className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <span>Used only during active voice conversations</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
