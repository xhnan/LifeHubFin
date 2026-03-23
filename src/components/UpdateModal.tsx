import React, {useState, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import type {VersionCheckResponse} from '../types/version';
import {
  downloadAPK,
  installAPK,
  EnhancedDownloadProgress,
} from '../services/updateManager';

interface UpdateModalProps {
  visible: boolean;
  versionInfo: VersionCheckResponse | null;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  visible,
  versionInfo,
  onClose,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<EnhancedDownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (progress) {
      Animated.timing(progressAnim, {
        toValue: progress.progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(0);
    }
  }, [progress, progressAnim]);

  const handleUpdate = async () => {
    if (!versionInfo?.fileUrl) {
      return;
    }

    setDownloading(true);
    setError(null);
    setProgress(null);
    progressAnim.setValue(0);

    try {
      // 下载 APK
      const filePath = await downloadAPK(versionInfo.fileUrl, p => {
        setProgress(p);
      });

      // 下载完成，更新进度为 100%
      if (progress) {
        setProgress({
          ...progress,
          progress: 100,
        });
      }

      // 安装 APK
      await installAPK(filePath);
    } catch (err: any) {
      setError(err.message);
      setDownloading(false);
    }
  };

  if (!versionInfo) {
    return null;
  }

  // 是否强制更新
  const isForce = versionInfo.isForce === 1;

  // 将换行符分隔的更新日志转换为数组
  const updateLogs = versionInfo.updateLog
    ? versionInfo.updateLog.split('\n').filter(log => log.trim())
    : [];

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.container}>
          {/* 顶部装饰条 */}
          <View style={s.topBar} />

          {/* 图标容器 */}
          <View style={s.iconContainer}>
            {/* 下载图标 SVG */}
            <View style={s.iconBg}>
              <Text style={s.icon}>⬇</Text>
            </View>
          </View>

          {/* 标题 */}
          <Text style={s.title}>发现新版本</Text>
          <Text style={s.version}>v{versionInfo.versionName}</Text>

          {/* 更新日志 */}
          {updateLogs.length > 0 && (
            <View style={s.logWrapper}>
              <ScrollView style={s.logContainer} showsVerticalScrollIndicator={false}>
                {updateLogs.map((log, i) => (
                  <View key={i} style={s.logItemRow}>
                    <Text style={s.logBullet}>•</Text>
                    <Text style={s.logItem}>
                      {log.trim().startsWith('•') ? log.slice(1).trim() : log.trim()}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 下载进度区域 */}
          {downloading && progress && (
            <View style={s.downloadSection}>
              {/* 进度信息 */}
              <View style={s.progressInfo}>
                <View style={s.progressInfoLeft}>
                  <Text style={s.progressPercentage}>{progress.progress}%</Text>
                  <Text style={s.progressDetail}>
                    {progress.downloadedSize} / {progress.totalSize}
                  </Text>
                </View>
                <View style={s.progressInfoRight}>
                  <Text style={s.progressSpeed}>{progress.speedFormatted}</Text>
                  {progress.remainingTime > 0 && (
                    <Text style={s.progressTime}>
                      剩余 {formatRemainingTime(progress.remainingTime)}
                    </Text>
                  )}
                </View>
              </View>

              {/* 进度条 */}
              <View style={s.progressBarBg}>
                <Animated.View
                  style={[
                    s.progressBarFill,
                    {
                      width: progressWidth,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* 错误提示 */}
          {error && (
            <View style={s.errorBox}>
              <Text style={s.errorIcon}>⚠</Text>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* 强制更新提示 */}
          {isForce && !downloading && (
            <View style={s.forceBox}>
              <Text style={s.forceIcon}>⚠</Text>
              <Text style={s.forceText}>
                此版本为重要更新，必须升级后才能继续使用
              </Text>
            </View>
          )}

          {/* 按钮 */}
          {!downloading && (
            <View style={s.buttonContainer}>
              {!isForce && (
                <TouchableOpacity
                  style={[s.button, s.cancelButton]}
                  onPress={onClose}
                  activeOpacity={0.7}>
                  <Text style={s.cancelText}>稍后</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[s.button, s.confirmButton]}
                onPress={handleUpdate}
                activeOpacity={0.7}>
                <Text style={s.confirmText}>立即更新</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 下载中按钮 */}
          {downloading && (
            <View style={s.downloadingButton}>
              <Text style={s.downloadingText}>下载中...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

/**
 * 格式化剩余时间
 */
function formatRemainingTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}秒`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
  return `${Math.round(seconds / 3600)}小时`;
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 0,
    width: '100%',
    maxWidth: 340,
    paddingBottom: 24,
  },
  topBar: {
    height: 4,
    width: 40,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EBF8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 32,
    color: '#3B7DD8',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  version: {
    fontSize: 15,
    color: '#3B7DD8',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  logWrapper: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  logContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    maxHeight: 120,
  },
  logItemRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  logBullet: {
    fontSize: 14,
    color: '#3B7DD8',
    marginRight: 6,
    fontWeight: '600',
  },
  logItem: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  downloadSection: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  progressInfoLeft: {
    flex: 1,
  },
  progressInfoRight: {
    alignItems: 'flex-end',
  },
  progressPercentage: {
    fontSize: 28,
    fontWeight: '800',
    color: '#3B7DD8',
    marginBottom: 4,
  },
  progressDetail: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressSpeed: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 2,
  },
  progressTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B7DD8',
    borderRadius: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
  forceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  forceIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  forceText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmButton: {
    backgroundColor: '#3B7DD8',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  downloadingButton: {
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  downloadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
});
