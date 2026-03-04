/**
 * Sync Projection on Section Added Handler
 *
 * Maintains the analytics read model by incrementing section counts
 * when a section is added to a resume.
 *
 * GENERIC: Works with any section type via semanticKind.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { SectionAddedEvent } from '@/bounded-contexts/resumes';

@Injectable()
export class SyncProjectionOnSectionAddedHandler {
  private readonly logger = new Logger(SyncProjectionOnSectionAddedHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(SectionAddedEvent.TYPE)
  async handle(event: SectionAddedEvent): Promise<void> {
    const resumeId = event.aggregateId;
    const semanticKind = event.payload.sectionKind;

    if (!semanticKind) {
      this.logger.warn(`No semanticKind in event for resume: ${resumeId}`);
      return;
    }

    this.logger.debug(`Incrementing ${semanticKind} count for resume: ${resumeId}`);

    // Use raw query to increment JSON field value
    await this.prisma.$executeRaw`
      UPDATE analytics_resume_projection
      SET "sectionCounts" = jsonb_set(
        "sectionCounts",
        ${[semanticKind]}::text[],
        to_jsonb(COALESCE(("sectionCounts"->${semanticKind})::int, 0) + 1)
      ),
      "updatedAt" = NOW()
      WHERE id = ${resumeId}
    `;
  }
}
