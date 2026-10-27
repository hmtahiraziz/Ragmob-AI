import type { ApiError, ApiErrorCode } from '@/lib/api/types';

/** Default timeout for JSON API calls. */
export const API_TIMEOUT_MS = 30_000;

/** Max wait for the streaming response to start (headers). */
export const STREAM_CONNECT_TIMEOUT_MS = 45_000;

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as ApiError).message === 'string'
  );
}

export function mapStatusToCode(status: number): ApiErrorCode {
  if (status === 401) return 'unauthorized';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server_error';
  return 'unknown';
}

const RATE_LIMIT_MESSAGE =
  'Too many requests right now. Wait about a minute, then try again.';

export function friendlyMessageForStatus(status: number, fallback?: string): string {
  if (status === 401) return 'Your session expired. Please sign in again.';
  if (status === 429) {
    const detail = fallback?.trim();
    // Prefer a short backend hint when it already sounds user-facing.
    if (detail && /try again|rate limit|too many|quota|shortly/i.test(detail)) {
      return detail.length > 140 ? RATE_LIMIT_MESSAGE : detail;
    }
    return RATE_LIMIT_MESSAGE;
  }
  if (status >= 500) return 'The assistant is temporarily unavailable. Please try again.';
  if (status === 0) return 'You appear to be offline. Check your connection and try again.';
  return fallback ?? `Request failed (${status})`;
}

export function createApiError(
  status: number,
  detail?: string,
  code?: ApiErrorCode,
): ApiError {
  const resolved = code ?? mapStatusToCode(status);
  return {
    status,
    code: resolved,
    message: friendlyMessageForStatus(status, detail),
  };
}

/**
 * Abort when `ms` elapses or when `outer` aborts.
 * Call `clear()` after the request connects (or in finally) to avoid leaks.
 */
export function createTimeoutSignal(
  ms: number,
  outer?: AbortSignal | null,
): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();

  const abortFromTimeout = () => {
    try {
      controller.abort();
    } catch {
      // ignore
    }
  };

  const abortFromOuter = () => {
    try {
      controller.abort();
    } catch {
      // ignore
    }
  };

  const timer = setTimeout(abortFromTimeout, ms);

  if (outer) {
    if (outer.aborted) {
      abortFromOuter();
    } else {
      outer.addEventListener('abort', abortFromOuter);
    }
  }

  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timer);
      outer?.removeEventListener('abort', abortFromOuter);
    },
  };
}

export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: string }).name;
  return name === 'AbortError' || name === 'TimeoutError';
}
