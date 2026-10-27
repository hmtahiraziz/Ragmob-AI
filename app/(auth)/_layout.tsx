import { Stack } from 'expo-router';

/**
 * Auth routes only mount when signed out (root Stack.Protected).
 * No nested history between sign-in / sign-up — screens replace each other.
 */
export default function AuthLayout() {
  return (
    <Stack
      initialRouteName="sign-in"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        // Avoid stacking sign-in under sign-up when using Link/push accidentally.
        gestureEnabled: false,
      }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="index" />
    </Stack>
  );
}
