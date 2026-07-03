import { Feather } from '@expo/vector-icons';
import { useRef, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';

type TileProps = {
  title: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  background: string;
  iconBackground: string;
  iconColor: string;
  textColor: string;
  subtitleColor: string;
  badge?: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Rounded-24 feature tile with a top-left icon badge and bottom-aligned text. */
export function Tile({
  title,
  subtitle,
  icon,
  background,
  iconBackground,
  iconColor,
  textColor,
  subtitleColor,
  badge,
  onPress,
  style,
}: TileProps) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, stiffness: 200, damping: 12 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, stiffness: 200, damping: 12 }).start()
        }
        style={[styles.tile, { backgroundColor: background }]}>
        <View style={styles.top}>
          <View style={[styles.iconBadge, { backgroundColor: iconBackground }]}>
            <Feather name={icon} size={18} color={iconColor} />
          </View>
          {badge ? <View style={styles.badgeSlot}>{badge}</View> : null}
        </View>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: subtitleColor }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSlot: { alignItems: 'flex-end' },
  textBlock: { marginTop: Spacing.lg, gap: 2 },
  title: { ...Typography.heading, fontSize: 17 },
  subtitle: { ...Typography.caption },
});
