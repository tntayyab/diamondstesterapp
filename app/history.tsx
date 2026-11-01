import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Button, Card, EmptyState, Screen, ThemedText, AuthenticityBadge } from "@/components/ui";
import { appImages } from "@/content/appImages";
import { exportHistoryCsv } from "@/lib/export";
import { getHistory, type ScanRecord } from "@/lib/storage";
import { radius, spacing, useTheme } from "@/theme";

export default function HistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [history, setHistory] = useState<ScanRecord[]>([]);

  useEffect(() => {
    void getHistory().then(setHistory);
  }, []);

  if (history.length === 0) {
    return (
      <Screen scroll>
        <EmptyState
          icon="clock"
          image={appImages.emptyScan}
          title="No scans yet"
          body="Every identification you make is saved here on this device, available offline."
          action={<Button label="Scan a diamond" icon="camera" onPress={() => router.push("/(tabs)")} />}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <ThemedText variant="caption" muted style={{ flex: 1 }}>
          {history.length} {history.length === 1 ? "scan" : "scans"}
        </ThemedText>
        <Pressable onPress={() => void exportHistoryCsv(history)} hitSlop={10}>
          <Feather name="download" size={19} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={{ marginTop: spacing.lg }}>
        {history.map((scan) => (
          <Card key={scan.id} onPress={() => router.push(`/result/${scan.id}`)} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              {scan.imageUri ? (
                <Image source={{ uri: scan.imageUri }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.thumb, { backgroundColor: colors.backgroundElevated }]} />
              )}

              <View style={{ flex: 1, gap: 4 }}>
                <ThemedText variant="body" style={{ fontWeight: "600" }} numberOfLines={1}>
                  {scan.result.stoneType}
                </ThemedText>
                <ThemedText variant="caption" muted style={{ fontSize: 12 }}>
                  {new Date(scan.createdAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </ThemedText>
                <AuthenticityBadge level={scan.result.authenticityLevel} />
              </View>

              <Feather name="chevron-right" size={17} color={colors.textFaint} />
            </View>
          </Card>
        ))}
      </View>

      <Button
        label="Export as CSV"
        icon="download"
        variant="secondary"
        onPress={() => void exportHistoryCsv(history)}
        style={{ marginTop: spacing.lg }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 56, height: 56, borderRadius: radius.md },
});
