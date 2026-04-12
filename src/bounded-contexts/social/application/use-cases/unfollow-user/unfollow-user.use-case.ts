import type { FollowRepositoryPort } from '../../ports/follow.port';

export class UnfollowUserUseCase {
  constructor(private readonly repository: FollowRepositoryPort) {}

  async execute(followerId: string, followingId: string): Promise<void> {
    await this.repository.deleteFollow(followerId, followingId);
  }
}
