import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { healthCheck } from '@/lib/api';
import type { HealthResponse } from '@/lib/api/types';

type HealthState = {
  data?: HealthResponse;
  isLoading: boolean;
  isError: boolean;
};

type UseHealthResult = HealthState & {
  /** True only during an explicit pull-to-refresh. */
  isRefreshing: boolean;
  /** Manually re-run the health check. */
  refresh: () => Promise<void>;
};

/** Re-check interval while the backend appears offline (ms). */
const OFFLINE_POLL_INTERVAL = 8000;

function isOnline(status: HealthResponse['status'] | undefined) {
  return status === 'healthy' || status === 'ok';
}

export function useHealth(): UseHealthResult {
  const [state, setState] = useState<HealthState>({ isLoading: true, isError: false });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const inFlight = useRef(false);

  const run = useCallback(async (mode: 'initial' | 'manual' | 'poll') => {
    if (inFlight.current) return;
    inFlight.current = true;

    if (mode === 'manual') setIsRefreshing(true);
    if (mode === 'initial') setState((s) => ({ ...s, isLoading: true, isError: false }));

    try {
      const data = await healthCheck();
      setState({ data, isLoading: false, isError: false });
    } catch {
      setState({ isLoading: false, isError: true });
    } finally {
      inFlight.current = false;
      if (mode === 'manual') setIsRefreshing(false);
    }
  }, []);

  const refresh = useCallback(() => run('manual'), [run]);

  useEffect(() => {
    void run('initial');
  }, [run]);

  const offline = state.isError || !isOnline(state.data?.status);

  // Poll periodically while offline so the banner clears itself once the
  // backend becomes reachable (no app reload needed).
  useEffect(() => {
    if (!offline) return;
    const id = setInterval(() => {
      void run('poll');
    }, OFFLINE_POLL_INTERVAL);
    return () => clearInterval(id);
  }, [offline, run]);

  // Re-check whenever the app returns to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') void run('poll');
    });
    return () => sub.remove();
  }, [run]);

  return { ...state, isRefreshing, refresh };
}
