export interface GuideSection {
  heading: string;
  body: string;
  bullets?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  excerpt: string;
  category: "Manual Tests" | "Buying Tips" | "4Cs & Terms" | "Scams" | "Certification";
  readMinutes: number;
  sections: GuideSection[];
}

/**
 * Real, accurate step-by-step guides to the classic home diamond tests, plus
 * buying and certification reference. Each is written as a short sequence of
 * sections with checklist-style bullets so it reads as steps, not a wall of
 * text — and every guide is honest about what a home test can and cannot
 * prove.
 */
export const guides: Guide[] = [
  {
    slug: "fog-breath-test",
    title: "The fog (breath) test",
    excerpt: "Breathe on the stone like you're fogging a mirror and time how fast it clears. Quick, free, and a genuinely useful first check.",
    category: "Manual Tests",
    readMinutes: 2,
    sections: [
      {
        heading: "What you need",
        body: "Nothing but the stone itself, cleaned, and your own breath.",
        bullets: ["A clean, dry stone (wipe off oils/fingerprints first)", "Normal room temperature — not fresh out of the freezer or a hot car"],
      },
      {
        heading: "Step by step",
        body: "Hold the stone a couple of centimetres from your mouth and breathe on it the same way you'd fog a mirror.",
        bullets: [
          "Fog the stone with a single breath",
          "Start a mental (or phone) timer the instant you stop breathing",
          "Watch how long the fog takes to clear from the surface",
        ],
      },
      {
        heading: "What it means",
        body: "Diamond conducts heat away extremely fast, so fog clears almost instantly — usually well under a second or two. Most simulants (cubic zirconia, glass) hold heat longer, so the fog lingers noticeably longer.",
        bullets: [
          "Clears almost instantly → consistent with diamond",
          "Fog lingers for a couple of seconds or more → more consistent with a simulant",
        ],
      },
      {
        heading: "Limitations",
        body: "This is a supplementary clue, not proof. Moissanite also conducts heat well and can pass this test similarly to diamond, so it won't tell the two apart. Treat this as one data point among several, not a verdict.",
      },
    ],
  },
  {
    slug: "water-density-test",
    title: "The water (density) test",
    excerpt: "Diamond is dense enough to sink fast and sit low in a glass of water — a rough but genuinely informative check for a loose stone.",
    category: "Manual Tests",
    readMinutes: 2,
    sections: [
      {
        heading: "What you need",
        bullets: ["A clear glass of room-temperature water", "A loose (unmounted) stone — this test doesn't work well for a mounted ring"],
        body: "Only works on a loose stone since a metal setting changes how it floats and sinks.",
      },
      {
        heading: "Step by step",
        body: "Drop the stone gently into the glass and watch what happens.",
        bullets: [
          "Drop the stone into the water from just above the surface",
          "Watch whether it sinks quickly or floats/drifts down slowly",
        ],
      },
      {
        heading: "What it means",
        body: "Diamond has a specific gravity around 3.5-3.53, dense enough to sink quickly and directly. Glass (around 2.4-2.7) and some simulants sink more slowly or drift; cubic zirconia is actually denser than diamond (around 5.6-6.0) and sinks fast too, so this test mainly rules out lighter materials like glass or quartz.",
        bullets: [
          "Sinks quickly and directly → consistent with diamond or CZ (doesn't distinguish between them)",
          "Floats or sinks very slowly → more consistent with glass or a lighter material",
        ],
      },
      {
        heading: "Limitations",
        body: "This test cannot tell diamond apart from cubic zirconia or moissanite, since all three are reasonably dense. It mostly helps rule out lighter glass imitations.",
      },
    ],
  },
  {
    slug: "loupe-inspection",
    title: "Loupe (10x magnification) inspection",
    excerpt: "The single most informative home test — if you have a jeweller's loupe. Learn what real inclusions look like versus tell-tale bubbles and doubling.",
    category: "Manual Tests",
    readMinutes: 3,
    sections: [
      {
        heading: "What you need",
        bullets: ["A 10x jeweller's loupe (inexpensive and worth owning if you do this often)", "Good, even lighting"],
        body: "A loupe is the best value-for-money tool for this hobby — far more useful than any phone camera trick.",
      },
      {
        heading: "Step by step",
        body: "Hold the stone close to your eye with the loupe, angle it under a bright light, and rotate it slowly.",
        bullets: [
          "Examine the facet junctions where edges meet",
          "Look inside the stone for any internal features",
          "Check the girdle for texture and any inscriptions",
        ],
      },
      {
        heading: "What it means",
        body: "Real diamonds almost always have some natural inclusions — tiny crystals, feathers or clouds — that look random and irregular. A stone that looks perfectly, suspiciously flawless is itself a mild red flag. Facet junctions on a genuine diamond are crisp single lines.",
        bullets: [
          "Random, irregular internal features → consistent with a natural diamond",
          "Small round bubbles → strong sign of glass",
          "A faint 'doubled' look at facet edges → classic moissanite tell (it splits light into two rays)",
          "Perfectly clean with zero inclusions → more consistent with a lab-grown or simulant stone",
        ],
      },
      {
        heading: "Limitations",
        body: "It takes practice to read what you're seeing reliably. When it matters, a professional's trained eye and better equipment (microscope, gemological loupe with more experience) beats a first attempt at home.",
      },
    ],
  },
  {
    slug: "heat-thermal-test",
    title: "Heat & thermal conductivity — what's really possible",
    excerpt: "Professional thermal testers are one of the most reliable diamond tests that exist — but your phone cannot replicate one. Here's the honest picture.",
    category: "Manual Tests",
    readMinutes: 2,
    sections: [
      {
        heading: "How professional testers work",
        body: "A jeweller's electronic thermal (or thermal + electrical conductivity) tester touches a heated probe to the stone and measures how fast heat dissipates. Diamond conducts heat exceptionally well — far better than almost every simulant — so it registers distinctly.",
        bullets: [
          "Diamond conducts heat away fastest of nearly all gem materials",
          "Cheap electronic testers are widely used by jewellers and are genuinely reliable for diamond vs. most simulants",
        ],
      },
      {
        heading: "The moissanite exception",
        body: "Moissanite conducts heat almost as well as diamond, so basic thermal-only testers can give a false positive. This is exactly why combined thermal + electrical conductivity testers exist — moissanite conducts electricity noticeably differently than diamond.",
      },
      {
        heading: "What your phone cannot do",
        body: "Be honest with yourself here: a smartphone has no way to measure thermal conductivity. Any app or video claiming to test 'real diamond' via your phone's camera or screen alone is not measuring a physical property — treat such claims with real skepticism.",
        bullets: [
          "No phone sensor measures heat dissipation through a gemstone",
          "This app does not, and cannot, replicate a real thermal tester",
        ],
      },
      {
        heading: "What to do instead",
        body: "For anything valuable, a jeweller's dual thermal/electrical tester (or a full gemological workup) is inexpensive and far more reliable than any DIY approximation.",
      },
    ],
  },
  {
    slug: "sparkle-fire-brilliance",
    title: "Reading sparkle: fire vs. brilliance",
    excerpt: "Learn to tell diamond's balanced sparkle from moissanite's rainbow overload — a genuinely useful visual skill once you know what to look for.",
    category: "Manual Tests",
    readMinutes: 2,
    sections: [
      {
        heading: "The two kinds of sparkle",
        body: "Brilliance is the white light bouncing straight back at you. Fire is the rainbow-coloured flashes caused by light splitting into spectral colours as it passes through the stone. Diamond balances the two; some simulants lean heavily toward one.",
        bullets: [
          "Brilliance = white light return",
          "Fire = rainbow-coloured flashes (dispersion)",
          "Scintillation = the on/off sparkle pattern as the stone or viewer moves",
        ],
      },
      {
        heading: "Step by step",
        body: "Move the stone slowly under a single bright point-source light (a flashlight works well) and watch the flashes, not just the overall brightness.",
        bullets: [
          "Tilt the stone side to side under a single light source",
          "Note whether flashes are mostly white or heavily rainbow-coloured",
          "Compare the balance of colour vs. white light, not just how 'sparkly' it looks overall",
        ],
      },
      {
        heading: "What it means",
        body: "Moissanite has a much higher dispersion than diamond, producing noticeably more rainbow fire — sometimes described as looking 'disco-ball' bright compared to diamond's more balanced sparkle. Cubic zirconia tends to look duller and less lively overall, with weaker scintillation.",
      },
      {
        heading: "Limitations",
        body: "Lighting, cut quality and stone size all affect this a lot — a poorly cut diamond can look duller than a well-cut simulant. This is a helpful clue, never a standalone verdict.",
      },
    ],
  },
  {
    slug: "setting-mount-inspection",
    title: "Check the setting, not just the stone",
    excerpt: "One of the most overlooked and most useful checks: a genuine metal stamp near the stone tells you a lot in five seconds.",
    category: "Buying Tips",
    readMinutes: 2,
    sections: [
      {
        heading: "Why this matters",
        body: "A stone worth testing is usually mounted in metal — and real precious-metal settings are legally required (in most markets) to carry a purity stamp. This is one of the fastest, most practical checks you can do, and it's underused compared to staring at the stone itself.",
      },
      {
        heading: "What to look for",
        body: "Use your loupe or a magnifying glass and look on the inside of the band, near the prongs, or under the setting.",
        bullets: [
          "Gold: stamps like 10K, 14K, 18K, or 417/585/750 (metric purity marks)",
          "Silver: 925 (sterling) — note that genuine diamonds are rarely set in silver commercially, which is itself a clue",
          "Platinum: PT950, PT900, or 'Plat'",
          "No stamp at all, or an inconsistent/blurry stamp, is a caution sign — though older or handmade pieces sometimes legitimately lack one",
        ],
      },
      {
        heading: "What it means",
        body: "A genuine karat/purity stamp tells you the metal is real precious metal — it does not by itself prove the stone is a genuine diamond, but a costume-jewellery mount (plain base metal, no stamp, glued rather than pronged stone) is a strong hint the whole piece is not what it's presented as.",
      },
      {
        heading: "Next step",
        body: "Combine this with the other manual tests above, and if the stamp and the seller's claims don't add up, treat that as a serious red flag worth an independent appraisal.",
      },
    ],
  },
  {
    slug: "reading-a-lab-certificate",
    title: "How to read a GIA / lab certificate",
    excerpt: "A short, practical explainer of what's actually on a diamond grading report — and how to verify it's real.",
    category: "Certification",
    readMinutes: 3,
    sections: [
      {
        heading: "What a certificate actually is",
        body: "A grading report from an independent lab (GIA, AGS, and IGI are the most widely trusted) documents a stone's 4Cs and other characteristics as assessed by trained graders using proper equipment — not a guarantee of value, but a documented, independently verified description.",
      },
      {
        heading: "What's on it",
        body: "A standard grading report includes:",
        bullets: [
          "Report number — unique, verifiable on the lab's own website",
          "Shape and measurements",
          "Carat weight, color grade, clarity grade, and cut grade",
          "Polish and symmetry grades",
          "Fluorescence (none/faint/medium/strong, and colour if present)",
          "A plotted diagram showing the location of key inclusions — useful for confirming the certificate matches the actual stone",
          "For lab-grown diamonds: an explicit disclosure that the stone is laboratory-grown",
        ],
      },
      {
        heading: "How to verify it's genuine",
        body: "Reputable labs let you look up a report number directly on their own website — do this yourself rather than trusting a photo of the certificate alone.",
        bullets: [
          "Go to the lab's official website (e.g. gia.edu) and enter the report number yourself",
          "Compare the plotted inclusion diagram to the actual stone under a loupe",
          "Be wary of certificates from unfamiliar or in-house 'labs' with no independent verification",
        ],
      },
      {
        heading: "What it doesn't do",
        body: "A certificate describes the stone at the time of grading — it doesn't protect you from a switch happening after grading, which is why matching the plotted inclusions to the physical stone matters for high-value purchases.",
      },
    ],
  },
];

export const getGuide = (slug: string): Guide | undefined => guides.find((guide) => guide.slug === slug);

export function searchGuides(query: string): Guide[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return guides;
  return guides.filter((guide) =>
    `${guide.title} ${guide.excerpt} ${guide.category}`.toLowerCase().includes(needle),
  );
}
