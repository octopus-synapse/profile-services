/**
 * Sync Projection on Resume Deleted Handler
 *
 * Maintains the analytics read model by deleting the projection
 * when a resume is deleted in the Resumes context.
 *
 * This eliminates cross-context database queries.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeDeletedEvent } from '@/bounded-contexts/resumes';

@Injectable()
export class SyncProjectionOnResumeDeletedHandler {
  private readonly logger = new Logger(SyncProjectionOnResumeDeletedHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(ResumeDeletedEvent.TYPE)
  async handle(event: ResumeDeletedEvent): Promise<void> {
    const resumeId = event.aggregateId;

    this.logger.log(`Deleting analytics projection for resume: ${resumeId}`);

    await this.prisma.analyticsResumeProjection.deleteMany({
      where: { id: resumeId },
    });

    this.logger.log(`Analytics projection deleted for resume: ${resumeId}`);
  }
}
