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
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatMessage, ConversationSession } from "../types";
import { DoraSparkle } from "./DoraSparkle";

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
  isDesktopCollapsed: boolean;
  onToggleDesktopCollapse: () => void;
  userName: string;
  onNewChat: () => void;
  onOpenMemory: () => void;
  onOpenSkills: () => void;
  onOpenSettings: () => void;
  messages: ChatMessage[];
  sessions?: ConversationSession[];
  activeSessionId?: string;
  onSelectSession?: (id: string) => void;
  onDeleteSession?: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  onMobileClose,
  isDesktopCollapsed,
  onToggleDesktopCollapse,
  userName,
  onNewChat,
  onOpenMemory,
  onOpenSkills,
  onOpenSettings,
  messages,
  sessions = [],
  activeSessionId,
  onSelectSession,
  onDeleteSession,
}) => {
  // Generate a recent chat label from first user message if exists
  const firstUserMessage = messages.find((m) => m.sender === "user")?.text;
  const currentChatTitle = firstUserMessage
    ? firstUserMessage.length > 30
      ? `${firstUserMessage.slice(0, 30)}...`
      : firstUserMessage
    : null;

  // Refined navigation content with pure AMOLED black and standalone rows
  const navContent = (
    <div className="flex flex-col h-full justify-between p-4 text-[#E3E3E3] select-none font-sans">
      {/* Top Section */}
      <div className="flex flex-col flex-1 min-h-0 space-y-4">
        {/* Top Header: Brand + Close / Collapse */}
        <div className="flex items-center justify-between px-1 shrink-0">
          <div className="flex items-center gap-2.5">
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

        {/* Primary Navigation Rows */}
        <nav className="flex flex-col space-y-0.5 shrink-0 pt-1">
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

        {/* Intelligence Section (Skills & Memory) */}
        <div className="shrink-0 pt-2">
          <div className="px-3 pb-1 text-[11px] text-white/35 uppercase tracking-wider font-semibold">
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

        {/* Recents Section */}
        <div className="flex-1 min-h-0 flex flex-col pt-2">
          <div className="px-3 pb-1 text-[11px] text-white/35 uppercase tracking-wider font-semibold">
            Recents
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-0.5 space-y-0.5">
            {sessions.length > 0 ? (
              sessions.map((s) => {
                const isActive = s.id === activeSessionId;
                return (
                  <div
                    key={s.id}
                    className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${
                      isActive
                        ? "bg-[#0C1938] text-[#38BDF8] font-medium"
                        : "text-white/70 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSession?.(s.id);
                        if (isMobileOpen) onMobileClose();
                      }}
                      className="flex items-center gap-2.5 flex-1 min-w-0 text-left truncate py-0.5"
                    >
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? "text-[#38BDF8]" : "text-white/40 group-hover:text-white/60"
                        }`}
                      />
                      <span className="truncate">{s.title || "Conversation"}</span>
                    </button>

                    {onDeleteSession && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(s.id);
                        }}
                        title="Delete conversation"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-white/40 hover:text-red-400 hover:bg-white/10 active:scale-95 transition-all shrink-0 ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            ) : currentChatTitle ? (
              <button
                type="button"
                onClick={() => {
                  if (isMobileOpen) onMobileClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white/70 text-sm hover:text-white hover:bg-white/[0.04] transition-colors text-left truncate"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                <span className="truncate">{currentChatTitle}</span>
              </button>
            ) : (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-white/40">No saved conversations yet</p>
              </div>
            )}
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
              {userName || "Abdul"}
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
