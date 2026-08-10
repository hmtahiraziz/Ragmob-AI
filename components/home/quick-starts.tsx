import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Divider } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type QuickStart = {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  prompt: string;
  iconBg: 'lavender' | 'ink' | 'amber' | 'success';
};

const QUICK_STARTS: QuickStart[] = [
  {
    id: 'summarize',
    icon: 'file-text',
    title: 'Summarize notes',
    subtitle: 'Turn long text into clear bullet points',
    prompt: 'Summarize my notes in bullet points',
    iconBg: 'lavender',
  },
  {
    id: 'debug',
    icon: 'code',
    title: 'Debug React Native',
    subtitle: 'Get step-by-step troubleshooting help',
    prompt: 'Help me debug a React Native error',
    iconBg: 'ink',
  },
  {
    id: 'email',
    icon: 'mail',
    title: 'Draft an email',
    subtitle: 'Professional tone, ready to send',
    prompt: 'Draft a professional email reply',
    iconBg: 'amber',
  },
  {
    id: 'routine',
    icon: 'sun',
    title: 'Morning routine',
    subtitle: 'Build a focused start to your day',
    prompt: 'Plan a productive morning routine',
    iconBg: 'success',
  },
];

type QuickStartsProps = {
  onSelect: (prompt: string) => void;
};

export function QuickStarts({ onSelect }: QuickStartsProps) {
  const { colors } = useTheme();

  function iconColors(kind: QuickStart['iconBg']) {
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
      <View style={styles.heading}>
        <Text style={[Typography.label, { color: colors.textMuted }]}>Quick starts</Text>
        <Text style={[Typography.caption, { color: colors.textSecondary }]}>
          Suggested prompts to get you going
        </Text>
      </View>

      <Card padded={false}>
        {QUICK_STARTS.map((item, index) => {
          const accent = iconColors(item.iconBg);
          const isLast = index === QUICK_STARTS.length - 1;

          return (
            <View key={item.id}>
              <Pressable
                onPress={() => onSelect(item.prompt)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}. ${item.subtitle}`}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface2 }]}>
                <View style={[styles.icon, { backgroundColor: accent.bg }]}>
                  <Feather name={item.icon} size={17} color={accent.fg} />
                </View>
                <View style={styles.copy}>
                  <Text style={[Typography.body, styles.title, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[Typography.caption, { color: colors.textMuted }]} numberOfLines={2}>
                    {item.subtitle}
                  </Text>
                </View>
                <Feather name="arrow-up-right" size={16} color={colors.textMuted} />
              </Pressable>
              {!isLast ? <Divider inset={Spacing.lg + 40 + Spacing.md} /> : null}
            </View>
          );
        })}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  heading: {
    gap: 4,
    paddingHorizontal: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 68,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  title: {
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
