import { LoggerPort } from '@/shared-kernel';
import { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { UserFollowedEvent } from '../../../domain/events';
import {
  AlreadyFollowingException,
  CannotFollowSelfException,
} from '../../../domain/exceptions/social.exceptions';
import type { FollowWithUser } from '../../ports/follow.port';
import { FollowRepositoryPort } from '../../ports/follow.port';

export class FollowUserUseCase {
  constructor(
    private readonly repository: FollowRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly logger: LoggerPort,
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

    // P2-#7 (intentional: telemetry/notification): activity feed + push
    // notification handlers swallow errors per CLAUDE.md Q13-V3 — fire
    // and forget is correct here, the follow itself succeeded.
    this.eventPublisher.publish(new UserFollowedEvent(followingId, { followerId }));

    return follow;
  }
}
