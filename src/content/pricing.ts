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

export const pricingHeadline = "Try risk-free for 7 days. Then save 50% on month one.";

export const pricingSub =
  "Monthly plans with fresh credits every month. Cancel from your dashboard in one click. 14-day money-back guarantee, no questions asked.";

export const pricingPromo = ["7 days free", "50% off your first month", "14-day money-back", "Cancel anytime"];

export const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    audience: "Curious gem-spotters getting started",
    firstMonth: 2.49,
    regular: 4.99,
    credits: 120,
    ids: "~12 identifications / mo",
    perId: "$0.42 per ID",
    features: [
      "Full AI species identification",
      "Authenticity confidence on every result",
      "Look-alike & similar-species alerts",
      "120 credits every month",
      "7-day free trial",
      "Cancel anytime",
    ],
  },
  {
    name: "Explorer",
    audience: "Weekend explorers & gardeners",
    firstMonth: 4.99,
    regular: 9.99,
    credits: 550,
    ids: "~55 identifications / mo",
    perId: "$0.18 per ID",
    highlighted: true,
    features: [
      "Everything in Starter",
      "550 credits every month",
      "PDF identification reports",
      "Full field-journal access",
      "Priority AI — faster results",
    ],
  },
  {
    name: "Pro",
    audience: "Serious collectors & gemologists",
    firstMonth: 9.99,
    regular: 19.99,
    credits: 1200,
    ids: "~120 identifications / mo",
    perId: "$0.17 per ID — best value",
    features: [
      "Everything in Explorer",
      "1,200 credits every month",
      "CSV data export",
      "Priority customer support",
      "Best value per identification",
    ],
  },
];

export const freeTier = {
  name: "Just trying it out?",
  blurb: "Get 30 free credits — about 3 identifications — with no credit card. Free forever.",
};

export const pricingHowItWorks = [
  {
    step: "01",
    title: "Start your 7-day free trial",
    desc: "Full plan access with no charges during the trial. Cancel before it ends and you pay nothing.",
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
    q: "How does the 7-day free trial work?",
    a: "You get full access to your chosen plan for 7 days at no charge. Cancel any time before the trial ends and you won't be billed a cent.",
  },
  {
    q: "How is the 50% first-month discount applied?",
    a: "It's applied automatically at checkout after your trial — there's no code to enter. Your first paid month is half price, then the regular monthly rate applies.",
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
