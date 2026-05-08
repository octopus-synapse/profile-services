import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { buildPaginatedResponse } from '@/shared-kernel/schemas/common/build-paginated-response';
import type { ActivityWithUser } from '../../ports/activity.port';
import { ActivityRepositoryPort } from '../../ports/activity.port';
import type { PaginatedResult, PaginationParams } from '../../ports/follow.port';

export class GetUserActivitiesUseCase {
  constructor(private readonly repository: ActivityRepositoryPort) {}

  async execute(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ActivityWithUser>> {
    const exists = await this.repository.userExists(userId);
    if (!exists) throw new EntityNotFoundException('User', userId);

    const { items, total } = await this.repository.findUserActivities(userId, pagination);

    return buildPaginatedResponse(items, total, pagination);
  }
}
