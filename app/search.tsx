import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { SpeciesCard } from "@/components/SpeciesCard";
import { Card, EmptyState, Screen, SectionHeader, ThemedText } from "@/components/ui";
import { appImages } from "@/content/appImages";
import { searchGuides } from "@/content/guides";
import { searchSpecies } from "@/content/species";
import { fontSize, radius, spacing, useTheme } from "@/theme";

/** Searches the whole bundled corpus: species + guides. Entirely offline. */
export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [query, setQuery] = useState("");

  const trimmed = query.trim();
  const species = useMemo(() => (trimmed ? searchSpecies(trimmed) : []), [trimmed]);
  const guides = useMemo(() => (trimmed ? searchGuides(trimmed) : []), [trimmed]);
  const total = species.length + guides.length;

  return (
    <Screen scroll>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search species, families, guides…"
        placeholderTextColor={colors.textFaint}
        autoFocus
        autoCorrect={false}
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
      />

      {!trimmed ? (
        <EmptyState
          icon="search"
          title="Search everything"
          body="Species names, scientific names, families, regions and every field guide — all bundled and offline."
        />
      ) : total === 0 ? (
        <EmptyState icon="search" image={appImages.emptySearch} title="No matches" body={`Nothing in the library matches “${trimmed}”.`} />
      ) : (
        <>
          {species.length > 0 ? (
            <>
              <SectionHeader title={`${species.length} species`} />
              {species.map((item) => (
                <SpeciesCard key={item.slug} species={item} />
              ))}
            </>
          ) : null}

          {guides.length > 0 ? (
            <>
              <SectionHeader title={`${guides.length} guides`} />
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
                </Card>
              ))}
            </>
          ) : null}

          <View style={{ height: spacing.xl }} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: fontSize.base,
  },
});
