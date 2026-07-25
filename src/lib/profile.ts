import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { supabase } from "@/lib/supabase";

/**
 * Uploads a square-ish avatar to community/<uid>/avatar-<uuid>.jpg (the bucket
 * policy allows a signed-in user to write under their own uid folder) and
 * returns the public URL.
 */
export async function uploadAvatar(userId: string, uri: string): Promise<string | null> {
  if (!supabase) return null;

  const image = await ImageManipulator.manipulate(uri).resize({ width: 400, height: 400 }).renderAsync();
  const saved = await image.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
  const bytes = await new File(saved.uri).bytes();

  const path = `${userId}/avatar-${Crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from("community")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(error.message);

  return supabase.storage.from("community").getPublicUrl(path).data.publicUrl;
}

/** Save display name and/or avatar URL to the shared profiles row. */
export async function updateProfile(
  userId: string,
  fields: { full_name?: string; avatar_url?: string },
): Promise<void> {
  if (!supabase) return;
  const patch: Record<string, string> = {};
  if (fields.full_name !== undefined) patch.full_name = fields.full_name.trim();
  if (fields.avatar_url !== undefined) patch.avatar_url = fields.avatar_url;
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw new Error(error.message);
}
