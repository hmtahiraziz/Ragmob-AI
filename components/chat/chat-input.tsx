import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { IconButton } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChatInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onStop?: () => void;
  onFocus?: TextInputProps['onFocus'];
  isLoading?: boolean;
  disabled?: boolean;
  /** When true, omits the top divider — for inline use on Home. */
  embedded?: boolean;
};

export function ChatInput({
  value,
  onChangeText,
  onSend,
  onStop,
  onFocus,
  isLoading,
  disabled,
  embedded = false,
}: ChatInputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const canSend = value.trim().length > 0 && !disabled && !isLoading;
  const canStop = isLoading && !disabled;

  const borderColor = focused ? colors.ink : colors.borderStrong;

  const sendIcon = isLoading ? 'square' : canSend ? 'arrow-up' : 'plus';

  const handleSend = () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (isLoading) {
      onStop?.();
    } else if (canSend) {
      onSend();
    }
  };

  return (
    <View
      style={[
        styles.bar,
        embedded && styles.barEmbedded,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.surface2,
            borderColor,
          },
        ]}>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
            },
          ]}
          placeholder="Ask anything..."
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled && !isLoading}
          multiline
          blurOnSubmit={false}
          maxLength={4000}
          scrollEnabled
          textAlignVertical="center"
          {...(Platform.OS === 'android' ? { includeFontPadding: false } : null)}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={() => {
            setFocused(false);
          }}
        />
        <IconButton
          icon={sendIcon}
          variant={canSend || canStop ? 'brand' : 'surface'}
          size={20}
          disabled={!canSend && !canStop}
          accessibilityLabel={isLoading ? 'Stop generating' : 'Send message'}
          onPress={handleSend}
          style={styles.send}
        />
      </View>
    </View>
  );
}

const INPUT_MIN_HEIGHT = 44;

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  barEmbedded: {
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    paddingTop: 0,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    minHeight: INPUT_MIN_HEIGHT + 8,
    maxHeight: 140,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    minHeight: INPUT_MIN_HEIGHT,
    maxHeight: 120,
    fontSize: 16,
    lineHeight: Platform.OS === 'ios' ? 20 : 22,
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    paddingRight: Spacing.sm,
    paddingLeft: 0,
  },
  send: {
    width: 40,
    height: 40,
    flexShrink: 0,
  },
});
