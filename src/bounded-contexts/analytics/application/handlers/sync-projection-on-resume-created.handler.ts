/**
 * Sync Projection on Resume Created Handler
 *
 * Maintains the analytics read model by creating a projection
 * when a resume is created in the Resumes context.
 *
 * This eliminates cross-context database queries.
 * GENERIC: Uses JSON sectionCounts instead of individual columns.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeCreatedEvent } from '@/bounded-contexts/resumes';

@Injectable()
export class SyncProjectionOnResumeCreatedHandler {
  private readonly logger = new Logger(SyncProjectionOnResumeCreatedHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(ResumeCreatedEvent.TYPE)
  async handle(event: ResumeCreatedEvent): Promise<void> {
    const resumeId = event.aggregateId;
    const { userId, title } = event.payload;

    this.logger.log(`Creating analytics projection for resume: ${resumeId}`);

    await this.prisma.analyticsResumeProjection.upsert({
      where: { id: resumeId },
      create: {
        id: resumeId,
        userId,
        title,
        sectionCounts: {},
      },
      update: {
        userId,
        title,
      },
    });

    this.logger.log(`Analytics projection created for resume: ${resumeId}`);
  }
}
