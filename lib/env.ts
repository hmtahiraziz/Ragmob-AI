/**
 * Public environment variables (inlined at build time).
 * Never put secrets here — only URLs and Clerk publishable key.
 */
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api'
).replace(/\/$/, '');

export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
