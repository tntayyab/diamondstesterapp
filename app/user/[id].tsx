import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";

import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { Button, EmptyState, Screen, ThemedText } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { communityAvailable, fetchFeed, followCounts, isFollowing, toggleFollow, type FeedPost } from "@/lib/community";
import { tap } from "@/lib/feedback";
import { fetchProfile, type Profile } from "@/lib/supabase";
import { spacing, useTheme } from "@/theme";

/** Another user's public profile — avatar, follower/following counts, their posts and a Follow toggle. */
export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const mine = user?.id === id;

  const load = useCallback(async () => {
    if (!communityAvailable()) {
      setLoading(false);
      return;
    }
    const [fetchedProfile, fetchedCounts, fetchedPosts] = await Promise.all([
      fetchProfile(id),
      followCounts(id),
      fetchFeed({ authorId: id, viewerId: user?.id ?? null }),
    ]);
    setProfile(fetchedProfile);
    setCounts(fetchedCounts);
    setPosts(fetchedPosts);
    if (user && !mine) {
      setFollowing(await isFollowing(user.id, id));
    }
    setLoading(false);
  }, [id, user, mine]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const follow = useCallback(async () => {
    if (!user) {
      router.push("/sign-in");
      return;
    }
    tap();
    const next = !following;
    setFollowing(next);
    setCounts((c) => ({ ...c, followers: c.followers + (next ? 1 : -1) }));
    setFollowBusy(true);
    try {
      await toggleFollow(user.id, id, following);
    } catch {
      setFollowing(following);
      setCounts((c) => ({ ...c, followers: c.followers + (next ? -1 : 1) }));
    } finally {
      setFollowBusy(false);
    }
  }, [user, following, id, router]);

  if (loading) return <Screen />;

  if (!communityAvailable() || !profile) {
    return (
      <Screen scroll>
        <EmptyState
          icon="user-x"
          title="Profile not found"
          body="This account may no longer exist, or the community is currently offline."
        />
      </Screen>
    );
  }

  const header = (
    <View>
      <View style={styles.header}>
        <Avatar name={profile.full_name} uri={profile.avatar_url} size={72} />
        <ThemedText variant="heading" style={{ marginTop: spacing.md, fontSize: 19 }}>
          {profile.full_name || "Gem hunter"}
        </ThemedText>

        <View style={styles.statsRow}>
          <Stat label="Posts" value={posts.length} />
          <View style={[styles.vline, { backgroundColor: colors.border }]} />
          <Stat label="Followers" value={counts.followers} />
          <View style={[styles.vline, { backgroundColor: colors.border }]} />
          <Stat label="Following" value={counts.following} />
        </View>

        {!mine ? (
          <Button
            label={following ? "Following" : "Follow"}
            icon={following ? "user-check" : "user-plus"}
            variant={following ? "secondary" : "primary"}
            loading={followBusy}
            onPress={follow}
            style={{ marginTop: spacing.lg, alignSelf: "stretch" }}
          />
        ) : null}
      </View>

      <ThemedText variant="label" muted style={styles.postsLabel}>
        Posts
      </ThemedText>
    </View>
  );

  return (
    <Screen edges={["bottom"]}>
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon="camera" title="No posts yet" body="Nothing shared with the community so far." />
        }
      />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
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

const styles = StyleSheet.create({
  header: { alignItems: "center", paddingVertical: spacing.lg },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  vline: { width: StyleSheet.hairlineWidth, height: 30 },
  postsLabel: { marginTop: spacing.md, marginBottom: spacing.sm },
});
