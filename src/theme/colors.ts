/**
 * Brand system ported from the DiamondsTester website's tailwind.config.ts + globals.css.
 * A deep indigo-navy jewel-box (dark) or bright icy-white (light) canvas lit by an
 * indigo → cyan gradient.
 */

export const brand = {
  indigo: "hsl(239, 84%, 67%)",
  indigoLight: "hsl(239, 84%, 78%)",
  indigoDark: "hsl(239, 70%, 52%)",
  cyan: "hsl(189, 100%, 61%)",
  cyanDark: "hsl(189, 90%, 45%)",
  navy: "hsl(221, 48%, 5%)",
} as const;

/** The signature gradient, as consumed by expo-linear-gradient. */
export const brandGradient = [brand.indigo, brand.cyan] as const;

export const authenticityColors = {
  genuine: "#22c55e",
  uncertain: "#f59e0b",
  simulant: "#f97316",
  synthetic: "#ef4444",
} as const;

export type AuthenticityLevel = keyof typeof authenticityColors;

export interface Palette {
  mode: "light" | "dark";
  background: string;
  backgroundElevated: string;
  card: string;
  cardBorder: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  overlay: string;
  glass: string;
  tint: string;
  tabInactive: string;
  danger: string;
  gridLine: string;
}

const dark: Palette = {
  mode: "dark",
  background: "hsl(221, 48%, 5%)",
  backgroundElevated: "hsl(221, 44%, 8%)",
  card: "hsl(221, 40%, 10%)",
  cardBorder: "hsl(230, 30%, 20%)",
  border: "hsl(230, 30%, 20%)",
  text: "#F1F3FA",
  textMuted: "#9BA3C4",
  textFaint: "#5B6489",
  overlay: "rgba(4,6,16,0.72)",
  glass: "rgba(255,255,255,0.05)",
  tint: brand.indigo,
  tabInactive: "#5B6489",
  danger: "#ef4444",
  gridLine: "rgba(99,102,241,0.08)",
};

const light: Palette = {
  mode: "light",
  background: "#F6F8FF",
  backgroundElevated: "#FFFFFF",
  card: "#FFFFFF",
  cardBorder: "#E1E6F7",
  border: "#E1E6F7",
  text: "#161A2E",
  textMuted: "#5B6489",
  textFaint: "#9BA3C4",
  overlay: "rgba(22,26,46,0.55)",
  glass: "rgba(255,255,255,0.72)",
  tint: brand.indigoDark,
  tabInactive: "#9BA3C4",
  danger: "#b91c1c",
  gridLine: "rgba(99,102,241,0.08)",
};

export const palettes = { dark, light };

/**
 * Applies opacity to a theme color regardless of its underlying format.
 *
 * Every `Palette.tint` (and `brand.*`) value is an `hsl(...)` STRING, not a hex
 * color — appending a hex alpha suffix to it (the old `${color}18` trick, which
 * only works on 6-digit hex) produces an invalid CSS-color string like
 * `"hsl(239, 84%, 67%)18"`, silently breaking the intended transparency. This
 * is the one place that should ever build a translucent variant of a theme color.
 */
export function withAlpha(color: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));

  const hsl = color.match(/^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/i);
  if (hsl) {
    const [, h, s, l] = hsl;
    return `hsla(${h}, ${s}%, ${l}%, ${clamped})`;
  }

  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const suffix = Math.round(clamped * 255)
      .toString(16)
      .padStart(2, "0");
    return `${color}${suffix}`;
  }

  // Already hsla(...)/rgba(...)/rgb(...)/named — nothing safe to append, return as-is.
  return color;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  display: 38,
} as const;
