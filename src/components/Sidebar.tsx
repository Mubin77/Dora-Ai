import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Search,
  Image as ImageIcon,
  Library as LibraryIcon,
  ChevronLeft,
  Trash2,
  Pencil,
  Pin,
  MoreVertical,
  SquarePen,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DoraLogo } from "./DoraLogo";
import { ConversationSession } from "../types";

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
  isDesktopCollapsed: boolean;
  onToggleDesktopCollapse: () => void;
  sessions: ConversationSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onDeleteSession?: (id: string) => void;
  onRenameSession?: (id: string, newTitle: string) => void;
  onTogglePinSession?: (id: string) => void;
  onNewChat: () => void;
  onOpenImages: () => void;
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
  onOpenVoice?: () => void;
  userName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  onMobileClose,
  isDesktopCollapsed,
  onToggleDesktopCollapse,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onTogglePinSession,
  onNewChat,
  onOpenImages,
  onOpenLibrary,
  onOpenSettings,
  onOpenVoice: _onOpenVoice,
  userName,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [activeMenuSessionId, setActiveMenuSessionId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<ConversationSession | null>(null);

  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Close active 3-dot menu on click outside or Escape
  useEffect(() => {
    if (!activeMenuSessionId) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setActiveMenuSessionId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveMenuSessionId(null);
        setSessionToDelete(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeMenuSessionId]);

  // Filter & prioritize pinned sessions
  const filteredSessions = sessions
    .filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

  const handleStartRename = (session: ConversationSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
    setActiveMenuSessionId(null);
  };

  const handleSaveRename = (sessionId: string) => {
    if (editingTitle.trim() && onRenameSession) {
      onRenameSession(sessionId, editingTitle.trim());
    }
    setEditingSessionId(null);
  };

  // Derive user initials for profile badge (fallback to "MO" like ChatGPT reference or "DO")
  const userInitials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "MO";

  const navContent = (
    <div className="flex flex-col h-full justify-between p-4 sm:p-5 text-[#EDEDED] select-none font-sans relative bg-black">
      {/* Top Container: Header + Main Navigation + Recents */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* ============================================================ */}
        {/* 1. HEADER: Dora Logo + "Dora" (Left) & Search + Close (Right)*/}
        {/* ============================================================ */}
        <div className="flex items-center justify-between px-2 pt-2 pb-5 shrink-0">
          {/* Brand Logo & Name */}
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => {
              onNewChat();
              if (isMobileOpen) onMobileClose();
            }}
            title="Dora"
          >
            <DoraLogo size={28} />
            <span className="text-2xl font-bold tracking-tight text-white">
              Dora
            </span>
          </div>

          {/* Top Right Controls: [Search] [Close/Collapse] */}
          <div className="flex items-center gap-2">
            {/* Circular Search Button */}
            <button
              id="btn-sidebar-search"
              type="button"
              onClick={() => setIsSearchOpen((prev) => !prev)}
              title="Search"
              aria-label="Search"
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-95 ${
                isSearchOpen
                  ? "bg-white/[0.15] text-white"
                  : "bg-[#18181b] text-white/90 hover:text-white hover:bg-[#222226] border border-white/[0.08]"
              }`}
            >
              <Search className="w-5 h-5 stroke-[2]" />
            </button>

            {/* Mobile Close Button */}
            <button
              id="btn-sidebar-close-mobile"
              type="button"
              onClick={onMobileClose}
              aria-label="Close sidebar"
              title="Close sidebar"
              className="lg:hidden w-11 h-11 rounded-full bg-[#18181b] text-white/90 hover:text-white hover:bg-[#222226] border border-white/[0.08] active:scale-95 flex items-center justify-center transition-all shrink-0"
            >
              <X className="w-5 h-5 stroke-[2]" />
            </button>

            {/* Desktop Collapse Button */}
            <button
              id="btn-sidebar-collapse-desktop"
              type="button"
              onClick={onToggleDesktopCollapse}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="hidden lg:flex w-11 h-11 rounded-full bg-[#18181b] text-white/90 hover:text-white hover:bg-[#222226] border border-white/[0.08] active:scale-95 items-center justify-center transition-all shrink-0"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Collapsible Search Input Field */}
        {isSearchOpen && (
          <div className="px-2 mb-4 shrink-0">
            <div className="relative flex items-center w-full">
              <Search className="w-4 h-4 absolute left-3.5 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                autoFocus
                className="w-full bg-[#18181b] border border-white/[0.12] rounded-2xl pl-10 pr-9 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-white/40 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 2. MAIN NAVIGATION: Images & Library Only                     */}
        {/* ============================================================ */}
        <div className="space-y-1.5 px-1 mb-6 shrink-0">
          {/* Images */}
          <button
            id="btn-nav-images"
            type="button"
            onClick={() => {
              onOpenImages();
              if (isMobileOpen) onMobileClose();
            }}
            className="w-full flex items-center gap-4 px-3.5 py-3 rounded-2xl text-[17px] font-medium text-white hover:bg-white/[0.08] transition-colors text-left group"
          >
            <ImageIcon className="w-6 h-6 text-white/90 group-hover:text-white shrink-0 stroke-[2]" />
            <span className="leading-none">Images</span>
          </button>

          {/* Library */}
          <button
            id="btn-nav-library"
            type="button"
            onClick={() => {
              onOpenLibrary();
              if (isMobileOpen) onMobileClose();
            }}
            className="w-full flex items-center gap-4 px-3.5 py-3 rounded-2xl text-[17px] font-medium text-white hover:bg-white/[0.08] transition-colors text-left group"
          >
            <LibraryIcon className="w-6 h-6 text-white/90 group-hover:text-white shrink-0 stroke-[2]" />
            <span className="leading-none">Library</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* 3. RECENT CONVERSATIONS (RECENTS)                             */}
        {/* ============================================================ */}
        <div className="px-4.5 pt-1 pb-2 text-[15px] font-semibold text-white/90 shrink-0">
          Recents
        </div>

        {/* Recents Scrollable List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 px-1 relative">
          {filteredSessions.length === 0 ? (
            <div className="py-12 text-center text-sm text-white/35 font-light">
              {searchQuery ? "No matching conversations" : "No recent conversations"}
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isEditing = editingSessionId === session.id;
              const isMenuOpen = activeMenuSessionId === session.id;

              return (
                <div
                  key={session.id}
                  className={`group relative flex items-center justify-between rounded-xl px-3.5 py-3 text-[16px] transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[#212124] text-white font-normal shadow-xs"
                      : "text-white/85 hover:bg-white/[0.05] hover:text-white"
                  }`}
                  onClick={() => {
                    if (!isEditing) {
                      onSelectSession(session.id);
                      if (isMobileOpen) onMobileClose();
                    }
                  }}
                >
                  {isEditing ? (
                    <div
                      className="flex items-center gap-2 w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(session.id);
                          if (e.key === "Escape") setEditingSessionId(null);
                        }}
                        autoFocus
                        className="flex-1 bg-black border border-[#1D72FE] rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveRename(session.id)}
                        className="text-xs font-medium text-[#38BDF8] hover:bg-[#1D72FE]/20 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                        {session.isPinned && (
                          <Pin className="w-3.5 h-3.5 text-[#38BDF8] shrink-0 fill-[#38BDF8]/20" />
                        )}
                        <span className="truncate leading-normal text-[15px]">
                          {session.title || "Untitled Chat"}
                        </span>
                      </div>

                      {/* 3-Dot Options Button / Reference-Styled Dropdown */}
                      <div
                        ref={isMenuOpen ? menuContainerRef : null}
                        className={`relative shrink-0 transition-opacity ${
                          isActive || isMenuOpen
                            ? "opacity-100"
                            : "opacity-75 sm:opacity-0 group-hover:opacity-100"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuSessionId((prev) =>
                              prev === session.id ? null : session.id
                            )
                          }
                          aria-haspopup="menu"
                          aria-expanded={isMenuOpen}
                          aria-label={`Options for ${session.title || "conversation"}`}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                            isMenuOpen
                              ? "bg-white/[0.15] text-white"
                              : "text-white/60 hover:text-white hover:bg-white/[0.1]"
                          }`}
                          title="Chat options"
                        >
                          <MoreVertical className="w-4 h-4 stroke-[1.8]" />
                        </button>

                        {/* Dropdown Floating Surface matching ChatGPT reference */}
                        <AnimatePresence>
                          {isMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -4 }}
                              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                              className="absolute right-0 top-full mt-1.5 w-48 sm:w-52 rounded-[22px] bg-[#212124] border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-2 z-50 flex flex-col font-sans select-none"
                            >
                              {/* 1. Pin / Unpin Action */}
                              {onTogglePinSession && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onTogglePinSession(session.id);
                                    setActiveMenuSessionId(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] text-white/90 hover:text-white text-left transition-colors group/item"
                                >
                                  <Pin className="w-4.5 h-4.5 stroke-[1.8] text-white/80 group-hover/item:text-white shrink-0" />
                                  <span className="text-[15px] font-medium tracking-tight">
                                    {session.isPinned ? "Unpin" : "Pin"}
                                  </span>
                                </button>
                              )}

                              {/* 2. Rename Action */}
                              {onRenameSession && (
                                <button
                                  type="button"
                                  onClick={(e) => handleStartRename(session, e)}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] text-white/90 hover:text-white text-left transition-colors group/item"
                                >
                                  <Pencil className="w-4.5 h-4.5 stroke-[1.8] text-white/80 group-hover/item:text-white shrink-0" />
                                  <span className="text-[15px] font-medium tracking-tight">
                                    Rename
                                  </span>
                                </button>
                              )}

                              {/* 3. Delete Action (Visual separation + Red text/icon) */}
                              {onDeleteSession && (
                                <div className="mt-1 pt-1 border-t border-white/[0.06]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuSessionId(null);
                                      setSessionToDelete(session);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-500/15 active:bg-rose-500/25 text-rose-400 hover:text-rose-300 text-left transition-colors group/delete"
                                  >
                                    <Trash2 className="w-4.5 h-4.5 stroke-[1.8] text-rose-400 group-hover/delete:text-rose-300 shrink-0" />
                                    <span className="text-[15px] font-medium tracking-tight">
                                      Delete
                                    </span>
                                  </button>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. BOTTOM FOOTER AREA: [Chat Pill Button] [Avatar / Settings] */}
      {/* ============================================================ */}
      <div className="pt-4 pb-2 px-1 flex items-center justify-between gap-3 shrink-0">
        {/* Prominent ChatGPT-style Blue Pill Chat Button */}
        <button
          id="btn-sidebar-new-chat"
          type="button"
          onClick={() => {
            onNewChat();
            if (isMobileOpen) onMobileClose();
          }}
          className="flex-1 max-w-[170px] flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-full bg-[#1D72FE] hover:bg-[#155FD6] active:scale-[0.98] text-white font-medium text-[16px] transition-all shadow-md"
          title="Start a new chat"
        >
          <SquarePen className="w-5 h-5 stroke-[2]" />
          <span>Chat</span>
        </button>

        {/* User Profile / Settings Circular Avatar Button */}
        <button
          id="btn-sidebar-user-settings"
          type="button"
          onClick={() => {
            onOpenSettings();
            if (isMobileOpen) onMobileClose();
          }}
          title="Settings & Preferences"
          aria-label="Settings & Preferences"
          className="w-13 h-13 rounded-full bg-[#8B5CF6]/35 border border-purple-400/40 text-purple-100 font-semibold text-[15px] flex items-center justify-center hover:bg-[#8B5CF6]/50 active:scale-95 transition-all shrink-0"
        >
          {userInitials}
        </button>
      </div>

      {/* ============================================================ */}
      {/* 5. DELETE CONVERSATION CONFIRMATION DIALOG                   */}
      {/* ============================================================ */}
      <AnimatePresence>
        {sessionToDelete && (
          <div
            id="delete-chat-modal-backdrop"
            className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSessionToDelete(null)}
          >
            <motion.div
              id="delete-chat-modal-card"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-dialog-title"
              aria-describedby="delete-dialog-description"
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#212124] border border-white/[0.08] rounded-[26px] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] text-[#EDEDED] font-sans"
            >
              <div className="flex items-center gap-3.5 mb-3">
                <div className="w-11 h-11 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 stroke-[1.8]" />
                </div>
                <h3
                  id="delete-dialog-title"
                  className="text-lg font-semibold text-white tracking-tight"
                >
                  Delete chat?
                </h3>
              </div>

              <p
                id="delete-dialog-description"
                className="text-sm text-white/70 mb-6 leading-relaxed"
              >
                This will permanently delete{" "}
                <span className="text-white font-medium">
                  "{sessionToDelete.title || "Untitled Chat"}"
                </span>{" "}
                from your recent history.
              </p>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSessionToDelete(null)}
                  className="px-4.5 py-2 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteSession) {
                      onDeleteSession(sessionToDelete.id);
                    }
                    setSessionToDelete(null);
                  }}
                  className="px-5 py-2 rounded-full text-sm font-medium bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white active:scale-95 transition-all shadow-sm"
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
      {/* Desktop / Large Screen Sidebar */}
      {!isDesktopCollapsed && (
        <aside
          id="dora-desktop-sidebar"
          className="hidden lg:flex w-72 xl:w-80 shrink-0 h-full bg-black border-r border-white/[0.08] flex-col z-20 transition-all duration-300"
        >
          {navContent}
        </aside>
      )}

      {/* Mobile Drawer Backdrop & Panel */}
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
              className="w-[85%] max-w-[340px] h-full bg-black border-r border-white/[0.08] shadow-[25px_0_60px_rgba(0,0,0,0.95)] flex flex-col"
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
