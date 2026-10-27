/** Persona modes — must match backend prompt modes. */
export type ChatMode = 'general' | 'coder' | 'writer' | 'coach';

export const DEFAULT_CHAT_MODE: ChatMode = 'general';

export const CHAT_MODES: { id: ChatMode; label: string; description: string }[] = [
  { id: 'general', label: 'General', description: 'Friendly all-purpose assistant' },
  { id: 'coder', label: 'Coder', description: 'Programming and debugging help' },
  { id: 'writer', label: 'Writer', description: 'Drafting and editing text' },
  { id: 'coach', label: 'Coach', description: 'Goals, habits, and productivity' },
];

export type ChatRole = 'user' | 'assistant';

export type MessageFeedbackRating = 'up' | 'down';

/** Local image attached to a user message (file URI; not a remote CDN URL). */
export type ChatMessageImage = {
  uri: string;
  mime: string;
  width?: number;
  height?: number;
};

/**
 * Prepared attachment sitting in the composer before send.
 * Same shape as {@link ChatMessageImage} plus size for client validation.
 */
export type PreparedChatImage = ChatMessageImage & {
  byteLength: number;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  /** Optional vision attachment on user messages. */
  image?: ChatMessageImage | null;
  /** Local cache of thumbs feedback for this assistant message. */
  feedback?: MessageFeedbackRating;
  /** True after the user submitted an abuse report for this reply. */
  reported?: boolean;
};

/** Strip the server-side `[Image]` history marker for display. */
export function stripImageMarker(content: string): string {
  return content.replace(/^\[Image\]\s*/i, '').trim();
}

export type ChatStatus = 'idle' | 'submitted' | 'streaming' | 'error';

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  mode: ChatMode;
  createdAt: number;
  updatedAt: number;
};
