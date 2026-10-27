import { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type ViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardProps = ViewProps & {
  padded?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function Card({ padded = true, onPress, style, children, ...rest }: CardProps) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.card,
    },
    padded && styles.padded,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, stiffness: 200, damping: 12 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, stiffness: 200, damping: 12 }).start()
        }>
        <Animated.View style={[cardStyle, { transform: [{ scale }] }]} {...rest}>
          {children}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <View style={cardStyle} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
  },
  padded: { padding: Spacing.lg },
});
