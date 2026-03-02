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
