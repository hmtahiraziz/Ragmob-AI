import { useAuth } from '@clerk/expo';
import { useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { hideNativeSplash } from '@/components/splash-controller';

/**
 * Keeps the URL aligned with the Clerk session after Google / email auth.
 * Uses router.replace (not Redirect) so it still works when the Stack remounts
 * with a new key on isSignedIn.
 */
export function AuthRedirect() {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navState = useRootNavigationState();

  useEffect(() => {
    if (!isLoaded || !navState?.key) return;

    const root = segments[0];
    const isLegal = root === 'privacy-policy' || root === 'terms-of-service';
    const inApp = root === '(tabs)' || root === 'profile' || isLegal;
    const inAuth = root === '(auth)';
    const onOAuthCallback = root === 'sso-callback';

    // Legal screens are public (Settings + consent gate) — never bounce them.
    if (isLegal || onOAuthCallback) {
      return;
    }

    if (isSignedIn) {
      if (!inApp) {
        hideNativeSplash();
        router.replace('/(tabs)');
      }
      return;
    }

    if (inApp || !inAuth) {
      router.replace('/(auth)/sign-in');
    }
  }, [isLoaded, isSignedIn, segments, router, navState?.key]);

  return null;
}
