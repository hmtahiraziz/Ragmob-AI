import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconButtonProps = {
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress?: PressableProps['onPress'];
  size?: number;
  color?: string;
  variant?: 'surface' | 'brand' | 'ink' | 'ghost';
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon,
  onPress,
  size = 20,
  color,
  variant = 'surface',
  accessibilityLabel,
  disabled = false,
  style,
}: IconButtonProps) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const bg =
    variant === 'brand'
      ? colors.primary
      : variant === 'ink'
        ? colors.ink
        : variant === 'surface'
          ? colors.surface2
          : 'transparent';

  const tint =
    color ??
    (variant === 'brand'
      ? colors.onPrimary
      : variant === 'ink'
        ? colors.onInk
        : disabled
          ? colors.textMuted
          : colors.text);

  const handlePress: PressableProps['onPress'] = (e) => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(e);
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        hitSlop={8}
        onPress={handlePress}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, stiffness: 200, damping: 10 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, stiffness: 200, damping: 10 }).start()
        }
        style={({ pressed }) => [
          styles.base,
          {
            backgroundColor: pressed && !disabled ? colors.surface3 : bg,
            opacity: disabled ? 0.4 : 1,
          },
          style,
        ]}>
        <Feather name={icon} size={size} color={tint} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: 40,
    minHeight: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
