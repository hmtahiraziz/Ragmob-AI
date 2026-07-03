import { isClerkAPIResponseError, useSSO } from '@clerk/clerk-expo';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';

import { GoogleIcon } from '@/components/auth/google-icon';
import { Button } from '@/components/ui';
import { useWarmUpBrowser } from '@/hooks/use-warm-up-browser';

// Dismisses the web browser when the OAuth redirect returns to the app.
WebBrowser.maybeCompleteAuthSession();

type GoogleButtonProps = {
  /** Called with a user-facing message on failure, or empty string to clear. */
  onError: (message: string) => void;
};

/**
 * "Continue with Google" via Clerk SSO. Handles both sign-in and sign-up:
 * Clerk transfers a new Google identity into a sign-up automatically.
 */
export function GoogleButton({ onError }: GoogleButtonProps) {
  useWarmUpBrowser();
  const { startSSOFlow } = useSSO();
  const [loading, setLoading] = useState(false);

  const handlePress = useCallback(async () => {
    setLoading(true);
    onError('');
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        // Resolves to the exp:// URL in Expo Go and the ragmob:// scheme in
        // dev/standalone builds, so the redirect round-trip always completes.
        redirectUrl: AuthSession.makeRedirectUri({ path: 'sso-callback' }),
      });

      if (createdSessionId && setActive) {
        // The root Stack.Protected guard routes to (tabs) once the session is active.
        await setActive({ session: createdSessionId });
      }
      // No session id means the user cancelled or more steps are required.
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        onError(err.errors[0]?.longMessage ?? err.errors[0]?.message ?? 'Google sign-in failed');
      } else {
        onError('Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [startSSOFlow, onError]);

  return (
    <Button
      title="Continue with Google"
      variant="secondary"
      fullWidth
      loading={loading}
      onPress={handlePress}
      leading={<GoogleIcon size={18} />}
    />
  );
}
