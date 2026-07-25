/**
 * Google AdMob rewarded ads.
 *
 * `react-native-google-mobile-ads` is a native module: it is absent in Expo Go
 * and in the web bundle. Like `purchases.ts`, every entry point here degrades to
 * a safe no-op (returning `false`) rather than crashing, so the "watch ad to
 * earn credits" flow simply falls back to the simulated modal when there is no
 * native binding. Real ads only run in the standalone / dev-client APK.
 *
 * Out of the box the app is wired to Google's public TEST ad unit, so the
 * standalone APK shows real (test) rewarded ads with no AdMob account. Swap in
 * your own unit ids via .env (EXPO_PUBLIC_ADMOB_REWARDED_*) plus your App ID in
 * app.json to start earning.
 */
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

import { env } from "@/config/env";

/**
 * True inside Expo Go, where `react-native-google-mobile-ads`'s native side
 * (`RNGoogleMobileAdsModule`) does not exist at all — only the JS half ships
 * in node_modules. Checked up front so we never even attempt the native
 * `require()`/property-access chain there, on top of the try/catch below.
 */
const isExpoGo =
  Constants.appOwnership === "expo" || Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

interface AdInstance {
  addAdEventListener: (type: string, handler: (payload?: unknown) => void) => () => void;
  load: () => void;
  show: () => Promise<void> | void;
}

interface AdsModule {
  default: () => { initialize: () => Promise<unknown> };
  RewardedAd: { createForAdRequest: (unitId: string, options?: unknown) => AdInstance };
  InterstitialAd: { createForAdRequest: (unitId: string, options?: unknown) => AdInstance };
  RewardedAdEventType: { LOADED: string; EARNED_REWARD: string };
  AdEventType: { ERROR: string; CLOSED: string; OPENED: string; LOADED: string };
  BannerAd: unknown;
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: string };
  TestIds: { REWARDED: string; INTERSTITIAL: string; BANNER: string };
}

/** Components the native banner needs, or `null` when ads are unavailable. */
export function bannerComponents(): { BannerAd: unknown; anchoredSize: string } | null {
  const mod = loadAds();
  if (!mod || !nativeReady) return null;
  return { BannerAd: mod.BannerAd, anchoredSize: mod.BannerAdSize.ANCHORED_ADAPTIVE_BANNER };
}

/** Platform banner unit id (test unit when testMode is on, else the configured id). */
export function bannerUnitId(): string {
  const mod = loadAds();
  if (env.ads.testMode) return mod?.TestIds.BANNER || "ca-app-pub-3940256099942544/6300978111";
  const configured = Platform.OS === "ios" ? env.ads.bannerIos : env.ads.bannerAndroid;
  return configured || mod?.TestIds.BANNER || "ca-app-pub-3940256099942544/6300978111";
}

function interstitialUnitId(mod: AdsModule): string {
  if (env.ads.testMode) return mod.TestIds.INTERSTITIAL;
  const configured = Platform.OS === "ios" ? env.ads.interstitialIos : env.ads.interstitialAndroid;
  return configured || mod.TestIds.INTERSTITIAL;
}

// Frequency cap so interstitials never feel spammy (and stay policy-safe).
const INTERSTITIAL_MIN_GAP_MS = 2 * 60 * 1000; // at most one per 2 minutes
const LAUNCH_GRACE_MS = 30 * 1000; // none in the first 30s after launch
const launchedAt = Date.now();
let lastInterstitialAt = 0;

/** Shared gate: is this call site allowed to show *any* interstitial right now? */
function interstitialSlotAvailable(): boolean {
  const now = Date.now();
  if (now - launchedAt < LAUNCH_GRACE_MS) return false;
  if (now - lastInterstitialAt < INTERSTITIAL_MIN_GAP_MS) return false;
  return true;
}

/**
 * Show an interstitial at a natural break (after a result / quiz), but only if
 * the frequency cap allows. Never shows on web/Expo Go. Fire-and-forget.
 */
export function maybeShowInterstitial(): void {
  const mod = loadAds();
  if (!mod || !nativeReady) return;
  if (!interstitialSlotAvailable()) return;
  lastInterstitialAt = Date.now(); // reserve the slot up-front so we don't stack loads

  try {
    const ad = mod.InterstitialAd.createForAdRequest(interstitialUnitId(mod), {
      requestNonPersonalizedAdsOnly: true,
    });
    const offs: Array<() => void> = [];
    const cleanup = () =>
      offs.forEach((off) => {
        try {
          off();
        } catch {
          /* ignore */
        }
      });
    offs.push(
      ad.addAdEventListener(mod.AdEventType.LOADED, () => {
        try {
          void ad.show();
        } catch {
          cleanup();
        }
      }),
    );
    offs.push(ad.addAdEventListener(mod.AdEventType.CLOSED, cleanup));
    offs.push(ad.addAdEventListener(mod.AdEventType.ERROR, cleanup));
    ad.load();
  } catch {
    /* ignore — the app must never break because an ad failed */
  }
}

