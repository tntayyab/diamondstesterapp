/**
 * Web stub for `ads.ts`. Metro resolves this `.web.ts` variant on the web
 * target, so the web bundle never imports `react-native-google-mobile-ads`
 * (which pulls in React Native internals that don't exist on web). Ads are a
 * native-only feature; on web every entry point is a safe no-op and the chat
 * screen falls back to the simulated reward modal.
 */

export interface RewardedAdResult {
  shown: boolean;
  earned: boolean;
}

export async function initAds(): Promise<void> {
  /* no ads on web */
}

export const adsAvailable = (): boolean => false;

export function showRewardedAd(): Promise<RewardedAdResult> {
  return Promise.resolve({ shown: false, earned: false });
}

export function bannerComponents(): { BannerAd: unknown; anchoredSize: string } | null {
  return null;
}

export function bannerUnitId(): string {
  return "";
}

export function maybeShowInterstitial(): void {
  /* no ads on web */
}

/** On web there's never a real ad, so always fall back to the house interstitial. */
export function presentInterstitial(onHouseFallback: () => void): void {
  onHouseFallback();
}
