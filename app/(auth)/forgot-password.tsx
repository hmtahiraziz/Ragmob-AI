import { useSignIn } from '@clerk/expo/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthHeader } from '@/components/auth/auth-header';
import { AuthScreen } from '@/components/auth/auth-screen';
import { CodeInput } from '@/components/auth/code-input';
import { hideNativeSplash } from '@/components/splash-controller';
import { Banner, Button, Screen, Spinner, TextField } from '@/components/ui';
import type { TextFieldHandle } from '@/components/ui/text-field';
import { Gradients, Spacing, Typography } from '@/constants/theme';
import {
  describeClerkAuthError,
  isValidEmail,
  maskEmail,
  normalizeEmail,
  parseEmailParam,
} from '@/lib/auth/clerk';
import { formatCountdown, useOtpTimers } from '@/lib/auth/otp-timers';
import { useTheme } from '@/hooks/use-theme';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string | string[] }>();
  const { isLoaded, signIn, setActive } = useSignIn();
  const passwordRef = useRef<TextFieldHandle | null>(null);
  const confirmRef = useRef<TextFieldHandle | null>(null);

  const [emailAddress, setEmailAddress] = useState(parseEmailParam(emailParam));
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { cooldown, expiresIn, expired, canResend, restart } = useOtpTimers();

  const passwordsMatch = password === confirmPassword;
  const showMismatch = confirmPassword.length > 0 && !passwordsMatch;
  const emailNormalized = normalizeEmail(emailAddress);
  const emailInvalid = emailTouched && emailAddress.trim().length > 0 && !isValidEmail(emailNormalized);

  if (!isLoaded) {
    return (
      <Screen gradient={Gradients.auth}>
        <Spinner centered label="Loading…" />
      </Screen>
    );
  }

  const sendResetCode = async (identifier: string) => {
    await signIn.create({
      strategy: 'reset_password_email_code',
      identifier,
    });
    setEmailAddress(identifier);
    setCodeSent(true);
    restart();
  };

  const handleSendCode = async () => {
    setError(null);
    setEmailTouched(true);
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
    if (!canResend || loading) return;
    setError(null);
    const identifier = normalizeEmail(emailAddress);

    if (!isValidEmail(identifier)) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await sendResetCode(identifier);
      setCode('');
    } catch (err) {
      setError(describeClerkAuthError(err, 'Could not resend code. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError(null);
    if (expired) {
      setError('This code has expired. Resend a new one to continue.');
      return;
    }
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
        hideNativeSplash();
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
      <AuthScreen
        form={
          <>
            {error ? <Banner tone="error" message={error} style={styles.banner} /> : null}

            {expired ? (
              <Banner
                tone="warning"
                message="This code has expired. Resend a new one to continue."
                style={styles.banner}
              />
            ) : (
              <Text style={[Typography.caption, styles.expiry, { color: colors.textSecondary }]}>
                Code expires in {formatCountdown(expiresIn)}
              </Text>
            )}

            <Text style={[Typography.label, styles.codeLabel, { color: colors.textMuted }]}>
              Reset code
            </Text>
            <CodeInput value={code} onChange={setCode} disabled={loading || expired} />

            <TextField
              inputRef={passwordRef}
              label="New password"
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
              containerStyle={styles.fieldInPanel}
              editable={!expired}
            />
            <TextField
              inputRef={confirmRef}
              label="Confirm new password"
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
                if (
                  !expired &&
                  code.trim().length >= 6 &&
                  password &&
                  confirmPassword &&
                  passwordsMatch
                ) {
                  void handleReset();
                }
              }}
              error={showMismatch ? 'Passwords do not match' : undefined}
              containerStyle={styles.fieldInPanelLast}
              editable={!expired}
            />

            <Button
              title="Reset password"
              size="lg"
              onPress={handleReset}
              loading={loading}
              disabled={
                expired ||
                code.trim().length < 6 ||
                !password ||
                !confirmPassword ||
                !passwordsMatch
              }
              fullWidth
            />
            <Button
              title={canResend ? 'Resend code' : `Resend code in ${cooldown}s`}
              variant="ghost"
              onPress={() => void handleResendCode()}
              disabled={!canResend || loading}
              loading={loading && canResend}
            />
          </>
        }
        footer={
          <View style={styles.footer}>
            <Pressable hitSlop={10} onPress={() => router.replace('/(auth)/sign-in')}>
              <Text style={[Typography.body, styles.footerLink, { color: colors.primaryDark }]}>
                Back to sign in
              </Text>
            </Pressable>
          </View>
        }>
        <AuthHeader
          title="Reset your password"
          subtitle={`Enter the code we sent to ${maskEmail(emailAddress)}, then choose a new password.`}
        />
      </AuthScreen>
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
            returnKeyType="send"
            value={emailAddress}
            onChangeText={(v) => {
              setEmailAddress(v);
              if (error) setError(null);
            }}
            onBlur={() => setEmailTouched(true)}
            onEndEditing={() => setEmailAddress((v) => normalizeEmail(v))}
            onSubmitEditing={() => {
              if (emailAddress.trim()) void handleSendCode();
            }}
            error={emailInvalid ? 'Enter a valid email address' : undefined}
            containerStyle={styles.fieldInPanelLast}
          />

          <Button
            title="Send reset code"
            size="lg"
            onPress={handleSendCode}
            loading={loading}
            disabled={!emailAddress.trim() || loading}
            fullWidth
          />
        </>
      }
      footer={
        <View style={styles.footer}>
          <Pressable hitSlop={10} onPress={() => router.replace('/(auth)/sign-in')}>
            <Text style={[Typography.body, styles.footerLink, { color: colors.primaryDark }]}>
              Back to sign in
            </Text>
          </Pressable>
        </View>
      }>
      <AuthHeader
        title="Forgot password?"
        subtitle="We’ll email you a code so you can set a new password."
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  banner: { marginBottom: Spacing.md },
  expiry: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  codeLabel: { marginBottom: Spacing.sm, textAlign: 'center' },
  fieldInPanel: { marginBottom: Spacing.md },
  fieldInPanelLast: { marginBottom: Spacing.lg },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  footerLink: { fontWeight: '600' },
});
