import React, { createContext, useCallback, useContext, useState } from "react";

import { AppDrawer } from "@/components/AppDrawer";

interface DrawerContextValue {
  open: () => void;
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

/**
 * Renders the slide-out menu once and exposes `open()` to any screen via
 * `useDrawer()`, so every tab can show a hamburger without each owning a copy
 * of the drawer.
 */
export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => setVisible(true), []);

  return (
    <DrawerContext.Provider value={{ open }}>
      {children}
      <AppDrawer visible={visible} onClose={() => setVisible(false)} />
    </DrawerContext.Provider>
  );
}

export function useDrawer(): DrawerContextValue {
  const ctx = useContext(DrawerContext);
  // Fall back to a no-op so a screen used outside the provider never crashes.
  return ctx ?? { open: () => {} };
}
