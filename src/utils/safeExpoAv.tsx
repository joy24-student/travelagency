import React from "react";
import { View, Image, StyleSheet, ViewStyle, StyleProp } from "react-native";

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

// Fallback Video component when ExponentAV native binary is absent in Expo Go (e.g. SDK 57 Expo Go)
export class SafeVideoComponent extends React.Component<SafeVideoProps, { isPlaying: boolean; positionMillis: number; isMuted: boolean }> {
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

export const Audio = {
  setAudioModeAsync: async (_options?: any) => {},
  Sound: class {
    async loadAsync() {}
    async unloadAsync() {}
    async playAsync() {}
    async stopAsync() {}
    async setVolumeAsync() {}
  },
};
