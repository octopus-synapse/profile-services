import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { FollowRepositoryPort } from '../../ports/follow.port';

export class UnfollowUserUseCase {
  constructor(private readonly repository: FollowRepositoryPort) {}

  async execute(followerId: string, followingId: string): Promise<void> {
    const targetExists = await this.repository.userExists(followingId);
    if (!targetExists) {
      throw new EntityNotFoundException('User', followingId);
    }
    await this.repository.deleteFollow(followerId, followingId);
  }
}
