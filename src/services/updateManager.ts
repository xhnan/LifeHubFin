import {Platform, Linking, Alert} from 'react-native';
import RNFS from 'react-native-fs';
import type {DownloadProgress} from '../types/version';

const DOWNLOAD_DIR = RNFS.CachesDirectoryPath;
const APK_FILENAME = 'LifeHubFin_update.apk';

/**
 * 下载 APK 文件
 */
export async function downloadAPK(
  url: string,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<string> {
  if (Platform.OS !== 'android') {
    throw new Error('仅支持 Android 平台');
  }

  const downloadPath = `${DOWNLOAD_DIR}/${APK_FILENAME}`;

  // 删除旧文件
  if (await RNFS.exists(downloadPath)) {
    await RNFS.unlink(downloadPath);
  }

  const {promise} = RNFS.downloadFile({
    fromUrl: url,
    toFile: downloadPath,
    progress: res => {
      const progress = {
        bytesWritten: res.bytesWritten,
        contentLength: res.contentLength,
        progress: Math.round((res.bytesWritten / res.contentLength) * 100),
      };
      onProgress?.(progress);
    },
    progressDivider: 10,
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
  try {
    // 使用 Linking API 打开 APK 文件进行安装
    await Linking.openURL(`file://${filePath}`);
  } catch (error: any) {
    throw new Error(`安装失败: ${error.message}`);
  }
}
