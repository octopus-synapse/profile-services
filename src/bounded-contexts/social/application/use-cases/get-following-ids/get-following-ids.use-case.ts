import type { FollowRepositoryPort } from '../../ports/follow.port';

export class GetFollowingIdsUseCase {
  constructor(private readonly repository: FollowRepositoryPort) {}

  async execute(userId: string): Promise<string[]> {
    return this.repository.findFollowingIds(userId);
  }
}
