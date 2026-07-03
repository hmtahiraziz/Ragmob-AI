import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { ThemeProvider, type Theme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { SplashScreenController } from '@/components/splash-controller';
import { CLERK_PUBLISHABLE_KEY } from '@/lib/env';
import { useRegisterAuthToken } from '@/hooks/use-register-auth-token';
import { ThemeModeProvider, useTheme } from '@/hooks/use-theme';

export const unstable_settings = {
  anchor: '(tabs)/chat',
};

function AuthTokenRegistrar() {
  useRegisterAuthToken();
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
    return null;
  }

  return (
    <ThemeProvider value={navTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        {/* OAuth deep-link target — must sit outside auth guards. */}
        <Stack.Screen name="sso-callback" />
        <Stack.Protected guard={isSignedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="profile" options={{ presentation: 'card' }} />
        </Stack.Protected>
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  if (!CLERK_PUBLISHABLE_KEY) {
    throw new Error(
      'Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Add it to your .env file.',
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <ThemeModeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <SplashScreenController />
            <AuthTokenRegistrar />
            <RootNavigator />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ThemeModeProvider>
    </ClerkProvider>
  );
}
