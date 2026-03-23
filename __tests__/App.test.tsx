/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({children}: {children: React.ReactNode}) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  createNavigationContainerRef: () => ({
    isReady: () => false,
    canGoBack: () => false,
    navigate: jest.fn(),
    goBack: jest.fn(),
    resetRoot: jest.fn(),
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({children}: {children: React.ReactNode}) => children,
    Screen: ({component: Component}: {component: React.ComponentType}) =>
      Component ? <Component /> : null,
  }),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({children}: {children: React.ReactNode}) => children,
    Screen: ({component: Component}: {component: React.ComponentType}) =>
      Component ? <Component /> : null,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({children}: {children: React.ReactNode}) => children,
  SafeAreaView: ({children}: {children: React.ReactNode}) => children,
}));

jest.mock('../src/hooks/useAppStartup', () => ({
  useAppStartup: () => ({
    authInitialized: true,
    token: null,
    versionInfo: null,
    showUpdateModal: false,
    handleLoginSuccess: jest.fn(),
    closeUpdateModal: jest.fn(),
  }),
}));

jest.mock('../src/screens/LoginScreen', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../src/screens/DetailScreen', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../src/screens/ChartScreen', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../src/screens/AddScreen', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../src/screens/DiscoverScreen', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../src/screens/ProfileScreen', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../src/screens/BookManageScreen', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../src/screens/ReceiptScreen', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../src/screens/TransactionDetailScreen', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../src/components/UpdateModal', () => ({
  UpdateModal: () => null,
}));

jest.mock('../src/services/nativeImageHandler', () => ({
  __esModule: true,
  default: {
    getLastSharedImage: jest.fn().mockResolvedValue(null),
    clearSharedImage: jest.fn().mockResolvedValue(undefined),
    addListener: jest.fn(() => ({remove: jest.fn()})),
  },
}));

jest.mock('../src/services/navigationService', () => ({
  navigationRef: {
    isReady: () => false,
    current: null,
    canGoBack: () => false,
    navigate: jest.fn(),
    goBack: jest.fn(),
    resetRoot: jest.fn(),
  },
}));

jest.mock('../src/store/FinanceStore', () => ({
  FinanceStoreProvider: ({children}: {children: React.ReactNode}) => children,
}));

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
