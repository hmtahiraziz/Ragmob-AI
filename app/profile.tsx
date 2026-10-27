import { useUser } from '@clerk/expo';
import type { UserResource } from '@clerk/expo/types';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banner, Button, Card, Divider, IconButton, KeyboardAwareScrollView, TextField } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAppFeedback } from '@/hooks/use-app-feedback';
import { useTheme } from '@/hooks/use-theme';
import { describeClerkProfileError } from '@/lib/auth/clerk';
import { getProfileDisplayName, getProfileNames, updateProfileNames } from '@/lib/auth/profile-name';
import { pickAndPrepareAvatar } from '@/lib/media';

const NAME_MAX = 40;

function hasGoogleAccount(user: UserResource) {
  return user.externalAccounts.some((account) => account.provider === 'google');
}

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  }
  if (email) return email.split('@')[0]?.slice(0, 2).toUpperCase() ?? '?';
  return '?';
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX);
}

type ProfileEditorProps = {
  user: UserResource;
};

function ProfileEditor({ user }: ProfileEditorProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showDialog, showToast } = useAppFeedback();

  const initialNames = getProfileNames(user);
  // Mounted only after `user` exists (see ProfileScreen), so this seed is correct.
  const [firstName, setFirstName] = useState(initialNames.firstName);
  const [lastName, setLastName] = useState(initialNames.lastName);
  const [savingProfile, setSavingProfile] = useState(false);
  const [imageStatus, setImageStatus] = useState<'idle' | 'uploading' | 'removing'>('idle');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null);

  const email = user.primaryEmailAddress?.emailAddress;
  const displayName = getProfileDisplayName(user);

  const saved = getProfileNames(user);
  const nextFirst = normalizeName(firstName);
  const nextLast = normalizeName(lastName);
  const profileDirty = nextFirst !== saved.firstName || nextLast !== saved.lastName;

  function clearAlerts() {
    setBanner(null);
    setProfileError(null);
    setPasswordError(null);
    setCurrentPasswordError(null);
  }

  async function handleSaveProfile() {
    clearAlerts();

    const first = normalizeName(firstName);
    const last = normalizeName(lastName);

    if (!first) {
      const message = 'Enter a first name.';
      setProfileError(message);
      setBanner({ tone: 'error', message });
      return;
    }

    if (first === saved.firstName && last === saved.lastName) {
      setFirstName(first);
      setLastName(last);
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await updateProfileNames(user, first, last);
      setFirstName(updated.firstName);
      setLastName(updated.lastName);
      showToast({ message: 'Profile updated', tone: 'success' });
    } catch (err) {
      const message = describeClerkProfileError(err, 'Could not update profile. Please try again.');
      setProfileError(message);
      setBanner({ tone: 'error', message });
    } finally {
      setSavingProfile(false);
    }
  }

  async function pickAndUploadImage() {
    clearAlerts();
    try {
      const prepared = await pickAndPrepareAvatar();
      if (!prepared) return;

      setImageStatus('uploading');
      await user.setProfileImage({ file: prepared.dataUrl });
      await user.reload();
      showToast({ message: 'Avatar updated', tone: 'success' });
    } catch (err) {
      const message = describeClerkProfileError(err, 'Could not update photo. Please try again.');
      showToast({ message, tone: 'error' });
    } finally {
      setImageStatus('idle');
    }
  }

  async function removeImage() {
    clearAlerts();
    setImageStatus('removing');
    try {
      await user.setProfileImage({ file: null });
      await user.reload();
      showToast({ message: 'Avatar removed', tone: 'success' });
    } catch (err) {
      showToast({
        message: describeClerkProfileError(err, 'Could not remove photo. Please try again.'),
        tone: 'error',
      });
    } finally {
      setImageStatus('idle');
    }
  }

  function confirmRemoveImage() {
    showDialog({
      title: 'Remove avatar?',
      message: 'Your profile photo will be removed from your account.',
      actions: [
        { label: 'Cancel', variant: 'ghost' },
        {
          label: 'Remove',
          variant: 'danger',
          onPress: () => void removeImage(),
        },
      ],
    });
  }

  function handleAvatarPress() {
    if (imageStatus !== 'idle') return;
    if (!user.hasImage) {
      void pickAndUploadImage();
      return;
    }
    showDialog({
      title: 'Profile photo',
      message: 'Photos are resized and metadata (EXIF) is removed before upload.',
      actions: [
        {
          label: 'Change photo',
          variant: 'primary',
          onPress: () => void pickAndUploadImage(),
        },
        {
          label: 'Remove photo',
          variant: 'danger',
          onPress: confirmRemoveImage,
        },
        { label: 'Cancel', variant: 'ghost' },
      ],
    });
  }

  async function handleChangePassword() {
    clearAlerts();

    if (newPassword.length < 8) {
      const message = 'Password must be at least 8 characters.';
      setPasswordError(message);
      setBanner({ tone: 'error', message });
      return;
    }
    if (newPassword !== confirmPassword) {
      const message = 'New passwords do not match.';
      setPasswordError(message);
      setBanner({ tone: 'error', message });
      return;
    }

    const settingPassword = !user.passwordEnabled;
    if (!settingPassword && !currentPassword) {
      const message = 'Enter your current password.';
      setCurrentPasswordError(message);
      setBanner({ tone: 'error', message });
      return;
    }

    setSavingPassword(true);
    try {
      if (settingPassword) {
        await user.updatePassword({ newPassword });
      } else {
        await user.updatePassword({ currentPassword, newPassword });
      }
      await user.reload();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      const ok = settingPassword
        ? 'Password set — you can now sign in with email too'
        : 'Password updated';
      showToast({ message: ok, tone: 'success' });
    } catch (err) {
      const message = describeClerkProfileError(err, 'Could not update password. Please try again.');
      if (/current password/i.test(message)) {
        setCurrentPasswordError(message);
      } else {
        setPasswordError(message);
      }
      setBanner({ tone: 'error', message });
    } finally {
      setSavingPassword(false);
    }
  }

  const settingPassword = !user.passwordEnabled;
  const signedInWithGoogle = hasGoogleAccount(user);
  const confirmMismatch =
    confirmPassword.length > 0 && confirmPassword !== newPassword
      ? 'Passwords do not match'
      : undefined;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <IconButton icon="arrow-left" variant="ghost" accessibilityLabel="Back" onPress={() => router.back()} />
        <Text style={[Typography.heading, { color: colors.text }]}>Edit profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        bottomInset={insets.bottom + Spacing.xxl}
        focusGap={32}>
        {banner ? (
          <Banner tone={banner.tone} message={banner.message} onDismiss={() => setBanner(null)} style={styles.banner} />
        ) : null}

        <View style={styles.avatarSection}>
          <Pressable
            onPress={handleAvatarPress}
            disabled={imageStatus !== 'idle'}
            accessibilityLabel="Change profile photo"
            style={[styles.avatarWrap, imageStatus !== 'idle' && styles.avatarBusy]}>
            {user.hasImage ? (
              <Image
                source={{ uri: user.imageUrl }}
                style={styles.avatar}
                contentFit="cover"
                recyclingKey={user.imageUrl}
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.brandGlow }]}>
                <Text style={[Typography.title, { color: colors.primaryDark }]}>
                  {getInitials(displayName, email)}
                </Text>
              </View>
            )}
            <View style={[styles.avatarBadge, { backgroundColor: colors.ink }]}>
              <Feather name={user.hasImage ? 'edit-2' : 'camera'} size={13} color={colors.onInk} />
            </View>
          </Pressable>
          <Text style={[Typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
            {imageStatus === 'uploading'
              ? 'Uploading…'
              : imageStatus === 'removing'
                ? 'Removing…'
                : 'Tap photo to change'}
          </Text>
        </View>

        <Card style={styles.card}>
          <TextField
            label="First name"
            value={firstName}
            onChangeText={(v) => {
              setFirstName(v.slice(0, NAME_MAX));
              if (profileError) setProfileError(null);
              if (banner?.tone === 'error') setBanner(null);
            }}
            placeholder="Jane"
            leftIcon="user"
            autoCapitalize="words"
            maxLength={NAME_MAX}
            hint={`Up to ${NAME_MAX} characters`}
            error={profileError ?? undefined}
          />
          <TextField
            label="Last name"
            value={lastName}
            onChangeText={(v) => {
              setLastName(v.slice(0, NAME_MAX));
              if (profileError) setProfileError(null);
              if (banner?.tone === 'error') setBanner(null);
            }}
            placeholder="Doe"
            leftIcon="user"
            autoCapitalize="words"
            maxLength={NAME_MAX}
          />
          <TextField
            label="Email"
            value={email ?? ''}
            editable={false}
            leftIcon="mail"
            hint="Email is managed by your account and can't be changed here."
          />
          <Button
            title="Save changes"
            onPress={() => void handleSaveProfile()}
            loading={savingProfile}
            disabled={!profileDirty || savingProfile}
            fullWidth
          />
        </Card>

        <Text style={[styles.sectionLabel, Typography.label, { color: colors.textMuted }]}>
          {settingPassword ? 'Set a password' : 'Password'}
        </Text>
        <Card style={styles.card}>
          {settingPassword && signedInWithGoogle ? (
            <Text style={[Typography.caption, styles.passwordHint, { color: colors.textSecondary }]}>
              You signed in with Google. Add a password here to also sign in with your email address.
            </Text>
          ) : null}
          {!settingPassword ? (
            <TextField
              label="Current password"
              value={currentPassword}
              onChangeText={(v) => {
                setCurrentPassword(v);
                if (currentPasswordError) setCurrentPasswordError(null);
                if (banner?.tone === 'error') setBanner(null);
              }}
              secureTextEntry={!showPasswords}
              leftIcon="lock"
              placeholder="••••••••"
              autoCapitalize="none"
              error={currentPasswordError ?? undefined}
            />
          ) : null}
          <TextField
            label={settingPassword ? 'Password' : 'New password'}
            value={newPassword}
            onChangeText={(v) => {
              setNewPassword(v);
              if (passwordError) setPasswordError(null);
              if (banner?.tone === 'error') setBanner(null);
            }}
            secureTextEntry={!showPasswords}
            leftIcon="lock"
            rightIcon={showPasswords ? 'eye-off' : 'eye'}
            onRightIconPress={() => setShowPasswords((v) => !v)}
            placeholder="At least 8 characters"
            autoCapitalize="none"
            error={passwordError && !confirmMismatch ? passwordError : undefined}
          />
          <TextField
            label={settingPassword ? 'Confirm password' : 'Confirm new password'}
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              if (passwordError) setPasswordError(null);
              if (banner?.tone === 'error') setBanner(null);
            }}
            secureTextEntry={!showPasswords}
            leftIcon="lock"
            placeholder="Re-enter your password"
            autoCapitalize="none"
            error={confirmMismatch ?? (passwordError && /match/i.test(passwordError) ? passwordError : undefined)}
          />
          <Button
            title={settingPassword ? 'Set password' : 'Update password'}
            variant="secondary"
            onPress={() => void handleChangePassword()}
            loading={savingPassword}
            disabled={newPassword.length === 0 || confirmPassword.length === 0 || savingPassword}
            fullWidth
          />
        </Card>

        <Divider />
        <Text style={[Typography.caption, styles.footer, { color: colors.textMuted }]}>
          Signed in as {email ?? 'your account'}
        </Text>
      </KeyboardAwareScrollView>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user) {
    return null;
  }

  return <ProfileEditor key={user.id} user={user} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerSpacer: { width: 48 },
  body: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  banner: { marginBottom: Spacing.md },
  avatarSection: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  avatarWrap: { width: 96, height: 96 },
  avatarBusy: { opacity: 0.5 },
  avatar: { width: 96, height: 96, borderRadius: Radius.full },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { marginBottom: Spacing.md },
  passwordHint: { marginBottom: Spacing.md },
  sectionLabel: { marginTop: Spacing.sm, marginBottom: Spacing.sm },
  footer: { textAlign: 'center', marginTop: Spacing.md },
});
