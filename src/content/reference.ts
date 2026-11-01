/** Static reference content: diamond anatomy, "sold a fake?" steps, quiz bank, achievements. */
import { speciesLibrary } from "./species";

// ---------------------------------------------------------------------------
// Anatomy — "Anatomy of a Diamond": the parts of a cut stone
// ---------------------------------------------------------------------------

export interface AnatomyPart {
  key: string;
  title: string;
  summary: string;
  points: string[];
}

export const anatomyParts: AnatomyPart[] = [
  {
    key: "table",
    title: "Table",
    summary: "The large, flat facet on top — the biggest single surface you look through into the stone.",
    points: [
      "Usually the widest facet on the whole stone",
      "Table size relative to the girdle affects how much light enters and returns as brilliance",
      "Too large a table can make a stone look 'glassy' and flat; too small can trap light and dull it",
    ],
  },
  {
    key: "crown",
    title: "Crown",
    summary: "The upper portion between the table and the girdle, made up of angled facets (bezel and star facets).",
    points: [
      "Crown angle is a key cut-quality factor — it bends light back toward the eye",
      "Star facets near the table produce much of a diamond's 'fire' (rainbow flashes)",
      "Bezel (kite) facets run from the table edge down to the girdle",
    ],
  },
  {
    key: "girdle",
    title: "Girdle",
    summary: "The narrow band around the widest point of the stone — where crown meets pavilion.",
    points: [
      "Often frosted or 'sugary' on a natural diamond from the polishing process",
      "A good place to check for a laser inscription (e.g. a lab-grown disclosure number)",
      "Girdle thickness affects durability — too thin chips easily, too thick adds unnecessary weight",
    ],
  },
  {
    key: "pavilion",
    title: "Pavilion",
    summary: "The lower body of the stone below the girdle, tapering down to the culet.",
    points: [
      "Pavilion angle is the single biggest factor in whether light returns as brilliance or 'leaks' out the bottom",
      "Too shallow or too deep a pavilion causes a visible dark area under the table ('fish-eye' or 'nail-head' effect)",
      "Most of a diamond's total weight sits in the pavilion",
    ],
  },
  {
    key: "culet",
    title: "Culet",
    summary: "The very bottom point of the stone, where the pavilion facets meet.",
    points: [
      "Ideally a sharp point in modern round brilliants — a visible flat culet can leak light and show as a small grey dot",
      "Older cutting styles sometimes used a small flat culet facet deliberately, for durability",
    ],
  },
  {
    key: "facets",
    title: "Facets",
    summary: "The flat, polished faces cut into the stone — their number and precision drive brilliance and fire.",
    points: [
      "A standard round brilliant cut has 57 or 58 facets (including the culet)",
      "Facet junctions on a real diamond meet in crisp, single lines — doubling under a loupe suggests a birefringent simulant like moissanite",
      "Facet symmetry and polish are two of the four 'Cut' grading sub-factors",
    ],
  },
];

// ---------------------------------------------------------------------------
// "Think you bought a fake?" — practical, honest consumer-protection steps.
// (Exported names kept from the original bite-first-aid feature so the rest
// of the app didn't need to change; the content is now entirely about
// suspected misrepresented gemstones, not spider bites.)
// ---------------------------------------------------------------------------

export interface FirstAidStep {
  step: string;
  detail: string;
}

