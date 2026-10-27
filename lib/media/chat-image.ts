import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import type { PreparedChatImage } from '@/types/chat';

/** Longest edge after resize — enough for vision, under typical upload caps. */
export const CHAT_IMAGE_MAX_EDGE = 1600;

/** Reject after JPEG encode if larger than this (keep under server 8 MB). */
export const CHAT_IMAGE_MAX_BYTES = 7_000_000;

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

async function prepareFromAsset(
  uri: string,
  mimeType: string | undefined | null,
): Promise<PreparedChatImage> {
  if (mimeType && !ALLOWED_MIME.has(mimeType.toLowerCase())) {
    throw new Error('Please choose a JPEG, PNG, or WebP image.');
  }

  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: CHAT_IMAGE_MAX_EDGE } }],
    {
      compress: 0.78,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  if (!manipulated.uri) {
    throw new Error('Could not process that photo. Try another image.');
  }

  // Approximate size from dimensions when FileSystem isn't available in Expo Go paths.
  // Prefer a HEAD-less check via fetch blob size when possible.
  let byteLength = 0;
  try {
    const response = await fetch(manipulated.uri);
    const blob = await response.blob();
    byteLength = blob.size;
  } catch {
    // Fallback estimate — vision models tolerate overestimate for UI gating.
    byteLength = Math.ceil(
      ((manipulated.width || CHAT_IMAGE_MAX_EDGE) *
        (manipulated.height || CHAT_IMAGE_MAX_EDGE) *
        0.35),
    );
  }

  if (byteLength > CHAT_IMAGE_MAX_BYTES) {
    throw new Error('Photo is too large after compression. Try a smaller image.');
  }

  return {
    uri: manipulated.uri,
    mime: 'image/jpeg',
    width: manipulated.width,
    height: manipulated.height,
    byteLength,
  };
}

/**
 * Opens the system photo picker (no broad media-library permission on modern OS),
 * then resizes and re-encodes as JPEG (strips EXIF).
 */
export async function pickChatImageFromLibrary(): Promise<PreparedChatImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
    exif: false,
  });

  const asset = result.assets?.[0];
  if (result.canceled || !asset?.uri) return null;

  return prepareFromAsset(asset.uri, asset.mimeType);
}

/**
 * Requests camera permission when needed, captures a photo, then prepares it
 * the same way as a library pick.
 */
export async function captureChatImageFromCamera(): Promise<PreparedChatImage | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      'Camera access is required to take a photo. Enable it in system settings.',
    );
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
    exif: false,
  });

  const asset = result.assets?.[0];
  if (result.canceled || !asset?.uri) return null;

  return prepareFromAsset(asset.uri, asset.mimeType);
}
