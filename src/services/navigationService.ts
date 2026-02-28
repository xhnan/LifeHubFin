import {createNavigationContainerRef} from '@react-navigation/native';
import {removeToken} from './auth';

export const navigationRef = createNavigationContainerRef();

let tokenExpiredCallback: (() => void) | null = null;

/**
 * 注册 Token 过期回调
 */
export function registerTokenExpiredCallback(callback: () => void) {
  tokenExpiredCallback = callback;
}

/**
 * 处理 Token 过期
 */
export async function handleTokenExpired() {
  // 清除本地 Token
  await removeToken();

  // 调用回调函数，通知 App 组件更新状态
  if (tokenExpiredCallback) {
    tokenExpiredCallback();
  }
}
