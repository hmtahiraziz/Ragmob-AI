import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import {
  deleteRemoteConversation,
  fetchRemoteConversations,
  isApiError,
  renameRemoteConversation,
  streamChat,
  submitMessageFeedback,
  submitMessageReport,
} from '@/lib/api';
import type { ReportReason } from '@/lib/api/types';
import { clearChat, deriveTitle, loadChat, saveChat, savePreferredMode } from '@/lib/storage/chat';
import {
  DEFAULT_CHAT_MODE,
  type ChatMessage,
  type ChatMessageImage,
  type ChatMode,
  type ChatStatus,
  type Conversation,
  type PreparedChatImage,
} from '@/types/chat';

/** Prefer Neon when it has data; otherwise keep the local AsyncStorage cache. */
function mergeRemoteHistory(
  local: Conversation[],
  remote: Conversation[],
): Conversation[] {
  if (remote.length === 0) return local;
  const byId = new Map<string, Conversation>();
  for (const c of local) byId.set(c.id, c);
  for (const c of remote) {
    const existing = byId.get(c.id);
    if (!existing) {
      byId.set(c.id, c);
      continue;
    }
    // Prefer local image URIs when merging the same conversation.
    const localById = new Map(existing.messages.map((m) => [m.id, m]));
    byId.set(c.id, {
      ...c,
      messages: c.messages.map((m) => {
        const localMsg = localById.get(m.id);
        if (localMsg?.image?.uri) {
          return { ...m, image: localMsg.image, content: m.content || localMsg.content };
        }
        return m;
      }),
    });
  }
  return [...byId.values()].sort((a, b) => a.updatedAt - b.updatedAt);
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function newConversation(mode: ChatMode): Conversation {
  const now = Date.now();
  return {
    id: createId(),
    title: 'New chat',
    messages: [],
    mode,
    createdAt: now,
    updatedAt: now,
  };
}

type ChatState = {
  conversations: Conversation[];
  activeId: string | null;
  preferredMode: ChatMode;
  status: ChatStatus;
  error: string | null;
  errorCode: string | null;
  draft: string;
  draftImage: PreparedChatImage | null;
  hydrated: boolean;
};

type ChatAction =
  | { type: 'HYDRATE'; conversations: Conversation[]; activeId: string | null; preferredMode: ChatMode }
  | { type: 'RESET' }
  | { type: 'SET_DRAFT'; draft: string }
  | { type: 'SET_DRAFT_IMAGE'; image: PreparedChatImage | null }
  | { type: 'SET_STATUS'; status: ChatStatus }
  | { type: 'SET_ERROR'; error: string | null; code?: string | null }
  | { type: 'ADD_USER'; content: string; id: string; image?: ChatMessageImage | null }
  | { type: 'ADD_ASSISTANT'; id: string }
  | { type: 'APPEND'; id: string; delta: string }
  | { type: 'CLEAR_EMPTY_ASSISTANT'; id: string }
  | { type: 'REMOVE_LAST_ASSISTANT' }
  | { type: 'NEW_CONVERSATION' }
  | { type: 'SELECT'; id: string }
  | { type: 'SET_MODE'; mode: ChatMode }
  | { type: 'RENAME'; id: string; title: string }
  | { type: 'DELETE'; id: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'SET_FEEDBACK'; messageId: string; rating: 'up' | 'down' }
  | { type: 'SET_REPORTED'; messageId: string };

const initialState: ChatState = {
  conversations: [],
  activeId: null,
  preferredMode: DEFAULT_CHAT_MODE,
  status: 'idle',
  error: null,
  errorCode: null,
  draft: '',
  draftImage: null,
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
        const convo = newConversation(action.preferredMode);
        return {
          ...state,
          conversations: [convo],
          activeId: convo.id,
          preferredMode: action.preferredMode,
          hydrated: true,
          status: 'idle',
          error: null,
          errorCode: null,
          draft: '',
          draftImage: null,
        };
      }
      const activeId =
        action.activeId && action.conversations.some((c) => c.id === action.activeId)
          ? action.activeId
          : action.conversations[action.conversations.length - 1].id;
      return {
        ...state,
        conversations: action.conversations,
        activeId,
        preferredMode: action.preferredMode,
        hydrated: true,
        status: 'idle',
        error: null,
        errorCode: null,
        draft: '',
        draftImage: null,
      };
    }
    case 'RESET':
      return { ...initialState };
    case 'SET_DRAFT':
      return { ...state, draft: action.draft };
    case 'SET_DRAFT_IMAGE':
      return { ...state, draftImage: action.image };
    case 'SET_STATUS':
      return { ...state, status: action.status };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
        errorCode: action.error ? (action.code ?? null) : null,
      };
    case 'ADD_USER':
      return updateActive(state, (messages) => [
        ...messages,
        {
          id: action.id,
          role: 'user',
          content: action.content,
          createdAt: Date.now(),
          image: action.image ?? null,
        },
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
    case 'CLEAR_EMPTY_ASSISTANT':
      return updateActive(state, (messages) =>
        messages.filter((m) => !(m.id === action.id && m.role === 'assistant' && !m.content.trim())),
      );
    case 'REMOVE_LAST_ASSISTANT':
      return updateActive(state, (messages) => {
        const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
        if (!lastAssistant) return messages;
        return messages.filter((m) => m.id !== lastAssistant.id);
      });
    case 'NEW_CONVERSATION': {
      const active = state.conversations.find((c) => c.id === state.activeId);
      if (active && active.messages.length === 0) {
        return {
          ...state,
          status: 'idle',
          error: null,
          errorCode: null,
          draft: '',
          draftImage: null,
        };
      }
      const convo = newConversation(state.preferredMode);
      return {
        ...state,
        conversations: [...state.conversations, convo],
        activeId: convo.id,
        status: 'idle',
        error: null,
        errorCode: null,
        draft: '',
        draftImage: null,
      };
    }
    case 'SELECT':
      return {
        ...state,
        activeId: action.id,
        status: 'idle',
        error: null,
        errorCode: null,
        draft: '',
        draftImage: null,
      };
    case 'SET_MODE':
      return {
        ...state,
        preferredMode: action.mode,
        conversations: state.conversations.map((c) => {
          if (c.id !== state.activeId || c.messages.length > 0) return c;
          return { ...c, mode: action.mode, updatedAt: Date.now() };
        }),
      };
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
        const convo = newConversation(state.preferredMode);
        return {
          ...state,
          conversations: [convo],
          activeId: convo.id,
          status: 'idle',
          error: null,
          errorCode: null,
          draftImage: null,
        };
      }
      const activeId =
        state.activeId === action.id ? remaining[remaining.length - 1].id : state.activeId;
      return {
        ...state,
        conversations: remaining,
        activeId,
        status: 'idle',
        error: null,
        errorCode: null,
        draftImage: state.activeId === action.id ? null : state.draftImage,
      };
    }
    case 'CLEAR_ALL': {
      const convo = newConversation(state.preferredMode);
      return {
        ...state,
        conversations: [convo],
        activeId: convo.id,
        status: 'idle',
        error: null,
        errorCode: null,
        draft: '',
        draftImage: null,
      };
    }
    case 'SET_FEEDBACK':
      return updateActive(state, (messages) =>
        messages.map((m) =>
          m.id === action.messageId ? { ...m, feedback: action.rating } : m,
        ),
      );
    case 'SET_REPORTED':
      return updateActive(state, (messages) =>
        messages.map((m) =>
          m.id === action.messageId ? { ...m, reported: true } : m,
        ),
      );
    default:
      return state;
  }
}

