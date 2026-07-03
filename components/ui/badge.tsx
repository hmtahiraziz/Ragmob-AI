import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';

type BadgeProps = {
  label: string;
  background: string;
  color: string;
  style?: StyleProp<ViewStyle>;
};

/** Small full-round pill label (e.g. "New", "Free ads", "Pro"). */
export function Badge({ label, background, color, style }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: background }, style]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
