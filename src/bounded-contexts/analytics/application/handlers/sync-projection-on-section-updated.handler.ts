/**
 * Sync Projection on Section Updated Handler
 *
 * Maintains the analytics read model by updating the timestamp
 * when a section is updated in a resume.
 *
 * Note: Section updates don't change counts, but we touch updatedAt
 * to track resume activity.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { SectionUpdatedEvent } from '@/bounded-contexts/resumes';

@Injectable()
export class SyncProjectionOnSectionUpdatedHandler {
  private readonly logger = new Logger(
    SyncProjectionOnSectionUpdatedHandler.name,
  );

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(SectionUpdatedEvent.TYPE)
  async handle(event: SectionUpdatedEvent): Promise<void> {
    const resumeId = event.aggregateId;

    this.logger.debug(
      `Section ${event.payload.sectionType} updated for resume: ${resumeId}`,
    );

    // Touch updatedAt to track activity (Prisma @updatedAt handles this)
    await this.prisma.analyticsResumeProjection.update({
      where: { id: resumeId },
      data: {}, // Empty update triggers @updatedAt
    });
  }
}
