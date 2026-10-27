import { getAuthToken } from '@/lib/auth/token';
import { notifyUnauthorized } from '@/lib/auth/session';
import { API_URL } from '@/lib/env';
import {
  API_TIMEOUT_MS,
  createApiError,
  createTimeoutSignal,
  isAbortError,
  isApiError,
} from '@/lib/api/http';
import type { ApiError } from '@/lib/api/types';

export { isApiError } from '@/lib/api/http';

async function parseError(response: Response): Promise<ApiError> {
  try {
    const data = (await response.json()) as { detail?: string; message?: string; code?: string };
    const detail = data.message ?? data.detail;
    return createApiError(response.status, detail);
  } catch {
    return createApiError(response.status);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const { signal, clear } = createTimeoutSignal(API_TIMEOUT_MS, init?.signal ?? null);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const error = await parseError(response);
      if (error.status === 401) notifyUnauthorized();
      throw error;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  } catch (err) {
    if (isApiError(err)) throw err;
    if (isAbortError(err)) {
      if (init?.signal?.aborted) throw err;
      throw createApiError(0, 'The request timed out. Please try again.', 'timeout');
    }
    throw createApiError(0, 'You appear to be offline. Check your connection and try again.', 'offline');
  } finally {
    clear();
  }
}
