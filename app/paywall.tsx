import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { showAlert } from "@/components/AppAlert";

import { Button, Card, Screen, SectionHeader, ThemedText } from "@/components/ui";
import {
  freeTier,
  pricingFaqs,
  pricingHeadline,
  pricingHowItWorks,
  pricingPromo,
  pricingSub,
  pricingTiers,
  pricingTrust,
} from "@/content/pricing";
import { useAuth } from "@/lib/auth";
import { success, tap } from "@/lib/feedback";
import {
  billingUnavailableReason,
  getPackages,
  purchase,
  restore,
  type PurchasePackage,
} from "@/lib/purchases";
import { brandGradient, radius, spacing, useTheme } from "@/theme";

export default function PaywallScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, refreshProfile } = useAuth();

  const [packages, setPackages] = useState<PurchasePackage[]>([]);
  const [rawPackages, setRawPackages] = useState<unknown[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(billingUnavailableReason());
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    void getPackages().then(({ packages: list, raw }) => {
      setPackages(list);
      setRawPackages(raw);
      setUnavailable(billingUnavailableReason());
    });
  }, []);

  const buy = useCallback(
    async (index: number) => {
      if (!user) {
        showAlert("Sign in first", "Create an account so your subscription follows you across devices.", [
          { text: "Cancel", style: "cancel" },
          { text: "Sign in", onPress: () => router.replace("/sign-in") },
        ]);
        return;
      }

      setBusy(packages[index]?.identifier ?? null);
      try {
        if (await purchase(rawPackages[index])) {
          success();
          await refreshProfile();
          showAlert("Welcome aboard", "Your plan is active. Fresh credits are on your account.");
          router.back();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (!/cancel/i.test(message)) showAlert("Purchase failed", message || "Please try again.");
      } finally {
        setBusy(null);
      }
    },
    [user, packages, rawPackages, refreshProfile, router],
  );

  const handleRestore = useCallback(async () => {
    setBusy("restore");
    try {
      const restored = await restore();
      await refreshProfile();
      showAlert(
        restored ? "Purchases restored" : "Nothing to restore",
        restored ? "Your plan is active again." : "We could not find an active subscription for this account.",
      );
    } finally {
      setBusy(null);
    }
  }, [refreshProfile]);

  return (
    <Screen scroll edges={["bottom"]}>
      {/* Hero — headline + promo chips, exactly as on the website */}
      <LinearGradient
        colors={[...brandGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Feather name="zap" size={26} color="#fff" />
        <ThemedText variant="title" color="#fff" style={{ textAlign: "center", marginTop: spacing.sm }}>
          {pricingHeadline}
        </ThemedText>
        <ThemedText variant="caption" color="rgba(255,255,255,0.9)" style={{ textAlign: "center" }}>
          {pricingSub}
        </ThemedText>
        <View style={styles.promoRow}>
          {pricingPromo.map((item) => (
            <View key={item} style={styles.promoChip}>
              <Feather name="check" size={11} color="#fff" />
              <ThemedText variant="caption" color="#fff" style={{ fontSize: 11, fontWeight: "600" }}>
                {item}
              </ThemedText>
            </View>
          ))}
        </View>
      </LinearGradient>

      {unavailable ? (
        <Card style={{ marginTop: spacing.lg }}>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <Feather name="info" size={18} color={colors.textMuted} />
            <ThemedText variant="caption" muted style={{ flex: 1 }}>
              {unavailable}
            </ThemedText>
          </View>
        </Card>
      ) : null}

      <SectionHeader title="Plans" />

      {pricingTiers.map((tier, index) => {
        const pkg = packages[index];
        const canBuy = !unavailable && Boolean(pkg);

        return (
          <Card
            key={tier.name}
            style={[
              { marginBottom: spacing.md },
              tier.highlighted ? { borderColor: colors.tint, borderWidth: 1.5 } : null,
            ]}
          >
            {tier.highlighted ? (
              <View style={[styles.ribbon, { backgroundColor: colors.tint }]}>
                <ThemedText variant="label" color="#fff" style={{ fontSize: 10 }}>
                  Most popular
                </ThemedText>
              </View>
            ) : null}

            <ThemedText variant="heading">{tier.name}</ThemedText>
            <ThemedText variant="caption" muted style={{ marginTop: 2 }}>
              {tier.audience}
            </ThemedText>

            {/* First-month price big, regular struck through — same as the site */}
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: spacing.md }}>
              <ThemedText variant="title">
                {pkg?.priceString || `$${tier.firstMonth.toFixed(2)}`}
              </ThemedText>
              <ThemedText variant="caption" muted style={{ textDecorationLine: "line-through" }}>
                ${tier.regular.toFixed(2)}
              </ThemedText>
              <ThemedText variant="caption" muted>
                first month
              </ThemedText>
            </View>
            <ThemedText variant="caption" color={colors.tint} style={{ marginTop: 2, fontWeight: "600" }}>
              then ${tier.regular.toFixed(2)}/mo · {tier.ids} · {tier.perId}
            </ThemedText>

            <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
              {tier.features.map((feature) => (
                <View key={feature} style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
                  <Feather name="check" size={14} color={colors.tint} />
                  <ThemedText variant="caption" style={{ flex: 1 }}>
                    {feature}
                  </ThemedText>
                </View>
              ))}
            </View>

            <Button
              label={canBuy ? "Start 7-day free trial" : "Unavailable"}
              variant={tier.highlighted ? "primary" : "secondary"}
              disabled={!canBuy}
              loading={busy === pkg?.identifier}
              onPress={() => void buy(index)}
              style={{ marginTop: spacing.lg }}
            />
          </Card>
        );
      })}

      {/* Free tier note */}
      <Card style={{ marginBottom: spacing.md }}>
        <ThemedText variant="body" style={{ fontWeight: "700" }}>
          {freeTier.name}
        </ThemedText>
        <ThemedText variant="caption" muted style={{ marginTop: 4 }}>
          {freeTier.blurb}
        </ThemedText>
      </Card>

      <Button
        label="Restore purchases"
        variant="ghost"
        loading={busy === "restore"}
        disabled={Boolean(unavailable)}
        onPress={handleRestore}
      />

      {/* How it works */}
      <SectionHeader title="How it works" />
      {pricingHowItWorks.map((step) => (
        <View key={step.step} style={styles.step}>
          <View style={[styles.stepNum, { borderColor: colors.cardBorder }]}>
            <ThemedText variant="caption" color={colors.tint} style={{ fontWeight: "800" }}>
              {step.step}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="body" style={{ fontWeight: "600" }}>
              {step.title}
            </ThemedText>
            <ThemedText variant="caption" muted style={{ marginTop: 2 }}>
              {step.desc}
            </ThemedText>
          </View>
        </View>
      ))}

      {/* FAQ */}
      <SectionHeader title="Frequently asked" />
      {pricingFaqs.map((faq, index) => {
        const open = openFaq === index;
        return (
          <Card key={faq.q} onPress={() => {
            tap();
            setOpenFaq(open ? null : index);
          }} style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <ThemedText variant="body" style={{ flex: 1, fontWeight: "600" }}>
                {faq.q}
              </ThemedText>
              <Feather name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.textFaint} />
            </View>
            {open ? (
              <ThemedText variant="caption" muted style={{ marginTop: spacing.md }}>
                {faq.a}
              </ThemedText>
            ) : null}
          </Card>
        );
      })}

      {/* Trust */}
      <View style={styles.trust}>
        <View style={styles.methods}>
          {pricingTrust.methods.map((method) => (
            <View key={method} style={[styles.method, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <ThemedText variant="caption" muted style={{ fontSize: 11 }}>
                {method}
              </ThemedText>
            </View>
          ))}
        </View>
        <ThemedText variant="caption" muted style={{ textAlign: "center", fontSize: 11, marginTop: spacing.md }}>
          {pricingTrust.note}
        </ThemedText>
      </View>

      <ThemedText variant="caption" muted style={styles.legal}>
        Subscriptions renew automatically until cancelled. Manage or cancel any time in your App Store or
        Google Play account settings. Prices shown are set in the store and may vary by region.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: spacing.xl, alignItems: "center", gap: spacing.xs, marginTop: spacing.lg },
  promoRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center", marginTop: spacing.md },
  promoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  ribbon: {
    position: "absolute",
    top: -1,
    right: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
  },
  step: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, alignItems: "flex-start" },
  stepNum: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  trust: { marginTop: spacing.xl },
  methods: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" },
  method: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  legal: { marginTop: spacing.lg, fontSize: 11, lineHeight: 16, textAlign: "center" },
});
