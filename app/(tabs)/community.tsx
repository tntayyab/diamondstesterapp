import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { AdBanner } from "@/components/AdBanner";
import { HamburgerButton } from "@/components/HamburgerButton";
import { PostCard } from "@/components/PostCard";
import { Button, EmptyState, Screen, ThemedText } from "@/components/ui";
import { speciesLibrary } from "@/content/species";
import { speciesImage } from "@/content/speciesImages";
import { useAuth } from "@/lib/auth";
import { communityAvailable, fetchFeed, type FeedPost } from "@/lib/community";
import { tap } from "@/lib/feedback";
import { brand, brandGradient, radius, spacing, useTheme } from "@/theme";

// "All" plus every species that has a photo, for the category strip.
const CATEGORIES = [
  { slug: null as string | null, name: "All", image: null as number | null },
  ...speciesLibrary
    .filter((s) => speciesImage(s.slug))
    .map((s) => ({ slug: s.slug, name: s.commonName, image: speciesImage(s.slug) as number })),
];

export default function CommunityScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();

  const [category, setCategory] = useState<string | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!communityAvailable()) {
      setLoading(false);
      return;
    }
    const data = await fetchFeed({ speciesSlug: category, viewerId: user?.id ?? null });
    setPosts(data);
    setLoading(false);
  }, [category, user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const createPost = () => {
    tap();
    router.push(user ? "/post/create" : "/sign-in");
  };

  const strip = (
    <View>
      <View style={styles.titleRow}>
        <HamburgerButton />
        <View style={{ flex: 1 }}>
          <ThemedText variant="title">Community</ThemedText>
          <ThemedText variant="caption" muted style={{ marginTop: 2 }}>
            Finds shared by gemstone testers everywhere
          </ThemedText>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {CATEGORIES.map((cat) => {
          const active = cat.slug === category;
          return (
            <Pressable
              key={cat.slug ?? "all"}
              onPress={() => {
                tap();
                setCategory(cat.slug);
              }}
              style={styles.catItem}
            >
              <View style={[styles.catRing, { borderColor: active ? brand.indigo : colors.cardBorder }]}>
                {cat.image ? (
                  <Image source={cat.image} style={styles.catImage} contentFit="cover" />
                ) : (
                  <LinearGradient colors={[...brandGradient]} style={[styles.catImage, styles.catAll]}>
                    <Feather name="grid" size={20} color="#fff" />
                  </LinearGradient>
                )}
              </View>
              <ThemedText
                variant="caption"
                numberOfLines={1}
                muted={!active}
                color={active ? colors.tint : undefined}
                style={{ fontSize: 11, maxWidth: 64, textAlign: "center", fontWeight: active ? "700" : "400" }}
              >
                {cat.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  // Supabase not configured at all.
  if (!communityAvailable()) {
    return (
      <Screen scroll>
        {strip}
        <EmptyState
          icon="wifi-off"
          title="Community is offline"
          body="Add your Supabase keys to the .env file to enable the community feed."
        />
      </Screen>
    );
  }

  // Interleave a banner ad after every 2 posts in the feed.
  const rows = useMemo<Array<{ kind: "post"; post: FeedPost } | { kind: "ad"; id: string }>>(() => {
    const out: Array<{ kind: "post"; post: FeedPost } | { kind: "ad"; id: string }> = [];
    posts.forEach((post, i) => {
      out.push({ kind: "post", post });
      if ((i + 1) % 2 === 0) out.push({ kind: "ad", id: `ad-${post.id}` });
    });
    return out;
  }, [posts]);

  return (
    <Screen edges={["top"]}>
      <FlatList
        data={rows}
        keyExtractor={(row) => (row.kind === "post" ? row.post.id : row.id)}
        ListHeaderComponent={strip}
        renderItem={({ item }) =>
          item.kind === "ad" ? (
            <View style={{ marginBottom: spacing.lg }}>
              <AdBanner />
            </View>
          ) : (
            <PostCard post={item.post} />
          )
        }
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="camera"
              title={category ? "No posts in this category yet" : "Be the first to post"}
              body="Share a stone you've tested — add a photo, a caption and what you found."
              action={<Button label="Create a post" icon="plus" onPress={createPost} />}
            />
          )
        }
      />

      {/* Floating create button */}
      <Pressable onPress={createPost} style={styles.fab}>
        <LinearGradient colors={[...brandGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabInner}>
          <Feather name="edit-3" size={22} color="#fff" />
        </LinearGradient>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  strip: { gap: spacing.md, paddingVertical: spacing.sm, paddingRight: spacing.lg },
  catItem: { alignItems: "center", gap: 5, width: 68 },
  catRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  catImage: { width: "100%", height: "100%", borderRadius: 28 },
  catAll: { alignItems: "center", justifyContent: "center" },
  fab: { position: "absolute", right: spacing.lg, bottom: spacing.lg },
  fabInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
