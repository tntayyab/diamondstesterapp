import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { View } from "react-native";

import { SpeciesCard } from "@/components/SpeciesCard";
import { Button, Card, EmptyState, Screen, SectionHeader, ThemedText } from "@/components/ui";
import { getGuide } from "@/content/guides";
import { getSpecies } from "@/content/species";
import { getSavedGuides, getSavedSpecies } from "@/lib/storage";
import { spacing, useTheme } from "@/theme";

export default function SavedScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [speciesSlugs, setSpeciesSlugs] = useState<string[]>([]);
  const [guideSlugs, setGuideSlugs] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void Promise.all([getSavedSpecies(), getSavedGuides()]).then(([species, guides]) => {
        if (!active) return;
        setSpeciesSlugs(species);
        setGuideSlugs(guides);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const species = speciesSlugs.map(getSpecies).filter((item) => item !== undefined);
  const guides = guideSlugs.map(getGuide).filter((item) => item !== undefined);

  if (species.length === 0 && guides.length === 0) {
    return (
      <Screen scroll>
        <EmptyState
          icon="bookmark"
          title="Nothing saved yet"
          body="Tap the bookmark icon on any species or guide to keep it here for offline reference."
          action={<Button label="Browse species" icon="grid" onPress={() => router.push("/(tabs)/species")} />}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      {species.length > 0 ? (
        <>
          <SectionHeader title={`${species.length} saved ${species.length === 1 ? "species" : "species"}`} />
          {species.map((item) => (
            <SpeciesCard key={item.slug} species={item} />
          ))}
        </>
      ) : null}

      {guides.length > 0 ? (
        <>
          <SectionHeader title={`${guides.length} saved ${guides.length === 1 ? "guide" : "guides"}`} />
          {guides.map((guide) => (
            <Card
              key={guide.slug}
              onPress={() => router.push(`/guides/${guide.slug}`)}
              style={{ marginBottom: spacing.md }}
            >
              <ThemedText variant="label" color={colors.tint}>
                {guide.category}
              </ThemedText>
              <ThemedText variant="heading" style={{ marginTop: spacing.sm, fontSize: 17 }}>
                {guide.title}
              </ThemedText>
              <ThemedText variant="caption" muted style={{ marginTop: 4 }} numberOfLines={2}>
                {guide.excerpt}
              </ThemedText>
            </Card>
          ))}
        </>
      ) : null}

      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}
