import { useUser } from '@clerk/clerk-expo';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Screen, Tile } from '@/components/ui';
import { RagmobWordmark } from '@/components/brand';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useChatContext } from '@/hooks/chat-context';
import { useTheme } from '@/hooks/use-theme';
import type { Conversation } from '@/types/chat';

const RECENT_ICON_CYCLE = ['lavender', 'ink', 'amber'] as const;

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

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const { conversations, newChat, selectConversation } = useChatContext();

  const firstName = user?.firstName ?? user?.username ?? 'there';
  const email = user?.primaryEmailAddress?.emailAddress;

  const recent = useMemo(
    () =>
      [...conversations]
        .filter((c) => c.messages.length > 0)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 4),
    [conversations],
  );

  const openNewChat = () => {
    newChat();
    router.push('/(tabs)/chat');
  };

  const openConversation = (conversation: Conversation) => {
    selectConversation(conversation.id);
    router.push('/(tabs)/chat');
  };

  return (
    <Screen scroll padded={false} fadeIn contentContainerStyle={styles.content}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <RagmobWordmark markSize={28} />
        </View>
        <Pressable onPress={() => router.push('/profile')}>
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
        <Text style={[styles.hello, { color: colors.text }]}>Hello {firstName}</Text>
        <Text style={[Typography.body, { color: colors.textSecondary }]}>Make your day easy with us</Text>
      </View>

      {/* Hero tiles */}
      <View style={styles.hero}>
        <Tile
          title="Talk with Cooper"
          subtitle="Let's try it now"
          icon="mic"
          background={colors.primary}
          iconBackground={colors.surface}
          iconColor={colors.ink}
          textColor={colors.ink}
          subtitleColor="rgba(10,10,10,0.55)"
          onPress={openNewChat}
          style={styles.heroLeft}
        />
        <View style={styles.heroRight}>
          <Tile
            title="New chat"
            icon="message-square"
            background={colors.accentAmber}
            iconBackground={colors.surface}
            iconColor={colors.ink}
            textColor={colors.ink}
            subtitleColor="rgba(10,10,10,0.55)"
            badge={<Badge label="New" background={colors.surface} color={colors.danger} />}
            onPress={openNewChat}
            style={styles.heroSmall}
          />
          <Tile
            title="Search by image"
            icon="maximize"
            background={colors.ink}
            iconBackground="rgba(255,255,255,0.14)"
            iconColor={colors.onInk}
            textColor={colors.onInk}
            subtitleColor="rgba(255,255,255,0.6)"
            onPress={openNewChat}
            style={styles.heroSmall}
          />
        </View>
      </View>

      {/* Recent Search */}
      <View style={styles.sectionHeader}>
        <Text style={[Typography.heading, { color: colors.text }]}>Recent Search</Text>
        <Pressable hitSlop={8} onPress={() => router.push('/(tabs)/chat')}>
          <Text style={[Typography.caption, { color: colors.textSecondary }]}>See All</Text>
        </Pressable>
      </View>

      {recent.length === 0 ? (
        <View style={[styles.emptyRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[Typography.body, { color: colors.textSecondary }]}>
            No conversations yet. Start a new chat with ragmob.
          </Text>
        </View>
      ) : (
        <View style={styles.recentList}>
          {recent.map((conversation, index) => {
            const accent = RECENT_ICON_CYCLE[index % RECENT_ICON_CYCLE.length];
            const badgeBg =
              accent === 'lavender' ? colors.primary : accent === 'amber' ? colors.accentAmber : colors.ink;
            const badgeFg = accent === 'ink' ? colors.onInk : colors.ink;
            return (
              <Pressable
                key={conversation.id}
                onPress={() => openConversation(conversation)}
                style={({ pressed }) => [
                  styles.recentRow,
                  { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}>
                <View style={[styles.recentIcon, { backgroundColor: badgeBg }]}>
                  <Feather name="message-circle" size={16} color={badgeFg} />
                </View>
                <View style={styles.recentText}>
                  <Text style={[Typography.body, { color: colors.text }]} numberOfLines={1}>
                    {conversation.title}
                  </Text>
                  <Text style={[Typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
                    {conversation.messages.length} messages
                  </Text>
                </View>
                <Feather name="more-horizontal" size={20} color={colors.textMuted} />
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const HERO_HEIGHT = 248;

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xxl },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: Radius.full },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  greeting: { marginBottom: Spacing.lg, gap: 4 },
  hello: { fontSize: 28, fontWeight: '600', letterSpacing: -0.5 },
  hero: { flexDirection: 'row', gap: Spacing.md, height: HERO_HEIGHT, marginBottom: Spacing.xl },
  heroLeft: { flex: 1 },
  heroRight: { flex: 1, gap: Spacing.md },
  heroSmall: { flex: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  recentList: { gap: Spacing.sm },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentText: { flex: 1, gap: 2 },
  emptyRow: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
