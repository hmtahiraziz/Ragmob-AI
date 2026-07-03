import { Feather } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BannerTone = 'info' | 'success' | 'error' | 'warning';

type BannerProps = {
  message: string;
  tone?: BannerTone;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
};

const ICONS: Record<BannerTone, React.ComponentProps<typeof Feather>['name']> = {
  info: 'info',
  success: 'check-circle',
  error: 'alert-circle',
  warning: 'alert-triangle',
};

export function Banner({
  message,
  tone = 'info',
  actionLabel,
  onAction,
  onDismiss,
  style,
}: BannerProps) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      stiffness: 100,
      damping: 15,
    }).start();
  }, [translateY]);

  const toneColor =
    tone === 'error'
      ? colors.danger
      : tone === 'warning'
        ? colors.warning
        : tone === 'success'
          ? colors.success
          : colors.primary;

  const bgOpacity =
    tone === 'error'
      ? 'rgba(248,113,113,0.1)'
      : tone === 'warning'
        ? 'rgba(251,191,36,0.1)'
        : tone === 'success'
          ? 'rgba(52,211,153,0.1)'
          : colors.brandGlow;

  const borderOpacity =
    tone === 'error'
      ? 'rgba(248,113,113,0.25)'
      : tone === 'warning'
        ? 'rgba(251,191,36,0.25)'
        : tone === 'success'
          ? 'rgba(52,211,153,0.25)'
          : 'rgba(108,99,255,0.25)';

  return (
    <Animated.View
      accessibilityRole="alert"
      style={[
        styles.banner,
        {
          backgroundColor: bgOpacity,
          borderColor: borderOpacity,
          transform: [{ translateY }],
        },
        style,
      ]}>
      <Feather name={ICONS[tone]} size={18} color={toneColor} />
      <Text style={[styles.text, Typography.body, { color: toneColor }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.action, Typography.caption, { color: toneColor }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={8} accessibilityLabel="Dismiss">
          <Feather name="x" size={16} color={toneColor} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  text: { flex: 1 },
  action: { fontWeight: '600' },
});
