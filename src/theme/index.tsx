import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

import { getItem, setItem } from "@/lib/storage";
import { palettes, type Palette } from "./colors";

export * from "./colors";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "theme:preference";

interface ThemeContextValue {
  colors: Palette;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    let cancelled = false;
    getItem<ThemePreference>(STORAGE_KEY).then((stored) => {
      if (!cancelled && stored) setPreferenceState(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const resolved = preference === "system" ? (system ?? "dark") : preference;
    const isDark = resolved !== "light";
    return { colors: isDark ? palettes.dark : palettes.light, isDark, preference, setPreference };
  }, [preference, system, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
