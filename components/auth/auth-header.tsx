import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { RagmobMark } from '@/components/brand';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AuthHeaderProps = {
  title: string;
  subtitle?: string;
};

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  const { colors } = useTheme();
  const markOpacity = useRef(new Animated.Value(0)).current;
  const markScale = useRef(new Animated.Value(0.86)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.parallel([
        Animated.spring(markScale, {
          toValue: 1,
          useNativeDriver: true,
          stiffness: 140,
          damping: 14,
        }),
        Animated.timing(markOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.spring(textY, {
          toValue: 0,
          useNativeDriver: true,
          stiffness: 120,
          damping: 16,
        }),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  }, [markOpacity, markScale, textOpacity, textY]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.brand,
          { opacity: markOpacity, transform: [{ scale: markScale }] },
        ]}>
        <View style={[styles.markRing, { backgroundColor: colors.lavenderSoft }]}>
          <RagmobMark size={56} />
        </View>
        <Text style={[styles.brandName, Typography.heading, { color: colors.text }]}>Ragmob</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.copy,
          { opacity: textOpacity, transform: [{ translateY: textY }] },
        ]}>
        <Text style={[styles.title, Typography.display, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, Typography.body, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: Spacing.md },
  brand: { alignItems: 'center', marginBottom: Spacing.lg },
  markRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  brandName: {
    letterSpacing: -0.4,
    fontWeight: '700',
  },
  copy: { alignItems: 'center', width: '100%' },
  title: { textAlign: 'center' },
  subtitle: {
    textAlign: 'center',
    marginTop: Spacing.sm,
    maxWidth: 300,
    lineHeight: 22,
  },
});
