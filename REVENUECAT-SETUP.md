# RevenueCat — publish-time setup checklist

The **app code is already 100% done** (`src/lib/purchases.ts`, `app/paywall.tsx`).
Nothing in the code needs to change. This file is the dashboard/store setup you
do **once, at publish time**, so real subscriptions turn on. Until then the
paywall renders fine and just shows "in-app purchases need a dev build".

Everything below can only be finished **after** the app exists in Google Play
Console (you need a Play developer account + the app uploaded at least as a
draft, because subscription products live in Play Console).

---

## What's already wired in the code (don't touch)

- `initPurchases()` configures RevenueCat with the Android key from `.env`.
- `getPackages()` reads the offering named in `EXPO_PUBLIC_REVENUECAT_OFFERING`
  (default **`default`**) and returns its packages **in order**.
- The paywall (`app/paywall.tsx`) maps them **positionally** to the 3 tiers in
  `src/content/pricing.ts`:

  | Paywall position | Tier   | Price (regular / first month) |
  |------------------|--------|-------------------------------|
  | 1st package      | Starter | $4.99 / $2.49                |
  | 2nd package      | Explorer| $9.99 / $4.99                |
  | 3rd package      | Pro     | $19.99 / $9.99               |

  ⚠️ **The offering's packages MUST be ordered Starter → Explorer → Pro**, or the
  buttons will buy the wrong plan.
- `purchase()` / `restore()` check the entitlement named in
  `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT` (default **`pro`**).

---

## Step 1 — Google Play Console: create 3 subscription products

Play Console → your app → **Monetize → Products → Subscriptions → Create subscription**.
Create these three (IDs are your choice, but use these exact ones so nothing
else needs changing):

| Product ID (Base plan ID `monthly`) | Name in store | Price | Free trial | Intro offer |
|-------------------------------------|---------------|-------|------------|-------------|
| `diamonds_starter_monthly`  | Diamonds Tester Starter  | $4.99/mo  | 7 days | 50% off first month ($2.49) |
| `diamonds_explorer_monthly` | Diamonds Tester Explorer | $9.99/mo  | 7 days | 50% off first month ($4.99) |
| `diamonds_pro_monthly`      | Diamonds Tester Pro      | $19.99/mo | 7 days | 50% off first month ($9.99) |

- The 7-day free trial and 50%-off-first-month are **offers** you add on each
  subscription's base plan.
- Activate all three.

## Step 2 — RevenueCat account + project

1. Sign up at **https://app.revenuecat.com** (with the account you want to own billing).
2. **+ New Project** → name it `Diamonds Tester`.
3. **Project Settings → Apps → + Play Store**:
   - App package name: `com.appsgurus24.diamondstester`
   - Upload the **Google Service Account credentials JSON** (Play Console →
     Setup → API access → create/link a service account with the "Finance" +
     "View app information" permissions, download its JSON). RevenueCat needs
     this to validate purchases.
4. On the Play Store app page, copy the **Public SDK Key** — it starts with
   **`goog_`**. This is safe to ship (it's a public key).

## Step 3 — Entitlement + Offering in RevenueCat

1. **Product Catalog → Entitlements → + New** → identifier: **`pro`**
2. **Product Catalog → Products** → import/add the 3 Play products
   (`diamonds_starter_monthly`, `diamonds_explorer_monthly`, `diamonds_pro_monthly`).
   Attach **all three** to the `pro` entitlement.
3. **Product Catalog → Offerings → + New** → identifier: **`default`**
   - Add 3 packages, **in this order**:
     1. Starter  → `diamonds_starter_monthly`
     2. Explorer → `diamonds_explorer_monthly`
     3. Pro      → `diamonds_pro_monthly`
   - Mark `default` as the **Current** offering.

## Step 4 — Put the key in the app

Add the `goog_` key in **two** places (the app reads `.env` locally, EAS cloud
builds read `eas.json`):

**`.env`:**
```
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_XXXXXXXXXXXXXXXXXXXX
```
(ENTITLEMENT and OFFERING are already `pro` / `default` — leave them.)

**`eas.json`** → `build.preview.env` (and `build.production.env` when you make
one), add:
```
"EXPO_PUBLIC_REVENUECAT_ANDROID_KEY": "goog_XXXXXXXXXXXXXXXXXXXX"
```

## Step 5 — Rebuild

RevenueCat is a native module, so it only works in a real build (not Expo Go):
```
npx eas build --platform android --profile preview
```
Install that APK, open the paywall, and the 3 real plans with prices should
appear. Use a Play Console **licence tester** account to test a purchase without
being charged.

---

## Quick reference — values the code expects

| Thing | Value |
|---|---|
| Android package | `com.appsgurus24.diamondstester` |
| Entitlement id | `pro` |
| Offering id | `default` |
| Product ids (in order) | `diamonds_starter_monthly`, `diamonds_explorer_monthly`, `diamonds_pro_monthly` |
| Env var for key | `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (starts `goog_`) |

That's the whole job. When you're ready to publish, just tell me and we'll walk
these steps together — the code side won't need any changes.
