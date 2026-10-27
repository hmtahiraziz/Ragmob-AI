import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';

import {
  createApiError,
  createTimeoutSignal,
  friendlyMessageForStatus,
  isAbortError,
  isApiError,
  STREAM_CONNECT_TIMEOUT_MS,
} from '@/lib/api/http';
import { apiFetch } from '@/lib/api/client';
import { notifyUnauthorized } from '@/lib/auth/session';
import { getAuthToken } from '@/lib/auth/token';
import { API_URL } from '@/lib/env';

import type { ChatMessageImage, ChatMode } from '@/types/chat';

export type ChatRequest = {
  message: string;
  mode?: ChatMode;
  /** When set, backend writes the completed turn to Neon. */
  conversationId?: string;
  userMessageId?: string;
  assistantMessageId?: string;
  /**
   * Local image for this turn. Client uploads via ``POST /chat/images`` first,
   * then streams with the returned ``imageId`` (not inline base64 on /stream).
   */
  image?: ChatMessageImage | null;
  /**
   * True when re-uploading a prior local image so the server refreshes conversation
   * image context without treating this as a brand-new upload in Neon.
   */
  imageReuse?: boolean;
};

export type UploadedChatImage = {
  imageId: string;
  mimeType: string;
  width: number;
  height: number;
  expiresInSeconds: number;
};

async function readStreamError(response: Response) {
  try {
    const body = (await response.json()) as {
      detail?: string | { msg?: string }[];
      message?: string;
      errors?: { msg?: string }[];
    };
    let detail: string | undefined;
    if (typeof body.detail === 'string') {
      detail = body.detail;
    } else if (Array.isArray(body.detail)) {
      detail = body.detail
        .map((d) => (typeof d === 'string' ? d : d?.msg))
        .filter(Boolean)
        .join(' ');
    } else if (Array.isArray(body.errors)) {
      detail = body.errors.map((e) => e?.msg).filter(Boolean).join(' ');
    } else {
      detail = body.message;
    }
    if (response.status === 413) {
      return createApiError(
        response.status,
        detail ?? 'Image is too large. Try a smaller photo.',
        'unknown',
      );
    }
    if (response.status === 415 || response.status === 422) {
      return createApiError(
        response.status,
        detail ?? 'That image is not supported. Use JPEG, PNG, or WebP.',
        'unknown',
      );
    }
    return createApiError(response.status, detail);
  } catch {
    if (response.status === 413) {
      return createApiError(413, 'Image is too large. Try a smaller photo.', 'unknown');
    }
    return createApiError(response.status);
  }
}

/** Read local image as standard base64 (no data: URL prefix). */
async function readImageBase64(uri: string): Promise<string> {
  const file = new File(uri);
  try {
    const encoded = await file.base64();
    if (encoded?.trim()) return encoded.trim();
  } catch {
    // fall through
  }

  let bytes: Uint8Array;
  try {
    bytes = await file.bytes();
  } catch {
    throw createApiError(
      0,
      'Could not read the attached photo. Try attaching it again.',
      'unknown',
    );
  }
  if (!bytes.byteLength) {
    throw createApiError(0, 'Attached photo is empty. Try another image.', 'unknown');
  }

  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  if (typeof btoa !== 'function') {
    throw createApiError(0, 'Could not encode that photo for upload.', 'unknown');
  }
  return btoa(binary);
}

/**
 * Separate vision upload — ``POST /chat/images``.
 * Returns ``imageId`` for a subsequent ``POST /chat/stream``.
 */
export async function uploadChatImage(options: {
  uri: string;
  mime?: string;
  conversationId?: string;
  signal?: AbortSignal;
}): Promise<UploadedChatImage> {
  const imageBase64 = await readImageBase64(options.uri);
  const result = await apiFetch<UploadedChatImage>('/chat/images', {
    method: 'POST',
    signal: options.signal,
    body: JSON.stringify({
      imageBase64,
      imageMime: options.mime || 'image/jpeg',
      ...(options.conversationId ? { conversationId: options.conversationId } : {}),
    }),
  });
  if (!result?.imageId) {
    throw createApiError(0, 'Image upload did not return an imageId.', 'unknown');
  }
  return result;
}

/**
 * Direct LLM streaming chat.
 * - Text: JSON ``POST /chat/stream`` (backward compatible).
 * - Image: upload via ``uploadChatImage``, then stream with ``imageId``.
 */
export async function* streamChat(
  payload: ChatRequest,
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const token = await getAuthToken();
  const { signal: connectSignal, clear } = createTimeoutSignal(
    STREAM_CONNECT_TIMEOUT_MS,
    signal ?? null,
  );

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let imageId: string | undefined;
  try {
    if (payload.image?.uri) {
      const uploaded = await uploadChatImage({
        uri: payload.image.uri,
        mime: payload.image.mime,
        conversationId: payload.conversationId,
        signal,
      });
      imageId = uploaded.imageId;
    }
  } catch (err) {
    clear();
    if (isApiError(err)) throw err;
    throw createApiError(
      0,
      'Could not upload that photo. Try attaching it again.',
      'unknown',
    );
  }

  const body = JSON.stringify({
    message: payload.message,
    mode: payload.mode,
    conversationId: payload.conversationId,
    userMessageId: payload.userMessageId,
    assistantMessageId: payload.assistantMessageId,
    ...(imageId
      ? {
          imageId,
          ...(payload.imageReuse ? { imageReuse: true } : {}),
        }
      : {}),
  });

  let response: Response;
  try {
    response = await fetch(`${API_URL}/chat/stream`, {
      method: 'POST',
      headers,
      body,
      signal: connectSignal,
    });
  } catch (err) {
    clear();
    if (signal?.aborted || isAbortError(err)) {
      if (signal?.aborted) throw err;
      throw createApiError(0, 'The request timed out. Please try again.', 'timeout');
    }
    throw createApiError(0, 'You appear to be offline. Check your connection and try again.', 'offline');
  } finally {
    clear();
  }

  if (!response.ok || !response.body) {
    const error = await readStreamError(response);
    if (error.status === 401) notifyUnauthorized();
    if (!error.message || error.message.startsWith('Request failed')) {
      throw {
        ...error,
        message: friendlyMessageForStatus(error.status ?? response.status, error.message),
      };
    }
    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        break;
      }
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
