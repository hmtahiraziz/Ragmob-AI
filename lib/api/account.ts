import { apiFetch } from '@/lib/api/client';

/**
 * Wipe server-side user data (chats, feedback, reports, preferences).
 * Clerk user deletion is handled separately on the client.
 */
export async function deleteServerAccount(): Promise<void> {
  await apiFetch('/me', { method: 'DELETE' });
}
