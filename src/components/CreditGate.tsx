import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { RewardedAdModal } from "@/components/RewardedAdModal";
import { Button, ThemedText } from "@/components/ui";
import { adsAvailable, showRewardedAd } from "@/lib/ads";
import { useAuth } from "@/lib/auth";
import { CREDITS_PER_QUESTION, grantAdCredits } from "@/lib/chat";
import { success, tap } from "@/lib/feedback";
import { radius, spacing, useTheme, withAlpha } from "@/theme";

/**
 * App-wide "you need credits" gate. Anywhere an action needs credits, call
 * `useCreditGate().showOutOfCredits(...)`; the user can then watch a rewarded ad
 * to earn credits (falling back to the simulated reward) or open the paywall.
 * Lives inside AuthProvider so it can refresh the balance after a reward.
 */
interface OutOfCreditsOptions {
  message?: string;
  /** Called after credits are successfully added (e.g. to retry the action). */
  onCredited?: () => void;
}

interface CreditGateApi {
  showOutOfCredits: (opts?: OutOfCreditsOptions) => void;
}

const CreditGateContext = createContext<CreditGateApi>({ showOutOfCredits: () => {} });
export const useCreditGate = () => useContext(CreditGateContext);

export function CreditGateProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const [opts, setOpts] = useState<OutOfCreditsOptions | null>(null);
  const [adOpen, setAdOpen] = useState(false);
  const [adLoading, setAdLoading] = useState(false);

  const showOutOfCredits = useCallback((o?: OutOfCreditsOptions) => setOpts(o ?? {}), []);
  const close = useCallback(() => setOpts(null), []);

  const onGranted = useCallback(async () => {
    await refreshProfile();
    opts?.onCredited?.();
    close();
  }, [refreshProfile, opts, close]);

  const watchAd = useCallback(async () => {
    tap();
    if (!adsAvailable()) {
      setAdOpen(true);
      return;
    }
    setAdLoading(true);
    try {
      const res = await showRewardedAd();
      if (res.earned) {
        await grantAdCredits();
        success();
        await onGranted();
      } else if (!res.shown) {
        setAdOpen(true); // no fill → simulated reward so the user is never stuck
      }
    } catch {
      setAdOpen(true);
    } finally {
      setAdLoading(false);
    }
  }, [onGranted]);

  const api = useMemo(() => ({ showOutOfCredits }), [showOutOfCredits]);

  return (
    <CreditGateContext.Provider value={api}>
      {children}

      <Modal transparent visible={opts !== null} animationType="fade" onRequestClose={close}>
        <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.badge, { backgroundColor: withAlpha(colors.tint, 0.102) }]}>
              <Feather name="zap" size={26} color={colors.tint} />
            </View>
            <ThemedText variant="heading" style={{ textAlign: "center", marginTop: spacing.md }}>
              Out of credits
            </ThemedText>
            <ThemedText variant="body" muted style={{ textAlign: "center", marginTop: spacing.sm, lineHeight: 21 }}>
              {opts?.message ??
                "You need more credits to continue. Watch a short ad to earn some — or upgrade for more."}
            </ThemedText>

            <Button
              label={adLoading ? "Loading ad…" : `Watch ad · +${CREDITS_PER_QUESTION} credits`}
              icon="film"
              loading={adLoading}
              onPress={watchAd}
              style={{ marginTop: spacing.lg }}
            />

            <Pressable
              onPress={() => {
                close();
                router.push("/paywall");
              }}
              style={styles.link}
              hitSlop={8}
            >
              <ThemedText variant="body" color={colors.tint} style={{ fontWeight: "700" }}>
                See upgrade plans
              </ThemedText>
            </Pressable>

            <Pressable onPress={close} style={styles.link} hitSlop={8}>
              <ThemedText variant="caption" muted>
                Not now
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <RewardedAdModal visible={adOpen} onClose={() => setAdOpen(false)} onRewarded={() => void onGranted()} />
    </CreditGateContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.xl,
    alignItems: "center",
  },
  badge: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  link: { paddingVertical: spacing.sm, marginTop: spacing.xs },
});
