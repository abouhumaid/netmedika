import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'netmedika_access_token';
const REFRESH_TOKEN_KEY = 'netmedika_refresh_token';

async function setStorageItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getStorageItem(key: string) {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(key) ?? null;
  }

  return SecureStore.getItemAsync(key);
}

async function deleteStorageItem(key: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export async function saveAuthSession(tokens: { accessToken: string; refreshToken: string }) {
  await Promise.all([
    setStorageItem(ACCESS_TOKEN_KEY, tokens.accessToken),
    setStorageItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function getAccessToken() {
  return getStorageItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return getStorageItem(REFRESH_TOKEN_KEY);
}

export async function clearAuthSession() {
  await Promise.all([deleteStorageItem(ACCESS_TOKEN_KEY), deleteStorageItem(REFRESH_TOKEN_KEY)]);
}
