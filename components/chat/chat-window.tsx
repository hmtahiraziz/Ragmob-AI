import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MessageBubble } from '@/components/chat/message-bubble';
import { ChatInput } from '@/components/chat/chat-input';
import { ConversationSheet } from '@/components/chat/conversation-sheet';
import { ModeSelector } from '@/components/chat/mode-selector';
import { MessageActionSheet, type MessageAction } from '@/components/chat/message-action-sheet';
import { RagmobWordmark } from '@/components/brand';
import { Banner, ChatSkeleton, EmptyState, IconButton } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useChatContext } from '@/hooks/chat-context';
import { useContentWidth } from '@/hooks/use-content-width';
import { useHealth } from '@/hooks/use-health';
import { useKeyboardInset } from '@/hooks/use-keyboard-inset';
import { useTheme } from '@/hooks/use-theme';
import type { ChatMessage } from '@/types/chat';

const EXAMPLE_PROMPTS = [
  'Explain quantum computing in simple terms',
  'Write a short poem about the ocean',
  'What are three tips for learning a new language?',
];

const NEAR_BOTTOM_THRESHOLD = 96;
const DEFAULT_COMPOSER_HEIGHT = 72;

function isBackendOnline(status: string | undefined) {
  return status === 'healthy' || status === 'ok';
}

