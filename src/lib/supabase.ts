import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/config/env";

/**
 * `null` when Supabase is not configured. Every caller must handle that — the
 * app is designed to run fully offline with bundled content.
 */
export const supabase: SupabaseClient | null = env.supabase.configured
  ? createClient(env.supabase.url, env.supabase.anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // There is no URL to parse in a native app; leaving this on makes
        // supabase-js touch `window.location`, which does not exist here.
        detectSessionInUrl: false,
        // PKCE keeps the OAuth code exchange safe on a device where the
        // redirect URL can be observed by other apps. The code verifier is
        // held in AsyncStorage and never leaves the phone.
        flowType: "pkce",
      },
    })
  : null;

/** Mirrors public.profiles from the website's supabase/saas-schema.sql. */
export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  country: string | null;
  credits: number;
  total_identifications: number;
  plan: "free" | "starter" | "explorer" | "pro";
  referral_code: string | null;
  created_at: string;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return (data as Profile) ?? null;
}

/** Persist a completed scan to the shared `analyses` table (best-effort). */
export async function syncAnalysis(
  userId: string,
  result: unknown,
  creditsUsed: number,
  imageUrls: string[] = [],
): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("analyses").insert({
      user_id: userId,
      result,
      credits_used: creditsUsed,
      image_urls: imageUrls,
    });
  } catch {
    // Offline or RLS refused — the local history record is still authoritative.
  }
}
