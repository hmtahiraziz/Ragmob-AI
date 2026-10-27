import { isClerkAPIResponseError } from '@clerk/expo';
import type { UserResource } from '@clerk/expo/types';

const META_FIRST = 'profileFirstName';
const META_LAST = 'profileLastName';

type NamePair = { firstName: string; lastName: string };

function metaString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function hasMetaOverride(meta: Record<string, unknown>) {
  return Object.prototype.hasOwnProperty.call(meta, META_FIRST)
    || Object.prototype.hasOwnProperty.call(meta, META_LAST);
}

/** True when Clerk Dashboard has first/last name updates disabled. */
export function isClerkNameUpdateDisabled(err: unknown): boolean {
  if (!isClerkAPIResponseError(err)) return false;
  const first = err.errors[0];
  const code = first?.code ?? '';
  const message = `${first?.longMessage ?? ''} ${first?.message ?? ''}`;
  return (
    code === 'form_param_unknown' ||
    /first_name is not a valid parameter/i.test(message) ||
    /last_name is not a valid parameter/i.test(message)
  );
}

/**
 * App display names. Once the user saves a profile name, unsafeMetadata wins
 * over Clerk/Google firstName so edits always reflect on Home.
 */
export function getProfileNames(user: UserResource | null | undefined): NamePair {
  if (!user) return { firstName: '', lastName: '' };

  const meta = (user.unsafeMetadata ?? {}) as Record<string, unknown>;
  const metaFirst = metaString(meta[META_FIRST]);
  const metaLast = metaString(meta[META_LAST]);

  if (hasMetaOverride(meta)) {
    return { firstName: metaFirst, lastName: metaLast };
  }

  return {
    firstName: user.firstName?.trim() ?? '',
    lastName: user.lastName?.trim() ?? '',
  };
}

export function getProfileDisplayName(user: UserResource | null | undefined): string | null {
  const { firstName, lastName } = getProfileNames(user);
  const full = `${firstName} ${lastName}`.trim();
  if (full) return full;
  return user?.fullName?.trim() || null;
}

export function getProfileFirstName(
  user: UserResource | null | undefined,
  fallback = 'there',
): string {
  const { firstName } = getProfileNames(user);
  if (firstName) return firstName;
  if (user?.username?.trim()) return user.username.trim();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (email) {
    const local = email.split('@')[0]?.trim();
    if (local) return local;
  }
  return fallback;
}

/**
 * Always write app names to unsafeMetadata (works when Clerk name fields are locked).
 * Also attempt native first/last when the Dashboard allows it.
 */
export async function updateProfileNames(
  user: UserResource,
  firstName: string,
  lastName: string,
): Promise<NamePair> {
  const first = firstName.trim();
  const last = lastName.trim();
  const prev = (user.unsafeMetadata ?? {}) as Record<string, unknown>;

  // Source of truth for the app UI (Home greeting, settings, profile).
  await user.update({
    unsafeMetadata: {
      ...prev,
      [META_FIRST]: first,
      [META_LAST]: last,
    },
  });

  try {
    await user.update({ firstName: first, lastName: last });
  } catch (err) {
    // Clerk Dashboard has first/last name disabled — metadata save is enough.
    if (!isClerkNameUpdateDisabled(err)) throw err;
  }

  await user.reload();
  return getProfileNames(user);
}
