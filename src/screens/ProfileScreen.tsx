import React, {useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';

import {UpdateModal} from '../components/UpdateModal';
import {ROUTES} from '../constants/routes';
import {APP_VERSION} from '../config/version';
import type {MainTabNavigationProp} from '../navigation/types';
import {logout} from '../services/navigationService';
import {checkForUpdatesManual} from '../services/versionCheck';

const MENU_ITEMS = [
  {icon: '📚', label: '账本管理', route: ROUTES.bookManage},
  {icon: '💳', label: '账户管理', route: ROUTES.accountManage},
  {icon: '📸', label: '扫一扫', route: ROUTES.qrScanner},
  {icon: '🏷️', label: '标签管理'},
  {icon: '📤', label: '数据导出'},
  {icon: '🔔', label: '提醒设置'},
];

const SETTINGS = [
  {icon: '⬆️', label: '检查更新', action: 'checkUpdate'},
  {icon: '🔐', label: '隐私设置'},
  {icon: '🌐', label: '语言与地区'},
  {icon: '❓', label: '帮助与反馈'},
];

const ACCOUNT_ITEMS = [{icon: '🚪', label: '退出登录', action: 'logout'}];

const ProfileScreen = () => {
  const navigation = useNavigation<MainTabNavigationProp<typeof ROUTES.profile>>();
  const [checking, setChecking] = useState(false);
  const [versionInfo, setVersionInfo] = useState<any>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const handleCheckUpdate = async () => {
    setChecking(true);
    const result = await checkForUpdatesManual();
    setChecking(false);

    if (result.error) {
      Alert.alert('检查更新失败', result.error);
      return;
    }

    if (result.hasUpdate && result.data) {
      setVersionInfo(result.data);
      setShowUpdateModal(true);
      return;
    }

    Alert.alert('已是最新版本', `当前版本 v${APP_VERSION}`);
  };

  const handleLogout = () => {
    Alert.alert('退出登录', '确认退出当前账号吗？', [
      {text: '取消', style: 'cancel'},
      {
        text: '退出',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleMenuPress = (item: {route?: string; action?: string}) => {
    if (item.action === 'checkUpdate') {
      handleCheckUpdate();
      return;
    }

    if (item.action === 'logout') {
      handleLogout();
      return;
    }

    if (item.route === ROUTES.bookManage) {
      navigation.navigate(ROUTES.bookManage);
      return;
    }

    if (item.route === ROUTES.accountManage) {
      navigation.navigate(ROUTES.accountManage);
      return;
    }

    if (item.route === ROUTES.qrScanner) {
      navigation.navigate(ROUTES.qrScanner);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#3B7DD8" />
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>LifeHub 用户</Text>
          <Text style={styles.userSub}>账本管理与统计分析</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          {MENU_ITEMS.map((item, index) => (
            <React.Fragment key={item.label}>
              {index > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => handleMenuPress(item)}
                activeOpacity={0.6}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        <View style={styles.card}>
          {SETTINGS.map((item, index) => (
            <React.Fragment key={item.label}>
              {index > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => handleMenuPress(item)}
                activeOpacity={0.6}
                disabled={checking && item.action === 'checkUpdate'}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {checking && item.action === 'checkUpdate' ? (
                  <ActivityIndicator size="small" color="#3B7DD8" />
                ) : (
                  <Text style={styles.menuArrow}>›</Text>
                )}
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        <View style={styles.card}>
          {ACCOUNT_ITEMS.map((item, index) => (
            <React.Fragment key={item.label}>
              {index > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => handleMenuPress(item)}
                activeOpacity={0.6}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={[styles.menuLabel, styles.logoutLabel]}>{item.label}</Text>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.version}>LifeHub v{APP_VERSION}</Text>
      </View>

      <UpdateModal
        visible={showUpdateModal}
        versionInfo={versionInfo}
        onClose={() => setShowUpdateModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#3B7DD8'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B7DD8',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {fontSize: 28},
  userInfo: {flex: 1},
  userName: {fontSize: 20, fontWeight: '800', color: '#fff'},
  userSub: {fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4},
  body: {
    flex: 1,
    backgroundColor: '#F2F4F7',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  divider: {height: StyleSheet.hairlineWidth, backgroundColor: '#F0F2F5', marginLeft: 52},
  menuRow: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16},
  menuIcon: {fontSize: 20, marginRight: 14},
  menuLabel: {flex: 1, fontSize: 15, fontWeight: '500', color: '#333'},
  logoutLabel: {color: '#FF3B30'},
  menuArrow: {fontSize: 18, color: '#D0D5DD'},
  version: {textAlign: 'center', fontSize: 12, color: '#C8CDD5', marginTop: 24},
});

export default ProfileScreen;
