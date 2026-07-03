import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import { isApiError, streamChat } from '@/lib/api';
import { deriveTitle, loadChat, saveChat } from '@/lib/storage/chat';
import type { ChatMessage, ChatStatus, Conversation } from '@/types/chat';

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function newConversation(): Conversation {
  const now = Date.now();
  return { id: createId(), title: 'New chat', messages: [], createdAt: now, updatedAt: now };
}

type ChatState = {
  conversations: Conversation[];
  activeId: string | null;
  status: ChatStatus;
  error: string | null;
  draft: string;
  hydrated: boolean;
};

type ChatAction =
  | { type: 'HYDRATE'; conversations: Conversation[]; activeId: string | null }
  | { type: 'SET_DRAFT'; draft: string }
  | { type: 'SET_STATUS'; status: ChatStatus }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'ADD_USER'; content: string; id: string }
  | { type: 'ADD_ASSISTANT'; id: string }
  | { type: 'APPEND'; id: string; delta: string }
  | { type: 'REMOVE_LAST_ASSISTANT' }
  | { type: 'NEW_CONVERSATION' }
  | { type: 'SELECT'; id: string }
  | { type: 'RENAME'; id: string; title: string }
  | { type: 'DELETE'; id: string };

const initialState: ChatState = {
  conversations: [],
  activeId: null,
  status: 'idle',
  error: null,
  draft: '',
  hydrated: false,
};

function updateActive(
  state: ChatState,
  updater: (messages: ChatMessage[]) => ChatMessage[],
): ChatState {
  return {
    ...state,
    conversations: state.conversations.map((c) => {
      if (c.id !== state.activeId) return c;
      const messages = updater(c.messages);
      return { ...c, messages, title: deriveTitle(messages), updatedAt: Date.now() };
    }),
  };
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'HYDRATE': {
      if (action.conversations.length === 0) {
        const convo = newConversation();
        return { ...state, conversations: [convo], activeId: convo.id, hydrated: true };
      }
      const activeId =
        action.activeId && action.conversations.some((c) => c.id === action.activeId)
          ? action.activeId
          : action.conversations[action.conversations.length - 1].id;
      return { ...state, conversations: action.conversations, activeId, hydrated: true };
    }
    case 'SET_DRAFT':
      return { ...state, draft: action.draft };
    case 'SET_STATUS':
      return { ...state, status: action.status };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'ADD_USER':
      return updateActive(state, (messages) => [
        ...messages,
        { id: action.id, role: 'user', content: action.content, createdAt: Date.now() },
      ]);
    case 'ADD_ASSISTANT':
      return updateActive(state, (messages) => [
        ...messages,
        { id: action.id, role: 'assistant', content: '', createdAt: Date.now() },
      ]);
    case 'APPEND':
      return updateActive(state, (messages) =>
        messages.map((m) => (m.id === action.id ? { ...m, content: m.content + action.delta } : m)),
      );
    case 'REMOVE_LAST_ASSISTANT':
      return updateActive(state, (messages) => {
        const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
        if (!lastAssistant) return messages;
        return messages.filter((m) => m.id !== lastAssistant.id);
      });
    case 'NEW_CONVERSATION': {
      // Reuse the active conversation if it is already empty.
      const active = state.conversations.find((c) => c.id === state.activeId);
      if (active && active.messages.length === 0) {
        return { ...state, status: 'idle', error: null, draft: '' };
      }
      const convo = newConversation();
      return {
        ...state,
        conversations: [...state.conversations, convo],
        activeId: convo.id,
        status: 'idle',
        error: null,
        draft: '',
      };
    }
    case 'SELECT':
      return { ...state, activeId: action.id, status: 'idle', error: null, draft: '' };
    case 'RENAME':
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.id ? { ...c, title: action.title } : c,
        ),
      };
    case 'DELETE': {
      const remaining = state.conversations.filter((c) => c.id !== action.id);
      if (remaining.length === 0) {
        const convo = newConversation();
        return { ...state, conversations: [convo], activeId: convo.id, status: 'idle', error: null };
      }
      const activeId =
        state.activeId === action.id ? remaining[remaining.length - 1].id : state.activeId;
      return { ...state, conversations: remaining, activeId, status: 'idle', error: null };
    }
    default:
      return state;
  }
}

