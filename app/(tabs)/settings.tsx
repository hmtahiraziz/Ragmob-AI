import { useAuth, useUser } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, ListItem, Screen } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAppFeedback } from '@/hooks/use-app-feedback';
import { useChatContext } from '@/hooks/chat-context';
import { useContentWidth } from '@/hooks/use-content-width';
import { TAB_SCREEN_EDGES, useTabScrollPadding } from '@/hooks/use-tab-scroll-padding';
import { useTheme } from '@/hooks/use-theme';
import { deleteServerAccount } from '@/lib/api';
import { getProfileDisplayName } from '@/lib/auth/profile-name';
import { registerTokenGetter } from '@/lib/auth/token';
import { clearConsent } from '@/lib/storage/consent';
import { clearChat } from '@/lib/storage/chat';

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
  const { signOut, userId } = useAuth();
  const router = useRouter();
  const { showToast, showDialog, confirm } = useAppFeedback();
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const { containerStyle, isWide } = useContentWidth();
  const tabScrollPadding = useTabScrollPadding();
  const { conversations, clearAllConversations } = useChatContext();

  const email = user?.primaryEmailAddress?.emailAddress;
  const displayName = getProfileDisplayName(user);
  const busy = signingOut || deletingAccount;

  const chatCount = useMemo(
    () => conversations.filter((c) => c.messages.length > 0).length,
    [conversations],
  );

  const performSignOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      registerTokenGetter(null);
      await signOut();
    } catch {
      showToast({ tone: 'error', message: 'Sign out failed. Please try again.' });
    } finally {
      setSigningOut(false);
    }
  }, [signOut, signingOut, showToast]);

  const handleSignOut = async () => {
    const ok = await confirm({
      title: 'Sign out?',
      message: 'You can sign back in anytime with the same account.',
      confirmLabel: 'Sign out',
      destructive: true,
    });
    if (!ok) return;
    await performSignOut();
  };

  const handleDeleteAllChats = async () => {
    if (chatCount === 0) {
      showToast({ tone: 'info', message: 'No chats to delete.' });
      return;
    }
    const ok = await confirm({
      title: 'Delete all chats?',
      message:
        'Removes every conversation on this device and requests deletion from our servers. This cannot be undone.',
      confirmLabel: 'Delete all',
      destructive: true,
    });
    if (!ok) return;
    clearAllConversations();
    showToast({ tone: 'success', message: 'All chats deleted.' });
  };

  const performDeleteAccount = useCallback(async () => {
    if (!user || deletingAccount) return;
    setDeletingAccount(true);
    try {
      try {
        await deleteServerAccount();
      } catch {
        // Continue — Clerk + local wipe still required even if API is down.
      }

      if (userId) await clearChat(userId);
      await clearConsent();

      try {
        await user.delete();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Could not delete this account yet.';
        showDialog({
          title: 'Re-authentication required',
          message: `${message}\n\nSign out, sign back in, then try Delete account again — or use the web deletion page.`,
          actions: [{ label: 'OK', variant: 'primary' }],
        });
        setDeletingAccount(false);
        return;
      }

      registerTokenGetter(null);
      await signOut();
      showToast({ tone: 'success', message: 'Your account has been deleted.' });
    } catch {
      showToast({
        tone: 'error',
        message: 'Delete failed. Try again or use the account deletion web page.',
      });
      setDeletingAccount(false);
    }
  }, [user, userId, deletingAccount, signOut, showDialog, showToast]);

  const handleDeleteAccount = async () => {
    const first = await confirm({
      title: 'Delete your account?',
      message:
        'Permanently deletes your Ragmob account, chat history, feedback, reports, and profile data. This cannot be undone.',
      confirmLabel: 'Continue',
      destructive: true,
    });
    if (!first) return;

    const second = await confirm({
      title: 'Confirm deletion',
      message: email
        ? `You are deleting the account for ${email}. Continue?`
        : 'Are you sure you want to permanently delete this account?',
      confirmLabel: 'Yes, delete forever',
      destructive: true,
    });
    if (!second) return;
    await performDeleteAccount();
  };

  return (
    <Screen
      scroll
      padded={false}
      edges={TAB_SCREEN_EDGES}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: tabScrollPadding }]}>
      <View style={[styles.page, containerStyle, isWide && styles.pageWide]}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Account, privacy, and preferences
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/profile')}
          accessibilityRole="button"
          accessibilityLabel="Edit profile and password"
          style={({ pressed }) => [
            styles.profileCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.92 : 1,
            },
          ]}>
          <View style={styles.profileRow}>
            {user?.hasImage ? (
              <Image source={{ uri: user.imageUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View
                style={[
                  styles.avatar,
                  styles.avatarFallback,
                  { backgroundColor: colors.lavenderSoft },
                ]}>
                <Text style={[styles.avatarInitials, { color: colors.primaryDark }]}>
                  {getInitials(displayName, email)}
                </Text>
              </View>
            )}
            <View style={styles.profileText}>
              <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
                {displayName ?? 'Your account'}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.textMuted }]} numberOfLines={1}>
                {email ?? 'Signed in'}
              </Text>
            </View>
            <View style={[styles.editChip, { backgroundColor: colors.ink }]}>
              <Text style={[styles.editChipLabel, { color: colors.onInk }]}>Edit</Text>
              <Feather name="chevron-right" size={14} color={colors.onInk} />
            </View>
          </View>
          <View style={[styles.profileHint, { borderTopColor: colors.border }]}>
            <Feather name="user" size={14} color={colors.textSecondary} />
            <Text style={[styles.profileHintText, { color: colors.textSecondary }]}>
              Name, photo, and password
            </Text>
          </View>
        </Pressable>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Privacy & data</Text>
        <Card style={[styles.card, { borderColor: colors.border }]} padded={false}>
          <ListItem
            label="Terms of Service"
            description="How Ragmob may be used"
            leftIcon="file-text"
            showChevron
            onPress={() => router.push('/terms-of-service')}
          />
          <ListItem
            label="Privacy policy"
            description="What we collect and why"
            leftIcon="shield"
            showChevron
            onPress={() => router.push('/privacy-policy')}
          />
          <ListItem
            label="Delete all chats"
            description={
              chatCount > 0
                ? `${chatCount} conversation${chatCount === 1 ? '' : 's'} on this device`
                : 'No conversations saved'
            }
            leftIcon="trash-2"
            destructive
            isLast
            disabled={busy}
            onPress={() => void handleDeleteAllChats()}
          />
        </Card>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Account</Text>
        <Card style={[styles.card, { borderColor: colors.border }]} padded={false}>
          <ListItem
            label={signingOut ? 'Signing out…' : 'Sign out'}
            description="Stay signed out on this device"
            leftIcon="log-out"
            disabled={busy}
            onPress={() => void handleSignOut()}
          />
          <ListItem
            label={deletingAccount ? 'Deleting account…' : 'Delete account'}
            description="Permanently remove your Ragmob account"
            leftIcon="user-x"
            destructive
            isLast
            disabled={busy}
            onPress={() => void handleDeleteAccount()}
          />
        </Card>

        <Text style={[styles.footerNote, { color: colors.textMuted }]}>
          Ragmob stores chats on this device and syncs when you’re online.
        </Text>
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
    paddingTop: Spacing.md,
    width: '100%',
  },
  pageWide: {
    paddingTop: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  profileCard: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    flexShrink: 0,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  profileText: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  profileEmail: {
    fontSize: 13,
    lineHeight: 18,
  },
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 32,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: Radius.full,
    flexShrink: 0,
  },
  editChipLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  profileHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  profileHintText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
    paddingHorizontal: 2,
  },
  card: {
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
  },
  footerNote: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    lineHeight: 18,
  },
});
