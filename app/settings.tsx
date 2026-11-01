import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import React, { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, Share, StyleSheet, Switch, TextInput, View } from "react-native";
import { showAlert } from "@/components/AppAlert";

import { Card, Chip, Row, Screen, SectionHeader, ThemedText } from "@/components/ui";
import { env } from "@/config/env";
import { cancelDailyReminder, reminderScheduled, scheduleDailyReminder } from "@/lib/notifications";
import { KEYS, removeItem } from "@/lib/storage";
import { tap } from "@/lib/feedback";
import {
  CUSTOM_BACKGROUNDS,
  CUSTOM_TEXTS,
  normalizeHex,
  radius,
  spacing,
  useTheme,
  withAlpha,
  type ThemePreference,
} from "@/theme";

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const PACKAGE =
  (Constants.expoConfig as { android?: { package?: string } } | null)?.android?.package ??
  "com.appsgurus24.diamondstester";
const APP_VERSION = Constants.expoConfig?.version ?? "1.2.2";
const PLAY_URL = `https://play.google.com/store/apps/details?id=${PACKAGE}`;

export default function SettingsScreen() {
  const { colors, preference, setPreference, custom, setCustom } = useTheme();
  const [reminder, setReminder] = useState(false);

  const replayOnboarding = useCallback(async () => {
    await removeItem(KEYS.onboarded);
    showAlert("Intro reset", "The welcome screens will show next time you restart the app.");
  }, []);

  useEffect(() => {
    void reminderScheduled().then(setReminder);
  }, []);

  const toggleReminder = useCallback(async (value: boolean) => {
    if (!value) {
      await cancelDailyReminder();
      setReminder(false);
      return;
    }

    const scheduled = await scheduleDailyReminder(18);
    setReminder(scheduled);
    if (!scheduled) {
      showAlert(
        "Reminders unavailable",
        "Enable notification permission for Diamonds Tester, or build a dev client — reminders do not work in Expo Go on Android.",
      );
    }
  }, []);

  const clearData = useCallback(() => {
    showAlert(
      "Clear local data?",
      "Scan history, journal, saved species and streak will be deleted from this device. Your account is unaffected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear everything",
          style: "destructive",
          onPress: async () => {
            await Promise.all(Object.values(KEYS).map(removeItem));
            showAlert("Cleared", "Local data has been removed.");
          },
        },
      ],
    );
  }, []);

  const rateApp = useCallback(() => {
    tap();
    void Linking.openURL(PLAY_URL);
  }, []);

  const shareApp = useCallback(() => {
    tap();
    void Share.share({
      message: `Diamonds Tester — test any diamond in seconds. ${PLAY_URL}`,
    });
  }, []);

  const openPrivacy = useCallback(() => {
    tap();
    void Linking.openURL(`${env.app.siteUrl}/privacy`);
  }, []);

  return (
    <Screen scroll>
      <SectionHeader title="Appearance" />
      <Card>
        <ThemedText variant="body" style={{ fontWeight: "600", marginBottom: spacing.md }}>
          Theme
        </ThemedText>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {THEMES.map((theme) => (
            <Chip
              key={theme.value}
              label={theme.label}
              active={preference === theme.value}
              onPress={() => setPreference(theme.value)}
            />
          ))}
        </View>
      </Card>

      {/* Custom colours — override the theme's background / text with your own. */}
      <Card style={{ marginTop: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <ThemedText variant="body" style={{ fontWeight: "600", flex: 1 }}>
            Custom colours
          </ThemedText>
          {custom.background || custom.text ? (
            <Chip label="Reset" onPress={() => setCustom({ background: null, text: null })} />
          ) : null}
        </View>
        <ThemedText variant="caption" muted style={{ fontSize: 12, marginTop: 4, marginBottom: spacing.md }}>
          Pick your own background and text colour, or type a hex code. Leave unset to use the theme above.
        </ThemedText>

        <ColorPicker
          title="Background"
          swatches={CUSTOM_BACKGROUNDS}
          value={custom.background}
          onChange={(hex) => setCustom({ ...custom, background: hex })}
        />
        <View style={{ height: spacing.lg }} />
        <ColorPicker
          title="Text"
          swatches={CUSTOM_TEXTS}
          value={custom.text}
          onChange={(hex) => setCustom({ ...custom, text: hex })}
        />
      </Card>

      <SectionHeader title="Notifications" />
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <ThemedText variant="body" style={{ fontWeight: "600" }}>
              Daily spotting reminder
            </ThemedText>
            <ThemedText variant="caption" muted style={{ fontSize: 12, marginTop: 2 }}>
              A nudge at 6pm to keep your streak alive.
            </ThemedText>
          </View>
          <Switch
            value={reminder}
            onValueChange={(value) => void toggleReminder(value)}
            trackColor={{ true: colors.tint, false: colors.border }}
          />
        </View>
      </Card>

      <SectionHeader title="Support" />
      <Card style={{ paddingVertical: 0 }}>
        <Row icon="star" label="Rate Diamonds Tester" onPress={rateApp} />
        <Divider />
        <Row icon="share-2" label="Share the app" onPress={shareApp} />
        <Divider />
        <Row icon="shield" label="Privacy policy" onPress={openPrivacy} />
      </Card>

      <SectionHeader title="Data" />
      <Card style={{ paddingVertical: 0 }}>
        <Row icon="play-circle" label="Show intro again" onPress={replayOnboarding} />
        <Divider />
        <Row icon="trash-2" label="Clear local data" onPress={clearData} destructive />
      </Card>

      <ThemedText variant="caption" muted style={styles.footer}>
        Diamonds Tester v{APP_VERSION} · {env.app.creditsPerScan} credits per scan
      </ThemedText>
    </Screen>
  );
}

/** A row of preset colour swatches plus a hex-code input, with the active swatch ringed. */
function ColorPicker({
  title,
  swatches,
  value,
  onChange,
}: {
  title: string;
  swatches: string[];
  value: string | null;
  onChange: (hex: string | null) => void;
}) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState(value ?? "");

  // Keep the hex field in sync when a swatch is tapped or the value is reset.
  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  const commitDraft = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) {
      onChange(null);
      return;
    }
    const hex = normalizeHex(trimmed);
    if (hex) {
      onChange(hex);
      setDraft(hex);
    } else {
      setDraft(value ?? ""); // invalid — revert
    }
  }, [draft, onChange, value]);

  const activeHex = value ? normalizeHex(value) : null;

  return (
    <View>
      <ThemedText variant="label" muted style={{ marginBottom: spacing.sm }}>
        {title}
      </ThemedText>
      <View style={styles.swatchRow}>
        {swatches.map((hex) => {
          const active = activeHex === hex.toLowerCase();
          return (
            <Swatch
              key={hex}
              hex={hex}
              active={active}
              onPress={() => {
                tap();
                onChange(hex);
              }}
            />
          );
        })}
      </View>
      <View
        style={[styles.hexBox, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
      >
        <View style={[styles.hexPreview, { backgroundColor: activeHex ?? colors.card, borderColor: colors.cardBorder }]} />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onEndEditing={commitDraft}
          onSubmitEditing={commitDraft}
          placeholder="#RRGGBB"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={7}
          style={[styles.hexInput, { color: colors.text }]}
        />
        {value ? (
          <Feather name="check-circle" size={16} color={colors.tint} />
        ) : (
          <ThemedText variant="caption" muted style={{ fontSize: 11 }}>
            default
          </ThemedText>
        )}
      </View>
    </View>
  );
}

function Swatch({ hex, active, onPress }: { hex: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={[styles.swatchRing, { borderColor: active ? colors.tint : "transparent" }]}
    >
      <View style={[styles.swatch, { backgroundColor: hex, borderColor: withAlpha(colors.text, 0.15) }]} />
    </Pressable>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}

const styles = StyleSheet.create({
  footer: { textAlign: "center", marginTop: spacing.xxl, fontSize: 11 },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  swatchRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth },
  hexBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.md,
  },
  hexPreview: { width: 22, height: 22, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth },
  hexInput: { flex: 1, paddingVertical: 12, fontSize: 15, letterSpacing: 0.5 },
});
