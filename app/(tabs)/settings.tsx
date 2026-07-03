import { useClerk, useUser } from '@clerk/clerk-expo';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Divider, ListItem, Screen } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useHealth } from '@/hooks/use-health';
import { useTheme } from '@/hooks/use-theme';

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  }
  if (!email) return '?';
  return email.split('@')[0]?.slice(0, 2).toUpperCase() ?? '?';
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const { data, isLoading, isError } = useHealth();

  const online = !isError && (data?.status === 'healthy' || data?.status === 'ok');
  const email = user?.primaryEmailAddress?.emailAddress;
  const displayName = user?.fullName ?? null;

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Sign out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <Screen scroll padded={false} fadeIn contentContainerStyle={styles.content}>
      <Text style={[styles.screenTitle, Typography.display, { color: colors.text }]}>Settings</Text>

      {/* Profile */}
      <Card style={styles.mx} padded={false}>
        <Pressable
          onPress={() => router.push('/profile')}
          style={({ pressed }) => [styles.profileInner, pressed && { opacity: 0.85 }]}>
          <View style={styles.profileRow}>
            {user?.hasImage ? (
              <Image source={{ uri: user.imageUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.brandGlow }]}>
                <Text style={[Typography.title, { color: colors.primary }]}>
                  {getInitials(displayName, email)}
                </Text>
              </View>
            )}
            <View style={styles.profileText}>
              <Text style={[Typography.body, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                {displayName ?? email ?? 'Signed in'}
              </Text>
              <Text style={[Typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
                {displayName ? email ?? 'Free plan' : 'Tap to edit profile'}
              </Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
          </View>
        </Pressable>
        <Divider />
        <ListItem label="Sign out" leftIcon="log-out" destructive isLast onPress={handleSignOut} />
      </Card>

      {/* Status */}
      <Text style={[styles.sectionLabel, Typography.label, { color: colors.textMuted }]}>Status</Text>
      <Card style={styles.mx} padded={false}>
        <ListItem
          label="Backend"
          isLast
          trailing={
            <View style={styles.statusTrailing}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isLoading ? colors.textMuted : online ? colors.success : colors.danger },
                ]}
              />
              <Text
                style={[
                  Typography.caption,
                  { color: isLoading ? colors.textMuted : online ? colors.success : colors.danger },
                ]}>
                {isLoading ? 'Checking…' : online ? 'Online' : 'Offline'}
              </Text>
            </View>
          }
        />
      </Card>

      {/* About */}
      <Text style={[styles.sectionLabel, Typography.label, { color: colors.textMuted }]}>About</Text>
      <Card style={[styles.mx, styles.aboutCard]} padded={false}>
        <ListItem label="Version" value="1.0.0" />
        <ListItem label="Expo SDK" value="54" />
        <ListItem
          label="Docs"
          value="docs.expo.dev ↗"
          isLast
          onPress={() => WebBrowser.openBrowserAsync('https://docs.expo.dev')}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: Spacing.xxl },
  screenTitle: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.md },
  mx: { marginHorizontal: Spacing.md },
  profileInner: { padding: Spacing.lg },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  profileText: { flex: 1, gap: 2 },
  chevron: { fontSize: 24, fontWeight: '300' },
  sectionLabel: { marginHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  statusTrailing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: Radius.full },
  aboutCard: { marginBottom: Spacing.xxl },
});
