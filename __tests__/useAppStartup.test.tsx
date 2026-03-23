import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import type {VersionCheckResponse} from '../src/types/version';

const mockAddEventListener = jest.fn();
const mockRunAfterInteractions = jest.fn();
const mockGetToken = jest.fn();
const mockCleanupUpdateCache = jest.fn();
const mockCheckForUpdatesAuto = jest.fn();
const mockRegisterTokenExpiredCallback = jest.fn();
const mockSplashHide = jest.fn();

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: mockAddEventListener,
  },
  InteractionManager: {
    runAfterInteractions: mockRunAfterInteractions,
  },
}));

jest.mock('react-native-splash-screen', () => ({
  hide: mockSplashHide,
}));

jest.mock('../src/services/auth', () => ({
  getToken: mockGetToken,
}));

jest.mock('../src/services/updateManager', () => ({
  cleanupUpdateCache: mockCleanupUpdateCache,
}));

jest.mock('../src/services/versionCheck', () => ({
  checkForUpdatesAuto: mockCheckForUpdatesAuto,
}));

jest.mock('../src/services/navigationService', () => ({
  registerTokenExpiredCallback: mockRegisterTokenExpiredCallback,
}));

describe('useAppStartup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddEventListener.mockReturnValue({remove: jest.fn()});
    mockRunAfterInteractions.mockImplementation((callback: () => void) => {
      callback();
      return {cancel: jest.fn()};
    });
    mockCleanupUpdateCache.mockResolvedValue(undefined);
    mockGetToken.mockResolvedValue('token-1');
    mockCheckForUpdatesAuto.mockResolvedValue({
      hasUpdate: true,
      versionName: '1.2.0',
    } satisfies Partial<VersionCheckResponse>);
  });

  it('initializes auth state and exposes update info after auto check', async () => {
    const {useAppStartup} = require('../src/hooks/useAppStartup') as typeof import('../src/hooks/useAppStartup');

    let snapshot:
      | ReturnType<typeof useAppStartup>
      | undefined;

    const Harness = () => {
      snapshot = useAppStartup();
      return null;
    };

    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(<Harness />);
    });

    expect(mockCleanupUpdateCache).toHaveBeenCalledTimes(1);
    expect(mockGetToken).toHaveBeenCalledTimes(1);
    expect(mockCheckForUpdatesAuto).toHaveBeenCalledTimes(1);
    expect(mockRegisterTokenExpiredCallback).toHaveBeenCalledTimes(1);
    expect(mockSplashHide).toHaveBeenCalledTimes(1);
    expect(snapshot).toMatchObject({
      authInitialized: true,
      token: 'token-1',
      showUpdateModal: true,
    });
    expect(snapshot?.versionInfo).toMatchObject({
      hasUpdate: true,
      versionName: '1.2.0',
    });
  });

  it('clears token after the registered expiration callback fires', async () => {
    const {useAppStartup} = require('../src/hooks/useAppStartup') as typeof import('../src/hooks/useAppStartup');

    let snapshot:
      | ReturnType<typeof useAppStartup>
      | undefined;

    const Harness = () => {
      snapshot = useAppStartup();
      return null;
    };

    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(<Harness />);
    });

    const registeredCallback = mockRegisterTokenExpiredCallback.mock.calls[0][0] as () => void;

    await ReactTestRenderer.act(async () => {
      registeredCallback();
    });

    expect(snapshot?.token).toBeNull();
  });

  it('cancels a pending version check task on unmount', async () => {
    const cancel = jest.fn();
    mockRunAfterInteractions.mockImplementation(() => ({cancel}));

    const {useAppStartup} = require('../src/hooks/useAppStartup') as typeof import('../src/hooks/useAppStartup');

    const Harness = () => {
      useAppStartup();
      return null;
    };

    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<Harness />);
    });

    await ReactTestRenderer.act(async () => {
      renderer?.unmount();
    });

    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
