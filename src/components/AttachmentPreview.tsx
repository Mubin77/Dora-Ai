import React from "react";
import { X, FileText, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PendingAttachment } from "../types";

interface AttachmentPreviewProps {
  attachment: PendingAttachment | null;
  onRemove: () => void;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachment,
  onRemove,
}) => {
  if (!attachment) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileExtension = (name: string): string => {
    const ext = name.split(".").pop()?.toUpperCase();
    return ext ? `${ext}` : "FILE";
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={attachment.id}
        initial={{ opacity: 0, scale: 0.96, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="w-full mb-2 px-1 flex items-center justify-start"
      >
        {attachment.isImage ? (
          /* Image Thumbnail Preview */
          <div
            id="attachment-image-preview"
            className="relative inline-flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl bg-[#282A2F] border border-white/10 shadow-md max-w-full"
          >
            {/* Thumbnail */}
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden bg-black/40 border border-white/10 shrink-0 flex items-center justify-center">
              {attachment.previewUrl ? (
                <img
                  src={attachment.previewUrl}
                  alt={attachment.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="w-4 h-4 text-[#38BDF8]" />
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 max-w-[140px] sm:max-w-[200px] flex flex-col justify-center">
              <span className="text-xs font-medium text-white/90 truncate" title={attachment.name}>
                {attachment.name}
              </span>
              <span className="text-[10px] text-white/50">
                {formatFileSize(attachment.size)}
              </span>
            </div>

            {/* Remove [X] Button */}
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove image attachment"
              title="Remove attachment"
              className="ml-1 p-1 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors focus:outline-none"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* Document / Non-Image File Card Preview */
          <div
            id="attachment-file-preview"
            className="relative inline-flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl bg-[#282A2F] border border-white/10 shadow-md max-w-full"
          >
            {/* Document Icon Box */}
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#38BDF8] shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>

            {/* File Info */}
            <div className="min-w-0 max-w-[150px] sm:max-w-[220px] flex flex-col justify-center">
              <span className="text-xs font-medium text-white/90 truncate" title={attachment.name}>
                {attachment.name}
              </span>
              <div className="flex items-center gap-1.5 text-[10px] text-white/50">
                <span className="px-1 py-0.2 rounded bg-white/10 text-[9px] font-mono text-white/80 uppercase">
                  {getFileExtension(attachment.name)}
                </span>
                <span>•</span>
                <span>{formatFileSize(attachment.size)}</span>
              </div>
            </div>

            {/* Remove [X] Button */}
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove file attachment"
              title="Remove attachment"
              className="ml-1 p-1 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors focus:outline-none"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
