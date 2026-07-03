/**
 * Clerk token bridge — mirrors the AI web kit pattern.
 * The API layer calls getAuthToken(); Clerk's getToken is registered at runtime.
 */
export type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;

export function registerTokenGetter(getter: TokenGetter | null) {
  tokenGetter = getter;
}

export async function getAuthToken(): Promise<string | null> {
  if (!tokenGetter) return null;
  try {
    return await tokenGetter();
  } catch {
    return null;
  }
}
