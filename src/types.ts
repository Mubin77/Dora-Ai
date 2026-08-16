export type DoraEmotion = 
  | 'warm' 
  | 'playful' 
  | 'empathetic' 
  | 'curious' 
  | 'calm' 
  | 'witty' 
  | 'attentive'
  | 'surprised';

export type ConversationState = 
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'paused';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'dora';
  text: string;
  timestamp: number;
  emotion?: DoraEmotion;
  audioUrl?: string;
  isInterrupted?: boolean;
  reaction?: string;
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
