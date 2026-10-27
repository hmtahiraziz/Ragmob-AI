import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** Longest edge after resize — enough for avatars, small upload. */
export const AVATAR_MAX_EDGE = 512;

/** Reject after JPEG encode if larger than this (bytes of raw binary). */
export const AVATAR_MAX_BYTES = 900_000;

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export type PreparedAvatar = {
  dataUrl: string;
  mime: 'image/jpeg';
  byteLength: number;
};

/**
 * Opens the system photo picker (no broad media-library permission on modern OS)
 * then resizes and re-encodes as JPEG — which strips EXIF metadata.
 */
export async function pickAndPrepareAvatar(): Promise<PreparedAvatar | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
    exif: false,
    // Prefer the OS photo picker path; do not request READ_MEDIA_* upfront.
  });

  const asset = result.assets?.[0];
  if (result.canceled || !asset?.uri) return null;

  if (asset.mimeType && !ALLOWED_MIME.has(asset.mimeType.toLowerCase())) {
    throw new Error('Please choose a JPEG, PNG, or WebP image.');
  }

  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: AVATAR_MAX_EDGE } }],
    {
      compress: 0.72,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );

  if (!manipulated.base64) {
    throw new Error('Could not process that photo. Try another image.');
  }

  const byteLength = Math.ceil((manipulated.base64.length * 3) / 4);
  if (byteLength > AVATAR_MAX_BYTES) {
    throw new Error('Photo is too large after compression. Try a smaller image.');
  }

  return {
    dataUrl: `data:image/jpeg;base64,${manipulated.base64}`,
    mime: 'image/jpeg',
    byteLength,
  };
}
