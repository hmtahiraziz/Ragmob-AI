import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Accent = 'lavender' | 'ink' | 'amber' | 'success';

type FeaturedPrompt = {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  prompt: string;
  accent: Accent;
};

const FEATURED: FeaturedPrompt[] = [
  {
    id: 'summarize',
    icon: 'file-text',
    title: 'Summarize',
    subtitle: 'Notes → bullets',
    prompt:
      'Summarize the following notes into clear bullet points, then list 3 action items:',
    accent: 'lavender',
  },
  {
    id: 'debug',
    icon: 'code',
    title: 'Debug code',
    subtitle: 'Find and fix bugs',
    prompt:
      'Help me debug this. Explain the likely cause, then give a corrected version:\n\n',
    accent: 'ink',
  },
  {
    id: 'email',
    icon: 'mail',
    title: 'Draft email',
    subtitle: 'Ready to send',
    prompt:
      'Draft a professional email. Keep it concise, friendly, and clear. Topic:',
    accent: 'amber',
  },
  {
    id: 'plan',
    icon: 'calendar',
    title: 'Make a plan',
    subtitle: 'Week ahead steps',
    prompt:
      'Create a realistic 7-day plan with daily goals and time estimates for:',
    accent: 'success',
  },
];

type QuickStartsProps = {
  onSelect: (prompt: string) => void;
};

export function QuickStarts({ onSelect }: QuickStartsProps) {
  const { colors } = useTheme();

  function accentColors(kind: Accent) {
    switch (kind) {
      case 'lavender':
        return { bg: colors.lavenderSoft, fg: colors.primaryDark };
      case 'ink':
        return { bg: colors.ink, fg: colors.onInk };
      case 'amber':
        return { bg: colors.amberSoft, fg: colors.onAmber };
      case 'success':
        return { bg: 'rgba(63,166,106,0.14)', fg: colors.success };
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Suggested prompts</Text>
        <Text style={[styles.headerHint, { color: colors.textSecondary }]}>Tap to start</Text>
      </View>

      <View style={styles.grid}>
        {FEATURED.map((item) => {
          const accent = accentColors(item.accent);
          return (
            <Pressable
              key={item.id}
              onPress={() => onSelect(item.prompt)}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.subtitle}`}
              style={({ pressed }) => [
                styles.tile,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}>
              <View style={styles.tileTop}>
                <View style={[styles.icon, { backgroundColor: accent.bg }]}>
                  <Feather name={item.icon} size={15} color={accent.fg} />
                </View>
                <View style={[styles.arrow, { backgroundColor: colors.surface2 }]}>
                  <Feather name="arrow-up-right" size={12} color={colors.textSecondary} />
                </View>
              </View>

              <View style={styles.copy}>
                <Text style={[styles.tileTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.tileSub, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  headerHint: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tile: {
    width: '48.5%',
    flexGrow: 1,
    minWidth: '46%',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    minHeight: 112,
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    gap: 3,
  },
  tileTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  tileSub: {
    fontSize: 12,
    lineHeight: 16,
  },
});
