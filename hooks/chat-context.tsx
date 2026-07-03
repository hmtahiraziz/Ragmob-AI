import { createContext, useContext, type PropsWithChildren } from 'react';

import { useChat } from '@/hooks/use-chat';

type ChatContextValue = ReturnType<typeof useChat>;

const ChatContext = createContext<ChatContextValue | null>(null);

/**
 * Shares a single useChat instance across the tab group so the Home and Chat
 * screens read/write the same conversations and active session.
 */
export function ChatProvider({ children }: PropsWithChildren) {
  const chat = useChat();
  return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return ctx;
}
