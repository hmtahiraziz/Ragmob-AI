import { useSignIn } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthHeader } from '@/components/auth/auth-header';
import { GoogleButton } from '@/components/auth/google-button';
import { Banner, Button, Divider, Screen, TextField } from '@/components/ui';
import { Gradients, Spacing, Typography } from '@/constants/theme';
import { describeClerkAuthError, isMissingAuthAttempt, isValidEmail, normalizeEmail } from '@/lib/auth/clerk';
import { useTheme } from '@/hooks/use-theme';

export default function SignInScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isLoaded) {
    return null;
  }

  const handleSubmit = async () => {
    setError(null);
    const identifier = normalizeEmail(emailAddress);

    if (!isValidEmail(identifier)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    setLoading(true);
    try {
      const attempt = await signIn.create({ identifier, password });

      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        return;
      }

      if (attempt.status === 'needs_first_factor') {
        const emailCodeFactor = attempt.supportedFirstFactors?.find(
          (factor) => factor.strategy === 'email_code',
        );
        if (emailCodeFactor && 'emailAddressId' in emailCodeFactor) {
          await signIn.prepareFirstFactor({
            strategy: 'email_code',
            emailAddressId: emailCodeFactor.emailAddressId,
          });
          setPendingVerification(true);
          return;
        }

        const resetFactor = attempt.supportedFirstFactors?.find(
          (factor) => factor.strategy === 'reset_password_email_code',
        );
        if (resetFactor) {
          setError('Use Forgot password to reset your password, or try Continue with Google.');
          return;
        }
      }

      if (attempt.status === 'needs_second_factor') {
        setError('Two-factor authentication is required. Check your Clerk settings or use Continue with Google.');
        return;
      }

      setError('Additional verification is required. Try Continue with Google.');
    } catch (err) {
      setError(describeClerkAuthError(err, 'Sign in failed. Please try again.'));
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
      const attempt = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code: trimmedCode,
      });

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
    setLoading(true);
    try {
      const identifier = normalizeEmail(emailAddress);
      const attempt = await signIn.create({ identifier, password });
      const emailCodeFactor = attempt.supportedFirstFactors?.find(
        (factor) => factor.strategy === 'email_code',
      );
      if (emailCodeFactor && 'emailAddressId' in emailCodeFactor) {
        await signIn.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: emailCodeFactor.emailAddressId,
        });
        setPendingVerification(true);
      } else {
        setError('Could not resend code. Go back and sign in again.');
        setPendingVerification(false);
      }
    } catch (err) {
      setError(describeClerkAuthError(err, 'Could not resend code. Please try again.'));
      if (isMissingAuthAttempt(err)) {
        setPendingVerification(false);
        setCode('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    const email = normalizeEmail(emailAddress);
    router.push({
      pathname: '/forgot-password',
      params: email ? { email } : {},
    });
  };

  const handleBackToSignIn = () => {
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

        <Banner tone="info" message="Check your inbox to finish signing in." style={styles.banner} />
        {error ? <Banner tone="error" message={error} style={styles.banner} /> : null}

        <TextField
          label="Verification code"
          placeholder="123456"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
        />
        <Button title="Verify" size="lg" onPress={handleVerify} loading={loading} disabled={!code.trim()} fullWidth />
        <Button title="Send a new code" variant="ghost" onPress={handleResendCode} loading={loading} />
        <Button title="Back to sign in" variant="ghost" onPress={handleBackToSignIn} />
      </Screen>
    );
  }

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
        onEndEditing={() => setEmailAddress((v) => normalizeEmail(v))}
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
        disabled={!emailAddress.trim() || !password}
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
