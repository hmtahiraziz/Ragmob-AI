import { Feather } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MarkdownMessage } from '@/components/chat/markdown-message';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ChatMessage } from '@/types/chat';
import { Spinner } from '@/components/ui';

type MessageBubbleProps = {
  message: ChatMessage;
  isStreaming?: boolean;
  onLongPress?: (message: ChatMessage) => void;
};

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({ message, isStreaming, onLongPress }: MessageBubbleProps) {
  const { colors } = useTheme();
  const isUser = message.role === 'user';
  const canLongPress = !!onLongPress && !isStreaming && !!message.content;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  // Render rich Markdown for completed assistant replies; plain text while
  // streaming (partial Markdown looks broken) and for user messages.
  const renderAsMarkdown = !isUser && !isStreaming && !!message.content;

  const assistantContent = renderAsMarkdown ? (
    <MarkdownMessage content={message.content} />
  ) : message.content ? (
    <Text style={[Typography.body, { color: colors.text }]}>
      {message.content}
      {isStreaming ? <StreamingCursor color={colors.ink} /> : null}
    </Text>
  ) : isStreaming ? (
    <TypingDots />
  ) : (
    <Spinner size="small" centered={false} color={colors.textMuted} />
  );

  if (isUser) {
    return (
      <Animated.View style={[styles.row, styles.rowUser, { opacity, transform: [{ translateY }] }]}>
        <View style={[styles.meAvatar, { backgroundColor: colors.ink }]}>
          <Text style={[styles.meText, { color: colors.onInk }]}>Me</Text>
        </View>
        <Pressable
          onLongPress={canLongPress ? () => onLongPress?.(message) : undefined}
          delayLongPress={300}
          style={({ pressed }) => [styles.pressable, pressed && canLongPress && styles.pressed]}>
          <View style={[styles.userBubble, { backgroundColor: colors.userBubble }]}>
            <Text style={[Typography.body, { color: colors.onPrimary }]}>{message.content}</Text>
          </View>
        </Pressable>
        <Text style={[Typography.caption, styles.timestampRight, { color: colors.textMuted }]}>
          {formatTime(message.createdAt)}
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.row, styles.rowAssistant, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.assistantLabel}>
        <View style={[styles.cooperLogo, { backgroundColor: colors.ink }]}>
          <Feather name="zap" size={11} color={colors.onInk} />
        </View>
        <Text style={[Typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>ragmob</Text>
      </View>

      <Pressable
        onLongPress={canLongPress ? () => onLongPress?.(message) : undefined}
        delayLongPress={300}
        style={({ pressed }) => [styles.pressable, pressed && canLongPress && styles.pressed]}>
        <View style={[styles.assistantCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {assistantContent}
        </View>
      </Pressable>

      {message.citations && message.citations.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.citations}>
          {message.citations.map((c, i) => (
            <View
              key={`${c.source}-${i}`}
              style={[styles.citation, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Text style={[Typography.caption, { color: colors.textSecondary }]}>↗ {c.source}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <Text style={[Typography.caption, styles.timestampLeft, { color: colors.textMuted }]}>
        {formatTime(message.createdAt)}
      </Text>
    </Animated.View>
  );
}

function StreamingCursor({ color }: { color: string }) {
  const blink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [blink]);

  return <Animated.Text style={{ color, opacity: blink }}>|</Animated.Text>;
}

function TypingDots() {
  const { colors } = useTheme();
  const d1 = useRef(new Animated.Value(0.6)).current;
  const d2 = useRef(new Animated.Value(0.6)).current;
  const d3 = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const pulse = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.6, duration: 400, useNativeDriver: true }),
        ]),
      );
    const a1 = pulse(d1, 0);
    const a2 = pulse(d2, 150);
    const a3 = pulse(d3, 300);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [d1, d2, d3]);

  return (
    <View style={styles.dots}>
      {[d1, d2, d3].map((dot, i) => (
        <Animated.View key={i} style={[styles.dot, { backgroundColor: colors.textMuted, opacity: dot }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: Spacing.lg, maxWidth: '100%' },
  rowUser: { alignSelf: 'flex-end', alignItems: 'flex-end', maxWidth: '80%' },
  rowAssistant: { alignSelf: 'flex-start', alignItems: 'flex-start', maxWidth: '88%' },
  pressable: { maxWidth: '100%' },
  pressed: { opacity: 0.85 },
  meAvatar: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  meText: { fontSize: 10, fontWeight: '700' },
  userBubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.card,
    borderBottomRightRadius: 6,
  },
  assistantLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.xs },
  cooperLogo: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantCard: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 64,
  },
  timestampRight: { marginTop: Spacing.xs },
  timestampLeft: { marginTop: Spacing.xs },
  citations: { marginTop: Spacing.sm, maxHeight: 34 },
  citation: {
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginRight: Spacing.xs,
  },
  dots: { flexDirection: 'row', gap: 4, paddingVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: Radius.full },
});
