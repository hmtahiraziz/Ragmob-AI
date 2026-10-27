import AsyncStorage from '@react-native-async-storage/async-storage';

/** Bump when disclaimer / ToS copy changes and users must re-accept. */
export const CONSENT_VERSION = 2;

const KEY = 'ragmob.consent';

export type ConsentRecord = {
  version: number;
  acceptedAt: string;
};

export async function loadConsent(): Promise<ConsentRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (
      typeof parsed?.version !== 'number' ||
      typeof parsed?.acceptedAt !== 'string'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function hasAcceptedCurrentConsent(): Promise<boolean> {
  const record = await loadConsent();
  return record?.version === CONSENT_VERSION;
}

export async function acceptConsent(version = CONSENT_VERSION): Promise<ConsentRecord> {
  const record: ConsentRecord = {
    version,
    acceptedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(record));
  return record;
}

export async function clearConsent(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
