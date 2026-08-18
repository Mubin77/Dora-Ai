import { VoiceProvider } from "../types";
import { isRealApiKey } from "../ai/google";

export class DeepgramVoiceProvider implements VoiceProvider {
  public readonly id = "deepgram";
  public readonly name = "Deepgram";
  public readonly category = "voice" as const;
  public readonly capabilities: Array<"tts" | "stt" | "realtime-voice"> = ["stt", "tts"];

  public isConfigured(): boolean {
    return isRealApiKey(process.env.DEEPGRAM_API_KEY);
  }
}

export class AssemblyAIVoiceProvider implements VoiceProvider {
  public readonly id = "assemblyai";
  public readonly name = "AssemblyAI";
  public readonly category = "voice" as const;
  public readonly capabilities: Array<"tts" | "stt" | "realtime-voice"> = ["stt"];

  public isConfigured(): boolean {
    return isRealApiKey(process.env.ASSEMBLYAI_API_KEY);
  }
}

