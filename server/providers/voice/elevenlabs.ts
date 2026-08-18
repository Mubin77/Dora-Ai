import { VoiceProvider } from "../types";
import { isRealApiKey } from "../ai/google";

export class ElevenLabsVoiceProvider implements VoiceProvider {
  public readonly id = "elevenlabs";
  public readonly name = "ElevenLabs";
  public readonly category = "voice" as const;
  public readonly capabilities: Array<"tts" | "stt" | "realtime-voice"> = ["tts"];

  public isConfigured(): boolean {
    return isRealApiKey(process.env.ELEVENLABS_API_KEY);
  }
}

