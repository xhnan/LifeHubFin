import AsyncStorage from '@react-native-async-storage/async-storage';
import {BASE_URL, ResponseResult} from './api';

const TOKEN_KEY = 'jwt_token';

interface LoginResponse {
  token: string;
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

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function removeToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}
