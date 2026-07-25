import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, Share, StyleSheet, useWindowDimensions, View } from "react-native";
import Markdown from "react-native-markdown-display";

import { Avatar } from "@/components/Avatar";
import { HtmlContent } from "@/components/HtmlContent";
import { EmptyState, Screen, ThemedText } from "@/components/ui";
import { env } from "@/config/env";
import { fetchBlogPost, type BlogPost } from "@/lib/blog";
import { timeAgo } from "@/lib/format";
import { fontSize, radius, spacing, useTheme, withAlpha } from "@/theme";

/** Same default author photo the website falls back to (`default-author.webp`). */
const DEFAULT_AUTHOR = require("../../assets/authors/default-author.webp");

/** The fixed author-card blurb the website shows in its blog sidebar. */
const AUTHOR_BIO =
  "Specialist in diamond and gemstone testing. Every guide is research-checked so you can tell a genuine stone from a well-made simulant.";

export default function BlogPostScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchBlogPost(slug).then((p) => {
      setPost(p);
      setLoading(false);
    });
  }, [slug]);

  if (loading) return <Screen />;

  if (!post) {
    return (
      <Screen scroll>
        <EmptyState icon="alert-circle" title="Article not found" body="It may have been unpublished." />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      {post.cover_image ? (
        <Image source={{ uri: post.cover_image }} style={styles.hero} contentFit="cover" transition={200} />
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.lg }}>
        {post.category ? (
          <ThemedText variant="label" color={colors.tint}>
            {post.category}
          </ThemedText>
        ) : null}
        {post.read_minutes ? (
          <ThemedText variant="caption" muted style={{ fontSize: 12 }}>
            · {post.read_minutes} min read
          </ThemedText>
        ) : null}
      </View>

      <ThemedText variant="title" style={{ marginTop: spacing.sm }}>
        {post.title}
      </ThemedText>

      {/* Author */}
      <View style={styles.author}>
        <Avatar name={post.author} uri={null} size={38} fallback={DEFAULT_AUTHOR} />
        <View style={{ flex: 1 }}>
          <ThemedText variant="caption" style={{ fontWeight: "700" }}>
            {post.author ?? "Diamonds Tester"}
          </ThemedText>
          <ThemedText variant="caption" muted style={{ fontSize: 12 }}>
            {[post.author_role, post.published_at ? timeAgo(post.published_at) : null].filter(Boolean).join(" · ")}
          </ThemedText>
        </View>
      </View>

      {/* Body — HTML posts (with real tables) via HtmlContent, markdown via Markdown */}
      <View style={{ marginTop: spacing.lg }}>
        {post.content_format === "html" ? (
          <HtmlContent html={post.content ?? ""} contentWidth={width - spacing.lg * 2} />
        ) : (
          <Markdown style={markdownStyles(colors)}>{post.content ?? ""}</Markdown>
        )}
      </View>

      {/* About the author — mirrors the website's blog sidebar author card. */}
      <View style={[styles.authorCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Avatar name={post.author} uri={null} size={64} fallback={DEFAULT_AUTHOR} />
        <ThemedText variant="heading" style={{ marginTop: spacing.md, fontSize: 17 }}>
          {post.author ?? "Diamonds Tester"}
        </ThemedText>
        {post.author_role ? (
          <ThemedText variant="caption" color={colors.tint} style={{ fontWeight: "700", marginTop: 2 }}>
            {post.author_role}
          </ThemedText>
        ) : null}
        <ThemedText variant="caption" muted style={{ textAlign: "center", marginTop: spacing.sm, lineHeight: 20 }}>
          {AUTHOR_BIO}
        </ThemedText>
      </View>

      <Pressable
        onPress={() => void Share.share({ message: `${post.title}\n${env.app.siteUrl}/blog/${post.slug}` })}
        style={{ marginTop: spacing.xl, alignSelf: "center" }}
      >
        <ThemedText variant="caption" color={colors.tint} style={{ textAlign: "center", fontWeight: "700" }}>
          Share this article
        </ThemedText>
      </Pressable>
    </Screen>
  );
}

// react-native-markdown-display takes a style object keyed by element.
function markdownStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return {
    body: { color: colors.text, fontSize: fontSize.base, lineHeight: 25, marginTop: spacing.lg },
    heading1: { color: colors.text, fontSize: 24, fontWeight: "800" as const, marginTop: spacing.xl, marginBottom: spacing.sm },
    heading2: { color: colors.text, fontSize: 20, fontWeight: "700" as const, marginTop: spacing.lg, marginBottom: spacing.sm },
    heading3: { color: colors.text, fontSize: 17, fontWeight: "700" as const, marginTop: spacing.lg, marginBottom: 4 },
    paragraph: { marginTop: 0, marginBottom: spacing.md },
    strong: { fontWeight: "700" as const, color: colors.text },
    em: { fontStyle: "italic" as const },
    link: { color: colors.tint },
    bullet_list: { marginBottom: spacing.md },
    ordered_list: { marginBottom: spacing.md },
    list_item: { marginBottom: 4 },
    blockquote: {
      backgroundColor: colors.card,
      borderLeftColor: colors.tint,
      borderLeftWidth: 3,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
    },
    code_inline: { backgroundColor: colors.card, color: colors.tint, borderRadius: 4, paddingHorizontal: 4 },
    fence: { backgroundColor: colors.card, color: colors.text, borderRadius: radius.md, padding: spacing.md },
    hr: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginVertical: spacing.lg },
    // GFM pipe tables (markdown posts) — bordered grid with an emerald header.
    table: { borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, marginVertical: spacing.md, overflow: "hidden" as const },
    thead: { backgroundColor: withAlpha(colors.tint, 0.102) },
    th: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontWeight: "700" as const, color: colors.text },
    tr: { flexDirection: "row" as const, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
    td: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text },
  };
}

const styles = StyleSheet.create({
  hero: { width: "100%", height: 220, borderRadius: radius.xl },
  author: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.lg },
  authorCard: {
    alignItems: "center",
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
