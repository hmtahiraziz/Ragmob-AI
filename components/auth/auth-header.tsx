import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { RagmobMark } from '@/components/brand';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AuthHeaderProps = {
  title: string;
  subtitle?: string;
};

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, stiffness: 100, damping: 15 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [translateY, opacity]);

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
      <RagmobMark size={64} style={styles.badge} />
      <Text style={[styles.title, Typography.display, { color: colors.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, Typography.body, { color: colors.textSecondary }]}>{subtitle}</Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: Spacing.xl },
  badge: { marginBottom: Spacing.lg },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: Spacing.sm, maxWidth: 320 },
});
