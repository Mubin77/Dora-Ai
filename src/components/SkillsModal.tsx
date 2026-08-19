import React from "react";
import { X, Mic, Brain, Zap, Globe, MessageSquareHeart, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DoraSparkle } from "./DoraSparkle";

interface SkillsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SKILLS = [
  {
    icon: Mic,
    title: "Natural Female Voice Engine",
    desc: "Low-latency streaming audio with human-like breathing, cadence, and interruption detection.",
    protocol: "Gemini Live",
  },
  {
    icon: Brain,
    title: "Continuous Autonomous Memory",
    desc: "Recalls preferences, projects, routines, and personal facts across all conversations.",
    protocol: "Long-term Memory",
  },
  {
    icon: MessageSquareHeart,
    title: "Emotional Attunement",
    desc: "Dynamically adapts conversational warmth and cadence based on emotional context.",
    protocol: "Adaptive",
  },
  {
    icon: Zap,
    title: "Instant Interruption",
    desc: "Seamlessly interrupt and redirect Dora mid-turn with natural voice detection.",
    protocol: "Real-time",
  },
  {
    icon: Globe,
    title: "Bilingual Intelligence (Bangla & English)",
    desc: "Fluid understanding of English, everyday Bengali, and conversational Banglish.",
    protocol: "Multilingual",
  },
  {
    icon: ShieldCheck,
    title: "Private & Secure Architecture",
    desc: "All interaction data and stored memories remain locally sandboxed with full user ownership.",
    protocol: "Encrypted",
  },
];

export const SkillsModal: React.FC<SkillsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="dora-skills-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className="relative w-full max-w-lg bg-[#05070B] border border-white/[0.06] rounded-3xl p-5 sm:p-6 shadow-[0_24px_64px_rgba(0,0,0,0.95)] text-[#E3E3E3] font-sans select-none space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-3.5">
            <div className="flex items-center gap-2.5">
              <DoraSparkle size={20} />
              <div>
                <h2 className="text-base font-semibold text-white tracking-tight">
                  Skills & Intelligence
                </h2>
                <p className="text-xs text-white/45">
                  Core intelligent capabilities powering Dora
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/[0.08] text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Clean Standalone Rows */}
          <div className="divide-y divide-white/[0.04]">
            {SKILLS.map((skill, i) => {
              const Icon = skill.icon;
              return (
                <div
                  key={i}
                  className="py-3 px-1 flex items-start justify-between gap-3 text-left group"
                >
                  <div className="flex items-start gap-3.5">
                    <Icon className="w-4 h-4 text-white/60 group-hover:text-[#38BDF8] transition-colors mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white block">
                          {skill.title}
                        </span>
                      </div>
                      <p className="text-xs text-white/45 leading-relaxed">
                        {skill.desc}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-white/30 shrink-0 pt-0.5">
                    {skill.protocol}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
