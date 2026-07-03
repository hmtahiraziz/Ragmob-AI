import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/** Animated opacity-pulse placeholder for async content. */
export function Skeleton({ width = '100%', height = 16, radius = Radius.sm, style }: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.surface2, opacity }, style]}
    />
  );
}

/** A few placeholder chat bubbles shown while history hydrates. */
export function ChatSkeleton() {
  return (
    <View style={styles.chat}>
      <View style={styles.left}>
        <Skeleton width="60%" height={44} radius={Radius.lg} />
      </View>
      <View style={styles.right}>
        <Skeleton width="45%" height={36} radius={Radius.lg} />
      </View>
      <View style={styles.left}>
        <Skeleton width="75%" height={60} radius={Radius.lg} />
      </View>
      <View style={styles.right}>
        <Skeleton width="35%" height={36} radius={Radius.lg} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chat: { flex: 1, gap: Spacing.md, padding: Spacing.md },
  left: { alignSelf: 'flex-start', width: '100%', alignItems: 'flex-start' },
  right: { alignSelf: 'flex-end', width: '100%', alignItems: 'flex-end' },
});
