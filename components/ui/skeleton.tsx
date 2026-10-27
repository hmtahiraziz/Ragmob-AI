import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  /** Stagger delay (ms) so rows breathe in sequence. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

/** Soft opacity pulse — staggered via `delay` for a smoother cascade. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = Radius.sm,
  delay = 0,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const ease = Easing.inOut(Easing.sin);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 900,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 900,
          easing: ease,
          useNativeDriver: true,
        }),
      ]),
    );
    const intro = Animated.sequence([Animated.delay(delay), pulse]);
    intro.start();
    return () => {
      intro.stop();
      pulse.stop();
    };
  }, [delay, opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.surface3,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** A few placeholder chat bubbles shown while history hydrates. */
export function ChatSkeleton() {
  return (
    <View style={styles.chat}>
      <View style={styles.left}>
        <Skeleton width="60%" height={44} radius={Radius.lg} delay={0} />
      </View>
      <View style={styles.right}>
        <Skeleton width="45%" height={36} radius={Radius.lg} delay={80} />
      </View>
      <View style={styles.left}>
        <Skeleton width="75%" height={60} radius={Radius.lg} delay={160} />
      </View>
      <View style={styles.right}>
        <Skeleton width="35%" height={36} radius={Radius.lg} delay={240} />
      </View>
    </View>
  );
}

/** Placeholder rows while the History tab hydrates conversations. */
export function HistorySkeleton() {
  return (
    <View style={styles.history}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.historyRow}>
          <Skeleton width={40} height={40} radius={Radius.full} delay={i * 70} />
          <View style={styles.historyText}>
            <Skeleton width="68%" height={14} radius={Radius.sm} delay={i * 70 + 20} />
            <Skeleton width="42%" height={12} radius={Radius.sm} delay={i * 70 + 40} style={styles.mtSm} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Full-screen boot / home placeholder — mirrors the home layout so the handoff
 * from splash → content feels continuous.
 */
export function AppSkeleton() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter]);

  return (
    <Animated.View
      style={[
        styles.appRoot,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + Spacing.sm,
          paddingBottom: insets.bottom + Spacing.md,
          opacity: enter,
          transform: [
            {
              translateY: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
          ],
        },
      ]}
      accessibilityLabel="Loading"
      accessibilityRole="progressbar">
      <View style={styles.appPage}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Skeleton width={32} height={32} radius={Radius.full} delay={0} />
          <Skeleton width={40} height={40} radius={Radius.full} delay={60} />
        </View>

        {/* Greeting */}
        <View style={styles.greeting}>
          <Skeleton width="48%" height={28} radius={Radius.md} delay={100} />
          <Skeleton width="72%" height={16} radius={Radius.sm} delay={140} style={styles.mtSm} />
        </View>

        {/* New chat CTA */}
        <Skeleton width="100%" height={88} radius={Radius.card} delay={180} />

        {/* Quick starts */}
        <View style={styles.row}>
          <Skeleton width="31%" height={72} radius={Radius.lg} delay={220} />
          <Skeleton width="31%" height={72} radius={Radius.lg} delay={260} />
          <Skeleton width="31%" height={72} radius={Radius.lg} delay={300} />
        </View>

        {/* Personas heading + tiles */}
        <Skeleton width={88} height={12} radius={Radius.sm} delay={340} style={styles.mtLg} />
        <View style={[styles.row, styles.mtSm]}>
          <Skeleton width="23%" height={64} radius={Radius.lg} delay={380} />
          <Skeleton width="23%" height={64} radius={Radius.lg} delay={420} />
          <Skeleton width="23%" height={64} radius={Radius.lg} delay={460} />
          <Skeleton width="23%" height={64} radius={Radius.lg} delay={500} />
        </View>

        {/* Recent chats */}
        <Skeleton width={110} height={12} radius={Radius.sm} delay={540} style={styles.mtLg} />
        <View style={styles.recentList}>
          <Skeleton width="100%" height={64} radius={Radius.card} delay={580} />
          <Skeleton width="100%" height={64} radius={Radius.card} delay={620} />
          <Skeleton width="100%" height={64} radius={Radius.card} delay={660} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chat: { flex: 1, gap: Spacing.md, padding: Spacing.md },
  left: { alignSelf: 'flex-start', width: '100%', alignItems: 'flex-start' },
  right: { alignSelf: 'flex-end', width: '100%', alignItems: 'flex-end' },
  history: { flex: 1, gap: Spacing.sm, paddingTop: Spacing.sm },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  historyText: { flex: 1, gap: 2 },
  appRoot: { flex: 1 },
  appPage: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  greeting: {
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  recentList: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  mtSm: { marginTop: Spacing.sm },
  mtLg: { marginTop: Spacing.sm },
});
