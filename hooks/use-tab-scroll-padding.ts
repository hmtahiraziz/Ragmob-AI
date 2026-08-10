import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useMemo } from 'react';
import type { Edge } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

/** Scroll content padding so the last items clear the bottom tab bar on all devices. */
export function useTabScrollPadding(extra = Spacing.lg) {
  const tabBarHeight = useBottomTabBarHeight();

  return useMemo(() => tabBarHeight + extra, [tabBarHeight, extra]);
}

/** Safe-area edges for screens rendered inside the tab navigator. */
export const TAB_SCREEN_EDGES: Edge[] = ['top'];
