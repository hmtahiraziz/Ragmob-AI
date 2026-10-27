/**
 * Public environment variables (inlined at build time).
 * Never put secrets here — only URLs and Clerk publishable key.
 */

function trimTrailingSlash(url: string) {
  return url.replace(/\/$/, '');
}

function assertHttpsInRelease(url: string, name: string) {
  if (__DEV__) return;
  if (!/^https:\/\//i.test(url)) {
    throw new Error(
      `${name} must be an https:// URL in release builds (got "${url}"). ` +
        `Set it via EAS env for the production profile.`,
    );
  }
}

const rawApiUrl = trimTrailingSlash(
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api',
);
assertHttpsInRelease(rawApiUrl, 'EXPO_PUBLIC_API_URL');

export const API_URL = rawApiUrl;

export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

/** Hosted privacy policy (required for Play). */
export const PRIVACY_POLICY_URL = (
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? ''
).trim();

/** Hosted Terms of Service (store listing / consent). */
export const TERMS_OF_SERVICE_URL = (
  process.env.EXPO_PUBLIC_TERMS_OF_SERVICE_URL ?? ''
).trim();

/** Public account-deletion instructions page (Play Console URL). */
export const ACCOUNT_DELETION_URL = (
  process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL ?? ''
).trim();

/** Optional Sentry DSN — crash reporting is disabled when empty. */
export const SENTRY_DSN = (process.env.EXPO_PUBLIC_SENTRY_DSN ?? '').trim();

if (!CLERK_PUBLISHABLE_KEY) {
  // Root layout also throws; keep a single clear message at import time in release.
  if (!__DEV__) {
    throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY for release builds.');
  }
}

if (!__DEV__) {
  if (CLERK_PUBLISHABLE_KEY.startsWith('pk_test_')) {
    throw new Error(
      'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY must be a pk_live_ key in release builds.',
    );
  }
  if (!CLERK_PUBLISHABLE_KEY.startsWith('pk_live_')) {
    throw new Error(
      'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY must start with pk_live_ in release builds.',
    );
  }
  // Production API must not be a local/dev loopback host.
  if (/localhost|127\.0\.0\.1|10\.0\.2\.2/i.test(API_URL)) {
    throw new Error(
      'EXPO_PUBLIC_API_URL must point at your production HTTPS API in release builds.',
    );
  }
}
