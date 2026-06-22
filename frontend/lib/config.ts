const REQUIRED_API_URL_MESSAGE =
  'Missing EXPO_PUBLIC_API_URL. Add it to frontend/.env before starting the app.';

function normalizeBaseUrl(rawUrl: string) {
  const trimmedUrl = rawUrl.trim().replace(/\/+$/, '');

  try {
    const parsedUrl = new URL(trimmedUrl);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('API URL must start with http:// or https://.');
    }

    const allowsInsecureApiUrl = process.env.EXPO_PUBLIC_ALLOW_INSECURE_API_URL === 'true';
    if (parsedUrl.protocol === 'http:' && !__DEV__ && !allowsInsecureApiUrl) {
      throw new Error(
        'EXPO_PUBLIC_API_URL must use HTTPS outside development, unless EXPO_PUBLIC_ALLOW_INSECURE_API_URL=true is explicitly set.'
      );
    }

    return trimmedUrl;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid EXPO_PUBLIC_API_URL: ${error.message}`);
    }

    throw new Error('Invalid EXPO_PUBLIC_API_URL.');
  }
}

export function getApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!envUrl?.trim()) {
    throw new Error(REQUIRED_API_URL_MESSAGE);
  }

  return normalizeBaseUrl(envUrl);
}

export function getApiAssetUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${getApiBaseUrl()}/${path.replace(/^\/+/, '')}`;
}

export function getPaymentAccount() {
  return {
    bankName: process.env.EXPO_PUBLIC_PAYMENT_BANK_NAME?.trim() ?? '',
    accountName: process.env.EXPO_PUBLIC_PAYMENT_ACCOUNT_NAME?.trim() ?? '',
    accountNumber: process.env.EXPO_PUBLIC_PAYMENT_ACCOUNT_NUMBER?.trim() ?? '',
  };
}

export type SocialAuthProvider = 'google' | 'apple';

export function getSocialAuthUrl(provider: SocialAuthProvider) {
  const envKey =
    provider === 'google' ? 'EXPO_PUBLIC_GOOGLE_AUTH_URL' : 'EXPO_PUBLIC_APPLE_AUTH_URL';
  const authUrl = process.env[envKey]?.trim();

  if (!authUrl) {
    throw new Error(`${provider === 'google' ? 'Google' : 'Apple'} sign-in is not configured.`);
  }

  return authUrl;
}
