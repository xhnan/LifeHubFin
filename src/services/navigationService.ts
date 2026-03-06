import { createNavigationContainerRef } from '@react-navigation/native';
import { removeToken } from './auth';

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

/**
 * 导航辅助函数
 */
export function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    (navigationRef as any).navigate(name, params);
  }
}

/**
 * 重置导航到指定页面
 */
export function reset(name: string, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.resetRoot({
      index: 0,
      routes: [{ name, params }],
    } as never);
  }
}

/**
 * 返回上一页
 */
export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}

/**
 * 退出登录
 */
export async function logout() {
  await handleTokenExpired();
}
