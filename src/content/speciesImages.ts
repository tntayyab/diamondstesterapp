import type { ImageSourcePropType } from "react-native";

/**
 * Static require() map for bundled reference photos.
 *
 * React Native's bundler resolves `require("./x.webp")` at build time, so the
 * paths MUST be string literals — you cannot build them from a slug variable.
 *
 * Real, properly-licensed photos sourced from Wikimedia Commons (Public
 * Domain / CC0 / CC BY / CC BY-SA). See CREDITS below for full attribution;
 * this is surfaced on the species detail screen (app/species/[slug].tsx).
 */
const IMAGES: Record<string, ImageSourcePropType> = {
  diamond: require("../../assets/species/diamond.jpg"),
  moissanite: require("../../assets/species/moissanite.jpg"),
  "cubic-zirconia": require("../../assets/species/cubic-zirconia.jpg"),
  "lab-grown-diamond": require("../../assets/species/lab-grown-diamond.jpg"),
  "white-sapphire": require("../../assets/species/white-sapphire.jpg"),
  quartz: require("../../assets/species/quartz.jpg"),
  glass: require("../../assets/species/glass.jpg"),
};

/** Attribution required by the CC BY / CC BY-SA licences on the source photos. */
const CREDITS: Record<string, { artist: string; license: string; source: string }> = {
  diamond: {
    artist: "Petragems",
    license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Round_Brilliant_Cut_Diamond.jpg",
  },
  moissanite: {
    artist: "James St. John",
    license: "CC BY 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Moissanite_(synthetic_silicon_carbide)_1.jpg",
  },
  "cubic-zirconia": {
    artist: "James St. John",
    license: "CC BY 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Cubic_zirconia_(synthetic_zirconium_dioxide)_1.jpg",
  },
  "lab-grown-diamond": {
    artist: "BrittanyRL",
    license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:WD_Lab_Grown_Diamonds.jpg",
  },
  "white-sapphire": {
    artist: "Robert M. Lavinsky",
    license: "CC BY-SA 3.0",
    source: "https://commons.wikimedia.org/wiki/File:Corundum-118454.jpg",
  },
  quartz: {
    artist: "W.carter",
    license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Faceted_rock_crystal_briolette_1.jpg",
  },
  glass: {
    artist: "Lisafern",
    license: "CC0",
    source: "https://commons.wikimedia.org/wiki/File:NOVAGEMS_-_Public_Domain.jpg",
  },
};

export const speciesImage = (slug: string): ImageSourcePropType | null => IMAGES[slug] ?? null;

export const hasSpeciesImage = (slug: string): boolean => slug in IMAGES;

export const speciesCredit = (slug: string) => CREDITS[slug] ?? null;
