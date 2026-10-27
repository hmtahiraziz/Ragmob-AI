import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Gradients, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { stripImageMarker, type Conversation } from '@/types/chat';

type AssistantWidgetProps = {
  firstName: string;
  lastConversation: Conversation | null;
  onNewChat: () => void;
  onContinue: (conversation: Conversation) => void;
  onAskWithPhoto: () => void;
  onOpenHistory: () => void;
};

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function relativeTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function lastMessagePreview(conversation: Conversation) {
  const last = conversation.messages[conversation.messages.length - 1];
  if (!last) return conversation.title || 'Last conversation';
  const text = stripImageMarker(last.content).replace(/\s+/g, ' ').trim();
  if (!text) return last.image ? 'Photo attached' : conversation.title || 'Last conversation';
  return text;
}

type QuickAction = {
  key: string;
  label: string;
  hint: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  iconBg: string;
  iconFg: string;
};

export function AssistantWidget({
  firstName,
  lastConversation,
  onNewChat,
  onContinue,
  onAskWithPhoto,
  onOpenHistory,
}: AssistantWidgetProps) {
  const { colors } = useTheme();

  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);

  const hasContinue = Boolean(lastConversation);
  const primaryLabel = hasContinue ? 'Continue chat' : 'Start chatting';
  const primaryHint = lastConversation
    ? lastMessagePreview(lastConversation)
    : 'Text, photo, or voice — your call';
  const primaryMeta = lastConversation
    ? `${relativeTime(lastConversation.updatedAt)} · ${lastConversation.messages.length} msgs`
    : null;

  const quickActions: QuickAction[] = [
    {
      key: 'new',
      label: 'New chat',
      hint: 'Blank slate',
      icon: 'edit-3',
      onPress: onNewChat,
      iconBg: colors.lavenderSoft,
      iconFg: colors.primaryDark,
    },
    {
      key: 'photo',
      label: 'Photo Q&A',
      hint: 'Ask with image',
      icon: 'image',
      onPress: onAskWithPhoto,
      iconBg: colors.amberSoft,
      iconFg: colors.onAmber,
    },
    {
      key: 'history',
      label: 'History',
      hint: 'Past chats',
      icon: 'clock',
      onPress: onOpenHistory,
      iconBg: 'rgba(10,10,10,0.06)',
      iconFg: colors.ink,
    },
  ];

  return (
    <View style={styles.section}>
      <View style={styles.greetingBlock}>
        <Text style={[styles.kicker, { color: colors.textSecondary }]}>{greeting}</Text>
        <Text style={[styles.hello, { color: colors.text }]} numberOfLines={1}>
          {firstName}
        </Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          What do you want to work on?
        </Text>
      </View>

      <View style={styles.card}>
        <LinearGradient
          colors={[...Gradients.auth]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}>
          <View pointerEvents="none" style={styles.atmosphere}>
            <View style={[styles.orb, styles.orbLavender, { backgroundColor: colors.primary }]} />
            <View style={[styles.orb, styles.orbAmber, { backgroundColor: colors.accentAmber }]} />
          </View>

          <Pressable
            onPress={() => {
              if (lastConversation) onContinue(lastConversation);
              else onNewChat();
            }}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
            accessibilityHint={primaryHint}
            style={({ pressed }) => [
              styles.primaryCta,
              {
                backgroundColor: colors.ink,
                opacity: pressed ? 0.94 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}>
            <View style={[styles.primaryIcon, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
              <Feather
                name={hasContinue ? 'message-circle' : 'zap'}
                size={18}
                color={colors.onInk}
              />
            </View>
            <View style={styles.primaryCopy}>
              <Text style={[styles.primaryTitle, { color: colors.onInk }]}>{primaryLabel}</Text>
              <Text style={styles.primaryHint} numberOfLines={1}>
                {primaryHint}
              </Text>
              {primaryMeta ? (
                <Text style={styles.primaryMeta} numberOfLines={1}>
                  {primaryMeta}
                </Text>
              ) : null}
            </View>
            <View style={[styles.primaryArrow, { backgroundColor: colors.primary }]}>
              <Feather name="arrow-right" size={16} color={colors.ink} />
            </View>
          </Pressable>

          <View style={styles.quickRow}>
            {quickActions.map((action) => (
              <Pressable
                key={action.key}
                onPress={action.onPress}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                accessibilityHint={action.hint}
                style={({ pressed }) => [
                  styles.quickTile,
                  {
                    backgroundColor: pressed ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.72)',
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}>
                <View style={[styles.quickIcon, { backgroundColor: action.iconBg }]}>
                  <Feather name={action.icon} size={15} color={action.iconFg} />
                </View>
                <View style={styles.quickCopy}>
                  <Text style={[styles.quickLabel, { color: colors.text }]} numberOfLines={1}>
                    {action.label}
                  </Text>
                  <Text style={[styles.quickHint, { color: colors.textMuted }]} numberOfLines={1}>
                    {action.hint}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  greetingBlock: {
    gap: 2,
    paddingHorizontal: 2,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
    lineHeight: 18,
  },
  hello: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  sub: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.sm + 2,
    overflow: 'hidden',
    position: 'relative',
  },
  atmosphere: {
    ...StyleSheet.absoluteFill,
  },
  orb: {
    position: 'absolute',
    borderRadius: Radius.full,
    opacity: 0.18,
  },
  orbLavender: {
    width: 140,
    height: 140,
    top: -48,
    right: -36,
  },
  orbAmber: {
    width: 100,
    height: 100,
    bottom: -40,
    left: -28,
    opacity: 0.22,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    minHeight: 72,
  },
  primaryIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  primaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  primaryHint: {
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.78)',
  },
  primaryMeta: {
    fontSize: 11,
    lineHeight: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  primaryArrow: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickTile: {
    flex: 1,
    gap: 8,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.lg,
    minHeight: 84,
  },
  quickIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCopy: {
    gap: 1,
  },
  quickLabel: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  quickHint: {
    fontSize: 11,
    lineHeight: 14,
  },
});
