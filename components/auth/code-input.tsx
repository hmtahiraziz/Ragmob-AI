import { useEffect, useRef } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useKeyboardAwareScroll } from '@/components/ui/keyboard-aware-scroll-view';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const CODE_LENGTH = 6;

type CodeInputProps = {
  value: string;
  onChange: (code: string) => void;
  /** Fires once when all digits are filled. */
  onComplete?: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

type FocusableInput = { focus: () => void };

/** Six-box OTP input — full-size overlay TextInput so the soft keyboard opens reliably. */
export function CodeInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
}: CodeInputProps) {
  const { colors } = useTheme();
  const keyboardAwareScroll = useKeyboardAwareScroll();
  // RN 0.88 View/TextInput ref typings conflict with component types — keep host handles.
  const wrapRef = useRef<Parameters<
    NonNullable<ReturnType<typeof useKeyboardAwareScroll>>['onInputFocus']
  >[0] | null>(null);
  const inputRef = useRef<FocusableInput | null>(null);
  const lastCompleted = useRef('');
  const digits = value.replace(/\D/g, '').slice(0, CODE_LENGTH).split('');

  const bindInput = (node: FocusableInput | null) => {
    inputRef.current = node;
  };

  useEffect(() => {
    if (!autoFocus || disabled) return;
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, Platform.OS === 'android' ? 400 : 250);
    return () => clearTimeout(t);
  }, [autoFocus, disabled]);

  const setDigits = (raw: string) => {
    const next = raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
    onChange(next);
    if (next.length === CODE_LENGTH && next !== lastCompleted.current) {
      lastCompleted.current = next;
      onComplete?.(next);
    }
    if (next.length < CODE_LENGTH) {
      lastCompleted.current = '';
    }
  };

  const focusInput = () => {
    if (disabled) return;
    inputRef.current?.focus();
    if (wrapRef.current) {
      keyboardAwareScroll?.onInputFocus(wrapRef.current);
    }
  };

  return (
    <View
      ref={(node) => {
        wrapRef.current = node as typeof wrapRef.current;
      }}
      style={styles.wrap}
      accessibilityLabel="Verification code">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enter verification code"
        disabled={disabled}
        onPress={focusInput}
        style={styles.row}>
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const filled = Boolean(digits[i]);
          const active = !disabled && digits.length === i;
          return (
            <View
              key={i}
              pointerEvents="none"
              style={[
                styles.cell,
                {
                  backgroundColor: active
                    ? colors.lavenderSoft
                    : filled
                      ? colors.surface3
                      : colors.surface2,
                },
              ]}>
              <Text style={[Typography.heading, styles.digit, { color: colors.text }]}>
                {digits[i] ?? ''}
              </Text>
            </View>
          );
        })}
      </Pressable>

      {/* Full-size overlay — Android ignores focus on 1×1 opacity-0 inputs. */}
      <TextInput
        ref={bindInput as never}
        value={digits.join('')}
        onChangeText={setDigits}
        onFocus={() => {
          if (wrapRef.current) {
            keyboardAwareScroll?.onInputFocus(wrapRef.current);
          }
        }}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH}
        editable={!disabled}
        caretHidden
        showSoftInputOnFocus
        autoFocus={autoFocus}
        importantForAutofill="yes"
        style={[styles.overlayInput, { color: 'transparent' }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginBottom: Spacing.lg,
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  cell: {
    flex: 1,
    aspectRatio: 0.85,
    maxHeight: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0,
  },
  overlayInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0.02,
    fontSize: 16,
    zIndex: 2,
  },
});
