import { useAuth } from '@clerk/expo';
import { Redirect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';

import { hideNativeSplash } from '@/components/splash-controller';
import { Screen, Spinner } from '@/components/ui';

WebBrowser.maybeCompleteAuthSession();

/**
 * Deep-link landing after Google OAuth.
 * Primary completion is in GoogleButton; this route catches Expo Go redirects.
 */
export default function SSOCallbackScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    hideNativeSplash();
  }, []);

  useEffect(() => {
    if (!isLoaded || isSignedIn) return;
    const t = setTimeout(() => setWaited(true), 2000);
    return () => clearTimeout(t);
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || (!isSignedIn && !waited)) {
    return (
      <Screen>
        <Spinner centered label="Finishing sign-in…" />
      </Screen>
    );
  }

  return <Redirect href={isSignedIn ? '/(tabs)' : '/(auth)/sign-in'} />;
}
