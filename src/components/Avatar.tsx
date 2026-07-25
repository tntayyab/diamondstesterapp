import { Image } from "expo-image";
import React from "react";
import { View, type ImageSourcePropType } from "react-native";

import { ThemedText } from "@/components/ui";
import { brand } from "@/theme";

/**
 * Author avatar: the remote photo if present, else a bundled `fallback` image
 * (the website does the same — `author_avatar || default-author.webp`), else a
 * coloured initial.
 */
export function Avatar({
  name,
  uri,
  size = 40,
  fallback,
}: {
  name: string | null;
  uri: string | null;
  size?: number;
  fallback?: ImageSourcePropType;
}) {
  const source: ImageSourcePropType | null = uri ? { uri } : fallback ?? null;
  if (source) {
    return (
      <Image
        source={source}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={150}
      />
    );
  }

  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: brand.cyan,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ThemedText variant="body" color="#fff" style={{ fontWeight: "700", fontSize: size * 0.42 }}>
        {initial}
      </ThemedText>
    </View>
  );
}
