import React from "react";
import { VoiceSettings } from "../types";
import {
  X,
  Sliders,
  Sparkles,
  Volume2,
  Cpu,
  Mic,
  Brain,
  Globe,
  Radio,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onUpdateSettings: (newSettings: Partial<VoiceSettings>) => void;
  onOpenMemory?: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onOpenMemory,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="dora-settings-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-[#070C18]/95 border border-[#2F8CFF]/25 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_0_50px_rgba(22,119,255,0.15)] text-white/90 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-[#1677FF]/15 border border-[#2F8CFF]/30 text-[#2F8CFF] shadow-[0_0_12px_rgba(22,119,255,0.3)]">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-wide text-white uppercase">Voice & Conversation Settings</h2>
                <p className="text-xs text-[#9AA4B5] font-normal">Customize Dora's voice, rhythm, and speech behavior</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Voice Personality Presets */}
          <div className="space-y-3">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9AA4B5] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#2388FF]" />
              Voice Personality Preset
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { name: "Young Adult Heroine", voice: "Aoede", rate: 0.96, pitch: 1.05, desc: "Sweet, soft, grounded young woman" },
                { name: "Playful Best Friend", voice: "Kore", rate: 1.02, pitch: 1.1, desc: "Energetic, cheerful, lively female" },
                { name: "Calm Therapist", voice: "Aoede", rate: 0.88, pitch: 0.98, desc: "Gentle, reassuring, slow cadence" },
                { name: "Bilingual Host", voice: "Aoede", rate: 0.95, pitch: 1.0, desc: "Fluid Bangla & English transitions" },
              ].map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() =>
                    onUpdateSettings({
                      voiceName: preset.voice,
                      speakingRate: preset.rate,
                      pitch: preset.pitch,
                    })
                  }
                  className={`p-3 text-left rounded-2xl border transition-all ${
                    settings.voiceName === preset.voice && settings.speakingRate === preset.rate
                      ? "bg-[#1677FF]/15 border-[#2F8CFF] shadow-[0_0_15px_rgba(22,119,255,0.2)]"
                      : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="block text-xs font-semibold text-white">{preset.name}</span>
                  <span className="block text-[10px] text-[#9AA4B5] mt-1 leading-relaxed">{preset.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Engine Selector */}
          <div className="space-y-3">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9AA4B5] flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#2388FF]" />
              Speech Engine Mode
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onUpdateSettings({ engine: "gemini-live" })}
                className={`p-3 text-left rounded-2xl border transition-all ${
                  settings.engine === "gemini-live"
                    ? "bg-[#1677FF]/15 border-[#2F8CFF] shadow-[0_0_15px_rgba(22,119,255,0.2)]"
                    : "bg-white/[0.02] border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-white">Gemini Live Stream</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1677FF]/30 text-[#48A8FF] font-mono">Live API</span>
                </div>
                <span className="block text-[10px] text-[#9AA4B5] leading-relaxed">
                  Real-time bidirectional audio stream with natural interruptions
                </span>
              </button>

              <button
                onClick={() => onUpdateSettings({ engine: "gemini-tts" })}
                className={`p-3 text-left rounded-2xl border transition-all ${
                  settings.engine === "gemini-tts"
                    ? "bg-[#1677FF]/15 border-[#2F8CFF] shadow-[0_0_15px_rgba(22,119,255,0.2)]"
                    : "bg-white/[0.02] border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-white">Gemini Studio TTS</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/70 font-mono">REST</span>
                </div>
                <span className="block text-[10px] text-[#9AA4B5] leading-relaxed">
                  High-definition neural female voice via standard endpoints
                </span>
              </button>
            </div>
          </div>

          {/* Sliders: Rate, Pitch, Pause Threshold */}
          <div className="space-y-4 pt-2">
            {/* Speaking Rate */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/80 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-[#2388FF]" /> Speaking Cadence / Rate
                </span>
                <span className="font-mono text-white/50">{settings.speakingRate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.3"
                step="0.02"
                value={settings.speakingRate}
                onChange={(e) => onUpdateSettings({ speakingRate: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#2388FF]"
              />
              <div className="flex justify-between text-[10px] text-[#9AA4B5]">
                <span>Deliberate & Relaxed</span>
                <span>Default (0.96x)</span>
                <span>Fast & Lively</span>
              </div>
            </div>

            {/* Speaking Pitch */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/80 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[#2388FF]" /> Voice Pitch
                </span>
                <span className="font-mono text-white/50">{settings.pitch.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.85"
                max="1.25"
                step="0.02"
                value={settings.pitch}
                onChange={(e) => onUpdateSettings({ pitch: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#2388FF]"
              />
              <div className="flex justify-between text-[10px] text-[#9AA4B5]">
                <span>Warmer & Deeper</span>
                <span>Natural (1.05x)</span>
                <span>Brighter</span>
              </div>
            </div>

            {/* Pause Threshold */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/80 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-[#2388FF]" /> Turn-Taking Silence Threshold
                </span>
                <span className="font-mono text-white/50">{(settings.pauseThresholdMs / 1000).toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="800"
                max="2500"
                step="100"
                value={settings.pauseThresholdMs}
                onChange={(e) => onUpdateSettings({ pauseThresholdMs: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#2388FF]"
              />
              <div className="flex justify-between text-[10px] text-[#9AA4B5]">
                <span>Snappy (0.8s)</span>
                <span>Default (1.3s)</span>
                <span>Patient (2.5s)</span>
              </div>
            </div>
          </div>

          {/* Language Mode */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between text-xs">
              <span className="text-white/80 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#2388FF]" /> Language & Accent
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "auto", label: "Auto (Bangla/EN)" },
                { id: "en", label: "English Only" },
                { id: "bn-en", label: "Banglish / বাংলা" },
              ].map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => onUpdateSettings({ language: lang.id as any })}
                  className={`py-2 px-3 text-xs rounded-xl border transition-all ${
                    settings.language === lang.id
                      ? "bg-[#1677FF]/20 border-[#2F8CFF] text-white"
                      : "bg-white/[0.02] border-white/10 text-[#9AA4B5] hover:border-white/20"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Memory Integration Shortcut */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-[#2388FF]" />
              <span className="text-xs text-[#9AA4B5]">Looking to view or delete memories?</span>
            </div>
            {onOpenMemory && (
              <button
                onClick={onOpenMemory}
                className="text-xs px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-[#1677FF]/20 border border-white/10 hover:border-[#2F8CFF]/30 text-white transition-all font-medium"
              >
                Open Memory
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
