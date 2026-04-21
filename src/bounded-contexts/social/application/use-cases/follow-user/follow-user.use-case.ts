import { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { UserFollowedEvent } from '../../../domain/events';
import {
  AlreadyFollowingException,
  CannotFollowSelfException,
} from '../../../domain/exceptions/social.exceptions';
import type { FollowRepositoryPort, FollowWithUser } from '../../ports/follow.port';

export class FollowUserUseCase {
  constructor(
    private readonly repository: FollowRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(followerId: string, followingId: string): Promise<FollowWithUser> {
    if (followerId === followingId) {
      throw new CannotFollowSelfException();
    }

    const targetExists = await this.repository.userExists(followingId);
    if (!targetExists) {
      throw new EntityNotFoundException('User', followingId);
    }

    const existingFollow = await this.repository.findFollow(followerId, followingId);
    if (existingFollow) {
      throw new AlreadyFollowingException();
    }

    const follow = await this.repository.createFollow(followerId, followingId);

    this.eventPublisher.publish(new UserFollowedEvent(followingId, { followerId }));

    return follow;
  }
}
