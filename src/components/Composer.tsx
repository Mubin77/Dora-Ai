import React, { useRef, useState, useEffect } from "react";
import { Plus, ArrowUp, AudioLines, Mic, MicOff } from "lucide-react";
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
  cameraInputRef,
  photoInputRef,
  docInputRef,
  handleImageFileSelected,
  handleDocFileSelected,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDictating, setIsDictating] = useState(false);
  const dictationRecognizerRef = useRef<SpeechRecognizer | null>(null);

  const hasTextOrAttachment = Boolean(inputText.trim() || pendingAttachment);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 160; // Max 5-6 lines
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [inputText]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
      {/* Hidden Native File Inputs */}
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

      {/* Attachment Preview (Rendered cleanly above the input bar) */}
      {pendingAttachment && (
        <div className="mb-2">
          <AttachmentPreview
            attachment={pendingAttachment}
            onRemove={onRemoveAttachment}
          />
        </div>
      )}

      {/* Composer Row: [ [ + ] [ Input Area ] [ Mic / Send ] ] + [ Immersive Voice ] */}
      <div className="relative flex items-end gap-2.5 sm:gap-3">
        {/* Action Menu (Floats above [+] button) */}
        <ActionMenu
          isOpen={isActionMenuOpen}
          onClose={() => setIsActionMenuOpen(false)}
          onSelectCamera={onSelectCamera}
          onSelectPhotos={onSelectPhotos}
          onSelectFiles={onSelectFiles}
          isDeepThinkActive={isDeepThinkActive}
          onToggleDeepThink={onToggleDeepThink}
        />

        {/* Unified Main Composer Pill Container */}
        <div
          id="dora-input-container"
          className="relative flex-1 bg-[#212124] border border-white/[0.08] rounded-full px-3 py-1.5 sm:py-2 flex items-center gap-2 shadow-lg transition-all focus-within:border-white/[0.16]"
        >
          {/* 1. Left: [+] Attachment Action Button */}
          <button
            id="btn-action-menu"
            type="button"
            onClick={() => setIsActionMenuOpen((prev) => !prev)}
            aria-label="Add attachment or action"
            title="Add attachment"
            className={`p-2 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 focus:outline-none ${
              isActionMenuOpen
                ? "text-white bg-white/[0.12]"
                : "text-white/80 hover:text-white hover:bg-white/[0.06]"
            }`}
          >
            <Plus
              className={`w-5 h-5 transition-transform duration-150 stroke-[2] ${
                isActionMenuOpen ? "rotate-45" : ""
              }`}
            />
          </button>

          {/* 2. Middle: Text Area / Input */}
          <div className="flex-1 py-1 px-1 min-w-0 flex items-center">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isDictating
                  ? "Listening... speak now"
                  : pendingAttachment
                  ? "Ask about this file..."
                  : "Reply to Dora..."
              }
              disabled={state === "thinking"}
              className={`w-full bg-transparent text-[16px] text-white placeholder-white/40 focus:outline-none resize-none leading-relaxed custom-scrollbar max-h-36 ${
                isDictating ? "placeholder-white/70 animate-pulse" : ""
              }`}
            />
          </div>

          {/* 3. Right inside Pill: Microphone OR Send button */}
          <div className="flex items-center shrink-0 pr-0.5">
            {hasTextOrAttachment ? (
              /* Send Message Button (Integrated inside pill) */
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
                className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-95 bg-white text-black hover:bg-white/90 disabled:opacity-40 shadow-sm"
              >
                <ArrowUp className="w-4.5 h-4.5 stroke-[2.5]" />
              </button>
            ) : (
              /* Microphone Dictation Button (Inside pill, neutral styling) */
              <button
                id="btn-dictation-mic"
                type="button"
                onClick={handleToggleDictation}
                title={isDictating ? "Stop listening" : "Microphone"}
                aria-label={isDictating ? "Stop listening" : "Microphone"}
                className={`p-2 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-95 ${
                  isDictating
                    ? "text-white bg-white/[0.12]"
                    : "text-white/80 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                {isDictating ? (
                  <MicOff className="w-5 h-5 text-white animate-pulse" />
                ) : (
                  <Mic className="w-5 h-5 stroke-[1.8]" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* 4. Far Right: Dora Immersive Voice Blue Circle Button (Immediately beside composer) */}
        <button
          id="btn-voice-mode"
          type="button"
          onClick={onToggleCall}
          title={isCallActive ? "End Immersive Voice" : "Start Immersive Voice"}
          aria-label={isCallActive ? "End Immersive Voice" : "Start Immersive Voice"}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-md ${
            isCallActive
              ? "bg-[#155FD6] text-white ring-2 ring-[#38BDF8]/40"
              : "bg-[#1D72FE] hover:bg-[#155FD6] text-white"
          }`}
        >
          <AudioLines className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </button>
      </div>
    </div>
  );
};
