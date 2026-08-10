import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

import { Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const markSource = require('@/assets/images/ragmob-mark.png');

type RagmobMarkProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
  onPress?: () => void;
};

/** Ink circle + zap logomark (matches app icon). */
export function RagmobMark({ size = 28, style, onPress }: RagmobMarkProps) {
  const image = (
    <Image
      source={markSource}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      accessibilityLabel="ragmob"
    />
  );

  if (!onPress) return image;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="ragmob logo"
      style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}>
      {image}
    </Pressable>
  );
}

type RagmobWordmarkProps = {
  markSize?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

/** Logomark + lowercase "ragmob" wordmark. */
export function RagmobWordmark({ markSize = 28, style, onPress }: RagmobWordmarkProps) {
  const { colors } = useTheme();

  const content = (
    <>
      <RagmobMark size={markSize} />
      <Text style={[Typography.heading, styles.name, { color: colors.text }]}>ragmob</Text>
    </>
  );

  if (!onPress) {
    return <View style={[styles.wordmark, style]}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel="ragmob logo"
      style={({ pressed }) => [styles.wordmark, style, { opacity: pressed ? 0.82 : 1 }]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  name: { flexShrink: 1 },
});
