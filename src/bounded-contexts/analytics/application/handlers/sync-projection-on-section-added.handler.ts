/**
 * Sync Projection on Section Added Handler
 *
 * Maintains the analytics read model by incrementing section counts
 * when a section is added to a resume.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { SectionAddedEvent } from '@/bounded-contexts/resumes';
import type { SectionKind } from '@/shared-kernel/dtos/semantic-sections.dto';

const SECTION_KIND_TO_FIELD: Partial<Record<SectionKind, string>> = {
  WORK_EXPERIENCE: 'experiencesCount',
  EDUCATION: 'educationCount',
  SKILL_SET: 'skillsCount',
  CERTIFICATION: 'certificationsCount',
  PROJECT: 'projectsCount',
  AWARD: 'awardsCount',
  LANGUAGE: 'languagesCount',
  INTEREST: 'interestsCount',
  RECOMMENDATION: 'recommendationsCount',
  PUBLICATION: 'publicationsCount',
};

@Injectable()
export class SyncProjectionOnSectionAddedHandler {
  private readonly logger = new Logger(SyncProjectionOnSectionAddedHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(SectionAddedEvent.TYPE)
  async handle(event: SectionAddedEvent): Promise<void> {
    const resumeId = event.aggregateId;
    const field = this.resolveProjectionField(event.payload.sectionKind);
    if (!field) return;

    this.logger.debug(`Incrementing ${field} for resume: ${resumeId}`);

    await this.prisma.analyticsResumeProjection.update({
      where: { id: resumeId },
      data: { [field]: { increment: 1 } },
    });
  }

  private resolveProjectionField(sectionKind?: SectionKind): string | null {
    if (!sectionKind) {
      return null;
    }

    return SECTION_KIND_TO_FIELD[sectionKind] ?? null;
  }
}
