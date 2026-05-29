import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform, NativeModules} from 'react-native';
import RNFS from 'react-native-fs';
import type {DownloadProgress} from '../types/version';

const {ApkInstaller, ApkDownloadManager} = NativeModules;

const APK_FILENAME = 'LifeHubFin_update.apk';
const DOWNLOAD_TASK_STORAGE_KEY = 'lifehubfin_apk_download_task';
const DOWNLOAD_POLL_INTERVAL_MS = 1000;

const ANDROID_DOWNLOAD_STATUS = {
  pending: 1,
  running: 2,
  paused: 4,
  successful: 8,
  failed: 16,
} as const;

export interface EnhancedDownloadProgress extends DownloadProgress {
  speed: number;
  remainingTime: number;
  downloadedSize: string;
  totalSize: string;
  speedFormatted: string;
}

interface PersistedDownloadTask {
  downloadId: number;
  url: string;
  filePath: string;
}

interface NativeDownloadTask {
  downloadId: number;
  filePath: string;
}

interface NativeDownloadStatus {
  status: number;
  reason: number;
  bytesDownloaded: number;
  totalBytes: number;
  localUri?: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

async function saveDownloadTask(task: PersistedDownloadTask | null): Promise<void> {
  if (!task) {
    await AsyncStorage.removeItem(DOWNLOAD_TASK_STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(DOWNLOAD_TASK_STORAGE_KEY, JSON.stringify(task));
}

async function getSavedDownloadTask(): Promise<PersistedDownloadTask | null> {
  const raw = await AsyncStorage.getItem(DOWNLOAD_TASK_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PersistedDownloadTask;
  } catch (error) {
    console.warn('[UpdateManager] failed to parse saved download task:', error);
    await saveDownloadTask(null);
    return null;
  }
}

function normalizePath(localUri?: string | null, fallbackPath?: string): string {
  if (localUri?.startsWith('file://')) {
    return decodeURIComponent(localUri.replace('file://', ''));
  }

  return fallbackPath || '';
}

async function enqueueNativeDownload(url: string): Promise<NativeDownloadTask> {
  const result = await ApkDownloadManager.enqueue(url, APK_FILENAME);
  return {
    downloadId: Number(result.downloadId),
    filePath: result.filePath,
  };
}

async function queryNativeDownload(downloadId: number): Promise<NativeDownloadStatus | null> {
  const result = await ApkDownloadManager.query(downloadId);

  if (!result) {
    return null;
  }

  return {
    status: Number(result.status),
    reason: Number(result.reason || 0),
    bytesDownloaded: Number(result.bytesDownloaded || 0),
    totalBytes: Number(result.totalBytes || 0),
    localUri: result.localUri,
  };
}

function createEnhancedProgress(
  bytesDownloaded: number,
  totalBytes: number,
  speed: number,
): EnhancedDownloadProgress {
  const safeTotalBytes = totalBytes > 0 ? totalBytes : bytesDownloaded;
  const progress =
    safeTotalBytes > 0 ? Math.min(100, Math.round((bytesDownloaded / safeTotalBytes) * 100)) : 0;

  return {
    bytesWritten: bytesDownloaded,
    contentLength: safeTotalBytes,
    progress,
    speed,
    remainingTime: speed > 0 && safeTotalBytes > bytesDownloaded
      ? (safeTotalBytes - bytesDownloaded) / speed
      : 0,
    downloadedSize: formatBytes(bytesDownloaded),
    totalSize: formatBytes(safeTotalBytes),
    speedFormatted: `${formatBytes(speed)}/s`,
  };
}

async function waitForDownloadCompletion(
  task: PersistedDownloadTask,
  onProgress?: (progress: EnhancedDownloadProgress) => void,
): Promise<string> {
  let lastBytesDownloaded = 0;
  let lastTimestamp = Date.now();
  let speedSamples: number[] = [];

  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      try {
        const status = await queryNativeDownload(task.downloadId);

        if (!status) {
          clearInterval(timer);
          await saveDownloadTask(null);
          reject(new Error('下载任务不存在，可能已被系统清理'));
          return;
        }

        const now = Date.now();
        const elapsedSeconds = (now - lastTimestamp) / 1000;

        if (elapsedSeconds > 0) {
          const speed = (status.bytesDownloaded - lastBytesDownloaded) / elapsedSeconds;
          if (Number.isFinite(speed) && speed >= 0) {
            speedSamples.push(speed);
            if (speedSamples.length > 5) {
              speedSamples.shift();
            }
          }
        }

        const averageSpeed =
          speedSamples.length > 0
            ? speedSamples.reduce((sum, item) => sum + item, 0) / speedSamples.length
            : 0;

        onProgress?.(
          createEnhancedProgress(
            status.bytesDownloaded,
            status.totalBytes,
            averageSpeed,
          ),
        );

        lastBytesDownloaded = status.bytesDownloaded;
        lastTimestamp = now;

        if (status.status === ANDROID_DOWNLOAD_STATUS.successful) {
          clearInterval(timer);
          await saveDownloadTask(null);
          const filePath = normalizePath(status.localUri, task.filePath);
          resolve(filePath);
          return;
        }

        if (status.status === ANDROID_DOWNLOAD_STATUS.failed) {
          clearInterval(timer);
          await saveDownloadTask(null);
          reject(new Error(`下载失败，系统错误码: ${status.reason}`));
        }
      } catch (error) {
        clearInterval(timer);
        reject(error);
      }
    }, DOWNLOAD_POLL_INTERVAL_MS);
  });
}

