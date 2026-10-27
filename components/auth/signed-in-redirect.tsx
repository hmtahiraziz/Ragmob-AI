import { useAuth } from '@clerk/expo';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { hideNativeSplash } from '@/components/splash-controller';

/**
 * After Google / email sign-in, Stack.Protected remounts (tabs) but the URL can
 * still sit under (auth). This forces Home whenever a session exists outside the app.
 */
export function SignedInRedirect() {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const root = segments[0];
    const isLegal = root === 'privacy-policy' || root === 'terms-of-service';
    const inApp = root === '(tabs)' || root === 'profile' || isLegal;
    if (inApp) return;

    hideNativeSplash();
    router.replace('/(tabs)');
  }, [isLoaded, isSignedIn, segments, router]);

  return null;
}
