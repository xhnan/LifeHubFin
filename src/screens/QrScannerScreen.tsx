import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import {useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {scanQrCode, confirmQrCode, cancelQrCode} from '../services/qrcode';

const QrScannerScreen = () => {
  const navigation = useNavigation();
  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);
  const isProcessing = useRef(false);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleCodeScanned = async (qrCodeId: string) => {
    if (isProcessing.current) return;
    isProcessing.current = true;

    try {
      // Step 1: Scan (Mark as scanned)
      await scanQrCode(qrCodeId);

      // Step 2: Show confirm dialog
      Alert.alert(
        '扫码登录',
        '请确认是否登录网页版？',
        [
          {
            text: '取消登录',
            style: 'cancel',
            onPress: async () => {
              try {
                await cancelQrCode(qrCodeId);
              } catch (e) {
                console.error('Cancel QR Code failed', e);
              } finally {
                navigation.goBack();
              }
            },
          },
          {
            text: '确认登录',
            onPress: async () => {
              try {
                await confirmQrCode(qrCodeId);
                Alert.alert('成功', '登录成功', [
                  {text: '确定', onPress: () => navigation.goBack()},
                ]);
              } catch (e) {
                console.error('Confirm QR Code failed', e);
                Alert.alert('失败', '登录失败，请重试');
                isProcessing.current = false;
              }
            },
          },
        ],
        {cancelable: false},
      );
    } catch (error) {
      console.error('Scan QR Code failed', error);
      Alert.alert('错误', '无效的二维码或网络错误', [
        {text: '重新扫描', onPress: () => { isProcessing.current = false; }},
      ]);
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && codes[0].value) {
        handleCodeScanned(codes[0].value);
      }
    },
  });

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.text}>正在请求相机权限...</Text>
      </SafeAreaView>
    );
  }

  if (device == null) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.text}>无法访问相机设备</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        codeScanner={codeScanner}
      />
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>取消</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.scanBoxWrapper}>
          <View style={styles.scanBox} />
          <Text style={styles.promptText}>将二维码放入框内，即可自动扫描</Text>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: 'flex-start',
  },
  backBtn: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
  scanBoxWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#3B7DD8',
    backgroundColor: 'transparent',
  },
  promptText: {
    color: '#fff',
    marginTop: 20,
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
});

export default QrScannerScreen;
