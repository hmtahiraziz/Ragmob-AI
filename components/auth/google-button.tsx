import { isClerkAPIResponseError, useAuth, useSSO } from '@clerk/expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { GoogleIcon } from '@/components/auth/google-icon';
import { hideNativeSplash } from '@/components/splash-controller';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWarmUpBrowser } from '@/hooks/use-warm-up-browser';

WebBrowser.maybeCompleteAuthSession();

type GoogleButtonProps = {
  onError: (message: string) => void;
};

type OauthSignUp = {
  status: string | null;
  missingFields?: string[] | null;
  optionalFields?: string[] | null;
  unverifiedFields?: string[] | null;
  emailAddress?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  createdSessionId?: string | null;
  create: (params: { transfer: true }) => Promise<OauthSignUp>;
  update: (params: {
    firstName?: string;
    lastName?: string;
    username?: string;
    legalAccepted?: boolean;
  }) => Promise<OauthSignUp>;
};

type OauthSignIn = {
  status: string | null;
  createdSessionId?: string | null;
};

/**
 * Expo Go + tunnel: Linking.createURL returns `ragmob://…` (custom scheme +
 * expo-hosted host). Expo Go cannot open that. Prefer `exp://host/--/sso-callback`.
 *
 * Note: on some Expo Go / SDK 58 builds `appOwnership` is `null`, so also detect
 * via hostUri (tunnel / LAN) and StoreClient.
 */
export function getGoogleRedirectUrl() {
  const host =
    Constants.expoConfig?.hostUri ||
    Constants.linkingUri
      ?.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
      .split('/')[0]
      .split('?')[0] ||
    '';

  const looksLikeExpoGoHost =
    Boolean(host) &&
    (host.includes('expo.app') ||
      host.includes('exp.direct') ||
      host.includes('localhost') ||
      /^\d+\.\d+\.\d+\.\d+/.test(host));

  const inExpoGo =
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    looksLikeExpoGoHost;

  if (inExpoGo && host) {
    return `exp://${host}/--/sso-callback`;
  }

  // Dev client / production builds use the app scheme.
  return 'ragmob://sso-callback';
}

function nameFromEmail(email: string | null | undefined): { firstName: string; lastName: string } {
  const local = (email ?? '').split('@')[0]?.trim() || 'User';
  const parts = local.split(/[._+\-]+/).filter(Boolean);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  if (parts.length >= 2) {
    return { firstName: cap(parts[0]!), lastName: cap(parts[1]!) };
  }
  return { firstName: cap(parts[0] ?? 'User'), lastName: 'Account' };
}

function usernameFromEmail(email: string | null | undefined): string {
  const local = (email ?? 'user').split('@')[0]?.replace(/[^a-zA-Z0-9_]/g, '') || 'user';
  const base = local.slice(0, 20).toLowerCase();
  return `${base}${Math.floor(Math.random() * 900 + 100)}`;
}

/**
 * Fill name / legal / username when Clerk still requires them after Google OAuth.
 * Password (and phone) cannot be invented — those must be Optional in the dashboard.
 */
async function completeMissingSignUp(signUp: OauthSignUp): Promise<OauthSignUp> {
  const missing = new Set(signUp.missingFields ?? []);
  const fromEmail = nameFromEmail(signUp.emailAddress);

  // Even when missingFields is empty, a missing_requirements status often still
  // advances after we push name + legalAccepted (Clerk progressive sign-up quirk).
  const params: {
    firstName?: string;
    lastName?: string;
    username?: string;
    legalAccepted?: boolean;
  } = {};

  const needsFirst =
    missing.size === 0 || missing.has('first_name') || !signUp.firstName?.trim();
  const needsLast =
    missing.size === 0 || missing.has('last_name') || !signUp.lastName?.trim();
  const needsLegal = missing.size === 0 || missing.has('legal_accepted');
  const needsUsername = missing.has('username');

  if (needsFirst) params.firstName = signUp.firstName?.trim() || fromEmail.firstName;
  if (needsLast) params.lastName = signUp.lastName?.trim() || fromEmail.lastName;
  if (needsLegal) params.legalAccepted = true;
  if (needsUsername) params.username = signUp.username?.trim() || usernameFromEmail(signUp.emailAddress);

  if (missing.has('password')) {
    throw new Error(
      'Google sign-up needs a password field. In Clerk Dashboard → User & authentication → Password, turn off “required for sign-up” (keep optional for email login).',
    );
  }
  if (missing.has('phone_number')) {
    throw new Error(
      'Google sign-up needs a phone number. In Clerk Dashboard, set Phone to Optional.',
    );
  }

  if (__DEV__) {
    console.log('[Google SSO] completing missing fields', {
      missing: [...missing],
      unverified: signUp.unverifiedFields,
      params,
    });
  }

  return signUp.update(params);
}

/** OAuth sometimes lands on sign-in; transfer into sign-up to finish account creation. */
async function maybeTransferToSignUp(
  signIn: OauthSignIn | null | undefined,
  signUp: OauthSignUp | null | undefined,
): Promise<OauthSignUp | null | undefined> {
  if (!signUp?.create) return signUp;
  if (signUp.status === 'complete' && signUp.createdSessionId) return signUp;
  if (!signIn) return signUp;

  // Transfer when sign-in exists but no session, or sign-up still incomplete.
  const shouldTransfer =
    !signIn.createdSessionId ||
    signUp.status === 'missing_requirements' ||
    signUp.status === null;

  if (!shouldTransfer) return signUp;

  try {
    if (__DEV__) console.log('[Google SSO] attempting transfer: true');
    return await signUp.create({ transfer: true });
  } catch (err) {
    if (__DEV__) console.warn('[Google SSO] transfer skipped', err);
    return signUp;
  }
}

