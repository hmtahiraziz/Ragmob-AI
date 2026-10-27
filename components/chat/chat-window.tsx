import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { KeyboardStickyView, useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MessageBubble } from '@/components/chat/message-bubble';
import { ChatInput } from '@/components/chat/chat-input';
import { ModeSelector } from '@/components/chat/mode-selector';
import { MessageActionSheet, type MessageAction } from '@/components/chat/message-action-sheet';
import { PERSONA_ICONS } from '@/components/chat/persona-picker';
import { ReportMessageSheet } from '@/components/chat/report-message-sheet';
import { RagmobMark } from '@/components/brand';
import { Banner, Button, ChatSkeleton, EmptyState, IconButton } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAppFeedback } from '@/hooks/use-app-feedback';
import { useChatContext } from '@/hooks/chat-context';
import { useContentWidth } from '@/hooks/use-content-width';
import { useHealth } from '@/hooks/use-health';
import { useTheme } from '@/hooks/use-theme';
import { isApiError } from '@/lib/api';
import type { ReportReason } from '@/lib/api/types';
import { useSpeechInput } from '@/hooks/use-speech-input';
import { consumeOpenAttach } from '@/lib/chat/pending-actions';
import { captureChatImageFromCamera, pickChatImageFromLibrary } from '@/lib/media';
import { CHAT_MODES, type ChatMessage } from '@/types/chat';

const EXAMPLE_PROMPTS = [
  'Explain quantum computing in simple terms',
  'Write a short poem about the ocean',
  'What are three tips for learning a new language?',
];

const NEAR_BOTTOM_THRESHOLD = 120;

function isBackendOnline(status: string | undefined) {
  return status === 'healthy' || status === 'ok';
}

