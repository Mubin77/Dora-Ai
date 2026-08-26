import React from "react";
import {
  X,
  Plus,
  Search,
  Image as ImageIcon,
  Library,
  Folder,
  Clock,
  Sparkles,
  Brain,
  MessageSquare,
  SquarePen,
  ChevronLeft,
  AudioLines,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DoraSparkle } from "./DoraSparkle";
import { UserProfile } from "../types";

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
  isDesktopCollapsed: boolean;
  onToggleDesktopCollapse: () => void;
  user?: UserProfile | null;
  userName?: string;
  activeMode?: "chat" | "voice";
  onOpenChat?: () => void;
  onOpenVoice?: () => void;
  onNewChat: () => void;
  onOpenMemory: () => void;
  onOpenSkills: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  onMobileClose,
  isDesktopCollapsed,
  onToggleDesktopCollapse,
  user = null,
  userName,
  activeMode = "voice",
  onOpenChat,
  onOpenVoice,
  onNewChat,
  onOpenMemory,
  onOpenSkills,
  onOpenSettings,
}) => {
  const isAuthenticated = Boolean(user && user.isAuthenticated);
  const displayName = user?.name || userName || "Anonymous";

  // Sidebar content
  const navContent = (
    <div className="flex flex-col h-full justify-between p-4 pb-6 text-[#E3E3E3] select-none font-sans relative bg-black">
      {/* Top Section */}
      <div className="flex flex-col flex-1 min-h-0 space-y-6">
        {/* Top Header: Brand + Search & New Chat Actions */}
        <div className="flex items-center justify-between px-1 shrink-0 pt-1">
          {/* Brand Logo & Name */}
          <div
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => {
              onOpenVoice?.();
              if (isMobileOpen) onMobileClose();
            }}
            title="Dora — Voice-First AI Companion"
          >
            <DoraSparkle size={22} />
            <span className="text-xl font-semibold tracking-tight text-white font-display">
              Dora
            </span>
          </div>

          {/* Top Right Header Controls */}
          <div className="flex items-center gap-1.5">
            {/* Quick Search Action */}
            <button
              type="button"
              onClick={() => {
                onOpenChat?.();
                if (isMobileOpen) onMobileClose();
              }}
              title="Search conversations"
              aria-label="Search"
              className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 flex items-center justify-center text-white/80 hover:text-white transition-all"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Quick New Chat Button */}
            <button
              id="btn-sidebar-new-chat-top"
              type="button"
              onClick={() => {
                onNewChat();
                if (isMobileOpen) onMobileClose();
              }}
              title="New chat"
              aria-label="New chat"
              className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 flex items-center justify-center text-white/80 hover:text-white transition-all"
            >
              <SquarePen className="w-4 h-4 text-[#38BDF8]" />
            </button>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Close sidebar"
              className="lg:hidden w-8 h-8 rounded-full text-white/60 hover:text-white hover:bg-white/[0.08] active:scale-95 flex items-center justify-center transition-all ml-1"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Desktop collapse button */}
            <button
              type="button"
              onClick={onToggleDesktopCollapse}
              aria-label="Collapse sidebar"
              className="hidden lg:flex w-7 h-7 rounded-full text-white/40 hover:text-white hover:bg-white/[0.08] active:scale-95 items-center justify-center transition-all ml-0.5"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* MAIN NAVIGATION DESTINATIONS (Inspired by Reference Screenshot 1) */}
        {/* Images, Library, Projects, Scheduled, Plugins, Memory        */}
        {/* ============================================================ */}
        <nav className="flex flex-col space-y-2 shrink-0 pt-2">
          <button
            type="button"
            onClick={() => {
              onOpenChat?.();
              if (isMobileOpen) onMobileClose();
            }}
            className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-white/85 hover:text-white hover:bg-white/[0.06] active:bg-white/[0.1] transition-all text-left text-base font-normal group"
          >
            <ImageIcon className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
            <span className="tracking-tight">Images</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenChat?.();
              if (isMobileOpen) onMobileClose();
            }}
            className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-white/85 hover:text-white hover:bg-white/[0.06] active:bg-white/[0.1] transition-all text-left text-base font-normal group"
          >
            <Library className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
            <span className="tracking-tight">Library</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenChat?.();
              if (isMobileOpen) onMobileClose();
            }}
            className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-white/85 hover:text-white hover:bg-white/[0.06] active:bg-white/[0.1] transition-all text-left text-base font-normal group"
          >
            <Folder className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
            <span className="tracking-tight">Projects</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenChat?.();
              if (isMobileOpen) onMobileClose();
            }}
            className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-white/85 hover:text-white hover:bg-white/[0.06] active:bg-white/[0.1] transition-all text-left text-base font-normal group"
          >
            <Clock className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
            <span className="tracking-tight">Scheduled</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenSkills();
              if (isMobileOpen) onMobileClose();
            }}
            className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-white/85 hover:text-white hover:bg-white/[0.06] active:bg-white/[0.1] transition-all text-left text-base font-normal group"
          >
            <Sparkles className="w-5 h-5 text-white/60 group-hover:text-[#38BDF8] transition-colors" />
            <span className="tracking-tight">Plugins & Skills</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenMemory();
              if (isMobileOpen) onMobileClose();
            }}
            className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-white/85 hover:text-white hover:bg-white/[0.06] active:bg-white/[0.1] transition-all text-left text-base font-normal group"
          >
            <Brain className="w-5 h-5 text-white/60 group-hover:text-[#38BDF8] transition-colors" />
            <span className="tracking-tight">Memory Store</span>
          </button>
        </nav>
      </div>

      {/* ============================================================ */}
      {/* BOTTOM ACTION BAR (Matching Reference Screenshot 1)          */}
      {/* [ ✎ Chat ] Capsule Pill + [ MO ] Profile + [ ||| ] Voice Orb */}
      {/* ============================================================ */}
      <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between gap-3 shrink-0">
        {/* Left: Chat Capsule Button */}
        <button
          id="btn-sidebar-chat-pill"
          type="button"
          onClick={() => {
            onOpenChat?.();
            if (isMobileOpen) onMobileClose();
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full font-medium text-sm transition-all shadow-md active:scale-95 ${
            activeMode === "chat"
              ? "bg-[#1D72FE] text-white shadow-[0_0_18px_rgba(29,114,254,0.35)]"
              : "bg-[#1D72FE] hover:bg-[#155FD6] text-white shadow-[0_0_12px_rgba(29,114,254,0.2)]"
          }`}
        >
          <SquarePen className="w-4 h-4 text-white" />
          <span>Chat</span>
        </button>

        {/* Middle: User Profile Trigger (Anonymous Guest Icon) -> Opens Settings & Profile */}
        <button
          id="btn-sidebar-user-avatar"
          type="button"
          onClick={() => {
            onOpenSettings();
            if (isMobileOpen) onMobileClose();
          }}
          aria-label={isAuthenticated ? `${displayName} — Settings` : "Settings & Preferences"}
          title={isAuthenticated ? `${displayName} — Settings` : "Settings & Preferences"}
          className="w-11 h-11 rounded-full bg-[#18181b] hover:bg-[#232328] active:bg-[#2c2c32] border border-white/[0.1] flex items-center justify-center text-white/80 hover:text-white shrink-0 active:scale-95 transition-all shadow-md group"
        >
          {isAuthenticated && user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={displayName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : isAuthenticated && user?.name ? (
            <span className="text-xs font-semibold text-white">
              {user.name
                .trim()
                .split(/\s+/)
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
          ) : (
            <User className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
          )}
        </button>

        {/* Right: Immersive Voice Orb Button */}
        <button
          id="btn-sidebar-immersive-voice"
          type="button"
          onClick={() => {
            onOpenVoice?.();
            if (isMobileOpen) onMobileClose();
          }}
          aria-label="Dora Immersive Voice"
          title="Dora Immersive Voice (Primary Experience)"
          className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 shadow-md ${
            activeMode === "voice"
              ? "bg-[#1D72FE] text-white shadow-[0_0_20px_rgba(29,114,254,0.45)] ring-2 ring-[#38BDF8]/40"
              : "bg-[#0C1938] hover:bg-[#112450] text-[#38BDF8] border border-[#1D72FE]/40"
          }`}
        >
          <AudioLines className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      {!isDesktopCollapsed && (
        <aside
          id="dora-desktop-sidebar"
          className="hidden lg:flex w-64 xl:w-72 shrink-0 h-full bg-black border-r border-white/[0.06] flex-col z-20 transition-all duration-300"
        >
          {navContent}
        </aside>
      )}

      {/* Mobile Drawer Backdrop & Panel (Near full-width overlay drawer per requirement) */}
      <AnimatePresence>
        {isMobileOpen && (
          <div
            id="mobile-drawer-backdrop"
            className="fixed inset-0 z-50 lg:hidden bg-black/80 backdrop-blur-md flex justify-start"
            onClick={onMobileClose}
          >
            <motion.div
              id="mobile-drawer-panel"
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-[85%] max-w-[320px] h-full bg-black border-r border-white/[0.08] shadow-[25px_0_60px_rgba(0,0,0,0.95)] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {navContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

