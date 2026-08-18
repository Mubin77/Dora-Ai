/**
 * Dora — Modern Premium AI Assistant
 * Gemini-inspired minimal, spacious, dark mobile and desktop experience.
 * Powered by Gemini Live bidirectional streaming, audio engines, autonomous memory, and screen vision.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ChatMessage,
  ConversationState,
  DoraEmotion,
  DoraMemoryItem,
  VoiceSettings,
  PendingAttachment,
} from "./types";
import { AudioEngine, playNaturalBrowserSpeech } from "./utils/audioUtils";
import { doraService } from "./services/geminiService";
import { VoiceSettingsModal } from "./components/VoiceSettingsModal";
import { ConversationMemoryModal } from "./components/ConversationMemoryModal";
import { SkillsModal } from "./components/SkillsModal";
import { DoraSparkle } from "./components/DoraSparkle";
import { Sidebar } from "./components/Sidebar";
import { Composer } from "./components/Composer";
import { memoryManager } from "./memory/MemoryManager";
import { screenVisionService } from "./services/screenVisionService";
import {
  Menu,
  ChevronDown,
  Sparkles,
  MessageSquare,
  X,
  Monitor,
  Check,
  AlertCircle,
} from "lucide-react";

export default function App() {
  // Conversational State
  const [state, setState] = useState<ConversationState>("idle");
  const [emotion, setEmotion] = useState<DoraEmotion>("warm");
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isScreenVisionActive, setIsScreenVisionActive] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);

  // Messages & Spoken Text
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSpokenText, setCurrentSpokenText] = useState<string>("");
  const [memories, setMemories] = useState<DoraMemoryItem[]>([
    {
      id: "mem-init",
      topic: "Session Atmosphere",
      detail: "Ready for natural, warm, spoken conversational turns with Dora.",
      timestamp: Date.now(),
    },
  ]);

  // Modals & Navigation
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState<boolean>(false);
  const [isSkillsOpen, setIsSkillsOpen] = useState<boolean>(false);
  const [showTranscriptOverlay, setShowTranscriptOverlay] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState<boolean>(false);
  const [screenSharingNotice, setScreenSharingNotice] = useState<string | null>(null);

  // Model Selector Dropdown State
  const [selectedModel, setSelectedModel] = useState<string>("Dora Flash");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);

  // Action Menu, Deep Think Mode & Pending Attachment State
  const [isActionMenuOpen, setIsActionMenuOpen] = useState<boolean>(false);
  const [isDeepThinkActive, setIsDeepThinkActive] = useState<boolean>(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);

  // Text input value & hidden action refs
  const [inputText, setInputText] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);

  // User identity name (from memory or fallback to Mubin)
  const [userName, setUserName] = useState<string>("Abdul Mubin");

  // Sync user name from memory store if present
  useEffect(() => {
    const checkUserName = () => {
      const identityMemories = memoryManager.search({ category: "identity" });
      const nameMem = identityMemories.find(
        (m) =>
          m.key.toLowerCase().includes("name") ||
          m.key.toLowerCase().includes("user")
      );
      if (nameMem && nameMem.value) {
        setUserName(nameMem.value.replace(/^(my name is|user is)\s*/i, "").trim());
      }
    };
    checkUserName();
    const unsub = memoryManager.subscribe(checkUserName);
    return () => unsub();
  }, []);

  // Settings
  const [settings, setSettings] = useState<VoiceSettings>({
    voiceName: "Aoede",
    speakingRate: 0.96,
    pitch: 1.05,
    continuousListening: true,
    pauseThresholdMs: 1300,
    interruptSensitivity: "high",
    language: "auto",
    engine: "gemini-live",
  });

  // Audio Engine & Speech Recognition Refs
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const callTimerRef = useRef<any>(null);
  const isProcessingTurnRef = useRef<boolean>(false);
  const currentDoraMessageIdRef = useRef<string | null>(null);
  const lastUserPromptRef = useRef<string>("");
  const lastHandledMemoryCommandTurnRef = useRef<string>("");
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;
  const isCallActiveRef = useRef<boolean>(isCallActive);
  isCallActiveRef.current = isCallActive;

  // Auto-scroll conversation to bottom
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, currentSpokenText]);

  // Setup Live Stream connection callbacks
  const setupLiveCallbacks = useCallback(() => {
    return {
      onUserTranscript: (userText: string, isFinal: boolean) => {
        const cleanText = userText.trim();
        if (!cleanText) return;

        lastUserPromptRef.current = cleanText;

        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.sender === "user" && lastMsg.id.startsWith("user-live-")) {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMsg,
              text: cleanText,
            };
            return updated;
          }
          if (lastMsg && lastMsg.sender === "user" && lastMsg.text === cleanText) {
            return prev;
          }
          return [
            ...prev,
            {
              id: `user-live-${Date.now()}`,
              sender: "user",
              text: cleanText,
              timestamp: Date.now(),
            },
          ];
        });

        if (isFinal) {
          const memCmd = memoryManager.checkAndHandleMemoryCommand(cleanText);
          if (memCmd.isCommand) {
            lastHandledMemoryCommandTurnRef.current = cleanText;
            console.log("[Dora Live Memory] Explicit memory command saved from voice:", cleanText);
          }
        }
      },
      onAudio: (base64Chunk: string) => {
        if (audioEngineRef.current) {
          audioEngineRef.current.playAudioChunk(base64Chunk, 24000);
          doraService.recordPlaybackStarted();
          setState("speaking");
        }

        if (!currentDoraMessageIdRef.current) {
          const doraMsgId = `dora-${Date.now()}`;
          currentDoraMessageIdRef.current = doraMsgId;
          setMessages((prev) => {
            if (prev.length > 0 && prev[prev.length - 1].sender === "dora" && !prev[prev.length - 1].text) {
              return prev;
            }
            return [
              ...prev,
              {
                id: doraMsgId,
                sender: "dora",
                text: "",
                timestamp: Date.now(),
                emotion: "warm",
              },
            ];
          });
        }
      },
      onTranscript: (chunk: string, isFinal: boolean) => {
        if (chunk) {
          setCurrentSpokenText((prev) => {
            const updated = prev ? prev + " " + chunk : chunk;
            return updated;
          });

          if (!currentDoraMessageIdRef.current) {
            const doraMsgId = `dora-${Date.now()}`;
            currentDoraMessageIdRef.current = doraMsgId;
            setMessages((prev) => [
              ...prev,
              {
                id: doraMsgId,
                sender: "dora",
                text: chunk,
                timestamp: Date.now(),
                emotion: "warm",
              },
            ]);
          } else {
            const activeId = currentDoraMessageIdRef.current;
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === activeId);
              if (idx > -1) {
                const updated = [...prev];
                updated[idx] = {
                  ...updated[idx],
                  text: updated[idx].text ? updated[idx].text + chunk : chunk,
                };
                return updated;
              }
              return prev;
            });
          }

          const lower = chunk.toLowerCase();
          if (lower.includes("haha") || lower.includes("fun") || lower.includes("yay") || lower.includes("cool")) {
            setEmotion("playful");
          } else if (lower.includes("sorry") || lower.includes("understand") || lower.includes("feel") || lower.includes("hear you")) {
            setEmotion("empathetic");
          } else if (lower.includes("wow") || lower.includes("really?") || lower.includes("whoa") || lower.includes("fascinating")) {
            setEmotion("surprised");
          } else if (lower.includes("tell me") || lower.includes("what about") || lower.includes("curious") || lower.includes("how so")) {
            setEmotion("curious");
          } else {
            setEmotion("warm");
          }
        }

        if (isFinal) {
          const activeId = currentDoraMessageIdRef.current;
          let replyText = "";
          if (activeId) {
            const msg = messagesRef.current.find((m) => m.id === activeId);
            if (msg && msg.text) {
              replyText = msg.text;
            }
          }
          const userPrompt = lastUserPromptRef.current;
          if (userPrompt) {
            if (lastHandledMemoryCommandTurnRef.current !== userPrompt) {
              const memCmd = memoryManager.checkAndHandleMemoryCommand(userPrompt);
              if (memCmd.isCommand) {
                lastHandledMemoryCommandTurnRef.current = userPrompt;
              } else {
                memoryManager.processTurnBackground(userPrompt, replyText || "");
              }
            }
          }
          isProcessingTurnRef.current = false;
          currentDoraMessageIdRef.current = null;
        }
      },
      onInterrupted: () => {
        if (audioEngineRef.current) {
          audioEngineRef.current.interruptPlayback();
        }
        setCurrentSpokenText("");
        isProcessingTurnRef.current = false;
        currentDoraMessageIdRef.current = null;
        setState((curr) => (curr === "speaking" ? (isCallActiveRef.current ? "listening" : "idle") : curr));
      },
      onError: (err: any) => {
        console.warn("[Dora Live] Stream notice:", err);
      },
      onReady: () => {
        console.log("[Dora Live] Ready for instant voice and text interactions");
      },
    };
  }, []);

  // Initialize AudioEngine & proactive Live connection on mount
  useEffect(() => {
    const engine = new AudioEngine();
    audioEngineRef.current = engine;

    engine.onVolumeChange = (vol) => {
      setVolumeLevel(vol);
    };

    engine.onPlaybackStarted = () => {
      setState("speaking");
    };

    engine.onPlaybackEnded = () => {
      setCurrentSpokenText("");
      setState(isCallActiveRef.current ? "listening" : "idle");
      isProcessingTurnRef.current = false;
    };

    engine.onSpeechStart = () => {
      if (engine.getIsSpeaking() || state === "speaking") {
        interruptDora();
      }
    };

    engine.onAudioChunk = (pcm16Base64) => {
      if (isCallActiveRef.current && doraService.isLiveReady()) {
        doraService.sendLiveAudioChunk(pcm16Base64);
      }
    };

    const initialMemoryContext = memoryManager.buildContext();
    doraService.connectLiveStream(setupLiveCallbacks(), settings.voiceName, initialMemoryContext);

    return () => {
      screenVisionService.stopCapture();
      doraService.clearScreenFrame();
      engine.stopMicrophone();
      engine.interruptPlayback();
      doraService.disconnectLiveStream();
    };
  }, [setupLiveCallbacks, settings.voiceName]);

  // Sync silence threshold with settings
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setPauseThreshold(settings.pauseThresholdMs);
    }
  }, [settings.pauseThresholdMs]);

  // Call duration timer
  useEffect(() => {
    if (isCallActive) {
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(callTimerRef.current);
      setCallDuration(0);
    }
    return () => clearInterval(callTimerRef.current);
  }, [isCallActive]);

  // Stop / Interrupt Dora playback
  const interruptDora = useCallback(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.interruptPlayback();
    }
    doraService.sendInterruptSignal();
    setCurrentSpokenText("");
    isProcessingTurnRef.current = false;
    currentDoraMessageIdRef.current = null;

    setMessages((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].sender === "dora") {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          isInterrupted: true,
        };
        return updated;
      }
      return prev;
    });

    setState((curr) => (curr === "speaking" ? (isCallActiveRef.current ? "listening" : "idle") : curr));
  }, []);

  // Send message to Dora and stream voice response
  const handleSendMessage = useCallback(
    async (userText: string, imageAttachment?: string) => {
      const cleanText = userText.trim();
      if (!cleanText || isProcessingTurnRef.current) return;

      if (audioEngineRef.current?.getIsSpeaking() || state === "speaking") {
        interruptDora();
      }

      isProcessingTurnRef.current = true;
      lastUserPromptRef.current = cleanText;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: "user",
        text: cleanText,
        timestamp: Date.now(),
      };

      // Explicit memory privacy/query command handler
      const memoryCommand = memoryManager.checkAndHandleMemoryCommand(cleanText);
      if (memoryCommand.isCommand && memoryCommand.replyText) {
        const doraMsgId = `dora-${Date.now()}`;
        const doraMessage: ChatMessage = {
          id: doraMsgId,
          sender: "dora",
          text: memoryCommand.replyText,
          timestamp: Date.now(),
          emotion: "warm",
          reaction: "Memory",
        };

        setMessages((prev) => [...prev, userMessage, doraMessage]);
        setCurrentSpokenText(memoryCommand.replyText);
        setEmotion("warm");

        if (settings.engine === "gemini-tts") {
          doraService
            .generateSpeech(memoryCommand.replyText, settings.voiceName, settings.language)
            .then((audio) => {
              if (audio && audioEngineRef.current) {
                audioEngineRef.current.playAudioChunk(audio, 24000);
                setState("speaking");
              } else {
                playNaturalBrowserSpeech(memoryCommand.replyText!, {
                  rate: settings.speakingRate,
                  pitch: settings.pitch,
                  voiceName: settings.voiceName,
                  onEnd: () => {
                    setCurrentSpokenText("");
                    setState(isCallActiveRef.current ? "listening" : "idle");
                    isProcessingTurnRef.current = false;
                  },
                });
              }
            })
            .catch(() => {
              playNaturalBrowserSpeech(memoryCommand.replyText!, {
                rate: settings.speakingRate,
                pitch: settings.pitch,
                voiceName: settings.voiceName,
                onEnd: () => {
                  setCurrentSpokenText("");
                  setState(isCallActiveRef.current ? "listening" : "idle");
                  isProcessingTurnRef.current = false;
                },
              });
            });
        } else {
          playNaturalBrowserSpeech(memoryCommand.replyText, {
            rate: settings.speakingRate,
            pitch: settings.pitch,
            voiceName: settings.voiceName,
            onEnd: () => {
              setCurrentSpokenText("");
              setState(isCallActiveRef.current ? "listening" : "idle");
              isProcessingTurnRef.current = false;
            },
          });
        }
        return;
      }

      setMessages((prev) => [...prev, userMessage]);
      setState("thinking");

      try {
        const doraMsgId = `dora-${Date.now()}`;
        currentDoraMessageIdRef.current = doraMsgId;

        // Add placeholder message
        setMessages((prev) => [
          ...prev,
          {
            id: doraMsgId,
            sender: "dora",
            text: "",
            timestamp: Date.now(),
            emotion: "warm",
          },
        ]);

        const memoryContext = memoryManager.buildContext(cleanText);
        const response = await doraService.sendMessage(
          cleanText,
          messagesRef.current,
          settings,
          memoryContext,
          imageAttachment,
          isDeepThinkActive
        );

        const replyText = response.reply || "";
        setCurrentSpokenText(replyText);
        setEmotion(response.emotion);

        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === doraMsgId);
          if (idx > -1) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              text: replyText,
              reaction: response.reaction,
            };
            return updated;
          }
          return prev;
        });

        // Memory extraction in background
        memoryManager.processTurnBackground(cleanText, replyText);

        // Natural spoken speech output
        if (replyText) {
          if (settings.engine === "gemini-tts") {
            const audioData = await doraService.generateSpeech(
              replyText,
              settings.voiceName,
              settings.language
            );
            if (audioData && audioEngineRef.current) {
              audioEngineRef.current.playAudioChunk(audioData, 24000);
              setState("speaking");
            } else {
              playNaturalBrowserSpeech(replyText, {
                rate: settings.speakingRate,
                pitch: settings.pitch,
                voiceName: settings.voiceName,
                onEnd: () => {
                  setCurrentSpokenText("");
                  setState(isCallActiveRef.current ? "listening" : "idle");
                  isProcessingTurnRef.current = false;
                },
              });
            }
          } else {
            // High-speed browser neural voice fallback for instant responsiveness
            playNaturalBrowserSpeech(replyText, {
              rate: settings.speakingRate,
              pitch: settings.pitch,
              voiceName: settings.voiceName,
              onEnd: () => {
                setCurrentSpokenText("");
                setState(isCallActiveRef.current ? "listening" : "idle");
                isProcessingTurnRef.current = false;
              },
            });
          }
        } else {
          setState(isCallActiveRef.current ? "listening" : "idle");
          isProcessingTurnRef.current = false;
        }
      } catch (error) {
        console.error("[Dora Error]", error);
        setState(isCallActiveRef.current ? "listening" : "idle");
        isProcessingTurnRef.current = false;
      }
    },
    [interruptDora, settings, state]
  );

  // Toggle Live Conversational Audio Call
  const handleToggleCall = async () => {
    if (isCallActive) {
      if (audioEngineRef.current) {
        audioEngineRef.current.stopMicrophone();
        audioEngineRef.current.interruptPlayback();
      }
      setIsCallActive(false);
      setState("idle");
      setCurrentSpokenText("");
    } else {
      try {
        if (!audioEngineRef.current) {
          audioEngineRef.current = new AudioEngine();
        }
        await audioEngineRef.current.startMicrophone();
        setIsCallActive(true);
        setIsMuted(false);
        setState("listening");

        if (!doraService.isLiveReady()) {
          const context = memoryManager.buildContext();
          doraService.connectLiveStream(setupLiveCallbacks(), settings.voiceName, context);
        }
      } catch (err) {
        console.error("Failed to start voice stream:", err);
      }
    }
  };

  // Submit typed input or pending attachment
  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = inputText.trim();
    const attachmentToSend = pendingAttachment;

    if (!textToSend && !attachmentToSend) return;

    if (attachmentToSend) {
      if (attachmentToSend.isImage && attachmentToSend.base64Data) {
        const fullPrompt = textToSend || "Please analyze and tell me about this image.";
        handleSendMessage(fullPrompt, attachmentToSend.base64Data);
      } else if (attachmentToSend.textContent) {
        const combinedText = textToSend
          ? `${textToSend}\n\n[Attached File: ${attachmentToSend.name}]\n${attachmentToSend.textContent}`
          : `[Attached File: ${attachmentToSend.name}]\n${attachmentToSend.textContent}`;
        handleSendMessage(combinedText);
      } else {
        const message = textToSend || `[Attached File: ${attachmentToSend.name}]`;
        handleSendMessage(message);
      }
      setPendingAttachment(null);
    } else if (textToSend) {
      handleSendMessage(textToSend);
    }

    setInputText("");
  };

  const handleRemoveAttachment = () => {
    setPendingAttachment(null);
  };

  const handleSelectCamera = () => {
    cameraInputRef.current?.click();
  };

  const handleSelectPhotos = () => {
    photoInputRef.current?.click();
  };

  const handleSelectFiles = () => {
    docInputRef.current?.click();
  };

  const handleToggleDeepThink = () => {
    setIsDeepThinkActive((prev) => !prev);
  };

  const handleImageFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      if (base64Data) {
        setPendingAttachment({
          id: `att-${Date.now()}`,
          file,
          name: file.name || "camera-capture.jpg",
          size: file.size,
          type: file.type || "image/jpeg",
          isImage: true,
          previewUrl: base64Data,
          base64Data,
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDocFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isTextFile =
      file.type.startsWith("text/") ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".json") ||
      file.name.endsWith(".csv");

    if (isTextFile) {
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        setPendingAttachment({
          id: `att-${Date.now()}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type || "text/plain",
          isImage: false,
          textContent: content || "",
        });
      };
      reader.readAsText(file);
    } else {
      setPendingAttachment({
        id: `att-${Date.now()}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        isImage: false,
      });
    }
    e.target.value = "";
  };

  const handleToggleScreenVision = async () => {
    if (isScreenVisionActive) {
      screenVisionService.stopCapture();
      setIsScreenVisionActive(false);
      doraService.clearScreenFrame();
    } else {
      setScreenSharingNotice(null);

      if (!screenVisionService.isSupported()) {
        setScreenSharingNotice("Screen sharing isn't supported on this browser yet.");
        setTimeout(() => {
          setScreenSharingNotice((prev) =>
            prev === "Screen sharing isn't supported on this browser yet." ? null : prev
          );
        }, 4000);
        return;
      }

      try {
        const success = await screenVisionService.startCapture({
          onFrame: (base64Jpeg) => {
            doraService.sendScreenFrame(base64Jpeg);
          },
          onStarted: () => {
            setIsScreenVisionActive(true);
            setScreenSharingNotice(null);
          },
          onStopped: () => {
            setIsScreenVisionActive(false);
            doraService.clearScreenFrame();
          },
          onError: (err) => {
            console.warn("[Screen Vision] Capture error:", err);
            setIsScreenVisionActive(false);
            doraService.clearScreenFrame();
            if (err?.message?.toLowerCase().includes("not supported")) {
              setScreenSharingNotice("Screen sharing isn't supported on this browser yet.");
            }
          },
        });

        if (success) {
          setIsScreenVisionActive(true);
        }
      } catch (err) {
        console.warn("[Screen Vision] Initialization error:", err);
        setIsScreenVisionActive(false);
        setScreenSharingNotice("Screen sharing isn't supported on this browser yet.");
      }
    }
  };

  const handleNewChat = () => {
    if (isCallActive) {
      handleToggleCall();
    }
    setMessages([]);
    setCurrentSpokenText("");
    setPendingAttachment(null);
    setInputText("");
  };

  return (
    <div
      id="dora-app-root"
      className="min-h-screen h-[100dvh] dora-dark-bg text-[#E3E3E3] flex flex-row font-sans selection:bg-[#1D72FE]/30 overflow-hidden relative"
    >
      {/* Background Soft Blue Ambient Bottom Glow (Matches reference) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[700px] sm:w-[900px] h-[350px] bg-[#1D72FE]/[0.09] rounded-full blur-[140px]" />
      </div>

      {/* Left Modern AI Sidebar (Desktop & Mobile Drawer) */}
      <Sidebar
        isMobileOpen={isMobileDrawerOpen}
        onMobileClose={() => setIsMobileDrawerOpen(false)}
        isDesktopCollapsed={isDesktopSidebarCollapsed}
        onToggleDesktopCollapse={() => setIsDesktopSidebarCollapsed((prev) => !prev)}
        userName={userName}
        onNewChat={handleNewChat}
        onOpenMemory={() => setIsMemoryOpen(true)}
        onOpenSkills={() => setIsSkillsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        messages={messages}
      />

      {/* Main Content Workspace */}
      <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
        {/* ============================================================ */}
        {/* TOP BAR (Ultra-Minimal Header matching reference)            */}
        {/* ============================================================ */}
        <header
          id="dora-top-bar"
          className="w-full px-4 sm:px-6 py-3 flex items-center justify-between z-30 shrink-0"
        >
          {/* Left: Hamburger Menu & Model Dropdown */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="btn-mobile-menu"
              type="button"
              onClick={() => {
                if (window.innerWidth >= 1024) {
                  setIsDesktopSidebarCollapsed((prev) => !prev);
                } else {
                  setIsMobileDrawerOpen(true);
                }
              }}
              aria-label="Open Navigation"
              className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors flex items-center justify-center shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Model Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsModelDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-white/[0.06] text-white/90 font-medium text-sm sm:text-base tracking-tight transition-colors"
              >
                <span>{selectedModel}</span>
                <ChevronDown className={`w-4 h-4 text-white/50 transition-transform duration-150 ${isModelDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Model Selector Dropdown Popover */}
              {isModelDropdownOpen && (
                <div
                  className="absolute left-0 top-full mt-1.5 w-48 rounded-2xl bg-[#1E1F22] border border-white/10 shadow-2xl p-1.5 z-50 flex flex-col gap-0.5 text-sm"
                  onBlur={() => setIsModelDropdownOpen(false)}
                >
                  <button
                    onClick={() => {
                      setSelectedModel("Dora Flash");
                      setIsModelDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                      selectedModel === "Dora Flash"
                        ? "bg-[#1D72FE]/20 text-[#38BDF8] font-medium"
                        : "text-white/80 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    <span>Dora Flash</span>
                    {selectedModel === "Dora Flash" && <Check className="w-4 h-4 text-[#38BDF8]" />}
                  </button>

                  <button
                    onClick={() => {
                      setSelectedModel("Dora Live");
                      setIsModelDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                      selectedModel === "Dora Live"
                        ? "bg-[#1D72FE]/20 text-[#38BDF8] font-medium"
                        : "text-white/80 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    <span>Dora Live</span>
                    {selectedModel === "Dora Live" && <Check className="w-4 h-4 text-[#38BDF8]" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0" />
        </header>

        {/* Screen Sharing Error / Notice Banner */}
        {screenSharingNotice && (
          <div
            id="screen-sharing-notice"
            role="alert"
            className="mx-auto my-1 px-4 py-1.5 rounded-full bg-[#1E1F22] border border-white/10 flex items-center gap-2 text-xs text-white/90 shadow-lg backdrop-blur-md z-30 animate-fade-in"
          >
            <AlertCircle className="w-4 h-4 text-[#38BDF8] shrink-0" />
            <span>{screenSharingNotice}</span>
            <button
              onClick={() => setScreenSharingNotice(null)}
              className="ml-1 p-0.5 rounded-full text-white/50 hover:text-white"
              aria-label="Dismiss message"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* MAIN STAGE (Spacious Negative Space & Clean Visuals)         */}
        {/* ============================================================ */}
        <main
          id="dora-main-stage"
          className="flex-1 flex flex-col justify-between overflow-y-auto custom-scrollbar relative z-10 w-full"
        >
          {/* Conversation History Transcript Overlay if toggled */}
          {showTranscriptOverlay && (
            <div className="absolute inset-x-4 sm:inset-x-8 top-2 bottom-20 z-40 bg-[#1E1F22]/95 border border-white/10 backdrop-blur-2xl rounded-3xl p-5 shadow-2xl flex flex-col max-w-3xl mx-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#38BDF8]" />
                  <h3 className="text-sm font-semibold text-white">Conversation History</h3>
                </div>
                <button
                  onClick={() => setShowTranscriptOverlay(false)}
                  className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      m.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <span className="text-[10px] text-white/40 mb-0.5">
                      {m.sender === "user" ? userName : "Dora"}
                    </span>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm ${
                        m.sender === "user"
                          ? "bg-[#1D72FE]/20 border border-[#1D72FE]/40 text-white"
                          : "bg-white/[0.04] border border-white/10 text-white/90"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unified Gemini-inspired Center Stage */}
          {messages.length === 0 ? (
            <div className="my-auto flex flex-col items-center justify-center text-center px-4 py-10 max-w-xl mx-auto select-none">
              {/* Centered Dora Sparkle with subtle voice-reactive animations */}
              <div
                className={`mb-6 transition-transform duration-300 ${
                  isCallActive ? "cursor-pointer" : "hover:scale-105"
                }`}
                onClick={isCallActive ? interruptDora : undefined}
                title={isCallActive ? "Tap to interrupt Dora" : undefined}
              >
                <DoraSparkle
                  size={isCallActive ? 60 : 52}
                  state={isCallActive ? state : "idle"}
                  isCallActive={isCallActive}
                  volumeLevel={volumeLevel}
                />
              </div>

              {/* Minimal Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-white mb-2 font-sans">
                Where should we start?
              </h1>

              {/* Subtle Voice Status / Subtitle Indicator when Live Call is Active */}
              {isCallActive && (
                <div className="mt-2 flex flex-col items-center justify-center min-h-[28px] animate-fade-in">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-white/50 font-light tracking-wide">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        state === "speaking"
                          ? "bg-[#38BDF8] animate-ping"
                          : state === "thinking"
                          ? "bg-purple-400 animate-pulse"
                          : "bg-[#1D72FE] animate-pulse"
                      }`}
                    />
                    <span>
                      {state === "speaking"
                        ? "Speaking…"
                        : state === "thinking"
                        ? "Thinking…"
                        : state === "listening"
                        ? "Listening…"
                        : "Ready"}
                    </span>
                  </div>

                  {/* Clean live spoken text subtitle */}
                  {currentSpokenText && (
                    <p className="mt-2 max-w-md text-xs sm:text-sm text-white/80 font-light italic leading-relaxed line-clamp-2">
                      "{currentSpokenText}"
                    </p>
                  )}
                </div>
              )}

              {/* Subtle suggestions / prompt chips */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2 max-w-lg">
                {[
                  "Start voice conversation",
                  "Brainstorm creative ideas",
                  "Analyze an uploaded document",
                  "Help me write clean code",
                ].map((promptText, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (promptText === "Start voice conversation") {
                        handleToggleCall();
                      } else {
                        handleSendMessage(promptText);
                      }
                    }}
                    className="px-3.5 py-2 rounded-full bg-[#1E1F22] hover:bg-[#282A2F] active:bg-[#32343B] border border-white/5 text-xs sm:text-sm text-white/80 hover:text-white transition-all shadow-sm"
                  >
                    {promptText}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Active Conversation Stream */
            <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5 overflow-y-auto custom-scrollbar">
              {/* Subtle Voice Status Pill when Voice Mode is active during chat */}
              {isCallActive && (
                <div className="w-full flex justify-center py-1">
                  <div className="inline-flex items-center gap-2.5 px-3.5 py-1 rounded-full bg-[#1E1F22]/90 border border-white/10 shadow-sm text-xs text-white/80">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        state === "speaking"
                          ? "bg-[#38BDF8] animate-ping"
                          : state === "thinking"
                          ? "bg-purple-400 animate-pulse"
                          : "bg-[#1D72FE] animate-pulse"
                      }`}
                    />
                    <span className="text-[11px] font-normal text-white/70">
                      {state === "speaking"
                        ? "Dora speaking…"
                        : state === "thinking"
                        ? "Thinking…"
                        : "Listening…"}
                    </span>
                    <button
                      onClick={handleToggleCall}
                      className="ml-1 text-[11px] text-red-400 hover:text-red-300 font-medium"
                    >
                      End
                    </button>
                  </div>
                </div>
              )}

              {/* Message List */}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${
                    m.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Dora Sparkle Avatar for AI messages */}
                  {m.sender === "dora" && (
                    <div className="shrink-0 pt-0.5">
                      <DoraSparkle size={24} />
                    </div>
                  )}

                  {/* Message Content Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm sm:text-base leading-relaxed max-w-[85%] ${
                      m.sender === "user"
                        ? "bg-[#1E1F22] text-white/90 border border-white/5"
                        : "bg-transparent text-white/95"
                    }`}
                  >
                    {m.text ? (
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    ) : (
                      <div className="flex items-center gap-1.5 py-1 text-white/50">
                        <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-bounce [animation-delay:0.2s]" />
                        <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-bounce [animation-delay:0.4s]" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* ============================================================ */}
          {/* FLOATING PILL COMPOSER (Positioned at bottom center)         */}
          {/* ============================================================ */}
          <div className="pt-2 pb-4 sm:pb-6 shrink-0 w-full">
            <Composer
              inputText={inputText}
              setInputText={setInputText}
              isDeepThinkActive={isDeepThinkActive}
              onToggleDeepThink={handleToggleDeepThink}
              pendingAttachment={pendingAttachment}
              onRemoveAttachment={handleRemoveAttachment}
              onSubmit={handleInputSubmit}
              isCallActive={isCallActive}
              onToggleCall={handleToggleCall}
              isMuted={isMuted}
              state={state}
              isActionMenuOpen={isActionMenuOpen}
              setIsActionMenuOpen={setIsActionMenuOpen}
              onSelectCamera={handleSelectCamera}
              onSelectPhotos={handleSelectPhotos}
              onSelectFiles={handleSelectFiles}
              isScreenVisionActive={isScreenVisionActive}
              onToggleScreenVision={handleToggleScreenVision}
              cameraInputRef={cameraInputRef}
              photoInputRef={photoInputRef}
              docInputRef={docInputRef}
              handleImageFileSelected={handleImageFileSelected}
              handleDocFileSelected={handleDocFileSelected}
            />
          </div>
        </main>
      </div>

      {/* ============================================================ */}
      {/* MODALS & OVERLAYS                                            */}
      {/* ============================================================ */}
      <VoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) =>
          setSettings((prev) => ({ ...prev, ...newSettings }))
        }
        onOpenMemory={() => {
          setIsSettingsOpen(false);
          setIsMemoryOpen(true);
        }}
      />

      <ConversationMemoryModal
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        memories={memories}
        currentEmotion={emotion}
      />

      <SkillsModal
        isOpen={isSkillsOpen}
        onClose={() => setIsSkillsOpen(false)}
      />
    </div>
  );
}
