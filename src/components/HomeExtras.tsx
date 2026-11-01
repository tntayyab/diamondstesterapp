import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AuthenticityBadge, SectionHeader, ThemedText } from "@/components/ui";
import { env } from "@/config/env";
import { speciesLibrary, type Species } from "@/content/species";
import { speciesImage } from "@/content/speciesImages";
import { fetchBlogPosts, type BlogPost } from "@/lib/blog";
import { brandGradient, radius, spacing, useTheme, withAlpha, type Palette } from "@/theme";

// ── More apps — the other apps in our Play Store account ────────────────────
// Icons are the REAL Play Store icons (og:image), fetched live from each
// listing. `=s128` requests a crisp 128px render from Google's image CDN.
interface StoreApp {
  name: string;
  tagline: string;
  pkg: string;
  icon: string;
}

const rc = (base: string) => `${base}=s128`;

const MORE_APPS: StoreApp[] = [
  {
    name: "Cat Scanner",
    tagline: "AI cat breed identifier",
    pkg: "com.appsgurus24.catscanner",
    icon: rc("https://play-lh.googleusercontent.com/UrmGTjx2GbQb1uFenCXmBeAQNWfFS8JvUHwg1YDjJXJs9YlmcgqJ25QPd7sxPARnEd4HU0JqgGylrIiHpmS4aZI"),
  },
  {
    name: "Mushroom Identifier",
    tagline: "AI mushroom scan",
    pkg: "com.mushroomidentifiers.mushroomidentification",
    icon: rc("https://play-lh.googleusercontent.com/xT9kzbwaajD8s1EQKS3SNxDbUAZeQwrUJxEeT44G40B6UHH9Fsvc2sO35YIlX0CUbjwBAYw35Mj_7ofk9Sa5nQ"),
  },
  {
    name: "Tell If The Diamond Is Real",
    tagline: "Quick diamond checker",
    pkg: "com.appsmad.tellifthediamondisreal",
    icon: rc("https://play-lh.googleusercontent.com/dHWIFNsjPuQIyrspt-dEiM_7fGZqdlx4Q7a9xH33813tbGSruncvDewmG0srzNd1Rjl-CYQ7IgbBzs6RMFxGc5c"),
  },
  {
    name: "Right Triangle Calculator",
    tagline: "Fast trig solver",
    pkg: "com.appsgurus.righttrianglecalculator",
    icon: rc("https://play-lh.googleusercontent.com/ElrlLOqYgXLfjUTmYhl3TlIIMLoFDb2SjmKmiuCdtYS_rvoxr2vsrKKRPOO6RlsC18p_pk3uE61cGAYtcYmU3g"),
  },
  {
    name: "Refinance Calculator",
    tagline: "Mortgage savings",
    pkg: "com.appsgurus.refinancecalculator",
    icon: rc("https://play-lh.googleusercontent.com/_hnCmEUFof01eljIeAvhwK0K5otAJptQKJcMZhBmuzD40nN97Xv-CgesGE1evYM_vtjQBouDiChnKDEyYi2OiA"),
  },
];

const storeUrl = (pkg: string) => `https://play.google.com/store/apps/details?id=${pkg}`;

// ── Featured articles — auto-scrolling marquee of website content ────────────
const ARTICLE_W = 264;
const STEP = ARTICLE_W + spacing.md; // each card's full slot width (card + right margin)
const AUTO_STEP_PX = 1; // px moved per tick
const AUTO_TICK_MS = 30; // ~33 px / second — gentle

/**
 * A gently auto-scrolling row of the latest diamondstester.com articles that the
 * user can ALSO swipe by hand. It's a real horizontal ScrollView (so drag works);
 * a timer nudges the offset a pixel at a time for smooth motion, and because the
 * list is duplicated the offset wraps by exactly one copy-width — the loop is
 * seamless. Auto-scroll pauses while the user is dragging and resumes shortly
 * after. Tapping a card opens the full article on the website.
 */
