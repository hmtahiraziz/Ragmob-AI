import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

/** Official multicolor Google "G" — loaded at runtime, no native SVG dependency. */
const GOOGLE_LOGO_URI =
  'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png';

type GoogleIconProps = {
  size?: number;
};

export function GoogleIcon({ size = 18 }: GoogleIconProps) {
  return (
    <Image
      source={{ uri: GOOGLE_LOGO_URI }}
      style={[styles.icon, { width: size, height: size }]}
      contentFit="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  icon: {},
});
