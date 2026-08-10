import { useSignIn } from '@clerk/clerk-expo';
import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthHeader } from '@/components/auth/auth-header';
import { Banner, Button, Screen, TextField } from '@/components/ui';
import { Gradients, Spacing, Typography } from '@/constants/theme';
import { describeClerkAuthError, isValidEmail, normalizeEmail, parseEmailParam } from '@/lib/auth/clerk';
import { useTheme } from '@/hooks/use-theme';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { email: emailParam } = useLocalSearchParams<{ email?: string | string[] }>();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [emailAddress, setEmailAddress] = useState(parseEmailParam(emailParam));
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordsMatch = password === confirmPassword;
  const showMismatch = confirmPassword.length > 0 && !passwordsMatch;

  if (!isLoaded) {
    return null;
  }

  const sendResetCode = async (identifier: string) => {
    await signIn.create({
      strategy: 'reset_password_email_code',
      identifier,
    });
    setEmailAddress(identifier);
    setCodeSent(true);
  };

  const handleSendCode = async () => {
    setError(null);
    const identifier = normalizeEmail(emailAddress);

    if (!isValidEmail(identifier)) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await sendResetCode(identifier);
    } catch (err) {
      setError(describeClerkAuthError(err, 'Could not send reset code. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    const identifier = normalizeEmail(emailAddress);

    if (!isValidEmail(identifier)) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await sendResetCode(identifier);
    } catch (err) {
      setError(describeClerkAuthError(err, 'Could not resend code. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: code.trim(),
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
      } else {
        setError('Password reset incomplete. Please try again.');
      }
    } catch (err) {
      setError(describeClerkAuthError(err, 'Password reset failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (codeSent) {
    return (
      <Screen scroll keyboardAware fadeIn gradient={Gradients.auth} contentContainerStyle={styles.content}>
        <AuthHeader
          title="Reset your password"
          subtitle={`Enter the code we sent to ${normalizeEmail(emailAddress)}.`}
        />

        <Banner tone="info" message="Check your inbox for a reset code." style={styles.banner} />
        {error ? <Banner tone="error" message={error} style={styles.banner} /> : null}

        <TextField
          label="Reset code"
          placeholder="123456"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
        />
        <TextField
          label="New password"
          placeholder="At least 8 characters"
          secureTextEntry={!showPassword}
          rightIcon={showPassword ? 'eye-off' : 'eye'}
          onRightIconPress={() => setShowPassword((v) => !v)}
          autoComplete="password-new"
          value={password}
          onChangeText={setPassword}
        />
        <TextField
          label="Confirm new password"
          placeholder="Re-enter your password"
          secureTextEntry
          autoComplete="password-new"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={showMismatch ? 'Passwords do not match' : undefined}
        />

        <Button
          title="Reset password"
          size="lg"
          onPress={handleReset}
          loading={loading}
          disabled={!code.trim() || !password || !confirmPassword || !passwordsMatch}
          fullWidth
        />
        <Button title="Send a new code" variant="ghost" onPress={handleResendCode} loading={loading} />

        <View style={styles.footer}>
          <Link href="/sign-in" asChild>
            <Pressable hitSlop={8}>
              <Text style={[Typography.body, styles.footerLink, { color: colors.primaryDark }]}>
                Back to sign in
              </Text>
            </Pressable>
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAware fadeIn gradient={Gradients.auth} contentContainerStyle={styles.content}>
      <AuthHeader
        title="Forgot password?"
        subtitle="We'll email you a code to reset your password."
      />

      {error ? <Banner tone="error" message={error} style={styles.banner} /> : null}

      <TextField
        label="Email address"
        placeholder="name@company.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={emailAddress}
        onChangeText={setEmailAddress}
        onEndEditing={() => setEmailAddress((v) => normalizeEmail(v))}
      />

      <Button
        title="Send reset code"
        size="lg"
        onPress={handleSendCode}
        loading={loading}
        disabled={!emailAddress.trim()}
        fullWidth
      />

      <View style={styles.footer}>
        <Link href="/sign-in" asChild>
          <Pressable hitSlop={8}>
            <Text style={[Typography.body, styles.footerLink, { color: colors.primaryDark }]}>
              Back to sign in
            </Text>
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
