/**
 * Resolves to the active scheme from the theme-mode store, so the manual
 * light/dark toggle (and 'system') flows through every themed component.
 */
export { useResolvedColorScheme as useColorScheme } from '@/hooks/use-theme';
