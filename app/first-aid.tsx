import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Linking, StyleSheet, View } from "react-native";

import { Button, Card, Screen, SectionHeader, ThemedText } from "@/components/ui";
import { misrepresentedSpecies } from "@/content/species";
import { emergencySigns, firstAidSteps, neverDo } from "@/content/reference";
import { env } from "@/config/env";
import { radius, spacing, useTheme } from "@/theme";

/** Practical steps for someone who suspects they were sold a misrepresented gemstone. */
export default function FirstAidScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Screen scroll>
      <Card style={{ borderColor: colors.danger, backgroundColor: `${colors.danger}12` }}>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Feather name="alert-triangle" size={22} color={colors.danger} />
          <View style={{ flex: 1 }}>
            <ThemedText variant="heading" color={colors.danger} style={{ fontSize: 17 }}>
              This is not legal advice
            </ThemedText>
            <ThemedText variant="caption" style={{ marginTop: 4 }}>
              Consumer protection rules and return windows vary by country and marketplace. This page gives
              general, practical steps — for anything high-value, an independent gemologist and, if needed, a
              consumer-rights body are your best resources.
            </ThemedText>
          </View>
        </View>
      </Card>

      <SectionHeader title="What to do, in order" />
      {firstAidSteps.map((item, index) => (
        <View key={item.step} style={styles.step}>
          <View style={[styles.badge, { backgroundColor: colors.tint }]}>
            <ThemedText variant="caption" color="#fff" style={{ fontWeight: "800", fontSize: 12 }}>
              {index + 1}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="body" style={{ fontWeight: "600" }}>
              {item.step}
            </ThemedText>
            <ThemedText variant="caption" muted style={{ marginTop: 2 }}>
              {item.detail}
            </ThemedText>
          </View>
        </View>
      ))}

      <SectionHeader title="Warning signs to take seriously" />
      <Card style={{ borderColor: colors.danger, gap: spacing.md }}>
        {emergencySigns.map((sign) => (
          <View key={sign} style={{ flexDirection: "row", gap: spacing.md, alignItems: "flex-start" }}>
            <Feather name="alert-circle" size={15} color={colors.danger} style={{ marginTop: 3 }} />
            <ThemedText variant="caption" style={{ flex: 1 }}>
              {sign}
            </ThemedText>
          </View>
        ))}
      </Card>

      <SectionHeader title="Don't do this" />
      <Card style={{ gap: spacing.md }}>
        {neverDo.map((item) => (
          <View key={item} style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
            <Feather name="x-circle" size={15} color={colors.textMuted} />
            <ThemedText variant="caption" style={{ flex: 1 }}>
              {item}
            </ThemedText>
          </View>
        ))}
      </Card>

      <SectionHeader title="Frequently misrepresented stones" />
      <ThemedText variant="caption" muted style={{ marginBottom: spacing.md }}>
        These stones are the ones most often passed off as diamond in the secondhand and online market.
      </ThemedText>

      {misrepresentedSpecies().map((species) => (
        <Card
          key={species.slug}
          onPress={() => router.push(`/species/${species.slug}`)}
          style={{ marginBottom: spacing.sm }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <View style={[styles.dangerDot, { backgroundColor: colors.danger }]} />
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

      <Button
        label="Email support for help"
        icon="mail"
        variant="secondary"
        onPress={() => void Linking.openURL(`mailto:${env.app.supportEmail}`)}
        style={{ marginTop: spacing.xl }}
      />

      <ThemedText variant="caption" muted style={styles.footer}>
        This page works entirely offline. It's general education, not a substitute for professional
        gemological or legal advice.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, alignItems: "flex-start" },
  badge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dangerDot: { width: 8, height: 8, borderRadius: radius.pill },
  footer: { marginTop: spacing.xl, marginBottom: spacing.xl, fontSize: 11, lineHeight: 16, textAlign: "center" },
});
