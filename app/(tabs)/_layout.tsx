import { Feather } from '@expo/vector-icons';
import * as SystemUI from 'expo-system-ui';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { Radius, Spacing } from '@/constants/theme';
import { ChatProvider } from '@/hooks/chat-context';
import { useTheme } from '@/hooks/use-theme';

const ICON_BOX = 28;
/** Icon + label column above the system gesture / nav inset. */
const TAB_CONTENT_HEIGHT = 52;
/** Extra breathing room above the swipe / system navigation bar. */
const GESTURE_NAV_GAP = 8;

function TabIcon({
  name,
  focused,
}: {
  name: React.ComponentProps<typeof Feather>['name'];
  focused: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.iconWrap,
        { backgroundColor: focused ? colors.ink : 'transparent' },
      ]}
      pointerEvents="none">
      <Feather
        name={name}
        size={16}
        color={focused ? colors.onInk : colors.tabIconDefault}
      />
    </View>
  );
}

function TabLabel({
  label,
  focused,
  color,
}: {
  label: string;
  focused: boolean;
  color: string;
}) {
  return (
    <Text
      style={[
        styles.tabBarLabel,
        {
          color,
          fontWeight: focused ? '700' : '500',
          opacity: focused ? 1 : 0.72,
        },
      ]}
      numberOfLines={1}>
      {label}
    </Text>
  );
}

/**
 * Bottom inset for swipe gesture / 3-button / iOS home indicator.
 * We apply this once ourselves (Tabs.safeAreaInsets bottom is forced to 0)
 * so edge-to-edge Android does not double-pad. A small GESTURE_NAV_GAP sits
 * between the tab labels and the system swipe bar.
 */
function useTabBottomInset() {
  const insets = useSafeAreaInsets();
  if (insets.bottom > 0) return insets.bottom + GESTURE_NAV_GAP;
  // Only when the OS reports 0 (web / rare builds) — never invent padding on
  // phones that already reserve space for the system bar.
  return Platform.OS === 'web' ? 8 : 0;
}

/** Tabs only mount when signed in (root Stack.Protected). */
export default function TabLayout() {
  const { colors } = useTheme();
  const bottomInset = useTabBottomInset();

  useEffect(() => {
    // System gesture / nav scrim uses the window background. Match the tab bar
    // so swipe-nav devices don't show a cream gap under the bar.
    void SystemUI.setBackgroundColorAsync(colors.surface);
    return () => {
      void SystemUI.setBackgroundColorAsync(colors.background);
    };
  }, [colors.surface, colors.background]);

  return (
    <ChatProvider>
      <Tabs
        // Disable navigator auto-inset on the tab bar — we pad explicitly below.
        safeAreaInsets={{ top: 0, right: 0, bottom: 0, left: 0 }}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarHideOnKeyboard: false,
          animation: 'none',
          freezeOnBlur: true,
          sceneStyle: { backgroundColor: colors.background },
          tabBarActiveTintColor: colors.ink,
          tabBarInactiveTintColor: colors.tabIconDefault,
          tabBarButton: HapticTab,
          tabBarItemStyle: styles.tabBarItem,
          tabBarIconStyle: styles.tabBarIcon,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
            height: TAB_CONTENT_HEIGHT + bottomInset,
            paddingTop: 4,
            // Clears the swipe / system nav; fills that region with surface color.
            paddingBottom: bottomInset,
            paddingHorizontal: Spacing.xs,
            elevation: 0,
            shadowOpacity: 0,
            shadowRadius: 0,
            shadowOffset: { width: 0, height: 0 },
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarAccessibilityLabel: 'Home',
            tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
            tabBarLabel: ({ focused, color }) => (
              <TabLabel label="Home" focused={focused} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarAccessibilityLabel: 'Chat',
            // Free vertical space for the composer when the IME is open.
            tabBarHideOnKeyboard: true,
            tabBarIcon: ({ focused }) => (
              <TabIcon name="message-circle" focused={focused} />
            ),
            tabBarLabel: ({ focused, color }) => (
              <TabLabel label="Chat" focused={focused} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarAccessibilityLabel: 'History',
            tabBarIcon: ({ focused }) => <TabIcon name="clock" focused={focused} />,
            tabBarLabel: ({ focused, color }) => (
              <TabLabel label="History" focused={focused} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarAccessibilityLabel: 'Settings',
            tabBarIcon: ({ focused }) => <TabIcon name="sliders" focused={focused} />,
            tabBarLabel: ({ focused, color }) => (
              <TabLabel label="Settings" focused={focused} color={color} />
            ),
          }}
        />
      </Tabs>
    </ChatProvider>
  );
}

const styles = StyleSheet.create({
  tabBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarIcon: {
    marginTop: 0,
    marginBottom: 0,
  },
  tabBarLabel: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: -0.1,
    marginTop: 1,
    textAlign: 'center',
  },
  iconWrap: {
    width: ICON_BOX,
    height: ICON_BOX,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
