export type DoraEmotion = 
  | 'warm' 
  | 'playful' 
  | 'empathetic' 
  | 'curious' 
  | 'calm' 
  | 'witty' 
  | 'attentive'
  | 'surprised';

export type CompanionEngagementMode =
  | 'CHILL_COMPANION'
  | 'TASK_FOCUSED'
  | 'QUIET_OBSERVER'
  | 'IMMERSIVE_VOICE'
  | 'EXPLICIT_SILENCE';

export interface CompanionStatus {
  mode: CompanionEngagementMode;
  statusLabel: string;
  isSilent: boolean;
  silenceReason?: string;
  activeEnvironment?: string;
  activeScreenActivity?: string;
}

export type ConversationState = 
  | 'idle'
  | 'requesting_permission'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'paused'
  | 'error';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'dora';
  text: string;
  timestamp: number;
  emotion?: DoraEmotion;
  audioUrl?: string;
  isInterrupted?: boolean;
  reaction?: string;
  feedback?: 'like' | 'dislike' | null;
  inputMode?: 'text' | 'voice';
  isStreaming?: boolean;
  isFinal?: boolean;
  imageAttachment?: string;
  fileAttachment?: {
    name: string;
    size?: number;
    type?: string;
    textContent?: string;
  };
}

export interface ConversationSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  hasVoice?: boolean;
  isPinned?: boolean;
}

export interface VoiceSettings {
  voiceName: string; // 'Kore', 'Aoede', 'Zephyr', etc.
  speakingRate: number; // 0.8 to 1.3
  pitch: number;
  continuousListening: boolean;
  pauseThresholdMs: number; // e.g. 1200ms
  interruptSensitivity: 'high' | 'medium' | 'low';
  language: 'auto' | 'en' | 'bn-en'; // English, Banglish
  engine: 'gemini-live' | 'gemini-tts' | 'browser-speech';
}

export interface DoraMemoryItem {
  id: string;
  topic: string;
  detail: string;
  timestamp: number;
}

export interface PendingAttachment {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  isImage: boolean;
  previewUrl?: string;
  base64Data?: string;
  textContent?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  isAuthenticated: boolean;
}
