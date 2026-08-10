import { useAuth } from '@clerk/clerk-expo';
import { useEffect, useRef } from 'react';

import { useHealth } from '@/hooks/use-health';
import { useNotifications } from '@/hooks/use-notifications';
import { configureNotifications } from '@/lib/notifications';

function isOnline(status: string | undefined) {
  return status === 'healthy' || status === 'ok';
}

function NotificationControllerActive() {
  const { notifyBackendOnline, nativeAvailable } = useNotifications();
  const { data, isError, isLoading } = useHealth();
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (!nativeAvailable) return;
    void configureNotifications();
  }, [nativeAvailable]);

  useEffect(() => {
    if (isLoading) return;

    const offline = isError || !isOnline(data?.status);
    if (offline) {
      wasOfflineRef.current = true;
      return;
    }

    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      void notifyBackendOnline();
    }
  }, [data?.status, isError, isLoading, notifyBackendOnline]);

  return null;
}

/** Wires notification setup and backend online alerts (signed-in only). */
export function NotificationController() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return <NotificationControllerActive />;
}