export function ChatWindow() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isCompactHeader = windowWidth < 380;
  const { containerStyle, isWide } = useContentWidth();
  const router = useRouter();
  // Soft-input is `pan` + KeyboardStickyView. Sticky only translates the
  // composer — pad the list by the keyboard height so messages don't sit under it.
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const listPadStyle = useAnimatedStyle(() => {
    // keyboardHeight is 0 when closed, and -IME_HEIGHT when open.
    const ime = Math.max(0, -keyboardHeight.value);
    return { paddingBottom: ime };
  });
  const {
    conversations,
    activeId,
    messages,
    status,
    error,
    errorCode,
    draft,
    draftImage,
    hydrated,
    isLoading,
    mode,
    setDraft,
    setDraftImage,
    setMode,
    send,
    stop,
    regenerate,
    newChat,
    reportMessage,
  } = useChatContext();
  const { showToast, showDialog } = useAppFeedback();
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const [reportTarget, setReportTarget] = useState<ChatMessage | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const draftBeforeVoiceRef = useRef('');
  const voiceListeningRef = useRef(false);
  const prevActiveIdRef = useRef<string | null>(null);

  const {
    available: voiceAvailable,
    isListening: voiceListening,
    elapsedMs: voiceElapsedMs,
    partialTranscript: voicePartial,
    start: startVoice,
    stop: stopVoice,
    cancel: cancelVoice,
  } = useSpeechInput({
    onPartial: (text) => setDraft(text),
    onFinal: (text) => setDraft(text),
    onError: (message) => {
      showToast({ tone: 'error', message });
      setDraft(draftBeforeVoiceRef.current);
    },
  });

  useEffect(() => {
    voiceListeningRef.current = voiceListening;
  }, [voiceListening]);

  const {
    data: health,
    isError: healthError,
    isLoading: healthLoading,
    isRefreshing,
    refresh,
  } = useHealth();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const isNearBottomRef = useRef(true);
  const showJumpToLatestRef = useRef(false);
  const messagesLenRef = useRef(0);
  const isLoadingRef = useRef(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  messagesLenRef.current = messages.length;
  isLoadingRef.current = isLoading;

  const updateJumpToLatest = useCallback((next: boolean) => {
    if (showJumpToLatestRef.current === next) return;
    showJumpToLatestRef.current = next;
    setShowJumpToLatest(next);
  }, []);

  const backendOffline =
    !healthLoading && (healthError || !isBackendOnline(health?.status));

  const showOfflineBanner = backendOffline;
  // Avoid stacking an offline error toast under the offline banner.
  const showErrorBanner =
    Boolean(error) && !(backendOffline && (errorCode === 'offline' || errorCode === 'timeout'));

  const errorTone =
    errorCode === 'rate_limited' || errorCode === 'timeout' ? 'warning' : 'error';
  const errorActionLabel =
    errorCode === 'rate_limited'
      ? 'Try again'
      : errorCode === 'timeout'
        ? 'Retry'
        : 'Retry';

  const activeTitle = useMemo(() => {
    const active = conversations.find((c) => c.id === activeId);
    if (!active || active.messages.length === 0) return 'New chat';
    return active.title || 'Chat';
  }, [conversations, activeId]);

  const modeLabel = useMemo(
    () => CHAT_MODES.find((m) => m.id === mode)?.label ?? 'General',
    [mode],
  );

  const scrollToEnd = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const jumpToLatest = useCallback(() => {
    isNearBottomRef.current = true;
    updateJumpToLatest(false);
    scrollToEnd(true);
  }, [scrollToEnd, updateJumpToLatest]);

  const scrollToEndIfNearBottom = useCallback(
    (animated = true) => {
      if (isNearBottomRef.current) {
        scrollToEnd(animated);
      }
    },
    [scrollToEnd],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      const nearBottom = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;
      isNearBottomRef.current = nearBottom;

      // Streaming auto-pins to bottom — don't flip jump state (avoids update loops).
      if (isLoadingRef.current) {
        updateJumpToLatest(false);
        return;
      }

      updateJumpToLatest(!nearBottom && messagesLenRef.current > 0);
    },
    [updateJumpToLatest],
  );

  useEffect(() => {
    if (messages.length === 0) {
      updateJumpToLatest(false);
      return;
    }
    scrollToEndIfNearBottom(true);
  }, [messages, status, scrollToEndIfNearBottom, updateJumpToLatest]);

  // While the assistant is generating, keep pinning to the latest tokens
  // so the stream never hides under the composer.
  useEffect(() => {
    if (!isLoading) return;
    isNearBottomRef.current = true;
    updateJumpToLatest(false);
    scrollToEnd(false);
  }, [messages, isLoading, scrollToEnd, updateJumpToLatest]);

  const handleSubmit = useCallback(() => {
    const question = draft;
    if (!question.trim()) return;
    isNearBottomRef.current = true;
    updateJumpToLatest(false);
    void send(question, draftImage);
    scrollToEnd(true);
  }, [draft, draftImage, send, scrollToEnd, updateJumpToLatest]);

  const handleInputFocus = useCallback(() => {
    isNearBottomRef.current = true;
    updateJumpToLatest(false);
    scrollToEnd(true);
  }, [scrollToEnd, updateJumpToLatest]);

  const applyPickedImage = useCallback(
    async (picker: () => Promise<Awaited<ReturnType<typeof pickChatImageFromLibrary>>>) => {
      try {
        const prepared = await picker();
        if (!prepared) return;
        setDraftImage(prepared);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Could not attach that image. Try another.';
        showToast({ tone: 'error', message });
      }
    },
    [setDraftImage, showToast],
  );

  const handleAttachPress = useCallback(() => {
    if (voiceListening) return;
    showDialog({
      title: 'Attach image',
      message: 'Choose a photo, then type your question (or send to ask what’s in the image).',
      actions: [
        {
          label: 'Photo library',
          onPress: () => {
            void applyPickedImage(pickChatImageFromLibrary);
          },
        },
        {
          label: 'Camera',
          onPress: () => {
            void applyPickedImage(captureChatImageFromCamera);
          },
        },
        { label: 'Cancel', variant: 'ghost' },
      ],
    });
  }, [applyPickedImage, showDialog, voiceListening]);

  // Home "Photo Q&A" requests attach once Chat is focused.
  useFocusEffect(
    useCallback(() => {
      if (!consumeOpenAttach()) return;
      // Defer so navigation/layout settles before the dialog.
      const id = setTimeout(() => {
        handleAttachPress();
      }, 350);
      return () => clearTimeout(id);
    }, [handleAttachPress]),
  );

  const handleMicPress = useCallback(() => {
    if (isLoading || backendOffline) return;
    if (!voiceAvailable) {
      showDialog({
        title: 'Voice input unavailable',
        message:
          Platform.OS === 'web'
            ? 'Voice dictation is not available on web. Type your message or attach a photo instead.'
            : 'Voice dictation needs a development or preview build of Ragmob — it is not available in Expo Go. You can still type or attach a photo.',
        actions: [{ label: 'Got it' }],
      });
      return;
    }
    draftBeforeVoiceRef.current = draft;
    void startVoice();
  }, [backendOffline, draft, isLoading, showDialog, startVoice, voiceAvailable]);

  const handleVoiceStop = useCallback(() => {
    stopVoice();
  }, [stopVoice]);

  const handleVoiceCancel = useCallback(() => {
    cancelVoice();
    setDraft(draftBeforeVoiceRef.current);
  }, [cancelVoice, setDraft]);

  // Drop an in-progress dictation when switching chats (not on first hydrate).
  useEffect(() => {
    if (prevActiveIdRef.current === activeId) return;
    const previous = prevActiveIdRef.current;
    prevActiveIdRef.current = activeId;
    if (previous == null) return;
    if (!voiceListeningRef.current) return;
    cancelVoice();
    setDraft(draftBeforeVoiceRef.current);
  }, [activeId, cancelVoice, setDraft]);

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
    if (actionMessage.role === 'assistant') {
      if (actionMessage.id === lastAssistantId && !isLoading) {
        actions.push({
          key: 'regenerate',
          label: 'Regenerate',
          icon: 'refresh-cw',
          onPress: () => regenerate(),
        });
      }
      actions.push({
        key: 'report',
        label: actionMessage.reported ? 'Already reported' : 'Report response',
        icon: 'flag',
        destructive: true,
        onPress: () => {
          if (actionMessage.reported) {
            showToast({ tone: 'info', message: 'You already reported this response.' });
            return;
          }
          setReportTarget(actionMessage);
        },
      });
    }
    return actions;
  }, [actionMessage, lastAssistantId, isLoading, regenerate, showToast]);

  const handleReportReason = useCallback(
    async (reason: ReportReason) => {
      if (!reportTarget || reportSubmitting) return;
      setReportSubmitting(true);
      try {
        await reportMessage(reportTarget.id, reason);
        setReportTarget(null);
        showToast({
          tone: 'success',
          message: 'Thanks — we received your report.',
        });
      } catch (err) {
        const message = isApiError(err)
          ? err.message
          : 'Could not send report. Check your connection and try again.';
        showToast({ tone: 'error', message });
      } finally {
        setReportSubmitting(false);
      }
    },
    [reportTarget, reportSubmitting, reportMessage, showToast],
  );

  const listFooter = useMemo(() => {
    if (!hydrated || messages.length > 0 || backendOffline) {
      return null;
    }
    return (
      <View style={styles.prompts}>
        <Text style={[Typography.label, styles.promptsLabel, { color: colors.textMuted }]}>
          Try asking
        </Text>
        {EXAMPLE_PROMPTS.map((prompt) => (
          <Pressable
            key={prompt}
            onPress={() => setDraft(prompt)}
            style={({ pressed }) => [
              styles.promptChip,
              {
                backgroundColor: colors.surface2,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <Text style={[Typography.caption, { color: colors.textSecondary }]} numberOfLines={2}>
              {prompt}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }, [hydrated, messages.length, backendOffline, colors, setDraft]);

  const hasMessages = messages.length > 0;
  const showPersonaStrip = !hasMessages && !isLoading;
  const modeIcon = PERSONA_ICONS[mode];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: insets.top,
          },
        ]}>
        <View style={[styles.headerRow, containerStyle]}>
          <View style={styles.headerLeft}>
            <RagmobMark size={24} />
            <View style={styles.headerMeta}>
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                {activeTitle}
              </Text>
              {hasMessages ? (
                <View style={styles.headerStatusRow}>
                  <View
                    style={[styles.modeChip, { backgroundColor: colors.surface2 }]}
                    accessibilityLabel={`Persona ${modeLabel}`}>
                    <Feather name={modeIcon} size={11} color={colors.textSecondary} />
                    <Text style={[styles.modeChipLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                      {modeLabel}
                    </Text>
                  </View>
                  {__DEV__ ? (
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: backendOffline ? colors.warning : colors.success },
                      ]}
                      accessibilityLabel={backendOffline ? 'Offline' : 'Online'}
                    />
                  ) : null}
                </View>
              ) : (
                <Text
                  style={[Typography.caption, styles.headerSubtitle, { color: colors.textMuted }]}
                  numberOfLines={1}>
                  Choose a persona, then ask
                </Text>
              )}
            </View>
          </View>
          <View style={styles.headerActions}>
            {!isCompactHeader ? (
              <IconButton
                icon="clock"
                variant="ghost"
                size={18}
                accessibilityLabel="Chat history"
                onPress={() => router.push('/(tabs)/history')}
                style={styles.headerAction}
              />
            ) : null}
            <Pressable
              onPress={() => newChat()}
              accessibilityRole="button"
              accessibilityLabel="New chat"
              style={({ pressed }) => [
                styles.newChatBtn,
                isCompactHeader && styles.newChatBtnCompact,
                {
                  backgroundColor: colors.ink,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}>
              <Feather name="edit-3" size={15} color={colors.onInk} />
              {!isCompactHeader ? (
                <Text style={[styles.newChatLabel, { color: colors.onInk }]}>New</Text>
              ) : null}
            </Pressable>
          </View>
        </View>

        {showPersonaStrip ? (
          <ModeSelector mode={mode} onChange={setMode} />
        ) : null}
      </View>

      {showOfflineBanner ? (
        <Banner
          tone="warning"
          message="Assistant offline · Check your connection"
          actionLabel={isRefreshing ? 'Checking…' : 'Retry'}
          onAction={() => {
            if (!isRefreshing) void refresh();
          }}
          style={[styles.banner, containerStyle]}
        />
      ) : null}

      {showErrorBanner ? (
        <Banner
          tone={errorTone}
          message={error!}
          actionLabel={errorActionLabel}
          onAction={() => regenerate()}
          style={[styles.banner, containerStyle]}
        />
      ) : null}

      <View style={styles.body}>
        {!hydrated ? (
          <ChatSkeleton />
        ) : (
          <Animated.View style={[styles.list, listPadStyle]}>
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={[
                styles.listContent,
                containerStyle,
                isWide && styles.listContentWide,
                // Extra room so the last bubble clears the composer when IME is closed.
                { paddingBottom: Spacing.xl },
                messages.length === 0 && styles.listEmpty,
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              onContentSizeChange={() => {
                if (isLoading) {
                  isNearBottomRef.current = true;
                  scrollToEnd(false);
                } else {
                  scrollToEndIfNearBottom(false);
                }
              }}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={() => void refresh()}
                  tintColor={colors.primary}
                />
              }
              ListEmptyComponent={
                backendOffline ? (
                  <EmptyState
                    icon="cloud-off"
                    title="You're offline"
                    subtitle="Reconnect to send messages. Local chats stay on this device."
                    action={
                      <Button
                        title={isRefreshing ? 'Checking…' : 'Try again'}
                        onPress={() => void refresh()}
                        disabled={isRefreshing}
                        size="md"
                      />
                    }
                  />
                ) : (
                  <EmptyState
                    icon="zap"
                    title="Ask anything"
                    subtitle="Choose a persona, then type, attach a photo, or use the mic."
                  />
                )
              }
              ListFooterComponent={listFooter ?? undefined}
              renderItem={({ item, index }) => (
                <MessageBubble
                  message={item}
                  isStreaming={isLoading && item.role === 'assistant' && index === messages.length - 1}
                  onLongPress={setActionMessage}
                />
              )}
            />
          </Animated.View>
        )}

        <MessageActionSheet
          visible={actionMessage !== null}
          actions={messageActions}
          onClose={() => setActionMessage(null)}
        />

        <ReportMessageSheet
          visible={reportTarget !== null}
          submitting={reportSubmitting}
          onSelect={(reason) => void handleReportReason(reason)}
          onClose={() => {
            if (!reportSubmitting) setReportTarget(null);
          }}
        />

        <KeyboardStickyView offset={{ closed: 0, opened: 0 }} style={styles.composerSticky}>
          {/* Floated above the dock — must not take layout space or it clips list text. */}
          {showJumpToLatest ? (
            <View style={styles.jumpWrap} pointerEvents="box-none">
              <Pressable
                onPress={jumpToLatest}
                accessibilityRole="button"
                accessibilityLabel="Jump to latest messages"
                hitSlop={8}
                style={({ pressed }) => [
                  styles.jumpFab,
                  {
                    backgroundColor: colors.ink,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}>
                <Feather name="chevron-down" size={14} color={colors.onInk} />
                <Text style={[styles.jumpLabel, { color: colors.onInk }]}>Latest</Text>
              </Pressable>
            </View>
          ) : null}
          <View
            style={[
              styles.composerWrap,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                // Tab bar owns the home-indicator inset; keep a tight dock gap.
                // When the keyboard opens the tab bar hides and KeyboardStickyView
                // lifts this strip above the IME.
                paddingBottom: Spacing.sm,
              },
            ]}>
            <View style={[styles.composerInner, containerStyle]}>
              <ChatInput
                value={draft}
                onChangeText={setDraft}
                onSend={handleSubmit}
                onStop={stop}
                onFocus={handleInputFocus}
                onAttachPress={handleAttachPress}
                draftImage={draftImage}
                onClearImage={() => setDraftImage(null)}
                onReplaceImage={handleAttachPress}
                onMicPress={handleMicPress}
                voiceListening={voiceListening}
                voiceElapsedMs={voiceElapsedMs}
                voicePartial={voicePartial}
                onVoiceStop={handleVoiceStop}
                onVoiceCancel={handleVoiceCancel}
                isLoading={isLoading}
                disabled={backendOffline}
                embedded
              />
            </View>
          </View>
        </KeyboardStickyView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1 },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
    width: '100%',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  headerMeta: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  headerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minWidth: 0,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 6,
    paddingRight: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    maxWidth: '100%',
    alignSelf: 'flex-start',
  },
  modeChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
    flexShrink: 0,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: Spacing.xs,
  },
  headerAction: {
    minWidth: 40,
    minHeight: 40,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
  },
  newChatBtnCompact: {
    width: 36,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  newChatLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  banner: { marginHorizontal: Spacing.md, marginTop: Spacing.sm, width: '100%' },
  list: { flex: 1 },
  listContent: { padding: Spacing.md, flexGrow: 1, width: '100%' },
  listContentWide: { alignSelf: 'center' },
  listEmpty: { flexGrow: 1, justifyContent: 'center', paddingBottom: Spacing.md },
  composerSticky: {
    zIndex: 2,
    overflow: 'visible',
  },
  jumpWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    alignItems: 'center',
    paddingBottom: Spacing.sm,
    zIndex: 3,
  },
  jumpFab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    minHeight: 34,
  },
  jumpLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  composerWrap: {
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
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
  promptsLabel: {
    width: '100%',
    marginBottom: 2,
  },
  promptChip: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 40,
    maxWidth: '100%',
    justifyContent: 'center',
  },
});
