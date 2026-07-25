import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";

import { DiamondGlyph } from "@/components/BrandMark";
import { ThemedText } from "@/components/ui";
import { brand, useTheme } from "@/theme";

const { height } = Dimensions.get("window");
const DROP = height * 0.42; // where the gem settles

export function SplashAnimation({ onDone }: { onDone: () => void }) {
  const { colors } = useTheme();

  const drop = useRef(new Animated.Value(0)).current; // 0 → 1 descent
  const sparkle = useRef(new Animated.Value(0)).current; // flashes once on landing
  const textOpacity = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(drop, {
        toValue: 1,
        duration: 1100,
        easing: Easing.bezier(0.34, 1.2, 0.64, 1), // slight bounce as it lands
        useNativeDriver: false,
      }),
      Animated.timing(sparkle, { toValue: 1, duration: 260, useNativeDriver: false }),
      Animated.timing(textOpacity, { toValue: 1, duration: 450, useNativeDriver: false }),
      Animated.delay(650),
      Animated.timing(fadeOut, { toValue: 0, duration: 420, useNativeDriver: false }),
    ]).start(({ finished }) => {
      if (finished) onDone();
    });
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gemTop = drop.interpolate({ inputRange: [0, 1], outputRange: [-height * 0.3, DROP - 34] });
  const gemScale = drop.interpolate({ inputRange: [0, 0.85, 1], outputRange: [0.7, 1.12, 1] });
  const sparkleOpacity = sparkle.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 0] });
  const sparkleScale = sparkle.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.2] });

  return (
    <Animated.View style={[styles.root, { backgroundColor: colors.background, opacity: fadeOut }]}>
      {/* one-off glint as the gem lands */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.sparkle,
          {
            top: DROP + 34 - 40,
            opacity: sparkleOpacity,
            transform: [{ scale: sparkleScale }],
            backgroundColor: brand.cyan,
          },
        ]}
      />

      {/* the gem drops in and settles */}
      <Animated.View style={[styles.gem, { top: gemTop, transform: [{ scale: gemScale }] }]}>
        <DiamondGlyph size={68} />
      </Animated.View>

      {/* wordmark */}
      <Animated.View style={[styles.wordmark, { opacity: textOpacity }]}>
        <ThemedText variant="title" style={{ letterSpacing: 1 }}>
          Diamonds Tester
        </ThemedText>
        <View style={[styles.underline, { backgroundColor: brand.indigo }]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, alignItems: "center", zIndex: 100 },
  gem: { position: "absolute", alignItems: "center" },
  sparkle: { position: "absolute", width: 80, height: 80, borderRadius: 40, opacity: 0 },
  wordmark: { position: "absolute", top: DROP + 46, alignItems: "center", gap: 10 },
  underline: { width: 40, height: 3, borderRadius: 2 },
});
