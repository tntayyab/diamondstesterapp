import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";
import { showAlert } from "@/components/AppAlert";

import { Card, Chip, Row, Screen, SectionHeader, ThemedText } from "@/components/ui";
import { env, identifyEndpoint, missingConfig } from "@/config/env";
import { cancelDailyReminder, reminderScheduled, scheduleDailyReminder } from "@/lib/notifications";
import { KEYS, removeItem } from "@/lib/storage";
import { spacing, useTheme, type ThemePreference } from "@/theme";

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useTheme();
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

  const gaps = missingConfig();
  const endpoint = identifyEndpoint();

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

      <SectionHeader title="Configuration" />
      <Card style={{ gap: spacing.md }}>
        <Config label="Supabase" ok={env.supabase.configured} detail={env.supabase.url || "not set"} />
        <Config
          label="AI backend"
          ok={Boolean(endpoint || env.ai.insecureDirectKey)}
          detail={
            endpoint
              ? "Supabase Edge Function"
              : env.ai.insecureDirectKey
                ? "Direct Anthropic call (dev only)"
                : "demo results only"
          }
        />
        <Config label="RevenueCat" ok={env.purchases.configured} detail={env.purchases.configured ? "keys set" : "not set"} />
        <Config label="Free model" ok detail={env.ai.modelFree} />
        <Config label="Pro model" ok detail={env.ai.modelPro} />

        {gaps.length > 0 ? (
          <ThemedText variant="caption" muted style={{ marginTop: spacing.sm, fontSize: 12 }}>
            Missing: {gaps.join(", ")}. See .env.example for how to obtain each one.
          </ThemedText>
        ) : null}
      </Card>

      <SectionHeader title="Data" />
      <Card style={{ paddingVertical: 0 }}>
        <Row icon="play-circle" label="Show intro again" onPress={replayOnboarding} />
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
        <Row icon="trash-2" label="Clear local data" onPress={clearData} destructive />
      </Card>

      <ThemedText variant="caption" muted style={styles.footer}>
        Diamonds Tester v1.0.0 · {env.app.creditsPerScan} credits per scan
      </ThemedText>
    </Screen>
  );
}

function Config({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <Feather
        name={ok ? "check-circle" : "alert-circle"}
        size={15}
        color={ok ? colors.tint : colors.textFaint}
      />
      <ThemedText variant="caption" style={{ width: 96 }}>
        {label}
      </ThemedText>
      <ThemedText variant="caption" muted numberOfLines={1} style={{ flex: 1, fontSize: 12 }}>
        {detail}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { textAlign: "center", marginTop: spacing.xxl, fontSize: 11 },
});
