import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = 'ragmob.notifications.prefs';

export type NotificationPrefs = {
  /** Master switch — requires OS permission on native. */
  enabled: boolean;
  /** Notify when an assistant reply finishes while the app is in background. */
  chatReplies: boolean;
  /** Notify when the backend comes back online. */
  backendAlerts: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: false,
  chatReplies: true,
  backendAlerts: true,
};

export async function loadNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFS;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return {
      enabled: parsed.enabled ?? DEFAULT_NOTIFICATION_PREFS.enabled,
      chatReplies: parsed.chatReplies ?? DEFAULT_NOTIFICATION_PREFS.chatReplies,
      backendAlerts: parsed.backendAlerts ?? DEFAULT_NOTIFICATION_PREFS.backendAlerts,
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // best-effort
  }
}
