import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import { Animated, Dimensions, Linking, Modal, Pressable, Share, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText, type IconName } from "@/components/ui";
import { env } from "@/config/env";
import { tap } from "@/lib/feedback";
import { radius, spacing, useTheme, withAlpha } from "@/theme";

const BANNER = require("../../assets/drawer-banner.png");

const { width } = Dimensions.get("window");
const PANEL = Math.min(300, width * 0.82);

interface Item {
  icon: IconName;
  label: string;
  action: (router: ReturnType<typeof useRouter>) => void;
}

const ITEMS: Item[] = [
  { icon: "zap", label: "Go Premium", action: (r) => r.push("/paywall") },
  { icon: "settings", label: "Settings", action: (r) => r.push("/settings") },
  {
    icon: "star",
    label: "Rate Us!",
    action: () =>
      void Linking.openURL("market://details?id=com.appsgurus24.diamondstester").catch(() =>
        Linking.openURL(env.app.siteUrl),
      ),
  },
  { icon: "grid", label: "More Apps", action: () => void Linking.openURL(env.app.siteUrl) },
  {
    icon: "share-2",
    label: "Share",
    action: () => void Share.share({ message: `Diamonds Tester — test any diamond or gemstone in seconds. ${env.app.siteUrl}` }),
  },
  { icon: "shield", label: "Terms & Conditions", action: () => void Linking.openURL(`${env.app.siteUrl}/terms`) },
  { icon: "info", label: "About", action: (r) => r.push("/about") },
];

export function AppDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { colors } = useTheme();
  const slide = useRef(new Animated.Value(-PANEL)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 0 : -PANEL,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  const run = useCallback(
    (item: Item) => {
      tap();
      onClose();
      // Let the drawer close before navigating, so the transition reads cleanly.
      setTimeout(() => item.action(router), 180);
    },
    [onClose, router],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Animated.View
          style={[styles.panel, { backgroundColor: colors.background, transform: [{ translateX: slide }] }]}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={{ flex: 1 }}>
            <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
              {/* Site banner header */}
              <Image source={BANNER} style={styles.banner} contentFit="cover" />

              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />

              {/* Menu */}
              <View style={{ paddingVertical: spacing.md }}>
                {ITEMS.map((item) => (
                  <Pressable
                    key={item.label}
                    onPress={() => run(item)}
                    style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.card : "transparent" }]}
                  >
                    <View style={[styles.rowIcon, { backgroundColor: withAlpha(colors.tint, 0.094) }]}>
                      <Feather name={item.icon} size={17} color={colors.tint} />
                    </View>
                    <ThemedText variant="body" style={{ fontWeight: "500" }}>
                      {item.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              <View style={{ flex: 1 }} />
              <ThemedText variant="caption" muted style={styles.version}>
                Version 1.0.0
              </ThemedText>
            </SafeAreaView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, flexDirection: "row" },
  panel: { width: PANEL, height: "100%" },
  banner: { width: "100%", aspectRatio: 1000 / 460 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  rowIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  version: { textAlign: "center", paddingBottom: spacing.lg, fontSize: 11 },
});
