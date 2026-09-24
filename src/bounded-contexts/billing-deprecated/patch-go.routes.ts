import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import type { PatchGoBilling } from './patch-go.billing';

const StatusResponse = z.object({
  enabled: z.boolean(),
  status: z.string(),
  active: z.boolean(),
  plan: z.enum(['free', 'go', 'max']),
  pendingPlan: z.enum(['go', 'max']).nullable(),
  used: z.number().int(),
  limit: z.number().int(),
  periodEnd: z.string().nullable().openapi({ example: '2026-10-24T12:00:00.000Z' }),
  quotaPeriodEnd: z.string().nullable().openapi({ example: '2026-10-24T12:00:00.000Z' }),
  renews: z.boolean().openapi({ example: true }),
  billingSource: z.string().nullable().openapi({ example: 'mercado_pago_subscription' }),
  creditBalanceCents: z.number().int().nonnegative().openapi({ example: 0 }),
  cancelAtPeriodEnd: z.boolean().openapi({ example: false }),
  freeTranslationsUsed: z.number().int().openapi({ example: 3 }),
  freeTranslationsLimit: z.number().int().openapi({ example: 20 }),
});
const UrlResponse = z.object({ url: z.string().url() });
const CheckoutBody = z.object({ plan: z.enum(['go', 'max']) });
const LegacyCheckoutBody = z.object({
  plan: z.enum(['go', 'max']).default('go'),
});
const ReturnUrlBody = z.object({
  returnUrl: z.string().max(500).optional().openapi({ example: 'https://patchcareers.org/go' }),
});
const CardBody = z.object({
  sessionToken: z.string().min(20).max(200).openapi({ example: 'session-token-example-1234' }),
  cardToken: z.string().min(10).max(512).openapi({ example: 'card-token-example' }),
});
const SessionParams = z.object({ token: z.string().min(20).max(200) });
const PaymentQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
const PaymentItem = z.object({
  id: z.string(),
  status: z.string(),
  amountCents: z.number().int().openapi({ example: 3999 }),
  currency: z.string(),
  paidAt: z.string().nullable().openapi({ example: '2026-09-24T12:00:00.000Z' }),
  periodStart: z.string().nullable().openapi({ example: '2026-09-24T12:00:00.000Z' }),
  periodEnd: z.string().nullable().openapi({ example: '2026-10-24T12:00:00.000Z' }),
});
const PaymentsResponse = z.object({
  items: z.array(PaymentItem),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});
const OfferCode = z.enum([
  'go_card_month',
  'max_card_month',
  'go_pix_quarter',
  'max_pix_quarter',
  'go_pix_year',
  'max_pix_year',
  'max_pix_year_founder',
]);
const OfferResponse = z.object({
  code: OfferCode,
  plan: z.enum(['go', 'max']),
  paymentMethod: z.enum(['card', 'pix']),
  recurring: z.boolean().openapi({ example: false }),
  termMonths: z.union([z.literal(1), z.literal(3), z.literal(12)]),
  amountCents: z.number().int().positive().openapi({ example: 10990 }),
  listAmountCents: z.number().int().positive().openapi({ example: 11997 }),
  currency: z.literal('BRL'),
  founderLimit: z.number().int().positive().optional().openapi({ example: 100 }),
  founderRemaining: z.number().int().nonnegative().nullable().openapi({ example: 87 }),
});
const CheckoutResponse = z.object({
  id: z.string(),
  offerCode: OfferCode,
  kind: z.enum(['card', 'pix']),
  status: z.string(),
  amountCents: z.number().int().nonnegative().openapi({ example: 10990 }),
  listAmountCents: z.number().int().positive().openapi({ example: 11997 }),
  creditAppliedCents: z.number().int().nonnegative().openapi({ example: 0 }),
  currency: z.string(),
  expiresAt: z.string(),
  publicKey: z.string().nullable().openapi({ example: 'APP_USR-public-key' }),
  qrCode: z.string().nullable(),
  qrCodeBase64: z.string().nullable().openapi({ example: 'iVBORw0KGgoAAAANSUhEUgAA' }),
  ticketUrl: z
    .string()
    .nullable()
    .openapi({ example: 'https://www.mercadopago.com.br/payments/1/ticket' }),
});
const CheckoutParams = z.object({ id: z.string().uuid() });
const CreateCheckoutBody = z.object({ offerCode: OfferCode });
const SubmitCardBody = z.object({
  cardToken: z.string().min(10).max(512).openapi({ example: 'card-token-example' }),
  paymentMethodId: z.string().min(2).max(64).optional().openapi({ example: 'visa' }),
  installments: z.number().int().min(1).max(1).default(1).openapi({ example: 1 }),
});

