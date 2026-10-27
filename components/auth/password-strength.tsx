import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function getPasswordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'] as const;

type PasswordStrengthProps = {
  score: number;
};

export function PasswordStrength({ score }: PasswordStrengthProps) {
  const { colors } = useTheme();

  const segmentColor = (index: number) => {
    if (score <= index) return colors.surface3;
    if (score === 1) return colors.danger;
    if (score === 2) return colors.warning;
    if (score === 3) return colors.success;
    return colors.primaryDark;
  };

  const labelColor =
    score <= 1 ? colors.danger : score === 2 ? colors.warning : score === 3 ? colors.success : colors.primaryDark;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.segment, { backgroundColor: segmentColor(i) }]} />
        ))}
      </View>
      {score > 0 ? (
        <Text style={[Typography.caption, styles.label, { color: labelColor }]}>
          {LABELS[score]}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.md, marginTop: -Spacing.sm, gap: Spacing.xs },
  row: { flexDirection: 'row', gap: Spacing.xs },
  segment: { flex: 1, height: 3, borderRadius: Radius.full },
  label: { fontWeight: '600' },
});
