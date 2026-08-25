import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Edit3,
  MoreVertical,
  Check,
  AlertTriangle,
  Pin,
  Clock,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ConversationSession } from "../types";

interface ConversationHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ConversationSession[];
  activeSessionId?: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onTogglePinSession?: (id: string) => void;
}

// Utility to format human-readable timestamps
function formatSessionDate(timestamp: number): string {
  if (!timestamp) return "";
  const now = new Date();
  const date = new Date(timestamp);
  
  const isToday =
    now.getDate() === date.getDate() &&
    now.getMonth() === date.getMonth() &&
    now.getFullYear() === date.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    yesterday.getDate() === date.getDate() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getFullYear() === date.getFullYear();

  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) {
    return `Today, ${timeStr}`;
  }
  if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  }
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${timeStr}`;
}

export const ConversationHistoryPanel: React.FC<ConversationHistoryPanelProps> = ({
  isOpen,
  onClose,
  sessions = [],
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onTogglePinSession,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuSessionId, setActiveMenuSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [sessionToDelete, setSessionToDelete] = useState<ConversationSession | null>(null);
  
  const editInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus rename input on rename mode
  useEffect(() => {
    if (editingSessionId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSessionId]);

  // Focus search input when panel opens if empty
  useEffect(() => {
    if (isOpen) {
      setActiveMenuSessionId(null);
      setEditingSessionId(null);
    }
  }, [isOpen]);

  // Close context menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".history-item-menu-container")) {
        setActiveMenuSessionId(null);
      }
    };
    if (activeMenuSessionId) {
      window.addEventListener("click", handleOutsideClick);
      return () => window.removeEventListener("click", handleOutsideClick);
    }
  }, [activeMenuSessionId]);

  // Close panel on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (sessionToDelete) {
          setSessionToDelete(null);
        } else if (editingSessionId) {
          setEditingSessionId(null);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, sessionToDelete, editingSessionId, onClose]);

  // Filter and sort sessions (pinned on top, then chronologically by updatedAt/createdAt)
  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((s) => {
        const titleMatch = (s.title || "").toLowerCase().includes(q);
        const messageMatch = (s.messages || []).some((m) =>
          (m.text || "").toLowerCase().includes(q)
        );
        return titleMatch || messageMatch;
      });
    }

    // Sort: pinned first, then newest updated first
    result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const timeA = a.updatedAt || a.createdAt || 0;
      const timeB = b.updatedAt || b.createdAt || 0;
      return timeB - timeA;
    });

    return result;
  }, [sessions, searchQuery]);

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

  const handleTogglePin = (session: ConversationSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuSessionId(null);
    onTogglePinSession?.(session.id);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="conversation-history-backdrop"
          className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Slide-over Drawer (Desktop & Mobile) */}
          <motion.aside
            id="conversation-history-drawer"
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.5 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="w-full sm:w-[380px] md:w-[400px] h-full bg-[#0A0B0E] border-l border-white/[0.08] shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col z-50 text-[#E3E3E3] select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Title, Search, Close */}
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#0C0D10]/80 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#38BDF8]">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                    <span>Conversation History</span>
                    {sessions.length > 0 && (
                      <span className="text-[11px] px-2 py-0.2 rounded-full bg-white/[0.06] text-white/50 font-mono">
                        {sessions.length}
                      </span>
                    )}
                  </h2>
                  <p className="text-[11px] text-white/40">Saved conversations with Dora</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close history panel"
                  className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Actions & Search Bar */}
            <div className="p-3.5 space-y-2.5 border-b border-white/[0.04] bg-[#0A0B0E] shrink-0">
              {/* New Chat Button */}
              <button
                type="button"
                onClick={() => {
                  onNewChat();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.99] border border-white/[0.06] hover:border-white/[0.14] text-white transition-all text-xs font-medium group"
              >
                <Plus className="w-3.5 h-3.5 text-[#38BDF8] group-hover:scale-110 transition-transform" />
                <span>Start New Conversation</span>
              </button>

              {/* Search Filter Input */}
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-3 text-white/40 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] focus:border-[#1D72FE]/60 focus:bg-white/[0.05] text-xs text-white placeholder-white/35 focus:outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 p-1 rounded-full text-white/40 hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Conversation List Scroll Area */}
            <div
              id="conversation-history-list"
              className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5"
            >
              {filteredSessions.length > 0 ? (
                filteredSessions.map((session) => {
                  const isActive = session.id === activeSessionId;
                  const isMenuOpen = activeMenuSessionId === session.id;
                  const isEditing = editingSessionId === session.id;
                  const dateStr = formatSessionDate(session.updatedAt || session.createdAt);

                  // Extract snippet preview from the last message in session
                  const lastMessage =
                    session.messages && session.messages.length > 0
                      ? session.messages[session.messages.length - 1]
                      : null;
                  const previewText = lastMessage
                    ? lastMessage.text.replace(/\s+/g, " ").trim()
                    : "";

                  if (isEditing) {
                    return (
                      <form
                        key={session.id}
                        onSubmit={(e) => handleSaveRename(session.id, e)}
                        className="p-3 rounded-2xl bg-[#141519] border border-[#1D72FE]/60 flex items-center gap-2 shadow-lg"
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
                          className="p-1.5 rounded-lg text-emerald-400 hover:bg-white/10 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelRename}
                          title="Cancel"
                          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    );
                  }

                  return (
                    <div
                      key={session.id}
                      className={`group relative flex items-start justify-between p-3 rounded-2xl border transition-all duration-150 ${
                        isActive
                          ? "bg-[#0C1938] border-[#1D72FE]/40 text-white shadow-[0_4px_20px_rgba(29,114,254,0.12)]"
                          : "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.04] hover:border-white/[0.08] text-white/80"
                      }`}
                    >
                      {/* Main Clickable Conversation Area */}
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSession(session.id);
                          onClose();
                        }}
                        className="flex items-start gap-3 flex-1 min-w-0 text-left py-0.5"
                      >
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isActive
                              ? "bg-[#1D72FE]/25 text-[#38BDF8]"
                              : "bg-white/[0.04] text-white/50 group-hover:text-white group-hover:bg-white/[0.08]"
                          }`}
                        >
                          {session.isPinned ? (
                            <Pin className="w-3.5 h-3.5 text-[#38BDF8] rotate-45" />
                          ) : (
                            <MessageSquare className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-xs sm:text-sm font-medium truncate block ${
                                isActive ? "text-[#38BDF8]" : "text-white/95"
                              }`}
                            >
                              {session.title || "Conversation"}
                            </span>
                          </div>

                          {dateStr && (
                            <span className="text-[10px] text-white/40 block">
                              {dateStr}
                            </span>
                          )}

                          {previewText && (
                            <p className="text-[11px] text-white/50 truncate line-clamp-1 leading-relaxed pt-0.5">
                              {previewText}
                            </p>
                          )}
                        </div>
                      </button>

                      {/* 3-Dot Options Button */}
                      <div className="relative history-item-menu-container shrink-0 ml-1.5 mt-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuSessionId(isMenuOpen ? null : session.id);
                          }}
                          aria-label="Conversation actions"
                          title="More options"
                          className={`p-1.5 rounded-lg transition-all ${
                            isMenuOpen
                              ? "bg-white/15 text-white opacity-100"
                              : "opacity-60 sm:opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-white text-white/50"
                          }`}
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {/* Dropdown Popover */}
                        <AnimatePresence>
                          {isMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -4 }}
                              transition={{ duration: 0.12 }}
                              className="absolute right-0 top-full mt-1 w-36 rounded-xl bg-[#18191E] border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.85)] p-1 z-50 flex flex-col gap-0.5 text-xs backdrop-blur-xl"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {onTogglePinSession && (
                                <button
                                  type="button"
                                  onClick={(e) => handleTogglePin(session, e)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors text-left"
                                >
                                  <Pin className="w-3.5 h-3.5 text-white/50" />
                                  <span>{session.isPinned ? "Unpin" : "Pin to top"}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => handleStartRename(session, e)}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors text-left"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-white/50" />
                                <span>Rename</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handlePromptDelete(session, e)}
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
              ) : searchQuery ? (
                /* Search Empty State */
                <div className="py-12 px-4 text-center space-y-2 rounded-2xl bg-white/[0.02] border border-white/[0.03]">
                  <Search className="w-6 h-6 mx-auto text-white/30" />
                  <p className="text-xs font-medium text-white/70">No matching conversations</p>
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    Try searching with another keyword.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-[#38BDF8] transition-colors mt-1"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                /* Generic Empty State */
                <div className="py-12 px-4 text-center space-y-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.03]">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-white/40">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-white/80">No conversations yet</p>
                  <p className="text-[11px] text-white/40 leading-relaxed max-w-[220px] mx-auto">
                    Start a new conversation with Dora.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onNewChat();
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-[#38BDF8] transition-colors mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Start Chat</span>
                  </button>
                </div>
              )}
            </div>
          </motion.aside>

          {/* ============================================================ */}
          {/* DELETE CONVERSATION CONFIRMATION DIALOG                     */}
          {/* ============================================================ */}
          <AnimatePresence>
            {sessionToDelete && (
              <div
                className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                onClick={() => setSessionToDelete(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  transition={{ duration: 0.15 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm rounded-2xl bg-[#16171B] border border-white/10 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] space-y-4"
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
                      onClick={() => setSessionToDelete(null)}
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
      )}
    </AnimatePresence>
  );
};
