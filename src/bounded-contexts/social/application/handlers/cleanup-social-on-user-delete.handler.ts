/**
 * Cleanup Social on User Delete Handler
 *
 * Cross-context event handler that reacts to UserDeletedEvent
 * from Identity context to clean up follows and activities.
 *
 * Robert C. Martin: "Single Responsibility"
 * - This handler only cleans up social data when a user is deleted.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserDeletedEvent } from '@/bounded-contexts/identity/shared-kernel/domain/events';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

@Injectable()
export class CleanupSocialOnUserDeleteHandler {
  private readonly logger = new Logger(CleanupSocialOnUserDeleteHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(UserDeletedEvent.TYPE)
  async handle(event: UserDeletedEvent): Promise<void> {
    const userId = event.aggregateId;

    this.logger.log(`Cleaning up social data for deleted user: ${userId}`);

    // Delete follows, connections, and activities where user is involved
    const [
      followsAsFollower,
      followsAsFollowing,
      connectionsAsRequester,
      connectionsAsTarget,
      activities,
    ] = await Promise.all([
      this.prisma.follow.deleteMany({
        where: { followerId: userId },
      }),
      this.prisma.follow.deleteMany({
        where: { followingId: userId },
      }),
      this.prisma.connection.deleteMany({
        where: { requesterId: userId },
      }),
      this.prisma.connection.deleteMany({
        where: { targetId: userId },
      }),
      this.prisma.activity.deleteMany({
        where: { userId },
      }),
    ]);

    this.logger.log(
      `Cleaned up social data for user ${userId}: ` +
        `${followsAsFollower.count} follows as follower, ` +
        `${followsAsFollowing.count} follows as following, ` +
        `${connectionsAsRequester.count} connections as requester, ` +
        `${connectionsAsTarget.count} connections as target, ` +
        `${activities.count} activities`,
    );
  }
}
