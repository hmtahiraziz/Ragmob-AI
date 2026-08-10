import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';

/**
 * Warms up the Android Custom Tabs browser so the OAuth sheet opens instantly,
 * and cools it down on unmount. No-op on iOS and web.
 */
export function useWarmUpBrowser() {
  useEffect(() => {
    if (process.env.EXPO_OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}
