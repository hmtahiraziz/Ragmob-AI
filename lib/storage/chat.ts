import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ChatMessage, ChatMode, Conversation } from '@/types/chat';
import { DEFAULT_CHAT_MODE } from '@/types/chat';

const CONVERSATIONS_KEY = 'ragmob.chat.conversations';
const ACTIVE_KEY = 'ragmob.chat.active';
const PREFERRED_MODE_KEY = 'ragmob.chat.preferredMode';
/** Legacy single-conversation key (pre multi-conversation support). */
const LEGACY_HISTORY_KEY = 'ragmob.chat.history';

/** Cap persisted conversations and messages so storage stays bounded. */
const MAX_CONVERSATIONS = 50;
const MAX_MESSAGES_PER_CONVERSATION = 200;

export type PersistedChat = {
  conversations: Conversation[];
  activeId: string | null;
  preferredMode: ChatMode;
};

function normalizeConversation(conversation: Conversation): Conversation {
  return { ...conversation, mode: conversation.mode ?? DEFAULT_CHAT_MODE };
}

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
      mode: DEFAULT_CHAT_MODE,
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

export async function loadPreferredMode(): Promise<ChatMode> {
  try {
    const raw = await AsyncStorage.getItem(PREFERRED_MODE_KEY);
    if (raw === 'general' || raw === 'coder' || raw === 'writer' || raw === 'coach') {
      return raw;
    }
  } catch {
    // ignore
  }
  return DEFAULT_CHAT_MODE;
}

export async function savePreferredMode(mode: ChatMode): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFERRED_MODE_KEY, mode);
  } catch {
    // ignore
  }
}

export async function loadChat(): Promise<PersistedChat> {
  const preferredMode = await loadPreferredMode();
  try {
    const raw = await AsyncStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) {
      const migrated = await migrateLegacy();
      if (migrated && migrated.length > 0) {
        const conversations = migrated.map(normalizeConversation);
        const activeId = conversations[0].id;
        await saveChat({ conversations, activeId, preferredMode });
        return { conversations, activeId, preferredMode };
      }
      return { conversations: [], activeId: null, preferredMode };
    }
    const conversations = (JSON.parse(raw) as Conversation[]).map(normalizeConversation);
    const activeId = await AsyncStorage.getItem(ACTIVE_KEY);
    return {
      conversations: Array.isArray(conversations) ? conversations : [],
      activeId: activeId ?? null,
      preferredMode,
    };
  } catch {
    return { conversations: [], activeId: null, preferredMode };
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
    await AsyncStorage.multiRemove([
      CONVERSATIONS_KEY,
      ACTIVE_KEY,
      LEGACY_HISTORY_KEY,
      PREFERRED_MODE_KEY,
    ]);
  } catch {
    // ignore
  }
}
