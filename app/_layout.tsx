import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { Stack, ThemeProvider, type Theme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import 'react-native-reanimated';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { AuthRedirect } from '@/components/auth/auth-redirect';
import { ConsentGate } from '@/components/consent/consent-gate';
import { ErrorBoundary } from '@/components/error-boundary';
import { SplashScreenController } from '@/components/splash-controller';
import { AppSkeleton } from '@/components/ui';
import { AppFeedbackProvider } from '@/hooks/use-app-feedback';
import { useRegisterAuthToken } from '@/hooks/use-register-auth-token';
import { ThemeModeProvider, useTheme } from '@/hooks/use-theme';
import { registerUnauthorizedHandler } from '@/lib/auth/session';
import { registerTokenGetter } from '@/lib/auth/token';
import { CLERK_PUBLISHABLE_KEY } from '@/lib/env';
import { initMonitoring, wrapRoot } from '@/lib/monitoring/sentry';

initMonitoring();

function AuthTokenRegistrar() {
  useRegisterAuthToken();
  return null;
}

function UnauthorizedSessionBridge() {
  const { signOut, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) {
      registerUnauthorizedHandler(null);
      return;
    }

    registerUnauthorizedHandler(() => {
      registerTokenGetter(null);
      void signOut();
    });

    return () => registerUnauthorizedHandler(null);
  }, [isSignedIn, signOut]);

  return null;
}

function RootNavigator() {
  const { isSignedIn, isLoaded } = useAuth();
  const { scheme, colors } = useTheme();

  const navTheme: Theme = {
    dark: scheme === 'dark',
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' },
      medium: { fontFamily: 'System', fontWeight: '500' },
      bold: { fontFamily: 'System', fontWeight: '700' },
      heavy: { fontFamily: 'System', fontWeight: '800' },
    },
  };

  if (!isLoaded) {
    return (
      <ThemeProvider value={navTheme}>
        <View style={styles.root}>
          <AppSkeleton />
        </View>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={navTheme}>
      <ConsentGate enabled={!!isSignedIn}>
        <View style={styles.root}>
          <AuthRedirect />
          <Stack
            key={isSignedIn ? 'signed-in' : 'signed-out'}
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'fade',
            }}>
            <Stack.Protected guard={!!isSignedIn}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="profile"
                options={{ presentation: 'card', animation: 'slide_from_right' }}
              />
            </Stack.Protected>

            <Stack.Protected guard={!isSignedIn}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>

            <Stack.Screen
              name="privacy-policy"
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="terms-of-service"
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen name="sso-callback" options={{ animation: 'none' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        </View>
      </ConsentGate>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

function RootLayout() {
  if (!CLERK_PUBLISHABLE_KEY) {
    throw new Error(
      'Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Add it to your .env file.',
    );
  }

  return (
    <ErrorBoundary>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <ThemeModeProvider>
          <AppFeedbackProvider>
            <GestureHandlerRootView style={styles.root}>
              <SafeAreaProvider initialMetrics={initialWindowMetrics}>
                <KeyboardProvider
                  preload={false}
                  statusBarTranslucent
                  navigationBarTranslucent
                  preserveEdgeToEdge>
                  <SplashScreenController />
                  <AuthTokenRegistrar />
                  <UnauthorizedSessionBridge />
                  <RootNavigator />
                </KeyboardProvider>
              </SafeAreaProvider>
            </GestureHandlerRootView>
          </AppFeedbackProvider>
        </ThemeModeProvider>
      </ClerkProvider>
    </ErrorBoundary>
  );
}

export default wrapRoot(RootLayout);

const styles = StyleSheet.create({
  root: { flex: 1 },
});
