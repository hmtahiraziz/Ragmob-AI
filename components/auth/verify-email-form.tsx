import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthHeader } from '@/components/auth/auth-header';
import { AuthScreen } from '@/components/auth/auth-screen';
import { CodeInput } from '@/components/auth/code-input';
import { Banner, Button } from '@/components/ui';
import { Spacing, Typography } from '@/constants/theme';
import { maskEmail } from '@/lib/auth/clerk';
import { formatCountdown, useOtpTimers } from '@/lib/auth/otp-timers';
import { useTheme } from '@/hooks/use-theme';

type VerifyEmailFormProps = {
  email: string;
  error: string | null;
  loading: boolean;
  /** Sign-in vs sign-up copy. */
  intent?: 'sign-in' | 'sign-up';
  onVerify: (code: string) => void | Promise<void>;
  onResend: () => void | Promise<void>;
  onBack: () => void;
};

/** Shared email OTP screen used by sign-in and sign-up. */
export function VerifyEmailForm({
  email,
  error,
  loading,
  intent = 'sign-up',
  onVerify,
  onResend,
  onBack,
}: VerifyEmailFormProps) {
  const { colors } = useTheme();
  const [code, setCode] = useState('');
  const submittedRef = useRef<string | null>(null);
  const { cooldown, expiresIn, expired, canResend, restart } = useOtpTimers();

  const submit = useCallback(
    async (nextCode: string) => {
      const trimmed = nextCode.trim();
      if (trimmed.length < 6 || loading || expired) return;
      if (submittedRef.current === trimmed) return;
      submittedRef.current = trimmed;
      await onVerify(trimmed);
      // Allow retry with the same code if verification failed.
      submittedRef.current = null;
    },
    [expired, loading, onVerify],
  );

  const handleResend = async () => {
    if (!canResend || loading) return;
    setCode('');
    submittedRef.current = null;
    await onResend();
    restart();
  };

  const masked = maskEmail(email);
  const subtitle =
    intent === 'sign-in'
      ? `Enter the 6-digit code we sent to ${masked} to finish signing in.`
      : `Enter the 6-digit code we sent to ${masked} to verify your account.`;

  return (
    <AuthScreen
      form={
        <>
          <View style={[styles.emailChip, { backgroundColor: colors.lavenderSoft }]}>
            <Text style={[Typography.caption, { color: colors.primaryDark, fontWeight: '600' }]}>
              {masked || 'your inbox'}
            </Text>
          </View>

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
            Verification code
          </Text>
          <CodeInput
            value={code}
            onChange={setCode}
            onComplete={submit}
            disabled={loading || expired}
          />

          <Button
            title="Verify email"
            size="lg"
            onPress={() => void submit(code)}
            loading={loading}
            disabled={expired || code.trim().length < 6}
            fullWidth
          />

          <View style={styles.actions}>
            <Button
              title={canResend ? 'Resend code' : `Resend code in ${cooldown}s`}
              variant="ghost"
              onPress={() => void handleResend()}
              disabled={!canResend || loading}
              loading={loading && canResend}
            />
            <Button
              title={intent === 'sign-in' ? 'Back to sign in' : 'Back'}
              variant="ghost"
              onPress={onBack}
              disabled={loading}
            />
          </View>

          <Text style={[Typography.caption, styles.hint, { color: colors.textMuted }]}>
            {expired
              ? 'Request a new code to continue.'
              : "Didn't get it? Check spam, or wait for the timer to resend."}
          </Text>
        </>
      }>
      <AuthHeader title="Check your email" subtitle={subtitle} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  emailChip: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 999,
    marginBottom: Spacing.md,
  },
  banner: { marginBottom: Spacing.md },
  expiry: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  codeLabel: {
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  actions: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  hint: {
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
