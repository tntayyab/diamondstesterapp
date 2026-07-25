import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from "react-native";

import { AdBanner } from "@/components/AdBanner";
import { Card, EmptyState, Screen, ThemedText } from "@/components/ui";
import { guides, type Guide } from "@/content/guides";
import { tap } from "@/lib/feedback";
import { fontSize, radius, spacing, useTheme } from "@/theme";

type Category = Guide["category"] | "All";

const CATEGORIES: Category[] = ["All", "Manual Tests", "Buying Tips", "4Cs & Terms", "Scams", "Certification"];

function searchGuides(query: string, category: Category): Guide[] {
  const needle = query.trim().toLowerCase();
  return guides.filter((guide) => {
    if (category !== "All" && guide.category !== category) return false;
    if (!needle) return true;
    return `${guide.title} ${guide.excerpt} ${guide.category}`.toLowerCase().includes(needle);
  });
}

export default function GuidesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [pickerOpen, setPickerOpen] = useState(false);

  const visible = useMemo(() => searchGuides(query, category), [query, category]);

  const header = (
    <View>
      <ThemedText variant="title">Field guides</ThemedText>
      <ThemedText variant="caption" muted style={{ marginTop: 2 }}>
        {visible.length} of {guides.length} guides · offline reference
      </ThemedText>

      <View style={styles.controls}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Feather name="search" size={16} color={colors.textFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search guides"
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
          accessibilityLabel={`Category: ${category}`}
          onPress={() => {
            tap();
            setPickerOpen(true);
          }}
          style={({ pressed }) => [
            styles.filterButton,
            {
              backgroundColor: colors.card,
              borderColor: category === "All" ? colors.cardBorder : colors.tint,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <ThemedText variant="caption" numberOfLines={1} style={{ fontWeight: "600" }}>
            {category}
          </ThemedText>
          <Feather name="chevron-down" size={14} color={colors.textFaint} />
        </Pressable>
      </View>

      {/* Reference shortcuts */}
      <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
        <Reference icon="target" label="Anatomy" onPress={() => router.push("/anatomy")} />
        <Reference icon="zap" label="UV test" onPress={() => router.push("/uv-test")} />
        <Reference icon="shield" label="Scams" onPress={() => router.push("/webs")} />
      </View>

      <ThemedText variant="label" muted style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
        {visible.length} {visible.length === 1 ? "guide" : "guides"}
      </ThemedText>
    </View>
  );

  return (
    <Screen edges={[]}>
      <FlatList
        style={{ flex: 1 }}
        data={visible}
        keyExtractor={(guide) => guide.slug}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <Card onPress={() => router.push(`/guides/${item.slug}`)} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <ThemedText variant="label" color={colors.tint}>
                {item.category}
              </ThemedText>
              <ThemedText variant="caption" muted style={{ fontSize: 12 }}>
                · {item.readMinutes} min read
              </ThemedText>
            </View>
            <ThemedText variant="heading" style={{ marginTop: spacing.sm }}>
              {item.title}
            </ThemedText>
            <ThemedText variant="caption" muted style={{ marginTop: 6 }}>
              {item.excerpt}
            </ThemedText>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState icon="book-open" title="No guides found" body="Try a different search or category." />
        }
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      <AdBanner />

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setPickerOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={(event) => event.stopPropagation()}
          >
            <ThemedText variant="label" muted style={{ marginBottom: spacing.md }}>
              Filter by category
            </ThemedText>

            {CATEGORIES.map((option) => {
              const active = option === category;
              return (
                <Pressable
                  key={option}
                  onPress={() => {
                    tap();
                    setCategory(option);
                    setPickerOpen(false);
                  }}
                  style={({ pressed }) => [styles.option, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <ThemedText variant="body" style={{ flex: 1, fontWeight: active ? "700" : "400" }}>
                    {option}
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

function Reference({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Card onPress={onPress} style={{ flex: 1, alignItems: "center", gap: spacing.sm, padding: spacing.lg }}>
      <Feather name={icon} size={20} color={colors.tint} />
      <ThemedText variant="caption" style={{ fontSize: 12 }}>
        {label}
      </ThemedText>
    </Card>
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
  backdrop: { flex: 1, justifyContent: "flex-end", padding: spacing.lg },
  sheet: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 14 },
});
