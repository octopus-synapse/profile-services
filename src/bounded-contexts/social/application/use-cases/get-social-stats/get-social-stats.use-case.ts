import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { FollowRepositoryPort } from '../../ports/follow.port';

export class GetSocialStatsUseCase {
  constructor(private readonly repository: FollowRepositoryPort) {}

  async execute(userId: string): Promise<{ followers: number; following: number }> {
    const exists = await this.repository.userExists(userId);
    if (!exists) throw new EntityNotFoundException('User', userId);

    const [followers, following] = await Promise.all([
      this.repository.countFollowers(userId),
      this.repository.countFollowing(userId),
    ]);

    return { followers, following };
  }
}