/** Orchestrates a streaming LLM chat turn with persistent, multi-conversation history. */
export function useChat() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const abortRef = useRef<AbortController | null>(null);

  // Hydrate persisted conversations once on mount.
  useEffect(() => {
    let active = true;
    loadChat().then(({ conversations, activeId }) => {
      if (active) dispatch({ type: 'HYDRATE', conversations, activeId });
    });
    return () => {
      active = false;
    };
  }, []);

  // Persist (debounced) once hydrated, but never mid-stream.
  useEffect(() => {
    if (!state.hydrated) return;
    if (state.status === 'submitted' || state.status === 'streaming') return;
    const id = setTimeout(() => {
      void saveChat({ conversations: state.conversations, activeId: state.activeId });
    }, 500);
    return () => clearTimeout(id);
  }, [state.conversations, state.activeId, state.hydrated, state.status]);

  const messages = useMemo(
    () => state.conversations.find((c) => c.id === state.activeId)?.messages ?? [],
    [state.conversations, state.activeId],
  );

  const setDraft = useCallback((draft: string) => {
    dispatch({ type: 'SET_DRAFT', draft });
  }, []);

  // Streams an assistant response for an already-recorded question.
  const runStream = useCallback(async (question: string) => {
    const assistantId = createId();
    dispatch({ type: 'ADD_ASSISTANT', id: assistantId });
    dispatch({ type: 'SET_STATUS', status: 'submitted' });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let started = false;
      for await (const delta of streamChat({ message: question }, controller.signal)) {
        if (!started) {
          started = true;
          dispatch({ type: 'SET_STATUS', status: 'streaming' });
        }
        dispatch({ type: 'APPEND', id: assistantId, delta });
      }
      dispatch({ type: 'SET_STATUS', status: 'idle' });
    } catch (err) {
      if (controller.signal.aborted) {
        dispatch({ type: 'SET_STATUS', status: 'idle' });
        return;
      }
      const message = isApiError(err)
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Failed to get a response';
      dispatch({ type: 'SET_ERROR', error: message });
      dispatch({ type: 'SET_STATUS', status: 'error' });
    } finally {
      abortRef.current = null;
    }
  }, []);

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;
      dispatch({ type: 'SET_ERROR', error: null });
      dispatch({ type: 'ADD_USER', content: trimmed, id: createId() });
      await runStream(trimmed);
    },
    [runStream],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const regenerate = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    dispatch({ type: 'SET_ERROR', error: null });
    dispatch({ type: 'REMOVE_LAST_ASSISTANT' });
    void runStream(lastUser.content);
  }, [messages, runStream]);

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: 'NEW_CONVERSATION' });
  }, []);

  const selectConversation = useCallback((id: string) => {
    abortRef.current?.abort();
    dispatch({ type: 'SELECT', id });
  }, []);

  const renameConversation = useCallback((id: string, title: string) => {
    dispatch({ type: 'RENAME', id, title });
  }, []);

  const deleteConversation = useCallback((id: string) => {
    abortRef.current?.abort();
    dispatch({ type: 'DELETE', id });
  }, []);

  return {
    conversations: state.conversations,
    activeId: state.activeId,
    messages,
    status: state.status,
    error: state.error,
    draft: state.draft,
    hydrated: state.hydrated,
    isLoading: state.status === 'submitted' || state.status === 'streaming',
    setDraft,
    send,
    stop,
    regenerate,
    newChat,
    selectConversation,
    renameConversation,
    deleteConversation,
  };
}
