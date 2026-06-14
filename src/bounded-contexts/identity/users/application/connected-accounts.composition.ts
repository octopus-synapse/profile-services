/**
 * Connected-accounts sub-composition. Exposes the per-UC handlers the parent
 * users.composition.ts merges into `bundle.useCases`.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ConnectedAccountsRepository } from '../infrastructure/adapters/persistence/connected-accounts.repository';
import { DisconnectConnectedAccountUseCase } from './use-cases/connected-accounts/disconnect-connected-account.use-case';
import { ListConnectedAccountsUseCase } from './use-cases/connected-accounts/list-connected-accounts.use-case';

export interface ConnectedAccountsUseCasesBundle {
  readonly listConnectedAccounts: ListConnectedAccountsUseCase;
  readonly disconnectConnectedAccount: DisconnectConnectedAccountUseCase;
}

export function buildConnectedAccountsUseCases(
  prisma: PrismaService,
): ConnectedAccountsUseCasesBundle {
  const repository = new ConnectedAccountsRepository(prisma);
  return {
    listConnectedAccounts: new ListConnectedAccountsUseCase(repository),
    disconnectConnectedAccount: new DisconnectConnectedAccountUseCase(repository),
  };
}
