import { apiFetch } from '@/lib/api/client';
import type { ChatMode, Conversation } from '@/types/chat';
import { stripImageMarker } from '@/types/chat';

type RemoteConversation = {
  id: string;
  title: string;
  mode: string;
  createdAt: number;
  updatedAt: number;
  messages: {
    id: string;
    role: string;
    content: string;
    createdAt: number;
  }[];
};

function toConversation(remote: RemoteConversation): Conversation {
  const mode = (['general', 'coder', 'writer', 'coach'].includes(remote.mode)
    ? remote.mode
    : 'general') as ChatMode;

  return {
    id: remote.id,
    title: stripImageMarker(remote.title || '') || remote.title || 'New chat',
    mode,
    createdAt: remote.createdAt,
    updatedAt: remote.updatedAt,
    messages: remote.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        // Server may prefix vision turns with `[Image]`; keep text only (no remote URI).
        content: stripImageMarker(m.content) || m.content,
        createdAt: m.createdAt,
      })),
  };
}

/** Pull all conversations for the signed-in Clerk user from Neon via the API. */
export async function fetchRemoteConversations(): Promise<Conversation[]> {
  const rows = await apiFetch<RemoteConversation[]>('/chat/conversations');
  return (Array.isArray(rows) ? rows : []).map(toConversation);
}

export async function renameRemoteConversation(id: string, title: string): Promise<void> {
  await apiFetch(`/chat/conversations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export async function deleteRemoteConversation(id: string): Promise<void> {
  await apiFetch(`/chat/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
