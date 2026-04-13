import type { ConnectionRepositoryPort, ConnectionWithUser } from '../../ports/connection.port';
import type { PaginationParams } from '../../ports/follow.port';

export class GetConnectionsUseCase {
  constructor(private readonly repository: ConnectionRepositoryPort) {}

  async execute(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{
    data: ConnectionWithUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page, limit } = pagination;
    const { data, total } = await this.repository.findAcceptedConnections(userId, pagination);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
