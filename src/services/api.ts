import {getToken, refreshAccessToken, saveAuthTokens} from './auth';
import {AuthError, NetworkError, ServerError} from './errors';
import {handleTokenExpired} from './navigationService';
import {API_BASE_URL} from '../config/api';

export const BASE_URL = API_BASE_URL;

const TOKEN_EXPIRED_MESSAGE_PATTERNS = [
  'jwt expired',
  'token\u5df2\u8fc7\u671f',
  'token\u8fc7\u671f',
  '\u767b\u5f55\u72b6\u6001\u5df2\u5931\u6548',
  '\u8bf7\u91cd\u65b0\u767b\u5f55',
] as const;

const EMPTY_RESPONSE_MESSAGE = '\u670d\u52a1\u5668\u54cd\u5e94\u4e3a\u7a7a';
const INVALID_RESPONSE_MESSAGE = '\u670d\u52a1\u5668\u54cd\u5e94\u683c\u5f0f\u9519\u8bef';
const NETWORK_ERROR_MESSAGE = '\u7f51\u7edc\u8fde\u63a5\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5';
const AUTH_EXPIRED_MESSAGE =
  '\u767b\u5f55\u72b6\u6001\u5df2\u5931\u6548\uff0c\u8bf7\u91cd\u65b0\u767b\u5f55';
const REQUEST_FAILED_MESSAGE = '\u8bf7\u6c42\u5931\u8d25';

export interface ResponseResult<T> {
  code: number;
  message: string;
  success: boolean;
  data: T;
  timestamp: number;
}

let refreshTokenPromise: Promise<string | null> | null = null;

function isTokenExpiredResult(result: ResponseResult<unknown>): boolean {
  const errorMessage = (result.message || '').trim().toLowerCase();

  return (
    result.code === 401 ||
    TOKEN_EXPIRED_MESSAGE_PATTERNS.some(pattern => errorMessage.includes(pattern))
  );
}

async function parseResponseResult<T>(res: Response): Promise<ResponseResult<T>> {
  const text = await res.text();

  if (!text.trim()) {
    throw new ServerError(EMPTY_RESPONSE_MESSAGE);
  }

  const safeText = text.replace(/:\s*(\d{16,})/g, ': "$1"');

  try {
    return JSON.parse(safeText);
  } catch (error) {
    throw new ServerError(INVALID_RESPONSE_MESSAGE, {cause: error});
  }
}

async function tryRefreshToken(): Promise<string | null> {
  if (!refreshTokenPromise) {
    refreshTokenPromise = (async () => {
      try {
        console.log('[TokenRefresh] Starting token refresh...');
        const loginResponse = await refreshAccessToken();
        await saveAuthTokens(loginResponse);
        console.log('[TokenRefresh] Token refresh succeeded');
        return loginResponse.token;
      } catch (error) {
        console.warn('[TokenRefresh] Token refresh failed:', error);
        if (error instanceof NetworkError) {
          // Network errors should not log user out — token may still be valid
          throw error;
        }
        await handleTokenExpired();
        return null;
      } finally {
        refreshTokenPromise = null;
      }
    })();
  } else {
    console.log('[TokenRefresh] Waiting for existing refresh promise...');
  }

  return refreshTokenPromise;
}

async function sendRequest(
  path: string,
  options: RequestInit,
  token: string | null,
): Promise<Response> {
  try {
    return await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? {Authorization: `Bearer ${token}`} : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    throw new NetworkError(NETWORK_ERROR_MESSAGE, {cause: error});
  }
}

function createAuthExpiredError(): AuthError {
  return new AuthError(AUTH_EXPIRED_MESSAGE, {
    isTokenExpired: true,
  });
}

export async function authFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  let res = await sendRequest(path, options, token);

  if (res.status === 401) {
    console.log('[AuthFetch] Got 401, attempting token refresh...');
    const newToken = await tryRefreshToken();

    if (!newToken) {
      console.log('[AuthFetch] Token refresh failed, throwing auth error');
      throw createAuthExpiredError();
    }

    console.log('[AuthFetch] Retrying request with new token');
    res = await sendRequest(path, options, newToken);
  }

  let result = await parseResponseResult<T>(res);

  if (isTokenExpiredResult(result)) {
    console.log('[AuthFetch] Token expired detected in response body:', result.message);
    const newToken = await tryRefreshToken();

    if (!newToken) {
      throw createAuthExpiredError();
    }

    res = await sendRequest(path, options, newToken);
    result = await parseResponseResult<T>(res);

    if (res.status === 401 || isTokenExpiredResult(result)) {
      console.log('[AuthFetch] Token still expired after refresh, logging out');
      await handleTokenExpired();
      throw createAuthExpiredError();
    }
  }

  if (!res.ok || result.code !== 200) {
    if (res.status === 401 || result.code === 401) {
      throw new AuthError(result.message || AUTH_EXPIRED_MESSAGE, {
        code: result.code || res.status,
        details: result,
        isTokenExpired: true,
      });
    }

    throw new ServerError(result.message || REQUEST_FAILED_MESSAGE, {
      code: result.code || res.status,
      details: result,
    });
  }

  return result.data;
}
