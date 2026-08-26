import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Menu,
  ChevronDown,
  ChevronLeft,
  Check,
  AlertCircle,
  X,
  MessageSquare,
  Sparkles,
  Mic,
  MicOff,
  Hand,
  Radio,
  Tv,
  Settings,
  History,
  SquarePen,
  MoreVertical,
  Image as ImageIcon,
  Bookmark,
  Trash2,
} from "lucide-react";
import {
  ChatMessage,
  ConversationState,
  DoraEmotion,
  DoraMemoryItem,
  PendingAttachment,
  VoiceSettings,
  ConversationSession,
  UserProfile,
} from "./types";
import { doraService } from "./services/geminiService";
import { AudioEngine, playNaturalBrowserSpeech } from "./utils/audioUtils";
import { SpeechRecognizer } from "./utils/speechRecognizer";
import { memoryManager } from "./memory/MemoryManager";
import { screenVisionService } from "./services/screenVisionService";
import { cameraVisionService } from "./services/cameraVisionService";
import { proactiveCompanionEngine } from "./services/proactiveCompanionEngine";

import { Composer } from "./components/Composer";
import { Sidebar } from "./components/Sidebar";
import { VoiceModeView } from "./components/VoiceModeView";
import { VoiceSettingsModal } from "./components/VoiceSettingsModal";
import { ConversationMemoryModal } from "./components/ConversationMemoryModal";
import { SkillsModal } from "./components/SkillsModal";
import { ConversationHistoryPanel } from "./components/ConversationHistoryPanel";
import { ChatMessageItem } from "./components/ChatMessageItem";
import { ImagesGalleryModal } from "./components/ImagesGalleryModal";
import { LibraryModal } from "./components/LibraryModal";

const SESSIONS_STORAGE_KEY = "dora_conversations_v1";
const ACTIVE_SESSION_KEY = "dora_active_session_id";

