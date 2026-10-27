import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type TextInputProps,
} from 'react-native';

import { VoiceRecordingBar } from '@/components/chat/voice-recording-bar';
import { IconButton } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PreparedChatImage } from '@/types/chat';

type ChatInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onStop?: () => void;
  onFocus?: TextInputProps['onFocus'];
  /** Opens gallery / camera chooser (parent handles permissions + pick). */
  onAttachPress?: () => void;
  draftImage?: PreparedChatImage | null;
  onClearImage?: () => void;
  /** Re-open attach flow to replace the current image. */
  onReplaceImage?: () => void;
  /** Voice input — mic fills the draft; never auto-sends. */
  onMicPress?: () => void;
  voiceListening?: boolean;
  voiceElapsedMs?: number;
  voicePartial?: string;
  onVoiceStop?: () => void;
  onVoiceCancel?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  /** When true, omits the top divider — for inline use on Home. */
  embedded?: boolean;
};

const LINE_HEIGHT = 22;
const PAD_V = 10;
const INPUT_MIN = LINE_HEIGHT + PAD_V * 2;
const INPUT_MAX = LINE_HEIGHT * 5 + PAD_V * 2;
/** Below this width, attach lives only behind the idle "+" action. */
const NARROW_BREAKPOINT = 360;

