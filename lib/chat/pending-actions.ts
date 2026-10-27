/**
 * Cross-screen intents for the chat composer (Home → Chat).
 * Kept in-memory — consumed once when Chat mounts/focuses.
 */

let pendingOpenAttach = false;

/** Home "Photo Q&A" — open chat and prompt to attach an image. */
export function requestOpenAttach() {
  pendingOpenAttach = true;
}

export function consumeOpenAttach(): boolean {
  const next = pendingOpenAttach;
  pendingOpenAttach = false;
  return next;
}
