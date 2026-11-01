/**
 * Pricing — a 100% content-for-content port of the website's
 * src/content/pricing.ts (diamondstester.com). Keep these in lockstep.
 * The only app-side difference is the checkout mechanism (RevenueCat vs Paddle),
 * never the copy or the numbers.
 */

export interface PricingTier {
  name: string;
  audience: string;
  firstMonth: number; // discounted first month
  regular: number; // ongoing per month
  credits: number;
  ids: string; // approx identifications
  perId: string;
  highlighted?: boolean;
  features: string[];
}

export const pricingHeadline = "Save 50% on your first month. Cancel anytime.";

export const pricingSub =
  "Monthly plans with fresh credits every month. Cancel from your dashboard in one click. 14-day money-back guarantee, no questions asked.";

export const pricingPromo = ["50% off your first month", "14-day money-back", "Cancel anytime"];

export const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    audience: "Curious gem-spotters getting started",
    firstMonth: 2.49,
    regular: 4.99,
    credits: 120,
    ids: "~12 scans / mo",
    perId: "$0.42 per scan",
    features: [
      "Full AI diamond & gemstone testing",
      "Authenticity confidence on every result",
      "Simulant alerts (moissanite, CZ & more)",
      "120 credits every month",
      "Cancel anytime",
    ],
  },
  {
    name: "Explorer",
    audience: "Weekend explorers & gardeners",
    firstMonth: 4.99,
    regular: 9.99,
    credits: 550,
    ids: "~55 scans / mo",
    perId: "$0.18 per scan",
    highlighted: true,
    features: [
      "Everything in Starter",
      "550 credits every month",
      "PDF result reports",
      "Full collection & scan history",
      "Priority AI — faster results",
    ],
  },
  {
    name: "Pro",
    audience: "Serious collectors & gemologists",
    firstMonth: 9.99,
    regular: 19.99,
    credits: 1200,
    ids: "~120 scans / mo",
    perId: "$0.17 per scan — best value",
    features: [
      "Everything in Explorer",
      "1,200 credits every month",
      "CSV data export",
      "Priority customer support",
      "Best value per scan",
    ],
  },
];

export const freeTier = {
  name: "Just trying it out?",
  blurb: "Get 30 free credits — about 3 scans — with no credit card. Free forever.",
};

/**
 * App-only add-on — NOT part of the website's credit-tier list, so it lives
 * outside `pricingTiers` and doesn't break the content-for-content port above.
 * A cheap subscription that removes every banner and full-screen ad. It grants
 * NO scan credits: the user keeps their free daily scans and can still use the
 * opt-in "watch ad → earn credits" reward. Tied to its own RevenueCat
 * entitlement (`adfree`), independent of the credit plans.
 */
export const adFreeTier = {
  name: "Ad-Free",
  audience: "Just want the ads gone",
  firstMonth: 1.49,
  regular: 2.99,
  tagline: "Remove all ads",
  features: [
    "No banner ads, anywhere",
    "No full-screen (interstitial) ads",
    "Keep your free daily scans",
    "Still watch-to-earn credits when you want",
    "Cancel anytime",
  ],
};

export const pricingHowItWorks = [
  {
    step: "01",
    title: "Pick your plan",
    desc: "Subscribe in a couple of taps and get full access right away — Starter, Explorer or Pro.",
  },
  {
    step: "02",
    title: "50% off your first paid month",
    desc: "The discount is applied automatically at checkout — no promo code to remember.",
  },
  {
    step: "03",
    title: "Credits refresh every month",
    desc: "Your plan tops up with fresh credits each month, on a use-it-or-lose-it basis.",
  },
  {
    step: "04",
    title: "Cancel anytime, one click",
    desc: "Manage or cancel your plan from your dashboard whenever you like — no lock-in.",
  },
];

export const pricingFaqs = [
  {
    q: "When am I charged?",
    a: "You're charged as soon as you subscribe. Your first month is 50% off, then the regular monthly rate applies — and you can cancel anytime before it renews.",
  },
  {
    q: "How is the 50% first-month discount applied?",
    a: "It's applied automatically at checkout — there's no code to enter. Your first paid month is half price, then the regular monthly rate applies.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Plans are month-to-month and you can cancel in one click from your dashboard. There's no contract and no lock-in.",
  },
  {
    q: "What's your refund policy?",
    a: "Every paid plan is covered by a 14-day money-back guarantee, no questions asked. If you're not happy, we'll refund you.",
  },
  {
    q: "Do unused credits roll over?",
    a: "Credits refresh each month and don't roll over, so pick the plan that matches how often you identify. You can upgrade or downgrade anytime.",
  },
  {
    q: "What if an identification fails?",
    a: "If the AI can't return a confident match, that identification is automatically refunded to your credit balance — you only spend credits on real results.",
  },
];

export const pricingTrust = {
  methods: ["Visa", "Mastercard", "PayPal", "AMEX", "Apple Pay", "Google Pay"],
  note: "256-bit SSL encryption · No hidden charges · 14-day money-back guarantee",
};
