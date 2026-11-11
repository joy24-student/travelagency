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

jest.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#0055F2',
      card: '#ffffff',
      surface: '#f8fafc',
      background: '#ffffff',
      borderStrong: '#cbd5e1',
      text: '#0f172a',
      textMuted: '#64748b',
    },
    isDark: false,
  }),
}));

const mockTrack = {
  id: 'inani-beach',
  title: 'Ocean Waves at Inani Beach',
  destinationName: 'Inani Beach & Coral Coast',
  region: "Cox's Bazar",
  district: "Cox's Bazar",
  description: 'Ocean waves ambiance',
  category: 'coastal',
  coordinates: { latitude: 21.3103, longitude: 92.0494 },
  geofenceRadiusMeters: 2500,
  ambientAudioUrl: 'https://example.com/ambient.ogg',
  regionalMusicUrl: 'https://example.com/music.ogg',
  imageUrl: 'https://example.com/photo.jpg',
  ambientDescription: 'Waves',
  regionalMusicDescription: 'Folk music',
  curatedBy: 'Bay Initiative',
  durationEstimateSeconds: 180,
  fileSizeBytes: 2840000,
  tags: ['Ocean', 'Waves'],
};

const mockGetState = jest.fn().mockReturnValue({
  currentTrack: mockTrack,
  isPlaying: false,
  isBuffering: false,
  volume: 0.8,
  preDuckVolume: 0.8,
  positionMillis: 15000,
  durationMillis: 180000,
  playbackMode: 'ambient',
  activeGeofenceTrack: null,
  autoGeoTriggerEnabled: true,
  cachedTrackIds: [],
});

jest.mock('../../../services/audio/soundscapeService', () => ({
  SOUNDSCAPE_CATALOG: [mockTrack],
  soundscapeService: {
    getState: () => mockGetState(),
    subscribe: jest.fn().mockImplementation((cb) => () => {}),
    togglePlayPause: jest.fn().mockResolvedValue(true),
    setVolume: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../SoundscapePlayer', () => ({
  SoundscapePlayer: 'SoundscapePlayer',
}));

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AudioMiniBar } from '../AudioMiniBar';

describe('AudioMiniBar Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders audio mini-bar with track title, destination, and playback controls', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<AudioMiniBar />);
      jest.runAllTimers();
    });

    expect(tree).toBeDefined();
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain('Ocean Waves at Inani Beach');
    expect(str).toContain('Inani Beach & Coral Coast');
  });

  it('reports visibility to parent via callback', () => {
    const onVis = jest.fn();
    act(() => {
      renderer.create(<AudioMiniBar onVisibilityChange={onVis} />);
      jest.runAllTimers();
    });
    expect(onVis).toHaveBeenCalledWith(true);
  });
});
