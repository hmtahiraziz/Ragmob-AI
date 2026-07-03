import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type MiniBarChartProps = {
  /** Relative bar values (0..1 or any positive scale). */
  data: number[];
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Flat bar chart with alternating amber/lavender pill bars — no axes or grid.
 * Pure View-based, no charting dependency.
 */
export function MiniBarChart({ data, height = 120, style }: MiniBarChartProps) {
  const { colors } = useTheme();
  const max = Math.max(...data, 1);

  return (
    <View style={[styles.row, { height }, style]}>
      {data.map((value, index) => {
        const ratio = Math.max(0.06, value / max);
        const barColor = index % 2 === 0 ? colors.accentAmber : colors.primary;
        return (
          <View key={index} style={styles.column}>
            <View
              style={[
                styles.bar,
                { height: `${ratio * 100}%`, backgroundColor: barColor },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  column: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: Radius.full, minHeight: 8 },
});
