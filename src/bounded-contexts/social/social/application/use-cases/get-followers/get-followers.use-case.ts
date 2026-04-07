import type {
  FollowRepositoryPort,
  FollowWithUser,
  PaginatedResult,
  PaginationParams,
} from '../../ports/follow.port';

export class GetFollowersUseCase {
  constructor(private readonly repository: FollowRepositoryPort) {}

  async execute(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<FollowWithUser>> {
    const { page, limit } = pagination;
    const { data, total } = await this.repository.findFollowers(userId, pagination);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
