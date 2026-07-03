import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import {
  Animated,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { IconButton } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChatInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onStop?: () => void;
  onFocus?: TextInputProps['onFocus'];
  isLoading?: boolean;
  disabled?: boolean;
};

export function ChatInput({
  value,
  onChangeText,
  onSend,
  onStop,
  onFocus,
  isLoading,
  disabled,
}: ChatInputProps) {
  const { colors } = useTheme();
  const borderAnim = useRef(new Animated.Value(0)).current;

  const canSend = value.trim().length > 0 && !disabled && !isLoading;
  const canStop = isLoading && !disabled;

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.ink],
  });

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
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}>
      <View style={styles.row}>
        <Animated.View
          style={[
            styles.inputWrap,
            {
              backgroundColor: colors.surface,
              borderColor,
            },
          ]}>
          <TextInput
            style={[styles.input, Typography.body, { color: colors.text }]}
            placeholder="Ask anything…"
            placeholderTextColor={colors.textMuted}
            value={value}
            onChangeText={onChangeText}
            editable={!disabled && !isLoading}
            multiline
            blurOnSubmit={false}
            maxLength={4000}
            textAlignVertical="center"
            onFocus={(e) => {
              Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
              onFocus?.(e);
            }}
            onBlur={() => {
              Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
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
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: Spacing.md,
    paddingRight: 6,
    paddingVertical: 6,
    maxHeight: 132,
  },
  input: {
    flex: 1,
    minHeight: 32,
    maxHeight: 96,
    paddingVertical: 6,
  },
  send: { width: 40, height: 40, marginLeft: Spacing.sm },
});
