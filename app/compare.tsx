import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Card, Screen, SectionHeader, ThemedText, AuthenticityBadge } from "@/components/ui";
import { getSpecies, speciesLibrary, type Species } from "@/content/species";
import { tap } from "@/lib/feedback";
import { radius, spacing, useTheme } from "@/theme";

/** The pairing this screen exists for: diamond vs. the simulant it's most often confused with. */
const DEFAULT_LEFT = getSpecies("diamond") ?? speciesLibrary[0];
const DEFAULT_RIGHT = getSpecies("moissanite") ?? speciesLibrary[1];

/** Side-by-side comparison — built for the widow vs false-widow problem. */
export default function CompareScreen() {
  const { colors } = useTheme();
  const [left, setLeft] = useState<Species>(DEFAULT_LEFT);
  const [right, setRight] = useState<Species>(DEFAULT_RIGHT);
  const [editing, setEditing] = useState<"left" | "right" | null>(null);

  const choose = (species: Species) => {
    if (editing === "left") setLeft(species);
    if (editing === "right") setRight(species);
    setEditing(null);
  };

  if (editing) {
    return (
      <Screen scroll>
        <ThemedText variant="title">Choose a species</ThemedText>
        <ThemedText variant="caption" muted style={{ marginTop: 2, marginBottom: spacing.lg }}>
          Replacing the {editing} column
        </ThemedText>

        {speciesLibrary.map((species) => (
          <Card key={species.slug} onPress={() => choose(species)} style={{ marginBottom: spacing.sm }}>
            <ThemedText variant="body" style={{ fontWeight: "600" }}>
              {species.commonName}
            </ThemedText>
            <ThemedText variant="caption" muted style={{ fontStyle: "italic" }}>
              {species.scientificName}
            </ThemedText>
          </Card>
        ))}
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ThemedText variant="caption" muted>
        Tap a name to swap it. The rows below line up so differences jump out.
      </ThemedText>

      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg }}>
        <Column species={left} onPress={() => setEditing("left")} />
        <Column species={right} onPress={() => setEditing("right")} />
      </View>

      <SectionHeader title="Side by side" />
      <Card style={{ gap: 0, paddingVertical: 0 }}>
        <CompareRow label="Family" a={left.family} b={right.family} />
        <CompareRow label="Authenticity" a={left.venomLevel} b={right.venomLevel} highlight />
        <CompareRow label="Hardness" a={left.size} b={right.size} />
        <CompareRow label="Origin" a={left.region} b={right.region} />
        <CompareRow label="Category" a={left.category} b={right.category} highlight />
      </Card>

      <SectionHeader title={`${left.commonName} — key identifiers`} />
      {left.identification.map((clue) => (
        <Bullet key={clue} text={clue} />
      ))}

      <SectionHeader title={`${right.commonName} — key identifiers`} />
      {right.identification.map((clue) => (
        <Bullet key={clue} text={clue} />
      ))}

      {left.oftenMisrepresented || right.oftenMisrepresented ? (
        <Card style={{ marginTop: spacing.xl, borderColor: colors.danger }}>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <Feather name="alert-triangle" size={18} color={colors.danger} />
            <ThemedText variant="caption" style={{ flex: 1 }}>
              One of these stones is frequently misrepresented as diamond in the secondhand and online market.
              When you cannot tell them apart with confidence, get an independent appraisal before you rely on
              a visual guess alone.
            </ThemedText>
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

function Column({ species, onPress }: { species: Species; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.column,
        { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <ThemedText variant="body" style={{ fontWeight: "700" }} numberOfLines={2}>
        {species.commonName}
      </ThemedText>
      <ThemedText variant="caption" muted numberOfLines={1} style={{ fontStyle: "italic", fontSize: 11 }}>
        {species.scientificName}
      </ThemedText>
      <AuthenticityBadge level={species.venomLevel} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
        <Feather name="repeat" size={11} color={colors.textFaint} />
        <ThemedText variant="caption" muted style={{ fontSize: 11 }}>
          Swap
        </ThemedText>
      </View>
    </Pressable>
  );
}

function CompareRow({ label, a, b, highlight = false }: { label: string; a: string; b: string; highlight?: boolean }) {
  const { colors } = useTheme();
  const differs = a.toLowerCase() !== b.toLowerCase();

  return (
    <View style={[styles.compareRow, { borderTopColor: colors.border }]}>
      <ThemedText variant="label" muted style={{ marginBottom: 6 }}>
        {label}
        {highlight && differs ? "  ·  differs" : ""}
      </ThemedText>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <ThemedText
          variant="caption"
          style={{ flex: 1 }}
          color={highlight && differs ? colors.tint : undefined}
        >
          {a}
        </ThemedText>
        <ThemedText
          variant="caption"
          style={{ flex: 1 }}
          color={highlight && differs ? colors.tint : undefined}
        >
          {b}
        </ThemedText>
      </View>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.bullet}>
      <View style={[styles.dot, { backgroundColor: colors.tint }]} />
      <ThemedText variant="body" style={{ flex: 1 }}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    gap: 6,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  compareRow: { paddingVertical: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth },
  bullet: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md, alignItems: "flex-start" },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 9 },
});
