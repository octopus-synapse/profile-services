import type { ActivityType } from '@prisma/client';
import type { ActivityRepositoryPort, ActivityWithUser } from '../../ports/activity.port';
import type { PaginatedResult, PaginationParams } from '../../ports/follow.port';

export class GetActivitiesByTypeUseCase {
  constructor(private readonly repository: ActivityRepositoryPort) {}

  async execute(
    userId: string,
    type: ActivityType,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ActivityWithUser>> {
    const { page, limit } = pagination;
    const { data, total } = await this.repository.findUserActivitiesByType(
      userId,
      type,
      pagination,
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
