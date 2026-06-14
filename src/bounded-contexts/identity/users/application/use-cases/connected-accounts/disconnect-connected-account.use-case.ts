import {
  CannotRemoveLastLoginMethodException,
  ConnectedAccountNotFoundException,
} from '../../../domain/exceptions/connected-accounts.exceptions';
import type { ConnectedAccountsRepository } from '../../../infrastructure/adapters/persistence/connected-accounts.repository';

export class DisconnectConnectedAccountUseCase {
  constructor(private readonly repository: ConnectedAccountsRepository) {}

  async execute(userId: string, provider: string): Promise<void> {
    const [count, hasPassword] = await Promise.all([
      this.repository.countByUser(userId),
      this.repository.hasPassword(userId),
    ]);

    // Don't strand a password-less user with no remaining login method.
    if (!hasPassword && count <= 1) {
      throw new CannotRemoveLastLoginMethodException();
    }

    const removed = await this.repository.deleteByProvider(userId, provider);
    if (removed === 0) {
      throw new ConnectedAccountNotFoundException();
    }
  }
}
