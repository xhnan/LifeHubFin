import {Platform, NativeModules} from 'react-native';
import RNFS from 'react-native-fs';
import type {DownloadProgress} from '../types/version';

const {ApkInstaller} = NativeModules;

const DOWNLOAD_DIR = RNFS.CachesDirectoryPath;
const APK_FILENAME = 'LifeHubFin_update.apk';

export interface EnhancedDownloadProgress extends DownloadProgress {
  speed: number; // bytes per second
  remainingTime: number; // seconds
  downloadedSize: string; // formatted string (e.g., "12.5 MB")
  totalSize: string; // formatted string (e.g., "45.2 MB")
  speedFormatted: string; // formatted string (e.g., "2.5 MB/s")
}

/**
 * 格式化文件大小
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * 格式化时间
 */
function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}秒`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
  return `${Math.round(seconds / 3600)}小时`;
}

/**
 * 下载 APK 文件（增强版，包含速度计算）
 */
export async function downloadAPK(
  url: string,
  onProgress?: (progress: EnhancedDownloadProgress) => void,
): Promise<string> {
  if (Platform.OS !== 'android') {
    throw new Error('仅支持 Android 平台');
  }

  const downloadPath = `${DOWNLOAD_DIR}/${APK_FILENAME}`;

  // 删除旧文件
  if (await RNFS.exists(downloadPath)) {
    await RNFS.unlink(downloadPath);
  }

  // 速度计算相关变量
  let lastBytesWritten = 0;
  let lastTimestamp = Date.now();
  let speeds: number[] = [];

  const {promise} = RNFS.downloadFile({
    fromUrl: url,
    toFile: downloadPath,
    progress: res => {
      const currentTimestamp = Date.now();
      const timeElapsed = (currentTimestamp - lastTimestamp) / 1000; // 秒

      // 计算瞬时速度
      if (timeElapsed > 0.5) { // 每0.5秒更新一次速度
        const bytesDiff = res.bytesWritten - lastBytesWritten;
        const instantSpeed = bytesDiff / timeElapsed;

        // 存储最近几次的速度用于平滑显示
        speeds.push(instantSpeed);
        if (speeds.length > 5) speeds.shift();

        const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;

        const progress: EnhancedDownloadProgress = {
          bytesWritten: res.bytesWritten,
          contentLength: res.contentLength,
          progress: Math.round((res.bytesWritten / res.contentLength) * 100),
          speed: avgSpeed,
          remainingTime: avgSpeed > 0 ? (res.contentLength - res.bytesWritten) / avgSpeed : 0,
          downloadedSize: formatBytes(res.bytesWritten),
          totalSize: formatBytes(res.contentLength),
          speedFormatted: formatBytes(avgSpeed) + '/s',
        };

        onProgress?.(progress);

        lastBytesWritten = res.bytesWritten;
        lastTimestamp = currentTimestamp;
      }
    },
    progressDivider: 1,
    progressInterval: 100,
  });

  const result = await promise;

  if (result.statusCode === 200) {
    return downloadPath;
  }

  throw new Error(`下载失败: HTTP ${result.statusCode}`);
}

/**
 * 安装 APK
 */
export async function installAPK(filePath: string): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('仅支持 Android 平台');
  }

  try {
    // 使用原生模块安装 APK（支持 FileProvider）
    await ApkInstaller.install(filePath);

    // 安装成功后，延迟清理 APK 文件
    // 延迟是因为 install() 调用会立即返回，实际安装还在进行中
    setTimeout(() => {
      cleanupAPK().catch(err => {
        console.warn('[UpdateManager] 清理 APK 失败:', err);
      });
    }, 3000); // 3秒后清理，给系统安装程序足够时间
  } catch (error: any) {
    throw new Error(`安装失败: ${error.message || error}`);
  }
}

/**
 * 清理已下载的 APK 文件
 */
export async function cleanupAPK(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    const downloadPath = `${DOWNLOAD_DIR}/${APK_FILENAME}`;

    if (await RNFS.exists(downloadPath)) {
      await RNFS.unlink(downloadPath);
      console.log('[UpdateManager] APK 文件已清理:', downloadPath);
    }
  } catch (error: any) {
    console.warn('[UpdateManager] 清理 APK 文件失败:', error.message);
  }
}

/**
 * 清理所有更新相关的缓存文件
 */
export async function cleanupUpdateCache(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    const files = await RNFS.readDir(DOWNLOAD_DIR);
    const apkFiles = files.filter(
      file => file.isFile() && file.name.includes('LifeHubFin') && file.name.endsWith('.apk')
    );

    for (const file of apkFiles) {
      await RNFS.unlink(file.path);
      console.log('[UpdateManager] 清理缓存 APK:', file.name);
    }

    console.log(`[UpdateManager] 共清理 ${apkFiles.length} 个 APK 文件`);
  } catch (error: any) {
    console.warn('[UpdateManager] 清理更新缓存失败:', error.message);
  }
}
