export const PATCH_FREE_TRANSLATION_LIMIT = 20;
export const PATCH_PLAN_LIMITS = { go: 50, max: 200 } as const;
export type PaidPatchPlan = keyof typeof PATCH_PLAN_LIMITS;
export const PATCH_PLAN_PRICES = {
  go: { BRL: { cents: 3999, currency: 'BRL' } },
  max: { BRL: { cents: 15000, currency: 'BRL' } },
} as const;

export type BillingOfferCode =
  | 'go_card_month'
  | 'max_card_month'
  | 'go_pix_quarter'
  | 'max_pix_quarter'
  | 'go_pix_year'
  | 'max_pix_year'
  | 'max_pix_year_founder';

export type BillingOffer = {
  readonly code: BillingOfferCode;
  readonly plan: PaidPatchPlan;
  readonly paymentMethod: 'card' | 'pix';
  readonly recurring: boolean;
  readonly termMonths: 1 | 3 | 12;
  readonly amountCents: number;
  readonly listAmountCents: number;
  readonly currency: 'BRL';
  readonly founderLimit?: number;
};

export const PATCH_BILLING_OFFERS: Readonly<Record<BillingOfferCode, BillingOffer>> = {
  go_card_month: {
    code: 'go_card_month',
    plan: 'go',
    paymentMethod: 'card',
    recurring: true,
    termMonths: 1,
    amountCents: 3_999,
    listAmountCents: 3_999,
    currency: 'BRL',
  },
  max_card_month: {
    code: 'max_card_month',
    plan: 'max',
    paymentMethod: 'card',
    recurring: true,
    termMonths: 1,
    amountCents: 15_000,
    listAmountCents: 15_000,
    currency: 'BRL',
  },
  go_pix_quarter: {
    code: 'go_pix_quarter',
    plan: 'go',
    paymentMethod: 'pix',
    recurring: false,
    termMonths: 3,
    amountCents: 10_990,
    listAmountCents: 11_997,
    currency: 'BRL',
  },
  max_pix_quarter: {
    code: 'max_pix_quarter',
    plan: 'max',
    paymentMethod: 'pix',
    recurring: false,
    termMonths: 3,
    amountCents: 39_990,
    listAmountCents: 45_000,
    currency: 'BRL',
  },
  go_pix_year: {
    code: 'go_pix_year',
    plan: 'go',
    paymentMethod: 'pix',
    recurring: false,
    termMonths: 12,
    amountCents: 39_990,
    listAmountCents: 47_988,
    currency: 'BRL',
  },
  max_pix_year: {
    code: 'max_pix_year',
    plan: 'max',
    paymentMethod: 'pix',
    recurring: false,
    termMonths: 12,
    amountCents: 119_990,
    listAmountCents: 180_000,
    currency: 'BRL',
  },
  max_pix_year_founder: {
    code: 'max_pix_year_founder',
    plan: 'max',
    paymentMethod: 'pix',
    recurring: false,
    termMonths: 12,
    amountCents: 99_990,
    listAmountCents: 119_990,
    currency: 'BRL',
    founderLimit: 100,
  },
};

export const CARD_CHECKOUT_TTL_MS = 10 * 60_000;
export const PIX_CHECKOUT_TTL_MS = 30 * 60_000;
