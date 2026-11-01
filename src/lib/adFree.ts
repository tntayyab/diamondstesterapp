/**
 * Ad-free state store.
 *
 * The "Ad-Free" subscription is a separate RevenueCat entitlement (see
 * `env.purchases.adfreeEntitlement`) — buying it removes banner and full-screen
 * ads, while the credit plans (Starter/Explorer/Pro) do not. The opt-in
 * "watch ad → earn credits" reward is intentionally left ON even for ad-free
 * users, so a 0-credit Ad-Free subscriber can still earn scans.
 *
 * This tiny external store lets two very different callers share one flag:
 *  - `AdBanner` (a component) reads it reactively via `useAdFree()`.
 *  - `ads.ts` (plain module, no hooks) reads it synchronously via `adFreeActive()`.
 *
 * `refreshAdFree()` re-reads the entitlement from RevenueCat and is called at
 * startup (once billing is wired to the user) and after any purchase/restore.
 */
import { useSyncExternalStore } from "react";

import { isAdFree as readAdFreeEntitlement } from "@/lib/purchases";

let adFree = false;
const listeners = new Set<() => void>();

/** Synchronous read for non-React callers (e.g. the interstitial gate in `ads.ts`). */
export function adFreeActive(): boolean {
  return adFree;
}

function setAdFree(next: boolean): void {
  if (adFree === next) return;
  adFree = next;
  listeners.forEach((notify) => notify());
}

/**
 * Re-read the ad-free entitlement from RevenueCat and update the store.
 *
 * A `null` result means "couldn't determine" (Expo Go / web / not configured, or
 * a transient getCustomerInfo() failure). In that case we keep the current flag
 * rather than flipping it off — otherwise a background re-check that momentarily
 * fails would make ads suddenly reappear for a paying Ad-Free subscriber. Only a
 * trustworthy `true`/`false` read is allowed to change the state.
 */
export async function refreshAdFree(): Promise<boolean> {
  const active = await readAdFreeEntitlement();
  if (active === null) return adFree;
  setAdFree(active);
  return active;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function snapshot(): boolean {
  return adFree;
}

/** React hook — re-renders when the ad-free entitlement turns on/off. */
export function useAdFree(): boolean {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
