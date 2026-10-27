import { Feather } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ListItemProps = {
  label: string;
  /** Optional supporting line under the label. */
  description?: string;
  value?: string;
  leftIcon?: React.ComponentProps<typeof Feather>['name'];
  rightIcon?: React.ComponentProps<typeof Feather>['name'];
  trailing?: ReactNode;
  destructive?: boolean;
  showChevron?: boolean;
  isLast?: boolean;
  disabled?: boolean;
  onPress?: PressableProps['onPress'];
  style?: StyleProp<ViewStyle>;
};

export function ListItem({
  label,
  description,
  value,
  leftIcon,
  rightIcon,
  trailing,
  destructive = false,
  showChevron = false,
  isLast = false,
  disabled = false,
  onPress,
  style,
}: ListItemProps) {
  const { colors } = useTheme();
  const pressable = !!onPress && !disabled;
  const labelColor = destructive ? colors.danger : colors.text;
  const iconFg = destructive ? colors.danger : colors.textSecondary;
  const iconBg = destructive ? 'rgba(220,38,38,0.10)' : colors.surface2;

  const content = (
    <>
      {leftIcon ? (
        <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
          <Feather name={leftIcon} size={16} color={iconFg} />
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text style={[styles.label, Typography.body, { color: labelColor }]} numberOfLines={1}>
          {label}
        </Text>
        {description ? (
          <Text
            style={[styles.description, { color: colors.textMuted }]}
            numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      {trailing ? (
        <View style={styles.trailing}>{trailing}</View>
      ) : value ? (
        <Text style={[styles.value, Typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {rightIcon ? (
        <Feather name={rightIcon} size={18} color={colors.textMuted} />
      ) : showChevron && pressable ? (
        <Feather name="chevron-right" size={18} color={colors.textMuted} />
      ) : null}
    </>
  );

  const rowStyle = [
    styles.row,
    !isLast && {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    disabled && { opacity: 0.5 },
    style,
  ];

  if (!pressable) {
    return (
      <View style={rowStyle} accessibilityState={{ disabled }}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        rowStyle,
        pressed && { backgroundColor: colors.surface3 },
      ]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 60,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  label: { fontWeight: '600', letterSpacing: -0.2 },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  value: {
    textAlign: 'right',
    maxWidth: '42%',
    fontWeight: '600',
  },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
