import {createNavigationContainerRef} from '@react-navigation/native';

import type {RootStackParamList} from '../navigation/types';
import {removeAuthTokens} from './auth';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const tokenExpiredListeners = new Set<() => void>();
let handleTokenExpiredPromise: Promise<void> | null = null;

export function registerTokenExpiredCallback(callback: () => void): () => void {
  tokenExpiredListeners.add(callback);

  return () => {
    tokenExpiredListeners.delete(callback);
  };
}

export async function handleTokenExpired() {
  if (!handleTokenExpiredPromise) {
    handleTokenExpiredPromise = (async () => {
      await removeAuthTokens();

      tokenExpiredListeners.forEach(listener => {
        listener();
      });
    })().finally(() => {
      handleTokenExpiredPromise = null;
    });
  }

  await handleTokenExpiredPromise;
}

export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName],
) {
  if (navigationRef.isReady()) {
    // React Navigation's typed navigate cannot narrow the tuple from a generic
    // RouteName, so we cast the arguments while keeping the wrapper type-safe.
    (navigationRef.navigate as (...args: [RouteName, RootStackParamList[RouteName]?]) => void)(
      name,
      params,
    );
  }
}

export function reset<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName],
) {
  if (navigationRef.isReady()) {
    navigationRef.resetRoot({
      index: 0,
      routes: [{name, params}],
    });
  }
}

export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}

export async function logout() {
  await handleTokenExpired();
}