async function resolveDownloadTask(url: string): Promise<PersistedDownloadTask> {
  const savedTask = await getSavedDownloadTask();

  if (savedTask && savedTask.url === url) {
    const status = await queryNativeDownload(savedTask.downloadId);
    if (
      status &&
      status.status !== ANDROID_DOWNLOAD_STATUS.failed
    ) {
      return savedTask;
    }
  }

  const task = await enqueueNativeDownload(url);
  const persistedTask: PersistedDownloadTask = {
    downloadId: task.downloadId,
    url,
    filePath: task.filePath,
  };
  await saveDownloadTask(persistedTask);
  return persistedTask;
}

export async function resumeAPKDownload(
  url: string,
  onProgress?: (progress: EnhancedDownloadProgress) => void,
): Promise<string | null> {
  if (Platform.OS !== 'android') {
    return null;
  }

  const savedTask = await getSavedDownloadTask();
  if (!savedTask || savedTask.url !== url) {
    return null;
  }

  const status = await queryNativeDownload(savedTask.downloadId);
  if (!status) {
    await saveDownloadTask(null);
    return null;
  }

  if (status.status === ANDROID_DOWNLOAD_STATUS.failed) {
    await saveDownloadTask(null);
    return null;
  }

  if (status.status === ANDROID_DOWNLOAD_STATUS.successful) {
    await saveDownloadTask(null);
    return normalizePath(status.localUri, savedTask.filePath);
  }

  return waitForDownloadCompletion(savedTask, onProgress);
}

export async function downloadAPK(
  url: string,
  onProgress?: (progress: EnhancedDownloadProgress) => void,
): Promise<string> {
  if (Platform.OS !== 'android') {
    throw new Error('仅支持 Android 平台');
  }

  if (!ApkDownloadManager?.enqueue || !ApkDownloadManager?.query) {
    throw new Error('系统下载模块不可用，请重新安装 Android 应用');
  }

  const task = await resolveDownloadTask(url);
  return waitForDownloadCompletion(task, onProgress);
}

export async function installAPK(filePath: string): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('仅支持 Android 平台');
  }

  try {
    await ApkInstaller.install(filePath);
  } catch (error: any) {
    throw new Error(`安装失败: ${error.message || error}`);
  }
}

export async function cleanupAPK(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    const savedTask = await getSavedDownloadTask();
    if (savedTask) {
      await ApkDownloadManager.remove(savedTask.downloadId);
      await saveDownloadTask(null);
    }

    const externalDownloadsDir = RNFS.ExternalDirectoryPath
      ? `${RNFS.ExternalDirectoryPath}/Download`
      : null;
    const candidates = [
      `${RNFS.CachesDirectoryPath}/${APK_FILENAME}`,
      externalDownloadsDir ? `${externalDownloadsDir}/${APK_FILENAME}` : null,
    ].filter(Boolean) as string[];

    for (const filePath of candidates) {
      if (await RNFS.exists(filePath)) {
        await RNFS.unlink(filePath);
      }
    }
  } catch (error: any) {
    console.warn('[UpdateManager] 清理 APK 文件失败:', error.message);
  }
}

export async function cleanupUpdateCache(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await cleanupAPK();

    const files = await RNFS.readDir(RNFS.CachesDirectoryPath);
    const apkFiles = files.filter(
      file => file.isFile() && file.name.includes('LifeHubFin') && file.name.endsWith('.apk'),
    );

    for (const file of apkFiles) {
      await RNFS.unlink(file.path);
    }
  } catch (error: any) {
    console.warn('[UpdateManager] 清理更新缓存失败:', error.message);
  }
}
