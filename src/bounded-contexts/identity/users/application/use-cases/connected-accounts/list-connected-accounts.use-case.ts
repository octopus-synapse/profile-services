import type { ConnectedAccountsRepository } from '../../../infrastructure/adapters/persistence/connected-accounts.repository';

export interface ConnectedAccountDto {
  provider: string;
  connectedAt: string;
}

export class ListConnectedAccountsUseCase {
  constructor(private readonly repository: ConnectedAccountsRepository) {}

  async execute(userId: string): Promise<{ accounts: ConnectedAccountDto[] }> {
    const accounts = await this.repository.listByUser(userId);
    return {
      accounts: accounts.map((a) => ({
        provider: a.provider,
        connectedAt: a.connectedAt.toISOString(),
      })),
    };
  }
}
