import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { formatRecordingDuration } from '@/lib/speech/format-duration';
import {
  getSpeechRecognition,
  hasSpeechRecognitionNative,
  isSpeechRecognitionAvailable,
} from '@/lib/speech/native';

export type SpeechInputStatus = 'idle' | 'listening';
export { formatRecordingDuration };

function resolveSpeechLang(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (locale) return locale.replace(/_/g, '-');
  } catch {
    // ignore
  }
  return 'en-US';
}

function friendlySpeechError(code: string, message?: string): string {
  switch (code) {
    case 'not-allowed':
      return 'Microphone or speech recognition permission was denied. Enable it in system settings.';
    case 'language-not-supported':
      return 'Speech recognition is not available for this language. Try switching your device language or speak in English.';
    case 'no-speech':
    case 'speech-timeout':
      return 'No speech detected. Tap the mic and try again.';
    case 'audio-capture':
      return 'Could not access the microphone. Check that nothing else is using it.';
    case 'network':
      return 'Speech recognition needs a network connection on this device. Check your connection and try again.';
    case 'service-not-allowed':
    case 'busy':
      return 'Speech recognition is unavailable right now. Try again in a moment.';
    case 'interrupted':
      return 'Recording was interrupted. Tap the mic to try again.';
    case 'aborted':
      return '';
    default:
      return message?.trim() || 'Speech recognition failed. Please try again.';
  }
}

function unavailableMessage(): string {
  return (
    Platform.select({
      ios: 'Voice input needs a development or preview build (not Expo Go).',
      android: 'Voice input needs a development or preview build (not Expo Go).',
      default: 'Voice input is not available on this platform.',
    }) ?? 'Voice input is not available.'
  );
}

type UseSpeechInputOptions = {
  /** Called with interim/final transcripts while listening (for live draft preview). */
  onPartial?: (text: string) => void;
  /** Called once with the final transcript after a successful stop (not cancel). */
  onFinal?: (text: string) => void;
  onError?: (message: string) => void;
  lang?: string;
};

/**
 * On-device / OS speech-to-text for the chat composer.
 * Requires a development or preview build — gracefully no-ops in Expo Go.
 */
export function useSpeechInput({
  onPartial,
  onFinal,
  onError,
  lang,
}: UseSpeechInputOptions = {}) {
  const [status, setStatus] = useState<SpeechInputStatus>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [partialTranscript, setPartialTranscript] = useState('');
  // Only probe the optional native module — never load expo-speech-recognition here.
  const [available] = useState(() => hasSpeechRecognitionNative());

  const cancelledRef = useRef(false);
  const erroredRef = useRef(false);
  const finalRef = useRef('');
  const startedAtRef = useRef<number | null>(null);
  const statusRef = useRef<SpeechInputStatus>('idle');
  const onPartialRef = useRef(onPartial);
  const onFinalRef = useRef(onFinal);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    onPartialRef.current = onPartial;
    onFinalRef.current = onFinal;
    onErrorRef.current = onError;
  }, [onPartial, onFinal, onError]);

  // Subscribe only when the native module is linked (skips Expo Go entirely).
  useEffect(() => {
    if (!hasSpeechRecognitionNative()) return;
    const mod = getSpeechRecognition();
    if (!mod) return;

    const { ExpoSpeechRecognitionModule } = mod;

    const startSub = ExpoSpeechRecognitionModule.addListener('start', () => {
      setStatus('listening');
      startedAtRef.current = Date.now();
      setElapsedMs(0);
    });

    const endSub = ExpoSpeechRecognitionModule.addListener('end', () => {
      const wasCancelled = cancelledRef.current;
      const wasErrored = erroredRef.current;
      const finalText = finalRef.current.trim();
      setStatus('idle');
      startedAtRef.current = null;
      setElapsedMs(0);

      if (!wasCancelled && !wasErrored) {
        if (finalText) {
          onFinalRef.current?.(finalText);
        } else {
          onErrorRef.current?.(friendlySpeechError('no-speech'));
        }
      }

      cancelledRef.current = false;
      erroredRef.current = false;
      finalRef.current = '';
      setPartialTranscript('');
    });

    const resultSub = ExpoSpeechRecognitionModule.addListener('result', (event) => {
      const text = event.results?.[0]?.transcript?.trim() ?? '';
      if (!text) return;
      if (event.isFinal) {
        finalRef.current = text;
      }
      setPartialTranscript(text);
      onPartialRef.current?.(text);
    });

    const errorSub = ExpoSpeechRecognitionModule.addListener('error', (event) => {
      const code = event.error ?? 'unknown';
      if (code === 'aborted') {
        cancelledRef.current = true;
        setStatus('idle');
        return;
      }
      erroredRef.current = true;
      const message = friendlySpeechError(code, event.message);
      setStatus('idle');
      startedAtRef.current = null;
      setElapsedMs(0);
      setPartialTranscript('');
      finalRef.current = '';
      if (message) onErrorRef.current?.(message);
    });

    return () => {
      startSub.remove();
      endSub.remove();
      resultSub.remove();
      errorSub.remove();
    };
  }, []);

  useEffect(() => {
    if (status !== 'listening') return;
    const id = setInterval(() => {
      if (startedAtRef.current) {
        setElapsedMs(Date.now() - startedAtRef.current);
      }
    }, 250);
    return () => clearInterval(id);
  }, [status]);

  const abortQuietly = useCallback(() => {
    try {
      getSpeechRecognition()?.ExpoSpeechRecognitionModule.abort();
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active' && statusRef.current === 'listening') {
        cancelledRef.current = true;
        abortQuietly();
        setStatus('idle');
        setPartialTranscript('');
        finalRef.current = '';
      }
    });
    return () => {
      sub.remove();
      if (statusRef.current === 'listening') {
        cancelledRef.current = true;
        abortQuietly();
      }
    };
  }, [abortQuietly]);

  const start = useCallback(async () => {
    const mod = getSpeechRecognition();
    if (!mod || !isSpeechRecognitionAvailable()) {
      onErrorRef.current?.(unavailableMessage());
      return false;
    }

    try {
      const permission = await mod.ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        onErrorRef.current?.(friendlySpeechError('not-allowed'));
        return false;
      }
    } catch {
      onErrorRef.current?.(unavailableMessage());
      return false;
    }

    cancelledRef.current = false;
    erroredRef.current = false;
    finalRef.current = '';
    setPartialTranscript('');
    setElapsedMs(0);

    try {
      mod.ExpoSpeechRecognitionModule.start({
        lang: lang ?? resolveSpeechLang(),
        interimResults: true,
        continuous: false,
        requiresOnDeviceRecognition: false,
        addsPunctuation: true,
      });
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not start speech recognition.';
      onErrorRef.current?.(message);
      setStatus('idle');
      return false;
    }
  }, [lang]);

  const stop = useCallback(() => {
    cancelledRef.current = false;
    try {
      getSpeechRecognition()?.ExpoSpeechRecognitionModule.stop();
    } catch {
      setStatus('idle');
    }
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    finalRef.current = '';
    setPartialTranscript('');
    abortQuietly();
    setStatus('idle');
    startedAtRef.current = null;
    setElapsedMs(0);
  }, [abortQuietly]);

  const retry = useCallback(async () => {
    cancel();
    return start();
  }, [cancel, start]);

  return {
    available,
    status,
    isListening: status === 'listening',
    elapsedMs,
    partialTranscript,
    start,
    stop,
    cancel,
    retry,
  };
}
