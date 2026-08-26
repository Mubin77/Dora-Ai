import React, { useRef, useState, useEffect } from "react";
import { Plus, ArrowUp, AudioLines, Mic, MicOff, Square } from "lucide-react";
import { ActionMenu } from "./ActionMenu";
import { AttachmentPreview } from "./AttachmentPreview";
import { ConversationState, PendingAttachment } from "../types";
import { SpeechRecognizer } from "../utils/speechRecognizer";

interface ComposerProps {
  inputText: string;
  setInputText: (text: string | ((prev: string) => string)) => void;
  isDeepThinkActive: boolean;
  onToggleDeepThink: () => void;
  pendingAttachment: PendingAttachment | null;
  onRemoveAttachment: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isCallActive: boolean;
  onToggleCall: () => void;
  isMuted: boolean;
  state: ConversationState;
  isActionMenuOpen: boolean;
  setIsActionMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onSelectCamera: () => void;
  onSelectPhotos: () => void;
  onSelectFiles: () => void;
  isScreenVisionActive: boolean;
  onToggleScreenVision: () => void;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  photoInputRef: React.RefObject<HTMLInputElement | null>;
  docInputRef: React.RefObject<HTMLInputElement | null>;
  handleImageFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDocFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Composer: React.FC<ComposerProps> = ({
  inputText,
  setInputText,
  isDeepThinkActive,
  onToggleDeepThink,
  pendingAttachment,
  onRemoveAttachment,
  onSubmit,
  isCallActive,
  onToggleCall,
  state,
  isActionMenuOpen,
  setIsActionMenuOpen,
  onSelectCamera,
  onSelectPhotos,
  onSelectFiles,
  isScreenVisionActive,
  onToggleScreenVision,
  cameraInputRef,
  photoInputRef,
  docInputRef,
  handleImageFileSelected,
  handleDocFileSelected,
}) => {
  const textInputRef = useRef<HTMLInputElement>(null);
  const [isDictating, setIsDictating] = useState(false);
  const dictationRecognizerRef = useRef<SpeechRecognizer | null>(null);

  const hasTextOrAttachment = Boolean(inputText.trim() || pendingAttachment);

  // Setup Dictation SpeechRecognizer
  useEffect(() => {
    const recognizer = new SpeechRecognizer({
      continuous: true,
      onSpeechStart: () => {
        setIsDictating(true);
      },
      onInterimResult: (interim) => {
        if (!interim.trim()) return;
        setInputText((prev) => {
          const base = typeof prev === "string" ? prev : "";
          // If input has text, add a space if needed
          return base.endsWith(" ") || !base ? `${base}${interim}` : `${base} ${interim}`;
        });
      },
      onFinalResult: (final) => {
        if (!final.trim()) return;
        setInputText((prev) => {
          const base = typeof prev === "string" ? prev : "";
          return base.endsWith(" ") || !base ? `${base}${final}` : `${base} ${final}`;
        });
      },
      onError: () => {
        setIsDictating(false);
      },
      onStateChange: (listening) => {
        setIsDictating(listening);
      },
    });

    dictationRecognizerRef.current = recognizer;

    return () => {
      recognizer.stop();
    };
  }, [setInputText]);

  const handleToggleDictation = () => {
    if (isDictating) {
      dictationRecognizerRef.current?.stop();
      setIsDictating(false);
    } else {
      dictationRecognizerRef.current?.start();
      setIsDictating(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (hasTextOrAttachment && state !== "thinking") {
        if (isDictating) {
          dictationRecognizerRef.current?.stop();
          setIsDictating(false);
        }
        onSubmit(e);
      }
    }
  };

  return (
    <div className="w-full max-w-2xl lg:max-w-3xl mx-auto px-3 sm:px-4 z-30">
      {/* Hidden File Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageFileSelected}
        className="hidden"
      />
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileSelected}
        className="hidden"
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".txt,.md,.json,.pdf,.doc,.docx,.csv"
        onChange={handleDocFileSelected}
        className="hidden"
      />

      {/* Floating Pill Container Wrapper */}
      <div className="relative flex flex-col">
        {/* Action Menu (Floats above [+] button) */}
        <ActionMenu
          isOpen={isActionMenuOpen}
          onClose={() => setIsActionMenuOpen(false)}
          onSelectCamera={onSelectCamera}
          onSelectPhotos={onSelectPhotos}
          onSelectFiles={onSelectFiles}
          isDeepThinkActive={isDeepThinkActive}
          onToggleDeepThink={onToggleDeepThink}
          isScreenVisionActive={isScreenVisionActive}
          onToggleScreenVision={onToggleScreenVision}
        />

        {/* Floating Rounded Pill Bar (ChatGPT-style AMOLED dark surface) */}
        <div
          id="dora-input-container"
          className="relative w-full bg-[#1A1A1E] border border-white/[0.08] rounded-full px-2 py-1.5 sm:px-3 sm:py-2 flex flex-col shadow-[0_16px_40px_rgba(0,0,0,0.85)] transition-all"
        >
          {/* Staged Attachment Preview Chip inside / above pill input */}
          {pendingAttachment && (
            <div className="px-2 pt-1 pb-1">
              <AttachmentPreview
                attachment={pendingAttachment}
                onRemove={onRemoveAttachment}
              />
            </div>
          )}

          <div className="flex items-center justify-between w-full gap-1 sm:gap-2">
            {/* Left: [+] Action Button */}
            <button
              id="btn-action-menu"
              type="button"
              onClick={() => setIsActionMenuOpen((prev) => !prev)}
              aria-label="Add attachment or action"
              title="Add attachment"
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 focus:outline-none ${
                isActionMenuOpen || isDeepThinkActive
                  ? "bg-[#1D72FE]/20 text-[#38BDF8]"
                  : "text-white/80 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              <Plus
                className={`w-5 h-5 transition-transform duration-150 ${
                  isActionMenuOpen ? "rotate-45" : ""
                }`}
              />
            </button>

            {/* Middle: Text Input Field */}
            <div className="flex-1 px-1 sm:px-2 min-w-0">
              <input
                ref={textInputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isDictating
                    ? "Listening... speak now"
                    : pendingAttachment
                    ? "Ask about this file..."
                    : isDeepThinkActive
                    ? "Deep Think mode: ask a question..."
                    : "Message Dora..."
                }
                disabled={state === "thinking"}
                className={`w-full bg-transparent text-[15px] sm:text-base text-white placeholder-white/40 focus:outline-none font-normal ${
                  isDictating ? "placeholder-sky-400 animate-pulse" : ""
                }`}
              />
            </div>

            {/* Right Action Cluster: [Mic] [Immersive Voice] or [Send] */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Dictation Microphone Button */}
              <button
                id="btn-dictation-mic"
                type="button"
                onClick={handleToggleDictation}
                title={isDictating ? "Stop listening" : "Speech-to-text dictation"}
                aria-label={isDictating ? "Stop listening" : "Speech-to-text dictation"}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-95 ${
                  isDictating
                    ? "bg-rose-500/20 border border-rose-500/40 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)] animate-pulse"
                    : "text-white/80 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                {isDictating ? (
                  <MicOff className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                ) : (
                  <Mic className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                )}
              </button>

              {/* If user has entered text or attachment -> show Send button */}
              {hasTextOrAttachment ? (
                <button
                  id="btn-send-message"
                  type="submit"
                  onClick={(e) => {
                    if (isDictating) {
                      dictationRecognizerRef.current?.stop();
                      setIsDictating(false);
                    }
                    onSubmit(e);
                  }}
                  disabled={state === "thinking"}
                  title="Send message"
                  aria-label="Send message"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-95 bg-[#1D72FE] hover:bg-[#155FD6] text-white shadow-[0_0_12px_rgba(29,114,254,0.4)] disabled:opacity-50"
                >
                  <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                </button>
              ) : (
                /* Immersive Voice Button (Waveform icon - neutral white when inactive, electric-blue when active) */
                <button
                  id="btn-voice-mode"
                  type="button"
                  onClick={onToggleCall}
                  title={isCallActive ? "End Immersive Voice" : "Start Immersive Voice"}
                  aria-label={isCallActive ? "End Immersive Voice" : "Start Immersive Voice"}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-95 ${
                    isCallActive
                      ? "bg-[#1D72FE]/25 border border-[#1D72FE]/60 text-[#38BDF8] shadow-[0_0_12px_rgba(29,114,254,0.4)]"
                      : "text-white/80 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  <AudioLines
                    className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-colors ${
                      isCallActive
                        ? "text-[#38BDF8] animate-pulse"
                        : "text-white/80 hover:text-white"
                    }`}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
