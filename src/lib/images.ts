/**
 * Shared multi-image picking helpers for the Scan flow and Create Post flow.
 * Both let the user attach up to `MAX_IMAGES` photos: several picked at once
 * from the gallery, or several taken one-at-a-time with the camera.
 */
import * as ImagePicker from "expo-image-picker";

import { showAlert } from "@/components/AppAlert";

export const MAX_IMAGES = 6;

/** Adds `incoming` to `current`, hard-capped at `max`. Alerts once if anything had to be dropped. */
export function mergeImagesCapped(current: string[], incoming: string[], max: number = MAX_IMAGES): string[] {
  const room = max - current.length;
  const next = [...current, ...incoming.slice(0, Math.max(0, room))];
  if (incoming.length > Math.max(0, room)) {
    showAlert("Too many photos", `You can add up to ${max} photos.`);
  }
  return next.slice(0, max);
}

/** Requests camera permission, then launches the camera. Returns `null` on cancel/denial. */
export async function captureFromCamera(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    showAlert("Camera access needed", "Enable camera access in Settings to take a photo.");
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({ quality: 0.9, allowsEditing: true });
  return !result.canceled && result.assets[0] ? result.assets[0].uri : null;
}

/**
 * Launches the gallery allowing multiple selection (up to `max`). Some OS
 * versions can still return more than `selectionLimit` — the result is capped
 * defensively either way.
 */
export async function pickFromGallery(max: number = MAX_IMAGES): Promise<string[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.9,
    allowsMultipleSelection: true,
    selectionLimit: max,
  });

  if (result.canceled) return [];

  const uris = result.assets.map((asset) => asset.uri);
  if (uris.length > max) {
    showAlert("Too many photos", `You can add up to ${max} photos.`);
  }
  return uris.slice(0, max);
}
