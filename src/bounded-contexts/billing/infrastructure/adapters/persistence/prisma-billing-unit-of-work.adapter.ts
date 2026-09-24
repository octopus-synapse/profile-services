import type { PrismaClient } from '@prisma/client';
import type { LoggerPort } from '@/shared-kernel';
import { runInTransaction } from '@/shared-kernel/persistence/transaction';
import { BillingUnitOfWorkPort } from '../../../domain/ports/billing-store.port';
import { PrismaBillingStore } from './prisma-billing-store.repository';

export class PrismaBillingUnitOfWork extends BillingUnitOfWorkPort {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger?: LoggerPort,
  ) {
    super();
  }
  execute<T>(operation: (store: PrismaBillingStore) => Promise<T>): Promise<T> {
    return runInTransaction(this.prisma, (tx) => operation(new PrismaBillingStore(tx)));
  }
}
