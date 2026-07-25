import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { env, identifyEndpoint } from "@/config/env";
import { supabase } from "@/lib/supabase";
import type { AuthenticityLevel } from "@/theme/colors";

/** The model's best guess at what kind of stone is in the photo. */
export type StoneType =
  | "Diamond"
  | "Moissanite"
  | "Cubic Zirconia"
  | "Glass"
  | "Other natural gemstone"
  | "Inconclusive";

export const STONE_TYPES: StoneType[] = [
  "Diamond",
  "Moissanite",
  "Cubic Zirconia",
  "Glass",
  "Other natural gemstone",
  "Inconclusive",
];

/** Shape returned by the Edge Function and by the direct Anthropic call. */
export interface IdentifyResult {
  /** The model's best guess at the stone's identity. Never a certified determination. */
  stoneType: StoneType;
  /** genuine | uncertain | simulant | synthetic — reused across the app's badge/colour system. */
  authenticityLevel: AuthenticityLevel;
  /** 0-100. A photo alone cannot certify a stone, so this should rarely sit near 100. */
  confidence: number;
  /** What the model actually saw: facet pattern, brilliance/fire, inclusions, colour, girdle, etc. */
  visualObservations: string[];
  /** Specific visual tells suggesting this is NOT a genuine diamond. Empty if none stood out. */
  redFlags: string[];
  /** What to do next — manual tests to try, or when to see a professional. */
  recommendedNextSteps: string[];
  funFact: string;
  /** Always populated. Surfaced verbatim near the result. */
  disclaimer: string;
}

export interface IdentifyResponse {
  result: IdentifyResult;
  source: "edge" | "direct" | "demo";
  creditsLeft: number | null;
}

export class IdentifyError extends Error {
  constructor(
    message: string,
    readonly code: "no_credits" | "guest_limit" | "not_configured" | "failed",
  ) {
    super(message);
    this.name = "IdentifyError";
  }
}

const AUTHENTICITY_LEVELS: AuthenticityLevel[] = ["genuine", "uncertain", "simulant", "synthetic"];

const DEFAULT_DISCLAIMER =
  "This is a visual estimate for entertainment/educational purposes, not a certified appraisal. Only a qualified gemologist with proper equipment can certify a stone.";

function coerce(raw: unknown): IdentifyResult {
  const value = (raw ?? {}) as Partial<Record<keyof IdentifyResult, unknown>>;
  const list = (input: unknown): string[] =>
    Array.isArray(input) ? input.filter((item): item is string => typeof item === "string") : [];
  const str = (input: unknown, fallback: string): string =>
    typeof input === "string" && input.trim() ? input.trim() : fallback;

  const stoneType = str(value.stoneType, "Inconclusive");
  const authenticity = str(value.authenticityLevel, "uncertain") as AuthenticityLevel;
  const confidenceRaw = typeof value.confidence === "number" ? value.confidence : Number(value.confidence);

  return {
    stoneType: STONE_TYPES.includes(stoneType as StoneType) ? (stoneType as StoneType) : "Inconclusive",
    authenticityLevel: AUTHENTICITY_LEVELS.includes(authenticity) ? authenticity : "uncertain",
    confidence: Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(100, Math.round(confidenceRaw))) : 40,
    visualObservations: list(value.visualObservations),
    redFlags: list(value.redFlags),
    recommendedNextSteps: list(value.recommendedNextSteps),
    funFact: str(value.funFact, ""),
    disclaimer: str(value.disclaimer, DEFAULT_DISCLAIMER),
  };
}

/**
 * Downscale + re-encode before upload. Claude accepts up to 2576px on the long
 * edge, but a 1280px JPEG is plenty for facet-level detail and cuts both upload
 * time and image-token cost substantially.
 */
async function prepareImage(uri: string): Promise<{ base64: string; mediaType: string }> {
  const image = await ImageManipulator.manipulate(uri).resize({ width: 1280 }).renderAsync();
  const saved = await image.saveAsync({ compress: 0.82, format: SaveFormat.JPEG, base64: true });

  if (!saved.base64) throw new IdentifyError("Could not read the selected image.", "failed");

  return { base64: saved.base64, mediaType: "image/jpeg" };
}

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

/** JSON Schema enforced by Anthropic's structured outputs — no parsing guesswork. */
export const RESULT_SCHEMA = {
  type: "object",
  properties: {
    stoneType: { type: "string", enum: STONE_TYPES },
    authenticityLevel: { type: "string", enum: AUTHENTICITY_LEVELS },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
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

// ---------------------------------------------------------------------------
// Path 1 — Supabase Edge Function (production; key never leaves the server)
// ---------------------------------------------------------------------------

async function viaEdgeFunction(base64: string, mediaType: string): Promise<IdentifyResponse | null> {
  const endpoint = identifyEndpoint();
  if (!endpoint) return null;

  const accessToken = (await supabase?.auth.getSession())?.data.session?.access_token;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.supabase.anonKey,
      Authorization: `Bearer ${accessToken ?? env.supabase.anonKey}`,
    },
    body: JSON.stringify({ image: base64, mediaType }),
  });

  if (response.status === 402) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new IdentifyError(
      body.error === "guest_limit"
        ? "You have used your free scans for today. Sign in to keep testing."
        : "You are out of credits. Upgrade your plan to continue.",
      body.error === "guest_limit" ? "guest_limit" : "no_credits",
    );
  }

  // 404/503 => function not deployed or key not set. Fall through to the next path.
  if (!response.ok) return null;

  const body = (await response.json()) as { result: unknown; creditsLeft?: number | null };
  return { result: coerce(body.result), source: "edge", creditsLeft: body.creditsLeft ?? null };
}

