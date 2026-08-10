import { useUser } from '@clerk/clerk-expo';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RagmobMark } from '@/components/brand';
import { PersonaPicker } from '@/components/chat/persona-picker';
import { QuickStarts } from '@/components/home/quick-starts';
import { Button, Card, Screen } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useChatContext } from '@/hooks/chat-context';
import { useContentWidth } from '@/hooks/use-content-width';
import { TAB_SCREEN_EDGES, useTabScrollPadding } from '@/hooks/use-tab-scroll-padding';
import { useTheme } from '@/hooks/use-theme';
import { CHAT_MODES, type ChatMode, type Conversation } from '@/types/chat';

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');
  }
  if (email) return email.split('@')[0]?.slice(0, 2).toUpperCase() ?? '?';
  return '?';
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

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const { containerStyle, isWide } = useContentWidth();
  const tabScrollPadding = useTabScrollPadding();
  const { conversations, newChat, setMode, setDraft, selectConversation } = useChatContext();

  const firstName = user?.firstName ?? user?.username ?? 'there';
  const email = user?.primaryEmailAddress?.emailAddress;

  const recent = useMemo(
    () =>
      [...conversations]
        .filter((c) => c.messages.length > 0)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 5),
    [conversations],
  );

  const goToChat = () => {
    router.push('/(tabs)/chat');
  };

  /** Opens Chat tab with the full history sheet (all saved conversations). */
  const seeAllChats = () => {
    router.push('/(tabs)/chat?history=1');
  };

  const openNewChat = () => {
    newChat();
    goToChat();
  };

  const openWithMode = (mode: ChatMode) => {
    newChat();
    setMode(mode);
    goToChat();
  };

  const openWithPrompt = (prompt: string) => {
    newChat();
    setDraft(prompt);
    goToChat();
  };

  const openConversation = (conversation: Conversation) => {
    selectConversation(conversation.id);
    goToChat();
  };

  return (
    <Screen
      scroll
      padded={false}
      edges={TAB_SCREEN_EDGES}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: tabScrollPadding }]}>
      <View style={[styles.page, containerStyle, isWide && styles.pageWide]}>
        {/* Header */}
        <View style={styles.topBar}>
          <RagmobMark size={32} />
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
            {user?.hasImage ? (
              <Image source={{ uri: user.imageUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.lavenderSoft }]}>
                <Text style={[Typography.caption, { color: colors.primaryDark, fontWeight: '700' }]}>
                  {getInitials(user?.fullName, email)}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={[styles.hello, { color: colors.text }]}>Hello, {firstName}</Text>
          <Text style={[Typography.body, { color: colors.textSecondary }]}>
            Your AI assistant, ready when you are.
          </Text>
        </View>

        {/* Primary CTA */}
        <Pressable
          onPress={openNewChat}
          accessibilityRole="button"
          accessibilityLabel="Start a new chat"
          style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}>
          <View style={[styles.ctaCard, { backgroundColor: colors.ink }]}>
            <View style={[styles.ctaIcon, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
              <Feather name="message-circle" size={22} color={colors.onInk} />
            </View>
            <View style={styles.ctaCopy}>
              <Text style={[Typography.heading, { color: colors.onInk }]}>New chat</Text>
              <Text style={[Typography.caption, { color: 'rgba(255,255,255,0.72)' }]}>
                Ask anything — streaming replies in seconds
              </Text>
            </View>
            <View style={[styles.ctaArrow, { backgroundColor: colors.primary }]}>
              <Feather name="arrow-right" size={18} color={colors.ink} />
            </View>
          </View>
        </Pressable>

        <QuickStarts onSelect={openWithPrompt} />

        {/* Personas */}
        <PersonaPicker
          onSelect={openWithMode}
          showHeading
          style={styles.personaSection}
        />

        {/* Recent chats */}
        <View style={styles.sectionHeader}>
          <Text style={[Typography.label, { color: colors.textMuted }]}>Recent chats</Text>
          {recent.length > 0 ? (
            <Pressable hitSlop={8} onPress={seeAllChats}>
              <Text style={[Typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
                See all
              </Text>
            </Pressable>
          ) : null}
        </View>

        {recent.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.lavenderSoft }]}>
              <Feather name="message-square" size={20} color={colors.primaryDark} />
            </View>
            <Text style={[Typography.body, { color: colors.text, fontWeight: '600', textAlign: 'center' }]}>
              No conversations yet
            </Text>
            <Text style={[Typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
              Tap New chat above to start your first session.
            </Text>
            <Button title="Start chatting" onPress={openNewChat} size="md" style={styles.emptyButton} />
          </Card>
        ) : (
          <View style={styles.recentList}>
            {recent.map((conversation) => {
              const modeLabel =
                CHAT_MODES.find((m) => m.id === conversation.mode)?.label ?? 'General';
              return (
                <Pressable
                  key={conversation.id}
                  onPress={() => openConversation(conversation)}
                  style={({ pressed }) => [
                    styles.recentRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}>
                  <View style={[styles.recentIcon, { backgroundColor: colors.lavenderSoft }]}>
                    <Feather name="message-circle" size={18} color={colors.primaryDark} />
                  </View>
                  <View style={styles.recentText}>
                    <Text style={[Typography.body, { color: colors.text, fontWeight: '500' }]} numberOfLines={1}>
                      {conversation.title}
                    </Text>
                    <Text style={[Typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
                      {modeLabel} · {relativeTime(conversation.updatedAt)}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.textMuted} />
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    width: '100%',
  },
  pageWide: {
    paddingTop: Spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    marginBottom: Spacing.lg,
    gap: 6,
  },
  hello: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    marginBottom: Spacing.lg,
  },
  ctaIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  ctaArrow: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaSection: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  recentList: {
    gap: Spacing.sm,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 64,
  },
  recentIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentText: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyButton: {
    marginTop: Spacing.sm,
    minWidth: 160,
  },
});
