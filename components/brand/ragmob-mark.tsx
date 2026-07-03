import { Image } from 'expo-image';
import { StyleSheet, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

import { Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const markSource = require('@/assets/images/splash-icon.png');

type RagmobMarkProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

/** Ink circle + zap logomark (matches app icon). */
export function RagmobMark({ size = 28, style }: RagmobMarkProps) {
  return (
    <Image
      source={markSource}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      accessibilityLabel="ragmob"
    />
  );
}

type RagmobWordmarkProps = {
  markSize?: number;
  style?: StyleProp<ViewStyle>;
};

/** Logomark + lowercase "ragmob" wordmark. */
export function RagmobWordmark({ markSize = 28, style }: RagmobWordmarkProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wordmark, style]}>
      <RagmobMark size={markSize} />
      <Text style={[Typography.heading, styles.name, { color: colors.text }]}>ragmob</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  name: { flexShrink: 1 },
});
