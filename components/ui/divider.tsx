import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DividerProps = {
  label?: string;
  inset?: number;
  style?: StyleProp<ViewStyle>;
};

export function Divider({ label, inset = 0, style }: DividerProps) {
  const { colors } = useTheme();

  if (label) {
    return (
      <View style={[styles.labelRow, { marginHorizontal: inset }, style]}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <Text style={[styles.label, Typography.label, { color: colors.textMuted }]}>{label}</Text>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: colors.border, marginHorizontal: inset },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.md,
  },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  label: {},
});
