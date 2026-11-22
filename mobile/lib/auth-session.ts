import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'netmedika_access_token';
const REFRESH_TOKEN_KEY = 'netmedika_refresh_token';

async function setStorageItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    globalThis.sessionStorage?.setItem(key, value);
    globalThis.localStorage?.removeItem(key);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getStorageItem(key: string) {
  if (Platform.OS === 'web') {
    const sessionValue = globalThis.sessionStorage?.getItem(key);
    if (sessionValue) {
      return sessionValue;
    }

    const legacyValue = globalThis.localStorage?.getItem(key);
    if (legacyValue) {
      globalThis.sessionStorage?.setItem(key, legacyValue);
      globalThis.localStorage?.removeItem(key);
    }

    return legacyValue ?? null;
  }

  return SecureStore.getItemAsync(key);
}

async function deleteStorageItem(key: string) {
  if (Platform.OS === 'web') {
    globalThis.sessionStorage?.removeItem(key);
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
