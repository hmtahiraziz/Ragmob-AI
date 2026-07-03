import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { Radius } from '@/constants/theme';
import { ChatProvider } from '@/hooks/chat-context';
import { useTheme } from '@/hooks/use-theme';

function TabIcon({
  name,
  focused,
}: {
  name: React.ComponentProps<typeof Feather>['name'];
  focused: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.iconWrap, focused && { backgroundColor: colors.ink }]}>
      <Feather name={name} size={22} color={focused ? colors.onInk : colors.tabIconDefault} />
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ChatProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: colors.ink,
          tabBarInactiveTintColor: colors.tabIconDefault,
          tabBarButton: HapticTab,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom + 8,
            paddingTop: 8,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ focused }) => <TabIcon name="message-circle" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ focused }) => <TabIcon name="sliders" focused={focused} />,
          }}
        />
      </Tabs>
    </ChatProvider>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 44,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
