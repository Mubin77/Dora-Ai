import React, { useRef } from "react";
import { Plus, ArrowUp } from "lucide-react";
import { ActionMenu } from "./ActionMenu";
import { AttachmentPreview } from "./AttachmentPreview";
import { DoraSparkle } from "./DoraSparkle";
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

        {/* Floating Rounded Pill Bar (Clean AMOLED dark surface) */}
        <div
          id="dora-input-container"
          className="relative w-full bg-[#18181b] border border-white/[0.1] rounded-full p-2 sm:p-2.5 flex flex-col shadow-[0_12px_40px_rgba(0,0,0,0.7)] transition-all min-h-[58px] sm:min-h-[64px]"
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
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 transition-colors focus:outline-none ${
                isActionMenuOpen || isDeepThinkActive
                  ? "bg-[#1D72FE]/20 text-[#38BDF8]"
                  : "text-white/70 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              <Plus
                className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-150 ${
                  isActionMenuOpen ? "rotate-45" : ""
                }`}
              />
            </button>

            {/* Middle: Text Input Field */}
            <form onSubmit={onSubmit} className="flex-1 px-3 sm:px-4 min-w-0">
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
                className="w-full bg-transparent text-base sm:text-lg text-white placeholder-white/40 focus:outline-none font-normal"
              />
            </form>

            {/* Right: Circular Send or Voice Mode Button */}
            <div className="flex items-center shrink-0">
              {hasTextOrAttachment ? (
                <button
                  id="btn-send-message"
                  type="submit"
                  onClick={onSubmit}
                  disabled={state === "thinking"}
                  title="Send message"
                  aria-label="Send message"
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-95 bg-[#1D72FE] hover:bg-[#155FD6] text-white shadow-[0_0_14px_rgba(29,114,254,0.45)]"
                >
                  <ArrowUp className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.5]" />
                </button>
              ) : (
                <button
                  id="btn-voice-mode"
                  type="button"
                  onClick={onToggleCall}
                  title="Start Dora Voice"
                  aria-label="Start Dora Voice"
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-95 bg-white/[0.08] hover:bg-[#1D72FE]/20 hover:border-[#1D72FE]/40 border border-transparent text-white shadow-sm"
                >
                  <DoraSparkle size={24} state={state} isCallActive={isCallActive} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
