import { isClerkAPIResponseError } from '@clerk/expo';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trim and lowercase — avoids Clerk "identifier is invalid" from stray spaces/case. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  const email = normalizeEmail(value);
  return email.length > 0 && EMAIL_RE.test(email);
}

/** Mask local part for verify screens — e.g. jo••••@gmail.com */
export function maskEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const at = normalized.indexOf('@');
  if (at <= 0) return normalized;
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  const dots = '•'.repeat(Math.max(1, Math.min(6, local.length - visible.length)));
  return `${visible}${dots}@${domain}`;
}

export function parseEmailParam(value: string | string[] | undefined): string {
  if (typeof value === 'string') return normalizeEmail(value);
  if (Array.isArray(value) && typeof value[0] === 'string') return normalizeEmail(value[0]);
  return '';
}

function clerkErrorParts(err: unknown): { message: string; code: string } | null {
  if (!isClerkAPIResponseError(err)) return null;
  const first = err.errors[0];
  return {
    message: first?.longMessage ?? first?.message ?? '',
    code: first?.code ?? '',
  };
}

/** Maps cryptic Clerk messages to user-facing copy without revealing whether an email exists. */
export function describeClerkAuthError(err: unknown, fallback: string): string {
  const parts = clerkErrorParts(err);
  if (!parts) {
    return err instanceof Error ? err.message : fallback;
  }

  const { message, code } = parts;
  const text = message || fallback;

  if (
    code === 'form_identifier_invalid' ||
    code === 'form_identifier_not_found' ||
    code === 'form_password_incorrect' ||
    /identifier is invalid/i.test(text) ||
    /couldn't find your account/i.test(text) ||
    /password is incorrect/i.test(text)
  ) {
    return 'Invalid email or password. Try again, use Forgot password, or Continue with Google.';
  }

  if (
    code === 'form_identifier_exists' ||
    /already exists/i.test(text) ||
    /is taken/i.test(text)
  ) {
    return 'Unable to create an account with this email. Try signing in or Continue with Google.';
  }

  if (
    /no sign up attempt was found/i.test(text) ||
    /no sign.?in attempt was found/i.test(text) ||
    code === 'session_expired'
  ) {
    return 'Your session expired. Go back and try again.';
  }

  return text;
}

/**
 * User-facing errors for Edit profile / password update.
 * Avoids sign-in phrasing like "Invalid email or password".
 */
export function describeClerkProfileError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const parts = clerkErrorParts(err);
  if (!parts) {
    return err instanceof Error && err.message.trim() ? err.message : fallback;
  }

  const { message, code } = parts;
  const text = message || fallback;

  if (
    code === 'form_password_incorrect' ||
    /current password/i.test(text) ||
    /password is incorrect/i.test(text) ||
    /incorrect password/i.test(text)
  ) {
    return 'Current password is incorrect.';
  }

  if (
    code === 'form_password_pwned' ||
    /data breach/i.test(text) ||
    /found in an online/i.test(text)
  ) {
    return 'That password appears in a data breach. Choose a different one.';
  }

  if (
    code === 'form_password_length_too_short' ||
    /at least \d+ characters/i.test(text) ||
    /too short/i.test(text)
  ) {
    return 'Password must be at least 8 characters.';
  }

  if (
    code === 'form_password_not_strong_enough' ||
    code === 'form_password_validation_failed' ||
    /not strong enough/i.test(text) ||
    /password.*weak/i.test(text)
  ) {
    return 'Choose a stronger password with a mix of letters, numbers, or symbols.';
  }

  if (
    code === 'form_password_size_in_bytes_exceeded' ||
    /too long/i.test(text)
  ) {
    return 'Password is too long. Try a shorter one.';
  }

  if (
    code === 'form_param_format_invalid' ||
    code === 'form_param_nil' ||
    /first.?name/i.test(text) ||
    /last.?name/i.test(text)
  ) {
    return 'Check your name fields and try again.';
  }

  if (code === 'session_exists' || code === 'session_reverification_required') {
    return 'For security, sign out and sign back in, then try again.';
  }

  if (code === 'authorization_invalid' || code === 'authentication_invalid') {
    return 'Your session expired. Sign in again and retry.';
  }

  // Never surface raw Clerk jargon on profile.
  if (/clerk|api.?error|form_/i.test(text)) {
    return fallback;
  }

  return text;
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