export const firstAidSteps: FirstAidStep[] = [
  {
    step: "Document everything now",
    detail: "Photograph the stone, the setting, any hallmark stamps, the receipt, the listing or advertisement, and all messages with the seller — before you do anything else.",
  },
  {
    step: "Re-check the listing and paperwork",
    detail: "Look for words like 'diamond simulant', 'CZ', 'moissanite' or 'lab-created' in the fine print — sellers sometimes disclose accurately in text that's easy to miss.",
  },
  {
    step: "Get an independent appraisal",
    detail: "Take the piece to a jeweller or gemologist who did NOT sell it to you. An independent GIA/AGS-trained appraiser has no incentive to confirm the seller's claim either way.",
  },
  {
    step: "Contact the seller in writing",
    detail: "Explain the discrepancy and ask for a refund, replacement, or correction. Keep the conversation in writing (email or in-app messages, not just a phone call).",
  },
  {
    step: "Know your return window",
    detail: "Check the marketplace or store's return policy immediately — many have short windows (often 14-30 days) for exactly this kind of dispute.",
  },
  {
    step: "Escalate if the seller won't help",
    detail: "File a dispute through your payment provider (credit card chargeback, PayPal/marketplace buyer protection) and report the listing to the platform.",
  },
  {
    step: "Loop in consumer protection if needed",
    detail: "For larger purchases, your local consumer protection agency or a jewellers' trade association (e.g. Jewelers Vigilance Committee in the US) can advise on next steps or accept a complaint.",
  },
];

export const emergencySigns: string[] = [
  "The seller refuses to provide any certificate, receipt, or written description of the stone",
  "The price was dramatically below market rate for a 'diamond' of that size — often the clearest early warning",
  "The listing has since been edited or removed after you raised a concern",
  "You paid via an untraceable method (cash, wire transfer, gift cards) with no buyer protection",
];

export const neverDo: string[] = [
  "Don't accept a verbal promise in place of a written certificate or itemised receipt",
  "Don't assume a 'certificate' is legitimate without checking the issuing lab (GIA, AGS and IGI are the most trusted; some 'certificates' are printed by the seller themselves)",
  "Don't clean or alter the setting yourself before an appraisal — you may destroy evidence a professional needs",
  "Don't wire money or pay in a non-refundable way for a high-value stone you haven't verified",
];

// ---------------------------------------------------------------------------
// Quiz — 4Cs, glossary, simulants, plus questions generated from the
// gemstone library so it can never drift out of sync with it.
// ---------------------------------------------------------------------------

