import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SpinnerProps = {
  size?: 'small' | 'large';
  label?: string;
  centered?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function Spinner({ size = 'small', label, centered = true, color, style }: SpinnerProps) {
  const { colors } = useTheme();
  return (
    <View style={[centered && styles.centered, styles.container, style]}>
      <ActivityIndicator size={size} color={color ?? colors.primary} />
      {label ? (
        <Text style={[styles.label, Typography.caption, { color: colors.textMuted }]}>{label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm, alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center' },
  label: {},
});
