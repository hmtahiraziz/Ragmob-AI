import { useAuth, useUser } from '@clerk/clerk-expo';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { RagmobWordmark } from '@/components/brand';
import { Card, ListItem, Screen, SwitchRow } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useContentWidth } from '@/hooks/use-content-width';
import { useNotifications } from '@/hooks/use-notifications';
import { TAB_SCREEN_EDGES, useTabScrollPadding } from '@/hooks/use-tab-scroll-padding';
import { useTheme } from '@/hooks/use-theme';
import { registerTokenGetter } from '@/lib/auth/token';

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
  const { signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const { containerStyle, isWide } = useContentWidth();
  const tabScrollPadding = useTabScrollPadding();
  const {
    prefs,
    hydrated,
    nativeAvailable,
    setEnabled,
    setChatReplies,
    setBackendAlerts,
  } = useNotifications();

  const email = user?.primaryEmailAddress?.emailAddress;
  const displayName = user?.fullName ?? null;

  const performSignOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      registerTokenGetter(null);
      await signOut();
      router.replace('/sign-in');
    } catch {
      Alert.alert('Sign out failed', 'Please try again.');
    } finally {
      setSigningOut(false);
    }
  }, [router, signOut, signingOut]);

  const handleSignOut = () => {
    void performSignOut();
  };

  return (
    <Screen
      scroll
      padded={false}
      edges={TAB_SCREEN_EDGES}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: tabScrollPadding }]}>
      <View style={[styles.page, containerStyle, isWide && styles.pageWide]}>
        {/* Brand header */}
        <View style={styles.hero}>
          <RagmobWordmark markSize={34} />
          <Text style={[Typography.display, styles.title, { color: colors.text }]}>Settings</Text>
          <Text style={[Typography.body, { color: colors.textSecondary }]}>
            Manage your account and preferences
          </Text>
        </View>

        {/* Profile card */}
        <Card style={styles.card} padded={false}>
          <Pressable
            onPress={() => router.push('/profile')}
            style={({ pressed }) => [styles.profileBlock, pressed && { opacity: 0.88 }]}>
            <View style={styles.profileRow}>
              {user?.hasImage ? (
                <Image source={{ uri: user.imageUrl }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.lavenderSoft }]}>
                  <Text style={[Typography.title, { color: colors.primaryDark, fontSize: 20 }]}>
                    {getInitials(displayName, email)}
                  </Text>
                </View>
              )}
              <View style={styles.profileText}>
                <Text style={[Typography.heading, { color: colors.text }]} numberOfLines={1}>
                  {displayName ?? 'Your account'}
                </Text>
                <Text style={[Typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
                  {email ?? 'Signed in'}
                </Text>
              </View>
              <View style={[styles.editBadge, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
              </View>
            </View>
            <View style={[styles.manageRow, { borderTopColor: colors.border }]}>
              <Feather name="user" size={16} color={colors.textSecondary} />
              <Text style={[Typography.body, styles.manageLabel, { color: colors.text }]}>
                Edit profile & password
              </Text>
            </View>
          </Pressable>
        </Card>

        {/* Notifications */}
        {nativeAvailable ? (
          <>
            <Text style={[Typography.label, styles.sectionLabel, { color: colors.textMuted }]}>
              Notifications
            </Text>
            <Card style={styles.card} padded={false}>
              <SwitchRow
                label="Enable notifications"
                description="Alerts when replies finish in the background"
                leftIcon="bell"
                value={prefs.enabled}
                disabled={!hydrated}
                onValueChange={(v) => void setEnabled(v)}
              />
              <SwitchRow
                label="Chat replies"
                description="Notify when an assistant response is ready"
                leftIcon="message-circle"
                value={prefs.chatReplies}
                disabled={!hydrated || !prefs.enabled}
                onValueChange={setChatReplies}
              />
              <SwitchRow
                label="Backend alerts"
                description="Notify when your AI server comes back online"
                leftIcon="server"
                value={prefs.backendAlerts}
                disabled={!hydrated || !prefs.enabled}
                isLast
                onValueChange={setBackendAlerts}
              />
            </Card>
          </>
        ) : null}

        {/* Account */}
        <Text style={[Typography.label, styles.sectionLabel, { color: colors.textMuted }]}>
          Account
        </Text>
        <Card style={styles.card} padded={false}>
          <ListItem
            label={signingOut ? 'Signing out…' : 'Sign out'}
            leftIcon="log-out"
            destructive
            isLast
            onPress={signingOut ? undefined : handleSignOut}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    width: '100%',
  },
  pageWide: {
    paddingTop: Spacing.xl,
  },
  hero: {
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  title: {
    marginTop: Spacing.sm,
    fontSize: 32,
    lineHeight: 38,
  },
  card: {
    marginBottom: Spacing.md,
  },
  profileBlock: {
    overflow: 'hidden',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  editBadge: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  manageLabel: {
    fontWeight: '500',
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
});
