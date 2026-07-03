import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type MessageAction = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  destructive?: boolean;
};

type MessageActionSheetProps = {
  visible: boolean;
  actions: MessageAction[];
  onClose: () => void;
};

export function MessageActionSheet({ visible, actions, onClose }: MessageActionSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              marginBottom: insets.bottom + Spacing.md,
            },
          ]}>
          {actions.map((action, index) => (
            <Pressable
              key={action.key}
              onPress={() => {
                action.onPress();
                onClose();
              }}
              style={({ pressed }) => [
                styles.row,
                index < actions.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                pressed && { backgroundColor: colors.surface2 },
              ]}>
              <Feather
                name={action.icon}
                size={20}
                color={action.destructive ? colors.danger : colors.textSecondary}
              />
              <Text
                style={[
                  Typography.body,
                  { color: action.destructive ? colors.danger : colors.text },
                ]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
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
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
