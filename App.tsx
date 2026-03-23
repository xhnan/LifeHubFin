import React, {useEffect} from 'react';
import {Linking, Platform, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {NavigationContainer, useNavigation} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';

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
import {ROUTES} from './src/constants/routes';
import {useAppStartup} from './src/hooks/useAppStartup';
import type {
  MainTabNavigationProp,
  MainTabParamList,
  RootStackParamList,
} from './src/navigation/types';
import NativeImageHandler, {
  type EmitterSubscription,
} from './src/services/nativeImageHandler';
import {navigationRef} from './src/services/navigationService';
import {FinanceStoreProvider} from './src/store/FinanceStore';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const TAB_ICON_TEXT_STYLE = {fontSize: 22} as const;

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
      <Text style={TAB_ICON_TEXT_STYLE}>{TAB_ICONS[label]}</Text>
      <Text style={[styles.tabLabel, {color}]}>{label}</Text>
      {focused && <View style={styles.tabDot} />}
    </View>
  );
};

const AddButton = () => {
  const navigation = useNavigation<MainTabNavigationProp<typeof ROUTES.detail>>();

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

const createTabIcon =
  (label: string) =>
  ({focused}: {focused: boolean}) => <TabIcon label={label} focused={focused} />;

const renderAddButton = () => <AddButton />;

const detailTabOptions = {
  tabBarIcon: createTabIcon(ROUTES.detail),
};

const chartTabOptions = {
  tabBarIcon: createTabIcon(ROUTES.chart),
};

const addPlaceholderOptions = {
  tabBarButton: renderAddButton,
};

const discoverTabOptions = {
  tabBarIcon: createTabIcon(ROUTES.discover),
};

const profileTabOptions = {
  tabBarIcon: createTabIcon(ROUTES.profile),
};

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
      options={detailTabOptions}
    />
    <Tab.Screen
      name={ROUTES.chart}
      component={ChartScreen}
      options={chartTabOptions}
    />
    <Tab.Screen
      name={ROUTES.addPlaceholder}
      component={Placeholder}
      options={addPlaceholderOptions}
      listeners={{
        tabPress: e => e.preventDefault(),
      }}
    />
    <Tab.Screen
      name={ROUTES.discover}
      component={DiscoverScreen}
      options={discoverTabOptions}
    />
    <Tab.Screen
      name={ROUTES.profile}
      component={ProfileScreen}
      options={profileTabOptions}
    />
  </Tab.Navigator>
);

const App = () => {
  const {
    authInitialized,
    token,
    versionInfo,
    showUpdateModal,
    handleLoginSuccess,
    closeUpdateModal,
  } = useAppStartup();

  useEffect(() => {
    const handleUrl = ({url}: {url: string}) => {
      if ((url === 'lifehubfin://add' || url === 'add') && navigationRef.isReady()) {
        navigationRef.navigate(ROUTES.add);
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);
    let interval: ReturnType<typeof setInterval> | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    Linking.getInitialURL().then(url => {
      if (cancelled || (url !== 'lifehubfin://add' && url !== 'add')) {
        return;
      }

      interval = setInterval(() => {
        if (navigationRef.isReady()) {
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
          navigationRef.navigate(ROUTES.add);
        }
      }, 50);

      timeout = setTimeout(() => {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      }, 3000);
    });

    return () => {
      cancelled = true;
      subscription.remove();
      if (interval) {
        clearInterval(interval);
      }
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, []);

  useEffect(() => {
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
          onClose={closeUpdateModal}
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