/**
 * Orchestrates a streaming LLM chat turn with persistent, multi-conversation history.
 * History is scoped to `userId` so a new account never sees another user's chats.
 */
export function useChat(userId: string | null | undefined) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const abortRef = useRef<AbortController | null>(null);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  useEffect(() => {
    let active = true;
    abortRef.current?.abort();
    dispatch({ type: 'RESET' });

    if (!userId) return;

    (async () => {
      const local = await loadChat(userId);
      if (!active || userIdRef.current !== userId) return;

      let conversations = local.conversations;
      let activeId = local.activeId;

      try {
        const remote = await fetchRemoteConversations();
        if (!active || userIdRef.current !== userId) return;
        conversations = mergeRemoteHistory(local.conversations, remote);
        if (remote.length > 0) {
          activeId = conversations[conversations.length - 1]?.id ?? activeId;
        }
      } catch {
        // Offline / AUTH_DISABLED mismatch — keep local history.
      }

      if (active && userIdRef.current === userId) {
        dispatch({
          type: 'HYDRATE',
          conversations,
          activeId,
          preferredMode: local.preferredMode,
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !state.hydrated) return;
    if (state.status === 'submitted' || state.status === 'streaming') return;
    const id = setTimeout(() => {
      if (userIdRef.current !== userId) return;
      void saveChat(userId, {
        conversations: state.conversations,
        activeId: state.activeId,
        preferredMode: state.preferredMode,
      });
    }, 500);
    return () => clearTimeout(id);
  }, [userId, state.conversations, state.activeId, state.preferredMode, state.hydrated, state.status]);

  const activeConversation = useMemo(
    () => state.conversations.find((c) => c.id === state.activeId) ?? null,
    [state.conversations, state.activeId],
  );

  const messages = useMemo(
    () => activeConversation?.messages ?? [],
    [activeConversation],
  );

  const mode = activeConversation?.mode ?? state.preferredMode;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const setDraft = useCallback((draft: string) => {
    dispatch({ type: 'SET_DRAFT', draft });
  }, []);

  const setDraftImage = useCallback((image: PreparedChatImage | null) => {
    dispatch({ type: 'SET_DRAFT_IMAGE', image });
  }, []);

  const runStream = useCallback(
    async (
      question: string,
      userMessageId: string,
      conversationId: string | null,
      assistantMessageId?: string,
      image?: ChatMessageImage | null,
      imageReuse?: boolean,
    ) => {
      const assistantId = assistantMessageId ?? createId();
      dispatch({ type: 'ADD_ASSISTANT', id: assistantId });
      dispatch({ type: 'SET_STATUS', status: 'submitted' });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        let started = false;
        let assistantContent = '';
        for await (const delta of streamChat(
          {
            message: question,
            mode: modeRef.current,
            // Always send conversationId so the server can key image context.
            conversationId: conversationId ?? undefined,
            userMessageId,
            assistantMessageId: assistantId,
            image: image?.uri ? image : null,
            imageReuse: Boolean(imageReuse && image?.uri),
          },
          controller.signal,
        )) {
          if (!started) {
            started = true;
            dispatch({ type: 'SET_STATUS', status: 'streaming' });
          }
          assistantContent += delta;
          dispatch({ type: 'APPEND', id: assistantId, delta });
        }
        if (controller.signal.aborted) {
          if (!assistantContent.trim()) {
            dispatch({ type: 'CLEAR_EMPTY_ASSISTANT', id: assistantId });
          }
          dispatch({ type: 'SET_STATUS', status: 'idle' });
          return;
        }
        if (!assistantContent.trim()) {
          dispatch({ type: 'CLEAR_EMPTY_ASSISTANT', id: assistantId });
        }
        dispatch({ type: 'SET_STATUS', status: 'idle' });
      } catch (err) {
        if (controller.signal.aborted) {
          dispatch({ type: 'CLEAR_EMPTY_ASSISTANT', id: assistantId });
          dispatch({ type: 'SET_STATUS', status: 'idle' });
          return;
        }
        dispatch({ type: 'CLEAR_EMPTY_ASSISTANT', id: assistantId });
        const message = isApiError(err)
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to get a response';
        const code = isApiError(err) ? (err.code ?? null) : null;
        dispatch({ type: 'SET_ERROR', error: message, code });
        dispatch({ type: 'SET_STATUS', status: 'error' });
      } finally {
        abortRef.current = null;
      }
    },
    [],
  );

  const send = useCallback(
    async (question: string, image?: PreparedChatImage | null) => {
      const attachment = image === undefined ? state.draftImage : image;
      const trimmed = question.trim();
      // Require the user's own question (no predefined vision caption).
      if (!trimmed) return;

      const content = trimmed;
      const userMessageId = createId();
      const conversationId = state.activeId;
      const messageImage: ChatMessageImage | null = attachment
        ? {
            uri: attachment.uri,
            mime: attachment.mime,
            width: attachment.width,
            height: attachment.height,
          }
        : null;

      // Follow-up reliability: if this turn has no new attach, reuse the last
      // local image URI in this conversation so the server still sees the photo
      // even if its conversation image cache was evicted.
      const priorLocalImage =
        !messageImage
          ? [...messages].reverse().find((m) => m.role === 'user' && m.image?.uri)?.image ?? null
          : null;
      const streamImage = messageImage ?? priorLocalImage;
      const imageReuse = Boolean(!messageImage && priorLocalImage?.uri);

      dispatch({ type: 'SET_ERROR', error: null, code: null });
      dispatch({ type: 'SET_DRAFT', draft: '' });
      dispatch({ type: 'SET_DRAFT_IMAGE', image: null });
      dispatch({
        type: 'ADD_USER',
        content,
        id: userMessageId,
        // Only show a bubble thumbnail for a freshly attached image.
        image: messageImage,
      });
      await runStream(
        content,
        userMessageId,
        conversationId,
        undefined,
        streamImage,
        imageReuse,
      );
    },
    [messages, runStream, state.activeId, state.draftImage],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const regenerate = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastUser) return;
    dispatch({ type: 'SET_ERROR', error: null, code: null });
    dispatch({ type: 'REMOVE_LAST_ASSISTANT' });
    // Prefer the message's own image; otherwise reuse the latest local vision
    // attachment in this thread (same strategy as text follow-ups).
    const priorLocalImage =
      lastUser.image?.uri
        ? lastUser.image
        : [...messages].reverse().find((m) => m.role === 'user' && m.image?.uri)?.image ?? null;
    const imageReuse = Boolean(!lastUser.image?.uri && priorLocalImage?.uri);
    void runStream(
      lastUser.content,
      lastUser.id,
      state.activeId,
      lastAssistant?.id,
      priorLocalImage,
      imageReuse,
    );
  }, [messages, runStream, state.activeId]);

  const setMode = useCallback((nextMode: ChatMode) => {
    dispatch({ type: 'SET_MODE', mode: nextMode });
    const uid = userIdRef.current;
    if (uid) void savePreferredMode(uid, nextMode);
  }, []);

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
    void renameRemoteConversation(id, title).catch(() => {
      // Local rename still applies if API is unreachable.
    });
  }, []);

  const deleteConversation = useCallback((id: string) => {
    abortRef.current?.abort();
    dispatch({ type: 'DELETE', id });
    void deleteRemoteConversation(id).catch(() => {
      // Local delete still applies if API is unreachable.
    });
  }, []);

  const clearAllConversations = useCallback(() => {
    abortRef.current?.abort();
    const ids = state.conversations.map((c) => c.id);
    dispatch({ type: 'CLEAR_ALL' });
    const uid = userIdRef.current;
    if (uid) void clearChat(uid);
    for (const id of ids) {
      void deleteRemoteConversation(id).catch(() => {
        // best-effort remote wipe
      });
    }
  }, [state.conversations]);

  const setMessageFeedback = useCallback(
    (messageId: string, rating: 'up' | 'down') => {
      dispatch({ type: 'SET_FEEDBACK', messageId, rating });
      const conversationId = state.activeId;
      if (!conversationId) return;
      void submitMessageFeedback({ messageId, conversationId, rating }).catch(() => {
        // Local rating still applies if the API is unreachable.
      });
    },
    [state.activeId],
  );

  const reportMessage = useCallback(
    async (messageId: string, reason: ReportReason, note?: string) => {
      const conversationId = state.activeId;
      if (!conversationId) {
        throw new Error('No active conversation');
      }
      await submitMessageReport({ messageId, conversationId, reason, note });
      dispatch({ type: 'SET_REPORTED', messageId });
    },
    [state.activeId],
  );

  return {
    conversations: state.conversations,
    activeId: state.activeId,
    messages,
    mode,
    status: state.status,
    error: state.error,
    errorCode: state.errorCode,
    draft: state.draft,
    draftImage: state.draftImage,
    hydrated: state.hydrated,
    isLoading: state.status === 'submitted' || state.status === 'streaming',
    setDraft,
    setDraftImage,
    setMode,
    send,
    stop,
    regenerate,
    newChat,
    selectConversation,
    renameConversation,
    deleteConversation,
    clearAllConversations,
    setMessageFeedback,
    reportMessage,
  };
}
