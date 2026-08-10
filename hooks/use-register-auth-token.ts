import { useAuth } from '@clerk/clerk-expo';
import { useEffect } from 'react';

import { registerTokenGetter } from '@/lib/auth/token';

/**
 * Registers Clerk's getToken with the API token bridge.
 * Mount once inside ClerkProvider (e.g. root layout).
 */
export function useRegisterAuthToken() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      registerTokenGetter(null);
      return;
    }

    registerTokenGetter(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });

    return () => registerTokenGetter(null);
  }, [getToken, isLoaded, isSignedIn]);
}
