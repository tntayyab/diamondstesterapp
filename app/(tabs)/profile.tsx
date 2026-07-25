import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AdBanner } from "@/components/AdBanner";
import { HamburgerButton } from "@/components/HamburgerButton";
import { Button, Card, Row, Screen, SectionHeader, ThemedText } from "@/components/ui";
import { env } from "@/config/env";
import { scansRemaining, useAuth } from "@/lib/auth";
import { profileStats } from "@/lib/community";
import { signOutPurchases } from "@/lib/purchases";
import {
  getHistory,
  getQuizStats,
  getSavedSpecies,
  getSightings,
  getStreak,
  type Streak,
} from "@/lib/storage";
import { brandGradient, radius, spacing, useTheme } from "@/theme";

interface Stats {
  scans: number;
  saved: number;
  sightings: number;
  streak: Streak;
  quizBest: number;
}

interface CommunityStats {
  posts: number;
  likes: number;
  followers: number;
  following: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, profile, credits, isPro, signOut } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [community, setCommunity] = useState<CommunityStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void Promise.all([getHistory(), getSavedSpecies(), getSightings(), getStreak(), getQuizStats()]).then(
        ([history, saved, sightings, streak, quiz]) => {
          if (!active) return;
          setStats({
            scans: history.length,
            saved: saved.length,
            sightings: sightings.length,
            streak,
            quizBest: quiz.bestScore,
          });
        },
      );
      // Community counts only make sense for a signed-in account.
      if (user) {
        void profileStats(user.id).then((c) => active && setCommunity(c));
      } else {
        setCommunity(null);
      }
      return () => {
        active = false;
      };
    }, [user]),
  );

  const handleSignOut = useCallback(async () => {
    await signOutPurchases();
    await signOut();
  }, [signOut]);

  return (
    <Screen scroll>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <HamburgerButton />
        <ThemedText variant="title">Profile</ThemedText>
      </View>

      {/* Account */}
      <LinearGradient
        colors={[...brandGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.account}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatar}>
              <Feather name="user" size={22} color="#fff" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <ThemedText variant="heading" color="#fff" numberOfLines={1}>
              {profile?.full_name || user?.email || "Guest explorer"}
            </ThemedText>
            <ThemedText variant="caption" color="rgba(255,255,255,0.85)">
              {user
                ? `${(profile?.plan ?? "free").toUpperCase()} · ${credits ?? 0} credits · ${scansRemaining(credits)} scans`
                : "Sign in to sync across web and mobile"}
            </ThemedText>
          </View>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          {user ? (
            !isPro ? (
              <Button label="Upgrade plan" variant="secondary" onPress={() => router.push("/paywall")} />
            ) : null
          ) : (
            <Button label="Sign in or create account" variant="secondary" onPress={() => router.push("/sign-in")} />
          )}
        </View>
      </LinearGradient>

      {/* Personal data — only for signed-in users. A guest sees why, not a wall of zeroes. */}
      {user ? (
        <>
          {/* Community — post / like / follower / following counts */}
          <View style={styles.communityRow}>
            <CommunityStat label="Posts" value={community?.posts ?? 0} />
            <View style={[styles.vline, { backgroundColor: colors.border }]} />
            <CommunityStat label="Likes" value={community?.likes ?? 0} />
            <View style={[styles.vline, { backgroundColor: colors.border }]} />
            <CommunityStat label="Followers" value={community?.followers ?? 0} />
            <View style={[styles.vline, { backgroundColor: colors.border }]} />
            <CommunityStat label="Following" value={community?.following ?? 0} />
          </View>

          <SectionHeader title="Community" />
          <Card style={{ paddingVertical: 0 }}>
            <Row icon="user-check" label="Edit profile" onPress={() => router.push("/edit-profile")} />
            <Divider />
            <Row icon="grid" label="My posts" value={String(community?.posts ?? 0)} onPress={() => router.push("/my-posts")} />
            <Divider />
            <Row icon="edit-3" label="Create a post" onPress={() => router.push("/post/create")} />
          </Card>

          <View style={styles.statGrid}>
            <Stat label="Scans" value={stats?.scans ?? 0} />
            <Stat label="Saved" value={stats?.saved ?? 0} />
            <Stat label="Sightings" value={stats?.sightings ?? 0} />
            <Stat label="Streak" value={stats?.streak.current ?? 0} suffix="d" />
          </View>

          <SectionHeader title="Your collection" />
          <Card style={{ paddingVertical: 0 }}>
            <Row
              icon="clock"
              label="Scan history"
              value={String(stats?.scans ?? 0)}
              onPress={() => router.push("/history")}
            />
            <Divider />
            <Row
              icon="bookmark"
              label="Saved gemstones & guides"
              value={String(stats?.saved ?? 0)}
              onPress={() => router.push("/saved")}
            />
            <Divider />
            <Row
              icon="map-pin"
              label="Field journal"
              value={String(stats?.sightings ?? 0)}
              onPress={() => router.push("/journal")}
            />
            <Divider />
            <Row icon="award" label="Achievements" onPress={() => router.push("/achievements")} />
          </Card>
        </>
      ) : (
        <>
          <SectionHeader title="Your collection" />
          <Card style={{ alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl }}>
            <View style={[styles.lockCircle, { backgroundColor: colors.backgroundElevated, borderColor: colors.cardBorder }]}>
              <Feather name="lock" size={20} color={colors.textMuted} />
            </View>
            <ThemedText variant="heading" style={{ fontSize: 17, textAlign: "center" }}>
              Sign in to see your collection
            </ThemedText>
            <ThemedText variant="caption" muted style={{ textAlign: "center", maxWidth: 280 }}>
              Scan history, saved species, field sightings, streak and achievements all live behind your account —
              and follow you to diamondstester.com. Use the button above to get started.
            </ThemedText>
          </Card>
        </>
      )}

      <SectionHeader title="Learn" />
      <Card style={{ paddingVertical: 0 }}>
        <Row icon="book-open" label="Guides" onPress={() => router.push("/guides")} />
        <Divider />
        <Row icon="target" label="Anatomy of a diamond" onPress={() => router.push("/anatomy")} />
        <Divider />
        <Row icon="zap" label="UV fluorescence test" onPress={() => router.push("/uv-test")} />
        <Divider />
        <Row icon="dollar-sign" label="Value estimator" onPress={() => router.push("/calculator")} />
        <Divider />
        <Row icon="git-merge" label="Compare gemstones" onPress={() => router.push("/compare")} />
        {/* The quiz tracks a personal best, so it lives behind an account. */}
        {user ? (
          <>
            <Divider />
            <Row
              icon="help-circle"
              label="4Cs & gemstone quiz"
              value={stats?.quizBest ? `Best ${stats.quizBest}/8` : undefined}
              onPress={() => router.push("/quiz")}
            />
            <Divider />
            <Row icon="bar-chart-2" label="Quiz leaderboard" onPress={() => router.push("/quiz-history")} />
          </>
        ) : null}
      </Card>

      <SectionHeader title="Safety" />
      <Card style={{ paddingVertical: 0 }}>
        <Row icon="shield" label="Common scams" onPress={() => router.push("/webs")} />
        <Divider />
        <Row icon="alert-triangle" label="Think you bought a fake?" onPress={() => router.push("/first-aid")} destructive />
      </Card>

      <SectionHeader title="App" />
      <Card style={{ paddingVertical: 0 }}>
        <Row icon="settings" label="Settings" onPress={() => router.push("/settings")} />
        <Divider />
        <Row icon="info" label="About & legal" onPress={() => router.push("/about")} />
        {user ? (
          <>
            <Divider />
            <Row icon="log-out" label="Sign out" onPress={handleSignOut} destructive />
          </>
        ) : null}
      </Card>

      <ThemedText variant="caption" muted style={{ textAlign: "center", marginTop: spacing.xl, fontSize: 12 }}>
        {env.app.siteUrl.replace("https://", "")}
      </ThemedText>

      <AdBanner />
    </Screen>
  );
}

function Stat({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <ThemedText variant="heading" color={colors.tint}>
        {value}
        {suffix}
      </ThemedText>
      <ThemedText variant="caption" muted style={{ fontSize: 11 }}>
        {label}
      </ThemedText>
    </View>
  );
}

function CommunityStat({ label, value }: { label: string; value: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <ThemedText variant="heading" style={{ fontSize: 20 }}>
        {value}
      </ThemedText>
      <ThemedText variant="caption" muted style={{ fontSize: 11 }}>
        {label}
      </ThemedText>
    </View>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}

const styles = StyleSheet.create({
  account: { marginTop: spacing.lg, borderRadius: radius.xl, padding: spacing.xl },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  communityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  vline: { width: StyleSheet.hairlineWidth, height: 30 },
  statGrid: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  lockCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
