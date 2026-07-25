import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Card, Screen, ThemedText } from "@/components/ui";
import { anatomyParts } from "@/content/reference";
import { tap } from "@/lib/feedback";
import { spacing, useTheme } from "@/theme";

export default function AnatomyScreen() {
  const { colors } = useTheme();
  const [open, setOpen] = useState<string | null>(anatomyParts[0]?.key ?? null);

  return (
    <Screen scroll>
      <ThemedText variant="title">Anatomy of a diamond</ThemedText>
      <ThemedText variant="caption" muted style={{ marginTop: 2 }}>
        The parts of a cut stone a gemologist checks first — and the ones that drive brilliance and fire.
      </ThemedText>

      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        {anatomyParts.map((part) => {
          const expanded = open === part.key;
          return (
            <Card
              key={part.key}
              onPress={() => {
                tap();
                setOpen(expanded ? null : part.key);
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                <ThemedText variant="heading" style={{ flex: 1, fontSize: 17 }}>
                  {part.title}
                </ThemedText>
                <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.textFaint} />
              </View>

              {expanded ? (
                <>
                  <ThemedText variant="body" style={{ marginTop: spacing.md }}>
                    {part.summary}
                  </ThemedText>
                  <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                    {part.points.map((point) => (
                      <View key={point} style={styles.bullet}>
                        <View style={[styles.dot, { backgroundColor: colors.tint }]} />
                        <ThemedText variant="caption" style={{ flex: 1 }}>
                          {point}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bullet: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 7 },
});
