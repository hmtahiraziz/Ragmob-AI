import { useSignUp } from '@clerk/clerk-expo';
import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthHeader } from '@/components/auth/auth-header';
import { GoogleButton } from '@/components/auth/google-button';
import { Banner, Button, Divider, Screen, TextField } from '@/components/ui';
import { Gradients, Radius, Spacing, Typography } from '@/constants/theme';
import {
  describeClerkAuthError,
  isMissingAuthAttempt,
  isValidEmail,
  normalizeEmail,
} from '@/lib/auth/clerk';
import { useTheme } from '@/hooks/use-theme';

function getPasswordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function PasswordStrengthBar({ score }: { score: number }) {
  const { colors } = useTheme();
  const segmentColor = (index: number) => {
    if (score <= index) return colors.surface3;
    if (score === 1) return colors.danger;
    if (score === 2) return colors.warning;
    if (score === 3) return colors.success;
    return colors.primary;
  };

  return (
    <View style={styles.strengthRow}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.strengthSegment, { backgroundColor: segmentColor(i) }]} />
      ))}
    </View>
  );
}

export default function SignUpScreen() {
  const { colors } = useTheme();
  const { isLoaded, signUp, setActive } = useSignUp();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordsMatch = password === confirmPassword;
  const showMismatch = confirmPassword.length > 0 && !passwordsMatch;
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    if (signUp.status === 'missing_requirements') {
      setPendingVerification(true);
    }
  }, [signUp.status]);

  if (!isLoaded) {
    return null;
  }

  async function ensureSignUpAttempt(email: string) {
    if (signUp.status === 'missing_requirements' || signUp.id) {
      return;
    }
    await signUp.create({ emailAddress: email, password });
  }

  async function sendVerificationCode(email: string) {
    await ensureSignUpAttempt(email);
    await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
    setPendingVerification(true);
  }

  const handleSubmit = async () => {
    setError(null);
    const email = normalizeEmail(emailAddress);

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await signUp.create({ emailAddress: email, password });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        return;
      }

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err) {
      setError(describeClerkAuthError(err, 'Sign up failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError(null);
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError('Enter the verification code from your email.');
      return;
    }

    setLoading(true);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code: trimmedCode });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
      } else {
        setError('Verification incomplete. Please try again.');
      }
    } catch (err) {
      setError(describeClerkAuthError(err, 'Verification failed. Please try again.'));
      if (isMissingAuthAttempt(err)) {
        setPendingVerification(false);
        setCode('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    const email = normalizeEmail(emailAddress);

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      setPendingVerification(false);
      return;
    }

    setLoading(true);
    try {
      await sendVerificationCode(email);
    } catch (err) {
      setError(describeClerkAuthError(err, 'Could not resend code. Please try again.'));
      if (isMissingAuthAttempt(err)) {
        setPendingVerification(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSignUp = () => {
    setPendingVerification(false);
    setCode('');
    setError(null);
  };

  if (pendingVerification) {
    return (
      <Screen scroll keyboardAware fadeIn gradient={Gradients.auth} contentContainerStyle={styles.content}>
        <AuthHeader
          title="Verify your email"
          subtitle={`Enter the code we sent to ${normalizeEmail(emailAddress)}.`}
        />

        <Banner tone="info" message="Check your inbox to verify your email." style={styles.banner} />
        {error ? <Banner tone="error" message={error} style={styles.banner} /> : null}

        <TextField
          label="Verification code"
          placeholder="123456"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
        />
        <Button
          title="Verify"
          size="lg"
          onPress={handleVerify}
          loading={loading}
          disabled={!code.trim()}
          fullWidth
        />
        <Button
          title="Send a new code"
          variant="ghost"
          onPress={handleResendCode}
          loading={loading}
        />
        <Button title="Back" variant="ghost" onPress={handleBackToSignUp} />
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAware fadeIn gradient={Gradients.auth} contentContainerStyle={styles.content}>
      <AuthHeader title="Create your account" subtitle="Experience the future of human-AI dialogue." />

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
      <View>
        <TextField
          label="Password"
          placeholder="Create a password"
          secureTextEntry={!showPassword}
          rightIcon={showPassword ? 'eye-off' : 'eye'}
          onRightIconPress={() => setShowPassword((v) => !v)}
          autoComplete="password-new"
          value={password}
          onChangeText={setPassword}
          containerStyle={styles.passwordField}
        />
        <PasswordStrengthBar score={strength} />
      </View>
      <TextField
        label="Confirm password"
        placeholder="Re-enter your password"
        secureTextEntry
        autoComplete="password-new"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={showMismatch ? 'Passwords do not match' : undefined}
      />

      <Button
        title="Create account"
        size="lg"
        onPress={handleSubmit}
        loading={loading}
        disabled={!emailAddress.trim() || !password || !confirmPassword || !passwordsMatch}
        fullWidth
      />

      <View nativeID="clerk-captcha" />

      <Divider label="or" />

      <GoogleButton onError={(m) => setError(m || null)} />

      <View style={styles.footer}>
        <Text style={[Typography.body, { color: colors.textSecondary }]}>Already have an account? </Text>
        <Link href="/(auth)/sign-in" asChild>
          <Pressable hitSlop={8}>
            <Text style={[Typography.body, styles.footerLink, { color: colors.primaryDark }]}>Sign in</Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: Spacing.xl },
  banner: { marginBottom: Spacing.md },
  passwordField: { marginBottom: Spacing.sm },
  strengthRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.lg, marginTop: -Spacing.sm },
  strengthSegment: { flex: 1, height: 3, borderRadius: Radius.full },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  footerLink: { fontWeight: '600' },
});
