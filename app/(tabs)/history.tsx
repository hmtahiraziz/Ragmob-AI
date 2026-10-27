import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PERSONA_ICONS } from '@/components/chat/persona-picker';
import { Button, EmptyState, HistorySkeleton, Screen } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAppFeedback } from '@/hooks/use-app-feedback';
import { useChatContext } from '@/hooks/chat-context';
import { useContentWidth } from '@/hooks/use-content-width';
import { TAB_SCREEN_EDGES, useTabScrollPadding } from '@/hooks/use-tab-scroll-padding';
import { useTheme } from '@/hooks/use-theme';
import { CHAT_MODES, stripImageMarker, type Conversation } from '@/types/chat';

const SECTION_ORDER = ['Today', 'Yesterday', 'Previous 7 days', 'Older'] as const;
type SectionTitle = (typeof SECTION_ORDER)[number];

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

function sectionFor(timestamp: number): SectionTitle {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  const weekAgo = startOfToday - 7 * 86_400_000;
  if (timestamp >= startOfToday) return 'Today';
  if (timestamp >= startOfYesterday) return 'Yesterday';
  if (timestamp >= weekAgo) return 'Previous 7 days';
  return 'Older';
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

type HistorySection = {
  title: SectionTitle;
  data: Conversation[];
};

export default function HistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { confirm, showToast, showDialog } = useAppFeedback();
  const { containerStyle, isWide } = useContentWidth();
  const tabScrollPadding = useTabScrollPadding();
  const {
    conversations,
    activeId,
    hydrated,
    newChat,
    selectConversation,
    renameConversation,
    deleteConversation,
  } = useChatContext();

  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...conversations]
      .filter((c) => c.messages.length > 0)
      .filter((c) => {
        if (!q) return true;
        const modeLabel = CHAT_MODES.find((m) => m.id === c.mode)?.label ?? '';
        return (
          c.title.toLowerCase().includes(q) ||
          modeLabel.toLowerCase().includes(q) ||
          c.messages.some((m) => m.content.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [conversations, query]);

  const sections = useMemo<HistorySection[]>(() => {
    const buckets = new Map<SectionTitle, Conversation[]>();
    for (const item of filtered) {
      const key = sectionFor(item.updatedAt);
      const list = buckets.get(key);
      if (list) list.push(item);
      else buckets.set(key, [item]);
    }
    return SECTION_ORDER.filter((title) => buckets.has(title)).map((title) => ({
      title,
      data: buckets.get(title)!,
    }));
  }, [filtered]);

  const totalCount = useMemo(
    () => conversations.filter((c) => c.messages.length > 0).length,
    [conversations],
  );

  const openChat = (id?: string) => {
    if (id) selectConversation(id);
    router.push('/(tabs)/chat');
  };

  const handleNewChat = () => {
    newChat();
    router.push('/(tabs)/chat');
  };

  const startRename = (item: Conversation) => {
    setEditingId(item.id);
    setEditingTitle(item.title);
  };

  const commitRename = () => {
    if (editingId) {
      const trimmed = editingTitle.trim();
      if (trimmed) renameConversation(editingId, trimmed);
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleDelete = async (item: Conversation) => {
    if (Platform.OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const ok = await confirm({
      title: 'Delete chat?',
      message: `Remove “${item.title}”? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    if (Platform.OS === 'ios') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    deleteConversation(item.id);
    if (editingId === item.id) {
      setEditingId(null);
      setEditingTitle('');
    }
    showToast({ tone: 'success', message: 'Chat deleted.' });
  };

  const openRowActions = (item: Conversation) => {
    if (Platform.OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    showDialog({
      title: item.title,
      message: 'Manage this conversation',
      actions: [
        {
          label: 'Rename',
          onPress: () => startRename(item),
        },
        {
          label: 'Delete',
          variant: 'danger',
          onPress: () => {
            // Defer so the manage sheet can dismiss before the confirm opens.
            setTimeout(() => {
              void handleDelete(item);
            }, 0);
          },
        },
        { label: 'Cancel', variant: 'ghost' },
      ],
    });
  };

  return (
    <Screen
      padded={false}
      edges={TAB_SCREEN_EDGES}
      contentContainerStyle={{ flex: 1 }}>
      <View style={[styles.page, containerStyle, isWide && styles.pageWide]}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text }]}>History</Text>
              {hydrated && totalCount > 0 ? (
                <View style={[styles.countPill, { backgroundColor: colors.surface2 }]}>
                  <Text style={[styles.countLabel, { color: colors.textSecondary }]}>
                    {query.trim() ? `${filtered.length}/${totalCount}` : totalCount}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {query.trim()
                ? filtered.length === 0
                  ? 'No chats match your search'
                  : `${filtered.length} result${filtered.length === 1 ? '' : 's'}`
                : 'Reopen, rename, or clear past chats'}
            </Text>
          </View>
          <Pressable
            onPress={handleNewChat}
            accessibilityRole="button"
            accessibilityLabel="New chat"
            style={({ pressed }) => [
              styles.newChatBtn,
              {
                backgroundColor: colors.ink,
                opacity: pressed ? 0.88 : 1,
              },
            ]}>
            <Feather name="edit-3" size={15} color={colors.onInk} />
            <Text style={[styles.newChatLabel, { color: colors.onInk }]}>New</Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.searchWrap,
            {
              backgroundColor: searchFocused ? colors.surface : colors.surface2,
              borderColor: searchFocused ? colors.primary : colors.border,
            },
          ]}>
          <Feather name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search title, persona, or message"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, Typography.body, { color: colors.text }]}
            returnKeyType="search"
            clearButtonMode="while-editing"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            {...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null)}
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={({ pressed }) => [
                styles.clearBtn,
                { backgroundColor: colors.surface3, opacity: pressed ? 0.8 : 1 },
              ]}>
              <Feather name="x" size={14} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        {!hydrated ? (
          <HistorySkeleton />
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: tabScrollPadding },
              sections.length === 0 && styles.listEmpty,
            ]}
            stickySectionHeadersEnabled={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            ListEmptyComponent={
              <EmptyState
                icon={query.trim() ? 'search' : 'clock'}
                title={query.trim() ? 'No matching chats' : 'No conversations yet'}
                subtitle={
                  query.trim()
                    ? 'Try a different title, persona, or phrase.'
                    : 'Start chatting and your history will show up here.'
                }
                action={
                  query.trim() ? (
                    <Button
                      title="Clear search"
                      onPress={() => setQuery('')}
                      variant="ghost"
                      style={styles.emptyAction}
                    />
                  ) : (
                    <Button title="New chat" onPress={handleNewChat} style={styles.emptyAction} />
                  )
                }
              />
            }
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                  {section.title}
                </Text>
              </View>
            )}
            renderItem={({ item }) => {
              const isActive = item.id === activeId;
              const isEditing = item.id === editingId;
              const modeLabel = CHAT_MODES.find((m) => m.id === item.mode)?.label ?? 'General';
              const accent = personaAccent(item.mode, colors);
              const icon = PERSONA_ICONS[item.mode];
              const preview = previewFor(item);

              return (
                <View
                  style={[
                    styles.row,
                    {
                      backgroundColor: isActive ? colors.lavenderSoft : colors.surface,
                      borderColor: isActive ? colors.primary : 'transparent',
                    },
                  ]}>
                  {isActive ? (
                    <View style={[styles.activeBar, { backgroundColor: colors.ink }]} />
                  ) : null}
                  <Pressable
                    onPress={() => {
                      if (isEditing) return;
                      openChat(item.id);
                    }}
                    onLongPress={() => openRowActions(item)}
                    delayLongPress={350}
                    style={({ pressed }) => [
                      styles.rowBody,
                      { opacity: pressed && !isEditing ? 0.9 : 1 },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`Open ${item.title}, ${modeLabel}, ${relativeTime(item.updatedAt)}`}>
                    <View style={[styles.rowIcon, { backgroundColor: accent.bg }]}>
                      <Feather name={icon} size={16} color={accent.fg} />
                    </View>
                    <View style={styles.rowMain}>
                      <View style={styles.rowTitleLine}>
                        {isEditing ? (
                          <TextInput
                            value={editingTitle}
                            onChangeText={setEditingTitle}
                            onSubmitEditing={commitRename}
                            onBlur={commitRename}
                            autoFocus
                            returnKeyType="done"
                            style={[Typography.body, styles.editInput, { color: colors.text }]}
                            placeholderTextColor={colors.textMuted}
                            {...(Platform.OS === 'web'
                              ? ({ outlineStyle: 'none' } as object)
                              : null)}
                          />
                        ) : (
                          <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={[styles.rowTitle, { color: colors.text }]}>
                            {item.title}
                          </Text>
                        )}
                        {!isEditing ? (
                          <Text style={[styles.rowTime, { color: colors.textMuted }]}>
                            {relativeTime(item.updatedAt)}
                          </Text>
                        ) : null}
                      </View>
                      <Text
                        style={[styles.rowPreview, { color: colors.textSecondary }]}
                        numberOfLines={1}
                        ellipsizeMode="tail">
                        {modeLabel} · {preview}
                      </Text>
                    </View>
                  </Pressable>
                  <View style={styles.actionSlot}>
                    {isEditing ? (
                      <Pressable
                        onPress={commitRename}
                        accessibilityRole="button"
                        accessibilityLabel="Save title"
                        style={({ pressed }) => [
                          styles.actionChip,
                          {
                            backgroundColor: colors.ink,
                            opacity: pressed ? 0.85 : 1,
                          },
                        ]}>
                        <Feather name="check" size={16} color={colors.onInk} />
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => openRowActions(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`Manage ${item.title}`}
                        hitSlop={6}
                        style={({ pressed }) => [
                          styles.actionChip,
                          {
                            backgroundColor: pressed ? colors.surface3 : 'transparent',
                          },
                        ]}>
                        <Feather name="more-horizontal" size={18} color={colors.textSecondary} />
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    width: '100%',
  },
  pageWide: {
    paddingTop: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minWidth: 0,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
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
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    flexShrink: 0,
  },
  newChatLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    margin: 0,
    minWidth: 0,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flex: 1 },
  listContent: {
    flexGrow: 1,
  },
  listEmpty: {
    justifyContent: 'center',
  },
  sectionHeader: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    paddingHorizontal: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    paddingVertical: Spacing.sm + 2,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    minHeight: 72,
    position: 'relative',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderRadius: Radius.full,
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minWidth: 0,
    paddingVertical: 2,
    paddingRight: Spacing.xs,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minWidth: 0,
  },
  rowTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  rowTime: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    flexShrink: 0,
  },
  rowPreview: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionSlot: {
    flexShrink: 0,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionChip: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 2,
    fontWeight: '600',
  },
  emptyAction: {
    marginTop: Spacing.md,
    minWidth: 160,
  },
});
