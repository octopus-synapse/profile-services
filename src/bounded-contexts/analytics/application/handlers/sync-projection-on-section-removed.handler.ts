/**
 * Sync Projection on Section Removed Handler
 *
 * Maintains the analytics read model by decrementing section counts
 * when a section is removed from a resume.
 *
 * GENERIC: Works with any section type via semanticKind.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { SectionRemovedEvent } from '@/bounded-contexts/resumes';

@Injectable()
export class SyncProjectionOnSectionRemovedHandler {
  private readonly logger = new Logger(SyncProjectionOnSectionRemovedHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(SectionRemovedEvent.TYPE)
  async handle(event: SectionRemovedEvent): Promise<void> {
    const resumeId = event.aggregateId;
    const semanticKind = event.payload.sectionKind;

    if (!semanticKind) {
      this.logger.warn(`No semanticKind in event for resume: ${resumeId}`);
      return;
    }

    this.logger.debug(`Decrementing ${semanticKind} count for resume: ${resumeId}`);

    // Use raw query to decrement JSON field value (minimum 0)
    await this.prisma.$executeRaw`
      UPDATE analytics_resume_projection
      SET "sectionCounts" = jsonb_set(
        "sectionCounts",
        ${[semanticKind]}::text[],
        to_jsonb(GREATEST(COALESCE(("sectionCounts"->${semanticKind})::int, 0) - 1, 0))
      ),
      "updatedAt" = NOW()
      WHERE id = ${resumeId}
    `;
  }
}
