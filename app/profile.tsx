import { useUser } from '@clerk/clerk-expo';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banner, Button, Card, Divider, IconButton, KeyboardAwareScrollView, TextField } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  }
  if (email) return email.split('@')[0]?.slice(0, 2).toUpperCase() ?? '?';
  return '?';
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [imageStatus, setImageStatus] = useState<'idle' | 'uploading' | 'removing'>('idle');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const email = user?.primaryEmailAddress?.emailAddress;
  const displayName = user?.fullName ?? null;

  const profileDirty =
    firstName !== (user?.firstName ?? '') || lastName !== (user?.lastName ?? '');

  function showBanner(tone: 'success' | 'error', message: string) {
    setBanner({ tone, message });
  }

  function describeError(err: unknown): string {
    if (err && typeof err === 'object' && 'errors' in err) {
      const first = (err as { errors?: { message?: string }[] }).errors?.[0];
      if (first?.message) return first.message;
    }
    return err instanceof Error ? err.message : 'Something went wrong';
  }

  async function handleSaveProfile() {
    if (!user) return;
    setBanner(null);
    setSavingProfile(true);
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() });
      showBanner('success', 'Profile updated');
    } catch (err) {
      showBanner('error', describeError(err));
    } finally {
      setSavingProfile(false);
    }
  }

  async function pickAndUploadImage() {
    if (!user) return;
    setBanner(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showBanner('error', 'Photo library permission is required to set an avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;

    setImageStatus('uploading');
    try {
      const mime = asset.mimeType ?? 'image/jpeg';
      await user.setProfileImage({ file: `data:${mime};base64,${asset.base64}` });
      await user.reload();
      showBanner('success', 'Avatar updated');
    } catch (err) {
      showBanner('error', describeError(err));
    } finally {
      setImageStatus('idle');
    }
  }

  async function removeImage() {
    if (!user) return;
    setBanner(null);
    setImageStatus('removing');
    try {
      await user.setProfileImage({ file: null });
      await user.reload();
      showBanner('success', 'Avatar removed');
    } catch (err) {
      showBanner('error', describeError(err));
    } finally {
      setImageStatus('idle');
    }
  }

  function confirmRemoveImage() {
    Alert.alert('Remove avatar', 'Are you sure you want to remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void removeImage() },
    ]);
  }

  function handleAvatarPress() {
    if (imageStatus !== 'idle') return;
    // No image yet → go straight to the picker.
    if (!user?.hasImage) {
      void pickAndUploadImage();
      return;
    }
    // Existing image → offer change / remove.
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Change photo', 'Remove photo', 'Cancel'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) void pickAndUploadImage();
          else if (index === 1) confirmRemoveImage();
        },
      );
      return;
    }
    Alert.alert('Profile photo', undefined, [
      { text: 'Change photo', onPress: () => void pickAndUploadImage() },
      { text: 'Remove photo', style: 'destructive', onPress: confirmRemoveImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleChangePassword() {
    if (!user) return;
    setBanner(null);
    if (newPassword.length < 8) {
      showBanner('error', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showBanner('error', 'New passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await user.updatePassword({
        currentPassword: user.passwordEnabled ? currentPassword : undefined,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showBanner('success', 'Password updated');
    } catch (err) {
      showBanner('error', describeError(err));
    } finally {
      setSavingPassword(false);
    }
  }

  if (!isLoaded || !user) {
    return null;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm, borderBottomColor: colors.border }]}>
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

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Pressable
            onPress={handleAvatarPress}
            disabled={imageStatus !== 'idle'}
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
                <Text style={[Typography.title, { color: colors.primary }]}>
                  {getInitials(displayName, email)}
                </Text>
              </View>
            )}
            <View style={[styles.avatarBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              <Feather name={user.hasImage ? 'edit-2' : 'camera'} size={13} color={colors.onPrimary} />
            </View>
          </Pressable>
          <Text style={[Typography.caption, { color: colors.textMuted }]}>
            {imageStatus === 'uploading'
              ? 'Uploading…'
              : imageStatus === 'removing'
                ? 'Removing…'
                : user.hasImage
                  ? 'Tap to change or remove'
                  : 'Tap to add a photo'}
          </Text>
          {user.hasImage && imageStatus === 'idle' ? (
            <Button title="Remove photo" variant="ghost" size="sm" onPress={confirmRemoveImage} />
          ) : null}
        </View>

        {/* Identity */}
        <Card style={styles.card}>
          <TextField
            label="First name"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Jane"
            leftIcon="user"
            autoCapitalize="words"
          />
          <TextField
            label="Last name"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Doe"
            leftIcon="user"
            autoCapitalize="words"
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
            onPress={handleSaveProfile}
            loading={savingProfile}
            disabled={!profileDirty}
            fullWidth
          />
        </Card>

        {/* Password */}
        <Text style={[styles.sectionLabel, Typography.label, { color: colors.textMuted }]}>Password</Text>
        <Card style={styles.card}>
          {user.passwordEnabled ? (
            <TextField
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showPasswords}
              leftIcon="lock"
              placeholder="••••••••"
              autoCapitalize="none"
            />
          ) : null}
          <TextField
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPasswords}
            leftIcon="lock"
            rightIcon={showPasswords ? 'eye-off' : 'eye'}
            onRightIconPress={() => setShowPasswords((v) => !v)}
            placeholder="At least 8 characters"
            autoCapitalize="none"
          />
          <TextField
            label="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPasswords}
            leftIcon="lock"
            placeholder="Re-enter new password"
            autoCapitalize="none"
            error={confirmPassword.length > 0 && confirmPassword !== newPassword ? 'Passwords do not match' : undefined}
          />
          <Button
            title="Update password"
            variant="secondary"
            onPress={handleChangePassword}
            loading={savingPassword}
            disabled={newPassword.length === 0}
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSpacer: { width: 40 },
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
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { marginBottom: Spacing.md },
  sectionLabel: { marginTop: Spacing.sm, marginBottom: Spacing.sm },
  footer: { textAlign: 'center', marginTop: Spacing.md },
});
