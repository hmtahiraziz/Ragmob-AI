import { fetch } from 'expo/fetch';

import { getAuthToken } from '@/lib/auth/token';
import { API_URL } from '@/lib/env';

import type { ChatMode } from '@/types/chat';

export type ChatRequest = {
  message: string;
  mode?: ChatMode;
};

async function readStreamError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string; message?: string };
    return body.detail ?? body.message ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

/**
 * Direct LLM streaming chat — no RAG retrieval.
 * POST /chat/stream with `{ message }`, plain-text token deltas.
 */
export async function* streamChat(
  payload: ChatRequest,
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const token = await getAuthToken();

  const response = await fetch(`${API_URL}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(await readStreamError(response));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) yield chunk;
    }
    const tail = decoder.decode();
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}
