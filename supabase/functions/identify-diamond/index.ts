/**
 * Supabase Edge Function — POST /functions/v1/identify-diamond
 *
 * This is the ONLY place the Anthropic API key exists. The mobile app sends a
 * base64 image and its Supabase access token; this function enforces credits,
 * calls Claude, and records the analysis. The key never reaches the device.
 *
 * IMPORTANT: this is a visual estimate, never a certified appraisal. A photo
 * cannot prove a stone is a genuine diamond — the prompt is written to keep
 * the model appropriately uncertain and to steer users toward the manual
 * tests and professional verification covered elsewhere in the app.
 *
 * Deploy:
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...
 *   supabase functions deploy identify-diamond
 *
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
 */
import Anthropic from "npm:@anthropic-ai/sdk@^0.68.0";
import { createClient } from "npm:@supabase/supabase-js@^2.45.4";

const CREDITS_PER_SCAN = 10;
const GUEST_FREE_SCANS = 2;

// Keep these aligned with EXPO_PUBLIC_AI_MODEL_* in the app's .env.
const MODEL_FREE = "claude-haiku-4-5";
const MODEL_PRO = "claude-haiku-4-5";

const STONE_TYPES = ["Diamond", "Moissanite", "Cubic Zirconia", "Glass", "Other natural gemstone", "Inconclusive"];
const AUTHENTICITY_LEVELS = ["genuine", "uncertain", "simulant", "synthetic"];

const PROMPT = `You are a careful, honest gemologist assisting with a casual visual assessment of a diamond or
gemstone photo. You are NOT performing a certified appraisal — a photograph alone can never prove a stone
is a genuine diamond. Your job is to describe what you actually see and to guide the user toward the real
manual tests and professional verification, never to overclaim.

Rules:
- "visualObservations" lists 3-6 concrete things you can see: facet pattern/symmetry, brilliance and fire,
  visible inclusions or bubbles, colour and tone, girdle appearance, any metal setting/mount markings.
- "redFlags" lists specific visual tells suggesting the stone is NOT a genuine diamond (e.g. rounded facet
  junctions, excessive rainbow-coloured fire, visible gas bubbles, doubled facet edges, unnaturally perfect
  clarity, a setting stamped "925" or plainly costume-jewellery in construction). Leave it empty if nothing
  stood out — do not invent flaws.
- "stoneType" is your best single guess: Diamond, Moissanite, Cubic Zirconia, Glass, Other natural gemstone,
  or Inconclusive when the photo genuinely does not give you enough to go on. Prefer "Inconclusive" over a
  confident-sounding guess you cannot support.
- "authenticityLevel" is genuine, uncertain, simulant, or synthetic. Default to "uncertain" unless the visual
  evidence is unusually clear — a photo cannot rule out a well-made simulant.
- "confidence" is 0-100 and should usually sit in the 20-70 range. Never output above ~85; no camera photo
  earns higher certainty than that for a task like this.
- "recommendedNextSteps" gives 2-4 concrete, honest actions: which manual test to try (fog test, water test,
  loupe inspection, checking the setting for a "10K"/"14K"/"925" stamp), and when to suggest a professional
  loupe inspection, thermal tester, or GIA/lab certificate check.
- "funFact" is one short, genuinely interesting fact about diamonds/gemstones/testing methods.
- "disclaimer" must always be populated, e.g. "This is a visual estimate for entertainment/educational
  purposes, not a certified appraisal."
- If the image is clearly not a gemstone at all, set stoneType to "Inconclusive", authenticityLevel to
  "uncertain", confidence low, and say so plainly in visualObservations.
- Never claim certainty a photograph cannot support. Never tell the user the stone is "definitely" real or fake.`;

/**
 * Structured outputs guarantee the response validates against this schema, so
 * there is no markdown-fence stripping or JSON.parse guesswork on either side.
 */
