import React, { useState, useEffect } from "react";
import { VoiceSettings } from "../types";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Mic,
  Volume2,
  Globe,
  Brain,
  Sliders,
  Sparkles,
  Info,
  Check,
  Radio,
  Cpu,
  Zap,
  ShieldCheck,
  Activity,
  Play,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DoraSparkle } from "./DoraSparkle";
import { memoryManager } from "../memory/MemoryManager";

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onUpdateSettings: (newSettings: Partial<VoiceSettings>) => void;
  onOpenMemory?: () => void;
}

type SettingsSection = "main" | "voice" | "speech" | "language" | "memory" | "general" | "about";

interface VoicePreset {
  id: string;
  name: string;
  voice: string;
  rate: number;
  pitch: number;
  desc: string;
}

const VOICE_PRESETS: VoicePreset[] = [
  {
    id: "reference",
    name: "Young Companion (Reference-Aligned)",
    voice: "Aoede",
    rate: 1.0,
    pitch: 1.05,
    desc: "Light, bright, youthful Bangladeshi voice with natural storytelling cadence",
  },
  {
    id: "playful",
    name: "Playful Best Friend",
    voice: "Aoede",
    rate: 1.04,
    pitch: 1.08,
    desc: "Energetic, cheerful, lively young tone with bright inflections",
  },
  {
    id: "calm",
    name: "Calm & Grounded",
    voice: "Aoede",
    rate: 0.94,
    pitch: 1.02,
    desc: "Gentle, reassuring, soft young-adult evening companion",
  },
  {
    id: "bilingual",
    name: "Bilingual Storyteller",
    voice: "Aoede",
    rate: 1.0,
    pitch: 1.05,
    desc: "Fluid transitions across Bangla, Banglish & English speech",
  },
];

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onOpenMemory,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>("main");
  const [totalMemories, setTotalMemories] = useState<number>(0);
  const [isPlayingSample, setIsPlayingSample] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setTotalMemories(memoryManager.getTotalCount());
      const unsub = memoryManager.subscribe(() => {
        setTotalMemories(memoryManager.getTotalCount());
      });
      return () => unsub();
    }
  }, [isOpen]);

  // Reset to main view on open
  useEffect(() => {
    if (isOpen) {
      // Default to voice sub-view on desktop, main list on mobile
      if (window.innerWidth >= 1024) {
        setActiveSection("voice");
      } else {
        setActiveSection("main");
      }
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        if (activeSection !== "main" && window.innerWidth < 1024) {
          setActiveSection("main");
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeSection, onClose]);

  if (!isOpen) return null;

  const playVoiceSample = () => {
    if (isPlayingSample) return;
    setIsPlayingSample(true);
    try {
      const sampleText =
        settings.language === "bn-en"
          ? "Hey there! Ami Dora. How are you feeling today?"
          : "Hey there! I'm Dora, your AI companion. How can I help you today?";
      const utterance = new SpeechSynthesisUtterance(sampleText);
      utterance.rate = settings.speakingRate;
      utterance.pitch = settings.pitch;
      utterance.onend = () => setIsPlayingSample(false);
      utterance.onerror = () => setIsPlayingSample(false);
      window.speechSynthesis?.speak(utterance);
    } catch {
      setIsPlayingSample(false);
    }
  };

  const getLanguageLabel = () => {
    switch (settings.language) {
      case "en":
        return "English Only";
      case "bn-en":
        return "Banglish / Everyday Bangla";
      default:
        return "Auto (Bangla/English)";
    }
  };

  const getEngineLabel = () => {
    return settings.engine === "gemini-live"
      ? "Gemini Live Stream"
      : settings.engine === "gemini-tts"
      ? "Gemini Studio TTS"
      : "Browser Native";
  };

  // =========================================================================
  // MAIN SETTINGS MENU (Clean, minimalist standalone rows with section labels)
  // =========================================================================
  const renderMainSettingsList = () => (
    <div className="space-y-6 animate-fade-in text-[#E3E3E3] font-sans select-none">
      {/* 1. AUDIO & SPEECH */}
      <div className="space-y-1">
        <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-white/35 uppercase">
          Audio & Speech
        </div>

        <div className="divide-y divide-white/[0.04]">
          <button
            type="button"
            onClick={() => setActiveSection("voice")}
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <Mic className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
              <div>
                <span className="text-sm font-medium text-white block">Voice & personality</span>
                <span className="text-xs text-white/45 block">
                  {settings.voiceName || "Aoede"} ({settings.speakingRate}× speed)
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("speech")}
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <Radio className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
              <div>
                <span className="text-sm font-medium text-white block">Speech engine</span>
                <span className="text-xs text-white/45 block">{getEngineLabel()}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>
        </div>
      </div>

      {/* 2. LANGUAGE */}
      <div className="space-y-1">
        <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-white/35 uppercase">
          Language
        </div>

        <div className="divide-y divide-white/[0.04]">
          <button
            type="button"
            onClick={() => setActiveSection("language")}
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <Globe className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
              <div>
                <span className="text-sm font-medium text-white block">Language & accent</span>
                <span className="text-xs text-white/45 block">{getLanguageLabel()}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>
        </div>
      </div>

      {/* 3. INTELLIGENCE */}
      <div className="space-y-1">
        <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-white/35 uppercase">
          Intelligence
        </div>

        <div className="divide-y divide-white/[0.04]">
          <button
            type="button"
            onClick={() => setActiveSection("memory")}
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <Brain className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
              <div>
                <span className="text-sm font-medium text-white block">Memory & personalization</span>
                <span className="text-xs text-white/45 block">
                  {totalMemories} {totalMemories === 1 ? "fact" : "facts"} remembered
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>
        </div>
      </div>

      {/* 4. SYSTEM & ABOUT */}
      <div className="space-y-1">
        <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-white/35 uppercase">
          System
        </div>

        <div className="divide-y divide-white/[0.04]">
          <button
            type="button"
            onClick={() => setActiveSection("general")}
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <Sliders className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
              <div>
                <span className="text-sm font-medium text-white block">General</span>
                <span className="text-xs text-white/45 block">
                  Sensitivity, ambience & haptics
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("about")}
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <Info className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
              <div>
                <span className="text-sm font-medium text-white block">About Dora</span>
                <span className="text-xs text-white/45 block">Gemini 2.0 Flash • Live API</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // 1. VOICE & PERSONALITY INNER SECTION
  // =========================================================================
  const renderVoiceContent = () => (
    <div className="space-y-6 animate-fade-in text-[#E3E3E3] font-sans select-none">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">Voice & Personality</h3>
        <p className="text-xs sm:text-sm text-white/50 leading-relaxed">
          Select Dora's speaking personality and fine-tune natural voice characteristics.
        </p>
      </div>

      {/* Voice Presets List */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/35">
          Preset Profiles
        </div>

        <div className="divide-y divide-white/[0.04]">
          {VOICE_PRESETS.map((preset) => {
            const isSelected =
              settings.voiceName === preset.voice &&
              Math.abs(settings.speakingRate - preset.rate) < 0.02 &&
              Math.abs(settings.pitch - preset.pitch) < 0.02;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    voiceName: preset.voice,
                    speakingRate: preset.rate,
                    pitch: preset.pitch,
                  })
                }
                className={`w-full flex items-start justify-between p-3 rounded-xl transition-colors text-left ${
                  isSelected
                    ? "bg-[#0C1938] text-[#38BDF8]"
                    : "hover:bg-white/[0.04] active:bg-white/[0.08] text-white"
                }`}
              >
                <div className="space-y-0.5 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium block">{preset.name}</span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] inline-block" />
                    )}
                  </div>
                  <p className="text-xs text-white/45 leading-relaxed">{preset.desc}</p>
                </div>
                <div className="text-[11px] font-mono text-white/35 shrink-0 pt-0.5">
                  {preset.rate}×
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Voice Tuning Sliders */}
      <div className="space-y-4 pt-2 border-t border-white/[0.04]">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/35">
          Fine Tuning
        </div>

        {/* Speed Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-white/80 font-medium">Speaking Speed</span>
            <span className="font-mono text-[#38BDF8] text-xs">{settings.speakingRate}×</span>
          </div>
          <input
            type="range"
            min="0.75"
            max="1.3"
            step="0.05"
            value={settings.speakingRate}
            onChange={(e) => onUpdateSettings({ speakingRate: parseFloat(e.target.value) })}
            className="w-full h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[#1D72FE]"
          />
        </div>

        {/* Pitch Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-white/80 font-medium">Voice Pitch</span>
            <span className="font-mono text-[#38BDF8] text-xs">{settings.pitch}×</span>
          </div>
          <input
            type="range"
            min="0.8"
            max="1.2"
            step="0.05"
            value={settings.pitch}
            onChange={(e) => onUpdateSettings({ pitch: parseFloat(e.target.value) })}
            className="w-full h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[#1D72FE]"
          />
        </div>
      </div>

      {/* Sample Voice Player */}
      <div className="pt-2">
        <button
          type="button"
          onClick={playVoiceSample}
          disabled={isPlayingSample}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] active:bg-white/[0.12] border border-white/[0.06] text-white text-sm font-medium transition-all"
        >
          <Play className={`w-4 h-4 ${isPlayingSample ? "animate-pulse text-[#38BDF8]" : ""}`} />
          <span>{isPlayingSample ? "Playing voice sample…" : "Test Voice Output"}</span>
        </button>
      </div>
    </div>
  );

  // =========================================================================
  // 2. SPEECH ENGINE INNER SECTION
  // =========================================================================
  const renderSpeechContent = () => (
    <div className="space-y-6 animate-fade-in text-[#E3E3E3] font-sans select-none">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">Speech Engine</h3>
        <p className="text-xs sm:text-sm text-white/50 leading-relaxed">
          Configure real-time voice streaming latency and microphone processing.
        </p>
      </div>

      {/* Engine Selection */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/35">
          Audio Pipeline
        </div>

        <div className="divide-y divide-white/[0.04]">
          <button
            type="button"
            onClick={() => onUpdateSettings({ engine: "gemini-live" })}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left ${
              settings.engine === "gemini-live"
                ? "bg-[#0C1938] text-[#38BDF8]"
                : "hover:bg-white/[0.04] active:bg-white/[0.08] text-white"
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium block">Gemini Live Stream</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#1D72FE]/20 text-[#38BDF8] font-mono">
                  Real-time
                </span>
              </div>
              <p className="text-xs text-white/45">Ultra-low latency bidirectional audio pipeline</p>
            </div>
            {settings.engine === "gemini-live" && <Check className="w-4 h-4 text-[#38BDF8]" />}
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ engine: "gemini-tts" })}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left ${
              settings.engine === "gemini-tts"
                ? "bg-[#0C1938] text-[#38BDF8]"
                : "hover:bg-white/[0.04] active:bg-white/[0.08] text-white"
            }`}
          >
            <div>
              <span className="text-sm font-medium block">Gemini Studio TTS</span>
              <p className="text-xs text-white/45">High-fidelity voice synthesis fallback</p>
            </div>
            {settings.engine === "gemini-tts" && <Check className="w-4 h-4 text-[#38BDF8]" />}
          </button>
        </div>
      </div>

      {/* Voice Activity Detection */}
      <div className="space-y-4 pt-2 border-t border-white/[0.04]">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/35">
          Interaction Dynamics
        </div>

        {/* Interruption Sensitivity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-white/80 font-medium">Interruption Sensitivity</span>
            <span className="font-mono text-[#38BDF8] text-xs">High</span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            defaultValue="4"
            className="w-full h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[#1D72FE]"
          />
          <p className="text-[11px] text-white/40 leading-relaxed">
            Higher values allow interrupting Dora immediately when you start speaking.
          </p>
        </div>

        {/* Ambient Noise Suppression */}
        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5 pr-4">
            <span className="text-sm font-medium text-white block">Noise Cancellation</span>
            <span className="text-xs text-white/45 block">
              Filter background room chatter and ambient echo
            </span>
          </div>
          <div className="w-8 h-4.5 rounded-full bg-[#1D72FE] relative shrink-0 p-0.5 cursor-pointer">
            <div className="w-3.5 h-3.5 rounded-full bg-white translate-x-3.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // 3. LANGUAGE & ACCENT INNER SECTION
  // =========================================================================
  const renderLanguageContent = () => (
    <div className="space-y-6 animate-fade-in text-[#E3E3E3] font-sans select-none">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">Language & Accent</h3>
        <p className="text-xs sm:text-sm text-white/50 leading-relaxed">
          Configure multilingual voice detection and regional conversational styles.
        </p>
      </div>

      {/* Language Options */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/35">
          Primary Language
        </div>

        <div className="divide-y divide-white/[0.04]">
          <button
            type="button"
            onClick={() => onUpdateSettings({ language: "auto" })}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left ${
              settings.language === "auto"
                ? "bg-[#0C1938] text-[#38BDF8]"
                : "hover:bg-white/[0.04] active:bg-white/[0.08] text-white"
            }`}
          >
            <div>
              <span className="text-sm font-medium block">Auto (Bangla / English)</span>
              <p className="text-xs text-white/45">
                Automatically adapts to English or Banglish as you speak
              </p>
            </div>
            {settings.language === "auto" && <Check className="w-4 h-4 text-[#38BDF8]" />}
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ language: "en" })}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left ${
              settings.language === "en"
                ? "bg-[#0C1938] text-[#38BDF8]"
                : "hover:bg-white/[0.04] active:bg-white/[0.08] text-white"
            }`}
          >
            <div>
              <span className="text-sm font-medium block">English Only</span>
              <p className="text-xs text-white/45">Standard English conversational mode</p>
            </div>
            {settings.language === "en" && <Check className="w-4 h-4 text-[#38BDF8]" />}
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ language: "bn-en" })}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left ${
              settings.language === "bn-en"
                ? "bg-[#0C1938] text-[#38BDF8]"
                : "hover:bg-white/[0.04] active:bg-white/[0.08] text-white"
            }`}
          >
            <div>
              <span className="text-sm font-medium block">Everyday Bangla / Banglish</span>
              <p className="text-xs text-white/45">Natural conversational Bangla & Banglish</p>
            </div>
            {settings.language === "bn-en" && <Check className="w-4 h-4 text-[#38BDF8]" />}
          </button>
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // 4. MEMORY & PERSONALIZATION INNER SECTION
  // =========================================================================
  const renderMemoryContent = () => (
    <div className="space-y-6 animate-fade-in text-[#E3E3E3] font-sans select-none">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">Memory & Intelligence</h3>
        <p className="text-xs sm:text-sm text-white/50 leading-relaxed">
          Manage how Dora learns and recalls facts about you across conversations.
        </p>
      </div>

      {/* Memory Master Toggle */}
      <div className="flex items-center justify-between py-3 border-b border-white/[0.04]">
        <div className="space-y-0.5 pr-4">
          <span className="text-sm font-medium text-white block">Continuous Memory</span>
          <span className="text-xs text-white/45 block">
            Dora remembers your preferences and projects automatically
          </span>
        </div>
        <div
          onClick={() => {
            const next = !memoryManager.isEnabled();
            memoryManager.setEnabled(next);
            setTotalMemories(memoryManager.getTotalCount());
          }}
          className={`w-8 h-4.5 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ${
            memoryManager.isEnabled() ? "bg-[#1D72FE]" : "bg-white/20"
          }`}
        >
          <div
            className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
              memoryManager.isEnabled() ? "translate-x-3.5" : "translate-x-0"
            }`}
          />
        </div>
      </div>

      {/* Memory Overview Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="text-white/70">Stored Facts</span>
          <span className="font-mono text-[#38BDF8] font-medium">{totalMemories} items</span>
        </div>

        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenMemory?.();
          }}
          className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/[0.06] text-white text-sm font-medium transition-all"
        >
          <div className="flex items-center gap-2.5">
            <Brain className="w-4 h-4 text-[#38BDF8]" />
            <span>Open Memory Store</span>
          </div>
          <ChevronRight className="w-4 h-4 text-white/40" />
        </button>
      </div>

      {/* Privacy Notice */}
      <div className="pt-2 flex items-center gap-2 text-xs text-white/40">
        <ShieldCheck className="w-4 h-4 text-[#38BDF8] shrink-0" />
        <span>Stored securely in local browser memory with complete user ownership.</span>
      </div>
    </div>
  );

  // =========================================================================
  // 5. GENERAL & SYSTEM INNER SECTION
  // =========================================================================
  const renderGeneralContent = () => (
    <div className="space-y-6 animate-fade-in text-[#E3E3E3] font-sans select-none">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">General Preferences</h3>
        <p className="text-xs sm:text-sm text-white/50 leading-relaxed">
          Configure ambient effects, sound indicators, and system interactions.
        </p>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {/* Ambient Glow */}
        <div className="flex items-center justify-between py-3">
          <div className="space-y-0.5 pr-4">
            <span className="text-sm font-medium text-white block">Cinematic Ambient Glow</span>
            <span className="text-xs text-white/45 block">
              Subtle atmospheric blue gradient during voice calls
            </span>
          </div>
          <div className="w-8 h-4.5 rounded-full bg-[#1D72FE] relative shrink-0 p-0.5 cursor-pointer">
            <div className="w-3.5 h-3.5 rounded-full bg-white translate-x-3.5 transition-transform" />
          </div>
        </div>

        {/* Haptic / Tactile Feedback */}
        <div className="flex items-center justify-between py-3">
          <div className="space-y-0.5 pr-4">
            <span className="text-sm font-medium text-white block">Haptic Feedback</span>
            <span className="text-xs text-white/45 block">
              Vibrate slightly when speech starts or turn finishes
            </span>
          </div>
          <div className="w-8 h-4.5 rounded-full bg-[#1D72FE] relative shrink-0 p-0.5 cursor-pointer">
            <div className="w-3.5 h-3.5 rounded-full bg-white translate-x-3.5 transition-transform" />
          </div>
        </div>

        {/* Auto-sleep on silence */}
        <div className="flex items-center justify-between py-3">
          <div className="space-y-0.5 pr-4">
            <span className="text-sm font-medium text-white block">Auto-pause on Silence</span>
            <span className="text-xs text-white/45 block">
              Pause microphone stream after 3 minutes of inactivity
            </span>
          </div>
          <div className="w-8 h-4.5 rounded-full bg-[#1D72FE] relative shrink-0 p-0.5 cursor-pointer">
            <div className="w-3.5 h-3.5 rounded-full bg-white translate-x-3.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // 6. ABOUT DORA INNER SECTION
  // =========================================================================
  const renderAboutContent = () => (
    <div className="space-y-6 animate-fade-in text-[#E3E3E3] font-sans select-none">
      <div className="flex items-center gap-3">
        <DoraSparkle size={28} />
        <div>
          <h3 className="text-base font-semibold text-white tracking-tight">Dora AI</h3>
          <span className="text-xs text-white/45">Version 2.4.0 • Gemini 2.0</span>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
        Dora is an adaptive, human-like voice companion built with Gemini Live streaming,
        continuous autonomous memory, and emotional attunement.
      </p>

      <div className="divide-y divide-white/[0.04] pt-2">
        <div className="flex items-center justify-between py-2.5 text-xs sm:text-sm">
          <span className="text-white/60">Core Intelligence</span>
          <span className="font-mono text-white/90">Gemini 2.0 Flash</span>
        </div>
        <div className="flex items-center justify-between py-2.5 text-xs sm:text-sm">
          <span className="text-white/60">Live Voice Protocol</span>
          <span className="font-mono text-white/90">WebSocket 16kHz PCM</span>
        </div>
        <div className="flex items-center justify-between py-2.5 text-xs sm:text-sm">
          <span className="text-white/60">Audio Latency</span>
          <span className="font-mono text-[#38BDF8]">~180ms</span>
        </div>
        <div className="flex items-center justify-between py-2.5 text-xs sm:text-sm">
          <span className="text-white/60">Memory Encryption</span>
          <span className="font-mono text-white/90">AES Browser Sandbox</span>
        </div>
      </div>
    </div>
  );

  // Helper to render current section content
  const renderActiveSectionContent = () => {
    switch (activeSection) {
      case "voice":
        return renderVoiceContent();
      case "speech":
        return renderSpeechContent();
      case "language":
        return renderLanguageContent();
      case "memory":
        return renderMemoryContent();
      case "general":
        return renderGeneralContent();
      case "about":
        return renderAboutContent();
      default:
        return renderMainSettingsList();
    }
  };

  return (
    <AnimatePresence>
      <div
        id="dora-settings-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        {/* ================================================================ */}
        {/* MOBILE FULL-SCREEN / ADAPTIVE CONTAINER (< lg)                   */}
        {/* ================================================================ */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.18 }}
          className="lg:hidden w-full h-full bg-[#000000] flex flex-col text-[#E3E3E3] font-sans select-none overflow-hidden"
        >
          {/* Mobile Top Header Bar */}
          <div className="px-4 py-3.5 border-b border-white/[0.04] flex items-center justify-between shrink-0 bg-[#000000]">
            {activeSection !== "main" ? (
              <button
                type="button"
                onClick={() => setActiveSection("main")}
                className="flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white -ml-1 p-1 rounded-lg"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Settings</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <DoraSparkle size={18} />
                <span className="text-sm font-semibold text-white">Settings</span>
              </div>
            )}

            <button
              id="btn-close-settings-mobile"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Body Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
            {renderActiveSectionContent()}
          </div>
        </motion.div>

        {/* ================================================================ */}
        {/* DESKTOP RESPONSIVE TWO-PANE SETTINGS DIALOG (>= lg)               */}
        {/* ================================================================ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className="hidden lg:flex w-full max-w-3xl h-[75vh] max-h-[640px] bg-[#05070B] rounded-3xl border border-white/[0.06] shadow-[0_24px_64px_rgba(0,0,0,0.95)] overflow-hidden text-[#E3E3E3] font-sans select-none"
        >
          {/* Left Navigation Menu */}
          <aside className="w-64 shrink-0 bg-[#000000] border-r border-white/[0.04] p-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-2.5 px-2 pt-1">
                <DoraSparkle size={20} />
                <h2 className="text-base font-semibold text-white tracking-tight">Settings</h2>
              </div>

              {/* Navigation Items */}
              <nav className="space-y-0.5 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveSection("voice")}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                    activeSection === "voice"
                      ? "bg-[#0C1938] text-[#38BDF8] font-medium"
                      : "text-white/70 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Mic className="w-4 h-4 shrink-0" />
                  <span>Voice & personality</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection("speech")}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                    activeSection === "speech"
                      ? "bg-[#0C1938] text-[#38BDF8] font-medium"
                      : "text-white/70 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Radio className="w-4 h-4 shrink-0" />
                  <span>Speech engine</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection("language")}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                    activeSection === "language"
                      ? "bg-[#0C1938] text-[#38BDF8] font-medium"
                      : "text-white/70 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Globe className="w-4 h-4 shrink-0" />
                  <span>Language & accent</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection("memory")}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                    activeSection === "memory"
                      ? "bg-[#0C1938] text-[#38BDF8] font-medium"
                      : "text-white/70 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Brain className="w-4 h-4 shrink-0" />
                  <span>Memory & intelligence</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection("general")}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                    activeSection === "general"
                      ? "bg-[#0C1938] text-[#38BDF8] font-medium"
                      : "text-white/70 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Sliders className="w-4 h-4 shrink-0" />
                  <span>General preferences</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection("about")}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                    activeSection === "about"
                      ? "bg-[#0C1938] text-[#38BDF8] font-medium"
                      : "text-white/70 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Info className="w-4 h-4 shrink-0" />
                  <span>About Dora</span>
                </button>
              </nav>
            </div>

            {/* Bottom Status */}
            <div className="px-2 py-2 text-[11px] text-white/35 font-mono border-t border-white/[0.04]">
              Gemini Live Connected
            </div>
          </aside>

          {/* Right Detail Pane */}
          <main className="flex-1 bg-[#05070B] flex flex-col overflow-hidden">
            {/* Top Close Bar */}
            <div className="px-7 py-4 border-b border-white/[0.04] flex items-center justify-between shrink-0">
              <div className="text-xs text-white/40 uppercase tracking-wider font-mono">
                Settings / {activeSection}
              </div>
              <button
                id="btn-close-settings-desktop"
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Pane */}
            <div className="flex-1 p-7 overflow-y-auto custom-scrollbar">
              <div className="max-w-xl">
                {activeSection === "main" ? renderVoiceContent() : renderActiveSectionContent()}
              </div>
            </div>
          </main>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
