import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  ViewStyle,
} from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CHAT_MODES, type ChatMode } from '@/types/chat';

export const PERSONA_ICONS: Record<ChatMode, keyof typeof Feather.glyphMap> = {
  general: 'zap',
  coder: 'code',
  writer: 'edit-3',
  coach: 'target',
};

type PersonaAccent = {
  tileBg: string;
  iconBg: string;
  iconColor: string;
};

function personaAccent(mode: ChatMode, colors: ThemeColors): PersonaAccent {
  switch (mode) {
    case 'general':
      return { tileBg: colors.lavenderSoft, iconBg: colors.primary, iconColor: colors.ink };
    case 'coder':
      return { tileBg: 'rgba(10,10,10,0.05)', iconBg: colors.ink, iconColor: colors.onInk };
    case 'writer':
      return { tileBg: colors.amberSoft, iconBg: colors.accentAmber, iconColor: colors.ink };
    case 'coach':
      return { tileBg: 'rgba(63,166,106,0.12)', iconBg: colors.success, iconColor: colors.onInk };
  }
}

type PersonaPickerProps = {
  selected?: ChatMode;
  onSelect: (mode: ChatMode) => void;
  disabled?: boolean;
  showHeading?: boolean;
  /** `grid` for Home cards; `strip` for Chat horizontal slide. */
  variant?: 'grid' | 'strip';
  style?: StyleProp<ViewStyle>;
};

function PersonaTile({
  id,
  label,
  description,
  selected,
  disabled,
  onPress,
}: {
  id: ChatMode;
  label: string;
  description: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const accent = personaAccent(id, colors);
  const icon = PERSONA_ICONS[id];

  const tileBg = selected ? colors.ink : accent.tileBg;
  const titleColor = selected ? colors.onInk : colors.text;
  const descColor = selected ? 'rgba(255,255,255,0.72)' : colors.textMuted;
  const iconBg = selected ? 'rgba(255,255,255,0.14)' : accent.iconBg;
  const iconColor = selected ? colors.onInk : accent.iconColor;

  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={`${label}. ${description}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: tileBg,
          borderColor: selected ? colors.ink : colors.border,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
          opacity: disabled ? 0.65 : pressed ? 0.94 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
      ]}>
      <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[styles.tileTitle, { color: titleColor }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[Typography.caption, styles.tileDesc, { color: descColor }]} numberOfLines={2}>
        {description}
      </Text>
    </Pressable>
  );
}

function PersonaStripPill({
  id,
  label,
  description,
  selected,
  onPress,
}: {
  id: ChatMode;
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const accent = personaAccent(id, colors);
  const icon = PERSONA_ICONS[id];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}. ${description}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stripPill,
        {
          backgroundColor: selected ? colors.ink : colors.surface,
          borderColor: selected ? colors.ink : colors.borderStrong,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}>
      <View
        style={[
          styles.stripIcon,
          { backgroundColor: selected ? 'rgba(255,255,255,0.14)' : accent.iconBg },
        ]}>
        <Feather name={icon} size={14} color={selected ? colors.onInk : accent.iconColor} />
      </View>
      <Text
        style={[
          styles.stripLabel,
          { color: selected ? colors.onInk : colors.text },
        ]}
        numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function LockedPersonaBar({ mode }: { mode: ChatMode }) {
  const { colors } = useTheme();
  const active = CHAT_MODES.find((m) => m.id === mode) ?? CHAT_MODES[0];
  const accent = personaAccent(mode, colors);

  return (
    <View
      style={[
        styles.lockedBar,
        { backgroundColor: colors.surface2, borderColor: colors.border },
      ]}>
      <View style={[styles.iconBadge, { backgroundColor: accent.iconBg }]}>
        <Feather name={PERSONA_ICONS[mode]} size={18} color={accent.iconColor} />
      </View>
      <View style={styles.lockedCopy}>
        <Text style={[styles.tileTitle, { color: colors.text }]}>{active.label}</Text>
        <Text style={[Typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
          {active.description}
        </Text>
      </View>
      <View style={[styles.lockedTag, { backgroundColor: colors.surface }]}>
        <Feather name="lock" size={12} color={colors.textMuted} />
        <Text style={[Typography.caption, { color: colors.textMuted, fontWeight: '600' }]}>
          Active
        </Text>
      </View>
    </View>
  );
}

/** Persona picker — grid on Home, horizontal strip in Chat. */
export function PersonaPicker({
  selected,
  onSelect,
  disabled = false,
  showHeading = true,
  variant = 'grid',
  style,
}: PersonaPickerProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const useSingleColumn = width < 360;

  const handleSelect = (mode: ChatMode) => {
    if (disabled || mode === selected) return;
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSelect(mode);
  };

  if (disabled && selected) {
    return (
      <View style={[styles.wrap, style]}>
        <LockedPersonaBar mode={selected} />
      </View>
    );
  }

  if (variant === 'strip') {
    return (
      <View style={[styles.wrap, style]}>
        {showHeading ? (
          <Text style={[Typography.label, styles.stripHeading, { color: colors.textMuted }]}>
            Persona
          </Text>
        ) : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToAlignment="start"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.stripContent}>
          {CHAT_MODES.map((item) => (
            <PersonaStripPill
              key={item.id}
              id={item.id}
              label={item.label}
              description={item.description}
              selected={item.id === selected}
              onPress={() => handleSelect(item.id)}
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  const rows = useSingleColumn
    ? CHAT_MODES.map((item) => [item])
    : [CHAT_MODES.slice(0, 2), CHAT_MODES.slice(2, 4)];

  return (
    <View style={[styles.wrap, style]}>
      {showHeading ? (
        <View style={styles.headingBlock}>
          <Text style={[Typography.label, { color: colors.textMuted }]}>Choose a persona</Text>
          <Text style={[Typography.caption, { color: colors.textSecondary }]}>
            Tailored replies for how you want to work
          </Text>
        </View>
      ) : null}
      <View style={styles.grid}>
        {rows.map((pair, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {pair.map((item) => (
              <PersonaTile
                key={item.id}
                id={item.id}
                label={item.label}
                description={item.description}
                selected={item.id === selected}
                disabled={disabled}
                onPress={() => handleSelect(item.id)}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
    overflow: 'visible',
  },
  headingBlock: {
    gap: 4,
    marginBottom: 2,
  },
  stripHeading: {
    marginBottom: 2,
  },
  stripContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  stripPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stripIcon: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    flexShrink: 0,
  },
  grid: {
    gap: Spacing.sm,
    overflow: 'visible',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    overflow: 'visible',
  },
  tile: {
    flex: 1,
    minWidth: 0,
    minHeight: 96,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
    justifyContent: 'flex-start',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  tileDesc: {
    lineHeight: 17,
  },
  lockedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  lockedCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  lockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
});
