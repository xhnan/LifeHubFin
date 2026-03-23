import {Platform} from 'react-native';
import {authFetch} from './api';
import {APP_VERSION_CODE} from '../config/version';
import type {VersionCheckResponse} from '../types/version';

const AUTO_CHECK_MIN_INTERVAL_MS = 30 * 60 * 1000;
const NETWORK_ERROR_FALLBACK = '\u7f51\u7edc\u8fde\u63a5\u5931\u8d25';

let lastAutoCheckAt = 0;

export function consumeAutoCheckWindow(now = Date.now()): boolean {
  if (lastAutoCheckAt !== 0 && now - lastAutoCheckAt < AUTO_CHECK_MIN_INTERVAL_MS) {
    return false;
  }

  lastAutoCheckAt = now;
  return true;
}

export function resetAutoCheckWindowForTesting() {
  lastAutoCheckAt = 0;
}

export interface VersionCheckResult {
  hasUpdate: boolean;
  data?: VersionCheckResponse;
  error?: string;
}

export async function checkForUpdates(): Promise<VersionCheckResponse | null> {
  try {
    const params = new URLSearchParams({
      versionCode: APP_VERSION_CODE.toString(),
      platform: Platform.OS === 'android' ? 'android' : 'ios',
    });

    const response = await authFetch<VersionCheckResponse>(
      `/sys/app-version/app/app-version/check?${params.toString()}`,
    );

    if (!response.hasUpdate) {
      return null;
    }

    return response;
  } catch (error) {
    console.error('[VersionCheck] automatic check failed', error);
    return null;
  }
}

export async function checkForUpdatesAuto(): Promise<VersionCheckResponse | null> {
  if (!consumeAutoCheckWindow()) {
    return null;
  }

  return checkForUpdates();
}

export async function checkForUpdatesManual(): Promise<VersionCheckResult> {
  try {
    const params = new URLSearchParams({
      versionCode: APP_VERSION_CODE.toString(),
      platform: Platform.OS === 'android' ? 'android' : 'ios',
    });

    const url = `/sys/app-version/app/app-version/check?${params.toString()}`;
    console.log('[VersionCheck] checking for updates', {
      versionCode: APP_VERSION_CODE,
      platform: Platform.OS,
    });

    const response = await authFetch<VersionCheckResponse>(url);

    console.log('[VersionCheck] check completed', {
      hasUpdate: response.hasUpdate,
      latestVersion: response.versionName,
    });

    return {
      hasUpdate: response.hasUpdate,
      data: response.hasUpdate ? response : undefined,
    };
  } catch (error) {
    console.error('[VersionCheck] manual check failed', error);
    return {
      hasUpdate: false,
      error: error instanceof Error ? error.message : NETWORK_ERROR_FALLBACK,
    };
  }
}
