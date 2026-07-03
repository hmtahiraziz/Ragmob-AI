import { Feather } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type EmptyStateProps = {
  title: string;
  subtitle?: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({ title, subtitle, icon = 'zap', action, style }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.brandGlow }]}>
        <Feather name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={[styles.title, Typography.heading, { color: colors.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, Typography.body, { color: colors.textSecondary }]}>{subtitle}</Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', maxWidth: 300 },
  action: { marginTop: Spacing.md },
});
