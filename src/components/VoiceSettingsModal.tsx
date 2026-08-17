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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DoraSparkle } from "./DoraSparkle";

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onUpdateSettings: (newSettings: Partial<VoiceSettings>) => void;
  onOpenMemory?: () => void;
}

type SettingsTab = "voice" | "language" | "memory" | "general" | "about";

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
    id: "heroine",
    name: "Young Adult Heroine",
    voice: "Aoede",
    rate: 0.96,
    pitch: 1.05,
    desc: "Sweet, soft, grounded young woman with natural cadence",
  },
  {
    id: "playful",
    name: "Playful Best Friend",
    voice: "Kore",
    rate: 1.02,
    pitch: 1.1,
    desc: "Energetic, cheerful, lively female voice",
  },
  {
    id: "therapist",
    name: "Calm Therapist",
    voice: "Aoede",
    rate: 0.88,
    pitch: 0.98,
    desc: "Gentle, reassuring, calm and slower pace",
  },
  {
    id: "bilingual",
    name: "Bilingual Host",
    voice: "Aoede",
    rate: 0.95,
    pitch: 1.0,
    desc: "Fluid transitions across Bangla & English speech",
  },
];

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onOpenMemory,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("voice");
  const [mobileViewingDetail, setMobileViewingDetail] = useState<boolean>(false);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        if (mobileViewingDetail) {
          setMobileViewingDetail(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, mobileViewingDetail, onClose]);

  if (!isOpen) return null;

  // Active preset check
  const activePreset = VOICE_PRESETS.find(
    (p) =>
      p.voice === settings.voiceName &&
      Math.abs(p.rate - settings.speakingRate) < 0.02 &&
      Math.abs(p.pitch - settings.pitch) < 0.02
  );

  const getLanguageLabel = () => {
    switch (settings.language) {
      case "en":
        return "English Only";
      case "bn-en":
        return "Banglish / বাংলা";
      default:
        return "Auto (Bangla/English)";
    }
  };

  const getEngineLabel = () => {
    return settings.engine === "gemini-live"
      ? "Gemini Live Stream"
      : settings.engine === "gemini-tts"
      ? "Gemini Studio TTS"
      : "Browser Voice";
  };

  // -------------------------------------------------------------------------
  // SUB-VIEW RENDERERS
  // -------------------------------------------------------------------------

  const renderVoiceContent = () => (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h3 className="text-xl font-normal text-white mb-1">Voice & Conversation</h3>
        <p className="text-sm text-white/50">
          Customize Dora's vocal personality, speech engine, cadence, and turn-taking behavior.
        </p>
      </div>

      {/* 1. Voice Personality Presets */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
          Voice Personality
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                className={`p-4 text-left rounded-2xl border transition-all relative ${
                  isSelected
                    ? "bg-[#1D72FE]/10 border-[#1D72FE]/60 shadow-[0_0_20px_rgba(29,114,254,0.12)]"
                    : "bg-[#1E1F22] border-white/5 hover:bg-[#282A2F] hover:border-white/10"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">{preset.name}</span>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-[#1D72FE] text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/50 leading-relaxed pr-2">{preset.desc}</p>
                <div className="mt-2.5 flex items-center gap-2 text-[11px] text-white/40 font-mono">
                  <span>{preset.voice}</span>
                  <span>•</span>
                  <span>{preset.rate}× speed</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Speech Engine Mode */}
      <div className="space-y-3 pt-2 border-t border-white/5">
        <label className="text-xs font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-[#38BDF8]" />
          Speech Engine
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onUpdateSettings({ engine: "gemini-live" })}
            className={`p-4 text-left rounded-2xl border transition-all ${
              settings.engine === "gemini-live"
                ? "bg-[#1D72FE]/10 border-[#1D72FE]/60 shadow-[0_0_20px_rgba(29,114,254,0.12)]"
                : "bg-[#1E1F22] border-white/5 hover:bg-[#282A2F] hover:border-white/10"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-white">Gemini Live Stream</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1D72FE]/20 text-[#38BDF8] font-mono">
                Real-time
              </span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              Ultra-low latency bidirectional audio with natural barge-in interruptions.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ engine: "gemini-tts" })}
            className={`p-4 text-left rounded-2xl border transition-all ${
              settings.engine === "gemini-tts"
                ? "bg-[#1D72FE]/10 border-[#1D72FE]/60 shadow-[0_0_20px_rgba(29,114,254,0.12)]"
                : "bg-[#1E1F22] border-white/5 hover:bg-[#282A2F] hover:border-white/10"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-white">Gemini Studio TTS</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-mono">
                Neural HD
              </span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              High-definition expressive speech generated per turn.
            </p>
          </button>
        </div>
      </div>

      {/* 3. Sliders: Speaking Speed, Pitch & Turn-Taking */}
      <div className="space-y-6 pt-2 border-t border-white/5">
        {/* Speaking Speed */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[#38BDF8]" /> Speaking speed
            </span>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[#1E1F22] border border-white/10 text-[#38BDF8]">
              {settings.speakingRate.toFixed(2)}×
            </span>
          </div>
          <input
            type="range"
            min="0.75"
            max="1.30"
            step="0.02"
            value={settings.speakingRate}
            onChange={(e) => onUpdateSettings({ speakingRate: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#1D72FE]"
          />
          <div className="flex justify-between text-xs text-white/40">
            <span>Slow (0.75×)</span>
            <span>Default (0.96×)</span>
            <span>Fast (1.30×)</span>
          </div>
        </div>

        {/* Voice Pitch */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#38BDF8]" /> Voice pitch
            </span>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[#1E1F22] border border-white/10 text-[#38BDF8]">
              {settings.pitch.toFixed(2)}×
            </span>
          </div>
          <input
            type="range"
            min="0.85"
            max="1.25"
            step="0.02"
            value={settings.pitch}
            onChange={(e) => onUpdateSettings({ pitch: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#1D72FE]"
          />
          <div className="flex justify-between text-xs text-white/40">
            <span>Warmer & Deeper</span>
            <span>Natural (1.05×)</span>
            <span>Brighter</span>
          </div>
        </div>

        {/* Turn-Taking Silence Threshold */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white flex items-center gap-2">
              <Mic className="w-4 h-4 text-[#38BDF8]" /> Turn-taking silence threshold
            </span>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[#1E1F22] border border-white/10 text-[#38BDF8]">
              {(settings.pauseThresholdMs / 1000).toFixed(1)}s
            </span>
          </div>
          <input
            type="range"
            min="800"
            max="2500"
            step="100"
            value={settings.pauseThresholdMs}
            onChange={(e) => onUpdateSettings({ pauseThresholdMs: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#1D72FE]"
          />
          <div className="flex justify-between text-xs text-white/40">
            <span>Snappy (0.8s)</span>
            <span>Balanced (1.3s)</span>
            <span>Patient (2.5s)</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLanguageContent = () => (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h3 className="text-xl font-normal text-white mb-1">Language & Accent</h3>
        <p className="text-sm text-white/50">
          Control how Dora detects and switches between English, Bengali, and bilingual Banglish.
        </p>
      </div>

      <div className="space-y-3">
        {[
          {
            id: "auto",
            title: "Auto (Bangla/English)",
            desc: "Dora dynamically recognizes both English and Bangla in real-time, responding in the appropriate dialect.",
            tag: "Recommended",
          },
          {
            id: "en",
            title: "English Only",
            desc: "Communicates strictly in crisp, natural English with international clarity.",
            tag: "Global",
          },
          {
            id: "bn-en",
            title: "Banglish / বাংলা",
            desc: "Optimized for natural South Asian colloquial speech, switching seamlessly between Bangla and English phrases.",
            tag: "Colloquial",
          },
        ].map((item) => {
          const isSelected = settings.language === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onUpdateSettings({ language: item.id as any })}
              className={`w-full p-4 text-left rounded-2xl border transition-all flex items-start justify-between ${
                isSelected
                  ? "bg-[#1D72FE]/10 border-[#1D72FE]/60 shadow-[0_0_20px_rgba(29,114,254,0.12)]"
                  : "bg-[#1E1F22] border-white/5 hover:bg-[#282A2F] hover:border-white/10"
              }`}
            >
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{item.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/60 font-mono">
                    {item.tag}
                  </span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">{item.desc}</p>
              </div>
              <div className="pt-1">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                    isSelected
                      ? "bg-[#1D72FE] border-[#1D72FE] text-white"
                      : "border-white/20 bg-transparent"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderMemoryContent = () => (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h3 className="text-xl font-normal text-white mb-1">Memory & Personalization</h3>
        <p className="text-sm text-white/50">
          Manage facts, user preferences, and memories Dora recalls across voice and chat sessions.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-[#1E1F22] border border-white/5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#1D72FE]/15 border border-[#1D72FE]/30 flex items-center justify-center text-[#38BDF8]">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">What Dora Remembers</h4>
            <p className="text-xs text-white/50">
              Personalized context such as your preferred name, language habits, and ongoing topics.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              if (onOpenMemory) {
                onOpenMemory();
              }
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#1D72FE] hover:bg-[#1D72FE]/90 active:scale-95 text-white text-xs font-medium transition-all shadow-[0_0_20px_rgba(29,114,254,0.3)] flex items-center justify-center gap-2"
          >
            <Brain className="w-4 h-4" />
            <span>Manage Memories</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderGeneralContent = () => (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h3 className="text-xl font-normal text-white mb-1">General & Interaction</h3>
        <p className="text-sm text-white/50">
          Configure turn management, sensitivity, and session ergonomics.
        </p>
      </div>

      <div className="space-y-4">
        {/* Interrupt Sensitivity */}
        <div className="p-4 rounded-2xl bg-[#1E1F22] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-white block">Interruption Sensitivity</span>
              <span className="text-xs text-white/50">
                How quickly Dora pauses when you speak while she is talking.
              </span>
            </div>
            <span className="text-xs font-mono uppercase text-[#38BDF8] px-2 py-0.5 rounded-full bg-[#1D72FE]/10 border border-[#1D72FE]/30">
              {settings.interruptSensitivity}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {(["low", "medium", "high"] as const).map((sens) => (
              <button
                key={sens}
                type="button"
                onClick={() => onUpdateSettings({ interruptSensitivity: sens })}
                className={`py-2 px-3 text-xs rounded-xl border capitalize transition-all ${
                  settings.interruptSensitivity === sens
                    ? "bg-[#1D72FE]/20 border-[#1D72FE] text-white font-medium"
                    : "bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {sens}
              </button>
            ))}
          </div>
        </div>

        {/* Continuous Listening Toggle */}
        <div className="p-4 rounded-2xl bg-[#1E1F22] border border-white/5 flex items-center justify-between">
          <div className="space-y-0.5 pr-4">
            <span className="text-sm font-medium text-white block">Continuous Listening</span>
            <span className="text-xs text-white/50 block">
              Keep the microphone channel active across conversational pauses for hands-free dialogue.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onUpdateSettings({ continuousListening: !settings.continuousListening })}
            className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
              settings.continuousListening ? "bg-[#1D72FE]" : "bg-white/20"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                settings.continuousListening ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );

  const renderAboutContent = () => (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h3 className="text-xl font-normal text-white mb-1">About Dora</h3>
        <p className="text-sm text-white/50">
          Conversational intelligence architecture and version details.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-[#1E1F22] border border-white/5 flex flex-col items-center text-center space-y-4">
        <DoraSparkle size={48} />
        <div>
          <h4 className="text-base font-medium text-white">Dora Voice AI</h4>
          <p className="text-xs text-white/50 mt-1 max-w-sm">
            A conversational AI companion designed with multimodal intelligence, emotional responsiveness, and real-time voice streaming.
          </p>
        </div>

        <div className="w-full pt-4 border-t border-white/5 grid grid-cols-2 gap-3 text-left">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[11px] text-white/40 block">Live Engine</span>
            <span className="text-xs font-mono text-white/90">Gemini 2.0 Multimodal</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[11px] text-white/40 block">Audio Engine</span>
            <span className="text-xs font-mono text-white/90">24kHz PCM / WebAudio</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderActiveContent = () => {
    switch (activeTab) {
      case "voice":
        return renderVoiceContent();
      case "language":
        return renderLanguageContent();
      case "memory":
        return renderMemoryContent();
      case "general":
        return renderGeneralContent();
      case "about":
        return renderAboutContent();
    }
  };

  // -------------------------------------------------------------------------
  // MOBILE ROOT LIST VIEW
  // -------------------------------------------------------------------------
  const renderMobileRootList = () => (
    <div className="p-4 space-y-6">
      {/* Group: VOICE */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold tracking-wider text-white/40 uppercase px-2">
          Voice
        </span>
        <div className="rounded-2xl bg-[#1E1F22] border border-white/5 overflow-hidden divide-y divide-white/5">
          <button
            type="button"
            onClick={() => {
              setActiveTab("voice");
              setMobileViewingDetail(true);
            }}
            className="w-full p-4 flex items-center justify-between hover:bg-[#282A2F] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#1D72FE]/15 text-[#38BDF8] flex items-center justify-center">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-medium text-white block">Voice & conversation</span>
                <span className="text-xs text-white/50 block">Personality, speed, silence threshold</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-white/40">
              <span className="text-xs text-white/60 font-mono">
                {activePreset ? activePreset.name : `${settings.voiceName} (${settings.speakingRate}×)`}
              </span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("voice");
              setMobileViewingDetail(true);
            }}
            className="w-full p-4 flex items-center justify-between hover:bg-[#282A2F] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/5 text-white/70 flex items-center justify-center">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-medium text-white block">Speech engine</span>
                <span className="text-xs text-white/50 block">{getEngineLabel()}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/40" />
          </button>
        </div>
      </div>

      {/* Group: LANGUAGE */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold tracking-wider text-white/40 uppercase px-2">
          Language
        </span>
        <div className="rounded-2xl bg-[#1E1F22] border border-white/5 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setActiveTab("language");
              setMobileViewingDetail(true);
            }}
            className="w-full p-4 flex items-center justify-between hover:bg-[#282A2F] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-medium text-white block">Language & accent</span>
                <span className="text-xs text-white/50 block">{getLanguageLabel()}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/40" />
          </button>
        </div>
      </div>

      {/* Group: MEMORY */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold tracking-wider text-white/40 uppercase px-2">
          Memory
        </span>
        <div className="rounded-2xl bg-[#1E1F22] border border-white/5 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              if (onOpenMemory) {
                onClose();
                onOpenMemory();
              } else {
                setActiveTab("memory");
                setMobileViewingDetail(true);
              }
            }}
            className="w-full p-4 flex items-center justify-between hover:bg-[#282A2F] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-medium text-white block">Memory</span>
                <span className="text-xs text-white/50 block">Manage what Dora remembers</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/40" />
          </button>
        </div>
      </div>

      {/* Group: GENERAL & ABOUT */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold tracking-wider text-white/40 uppercase px-2">
          General & About
        </span>
        <div className="rounded-2xl bg-[#1E1F22] border border-white/5 overflow-hidden divide-y divide-white/5">
          <button
            type="button"
            onClick={() => {
              setActiveTab("general");
              setMobileViewingDetail(true);
            }}
            className="w-full p-4 flex items-center justify-between hover:bg-[#282A2F] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/5 text-white/70 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-medium text-white block">General</span>
                <span className="text-xs text-white/50 block">Sensitivity & ergonomics</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/40" />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("about");
              setMobileViewingDetail(true);
            }}
            className="w-full p-4 flex items-center justify-between hover:bg-[#282A2F] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/5 text-white/70 flex items-center justify-center">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-medium text-white block">About Dora</span>
                <span className="text-xs text-white/50 block">Model & system details</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/40" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <div
        id="dora-settings-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      >
        {/* ================================================================ */}
        {/* MOBILE FULL-SCREEN PAGE (< lg)                                   */}
        {/* ================================================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="lg:hidden w-full h-full bg-[#131314] flex flex-col overflow-hidden text-white"
        >
          {/* Mobile Top Header Bar */}
          <div className="px-4 py-3.5 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#131314]">
            {mobileViewingDetail ? (
              <button
                type="button"
                onClick={() => setMobileViewingDetail(false)}
                className="flex items-center gap-1 text-sm text-white/80 hover:text-white -ml-1 p-1 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Settings</span>
              </button>
            ) : (
              <h2 className="text-lg font-medium text-white">Settings</h2>
            )}

            <button
              id="btn-close-settings-mobile"
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Body Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {mobileViewingDetail ? (
              <div className="p-4">{renderActiveContent()}</div>
            ) : (
              renderMobileRootList()
            )}
          </div>
        </motion.div>

        {/* ================================================================ */}
        {/* DESKTOP RESPONSIVE MODAL CONTAINER (>= lg)                        */}
        {/* ================================================================ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="hidden lg:flex w-full max-w-4xl h-[85vh] max-h-[760px] bg-[#131314] rounded-3xl border border-white/10 shadow-2xl overflow-hidden text-white"
        >
          {/* Left Navigation Sidebar */}
          <aside className="w-72 shrink-0 bg-[#18191C]/80 border-r border-white/5 p-5 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-2.5 px-2">
                <DoraSparkle size={24} />
                <h2 className="text-lg font-medium text-white tracking-tight">Settings</h2>
              </div>

              {/* Navigation Items */}
              <nav className="space-y-1">
                {[
                  { id: "voice", label: "Voice & Conversation", icon: Mic },
                  { id: "language", label: "Language & Accent", icon: Globe },
                  { id: "memory", label: "Memory", icon: Brain },
                  { id: "general", label: "General", icon: Sliders },
                  { id: "about", label: "About Dora", icon: Info },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id as SettingsTab)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                        isActive
                          ? "bg-[#1E1F22] text-white shadow-sm border border-white/5"
                          : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? "text-[#38BDF8]" : "text-white/50"
                        }`}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Version Pill */}
            <div className="px-2 py-3 border-t border-white/5">
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>Dora AI Engine</span>
                <span className="font-mono">v2.4.0</span>
              </div>
            </div>
          </aside>

          {/* Right Detail Pane */}
          <main className="flex-1 bg-[#131314] flex flex-col overflow-hidden">
            {/* Top Bar with Close Button */}
            <div className="px-8 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="text-xs text-white/40 uppercase tracking-wider font-mono">
                Settings / {activeTab}
              </div>
              <button
                id="btn-close-settings-desktop"
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                title="Close settings (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
              <div className="max-w-2xl">{renderActiveContent()}</div>
            </div>
          </main>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
