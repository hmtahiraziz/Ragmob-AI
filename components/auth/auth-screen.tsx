import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useKeyboardState } from 'react-native-keyboard-controller';

import { Screen } from '@/components/ui';
import { Gradients, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AuthScreenProps = {
  children: ReactNode;
  /** Soft panel wrapping the interactive fields (optional). */
  form?: ReactNode;
  footer?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * Shared auth layout — gradient canvas, centered column, optional field panel.
 * When the keyboard is open, content pins to the top so fields can scroll above it.
 */
export function AuthScreen({ children, form, footer, contentContainerStyle }: AuthScreenProps) {
  const { colors } = useTheme();
  const keyboardOpen = useKeyboardState((state) => state.isVisible);

  return (
    <Screen
      scroll
      keyboardAware
      fadeIn
      edges={['top']}
      gradient={Gradients.auth}
      contentContainerStyle={[
        styles.content,
        keyboardOpen ? styles.contentKeyboardOpen : styles.contentCentered,
        contentContainerStyle,
      ]}>
      {children}
      {form ? (
        <View
          style={[
            styles.panel,
            {
              backgroundColor: colors.surface,
            },
          ]}>
          {form}
        </View>
      ) : null}
      {footer}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  contentCentered: {
    justifyContent: 'center',
    paddingBottom: Spacing.xl,
  },
  contentKeyboardOpen: {
    justifyContent: 'flex-start',
    // Extra room so password / confirm fields clear the keyboard + buttons.
    paddingBottom: Spacing.xxl * 2,
  },
  panel: {
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
});
