import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { spacing } from "@/theme";

const AUTO_MS = 3500; // how long each slide is shown
const RESUME_MS = 2500; // pause auto-advance this long after a hand-swipe

/**
 * A full-bleed image carousel used as the background of the home "capture"
 * card. It auto-advances and can ALSO be swiped by hand (paging). A brand-tinted
 * dark scrim sits on top so the overlaid white heading stays readable over any
 * photo, and `children` (the icon + text) are centred above everything. The
 * scrim, overlay and dots use `pointerEvents="none"` so horizontal swipes always
 * reach the ScrollView underneath.
 */
export function HeroSlider({
  images,
  style,
  children,
}: {
  images: ImageSourcePropType[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const indexRef = useRef(0);
  const paused = useRef(false);

  useEffect(() => {
    if (width === 0 || images.length < 2) return;
    const id = setInterval(() => {
      if (paused.current) return;
      const next = (indexRef.current + 1) % images.length;
      indexRef.current = next;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [width, images.length]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = width ? Math.round(e.nativeEvent.contentOffset.x / width) : 0;
    indexRef.current = i;
    setIndex(i);
    // resume auto-advance a moment after the user lets go
    setTimeout(() => {
      paused.current = false;
    }, RESUME_MS);
  };

  return (
    <View
      style={[style, { overflow: "hidden" }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {/* Image carousel — the full-bleed background layer. */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        style={StyleSheet.absoluteFill}
        onScrollBeginDrag={() => {
          paused.current = true;
        }}
        onMomentumScrollEnd={onMomentumEnd}
      >
        {width > 0 &&
          images.map((src, i) => (
            <Image key={i} source={src} style={{ width, height: "100%" }} contentFit="cover" transition={200} />
          ))}
      </ScrollView>

      {/* Darken for legibility… */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7,12,22,0.42)" }]} pointerEvents="none" />
      {/* …then a subtle brand-gradient tint so it still reads as "us". */}
      <LinearGradient
        colors={["rgba(100,103,241,0.38)", "rgba(56,225,255,0.20)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Overlaid content (icon + heading). Does not intercept touches. */}
      <View
        style={[StyleSheet.absoluteFill, styles.overlay]}
        pointerEvents="none"
      >
        {children}
      </View>

      {/* Page dots. */}
      {images.length > 1 ? (
        <View style={styles.dots} pointerEvents="none">
          {images.map((_, i) => (
            <View key={i} style={[styles.dot, { opacity: i === index ? 1 : 0.4 }]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { alignItems: "center", justifyContent: "center", padding: spacing.xl },
  dots: {
    position: "absolute",
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
});
