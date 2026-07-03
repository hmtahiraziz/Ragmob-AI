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
  createdAt: number;
  updatedAt: number;
};
