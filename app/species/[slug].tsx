import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";

import { Button, Card, EmptyState, Screen, SectionHeader, ThemedText, AuthenticityBadge } from "@/components/ui";
import { env } from "@/config/env";
import { getSpecies } from "@/content/species";
import { speciesCredit, speciesImage } from "@/content/speciesImages";
import { speak, stopSpeaking, success } from "@/lib/feedback";
import { getSavedSpecies, toggleSavedSpecies } from "@/lib/storage";
import { brandGradient, radius, spacing, useTheme, authenticityColors } from "@/theme";

export default function SpeciesDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const species = getSpecies(slug);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void getSavedSpecies().then((list) => setSaved(list.includes(slug)));
    return () => stopSpeaking();
  }, [slug]);

  const toggle = useCallback(async () => {
    const list = await toggleSavedSpecies(slug);
    setSaved(list.includes(slug));
    success();
  }, [slug]);

  if (!species) {
    return (
      <Screen scroll>
        <EmptyState icon="alert-circle" title="Species not found" body="This entry is not in the offline library." />
      </Screen>
    );
  }

  const accent = authenticityColors[species.venomLevel];
  const photo = speciesImage(species.slug);
  const credit = speciesCredit(species.slug);

  return (
    <Screen scroll>
      {photo ? (
        <View style={{ marginBottom: spacing.lg }}>
          <Image source={photo} style={styles.hero} contentFit="cover" transition={200} />
          {credit ? (
            <ThemedText variant="caption" muted style={styles.credit}>
              Photo: {credit.artist} · {credit.license} · {credit.source}
            </ThemedText>
          ) : null}
        </View>
      ) : (
        <LinearGradient
          colors={[...brandGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, styles.heroPlaceholder, { marginBottom: spacing.lg }]}
        >
          <Feather name="target" size={40} color="rgba(255,255,255,0.9)" />
        </LinearGradient>
      )}

      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <ThemedText variant="title">{species.commonName}</ThemedText>
          <ThemedText variant="caption" muted style={{ fontStyle: "italic", marginTop: 2 }}>
            {species.scientificName}
          </ThemedText>
          <ThemedText variant="caption" muted style={{ marginTop: 2 }}>
            {species.family}
          </ThemedText>
        </View>

        <View style={{ flexDirection: "row", gap: spacing.lg, paddingTop: 6 }}>
          <Pressable onPress={() => speak(`${species.commonName}. ${species.summary}`)} hitSlop={8}>
            <Feather name="volume-2" size={20} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={toggle} hitSlop={8}>
            <Feather name="bookmark" size={20} color={saved ? colors.tint : colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <AuthenticityBadge level={species.venomLevel} large />
      </View>

      {species.oftenMisrepresented ? (
        <Card style={{ marginTop: spacing.lg, borderColor: accent, backgroundColor: `${accent}12` }}>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <Feather name="alert-triangle" size={20} color={accent} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="heading" color={accent} style={{ fontSize: 16 }}>
                Often misrepresented as diamond
              </ThemedText>
              <ThemedText variant="caption" style={{ marginTop: 4 }}>
                Sellers sometimes pass this stone off as a genuine diamond. Buy with care and ask questions.
              </ThemedText>
              <Pressable onPress={() => router.push("/first-aid")}>
                <ThemedText variant="caption" color={accent} style={{ fontWeight: "700", marginTop: 6 }}>
                  Think you already bought a fake? →
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </Card>
      ) : null}

      <SectionHeader title="Overview" />
      <ThemedText variant="body">{species.summary}</ThemedText>

      <SectionHeader title="Key identifiers" />
      {species.identification.map((clue) => (
        <View key={clue} style={styles.bullet}>
          <View style={[styles.dot, { backgroundColor: colors.tint }]} />
          <ThemedText variant="body" style={{ flex: 1 }}>
            {clue}
          </ThemedText>
        </View>
      ))}

      <SectionHeader title="At a glance" />
      <Card style={{ gap: spacing.lg }}>
        <Detail icon="maximize-2" label="Hardness" value={species.size} />
        <Detail icon="globe" label="Origin" value={species.region} />
        <Detail icon="home" label="Formation" value={species.habitat} />
        <Detail
          icon="layers"
          label="Category"
          value={species.category === "natural" ? "Natural" : species.category === "lab-grown" ? "Lab-grown" : "Simulant"}
        />
      </Card>

      <SectionHeader title="Did you know" />
      <Card>
        <ThemedText variant="body">{species.fact}</ThemedText>
      </Card>

      <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
        <Button
          label={saved ? "Remove from saved" : "Save to library"}
          icon="bookmark"
          variant={saved ? "secondary" : "primary"}
          onPress={toggle}
        />
        <Button
          label="Compare with another diamond"
          icon="git-merge"
          variant="secondary"
          onPress={() => router.push("/compare")}
        />
        <Button
          label="Share"
          icon="share-2"
          variant="ghost"
          onPress={() =>
            void Share.share({
              message: `${species.commonName} (${species.scientificName}) — ${species.summary}\n\n${env.app.siteUrl}`,
            })
          }
        />
      </View>
    </Screen>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: spacing.md }}>
      <Feather name={icon} size={16} color={colors.textFaint} style={{ marginTop: 3 }} />
      <View style={{ flex: 1 }}>
        <ThemedText variant="label" muted>
          {label}
        </ThemedText>
        <ThemedText variant="body" style={{ marginTop: 2 }}>
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: "100%", height: 240, borderRadius: radius.xl },
  heroPlaceholder: { alignItems: "center", justifyContent: "center" },
  credit: { fontSize: 10, marginTop: 6, textAlign: "center" },
  bullet: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md, alignItems: "flex-start" },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 9 },
});
