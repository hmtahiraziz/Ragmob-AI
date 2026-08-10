import { StyleSheet, View } from 'react-native';

import { PersonaPicker } from '@/components/chat/persona-picker';
import { Spacing } from '@/constants/theme';
import { useContentWidth } from '@/hooks/use-content-width';
import { useTheme } from '@/hooks/use-theme';
import type { ChatMode } from '@/types/chat';

type ModeSelectorProps = {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
  disabled?: boolean;
};

/** Compact horizontal persona strip for the chat screen. */
export function ModeSelector({ mode, onChange, disabled = false }: ModeSelectorProps) {
  const { colors } = useTheme();
  const { containerStyle } = useContentWidth();

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: colors.surface, borderBottomColor: colors.border },
      ]}>
      <View style={[styles.barInner, containerStyle]}>
        <PersonaPicker
          variant="strip"
          selected={mode}
          onSelect={onChange}
          disabled={disabled}
          showHeading={!disabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  barInner: {
    paddingLeft: Spacing.md,
    width: '100%',
  },
});
