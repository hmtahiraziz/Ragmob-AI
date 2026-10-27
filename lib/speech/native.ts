/**
 * Lazy-load expo-speech-recognition only when the native module is installed.
 *
 * Never `require('expo-speech-recognition')` unless the native module exists —
 * that package eagerly calls `requireNativeModule`, which throws a fatal error
 * in Expo Go (try/catch does not stop LogBox / the error boundary).
 */

import { requireOptionalNativeModule } from 'expo-modules-core';

type SpeechPackage = typeof import('expo-speech-recognition');

let cached: SpeechPackage | null | undefined;

/** True when the ExpoSpeechRecognition native module is linked into this binary. */
export function hasSpeechRecognitionNative(): boolean {
  try {
    return requireOptionalNativeModule('ExpoSpeechRecognition') != null;
  } catch {
    return false;
  }
}

export function getSpeechRecognition(): SpeechPackage | null {
  // Gate on the native module BEFORE loading the JS package.
  if (!hasSpeechRecognitionNative()) {
    cached = null;
    return null;
  }

  if (cached !== undefined) {
    return cached;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-speech-recognition') as SpeechPackage;
    return cached;
  } catch {
    cached = null;
    return null;
  }
}

export function isSpeechRecognitionAvailable(): boolean {
  if (!hasSpeechRecognitionNative()) {
    return false;
  }
  const mod = getSpeechRecognition();
  if (!mod) return false;
  try {
    return mod.ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
}
