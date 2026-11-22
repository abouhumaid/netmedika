import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { getSocialAuthUrl, type SocialAuthProvider } from '@/lib/config';

WebBrowser.maybeCompleteAuthSession();

export type SocialAuthResult = {
  accessToken: string;
  refreshToken: string;
  role?: string;
};

function appendRedirectUrl(authUrl: string, redirectUrl: string) {
  const url = new URL(authUrl);

  if (!url.searchParams.has('redirect_uri')) {
    url.searchParams.set('redirect_uri', redirectUrl);
  }

  return url.toString();
}

function getCallbackParam(callbackUrl: string, key: string) {
  const url = new URL(callbackUrl);
  const queryValue = url.searchParams.get(key);

  if (queryValue) {
    return queryValue;
  }

  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
  return hashParams.get(key);
}

export async function startSocialAuth(provider: SocialAuthProvider): Promise<SocialAuthResult> {
  const redirectUrl = Linking.createURL('auth/callback');
  const authUrl = appendRedirectUrl(getSocialAuthUrl(provider), redirectUrl);
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

  if (result.type !== 'success') {
    throw new Error('Sign-in was cancelled.');
  }

  const accessToken = getCallbackParam(result.url, 'access_token');
  const refreshToken = getCallbackParam(result.url, 'refresh_token');
  const role = getCallbackParam(result.url, 'role') ?? undefined;
  const error = getCallbackParam(result.url, 'error');

  if (error) {
    throw new Error(error);
  }

  if (!accessToken || !refreshToken) {
    throw new Error('Social sign-in completed, but the server did not return session tokens.');
  }

  return { accessToken, refreshToken, role };
}
