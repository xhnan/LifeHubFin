import React, {useState} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import type {VersionCheckResponse} from '../types/version';
import {downloadAPK, installAPK} from '../services/updateManager';

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
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async () => {
    if (!versionInfo?.fileUrl) {
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      // 下载 APK
      const filePath = await downloadAPK(versionInfo.fileUrl, p => {
        setProgress(p.progress);
      });

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

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={s.overlay}>
        <View style={s.container}>
          {/* 图标 */}
          <View style={s.iconContainer}>
            <Text style={s.icon}>🔄</Text>
          </View>

          {/* 标题 */}
          <Text style={s.title}>发现新版本</Text>
          <Text style={s.version}>v{versionInfo.versionName}</Text>

          {/* 更新日志 */}
          {updateLogs.length > 0 && (
            <ScrollView style={s.logContainer}>
              {updateLogs.map((log, i) => (
                <Text key={i} style={s.logItem}>
                  {log.trim().startsWith('•') ? log : `• ${log}`}
                </Text>
              ))}
            </ScrollView>
          )}

          {/* 强制更新提示 */}
          {isForce && (
            <Text style={s.forceText}>
              此版本为重要更新，必须升级后才能继续使用
            </Text>
          )}

          {/* 下载进度 */}
          {downloading && (
            <View style={s.progressContainer}>
              <ActivityIndicator size="small" color="#3B7DD8" />
              <Text style={s.progressText}>下载中... {progress}%</Text>
            </View>
          )}

          {/* 错误提示 */}
          {error && <Text style={s.errorText}>{error}</Text>}

          {/* 按钮 */}
          {!downloading && (
            <View style={s.buttonContainer}>
              {!isForce && (
                <TouchableOpacity
                  style={[s.button, s.cancelButton]}
                  onPress={onClose}>
                  <Text style={s.cancelText}>稍后</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[s.button, s.confirmButton]}
                onPress={handleUpdate}>
                <Text style={s.confirmText}>立即下载</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  version: {
    fontSize: 16,
    color: '#3B7DD8',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  logContainer: {
    backgroundColor: '#F2F4F7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    maxHeight: 120,
  },
  logItem: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  forceText: {
    fontSize: 12,
    color: '#FF4D4F',
    textAlign: 'center',
    marginBottom: 16,
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  progressText: {
    fontSize: 14,
    color: '#3B7DD8',
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#FF4D4F',
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F4F7',
  },
  confirmButton: {
    backgroundColor: '#3B7DD8',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
