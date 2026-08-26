import React from "react";
import { X, Bookmark, MessageSquare, Clock, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ConversationSession } from "../types";

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ConversationSession[];
  onSelectSession: (id: string) => void;
}

export const LibraryModal: React.FC<LibraryModalProps> = ({
  isOpen,
  onClose,
  sessions,
  onSelectSession,
}) => {
  if (!isOpen) return null;

  const pinnedSessions = sessions.filter((s) => s.isPinned);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl max-h-[85vh] bg-[#121316] border border-white/[0.08] rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#1D72FE]/15 flex items-center justify-center text-[#38BDF8]">
                <Bookmark className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Library</h2>
                <p className="text-xs text-white/50">Your pinned conversations & saved knowledge</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {pinnedSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-white/40 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/30">
                  <Bookmark className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white/70">No saved items yet</p>
                  <p className="text-xs text-white/40 max-w-xs">
                    Pin important chats or save notes to quickly access them in your Library.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {pinnedSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => {
                      onSelectSession(session.id);
                      onClose();
                    }}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[#1D72FE]/15 text-[#38BDF8] flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-white truncate">
                          {session.title || "Untitled Chat"}
                        </span>
                        <span className="text-xs text-white/40 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(session.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
