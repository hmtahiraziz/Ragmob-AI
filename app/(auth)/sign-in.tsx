import { useSignIn } from '@clerk/expo/legacy';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AuthFooter } from '@/components/auth/auth-footer';
import { AuthHeader } from '@/components/auth/auth-header';
import { AuthScreen } from '@/components/auth/auth-screen';
import { GoogleButton } from '@/components/auth/google-button';
import { VerifyEmailForm } from '@/components/auth/verify-email-form';
import { hideNativeSplash } from '@/components/splash-controller';
import { Banner, Button, Divider, Screen, Spinner, TextField } from '@/components/ui';
import type { TextFieldHandle } from '@/components/ui/text-field';
import { Gradients, Spacing, Typography } from '@/constants/theme';
import { describeClerkAuthError, isMissingAuthAttempt, isValidEmail, normalizeEmail } from '@/lib/auth/clerk';
import { useTheme } from '@/hooks/use-theme';

export default function SignInScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const passwordRef = useRef<TextFieldHandle | null>(null);

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isLoaded) {
    return (
      <Screen gradient={Gradients.auth}>
        <Spinner centered label="Loading…" />
      </Screen>
    );
  }

  const emailNormalized = normalizeEmail(emailAddress);
  const emailInvalid = emailTouched && emailAddress.trim().length > 0 && !isValidEmail(emailNormalized);
  const canSubmit = isValidEmail(emailNormalized) && password.length > 0 && !loading;

  const handleSubmit = async () => {
    setError(null);
    setEmailTouched(true);
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
        hideNativeSplash();
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

  const handleVerify = async (code: string) => {
    setError(null);
    setLoading(true);
    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code,
      });

      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        hideNativeSplash();
      } else {
        setError('Verification incomplete. Please try again.');
      }
    } catch (err) {
      setError(describeClerkAuthError(err, 'Verification failed. Please try again.'));
      if (isMissingAuthAttempt(err)) {
        setPendingVerification(false);
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
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    const email = normalizeEmail(emailAddress);
    router.replace({
      pathname: '/(auth)/forgot-password',
      params: email ? { email } : {},
    });
  };

  if (pendingVerification) {
    return (
      <VerifyEmailForm
        email={normalizeEmail(emailAddress)}
        error={error}
        loading={loading}
        intent="sign-in"
        onVerify={handleVerify}
        onResend={handleResendCode}
        onBack={() => {
          setPendingVerification(false);
          setError(null);
        }}
      />
    );
  }

  return (
    <AuthScreen
      form={
        <>
          {error ? <Banner tone="error" message={error} style={styles.banner} /> : null}

          <TextField
            label="Email"
            placeholder="name@company.com"
            leftIcon="mail"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            blurOnSubmit={false}
            value={emailAddress}
            onChangeText={(v) => {
              setEmailAddress(v);
              if (error) setError(null);
            }}
            onBlur={() => setEmailTouched(true)}
            onEndEditing={() => setEmailAddress((v) => normalizeEmail(v))}
            onSubmitEditing={() => passwordRef.current?.focus()}
            error={emailInvalid ? 'Enter a valid email address' : undefined}
            containerStyle={styles.fieldInPanel}
          />
          <TextField
            inputRef={passwordRef}
            label="Password"
            labelAccessory={
              <Pressable hitSlop={10} onPress={handleForgotPassword} accessibilityRole="button">
                <Text style={[Typography.caption, styles.forgot, { color: colors.primaryDark }]}>
                  Forgot?
                </Text>
              </Pressable>
            }
            placeholder="Your password"
            leftIcon="lock"
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? 'eye-off' : 'eye'}
            onRightIconPress={() => setShowPassword((v) => !v)}
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (error) setError(null);
            }}
            onSubmitEditing={() => {
              if (canSubmit) void handleSubmit();
            }}
            containerStyle={styles.fieldInPanelLast}
          />

          <Button
            title="Sign in"
            size="lg"
            onPress={handleSubmit}
            loading={loading}
            disabled={!canSubmit}
            fullWidth
          />
        </>
      }
      footer={
        <>
          <Divider label="or" />
          <GoogleButton onError={(m) => setError(m || null)} />
          <AuthFooter prompt="Don't have an account?" actionLabel="Sign up" href="/(auth)/sign-up" />
        </>
      }>
      <AuthHeader title="Welcome back" subtitle="Sign in to continue your conversations." />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  banner: { marginBottom: Spacing.md },
  fieldInPanel: { marginBottom: Spacing.md },
  fieldInPanelLast: { marginBottom: Spacing.lg },
  forgot: { fontWeight: '600' },
});
