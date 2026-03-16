import {getToken, refreshAccessToken, saveAuthTokens} from './auth';
import {handleTokenExpired} from './navigationService';
import {API_BASE_URL} from '../config/api';

export const BASE_URL = API_BASE_URL;

export interface ResponseResult<T> {
  code: number;
  message: string;
  success: boolean;
  data: T;
  timestamp: number;
}

let refreshTokenPromise: Promise<string | null> | null = null;

function isTokenExpiredResult(result: ResponseResult<unknown>): boolean {
  const errorMessage = result.message || '';

  return (
    errorMessage.includes('Token已过期') ||
    errorMessage.includes('JWT expired') ||
    errorMessage.includes('Token过期') ||
    errorMessage.includes('Expired') ||
    errorMessage.includes('请重新登录') ||
    result.code === 401
  );
}

async function parseResponseResult<T>(res: Response): Promise<ResponseResult<T>> {
  const text = await res.text();

  if (!text.trim()) {
    throw new Error('服务器响应为空');
  }

  const safeText = text.replace(/:\s*(\d{16,})/g, ': "$1"');

  try {
    return JSON.parse(safeText);
  } catch {
    throw new Error('服务器响应格式错误');
  }
}

async function tryRefreshToken(): Promise<string | null> {
  if (!refreshTokenPromise) {
    refreshTokenPromise = (async () => {
      try {
        const loginResponse = await refreshAccessToken();
        await saveAuthTokens(loginResponse);
        return loginResponse.token;
      } catch {
        await handleTokenExpired();
        return null;
      } finally {
        refreshTokenPromise = null;
      }
    })();
  }

  return refreshTokenPromise;
}

async function sendRequest(
  path: string,
  options: RequestInit,
  token: string | null,
): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
      ...options.headers,
    },
  });
}

/**
 * 带 JWT 认证的通用请求方法
 */
export async function authFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  let res = await sendRequest(path, options, token);

  if (res.status === 401) {
    const newToken = await tryRefreshToken();

    if (!newToken) {
      const error = new Error('登录已过期，请重新登录');
      (error as any).isTokenExpired = true;
      throw error;
    }

    res = await sendRequest(path, options, newToken);
  }

  let result = await parseResponseResult<T>(res);

  if (isTokenExpiredResult(result)) {
    const newToken = await tryRefreshToken();

    if (!newToken) {
      const error = new Error('登录已过期，请重新登录');
      (error as any).isTokenExpired = true;
      throw error;
    }

    res = await sendRequest(path, options, newToken);
    result = await parseResponseResult<T>(res);

    if (res.status === 401 || isTokenExpiredResult(result)) {
      await handleTokenExpired();
      const error = new Error('登录已过期，请重新登录');
      (error as any).isTokenExpired = true;
      throw error;
    }
  }

  if (!res.ok || result.code !== 200) {
    throw new Error(result.message || '请求失败');
  }

  return result.data;
}
