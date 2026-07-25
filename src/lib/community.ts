import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as Crypto from "expo-crypto";

import { supabase } from "@/lib/supabase";

export interface FeedPost {
  id: string;
  user_id: string;
  image_url: string | null;
  /** All photos on the post (max 6), in upload order. `image_urls[0] === image_url`. */
  image_urls: string[];
  title: string | null;
  description: string | null;
  species_slug: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
  like_count: number;
  comment_count: number;
  /** Filled in client-side for the signed-in viewer. */
  liked_by_me?: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
}

export const communityAvailable = (): boolean => supabase !== null;

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

/** Newest posts first, optionally filtered to one species category. */
export async function fetchFeed(options?: {
  speciesSlug?: string | null;
  authorId?: string;
  limit?: number;
  viewerId?: string | null;
}): Promise<FeedPost[]> {
  if (!supabase) return [];

  let query = supabase
    .from("post_feed")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.speciesSlug) query = query.eq("species_slug", options.speciesSlug);
  if (options?.authorId) query = query.eq("user_id", options.authorId);

  const { data, error } = await query;
  if (error || !data) return [];

  const posts = data as FeedPost[];

  // Mark which of these the viewer has already liked (one extra round-trip).
  if (options?.viewerId && posts.length) {
    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", options.viewerId)
      .in(
        "post_id",
        posts.map((p) => p.id),
      );
    const liked = new Set((likes ?? []).map((l: { post_id: string }) => l.post_id));
    posts.forEach((p) => (p.liked_by_me = liked.has(p.id)));
  }

  return posts;
}

/** A single post by id, with the viewer's like state. */
export async function fetchPost(postId: string, viewerId?: string | null): Promise<FeedPost | null> {
  if (!supabase) return null;

  const { data } = await supabase.from("post_feed").select("*").eq("id", postId).maybeSingle();
  if (!data) return null;

  const post = data as FeedPost;
  if (viewerId) {
    const { data: like } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", viewerId)
      .maybeSingle();
    post.liked_by_me = Boolean(like);
  }
  return post;
}

// ---------------------------------------------------------------------------
// Create a post (uploads the image, then inserts the row)
// ---------------------------------------------------------------------------

export interface NewPost {
  /** Up to 6 local photo URIs. The first is the post's primary `image_url`. */
  imageUris: string[];
  title: string;
  description: string;
  speciesSlug: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** Downscale + upload the photo to community/<uid>/<uuid>.jpg, return public URL. */
async function uploadPostImage(userId: string, uri: string): Promise<string | null> {
  if (!supabase) return null;

  const image = await ImageManipulator.manipulate(uri).resize({ width: 1280 }).renderAsync();
  const saved = await image.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });

  const bytes = await new File(saved.uri).bytes();
  const path = `${userId}/${Crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage
    .from("community")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });

  if (error) throw new Error(error.message);

  return supabase.storage.from("community").getPublicUrl(path).data.publicUrl;
}

/** Uploads every photo (max 6) in order; drops any that individually fail rather than failing the whole post. */
async function uploadPostImages(userId: string, uris: string[]): Promise<string[]> {
  if (!supabase || uris.length === 0) return [];

  const uploaded: string[] = [];
  for (const uri of uris.slice(0, 6)) {
    try {
      const url = await uploadPostImage(userId, uri);
      if (url) uploaded.push(url);
    } catch {
      // Skip this one photo; the rest of the post still goes through.
    }
  }
  return uploaded;
}

export async function createPost(userId: string, post: NewPost): Promise<string | null> {
  if (!supabase) throw new Error("Community is not available offline.");

  const imageUrls = await uploadPostImages(userId, post.imageUris);

  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: userId,
      image_url: imageUrls[0] ?? null,
      image_urls: imageUrls,
      title: post.title.trim() || null,
      description: post.description.trim() || null,
      species_slug: post.speciesSlug,
      location: post.location?.trim() || null,
      latitude: post.latitude,
      longitude: post.longitude,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return (data as { id: string } | null)?.id ?? null;
}

export async function updatePost(
  postId: string,
  fields: { title: string; description: string; speciesSlug: string | null; location: string | null },
): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("posts")
    .update({
      title: fields.title.trim() || null,
      description: fields.description.trim() || null,
      species_slug: fields.speciesSlug,
      location: fields.location?.trim() || null,
    })
    .eq("id", postId);
}

export async function deletePost(postId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("posts").delete().eq("id", postId);
}

/** Post count, likes received across all posts, follower and following counts. */
export async function profileStats(
  userId: string,
): Promise<{ posts: number; likes: number; followers: number; following: number }> {
  if (!supabase) return { posts: 0, likes: 0, followers: 0, following: 0 };

  const [{ data: myPosts }, followers, following] = await Promise.all([
    supabase.from("posts").select("id").eq("user_id", userId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
  ]);

  const postIds = (myPosts ?? []).map((p: { id: string }) => p.id);
  let likes = 0;
  if (postIds.length) {
    const { count } = await supabase
      .from("post_likes")
      .select("*", { count: "exact", head: true })
      .in("post_id", postIds);
    likes = count ?? 0;
  }

  return {
    posts: postIds.length,
    likes,
    followers: followers.count ?? 0,
    following: following.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------

/** Returns the new liked state after toggling. */
export async function toggleLike(userId: string, postId: string, currentlyLiked: boolean): Promise<boolean> {
  if (!supabase) return currentlyLiked;

  if (currentlyLiked) {
    await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
    return false;
  }
  await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
  return true;
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function fetchComments(postId: string): Promise<PostComment[]> {
  if (!supabase) return [];

  const { data } = await supabase
    .from("comment_feed")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  return (data as PostComment[]) ?? [];
}

export async function addComment(userId: string, postId: string, body: string): Promise<void> {
  if (!supabase) return;
  const trimmed = body.trim();
  if (!trimmed) return;
  await supabase.from("post_comments").insert({ post_id: postId, user_id: userId, body: trimmed });
}

export async function updateComment(commentId: string, body: string): Promise<void> {
  if (!supabase) return;
  const trimmed = body.trim();
  if (!trimmed) return;
  await supabase.from("post_comments").update({ body: trimmed }).eq("id", commentId);
}

export async function deleteComment(commentId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("post_comments").delete().eq("id", commentId);
}

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return Boolean(data);
}

/** Returns the new following state after toggling. */
export async function toggleFollow(followerId: string, followingId: string, currently: boolean): Promise<boolean> {
  if (!supabase) return currently;

  if (currently) {
    await supabase.from("follows").delete().eq("follower_id", followerId).eq("following_id", followingId);
    return false;
  }
  await supabase.from("follows").insert({ follower_id: followerId, following_id: followingId });
  return true;
}

export async function followCounts(userId: string): Promise<{ followers: number; following: number }> {
  if (!supabase) return { followers: 0, following: 0 };
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  return { followers: followers ?? 0, following: following ?? 0 };
}