export function FeaturedArticles() {
  const { colors } = useTheme();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const offsetX = useRef(0);
  const paused = useRef(false);

  useEffect(() => {
    void fetchBlogPosts().then((all) => setPosts(all.slice(0, 8)));
  }, []);

  const rowWidth = posts.length * STEP; // width of ONE copy of the list

  useEffect(() => {
    if (posts.length < 2 || rowWidth === 0) return;
    const id = setInterval(() => {
      if (paused.current) return;
      let next = offsetX.current + AUTO_STEP_PX;
      if (next >= rowWidth) next -= rowWidth; // seamless wrap (2nd copy is identical)
      offsetX.current = next;
      scrollRef.current?.scrollTo({ x: next, animated: false });
    }, AUTO_TICK_MS);
    return () => clearInterval(id);
  }, [posts.length, rowWidth]);

  if (posts.length === 0) return null;

  // Two copies back to back so the wrap-around is invisible.
  const loop = posts.length >= 2 ? [...posts, ...posts] : posts;

  return (
    <View>
      <SectionHeader
        title="From diamondstester.com"
        action={
          <Pressable onPress={() => void Linking.openURL(`${env.app.siteUrl}/blog`)}>
            <ThemedText variant="caption" color={colors.tint}>
              Read all
            </ThemedText>
          </Pressable>
        }
      />
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          offsetX.current = e.nativeEvent.contentOffset.x;
        }}
        onScrollBeginDrag={() => {
          paused.current = true;
        }}
        onScrollEndDrag={() => {
          // resume auto-scroll a moment after the user lets go
          setTimeout(() => {
            paused.current = false;
          }, 1500);
        }}
        onMomentumScrollEnd={() => {
          paused.current = false;
        }}
        contentContainerStyle={{ paddingVertical: spacing.sm }}
      >
        {loop.map((item, i) => (
          <ArticleCard key={`${item.slug}-${i}`} item={item} colors={colors} />
        ))}
      </ScrollView>
    </View>
  );
}

