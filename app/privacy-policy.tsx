import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import {
  PRIVACY_POLICY_INTRO,
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_POLICY_UPDATED,
} from '@/constants/privacy-policy';
import { useTheme } from '@/hooks/use-theme';

export default function PrivacyPolicyScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.sm,
          },
        ]}>
        <IconButton
          icon="arrow-left"
          variant="ghost"
          accessibilityLabel="Back"
          onPress={() => router.back()}
        />
        <Text style={[Typography.heading, { color: colors.text }]}>Privacy policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: insets.bottom + Spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={[Typography.caption, { color: colors.textMuted }]}>
          Last updated: {PRIVACY_POLICY_UPDATED} · Ragmob AI Chat Assistant
        </Text>
        <Text style={[Typography.body, styles.intro, { color: colors.textSecondary }]}>
          {PRIVACY_POLICY_INTRO}
        </Text>

        {PRIVACY_POLICY_SECTIONS.map((section) => (
          <View
            key={section.title}
            style={[
              styles.card,
              { backgroundColor: colors.surface },
            ]}>
            <Text style={[Typography.heading, styles.sectionTitle, { color: colors.text }]}>
              {section.title}
            </Text>
            {section.paragraphs?.map((p) => (
              <Text
                key={p.slice(0, 24)}
                style={[Typography.body, styles.paragraph, { color: colors.textSecondary }]}>
                {p}
              </Text>
            ))}
            {section.bullets?.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <Text style={[Typography.body, { color: colors.textMuted }]}>•</Text>
                <Text style={[Typography.body, styles.bulletText, { color: colors.textSecondary }]}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerSpacer: { width: 48 },
  body: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  intro: { lineHeight: 22 },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionTitle: { fontSize: 17, marginBottom: 2 },
  paragraph: { lineHeight: 22 },
  bulletRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  bulletText: { flex: 1, lineHeight: 22 },
});
