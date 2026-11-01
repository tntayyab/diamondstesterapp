import type { ImageSourcePropType } from "react-native";

/**
 * Bundled decorative imagery (brand-styled diamond photos + transparent empty-
 * state illustrations). Static `require()` paths so the bundler resolves them at
 * build time. Kept in one place so screens share the same assets.
 */
export const appImages: Record<string, ImageSourcePropType> = {
  // Transparent PNG illustrations for empty states (work on light & dark).
  emptyScan: require("../../assets/illus/empty-scan.png"),
  emptySearch: require("../../assets/illus/empty-search.png"),

  // Photoreal brand banners for specific screens.
  quizBanner: require("../../assets/photos/quiz-banner.jpg"),
  paywallHero: require("../../assets/photos/paywall-hero.jpg"),
  uvGlow: require("../../assets/photos/uv-glow.jpg"),
  scale: require("../../assets/photos/scale.jpg"),
  loupe: require("../../assets/photos/loupe.jpg"),
  fingertip: require("../../assets/photos/fingertip.jpg"),
};

/** The 5 home-slider photos, reused as cover art elsewhere (e.g. guide cards). */
export const heroSlides: ImageSourcePropType[] = [
  require("../../assets/hero/hero-diamond.jpg"),
  require("../../assets/hero/hero-scan.jpg"),
  require("../../assets/hero/hero-facet.jpg"),
  require("../../assets/hero/hero-cluster.jpg"),
  require("../../assets/hero/hero-ring.jpg"),
];
