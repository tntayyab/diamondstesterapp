/**
 * Supabase Edge Function — POST /functions/v1/revenuecat-webhook
 *
 * RevenueCat calls this on every subscription event. It maps the purchased
 * Google Play product to a plan tier + monthly credit grant and writes it to the
 * buyer's `profiles` row, matched by app_user_id (which equals the Supabase user
 * id the app passes to Purchases.configure({ appUserID })).
 *
 *   diamonds_starter  → plan "starter"  · 120 credits / month
 *   diamonds_explorer → plan "explorer" · 550 credits / month
 *   diamonds_pro      → plan "pro"      · 1200 credits / month
 *
 * Credits ADD to the buyer's existing balance on each grant (so the 30 free
 * signup credits + a Starter plan = 150), and roll over. Each event id is
 * recorded in profiles.last_rc_event_id so a retried/duplicate webhook never
 * grants the same credits twice.
 *
 * Security: RevenueCat (dashboard → Integrations → Webhooks) is configured to
 * send an `Authorization` header equal to REVENUECAT_WEBHOOK_AUTH. Requests that
 * don't match are rejected, so nobody can grant themselves credits.
 *
 * Deploy:
 *   supabase secrets set REVENUECAT_WEBHOOK_AUTH=<a long random secret>
 *   supabase functions deploy revenuecat-webhook --no-verify-jwt
 *
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
 */
import { createClient } from "npm:@supabase/supabase-js@^2.45.4";

// Product (Google Play subscription id) → tier + monthly credit allotment.
// Matched by substring so "diamonds_pro:monthly" resolves to the pro tier. The
// three ids are distinct substrings, so match order doesn't matter.
const TIERS: { match: string; plan: string; credits: number }[] = [
  { match: "diamonds_starter", plan: "starter", credits: 120 },
  { match: "diamonds_explorer", plan: "explorer", credits: 550 },
  { match: "diamonds_pro", plan: "pro", credits: 1200 },
];

// Events that (re)grant the plan and refresh the monthly credits.
const GRANT_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
]);

// Events that drop the buyer back to the free plan. Note we deliberately do NOT
// act on CANCELLATION (auto-renew off, but access continues until it expires) or
// BILLING_ISSUE (grace period) — only a real EXPIRATION removes the plan.
const REVOKE_EVENTS = new Set(["EXPIRATION"]);

function tierFor(productId: string): { plan: string; credits: number } | null {
  const id = (productId || "").toLowerCase();
  for (const t of TIERS) {
    if (id.includes(t.match)) return { plan: t.plan, credits: t.credits };
  }
  return null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // Verify the shared secret RevenueCat sends in the Authorization header.
  const expected = Deno.env.get("REVENUECAT_WEBHOOK_AUTH");
  if (!expected || req.headers.get("Authorization") !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: { event?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const event = (payload?.event ?? {}) as Record<string, unknown>;
  const type = String(event.type ?? "");
  const appUserId = String(event.app_user_id ?? "");
  const productId = String(event.product_id ?? "");
  // Unique id for this event — used to make credit grants idempotent so a
  // retried/duplicate webhook never adds the same credits twice.
  const eventId = String(event.id ?? event.transaction_id ?? "");

  // Ignore anonymous / signed-out purchases — 200 so RevenueCat doesn't retry.
  if (!appUserId || appUserId.startsWith("$RCAnonymousID")) {
    return json({ ok: true, ignored: "anonymous" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return new Response("Server not configured", { status: 500 });
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    if (GRANT_EVENTS.has(type)) {
      const tier = tierFor(productId);
      if (!tier) return json({ ok: true, ignored: "unknown product", productId });

      // Read the current balance + last processed event so the plan's credits
      // ADD to whatever the user already has (e.g. their 30 free signup credits
      // → 30 + 120 = 150), and a retried webhook for the same event is ignored.
      const { data: prof, error: readErr } = await admin
        .from("profiles")
        .select("credits, last_rc_event_id")
        .eq("id", appUserId)
        .maybeSingle();
      if (readErr) return new Response(readErr.message, { status: 500 });
      if (eventId && prof?.last_rc_event_id === eventId) {
        return json({ ok: true, ignored: "duplicate event", eventId });
      }

      const newCredits = (prof?.credits ?? 0) + tier.credits;
      const { error } = await admin
        .from("profiles")
        .update({ plan: tier.plan, credits: newCredits, last_rc_event_id: eventId || null })
        .eq("id", appUserId);
      if (error) return new Response(error.message, { status: 500 });
      return json({ ok: true, type, plan: tier.plan, credits: newCredits, added: tier.credits });
    }

    if (REVOKE_EVENTS.has(type)) {
      // Only a CREDIT-tier expiration drops the plan. The Ad-Free add-on is a
      // separate subscription (its own entitlement, no credits, gated ads
      // client-side), so its expiration must NOT wipe the buyer's credit plan —
      // otherwise a user who holds both would lose their credits when Ad-Free
      // lapses.
      if (!tierFor(productId)) return json({ ok: true, ignored: "non-credit expiration", productId });

      const { error } = await admin.from("profiles").update({ plan: "free" }).eq("id", appUserId);
      if (error) return new Response(error.message, { status: 500 });
      return json({ ok: true, type, plan: "free" });
    }

    // CANCELLATION, BILLING_ISSUE, TRANSFER, etc. — keep access, no change.
    return json({ ok: true, ignored: type });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "error", { status: 500 });
  }
});
