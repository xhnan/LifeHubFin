import AsyncStorage from '@react-native-async-storage/async-storage';
import {BASE_URL, ResponseResult} from './api';
import {AuthError, NetworkError, ServerError} from './errors';

const TOKEN_KEY = 'jwt_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

const NETWORK_ERROR_MESSAGE = '\u7f51\u7edc\u8fde\u63a5\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5';
const AUTH_FAILED_MESSAGE = '\u8ba4\u8bc1\u5931\u8d25';
const MISSING_REFRESH_TOKEN_MESSAGE = '\u7f3a\u5c11\u5237\u65b0\u4ee4\u724c';
const INVALID_RESPONSE_MESSAGE = '\u670d\u52a1\u5668\u54cd\u5e94\u683c\u5f0f\u9519\u8bef';
const REFRESH_AUTH_FAILED_MESSAGE =
  '\u5237\u65b0\u767b\u5f55\u72b6\u6001\u5931\u8d25';

export interface LoginResponse {
  token: string;
  refreshToken: string;
}

async function postJson<T>(path: string, options: RequestInit): Promise<ResponseResult<T>> {
  let res: Response;

  try {
    res = await fetch(`${BASE_URL}${path}`, options);
  } catch (error) {
    throw new NetworkError(NETWORK_ERROR_MESSAGE, {cause: error});
  }

  const result: ResponseResult<T> = await res.json();

  if (!res.ok || result.code !== 200) {
    throw new AuthError(result.message || AUTH_FAILED_MESSAGE, {
      code: result.code || res.status,
      details: result,
    });
  }

  return result;
}

export async function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const result = await postJson<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({username, password}),
  });

  return result.data;
}

export async function refreshAccessToken(): Promise<LoginResponse> {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    console.warn('[Auth] No refresh token available');
    throw new AuthError(MISSING_REFRESH_TOKEN_MESSAGE);
  }

  console.log('[Auth] Calling refresh token API...');
  let res: Response;

  try {
    res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        Accept: 'application/json',
      },
      body: refreshToken,
    });
  } catch (error) {
    console.warn('[Auth] Refresh token network error:', error);
    throw new NetworkError(NETWORK_ERROR_MESSAGE, {cause: error});
  }

  console.log('[Auth] Refresh token API response status:', res.status);

  let result: ResponseResult<LoginResponse>;

  try {
    result = await res.json();
  } catch (error) {
    console.warn('[Auth] Failed to parse refresh response:', error);
    throw new ServerError(INVALID_RESPONSE_MESSAGE, {cause: error});
  }

  if (!res.ok || result.code !== 200) {
    console.warn('[Auth] Refresh token failed:', result.message, 'code:', result.code);
    throw new AuthError(result.message || REFRESH_AUTH_FAILED_MESSAGE, {
      code: result.code || res.status,
      details: result,
    });
  }

  console.log('[Auth] Refresh token succeeded');
  return result.data;
}

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function saveRefreshToken(refreshToken: string): Promise<void> {
  await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export async function saveAuthTokens({
  token,
  refreshToken,
}: LoginResponse): Promise<void> {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [REFRESH_TOKEN_KEY, refreshToken],
  ]);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function removeToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function removeAuthTokens(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]);
}
