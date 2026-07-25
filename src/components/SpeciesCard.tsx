import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";

import { Card, ThemedText, AuthenticityBadge } from "@/components/ui";
import type { Species } from "@/content/species";
import { speciesImage } from "@/content/speciesImages";
import { brandGradient, spacing, useTheme } from "@/theme";

/** Photo when we have one, otherwise a branded gradient tile with a target glyph. */
function Thumb({ slug, size, iconSize }: { slug: string; size: { width: number | "100%"; height: number }; iconSize: number }) {
  const photo = speciesImage(slug);

  if (photo) {
    return <Image source={photo} style={size as StyleProp<ImageStyle>} contentFit="cover" transition={150} />;
  }

  return (
    <LinearGradient
      colors={[...brandGradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[size as StyleProp<ViewStyle>, styles.center]}
    >
      <Feather name="target" size={iconSize} color="rgba(255,255,255,0.9)" />
    </LinearGradient>
  );
}

/**
 * `grid` renders a narrow tile for a two-column list; the default renders a
 * full-width row. Both now lead with the species photo.
 */
export function SpeciesCard({ species, grid = false }: { species: Species; grid?: boolean }) {
  const router = useRouter();
  const { colors } = useTheme();

  const open = () => router.push(`/species/${species.slug}`);

  if (grid) {
    return (
      <Card onPress={open} style={{ flex: 1, padding: 0, overflow: "hidden" }}>
        <Thumb slug={species.slug} size={{ width: "100%", height: 108 }} iconSize={30} />
        <View style={{ padding: spacing.md, gap: 3 }}>
          <ThemedText variant="body" style={{ fontWeight: "700", lineHeight: 19 }} numberOfLines={2}>
            {species.commonName}
          </ThemedText>
          <ThemedText variant="caption" muted numberOfLines={1} style={{ fontStyle: "italic", fontSize: 11 }}>
            {species.scientificName}
          </ThemedText>
          <View style={{ marginTop: 6 }}>
            <AuthenticityBadge level={species.venomLevel} />
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card onPress={open} style={{ marginBottom: spacing.md, padding: 0, overflow: "hidden" }}>
      <View style={{ flexDirection: "row" }}>
        <Thumb slug={species.slug} size={{ width: 100, height: 112 }} iconSize={24} />
        <View style={{ flex: 1, padding: spacing.md, gap: 5 }}>
          <ThemedText variant="heading" numberOfLines={1} style={{ fontSize: 17 }}>
            {species.commonName}
          </ThemedText>
          <ThemedText variant="caption" muted numberOfLines={1} style={{ fontStyle: "italic" }}>
            {species.scientificName}
          </ThemedText>
          <View style={{ marginTop: 2 }}>
            <AuthenticityBadge level={species.venomLevel} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
            <Feather name="maximize-2" size={11} color={colors.textFaint} />
            <ThemedText variant="caption" muted numberOfLines={1} style={{ flex: 1, fontSize: 12 }}>
              {species.size}
            </ThemedText>
          </View>
        </View>
        <Feather
          name="chevron-right"
          size={18}
          color={colors.textFaint}
          style={{ alignSelf: "center", marginRight: spacing.md }}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
