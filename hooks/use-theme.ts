/**
 * Theme-mode store for the kit.
 *
 * Dark-first design system. `mode` persists user preference; `scheme` resolves
 * to the active palette (defaults to dark).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

const STORAGE_KEY = 'ragmob.themeMode';

type ThemeModeContextValue = {
  mode: ThemeMode;
  scheme: ColorScheme;
  setMode: (mode: ThemeMode) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'light',
  scheme: 'light',
  setMode: () => {},
});

export function ThemeModeProvider({ children }: PropsWithChildren) {
  // Product is light-only; persistence kept for forward-compatibility but the
  // resolved scheme is always 'light'.
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (active && (stored === 'light' || stored === 'dark' || stored === 'system')) {
        setModeState(stored);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const scheme: ColorScheme = 'light';

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(Colors[scheme].background);
  }, [scheme]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<ThemeModeContextValue>(
    () => ({ mode, scheme, setMode }),
    [mode, scheme, setMode],
  );

  return createElement(ThemeModeContext.Provider, { value }, children);
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}

export function useResolvedColorScheme(): ColorScheme {
  return useContext(ThemeModeContext).scheme;
}

/** Aggregated design tokens for the current scheme. */
export function useTheme() {
  const scheme = useResolvedColorScheme();
  return useMemo(
    () => ({
      scheme,
      colors: Colors[scheme],
      spacing: Spacing,
      radius: Radius,
      typography: Typography,
      shadows: Shadows,
    }),
    [scheme],
  );
}
