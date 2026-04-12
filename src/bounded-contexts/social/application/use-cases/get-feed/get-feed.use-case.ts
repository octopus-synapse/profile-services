import type { ActivityRepositoryPort, ActivityWithUser } from '../../ports/activity.port';
import type {
  FollowRepositoryPort,
  PaginatedResult,
  PaginationParams,
} from '../../ports/follow.port';

export class GetFeedUseCase {
  constructor(
    private readonly activityRepository: ActivityRepositoryPort,
    private readonly followRepository: FollowRepositoryPort,
  ) {}

  async execute(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ActivityWithUser>> {
    const { page, limit } = pagination;

    const followingIds = await this.followRepository.findFollowingIds(userId);

    if (followingIds.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const { data, total } = await this.activityRepository.findActivitiesByUserIds(
      followingIds,
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
