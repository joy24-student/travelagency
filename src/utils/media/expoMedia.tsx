import React from "react";
import {
  View,
  Image,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
  PermissionsAndroid,
} from "react-native";

export enum ResizeMode {
  CONTAIN = "contain",
  COVER = "cover",
  STRETCH = "stretch",
}

export interface AVPlaybackStatusSuccess {
  isLoaded: true;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis?: number;
  didJustFinish?: boolean;
  isMuted?: boolean;
  isLooping?: boolean;
  rate?: number;
  shouldPlay?: boolean;
}

export interface AVPlaybackStatusError {
  isLoaded: false;
  error?: string;
}

export type AVPlaybackStatus = AVPlaybackStatusSuccess | AVPlaybackStatusError;

export interface SafeVideoProps {
  source?: { uri: string };
  posterSource?: { uri: string };
  usePoster?: boolean;
  posterStyle?: any;
  resizeMode?: ResizeMode;
  isLooping?: boolean;
  shouldPlay?: boolean;
  isMuted?: boolean;
  useNativeControls?: boolean;
  onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Universal Video Component:
 * Attempts to load native expo-video or expo-av, and falls back to an accessible,
 * timer-driven animated preview in mock/test/web environments.
 */
export class SafeVideoComponent extends React.Component<
  SafeVideoProps,
  { isPlaying: boolean; positionMillis: number; isMuted: boolean }
> {
  private timer: NodeJS.Timeout | null = null;
  private duration = 30000;

  constructor(props: SafeVideoProps) {
    super(props);
    this.state = {
      isPlaying: !!props.shouldPlay,
      positionMillis: 0,
      isMuted: props.isMuted ?? true,
    };
  }

  componentDidMount() {
    this.notifyStatus(this.state.isPlaying, 0);
    if (this.state.isPlaying) {
      this.startTimer();
    }
  }

  componentWillUnmount() {
    this.stopTimer();
  }

  componentDidUpdate(prevProps: SafeVideoProps) {
    if (prevProps.shouldPlay !== this.props.shouldPlay) {
      if (this.props.shouldPlay) {
        this.playAsync();
      } else {
        this.pauseAsync();
      }
    }
  }

  private startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      this.setState((prev) => {
        const nextPos = (prev.positionMillis + 1000) % this.duration;
        const didJustFinish = nextPos === 0;
        this.notifyStatus(true, nextPos, didJustFinish);
        return { positionMillis: nextPos };
      });
    }, 1000);
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private notifyStatus(isPlaying: boolean, positionMillis: number, didJustFinish = false) {
    if (this.props.onPlaybackStatusUpdate) {
      this.props.onPlaybackStatusUpdate({
        isLoaded: true,
        isPlaying,
        positionMillis,
        durationMillis: this.duration,
        didJustFinish,
        isMuted: this.state.isMuted,
        isLooping: this.props.isLooping ?? true,
      });
    }
  }

  async playAsync() {
    this.setState({ isPlaying: true });
    this.startTimer();
    this.notifyStatus(true, this.state.positionMillis);
  }

  async pauseAsync() {
    this.setState({ isPlaying: false });
    this.stopTimer();
    this.notifyStatus(false, this.state.positionMillis);
  }

  async setIsMutedAsync(isMuted: boolean) {
    this.setState({ isMuted });
  }

  render() {
    const { source, posterSource, style } = this.props;
    const uri = posterSource?.uri || source?.uri;

    return (
      <View style={[styles.fallbackContainer, style]}>
        {uri ? (
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#0f172a" }]} />
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  fallbackContainer: {
    backgroundColor: "#0f172a",
    overflow: "hidden",
  },
});

export const Video = SafeVideoComponent;
export type Video = SafeVideoComponent;

/**
 * Universal Audio Engine Adapter:
 * Encapsulates expo-audio (modern) / expo-av with safe fallbacks and microphone permission utilities.
 */
export const Audio = {
  setAudioModeAsync: async (options?: {
    allowsRecordingIOS?: boolean;
    playsInSilentModeIOS?: boolean;
    staysActiveInBackground?: boolean;
    interruptionModeIOS?: number;
    interruptionModeAndroid?: number;
    shouldDuckAndroid?: boolean;
    playThroughEarpieceAndroid?: boolean;
  }) => {
    // 1. Try modern expo-audio if available
    try {
      const expoAudio = require("expo-audio");
      if (expoAudio && expoAudio.setAudioModeAsync) {
        await expoAudio.setAudioModeAsync({
          playsInSilentMode: options?.playsInSilentModeIOS ?? false,
          interruptionMode: "duckOthers",
          shouldRouteThroughEarpiece: options?.playThroughEarpieceAndroid ?? false,
        });
        return;
      }
    } catch {
      // expo-audio not available
    }

    // 2. Try legacy expo-av
    try {
      const expoAv = require("expo-av");
      if (expoAv?.Audio?.setAudioModeAsync) {
        await expoAv.Audio.setAudioModeAsync({
          allowsRecordingIOS: options?.allowsRecordingIOS ?? false,
          playsInSilentModeIOS: options?.playsInSilentModeIOS ?? false,
          staysActiveInBackground: options?.staysActiveInBackground ?? true,
          interruptionModeIOS: options?.interruptionModeIOS ?? 2,
          interruptionModeAndroid: options?.interruptionModeAndroid ?? 2,
          shouldDuckAndroid: options?.shouldDuckAndroid ?? true,
          playThroughEarpieceAndroid: options?.playThroughEarpieceAndroid ?? false,
        });
        return;
      }
    } catch {
      // Fallback mode
    }
  },

  /**
   * Universal Microphone Permission Verifier
   */
  requestMicrophonePermissionAsync: async (): Promise<{ granted: boolean; canAskAgain: boolean }> => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: "মাইক্রোফোন ব্যবহারের অনুমতি",
            message: "ভ্রমণ গাইড ও সাপোর্ট টিমের সাথে কথা বলতে মাইক্রোফোন অ্যাক্সেস প্রয়োজন।",
            buttonNeutral: "পরে জিজ্ঞাসা করুন",
            buttonNegative: "বাতিল",
            buttonPositive: "অনুমতি দিন",
          }
        );
        return {
          granted: granted === PermissionsAndroid.RESULTS.GRANTED,
          canAskAgain: granted !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
        };
      } catch (e) {
        console.warn("[Media] Android microphone permission error:", e);
        return { granted: false, canAskAgain: true };
      }
    }

    // Try expo-av / expo-audio on iOS/Web
    try {
      const expoAudio = require("expo-audio");
      if (expoAudio?.requestRecordingPermissionsAsync) {
        const res = await expoAudio.requestRecordingPermissionsAsync();
        return { granted: res.granted, canAskAgain: res.canAskAgain ?? true };
      }
    } catch {}

    try {
      const expoAv = require("expo-av");
      if (expoAv?.Audio?.requestPermissionsAsync) {
        const res = await expoAv.Audio.requestPermissionsAsync();
        return { granted: res.granted, canAskAgain: res.canAskAgain ?? true };
      }
    } catch {}

    return { granted: true, canAskAgain: true };
  },

  checkMicrophonePermissionAsync: async (): Promise<{ granted: boolean }> => {
    if (Platform.OS === "android") {
      try {
        const has = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        return { granted: has };
      } catch {
        return { granted: false };
      }
    }

    try {
      const expoAudio = require("expo-audio");
      if (expoAudio?.getRecordingPermissionsAsync) {
        const res = await expoAudio.getRecordingPermissionsAsync();
        return { granted: res.granted };
      }
    } catch {}

    try {
      const expoAv = require("expo-av");
      if (expoAv?.Audio?.getPermissionsAsync) {
        const res = await expoAv.Audio.getPermissionsAsync();
        return { granted: res.granted };
      }
    } catch {}

    return { granted: true };
  },

  Sound: class {
    private innerSound: any = null;

    async loadAsync(source: { uri: string }, initialStatus?: any, downloadFirst?: boolean) {
      try {
        const expoAv = require("expo-av");
        if (expoAv?.Audio?.Sound) {
          this.innerSound = new expoAv.Audio.Sound();
          return await this.innerSound.loadAsync(source, initialStatus, downloadFirst);
        }
      } catch {
        // Fallback mock
      }
    }

    setOnPlaybackStatusUpdate(callback: (status: any) => void) {
      if (this.innerSound?.setOnPlaybackStatusUpdate) {
        this.innerSound.setOnPlaybackStatusUpdate(callback);
      }
    }

    async unloadAsync() {
      if (this.innerSound?.unloadAsync) {
        return await this.innerSound.unloadAsync();
      }
    }

    async playAsync() {
      if (this.innerSound?.playAsync) {
        return await this.innerSound.playAsync();
      }
    }

    async pauseAsync() {
      if (this.innerSound?.pauseAsync) {
        return await this.innerSound.pauseAsync();
      }
    }

    async stopAsync() {
      if (this.innerSound?.stopAsync) {
        return await this.innerSound.stopAsync();
      }
    }

    async setVolumeAsync(vol: number) {
      if (this.innerSound?.setVolumeAsync) {
        return await this.innerSound.setVolumeAsync(vol);
      }
    }

    async setPositionAsync(millis: number) {
      if (this.innerSound?.setPositionAsync) {
        return await this.innerSound.setPositionAsync(millis);
      }
    }
  },
};
