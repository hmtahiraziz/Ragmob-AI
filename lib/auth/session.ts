/**
 * Optional handler when the API returns 401 — typically sign the user out.
 * Registered once from the root layout inside ClerkProvider.
 */

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized() {
  try {
    unauthorizedHandler?.();
  } catch {
    // ignore handler failures
  }
}
