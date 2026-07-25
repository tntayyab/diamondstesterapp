import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ui";
import { speciesImage } from "@/content/speciesImages";
import { success, tap } from "@/lib/feedback";
import { brand, fontSize, radius, spacing } from "@/theme";

const { width, height } = Dimensions.get("window");

interface Slide {
  key: string;
  image: number | null;
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    key: "identify",
    image: speciesImage("diamond") as number | null,
    icon: "camera",
    title: "Scan any diamond or gemstone",
    body: "Snap a photo and get a stone-type guess, an authenticity read and honest next steps — powered by AI.",
  },
  {
    key: "frame",
    image: speciesImage("moissanite") as number | null,
    icon: "crop",
    title: "Frame it perfectly",
    body: "Bright, even light and a close-up on the stone gives the most useful result.",
  },
  {
    key: "safety",
    image: speciesImage("cubic-zirconia") as number | null,
    icon: "shield",
    title: "Learn the real tests too",
    body: "Every result points to real manual tests, plus a UV fluorescence simulator — never a fake camera trick.",
  },
  {
    key: "explore",
    image: speciesImage("lab-grown-diamond") as number | null,
    icon: "compass",
    title: "Learn, log & share",
    body: "Build a field journal, browse the gemstone library, and share your finds with the community.",
  },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    setIndex(next);
  }, []);

  const goNext = useCallback(() => {
    tap();
    if (index >= SLIDES.length - 1) {
      success();
      onDone();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  }, [index, onDone]);

  const skip = useCallback(() => {
    tap();
    onDone();
  }, [onDone]);

  const last = index === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(slide) => slide.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item }) => (
          <View style={{ width, height }}>
            {item.image ? (
              <Image source={item.image} style={styles.image} contentFit="cover" transition={200} />
            ) : (
              <View style={[styles.image, { backgroundColor: brand.indigo }]} />
            )}
            {/* Fade the photo into the dark card below so text is always legible. */}
            <LinearGradient
              colors={["transparent", "rgba(11,10,15,0.6)", "#0B0A0F"]}
              locations={[0, 0.7, 1]}
              style={styles.fade}
            />
          </View>
        )}
      />

      {/* Text + controls sit over the bottom of the image */}
      <SafeAreaView edges={["bottom"]} style={styles.overlay} pointerEvents="box-none">
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Feather name={SLIDES[index].icon} size={22} color="#fff" />
          </View>
          <ThemedText variant="title" color="#fff" style={{ textAlign: "center" }}>
            {SLIDES[index].title}
          </ThemedText>
          <ThemedText
            variant="body"
            color="rgba(245,243,238,0.82)"
            style={{ textAlign: "center", maxWidth: 320 }}
          >
            {SLIDES[index].body}
          </ThemedText>

          <View style={styles.dots}>
            {SLIDES.map((slide, i) => (
              <View
                key={slide.key}
                style={[
                  styles.dot,
                  {
                    width: i === index ? 22 : 7,
                    backgroundColor: i === index ? brand.indigo : "rgba(255,255,255,0.3)",
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.controls}>
            <Pressable onPress={skip} hitSlop={12} style={{ opacity: last ? 0 : 1 }} disabled={last}>
              <ThemedText variant="body" color="rgba(255,255,255,0.7)" style={{ fontWeight: "600" }}>
                Skip
              </ThemedText>
            </Pressable>

            <Pressable onPress={goNext}>
              <LinearGradient
                colors={[brand.indigo, brand.cyan]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={last ? styles.cta : styles.arrow}
              >
                {last ? (
                  <ThemedText variant="body" color="#fff" style={{ fontWeight: "700" }}>
                    Get started
                  </ThemedText>
                ) : (
                  <Feather name="arrow-right" size={22} color="#fff" />
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0A0F" },
  image: { width, height },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0, height: height * 0.62 },
  overlay: { position: "absolute", left: 0, right: 0, bottom: 0 },
  card: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, alignItems: "center", gap: spacing.md },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(16,185,129,0.22)",
    borderWidth: 1,
    borderColor: brand.indigo,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  dots: { flexDirection: "row", gap: 6, marginTop: spacing.md, alignItems: "center" },
  dot: { height: 7, borderRadius: radius.pill },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch",
    marginTop: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  arrow: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  cta: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: 15,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
