import React, { useState, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Mic,
  Radio,
  Globe,
  Brain,
  Sliders,
  Info,
  Check,
  Play,
  ShieldCheck,
  Sparkles,
  User,
  Pencil,
  SunMoon,
  Palette,
  Bell,
  Shield,
  Lock,
  Tv,
  Database,
  FileText,
  Bug,
  LogOut,
  AlertTriangle,
  Smartphone,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { VoiceSettings, UserProfile } from "../types";
import { DoraSparkle } from "./DoraSparkle";
import { memoryManager } from "../memory/MemoryManager";
import { AndroidControlStatus } from "./device/AndroidControlStatus";
import { androidControlService } from "../services/device/AndroidControlService";

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onUpdateSettings: (newSettings: Partial<VoiceSettings>) => void;
  onOpenMemory?: () => void;
  onOpenSkills?: () => void;
  user?: UserProfile | null;
  userName?: string;
  onUpdateUserName?: (name: string) => void;
}

export type SettingsSection =
  | "main"
  | "personalization"
  | "voice"
  | "speech"
  | "language"
  | "memory"
  | "general"
  | "notifications"
  | "safety"
  | "security"
  | "devicecontrol"
  | "storage"
  | "datacontrols"
  | "about";

const VOICE_PRESETS = [
  {
    id: "young-companion",
    name: "Young Companion (Aoede)",
    voice: "Aoede",
    rate: 1.0,
    pitch: 1.05,
    desc: "Light, bright, youthful 19-21 year-old Bangladeshi companion with natural Bangla cadence",
  },
  {
    id: "expressive-kore",
    name: "Warm & Caring (Kore)",
    voice: "Kore",
    rate: 1.0,
    pitch: 1.0,
    desc: "Empathetic, clear, and reassuring tone for deep conversations",
  },
  {
    id: "dynamic-fenrir",
    name: "Energetic & Bold (Fenrir)",
    voice: "Fenrir",
    rate: 1.05,
    pitch: 1.0,
    desc: "Punchy, fast, and enthusiastic delivery for brainstorming",
  },
  {
    id: "calm-zephyr",
    name: "Gentle & Serene (Zephyr)",
    voice: "Zephyr",
    rate: 0.95,
    pitch: 0.98,
    desc: "Soft-spoken, relaxing voice with gentle pauses",
  },
];

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onOpenMemory,
  onOpenSkills,
  user = null,
  userName,
  onUpdateUserName,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>("main");
  const [totalMemories, setTotalMemories] = useState<number>(0);
  const [isPlayingSample, setIsPlayingSample] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedAppearance, setSelectedAppearance] = useState("Dark (AMOLED)");
  const [selectedAccent, setSelectedAccent] = useState("Blue");
  const [customInstructions, setCustomInstructions] = useState(
    "Always be friendly, spontaneous, and speak natural everyday Bangla with casual Banglish words."
  );

  const isAuthenticated = Boolean(user && user.isAuthenticated);
  const displayName = user?.name || userName || "Anonymous";
  const email = user?.email;
  const avatarUrl = user?.avatarUrl;

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
      setActiveSection("main");
      setShowLogoutConfirm(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        if (showLogoutConfirm) {
          setShowLogoutConfirm(false);
        } else if (activeSection !== "main") {
          setActiveSection("main");
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeSection, showLogoutConfirm, onClose]);

  if (!isOpen) return null;

  const playVoiceSample = () => {
    if (isPlayingSample) return;
    setIsPlayingSample(true);
    try {
      const sampleText =
        settings.language === "bn-en"
          ? "Hey there! Ami Dora. Tomar sathe kotha bolte amar khub bhalo lage!"
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
        return "Bangla / Banglish";
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

  // User initials for authenticated users
  const initials = isAuthenticated && user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  // =========================================================================
  // MAIN SETTINGS MENU (Grouped Cards matching Reference Screenshots 2, 3, 4)
  // =========================================================================
  const renderMainSettingsList = () => (
    <div className="space-y-6 animate-fade-in text-[#E3E3E3] font-sans select-none pb-8">
      {/* ------------------------------------------------------------- */}
      {/* PROFILE / ACCOUNT IDENTITY CARD                               */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col items-center justify-center py-4">
        {isAuthenticated ? (
          <>
            <div className="relative group cursor-pointer">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-20 h-20 rounded-full object-cover border-2 border-white/20 shadow-xl"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 border-2 border-white/20 flex items-center justify-center text-white text-2xl font-bold shadow-xl">
                  {initials}
                </div>
              )}
            </div>
            <h2 className="mt-3 text-lg font-semibold text-white tracking-tight">
              {displayName}
            </h2>
            {email && <span className="text-xs text-white/45">{email}</span>}
          </>
        ) : (
          <>
            {/* Generic Minimal Anonymous / Guest Profile Icon */}
            <div className="w-20 h-20 rounded-full bg-[#18181b] border border-white/[0.12] flex items-center justify-center text-white/70 shadow-lg">
              <User className="w-9 h-9 text-white/60 stroke-[1.75]" />
            </div>
            <h2 className="mt-3 text-base font-semibold text-white tracking-tight">
              Anonymous / Guest
            </h2>
            <span className="text-xs text-white/40 mt-0.5">
              Local session on this device
            </span>
          </>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* GROUP 1: MY DORA (Screenshot 4)                               */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-1.5">
        <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-white/35 uppercase">
          My Dora
        </div>

        <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.04] divide-y divide-white/[0.06] overflow-hidden">
          {/* Personalization */}
          <button
            type="button"
            onClick={() => setActiveSection("personalization")}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <User className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
              <span className="text-sm font-medium text-white">Personalization</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>

          {/* Memory */}
          <button
            type="button"
            onClick={() => {
              if (onOpenMemory) {
                onClose();
                onOpenMemory();
              } else {
                setActiveSection("memory");
              }
            }}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <Brain className="w-5 h-5 text-white/70 group-hover:text-[#38BDF8] transition-colors" />
              <span className="text-sm font-medium text-white">Memory</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 font-mono">
                {totalMemories} {totalMemories === 1 ? "fact" : "facts"}
              </span>
              <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
            </div>
          </button>

          {/* Plugins & Skills */}
          <button
            type="button"
            onClick={() => {
              if (onOpenSkills) {
                onClose();
                onOpenSkills();
              }
            }}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <Sparkles className="w-5 h-5 text-white/70 group-hover:text-[#38BDF8] transition-colors" />
              <span className="text-sm font-medium text-white">Plugins & Skills</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1D72FE]/20 text-[#38BDF8] font-mono">
                Active
              </span>
              <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
            </div>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* GROUP 2: APPEARANCE & THEME (Screenshot 2)                    */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-1.5">
        <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-white/35 uppercase">
          Appearance
        </div>

        <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.04] divide-y divide-white/[0.06] overflow-hidden">
          {/* Appearance mode */}
          <div className="w-full flex items-center justify-between px-4 py-3.5 text-left">
            <div className="flex items-center gap-3.5">
              <SunMoon className="w-5 h-5 text-white/70" />
              <span className="text-sm font-medium text-white">Appearance</span>
            </div>
            <select
              value={selectedAppearance}
              onChange={(e) => setSelectedAppearance(e.target.value)}
              className="bg-transparent text-xs text-white/60 focus:outline-none cursor-pointer border-none font-medium text-right pr-1"
            >
              <option value="Dark (AMOLED)" className="bg-[#1c1c1e] text-white">
                Dark (AMOLED)
              </option>
              <option value="System (Default)" className="bg-[#1c1c1e] text-white">
                System (Default)
              </option>
            </select>
          </div>

          {/* Accent color */}
          <div className="w-full flex items-center justify-between px-4 py-3.5 text-left">
            <div className="flex items-center gap-3.5">
              <Palette className="w-5 h-5 text-white/70" />
              <span className="text-sm font-medium text-white">Accent color</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1D72FE] inline-block shadow-[0_0_8px_rgba(29,114,254,0.6)]" />
              <select
                value={selectedAccent}
                onChange={(e) => setSelectedAccent(e.target.value)}
                className="bg-transparent text-xs text-white/60 focus:outline-none cursor-pointer border-none font-medium text-right pr-1"
              >
                <option value="Blue" className="bg-[#1c1c1e] text-white">
                  Electric Blue
                </option>
                <option value="Purple" className="bg-[#1c1c1e] text-white">
                  Neon Purple
                </option>
                <option value="Cyan" className="bg-[#1c1c1e] text-white">
                  Cyan Ice
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* GROUP 3: CORE PREFERENCES (Screenshots 2 & 3)                  */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-1.5">
        <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-white/35 uppercase">
          Preferences
        </div>

        <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.04] divide-y divide-white/[0.06] overflow-hidden">
          {/* General */}
          <button
            type="button"
            onClick={() => setActiveSection("general")}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <Sliders className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
              <span className="text-sm font-medium text-white">General</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>

          {/* Notifications */}
          <button
            type="button"
            onClick={() => setActiveSection("notifications")}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <Bell className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
              <span className="text-sm font-medium text-white">Notifications</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>

          {/* Voice */}
          <button
            type="button"
            onClick={() => setActiveSection("voice")}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <Mic className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
              <div>
                <span className="text-sm font-medium text-white block">Voice</span>
                <span className="text-xs text-white/45 block">
                  {settings.voiceName || "Aoede"} ({settings.speakingRate}× speed)
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>

          {/* Language */}
          <button
            type="button"
            onClick={() => setActiveSection("language")}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <Globe className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
              <div>
                <span className="text-sm font-medium text-white block">Language</span>
                <span className="text-xs text-white/45 block">{getLanguageLabel()}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>

          {/* Speech engine */}
          <button
            type="button"
            onClick={() => setActiveSection("speech")}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <Radio className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
              <div>
                <span className="text-sm font-medium text-white block">Speech engine</span>
                <span className="text-xs text-white/45 block">{getEngineLabel()}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* GROUP 4: SYSTEM & SECURITY (Screenshots 2 & 3)                 */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-1.5">
        <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-white/35 uppercase">
          System & Security
        </div>

        <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.04] divide-y divide-white/[0.06] overflow-hidden">
          {/* Safety */}
          <button
            type="button"
            onClick={() => setActiveSection("safety")}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <Shield className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
              <span className="text-sm font-medium text-white">Safety</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>

          {/* Security and login */}
          <button
            type="button"
            onClick={() => setActiveSection("security")}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <Lock className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
              <span className="text-sm font-medium text-white">Security and login</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>

          {/* Android Device Control */}
          <button
            type="button"
            onClick={() => setActiveSection("devicecontrol")}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <Smartphone className="w-5 h-5 text-white/70 group-hover:text-[#38BDF8] transition-colors" />
              <div>
                <span className="text-sm font-medium text-white block">Device Control</span>
                <span className="text-xs text-white/45 block">Android Phone Bridge & Actions</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1D72FE]/20 text-[#38BDF8] font-mono">
                Phase 1
              </span>
              <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
            </div>
          </button>

          {/* Remote control */}
          <button
            type="button"
            onClick={() => setActiveSection("devicecontrol")}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <Tv className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
              <span className="text-sm font-medium text-white">Remote control</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>

          {/* Storage */}
          <button
            type="button"
            onClick={() => setActiveSection("storage")}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <Database className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
              <span className="text-sm font-medium text-white">Storage</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>

          {/* Data controls */}
          <button
            type="button"
            onClick={() => setActiveSection("datacontrols")}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <FileText className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
              <span className="text-sm font-medium text-white">Data controls</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>

          {/* About */}
          <button
            type="button"
            onClick={() => setActiveSection("about")}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <Info className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
              <span className="text-sm font-medium text-white">About Dora</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* GROUP 5: AUTHENTICATED ACCOUNT ACTIONS                        */}
      {/* ------------------------------------------------------------- */}
      {isAuthenticated && (
        <div className="pt-2">
          <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.04] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-red-500/10 active:bg-red-500/20 transition-colors text-left text-red-400 group"
            >
              <div className="flex items-center gap-3.5">
                <LogOut className="w-5 h-5 text-red-400" />
                <span className="text-sm font-medium text-red-400">Log out</span>
              </div>
              <ChevronRight className="w-4 h-4 text-red-400/40 group-hover:text-red-400 transition-colors" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // =========================================================================
  // SUB-VIEW: PERSONALIZATION
  // =========================================================================
  const renderPersonalizationContent = () => (
    <div className="space-y-6 animate-fade-in text-[#E3E3E3]">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">Personalization</h3>
        <p className="text-xs text-white/50 leading-relaxed">
          Provide custom instructions so Dora tailors her personality, tone, and answers to you.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-white/80 block">
          Custom Companion Instructions
        </label>
        <textarea
          rows={5}
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          placeholder="e.g., Talk like a close friend, use casual Banglish, keep answers crisp..."
          className="w-full p-3 rounded-xl bg-[#1c1c1e] border border-white/[0.08] text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#1D72FE]"
        />
      </div>

      <div className="p-3.5 rounded-xl bg-[#1c1c1e] border border-white/[0.06] space-y-2">
        <span className="text-xs font-semibold text-white block">Persona Traits</span>
        <div className="flex flex-wrap gap-2">
          {["Youthful (19-21)", "Bangladeshi Fluency", "Warm & Spontaneous", "Active Memory"].map(
            (trait) => (
              <span
                key={trait}
                className="text-xs px-2.5 py-1 rounded-full bg-[#1D72FE]/15 border border-[#1D72FE]/30 text-[#38BDF8]"
              >
                {trait}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // SUB-VIEW: VOICE & PERSONALITY
  // =========================================================================
  const renderVoiceContent = () => (
    <div className="space-y-6 animate-fade-in text-[#E3E3E3] font-sans select-none">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">Voice & Personality</h3>
        <p className="text-xs sm:text-sm text-white/50 leading-relaxed">
          Select Dora's vocal character and fine-tune natural voice characteristics.
        </p>
      </div>

      {/* Voice Presets List */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/35">
          Preset Profiles
        </div>

        <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.04] divide-y divide-white/[0.06] overflow-hidden">
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
                className={`w-full flex items-start justify-between p-3.5 transition-colors text-left ${
                  isSelected ? "bg-[#0C1938] text-[#38BDF8]" : "hover:bg-white/[0.04] text-white"
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
      <div className="space-y-4 pt-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/35">
          Fine Tuning
        </div>

        <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.04] p-4 space-y-4">
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
              className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[#1D72FE]"
            />
          </div>

          {/* Pitch Slider */}
          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
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
              className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[#1D72FE]"
            />
          </div>
        </div>
      </div>

      {/* Sample Voice Player */}
      <div className="pt-2">
        <button
          type="button"
          onClick={playVoiceSample}
          disabled={isPlayingSample}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-[#1D72FE] hover:bg-[#155FD6] active:scale-[0.99] text-white text-sm font-medium transition-all shadow-[0_0_20px_rgba(29,114,254,0.3)]"
        >
          <Play className={`w-4 h-4 ${isPlayingSample ? "animate-pulse" : ""}`} />
          <span>{isPlayingSample ? "Playing voice sample…" : "Test Voice Output"}</span>
        </button>
      </div>
    </div>
  );

  // =========================================================================
  // SUB-VIEW: SPEECH ENGINE & WAKE WORD
  // =========================================================================
  const renderSpeechContent = () => (
    <div className="space-y-6 animate-fade-in text-[#E3E3E3] font-sans select-none">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">Voice & Wake Word</h3>
        <p className="text-xs sm:text-sm text-white/50 leading-relaxed">
          Configure real-time voice streaming, background wake-word detection, and conversational persistence.
        </p>
      </div>

      {/* Wake Word & Background Service */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/35">
          Always-Available Assistant
        </div>

        <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.04] divide-y divide-white/[0.06] overflow-hidden">
          {/* Wake Word "Dora" Toggle */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5 pr-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white block">Wake Word ("Dora")</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                  On-device
                </span>
              </div>
              <p className="text-xs text-white/45">Say "Dora" to immediately wake up and speak</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.wakeWordEnabled}
                onChange={(e) => onUpdateSettings({ wakeWordEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1D72FE]"></div>
            </label>
          </div>

          {/* Always Run in Background */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5 pr-3">
              <span className="text-sm font-medium text-white block">Background Availability</span>
              <p className="text-xs text-white/45">Keep Dora accessible even when minimized or screen is locked</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.alwaysRunInBackground}
                onChange={(e) => onUpdateSettings({ alwaysRunInBackground: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1D72FE]"></div>
            </label>
          </div>

          {/* Auto-Start Live Session */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5 pr-3">
              <span className="text-sm font-medium text-white block">Auto-Start Live Session</span>
              <p className="text-xs text-white/45">Automatically activate microphone when opening the app</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.liveSessionAutoStart}
                onChange={(e) => onUpdateSettings({ liveSessionAutoStart: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1D72FE]"></div>
            </label>
          </div>

          {/* Follow-up Listening */}
          <div className="p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-3">
                <span className="text-sm font-medium text-white block">Follow-up Listening</span>
                <p className="text-xs text-white/45">Keep listening briefly after answering without repeating wake word</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.followUpListening}
                  onChange={(e) => onUpdateSettings({ followUpListening: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1D72FE]"></div>
              </label>
            </div>

            {settings.followUpListening && (
              <div className="pt-2 border-t border-white/[0.04] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Follow-up Timeout</span>
                  <span className="font-mono text-[#38BDF8]">{settings.followUpTimeoutSeconds || 5}s</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="15"
                  step="1"
                  value={settings.followUpTimeoutSeconds || 5}
                  onChange={(e) => onUpdateSettings({ followUpTimeoutSeconds: parseInt(e.target.value, 10) })}
                  className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[#1D72FE]"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Battery Optimization Request */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/35">
          Android System Integration
        </div>

        <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.04] p-4 space-y-3">
          <div className="space-y-1">
            <span className="text-sm font-medium text-white block">Battery Optimization Exemption</span>
            <p className="text-xs text-white/45 leading-relaxed">
              Allows Dora's background voice service to respond reliably to "Dora" when your screen is locked.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                await androidControlService.requestBatteryOptimizationExemption();
              } catch (err) {
                console.warn("Battery exemption request error:", err);
              }
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.99] text-xs font-medium text-white transition-all text-center border border-white/[0.06]"
          >
            Request Unrestricted Background Execution
          </button>
        </div>
      </div>

      {/* Audio Engine Selection */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/35">
          Audio Streaming Protocol
        </div>

        <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.04] divide-y divide-white/[0.06] overflow-hidden">
          <button
            type="button"
            onClick={() => onUpdateSettings({ engine: "gemini-live" })}
            className={`w-full flex items-center justify-between p-3.5 transition-colors text-left ${
              settings.engine === "gemini-live"
                ? "bg-[#0C1938] text-[#38BDF8]"
                : "hover:bg-white/[0.04] text-white"
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
            className={`w-full flex items-center justify-between p-3.5 transition-colors text-left ${
              settings.engine === "gemini-tts"
                ? "bg-[#0C1938] text-[#38BDF8]"
                : "hover:bg-white/[0.04] text-white"
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
    </div>
  );

  // =========================================================================
  // SUB-VIEW: LANGUAGE & ACCENT
  // =========================================================================
  const renderLanguageContent = () => (
    <div className="space-y-6 animate-fade-in text-[#E3E3E3] font-sans select-none">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">Language & Accent</h3>
        <p className="text-xs sm:text-sm text-white/50 leading-relaxed">
          Configure multilingual voice detection and regional conversational styles.
        </p>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/35">
          Primary Language
        </div>

        <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.04] divide-y divide-white/[0.06] overflow-hidden">
          <button
            type="button"
            onClick={() => onUpdateSettings({ language: "auto" })}
            className={`w-full flex items-center justify-between p-3.5 transition-colors text-left ${
              settings.language === "auto"
                ? "bg-[#0C1938] text-[#38BDF8]"
                : "hover:bg-white/[0.04] text-white"
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
            onClick={() => onUpdateSettings({ language: "bn-en" })}
            className={`w-full flex items-center justify-between p-3.5 transition-colors text-left ${
              settings.language === "bn-en"
                ? "bg-[#0C1938] text-[#38BDF8]"
                : "hover:bg-white/[0.04] text-white"
            }`}
          >
            <div>
              <span className="text-sm font-medium block">Everyday Bangla / Banglish</span>
              <p className="text-xs text-white/45">Natural conversational Bangla & Banglish</p>
            </div>
            {settings.language === "bn-en" && <Check className="w-4 h-4 text-[#38BDF8]" />}
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ language: "en" })}
            className={`w-full flex items-center justify-between p-3.5 transition-colors text-left ${
              settings.language === "en"
                ? "bg-[#0C1938] text-[#38BDF8]"
                : "hover:bg-white/[0.04] text-white"
            }`}
          >
            <div>
              <span className="text-sm font-medium block">English Only</span>
              <p className="text-xs text-white/45">Standard English conversational mode</p>
            </div>
            {settings.language === "en" && <Check className="w-4 h-4 text-[#38BDF8]" />}
          </button>
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // SUB-VIEW: GENERAL PREFERENCES
  // =========================================================================
  const renderGeneralContent = () => (
    <div className="space-y-6 animate-fade-in text-[#E3E3E3]">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">General Preferences</h3>
        <p className="text-xs text-white/50 leading-relaxed">
          Configure ambient effects, auto-sleep, and interaction feedback.
        </p>
      </div>

      <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.04] divide-y divide-white/[0.06] overflow-hidden p-1">
        <div className="flex items-center justify-between p-3.5">
          <div>
            <span className="text-sm font-medium text-white block">Auto-scroll Chat</span>
            <span className="text-xs text-white/45 block">Scroll down as new messages arrive</span>
          </div>
          <div className="w-8 h-4.5 rounded-full bg-[#1D72FE] relative shrink-0 p-0.5 cursor-pointer">
            <div className="w-3.5 h-3.5 rounded-full bg-white translate-x-3.5 transition-transform" />
          </div>
        </div>

        <div className="flex items-center justify-between p-3.5">
          <div>
            <span className="text-sm font-medium text-white block">Cinematic Ambient Glow</span>
            <span className="text-xs text-white/45 block">Atmospheric aura during voice sessions</span>
          </div>
          <div className="w-8 h-4.5 rounded-full bg-[#1D72FE] relative shrink-0 p-0.5 cursor-pointer">
            <div className="w-3.5 h-3.5 rounded-full bg-white translate-x-3.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // SUB-VIEW: NOTIFICATIONS
  // =========================================================================
  const renderNotificationsContent = () => (
    <div className="space-y-6 animate-fade-in text-[#E3E3E3]">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">Notifications</h3>
        <p className="text-xs text-white/50 leading-relaxed">
          Manage companion notifications, proactive check-ins, and audio cues.
        </p>
      </div>

      <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.04] divide-y divide-white/[0.06] overflow-hidden p-1">
        <div className="flex items-center justify-between p-3.5">
          <div>
            <span className="text-sm font-medium text-white block">Proactive Companion Alerts</span>
            <span className="text-xs text-white/45 block">Dora offers timely suggestions</span>
          </div>
          <div className="w-8 h-4.5 rounded-full bg-[#1D72FE] relative shrink-0 p-0.5 cursor-pointer">
            <div className="w-3.5 h-3.5 rounded-full bg-white translate-x-3.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // SUB-VIEW: SAFETY & SECURITY
  // =========================================================================
  const renderSafetyContent = () => (
    <div className="space-y-6 animate-fade-in text-[#E3E3E3]">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">Safety & Privacy</h3>
        <p className="text-xs text-white/50 leading-relaxed">
          Local client sandbox security, camera and microphone authorization policies.
        </p>
      </div>

      <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.04] p-4 space-y-3">
        <div className="flex items-center gap-3 text-emerald-400">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-sm font-medium">Safe Mode & Sandbox Active</span>
        </div>
        <p className="text-xs text-white/50 leading-relaxed">
          All sensory visual and audio frames stay within your secure session and are processed with
          Gemini Live API.
        </p>
      </div>
    </div>
  );

  // =========================================================================
  // SUB-VIEW: STORAGE & DATA CONTROLS
  // =========================================================================
  const renderStorageContent = () => (
    <div className="space-y-6 animate-fade-in text-[#E3E3E3]">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">Storage & Data Controls</h3>
        <p className="text-xs text-white/50 leading-relaxed">
          Manage stored conversations, local indexed caches, and data exports.
        </p>
      </div>

      <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.04] divide-y divide-white/[0.06] overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <span className="text-sm text-white">Local Memory Cache</span>
          <span className="font-mono text-xs text-[#38BDF8]">~1.2 MB</span>
        </div>
        <div className="p-4">
          <button
            type="button"
            onClick={() => {
              try {
                const data = localStorage.getItem("dora_conversation_sessions_v1") || "[]";
                const blob = new Blob([data], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `dora-conversations-${Date.now()}.json`;
                a.click();
              } catch (e) {
                console.error(e);
              }
            }}
            className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-white transition-colors"
          >
            Export All Conversations (JSON)
          </button>
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // SUB-VIEW: ABOUT DORA
  // =========================================================================
  const renderAboutContent = () => (
    <div className="space-y-6 animate-fade-in text-[#E3E3E3] font-sans select-none">
      <div className="flex items-center gap-3">
        <DoraSparkle size={28} />
        <div>
          <h3 className="text-base font-semibold text-white tracking-tight">Dora</h3>
          <span className="text-xs text-white/45">Version 2.4.0 • Gemini 2.0</span>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
        Dora is an adaptive, human-like voice companion built with Gemini Live streaming,
        continuous autonomous memory, and emotional attunement.
      </p>

      <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.04] divide-y divide-white/[0.06] overflow-hidden">
        <div className="flex items-center justify-between p-3.5 text-xs sm:text-sm">
          <span className="text-white/60">Core Intelligence</span>
          <span className="font-mono text-white/90">Gemini 2.0 Flash</span>
        </div>
        <div className="flex items-center justify-between p-3.5 text-xs sm:text-sm">
          <span className="text-white/60">Live Voice Protocol</span>
          <span className="font-mono text-white/90">WebSocket 16kHz PCM</span>
        </div>
        <div className="flex items-center justify-between p-3.5 text-xs sm:text-sm">
          <span className="text-white/60">Audio Latency</span>
          <span className="font-mono text-[#38BDF8]">~180ms</span>
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // SUB-VIEW: DEVICE CONTROL & ANDROID PHONE BRIDGE
  // =========================================================================
  const renderDeviceControlContent = () => (
    <div className="space-y-6 animate-fade-in text-[#E3E3E3]">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">Android Phone Control</h3>
        <p className="text-xs text-white/50 leading-relaxed">
          Allows Dora to autonomously launch applications and interact with your Android companion device.
        </p>
      </div>

      <AndroidControlStatus />

      <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.04] p-4 text-xs text-white/60 space-y-2">
        <h4 className="text-xs font-semibold text-white">Security & Allowlisting</h4>
        <p className="leading-relaxed text-white/50">
          All actions are validated through an allowlisted registry with strictly safe boundaries. Dora does not execute arbitrary shell commands or unsanctioned system scripts.
        </p>
      </div>
    </div>
  );

  // Dispatch current subview
  const renderSubView = () => {
    switch (activeSection) {
      case "personalization":
        return renderPersonalizationContent();
      case "voice":
        return renderVoiceContent();
      case "speech":
        return renderSpeechContent();
      case "language":
        return renderLanguageContent();
      case "general":
        return renderGeneralContent();
      case "notifications":
        return renderNotificationsContent();
      case "safety":
        return renderSafetyContent();
      case "security":
        return renderSafetyContent();
      case "devicecontrol":
        return renderDeviceControlContent();
      case "storage":
      case "datacontrols":
        return renderStorageContent();
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md"
      >
        {/* ================================================================ */}
        {/* SETTINGS CARD MODAL (Unified Clean AMOLED Surface)               */}
        {/* ================================================================ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          className="w-full h-full sm:h-[88vh] sm:max-w-xl bg-black sm:rounded-3xl sm:border sm:border-white/[0.08] flex flex-col text-[#E3E3E3] font-sans select-none overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.95)]"
        >
          {/* Top Header Bar with Back Arrow and Title */}
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-black">
            {activeSection !== "main" ? (
              <button
                type="button"
                onClick={() => setActiveSection("main")}
                className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 flex items-center justify-center text-white transition-all -ml-1"
                aria-label="Back to main settings"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 flex items-center justify-center text-white transition-all -ml-1"
                aria-label="Close settings"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <span className="text-base font-semibold text-white tracking-tight">
              {activeSection === "main" ? "Settings" : activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
            </span>

            <button
              id="btn-close-settings"
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full text-white/50 hover:text-white hover:bg-white/[0.08] flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-black">
            {activeSection === "main" ? renderMainSettingsList() : renderSubView()}
          </div>
        </motion.div>

        {/* Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm p-5 rounded-2xl bg-[#1c1c1e] border border-white/10 shadow-2xl space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white">Log out of Dora?</h4>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">
                  Your conversations and memories are safely stored on this device.
                </p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    onClose();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors shadow-md"
                >
                  Log Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
