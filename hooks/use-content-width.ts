import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

import { Spacing } from '@/constants/theme';

export const MAX_CONTENT_WIDTH = 520;
export const WIDE_BREAKPOINT = 640;

/** Responsive column width for phone, tablet, and web. */
export function useContentWidth() {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    const horizontalInset = Spacing.md * 2;
    const contentWidth = Math.min(width - horizontalInset, MAX_CONTENT_WIDTH);
    const isWide = width >= WIDE_BREAKPOINT;
    const isWeb = Platform.OS === 'web';

    return {
      width: contentWidth,
      isWide,
      isWeb,
      /** Center the column on wide viewports (web / tablet). */
      containerStyle: isWide
        ? ({ width: '100%' as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' as const })
        : ({ width: '100%' as const }),
      /** Match page horizontal padding used on Home / Settings. */
      pagePaddingStyle: { paddingHorizontal: Spacing.md } as const,
    };
  }, [width]);
}
