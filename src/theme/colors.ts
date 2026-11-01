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

// ── Custom (user-picked) colours ─────────────────────────────────────────────
// The user can override the base theme's background and/or text colour from
// Settings → Appearance. We derive the rest of the palette from those two so the
// result stays coherent (cards slightly lifted off the background, muted/faint
// text as fades of the chosen text colour) instead of clashing with the base.

export interface CustomColors {
  background: string | null;
  text: string | null;
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const int = parseInt(m[1], 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

/** True when `value` is a valid 6-digit hex colour (with or without a leading #). */
export function isHexColor(value: string): boolean {
  return parseHex(value) !== null;
}

/** Normalise "abc123" / "#ABC123" → "#abc123"; returns null when not a hex colour. */
export function normalizeHex(value: string): string | null {
  const c = parseHex(value);
  return c ? rgbToHex(c) : null;
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function luminance({ r, g, b }: { r: number; g: number; b: number }): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function mix(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
): { r: number; g: number; b: number } {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

function rgba(hex: string, alpha: number): string {
  const c = parseHex(hex);
  if (!c) return hex;
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${alpha})`;
}

/**
 * Builds a full palette from a base theme plus the user's chosen background
 * and/or text colour. Unset overrides fall back to the base value. The brand
 * `tint`/`danger` are always preserved so buttons and alerts stay on-brand.
 */
export function customPalette(base: Palette, bgHex: string | null, textHex: string | null): Palette {
  const bg = bgHex ? parseHex(bgHex) : null;
  const isLight = bg ? luminance(bg) > 0.55 : base.mode === "light";
  const towards = isLight ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
  // When the user picks a background but no text colour, auto-pick a readable
  // text colour for that background instead of inheriting the base theme's
  // (which would be near-white on a light custom background, i.e. invisible).
  const text = textHex ?? (bg ? (isLight ? "#161A2E" : "#F1F3FA") : base.text);
  const edge = textHex ?? (isLight ? "#000000" : "#ffffff");

  return {
    ...base,
    mode: isLight ? "light" : "dark",
    background: bgHex ?? base.background,
    backgroundElevated: bg ? rgbToHex(mix(bg, towards, 0.05)) : base.backgroundElevated,
    card: bg ? rgbToHex(mix(bg, towards, 0.09)) : base.card,
    cardBorder: rgba(edge, 0.16),
    border: rgba(edge, 0.16),
    text,
    textMuted: rgba(text, 0.62),
    textFaint: rgba(text, 0.42),
    tabInactive: rgba(text, 0.42),
    glass: rgba(isLight ? "#000000" : "#ffffff", 0.06),
  };
}

/** Curated background swatches offered in Settings → Appearance. */
export const CUSTOM_BACKGROUNDS: string[] = [
  "#070C16", // deep navy (default dark)
  "#000000", // black
  "#12131A", // charcoal
  "#1A1330", // deep purple
  "#0C1F1A", // deep green
  "#231016", // wine
  "#F6F8FF", // icy white (default light)
  "#FFF7EC", // warm cream
];

/** Curated text swatches offered in Settings → Appearance. */
export const CUSTOM_TEXTS: string[] = [
  "#F1F3FA", // near-white
  "#FFFFFF", // white
  "#161A2E", // ink
  "#E8D9A8", // soft gold
  "#B7C7FF", // periwinkle
  "#A8E6CF", // mint
];

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
