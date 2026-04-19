/**
 * Mutual Follow on Connection Accepted
 *
 * When a connection request is accepted, both users start following each other.
 */

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IdempotencyService } from '@/bounded-contexts/platform/common/idempotency/idempotency.service';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { ConnectionAcceptedEvent } from '../../domain/events';
import { FollowRepositoryPort } from '../ports/follow.port';

@Injectable()
export class MutualFollowOnConnectionAcceptedHandler {
  constructor(
    private readonly followRepo: FollowRepositoryPort,
    private readonly idempotency: IdempotencyService,
    private readonly logger: AppLoggerService,
  ) {}

  @OnEvent(ConnectionAcceptedEvent.TYPE)
  async handle(event: ConnectionAcceptedEvent): Promise<void> {
    const { requesterId, targetId } = event.payload;

    const key = `mutual_follow:${[requesterId, targetId].sort().join(':')}`;
    await this.idempotency.once(key, async () => {
      await Promise.all([
        this.createFollowIfMissing(requesterId, targetId),
        this.createFollowIfMissing(targetId, requesterId),
      ]);
      this.logger.debug(
        `Mutual follow created between ${requesterId} and ${targetId}`,
        'MutualFollowOnConnectionAcceptedHandler',
      );
    });
  }

  private async createFollowIfMissing(followerId: string, followingId: string): Promise<void> {
    const existing = await this.followRepo.findFollow(followerId, followingId);
    if (existing) return;
    await this.followRepo.createFollow(followerId, followingId);
  }
}
