import type { FollowRepositoryPort } from '../../ports/follow.port';

export class CheckFollowingUseCase {
  constructor(private readonly repository: FollowRepositoryPort) {}

  async execute(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.repository.findFollow(followerId, followingId);
    return follow !== null;
  }
}
