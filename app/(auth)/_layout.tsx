import { Stack } from 'expo-router';

/**
 * Auth group is only mounted when signed out (gated by the root layout's
 * Stack.Protected guard), so no redirect is needed here.
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
