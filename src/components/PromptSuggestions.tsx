import React from "react";
import { Sparkles, MessageCircleHeart, Smile, HelpCircle, Flame, Coffee } from "lucide-react";

interface PromptSuggestionsProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

export const PROMPTS = [
  {
    icon: Coffee,
    text: "Hey Dora, what's up with you today?",
    category: "Casual",
  },
  {
    icon: Flame,
    text: "I've been working on this code for three days and it's still broken...",
    category: "Venting",
  },
  {
    icon: Smile,
    text: "Tell me something funny or tease me a bit!",
    category: "Playful",
  },
];

export const PromptSuggestions: React.FC<PromptSuggestionsProps> = ({
  onSelectPrompt,
  disabled = false,
}) => {
  return (
    <div id="dora-prompt-suggestions" className="w-full max-w-2xl mx-auto space-y-2 px-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {PROMPTS.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.text}
              disabled={disabled}
              onClick={() => onSelectPrompt(p.text)}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-orange-500/30 text-left transition-all backdrop-blur-md group disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <div className="p-1.5 rounded-lg bg-white/5 text-orange-300/80 group-hover:text-orange-200 shrink-0">
                <Icon className="w-3 h-3" />
              </div>
              <p className="text-[11px] text-white/70 group-hover:text-white leading-tight line-clamp-1 font-light">
                "{p.text}"
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
