import {Platform} from 'react-native';
import {authFetch} from './api';
import {APP_VERSION_CODE} from '../config/version';
import type {VersionCheckResponse} from '../types/version';

/**
 * 检查应用更新
 */
export async function checkForUpdates(): Promise<VersionCheckResponse | null> {
  try {
    const params = new URLSearchParams({
      versionCode: APP_VERSION_CODE.toString(),
      platform: Platform.OS === 'android' ? 'android' : 'ios',
    });

    const response = await authFetch<VersionCheckResponse>(
      `/app/app-version/check?${params.toString()}`,
    );

    // 如果没有更新，返回 null
    if (!response.hasUpdate) {
      return null;
    }

    return response;
  } catch (error) {
    console.error('版本检查失败:', error);
    // 网络失败时返回 null，允许用户继续使用
    return null;
  }
}
