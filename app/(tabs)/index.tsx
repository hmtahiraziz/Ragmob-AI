import { useUser } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PERSONA_ICONS } from '@/components/chat/persona-picker';
import { RagmobWordmark } from '@/components/brand';
import { AssistantWidget } from '@/components/home/assistant-widget';
import { QuickStarts } from '@/components/home/quick-starts';
import { AppSkeleton, Banner, Screen } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useChatContext } from '@/hooks/chat-context';
import { useContentWidth } from '@/hooks/use-content-width';
import { useHealth } from '@/hooks/use-health';
import { TAB_SCREEN_EDGES, useTabScrollPadding } from '@/hooks/use-tab-scroll-padding';
import { useTheme } from '@/hooks/use-theme';
import { getProfileDisplayName, getProfileFirstName } from '@/lib/auth/profile-name';
import { requestOpenAttach } from '@/lib/chat/pending-actions';
import { CHAT_MODES, stripImageMarker, type Conversation } from '@/types/chat';

function isBackendOnline(status: string | undefined) {
  return status === 'healthy' || status === 'ok';
}

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
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function previewFor(conversation: Conversation) {
  for (let i = conversation.messages.length - 1; i >= 0; i -= 1) {
    const message = conversation.messages[i];
    const text = stripImageMarker(message.content);
    if (text) return text;
    if (message.image?.uri) return 'Photo attached';
  }
  return 'Empty chat';
}

