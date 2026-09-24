import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route.types';
import { IdParamSchema } from '@/shared-kernel/schemas/params';
import type { BillingHttpBundle } from '../../application/ports/billing-http.bundle';
import type { BillingOfferCode } from '../../domain/policies/billing-offer.policy';
import {
  CardBodySchema,
  CheckoutResponseSchema,
  CreateCheckoutBodySchema,
  OffersResponseSchema,
  PaymentMethodSessionCreatedSchema,
  PaymentMethodSessionResponseSchema,
  PaymentMethodUpdatedSchema,
  PaymentQuerySchema,
  PaymentsResponseSchema,
  ReturnUrlBodySchema,
  SessionParamsSchema,
  StatusResponseSchema,
  SubmitCardBodySchema,
} from './billing.routes.schemas';

export const billingRoutes: ReadonlyArray<Route<BillingHttpBundle>> = [
  {
    method: 'GET',
    path: '/v1/billing/offers',
    auth: { kind: 'jwt' },
    response: OffersResponseSchema,
    openapi: { summary: 'List billing offers', tags: ['billing'] },
    sdk: { exported: true },
    handler: async (_ctx, bc) => ({ items: await bc.checkout.offers() }),
  },
  {
    method: 'POST',
    path: '/v1/billing/checkouts',
    auth: { kind: 'jwt' },
    body: CreateCheckoutBodySchema,
    response: CheckoutResponseSchema,
    openapi: { summary: 'Create a card or Pix checkout', tags: ['billing'] },
    sdk: { exported: true },
    handler: async (ctx, bc) =>
      bc.checkout.create(
        ctx.user!.userId,
        (ctx.body as z.infer<typeof CreateCheckoutBodySchema>).offerCode as BillingOfferCode,
      ),
  },
  {
    method: 'GET',
    path: '/v1/billing/checkouts/:id',
    auth: { kind: 'jwt' },
    params: IdParamSchema,
    response: CheckoutResponseSchema,
    openapi: { summary: 'Read a checkout', tags: ['billing'] },
    sdk: { exported: true },
    handler: async (ctx, bc) =>
      bc.checkout.status(ctx.user!.userId, (ctx.params as { id: string }).id),
  },
  {
    method: 'POST',
    path: '/v1/billing/checkouts/:id/card',
    auth: { kind: 'jwt' },
    params: IdParamSchema,
    body: SubmitCardBodySchema,
    response: CheckoutResponseSchema,
    openapi: { summary: 'Submit tokenized card', tags: ['billing'] },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as z.infer<typeof SubmitCardBodySchema>;
      return bc.checkout.submitCard(
        ctx.user!.userId,
        (ctx.params as { id: string }).id,
        body.cardToken,
        body.paymentMethodId,
        body.installments,
      );
    },
  },
  {
    method: 'GET',
    path: '/v1/billing/subscription',
    auth: { kind: 'jwt' },
    response: StatusResponseSchema,
    openapi: { summary: 'Current billing status', tags: ['billing'] },
    sdk: { exported: true },
    handler: async (ctx, bc) => bc.status.execute(ctx.user!.userId),
  },
  {
    method: 'POST',
    path: '/v1/billing/subscription/cancel',
    auth: { kind: 'jwt' },
    response: StatusResponseSchema,
    openapi: { summary: 'Cancel subscription renewal', tags: ['billing'] },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      await bc.subscription.cancel(ctx.user!.userId);
      return bc.status.execute(ctx.user!.userId);
    },
  },
  {
    method: 'GET',
    path: '/v1/billing/subscription/payments',
    auth: { kind: 'jwt' },
    query: PaymentQuerySchema,
    response: PaymentsResponseSchema,
    openapi: { summary: 'List subscription payments', tags: ['billing'] },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const q = PaymentQuerySchema.parse(ctx.query);
      return bc.subscription.payments(ctx.user!.userId, q.page, q.limit);
    },
  },
  {
    method: 'POST',
    path: '/v1/billing/subscription/payment-method-session',
    auth: { kind: 'jwt' },
    body: ReturnUrlBodySchema,
    response: PaymentMethodSessionCreatedSchema,
    openapi: { summary: 'Create card update session', tags: ['billing'] },
    sdk: { exported: true },
    handler: async (ctx, bc) =>
      bc.subscription.createPaymentMethodSession(
        ctx.user!.userId,
        (ctx.body as z.infer<typeof ReturnUrlBodySchema>).returnUrl,
      ),
  },
  {
    method: 'GET',
    path: '/v1/billing/subscription/payment-method-session/:token',
    auth: { kind: 'public' },
    params: SessionParamsSchema,
    response: PaymentMethodSessionResponseSchema,
    openapi: { summary: 'Read card update session', tags: ['billing'] },
    handler: async (ctx, bc) =>
      bc.subscription.getPaymentMethodSession((ctx.params as { token: string }).token),
  },
  {
    method: 'POST',
    path: '/v1/billing/subscription/payment-method',
    auth: { kind: 'public' },
    body: CardBodySchema,
    response: PaymentMethodUpdatedSchema,
    openapi: { summary: 'Update subscription card', tags: ['billing'] },
    handler: async (ctx, bc) => {
      const body = ctx.body as z.infer<typeof CardBodySchema>;
      return bc.subscription.updatePaymentMethod(body.sessionToken, body.cardToken);
    },
  },
];
