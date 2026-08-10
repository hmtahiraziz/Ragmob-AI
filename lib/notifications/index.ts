import type { PermissionStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import { notificationsSupported } from '@/lib/notifications/support';

const ANDROID_CHANNEL_ID = 'ragmob-default';

let configured = false;

async function loadNotifications() {
  if (!notificationsSupported()) return null;
  return import('expo-notifications');
}

/** Foreground presentation + Android channel (call once at startup). */
export async function configureNotifications() {
  if (configured || !notificationsSupported()) return;
  configured = true;

  const Notifications = await loadNotifications();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'ragmob',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180],
      lightColor: '#B7AEF0',
    });
  }
}

export async function getNotificationPermission(): Promise<PermissionStatus> {
  if (!notificationsSupported()) return 'denied' as PermissionStatus;

  const Notifications = await loadNotifications();
  if (!Notifications) return 'denied' as PermissionStatus;

  const settings = await Notifications.getPermissionsAsync();
  return settings.status;
}

/** Request OS permission; returns true when notifications can be shown. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;

  await configureNotifications();

  const Notifications = await loadNotifications();
  if (!Notifications) return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });

  return (
    requested.granted ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function showLocalNotification(title: string, body: string) {
  if (!notificationsSupported()) return;

  await configureNotifications();

  const Notifications = await loadNotifications();
  if (!Notifications) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
    trigger: null,
  });
}

export { notificationsSupported } from '@/lib/notifications/support';
