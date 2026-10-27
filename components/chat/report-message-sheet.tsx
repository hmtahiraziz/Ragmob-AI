import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ReportReason } from '@/lib/api/types';

export const REPORT_REASONS: {
  reason: ReportReason;
  label: string;
  description: string;
  icon: React.ComponentProps<typeof Feather>['name'];
}[] = [
  {
    reason: 'harmful',
    label: 'Harmful or offensive',
    description: 'Hate, harassment, threats, or graphic content',
    icon: 'alert-triangle',
  },
  {
    reason: 'illegal',
    label: 'Illegal activity',
    description: 'Encourages or instructs illegal acts',
    icon: 'slash',
  },
  {
    reason: 'sexual_minors',
    label: 'Sexual content involving minors',
    description: 'Any sexualization of people under 18',
    icon: 'shield-off',
  },
  {
    reason: 'misinformation',
    label: 'Misinformation',
    description: 'Clearly false or dangerously misleading',
    icon: 'info',
  },
  {
    reason: 'other',
    label: 'Other',
    description: 'Something else inappropriate for Ragmob',
    icon: 'flag',
  },
];

type ReportMessageSheetProps = {
  visible: boolean;
  submitting?: boolean;
  onSelect: (reason: ReportReason) => void;
  onClose: () => void;
};

/** Reason picker for reporting an assistant reply (Play AI / safety). */
export function ReportMessageSheet({
  visible,
  submitting = false,
  onSelect,
  onClose,
}: ReportMessageSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={submitting ? undefined : onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              marginBottom: insets.bottom + Spacing.md,
            },
          ]}>
          <Text style={[Typography.heading, styles.title, { color: colors.text }]}>
            Report response
          </Text>
          <Text style={[Typography.body, styles.subtitle, { color: colors.textSecondary }]}>
            Tell us why this answer is harmful, offensive, or inappropriate. Reports are reviewed
            for safety.
          </Text>

          {REPORT_REASONS.map((item) => (
            <Pressable
              key={item.reason}
              disabled={submitting}
              onPress={() => onSelect(item.reason)}
              style={({ pressed }) => [
                styles.row,
                pressed && { backgroundColor: colors.surface2 },
                submitting && { opacity: 0.55 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.label}>
              <View style={[styles.iconWrap, { backgroundColor: colors.surface2 }]}>
                <Feather name={item.icon} size={18} color={colors.danger} />
              </View>
              <View style={styles.rowText}>
                <Text style={[Typography.body, { color: colors.text, fontWeight: '600' }]}>
                  {item.label}
                </Text>
                <Text style={[Typography.caption, { color: colors.textMuted }]}>
                  {item.description}
                </Text>
              </View>
            </Pressable>
          ))}

          <Pressable
            disabled={submitting}
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancel,
              pressed && { backgroundColor: colors.surface2 },
            ]}>
            <Text style={[Typography.body, { color: colors.textSecondary, fontWeight: '600' }]}>
              Cancel
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
  },
  sheet: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    paddingTop: Spacing.lg,
  },
  title: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
});
