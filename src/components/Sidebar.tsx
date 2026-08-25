import React, { useState, useRef, useEffect } from "react";
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
  ChevronDown,
  Trash2,
  Edit3,
  MoreVertical,
  Check,
  AlertTriangle,
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
  activeMode?: "chat" | "voice";
  onOpenChat?: () => void;
  onOpenVoice?: () => void;
  onNewChat: () => void;
  onOpenMemory: () => void;
  onOpenSkills: () => void;
  onOpenSettings: () => void;
  messages: ChatMessage[];
  sessions?: ConversationSession[];
  activeSessionId?: string;
  onSelectSession?: (id: string) => void;
  onDeleteSession?: (id: string) => void;
  onRenameSession?: (id: string, newTitle: string) => void;
}

// Utility to format relative timestamps cleanly
function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return "";
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
  messages,
  sessions = [],
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
}) => {
  // State for active context menu on a specific session
  const [activeMenuSessionId, setActiveMenuSessionId] = useState<string | null>(null);
  
  // State for renaming a session
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // State for Delete confirmation dialog
  const [sessionToDelete, setSessionToDelete] = useState<ConversationSession | null>(null);

  // Focus inline edit input when editing begins
  useEffect(() => {
    if (editingSessionId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSessionId]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".session-context-menu-container")) {
        setActiveMenuSessionId(null);
      }
    };
    if (activeMenuSessionId) {
      window.addEventListener("click", handleOutsideClick);
      return () => window.removeEventListener("click", handleOutsideClick);
    }
  }, [activeMenuSessionId]);

  const handleStartRename = (session: ConversationSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuSessionId(null);
    setEditingSessionId(session.id);
    setEditingTitle(session.title || "Conversation");
  };

  const handleSaveRename = (sessionId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editingTitle.trim() && onRenameSession) {
      onRenameSession(sessionId, editingTitle.trim());
    }
    setEditingSessionId(null);
    setEditingTitle("");
  };

  const handleCancelRename = () => {
    setEditingSessionId(null);
    setEditingTitle("");
  };

  const handlePromptDelete = (session: ConversationSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuSessionId(null);
    setSessionToDelete(session);
  };

  const handleConfirmDelete = () => {
    if (sessionToDelete && onDeleteSession) {
      onDeleteSession(sessionToDelete.id);
    }
    setSessionToDelete(null);
  };

  const handleCancelDelete = () => {
    setSessionToDelete(null);
  };

  // Main navigation content matching Dora's pure AMOLED black design
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
          {/* Chat Menu Item (Dedicated Navigation Destination) */}
          <div className="flex flex-col">
            <button
              id="btn-sidebar-chat"
              type="button"
              onClick={() => {
                onOpenChat?.();
                if (isMobileOpen) onMobileClose();
              }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left text-sm group ${
                activeMode === "chat"
                  ? "bg-[#0C1938] text-[#38BDF8] font-medium"
                  : "text-white/80 hover:text-white hover:bg-white/[0.04] active:bg-white/[0.08]"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <MessageSquare
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    activeMode === "chat" ? "text-[#38BDF8]" : "text-white/50 group-hover:text-white"
                  }`}
                />
                <span className="truncate">Chat</span>
              </div>
              {sessions.length > 0 && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-mono transition-colors ${
                    activeMode === "chat"
                      ? "bg-[#1D72FE]/20 text-[#38BDF8]"
                      : "bg-white/[0.06] text-white/40 group-hover:text-white/60"
                  }`}
                >
                  {sessions.length}
                </span>
              )}
            </button>
          </div>

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
        {/* CHAT CONVERSATIONS LIST (Nested within Chat Architecture)    */}
        {/* ============================================================ */}
        <div className="flex-1 min-h-0 flex flex-col pt-1">
          <div className="px-3 pb-1.5 flex items-center justify-between text-[11px] text-white/35 uppercase tracking-wider font-semibold">
            <span>Conversations</span>
            {sessions.length > 0 && (
              <span className="text-[10px] text-white/30 font-normal">
                {sessions.length} saved
              </span>
            )}
          </div>

          <div
            id="sidebar-conversations-scroll"
            className="flex-1 overflow-y-auto custom-scrollbar pr-0.5 space-y-1"
          >
            {sessions.length > 0 ? (
              sessions.map((s) => {
                const isActive = s.id === activeSessionId && activeMode === "chat";
                const isMenuOpen = activeMenuSessionId === s.id;
                const isEditing = editingSessionId === s.id;
                const relativeTime = formatRelativeTime(s.updatedAt || s.createdAt);

                if (isEditing) {
                  return (
                    <form
                      key={s.id}
                      onSubmit={(e) => handleSaveRename(s.id, e)}
                      className="px-2 py-1.5 rounded-xl bg-[#121316] border border-[#1D72FE]/40 flex items-center gap-1.5"
                    >
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") handleCancelRename();
                        }}
                        className="flex-1 bg-transparent px-2 py-1 text-xs text-white placeholder-white/40 focus:outline-none"
                      />
                      <button
                        type="submit"
                        title="Save title"
                        className="p-1 rounded-md text-emerald-400 hover:bg-white/10 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelRename}
                        title="Cancel"
                        className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  );
                }

                return (
                  <div
                    key={s.id}
                    className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all duration-150 ${
                      isActive
                        ? "bg-[#0C1938] text-[#38BDF8] font-medium shadow-[inset_0_0_0_1px_rgba(29,114,254,0.25)]"
                        : "text-white/70 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    {/* Conversation Selection Row Button */}
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSession?.(s.id);
                        if (isMobileOpen) onMobileClose();
                      }}
                      className="flex items-center gap-2.5 flex-1 min-w-0 text-left py-0.5"
                    >
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                          isActive ? "text-[#38BDF8]" : "text-white/40 group-hover:text-white/60"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="truncate block leading-tight text-xs sm:text-sm">
                          {s.title || "Conversation"}
                        </span>
                        {relativeTime && (
                          <span className="text-[10px] text-white/30 block leading-tight pt-0.5">
                            {relativeTime}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* 3-Dot Overflow Context Menu Button (Accessible on Mobile & Desktop) */}
                    <div className="relative session-context-menu-container shrink-0 ml-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuSessionId(isMenuOpen ? null : s.id);
                        }}
                        aria-label="Conversation options"
                        title="More options"
                        className={`p-1.5 rounded-lg transition-all ${
                          isMenuOpen
                            ? "bg-white/15 text-white opacity-100"
                            : "opacity-60 lg:opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-white text-white/50"
                        }`}
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown Popover Menu */}
                      <AnimatePresence>
                        {isMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-0 top-full mt-1 w-36 rounded-xl bg-[#18191E] border border-white/10 shadow-[0_12px_28px_rgba(0,0,0,0.8)] p-1 z-50 flex flex-col gap-0.5 text-xs backdrop-blur-xl"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => handleStartRename(s, e)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors text-left"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-white/50" />
                              <span>Rename</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handlePromptDelete(s, e)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              <span>Delete</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Minimal Premium Empty State */
              <div className="px-3 py-6 text-center space-y-2 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                <p className="text-xs font-medium text-white/70">No conversations yet</p>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  Start a new conversation with Dora.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onNewChat();
                    if (isMobileOpen) onMobileClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-[#38BDF8] transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Start Chat</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* INTELLIGENCE SECTION (Skills & Memory)                       */}
        {/* ============================================================ */}
        <div className="shrink-0 pt-2 border-t border-white/[0.04]">
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
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left text-sm group"
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
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left text-sm group"
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

      {/* ============================================================ */}
      {/* DELETE CONVERSATION CONFIRMATION MODAL / SHEET               */}
      {/* ============================================================ */}
      <AnimatePresence>
        {sessionToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={handleCancelDelete}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-[#16171B] border border-white/10 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] space-y-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0 text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-white tracking-tight">
                    Delete this conversation?
                  </h3>
                  <p className="text-xs text-white/60 leading-relaxed">
                    This action can't be undone. "{sessionToDelete.title || "Conversation"}" will be permanently removed.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-red-500 hover:bg-red-600 active:bg-red-700 text-white transition-all shadow-md shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
