import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  keyboardAware?: boolean;
  padded?: boolean;
  edges?: Edge[];
  fadeIn?: boolean;
  /** Optional full-bleed background gradient (overrides the solid surface). */
  gradient?: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  scroll = false,
  keyboardAware = false,
  padded = true,
  edges = ['top', 'bottom'],
  fadeIn = false,
  gradient,
  style,
  contentContainerStyle,
}: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(fadeIn ? 0 : 1)).current;

  useEffect(() => {
    if (!fadeIn) return;
    const anim = Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [fadeIn, opacity]);

  const safeArea: ViewStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  const padding: ViewStyle = padded
    ? { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg }
    : {};

  const surface = gradient ? 'transparent' : colors.background;

  const body = scroll ? (
    keyboardAware ? (
      <KeyboardAwareScrollView
        style={[styles.flex, { backgroundColor: surface }]}
        contentContainerStyle={[padding, contentContainerStyle]}
        bottomInset={Spacing.xl}>
        {children}
      </KeyboardAwareScrollView>
    ) : (
      <ScrollView
        style={[styles.flex, { backgroundColor: surface }]}
        contentContainerStyle={[padding, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    )
  ) : (
    <View style={[styles.flex, padding, contentContainerStyle]}>{children}</View>
  );

  return (
    <Animated.View
      style={[
        styles.flex,
        { backgroundColor: surface },
        safeArea,
        style,
        { opacity },
        fadeIn && Platform.OS === 'web' ? styles.webFadeRoot : null,
      ]}>
      {gradient ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      ) : null}
      {body}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  webFadeRoot: { overflow: 'visible' },
});
