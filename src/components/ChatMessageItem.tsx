import React, { useState } from "react";
import Markdown from "react-markdown";
import {
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,
  Share2,
  MoreHorizontal,
  FileText,
  Radio,
  ExternalLink,
  Bookmark,
} from "lucide-react";
import { ChatMessage } from "../types";
import { playNaturalBrowserSpeech } from "../utils/audioUtils";

interface ChatMessageItemProps {
  message: ChatMessage;
  onFeedback?: (messageId: string, type: "like" | "dislike") => void;
  onSaveToLibrary?: (message: ChatMessage) => void;
  onPreviewImage?: (imageUrl: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onFeedback,
  onSaveToLibrary,
  onPreviewImage,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  const isUser = message.sender === "user";

  const handleCopy = () => {
    if (!message.text) return;
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  const handleReadAloud = () => {
    if (typeof window === "undefined" || !message.text) return;

    if (isSpeaking) {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      return;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(true);
      playNaturalBrowserSpeech(message.text, {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share && message.text) {
      try {
        await navigator.share({
          title: "Dora AI Message",
          text: message.text,
        });
        return;
      } catch {
        // Fallback to copy
      }
    }
    handleCopy();
  };

  if (isUser) {
    return (
      <div className="flex justify-end w-full group select-text">
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%] space-y-1.5">
          {/* Attached Image Preview */}
          {message.imageAttachment && (
            <div
              onClick={() => onPreviewImage?.(message.imageAttachment!)}
              className="cursor-pointer overflow-hidden rounded-2xl border border-white/[0.1] bg-black/40 max-w-sm hover:opacity-95 transition-opacity"
            >
              <img
                src={message.imageAttachment}
                alt="Attachment"
                className="max-h-64 sm:max-h-72 w-auto object-cover rounded-2xl"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {/* Attached Document Preview */}
          {message.fileAttachment && (
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/[0.1] border border-white/[0.12] text-sm text-white/90">
              <FileText className="w-4 h-4 text-[#38BDF8] shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="truncate font-medium text-xs sm:text-sm">
                  {message.fileAttachment.name}
                </span>
                {message.fileAttachment.size && (
                  <span className="text-[11px] text-white/60">
                    {(message.fileAttachment.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>
            </div>
          )}

          {/* User Message Text Bubble */}
          {message.text && (
            <div
              className="bg-[#1D72FE] text-white rounded-[20px] rounded-br-[6px] px-4 py-2.5 sm:px-5 sm:py-3 text-[15px] sm:text-base leading-relaxed shadow-sm break-words"
              style={{ wordBreak: "break-word" }}
            >
              {message.inputMode === "voice" && (
                <div className="flex items-center gap-1 mb-1 text-[11px] text-sky-200/90 font-mono">
                  <Radio className="w-3 h-3" />
                  <span>Voice</span>
                </div>
              )}
              <p className="whitespace-pre-wrap">{message.text}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Dora Response (ChatGPT Style: Off-white text directly on black canvas, clean markdown, no heavy bubble)
  return (
    <div className="flex flex-col items-start w-full group select-text text-[#ECECEC]">
      <div className="w-full max-w-full sm:max-w-[90%] space-y-2">
        {/* Streaming Loading Indicator if message is empty */}
        {!message.text && message.isStreaming ? (
          <div className="flex items-center gap-2 py-3 text-white/50">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-bounce [animation-delay:0.4s]" />
          </div>
        ) : (
          <div className="text-[15px] sm:text-[16px] leading-[1.7] space-y-3 prose prose-invert max-w-none text-[#ECECEC]">
            <Markdown
              components={{
                p: ({ children }) => (
                  <p className="whitespace-pre-wrap leading-relaxed text-[#ECECEC] mb-3 last:mb-0">
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-white">{children}</strong>
                ),
                h1: ({ children }) => (
                  <h1 className="text-xl sm:text-2xl font-bold text-white mt-4 mb-2 first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg sm:text-xl font-bold text-white mt-3.5 mb-2 first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base sm:text-lg font-semibold text-white mt-3 mb-1.5 first:mt-0">
                    {children}
                  </h3>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-outside pl-5 space-y-1.5 my-2.5 text-[#ECECEC]">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-outside pl-5 space-y-1.5 my-2.5 text-[#ECECEC]">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed pl-1">{children}</li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-[#1D72FE] pl-3 py-1 my-2 text-white/70 italic">
                    {children}
                  </blockquote>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#38BDF8] hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    <span>{children}</span>
                    <ExternalLink className="w-3 h-3 inline" />
                  </a>
                ),
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || "");
                  const isInline = !match && !String(children).includes("\n");

                  if (isInline) {
                    return (
                      <code
                        className="bg-white/[0.08] text-[#38BDF8] px-1.5 py-0.5 rounded text-[13px] font-mono border border-white/[0.06]"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }

                  const codeString = String(children).replace(/\n$/, "");
                  const language = match ? match[1] : "code";
                  const codeIdx = Math.abs(codeString.length * 31);

                  return (
                    <div className="my-3 rounded-xl overflow-hidden border border-white/[0.08] bg-[#141519] font-mono text-xs sm:text-sm">
                      <div className="flex items-center justify-between px-4 py-1.5 bg-[#1C1D24] text-white/60 text-xs border-b border-white/[0.06]">
                        <span className="font-sans font-medium uppercase tracking-wider text-[11px] text-white/50">
                          {language}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(codeString, codeIdx)}
                          className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
                        >
                          {copiedCodeIndex === codeIdx ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-4 overflow-x-auto text-[#ECECEC] leading-relaxed">
                        <code>{codeString}</code>
                      </div>
                    </div>
                  );
                },
              }}
            >
              {message.text}
            </Markdown>
          </div>
        )}

        {/* Interrupted badge */}
        {message.isInterrupted && (
          <span className="text-xs text-amber-400/80 block font-mono mt-1">
            (Interrupted)
          </span>
        )}

        {/* Compact Action Controls under Dora Response */}
        {message.text && (
          <div className="flex items-center gap-1 pt-1.5 text-white/40 select-none">
            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopy}
              title={copied ? "Copied" : "Copy response"}
              aria-label="Copy response"
              className="p-1.5 rounded-lg hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>

            {/* Read Aloud button */}
            <button
              type="button"
              onClick={handleReadAloud}
              title={isSpeaking ? "Stop reading" : "Read aloud"}
              aria-label={isSpeaking ? "Stop reading" : "Read aloud"}
              className={`p-1.5 rounded-lg hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all ${
                isSpeaking ? "text-[#38BDF8]" : ""
              }`}
            >
              {isSpeaking ? (
                <VolumeX className="w-4 h-4 text-[#38BDF8] animate-pulse" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            {/* Like button */}
            <button
              type="button"
              onClick={() => onFeedback?.(message.id, "like")}
              title="Good response"
              aria-label="Good response"
              className={`p-1.5 rounded-lg hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all ${
                message.feedback === "like" ? "text-[#38BDF8]" : ""
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
            </button>

            {/* Dislike button */}
            <button
              type="button"
              onClick={() => onFeedback?.(message.id, "dislike")}
              title="Bad response"
              aria-label="Bad response"
              className={`p-1.5 rounded-lg hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all ${
                message.feedback === "dislike" ? "text-rose-400" : ""
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
            </button>

            {/* Share button */}
            <button
              type="button"
              onClick={handleShare}
              title="Share response"
              aria-label="Share response"
              className="p-1.5 rounded-lg hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* More menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMoreOpen((prev) => !prev)}
                title="More actions"
                aria-label="More actions"
                className="p-1.5 rounded-lg hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {isMoreOpen && (
                <div
                  className="absolute left-0 bottom-full mb-1 w-44 rounded-xl bg-[#1C1D24] border border-white/[0.1] shadow-2xl p-1 z-30 flex flex-col gap-0.5 text-xs text-white/80"
                  onMouseLeave={() => setIsMoreOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => {
                      handleCopy();
                      setIsMoreOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] text-left"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </button>
                  {onSaveToLibrary && (
                    <button
                      type="button"
                      onClick={() => {
                        onSaveToLibrary(message);
                        setIsMoreOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] text-left"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Save to Library</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
