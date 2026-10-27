import { Feather } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ToastTone = 'info' | 'success' | 'error' | 'warning';

export type AppToastProps = {
  visible: boolean;
  message: string;
  tone?: ToastTone;
  onDismiss: () => void;
};

const ICONS: Record<ToastTone, React.ComponentProps<typeof Feather>['name']> = {
  info: 'info',
  success: 'check-circle',
  error: 'alert-circle',
  warning: 'alert-triangle',
};

export function AppToast({ visible, message, tone = 'info', onDismiss }: AppToastProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    if (!visible) return;
    opacity.setValue(0);
    translateY.setValue(-12);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        stiffness: 160,
        damping: 16,
      }),
    ]).start();
  }, [visible, message, opacity, translateY]);

  if (!visible) return null;

  const toneColor =
    tone === 'error'
      ? colors.danger
      : tone === 'warning'
        ? colors.warning
        : tone === 'success'
          ? colors.success
          : colors.primaryDark;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { paddingTop: insets.top + Spacing.sm }]}>
      <Animated.View
        accessibilityRole="alert"
        style={[
          styles.toast,
          {
            backgroundColor: colors.surface,
            opacity,
            transform: [{ translateY }],
          },
        ]}>
        <Feather name={ICONS[tone]} size={18} color={toneColor} />
        <Text style={[Typography.body, styles.text, { color: colors.text }]} numberOfLines={3}>
          {message}
        </Text>
        <Pressable
          onPress={onDismiss}
          hitSlop={10}
          accessibilityLabel="Dismiss"
          style={styles.dismiss}>
          <Feather name="x" size={16} color={colors.textMuted} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    maxWidth: 520,
    width: '100%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 52,
  },
  text: { flex: 1, lineHeight: 20 },
  dismiss: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
