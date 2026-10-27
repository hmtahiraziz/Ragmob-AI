import { StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { formatRecordingDuration } from '@/lib/speech/format-duration';
import { useTheme } from '@/hooks/use-theme';

type VoiceRecordingBarProps = {
  elapsedMs: number;
  partialTranscript?: string;
  onStop: () => void;
  onCancel: () => void;
};

export function VoiceRecordingBar({
  elapsedMs,
  partialTranscript,
  onStop,
  onCancel,
}: VoiceRecordingBarProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.bar, { backgroundColor: colors.surface2 }]}
      accessibilityRole="summary"
      accessibilityLabel={`Recording ${formatRecordingDuration(elapsedMs)}`}>
      <View style={styles.left}>
        <View style={[styles.dot, { backgroundColor: colors.danger }]} />
        <Text style={[Typography.label, { color: colors.text }]}>
          {formatRecordingDuration(elapsedMs)}
        </Text>
      </View>
      <Text
        style={[styles.partial, Typography.caption, { color: colors.textSecondary }]}
        numberOfLines={1}>
        {partialTranscript?.trim() || 'Listening…'}
      </Text>
      <View style={styles.actions}>
        <IconButton
          icon="x"
          variant="ghost"
          size={18}
          accessibilityLabel="Cancel recording"
          onPress={onCancel}
          style={styles.action}
        />
        <IconButton
          icon="check"
          variant="brand"
          size={18}
          accessibilityLabel="Stop recording"
          onPress={onStop}
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.sm,
    minHeight: 52,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },
  partial: {
    flex: 1,
    minWidth: 0,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  action: {
    width: 44,
    height: 44,
  },
});
