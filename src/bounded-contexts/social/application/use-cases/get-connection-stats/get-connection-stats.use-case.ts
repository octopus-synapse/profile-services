import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { ConnectionRepositoryPort } from '../../ports/connection.port';

export class GetConnectionStatsUseCase {
  constructor(private readonly repository: ConnectionRepositoryPort) {}

  async execute(userId: string): Promise<{ connections: number }> {
    const exists = await this.repository.userExists(userId);
    if (!exists) throw new EntityNotFoundException('User', userId);

    const connections = await this.repository.countAcceptedConnections(userId);
    return { connections };
  }
}
