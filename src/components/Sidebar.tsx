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
import { ChatMessage } from "../types";

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
}) => {
  // Generate a recent chat label from first user message if exists
  const firstUserMessage = messages.find((m) => m.sender === "user")?.text;
  const recentChatTitle = firstUserMessage
    ? firstUserMessage.length > 28
      ? `${firstUserMessage.slice(0, 28)}...`
      : firstUserMessage
    : null;

  // Navigation Items
  const navContent = (
    <div className="flex flex-col h-full justify-between p-4 text-[#E3E3E3]">
      {/* Top Section */}
      <div className="flex flex-col space-y-4">
        {/* Brand & Close / Collapse Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xl font-medium tracking-tight text-white font-sans">
              Dora
            </span>
          </div>

          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            aria-label="Close sidebar"
            className="lg:hidden p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop collapse button */}
          <button
            onClick={onToggleDesktopCollapse}
            aria-label="Collapse sidebar"
            className="hidden lg:flex p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* + New chat Pill Button */}
        <button
          id="btn-new-chat"
          onClick={() => {
            onNewChat();
            if (isMobileOpen) onMobileClose();
          }}
          className="w-full mt-2 flex items-center gap-3 px-4 py-3 rounded-full bg-[#1E1F22] hover:bg-[#282A2F] active:bg-[#32343B] text-white text-sm font-medium transition-all shadow-sm group"
        >
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white/80 group-hover:text-white">
            <Plus className="w-4 h-4" />
          </div>
          <span>New chat</span>
        </button>

        {/* Primary Menu Items */}
        <nav className="flex flex-col space-y-1 pt-2">
          <button
            onClick={() => {
              if (isMobileOpen) onMobileClose();
            }}
            className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-white/80 hover:text-white hover:bg-white/[0.06] transition-colors text-left text-sm font-normal"
          >
            <Search className="w-4 h-4 text-white/60" />
            <span>Search chats</span>
          </button>

          <button
            onClick={() => {
              if (isMobileOpen) onMobileClose();
            }}
            className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-white/80 hover:text-white hover:bg-white/[0.06] transition-colors text-left text-sm font-normal"
          >
            <ImageIcon className="w-4 h-4 text-white/60" />
            <span>Images</span>
          </button>

          <button
            onClick={() => {
              if (isMobileOpen) onMobileClose();
            }}
            className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-white/80 hover:text-white hover:bg-white/[0.06] transition-colors text-left text-sm font-normal"
          >
            <LayoutGrid className="w-4 h-4 text-white/60" />
            <span>Library</span>
          </button>
        </nav>

        {/* Notebooks & Skills Section */}
        <div className="pt-2">
          <div className="px-3 pb-1.5 flex items-center justify-between text-xs text-white/40 font-medium tracking-wide">
            <span>Skills & Notebooks</span>
          </div>

          <button
            onClick={() => {
              onOpenSkills();
              if (isMobileOpen) onMobileClose();
            }}
            className="w-full flex items-center gap-3.5 px-3 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/[0.06] transition-colors text-left text-sm"
          >
            <Sparkles className="w-4 h-4 text-[#38BDF8]" />
            <span>Skills Catalog</span>
          </button>

          <button
            onClick={() => {
              onOpenMemory();
              if (isMobileOpen) onMobileClose();
            }}
            className="w-full flex items-center gap-3.5 px-3 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/[0.06] transition-colors text-left text-sm"
          >
            <Brain className="w-4 h-4 text-[#C084FC]" />
            <span>Memory Store</span>
          </button>
        </div>

        {/* Recents Section */}
        <div className="pt-2 flex-1">
          <div className="px-3 pb-1.5 text-xs text-white/40 font-medium tracking-wide">
            <span>Recents</span>
          </div>

          {recentChatTitle ? (
            <div className="px-1 py-1">
              <button
                onClick={() => {
                  if (isMobileOpen) onMobileClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.04] text-white text-xs font-normal hover:bg-white/[0.08] transition-colors text-left truncate"
              >
                <MessageSquare className="w-3.5 h-3.5 text-white/50 shrink-0" />
                <span className="truncate">{recentChatTitle}</span>
              </button>
            </div>
          ) : (
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-white/80 mb-0.5">No saved chats</p>
              <p className="text-[11px] text-white/40 leading-relaxed">
                Recent chats will appear here so you can continue them later
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom User Profile / Settings Footer */}
      <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between px-2">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar with initial or graphic */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1D72FE] to-[#38BDF8] flex items-center justify-center text-white text-xs font-semibold shrink-0 shadow-sm">
            {userName ? userName.charAt(0).toUpperCase() : "M"}
          </div>
          <span className="text-xs font-medium text-white/90 truncate">
            {userName || "Abdul Mubin"}
          </span>
        </div>

        {/* Settings Button */}
        <button
          id="btn-sidebar-settings"
          onClick={() => {
            onOpenSettings();
            if (isMobileOpen) onMobileClose();
          }}
          aria-label="Settings"
          title="Settings"
          className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
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
          className="hidden lg:flex w-64 xl:w-68 shrink-0 h-full dora-sidebar-bg border-r border-white/[0.06] flex-col z-20 transition-all duration-300"
        >
          {navContent}
        </aside>
      )}

      {/* Mobile Drawer Backdrop & Panel */}
      <AnimatePresence>
        {isMobileOpen && (
          <div
            id="mobile-drawer-backdrop"
            className="fixed inset-0 z-50 lg:hidden bg-black/70 backdrop-blur-sm flex justify-start"
            onClick={onMobileClose}
          >
            <motion.div
              id="mobile-drawer-panel"
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-[82%] max-w-[300px] h-full dora-sidebar-bg border-r border-white/[0.08] shadow-2xl flex flex-col"
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
