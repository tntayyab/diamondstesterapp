import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

import { Button, Card, Screen, SectionHeader, ThemedText } from "@/components/ui";
import { misrepresentedSpecies } from "@/content/species";
import { spacing, useTheme, withAlpha } from "@/theme";

interface Scam {
  title: string;
  description: string;
  tell: string;
}

/** Common ways buyers get misled — practical, non-alarmist consumer education. */
const SCAMS: Scam[] = [
  {
    title: "Undisclosed simulants sold as diamond",
    description:
      "A listing describes a piece as a 'diamond' ring without ever naming the stone, relying on the buyer to assume the best. Moissanite and cubic zirconia are the most common substitutes.",
    tell: "Ask directly, in writing, what the stone is — a genuine seller will say plainly. Vague or evasive answers are a warning sign.",
  },
  {
    title: "Fake or exaggerated certificates",
    description:
      "Some listings include a 'certificate' printed by the seller themselves, or from an obscure lab with no independent standing, styled to look like a GIA report.",
    tell: "Only trust a certificate you can verify yourself on the issuing lab's own website using the report number.",
  },
  {
    title: "Bait-and-switch after grading",
    description: "A stone is graded and certified, then swapped for a lesser stone before the sale completes — rare, but it happens with loose stones changing hands multiple times.",
    tell: "Compare the certificate's plotted inclusion diagram to the actual stone under a loupe before you finalise a purchase.",
  },
  {
    title: "Inflated carat or grade claims",
    description: "A listing rounds up carat weight or quietly upgrades the color/clarity grade compared to what any certificate actually states.",
    tell: "Always check the numbers on an actual certificate — never take a listing's description as the final word.",
  },
  {
    title: "Pressure to skip an appraisal",
    description: "A seller discourages or rushes you past getting an independent appraisal, especially for a private or in-person sale.",
    tell: "Any legitimate seller should be comfortable with you getting an independent second opinion before a high-value purchase.",
  },
  {
    title: "Untraceable payment requests",
    description: "A private seller insists on cash, wire transfer, or gift cards for a high-value stone, with no receipt or buyer protection.",
    tell: "Use a payment method with buyer protection (credit card, escrow, reputable marketplace) for anything you haven't personally verified.",
  },
];

export default function ScamsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const flagged = misrepresentedSpecies();

  return (
    <Screen scroll>
      <ThemedText variant="title">Common scams</ThemedText>
      <ThemedText variant="caption" muted style={{ marginTop: 2 }}>
        None of this is meant to scare you off buying gemstones — just to help you buy with your eyes open.
      </ThemedText>

      {SCAMS.map((scam) => (
        <View key={scam.title} style={{ marginTop: spacing.xl }}>
          <ThemedText variant="heading">{scam.title}</ThemedText>
          <ThemedText variant="body" style={{ marginTop: spacing.sm }}>
            {scam.description}
          </ThemedText>

          <Card style={{ marginTop: spacing.md, backgroundColor: withAlpha(colors.tint, 0.059), borderColor: colors.tint }}>
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <Feather name="eye" size={15} color={colors.tint} style={{ marginTop: 2 }} />
              <ThemedText variant="caption" style={{ flex: 1 }}>
                <ThemedText variant="caption" color={colors.tint} style={{ fontWeight: "700" }}>
                  How to protect yourself:{" "}
                </ThemedText>
                {scam.tell}
              </ThemedText>
            </View>
          </Card>
        </View>
      ))}

      {flagged.length > 0 ? (
        <>
          <SectionHeader title="Stones often misrepresented as diamond" />
          {flagged.map((species) => (
            <Card
              key={species.slug}
              onPress={() => router.push(`/species/${species.slug}`)}
              style={{ marginBottom: spacing.sm }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="body" style={{ fontWeight: "600" }}>
                    {species.commonName}
                  </ThemedText>
                  <ThemedText variant="caption" muted style={{ fontSize: 12 }}>
                    {species.family}
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={17} color={colors.textFaint} />
              </View>
            </Card>
          ))}
        </>
      ) : null}

      <Button
        label="Think you already bought a fake?"
        icon="alert-triangle"
        variant="secondary"
        onPress={() => router.push("/first-aid")}
        style={{ marginTop: spacing.xl }}
      />

      <ThemedText variant="caption" muted style={styles.footer}>
        This page is general consumer education, not legal advice. Rules on returns and disputes vary by
        country and marketplace.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { marginTop: spacing.xxl, marginBottom: spacing.xl, fontSize: 12, lineHeight: 17, textAlign: "center" },
});
