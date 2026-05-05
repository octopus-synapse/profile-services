import { buildPaginatedResponse } from '@/shared-kernel/schemas/common/build-paginated-response';
import type { FollowWithUser, PaginatedResult, PaginationParams } from '../../ports/follow.port';
import { FollowRepositoryPort } from '../../ports/follow.port';

export class GetFollowingUseCase {
  constructor(private readonly repository: FollowRepositoryPort) {}

  async execute(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<FollowWithUser>> {
    const { items, total } = await this.repository.findFollowing(userId, pagination);

    return buildPaginatedResponse(items, total, pagination);
  }
}
