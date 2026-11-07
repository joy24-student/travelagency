/**
 * Emergency Audio Utility
 * Provides audio tone playback during SOS countdowns and critical warnings.
 * Uses expo-av with safe fallback to silent handling if sound is disabled or fails.
 */

import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

let soundObject: Audio.Sound | null = null;
let soundFileUri: string | null = null;

/**
 * Builds a simple 880Hz mono 16-bit PCM WAV tone encoded as base64.
 * Duration: 220ms, Sample Rate: 8000Hz.
 */
function generateBeepWavBase64(): string {
  const sampleRate = 8000;
  const duration = 0.22;
  const frequency = 880;
  const numSamples = Math.floor(sampleRate * duration);
  const dataSize = numSamples * 2;
  const totalSize = 44 + dataSize;
  const bytes = new Uint8Array(totalSize);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      bytes[offset + i] = str.charCodeAt(i);
    }
  }

  function writeUint32LE(offset: number, val: number) {
    bytes[offset] = val & 0xff;
    bytes[offset + 1] = (val >> 8) & 0xff;
    bytes[offset + 2] = (val >> 16) & 0xff;
    bytes[offset + 3] = (val >> 24) & 0xff;
  }

  function writeUint16LE(offset: number, val: number) {
    bytes[offset] = val & 0xff;
    bytes[offset + 1] = (val >> 8) & 0xff;
  }

  // RIFF header
  writeString(0, "RIFF");
  writeUint32LE(4, 36 + dataSize);
  writeString(8, "WAVE");

  // fmt chunk
  writeString(12, "fmt ");
  writeUint32LE(16, 16);
  writeUint16LE(20, 1); // PCM
  writeUint16LE(22, 1); // Mono
  writeUint32LE(24, sampleRate);
  writeUint32LE(28, sampleRate * 2);
  writeUint16LE(32, 2); // Block align
  writeUint16LE(34, 16); // Bits per sample

  // data chunk
  writeString(36, "data");
  writeUint32LE(40, dataSize);

  let byteIdx = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Fade out slightly at the end to prevent clicking
    const envelope = Math.max(0, 1 - i / numSamples);
    const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.75;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    const unsignedSample = intSample < 0 ? intSample + 65536 : intSample;
    bytes[byteIdx] = unsignedSample & 0xff;
    bytes[byteIdx + 1] = (unsignedSample >> 8) & 0xff;
    byteIdx += 2;
  }

  // Convert bytes to base64
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa === "function" ? btoa(binary) : Buffer.from(bytes).toString("base64");
}

export const emergencySound = {
  /**
   * Initializes or loads the warning sound.
   */
  async prepare(): Promise<void> {
    try {
      if (Platform.OS === "web") return;

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      }).catch(() => {});

      if (!soundFileUri) {
        const cacheDir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || "";
        const targetPath = `${cacheDir}emergency_beep.wav`;
        const base64Wav = generateBeepWavBase64();
        await (FileSystem as any).writeAsStringAsync(targetPath, base64Wav, {
          encoding: (FileSystem as any).EncodingType?.Base64 || "base64",
        });
        soundFileUri = targetPath;
      }
    } catch (err) {
      console.warn("[EmergencySound] Preparation warning:", err);
    }
  },

  /**
   * Plays a single alert beep tone for SOS countdown tick.
   */
  async playCountdownBeep(): Promise<void> {
    try {
      await this.prepare();

      if (soundObject) {
        await soundObject.unloadAsync().catch(() => {});
        soundObject = null;
      }

      if (soundFileUri) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: soundFileUri },
          { shouldPlay: true, volume: 1.0 }
        );
        soundObject = sound;
      }
    } catch (err) {
      // Non-fatal warning; haptics handle fallback
      console.warn("[EmergencySound] Beep playback fallback:", err);
    }
  },

  /**
   * Plays a higher priority alarm sound.
   */
  async playAlarmSound(): Promise<void> {
    return this.playCountdownBeep();
  },

  /**
   * Stops any currently playing alarm sound.
   */
  async stop(): Promise<void> {
    try {
      if (soundObject) {
        await soundObject.stopAsync().catch(() => {});
        await soundObject.unloadAsync().catch(() => {});
        soundObject = null;
      }
    } catch {
      // ignore
    }
  },
};