/**
 * Same call sites and frequency cap as `maybeShowInterstitial`, but chooses
 * between a real AdMob interstitial (when the native module is ready) and a
 * simple text "house ad" fallback — so callers never need their own toggle,
 * and dropping in real AdMob keys later switches every call site automatically.
 */
export function presentInterstitial(onHouseFallback: () => void): void {
  if (!interstitialSlotAvailable()) return;

  const mod = loadAds();
  if (mod && nativeReady) {
    maybeShowInterstitial();
    return;
  }

  lastInterstitialAt = Date.now(); // reserve the slot for the house ad too
  onHouseFallback();
}

export interface RewardedAdResult {
  /** The ad actually appeared on screen (as opposed to failing to load). */
  shown: boolean;
  /** The user watched long enough to earn the reward. */
  earned: boolean;
}

const NO_AD: RewardedAdResult = { shown: false, earned: false };

let cached: AdsModule | null | undefined;
let nativeReady = false;

/** `null` on web/Expo Go where the native module cannot load. */
function loadAds(): AdsModule | null {
  if (cached !== undefined) return cached;

  if (Platform.OS === "web" || isExpoGo) {
    cached = null;
    return cached;
  }

  try {
    // Lazy require so the web bundler never evaluates the native module, and
    // so Expo Go (which lacks the RNGoogleMobileAdsModule native binding)
    // never touches it either — see the `isExpoGo` short-circuit above. Kept
    // in a try/catch regardless, since a dev client can still be missing the
    // native module if it wasn't rebuilt after adding the package.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("react-native-google-mobile-ads") as AdsModule;
  } catch {
    cached = null;
  }

  return cached;
}

/** The unit id for the current platform, falling back to the test unit. */
function rewardedUnitId(mod: AdsModule): string {
  if (env.ads.testMode) return mod.TestIds.REWARDED;
  const configured = Platform.OS === "ios" ? env.ads.rewardedIos : env.ads.rewardedAndroid;
  return configured || mod.TestIds.REWARDED;
}

/** Initialise the SDK once at app start. Safe to call when ads are unavailable. */
export async function initAds(): Promise<void> {
  const mod = loadAds();
  if (!mod) return;

  try {
    await mod.default().initialize();
    // Reached only when the native module answered — Expo Go throws above.
    nativeReady = true;
  } catch {
    nativeReady = false;
  }
}

/** True once the native SDK has initialised — i.e. real ads can be shown. */
export const adsAvailable = (): boolean => nativeReady;

/**
 * Load and present a rewarded ad. Never rejects. The result distinguishes:
 *  - `{ shown: true,  earned: true  }` — watched to completion → grant reward.
 *  - `{ shown: true,  earned: false }` — dismissed early → grant nothing.
 *  - `{ shown: false, earned: false }` — no fill / no network / no native
 *    binding → the caller may fall back to the simulated reward so the user is
 *    never stuck (and this can't be exploited: you can't force a no-fill just by
 *    closing the ad, which reports `shown: true`).
 */
export function showRewardedAd(): Promise<RewardedAdResult> {
  const mod = loadAds();
  if (!mod || !nativeReady) return Promise.resolve(NO_AD);

  return new Promise<RewardedAdResult>((resolve) => {
    let settled = false;
    const unsubs: Array<() => void> = [];

    const finish = (result: RewardedAdResult) => {
      if (settled) return;
      settled = true;
      unsubs.forEach((off) => {
        try {
          off();
        } catch {
          /* ignore */
        }
      });
      resolve(result);
    };

    try {
      const rewarded = mod.RewardedAd.createForAdRequest(rewardedUnitId(mod), {
        requestNonPersonalizedAdsOnly: true,
      });

      let shown = false;
      let earned = false;
      unsubs.push(
        rewarded.addAdEventListener(mod.RewardedAdEventType.LOADED, () => {
          try {
            void rewarded.show();
          } catch {
            finish(NO_AD);
          }
        }),
      );
      unsubs.push(
        rewarded.addAdEventListener(mod.AdEventType.OPENED, () => {
          shown = true;
        }),
      );
      unsubs.push(
        rewarded.addAdEventListener(mod.RewardedAdEventType.EARNED_REWARD, () => {
          earned = true;
        }),
      );
      unsubs.push(rewarded.addAdEventListener(mod.AdEventType.CLOSED, () => finish({ shown, earned })));
      unsubs.push(rewarded.addAdEventListener(mod.AdEventType.ERROR, () => finish({ shown, earned })));

      // Safety net: if nothing fires (rare), don't hang the reward UI forever.
      const timer = setTimeout(() => finish({ shown, earned }), 30000);
      unsubs.push(() => clearTimeout(timer));

      rewarded.load();
    } catch {
      finish(NO_AD);
    }
  });
}
