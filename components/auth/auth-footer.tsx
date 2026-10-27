import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AuthFooterProps = {
  prompt: string;
  actionLabel: string;
  href: Href;
};

/** Uses replace so sign-in ↔ sign-up never stack on the auth navigator. */
export function AuthFooter({ prompt, actionLabel, href }: AuthFooterProps) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={styles.footer}>
      <Text style={[Typography.body, { color: colors.textSecondary }]}>{prompt} </Text>
      <Pressable
        hitSlop={10}
        accessibilityRole="link"
        onPress={() => router.replace(href)}>
        <Text style={[Typography.body, styles.link, { color: colors.primaryDark }]}>
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  link: { fontWeight: '600' },
});