// ---------------------------------------------------------------------------
// Path 2 — direct Anthropic call. LOCAL DEVELOPMENT ONLY.
//
// This deliberately uses raw fetch rather than @anthropic-ai/sdk: the SDK would
// be bundled into every production build for a code path that must never run
// there. The real integration lives in supabase/functions/identify-diamond,
// which does use the official SDK.
// ---------------------------------------------------------------------------

async function viaDirectAnthropic(
  base64: string,
  mediaType: string,
  model: string,
): Promise<IdentifyResponse | null> {
  if (!env.ai.insecureDirectKey) return null;

  if (!__DEV__) {
    // Belt and braces: refuse to spend the key from a release build even if
    // someone shipped one with the variable set.
    return null;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ai.insecureDirectKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      output_config: { format: { type: "json_schema", schema: RESULT_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    }),
  });

  if (!response.ok) return null;

  const body = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
    stop_reason?: string;
  };

  if (body.stop_reason === "refusal") {
    throw new IdentifyError("The model declined to analyse this image.", "failed");
  }

  const text = body.content?.find((block) => block.type === "text")?.text;
  if (!text) return null;

  return { result: coerce(JSON.parse(text)), source: "direct", creditsLeft: null };
}

// ---------------------------------------------------------------------------
// Path 3 — bundled demo result, so the app is never a dead end
// ---------------------------------------------------------------------------

const DEMO_RESULTS: IdentifyResult[] = [
  {
    stoneType: "Diamond",
    authenticityLevel: "uncertain",
    confidence: 55,
    visualObservations: [
      "Clean, symmetrical facet pattern with sharp (not rounded) junctions",
      "Strong white brilliance with flashes of spectral fire",
      "A few tiny dark inclusions visible near the culet",
      "Girdle appears frosted rather than glassy",
    ],
    redFlags: [],
    recommendedNextSteps: [
      "Try the fog/breath test below and see how fast it clears",
      "Check the metal setting for a genuine hallmark like 10K, 14K or 925",
      "For anything valuable, get a professional loupe inspection before you rely on this result",
    ],
    funFact: "Under a jeweller's loupe, real diamond facet junctions meet in crisp lines — moissanite often shows a faint doubling effect instead.",
    disclaimer: DEFAULT_DISCLAIMER,
  },
  {
    stoneType: "Moissanite",
    authenticityLevel: "simulant",
    confidence: 62,
    visualObservations: [
      "Unusually intense rainbow-coloured fire across the whole stone",
      "Facet edges show a faint double-image effect typical of high dispersion",
      "Very few, if any, visible inclusions",
      "Colour reads slightly warmer/greyer than typical diamond white under this light",
    ],
    redFlags: [
      "Rainbow fire is noticeably stronger than a diamond of this size would usually show",
      "Doubling at the facet junctions is a classic moissanite tell under magnification",
    ],
    recommendedNextSteps: [
      "Look for facet doubling with a 10x loupe — moissanite's birefringence causes this",
      "Ask the seller directly whether the stone is lab-tested as moissanite",
      "A jeweller's electrical conductivity tester can usually separate moissanite from diamond in seconds",
    ],
    funFact: "Moissanite was first identified in a meteor crater in 1893 — nearly all of it sold today is lab-grown.",
    disclaimer: DEFAULT_DISCLAIMER,
  },
];

function demoResult(): IdentifyResponse {
  const index = Math.floor(Math.random() * DEMO_RESULTS.length);
  return { result: DEMO_RESULTS[index], source: "demo", creditsLeft: null };
}

// ---------------------------------------------------------------------------

/**
 * Analyse the diamond/gemstone photo at `imageUri`, trying each backend in
 * order of security: Edge Function → local-dev direct call → bundled demo.
 *
 * A photo can never certify a stone — the result is always framed as an
 * estimate that points toward the manual tests and professional checks.
 *
 * @param isPro Selects the accurate Sonnet model over the fast Haiku one.
 */
export async function identifyGemstone(imageUri: string, isPro: boolean): Promise<IdentifyResponse> {
  const { base64, mediaType } = await prepareImage(imageUri);
  const model = isPro ? env.ai.modelPro : env.ai.modelFree;

  // IdentifyError (out of credits, guest limit) must propagate — only fall
  // through to the next path on a transport/config failure.
  let transportFailure: unknown = null;

  try {
    const edge = await viaEdgeFunction(base64, mediaType);
    if (edge) return edge;
  } catch (error) {
    if (error instanceof IdentifyError) throw error;
    transportFailure = error;
  }

  try {
    const direct = await viaDirectAnthropic(base64, mediaType, model);
    if (direct) return direct;
  } catch (error) {
    if (error instanceof IdentifyError) throw error;
    transportFailure = error;
  }

  if (env.app.demoFallback) return demoResult();

  throw new IdentifyError(
    transportFailure instanceof Error
      ? transportFailure.message
      : "No identification backend is configured. See .env.example.",
    "not_configured",
  );
}
