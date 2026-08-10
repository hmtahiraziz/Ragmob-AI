import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { Alert, AppState } from 'react-native';

import {
  ensureNotificationPermission,
  getNotificationPermission,
  notificationsSupported,
  showLocalNotification,
} from '@/lib/notifications';
import {
  DEFAULT_NOTIFICATION_PREFS,
  loadNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from '@/lib/storage/notifications';

type NotificationContextValue = {
  prefs: NotificationPrefs;
  hydrated: boolean;
  permission: 'granted' | 'denied' | 'undetermined';
  nativeAvailable: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
  setChatReplies: (enabled: boolean) => void;
  setBackendAlerts: (enabled: boolean) => void;
  notifyChatReplyReady: (preview: string) => Promise<void>;
  notifyBackendOnline: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

function truncate(text: string, max = 96) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function NotificationProvider({ children }: PropsWithChildren) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [hydrated, setHydrated] = useState(false);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>(
    'undetermined',
  );
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const nativeAvailable = notificationsSupported();

  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await loadNotificationPrefs();
      if (!active) return;
      setPrefs(stored);
      setHydrated(true);
      if (nativeAvailable) {
        const status = await getNotificationPermission();
        if (!active) return;
        setPermission(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined');
      }
    })();
    return () => {
      active = false;
    };
  }, [nativeAvailable]);

  const persist = useCallback((next: NotificationPrefs) => {
    setPrefs(next);
    void saveNotificationPrefs(next);
  }, []);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      if (!nativeAvailable) return;

      if (enabled) {
        const granted = await ensureNotificationPermission();
        setPermission(granted ? 'granted' : 'denied');
        if (!granted) {
          Alert.alert(
            'Notifications blocked',
            'Enable notifications for ragmob in your device settings to receive alerts.',
          );
          persist({ ...prefsRef.current, enabled: false });
          return;
        }
      }

      persist({ ...prefsRef.current, enabled });
    },
    [nativeAvailable, persist],
  );

  const setChatReplies = useCallback(
    (enabled: boolean) => {
      persist({ ...prefsRef.current, chatReplies: enabled });
    },
    [persist],
  );

  const setBackendAlerts = useCallback(
    (enabled: boolean) => {
      persist({ ...prefsRef.current, backendAlerts: enabled });
    },
    [persist],
  );

  const notifyChatReplyReady = useCallback(async (preview: string) => {
    const current = prefsRef.current;
    if (!nativeAvailable || !current.enabled || !current.chatReplies) return;
    if (AppState.currentState === 'active') return;

    await showLocalNotification('Reply ready', truncate(preview) || 'Your assistant has responded.');
  }, [nativeAvailable]);

  const notifyBackendOnline = useCallback(async () => {
    const current = prefsRef.current;
    if (!nativeAvailable || !current.enabled || !current.backendAlerts) return;

    await showLocalNotification('Backend online', 'Your AI server is reachable again.');
  }, [nativeAvailable]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      prefs,
      hydrated,
      permission,
      nativeAvailable,
      setEnabled,
      setChatReplies,
      setBackendAlerts,
      notifyChatReplyReady,
      notifyBackendOnline,
    }),
    [
      prefs,
      hydrated,
      permission,
      nativeAvailable,
      setEnabled,
      setChatReplies,
      setBackendAlerts,
      notifyChatReplyReady,
      notifyBackendOnline,
    ],
  );

  return createElement(NotificationContext.Provider, { value }, children);
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
}
