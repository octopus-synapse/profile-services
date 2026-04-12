import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import { UserFollowedEvent } from '../../../domain/events';
import type { FollowRepositoryPort, FollowWithUser } from '../../ports/follow.port';

export class FollowUserUseCase {
  constructor(
    private readonly repository: FollowRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(followerId: string, followingId: string): Promise<FollowWithUser> {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const targetExists = await this.repository.userExists(followingId);
    if (!targetExists) {
      throw new NotFoundException('User not found');
    }

    const existingFollow = await this.repository.findFollow(followerId, followingId);
    if (existingFollow) {
      throw new ConflictException('Already following this user');
    }

    const follow = await this.repository.createFollow(followerId, followingId);

    this.eventPublisher.publish(new UserFollowedEvent(followingId, { followerId }));

    return follow;
  }
}
