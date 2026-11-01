import { useEffect } from "react";
import { Platform } from "react-native";

/**
 * Google Play In-App Updates — FLEXIBLE.
 *
 * On a production Android build installed from Google Play, this asks Play at
 * launch whether a newer versionCode is available on the user's track. If so it
 * shows Play's own flexible-update sheet: the app keeps working while the new
 * version downloads in the background, and the native module auto-installs it
 * once the download finishes (it calls `completeUpdate()` on the DOWNLOADED
 * status for us — no extra call needed here).
 *
 * `expo-in-app-updates` is a native Expo module that is NOT present in Expo Go,
 * so it is required lazily inside the effect (never at import time) and only on
 * a production Android build — that way Expo Go and dev clients simply skip it
 * instead of crashing on a missing native module.
 *
 * The flexible prompt only appears once a NEWER version than the running one is
 * live on Play, so this build won't prompt itself; the next update will prompt
 * everyone who is on this version.
 */
export function InAppUpdater() {
  useEffect(() => {
    if (__DEV__ || Platform.OS !== "android") return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const InApp = require("expo-in-app-updates") as {
        checkAndStartUpdate?: (isImmediate?: boolean) => Promise<boolean>;
      };
      // `false` = flexible (non-blocking). Never let an update check crash the app.
      void InApp.checkAndStartUpdate?.(false)?.catch(() => {});
    } catch {
      // Module unavailable (Expo Go / web) — skip silently.
    }
  }, []);

  return null;
}
