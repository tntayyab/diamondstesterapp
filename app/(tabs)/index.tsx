import { Feather } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AdBanner } from "@/components/AdBanner";
import { showAlert } from "@/components/AppAlert";
import { useCreditGate } from "@/components/CreditGate";
import { HamburgerButton } from "@/components/HamburgerButton";
import { ImageStrip } from "@/components/ImageStrip";
import { Button, Card, EmptyState, Screen, SectionHeader, ThemedText, AuthenticityBadge } from "@/components/ui";
import { env } from "@/config/env";
import { howItWorks } from "@/content/reference";
import { scansRemaining, useAuth } from "@/lib/auth";
import { success, warn } from "@/lib/feedback";
import { identifyGemstone, IdentifyError } from "@/lib/identify";
import { captureFromCamera, mergeImagesCapped, pickFromGallery, MAX_IMAGES } from "@/lib/images";
import { addScan, getHistory, guestScansUsed, recordGuestScan, touchStreak, type ScanRecord } from "@/lib/storage";
import { syncAnalysis } from "@/lib/supabase";
import { brandGradient, radius, spacing, useTheme, withAlpha } from "@/theme";

export default function ScanScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, credits, isPro, refreshProfile } = useAuth();
  const creditGate = useCreditGate();

  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [recent, setRecent] = useState<ScanRecord[]>([]);
  const [guestUsed, setGuestUsed] = useState(0);
  /** Staged photos for the next scan (max `MAX_IMAGES`). `images[0]` is the one sent to the AI. */
  const [images, setImages] = useState<string[]>([]);

  const reload = useCallback(async () => {
    setRecent((await getHistory()).slice(0, 3));
    setGuestUsed(await guestScansUsed());
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  /**
   * Runs identification on `photos[0]` (the primary/best photo) but stores the
   * whole set, so the result screen can show a thumbnail carousel of every
   * angle the user captured (stone, setting markings, receipt, etc.).
   */
  const runIdentification = useCallback(
    async (photos: string[]) => {
      const primary = photos[0];
      setPreview(primary);
      setBusy(true);

      try {
        const response = await identifyGemstone(primary, isPro);

        const record: ScanRecord = {
          id: Crypto.randomUUID(),
          imageUri: primary,
          imageUris: photos,
          result: response.result,
          createdAt: new Date().toISOString(),
          source: response.source,
        };

        await addScan(record);
        await touchStreak();

        if (user) {
          // The Edge Function already debited credits and inserted the row;
          // only the local-dev and demo paths need a client-side sync.
          if (response.source !== "edge") {
            await syncAnalysis(user.id, response.result, 0, photos);
          }
          await refreshProfile();
        } else {
          setGuestUsed(await recordGuestScan());
        }

        success();
        await reload();
        setImages([]);
        router.push(`/result/${record.id}`);
      } catch (error) {
        warn();
        if (error instanceof IdentifyError && error.code === "no_credits") {
          creditGate.showOutOfCredits({ message: error.message });
        } else if (error instanceof IdentifyError && error.code === "guest_limit") {
          showAlert("Free scans used", error.message, [
            { text: "Not now", style: "cancel" },
            { text: "Sign in", onPress: () => router.push("/sign-in") },
          ]);
        } else {
          showAlert(
            "Scan failed",
            error instanceof Error ? error.message : "Something went wrong. Please try again.",
            [{ text: "OK" }],
            { mood: "sad" },
          );
        }
      } finally {
        setBusy(false);
        setPreview(null);
      }
    },
    [isPro, user, refreshProfile, reload, router, creditGate],
  );

  // A genuine live capture from the device camera — never a placeholder or
  // pre-recorded clip. See the demo-result badge on the result screen for the
  // only case where this app shows a result that isn't from your photo.
  const addFromCamera = useCallback(async () => {
    const uri = await captureFromCamera();
    if (uri) setImages((current) => mergeImagesCapped(current, [uri]));
  }, []);

  const addFromGallery = useCallback(async () => {
    const uris = await pickFromGallery(MAX_IMAGES);
    if (uris.length) setImages((current) => mergeImagesCapped(current, uris));
  }, []);

  /** First tap: choose camera or gallery. Once photos are staged, "+" re-opens this same chooser. */
  const addPhotos = useCallback(() => {
    showAlert("Add a photo", "Take a new photo or choose from your gallery.", [
      { text: "Cancel", style: "cancel" },
      { text: "Camera", onPress: () => void addFromCamera() },
      { text: "Gallery", onPress: () => void addFromGallery() },
    ]);
  }, [addFromCamera, addFromGallery]);

  const removeImage = useCallback((index: number) => {
    setImages((current) => current.filter((_, i) => i !== index));
  }, []);

  const scanStaged = useCallback(() => {
    if (images.length === 0) return;
    void runIdentification(images);
  }, [images, runIdentification]);

  const guestLeft = Math.max(0, env.app.guestFreeScans - guestUsed);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <HamburgerButton />
        <View style={{ flex: 1 }}>
          <ThemedText variant="label" muted>
            Diamonds Tester
          </ThemedText>
          <ThemedText variant="title" style={{ marginTop: 2 }}>
            Scan a diamond or gemstone
          </ThemedText>
        </View>
        <Pressable onPress={() => router.push("/search")} hitSlop={10}>
          <Feather name="search" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Scan quota */}
      <Card style={{ marginTop: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <Feather name={user ? "zap" : "gift"} size={18} color={colors.tint} />
          <View style={{ flex: 1 }}>
            <ThemedText variant="caption">
              {user
                ? `${credits ?? 0} credits · ${scansRemaining(credits)} scans left`
                : `${guestLeft} free ${guestLeft === 1 ? "scan" : "scans"} left today`}
            </ThemedText>
            <ThemedText variant="caption" muted style={{ fontSize: 12 }}>
              {user ? `${env.app.creditsPerScan} credits per scan` : "Sign in for 30 free credits"}
            </ThemedText>
          </View>
          <Button
            label={user ? "Upgrade" : "Sign in"}
            variant="secondary"
            onPress={() => router.push(user ? "/paywall" : "/sign-in")}
          />
        </View>
      </Card>

      {/* Capture surface */}
      <LinearGradient
        colors={[...brandGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.capture}
      >
        {busy && preview ? (
          <View style={styles.captureInner}>
            <Image source={{ uri: preview }} style={styles.previewImage} contentFit="cover" />
            <ThemedText variant="heading" color="#fff" style={{ marginTop: spacing.lg }}>
              Analysing…
            </ThemedText>
            <ThemedText variant="caption" color="rgba(255,255,255,0.85)">
              Reading facet pattern, brilliance, inclusions and colour
            </ThemedText>
          </View>
        ) : (
          <View style={styles.captureInner}>
            <View style={styles.captureIcon}>
              <Feather name="camera" size={30} color="#fff" />
            </View>
            <ThemedText variant="heading" color="#fff">
              Point, shoot, get an estimate
            </ThemedText>
            <ThemedText variant="caption" color="rgba(255,255,255,0.85)" style={{ textAlign: "center" }}>
              Bright, even light and a close-up on the stone give the most useful result.
            </ThemedText>
          </View>
        )}
      </LinearGradient>

      {images.length > 0 ? (
        <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
          <ThemedText variant="caption" muted>
            {images.length} of {MAX_IMAGES} photos · the first is used for the AI verdict, the rest are saved
            with the result
          </ThemedText>
          <ImageStrip images={images} onRemove={removeImage} onAdd={addPhotos} max={MAX_IMAGES} />
          <Button
            label={`Analyse ${images.length} photo${images.length === 1 ? "" : "s"}`}
            icon="zap"
            onPress={scanStaged}
            loading={busy}
          />
          <Button label="Clear" variant="secondary" onPress={() => setImages([])} disabled={busy} />
        </View>
      ) : (
        <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
          <Button label="Take a photo" icon="camera" onPress={addFromCamera} loading={busy} />
          <Button label="Choose from gallery" icon="image" variant="secondary" onPress={addFromGallery} disabled={busy} />
        </View>
      )}

      {/* Ask the AI gemologist */}
      <Pressable onPress={() => router.push("/chat")} style={{ marginTop: spacing.lg }}>
        <Card style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View style={[styles.chatIcon, { backgroundColor: withAlpha(colors.tint, 0.102) }]}>
            <Feather name="message-circle" size={20} color={colors.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="body" style={{ fontWeight: "700" }}>
              Ask the Gemologist
            </ThemedText>
            <ThemedText variant="caption" muted style={{ fontSize: 12 }}>
              Chat with our AI about any diamond or gemstone question
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textFaint} />
        </Card>
      </Pressable>

      {/* Quick tools */}
      <SectionHeader title="Quick tools" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        <Tool icon="zap" label="UV test" onPress={() => router.push("/uv-test")} />
        <Tool icon="dollar-sign" label="Value estimator" onPress={() => router.push("/calculator")} />
        <Tool icon="book-open" label="Guides" onPress={() => router.push("/guides")} />
        <Tool icon="git-merge" label="Compare" onPress={() => router.push("/compare")} />
        <Tool icon="award" label="Quiz" onPress={() => router.push("/quiz")} />
      </ScrollView>

      {/* Recent scans */}
      <SectionHeader
        title="Recent scans"
        action={
          recent.length ? (
            <Pressable onPress={() => router.push("/history")}>
              <ThemedText variant="caption" color={colors.tint}>
                See all
              </ThemedText>
            </Pressable>
          ) : undefined
        }
      />

      {recent.length === 0 ? (
        <EmptyState
          icon="camera"
          title="No scans yet"
          body="Photograph a diamond or gemstone and your results will collect here, available offline."
        />
      ) : (
        recent.map((scan) => (
          <Card key={scan.id} onPress={() => router.push(`/result/${scan.id}`)} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              {scan.imageUri ? (
                <Image source={{ uri: scan.imageUri }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.thumb, { backgroundColor: colors.backgroundElevated }]} />
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <ThemedText variant="heading" numberOfLines={1} style={{ fontSize: 16 }}>
                  {scan.result.stoneType}
                </ThemedText>
                <ThemedText variant="caption" muted numberOfLines={1}>
                  {scan.result.confidence}% confidence
                  {scan.source === "demo" ? " · Demo result" : ""}
                </ThemedText>
                <AuthenticityBadge level={scan.result.authenticityLevel} />
              </View>
              <Feather name="chevron-right" size={18} color={colors.textFaint} />
            </View>
          </Card>
        ))
      )}

      {/* How it works */}
      <SectionHeader title="How scanning works" />
      {howItWorks.map((step, index) => (
        <View key={step.title} style={styles.step}>
          <View style={[styles.stepIndex, { borderColor: colors.cardBorder }]}>
            <ThemedText variant="caption" color={colors.tint} style={{ fontWeight: "700" }}>
              {index + 1}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="body" style={{ fontWeight: "600" }}>
              {step.title}
            </ThemedText>
            <ThemedText variant="caption" muted>
              {step.desc}
            </ThemedText>
          </View>
        </View>
      ))}

      <ThemedText variant="caption" muted style={styles.disclaimer}>
        Educational tool — not a certified gemological appraisal. Scans are a visual estimate only; the
        camera feed is always live and never a demo recording. For anything valuable, follow up with the
        manual tests in Guides and a professional appraisal.
      </ThemedText>

      <AdBanner />
    </Screen>
  );
}

function Tool({
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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tool,
        { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Feather name={icon} size={20} color={colors.tint} />
      <ThemedText variant="caption" numberOfLines={1} style={{ fontSize: 12, textAlign: "center" }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  chatIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  capture: {
    marginTop: spacing.lg,
    borderRadius: radius.xl,
    minHeight: 230,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  captureInner: { alignItems: "center", gap: spacing.sm },
  captureIcon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  previewImage: { width: 110, height: 110, borderRadius: radius.lg },
  tool: {
    width: 100,
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  thumb: { width: 58, height: 58, borderRadius: radius.md },
  step: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, alignItems: "flex-start" },
  stepIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  disclaimer: { marginTop: spacing.xl, fontSize: 12, lineHeight: 17, textAlign: "center" },
});
