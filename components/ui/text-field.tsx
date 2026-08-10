import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { useKeyboardAwareScroll } from '@/components/ui/keyboard-aware-scroll-view';
import { Palette, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

const WEB_INPUT_CLASS = 'ragmob-text-field-input';

function injectWebInputStyles() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('ragmob-text-field-styles')) return;

  const style = document.createElement('style');
  style.id = 'ragmob-text-field-styles';
  style.textContent = `
    .${WEB_INPUT_CLASS} {
      outline: none !important;
      border: none !important;
      box-shadow: none !important;
      background: transparent !important;
      appearance: none;
      -webkit-appearance: none;
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      font: inherit;
    }
    .${WEB_INPUT_CLASS}:-webkit-autofill,
    .${WEB_INPUT_CLASS}:-webkit-autofill:hover,
    .${WEB_INPUT_CLASS}:-webkit-autofill:focus,
    .${WEB_INPUT_CLASS}:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 1000px ${Palette.white} inset !important;
      -webkit-text-fill-color: ${Palette.textPrimary} !important;
      transition: background-color 99999s ease-out 0s;
      caret-color: ${Palette.textPrimary};
    }
  `;
  document.head.appendChild(style);
}

const webInputStyle = Platform.OS === 'web'
  ? ({
      outlineStyle: 'none',
      outlineWidth: 0,
      borderWidth: 0,
      backgroundColor: 'transparent',
      boxShadow: 'none',
      paddingHorizontal: 0,
      margin: 0,
      minWidth: 0,
      height: '100%',
      flex: 1,
    } as const)
  : null;

const webWrapperStyle = Platform.OS === 'web' ? ({ overflow: 'hidden' } as const) : null;

type TextFieldProps = TextInputProps & {
  label?: string;
  /** Optional node rendered at the right of the label row (e.g. "Forgot password?"). */
  labelAccessory?: ReactNode;
  error?: string;
  hint?: string;
  leftIcon?: FeatherIconName;
  rightIcon?: FeatherIconName;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
};

export function TextField({
  label,
  labelAccessory,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const { colors, shadows } = useTheme();
  const keyboardAwareScroll = useKeyboardAwareScroll();
  const [focused, setFocused] = useState(false);
  const fieldRef = useRef<View>(null);

  useEffect(() => {
    injectWebInputStyles();
  }, []);

  const borderColor = error ? colors.danger : focused ? colors.ink : colors.borderStrong;
  const wrapperShadow = focused && !error ? shadows.focus : undefined;

  return (
    <View ref={fieldRef} style={[styles.container, containerStyle]}>
      {label || labelAccessory ? (
        <View style={styles.labelRow}>
          {label ? (
            <Text style={[styles.label, Typography.label, { color: colors.textSecondary }]}>{label}</Text>
          ) : (
            <View />
          )}
          {labelAccessory ?? null}
        </View>
      ) : null}
      <View
        style={[
          styles.wrapper,
          webWrapperStyle,
          {
            backgroundColor: colors.surface,
            borderColor,
            ...wrapperShadow,
          },
        ]}>
        {leftIcon ? (
          <Feather name={leftIcon} size={18} color={colors.textMuted} style={styles.leftIcon} />
        ) : null}
        <TextInput
          {...(Platform.OS === 'web' ? { className: WEB_INPUT_CLASS } : null)}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.ink}
          style={[styles.input, webInputStyle, Typography.body, { color: colors.text }, style]}
          onFocus={(e) => {
            setFocused(true);
            if (fieldRef.current) {
              keyboardAwareScroll?.onInputFocus(fieldRef.current);
            }
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {rightIcon ? (
          <Pressable onPress={onRightIconPress} hitSlop={8} style={styles.rightIcon}>
            <Feather name={rightIcon} size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.helper, Typography.caption, { color: colors.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.helper, Typography.caption, { color: colors.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.lg },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {},
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    height: 48,
  },
  input: { flex: 1, paddingVertical: 0 },
  leftIcon: { marginRight: 10 },
  rightIcon: { marginLeft: 10 },
  helper: { marginTop: Spacing.xs },
});
