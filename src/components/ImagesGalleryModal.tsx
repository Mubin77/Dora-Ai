import React, { useState } from "react";
import { X, Image as ImageIcon, Download, Trash2, Maximize2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ConversationSession } from "../types";

interface ImagesGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ConversationSession[];
}

export const ImagesGalleryModal: React.FC<ImagesGalleryModalProps> = ({
  isOpen,
  onClose,
  sessions,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Collect all images from persistent normal chat sessions
  const allImages: { url: string; timestamp: number; title: string }[] = [];
  sessions.forEach((s) => {
    s.messages.forEach((m) => {
      if (m.imageAttachment) {
        allImages.push({
          url: m.imageAttachment,
          timestamp: m.timestamp,
          title: s.title || "Chat Image",
        });
      }
    });
  });

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
          className="relative w-full max-w-3xl max-h-[85vh] bg-[#121316] border border-white/[0.08] rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#1D72FE]/15 flex items-center justify-center text-[#38BDF8]">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Images</h2>
                <p className="text-xs text-white/50">
                  {allImages.length} {allImages.length === 1 ? "image" : "images"} in your chat gallery
                </p>
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
            {allImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-white/40 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/30">
                  <ImageIcon className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white/70">No images saved yet</p>
                  <p className="text-xs text-white/40 max-w-xs">
                    Images shared or generated in normal chats will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {allImages.map((img, idx) => (
                  <div
                    key={`${img.url.slice(-20)}-${idx}`}
                    onClick={() => setSelectedImage(img.url)}
                    className="group relative aspect-square rounded-2xl overflow-hidden bg-black/60 border border-white/[0.08] cursor-pointer hover:border-[#1D72FE]/50 transition-all shadow-sm"
                  >
                    <img
                      src={img.url}
                      alt={img.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Maximize2 className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Lightbox Fullscreen Preview */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Close Preview"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/[0.08]"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
