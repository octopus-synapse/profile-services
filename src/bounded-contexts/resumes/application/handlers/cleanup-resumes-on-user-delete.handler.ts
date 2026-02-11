/**
 * Cleanup Resumes on User Delete Handler
 *
 * Cross-context event handler that reacts to UserDeletedEvent
 * from Identity context to clean up orphaned resumes.
 *
 * Robert C. Martin: "Single Responsibility"
 * - This handler only cleans up resumes when a user is deleted.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserDeletedEvent } from '@/bounded-contexts/identity/domain/events';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

@Injectable()
export class CleanupResumesOnUserDeleteHandler {
  private readonly logger = new Logger(CleanupResumesOnUserDeleteHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(UserDeletedEvent.TYPE)
  async handle(event: UserDeletedEvent): Promise<void> {
    const userId = event.aggregateId;

    this.logger.log(`Cleaning up resumes for deleted user: ${userId}`);

    const result = await this.prisma.resume.deleteMany({
      where: { userId },
    });

    this.logger.log(
      `Deleted ${result.count} resumes for user ${userId} (reason: ${event.payload.reason})`,
    );
  }
}
