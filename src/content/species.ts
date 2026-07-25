import type { AuthenticityLevel } from "@/theme/colors";

/**
 * NOTE: this file is still named `species.ts` (and the exported members keep
 * their original names) to avoid churning every import across the app, but it
 * is now the offline gemstone reference library — one entry per stone type a
 * user might be testing (diamond, its lab-grown and simulant look-alikes, and
 * a few common natural gems people mistake for diamond).
 */
export interface Species {
  slug: string;
  /** Display name, e.g. "Diamond", "Moissanite". */
  commonName: string;
  /** Mineral/chemical name, e.g. "Carbon (C)", "Silicon carbide (SiC)". */
  scientificName: string;
  /** Broad grouping shown as the "family" line. */
  family: string;
  /** Reused across the app's badge/colour system: genuine/uncertain/simulant/synthetic. */
  venomLevel: AuthenticityLevel;
  /** Typical hardness on the Mohs scale, shown alongside size in the "at a glance" card. */
  size: string;
  region: string;
  habitat: string;
  summary: string;
  identification: string[];
  fact: string;
  /** natural | lab-grown | simulant — how this stone relates to a mined diamond. */
  category: "natural" | "lab-grown" | "simulant";
  /** True for stones frequently passed off as diamond in the secondhand/online market. */
  oftenMisrepresented?: boolean;
}

/**
 * Curated offline library covering diamond and the stones it's most often
 * confused with. Fully usable with no network and no Supabase.
 */
