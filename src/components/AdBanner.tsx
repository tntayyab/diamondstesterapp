import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ui";
import { env } from "@/config/env";
import { adsAvailable, bannerComponents, bannerUnitId } from "@/lib/ads";
import { tap } from "@/lib/feedback";
import { spacing, useTheme, withAlpha } from "@/theme";

// Matches a typical anchored adaptive banner's height closely enough that
// swapping the house ad for a real one (once AdMob keys land) doesn't jump
// the layout of the screen it sits on.
const HOUSE_BANNER_HEIGHT = 56;

/**
 * A simple, clearly-labelled text "house ad" — shown in the exact same slot a
 * real AdMob banner would occupy, whenever the native module isn't available
 * (no AdMob keys yet, or running in Expo Go/web). Tapping it opens the paywall.
 */
function HouseBanner() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => {
        tap();
        router.push("/paywall");
      }}
      style={({ pressed }) => [
        styles.house,
        {
          backgroundColor: withAlpha(colors.tint, 0.059),
          borderColor: colors.cardBorder,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Feather name="zap" size={16} color={colors.tint} />
      <ThemedText variant="caption" style={{ flex: 1, fontWeight: "600" }} numberOfLines={1}>
        Diamonds Tester Pro — remove ads & get unlimited scans
      </ThemedText>
      <Feather name="arrow-right" size={15} color={colors.tint} />
    </Pressable>
  );
}

/**
 * Anchored adaptive banner for the bottom of browse screens. Prefers a real
 * AdMob banner once the native SDK has initialised; otherwise (no keys
 * configured yet, or running in Expo Go/web where the native module doesn't
 * exist at all) falls back to a compact text house-ad in the same slot, so the
 * layout never jumps once real ads are wired in later.
 */
export function AdBanner() {
  // Master ads switch off → render nothing at all (no real ad, no house ad).
  // Checked before any hook so the (build-constant) condition can't change
  // hook order between renders.
  if (!env.ads.enabled) return null;
  return <AdBannerInner />;
}

function AdBannerInner() {
  const { colors } = useTheme();
  const [ready, setReady] = useState(adsAvailable());

  useEffect(() => {
    if (ready) return;
    const timer = setInterval(() => {
      if (adsAvailable()) {
        setReady(true);
        clearInterval(timer);
      }
    }, 800);
    return () => clearInterval(timer);
  }, [ready]);

  const parts = ready ? bannerComponents() : null;

  if (!parts) return <HouseBanner />;

  // BannerAd is a native React component; typed loosely because it is lazily loaded.
  const BannerAd = parts.BannerAd as React.ComponentType<{
    unitId: string;
    size: string;
    requestOptions?: { requestNonPersonalizedAdsOnly?: boolean };
  }>;

  return (
    <View style={{ alignItems: "center", backgroundColor: colors.background }}>
      <BannerAd
        unitId={bannerUnitId()}
        size={parts.anchoredSize}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  house: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: HOUSE_BANNER_HEIGHT,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
