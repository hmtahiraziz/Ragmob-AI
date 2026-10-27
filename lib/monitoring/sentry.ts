import type { ComponentType } from 'react';

import { SENTRY_DSN } from '@/lib/env';

/**
 * Crash reporting shim.
 *
 * `@sentry/react-native` needs a dedicated Metro config + native/EAS build to
 * load reliably. Importing it directly breaks Expo Go (`Unable to resolve`).
 * Keep this module dependency-free so the app always bundles; wire Sentry in
 * when you ship a production build (set EXPO_PUBLIC_SENTRY_DSN and run the
 * Sentry Expo wizard / metro config).
 *
 * Until then, {@link ErrorBoundary} still catches render failures in-app.
 */

let initialized = false;

export function initMonitoring() {
  if (initialized) return;
  initialized = true;
  if (__DEV__ && SENTRY_DSN) {
    console.info(
      '[monitoring] EXPO_PUBLIC_SENTRY_DSN is set, but Sentry is not loaded in Expo Go. Use an EAS build for crash reporting.',
    );
  }
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (__DEV__) {
    console.error('[monitoring]', error, context ?? '');
  }
}

export function wrapRoot<T extends ComponentType<Record<string, unknown>>>(
  Component: T,
): T {
  return Component;
}
