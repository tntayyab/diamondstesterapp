import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { showAlert } from "@/components/AppAlert";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { Button, Card, ThemedText } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { success, tap } from "@/lib/feedback";
import { isReturningUser, markReturningUser } from "@/lib/storage";
import { fontSize, radius, spacing, useTheme } from "@/theme";

const APP_ICON = require("../../assets/icon.png");

/** Google's four-colour "G", inline so nothing is fetched at runtime. */
function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <Path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <Path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
      <Path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </Svg>
  );
}

/**
 * The shared sign-in / sign-up form. Used both as the pushable /sign-in route
 * and as the full-screen blocker in RequireAuth. `blocking` hides the guest
 * note (there is no guest mode when the whole app is gated) and the back arrow.
 */
export function AuthForm({ blocking = false, onSuccess }: { blocking?: boolean; onSuccess: () => void }) {
  const { colors } = useTheme();
  const { signIn, signUp, signInWithGoogle, resetPassword, offline } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  // First launch shows "Welcome"; once you've signed in once, "Welcome back".
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    void isReturningUser().then(setReturning);
  }, []);

  const showGoogleSetup = useCallback(() => {
    const redirectUri = Linking.createURL("/auth-callback");
    showAlert(
      "Google sign-in setup",
      `Add BOTH of these to Supabase → Authentication → URL Configuration → Redirect URLs, then Save:\n\n` +
        `1)  exp://**\n\n2)  ${redirectUri}\n\n` +
        `The second line is this exact phone's address — it changes if your Wi-Fi changes, which is why the exp://** wildcard matters.`,
      [{ text: "OK" }],
    );
  }, []);

  const forgotPassword = useCallback(async () => {
    tap();
    const target = email.trim();
    if (!target || !/\S+@\S+\.\S+/.test(target)) {
      showAlert("Enter your email", "Type your account's email address above, then tap “Forgot password?” again.");
      return;
    }
    const error = await resetPassword(target);
    if (error) {
      showAlert("Could not send reset link", error);
      return;
    }
    showAlert(
      "Check your email",
      `We've emailed a password reset link to ${target}. Open it on this phone and you'll be asked to set a new password.`,
      [{ text: "OK" }],
      { mood: "happy" },
    );
  }, [email, resetPassword]);

  const handleGoogle = useCallback(async () => {
    tap();
    setGoogleBusy(true);
    const result = await signInWithGoogle();
    setGoogleBusy(false);
    if (result.status === "cancelled") return;
    if (result.status === "error") {
      showAlert("Google sign-in failed", result.message);
      return;
    }
    success();
    void markReturningUser();
    onSuccess();
  }, [signInWithGoogle, onSuccess]);

  const submit = useCallback(async () => {
    if (!email.trim() || password.length < 6) {
      showAlert("Check your details", "Enter a valid email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);

    if (mode === "signin") {
      const error = await signIn(email.trim(), password);
      setBusy(false);
      if (error) {
        if (/invalid login credentials/i.test(error)) {
          showAlert("Wrong email or password", "No account matched those details. If you have not registered yet, tap “No account? Create one” below.");
        } else if (/email not confirmed/i.test(error)) {
          showAlert("Confirm your email first", "We sent a confirmation link when you signed up. Open it, then sign in.");
        } else {
          showAlert("Could not sign in", error);
        }
        return;
      }
      success();
      void markReturningUser();
      onSuccess();
      return;
    }

    const result = await signUp(email.trim(), password);
    setBusy(false);
    if (result.status === "error") {
      showAlert("Could not sign up", result.message);
      return;
    }
    success();
    if (result.status === "needs-confirmation") {
      showAlert("Almost there", "Check your inbox for a confirmation link, then come back and sign in.");
      setMode("signin");
      return;
    }
    void markReturningUser();
    onSuccess();
  }, [mode, email, password, signIn, signUp, onSuccess]);

  return (
    <SafeAreaView edges={blocking ? ["top", "bottom"] : ["bottom"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", marginTop: spacing.md, marginBottom: spacing.sm }}>
            <Image source={APP_ICON} style={{ width: 66, height: 66, borderRadius: 17 }} contentFit="cover" />
            <ThemedText variant="title" style={{ marginTop: spacing.lg, textAlign: "center" }}>
              {mode === "signin" ? (returning ? "Welcome back" : "Welcome") : "Create your account"}
            </ThemedText>
            <ThemedText variant="caption" muted style={{ marginTop: spacing.sm, textAlign: "center" }}>
              {mode === "signin"
                ? "Sign in to scan gemstones, save your finds and join the community."
                : "New accounts start with 30 free credits — about three identifications."}
            </ThemedText>
          </View>

          {offline ? (
            <Card style={{ marginTop: spacing.lg }}>
              <ThemedText variant="caption" muted>
                Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env
                file, then restart with `npx expo start --clear`.
              </ThemedText>
            </Card>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={offline || googleBusy}
            onPress={handleGoogle}
            style={({ pressed }) => [
              styles.google,
              { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: offline ? 0.45 : pressed ? 0.85 : 1 },
            ]}
          >
            {googleBusy ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <>
                <GoogleMark />
                <ThemedText variant="body" style={{ fontWeight: "700" }}>
                  Continue with Google
                </ThemedText>
              </>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <ThemedText variant="caption" muted style={{ fontSize: 12 }}>
              or use email
            </ThemedText>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <View style={{ gap: spacing.md }}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
            />
            <View
              style={[
                styles.input,
                styles.passwordRow,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={colors.textFaint}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                textContentType={mode === "signin" ? "password" : "newPassword"}
                style={{ flex: 1, color: colors.text, fontSize: fontSize.base, paddingVertical: 14 }}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={12}
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                style={{ paddingLeft: spacing.sm }}
              >
                <Feather name={showPassword ? "eye-off" : "eye"} size={19} color={colors.textMuted} />
              </Pressable>
            </View>

            {mode === "signin" ? (
              <Pressable onPress={forgotPassword} style={{ alignSelf: "flex-end", paddingVertical: 2 }} hitSlop={8}>
                <ThemedText variant="caption" color={colors.tint} style={{ fontWeight: "700" }}>
                  Forgot password?
                </ThemedText>
              </Pressable>
            ) : null}

            <Button label={mode === "signin" ? "Sign in" : "Create account"} onPress={submit} loading={busy} disabled={offline} />
            <Pressable onPress={() => setMode(mode === "signin" ? "signup" : "signin")} style={{ paddingVertical: spacing.md }}>
              <ThemedText variant="caption" color={colors.tint} style={{ textAlign: "center" }}>
                {mode === "signin" ? "No account? Create one" : "Already have an account? Sign in"}
              </ThemedText>
            </Pressable>
          </View>

          <View style={{ flex: 1, minHeight: spacing.xl }} />

          <Pressable onPress={showGoogleSetup} style={{ paddingVertical: spacing.sm }}>
            <ThemedText variant="caption" muted style={{ textAlign: "center", fontSize: 11 }}>
              Google sign-in setup info
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: fontSize.base,
  },
  passwordRow: { flexDirection: "row", alignItems: "center", paddingVertical: 0 },
  google: {
    marginTop: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: 15,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginVertical: spacing.xl },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
});
