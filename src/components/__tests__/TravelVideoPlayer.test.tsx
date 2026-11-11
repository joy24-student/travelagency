jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

jest.mock('../../store/settingsStore', () => ({
  useDataSaver: () => false,
}));

jest.mock('../../utils/safeExpoAv', () => ({
  Video: 'MockVideo',
  ResizeMode: { CONTAIN: 'contain', COVER: 'cover', STRETCH: 'stretch' },
}));

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { TravelVideoPlayer } from '../TravelVideoPlayer';

describe('TravelVideoPlayer Component', () => {
  it('renders video player with Bangla subtitles and controls', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <TravelVideoPlayer
          videoUrl="https://example.com/test.mp4"
          autoPlay={false}
        />
      );
    });

    expect(tree).toBeDefined();
    const str = JSON.stringify(tree.toJSON());
    // Should render VIDEO badge
    expect(str).toContain('VIDEO');
    // Subtitle button CC / বাং
    expect(str).toContain('বাং');
    // Quality badge
    expect(str).toContain('অটো');
  });

  it('renders buffering indicator when buffering is reported', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <TravelVideoPlayer
          videoUrl="https://example.com/test.mp4"
          autoPlay={false}
        />
      );
    });

    const mockVideoInstance = tree.root.findByType('MockVideo');
    act(() => {
      mockVideoInstance.props.onPlaybackStatusUpdate({
        isLoaded: true,
        isPlaying: true,
        isBuffering: true,
        positionMillis: 1000,
        durationMillis: 30000,
      });
    });

    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain('বাফার হচ্ছে...');
  });

  it('displays Bangla subtitle cue when position reaches cue timeframe', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <TravelVideoPlayer
          videoUrl="https://example.com/test.mp4"
          autoPlay={false}
        />
      );
    });

    const mockVideoInstance = tree.root.findByType('MockVideo');
    act(() => {
      mockVideoInstance.props.onPlaybackStatusUpdate({
        isLoaded: true,
        isPlaying: true,
        isBuffering: false,
        positionMillis: 2000,
        durationMillis: 30000,
      });
    });

    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain('স্বপ্নযাত্রায় স্বাগতম');
  });
});
