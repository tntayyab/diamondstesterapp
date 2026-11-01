import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";

import { showAlert } from "@/components/AppAlert";
import { ScreenHero } from "@/components/ScreenHero";
import { Screen, ThemedText } from "@/components/ui";
import { appImages } from "@/content/appImages";
import { env } from "@/config/env";
import { adFreeTier, freeTier, pricingTiers } from "@/content/pricing";
import { refreshAdFree, useAdFree } from "@/lib/adFree";
import { useAuth } from "@/lib/auth";
import { success, tap } from "@/lib/feedback";
import {
  billingUnavailableReason,
  getPackages,
  purchase,
  restore,
  type PurchasePackage,
} from "@/lib/purchases";
import { radius, spacing, useTheme, withAlpha } from "@/theme";

// Seconds before the close (X) button becomes tappable — a gentle cooldown that
// nudges the user to read the offer first (ported from the SwiftUI PurchaseView).
const COOLDOWN_SECONDS = 3;

/** A row on the paywall: a credit tier, or the standalone Ad-Free add-on. */
interface PlanRow {
  kind: "credit" | "adfree";
  name: string;
  firstMonth: number;
  regular: number;
  highlighted: boolean;
  subLine: string;
  /** The RevenueCat package to purchase, or undefined until offerings load. */
  raw: unknown;
  priceString?: string;
}

