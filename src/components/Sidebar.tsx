import React, { useState } from "react";
import {
  X,
  Search,
  Image as ImageIcon,
  Bookmark,
  MessageSquare,
  ChevronLeft,
  Trash2,
  Edit2,
  Pin,
  MoreVertical,
  Plus,
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
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [activeMenuSessionId, setActiveMenuSessionId] = useState<string | null>(null);

  // Filter normal chat sessions by search query
  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const navContent = (
    <div className="flex flex-col h-full justify-between p-3.5 text-[#E3E3E3] select-none font-sans relative bg-black">
      {/* Top Section */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Top Header: Brand (Left) + Search & Close (Right) */}
        <div className="flex items-center justify-between px-1 shrink-0 pt-1 mb-3">
          {/* Brand Logo & Name */}
          <div
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => {
              onNewChat();
              if (isMobileOpen) onMobileClose();
            }}
            title="Dora"
          >
            <DoraLogo size={22} />
            <span className="text-lg font-semibold tracking-tight text-white font-display">
              Dora
            </span>
          </div>

          {/* Top Right Controls: [Search] [Close] */}
          <div className="flex items-center gap-1">
            {/* Search Toggle */}
            <button
              id="btn-sidebar-search"
              type="button"
              onClick={() => setIsSearchOpen((prev) => !prev)}
              title="Search chats"
              aria-label="Search chats"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-95 ${
                isSearchOpen
                  ? "bg-[#1D72FE]/20 text-[#38BDF8]"
                  : "text-white/70 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Mobile Close Button */}
            <button
              id="btn-sidebar-close-mobile"
              type="button"
              onClick={onMobileClose}
              aria-label="Close sidebar"
              title="Close sidebar"
              className="lg:hidden w-8 h-8 rounded-full text-white/60 hover:text-white hover:bg-white/[0.08] active:scale-95 flex items-center justify-center transition-all shrink-0"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Desktop Collapse Button */}
            <button
              id="btn-sidebar-collapse-desktop"
              type="button"
              onClick={onToggleDesktopCollapse}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="hidden lg:flex w-8 h-8 rounded-full text-white/60 hover:text-white hover:bg-white/[0.08] active:scale-95 items-center justify-center transition-all shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Search Input */}
        {isSearchOpen && (
          <div className="px-1 mb-2.5">
            <div className="relative flex items-center w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                autoFocus
                className="w-full bg-[#18181b] border border-white/[0.1] rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 text-white/40 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Navigation Items: Images & Library */}
        <div className="space-y-0.5 px-0.5 mb-3 shrink-0">
          <button
            id="btn-nav-images"
            type="button"
            onClick={() => {
              onOpenImages();
              if (isMobileOpen) onMobileClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/80 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <ImageIcon className="w-4 h-4 text-white/70" />
            <span className="font-normal">Images</span>
          </button>

          <button
            id="btn-nav-library"
            type="button"
            onClick={() => {
              onOpenLibrary();
              if (isMobileOpen) onMobileClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/80 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <Bookmark className="w-4 h-4 text-white/70" />
            <span className="font-normal">Library</span>
          </button>
        </div>

        {/* Recents Section Header */}
        <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider uppercase text-white/40">
          Recents
        </div>

        {/* Recents List (Persistent Normal Chats) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5 px-0.5">
          {filteredSessions.length === 0 ? (
            <div className="py-8 text-center text-xs text-white/30">
              {searchQuery ? "No matching chats" : "No recent conversations"}
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isEditing = editingSessionId === session.id;
              const isMenuOpen = activeMenuSessionId === session.id;

              return (
                <div
                  key={session.id}
                  className={`group relative flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors cursor-pointer ${
                    isActive
                      ? "bg-white/[0.1] text-white font-medium"
                      : "text-white/75 hover:bg-white/[0.05] hover:text-white"
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
                      className="flex items-center gap-1.5 w-full"
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
                        className="flex-1 bg-black border border-[#1D72FE] rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveRename(session.id)}
                        className="text-xs text-[#38BDF8] hover:underline"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {session.isPinned && (
                          <Pin className="w-3 h-3 text-[#38BDF8] shrink-0" />
                        )}
                        <span className="truncate text-xs sm:text-[13px] leading-tight">
                          {session.title || "Untitled Chat"}
                        </span>
                      </div>

                      {/* Options Button / Dropdown */}
                      <div
                        className="relative opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuSessionId((prev) =>
                              prev === session.id ? null : session.id
                            )
                          }
                          className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white"
                          title="Chat options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {isMenuOpen && (
                          <div
                            className="absolute right-0 top-full mt-1 w-36 rounded-xl bg-[#1C1D24] border border-white/[0.1] shadow-2xl p-1 z-30 flex flex-col gap-0.5 text-xs text-white/80"
                            onMouseLeave={() => setActiveMenuSessionId(null)}
                          >
                            {onTogglePinSession && (
                              <button
                                onClick={() => {
                                  onTogglePinSession(session.id);
                                  setActiveMenuSessionId(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] text-left"
                              >
                                <Pin className="w-3.5 h-3.5" />
                                <span>{session.isPinned ? "Unpin" : "Pin"}</span>
                              </button>
                            )}

                            {onRenameSession && (
                              <button
                                onClick={(e) => handleStartRename(session, e)}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] text-left"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Rename</span>
                              </button>
                            )}

                            {onDeleteSession && (
                              <button
                                onClick={() => {
                                  onDeleteSession(session.id);
                                  setActiveMenuSessionId(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 text-left"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        )}
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
      {/* BOTTOM SECTION: Neutral Anonymous Profile & Settings Trigger */}
      {/* ============================================================ */}
      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 shrink-0">
        <button
          id="btn-sidebar-user-settings"
          type="button"
          onClick={() => {
            onOpenSettings();
            if (isMobileOpen) onMobileClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white/70 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          <div className="w-7 h-7 rounded-full bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-white/80 font-medium text-xs">
            D
          </div>
          <span className="font-medium text-xs text-white/80 truncate">
            Settings & Preferences
          </span>
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
