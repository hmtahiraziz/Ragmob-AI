import { isClerkAPIResponseError, useSignIn } from '@clerk/clerk-expo';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthHeader } from '@/components/auth/auth-header';
import { GoogleButton } from '@/components/auth/google-button';
import { Banner, Button, Divider, Screen, TextField } from '@/components/ui';
import { Gradients, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function SignInScreen() {
  const { colors } = useTheme();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isLoaded) {
    return null;
  }

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const attempt = await signIn.create({ identifier: emailAddress, password });

      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
      } else {
        setError('Additional verification is required. Check your Clerk settings.');
      }
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage ?? err.errors[0]?.message ?? 'Sign in failed');
      } else {
        setError('Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert('Reset password', 'Password reset is coming soon. Contact support if you are locked out.');
  };

  return (
    <Screen scroll keyboardAware fadeIn gradient={Gradients.auth} contentContainerStyle={styles.content}>
      <AuthHeader title="Welcome back" subtitle="Log in to your ragmob account" />

      {error ? <Banner tone="error" message={error} style={styles.banner} /> : null}

      <TextField
        label="Email address"
        placeholder="name@company.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={emailAddress}
        onChangeText={setEmailAddress}
      />
      <TextField
        label="Password"
        labelAccessory={
          <Pressable hitSlop={8} onPress={handleForgotPassword}>
            <Text style={[Typography.caption, { color: colors.primaryDark, fontWeight: '600' }]}>
              Forgot password?
            </Text>
          </Pressable>
        }
        placeholder="Enter your password"
        secureTextEntry={!showPassword}
        rightIcon={showPassword ? 'eye-off' : 'eye'}
        onRightIconPress={() => setShowPassword((v) => !v)}
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
      />

      <Button
        title="Sign in"
        size="lg"
        onPress={handleSubmit}
        loading={loading}
        disabled={!emailAddress || !password}
        fullWidth
      />

      <Divider label="or" />

      <GoogleButton onError={(m) => setError(m || null)} />

      <View style={styles.footer}>
        <Text style={[Typography.body, { color: colors.textSecondary }]}>Don&apos;t have an account? </Text>
        <Link href="/(auth)/sign-up" asChild>
          <Pressable hitSlop={8}>
            <Text style={[Typography.body, styles.footerLink, { color: colors.primaryDark }]}>Sign up</Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: Spacing.xl },
  banner: { marginBottom: Spacing.md },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  footerLink: { fontWeight: '600' },
});
