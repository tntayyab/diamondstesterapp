import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, View } from "react-native";

import { showAlert } from "@/components/AppAlert";
import { ScreenHero } from "@/components/ScreenHero";
import { Button, Card, SectionHeader, Screen, ThemedText } from "@/components/ui";
import { appImages } from "@/content/appImages";
import { success, tap } from "@/lib/feedback";
import { addUvLog, setScanUvObservation, type UvObservation } from "@/lib/storage";
import { radius, spacing, useTheme, withAlpha } from "@/theme";

type Fluorescence = UvObservation["fluorescence"];

const FLUORESCENCE_OPTIONS: { key: Fluorescence; label: string; meaning: string; color: string }[] = [
  {
    key: "none",
    label: "No visible glow",
    meaning: "Common and completely normal — many genuine diamonds show no fluorescence at all. Absence of glow proves nothing either way.",
    color: "#6B7280",
  },
  {
    key: "blue",
    label: "Blue glow",
    meaning: "The most common fluorescence colour in natural diamonds (roughly a third show some blue fluorescence). A supportive clue for diamond, not proof — some diamonds show none, and this alone can't rule out every simulant.",
    color: "#3B82F6",
  },
  {
    key: "yellow",
    label: "Yellow / green glow",
    meaning: "Less common in diamond; more often associated with certain simulants or treated stones. Worth a closer look with the other manual tests, not a verdict on its own.",
    color: "#EAB308",
  },
  {
    key: "other",
    label: "Another colour",
    meaning: "Unusual colours can occur in both natural and synthetic stones. Note it and mention it to a professional if you get an appraisal.",
    color: "#A855F7",
  },
];

