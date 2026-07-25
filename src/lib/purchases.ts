/**
 * RevenueCat billing.
 *
 * `react-native-purchases` is a native module: it is absent in Expo Go and in
 * the web bundle. Every function here degrades to a no-op rather than crashing,
 * so the paywall screen still renders and the rest of the app is unaffected.
 * Build a dev client (`npx expo run:android`) to exercise real purchases.
 */
import { Platform } from "react-native";

import { env } from "@/config/env";

export interface PurchasePackage {
  identifier: string;
  title: string;
  priceString: string;
  description: string;
}

export interface PurchasesModule {
  configure: (options: { apiKey: string; appUserID?: string | null }) => void;
  logIn: (userId: string) => Promise<unknown>;
  logOut: () => Promise<unknown>;
  getOfferings: () => Promise<unknown>;
  purchasePackage: (pkg: unknown) => Promise<unknown>;
  restorePurchases: () => Promise<unknown>;
  getCustomerInfo: () => Promise<unknown>;
}

let cached: PurchasesModule | null | undefined;

/**
 * True only after `configure()` has actually succeeded against a real native
 * binding. This is the only trustworthy signal: in Expo Go the JS half of
 * `react-native-purchases` loads fine (it is in node_modules), so a successful
 * `require` proves nothing — the native module is what's missing, and it only
 * makes itself known when you call into it.
 */
let nativeReady = false;

/** `null` when the module cannot be loaded at all (web, or keys not set). */
function loadPurchases(): PurchasesModule | null {
  if (cached !== undefined) return cached;

  if (Platform.OS === "web" || !env.purchases.configured) {
    cached = null;
    return cached;
  }

  try {
    // Required lazily so the bundler never evaluates the native module on web.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-purchases") as { default?: PurchasesModule } & PurchasesModule;
    cached = mod.default ?? mod;
  } catch {
    cached = null;
  }

  return cached;
}

export const billingAvailable = (): boolean => nativeReady;

/** Reason billing is unavailable, for display on the paywall. */
export function billingUnavailableReason(): string | null {
  if (Platform.OS === "web") return "In-app purchases are not available on the web.";
  if (!env.purchases.configured) {
    return "RevenueCat keys are not set. Add EXPO_PUBLIC_REVENUECAT_* to your .env file.";
  }
  if (!nativeReady) {
    return "In-app purchases need a custom dev build — they do not work in Expo Go.";
  }
  return null;
}

export async function initPurchases(userId: string | null): Promise<void> {
  const Purchases = loadPurchases();
  if (!Purchases) return;

  const apiKey = Platform.OS === "ios" ? env.purchases.iosKey : env.purchases.androidKey;
  if (!apiKey) return;

  try {
    Purchases.configure({ apiKey, appUserID: userId });
    // Reached only when the native module answered — Expo Go throws above.
    nativeReady = true;
    if (userId) await Purchases.logIn(userId);
  } catch {
    // Never let a billing SDK failure block app start. The paywall reads
    // `nativeReady` and disables its buttons instead of crashing on tap.
    nativeReady = false;
  }
}

interface RawOfferings {
  current?: { availablePackages?: RawPackage[] } | null;
  all?: Record<string, { availablePackages?: RawPackage[] } | undefined>;
}

interface RawPackage {
  identifier: string;
  product?: { title?: string; priceString?: string; description?: string };
}

/** Packages in the configured offering, or `[]` when billing is unavailable. */
export async function getPackages(): Promise<{ packages: PurchasePackage[]; raw: unknown[] }> {
  const Purchases = loadPurchases();
  if (!Purchases || !nativeReady) return { packages: [], raw: [] };

  try {
    const offerings = (await Purchases.getOfferings()) as RawOfferings;
    const offering = offerings.all?.[env.purchases.offering] ?? offerings.current;
    const raw = offering?.availablePackages ?? [];

    return {
      packages: raw.map((pkg) => ({
        identifier: pkg.identifier,
        title: pkg.product?.title ?? pkg.identifier,
        priceString: pkg.product?.priceString ?? "",
        description: pkg.product?.description ?? "",
      })),
      raw,
    };
  } catch {
    return { packages: [], raw: [] };
  }
}

interface RawCustomerInfo {
  entitlements?: { active?: Record<string, unknown> };
}

function hasEntitlement(info: unknown): boolean {
  const active = (info as RawCustomerInfo)?.entitlements?.active ?? {};
  return Boolean(active[env.purchases.entitlement]);
}

/** Returns true when the purchase completed and the entitlement is now active. */
export async function purchase(rawPackage: unknown): Promise<boolean> {
  const Purchases = loadPurchases();
  if (!Purchases || !nativeReady) return false;

  const outcome = (await Purchases.purchasePackage(rawPackage)) as { customerInfo?: unknown };
  return hasEntitlement(outcome.customerInfo);
}

export async function restore(): Promise<boolean> {
  const Purchases = loadPurchases();
  if (!Purchases || !nativeReady) return false;

  return hasEntitlement(await Purchases.restorePurchases());
}

export async function isSubscribed(): Promise<boolean> {
  const Purchases = loadPurchases();
  if (!Purchases || !nativeReady) return false;

  try {
    return hasEntitlement(await Purchases.getCustomerInfo());
  } catch {
    return false;
  }
}

export async function signOutPurchases(): Promise<void> {
  const Purchases = loadPurchases();
  if (!Purchases) return;
  try {
    await Purchases.logOut();
  } catch {
    /* ignore */
  }
}
