import type { ConnectionRepositoryPort } from '../../ports/connection.port';

export class GetConnectionStatsUseCase {
  constructor(private readonly repository: ConnectionRepositoryPort) {}

  async execute(userId: string): Promise<{ connections: number }> {
    const connections = await this.repository.countAcceptedConnections(userId);
    return { connections };
  }
}
