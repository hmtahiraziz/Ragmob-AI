import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
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

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = {
  title: string;
  onPress?: PressableProps['onPress'];
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  leading?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

const SIZES: Record<Size, { height: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { height: 36, paddingHorizontal: Spacing.md, fontSize: 13 },
  md: { height: 48, paddingHorizontal: Spacing.lg, fontSize: 15 },
  lg: { height: 56, paddingHorizontal: Spacing.xl, fontSize: 16 },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leading,
  fullWidth = false,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const sizing = SIZES[size];
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;

  // Flat fills, full-round pills, hairline border on the outline variant only.
  const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.ink, fg: colors.onInk, border: 'transparent' },
    secondary: { bg: colors.surface, fg: colors.text, border: colors.borderStrong },
    ghost: { bg: 'transparent', fg: colors.text, border: 'transparent' },
    danger: { bg: 'rgba(220,38,38,0.10)', fg: colors.danger, border: 'rgba(220,38,38,0.28)' },
  };
  const { bg, fg, border } = palette[variant];

  const handlePressIn = () => {
    if (isDisabled) return;
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, stiffness: 200, damping: 10 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, stiffness: 200, damping: 10 }).start();
  };

  const handlePress: PressableProps['onPress'] = (e) => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(e);
  };

  return (
    <Animated.View
      style={{ transform: [{ scale }], alignSelf: fullWidth ? 'stretch' : 'flex-start' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.base,
          {
            height: sizing.height,
            paddingHorizontal: sizing.paddingHorizontal,
            backgroundColor: bg,
            borderColor: border,
          },
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
          pressed && !isDisabled && styles.pressed,
          style,
        ]}>
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <View style={styles.content}>
            {leading ? <View>{leading}</View> : null}
            <Text style={[styles.label, { color: fg, fontSize: sizing.fontSize }]}>{title}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullWidth: { alignSelf: 'stretch', width: '100%' },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  label: { fontWeight: Typography.defaultSemiBold.fontWeight },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
});