export default function UvTestScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { scanId } = useLocalSearchParams<{ scanId?: string }>();

  const [simulating, setSimulating] = useState(false);
  const [picked, setPicked] = useState<Fluorescence | null>(null);
  const [saved, setSaved] = useState(false);
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    if (!simulating) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.85, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 1400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [simulating, pulse]);

  const startSimulation = useCallback(() => {
    tap();
    setSimulating(true);
  }, []);

  const save = useCallback(async () => {
    if (!picked) return;
    const observation: UvObservation = { fluorescence: picked, observedAt: new Date().toISOString() };
    if (scanId) {
      await setScanUvObservation(scanId, observation);
    } else {
      await addUvLog(observation);
    }
    success();
    setSaved(true);
    showAlert(
      "Saved",
      scanId ? "Your fluorescence observation was added to this scan." : "Your fluorescence observation was logged.",
      [{ text: "OK", onPress: () => (scanId ? router.push(`/result/${scanId}`) : router.back()) }],
    );
  }, [picked, scanId, router]);

  return (
    <Screen scroll>
      <ScreenHero image={appImages.uvGlow} />
      <ThemedText variant="title">UV fluorescence test</ThemedText>
      <ThemedText variant="caption" muted style={{ marginTop: 2 }}>
        A genuinely useful supplementary clue — never a standalone verdict.
      </ThemedText>

      <SectionHeader title="How the real test works" />
      <Card>
        <ThemedText variant="body">
          Under a real UV (blacklight) lamp, many natural diamonds emit a visible glow — most often blue,
          caused by trace boron and nitrogen in the crystal. Moissanite and cubic zirconia typically show
          little to no fluorescence. This makes UV a handy supplementary clue when you already have a real
          UV flashlight or blacklight.
        </ThemedText>
      </Card>

      <Card style={{ marginTop: spacing.md, borderColor: colors.tint, backgroundColor: withAlpha(colors.tint, 0.059) }}>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Feather name="info" size={18} color={colors.tint} style={{ marginTop: 2 }} />
          <ThemedText variant="caption" style={{ flex: 1 }}>
            <ThemedText variant="caption" color={colors.tint} style={{ fontWeight: "700" }}>
              Important:{" "}
            </ThemedText>
            Roughly a third of diamonds show no fluorescence at all, and it is not part of the official 4Cs
            grading. A glow (or the lack of one) is a clue, never proof either way.
          </ThemedText>
        </View>
      </Card>

      <SectionHeader title="What this simulator actually does" />
      <Card>
        <ThemedText variant="body">
          Your phone screen physically cannot emit real UV light — no app can change that. What this
          simulator gives you is a dimmed, purple-tinted screen to work alongside an actual UV flashlight or
          blacklight, plus a guided checklist so you record what you observed consistently. If you don't own
          a UV flashlight, small ones are inexpensive and widely available.
        </ThemedText>
      </Card>

      <Button
        label="Start simulation"
        icon="zap"
        onPress={startSimulation}
        style={{ marginTop: spacing.lg }}
      />

      <SectionHeader title="What each glow colour means" />
      <View style={{ gap: spacing.md }}>
        {FLUORESCENCE_OPTIONS.map((option) => (
          <Card key={option.key} style={{ flexDirection: "row", gap: spacing.md }}>
            <View style={[styles.swatch, { backgroundColor: option.color }]} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="body" style={{ fontWeight: "700" }}>
                {option.label}
              </ThemedText>
              <ThemedText variant="caption" muted style={{ marginTop: 2 }}>
                {option.meaning}
              </ThemedText>
            </View>
          </Card>
        ))}
      </View>

      <SectionHeader title="Log what you observed" />
      <ThemedText variant="caption" muted style={{ marginBottom: spacing.md }}>
        {scanId
          ? "This will be attached to your scan result."
          : "This will be saved to your UV observation log."}
      </ThemedText>

      <View style={styles.colorRow}>
        {FLUORESCENCE_OPTIONS.map((option) => {
          const active = picked === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => {
                tap();
                setPicked(option.key);
                setSaved(false);
              }}
              style={({ pressed }) => [
                styles.colorOption,
                {
                  backgroundColor: colors.card,
                  borderColor: active ? option.color : colors.cardBorder,
                  borderWidth: active ? 2 : StyleSheet.hairlineWidth * 2,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={[styles.swatch, { backgroundColor: option.color }]} />
              <ThemedText variant="caption" style={{ fontWeight: active ? "700" : "500", textAlign: "center" }}>
                {option.label}
              </ThemedText>
              {active ? <Feather name="check-circle" size={16} color={option.color} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Button
        label={saved ? "Saved ✓" : "Save observation"}
        icon="check"
        onPress={save}
        disabled={!picked || saved}
        style={{ marginTop: spacing.lg }}
      />

      <ThemedText variant="caption" muted style={styles.disclaimer}>
        Fluorescence is a supplementary clue, not a certified test. Combine it with the manual tests in
        Guides and, for anything valuable, a professional appraisal.
      </ThemedText>

      {/* Full-screen "simulate" overlay — honestly labelled, not a fake UV camera. */}
      <Modal visible={simulating} animationType="fade" onRequestClose={() => setSimulating(false)}>
        <View style={styles.overlayBase}>
          <Animated.View
            pointerEvents="none"
            style={[styles.overlayTint, { opacity: pulse }]}
          />
          <View style={styles.overlayContent}>
            <Feather name="zap" size={40} color="#fff" />
            <ThemedText variant="title" color="#fff" style={{ textAlign: "center", marginTop: spacing.lg }}>
              Hold your stone near a real UV flashlight
            </ThemedText>
            <ThemedText
              variant="body"
              color="rgba(255,255,255,0.85)"
              style={{ textAlign: "center", marginTop: spacing.md, maxWidth: 320 }}
            >
              This screen cannot produce real UV light — it's just a dim, low-glare backdrop so your eyes
              adjust. Shine an actual UV/blacklight torch on the stone in a dark room and watch for a glow.
            </ThemedText>
            <Button
              label="Done — close simulation"
              variant="secondary"
              onPress={() => {
                tap();
                setSimulating(false);
              }}
              style={{ marginTop: spacing.xxl }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  swatch: { width: 28, height: 28, borderRadius: 14 },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  colorOption: {
    width: "47%",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
  },
  disclaimer: { marginTop: spacing.xl, marginBottom: spacing.xl, fontSize: 12, lineHeight: 17, textAlign: "center" },
  overlayBase: { flex: 1, backgroundColor: "#05010A", alignItems: "center", justifyContent: "center" },
  overlayTint: { ...StyleSheet.absoluteFillObject, backgroundColor: "#7C3AED" },
  overlayContent: { alignItems: "center", paddingHorizontal: spacing.xl },
});
