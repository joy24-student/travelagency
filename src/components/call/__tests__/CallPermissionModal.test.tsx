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
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-camera', () => ({
  useCameraPermissions: () => [{ granted: true }, jest.fn().mockResolvedValue({ granted: true })],
}));

jest.mock('../../../utils/media/expoMedia', () => ({
  Audio: {
    checkMicrophonePermissionAsync: jest.fn().mockResolvedValue({ granted: false }),
    requestMicrophonePermissionAsync: jest.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
  },
}));

jest.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#0055F2',
      card: '#ffffff',
      background: '#ffffff',
      text: '#0f172a',
    },
    isDark: false,
  }),
}));

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { CallPermissionModal } from '../CallPermissionModal';

describe('CallPermissionModal Component', () => {
  it('renders pre-permission explanation for microphone and calls onGranted when permitted', async () => {
    const onGranted = jest.fn();
    const onDenied = jest.fn();

    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <CallPermissionModal
          visible={true}
          callType="audio"
          onGranted={onGranted}
          onDenied={onDenied}
        />
      );
    });

    expect(tree).toBeDefined();
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain('ভয়েস কলের জন্য অনুমতি প্রয়োজন');
    expect(str).toContain('মাইক্রোফোন অনুমতি');
  });

  it('renders camera explanation when callType is video', async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <CallPermissionModal
          visible={true}
          callType="video"
          onGranted={jest.fn()}
          onDenied={jest.fn()}
        />
      );
    });

    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain('ভিডিও কলের জন্য অনুমতি প্রয়োজন');
    expect(str).toContain('ক্যামেরা অনুমতি');
  });
});