const statusRoute = (path: string): Route<PatchGoBilling> => ({
  method: 'GET',
  path,
  auth: { kind: 'jwt' },
  response: StatusResponse,
  openapi: { summary: 'Current Patch subscription and usage', tags: ['billing'] },
  sdk: { exported: true },
  handler: async (ctx, billing) => billing.status(ctx.user!.userId),
});

const checkoutRoute = (
  path: string,
  body: typeof CheckoutBody | typeof LegacyCheckoutBody,
): Route<PatchGoBilling> => ({
  method: 'POST',
  path,
  auth: { kind: 'jwt' },
  body,
  response: UrlResponse,
  openapi: { summary: 'Create a Mercado Pago subscription checkout', tags: ['billing'] },
  sdk: { exported: true },
  handler: async (ctx, billing) => ({
    url: await billing.checkout(
      ctx.user!.userId,
      (ctx.body as z.infer<typeof LegacyCheckoutBody>).plan,
    ),
  }),
});

export const patchGoRoutes: ReadonlyArray<Route<PatchGoBilling>> = [
  {
    method: 'GET',
    path: '/v1/billing/offers',
    auth: { kind: 'jwt' },
    response: z.object({ items: z.array(OfferResponse) }),
    openapi: { summary: 'List server-priced Patch billing offers', tags: ['billing'] },
    sdk: { exported: true },
    handler: async (_ctx, billing) => ({ items: await billing.offers() }),
  },
  {
    method: 'POST',
    path: '/v1/billing/checkouts',
    auth: { kind: 'jwt' },
    body: CreateCheckoutBody,
    response: CheckoutResponse,
    openapi: { summary: 'Create an internal card or Pix checkout', tags: ['billing'] },
    sdk: { exported: true },
    handler: async (ctx, billing) =>
      billing.createCheckout(
        ctx.user!.userId,
        (ctx.body as z.infer<typeof CreateCheckoutBody>).offerCode,
      ),
  },
  {
    method: 'GET',
    path: '/v1/billing/checkouts/:id',
    auth: { kind: 'jwt' },
    params: CheckoutParams,
    response: CheckoutResponse,
    openapi: { summary: 'Read and refresh a Patch checkout', tags: ['billing'] },
    sdk: { exported: true },
    handler: async (ctx, billing) =>
      billing.checkoutStatus(ctx.user!.userId, (ctx.params as z.infer<typeof CheckoutParams>).id),
  },
  {
    method: 'POST',
    path: '/v1/billing/checkouts/:id/card',
    auth: { kind: 'jwt' },
    params: CheckoutParams,
    body: SubmitCardBody,
    response: CheckoutResponse,
    openapi: { summary: 'Authorize a subscription with a tokenized card', tags: ['billing'] },
    sdk: { exported: true },
    handler: async (ctx, billing) => {
      const body = ctx.body as z.infer<typeof SubmitCardBody>;
      return billing.submitCardCheckout(
        ctx.user!.userId,
        (ctx.params as z.infer<typeof CheckoutParams>).id,
        body.cardToken,
        body.paymentMethodId,
        body.installments,
      );
    },
  },
  {
    method: 'GET',
    path: '/v1/billing/ai-cost-report',
    auth: { kind: 'jwt' },
    permission: Permission.PLATFORM_STATS_READ,
    response: z.object({
      since: z.string().openapi({ example: '2026-08-25T12:00:00.000Z' }),
      plans: z.array(
        z.object({
          plan: z.enum(['free', 'go', 'max']),
          usersWithPricedUsage: z.number().int().openapi({ example: 42 }),
          unpricedOperations: z.number().int().openapi({ example: 0 }),
          p50Brl: z.number().openapi({ example: 1.25 }),
          p95Brl: z.number().openapi({ example: 6.8 }),
          budgetBrl: z.number().openapi({ example: 8 }),
        }),
      ),
    }),
    openapi: { summary: 'AI cost percentiles by Patch plan', tags: ['billing'] },
    handler: async (_ctx, billing) => billing.aiCostReport(),
  },
  statusRoute('/v1/billing/subscription'),
  statusRoute('/v1/billing/patch-go'),
  checkoutRoute('/v1/billing/subscription/checkout', CheckoutBody),
  checkoutRoute('/v1/billing/patch-go/checkout', LegacyCheckoutBody),
  {
    method: 'POST',
    path: '/v1/billing/subscription/change-plan',
    auth: { kind: 'jwt' },
    body: CheckoutBody,
    response: CheckoutResponse,
    openapi: { summary: 'Start an immediate prorated Patch plan change', tags: ['billing'] },
    sdk: { exported: true },
    handler: async (ctx, billing) =>
      billing.changePlan(ctx.user!.userId, (ctx.body as z.infer<typeof CheckoutBody>).plan),
  },
  {
    method: 'POST',
    path: '/v1/billing/subscription/cancel',
    auth: { kind: 'jwt' },
    response: StatusResponse,
    openapi: { summary: 'Cancel renewal at the end of the paid period', tags: ['billing'] },
    sdk: { exported: true },
    handler: async (ctx, billing) => {
      await billing.cancel(ctx.user!.userId);
      return billing.status(ctx.user!.userId);
    },
  },
  {
    method: 'POST',
    path: '/v1/billing/subscription/payment-method-session',
    auth: { kind: 'jwt' },
    body: ReturnUrlBody,
    response: UrlResponse,
    openapi: { summary: 'Create a short-lived card update session', tags: ['billing'] },
    sdk: { exported: true },
    handler: async (ctx, billing) =>
      billing.createPaymentMethodSession(
        ctx.user!.userId,
        (ctx.body as z.infer<typeof ReturnUrlBody>).returnUrl,
      ),
  },
  {
    method: 'GET',
    path: '/v1/billing/subscription/payment-method-session/:token',
    auth: { kind: 'public' },
    params: SessionParams,
    response: z.object({
      publicKey: z.string().openapi({ example: 'APP_USR-public-key' }),
      plan: z.enum(['go', 'max']),
      returnUrl: z.string().openapi({ example: 'https://patchcareers.org/go' }),
    }),
    openapi: { summary: 'Read a short-lived card update session', tags: ['billing'] },
    handler: async (ctx, billing) =>
      billing.paymentMethodSession((ctx.params as z.infer<typeof SessionParams>).token),
  },
  {
    method: 'POST',
    path: '/v1/billing/subscription/payment-method',
    auth: { kind: 'public' },
    body: CardBody,
    response: z.object({
      returnUrl: z.string().openapi({ example: 'https://patchcareers.org/go' }),
    }),
    openapi: { summary: 'Apply a tokenized card to the subscription', tags: ['billing'] },
    handler: async (ctx, billing) => {
      const body = ctx.body as z.infer<typeof CardBody>;
      return billing.updatePaymentMethod(body.sessionToken, body.cardToken);
    },
  },
  {
    method: 'GET',
    path: '/v1/billing/subscription/payments',
    auth: { kind: 'jwt' },
    query: PaymentQuery,
    response: PaymentsResponse,
    openapi: { summary: 'List subscription charges', tags: ['billing'] },
    sdk: { exported: true },
    handler: async (ctx, billing) => {
      const query = PaymentQuery.parse(ctx.query);
      return billing.payments(ctx.user!.userId, query.page, query.limit);
    },
  },
  {
    method: 'POST',
    path: '/v1/billing/patch-go/portal',
    auth: { kind: 'jwt' },
    response: UrlResponse,
    openapi: { summary: 'Open Patch subscription management', tags: ['billing'] },
    sdk: { exported: true },
    handler: async (ctx, billing) => ({ url: await billing.portal(ctx.user!.userId) }),
  },
];
