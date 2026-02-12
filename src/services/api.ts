import {getToken} from './auth';

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

  const text = await res.text();
  // 将超过安全整数范围的数字转为字符串，避免精度丢失
  const safeText = text.replace(
    /:\s*(\d{16,})/g,
    ': "$1"',
  );
  const result: ResponseResult<T> = JSON.parse(safeText);

  if (!res.ok || result.code !== 200) {
    throw new Error(result.message || '请求失败');
  }

  return result.data;
}
