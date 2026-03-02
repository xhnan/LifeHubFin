import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, AppState} from 'react-native';
import {NavigationContainer, useNavigation} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import SplashScreen from 'react-native-splash-screen';

import DetailScreen from './src/screens/DetailScreen';
import ChartScreen from './src/screens/ChartScreen';
import AddScreen from './src/screens/AddScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BookManageScreen from './src/screens/BookManageScreen';
import LoginScreen from './src/screens/LoginScreen';
import ReceiptScreen from './src/screens/ReceiptScreen';
import {getToken, removeToken} from './src/services/auth';
import {registerTokenExpiredCallback} from './src/services/navigationService';
import {UpdateModal} from './src/components/UpdateModal';
import {checkForUpdates} from './src/services/versionCheck';
import type {VersionCheckResponse} from './src/types/version';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabIcon = ({label, focused}: {label: string; focused: boolean}) => {
  const color = focused ? '#3B7DD8' : '#B0B8C4';
  const icons: Record<string, string> = {
    明细: '📋',
    图表: '📊',
    发现: '🔍',
    我的: '👤',
  };
  return (
    <View style={styles.tabIcon}>
      <Text style={{fontSize: 22}}>{icons[label]}</Text>
      <Text style={[styles.tabLabel, {color}]}>{label}</Text>
      {focused && <View style={styles.tabDot} />}
    </View>
  );
};

const AddButton = () => {
  const navigation = useNavigation<any>();
  return (
    <TouchableOpacity
      style={styles.addButton}
      onPress={() => navigation.navigate('记账')}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel="记账">
      <View style={styles.addButtonOuter}>
        <View style={styles.addButtonInner}>
          <Text style={styles.addButtonText}>+</Text>
        </View>
      </View>
      <Text style={styles.addButtonLabel}>记账</Text>
    </TouchableOpacity>
  );
};

// 占位组件，不会真正显示
const Placeholder = () => <View />;

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarShowLabel: false,
    }}>
    <Tab.Screen
      name="明细"
      component={DetailScreen}
      options={{
        tabBarIcon: ({focused}) => <TabIcon label="明细" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="图表"
      component={ChartScreen}
      options={{
        tabBarIcon: ({focused}) => <TabIcon label="图表" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="记账占位"
      component={Placeholder}
      options={{
        tabBarButton: () => <AddButton />,
      }}
      listeners={{
        tabPress: e => e.preventDefault(),
      }}
    />
    <Tab.Screen
      name="发现"
      component={DiscoverScreen}
      options={{
        tabBarIcon: ({focused}) => <TabIcon label="发现" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="我的"
      component={ProfileScreen}
      options={{
        tabBarIcon: ({focused}) => <TabIcon label="我的" focused={focused} />,
      }}
    />
  </Tab.Navigator>
);

const App = () => {
  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [versionInfo, setVersionInfo] = useState<VersionCheckResponse | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    // 注册 Token 过期回调
    registerTokenExpiredCallback(() => {
      setToken(null);
    });

    // 检查本地是否有 Token
    getToken().then(t => {
      setToken(t);
      setChecking(false);

      // 如果已登录，检查版本更新
      if (t) {
        checkForUpdates().then(info => {
          if (info) {
            setVersionInfo(info);
            setShowUpdateModal(true);
          }
        });
      }

      // 隐藏启动页
      SplashScreen.hide();
    });
  }, []);

  // 从后台恢复时检查更新
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && token) {
        checkForUpdates().then(info => {
          if (info) {
            setVersionInfo(info);
            setShowUpdateModal(true);
          }
        });
      }
    });

    return () => subscription?.remove();
  }, [token]);

  const handleLoginSuccess = useCallback((t: string) => {
    setToken(t);
  }, []);

  const handleLogout = useCallback(async () => {
    await removeToken();
    setToken(null);
  }, []);

  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B7DD8" />
      </View>
    );
  }

  if (!token) {
    return (
      <SafeAreaProvider>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{headerShown: false}}>
          <Stack.Screen name="主页" component={TabNavigator} />
          <Stack.Screen
            name="记账"
            component={AddScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="账本管理"
            component={BookManageScreen}
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="拍照记账"
            component={ReceiptScreen}
            options={{
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <UpdateModal
        visible={showUpdateModal}
        versionInfo={versionInfo}
        onClose={() => setShowUpdateModal(false)}
      />
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
  },
  tabBar: {
    height: 64,
    paddingBottom: 6,
    paddingTop: 6,
    backgroundColor: '#fff',
    borderTopWidth: 0,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3B7DD8',
    marginTop: 3,
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    top: -22,
  },
  addButtonOuter: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#3B7DD8',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  addButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3B7DD8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 30,
    color: '#fff',
    fontWeight: '300',
    lineHeight: 32,
  },
  addButtonLabel: {
    fontSize: 10,
    color: '#3B7DD8',
    marginTop: 3,
    fontWeight: '600',
  },
});

export default App;