export function GoogleButton({ onError }: GoogleButtonProps) {
  useWarmUpBrowser();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();
  const [loading, setLoading] = useState(false);
  const pendingRef = useRef(false);

  const goHome = useCallback(() => {
    hideNativeSplash();
    pendingRef.current = false;
    setLoading(false);
    router.replace('/(tabs)');
  }, [router]);

  useEffect(() => {
    if (isSignedIn && (pendingRef.current || loading)) {
      goHome();
    }
  }, [isSignedIn, loading, goHome]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !pendingRef.current) return;
      setTimeout(() => {
        if (pendingRef.current && isSignedIn) goHome();
      }, 400);
    });
    return () => sub.remove();
  }, [goHome, isSignedIn]);

  const finishSession = useCallback(
    async (setActive: (args: { session: string }) => Promise<void>, sessionId: string) => {
      await setActive({ session: sessionId });
      goHome();
    },
    [goHome],
  );

  const handlePress = useCallback(async () => {
    setLoading(true);
    pendingRef.current = true;
    onError('');

    const redirectUrl = getGoogleRedirectUrl();
    if (__DEV__) {
      console.log('[Google SSO] redirectUrl →', redirectUrl, {
        appOwnership: Constants.appOwnership,
      });
    }

    const watchdog = setTimeout(() => {
      if (!pendingRef.current) return;
      pendingRef.current = false;
      setLoading(false);
      onError(
        `Google sign-in timed out. Allowlist this exact URL in Clerk → Native applications → Mobile SSO redirects:\n${redirectUrl}`,
      );
    }, 60_000);

    try {
      const { createdSessionId, setActive, signIn, signUp, authSessionResult } =
        await startSSOFlow({
          strategy: 'oauth_google',
          redirectUrl,
          ...(Platform.OS === 'android'
            ? { authSessionOptions: { showInRecents: true } }
            : {}),
        });

      if (__DEV__) {
        console.log('[Google SSO] result', {
          createdSessionId,
          authType: authSessionResult?.type,
          signIn: signIn?.status,
          signUp: signUp?.status,
          missingFields: signUp?.missingFields,
          unverifiedFields: signUp?.unverifiedFields,
        });
      }

      if (authSessionResult?.type === 'cancel') {
        return;
      }

      if (createdSessionId && setActive) {
        await finishSession(setActive, createdSessionId);
        return;
      }

      let activeSignUp = await maybeTransferToSignUp(
        signIn as OauthSignIn | undefined,
        signUp as unknown as OauthSignUp | undefined,
      );

      if (activeSignUp?.status === 'missing_requirements') {
        activeSignUp = await completeMissingSignUp(activeSignUp);
      }

      // Second pass if Clerk still reports missing after first update.
      if (activeSignUp?.status === 'missing_requirements') {
        activeSignUp = await completeMissingSignUp(activeSignUp);
      }

      if (activeSignUp?.status === 'complete' && activeSignUp.createdSessionId && setActive) {
        await finishSession(setActive, activeSignUp.createdSessionId);
        return;
      }

      if (signIn?.status === 'complete' && signIn.createdSessionId && setActive) {
        await finishSession(setActive, signIn.createdSessionId);
        return;
      }

      if (signIn?.createdSessionId && setActive) {
        await finishSession(setActive, signIn.createdSessionId);
        return;
      }

      if (activeSignUp?.createdSessionId && setActive) {
        await finishSession(setActive, activeSignUp.createdSessionId);
        return;
      }

      if (activeSignUp?.status === 'missing_requirements') {
        const fields =
          (activeSignUp.missingFields?.length
            ? activeSignUp.missingFields
            : activeSignUp.unverifiedFields
          )?.join(', ') || 'profile fields';
        onError(
          `Google sign-up still needs: ${fields}. Set those to Optional in Clerk Dashboard → User & authentication.`,
        );
        return;
      }

      // User closed the browser without finishing — stay quiet.
      if (!authSessionResult || authSessionResult.type === 'dismiss') {
        return;
      }

      onError(
        `No session after Google. In Clerk Dashboard → Native applications → Mobile SSO redirects, add this exact URL (tunnel URLs change when Expo restarts):\n${redirectUrl}`,
      );
    } catch (err) {
      if (__DEV__) console.error('[Google SSO]', err);
      if (isClerkAPIResponseError(err)) {
        onError(
          err.errors[0]?.longMessage ?? err.errors[0]?.message ?? 'Google sign-in failed',
        );
      } else if (err instanceof Error && err.message) {
        onError(err.message);
      } else {
        onError('Google sign-in failed. Please try again.');
      }
    } finally {
      clearTimeout(watchdog);
      hideNativeSplash();
      if (pendingRef.current) {
        pendingRef.current = false;
        setLoading(false);
      }
    }
  }, [startSSOFlow, onError, finishSession]);

  const { colors } = useTheme();
  const isDisabled = loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={() => {
        if (process.env.EXPO_OS === 'ios') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        void handlePress();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.surface,
          opacity: isDisabled ? 0.72 : pressed ? 0.92 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
      ]}>
      <View style={styles.leading}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.textSecondary} />
        ) : (
          <GoogleIcon size={20} />
        )}
      </View>
      <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
        {loading ? 'Connecting to Google…' : 'Continue with Google'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    width: '100%',
    height: 56,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  leading: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...Typography.body,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
