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

@Injectable()
export class SyncProjectionOnSectionAddedHandler {
  private readonly logger = new Logger(SyncProjectionOnSectionAddedHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(SectionAddedEvent.TYPE)
  async handle(event: SectionAddedEvent): Promise<void> {
    const resumeId = event.aggregateId;
    const { sectionType } = event.payload;

    const field = this.mapSectionTypeToField(sectionType);
    if (!field) return;

    this.logger.debug(`Incrementing ${field} for resume: ${resumeId}`);

    await this.prisma.analyticsResumeProjection.update({
      where: { id: resumeId },
      data: { [field]: { increment: 1 } },
    });
  }

  private mapSectionTypeToField(sectionType: string): string | null {
    const mapping: Record<string, string> = {
      experience: 'experiencesCount',
      education: 'educationCount',
      skills: 'skillsCount',
      certifications: 'certificationsCount',
      projects: 'projectsCount',
      awards: 'awardsCount',
      languages: 'languagesCount',
      interests: 'interestsCount',
      recommendations: 'recommendationsCount',
      achievements: 'achievementsCount',
      publications: 'publicationsCount',
      talks: 'talksCount',
      hackathons: 'hackathonsCount',
      bugbounties: 'bugBountiesCount',
      opensource: 'openSourceCount',
    };
    return mapping[sectionType] ?? null;
  }
}
