import { StyleSheet, View } from 'react-native';

import { PersonaPicker } from '@/components/chat/persona-picker';
import { Spacing } from '@/constants/theme';
import { useContentWidth } from '@/hooks/use-content-width';
import type { ChatMode } from '@/types/chat';

type ModeSelectorProps = {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
};

/** Compact horizontal persona strip — only shown before the first message. */
export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  const { containerStyle } = useContentWidth();

  return (
    <View style={styles.bar}>
      <View style={[styles.barInner, containerStyle]}>
        <PersonaPicker
          variant="strip"
          selected={mode}
          onSelect={onChange}
          showHeading={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: 2,
    paddingBottom: Spacing.xs,
    overflow: 'visible',
  },
  barInner: {
    paddingLeft: Spacing.md,
    paddingRight: 0,
    width: '100%',
    overflow: 'visible',
  },
});
