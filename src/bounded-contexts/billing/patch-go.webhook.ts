import type Elysia from 'elysia';
import type { LoggerPort } from '@/shared-kernel';
import type { PatchGoBilling } from './patch-go.billing';

/** Stripe needs the untouched request body to verify its signature. */
export function registerPatchGoWebhook(
  app: Elysia,
  billing: PatchGoBilling,
  logger: LoggerPort,
): void {
  app.post(
    '/api/v1/billing/stripe-webhook',
    async ({ request, set }) => {
      if (!billing.enabled) {
        set.status = 404;
        return { received: false };
      }
      const signature = request.headers.get('stripe-signature');
      if (!signature) {
        set.status = 400;
        return { received: false };
      }
      let event: Awaited<ReturnType<PatchGoBilling['constructEvent']>>;
      try {
        event = await billing.constructEvent(await request.text(), signature);
      } catch {
        logger.warn('Rejected invalid Patch Go webhook signature', 'PatchGoWebhook');
        set.status = 400;
        return { received: false };
      }
      try {
        await billing.handleEvent(event);
        return { received: true };
      } catch (err) {
        logger.error(`Patch Go webhook failed: ${err instanceof Error ? err.message : 'unknown'}`, {
          context: 'PatchGoWebhook',
        });
        set.status = 500;
        return { received: false };
      }
    },
    { parse: 'none' },
  );
}
