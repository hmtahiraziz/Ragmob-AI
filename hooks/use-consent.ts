import { useCallback, useEffect, useState } from 'react';

import {
  acceptConsent,
  CONSENT_VERSION,
  hasAcceptedCurrentConsent,
  type ConsentRecord,
  loadConsent,
} from '@/lib/storage/consent';

type ConsentState = {
  hydrated: boolean;
  accepted: boolean;
  record: ConsentRecord | null;
  accept: () => Promise<void>;
};

export function useConsent(): ConsentState {
  const [hydrated, setHydrated] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [record, setRecord] = useState<ConsentRecord | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const current = await loadConsent();
      const ok = await hasAcceptedCurrentConsent();
      if (!active) return;
      setRecord(current);
      setAccepted(ok);
      setHydrated(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const accept = useCallback(async () => {
    const next = await acceptConsent(CONSENT_VERSION);
    setRecord(next);
    setAccepted(true);
  }, []);

  return { hydrated, accepted, record, accept };
}
