import React, {useCallback, useEffect, useState} from 'react';
import {AppState, Platform, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
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
import TransactionDetailScreen from './src/screens/TransactionDetailScreen';
import {UpdateModal} from './src/components/UpdateModal';
import {getToken} from './src/services/auth';
import NativeImageHandler, {
  type EmitterSubscription,
} from './src/services/nativeImageHandler';
import {registerTokenExpiredCallback} from './src/services/navigationService';
import {cleanupUpdateCache} from './src/services/updateManager';
import {checkForUpdates} from './src/services/versionCheck';
import {FinanceStoreProvider} from './src/store/FinanceStore';
import type {VersionCheckResponse} from './src/types/version';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ROUTES = {
  home: '\u4e3b\u9875',
  detail: '\u660e\u7ec6',
  chart: '\u56fe\u8868',
  add: '\u8bb0\u8d26',
  addPlaceholder: '\u8bb0\u8d26\u5360\u4f4d',
  discover: '\u53d1\u73b0',
  profile: '\u6211\u7684',
  bookManage: '\u8d26\u672c\u7ba1\u7406',
  receipt: '\u62cd\u7167\u8bb0\u8d26',
  transactionDetail: '\u8d26\u5355\u8be6\u60c5',
} as const;

const TAB_ICONS: Record<string, string> = {
  [ROUTES.detail]: '\u{1F4CB}',
  [ROUTES.chart]: '\u{1F4CA}',
  [ROUTES.discover]: '\u{1F50D}',
  [ROUTES.profile]: '\u{1F464}',
};

const TabIcon = ({label, focused}: {label: string; focused: boolean}) => {
  const color = focused ? '#3B7DD8' : '#B0B8C4';

  return (
    <View style={styles.tabIcon}>
      <Text style={{fontSize: 22}}>{TAB_ICONS[label]}</Text>
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
      onPress={() => navigation.navigate(ROUTES.add)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={ROUTES.add}>
      <View style={styles.addButtonOuter}>
        <View style={styles.addButtonInner}>
          <Text style={styles.addButtonText}>+</Text>
        </View>
      </View>
      <Text style={styles.addButtonLabel}>{ROUTES.add}</Text>
    </TouchableOpacity>
  );
};

const Placeholder = () => <View />;

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarShowLabel: false,
    }}>
    <Tab.Screen
      name={ROUTES.detail}
      component={DetailScreen}
      options={{
        tabBarIcon: ({focused}) => <TabIcon label={ROUTES.detail} focused={focused} />,
      }}
    />
    <Tab.Screen
      name={ROUTES.chart}
      component={ChartScreen}
      options={{
        tabBarIcon: ({focused}) => <TabIcon label={ROUTES.chart} focused={focused} />,
      }}
    />
    <Tab.Screen
      name={ROUTES.addPlaceholder}
      component={Placeholder}
      options={{
        tabBarButton: () => <AddButton />,
      }}
      listeners={{
        tabPress: e => e.preventDefault(),
      }}
    />
    <Tab.Screen
      name={ROUTES.discover}
      component={DiscoverScreen}
      options={{
        tabBarIcon: ({focused}) => <TabIcon label={ROUTES.discover} focused={focused} />,
      }}
    />
    <Tab.Screen
      name={ROUTES.profile}
      component={ProfileScreen}
      options={{
        tabBarIcon: ({focused}) => <TabIcon label={ROUTES.profile} focused={focused} />,
      }}
    />
  </Tab.Navigator>
);

const App = () => {
  const navigationRef = React.useRef<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionCheckResponse | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  React.useEffect(() => {
    if (navigationRef.current) {
      (global as any).navigationRef = navigationRef;
    }
  }, [token]);

  React.useEffect(() => {
    let isMounted = true;

    import('react-native').then(({Linking}) => {
      const handleUrl = ({url}: {url: string}) => {
        if ((url === 'lifehubfin://add' || url === 'add') && navigationRef.current?.isReady()) {
          navigationRef.current.navigate(ROUTES.add);
        }
      };

      const subscription = Linking.addEventListener('url', handleUrl);

      Linking.getInitialURL().then(url => {
        if (!isMounted || (url !== 'lifehubfin://add' && url !== 'add')) {
          return;
        }

        const interval = setInterval(() => {
          if (navigationRef.current?.isReady()) {
            clearInterval(interval);
            navigationRef.current.navigate(ROUTES.add);
          }
        }, 50);

        setTimeout(() => clearInterval(interval), 3000);
      });

      return () => {
        subscription.remove();
      };
    });

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (Platform.OS !== 'android' || !token) {
      return;
    }

    let subscription: EmitterSubscription | null = null;

    const setupListener = async () => {
      const lastImage = await NativeImageHandler.getLastSharedImage();
      if (lastImage && navigationRef.current) {
        navigationRef.current.navigate(ROUTES.receipt, {
          initialImageUri: lastImage,
        });
        await NativeImageHandler.clearSharedImage();
      }

      subscription = NativeImageHandler.addListener((imagePath: string) => {
        if (navigationRef.current) {
          navigationRef.current.navigate(ROUTES.receipt, {
            initialImageUri: imagePath,
          });
        }
      });
    };

    setupListener();

    return () => {
      subscription?.remove();
    };
  }, [token]);

  useEffect(() => {
    cleanupUpdateCache().catch(err => {
      console.warn('[App] cleanup update cache failed:', err);
    });

    registerTokenExpiredCallback(() => {
      setToken(null);
    });

    getToken()
      .then(t => {
        setToken(t);

        if (t) {
          checkForUpdates().then(info => {
            if (info) {
              setVersionInfo(info);
              setShowUpdateModal(true);
            }
          });
        }
      })
      .finally(() => {
        setAuthInitialized(true);
        SplashScreen.hide();
      });
  }, []);

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

  if (!authInitialized) {
    return null;
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
      <FinanceStoreProvider>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator screenOptions={{headerShown: false}}>
            <Stack.Screen name={ROUTES.home} component={TabNavigator} />
            <Stack.Screen
              name={ROUTES.add}
              component={AddScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name={ROUTES.bookManage}
              component={BookManageScreen}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name={ROUTES.receipt}
              component={ReceiptScreen}
              options={{
                headerShown: false,
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name={ROUTES.transactionDetail}
              component={TransactionDetailScreen}
              options={{
                headerShown: false,
                presentation: 'transparentModal',
                animation: 'fade',
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
        <UpdateModal
          visible={showUpdateModal}
          versionInfo={versionInfo}
          onClose={() => setShowUpdateModal(false)}
        />
      </FinanceStoreProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
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
