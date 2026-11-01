import { Image } from "expo-image";
import React from "react";
import { StyleSheet, View, type ImageSourcePropType } from "react-native";

import { radius, spacing } from "@/theme";

/** A rounded, full-width photo banner shown at the top of a screen. */
export function ScreenHero({ image, height = 150 }: { image: ImageSourcePropType; height?: number }) {
  return (
    <View style={[styles.wrap, { height }]}>
      <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.xl, overflow: "hidden", marginBottom: spacing.lg },
});
