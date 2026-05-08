import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { ConnectionRepositoryPort } from '../../ports/connection.port';

export class CheckConnectedUseCase {
  constructor(private readonly repository: ConnectionRepositoryPort) {}

  async execute(userA: string, userB: string): Promise<boolean> {
    const targetExists = await this.repository.userExists(userB);
    if (!targetExists) throw new EntityNotFoundException('User', userB);

    const connection = await this.repository.findConnectionBetween(userA, userB);
    return connection !== null && connection.status === 'ACCEPTED';
  }
}
