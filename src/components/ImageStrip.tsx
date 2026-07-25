import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ui";
import { radius, spacing, useTheme } from "@/theme";

const THUMB = 84;

/**
 * Horizontal strip of picked-image thumbnails with a per-photo remove button
 * and a trailing "+" tile (hidden once `images.length` reaches `max`). Used by
 * both the Scan flow and Create Post so multi-photo capture looks and behaves
 * the same everywhere.
 */
export function ImageStrip({
  images,
  onRemove,
  onAdd,
  max,
}: {
  images: string[];
  onRemove: (index: number) => void;
  onAdd: () => void;
  max: number;
}) {
  const { colors } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {images.map((uri, index) => (
        <View key={`${uri}-${index}`} style={styles.thumbWrap}>
          <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
          {index === 0 ? (
            <View style={[styles.primaryTag, { backgroundColor: colors.overlay }]}>
              <ThemedText variant="caption" color="#fff" style={{ fontSize: 10, fontWeight: "700" }}>
                Main
              </ThemedText>
            </View>
          ) : null}
          <Pressable
            onPress={() => onRemove(index)}
            hitSlop={8}
            style={[styles.removeBtn, { backgroundColor: colors.overlay }]}
          >
            <Feather name="x" size={13} color="#fff" />
          </Pressable>
        </View>
      ))}

      {images.length < max ? (
        <Pressable
          onPress={onAdd}
          style={({ pressed }) => [
            styles.addTile,
            { borderColor: colors.cardBorder, backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="plus" size={22} color={colors.tint} />
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: 2 },
  thumbWrap: { width: THUMB, height: THUMB },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.lg },
  primaryTag: {
    position: "absolute",
    left: 4,
    bottom: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addTile: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
});
