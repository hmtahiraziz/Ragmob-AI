/** Persona modes — must match AI web kit backend `app/prompts/modes.py`. */
export type ChatMode = 'general' | 'coder' | 'writer' | 'coach';

export const DEFAULT_CHAT_MODE: ChatMode = 'general';

export const CHAT_MODES: { id: ChatMode; label: string; description: string }[] = [
  { id: 'general', label: 'General', description: 'Friendly all-purpose assistant' },
  { id: 'coder', label: 'Coder', description: 'Programming and debugging help' },
  { id: 'writer', label: 'Writer', description: 'Drafting and editing text' },
  { id: 'coach', label: 'Coach', description: 'Goals, habits, and productivity' },
];

export type ChatRole = 'user' | 'assistant';

export type Citation = {
  source: string;
  page?: number;
  section?: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  citations?: Citation[];
};

export type ChatStatus = 'idle' | 'submitted' | 'streaming' | 'error';

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  mode: ChatMode;
  createdAt: number;
  updatedAt: number;
};
