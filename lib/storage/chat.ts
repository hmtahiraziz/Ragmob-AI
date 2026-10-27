import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ChatMessage, ChatMode, Conversation } from '@/types/chat';
import { DEFAULT_CHAT_MODE } from '@/types/chat';

/** Legacy device-wide keys (pre user-scoped storage). */
const LEGACY_CONVERSATIONS_KEY = 'ragmob.chat.conversations';
const LEGACY_ACTIVE_KEY = 'ragmob.chat.active';
const LEGACY_PREFERRED_MODE_KEY = 'ragmob.chat.preferredMode';
const LEGACY_HISTORY_KEY = 'ragmob.chat.history';

/** Cap persisted conversations and messages so storage stays bounded. */
const MAX_CONVERSATIONS = 50;
const MAX_MESSAGES_PER_CONVERSATION = 200;

export type PersistedChat = {
  conversations: Conversation[];
  activeId: string | null;
  preferredMode: ChatMode;
};

function conversationsKey(userId: string) {
  return `ragmob.chat.${userId}.conversations`;
}
function activeKey(userId: string) {
  return `ragmob.chat.${userId}.active`;
}
function preferredModeKey(userId: string) {
  return `ragmob.chat.${userId}.preferredMode`;
}

function normalizeConversation(conversation: Conversation): Conversation {
  return { ...conversation, mode: conversation.mode ?? DEFAULT_CHAT_MODE };
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return 'New chat';
  const text = firstUser.content.trim();
  if (text) {
    return text.length > 40 ? `${text.slice(0, 40)}…` : text;
  }
  if (firstUser.image?.uri) return 'Image chat';
  return 'New chat';
}

/** Drop old shared keys so a new account never inherits another user's chats. */
async function purgeLegacyUnscopedKeys(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      LEGACY_CONVERSATIONS_KEY,
      LEGACY_ACTIVE_KEY,
      LEGACY_PREFERRED_MODE_KEY,
      LEGACY_HISTORY_KEY,
    ]);
  } catch {
    // ignore
  }
}

/**
 * One-time: if this user has no scoped data yet but legacy shared data exists,
 * move it to this user only when nothing else is scoped yet (single-user upgrade).
 * Otherwise delete legacy so new accounts stay empty.
 */
async function migrateLegacyIfNeeded(userId: string): Promise<void> {
  try {
    const scoped = await AsyncStorage.getItem(conversationsKey(userId));
    if (scoped) {
      await purgeLegacyUnscopedKeys();
      return;
    }

    const legacyConversations = await AsyncStorage.getItem(LEGACY_CONVERSATIONS_KEY);
    const legacyHistory = await AsyncStorage.getItem(LEGACY_HISTORY_KEY);

    if (!legacyConversations && !legacyHistory) return;

    // Only adopt legacy data when upgrading in place (no other user buckets).
    const allKeys = await AsyncStorage.getAllKeys();
    const otherUserBuckets = allKeys.filter(
      (k) =>
        k.startsWith('ragmob.chat.') &&
        k.endsWith('.conversations') &&
        k !== conversationsKey(userId) &&
        k !== LEGACY_CONVERSATIONS_KEY,
    );

    if (otherUserBuckets.length > 0) {
      await purgeLegacyUnscopedKeys();
      return;
    }

    if (legacyConversations) {
      await AsyncStorage.setItem(conversationsKey(userId), legacyConversations);
      const active = await AsyncStorage.getItem(LEGACY_ACTIVE_KEY);
      if (active) await AsyncStorage.setItem(activeKey(userId), active);
      const mode = await AsyncStorage.getItem(LEGACY_PREFERRED_MODE_KEY);
      if (mode) await AsyncStorage.setItem(preferredModeKey(userId), mode);
    } else if (legacyHistory) {
      const messages = JSON.parse(legacyHistory) as ChatMessage[];
      if (Array.isArray(messages) && messages.length > 0) {
        const now = Date.now();
        const conversation: Conversation = {
          id: createId(),
          title: deriveTitle(messages),
          messages,
          mode: DEFAULT_CHAT_MODE,
          createdAt: messages[0]?.createdAt ?? now,
          updatedAt: now,
        };
        await AsyncStorage.setItem(
          conversationsKey(userId),
          JSON.stringify([conversation]),
        );
        await AsyncStorage.setItem(activeKey(userId), conversation.id);
      }
    }

    await purgeLegacyUnscopedKeys();
  } catch {
    // ignore migration failures
  }
}

export async function loadPreferredMode(userId: string): Promise<ChatMode> {
  try {
    const raw = await AsyncStorage.getItem(preferredModeKey(userId));
    if (raw === 'general' || raw === 'coder' || raw === 'writer' || raw === 'coach') {
      return raw;
    }
  } catch {
    // ignore
  }
  return DEFAULT_CHAT_MODE;
}

export async function savePreferredMode(userId: string, mode: ChatMode): Promise<void> {
  try {
    await AsyncStorage.setItem(preferredModeKey(userId), mode);
  } catch {
    // ignore
  }
}

export async function loadChat(userId: string): Promise<PersistedChat> {
  await migrateLegacyIfNeeded(userId);
  const preferredMode = await loadPreferredMode(userId);
  try {
    const raw = await AsyncStorage.getItem(conversationsKey(userId));
    if (!raw) {
      return { conversations: [], activeId: null, preferredMode };
    }
    const conversations = (JSON.parse(raw) as Conversation[]).map(normalizeConversation);
    const activeId = await AsyncStorage.getItem(activeKey(userId));
    return {
      conversations: Array.isArray(conversations) ? conversations : [],
      activeId: activeId ?? null,
      preferredMode,
    };
  } catch {
    return { conversations: [], activeId: null, preferredMode };
  }
}

export async function saveChat(userId: string, chat: PersistedChat): Promise<void> {
  try {
    const trimmed = chat.conversations
      .slice(-MAX_CONVERSATIONS)
      .map((c) => ({ ...c, messages: c.messages.slice(-MAX_MESSAGES_PER_CONVERSATION) }));
    await AsyncStorage.setItem(conversationsKey(userId), JSON.stringify(trimmed));
    if (chat.activeId) {
      await AsyncStorage.setItem(activeKey(userId), chat.activeId);
    } else {
      await AsyncStorage.removeItem(activeKey(userId));
    }
  } catch {
    // best-effort; ignore write failures
  }
}

export async function clearChat(userId: string): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      conversationsKey(userId),
      activeKey(userId),
      preferredModeKey(userId),
    ]);
  } catch {
    // ignore
  }
}
