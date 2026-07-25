import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Dimensions, Pressable, ScrollView, Share, StyleSheet, View } from "react-native";

import { Avatar } from "@/components/Avatar";
import { Card, ThemedText, AuthenticityBadge } from "@/components/ui";
import { env } from "@/config/env";
import { getSpecies } from "@/content/species";
import { useAuth } from "@/lib/auth";
import { toggleLike, type FeedPost } from "@/lib/community";
import { success, tap, warn } from "@/lib/feedback";
import { timeAgo } from "@/lib/format";
import { radius, spacing, useTheme } from "@/theme";

// The feed list pads both sides by spacing.lg (see app/(tabs)/community.tsx),
// so a photo page fills the same width the single-photo layout always used.
const PHOTO_WIDTH = Dimensions.get("window").width - spacing.lg * 2;

/**
 * One feed post. Likes update optimistically; comment count taps through to the
 * detail screen. Everything degrades quietly when the viewer is a guest.
 */
export function PostCard({ post, onOpen }: { post: FeedPost; onOpen?: () => void }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();

  const [liked, setLiked] = useState(Boolean(post.liked_by_me));
  const [likes, setLikes] = useState(post.like_count);
  const [busy, setBusy] = useState(false);

  const species = post.species_slug ? getSpecies(post.species_slug) : undefined;
  const photos = post.image_urls && post.image_urls.length > 0 ? post.image_urls : post.image_url ? [post.image_url] : [];

  const open = () => {
    tap();
    if (onOpen) onOpen();
    else router.push(`/post/${post.id}`);
  };

  const like = async () => {
    if (!user) {
      warn();
      router.push("/sign-in");
      return;
    }
    if (busy) return;

    // Optimistic — flip immediately, reconcile on failure.
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    setBusy(true);
    try {
      await toggleLike(user.id, post.id, liked);
      if (next) success();
    } catch {
      setLiked(liked);
      setLikes((n) => n + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  };

  const share = () => {
    void Share.share({
      message:
        `${post.title ?? "A gemstone find"} on Diamonds Tester\n` +
        (post.description ? `${post.description}\n` : "") +
        env.app.siteUrl,
    });
  };

  return (
    <Card style={{ marginBottom: spacing.lg, padding: 0, overflow: "hidden" }}>
      {/* Author row */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            tap();
            router.push(`/user/${post.user_id}`);
          }}
          style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: spacing.md }}
        >
          <Avatar name={post.author_name} uri={post.author_avatar} size={40} />
          <View style={{ flex: 1 }}>
            <ThemedText variant="body" style={{ fontWeight: "700" }} numberOfLines={1}>
              {post.author_name ?? "Gem hunter"}
            </ThemedText>
            <ThemedText variant="caption" muted style={{ fontSize: 12 }}>
              {timeAgo(post.created_at)}
              {post.location ? ` · ${post.location}` : ""}
            </ThemedText>
          </View>
        </Pressable>
        {species ? <AuthenticityBadge level={species.venomLevel} /> : null}
      </View>

      {/* Photo(s) */}
      {photos.length > 1 ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {photos.map((uri, index) => (
            <Pressable key={`${uri}-${index}`} onPress={open}>
              <Image source={{ uri }} style={styles.photoPage} contentFit="cover" transition={150} />
            </Pressable>
          ))}
        </ScrollView>
      ) : photos[0] ? (
        <Pressable onPress={open}>
          <Image source={{ uri: photos[0] }} style={styles.photo} contentFit="cover" transition={150} />
        </Pressable>
      ) : null}

      {/* Caption */}
      {post.title || post.description ? (
        <Pressable onPress={open} style={styles.caption}>
          {post.title ? (
            <ThemedText variant="body" style={{ fontWeight: "600" }}>
              {post.title}
            </ThemedText>
          ) : null}
          {post.description ? (
            <ThemedText variant="caption" muted numberOfLines={3} style={{ marginTop: 2 }}>
              {post.description}
            </ThemedText>
          ) : null}
          {species ? (
            <ThemedText variant="caption" color={colors.tint} style={{ marginTop: 6, fontWeight: "600" }}>
              {species.commonName}
            </ThemedText>
          ) : null}
        </Pressable>
      ) : null}

      {/* Action bar */}
      <View style={styles.actions}>
        <Action icon="heart" label={String(likes)} onPress={like} tint={liked ? colors.danger : undefined} />
        <Action icon="message-circle" label={String(post.comment_count)} onPress={open} />
        <View style={{ flex: 1 }} />
        <Action icon="share-2" label="Share" onPress={share} />
      </View>
    </Card>
  );
}

function Action({
  icon,
  label,
  onPress,
  tint,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  tint?: string;
}) {
  const { colors } = useTheme();
  const color = tint ?? colors.textMuted;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.action, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Feather name={icon} size={19} color={color} />
      <ThemedText variant="caption" style={{ color, fontWeight: "600" }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  photo: { width: "100%", aspectRatio: 1 },
  photoPage: { width: PHOTO_WIDTH, aspectRatio: 1 },
  caption: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 6 },
});
