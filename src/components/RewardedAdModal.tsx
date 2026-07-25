import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from "react-native";

import { Button, ThemedText } from "@/components/ui";
import { CREDITS_PER_QUESTION, grantAdCredits } from "@/lib/chat";
import { success, warn } from "@/lib/feedback";
import { brandGradient, radius, spacing, useTheme } from "@/theme";

const AD_SECONDS = 5;

/**
 * A stand-in for a real rewarded ad. Shows a short countdown "ad", then grants
 * credits via the server RPC. Swap the countdown for react-native-google-mobile-ads
 * later — the reward call (`grantAdCredits`) stays the same.
 */
export function RewardedAdModal({
  visible,
  onClose,
  onRewarded,
}: {
  visible: boolean;
  onClose: () => void;
  onRewarded: (newBalance: number | null) => void;
}) {
  const { colors } = useTheme();
  const [remaining, setRemaining] = useState(AD_SECONDS);
  const [claiming, setClaiming] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible) return;
    setRemaining(AD_SECONDS);
    setClaiming(false);
    timer.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1 && timer.current) {
          clearInterval(timer.current);
          timer.current = null;
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [visible]);

  const claim = useCallback(async () => {
    setClaiming(true);
    try {
      const balance = await grantAdCredits();
      success();
      onRewarded(balance);
    } catch {
      warn();
    } finally {
      setClaiming(false);
      onClose();
    }
  }, [onRewarded, onClose]);

  const done = remaining === 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={done ? onClose : undefined}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Fake "ad" surface */}
          <LinearGradient colors={[...brandGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.adArea}>
            <Feather name="film" size={34} color="rgba(255,255,255,0.9)" />
            <ThemedText variant="heading" color="#fff" style={{ marginTop: spacing.md }}>
              {done ? "Ad finished" : "Advertisement"}
            </ThemedText>
            <ThemedText variant="caption" color="rgba(255,255,255,0.85)">
              {done ? "Claim your reward below" : `Reward in ${remaining}s…`}
            </ThemedText>
          </LinearGradient>

          <ThemedText variant="body" style={{ textAlign: "center", marginTop: spacing.lg }}>
            Watch to earn <ThemedText variant="body" color={colors.tint} style={{ fontWeight: "800" }}>
              {CREDITS_PER_QUESTION} credits
            </ThemedText>
          </ThemedText>

          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            {done ? (
              <Button
                label={claiming ? "Adding…" : `Collect ${CREDITS_PER_QUESTION} credits`}
                icon="gift"
                loading={claiming}
                onPress={claim}
              />
            ) : (
              <View style={styles.waiting}>
                <ActivityIndicator color={colors.tint} />
                <ThemedText variant="caption" muted>
                  Please wait…
                </ThemedText>
              </View>
            )}
            {done ? (
              <Pressable onPress={onClose} style={{ paddingVertical: spacing.sm }}>
                <ThemedText variant="caption" muted style={{ textAlign: "center" }}>
                  No thanks
                </ThemedText>
              </Pressable>
            ) : null}
          </View>

          <ThemedText variant="caption" muted style={styles.note}>
            Backup reward — shown when a video ad isn&apos;t available.
          </ThemedText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  sheet: {
    width: "100%",
    maxWidth: 360,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.xl,
  },
  adArea: { borderRadius: radius.lg, alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl },
  waiting: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: 14 },
  note: { textAlign: "center", marginTop: spacing.md, fontSize: 11 },
});
