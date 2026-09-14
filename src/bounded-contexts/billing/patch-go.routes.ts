import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route.types';
import type { PatchGoBilling } from './patch-go.billing';

const StatusResponse = z.object({
  enabled: z.boolean(),
  status: z.string(),
  active: z.boolean(),
  used: z.number().int(),
  limit: z.number().int(),
  periodEnd: z.string().nullable().openapi({ example: '2026-10-14T00:00:00.000Z' }),
  cancelAtPeriodEnd: z.boolean().openapi({ example: false }),
});
const UrlResponse = z.object({ url: z.string().url() });
const CheckoutBody = z.object({ market: z.enum(['BRL', 'USD']) });

export const patchGoRoutes: ReadonlyArray<Route<PatchGoBilling>> = [
  {
    method: 'GET',
    path: '/v1/billing/patch-go',
    auth: { kind: 'jwt' },
    response: StatusResponse,
    openapi: { summary: 'Patch Go subscription and monthly usage', tags: ['billing'] },
    sdk: { exported: true },
    handler: async (ctx, billing) => billing.status(ctx.user!.userId),
  },
  {
    method: 'POST',
    path: '/v1/billing/patch-go/checkout',
    auth: { kind: 'jwt' },
    body: CheckoutBody,
    response: UrlResponse,
    openapi: { summary: 'Create a Patch Go subscription Checkout session', tags: ['billing'] },
    sdk: { exported: true },
    handler: async (ctx, billing) => ({
      url: await billing.checkout(
        ctx.user!.userId,
        (ctx.body as z.infer<typeof CheckoutBody>).market,
      ),
    }),
  },
  {
    method: 'POST',
    path: '/v1/billing/patch-go/portal',
    auth: { kind: 'jwt' },
    response: UrlResponse,
    openapi: { summary: 'Open the Stripe customer portal for Patch Go', tags: ['billing'] },
    sdk: { exported: true },
    handler: async (ctx, billing) => ({ url: await billing.portal(ctx.user!.userId) }),
  },
];