function ArticleCard({ item, colors }: { item: BlogPost; colors: Palette }) {
  return (
    <Pressable onPress={() => void Linking.openURL(`${env.app.siteUrl}/blog/${item.slug}`)} style={{ marginRight: spacing.md }}>
      <View style={[styles.article, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {item.cover_image ? (
          <Image source={{ uri: item.cover_image }} style={styles.articleCover} contentFit="cover" transition={150} />
        ) : (
          <LinearGradient
            colors={[...brandGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.articleCover, { alignItems: "center", justifyContent: "center" }]}
          >
            <Feather name="book-open" size={26} color="rgba(255,255,255,0.9)" />
          </LinearGradient>
        )}
        <View style={{ padding: spacing.md, gap: 4 }}>
          {item.category ? (
            <ThemedText variant="label" color={colors.tint} numberOfLines={1}>
              {item.category}
            </ThemedText>
          ) : null}
          <ThemedText variant="body" style={{ fontWeight: "700" }} numberOfLines={2}>
            {item.title}
          </ThemedText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
            <ThemedText variant="caption" color={colors.tint} style={{ fontSize: 12, fontWeight: "600" }}>
              Read on the web
            </ThemedText>
            <Feather name="external-link" size={12} color={colors.tint} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/** A horizontal, side-by-side row of our other Play Store apps, with real store icons. */
export function MoreApps() {
  const { colors } = useTheme();
  return (
    <View>
      <SectionHeader title="More apps from us" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.lg, paddingVertical: spacing.xs }}
      >
        {MORE_APPS.map((app) => (
          <Pressable
            key={app.pkg}
            onPress={() => void Linking.openURL(storeUrl(app.pkg))}
            style={({ pressed }) => [
              styles.appCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Image source={{ uri: app.icon }} style={styles.appIcon} contentFit="cover" transition={150} />
            <ThemedText variant="caption" numberOfLines={2} style={{ fontWeight: "700", textAlign: "center", fontSize: 12, minHeight: 32 }}>
              {app.name}
            </ThemedText>
            <View style={[styles.installPill, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
              <Feather name="download" size={11} color={colors.tint} />
              <ThemedText variant="caption" color={colors.tint} style={{ fontWeight: "700", fontSize: 11 }}>
                Install
              </ThemedText>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ── Learn library — two opposite-direction auto-scrolling rows ───────────────
const LEARN_CARD_W = 132;
const LEARN_STEP = LEARN_CARD_W + spacing.md;

/**
 * A single hands-off marquee row of library entries. Like `FeaturedArticles` it
 * is a real ScrollView (so it swipes) nudged one pixel per tick; the list is
 * duplicated so the wrap is seamless. `direction` decides which way it drifts —
 * the home screen shows one row going left and one going right.
 */
function LearnRow({ items, direction }: { items: Species[]; direction: "left" | "right" }) {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const offsetX = useRef(0);
  const paused = useRef(false);
  const started = useRef(false);

  const rowWidth = items.length * LEARN_STEP; // width of ONE copy

  useEffect(() => {
    if (items.length < 2 || rowWidth === 0) return;
    // A right-drifting row starts one copy in, so it has room to move down to 0.
    if (!started.current) {
      started.current = true;
      if (direction === "right") {
        offsetX.current = rowWidth;
        scrollRef.current?.scrollTo({ x: rowWidth, animated: false });
      }
    }
    const id = setInterval(() => {
      if (paused.current) return;
      let next = offsetX.current + (direction === "left" ? AUTO_STEP_PX : -AUTO_STEP_PX);
      if (next >= rowWidth) next -= rowWidth; // wrap forward
      if (next < 0) next += rowWidth; // wrap backward
      offsetX.current = next;
      scrollRef.current?.scrollTo({ x: next, animated: false });
    }, AUTO_TICK_MS);
    return () => clearInterval(id);
  }, [items.length, rowWidth, direction]);

  const loop = [...items, ...items];

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={(e) => {
        offsetX.current = e.nativeEvent.contentOffset.x;
      }}
      onScrollBeginDrag={() => {
        paused.current = true;
      }}
      onScrollEndDrag={() => {
        setTimeout(() => {
          paused.current = false;
        }, 1500);
      }}
      onMomentumScrollEnd={() => {
        paused.current = false;
      }}
      contentContainerStyle={{ paddingVertical: spacing.xs }}
    >
      {loop.map((item, i) => (
        <LearnTile key={`${item.slug}-${i}`} item={item} colors={colors} />
      ))}
    </ScrollView>
  );
}

function LearnTile({ item, colors }: { item: Species; colors: Palette }) {
  const router = useRouter();
  const photo = speciesImage(item.slug);
  return (
    <Pressable
      onPress={() => router.push(`/species/${item.slug}`)}
      style={[styles.learnCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
    >
      {photo ? (
        <Image source={photo} style={styles.learnCover} contentFit="cover" transition={150} />
      ) : (
        <LinearGradient
          colors={[...brandGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.learnCover, { alignItems: "center", justifyContent: "center" }]}
        >
          <Feather name="target" size={22} color="rgba(255,255,255,0.9)" />
        </LinearGradient>
      )}
      <View style={{ padding: spacing.md, gap: 4 }}>
        <ThemedText variant="body" style={{ fontWeight: "700", fontSize: 13 }} numberOfLines={1}>
          {item.commonName}
        </ThemedText>
        <AuthenticityBadge level={item.venomLevel} />
      </View>
    </Pressable>
  );
}

/** A single auto-scrolling row of the diamond library. */
export function LearnCarousels() {
  const router = useRouter();
  const { colors } = useTheme();
  if (speciesLibrary.length < 2) return null;

  // Reversed order so it doesn't mirror the "From diamondstester.com" row above.
  const row = [...speciesLibrary].reverse();

  return (
    <View>
      <SectionHeader
        title="Explore the diamond library"
        action={
          <Pressable onPress={() => router.push("/species")}>
            <ThemedText variant="caption" color={colors.tint}>
              See all
            </ThemedText>
          </Pressable>
        }
      />
      <LearnRow items={row} direction="right" />
    </View>
  );
}

const styles = StyleSheet.create({
  article: {
    width: ARTICLE_W,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: "hidden",
  },
  articleCover: { width: "100%", height: 140 },
  learnCard: {
    width: LEARN_CARD_W,
    marginRight: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: "hidden",
  },
  learnCover: { width: "100%", height: 90 },
  appCard: {
    width: 116,
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  appIcon: { width: 56, height: 56, borderRadius: 14 },
  installPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
});