export interface QuizQuestion {
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

/** Deterministic shuffle driven by an index, so questions vary run to run. */
function pick<T>(items: T[], count: number, seed: number): T[] {
  const pool = [...items];
  const chosen: T[] = [];
  let cursor = seed;
  while (chosen.length < count && pool.length) {
    cursor = (cursor * 1103515245 + 12345) % 2147483648;
    chosen.push(pool.splice(cursor % pool.length, 1)[0]);
  }
  return chosen;
}

/** Curated 4Cs / glossary / simulant questions — the backbone of the quiz. */
const QUESTION_BANK: QuizQuestion[] = [
  {
    prompt: "Which of the 4Cs measures how well a diamond's proportions return light as brilliance and fire?",
    options: ["Cut", "Color", "Clarity", "Carat"],
    answerIndex: 0,
    explanation: "Cut grades how well a stone's proportions, symmetry and polish let light enter and bounce back to the eye — it affects sparkle more than any of the other three Cs.",
  },
  {
    prompt: "On the standard diamond color scale, which end represents the most colorless (most valuable) stones?",
    options: ["D", "M", "Z", "It doesn't use letters"],
    answerIndex: 0,
    explanation: "The GIA color scale runs D (colorless) to Z (light yellow/brown) — D is the top grade.",
  },
  {
    prompt: "What does 'clarity' grade in a diamond?",
    options: [
      "Internal inclusions and surface blemishes",
      "The stone's exact weight in carats",
      "How round the girdle is",
      "The metal purity of the setting",
    ],
    answerIndex: 0,
    explanation: "Clarity measures internal inclusions and external blemishes, graded on a scale from Flawless (FL) to Included (I1-I3).",
  },
  {
    prompt: "One carat equals how many grams?",
    options: ["0.2 grams", "1 gram", "2 grams", "5 grams"],
    answerIndex: 0,
    explanation: "A carat is a unit of mass equal to exactly 0.2 grams (200 milligrams) — it has nothing to do with gold 'karat' purity.",
  },
  {
    prompt: "What is 'brilliance' in gemology?",
    options: [
      "The white light reflected back to the eye from a stone",
      "The rainbow-coloured flashes a stone produces",
      "The stone's hardness rating",
      "A certificate issued by GIA",
    ],
    answerIndex: 0,
    explanation: "Brilliance is the total white light return; 'fire' (a separate term) refers to the rainbow-coloured flashes caused by dispersion.",
  },
  {
    prompt: "What is 'fire' in a cut diamond?",
    options: [
      "Rainbow-coloured flashes caused by light splitting into spectral colours",
      "A red tint sometimes seen in low-grade stones",
      "The heat given off during cutting",
      "Another word for the girdle",
    ],
    answerIndex: 0,
    explanation: "Fire (dispersion) is the flashes of spectral colour a stone produces — moissanite typically shows noticeably more fire than diamond.",
  },
  {
    prompt: "What does 'fluorescence' refer to in a diamond?",
    options: [
      "A visible glow (often blue) some diamonds emit under UV light",
      "The stone's resistance to scratching",
      "A grading term for carat weight",
      "The angle of the pavilion",
    ],
    answerIndex: 0,
    explanation: "Fluorescence describes visible light (commonly blue) some diamonds emit under UV. It's a helpful clue, not proof of authenticity — many genuine diamonds show no fluorescence at all.",
  },
  {
    prompt: "An 'inclusion' is best described as:",
    options: [
      "A naturally occurring internal feature, like a tiny mineral crystal or fracture",
      "A manufacturing defect only found in glass",
      "The setting's metal stamp",
      "A synonym for 'carat'",
    ],
    answerIndex: 0,
    explanation: "Inclusions are internal characteristics formed as the crystal grew — nearly all natural diamonds have some, which is one reason a suspiciously flawless stone can be a red flag.",
  },
  {
    prompt: "What is the 'girdle' of a cut stone?",
    options: [
      "The narrow band around the widest part, where the crown meets the pavilion",
      "The flat top facet",
      "The pointed bottom tip",
      "A term only used for emerald cuts",
    ],
    answerIndex: 0,
    explanation: "The girdle is the stone's 'equator' — often frosted on a natural diamond, and a common place to look for a laser inscription.",
  },
  {
    prompt: "What is the 'culet'?",
    options: [
      "The point (or small facet) at the very bottom of a cut stone",
      "The large flat top facet",
      "A grading term for color",
      "The clasp on a diamond necklace",
    ],
    answerIndex: 0,
    explanation: "The culet is the bottom-most point where the pavilion facets meet — ideally a sharp point on a modern round brilliant.",
  },
  {
    prompt: "What is a diamond 'simulant'?",
    options: [
      "Any material that visually imitates diamond without being chemically the same",
      "A diamond grown in a lab",
      "A diamond with poor cut grade",
      "A synonym for 'carat weight'",
    ],
    answerIndex: 0,
    explanation: "Simulants like moissanite, cubic zirconia, white sapphire and glass imitate diamond's look but are chemically different materials.",
  },
  {
    prompt: "What is the main optical tell that distinguishes moissanite from diamond under a 10x loupe?",
    options: [
      "Doubling of the facet junctions from birefringence",
      "A dull, cloudy appearance",
      "Visible gas bubbles",
      "It always looks pink",
    ],
    answerIndex: 0,
    explanation: "Moissanite is birefringent (splits light into two rays), which makes facet edges appear subtly doubled when viewed closely — diamond never does this.",
  },
  {
    prompt: "Which of these is a classic tell for cubic zirconia (CZ) versus diamond?",
    options: [
      "It feels distinctly heavier for its size and warms quickly to the touch",
      "It scratches diamond",
      "It shows facet doubling under a loupe",
      "It contains natural mineral inclusions",
    ],
    answerIndex: 0,
    explanation: "CZ is denser than diamond (heavier for the same size) and a poorer thermal conductor, so it warms up quickly rather than staying cool.",
  },
  {
    prompt: "What does 'scintillation' describe?",
    options: [
      "The flashes of light and dark (sparkle pattern) as a stone or the viewer moves",
      "A stone's exact carat weight",
      "The certificate number on a lab report",
      "A term for a chipped girdle",
    ],
    answerIndex: 0,
    explanation: "Scintillation is the sparkle pattern — flashes of light and dark as the stone, light source, or viewer moves.",
  },
  {
    prompt: "What is a 'blemish' as opposed to an 'inclusion'?",
    options: [
      "A surface-level flaw (like a scratch or nick), rather than an internal feature",
      "Another word for a large inclusion",
      "A synonym for fluorescence",
      "A grading term used only for carat weight",
    ],
    answerIndex: 0,
    explanation: "Blemishes are external (surface) characteristics — scratches, nicks, polish lines — as opposed to inclusions, which are internal.",
  },
  {
    prompt: "Which stamp near a stone's setting is a genuine sign of a precious metal mount?",
    options: ["14K, 10K, 18K, or 925", "AAA", "CZ-1", "GIA-100"],
    answerIndex: 0,
    explanation: "Karat stamps (10K/14K/18K for gold) or 925 (sterling silver) indicate genuine precious-metal construction — a strong practical clue, though not proof the stone itself is a diamond.",
  },
  {
    prompt: "Which independent grading lab is generally considered the most rigorous and widely trusted for diamonds?",
    options: ["GIA", "The jewellery store that sold it", "A price-comparison website", "None — labs can't grade diamonds"],
    answerIndex: 0,
    explanation: "The Gemological Institute of America (GIA) is the most widely trusted independent grading lab, alongside AGS and IGI.",
  },
  {
    prompt: "Why can't a smartphone camera photo certify that a stone is a genuine diamond?",
    options: [
      "Authentication requires physical tests (thermal, density, magnification) that a 2D photo can't capture",
      "Phones cannot take pictures of transparent objects at all",
      "It actually can, with enough resolution",
      "Diamonds are invisible to camera sensors",
    ],
    answerIndex: 0,
    explanation: "Reliable diamond testing relies on physical properties — thermal conductivity, density, magnified inclusion patterns, spectroscopy — none of which a photo alone can measure.",
  },
  {
    prompt: "What is the 'table' of a cut diamond?",
    options: [
      "The large flat facet on top of the stone",
      "The pointed tip at the bottom",
      "The metal band of the ring",
      "A synonym for the certificate",
    ],
    answerIndex: 0,
    explanation: "The table is the largest flat facet on top — the main 'window' you look through into the stone.",
  },
  {
    prompt: "A lab-grown diamond differs from a natural diamond mainly in:",
    options: [
      "Origin (grown in a lab vs. formed underground) — not chemical composition",
      "Chemical composition only",
      "Hardness — lab-grown is much softer",
      "It isn't actually diamond at all",
    ],
    answerIndex: 0,
    explanation: "Lab-grown diamonds are chemically and physically real diamond (carbon, same hardness) — the difference is origin, and reputable sellers disclose it.",
  },
];

/** Builds "which gemstone is this?" questions from real identification clues in the library. */
function buildLibraryQuestions(seed: number): QuizQuestion[] {
  if (speciesLibrary.length < 4) return [];

  return speciesLibrary.map((subject, index) => {
    const distractors = pick(
      speciesLibrary.filter((other) => other.slug !== subject.slug),
      3,
      seed + index * 17,
    );

    const options = pick([subject, ...distractors], 4, seed + index * 31).map((s) => s.commonName);

    return {
      prompt: subject.identification[0] ?? subject.summary,
      options,
      answerIndex: options.indexOf(subject.commonName),
      explanation: `${subject.commonName} (${subject.scientificName}) — ${subject.summary}`,
    };
  });
}

/** Combines the curated 4Cs/glossary bank with library-generated questions, then samples `count`. */
export function buildQuiz(count = 8, seed = 1): QuizQuestion[] {
  const pool = [...QUESTION_BANK, ...buildLibraryQuestions(seed)];
  return pick(pool, Math.min(count, pool.length), seed);
}

// Pricing lives in its own file — see src/content/pricing.ts (a 1:1 port of
// the website's pricing). Import from there, not here.

// ---------------------------------------------------------------------------
// Achievements — computed client-side from local stats
// ---------------------------------------------------------------------------

export interface Achievement {
  key: string;
  title: string;
  description: string;
  icon: string;
  /** Progress toward the goal, given the user's local stats. */
  progress: (stats: AchievementStats) => { value: number; goal: number };
}

export interface AchievementStats {
  scans: number;
  savedSpecies: number;
  sightings: number;
  streak: number;
  quizBest: number;
  dangerousFound: number;
}

export const achievements: Achievement[] = [
  {
    key: "first-scan",
    title: "First scan",
    description: "Test your first diamond or gemstone photo.",
    icon: "camera",
    progress: (s) => ({ value: Math.min(s.scans, 1), goal: 1 }),
  },
  {
    key: "ten-scans",
    title: "Seasoned tester",
    description: "Complete 10 scans.",
    icon: "zap",
    progress: (s) => ({ value: Math.min(s.scans, 10), goal: 10 }),
  },
  {
    key: "fifty-scans",
    title: "Gem detective",
    description: "Complete 50 scans.",
    icon: "award",
    progress: (s) => ({ value: Math.min(s.scans, 50), goal: 50 }),
  },
  {
    key: "save-library",
    title: "Building a library",
    description: "Save 3 diamond reference entries.",
    icon: "bookmark",
    progress: (s) => ({ value: Math.min(s.savedSpecies, 3), goal: 3 }),
  },
  {
    key: "first-sighting",
    title: "First find logged",
    description: "Log a find in your field journal.",
    icon: "map-pin",
    progress: (s) => ({ value: Math.min(s.sightings, 1), goal: 1 }),
  },
  {
    key: "streak-3",
    title: "Three-day streak",
    description: "Use the app on 3 consecutive days.",
    icon: "trending-up",
    progress: (s) => ({ value: Math.min(s.streak, 3), goal: 3 }),
  },
  {
    key: "streak-7",
    title: "Week-long streak",
    description: "Use the app on 7 consecutive days.",
    icon: "trending-up",
    progress: (s) => ({ value: Math.min(s.streak, 7), goal: 7 }),
  },
  {
    key: "quiz-perfect",
    title: "4Cs expert",
    description: "Score a perfect 8/8 on the diamond quiz.",
    icon: "help-circle",
    progress: (s) => ({ value: Math.min(s.quizBest, 8), goal: 8 }),
  },
  {
    key: "spotted-simulant",
    title: "Sharp eye",
    description: "Flag 3 scans as a likely simulant or synthetic.",
    icon: "eye",
    progress: (s) => ({ value: Math.min(s.dangerousFound, 3), goal: 3 }),
  },
];

// ---------------------------------------------------------------------------
// "How it works" — Scan screen explainer
// ---------------------------------------------------------------------------

export const howItWorks: { icon: string; title: string; desc: string }[] = [
  {
    icon: "camera",
    title: "Take a clear, well-lit photo",
    desc: "Natural or white light works best — avoid strong colour casts from lamps.",
  },
  {
    icon: "cpu",
    title: "AI reviews the visual evidence",
    desc: "Facet pattern, brilliance and fire, inclusions, colour and the girdle are all considered.",
  },
  {
    icon: "file-text",
    title: "You get an honest estimate",
    desc: "A stone type guess, confidence score, and — critically — a clear disclaimer this isn't a certified appraisal.",
  },
  {
    icon: "check-circle",
    title: "Follow the recommended next steps",
    desc: "Try a manual test, check the setting for a metal stamp, or get a professional opinion for anything valuable.",
  },
];