export default function App() {
  // -------------------------------------------------------------
  // Interaction Mode ("chat" | "voice") & Unified Conversation State
  // Default is VOICE-FIRST (Immersive Voice is the default home screen)
  // -------------------------------------------------------------
  const [activeMode, setActiveMode] = useState<"chat" | "voice">("voice");
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [state, setState] = useState<ConversationState>("idle");
  const [emotion, setEmotion] = useState<DoraEmotion>("warm");
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [currentSpokenText, setCurrentSpokenText] = useState<string>("");
  const [isScreenVisionActive, setIsScreenVisionActive] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Sessions and Active Conversation Messages
  const [sessions, setSessions] = useState<ConversationSession[]>(() => {
    try {
      const saved = localStorage.getItem(SESSIONS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return `session-${Date.now()}`;
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Active Memory Items
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
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isImagesOpen, setIsImagesOpen] = useState<boolean>(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isTopMoreMenuOpen, setIsTopMoreMenuOpen] = useState<boolean>(false);
  const [showTranscriptOverlay, setShowTranscriptOverlay] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState<boolean>(false);
  const [screenSharingNotice, setScreenSharingNotice] = useState<string | null>(null);

  // Model Selector Dropdown State (Defaults to Dora Live for voice-first experience)
  const [selectedModel, setSelectedModel] = useState<string>("Dora Live");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);

  // Safe navigation helpers between Immersive Voice (home) and Chat
  const navigateToChat = useCallback(() => {
    setActiveMode("chat");
    setSelectedModel("Dora Flash");
    if (typeof window !== "undefined" && window.history.state?.doraMode !== "chat") {
      window.history.pushState({ doraMode: "chat" }, "");
    }
  }, []);

  const navigateToVoice = useCallback(() => {
    setActiveMode("voice");
    setSelectedModel("Dora Live");
    if (typeof window !== "undefined") {
      if (window.history.state?.doraMode === "chat") {
        window.history.back();
      } else {
        window.history.replaceState({ doraMode: "voice" }, "");
      }
    }
  }, []);

  // Sync browser popstate so hardware/browser back buttons return from Chat to Immersive Voice safely
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.history.state || window.history.state.doraMode !== "voice") {
        window.history.replaceState({ doraMode: "voice" }, "");
      }

      const handlePopState = (e: PopStateEvent) => {
        if (e.state?.doraMode === "chat") {
          setActiveMode("chat");
          setSelectedModel("Dora Flash");
        } else {
          setActiveMode("voice");
          setSelectedModel("Dora Live");
        }
      };

      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, []);

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

  // User profile identity (null by default for anonymous/guest session until authentication is added)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [userName, setUserName] = useState<string>("");

  // Settings (Default aligned with authorized youthful reference voice)
  const [settings, setSettings] = useState<VoiceSettings>({
    voiceName: "Aoede",
    speakingRate: 1.0,
    pitch: 1.05,
    continuousListening: true,
    pauseThresholdMs: 1300,
    interruptSensitivity: "high",
    language: "auto",
    engine: "gemini-live",
  });

  // Audio Engine & Turn Tracking Refs
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const speechRecognizerRef = useRef<SpeechRecognizer | null>(null);
  const callTimerRef = useRef<any>(null);
  const isProcessingTurnRef = useRef<boolean>(false);
  const currentUserVoiceMessageIdRef = useRef<string | null>(null);
  const currentDoraMessageIdRef = useRef<string | null>(null);
  const lastUserPromptRef = useRef<string>("");
  const lastHandledMemoryCommandTurnRef = useRef<string>("");
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;
  const isCallActiveRef = useRef<boolean>(isCallActive);
  isCallActiveRef.current = isCallActive;
  const isMutedRef = useRef<boolean>(isMuted);
  isMutedRef.current = isMuted;
  const stateRef = useRef<ConversationState>(state);
  stateRef.current = state;
  const settingsRef = useRef<VoiceSettings>(settings);
  settingsRef.current = settings;
  const handleSendMessageRef = useRef<any>(null);
  const interruptDoraRef = useRef<any>(null);

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

  // Save conversation turns to Session and localStorage whenever messages change (only for explicit Chat conversations)
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
      // Only save to session history if there is direct chat interaction (preserving clean history list)
      const hasChatTurn = messages.some((m) => m.inputMode === "text" || !m.inputMode);
      if (hasChatTurn && messages.length > 0) {
        const firstUserText = messages.find((m) => m.sender === "user")?.text || "New Conversation";
        const title = firstUserText.length > 30 ? `${firstUserText.slice(0, 30)}...` : firstUserText;
        const hasVoice = messages.some((m) => m.inputMode === "voice");

        setSessions((prevSessions) => {
          const existingIdx = prevSessions.findIndex((s) => s.id === activeSessionId);
          let updated: ConversationSession[];
          if (existingIdx > -1) {
            updated = [...prevSessions];
            updated[existingIdx] = {
              ...updated[existingIdx],
              title,
              updatedAt: Date.now(),
              messages,
              hasVoice: hasVoice || updated[existingIdx].hasVoice,
            };
          } else {
            const newSession: ConversationSession = {
              id: activeSessionId,
              title,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              messages,
              hasVoice,
            };
            updated = [newSession, ...prevSessions];
          }
          localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      }
    } catch (e) {
      console.warn("Error saving session:", e);
    }
  }, [messages, activeSessionId]);

  // Auto-scroll conversation to bottom
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, currentSpokenText]);

  // Format recent chat history to provide immediate context when switching Chat -> Voice
  const getRecentHistoryContext = useCallback(() => {
    const recent = messagesRef.current.slice(-10);
    if (recent.length === 0) return "";
    return recent
      .map((m) => `${m.sender === "user" ? "User" : "Dora"}: ${m.text}`)
      .join("\n");
  }, []);

  // Stop / Interrupt Dora playback
  const interruptDora = useCallback(() => {
    proactiveCompanionEngine.onUserSpeechStarted();
    if (audioEngineRef.current) {
      audioEngineRef.current.interruptPlayback();
    }
    doraService.sendInterruptSignal();
    setCurrentSpokenText("");
    isProcessingTurnRef.current = false;

    if (currentDoraMessageIdRef.current) {
      const activeId = currentDoraMessageIdRef.current;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === activeId ? { ...m, isInterrupted: true, isStreaming: false, isFinal: true } : m
        )
      );
      currentDoraMessageIdRef.current = null;
    }

    setState((curr) => (curr === "speaking" ? (isCallActiveRef.current ? "listening" : "idle") : curr));
  }, []);

  // Setup Live Stream connection callbacks (guarantees NO DUPLICATES for speech/responses)
  const setupLiveCallbacks = useCallback(() => {
    return {
      onUserTranscript: (userText: string, isFinal: boolean) => {
        const cleanText = userText.trim();
        if (!cleanText) return;

        proactiveCompanionEngine.onUserSpeechStarted();
        lastUserPromptRef.current = cleanText;

        // Update existing speech bubble or create single streaming message
        setMessages((prev) => {
          const currentId = currentUserVoiceMessageIdRef.current;
          if (currentId) {
            const exists = prev.some((m) => m.id === currentId);
            if (exists) {
              return prev.map((m) =>
                m.id === currentId
                  ? {
                      ...m,
                      text: cleanText,
                      isStreaming: !isFinal,
                      isFinal: isFinal,
                    }
                  : m
              );
            }
          }

          // If no active streaming turn ID, create a new turn
          const newId = `user-voice-${Date.now()}`;
          currentUserVoiceMessageIdRef.current = newId;
          return [
            ...prev,
            {
              id: newId,
              sender: "user",
              text: cleanText,
              timestamp: Date.now(),
              inputMode: "voice",
              isStreaming: !isFinal,
              isFinal: isFinal,
            },
          ];
        });

        if (isFinal) {
          proactiveCompanionEngine.onUserSpeechFinal(cleanText);
          currentUserVoiceMessageIdRef.current = null;
          const memCmd = memoryManager.checkAndHandleMemoryCommand(cleanText);
          if (memCmd.isCommand) {
            lastHandledMemoryCommandTurnRef.current = cleanText;
            console.log("[Dora Live Memory] Explicit memory command saved from voice:", cleanText);
          }
        }
      },

      onAudio: (base64Chunk: string) => {
        console.log(`[VOICE DEBUG] Frontend onAudio received chunk: ${base64Chunk.length} base64 chars`);
        proactiveCompanionEngine.onDoraSpeechStarted();
        if (audioEngineRef.current) {
          audioEngineRef.current.playAudioChunk(base64Chunk, 24000);
          doraService.recordPlaybackStarted();
          setState("speaking");
        }

        if (!currentDoraMessageIdRef.current) {
          const doraMsgId = `dora-voice-${Date.now()}`;
          currentDoraMessageIdRef.current = doraMsgId;
          setMessages((prev) => [
            ...prev,
            {
              id: doraMsgId,
              sender: "dora",
              text: "",
              timestamp: Date.now(),
              emotion: "warm",
              inputMode: "voice",
              isStreaming: true,
              isFinal: false,
            },
          ]);
        }
      },

      onTranscript: (chunk: string, isFinal: boolean) => {
        if (chunk) {
          console.log(`[VOICE DEBUG] Frontend onTranscript chunk: "${chunk}" (isFinal: ${isFinal})`);
          setCurrentSpokenText((prev) => {
            const updated = prev ? prev + " " + chunk : chunk;
            return updated;
          });

          if (!currentDoraMessageIdRef.current) {
            const doraMsgId = `dora-voice-${Date.now()}`;
            currentDoraMessageIdRef.current = doraMsgId;
            setMessages((prev) => [
              ...prev,
              {
                id: doraMsgId,
                sender: "dora",
                text: chunk,
                timestamp: Date.now(),
                emotion: "warm",
                inputMode: "voice",
                isStreaming: !isFinal,
                isFinal: false,
              },
            ]);
          } else {
            const activeId = currentDoraMessageIdRef.current;
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id === activeId) {
                  return {
                    ...m,
                    text: m.text ? `${m.text} ${chunk}` : chunk,
                    isStreaming: !isFinal,
                    isFinal: isFinal,
                  };
                }
                return m;
              })
            );
          }

          // Emotion tone tracking
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
            setMessages((prev) =>
              prev.map((m) => (m.id === activeId ? { ...m, isStreaming: false, isFinal: true } : m))
            );
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
          proactiveCompanionEngine.onDoraSpeechEnded();
        }
      },

      onTurnComplete: () => {
        if (audioEngineRef.current) {
          audioEngineRef.current.markStreamComplete();
        }
      },

      onInterrupted: () => {
        proactiveCompanionEngine.onUserSpeechStarted();
        if (audioEngineRef.current) {
          audioEngineRef.current.interruptPlayback();
        }
        setCurrentSpokenText("");
        isProcessingTurnRef.current = false;
        if (currentDoraMessageIdRef.current) {
          const activeId = currentDoraMessageIdRef.current;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === activeId ? { ...m, isInterrupted: true, isStreaming: false, isFinal: true } : m
            )
          );
          currentDoraMessageIdRef.current = null;
        }
        currentUserVoiceMessageIdRef.current = null;
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

  // Initialize AudioEngine & SpeechRecognizer ONCE on mount
  useEffect(() => {
    const engine = new AudioEngine();
    audioEngineRef.current = engine;

    engine.onVolumeChange = (vol) => {
      setVolumeLevel(vol);
    };

    engine.onPlaybackStarted = () => {
      proactiveCompanionEngine.onDoraSpeechStarted();
      setState("speaking");
    };

    engine.onPlaybackEnded = () => {
      proactiveCompanionEngine.onDoraSpeechEnded();
      setCurrentSpokenText("");
      setState(isCallActiveRef.current ? "listening" : "idle");
      isProcessingTurnRef.current = false;
      if (isCallActiveRef.current && !isMutedRef.current) {
        speechRecognizerRef.current?.resumeAfterPlayback();
      }
    };

    engine.onSpeechStart = () => {
      proactiveCompanionEngine.onUserSpeechStarted();
      if (engine.getIsSpeaking() || stateRef.current === "speaking") {
        interruptDoraRef.current?.();
      }
    };

    engine.onAudioChunk = (pcm16Base64) => {
      if (isCallActiveRef.current && doraService.isLiveReady()) {
        doraService.sendLiveAudioChunk(pcm16Base64);
      }
    };

    // Initialize continuous browser speech recognition
    const recognizer = new SpeechRecognizer({
      language: settingsRef.current.language,
      pauseThresholdMs: settingsRef.current.pauseThresholdMs,
      onSpeechStart: () => {
        proactiveCompanionEngine.onUserSpeechStarted();
        if (engine.getIsSpeaking() || stateRef.current === "speaking") {
          interruptDoraRef.current?.();
        }
        setState("listening");
      },
      onInterimResult: (interimText) => {
        const cleanText = interimText.trim();
        if (!cleanText) return;
        proactiveCompanionEngine.onUserSpeechStarted();
        lastUserPromptRef.current = cleanText;

        setMessages((prev) => {
          const currentId = currentUserVoiceMessageIdRef.current;
          if (currentId && prev.some((m) => m.id === currentId)) {
            return prev.map((m) =>
              m.id === currentId
                ? { ...m, text: cleanText, isStreaming: true, isFinal: false }
                : m
            );
          }
          const newId = `user-voice-${Date.now()}`;
          currentUserVoiceMessageIdRef.current = newId;
          return [
            ...prev,
            {
              id: newId,
              sender: "user",
              text: cleanText,
              timestamp: Date.now(),
              inputMode: "voice",
              isStreaming: true,
              isFinal: false,
            },
          ];
        });
      },
      onFinalResult: (finalText) => {
        const cleanText = finalText.trim();
        if (!cleanText) return;

        const currentId = currentUserVoiceMessageIdRef.current;
        if (currentId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === currentId
                ? { ...m, text: cleanText, isStreaming: false, isFinal: true }
                : m
            )
          );
        }
        currentUserVoiceMessageIdRef.current = null;

        recognizer.pauseForPlayback();
        setState("thinking");

        // Transcribed voice message is passed straight into Dora's turn pipeline
        handleSendMessageRef.current?.(cleanText, undefined, true);
      },
      onError: (err) => {
        if (err.isPermissionDenied) {
          setScreenSharingNotice("Microphone permission was denied. Please allow microphone access to talk with Dora.");
          setIsCallActive(false);
          setState("error");
          setTimeout(() => {
            setState((curr) => (curr === "error" ? "idle" : curr));
            setScreenSharingNotice((prev) =>
              prev?.includes("Microphone") ? null : prev
            );
          }, 5000);
        }
      },
    });

    speechRecognizerRef.current = recognizer;

    return () => {
      screenVisionService.stopCapture();
      doraService.clearScreenFrame();
      recognizer.stop();
      engine.stopMicrophone();
      engine.interruptPlayback();
      doraService.disconnectLiveStream();
    };
  }, []);

  // Sync silence threshold and language with settings
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setPauseThreshold(settings.pauseThresholdMs);
    }
    if (speechRecognizerRef.current) {
      speechRecognizerRef.current.setOptions({
        language: settings.language,
        pauseThresholdMs: settings.pauseThresholdMs,
      });
    }
  }, [settings.pauseThresholdMs, settings.language]);

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

  // Send message to Dora (unified: works identically in Chat and Voice modes)
  const handleSendMessage = useCallback(
    async (
      userText: string,
      imageAttachment?: string,
      isVoiceTurn: boolean = false,
      fileAttachment?: { name: string; size?: number; type?: string; textContent?: string }
    ) => {
      const cleanText = userText.trim();
      if (!cleanText && !imageAttachment && !fileAttachment) return;
      if (isProcessingTurnRef.current) return;

      console.log(`[VOICE DEBUG] submitting transcript: "${cleanText}" (isVoiceTurn: ${isVoiceTurn}, isCallActive: ${isCallActiveRef.current}, liveReady: ${doraService.isLiveReady()})`);

      if (audioEngineRef.current?.getIsSpeaking() || state === "speaking") {
        interruptDora();
      }

      proactiveCompanionEngine.onUserSpeechFinal(cleanText);
      isProcessingTurnRef.current = true;
      lastUserPromptRef.current = cleanText;

      const shouldSpeakReply = isVoiceTurn || isCallActiveRef.current || settings.engine === "gemini-tts";
      const inputMode = isVoiceTurn || isCallActiveRef.current ? "voice" : "text";

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: "user",
        text: cleanText,
        timestamp: Date.now(),
        inputMode,
        imageAttachment,
        fileAttachment,
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
          inputMode,
        };

        setMessages((prev) => [...prev, userMessage, doraMessage]);
        setCurrentSpokenText(memoryCommand.replyText);
        setEmotion("warm");

        if (shouldSpeakReply) {
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
                    if (isCallActiveRef.current && !isMuted) {
                      speechRecognizerRef.current?.resumeAfterPlayback();
                    }
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
                  if (isCallActiveRef.current && !isMuted) {
                    speechRecognizerRef.current?.resumeAfterPlayback();
                  }
                },
              });
            });
        } else {
          isProcessingTurnRef.current = false;
          setState("idle");
        }
        return;
      }

      setMessages((prev) => [...prev, userMessage]);
      setState("thinking");

      // If in Voice Mode, route message directly to Gemini Live session for real-time streaming audio response
      if (isCallActiveRef.current && !imageAttachment) {
        const memoryContext = memoryManager.buildContext(cleanText);
        doraService.sendLiveText(cleanText, settings.language, memoryContext, isDeepThinkActive);
        return;
      }

      // REST Turn (and fallback with spoken voice if in Voice Mode)
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
            inputMode,
            isStreaming: true,
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

        setMessages((prev) =>
          prev.map((m) =>
            m.id === doraMsgId
              ? {
                  ...m,
                  text: replyText,
                  reaction: response.reaction,
                  isStreaming: false,
                  isFinal: true,
                }
              : m
          )
        );

        // Memory extraction in background
        memoryManager.processTurnBackground(cleanText, replyText);

        // Spoken speech output if in Voice Mode or gemini-tts enabled
        if (replyText && shouldSpeakReply) {
          try {
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
                  if (isCallActiveRef.current && !isMuted) {
                    speechRecognizerRef.current?.resumeAfterPlayback();
                  }
                },
              });
            }
          } catch {
            playNaturalBrowserSpeech(replyText, {
              rate: settings.speakingRate,
              pitch: settings.pitch,
              voiceName: settings.voiceName,
              onEnd: () => {
                setCurrentSpokenText("");
                setState(isCallActiveRef.current ? "listening" : "idle");
                isProcessingTurnRef.current = false;
                if (isCallActiveRef.current && !isMuted) {
                  speechRecognizerRef.current?.resumeAfterPlayback();
                }
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
        if (isCallActiveRef.current && !isMuted) {
          speechRecognizerRef.current?.resumeAfterPlayback();
        }
      }
    },
    [interruptDora, settings, state, isDeepThinkActive, isMuted]
  );

  handleSendMessageRef.current = handleSendMessage;

  // Toggle Live Conversational Voice Mode (NEVER clears messages)
  const handleToggleCall = async () => {
    if (isCallActive) {
      proactiveCompanionEngine.stop();
      speechRecognizerRef.current?.stop();
      if (audioEngineRef.current) {
        audioEngineRef.current.stopMicrophone();
        audioEngineRef.current.interruptPlayback();
      }
      doraService.disconnectLiveStream();
      setIsCallActive(false);
      setState("idle");
      setCurrentSpokenText("");
      currentUserVoiceMessageIdRef.current = null;
      currentDoraMessageIdRef.current = null;
    } else {
      try {
        setState("requesting_permission");
        if (!audioEngineRef.current) {
          audioEngineRef.current = new AudioEngine();
        }

        // Request microphone permission and initialize audio analyzer for waveforms
        await audioEngineRef.current.startMicrophone();

        // Start continuous speech recognizer
        await speechRecognizerRef.current?.start();

        setIsCallActive(true);
        setIsMuted(false);
        setState("listening");
        setActiveMode("voice");
        setSelectedModel("Dora Live");
        console.log("[VOICE DEBUG] voice mode started");

        // Start proactive companion monitoring for spontaneous, unprompted turns
        proactiveCompanionEngine.start({
          onProactiveTrigger: (payload) => {
            if (!isCallActiveRef.current || isProcessingTurnRef.current || stateRef.current === "speaking") {
              return;
            }
            console.log(`[PROACTIVE RUNTIME] Executing proactive companion initiation (${payload.triggerType})`);
            if (doraService.isLiveReady()) {
              doraService.sendProactiveTrigger(payload.promptInstruction, settingsRef.current.language);
            } else {
              handleSendMessageRef.current?.(payload.promptInstruction, undefined, true);
            }
          },
          onStateChange: (engineState, reason) => {
            console.log(`[Proactive Companion Engine] -> ${engineState} (${reason || ""})`);
          },
        });

        // Pass recent conversation history context so Dora seamlessly continues from chat
        const historyContext = getRecentHistoryContext();
        const memoryContext = memoryManager.buildContext();
        doraService.connectLiveStream(
          setupLiveCallbacks(),
          settings.voiceName,
          memoryContext,
          historyContext
        );
      } catch (err: any) {
        console.error("Failed to start voice stream:", err);
        proactiveCompanionEngine.stop();
        speechRecognizerRef.current?.stop();
        if (audioEngineRef.current) {
          audioEngineRef.current.stopMicrophone();
          audioEngineRef.current.interruptPlayback();
        }
        setIsCallActive(false);
        setState("error");
        setScreenSharingNotice(
          err?.name === "NotAllowedError" || err?.message?.includes("Permission")
            ? "Microphone permission was denied. Please allow microphone access to talk with Dora."
            : "Microphone unavailable. Please verify your audio input devices."
        );
        setTimeout(() => {
          setState((curr) => (curr === "error" ? "idle" : curr));
          setScreenSharingNotice((prev) => (prev?.includes("Microphone") ? null : prev));
        }, 5000);
      }
    }
  };

  // Switch between Chat and Voice mode views seamlessly
  const handleSwitchMode = (mode: "chat" | "voice") => {
    if (mode === "voice") {
      navigateToVoice();
      if (!isCallActive) {
        handleToggleCall();
      }
    } else {
      navigateToChat();
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

  const handleToggleCamera = async () => {
    if (isCameraActive) {
      cameraVisionService.stopCamera();
      setIsCameraActive(false);
      setCameraStream(null);
      doraService.clearCameraFrame();
      proactiveCompanionEngine.clearVisual("camera");
    } else {
      setScreenSharingNotice(null);
      if (!cameraVisionService.isSupported()) {
        setScreenSharingNotice("Camera is not supported on this browser/device.");
        setTimeout(() => setScreenSharingNotice(null), 4000);
        return;
      }
      try {
        const success = await cameraVisionService.startCamera({
          onFrame: (base64Jpeg) => {
            doraService.sendCameraFrame(base64Jpeg);
            proactiveCompanionEngine.onVisualUpdate("camera");
          },
          onStarted: (stream) => {
            setIsCameraActive(true);
            setCameraStream(stream);
            setScreenSharingNotice(null);
            proactiveCompanionEngine.onVisualUpdate("camera");
          },
          onStopped: () => {
            setIsCameraActive(false);
            setCameraStream(null);
            doraService.clearCameraFrame();
            proactiveCompanionEngine.clearVisual("camera");
          },
          onError: (err: any) => {
            console.warn("[Camera Vision] Error:", err);
            setIsCameraActive(false);
            setCameraStream(null);
            doraService.clearCameraFrame();
            proactiveCompanionEngine.clearVisual("camera");
            setScreenSharingNotice(
              err?.isPermissionDenied || err?.message?.toLowerCase().includes("denied")
                ? "Camera permission was denied. Please allow camera access to use live vision."
                : err?.message || "Camera unavailable on this device."
            );
            setTimeout(() => setScreenSharingNotice(null), 5000);
          },
        });

        if (success) {
          setIsCameraActive(true);
          setCameraStream(cameraVisionService.getStream());
          proactiveCompanionEngine.onVisualUpdate("camera");
        }
      } catch (err: any) {
        console.warn("[Camera Vision] Initialization error:", err);
        setIsCameraActive(false);
        setCameraStream(null);
        proactiveCompanionEngine.clearVisual("camera");
        setScreenSharingNotice("Camera error. Please verify device permissions.");
        setTimeout(() => setScreenSharingNotice(null), 4000);
      }
    }
  };

  const handleSwitchCameraFacing = async () => {
    if (!isCameraActive) return;
    await cameraVisionService.switchCamera();
    setCameraStream(cameraVisionService.getStream());
  };

  const handleToggleScreenVision = async () => {
    if (isScreenVisionActive) {
      screenVisionService.stopCapture();
      setIsScreenVisionActive(false);
      doraService.clearScreenFrame();
      proactiveCompanionEngine.clearVisual("screen");
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
            proactiveCompanionEngine.onVisualUpdate("screen");
          },
          onStarted: () => {
            setIsScreenVisionActive(true);
            setScreenSharingNotice(null);
            proactiveCompanionEngine.onVisualUpdate("screen");
          },
          onStopped: () => {
            setIsScreenVisionActive(false);
            doraService.clearScreenFrame();
            proactiveCompanionEngine.clearVisual("screen");
          },
          onError: (err) => {
            console.warn("[Screen Vision] Capture error:", err);
            setIsScreenVisionActive(false);
            doraService.clearScreenFrame();
            proactiveCompanionEngine.clearVisual("screen");
            if (err?.message?.toLowerCase().includes("not supported")) {
              setScreenSharingNotice("Screen sharing isn't supported on this browser yet.");
            }
          },
        });

        if (success) {
          setIsScreenVisionActive(true);
          proactiveCompanionEngine.onVisualUpdate("screen");
        }
      } catch (err) {
        console.warn("[Screen Vision] Initialization error:", err);
        setIsScreenVisionActive(false);
        proactiveCompanionEngine.clearVisual("screen");
        setScreenSharingNotice("Screen sharing isn't supported on this browser yet.");
      }
    }
  };

  // Start fresh new conversation (only New Chat resets messages, Memory stays preserved)
  const handleNewChat = () => {
    if (isCallActive) {
      if (audioEngineRef.current) {
        audioEngineRef.current.stopMicrophone();
        audioEngineRef.current.interruptPlayback();
      }
      setIsCallActive(false);
      setState("idle");
    }
    const newId = `session-${Date.now()}`;
    setActiveSessionId(newId);
    setMessages([]);
    setCurrentSpokenText("");
    setPendingAttachment(null);
    setInputText("");
    currentUserVoiceMessageIdRef.current = null;
    currentDoraMessageIdRef.current = null;
    navigateToChat();
  };

  // Switch to a previous saved session
  const handleSelectSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setActiveSessionId(session.id);
      setMessages(session.messages || []);
      setCurrentSpokenText("");
      setPendingAttachment(null);
      setInputText("");
    }
    navigateToChat();
  };

  // Feedback handler (like / dislike)
  const handleFeedback = (messageId: string, type: "like" | "dislike") => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, feedback: m.feedback === type ? null : type }
          : m
      )
    );
  };

  // Save conversation / message to Library (pins session)
  const handleSaveToLibrary = (_message: ChatMessage) => {
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === activeSessionId ? { ...s, isPinned: true } : s
      );
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Delete a session
  const handleDeleteSession = (sessionId: string) => {
    const filtered = sessions.filter((s) => s.id !== sessionId);
    setSessions(filtered);
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(filtered));
    if (sessionId === activeSessionId) {
      handleNewChat();
    }
  };

  // Rename a session title
  const handleRenameSession = (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    const cleanTitle = newTitle.trim();
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === sessionId ? { ...s, title: cleanTitle, updatedAt: Date.now() } : s
      );
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Toggle pin status for a session
  const handleTogglePinSession = (sessionId: string) => {
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s
      );
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div
      id="dora-app-root"
      className="min-h-screen h-[100dvh] dora-dark-bg text-[#E3E3E3] flex flex-row font-sans selection:bg-[#1D72FE]/30 overflow-hidden relative"
    >
      {/* Background Cinematic Deep-Blue Ambient Bottom Glow (70-80% AMOLED Black / 20-30% Visible Ambient Glow) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
        {/* Deep navy base layer for smooth falloff into AMOLED black */}
        <div className="absolute -bottom-48 left-1/2 -translate-x-1/2 w-[900px] sm:w-[1200px] h-[450px] sm:h-[520px] bg-[#0E358A]/[0.28] rounded-full blur-[160px]" />
        {/* Core lower deep-blue atmospheric bloom */}
        <div className="absolute -bottom-36 left-1/2 -translate-x-1/2 w-[720px] sm:w-[900px] h-[360px] sm:h-[420px] bg-[#1A56DB]/[0.22] rounded-full blur-[120px]" />
      </div>

      {/* Left Modern AI Sidebar (Clean Navigation Only: Images, Library, Recents) */}
      <Sidebar
        isMobileOpen={isMobileDrawerOpen}
        onMobileClose={() => setIsMobileDrawerOpen(false)}
        isDesktopCollapsed={isDesktopSidebarCollapsed}
        onToggleDesktopCollapse={() => setIsDesktopSidebarCollapsed((prev) => !prev)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onTogglePinSession={handleTogglePinSession}
        onNewChat={handleNewChat}
        onOpenImages={() => setIsImagesOpen(true)}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Workspace */}
      <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
        {activeMode === "voice" ? (
          <VoiceModeView
            state={state}
            emotion={emotion}
            volumeLevel={volumeLevel}
            isMuted={isMuted}
            isCallActive={isCallActive}
            callDuration={callDuration}
            currentSpokenText={currentSpokenText}
            messages={messages}
            userName={userName}
            isScreenVisionActive={isScreenVisionActive}
            screenSharingNotice={screenSharingNotice}
            isCameraActive={isCameraActive}
            cameraStream={cameraStream}
            onToggleCamera={handleToggleCamera}
            onSwitchCameraFacing={handleSwitchCameraFacing}
            onDismissScreenNotice={() => setScreenSharingNotice(null)}
            onToggleScreenVision={handleToggleScreenVision}
            onToggleMute={() => {
              if (!isCallActive) {
                // If call is not active, user tapping mic starts the session
                handleToggleCall();
                return;
              }
              setIsMuted((prev) => {
                const next = !prev;
                proactiveCompanionEngine.setMuted(next);
                if (next) {
                  speechRecognizerRef.current?.pauseForPlayback();
                } else {
                  if (state !== "speaking") {
                    speechRecognizerRef.current?.resumeAfterPlayback();
                  }
                }
                return next;
              });
            }}
            onToggleCall={handleToggleCall}
            onInterrupt={interruptDora}
            onOpenSidebar={() => {
              if (window.innerWidth >= 1024) {
                setIsDesktopSidebarCollapsed(false);
              }
              setIsMobileDrawerOpen(true);
            }}
            onOpenMemory={() => setIsMemoryOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSwitchToChat={navigateToChat}
            onSendTextMessage={(text) => handleSendMessage(text)}
          />
        ) : (
          <>
            {/* ============================================================ */}
            {/* TOP BAR: Minimal ChatGPT-style AMOLED Header                */}
            {/* ============================================================ */}
            <header
              id="dora-top-bar"
              className="w-full px-3 sm:px-6 pt-3.5 pb-2.5 flex items-center justify-between z-30 shrink-0 select-none"
            >
              {/* Left: Rounded dark circular hamburger/sidebar button */}
              <div className="flex items-center gap-2">
                <button
                  id="btn-hamburger-sidebar"
                  type="button"
                  onClick={() => {
                    if (window.innerWidth >= 1024) {
                      setIsDesktopSidebarCollapsed((prev) => !prev);
                    } else {
                      setIsMobileDrawerOpen(true);
                    }
                  }}
                  aria-label="Open sidebar"
                  title="Open sidebar"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#18181b] hover:bg-[#242429] border border-white/[0.08] active:scale-95 text-white/80 hover:text-white transition-all flex items-center justify-center shrink-0 shadow-sm"
                >
                  <Menu className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </button>
              </div>

              {/* Center: Clean Model Selector / Dora Title */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsModelDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-white/[0.06] text-white/90 hover:text-white font-medium text-sm sm:text-base tracking-tight transition-colors"
                >
                  <span>{selectedModel}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                </button>

                {/* Model Selector Dropdown Popover */}
                {isModelDropdownOpen && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 rounded-2xl bg-[#18191E] border border-white/10 shadow-2xl p-1.5 z-50 flex flex-col gap-0.5 text-sm"
                    onMouseLeave={() => setIsModelDropdownOpen(false)}
                  >
                    <button
                      onClick={() => {
                        navigateToChat();
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
                        navigateToVoice();
                        if (!isCallActive) handleToggleCall();
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

              {/* Right: Rounded dark pill containing [New Chat] and [More (three-dot)] */}
              <div className="flex items-center gap-2 shrink-0">
                {isScreenVisionActive && (
                  <button
                    onClick={handleToggleScreenVision}
                    title="Screen Vision Active"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Vision Active</span>
                  </button>
                )}

                {/* Top-right pill container */}
                <div className="relative flex items-center bg-[#18181b] border border-white/[0.08] rounded-full p-0.5 sm:p-1 shadow-sm">
                  {/* New Chat Button */}
                  <button
                    id="btn-topbar-new-chat"
                    type="button"
                    onClick={handleNewChat}
                    title="New Chat"
                    aria-label="New Chat"
                    className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all shrink-0"
                  >
                    <SquarePen className="w-4 h-4" />
                  </button>

                  {/* More Options Button */}
                  <div className="relative">
                    <button
                      id="btn-topbar-more-menu"
                      type="button"
                      onClick={() => setIsTopMoreMenuOpen((prev) => !prev)}
                      title="More actions"
                      aria-label="More actions"
                      className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all shrink-0"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* More Menu Dropdown */}
                    {isTopMoreMenuOpen && (
                      <div
                        className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-[#18191E] border border-white/10 shadow-2xl p-1.5 z-50 flex flex-col gap-0.5 text-xs sm:text-sm"
                        onMouseLeave={() => setIsTopMoreMenuOpen(false)}
                      >
                        <button
                          onClick={() => {
                            handleNewChat();
                            setIsTopMoreMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white/80 hover:bg-white/[0.08] hover:text-white text-left"
                        >
                          <SquarePen className="w-4 h-4" />
                          <span>New conversation</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsImagesOpen(true);
                            setIsTopMoreMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white/80 hover:bg-white/[0.08] hover:text-white text-left"
                        >
                          <ImageIcon className="w-4 h-4" />
                          <span>Images gallery</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsLibraryOpen(true);
                            setIsTopMoreMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white/80 hover:bg-white/[0.08] hover:text-white text-left"
                        >
                          <Bookmark className="w-4 h-4" />
                          <span>Library</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsSettingsOpen(true);
                            setIsTopMoreMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white/80 hover:bg-white/[0.08] hover:text-white text-left"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Voice settings</span>
                        </button>

                        {messages.length > 0 && (
                          <button
                            onClick={() => {
                              setMessages([]);
                              setIsTopMoreMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/20 text-left"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Clear chat messages</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </header>

            {/* Screen Sharing Error / Notice Banner */}
            {screenSharingNotice && (
              <div
                id="screen-sharing-notice"
                role="alert"
                className="mx-auto my-2 px-4 py-1.5 rounded-full bg-[#18191E] border border-white/10 flex items-center gap-2 text-xs text-white/90 shadow-lg backdrop-blur-md z-30 animate-fade-in"
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

            {/* Main Chat Stage */}
            <main
              id="dora-main-stage"
              className="flex-1 flex flex-col justify-between overflow-y-auto custom-scrollbar relative z-10 w-full"
            >
              {messages.length === 0 ? (
                /* Clean Minimal Empty State - AMOLED Canvas */
                <div className="flex-1 flex flex-col items-center justify-center px-4 text-center select-none">
                  <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/40 mb-3 shadow-sm">
                    <Sparkles className="w-6 h-6 text-[#38BDF8]" />
                  </div>
                  <p className="text-sm font-medium text-white/70">What would you like to explore today?</p>
                  <p className="text-xs text-white/40 mt-1 max-w-xs">
                    Type a message, tap the microphone to dictate, or switch to Immersive Voice.
                  </p>
                </div>
              ) : (
                /* Active Message Stream */
                <div className="flex-1 w-full max-w-2xl lg:max-w-3xl mx-auto px-3 sm:px-6 py-6 space-y-6 overflow-y-auto custom-scrollbar">
                  {/* Message List */}
                  {messages.map((m) => (
                    <ChatMessageItem
                      key={m.id}
                      message={m}
                      onFeedback={handleFeedback}
                      onSaveToLibrary={handleSaveToLibrary}
                      onPreviewImage={(url) => setLightboxImage(url)}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Floating Pill Composer (in Chat Mode) */}
              <div className="pt-2 pb-5 sm:pb-7 shrink-0 w-full">
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
          </>
        )}
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
        onOpenSkills={() => {
          setIsSettingsOpen(false);
          setIsSkillsOpen(true);
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

      <ConversationHistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onTogglePinSession={handleTogglePinSession}
      />

      {/* Images Gallery Modal */}
      <ImagesGalleryModal
        isOpen={isImagesOpen}
        onClose={() => setIsImagesOpen(false)}
        sessions={sessions}
      />

      {/* Library Modal */}
      <LibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        sessions={sessions}
        onSelectSession={handleSelectSession}
      />

      {/* Fullscreen Lightbox Preview */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Close Preview"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/[0.08]"
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
