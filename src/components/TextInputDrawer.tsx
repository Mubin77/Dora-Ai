import React, { useState } from "react";
import { Send, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TextInputDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => void;
  disabled?: boolean;
}

export const TextInputDrawer: React.FC<TextInputDrawerProps> = ({
  isOpen,
  onClose,
  onSendMessage,
  disabled = false,
}) => {
  const [inputText, setInputText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || disabled) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="w-full max-w-2xl mx-auto px-4"
      >
        <form
          id="dora-text-input-form"
          onSubmit={handleSubmit}
          className="flex items-center gap-2 p-2 rounded-2xl bg-white/[0.04] border border-white/10 shadow-2xl backdrop-blur-2xl"
        >
          <input
            id="dora-text-input-field"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message to Dora (she will speak back naturally)..."
            disabled={disabled}
            className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none font-light"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || disabled}
            className="p-2 rounded-xl bg-[#FF6B4A] hover:bg-[#ff7d5f] disabled:opacity-30 disabled:hover:bg-[#FF6B4A] text-white transition-all shadow-md shadow-orange-950/40"
          >
            <Send className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      </motion.div>
    </AnimatePresence>
  );
};
