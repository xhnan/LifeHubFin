import AsyncStorage from '@react-native-async-storage/async-storage';
import {BASE_URL, ResponseResult} from './api';

const TOKEN_KEY = 'jwt_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export interface LoginResponse {
  token: string;
  refreshToken: string;
}

export async function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({username, password}),
  });

  const result: ResponseResult<LoginResponse> = await res.json();

  if (!res.ok || result.code !== 200) {
    throw new Error(result.message || '登录失败');
  }

  return result.data;
}

export async function refreshAccessToken(): Promise<LoginResponse> {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    throw new Error('缺少刷新令牌');
  }

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      Accept: 'application/json',
    },
    body: refreshToken,
  });

  const result: ResponseResult<LoginResponse> = await res.json();

  if (!res.ok || result.code !== 200) {
    throw new Error(result.message || '刷新登录状态失败');
  }

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
