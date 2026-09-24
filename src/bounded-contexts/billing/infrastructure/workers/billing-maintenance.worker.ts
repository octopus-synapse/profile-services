import type { DistributedLockPort, LoggerPort } from '@/shared-kernel';
import { runWithFailureMode } from '@/shared-kernel/jobs';
import type { PublishBillingOutboxUseCase } from '../../application/use-cases/outbox/publish-billing-outbox.use-case';
import type { ReconcileBillingUseCase } from '../../application/use-cases/provider/reconcile-billing.use-case';

export const BILLING_OUTBOX_QUEUE = 'billing-outbox';
export const BILLING_RECONCILIATION_QUEUE = 'billing-reconciliation';

export class BillingOutboxWorker {
  constructor(
    private readonly useCase: PublishBillingOutboxUseCase,
    private readonly lock: DistributedLockPort,
    private readonly logger: LoggerPort,
  ) {}
  async process(): Promise<void> {
    this.logger.log('Publishing billing outbox', 'BillingOutboxWorker');
    await runWithFailureMode(
      { worker: 'BillingOutboxWorker', logger: this.logger },
      'RETRY',
      async () => {
        await this.lock.withLock('billing:outbox', { ttlMs: 55_000 }, async () => {
          await this.useCase.execute();
        });
      },
    );
  }
}
export class BillingReconciliationWorker {
  constructor(
    private readonly useCase: ReconcileBillingUseCase,
    private readonly lock: DistributedLockPort,
    private readonly logger: LoggerPort,
  ) {}
  async process(): Promise<void> {
    this.logger.log('Reconciling billing provider state', 'BillingReconciliationWorker');
    await runWithFailureMode(
      { worker: 'BillingReconciliationWorker', logger: this.logger },
      'RETRY',
      async () => {
        await this.lock.withLock('billing:reconciliation', { ttlMs: 10 * 60_000 }, async () => {
          await this.useCase.execute();
        });
      },
    );
  }
}
