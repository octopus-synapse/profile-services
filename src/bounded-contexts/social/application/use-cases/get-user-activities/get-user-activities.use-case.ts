import type { ActivityRepositoryPort, ActivityWithUser } from '../../ports/activity.port';
import type { PaginatedResult, PaginationParams } from '../../ports/follow.port';

export class GetUserActivitiesUseCase {
  constructor(private readonly repository: ActivityRepositoryPort) {}

  async execute(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ActivityWithUser>> {
    const { page, limit } = pagination;
    const { data, total } = await this.repository.findUserActivities(userId, pagination);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
