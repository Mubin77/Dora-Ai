import React, { useRef } from "react";
import { Plus, Mic, MicOff, Send, AudioLines } from "lucide-react";
import { ActionMenu } from "./ActionMenu";
import { AttachmentPreview } from "./AttachmentPreview";
import { ConversationState, PendingAttachment } from "../types";

interface ComposerProps {
  inputText: string;
  setInputText: (text: string) => void;
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
  isMuted,
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

  const hasTextOrAttachment = Boolean(inputText.trim() || pendingAttachment);

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

        {/* Floating Rounded Pill Bar */}
        <div
          id="dora-input-container"
          className="relative w-full dora-composer-pill rounded-full p-1.5 sm:p-2 flex flex-col shadow-[0_12px_40px_rgba(0,0,0,0.65)] transition-all"
        >
          {/* Staged Attachment Preview inside / above pill input */}
          {pendingAttachment && (
            <AttachmentPreview
              attachment={pendingAttachment}
              onRemove={onRemoveAttachment}
            />
          )}

          <div className="flex items-center justify-between w-full">
            {/* Left: [+] Action Button */}
            <button
              id="btn-action-menu"
              type="button"
              onClick={() => setIsActionMenuOpen((prev) => !prev)}
              aria-label="Add attachment or action"
              title="Add attachment"
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-colors focus:outline-none ${
                isActionMenuOpen || isDeepThinkActive
                  ? "bg-[#1D72FE]/20 text-[#38BDF8]"
                  : "text-white/70 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              <Plus
                className={`w-5 h-5 transition-transform duration-150 ${
                  isActionMenuOpen ? "rotate-45" : ""
                }`}
              />
            </button>

            {/* Middle: Text Input Field */}
            <form onSubmit={onSubmit} className="flex-1 px-2 sm:px-3 min-w-0">
              <input
                ref={textInputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  pendingAttachment
                    ? "Add a message about this attachment..."
                    : isDeepThinkActive
                    ? "Deep Think mode: ask a detailed question..."
                    : "Ask Dora..."
                }
                disabled={state === "thinking"}
                className="w-full bg-transparent text-sm sm:text-base text-white placeholder-white/40 focus:outline-none font-normal"
              />
            </form>

            {/* Right Controls: Microphone & Live Voice Button / Send */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Optional Microphone Dictation Button */}
              <button
                type="button"
                onClick={onToggleCall}
                title={isCallActive ? "Mute / Disconnect voice" : "Voice input"}
                className={`p-2 rounded-full transition-colors ${
                  isCallActive
                    ? "text-[#38BDF8] bg-[#1D72FE]/15"
                    : "text-white/60 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                {isMuted && isCallActive ? (
                  <MicOff className="w-5 h-5 text-red-400" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              {/* Send Button or Prominent Live Voice Waveform Button */}
              {hasTextOrAttachment ? (
                <button
                  id="btn-send-message"
                  type="button"
                  onClick={(e) => onSubmit(e)}
                  title="Send message"
                  aria-label="Send message"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1D72FE] hover:bg-[#155FD6] text-white flex items-center justify-center shadow-[0_0_12px_rgba(29,114,254,0.4)] transition-all shrink-0"
                >
                  <Send className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </button>
              ) : (
                <button
                  id="btn-main-voice-live"
                  type="button"
                  onClick={onToggleCall}
                  title={isCallActive ? "End live conversation" : "Start live voice conversation"}
                  aria-label="Live Voice Conversation"
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-all shadow-[0_0_16px_rgba(29,114,254,0.4)] ${
                    isCallActive
                      ? "bg-[#1D72FE] text-white animate-pulse"
                      : "bg-[#1D72FE] hover:bg-[#155FD6] text-white transform hover:scale-105 active:scale-95"
                  }`}
                >
                  <AudioLines className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
