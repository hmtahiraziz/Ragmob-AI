import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@clerk/expo';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already prevented / native splash not available (web).
});

/** Always tear down the native splash once auth is ready (or after a timeout). */
export function SplashScreenController() {
  const { isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    void SplashScreen.hideAsync();
  }, [isLoaded]);

  // Safety net: never leave the native splash (wireframe placeholder) stuck
  // after returning from the Google browser session.
  useEffect(() => {
    const timer = setTimeout(() => {
      void SplashScreen.hideAsync();
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return null;
}

/** Call after OAuth / sign-in completes so splash cannot cover Home. */
export function hideNativeSplash() {
  void SplashScreen.hideAsync();
}
