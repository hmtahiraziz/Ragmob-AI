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

import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ListItemProps = {
  label: string;
  value?: string;
  leftIcon?: React.ComponentProps<typeof Feather>['name'];
  rightIcon?: React.ComponentProps<typeof Feather>['name'];
  trailing?: ReactNode;
  destructive?: boolean;
  showChevron?: boolean;
  isLast?: boolean;
  onPress?: PressableProps['onPress'];
  style?: StyleProp<ViewStyle>;
};

export function ListItem({
  label,
  value,
  leftIcon,
  rightIcon,
  trailing,
  destructive = false,
  showChevron = false,
  isLast = false,
  onPress,
  style,
}: ListItemProps) {
  const { colors } = useTheme();
  const pressable = !!onPress;
  const labelColor = destructive ? colors.danger : colors.text;

  const content = (
    <>
      {leftIcon ? <Feather name={leftIcon} size={18} color={destructive ? colors.danger : colors.textSecondary} /> : null}
      <Text style={[styles.label, Typography.body, { color: labelColor, flex: 1 }]} numberOfLines={1}>
        {label}
      </Text>
      {trailing ? (
        <View style={styles.trailing}>{trailing}</View>
      ) : value ? (
        <Text style={[styles.value, Typography.body, { color: colors.textSecondary }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {rightIcon ? (
        <Feather name={rightIcon} size={18} color={colors.textMuted} />
      ) : showChevron && pressable ? (
        <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
      ) : null}
    </>
  );

  const rowStyle = [
    styles.row,
    !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    style,
  ];

  if (!pressable) {
    return <View style={rowStyle}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [rowStyle, pressed && { backgroundColor: colors.surface3 }]}>
      {content}
    </Pressable>
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
  label: { fontWeight: '500' },
  value: { textAlign: 'right', maxWidth: '50%' },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  chevron: { fontSize: 22, lineHeight: 22 },
});