function personaAccent(mode: Conversation['mode'], colors: ReturnType<typeof useTheme>['colors']) {
  switch (mode) {
    case 'coder':
      return { bg: 'rgba(10,10,10,0.06)', fg: colors.ink };
    case 'writer':
      return { bg: colors.amberSoft, fg: colors.onAmber };
    case 'coach':
      return { bg: 'rgba(63,166,106,0.14)', fg: colors.success };
    default:
      return { bg: colors.lavenderSoft, fg: colors.primaryDark };
  }
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const { containerStyle, isWide } = useContentWidth();
  const tabScrollPadding = useTabScrollPadding();
  const {
    conversations,
    activeId,
    hydrated,
    newChat,
    setDraft,
    selectConversation,
  } = useChatContext();
  const {
    data: health,
    isError: healthError,
    isLoading: healthLoading,
    isRefreshing,
    refresh,
  } = useHealth();

  const firstName = getProfileFirstName(user);
  const email = user?.primaryEmailAddress?.emailAddress;
  const displayName = getProfileDisplayName(user);
  const backendOffline =
    !healthLoading && (healthError || !isBackendOnline(health?.status));

  const recent = useMemo(
    () =>
      [...conversations]
        .filter((c) => c.messages.length > 0)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 5),
    [conversations],
  );

  const lastConversation = recent[0] ?? null;

  if (!hydrated) {
    return <AppSkeleton />;
  }

  const goToChat = () => {
    router.push('/(tabs)/chat');
  };

  const seeAllChats = () => {
    router.push('/(tabs)/history');
  };

  const openNewChat = () => {
    newChat();
    goToChat();
  };

  const openAskWithPhoto = () => {
    newChat();
    requestOpenAttach();
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
        <View style={styles.topBar}>
          <View style={styles.brandBlock}>
            <RagmobWordmark markSize={26} />
          </View>
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            hitSlop={4}
            style={({ pressed }) => [
              styles.profileChip,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.88 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}>
            {user?.hasImage ? (
              <Image source={{ uri: user.imageUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View
                style={[
                  styles.avatar,
                  styles.avatarFallback,
                  { backgroundColor: colors.lavenderSoft },
                ]}>
                <Text style={[Typography.caption, { color: colors.primaryDark, fontWeight: '700' }]}>
                  {getInitials(displayName, email)}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {backendOffline ? (
          <Banner
            tone="warning"
            message="Assistant offline · New chats will wait until you're back online"
            actionLabel={isRefreshing ? 'Checking…' : 'Retry'}
            onAction={() => {
              if (!isRefreshing) void refresh();
            }}
            style={styles.offlineBanner}
          />
        ) : null}

        <AssistantWidget
          firstName={firstName}
          lastConversation={lastConversation}
          onNewChat={openNewChat}
          onContinue={openConversation}
          onAskWithPhoto={openAskWithPhoto}
          onOpenHistory={seeAllChats}
        />

        <QuickStarts onSelect={openWithPrompt} />

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Recent chats</Text>
            {recent.length > 0 ? (
              <View style={[styles.countPill, { backgroundColor: colors.surface2 }]}>
                <Text style={[styles.countLabel, { color: colors.textSecondary }]}>
                  {recent.length}
                </Text>
              </View>
            ) : null}
          </View>
          {recent.length > 0 ? (
            <Pressable
              hitSlop={8}
              onPress={seeAllChats}
              accessibilityRole="button"
              accessibilityLabel="See all chats"
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[styles.seeAll, { color: colors.textSecondary }]}>See all</Text>
            </Pressable>
          ) : null}
        </View>

        {recent.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.lavenderSoft }]}>
              <Feather name="message-square" size={20} color={colors.primaryDark} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No conversations yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Start a chat above — it will show up here for quick reopen.
            </Text>
            <Pressable
              onPress={openNewChat}
              accessibilityRole="button"
              accessibilityLabel="New chat"
              style={({ pressed }) => [
                styles.emptyNewBtn,
                {
                  backgroundColor: colors.ink,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}>
              <Feather name="edit-3" size={15} color={colors.onInk} />
              <Text style={[styles.emptyNewLabel, { color: colors.onInk }]}>New chat</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.recentList}>
            {recent.map((conversation) => {
              const isActive = conversation.id === activeId;
              const accent = personaAccent(conversation.mode, colors);
              const modeLabel =
                CHAT_MODES.find((m) => m.id === conversation.mode)?.label ?? 'General';
              const preview = previewFor(conversation);

              return (
                <Pressable
                  key={conversation.id}
                  onPress={() => openConversation(conversation)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`Open ${conversation.title}`}
                  style={({ pressed }) => [
                    styles.recentRow,
                    {
                      backgroundColor: isActive ? colors.lavenderSoft : colors.surface,
                      borderColor: isActive ? colors.primary : 'transparent',
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}>
                  {isActive ? (
                    <View style={[styles.activeBar, { backgroundColor: colors.ink }]} />
                  ) : null}
                  <View style={[styles.recentIcon, { backgroundColor: accent.bg }]}>
                    <Feather
                      name={PERSONA_ICONS[conversation.mode]}
                      size={16}
                      color={accent.fg}
                    />
                  </View>
                  <View style={styles.recentText}>
                    <View style={styles.recentTitleLine}>
                      <Text style={[styles.recentTitle, { color: colors.text }]} numberOfLines={1}>
                        {conversation.title}
                      </Text>
                      <Text style={[styles.recentTime, { color: colors.textMuted }]}>
                        {relativeTime(conversation.updatedAt)}
                      </Text>
                    </View>
                    <Text
                      style={[styles.recentPreview, { color: colors.textSecondary }]}
                      numberOfLines={1}>
                      {modeLabel} · {preview}
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
    paddingTop: Spacing.md,
    width: '100%',
  },
  pageWide: {
    paddingTop: Spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.md,
    minHeight: 44,
  },
  brandBlock: {
    flex: 1,
    minWidth: 0,
  },
  profileChip: {
    padding: 2,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBanner: {
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    paddingHorizontal: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minWidth: 0,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  countLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  recentList: {
    gap: 0,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    minHeight: 72,
    position: 'relative',
    overflow: 'hidden',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderRadius: Radius.full,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  recentText: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  recentTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minWidth: 0,
  },
  recentTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  recentTime: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    flexShrink: 0,
  },
  recentPreview: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  emptyNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
  },
  emptyNewLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