const RESULT_SCHEMA = {
  type: "object",
  properties: {
    stoneType: { type: "string", enum: STONE_TYPES },
    authenticityLevel: { type: "string", enum: AUTHENTICITY_LEVELS },
    confidence: { type: "integer" },
    visualObservations: { type: "array", items: { type: "string" } },
    redFlags: { type: "array", items: { type: "string" } },
    recommendedNextSteps: { type: "array", items: { type: "string" } },
    funFact: { type: "string" },
    disclaimer: { type: "string" },
  },
  required: [
    "stoneType",
    "authenticityLevel",
    "confidence",
    "visualObservations",
    "redFlags",
    "recommendedNextSteps",
    "funFact",
    "disclaimer",
  ],
  additionalProperties: false,
} as const;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const SUPPORTED_MEDIA = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type MediaType = (typeof SUPPORTED_MEDIA)[number];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Tell the client we are not set up, so it can fall back to demo results.
  if (!anthropicKey || !supabaseUrl || !serviceRoleKey) {
    return json({ error: "not_configured" }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Identify the caller from their bearer token (absent/anon => guest).
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  const user = userData?.user ?? null;

  let plan = "free";
  let credits = 0;

  if (user) {
    const { data: profile } = await admin
      .from("profiles")
      .select("plan, credits, total_identifications")
      .eq("id", user.id)
      .maybeSingle();

    plan = profile?.plan ?? "free";
    credits = profile?.credits ?? 0;

    if (credits < CREDITS_PER_SCAN) return json({ error: "no_credits" }, 402);
  } else {
    const ip = (req.headers.get("x-forwarded-for") ?? "0.0.0.0").split(",")[0].trim();
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await admin
      .from("ip_usage")
      .select("count, reset_date")
      .eq("ip_address", ip)
      .maybeSingle();

    const used = usage && usage.reset_date === today ? usage.count : 0;
    if (used >= GUEST_FREE_SCANS) return json({ error: "guest_limit" }, 402);
  }

  try {
    const body = (await req.json()) as { image?: string; mediaType?: string };
    if (!body.image) return json({ error: "no_image" }, 400);

    const mediaType: MediaType = SUPPORTED_MEDIA.includes(body.mediaType as MediaType)
      ? (body.mediaType as MediaType)
      : "image/jpeg";

    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const isPro = plan !== "free";

    const message = await anthropic.messages.create({
      model: isPro ? MODEL_PRO : MODEL_FREE,
      max_tokens: 2048,
      // Sonnet 5 runs adaptive thinking when `thinking` is omitted, which would
      // eat into max_tokens for no accuracy gain on a single-image lookup.
      // Haiku 4.5 rejects `output_config.effort`, so we set neither.
      ...(isPro ? { thinking: { type: "disabled" as const } } : {}),
      output_config: { format: { type: "json_schema", schema: RESULT_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: body.image } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    if (message.stop_reason === "refusal") {
      return json({ error: "refused", message: "The model declined to analyse this image." }, 422);
    }

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return json({ error: "failed", message: "Empty response from the model." }, 502);
    }

    // Guaranteed to parse and match RESULT_SCHEMA thanks to structured outputs.
    const result = JSON.parse(textBlock.text);

    let creditsLeft: number | null = null;

    if (user) {
      creditsLeft = credits - CREDITS_PER_SCAN;
      const { data: profile } = await admin
        .from("profiles")
        .select("total_identifications")
        .eq("id", user.id)
        .maybeSingle();

      await admin
        .from("profiles")
        .update({
          credits: creditsLeft,
          total_identifications: (profile?.total_identifications ?? 0) + 1,
        })
        .eq("id", user.id);
    } else {
      const ip = (req.headers.get("x-forwarded-for") ?? "0.0.0.0").split(",")[0].trim();
      const today = new Date().toISOString().slice(0, 10);
      const { data: usage } = await admin
        .from("ip_usage")
        .select("count, reset_date")
        .eq("ip_address", ip)
        .maybeSingle();

      const used = usage && usage.reset_date === today ? usage.count : 0;
      await admin.from("ip_usage").upsert({ ip_address: ip, count: used + 1, reset_date: today });
    }

    await admin.from("analyses").insert({
      user_id: user?.id ?? null,
      result,
      image_urls: [],
      credits_used: user ? CREDITS_PER_SCAN : 0,
    });

    return json({ result, creditsLeft, guest: !user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Identification failed";
    return json({ error: "failed", message }, 500);
  }
});
