import { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { buildPaginatedResponse } from '@/shared-kernel/schemas/common/build-paginated-response';
import type { ActivityWithUser } from '../../ports/activity.port';
import { ActivityRepositoryPort } from '../../ports/activity.port';
import type { PaginatedResult, PaginationParams } from '../../ports/follow.port';
import { FollowRepositoryPort } from '../../ports/follow.port';

export class GetFeedUseCase {
  constructor(
    private readonly activityRepository: ActivityRepositoryPort,
    private readonly followRepository: FollowRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ActivityWithUser>> {
    const userExists = await this.followRepository.userExists(userId);
    if (!userExists) throw new EntityNotFoundException('User', userId);

    const followingIds = await this.followRepository.findFollowingIds(userId);

    if (followingIds.length === 0) {
      return buildPaginatedResponse([], 0, pagination);
    }

    const { items, total } = await this.activityRepository.findActivitiesByUserIds(
      followingIds,
      pagination,
    );

    return buildPaginatedResponse(items, total, pagination);
  }
}
