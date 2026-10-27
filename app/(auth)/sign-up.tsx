import { useSignUp } from '@clerk/expo/legacy';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthFooter } from '@/components/auth/auth-footer';
import { AuthHeader } from '@/components/auth/auth-header';
import { AuthScreen } from '@/components/auth/auth-screen';
import { GoogleButton } from '@/components/auth/google-button';
import { getPasswordStrength, PasswordStrength } from '@/components/auth/password-strength';
import { VerifyEmailForm } from '@/components/auth/verify-email-form';
import { hideNativeSplash } from '@/components/splash-controller';
import { Banner, Button, Divider, Screen, Spinner, TextField } from '@/components/ui';
import type { TextFieldHandle } from '@/components/ui/text-field';
import { Gradients, Spacing } from '@/constants/theme';
import {
  describeClerkAuthError,
  isMissingAuthAttempt,
  isValidEmail,
  normalizeEmail,
} from '@/lib/auth/clerk';

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const passwordRef = useRef<TextFieldHandle | null>(null);
  const confirmRef = useRef<TextFieldHandle | null>(null);

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordsMatch = password === confirmPassword;
  const showMismatch = confirmPassword.length > 0 && !passwordsMatch;
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const emailNormalized = normalizeEmail(emailAddress);
  const emailInvalid = emailTouched && emailAddress.trim().length > 0 && !isValidEmail(emailNormalized);
  const canSubmit =
    isValidEmail(emailNormalized) &&
    password.length >= 8 &&
    confirmPassword.length > 0 &&
    passwordsMatch &&
    !loading;

  useEffect(() => {
    if (signUp?.status === 'missing_requirements') {
      setPendingVerification(true);
    }
  }, [signUp?.status]);

  if (!isLoaded) {
    return (
      <Screen gradient={Gradients.auth}>
        <Spinner centered label="Loading…" />
      </Screen>
    );
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
    setEmailTouched(true);
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
        hideNativeSplash();
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

  const handleVerify = async (code: string) => {
    setError(null);
    setLoading(true);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code });
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

  if (pendingVerification) {
    return (
      <VerifyEmailForm
        email={normalizeEmail(emailAddress)}
        error={error}
        loading={loading}
        intent="sign-up"
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

          <View>
            <TextField
              inputRef={passwordRef}
              label="Password"
              placeholder="At least 8 characters"
              leftIcon="lock"
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? 'eye-off' : 'eye'}
              onRightIconPress={() => setShowPassword((v) => !v)}
              autoComplete="password-new"
              textContentType="newPassword"
              returnKeyType="next"
              blurOnSubmit={false}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (error) setError(null);
              }}
              onSubmitEditing={() => confirmRef.current?.focus()}
              hint={password.length > 0 && password.length < 8 ? 'Use 8+ characters' : undefined}
              containerStyle={styles.passwordField}
            />
            <PasswordStrength score={strength} />
          </View>

          <TextField
            inputRef={confirmRef}
            label="Confirm password"
            placeholder="Re-enter your password"
            leftIcon="lock"
            secureTextEntry={!showConfirm}
            rightIcon={showConfirm ? 'eye-off' : 'eye'}
            onRightIconPress={() => setShowConfirm((v) => !v)}
            autoComplete="password-new"
            textContentType="newPassword"
            returnKeyType="go"
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              if (error) setError(null);
            }}
            onSubmitEditing={() => {
              if (canSubmit) void handleSubmit();
            }}
            error={showMismatch ? 'Passwords do not match' : undefined}
            containerStyle={styles.fieldInPanelLast}
          />

          <Button
            title="Create account"
            size="lg"
            onPress={handleSubmit}
            loading={loading}
            disabled={!canSubmit}
            fullWidth
          />

          <View nativeID="clerk-captcha" />
        </>
      }
      footer={
        <>
          <Divider label="or" />
          <GoogleButton onError={(m) => setError(m || null)} />
          <AuthFooter prompt="Already have an account?" actionLabel="Sign in" href="/(auth)/sign-in" />
        </>
      }>
      <AuthHeader
        title="Create your account"
        subtitle="Join Ragmob and start chatting with your AI assistant."
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  banner: { marginBottom: Spacing.md },
  fieldInPanel: { marginBottom: Spacing.md },
  passwordField: { marginBottom: Spacing.sm },
  fieldInPanelLast: { marginBottom: Spacing.lg },
});
