import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';

/**
 * Warms up Android Custom Tabs so the OAuth sheet opens faster.
 * No-op on iOS and web.
 */
export function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}