export const speciesLibrary: Species[] = [
  {
    slug: "diamond",
    commonName: "Diamond",
    scientificName: "Carbon (C)",
    family: "Natural gemstone",
    venomLevel: "genuine",
    size: "Mohs hardness 10 (hardest natural material)",
    region: "Mined worldwide — Botswana, Russia, Canada, Australia",
    habitat: "Formed 100+ miles underground under extreme heat and pressure, brought up by volcanic eruptions",
    summary:
      "The reference point every other stone on this list is compared against. Prized for extreme hardness, high refractive index and a distinctive combination of brilliance (white light return) and fire (rainbow flashes).",
    identification: [
      "Sharp, crisp facet junctions — never doubled or blurry under a loupe",
      "Excellent thermal conductivity — feels cold and stays cold briefly on the tongue or skin",
      "Natural inclusions are common and look random, not perfectly clean",
      "Cuts glass and scratches nearly everything else; nothing scratches it",
      "Often shows little to no fluorescence, though a blue glow under UV is common and normal",
    ],
    fact: "It takes roughly 1-3 billion years for natural diamond to form — most of what's mined today is older than complex life on land.",
    category: "natural",
  },
  {
    slug: "moissanite",
    commonName: "Moissanite",
    scientificName: "Silicon carbide (SiC)",
    family: "Diamond simulant",
    venomLevel: "simulant",
    size: "Mohs hardness 9.25",
    region: "Lab-grown worldwide; trace natural supply from meteorite sites",
    habitat: "Almost exclusively lab-created for jewellery use today",
    summary:
      "The most convincing diamond look-alike in normal use. Extremely hard and durable, but its optical properties give it away under close inspection — most notably far more rainbow-coloured fire than a diamond ever shows.",
    identification: [
      "Facet junctions show a faint 'doubling' effect from birefringence — diamond never does this",
      "Noticeably more rainbow fire than a diamond of the same size and cut",
      "Passes a simple diamond thermal tester (a known false positive), so a jeweller uses a dedicated moissanite tester instead",
      "Usually near-flawless with no natural inclusions",
    ],
    fact: "Moissanite was discovered by Henri Moissan in 1893 in fragments of a meteor crater — he initially misidentified it as diamond.",
    category: "simulant",
    oftenMisrepresented: true,
  },
  {
    slug: "cubic-zirconia",
    commonName: "Cubic Zirconia",
    scientificName: "Zirconium dioxide (ZrO2)",
    family: "Diamond simulant",
    venomLevel: "simulant",
    size: "Mohs hardness 8-8.5",
    region: "Lab-grown worldwide",
    habitat: "Entirely synthetic — never occurs naturally in gem quality",
    summary:
      "The classic budget diamond substitute. Cheap to produce, visually bright, but noticeably softer than diamond and heavier for its size, which is one of the easiest home tells.",
    identification: [
      "Feels distinctly heavier than a diamond of the same visual size",
      "Warms up quickly and doesn't stay cold — fails the simple 'cold to the touch' check",
      "Shows almost no natural inclusions — suspiciously flawless to the naked eye",
      "Softer than diamond, so it picks up surface scratches and loses sparkle over time",
    ],
    fact: "Cubic zirconia became commercially viable in the 1970s and remains the single most common diamond simulant sold today.",
    category: "simulant",
    oftenMisrepresented: true,
  },
  {
    slug: "lab-grown-diamond",
    commonName: "Lab-Grown Diamond",
    scientificName: "Carbon (C)",
    family: "Lab-grown gemstone",
    venomLevel: "synthetic",
    size: "Mohs hardness 10 (identical to natural diamond)",
    region: "Grown in labs worldwide (US, India, China and others)",
    habitat: "Produced via HPHT (high pressure, high temperature) or CVD (chemical vapour deposition)",
    summary:
      "Chemically and optically identical to a natural diamond — same hardness, same brilliance. The only reliable way to separate the two is specialised lab equipment that detects trace growth patterns invisible to the eye.",
    identification: [
      "Visually and physically indistinguishable from natural diamond without a lab",
      "May carry a laser-inscribed girdle number identifying it as lab-grown",
      "Reputable sellers disclose this on the certificate — always ask to see one",
      "Typically sold at a meaningfully lower price than an equivalent natural diamond",
    ],
    fact: "Lab-grown diamonds are graded on the same 4Cs scale as natural ones — the difference is origin, not composition.",
    category: "lab-grown",
  },
  {
    slug: "white-sapphire",
    commonName: "White Sapphire",
    scientificName: "Corundum (Al2O3)",
    family: "Natural gemstone",
    venomLevel: "simulant",
    size: "Mohs hardness 9",
    region: "Sri Lanka, Madagascar, Australia, Montana (USA)",
    habitat: "Formed in metamorphic and igneous rock, mined much like other corundum gems",
    summary:
      "A genuine natural gemstone in its own right, but colourless varieties are sometimes sold or mistaken for diamond. Noticeably less brilliant and fiery — it looks comparatively 'flat' and milky next to a diamond in the same light.",
    identification: [
      "Lower fire and brilliance than diamond — looks softer and less sparkly",
      "Often shows a faint silky or slightly cloudy appearance",
      "Very durable (second only to diamond) but still clearly less brilliant under a loupe",
      "Priced far below diamond, which is a useful red flag if listed 'as diamond'",
    ],
    fact: "Sapphire and ruby are the same mineral, corundum — trace chromium makes ruby red, while iron and titanium make classic blue sapphire.",
    category: "natural",
  },
  {
    slug: "quartz",
    commonName: "Rock Crystal Quartz",
    scientificName: "Silicon dioxide (SiO2)",
    family: "Natural gemstone",
    venomLevel: "simulant",
    size: "Mohs hardness 7",
    region: "Mined worldwide — Brazil, Madagascar, USA, Alps",
    habitat: "Common in igneous and metamorphic rock; one of the most abundant minerals on Earth",
    summary:
      "Cheap, abundant and much softer than diamond. Old costume jewellery and some low-end 'diamond look' pieces use clear quartz, which scratches easily and shows visibly less sparkle.",
    identification: [
      "Noticeably softer — scratches easily with a steel point or another quartz edge",
      "Dull, glassy sparkle rather than sharp brilliance and fire",
      "Often cut with less precision than diamond simulants meant to fool buyers",
      "Very affordable — a strong hint if priced or marketed as a diamond",
    ],
    fact: "Quartz is piezoelectric — squeezing it generates a tiny electric charge, which is why it's used in watches and electronics, not just jewellery.",
    category: "natural",
  },
  {
    slug: "glass",
    commonName: "Glass (Paste)",
    scientificName: "Amorphous silica-based glass",
    family: "Diamond simulant",
    venomLevel: "simulant",
    size: "Mohs hardness 5-6",
    region: "Manufactured worldwide",
    habitat: "Entirely man-made — no natural formation",
    summary:
      "The cheapest and easiest simulant to spot once you know what to look for. Soft, often contains visible bubbles from manufacturing, and scratches with everyday use.",
    identification: [
      "Frequently contains small round gas bubbles — a dead giveaway under a loupe",
      "Scratches very easily; edges and facets round off over time",
      "Warms quickly to the touch and doesn't hold cold",
      "Often has a slightly wavy or uneven facet finish from moulding rather than precision cutting",
    ],
    fact: "Glass 'paste' gems were widely used in costume jewellery from the 18th century onward, well before cubic zirconia or moissanite existed.",
    category: "simulant",
    oftenMisrepresented: true,
  },
];

export const getSpecies = (slug: string): Species | undefined =>
  speciesLibrary.find((species) => species.slug === slug);

/** Stones frequently passed off as diamond — surfaced with a buyer-beware note. */
export const misrepresentedSpecies = (): Species[] => speciesLibrary.filter((s) => s.oftenMisrepresented);

export function searchSpecies(query: string): Species[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return speciesLibrary;

  return speciesLibrary.filter((species) =>
    [species.commonName, species.scientificName, species.family, species.region]
      .join(" ")
      .toLowerCase()
      .includes(needle),
  );
}

/** Best-effort match from a scan's `stoneType` guess to a library entry, for cross-linking. */
export function findSpeciesByStoneType(stoneType: string): Species | undefined {
  const needle = stoneType.trim().toLowerCase();
  if (!needle || needle === "inconclusive") return undefined;
  return speciesLibrary.find(
    (species) => species.commonName.toLowerCase() === needle || needle.includes(species.slug.replace(/-/g, " ")),
  );
}

export const VENOM_ORDER: AuthenticityLevel[] = ["genuine", "uncertain", "simulant", "synthetic"];
