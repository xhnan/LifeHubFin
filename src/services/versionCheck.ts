import {Platform} from 'react-native';
import {authFetch} from './api';
import {APP_VERSION_CODE} from '../config/version';
import type {VersionCheckResponse} from '../types/version';

/**
 * 检查应用更新的结果类型
 */
export interface VersionCheckResult {
  hasUpdate: boolean;
  data?: VersionCheckResponse;
  error?: string;
}

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
      `/sys/app-version/app/app-version/check?${params.toString()}`,
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

/**
 * 手动检查更新（返回更详细的结果）
 */
export async function checkForUpdatesManual(): Promise<VersionCheckResult> {
  try {
    const params = new URLSearchParams({
      versionCode: APP_VERSION_CODE.toString(),
      platform: Platform.OS === 'android' ? 'android' : 'ios',
    });

    const url = `/sys/app-version/app/app-version/check?${params.toString()}`;
    console.log('[VersionCheck] 正在检查更新...', {
      versionCode: APP_VERSION_CODE,
      platform: Platform.OS,
    });

    const response = await authFetch<VersionCheckResponse>(url);

    console.log('[VersionCheck] 检查完成:', {
      hasUpdate: response.hasUpdate,
      latestVersion: response.versionName,
    });

    return {
      hasUpdate: response.hasUpdate,
      data: response.hasUpdate ? response : undefined,
    };
  } catch (error: any) {
    console.error('[VersionCheck] 检查失败:', error);
    return {
      hasUpdate: false,
      error: error.message || '网络连接失败',
    };
  }
}
