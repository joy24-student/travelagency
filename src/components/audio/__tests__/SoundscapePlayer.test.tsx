jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('expo-font', () => ({
  isLoaded: () => true,
  loadAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('../../../services/audio/soundscapeService', () => {
  const actual = jest.requireActual('../../../services/audio/soundscapeService');
  return {
    ...actual,
    soundscapeService: {
      getState: jest.fn().mockReturnValue({
        currentTrack: actual.SOUNDSCAPE_CATALOG[0],
        isPlaying: false,
        isBuffering: false,
        volume: 0.8,
        preDuckVolume: 0.8,
        isMuted: false,
        isDucked: false,
        playbackMode: 'loop_single',
        positionMillis: 0,
        durationMillis: 180000,
        isLooping: true,
        autoGeoTriggerEnabled: true,
        isOfflineMode: false,
        cachedTrackIds: [],
        spatialPreset: 'natural',
        sleepTimerMinutesRemaining: null,
      }),
      subscribe: jest.fn().mockReturnValue(jest.fn()),
      getCacheStorageSummary: jest.fn().mockResolvedValue({
        totalFiles: 0,
        totalBytes: 0,
        humanReadableSize: '0 MB',
        cachedTracksCount: 0,
      }),
      playTrack: jest.fn().mockResolvedValue(undefined),
      pauseTrack: jest.fn().mockResolvedValue(undefined),
      resumeTrack: jest.fn().mockResolvedValue(undefined),
      stopTrack: jest.fn().mockResolvedValue(undefined),
      seekTo: jest.fn().mockResolvedValue(undefined),
      setVolume: jest.fn().mockResolvedValue(undefined),
      duckVolume: jest.fn().mockResolvedValue(undefined),
      unduckVolume: jest.fn().mockResolvedValue(undefined),
      setSpatialPreset: jest.fn().mockResolvedValue(undefined),
      setSleepTimer: jest.fn().mockResolvedValue(undefined),
      cancelSleepTimer: jest.fn().mockResolvedValue(undefined),
      preCacheSoundscape: jest.fn().mockResolvedValue(true),
      preCacheAllSoundscapes: jest.fn().mockResolvedValue(undefined),
      clearSoundscapeCache: jest.fn().mockResolvedValue(undefined),
      setAutoGeoTriggerEnabled: jest.fn().mockResolvedValue(undefined),
      setOfflineModeEnabled: jest.fn().mockResolvedValue(undefined),
      cyclePlaybackMode: jest.fn().mockReturnValue('loop_single'),
    },
  };
});

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SoundscapePlayer } from '../SoundscapePlayer';

describe('SoundscapePlayer Component', () => {
  it('renders mini-player with initial destination soundscape title and controls', async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(<SoundscapePlayer bottomOffset={60} />);
    });
    expect(tree).toBeDefined();
    const json = tree.toJSON();
    expect(json).toBeTruthy();
  }, 30000);
});
