import React from "react";
import { X, Sparkles, Mic, Brain, Zap, Globe, MessageSquareHeart, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SkillsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SKILLS = [
  {
    icon: Mic,
    title: "Natural Female Voice Engine",
    desc: "Fluid, low-latency conversational audio with human-like breathing, cadence, and interruption detection.",
    tag: "Gemini Live",
  },
  {
    icon: Brain,
    title: "Continuous Memory & Learning",
    desc: "Implicitly and explicitly remembers your preferences, projects, routines, and personal facts across sessions.",
    tag: "Autonomous",
  },
  {
    icon: MessageSquareHeart,
    title: "Emotional Attunement",
    desc: "Dynamically adapts tone and empathy in real-time based on conversational sentiment and topic.",
    tag: "Adaptive",
  },
  {
    icon: Zap,
    title: "Real-time Interruption",
    desc: "Stop and redirect Dora anytime mid-sentence just like a real-life voice conversation.",
    tag: "Zero Latency",
  },
  {
    icon: Globe,
    title: "Bilingual Dialogue (Bangla & English)",
    desc: "Full support for natural English and everyday Banglish / Bengali conversational speech.",
    tag: "Multilingual",
  },
  {
    icon: ShieldCheck,
    title: "Private & Secure Storage",
    desc: "All personal memories and interaction contexts are stored securely with granular user controls.",
    tag: "Encrypted",
  },
];

export const SkillsModal: React.FC<SkillsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="dora-skills-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-[#070C18]/95 border border-[#2F8CFF]/20 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_0_50px_rgba(22,119,255,0.15)] text-white space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#1677FF]/15 border border-[#2F8CFF]/30 text-[#2F8CFF] shadow-[0_0_15px_rgba(22,119,255,0.3)]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-wide text-white">Dora Skills & Capabilities</h2>
                <p className="text-xs text-[#9AA4B5] font-normal">Core intelligent systems powering your AI companion</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Grid of skills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SKILLS.map((skill, i) => {
              const Icon = skill.icon;
              return (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] hover:border-[#2F8CFF]/40 hover:bg-[#1677FF]/[0.05] transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-white/5 group-hover:bg-[#1677FF]/20 text-[#2F8CFF] transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1677FF]/10 text-[#48A8FF] border border-[#2F8CFF]/20 font-medium">
                      {skill.tag}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-white mb-1">{skill.title}</h3>
                  <p className="text-xs text-[#9AA4B5] leading-relaxed">{skill.desc}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
