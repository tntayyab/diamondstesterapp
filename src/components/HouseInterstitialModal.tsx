import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { Button, ThemedText } from "@/components/ui";
import { tap } from "@/lib/feedback";
import { brandGradient, radius, spacing, useTheme } from "@/theme";

/**
 * Text-only "house ad" shown at the same natural breaks a real AdMob
 * interstitial would use (see `presentInterstitial` in `@/lib/ads`), for when
 * no real ad is available (no AdMob keys yet, or running in Expo Go).
 * Immediately dismissible — no fake countdown pretending to be a real ad.
 */
export function HouseInterstitialModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <LinearGradient colors={[...brandGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
            <Feather name="zap" size={26} color="#fff" />
          </LinearGradient>

          <ThemedText variant="heading" style={{ textAlign: "center", marginTop: spacing.md }}>
            Enjoying Diamonds Tester?
          </ThemedText>
          <ThemedText variant="body" muted style={{ textAlign: "center", marginTop: spacing.sm, lineHeight: 21 }}>
            Go Premium to remove ads, get unlimited scans and unlock every guide.
          </ThemedText>

          <Button
            label="Go Premium"
            icon="zap"
            onPress={() => {
              tap();
              onClose();
              router.push("/paywall");
            }}
            style={{ marginTop: spacing.lg, alignSelf: "stretch" }}
          />

          <Pressable onPress={onClose} style={styles.link} hitSlop={8}>
            <ThemedText variant="caption" muted>
              Continue
            </ThemedText>
          </Pressable>

          <ThemedText variant="caption" muted style={styles.note}>
            Advertisement
          </ThemedText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  sheet: {
    width: "100%",
    maxWidth: 360,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.xl,
    alignItems: "center",
  },
  badge: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  link: { paddingVertical: spacing.sm, marginTop: spacing.xs },
  note: { textAlign: "center", marginTop: spacing.md, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
});
