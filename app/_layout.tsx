import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppAlertHost } from "@/components/AppAlert";
import { AuthForm } from "@/components/AuthForm";
import { CreditGateProvider } from "@/components/CreditGate";
import { InAppUpdater } from "@/components/InAppUpdater";
import { InterstitialTimer } from "@/components/InterstitialTimer";
import { RecoveryGate } from "@/components/RecoveryGate";
import { Onboarding } from "@/components/Onboarding";
import { SplashAnimation } from "@/components/SplashAnimation";
import { refreshAdFree } from "@/lib/adFree";
import { initAds } from "@/lib/ads";
import { AuthProvider, useAuth } from "@/lib/auth";
import { initPurchases } from "@/lib/purchases";
import { hasOnboarded, setOnboarded } from "@/lib/storage";
import { ThemeProvider, useTheme } from "@/theme";

/**
 * The app requires an account. Until the user signs in, the whole app is
 * replaced by the sign-in form — nothing is shown behind it. When Supabase is
 * not configured at all (`offline`), we let people through so the app is still
 * usable in a keyless local build.
 */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, offline } = useAuth();
  const { colors } = useTheme();

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  if (!user && !offline) return <AuthForm blocking onSuccess={() => {}} />;
  return <>{children}</>;
}

/** The animated splash intro, shown once per app launch over everything else. */
function SplashGate({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState(false);
  return (
    <>
      {children}
      {done ? null : <SplashAnimation onDone={() => setDone(true)} />}
    </>
  );
}

/**
 * Shows the first-launch carousel until it has been completed once, then the
 * app. `null` while we read the flag keeps the native splash up (no flash of
 * the app behind the onboarding).
 */
function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState<boolean | null>(null);

  useEffect(() => {
    void hasOnboarded().then(setDone);
  }, []);

  if (done === null) return <View style={{ flex: 1, backgroundColor: "#0B0A0F" }} />;

  if (!done) {
    return (
      <Onboarding
        onDone={() => {
          void setOnboarded();
          setDone(true);
        }}
      />
    );
  }

  return <>{children}</>;
}

/** Wires RevenueCat to the Supabase user id once auth settles, and boots AdMob. */
function PurchasesBridge() {
  const { user, loading } = useAuth();

  // Initialise the AdMob SDK once — independent of auth state.
  useEffect(() => {
    void initAds();
  }, []);

  useEffect(() => {
    if (loading) return;
    // Wire RevenueCat to this user, then read the Ad-Free entitlement so ads are
    // suppressed immediately on launch for an existing subscriber.
    void initPurchases(user?.id ?? null).then(() => refreshAdFree());
  }, [user, loading]);

  return null;
}

function RootStack() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "700" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
        <Stack.Screen name="result/[id]" options={{ title: "Scan result" }} />
        <Stack.Screen name="species/[slug]" options={{ title: "" }} />
        <Stack.Screen name="guides/index" options={{ title: "" }} />
        <Stack.Screen name="guides/[slug]" options={{ title: "" }} />
        <Stack.Screen name="post/create" options={{ title: "Create post", presentation: "modal" }} />
        <Stack.Screen name="post/[id]" options={{ title: "Post" }} />
        <Stack.Screen name="user/[id]" options={{ title: "Profile" }} />
        <Stack.Screen name="my-posts" options={{ title: "My posts" }} />
        <Stack.Screen name="chat" options={{ title: "Ask the Gemologist" }} />
        <Stack.Screen name="blog-post/[slug]" options={{ title: "" }} />
        <Stack.Screen name="journal" options={{ title: "Field journal" }} />
        <Stack.Screen name="edit-profile" options={{ title: "Edit profile", presentation: "modal" }} />
        <Stack.Screen name="paywall" options={{ title: "Upgrade", presentation: "modal" }} />
        <Stack.Screen name="sign-in" options={{ title: "Sign in", presentation: "modal" }} />
        <Stack.Screen name="compare" options={{ title: "Compare diamonds" }} />
        <Stack.Screen name="quiz" options={{ title: "Diamond quiz" }} />
        <Stack.Screen name="photo-quiz" options={{ title: "Spot the diamond" }} />
        <Stack.Screen name="quiz-history" options={{ title: "Quiz leaderboard" }} />
        <Stack.Screen name="first-aid" options={{ title: "Think you bought a fake?" }} />
        <Stack.Screen name="anatomy" options={{ title: "Anatomy of a diamond" }} />
        <Stack.Screen name="webs" options={{ title: "Common scams" }} />
        <Stack.Screen name="uv-test" options={{ title: "UV fluorescence test" }} />
        <Stack.Screen name="calculator" options={{ title: "Value estimator" }} />
        <Stack.Screen name="history" options={{ title: "Scan history" }} />
        <Stack.Screen name="saved" options={{ title: "Saved" }} />
        <Stack.Screen name="achievements" options={{ title: "Achievements" }} />
        <Stack.Screen name="search" options={{ title: "Search" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="about" options={{ title: "About" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <PurchasesBridge />
            <InAppUpdater />
            <CreditGateProvider>
              <SplashGate>
                <OnboardingGate>
                  <RequireAuth>
                    <RootStack />
                    <InterstitialTimer />
                  </RequireAuth>
                </OnboardingGate>
              </SplashGate>
            </CreditGateProvider>
            <RecoveryGate />
            <AppAlertHost />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
