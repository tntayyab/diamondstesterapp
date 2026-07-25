import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList } from "react-native";

import { PostCard } from "@/components/PostCard";
import { Button, EmptyState, Screen } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { fetchFeed, type FeedPost } from "@/lib/community";
import { spacing } from "@/theme";
import { useRouter } from "expo-router";

export default function MyPostsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!user) {
        setLoading(false);
        return;
      }
      void fetchFeed({ authorId: user.id, viewerId: user.id }).then((data) => {
        if (!active) return;
        setPosts(data);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [user]),
  );

  return (
    <Screen edges={[]}>
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="grid"
              title="No posts yet"
              body="Share a stone you've tested and it will appear here."
              action={<Button label="Create a post" icon="plus" onPress={() => router.push("/post/create")} />}
            />
          )
        }
      />
    </Screen>
  );
}
