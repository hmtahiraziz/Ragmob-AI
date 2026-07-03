import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ChatMessage, Conversation } from '@/types/chat';

const CONVERSATIONS_KEY = 'ragmob.chat.conversations';
const ACTIVE_KEY = 'ragmob.chat.active';
/** Legacy single-conversation key (pre multi-conversation support). */
const LEGACY_HISTORY_KEY = 'ragmob.chat.history';

/** Cap persisted conversations and messages so storage stays bounded. */
const MAX_CONVERSATIONS = 50;
const MAX_MESSAGES_PER_CONVERSATION = 200;

export type PersistedChat = {
  conversations: Conversation[];
  activeId: string | null;
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function migrateLegacy(): Promise<Conversation[] | null> {
  try {
    const raw = await AsyncStorage.getItem(LEGACY_HISTORY_KEY);
    if (!raw) return null;
    const messages = JSON.parse(raw) as ChatMessage[];
    await AsyncStorage.removeItem(LEGACY_HISTORY_KEY);
    if (!Array.isArray(messages) || messages.length === 0) return [];
    const now = Date.now();
    const conversation: Conversation = {
      id: createId(),
      title: deriveTitle(messages),
      messages,
      createdAt: messages[0]?.createdAt ?? now,
      updatedAt: now,
    };
    return [conversation];
  } catch {
    return null;
  }
}

export function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  const text = firstUser?.content.trim();
  if (!text) return 'New chat';
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

export async function loadChat(): Promise<PersistedChat> {
  try {
    const raw = await AsyncStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) {
      const migrated = await migrateLegacy();
      if (migrated && migrated.length > 0) {
        const activeId = migrated[0].id;
        await saveChat({ conversations: migrated, activeId });
        return { conversations: migrated, activeId };
      }
      return { conversations: [], activeId: null };
    }
    const conversations = JSON.parse(raw) as Conversation[];
    const activeId = await AsyncStorage.getItem(ACTIVE_KEY);
    return {
      conversations: Array.isArray(conversations) ? conversations : [],
      activeId: activeId ?? null,
    };
  } catch {
    return { conversations: [], activeId: null };
  }
}

export async function saveChat(chat: PersistedChat): Promise<void> {
  try {
    const trimmed = chat.conversations
      .slice(-MAX_CONVERSATIONS)
      .map((c) => ({ ...c, messages: c.messages.slice(-MAX_MESSAGES_PER_CONVERSATION) }));
    await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(trimmed));
    if (chat.activeId) {
      await AsyncStorage.setItem(ACTIVE_KEY, chat.activeId);
    } else {
      await AsyncStorage.removeItem(ACTIVE_KEY);
    }
  } catch {
    // best-effort; ignore write failures
  }
}

export async function clearChat(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([CONVERSATIONS_KEY, ACTIVE_KEY, LEGACY_HISTORY_KEY]);
  } catch {
    // ignore
  }
}
