import type { ConnectionWithUser } from '../../ports/connection.port';
import { buildPaginatedResponse } from '@/shared-kernel/schemas/common/build-paginated-response';
import { ConnectionRepositoryPort } from '../../ports/connection.port';
import type { PaginationParams } from '../../ports/follow.port';

export class GetPendingRequestsUseCase {
  constructor(private readonly repository: ConnectionRepositoryPort) {}

  async execute(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{
    items: ConnectionWithUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
        const { items, total } = await this.repository.findPendingRequests(userId, pagination);

    return buildPaginatedResponse(items, total, pagination);
  }
}