export function ChatWindow() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { containerStyle, isWide } = useContentWidth();
  const router = useRouter();
  const { history } = useLocalSearchParams<{ history?: string }>();
  const keyboardInset = useKeyboardInset();
  const {
    conversations,
    activeId,
    messages,
    status,
    error,
    draft,
    hydrated,
    isLoading,
    mode,
    setDraft,
    setMode,
    send,
    stop,
    regenerate,
    newChat,
    selectConversation,
    renameConversation,
    deleteConversation,
  } = useChatContext();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const [composerHeight, setComposerHeight] = useState(DEFAULT_COMPOSER_HEIGHT);
  const {
    data: health,
    isError: healthError,
    isLoading: healthLoading,
    isRefreshing,
    refresh,
  } = useHealth();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const isNearBottomRef = useRef(true);

  // Home → "See all" opens the history sheet with every saved conversation.
  useFocusEffect(
    useCallback(() => {
      if (history !== '1') return;
      setSheetVisible(true);
      router.setParams({ history: undefined });
    }, [history, router]),
  );

  const backendOffline =
    !healthLoading && (healthError || !isBackendOnline(health?.status));

  /** Space reserved at the bottom of the list so messages clear the composer + keyboard. */
  const listBottomPadding = composerHeight + keyboardInset + Spacing.sm;

  const scrollToEnd = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const scrollToEndIfNearBottom = useCallback(
    (animated = true) => {
      if (isNearBottomRef.current) {
        scrollToEnd(animated);
      }
    },
    [scrollToEnd],
  );

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    isNearBottomRef.current = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    scrollToEndIfNearBottom(true);
  }, [messages, status, scrollToEndIfNearBottom]);

  // Re-scroll when keyboard opens/closes or composer height changes.
  useEffect(() => {
    if (keyboardInset > 0) {
      const timer = setTimeout(() => scrollToEnd(true), Platform.OS === 'android' ? 80 : 40);
      return () => clearTimeout(timer);
    }
  }, [keyboardInset, scrollToEnd]);

  const handleSubmit = useCallback(() => {
    const question = draft;
    if (!question.trim()) return;
    isNearBottomRef.current = true;
    setDraft('');
    void send(question);
    scrollToEnd(true);
  }, [draft, send, setDraft, scrollToEnd]);

  const handleInputFocus = useCallback(() => {
    isNearBottomRef.current = true;
    scrollToEnd(true);
  }, [scrollToEnd]);

  const lastAssistantId = useMemo(
    () => [...messages].reverse().find((m) => m.role === 'assistant')?.id,
    [messages],
  );

  const messageActions = useMemo<MessageAction[]>(() => {
    if (!actionMessage) return [];
    const actions: MessageAction[] = [
      {
        key: 'copy',
        label: 'Copy',
        icon: 'copy',
        onPress: () => {
          void Clipboard.setStringAsync(actionMessage.content);
          if (process.env.EXPO_OS === 'ios') {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      },
      {
        key: 'share',
        label: 'Share',
        icon: 'share-2',
        onPress: () => {
          void Share.share({ message: actionMessage.content });
        },
      },
    ];
    if (actionMessage.role === 'assistant' && actionMessage.id === lastAssistantId && !isLoading) {
      actions.push({
        key: 'regenerate',
        label: 'Regenerate',
        icon: 'refresh-cw',
        onPress: () => regenerate(),
      });
    }
    return actions;
  }, [actionMessage, lastAssistantId, isLoading, regenerate]);

  const listFooter = useMemo(() => {
    if (!hydrated || messages.length > 0 || backendOffline) {
      return null;
    }
    return (
      <View style={styles.prompts}>
        {EXAMPLE_PROMPTS.map((prompt) => (
          <Pressable
            key={prompt}
            onPress={() => setDraft(prompt)}
            style={({ pressed }) => [
              styles.promptChip,
              {
                backgroundColor: colors.surface2,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <Text style={[Typography.caption, { color: colors.textSecondary }]}>{prompt}</Text>
          </Pressable>
        ))}
      </View>
    );
  }, [hydrated, messages.length, backendOffline, colors, setDraft]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: insets.top,
            height: 56 + insets.top,
          },
        ]}>
        <View style={[styles.headerRow, containerStyle]}>
          <View style={styles.headerLeft}>
            <RagmobWordmark markSize={28} />
          </View>
          <View style={styles.headerRight}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: backendOffline ? colors.danger : colors.success },
              ]}
            />
            <IconButton
              icon="message-square"
              variant="ghost"
              accessibilityLabel="Chat history"
              onPress={() => setSheetVisible(true)}
            />
            <IconButton
              icon="edit"
              variant="ghost"
              accessibilityLabel="New chat"
              onPress={() => newChat()}
            />
            <IconButton
              icon="user"
              variant="ghost"
              accessibilityLabel="Account"
              onPress={() => router.push('/(tabs)/settings')}
            />
          </View>
        </View>
      </View>

      <ModeSelector
        mode={mode}
        onChange={setMode}
        disabled={messages.length > 0 || isLoading}
      />

      <ConversationSheet
        visible={sheetVisible}
        conversations={conversations}
        activeId={activeId}
        onClose={() => setSheetVisible(false)}
        onSelect={selectConversation}
        onNew={newChat}
        onRename={renameConversation}
        onDelete={deleteConversation}
      />

      {backendOffline ? (
        <Banner
          tone="warning"
          message="Backend offline · Check your connection"
          style={[styles.banner, containerStyle]}
        />
      ) : null}

      {error ? (
        <Banner
          tone="error"
          message={error}
          actionLabel="Retry"
          onAction={() => regenerate()}
          style={[styles.banner, containerStyle]}
        />
      ) : null}

      <View style={styles.body}>
        {!hydrated ? (
          <ChatSkeleton />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              containerStyle,
              isWide && styles.listContentWide,
              { paddingBottom: listBottomPadding },
              messages.length === 0 && styles.listEmpty,
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={() => scrollToEndIfNearBottom(false)}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => void refresh()}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="zap"
                title="Ask anything"
                subtitle="Pick a mode above, then send a message to get tailored help."
              />
            }
            ListFooterComponent={listFooter}
            renderItem={({ item, index }) => (
              <MessageBubble
                message={item}
                isStreaming={isLoading && item.role === 'assistant' && index === messages.length - 1}
                onLongPress={setActionMessage}
              />
            )}
          />
        )}

        <MessageActionSheet
          visible={actionMessage !== null}
          actions={messageActions}
          onClose={() => setActionMessage(null)}
        />

        {/* Composer docked above keyboard (absolute positioning — reliable on Android edge-to-edge). */}
        <View
          style={[styles.composerDock, { bottom: keyboardInset }]}
          onLayout={(event) => {
            const next = event.nativeEvent.layout.height;
            if (next > 0 && Math.abs(next - composerHeight) > 1) {
              setComposerHeight(next);
            }
          }}>
          <View style={[styles.composerInner, containerStyle]}>
            <ChatInput
              value={draft}
              onChangeText={setDraft}
              onSend={handleSubmit}
              onStop={stop}
              onFocus={handleInputFocus}
              isLoading={isLoading}
              disabled={backendOffline}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, position: 'relative' },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: Spacing.md,
    width: '100%',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 0 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexShrink: 0 },
  statusDot: { width: 8, height: 8, borderRadius: Radius.full },
  banner: { marginHorizontal: Spacing.md, marginTop: Spacing.sm, width: '100%' },
  list: { flex: 1 },
  listContent: { padding: Spacing.md, flexGrow: 1, width: '100%' },
  listContentWide: { alignSelf: 'center' },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  composerDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  composerInner: {
    width: '100%',
  },
  prompts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
  },
  promptChip: {
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
});
