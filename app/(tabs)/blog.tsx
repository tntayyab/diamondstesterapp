import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { AdBanner } from "@/components/AdBanner";
import { FilterDropdown } from "@/components/FilterDropdown";
import { HamburgerButton } from "@/components/HamburgerButton";
import { Card, EmptyState, Screen, ThemedText } from "@/components/ui";
import { fetchBlogPosts, type BlogPost } from "@/lib/blog";
import { timeAgo } from "@/lib/format";
import { brandGradient, fontSize, radius, spacing, useTheme } from "@/theme";

/** Distinct, non-empty values of a field across posts, prefixed with an "All …" default. */
function optionsFor(posts: BlogPost[], field: "category" | "difficulty" | "topic_focus", allLabel: string): string[] {
  const seen = new Set<string>();
  for (const p of posts) {
    const value = p[field];
    if (value && value.trim()) seen.add(value.trim());
  }
  return [allLabel, ...Array.from(seen).sort()];
}

export default function BlogScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [difficulty, setDifficulty] = useState("All levels");
  const [topic, setTopic] = useState("All topics");

  const categoryOptions = useMemo(() => optionsFor(posts, "category", "All categories"), [posts]);
  const difficultyOptions = useMemo(() => optionsFor(posts, "difficulty", "All levels"), [posts]);
  const topicOptions = useMemo(() => optionsFor(posts, "topic_focus", "All topics"), [posts]);

  const load = useCallback(async () => {
    setPosts(await fetchBlogPosts());
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Mirrors the website's BlogExplorer: dropdowns are exact-match on a single
  // field each; the search box matches title / excerpt / tags (substring).
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return posts.filter((p) => {
      if (category !== categoryOptions[0] && p.category !== category) return false;
      if (difficulty !== difficultyOptions[0] && p.difficulty !== difficulty) return false;
      if (topic !== topicOptions[0] && p.topic_focus !== topic) return false;
      if (!needle) return true;
      return (
        p.title.toLowerCase().includes(needle) ||
        (p.excerpt ?? "").toLowerCase().includes(needle) ||
        (p.tags ?? []).some((t) => t.toLowerCase().includes(needle))
      );
    });
  }, [posts, query, category, difficulty, topic, categoryOptions, difficultyOptions, topicOptions]);

  const featured = visible.find((p) => p.featured) ?? visible[0];
  const rest = visible.filter((p) => p.slug !== featured?.slug);

  const header = (
    <View>
      <View style={styles.titleRow}>
        <HamburgerButton />
        <View style={{ flex: 1 }}>
          <ThemedText variant="title">Guides & buying tips</ThemedText>
          <ThemedText variant="caption" muted style={{ marginTop: 2 }}>
            Fresh from diamondstester.com
          </ThemedText>
        </View>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Feather name="search" size={16} color={colors.textFaint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search articles"
          placeholderTextColor={colors.textFaint}
          autoCorrect={false}
          style={[styles.searchInput, { color: colors.text }]}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <Feather name="x" size={15} color={colors.textFaint} />
          </Pressable>
        ) : null}
      </View>

      {/* Category / difficulty / topic filters — same options the website derives */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        keyboardShouldPersistTaps="handled"
      >
        <FilterDropdown label="Category" value={category} options={categoryOptions} onChange={setCategory} />
        <FilterDropdown label="Level" value={difficulty} options={difficultyOptions} onChange={setDifficulty} />
        <FilterDropdown label="Topic" value={topic} options={topicOptions} onChange={setTopic} />
      </ScrollView>

      <ThemedText variant="caption" muted style={{ marginTop: spacing.md }}>
        Showing {visible.length} of {posts.length} {posts.length === 1 ? "article" : "articles"}
      </ThemedText>

      {/* Featured */}
      {featured ? (
        <Pressable onPress={() => router.push(`/blog-post/${featured.slug}`)} style={{ marginTop: spacing.lg }}>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <BlogCover post={featured} height={190} />
            <View style={{ padding: spacing.lg }}>
              {featured.category ? (
                <ThemedText variant="label" color={colors.tint}>
                  Featured · {featured.category}
                </ThemedText>
              ) : null}
              <ThemedText variant="heading" style={{ marginTop: spacing.sm }}>
                {featured.title}
              </ThemedText>
              {featured.excerpt ? (
                <ThemedText variant="caption" muted numberOfLines={2} style={{ marginTop: 6 }}>
                  {featured.excerpt}
                </ThemedText>
              ) : null}
            </View>
          </Card>
        </Pressable>
      ) : null}

      {rest.length ? (
        <ThemedText variant="label" muted style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
          {rest.length} more {rest.length === 1 ? "article" : "articles"}
        </ThemedText>
      ) : null}
    </View>
  );

  return (
    <Screen edges={["top"]}>
      <FlatList
        style={{ flex: 1 }}
        data={rest}
        keyExtractor={(post) => post.slug}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <Card
            onPress={() => router.push(`/blog-post/${item.slug}`)}
            style={{ marginBottom: spacing.md, padding: 0, overflow: "hidden" }}
          >
            <BlogCover post={item} height={150} />
            <View style={{ padding: spacing.lg }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                {item.category ? (
                  <ThemedText variant="label" color={colors.tint}>
                    {item.category}
                  </ThemedText>
                ) : null}
                {item.read_minutes ? (
                  <ThemedText variant="caption" muted style={{ fontSize: 12 }}>
                    · {item.read_minutes} min read
                  </ThemedText>
                ) : null}
              </View>
              <ThemedText variant="heading" style={{ marginTop: spacing.sm, fontSize: 17 }}>
                {item.title}
              </ThemedText>
              {item.excerpt ? (
                <ThemedText variant="caption" muted numberOfLines={2} style={{ marginTop: 4 }}>
                  {item.excerpt}
                </ThemedText>
              ) : null}
              {item.published_at ? (
                <ThemedText variant="caption" muted style={{ fontSize: 11, marginTop: 6 }}>
                  {timeAgo(item.published_at)}
                </ThemedText>
              ) : null}
            </View>
          </Card>
        )}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState icon="book-open" title="No articles yet" body="New guides published on the website appear here." />
          )
        }
      />
      <AdBanner />
    </Screen>
  );
}

/** Cover photo, or a branded gradient block with the title initial. */
function BlogCover({ post, height }: { post: BlogPost; height: number }) {
  if (post.cover_image) {
    return <Image source={{ uri: post.cover_image }} style={{ width: "100%", height }} contentFit="cover" transition={150} />;
  }
  return (
    <LinearGradient colors={[...brandGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: "100%", height, alignItems: "center", justifyContent: "center" }}>
      <Feather name="book-open" size={30} color="rgba(255,255,255,0.9)" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: fontSize.base },
  filterRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, paddingRight: spacing.lg },
});
