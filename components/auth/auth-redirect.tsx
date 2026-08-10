import { useAuth } from '@clerk/clerk-expo';
import { Redirect, useSegments } from 'expo-router';

/**
 * Forces navigation when auth state and current route disagree.
 * Stack.Protected alone can miss redirects from nested tab routes on sign-out.
 */
export function AuthRedirect() {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();

  if (!isLoaded) return null;

  const inAuthGroup = segments[0] === '(auth)';
  const onOAuthCallback = segments[0] === 'sso-callback';

  if (!isSignedIn && !inAuthGroup && !onOAuthCallback) {
    return <Redirect href="/sign-in" />;
  }

  return null;
}
