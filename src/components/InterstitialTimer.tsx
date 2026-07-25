import React, { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { HouseInterstitialModal } from "@/components/HouseInterstitialModal";
import { presentInterstitial } from "@/lib/ads";

/**
 * Shows a full-screen (interstitial) ad every minute the app is open and in the
 * foreground — regardless of what the user is doing. Real AdMob ad when the
 * native module is available, otherwise the text "house ad" fallback.
 *
 * The 60s cadence here is enforced together with the shared frequency cap in
 * `@/lib/ads` (INTERSTITIAL_MIN_GAP_MS = 60s), so scan-result / quiz-end ads
 * and this timer can never stack into two ads inside the same minute.
 *
 * Mounted once, inside the authenticated app only (see app/_layout.tsx), so no
 * ad ever fires over the splash, onboarding or sign-in screens.
 */
const TICK_MS = 60 * 1000; // every 1 minute

export function InterstitialTimer() {
  const [houseVisible, setHouseVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tick = () => {
      // Only when the app is actually on screen — never fire in the background.
      if (AppState.currentState !== "active") return;
      presentInterstitial(() => setHouseVisible(true));
    };

    const start = () => {
      if (timer.current) return;
      timer.current = setInterval(tick, TICK_MS);
    };
    const stop = () => {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    };

    // Run the clock only while foregrounded; pause it on background so the
    // minute doesn't tick away while the app is closed.
    const onChange = (state: AppStateStatus) => {
      if (state === "active") start();
      else stop();
    };

    start();
    const sub = AppState.addEventListener("change", onChange);
    return () => {
      stop();
      sub.remove();
    };
  }, []);

  return <HouseInterstitialModal visible={houseVisible} onClose={() => setHouseVisible(false)} />;
}
