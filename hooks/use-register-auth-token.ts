import { useAuth } from '@clerk/clerk-expo';
import { useEffect } from 'react';

import { registerTokenGetter } from '@/lib/auth/token';

/**
 * Registers Clerk's getToken with the API token bridge.
 * Mount once inside ClerkProvider (e.g. root layout).
 */
export function useRegisterAuthToken() {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    registerTokenGetter(() => getToken());
    return () => registerTokenGetter(null);
  }, [getToken, isLoaded]);
}
