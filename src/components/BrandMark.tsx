import React from "react";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

/**
 * A faceted diamond/gem glyph — flat table top, girdle at the widest point,
 * pavilion coming to a point, with facet lines for a cut-glass look. Same
 * outline used to generate the app icon/splash/adaptive-icon PNGs (see
 * `assets/icon.png` etc.) so the in-app mark and the home-screen icon match.
 * `BrandMark` wraps it on the jewel-box rounded badge (icon look).
 */

const OUTLINE = "M16 9 L32 9 L44 19 L24 43 L4 19 Z";
const FACETS = ["M4 19 L44 19", "M16 9 L24 43", "M32 9 L24 43"];

export function DiamondGlyph({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id="bmg" x1="8" y1="9" x2="40" y2="43" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.55" stopColor="#E0E7FF" />
          <Stop offset="1" stopColor="#A5F3FC" />
        </LinearGradient>
      </Defs>
      <Path d={OUTLINE} fill="url(#bmg)" />
      {FACETS.map((d, i) => (
        <Path key={i} d={d} stroke="#3730A3" strokeOpacity={0.45} strokeWidth={0.9} fill="none" strokeLinecap="round" />
      ))}
    </Svg>
  );
}

export function BrandMark({ size = 56 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: "#070B13",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <DiamondGlyph size={size * 0.72} />
    </View>
  );
}
