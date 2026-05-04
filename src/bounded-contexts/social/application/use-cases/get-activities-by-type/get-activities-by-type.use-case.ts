import type { ActivityType, ActivityWithUser } from '../../ports/activity.port';
import { buildPaginatedResponse } from '@/shared-kernel/schemas/common/build-paginated-response';
import { ActivityRepositoryPort } from '../../ports/activity.port';
import type { PaginatedResult, PaginationParams } from '../../ports/follow.port';

export class GetActivitiesByTypeUseCase {
  constructor(private readonly repository: ActivityRepositoryPort) {}

  async execute(
    userId: string,
    type: ActivityType,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ActivityWithUser>> {
    const { page, limit } = pagination;
    const { items, total } = await this.repository.findUserActivitiesByType(
      userId,
      type,
      pagination,
    );

    return buildPaginatedResponse(items, total, pagination);
  }
}
