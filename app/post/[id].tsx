import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { showAlert } from "@/components/AppAlert";

import { Avatar } from "@/components/Avatar";
import { Button, Card, EmptyState, Screen, ThemedText, AuthenticityBadge } from "@/components/ui";
import { getSpecies } from "@/content/species";
import { useAuth } from "@/lib/auth";
import {
  addComment,
  deleteComment,
  deletePost,
  fetchComments,
  fetchPost,
  isFollowing,
  toggleFollow,
  toggleLike,
  updateComment,
  type FeedPost,
  type PostComment,
} from "@/lib/community";
import { success, tap, warn } from "@/lib/feedback";
import { timeAgo } from "@/lib/format";
import { fontSize, radius, spacing, useTheme } from "@/theme";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();

  const [post, setPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [following, setFollowing] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const load = useCallback(async () => {
    const fetched = await fetchPost(id, user?.id ?? null);
    setPost(fetched);
    if (fetched) {
      setLiked(Boolean(fetched.liked_by_me));
      setLikes(fetched.like_count);
      setComments(await fetchComments(id));
      if (user && fetched.user_id !== user.id) {
        setFollowing(await isFollowing(user.id, fetched.user_id));
      }
    }
    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const like = useCallback(async () => {
    if (!user) {
      router.push("/sign-in");
      return;
    }
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    try {
      await toggleLike(user.id, id, liked);
      if (next) success();
    } catch {
      setLiked(liked);
      setLikes((n) => n + (next ? -1 : 1));
    }
  }, [user, liked, id, router]);

  const follow = useCallback(async () => {
    if (!user || !post) {
      router.push("/sign-in");
      return;
    }
    const next = !following;
    setFollowing(next);
    try {
      await toggleFollow(user.id, post.user_id, following);
      tap();
    } catch {
      setFollowing(following);
    }
  }, [user, post, following, router]);

  const send = useCallback(async () => {
    if (!user) {
      router.push("/sign-in");
      return;
    }
    const body = draft.trim();
    if (!body) return;

    setSending(true);
    try {
      await addComment(user.id, id, body);
      setDraft("");
      success();
      setComments(await fetchComments(id));
    } catch {
      warn();
    } finally {
      setSending(false);
    }
  }, [user, draft, id, router]);

  const remove = useCallback(() => {
    showAlert("Delete this post?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deletePost(id);
          router.back();
        },
      },
    ]);
  }, [id, router]);

  const saveCommentEdit = useCallback(
    async (commentId: string) => {
      const body = editDraft.trim();
      if (!body) return;
      await updateComment(commentId, body);
      setEditingComment(null);
      setEditDraft("");
      setComments(await fetchComments(id));
    },
    [editDraft, id],
  );

  const removeComment = useCallback(
    (commentId: string) => {
      showAlert("Delete comment?", "This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteComment(commentId);
            setComments(await fetchComments(id));
          },
        },
      ]);
    },
    [id],
  );

  if (loading) return <Screen />;

  if (!post) {
    return (
      <Screen scroll>
        <EmptyState icon="alert-circle" title="Post not found" body="It may have been deleted." />
      </Screen>
    );
  }

  const species = post.species_slug ? getSpecies(post.species_slug) : undefined;
  const mine = user?.id === post.user_id;

  return (
    <Screen edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
          {/* Author */}
          <View style={styles.author}>
            <Pressable
              onPress={() => {
                tap();
                router.push(`/user/${post.user_id}`);
              }}
              style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: spacing.md }}
            >
              <Avatar name={post.author_name} uri={post.author_avatar} size={44} />
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
            {mine ? (
              <View style={{ flexDirection: "row", gap: spacing.lg }}>
                <Pressable onPress={() => router.push(`/post/create?id=${id}`)} hitSlop={8}>
                  <Feather name="edit-2" size={18} color={colors.textFaint} />
                </Pressable>
                <Pressable onPress={remove} hitSlop={8}>
                  <Feather name="trash-2" size={18} color={colors.textFaint} />
                </Pressable>
              </View>
            ) : user ? (
              <Pressable
                onPress={follow}
                style={[
                  styles.followBtn,
                  { backgroundColor: following ? colors.card : colors.tint, borderColor: colors.tint },
                ]}
              >
                <ThemedText variant="caption" color={following ? colors.tint : "#fff"} style={{ fontWeight: "700" }}>
                  {following ? "Following" : "Follow"}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>

          {(() => {
            const photos = post.image_urls && post.image_urls.length > 0 ? post.image_urls : post.image_url ? [post.image_url] : [];
            if (photos.length > 1) {
              return (
                <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                  {photos.map((uri, index) => (
                    <Image key={`${uri}-${index}`} source={{ uri }} style={styles.photoPage} contentFit="cover" transition={150} />
                  ))}
                </ScrollView>
              );
            }
            return photos[0] ? (
              <Image source={{ uri: photos[0] }} style={styles.photo} contentFit="cover" transition={150} />
            ) : null;
          })()}

          {post.title ? (
            <ThemedText variant="heading" style={{ marginTop: spacing.lg, fontSize: 19 }}>
              {post.title}
            </ThemedText>
          ) : null}
          {post.description ? (
            <ThemedText variant="body" style={{ marginTop: spacing.sm }}>
              {post.description}
            </ThemedText>
          ) : null}

          {species ? (
            <Pressable onPress={() => router.push(`/species/${species.slug}`)}>
              <Card style={{ marginTop: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                <AuthenticityBadge level={species.venomLevel} />
                <ThemedText variant="body" style={{ flex: 1, fontWeight: "600" }}>
                  {species.commonName}
                </ThemedText>
                <Feather name="chevron-right" size={17} color={colors.textFaint} />
              </Card>
            </Pressable>
          ) : null}

          {/* Like / count bar */}
          <View style={styles.bar}>
            <Pressable onPress={like} hitSlop={8} style={styles.barBtn}>
              <Feather name="heart" size={20} color={liked ? colors.danger : colors.textMuted} />
              <ThemedText variant="body" color={liked ? colors.danger : colors.textMuted} style={{ fontWeight: "600" }}>
                {likes}
              </ThemedText>
            </Pressable>
            <View style={styles.barBtn}>
              <Feather name="message-circle" size={20} color={colors.textMuted} />
              <ThemedText variant="body" muted style={{ fontWeight: "600" }}>
                {comments.length}
              </ThemedText>
            </View>
          </View>

          {/* Comments */}
          <ThemedText variant="label" muted style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
            {comments.length === 0 ? "No comments yet" : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
          </ThemedText>

          {comments.map((comment) => {
            const ownComment = user?.id === comment.user_id;
            const isEditing = editingComment === comment.id;
            return (
              <View key={comment.id} style={styles.comment}>
                <Avatar name={comment.author_name} uri={comment.author_avatar} size={32} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <ThemedText variant="caption" style={{ fontWeight: "700" }}>
                      {comment.author_name ?? "Gem hunter"}
                    </ThemedText>
                    <ThemedText variant="caption" muted style={{ fontSize: 11 }}>
                      {timeAgo(comment.created_at)}
                    </ThemedText>
                  </View>

                  {isEditing ? (
                    <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                      <TextInput
                        value={editDraft}
                        onChangeText={setEditDraft}
                        autoFocus
                        multiline
                        style={[
                          styles.editInput,
                          { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text },
                        ]}
                      />
                      <View style={{ flexDirection: "row", gap: spacing.lg }}>
                        <Pressable onPress={() => saveCommentEdit(comment.id)}>
                          <ThemedText variant="caption" color={colors.tint} style={{ fontWeight: "700" }}>
                            Save
                          </ThemedText>
                        </Pressable>
                        <Pressable onPress={() => setEditingComment(null)}>
                          <ThemedText variant="caption" muted>
                            Cancel
                          </ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <>
                      <ThemedText variant="body" style={{ marginTop: 2 }}>
                        {comment.body}
                      </ThemedText>
                      {ownComment ? (
                        <View style={{ flexDirection: "row", gap: spacing.lg, marginTop: 4 }}>
                          <Pressable
                            onPress={() => {
                              setEditingComment(comment.id);
                              setEditDraft(comment.body);
                            }}
                          >
                            <ThemedText variant="caption" muted style={{ fontSize: 11 }}>
                              Edit
                            </ThemedText>
                          </Pressable>
                          <Pressable onPress={() => removeComment(comment.id)}>
                            <ThemedText variant="caption" color={colors.danger} style={{ fontSize: 11 }}>
                              Delete
                            </ThemedText>
                          </Pressable>
                        </View>
                      ) : null}
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Comment composer */}
        <View style={[styles.composer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={user ? "Add a comment…" : "Sign in to comment"}
            placeholderTextColor={colors.textFaint}
            editable={Boolean(user)}
            onFocus={() => {
              if (!user) router.push("/sign-in");
            }}
            style={[styles.composerInput, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
          />
          <Pressable onPress={send} disabled={sending || !draft.trim()} style={{ opacity: draft.trim() ? 1 : 0.4 }}>
            <Feather name="send" size={22} color={colors.tint} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  author: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  followBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  photo: { width: "100%", aspectRatio: 1, borderRadius: radius.lg },
  photoPage: { width: Dimensions.get("window").width - spacing.lg * 2, aspectRatio: 1, borderRadius: radius.lg },
  bar: { flexDirection: "row", gap: spacing.xl, marginTop: spacing.lg },
  barBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  comment: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composerInput: {
    flex: 1,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    fontSize: fontSize.base,
  },
  editInput: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: fontSize.base,
    minHeight: 40,
  },
});