export function ChatInput({
  value,
  onChangeText,
  onSend,
  onStop,
  onFocus,
  onAttachPress,
  draftImage,
  onClearImage,
  onReplaceImage,
  onMicPress,
  voiceListening = false,
  voiceElapsedMs = 0,
  voicePartial,
  onVoiceStop,
  onVoiceCancel,
  isLoading,
  disabled,
  embedded = false,
}: ChatInputProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isNarrow = width < NARROW_BREAKPOINT;
  const [focused, setFocused] = useState(false);
  const [inputHeight, setInputHeight] = useState(INPUT_MIN);

  const canSend =
    value.trim().length > 0 &&
    !disabled &&
    !isLoading &&
    !voiceListening;
  const canStop = Boolean(isLoading && onStop);
  /** Idle "+" opens attach when available; otherwise the trailing control stays inert. */
  const canAttach =
    Boolean(onAttachPress) &&
    !disabled &&
    !isLoading &&
    !voiceListening &&
    !canSend;
  const showSideAttach = Boolean(onAttachPress) && !isNarrow;
  const trailingIcon = isLoading ? 'square' : canSend ? 'arrow-up' : 'plus';
  const trailingActive = canSend || canStop || canAttach;
  const trailingLabel = isLoading
    ? 'Stop generating'
    : canSend
      ? 'Send message'
      : canAttach
        ? 'Attach image'
        : 'Send message';

  const handleChangeText = (text: string) => {
    if (!text.trim()) {
      setInputHeight(INPUT_MIN);
    }
    onChangeText(text);
  };

  const handleTrailingPress = () => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (isLoading) {
      onStop?.();
    } else if (canSend) {
      onSend();
    } else if (canAttach) {
      onAttachPress?.();
    }
  };

  return (
    <View
      style={[
        styles.bar,
        embedded && styles.barEmbedded,
        { backgroundColor: colors.surface },
      ]}>
      {draftImage && !voiceListening ? (
        <View style={[styles.previewStrip, { backgroundColor: colors.surface2 }]}>
          <View style={styles.previewThumbWrap}>
            <Image
              source={{ uri: draftImage.uri }}
              style={styles.previewImage}
              contentFit="cover"
              accessibilityLabel="Attached image preview"
            />
          </View>
          <View style={styles.previewMeta}>
            <Text style={[Typography.caption, { color: colors.text, fontWeight: '600' }]}>
              Image attached
            </Text>
            <Text style={[Typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
              Ask a question, then send
            </Text>
            <View style={styles.previewActions}>
              {onReplaceImage ? (
                <Pressable
                  onPress={onReplaceImage}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Replace attached image"
                  hitSlop={6}
                  style={({ pressed }) => [{ opacity: pressed || isLoading ? 0.6 : 1 }]}>
                  <Text style={[styles.previewActionLabel, { color: colors.primaryDark }]}>
                    Replace
                  </Text>
                </Pressable>
              ) : null}
              {onClearImage ? (
                <Pressable
                  onPress={onClearImage}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Remove attached image"
                  hitSlop={6}
                  style={({ pressed }) => [{ opacity: pressed || isLoading ? 0.6 : 1 }]}>
                  <Text style={[styles.previewActionLabel, { color: colors.danger }]}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <IconButton
            icon="x"
            variant="ghost"
            size={16}
            accessibilityLabel="Remove attached image"
            onPress={onClearImage}
            disabled={isLoading}
            style={styles.previewClose}
          />
        </View>
      ) : null}

      {voiceListening && onVoiceStop && onVoiceCancel ? (
        <VoiceRecordingBar
          elapsedMs={voiceElapsedMs}
          partialTranscript={voicePartial}
          onStop={onVoiceStop}
          onCancel={onVoiceCancel}
        />
      ) : null}

      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: focused ? colors.surface : colors.surface2,
            borderColor: focused ? colors.primary : colors.border,
          },
        ]}>
        {showSideAttach ? (
          <IconButton
            icon="image"
            variant="ghost"
            size={20}
            disabled={disabled || isLoading || voiceListening}
            accessibilityLabel="Attach image"
            onPress={onAttachPress}
            style={styles.sideBtn}
          />
        ) : null}
        <TextInput
          style={[
            styles.input,
            {
              height: inputHeight,
              color: colors.text,
              paddingLeft: showSideAttach ? Spacing.xs : Spacing.sm,
              ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
            },
          ]}
          placeholder={
            disabled
              ? 'Assistant offline…'
              : voiceListening
                ? 'Listening…'
                : draftImage
                  ? 'Ask about this image…'
                  : 'Ask anything...'
          }
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={handleChangeText}
          onContentSizeChange={(e) => {
            const next = Math.ceil(e.nativeEvent.contentSize.height);
            setInputHeight(Math.min(INPUT_MAX, Math.max(INPUT_MIN, next)));
          }}
          editable={!disabled && !isLoading && !voiceListening}
          multiline
          blurOnSubmit={false}
          maxLength={4000}
          scrollEnabled
          textAlignVertical="top"
          {...(Platform.OS === 'android' ? { includeFontPadding: false } : null)}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={() => {
            setFocused(false);
          }}
        />
        {onMicPress && !voiceListening ? (
          <IconButton
            icon="mic"
            variant="ghost"
            size={20}
            disabled={disabled || isLoading}
            accessibilityLabel="Voice input"
            onPress={onMicPress}
            style={styles.sideBtn}
          />
        ) : null}
        <IconButton
          icon={trailingIcon}
          variant={trailingActive ? (canAttach && !canSend && !canStop ? 'ink' : 'brand') : 'surface'}
          size={20}
          disabled={!trailingActive || voiceListening}
          accessibilityLabel={trailingLabel}
          onPress={handleTrailingPress}
          style={styles.send}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  barEmbedded: {
    backgroundColor: 'transparent',
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  previewStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    minHeight: 72,
  },
  previewThumbWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    overflow: 'hidden',
    flexShrink: 0,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  previewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: 4,
  },
  previewActionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  previewClose: {
    width: 36,
    height: 36,
    flexShrink: 0,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: Radius.full,
    borderWidth: 1.5,
    paddingLeft: 4,
    paddingRight: 6,
    paddingVertical: 4,
    maxHeight: INPUT_MAX + 10,
    overflow: 'hidden',
  },
  sideBtn: {
    width: 44,
    height: 48,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    lineHeight: LINE_HEIGHT,
    paddingTop: PAD_V,
    paddingBottom: PAD_V,
    paddingRight: Spacing.sm,
    margin: 0,
  },
  send: {
    width: 48,
    height: 48,
    flexShrink: 0,
  },
});
