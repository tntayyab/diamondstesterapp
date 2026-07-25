# Spider Identifier — Mobile App

The **Expo / React Native** companion to [spideridentifier.online](https://spideridentifier.online).
Photograph any spider and get its species, family, venom risk and look-alikes in seconds.

Shares the **same Supabase project** as the website, so accounts, credits, scan history and saved
species stay in sync across web and mobile.

---

## Quick start

```bash
npm install
cp .env.example .env      # then fill in the values — see "Keys" below
npx expo start --clear
```

Press `a` for Android, `i` for iOS, `w` for web.

> **Expo Go caveat:** RevenueCat is a native module and does not run in Expo Go. The paywall still
> renders; purchases are simply disabled. For real purchases build a dev client:
> `npx expo run:android` (or `eas build --profile development`).

---

## Keys — what you need and where to get it

Everything is read from `.env` through [`src/config/env.ts`](src/config/env.ts). `.env` is
git-ignored; `.env.example` is the committed template and documents **every key in detail**.

| Key | Required? | Where to get it |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | yes | Supabase → Project Settings → API Keys → Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | yes | Same page → Publishable key (`sb_publishable_…`) |
| `ANTHROPIC_API_KEY` | for live AI | [console.anthropic.com](https://console.anthropic.com) → API Keys. **Server-side only** — set it as a Supabase secret, never in `.env` |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | for billing | [app.revenuecat.com](https://app.revenuecat.com) → Apps → Apple → Public SDK Key (`appl_…`) |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | for billing | Same, Google Play app (`goog_…`) |

> ⚠️ **Anything prefixed `EXPO_PUBLIC_` is inlined into the JS bundle and is readable by anyone who
> unzips the APK.** Never put a service-role key, an Anthropic key, or a RevenueCat *secret* key
> behind that prefix in a build you distribute.

The app works with **zero keys** — it falls back to bundled demo results so every screen is
demoable offline.

---

## AI identification — three paths, tried in order

[`src/lib/identify.ts`](src/lib/identify.ts) resolves a backend by descending security:

1. **Supabase Edge Function** (`supabase/functions/identify-diamond`) — production. Holds the Anthropic key
   server-side, enforces credits, records the analysis. The key never reaches the device.
2. **Direct Anthropic call** — local dev only, gated behind `__DEV__` *and* an explicit
   `EXPO_PUBLIC_ANTHROPIC_API_KEY`. Bakes the key into the bundle; never ship this.
3. **Bundled demo results** — so the app is never a dead end.

Both live paths use Anthropic **structured outputs** (`output_config.format`), so the response is
guaranteed to validate against the schema — no markdown-fence stripping, no `JSON.parse` guesswork.

Models are env-configurable:

| Tier | Model | Context | Price / 1M tokens |
|---|---|---|---|
| Free | `claude-haiku-4-5` | 200K | $1 in / $5 out |
| Paid | `claude-sonnet-5` | 1M | $3 in / $15 out |

### Deploying the Edge Function

```bash
npm i -g supabase
supabase login
supabase link --project-ref zrpnpqhrltflqtjurzec
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...
npm run deploy:functions
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected into the function automatically.

---

## What's in the app

**Tabs:** Identify · Species · Guides · Journal · Profile

| Area | Detail |
|---|---|
| **Identify** | Camera or gallery, image downscaled to 1280px before upload, live venom-risk result |
| **Result** | Confidence, key identifiers, look-alikes, TTS read-aloud, share sheet, **PDF report** |
| **Species** | 18-species offline library, search + venom filter, bookmarks |
| **Guides** | 8 offline field guides, anatomy explorer, web-type identifier |
| **Journal** | GPS-tagged sightings with photo + notes, **CSV export** |
| **Compare** | Side-by-side diff, defaults to the widow vs false-widow problem |
| **Quiz** | 8 questions generated from the real identification clues — cannot drift out of sync |
| **First aid** | Fully offline bite protocol, emergency-sign checklist, one-tap emergency call |
| **Profile** | Credits, streak, achievements, saved items, theme toggle, daily reminder |

Everything except live AI identification works with **no network at all**.

---

## Architecture notes

- **Local-first.** [`src/lib/storage.ts`](src/lib/storage.ts) (AsyncStorage) is the source of truth
  for history, journal, saves and streak. Supabase sync is an enhancement, never a prerequisite.
- **Billing = RevenueCat**, not Paddle. Apple and Google require in-app purchase for digital goods.
  [`src/lib/purchases.ts`](src/lib/purchases.ts) lazily `require`s the native module and degrades to
  a no-op everywhere it is absent.
- **Theme** is the website's brand ported to [`src/theme/colors.ts`](src/theme/colors.ts):
  emerald `#10b981` → teal `#0d9488` on warm-obsidian (dark) or warm-cream (light).
- `supabase/functions` runs on Deno and is excluded from the app's `tsconfig.json`; the Supabase CLI
  typechecks it.

---

## Scripts

| Command | Does |
|---|---|
| `npm start` | Metro dev server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run export` | Production JS bundle |
| `npm run build:android` | `eas build --profile preview` |
| `npm run deploy:functions` | Deploy the identify Edge Function |

---

## Disclaimer

AI-assisted identification can be wrong. Never handle a spider you believe may be dangerous, and
never rely on this app in a medical emergency.
