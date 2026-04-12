import type { FollowRepositoryPort } from '../../ports/follow.port';

export class GetSocialStatsUseCase {
  constructor(private readonly repository: FollowRepositoryPort) {}

  async execute(userId: string): Promise<{ followers: number; following: number }> {
    const [followers, following] = await Promise.all([
      this.repository.countFollowers(userId),
      this.repository.countFollowing(userId),
    ]);

    return { followers, following };
  }
}
