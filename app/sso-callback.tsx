import { useAuth } from '@clerk/clerk-expo';
import { Redirect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';

import { Screen, Spinner } from '@/components/ui';

// Completes the in-app browser session when Google OAuth redirects back here.
WebBrowser.maybeCompleteAuthSession();

/**
 * OAuth redirect landing route. Google SSO uses `sso-callback` as the deep-link
 * path (see GoogleButton). Without this screen Expo Router shows "Unmatched route".
 */
export default function SSOCallbackScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const [ready, setReady] = useState(false);

  // Allow Clerk a moment to activate the session after the browser returns.
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      setReady(true);
      return;
    }
    const timer = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || !ready) {
    return (
      <Screen>
        <Spinner centered />
      </Screen>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
