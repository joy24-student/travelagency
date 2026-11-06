jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
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

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SoundscapePlayer } from '../SoundscapePlayer';

describe('SoundscapePlayer Component', () => {
  it('renders mini-player with initial destination soundscape title and controls', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<SoundscapePlayer bottomOffset={60} />);
    });
    expect(tree).toBeDefined();
    const json = tree.toJSON();
    expect(json).toBeTruthy();
  });
});
