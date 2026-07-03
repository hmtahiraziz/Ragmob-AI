import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * ragmob design system — warm light palette.
 * Lavender + amber + ink-black on a warm off-white canvas. Flat (no shadows),
 * hairline borders only on white cards.
 */
export const Palette = {
  lavender: '#B7AEF0',
  lavenderDark: '#9C92E6',
  lavenderSoft: 'rgba(183,174,240,0.22)',
  amber: '#F6D88A',
  amberSoft: 'rgba(246,216,138,0.30)',
  amberInk: '#9A7B22',
  coral: '#F2674A',
  ink: '#0A0A0A',
  canvas: '#F7F5F2',
  white: '#FFFFFF',
  offWhite: '#F1EEE8',
  surfaceSunk: '#E9E5DD',
  border: '#E8E5DD',
  borderStrong: '#D9D5CC',
  textPrimary: '#1A1A1A',
  textSecondary: '#8A8780',
  textMuted: '#A8A49C',
  success: '#3FA66A',
  error: '#DC2626',
  warning: '#D9952B',
} as const;

/**
 * Semantic color map consumed by useTheme(). The product is light-only; the
 * `dark` entry mirrors the same keys so the union type stays consistent.
 */
const lightColors = {
  background: Palette.canvas,
  surface: Palette.white,
  surface2: Palette.offWhite,
  surface3: Palette.surfaceSunk,
  card: Palette.white,
  border: Palette.border,
  borderStrong: Palette.borderStrong,
  text: Palette.textPrimary,
  textSecondary: Palette.textSecondary,
  textMuted: Palette.textMuted,
  primary: Palette.lavender,
  primaryDark: Palette.lavenderDark,
  brandGlow: Palette.lavenderSoft,
  onPrimary: Palette.textPrimary,
  // Ink (black) chrome — pills, FAB cluster, primary CTA, active nav.
  ink: Palette.ink,
  onInk: Palette.white,
  // Amber secondary accent — "New chat" tile, "New"/"Free ads" badges.
  accentAmber: Palette.amber,
  amberSoft: Palette.amberSoft,
  onAmber: Palette.amberInk,
  lavenderSoft: Palette.lavenderSoft,
  danger: Palette.error,
  success: Palette.success,
  warning: Palette.warning,
  userBubble: Palette.lavender,
  overlay: 'rgba(10,10,10,0.45)',
  tint: Palette.ink,
  icon: Palette.textPrimary,
  tabIconDefault: Palette.textMuted,
  tabIconSelected: Palette.ink,
} as const;

export const Colors = {
  light: lightColors,
  dark: lightColors,
} as const;

/**
 * Multi-stop gradients. `auth` is the soft lavender → cream → peach wash used
 * behind the sign-in / sign-up flows.
 */
export const Gradients = {
  auth: ['#E9E3F8', '#F4EFEE', '#FCEEE4'] as const,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  /** Cards & chat bubbles. */
  card: 20,
  /** Hero / feature tiles. */
  xl: 24,
  full: 9999,
  /** @deprecated use Radius.full */
  pill: 9999,
} as const;

export const Typography = {
  display: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  title: {
    fontSize: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
    lineHeight: 16,
  },
  /** Legacy aliases */
  default: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  defaultSemiBold: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  link: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
} as const;

/**
 * Flat design — no drop shadows anywhere. Kept as no-op objects so existing
 * `...shadows.card` spreads remain valid without per-component edits.
 */
const flat: ViewStyle = { elevation: 0 };
export const Shadows = {
  card: flat,
  glow: flat,
  focus: flat,
} as const;

export type ThemeColors = typeof Colors.dark;
export type ColorName = keyof ThemeColors;
export type TypographyStyle = TextStyle;

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
