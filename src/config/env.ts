/**
 * Single source of truth for every runtime-configurable value.
 *
 * Metro statically replaces `process.env.EXPO_PUBLIC_*` at bundle time, so each
 * one must be written out literally — you cannot index it dynamically.
 * See .env.example for what each key is and where to obtain it.
 */

const text = (value: string | undefined, fallback = ""): string => (value ?? fallback).trim();

const number = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(text(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const flag = (value: string | undefined, fallback: boolean): boolean => {
  const raw = text(value).toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes";
};

const supabaseUrl = text(process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = text(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
const identifyFunction = text(process.env.EXPO_PUBLIC_IDENTIFY_FUNCTION, "identify");
const identifyUrlOverride = text(process.env.EXPO_PUBLIC_IDENTIFY_URL);
const anthropicKey = text(process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY);
const revenueCatIos = text(process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY);
const revenueCatAndroid = text(process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY);
// Google's public TEST rewarded-ad unit — shows real (test) ads with no AdMob
// account. Swap for your own unit id in .env for production revenue.
const admobRewardedAndroid = text(
  process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID,
  "ca-app-pub-3940256099942544/5224354917",
);
const admobRewardedIos = text(
  process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS,
  "ca-app-pub-3940256099942544/1712485313",
);
const admobBannerAndroid = text(process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID);
const admobBannerIos = text(process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS);
const admobInterstitialAndroid = text(process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID);
const admobInterstitialIos = text(process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS);
// When "1", every ad slot uses Google's TEST unit — real (test) video ads
// ALWAYS fill, so you can confirm the integration. Set to "0" to earn real money.
const admobTestMode = flag(process.env.EXPO_PUBLIC_ADMOB_TEST_MODE, false);

export const env = {
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    /** False when the keys are missing — the app then runs fully offline. */
    configured: Boolean(supabaseUrl && supabaseAnonKey),
  },

  ai: {
    /** Preferred, secure path: an Edge Function that holds the Anthropic key. */
    edgeFunction: identifyFunction,
    /** Explicit endpoint override, e.g. the website's /api/identify route. */
    endpointOverride: identifyUrlOverride,
    /**
     * Local-dev escape hatch. When set, the app calls api.anthropic.com directly
     * and the key ends up inside the JS bundle. Never populate this in a
     * distributed build — see .env.example.
     */
    insecureDirectKey: anthropicKey,
    modelFree: text(process.env.EXPO_PUBLIC_AI_MODEL_FREE, "claude-haiku-4-5"),
    modelPro: text(process.env.EXPO_PUBLIC_AI_MODEL_PRO, "claude-sonnet-5"),
  },

  purchases: {
    iosKey: revenueCatIos,
    androidKey: revenueCatAndroid,
    entitlement: text(process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT, "pro"),
    offering: text(process.env.EXPO_PUBLIC_REVENUECAT_OFFERING, "default"),
    configured: Boolean(revenueCatIos || revenueCatAndroid),
  },

  ads: {
    /** Rewarded-ad unit id shown for the "watch ad → earn credits" reward. */
    rewardedAndroid: admobRewardedAndroid,
    rewardedIos: admobRewardedIos,
    /** Anchored banner shown at the bottom of browse screens. */
    bannerAndroid: admobBannerAndroid,
    bannerIos: admobBannerIos,
    /** Interstitial shown at natural breaks (after a result / quiz), frequency-capped. */
    interstitialAndroid: admobInterstitialAndroid,
    interstitialIos: admobInterstitialIos,
    /** Force Google TEST ad units on every slot (see above) — real ads always fill. */
    testMode: admobTestMode,
    /**
     * True while still on Google's public test unit — the UI can then label the
     * ad as a test placement so it's obvious no real revenue is flowing yet.
     */
    usingTestUnit:
      admobRewardedAndroid.startsWith("ca-app-pub-3940256099942544") ||
      admobRewardedIos.startsWith("ca-app-pub-3940256099942544"),
  },

  app: {
    siteUrl: text(process.env.EXPO_PUBLIC_SITE_URL, "https://diamondstester.com"),
    supportEmail: text(process.env.EXPO_PUBLIC_SUPPORT_EMAIL, "chaos.and.lovefam@gmail.com"),
    /** Mirrors the website's CREDITS_PER_SCAN so balances agree across platforms. */
    creditsPerScan: number(process.env.EXPO_PUBLIC_CREDITS_PER_SCAN, 10),
    guestFreeScans: number(process.env.EXPO_PUBLIC_GUEST_FREE_SCANS, 2),
    demoFallback: flag(process.env.EXPO_PUBLIC_ENABLE_DEMO_FALLBACK, true),
  },
} as const;

/** URL the app POSTs an image to. Empty when nothing is configured. */
export function identifyEndpoint(): string {
  if (env.ai.endpointOverride) return env.ai.endpointOverride;
  if (!env.supabase.configured) return "";
  return `${env.supabase.url}/functions/v1/${env.ai.edgeFunction}`;
}

/** Human-readable list of what is missing — surfaced on the Settings screen. */
export function missingConfig(): string[] {
  const gaps: string[] = [];
  if (!env.supabase.configured) gaps.push("Supabase URL / anon key");
  if (!identifyEndpoint() && !env.ai.insecureDirectKey) gaps.push("AI identification endpoint");
  if (!env.purchases.configured) gaps.push("RevenueCat SDK keys");
  return gaps;
}
