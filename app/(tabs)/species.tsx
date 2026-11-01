import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from "react-native";

import { AdBanner } from "@/components/AdBanner";
import { SpeciesCard } from "@/components/SpeciesCard";
import { HamburgerButton } from "@/components/HamburgerButton";
import { EmptyState, Screen, ThemedText } from "@/components/ui";
import { appImages } from "@/content/appImages";
import { searchSpecies, speciesLibrary, VENOM_ORDER } from "@/content/species";
import { tap } from "@/lib/feedback";
import { fontSize, radius, spacing, useTheme, authenticityColors } from "@/theme";
import type { AuthenticityLevel } from "@/theme/colors";

type Filter = AuthenticityLevel | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All authenticity levels" },
  ...VENOM_ORDER.map((level) => ({
    value: level as Filter,
    label: level[0].toUpperCase() + level.slice(1),
  })),
];

const shortLabel = (filter: Filter) =>
  filter === "all" ? "All" : filter[0].toUpperCase() + filter.slice(1);

export default function SpeciesScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [pickerOpen, setPickerOpen] = useState(false);

  const results = useMemo(() => {
    const matches = searchSpecies(query);
    return filter === "all" ? matches : matches.filter((species) => species.venomLevel === filter);
  }, [query, filter]);

  const dotColor = filter === "all" ? colors.tint : authenticityColors[filter];

  return (
    <Screen>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <HamburgerButton />
          <ThemedText variant="title">Diamond library</ThemedText>
        </View>
        <ThemedText variant="caption" muted style={{ marginTop: 2 }}>
          {results.length} of {speciesLibrary.length} diamonds & look-alikes · works offline
        </ThemedText>

        <View style={styles.controls}>
          <View
            style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <Feather name="search" size={16} color={colors.textFaint} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search name, family, region"
              placeholderTextColor={colors.textFaint}
              autoCorrect={false}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <Feather name="x" size={15} color={colors.textFaint} />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Venom filter: ${shortLabel(filter)}`}
            onPress={() => {
              tap();
              setPickerOpen(true);
            }}
            style={({ pressed }) => [
              styles.filterButton,
              {
                backgroundColor: colors.card,
                borderColor: filter === "all" ? colors.cardBorder : dotColor,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <ThemedText variant="caption" numberOfLines={1} style={{ fontWeight: "600" }}>
              {shortLabel(filter)}
            </ThemedText>
            <Feather name="chevron-down" size={14} color={colors.textFaint} />
          </Pressable>
        </View>
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={results}
        keyExtractor={(species) => species.slug}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md }}
        renderItem={({ item }) => <SpeciesCard species={item} grid />}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState
            icon="search"
            image={appImages.emptySearch}
            title="No matches"
            body="Try a different name, family or region — or reset the authenticity filter."
          />
        }
      />

      <AdBanner />

      {/* Venom-level picker */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setPickerOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={(event) => event.stopPropagation()}
          >
            <ThemedText variant="label" muted style={{ marginBottom: spacing.md }}>
              Filter by authenticity level
            </ThemedText>

            {FILTERS.map((option) => {
              const active = option.value === filter;
              const color = option.value === "all" ? colors.tint : authenticityColors[option.value];

              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    tap();
                    setFilter(option.value);
                    setPickerOpen(false);
                  }}
                  style={({ pressed }) => [styles.option, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <ThemedText variant="body" style={{ flex: 1, fontWeight: active ? "700" : "400" }}>
                    {option.label}
                  </ThemedText>
                  {active ? <Feather name="check" size={17} color={colors.tint} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: fontSize.base },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  backdrop: { flex: 1, justifyContent: "flex-end", padding: spacing.lg },
  sheet: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 14 },
});
