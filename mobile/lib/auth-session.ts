import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { getApiBaseUrl } from '@/lib/config';

const ACCESS_TOKEN_KEY = 'netmedika_access_token';
const REFRESH_TOKEN_KEY = 'netmedika_refresh_token';

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  detail?: string;
};

let accessToken: string | null = null;
let refreshToken: string | null = null;
let userRole: string | null = null;
let initialization: Promise<void> | null = null;
let refreshInFlight: Promise<string | null> | null = null;
let sessionGeneration = 0;

async function removePersistedTokens() {
  if (Platform.OS === 'web') {
    try {
      globalThis.sessionStorage?.removeItem(ACCESS_TOKEN_KEY);
      globalThis.sessionStorage?.removeItem(REFRESH_TOKEN_KEY);
      globalThis.localStorage?.removeItem(ACCESS_TOKEN_KEY);
      globalThis.localStorage?.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // Storage may be unavailable in a restricted browser context.
    }
    return;
  }

  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => undefined),
  ]);
}

/** Clear old persisted credentials once per app process. New sessions stay in memory. */
export function initializeAuthSession() {
  if (!initialization) {
    initialization = removePersistedTokens();
  }
  return initialization;
}

function getTokenExpiry(token: string) {
  try {
    const payload = token.split('.')[1];
    if (!payload || typeof globalThis.atob !== 'function') return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = globalThis.atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const claims = JSON.parse(decoded) as { exp?: unknown };
    return typeof claims.exp === 'number' ? claims.exp : null;
  } catch {
    return null;
  }
}

async function refreshAccessToken() {
  if (!refreshToken) return null;
  if (refreshInFlight) return refreshInFlight;

  const generation = sessionGeneration;
  const currentRefreshToken = refreshToken;
  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: currentRefreshToken }),
      });
      const data = (await response.json().catch(() => null)) as TokenResponse | null;

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          if (sessionGeneration === generation) {
            accessToken = null;
            refreshToken = null;
            userRole = null;
            sessionGeneration += 1;
          }
          return null;
        }
        // Keep the current session on transient server errors.
        return null;
      }

      if (!data?.access_token || !data.refresh_token || sessionGeneration !== generation) {
        return sessionGeneration === generation ? accessToken : null;
      }

      accessToken = data.access_token;
      refreshToken = data.refresh_token;
      return accessToken;
    } catch {
      // A temporary network failure must not sign the user out.
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function saveAuthSession(tokens: {
  accessToken: string;
  refreshToken: string;
  role?: string;
}) {
  await initializeAuthSession();
  sessionGeneration += 1;
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  userRole = tokens.role ?? null;
}

export async function getAccessToken() {
  await initializeAuthSession();
  if (!accessToken) return null;

  const expiresAt = getTokenExpiry(accessToken);
  if (expiresAt === null || expiresAt > Date.now() / 1000 + 60) return accessToken;

  const refreshedToken = await refreshAccessToken();
  if (refreshedToken) return refreshedToken;
  if (accessToken) {
    throw new Error('Unable to refresh your session. Check your connection and try again.');
  }
  return null;
}

export async function getRefreshToken() {
  await initializeAuthSession();
  return refreshToken;
}

export async function getUserRole() {
  await initializeAuthSession();
  return userRole;
}

export async function clearAuthSession() {
  sessionGeneration += 1;
  accessToken = null;
  refreshToken = null;
  userRole = null;
  await removePersistedTokens();
}
