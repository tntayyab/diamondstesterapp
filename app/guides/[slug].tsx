import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";

import { Card, EmptyState, Screen, ThemedText } from "@/components/ui";
import { env } from "@/config/env";
import { getGuide } from "@/content/guides";
import { success } from "@/lib/feedback";
import { getSavedGuides, toggleSavedGuide } from "@/lib/storage";
import { spacing, useTheme } from "@/theme";

export default function GuideDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();

  const guide = getGuide(slug);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void getSavedGuides().then((list) => setSaved(list.includes(slug)));
  }, [slug]);

  const toggle = useCallback(async () => {
    const list = await toggleSavedGuide(slug);
    setSaved(list.includes(slug));
    success();
  }, [slug]);

  if (!guide) {
    return (
      <Screen scroll>
        <EmptyState icon="alert-circle" title="Guide not found" body="This guide is not bundled with the app." />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <ThemedText variant="label" color={colors.tint}>
          {guide.category}
        </ThemedText>
        <ThemedText variant="caption" muted style={{ fontSize: 12 }}>
          · {guide.readMinutes} min read
        </ThemedText>
        <View style={{ flex: 1 }} />
        <Pressable onPress={toggle} hitSlop={8}>
          <Feather name="bookmark" size={19} color={saved ? colors.tint : colors.textMuted} />
        </Pressable>
        <Pressable
          onPress={() => void Share.share({ message: `${guide.title}\n\n${guide.excerpt}\n\n${env.app.siteUrl}` })}
          hitSlop={8}
        >
          <Feather name="share-2" size={19} color={colors.textMuted} />
        </Pressable>
      </View>

      <ThemedText variant="title" style={{ marginTop: spacing.md }}>
        {guide.title}
      </ThemedText>
      <ThemedText variant="body" muted style={{ marginTop: spacing.md }}>
        {guide.excerpt}
      </ThemedText>

      {guide.sections.map((section) => (
        <View key={section.heading} style={{ marginTop: spacing.xl }}>
          <ThemedText variant="heading">{section.heading}</ThemedText>
          <ThemedText variant="body" style={{ marginTop: spacing.sm }}>
            {section.body}
          </ThemedText>

          {section.bullets?.length ? (
            <Card style={{ marginTop: spacing.md, gap: spacing.md }}>
              {section.bullets.map((bullet) => (
                <View key={bullet} style={styles.bullet}>
                  <View style={[styles.dot, { backgroundColor: colors.tint }]} />
                  <ThemedText variant="body" style={{ flex: 1 }}>
                    {bullet}
                  </ThemedText>
                </View>
              ))}
            </Card>
          ) : null}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bullet: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 9 },
});
