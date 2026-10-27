import * as Haptics from 'expo-haptics';
import { type BottomTabBarButtonProps } from 'expo-router/js-tabs';
import { PlatformPressable } from 'expo-router/react-navigation';
import { useRef } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';

/**
 * Tab press — native-feeling feedback:
 * iOS: soft scale + fade + selection haptic
 * Android: Material ripple + selection haptic
 */
export function HapticTab({
  ref: _ref,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: BottomTabBarButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animateIn = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: Platform.OS === 'ios' ? 0.92 : 0.97,
        useNativeDriver: true,
        speed: 60,
        bounciness: 0,
      }),
      Animated.timing(opacity, {
        toValue: Platform.OS === 'ios' ? 0.55 : 0.88,
        duration: 70,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 28,
        bounciness: 6,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Animated.View style={[styles.wrap, { opacity, transform: [{ scale }] }]}>
      <PlatformPressable
        {...rest}
        android_ripple={
          Platform.OS === 'android'
            ? {
                borderless: true,
                color: 'rgba(10,10,10,0.12)',
                radius: 26,
              }
            : undefined
        }
        // Opacity is driven by Animated above — keep Pressable fully opaque.
        pressOpacity={1}
        style={[styles.hit, style]}
        onPressIn={(ev) => {
          animateIn();
          void Haptics.selectionAsync();
          onPressIn?.(ev);
        }}
        onPressOut={(ev) => {
          animateOut();
          onPressOut?.(ev);
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  hit: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
});
