/**
 * Cleanup Resumes on User Delete Handler
 *
 * Cross-context event handler that reacts to UserDeletedEvent
 * from Identity context to clean up orphaned resumes.
 *
 * Robert C. Martin: "Single Responsibility"
 * - This handler only cleans up resumes when a user is deleted.
 */

import { UserDeletedEvent } from '@/bounded-contexts/identity/shared-kernel/domain/events';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';

const CTX = 'CleanupResumesOnUserDeleteHandler';

export class CleanupResumesOnUserDeleteHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {}

  async handle(event: UserDeletedEvent): Promise<void> {
    const userId = event.aggregateId;

    this.logger.log(`Cleaning up resumes for deleted user: ${userId}`, CTX);

    const result = await this.prisma.resume.deleteMany({
      where: { userId },
    });

    this.logger.log(
      `Deleted ${result.count} resumes for user ${userId} (reason: ${event.payload.reason})`,
      CTX,
    );
  }
}
