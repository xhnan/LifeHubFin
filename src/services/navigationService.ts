import {createNavigationContainerRef} from '@react-navigation/native';

import type {RootStackParamList} from '../navigation/types';
import {removeAuthTokens} from './auth';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let tokenExpiredCallback: (() => void) | null = null;

export function registerTokenExpiredCallback(callback: () => void) {
  tokenExpiredCallback = callback;
}

export async function handleTokenExpired() {
  await removeAuthTokens();

  if (tokenExpiredCallback) {
    tokenExpiredCallback();
  }
}

export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName],
) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
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
