import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type DialogAction = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Closes the dialog before running onPress (default true). */
  dismiss?: boolean;
};

export type AppDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  actions: DialogAction[];
  onClose: () => void;
};

export function AppDialog({ visible, title, message, actions, onClose }: AppDialogProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss dialog">
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
            },
          ]}>
          <Text style={[Typography.heading, { color: colors.text }]}>{title}</Text>
          {message ? (
            <Text style={[Typography.body, styles.message, { color: colors.textSecondary }]}>
              {message}
            </Text>
          ) : null}
          <View style={styles.actions}>
            {actions.map((action) => (
              <Button
                key={action.label}
                title={action.label}
                variant={action.variant ?? 'secondary'}
                fullWidth
                onPress={() => {
                  // Run the action first so confirm() can resolve true/false
                  // before onClose clears a pending confirm as cancelled.
                  action.onPress?.();
                  if (action.dismiss !== false) onClose();
                }}
              />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  message: {
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
});
