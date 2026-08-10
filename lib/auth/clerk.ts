import { isClerkAPIResponseError } from '@clerk/clerk-expo';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trim and lowercase — avoids Clerk "identifier is invalid" from stray spaces/case. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  const email = normalizeEmail(value);
  return email.length > 0 && EMAIL_RE.test(email);
}

export function parseEmailParam(value: string | string[] | undefined): string {
  if (typeof value === 'string') return normalizeEmail(value);
  if (Array.isArray(value) && typeof value[0] === 'string') return normalizeEmail(value[0]);
  return '';
}

const IDENTIFIER_HELP =
  'Use Continue with Google if you signed up that way, or create an account with email and password.';

/** Maps cryptic Clerk messages (e.g. "Identifier is invalid.") to actionable copy. */
export function describeClerkAuthError(err: unknown, fallback: string): string {
  if (!isClerkAPIResponseError(err)) {
    return err instanceof Error ? err.message : fallback;
  }

  const first = err.errors[0];
  const message = first?.longMessage ?? first?.message ?? fallback;
  const code = first?.code ?? '';

  if (
    code === 'form_identifier_invalid' ||
    code === 'form_identifier_not_found' ||
    /identifier is invalid/i.test(message) ||
    /couldn't find your account/i.test(message)
  ) {
    return `No password account found for this email. ${IDENTIFIER_HELP}`;
  }

  if (code === 'form_password_incorrect' || /password is incorrect/i.test(message)) {
    return 'Incorrect password. Try again or use Forgot password.';
  }

  if (
    code === 'form_identifier_exists' ||
    /already exists/i.test(message) ||
    /is taken/i.test(message)
  ) {
    return 'An account with this email already exists. Sign in instead, or use Continue with Google.';
  }

  if (
    /no sign up attempt was found/i.test(message) ||
    /no sign.?in attempt was found/i.test(message) ||
    code === 'session_expired'
  ) {
    return 'Your session expired. Go back and try again.';
  }

  return message;
}

export function isMissingAuthAttempt(err: unknown): boolean {
  if (!isClerkAPIResponseError(err)) return false;
  const message = err.errors[0]?.message ?? '';
  const code = err.errors[0]?.code ?? '';
  return (
    /no sign up attempt was found/i.test(message) ||
    /no sign.?in attempt was found/i.test(message) ||
    code === 'session_expired'
  );
}