// Premium benefits shown under the hero. Kept accurate to what a paid plan gives.
const PREMIUM_FEATURES: { icon: React.ComponentProps<typeof Feather>["name"]; title: string }[] = [
  { icon: "zap", title: "Full AI diamond & gemstone testing" },
  { icon: "refresh-cw", title: "Fresh scan credits every month" },
  { icon: "shield", title: "Simulant alerts — moissanite, CZ & more" },
  { icon: "award", title: "Priority AI · faster, sharper results" },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, profile, refreshProfile } = useAuth();
  const adFree = useAdFree();
  const currentPlan = (profile?.plan ?? "free").toLowerCase();

  /** Does this plan row match what the user already has active this month? */
  const isCurrent = (plan: PlanRow) =>
    plan.kind === "adfree" ? adFree : currentPlan !== "free" && currentPlan === plan.name.toLowerCase();

  const [packages, setPackages] = useState<PurchasePackage[]>([]);
  const [rawPackages, setRawPackages] = useState<unknown[]>([]);
  // Default selection: the "most popular" (highlighted) tier, else the middle one.
  const [selected, setSelected] = useState(() => {
    const i = pricingTiers.findIndex((t) => t.highlighted);
    return i >= 0 ? i : Math.min(1, pricingTiers.length - 1);
  });
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState<string | null>(billingUnavailableReason());
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    void getPackages().then(({ packages: list, raw }) => {
      setPackages(list);
      setRawPackages(raw);
      setUnavailable(billingUnavailableReason());
    });
  }, []);

  // Reveal the close button after a short cooldown.
  useEffect(() => {
    const t = setTimeout(() => setCanClose(true), COOLDOWN_SECONDS * 1000);
    return () => clearTimeout(t);
  }, []);

  // The plans shown on the paywall: the three credit tiers plus the standalone
  // Ad-Free add-on. Every row is matched to its RevenueCat package by PRODUCT ID
  // ("diamonds_starter/explorer/pro", "adfree") rather than by position, so
  // re-ordering the packages in the RevenueCat dashboard can never mismatch a
  // plan's price/credits. Each falls back to its index if the id isn't found
  // (e.g. in Expo Go where no packages load).
  const plans = useMemo<PlanRow[]>(() => {
    const idxByProduct = (needle: string, fallback: number) => {
      const found = packages.findIndex((p) => `${p.productId} ${p.identifier}`.toLowerCase().includes(needle));
      return found >= 0 ? found : fallback;
    };

    const rows: PlanRow[] = pricingTiers.map((tier, i) => {
      const idx = idxByProduct(`diamonds_${tier.name.toLowerCase()}`, i);
      return {
        kind: "credit",
        name: tier.name,
        firstMonth: tier.firstMonth,
        regular: tier.regular,
        highlighted: Boolean(tier.highlighted),
        subLine: `${tier.ids} · ${tier.credits} credits`,
        raw: rawPackages[idx] as unknown,
        priceString: packages[idx]?.priceString,
      };
    });

    const adIdx = packages.findIndex((p) => /ad[\s._-]?free/i.test(`${p.productId} ${p.identifier}`));
    const idx = adIdx >= 0 ? adIdx : pricingTiers.length;
    rows.push({
      kind: "adfree",
      name: adFreeTier.name,
      firstMonth: adFreeTier.firstMonth,
      regular: adFreeTier.regular,
      highlighted: false,
      subLine: "Removes all ads · no scan credits",
      raw: rawPackages[idx] as unknown,
      priceString: packages[idx]?.priceString,
    });

    return rows;
  }, [packages, rawPackages]);

  const buy = useCallback(async () => {
    if (!user) {
      showAlert("Sign in first", "Create an account so your plan follows you across devices.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign in", onPress: () => router.replace("/sign-in") },
      ]);
      return;
    }
    const row = plans[selected];
    if (!row?.raw) return;
    // Already own this exact plan this month — don't let them pay twice for it.
    const rowIsCurrent = row.kind === "adfree" ? adFree : currentPlan !== "free" && currentPlan === row.name.toLowerCase();
    if (rowIsCurrent) {
      showAlert(
        "You already have this",
        row.kind === "adfree"
          ? "Ad-Free is already active on your account. Manage it anytime in Google Play → Subscriptions."
          : `You're already on the ${row.name} plan this month. Pick a different plan to switch, or manage it in Google Play → Subscriptions.`,
      );
      return;
    }
    setBusy(true);
    try {
      if (await purchase(row.raw)) {
        success();
        if (row.kind === "adfree") {
          await refreshAdFree();
          showAlert("You're ad-free 🎉", "Banner and full-screen ads are now switched off. Enjoy!");
        } else {
          await refreshProfile();
          showAlert("Welcome to Pro", "Your plan is active — fresh credits are on your account.");
        }
        router.back();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/cancel/i.test(message)) showAlert("Purchase failed", message || "Please try again.");
    } finally {
      setBusy(false);
    }
  }, [user, plans, selected, refreshProfile, router, adFree, currentPlan]);

  const handleRestore = useCallback(async () => {
    setBusy(true);
    try {
      const restored = await restore();
      await refreshProfile();
      await refreshAdFree();
      showAlert(
        restored ? "Purchases restored" : "Nothing to restore",
        restored ? "Your plan is active again." : "No active subscription found for this account.",
      );
    } finally {
      setBusy(false);
    }
  }, [refreshProfile]);

  const openTerms = useCallback(() => {
    showAlert("Terms & Privacy", "Open on diamondstester.com?", [
      { text: "Cancel", style: "cancel" },
      { text: "Privacy", onPress: () => void Linking.openURL(`${env.app.siteUrl}/privacy`) },
      { text: "Terms", onPress: () => void Linking.openURL(`${env.app.siteUrl}/terms`) },
    ]);
  }, []);

  const selectedPlan = plans[selected];
  const blocked = busy || Boolean(unavailable) || !selectedPlan?.raw;
  const ctaLabel = busy ? "Please wait…" : `Get ${selectedPlan?.name ?? "Pro"}`;

  return (
    <Screen scroll edges={["top", "bottom"]}>
      {/* Close — cooldown ring first, then a tappable X */}
      <View style={styles.closeRow}>
        {canClose ? (
          <Pressable
            onPress={() => {
              tap();
              router.back();
            }}
            hitSlop={14}
            style={styles.closeBtn}
          >
            <Feather name="x" size={22} color={colors.textMuted} />
          </Pressable>
        ) : (
          <View style={styles.closeBtn}>
            <Feather name="circle" size={18} color={withAlpha(colors.textFaint, 0.35)} />
          </View>
        )}
      </View>

      {/* Hero — premium diamond banner */}
      <ScreenHero image={appImages.paywallHero} height={170} />
      <ThemedText variant="title" style={{ textAlign: "center", fontSize: 28 }}>
        Unlock Premium Access
      </ThemedText>

      {/* Features */}
      <View style={{ gap: spacing.md, marginTop: spacing.xl, paddingHorizontal: spacing.sm }}>
        {PREMIUM_FEATURES.map((f) => (
          <View key={f.title} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <Feather name={f.icon} size={22} color={colors.tint} />
            <ThemedText variant="body" style={{ flex: 1 }}>
              {f.title}
            </ThemedText>
          </View>
        ))}
      </View>

      {unavailable ? (
        <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Feather name="info" size={16} color={colors.textMuted} />
          <ThemedText variant="caption" muted style={{ flex: 1 }}>
            {unavailable}
          </ThemedText>
        </View>
      ) : null}

      {/* Current subscription status */}
      {currentPlan !== "free" || adFree ? (
        <View style={[styles.currentBar, { backgroundColor: withAlpha(colors.tint, 0.08), borderColor: withAlpha(colors.tint, 0.3) }]}>
          <Feather name="check-circle" size={16} color={colors.tint} />
          <ThemedText variant="caption" style={{ flex: 1 }}>
            You&apos;re subscribed this month
            {currentPlan !== "free" ? ` · ${currentPlan[0].toUpperCase()}${currentPlan.slice(1)} plan` : ""}
            {adFree ? " · Ad-Free" : ""}. Pick another plan below to switch.
          </ThemedText>
        </View>
      ) : null}

      {/* Selectable plans */}
      <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
        {plans.map((plan, i) => {
          const isSel = selected === i;
          return (
            <Pressable
              key={plan.name}
              onPress={() => {
                tap();
                setSelected(i);
              }}
              style={[
                styles.plan,
                {
                  borderColor: isSel ? colors.tint : colors.cardBorder,
                  backgroundColor: isSel ? withAlpha(colors.tint, 0.06) : colors.card,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <ThemedText variant="heading" style={{ fontSize: 17 }}>
                    {plan.name}
                  </ThemedText>
                  {isCurrent(plan) ? (
                    <View style={[styles.badge, { backgroundColor: withAlpha("#22c55e", 0.18) }]}>
                      <ThemedText variant="label" color="#22c55e" style={{ fontSize: 10 }}>
                        CURRENT
                      </ThemedText>
                    </View>
                  ) : plan.highlighted ? (
                    <View style={[styles.badge, { backgroundColor: colors.tint }]}>
                      <ThemedText variant="label" color="#fff" style={{ fontSize: 10 }}>
                        POPULAR
                      </ThemedText>
                    </View>
                  ) : plan.kind === "adfree" ? (
                    <View style={[styles.badge, { backgroundColor: withAlpha(colors.tint, 0.16) }]}>
                      <ThemedText variant="label" color={colors.tint} style={{ fontSize: 10 }}>
                        NO ADS
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
                <ThemedText variant="caption" muted style={{ marginTop: 3 }}>
                  {(plan.priceString || `$${plan.firstMonth.toFixed(2)}`)} first month · then $
                  {plan.regular.toFixed(2)}/mo
                </ThemedText>
                <ThemedText
                  variant="caption"
                  color={colors.tint}
                  style={{ marginTop: 2, fontSize: 12, fontWeight: "600" }}
                >
                  {plan.subLine}
                </ThemedText>
              </View>
              <View
                style={[styles.radio, { borderColor: isSel ? colors.tint : withAlpha(colors.textFaint, 0.4) }]}
              >
                {isSel ? (
                  <View style={[styles.radioDot, { backgroundColor: colors.tint }]}>
                    <Feather name="check" size={12} color="#fff" />
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Call to action */}
      <Pressable
        onPress={buy}
        disabled={blocked}
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: colors.tint, opacity: blocked ? 0.5 : pressed ? 0.9 : 1 },
        ]}
      >
        <ThemedText variant="body" color="#fff" style={{ fontWeight: "800", fontSize: 17 }}>
          {ctaLabel}
        </ThemedText>
        {!busy ? <Feather name="chevron-right" size={20} color="#fff" /> : null}
      </Pressable>

      <ThemedText variant="caption" muted style={{ textAlign: "center", marginTop: spacing.sm, fontSize: 11 }}>
        {freeTier.blurb}
      </ThemedText>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable onPress={handleRestore} disabled={busy}>
          <ThemedText variant="caption" muted style={styles.link}>
            Restore
          </ThemedText>
        </Pressable>
        <Pressable onPress={openTerms}>
          <ThemedText variant="caption" muted style={styles.link}>
            Terms &amp; Privacy
          </ThemedText>
        </Pressable>
      </View>

      <ThemedText variant="caption" muted style={styles.legal}>
        Subscriptions renew automatically until cancelled — manage or cancel anytime in Google Play. Your
        first month is 50% off, then the regular monthly rate applies. Prices are set in the store and may
        vary by region.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  closeRow: { flexDirection: "row", justifyContent: "flex-end", minHeight: 30 },
  closeBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  currentBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    marginTop: spacing.xl,
  },
  footer: { flexDirection: "row", justifyContent: "center", gap: spacing.xl, marginTop: spacing.lg },
  link: { textDecorationLine: "underline", fontSize: 13 },
  legal: { marginTop: spacing.lg, fontSize: 11, lineHeight: 16, textAlign: "center" },
});
