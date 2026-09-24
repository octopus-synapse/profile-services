import type Elysia from 'elysia';
import type { LoggerPort } from '@/shared-kernel';
import type { PatchGoBilling } from './patch-go.billing';

/** Mercado Pago signs the resource id, request id and timestamp. */
export function registerPatchGoWebhook(
  app: Elysia,
  billing: PatchGoBilling,
  logger: LoggerPort,
): void {
  app.post(
    '/api/v1/billing/webhooks/mercado-pago',
    async ({ request, set }) => {
      if (!billing.enabled) {
        set.status = 404;
        return { received: false };
      }
      const signature = request.headers.get('x-signature');
      const requestId = request.headers.get('x-request-id');
      if (!signature || !requestId) {
        set.status = 400;
        return { received: false };
      }
      let event: ReturnType<PatchGoBilling['verifyWebhook']>;
      try {
        event = billing.verifyWebhook(await request.text(), signature, requestId);
      } catch {
        logger.warn('Rejected invalid Mercado Pago webhook signature', 'BillingWebhook');
        set.status = 400;
        return { received: false };
      }
      try {
        await billing.handleEvent(event);
        return { received: true };
      } catch (err) {
        logger.error(`Mercado Pago webhook failed: ${err instanceof Error ? err.message : 'unknown'}`, {
          context: 'BillingWebhook',
        });
        set.status = 500;
        return { received: false };
      }
    },
    { parse: 'none' },
  );
}
