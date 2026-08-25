import React from "react";
import {
  X,
  Plus,
  Search,
  Image as ImageIcon,
  LayoutGrid,
  Sparkles,
  Brain,
  Settings,
  MessageSquare,
  ChevronLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DoraSparkle } from "./DoraSparkle";

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
  isDesktopCollapsed: boolean;
  onToggleDesktopCollapse: () => void;
  userName: string;
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
  userName,
  activeMode = "voice",
  onOpenChat,
  onOpenVoice,
  onNewChat,
  onOpenMemory,
  onOpenSkills,
  onOpenSettings,
}) => {
  // Navigation content matching Dora's pure AMOLED black minimal design
  const navContent = (
    <div className="flex flex-col h-full justify-between p-4 text-[#E3E3E3] select-none font-sans relative">
      {/* Top Section */}
      <div className="flex flex-col flex-1 min-h-0 space-y-4">
        {/* Top Header: Brand + Close / Collapse */}
        <div className="flex items-center justify-between px-1 shrink-0">
          <div
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => {
              onOpenVoice?.();
              if (isMobileOpen) onMobileClose();
            }}
            title="Dora Immersive Voice"
          >
            <DoraSparkle size={20} />
            <span className="text-base font-semibold tracking-tight text-white">
              Dora
            </span>
          </div>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close sidebar"
            className="lg:hidden p-2 rounded-full text-white/60 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Desktop collapse button */}
          <button
            type="button"
            onClick={onToggleDesktopCollapse}
            aria-label="Collapse sidebar"
            className="hidden lg:flex p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Compact "New Chat" Action Button */}
        <button
          id="btn-new-chat"
          type="button"
          onClick={() => {
            onNewChat();
            if (isMobileOpen) onMobileClose();
          }}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.99] border border-white/[0.06] hover:border-white/[0.12] text-white transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Plus className="w-4 h-4 text-[#38BDF8] group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium tracking-tight">New chat</span>
          </div>
          <span className="text-[11px] font-mono text-white/30 group-hover:text-white/50">⌘N</span>
        </button>

        {/* ============================================================ */}
        {/* PRIMARY NAVIGATION DESTINATIONS                              */}
        {/* Order: Chat -> Search -> Images -> Library                   */}
        {/* ============================================================ */}
        <nav className="flex flex-col space-y-1 shrink-0 pt-0.5">
          <button
            id="btn-sidebar-chat"
            type="button"
            onClick={() => {
              onOpenChat?.();
              if (isMobileOpen) onMobileClose();
            }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left text-sm group ${
              activeMode === "chat"
                ? "bg-[#0C1938] text-[#38BDF8] font-medium"
                : "text-white/80 hover:text-white hover:bg-white/[0.04] active:bg-white/[0.08]"
            }`}
          >
            <MessageSquare
              className={`w-4 h-4 shrink-0 transition-colors ${
                activeMode === "chat" ? "text-[#38BDF8]" : "text-white/50 group-hover:text-white"
              }`}
            />
            <span className="truncate">Chat</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isMobileOpen) onMobileClose();
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left text-sm font-normal group"
          >
            <Search className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
            <span>Search</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isMobileOpen) onMobileClose();
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left text-sm font-normal group"
          >
            <ImageIcon className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
            <span>Images</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isMobileOpen) onMobileClose();
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left text-sm font-normal group"
          >
            <LayoutGrid className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
            <span>Library</span>
          </button>
        </nav>

        {/* ============================================================ */}
        {/* INTELLIGENCE SECTION (Skills Catalog & Memory Store)         */}
        {/* ============================================================ */}
        <div className="shrink-0 pt-3 border-t border-white/[0.04]">
          <div className="px-3 pb-1.5 text-[11px] text-white/35 uppercase tracking-wider font-semibold">
            Intelligence
          </div>

          <div className="flex flex-col space-y-0.5">
            <button
              type="button"
              onClick={() => {
                onOpenSkills();
                if (isMobileOpen) onMobileClose();
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left text-sm group"
            >
              <Sparkles className="w-4 h-4 text-white/50 group-hover:text-[#38BDF8] transition-colors" />
              <span>Skills Catalog</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenMemory();
                if (isMobileOpen) onMobileClose();
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left text-sm group"
            >
              <Brain className="w-4 h-4 text-white/50 group-hover:text-[#38BDF8] transition-colors" />
              <span>Memory Store</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom User Profile & Settings Footer */}
      <div className="pt-3 mt-2 border-t border-white/[0.04] flex items-center justify-between px-1 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center text-white text-xs font-medium shrink-0">
            {userName ? userName.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="min-w-0">
            <span className="text-sm font-medium text-white/90 truncate block leading-tight">
              {userName || "Abdul Mubin"}
            </span>
            <span className="text-[11px] text-white/40 block leading-tight">
              Gemini Live Connected
            </span>
          </div>
        </div>

        {/* Settings Action Button */}
        <button
          id="btn-sidebar-settings"
          type="button"
          onClick={() => {
            onOpenSettings();
            if (isMobileOpen) onMobileClose();
          }}
          aria-label="Settings"
          title="Settings"
          className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all"
        >
          <Settings className="w-4 h-4" />
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
          className="hidden lg:flex w-64 xl:w-68 shrink-0 h-full bg-[#000000] border-r border-white/[0.04] flex-col z-20 transition-all duration-300"
        >
          {navContent}
        </aside>
      )}

      {/* Mobile Drawer Backdrop & Panel */}
      <AnimatePresence>
        {isMobileOpen && (
          <div
            id="mobile-drawer-backdrop"
            className="fixed inset-0 z-50 lg:hidden bg-black/80 backdrop-blur-sm flex justify-start"
            onClick={onMobileClose}
          >
            <motion.div
              id="mobile-drawer-panel"
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-[84%] max-w-[300px] h-full bg-[#000000] border-r border-white/[0.06] shadow-[20px_0_50px_rgba(0,0,0,0.95)] flex flex-col"
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
