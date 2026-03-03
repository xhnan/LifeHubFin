/**
 * API 配置
 * 自动根据构建类型切换环境
 */

// 开发环境 API 地址（Android 模拟器访问本地）
const DEV_API_BASE_URL = 'http://10.0.2.2:9000';

// 生产环境 API 地址
const PROD_API_BASE_URL = 'https://api.xhnya.top';

/**
 * 检测当前环境
 * - __DEV__ 是 React Native 全局变量
 * - 开发模式（npm start）：__DEV__ = true
 * - 发布版本（release）：__DEV__ = false
 */
const isProduction = !__DEV__;

/**
 * 获取 API 基础地址
 */
export function getApiBaseUrl(): string {
  return isProduction ? PROD_API_BASE_URL : DEV_API_BASE_URL;
}

/**
 * 当前环境（导出方便调试）
 */
export const ENV: 'development' | 'production' = isProduction ? 'production' : 'development';

/**
 * API 基础地址（导出方便使用）
 */
export const API_BASE_URL = getApiBaseUrl();

/**
 * 其他 API 配置
 */
export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};
