import type Elysia from 'elysia';
import type { LoggerPort } from '@/shared-kernel';
import type { BillingHttpBundle } from '../../application/ports/billing-http.bundle';

export function registerBillingWebhook(
  app: Elysia,
  billing: BillingHttpBundle,
  logger: LoggerPort,
): void {
  app.post(
    '/api/v1/billing/webhooks/mercado-pago',
    async ({ request, set }) => {
      if (!billing.enabled || !billing.provider || !billing.processProvider) {
        set.status = 404;
        return { received: false };
      }
      const signature = request.headers.get('x-signature');
      const requestId = request.headers.get('x-request-id');
      if (!signature || !requestId) {
        set.status = 400;
        return { received: false };
      }
      try {
        const event = billing.provider.verifyWebhook({
          rawBody: await request.text(),
          signature,
          requestId,
        });
        await billing.processProvider.execute(event);
        return { received: true };
      } catch (error) {
        logger.error('Mercado Pago webhook failed', {
          context: 'BillingWebhook',
          stack: error instanceof Error ? error.stack : undefined,
        });
        set.status = 500;
        return { received: false };
      }
    },
    { parse: 'none' },
  );
}
