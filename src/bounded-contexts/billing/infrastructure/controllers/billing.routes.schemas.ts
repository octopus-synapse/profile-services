import { z } from 'zod';
import {
  PaginatedResponseSchema,
  PaginationQuerySchema,
} from '@/shared-kernel/schemas/common/api.types';

export const OfferCodeSchema = z.enum([
  'go_card_month',
  'max_card_month',
  'go_pix_quarter',
  'max_pix_quarter',
  'go_pix_year',
  'max_pix_year',
  'max_pix_year_founder',
]);
export const StatusResponseSchema = z.object({
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
  paymentMode: z.enum(['card_recurring', 'pix_prepaid']).nullable(),
  creditBalanceCents: z.number().int().nonnegative().openapi({ example: 0 }),
  cancelAtPeriodEnd: z.boolean().openapi({ example: false }),
  freeTranslationsUsed: z.number().int().openapi({ example: 3 }),
  freeTranslationsLimit: z.number().int().openapi({ example: 20 }),
  openCheckout: z
    .object({
      id: z.string().uuid(),
      offerCode: OfferCodeSchema,
      status: z.string(),
      expiresAt: z.string(),
    })
    .nullable(),
});
export const OfferResponseSchema = z.object({
  code: OfferCodeSchema,
  plan: z.enum(['go', 'max']),
  paymentMethod: z.enum(['card', 'pix']),
  recurring: z.boolean().openapi({ example: false }),
  termMonths: z.union([z.literal(1), z.literal(3), z.literal(12)]),
  amountCents: z.number().int().positive().openapi({ example: 39990 }),
  listAmountCents: z.number().int().positive().openapi({ example: 47988 }),
  currency: z.literal('BRL'),
  founderLimit: z.number().int().positive().optional().openapi({ example: 100 }),
  founderRemaining: z.number().int().nonnegative().nullable().openapi({ example: 87 }),
});
export const OffersResponseSchema = z.object({
  checkoutEnabled: z.boolean().openapi({ example: true }),
  items: z.array(OfferResponseSchema),
});
export const ChangePlanBodySchema = z.object({ plan: z.literal('go') });
export const CheckoutResponseSchema = z.object({
  id: z.string().uuid(),
  offerCode: OfferCodeSchema,
  kind: z.enum(['card', 'pix']),
  status: z.string(),
  amountCents: z.number().int().nonnegative().openapi({ example: 39990 }),
  listAmountCents: z.number().int().positive().openapi({ example: 47988 }),
  creditAppliedCents: z.number().int().nonnegative().openapi({ example: 0 }),
  currency: z.literal('BRL'),
  expiresAt: z.string(),
  publicKey: z.string().nullable().openapi({ example: 'APP_USR-public-key' }),
  qrCode: z.string().nullable(),
  qrCodeBase64: z.string().nullable().openapi({ example: 'iVBORw0KGgoAAAANSUhEUgAA' }),
  ticketUrl: z
    .string()
    .nullable()
    .openapi({ example: 'https://www.mercadopago.com.br/payments/1/ticket' }),
});
export const CreateCheckoutBodySchema = z.object({ offerCode: OfferCodeSchema });
export const SubmitCardBodySchema = z.object({
  cardToken: z.string().min(10).max(512).openapi({ example: 'card-token-example' }),
  paymentMethodId: z.string().min(2).max(64).optional().openapi({ example: 'visa' }),
  installments: z.literal(1).default(1),
});
export const ReturnUrlBodySchema = z.object({
  returnUrl: z.string().max(500).optional().openapi({ example: 'https://patchcareers.org/go' }),
});
export const CardBodySchema = z.object({
  sessionToken: z.string().min(20).max(200).openapi({ example: 'session-token-example-1234' }),
  cardToken: z.string().min(10).max(512).openapi({ example: 'card-token-example' }),
});
export const SessionParamsSchema = z.object({ token: z.string().min(20).max(200) });
export const PaymentQuerySchema = PaginationQuerySchema.pick({ page: true, limit: true });
const PaymentItemSchema = z.object({
  id: z.string(),
  status: z.string(),
  amountCents: z.number().int().openapi({ example: 3999 }),
  currency: z.string(),
  paidAt: z.string().nullable().openapi({ example: '2026-09-24T12:00:00.000Z' }),
  periodStart: z.string().nullable().openapi({ example: '2026-09-24T12:00:00.000Z' }),
  periodEnd: z.string().nullable().openapi({ example: '2026-10-24T12:00:00.000Z' }),
});
export const PaymentsResponseSchema = PaginatedResponseSchema(PaymentItemSchema);
export const PaymentMethodSessionCreatedSchema = z.object({
  url: z.string().url().openapi({ example: 'https://patchcareers.org/billing/payment-method' }),
});
export const PaymentMethodSessionResponseSchema = z.object({
  publicKey: z.string().openapi({ example: 'APP_USR-public-key' }),
  plan: z.enum(['go', 'max']),
  returnUrl: z.string().openapi({ example: 'https://patchcareers.org/go' }),
});
export const PaymentMethodUpdatedSchema = z.object({
  returnUrl: z.string().openapi({ example: 'https://patchcareers.org/go' }),
});
