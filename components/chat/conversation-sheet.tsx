import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, EmptyState } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Conversation } from '@/types/chat';

type ConversationSheetProps = {
  visible: boolean;
  conversations: Conversation[];
  activeId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
};

function relativeTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function ConversationSheet({
  visible,
  conversations,
  activeId,
  onClose,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: ConversationSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Only surface conversations that have content, newest first.
  const items = [...conversations]
    .filter((c) => c.messages.length > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  function commitRename() {
    if (editingId) {
      const trimmed = editingTitle.trim();
      if (trimmed) onRename(editingId, trimmed);
    }
    setEditingId(null);
    setEditingTitle('');
  }

  function startRename(item: Conversation) {
    setEditingId(item.id);
    setEditingTitle(item.title);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            paddingBottom: insets.bottom + Spacing.md,
          },
        ]}>
        <View style={styles.handle}>
          <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
        </View>

        <View style={styles.header}>
          <Text style={[Typography.title, { color: colors.text }]}>Chats</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Feather name="x" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <Button
          title="New chat"
          variant="secondary"
          fullWidth
          leading={<Feather name="plus" size={16} color={colors.text} />}
          onPress={() => {
            onNew();
            onClose();
          }}
          style={styles.newButton}
        />

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={items.length === 0 ? styles.emptyContent : styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon="message-square"
              title="No conversations yet"
              subtitle="Start chatting and your history will appear here."
            />
          }
          renderItem={({ item }) => {
            const isActive = item.id === activeId;
            const isEditing = item.id === editingId;
            return (
              <Pressable
                onPress={() => {
                  if (isEditing) return;
                  onSelect(item.id);
                  onClose();
                }}
                onLongPress={() => startRename(item)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: isActive ? colors.brandGlow : colors.surface2,
                    borderColor: isActive ? colors.primary : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}>
                <View style={styles.rowMain}>
                  {isEditing ? (
                    <TextInput
                      value={editingTitle}
                      onChangeText={setEditingTitle}
                      onSubmitEditing={commitRename}
                      onBlur={commitRename}
                      autoFocus
                      returnKeyType="done"
                      style={[Typography.body, styles.editInput, { color: colors.text, borderColor: colors.primary }]}
                      placeholderTextColor={colors.textMuted}
                    />
                  ) : (
                    <Text
                      numberOfLines={1}
                      style={[Typography.body, { color: isActive ? colors.text : colors.text }]}>
                      {item.title}
                    </Text>
                  )}
                  <Text style={[Typography.caption, { color: colors.textMuted }]}>
                    {relativeTime(item.updatedAt)} · {item.messages.length} messages
                  </Text>
                </View>
                {isEditing ? (
                  <Pressable onPress={commitRename} hitSlop={8} style={styles.rowAction}>
                    <Feather name="check" size={18} color={colors.primary} />
                  </Pressable>
                ) : (
                  <Pressable onPress={() => onDelete(item.id)} hitSlop={8} style={styles.rowAction}>
                    <Feather name="trash-2" size={18} color={colors.danger} />
                  </Pressable>
                )}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '80%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
  },
  handle: { alignItems: 'center', paddingVertical: Spacing.sm },
  handleBar: { width: 40, height: 4, borderRadius: Radius.full },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  newButton: { marginBottom: Spacing.md },
  listContent: { gap: Spacing.sm, paddingBottom: Spacing.md },
  emptyContent: { flexGrow: 1, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowMain: { flex: 1, gap: 2 },
  rowAction: { padding: Spacing.xs },
  editInput: {
    borderBottomWidth: 1,
    paddingVertical: 2,
  },
});
