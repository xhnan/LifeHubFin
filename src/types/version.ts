export interface VersionCheckResponse {
  hasUpdate: boolean;
  versionCode: number;
  versionName: string;
  fileUrl: string;
  fileSize: number;
  fileMd5: string;
  updateLog: string;
  isForce: number;
  platform: string;
}

export interface DownloadProgress {
  bytesWritten: number;
  contentLength: number;
  progress: number; // 0-100
}

export interface EnhancedDownloadProgress extends DownloadProgress {
  speed: number; // bytes per second
  remainingTime: number; // seconds
  downloadedSize: string; // formatted string (e.g., "12.5 MB")
  totalSize: string; // formatted string (e.g., "45.2 MB")
  speedFormatted: string; // formatted string (e.g., "2.5 MB/s")
}
