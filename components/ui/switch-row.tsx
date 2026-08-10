import { Feather } from '@expo/vector-icons';
import { Switch, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SwitchRowProps = {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  leftIcon?: React.ComponentProps<typeof Feather>['name'];
  disabled?: boolean;
  isLast?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Settings row with label, optional description, and native switch. */
export function SwitchRow({
  label,
  description,
  value,
  onValueChange,
  leftIcon,
  disabled = false,
  isLast = false,
  style,
}: SwitchRowProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
        style,
      ]}>
      {leftIcon ? (
        <Feather name={leftIcon} size={18} color={disabled ? colors.textMuted : colors.textSecondary} />
      ) : null}
      <View style={styles.copy}>
        <Text
          style={[Typography.body, styles.label, { color: disabled ? colors.textMuted : colors.text }]}
          numberOfLines={1}>
          {label}
        </Text>
        {description ? (
          <Text style={[Typography.caption, { color: colors.textMuted }]} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.borderStrong, true: colors.ink }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.borderStrong}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 56,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  label: {
    fontWeight: '500',
  },
});
