import { useEffect, useState } from 'react';

/** Cooldown before "Resend code" is enabled again. */
export const RESEND_COOLDOWN_SECONDS = 30;

/** Client-side estimate of email OTP lifetime (Clerk codes typically expire in ~10 minutes). */
export const CODE_EXPIRY_SECONDS = 10 * 60;

export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/** Shared resend cooldown + code expiry countdown for OTP screens. */
export function useOtpTimers(
  options: {
    resendSeconds?: number;
    expirySeconds?: number;
  } = {},
) {
  const resendSeconds = options.resendSeconds ?? RESEND_COOLDOWN_SECONDS;
  const expirySeconds = options.expirySeconds ?? CODE_EXPIRY_SECONDS;
  const [cooldown, setCooldown] = useState(resendSeconds);
  const [expiresIn, setExpiresIn] = useState(expirySeconds);

  useEffect(() => {
    const id = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
      setExpiresIn((e) => (e > 0 ? e - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const restart = () => {
    setCooldown(resendSeconds);
    setExpiresIn(expirySeconds);
  };

  return {
    cooldown,
    expiresIn,
    expired: expiresIn <= 0,
    canResend: cooldown <= 0,
    restart,
  };
}
