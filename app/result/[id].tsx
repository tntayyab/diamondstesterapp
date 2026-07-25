import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Dimensions, Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { showAlert } from "@/components/AppAlert";

import { HouseInterstitialModal } from "@/components/HouseInterstitialModal";
import { Button, Card, EmptyState, Screen, SectionHeader, ThemedText, AuthenticityBadge } from "@/components/ui";
import { env } from "@/config/env";
import { presentInterstitial } from "@/lib/ads";
import { findSpeciesByStoneType } from "@/content/species";
import { exportResultPdf } from "@/lib/export";
import { speak, stopSpeaking } from "@/lib/feedback";
import { deleteScan, getScan, type ScanRecord } from "@/lib/storage";
import { radius, spacing, useTheme, authenticityColors, withAlpha } from "@/theme";

const SOURCE_LABEL: Record<ScanRecord["source"], string> = {
  edge: "Live AI",
  direct: "Live AI (dev)",
  demo: "Demo result",
};

// Screen's scroll container pads both sides by spacing.lg — match that so a
// single photo (or each page of the carousel) fills the same width it always did.
const HERO_WIDTH = Dimensions.get("window").width - spacing.lg * 2;

const FLUORESCENCE_LABEL: Record<string, string> = {
  none: "No visible glow",
  blue: "Blue glow",
  yellow: "Yellow / green glow",
  other: "Another colour",
};

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [houseAdVisible, setHouseAdVisible] = useState(false);

  useEffect(() => {
    void getScan(id).then((record) => {
      setScan(record);
      setLoading(false);
      // Interstitial at this natural break (result is ready), frequency-capped.
      if (record) presentInterstitial(() => setHouseAdVisible(true));
    });
    return () => stopSpeaking();
  }, [id]);

  const toggleSpeech = useCallback(() => {
    if (!scan) return;
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    speak(`${scan.result.stoneType}. ${scan.result.visualObservations.join(". ")}`);
    setSpeaking(true);
  }, [scan, speaking]);

  const shareResult = useCallback(async () => {
    if (!scan) return;
    await Share.share({
      message:
        `${scan.result.stoneType}\n` +
        `Authenticity: ${scan.result.authenticityLevel} · Confidence: ${scan.result.confidence}%\n\n` +
        `${scan.result.visualObservations[0] ?? ""}\n\n` +
        `${scan.result.disclaimer}\n\n` +
        `Tested with Diamonds Tester — ${env.app.siteUrl}`,
    });
  }, [scan]);

  const remove = useCallback(() => {
    if (!scan) return;
    showAlert("Delete this scan?", "It will be removed from your history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteScan(scan.id);
          router.back();
        },
      },
    ]);
  }, [scan, router]);

  if (loading) return <Screen />;

  if (!scan) {
    return (
      <Screen scroll>
        <EmptyState icon="alert-circle" title="Scan not found" body="This result is no longer in your history." />
      </Screen>
    );
  }

  const { result } = scan;
  const accent = authenticityColors[result.authenticityLevel];
  const libraryMatch = findSpeciesByStoneType(result.stoneType);
  const photos = scan.imageUris && scan.imageUris.length > 0 ? scan.imageUris : scan.imageUri ? [scan.imageUri] : [];

  return (
    <Screen scroll>
      {photos.length > 1 ? (
        <>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.hero}>
            {photos.map((uri, index) => (
              <Image key={`${uri}-${index}`} source={{ uri }} style={styles.heroPage} contentFit="cover" />
            ))}
          </ScrollView>
          <ThemedText variant="caption" muted style={{ textAlign: "center", marginTop: spacing.sm }}>
            {photos.length} photos attached · swipe to browse
          </ThemedText>
        </>
      ) : photos[0] ? (
        <Image source={{ uri: photos[0] }} style={styles.hero} contentFit="cover" />
      ) : null}

      <View style={{ marginTop: spacing.lg, flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <ThemedText variant="title">{result.stoneType}</ThemedText>
          <ThemedText variant="caption" muted style={{ marginTop: 2 }}>
            {result.confidence}% confidence
          </ThemedText>
        </View>
        <Pressable onPress={toggleSpeech} hitSlop={10} style={{ paddingTop: 6 }}>
          <Feather name={speaking ? "volume-x" : "volume-2"} size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md }}>
        <AuthenticityBadge level={result.authenticityLevel} large />
        <View style={{ flex: 1 }} />
        <View style={[styles.sourceTag, { borderColor: colors.cardBorder }]}>
          <ThemedText variant="caption" muted style={{ fontSize: 11 }}>
            {SOURCE_LABEL[scan.source]}
          </ThemedText>
        </View>
      </View>

      {scan.source === "demo" ? (
        <Card style={{ marginTop: spacing.lg, borderColor: colors.tint, backgroundColor: withAlpha(colors.tint, 0.059) }}>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <Feather name="info" size={18} color={colors.tint} style={{ marginTop: 2 }} />
            <ThemedText variant="caption" style={{ flex: 1 }}>
              <ThemedText variant="caption" color={colors.tint} style={{ fontWeight: "700" }}>
                Demo result —{" "}
              </ThemedText>
              no AI backend is configured yet, so this is a bundled sample, not your photo analysed live.
              Connect an Anthropic key to the Supabase Edge Function for live scans. See{" "}
              <ThemedText variant="caption" color={colors.tint}>
                .env.example
              </ThemedText>
              .
            </ThemedText>
          </View>
        </Card>
      ) : null}

      <Card style={{ marginTop: spacing.lg, borderColor: accent, backgroundColor: `${accent}12` }}>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Feather name="shield" size={20} color={accent} />
          <ThemedText variant="caption" style={{ flex: 1 }}>
            {result.disclaimer}
          </ThemedText>
        </View>
      </Card>

      <SectionHeader title="Visual observations" />
      {result.visualObservations.map((clue) => (
        <View key={clue} style={styles.bullet}>
          <View style={[styles.dot, { backgroundColor: colors.tint }]} />
          <ThemedText variant="body" style={{ flex: 1 }}>
            {clue}
          </ThemedText>
        </View>
      ))}

      {result.redFlags.length > 0 ? (
        <>
          <SectionHeader title="Red flags" />
          <Card style={{ borderColor: colors.danger, gap: spacing.md }}>
            {result.redFlags.map((flag) => (
              <View key={flag} style={{ flexDirection: "row", gap: spacing.md, alignItems: "flex-start" }}>
                <Feather name="alert-triangle" size={15} color={colors.danger} style={{ marginTop: 3 }} />
                <ThemedText variant="caption" style={{ flex: 1 }}>
                  {flag}
                </ThemedText>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <SectionHeader title="Recommended next steps" />
      {result.recommendedNextSteps.map((step, index) => (
        <View key={step} style={styles.bullet}>
          <View style={[styles.stepIndex, { borderColor: colors.cardBorder }]}>
            <ThemedText variant="caption" color={colors.tint} style={{ fontWeight: "700", fontSize: 11 }}>
              {index + 1}
            </ThemedText>
          </View>
          <ThemedText variant="body" style={{ flex: 1 }}>
            {step}
          </ThemedText>
        </View>
      ))}

      {scan.uvObservation ? (
        <>
          <SectionHeader title="UV fluorescence log" />
          <Card>
            <ThemedText variant="body" style={{ fontWeight: "600" }}>
              {FLUORESCENCE_LABEL[scan.uvObservation.fluorescence] ?? scan.uvObservation.fluorescence}
            </ThemedText>
            <ThemedText variant="caption" muted style={{ marginTop: 4 }}>
              Logged {new Date(scan.uvObservation.observedAt).toLocaleDateString()}
            </ThemedText>
          </Card>
        </>
      ) : (
        <Pressable onPress={() => router.push(`/uv-test?scanId=${scan.id}`)} style={{ marginTop: spacing.lg }}>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <Feather name="zap" size={18} color={colors.tint} />
            <ThemedText variant="body" style={{ flex: 1, fontWeight: "600" }}>
              Log a UV fluorescence observation
            </ThemedText>
            <Feather name="chevron-right" size={18} color={colors.textFaint} />
          </Card>
        </Pressable>
      )}

      {result.funFact ? (
        <>
          <SectionHeader title="Did you know" />
          <Card>
            <ThemedText variant="body">{result.funFact}</ThemedText>
          </Card>
        </>
      ) : null}

      {libraryMatch ? (
        <Button
          label={`Open ${libraryMatch.commonName} in Learn`}
          icon="book-open"
          variant="secondary"
          onPress={() => router.push(`/species/${libraryMatch.slug}`)}
          style={{ marginTop: spacing.xl }}
        />
      ) : null}

      <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
        <Button label="Share result" icon="share-2" onPress={shareResult} />
        <Button label="Export PDF report" icon="file-text" variant="secondary" onPress={() => void exportResultPdf(scan)} />
        <Button label="Delete scan" icon="trash-2" variant="danger" onPress={remove} />
      </View>

      <ThemedText variant="caption" muted style={styles.disclaimer}>
        Educational tool — not a certified gemological appraisal. This estimate can be wrong; for anything
        valuable, follow up with the manual tests in Guides and a professional appraisal.
      </ThemedText>

      <HouseInterstitialModal visible={houseAdVisible} onClose={() => setHouseAdVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: "100%", height: 250, borderRadius: radius.xl },
  heroPage: { width: HERO_WIDTH, height: 250, borderRadius: radius.xl },
  sourceTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  bullet: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md, alignItems: "flex-start" },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 9 },
  stepIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  disclaimer: { marginTop: spacing.xl, fontSize: 12, lineHeight: 17, textAlign: "center" },
});
