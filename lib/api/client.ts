import { getAuthToken } from '@/lib/auth/token';
import { API_URL } from '@/lib/env';
import type { ApiError } from '@/lib/api/types';

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as ApiError).message === 'string'
  );
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const data = (await response.json()) as { detail?: string; message?: string };
    return {
      message: data.message ?? data.detail ?? `Request failed (${response.status})`,
      status: response.status,
    };
  } catch {
    return { message: `Request failed (${response.status})`, status: response.status };
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json() as Promise<T>;
}
