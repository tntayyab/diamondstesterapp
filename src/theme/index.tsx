import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

import { getItem, setItem } from "@/lib/storage";
import { customPalette, palettes, type CustomColors, type Palette } from "./colors";

export * from "./colors";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "theme:preference";
const CUSTOM_KEY = "theme:custom";

const NO_CUSTOM: CustomColors = { background: null, text: null };

interface ThemeContextValue {
  colors: Palette;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  /** User-picked background/text overrides (null = use the theme default). */
  custom: CustomColors;
  setCustom: (next: CustomColors) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [custom, setCustomState] = useState<CustomColors>(NO_CUSTOM);

  useEffect(() => {
    let cancelled = false;
    void getItem<ThemePreference>(STORAGE_KEY).then((stored) => {
      if (!cancelled && stored) setPreferenceState(stored);
    });
    void getItem<CustomColors>(CUSTOM_KEY).then((stored) => {
      if (!cancelled && stored) setCustomState({ background: stored.background ?? null, text: stored.text ?? null });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void setItem(STORAGE_KEY, next);
  }, []);

  const setCustom = useCallback((next: CustomColors) => {
    setCustomState(next);
    void setItem(CUSTOM_KEY, next);
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const resolved = preference === "system" ? (system ?? "dark") : preference;
    const base = resolved !== "light" ? palettes.dark : palettes.light;
    const hasCustom = Boolean(custom.background || custom.text);
    const colors = hasCustom ? customPalette(base, custom.background, custom.text) : base;
    return { colors, isDark: colors.mode === "dark", preference, setPreference, custom, setCustom };
  }, [preference, system, custom, setPreference, setCustom]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
