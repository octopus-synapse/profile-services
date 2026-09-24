import type { LoggerPort } from '@/shared-kernel';
import type { BillingStorePort } from '../../../domain/ports/billing-store.port';
import type { PaymentProviderPort } from '../../../domain/ports/payment-provider.port';
import { ProcessProviderEventUseCase } from './process-provider-event.use-case';

export class ReconcileBillingUseCase {
  constructor(
    private readonly store: BillingStorePort,
    private readonly provider: PaymentProviderPort | null,
    private readonly processor: ProcessProviderEventUseCase | null,
    private readonly logger: LoggerPort,
  ) {}
  async execute(): Promise<void> {
    if (!this.provider || !this.processor) return;
    for (const local of await this.store.listSubscriptionsForReconciliation(100)) {
      if (!local.providerSubscriptionId) continue;
      try {
        const remote = await this.provider.getSubscription(local.providerSubscriptionId);
        await this.processor.syncSubscription(remote);
        for (const payment of await this.provider.listAuthorizedPayments(remote.id))
          await this.processor.syncPayment(payment);
      } catch (error) {
        this.logger.error(`Billing reconciliation failed for subscription=${local.id}`, {
          context: 'BillingReconciliation',
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    }
    for (const purchase of await this.store.listPurchasesForReconciliation(100)) {
      if (!purchase.providerOrderId) continue;
      try {
        await this.processor.syncOrder(await this.provider.getOrder(purchase.providerOrderId));
      } catch (error) {
        this.logger.error(`Billing reconciliation failed for purchase=${purchase.id}`, {
          context: 'BillingReconciliation',
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    }
  }
}
