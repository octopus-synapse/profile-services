import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { FollowRepositoryPort } from '../../ports/follow.port';

export class CheckFollowingUseCase {
  constructor(private readonly repository: FollowRepositoryPort) {}

  async execute(followerId: string, followingId: string): Promise<boolean> {
    const targetExists = await this.repository.userExists(followingId);
    if (!targetExists) throw new EntityNotFoundException('User', followingId);

    const follow = await this.repository.findFollow(followerId, followingId);
    return follow !== null;
  }
}
