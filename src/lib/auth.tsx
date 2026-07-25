import type { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { env } from "@/config/env";
import { fetchProfile, supabase, type Profile } from "@/lib/supabase";

// Dismisses the in-app browser tab once the OAuth redirect lands.
WebBrowser.maybeCompleteAuthSession();

/**
 * Cancelling the Google tab is a normal outcome, not a failure — the caller
 * must be able to tell it apart from success, or it will close the sign-in
 * screen on someone who backed out.
 */
export type GoogleSignInResult =
  | { status: "success" }
  | { status: "cancelled" }
  | { status: "error"; message: string };

const googleError = (message: string): GoogleSignInResult => ({ status: "error", message });

/**
 * Sign-up outcome. With email confirmation disabled in Supabase, sign-up
 * returns a live session and the user is logged in immediately; with it
 * enabled, they must click a link in their inbox first.
 */
export type SignUpResult =
  | { status: "signed-in" }
  | { status: "needs-confirmation" }
  | { status: "error"; message: string };

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** True when Supabase auth is unavailable — the app still works as a guest. */
  offline: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  /** Opens Google in a system browser tab. Cancelling is not an error. */
  signInWithGoogle: () => Promise<GoogleSignInResult>;
  /** Emails a password-reset link. Returns an error message, or null on success. */
  resetPassword: (email: string) => Promise<string | null>;
  /** Sets a new password for the signed-in user. Returns an error message, or null. */
  updatePassword: (newPassword: string) => Promise<string | null>;
  /** True when the user opened a reset link and must choose a new password. */
  recovery: boolean;
  clearRecovery: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Credits remaining, or null when signed out. */
  credits: number | null;
  isPro: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Each OAuth/recovery code may only be exchanged ONCE. Both the Google flow and
// the deep-link handler can receive the same redirect, so we dedupe here to
// avoid the second exchange failing with "invalid flow state".
const handledAuthCodes = new Set<string>();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    setProfile(await fetchProfile(userId));
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void loadProfile(data.session?.user.id).finally(() => active && setLoading(false));
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      void loadProfile(next?.user.id);
      // The user arrived via a reset link — prompt them to set a new password.
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Handle auth deep links (password reset / email confirmation): exchange the
  // `?code=` for a session. Guarded so a normal cold start does nothing.
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const handle = async (url: string | null) => {
      if (!url || !url.includes("code=")) return;
      try {
        const code = new URL(url).searchParams.get("code");
        // Skip codes the Google flow is already handling (dedupe by code).
        if (code && !handledAuthCodes.has(code)) {
          handledAuthCodes.add(code);
          await client.auth.exchangeCodeForSession(code);
        }
      } catch {
        /* ignore malformed / already-used links */
      }
    };
    void Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener("url", (event) => void handle(event.url));
    return () => sub.remove();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return "Supabase is not configured — check your .env file.";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<SignUpResult> => {
    if (!supabase) return { status: "error", message: "Supabase is not configured — check your .env file." };

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { status: "error", message: error.message };

    // A session here means email confirmation is off — they are already in.
    return data.session ? { status: "signed-in" } : { status: "needs-confirmation" };
  }, []);

  /**
   * Google sign-in via the PKCE flow.
   *
   * We ask Supabase for the authorize URL rather than letting it navigate
   * (`skipBrowserRedirect`), open it in a system browser tab, then trade the
   * `?code=` it hands back for a session. Google itself only ever sees
   * Supabase's callback URL, never the app's.
   */
  const signInWithGoogle = useCallback(async (): Promise<GoogleSignInResult> => {
    if (!supabase) return googleError("Supabase is not configured — check your .env file.");

    // In Expo Go this is exp://<lan-ip>:8081/--/auth-callback;
    // in a standalone build it is diamondstester://auth-callback.
    const redirectTo = Linking.createURL("/auth-callback");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });

    if (error) {
      return googleError(
        /provider is not enabled/i.test(error.message)
          ? "Google sign-in is not switched on yet. Enable the Google provider in your Supabase dashboard."
          : error.message,
      );
    }
    if (!data?.url) return googleError("Could not start Google sign-in.");

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    // The user closed the tab or swiped it away.
    if (result.type !== "success") return { status: "cancelled" };

    const url = new URL(result.url);

    // PKCE hands back ?code=…; a project still on the implicit flow uses a #fragment.
    const code = url.searchParams.get("code");
    if (code) {
      // The deep-link handler may have already exchanged this code.
      if (handledAuthCodes.has(code)) return { status: "success" };
      handledAuthCodes.add(code);
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      return exchangeError ? googleError(exchangeError.message) : { status: "success" };
    }

    const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
    const accessToken = fragment.get("access_token");
    const refreshToken = fragment.get("refresh_token");
    if (accessToken && refreshToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      return sessionError ? googleError(sessionError.message) : { status: "success" };
    }

    return googleError(url.searchParams.get("error_description") ?? "Google did not return a session.");
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<string | null> => {
    if (!supabase) return "Supabase is not configured — check your .env file.";
    const redirectTo = Linking.createURL("/auth-callback");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return error?.message ?? null;
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<string | null> => {
    if (!supabase) return "Supabase is not configured — check your .env file.";
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error?.message ?? null;
  }, []);

  const clearRecovery = useCallback(() => setRecovery(false), []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user.id);
  }, [loadProfile, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      loading,
      offline: !supabase,
      signIn,
      signUp,
      signInWithGoogle,
      resetPassword,
      updatePassword,
      recovery,
      clearRecovery,
      signOut,
      refreshProfile,
      credits: profile?.credits ?? null,
      isPro: Boolean(profile && profile.plan !== "free"),
    }),
    [
      session,
      profile,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      resetPassword,
      updatePassword,
      recovery,
      clearRecovery,
      signOut,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Scans a signed-in user can still afford, given the shared credit rules. */
export function scansRemaining(credits: number | null): number {
  if (credits === null) return 0;
  return Math.floor(credits / env.app.creditsPerScan);
}
