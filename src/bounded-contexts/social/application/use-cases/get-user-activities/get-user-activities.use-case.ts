import type { ActivityWithUser } from '../../ports/activity.port';
import { buildPaginatedResponse } from '@/shared-kernel/schemas/common/build-paginated-response';
import { ActivityRepositoryPort } from '../../ports/activity.port';
import type { PaginatedResult, PaginationParams } from '../../ports/follow.port';

export class GetUserActivitiesUseCase {
  constructor(private readonly repository: ActivityRepositoryPort) {}

  async execute(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ActivityWithUser>> {
        const { items, total } = await this.repository.findUserActivities(userId, pagination);

    return buildPaginatedResponse(items, total, pagination);
  }
}
