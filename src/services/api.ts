import {getToken} from './auth';
import {handleTokenExpired} from './navigationService';

export const BASE_URL = 'http://10.0.2.2:9000';

export interface ResponseResult<T> {
  code: number;
  message: string;
  success: boolean;
  data: T;
  timestamp: number;
}

/**
 * 带 JWT 认证的通用请求方法
 */
export async function authFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
      ...options.headers,
    },
  });

  // 首先检查 HTTP 401
  if (res.status === 401) {
    await handleTokenExpired();
    const error = new Error('登录已过期，请重新登录');
    (error as any).isTokenExpired = true;
    throw error;
  }

  const text = await res.text();
  // 将超过安全整数范围的数字转为字符串，避免精度丢失
  const safeText = text.replace(
    /:\s*(\d{16,})/g,
    ': "$1"',
  );

  let result: ResponseResult<T>;
  try {
    result = JSON.parse(safeText);
  } catch (e) {
    throw new Error('服务器响应格式错误');
  }

  // 检查响应体中的 Token 过期
  const errorMessage = result.message || '';
  const isTokenExpired =
    errorMessage.includes('Token已过期') ||
    errorMessage.includes('JWT expired') ||
    errorMessage.includes('Token过期') ||
    errorMessage.includes('Expired') ||
    errorMessage.includes('请重新登录') ||
    result.code === 401;

  if (isTokenExpired) {
    await handleTokenExpired();
    const error = new Error('登录已过期，请重新登录');
    (error as any).isTokenExpired = true;
    throw error;
  }

  if (!res.ok || result.code !== 200) {
    throw new Error(errorMessage || '请求失败');
  }

  return result.data;
}
